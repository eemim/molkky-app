import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Controls from '../src/lib/Controls.svelte';
import Results from '../src/lib/Results.svelte';
import Setup from '../src/lib/Setup.svelte';
import Scoreboard from '../src/lib/Scoreboard.svelte';
import { ordinal } from '../src/lib/PlaceBadge.svelte';
import { reset, start, view, throwPins, showResults } from '../src/lib/gameStore.svelte';
import { loadSavedNames, saveName, savedNames } from '../src/lib/namesStore.svelte';
import { MAX_SAVED_NAMES } from '../src/lib/names';

let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
  localStorage.clear();
  reset();
  loadSavedNames();
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

describe('Game controls', () => {
  it('shows the Results button only once someone has reached 50', () => {
    start(['John', 'Jane']);
    render(Controls);
    expect(button('Results')).toBeUndefined();
    expect(button('Undo')).toBeTruthy();
    expect(button('New game')).toBeTruthy();

    for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [2]]) throwPins(pins);
    flushSync();
    expect(button('Results')).toBeTruthy();
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

  it('selects a chip while its name is in the form, and tapping again takes it out', () => {
    for (const name of ['Max', 'Jane', 'John']) saveName(name);
    render(Setup);
    expect(chip('John').getAttribute('aria-pressed')).toBe('false');

    tap(chip('John'));
    tap(chip('Jane'));
    tap(chip('Max'));
    expect(chip('John').getAttribute('aria-pressed')).toBe('true');

    tap(chip('Jane'));
    expect(inputs().map((i) => i.value)).toEqual(['John', 'Max']);
    expect(chip('Jane').getAttribute('aria-pressed')).toBe('false');

    // Below the minimum, an empty field takes the place of the removed name
    tap(chip('John'));
    expect(inputs().map((i) => i.value)).toEqual(['Max', '']);
  });

  it('also selects a chip for a name typed by hand', () => {
    saveName('John');
    render(Setup);
    type(inputs()[1], 'John');
    expect(chip('John').getAttribute('aria-pressed')).toBe('true');

    tap(chip('John'));
    expect(inputs().map((i) => i.value)).toEqual(['', '']);
  });

  it('takes a name out of whichever team has it, not only the active team', () => {
    for (const name of ['Jane', 'John']) saveName(name);
    render(Setup);
    tap(button('Teams'));
    tap(chip('John'));

    teamBoxes()[1].click();
    flushSync();
    tap(chip('Jane'));
    tap(chip('John'));

    expect(memberValues(0)).toEqual(['']);
    expect(memberValues(1)).toEqual(['Jane']);
  });

  it('shows the 5 newest names, and the rest behind Show more', () => {
    for (let i = 7; i >= 1; i--) saveName(`Player ${i}`);
    render(Setup);
    const chipNames = () =>
      [...document.querySelectorAll('.chip')].map((c) => c.textContent?.trim());

    expect(chipNames()).toEqual(['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5']);
    tap(button('Show 2 more'));
    expect(chipNames()).toHaveLength(7);
    tap(button('Show less'));
    expect(chipNames()).toHaveLength(5);

    // Edit mode always lists everything
    tap(button('Edit'));
    expect(chipNames()).toHaveLength(7);
    expect(button('Show 2 more')).toBeUndefined();
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

    teamBoxes()[1].click();
    flushSync();
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
    expect(document.querySelector('.pill.on')?.textContent).toMatch(/Team 2/);
    tap(chip('Jane'));
    tap(chip('Max'));

    expect(memberValues(0)).toEqual(['Ada', 'John']);
    expect(memberValues(1)).toEqual(['Jane', 'Max']);
  });

  it('picks the target team from the pills in the saved card', () => {
    for (const name of ['Jane', 'John']) saveName(name);
    render(Setup);
    tap(button('Teams'));
    type(inputs()[2], 'Red');

    const radios = () => [...document.querySelectorAll<HTMLInputElement>('.picker input')];
    expect(radios().map((r) => r.checked)).toEqual([true, false]);
    expect(document.querySelector('.picker')?.textContent).toMatch(/Team 1.*Red/s);

    tap(radios()[1]);
    expect(radios().map((r) => r.checked)).toEqual([false, true]);
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);

    tap(chip('John'));
    expect(memberValues(1)).toEqual(['John']);

    // Edit mode is for removing saved names, so the team picker steps aside
    tap(button('Edit'));
    expect(document.querySelector('.picker')).toBeNull();
  });

  it('selects a team box on a tap, not when a touch starts (it may be a scroll)', () => {
    render(Setup);
    tap(button('Teams'));

    teamBoxes()[1].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    flushSync();
    expect(teamBoxes()[0].classList.contains('active')).toBe(true);

    tap(teamBoxes()[1]);
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
  });

  it('adding a member selects that team', () => {
    render(Setup);
    tap(button('Teams'));
    const addMemberButtons = [...document.querySelectorAll<HTMLButtonElement>('.team .add')];
    tap(addMemberButtons[1]);
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
  });

  it('keeps the same team active when the teams are reordered or removed', () => {
    render(Setup);
    tap(button('Teams'));
    type(inputs()[2], 'Blue');
    teamBoxes()[1].click();
    flushSync();

    tap(document.querySelector<HTMLButtonElement>('[aria-label="Move Blue up"]')!);
    expect(teamBoxes()[0].classList.contains('active')).toBe(true);

    tap(button('+ Add team'));
    expect(teamBoxes()[2].classList.contains('active')).toBe(true);
    tap(document.querySelector<HTMLButtonElement>('[aria-label="Remove team 3"]')!);
    expect(teamBoxes()[1].classList.contains('active')).toBe(true);
  });

  it('only keeps the saved card sticky while it is compact', () => {
    for (let i = 7; i >= 1; i--) saveName(`Player ${i}`);
    render(Setup);
    const card = () => document.querySelector('.saved')!;

    expect(card().classList.contains('sticky')).toBe(true);
    tap(button('Show 2 more'));
    expect(card().classList.contains('sticky')).toBe(false);
    tap(button('Show less'));
    tap(button('Edit'));
    expect(card().classList.contains('sticky')).toBe(false);
  });

  it('disables unselected chips when the active team is full', () => {
    const names = ['John', 'Jane', 'Max', 'Ada', 'Lin', 'Bob', 'Eve', 'Ida'];
    for (const name of [...names].reverse()) saveName(name);
    render(Setup);
    tap(button('Teams'));
    tap(button('Show 3 more'));
    for (const name of names.slice(0, 7)) tap(chip(name));

    expect(memberValues(0)).toHaveLength(7);
    expect(chip('Ida').disabled).toBe(true);
    expect(chip('John').disabled).toBe(false);
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

describe('Enter key in Setup', () => {
  it('only confirms the field: no jumping to a gap and no game start', async () => {
    render(Setup);
    for (const [i, name] of ['John', 'Jane'].entries()) {
      inputs()[i].value = name;
      inputs()[i].dispatchEvent(new Event('input', { bubbles: true }));
    }
    inputs()[1].focus();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    inputs()[1].dispatchEvent(enter);
    await tick();

    expect(enter.defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(inputs()[1]);
    expect(view.state).toBeNull();
    expect(inputs().every((i) => i.getAttribute('enterkeyhint') === 'done')).toBe(true);
  });
});

describe('Removing below the minimum', () => {
  const removeButtons = () => [
    ...document.querySelectorAll<HTMLButtonElement>('.icon-button[aria-label^="Remove"]'),
  ];
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
  };

  it('replaces a removed player with an empty field when only two are left', () => {
    render(Setup);
    expect(removeButtons().every((b) => b.disabled)).toBe(true);

    type(inputs()[0], 'John');
    type(inputs()[1], 'Jane');
    document.querySelector<HTMLButtonElement>('[aria-label="Remove John"]')!.click();
    flushSync();
    expect(inputs().map((i) => i.value)).toEqual(['Jane', '']);
  });

  it('replaces a removed team with an empty one, and the last member with an empty field', () => {
    render(Setup);
    button('Teams').click();
    flushSync();
    type(inputs()[0], 'Blue');
    type(inputs()[1], 'John');
    type(inputs()[2], 'Red');

    document.querySelector<HTMLButtonElement>('[aria-label="Remove John"]')!.click();
    flushSync();
    expect(inputs().map((i) => i.value)).toEqual(['Blue', '', 'Red', '']);

    document.querySelector<HTMLButtonElement>('[aria-label="Remove Blue"]')!.click();
    flushSync();
    expect(inputs().map((i) => i.value)).toEqual(['Red', '', '', '']);
  });
});

describe('Active player and finish places', () => {
  // Everyone throws the same pins each round, so all four reach 50 in round 5, in turn order
  function finishAll() {
    for (const pins of [[12], [12], [12], [12], [2]]) {
      for (let i = 0; i < 4; i++) throwPins(pins);
    }
  }
  const cards = () => [...document.querySelectorAll('li')];

  it('marks the active player with the green card and a Throwing label', () => {
    start(['John', 'Jane', 'Max']);
    render(Scoreboard);
    expect(cards()[0].classList.contains('current')).toBe(true);
    expect(cards()[0].textContent).toMatch(/Throwing/);
    expect(cards()[1].textContent).not.toMatch(/Throwing/);
  });

  it('makes finished cards look done, with gold/silver/bronze badges and a crown for the winner', () => {
    start(['John', 'Jane', 'Max', 'Ada']);
    finishAll();
    render(Scoreboard);

    expect(cards().every((c) => c.classList.contains('finished'))).toBe(true);
    const badges = cards().map((c) => c.querySelector('.badge')!);
    expect(badges.map((b) => b.textContent?.trim())).toEqual(['1st', '2nd', '3rd', '4th']);
    expect(
      badges.map((b) => [...b.classList].find((k) => k !== 'badge' && !k.startsWith('svelte-'))),
    ).toEqual(['gold', 'silver', 'bronze', 'plain']);
    expect(badges.map((b) => b.querySelector('svg') !== null)).toEqual([true, false, false, false]);
  });

  it('shows badges on the Results screen only for players who reached 50, and marks the winner', () => {
    start(['John', 'Jane', 'Max']);
    for (const pins of [[12], [12], [1], [12], [12], [1], [12], [12], [1], [12], [12], [1]]) {
      throwPins(pins);
    }
    throwPins([2]); // John reaches 50
    showResults();
    render(Results);

    const badges = [...document.querySelectorAll('.badge')];
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toMatch(/reached 50/);
    expect(cards()[0].classList.contains('first')).toBe(true);
    expect(cards()[1].classList.contains('first')).toBe(false);
  });

  it('marks a player who is out with a struck-through card instead of the miss icons', () => {
    start(['John', 'Jane', 'Max']);
    for (let round = 0; round < 3; round++) {
      throwPins([]); // John misses
      throwPins([5]);
      throwPins([5]);
    }
    render(Scoreboard);

    expect(cards()[0].classList.contains('eliminated')).toBe(true);
    expect(cards()[0].querySelector('.visually-hidden')?.textContent?.trim()).toBe('out');
    expect(cards()[0].querySelector('.misses')).toBeNull();
    expect(cards()[1].classList.contains('eliminated')).toBe(false);
  });

  it('writes places as ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
    ]);
  });
});
