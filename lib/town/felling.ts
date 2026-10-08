/**
 * Felling a tree, as a game of its own (the owner, 2026-10-08: woodcutting, on the mountain's foot; "mini game
 * เข้าใจไม่ยาก ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย").
 *
 * The trunk stands in the middle of the board, a stack of segments. A chop is made from the left or from the right:
 * the lowest segment is cut out and the trunk drops by one. Some segments have a branch on one side, and whoever
 * stands on that side when it comes level is struck by it: a miss. A bar of time runs down from the first chop on;
 * every chop puts a little back. Branches are seen only so many segments up: the rest of the trunk is in the leaves.
 *
 * - **The tree falls whatever the hand does** (the owner, 2026-10-08, evening). The game is played for the fine
 *   timber alone: a trunk cut through in time gives it, by the misses; a bar that runs out, an axe that slips, an axe
 *   put down give none. What a tree gives besides is lib/town/trees' to say.
 * - **One game is one trunk.** Where a game fells more trees than one (lib/town/trees' echo), they all come down with
 *   that trunk, and each has its own fine timber by the game's misses.
 * - **A trunk has a girth**, and its branches come in a family a hand can learn to read: turn about, in pairs, in a
 *   long run with a switch. Which girth has which is lib/town/trees' to say.
 * - With no stamina left the bar runs faster (by how much is the trunk's own), branches are seen a segment later,
 *   and at the third miss the axe slips from the hand: the go is over.
 * - Some branches struck are forgiven (`spared`, so many to a game): they are no miss and cost no time.
 * - A friend may brace the trunk, once a go: from then on the bar runs slower.
 *
 * What an axe changes (how many chops, how far up branches are seen, how fast the bar runs) is lib/town/tools' to
 * read, and lib/town/trees puts a game together from it. Here are only the trunk and the hand's two keys.
 *
 * Pure: a trunk is worked out from a seed, and the game is stepped by whoever plays it.
 */
export const FELLING = {
  /** A trunk of no family (the ancient tree's): how likely a segment has a branch; and how likely a branch is on the other side from the one before it. */
  branch: 0.68, turn: 0.65,
  /**
   * The families a trunk's branches come in, each with its own numbers.
   * - `alternate`: a branch on one side, then one on the other, turn about; `gap`: how likely a bare segment stands between two.
   * - `pairs`: two on a side, then two on the other; `gap`: how likely a bare segment stands between two pairs.
   * - `run`: so many (`from` to `to`) on one side, then as many again on the other; `gap`: how likely a bare segment stands at the switch.
   */
  families: {
    alternate: { gap: 0.85 },
    pairs: { gap: 0.5 },
    run: { from: 3, to: 5, gap: 0.2 },
  },
  /**
   * The bar of time, in seconds at its plain pace: what it holds, what a go begins with, what a chop puts back,
   * and what a branch struck takes away.
   */
  bar: { full: 1.8, from: 1.8, top: 0.36, hit: 0.25 },
  /**
   * With no stamina: branches seen so many segments later, and the axe dropped at so many misses. (How much faster
   * the bar runs for tired hands is each trunk's own: lib/town/trees gives a game its pace all told.)
   */
  tired: { later: 1, misses: 3 },
  /** A friend braces the trunk: from then on the bar runs so much slower, for that go. */
  brace: 0.3,
  /** Branches are always seen at least so many segments up. */
  least: 1,
  /** No hand chops oftener than once in so many seconds: a go that says it did was not played (lib/town/trees holds a go to it). */
  quickest: 0.07,
};

/** A side of the trunk: the left, or the right. And what a segment has: a branch on one of them, or none. */
export type Side = -1 | 1;
export type Branch = -1 | 0 | 1;
/** A trunk's girth: slender, plain, stout. And the family its branches come in (`noise`: none, every segment by itself). */
export type Girth = 1 | 2 | 3;
export type Family = "noise" | "alternate" | "pairs" | "run";
export const isFamily = (v: unknown): v is Family => v === "noise" || v === "alternate" || v === "pairs" || v === "run";

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/**
 * A trunk of so many segments, from the lowest up: what each has. The lowest has none (nothing is level before the
 * first chop). The same seed is always the same trunk; a family is the same shape from every seed, begun on either
 * side and at any place in its turn.
 */
export function branchesOf(seed: number, chops: number, family: Family = "noise"): Branch[] {
  const n = Math.max(1, Math.floor(chops)), out: Branch[] = [0];
  let s = seed | 0, r: number;
  const next = () => { [r, s] = draw(s); return r; };
  let last: Side = next() < 0.5 ? -1 : 1;
  if (family === "noise") {
    for (let i = 1; i < n; i++) {
      if (next() >= FELLING.branch) { out.push(0); continue; }
      last = (next() < FELLING.turn ? -last : last) as Side;
      out.push(last);
    }
    return out;
  }
  // a family: so many branches on a side (its `group`), then a bare segment or none, then the other side
  const f = FELLING.families[family];
  const group = (): number => (family === "alternate" ? 1 : family === "pairs" ? 2 : FELLING.families.run.from + Math.floor(next() * (FELLING.families.run.to - FELLING.families.run.from + 1)));
  // (the first group may be met part of the way through, and a bare segment may come before it)
  let left = Math.max(1, group() - Math.floor(next() * 2));
  if (next() < 0.5) out.push(0);
  while (out.length < n) {
    if (left > 0) { out.push(last); left--; continue; }
    if (next() < f.gap) out.push(0);
    last = -last as Side;
    left = group();
  }
  return out.slice(0, n);
}

/** The fine timber a trunk gives for so many misses: of the misses each of its timbers bears (the most first), as many as bear them. */
export const timberOf = (bears: readonly number[], misses: number): number => bears.filter((b) => misses <= b).length;

/** A tree that comes down with a game: which, its girth, and the misses each of its fine timbers bears (`timberOf`). */
export interface FellTree { id: number; girth: Girth; timber: readonly number[] }
/**
 * A game: the trees that come down with it (the one walked up to first); the trunk that is played (its chops, its
 * branches, its girth, how fast its bar runs: so many times the plain pace); how many segments up a branch is seen;
 * how many branches struck are forgiven; how many misses end it (none, when it cannot be dropped); and whether it is
 * played with no stamina.
 */
export interface Felling { trees: FellTree[]; chops: number; branches: Branch[]; girth: Girth; family: Family; pace: number; ahead: number; spared: number; most: number; spent: boolean }
/** What a game is made from: its trees; the trunk (the chops it takes, the seed it is made from, its girth and its family); and what the hand and its axe make of it. */
export interface FellingAsk {
  trees: FellTree[];
  chops: number; seed: number; girth: Girth; family: Family;
  /** How many segments up a branch is seen, before tired hands are counted; and how fast the bar runs (so many times its plain pace), all told. */
  ahead: number; pace: number;
  /** Branches struck that are forgiven, a game. */
  spared?: number;
  /** Whether it is played with no stamina left. */
  spent?: boolean;
}
/** A game, put together. */
export function startFelling(ask: FellingAsk): Felling {
  const spent = !!ask.spent, chops = Math.max(1, Math.floor(ask.chops)), family = isFamily(ask.family) ? ask.family : "noise";
  return {
    trees: ask.trees.map((t) => ({ id: t.id, girth: t.girth, timber: [...t.timber] })),
    chops, branches: branchesOf(ask.seed, chops, family), girth: ask.girth, family,
    pace: Math.max(0.01, ask.pace),
    ahead: Math.max(FELLING.least, Math.floor(ask.ahead) - (spent ? FELLING.tired.later : 0)),
    spared: Math.max(0, Math.floor(ask.spared ?? 0)),
    most: spent ? FELLING.tired.misses : 0,
    spent,
  };
}

/** How a go ended: the trunk was cut through; the bar ran out; the axe slipped from tired hands; the axe was put down. Only the first gives fine timber. */
export type FellEnd = "through" | "time" | "dropped" | "left";
/**
 * A game as it stands: how many chops are made; the side the hand stands on (none, before the first chop); the
 * seconds left in the bar and whether it runs (from the first chop); the misses, and the branches forgiven; whether a
 * friend braces the trunk; how it ended (null while it is played); and the seconds played by hand.
 */
export interface FellPlay { cut: number; side: Side | 0; bar: number; running: boolean; misses: number; forgiven: number; braced: boolean; end: FellEnd | null; secs: number }
export function beginPlay(_game: Felling): FellPlay {
  return { cut: 0, side: 0, bar: FELLING.bar.from, running: false, misses: 0, forgiven: 0, braced: false, end: null, secs: 0 };
}
/** Whether a game is over. */
export const isOver = (_game: Felling, play: FellPlay): boolean => play.end !== null;
/** The misses of a game. */
export const missesOf = (play: FellPlay): number => play.misses;
/** The share of the bar that is left, 0 to 1. */
export const barShare = (play: FellPlay): number => Math.max(0, Math.min(1, play.bar / FELLING.bar.full));
/** How fast the bar runs just now: the game's pace, less a friend's brace. */
export const paceNow = (game: Felling, play: FellPlay): number => game.pace * (play.braced ? 1 - FELLING.brace : 1);

/** Time goes by: the bar runs down, from the first chop on. Run out, the go is over: the tree comes down with no fine timber. */
export function tick(game: Felling, play: FellPlay, dt: number): FellPlay {
  if (isOver(game, play) || !play.running || !(dt > 0)) return play;
  const bar = play.bar - dt * paceNow(game, play), secs = play.secs + dt;
  return bar > 0 ? { ...play, bar, secs } : { ...play, bar: 0, secs, running: false, end: "time" };
}
/** A friend braces the trunk: the bar runs slower from now. Once a go; nothing, of a go that is over. */
export const brace = (game: Felling, play: FellPlay): FellPlay => (isOver(game, play) || play.braced ? play : { ...play, braced: true });
/** The axe is put down: a go that was begun is over, and its tree comes down with no fine timber. Nothing, of a go whose first chop was never made. */
export const leave = (game: Felling, play: FellPlay): FellPlay => (isOver(game, play) || !play.running ? play : { ...play, running: false, end: "left" });

/**
 * What a chop came to: a segment cut and nothing more; a branch that struck (a miss); a branch that struck and was
 * forgiven; the trunk cut through; or the axe dropped at one miss too many. Nothing, of a chop at a game that is over.
 */
export type Chopped = "cut" | "hit" | "forgiven" | "felled" | "dropped" | null;
/** A chop from a side: the lowest segment is cut out, the bar gets a little back, and what comes level may strike. */
export function chop(game: Felling, play: FellPlay, side: Side): { play: FellPlay; what: Chopped } {
  if (isOver(game, play)) return { play, what: null };
  const cut = play.cut + 1;
  const now: FellPlay = { ...play, side, cut, running: true, bar: Math.min(FELLING.bar.full, play.bar + FELLING.bar.top) };
  if (cut >= game.chops) return { play: { ...now, running: false, end: "through" }, what: "felled" };
  if (game.branches[cut] !== side) return { play: now, what: "cut" };
  // the segment that has come level has a branch on the side the hand stands on
  if (play.forgiven < game.spared) return { play: { ...now, forgiven: play.forgiven + 1 }, what: "forgiven" };
  const struck: FellPlay = { ...now, misses: play.misses + 1, bar: Math.max(0.05, now.bar - FELLING.bar.hit) };
  if (game.most > 0 && struck.misses >= game.most) return { play: { ...struck, running: false, end: "dropped" }, what: "dropped" };
  return { play: struck, what: "hit" };
}

/**
 * What is seen of the trunk now, from the segment that is level upwards, `rows` of them: each a branch's side, none,
 * or null for a segment whose branch is not seen yet (it is in the leaves), and "top" above the trunk's last segment.
 */
export function seen(game: Felling, play: FellPlay, rows: number): Array<Branch | null | "top"> {
  const cut = play.end === "through" ? game.chops : play.cut;
  return Array.from({ length: rows }, (_, j) => {
    const i = cut + j;
    if (i >= game.chops) return "top";
    return j <= game.ahead ? game.branches[i] : null;
  });
}

/**
 * The fine timber a game is heading for, a tree: what its misses so far still leave (nothing, of a go that ended
 * any way but through). And whether one more miss would lose a timber of any tree.
 */
export const headingFor = (game: Felling, play: FellPlay): number[] => game.trees.map((t) => (play.end && play.end !== "through" ? 0 : timberOf(t.timber, play.misses)));
export const onTheEdge = (game: Felling, play: FellPlay): boolean => !play.end && game.trees.some((t) => timberOf(t.timber, play.misses + 1) < timberOf(t.timber, play.misses));

/** How a game came out: its trees; whether the trunk was cut through, and how it ended; the misses; the chops it took and those made; whether a friend braced it; how long it took. */
export interface FellOutcome { trees: number[]; through: boolean; end: FellEnd | null; misses: number; chops: number; cut: number; braced: boolean; secs: number }
export function outcomeOf(game: Felling, play: FellPlay): FellOutcome {
  return { trees: game.trees.map((t) => t.id), through: play.end === "through", end: play.end, misses: play.misses, chops: game.chops, cut: play.cut, braced: play.braced, secs: Math.round(play.secs * 10) / 10 };
}
/**
 * How near a go was to more, for one of its trees (states, to be said on a card): `misses`, how many misses fewer
 * would have won the next fine timber (0: it had them all, or the go was not cut through); `chops`, how many chops
 * were left when it ended (0: it was cut through).
 */
export function nearOf(out: Pick<FellOutcome, "through" | "misses" | "chops" | "cut">, bears: readonly number[]): { misses: number; chops: number; got: number } {
  if (!out.through) return { misses: 0, chops: Math.max(1, out.chops - out.cut), got: 0 };
  const got = timberOf(bears, out.misses), next = [...bears].sort((a, b) => b - a)[got];
  return { misses: next === undefined ? 0 : Math.max(1, out.misses - next), chops: 0, got };
}
/** The least seconds a go that cut these trunks through can have taken: no hand chops oftener than `quickest` (the first chop of a trunk takes no time). */
export const leastSecs = (chops: number[]): number => chops.reduce((sum, c) => sum + Math.max(0, c - 1) * FELLING.quickest, 0);
