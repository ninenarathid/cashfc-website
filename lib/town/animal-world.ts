import type { Animal, Herd } from "./animals";
import type { AnimalWorld, Spell, WagonRun } from "./animal-act";
import { BREED } from "./animals";

/**
 * The pasture's world as the page holds it (docs/plans/animals/README.md, "The contract between the page and the
 * database"): on a look the database tells it whole; on any other step only what the step touched, which is laid
 * over what is held here. Pure, so that the keeper's merging can be tested by itself.
 *
 * A part: `{ animals: <the animals the step touched or added>, removed: [ids], herds: [mine], gate, spells, wagons, found }`.
 * Whatever a part leaves out is kept as it was. An animal of a breed this page was built before is left out: it
 * could not be drawn.
 */
export const EMPTY_WORLD: AnimalWorld = { animals: [], herds: [], gate: [], found: {}, spells: [], wagons: [] };

const isAnimal = (a: unknown): a is Animal => !!a && typeof a === "object" && typeof (a as Animal).id === "string" && typeof (a as Animal).owner === "string" && BREED.has((a as Animal).breed);
const isHerd = (h: unknown): h is Herd => !!h && typeof h === "object" && typeof (h as Herd).owner === "string";

/** `held` with a told world (or a part of one) laid over it; `held` null: the told world is the whole of it. */
export function mergeAnimals(held: AnimalWorld | null, told: Record<string, unknown>): AnimalWorld {
  const base = held ?? EMPTY_WORLD;
  const animals = Array.isArray(told.animals) ? (told.animals as unknown[]).filter(isAnimal) : null;
  const removed = new Set(Array.isArray(told.removed) ? (told.removed as unknown[]).filter((x): x is string => typeof x === "string") : []);
  let list: Animal[];
  if (!held) list = animals ?? [];
  else {
    const byId = new Map(base.animals.map((a) => [a.id, a]));
    for (const a of animals ?? []) byId.set(a.id, a);
    list = [...byId.values()];
  }
  list = list.filter((a) => !removed.has(a.id));
  const herdsTold = Array.isArray(told.herds) ? (told.herds as unknown[]).filter(isHerd) : null;
  const herds = !held ? herdsTold ?? [] : herdsTold ? [...base.herds.filter((h) => !herdsTold.some((x) => x.owner === h.owner)), ...herdsTold] : base.herds;
  return {
    animals: list,
    herds,
    gate: Array.isArray(told.gate) ? (told.gate as AnimalWorld["gate"]) : base.gate,
    found: told.found && typeof told.found === "object" && !Array.isArray(told.found) ? (told.found as AnimalWorld["found"]) : base.found,
    spells: Array.isArray(told.spells) ? (told.spells as Spell[]) : base.spells,
    wagons: Array.isArray(told.wagons) ? (told.wagons as WagonRun[]) : base.wagons,
  };
}
