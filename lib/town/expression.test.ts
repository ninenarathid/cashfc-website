import { describe, expect, it } from "vitest";
import { EXPRESSIONS, expressionOf, isMood } from "./expression";

describe("expressions", () => {
  it("are the owner's five to start (2026-10-17), told to the room as their place plus one", () => {
    expect(EXPRESSIONS.map((e) => e.id)).toEqual(["happy", "surprised", "sad", "pout", "shy"]);
    expect(expressionOf(1)).toBe("happy");
    expect(expressionOf(5)).toBe("shy");
    expect(expressionOf(0)).toBeNull();
  });

  it("take nothing else from another browser", () => {
    for (const bad of [-1, 6, 1.5, "1", null, undefined, NaN]) { expect(isMood(bad)).toBe(false); expect(expressionOf(bad)).toBeNull(); }
    expect(isMood(0)).toBe(true);
  });
});
