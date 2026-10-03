/**
 * Cash Town's weather is Bangkok's (the owner's call, 2026-10-02: "effect ตาม
 * สภาพอากาศ Bangkok ไม่ต้องบอกผู้เล่น ... แบบไม่ต้องเปลืองมาก"). The site asks
 * Open-Meteo (free, no key) at most every fifteen minutes, on the server, and
 * every screen in town reads that one answer (app/api/town/weather). Nothing
 * on screen says what the weather is; the town just has it:
 *
 *   · fine (clear or cloudy): a breeze, stronger with the real wind, that sways
 *     the trees and blows a few leaves across, and by day the shadows of
 *     clouds drifting over the ground, more of them under a cloudy sky;
 *   · light rain: rain falling and puddles, in the day's own light;
 *   · heavy rain: the same, harder, under a sky as dark as night, lamps lit;
 *   · a storm: that, with more wind;
 *   · mist: a haze.
 *
 * (The owner, 2026-10-03: "เงาเมฆเคลื่อนตัว ตอนเช้า ... ถ้าฝนตกเบาๆ ก็มีแค่ ฝน แต่ยัง
 * รู้สึกเช้าเหมือนเดิม ถ้าฝนตกหนัก ให้ทำฟ้าครึ้มเหมือนเป็นตอนกลางคืนด้วย".)
 */

export type Sky = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "storm";

export interface Weather {
  sky: Sky;
  /** Wind and its gusts, km/h. */
  wind: number;
  gust: number;
  /** Rain in the last quarter hour, mm. */
  rain: number;
}

export const FINE: Weather = { sky: "clear", wind: 6, gust: 12, rain: 0 };

/** The sky from a WMO weather code (what Open-Meteo gives), and the rain measured. */
export function skyOf(code: number, rain: number): Sky {
  if (code >= 95) return "storm";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 45 || code === 48) return "fog";
  // a code that says dry while the gauge says otherwise: believe the gauge
  if (rain >= 0.5) return "rain";
  if (rain > 0) return "drizzle";
  if (code >= 2) return "cloudy";
  return "clear";
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Open-Meteo's answer (or ours, passed on) read carefully: anything odd is no weather at all. */
export function readWeather(json: unknown): Weather | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  // ours: already read once on the server
  if (typeof o.sky === "string" && ["clear", "cloudy", "fog", "drizzle", "rain", "storm"].includes(o.sky)) {
    const wind = num(o.wind), gust = num(o.gust), rain = num(o.rain);
    if (wind === undefined || gust === undefined || rain === undefined) return null;
    return { sky: o.sky as Sky, wind: clamp(wind, 0, 200), gust: clamp(gust, 0, 250), rain: clamp(rain, 0, 200) };
  }
  // Open-Meteo's: { current: { weather_code, precipitation, wind_speed_10m, wind_gusts_10m } }
  const c = o.current as Record<string, unknown> | undefined;
  if (!c || typeof c !== "object") return null;
  const code = num(c.weather_code), rain = num(c.precipitation) ?? 0, wind = num(c.wind_speed_10m), gust = num(c.wind_gusts_10m);
  if (code === undefined || wind === undefined) return null;
  return {
    sky: skyOf(code, rain),
    wind: clamp(wind, 0, 200), gust: clamp(gust ?? wind, 0, 250), rain: clamp(rain, 0, 200),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Where light rain ends and heavy rain begins, in millimetres in a quarter of an hour: the usual classes are
 * under 2.5 mm an hour (light) and over 7.6 (heavy), and the gauge reads a quarter of an hour.
 */
export const LIGHT_RAIN = 0.6;
export const HEAVY_RAIN = 1.9;

/** How heavy the rain is: 0 a light shower (or none), 1 a downpour. A storm is always one. */
export function heaviness(w: Weather): number {
  if (w.sky === "storm") return 1;
  if (w.sky !== "rain") return 0;
  return clamp((w.rain - LIGHT_RAIN) / (HEAVY_RAIN - LIGHT_RAIN), 0, 1);
}

/** What the town draws for a weather: each 0 (none) to 1 (as much as it gets). */
export interface Effects {
  /** How hard the trees sway and the leaves fly. Fine weather always has a breeze. */
  wind: number;
  /** Leaves blowing across (fine weather only). */
  leaves: number;
  /** Rain falling. */
  rain: number;
  /** How wet everything looks: puddles, and rings where the rain lands in them. */
  wet: number;
  /** Grey light under cloud, and mist. */
  dim: number;
  haze: number;
  /** How much of the sky has cloud drifting over it: by day each casts its shadow on the town. */
  clouds: number;
  /** The dark under heavy rain: 0 the hour's own light, 1 as dark as night, the lamps lit. Light rain has none. */
  gloom: number;
}

export function effectsOf(w: Weather): Effects {
  const gusty = clamp((w.wind + w.gust / 2) / 40, 0, 1);
  const heavy = heaviness(w);
  const wet = w.sky === "storm" || w.sky === "rain" ? 1 : w.sky === "drizzle" ? 0.6 : 0;
  const rain = w.sky === "storm" ? 1 : w.sky === "rain" ? 0.35 + 0.55 * heavy : w.sky === "drizzle" ? 0.2 : 0;
  return {
    wind: clamp(0.3 + gusty * 0.7 + (w.sky === "storm" ? 0.3 : 0), 0.3, 1),
    leaves: wet ? 0 : clamp(0.35 + gusty * 0.65, 0.35, 1),
    rain,
    wet,
    // light rain keeps the day's light (a touch of grey, no more); what darkens heavy rain is the gloom
    dim: w.sky === "cloudy" ? 0.08 : w.sky === "fog" ? 0.12 : wet ? 0.05 : 0,
    haze: w.sky === "fog" ? 0.22 : 0.07 * heavy,
    clouds: w.sky === "clear" ? 0.35 : w.sky === "fog" ? 0 : w.sky === "cloudy" ? 0.8 : 0.6,
    gloom: heavy,
  };
}

/** Effects moving towards a new weather a little each frame, so a change comes on gently. */
export function easeEffects(from: Effects, to: Effects, dtMs: number): Effects {
  const k = 1 - Math.exp(-dtMs / 8000);
  const out = { ...from };
  for (const key of Object.keys(to) as Array<keyof Effects>) out[key] = from[key] + (to[key] - from[key]) * k;
  return out;
}

/** A dev switch's word (?townWeather=rain) as a weather. */
export function forcedWeather(word: string | null): Weather | null {
  switch (word) {
    case "clear": return FINE;
    case "windy": return { sky: "clear", wind: 32, gust: 55, rain: 0 };
    case "cloudy": return { sky: "cloudy", wind: 10, gust: 20, rain: 0 };
    case "fog": return { sky: "fog", wind: 3, gust: 6, rain: 0 };
    case "drizzle": return { sky: "drizzle", wind: 8, gust: 15, rain: 0.2 };
    case "light": return { sky: "rain", wind: 8, gust: 16, rain: 0.3 };
    case "rain": return { sky: "rain", wind: 12, gust: 25, rain: 1.2 };
    case "heavy": return { sky: "rain", wind: 18, gust: 38, rain: 4 };
    case "storm": return { sky: "storm", wind: 35, gust: 70, rain: 8 };
    default: return null;
  }
}
