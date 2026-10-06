import { describe, expect, it } from "vitest";
import { BEDS, FARMING, WILD, gnomeReach, gnomeWater, pouchPlots, pouchSeeds, rowFor, rowTend, see, tend, type Bed, type Plant, type Plot } from "./farm";
import type { ItemId } from "./items";
import { dayOf, staminaOf } from "./stamina";
import { HOUR, held, hold, newPurse, put, type Purse } from "./trade";
import { bedCorner, rowOf } from "./world";

/**
 * The gifts of the farming line (lib/town/gifts; the rules are lib/town/farm's): a row at a time. Each gift's own
 * tests are under its name.
 */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-07T12:00:00");
const [BX, BY] = bedCorner(0);
/** The fourth row of the first bed: its seven plots, by their keys, and the one in its middle. */
const KEYS = rowOf(BX + 3, BY + 3).map(([x, y]) => `${x},${y}`), MID = KEYS[3];
const purseWith = (gifts: Purse["gifts"], ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, stamina: { day: dayOf(NOON), left: 100 }, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]), ...(gifts ? { gifts } : {}) };
};
const holding = (p: Purse, id: ItemId): Purse => {
  const d = hold(p, p.bag.findIndex((s) => s?.item === id));
  if (!d.ok) throw new Error("nothing to hold");
  return d.purse;
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const HOE = { had: ["charmHoe"], charms: ["charmHoe"] };
const all = (keys: readonly string[], how = true) => Object.fromEntries(keys.map((k) => [k, how]));
/** A plant of mine, sown five hours before noon, that no pest comes to. */
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "pumpkin", sown: NOON - 5 * HOUR, boost: 0, watered: 0, fed: 0, guard: NOON + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });

describe("the enchanted hoe: a bed's row at a swing", () => {
  const worn = holding(purseWith(HOE, ["hoe", 1]), "hoe");

  it("is the seven plots of the row that want the same work, the one stood on first and then outwards", () => {
    expect(KEYS.length).toBe(7);
    const row = rowFor(MID, KEYS, {}, worn, "me", NOON);
    expect(row).toEqual({ deed: "clear", plots: [KEYS[3], KEYS[2], KEYS[4], KEYS[1], KEYS[5], KEYS[0], KEYS[6]] });
    // from an end of the row it goes one way
    expect(rowFor(KEYS[0], KEYS, {}, worn, "me", NOON)!.plots).toEqual(KEYS);
    expect(rowFor(KEYS[6], KEYS, {}, worn, "me", NOON)!.plots).toEqual([...KEYS].reverse());
    // only the plots that want what the one stood on wants: cleared ground is tilled, and the weeds beside it are not its row
    const some: Record<string, Plot> = { [KEYS[2]]: { soil: "cleared", plant: null }, [KEYS[3]]: { soil: "cleared", plant: null }, [KEYS[6]]: { soil: "cleared", plant: null }, [KEYS[5]]: { soil: "tilled", plant: null } };
    expect(rowFor(MID, KEYS, some, worn, "me", NOON)).toEqual({ deed: "till", plots: [KEYS[3], KEYS[2], KEYS[6]] });
    expect(rowFor(KEYS[0], KEYS, some, worn, "me", NOON)).toEqual({ deed: "clear", plots: [KEYS[0], KEYS[1], KEYS[4]] });
  });

  it("is nothing without the charm worn, without a hoe in the hand, off the row, or where one plot alone wants the work", () => {
    expect(rowFor(MID, KEYS, {}, holding(purseWith({ had: ["charmHoe"], charms: [] }, ["hoe", 1]), "hoe"), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, {}, holding(purseWith(undefined, ["hoe", 1]), "hoe"), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, {}, purseWith(HOE, ["hoe", 1]), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, {}, holding(purseWith(HOE, ["can", 1]), "can"), "me", NOON)).toBeNull();
    expect(rowFor("1,1", KEYS, {}, worn, "me", NOON)).toBeNull();
    const one = Object.fromEntries(KEYS.filter((k) => k !== MID).map((k) => [k, { soil: "tilled", plant: null } as Plot]));
    expect(rowFor(MID, KEYS, one, worn, "me", NOON)).toBeNull();
    // (tilled soil is no work of the hoe's: nothing to offer on it)
    expect(rowFor(KEYS[0], KEYS, one, worn, "me", NOON)).toBeNull();
  });

  it("does each plot whose beat was hit and leaves each whose beat was missed: the stamina of each plot done, and no more", () => {
    const row = rowFor(MID, KEYS, {}, worn, "me", NOON)!.plots, went = [true, true, false, true, false, true, true];
    const did = done(rowTend(MID, KEYS, {}, undefined, 0, 0, worn, "me", NOON, Object.fromEntries(row.map((k, i) => [k, went[i]]))));
    expect(did.deed).toBe("clear");
    expect(did.each.map((e) => e.key)).toEqual(row.filter((_, i) => went[i]));
    expect(Object.keys(did.plots).sort()).toEqual(row.filter((_, i) => went[i]).sort());
    for (const plot of Object.values(did.plots)) expect(plot).toEqual({ soil: "cleared", plant: null });
    expect(staminaOf(did.purse, NOON)).toBe(100 - 5 * FARMING.costs.clear);
    expect(did.got).toEqual([]);
    // what is left of the row is a row of its own, of two; and then one plot alone is none
    const left = rowFor(row[2], KEYS, did.plots, did.purse, "me", NOON)!;
    expect(left).toEqual({ deed: "clear", plots: [row[2], row[4]].sort((a, b) => Math.abs(Number(a.split(",")[0]) - Number(row[2].split(",")[0])) - Math.abs(Number(b.split(",")[0]) - Number(row[2].split(",")[0]))) });
    const more = done(rowTend(row[2], KEYS, did.plots, undefined, 0, 0, did.purse, "me", NOON, { [row[2]]: true, [row[4]]: false }));
    expect(more.each.map((e) => e.key)).toEqual([row[2]]);
    expect(rowFor(row[4], KEYS, { ...did.plots, ...more.plots }, more.purse, "me", NOON)).toBeNull();
  });

  it("is each plot as the hoe would have done it by itself: the same purse and plots as seven deeds one after another", () => {
    const row = rowFor(MID, KEYS, {}, worn, "me", NOON)!.plots;
    const whole = done(rowTend(MID, KEYS, {}, undefined, 0, 0, worn, "me", NOON, all(row)));
    let p = worn;
    for (const key of row) { const d = done(tend(key, WILD, undefined, 0, 0, p, "me", NOON)); p = d.purse; expect(whole.plots[key]).toEqual(d.plot); }
    expect(whole.purse).toEqual(p);
    expect(whole.each.length).toBe(7);
    // …and tilled the same way afterwards
    const tilled = done(rowTend(MID, KEYS, whole.plots, undefined, 0, 0, whole.purse, "me", NOON, all(row)));
    expect(tilled.deed).toBe("till");
    for (const key of KEYS) expect(tilled.plots[key]).toEqual({ soil: "tilled", plant: null });
    expect(staminaOf(tilled.purse, NOON)).toBe(100 - 7 * (FARMING.costs.clear + FARMING.costs.till));
  });

  it("with every beat missed nothing is done and nothing paid; a plot the marks say nothing of is left; with no row to work it is refused", () => {
    const row = rowFor(MID, KEYS, {}, worn, "me", NOON)!.plots;
    const none = done(rowTend(MID, KEYS, {}, undefined, 0, 0, worn, "me", NOON, all(row, false)));
    expect(none.each).toEqual([]);
    expect(none.plots).toEqual({});
    expect(none.purse).toEqual(worn);
    const two = done(rowTend(MID, KEYS, {}, undefined, 0, 0, worn, "me", NOON, { [row[0]]: true, [row[6]]: true, "1,1": true }));
    expect(two.each.map((e) => e.key)).toEqual([row[0], row[6]]);
    expect(rowTend(MID, KEYS, {}, undefined, 0, 0, holding(purseWith(undefined, ["hoe", 1]), "hoe"), "me", NOON, all(row))).toEqual({ ok: false, why: "none" });
  });

  it("works in anybody's bed, as a hoe does: the bed stays its owner's, and the owner's own row tends it", () => {
    const theirs: Bed = { by: "you", tended: NOON - 3_600_000, empty: 0 }, row = rowFor(MID, KEYS, {}, worn, "me", NOON, "you")!.plots;
    const did = done(rowTend(MID, KEYS, {}, theirs, 3, 0, worn, "me", NOON, all(row)));
    expect(did.each.length).toBe(7);
    expect(did.bed).toEqual(theirs);
    const mine: Bed = { by: "me", tended: NOON - 3_600_000, empty: 0 };
    expect(done(rowTend(MID, KEYS, {}, mine, 3, 0, worn, "me", NOON, all(row))).bed).toEqual({ ...mine, tended: NOON });
    // (with the gardener's gloves on beside it, work in somebody else's bed is half the stamina, each plot's as ever)
    const both = holding(purseWith({ had: ["charmHoe", "charmGloves"], charms: ["charmHoe", "charmGloves"] }, ["hoe", 1]), "hoe");
    expect(staminaOf(done(rowTend(MID, KEYS, {}, theirs, 3, 0, both, "me", NOON, all(row))).purse, NOON)).toBe(100 - 7);
  });
});

describe("the garden gnome: a whole bed of its member's watered at once", () => {
  const GNOME = { had: ["famGnome"], charms: [], familiar: "famGnome" };
  const k = (dx: number, dy: number) => `${BX + dx},${BY + dy}`;
  /** A bed of mine: two rows of growing plants; one of them watered ten minutes ago; a cabbage that is ripe; bare soil. */
  const bed = (): Record<string, Plot> => ({
    [k(0, 0)]: sown(), [k(1, 0)]: sown(), [k(2, 0)]: sown({ watered: NOON - 10 * 60_000, boost: 1_800_000 }), [k(3, 0)]: { soil: "tilled", plant: null },
    [k(0, 1)]: sown({ crop: "cabbage", sown: NOON - 30 * HOUR }), [k(1, 1)]: sown({ crop: "chili" }), [k(6, 1)]: sown({ crop: "kangkong", sown: NOON - HOUR }), [k(5, 6)]: sown(),
  });
  const me = { ...holding(purseWith(GNOME, ["can", 1]), "can"), bag: holding(purseWith(GNOME, ["can", 1]), "can").bag.map((s) => (s?.item === "can" ? { ...s, water: 3 } : s)) };

  it("goes down the bed a row at a time, to every plant that could do with water: not one that is wet, nor one that only waits to be picked", () => {
    expect(gnomeReach(0, bed(), me, "me", NOON, "me")).toEqual([k(0, 0), k(1, 0), k(1, 1), k(6, 1), k(5, 6)]);
    const did = done(gnomeWater(0, bed(), me, "me", NOON, "me"));
    expect(did.watered).toEqual([k(0, 0), k(1, 0), k(1, 1), k(6, 1), k(5, 6)]);
    expect(Object.keys(did.plots).sort()).toEqual([...did.watered].sort());
    // each has what a plain can would have added, and is wet for the hour
    for (const key of did.watered) {
      expect(did.plots[key].plant).toEqual({ ...bed()[key].plant!, watered: NOON, boost: FARMING.water.adds * 60_000 });
      expect(see(key, did.plots[key], NOON + 59 * 60_000).wet).toBe(true);
    }
  });

  it("takes no water out of the can and no stamina, and adds no more for a better can or green fingers: the gnome's can is the gnome's", () => {
    const did = done(gnomeWater(0, bed(), me, "me", NOON, "me"));
    expect(staminaOf(did.purse, NOON)).toBe(100);
    expect(did.purse.bag).toEqual(me.bag);
    expect(did.purse.gnomed).toEqual({ "0": NOON });
    const green: Purse = { ...holding(purseWith(GNOME, ["canBrass", 1]), "canBrass"), buffs: [{ id: "green", level: 4, until: NOON + HOUR }] };
    expect(done(gnomeWater(0, bed(), green, "me", NOON, "me")).plots[k(0, 0)].plant!.boost).toBe(FARMING.water.adds * 60_000);
    // (with nothing in the hand at all: it needs no hand)
    expect(done(gnomeWater(0, bed(), purseWith(GNOME), "me", NOON, "me")).watered.length).toBe(5);
  });

  it("a bed rests an hour between two of its rounds, whatever has dried meanwhile; another bed of mine does not wait for it", () => {
    const first = done(gnomeWater(0, bed(), me, "me", NOON, "me")), after = { ...bed(), ...first.plots };
    // (the plant watered by hand fifty minutes before the round is dry again ten minutes after it: the gnome does not come back for it)
    const later = NOON + 55 * 60_000;
    expect(see(k(2, 0), after[k(2, 0)], later).wet).toBe(false);
    expect(gnomeReach(0, after, first.purse, "me", later, "me")).toEqual([]);
    expect(gnomeWater(0, after, first.purse, "me", later, "me")).toEqual({ ok: false, why: "wet" });
    expect(gnomeReach(1, bed(), first.purse, "me", later, "me").length).toBe(6);
    const other = done(gnomeWater(1, bed(), first.purse, "me", later, "me"));
    expect(other.purse.gnomed).toEqual({ "0": NOON, "1": later });
    // the hour gone by, it goes again, to whatever is dry by then; and a round that no longer counts is forgotten
    const again = done(gnomeWater(0, after, other.purse, "me", NOON + 60 * 60_000, "me"));
    expect(again.watered).toEqual([k(0, 0), k(1, 0), k(2, 0), k(1, 1), k(6, 1), k(5, 6)]);
    expect(again.purse.gnomed).toEqual({ "0": NOON + 60 * 60_000, "1": later });
    expect(done(gnomeWater(0, after, other.purse, "me", NOON + 3 * HOUR, "me")).purse.gnomed).toEqual({ "0": NOON + 3 * HOUR });
  });

  it("is its member's own beds only, and nothing without the gnome at heel", () => {
    expect(gnomeReach(0, bed(), me, "me", NOON, "you")).toEqual([]);
    expect(gnomeWater(0, bed(), me, "me", NOON, "you")).toEqual({ ok: false, why: "theirs" });
    expect(gnomeWater(0, bed(), me, "me", NOON, null)).toEqual({ ok: false, why: "theirs" });
    for (const gifts of [undefined, { had: ["famGnome"], charms: [] }, { had: ["famGnome", "famSquirrel"], charms: [], familiar: "famSquirrel" }, { had: [], charms: [], familiar: "famGnome" }]) {
      expect(gnomeReach(0, bed(), purseWith(gifts), "me", NOON, "me")).toEqual([]);
      expect(gnomeWater(0, bed(), purseWith(gifts), "me", NOON, "me")).toEqual({ ok: false, why: "none" });
    }
  });

  it("has nothing to do where every plant is wet already, in the rain, or where nothing grows that water would help", () => {
    const wet = Object.fromEntries(Object.entries(bed()).map(([key, plot]) => [key, plot.plant ? { ...plot, plant: { ...plot.plant, watered: NOON - 60_000 } } : plot]));
    expect(gnomeWater(0, wet, me, "me", NOON, "me")).toEqual({ ok: false, why: "wet" });
    expect(gnomeWater(0, bed(), me, "me", NOON, "me", [[NOON - HOUR, NOON + HOUR]])).toEqual({ ok: false, why: "wet" });
    expect(gnomeWater(0, { [k(0, 0)]: { soil: "tilled", plant: null }, [k(0, 1)]: sown({ crop: "cabbage", sown: NOON - 30 * HOUR }) }, me, "me", NOON, "me")).toEqual({ ok: false, why: "soil" });
    expect(gnomeWater(0, {}, me, "me", NOON, "me")).toEqual({ ok: false, why: "soil" });
    // (a count of its rounds kept wrongly is no round)
    expect(done(gnomeWater(0, bed(), { ...me, gnomed: { "0": "soon" } as unknown as Record<string, number> }, "me", NOON, "me")).purse.gnomed).toEqual({ "0": NOON });
  });
});

describe("the spellbound seed pouch: a row sown at once, for five seeds", () => {
  const POUCH = { had: ["thingPouch"], charms: [] };
  const tilled = (keys: readonly string[]): Record<string, Plot> => Object.fromEntries(keys.map((k) => [k, { soil: "tilled", plant: null } as Plot]));
  const sower = (seeds: number, gifts: Purse["gifts"] = POUCH) => holding(purseWith(gifts, ["seedPumpkin", seeds]), "seedPumpkin");

  it("takes five seeds for seven plots, in that measure for fewer, and never more than the plots; no part of a row is a better bargain than the whole", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => pouchSeeds(n))).toEqual([1, 2, 3, 3, 4, 5, 5]);
    expect([0, 1, 2, 3, 4, 5, 6, 20].map((n) => pouchPlots(n))).toEqual([0, 1, 2, 4, 5, 7, 7, 7]);
    for (let n = 1; n <= 7; n++) { expect(pouchSeeds(n)).toBeLessThanOrEqual(n); expect(pouchSeeds(n) / n).toBeGreaterThanOrEqual(5 / 7); }
  });

  it("sows every plot of the row that is ready for a seed, the one stood on first: seven plots for five seeds, and the stamina of seven sowings", () => {
    const me = sower(9), row = rowFor(MID, KEYS, tilled(KEYS), me, "me", NOON)!;
    expect(row).toEqual({ deed: "sow", plots: [KEYS[3], KEYS[2], KEYS[4], KEYS[1], KEYS[5], KEYS[0], KEYS[6]] });
    const did = done(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, 0, me, "me", NOON, {}));
    expect(did.deed).toBe("sow");
    expect(did.each.map((e) => e.key)).toEqual(row.plots);
    expect(did.each.every((e) => e.crop === "pumpkin" && e.n === 1)).toBe(true);
    expect(did.seeds).toBe(5);
    expect(held(did.purse.bag, "seedPumpkin")).toBe(4);
    expect(staminaOf(did.purse, NOON)).toBe(100 - 7 * FARMING.costs.sow);
    for (const key of KEYS) expect(did.plots[key].plant).toMatchObject({ by: "me", crop: "pumpkin", sown: NOON, picked: 0 });
    // the bed is whoever sowed first in it: mine, as with a seed sown by hand
    expect(did.bed).toEqual({ by: "me", tended: NOON, empty: 0 });
    // …each plot as a sowing by hand leaves it, and nothing else of the purse moved
    const byHand = done(tend(MID, tilled(KEYS)[MID], undefined, 0, 0, me, "me", NOON));
    expect(did.plots[MID]).toEqual(byHand.plot);
    expect({ ...did.purse, bag: [], stamina: null }).toEqual({ ...me, bag: [], stamina: null });
  });

  it("with exactly five seeds the whole row is sown and the hand is empty; with fewer, as many plots as they reach, the nearest first", () => {
    const five = done(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, 0, sower(5), "me", NOON, {}));
    expect(five.each.length).toBe(7);
    expect(held(five.purse.bag, "seedPumpkin")).toBe(0);
    const three = sower(3);
    expect(rowFor(MID, KEYS, tilled(KEYS), three, "me", NOON)!.plots).toEqual([KEYS[3], KEYS[2], KEYS[4], KEYS[1]]);
    const did = done(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, 0, three, "me", NOON, {}));
    expect(did.each.length).toBe(4);
    expect(did.seeds).toBe(3);
    expect(held(did.purse.bag, "seedPumpkin")).toBe(0);
    // two seeds are two plots, for two seeds: a row, with nothing spared; one seed is one plot, which is no row
    const two = done(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, 0, sower(2), "me", NOON, {}));
    expect([two.each.length, two.seeds, held(two.purse.bag, "seedPumpkin")]).toEqual([2, 2, 0]);
    expect(rowFor(MID, KEYS, tilled(KEYS), sower(1), "me", NOON)).toBeNull();
  });

  it("is only the plots that are tilled and empty; what it is told of beats changes nothing", () => {
    const some: Record<string, Plot> = { ...tilled([KEYS[0], KEYS[1], KEYS[3], KEYS[6]]), [KEYS[2]]: { soil: "cleared", plant: null }, [KEYS[4]]: sown() };
    const me = sower(9), row = rowFor(KEYS[3], KEYS, some, me, "me", NOON, "me")!;
    expect(row.plots).toEqual([KEYS[1], KEYS[3], KEYS[0], KEYS[6]].sort((a, b) => Math.abs(Number(a.split(",")[0]) - Number(KEYS[3].split(",")[0])) - Math.abs(Number(b.split(",")[0]) - Number(KEYS[3].split(",")[0])) || Number(a.split(",")[0]) - Number(b.split(",")[0])));
    const mine: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
    const did = done(rowTend(KEYS[3], KEYS, some, mine, 0, 0, me, "me", NOON, all(KEYS, false)));
    expect(did.each.length).toBe(4);
    expect(did.seeds).toBe(3);
    expect(held(did.purse.bag, "seedPumpkin")).toBe(6);
    expect(did.bed).toEqual({ ...mine, tended: NOON });
  });

  it("is nothing without the pouch, with no seed in the hand, where one plot alone is ready, or in a bed that is somebody else's", () => {
    expect(rowFor(MID, KEYS, tilled(KEYS), sower(9, { had: [], charms: [] }), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, tilled(KEYS), holding(purseWith(undefined, ["seedPumpkin", 9]), "seedPumpkin"), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, tilled(KEYS), purseWith(POUCH, ["seedPumpkin", 9]), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, tilled([MID]), sower(9), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, tilled(KEYS), sower(9), "me", NOON, "you")).toBeNull();
    expect(rowTend(MID, KEYS, tilled(KEYS), { by: "you", tended: NOON, empty: 0 }, 2, 0, sower(9), "me", NOON, {})).toEqual({ ok: false, why: "none" });
    // (the hoe's charm sows nothing, and the pouch hoes nothing)
    expect(rowFor(MID, KEYS, tilled(KEYS), sower(9, HOE), "me", NOON)).toBeNull();
    expect(rowFor(MID, KEYS, {}, holding(purseWith(POUCH, ["hoe", 1]), "hoe"), "me", NOON)).toBeNull();
  });

  it("takes a free bed as a sowing does, and is refused one by whoever holds as many beds as one may: nothing is sown then, and no seed gone", () => {
    const me = sower(9);
    expect(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, BEDS.each, me, "me", NOON, {})).toEqual({ ok: false, why: "beds" });
    expect(done(rowTend(MID, KEYS, tilled(KEYS), undefined, 0, BEDS.each - 1, me, "me", NOON, {})).each.length).toBe(7);
  });
});
