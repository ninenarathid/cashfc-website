import type { Outcome } from "./forge";
import type { ItemId } from "./items";
import { FORGE, toolKindOf } from "./tools";

/**
 * A try at the forge, shown over the forger's head for everybody who stands in the room (the owner, 2026-10-09:
 * every try, "โชว์หมดเลยตั้งแต่ +1 - +10"). A plate with the tool and the level tried for, the smith's knocks in the
 * beats the forger hears them in, and then what came of it: taken in gold, the level kept in grey, a level lost in
 * red; the higher the level, the more is made of it, and the top is unlike all the rest.
 *
 * It is told to the room once whoever keeps the game has ANSWERED, as a one-off: nobody is shown a try that was
 * refused. What the room says is only looked at (the tool's kind, the level it stood at, how it went): nothing is
 * kept of it, the smith's board never reads it, and it is drawn over the head of whoever said it and nobody else's.
 * So a page that lies can show a made-up try over its own member's head for a few seconds, and no more than that.
 * A gem set, a move and an option drawn are not shown.
 */
export type ForgeShow = {
  item: ItemId;
  /** The level the tool stood at when it was struck. */
  from: number;
  /** How it went; null while the knocks are heard and nothing is known yet (the forger's own page only). */
  out: Outcome | null;
  /** When the show began on this page (the knocks' first beat). */
  at: number;
};
/** What the room is told of a try. */
export type ForgeTold = { item: ItemId; from: number; out: Outcome };

export const SHOW = {
  /** The smith's knocks: so many, so far apart (components/town/TownSmith's own beats). */
  knocks: 3, knock: 380,
  /** How long what came of it is shown; and at the top, taken. */
  result: 3000, top: 5200,
  /** Its last moments, in which it fades. */
  fade: 500,
  /** A forger whose answer does not come is shown knocking no longer than this. */
  wait: 8000,
  /** One member's shows are no nearer to each other than this: a try's own knocks take longer. */
  every: 900,
} as const;
/** How long the knocks take. */
export const KNOCKS_MS = SHOW.knocks * SHOW.knock;
const OUTS: readonly Outcome[] = ["taken", "stays", "down"];

/** The level the tool stands at after the try. */
export const levelAfter = (show: { from: number; out: Outcome | null }): number =>
  show.out === "taken" ? show.from + 1 : show.out === "down" ? Math.max(0, show.from - 1) : show.from;
/** Whether this is the one that is unlike all the rest: the top, taken. */
export const isTop = (show: { from: number; out: Outcome | null }): boolean => show.out === "taken" && show.from + 1 >= FORGE.top;
/** How much is made of it, from a little (the first level) to everything (the top): by the level tried for. */
export const grandeur = (show: { from: number }): number => Math.max(0.1, Math.min(1, (show.from + 1) / FORGE.top));
/** How long a show lasts, from its first knock. */
export const showMs = (show: { from: number; out: Outcome | null }): number =>
  show.out === null ? SHOW.wait : KNOCKS_MS + (isTop(show) ? SHOW.top : SHOW.result);

/** What the room said of a try, read: a tool that can be forged, a level a try can be made from, one of the three ways it goes. Anything else is nothing. */
export function readTold(raw: unknown): ForgeTold | null {
  const p = raw as { i?: unknown; f?: unknown; o?: unknown } | null;
  if (!p || typeof p.i !== "string" || !/^[A-Za-z0-9]{1,24}$/.test(p.i) || !toolKindOf(p.i)) return null;
  if (typeof p.f !== "number" || !Number.isInteger(p.f) || p.f < 0 || p.f >= FORGE.top) return null;
  if (typeof p.o !== "string" || !OUTS.includes(p.o as Outcome)) return null;
  return { item: p.i as ItemId, from: p.f, out: p.o as Outcome };
}
/** A try, as the room is told it. */
export const toldOf = (told: ForgeTold): { i: string; f: number; o: Outcome } => ({ i: told.item, f: told.from, o: told.out });

/**
 * Where a show is at a moment: nothing (over, or not begun), the knocks (which beat, and how far into it, 0 to 1;
 * `held` once all are struck and the answer has not come), or what came of it (how far through, 0 to 1, and how much
 * of it is still to be seen as it fades).
 */
export type ShowAt =
  | { phase: "knocks"; beat: number; into: number; held: boolean }
  | { phase: "result"; ms: number; through: number; alpha: number };
export function showAt(show: ForgeShow, wall: number): ShowAt | null {
  const t = wall - show.at;
  if (t < 0 || t >= showMs(show)) return null;
  if (t < KNOCKS_MS) return { phase: "knocks", beat: Math.floor(t / SHOW.knock), into: (t % SHOW.knock) / SHOW.knock, held: false };
  if (show.out === null) return { phase: "knocks", beat: SHOW.knocks - 1, into: 1, held: true };
  const ms = t - KNOCKS_MS, long = showMs(show) - KNOCKS_MS;
  return { phase: "result", ms, through: ms / long, alpha: Math.min(1, (long - ms) / SHOW.fade) };
}
