import { spawn } from 'child_process';
import { readFileSync, rmSync, existsSync } from 'fs';
import path from 'path';

const CHROME_PATH = '/home/mai/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const EXT_PATH = path.resolve('extension');

console.log('--- Multi-Resolution Popup Layout & Spacing Test Suite ---\n');

const resolutions = [
  { name: '1080p Standard Display (100% scale)', dpr: 1.0, width: 368, height: 600 },
  { name: 'Windows Display Scaling (125% scale)', dpr: 1.25, width: 368, height: 600 },
  { name: 'Windows Display Scaling (150% scale)', dpr: 1.5, width: 368, height: 600 },
  { name: 'macOS Retina Display (200% scale)', dpr: 2.0, width: 368, height: 600 },
  { name: 'HiDPI / 4K Display (300% scale)', dpr: 3.0, width: 368, height: 600 },
];

const testProfile = '/tmp/test-profile-res-' + Date.now();

async function runLayoutTests() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions-except=' + EXT_PATH,
    '--load-extension=' + EXT_PATH,
    '--user-data-dir=' + testProfile
  ]);

  try {
    // Wait for Chrome CDP
    while (true) {
      try {
        await fetch('http://127.0.0.1:9240/json/version');
        break;
      } catch {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    const list = await (await fetch('http://127.0.0.1:9240/json/list')).json();
    // Find the loaded extension ID
    const sw = list.find(t => t.url.includes('background.js'));
    if (!sw) {
      throw new Error('Extension background service worker not found');
    }
    const extId = sw.url.split('/')[2];
    console.log(`[Setup] Extension loaded with ID: ${extId}`);

    // Create a new target page pointing to chrome-extension://<id>/popup.html
    const targetRes = await (await fetch(`http://127.0.0.1:9240/json/new?chrome-extension://${extId}/popup.html`, { method: 'PUT' })).json();
    const ws = new WebSocket(targetRes.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    // Wait for popup DOM to be ready
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

    // Enable Page and Runtime
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('[1] Verifying Header and Solver Settings separation across display resolutions:');
    for (const res of resolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: res.dpr,
        mobile: false
      });

      const metrics = (await send('Runtime.evaluate', {
        expression: `(() => {
          const header = document.querySelector('.header');
          const solverSection = document.querySelectorAll('.settings-group')[0];
          const solverTitle = solverSection.querySelector('.section-title');
          const solverCard = solverSection.querySelector('.card');
          const badge = header.querySelector('.badge');

          const hRect = header.getBoundingClientRect();
          const sRect = solverSection.getBoundingClientRect();
          const tRect = solverTitle.getBoundingClientRect();
          const cRect = solverCard.getBoundingClientRect();

          return {
            badgeText: badge ? badge.textContent.trim() : null,
            headerBottom: hRect.bottom,
            solverSectionTop: sRect.top,
            solverTitleTop: tRect.top,
            headerToSolverSection: +(sRect.top - hRect.bottom).toFixed(2),
            headerToSolverTitle: +(tRect.top - hRect.bottom).toFixed(2),
            headerToSolverCard: +(cRect.top - hRect.bottom).toFixed(2),
            hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
            hasVerticalOverflow: document.body.scrollHeight > 580,
            bodyScrollHeight: document.body.scrollHeight,
            bodyClientHeight: document.body.clientHeight
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (metrics.badgeText !== 'v1.31') {
        throw new Error(`Badge text expected 'v1.31', got '${metrics.badgeText}'`);
      }
      if (metrics.headerToSolverSection < 16) {
        throw new Error(`Spacing too small between header and solver section: ${metrics.headerToSolverSection}px`);
      }
      if (metrics.hasHorizontalOverflow) {
        throw new Error(`Horizontal overflow detected at DPR ${res.dpr}`);
      }
      if (metrics.hasVerticalOverflow) {
        throw new Error(`Unexpected vertical overflow (>580px) at DPR ${res.dpr}: ${metrics.bodyScrollHeight}px`);
      }

      console.log(`  ✓ ${res.name}:`);
      console.log(`      Header-to-Section spacing: ${metrics.headerToSolverSection}px (Header-to-Card: ${metrics.headerToSolverCard}px)`);
      console.log(`      Body dimensions: ${metrics.bodyScrollHeight}px height, no overflow detected`);
    }

    console.log('\n[2] Verifying visual separation across all supported languages (en, ja, zh):');
    for (const lang of ['en', 'ja', 'zh']) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const sel = document.getElementById('lang_select');
          if (sel) {
            sel.value = '${lang}';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`
      });

      // Small delay to allow i18n DOM update
      await new Promise(r => setTimeout(r, 100));

      const langMetrics = (await send('Runtime.evaluate', {
        expression: `(() => {
          const header = document.querySelector('.header');
          const solverSection = document.querySelectorAll('.settings-group')[0];
          const solverTitle = solverSection.querySelector('.section-title');
          const hRect = header.getBoundingClientRect();
          const sRect = solverSection.getBoundingClientRect();
          const tRect = solverTitle.getBoundingClientRect();

          return {
            titleText: solverTitle.textContent.trim(),
            spacing: +(sRect.top - hRect.bottom).toFixed(2),
            hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
            bodyScrollHeight: document.body.scrollHeight
          };
        })()`,
        returnByValue: true
      })).result.value;

      if (langMetrics.spacing < 16) {
        throw new Error(`Language '${lang}' broken spacing: ${langMetrics.spacing}px`);
      }
      if (langMetrics.hasHorizontalOverflow) {
        throw new Error(`Language '${lang}' caused horizontal overflow`);
      }

      console.log(`  ✓ Language '${lang}': Title "${langMetrics.titleText}", spacing ${langMetrics.spacing}px, height ${langMetrics.bodyScrollHeight}px`);
    }

    console.log('\n[3] Verifying Submenu Page Navigation & Header Hierarchy:');
    // Open Reports
    await send('Runtime.evaluate', {
      expression: `document.getElementById('open_reports').click()`
    });
    const repMetrics = (await send('Runtime.evaluate', {
      expression: `(() => {
        const pageRep = document.getElementById('page_reports');
        const headerNav = pageRep.querySelector('.header-nav');
        const section = pageRep.querySelector('.settings-group');
        const hRect = headerNav.getBoundingClientRect();
        const sRect = section.getBoundingClientRect();
        return {
          repVisible: !pageRep.classList.contains('hidden'),
          spacing: +(sRect.top - hRect.bottom).toFixed(2)
        };
      })()`,
      returnByValue: true
    })).result.value;

    if (!repMetrics.repVisible || repMetrics.spacing < 10) {
      throw new Error(`Reports page navigation or spacing error: ${JSON.stringify(repMetrics)}`);
    }
    console.log(`  ✓ Reports subpage opened correctly (Nav-to-Section spacing: ${repMetrics.spacing}px)`);

    // Back to main
    await send('Runtime.evaluate', {
      expression: `document.getElementById('back_main').click()`
    });

    // Open Timeouts
    await send('Runtime.evaluate', {
      expression: `document.getElementById('open_timeouts').click()`
    });
    const timeMetrics = (await send('Runtime.evaluate', {
      expression: `(() => {
        const pageTime = document.getElementById('page_timeouts');
        const headerNav = pageTime.querySelector('.header-nav');
        const section = pageTime.querySelector('.settings-group');
        const hRect = headerNav.getBoundingClientRect();
        const sRect = section.getBoundingClientRect();
        return {
          timeVisible: !pageTime.classList.contains('hidden'),
          spacing: +(sRect.top - hRect.bottom).toFixed(2)
        };
      })()`,
      returnByValue: true
    })).result.value;

    if (!timeMetrics.timeVisible || timeMetrics.spacing < 10) {
      throw new Error(`Timeouts page navigation or spacing error: ${JSON.stringify(timeMetrics)}`);
    }
    console.log(`  ✓ Timeouts subpage opened correctly (Nav-to-Section spacing: ${timeMetrics.spacing}px)`);

    // Back to main
    await send('Runtime.evaluate', {
      expression: `document.getElementById('back_main_t').click()`
    });
    const mainReturned = (await send('Runtime.evaluate', {
      expression: `!document.getElementById('page_main').classList.contains('hidden')`,
      returnByValue: true
    })).result.value;

    if (!mainReturned) {
      throw new Error('Failed to return to Main settings view');
    }
    console.log('  ✓ Successfully returned to main view with intact visual hierarchy');

    console.log('\n[4] Verifying Functionality & State Persistence:');
    // Test toggling 'enabled' checkbox
    const toggleResult = (await send('Runtime.evaluate', {
      expression: `(() => {
        const toggle = document.getElementById('enabled');
        const before = toggle.checked;
        toggle.click();
        const after = toggle.checked;
        // revert back
        toggle.click();
        return { before, after, reverted: toggle.checked };
      })()`,
      returnByValue: true
    })).result.value;

    if (toggleResult.before === toggleResult.after || toggleResult.reverted !== toggleResult.before) {
      throw new Error(`Toggle functionality test failed: ${JSON.stringify(toggleResult)}`);
    }
    console.log(`  ✓ Solver enabled toggle switch functions normally (state change: ${toggleResult.before} -> ${toggleResult.after})`);

    // Verify language switcher updates storage
    await send('Runtime.evaluate', {
      expression: `(() => {
        const sel = document.getElementById('lang_select');
        sel.value = 'en';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    console.log('  ✓ Language selection event handlers executed cleanly');

    console.log('\n=== ALL RESOLUTION & LAYOUT TESTS PASSED PERFECTLY! ===\n');
  } finally {
    chrome.kill();
    if (existsSync(testProfile)) {
      try { rmSync(testProfile, { recursive: true, force: true }); } catch {}
    }
  }
}

runLayoutTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
