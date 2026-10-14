import { describe, expect, it } from "vitest";
import { applyThrow, isActive, newGame, pointsFor } from "../src/lib/molkky.ts";

// -----------------------------------------------------------------------------
// Point calculation
// -----------------------------------------------------------------------------

describe("pointsFor", () => {
  it("scores a miss as zero", () => {
    expect(pointsFor([])).toBe(0);
  });

  it("scores a single pin by its face value", () => {
    expect(pointsFor([8])).toBe(8);
  });

  it("scores multiple pins by the number knocked down", () => {
    expect(pointsFor([3, 7, 12])).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// Game initialization and player activity
// -----------------------------------------------------------------------------

describe("newGame", () => {
  it("initializes players and game counters", () => {
    expect(newGame(["John", "Max"])).toEqual({
      players: [
        {
          name: "John",
          members: [],
          score: 0,
          misses: 0,
          eliminated: false,
          finishedAt: null,
          eliminatedAt: null,
        },
        {
          name: "Max",
          members: [],
          score: 0,
          misses: 0,
          eliminated: false,
          finishedAt: null,
          eliminatedAt: null,
        },
      ],
      current: 0,
      finishCount: 0,
      dropCount: 0,
      ended: false,
    });
  });
});

describe("player activity", () => {
  it("considers only non-eliminated players who have not finished active", () => {
    const [active, finished, eliminated] = newGame([
      "John",
      "Max",
      "Jane",
    ]).players;
    finished.finishedAt = 1;
    eliminated.eliminated = true;

    expect(isActive(active)).toBe(true);
    expect(isActive(finished)).toBe(false);
    expect(isActive(eliminated)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Turn progression and scoring rules
// -----------------------------------------------------------------------------

describe("applyThrow", () => {
  it("advances to the next active player after a score", () => {
    const state = applyThrow(newGame(["John", "Max", "Jane"]), [7]);

    expect(state.players[0]).toMatchObject({ score: 7, misses: 0 });
    expect(state.current).toBe(1);
  });

  it("wraps turns from the final player to the first", () => {
    const state = newGame(["John", "Max"]);
    state.current = 1;

    expect(applyThrow(state, [4]).current).toBe(0);
  });

  it("skips players who have been eliminated or finished", () => {
    const state = newGame(["John", "Max", "Jane"]);
    state.players[1].eliminated = true;
    state.players[2].finishedAt = 1;

    expect(applyThrow(state, [2]).current).toBe(0);
  });

  it("resets a score over 50 to 25", () => {
    const state = newGame(["John", "Max"]);
    state.players[0].score = 48;

    expect(applyThrow(state, [5]).players[0].score).toBe(25);
  });

  it("clears consecutive misses after a scoring throw", () => {
    const state = newGame(["John", "Max"]);
    state.players[0].misses = 2;

    expect(applyThrow(state, [5]).players[0]).toMatchObject({
      score: 5,
      misses: 0,
      eliminated: false,
    });
  });

  it("eliminates a player after three consecutive misses and records their drop order", () => {
    let state = newGame(["John", "Max"]);

    for (let miss = 0; miss < 3; miss += 1) {
      state = applyThrow(state, []);
      if (miss < 2) state = applyThrow(state, [1]);
    }

    expect(state.players[0]).toMatchObject({
      misses: 3,
      eliminated: true,
      eliminatedAt: 1,
    });
    expect(state.dropCount).toBe(1);
    expect(state.ended).toBe(true);
  });

  it("records finishing order and removes a player who reaches exactly 50 from turns", () => {
    const state = newGame(["John", "Max"]);
    state.players[0].score = 42;

    const nextState = applyThrow(state, [8]);

    expect(nextState.players[0]).toMatchObject({ score: 50, finishedAt: 1 });
    expect(nextState.finishCount).toBe(1);
    expect(nextState.current).toBe(1);
  });

  it("ends automatically when the last active player finishes", () => {
    const state = newGame(["John", "Max"]);
    state.players[0].finishedAt = 1;
    state.finishCount = 1;
    state.players[1].score = 49;
    state.current = 1;

    const nextState = applyThrow(state, [1]);

    expect(nextState.ended).toBe(true);
    expect(nextState.finishCount).toBe(2);
  });

  it("keeps going when one player is left but somebody has already finished", () => {
    const state = newGame(["John", "Jane", "Max"]);
    state.players[0].score = 50;
    state.players[0].finishedAt = 1;
    state.players[2].eliminated = true;
    state.players[2].eliminatedAt = 1;
    state.finishCount = 1;
    state.dropCount = 1;
    state.current = 1;

    const nextState = applyThrow(state, [3]);

    expect(nextState.ended).toBe(false);
    expect(nextState.current).toBe(1);
  });

  it("returns the same state when the game has ended", () => {
    const state = newGame(["John", "Max"]);
    state.ended = true;

    expect(applyThrow(state, [6])).toBe(state);
  });
});
