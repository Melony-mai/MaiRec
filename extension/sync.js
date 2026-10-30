/**
 * MaiRec Extension Synchronization & Update Engine
 * Connects the popup settings interface with the local git repository
 * via the local sync bridge or direct GitHub API.
 */

import { getMessage } from './i18n.js';

export const DEFAULT_SYNC_SERVER_URL = 'http://127.0.0.1:38888';
export const DEFAULT_GITHUB_API_URL = 'https://api.github.com/repos/Melony-mai/MaiRec/commits/main';
export const SYNC_STATE_STORAGE_KEY = 'sync_state';
export const SYNC_SERVER_URL_STORAGE_KEY = 'sync_server_url';
export const GITHUB_TOKEN_STORAGE_KEY = 'github_token';
export const CURRENT_LOCAL_VERSION = 'v1.31';
export const CURRENT_LOCAL_COMMIT = 'f9f22c79';

/**
 * Retrieve saved synchronization state from storage
 */
export async function getStoredSyncState() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(SYNC_STATE_STORAGE_KEY);
      return data?.[SYNC_STATE_STORAGE_KEY] || null;
    }
  } catch {}
  return null;
}

/**
 * Persist synchronization state to storage
 */
export async function setStoredSyncState(state) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SYNC_STATE_STORAGE_KEY]: state });
    }
  } catch {}
  return state;
}

/**
 * Get active sync server URL (allows test/custom overrides)
 */
export async function getSyncServerUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(SYNC_SERVER_URL_STORAGE_KEY);
      if (data?.[SYNC_SERVER_URL_STORAGE_KEY]) {
        return data[SYNC_SERVER_URL_STORAGE_KEY];
      }
    }
  } catch {}
  return DEFAULT_SYNC_SERVER_URL;
}

/**
 * Retrieve saved GitHub Personal Access Token (if configured)
 */
export async function getStoredGithubToken() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get([GITHUB_TOKEN_STORAGE_KEY, 'sync_github_token']);
      return data?.[GITHUB_TOKEN_STORAGE_KEY] || data?.['sync_github_token'] || null;
    }
  } catch {}
  return null;
}

/**
 * Check whether updates are available in the GitHub repository
 */
export async function checkUpdates(options = {}) {
  const serverUrl = options.serverUrl || await getSyncServerUrl();
  const githubApiUrl = options.githubApiUrl || DEFAULT_GITHUB_API_URL;
  const timeoutMs = options.timeoutMs || 4000;

  // Step 1: Attempt to contact the local sync bridge server first
  let bridgeContacted = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 1500));

    const bridgeRes = await fetch(`${serverUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (bridgeRes.ok) {
      bridgeContacted = true;
      const data = await bridgeRes.json();
      const isAvailable = !!data.updateAvailable;
      const state = {
        status: isAvailable ? 'update_available' : 'up_to_date',
        source: 'local_git',
        relation: data.relation,
        localHead: data.localHead || '',
        remoteHead: data.remoteHead || '',
        updateAvailable: isAvailable,
        lastChecked: Date.now()
      };
      await setStoredSyncState(state);
      return state;
    }
  } catch (bridgeErr) {
    // Local bridge not running or timed out; fall through to GitHub API
  }

  // Step 2: If bridge is not active, check directly against GitHub API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MaiRec-Extension-UpdateChecker'
    };

    const token = options.token || options.githubToken || await getStoredGithubToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const ghRes = await fetch(githubApiUrl, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!ghRes.ok) {
      let detailMsg = `GitHub API returned HTTP ${ghRes.status}`;
      if (ghRes.status === 404) {
        detailMsg = 'GitHub API returned HTTP 404 (Repository or branch not found. Verify repository visibility or access permissions)';
      } else if (ghRes.status === 401) {
        detailMsg = 'GitHub API returned HTTP 401 (Unauthorized. Invalid or expired token)';
      } else if (ghRes.status === 403) {
        detailMsg = 'GitHub API returned HTTP 403 (Rate limit exceeded or access forbidden)';
      }
      throw new Error(detailMsg);
    }

    const data = await ghRes.json();
    const remoteSha = data.sha ? data.sha.slice(0, 8) : '';
    const stored = await getStoredSyncState();
    const localSha = stored?.localHead || CURRENT_LOCAL_COMMIT;

    const isAvailable = !!(remoteSha && localSha && remoteSha !== localSha);
    const commitMsg = data.commit?.message?.split('\n')[0] || '';

    const state = {
      status: isAvailable ? 'update_available' : 'up_to_date',
      source: 'github_api',
      localHead: localSha,
      remoteHead: remoteSha,
      updateAvailable: isAvailable,
      commitMessage: commitMsg,
      commitDate: data.commit?.committer?.date || '',
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const state = {
      status: 'failed',
      error: isTimeout ? 'Connection timed out' : (err.message || 'Network request failed'),
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  }
}

/**
 * Synchronize the local project with the latest repository code
 */
export async function synchronizeProject(options = {}) {
  const serverUrl = options.serverUrl || await getSyncServerUrl();
  const timeoutMs = options.timeoutMs || 60000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${serverUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);

    const data = await res.json();

    if (data.success) {
      const state = {
        status: 'up_to_date',
        source: 'local_git',
        relation: data.relation || 'UP_TO_DATE',
        currentCommit: data.currentCommit ? data.currentCommit.slice(0, 8) : '',
        localHead: data.currentCommit ? data.currentCommit.slice(0, 8) : '',
        remoteHead: data.currentCommit ? data.currentCommit.slice(0, 8) : '',
        updateAvailable: false,
        lastSynced: Date.now(),
        lastChecked: Date.now()
      };
      await setStoredSyncState(state);
      return state;
    } else if (data.code === 'MERGE_CONFLICT') {
      const state = {
        status: 'conflict',
        code: 'MERGE_CONFLICT',
        conflicts: data.conflicts || [],
        error: `Merge conflict in: ${(data.conflicts || []).join(', ')}`,
        lastChecked: Date.now()
      };
      await setStoredSyncState(state);
      return state;
    } else {
      const state = {
        status: 'failed',
        error: data.error || (data.code ? `Sync failed with code: ${data.code}` : 'Sync failed'),
        lastChecked: Date.now()
      };
      await setStoredSyncState(state);
      return state;
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    let errorDetail = err.message || 'Local sync bridge not running. Run npm run sync in terminal.';
    if (!isTimeout && (errorDetail.includes('Failed to fetch') || errorDetail.includes('ECONNREFUSED') || errorDetail.includes('NetworkError'))) {
      errorDetail = 'Local sync bridge not running. Run npm run sync or npm run sync:server in terminal.';
    }
    const state = {
      status: 'failed',
      error: isTimeout ? 'Sync operation timed out' : errorDetail,
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  }
}

/**
 * Format status message for display in UI
 */
export function formatStatusMessage(state, lang = 'en') {
  if (!state) return '';

  switch (state.status) {
    case 'checking':
      return getMessage('status_checking', lang);
    case 'syncing':
      return getMessage('status_syncing', lang);
    case 'up_to_date': {
      const versionStr = CURRENT_LOCAL_VERSION;
      return `${getMessage('status_up_to_date', lang)} (${versionStr})`;
    }
    case 'update_available': {
      if (state.commitMessage) {
        return `${getMessage('status_update_available', lang)}: ${state.commitMessage}`;
      }
      return getMessage('status_update_available', lang);
    }
    case 'conflict': {
      const files = (state.conflicts || []).join(', ');
      const prefix = getMessage('status_conflict', lang);
      return files ? `${prefix}: ${files}` : prefix;
    }
    case 'failed': {
      const prefix = getMessage('status_update_failed', lang);
      const detail = state.error || getMessage('status_network_error', lang);
      return `${prefix}: ${detail}`;
    }
    default:
      return '';
  }
}
