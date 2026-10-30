import { getMessage } from './i18n.js';

export const THEMES = ['dark', 'light'];
export const DEFAULT_THEME = 'dark';

export function normalizeTheme(theme) {
  if (!theme || typeof theme !== 'string') return DEFAULT_THEME;
  const clean = theme.toLowerCase().trim();
  return clean === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  const norm = normalizeTheme(theme);
  if (root) {
    root.setAttribute('data-theme', norm);
    if (root.style) {
      root.style.colorScheme = norm;
    }
  }
  return norm;
}

export async function getStoredTheme() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(['theme', 'settings']);
      if (res?.theme) return normalizeTheme(res.theme);
      if (res?.settings?.theme) return normalizeTheme(res.settings.theme);
    }
  } catch {}
  return DEFAULT_THEME;
}

export async function setStoredTheme(theme) {
  const norm = normalizeTheme(theme);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ theme: norm });
    }
  } catch {}
  return norm;
}

export function updateThemeButton(btn, theme, lang = 'en') {
  if (!btn) return;
  const isDark = normalizeTheme(theme) === 'dark';
  const label = getMessage(isDark ? 'theme_toggle_to_light' : 'theme_toggle_to_dark', lang);
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}
