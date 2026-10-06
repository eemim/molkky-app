import { describe, expect, it } from "vitest";
import {
  Game,
  applyThrow,
  canShowResults,
  endGame,
  isActive,
  newGame,
  pointsFor,
  ranking,
} from "../lib/molkky";

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

describe("newGame", () => {
  it("initializes players and game counters", () => {
    expect(newGame(["John", "Doe"])).toEqual({
      players: [
        {
          name: "John",
          score: 0,
          misses: 0,
          eliminated: false,
          finishedAt: null,
          eliminatedAt: null,
        },
        {
          name: "Doe",
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
    const [active, finished, eliminated] = newGame(["John", "Doe", "Jane"]).players;
    finished.finishedAt = 1;
    eliminated.eliminated = true;

    expect(isActive(active)).toBe(true);
    expect(isActive(finished)).toBe(false);
    expect(isActive(eliminated)).toBe(false);
  });
});

describe("applyThrow", () => {
  it("advances to the next active player after a score", () => {
    const state = applyThrow(newGame(["John", "Doe", "Jane"]), [7]);

    expect(state.players[0]).toMatchObject({ score: 7, misses: 0 });
    expect(state.current).toBe(1);
  });

  it("wraps turns from the final player to the first", () => {
    const state = newGame(["John", "Doe"]);
    state.current = 1;

    expect(applyThrow(state, [4]).current).toBe(0);
  });

  it("skips players who have been eliminated or finished", () => {
    const state = newGame(["John", "Doe", "Jane"]);
    state.players[1].eliminated = true;
    state.players[2].finishedAt = 1;

    expect(applyThrow(state, [2]).current).toBe(0);
  });

  it("resets a score over 50 to 25", () => {
    const state = newGame(["John", "Doe"]);
    state.players[0].score = 48;

    expect(applyThrow(state, [5]).players[0].score).toBe(25);
  });

  it("clears consecutive misses after a scoring throw", () => {
    const state = newGame(["John", "Doe"]);
    state.players[0].misses = 2;

    expect(applyThrow(state, [5]).players[0]).toMatchObject({
      score: 5,
      misses: 0,
      eliminated: false,
    });
  });

  it("eliminates a player after three consecutive misses and records their drop order", () => {
    let state = newGame(["John", "Doe"]);

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
    const state = newGame(["John", "Doe"]);
    state.players[0].score = 42;

    const nextState = applyThrow(state, [8]);

    expect(nextState.players[0]).toMatchObject({ score: 50, finishedAt: 1 });
    expect(nextState.finishCount).toBe(1);
    expect(nextState.current).toBe(1);
  });

  it("ends automatically when every player has finished or been eliminated", () => {
    const state = newGame(["John", "Doe"]);
    state.players[0].finishedAt = 1;
    state.finishCount = 1;
    state.players[1].score = 49;
    state.current = 1;

    const nextState = applyThrow(state, [1]);

    expect(nextState.ended).toBe(true);
    expect(nextState.finishCount).toBe(2);
  });

  it("returns the same state when the game has ended", () => {
    const state = newGame(["John", "Doe"]);
    state.ended = true;

    expect(applyThrow(state, [6])).toBe(state);
  });
});

describe("results", () => {
  it("enables results only after a player has finished and before the game ends", () => {
    const state = newGame(["John", "Doe"]);

    expect(canShowResults(state)).toBe(false);

    state.finishCount = 1;
    expect(canShowResults(state)).toBe(true);

    state.ended = true;
    expect(canShowResults(state)).toBe(false);
  });

  it("does not end the game manually before a player finishes", () => {
    const state = newGame(["John", "Doe"]);

    expect(endGame(state)).toBe(state);
  });

  it("ends the game manually after a player finishes", () => {
    const state = newGame(["John", "Doe"]);
    state.finishCount = 1;

    expect(endGame(state)).toEqual({ ...state, ended: true });
  });
});

describe("ranking", () => {
  it("orders finishers, active players by score with tied ranks, then dropped players", () => {
    const state = newGame(["First", "Second", "Tied", "Dropped first", "Dropped last"]);
    const [first, second, tied, droppedFirst, droppedLast] = state.players;

    first.score = 50;
    first.finishedAt = 1;
    second.score = 32;
    tied.score = 32;
    droppedFirst.eliminated = true;
    droppedFirst.eliminatedAt = 1;
    droppedLast.eliminated = true;
    droppedLast.eliminatedAt = 2;

    expect(ranking(state)).toEqual([
      { player: first, rank: 1 },
      { player: second, rank: 2 },
      { player: tied, rank: 2 },
      { player: droppedLast, rank: 4 },
      { player: droppedFirst, rank: 5 },
    ]);
  });
});

describe("Game", () => {
  it("can show results and undo that action", () => {
    const game = new Game(["John", "Doe"]);
    game.state.finishCount = 1;

    game.showResults();
    expect(game.state.ended).toBe(true);

    game.undo();
    expect(game.state.ended).toBe(false);
  });

  it("does nothing when undoing the initial state", () => {
    const game = new Game(["John", "Doe"]);
    const initialState = game.state;

    game.undo();

    expect(game.state).toBe(initialState);
  });
});
