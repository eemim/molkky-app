// Keeps the screen on with the Screen Wake Lock API. The only place that touches the wake lock,
// so a native plugin can replace it later (see "Store packaging" in refactoring.md).
//
// The browser drops the lock whenever the page is hidden (app switched, screen locked), so it
// is asked for again when the page becomes visible, as long as it is still wanted.

let wanted = false;
let sentinel: WakeLockSentinel | null = null;
let requesting = false;

export function keepAwakeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquire() {
  if (!wanted || sentinel || requesting || !keepAwakeSupported()) return;
  if (document.visibilityState !== 'visible') return;
  requesting = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!wanted) {
      // Turned off while the request was pending
      void lock.release();
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch {
    // Refused (battery saver, no permission): the screen just sleeps as usual
  } finally {
    requesting = false;
  }
}

// Call with true while the screen should stay on, false to let it sleep again.
export function keepScreenOn(on: boolean) {
  wanted = on;
  if (on) {
    void acquire();
  } else if (sentinel) {
    const lock = sentinel;
    sentinel = null;
    void lock.release();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => void acquire());
}
