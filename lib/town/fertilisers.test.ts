import { describe, expect, it } from "vitest";
import { deedFor, tend, type Plant, type Plot } from "./farm";
import { FERTS, FERT_ITEMS, FERT_MAKES } from "./fertilisers";
import { ITEMS, MAKES } from "./items";
import { barsOfQ, ROLES } from "./quality";
import { handCovers, settled } from "./quality-plant";
import { held, newPurse, put, type Purse } from "./trade";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20), LAUNCH = T0 - 100 * H;
const tomato = (more: Partial<Plant> = {}): Plant => ({ by: "me", crop: "tomato", sown: T0, boost: 0, watered: 0, fed: 0, guard: T0 + 999 * H, cured: 0, picked: 0, pickedAt: 0, ...more });
const holding = (item: string, n = 1): Purse => { const p = newPurse(); return { ...p, bag: put(p.bag, item as never, n), hand: item as never }; };
const bed = { by: "me", tended: T0, empty: 0 };

describe("the fertilisers of Quality", () => {
  it("fill one bar whole or two by half, never more, and each is made by hand", () => {
    for (const [id, f] of Object.entries(FERTS)) {
      const bars = Object.values(f.bars) as number[];
      expect(bars.length === 1 ? bars[0] === 1 : bars.length === 2 && bars.every((b) => b === 0.5), id).toBe(true);
      for (const r of Object.keys(f.bars)) expect(ROLES).toContain(r);
      expect(ITEMS[id as keyof typeof ITEMS], id).toBeDefined();
      if (f.slot === "top") expect(f.hours, id).toBeGreaterThan(0);
    }
    for (const id of Object.keys(FERT_ITEMS)) expect(MAKES[id as keyof typeof MAKES]?.in, id).toEqual([]);
    expect(Object.keys(FERT_MAKES).sort()).toEqual(Object.keys(FERT_ITEMS).sort());
  });

  it("is put on one's own growing plant: a base once in its first round, a top over no live top", () => {
    const plot = (p: Plant): Plot => ({ soil: "tilled", plant: p });
    expect(deedFor("1,1", plot(tomato()), "slatePowder", "me", T0 + H, "me")).toBe("fert");
    expect(deedFor("1,1", plot(tomato({ by: "you" })), "slatePowder", "me", T0 + H, "me")).toBeNull();
    expect(deedFor("1,1", plot(tomato({ base: { item: "biochar", at: T0 } })), "slatePowder", "me", T0 + H, "me")).toBeNull();
    expect(deedFor("1,1", plot(tomato({ picked: 1, pickedAt: T0 + 80 * H })), "slatePowder", "me", T0 + 90 * H, "me")).toBeNull();
    expect(deedFor("1,1", plot(tomato({ top: { item: "nectarLure", at: T0, until: T0 + 24 * H } })), "fishEmulsion", "me", T0 + H, "me")).toBeNull();
    expect(deedFor("1,1", plot(tomato({ top: { item: "nectarLure", at: T0, until: T0 + 24 * H } })), "fishEmulsion", "me", T0 + 25 * H, "me")).toBe("fert");
    // (the leaf mulch is a base now, no longer the growth feed; the growth fertiliser still is)
    expect(deedFor("1,1", plot(tomato()), "mulch", "me", T0 + H, "me")).toBe("fert");
    expect(deedFor("1,1", plot(tomato()), "growFert", "me", T0 + H, "me")).toBe("feed");
  });

  it("takes one from the bag and a stamina, and keeps when it went on", () => {
    const did = tend("1,1", { soil: "tilled", plant: tomato() }, bed, 0, 0, holding("shreddedBark", 2), "me", T0 + 2 * H);
    expect(did.ok && did.deed).toBe("fert");
    expect(did.ok && did.plot.plant!.top).toEqual({ item: "shreddedBark", at: T0 + 2 * H, until: T0 + 50 * H });
    expect(did.ok && held(did.purse.bag, "shreddedBark")).toBe(1);
  });

  it("covers its bars: a base to the first picking, a top for its hours", () => {
    const p = tomato({ base: { item: "slatePowder", at: T0 }, top: { item: "shreddedBark", at: T0, until: T0 + 36 * H } });
    const covers = handCovers(p, T0);
    expect(covers.filter((c) => c.src === "base")).toEqual([{ role: "soil", level: 1, from: T0, to: Number.MAX_SAFE_INTEGER, src: "base" }]);
    expect(covers.filter((c) => c.src === "top").map((c) => [c.role, c.level, c.to])).toEqual([["water", 0.5, T0 + 36 * H], ["guard", 0.5, T0 + 36 * H]]);
    // the tomato ripens at 72 hours: the soil whole all round, water half of half of it
    const bars = barsOfQ(settled(p, T0 + 100 * H, [], LAUNCH));
    expect(bars.soil).toBe(25);
    expect(bars.water).toBe(Math.floor(25 * 0.5 * 0.5));
    // a later round has no base
    expect(handCovers({ ...p, picked: 1, pickedAt: T0 + 72 * H }, T0 + 72 * H).some((c) => c.src === "base")).toBe(false);
  });
});
