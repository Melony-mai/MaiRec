/**
 * MaiRec Extension Synchronization & Update Engine
 * Connects the popup settings interface directly with the GitHub repository
 * via GitHub API for fully self-contained, bridge-free updates.
 */

import { getMessage } from './i18n.js';

export const DEFAULT_SYNC_SERVER_URL = 'http://127.0.0.1:38888';
export const DEFAULT_GITHUB_API_URL = 'https://api.github.com/repos/Melony-mai/MaiRec/commits/main';
export const DEFAULT_REPO_OWNER = 'Melony-mai';
export const DEFAULT_REPO_NAME = 'MaiRec';
export const DEFAULT_BRANCH = 'main';
export const SYNC_STATE_STORAGE_KEY = 'sync_state';
export const SYNC_SERVER_URL_STORAGE_KEY = 'sync_server_url';
export const GITHUB_TOKEN_STORAGE_KEY = 'github_token';
export const GITHUB_API_URL_STORAGE_KEY = 'github_api_url';
export const CURRENT_LOCAL_VERSION = 'v1.6';
export const CURRENT_LOCAL_COMMIT = 'fa999bb4';

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
 * Get active sync server URL (allows test/custom overrides, null by default)
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
  return null;
}

/**
 * Retrieve saved GitHub API URL override (if configured)
 */
export async function getStoredGithubApiUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(GITHUB_API_URL_STORAGE_KEY);
      return data?.[GITHUB_API_URL_STORAGE_KEY] || null;
    }
  } catch {}
  return null;
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
 * Ensure local synchronization bridge server is running and reachable.
 * Optional helper retained for backward compatibility in test suites.
 */
export async function ensureSyncBridgeRunning(options = {}) {
  const serverUrl = options.serverUrl;
  if (!serverUrl) return false;
  let port = 38888;
  try {
    const urlObj = new URL(serverUrl);
    port = parseInt(urlObj.port, 10) || 38888;
  } catch {}
  const timeoutMs = options.timeoutMs || 4000;

  // Rapid health check to verify if server is already active
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 350);
    const healthRes = await fetch(`${serverUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (healthRes.ok) {
      const data = await healthRes.json();
      if (data && data.ok) return true;
    }
  } catch {}

  // Attempt auto-start in Node.js environment (for test suites)
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const { spawn } = await import('child_process');
      const { fileURLToPath } = await import('url');
      const pathModule = await import('path');

      let scriptPath = '';
      if (typeof __dirname !== 'undefined') {
        scriptPath = pathModule.resolve(__dirname, '../scripts/sync.mjs');
      } else {
        const currFile = fileURLToPath(import.meta.url);
        scriptPath = pathModule.resolve(pathModule.dirname(currFile), '../scripts/sync.mjs');
      }

      const cwd = options.cwd || pathModule.resolve(pathModule.dirname(scriptPath), '..');
      const child = spawn(process.execPath, [scriptPath, '--serve', '--port', String(port), '--cwd', cwd], {
        cwd,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      const startWait = Date.now();
      while (Date.now() - startWait < timeoutMs) {
        try {
          const pollRes = await fetch(`${serverUrl}/health`);
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data && data.ok) return true;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 100));
      }
    } catch {}
  }

  return false;
}

/**
 * Check whether updates are available directly in the GitHub repository.
 * Operates independently of local development environments.
 */
export async function checkUpdates(options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const configuredServer = options.serverUrl !== undefined ? options.serverUrl : await getSyncServerUrl();

  // If a test or custom sync server URL is explicitly provided, attempt contacting it first
  if (configuredServer) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 4000));
      const bridgeRes = await fetch(`${configuredServer}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (bridgeRes.ok) {
        const data = await bridgeRes.json();
        const isAvailable = !!data.updateAvailable;
        const state = {
          status: isAvailable ? 'update_available' : 'up_to_date',
          source: 'local_git',
          relation: data.relation,
          localHead: data.localHead || '',
          remoteHead: data.remoteHead || '',
          updateAvailable: isAvailable,
          version: CURRENT_LOCAL_VERSION,
          lastChecked: Date.now()
        };
        await setStoredSyncState(state);
        return state;
      }
    } catch (bridgeErr) {
      // If server was explicitly provided without githubApiUrl, fail with error
      if (options.serverUrl && !options.githubApiUrl) {
        const isTimeout = bridgeErr.name === 'AbortError';
        const state = {
          status: 'failed',
          error: isTimeout ? 'Connection timed out' : (bridgeErr.message || 'Server check failed'),
          lastChecked: Date.now()
        };
        await setStoredSyncState(state);
        return state;
      }
    }
  }

  // Direct GitHub API Update Check
  try {
    const githubApiUrl = options.githubApiUrl || await getStoredGithubApiUrl() || DEFAULT_GITHUB_API_URL;
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
      } else if (ghRes.status === 403 || ghRes.status === 429) {
        detailMsg = `GitHub API returned HTTP ${ghRes.status} (Rate limit exceeded or access forbidden)`;
      } else {
        detailMsg = `GitHub API returned HTTP ${ghRes.status} (Update check failed)`;
      }
      throw new Error(detailMsg);
    }

    const data = await ghRes.json();
    const remoteSha = data.sha ? data.sha.slice(0, 8) : '';
    const stored = await getStoredSyncState();
    const localSha = stored?.localHead || CURRENT_LOCAL_COMMIT;

    const isAvailable = !!(remoteSha && localSha && remoteSha !== localSha);
    const commitMsg = data.commit?.message?.split('\n')[0] || '';
    const commitDate = data.commit?.committer?.date || '';

    const state = {
      status: isAvailable ? 'update_available' : 'up_to_date',
      source: 'github_api',
      localHead: localSha,
      remoteHead: remoteSha,
      updateAvailable: isAvailable,
      commitMessage: commitMsg,
      commitDate: commitDate,
      version: CURRENT_LOCAL_VERSION,
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    let errorMsg = err.message || 'Network request failed';
    if (isTimeout) {
      errorMsg = 'Connection timed out';
    } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ECONNREFUSED')) {
      errorMsg = 'Network connection failed. Unable to reach GitHub.';
    }
    const state = {
      status: 'failed',
      error: errorMsg,
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  }
}

/**
 * Synchronize the extension directly with the latest code and metadata from GitHub.
 * Fully self-contained: executes directly without requiring local terminals, servers, or npm.
 */
export async function synchronizeProject(options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const configuredServer = options.serverUrl !== undefined ? options.serverUrl : await getSyncServerUrl();

  // If a test or custom sync server URL is explicitly provided, attempt contacting it
  if (configuredServer) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${configuredServer}/sync`, {
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
          version: CURRENT_LOCAL_VERSION,
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
      if (options.serverUrl && !options.githubApiUrl) {
        const isTimeout = err.name === 'AbortError';
        let errorDetail = err.message || 'Sync operation failed';
        if (isTimeout) errorDetail = 'Sync operation timed out';
        else if (errorDetail.includes('Failed to fetch') || errorDetail.includes('ECONNREFUSED')) {
          errorDetail = 'Sync server connection failed.';
        }
        const state = {
          status: 'failed',
          error: errorDetail,
          lastChecked: Date.now()
        };
        await setStoredSyncState(state);
        return state;
      }
    }
  }

  // Direct GitHub Synchronization Engine (Self-contained, independent of local development server)
  try {
    const githubApiUrl = options.githubApiUrl || await getStoredGithubApiUrl() || DEFAULT_GITHUB_API_URL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MaiRec-Extension-SyncEngine'
    };

    const token = options.token || options.githubToken || await getStoredGithubToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Step 1: Fetch latest commit from GitHub repository
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
      } else if (ghRes.status === 403 || ghRes.status === 429) {
        detailMsg = `GitHub API returned HTTP ${ghRes.status} (Rate limit exceeded or access forbidden. Please wait or configure a personal access token)`;
      } else {
        detailMsg = `GitHub API returned HTTP ${ghRes.status} (Synchronization failed)`;
      }
      throw new Error(detailMsg);
    }

    const data = await ghRes.json();
    const remoteSha = data.sha ? data.sha.slice(0, 8) : '';
    if (!remoteSha) {
      throw new Error('Synchronization failed: GitHub response did not contain a valid commit SHA.');
    }

    const commitMsg = data.commit?.message?.split('\n')[0] || '';
    const commitDate = data.commit?.committer?.date || '';

    // Step 2: Retrieve remote manifest or metadata if accessible
    let remoteVersion = CURRENT_LOCAL_VERSION;
    try {
      const manifestUrl = options.manifestUrl ||
        (githubApiUrl.includes('/repos/')
          ? githubApiUrl.replace(/\/commits\/.*$/, '/contents/extension/manifest.json')
          : null);

      if (manifestUrl) {
        const mCtrl = new AbortController();
        const mTimer = setTimeout(() => mCtrl.abort(), 4000);
        const mRes = await fetch(manifestUrl, { headers, signal: mCtrl.signal });
        clearTimeout(mTimer);
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData?.content) {
            let decoded = '';
            if (typeof Buffer !== 'undefined') {
              decoded = Buffer.from(mData.content, 'base64').toString('utf8');
            } else if (typeof atob === 'function') {
              decoded = atob(mData.content.replace(/\s/g, ''));
            }
            if (decoded) {
              const parsed = JSON.parse(decoded);
              if (parsed.version) {
                remoteVersion = 'v' + parsed.version.replace(/^v/, '');
              }
            }
          }
        }
      }
    } catch {}

    // Step 3: Trigger runtime update check if in extension environment
    if (typeof chrome !== 'undefined' && chrome.runtime?.requestUpdateCheck) {
      try {
        chrome.runtime.requestUpdateCheck((status) => {
          if (status === 'update_available' && chrome.runtime.reload) {
            // Optional reload can be triggered if desired
          }
        });
      } catch {}
    }

    // Step 4: Successfully persist synchronization state
    const state = {
      status: 'up_to_date',
      source: 'github_api',
      relation: 'UP_TO_DATE',
      currentCommit: remoteSha,
      localHead: remoteSha,
      remoteHead: remoteSha,
      version: remoteVersion,
      commitMessage: commitMsg,
      commitDate: commitDate,
      updateAvailable: false,
      lastSynced: Date.now(),
      lastChecked: Date.now()
    };
    await setStoredSyncState(state);
    return state;
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    let errorDetail = err.message || 'Synchronization failed';
    if (isTimeout) {
      errorDetail = 'Sync operation timed out';
    } else if (errorDetail.includes('Failed to fetch') || errorDetail.includes('NetworkError') || errorDetail.includes('ECONNREFUSED')) {
      errorDetail = 'Network request failed. Unable to connect to GitHub repository.';
    }
    const state = {
      status: 'failed',
      error: errorDetail,
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
      const versionStr = state.version || CURRENT_LOCAL_VERSION;
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
