import {
  SUPPORTED_LANGUAGES,
  translations,
  normalizeLanguage,
  getMessage,
  applyTranslations,
  getStoredLanguage,
  setStoredLanguage
} from './i18n.js';

const $  = id  => document.getElementById(id);
const qq = sel => document.querySelector(sel);

let currentLang = 'en';
let lastReportsState = {};

function show(page){
  $('page_main').classList.toggle('hidden', page !== 'main');
  $('page_reports').classList.toggle('hidden', page !== 'reports');
  $('page_timeouts').classList.toggle('hidden', page !== 'timeouts');
}
$('open_reports').addEventListener('click', () => show('reports'));
$('open_timeouts').addEventListener('click', () => show('timeouts'));
$('back_main').addEventListener('click',  () => show('main'));
$('back_main_t').addEventListener('click', () => show('main'));

function updateRepKeyLabel() {
  const keyLabel = $('rep_key_label');
  if (!keyLabel) return;
  const isWs = !$('ws_mode_label')?.classList.contains('hidden');
  keyLabel.textContent = getMessage(isWs ? 'rep_key_label_16_32' : 'rep_key_label_16', currentLang);
}

async function changeLanguage(newLang) {
  currentLang = normalizeLanguage(newLang);
  const langSelect = $('lang_select');
  if (langSelect && langSelect.value !== currentLang) {
    langSelect.value = currentLang;
  }
  applyTranslations(currentLang);
  await setStoredLanguage(currentLang);
  save(readUI());
  renderStatus(lastReportsState);
  await loadWsMode();
  updateRepKeyLabel();
}

async function initI18n() {
  currentLang = await getStoredLanguage();
  const langSelect = $('lang_select');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', async (e) => {
      await changeLanguage(e.target.value);
    });
  }
  applyTranslations(currentLang);
}

initI18n();

const defaults = {
  enabled:true, recaptcha:true, autoclick:true, images:true,
  click_delay:300, reveal_delay:850, verify_delay:850,
  language:'en'
};

chrome.storage.local.get(['settings', 'language']).then(({ settings = {}, language }) => {
  const ui = { ...defaults };
  ui.enabled      = settings.enabled ?? defaults.enabled;
  ui.autoclick    = settings.recaptcha_auto_open  ?? defaults.autoclick;
  ui.images       = settings.recaptcha_auto_solve ?? defaults.images;
  ui.click_delay  = settings.recaptcha_delay_between_clicks ?? defaults.click_delay;
  ui.reveal_delay = settings.recaptcha_delay_dynamic_reveal ?? defaults.reveal_delay;
  ui.verify_delay = settings.recaptcha_delay_before_verify  ?? defaults.verify_delay;
  ui.recaptcha    = ui.autoclick || ui.images;

  $('enabled' ).checked = ui.enabled;
  $('recaptcha').checked = ui.recaptcha;
  $('autoclick').checked = ui.autoclick;
  $('images'   ).checked = ui.images;
  $('click_delay' ).value = ui.click_delay;
  $('reveal_delay').value = ui.reveal_delay;
  $('verify_delay').value = ui.verify_delay;

  const savedLang = language || settings.language;
  if (savedLang) {
    currentLang = normalizeLanguage(savedLang);
    const langSelect = $('lang_select');
    if (langSelect) langSelect.value = currentLang;
    applyTranslations(currentLang);
  }
});

['enabled','recaptcha','autoclick','images'].forEach(id => {
  $(id).addEventListener('change', () => save(readUI()));
});
['click_delay','reveal_delay','verify_delay'].forEach(id => {
  $(id).addEventListener('input', () => save(readUI()));
});

function readUI () {
  return {
    enabled:      $('enabled').checked,
    recaptcha:    $('recaptcha').checked,
    autoclick:    $('autoclick').checked,
    images:       $('images').checked,
    click_delay:  Math.max(0, Number($('click_delay').value)  || 0),
    reveal_delay: Math.max(0, Number($('reveal_delay').value) || 0),
    verify_delay: Math.max(0, Number($('verify_delay').value) || 0),
    language:     currentLang
  };
}
function save (ui) {
  const out = {
    enabled:                        ui.enabled,
    recaptcha_auto_open:            ui.recaptcha ? ui.autoclick : false,
    recaptcha_auto_solve:           ui.recaptcha ? ui.images    : false,
    recaptcha_delay_between_clicks: ui.click_delay,
    recaptcha_delay_dynamic_reveal: ui.reveal_delay,
    recaptcha_delay_before_verify:  ui.verify_delay,
    language:                       ui.language
  };
  // settings::update merges into stored settings in the background (do NOT
  // storage.local.set here — that would wipe keys not present in `out`).
  chrome.runtime.sendMessage([Math.random().toString(36).slice(2),'settings::update',out]);
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
    const repToggle = qq('#rep_enabled');
    if (repToggle) {
      repToggle.checked = false;
      repToggle.disabled = true;
    }
    qq('#rep_key').value = cfg.key || '';
    renderStatus(st);
  } catch(e){  }
}
function renderStatus(st){
  lastReportsState = st || {};
  const el = qq('#rep_status');
  if (!el) return;
  const s = [];
  if (st.last_success_ts) s.push(getMessage('status_last_sent', currentLang) + new Date(st.last_success_ts).toLocaleString(currentLang));
  if (st.last_error_ts)   s.push(getMessage('status_last_error', currentLang) + new Date(st.last_error_ts).toLocaleString(currentLang));
  if (st.last_error_reason) s.push(String(st.last_error_reason));
  el.textContent = s.join(' · ');
}
async function saveRep(){
  const key = (qq('#rep_key')?.value || '').trim();
  const patch = {
    enabled: false,
    key: key
  };
  await rpc('reports::update', patch);
  chrome.runtime.sendMessage({ type: 'api_key_updated', apiKey: key.length === 32 ? key : null });
  await loadRep();
  await loadWsMode(); // re-check WS mode availability after key change
}


qq('#rep_enabled')?.addEventListener('change', saveRep);
qq('#rep_key')?.addEventListener('input',  saveRep);
qq('#rep_send')?.addEventListener('click', async () => {
  const status = qq('#rep_status');
  if (status) status.textContent = getMessage('status_uploads_disabled', currentLang);
  await rpc('reports::sendNow');
  const data = await rpc('reports::getState');
  renderStatus(data?.state || {});
});


loadRep();


// ---- WS mode ----
function sendMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(resp);
    });
  });
}

async function loadWsMode() {
  try {
    const wsToggle = $('ws_mode');
    if (!wsToggle) return;
    const [enabledResp, storageData] = await Promise.all([
      sendMsg({ type: 'get_enabled' }),
      chrome.storage.local.get('reporting'),
    ]);
    const key   = (storageData?.reporting?.key || '').trim();
    const has32 = key.length === 32;
    wsToggle.disabled = !has32;
    wsToggle.checked  = has32 && enabledResp?.enabled === true;
    const label = $('ws_mode_label');
    if (label) label.title = has32 ? '' : getMessage('ws_mode_tooltip', currentLang);
  } catch {}
}

$('ws_mode')?.addEventListener('change', async () => {
  const wsToggle = $('ws_mode');
  if (!wsToggle || wsToggle.disabled) return;
  try {
    const resp = await sendMsg({ type: 'set_enabled', enabled: wsToggle.checked });
    if (resp && resp.type === 'ok') {
      wsToggle.checked = resp.enabled !== false;
    } else {
      await loadWsMode(); // revert on failure
    }
  } catch {
    await loadWsMode();
  }
});

async function isWsModeAvailable() {
  const resp = await sendMsg({ type: 'ws_available' });
  return resp?.available === true;
}

async function initWsMode() {
  if (await isWsModeAvailable()) {
    $('ws_mode_label').classList.remove('hidden');
    $('ws_mode_switch').classList.remove('hidden');
    updateRepKeyLabel();
  }
  await loadWsMode();
}

initWsMode();
