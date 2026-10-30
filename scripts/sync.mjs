#!/usr/bin/env node
/**
 * MaiRec Direct Repository Synchronization & Iteration Engine
 * 
 * Provides automated, bidirectional-safe synchronization with the upstream
 * GitHub repository (https://github.com/Melony-mai/MaiRec.git).
 * 
 * Capabilities:
 *  - Automatically discovers/initializes Git repository and upstream remote.
 *  - Safely stashes and preserves all local uncommitted modifications and untracked files.
 *  - Fetches and integrates the latest commits from the remote GitHub repository.
 *  - Detects and handles merge conflicts cleanly with actionable guidance.
 *  - Safely restores preserved local work without overwriting or data loss.
 *  - Executes post-sync health checks and automated test suites to ensure functionality.
 */

import { spawn, spawnSync, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Default configuration
const DEFAULT_REMOTE_URL = 'https://github.com/Melony-mai/MaiRec.git';
const DEFAULT_REMOTE_NAME = 'origin';
const DEFAULT_BRANCH = 'main';

// ANSI terminal colors
const isTTY = process.stdout.isTTY;
const colors = {
  reset: isTTY ? '\x1b[0m' : '',
  bold: isTTY ? '\x1b[1m' : '',
  dim: isTTY ? '\x1b[2m' : '',
  red: isTTY ? '\x1b[31m' : '',
  green: isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  blue: isTTY ? '\x1b[34m' : '',
  magenta: isTTY ? '\x1b[35m' : '',
  cyan: isTTY ? '\x1b[36m' : '',
  white: isTTY ? '\x1b[37m' : '',
};

function log(msg) {
  console.log(`${colors.cyan}[MaiRec Sync]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}[MaiRec Sync] ✓${colors.reset} ${colors.bold}${msg}${colors.reset}`);
}

function logWarn(msg) {
  console.log(`${colors.yellow}[MaiRec Sync] ⚠️${colors.reset} ${msg}`);
}

function logError(msg) {
  console.error(`${colors.red}[MaiRec Sync] ❌${colors.reset} ${colors.bold}${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.blue}[MaiRec Sync] ℹ️${colors.reset} ${msg}`);
}

/**
 * Execute a git command and return standard output or error info
 */
export function runGit(args, options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...options.env }
  });

  return {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    success: result.status === 0
  };
}

/**
 * Parse CLI arguments
 */
function parseArgs(argv) {
  const options = {
    remote: DEFAULT_REMOTE_NAME,
    branch: '',
    remoteUrl: DEFAULT_REMOTE_URL,
    strategy: 'merge', // 'merge', 'rebase', 'ff-only'
    checkOnly: false,
    serve: false,
    native: false,
    registerHost: false,
    port: 38888,
    skipTests: false,
    skipStash: false,
    verbose: false,
    help: false,
    cwd: PROJECT_ROOT,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--check' || arg === '--status' || arg === '--dry-run') {
      options.checkOnly = true;
    } else if (arg === '--native' || arg === '-n') {
      options.native = true;
    } else if (arg === '--register-host' || arg === '--install-host') {
      options.registerHost = true;
    } else if ((arg === '--serve' || arg === '-s') && i + 1 < argv.length && /^\d+$/.test(argv[i + 1])) {
      options.serve = true;
      options.port = parseInt(argv[++i], 10);
    } else if (arg === '--serve' || arg === '-s') {
      options.serve = true;
    } else if (arg === '--port' && i + 1 < argv.length) {
      options.port = parseInt(argv[++i], 10);
    } else if (arg === '--skip-tests') {
      options.skipTests = true;
    } else if (arg === '--skip-stash') {
      options.skipStash = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--remote' && i + 1 < argv.length) {
      options.remote = argv[++i];
    } else if (arg === '--branch' && i + 1 < argv.length) {
      options.branch = argv[++i];
    } else if (arg === '--url' && i + 1 < argv.length) {
      options.remoteUrl = argv[++i];
    } else if (arg === '--strategy' && i + 1 < argv.length) {
      options.strategy = argv[++i];
    } else if (arg === '--cwd' && i + 1 < argv.length) {
      options.cwd = path.resolve(argv[++i]);
    }
  }

  return options;
}

/**
 * Print CLI help documentation
 */
function printHelp() {
  console.log(`
${colors.bold}MaiRec Direct Repository Synchronization & Iteration CLI${colors.reset}

Usage:
  node scripts/sync.mjs [options]
  npm run sync [-- options]
  ./sync.sh [options]

Options:
  ${colors.bold}--check, --status, --dry-run${colors.reset}
      Check remote synchronization status without applying changes or modifying files.

  ${colors.bold}--serve, -s [port]${colors.reset}
      Start local synchronization bridge server (default port: 38888) for extension integration.

  ${colors.bold}--remote <name>${colors.reset}
      Name of the Git remote (default: "${DEFAULT_REMOTE_NAME}").

  ${colors.bold}--branch <name>${colors.reset}
      Remote branch to synchronize with (default: auto-detected current branch, e.g. "main").

  ${colors.bold}--url <git-url>${colors.reset}
      Target upstream GitHub repository URL (default: "${DEFAULT_REMOTE_URL}").

  ${colors.bold}--strategy <merge|rebase|ff-only>${colors.reset}
      Git integration strategy (default: "merge").

  ${colors.bold}--skip-tests${colors.reset}
      Skip automated post-synchronization functional integrity and layout test verification.

  ${colors.bold}--skip-stash${colors.reset}
      Skip automatic stashing of uncommitted local modifications.

  ${colors.bold}--verbose, -v${colors.reset}
      Display verbose command execution logs.

  ${colors.bold}--help, -h${colors.reset}
      Display this usage and help information.

Examples:
  node scripts/sync.mjs                # Synchronize directly with latest GitHub commits
  node scripts/sync.mjs --check        # Inspect whether remote has updates without modifying files
  node scripts/sync.mjs --branch main  # Sync explicitly against the 'main' branch
`);
}

/**
 * Ensure git is installed on the host system
 */
export function checkGitInstalled() {
  const result = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('Git is not installed or not accessible in PATH.');
  }
  return result.stdout.trim();
}

/**
 * Ensure repository and remote are properly configured
 */
export function ensureRepositorySetup(cwd, remoteName, remoteUrl) {
  // Check if .git directory or work tree exists
  const isInside = runGit(['rev-parse', '--is-inside-work-tree'], { cwd });
  
  if (!isInside.success) {
    logInfo('No Git repository detected in workspace. Initializing local Git repository...');
    const initRes = runGit(['init'], { cwd });
    if (!initRes.success) {
      throw new Error(`Failed to initialize git repository: ${initRes.stderr}`);
    }
    
    // Set initial branch
    runGit(['checkout', '-B', DEFAULT_BRANCH], { cwd });
    logSuccess('Initialized Git repository.');
  }

  // Check remotes
  const remotesRes = runGit(['remote'], { cwd });
  const remotes = remotesRes.stdout.split('\n').map(s => s.trim()).filter(Boolean);

  if (!remotes.includes(remoteName)) {
    logInfo(`Adding remote "${remoteName}" -> ${remoteUrl}...`);
    const addRemote = runGit(['remote', 'add', remoteName, remoteUrl], { cwd });
    if (!addRemote.success) {
      throw new Error(`Failed to add remote: ${addRemote.stderr}`);
    }
  } else {
    // Check if remote URL should be inspected/updated
    const getUrl = runGit(['remote', 'get-url', remoteName], { cwd });
    if (getUrl.success && !getUrl.stdout) {
      runGit(['remote', 'set-url', remoteName, remoteUrl], { cwd });
    }
  }

  return true;
}

/**
 * Get current branch name or determine appropriate target branch
 */
export function getCurrentBranch(cwd, fallbackBranch = DEFAULT_BRANCH) {
  const res = runGit(['branch', '--show-current'], { cwd });
  if (res.success && res.stdout.length > 0) {
    return res.stdout;
  }
  // Might be detached HEAD or initial repo
  const headRev = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  if (headRev.success && headRev.stdout !== 'HEAD' && headRev.stdout.length > 0) {
    return headRev.stdout;
  }
  return fallbackBranch;
}

/**
 * Check if the working tree has uncommitted modifications (tracked and untracked)
 */
export function getWorkingTreeStatus(cwd) {
  const statusRes = runGit(['status', '--porcelain'], { cwd });
  if (!statusRes.success) {
    throw new Error(`Failed to check git status: ${statusRes.stderr}`);
  }

  const lines = statusRes.stdout.split('\n').map(l => l.trim()).filter(Boolean);
  const trackedModified = [];
  const untracked = [];
  const conflicted = [];

  for (const line of lines) {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (code.includes('U') || code === 'AA' || code === 'DD') {
      conflicted.push(file);
    } else if (code === '??') {
      untracked.push(file);
    } else {
      trackedModified.push(file);
    }
  }

  return {
    isClean: lines.length === 0,
    hasConflicts: conflicted.length > 0,
    conflictedFiles: conflicted,
    trackedModified,
    untracked,
    allFiles: lines
  };
}

/**
 * Safely preserve local uncommitted work
 */
export function preserveLocalWork(cwd) {
  const isHeadValid = runGit(['rev-parse', 'HEAD'], { cwd }).success;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (!isHeadValid) {
    // Unborn HEAD: Git stash does not function without an initial commit.
    // Preserve local files into an internal .git backup directory.
    const backupDir = path.join(cwd, '.git', `mairec-backup-${timestamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    const status = getWorkingTreeStatus(cwd);
    const filesToBackup = [...status.trackedModified, ...status.untracked];

    for (const file of filesToBackup) {
      const src = path.join(cwd, file);
      const dest = path.join(backupDir, file);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }

    logSuccess(`Local uncommitted files securely preserved in initial backup storage.`);
    return { type: 'directory', backupDir, files: filesToBackup };
  }

  const stashMessage = `MaiRec-direct-sync-backup-${timestamp}`;

  logInfo(`Preserving uncommitted local work into Git stash...`);
  const stashRes = runGit(['stash', 'push', '--include-untracked', '-m', stashMessage], { cwd });
  
  if (!stashRes.success) {
    throw new Error(`Failed to preserve local changes: ${stashRes.stderr}`);
  }

  // Get stash ref
  const listRes = runGit(['stash', 'list'], { cwd });
  const stashLine = listRes.stdout.split('\n').find(l => l.includes(stashMessage));
  const stashRef = stashLine ? stashLine.split(':')[0].trim() : 'stash@{0}';

  logSuccess(`Local uncommitted changes securely stashed as ${colors.bold}${stashRef}${colors.reset}`);
  return { type: 'stash', stashMessage, stashRef };
}

/**
 * Restore preserved local work from git stash or backup storage
 */
export function restoreLocalWork(cwd, stashInfo) {
  if (stashInfo.type === 'directory') {
    logInfo(`Restoring preserved local files from initial backup storage...`);
    const { backupDir, files } = stashInfo;
    for (const file of files) {
      const src = path.join(backupDir, file);
      const dest = path.join(cwd, file);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
    try {
      fs.rmSync(backupDir, { recursive: true, force: true });
    } catch (_) {}
    logSuccess('Local files restored successfully.');
    return { success: true };
  }

  logInfo(`Restoring preserved local uncommitted modifications...`);
  
  // Find current stash index for the message if possible
  let targetRef = stashInfo.stashRef || 'stash@{0}';
  const listRes = runGit(['stash', 'list'], { cwd });
  const lines = listRes.stdout.split('\n');
  for (const l of lines) {
    if (stashInfo.stashMessage && l.includes(stashInfo.stashMessage)) {
      targetRef = l.split(':')[0].trim();
      break;
    }
  }

  const popRes = runGit(['stash', 'pop', targetRef], { cwd });

  if (!popRes.success) {
    // Check if there are conflict markers
    const status = getWorkingTreeStatus(cwd);
    if (status.hasConflicts) {
      logWarn(`Preserved modifications resulted in merge conflicts when reapplied onto the latest codebase.`);
      console.log(`\n${colors.yellow}${colors.bold}Conflicted files:${colors.reset}`);
      for (const file of status.conflictedFiles) {
        console.log(`  • ${colors.red}${file}${colors.reset}`);
      }
      console.log(`\n${colors.bold}Action Required:${colors.reset}`);
      console.log(`1. Open the conflicted files and resolve the <<<<<<< / ======= / >>>>>>> conflict markers.`);
      console.log(`2. Stage resolved files: ${colors.cyan}git add <file>${colors.reset}`);
      console.log(`3. Discard the stash once resolved: ${colors.cyan}git stash drop${colors.reset}\n`);
      return { success: false, conflicts: status.conflictedFiles };
    } else {
      logWarn(`Could not cleanly pop stash (${popRes.stderr}). Changes remain safely in: ${targetRef}`);
      return { success: false, error: popRes.stderr };
    }
  }

  logSuccess('Local modifications restored successfully.');
  return { success: true };
}

/**
 * Execute post-sync health checks and automated test suite
 */
export function runPostSyncHealthChecks(cwd) {
  log(`Validating project functional integrity and health...`);

  // 1. Verify manifest files
  const extManifestPath = path.join(cwd, 'extension/manifest.json');
  const wsManifestPath = path.join(cwd, 'ws-addon/manifest.json');

  if (!fs.existsSync(extManifestPath) || !fs.existsSync(wsManifestPath)) {
    throw new Error('Critical manifest file(s) missing after synchronization.');
  }

  let extManifest, wsManifest;
  try {
    extManifest = JSON.parse(fs.readFileSync(extManifestPath, 'utf8'));
    wsManifest = JSON.parse(fs.readFileSync(wsManifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse extension manifest: ${err.message}`);
  }

  if (!extManifest.version || !wsManifest.version) {
    throw new Error('Manifest missing version field.');
  }

  // 2. Verify ONNX model files and SQLite DB
  const essentialAssets = [
    'extension/popup.html',
    'extension/popup.js',
    'extension/popup.css',
    'extension/i18n.js',
    'extension/theme.js',
    'extension/models/type.onnx',
    'extension/models/grid.onnx',
    'extension/models/motorcycles_b1.onnx',
    'extension/db/captcha.sqlite'
  ];

  for (const asset of essentialAssets) {
    const fullPath = path.join(cwd, asset);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Essential project asset missing: ${asset}`);
    }
  }

  // 3. Execute lightweight verification tests if test directory exists
  const testLayoutScript = path.join(cwd, 'test/test_layout_and_functionality.mjs');
  const testI18nScript = path.join(cwd, 'test/test_i18n.mjs');

  if (fs.existsSync(testLayoutScript)) {
    const layoutTest = spawnSync('node', [testLayoutScript], {
      cwd,
      encoding: 'utf8'
    });
    if (layoutTest.status !== 0) {
      throw new Error(`Layout & functionality test failed:\n${layoutTest.stderr || layoutTest.stdout}`);
    }
  }

  if (fs.existsSync(testI18nScript)) {
    const i18nTest = spawnSync('node', [testI18nScript], {
      cwd,
      encoding: 'utf8'
    });
    if (i18nTest.status !== 0) {
      throw new Error(`I18n test failed:\n${i18nTest.stderr || i18nTest.stdout}`);
    }
  }

  logSuccess(`Project functional integrity verified. (Version: v${extManifest.version})`);
  return true;
}

/**
 * Main Direct Synchronization Workflow
 */
export async function syncRepository(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const remote = options.remote || DEFAULT_REMOTE_NAME;
  const remoteUrl = options.remoteUrl || DEFAULT_REMOTE_URL;
  const strategy = options.strategy || 'merge';

  console.log(`\n${colors.bold}=== MaiRec Direct Repository Synchronization ===${colors.reset}\n`);

  // Step 1: Ensure Git is available & repo is initialized
  checkGitInstalled();
  ensureRepositorySetup(cwd, remote, remoteUrl);

  const branch = options.branch || getCurrentBranch(cwd);
  logInfo(`Synchronizing branch ${colors.bold}${branch}${colors.reset} with remote ${colors.bold}${remote}${colors.reset} (${remoteUrl})`);

  // Step 2: Check current working tree for existing conflicts or dirty files
  const initialStatus = getWorkingTreeStatus(cwd);
  if (initialStatus.hasConflicts) {
    logError('Existing unresolved Git merge conflicts detected in working tree.');
    console.log(`Please resolve these conflicts before running synchronization:`);
    for (const f of initialStatus.conflictedFiles) {
      console.log(`  • ${f}`);
    }
    return { success: false, code: 'EXISTING_CONFLICTS', conflicts: initialStatus.conflictedFiles };
  }

  let stashInfo = null;
  if (!options.checkOnly && !initialStatus.isClean && !options.skipStash) {
    const totalFiles = initialStatus.trackedModified.length + initialStatus.untracked.length;
    logInfo(`Detected ${totalFiles} uncommitted file(s) (${initialStatus.trackedModified.length} modified, ${initialStatus.untracked.length} untracked).`);
    stashInfo = preserveLocalWork(cwd);
  } else if (!initialStatus.isClean && options.skipStash) {
    logWarn('Working tree is not clean and --skip-stash is set. Synchronization may fail if conflicts exist.');
  }

  // Step 3: Fetch latest commits from remote
  log(`Fetching latest commits from ${remote}/${branch}...`);
  const fetchRes = runGit(['fetch', remote, branch], { cwd });
  if (!fetchRes.success) {
    logError(`Failed to fetch from ${remote}/${branch}: ${fetchRes.stderr}`);
    if (stashInfo) {
      logInfo('Restoring previously stashed local modifications...');
      restoreLocalWork(cwd, stashInfo);
    }
    return { success: false, code: 'FETCH_ERROR', error: fetchRes.stderr };
  }

  // Step 4: Compare local and remote revisions
  const localHeadRes = runGit(['rev-parse', 'HEAD'], { cwd });
  const localHead = localHeadRes.success ? localHeadRes.stdout : '';
  const remoteRef = `${remote}/${branch}`;
  const remoteHeadRes = runGit(['rev-parse', remoteRef], { cwd });

  if (!remoteHeadRes.success) {
    logError(`Remote ref ${remoteRef} not found after fetch.`);
    if (stashInfo) restoreLocalWork(cwd, stashInfo);
    return { success: false, code: 'REMOTE_REF_NOT_FOUND' };
  }
  const remoteHead = remoteHeadRes.stdout;

  let relation = 'UP_TO_DATE';
  let mergeBase = null;

  if (!localHead) {
    // Unborn HEAD (e.g. freshly initialized repository from zip download)
    relation = 'INITIAL_CHECKOUT';
  } else {
    // Find merge base
    const mergeBaseRes = runGit(['merge-base', 'HEAD', remoteRef], { cwd });
    mergeBase = mergeBaseRes.success ? mergeBaseRes.stdout : null;

    if (localHead === remoteHead) {
      relation = 'UP_TO_DATE';
    } else if (mergeBase === remoteHead) {
      relation = 'AHEAD';
    } else if (mergeBase === localHead) {
      relation = 'BEHIND';
    } else {
      relation = 'DIVERGED';
    }
  }

  logInfo(`Local HEAD:  ${localHead ? localHead.slice(0, 8) : '(unborn/initial)'}`);
  logInfo(`Remote HEAD: ${remoteHead.slice(0, 8)}`);

  if (options.checkOnly) {
    logInfo(`Status check report: Repository is ${colors.bold}${relation}${colors.reset} relative to remote.`);
    if (relation === 'BEHIND' || relation === 'DIVERGED') {
      const logRes = runGit(['log', '--oneline', `${localHead}..${remoteHead}`], { cwd });
      console.log(`\n${colors.bold}Incoming Commits from Remote:${colors.reset}\n${logRes.stdout}\n`);
    }
    if (stashInfo) {
      restoreLocalWork(cwd, stashInfo);
    }
    return { success: true, relation, localHead, remoteHead };
  }

  // Step 5: Perform synchronization if needed
  if (relation === 'UP_TO_DATE') {
    logSuccess(`Local branch is already up-to-date with ${remote}/${branch}.`);
  } else if (relation === 'AHEAD') {
    logInfo(`Local branch is ahead of remote by commits. Remote has no newer changes to pull.`);
  } else if (relation === 'INITIAL_CHECKOUT') {
    log(`Initializing local branch ${branch} from ${remoteRef}...`);
    const checkoutRes = runGit(['checkout', '-B', branch, remoteRef], { cwd });
    if (!checkoutRes.success) {
      logError(`Failed to checkout initial branch: ${checkoutRes.stderr}`);
      if (stashInfo) restoreLocalWork(cwd, stashInfo);
      return { success: false, code: 'INITIAL_CHECKOUT_ERROR', error: checkoutRes.stderr };
    }
    // Set upstream tracking
    runGit(['branch', '--set-upstream-to', remoteRef, branch], { cwd });
    logSuccess(`Initialized and synchronized branch ${branch} with ${remoteRef}.`);
  } else {
    log(`Integrating remote changes (Strategy: ${strategy})...`);

    let syncResult;
    if (strategy === 'rebase') {
      syncResult = runGit(['rebase', remoteRef], { cwd });
    } else if (strategy === 'ff-only') {
      syncResult = runGit(['merge', '--ff-only', remoteRef], { cwd });
    } else {
      // Default: merge
      syncResult = runGit(['merge', '--no-edit', remoteRef], { cwd });
    }

    if (!syncResult.success) {
      // Check for conflicts
      const statusAfterMerge = getWorkingTreeStatus(cwd);
      if (statusAfterMerge.hasConflicts) {
        logError(`Git merge conflict encountered while synchronizing with ${remoteRef}!`);
        console.log(`\n${colors.yellow}${colors.bold}Conflicted Files:${colors.reset}`);
        for (const file of statusAfterMerge.conflictedFiles) {
          console.log(`  • ${colors.red}${file}${colors.reset}`);
        }
        console.log(`\n${colors.bold}Guidance for Conflict Resolution:${colors.reset}`);
        console.log(`  1. Inspect the conflicted files and resolve the <<<<<<< markers.`);
        console.log(`  2. Stage the resolved files:   ${colors.cyan}git add <file>${colors.reset}`);
        console.log(`  3. Complete the merge commit:  ${colors.cyan}git commit -m "Merge remote branch '${remoteRef}'"${colors.reset}`);
        if (stashInfo) {
          console.log(`  4. Reapply preserved changes:  ${colors.cyan}git stash pop ${stashInfo.stashRef}${colors.reset}`);
        }
        console.log(`  5. Verify functionality:       ${colors.cyan}npm test${colors.reset}\n`);

        return {
          success: false,
          code: 'MERGE_CONFLICT',
          conflicts: statusAfterMerge.conflictedFiles,
          stashInfo
        };
      } else {
        logError(`Sync failed: ${syncResult.stderr}`);
        if (stashInfo) restoreLocalWork(cwd, stashInfo);
        return { success: false, code: 'SYNC_ERROR', error: syncResult.stderr };
      }
    }

    logSuccess(`Successfully integrated remote changes from ${remoteRef}.`);
  }

  // Step 6: Restore preserved local modifications
  if (stashInfo) {
    const restoreResult = restoreLocalWork(cwd, stashInfo);
    if (!restoreResult.success) {
      return {
        success: false,
        code: 'STASH_CONFLICT',
        conflicts: restoreResult.conflicts || []
      };
    }
  }

  // Step 7: Run post-sync health verification
  if (!options.skipTests) {
    try {
      runPostSyncHealthChecks(cwd);
    } catch (testErr) {
      logError(`Post-synchronization health check failed: ${testErr.message}`);
      return { success: false, code: 'TEST_FAILURE', error: testErr.message };
    }
  }

  console.log(`\n${colors.green}${colors.bold}✓ Direct iteration synchronization completed successfully!${colors.reset}`);
  console.log(`${colors.dim}Current codebase is up-to-date and ready for subsequent development.${colors.reset}\n`);

  return { success: true, relation, currentCommit: runGit(['rev-parse', 'HEAD'], { cwd }).stdout };
}

/**
 * Probe local sync server health endpoint
 */
export async function checkServerHealth(url = 'http://127.0.0.1:38888', timeoutMs = 500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const healthUrl = url.endsWith('/health') ? url : `${url.replace(/\/+$/, '')}/health`;
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data && data.ok);
  } catch {
    return false;
  }
}

/**
 * Register Chrome / Chromium Native Messaging Host manifest
 */
export function registerNativeMessagingHost(options = {}) {
  const hostName = 'com.mairec.sync_bridge';
  const scriptPath = options.scriptPath || (options.cwd ? path.join(options.cwd, 'scripts/native_bridge.sh') : path.join(PROJECT_ROOT, 'scripts/native_bridge.sh'));

  try {
    if (fs.existsSync(scriptPath)) {
      fs.chmodSync(scriptPath, 0o755);
    }
  } catch (_) {}

  const allowedOrigins = new Set([
    'chrome-extension://hckjfgjjinombhcffkojdneimkdcggml/',
    ...(options.allowedOrigins || [])
  ]);

  if (options.extensionId) {
    allowedOrigins.add(`chrome-extension://${options.extensionId}/`);
  }

  const manifest = {
    name: hostName,
    description: 'MaiRec Local Synchronization Bridge Native Host',
    path: scriptPath,
    type: 'stdio',
    allowed_origins: Array.from(allowedOrigins)
  };

  const manifestContent = JSON.stringify(manifest, null, 2);
  const registeredPaths = [];
  const candidateDirs = [];

  if (options.profileDir) {
    candidateDirs.push(path.join(options.profileDir, 'NativeMessagingHosts'));
  }

  if (!options.profileOnly) {
    const home = os.homedir();
    if (home) {
      candidateDirs.push(
        path.join(home, '.config/google-chrome/NativeMessagingHosts'),
        path.join(home, '.config/chromium/NativeMessagingHosts'),
        path.join(home, '.config/google-chrome-for-testing/NativeMessagingHosts'),
        path.join(home, '.mozilla/native-messaging-hosts')
      );
    }
  }

  for (const dir of candidateDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const targetFile = path.join(dir, `${hostName}.json`);
      fs.writeFileSync(targetFile, manifestContent, 'utf8');
      registeredPaths.push(targetFile);
    } catch (_) {}
  }

  return { success: registeredPaths.length > 0, registeredPaths };
}

/**
 * Run Chrome Native Messaging Host (stdio protocol)
 */
export async function runNativeMessagingHost(options = {}) {
  const cwd = options.cwd || PROJECT_ROOT;
  const defaultPort = options.port || 38888;

  function sendNativeMessage(obj) {
    const payload = Buffer.from(JSON.stringify(obj), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    process.stdout.write(header);
    process.stdout.write(payload);
  }

  let buffer = Buffer.alloc(0);

  process.stdin.on('data', async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const msgLen = buffer.readUInt32LE(0);
      if (buffer.length < 4 + msgLen) {
        break; // Wait for full packet
      }

      const msgBytes = buffer.subarray(4, 4 + msgLen);
      buffer = buffer.subarray(4 + msgLen);

      let msg = {};
      try {
        msg = JSON.parse(msgBytes.toString('utf8'));
      } catch (err) {
        sendNativeMessage({ ok: false, error: 'Invalid JSON: ' + err.message });
        continue;
      }

      try {
        const action = msg.action || msg.type || 'status';
        const targetPort = msg.port || defaultPort;
        const serverUrl = `http://127.0.0.1:${targetPort}`;

        if (action === 'ping') {
          sendNativeMessage({ ok: true, pong: true, time: Date.now() });
        } else if (action === 'start') {
          const isAlive = await checkServerHealth(serverUrl, 300);
          if (isAlive) {
            sendNativeMessage({ ok: true, status: 'already_running', port: targetPort, serverUrl });
          } else {
            const syncScript = path.join(cwd, 'scripts/sync.mjs');
            const child = spawn(process.execPath, [syncScript, '--serve', '--port', String(targetPort), '--cwd', cwd], {
              cwd,
              detached: true,
              stdio: 'ignore'
            });
            child.unref();

            let ready = false;
            for (let i = 0; i < 25; i++) {
              await new Promise(r => setTimeout(r, 100));
              if (await checkServerHealth(serverUrl, 250)) {
                ready = true;
                break;
              }
            }

            sendNativeMessage({
              ok: ready,
              status: ready ? 'started' : 'timeout',
              port: targetPort,
              serverUrl,
              pid: child.pid
            });
          }
        } else if (action === 'check') {
          const checkRes = await syncRepository({
            cwd,
            remote: msg.remote,
            branch: msg.branch,
            remoteUrl: msg.remoteUrl,
            checkOnly: true,
            skipTests: true
          });
          sendNativeMessage({
            ok: checkRes.success,
            success: checkRes.success,
            relation: checkRes.relation,
            localHead: checkRes.localHead,
            remoteHead: checkRes.remoteHead,
            updateAvailable: checkRes.relation === 'BEHIND' || checkRes.relation === 'DIVERGED' || checkRes.relation === 'INITIAL_CHECKOUT'
          });
        } else if (action === 'sync') {
          const syncRes = await syncRepository({
            cwd,
            remote: msg.remote,
            branch: msg.branch,
            remoteUrl: msg.remoteUrl,
            strategy: msg.strategy,
            skipTests: msg.skipTests || false
          });
          sendNativeMessage({
            ok: syncRes.success,
            success: syncRes.success,
            relation: syncRes.relation,
            currentCommit: syncRes.currentCommit,
            code: syncRes.code,
            conflicts: syncRes.conflicts || [],
            error: syncRes.error
          });
        } else if (action === 'status') {
          const curBranch = getCurrentBranch(cwd);
          const status = getWorkingTreeStatus(cwd);
          const headRes = runGit(['rev-parse', 'HEAD'], { cwd });
          sendNativeMessage({
            ok: true,
            branch: curBranch,
            localHead: headRes.success ? headRes.stdout : '',
            isClean: status.isClean,
            uncommittedCount: status.trackedModified.length + status.untracked.length,
            conflicted: status.conflictedFiles
          });
        } else {
          sendNativeMessage({ ok: false, error: 'Unknown action: ' + action });
        }
      } catch (handlerErr) {
        sendNativeMessage({ ok: false, error: handlerErr.message });
      }
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });
}

/**
 * Start a lightweight local synchronization bridge server
 * Allows the browser extension popup settings interface to directly query
 * git status and trigger safe repository updates.
 */
export function startSyncServer(options = {}) {
  const port = options.port || 38888;
  const cwd = options.cwd || PROJECT_ROOT;
  const remote = options.remote || DEFAULT_REMOTE_NAME;
  const branch = options.branch || '';
  const remoteUrl = options.remoteUrl || DEFAULT_REMOTE_URL;

  return new Promise((resolve, reject) => {
    // Check if server is already running on this port
    checkServerHealth(`http://127.0.0.1:${port}`, 300).then(isHealthy => {
      if (isHealthy) {
        logSuccess(`Local synchronization bridge server active on http://127.0.0.1:${port}`);
        resolve({
          close: (cb) => { if (cb) cb(); },
          port,
          alreadyRunning: true
        });
        return;
      }

      const server = http.createServer(async (req, res) => {
        // Enable CORS for Chrome Extension origins
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
        const pathname = parsedUrl.pathname;

        try {
          if (req.method === 'GET' && (pathname === '/health' || pathname === '/status' || pathname === '/api/status')) {
            const curBranch = getCurrentBranch(cwd);
            const status = getWorkingTreeStatus(cwd);
            const headRes = runGit(['rev-parse', 'HEAD'], { cwd });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: true,
              branch: curBranch,
              localHead: headRes.success ? headRes.stdout : '',
              isClean: status.isClean,
              uncommittedCount: status.trackedModified.length + status.untracked.length,
              conflicted: status.conflictedFiles
            }));
            return;
          }

          if (req.method === 'POST' && (pathname === '/check' || pathname === '/api/check')) {
            const checkRes = await syncRepository({
              cwd,
              remote,
              branch,
              remoteUrl,
              checkOnly: true,
              skipTests: true
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: checkRes.success,
              success: checkRes.success,
              relation: checkRes.relation,
              localHead: checkRes.localHead,
              remoteHead: checkRes.remoteHead,
              updateAvailable: checkRes.relation === 'BEHIND' || checkRes.relation === 'DIVERGED' || checkRes.relation === 'INITIAL_CHECKOUT'
            }));
            return;
          }

          if (req.method === 'POST' && (pathname === '/sync' || pathname === '/api/sync')) {
            const syncRes = await syncRepository({
              cwd,
              remote,
              branch,
              remoteUrl,
              strategy: options.strategy || 'merge',
              skipTests: options.skipTests || false
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ok: syncRes.success,
              success: syncRes.success,
              relation: syncRes.relation,
              currentCommit: syncRes.currentCommit,
              code: syncRes.code,
              conflicts: syncRes.conflicts || [],
              error: syncRes.error
            }));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, success: false, error: err.message }));
        }
      });

      server.listen(port, '127.0.0.1', () => {
        logSuccess(`Local synchronization bridge server active on http://127.0.0.1:${port}`);
        resolve(server);
      });

      server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
          const healthy = await checkServerHealth(`http://127.0.0.1:${port}`, 300);
          if (healthy) {
            logSuccess(`Local synchronization bridge server active on http://127.0.0.1:${port}`);
            resolve({
              close: (cb) => { if (cb) cb(); },
              port,
              alreadyRunning: true
            });
            return;
          }
        }
        reject(err);
      });
    }).catch(reject);
  });
}

// Run CLI if invoked directly
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectExecution) {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Ensure native messaging host is registered
  try {
    if (!options.cwd || path.resolve(options.cwd) === PROJECT_ROOT) {
      registerNativeMessagingHost();
    }
  } catch (_) {}

  if (options.registerHost) {
    const reg = registerNativeMessagingHost(options);
    if (reg.success) {
      logSuccess(`Native messaging host registered at: ${reg.registeredPaths.join(', ')}`);
      process.exit(0);
    } else {
      logError('Failed to register native messaging host');
      process.exit(1);
    }
  }

  if (options.native) {
    runNativeMessagingHost(options);
  } else if (options.serve) {
    startSyncServer(options)
      .catch(err => {
        logError(`Failed to start sync server: ${err.message}`);
        process.exit(1);
      });
  } else {
    syncRepository(options)
      .then(result => {
        process.exit(result.success ? 0 : 1);
      })
      .catch(err => {
        logError(`Unhandled synchronization exception: ${err.message}`);
        if (options.verbose) {
          console.error(err.stack);
        }
        process.exit(1);
      });
  }
}
