import { describe, expect, it } from "vitest";
import { newBox, stow as boxStow } from "./box";
import { pick, rowFor, rowTend, sow, tend, type Bed, type Plant, type Plot } from "./farm";
import { gardenHarvest } from "./gardening";
import { CROP_IDS, ITEMS, type ItemId } from "./items";
import { FARM_HOLDS, POUCHES, bagToPouch, heldIn, pouchToBag, pouchesOf, roomIn, stow, stowAll, takeOut, useUp } from "./pouches";
import { dayOf } from "./stamina";
import { HOUR, held, hold, newPurse, put, type Purse, type Stack } from "./trade";
import { STOREBOX, bedCorner, rowOf } from "./world";

/**
 * The farming line's pouch (lib/town/pouches; the owner, 2026-10-16: "ช่วยทำให้ เครื่องรางบางชิ้นในสาย ปลูกพืช มี
 * กระเป๋าเก็บของสำหรับสายนี้โดยเฉพาะ สำหรับ เก็บพืช เมล็ด ได้ ให้slot มากกว่าสายอื่นเล็กน้อย / เพิ่ม stack ต่อ slot ให้กับพืชด้วย"):
 * the seed pouch's six slots of produce and seeds, grades kept; what is harvested goes in first; seeds are sown from it;
 * and produce stacked twice as high.
 */
const NOON = Date.UTC(2026, 9, 17, 5), [BX, BY] = bedCorner(0), K = `${BX + 3},${BY + 3}`;
const POUCH = { had: ["thingPouch"], charms: [] };
const purseWith = (gifts: Purse["gifts"] | undefined, bag: Array<Stack | null> = Array(10).fill(null), pouch?: Array<Stack | null>): Purse =>
  ({ ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, bag, ...(gifts ? { gifts } : {}), ...(pouch ? { pouches: { thingPouch: pouch } } : {}) });
const slots = (p: Purse) => pouchesOf(p).find((x) => x.pouch.gift === "thingPouch")?.slots ?? [];
const full = (n = 10): Array<Stack | null> => Array.from({ length: n }, () => ({ item: "rod" as ItemId, n: 1 }));
const ok = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const ripe = (crop: Plant["crop"], over: Partial<Plant> = {}): Plant => ({ by: "me", crop, sown: NOON - 400 * HOUR, boost: 0, watered: 0, fed: 0, guard: NOON + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0,
  q: { at: NOON - HOUR, span: 1, area: [0.8, 0.9, 0.56, 1], nar: [0, 0, 0] }, ...over });

describe("the farm's pouch and its produce", () => {
  it("is the seed pouch's: six slots, for everything the farm grows and every seed, and nothing else", () => {
    expect(POUCHES.find((p) => p.gift === "thingPouch")?.slots).toBe(6);
    for (const id of CROP_IDS) expect(FARM_HOLDS, id).toContain(id);
    for (const id of ["mint", "chamomile", "lavender", "seedTomato", "seedPumpkin"] as ItemId[]) expect(FARM_HOLDS, id).toContain(id);
    for (const id of ["minnow", "log", "rod", "compost", "salt"] as ItemId[]) expect(FARM_HOLDS, id).not.toContain(id);
    expect(FARM_HOLDS.every((id) => ITEMS[id].kind === "crop" || ITEMS[id].kind === "seed" || CROP_IDS.includes(id as never))).toBe(true);
    expect(pouchesOf(purseWith(undefined))).toEqual([]);
    expect(slots(purseWith(POUCH))).toEqual(Array(6).fill(null));
  });

  it("stacks the farm's produce twice as high (10, 20, 40), the wild helpers too, and seeds as they were", () => {
    expect([ITEMS.kangkong.stack, ITEMS.cabbage.stack, ITEMS.pumpkin.stack, ITEMS.mint.stack, ITEMS.chamomile.stack, ITEMS.lavender.stack]).toEqual([40, 20, 10, 40, 40, 40]);
    expect([ITEMS.seedKangkong.stack, ITEMS.seedPumpkin.stack]).toEqual([10, 10]);
    // (a box's slot takes forty, as the bag's does)
    const did = ok(boxStow(purseWith(undefined, [{ item: "kangkong", n: 40 }, null]), newBox(), 0, 40, [STOREBOX.x + 1, STOREBOX.y + 1]));
    expect(did.box.things[0]).toEqual({ item: "kangkong", n: 40 });
    expect(put([null, null], "tomato", 50, 2)).toEqual([{ item: "tomato", n: 40, grade: 2 }, { item: "tomato", n: 10, grade: 2 }]);
  });

  it("keeps a grade to a slot, as the bag does: stowed into the pouch first, the rest into the bag, each with its grade", () => {
    let p = purseWith(POUCH);
    expect(roomIn(p, "tomato", 2)).toBe(16 * 40);
    p = stow(p, "tomato", 30, 2);
    p = stow(p, "tomato", 15);
    p = stow(p, "tomato", 20, 2);
    expect(slots(p).slice(0, 3)).toEqual([{ item: "tomato", n: 40, grade: 2 }, { item: "tomato", n: 15 }, { item: "tomato", n: 10, grade: 2 }]);
    expect(p.bag.every((s) => s === null)).toBe(true);
    expect([heldIn(p, "tomato"), heldIn(p, "tomato", 2), heldIn(p, "tomato", 0), heldIn(p, "tomato", 3)]).toEqual([65, 50, 15, 0]);
    expect(roomIn(p, "tomato", 2)).toBe(30 + 3 * 40 + 10 * 40);
    // the pouch full: the bag takes the rest, graded as it was
    const crammed = stowAll(purseWith(POUCH, [null, null], Array.from({ length: 6 }, () => ({ item: "seedTomato" as ItemId, n: 10 }))), [["tomato", 5, 3], ["seedTomato", 2]])!;
    expect(crammed.bag).toEqual([{ item: "tomato", n: 5, grade: 3 }, { item: "seedTomato", n: 2 }]);
    expect(stowAll(crammed, [["tomato", 80, 1]])).toBeNull();
    // (a grade that is no grade is none, and a stack is never more than stack)
    expect(slots(purseWith(POUCH, undefined, [{ item: "tomato", n: 99, grade: 7 as 1 }, { item: "minnow", n: 1 }]))).toEqual([{ item: "tomato", n: 40 }, null, null, null, null, null]);
  });

  it("moves a graded slot into the bag and back with its grade, as much as there is room for", () => {
    const p = purseWith(POUCH, [{ item: "tomato", n: 30, grade: 2 }, ...full(9)], [{ item: "tomato", n: 25, grade: 2 }, { item: "carrot", n: 4, grade: 1 }, null, null, null, null]);
    const out = ok(pouchToBag(p, "thingPouch", 0));
    expect(out.n).toBe(10);
    expect(out.purse.bag[0]).toEqual({ item: "tomato", n: 40, grade: 2 });
    expect(slots(out.purse)[0]).toEqual({ item: "tomato", n: 15, grade: 2 });
    expect(pouchToBag(p, "thingPouch", 1)).toEqual({ ok: false, why: "full" });
    const back = ok(bagToPouch(out.purse, 0));
    expect(back.n).toBe(40);
    expect(slots(back.purse).slice(0, 3)).toEqual([{ item: "tomato", n: 40, grade: 2 }, { item: "carrot", n: 4, grade: 1 }, { item: "tomato", n: 15, grade: 2 }]);
    expect(back.purse.bag[0]).toBeNull();
    // (taken out, the lowest grade first: the bag's, then the pouch's)
    const taken = takeOut(back.purse, "tomato", 50);
    expect([held(taken.bag, "tomato"), heldIn(taken, "tomato", 2)]).toEqual([0, 5]);
  });

  it("is where a picking goes first: by hand, the sickle's row and its one more, the twine's fruit and the seeds given back", () => {
    const corn = (): Plot => ({ soil: "tilled", plant: ripe("corn") });
    const did = ok(pick(K, purseWith(POUCH), corn(), true, null, NOON, [], "me"));
    expect(did.purse.bag.every((s) => s === null)).toBe(true);
    expect(heldIn(did.purse, "corn")).toBe(did.got![0][1]);
    expect(slots(did.purse).some((s) => s?.item === "corn" && (s.grade ?? 0) > 0)).toBe(true);
    // no pouch: the bag, as ever; neither with room: refused, nothing changed
    expect(heldIn(ok(pick(K, purseWith(undefined), corn(), true, null, NOON, [], "me")).purse, "corn")).toBe(did.got![0][1]);
    expect(pick(K, purseWith(POUCH, full(), Array.from({ length: 6 }, () => ({ item: "seedTomato" as ItemId, n: 10 }))), corn(), true, null, NOON, [], "me")).toEqual({ ok: false, why: "full" });
    // the sickle's sweep of a row of mine: every fruit in the pouch, the one more of each plant cut well among them
    const keys = rowOf(BX + 3, BY + 3).map(([x, y]) => `${x},${y}`), row = Object.fromEntries(keys.map((key) => [key, { soil: "tilled", plant: ripe("cabbage") } as Plot]));
    const mine: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
    const swept = ok(rowTend(keys[3], keys, row, mine, 0, 0, purseWith({ had: ["thingPouch", "charmSickle"], charms: ["charmSickle"] }), "me", NOON, Object.fromEntries(keys.map((k) => [k, true]))));
    expect(swept.got).toEqual([["cabbage", 7 * 2 + 7]]);
    expect(swept.purse.bag.every((s) => s === null)).toBe(true);
    expect(heldIn(swept.purse, "cabbage")).toBe(21);
    // the twine's fruit and the seed tray's seed, of a root plant picked for the last time
    const root = ripe("corn", { root: K, footprint: [K] }), plots = { [K]: { soil: "tilled", plant: root } as Plot };
    const tools = purseWith(POUCH, [{ item: "gardenTwine", n: 1 }, { item: "seedTray", n: 1 }, null]), base = ok(pick(K, tools, plots[K], true, null, NOON, [], "me"));
    const g = gardenHarvest(K, plots, tools, { purse: base.purse, plot: base.plot, got: base.got! }, "me", NOON, []) as { purse?: Purse };
    expect(heldIn(g.purse!, "corn")).toBe(base.got![0][1] + 1);
    expect(slots(g.purse!).some((s) => s?.item === "seedCorn" && s.n === 1)).toBe(true);
    expect(g.purse!.bag).toEqual(tools.bag);
  });

  it("is sown from: the seed in the hand is the bag's, and the pouch's seeds go first; a row counts them, and a seed spared goes back where it was", () => {
    const sower = (inBag: number, inPouch: number) => {
      const p = purseWith(POUCH, [{ item: "seedPumpkin", n: inBag }, null, null], [inPouch ? { item: "seedPumpkin", n: inPouch } : null, null, null, null, null, null]);
      const d = hold(p, 0);
      if (!d.ok) throw new Error("cannot hold");
      return d.purse;
    };
    const one = ok(sow(sower(1, 3), { soil: "tilled", plant: null }, "seedPumpkin", "me", NOON));
    expect([held(one.purse.bag, "seedPumpkin"), heldIn(one.purse, "seedPumpkin")]).toEqual([1, 3]);
    expect(useUp(sower(1, 3), "seedPumpkin", 4).bag[0]).toBeNull();
    // a row of seven from one seed in the hand and four in the pouch: five seeds, the hand's last
    const keys = rowOf(BX + 3, BY + 3).map(([x, y]) => `${x},${y}`), tilled = Object.fromEntries(keys.map((k) => [k, { soil: "tilled", plant: null } as Plot]));
    const me = sower(1, 4);
    expect(rowFor(keys[3], keys, tilled, me, "me", NOON)?.plots.length).toBe(7);
    const did = ok(rowTend(keys[3], keys, tilled, undefined, 0, 0, me, "me", NOON, {}));
    expect([did.each.length, did.seeds, heldIn(did.purse, "seedPumpkin")]).toEqual([7, 5, 0]);
    // with seeds to spare in both, the spared ones go back where they were taken from: the pouch, sown from first
    const many = ok(rowTend(keys[3], keys, tilled, undefined, 0, 0, sower(3, 6), "me", NOON, {}));
    expect([held(many.purse.bag, "seedPumpkin"), heldIn(many.purse, "seedPumpkin")]).toEqual([3, 4]);
    // (sown by hand from the pouch, a seed at a time, through the farm's own deed)
    const byTend = ok(tend(K, { soil: "tilled", plant: null }, undefined, 0, 0, sower(2, 1), "me", NOON));
    expect([held(byTend.purse.bag, "seedPumpkin"), heldIn(byTend.purse, "seedPumpkin")]).toEqual([2, 2]);
  });
});
