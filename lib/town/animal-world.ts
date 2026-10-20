import type { Animal, Herd } from "./animals";
import type { Ask, AnimalWorld, Offer, Spell, WagonRun } from "./animal-act";
import { ANIMALS, BREED } from "./animals";

/**
 * The pasture's world as the page holds it (docs/plans/animals/README.md, "The contract between the page and the
 * database"): on a look the database tells it whole; on any other step only what the step touched, which is laid
 * over what is held here. Pure, so that the keeper's merging can be tested by itself.
 *
 * A part: `{ animals: <the animals the step touched or added>, removed: [ids], herds: [those touched], spells, wagons,
 * found, offers, asks }`. Whatever a part leaves out is kept as it was. An animal of a breed this page was built before
 * is left out: it could not be drawn.
 */
export const EMPTY_WORLD: AnimalWorld = { animals: [], herds: [], found: {}, spells: [], wagons: [], offers: [], asks: [] };

const isAnimal = (a: unknown): a is Animal => !!a && typeof a === "object" && typeof (a as Animal).id === "string" && typeof (a as Animal).owner === "string" && BREED.has((a as Animal).breed);
const isHerd = (h: unknown): h is Herd => !!h && typeof h === "object" && typeof (h as Herd).owner === "string";
/** An animal as told, made whole (a sex, a home and stats, whatever was left out). */
export const soundAnimal = (a: Animal): Animal => ({
  ...a, home: a.home === "pen" ? "pen" : "barn", sex: a.sex === "m" ? "m" : "f", streak: Number(a.streak) || 0,
  stats: a.stats && typeof a.stats === "object" ? a.stats : { thrift: ANIMALS.stats.min, gentle: ANIMALS.stats.min, vigor: ANIMALS.stats.min },
});
/** A herd as told, made whole. */
export const soundHerd = (h: Herd): Herd => ({
  ...h, barn: typeof h.barn === "number" ? h.barn : null, room: Number(h.room) || ANIMALS.barns.stages[0].room, door: Array.isArray(h.door) ? h.door : [],
  credit: Number(h.credit) || 0, lastCare: Number(h.lastCare) || 0, facade: Number(h.facade) || 0, care: h.care ?? "named", carers: Array.isArray(h.carers) ? h.carers : [],
});

/** `held` with a told world (or a part of one) laid over it; `held` null: the told world is the whole of it. */
export function mergeAnimals(held: AnimalWorld | null, told: Record<string, unknown>): AnimalWorld {
  const base = held ?? EMPTY_WORLD;
  const animals = Array.isArray(told.animals) ? (told.animals as unknown[]).filter(isAnimal).map(soundAnimal) : null;
  const removed = new Set(Array.isArray(told.removed) ? (told.removed as unknown[]).filter((x): x is string => typeof x === "string") : []);
  let list: Animal[];
  if (!held) list = animals ?? [];
  else {
    const byId = new Map(base.animals.map((a) => [a.id, a]));
    for (const a of animals ?? []) byId.set(a.id, a);
    list = [...byId.values()];
  }
  list = list.filter((a) => !removed.has(a.id));
  const herdsTold = Array.isArray(told.herds) ? (told.herds as unknown[]).filter(isHerd).map(soundHerd) : null;
  const herds = !held ? herdsTold ?? [] : herdsTold ? [...base.herds.filter((h) => !herdsTold.some((x) => x.owner === h.owner)), ...herdsTold] : base.herds;
  return {
    animals: list,
    herds,
    found: told.found && typeof told.found === "object" && !Array.isArray(told.found) ? (told.found as AnimalWorld["found"]) : base.found,
    spells: Array.isArray(told.spells) ? (told.spells as Spell[]) : base.spells,
    wagons: Array.isArray(told.wagons) ? (told.wagons as WagonRun[]) : base.wagons,
    offers: Array.isArray(told.offers) ? (told.offers as Offer[]) : base.offers ?? [],
    asks: Array.isArray(told.asks) ? (told.asks as Ask[]) : base.asks ?? [],
  };
}
