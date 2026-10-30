import { getMessage, applyTranslations, getStoredLanguage } from './i18n.js';
import { getStoredTheme, applyTheme, setStoredTheme, updateThemeButton, normalizeTheme, resolveEffectiveTheme, initSystemThemeListener } from './theme.js';

(async function(){
  const q = sel => document.querySelector(sel);
  let currentLang = 'en';
  let currentTheme = 'dark';

  try {
    currentTheme = await getStoredTheme();
    applyTheme(currentTheme);
  } catch {}

  try {
    currentLang = await getStoredLanguage();
    applyTranslations(currentLang);
  } catch {}

  const themeBtn = q('#theme_toggle_btn');
  updateThemeButton(themeBtn, currentTheme, currentLang);

  themeBtn?.addEventListener('click', async () => {
    const effective = resolveEffectiveTheme(currentTheme);
    currentTheme = effective === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    updateThemeButton(themeBtn, currentTheme, currentLang);
    await setStoredTheme(currentTheme);
  });

  initSystemThemeListener(() => {
    if (currentTheme === 'system') {
      applyTheme(currentTheme);
      updateThemeButton(themeBtn, currentTheme, currentLang);
    }
  });

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.theme) {
        currentTheme = normalizeTheme(changes.theme.newValue);
        applyTheme(currentTheme);
        updateThemeButton(themeBtn, currentTheme, currentLang);
      }
    });
  }

  function rpc(name, ...args){
    const token = Math.random().toString(36).slice(2);
    return new Promise(res => {
      chrome.runtime.sendMessage([token, name, ...args], reply => res(reply?.[1]));
    });
  }
  async function loadRep(){
    try {
      const data = await rpc('reports::getState');
      const cfg = data?.config || {};
      const st  = data?.state  || {};
      const repToggle = q('#rep_enabled');
      if (repToggle) {
        repToggle.checked = false;
        repToggle.disabled = true;
      }
      q('#rep_key').value = cfg.key || '';
      renderStatus(st);
    } catch(e){  }
  }
  function renderStatus(st){
    const el = q('#rep_status');
    if (!el) return;
    const s = [];
    if (st.last_success_ts) s.push(getMessage('status_last_sent', currentLang) + new Date(st.last_success_ts).toLocaleString(currentLang));
    if (st.last_error_ts)   s.push(getMessage('status_last_error', currentLang) + new Date(st.last_error_ts).toLocaleString(currentLang));
    if (st.last_error_reason) s.push(String(st.last_error_reason));
    el.textContent = s.join(' · ');
  }
  async function saveRep(){
    const key = (q('#rep_key')?.value || '').trim();
    const patch = {
      enabled: false,
      key: key
    };
    await rpc('reports::update', patch);
    chrome.runtime.sendMessage({ type: 'api_key_updated', apiKey: key.length === 32 ? key : null });
    await loadRep();
  }

  q('#rep_enabled')?.addEventListener('change', saveRep);
  q('#rep_key')?.addEventListener('input', saveRep);
  q('#rep_send')?.addEventListener('click', async () => {
    const status = q('#rep_status');
    if (status) status.textContent = getMessage('status_uploads_disabled', currentLang);
    const _res = await rpc('reports::sendNow');
    const data = await rpc('reports::getState');
    renderStatus(data?.state || {});
  });
  loadRep();
})();
