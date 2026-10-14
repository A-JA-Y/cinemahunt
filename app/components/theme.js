'use client';

import { useEffect, useState } from 'react';

/**
 * Theme store. Three explicit choices plus "system", which defers to the OS.
 *
 * The chosen theme is written to data-theme on <html>; globals.css keys all its
 * colour tokens off that attribute. "system" removes the attribute entirely so
 * the prefers-color-scheme block in the stylesheet takes over.
 *
 * The actual first paint is handled by the inline script in layout.js — this
 * module only takes over once React is running.
 */

export const THEMES = [
  { key: 'system', label: 'System', hint: 'Follow the OS' },
  { key: 'light', label: 'Light', hint: 'Paper' },
  { key: 'dark', label: 'Dark', hint: 'Projector' },
  { key: 'amoled', label: 'AMOLED', hint: 'True black' }
];

const STORAGE_KEY = 'ch:theme';
const VALID = new Set(['system', 'light', 'dark', 'amoled']);

// The browser chrome colour per theme, kept in step with --color-ink.
const THEME_COLOR = {
  light: '#f4f1ea',
  dark: '#07070a',
  amoled: '#000000'
};

let current = 'system';
const listeners = new Set();

function read() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID.has(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

/** What the page is actually showing, with "system" resolved against the OS. */
export function resolve(theme) {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function apply(theme) {
  const root = document.documentElement;

  if (theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;

  // Keep the mobile browser chrome in step, or the address bar fights the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[resolve(theme)] ?? THEME_COLOR.dark);
}

export function setTheme(theme) {
  if (!VALID.has(theme)) return;
  current = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode — the theme just won't persist */
  }
  apply(theme);
  for (const listener of listeners) listener(theme);
}

export function useTheme() {
  // Always start at the server-rendered default; the real value is read in the
  // effect below. Reading localStorage during render would desync hydration.
  const [theme, setLocal] = useState('system');

  useEffect(() => {
    current = read();
    setLocal(current);
    apply(current);

    listeners.add(setLocal);

    // While on "system", track the OS flipping (e.g. at sunset).
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onSystemChange = () => current === 'system' && apply('system');
    media.addEventListener('change', onSystemChange);

    return () => {
      listeners.delete(setLocal);
      media.removeEventListener('change', onSystemChange);
    };
  }, []);

  return { theme, setTheme, resolved: resolve(theme) };
}
