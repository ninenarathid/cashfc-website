import type { Plant, Plot } from "./farm";
import { numberOf, useGift, usesLeft, wearing, works } from "./gifts";
import { STAMINA, dayOf, staminaOf } from "./stamina";
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
 * 3. **The duet bell** (a charm): two members watering in the same bed within ten seconds of each other, and both
 *    waterings count double: the growth (under the same bound of three), a point more on the helpers' line for each
 *    of somebody else's plants, and two stamina back a plant (`ring`, `belled`). **One bell is enough for the two**:
 *    it rings when either of them wears it in a bed that is not their own; the friend may be anybody else who waters
 *    there, the bed's owner too. Alone it does nothing. Whoever keeps the game judges it for both purses at the
 *    second watering, and tells both (`aided`).
 * 4. **The ring of shared strength** (a charm): its wearer gives a friend standing near thirty stamina, and their own
 *    falls by half of that; three times a day (lib/town/gifts' USES). Never above the friend's full gauge: what
 *    would be over is not given and not paid for. Refused to a wearer who has not what it costs (`share`). The
 *    friend is told who gave it (`aided`).
 * 5. **Garden fae dust** (a thing): sprinkled on another member's plant that has pests, the plant's dying clock
 *    stops for twelve hours (`diesAt`: it does not die of the pests in that time). It is no cure: the pests are
 *    still there, to be rid by a cure or an insect as ever. Five a day (lib/town/gifts' USES). The plant shows it,
 *    and its owner is told who did it (`aided`), and has them among those to thank at the picking. The deed is
 *    lib/town/farm's `dust`.
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
  /**
   * The bell: the seconds two members' waterings in a bed may be apart, the stamina a plant of them gives back, and
   * how many plants a day give any back to one member (the doubling itself has no such bound: only the stamina, of
   * which this is the one thing in the line that gives some for nothing).
   */
  bell: { within: 10, back: 2, plants: 25 },
  /** The ring: what part of the stamina given its wearer pays, and how many tiles off a friend may stand (the page's to measure: nothing that keeps the game knows where anybody stands; it is told, and holds to it). */
  ring: { part: 0.5, reach: 3 },
  /** The dust: how many sprinklings a plant remembers (each stops its dying clock for the gift's own number of hours). */
  dust: { kept: 12 },
  /** How many of the things friends' gifts did for one are kept in a purse, to be told of (`aided`). */
  told: 8,
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

/**
 * What a bell rang over: the plots it made the more, as they now are; which of them are the ringer's own waterings;
 * each friend's that it doubled now, by who they are; and every friend it rang with (`near`: whoever watered in the
 * bed within the ten seconds, their watering doubled now or already).
 */
export interface Rang { plots: Record<string, Plot>; mine: string[]; pals: Record<string, string[]>; near: string[] }
const tileOf = (key: string) => key.split(",").map(Number);
const byTile = (a: string, b: string) => tileOf(a)[0] - tileOf(b)[0] || tileOf(a)[1] - tileOf(b)[1];
/**
 * The duet bell, as a bed is kept after a watering. `bed` is every plot of the bed as it now is (the plots just
 * watered among them, kept by `pouredAs`), `watered` the plots `me` watered at this moment, `wears` whether `me`
 * wears the bell in a bed that is not their own. It rings when somebody else watered a plant of this bed with a can
 * within the last ten seconds (the plants say: `pour`), and one of the two wore the bell (the other's plant says:
 * `worn`). Then every watering of the two that no bell has rung for yet counts double: what it added is added once
 * more, never past the bound of three with whatever else made it the more, and it is marked (`bell`) so that it is
 * doubled once.
 *
 * `may`: the friends whose purses whoever keeps the game holds (a database holds them before it holds the bed, so
 * that two who ring at once never wait on each other: somebody who came between is rung with at their next watering
 * and not now). Everybody, where nothing is said.
 *
 * Null: no bell rings (nobody to ring with, no bell worn, or nothing of mine to double).
 */
export function ring(bed: Readonly<Record<string, Plot>>, watered: readonly string[], me: string, wears: boolean, now: number, may?: readonly string[] | null): Rang | null {
  const within = HELPING.bell.within * 1000, twice = numberOf("charmBell");
  const fresh = (key: string) => { const p = bed[key]?.plant, m = p?.pour; return p && m && typeof m.at === "number" && m.at === p.watered && now >= m.at && now - m.at <= within ? m : null; };
  const mine = [...watered].filter((k) => { const m = fresh(k); return !!m && m.by === me && !m.bell; }).sort(byTile);
  if (!mine.length) return null;
  const theirs = Object.keys(bed).filter((k) => { const m = fresh(k); return !!m && m.by !== me && (!may || may.includes(m.by)); }).sort(byTile);
  if (!theirs.length || !(wears || theirs.some((k) => bed[k].plant!.pour!.worn === true))) return null;
  const plots: Record<string, Plot> = {}, pals: Record<string, string[]> = {};
  const more = (k: string) => {
    const p = bed[k].plant!, m = p.pour!, x = Math.max(m.x, Math.min(HELPING.most, m.x * twice));
    plots[k] = { ...bed[k], plant: { ...p, boost: p.boost + m.base * (x - m.x), pour: { ...m, x, bell: true } } };
  };
  for (const k of mine) more(k);
  for (const k of theirs) { const m = bed[k].plant!.pour!; if (m.bell) continue; more(k); pals[m.by] = [...(pals[m.by] ?? []), k]; }
  return { plots, mine, pals, near: [...new Set(theirs.map((k) => bed[k].plant!.pour!.by))].sort() };
}
/**
 * What the bell gives back to somebody for so many of their plants it rang over: two stamina a plant, never above
 * the full gauge, and of no more plants in a day than the day's bound (`rung` in the purse: the day, and how many
 * plants have paid back). A plant that gave nothing back (the gauge was full) is not counted.
 */
export function belled<P extends Purse>(purse: P, plants: number, now: number): { purse: P; back: number } {
  const day = dayOf(now), k = purse.rung as { day?: unknown; n?: unknown } | null | undefined;
  const had = k && typeof k === "object" && k.day === day && typeof k.n === "number" && k.n > 0 ? Math.floor(k.n) : 0;
  const n = Math.max(0, Math.min(Math.floor(plants), HELPING.bell.plants - had)), left = staminaOf(purse, now);
  const back = Math.min(n * HELPING.bell.back, Math.max(0, STAMINA.max - left));
  if (!(back > 0)) return { purse, back: 0 };
  return { purse: { ...purse, stamina: { day, left: left + back }, rung: { day, n: had + Math.ceil(back / HELPING.bell.back) } }, back };
}

/**
 * Something a friend's gift did for one, kept in one's own purse to be told of: what it was (a bell that rang with
 * them, strength they shared, dust they sprinkled on a plant of one's own), whose doing and what they are called,
 * when, and how much (plants a bell rang over, stamina given; `back`: the stamina a bell gave back; `key`: the plot).
 */
export interface Aid { what: "bell" | "ring" | "dust"; by: string; name: string; n: number; at: number; back?: number; key?: string }
/** What a purse has of them, the oldest first (nothing, of what is kept wrongly). */
export const aidsOf = (purse: Pick<Purse, "aided">): Aid[] =>
  (Array.isArray(purse.aided) ? (purse.aided as unknown[]).filter((a): a is Aid => !!a && typeof a === "object" && !Array.isArray(a) && typeof (a as Aid).at === "number") : []);
/** A purse told of one more: the newest so many are kept. */
export const aided = <P extends Purse>(purse: P, aid: Aid): P => ({ ...purse, aided: [...aidsOf(purse), aid].slice(-HELPING.told) });

/** Why a gift of this line was not used: not had or not worn, its day's uses gone, the friend too far off, their gauge full already, not the stamina it costs; a plant of one's own, nothing there for it, or its work still running. */
export type HelpRefusal = "none" | "spent" | "far" | "full" | "weak" | "own" | "soil" | "running";
/**
 * The ring of shared strength: `mine` gives `theirs` so much stamina (the ring's number, or what their gauge has room
 * for, if that is less) and pays a part of what was given. `far`: how many tiles off the friend stands, as the page
 * says. Gives both purses (the wearer's with the day's use counted, the friend's told who gave it), what was given
 * and paid, and how many uses the day has left. Refused without the ring worn (`none`), with the day's uses gone
 * (`spent`), to a friend not near (`far`) or whose gauge is full (`full`), and to a wearer who has not what this
 * giving costs (`weak`): then nothing is counted.
 */
export function share<P extends Purse, Q extends Purse>(mine: P, theirs: Q, me: string, name: string, far: number, now: number):
  { ok: true; mine: P; theirs: Q; gave: number; paid: number; left: number } | { ok: false; why: HelpRefusal } {
  if (!works(mine, "charmRing")) return { ok: false, why: "none" };
  if (usesLeft(mine, "charmRing", now) < 1) return { ok: false, why: "spent" };
  if (!(typeof far === "number" && far >= 0 && far <= HELPING.ring.reach)) return { ok: false, why: "far" };
  const has = staminaOf(theirs, now), gave = Math.min(numberOf("charmRing"), STAMINA.max - has);
  if (!(gave > 0)) return { ok: false, why: "full" };
  const paid = gave * HELPING.ring.part, left = staminaOf(mine, now);
  if (left < paid) return { ok: false, why: "weak" };
  const used = useGift(mine, "charmRing", now);
  if (!used.ok) return { ok: false, why: used.why === "spent" ? "spent" : "none" };
  const day = dayOf(now);
  return {
    ok: true, gave, paid, left: used.left, mine: { ...used.purse, stamina: { day, left: left - paid } },
    theirs: aided({ ...theirs, stamina: { day, left: has + gave } }, { what: "ring", by: me, name, n: gave, at: now }),
  };
}

/** The moments fae dust was sprinkled on a plant (nothing, of what is kept wrongly). */
export const dustsOf = (p: Pick<Plant, "dust">): number[] => (Array.isArray(p.dust) ? (p.dust as unknown[]).filter((d): d is number => typeof d === "number") : []);
/** Until when the dust on a plant holds, if it does at a moment. */
export function dustUntil(p: Pick<Plant, "dust">, now: number): number | null {
  const span = numberOf("thingDust") * HOUR, on = dustsOf(p).filter((d) => d <= now && now < d + span);
  return on.length ? Math.max(...on) + span : null;
}
/**
 * The moment a plant dies of a pest that struck it at `struck`, if nothing rids it of it: `kills` milliseconds after,
 * **not counting the time fae dust lay on it** (so many hours from each sprinkling). With no dust: `struck + kills`,
 * as it always was. Past that moment the plant is dead.
 */
export function diesAt(p: Pick<Plant, "dust">, struck: number, kills: number): number {
  const span = numberOf("thingDust") * HOUR, stops = dustsOf(p).filter((d) => d + span > struck).sort((a, b) => a - b);
  let t = struck, left = kills;
  for (const d of stops) {
    const from = Math.max(d, t);
    // (it died before this sprinkling)
    if (from - t > left) break;
    left -= from - t;
    t = Math.max(t, d + span);
  }
  return t + left;
}
