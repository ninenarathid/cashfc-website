import { describe, expect, it } from "vitest";
import { FINE, easeEffects, effectsOf, forcedWeather, readWeather, skyOf } from "./weather";

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

  it("comes on gently, never jumping from one frame to the next", () => {
    const a = effectsOf(FINE), b = effectsOf(forcedWeather("storm")!);
    const one = easeEffects(a, b, 16);
    expect(Math.abs(one.rain - a.rain)).toBeLessThan(0.01);
    let e = a;
    for (let i = 0; i < 60 * 60; i++) e = easeEffects(e, b, 16);
    expect(e.rain).toBeCloseTo(b.rain, 2);
  });
});
