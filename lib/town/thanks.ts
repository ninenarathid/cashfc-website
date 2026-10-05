import { dayOf } from "./stamina";
import { no, weekOf, type Done } from "./trade";
import type { WellLog } from "./well";

/**
 * Thanks, at the picking: the town's own popoto.
 *
 * Whoever waters somebody else's plant, or carried the water it was watered
 * with, helped it grow, and until now the plant's owner never knew who. The
 * well's book follows the water (lib/town/well), so each plot remembers who
 * has helped the plant in it since it was sown; standing on a plot of one's
 * own, one tap thanks them all.
 *
 * A thanks is a popoto of Cash Town's own, as the owner settled it before
 * there was any way to give one (2026-10-03: "โยนฟรีวันละ 1 ต่อคู่ นับคะแนนเป็น
 * Popoto จาก cash town (leader board อันใหม่)"): free, **one a day from one
 * person to another**, counted on a board of the town's own, and nothing to
 * do with the popoto of the site (a profile's, a picture's) or with coins.
 * It buys nothing and cannot be spent: it is being thanked, counted.
 *
 * Pure. The database keeps the same (v129).
 */
export const THANKS = {
  /** How many the board lists: of the week's most thanked, and of all time's. */
  listed: 10,
};

/** One thanks: from whom to whom, on which day of the game's, and when. */
export interface Thanks { from: string; to: string; day: number; at: number }
/** Somebody who helped a plant: how many times they watered it, and how many waterings of it were of water they carried. */
export interface Helper { id: string; water: number; carry: number }

/** Who helped my plant in a plot, the most first: nobody, when the plant there is not mine (or nobody helped it). */
export function helpersOf(well: WellLog, plot: string, me: string): Helper[] {
  const help = well.help[plot];
  if (!help || help.owner !== me) return [];
  return Object.entries(help.by).filter(([id]) => id !== me).map(([id, h]) => ({ id, ...h }))
    .sort((a, b) => b.water + b.carry - (a.water + a.carry) || (a.id < b.id ? -1 : 1));
}
/** Of those, the ones I have not thanked today. */
export const unthanked = (given: Thanks[], helpers: Helper[], me: string, now: number): Helper[] => {
  const day = dayOf(now);
  return helpers.filter((h) => !given.some((t) => t.from === me && t.to === h.id && t.day === day));
};
/** Every plot of mine with somebody in it to thank today. */
export function toThank(well: WellLog, given: Thanks[], me: string, now: number): Record<string, Helper[]> {
  const out: Record<string, Helper[]> = {};
  for (const plot of Object.keys(well.help)) {
    const left = unthanked(given, helpersOf(well, plot, me), me, now);
    if (left.length) out[plot] = left;
  }
  return out;
}

/** Thank everybody who helped my plant in a plot and whom I have not thanked today. Gives the thanks as they stand afterwards, and who was thanked. */
export function thank(well: WellLog, given: Thanks[], plot: string, me: string, now: number): Done<{ given: Thanks[]; thanked: string[] }> {
  const left = unthanked(given, helpersOf(well, plot, me), me, now);
  if (!left.length) return no("none");
  const day = dayOf(now);
  return { ok: true, thanked: left.map((h) => h.id), given: [...given, ...left.map((h): Thanks => ({ from: me, to: h.id, day, at: now }))] };
}

/** The board as somebody reads it: the thanks they have had (today's, by whom; this week's; all told), and who has been thanked most, this week and ever. */
export interface ThanksBoard {
  today: Array<{ id: string; name: string }>;
  week: number;
  all: number;
  top: Array<{ id: string; name: string; n: number }>;
  ever: Array<{ id: string; name: string; n: number }>;
}
export function boardOf(given: Thanks[], me: string, now: number, nameOf: (id: string) => string): ThanksBoard {
  const day = dayOf(now), week = weekOf(now);
  const most = (list: Thanks[]) => {
    const n = new Map<string, number>();
    for (const t of list) n.set(t.to, (n.get(t.to) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, THANKS.listed).map(([id, count]) => ({ id, name: nameOf(id), n: count }));
  };
  const weeks = given.filter((t) => weekOf(t.at) === week), mine = given.filter((t) => t.to === me);
  return {
    today: mine.filter((t) => t.day === day).sort((a, b) => a.at - b.at || (a.from < b.from ? -1 : 1)).map((t) => ({ id: t.from, name: nameOf(t.from) })),
    week: weeks.filter((t) => t.to === me).length, all: mine.length,
    top: most(weeks), ever: most(given),
  };
}
