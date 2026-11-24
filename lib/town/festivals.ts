import type { Line } from "./talk";

/**
 * The town's festival calendar, pinned on the Popoto Board in the middle of the village.
 *
 * The owner, 2026-11-22: "ช่วยทำระบบเทศกาลให้หน่อย โดยจะมี calendar แปะอยู่ที่บอร์ดประจำหมู่บ้าน
 * ผู้เล่นสามารถดูเทศกาลในอนาคตได้". A festival is kept as one EDITION a year (a row of
 * `town_festivals`): festivals that follow the moon (Loy Krathong) fall on another day each year, so the
 * next year's edition is written down by an admin, never repeated on the same date by itself (Codex's point).
 *
 * An edition has WINDOWS: named stretches of time, which may overlap (the float night and the vote).
 * Pure: nothing here reads a clock; `now` is always handed in.
 */

export type WindowKind = "announce" | "make" | "vote" | "float" | "results" | "auction" | "dawn";

export interface FestivalWindow {
  kind: WindowKind;
  /** ISO time it opens. */
  from: string;
  /** ISO time it closes; null when it stays (results, shown until the next edition). */
  until: string | null;
  th: string;
  en: string;
}

export interface Festival {
  id: number;
  slug: string;
  year: number;
  name: Line;
  about: Line;
  /** An icon of the town's atlas. */
  icon: string;
  /** When it first shows as coming (the announcement) and when it is over and goes to the archive. */
  starts: string;
  ends: string;
  windows: FestivalWindow[];
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : Number.POSITIVE_INFINITY);

/** Whether a window is open at a moment. */
export function isOpen(w: FestivalWindow | undefined, now: number): boolean {
  return !!w && ms(w.from) <= now && now < ms(w.until);
}

export const windowOf = (f: Festival, kind: WindowKind) => f.windows.find((w) => w.kind === kind);

/** Where a festival stands: before it shows, coming, on (some window open), between windows, or over. */
export type Stage = "hidden" | "coming" | "on" | "after";

export function stageOf(f: Festival, now: number): Stage {
  if (now < ms(f.starts)) return "hidden";
  if (now >= ms(f.ends)) return "after";
  const first = Math.min(...f.windows.filter((w) => w.kind !== "announce" && w.kind !== "auction").map((w) => ms(w.from)));
  return now < first ? "coming" : "on";
}

/** The windows open now, in the order they were written. */
export const openWindows = (f: Festival, now: number) => f.windows.filter((w) => isOpen(w, now));

/** The next window to open after `now` (not counting the announcement). */
export function nextWindow(f: Festival, now: number): FestivalWindow | null {
  const later = f.windows.filter((w) => w.kind !== "announce" && ms(w.from) > now).sort((a, b) => ms(a.from) - ms(b.from));
  return later[0] ?? null;
}

/** The calendar's order: what is on first, then what is coming soonest, then the archive newest first. */
export function calendarOrder(list: Festival[], now: number): { on: Festival[]; coming: Festival[]; past: Festival[] } {
  const on: Festival[] = [], coming: Festival[] = [], past: Festival[] = [];
  for (const f of list) {
    const s = stageOf(f, now);
    if (s === "on") on.push(f);
    else if (s === "coming") coming.push(f);
    else if (s === "after") past.push(f);
    else coming.push(f); // a row not yet announced is still in the year's calendar: its date shows, nothing more
  }
  const firstOpen = (f: Festival) => Math.min(...f.windows.map((w) => ms(w.from)));
  on.sort((a, b) => firstOpen(a) - firstOpen(b));
  coming.sort((a, b) => firstOpen(a) - firstOpen(b));
  past.sort((a, b) => ms(b.ends) - ms(a.ends));
  return { on, coming, past };
}

const BKK = 7 * 3_600_000;
/** A Bangkok wall-clock time as an ISO string (the board, the owner and the members all speak Bangkok time). */
export const bkk = (y: number, m: number, d: number, h = 0, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min) - BKK).toISOString();

/** Day and time in Bangkok, as the board shows them: "อ. 24 พ.ย. 18:00". */
export function whenText(iso: string, th: boolean, withTime = true): string {
  const d = new Date(Date.parse(iso) + BKK);
  const days = th ? ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = th
    ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0"), mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}${withTime ? ` ${hh}:${mm}` : ""}`;
}

/** How long until a moment, short: "2 วัน 4 ชม.", "3 ชม. 12 น.", "12 น.". */
export function untilText(iso: string, now: number, th: boolean): string {
  const left = Math.max(0, ms(iso) - now), mins = Math.ceil(left / 60_000);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return th ? `${d} วัน ${h} ชม.` : `${d}d ${h}h`;
  if (h > 0) return th ? `${h} ชม. ${m} น.` : `${h}h ${m}m`;
  return th ? `${m} น.` : `${m}m`;
}

/**
 * Loy Krathong's phases as the members are told them (the owner, 2026-11-24: "ประกาศเฟสทำกระทง โหวต ลอย ให้ชัดเจน"):
 * making, voting, floating, the results, in the order they open (the vote runs with the making; the float overlaps
 * them the festival's evening); the results are news for a day and a half, then the hall says them.
 */
export type Phase = "make" | "vote" | "float" | "results";
export const PHASES: readonly Phase[] = ["make", "vote", "float", "results"];
export const PHASE_NAME: Record<Phase, { th: string; en: string }> = {
  make: { th: "ทำกระทง", en: "Make" }, vote: { th: "โหวต", en: "Vote" }, float: { th: "ลอยกระทง", en: "Float" }, results: { th: "ประกาศผล", en: "Results" },
};
/** The same, short, for a phone's corner chip (Codex's UI review: three full names were cut off at 384 px). */
export const PHASE_SHORT: Record<Phase, { th: string; en: string }> = {
  make: { th: "ทำ", en: "Make" }, vote: { th: "โหวต", en: "Vote" }, float: { th: "ลอย", en: "Float" }, results: { th: "ผล", en: "Results" },
};
export const PHASE_ICON: Record<Phase, string> = { make: "krathongKeepsake", vote: "festivalLantern", float: "floatKrathong", results: "krathongTrophy" };
const RESULTS_NEWS_MS = 36 * 3_600_000;

/** The phases open at a moment, in their order. */
export function openPhases(f: Festival, now: number): Phase[] {
  return PHASES.filter((k) => {
    const w = windowOf(f, k);
    return !!w && isOpen(w, now) && (k !== "results" || now - Date.parse(w.from) < RESULTS_NEWS_MS);
  });
}
/** Where a phase stands at a moment: done, open now, or still to come. */
export function phaseState(f: Festival, k: Phase, now: number): "done" | "now" | "next" | "none" {
  const w = windowOf(f, k);
  if (!w) return "none";
  if (isOpen(w, now)) return "now";
  return Date.parse(w.from) > now ? "next" : "done";
}
/** The soonest a phase open now closes (null when none of them closes). */
export function soonestClose(f: Festival, now: number): string | null {
  const ends = openPhases(f, now).map((k) => windowOf(f, k)?.until).filter((u): u is string => !!u).sort((a, b) => Date.parse(a) - Date.parse(b));
  return ends[0] ?? null;
}
/** A time said short: the hour alone today (Bangkok), else the day and the hour. */
export function shortWhen(iso: string, now: number, th: boolean): string {
  const a = new Date(Date.parse(iso) + BKK), b = new Date(now + BKK);
  const hm = `${String(a.getUTCHours()).padStart(2, "0")}:${String(a.getUTCMinutes()).padStart(2, "0")}`;
  if (a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)) return hm;
  return `${whenText(iso, th, false)} ${hm}`;
}

/**
 * Loy Krathong 2026 as the owner set it (2026-11-22), Codex's schedule B taken by his "ทำเลย":
 * the contest's krathongs made 23 Nov 18:00 → 24 Nov 18:00; the float opens 24 Nov 18:00 (the full moon) for two
 * nights; the vote runs the float's first day, 24 Nov 18:00 → 25 Nov 18:00, so every entry has one whole
 * evening; results and the winners' procession 25 Nov 20:00. The database's row is what counts; this is the
 * trial room's copy and the migration's first row.
 */
export const LOY_KRATHONG_2026: Festival = {
  id: 1,
  slug: "loykrathong",
  year: 2026,
  name: { th: "ลอยกระทง", en: "Loy Krathong" },
  about: {
    th: "ประกอบกระทงจากของทุกสาย ประกวด แล้วลอยใต้จันทร์เต็มดวง",
    en: "Build a krathong from every line's finds, enter it, then float it under the full moon",
  },
  icon: "floatKrathong",
  starts: bkk(2026, 11, 22, 22),
  ends: bkk(2026, 11, 26, 5),
  windows: [
    { kind: "announce", from: bkk(2026, 11, 22, 22), until: bkk(2026, 11, 23, 18), th: "เตรียมของ", en: "Gather" },
    { kind: "auction", from: bkk(2026, 11, 15, 20, 30), until: bkk(2026, 11, 23, 20), th: "ปิดประมูลชุดลอยกระทง", en: "Festival outfits auction closes" },
    // (2026-11-24, the owner with Aqua's announcement, "ทำกระทงได้เรื่อยๆ จนถึงเวลาเที่ยงคืน": entries until midnight, the
    // float from 18:00 as before, so the two overlap that evening; then "เฟสเปิดโหวต เอาให้เวลาเดียวกับช่วงทำกระทงเลย":
    // the vote open the whole time the entries are; the results at 21:00 the next day)
    { kind: "make", from: bkk(2026, 11, 23, 18), until: bkk(2026, 11, 25, 0), th: "ส่งกระทงประกวด", en: "Enter a krathong" },
    { kind: "float", from: bkk(2026, 11, 24, 18), until: bkk(2026, 11, 26, 5), th: "ลอยกระทง", en: "Float" },
    { kind: "vote", from: bkk(2026, 11, 23, 18), until: bkk(2026, 11, 25, 0), th: "โหวตกระทง", en: "Vote" },
    { kind: "results", from: bkk(2026, 11, 25, 21), until: null, th: "ประกาศผล", en: "Results" },
  ],
};
