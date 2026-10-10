import { describe, expect, it } from "vitest";
import { gearOf } from "./gear";
import { startFight } from "./fishing";
import { fitHook, hookOf, HOOK_IDS } from "./rod-hook";
import { moveSlot, sortBag } from "./bag";
import { newPurse, type Purse } from "./trade";

const ready = (): Purse => ({ ...newPurse(), coins: 71, bag: [{ item: "rod", n: 1 }, ...HOOK_IDS.map(item => ({ item, n: 1 })), { item: "worm", n: 20 }] });
describe("the rod's removable hook slot", () => {
  it("fits, switches and removes freely, with a full bag and no material, money or stamina lost", () => {
    let p = ready(); const before = structuredClone(p);
    for (const id of [...HOOK_IDS, null, "hookScale", null] as const) {
      const d = fitHook(p, id); expect(d.ok).toBe(true);
      if (!d.ok) throw new Error("fit refused");
      p = d.purse; expect(hookOf(p)).toBe(id);
      const { fishingHook: _, ...rest } = p; expect(rest).toEqual(before);
    }
  });
  it("only uses the fitted hook, even when better ones are carried; removing it restores the ordinary fight", () => {
    const p = ready(), fight = (hook: Purse["fishingHook"]) => startFight("catfish", "good", { gear: gearOf(p.bag, "rod", 0, hook) }, 17);
    const plain = fight(null);
    expect(fight("hookScale").slipIn).toBeCloseTo(plain.slipIn * 1.15);
    expect(fight("hookSteel").slipIn).toBeCloseTo(plain.slipIn * 1.3);
    expect(fight("hookTwin").slipIn).toBeCloseTo(plain.slipIn * 1.6);
    expect(fight(undefined)).toEqual(plain);
  });
  it("keeps its selection through reload, moving and sorting; a hook no longer owned gives no benefit", () => {
    const p = { ...ready(), fishingHook: "hookScale" as const };
    const moved = moveSlot(p, 1, 4); if (!moved.ok) throw new Error("move refused");
    const sorted = sortBag(moved.purse);
    expect(hookOf(JSON.parse(JSON.stringify(sorted)))).toBe("hookScale");
    const without = { ...p, bag: p.bag.filter(s => s?.item !== "hookScale") };
    expect(hookOf(without)).toBeNull();
    expect(gearOf(without.bag, "rod", 0, without.fishingHook).slip).toBe(1);
  });
  it("rejects absent hooks, bait, inherited keys and fitting without a rod", () => {
    const p = ready();
    for (const id of ["worm", "toString", "__proto__", "hookScale".repeat(20)]) expect(fitHook(p, id)).toEqual({ ok: false, why: "none" });
    expect(fitHook({ ...p, bag: [{ item: "rod", n: 1 }] }, "hookScale").ok).toBe(false);
    expect(fitHook({ ...p, bag: [{ item: "rod", n: 1 }, { item: "hookScale", n: 0.5 }] }, "hookScale").ok).toBe(false);
    expect(fitHook({ ...p, bag: [{ item: "hookScale", n: 1 }] }, "hookScale").ok).toBe(false);
    expect(fitHook({ ...p, bag: [] }, null).ok).toBe(true);
  });
});
