import { describe, expect, it } from "vitest";
import { madeOf, tasteOf } from "./cooking";
import { toldOf } from "./hints";
import { ITEMS, type ItemId } from "./items";
import { NOTES, SHELVES, TASTE_WORD, cookwareIn, guessesAt, keepNote, linesAt, missedBy, missedWords, pantry, readNotes, shelfOf, stocked, toolsAt, type Note } from "./kitchen";
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

describe("a miss, read beside the recipe that is open", () => {
  const name = (id: ItemId) => ITEMS[id].name.th, said = (...a: Parameters<typeof missedBy>) => missedWords(missedBy(...a), name, true);
  const tomYum = toldOf("tomYum"), lines: Array<[ItemId, number]> = [["snakehead", 1], ["tomato", 2], ["chili", 2]];
  it("says of two minnows put in for a bowl that a minnow is not its secret thing, though they taste of another recipe that is one thing short", () => {
    // (the owner, 2026-10-07: the card said only the taste, and it was read as said of the bowl)
    const bowl = toldOf("bowl");
    expect(bowl.needs).toEqual([]);
    expect(tasteOf([["minnow", 2]], [null])).toEqual({ taste: "less", of: "growFert", lacks: "compost" });
    expect(missedBy(bowl, [["minnow", 2]], [null])).toEqual({ lacks: [], amounts: [], strays: [["minnow", 2]], secret: { n: 2, how: "guess" }, tools: [], cooks: null, wrong: "minnow" });
    expect(said(bowl, [["minnow", 2]], [null])).toEqual(["ปลาซิว ไม่ใช่ชิ้นลับของสูตรนี้"]);
    expect(missedWords(missedBy(bowl, [["minnow", 2]], [null]), (id) => ITEMS[id].name.en, false)).toEqual(["Minnow is not its secret thing"]);
    // whoever has made a bowl reads all of it: what was not put in, and what is no thing of it
    expect(said(toldOf("bowl", true), [["minnow", 2]], [null])).toEqual([`ยังไม่ได้ใส่ ${name("mussel")} ×2`, "ปลาซิว ไม่อยู่ในสูตรนี้"]);
  });
  it("says what of its lines is not in or is in another amount, and then nothing of a guess", () => {
    expect(said(tomYum, [["snakehead", 1], ["tomato", 1], ["garlic", 1]], ["pot"])).toEqual([`ยังไม่ได้ใส่ ${name("chili")} ×2`, `${name("tomato")} ต้องใส่ ×2 (ใส่ไป ×1)`]);
  });
  it("says of its secret thing only what its page tells: one kind, so many, and a guess that was not it once all the rest is right", () => {
    expect(said(tomYum, lines, ["pot"])).toEqual(["ยังไม่ได้ใส่ชิ้นลับ (ต้องใส่ ×1)"]);
    expect(said(tomYum, [...lines, ["garlic", 1], ["salt", 1]], ["pot"])).toEqual(["ชิ้นลับมีอย่างเดียว แต่ใส่ของนอกสูตรมา 2 อย่าง"]);
    expect(said(tomYum, [...lines, ["garlic", 2]], ["pot"])).toEqual([`ชิ้นลับต้องใส่ ×1 (ใส่ ${name("garlic")} ไป ×2)`]);
    expect(said(tomYum, [...lines, ["garlic", 1]], ["pot"])).toEqual([`${name("garlic")} ไม่ใช่ชิ้นลับของสูตรนี้`]);
    // in the wrong cookware the guess may have been right: only the cookware is said
    expect(said(tomYum, [...lines, ["garlic", 1]], ["pan"])).toEqual([`ไม่ได้ทำใน ${name("pot")}`]);
    expect(missedBy(tomYum, [...lines, ["scallion", 1]], ["pan"]).wrong).toBeNull();
    // (with the thing itself in its cookware there is no miss to read: it is the dish)
    expect(madeOf([...lines, ["scallion", 1]])).toBe("tomYum");
  });
  it("says how many cooks it takes when there were fewer, and has nothing to say of a try that is the recipe's", () => {
    const crab = toldOf("crabCurry", true);
    expect(said(crab, crab.needs, [crab.in[0]])).toEqual([`ไม่ได้ทำใน ${name(crab.in[1])}`, "ต้องช่วยกันทำ 2 คน"]);
    expect(said(crab, crab.needs, [crab.in[0], crab.in[1]])).toEqual([]);
  });
  it("words every taste as said of a recipe, never of the one the cook has in mind", () => {
    for (const t of ["some", "less", "more", "swap", "amounts", "way"] as const) { expect(TASTE_WORD[t].th).toContain("สูตรหนึ่ง"); expect(TASTE_WORD[t].en).toMatch(/\ba recipe\b/i); }
    expect(TASTE_WORD.far.th).toContain("สูตรไหน");
  });
});
