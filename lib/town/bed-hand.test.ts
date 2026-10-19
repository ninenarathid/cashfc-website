import { describe, expect, it } from "vitest";
import { giveBed, houseIn, leaveBed, plantsIn } from "./bed-hand";
import { BEDS, type Plant, type Plot } from "./farm";
import { newPurse, put } from "./trade";
import { bedCorner } from "./world";

/** A bed's owner hands it on or gives it up (the owner, 2026-10-19): lib/town/bed-hand. */
const T = Date.parse("2026-10-19T18:00:00+07:00"), H = 3_600_000, BED = 30;
const at = (dx: number, dy: number) => { const [x, y] = bedCorner(BED); return `${x + dx},${y + dy}`; };
const plant = (by: string, extra: Partial<Plant> = {}): Plant => ({ by, crop: "kangkong", sown: T - 2 * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...extra });
const house = { by: "me", at: T - H, rooms: [null, null] };
const plots = (): Record<string, Plot> => ({
  [at(0, 0)]: { soil: "tilled", plant: plant("me", { q: { at: T - H, span: 0.4, area: [0.1, 0.2, 0.3, 0.4], nar: [0, 0, 0] } }) },
  [at(1, 0)]: { soil: "tilled", plant: plant("me", { crop: "chili" }), damp: true },
  [at(3, 3)]: { soil: "house", plant: null, house },
  [at(5, 5)]: { soil: "tilled", plant: null },
  // (a plot of another bed, which neither touches)
  [`${bedCorner(BED + 1)[0]},${bedCorner(BED + 1)[1]}`]: { soil: "tilled", plant: plant("me") },
});
const mine = { by: "me", tended: T - H, empty: 0 };

describe("handing a bed on", () => {
  it("makes every plant in it and its insect house the taker's, each as it was but for whose, and the bed theirs from now", () => {
    const did = giveBed(BED, mine, plots(), "me", "pal", BEDS.each - 1, T);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.bed).toEqual({ by: "pal", tended: T, empty: 0 });
    expect(Object.keys(did.plots).sort()).toEqual([at(0, 0), at(1, 0), at(3, 3)].sort());
    expect(did.plots[at(0, 0)].plant).toEqual({ ...plots()[at(0, 0)].plant, by: "pal" });
    expect(did.plots[at(1, 0)]).toEqual({ soil: "tilled", plant: { ...plots()[at(1, 0)].plant, by: "pal" }, damp: true });
    expect(did.plots[at(3, 3)].house).toEqual({ ...house, by: "pal" });
  });
  it("refuses one who holds as many beds as one may, a bed not mine, and handing it to myself or to nobody", () => {
    expect(giveBed(BED, mine, plots(), "me", "pal", BEDS.each, T)).toEqual({ ok: false, why: "beds" });
    expect(giveBed(BED, { ...mine, by: "pal" }, plots(), "me", "kit", 0, T)).toEqual({ ok: false, why: "theirs" });
    expect(giveBed(BED, undefined, plots(), "me", "kit", 0, T)).toEqual({ ok: false, why: "theirs" });
    expect(giveBed(BED, mine, plots(), "me", "me", 0, T)).toEqual({ ok: false, why: "none" });
    expect(giveBed(BED, mine, plots(), "me", null, 0, T)).toEqual({ ok: false, why: "none" });
    // (a bed lapsed, untended too long, is nobody's: not mine to hand on)
    expect(giveBed(BED, { ...mine, tended: T - (BEDS.untended + 1) * H }, plots(), "me", "pal", 0, T)).toEqual({ ok: false, why: "theirs" });
  });
  it("hands on an empty bed as empty from now", () => {
    const did = giveBed(BED, { by: "me", tended: T - H, empty: T - H }, { [at(0, 0)]: { soil: "tilled", plant: null } }, "me", "pal", 0, T);
    expect(did.ok && did.bed).toEqual({ by: "pal", tended: T, empty: T });
  });
});

describe("giving a bed up", () => {
  it("takes every plant out, lifts its house into my bag, and touches no other bed", () => {
    const purse = { ...newPurse(), bag: put(Array(10).fill(null), "stone", 3) };
    const did = leaveBed(BED, mine, plots(), purse, "me", T);
    expect(did.ok).toBe(true);
    if (!did.ok) return;
    expect(did.plots).toEqual({ [at(0, 0)]: { soil: "tilled", plant: null }, [at(1, 0)]: { soil: "tilled", plant: null, damp: true }, [at(3, 3)]: { soil: "tilled", plant: null } });
    expect(did.purse.bag.filter((s) => s?.item === "insectHouse")).toEqual([{ item: "insectHouse", n: 1 }]);
  });
  it("refuses while the bag has no room for its house, and a bed not mine", () => {
    const full = { ...newPurse(), bag: Array(10).fill(null).map(() => ({ item: "stone" as const, n: 99 })) };
    expect(leaveBed(BED, mine, plots(), full, "me", T)).toEqual({ ok: false, why: "full" });
    expect(leaveBed(BED, { ...mine, by: "pal" }, plots(), newPurse(), "me", T)).toEqual({ ok: false, why: "theirs" });
    // (with no house in it, a full bag is no matter)
    const noHouse = plots();
    delete noHouse[at(3, 3)];
    expect(leaveBed(BED, mine, noHouse, full, "me", T).ok).toBe(true);
  });
});

describe("what a bed's card says of it", () => {
  it("counts a plant over several plots once, at its root, and sees its house", () => {
    const wide = { ...plots(), [at(2, 2)]: { soil: "tilled", plant: plant("me", { root: at(1, 0) }) } } as Record<string, Plot>;
    expect(plantsIn(BED, wide)).toBe(2);
    expect([houseIn(BED, plots()), houseIn(BED + 1, plots())]).toEqual([true, false]);
  });
});
