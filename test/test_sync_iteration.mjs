import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  runGit,
  checkGitInstalled,
  ensureRepositorySetup,
  getCurrentBranch,
  getWorkingTreeStatus,
  preserveLocalWork,
  restoreLocalWork,
  runPostSyncHealthChecks,
  syncRepository
} from '../scripts/sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('--- Direct Repository Synchronization & Iteration Test Suite ---\n');

async function runTest(name, fn) {
  try {
    process.stdout.write(`[TEST] ${name}... `);
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  // 1. Check Git binary is detected
  await runTest('Verify Git installation detection', () => {
    const version = checkGitInstalled();
    if (!version.includes('git version')) {
      throw new Error(`Unexpected git version response: ${version}`);
    }
  });

  // 2. Test working tree status detection on project root
  await runTest('Verify working tree status detection', () => {
    const status = getWorkingTreeStatus(PROJECT_ROOT);
    if (typeof status.isClean !== 'boolean') {
      throw new Error('Expected isClean boolean property');
    }
    if (!Array.isArray(status.trackedModified) || !Array.isArray(status.untracked)) {
      throw new Error('Expected arrays for modified and untracked files');
    }
  });

  // 3. Test post-sync health checks on actual project root
  await runTest('Verify post-sync health check functionality', () => {
    const isHealthy = runPostSyncHealthChecks(PROJECT_ROOT);
    if (!isHealthy) {
      throw new Error('Project health check returned false');
    }
  });

  // Create isolated sandbox for Git synchronization simulation
  const testSandboxDir = path.join('/tmp', `mairec-sync-test-${Date.now()}`);
  fs.mkdirSync(testSandboxDir, { recursive: true });

  try {
    const remoteBare = path.join(testSandboxDir, 'remote.git');
    const upstreamWorking = path.join(testSandboxDir, 'upstream');
    const localClient = path.join(testSandboxDir, 'local');

    // Initialize bare remote with main as default HEAD
    execSync(`git init --bare "${remoteBare}"`);
    execSync(`git --git-dir="${remoteBare}" symbolic-ref HEAD refs/heads/main`);

    // Initialize upstream repo to populate initial files
    fs.mkdirSync(upstreamWorking, { recursive: true });
    execSync('git init -b main', { cwd: upstreamWorking });
    execSync('git config user.email "test@mairec.ai"', { cwd: upstreamWorking });
    execSync('git config user.name "MaiRec Test"', { cwd: upstreamWorking });

    // Create mock structure matching MaiRec
    fs.mkdirSync(path.join(upstreamWorking, 'extension/models'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'extension/db'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'ws-addon'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'test'), { recursive: true });

    fs.writeFileSync(path.join(upstreamWorking, 'extension/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.31' }));
    fs.writeFileSync(path.join(upstreamWorking, 'ws-addon/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.31' }));
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.html'), '<!DOCTYPE html><html></html>');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.js'), '// popup');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.css'), '/* css */');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/i18n.js'), '// i18n');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/theme.js'), '// theme');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/type.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/grid.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/motorcycles_b1.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/db/captcha.sqlite'), 'mock-sqlite');
    fs.writeFileSync(path.join(upstreamWorking, 'README.md'), '# MaiRec v1.31\n');

    execSync('git add .', { cwd: upstreamWorking });
    execSync('git commit -m "feat: initial commit"', { cwd: upstreamWorking });
    execSync(`git remote add origin "${remoteBare}"`, { cwd: upstreamWorking });
    execSync('git push -u origin main', { cwd: upstreamWorking });

    // Clone local client
    execSync(`git clone "${remoteBare}" "${localClient}"`);
    execSync('git config user.email "local@mairec.ai"', { cwd: localClient });
    execSync('git config user.name "Local Dev"', { cwd: localClient });

    // 4. Test Scenario: Direct Sync with incoming remote commits
    await runTest('Synchronize incoming remote commits directly', async () => {
      // Add commit to upstream and push
      fs.writeFileSync(path.join(upstreamWorking, 'upstream_update.txt'), 'remote feature commit');
      execSync('git add upstream_update.txt', { cwd: upstreamWorking });
      execSync('git commit -m "feat: remote update"', { cwd: upstreamWorking });
      execSync('git push origin main', { cwd: upstreamWorking });

      // Local client runs syncRepository
      const syncRes = await syncRepository({
        cwd: localClient,
        remote: 'origin',
        remoteUrl: remoteBare,
        branch: 'main',
        skipTests: true
      });

      if (!syncRes.success) {
        throw new Error(`Sync failed: ${JSON.stringify(syncRes)}`);
      }

      const fileContent = fs.readFileSync(path.join(localClient, 'upstream_update.txt'), 'utf8');
      if (fileContent !== 'remote feature commit') {
        throw new Error(`Expected synchronized file content, got: ${fileContent}`);
      }
    });

    // 5. Test Scenario: Local uncommitted modifications preservation
    await runTest('Preserve uncommitted local modifications and untracked files', async () => {
      // Local creates modified tracked file and untracked file
      fs.appendFileSync(path.join(localClient, 'README.md'), 'Local uncommitted developer notes\n');
      fs.writeFileSync(path.join(localClient, 'local_untracked_work.txt'), 'valuable work in progress');

      // Upstream pushes another non-conflicting commit
      fs.writeFileSync(path.join(upstreamWorking, 'another_feature.txt'), 'second feature');
      execSync('git add another_feature.txt', { cwd: upstreamWorking });
      execSync('git commit -m "feat: second upstream feature"', { cwd: upstreamWorking });
      execSync('git push origin main', { cwd: upstreamWorking });

      // Run sync
      const syncRes = await syncRepository({
        cwd: localClient,
        remote: 'origin',
        remoteUrl: remoteBare,
        branch: 'main',
        skipTests: true
      });

      if (!syncRes.success) {
        throw new Error(`Sync with dirty working tree failed: ${JSON.stringify(syncRes)}`);
      }

      // Verify remote changes were integrated
      if (!fs.existsSync(path.join(localClient, 'another_feature.txt'))) {
        throw new Error('Remote file another_feature.txt was not synchronized');
      }

      // Verify local uncommitted work was preserved
      const readmeContent = fs.readFileSync(path.join(localClient, 'README.md'), 'utf8');
      if (!readmeContent.includes('Local uncommitted developer notes')) {
        throw new Error('Local modification to README.md was lost or overwritten!');
      }

      if (!fs.existsSync(path.join(localClient, 'local_untracked_work.txt'))) {
        throw new Error('Local untracked file was deleted or lost!');
      }

      const untrackedContent = fs.readFileSync(path.join(localClient, 'local_untracked_work.txt'), 'utf8');
      if (untrackedContent !== 'valuable work in progress') {
        throw new Error('Local untracked file content was corrupted!');
      }
    });

    // 6. Test Scenario: Detect and safely handle Git merge conflicts
    await runTest('Detect and handle Git merge conflicts safely with user guidance', async () => {
      // Clear previous uncommitted changes cleanly for this test
      execSync('git stash push -u -m "cleanup-prev"', { cwd: localClient });

      // Stage and commit local edit to a shared file
      fs.writeFileSync(path.join(localClient, 'shared_config.txt'), 'LOCAL_CONFIG_A=100\n');
      execSync('git add shared_config.txt', { cwd: localClient });
      execSync('git commit -m "local: configure option A"', { cwd: localClient });

      // Upstream commits conflicting edit to the same line
      fs.writeFileSync(path.join(upstreamWorking, 'shared_config.txt'), 'LOCAL_CONFIG_A=999\n');
      execSync('git add shared_config.txt', { cwd: upstreamWorking });
      execSync('git commit -m "upstream: configure option A differently"', { cwd: upstreamWorking });
      execSync('git push origin main', { cwd: upstreamWorking });

      // Run sync - should detect conflict safely
      const syncRes = await syncRepository({
        cwd: localClient,
        remote: 'origin',
        remoteUrl: remoteBare,
        branch: 'main',
        skipTests: true
      });

      if (syncRes.success) {
        throw new Error('Expected sync to fail safely on merge conflict, but it succeeded');
      }

      if (syncRes.code !== 'MERGE_CONFLICT') {
        throw new Error(`Expected code MERGE_CONFLICT, got: ${syncRes.code}`);
      }

      if (!syncRes.conflicts.includes('shared_config.txt')) {
        throw new Error(`Expected conflicts list to include shared_config.txt, got: ${syncRes.conflicts}`);
      }

      // Abort merge to leave test repo clean
      execSync('git merge --abort', { cwd: localClient });
    });

    // 7. Test Scenario: Direct initialization from unzipped directory without .git
    await runTest('Directly initialize and synchronize from non-git directory', async () => {
      const unzippedDir = path.join(testSandboxDir, 'unzipped_source');
      fs.mkdirSync(unzippedDir, { recursive: true });
      fs.writeFileSync(path.join(unzippedDir, 'local_custom_file.txt'), 'custom work');

      const syncRes = await syncRepository({
        cwd: unzippedDir,
        remote: 'origin',
        remoteUrl: remoteBare,
        branch: 'main',
        skipTests: true
      });

      if (!syncRes.success) {
        throw new Error(`Direct sync for non-git directory failed: ${JSON.stringify(syncRes)}`);
      }

      // Verify .git now exists and remote commits are fetched
      if (!fs.existsSync(path.join(unzippedDir, '.git'))) {
        throw new Error('.git was not initialized');
      }

      // Verify local custom file was preserved
      if (!fs.existsSync(path.join(unzippedDir, 'local_custom_file.txt'))) {
        throw new Error('Local custom file was lost during non-git sync');
      }

      // Verify remote file is present
      if (!fs.existsSync(path.join(unzippedDir, 'extension/manifest.json'))) {
        throw new Error('Remote files were not retrieved');
      }
    });

  } finally {
    try {
      fs.rmSync(testSandboxDir, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log('\n=== ALL DIRECT SYNCHRONIZATION AND ITERATION TESTS PASSED! ===\n');
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
