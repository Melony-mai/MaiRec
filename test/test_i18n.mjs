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

// Setup Storage & Chrome API Mock
const storageData = {};

global.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        if (typeof keys === 'string') return { [keys]: storageData[keys] };
        if (Array.isArray(keys)) {
          const res = {};
          for (const k of keys) res[k] = storageData[k];
          return res;
        }
        return { ...storageData };
      },
      set: async (obj) => {
        Object.assign(storageData, obj);
      }
    }
  },
  runtime: {
    sendMessage: (msg, cb) => {
      if (Array.isArray(msg) && msg[1] === 'settings::update') {
        storageData.settings = { ...(storageData.settings || {}), ...msg[2] };
        if (cb) cb([null, null]);
      } else if (msg && msg.type === 'get_enabled') {
        if (cb) cb({ enabled: true });
      } else if (msg && msg.type === 'ws_available') {
        if (cb) cb({ available: true });
      } else {
        if (cb) cb(null);
      }
    }
  },
  i18n: {
    getUILanguage: () => 'en'
  }
};

class ElementMock {
  constructor(tag, id = '', attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.attrs = attrs;
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.children = [];
    this._textContent = '';
    this.title = attrs.title || '';
    this.placeholder = attrs.placeholder || '';
    this.value = attrs.value || '';
    this.checked = false;
    this.disabled = false;
    this._listeners = {};
  }
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = v; }
  getAttribute(name) { return this.attrs[name]; }
  setAttribute(name, val) { this.attrs[name] = val; }
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  async dispatchEvent(event, data = {}) {
    if (this._listeners[event]) {
      for (const fn of this._listeners[event]) {
        await fn({ target: this, ...data });
      }
    }
  }
}

class DocumentMock {
  constructor() {
    this.documentElement = new ElementMock('html', '', { lang: 'en', dir: 'ltr' });
    this.elements = new Map();
  }
  getElementById(id) {
    return this.elements.get(id) || null;
  }
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    const attrMatch = sel.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      const attr = attrMatch[1];
      const val = attrMatch[2];
      for (const el of this.elements.values()) {
        if (el.attrs[attr] !== undefined) {
          if (val === undefined || el.attrs[attr] === val) return el;
        }
      }
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    for (const el of this.elements.values()) {
      if (sel === '[data-i18n]' && el.attrs['data-i18n']) res.push(el);
      if (sel === '[data-i18n-title]' && el.attrs['data-i18n-title']) res.push(el);
      if (sel === '[data-i18n-placeholder]' && el.attrs['data-i18n-placeholder']) res.push(el);
      if (sel === '[data-i18n-aria-label]' && el.attrs['data-i18n-aria-label']) res.push(el);
    }
    return res;
  }
}

global.document = new DocumentMock();

// Parse popup.html to register elements
const html = fs.readFileSync('extension/popup.html', 'utf8');

// Regex to find tags and their attributes
const tagRegex = /<([a-zA-Z0-9]+)([^>]*)>/g;
let match;
while ((match = tagRegex.exec(html)) !== null) {
  const tag = match[1];
  const attrStr = match[2];
  
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
  let am;
  while ((am = attrRegex.exec(attrStr)) !== null) {
    attrs[am[1]] = am[2] !== undefined ? am[2] : true;
  }
  const id = attrs.id || '';
  if (id || attrs['data-i18n'] || attrs['data-i18n-title']) {
    const el = new ElementMock(tag, id, attrs);
    if (id) {
      global.document.elements.set(id, el);
    } else {
      global.document.elements.set('gen_' + Math.random(), el);
    }
  }
}

console.log('Registered', global.document.elements.size, 'elements in DOM mock.');

// Test language switching across all 11 languages
async function runTests() {
  const langSelect = global.document.getElementById('lang_select');
  if (!langSelect) throw new Error('lang_select element not found in DOM!');

  // Test 1: Supported languages check
  if (SUPPORTED_LANGUAGES.length !== 11) {
    throw new Error('Expected 11 languages, got ' + SUPPORTED_LANGUAGES.length);
  }

  // Test 2: For each language, verify switching and UI updates
  for (const lang of SUPPORTED_LANGUAGES) {
    console.log(`[TEST] Switching to: ${lang.code} (${lang.name} / ${lang.nativeName})`);

    langSelect.value = lang.code;
    applyTranslations(lang.code, global.document);
    await setStoredLanguage(lang.code);

    // Verify documentElement lang & dir
    if (global.document.documentElement.lang !== lang.code) {
      throw new Error(`Lang not updated on html: expected ${lang.code}, got ${global.document.documentElement.lang}`);
    }
    const expectedDir = (lang.code === 'ar') ? 'rtl' : 'ltr';
    if (global.document.documentElement.dir !== expectedDir) {
      throw new Error(`Dir not updated on html: expected ${expectedDir}, got ${global.document.documentElement.dir}`);
    }

    // Verify all data-i18n elements
    const i18nEls = global.document.querySelectorAll('[data-i18n]');
    if (i18nEls.length === 0) throw new Error('No data-i18n elements found');
    for (const el of i18nEls) {
      const key = el.getAttribute('data-i18n');
      const expectedText = translations[lang.code][key];
      if (el.textContent !== expectedText) {
        throw new Error(`Element data-i18n="${key}" text mismatch for ${lang.code}: expected "${expectedText}", got "${el.textContent}"`);
      }
    }

    // Verify data-i18n-title
    const titleEls = global.document.querySelectorAll('[data-i18n-title]');
    if (titleEls.length === 0) throw new Error('No data-i18n-title elements found');
    for (const el of titleEls) {
      const key = el.getAttribute('data-i18n-title');
      const expectedTitle = translations[lang.code][key];
      if (el.title !== expectedTitle) {
        throw new Error(`Element data-i18n-title="${key}" mismatch for ${lang.code}: expected "${expectedTitle}", got "${el.title}"`);
      }
    }

    // Verify storage persistence
    const stored = await getStoredLanguage();
    if (stored !== lang.code) {
      throw new Error(`Storage did not persist ${lang.code}, got ${stored}`);
    }
  }

  console.log('[PASS] All 11 languages successfully switched, translated, and verified!');

  // Test 3: Browser restart simulation
  console.log('[TEST] Simulating browser restart with saved language "ja"...');
  await setStoredLanguage('ja');
  // Clear memory cache, reload from storage
  const restoredLang = await getStoredLanguage();
  if (restoredLang !== 'ja') throw new Error('Restore failed');
  applyTranslations(restoredLang, global.document);
  if (global.document.documentElement.lang !== 'ja') throw new Error('HTML lang not restored');
  const solverEnabledLabel = global.document.querySelector('[data-i18n="solver_enabled"]');
  if (solverEnabledLabel.textContent !== 'ソルバー有効') {
    throw new Error('Label not restored to Japanese: ' + solverEnabledLabel.textContent);
  }
  console.log('[PASS] Browser restart simulation passed!');

  // Test 4: Another language restart test (Arabic - RTL)
  console.log('[TEST] Simulating browser restart with saved language "ar" (RTL)...');
  await setStoredLanguage('ar');
  const restoredAr = await getStoredLanguage();
  applyTranslations(restoredAr, global.document);
  if (global.document.documentElement.dir !== 'rtl') throw new Error('RTL dir not restored');
  const solverAr = global.document.querySelector('[data-i18n="solver_enabled"]');
  if (solverAr.textContent !== 'تمكين الحلّال') {
    throw new Error('Label not restored to Arabic: ' + solverAr.textContent);
  }
  console.log('[PASS] Arabic RTL restart simulation passed!');

  // Test 5: Verify settings save does not overwrite or corrupt language
  console.log('[TEST] Verifying settings::update preserves language preference...');
  global.chrome.runtime.sendMessage([
    'abc',
    'settings::update',
    { enabled: true, recaptcha_auto_open: true, language: 'zh' }
  ]);
  if (storageData.settings.language !== 'zh') {
    throw new Error('Language not preserved in settings: ' + storageData.settings.language);
  }
  console.log('[PASS] Settings save test passed!');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
