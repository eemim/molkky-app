import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Controls from '../src/lib/Controls.svelte';
import Results from '../src/lib/Results.svelte';
import Setup from '../src/lib/Setup.svelte';
import { reset, start, view, throwPins, showResults } from '../src/lib/gameStore.svelte';
import { loadSavedNames, saveName, savedNames } from '../src/lib/namesStore.svelte';
import { MAX_SAVED_NAMES } from '../src/lib/names';

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
    dialog().querySelector<HTMLButtonElement>('.btn-danger')!.click();
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

describe('Saved players', () => {
  beforeEach(() => {
    localStorage.clear();
    loadSavedNames();
  });

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  };
  const stars = () => [...document.querySelectorAll<HTMLButtonElement>('.star')];
  const chip = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.chip')].find(
      (b) => b.textContent?.trim() === name,
    )!;
  const tap = (el: HTMLElement) => {
    el.click();
    flushSync();
  };
  const teamBoxes = () => [...document.querySelectorAll<HTMLFieldSetElement>('fieldset.team')];
  const memberValues = (team: number) =>
    [...teamBoxes()[team].querySelectorAll<HTMLInputElement>('.members input')].map((i) => i.value);

  it('shows no saved list until a name is starred, then offers it as a chip', () => {
    render(Setup);
    expect(document.querySelector('.saved')).toBeNull();
    expect(stars()[0].disabled).toBe(true);

    type(inputs()[0], 'John');
    tap(stars()[0]);
    expect(savedNames.list).toEqual(['John']);
    expect(stars()[0].getAttribute('aria-pressed')).toBe('true');
    expect(chip('John')).toBeTruthy();

    tap(stars()[0]);
    expect(savedNames.list).toEqual([]);
    expect(document.querySelector('.saved')).toBeNull();
  });

  it('fills the first empty field, then adds a new row', () => {
    for (const name of ['Max', 'Jane', 'John']) saveName(name);
    render(Setup);

    tap(chip('John'));
    tap(chip('Jane'));
    tap(chip('Max'));
    expect(inputs().map((i) => i.value)).toEqual(['John', 'Jane', 'Max']);
  });

  it('greys out a chip already in the form, but still lets you add it again', () => {
    saveName('John');
    render(Setup);
    expect(chip('John').classList.contains('used')).toBe(false);

    tap(chip('John'));
    expect(chip('John').classList.contains('used')).toBe(true);
    expect(chip('John').disabled).toBe(false);

    tap(chip('John'));
    expect(inputs().map((i) => i.value)).toEqual(['John', 'John']);
  });

  it('removes names in Edit mode and leaves Edit mode when the list is empty', () => {
    saveName('Jane');
    saveName('John');
    render(Setup);

    tap(button('Edit'));
    tap(
      document.querySelector<HTMLButtonElement>('[aria-label="Remove John from saved players"]')!,
    );
    expect(savedNames.list).toEqual(['Jane']);
    expect(inputs().map((i) => i.value)).toEqual(['', '']);

    tap(
      document.querySelector<HTMLButtonElement>('[aria-label="Remove Jane from saved players"]')!,
    );
    expect(document.querySelector('.saved')).toBeNull();

    saveName('Max');
    flushSync();
    expect(button('Edit')).toBeTruthy();
  });

  it('adds chips to the active team, so teams can be split as you like', () => {
    for (const name of ['Max', 'Jane', 'John', 'Ada']) saveName(name);
    render(Setup);
    tap(button('Teams'));

    expect(teamBoxes()[0].classList.contains('active')).toBe(true);
    tap(chip('Ada'));
    tap(chip('John'));

    teamBoxes()[1].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    flushSync();
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
    expect(document.querySelector('.target')?.textContent).toMatch(/Team 2/);
    tap(chip('Jane'));
    tap(chip('Max'));

    expect(memberValues(0)).toEqual(['Ada', 'John']);
    expect(memberValues(1)).toEqual(['Jane', 'Max']);
  });

  it('keeps the same team active when the teams are reordered or removed', () => {
    render(Setup);
    tap(button('Teams'));
    type(inputs()[2], 'Blue');
    teamBoxes()[1].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    flushSync();

    tap(document.querySelector<HTMLButtonElement>('[aria-label="Move Blue up"]')!);
    expect(teamBoxes()[0].classList.contains('active')).toBe(true);

    tap(button('+ Add team'));
    expect(teamBoxes()[2].classList.contains('active')).toBe(true);
    tap(document.querySelector<HTMLButtonElement>('[aria-label="Remove team 3"]')!);
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
  });

  it('disables chips when the active team is full', () => {
    saveName('John');
    render(Setup);
    tap(button('Teams'));
    for (let i = 0; i < 7; i++) tap(chip('John'));

    expect(memberValues(0)).toHaveLength(7);
    expect(chip('John').disabled).toBe(true);
    expect(document.body.textContent).toMatch(/Team 1 is full/);
  });

  it('stops saving at the cap and says how to make room', () => {
    for (let i = 0; i < MAX_SAVED_NAMES; i++) saveName(`Player ${i + 1}`);
    render(Setup);
    type(inputs()[0], 'John');

    expect(stars()[0].disabled).toBe(true);
    expect(document.body.textContent).toMatch(/Remove a name to save more/);
  });

  it('moves the players of a started game to the front of the list', async () => {
    for (const name of ['John', 'Jane', 'Max']) saveName(name);
    render(Setup);
    tap(chip('John'));
    tap(chip('Jane'));
    button('Start game').click();
    await tick();

    expect(view.state?.players.map((p) => p.name)).toEqual(['John', 'Jane']);
    expect(savedNames.list).toEqual(['John', 'Jane', 'Max']);
  });
});
