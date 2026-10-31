import { spawn, spawnSync, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkUpdates,
  synchronizeProject,
  formatStatusMessage,
  ensureSyncBridgeRunning,
  DEFAULT_SYNC_SERVER_URL
} from '../extension/sync.js';
import {
  startSyncServer,
  syncRepository,
  getWorkingTreeStatus,
  registerNativeMessagingHost,
  checkServerHealth
} from '../scripts/sync.mjs';
import { translations, getMessage } from '../extension/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = '/home/mai/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const EXT_PATH = path.resolve('extension');

console.log('--- Popup Settings Manual Update-Check & Synchronization Test Suite ---\n');

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
  // 1. Verify DOM elements and structure in popup.html
  await runTest('Verify update button and status indicator DOM structure in popup.html', () => {
    const html = fs.readFileSync('extension/popup.html', 'utf8');
    const requiredElements = [
      'check_update_btn',
      'update_status',
      'update_btn_text',
      'update_status_text'
    ];
    for (const id of requiredElements) {
      if (!html.includes(`id="${id}"`)) {
        throw new Error(`popup.html is missing required ID: ${id}`);
      }
    }
    // Check that button is inside .brand next to version badge
    const brandBlock = html.slice(html.indexOf('<div class="brand">'), html.indexOf('</div>', html.indexOf('<div class="brand">')));
    if (!brandBlock.includes('class="badge">v1.5</span>')) {
      throw new Error('.brand does not contain version badge v1.5');
    }
    if (!brandBlock.includes('id="check_update_btn"')) {
      throw new Error('.brand does not contain check_update_btn next to version badge');
    }
  });

  // 2. Verify CSS rules for button, status indicator, and light/dark mode
  await runTest('Verify CSS styling for update button and status indicators', () => {
    const css = fs.readFileSync('extension/popup.css', 'utf8');
    const requiredRules = [
      { name: 'Update button base class', pattern: /\.mac-btn-update\s*\{/ },
      { name: 'Update button accent class', pattern: /\.mac-btn-update\.btn-accent\s*\{/ },
      { name: 'Update button loading animation', pattern: /\.mac-btn-update\.is-loading/ },
      { name: 'Update status container', pattern: /\.update-status\s*\{/ },
      { name: 'Status checking dot', pattern: /\.update-status\.status-checking/ },
      { name: 'Status up-to-date dot', pattern: /\.update-status\.status-up-to-date/ },
      { name: 'Status available dot', pattern: /\.update-status\.status-available/ },
      { name: 'Status failed dot', pattern: /\.update-status\.status-failed/ },
      { name: 'Status conflict dot', pattern: /\.update-status\.status-conflict/ }
    ];
    for (const rule of requiredRules) {
      if (!rule.pattern.test(css)) {
        throw new Error(`popup.css is missing rule: ${rule.name}`);
      }
    }
  });

  // 3. Verify Multilingual Translations across en, ja, zh
  await runTest('Verify i18n localization for all update states (en, ja, zh)', () => {
    const keys = [
      'btn_check_updates',
      'btn_sync_now',
      'btn_retry',
      'status_checking',
      'status_up_to_date',
      'status_update_available',
      'status_syncing',
      'status_update_failed',
      'status_conflict',
      'status_network_error'
    ];
    for (const lang of ['en', 'ja', 'zh']) {
      for (const k of keys) {
        const val = translations[lang]?.[k];
        if (!val || typeof val !== 'string' || val.trim().length === 0) {
          throw new Error(`Missing translation for key "${k}" in language "${lang}"`);
        }
      }
      // Test formatStatusMessage formatting
      const upToDateMsg = formatStatusMessage({ status: 'up_to_date' }, lang);
      if (!upToDateMsg.includes(translations[lang]['status_up_to_date'])) {
        throw new Error(`formatStatusMessage failed for up_to_date in ${lang}: ${upToDateMsg}`);
      }

      const availableMsg = formatStatusMessage({ status: 'update_available', commitMessage: 'feat: new challenge model' }, lang);
      if (!availableMsg.includes(translations[lang]['status_update_available'])) {
        throw new Error(`formatStatusMessage failed for update_available in ${lang}: ${availableMsg}`);
      }

      const failedMsg = formatStatusMessage({ status: 'failed', error: 'Connection refused' }, lang);
      if (!failedMsg.includes(translations[lang]['status_update_failed']) || !failedMsg.includes('Connection refused')) {
        throw new Error(`formatStatusMessage failed for failed state in ${lang}: ${failedMsg}`);
      }
    }
  });

  // 4. Test Update Detection & Synchronization with isolated Git sandbox
  const sandboxDir = path.join('/tmp', `mairec-popup-sync-test-${Date.now()}`);
  fs.mkdirSync(sandboxDir, { recursive: true });

  const testPort = 38891;
  let serverInstance = null;

  try {
    const remoteBare = path.join(sandboxDir, 'remote.git');
    const upstreamWorking = path.join(sandboxDir, 'upstream');
    const localClient = path.join(sandboxDir, 'local');

    // Create bare remote repository
    execSync(`git init --bare "${remoteBare}"`);
    execSync(`git --git-dir="${remoteBare}" symbolic-ref HEAD refs/heads/main`);

    // Create upstream working tree and push initial files
    fs.mkdirSync(upstreamWorking, { recursive: true });
    execSync('git init -b main', { cwd: upstreamWorking });
    execSync('git config user.email "ci@mairec.ai"', { cwd: upstreamWorking });
    execSync('git config user.name "MaiRec CI"', { cwd: upstreamWorking });

    // Populate mock project structure
    fs.mkdirSync(path.join(upstreamWorking, 'extension/models'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'extension/db'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'ws-addon'), { recursive: true });
    fs.mkdirSync(path.join(upstreamWorking, 'test'), { recursive: true });

    fs.writeFileSync(path.join(upstreamWorking, 'extension/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.5' }));
    fs.writeFileSync(path.join(upstreamWorking, 'ws-addon/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.5' }));
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.html'), '<!DOCTYPE html><html></html>');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.js'), '// popup');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/popup.css'), '/* css */');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/i18n.js'), '// i18n');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/theme.js'), '// theme');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/sync.js'), '// sync');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/type.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/grid.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/models/motorcycles_b1.onnx'), 'mock-onnx');
    fs.writeFileSync(path.join(upstreamWorking, 'extension/db/captcha.sqlite'), 'mock-sqlite');
    fs.writeFileSync(path.join(upstreamWorking, 'README.md'), '# MaiRec v1.5\n');

    execSync('git add .', { cwd: upstreamWorking });
    execSync('git commit -m "feat: initial commit for update test"', { cwd: upstreamWorking });
    execSync(`git remote add origin "${remoteBare}"`, { cwd: upstreamWorking });
    execSync('git push -u origin main', { cwd: upstreamWorking });

    // Clone local client
    execSync(`git clone "${remoteBare}" "${localClient}"`);
    execSync('git config user.email "local@mairec.ai"', { cwd: localClient });
    execSync('git config user.name "Local Dev"', { cwd: localClient });

    // Start local sync bridge server on test port
    serverInstance = await startSyncServer({
      port: testPort,
      cwd: localClient,
      remote: 'origin',
      remoteUrl: remoteBare,
      skipTests: true
    });

    const testServerUrl = `http://127.0.0.1:${testPort}`;

    // Test 4a: Update detection when local is UP_TO_DATE
    await runTest('Detect synchronization status when local project is up to date', async () => {
      const checkRes = await checkUpdates({
        serverUrl: testServerUrl,
        timeoutMs: 3000
      });

      if (checkRes.status !== 'up_to_date') {
        throw new Error(`Expected status 'up_to_date', got: '${checkRes.status}'`);
      }
      if (checkRes.updateAvailable !== false) {
        throw new Error(`Expected updateAvailable to be false, got: ${checkRes.updateAvailable}`);
      }
      const msg = formatStatusMessage(checkRes, 'en');
      if (!msg.includes('Up to date')) {
        throw new Error(`Expected message to include 'Up to date', got: '${msg}'`);
      }
    });

    // Test 4b: Update detection when remote has newer commits
    await runTest('Detect update available when newer GitHub commits exist', async () => {
      // Add commit to upstream and push
      fs.writeFileSync(path.join(upstreamWorking, 'new_model_feature.txt'), 'high-accuracy motorcycle weights');
      execSync('git add new_model_feature.txt', { cwd: upstreamWorking });
      execSync('git commit -m "feat: add updated challenge weights"', { cwd: upstreamWorking });
      execSync('git push origin main', { cwd: upstreamWorking });

      const checkRes = await checkUpdates({
        serverUrl: testServerUrl,
        timeoutMs: 3000
      });

      if (checkRes.status !== 'update_available') {
        throw new Error(`Expected status 'update_available', got: '${checkRes.status}'`);
      }
      if (checkRes.updateAvailable !== true) {
        throw new Error(`Expected updateAvailable to be true, got: ${checkRes.updateAvailable}`);
      }
    });

    // Test 4c: Successful synchronization with local modifications preservation
    await runTest('Synchronize local project directly, preserving uncommitted local modifications', async () => {
      // Add local uncommitted work (tracked edit + untracked new file)
      fs.appendFileSync(path.join(localClient, 'README.md'), 'Local developer notes in progress\n');
      fs.writeFileSync(path.join(localClient, 'my_custom_script.js'), 'console.log("valuable work");');

      const syncRes = await synchronizeProject({
        serverUrl: testServerUrl,
        timeoutMs: 15000
      });

      if (syncRes.status !== 'up_to_date') {
        throw new Error(`Expected status 'up_to_date' after sync, got: '${syncRes.status}' (error: ${syncRes.error})`);
      }

      // 1. Verify remote change was integrated
      const syncedFile = path.join(localClient, 'new_model_feature.txt');
      if (!fs.existsSync(syncedFile)) {
        throw new Error('Remote file new_model_feature.txt was not synchronized');
      }

      // 2. Verify local modifications were preserved and restored cleanly
      const readme = fs.readFileSync(path.join(localClient, 'README.md'), 'utf8');
      if (!readme.includes('Local developer notes in progress')) {
        throw new Error('Local tracked modification was lost during synchronization!');
      }

      const customScript = path.join(localClient, 'my_custom_script.js');
      if (!fs.existsSync(customScript)) {
        throw new Error('Local untracked file was deleted or lost during synchronization!');
      }

      // 3. Verify status refreshes to up to date
      const postSyncCheck = await checkUpdates({
        serverUrl: testServerUrl,
        timeoutMs: 3000
      });
      if (postSyncCheck.status !== 'up_to_date') {
        throw new Error(`Expected status 'up_to_date' on post-sync check, got: '${postSyncCheck.status}'`);
      }
    });

    // Test 4d: Network failure handling
    await runTest('Handle network failures and report clear error message', async () => {
      const unreachableUrl = 'http://127.0.0.1:59123'; // inactive port
      const failRes = await checkUpdates({
        serverUrl: unreachableUrl,
        githubApiUrl: 'http://127.0.0.1:59123/api/commits',
        timeoutMs: 800
      });

      if (failRes.status !== 'failed') {
        throw new Error(`Expected status 'failed', got: '${failRes.status}'`);
      }
      if (!failRes.error) {
        throw new Error('Expected error message on network failure');
      }
      const msg = formatStatusMessage(failRes, 'en');
      if (!msg.includes('Update failed')) {
        throw new Error(`Expected formatted error message to start with 'Update failed', got: '${msg}'`);
      }
    });

    // Test 4e: Git merge conflict detection without destructive changes
    await runTest('Detect Git conflicts and report clearly without destructive overwrites', async () => {
      // Clear previous uncommitted changes for conflict test
      execSync('git stash push -u -m "cleanup"', { cwd: localClient });

      // Local commits an edit to shared file
      fs.writeFileSync(path.join(localClient, 'conflict_test.txt'), 'LINE_A: LOCAL VALUE\n');
      execSync('git add conflict_test.txt', { cwd: localClient });
      execSync('git commit -m "local: edit conflict_test"', { cwd: localClient });

      // Upstream commits a conflicting edit to the same line
      fs.writeFileSync(path.join(upstreamWorking, 'conflict_test.txt'), 'LINE_A: UPSTREAM VALUE\n');
      execSync('git add conflict_test.txt', { cwd: upstreamWorking });
      execSync('git commit -m "upstream: edit conflict_test with different value"', { cwd: upstreamWorking });
      execSync('git push origin main', { cwd: upstreamWorking });

      // Trigger sync through the bridge
      const conflictRes = await synchronizeProject({
        serverUrl: testServerUrl,
        timeoutMs: 15000
      });

      if (conflictRes.status !== 'conflict' && conflictRes.status !== 'failed') {
        throw new Error(`Expected conflict/failed status, got: '${conflictRes.status}'`);
      }

      if (conflictRes.code !== 'MERGE_CONFLICT') {
        throw new Error(`Expected code MERGE_CONFLICT, got: '${conflictRes.code}'`);
      }

      if (!conflictRes.conflicts.includes('conflict_test.txt')) {
        throw new Error(`Expected conflicts list to contain conflict_test.txt, got: ${JSON.stringify(conflictRes.conflicts)}`);
      }

      const msg = formatStatusMessage(conflictRes, 'en');
      if (!msg.includes('conflict_test.txt')) {
        throw new Error(`Expected formatted message to include conflicted filename, got: '${msg}'`);
      }

      // Cleanup local client merge state
      execSync('git merge --abort', { cwd: localClient });
    });

    // Test 4f: Verify direct GitHub API check against official public repository
    await runTest('Verify direct GitHub API check against official Melony-mai/MaiRec repository', async () => {
      // Force direct GitHub API check by providing inactive bridge server URL
      const ghCheck = await checkUpdates({
        serverUrl: 'http://127.0.0.1:59998',
        githubApiUrl: 'https://api.github.com/repos/Melony-mai/MaiRec/commits/main',
        timeoutMs: 5000
      });

      if (ghCheck.status !== 'up_to_date' && ghCheck.status !== 'update_available') {
        throw new Error(`Expected up_to_date or update_available from GitHub API, got: ${ghCheck.status} (error: ${ghCheck.error})`);
      }
      if (ghCheck.source !== 'github_api') {
        throw new Error(`Expected source to be 'github_api', got: '${ghCheck.source}'`);
      }
      if (!ghCheck.remoteHead) {
        throw new Error('Expected remoteHead SHA to be populated from GitHub API');
      }
    });

    // Test 4g: Verify appropriate error message when repository cannot be accessed (HTTP 404)
    await runTest('Ensure appropriate error message is displayed when repository is not found or private (HTTP 404)', async () => {
      const notFoundRes = await checkUpdates({
        serverUrl: 'http://127.0.0.1:59998',
        githubApiUrl: 'https://api.github.com/repos/Melony-mai/NonExistentRepoForTesting404/commits/main',
        timeoutMs: 4000
      });

      if (notFoundRes.status !== 'failed') {
        throw new Error(`Expected status 'failed', got: '${notFoundRes.status}'`);
      }
      if (!notFoundRes.error.includes('HTTP 404')) {
        throw new Error(`Expected error message to mention HTTP 404, got: '${notFoundRes.error}'`);
      }
      if (!notFoundRes.error.includes('Repository or branch not found')) {
        throw new Error(`Expected error message to provide descriptive guidance, got: '${notFoundRes.error}'`);
      }
      const formatted = formatStatusMessage(notFoundRes, 'en');
      if (!formatted.includes('Update failed') || !formatted.includes('HTTP 404')) {
        throw new Error(`Expected formatted message to include 'Update failed' and 'HTTP 404', got: '${formatted}'`);
      }
    });

    // Test 4h: Verify token authorization header support
    await runTest('Verify optional GitHub token header integration', async () => {
      let receivedAuthHeader = null;
      const mockServer = http.createServer((req, res) => {
        receivedAuthHeader = req.headers['authorization'];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sha: '1234567890', commit: { message: 'token test' } }));
      });
      await new Promise(r => mockServer.listen(38893, '127.0.0.1', r));

      try {
        const tokenRes = await checkUpdates({
          serverUrl: 'http://127.0.0.1:59998',
          githubApiUrl: 'http://127.0.0.1:38893',
          token: 'ghp_test_token_secret_123',
          timeoutMs: 2000
        });

        if (receivedAuthHeader !== 'Bearer ghp_test_token_secret_123') {
          throw new Error(`Expected Authorization header 'Bearer ghp_test_token_secret_123', got: '${receivedAuthHeader}'`);
        }
        if (tokenRes.status !== 'update_available' && tokenRes.status !== 'up_to_date') {
          throw new Error(`Expected valid status with token, got: ${tokenRes.status}`);
        }
      } finally {
        mockServer.close();
      }
    });

  } finally {
    // Shutdown test bridge server
    if (serverInstance && serverInstance.close) {
      serverInstance.close();
    }
    // Cleanup sandbox directory
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // 5. Test Live Popup Rendering & User Interaction in Chrome via CDP
  await runTest('Verify Popup UI interaction, button state, and responsive layout in headless Chromium', async () => {
    const testProfile = '/tmp/test-profile-popup-sync-' + Date.now();
    registerNativeMessagingHost({ profileDir: testProfile, profileOnly: true });
    const chrome = spawn(CHROME_PATH, [
      '--headless=new',
      '--remote-debugging-port=9244',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-extensions-except=' + EXT_PATH,
      '--load-extension=' + EXT_PATH,
      '--user-data-dir=' + testProfile
    ]);

    try {
      while (true) {
        try {
          await fetch('http://127.0.0.1:9244/json/version');
          break;
        } catch {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      let extId = null;
      for (let i = 0; i < 50; i++) {
        try {
          const list = await (await fetch('http://127.0.0.1:9244/json/list')).json();
          const sw = list.find(t => t.url && t.url.includes('background.js'));
          if (sw) {
            extId = sw.url.split('/')[2];
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 100));
      }
      if (!extId) throw new Error('Background service worker not found');

      const popupTarget = await (await fetch(`http://127.0.0.1:9244/json/new?chrome-extension://${extId}/popup.html`, { method: 'PUT' })).json();
      const ws = new WebSocket(popupTarget.webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);
      await new Promise(r => setTimeout(r, 400));

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise((resolve, reject) => {
          const id = msgId++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === id) {
              ws.removeEventListener('message', handler);
              if (msg.error) reject(new Error(msg.error.message));
              else resolve(msg.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      await send('Page.enable');
      await send('Runtime.enable');

      // 5a. Verify DOM presence and computed styles in popup
      const domCheck = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const btnText = document.getElementById('update_btn_text');
          const statusEl = document.getElementById('update_status');
          const badge = document.querySelector('.badge');
          const btnRect = btn.getBoundingClientRect();
          const badgeRect = badge.getBoundingClientRect();
          const btnStyle = window.getComputedStyle(btn);

          return {
            btnExists: !!btn,
            badgeExists: !!badge,
            btnText: btnText ? btnText.textContent.trim() : null,
            badgeText: badge ? badge.textContent.trim() : null,
            btnVisible: btnRect.width > 0 && btnRect.height > 0,
            btnInlineWithBadge: Math.abs(btnRect.top - badgeRect.top) < 10,
            btnBg: btnStyle.backgroundColor,
            btnBorder: btnStyle.borderColor,
            statusInitialHidden: statusEl.classList.contains('hidden'),
            hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
            hasVerticalOverflow: document.body.scrollHeight > 580,
            scrollHeight: document.body.scrollHeight
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (!domCheck.btnExists) throw new Error('check_update_btn not found in DOM');
      if (domCheck.badgeText !== 'v1.5') throw new Error(`Badge text mismatch: ${domCheck.badgeText}`);
      const validInitialTexts = ['Check for Updates', '检查更新', '更新を確認'];
      if (!validInitialTexts.includes(domCheck.btnText)) {
        throw new Error(`Initial button text mismatch: ${domCheck.btnText}`);
      }
      if (!domCheck.btnVisible) throw new Error('Update button is not visible');
      if (!domCheck.btnInlineWithBadge) throw new Error('Update button is not visually aligned with version badge');
      if (!domCheck.statusInitialHidden) throw new Error('Update status should initially be hidden');
      if (domCheck.hasHorizontalOverflow) throw new Error('Horizontal overflow detected with update button');
      if (domCheck.hasVerticalOverflow) throw new Error(`Vertical overflow (>580px) detected: ${domCheck.scrollHeight}px`);

      // 5b. Verify button click changes state to checking and reveals status
      await send('Runtime.evaluate', {
        expression: `document.getElementById('check_update_btn').click()`
      });

      // Small delay to observe checking state
      await new Promise(r => setTimeout(r, 60));

      const checkingState = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const statusEl = document.getElementById('update_status');
          const statusText = document.getElementById('update_status_text');
          return {
            statusVisible: !statusEl.classList.contains('hidden'),
            statusHasClass: statusEl.classList.contains('status-checking') || statusEl.classList.contains('status-failed') || statusEl.classList.contains('status-up-to-date'),
            statusText: statusText ? statusText.textContent.trim() : null
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (!checkingState.statusVisible) {
        throw new Error('Status element should be revealed after button click');
      }

      // 5c. Test language switching dynamically updates button text and status
      for (const [code, expectedBtnText] of [['ja', '更新を確認'], ['zh', '检查更新'], ['en', 'Check for Updates']]) {
        await send('Runtime.evaluate', {
          expression: `(() => {
            const sel = document.getElementById('lang_select');
            sel.value = '${code}';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          })()`
        });
        await new Promise(r => setTimeout(r, 100));

        const langText = (await send('Runtime.evaluate', {
          expression: `document.getElementById('update_btn_text').textContent.trim()`,
          returnByValue: true
        })).result.value;

        // May be "Check for Updates" or "Retry" depending on async network result
        if (!langText) {
          throw new Error(`Empty button text in language ${code}`);
        }
      }

      // 5d. Test Light Mode appearance of update button and status
      await send('Runtime.evaluate', {
        expression: `document.getElementById('theme_toggle_btn').click()`
      });
      await new Promise(r => setTimeout(r, 100));

      const lightCheck = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const statusEl = document.getElementById('update_status');
          const htmlTheme = document.documentElement.getAttribute('data-theme');
          const btnStyle = window.getComputedStyle(btn);
          return {
            htmlTheme,
            btnBg: btnStyle.backgroundColor,
            hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
            hasVerticalOverflow: document.body.scrollHeight > 580
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (lightCheck.htmlTheme !== 'light') {
        throw new Error('Theme did not switch to light');
      }
      if (lightCheck.hasHorizontalOverflow) {
        throw new Error('Horizontal overflow in Light Mode');
      }
      if (lightCheck.hasVerticalOverflow) {
        throw new Error('Vertical overflow in Light Mode');
      }

      ws.close();
    } finally {
      chrome.kill();
      try { fs.rmSync(testProfile, { recursive: true, force: true }); } catch (_) {}
    }
  });

  // 6. Test Automatic Sync Bridge Startup when Initially Stopped (API Layer)
  await runTest('Verify sync bridge auto-starts automatically when initially stopped (API Layer)', async () => {
    const autoPort = 38900 + Math.floor(Math.random() * 50);
    const autoServerUrl = `http://127.0.0.1:${autoPort}`;
    const sandboxDir = path.join('/tmp', `mairec-autostart-test-${Date.now()}`);
    fs.mkdirSync(sandboxDir, { recursive: true });

    spawnSync('pkill', ['-f', `sync.mjs --serve --port ${autoPort}`]);

    try {
      const remoteBare = path.join(sandboxDir, 'remote.git');
      const localClient = path.join(sandboxDir, 'local');

      execSync(`git init --bare "${remoteBare}"`);
      execSync(`git --git-dir="${remoteBare}" symbolic-ref HEAD refs/heads/main`);

      const tmpInit = path.join(sandboxDir, 'tmp_init');
      fs.mkdirSync(tmpInit, { recursive: true });
      execSync('git init -b main', { cwd: tmpInit });
      execSync('git config user.email "ci@mairec.ai"', { cwd: tmpInit });
      execSync('git config user.name "MaiRec CI"', { cwd: tmpInit });
      fs.writeFileSync(path.join(tmpInit, 'README.md'), '# Init');
      execSync('git add .', { cwd: tmpInit });
      execSync('git commit -m "init"', { cwd: tmpInit });
      execSync(`git remote add origin "${remoteBare}"`, { cwd: tmpInit });
      execSync('git push -u origin main', { cwd: tmpInit });

      execSync(`git clone "${remoteBare}" "${localClient}"`);
      execSync('git config user.email "local@mairec.ai"', { cwd: localClient });
      execSync('git config user.name "Local Dev"', { cwd: localClient });

      // Verify initially stopped
      const initiallyAlive = await checkServerHealth(autoServerUrl, 250);
      if (initiallyAlive) {
        throw new Error(`Port ${autoPort} should be stopped before test`);
      }

      // Call ensureSyncBridgeRunning with auto-start
      const started = await ensureSyncBridgeRunning({
        serverUrl: autoServerUrl,
        cwd: localClient,
        timeoutMs: 4000
      });

      if (!started) {
        throw new Error('ensureSyncBridgeRunning failed to auto-start bridge server');
      }

      const nowAlive = await checkServerHealth(autoServerUrl, 300);
      if (!nowAlive) {
        throw new Error('Server health check failed after auto-start');
      }

      // Perform checkUpdates through the auto-started server
      const checkRes = await checkUpdates({
        serverUrl: autoServerUrl,
        timeoutMs: 5000
      });

      if (checkRes.status !== 'up_to_date' && checkRes.status !== 'update_available') {
        throw new Error(`Expected up_to_date or update_available, got: ${checkRes.status}`);
      }
      if (checkRes.source !== 'local_git') {
        throw new Error(`Expected source 'local_git', got: ${checkRes.source}`);
      }
    } finally {
      spawnSync('pkill', ['-f', `sync.mjs --serve --port ${autoPort}`]);
      try { fs.rmSync(sandboxDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  // 7. Test Chrome Native Messaging Host stdio protocol & commands
  await runTest('Verify Chrome Native Messaging Host protocol, stdio framing, and commands', async () => {
    const bridgeScript = path.join(PROJECT_ROOT, 'scripts/native_bridge.sh');
    const child = spawn('bash', [bridgeScript], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'inherit']
    });

    try {
      function sendNM(msg) {
        const payload = Buffer.from(JSON.stringify(msg), 'utf8');
        const header = Buffer.alloc(4);
        header.writeUInt32LE(payload.length, 0);
        child.stdin.write(header);
        child.stdin.write(payload);
      }

      function readNMResponse() {
        return new Promise((resolve, reject) => {
          let buffer = Buffer.alloc(0);
          const onData = (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length >= 4) {
              const len = buffer.readUInt32LE(0);
              if (buffer.length >= 4 + len) {
                child.stdout.removeListener('data', onData);
                const msg = JSON.parse(buffer.subarray(4, 4 + len).toString('utf8'));
                resolve(msg);
              }
            }
          };
          child.stdout.on('data', onData);
          setTimeout(() => reject(new Error('NM response timeout')), 5000);
        });
      }

      // Test 7a: ping
      sendNM({ action: 'ping' });
      const pingRes = await readNMResponse();
      if (!pingRes.ok || !pingRes.pong) {
        throw new Error(`Unexpected ping response: ${JSON.stringify(pingRes)}`);
      }

      // Test 7b: status
      sendNM({ action: 'status' });
      const statusRes = await readNMResponse();
      if (!statusRes.ok || !statusRes.branch) {
        throw new Error(`Unexpected status response: ${JSON.stringify(statusRes)}`);
      }

      // Test 7c: start
      sendNM({ action: 'start', port: 38896 });
      const startRes = await readNMResponse();
      if (!startRes.ok) {
        throw new Error(`Unexpected start response: ${JSON.stringify(startRes)}`);
      }
      const isAlive = await checkServerHealth('http://127.0.0.1:38896', 500);
      if (!isAlive) {
        throw new Error('Server on 38896 was not alive after NM start');
      }

      spawnSync('pkill', ['-f', 'sync.mjs --serve --port 38896']);
    } finally {
      child.kill();
    }
  });

  // 8. Test In-Browser Manual Update with Initially Stopped Sync Bridge (CDP Full E2E)
  await runTest('Verify in-browser manual update and synchronization in Chromium with initially stopped sync bridge', async () => {
    const e2eDir = path.join('/tmp', `mairec-e2e-sync-${Date.now()}`);
    fs.mkdirSync(e2eDir, { recursive: true });

    const remoteBare = path.join(e2eDir, 'remote.git');
    const upstreamWorking = path.join(e2eDir, 'upstream');
    const localClient = path.join(e2eDir, 'local');

    // 1. Initialize bare remote
    execSync(`git init --bare "${remoteBare}"`);
    execSync(`git --git-dir="${remoteBare}" symbolic-ref HEAD refs/heads/main`);

    // 2. Initialize upstream working directory
    fs.mkdirSync(upstreamWorking, { recursive: true });
    execSync('git init -b main', { cwd: upstreamWorking });
    execSync('git config user.email "ci@mairec.ai"', { cwd: upstreamWorking });
    execSync('git config user.name "MaiRec CI"', { cwd: upstreamWorking });

    execSync(`cp -r "${EXT_PATH}" "${upstreamWorking}/"`);
    execSync(`cp -r "${path.join(PROJECT_ROOT, 'scripts')}" "${upstreamWorking}/"`);
    fs.mkdirSync(path.join(upstreamWorking, 'ws-addon'), { recursive: true });
    fs.writeFileSync(path.join(upstreamWorking, 'ws-addon/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.5' }));

    execSync('git add .', { cwd: upstreamWorking });
    execSync('git commit -m "feat: initial commit for e2e"', { cwd: upstreamWorking });
    execSync(`git remote add origin "${remoteBare}"`, { cwd: upstreamWorking });
    execSync('git push -u origin main', { cwd: upstreamWorking });

    // 3. Clone to localClient
    execSync(`git clone "${remoteBare}" "${localClient}"`);
    execSync('git config user.email "local@mairec.ai"', { cwd: localClient });
    execSync('git config user.name "Local Dev"', { cwd: localClient });

    // 4. Add upstream commit so update is available
    fs.writeFileSync(path.join(upstreamWorking, 'new_ai_weights.bin'), 'mock weights v2 content');
    execSync('git add new_ai_weights.bin', { cwd: upstreamWorking });
    execSync('git commit -m "feat: new AI weights released"', { cwd: upstreamWorking });
    execSync('git push origin main', { cwd: upstreamWorking });

    // 5. Add local uncommitted work to verify work preservation
    fs.writeFileSync(path.join(localClient, 'my_local_notes.txt'), 'valuable local notes in progress');

    // 6. Ensure sync bridge is initially stopped
    spawnSync('pkill', ['-f', 'sync.mjs --serve']);

    const e2eProfile = path.join(e2eDir, 'profile');
    const extClientPath = path.join(localClient, 'extension');

    const chrome = spawn(CHROME_PATH, [
      '--headless=new',
      '--remote-debugging-port=9250',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-extensions-except=' + extClientPath,
      '--load-extension=' + extClientPath,
      '--user-data-dir=' + e2eProfile
    ]);

    try {
      while (true) {
        try {
          await fetch('http://127.0.0.1:9250/json/version');
          break;
        } catch {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      let extId = null;
      for (let i = 0; i < 30; i++) {
        try {
          const list = await (await fetch('http://127.0.0.1:9250/json/list')).json();
          const sw = list.find(t => t.url && t.url.includes('background.js'));
          if (sw) {
            extId = sw.url.split('/')[2];
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 100));
      }

      if (!extId) throw new Error('Extension failed to load in Chromium');

      // Register native messaging host with the extension ID and localClient (profile isolated)
      registerNativeMessagingHost({
        cwd: localClient,
        scriptPath: path.join(localClient, 'scripts/native_bridge.sh'),
        extensionId: extId,
        profileDir: e2eProfile,
        profileOnly: true
      });

      const popupTarget = await (await fetch(`http://127.0.0.1:9250/json/new?chrome-extension://${extId}/popup.html`, { method: 'PUT' })).json();
      const ws = new WebSocket(popupTarget.webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);
      await new Promise(r => setTimeout(r, 300));

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise((resolve, reject) => {
          const id = msgId++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === id) {
              ws.removeEventListener('message', handler);
              if (msg.error) reject(new Error(msg.error.message));
              else resolve(msg.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      await send('Page.enable');
      await send('Runtime.enable');

      // Step 8a: Click "Check for Updates" with bridge initially stopped
      await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

      let updateAvailableState = null;
      for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r, 200));
        const res = (await send('Runtime.evaluate', {
          expression: `(() => {
            const btn = document.getElementById('check_update_btn');
            const statusEl = document.getElementById('update_status');
            const statusText = document.getElementById('update_status_text');
            const btnText = document.getElementById('update_btn_text');
            return {
              btnText: btnText?.textContent.trim(),
              isLoading: btn?.classList.contains('is-loading'),
              statusClasses: statusEl?.className,
              statusText: statusText?.textContent.trim()
            };
          })()`,
          returnByValue: true
        })).result.value;

        if (!res.isLoading && res.statusClasses.includes('status-available')) {
          updateAvailableState = res;
          break;
        }
      }

      if (!updateAvailableState) {
        throw new Error('Update available state was not reached when bridge auto-started');
      }

      // Step 8b: Click manual update button ("Update Now" / "立即更新")
      await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

      let postSyncState = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 300));
        const res = (await send('Runtime.evaluate', {
          expression: `(() => {
            const btn = document.getElementById('check_update_btn');
            const statusEl = document.getElementById('update_status');
            const statusText = document.getElementById('update_status_text');
            const btnText = document.getElementById('update_btn_text');
            return {
              btnText: btnText?.textContent.trim(),
              isLoading: btn?.classList.contains('is-loading'),
              statusClasses: statusEl?.className,
              statusText: statusText?.textContent.trim()
            };
          })()`,
          returnByValue: true
        })).result.value;

        if (!res.isLoading && res.statusClasses.includes('status-up-to-date')) {
          postSyncState = res;
          break;
        }
      }

      if (!postSyncState) {
        throw new Error('Up-to-date state was not reached after update click');
      }

      // Step 8c: Verify incoming changes were synchronized to disk
      const syncedFile = path.join(localClient, 'new_ai_weights.bin');
      if (!fs.existsSync(syncedFile)) {
        throw new Error('File new_ai_weights.bin was not found on local disk after synchronization');
      }

      // Step 8d: Verify local uncommitted work was preserved
      const notesFile = path.join(localClient, 'my_local_notes.txt');
      if (!fs.existsSync(notesFile) || fs.readFileSync(notesFile, 'utf8') !== 'valuable local notes in progress') {
        throw new Error('Local uncommitted notes were not preserved during synchronization');
      }

      ws.close();
    } finally {
      chrome.kill();
      try { fs.rmSync(e2eDir, { recursive: true, force: true }); } catch (_) {}
      spawnSync('pkill', ['-f', 'sync.mjs --serve']);
    }
  });

  // Ensure native messaging host for workspace is restored and registered
  try {
    registerNativeMessagingHost({ cwd: PROJECT_ROOT, forceGlobal: true });
  } catch (_) {}

  console.log('\n=== ALL MANUAL UPDATE-CHECK AND SYNCHRONIZATION TESTS PASSED! ===\n');
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
