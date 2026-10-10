import { describe, expect, it } from "vitest";
import { CLIFF, cliffTop } from "./mountain";
import { mountainStreamMid, mountainWater } from "./mountain-water";
import { mountainRiverBed, mountainRiverGround, mountainRiverIsland, riverPixel } from "./river-landscape";
import { BEYOND_MORE_PROPS, MOUNTAIN, groundLook, riverMiddle, seenAt } from "./world";

describe("connected river scenery", () => {
  it("carries both town river banks across the west map boundary", () => {
    for (let y = 20; y <= 30; y += 0.125) {
      expect(groundLook(-0.0001, y)).toBe(groundLook(0.0001, y));
    }
    for (let x = -9; x <= 1; x += 0.25) {
      let y = x + 26;
      for (let i = 0; i < 30; i++) y = x + riverMiddle(x + y - 1);
      expect(seenAt(x, y)).toBe(true);
      expect(groundLook(x, y)).toBe("water");
    }
  });

  it("links the full mountain channel, the two pools and both scenery borders", () => {
    for (let u = -13; u < 86; u += 0.125) {
      const v = mountainStreamMid(Math.max(0, Math.min(72, u)));
      expect(mountainRiverBed(u, v)).toBeLessThan(0);
      if (!mountainRiverIsland(u, v)) expect(["water", "rock"]).toContain(groundLook(MOUNTAIN.x + u, MOUNTAIN.y + v));
    }
    for (const [u, v] of [[42, 48], [21, 46]]) expect(mountainRiverBed(u, v)).toBeLessThan(0);
  });

  it("paints all three cliff crossings as cascades with foam", () => {
    const water = [63, 179, 224] as const;
    for (let k = 0; k < 3; k++) {
      const v = mountainStreamMid(cliffTop(k, 47));
      for (let d = 0.01; d < CLIFF; d += 0.1) {
        const u = cliffTop(k, v) + d;
        expect(mountainWater(u, v)).toBeNull();
        expect(mountainRiverGround(u, v)).toBe("water");
        expect(riverPixel(u, v, "water", water)).not.toBeNull();
      }
    }
  });

  it("preserves every actual fishing water point while adding shallow crossings and banks", () => {
    let banks = 0, shallows = 0;
    for (let u = 0; u < 72; u += 0.25) for (let v = 40; v < 54; v += 0.25) {
      const ground = mountainRiverGround(u, v);
      if (mountainWater(u, v)) expect(ground).toBe("water");
      if (ground === "rock" && mountainRiverBed(u, v) >= 0) banks++;
      if (ground === "rock" && mountainRiverBed(u, v) < 0) shallows++;
    }
    expect(banks).toBeGreaterThan(100);
    expect(shallows).toBeGreaterThan(100);
    for (const props of Object.values(BEYOND_MORE_PROPS)) for (const p of props) {
      expect(["water", "sand"]).not.toContain(groundLook(p.x + 0.5, p.y + 0.5));
    }
  });
});
