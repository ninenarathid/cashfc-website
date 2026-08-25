import type { Lang } from "@/lib/i18n";

/**
 * When somebody is around to play, at one-hour resolution across the week.
 *
 * This started as four fixed blocks a day, which could not say "I am on from
 * 20:00 to midnight" — only "evening, roughly". An hour is the smallest unit
 * anybody actually schedules in, and once the grid is painted by dragging rather
 * than clicked cell by cell, 168 of them costs no more effort than 28 did.
 *
 * Days are the columns and hours are the rows, which is the opposite of how a
 * calendar usually reads. Seven columns fit a phone; twenty-four do not.
 *
 * Times are local Thai time, which is what this FC schedules in.
 */
export const HOURS = 24;

/** Monday first: a raid week is planned from Monday, not from Sunday. */
export const DAYS: { en: string; th: string; short_en: string; short_th: string }[] = [
  { en: "Monday", th: "จันทร์", short_en: "Mon", short_th: "จ" },
  { en: "Tuesday", th: "อังคาร", short_en: "Tue", short_th: "อ" },
  { en: "Wednesday", th: "พุธ", short_en: "Wed", short_th: "พ" },
  { en: "Thursday", th: "พฤหัสบดี", short_en: "Thu", short_th: "พฤ" },
  { en: "Friday", th: "ศุกร์", short_en: "Fri", short_th: "ศ" },
  { en: "Saturday", th: "เสาร์", short_en: "Sat", short_th: "ส" },
  { en: "Sunday", th: "อาทิตย์", short_en: "Sun", short_th: "อา" },
];

export const SLOTS = DAYS.length * HOURS;          // 168
export const EMPTY = "0".repeat(SLOTS);

/** Row-major by day: all 24 hours of Monday, then Tuesday, and so on. */
export const slotIndex = (day: number, hour: number) => day * HOURS + hour;

/**
 * The four blocks the first version stored, kept only so values written then
 * still mean something now. Each expands to the hours it covered.
 */
const LEGACY_BLOCK_HOURS: [number, number][] = [
  [6, 12],   // morning
  [12, 18],  // afternoon
  [18, 22],  // evening
  [22, 26],  // late — wraps past midnight, hence the modulo below
];
const LEGACY_SLOTS = DAYS.length * LEGACY_BLOCK_HOURS.length;   // 28

function expandLegacy(raw: string): boolean[] {
  const out = Array<boolean>(SLOTS).fill(false);
  for (let d = 0; d < DAYS.length; d++) {
    for (let b = 0; b < LEGACY_BLOCK_HOURS.length; b++) {
      if (raw[d * LEGACY_BLOCK_HOURS.length + b] !== "1") continue;
      const [from, to] = LEGACY_BLOCK_HOURS[b];
      for (let h = from; h < to; h++) out[slotIndex(d, h % HOURS)] = true;
    }
  }
  return out;
}

/** Anything malformed reads as "nothing filled in" rather than throwing. */
export function parse(raw: string | null | undefined): boolean[] {
  if (!raw || !/^[01]+$/.test(raw)) return Array<boolean>(SLOTS).fill(false);
  if (raw.length === LEGACY_SLOTS) return expandLegacy(raw);
  if (raw.length !== SLOTS) return Array<boolean>(SLOTS).fill(false);
  return [...raw].map((c) => c === "1");
}

export function serialise(slots: boolean[]): string | null {
  const out = slots.map((v) => (v ? "1" : "0")).join("");
  // An all-empty grid is "not filled in", not "never free" — storing it would
  // claim somebody answered when they only opened the page.
  return out === EMPTY ? null : out;
}

export const isEmpty = (raw: string | null | undefined) =>
  !raw || !/1/.test(raw);

export const dayLabel = (i: number, lang: Lang) =>
  lang === "th" ? DAYS[i].th : DAYS[i].en;
export const dayShort = (i: number, lang: Lang) =>
  lang === "th" ? DAYS[i].short_th : DAYS[i].short_en;

/** 20 -> "20:00". Midnight at the end of a range reads as 24:00, not 00:00. */
export const hourLabel = (h: number, endOfRange = false) =>
  `${String(endOfRange && h === 0 ? 24 : h).padStart(2, "0")}:00`;

/**
 * The contiguous stretches somebody is free on one day, as [from, to) hours.
 * A run reaching midnight ends at 24 so the label reads "22:00–24:00".
 */
export function dayRanges(slots: boolean[], day: number): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let h = 0; h < HOURS; h++) {
    const on = slots[slotIndex(day, h)];
    if (on && start === null) start = h;
    if (!on && start !== null) { out.push([start, h]); start = null; }
  }
  if (start !== null) out.push([start, HOURS]);
  return out;
}

/** One readable line per day, for anywhere the grid does not fit. */
export function describeDay(slots: boolean[], day: number, lang: Lang): string {
  const ranges = dayRanges(slots, day);
  if (!ranges.length) return "";
  if (ranges.length === 1 && ranges[0][0] === 0 && ranges[0][1] === HOURS) {
    return lang === "th" ? "ทั้งวัน" : "All day";
  }
  return ranges
    .map(([a, b]) => `${hourLabel(a)}–${hourLabel(b % HOURS, true)}`)
    .join(", ");
}
