/**
 * Roasting on a stick over the camp's fire, as rules (the owner, 2026-10-05: "เราต้องการให้ UI และ gameplay ของ mini
 * game unique", and of what is roasted at the camp with no cookware of the uncle's: "ได้ครับ"). It is the game a dish
 * is cooked by when what it is cooked on is a skewer, where every other dish is stirred (lib/town/stirring).
 *
 * The morsel on the stick has four faces. The one turned to the fire cooks, the two beside it cook a little, the
 * one turned away not at all. A touch turns the stick a quarter. Every face is to be golden: done, and not burnt.
 * The fire is not steady: now and then it flares, and for a moment cooks much faster; a crackle comes just before.
 * So nothing is waited for with a finger held still: the whole of it is which face to give the fire next, with the
 * faces beside it browning meanwhile, and what to have turned to it when it flares.
 *
 * It ends when every face is done (or after a long while, with whatever is done). A face burnt is a miss: the dish
 * comes out a helping short for each, as a stir missed does. With no stamina the fire flares more often, and a face
 * is done only a little short of burning.
 *
 * Pure: a roast is what it is at a moment, and the next is worked out from it.
 */
export const ROASTING = {
  faces: 4,
  /** How much of a face cooks in a second by an ordinary fire; and the share of that the two faces beside it get. */
  rate: 0.42,
  side: 0.25,
  /** A face is done from here, and burnt past here; with no stamina, done only from here. */
  done: 0.7,
  burnt: 1,
  tiredDone: 0.8,
  /** The fire flares every so many seconds (least and most), for so long, cooking so many times as fast; a crackle comes so long before. With no stamina, oftener. */
  flare: { every: [2.4, 4.2] as [number, number], lasts: 0.8, by: 2.4, warns: 0.55 },
  tiredEvery: [1.5, 2.6] as [number, number],
  /** However it goes, it is over after so many seconds. */
  longest: 40,
  /** The longest step cooking is worked out by. */
  step: 0.04,
};

/** A roast: how far each face is cooked, which face is turned to the fire, the moment it stands at, when the fire flares, and whether hands are tired. */
export interface Roast { faces: number[]; down: number; t: number; flares: number[]; spent: boolean; turns: number }

function draw(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Begin a roast. (`calm`: steady hands, so many times as long between the fire's flares: a meal's buff, 1 for none.) */
export function startRoast(spent: boolean, seed: number, calm = 1): Roast {
  const [lo, hi] = (spent ? ROASTING.tiredEvery : ROASTING.flare.every).map((s) => s * Math.max(1, calm)), flares: number[] = [];
  let s = seed | 0;
  for (let at = 0; at < ROASTING.longest;) { const [r, s1] = draw(s); s = s1; at += lo + r * (hi - lo); flares.push(Math.round(at * 100) / 100); }
  return { faces: Array<number>(ROASTING.faces).fill(0), down: 0, t: 0, flares, spent, turns: 0 };
}

/** The fire at a moment: how many times an ordinary fire it cooks, whether it is flaring, and whether it is about to. */
export function fireAt(r: Roast, t: number): { by: number; flaring: boolean; crackling: boolean } {
  const F = ROASTING.flare;
  const flaring = r.flares.some((f) => t >= f && t < f + F.lasts), crackling = !flaring && r.flares.some((f) => t >= f - F.warns && t < f);
  return { by: flaring ? F.by : 1, flaring, crackling };
}

/** From how far a face counts as done. */
export const doneFrom = (r: Roast) => (r.spent ? ROASTING.tiredDone : ROASTING.done);
/** Whether every face is done: the roast is over. */
export const roasted = (r: Roast) => r.faces.every((f) => f >= doneFrom(r)) || r.t >= ROASTING.longest;
/** How it came out: the faces that are golden, and the ones that are burnt. */
export const roastOf = (r: Roast) => ({ hits: r.faces.filter((f) => f >= doneFrom(r) && f <= ROASTING.burnt).length, misses: r.faces.filter((f) => f > ROASTING.burnt).length });

/** The roast as it is at a later moment: the face turned to the fire cooked, the two beside it a little. */
export function roastAt(r: Roast, t: number): Roast {
  if (t <= r.t || roasted(r)) return r;
  const n = ROASTING.faces, faces = [...r.faces], end = Math.min(t, ROASTING.longest);
  let at = r.t;
  while (at < end) {
    const dt = Math.min(ROASTING.step, end - at), heat = fireAt(r, at).by * ROASTING.rate * dt;
    faces[r.down] += heat;
    faces[(r.down + 1) % n] += heat * ROASTING.side;
    faces[(r.down + n - 1) % n] += heat * ROASTING.side;
    at += dt;
    // (it is taken off the fire the moment its last face is done)
    if (faces.every((f) => f >= doneFrom(r))) break;
  }
  return { ...r, faces: faces.map((f) => Math.min(1.5, f)), t: at >= end ? end : at };
}

/** Turn the stick a quarter: the next face is to the fire. */
export const turn = (r: Roast): Roast => (roasted(r) ? r : { ...r, down: (r.down + 1) % ROASTING.faces, turns: r.turns + 1 });
