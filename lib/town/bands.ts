/**
 * The eight parts of the town's day (the owner, 2026-10-15): the one set of names the clock shows, and the hours
 * that time-of-day things keep to (AGENTS.md, "Cash Town time of day"). Thai time, the same for everybody. The sky
 * keeps its own tint keyframes (lib/town/daylight) until the atmosphere is made to follow these bands.
 *
 * Pure, so it can be tested without a browser.
 */
import { bangkokMinute, type Phase } from "./daylight";

export type BandId = "beforeDawn" | "earlyMorning" | "lateMorning" | "midday" | "afternoon" | "evening" | "night" | "lateNight";

export interface Band {
  id: BandId;
  /** The hour it begins and the hour it ends (Thai time; late night runs past midnight, so its end is 27). */
  from: number;
  to: number;
  th: string;
  en: string;
  /** Its picture on the clock: the town icon of the sky that suits it (components/town/TownIcon); the hour before dawn has
   * one of its own, the low moon in the mist, which no daylight phase has. */
  icon: Phase | "beforeDawn";
}

/** In the order of the day, from the game day's turn at 05:00 (lib/town/stamina's dawn) round to it again. */
export const BANDS: readonly Band[] = [
  { id: "earlyMorning", from: 5, to: 7, th: "เช้าตรู่", en: "Early morning", icon: "dawn" },
  { id: "lateMorning", from: 7, to: 11, th: "สาย", en: "Late morning", icon: "morning" },
  { id: "midday", from: 11, to: 13, th: "เที่ยง", en: "Midday", icon: "noon" },
  { id: "afternoon", from: 13, to: 16, th: "บ่าย", en: "Afternoon", icon: "afternoon" },
  { id: "evening", from: 16, to: 19, th: "เย็น", en: "Evening", icon: "dusk" },
  { id: "night", from: 19, to: 23, th: "ค่ำ", en: "Night", icon: "evening" },
  { id: "lateNight", from: 23, to: 27, th: "ดึก", en: "Late night", icon: "night" },
  { id: "beforeDawn", from: 3, to: 5, th: "ก่อนรุ่ง", en: "Before dawn", icon: "beforeDawn" },
];

/** The band a minute of the day (0–1440, Thai time) falls in. */
export function bandAt(minute: number): Band {
  const h = (((minute % 1440) + 1440) % 1440) / 60;
  return BANDS.find((b) => (h >= b.from && h < b.to) || (h + 24 >= b.from && h + 24 < b.to))!;
}

/** The band it is now in Thai time. */
export function bandOf(date = new Date()): Band {
  return bandAt(bangkokMinute(date));
}
