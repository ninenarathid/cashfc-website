import { CARRY, carryPace } from "./carry";
import { readTold, type Told } from "./handing";
import { between } from "./line";
import { spend } from "./stamina";
import { handOf, held, take, type Purse } from "./trade";
import type { ItemId } from "./items";
import type { Vec } from "./world";

/**
 * The bridge built by hand, and the village's works (the owner, 2026-10-08, of the bucket line that members stand in
 * rows of four and five for: "สะพานจากมือชาวบ้าน สร้างได้เลย แต่จะเปิดใช้งานเมื่อ session ที่ทำ ขุดแร่กับตัดไม้ทำเสร็จก่อน ไม่งั้น สะพานจะ
 * สร้างเสร็จก่อน patch มา", and "stamina คนยก เหลือ 1 พอ").
 *
 * **A work** is something the whole village gives to: it needs so many of a thing (or takes any amount), and keeps
 * who gave how many and when each first came. It is closed until its owner opens it: while it is, nothing of it is
 * offered and every deed of it is answered `closed`. Nothing closes one for good: a work that is whole is only marked.
 *
 * **The bridge** is the first. There is no way over the river until six hundred stones have been handed from the pile
 * by the uncle's shop to the bridge's foot, six spans of a hundred:
 *
 * - **A stone is in the hands, never in the bag**: lifted at the pile with nothing in the hand, for one stamina.
 * - Whoever holds one **walks at half the pace** (a quarter with no stamina left), on every page that draws them.
 * - It is **handed on** to somebody who stands still with empty hands within six tiles as the path goes: at once, for
 *   nothing. So a row of people brings a stone across the town faster than anybody walks it.
 * - **Laid at the foot** for one stamina: the work has one more.
 * - **Everybody whose hands a stone went through has built with it**: when it is laid, each of them (the last eight)
 *   is counted a stone in the work, and a point on the helpers' line (lib/town/line-points).
 * - A stone can be let go of anywhere: it is gone, and nothing comes back.
 * - With no stamina nothing is refused: the walk is slower, and that is all.
 * - No coins come of it and nothing that can be sold: two stamina a stone is what it costs.
 *
 * Pure. The database does the same (v160: `town.stone_lift`, `stone_pass`, `stone_lay`, `works_give`). It cannot know
 * where anybody stands (lib/town/line says why), so who is near enough to be handed a stone is the page's to hold to;
 * the tile somebody lifts or lays from is the page's word, as it is at the storage box.
 */
export const BRIDGE = {
  /** The work, and the thing it is built of. */
  work: "bridge", thing: "stone",
  /** How many stones the bridge takes, and how many spans they make (a span shows as its share fills). */
  need: 600, spans: 6,
  /** The stamina lifting a stone and laying one cost. Handing one on costs nothing. */
  costs: { lift: 1, lay: 1 },
  /** How far apart two may stand for a stone to be handed on, in tiles as the path goes. */
  reach: 6,
  /** How near the pile, and the foot, one stands to lift and to lay, in tiles. */
  near: 2,
  /** How fast whoever holds a stone walks, as a share of anybody's pace: with stamina left, and with none (lib/town/carry, which the session reads). */
  paces: { held: CARRY.held, spent: CARRY.spent },
  /** How many of those whose hands a stone went through are remembered (the last so many). */
  hands: 8,
  /** The points on the helpers' line a stone laid is worth to each of them. */
  point: 1,
  /** The pile's tile, by the uncle's shop; and the bridge's foot on the town's bank (the mountain's layout says where: one constant). */
  pile: { x: 42, y: 27 }, foot: { x: 11, y: 27 },
};

/** What is the page's alone, as the bucket line's is: how near somebody has to stand to be named with what they lack, and how many are offered at once. */
export const OFFER = { beside: 4, most: 3 };
/**
 * Where the sign with the village's bar stands, the page's alone too (it is only drawn): **beside the foot, away
 * from the water; never on the foot's own tile, on a tile of the bridge's, or where a fishing line's float lies**
 * (the mountain's layout: lib/town/bridge.test holds it to those tiles). Like the pile it stops nobody: no tile's
 * walking changes for it.
 */
export const SIGN_AT: Vec = { x: BRIDGE.foot.x + 1, y: BRIDGE.foot.y - 1 };

/** What a work needs of a thing (null: it takes any amount), and how many it has. */
export interface Need { need: number | null; have: number }
/** A work as its rules read it: whether its owner has opened it, and what it needs. */
export interface Work { open: boolean; needs: Record<string, Need> }
/** What somebody carries in their hands towards a work: which work, which thing, and whose hands it has been through, the holder last. */
export interface Carried { work: string; thing: string; hands: string[] }

/**
 * Why something of a work was not done: it is not open (`closed`); it has all it needs (`whole`); not standing where
 * it is done (`far`); a thing in the hand (`hand`); a stone in the hands already (`held`); no stone to hand on, to
 * lay or to let go of, or nobody there to take it (`none`); fewer in the bag than are given (`short`); more than the
 * work still needs (`over`).
 */
export type BridgeRefusal = "closed" | "whole" | "far" | "hand" | "held" | "none" | "short" | "over";
type No = { ok: false; why: BridgeRefusal };
const no = (why: BridgeRefusal): No => ({ ok: false, why });

/** Whether somebody on a tile stands near enough another to work at it: within so many tiles of it, either way. */
export const nearTile = (at: readonly [number, number] | null, tile: Vec, reach = BRIDGE.near) =>
  !!at && Number.isInteger(at[0]) && Number.isInteger(at[1]) && Math.max(Math.abs(at[0] - tile.x), Math.abs(at[1] - tile.y)) <= reach;
/** Whether a work still wants a thing: it is open, takes the thing, and has not all it needs of it. */
export const wants = (work: Work | null, thing: string): boolean => {
  const n = work?.open ? work.needs[thing] : undefined;
  return !!n && (n.need === null || n.have < n.need);
};

/**
 * Lift a stone at the pile: with nothing in the hand and no stone in the hands, from a tile by the pile. One stamina
 * (none left: lifted all the same). The stone begins with its lifter's hands on it and nobody else's.
 */
export function lift(purse: Purse, carried: Carried | null, work: Work | null, at: readonly [number, number] | null, me: string, now: number):
  { ok: true; purse: Purse; carried: Carried } | No {
  if (!work?.open || !work.needs[BRIDGE.thing]) return no("closed");
  if (!wants(work, BRIDGE.thing)) return no("whole");
  if (carried) return no("held");
  if (handOf(purse)) return no("hand");
  if (!nearTile(at, BRIDGE.pile)) return no("far");
  return { ok: true, purse: spend(purse, BRIDGE.costs.lift, now), carried: { work: BRIDGE.work, thing: BRIDGE.thing, hands: [me] } };
}

/**
 * Hand the stone I hold on to somebody: they have nothing in the hand and no stone. It costs nothing. The stone goes
 * with the hands it came by, the taker's last (once: somebody it comes back to is its last hand, not two of them),
 * the last so many remembered. Gives what the taker now carries.
 */
export function pass(carried: Carried | null, to: string, theirs: Purse, theirCarried: Carried | null, work: Work | null): { ok: true; carried: Carried } | No {
  if (!work?.open) return no("closed");
  if (!carried) return no("none");
  if (theirCarried) return no("held");
  if (handOf(theirs)) return no("hand");
  return { ok: true, carried: { ...carried, hands: [...carried.hands.filter((id) => id !== to), to].slice(-BRIDGE.hands) } };
}

/** How many spans so many stones of so many make: a span for each whole share, none for a work that takes any amount. */
export const spansOf = (have: number, need: number | null): number =>
  (need === null || need <= 0 ? 0 : Math.max(0, Math.min(BRIDGE.spans, Math.floor((have * BRIDGE.spans) / need))));

/**
 * Lay the stone I hold at the foot: from a tile by it, for one stamina (none left: laid all the same). The work has
 * one more; says how many it has now, whose hands the stone came by (each is counted it), how many spans that makes,
 * whether this stone finished one, and whether the work is whole.
 */
export function lay(purse: Purse, carried: Carried | null, work: Work | null, at: readonly [number, number] | null, now: number):
  { ok: true; purse: Purse; have: number; hands: string[]; spans: number; span: boolean; whole: boolean } | No {
  if (!work?.open) return no("closed");
  if (!carried) return no("none");
  const n = work.needs[carried.thing];
  if (!n) return no("none");
  if (n.need !== null && n.have >= n.need) return no("whole");
  if (!nearTile(at, BRIDGE.foot)) return no("far");
  const have = n.have + 1, spans = spansOf(have, n.need);
  return { ok: true, purse: spend(purse, BRIDGE.costs.lay, now), have, hands: carried.hands, spans, span: spans > spansOf(n.have, n.need), whole: n.need !== null && have >= n.need };
}

/** Let go of the stone I hold, wherever I stand: it is gone, and nothing comes back. */
export function drop(carried: Carried | null, work: Work | null): { ok: true } | No {
  if (!work?.open) return no("closed");
  if (!carried) return no("none");
  return { ok: true };
}

/**
 * Give so many of a thing out of the bag to a work (the works' own way in: the bridge's stones come by the hands
 * instead, so no work uses it yet). Refused only for what would pass what the work needs, where it needs so many: a
 * work that takes any amount takes whatever is given. Says how many it has now.
 */
export function give(purse: Purse, work: Work | null, thing: string, n: number): { ok: true; purse: Purse; have: number } | No {
  if (!work?.open) return no("closed");
  const need = work.needs[thing];
  if (!need || !Number.isInteger(n) || n <= 0) return no("none");
  if (held(purse.bag, thing as ItemId) < n) return no("short");
  if (need.need !== null && need.have + n > need.need) return no("over");
  return { ok: true, purse: { ...purse, bag: take(purse.bag, thing as ItemId, n) }, have: need.have + n };
}

export { carryPace };

/* ── what is kept, and what a page is told ───────────────────────────────── */

/** Everything of the works that is kept: each work with when it was opened and marked whole, what it needs, who gave how many of what and when they first came; and what each member carries in their hands. */
export interface WorksKept {
  works: Record<string, { opened: number | null; done: number | null; needs: Record<string, Need>; hands: Record<string, Record<string, { n: number; first: number }>> }>;
  carried: Record<string, Carried>;
}
/** The works as they begin: the bridge, closed, needing its stones. */
export const newWorks = (): WorksKept => ({ works: { [BRIDGE.work]: { opened: null, done: null, needs: { [BRIDGE.thing]: { need: BRIDGE.need, have: 0 } }, hands: {} } }, carried: {} });
/** A kept work as its rules read it. */
export const workOf = (kept: WorksKept, id: string): Work | null => {
  const w = kept.works[id];
  return w ? { open: w.opened !== null, needs: w.needs } : null;
};
/** The works with so many of a thing counted to each of some members, at a moment: the work has that many more for each lot given, and is marked whole when it has all it needs of everything. */
export function counted(kept: WorksKept, id: string, thing: string, who: readonly string[], each: number, add: number, now: number): WorksKept {
  const w = kept.works[id];
  if (!w) return kept;
  const hands = { ...w.hands };
  for (const m of who) hands[m] = { ...hands[m], [thing]: { n: (hands[m]?.[thing]?.n ?? 0) + each, first: hands[m]?.[thing]?.first ?? now } };
  const needs = { ...w.needs, [thing]: { ...w.needs[thing], have: (w.needs[thing]?.have ?? 0) + add } };
  const whole = Object.values(needs).every((n) => n.need !== null && n.have >= n.need);
  return { ...kept, works: { ...kept.works, [id]: { ...w, needs, hands, done: w.done ?? (whole ? now : null) } } };
}

/**
 * A work as a member is told it: whether it is open; when it was marked whole; what it needs and has; everybody who
 * has given to it, **in the order they first came, with no numbers and no ranking**; and my own counts, told to me
 * alone. Of a work that is not open nothing is told but that it is not.
 */
export interface WorkTold { open: boolean; done: number | null; needs: Record<string, Need>; helpers: Array<{ id: string; name: string }>; mine: Record<string, number> }
/** The works as a member is told them, with what they carry in their hands (the work and the thing, not whose hands it came by). */
export interface WorksTold { works: Record<string, WorkTold>; carried: { work: string; thing: string } | null }
const SHUT: WorkTold = { open: false, done: null, needs: {}, helpers: [], mine: {} };

/** What a member is told of the works. `name` says what somebody is called. */
export function told(kept: WorksKept, me: string, name: (id: string) => string): WorksTold {
  const works: Record<string, WorkTold> = {};
  for (const [id, w] of Object.entries(kept.works)) {
    if (w.opened === null) { works[id] = SHUT; continue; }
    const first = (m: string) => Math.min(...Object.values(w.hands[m]).map((h) => h.first));
    const helpers = Object.keys(w.hands).sort((a, b) => first(a) - first(b) || (a < b ? -1 : a > b ? 1 : 0)).map((m) => ({ id: m, name: name(m) }));
    works[id] = { open: true, done: w.done, needs: w.needs, helpers, mine: Object.fromEntries(Object.entries(w.hands[me] ?? {}).map(([thing, h]) => [thing, h.n])) };
  }
  const c = kept.carried[me], open = c ? kept.works[c.work]?.opened != null : false;
  return { works, carried: c && open ? { work: c.work, thing: c.thing } : null };
}
/** The works as a keeper was told them, made sound: null for what is no telling of them (a database that has not had its file answers nothing). */
export function worksOf(v: unknown): WorksTold | null {
  const t = v as Partial<WorksTold> | null;
  if (!t || typeof t !== "object" || !t.works || typeof t.works !== "object" || Array.isArray(t.works)) return null;
  const works: Record<string, WorkTold> = {};
  for (const [id, raw] of Object.entries(t.works as Record<string, Partial<WorkTold> | null>)) {
    if (!raw || typeof raw !== "object" || raw.open !== true) { works[id] = SHUT; continue; }
    const needs: Record<string, Need> = {};
    for (const [thing, n] of Object.entries((raw.needs && typeof raw.needs === "object" ? raw.needs : {}) as Record<string, Partial<Need> | null>)) {
      const have = Number(n?.have), need = n?.need === null || n?.need === undefined ? null : Number(n.need);
      needs[thing] = { need: need !== null && Number.isFinite(need) ? need : null, have: Number.isFinite(have) && have > 0 ? Math.floor(have) : 0 };
    }
    const helpers = (Array.isArray(raw.helpers) ? raw.helpers : []).flatMap((h) => (h && typeof h.id === "string" ? [{ id: h.id, name: typeof h.name === "string" ? h.name : "" }] : []));
    const mine = Object.fromEntries(Object.entries((raw.mine && typeof raw.mine === "object" ? raw.mine : {}) as Record<string, unknown>).flatMap(([thing, n]) => (Number.isFinite(Number(n)) ? [[thing, Number(n)]] : [])));
    works[id] = { open: true, done: typeof raw.done === "number" ? raw.done : null, needs, helpers, mine };
  }
  const c = t.carried;
  return { works, carried: c && typeof c === "object" && typeof c.work === "string" && typeof c.thing === "string" ? { work: c.work, thing: c.thing } : null };
}

/** What a page is told of the bridge's stones: nothing, while the bridge is not open or the works are not known. */
const stones = (works: WorksTold | null): Need | null => {
  const w = works?.works[BRIDGE.work];
  return w?.open ? w.needs[BRIDGE.thing] ?? null : null;
};
/** **How many spans of the bridge are laid, none to six**, from what the keeper reads of the works (`keeper.works()`): what the map draws of the bridge. */
export function bridgeSpans(works: WorksTold | null): number {
  const n = stones(works);
  return n ? spansOf(n.have, n.need) : 0;
}
/** **Whether the bridge is whole**, from what the keeper reads of the works (`keeper.works()`): it can be walked across. */
export function bridgeWhole(works: WorksTold | null): boolean {
  const n = stones(works);
  return !!n && n.need !== null && n.need > 0 && n.have >= n.need;
}
/** Whether I hold a stone, from what the keeper reads of the works. */
export const carrying = (works: WorksTold | null): string | null => works?.carried?.thing ?? null;

/* ── tired hands: the handing game's board, for a stone ──────────────────── */

/**
 * **With no stamina on either side a stone is handed on by the handing game's easy board** (lib/town/handing: whoever
 * takes it presses ready, whoever has it throws, and whoever takes it presses the side it flies to), as water is;
 * with stamina on both it is in the other's hands at once. Caught, it is handed on; not, nothing is and nothing is
 * lost. Where the other is not there to play (another page of the site, a page that does not answer) it goes over
 * at once all the same: with no stamina a thing is harder, never refused.
 */
export const byBoard = (mineSpent: boolean, theirsSpent: boolean | null | undefined): boolean => mineSpent || theirsSpent === true;

/**
 * What the two pages tell each other of it: that game's own words (lib/town/handing's `Told`), **in an envelope of
 * the stone's**, so that the bucket line's board, which hears the same letterboxes, takes none of them for water. In
 * a `no`, `bare` is a thing in the hand and `full` a stone in the hands already.
 */
export interface StoneTold { k: "st"; t: Told }
export const stoneTold = (t: Told): StoneTold => ({ k: "st", t });
/** What another browser said of a stone handed on, if it is that and every part of it is what it should be; null otherwise. */
export function readStoneTold(raw: unknown): Told | null {
  const d = raw as { k?: unknown; t?: unknown } | null;
  return d && typeof d === "object" && d.k === "st" ? readTold(d.t) : null;
}

/* ── whom a page offers ──────────────────────────────────────────────────── */

/** Somebody on the map, as a page has them: where, whether they are walking, what they hold in the hand, what they carry in their hands, and what the room says of them besides. */
export interface Hand { id: string; name: string; x: number; y: number; moving: boolean; hold: string | null; carry?: string | null; away?: boolean; spent?: boolean }
/** What somebody close by lacks to be handed a stone: they hold one already, they have a thing in the hand, or they are walking. */
export type Lack = "held" | "hand" | "walking";

/** How far a point is from the bridge's foot, as the path goes. */
export const toFoot = (p: Vec) => between(p, { x: BRIDGE.foot.x + 0.5, y: BRIDGE.foot.y + 0.5 });

/**
 * Whom the stone in my hands can be handed on to from where I stand, and, when there is nobody, who stands close by
 * and what they lack (as the bucket line offers: lib/town/line's `takers`).
 *
 * - **Offered**: everybody within reach who stands still with empty hands. Those nearer the foot than I am come
 *   first, the nearest to it first: that is the way a row goes. Then the others, the nearest to me first.
 *   `OFFER.most` at the most.
 * - **Lacking**, only when nobody is offered: the nearest within `OFFER.beside`, with what they lack: a stone in their
 *   hands already, a thing in the hand, or that they are walking.
 */
export function takers(me: string, at: Vec, people: readonly Hand[]): { offered: Hand[]; lacks: { who: Hand; why: Lack } | null } {
  const mine = toFoot(at), forward: Array<[Hand, number]> = [], others: Array<[Hand, number]> = [];
  let lacking: [Hand, number, Lack] | null = null;
  for (const p of people) {
    if (p.id === me) continue;
    const far = between(at, p);
    if (far > BRIDGE.reach) continue;
    const why: Lack | null = p.carry ? "held" : p.hold ? "hand" : p.moving ? "walking" : null;
    if (!why) { const f = toFoot(p); if (f < mine) forward.push([p, f]); else others.push([p, far]); }
    else if (far <= OFFER.beside && (!lacking || far < lacking[1] || (far === lacking[1] && p.id < lacking[0].id))) lacking = [p, far, why];
  }
  const nearest = (a: [Hand, number], b: [Hand, number]) => a[1] - b[1] || (a[0].id < b[0].id ? -1 : 1);
  const offered = [...forward.sort(nearest), ...others.sort(nearest)].slice(0, OFFER.most).map(([p]) => p);
  return { offered, lacks: offered.length || !lacking ? null : { who: lacking[0], why: lacking[2] } };
}
