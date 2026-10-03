import { describe, expect, it } from "vitest";
import { FINE, HEAVY_RAIN, LIGHT_RAIN, easeEffects, effectsOf, forcedWeather, heaviness, readWeather, skyOf } from "./weather";

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
