/**
 * The Popoto Board in the middle of town (the owner's call, 2026-10-02): how
 * the building work is going, and the vote for what goes up next.
 *
 * The vote itself lives in the database (v103: town_vote, town_vote_tally,
 * town_my_vote); this file only says what the board shows.
 */

/** The poll the board's vote is (town_polls.id). */
export const POLL = "next-building";

export interface Choice {
  /** What town_vote takes: 1, 2, 3. */
  n: number;
  /** Its picture in the scenery (lib/town/scenery). */
  art: string;
  th: string;
  en: string;
}

/** In the poll's order; v103 opened it with exactly these three. */
export const CHOICES: Choice[] = [
  { n: 1, art: "ic_condo", th: "คอนโดพร้อมห้องส่วนตัว", en: "A condo with private rooms" },
  { n: 2, art: "ic_land", th: "ที่ดินหมู่บ้าน", en: "Village land plots" },
  { n: 3, art: "ic_office", th: "สำนักงานเทศบาลหมู่บ้าน Popoto", en: "The Popoto village office" },
];

export interface Work {
  th: string;
  en: string;
  /** The Bangkok date work began, and the dates it should be done between, YYYY-MM-DD. */
  began: string;
  soonest: string;
  latest: string;
}

/** What is being built now. Popoto Shop: "อีก 3-4 วัน" on 2026-10-02. */
export const BUILDING: Work = { th: "Popoto Shop", en: "Popoto Shop", began: "2026-10-02", soonest: "2026-10-05", latest: "2026-10-06" };

/** The stages a building goes up in, in order; lib/town/world says which the shop is at (SHOP.stage, from 1). */
export const STAGES: Array<{ th: string; en: string }> = [
  { th: "วางฐานราก", en: "Foundation" },
  { th: "ขึ้นโครงและผนัง", en: "Frame and walls" },
  { th: "มุงหลังคาและตกแต่ง", en: "Roof and fittings" },
];

/** "ขั้นที่ 2 จาก 3 · ขึ้นโครงและผนัง": the stage, by its number from 1 (kept within the list). */
export function stageText(stage: number, th: boolean): string {
  const n = Math.min(STAGES.length, Math.max(1, Math.floor(stage)));
  const s = STAGES[n - 1];
  return th ? `ขั้นที่ ${n} จาก ${STAGES.length} · ${s.th}` : `Stage ${n} of ${STAGES.length} · ${s.en}`;
}

const DAY = 86_400_000;

/** Whole Bangkok days from `now` to a Bangkok date: 0 on the day itself, negative after it. */
export function daysUntil(date: string, now: Date): number {
  const [y, m, d] = date.split("-").map(Number);
  const today = Math.floor((now.getTime() + 7 * 3_600_000) / DAY);
  return Math.round(Date.UTC(y, m - 1, d) / DAY) - today;
}

/** "อีกราว 3–4 วัน", counting down by Bangkok calendar day. */
export function etaText(work: Work, now: Date, th: boolean): string {
  const a = daysUntil(work.soonest, now), b = daysUntil(work.latest, now);
  if (b < 0) return th ? "ใกล้เสร็จแล้ว อีกนิดเดียว" : "Nearly there";
  if (b === 0) return th ? "น่าจะเสร็จวันนี้" : "Should be done today";
  if (a <= 0) return th ? "น่าจะเสร็จวันนี้หรือพรุ่งนี้" : "Should be done today or tomorrow";
  if (a === b) return th ? `อีกราว ${a} วันกว่าจะเสร็จ` : `About ${a} more day${a === 1 ? "" : "s"}`;
  return th ? `อีกราว ${a}–${b} วันกว่าจะเสร็จ` : `About ${a}–${b} more days`;
}

/** The same, short enough for the board's own paper: "อีก 3–4 วัน". */
export function etaShort(work: Work, now: Date, th: boolean): string {
  const a = daysUntil(work.soonest, now), b = daysUntil(work.latest, now);
  if (b < 0) return th ? "ใกล้เสร็จแล้ว" : "nearly done";
  if (b === 0) return th ? "เสร็จวันนี้" : "done today";
  if (a <= 0) return th ? "อีก 0–1 วัน" : "0–1 days to go";
  if (a === b) return th ? `อีก ${a} วัน` : `${a} day${a === 1 ? "" : "s"} to go`;
  return th ? `อีก ${a}–${b} วัน` : `${a}–${b} days to go`;
}

/**
 * How far along the work looks, 0 to 1: the time gone since it began against
 * the time to the middle of the expected finish. Never empty, never full (the
 * shop is finished by hand, not by the clock).
 */
export function progressOf(work: Work, now: Date): number {
  const start = -daysUntil(work.began, now), length = (daysUntil(work.soonest, now) + daysUntil(work.latest, now)) / 2 + start + 0.5;
  const hours = ((now.getTime() / 3_600_000 + 7) % 24) / 24;
  return Math.min(0.92, Math.max(0.08, (start + hours) / Math.max(1, length)));
}

/** Each choice's votes, from the tally's rows (choices nobody picked are missing there). */
export function countsOf(rows: Array<{ choice: number; votes: number }>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const c of CHOICES) out[c.n] = 0;
  for (const r of rows) if (r.choice in out) out[r.choice] = Math.max(0, Math.floor(r.votes));
  return out;
}

/**
 * The counts after I change my vote, before the database answers: my old
 * choice loses one, my new one gains one.
 */
export function moved(counts: Record<number, number>, from: number | null, to: number | null): Record<number, number> {
  const out = { ...counts };
  if (from !== null && out[from] > 0) out[from]--;
  if (to !== null) out[to] = (out[to] ?? 0) + 1;
  return out;
}
