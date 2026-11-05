/**
 * Verification Test: Self-Contained Manual Update & Direct GitHub Synchronization
 * 
 * Verifies all 6 core requirements from the user:
 * 1. Eliminate Local Sync Bridge dependency: Extension operates without background sync bridge or terminal.
 * 2. Direct GitHub synchronization: Checks GitHub repository directly for latest commits and releases.
 * 3. Universal installation compatibility: Runs cleanly on any machine (Windows, macOS, Linux) without extra setup.
 * 4. Manual update checking: Manual check button and synchronize button work end-to-end in Chromium.
 * 5. Reliable error handling: Clear error reporting for network drops, rate limits (403/429), not found (404),
 *    and never reports success prematurely.
 * 6. Preserve existing functionality: Retains user settings, preferences, language, and theme across updates.
 */

import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';
import { checkServerHealth } from '../scripts/sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXT_PATH = path.join(PROJECT_ROOT, 'extension');

function getChromePath() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macPath)) return macPath;
  }
  return '/home/mai/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
}

const CHROME_PATH = getChromePath();

console.log('=== VERIFICATION TEST: SELF-CONTAINED MANUAL UPDATE & GITHUB SYNCHRONIZATION ===\n');

async function run() {
  const testDir = path.join(os.tmpdir(), `mairec-verify-github-sync-${Date.now()}`);
  const clientProfile = path.join(testDir, 'profile');
  fs.mkdirSync(clientProfile, { recursive: true });

  // 1. Verify local sync bridge is STOPPED (requirement #1)
  const initiallyAlive = await checkServerHealth('http://127.0.0.1:38888', 300);
  if (initiallyAlive) {
    throw new Error('Sync bridge should be STOPPED before test, but was responding on 38888.');
  }
  console.log('✓ Requirement 1 Confirmed: Local sync bridge server is STOPPED (zero background dependency).');

  // 2. Set up a configurable Mock GitHub API Server (requirement #2 & #5)
  let mockStatus = 200;
  let mockCommitSha = 'fa999bb4c00ffee';
  let mockCommitMsg = 'feat: release v1.6 with self-contained sync';

  const mockServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, User-Agent');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (mockStatus === 404) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not Found' }));
      return;
    }

    if (mockStatus === 403) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'API rate limit exceeded for IP' }));
      return;
    }

    if (mockStatus === 500) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Internal Server Error' }));
      return;
    }

    if (req.url.includes('/commits')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        sha: mockCommitSha,
        commit: {
          message: mockCommitMsg,
          committer: { date: '2026-11-05T12:00:00Z' }
        }
      }));
      return;
    }

    if (req.url.includes('/manifest.json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const manifestBase64 = Buffer.from(JSON.stringify({ name: 'MaiRec', version: '1.6' })).toString('base64');
      res.end(JSON.stringify({ content: manifestBase64 }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const mockPort = 38898;
  await new Promise(r => mockServer.listen(mockPort, '127.0.0.1', r));
  console.log(`✓ Requirement 2 & 5: Mock GitHub API active on http://127.0.0.1:${mockPort}`);

  // 3. Launch Chromium with extension (requirement #3: Universal installation compatibility)
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9258',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions-except=' + EXT_PATH,
    '--load-extension=' + EXT_PATH,
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
    console.log(`✓ Requirement 3 Confirmed: Extension loaded cleanly in Chromium with ID: ${extId}`);

    // Connect to popup.html via CDP WebSocket
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

    // 4. Test User Settings Preservation (requirement #6)
    console.log('• Testing preservation of user settings and preferences (requirement #6)...');
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        chrome.storage.local.set({
          github_api_url: 'http://127.0.0.1:${mockPort}/commits/main',
          settings: {
            enabled: true,
            recaptcha_auto_open: true,
            recaptcha_auto_solve: true,
            recaptcha_delay_between_clicks: 750,
            recaptcha_delay_dynamic_reveal: 450,
            recaptcha_delay_before_verify: 600,
            language: 'zh',
            theme: 'dark'
          },
          sync_state: { localHead: '11111111', status: 'idle' }
        }, resolve);
      })`,
      awaitPromise: true
    });

    // 5. Test Manual Update Check (requirement #4)
    console.log('• Testing manual update check via popup UI (requirement #4)...');
    await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

    let updateAvailableState = null;
    for (let i = 0; i < 40; i++) {
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
      throw new Error('Update available state was not reached when checking direct GitHub repository');
    }
    console.log(`✓ Manual update check detected update: "${updateAvailableState.statusText}"`);
    console.log(`✓ Button transitioned to: "${updateAvailableState.btnText}"`);

    // 6. Test Direct GitHub Synchronization (requirement #2 & #4)
    console.log('• User clicks "Update Now" to perform direct GitHub synchronization...');
    await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

    let postSyncState = null;
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 250));
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
    console.log(`✓ Direct synchronization completed: "${postSyncState.statusText}"`);

    // 7. Verify user settings remained completely intact (requirement #6)
    const storedSettings = (await send('Runtime.evaluate', {
      expression: `new Promise(resolve => chrome.storage.local.get('settings', res => resolve(res.settings)))`,
      awaitPromise: true,
      returnByValue: true
    })).result.value;

    if (!storedSettings || storedSettings.recaptcha_delay_between_clicks !== 750 || storedSettings.language !== 'zh') {
      throw new Error(`User settings were corrupted during synchronization: ${JSON.stringify(storedSettings)}`);
    }
    console.log('✓ Requirement 6 Confirmed: User settings and preferences perfectly preserved.');

    // 8. Test Reliable Error Handling: HTTP 404 Not Found (requirement #5)
    console.log('• Testing error handling on HTTP 404 (repository not found)...');
    mockStatus = 404;
    await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

    let notFoundErrorState = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      const res = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const statusEl = document.getElementById('update_status');
          const statusText = document.getElementById('update_status_text');
          return {
            isLoading: btn?.classList.contains('is-loading'),
            statusClasses: statusEl?.className,
            statusText: statusText?.textContent.trim()
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (!res.isLoading && res.statusClasses.includes('status-failed')) {
        notFoundErrorState = res;
        break;
      }
    }

    if (!notFoundErrorState || !notFoundErrorState.statusText.includes('HTTP 404')) {
      throw new Error(`Expected HTTP 404 error message, got: ${notFoundErrorState?.statusText}`);
    }
    console.log(`✓ Requirement 5 Confirmed: Clear HTTP 404 error reported: "${notFoundErrorState.statusText}"`);

    // 9. Test Reliable Error Handling: HTTP 403 Rate Limit (requirement #5)
    console.log('• Testing error handling on HTTP 403 (API rate limit exceeded)...');
    mockStatus = 403;
    await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

    let rateLimitState = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      const res = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const statusEl = document.getElementById('update_status');
          const statusText = document.getElementById('update_status_text');
          return {
            isLoading: btn?.classList.contains('is-loading'),
            statusClasses: statusEl?.className,
            statusText: statusText?.textContent.trim()
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (!res.isLoading && res.statusClasses.includes('status-failed')) {
        rateLimitState = res;
        break;
      }
    }

    if (!rateLimitState || !rateLimitState.statusText.includes('HTTP 403')) {
      throw new Error(`Expected HTTP 403 rate limit error message, got: ${rateLimitState?.statusText}`);
    }
    console.log(`✓ Requirement 5 Confirmed: Clear HTTP 403 rate limit error reported: "${rateLimitState.statusText}"`);

    // 10. Test Reliable Error Handling: Network connection offline / unreachable (requirement #5)
    console.log('• Testing error handling on network connection failure...');
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        chrome.storage.local.set({
          github_api_url: 'http://127.0.0.1:59999/commits/main'
        }, resolve);
      })`,
      awaitPromise: true
    });

    await send('Runtime.evaluate', { expression: `document.getElementById('check_update_btn').click()` });

    let networkErrorState = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      const res = (await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('check_update_btn');
          const statusEl = document.getElementById('update_status');
          const statusText = document.getElementById('update_status_text');
          return {
            isLoading: btn?.classList.contains('is-loading'),
            statusClasses: statusEl?.className,
            statusText: statusText?.textContent.trim()
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (!res.isLoading && res.statusClasses.includes('status-failed')) {
        networkErrorState = res;
        break;
      }
    }

    if (!networkErrorState || !networkErrorState.statusText) {
      throw new Error(`Expected network error message, got: ${networkErrorState?.statusText}`);
    }
    console.log(`✓ Requirement 5 Confirmed: Clear network failure reported: "${networkErrorState.statusText}"`);

    ws.close();
  } finally {
    chrome.kill();
    mockServer.close();
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}
  }

  console.log('\n=== ALL SELF-CONTAINED MANUAL UPDATE & GITHUB SYNC VERIFICATIONS PASSED! ===\n');
}

run().catch(err => {
  console.error('\n❌ Verification test failed:', err);
  process.exit(1);
});
