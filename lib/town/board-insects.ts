import { inHours } from "./band-species";
import { roll } from "./farm";
import { FOREST, FOREST_PROPS, zoneAt, type Place } from "./world";
import { T2_THINGS } from "./town2";
import { ROWS, WEIGHT, type BoardInsectId, type Tree } from "./board-insect-rows";
import { GIANT, callWords } from "./giant-fish";
export * from "./board-insect-rows";

/**
 * **Insects found two new ways** (the owner, 2026-10-27, to the plan both AIs made: "แมลงที่มี mechanic ใหม่ๆ ในการหา",
 * and "OK แล้ว" to the species lists).
 *
 * - **Unrolling a leaf** (alone): a leaf rolled into a tube on a bush, sewn shut with silk. Cut the seams by dragging
 *   along them (a drag across the leaf startles what is inside), and cup what was in it.
 * - **Shaking a branch over a sheet** (two): one bends a branch and lets it go at its full bend; the other holds a white
 *   sheet under it and slides it to catch the insects, not the twigs and leaves. Each of the two has one insect.
 *
 * Their twenty-one insects are found only so: never at a haunt (their `at` is none), never drawn to a good garden. Each
 * takes a family of the time bands' newcomers, so each has a use now: a pollinator let go on a plant pollinates and
 * crosses by its sky, a hunter takes pests off, a soil worker lives in the insect house's soil room.
 *
 * Every spot has turns of `BOARD.turn`; in a turn a spot holds an insect at `BOARD.occupied`, which, and the shake's two,
 * by `roll` (lib/town/farm: the database's own), the place, the tree and the Bangkok hour. Whoever unrolls a leaf or
 * shakes a tree first in its turn has what it held: the spot is empty till the next turn. The database's twin is v311.
 */
export const BOARD = {
  turn: 30 * 60_000,
  occupied: 0.25,
  /** How near a spot one must stand (tiles). */
  reach: 2,
  /** The silk seams across a roll; and a drag across the leaf startles what is inside for so long. */
  seams: 4,
  startle: 1_500,
  /** At the least so long from opening a roll to cupping what was in it (the database's bound on a quick hand). */
  unrollMin: 4_000,
  /** A shake's call stands so long for somebody to hold the sheet; the shake itself is over in so long. */
  call: 180_000,
  shake: 30_000,
  /** At the least so long from the start to the end of a shake. */
  shakeMin: 5_000,
  /** How many insects a shaken branch drops (each of the two has one, the holder catching them). */
  drops: 2,
} as const;

/* ── the spots ────────────────────────────────────────────────────────────── */

export interface BoardSpot { id: number; board: "roll" | "shake"; x: number; y: number; place: Place; tree?: Tree }
/** The things of the town's map the spots are on, by the tile under their middle (their names in town2-map.json). */
const TOWN_ROLLS: Array<[RegExp, number, number]> = [
  [/^azalea/, 62, 7], [/^game_bush$/, 27, 16], [/^hydrangea/, 44, 30], [/^hydrangea/, 60, 7],
  [/^purple_hydrangea/, 56, 72], [/^purple_hydrangea/, 42, 64], [/^game_bush$/, 6, 13], [/^game_bush$/, 46, 17],
  // (and a cherry's low leaves, as the species lists said: "the town's azalea, hydrangea and cherry")
  [/^deep_pink_double_cherry/, 25, 43],
];
const TOWN_TREES: Array<[RegExp, number, number, Tree]> = [
  [/^large_old_cherry/, 19, 31, "cherry"], [/^large_old_cherry/, 48, 57, "cherry"],
  [/^japanese_cedar/, 23, 5, "cedar"], [/^japanese_cedar/, 4, 77, "cedar"],
];
const onMap = (re: RegExp, x: number, y: number) => T2_THINGS.some((t) => re.test(t.name) && Math.floor(t.c.x) === x && Math.floor(t.c.y) === y);
/** The forest's: the edge's bushes (three, all it has) and the woods' two oaks nearest its gate (the forest's props are laid out the same everywhere). */
function forestSpots(): Array<{ x: number; y: number; kind: "bush" | "oak" }> {
  const gate = { x: FOREST.x + FOREST.w / 2, y: FOREST.y + FOREST.h };
  const near = (p: { x: number; y: number }) => Math.hypot(p.x - gate.x, p.y - gate.y);
  const bushes = FOREST_PROPS.filter((p) => p.kind === "bush" && zoneAt(p.x, p.y) === "edge").sort((a, b) => near(a) - near(b) || a.x - b.x || a.y - b.y).slice(0, 3);
  const oaks = FOREST_PROPS.filter((p) => p.kind === "oak" && zoneAt(p.x, p.y) === "woods").sort((a, b) => near(a) - near(b) || a.x - b.x || a.y - b.y).slice(0, 2);
  return [...bushes.map((p) => ({ x: p.x, y: p.y, kind: "bush" as const })), ...oaks.map((p) => ({ x: p.x, y: p.y, kind: "oak" as const }))];
}
/** The eighteen: twelve rolled leaves (nine in the town, three at the forest's edge) and six trees (two cherries, two cedars, two oaks of the woods). */
export const BOARD_SPOTS: BoardSpot[] = (() => {
  const out: BoardSpot[] = [];
  for (const [re, x, y] of TOWN_ROLLS) if (onMap(re, x, y)) out.push({ id: out.length, board: "roll", x, y, place: "town" });
  const forest = forestSpots();
  for (const p of forest.filter((f) => f.kind === "bush")) out.push({ id: out.length, board: "roll", x: p.x, y: p.y, place: "forest" });
  for (const [re, x, y, tree] of TOWN_TREES) if (onMap(re, x, y)) out.push({ id: out.length, board: "shake", x, y, place: "town", tree });
  for (const p of forest.filter((f) => f.kind === "oak")) out.push({ id: out.length, board: "shake", x: p.x, y: p.y, place: "forest", tree: "oak" });
  return out;
})();

export const turnOf = (now: number) => Math.floor(now / BOARD.turn);
/** The Bangkok hour of a moment, fractions too. */
export const bangkokHourOf = (now: number) => ((((now + 7 * 3_600_000) % 86_400_000) + 86_400_000) % 86_400_000) / 3_600_000;
/** Who may be at a spot at an hour, each with its weight. */
export function outAt(spot: BoardSpot, hour: number): Array<{ id: BoardInsectId; w: number }> {
  return ROWS.filter((r) => r.board === spot.board && (!r.place || r.place === spot.place) && (!r.trees || (spot.tree && r.trees.includes(spot.tree))) && inHours(r.hours, hour))
    .map((r) => ({ id: r.id as BoardInsectId, w: r.rare ? WEIGHT.rare : WEIGHT.common }));
}
function pick(out: Array<{ id: BoardInsectId; w: number }>, r: number): BoardInsectId {
  let at = r * out.reduce((s, o) => s + o.w, 0);
  for (const o of out) { if (at < o.w) return o.id; at -= o.w; }
  return out[out.length - 1].id;
}
/** What a spot holds in a turn (its first moment's hour decides who may be out): none, or one insect (a roll) or `BOARD.drops` (a branch). */
export function heldAt(spot: BoardSpot, turn: number): BoardInsectId[] {
  if (roll("boardon", spot.id, turn) >= BOARD.occupied) return [];
  const out = outAt(spot, bangkokHourOf(turn * BOARD.turn));
  if (!out.length) return [];
  return Array.from({ length: spot.board === "roll" ? 1 : BOARD.drops }, (_, k) => pick(out, roll("boardwho", spot.id, turn, k)));
}
/** Whether a tile is within reach of a spot. */
export const nearSpot = (spot: BoardSpot, at: [number, number] | null) => !!at && Math.max(Math.abs(at[0] - spot.x), Math.abs(at[1] - spot.y)) <= BOARD.reach;

/* ── the deeds ────────────────────────────────────────────────────────────── */

/** A spot's turn as it is kept: who opened its roll when (each their own), and who took what it held; a shake's session. */
export interface SpotTurn { spot: number; turn: number; opened: Record<string, number>; taken: string | null }
export interface Shake {
  id: string; spot: number; turn: number; by: string; byName: string; at: number;
  holder: string | null; holderName: string | null; go: number;
  /** Over: how many insects the sheet caught (0 to BOARD.drops), when, who has had theirs. */
  end: number; caught: number; claimed: string[];
  /** The shaker's calls to the town, when each was sent. */
  calls: number[];
}
export type BoardRefusal = "none" | "taken" | "far" | "soon" | "late" | "theirs" | "self" | "busy" | "full" | "many" | "long" | "empty";
export type BoardDid<T> = ({ ok: true } & T) | { ok: false; why: BoardRefusal };

/** A roll opened: its seams to cut from now (the take is not before `BOARD.unrollMin`). */
export function openRoll(spot: BoardSpot | undefined, t: SpotTurn | null, me: string, at: [number, number] | null, now: number): BoardDid<{ turn: SpotTurn; held: BoardInsectId }> {
  if (!spot || spot.board !== "roll") return { ok: false, why: "none" };
  const turn = turnOf(now), held = heldAt(spot, turn)[0];
  if (!held) return { ok: false, why: "none" };
  const kept: SpotTurn = t && t.turn === turn ? t : { spot: spot.id, turn, opened: {}, taken: null };
  if (kept.taken) return { ok: false, why: "taken" };
  if (!nearSpot(spot, at)) return { ok: false, why: "far" };
  return { ok: true, turn: { ...kept, opened: { ...kept.opened, [me]: kept.opened[me] ?? now } }, held };
}
/** What was in the roll, cupped: mine if nobody had it first this turn, not sooner than `BOARD.unrollMin` after I opened it. */
export function takeRoll(spot: BoardSpot | undefined, t: SpotTurn | null, me: string, at: [number, number] | null, now: number, bagFull = false): BoardDid<{ turn: SpotTurn; got: BoardInsectId }> {
  if (!spot || spot.board !== "roll") return { ok: false, why: "none" };
  const turn = turnOf(now), held = heldAt(spot, turn)[0];
  if (!held || !t || t.turn !== turn) return { ok: false, why: "none" };
  if (t.taken) return { ok: false, why: "taken" };
  if (!nearSpot(spot, at)) return { ok: false, why: "far" };
  const opened = t.opened[me];
  if (opened === undefined || now - opened < BOARD.unrollMin) return { ok: false, why: "soon" };
  if (bagFull) return { ok: false, why: "full" };
  return { ok: true, turn: { ...t, taken: me }, got: held };
}

/** A shake called at a tree, by somebody standing near it: one at a tree at a time, none once its turn's insects are had. */
export function callShake(spot: BoardSpot | undefined, live: Shake | null, me: string, myName: string, at: [number, number] | null, now: number, id: string): BoardDid<{ shake: Shake }> {
  if (!spot || spot.board !== "shake") return { ok: false, why: "none" };
  const turn = turnOf(now);
  if (!heldAt(spot, turn).length) return { ok: false, why: "none" };
  if (live && live.turn === turn && (live.caught > 0 || (!live.end && (live.go > 0 || now < live.at + BOARD.call)))) return { ok: false, why: live.caught > 0 ? "taken" : "busy" };
  if (!nearSpot(spot, at)) return { ok: false, why: "far" };
  return { ok: true, shake: { id, spot: spot.id, turn, by: me, byName: myName, at: now, holder: null, holderName: null, go: 0, end: 0, caught: 0, claimed: [], calls: [] } };
}
/** A call to the town for somebody to hold the sheet, as a giant fish's is (lib/town/giant-fish's numbers and words). */
export function callForHolder(s: Shake | null, me: string, text: unknown, now: number): BoardDid<{ shake: Shake; words: string }> {
  if (!s || s.go || s.end || now >= s.at + BOARD.call) return { ok: false, why: "late" };
  if (me !== s.by) return { ok: false, why: "theirs" };
  if (s.calls.length >= GIANT.calls) return { ok: false, why: "many" };
  if (s.calls.length && now - s.calls[s.calls.length - 1] < GIANT.callGap) return { ok: false, why: "soon" };
  const words = callWords(text);
  if (words == null) return { ok: false, why: typeof text === "string" && text.trim() ? "long" : "empty" };
  return { ok: true, shake: { ...s, calls: [...s.calls, now] }, words };
}
/** The sheet held by another standing near the tree, while the call stands: the shake begins. */
export function joinShake(spot: BoardSpot | undefined, s: Shake | null, me: string, myName: string, at: [number, number] | null, now: number): BoardDid<{ shake: Shake }> {
  if (!spot || !s || s.end || s.go || now >= s.at + BOARD.call || turnOf(now) !== s.turn) return { ok: false, why: "late" };
  if (s.by === me) return { ok: false, why: "self" };
  if (!nearSpot(spot, at)) return { ok: false, why: "far" };
  return { ok: true, shake: { ...s, holder: me, holderName: myName, go: now } };
}
/** The shake over, as the holder's page says the sheet caught (`caught`, kept within 0 and `BOARD.drops`). */
export function endShake(s: Shake | null, me: string, caught: number, now: number): BoardDid<{ shake: Shake }> {
  if (!s || !s.go || s.end) return { ok: false, why: "late" };
  if (me !== s.holder) return { ok: false, why: "theirs" };
  if (now - s.go < BOARD.shakeMin) return { ok: false, why: "soon" };
  if (now > s.go + BOARD.shake + 5_000) return { ok: false, why: "late" };
  return { ok: true, shake: { ...s, end: now, caught: Math.max(0, Math.min(BOARD.drops, Math.floor(caught) || 0)) } };
}
/** Each of the two has one insect of what the sheet caught: the shaker the first, the holder the second (the first, if it caught one). */
export function claimShake(spot: BoardSpot | undefined, s: Shake | null, me: string, bagFull = false): BoardDid<{ shake: Shake; got: BoardInsectId }> {
  if (!spot || !s || !s.end || s.caught < 1) return { ok: false, why: "none" };
  if (me !== s.by && me !== s.holder) return { ok: false, why: "theirs" };
  if (s.claimed.includes(me)) return { ok: false, why: "taken" };
  if (bagFull) return { ok: false, why: "full" };
  const held = heldAt(spot, s.turn);
  const got = me === s.by ? held[0] : held[Math.min(s.caught, held.length) - 1];
  return { ok: true, shake: { ...s, claimed: [...s.claimed, me] }, got };
}
