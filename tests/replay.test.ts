import { describe, expect, it } from 'vitest';
import { Game, type LogEntry, replay } from '../src/lib/molkky';

// -----------------------------------------------------------------------------
// Replay validation
// -----------------------------------------------------------------------------

describe('replay validation', () => {
  it.each([-1, 13, 1.5])('rejects %s points', (points) => {
    const result = replay(['John', 'Jane'], [{ type: 'throw', player: 0, points }]);

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });

  it('rejects an unknown entry type', () => {
    // Not a valid entry on purpose: replay must reject it
    const bogus = { type: 'bogus' } as unknown as LogEntry;
    const result = replay(['John', 'Jane'], [bogus]);

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });
});

// -----------------------------------------------------------------------------
// Replaying and restoring games
// -----------------------------------------------------------------------------

describe('replay', () => {
  it('rebuilds the same states as the live game', () => {
    const game = new Game(['John', 'Jane']);
    game.throw([6]);
    game.throw([]);
    game.throw([2, 9]);

    const result = replay(['John', 'Jane'], game.saved.log);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.states).toHaveLength(4);
      expect(result.states[3]).toEqual(game.state);
    }
  });

  it('reports a conflict when a throw belongs to the wrong player', () => {
    const result = replay(['John', 'Jane'], [{ type: 'throw', player: 1, points: 3 }]);

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });

  it('reports a conflict when results come before anybody has finished', () => {
    const result = replay(
      ['John', 'Jane'],
      [{ type: 'throw', player: 0, points: 3 }, { type: 'results' }],
    );

    expect(result).toEqual({ ok: false, conflictAt: 1 });
  });
});
