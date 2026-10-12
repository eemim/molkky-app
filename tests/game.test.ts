import { describe, expect, it } from "vitest";
import { Game, newGame, replay } from "../src/lib/molkky";

function gameWithOneFinisher(): Game {
  const game = new Game(["John", "Jane"]);
  // John: 12 + 12 + 12 + 12 + 2 = 50. Jane scores 1 each time.
  for (const pins of [[12], [1], [12], [1], [12], [1], [12], [1], [2, 5]]) {
    game.throw(pins);
  }
  return game;
}

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
