import { describe, expect, it } from "vitest";
import { ELEMENTS } from "./tools";
import { elementAction } from "./element-action";
import { ACTION_LIFE, ACTION_LIMIT, ElementBursts } from "../../components/town/element-action-art";
import type { Stack } from "./trade";

const tool = (gems: string[]): Stack => ({ item: "pick", n: 1, plus: 10, gems });
describe("elemental action visuals", () => {
  it("covers all 28 mixed pairs, independent of socket order", () => {
    let pairs = 0;
    for (let a = 0; a < ELEMENTS.length; a++) for (let b = a + 1; b < ELEMENTS.length; b++) {
      const gems = [ELEMENTS[a], ELEMENTS[b]];
      const look = elementAction(tool(gems));
      expect(look?.mix).toBeTruthy();
      expect(look).toEqual(elementAction(tool(gems.reverse())));
      expect(look?.doubled).toBe(false);
      pairs++;
    }
    expect(pairs).toBe(28);
  });
  it("keeps matching pairs concentrated and ignores the historical third gem", () => {
    for (const element of ELEMENTS) {
      expect(elementAction(tool([element, element]))).toMatchObject({ elements: [element], doubled: true, mix: null });
    }
    expect(elementAction(tool(["water", "fire", "dark"]))).toEqual(elementAction(tool(["water", "fire"])));
    expect(elementAction(tool([]))).toBeNull();
    expect(elementAction({ item: "stone", n: 1, gems: ["fire"] })).toBeNull();
  });
  it("freezes the impact loadout and position, bounds rapid hits, and expires idle work", () => {
    const pool = new ElementBursts(), look = elementAction(tool(["water", "fire"]))!;
    pool.add(look, 0, 0.25, 0.75);
    look.elements[0] = "dark";
    expect(pool.alive(0)[0]).toMatchObject({ look: { elements: ["fire", "water"] }, x: 0.25, y: 0.75 });
    for (let i = 1; i < 100; i++) pool.add(look, i, i / 100, 0.5);
    expect(pool.alive(100)).toHaveLength(ACTION_LIMIT);
    expect(pool.alive(100 + ACTION_LIFE)).toHaveLength(0);
    pool.add(look, 2000, 0, 0); pool.clear();
    expect(pool.alive(2000)).toHaveLength(0);
  });
});
