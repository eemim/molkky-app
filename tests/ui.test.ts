import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Controls from '../src/lib/Controls.svelte';
import Results from '../src/lib/Results.svelte';
import Setup from '../src/lib/Setup.svelte';
import { reset, start, view, throwPins, showResults } from '../src/lib/gameStore.svelte';

let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  localStorage.clear();
  reset();
});
afterEach(() => {
  if (component) unmount(component);
  component = undefined;
  document.body.innerHTML = '';
});

function render(Component: typeof Setup | typeof Controls | typeof Results, props = {}) {
  component = mount(Component as never, { target: document.body, props });
  flushSync();
}

const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement;
const inputs = () => [...document.querySelectorAll<HTMLInputElement>('input[type="text"]')];
const dialog = () => document.querySelector('dialog') as HTMLDialogElement;

describe('New game confirmation', () => {
  beforeEach(() => start(['Ada', 'Lin']));

  it('asks first, and keeps the game when you choose Keep playing', () => {
    render(Controls);
    expect(dialog().open).toBe(false);

    button('New game').click();
    flushSync();
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('aria-labelledby')).toBeTruthy();

    button('Keep playing').click();
    flushSync();
    expect(dialog().open).toBe(false);
    expect(view.state).not.toBeNull();
  });

  it('starts over only after confirming', () => {
    render(Controls);
    button('New game').click();
    flushSync();
    dialog().querySelector<HTMLButtonElement>('.danger')!.click();
    flushSync();
    expect(view.state).toBeNull();
  });
});

describe('Rematch dialog', () => {
  it('uses the shared dialog and offers Edit teams only in team games', () => {
    start(['Ada', 'Lin']);
    throwPins([12]);
    throwPins([1]);
    throwPins([12]);
    throwPins([1]);
    throwPins([12]);
    throwPins([1]);
    throwPins([12]);
    throwPins([1]);
    showResults();
    render(Results);
    button('Rematch').click();
    flushSync();
    expect(dialog().open).toBe(true);
    expect(button('Keep order')).toBeTruthy();
    expect(button('Edit teams')).toBeUndefined();
  });
});

describe('Setup names', () => {
  it('starts with empty fields and italic-placeholder text only', () => {
    render(Setup);
    expect(inputs().map((i) => i.value)).toEqual(['', '']);
    expect(inputs().map((i) => i.placeholder)).toEqual(['Player', 'Player']);
    expect(document.body.textContent).not.toMatch(/Player 1|Team 1/);
  });

  it('shows no errors before the first attempt', () => {
    render(Setup);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(inputs().some((i) => i.getAttribute('aria-invalid') === 'true')).toBe(false);
  });

  it('on Start with missing names: explains, marks the gaps and focuses the first', async () => {
    render(Setup);
    inputs()[1].value = 'Lin';
    inputs()[1].dispatchEvent(new Event('input', { bubbles: true }));
    button('Start game').click();
    await new Promise((resolve) => setTimeout(resolve));

    expect(view.state).toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toMatch(/needs a name/);
    expect(inputs()[0].getAttribute('aria-invalid')).toBe('true');
    expect(inputs()[0].getAttribute('aria-describedby')).toBe(
      document.querySelector('[role="alert"]')!.id,
    );
    expect(inputs()[1].getAttribute('aria-invalid')).toBe('false');
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it('starts once every name is filled in', async () => {
    render(Setup);
    for (const [i, name] of ['Ada', 'Lin'].entries()) {
      inputs()[i].value = name;
      inputs()[i].dispatchEvent(new Event('input', { bubbles: true }));
    }
    button('Start game').click();
    await tick();
    expect(view.state?.players.map((p) => p.name)).toEqual(['Ada', 'Lin']);
  });

  it('treats whitespace-only names as missing', async () => {
    render(Setup);
    for (const i of [0, 1]) {
      inputs()[i].value = '   ';
      inputs()[i].dispatchEvent(new Event('input', { bubbles: true }));
    }
    button('Start game').click();
    await tick();
    expect(view.state).toBeNull();
  });

  it('the team tab uses Team / Player placeholders and clear errors on switching', async () => {
    render(Setup);
    button('Start game').click();
    await tick();
    flushSync();
    expect(document.querySelector('[role="alert"]')).not.toBeNull();

    button('Teams').click();
    flushSync();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(inputs().map((i) => i.placeholder)).toEqual(['Team', 'Player', 'Team', 'Player']);
  });
});
