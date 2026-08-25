import type { Lang } from "@/lib/i18n";

/**
 * When somebody is around to play, as seven days of four blocks.
 *
 * Four blocks rather than twenty-four hours: nobody fills in a 168-cell grid, and
 * "Saturday evening" is the resolution the FC actually plans at. The boundaries
 * follow how the evening is really used here — 18:00 is when people start
 * drifting in, 22:00 is when a raid night is either over or has become a late
 * one, so those two are separate blocks rather than one long stretch.
 *
 * Times are local Thai time, which is what everybody in this FC schedules in.
 */
export const BLOCKS: { key: string; hours: string; en: string; th: string }[] = [
  { key: "morning", hours: "06:00–12:00", en: "Morning", th: "เช้า" },
  { key: "afternoon", hours: "12:00–18:00", en: "Afternoon", th: "บ่าย" },
  { key: "evening", hours: "18:00–22:00", en: "Evening", th: "เย็น" },
  { key: "late", hours: "22:00–02:00", en: "Late", th: "ดึก" },
];

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

export const SLOTS = DAYS.length * BLOCKS.length;   // 28
export const EMPTY = "0".repeat(SLOTS);

export const slotIndex = (day: number, block: number) => day * BLOCKS.length + block;

/** Anything malformed reads as "nothing filled in" rather than throwing. */
export function parse(raw: string | null | undefined): boolean[] {
  if (!raw || raw.length !== SLOTS || !/^[01]+$/.test(raw)) {
    return Array<boolean>(SLOTS).fill(false);
  }
  return [...raw].map((c) => c === "1");
}

export function serialise(slots: boolean[]): string | null {
  const out = slots.map((v) => (v ? "1" : "0")).join("");
  // An all-empty grid is "not filled in", not "never free" — storing it would
  // claim somebody answered when they only opened the page.
  return out === EMPTY ? null : out;
}

export const dayLabel = (i: number, lang: Lang) =>
  lang === "th" ? DAYS[i].th : DAYS[i].en;
export const dayShort = (i: number, lang: Lang) =>
  lang === "th" ? DAYS[i].short_th : DAYS[i].short_en;
export const blockLabel = (i: number, lang: Lang) =>
  lang === "th" ? BLOCKS[i].th : BLOCKS[i].en;

/** A one-line summary for somewhere there is no room for the grid. */
export function summarise(raw: string | null | undefined, lang: Lang): string {
  const slots = parse(raw);
  const on = slots.filter(Boolean).length;
  if (!on) return "";
  if (on === SLOTS) return lang === "th" ? "ว่างทุกวัน ทุกช่วง" : "Free any time";
  const days = DAYS.map((_, d) =>
    BLOCKS.some((_, b) => slots[slotIndex(d, b)]) ? d : -1).filter((d) => d >= 0);
  return days.map((d) => dayShort(d, lang)).join(" ");
}
