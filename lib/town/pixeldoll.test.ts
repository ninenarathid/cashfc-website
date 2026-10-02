import { describe, expect, it } from "vitest";
import { facingFor } from "./pixeldoll";

// On screen, +x runs down to the right and +y down to the left. The art is drawn
// facing right (three-quarter towards the viewer, or away); mirroring gives the left.
describe("which way a walking doll faces", () => {
  it("down to the right: towards the viewer, as drawn", () => {
    expect(facingFor(1, 0)).toEqual({ view: "front", mirror: false });
  });
  it("down to the left: towards the viewer, mirrored", () => {
    expect(facingFor(0, 1)).toEqual({ view: "front", mirror: true });
  });
  it("up to the right: away, as drawn", () => {
    expect(facingFor(0, -1)).toEqual({ view: "back", mirror: false });
  });
  it("up to the left: away, mirrored", () => {
    expect(facingFor(-1, 0)).toEqual({ view: "back", mirror: true });
  });
  it("straight down the screen counts as towards the viewer", () => {
    expect(facingFor(1, 1).view).toBe("front");
  });
});
