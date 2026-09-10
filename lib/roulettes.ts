import data from "@/data/roulettes.json";

/**
 * The Duty Roulettes, in the order the Duty Finder lists them.
 *
 * Read from the game's own sheet by scripts/fetch-roulettes.mjs rather than
 * typed out, the same as the dungeons and the treasure maps: a hand-written
 * list is wrong the week a patch lands.
 */

export interface Roulette {
  /** The ContentRoulette row, which is release order. */
  id: number;
  /** What people call it: "Expert", "Leveling". */
  name: string;
  /** What the game calls it in full. */
  full: string;
}

export const ROULETTES: Roulette[] = (data as { roulettes: Roulette[] }).roulettes;

/**
 * When the day turns over, in the FC's own clock.
 *
 * The reset is 15:00 UTC; Bangkok is UTC+7 all year, so it is ten at night
 * here and never moves. Worth saying on the form, because "shall we do
 * roulettes tonight" is a question about which side of ten it is — a party at
 * half past nine and a party at half past ten are on different days' rewards.
 */
export const RESETS_AT: string = (data as { resets_at: string }).resets_at;

const BY_NAME = new Set(ROULETTES.map((r) => r.name));

/** Only names the game still has, so a retired roulette cannot linger on a listing. */
export const knownRoulettes = (picked: string[] | undefined): string[] =>
  (picked ?? []).filter((n) => BY_NAME.has(n));
