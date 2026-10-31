/**
 * Verification Test: Manual Update & Local Sync Bridge Auto-Start Workflow
 * 
 * Tests the complete user experience:
 * 1. Sync bridge server is initially stopped.
 * 2. User opens popup settings in Chromium.
 * 3. User clicks manual update button.
 * 4. Sync bridge automatically starts up via Native Messaging without terminal commands.
 * 5. Extension communicates with bridge and detects upstream updates.
 * 6. User clicks 'Update Now' to synchronize incoming changes.
 * 7. Incoming changes are integrated into working tree and uncommitted work is preserved.
 * 8. Status indicator reports up-to-date with current version.
 */

import { spawn, spawnSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkServerHealth, registerNativeMessagingHost } from '../scripts/sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = '/home/mai/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

console.log('=== VERIFICATION TEST: MANUAL UPDATE AUTO-START & SYNCHRONIZATION ===\n');

async function run() {
  const testDir = path.join('/tmp', `mairec-verify-autostart-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  const remoteBare = path.join(testDir, 'remote.git');
  const upstreamDir = path.join(testDir, 'upstream');
  const clientDir = path.join(testDir, 'client');
  const clientProfile = path.join(testDir, 'profile');

  try {
    // 1. Initialize bare remote repository
    execSync(`git init --bare "${remoteBare}"`);
    execSync(`git --git-dir="${remoteBare}" symbolic-ref HEAD refs/heads/main`);

    // 2. Initialize upstream repository with project files
    fs.mkdirSync(upstreamDir, { recursive: true });
    execSync('git init -b main', { cwd: upstreamDir });
    execSync('git config user.email "upstream@mairec.ai"', { cwd: upstreamDir });
    execSync('git config user.name "Upstream CI"', { cwd: upstreamDir });

    execSync(`cp -r "${path.join(PROJECT_ROOT, 'extension')}" "${upstreamDir}/"`);
    execSync(`cp -r "${path.join(PROJECT_ROOT, 'scripts')}" "${upstreamDir}/"`);
    fs.mkdirSync(path.join(upstreamDir, 'ws-addon'), { recursive: true });
    fs.writeFileSync(path.join(upstreamDir, 'ws-addon/manifest.json'), JSON.stringify({ name: 'MaiRec', version: '1.5' }));

    execSync('git add .', { cwd: upstreamDir });
    execSync('git commit -m "feat: initial upstream release"', { cwd: upstreamDir });
    execSync(`git remote add origin "${remoteBare}"`, { cwd: upstreamDir });
    execSync('git push -u origin main', { cwd: upstreamDir });

    // 3. Clone to local client workspace
    execSync(`git clone "${remoteBare}" "${clientDir}"`);
    execSync('git config user.email "user@mairec.ai"', { cwd: clientDir });
    execSync('git config user.name "MaiRec User"', { cwd: clientDir });

    // 4. Create an uncommitted local file to verify zero work loss
    fs.writeFileSync(path.join(clientDir, 'user_experiment.txt'), 'valuable unsaved user code');

    // 5. Create new upstream commit so an update is pending
    fs.writeFileSync(path.join(upstreamDir, 'model_v2_weights.bin'), 'simulated weights payload v2');
    execSync('git add model_v2_weights.bin', { cwd: upstreamDir });
    execSync('git commit -m "feat(model): release improved OCR weights v2"', { cwd: upstreamDir });
    execSync('git push origin main', { cwd: upstreamDir });

    // 6. Stop any currently running sync bridge server
    spawnSync('pkill', ['-f', 'sync.mjs --serve']);
    await new Promise(r => setTimeout(r, 400));
    const initiallyAlive = await checkServerHealth('http://127.0.0.1:38888', 300);
    if (initiallyAlive) {
      throw new Error('Sync bridge should be STOPPED before starting the test, but was responding.');
    }
    console.log('✓ Confirmed: Local sync bridge server is initially STOPPED.');

    // 7. Launch Chromium with client extension
    const extClientPath = path.join(clientDir, 'extension');
    const chrome = spawn(CHROME_PATH, [
      '--headless=new',
      '--remote-debugging-port=9258',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-extensions-except=' + extClientPath,
      '--load-extension=' + extClientPath,
      '--user-data-dir=' + clientProfile
    ]);

    try {
      while (true) {
        try {
          await fetch('http://127.0.0.1:9258/json/version');
          break;
        } catch {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      let extId = null;
      for (let i = 0; i < 40; i++) {
        try {
          const list = await (await fetch('http://127.0.0.1:9258/json/list')).json();
          const sw = list.find(t => t.url && t.url.includes('background.js'));
          if (sw) {
            extId = sw.url.split('/')[2];
            break;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 100));
      }
      if (!extId) throw new Error('Extension failed to load in Chromium');
      console.log(`✓ Extension loaded in Chromium with ID: ${extId}`);

      // Register isolated native host in the Chromium test profile
      registerNativeMessagingHost({
        cwd: clientDir,
        scriptPath: path.join(clientDir, 'scripts/native_bridge.sh'),
        extensionId: extId,
        profileDir: clientProfile,
        profileOnly: true
      });

      // Connect to popup.html
      const popupTarget = await (await fetch(`http://127.0.0.1:9258/json/new?chrome-extension://${extId}/popup.html`, { method: 'PUT' })).json();
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

      // 8. Click "Check for Updates" button while bridge is stopped
      console.log('• User clicks "Check for Updates" button...');
      await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

      let availableState = null;
      for (let i = 0; i < 60; i++) {
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

        if (res.statusClasses && res.statusClasses.includes('status-failed')) {
          throw new Error(`Sync failed with error: ${res.statusText}`);
        }

        if (!res.isLoading && res.statusClasses && res.statusClasses.includes('status-available')) {
          availableState = res;
          break;
        }
      }

      if (!availableState) {
        throw new Error('Update available state was not reached');
      }

      console.log(`✓ Sync bridge started automatically! Status: "${availableState.statusText}"`);
      console.log(`✓ Button transitioned to: "${availableState.btnText}"`);

      // Verify the bridge server is now running on port 38888
      const bridgeRunning = await checkServerHealth('http://127.0.0.1:38888', 500);
      if (!bridgeRunning) {
        throw new Error('Sync bridge server is not responding on http://127.0.0.1:38888');
      }
      console.log('✓ Verified: Local sync bridge HTTP server is active and reachable.');

      // 9. Click "Update Now" / manual update button
      console.log('• User clicks "Update Now" to perform manual synchronization...');
      await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

      let postSyncState = null;
      for (let i = 0; i < 70; i++) {
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

        if (res.statusClasses && res.statusClasses.includes('status-failed')) {
          throw new Error(`Manual update failed: ${res.statusText}`);
        }

        if (!res.isLoading && res.statusClasses && res.statusClasses.includes('status-up-to-date')) {
          postSyncState = res;
          break;
        }
      }

      if (!postSyncState) {
        throw new Error('Up-to-date state was not reached after clicking Update Now');
      }

      console.log(`✓ Synchronization succeeded! Status: "${postSyncState.statusText}"`);

      // 10. Verify synced files on disk
      const newWeightFile = path.join(clientDir, 'model_v2_weights.bin');
      if (!fs.existsSync(newWeightFile)) {
        throw new Error('Synced upstream file model_v2_weights.bin was not written to disk');
      }
      console.log('✓ Verified: Upstream repository changes synchronized to disk.');

      // 11. Verify local uncommitted work was preserved
      const userNotes = path.join(clientDir, 'user_experiment.txt');
      if (!fs.existsSync(userNotes) || fs.readFileSync(userNotes, 'utf8') !== 'valuable unsaved user code') {
        throw new Error('Local uncommitted user files were lost or corrupted during sync');
      }
      console.log('✓ Verified: Local uncommitted work preserved perfectly without data loss.');

      ws.close();
    } finally {
      chrome.kill();
      spawnSync('pkill', ['-f', 'sync.mjs --serve']);
    }
  } finally {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
    // Restore global host for project root
    registerNativeMessagingHost({ cwd: PROJECT_ROOT, forceGlobal: true });
  }

  console.log('\n=== ALL MANUAL UPDATE & AUTO-START VERIFICATIONS PASSED! ===\n');
}

run().catch(err => {
  console.error('\n❌ Verification test failed:', err);
  process.exit(1);
});
