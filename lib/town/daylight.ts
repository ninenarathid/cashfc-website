/**
 * Cash Town's sky follows the real day, as in Animal Crossing (the owner's
 * call, 2026-10-02): morning, noon, evening and night by the clock, in Thai
 * time (Asia/Bangkok), so everybody in town sees the same sky wherever they
 * are.
 *
 * The town is drawn as by day and then multiplied by a tint, which runs
 * through a few keyframes and blends between them minute by minute; the lamps
 * light up from dusk to dawn.
 *
 * Pure, so it can be tested without a browser.
 */

export type Phase = "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "evening" | "night";

export interface Daylight {
  phase: Phase;
  /** Multiply the town by this colour (white is daylight). */
  tint: [number, number, number];
  /** How bright the lamps' light is, 0–1. */
  lamps: number;
}

/** [minute of the day, phase, tint, lamps]. */
const KEYS: Array<[number, Phase, [number, number, number], number]> = [
  [0, "night", [72, 88, 150], 1],
  [5 * 60, "night", [72, 88, 150], 1],
  [6 * 60, "dawn", [214, 170, 180], 0.55],
  [7 * 60, "morning", [255, 236, 214], 0],
  [11 * 60, "noon", [255, 255, 255], 0],
  [14 * 60, "noon", [255, 255, 255], 0],
  [15 * 60, "afternoon", [255, 240, 216], 0],
  [17 * 60 + 30, "dusk", [255, 178, 128], 0.35],
  [18 * 60 + 45, "evening", [150, 120, 190], 0.85],
  [20 * 60, "night", [72, 88, 150], 1],
  [24 * 60, "night", [72, 88, 150], 1],
];

/** The minute of the day in Thai time. */
export function bangkokMinute(date: Date): number {
  // UTC+7, no daylight saving
  return ((date.getUTCHours() + 7) % 24) * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
}

/** The sky at a minute of the day (0–1440). */
export function daylightAt(minute: number): Daylight {
  const m = ((minute % 1440) + 1440) % 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
  const [m0, p0, t0, l0] = KEYS[i], [m1, , t1, l1] = KEYS[i + 1];
  const f = m1 > m0 ? (m - m0) / (m1 - m0) : 0;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * f);
  return { phase: p0, tint: [mix(t0[0], t1[0]), mix(t0[1], t1[1]), mix(t0[2], t1[2])], lamps: l0 + (l1 - l0) * f };
}

/** The sky now. */
export function daylight(date = new Date()): Daylight {
  return daylightAt(bangkokMinute(date));
}

/** The time in Thai time, "HH:MM". */
export function clockText(date = new Date()): string {
  const m = Math.floor(bangkokMinute(date));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Each part of the day's name; its picture is the town icon of the same name (components/town/TownIcon). */
export const PHASE_NAMES: Record<Phase, { th: string; en: string }> = {
  dawn: { th: "รุ่งสาง", en: "Dawn" },
  morning: { th: "เช้า", en: "Morning" },
  noon: { th: "เที่ยง", en: "Noon" },
  afternoon: { th: "บ่าย", en: "Afternoon" },
  dusk: { th: "เย็น", en: "Dusk" },
  evening: { th: "ค่ำ", en: "Evening" },
  night: { th: "กลางคืน", en: "Night" },
};
