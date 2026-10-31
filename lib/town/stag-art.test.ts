import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { riderLift, stagFrame, stagLift, stagPicture, type StagGait } from "./stag-art";

const sheet = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/town/stag.json"), "utf8")) as { image: string; props: Record<string, number[]> };

describe("the moss stag's pictures", () => {
  it("has every frame of every gait in both views, wherever the clock is", () => {
    for (const gait of ["run", "walk", "idle"] as StagGait[]) for (const back of [false, true]) for (let now = 0; now < 9000; now += 17) {
      expect(sheet.props[stagPicture(gait, back, now)], `${gait} ${back} ${now}`).toBeDefined();
    }
    expect(fs.existsSync(path.join(process.cwd(), "public/town", sheet.image))).toBe(true);
  });
  it("gallops through all six frames in order, and only the gallop lifts it", () => {
    expect(Array.from({ length: 7 }, (_, i) => stagFrame("run", i * 85))).toEqual([0, 1, 2, 3, 4, 5, 0]);
    expect(stagLift("run", 2 * 85)).toBeGreaterThan(0);
    for (let now = 0; now < 5000; now += 50) { expect(stagLift("walk", now)).toBe(0); expect(stagLift("idle", now)).toBe(0); }
  });
  it("keeps its rider on the moss through the stride, however they lag", () => {
    for (let now = 0; now < 1000; now += 17) {
      const off = riderLift(now) - stagLift("run", now);
      expect(off).toBeGreaterThanOrEqual(0);
      expect(off).toBeLessThanOrEqual(3);
    }
  });
  it("stands on its first frame and only sometimes looks up", () => {
    let looks = 0;
    for (let now = 0; now < 4200; now += 100) looks += stagFrame("idle", now);
    expect(looks).toBeGreaterThan(0);
    expect(looks).toBeLessThan(10);
  });
});
