import { describe, expect, it } from 'vitest';
import { Game } from '../src/lib/molkky';

// -----------------------------------------------------------------------------
// Throw-history projection
// -----------------------------------------------------------------------------

describe('throw table', () => {
  it("lists each player's rounds with points and running total", () => {
    const game = new Game(['John', 'Jane']);
    game.throw([6]); // John
    game.throw([2, 9]); // Jane, two pins = 2 points
    game.throw([4]); // John
    game.throw([]); // Jane misses

    const [john, jane] = game.throws;

    expect(john).toEqual([
      { index: 0, round: 1, points: 6, total: 6, event: null },
      { index: 2, round: 2, points: 4, total: 10, event: null },
    ]);
    expect(jane).toEqual([
      { index: 1, round: 1, points: 2, total: 2, event: null },
      { index: 3, round: 2, points: 0, total: 2, event: null },
    ]);
  });

  it('marks the throw that reaches 50 and ignores the results entry', () => {
    const game = new Game(['John', 'Jane']);
    for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [2, 5]]) {
      game.throw(pins);
    }
    game.showResults();

    const [john, jane] = game.throws;

    expect(john).toHaveLength(5);
    expect(john[4]).toMatchObject({
      round: 5,
      points: 2,
      total: 50,
      event: 'finished',
    });
    expect(jane).toHaveLength(4);
  });

  it('marks a throw that goes over 50 and drops the player to 25', () => {
    const game = new Game(['John', 'Jane']);
    for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [5]]) {
      game.throw(pins);
    }

    const [john] = game.throws;

    expect(john[4]).toMatchObject({ points: 5, total: 25, event: 'reset' });
  });

  it('marks the throw that eliminates a player', () => {
    const game = new Game(['John', 'Jane']);
    for (const pins of [[], [1], [], [1], []]) {
      game.throw(pins);
    }

    const [john] = game.throws;

    expect(john).toHaveLength(3);
    expect(john[2]).toMatchObject({ points: 0, event: 'eliminated' });
  });

  it('follows undo', () => {
    const game = new Game(['John', 'Jane']);
    game.throw([6]);
    game.throw([3]);

    game.undo();

    expect(game.throws[0]).toHaveLength(1);
    expect(game.throws[1]).toHaveLength(0);
  });
});
