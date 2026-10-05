import { describe, expect, it } from "vitest";
import { FARMING, type Plant, type Plot } from "./farm";
import { moonAge } from "./fishing";
import { warmed } from "./heat";
import { NATURES, NATURE_NAMES, WATERS, keptAs, natureAt, natureOf, pouredIn, type WellWater } from "./waters";
import { bookOf, newLog, seen, type WaterDeed } from "./well";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR, MONTH = 29.530588853;
/** A noon on which the moon is full (found by the moon's own reckoning), and one two weeks on, when it is new. */
const FULL = (() => { let t = at("2026-10-01T12:00:00"); while (Math.abs(moonAge(t) - MONTH / 2) > 0.5) t += DAY; return t; })(), NEW = FULL + 15 * DAY;
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "pumpkin", sown: at("2026-10-06T03:00:00"), boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...over });
const watered = (was: Plot, now: number, adds = FARMING.water.adds * MIN): Plot => ({ ...was, plant: { ...was.plant!, watered: now, boost: was.plant!.boost + adds } });

describe("waters that differ (the owner, 2026-10-05: \"dawn, rain, a full moon … nothing told\")", () => {
  it("has a nature by the moment it is drawn: the dew's in the first two hours of the day", () => {
    expect(natureAt(at("2026-10-06T05:00:00"), false)).toBe("dawn");
    expect(natureAt(at("2026-10-06T06:59:59"), false)).toBe("dawn");
    expect(natureAt(at("2026-10-06T07:00:00"), false)).toBeNull();
    expect(natureAt(at("2026-10-06T04:59:59"), false)).not.toBe("dawn");
    expect(natureAt(at("2026-10-06T12:00:00"), false)).toBeNull();
    expect(WATERS.dawn).toEqual([5, 7]);
  });

  it("…the rain's while it rains, whatever the hour", () => {
    for (const hour of ["03", "05", "06", "12", "22"]) expect(natureAt(at(`2026-10-06T${hour}:30:00`), true)).toBe("rain");
    expect(natureAt(FULL + 10 * HOUR, true)).toBe("rain");
  });

  it("…the moon's on a night when the moon is full, give or take a day and a half", () => {
    // (FULL is a noon: ten at night that day, and two in the morning after)
    expect(natureAt(FULL + 10 * HOUR, false)).toBe("moon");
    expect(natureAt(FULL + 14 * HOUR, false)).toBe("moon");
    // by day it is plain water, and at dawn the dew's
    expect(natureAt(FULL, false)).toBeNull();
    expect(natureAt(FULL + 17.5 * HOUR, false)).toBe("dawn");
    // three nights on, and under a new moon, plain
    expect(natureAt(FULL + 3 * DAY + 10 * HOUR, false)).toBeNull();
    expect(natureAt(NEW + 10 * HOUR, false)).toBeNull();
    expect(WATERS.night).toEqual([19, 5]);
  });

  it("gives the well its nature for half an hour a bucketful, two hours at the most", () => {
    const now = at("2026-10-06T06:00:00");
    let w = pouredIn(null, "dawn", 1, "ann", now);
    expect(w).toEqual({ kind: "dawn", by: "ann", until: now + 30 * MIN });
    expect(natureOf(w, now + 29 * MIN)).toBe("dawn");
    expect(natureOf(w, now + 30 * MIN)).toBeNull();
    // more of the same keeps it longer: from when it would have ended, and whoever poured last is whose doing it is
    w = pouredIn(w, "dawn", 2, "bo", now + 10 * MIN);
    expect(w).toEqual({ kind: "dawn", by: "bo", until: now + 90 * MIN });
    // …to two hours from now and no further
    w = pouredIn(w, "dawn", 4, "bo", now + 20 * MIN);
    expect(w!.until).toBe(now + 20 * MIN + 120 * MIN);
    // plain water changes nothing; nor does a bucketful of none
    expect(pouredIn(w, null, 3, "cy", now + 30 * MIN)).toEqual(w);
    expect(pouredIn(w, "rain", 0, "cy", now + 30 * MIN)).toEqual(w);
    // another nature takes its place, from now
    expect(pouredIn(w, "rain", 1, "cy", now + 30 * MIN)).toEqual({ kind: "rain", by: "cy", until: now + 60 * MIN });
    // a nature that has run out is none: the same poured later begins again from then
    expect(pouredIn(w, "dawn", 1, "di", now + 5 * HOUR)).toEqual({ kind: "dawn", by: "di", until: now + 5 * HOUR + 30 * MIN });
    expect(pouredIn(w, null, 1, "di", now + 5 * HOUR)).toBeNull();
    expect([WATERS.lasts, WATERS.most]).toEqual([30, 120]);
  });

  it("makes every watering have the well's nature while it has one: the dew's as much again, the rain's half as much again, the moon's twelve hours kept from pests", () => {
    const now = at("2026-10-06T09:00:00"), was: Plot = { soil: "tilled", plant: plant() }, next = watered(was, now);
    expect(keptAs(was, next, now, "cloudy", "dawn").plant!.boost).toBe(60 * MIN);
    expect(keptAs(was, next, now, "cloudy", "rain").plant!.boost).toBe(45 * MIN);
    const moon = keptAs(was, next, now, "cloudy", "moon").plant!;
    expect([moon.boost, moon.guard]).toEqual([30 * MIN, now + 12 * HOUR]);
    // a plant kept from pests for longer already is left so
    const long = { soil: "tilled" as const, plant: plant({ guard: now + 20 * HOUR }) };
    expect(keptAs(long, watered(long, now), now, "cloudy", "moon").plant!.guard).toBe(now + 20 * HOUR);
    // no nature: as it was written
    expect(keptAs(was, next, now, "cloudy", null)).toBe(next);
    expect([WATERS.adds, WATERS.guards]).toEqual([{ dawn: 1, rain: 0.5, moon: 0 }, { dawn: 0, rain: 0, moon: 12 }]);
  });

  it("adds to the heat, each by what the watering itself added; and is the heat's own rule when the well has no nature", () => {
    const hot = at("2026-10-06T13:00:00"), was: Plot = { soil: "tilled", plant: plant({ boost: 10 * MIN }) }, next = watered(was, hot, 66 * MIN);
    // a brass can's 66 minutes: once more for the heat, once more for the dew
    expect(keptAs(was, next, hot, "clear", "dawn").plant!.boost).toBe(10 * MIN + 3 * 66 * MIN);
    expect(keptAs(was, next, hot, "clear", "rain").plant!.boost).toBe(10 * MIN + 2.5 * 66 * MIN);
    for (const sky of ["clear", "cloudy", null] as const) expect(keptAs(was, next, hot, sky, null)).toEqual(warmed(was, next, hot, sky));
    // only a watering: a plant fed, another plant, a watering written twice
    const fed: Plot = { ...was, plant: { ...was.plant!, fed: hot } };
    expect(keptAs(was, fed, hot, "clear", "dawn")).toBe(fed);
    const again: Plot = { ...next, plant: { ...next.plant!, boost: next.plant!.boost + 30 * MIN } };
    expect(keptAs(next, again, hot, "clear", "moon")).toBe(again);
    expect(keptAs(undefined, next, hot, "clear", "dawn")).toBe(next);
  });

  it("goes with the bucket: drawn, handed on, poured into the well; and the book says what the well's water is, and whose doing", () => {
    const dawn = at("2026-10-06T06:00:00");
    const deeds: WaterDeed[] = [
      { by: "ann", at: dawn, what: "draw", can: "bucket", kind: "dawn" },
      { by: "ann", at: dawn + MIN, what: "pass", n: 1, can: "bucket", to: "bo", into: "bucketIron" },
      // Bo draws nothing: the dew is in the iron bucket by Ann's hand, and Bo pours it
      { by: "bo", at: dawn + 2 * MIN, what: "pour", n: 1, can: "bucketIron" },
    ];
    const log = deeds.reduce(seen, newLog());
    expect(log.kinds).toEqual({ "ann/bucket": "dawn", "bo/bucketIron": "dawn" });
    expect(log.wellWater).toEqual({ kind: "dawn", by: "bo", until: dawn + 2 * MIN + 30 * MIN });
    expect(bookOf(log, "cy", dawn + 10 * MIN, (id) => id.toUpperCase()).water).toEqual({ kind: "dawn", until: dawn + 32 * MIN, by: "bo", name: "BO" });
    // when it has run out the book says nothing of it
    expect(bookOf(log, "cy", dawn + 40 * MIN, (id) => id).water).toBeUndefined();
    // a bucket drawn again at an ordinary hour is plain water, and changes nothing in the well
    const later = ([{ by: "bo", at: dawn + 3 * HOUR, what: "draw", can: "bucketIron" }, { by: "bo", at: dawn + 3 * HOUR + MIN, what: "pour", n: 2, can: "bucketIron" }] as WaterDeed[]).reduce(seen, log);
    expect("bo/bucketIron" in later.kinds).toBe(false);
    expect(later.wellWater).toEqual(log.wellWater);
    // water handed into a bucket that had a nature of its own takes the giver's, or none
    const mixed = ([
      { by: "ann", at: dawn, what: "draw", can: "bucket", kind: "rain" },
      { by: "bo", at: dawn + 4 * HOUR, what: "draw", can: "bucket" },
      { by: "bo", at: dawn + 4 * HOUR + MIN, what: "pass", n: 1, can: "bucket", to: "ann", into: "bucket" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect("ann/bucket" in mixed.kinds).toBe(false);
    // every nature has a name, and none says what it does
    for (const kind of NATURES) expect(NATURE_NAMES[kind].every((name) => name.length > 2 && !/\d/.test(name))).toBe(true);
  });

  it("is poured over a bed or into the yard's jar as plain water: only the well takes a nature", () => {
    const dawn = at("2026-10-06T06:00:00");
    const log = ([
      { by: "ann", at: dawn, what: "draw", can: "bucket", kind: "dawn" },
      { by: "ann", at: dawn + MIN, what: "ditch", n: 1, plants: 3, can: "bucket" },
      { by: "bo", at: dawn, what: "draw", can: "bucket", kind: "dawn" },
      { by: "bo", at: dawn + MIN, what: "yard", n: 1, can: "bucket" },
    ] as WaterDeed[]).reduce(seen, newLog());
    expect(log.wellWater).toBeNull();
    const w: WellWater = { kind: "moon", by: "x", until: dawn + HOUR };
    expect(natureOf(w, dawn)).toBe("moon");
    expect(natureOf(null, dawn)).toBeNull();
  });
});
