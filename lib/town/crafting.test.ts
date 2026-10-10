import { describe, expect, it } from "vitest";
import { CRAFT_IDS, CRAFTS, craft, craftFee, craftLeads } from "./crafting";
import { ITEMS, MAKES, ITEM_IDS, type ItemId } from "./items";
import { newPurse, held, type Purse } from "./trade";

const NOW = Date.parse("2026-10-10T05:00:00Z");
const prepared = (id: keyof typeof CRAFTS): Purse => ({ ...newPurse(), coins: 10000,
  bag: [...CRAFTS[id].map(([item,n]) => ({item,n})), ...Array(12).fill(null)] });
describe("advanced equipment workshop", () => {
  it("opens workshop leads from discovered materials, and keeps completed work visible", () => {
    const p = { ...newPurse(), bag: Array(12).fill(null) };
    expect(craftLeads(p)).toEqual([]);
    expect(craftLeads(p, ["splitPlank"])).toContain("pollenBrush");
    expect(craftLeads({ ...p, crafted: ["pollenBrush"] })).toContain("pollenBrush");
    expect(craftLeads(p, ["salt"])).not.toContain("pollenBrush");
  });
  it("gives every tier 2 and 3 tool a craft path", () => {
    const missing = ITEM_IDS.filter((id) => ITEMS[id].kind === "tool" && ITEMS[id].tier > 1 && !MAKES[id] && !(id in CRAFTS));
    expect(missing).toEqual([]);
    expect(CRAFT_IDS).toHaveLength(105);
  });
  it.each(CRAFT_IDS)("makes %s with exact costs and no mutation", (id) => {
    const before = prepared(id), copy = structuredClone(before);
    const did = craft(before,id,NOW);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(before).toEqual(copy);
    expect(held(did.purse.bag,id)).toBe(1);
    expect(did.purse.coins).toBe(before.coins-craftFee(id));
    for (const [part] of CRAFTS[id]) expect(held(did.purse.bag,part)).toBe(0);
    expect(did.purse.crafted).toContain(id);
    expect(craftFee(id)).toBeGreaterThanOrEqual(ITEMS[id].pays);
  });
  it("never consumes a forged tool or requires a tool that is itself being built", () => {
    for (const id of CRAFT_IDS) for (const [part,n] of CRAFTS[id]) {
      expect(ITEMS[part].kind).not.toBe("tool");
      expect(n).toBeGreaterThan(0);
      expect(part).not.toBe(id);
    }
    const old = {item:"rod" as ItemId,n:1,plus:10,opts:["rdCalm"],gems:["water"],makers:["Maker"]};
    const p = prepared("rodTeak"); p.bag.push(old);
    const did = craft(p,"rodTeak",NOW);
    expect(did.ok && did.purse.bag.find((s) => s?.item === "rod")).toEqual(old);
  });
  it("refuses coins, missing materials, hostile ids and full bags without spending", () => {
    expect(craft({...prepared("jar"),coins:0},"jar",NOW)).toEqual({ok:false,why:"coins"});
    expect(craft(newPurse(),"jar",NOW).ok).toBe(false);
    for (const id of ["__proto__","constructor",null,{},"rod"]) expect(craft(prepared("jar"),id,NOW)).toEqual({ok:false,why:"none"});
    const p = prepared("jar"); p.bag = [{item:"clay",n:7},{item:"stone",n:3}];
    const before = structuredClone(p);
    expect(craft(p,"jar",NOW)).toEqual({ok:false,why:"full"}); expect(p).toEqual(before);
  });
  it("uses the room freed by ingredients", () => {
    const p = prepared("jar"); p.bag = p.bag.filter(Boolean);
    expect(craft(p,"jar",NOW).ok).toBe(true);
  });
});
