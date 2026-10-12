import { describe, expect, it } from "vitest";
import { canShowResults, endGame, newGame, ranking } from "../src/lib/molkky";

describe("results", () => {
  it("enables results only after a player has finished and before the game ends", () => {
    const state = newGame(["John", "Max"]);

    expect(canShowResults(state)).toBe(false);

    state.finishCount = 1;
    expect(canShowResults(state)).toBe(true);

    state.ended = true;
    expect(canShowResults(state)).toBe(false);
  });

  it("does not end the game manually before a player finishes", () => {
    const state = newGame(["John", "Max"]);

    expect(endGame(state)).toBe(state);
  });

  it("ends the game manually after a player finishes", () => {
    const state = newGame(["John", "Max"]);
    state.finishCount = 1;

    expect(endGame(state)).toEqual({ ...state, ended: true });
  });
});

describe("ranking", () => {
  it("orders finishers, active players by score with tied ranks, then dropped players", () => {
    const state = newGame([
      "First",
      "Second",
      "Tied",
      "Dropped first",
      "Dropped last",
    ]);
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

  it("orders several finishers by finishing order", () => {
    const state = newGame(["John", "Max", "Jane"]);
    state.players[0].finishedAt = 2;
    state.players[1].finishedAt = 1;
    state.players[2].score = 20;

    const names = ranking(state).map((r) => r.player.name);

    expect(names).toEqual(["Max", "John", "Jane"]);
  });
});
