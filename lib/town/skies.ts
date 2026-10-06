import { ALWAYS_RAIN, DRY, FINE, SLOT_MS, effectsAt, effectsOf, isWet, rainingAt, rainsOf, slotOf, type Effects, type Rain, type Sky, type Weather } from "./weather";

/**
 * The town's weather as this page has it (lib/town/weather: "the weather as
 * everybody has it"). The database keeps it in quarter hours; the map asks
 * for them (`town_sky`), and what is drawn, whether it rains and how much
 * rain a plot has had are worked out from what is kept here and the
 * database's clock. One for the page: the map fills it and draws from it, and
 * whoever keeps the game reads the rain from it (lib/town/keeper).
 *
 * Three states besides: before the database has answered there is no weather
 * (fine weather is drawn); where the database has no weather to give yet (the
 * migration not run, or nobody to write it), the page holds the one answer
 * the old way gives, as it always did; and `next dev`'s ?townWeather= forces
 * one weather, with rain without end when it is a wet one.
 */
const SKY_WORDS: Sky[] = ["clear", "cloudy", "fog", "drizzle", "rain", "storm"];
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export class Skies {
  private slots = new Map<number, Weather>();
  private wet = new Set<number>();
  private rains_: readonly Rain[] = DRY;
  private skew = 0;
  private one: Weather | null = null;
  private forced = false;
  /** The newest slot kept. */
  private newest = -Infinity;

  /** The database's clock, as near as this page knows it. */
  now(): number { return Date.now() + this.skew; }
  /** Whether the database's weather is kept here for a moment. */
  knows(ms = this.now()): boolean { return this.slots.has(slotOf(ms)); }
  /** Whether the slots kept reach so many minutes past now: when they do not, the next ones are due to be written. */
  reaches(minutes: number): boolean { return this.newest * SLOT_MS + SLOT_MS > this.now() + minutes * 60_000; }
  /** What to ask the database for next: everything from so many days back the first time, then only what is new. */
  since(days: number): number { return this.newest === -Infinity ? this.now() - days * 86_400_000 : (this.newest - 8) * SLOT_MS; }

  /**
   * Keep what `town_sky` answered: its clock, the slots it gave (each `[slot, sky, wind, gust, rain]`), and the
   * wet slots since the moment asked from. A slot once kept is never changed (the database's are not), so answers
   * may come in any order. Says whether anything of it was taken.
   */
  take(answer: unknown, sent: number): boolean {
    const a = answer as { now?: unknown; slots?: unknown; wet?: unknown } | null;
    if (this.forced || !a || typeof a !== "object" || !fin(a.now) || !Array.isArray(a.slots)) return false;
    this.skew = a.now - (sent + Date.now()) / 2;
    for (const row of a.slots) {
      if (!Array.isArray(row)) continue;
      const [slot, sky, wind, gust, rain] = row as unknown[];
      if (!fin(slot) || !Number.isInteger(slot) || typeof sky !== "string" || !SKY_WORDS.includes(sky as Sky) || !fin(wind) || !fin(gust) || !fin(rain) || this.slots.has(slot)) continue;
      this.slots.set(slot, { sky: sky as Sky, wind, gust, rain });
      if (isWet(sky as Sky)) this.wet.add(slot);
      this.newest = Math.max(this.newest, slot);
    }
    if (Array.isArray(a.wet)) for (const slot of a.wet) if (fin(slot) && Number.isInteger(slot)) this.wet.add(slot);
    this.rains_ = rainsOf(this.wet);
    // (what the page has no more use for: slots more than a day old; their rain is kept)
    for (const slot of this.slots.keys()) if (slot < slotOf(this.now()) - 96) this.slots.delete(slot);
    this.one = null;
    return true;
  }
  /** Hold one weather, where the database has none to give: as the town did before. */
  hold(w: Weather | null) { if (!this.forced && !this.slots.size) this.one = w; }
  /** `next dev` only: one weather, whatever the database says. */
  force(w: Weather) { this.one = w; this.forced = true; this.rains_ = isWet(w.sky) ? ALWAYS_RAIN : DRY; }
  /**
   * `next dev` only: the quarter hours from this one on, each as it is told and the last of them for all that follow
   * (two days of them), whatever the database says: a sky that changes, for what looks ahead (the rain frog's,
   * lib/town/well-gifts). `from`: the quarter hour the first is (this one, by this machine's clock).
   */
  forceAhead(list: readonly Weather[], from = slotOf(Date.now())) {
    if (!list.length) return;
    this.forced = true;
    this.one = null;
    this.skew = 0;
    this.slots = new Map();
    this.wet = new Set();
    for (let i = -8; i < 192; i++) {
      const w = list[Math.max(0, Math.min(list.length - 1, i))];
      this.slots.set(from + i, w);
      if (isWet(w.sky)) this.wet.add(from + i);
    }
    this.newest = from + 191;
    this.rains_ = rainsOf(this.wet);
  }

  /** The weather at a moment. */
  weather(ms = this.now()): Weather { return this.one ?? this.slots.get(slotOf(ms)) ?? FINE; }
  /** The sky at a moment, when it is known: the one held or forced, or that quarter hour's as the database has it. Null when neither is (what is drawn then is fine weather; what hangs on the sky does not happen). */
  sky(ms = this.now()): Sky | null { return (this.one ?? this.slots.get(slotOf(ms)))?.sky ?? null; }
  /** What the town draws at a moment. */
  effects(ms = this.now()): Effects { return this.one ? effectsOf(this.one) : effectsAt(this.slots, ms); }
  /** The stretches of rain known: what waters the plots. (None from a weather that is only held: the database counts none either.) */
  rains(): readonly Rain[] { return this.rains_; }
  /** Whether it rains at a moment, as the database has it. */
  raining(ms = this.now()): boolean { return rainingAt(this.rains_, ms); }
}

/** The page's own. */
export const SKIES = new Skies();
