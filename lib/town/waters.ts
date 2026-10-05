import type { Plot } from "./farm";
import { SIGNS, moonAge } from "./fishing";
import { HEAT, hotAt } from "./heat";
import { BANGKOK, DAY, HOUR } from "./trade";
import type { Sky } from "./weather";

/**
 * Waters that differ (the owner, 2026-10-05, of the members who carry water
 * for the others: "waters that differ: dawn, rain, a full moon … nothing
 * told, the well changes its look", one of nine things thought of for them,
 * "ชอบทุกข้อเลยครับ"; and his rule for the town: keep things secret, and
 * leave a way to feel towards the answer).
 *
 * Water is not all one water. **What is drawn at certain moments has a
 * nature**: the dew's, in the first two hours of the day; the rain's, while
 * it rains; the moon's, on a night when the moon is full. Carried to the
 * farm and poured into the well, **it gives the well its nature for a
 * while** (half an hour a bucketful, two hours at the most; another nature
 * poured in takes its place; plain water changes nothing). And **while the
 * well has a nature, every watering on the farm has it**:
 *
 * - the dew's: a watering does as much again;
 * - the rain's: half as much again;
 * - the moon's: the plant is kept from pests for twelve hours.
 *
 * So a carrier who is up at dawn, or out in the rain, or about on the right
 * night, brings the whole farm something no can holds, and the well's book
 * says whose doing it is. Nothing says what each water does, nor when it is
 * to be had: the well looks otherwise while it has one (components/town/
 * TownFarm), a bucket of it is named for what it is, and the rest is for the
 * village to find out and tell each other.
 *
 * Not built: the forest's spring (water can be drawn only at the river, and
 * that is the game's own rule to change).
 *
 * Pure. The database does the same (v133): the nature of a bucket drawn is
 * worked out as its line of the deeds is read, the well's as one is poured,
 * and a watering's as its plot is kept (the trigger that keeps the heat).
 */
export type Nature = "dawn" | "rain" | "moon";
export const NATURES: Nature[] = ["dawn", "rain", "moon"];
export const WATERS = {
  /** The dew: the hours of the morning (Bangkok) it is drawn in, from the first up to the second. */
  dawn: [5, 7] as [number, number],
  /** The moon's: the hours of the night it is drawn in (from the first, through midnight, up to the second), on a night when the moon is full as the fish know it (lib/town/fishing's sign: give or take a day and a half). */
  night: [19, 5] as [number, number],
  /** How many minutes the well keeps a nature for each bucketful of it poured in, and at most. */
  lasts: 30,
  most: 120,
  /** What a watering has more while the well has each nature: so many times what it added, on top. */
  adds: { dawn: 1, rain: 0.5, moon: 0 } as Record<Nature, number>,
  /** …and the hours a plant watered then is kept from pests. */
  guards: { dawn: 0, rain: 0, moon: 12 } as Record<Nature, number>,
};
/** What each is called, on the bucket that has it and in the well's book. */
export const NATURE_NAMES: Record<Nature, [th: string, en: string]> = { dawn: ["น้ำค้างยามเช้า", "Dew water"], rain: ["น้ำฝน", "Rain water"], moon: ["น้ำใต้แสงจันทร์", "Moon water"] };

/** The moon's month, in days (lib/town/fishing's own: by its mean month). */
const MONTH = 29.530588853;
const hourOf = (now: number) => Math.floor((((now + BANGKOK) % DAY) + DAY) % DAY / HOUR);
/** The nature of water drawn at a moment: the rain's while it rains, whatever the hour; else the dew's in the early morning; else the moon's on a night the moon is full; else none. */
export function natureAt(now: number, raining: boolean): Nature | null {
  if (raining) return "rain";
  const h = hourOf(now);
  if (h >= WATERS.dawn[0] && h < WATERS.dawn[1]) return "dawn";
  if ((h >= WATERS.night[0] || h < WATERS.night[1]) && Math.abs(moonAge(now) - MONTH / 2) <= SIGNS.moon) return "moon";
  return null;
}

/** The well's water when it has a nature: which, until when, and who brought it (the last to pour some of it in). */
export interface WellWater { kind: Nature; until: number; by: string }
/** The nature the well has at a moment, if any. */
export const natureOf = (w: WellWater | null | undefined, now: number): Nature | null => (w && w.until > now ? w.kind : null);
/**
 * The well after so many bucketfuls of a nature (or of none) are poured in at a moment: plain water changes nothing;
 * more of the nature it has keeps it longer, to the most from now; another takes its place.
 */
export function pouredIn(was: WellWater | null | undefined, kind: Nature | null | undefined, n: number, by: string, now: number): WellWater | null {
  const has = was && was.until > now ? was : null;
  if (!kind || !(n > 0)) return has;
  const from = has && has.kind === kind ? has.until : now;
  return { kind, by, until: Math.min(now + WATERS.most * 60_000, from + n * WATERS.lasts * 60_000) };
}

/**
 * A plot as it is kept, written at `now` over what it `was`: when what was written is a watering (the same plant,
 * watered at this moment and not before), what it added is added again for the heat (lib/town/heat) and for the
 * well's nature, and under the moon's the plant is kept from pests. The heat's own `warmed` is this with no nature.
 */
export function keptAs(was: Plot | undefined, next: Plot, now: number, sky: Sky | null | undefined, kind: Nature | null | undefined): Plot {
  const a = was?.plant, b = next.plant;
  if (!a || !b || a.sown !== b.sown || b.watered !== now || a.watered >= now) return next;
  const added = b.boost - a.boost;
  if (!(added > 0)) return next;
  const more = (hotAt(now, sky) ? HEAT.by : 0) + (kind ? WATERS.adds[kind] : 0);
  const guard = kind && WATERS.guards[kind] ? Math.max(b.guard, now + WATERS.guards[kind] * HOUR) : b.guard;
  if (!more && guard === b.guard) return next;
  return { ...next, plant: { ...b, boost: more ? b.boost + added * more : b.boost, guard } };
}
