import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_NAME_LENGTH,
  MAX_SAVED_NAMES,
  addName,
  canSave,
  isValidNames,
  removeName,
  touchNames,
} from '../src/lib/names';
import {
  forgetName,
  loadSavedNames,
  markPlayed,
  saveName,
  savedNames,
  toggleSavedName,
} from '../src/lib/namesStore.svelte';

const STORAGE_KEY = 'molkky-names-v1';
const many = (count: number) => Array.from({ length: count }, (_, i) => `Player ${i + 1}`);

// -----------------------------------------------------------------------------
// Pure list helpers
// -----------------------------------------------------------------------------

describe('addName', () => {
  it('adds to the front, trimmed', () => {
    expect(addName(['Jane'], '  John ')).toEqual(['John', 'Jane']);
  });

  it('moves an already saved name to the front instead of duplicating it', () => {
    expect(addName(['John', 'Jane', 'Max'], 'Max')).toEqual(['Max', 'John', 'Jane']);
  });

  it('keeps different capitalisations as different names', () => {
    expect(addName(['John'], 'john')).toEqual(['john', 'John']);
  });

  it('ignores blank names', () => {
    expect(addName(['John'], '   ')).toEqual(['John']);
  });

  it('does not add past the cap, but can still move a saved name', () => {
    const full = many(MAX_SAVED_NAMES);
    expect(addName(full, 'John')).toEqual(full);
    expect(addName(full, 'Player 5')[0]).toBe('Player 5');
  });

  it('does not change the list it was given', () => {
    const names = ['Jane'];
    addName(names, 'John');
    expect(names).toEqual(['Jane']);
  });
});

describe('canSave', () => {
  it('needs a non-blank name of reasonable length and room in the list', () => {
    expect(canSave([], 'John')).toBe(true);
    expect(canSave([], ' ')).toBe(false);
    expect(canSave([], 'x'.repeat(MAX_NAME_LENGTH + 1))).toBe(false);
    expect(canSave(many(MAX_SAVED_NAMES), 'John')).toBe(false);
    expect(canSave(many(MAX_SAVED_NAMES), 'Player 1')).toBe(true);
  });
});

describe('removeName', () => {
  it('removes only the exact name', () => {
    expect(removeName(['John', 'john', 'Jane'], 'John')).toEqual(['john', 'Jane']);
  });
});

describe('touchNames', () => {
  it('moves played saved names to the front in playing order, and adds nothing', () => {
    expect(touchNames(['John', 'Jane', 'Max'], ['Max', 'Ada', 'Jane'])).toEqual([
      'Max',
      'Jane',
      'John',
    ]);
  });

  it('handles the same name played twice', () => {
    expect(touchNames(['John', 'Jane'], ['Jane', 'Jane'])).toEqual(['Jane', 'John']);
  });
});

describe('isValidNames', () => {
  it('accepts a list of distinct, trimmed, non-empty names', () => {
    expect(isValidNames([])).toBe(true);
    expect(isValidNames(['John', 'john'])).toBe(true);
  });

  it.each([
    ['not an array', { names: ['John'] }],
    ['a non-string', ['John', 3]],
    ['an empty name', ['']],
    ['untrimmed', [' John']],
    ['a duplicate', ['John', 'John']],
    ['too long a name', ['x'.repeat(MAX_NAME_LENGTH + 1)]],
    ['too many names', many(MAX_SAVED_NAMES + 1)],
  ])('rejects %s', (_, value) => {
    expect(isValidNames(value)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Store and localStorage
// -----------------------------------------------------------------------------

describe('names store', () => {
  beforeEach(() => {
    localStorage.clear();
    loadSavedNames();
  });

  it('saves to localStorage and loads it back', () => {
    saveName('John');
    saveName('Jane');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['Jane', 'John']);

    savedNames.list = [];
    loadSavedNames();
    expect(savedNames.list).toEqual(['Jane', 'John']);
  });

  it('toggles a name on and off', () => {
    toggleSavedName('John');
    expect(savedNames.list).toEqual(['John']);
    toggleSavedName(' John ');
    expect(savedNames.list).toEqual([]);
  });

  it('forgets a name', () => {
    saveName('John');
    saveName('Jane');
    forgetName('John');
    expect(savedNames.list).toEqual(['Jane']);
  });

  it('moves played names to the front when a game starts', () => {
    for (const name of ['John', 'Jane', 'Max']) saveName(name);
    markPlayed(['John', 'Ada']);
    expect(savedNames.list).toEqual(['John', 'Max', 'Jane']);
  });

  it.each([
    ['broken JSON', '{not json'],
    ['the wrong shape', JSON.stringify({ list: ['John'] })],
    ['a bad entry', JSON.stringify(['John', ''])],
  ])('ignores %s without crashing', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    expect(() => loadSavedNames()).not.toThrow();
    expect(savedNames.list).toEqual([]);
  });
});
