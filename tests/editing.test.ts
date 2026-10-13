import { describe, expect, it } from "vitest";
import { Game } from "../src/lib/molkky";
import { gameWithOneFinisher } from "./helpers";

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
      [],
      [3],
      [4], //     round 1
      [],
      [3],
      [4], //     round 2
      [6],
      [3],
      [4], //    round 3  <- John's throw at index 6 is the one we edit
      [7],
      [3],
      [4], //    round 4
      [5],
      [3], //         round 5, Max has not thrown yet
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
      [],
      [3],
      [4], //  round 1
      [],
      [3],
      [4], //  round 2
      [],
      [3],
      [4], //  round 3: John misses a third time and is out
      [3],
      [4], //      round 4 without John
    ];
    for (const pins of throws) game.throw(pins);

    // John's third throw becomes a 5, so he is not out and has to throw in round 4.
    const preview = game.applyEdit(6, 5);

    expect(preview?.removed).toBe(2); // Jane's and Max's round 4 throws
    expect(game.saved.log).toHaveLength(9);
    expect(game.state.current).toBe(0); // John's turn again
  });
});
