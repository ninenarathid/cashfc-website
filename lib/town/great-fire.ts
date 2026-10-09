import type { Outcome } from "./forge";

/**
 * The forge's great fire: the one thing a try at the top needs that no member can own (the owner, 2026-10-09, to the
 * design both AIs laid before him: "ตาม codex แต่ไม่อยากให้ 24 วันเป็นตัวเลขตายตัว อยากให้สุ่ม และใช่ หมู่บ้านนี้ไม่ควรมีนายทุน").
 *
 * Coins do not make the top rare (a keen member earns its fees in days), so what makes it rare is something that
 * comes into the world at a pace of its own, whatever the money does. The village has ONE great fire at the most. A
 * while after the last one was spent (a while drawn by chance, which nobody is told), its two halves can be found:
 * a flint by whoever next breaks a plain rock, tinder by whoever next fells a tree, with any tool. Neither is the
 * finder's: both go into the village's keeping under the finder's name, and with both there the fire is lit. It does
 * not pile up: a fire that waits is one fire, however long it waits.
 *
 * It is used by turns. A member with a tool one level under the top, who has never taken the top, may put their name
 * in the row. The first of the row has the lit fire to themself for a while; after each such while one more of the
 * row may use it as well, so that somebody who is away is passed over and keeps their place. A try at the top spends
 * the fire whatever comes of it: taken, the member is counted for good as one who has reached the top (on whichever
 * tool, wherever its forging is moved to afterwards) and leaves the row; failed, they go to the row's end.
 *
 * Nothing of it is bought, sold, handed over or held in a bag, so nobody can corner it. It aims at about one NEW
 * member at the top every two months (a try takes four times in ten: two and a half fires to a success, a fire every
 * twenty-four days or so) and cannot promise it.
 */
const HOUR = 3_600_000, DAY = 24 * HOUR;
export const GREAT_FIRE = {
  /** After a fire is spent, the halves of the next can be found no sooner than this and no later than that. Drawn by chance each time; no page is ever told the moment. */
  wait: { least: 14 * DAY, most: 34 * DAY },
  /** The first of the row has a lit fire to themself this long; after each such while one more of the row may use it too. */
  turn: 24 * HOUR,
  /** As many names as the row holds. */
  row: 60,
} as const;

export type Half = "flint" | "tinder";
export interface Finder { id: string; name: string; at: number }
export interface Waiting { id: string; name: string; since: number }
/** What the village keeps of its great fire. */
export interface GreatFire {
  /** From when the halves of the next fire can be found. */
  due: number;
  /** The halves found since then, and by whom. With both, the fire is lit. */
  flint: Finder | null;
  tinder: Finder | null;
  /** Who waits for a turn, in order. */
  row: Waiting[];
  /** Who has ever taken the top: for good. */
  topped: string[];
}
/** A village's first fire can be found at once. */
export const newGreatFire = (): GreatFire => ({ due: 0, flint: null, tinder: null, row: [], topped: [] });

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const finder = (v: unknown): Finder | null => {
  const f = v as Partial<Finder> | null;
  return f && typeof f === "object" && typeof f.id === "string" && f.id && num(f.at) ? { id: f.id, name: typeof f.name === "string" ? f.name.slice(0, 40) : "", at: f.at } : null;
};
/** What was kept, made sound: nobody twice in the row, nobody in it who has taken the top. */
export function soundGreatFire(kept: unknown): GreatFire {
  const k = (kept && typeof kept === "object" ? kept : {}) as Partial<Record<keyof GreatFire, unknown>>;
  const topped = [...new Set((Array.isArray(k.topped) ? k.topped : []).filter((x): x is string => typeof x === "string" && !!x))];
  const seen = new Set<string>(topped), row: Waiting[] = [];
  for (const w of Array.isArray(k.row) ? k.row : []) {
    const f = finder({ ...(w as object), at: (w as Waiting | null)?.since });
    if (!f || seen.has(f.id) || row.length >= GREAT_FIRE.row) continue;
    seen.add(f.id);
    row.push({ id: f.id, name: f.name, since: f.at });
  }
  return { due: num(k.due) ? Math.max(0, k.due) : 0, flint: finder(k.flint), tinder: finder(k.tinder), row, topped };
}

/** Since when the fire is lit: both halves are in the village's keeping. Null while it is not. */
export const litAt = (f: GreatFire): number | null => (f.flint && f.tinder ? Math.max(f.flint.at, f.tinder.at) : null);
/** How many of the row's first may use the fire at a moment: none while it is not lit, then one, and one more with every turn's while that has gone by. */
export function openTo(f: GreatFire, now: number): number {
  const lit = litAt(f);
  return lit === null || now < lit ? 0 : Math.min(f.row.length, 1 + Math.floor((now - lit) / GREAT_FIRE.turn));
}

/**
 * A plain rock was broken, or a tree felled: if the fire's time has come and that half is not yet found, this is
 * its finding, into the village's keeping under the finder's name. `found` says whether it was; `lit`, whether
 * that lit the fire.
 */
export function halfFound(f: GreatFire, half: Half, who: { id: string; name: string }, now: number): { fire: GreatFire; found: boolean; lit: boolean } {
  if (now < f.due || f[half]) return { fire: f, found: false, lit: false };
  const fire: GreatFire = { ...f, [half]: { id: who.id, name: who.name, at: now } };
  return { fire, found: true, lit: litAt(fire) !== null };
}

export type FireRefusal =
  | "fire"    // the village has no great fire lit now
  | "row"     // not in the row: ask for a turn first
  | "turn"    // it is somebody else's turn first
  | "topped"  // has taken the top before: the row is for those who have not
  | "level"   // no tool one level under the top
  | "twice"   // in the row already
  | "places"  // the row is full
  | "none";   // not in the row (leaving it)
type Did<T = unknown> = ({ ok: true; fire: GreatFire } & T) | { ok: false; why: FireRefusal };

/** Put a name in the row: somebody who has never taken the top, and has a tool one level under it now. */
export function joinRow(f: GreatFire, who: { id: string; name: string }, ready: boolean, now: number): Did {
  if (f.topped.includes(who.id)) return { ok: false, why: "topped" };
  if (f.row.some((w) => w.id === who.id)) return { ok: false, why: "twice" };
  if (!ready) return { ok: false, why: "level" };
  if (f.row.length >= GREAT_FIRE.row) return { ok: false, why: "places" };
  return { ok: true, fire: { ...f, row: [...f.row, { id: who.id, name: who.name, since: now }] } };
}
/** Take one's name out of the row. */
export function leaveRow(f: GreatFire, id: string): Did {
  return f.row.some((w) => w.id === id) ? { ok: true, fire: { ...f, row: f.row.filter((w) => w.id !== id) } } : { ok: false, why: "none" };
}
/** Why a member may not try for the top now; null when they may. */
export function fireWhy(f: GreatFire, id: string, now: number): FireRefusal | null {
  if (litAt(f) === null) return "fire";
  const at = f.row.findIndex((w) => w.id === id);
  if (at < 0) return f.topped.includes(id) ? "topped" : "row";
  return at < openTo(f, now) ? null : "turn";
}
/**
 * A try at the top was made with the fire: it is spent whatever came of it, and the halves of the next can be found
 * after a while drawn by `chance` (0 to 1). Taken: the member is counted for good and leaves the row. Failed: to
 * the row's end.
 */
export function fireSpent(f: GreatFire, who: { id: string; name: string }, out: Outcome, now: number, chance: number): GreatFire {
  const { least, most } = GREAT_FIRE.wait, drawn = Math.round(least + Math.max(0, Math.min(1, chance)) * (most - least));
  const rest = f.row.filter((w) => w.id !== who.id);
  return {
    due: now + drawn, flint: null, tinder: null,
    row: out === "taken" ? rest : [...rest, { id: who.id, name: who.name, since: now }],
    topped: out === "taken" && !f.topped.includes(who.id) ? [...f.topped, who.id] : f.topped,
  };
}

/**
 * What a page is told of the fire: the halves found and by whom, whether it is lit, the row with how many of its
 * first may use it now, where I stand in it and whether I have taken the top. Never when the next one comes.
 */
export interface FireTold {
  flint: { name: string } | null;
  tinder: { name: string } | null;
  lit: boolean;
  row: Array<{ id: string; name: string }>;
  open: number;
  mine: number;
  topped: boolean;
}
export function fireTold(f: GreatFire, me: string, now: number): FireTold {
  return {
    flint: f.flint ? { name: f.flint.name } : null, tinder: f.tinder ? { name: f.tinder.name } : null, lit: litAt(f) !== null,
    row: f.row.map((w) => ({ id: w.id, name: w.name })), open: openTo(f, now), mine: f.row.findIndex((w) => w.id === me), topped: f.topped.includes(me),
  };
}
