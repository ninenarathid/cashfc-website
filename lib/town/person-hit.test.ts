import { describe, expect, it } from "vitest";
import { personHitAt } from "./person-hit";

const chest = { x0: 640, y0: 260, x1: 715, y1: 325 };
const behind = { id: "behind", x0: 630, y0: 145, x1: 710, y1: 310 };
const front = { id: "front", x0: 640, y0: 170, x1: 720, y1: 330 };
describe("a crowded storage box", () => {
  it("lets a visible chest surface receive the tap when a player's card area covers it", () => {
    expect(personHitAt([behind], 678, 283, chest)).toBeNull();
    expect(personHitAt([behind], 678, 283)).toBe(behind);
  });
  it("keeps the whole chest clickable when several players stand around it", () => {
    for (const [x, y] of [[640, 260], [715, 325], [678, 290]]) expect(personHitAt([behind, front], x, y, chest)).toBeNull();
  });
  it("still opens the foremost player's card above or beside the chest", () => {
    expect(personHitAt([behind, front], 678, 220, chest)).toBe(front);
    expect(personHitAt([behind, front], 718, 290, chest)).toBe(front);
  });
  it("leaves names selectable when storage is unavailable and does not consume empty ground", () => {
    expect(personHitAt([behind, front], 678, 290, null)).toBe(front);
    expect(personHitAt([behind, front], 730, 350, chest)).toBeNull();
  });
});

describe("one's own doll", () => {
  it("lets a tap through to whoever stands behind it, or to the ground", () => {
    expect(personHitAt([behind, front], 678, 220, null, "front")).toBe(behind);
    expect(personHitAt([front], 678, 220, null, "front")).toBeNull();
    expect(personHitAt([behind, front], 678, 220, null, "behind")).toBe(front);
  });
});
