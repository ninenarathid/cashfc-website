import { describe, expect, it } from "vitest";
import { ISO_MAX_X, ISO_MAX_Y, ISO_MIN_X, ISO_MIN_Y } from "./camera";
import { CLOUDS, FIELD, MARGIN, SHAPES, cloudBlobs, cloudsAt } from "./clouds";

describe("the clouds over the town", () => {
  it("has none under a clear enough sky, and more as it fills", () => {
    expect(cloudsAt(0, 0)).toHaveLength(0);
    const few = cloudsAt(0, 0.35), many = cloudsAt(0, 0.8), all = cloudsAt(0, 1);
    expect(few.length).toBeGreaterThan(2);
    expect(many.length).toBeGreaterThan(few.length);
    expect(all).toHaveLength(CLOUDS);
    for (const c of all) expect(c.k).toBe(1);
  });

  it("spreads the first few over the whole map, not down one side of it", () => {
    const ys = cloudsAt(0, 0.35).map((c) => c.y).sort((a, b) => a - b);
    expect(ys[ys.length - 1] - ys[0]).toBeGreaterThan((ISO_MAX_Y - ISO_MIN_Y) * 0.4);
  });

  it("is the same sky for the same drift", () => {
    expect(cloudsAt(1234, 0.6)).toEqual(cloudsAt(1234, 0.6));
  });

  it("drifts to the right, each at its own pace, and comes round again off the map", () => {
    const a = cloudsAt(0, 1), b = cloudsAt(40, 1);
    const moved = a.map((c, i) => b[i].x - c.x);
    for (const d of moved) {
      // forty pixels on, give or take its pace; or round the far edge and back to the start
      const step = d < 0 ? d + FIELD : d;
      expect(step).toBeGreaterThan(30);
      expect(step).toBeLessThan(50);
    }
    expect(new Set(moved.map((d) => Math.round((d < 0 ? d + FIELD : d) * 100))).size).toBeGreaterThan(3);
    for (let drift = 0; drift < FIELD * 2; drift += 97) {
      for (const c of cloudsAt(drift, 1)) {
        // its run goes a margin past the map at either end, and the margin is more than half of any shadow: it
        // is wholly off the map where it comes round, so none appears or vanishes over the town
        expect(c.x).toBeGreaterThanOrEqual(ISO_MIN_X - MARGIN);
        expect(c.x).toBeLessThan(ISO_MAX_X + MARGIN);
        expect(c.w / 2).toBeLessThanOrEqual(MARGIN);
      }
    }
  });

  it("lies on the ground at a slant: about half as tall as wide", () => {
    for (const c of cloudsAt(0, 1)) {
      expect(c.h / c.w).toBeGreaterThan(0.4);
      expect(c.h / c.w).toBeLessThan(0.56);
      expect(c.shape).toBeLessThan(SHAPES);
    }
  });

  it("keeps every blob of a cloud's outline inside its box", () => {
    for (let s = 0; s < SHAPES; s++) {
      const blobs = cloudBlobs(s);
      expect(blobs.length).toBeGreaterThan(5);
      expect(cloudBlobs(s)).toEqual(blobs);
      for (const [x, y, r] of blobs) {
        expect(x - r).toBeGreaterThanOrEqual(0);
        expect(x + r).toBeLessThanOrEqual(1);
        expect(y - r).toBeGreaterThanOrEqual(0);
        expect(y + r).toBeLessThanOrEqual(1);
      }
    }
  });
});
