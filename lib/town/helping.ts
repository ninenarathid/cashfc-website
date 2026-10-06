import type { Plot } from "./farm";
import { numberOf, wearing } from "./gifts";
import { HEAT } from "./heat";
import { LONG } from "./longpour";
import { HOUR, type Purse } from "./trade";
import { WATERS, type Nature } from "./waters";

/**
 * The gifts of the helpers' line (lib/town/gifts; the owner, 2026-10-07: each rank's gift cuts a whole rule of its
 * line out, each more than the last, and no power takes failing away). The line counts work done for other members:
 * in their beds, on their plants. What its ranks give is for whoever helps, and most of it is better with a friend
 * beside one (his rule for the town: games that need several people, so that members talk).
 *
 * 1. **The gardener's gloves** (a charm): work for somebody else takes no stamina at all, and a row of theirs is
 *    watered at one long pour (lib/town/farm's pourFor and pourRow; the game is lib/town/longpour).
 * 2. **The garden fae anklet** (a charm): another's plant its wearer waters grows twice as much from that watering;
 *    twenty watered in a row with no more than eight seconds between two, and it is three times (`chime`, below: the
 *    run is kept in the purse). A tune that climbs a note a plant tells the run (the page's). With whatever else
 *    makes a watering the more (a hot afternoon, the well's water) the whole is never more than three times what
 *    the watering added (`pouredAs`).
 *
 * The rest of what is here is what those rules go by. The deeds themselves, which need the farm's own rules, are in
 * lib/town/farm under "the gifts of the helpers' line".
 *
 * Pure. The database does the same (v153). **Every number here is mine, not the owner's**, but the ones his words
 * for each gift say (twice and three times, twenty in a row, eight seconds).
 */
export const HELPING = {
  /** How many times what a watering added it may come to at the most, whatever makes it the more: the gifts of this line, the heat, the well's water. */
  most: 3,
  /**
   * The anklet: how many waterings in a row make the most of it, the seconds two of them may be apart, how many
   * times over a watering is from then on (below that it is the gift's own number), and the most seconds of a long
   * pour that are not counted against the run (a row is a few seconds in the pouring: lib/town/longpour).
   */
  anklet: { run: 20, gap: 8, top: 3, long: LONG.longest },
};

/** The run of waterings a purse keeps (`chime`: how many in a row, and when the last was), as it stands at a moment: none, once the gap has passed, or of what is kept wrongly. */
export function runOf(purse: Pick<Purse, "chime">, now: number): number {
  const k = purse.chime as { n?: unknown; at?: unknown } | null | undefined;
  if (!k || typeof k !== "object" || typeof k.n !== "number" || typeof k.at !== "number" || !(k.n >= 1) || now < k.at || now - k.at > HELPING.anklet.gap * 1000) return 0;
  return Math.floor(k.n);
}
/**
 * A watering of somebody else's plant by whoever wears the anklet: the purse with the run one longer (or begun
 * anew, the gap having passed), and how many times over the watering is. Without the anklet: the purse as it is, and
 * once.
 */
export function chime<P extends Purse>(purse: P, now: number): { purse: P; times: number } {
  if (!wearing(purse, "charmAnklet")) return { purse, times: 1 };
  const n = Math.min(9999, runOf(purse, now) + 1);
  return { purse: { ...purse, chime: { n, at: now } }, times: n >= HELPING.anklet.run ? HELPING.anklet.top : numberOf("charmAnklet") };
}
/** How many times over the next watering of a run so long would be for whoever wears the anklet (for the page, which shows it). */
export const timesAt = (run: number): number => (run >= HELPING.anklet.run ? HELPING.anklet.top : numberOf("charmAnklet"));
/**
 * A purse whose run of waterings is not the shorter for a long pour that was so many seconds in the pouring (as the
 * page says, believed up to `long`): the run's last moment is put that much later, never past now. So a wearer of the
 * gloves and the anklet who goes from one row to the next keeps the run as one who waters plant by plant does.
 */
export function bridged<P extends Purse>(purse: P, secs: number, now: number): P {
  const k = purse.chime as { n?: unknown; at?: unknown } | null | undefined;
  if (!wearing(purse, "charmAnklet") || !k || typeof k !== "object" || typeof k.n !== "number" || typeof k.at !== "number" || !(secs > 0)) return purse;
  return { ...purse, chime: { n: k.n, at: Math.min(now, k.at + Math.floor(Math.min(secs, HELPING.anklet.long) * 1000)) } };
}

/**
 * A plot as it is kept after a watering with a can, written at `now` over what it `was` (the same plant, watered at
 * this moment and not before): what the watering added is made the more by the gifts of whoever watered (`times`:
 * what `tend` said) and by the heat and the well's water (lib/town/heat, lib/town/waters: `hot`, `kind`), **never to
 * more than `most` times what it added** where a gift has a hand in it (what the sky and the well do by themselves
 * is as it always was); and under the moon's water the plant is kept from pests, as ever. The plant remembers the
 * watering (`pour`: whose it was, when, what it added before anything made it the more, and how many times over it
 * was kept in all; `worn`: its waterer wore the duet bell in a bed not their own), for a friend's bell to find.
 *
 * What is no watering is kept as it is.
 */
export function pouredAs(was: Plot | undefined, next: Plot, now: number, hot: boolean, kind: Nature | null | undefined, by: string, times = 1, worn = false): Plot {
  const a = was?.plant, b = next.plant;
  if (!a || !b || a.sown !== b.sown || b.watered !== now || a.watered >= now) return next;
  const base = b.boost - a.boost;
  if (!(base > 0)) return next;
  const more = (hot ? HEAT.by : 0) + (kind ? WATERS.adds[kind] : 0);
  const x = times > 1 ? Math.max(1 + more, Math.min(HELPING.most, times * (1 + more))) : 1 + more;
  const guard = kind && WATERS.guards[kind] ? Math.max(b.guard, now + WATERS.guards[kind] * HOUR) : b.guard;
  // (with no gift in it the sum is the heat's own: what was added, and so much of it again)
  const boost = times > 1 ? a.boost + base * x : more ? b.boost + base * more : b.boost;
  return { ...next, plant: { ...b, boost, guard, pour: { by, at: now, base, x, ...(worn ? { worn: true } : {}) } } };
}
