import { KINDS } from "./forest";
import { BUGS } from "./insects";
import { CROPS, DISHES, FISH, ITEMS, MAKES, type CropId, type DishId, type FishId, type ItemId } from "./items";
import { countedOn, type LineId } from "./lines";

/**
 * What counts for the points of a line (lib/town/lines), read off what is written down anyway: a deed (the
 * database's `town_deeds`) or a go at a game (`town_plays`). One rule for the browser's trial and for the database,
 * which is held to it; and since both logs have been kept since the game opened, the same rule counts what was done
 * before there were lines (the owner: "นับย้อนหลังด้วย").
 *
 * - **Kitchen**: a pot of a real recipe is worth the helpings its recipe gives (something else that is made, one);
 *   the odd dish nothing. The same dish counts three pots a day. A helping somebody else ladles from one's pot is
 *   one more, to whoever set it down: of one person's ladling, nine a day (what one can eat). The owner took this
 *   blend ("ใช้แบบผสมตามตาราง").
 * - **Helpers**: only on other people's plants and beds: a watering 1, clearing or tilling 2, feeding 2, a pest
 *   cured 5; and a thanks received 3.
 * - **Fishing**: a fish landed, by how rare it is: 1, 3, 8, 30.
 * - **Forest**: what is picked up 1, chosen or shaken down 2, dug 3; ten more for a rare thing on a day of its own.
 * - **Insects**: one in plain sight 1, one caught by its own way 3, a rare one or a beetle 8.
 * - **Farming**: a picking of a plant one sowed, a point for every twelve hours its crop takes (one at the least).
 * - **The first of its kind** (a fish, a forest thing, an insect, a crop, a recipe) is ten more, once ever.
 * - **The well** is not here: its count is the bucketfuls poured, which the well's own book keeps (lib/town/well).
 *
 * The numbers are knobs (mine, to be set from what the members really do before the lines open). A day's bound is
 * the line's own (lib/town/lines' `countedOn`).
 */
export const POINTS = {
  first: 10,
  kitchen: { made: 1, ladled: 1, pots: 3, ladling: 9 },
  helpers: { water: 1, clear: 2, till: 2, feed: 2, cure: 5, thanked: 3 } as Record<string, number>,
  fishing: { common: 1, uncommon: 3, rare: 8, legend: 30 } as Record<string, number>,
  forest: { pick: 1, choose: 2, shake: 2, dig: 3, rare: 10 } as Record<string, number>,
  /** An insect is rare when the relatives pay so much for it, or it is lured (the beetles). */
  insects: { plain: 1, way: 3, rare: 8, pays: 20 },
  farming: { every: 12 },
};

/** Something done, as it is written down: a deed, or a go at a game. */
export interface Done {
  from: "deed" | "play";
  /** A deed's `what`; a go's game. */
  what: string;
  /** What it was done with or to: a deed's thing; what a go came to (a fish, a dish). */
  thing: string | null;
  n: number;
  /** A go: whether it was won. */
  won?: boolean;
  /** A deed's own particulars: `whose` plant or pot it was when not the doer's, `owner` of the bed for a hoe's work in another's, `how` a forest thing was had, `to` whom thanks went. */
  doc: Record<string, unknown>;
}
/**
 * What something done counts for: whose points (`to`: null for the doer's own), on which line, how many before the
 * day's bound; the key of the kind it may be the first of; and, where a day holds a thing to so many, the key it is
 * counted under and the most.
 */
export interface Counts { to: string | null; line: LineId; raw: number; first?: string; held?: { key: string; most: number } }

/** The forest's things that have a day of their own: the rare ones. */
const RARE_WILD = new Set<string>(Object.values(KINDS).flatMap((k) => k.finds.filter((f) => "day" in f && f.day).map((f) => f.item)));
/** What an insect is worth, by how it is caught. */
function bugPoints(id: string): number {
  const b = BUGS[id as keyof typeof BUGS];
  if (!b) return 0;
  if (b.habit === "lure" || (ITEMS[id as ItemId]?.pays ?? 0) >= POINTS.insects.pays) return POINTS.insects.rare;
  return b.habit === "path" || b.habit === "crawl" ? POINTS.insects.plain : POINTS.insects.way;
}

/** What something done counts for, on every line it counts on: nothing, for most of what is done. `doer` is who did it. */
export function countsOf(d: Done, doer: string): Counts[] {
  const thing = d.thing ?? "", other = (d.doc.whose ?? d.doc.owner) as string | undefined;
  if (d.from === "play") {
    if (!d.won) return [];
    if (d.what === "fishing") {
      const tier = FISH[thing as FishId]?.tier;
      return tier ? [{ to: null, line: "fishing", raw: POINTS.fishing[tier] ?? 0, first: `fishing:${thing}` }] : [];
    }
    if (d.what === "cooking") {
      const serves = DISHES[thing as DishId]?.recipe?.serves, raw = serves ?? (MAKES[thing as ItemId] ? POINTS.kitchen.made : 0);
      return raw ? [{ to: null, line: "kitchen", raw, first: `kitchen:${thing}`, held: { key: `pot:${thing}`, most: POINTS.kitchen.pots } }] : [];
    }
    return [];
  }
  switch (d.what) {
    case "ladle":
      // (out of somebody else's pot: a point to whoever set it down)
      return typeof d.doc.whose === "string" && d.doc.whose !== doer
        ? [{ to: d.doc.whose, line: "kitchen", raw: POINTS.kitchen.ladled, held: { key: `ladle:${doer}`, most: POINTS.kitchen.ladling } }] : [];
    case "water": case "clear": case "till": case "feed": case "cure":
      return other && other !== doer ? [{ to: null, line: "helpers", raw: POINTS.helpers[d.what] }] : [];
    case "thank":
      return (Array.isArray(d.doc.to) ? d.doc.to : []).filter((id): id is string => typeof id === "string" && id !== doer)
        .map((id) => ({ to: id, line: "helpers" as const, raw: POINTS.helpers.thanked }));
    case "gather": {
      const how = POINTS.forest[String(d.doc.how ?? "")];
      return how ? [{ to: null, line: "forest", raw: how + (RARE_WILD.has(thing) ? POINTS.forest.rare : 0), first: `forest:${thing}` }] : [];
    }
    case "net": {
      const raw = bugPoints(thing);
      return raw ? [{ to: null, line: "insects", raw, first: `insects:${thing}` }] : [];
    }
    case "pick": {
      // (a plant one sowed: a picking of somebody else's plant is no farming of one's own, and is nobody's help either)
      const hours = CROPS[thing as CropId]?.hours;
      return hours && !other ? [{ to: null, line: "farming", raw: Math.max(1, Math.floor(hours / POINTS.farming.every)), first: `farming:${thing}` }] : [];
    }
    default:
      return [];
  }
}

/**
 * Where somebody stands on a line, as it is kept: their points, all told; the day they were last counted on, with
 * what that day's deeds were worth before the bound (`today`) and how many times each thing a day holds to so many
 * has counted (`held`); and the kinds they have had the first of.
 */
export interface LineKept { points: number; day: number; today: number; held: Record<string, number>; firsts: string[] }
export const newLine = (): LineKept => ({ points: 0, day: -1, today: 0, held: {}, firsts: [] });

/**
 * A line with one more thing counted on it, on a day: a new day begins its bound and its holds anew; a thing a day
 * holds to so many counts nothing past them; the first of a kind is ten more, once; and what it comes to is counted
 * by the day's bound (in full up to it, a quarter past).
 */
export function count(kept: LineKept, c: Counts, day: number): LineKept {
  const on = kept.day === day ? kept : { ...kept, day, today: 0, held: {} };
  let raw = Math.max(0, c.raw), held = on.held, firsts = on.firsts;
  if (c.held) {
    const had = held[c.held.key] ?? 0;
    if (had >= c.held.most) raw = 0; else held = { ...held, [c.held.key]: had + 1 };
  }
  if (c.first && !firsts.includes(c.first)) { raw += POINTS.first; firsts = [...firsts, c.first]; }
  if (raw <= 0) return held === on.held && firsts === on.firsts ? on : { ...on, held, firsts };
  return { points: on.points + countedOn(c.line, on.today, raw), day, today: on.today + raw, held, firsts };
}
