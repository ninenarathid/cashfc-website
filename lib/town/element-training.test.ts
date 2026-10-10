import { describe, expect, it } from "vitest";
import { trainElement } from "./element-training";
import { elementStage, readToolWord, toolWord } from "./tools";
import { newPurse, type Stack } from "./trade";
import { forgingOf, withForging, setGem } from "./forge";
import { tend } from "./farm";

const tool = (gems: string[], mastery: Stack["mastery"] = {}): Stack => ({ item: "hoe", n: 1, plus: 10, gems, mastery });
const purse = (stack: Stack) => ({ ...newPurse(), coins: 10000, hand: stack.item, handAt: 0, bag: [stack, ...Array<null>(8).fill(null)] });
describe("elemental training belongs to the used equipment", () => {
  it("trains both distinct elements once, crosses visual milestones, and caps progress", () => {
    const p = purse(tool(["fire", "water"], { fire: 19, water: 299 }));
    const did = trainElement(p, p, p.bag[0]);
    expect(did.bag[0]?.mastery).toEqual({ fire: 20, water: 300 });
    expect(readToolWord(toolWord(did.bag[0]))?.stages).toEqual([1, 3]);
    expect(elementStage(did.bag[0], "water")).toBe(3);
    expect(trainElement(did, did, did.bag[0]).bag[0]?.mastery?.water).toBe(300);
    expect(p.bag[0]?.mastery).toEqual({ fire: 19, water: 299 });
  });
  it("does not multiply progress for repeated gems or touch another identical tool", () => {
    const p = purse(tool(["ice", "ice"]));
    p.bag[1] = { ...p.bag[0]! };
    const after = trainElement(p, p, p.bag[1]);
    expect(after.bag[1]?.mastery).toEqual({ ice: 1 });
    expect(after.bag[0]).toBe(p.bag[0]);
  });
  it("rejects a replaced tool or changed gem loadout and awards nothing on a refused job", () => {
    const p = purse(tool(["fire"]));
    expect(trainElement(p, purse(tool(["water"])), p.bag[0]).bag[0]?.mastery).toEqual({});
    const did = tend("132,4", { soil: "tilled", plant: null }, undefined, 0, 0, p, "m", Date.now());
    expect(did.ok).toBe(false);
    expect(p.bag[0]?.mastery).toEqual({});
  });
  it("returns removed gems, preserves dormant mastery and moves it with the whole forging", () => {
    const p = purse(tool(["fire", "water"], { fire: 300, water: 99 }));
    const did = setGem(p, 0, null, 1);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.purse.bag.some(s => s?.item === "gemSapphire" && s.n === 1)).toBe(true);
    expect(did.purse.bag[0]?.mastery).toEqual(p.bag[0]?.mastery);
    const moved = withForging({ item: "can", n: 1, water: 2, mastery: { wind: 100 } }, forgingOf(did.purse.bag[0]));
    expect(moved.mastery).toEqual({ fire: 300, water: 99 });
    expect(moved.water).toBe(2);
  });
  it("recovers a historical third gem for free without a third active effect or a copied gem", () => {
    const p=purse(tool(["fire","water","dark"],{dark:100}));
    expect(toolWord(p.bag[0])).toBe("2fw2");
    const did=setGem(p,0,null,2);
    expect(did.ok).toBe(true);
    if(!did.ok)return;
    expect(did.purse.coins).toBe(p.coins);
    expect(did.purse.bag[0]?.gems).toEqual(["fire","water"]);
    expect(did.purse.bag[0]?.mastery).toEqual({dark:100});
    expect(did.purse.bag.filter(s=>s?.item==='gemOnyx').reduce((n,s)=>n+(s?.n??0),0)).toBe(1);
    expect(setGem(did.purse,0,null,2).ok).toBe(false);
  });
});
