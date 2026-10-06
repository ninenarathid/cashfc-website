import { TIMING, narrowed, type TimingMods } from "./timing";

/**
 * Tired hands, as a game of their own: what sowing, feeding, curing and picking are with no stamina left
 * (lib/town/farm: with some, each is done at once). It was a short round of the game of timing; now it is what
 * tired hands are (the owner, 2026-10-04: "การกดตามจังหว่ะ ดูจะมีเยอะไปหน่อย"): they shake.
 *
 * The thing in the hand hangs over the plant, and wanders: a slow sway that can be followed, and a quick tremble
 * that cannot. Whoever plays moves it back, a finger or the mouse dragged the other way, and keeps it inside the
 * ring over the plant. Every so long kept inside, in one go, is a part of the work done; so many parts and it is done. Left
 * outside the ring for a while it is a miss (the seed is fumbled, and picked up again), and at the third miss tired
 * hands give it up, with nothing done and nothing lost, as with the hoe. A better can or blade widens the ring, as a
 * better tool widened the stretch.
 *
 * About as hard as the round of timing it takes the place of. Of made-up hands that follow the wandering late and
 * shakily: one as unsure as the members' were on the first day does it one go in nine, a practised one two in
 * three, a very good one nineteen in twenty; a hand that does nothing at all, one in fifty.
 *
 * Pure: the wandering is worked out from a seed and the time, and it is told how far the hand was moved.
 */
export const STEADY = {
  /** The ring's radius, where the wandering is measured in halves of the field it is drawn in (1 is the field's edge). */
  ring: 0.34,
  /** The slow sway: how far it carries the hand, and its two paces (turns a second). */
  sway: 0.44, slow: [0.21, 0.47],
  /** The quick tremble: how far, and its two paces. */
  tremble: 0.035, quick: [2.9, 4.3],
  /** How long kept inside the ring is a part of the work done, and how long left outside is a miss, in seconds. */
  beat: 0.8, slip: 0.8,
  /** How far the hand can be moved from where it began. */
  reach: 1.6,
};

/**
 * Hands at work as they stand: how many parts are wanted, the parts done and the misses so far, how many misses end
 * it (none, when it cannot be lost), where the player has moved the hand to (against the wandering), how long it
 * has been inside the ring towards the next part, how long it has been outside, the ring's radius, the time, and
 * the seed the wandering is worked out from.
 */
export interface Hands { need: number; hits: number; misses: number; most: number; x: number; y: number; inside: number; out: number; ring: number; t: number; seed: number }

/** Four turns of a circle from a seed, each a number in [0, 1): where each wave of the wandering begins. */
function phases(seed: number): number[] {
  const out: number[] = [];
  let a = seed | 0;
  for (let i = 0; i < 8; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}
/**
 * How far the wandering has carried the hand at a moment: the sway and the tremble together. The sway begins near
 * the middle and on its way out, one way or the other (a hand left alone is never lucky enough to stay put).
 */
export function wander(seed: number, t: number): { x: number; y: number } {
  const raw = phases(seed), w = (f: number, at: number) => Math.sin(2 * Math.PI * (f * t + at));
  // (each axis's two slow waves start together, within a twelfth of a turn of crossing the middle, going the same way)
  const near = (r: number, way: number) => (way < 0.5 ? 0 : 0.5) + (r - 0.5) / 12;
  const p = [near(raw[0], raw[1]), near(raw[0], raw[1]), near(raw[2], raw[3]), near(raw[2], raw[3]), raw[4], raw[5], raw[6], raw[7]];
  const [s1, s2] = STEADY.slow, [q1, q2] = STEADY.quick;
  return {
    x: STEADY.sway * (0.7 * w(s1, p[0]) + 0.3 * w(s2, p[1])) + STEADY.tremble * (w(q1, p[4]) + w(q2, p[5])),
    y: STEADY.sway * (0.7 * w(s2 * 0.83, p[2]) + 0.3 * w(s1 * 1.9, p[3])) + STEADY.tremble * (w(q2, p[6]) + w(q1, p[7])),
  };
}

/** Begin, wanting so many parts. (Tired hands are the only ones that play it: `spent` only says whether it can be dropped.) */
export function startHands(need: number, mods: TimingMods, seed: number): Hands {
  // (it begins over the plant: the wandering starts from where it is, not from wherever the waves happen to stand)
  const at = wander(seed | 0, 0);
  return {
    need: Math.max(1, Math.floor(need)), hits: 0, misses: 0, most: mods.spent && mods.drops ? TIMING.spent.misses : 0,
    x: -at.x, y: -at.y, inside: 0, out: 0, ring: Math.min(0.6, STEADY.ring * Math.sqrt(mods.tool ?? 1) * narrowed(mods)), t: 0, seed: seed | 0,
  };
}

/** Whether the work is done. */
export const steadied = (h: Hands) => h.hits >= h.need;
/** Whether the work was dropped: as many misses as tired hands have in them, before it was done. */
export const dropped = (h: Hands) => h.most > 0 && h.misses >= h.most && !steadied(h);
/** Where the thing in the hand is now, from the ring's middle. */
export function handAt(h: Hands): { x: number; y: number } {
  const w = wander(h.seed, h.t);
  return { x: h.x + w.x, y: h.y + w.y };
}
/** Whether it is inside the ring. */
export const within = (h: Hands) => { const at = handAt(h); return Math.hypot(at.x, at.y) <= h.ring; };

/** So many seconds gone by, the hand moved so far in them. */
export function steady(h: Hands, dx: number, dy: number, dt: number): Hands {
  if (steadied(h) || dropped(h)) return h;
  const clamp = (v: number) => Math.max(-STEADY.reach, Math.min(STEADY.reach, v));
  const next = { ...h, x: clamp(h.x + dx), y: clamp(h.y + dy), t: h.t + Math.max(0, dt) };
  if (within(next)) {
    let inside = next.inside + dt, hits = next.hits;
    while (inside >= STEADY.beat && hits < next.need) { inside -= STEADY.beat; hits++; }
    return { ...next, inside: hits >= next.need ? 0 : inside, hits, out: 0 };
  }
  // out of the ring: what was kept towards the next part is lost (it has to be kept in one go), and left out long enough it is a miss
  const out = next.out + dt;
  return out >= STEADY.slip ? { ...next, inside: 0, out: 0, misses: next.misses + 1 } : { ...next, inside: 0, out };
}
