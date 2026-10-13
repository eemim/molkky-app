import { describe, expect, it } from "vitest";
<<<<<<< HEAD
import { Game } from "../src/lib/molkky";
import { gameWithOneFinisher } from "./helpers";
=======
import { Game, newGame, replay, rotateTurnOrder } from "../src/lib/molkky";

// -----------------------------------------------------------------------------
// Test fixtures
// -----------------------------------------------------------------------------

function gameWithOneFinisher(): Game {
  const game = new Game(["John", "Jane"]);
  // John: 12 + 12 + 12 + 12 + 2 = 50. Jane scores 1 each time.
  for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [2, 5]]) {
    game.throw(pins);
  }
  return game;
}

// -----------------------------------------------------------------------------
// Replay validation
// -----------------------------------------------------------------------------

describe("replay validation", () => {
  it.each([-1, 13, 1.5])("rejects %s points", (points) => {
    const result = replay(
      ["John", "Jane"],
      [{ type: "throw", player: 0, points }],
    );

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });

  it("rejects an unknown entry type", () => {
    const result = replay(["John", "Jane"], [{ type: "bogus" } as any]);

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });
});

// -----------------------------------------------------------------------------
// Saved-game ownership
// -----------------------------------------------------------------------------

describe("ownership of the log", () => {
  it("is not changed by editing the copy returned from saved", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);

    const copy = game.saved;
    (copy.log[0] as { points: number }).points = 9;

    expect(game.saved.log[0]).toEqual({ type: "throw", player: 0, points: 6 });
  });

  it("is not changed by editing the object it was restored from", () => {
    const source = new Game(["John", "Jane"]);
    source.throw([6]);

    const saved = JSON.parse(JSON.stringify(source.saved));
    const restored = Game.fromSaved(saved)!;
    saved.log[0].points = 9;

    expect(restored.saved.log[0]).toEqual({
      type: "throw",
      player: 0,
      points: 6,
    });
  });
});
>>>>>>> 3481dea (Rotation for rematch)

// -----------------------------------------------------------------------------
// Game lifecycle
// -----------------------------------------------------------------------------

describe("Game results", () => {
  it("can show results and undo that action", () => {
    const game = gameWithOneFinisher();

    game.showResults();
    expect(game.state.ended).toBe(true);

    game.undo();
    expect(game.state.ended).toBe(false);
  });

  it("records the results action in the log", () => {
    const game = gameWithOneFinisher();

    game.showResults();

    expect(game.saved.log).toHaveLength(10);
    expect(game.saved.log[9]).toEqual({ type: "results" });
  });

  it("ignores throws after the game has ended", () => {
    const game = new Game(["John", "Jane"]);
    // John misses three times in a row, so Jane is the only one left and the game ends
    for (const pins of [[], [1], [], [1], []]) {
      game.throw(pins);
    }
    expect(game.state.ended).toBe(true);

    game.throw([5]);

    expect(game.saved.log).toHaveLength(5);
  });
});

describe("Game", () => {
  it("does nothing when undoing the initial state", () => {
    const game = new Game(["John", "Max"]);
    const initialState = game.state;

    game.undo();

    expect(game.state).toBe(initialState);
  });
});

// -----------------------------------------------------------------------------
// Event log
// -----------------------------------------------------------------------------

describe("throw log", () => {
  it("records who threw and what the throw scored", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([2, 9]); // two pins down = 2 points

    expect(game.saved.log).toEqual([
      { type: "throw", player: 0, points: 6 },
      { type: "throw", player: 1, points: 2 },
    ]);
  });

  it("records a miss as zero points", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([]);

    expect(game.saved.log).toEqual([{ type: "throw", player: 0, points: 0 }]);
  });

  it("removes the last log entry on undo", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([3]);

    game.undo();

    expect(game.saved.log).toEqual([{ type: "throw", player: 0, points: 6 }]);
    expect(game.state.current).toBe(1);
  });

  it("does not record results before anybody has finished", () => {
    const game = new Game(["John", "Jane"]);

    game.showResults();

    expect(game.saved.log).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Input validation
// -----------------------------------------------------------------------------

describe("input validation", () => {
  it.each([
    { pins: [-1] },
    { pins: [0] },
    { pins: [13] },
    { pins: [1.5] },
    { pins: [3, 3] },
    { pins: [NaN] },
  ])("rejects pins $pins", ({ pins }) => {
    const game = new Game(["John", "Jane"]);

    expect(() => game.throw(pins)).toThrow();
    expect(game.saved.log).toEqual([]);
  });

  it("accepts a miss and any set of different pins from 1 to 12", () => {
    const game = new Game(["John", "Jane"]);

    expect(() => game.throw([])).not.toThrow();
    expect(() => game.throw([1, 6, 12])).not.toThrow();
    expect(game.saved.log).toHaveLength(2);
  });

  it.each([
    { names: [] },
    { names: ["John"] },
    { names: ["John", ""] },
    { names: ["John", "   "] },
  ])("rejects the player names $names", ({ names }) => {
    expect(() => new Game(names)).toThrow();
  });

  it("allows two players with the same name", () => {
    const game = new Game(["Max", "Max"]);

    game.throw([5]);

    expect(game.state.players[0].score).toBe(5);
    expect(game.state.players[1].score).toBe(0);
    expect(game.state.current).toBe(1);
  });
});
