import { describe, expect, it } from "vitest";
import { Game, newGame, replay } from "../src/lib/molkky";

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

  it("restores a game that is showing results", () => {
    const game = gameWithOneFinisher();
    game.showResults();

    const restored = Game.fromSaved(JSON.parse(JSON.stringify(game.saved)));

    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(game.state);
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
// Editing the table
// -----------------------------------------------------------------------------

describe("editing a throw", () => {
  it("changes an earlier throw and everything that follows from it", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]); // John
    game.throw([2, 9]); // Jane, two pins = 2 points
    game.throw([4]); // John

    const preview = game.applyEdit(0, 9); // John's first throw: 6 becomes 9

    expect(preview?.removed).toBe(0);
    expect(game.state.players[0].score).toBe(13);
    expect(game.state.current).toBe(1);
    expect(game.throws[0].map((row) => row.points)).toEqual([9, 4]);
  });

  it("removes later throws that no longer fit", () => {
    const game = new Game(["John", "Jane"]);
    // John: 5, miss, miss, 3. Jane: 1, 1, 1.
    for (const pins of [[5], [1], [], [1], [], [1], [3]]) {
      game.throw(pins);
    }

    // John's first throw becomes a miss: three misses in a row, so she is out,
    // Jane is the only one left and the game ends. The last two entries no longer fit.
    const preview = game.applyEdit(0, 0);

    expect(preview?.removed).toBe(2);
    expect(game.saved.log).toHaveLength(5);
    expect(game.state.players[0].eliminated).toBe(true);
    expect(game.state.ended).toBe(true);
  });

  it("previews an edit without changing the game", () => {
    const game = new Game(["John", "Jane"]);
    for (const pins of [[5], [1], [], [1], [], [1], [3]]) {
      game.throw(pins);
    }
    const before = game.saved;

    const preview = game.previewEdit(0, 0);

    expect(preview?.removed).toBe(2);
    expect(game.saved).toEqual(before);
    expect(game.state.ended).toBe(false);
  });

  it("rejects edits that make no sense", () => {
    const game = gameWithOneFinisher();
    game.showResults();

    expect(game.previewEdit(9, 3)).toBeNull(); // the results entry
    expect(game.previewEdit(99, 3)).toBeNull(); // no such entry
    expect(game.previewEdit(0, 13)).toBeNull(); // too many points
    expect(game.previewEdit(0, -1)).toBeNull();
    expect(game.previewEdit(0, 1.5)).toBeNull();
  });

  it("restores an edited game from its saved log", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([2, 9]);
    game.throw([4]);
    game.applyEdit(0, 9);

    const restored = Game.fromSaved(JSON.parse(JSON.stringify(game.saved)));

    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(game.state);
  });

  it("undo after an edit removes the last throw, not the edit", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([2, 9]);
    game.throw([4]);
    game.applyEdit(0, 9);

    game.undo();

    expect(game.state.players[0].score).toBe(9);
    expect(game.saved.log).toHaveLength(2);
  });

  it("drops only the later throws of a player who is now out", () => {
    const game = new Game(["John", "Jane", "Max"]);
    // Round by round. John misses in rounds 1 and 2, then scores 6 in round 3.
    const throws = [
      [], [3], [4], //     round 1
      [], [3], [4], //     round 2
      [6], [3], [4], //    round 3  <- John's throw at index 6 is the one we edit
      [7], [3], [4], //    round 4
      [5], [3], //         round 5, Max has not thrown yet
    ];
    for (const pins of throws) game.throw(pins);
 
    // John's round 3 becomes a miss: three in a row, so he is out.
    const preview = game.applyEdit(6, 0);
 
    expect(preview?.removed).toBe(2); // only John's round 4 and 5 throws
    expect(game.saved.log).toHaveLength(12);
    expect(game.state.players[0]).toMatchObject({ score: 0, eliminated: true });
    expect(game.state.players[1].score).toBe(15); // Jane keeps all five throws
    expect(game.state.players[2].score).toBe(16); // Max keeps all four throws
    expect(game.state.current).toBe(2); // still Max's turn
  });
 
  it("cuts the log when an edit puts a player back in the game", () => {
    const game = new Game(["John", "Jane", "Max"]);
    const throws = [
      [], [3], [4], //  round 1
      [], [3], [4], //  round 2
      [], [3], [4], //  round 3: John misses a third time and is out
      [3], [4], //      round 4 without John
    ];
    for (const pins of throws) game.throw(pins);
 
    // John's third throw becomes a 5, so he is not out and has to throw in round 4.
    const preview = game.applyEdit(6, 5);
 
    expect(preview?.removed).toBe(2); // Jane's and Max's round 4 throws
    expect(game.saved.log).toHaveLength(9);
    expect(game.state.current).toBe(0); // John's turn again
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
// Replaying and restoring games
// -----------------------------------------------------------------------------

describe("replay", () => {
  it("rebuilds the same states as the live game", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([]);
    game.throw([2, 9]);

    const result = replay(["John", "Jane"], game.saved.log);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.states).toHaveLength(4);
      expect(result.states[3]).toEqual(game.state);
    }
  });

  it("reports a conflict when a throw belongs to the wrong player", () => {
    const result = replay(
      ["John", "Jane"],
      [{ type: "throw", player: 1, points: 3 }],
    );

    expect(result).toEqual({ ok: false, conflictAt: 0 });
  });

  it("reports a conflict when results come before anybody has finished", () => {
    const result = replay(
      ["John", "Jane"],
      [{ type: "throw", player: 0, points: 3 }, { type: "results" }],
    );

    expect(result).toEqual({ ok: false, conflictAt: 1 });
  });
});

describe("saving and restoring", () => {
  it("survives a JSON round trip, as localStorage would do", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([]);

    const saved = JSON.parse(JSON.stringify(game.saved));
    const restored = Game.fromSaved(saved);

    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(game.state);
  });

  it("can still undo after being restored", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);

    const restored = Game.fromSaved(JSON.parse(JSON.stringify(game.saved)))!;
    expect(restored.state.players[0].score).toBe(6);

    restored.undo();

    expect(restored.state.players[0].score).toBe(0);
    expect(restored.state).toEqual(newGame(["John", "Jane"]));
  });

  it("refuses a saved game whose log does not replay", () => {
    const saved = {
      names: ["John", "Jane"],
      log: [{ type: "throw" as const, player: 1, points: 3 }],
    };

    expect(Game.fromSaved(saved)).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Throw-history projection
// -----------------------------------------------------------------------------

describe("throw table", () => {
  it("lists each player's rounds with points and running total", () => {
    const game = new Game(["John", "Jane"]);
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

  it("marks the throw that reaches 50 and ignores the results entry", () => {
    const game = new Game(["John", "Jane"]);
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
      event: "finished",
    });
    expect(jane).toHaveLength(4);
  });

  it("marks a throw that goes over 50 and drops the player to 25", () => {
    const game = new Game(["John", "Jane"]);
    for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [5]]) {
      game.throw(pins);
    }

    const [john] = game.throws;

    expect(john[4]).toMatchObject({ points: 5, total: 25, event: "reset" });
  });

  it("marks the throw that eliminates a player", () => {
    const game = new Game(["John", "Jane"]);
    for (const pins of [[], [1], [], [1], []]) {
      game.throw(pins);
    }

    const [john] = game.throws;

    expect(john).toHaveLength(3);
    expect(john[2]).toMatchObject({ points: 0, event: "eliminated" });
  });

  it("follows undo", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([6]);
    game.throw([3]);

    game.undo();

    expect(game.throws[0]).toHaveLength(1);
    expect(game.throws[1]).toHaveLength(0);
  });
});
