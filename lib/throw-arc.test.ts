import { describe, expect, it } from "vitest";
import { lift, throwArc } from "./throw-arc";

const highest = (dx: number, dy: number) =>
  Math.min(...throwArc(dx, dy, 400).map((p) => p.y));

describe("throwArc", () => {
  it("leaves the button and lands on the face", () => {
    for (const [dx, dy] of [[300, 100], [-240, -180], [0, 250], [520, -40]]) {
      const path = throwArc(dx, dy, 30);
      expect(path[0].x).toBeCloseTo(0);
      expect(path[0].y).toBeCloseTo(0);
      expect(path.at(-1)!.x).toBeCloseTo(dx);
      expect(path.at(-1)!.y).toBeCloseTo(dy);
    }
  });

  it("peaks at the lift, above both ends", () => {
    for (const [dx, dy] of [[300, 100], [300, -200], [-150, 0]]) {
      const top = highest(dx, dy);
      expect(top).toBeCloseTo(lift(dx, dy), 0);
      expect(top).toBeLessThan(Math.min(0, dy));
    }
  });

  it("leans nose up on the way up and nose down on the way down", () => {
    const right = throwArc(300, 100, 30);
    expect(right[0].tilt).toBeLessThan(0);
    expect(right.at(-1)!.tilt).toBeGreaterThan(0);
    // Thrown to the left the drawing is mirrored, so the lean is too.
    const left = throwArc(-300, 100, 30);
    expect(left[0].tilt).toBeGreaterThan(0);
    expect(left.at(-1)!.tilt).toBeLessThan(0);
  });

  it("never leans so far the face is lost", () => {
    for (const p of throwArc(20, 400, 30)) {
      expect(Math.abs(p.tilt)).toBeLessThanOrEqual(24);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });

  it("copes with a face straight above or below the button", () => {
    for (const p of throwArc(0, -300, 30)) {
      expect(Number.isFinite(p.y) && Number.isFinite(p.tilt)).toBe(true);
    }
  });
});
