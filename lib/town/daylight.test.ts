import { describe, expect, it } from "vitest";
import { STORM_TINT, bangkokMinute, clockText, daylightAt, overcast, sunOf } from "./daylight";

describe("the town's sky", () => {
  it("is clear at noon and dark at night, with the lamps lit only after dark", () => {
    expect(daylightAt(12 * 60)).toEqual({ phase: "noon", tint: [255, 255, 255], lamps: 0 });
    const night = daylightAt(23 * 60);
    expect(night.phase).toBe("night");
    expect(night.lamps).toBe(1);
    expect(Math.max(...night.tint)).toBeLessThan(200);
  });

  it("goes morning, noon, afternoon, dusk, evening, night through the day", () => {
    const order = [6.5, 9, 13, 16, 18, 19.5, 22].map((h) => daylightAt(h * 60).phase);
    expect(order).toEqual(["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night"]);
  });

  it("changes gently, never jumping between one minute and the next", () => {
    for (let m = 0; m < 1440; m++) {
      const a = daylightAt(m), b = daylightAt(m + 1);
      for (let c = 0; c < 3; c++) expect(Math.abs(a.tint[c] - b.tint[c])).toBeLessThanOrEqual(3);
      expect(Math.abs(a.lamps - b.lamps)).toBeLessThan(0.02);
    }
  });

  it("is as dark as night under heavy rain at any hour, with the lamps lit; light rain leaves the hour alone", () => {
    const noon = daylightAt(12 * 60), night = daylightAt(23 * 60), dusk = daylightAt(17.5 * 60);
    // no gloom: the very same sky
    expect(overcast(noon, 0)).toBe(noon);
    // all of it at noon: the storm's dark, about as dark as night, and the lamps on
    const dark = overcast(noon, 1);
    expect(dark.tint).toEqual(STORM_TINT);
    expect(dark.lamps).toBeGreaterThan(0.8);
    const sum = (t: number[]) => t[0] + t[1] + t[2];
    expect(sum(dark.tint)).toBeLessThan(sum(night.tint) * 1.1);
    // at night it is dark already: no darker than a storm by day, the lamps as they were (only night's own blue
    // goes grey under the cloud)
    const wild = overcast(night, 1);
    expect(wild.lamps).toBe(night.lamps);
    expect(wild.tint.slice(0, 2)).toEqual(night.tint.slice(0, 2));
    expect(sum(wild.tint)).toBeGreaterThan(sum(night.tint) * 0.9);
    // never lighter than the hour, in any colour
    const d = overcast(dusk, 1);
    for (let c = 0; c < 3; c++) expect(d.tint[c]).toBeLessThanOrEqual(dusk.tint[c]);
    // it comes on by degrees, and the lamps only once it is truly dark
    const half = overcast(noon, 0.5);
    expect(sum(half.tint)).toBeGreaterThan(sum(dark.tint));
    expect(sum(half.tint)).toBeLessThan(sum(noon.tint));
    expect(overcast(noon, 0.25).lamps).toBe(0);
    expect(half.lamps).toBeGreaterThan(0);
    expect(half.lamps).toBeLessThan(dark.lamps);
  });

  it("has sun to cast shadows by day, and none by lamplight", () => {
    expect(sunOf(daylightAt(9 * 60))).toBe(1);
    expect(sunOf(daylightAt(12 * 60))).toBe(1);
    expect(sunOf(daylightAt(23 * 60))).toBe(0);
    expect(sunOf(daylightAt(19.5 * 60))).toBe(0);
    const dusk = sunOf(daylightAt(17 * 60));
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
    // and none under a storm's dark
    expect(sunOf(overcast(daylightAt(12 * 60), 1))).toBe(0);
  });

  it("keeps Thai time, whatever the device's clock is set to", () => {
    // 2026-10-02 13:05 UTC is 20:05 in Bangkok
    const d = new Date(Date.UTC(2026, 9, 2, 13, 5));
    expect(Math.floor(bangkokMinute(d))).toBe(20 * 60 + 5);
    expect(clockText(d)).toBe("20:05");
    expect(clockText(new Date(Date.UTC(2026, 9, 2, 17, 0)))).toBe("00:00");
  });
});
