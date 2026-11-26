// App settings, separate from the game and saved names. Stored as
// { theme, numberPad, keepAwake } under STORAGE_KEY. The inline script in index.html reads the
// same keys to apply the theme before the app loads (no light flash), so keep the two in sync
// if the format changes.

export const STORAGE_KEY = 'molkky-settings-v2';
// v1 was { darkMode }. Its choice is carried over once, then the key is removed.
export const OLD_STORAGE_KEY = 'molkky-settings-v1';

// theme: 'system' follows the phone's light/dark setting.
// numberPad: enter points on a 1-12 pad instead of tapping pins.
// keepAwake: keep the screen on while a game is in progress.
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export type Settings = { theme: Theme; numberPad: boolean; keepAwake: boolean };

const DEFAULTS: Settings = { theme: 'system', numberPad: false, keepAwake: true };

// Page and browser-bar colours (match --bg in app.css for each theme)
const THEME_COLOR = { light: '#f4f1e8', dark: '#171a14' };

export const settings = $state<Settings>({ ...DEFAULTS });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((k) => own.includes(k));
}

// Strict: exactly { theme, numberPad: boolean, keepAwake: boolean }, nothing else.
export function isValidSettings(value: unknown): value is Settings {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ['theme', 'numberPad', 'keepAwake']) &&
    THEMES.includes(value.theme as Theme) &&
    typeof value.numberPad === 'boolean' &&
    typeof value.keepAwake === 'boolean'
  );
}

// The v1 format: exactly { darkMode: boolean }.
function isValidOldSettings(value: unknown): value is { darkMode: boolean } {
  return (
    isPlainObject(value) && hasExactKeys(value, ['darkMode']) && typeof value.darkMode === 'boolean'
  );
}

// null where matchMedia is missing (old browsers, jsdom): 'system' then means light.
const systemDark =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function applyTheme() {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && !!systemDark?.matches);
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[dark ? 'dark' : 'light']);
}

// Follow the phone switching light/dark while the app is open (only matters for 'system').
systemDark?.addEventListener('change', applyTheme);

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, full); the setting lasts only this visit
  }
}

// Reads the stored settings. A missing or bad value gives the defaults and never throws.
export function loadSettings() {
  Object.assign(settings, DEFAULTS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: unknown = JSON.parse(raw);
      if (isValidSettings(stored)) Object.assign(settings, stored);
    } else {
      migrateV1();
    }
  } catch {
    // Corrupt value: ignore it, the next save overwrites it
  }
  applyTheme();
}

// No v2 save yet: carry over v1 (if valid), save as v2, drop v1. v1 had no "follow the
// phone" option, so dark stays dark and light (also the old default) becomes 'system'.
function migrateV1() {
  const raw = localStorage.getItem(OLD_STORAGE_KEY);
  if (raw === null) return;
  try {
    const old: unknown = JSON.parse(raw);
    if (isValidOldSettings(old) && old.darkMode) settings.theme = 'dark';
  } catch {
    // Corrupt v1 value: defaults
  }
  save();
  localStorage.removeItem(OLD_STORAGE_KEY);
}

export function setTheme(theme: Theme) {
  settings.theme = theme;
  applyTheme();
  save();
}

export function setNumberPad(on: boolean) {
  settings.numberPad = on;
  save();
}

export function setKeepAwake(on: boolean) {
  settings.keepAwake = on;
  save();
}

loadSettings();
