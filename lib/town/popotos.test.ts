import { describe, expect, it } from "vitest";
import { walkable } from "./world";
import { SLOT_MS, activitiesAt, alongRoute, outingAt, outingsNow, presence, type Activity } from "./popotos";

/** A moment in Bangkok (UTC+7). */
const bkk = (s: string) => Date.parse(`${s}+07:00`);
const minuteOf = (ms: number) => (((ms / 60_000 + 420) % 1440) + 1440) % 1440;

describe("popoto out and about", () => {
  it("does what fits the hour", () => {
    expect(activitiesAt(7 * 60)).toEqual(["rush"]);
    expect(activitiesAt(12 * 60)).toEqual(["lunch"]);
    expect(activitiesAt(17 * 60)).toEqual(["football", "badminton"]);
    expect(activitiesAt(23 * 60)).toEqual(["tired"]);
    expect(activitiesAt(60)).toEqual(["tired"]);
    expect(activitiesAt(15 * 60)).toEqual([]);
    expect(activitiesAt(4 * 60)).toEqual([]);
  });

  it("comes out now and then, never outside its hours, and every kind turns up in a week", () => {
    const seen = new Map<Activity, number>();
    let slots = 0, out = 0;
    for (let t = bkk("2026-10-05T00:00:00"); t < bkk("2026-10-12T00:00:00"); t += SLOT_MS) {
      const o = outingAt(t);
      if (activitiesAt(minuteOf(t)).length) slots++;
      if (!o) continue;
      out++;
      expect(activitiesAt(minuteOf(t))).toContain(o.activity);
      seen.set(o.activity, (seen.get(o.activity) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual(["badminton", "football", "lunch", "rush", "tired"]);
    // rarely: about half the slots in its hours, not every one
    expect(out / slots).toBeGreaterThan(0.3);
    expect(out / slots).toBeLessThan(0.6);
  });

  it("is the same on every screen: the clock alone decides", () => {
    const t = bkk("2026-10-05T07:10:00");
    expect(JSON.stringify(outingAt(t))).toBe(JSON.stringify(outingAt(t + 1000)));
  });

  it("walks only where people can walk, and stays only on open ground", () => {
    for (let t = bkk("2026-10-05T00:00:00"); t < bkk("2026-10-07T00:00:00"); t += SLOT_MS) {
      const o = outingAt(t);
      if (!o) continue;
      for (const p of o.route ?? []) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
      for (const p of o.spots ?? []) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
      expect(o.end).toBeGreaterThan(o.start);
    }
  });

  it("runs in the morning and trudges at night, start to end, fading in and out", () => {
    const rush = outingAt(bkk("2026-10-05T07:00:00"), "rush")!;
    const tired = outingAt(bkk("2026-10-05T23:00:00"), "tired")!;
    for (const o of [rush, tired]) {
      expect(presence(o, o.start)).toBe(0);
      expect(presence(o, (o.start + o.end) / 2)).toBe(1);
      const first = alongRoute(o, o.start)!.pos, last = alongRoute(o, o.end)!.pos, end = o.route![o.route!.length - 1];
      expect(first).toEqual(o.route![0]);
      expect(last.x).toBeCloseTo(end.x, 6);
      expect(last.y).toBeCloseTo(end.y, 6);
    }
    // a hurried popoto is quicker over the same sort of ground
    const perTile = (o: typeof rush) => (o.end - o.start) / o.route!.length;
    expect(perTile(rush)).toBeLessThan(perTile(tired));
  });

  it("plays in twos and lunches alone, and is drawn only while it is out", () => {
    const t = bkk("2026-10-05T17:00:00");
    expect(outingAt(t, "football")!.spots).toHaveLength(2);
    expect(outingAt(t, "badminton")!.spots).toHaveLength(2);
    expect(outingAt(t, "lunch")!.spots).toHaveLength(1);
    const o = outingAt(t, "lunch")!;
    expect(outingsNow(o.start + 5000, "lunch")).toContainEqual(o);
    expect(outingsNow(o.end + 1, "lunch").some((x) => x.start === o.start)).toBe(false);
  });
});
