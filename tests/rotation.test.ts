import { describe, expect, it } from "vitest";
import { rotateTurnOrder } from "../src/lib/molkky";

// Who throws right after `name` in this order
function successor(order: string[], name: string): string {
  return order[(order.indexOf(name) + 1) % order.length];
}

describe("rotateTurnOrder", () => {
  it("moves the last player to the front", () => {
    expect(rotateTurnOrder(["John", "Jane", "Max"])).toEqual([
      "Max",
      "John",
      "Jane",
    ]);
  });

  it("swaps two players", () => {
    expect(rotateTurnOrder(["John", "Jane"])).toEqual(["Jane", "John"]);
  });

  it("keeps the throwing cycle: everyone still throws after the same player", () => {
    const before = ["John", "Jane", "Max"];
    const after = rotateTurnOrder(before);

    for (const name of before) {
      expect(successor(after, name)).toBe(successor(before, name));
    }
  });

  it("gives every player a turn to start over repeated rematches", () => {
    let order = ["John", "Jane", "Max"];
    const starters: string[] = [];

    for (let i = 0; i < 3; i++) {
      order = rotateTurnOrder(order);
      starters.push(order[0]);
    }

    expect(starters).toEqual(["Max", "Jane", "John"]);
    expect(order).toEqual(["John", "Jane", "Max"]); // back where we began
  });

  it("does not change the list it was given", () => {
    const names = ["John", "Jane", "Max"];

    rotateTurnOrder(names);

    expect(names).toEqual(["John", "Jane", "Max"]);
  });

  // it("returns a copy when there is nothing to rotate", () => {
  //   const one = ["John"];
  //
  //   expect(rotateTurnOrder(one)).toEqual(["John"]);
  //   expect(rotateTurnOrder(one)).not.toBe(one);
  //   expect(rotateTurnOrder([])).toEqual([]);
  // });
});
