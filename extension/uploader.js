// uploader.js — Data collection and background uploads are permanently disabled for user privacy.
(() => {
  const CAP_DB_NAME = 'caplog';

  // Purge any lingering caplog database
  try { indexedDB.deleteDatabase(CAP_DB_NAME); } catch (e) {}

  // Clear any existing alarms created previously
  try {
    chrome.alarms?.clear('reporting:tick');
    chrome.alarms?.clear('reporting:periodic');
  } catch (e) {}

  const DEFAULT_REPORTING = {
    enabled: false,
    key: '',
    client_id: '',
    schedule_minutes: 60,
    backoff_min_minutes: 1,
    backoff_max_minutes: 360,
    part_max_bytes: 5 * 1024 * 1024,
    multipart_max_bytes: 5 * 1024 * 1024,
    max_parts_per_batch: 3,
    _next_try_ts: 0,
    _backoff_minutes: 0
  };

  const DEFAULT_STATE = {
    uploading: false,
    disabled: true,
    last_success_ts: 0,
    last_error_ts: 0,
    last_error_reason: 'Data uploads are permanently disabled',
    last_batch_info: null
  };

  async function getReporting() {
    const { reporting = {} } = await chrome.storage.local.get('reporting');
    return { ...DEFAULT_REPORTING, ...reporting, enabled: false };
  }

  async function setReporting(patch) {
    // Preserve key for WS mode, but enforce enabled = false
    const current = await getReporting();
    const reporting = { ...current, ...(patch || {}), enabled: false };
    await chrome.storage.local.set({ reporting });
    return reporting;
  }

  async function getState() {
    return { ...DEFAULT_STATE };
  }

  async function setState(patch) {
    return { ...DEFAULT_STATE, ...(patch || {}) };
  }

  async function startUpload(trigger = 'manual') {
    // Uploads are permanently disabled; no network requests are made.
    return { ok: false, skipped: true, reason: 'Data uploads are permanently disabled' };
  }

  function exposeRPC() {
    try {
      if (!self.ue) self.ue = {};
      self.ue['reports::getState'] = async () => ({
        config: await getReporting(),
        state: await getState()
      });

      self.ue['reports::update'] = async ([patch]) => {
        const cfg = await setReporting(patch || {});
        // Ensure no alarms are ever scheduled
        try {
          chrome.alarms?.clear('reporting:tick');
          chrome.alarms?.clear('reporting:periodic');
        } catch (e) {}
        return cfg;
      };

      self.ue['reports::sendNow'] = async () => {
        return { ok: false, skipped: true, reason: 'Data uploads are permanently disabled' };
      };
    } catch (e) {
      console.error('[uploader] exposeRPC failed', e);
    }
  }

  exposeRPC();

  self.__reports__ = { startUpload, getReporting, setReporting };
})();
