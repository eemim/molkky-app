import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.svelte';
import { keepScreenOn } from '../src/lib/keepAwake';
import { reset, start, throwPins } from '../src/lib/gameStore.svelte';
import { loadSettings, setKeepAwake } from '../src/lib/settingsStore.svelte';

// A fake Screen Wake Lock: counts requests and tracks which locks are still held.
function fakeWakeLock() {
  const held = new Set<EventTarget>();
  const request = vi.fn(async () => {
    const lock = new EventTarget() as EventTarget & { release: () => Promise<void> };
    lock.release = async () => {
      held.delete(lock);
      lock.dispatchEvent(new Event('release'));
    };
    held.add(lock);
    return lock;
  });
  vi.stubGlobal('navigator', { ...navigator, wakeLock: { request } });
  return { request, held };
}

let visibility: DocumentVisibilityState = 'visible';
function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});
afterEach(async () => {
  keepScreenOn(false);
  await settle();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('keepScreenOn', () => {
  it('holds one lock while on and releases it when off', async () => {
    const { request, held } = fakeWakeLock();
    keepScreenOn(true);
    keepScreenOn(true);
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(held.size).toBe(1);

    keepScreenOn(false);
    await settle();
    expect(held.size).toBe(0);
  });

  it('asks again when the page comes back after the browser dropped the lock', async () => {
    const { request, held } = fakeWakeLock();
    keepScreenOn(true);
    await settle();

    // The browser releases the lock itself when the page is hidden
    setVisibility('hidden');
    for (const lock of held) await (lock as unknown as { release: () => Promise<void> }).release();
    await settle();
    expect(request).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(held.size).toBe(1);
  });

  it('does not ask while hidden, and not again once turned off', async () => {
    const { request } = fakeWakeLock();
    setVisibility('hidden');
    keepScreenOn(true);
    await settle();
    expect(request).not.toHaveBeenCalled();

    keepScreenOn(false);
    setVisibility('visible');
    await settle();
    expect(request).not.toHaveBeenCalled();
  });

  it('lets go of a lock that arrives after it was turned off', async () => {
    const { held } = fakeWakeLock();
    keepScreenOn(true);
    keepScreenOn(false); // before the request resolved
    await settle();
    expect(held.size).toBe(0);
  });

  it('does nothing where the device has no wake lock or refuses it', async () => {
    expect(() => keepScreenOn(true)).not.toThrow();

    vi.stubGlobal('navigator', {
      ...navigator,
      wakeLock: { request: vi.fn(() => Promise.reject(new Error('NotAllowedError'))) },
    });
    keepScreenOn(false);
    keepScreenOn(true);
    await expect(settle()).resolves.toBeUndefined();
  });
});

describe('Keep screen on in the app', () => {
  let component: ReturnType<typeof mount> | undefined;
  beforeEach(() => {
    localStorage.clear();
    reset();
    loadSettings();
  });
  afterEach(() => {
    if (component) unmount(component);
    component = undefined;
    document.body.innerHTML = '';
  });

  function render() {
    component = mount(App, { target: document.body });
    flushSync();
  }

  it('keeps the screen on only while a game is being played', async () => {
    const { held } = fakeWakeLock();
    render();
    await settle();
    expect(held.size).toBe(0); // Setup

    start(['John', 'Jane']);
    flushSync();
    await settle();
    expect(held.size).toBe(1);

    // Jane misses three times: only John is left, so the game ends and Results show
    for (let i = 0; i < 3; i++) {
      throwPins([5]);
      throwPins([]);
    }
    flushSync();
    await settle();
    expect(held.size).toBe(0); // Results
  });

  it('lets the screen sleep when the setting is off', async () => {
    const { held } = fakeWakeLock();
    start(['John', 'Jane']);
    render();
    await settle();
    expect(held.size).toBe(1);

    setKeepAwake(false);
    flushSync();
    await settle();
    expect(held.size).toBe(0);
  });
});
