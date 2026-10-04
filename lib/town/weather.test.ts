import { describe, expect, it } from "vitest";
import { Skies } from "./skies";
import {
  ALWAYS_RAIN, DRY, FINE, HEAVY_RAIN, LIGHT_RAIN, SLOT_MS, TURN, WET_SKIES, easeEffects, effectsAt, effectsOf, forcedWeather, heaviness, isWet, rainingAt, rainsOf, readSlots,
  readWeather, skyOf, slotOf, weatherAt, wetMs, type Effects, type Weather,
} from "./weather";

describe("the town's weather", () => {
  it("reads the sky from a WMO code, trusting the rain gauge over a dry code", () => {
    expect(skyOf(0, 0)).toBe("clear");
    expect(skyOf(3, 0)).toBe("cloudy");
    expect(skyOf(45, 0)).toBe("fog");
    expect(skyOf(53, 0.1)).toBe("drizzle");
    expect(skyOf(63, 3)).toBe("rain");
    expect(skyOf(81, 4)).toBe("rain");
    expect(skyOf(95, 10)).toBe("storm");
    expect(skyOf(2, 1.2)).toBe("rain");
  });

  it("reads Open-Meteo's answer, and passes ours on unchanged", () => {
    const om = { current: { weather_code: 3, precipitation: 0, wind_speed_10m: 5.6, wind_gusts_10m: 12.6, cloud_cover: 95 } };
    const w = readWeather(om)!;
    expect(w).toEqual({ sky: "cloudy", wind: 5.6, gust: 12.6, rain: 0 });
    expect(readWeather(JSON.parse(JSON.stringify(w)))).toEqual(w);
  });

  it("calls anything odd no weather at all", () => {
    for (const bad of [null, 1, "rain", {}, { current: {} }, { current: { weather_code: "3", wind_speed_10m: 4 } }, { sky: "snow", wind: 1, gust: 1, rain: 0 }, { sky: "rain" }]) {
      expect(readWeather(bad)).toBeNull();
    }
    expect(readWeather({ sky: "rain", wind: 1e9, gust: -4, rain: 3 })).toEqual({ sky: "rain", wind: 200, gust: 0, rain: 3 });
  });

  it("always has a breeze in fine weather, with leaves; rain makes things wet and stops the leaves", () => {
    const fine = effectsOf(FINE);
    expect(fine.wind).toBeGreaterThan(0.25);
    expect(fine.leaves).toBeGreaterThan(0.3);
    expect(fine.rain).toBe(0);
    expect(fine.wet).toBe(0);
    const rain = effectsOf(forcedWeather("rain")!);
    expect(rain.rain).toBeGreaterThan(0.4);
    expect(rain.wet).toBe(1);
    expect(rain.leaves).toBe(0);
    const storm = effectsOf(forcedWeather("storm")!);
    expect(storm.rain).toBe(1);
    expect(storm.wind).toBeGreaterThan(rain.wind);
    expect(effectsOf(forcedWeather("windy")!).wind).toBeGreaterThan(fine.wind);
  });

  it("keeps the day's light in light rain, and goes as dark as night in heavy rain", () => {
    const light = effectsOf(forcedWeather("light")!), drizzle = effectsOf(forcedWeather("drizzle")!);
    const heavy = effectsOf(forcedWeather("heavy")!), storm = effectsOf(forcedWeather("storm")!);
    // light rain: rain and puddles, and nothing that darkens the day
    for (const e of [light, drizzle]) {
      expect(e.rain).toBeGreaterThan(0);
      expect(e.wet).toBeGreaterThan(0);
      expect(e.gloom).toBe(0);
      expect(e.dim).toBeLessThan(0.08);
      expect(e.haze).toBe(0);
    }
    // heavy rain and storms: the whole of the dark, and more rain than a shower has
    for (const e of [heavy, storm]) {
      expect(e.gloom).toBe(1);
      expect(e.rain).toBeGreaterThan(light.rain + 0.4);
    }
    // in between, by the gauge
    const at = (rain: number) => effectsOf({ sky: "rain", wind: 10, gust: 20, rain });
    expect(at(LIGHT_RAIN).gloom).toBe(0);
    expect(at(HEAVY_RAIN).gloom).toBe(1);
    const mid = at((LIGHT_RAIN + HEAVY_RAIN) / 2);
    expect(mid.gloom).toBeCloseTo(0.5, 5);
    expect(mid.rain).toBeGreaterThan(at(LIGHT_RAIN).rain);
    expect(mid.rain).toBeLessThan(at(HEAVY_RAIN).rain);
    // only rain is heavy: a windy clear day, cloud and mist are not
    for (const w of ["clear", "windy", "cloudy", "fog", "drizzle"]) expect(heaviness(forcedWeather(w)!)).toBe(0);
    expect(effectsOf(FINE).gloom).toBe(0);
  });

  it("has clouds drifting over in any weather but mist, most of them under a cloudy sky", () => {
    const fine = effectsOf(FINE), cloudy = effectsOf(forcedWeather("cloudy")!);
    expect(fine.clouds).toBeGreaterThan(0.2);
    expect(cloudy.clouds).toBeGreaterThan(fine.clouds);
    expect(effectsOf(forcedWeather("light")!).clouds).toBeGreaterThan(0.2);
    expect(effectsOf(forcedWeather("fog")!).clouds).toBe(0);
  });

  it("comes on gently, never jumping from one frame to the next", () => {
    const a = effectsOf(FINE), b = effectsOf(forcedWeather("storm")!);
    const one = easeEffects(a, b, 16);
    expect(Math.abs(one.rain - a.rain)).toBeLessThan(0.01);
    let e = a;
    for (let i = 0; i < 60 * 60; i++) e = easeEffects(e, b, 16);
    expect(e.rain).toBeCloseTo(b.rain, 2);
  });
});

describe("the weather as everybody has it (the owner, 2026-10-04: \"คนเห็นสภาพอากาศไม่ตรงกัน บางคนเห็นฝนตก บางคนไม่เห็น\")", () => {
  /** A slot far from any other, the moment so many seconds after it turns, and slots of the dev switch's weathers. */
  const S = 2_000_000, at = (slot: number, secs = 0) => slot * SLOT_MS + secs * 1000;
  const slots = (...list: Array<[number, string]>) => new Map<number, Weather>(list.map(([s, word]) => [s, forcedWeather(word)!]));
  const KEYS = Object.keys(TURN) as Array<keyof Effects>;
  const clear = effectsOf(forcedWeather("clear")!), heavy = effectsOf(forcedWeather("heavy")!);

  it("is the weather of the quarter hour a moment is in, and fine where none is known", () => {
    expect(SLOT_MS).toBe(15 * 60_000);
    expect(slotOf(at(S))).toBe(S);
    expect(slotOf(at(S + 1) - 1)).toBe(S);
    const m = slots([S, "rain"], [S + 1, "fog"]);
    expect(weatherAt(m, at(S, 1)).sky).toBe("rain");
    expect(weatherAt(m, at(S + 1, 1)).sky).toBe("fog");
    expect(weatherAt(m, at(S + 2, 1))).toBe(FINE);
    expect(weatherAt(new Map(), 12345)).toBe(FINE);
  });

  it("draws from the slots and the clock alone: the same for everybody who has them", () => {
    const m = slots([S - 1, "cloudy"], [S, "heavy"], [S + 1, "clear"]);
    for (const secs of [0, 7, 59, 300, 450, 899]) expect(effectsAt(m, at(S, secs))).toEqual(effectsAt(new Map(m), at(S, secs)));
    // in the middle of a quarter hour it is that quarter hour's own weather, whatever is on either side
    expect(effectsAt(m, at(S, 450))).toEqual(heavy);
    expect(effectsAt(slots([S - 1, "fog"], [S, "heavy"], [S + 1, "storm"]), at(S, 450))).toEqual(heavy);
  });

  it("brings rain on in its order (\"ทำให้ transition ระหว่างการเปลี่ยนสภาพอากาศออกมาดี\"): cloud and dark before the turn, rain on it, the wet after", () => {
    const m = slots([S, "clear"], [S + 1, "heavy"]);
    // five minutes before, nothing has begun
    expect(effectsAt(m, at(S + 1, -300))).toEqual(clear);
    // a minute before: the clouds are gathering and the light is going, and not a drop has fallen
    const before = effectsAt(m, at(S + 1, -60));
    expect(before.clouds).toBeGreaterThan(clear.clouds);
    expect(before.gloom).toBeGreaterThan(0.2);
    expect(before.gloom).toBeLessThan(1);
    expect(before.rain).toBe(0);
    expect(before.wet).toBe(0);
    // on the turn the first drops; half a minute on it rains, not yet at its hardest, and the ground is not yet wet through
    expect(effectsAt(m, at(S + 1, 0)).rain).toBe(0);
    const early = effectsAt(m, at(S + 1, 30));
    expect(early.rain).toBeGreaterThan(0.1);
    expect(early.rain).toBeLessThan(heavy.rain * 0.5);
    expect(early.wet).toBeGreaterThan(0);
    expect(early.wet).toBeLessThan(0.3);
    expect(early.leaves).toBe(0);
    // three minutes on it is all there
    expect(effectsAt(m, at(S + 1, 180))).toEqual(heavy);
  });

  it("takes it away in its order: the rain thins, the sky clears, and the puddles are the last to go", () => {
    const m = slots([S, "heavy"], [S + 1, "clear"]);
    expect(effectsAt(m, at(S + 1, -30)).rain).toBe(heavy.rain);
    const soon = effectsAt(m, at(S + 1, 100));
    expect(soon.rain).toBe(0);
    expect(soon.gloom).toBeGreaterThan(0.3);
    expect(soon.wet).toBeGreaterThan(0.8);
    const later = effectsAt(m, at(S + 1, 420));
    expect(later.gloom).toBe(0);
    expect(later.clouds).toBe(clear.clouds);
    expect(later.wet).toBeGreaterThan(0.05);
    expect(later.wet).toBeLessThan(0.5);
    expect(effectsAt(m, at(S + 1, 601))).toEqual(clear);
    // every turn is over well inside the quarter hour it turns into, and begun well inside the one before
    for (const key of KEYS) for (const way of ["up", "down"] as const) {
      expect(TURN[key][way][0]).toBeLessThan(SLOT_MS / 1000 / 2);
      expect(TURN[key][way][1]).toBeLessThan(SLOT_MS / 1000 - TURN[key].up[0] - TURN[key].down[0]);
    }
  });

  it("never jumps: second by second through any change, no effect moves more than a little", () => {
    const words = ["clear", "windy", "cloudy", "fog", "drizzle", "light", "rain", "heavy", "storm"];
    let most = 0;
    for (const a of words) for (const b of words) {
      const m = slots([S, a], [S + 1, b], [S + 2, a]);
      let was = effectsAt(m, at(S, 400));
      for (let secs = 401; secs <= 900 + 900 + 500; secs++) {
        const now = effectsAt(m, at(S, secs));
        for (const key of KEYS) most = Math.max(most, Math.abs(now[key] - was[key]));
        was = now;
      }
    }
    expect(most).toBeLessThan(0.04);
  });

  it("takes a quarter hour it does not know to be like the one beside it, and turns towards nothing for want of an answer", () => {
    // the next one not written yet: the rain goes on to the end of this one, undimmed
    expect(effectsAt(slots([S - 1, "heavy"], [S, "heavy"]), at(S, 890))).toEqual(heavy);
    // the one before not kept: the weather one walks into is simply there
    expect(effectsAt(slots([S, "heavy"]), at(S, 2))).toEqual(heavy);
    expect(effectsAt(new Map(), at(S, 2))).toEqual(effectsOf(FINE));
  });

  it("joins wet quarter hours into stretches of rain, and measures the rain between two moments", () => {
    expect(WET_SKIES).toEqual(["drizzle", "rain", "storm"]);
    for (const sky of ["clear", "cloudy", "fog"] as const) expect(isWet(sky)).toBe(false);
    // (whatever is drawn as rain is rain, and nothing else is)
    for (const word of ["clear", "windy", "cloudy", "fog", "drizzle", "light", "rain", "heavy", "storm"]) {
      const w = forcedWeather(word)!;
      expect(effectsOf(w).rain > 0).toBe(isWet(w.sky));
    }
    expect(rainsOf([])).toEqual([]);
    expect(rainsOf([S + 5, S, S + 1, S + 1, S + 2, S + 9])).toEqual([[at(S), at(S + 3)], [at(S + 5), at(S + 6)], [at(S + 9), at(S + 10)]]);
    const rains = rainsOf([S, S + 1, S + 5]);
    expect(wetMs(rains, at(S - 4), at(S + 20))).toBe(3 * SLOT_MS);
    expect(wetMs(rains, at(S, 60), at(S + 1, 60))).toBe(SLOT_MS);
    expect(wetMs(rains, at(S + 2), at(S + 5))).toBe(0);
    expect(wetMs(rains, at(S + 5, 100), at(S + 5, 160))).toBe(60_000);
    expect(wetMs(rains, at(S + 3), at(S + 1))).toBe(0);
    expect(wetMs(DRY, 0, 1e15)).toBe(0);
    expect(wetMs(ALWAYS_RAIN, at(S), at(S + 4))).toBe(4 * SLOT_MS);
    expect(rainingAt(rains, at(S))).toBe(true);
    expect(rainingAt(rains, at(S + 2) - 1)).toBe(true);
    expect(rainingAt(rains, at(S + 2))).toBe(false);
    expect(rainingAt(DRY, at(S))).toBe(false);
  });

  it("reads Open-Meteo's quarter hours into slots, leaving out whatever is odd", () => {
    const t = S * 900;
    const got = readSlots({ minutely_15: {
      time: [t, t + 900, t + 1800, t + 2700, t + 3601, "x"], weather_code: [1, 95, 61, null, 3, 3], precipitation: [0, 0.1, 2.4, 0, 0, 0],
      wind_speed_10m: [6, 7.3, 12, 5, 5, 5], wind_gusts_10m: [24.8, 27.4, null, 9, 9, 9],
    } });
    expect(got).toEqual([
      { slot: S, sky: "clear", wind: 6, gust: 24.8, rain: 0 },
      { slot: S + 1, sky: "storm", wind: 7.3, gust: 27.4, rain: 0.1 },
      { slot: S + 2, sky: "rain", wind: 12, gust: 12, rain: 2.4 },
    ]);
    for (const bad of [null, {}, { minutely_15: {} }, { minutely_15: { time: "now" } }, "rain"]) expect(readSlots(bad)).toEqual([]);
  });
});

describe("what a page keeps of the weather (lib/town/skies)", () => {
  const cur = slotOf(Date.now());
  const row = (slot: number, sky: string, rain = 0) => [slot, sky, 8, 16, rain];

  it("has no weather until the database answers, then the database's, by the database's clock", () => {
    const sky = new Skies();
    expect(sky.knows()).toBe(false);
    expect(sky.weather()).toBe(FINE);
    expect(sky.rains()).toEqual([]);
    expect(sky.reaches(1)).toBe(false);
    // (the first time, everything from sixty days back)
    expect(Math.abs(sky.since(60) - (Date.now() - 60 * 86_400_000))).toBeLessThan(2000);
    const sent = Date.now();
    expect(sky.take({ now: Date.now() + 90_000, slots: [row(cur - 1, "clear"), row(cur, "rain", 2.5), row(cur + 1, "rain", 2.5), row(cur + 2, "cloudy"), row(cur + 3, "cloudy")], wet: [cur - 40, cur - 39] }, sent)).toBe(true);
    // the clock is the database's: a minute and a half ahead of this machine's
    expect(Math.round((sky.now() - Date.now()) / 1000)).toBe(90);
    expect(sky.rains()).toEqual([[(cur - 40) * SLOT_MS, (cur - 38) * SLOT_MS], [cur * SLOT_MS, (cur + 2) * SLOT_MS]]);
    expect(sky.weather(cur * SLOT_MS + 1).sky).toBe("rain");
    expect(sky.raining(cur * SLOT_MS + 1)).toBe(true);
    expect(sky.raining((cur + 2) * SLOT_MS + 1)).toBe(false);
    expect(sky.effects(cur * SLOT_MS + 450_000)).toEqual(effectsOf({ sky: "rain", wind: 8, gust: 16, rain: 2.5 }));
    expect(sky.reaches(20)).toBe(true);
    // the next time, only what is new
    expect(sky.since(60)).toBe((cur + 3 - 8) * SLOT_MS);
  });

  it("never changes a quarter hour it has, and takes nothing from an answer that is not one", () => {
    const sky = new Skies();
    sky.take({ now: Date.now(), slots: [row(cur, "rain", 1)] }, Date.now());
    expect(sky.take({ now: Date.now(), slots: [row(cur, "clear"), row(cur + 1, "fog"), ["x"], [cur + 2, "snow", 1, 1, 0], [cur + 2.5, "rain", 1, 1, 0]] }, Date.now())).toBe(true);
    expect(sky.weather(cur * SLOT_MS + 1).sky).toBe("rain");
    expect(sky.weather((cur + 1) * SLOT_MS + 1).sky).toBe("fog");
    expect(sky.weather((cur + 2) * SLOT_MS + 1)).toBe(FINE);
    for (const bad of [null, 1, "x", {}, { now: "soon", slots: [] }, { now: 1 }]) expect(sky.take(bad, Date.now())).toBe(false);
    expect(sky.rains()).toEqual([[cur * SLOT_MS, (cur + 1) * SLOT_MS]]);
  });

  it("says when the quarter hours to come are due to be written", () => {
    const sky = new Skies();
    sky.take({ now: Date.now(), slots: [row(cur, "clear")] }, Date.now());
    // (this quarter hour ends within fifteen minutes: nothing is kept for twenty minutes from now)
    expect(sky.reaches(20)).toBe(false);
    sky.take({ now: Date.now(), slots: [row(cur + 1, "clear"), row(cur + 2, "clear")] }, Date.now());
    expect(sky.reaches(20)).toBe(true);
    expect(sky.reaches(60)).toBe(false);
  });

  it("holds the one answer of the old way only while the database has none, and counts no rain from it", () => {
    const sky = new Skies(), wet = forcedWeather("rain")!;
    sky.hold(wet);
    expect(sky.weather()).toBe(wet);
    expect(sky.effects()).toEqual(effectsOf(wet));
    expect(sky.raining()).toBe(false);
    expect(sky.rains()).toEqual([]);
    sky.take({ now: Date.now(), slots: [row(cur, "clear")] }, Date.now());
    expect(sky.weather().sky).toBe("clear");
    sky.hold(wet);
    expect(sky.weather().sky).toBe("clear");
  });

  it("is whatever `next dev` asked for when one is forced: rain without end, when it is a wet one", () => {
    const sky = new Skies();
    sky.force(forcedWeather("storm")!);
    expect(sky.take({ now: Date.now(), slots: [row(cur, "clear")] }, Date.now())).toBe(false);
    expect(sky.weather().sky).toBe("storm");
    expect(sky.raining()).toBe(true);
    expect(sky.rains()).toBe(ALWAYS_RAIN);
    const dry = new Skies();
    dry.force(forcedWeather("fog")!);
    expect(dry.raining()).toBe(false);
    expect(dry.rains()).toBe(DRY);
  });
});
