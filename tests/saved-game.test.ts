import { describe, expect, it } from "vitest";
import { Game, newGame } from "../src/lib/molkky";
import { gameWithOneFinisher } from "./helpers";

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

  it("is not affected by later changes to the names it was created with", () => {
    const names = ["John", "Jane"];
    const game = new Game(names);

    names[0] = "Max";

    expect(game.saved.names).toEqual(["John", "Jane"]);
    expect(game.state.players[0].name).toBe("John");
  });
});

// -----------------------------------------------------------------------------
// Saving and restoring
// -----------------------------------------------------------------------------

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

  it("restores a game that is showing results", () => {
    const game = gameWithOneFinisher();
    game.showResults();

    const restored = Game.fromSaved(JSON.parse(JSON.stringify(game.saved)));

    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(game.state);
  });

  it("refuses to restore a saved game with unusable names", () => {
    expect(Game.fromSaved({ names: ["John"], log: [] })).toBeNull();
    expect(Game.fromSaved({ names: ["John", " "], log: [] })).toBeNull();
  });
});
