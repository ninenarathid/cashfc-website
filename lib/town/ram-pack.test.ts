import { describe, expect, it } from "vitest";
import { newPurse, type Purse } from "./trade";
import { PACK, newPack, packOpen, packPut, packTake, roomyPack } from "./ram-pack";

const withRam = (worn: boolean): Purse => ({ ...newPurse(), bag: [{ item: "worm", n: 7 }, { item: "rod", n: 1 }, ...Array(8).fill(null)],
  gifts: { had: ["famCloudRam", "famSquirrel"], charms: [], owed: 0, familiar: worn ? "famCloudRam" : "famSquirrel", used: {} } });

describe("the cloud ram's pack", () => {
  it("opens only while the cloud ram follows", () => {
    expect(packOpen(withRam(true))).toBe(true);
    expect(packOpen(withRam(false))).toBe(false);
    expect(packOpen(newPurse())).toBe(false);
  });
  it("has ten slots, and a short one is given the rest", () => {
    expect(newPack().things).toHaveLength(PACK.slots);
    expect(roomyPack({ things: [{ item: "worm", n: 1 }] }).things).toHaveLength(10);
    expect(roomyPack(null).things).toHaveLength(10);
  });
  it("takes part of a stack in and gives it back, nothing made or lost", () => {
    const p = withRam(true);
    const put = packPut(p, newPack(), 0, 4);
    if (!put.ok) throw new Error(put.why);
    expect(put.purse.bag[0]).toEqual({ item: "worm", n: 3 });
    expect(put.pack.things[0]).toEqual({ item: "worm", n: 4 });
    const back = packTake(put.purse, put.pack, 0, 4);
    if (!back.ok) throw new Error(back.why);
    expect(back.purse.bag[0]).toEqual({ item: "worm", n: 7 });
    expect(back.pack.things.every((s) => s === null)).toBe(true);
  });
  it("holds a tool as it is", () => {
    const put = packPut(withRam(true), newPack(), 1, 1);
    expect(put.ok && put.pack.things.some((s) => s?.item === "rod")).toBe(true);
  });
  it("is shut with another familiar, and what is in it stays", () => {
    const put = packPut(withRam(true), newPack(), 0, 7);
    if (!put.ok) throw new Error(put.why);
    const other = { ...put.purse, gifts: { ...put.purse.gifts!, familiar: "famSquirrel" as const } };
    expect(packTake(other, put.pack, 0, 7)).toEqual({ ok: false, why: "shut" });
    expect(packPut(other, put.pack, 1, 1)).toEqual({ ok: false, why: "shut" });
    expect(put.pack.things[0]).toEqual({ item: "worm", n: 7 });
  });
  it("refuses an empty slot, a wrong number, and a full pack", () => {
    const p = withRam(true);
    expect(packPut(p, newPack(), 5, 1)).toEqual({ ok: false, why: "none" });
    expect(packPut(p, newPack(), 0, 9)).toEqual({ ok: false, why: "amount" });
    const full = { things: Array.from({ length: 10 }, () => ({ item: "rod" as const, n: 1 })) };
    expect(packPut(p, full, 0, 1)).toEqual({ ok: false, why: "packed" });
  });
});
