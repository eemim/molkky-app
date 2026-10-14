import { describe, expect, it } from "vitest";
import {
  Game,
  MAX_TEAM_SIZE,
  currentThrower,
  memberStats,
  newGame,
  rotateTurnOrder,
  validRoster,
} from "../src/lib/molkky";

// Team Red: John then Jane. Team Blue: Max only.
const names = ["Red", "Blue"];
const members = [["John", "Jane"], ["Max"]];

// Red: John 5, Jane miss, John 6, Jane 4. Blue: Max 3, Max 2 (two pins), Max 1.
function teamGame(): Game {
  const game = new Game(names, members);
  for (const pins of [[5], [3], [], [2, 7], [6], [1], [4]]) {
    game.throw(pins);
  }
  return game;
}

describe("team setup", () => {
  it("gives each team its members, and individuals none", () => {
    const teams = newGame(names, members);
    const individuals = newGame(["John", "Jane"]);

    expect(teams.players[0].members).toEqual(["John", "Jane"]);
    expect(teams.players[1].members).toEqual(["Max"]);
    expect(individuals.players[0].members).toEqual([]);
  });

  it("accepts teams of one to the maximum size, of different sizes", () => {
    const biggest = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => `Player ${i + 1}`);

    expect(validRoster(names, [["John"], biggest])).toBe(true);
  });

  it.each([
    { why: "fewer member lists than teams", members: [["John"]] },
    { why: "an empty team", members: [["John"], []] },
    { why: "a team over the size limit", members: [["John"], Array(MAX_TEAM_SIZE + 1).fill("Max")] },
    { why: "a blank member name", members: [["John", " "], ["Max"]] },
    { why: "a team that is not a list", members: [["John"], "Max"] },
  ])("rejects $why", ({ members }) => {
    expect(validRoster(names, members)).toBe(false);
    expect(() => new Game(names, members as string[][])).toThrow();
  });

  it("allows members with the same name", () => {
    expect(validRoster(names, [["Max", "Max"], ["Max"]])).toBe(true);
  });

  it("is not affected by later changes to the members it was created with", () => {
    const team = [["John", "Jane"], ["Max"]];
    const game = new Game(names, team);

    team[0][0] = "Eve";

    expect(game.state.players[0].members).toEqual(["John", "Jane"]);
    expect(game.saved.members).toEqual([["John", "Jane"], ["Max"]]);
  });
});

describe("who throws", () => {
  it("passes the throw to the next member of the team each time", () => {
    const [red, blue] = teamGame().throws;

    expect(red.map((row) => row.member)).toEqual(["John", "Jane", "John", "Jane"]);
    expect(blue.map((row) => row.member)).toEqual(["Max", "Max", "Max"]);
  });

  it("does not leave out a member who missed", () => {
    // Jane's miss (Red's second throw) does not change who throws next
    const [red] = teamGame().throws;

    expect(red[1]).toMatchObject({ member: "Jane", points: 0 });
    expect(red[2].member).toBe("John");
  });

  it("leaves out the member field for individuals", () => {
    const game = new Game(["John", "Jane"]);
    game.throw([5]);

    expect(game.throws[0][0]).not.toHaveProperty("member");
  });

  it("names the member who throws now", () => {
    const game = new Game(names, members);
    expect(currentThrower(game.state, game.throws)).toBe("John");

    game.throw([5]); // John, Red
    expect(currentThrower(game.state, game.throws)).toBe("Max");

    game.throw([3]); // Max, Blue
    expect(currentThrower(game.state, game.throws)).toBe("Jane");
  });

  it("names nobody for individuals or when the game is over", () => {
    const solo = new Game(["John", "Jane"]);
    expect(currentThrower(solo.state, solo.throws)).toBeNull();

    const over = new Game(names, members);
    for (const pins of [[], [1], [], [1], []]) over.throw(pins); // Red is out
    expect(over.state.ended).toBe(true);
    expect(currentThrower(over.state, over.throws)).toBeNull();
  });
});

describe("team misses", () => {
  it("eliminates a team after three misses in a row, whoever threw them", () => {
    const game = new Game(names, members);
    // John, Jane and John miss for Red, with Blue scoring in between
    for (const pins of [[], [1], [], [1], []]) game.throw(pins);

    const [red] = game.throws;

    expect(game.state.players[0]).toMatchObject({ eliminated: true, misses: 3 });
    expect(red[2]).toMatchObject({ member: "John", event: "eliminated" });
    expect(game.state.ended).toBe(true); // Blue is the only team left
  });

  it("counts each member's own misses in the summary", () => {
    const [red] = teamGame().throws;

    // The team's consecutive misses were reset by John's next throw
    expect(teamGame().state.players[0].misses).toBe(0);
    expect(memberStats(red, ["John", "Jane"])[1].misses).toBe(1);
  });
});

describe("member summary", () => {
  it("adds up each member's throws, points and misses", () => {
    const [red, blue] = teamGame().throws;

    expect(memberStats(red, ["John", "Jane"])).toEqual([
      { name: "John", throws: 2, points: 11, misses: 0 },
      { name: "Jane", throws: 2, points: 4, misses: 1 },
    ]);
    expect(memberStats(blue, ["Max"])).toEqual([
      { name: "Max", throws: 3, points: 6, misses: 0 },
    ]);
  });

  it("is empty for an individual", () => {
    expect(memberStats([], [])).toEqual([]);
  });
});

describe("team games: editing, saving and undo", () => {
  it("edits a member's throw without changing who threw what", () => {
    const game = teamGame();

    const preview = game.applyEdit(0, 9); // John's first throw: 5 becomes 9

    expect(preview?.removed).toBe(0);
    expect(game.state.players[0].score).toBe(19); // 9 + 0 + 6 + 4
    expect(game.throws[0].map((row) => row.member)).toEqual([
      "John",
      "Jane",
      "John",
      "Jane",
    ]);
  });

  it("restores a team game from its saved form", () => {
    const game = teamGame();

    const restored = Game.fromSaved(JSON.parse(JSON.stringify(game.saved)));

    expect(restored).not.toBeNull();
    expect(restored!.state).toEqual(game.state);
    expect(restored!.throws).toEqual(game.throws);
    expect(restored!.saved.members).toEqual(members);
  });

  it("keeps the members out of the saved form of an individual game", () => {
    expect(new Game(["John", "Jane"]).saved).not.toHaveProperty("members");
  });

  it("refuses a saved team game whose members do not fit the teams", () => {
    const saved = { names, members: [["John"]], log: [] };

    expect(Game.fromSaved(saved)).toBeNull();
  });

  it("undo takes the last throw back to the same member", () => {
    const game = new Game(names, members);
    game.throw([5]); // John
    game.throw([3]); // Max

    game.undo();

    expect(currentThrower(game.state, game.throws)).toBe("Max");
    game.undo();
    expect(currentThrower(game.state, game.throws)).toBe("John");
  });
});

describe("rotateTurnOrder with teams", () => {
  it("rotates names and member lists the same way", () => {
    const teamNames = ["Red", "Blue", "Green"];
    const teamMembers = [["John", "Jane"], ["Max"], ["Jane", "Max"]];

    expect(rotateTurnOrder(teamNames)).toEqual(["Green", "Red", "Blue"]);
    expect(rotateTurnOrder(teamMembers)).toEqual([["Jane", "Max"], ["John", "Jane"], ["Max"]]);
  });
});
