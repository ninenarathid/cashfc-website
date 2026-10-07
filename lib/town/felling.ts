/**
 * Felling a tree, as a game of its own (the owner, 2026-10-08: woodcutting, on the mountain's foot; "mini game
 * เข้าใจไม่ยาก ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย").
 *
 * The trunk stands in the middle of the board, a stack of segments. A chop is made from the left or from the right:
 * the lowest segment is cut out and the trunk drops by one. Some segments have a branch on one side, and whoever
 * stands on that side when it comes level is struck by it: a miss. A bar of time runs down from the first chop on;
 * every chop puts a little back; when it runs out the axe is put down and the tree stands. Branches are seen only
 * so many segments up: the rest of the trunk is in the leaves.
 *
 * - One game may fell more than one tree (lib/town/trees' echo): a stretch a tree, each its own trunk and its own
 *   bar, each a little faster than the one before; a stretch that runs out of time leaves its tree standing and the
 *   next begins.
 * - With no stamina left the bar runs faster, branches are seen a segment later, and at the third miss the axe slips
 *   from the hand: the game is over, and what was not felled stands.
 * - Some branches struck are forgiven (`spared`, so many to a tree): they are no miss and cost no time.
 *
 * What an axe changes (how many chops, how far up branches are seen, how fast the bar runs) is lib/town/tools' to
 * read, and lib/town/trees puts a game together from it. Here are only the trunk and the hand's two keys.
 *
 * Pure: a trunk is worked out from a seed, and the game is stepped by whoever plays it.
 */
export const FELLING = {
  /** How likely a segment has a branch; and how likely a branch is on the other side from the one before it. */
  branch: 0.68, turn: 0.65,
  /**
   * The bar of time, in seconds at its plain pace: what it holds, what a stretch begins with, what a chop puts back,
   * and what a branch struck takes away.
   */
  bar: { full: 1.8, from: 1.8, top: 0.36, hit: 0.25 },
  /** With no stamina: the bar so many times as fast, branches seen so many segments later, and the axe dropped at so many misses. */
  tired: { pace: 1.6, later: 1, misses: 3 },
  /** A stretch after the first is so much faster than the one before it. */
  faster: 0.1,
  /** Branches are always seen at least so many segments up. */
  least: 1,
  /** No hand chops oftener than once in so many seconds: a go that says it did was not played (lib/town/trees holds a go to it). */
  quickest: 0.07,
};

/** A side of the trunk: the left, or the right. And what a segment has: a branch on one of them, or none. */
export type Side = -1 | 1;
export type Branch = -1 | 0 | 1;

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/**
 * A trunk of so many segments, from the lowest up: what each has. The lowest has none (nothing is level before the
 * first chop). The same seed is always the same trunk.
 */
export function branchesOf(seed: number, chops: number): Branch[] {
  const n = Math.max(1, Math.floor(chops)), out: Branch[] = [0];
  let s = seed | 0, r: number;
  [r, s] = draw(s);
  let last: Side = r < 0.5 ? -1 : 1;
  for (let i = 1; i < n; i++) {
    [r, s] = draw(s);
    if (r >= FELLING.branch) { out.push(0); continue; }
    [r, s] = draw(s);
    last = (r < FELLING.turn ? -last : last) as Side;
    out.push(last);
  }
  return out;
}

/** One tree of a game: which, how many chops it takes, its trunk, and how fast its bar runs (so many times the plain pace). */
export interface Stretch { tree: number; chops: number; branches: Branch[]; pace: number }
/**
 * A game: its trees in their order; how many segments up a branch is seen; how many branches struck are forgiven a
 * tree; and how many misses, all told, end it (none, when it cannot be dropped).
 */
export interface Felling { stretches: Stretch[]; ahead: number; spared: number; most: number; spent: boolean }
/** What a game is made from: its trees, each with the chops it takes and its seed; and what the hand and its axe make of it. */
export interface FellingAsk {
  trees: Array<{ id: number; chops: number; seed: number }>;
  /** How many segments up a branch is seen, and how fast the bar runs (so many times its plain pace), both before tired hands are counted. */
  ahead: number; pace: number;
  /** Branches struck that are forgiven, a tree. */
  spared?: number;
  /** Whether it is played with no stamina left. */
  spent?: boolean;
}
/** A game, put together. */
export function startFelling(ask: FellingAsk): Felling {
  const spent = !!ask.spent, pace = Math.max(0.01, ask.pace) * (spent ? FELLING.tired.pace : 1);
  return {
    stretches: ask.trees.map((t, i) => {
      const chops = Math.max(1, Math.floor(t.chops));
      return { tree: t.id, chops, branches: branchesOf(t.seed, chops), pace: pace * (1 + FELLING.faster * i) };
    }),
    ahead: Math.max(FELLING.least, Math.floor(ask.ahead) - (spent ? FELLING.tired.later : 0)),
    spared: Math.max(0, Math.floor(ask.spared ?? 0)),
    most: spent ? FELLING.tired.misses : 0,
    spent,
  };
}

/** How a stretch ended: its tree fell, or stands (time ran out, or the axe was dropped). */
export type StretchEnd = "felled" | "stands";
/**
 * A game as it stands: the stretch being played and how many chops of it are made; the side the hand stands on
 * (none, before the first chop of all); the seconds left in the bar and whether it runs (from a stretch's first chop);
 * of each stretch its misses, the branches forgiven in it, and how it ended; whether the axe was dropped; and the
 * seconds played by hand.
 */
export interface FellPlay {
  at: number; cut: number; side: Side | 0; bar: number; running: boolean;
  misses: number[]; forgiven: number[]; ends: Array<StretchEnd | null>;
  dropped: boolean; secs: number;
}
export function beginPlay(game: Felling): FellPlay {
  const n = game.stretches.length;
  return { at: 0, cut: 0, side: 0, bar: FELLING.bar.from, running: false, misses: Array<number>(n).fill(0), forgiven: Array<number>(n).fill(0), ends: Array<StretchEnd | null>(n).fill(null), dropped: false, secs: 0 };
}
/** Whether a game is over: every stretch has ended, or the axe was dropped. */
export const isOver = (game: Felling, play: FellPlay): boolean => play.dropped || play.at >= game.stretches.length;
/** The misses of a game, all told. */
export const missesOf = (play: FellPlay): number => play.misses.reduce((a, b) => a + b, 0);
/** The share of the bar that is left, 0 to 1. */
export const barShare = (play: FellPlay): number => Math.max(0, Math.min(1, play.bar / FELLING.bar.full));

/** The stretch being played has ended: the next begins with its own bar, standing still until its first chop. */
function ended(game: Felling, play: FellPlay, how: StretchEnd): FellPlay {
  const ends = play.ends.slice();
  ends[play.at] = how;
  return { ...play, ends, at: play.at + 1, cut: 0, bar: FELLING.bar.from, running: false };
}

/** Time goes by: the bar runs down, at the stretch's pace, from its first chop on. Run out, the tree stands. */
export function tick(game: Felling, play: FellPlay, dt: number): FellPlay {
  if (isOver(game, play) || !play.running || !(dt > 0)) return play;
  const bar = play.bar - dt * game.stretches[play.at].pace, secs = play.secs + dt;
  return bar > 0 ? { ...play, bar, secs } : ended(game, { ...play, bar: 0, secs }, "stands");
}

/**
 * What a chop came to: a segment cut and nothing more; a branch that struck (a miss); a branch that struck and was
 * forgiven; the tree felled; or the axe dropped at one miss too many. Nothing, of a chop at a game that is over.
 */
export type Chopped = "cut" | "hit" | "forgiven" | "felled" | "dropped" | null;
/** A chop from a side: the lowest segment is cut out, the bar gets a little back, and what comes level may strike. */
export function chop(game: Felling, play: FellPlay, side: Side): { play: FellPlay; what: Chopped } {
  if (isOver(game, play)) return { play, what: null };
  const st = game.stretches[play.at], cut = play.cut + 1;
  const now: FellPlay = { ...play, side, cut, running: true, bar: Math.min(FELLING.bar.full, play.bar + FELLING.bar.top) };
  if (cut >= st.chops) return { play: ended(game, now, "felled"), what: "felled" };
  if (st.branches[cut] !== side) return { play: now, what: "cut" };
  // the segment that has come level has a branch on the side the hand stands on
  if (play.forgiven[play.at] < game.spared) {
    const forgiven = play.forgiven.slice();
    forgiven[play.at]++;
    return { play: { ...now, forgiven }, what: "forgiven" };
  }
  const misses = play.misses.slice();
  misses[play.at]++;
  const struck: FellPlay = { ...now, misses, bar: Math.max(0.05, now.bar - FELLING.bar.hit) };
  if (game.most > 0 && missesOf(struck) >= game.most) {
    const ends = struck.ends.slice();
    ends[struck.at] = "stands";
    return { play: { ...struck, ends, dropped: true, running: false }, what: "dropped" };
  }
  return { play: struck, what: "hit" };
}

/**
 * What is seen of the trunk now, from the segment that is level upwards, `rows` of them: each a branch's side, none,
 * or null for a segment whose branch is not seen yet (it is in the leaves), and "top" above the trunk's last segment.
 */
export function seen(game: Felling, play: FellPlay, rows: number): Array<Branch | null | "top"> {
  const st = game.stretches[Math.min(play.at, game.stretches.length - 1)], cut = isOver(game, play) ? st.chops : play.cut;
  return Array.from({ length: rows }, (_, j) => {
    const i = cut + j;
    if (i >= st.chops) return "top";
    return j <= game.ahead ? st.branches[i] : null;
  });
}

/** How a game came out: of each tree whether it fell and with how many misses; the misses all told; whether the axe was dropped; how long it took. */
export interface FellOutcome { trees: Array<{ tree: number; felled: boolean; misses: number; chops: number }>; misses: number; dropped: boolean; secs: number }
export function outcomeOf(game: Felling, play: FellPlay): FellOutcome {
  return {
    trees: game.stretches.map((st, i) => ({ tree: st.tree, felled: play.ends[i] === "felled", misses: play.misses[i], chops: st.chops })),
    misses: missesOf(play), dropped: play.dropped, secs: Math.round(play.secs * 10) / 10,
  };
}
/** The least seconds a go that felled these trees can have taken: no hand chops oftener than `quickest` (the first chop of a stretch takes no time). */
export const leastSecs = (chops: number[]): number => chops.reduce((sum, c) => sum + Math.max(0, c - 1) * FELLING.quickest, 0);
