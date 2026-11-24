// App settings, separate from the game and saved names. Stored as { darkMode } under
// STORAGE_KEY. The inline script in index.html reads the same key to apply the theme
// before the app loads (no light flash), so keep the two in sync if the format changes.

export const STORAGE_KEY = 'molkky-settings-v1';

export type Settings = { darkMode: boolean };

const DEFAULTS: Settings = { darkMode: false };

// Page and browser-bar colours (match --bg in app.css for each theme)
const THEME_COLOR = { light: '#f4f1e8', dark: '#171a14' };

export const settings = $state<Settings>({ ...DEFAULTS });

// Strict: exactly { darkMode: boolean }, nothing else.
export function isValidSettings(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === 1 && keys[0] === 'darkMode' && typeof (value as Settings).darkMode === 'boolean'
  );
}

function applyTheme() {
  const theme = settings.darkMode ? 'dark' : 'light';
  if (settings.darkMode) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

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
    }
  } catch {
    // Corrupt value: ignore it, the next save overwrites it
  }
  applyTheme();
}

export function setDarkMode(on: boolean) {
  settings.darkMode = on;
  applyTheme();
  save();
}

loadSettings();
