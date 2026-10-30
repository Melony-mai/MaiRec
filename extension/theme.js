import { getMessage } from './i18n.js';

export const THEMES = ['system', 'dark', 'light'];
export const DEFAULT_THEME = 'dark';

export function normalizeTheme(theme) {
  if (!theme || typeof theme !== 'string') return DEFAULT_THEME;
  const clean = theme.toLowerCase().trim();
  if (clean === 'system') return 'system';
  if (clean === 'light') return 'light';
  if (clean === 'dark') return 'dark';
  return DEFAULT_THEME;
}

export function getSystemTheme() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function resolveEffectiveTheme(theme) {
  const norm = normalizeTheme(theme);
  if (norm === 'system') {
    return getSystemTheme();
  }
  return norm;
}

export function applyTheme(theme, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  const norm = normalizeTheme(theme);
  const effective = resolveEffectiveTheme(norm);
  if (root) {
    root.setAttribute('data-theme', effective);
    root.setAttribute('data-theme-preference', norm);
    root.setAttribute('data-theme-mode', norm);
    if (root.style) {
      root.style.colorScheme = effective;
    }
  }
  return effective;
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

export function initSystemThemeListener(callback) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let lastTheme = darkQuery.matches ? 'dark' : 'light';

  const checkTheme = () => {
    const current = darkQuery.matches ? 'dark' : 'light';
    if (current !== lastTheme) {
      lastTheme = current;
      callback(current);
    }
  };

  const handler = (e) => {
    const current = e.matches ? 'dark' : 'light';
    if (current !== lastTheme) {
      lastTheme = current;
      callback(current);
    }
  };

  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', handler);
  }
  if (darkQuery.addListener) {
    darkQuery.addListener(handler);
  }

  // Polling fallback to guarantee instant reaction across all Chromium environments and OS bridges
  const timer = setInterval(checkTheme, 150);

  return () => {
    if (darkQuery.removeEventListener) {
      darkQuery.removeEventListener('change', handler);
    }
    if (darkQuery.removeListener) {
      darkQuery.removeListener(handler);
    }
    clearInterval(timer);
  };
}

export function updateThemeButton(btn, theme, lang = 'en') {
  if (!btn) return;
  const effective = resolveEffectiveTheme(theme);
  const isDark = effective === 'dark';
  const label = getMessage(isDark ? 'theme_toggle_to_light' : 'theme_toggle_to_dark', lang);
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}
