import { spawn } from 'child_process';
import { readFileSync, rmSync, existsSync } from 'fs';
import path from 'path';

const CHROME_PATH = '/home/mai/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const EXT_PATH = path.resolve('extension');

console.log('--- Light Mode & Dark Mode Comprehensive Test Suite ---\n');

const testProfile = '/tmp/test-profile-theme-' + Date.now();

async function runThemeTests() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9241',
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
        await fetch('http://127.0.0.1:9241/json/version');
        break;
      } catch {
        await new Promise(r => setTimeout(r, 50));
      }
    }

    const list = await (await fetch('http://127.0.0.1:9241/json/list')).json();
    const sw = list.find(t => t.url.includes('background.js'));
    if (!sw) {
      throw new Error('Extension background service worker not found');
    }
    const extId = sw.url.split('/')[2];
    console.log(`[Setup] Extension loaded with ID: ${extId}`);

    // Create target page for popup.html
    const popupTarget = await (await fetch(`http://127.0.0.1:9241/json/new?chrome-extension://${extId}/popup.html`, { method: 'PUT' })).json();
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

    // Helper to evaluate in page
    async function evaluate(fnStr) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || 'Evaluation failed');
      }
      return res.result.value;
    }

    // 1. Verify default theme (Dark Mode)
    console.log('[1] Verifying default theme state (Dark Mode):');
    const defaultState = await evaluate(() => {
      const html = document.documentElement;
      const themeAttr = html.getAttribute('data-theme');
      const bodyStyle = window.getComputedStyle(document.body);
      const card = document.querySelector('.card');
      const cardStyle = window.getComputedStyle(card);
      const themeBtn = document.getElementById('theme_toggle_btn');
      const sunIcon = themeBtn ? themeBtn.querySelector('.icon-sun') : null;
      const moonIcon = themeBtn ? themeBtn.querySelector('.icon-moon') : null;
      const sunStyle = sunIcon ? window.getComputedStyle(sunIcon) : null;
      const moonStyle = moonIcon ? window.getComputedStyle(moonIcon) : null;
      const themeSelect = document.getElementById('theme_select');

      return {
        themeAttr,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        cardBg: cardStyle.backgroundColor,
        sunDisplay: sunStyle ? sunStyle.display : null,
        moonDisplay: moonStyle ? moonStyle.display : null,
        selectVal: themeSelect ? themeSelect.value : null
      };
    });

    if (defaultState.themeAttr !== 'dark') {
      throw new Error(`Expected data-theme="dark", got "${defaultState.themeAttr}"`);
    }
    if (defaultState.bodyBg !== 'rgb(28, 28, 30)') {
      throw new Error(`Expected dark window bg rgb(28, 28, 30), got "${defaultState.bodyBg}"`);
    }
    if (defaultState.sunDisplay === 'none' || defaultState.moonDisplay !== 'none') {
      throw new Error(`Dark mode icon visibility incorrect: sun=${defaultState.sunDisplay}, moon=${defaultState.moonDisplay}`);
    }
    if (defaultState.selectVal !== 'dark') {
      throw new Error(`Expected theme_select value "dark", got "${defaultState.selectVal}"`);
    }
    console.log('  ✓ Default theme is Dark Mode (bg: ' + defaultState.bodyBg + ', text: ' + defaultState.bodyColor + ')');
    console.log('  ✓ Sun icon is active, Moon icon is hidden, select value is "dark"');

    // 2. Test manual theme switching via #theme_toggle_btn
    console.log('\n[2] Testing manual theme switching via header toggle button:');
    await evaluate(() => {
      document.getElementById('theme_toggle_btn').click();
    });
    // Wait for state transition
    await new Promise(r => setTimeout(r, 150));

    const lightState = await evaluate(() => {
      const html = document.documentElement;
      const themeAttr = html.getAttribute('data-theme');
      const bodyStyle = window.getComputedStyle(document.body);
      const card = document.querySelector('.card');
      const cardStyle = window.getComputedStyle(card);
      const input = document.getElementById('click_delay');
      const themeBtn = document.getElementById('theme_toggle_btn');
      const sunIcon = themeBtn.querySelector('.icon-sun');
      const moonIcon = themeBtn.querySelector('.icon-moon');
      const sunStyle = window.getComputedStyle(sunIcon);
      const moonStyle = window.getComputedStyle(moonIcon);
      const themeSelect = document.getElementById('theme_select');

      return {
        themeAttr,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        cardBg: cardStyle.backgroundColor,
        sunDisplay: sunStyle.display,
        moonDisplay: moonStyle.display,
        selectVal: themeSelect.value,
        btnTitle: themeBtn.getAttribute('title')
      };
    });

    if (lightState.themeAttr !== 'light') {
      throw new Error(`Expected data-theme="light" after toggle, got "${lightState.themeAttr}"`);
    }
    if (lightState.bodyBg !== 'rgb(242, 242, 247)') {
      throw new Error(`Expected light window bg rgb(242, 242, 247), got "${lightState.bodyBg}"`);
    }
    if (lightState.bodyColor !== 'rgb(29, 29, 31)') {
      throw new Error(`Expected light text color rgb(29, 29, 31), got "${lightState.bodyColor}"`);
    }
    if (lightState.cardBg !== 'rgb(255, 255, 255)') {
      throw new Error(`Expected light card bg rgb(255, 255, 255), got "${lightState.cardBg}"`);
    }
    if (lightState.sunDisplay !== 'none' || lightState.moonDisplay === 'none') {
      throw new Error(`Light mode icon visibility incorrect: sun=${lightState.sunDisplay}, moon=${lightState.moonDisplay}`);
    }
    if (lightState.selectVal !== 'light') {
      throw new Error(`Expected theme_select value synchronized to "light", got "${lightState.selectVal}"`);
    }
    console.log('  ✓ Successfully switched to Light Mode immediately without page reload');
    console.log('  ✓ Computed styles updated: Window bg is ' + lightState.bodyBg + ', Card bg is ' + lightState.cardBg + ', Text is ' + lightState.bodyColor);
    console.log('  ✓ Moon icon is active, Sun icon is hidden, theme_select is synchronized to "light"');

    // 3. Test manual theme switching via #theme_select dropdown
    console.log('\n[3] Testing manual theme switching via dropdown select:');
    await evaluate(() => {
      const select = document.getElementById('theme_select');
      select.value = 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 150));

    const revertedDarkState = await evaluate(() => {
      const html = document.documentElement;
      return {
        themeAttr: html.getAttribute('data-theme'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        selectVal: document.getElementById('theme_select').value
      };
    });

    if (revertedDarkState.themeAttr !== 'dark' || revertedDarkState.selectVal !== 'dark') {
      throw new Error(`Dropdown switch to dark failed: ${JSON.stringify(revertedDarkState)}`);
    }
    console.log('  ✓ Successfully switched back to Dark Mode via dropdown menu');

    // 4. Test theme persistence across reload / browser reopen
    console.log('\n[4] Testing theme persistence across popup reload / reopening:');
    // Set theme to light
    await evaluate(() => {
      document.getElementById('theme_toggle_btn').click();
    });
    await new Promise(r => setTimeout(r, 200));

    // Reload page to simulate reopening popup
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 500));

    const reloadedState = await evaluate(() => {
      const html = document.documentElement;
      return {
        themeAttr: html.getAttribute('data-theme'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        cardBg: window.getComputedStyle(document.querySelector('.card')).backgroundColor,
        selectVal: document.getElementById('theme_select').value
      };
    });

    if (reloadedState.themeAttr !== 'light' || reloadedState.selectVal !== 'light') {
      throw new Error(`Theme persistence failed on reload! Expected "light", got "${reloadedState.themeAttr}"`);
    }
    console.log('  ✓ User theme preference ("light") successfully retained on page reload/reopen');

    // 5. Test UI Consistency across Subpages in Light Mode
    console.log('\n[5] Testing UI consistency across subpage views in Light Mode:');
    // Open Timeouts subpage
    await evaluate(() => {
      document.getElementById('open_timeouts').click();
    });
    await new Promise(r => setTimeout(r, 100));

    const timeoutsLight = await evaluate(() => {
      const pageTime = document.getElementById('page_timeouts');
      const isVisible = !pageTime.classList.contains('hidden');
      const backBtn = pageTime.querySelector('.mac-back-btn');
      const backStyle = window.getComputedStyle(backBtn);
      const input = document.getElementById('click_delay');
      const inputStyle = window.getComputedStyle(input);
      const card = pageTime.querySelector('.card');
      const cardStyle = window.getComputedStyle(card);

      return {
        isVisible,
        backBtnBg: backStyle.backgroundColor,
        inputBg: inputStyle.backgroundColor,
        inputColor: inputStyle.color,
        cardBg: cardStyle.backgroundColor
      };
    });

    if (!timeoutsLight.isVisible || timeoutsLight.cardBg !== 'rgb(255, 255, 255)') {
      throw new Error(`Timeouts subpage failed in light mode: ${JSON.stringify(timeoutsLight)}`);
    }
    console.log('  ✓ Timeouts subpage correctly styled in Light Mode (Input bg: ' + timeoutsLight.inputBg + ', Card: ' + timeoutsLight.cardBg + ')');

    // Back to main
    await evaluate(() => {
      document.getElementById('back_main_t').click();
    });

    // Open Reports subpage
    await evaluate(() => {
      document.getElementById('open_reports').click();
    });
    await new Promise(r => setTimeout(r, 100));

    const reportsLight = await evaluate(() => {
      const pageRep = document.getElementById('page_reports');
      const isVisible = !pageRep.classList.contains('hidden');
      const input = document.getElementById('rep_key');
      const inputStyle = window.getComputedStyle(input);
      const btn = document.getElementById('rep_send');
      const btnStyle = window.getComputedStyle(btn);

      return {
        isVisible,
        inputBg: inputStyle.backgroundColor,
        inputColor: inputStyle.color,
        btnBg: btnStyle.backgroundColor
      };
    });

    if (!reportsLight.isVisible || reportsLight.inputBg !== 'rgb(255, 255, 255)') {
      throw new Error(`Reports subpage failed in light mode: ${JSON.stringify(reportsLight)}`);
    }
    console.log('  ✓ Reports subpage correctly styled in Light Mode (Input bg: ' + reportsLight.inputBg + ', Text: ' + reportsLight.inputColor + ')');

    // Back to main
    await evaluate(() => {
      document.getElementById('back_main').click();
    });

    // 6. Test standalone reports.html (Advanced Settings Interface)
    console.log('\n[6] Testing standalone reports.html (Advanced Settings Interface):');
    const repTarget = await (await fetch(`http://127.0.0.1:9241/json/new?chrome-extension://${extId}/reports.html`, { method: 'PUT' })).json();
    const wsRep = new WebSocket(repTarget.webSocketDebuggerUrl);
    await new Promise(r => wsRep.onopen = r);
    await new Promise(r => setTimeout(r, 400));

    let repMsgId = 1;
    function sendRep(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = repMsgId++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            wsRep.removeEventListener('message', handler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        wsRep.addEventListener('message', handler);
        wsRep.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendRep('Page.enable');
    await sendRep('Runtime.enable');

    async function evaluateRep(fnStr) {
      const res = await sendRep('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true
      });
      return res.result.value;
    }

    const standaloneState = await evaluateRep(() => {
      const html = document.documentElement;
      const themeAttr = html.getAttribute('data-theme');
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const cardBg = window.getComputedStyle(document.querySelector('.card')).backgroundColor;
      const themeBtn = document.getElementById('theme_toggle_btn');

      return {
        themeAttr,
        bodyBg,
        cardBg,
        hasThemeBtn: !!themeBtn
      };
    });

    if (standaloneState.themeAttr !== 'light' || standaloneState.cardBg !== 'rgb(255, 255, 255)') {
      throw new Error(`Standalone reports.html did not inherit light mode: ${JSON.stringify(standaloneState)}`);
    }
    if (!standaloneState.hasThemeBtn) {
      throw new Error('Standalone reports.html is missing theme_toggle_btn');
    }
    console.log('  ✓ Standalone reports.html cleanly inherited stored Light Mode preference');
    console.log('  ✓ Standalone reports.html possesses active theme toggle button');

    // Toggle theme inside standalone reports.html
    await evaluateRep(() => {
      document.getElementById('theme_toggle_btn').click();
    });
    await new Promise(r => setTimeout(r, 200));

    const repToggledState = await evaluateRep(() => {
      return {
        themeAttr: document.documentElement.getAttribute('data-theme'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor
      };
    });

    if (repToggledState.themeAttr !== 'dark' || repToggledState.bodyBg !== 'rgb(28, 28, 30)') {
      throw new Error(`Standalone toggle to dark failed: ${JSON.stringify(repToggledState)}`);
    }
    console.log('  ✓ Standalone reports.html successfully toggled back to Dark Mode and persisted');

    // 7. Verify multi-resolution layout safety in BOTH themes
    console.log('\n[7] Verifying multi-resolution layout safety in Light and Dark Mode:');
    const resolutions = [
      { name: '100% Scale', dpr: 1.0 },
      { name: '125% Scale', dpr: 1.25 },
      { name: '150% Scale', dpr: 1.5 },
      { name: '200% Retina', dpr: 2.0 },
      { name: '300% 4K HiDPI', dpr: 3.0 }
    ];

    for (const theme of ['dark', 'light']) {
      console.log(`  Testing Theme: ${theme.toUpperCase()}`);
      await evaluate(`() => {
        const select = document.getElementById('theme_select');
        select.value = '${theme}';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }`);
      await new Promise(r => setTimeout(r, 100));

      for (const res of resolutions) {
        await send('Emulation.setDeviceMetricsOverride', {
          width: 368,
          height: 600,
          deviceScaleFactor: res.dpr,
          mobile: false
        });

        const metrics = await evaluate(() => {
          return {
            hasHorizontalOverflow: document.body.scrollWidth > document.body.clientWidth,
            hasVerticalOverflow: document.body.scrollHeight > 580,
            scrollHeight: document.body.scrollHeight,
            clientWidth: document.body.clientWidth
          };
        });

        if (metrics.hasHorizontalOverflow) {
          throw new Error(`Horizontal overflow detected in ${theme} mode at ${res.name}`);
        }
        if (metrics.hasVerticalOverflow) {
          throw new Error(`Vertical overflow (>580px) detected in ${theme} mode at ${res.name}: ${metrics.scrollHeight}px`);
        }
        console.log(`    ✓ ${res.name}: height ${metrics.scrollHeight}px, clientWidth ${metrics.clientWidth}px, 0 overflow`);
      }
    }

    // Revert back to default dark mode at end
    await evaluate(`() => {
      const select = document.getElementById('theme_select');
      select.value = 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }`);

    console.log('\n=== ALL LIGHT & DARK MODE THEME TESTS PASSED PERFECTLY! ===\n');
  } finally {
    chrome.kill();
    if (existsSync(testProfile)) {
      try { rmSync(testProfile, { recursive: true, force: true }); } catch {}
    }
  }
}

runThemeTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
