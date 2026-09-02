/**
 * Every date on this site, written the same way.
 *
 * DD/MM/YYYY, because that is how the FC writes one and because the site had
 * been showing four shapes at once — "2 Sept 2026" on the front page, "30 Aug
 * 2026" in the admin table, "02 Sept 2026, 11:22:07" in the log, and Thai month
 * names for a Thai reader. Each was defensible alone; together they made
 * comparing two dates on two screens a small translation exercise.
 *
 * Not locale-formatted. A shared format is the point: 02/09/2026 means the same
 * thing to both halves of a bilingual FC, while a locale-aware one would show
 * the same row differently to two people sitting next to each other.
 *
 * The Gregorian calendar in both languages, deliberately. Thai locales default
 * to the Buddhist era, which would print 2569 for this year — right for a Thai
 * calendar and wrong beside a Lodestone timestamp, a patch number, or the other
 * half of the FC's screen.
 */

const two = (n: number) => String(n).padStart(2, "0");

/** A Date, or anything Date can be made from. Null and nonsense come back "—". */
function asDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 02/09/2026 */
export function fmtDate(value: Date | string | number | null | undefined): string {
  const d = asDate(value);
  if (!d) return "—";
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 02/09/2026 14:30 */
export function fmtDateTime(value: Date | string | number | null | undefined): string {
  const d = asDate(value);
  if (!d) return "—";
  return `${fmtDate(d)} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** 02/09/2026 14:30:15 — for the log, where the second is the point. */
export function fmtExact(value: Date | string | number | null | undefined): string {
  const d = asDate(value);
  if (!d) return "—";
  return `${fmtDateTime(d)}:${two(d.getSeconds())}`;
}

/**
 * 02/09 — the year dropped where every row is from the last few days anyway.
 *
 * Only for lists that are already about "lately". Anywhere a date might be
 * years old, the year is not decoration.
 */
export function fmtShort(value: Date | string | number | null | undefined): string {
  const d = asDate(value);
  if (!d) return "—";
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}`;
}

/** A YYYY-MM-DD from the pipeline or a date column, read as a local day. */
export const fromDay = (day: string) => new Date(`${day}T00:00:00`);
