import { numberOf, wearing } from "./gifts";
import { LONG } from "./longpour";
import type { Purse } from "./trade";

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
 *    run is kept in the purse). A tune that climbs a note a plant tells the run (the page's).
 *
 * The rest of what is here is what those rules go by. The deeds themselves, which need the farm's own rules, are in
 * lib/town/farm under "the gifts of the helpers' line".
 *
 * Pure. The database does the same (v153). **Every number here is mine, not the owner's**, but the ones his words
 * for each gift say (twice and three times, twenty in a row, eight seconds).
 */
export const HELPING = {
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
