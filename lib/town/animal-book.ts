/**
 * **The village's animal book** (the owner, 2026-11-10: "จะมีสมุดสายเลี้ยงสัตว์ไหม", then "ทำเลย"): every breed a page, read
 * by the pasture's own book (TownAnimals' "สมุด" tab) and by the bag's (TownAnimalBook), so that both tell the same.
 *
 * A breed's page is open once somebody in the village has bred it (the pasture's `found`; a starter, A, always is), with
 * who bred it first. A bred breed (B to H) has a special (lib/town/specials): in shadow until somebody in the village has
 * found it (the pasture's `specials`), then with who found it first; how many times I have found it (my purse's
 * `animalSpecials`); its habit's kind from the start, and the habit itself once I have found its special `SPECIAL.reveal`
 * times. Nothing here reads a step's offering: that is the pasture's book's, and the scroll's.
 */
import { BREEDS, LETTERS, SPECIES_IDS, breedAt, type Breed, type SpeciesId } from "./animals";
import { specialsFoundOf, type AnimalWorld } from "./animal-act";
import { SPECIAL, knowsHabit, specialOf, type Habit, type Special } from "./specials";
import type { Purse } from "./trade";

/** Who did something first, and when (the pasture's own record). */
export interface First { by: string; at: number }
/** What the book tells of a bred breed's special. */
export interface SpecialPage {
  special: Special;
  /** Who in the village found it first: null while nobody has (its picture is a shadow). */
  first: First | null;
  /** How many times I have found it. */
  mine: number;
  /** Its habit, once I have found it `SPECIAL.reveal` times; else null (only its kind is told). */
  habit: Habit | null;
}
export interface BreedPage {
  breed: Breed;
  /** Whether the village has it: a starter always, any other once somebody has bred it. */
  seen: boolean;
  /** Who bred it first: null for a starter, and for one nobody has bred. */
  first: First | null;
  /** Its special: none for a starter. */
  special: SpecialPage | null;
}

type Told = Pick<AnimalWorld, "found" | "specials">;
const firstOf = (x: unknown): First | null =>
  x && typeof x === "object" && typeof (x as First).by === "string" && typeof (x as First).at === "number" ? { by: (x as First).by, at: (x as First).at } : null;

/** A bred breed's special as the book tells it to me (null for a starter). */
export function specialPage(world: Told, purse: Purse, breed: string): SpecialPage | null {
  const special = specialOf(breed);
  if (!special) return null;
  const found = specialsFoundOf(purse);
  return { special, first: firstOf(world.specials?.[breed]), mine: found[breed] ?? 0, habit: knowsHabit(found, breed) ? special.habit : null };
}

/** A breed's page. */
export function breedPage(world: Told, purse: Purse, breed: Breed): BreedPage {
  const first = breed.letter === "A" ? null : firstOf(world.found[breed.id]);
  return { breed, seen: breed.letter === "A" || !!first, first, special: specialPage(world, purse, breed.id) };
}

/** A species' eight pages, A to H. */
export const speciesPages = (world: Told, purse: Purse, species: SpeciesId): BreedPage[] =>
  LETTERS.map((L) => breedPage(world, purse, breedAt(species, L)));

/** Every page of the book, a species after another in the pasture's order, each A to H. */
export const animalBook = (world: Told, purse: Purse): BreedPage[] => SPECIES_IDS.flatMap((sp) => speciesPages(world, purse, sp));

/** How many breeds the village has, of how many there are (the starters counted). */
export function breedsFound(world: Told): { found: number; all: number } {
  return { found: BREEDS.filter((b) => b.letter === "A" || !!firstOf(world.found[b.id])).length, all: BREEDS.length };
}

/** How many of my finds of a special the book counts towards its habit (it shows "n of three", never past three). */
export const towardsHabit = (p: SpecialPage) => Math.min(p.mine, SPECIAL.reveal);
