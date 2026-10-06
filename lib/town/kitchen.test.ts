import { describe, expect, it } from "vitest";
import { toldOf } from "./hints";
import { ITEMS, type ItemId } from "./items";
import { NOTES, SHELVES, cookwareIn, guessesAt, keepNote, linesAt, pantry, readNotes, shelfOf, stocked, toolsAt, type Note } from "./kitchen";
import type { Purse } from "./trade";

const bag = (...things: Array<[ItemId, number] | null>): Purse["bag"] => things.map((t) => (t ? { item: t[0], n: t[1] } : null));
const note = (things: Array<[ItemId, number]>, more: Partial<Note> = {}): Note => ({ at: 1, things, tool: "pot", cooks: 1, made: "oddDish", n: 2, ...more });

describe("the kitchen table's basket", () => {
  it("lays out what can go in, shelf by shelf, each thing once with all there is of it", () => {
    const laid = pantry(bag(["snakehead", 1], ["tomato", 2], null, ["rod", 1], ["tomato", 3], ["salt", 1], ["shiitake", 2], ["pot", 1], ["tomYum", 1], ["hyacinth", 4], ["fishSauce", 1]));
    expect(laid.map((s) => s.shelf)).toEqual(["fish", "crop", "wild", "staple", "goods"]);
    expect(laid[0].things).toEqual([["snakehead", 1], ["hyacinth", 4]]);
    expect(laid[1].things).toEqual([["tomato", 5]]);
    // (a tool, cookware and a dish are never put in: they are not in the basket)
    expect(laid.flatMap((s) => s.things.map(([id]) => id))).not.toEqual(expect.arrayContaining(["rod", "pot", "tomYum"]));
    expect(pantry(bag(null, ["rod", 1]))).toEqual([]);
  });
  it("has a shelf for every thing there is", () => {
    for (const id of Object.keys(ITEMS) as ItemId[]) expect(SHELVES).toContain(shelfOf(id));
    expect(shelfOf("hyacinth")).toBe("fish");
    expect(shelfOf("worm")).toBe("other");
  });
  it("finds the cookware of a bag, each kind once, with the slot it is taken up from", () => {
    expect(cookwareIn(bag(["rod", 1], ["pot", 1], null, ["pan", 1], ["pot", 1]))).toEqual([{ id: "pot", slot: 1 }, { id: "pan", slot: 3 }]);
  });
});

describe("a recipe read beside the pot", () => {
  const told = toldOf("tomYum"), whole = toldOf("tomYum", true);
  it("says of each line it tells whether the bag has it and whether it is in", () => {
    const mine = bag(["snakehead", 1], ["tomato", 5], ["chili", 1]);
    expect(linesAt(told, mine, [["tomato", 2], ["chili", 1]])).toEqual([
      { id: "snakehead", need: 1, have: 1, put: 0, state: "have" },
      { id: "tomato", need: 2, have: 5, put: 2, state: "in" },
      { id: "chili", need: 2, have: 1, put: 1, state: "short" },
    ]);
    // the thing it hides is no line of it: nothing here names it
    expect(linesAt(told, mine, []).map((l) => l.id)).not.toContain("scallion");
    expect(linesAt(whole, mine, []).map((l) => l.id)).toContain("scallion");
  });
  it("is stocked when the bag has every line it tells", () => {
    expect(stocked(told, bag(["snakehead", 1], ["tomato", 2], ["chili", 2]))).toBe(true);
    expect(stocked(told, bag(["snakehead", 1], ["tomato", 1], ["chili", 2]))).toBe(false);
    expect(stocked(whole, bag(["snakehead", 1], ["tomato", 2], ["chili", 2]))).toBe(false);
  });
  it("says where its cookware is: in a cook's hand, in my bag, or nowhere", () => {
    expect(toolsAt(told, bag(["pot", 1]), ["pot"])).toEqual([{ id: "pot", state: "held" }]);
    expect(toolsAt(told, bag(["pot", 1]), ["pan", null])).toEqual([{ id: "pot", state: "bag" }]);
    expect(toolsAt(told, bag(), [null, "mortar"])).toEqual([{ id: "pot", state: "none" }]);
    // a dish for two: each piece in a different hand
    const crab = toldOf("crabCurry");
    expect(crab.in.length).toBe(2);
    expect(toolsAt(crab, bag(), [crab.in[0], crab.in[1]]).every((t) => t.state === "held")).toBe(true);
    expect(toolsAt(crab, bag(), [crab.in[0]]).map((t) => t.state)).toEqual(["held", "none"]);
  });
});

describe("the kitchen's notebook", () => {
  it("keeps the newest first, the same try once, and no more than so many", () => {
    const a = note([["tomato", 2]], { at: 1 }), b = note([["chili", 2]], { at: 2 });
    expect(keepNote(keepNote([], a), b)).toEqual([b, a]);
    expect(keepNote([b, a], { ...a, at: 3 })).toEqual([{ ...a, at: 3 }, b]);
    let all: Note[] = [];
    for (let i = 0; i < NOTES.keep + 9; i++) all = keepNote(all, note([["tomato", 1 + i]], { at: i }));
    expect(all.length).toBe(NOTES.keep);
    expect(all[0].at).toBe(NOTES.keep + 8);
  });
  it("is read back from the browser with whatever of it is not a note left out", () => {
    const kept = [note([["tomato", 2]], { taste: "swap", first: true }), { at: 2, things: [["noSuchThing", 1]] }, { at: "x" }, null, { at: 3, things: [["tomato", 0]] },
      { at: 4, things: [["chili", 1]], tool: "noSuchPot", made: "nothingReal", cooks: 0, taste: "sweet" }];
    expect(readNotes(JSON.parse(JSON.stringify(kept)))).toEqual([
      note([["tomato", 2]], { taste: "swap", first: true }),
      { at: 4, things: [["chili", 1]], tool: null, cooks: 1, made: null, n: 0 },
    ]);
    expect(readNotes("nonsense")).toEqual([]);
    expect(readNotes(null)).toEqual([]);
  });
  it("tells a recipe's guesses: what else was put in beside the lines it tells, and how each tasted", () => {
    const told = toldOf("tomYum");
    const notes = [
      note([["snakehead", 1], ["tomato", 2], ["chili", 2], ["garlic", 1]], { at: 5, taste: "swap" }),
      // (not a try at it: a line in another amount)
      note([["snakehead", 1], ["tomato", 1], ["chili", 2], ["salt", 1]], { at: 4, taste: "amounts" }),
      note([["snakehead", 1], ["tomato", 2], ["chili", 2]], { at: 3, taste: "less" }),
      // (what came to a recipe is no guess)
      note([["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]], { at: 2, made: "tomYum" }),
      note([["rice", 2]], { at: 1, taste: "far" }),
    ];
    expect(guessesAt(told, notes)).toEqual([
      { at: 5, put: [["garlic", 1]], tool: "pot", taste: "swap" },
      { at: 3, put: [], tool: "pot", taste: "less" },
    ]);
    // a recipe read whole hides nothing, and has no guesses
    expect(guessesAt(toldOf("tomYum", true), notes)).toEqual([]);
  });
});
