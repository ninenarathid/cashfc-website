import { describe, expect, it } from "vitest";
import { BREEDS, LETTERS, SPECIES_IDS, breedAt, breedOf } from "./animals";
import type { AnimalWorld } from "./animal-act";
import { animalBook, breedPage, breedsFound, specialPage, speciesPages, towardsHabit } from "./animal-book";
import { SPECIAL, SPECIALS } from "./specials";
import { newPurse, type Purse } from "./trade";

const told = (found: AnimalWorld["found"] = {}, specials?: AnimalWorld["specials"]): Pick<AnimalWorld, "found" | "specials"> => ({ found, ...(specials ? { specials } : {}) });
const finds = (f: Record<string, unknown>): Purse => ({ ...newPurse(), animalSpecials: f } as Purse);

describe("the village's animal book", () => {
  it("has every breed a page, four species of eight, in the pasture's order", () => {
    const book = animalBook(told(), newPurse());
    expect(book).toHaveLength(BREEDS.length);
    expect(book.map((p) => p.breed.id)).toEqual(SPECIES_IDS.flatMap((sp) => LETTERS.map((L) => breedAt(sp, L).id)));
    for (const sp of SPECIES_IDS) expect(speciesPages(told(), newPurse(), sp).map((p) => p.breed.letter)).toEqual([...LETTERS]);
  });

  it("opens a starter always, and any other breed once somebody has bred it, with who did first", () => {
    const w = told({ silkie: { by: "pal", at: 5 } });
    const pages = speciesPages(w, newPurse(), "chicken");
    expect(pages.filter((p) => p.seen).map((p) => p.breed.id)).toEqual(["barnHen", "silkie"]);
    expect(pages[0].first).toBeNull();
    expect(pages[1].first).toEqual({ by: "pal", at: 5 });
    expect(pages[2]).toMatchObject({ seen: false, first: null });
  });

  it("does not take a starter as bred because the pasture names it, nor a garbled record as a find", () => {
    const w = told({ barnHen: { by: "pal", at: 1 }, araucana: { by: 7, at: 1 } as unknown as { by: string; at: number }, marans: null as unknown as { by: string; at: number } });
    expect(breedPage(w, newPurse(), breedOf("barnHen")!)).toMatchObject({ seen: true, first: null });
    expect(breedPage(w, newPurse(), breedOf("araucana")!)).toMatchObject({ seen: false, first: null });
    expect(breedPage(w, newPurse(), breedOf("marans")!)).toMatchObject({ seen: false, first: null });
  });

  it("gives a starter no special, and every bred breed its own", () => {
    for (const p of animalBook(told(), newPurse())) {
      if (p.breed.letter === "A") expect(p.special).toBeNull();
      else expect(p.special?.special.breed).toBe(p.breed.id);
    }
    expect(animalBook(told(), newPurse()).filter((p) => p.special)).toHaveLength(SPECIALS.length);
  });

  it("shades a special until the village finds it, then names who found it first, whether or not the breed is mine", () => {
    expect(specialPage(told(), newPurse(), "silkie")).toMatchObject({ first: null, mine: 0, habit: null });
    expect(specialPage(told({}, { silkie: { by: "pal", at: 9 } }), newPurse(), "silkie")?.first).toEqual({ by: "pal", at: 9 });
    // (a database from before v324 tells no specials at all)
    expect(specialPage(told({ silkie: { by: "pal", at: 9 } }), newPurse(), "silkie")?.first).toBeNull();
    expect(specialPage(told(), newPurse(), "barnHen")).toBeNull();
  });

  it("counts my finds and tells the habit at the third, as the pasture's book does", () => {
    const w = told({ silkie: { by: "me", at: 1 } }, { silkie: { by: "me", at: 2 } });
    const two = specialPage(w, finds({ silkie: SPECIAL.reveal - 1 }), "silkie")!;
    expect(two).toMatchObject({ mine: SPECIAL.reveal - 1, habit: null });
    const three = specialPage(w, finds({ silkie: SPECIAL.reveal }), "silkie")!;
    expect(three.habit).toEqual(three.special.habit);
    expect(towardsHabit(specialPage(w, finds({ silkie: 12 }), "silkie")!)).toBe(SPECIAL.reveal);
    // (a purse's count made sound: nothing that is not a number counts)
    expect(specialPage(w, finds({ silkie: "3" }), "silkie")).toMatchObject({ mine: 0, habit: null });
  });

  it("counts the breeds the village has, the starters among them", () => {
    expect(breedsFound(told())).toEqual({ found: SPECIES_IDS.length, all: BREEDS.length });
    expect(breedsFound(told({ silkie: { by: "a", at: 1 }, jersey: { by: "b", at: 2 }, nothing: { by: "c", at: 3 } }))).toEqual({ found: SPECIES_IDS.length + 2, all: BREEDS.length });
  });
});
