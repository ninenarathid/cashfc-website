import { see, type FarmSky, type Plant, type Plot } from "./farm";
import { spend } from "./stamina";
import type { Purse } from "./trade";

/**
 * **A giant pulled out together** (the owner, 2026-10-27, on hearing that a rank-7 giant was picked with one plain tap:
 * "ทำให้มีมินิเกมเล่นหลายคน ช่วยกันดึงผัก ... ทำ UI gameplay ออกมาดีๆได้เลย"; and earlier of a giant many pull: the grower
 * keeps it, "คนมาช่วยได้ reward นิดๆหน่อยๆ", "แต้มกับชื่อก็พอ").
 *
 * - **The call.** Whoever may pick it (the bed's keeper, as `pick` asks) calls at a ripe giant's root: up to three
 *   others join with a tap (`crew`, the caller first) while the call stands. The caller starts when they like, alone too.
 * - **Rocking it loose.** From the start (`go`) and a count-in, the giant rocks left and right on one clock that every
 *   page shares (the database's): a half-swing each `swing` ms, leaning right first. Pull the rope on the side it leans
 *   to as it reaches its farthest lean (`window` either side of the peak). One press a half-swing each: the first press
 *   is the one that counts, a slip or the wrong side included, so pressing both ropes gains nothing.
 * - **Together.** A half-swing pulled well by one is worth 1, by two or more 3 (Codex's cap, 2026-10-27: more hands
 *   make it surer, not quicker, so a crowd does not finish it at a stroke). The roots hold `grip`; the giant comes out
 *   when the half-swings' worth reaches it. Not out after `swings` half-swings: the roots take hold again, nothing is
 *   lost but the stamina, and the caller may call again at once (the crew kept).
 * - **What comes of it.** The giant is loosened (`out`) and its keeper picks it as ever (lib/town/farm's `pick`), with
 *   one more fruit for each helper who pulled well `helpFrom` times (`bonus`); each of those helpers has `points` on the
 *   helpers' line (the deed `giant_help`, lib/town/line-points) and their name on the harvest. Each of the crew spends
 *   one stamina in a go, at their first report; with none it is never refused.
 * - **Never quicker hands for the tired:** the rules are the same with no stamina.
 *
 * The page judges a press at the press (components/town/TownGiantPull) and reports the half-swings it pulled well,
 * every few half-swings; whoever keeps the game counts them (the database's twin: v317's `public.town_giant_pull`).
 *
 * **One grown over its ground** (lib/town/giant-sizes; the owner, 2026-10-31: "ใช้คนในการช่วยกันถอนมากขึ้น"): its size says how many
 * hands must stand at it before it can start (`needs`), how many more may join, how many pulling one half-swing make it
 * worth the 3, and how fast its roots hold. With no such crew about, its keeper may dig it out alone (`dig`): its fruits as
 * any plant's, and no sale. A rank-7 giant that has not grown on is as it always was: alone it may be pulled.
 */
export const PULL = {
  crew: 4,
  /** How long a call stands with no start. */
  call: 180_000,
  /** From the start to the first half-swing. */
  count: 3_000,
  swing: 1_300,
  swings: 45,
  window: 220,
  grip: 24,
  /** What a half-swing is worth, by how many pulled it well (the last for any more). */
  worth: [0, 1, 3],
  /** Good pulls a helper needs for the fruit and the points. */
  helpFrom: 3,
  points: 5,
  /** How late a report is taken after the last half-swing. */
  grace: 5_000,
  /** How far ahead of the clock a report may claim a half-swing (the journey and the clocks' difference). */
  ahead: 1_500,
} as const;

/** A call and its go, kept on the giant's root plant. Times are the database's milliseconds; `hits` the half-swings each pulled well. */
export interface GiantPull {
  /** Dug out alone (`dig`): no sale for it. */
  alone?: boolean;
  by: string;
  at: number;
  crew: string[];
  go: number;
  hits: Record<string, number[]>;
  paid: string[];
  out: number;
  bonus: number;
  helped: string[];
}

export type PullAction = "open" | "join" | "leave" | "go" | "hits" | "look" | "dig";
export type PullRefusal = "none" | "theirs" | "busy" | "shut" | "full" | "in" | "crew" | "late" | "done" | "hands";

/** What pulling it takes, by its size: hands before it can start, how many may be in the crew, how many in one half-swing make it worth the most, and how fast the roots hold. */
export interface PullNeeds { hands: number; crew: number; together: number; grip: number }
const NEEDS: Readonly<Record<number, PullNeeds>> = {
  2: { hands: 2, crew: 4, together: 2, grip: 24 },
  3: { hands: 3, crew: 5, together: 2, grip: 28 },
  4: { hands: 3, crew: 5, together: 2, grip: 32 },
  5: { hands: 4, crew: 6, together: 3, grip: 36 },
  6: { hands: 5, crew: 7, together: 3, grip: 42 },
  7: { hands: 6, crew: 8, together: 4, grip: 48 },
};
export const needsOf = (p: Pick<Plant, "size"> | null | undefined): PullNeeds => (p?.size && NEEDS[p.size.n]) || { hands: 1, crew: PULL.crew, together: 2, grip: PULL.grip };
export type PullDid = { ok: true; plot: Plot; purse: Purse; helped: string[] } | { ok: false; why: PullRefusal };

/** The moment half-swing `k` leans farthest; `sideOf(k)` which way (1 right, −1 left). */
export const peakAt = (go: number, k: number) => go + PULL.count + k * PULL.swing + PULL.swing / 2;
export const sideOf = (k: number): 1 | -1 => (k % 2 === 0 ? 1 : -1);
/** When a go is over: the last half-swing's window shut. */
export const goEnds = (go: number) => peakAt(go, PULL.swings - 1) + PULL.window;
/** How far the giant leans at a moment, −1 to 1 (0 before the count-in ends and after the go). */
export function leanAt(go: number, now: number): number {
  const u = (now - go - PULL.count) / PULL.swing;
  return go > 0 && u > 0 && u < PULL.swings ? Math.sin(Math.PI * u) : 0;
}
/** Which half-swing a press at `at` belongs to (the nearest peak), and whether it pulled well on `side`; null outside the go. */
export function judgePull(go: number, at: number, side: 1 | -1): { k: number; good: boolean; off: number } | null {
  const k = Math.round((at - go - PULL.count) / PULL.swing - 0.5);
  if (go <= 0 || k < 0 || k >= PULL.swings) return null;
  const off = at - peakAt(go, k);
  return { k, good: Math.abs(off) <= PULL.window && side === sideOf(k), off };
}
export const worthOf = (n: number) => PULL.worth[Math.min(n, PULL.worth.length - 1)];
/** How many pulled each half-swing well, from everybody's reports. */
export function pullsBySwing(hits: Readonly<Record<string, readonly number[]>>): Map<number, number> {
  const by = new Map<number, number>();
  for (const ks of Object.values(hits)) for (const k of new Set(ks)) by.set(k, (by.get(k) ?? 0) + 1);
  return by;
}
/** The half-swings' worth so far, and what the roots still hold. */
export function gripOf(hits: Readonly<Record<string, readonly number[]>>, needs: Pick<PullNeeds, "together" | "grip"> = { together: 2, grip: PULL.grip }): { done: number; left: number } {
  let done = 0;
  for (const n of pullsBySwing(hits).values()) done += worthOf(n >= needs.together ? 2 : Math.min(n, 1));
  return { done, left: Math.max(0, needs.grip - done) };
}
export const pullOf = (plot: Plot | undefined): GiantPull | null => (plot?.plant?.giant && plot.plant.pull ? plot.plant.pull : null);
/** A call that can still be joined or started. */
export const calling = (pull: GiantPull | null, now: number) => !!pull && !pull.out && pull.go === 0 && pull.at + PULL.call > now;
/** A go under way (the count-in too). */
export const pulling = (pull: GiantPull | null, now: number) => !!pull && !pull.out && pull.go > 0 && now <= goEnds(pull.go) + PULL.grace;
/** A ripe giant's root that nobody has pulled out yet. */
export function pullable(key: string, plot: Plot | undefined, now: number, sky?: FarmSky): boolean {
  const p = plot?.plant;
  if (!p?.giant || (p.root && p.root !== key) || p.pull?.out) return false;
  const seen = see(key, plot!, now, sky);
  return seen.ripe && !seen.dead;
}

/** The half-swings a report may hold: whole numbers of the go, none ahead of the clock, each once. */
export function cleanHits(go: number, hits: unknown, now: number): number[] | null {
  if (!Array.isArray(hits) || hits.length > PULL.swings) return null;
  const out = new Set<number>();
  for (const k of hits) {
    if (typeof k !== "number" || !Number.isInteger(k) || k < 0 || k >= PULL.swings || peakAt(go, k) - PULL.window > now + PULL.ahead) return null;
    out.add(k);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * One deed of the game at a giant's root (`key`), by `me`; `may`: whether I may pick in that bed (lib/town/farm's
 * `pick`). The plot comes back as it should be kept; `helped`, when this report pulled it out, the helpers to credit.
 */
export function giantPull(action: PullAction, key: string, plot: Plot | undefined, me: string, may: boolean, purse: Purse, now: number, hits: unknown = [], sky?: FarmSky): PullDid {
  const p = plot?.plant, pull = pullOf(plot), needs = needsOf(p);
  if (!plot || !p?.giant || (p.root && p.root !== key)) return { ok: false, why: "none" };
  const keep = (next: GiantPull | null, purse_ = purse, helped: string[] = []): PullDid => {
    const { pull: _, ...rest } = p;
    return { ok: true, plot: { ...plot, plant: next ? { ...rest, pull: next } : rest }, purse: purse_, helped };
  };
  if (action === "look") return { ok: true, plot, purse, helped: [] };
  if (pull?.out) return { ok: false, why: "done" };
  if (action === "open") {
    if (!may) return { ok: false, why: "theirs" };
    if (!pullable(key, plot, now, sky)) return { ok: false, why: "none" };
    if (calling(pull, now) || pulling(pull, now)) return { ok: false, why: "busy" };
    // (called again after a go that did not take: the crew is kept, they are still standing there)
    const crew = pull && pull.go > 0 && pull.by === me && now <= goEnds(pull.go) + PULL.call ? pull.crew : [me];
    return keep({ by: me, at: now, crew, go: 0, hits: {}, paid: [], out: 0, bonus: 0, helped: [] });
  }
  // (dug out alone: only one grown over its ground, whose crew cannot be found; a giant of rank 7 is pulled alone as ever)
  if (action === "dig") {
    if (!may) return { ok: false, why: "theirs" };
    if (!p.size || !pullable(key, plot, now, sky)) return { ok: false, why: "none" };
    if (calling(pull, now) || pulling(pull, now)) return { ok: false, why: "busy" };
    return keep({ by: me, at: now, crew: [me], go: 0, hits: {}, paid: [], out: now, bonus: 0, helped: [], alone: true });
  }
  if (action === "join") {
    if (!calling(pull, now)) return { ok: false, why: "shut" };
    if (pull!.crew.includes(me)) return { ok: false, why: "in" };
    if (pull!.crew.length >= needs.crew) return { ok: false, why: "full" };
    return keep({ ...pull!, crew: [...pull!.crew, me] });
  }
  if (action === "leave") {
    if (!calling(pull, now) || !pull!.crew.includes(me)) return { ok: false, why: "shut" };
    return keep(pull!.by === me ? null : { ...pull!, crew: pull!.crew.filter((id) => id !== me) });
  }
  if (action === "go") {
    if (!calling(pull, now)) return { ok: false, why: "shut" };
    if (pull!.by !== me) return { ok: false, why: "theirs" };
    if (!pullable(key, plot, now, sky)) return { ok: false, why: "none" };
    if (pull!.crew.length < needs.hands) return { ok: false, why: "hands" };
    return keep({ ...pull!, go: now });
  }
  // hits: my report of the half-swings I pulled well so far
  if (!pull || pull.go === 0) return { ok: false, why: "shut" };
  if (!pull.crew.includes(me)) return { ok: false, why: "crew" };
  if (now > goEnds(pull.go) + PULL.grace) return { ok: false, why: "late" };
  const mine = cleanHits(pull.go, hits, now);
  if (!mine) return { ok: false, why: "none" };
  const merged = { ...pull.hits, [me]: [...new Set([...(pull.hits[me] ?? []), ...mine])].sort((a, b) => a - b) };
  const paid = pull.paid.includes(me) ? pull.paid : [...pull.paid, me];
  const purse_ = pull.paid.includes(me) ? purse : spend(purse, 1, now);
  if (gripOf(merged, needs).left > 0) return keep({ ...pull, hits: merged, paid }, purse_);
  const helped = pull.crew.filter((id) => id !== pull.by && (merged[id]?.length ?? 0) >= PULL.helpFrom);
  return keep({ ...pull, hits: merged, paid, out: now, bonus: helped.length, helped }, purse_, helped);
}
