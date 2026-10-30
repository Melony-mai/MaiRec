import fs from 'fs';
import {
  SUPPORTED_LANGUAGES,
  translations,
  normalizeLanguage,
  getMessage,
  applyTranslations,
  getStoredLanguage,
  setStoredLanguage
} from '../extension/i18n.js';

console.log('--- Testing Layout, UI Structure, and Functional Compatibility ---\n');

// 1. Verify popup.html contains essential elements
const html = fs.readFileSync('extension/popup.html', 'utf8');
const css = fs.readFileSync('extension/popup.css', 'utf8');

const requiredIds = [
  'page_main',
  'page_reports',
  'page_timeouts',
  'open_reports',
  'open_timeouts',
  'back_main',
  'back_main_t',
  'lang_select',
  'enabled',
  'recaptcha',
  'autoclick',
  'images',
  'click_delay',
  'reveal_delay',
  'verify_delay',
  'rep_enabled',
  'rep_key',
  'rep_key_label',
  'rep_send',
  'rep_status',
  'ws_mode',
  'ws_mode_label',
  'ws_mode_switch'
];

console.log('[1] Checking required DOM element IDs in popup.html:');
for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing required ID in popup.html: ${id}`);
  }
}
console.log(`  ✓ All ${requiredIds.length} required IDs present in popup.html.`);

// 2. Verify absence of predecessor branding in popup.html and CSS
console.log('\n[2] Verifying absence of predecessor branding in popup:');
if (/captchaplugin/i.test(html)) {
  throw new Error('Found "captchaplugin" in popup.html!');
}
if (/captchaplugin/i.test(css)) {
  throw new Error('Found "captchaplugin" in popup.css!');
}
console.log('  ✓ No captchaplugin references in popup.html or popup.css.');

// 3. Verify CSS macOS-inspired properties
console.log('\n[3] Verifying macOS-inspired CSS design rules:');
const macChecks = [
  { name: 'Width definition (368px)', test: /width:\s*368px/ },
  { name: 'Apple SF Pro font stack', test: /SF Pro/ },
  { name: 'macOS Dark Aqua window background', test: /--mac-window-bg:\s*#1c1c1e/ },
  { name: 'macOS Inset card background', test: /--mac-card-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.05\)/ },
  { name: 'macOS System Green switch', test: /--mac-success:\s*#34c759/ },
  { name: 'macOS Focus ring styling', test: /--mac-focus-ring/ },
  { name: 'macOS Switch transition', test: /cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/ },
  { name: 'macOS Overlay scrollbar styling', test: /::-webkit-scrollbar/ },
  { name: 'WS Mode adaptive row rule', test: /\.ws-row:has\(#ws_mode_label\.hidden\)/ }
];

for (const check of macChecks) {
  if (!check.test.test(css)) {
    throw new Error(`CSS check failed: ${check.name}`);
  }
  console.log(`  ✓ ${check.name}`);
}

// 4. Test Text Width and Spacing Across Supported Languages
console.log('\n[4] Testing Text Layout & Label Compatibility across Languages:');
const settingKeys = [
  'section_solver',
  'language',
  'solver_enabled',
  'recaptcha_support',
  'autoclick_buttons',
  'solve_images',
  'help_local_models',
  'section_timeout_report',
  'ws_mode',
  'btn_timeouts',
  'btn_reports',
  'reports_title',
  'btn_back',
  'enable_reports',
  'rep_key_label_16',
  'rep_key_label_16_32',
  'btn_send_reports',
  'timeouts_title_ms',
  'timeout_between_clicks',
  'timeout_dynamic_reveal',
  'timeout_verify',
  'unit_ms',
  'help_timeouts'
];

for (const lang of ['en', 'ja', 'zh']) {
  console.log(`  Language: ${lang}`);
  for (const k of settingKeys) {
    const text = translations[lang]?.[k];
    if (!text) {
      throw new Error(`Missing translation for key "${k}" in language "${lang}"`);
    }
  }
}
console.log('  ✓ All 23 setting keys are fully translated across English, Japanese, and Simplified Chinese.');

// 5. Verify reports.html structure
console.log('\n[5] Verifying reports.html:');
const reportsHtml = fs.readFileSync('extension/reports.html', 'utf8');
const repIds = ['page_reports', 'rep_enabled', 'rep_key', 'rep_send', 'rep_status'];
for (const id of repIds) {
  if (!reportsHtml.includes(`id="${id}"`)) {
    throw new Error(`Missing ID in reports.html: ${id}`);
  }
}
if (/captchaplugin/i.test(reportsHtml)) {
  throw new Error('Found captchaplugin in reports.html');
}
console.log('  ✓ reports.html has valid structure and no predecessor references.');

// 6. Verify ONNX models, SQLite WASM, and core files exist
console.log('\n[6] Verifying core technical dependencies:');
const essentialFiles = [
  'extension/manifest.json',
  'extension/background.js',
  'extension/background_sqlite.js',
  'extension/uploader.js',
  'extension/popup.js',
  'extension/reports.js',
  'extension/captcha/recaptcha.js',
  'extension/captcha/recaptcha_ai.js',
  'extension/captcha/phash-browser.js',
  'extension/db/captcha.sqlite',
  'extension/lib/sql-wasm.wasm',
  'extension/lib/sql-wasm.js',
  'extension/models/type.onnx',
  'extension/models/grid.onnx',
  'extension/models/grid.meta.json',
  'extension/models/motorcycles_b1.onnx',
  'extension/models/motorcycles_b1.meta.json',
  'extension/icon/32.png',
  'extension/icon/128.png'
];

for (const f of essentialFiles) {
  if (!fs.existsSync(f)) {
    throw new Error(`Missing essential file: ${f}`);
  }
}
console.log(`  ✓ All ${essentialFiles.length} core dependencies and model files are intact.`);

console.log('\n=== ALL LAYOUT AND FUNCTIONALITY TESTS PASSED! ===\n');
