import { describe, expect, it } from "vitest";
import { bangkokMinute, clockText, daylightAt } from "./daylight";

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

  it("keeps Thai time, whatever the device's clock is set to", () => {
    // 2026-10-02 13:05 UTC is 20:05 in Bangkok
    const d = new Date(Date.UTC(2026, 9, 2, 13, 5));
    expect(Math.floor(bangkokMinute(d))).toBe(20 * 60 + 5);
    expect(clockText(d)).toBe("20:05");
    expect(clockText(new Date(Date.UTC(2026, 9, 2, 17, 0)))).toBe("00:00");
  });
});
