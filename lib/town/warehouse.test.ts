import { describe, expect, it } from "vitest";
import { warehouseAction, WAREHOUSE, type Warehouse } from "./warehouse";
import { newPurse, type Stack } from "./trade";
import { STOREBOX } from "./world";

const at: [number,number] = [STOREBOX.x, STOREBOX.y+1];
const tool: Stack = { item: "rod", n: 1, plus: 4, opts: ["rdBand"], makers: ["Alice"] };
const box = (): Warehouse => ({owner:"A",name:"Alice",members:["B"],things:[tool,...Array(19).fill(null)]});
describe("shared storage", () => {
  it("keeps strangers from seeing or taking a friend's belongings", () => {
    expect(warehouseAction(newPurse(),[box()],"C","C",{action:"look"}).warehouses).toEqual([]);
    const d = warehouseAction(newPurse(),[box()],"C","C",{action:"take",owner:"A",slot:0,expected:tool,at});
    expect(d.ok).toBe(false);expect(d.warehouses).toEqual([]);
  });
  it("moves a forged tool intact to an offline guest and empties only its source slot", () => {
    const d=warehouseAction(newPurse(),[box()],"B","B",{action:"take",owner:"A",slot:0,expected:tool,at});
    expect(d.ok).toBe(true);expect(d.purse.bag[0]).toEqual(tool);expect(d.warehouses[0].things[0]).toBeNull();
  });
  it("rejects a stale stack and preserves both inventories", () => {
    const p=newPurse(),w=box(),d=warehouseAction(p,[w],"B","B",{action:"take",owner:"A",slot:0,expected:{item:"rod",n:1},at});
    expect(d.why).toBe("changed");expect(d.purse).toBe(p);expect(d.warehouses[0]).toBe(w);
  });
  it("a guest cannot invite others; revoking access retains the stored tool", () => {
    expect(warehouseAction(newPurse(),[box()],"B","B",{action:"invite",owner:"A",member:"C",at}).why).toBe("denied");
    const d=warehouseAction(newPurse(),[box()],"A","A",{action:"remove",owner:"A",member:"B",at});
    expect(d.warehouses[0].members).toEqual([]);expect(d.warehouses[0].things[0]).toEqual(tool);
  });
  it("a full bag leaves the warehouse intact", () => {
    const p={...newPurse(),bag:Array(10).fill({item:"pot",n:1})};
    const d=warehouseAction(p,[box()],"B","B",{action:"take",owner:"A",slot:0,expected:tool,at});
    expect(d.why).toBe("full");expect(d.purse).toBe(p);expect(d.warehouses[0].things[0]).toEqual(tool);
  });
  it("charges once for one warehouse, and refuses opening a second", () => {
    const p={...newPurse(),coins:2000,bag:[...Array(5).fill({item:"log",n:20}),...Array(5).fill(null)]};
    const d=warehouseAction(p,[],"A","A",{action:"create",at});
    expect(d.ok).toBe(true);expect(d.purse.coins).toBe(2000-WAREHOUSE.coins);expect(d.purse.bag.every(s=>s===null)).toBe(true);
    expect(warehouseAction(d.purse,d.warehouses,"A","A",{action:"create",at}).why).toBe("exists");
  });
});
