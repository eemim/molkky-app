import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from '../src/lib/Settings.svelte';
import {
  OLD_STORAGE_KEY,
  STORAGE_KEY,
  isValidSettings,
  loadSettings,
  setKeepAwake,
  setNumberPad,
  setTheme,
  settings,
} from '../src/lib/settingsStore.svelte';

const DEFAULTS = { theme: 'system', numberPad: false, keepAwake: true };
const theme = () => document.documentElement.dataset.theme;
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  loadSettings();
});

describe('isValidSettings', () => {
  it('accepts exactly { theme, numberPad, keepAwake }', () => {
    for (const t of ['system', 'light', 'dark']) {
      expect(isValidSettings({ theme: t, numberPad: false, keepAwake: true })).toBe(true);
    }
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      undefined,
      true,
      'dark',
      [],
      {},
      { darkMode: true },
      { darkMode: true, numberPad: false },
      { theme: 'blue', numberPad: false, keepAwake: true },
      { theme: 'dark', numberPad: 'yes', keepAwake: true },
      { theme: 'dark', numberPad: false, keepAwake: 1 },
      { theme: 'dark', numberPad: false },
      { theme: 'dark', numberPad: false, keepAwake: true, extra: 1 },
    ]) {
      expect(isValidSettings(bad)).toBe(false);
    }
  });
});

describe('Settings store', () => {
  it('starts with the defaults when nothing is saved', () => {
    expect(settings).toEqual(DEFAULTS);
    expect(theme()).toBeUndefined(); // jsdom has no matchMedia, so 'system' is light
  });

  it('saves the theme and sets it on <html>', () => {
    setTheme('dark');
    expect(theme()).toBe('dark');
    expect(stored()).toEqual({ ...DEFAULTS, theme: 'dark' });

    setTheme('light');
    expect(theme()).toBeUndefined();
    expect(stored()).toEqual({ ...DEFAULTS, theme: 'light' });
  });

  it('loads saved settings', () => {
    const saved = { theme: 'dark', numberPad: true, keepAwake: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    loadSettings();
    expect(settings).toEqual(saved);
    expect(theme()).toBe('dark');
  });

  it('saves the number pad and keep awake choices', () => {
    setNumberPad(true);
    setKeepAwake(false);
    expect(stored()).toEqual({ ...DEFAULTS, numberPad: true, keepAwake: false });
    loadSettings();
    expect(settings.numberPad).toBe(true);
    expect(settings.keepAwake).toBe(false);
  });

  it('falls back to the defaults on a bad or corrupt value, without throwing', () => {
    for (const raw of [
      '{not json',
      '"dark"',
      '{"theme":"blue","numberPad":false,"keepAwake":true}',
    ]) {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(() => loadSettings()).not.toThrow();
      expect(settings).toEqual(DEFAULTS);
      expect(theme()).toBeUndefined();
    }
  });

  it('turns v1 dark mode into the dark theme, saves v2 and removes v1', () => {
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ darkMode: true }));
    loadSettings();
    expect(settings).toEqual({ ...DEFAULTS, theme: 'dark' });
    expect(theme()).toBe('dark');
    expect(stored()).toEqual({ ...DEFAULTS, theme: 'dark' });
    expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();
  });

  it('turns v1 light mode into the system theme', () => {
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ darkMode: false }));
    loadSettings();
    expect(settings).toEqual(DEFAULTS);
  });

  it('ignores v1 once a v2 save exists', () => {
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ darkMode: true }));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme: 'light', numberPad: true, keepAwake: true }),
    );
    loadSettings();
    expect(settings).toEqual({ theme: 'light', numberPad: true, keepAwake: true });
  });

  it('gives the defaults for a bad v1 value, without throwing', () => {
    for (const raw of ['{not json', '{"darkMode":"yes"}', '{"darkMode":true,"x":1}']) {
      localStorage.clear();
      localStorage.setItem(OLD_STORAGE_KEY, raw);
      expect(() => loadSettings()).not.toThrow();
      expect(settings).toEqual(DEFAULTS);
      expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();
    }
  });
});

describe('System theme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  // The store reads matchMedia when it loads, so load a fresh copy with a fake phone setting.
  async function loadWithSystemDark(dark: boolean) {
    const listeners: (() => void)[] = [];
    const query = {
      matches: dark,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    };
    vi.stubGlobal('matchMedia', () => query);
    vi.resetModules();
    const store = await import('../src/lib/settingsStore.svelte');
    return { store, query, change: () => listeners.forEach((fn) => fn()) };
  }

  it('follows the phone, also when it switches while the app is open', async () => {
    const { query, change } = await loadWithSystemDark(true);
    expect(theme()).toBe('dark');

    query.matches = false;
    change();
    expect(theme()).toBeUndefined();
  });

  it('ignores the phone when Light or Dark is picked', async () => {
    const { store, query, change } = await loadWithSystemDark(true);
    store.setTheme('light');
    expect(theme()).toBeUndefined();

    store.setTheme('dark');
    query.matches = false;
    change();
    expect(theme()).toBe('dark');
  });
});

describe('Settings screen controls', () => {
  let component: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    if (component) unmount(component);
    component = undefined;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function render() {
    component = mount(Settings, { target: document.body, props: { onBack: () => {} } });
    flushSync();
  }
  const switchNamed = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="switch"]')].find(
      (s) => document.getElementById(s.getAttribute('aria-labelledby') ?? '')?.textContent === name,
    )!;
  const hintOf = (s: HTMLElement) =>
    document.getElementById(s.getAttribute('aria-describedby') ?? '')?.textContent?.trim();

  it('picks the theme with radios, System by default', () => {
    render();
    expect(document.querySelector('legend')?.textContent).toBe('Theme');
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[name="theme"]')];
    expect(radios.map((r) => r.closest('label')?.textContent?.trim())).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
    expect(radios[0].checked).toBe(true);

    radios[2].click();
    flushSync();
    expect(settings.theme).toBe('dark');
    expect(theme()).toBe('dark');
  });

  it('has a described Number pad switch that toggles the setting', () => {
    render();
    const toggle = switchNamed('Number pad');
    expect(hintOf(toggle)).toBe('Enter points instead of tapping pins');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(settings.numberPad).toBe(true);
  });

  it('has a Keep screen on switch, on by default, when the device supports it', () => {
    vi.stubGlobal('navigator', { ...navigator, wakeLock: { request: vi.fn() } });
    render();
    const toggle = switchNamed('Keep screen on');
    expect(toggle.disabled).toBe(false);
    expect(hintOf(toggle)).toBe('While a game is in progress');
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(settings.keepAwake).toBe(false);
  });

  it('disables Keep screen on where the device cannot do it', () => {
    render(); // jsdom has no navigator.wakeLock
    const toggle = switchNamed('Keep screen on');
    expect(toggle.disabled).toBe(true);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(hintOf(toggle)).toBe('Not supported on this device');
  });
});
