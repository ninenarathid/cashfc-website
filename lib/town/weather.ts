/**
 * Cash Town's weather is Bangkok's (the owner's call, 2026-10-02: "effect ตาม
 * สภาพอากาศ Bangkok ไม่ต้องบอกผู้เล่น ... แบบไม่ต้องเปลืองมาก"). The site asks
 * Open-Meteo (free, no key), on the server, and writes what it says into the
 * database a quarter of an hour at a time, the next ones ahead of their time
 * (app/api/town/weather); every screen in town reads those quarter hours from
 * the database and draws the one the database's clock is in (see "the weather
 * as everybody has it", below). Nothing on screen says what the weather is;
 * the town just has it:
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

/* ── the weather as everybody has it: a quarter of an hour at a time ────── */

/*
 * Until 2026-10-04 each page asked a cached answer every ten minutes, in its own time, and eased towards it from
 * the moment it was told: two members standing side by side could be twenty minutes apart, one in the rain and one
 * in the sun (the owner: "คนเห็นสภาพอากาศไม่ตรงกัน บางคนเห็นฝนตก บางคนไม่เห็น"). Now the weather is kept in the database
 * in quarter hours, each written once and never changed, the next ones before their time; what a page draws is
 * worked out from those and the database's clock alone, so every page draws the same at the same moment, a change
 * of weather included ("ทำให้ transition ระหว่างการเปลี่ยนสภาพอากาศออกมาดี และเห็นตรงกันทุกคน"). And since the database knows
 * when it rained, rain waters the plots (lib/town/farm: "ระหว่างที่ฝนตก พืชทั้งหมดจะถือว่ารดน้ำแล้ว ตลอดการตก").
 */

/** A quarter of an hour, in milliseconds: the weather is kept in slots so long, numbered from long ago. */
export const SLOT_MS = 900_000;
/** The slot a moment is in. */
export const slotOf = (ms: number) => Math.floor(ms / SLOT_MS);
/** The skies rain falls from: what the town draws as rain, and what waters the plots. */
export const WET_SKIES: Sky[] = ["drizzle", "rain", "storm"];
export const isWet = (sky: Sky) => WET_SKIES.includes(sky);
/** The weather of each slot that is known. */
export type Slots = ReadonlyMap<number, Weather>;
/** The weather at a moment: its slot's; fine weather when that slot is not known. */
export const weatherAt = (slots: Slots, ms: number): Weather => slots.get(slotOf(ms)) ?? FINE;

/**
 * How a change of weather comes on, effect by effect: the seconds before the quarter hour turns that it begins,
 * and the seconds after that it is done; one pair for an effect that grows, one for an effect that fades. Clouds
 * gather and the light goes before the first drop; the rain itself begins on the turn and takes a minute and a half
 * to come down in earnest; the ground is wet a little after it. When it stops the rain thins first, the sky clears
 * over some minutes, and the puddles are the last to go.
 */
export const TURN: Record<keyof Effects, { up: [before: number, after: number]; down: [before: number, after: number] }> = {
  clouds: { up: [240, 30], down: [0, 300] },
  dim: { up: [210, 30], down: [0, 240] },
  gloom: { up: [150, 60], down: [20, 240] },
  haze: { up: [120, 120], down: [0, 300] },
  wind: { up: [120, 60], down: [0, 180] },
  leaves: { up: [0, 240], down: [45, 0] },
  rain: { up: [0, 100], down: [0, 80] },
  wet: { up: [0, 160], down: [0, 600] },
};
const EFFECT_KEYS = Object.keys(TURN) as Array<keyof Effects>;
const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

/**
 * What the town draws at a moment: the effects of that moment's slot, on their way from the slot before for a
 * while after the turn, and on their way to the slot after for a while before it. A pure matter of the slots and
 * the clock, so everybody who has the same slots and the same clock draws the same. A slot that is not known is
 * taken to be like the one beside it (so that nothing turns towards fine weather and back for want of an answer);
 * with none known at all the weather is fine.
 */
export function effectsAt(slots: Slots, ms: number): Effects {
  const i = slotOf(ms), here = slots.get(i);
  const now = effectsOf(here ?? FINE), was = effectsOf(slots.get(i - 1) ?? here ?? FINE), next = effectsOf(slots.get(i + 1) ?? here ?? FINE);
  const since = (ms - i * SLOT_MS) / 1000, left = ((i + 1) * SLOT_MS - ms) / 1000, out = { ...now };
  for (const key of EFFECT_KEYS) {
    // the turn into this slot, not done yet; or the turn out of it, begun already
    const into = TURN[key][now[key] > was[key] ? "up" : "down"], onto = TURN[key][next[key] > now[key] ? "up" : "down"];
    if (was[key] !== now[key] && since < into[1]) out[key] = was[key] + (now[key] - was[key]) * smooth((into[0] + since) / (into[0] + into[1]));
    else if (next[key] !== now[key] && left < onto[0]) out[key] = now[key] + (next[key] - now[key]) * smooth((onto[0] - left) / (onto[0] + onto[1]));
  }
  return out;
}

/** A stretch of rain: from when to when, in milliseconds. */
export type Rain = readonly [from: number, to: number];
/** No rain at all. */
export const DRY: readonly Rain[] = [];
/** Rain without end (for `next dev`'s ?townWeather=rain, where the weather is whatever was asked for). */
export const ALWAYS_RAIN: readonly Rain[] = [[0, Number.MAX_SAFE_INTEGER]];
/** The stretches of rain some wet slots make: neighbours joined, in order. */
export function rainsOf(wet: Iterable<number>): Rain[] {
  const out: Array<[number, number]> = [];
  for (const slot of [...new Set(wet)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[1] === slot * SLOT_MS) last[1] = (slot + 1) * SLOT_MS;
    else out.push([slot * SLOT_MS, (slot + 1) * SLOT_MS]);
  }
  return out;
}
/** How many milliseconds of rain fell between two moments. */
export function wetMs(rains: readonly Rain[], from: number, to: number): number {
  let t = 0;
  for (const [a, b] of rains) { if (b <= from) continue; if (a >= to) break; t += Math.min(b, to) - Math.max(a, from); }
  return Math.max(0, t);
}
/** Whether it rains at a moment. */
export const rainingAt = (rains: readonly Rain[], ms: number) => rains.some(([a, b]) => ms >= a && ms < b);

/**
 * Open-Meteo's quarter hours (`minutely_15`, times as unix seconds) read into slots, carefully: an entry that is
 * odd in any way is left out. An entry's time is the start of its slot; the rain it measures is the quarter hour
 * before, as the one answer the town used to ask for was.
 */
export function readSlots(json: unknown): Array<Weather & { slot: number }> {
  const m = (json as { minutely_15?: Record<string, unknown> } | null)?.minutely_15;
  if (!m || typeof m !== "object" || !Array.isArray(m.time)) return [];
  const list = (key: string) => (Array.isArray(m[key]) ? (m[key] as unknown[]) : []);
  const code = list("weather_code"), rain = list("precipitation"), wind = list("wind_speed_10m"), gust = list("wind_gusts_10m");
  const out: Array<Weather & { slot: number }> = [];
  (m.time as unknown[]).forEach((at, i) => {
    const t = num(at), c = num(code[i]), w = num(wind[i]), r = num(rain[i]) ?? 0, g = num(gust[i]);
    if (t === undefined || c === undefined || w === undefined || t % (SLOT_MS / 1000) !== 0) return;
    out.push({ slot: t / (SLOT_MS / 1000), sky: skyOf(c, r), wind: clamp(w, 0, 200), gust: clamp(g ?? w, 0, 250), rain: clamp(r, 0, 200) });
  });
  return out;
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
