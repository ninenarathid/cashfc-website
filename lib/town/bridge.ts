import { CARRY, carryPace } from "./carry";
import { roll } from "./farm";
import { between } from "./line";
import { spend } from "./stamina";
import { handOf, held, take, type Purse } from "./trade";
import type { ItemId } from "./items";
import { findPath, type Vec } from "./world";

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
 * - It is **handed on** to somebody who stands still with empty hands within ten tiles as the path goes: at once, for
 *   nothing. So a row of people brings a stone across the town faster than anybody walks it. (Six tiles at first; ten
 *   since the evening of 2026-10-08: the road is some thirty tiles, and the rows that really form are four and five.)
 * - **Laid at the foot** for one stamina: the work has one more.
 * - **Everybody whose hands a stone went through has built with it**: when it is laid, each of them (the last eight)
 *   is counted a stone in the work, and a point on the helpers' line (lib/town/line-points).
 * - A stone can be let go of anywhere: it is gone, and nothing comes back.
 * - With no stamina nothing is refused: the walk is slower, and a stone is handed on by holding the button a little
 *   over a second (`holdFor`). **There is no board at any stamina, nothing to be quick at and nothing that can
 *   fail** (the owner, 2026-10-08 evening: the pieces were played by made-up hands and scored, and he took what it
 *   would take to score ninety: "ขอให้ทำทุกอันเป็นแบบดันสุดเลย … เอาตามที่ codex ว่ามาได้เลย").
 * - No coins come of it and nothing that can be sold: two stamina a stone is what it costs.
 * - **About one stone in twenty-five has something in it** (`MARKS`: a shell, an old coin, a carved sign, a river
 *   pearl, a star, a leaf's print): drawn as it is lifted, kept with the stone, told to nobody while it is carried,
 *   and seen when it is laid. It is set in the bridge for good with the names of the hands it came by. Never a
 *   thing, never sold, no points.
 * - **Each span keeps whose hands built it**: the sign says so, and the whole town is told when a span is laid.
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
  reach: 10,
  /** How near the pile, and the foot, one stands to lift and to lay, in tiles. */
  near: 2,
  /** How fast whoever holds a stone walks, as a share of anybody's pace: with stamina left, and with none (lib/town/carry, which the session reads). */
  paces: { held: CARRY.held, spent: CARRY.spent },
  /** How many of those whose hands a stone went through are remembered (the last so many). */
  hands: 8,
  /** The points on the helpers' line a stone laid is worth to each of them. */
  point: 1,
  /** How long the button is held for a stone to be handed on where either of the two has no stamina left, in seconds (the page's). */
  hold: 1.2,
  /** How far apart the marks on the road stand where a row would, in tiles as the road goes: a little under the reach (the page's). */
  stand: 9,
  /** In how many steps the course of stones at the foot grows through a span (the page's). */
  steps: 10,
  /** One stone in so many has something in it; and what it may be, each as likely as another. */
  marks: { one: 25, kinds: ["shell", "coin", "rune", "pearl", "star", "leaf"] },
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
/**
 * Where the banner stands while the bridge is being built, so that the foot is seen from far up the road; and where
 * the course of stones grows through the span in hand (`course`): the two tiles beside the foot on the river's side
 * of the sign, by the bridge's first tile. The page's alone and only drawn, as the sign is, and held to the same
 * tiles: never the foot's own, the bridge's, a fishing float's, or the sign's.
 */
export const BANNER_AT: Vec = { x: BRIDGE.foot.x - 1, y: BRIDGE.foot.y - 1 };
export const COURSE_AT: Vec = { x: BRIDGE.foot.x - 1, y: BRIDGE.foot.y };

/** What a work needs of a thing (null: it takes any amount), and how many it has. */
export interface Need { need: number | null; have: number }
/** A work as its rules read it: whether its owner has opened it, and what it needs. */
export interface Work { open: boolean; needs: Record<string, Need> }
/**
 * What somebody carries in their hands towards a work: which work, which thing, whose hands it has been through (the
 * holder last), and what the stone has in it (`mark`: nothing, for most). **The mark is the keeper's alone until the
 * stone is laid**: no page is told it, the holder's neither.
 */
export interface Carried { work: string; thing: string; hands: string[]; mark?: string | null }

/** What a stone may have in it: a shell in the stone, an old coin of the village, a carved sign, a river pearl, a star-shaped stone, a leaf's print. */
export type Mark = "shell" | "coin" | "rune" | "pearl" | "star" | "leaf";
export const MARKS = BRIDGE.marks.kinds as readonly Mark[];
/**
 * The number a stone is tried by as it is lifted: from its lifter and the very moment, which is the clock of whoever
 * keeps the game, to the millisecond (as an insect let go on a plant is tried: lib/town/farm's `ridLuck`). Nobody
 * chooses it, and the database's rule (`town.stone_lift`) answers every case as this does.
 */
export const markLuck = (me: string, now: number): number => roll(`stone|${me}`, now);
/** A number by which a stone has that in it, or nothing (for scripts and the test room: a stone that is to be found marked, or plain). */
export const luckFor = (kind: string | null): number => {
  const { one, kinds } = BRIDGE.marks, at = kind ? kinds.indexOf(kind) : -1;
  return at < 0 ? 0.5 : (at + 0.5) / (one * kinds.length);
};
/** What a stone has in it by that number: one in so many has something, each kind as likely as another; the rest nothing. */
export function markOf(luck: number): Mark | null {
  const { one, kinds } = BRIDGE.marks;
  if (!(luck >= 0) || luck * one >= 1) return null;
  return (kinds[Math.min(kinds.length - 1, Math.floor(luck * one * kinds.length))] as Mark | undefined) ?? null;
}

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
 * (none left: lifted all the same). The stone begins with its lifter's hands on it and nobody else's, and with what
 * it has in it, drawn at this moment (`luck`: the number it is tried by, which only a script says otherwise).
 */
export function lift(purse: Purse, carried: Carried | null, work: Work | null, at: readonly [number, number] | null, me: string, now: number, luck = markLuck(me, now)):
  { ok: true; purse: Purse; carried: Carried } | No {
  if (!work?.open || !work.needs[BRIDGE.thing]) return no("closed");
  if (!wants(work, BRIDGE.thing)) return no("whole");
  if (carried) return no("held");
  if (handOf(purse)) return no("hand");
  if (!nearTile(at, BRIDGE.pile)) return no("far");
  return { ok: true, purse: spend(purse, BRIDGE.costs.lift, now), carried: { work: BRIDGE.work, thing: BRIDGE.thing, hands: [me], mark: markOf(luck) } };
}

/**
 * Hand the stone I hold on to somebody: they have nothing in the hand and no stone. It costs nothing. The stone goes
 * with the hands it came by, the taker's last (once: somebody it comes back to is its last hand, not two of them),
 * the last so many remembered, and with what it has in it. Gives what the taker now carries.
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

/** Which span the stone that makes so many of so many went into, from one (the span that was in hand before it): none (0) for a work that takes any amount. */
export const spanOf = (have: number, need: number | null): number =>
  (need === null || need <= 0 || have <= 0 ? 0 : Math.min(BRIDGE.spans, spansOf(have - 1, need) + 1));

/**
 * Lay the stone I hold at the foot: from a tile by it, for one stamina (none left: laid all the same). The work has
 * one more; says how many it has now, whose hands the stone came by (each is counted it), how many spans that makes,
 * whether this stone finished one, whether the work is whole, which span the stone went into (`into`), and what was
 * found in it, now that it is laid (`find`: nothing, for most).
 */
export function lay(purse: Purse, carried: Carried | null, work: Work | null, at: readonly [number, number] | null, now: number):
  { ok: true; purse: Purse; have: number; hands: string[]; spans: number; span: boolean; whole: boolean; into: number; find: string | null } | No {
  if (!work?.open) return no("closed");
  if (!carried) return no("none");
  const n = work.needs[carried.thing];
  if (!n) return no("none");
  if (n.need !== null && n.have >= n.need) return no("whole");
  if (!nearTile(at, BRIDGE.foot)) return no("far");
  const have = n.have + 1, spans = spansOf(have, n.need);
  return { ok: true, purse: spend(purse, BRIDGE.costs.lay, now), have, hands: carried.hands, spans, span: spans > spansOf(n.have, n.need), whole: n.need !== null && have >= n.need, into: spanOf(have, n.need), find: carried.mark ?? null };
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

/** Something found in a stone and set in a work for good: what, when it was laid, in which span, and whose hands the stone came by (in the order it went through them). */
export interface FindKept { kind: string; at: number; span: number; hands: string[] }
/**
 * Everything of the works that is kept: each work with when it was opened and marked whole, what it needs, who gave
 * how many of what and when they first came, whose hands built each span and when each first came to it (`built`:
 * by the span's number, from one), and what was found in its stones (`finds`, in the order they were laid); and
 * what each member carries in their hands.
 */
export interface WorksKept {
  works: Record<string, {
    opened: number | null; done: number | null; needs: Record<string, Need>; hands: Record<string, Record<string, { n: number; first: number }>>;
    built?: Record<string, Record<string, number>>; finds?: FindKept[];
  }>;
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
 * The works with a stone laid, at a moment: everybody whose hands it came by is counted it (`counted`), each is one
 * of the hands of the span it went into (from the moment they first came to that span), and what was in the stone,
 * if anything, is set in the work for good with their names.
 */
export function laid(kept: WorksKept, id: string, thing: string, who: readonly string[], into: number, mark: string | null | undefined, now: number): WorksKept {
  const next = counted(kept, id, thing, who, 1, 1, now), w = next.works[id];
  if (!w) return next;
  const built = { ...(w.built ?? {}) };
  if (into > 0) { const span = { ...(built[into] ?? {}) }; for (const m of who) span[m] ??= now; built[into] = span; }
  const finds = mark ? [...(w.finds ?? []), { kind: mark, at: now, span: into, hands: [...who] }] : w.finds ?? [];
  return { ...next, works: { ...next.works, [id]: { ...w, built, finds } } };
}

/** Somebody named: who, and what they are called. */
export interface Named { id: string; name: string }
/** Something found in a stone as a page is told it: what, when it was laid, in which span it is set, and the hands the stone came by, in the order it went through them. */
export interface FindTold { kind: string; at: number; span: number; hands: Named[] }
/**
 * A work as a member is told it: whether it is open; when it was marked whole; what it needs and has; everybody who
 * has given to it, **in the order they first came, with no numbers and no ranking**; my own counts, told to me
 * alone; whose hands built each span, by the span's number and in the order they first came to it, with no numbers
 * either (`built`); and what was found in its stones, in the order they were laid (`finds`). Of a work that is not
 * open nothing is told but that it is not.
 */
export interface WorkTold { open: boolean; done: number | null; needs: Record<string, Need>; helpers: Named[]; mine: Record<string, number>; built: Record<string, Named[]>; finds: FindTold[] }
/** The works as a member is told them, with what they carry in their hands (the work and the thing, not whose hands it came by). */
export interface WorksTold { works: Record<string, WorkTold>; carried: { work: string; thing: string } | null }
const SHUT: WorkTold = { open: false, done: null, needs: {}, helpers: [], mine: {}, built: {}, finds: [] };

/** What a member is told of the works. `name` says what somebody is called. */
export function told(kept: WorksKept, me: string, name: (id: string) => string): WorksTold {
  const works: Record<string, WorkTold> = {};
  for (const [id, w] of Object.entries(kept.works)) {
    if (w.opened === null) { works[id] = SHUT; continue; }
    const first = (m: string) => Math.min(...Object.values(w.hands[m]).map((h) => h.first));
    const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0), named = (m: string): Named => ({ id: m, name: name(m) });
    const helpers = Object.keys(w.hands).sort((a, b) => first(a) - first(b) || byId(a, b)).map(named);
    const built = Object.fromEntries(Object.entries(w.built ?? {}).map(([span, by]) => [span, Object.keys(by).sort((a, b) => by[a] - by[b] || byId(a, b)).map(named)]));
    const finds = (w.finds ?? []).map((f) => ({ kind: f.kind, at: f.at, span: f.span, hands: f.hands.map(named) }));
    works[id] = { open: true, done: w.done, needs: w.needs, helpers, mine: Object.fromEntries(Object.entries(w.hands[me] ?? {}).map(([thing, h]) => [thing, h.n])), built, finds };
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
    const names = (list: unknown): Named[] => (Array.isArray(list) ? list : []).flatMap((h: Partial<Named> | null) => (h && typeof h.id === "string" ? [{ id: h.id, name: typeof h.name === "string" ? h.name : "" }] : []));
    const helpers = names(raw.helpers);
    // (a keeper from before the spans' hands and the finds were told says nothing of them: none)
    const built = Object.fromEntries(Object.entries((raw.built && typeof raw.built === "object" && !Array.isArray(raw.built) ? raw.built : {}) as Record<string, unknown>).flatMap(([span, by]) => (/^[1-9]\d?$/.test(span) ? [[span, names(by)]] : [])));
    const finds = (Array.isArray(raw.finds) ? raw.finds : []).flatMap((f: Partial<FindTold> | null) => (f && typeof f.kind === "string" && /^[a-z]{1,24}$/.test(f.kind)
      ? [{ kind: f.kind, at: Number.isFinite(Number(f.at)) ? Number(f.at) : 0, span: Number.isInteger(Number(f.span)) && Number(f.span) > 0 ? Number(f.span) : 0, hands: names(f.hands) }] : []));
    const mine = Object.fromEntries(Object.entries((raw.mine && typeof raw.mine === "object" ? raw.mine : {}) as Record<string, unknown>).flatMap(([thing, n]) => (Number.isFinite(Number(n)) ? [[thing, Number(n)]] : [])));
    works[id] = { open: true, done: typeof raw.done === "number" ? raw.done : null, needs, helpers, mine, built, finds };
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

/* ── tired hands: a button held, never a board ───────────────────────────── */

/**
 * **How long the button is held for a stone to be handed on, in seconds**: none with stamina on both sides (a press,
 * and it is in the other's hands); a little over a second where either of the two has none left. The button fills as
 * it is held; let go of early, nothing is done and nothing is lost; held to the end, the stone is handed on, always.
 * **No board at any stamina, nothing to be quick at, nothing that can fail** (the owner, 2026-10-08 evening; the
 * handing game's board stood here for a day, and made-up new hands caught nineteen stones in a hundred on it).
 * (`theirs` is what the room says of the other: a page built before it said so says nothing, and they are taken to
 * have some.)
 */
export const holdFor = (mineSpent: boolean, theirsSpent: boolean | null | undefined): number => (mineSpent || theirsSpent === true ? BRIDGE.hold : 0);

/* ── what is seen of the building ────────────────────────────────────────── */

/**
 * How far the span a stone went into has come with it, in stones of that span and of how many: what whoever had a
 * hand in a stone is told as it is laid ("+1 · 73/100 of this span"). The hundredth of a span is a hundred of a
 * hundred. Nothing, of a work that takes any amount.
 */
export function inSpan(have: number, need: number | null): { n: number; of: number } | null {
  const into = spanOf(have, need);
  if (!into || need === null) return null;
  const from = Math.ceil(((into - 1) * need) / BRIDGE.spans), to = Math.ceil((into * need) / BRIDGE.spans);
  return { n: have - from, of: to - from };
}
/** At which shares of a span something more is put up at the foot: a scaffold, a rope, an arch. */
export const MORE = [0.25, 0.5, 0.75] as const;
/**
 * **What stands at the foot of the span in hand**: how many steps of its course of stones are laid (none to
 * `BRIDGE.steps`), and how many of the three things more are up (a scaffold from a quarter, a rope from a half, an
 * arch from three quarters). A span that is finished is the bridge's own (the map's: `bridgeSpans`), and the course
 * begins again from nothing; a bridge that is whole has none.
 */
export function course(have: number, need: number | null): { step: number; more: number } {
  if (need === null || need <= 0 || have >= need) return { step: 0, more: 0 };
  const done = spansOf(have, need), from = Math.ceil((done * need) / BRIDGE.spans), to = Math.ceil(((done + 1) * need) / BRIDGE.spans);
  const share = to > from ? Math.max(0, Math.min(1, (have - from) / (to - from))) : 0;
  return { step: Math.floor(share * BRIDGE.steps + 1e-9), more: MORE.filter((m) => share >= m).length };
}

let stood: Vec[] | null = null;
/**
 * **Where a row would stand**: the tiles of the marks on the road from the pile to the foot, the first where a
 * stone is lifted (by the pile) and the last where one is laid (by the foot), the others between them about
 * `BRIDGE.stand` tiles apart as the road goes, so that each is within reach of the next. They are only drawn: no
 * tile's walking changes for them, and nobody has to stand on one. (The road is the way anybody walks it:
 * lib/town/world's `findPath`.)
 */
export function stands(): Vec[] {
  if (stood) return stood;
  const from = { x: BRIDGE.pile.x + 0.5, y: BRIDGE.pile.y + 0.5 }, road = findPath(from, { x: BRIDGE.foot.x + 0.5, y: BRIDGE.foot.y + 0.5 }) ?? [];
  // how far along the road each of its tiles is
  const along: number[] = [];
  let far = 0, was = from;
  for (const p of road) { far += Math.hypot(p.x - was.x, p.y - was.y); along.push(far); was = p; }
  const tile = (i: number): [number, number] => [Math.floor(road[i].x), Math.floor(road[i].y)];
  // the last tile of the road still by the pile, and the first by the foot
  let first = -1, last = -1;
  for (let i = 0; i < road.length; i++) { if (nearTile(tile(i), BRIDGE.pile)) first = i; if (last < 0 && nearTile(tile(i), BRIDGE.foot)) last = i; }
  if (first < 0 || last <= first) return (stood = []);
  const gaps = Math.max(1, Math.round((along[last] - along[first]) / BRIDGE.stand)), out: Vec[] = [];
  for (let k = 0; k <= gaps; k++) {
    const want = along[first] + ((along[last] - along[first]) * k) / gaps;
    let best = first;
    for (let i = first; i <= last; i++) if (Math.abs(along[i] - want) < Math.abs(along[best] - want)) best = i;
    const [x, y] = tile(best);
    if (!out.some((t) => t.x === x && t.y === y)) out.push({ x, y });
  }
  return (stood = out);
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
