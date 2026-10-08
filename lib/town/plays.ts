import type { Gear } from "./gear";
import type { BaitId, BuffId, CatchId } from "./items";
import type { Strike } from "./fishing";

/**
 * A record of every go at a mini-game (the owner, 2026-10-03: "ช่วยเก็บประวัติการ
 * เล่น minigame ทั้งหมดไว้ด้วย เผื่ออนาคตเราจะทำ leader board หรือ ทำสกิลที่เหมาะสมกับคนที่
 * เล่น Mini game นั้นๆถึงจริงๆ"): one line for each go, whatever its end, and a
 * running count that never forgets.
 *
 * - **A play** says what every game has in common (which game, when it ended,
 *   whether it was won, how long it took, whether it was played with no
 *   stamina, under which meal's buff) and the game's own particulars.
 * - **A fishing play** has enough to play its fight again exactly
 *   (lib/town/fishing's replayFight: the seed, and the steps at which the reel
 *   was taken up or let go). That is how the database will check a record one
 *   day: a board of the best is only worth having if a line of it cannot be
 *   made up in the browser.
 * - **The tally** is what a board or a skill would be read from: for each
 *   game, how often and how well; for fishing, each kind hooked and landed.
 *   The log is cut to its newest lines, the tally never.
 *
 * Pure, like the rest of the rules. In the trial both are kept in the browser
 * (lib/town/trial); the shape is the one a table will have.
 */

/** The games there are: fishing, the farm's work, the kitchen's, the boards of the forest and of the net, and the mountain's two (the vein and the felling). */
export type GameId = "fishing" | "farming" | "cooking" | "forest" | "insects" | "mining" | "felling";

interface PlayBase {
  game: GameId;
  /** When it ended, in milliseconds. */
  at: number;
  won: boolean;
  /** How long the part played by hand took, in seconds (a fight; none when it never came to one). */
  secs: number;
  /** Whether it was played with no stamina left, and under which meal's buff. */
  spent: boolean;
  buff: BuffId | null;
}

/** How a line that was dropped ended: a fish (or what is no fish) landed; the line snapped or the hook slipped in the fight; a strike too soon, or none in time; or the rod put away with the line still out. */
export type FishingEnd = "landed" | "snapped" | "slipped" | "early" | "missed" | "left";
export interface FishingPlay extends PlayBase {
  game: "fishing";
  how: FishingEnd;
  /** Where the line was dropped from: the deck (deep water) or the bank (shallow), and the tile stood on. */
  place: "deck" | "bank";
  tile: [number, number];
  bait: BaitId;
  /** The hour in Bangkok, and whether it rained. */
  hour: number;
  rain: boolean;
  /** What took the bait (whether or not it was ever seen), how long it is, how long it took to bite, and how often it nibbled first. */
  what: CatchId;
  size: number;
  wait: number;
  nibbles: number;
  /** Seconds from the bite to the strike (before the bite, below nothing); null when no strike came. And what the strike was worth. */
  reaction: number | null;
  strike: Strike | null;
  /** The gear it was fished with (lib/town/gear): the rod, and what it and the tackle multiplied. */
  gear: Gear;
  /** The fight, when it came to one: its seed, the steps at which the reel was taken up and let go in turn, how many steps it ran, and the share of them the tension was in the safe stretch. */
  fight: { seed: number; holds: number[]; steps: number; inBand: number } | null;
  /** Whether what was landed went into the bag (there was room), and whether it was the longest of its kind yet. */
  kept: boolean;
  record: boolean;
}
/**
 * A go at work done by the game of timing (lib/town/timing): hoeing a plot, cooking a dish. What was
 * worked at (a plot's deed, a dish), how many hits it wanted, and the hits and misses it took.
 */
export interface WorkPlay extends PlayBase {
  game: Exclude<GameId, "fishing">;
  what: string;
  need: number;
  hits: number;
  misses: number;
  /** Which board it was played on (weeding, timing, pouring, steady, a row, a sweep, a long pour, handing, stirring, roasting, choosing, digging, catching, the net); none where the work had no board. */
  board?: string;
  /**
   * How the go ended, when `won` does not say it all: the work came off, the board was lost (tired hands dropped it,
   * a throw was not caught, an insect fled), or the member closed the board. Left out, it is done when won and
   * dropped when not.
   */
  how?: WorkEnd;
}
/** How a go at a board ended. */
export type WorkEnd = "done" | "dropped" | "left";
/** A go at a board's end, said whole: what a play leaves unsaid is read off whether it was won. */
export const endOf = (play: WorkPlay): WorkEnd => play.how ?? (play.won ? "done" : "dropped");
export type Play = FishingPlay | WorkPlay;

/** How many of the newest plays the log keeps. */
export const KEPT = 1000;
/** The log with one more play at its end, cut to its newest. */
export function keep(log: Play[], play: Play, most = KEPT): Play[] {
  const all = [...log, play];
  return all.length > most ? all.slice(all.length - most) : all;
}

export interface Tally {
  /** Each game: how many goes, how many won, the seconds played by hand, how many with no stamina, and when the first and the last were. */
  games: Partial<Record<GameId, { plays: number; won: number; secs: number; spent: number; first: number; last: number }>>;
  fishing: {
    /** How each go ended, and what each strike was worth. */
    ends: Partial<Record<FishingEnd, number>>;
    strikes: Partial<Record<Strike, number>>;
    /** Each thing that took a hook: how often it was hooked (the strike came in time), how often landed, and the longest landed. */
    caught: Partial<Record<CatchId, { hooked: number; landed: number; longest: number }>>;
    /** How many were dropped from the deck, and from the bank. */
    places: { deck: number; bank: number };
  };
}
export const newTally = (): Tally => ({ games: {}, fishing: { ends: {}, strikes: {}, caught: {}, places: { deck: 0, bank: 0 } } });

/** The tally with one more play counted. */
export function count(tally: Tally, play: Play): Tally {
  const g = tally.games[play.game] ?? { plays: 0, won: 0, secs: 0, spent: 0, first: play.at, last: play.at };
  const games = {
    ...tally.games,
    [play.game]: {
      plays: g.plays + 1, won: g.won + (play.won ? 1 : 0), secs: Math.round((g.secs + play.secs) * 10) / 10, spent: g.spent + (play.spent ? 1 : 0),
      first: Math.min(g.first, play.at), last: Math.max(g.last, play.at),
    },
  };
  if (play.game !== "fishing") return { ...tally, games };
  const f = tally.fishing, hooked = play.strike !== null;
  const was = f.caught[play.what] ?? { hooked: 0, landed: 0, longest: 0 }, landed = play.how === "landed";
  return {
    games,
    fishing: {
      ends: { ...f.ends, [play.how]: (f.ends[play.how] ?? 0) + 1 },
      strikes: play.strike ? { ...f.strikes, [play.strike]: (f.strikes[play.strike] ?? 0) + 1 } : f.strikes,
      caught: hooked
        ? { ...f.caught, [play.what]: { hooked: was.hooked + 1, landed: was.landed + (landed ? 1 : 0), longest: landed ? Math.max(was.longest, play.size) : was.longest } }
        : f.caught,
      places: { ...f.places, [play.place]: f.places[play.place] + 1 },
    },
  };
}

/** A tally counted afresh from a log (what is kept beside the log is the same thing, as long as the log is whole). */
export const tallyOf = (log: Play[]): Tally => log.reduce(count, newTally());
