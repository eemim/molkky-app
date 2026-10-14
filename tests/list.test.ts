import { describe, expect, it } from "vitest";
import { moveItem } from "../src/lib/list";

describe("moveItem", () => {
  it("moves an item down one place", () => {
    expect(moveItem(["John", "Jane", "Max"], 0, 1)).toEqual(["Jane", "John", "Max"]);
  });

  it("moves an item up one place", () => {
    expect(moveItem(["John", "Jane", "Max"], 2, 1)).toEqual(["John", "Max", "Jane"]);
  });

  it("moves an item several places", () => {
    expect(moveItem(["John", "Jane", "Max"], 0, 2)).toEqual(["Jane", "Max", "John"]);
  });

  it("leaves the order alone when a position is outside the list", () => {
    const names = ["John", "Jane", "Max"];

    expect(moveItem(names, 0, -1)).toEqual(names);
    expect(moveItem(names, 2, 3)).toEqual(names);
    expect(moveItem(names, 5, 0)).toEqual(names);
  });

  it("does not change the list it was given", () => {
    const names = ["John", "Jane", "Max"];

    const moved = moveItem(names, 0, 2);

    expect(names).toEqual(["John", "Jane", "Max"]);
    expect(moved).not.toBe(names);
  });

  it("keeps members with the same name apart", () => {
    expect(moveItem(["Max", "Max", "John"], 2, 0)).toEqual(["John", "Max", "Max"]);
  });
});
