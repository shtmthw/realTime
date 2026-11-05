import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'theme';
const listeners = new Set<() => void>();
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function setThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* private mode: preference just won't persist */
  }
  apply(pref);
  listeners.forEach((l) => l());
}

apply(getThemePreference());
media?.addEventListener('change', () => apply(getThemePreference()));

export function useThemePreference(): [ThemePreference, (p: ThemePreference) => void] {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getThemePreference,
    () => 'system' as const,
  );
  return [pref, setThemePreference];
}
