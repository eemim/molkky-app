import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Settings from '../src/lib/Settings.svelte';
import {
  STORAGE_KEY,
  isValidSettings,
  loadSettings,
  setDarkMode,
  settings,
} from '../src/lib/settingsStore.svelte';

const theme = () => document.documentElement.dataset.theme;
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  localStorage.clear();
  loadSettings();
});

describe('isValidSettings', () => {
  it('accepts exactly { darkMode: boolean }', () => {
    expect(isValidSettings({ darkMode: true })).toBe(true);
    expect(isValidSettings({ darkMode: false })).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      undefined,
      true,
      'dark',
      [],
      {},
      { darkMode: 'true' },
      { darkMode: 1 },
      { darkMode: true, extra: 1 },
    ]) {
      expect(isValidSettings(bad)).toBe(false);
    }
  });
});

describe('Settings store', () => {
  it('starts light when nothing is saved', () => {
    expect(settings.darkMode).toBe(false);
    expect(theme()).toBeUndefined();
  });

  it('saves the choice and sets the theme on <html>', () => {
    setDarkMode(true);
    expect(theme()).toBe('dark');
    expect(stored()).toEqual({ darkMode: true });

    setDarkMode(false);
    expect(theme()).toBeUndefined();
    expect(stored()).toEqual({ darkMode: false });
  });

  it('loads a saved dark choice', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ darkMode: true }));
    loadSettings();
    expect(settings.darkMode).toBe(true);
    expect(theme()).toBe('dark');
  });

  it('falls back to light on a bad or corrupt value, without throwing', () => {
    for (const raw of ['{not json', '"dark"', '{"darkMode":"yes"}']) {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(() => loadSettings()).not.toThrow();
      expect(settings.darkMode).toBe(false);
      expect(theme()).toBeUndefined();
    }
  });
});

describe('Dark mode switch', () => {
  let component: ReturnType<typeof mount> | undefined;
  afterEach(() => {
    if (component) unmount(component);
    component = undefined;
    document.body.innerHTML = '';
  });

  it('is a labelled switch that toggles dark mode', () => {
    component = mount(Settings, { target: document.body, props: { onBack: () => {} } });
    flushSync();
    const toggle = document.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(toggle.textContent?.trim()).toBe('Dark mode');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(theme()).toBe('dark');

    toggle.click();
    flushSync();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(theme()).toBeUndefined();
  });
});
