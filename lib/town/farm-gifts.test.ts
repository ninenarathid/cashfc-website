import { describe, expect, it } from "vitest";
import {
  BEDS, ENCORE, FARMING, HOURGLASS, WILD, encoreHours, glassReach, glassTurn, gnomeReach, gnomeWater, grown, growing, hardFor, moreOf, pestAt, pick, pouchPlots, pouchSeeds, quickMs, quickUntil, rowFor, rowTend, see, sungTo, tend, yieldOf,
  type Bed, type Plant, type Plot,
} from "./farm";
import { USES, harderAt, usesLeft } from "./gifts";
import { CROPS, CROP_IDS, ITEMS } from "./items";
import { LINES } from "./lines";
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
    // (with the gardener's gloves on beside it, work in somebody else's bed takes no stamina, each plot's as ever)
    const both = holding(purseWith({ had: ["charmHoe", "charmGloves"], charms: ["charmHoe", "charmGloves"] }, ["hoe", 1]), "hoe");
    expect(staminaOf(done(rowTend(MID, KEYS, {}, theirs, 3, 0, both, "me", NOON, all(row))).purse, NOON)).toBe(100);
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

  it("a bed rests an hour and a half between two of its rounds, whatever has dried meanwhile; another bed of mine does not wait for it", () => {
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
    const again = done(gnomeWater(0, after, other.purse, "me", NOON + 90 * 60_000, "me"));
    expect(again.watered).toEqual([k(0, 0), k(1, 0), k(2, 0), k(1, 1), k(6, 1), k(5, 6)]);
    expect(again.purse.gnomed).toEqual({ "0": NOON + 90 * 60_000, "1": later });
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

describe("the crescent sickle: a whole ripe row picked at one sweep", () => {
  const SICKLE = { had: ["charmSickle"], charms: ["charmSickle"] };
  /** A pumpkin that is ripe (sown a hundred and fifty hours before noon: it takes a hundred and forty-four), and a morning glory that is (it bears again). */
  const ripe = (over: Partial<Plant> = {}): Plot => sown({ crop: "pumpkin", sown: NOON - 150 * HOUR, ...over });
  const mine: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
  const me = purseWith(SICKLE);
  const whole = (): Record<string, Plot> => Object.fromEntries(KEYS.map((k) => [k, ripe()]));

  it("is offered in my own bed, where picking is the plain deed and two plants or more of the row are ripe: those, and no others", () => {
    expect(rowFor(MID, KEYS, whole(), me, "me", NOON, "me")).toEqual({ deed: "pick", plots: [KEYS[3], KEYS[2], KEYS[4], KEYS[1], KEYS[5], KEYS[0], KEYS[6]] });
    const some: Record<string, Plot> = { [KEYS[0]]: ripe(), [KEYS[1]]: sown(), [KEYS[3]]: ripe({ crop: "kangkong", sown: NOON - 9 * HOUR }), [KEYS[4]]: { soil: "tilled", plant: null }, [KEYS[6]]: ripe() };
    expect(rowFor(KEYS[3], KEYS, some, me, "me", NOON, "me")).toEqual({ deed: "pick", plots: [KEYS[3], KEYS[0], KEYS[6]] });
    // not in a bed that is somebody else's, nor one that is nobody's; not without the charm worn; not for one plant alone
    expect(rowFor(MID, KEYS, whole(), me, "me", NOON, "you")).toBeNull();
    expect(rowFor(MID, KEYS, whole(), me, "me", NOON, null)).toBeNull();
    expect(rowFor(MID, KEYS, whole(), purseWith({ had: ["charmSickle"], charms: [] }), "me", NOON, "me")).toBeNull();
    expect(rowFor(MID, KEYS, { [MID]: ripe(), [KEYS[0]]: sown() }, me, "me", NOON, "me")).toBeNull();
    // (with a hoe in the hand a ripe plant is dug out, not picked: the sickle has nothing to do with that)
    expect(rowFor(MID, KEYS, whole(), holding(purseWith(SICKLE, ["hoe", 1]), "hoe"), "me", NOON, "me")).toBeNull();
  });

  it("picks every plant the sweep went along: one cut well gives one more, one cut badly what it would have given by hand and no more", () => {
    const went = [true, false, true, true, false, true, true], marks = Object.fromEntries(KEYS.map((k, i) => [k, went[i]]));
    const did = done(rowTend(MID, KEYS, whole(), mine, 0, 0, me, "me", NOON, marks));
    expect(did.deed).toBe("pick");
    expect(did.each.length).toBe(7);
    for (const e of did.each) {
      const byHand = yieldOf(e.key, whole()[e.key].plant!, null);
      expect(byHand).toBe(2);
      expect(e).toEqual({ key: e.key, crop: "pumpkin", n: byHand + (marks[e.key] ? 1 : 0), well: marks[e.key] });
    }
    expect(did.got).toEqual([["pumpkin", 7 * 2 + 5]]);
    expect(held(did.purse.bag, "pumpkin")).toBe(19);
    expect(staminaOf(did.purse, NOON)).toBe(100 - 7 * FARMING.costs.pick);
    // a pumpkin is picked once: every plot is bare ground again, and the bed's day of standing empty begins
    for (const key of KEYS) expect(did.plots[key]).toEqual({ soil: "cleared", plant: null });
    expect(did.bed).toEqual({ by: "me", tended: NOON, empty: NOON });
  });

  it("with every plant cut badly it is as seven pickings by hand, to the last thing in the bag", () => {
    const did = done(rowTend(MID, KEYS, whole(), mine, 0, 0, me, "me", NOON, all(KEYS, false)));
    let p = me, bed: Bed | undefined = mine;
    const state = whole();
    for (const key of [KEYS[3], KEYS[2], KEYS[4], KEYS[1], KEYS[5], KEYS[0], KEYS[6]]) {
      const d: { purse: Purse; bed: Bed | undefined; plot: Plot } = done(tend(key, state[key], bed, KEYS.filter((k) => k !== key && state[k].plant).length, 0, p, "me", NOON));
      p = d.purse; bed = d.bed; state[key] = d.plot;
    }
    expect(did.purse).toEqual(p);
    expect(did.bed).toEqual(bed);
    expect(did.got).toEqual([["pumpkin", 14]]);
  });

  it("leaves a plant the sweep did not go along, and one that bears again goes back a stage as when picked by hand", () => {
    const row: Record<string, Plot> = { [KEYS[0]]: ripe(), [KEYS[1]]: ripe({ crop: "kangkong", sown: NOON - 9 * HOUR }), [KEYS[2]]: ripe(), [KEYS[5]]: sown() };
    const did = done(rowTend(KEYS[1], KEYS, row, mine, 0, 0, me, "me", NOON, { [KEYS[1]]: true, [KEYS[0]]: false }));
    expect(did.each.map((e) => e.key)).toEqual([KEYS[1], KEYS[0]]);
    expect(did.plots[KEYS[1]].plant).toMatchObject({ crop: "kangkong", picked: 1, pickedAt: NOON });
    expect(did.plots[KEYS[2]]).toBeUndefined();
    const kang = yieldOf(KEYS[1], row[KEYS[1]].plant!, null);
    expect(did.got).toEqual([["kangkong", kang + 1], ["pumpkin", 2]]);
    // (the bed still has plants in it: its day of standing empty has not begun)
    expect(did.bed).toEqual({ ...mine, tended: NOON });
  });

  it("adds to what a blade in the hand gives: the sickle held picks one more by hand, and the charm one more for a good cut", () => {
    const held_ = holding(purseWith(SICKLE, ["sickle", 1]), "sickle");
    const did = done(rowTend(MID, KEYS, whole(), mine, 0, 0, held_, "me", NOON, { [KEYS[3]]: true, [KEYS[2]]: false }));
    expect(did.each.map((e) => e.n)).toEqual([2 + 1 + 1, 2 + 1]);
  });

  it("stops where the bag is full: what was picked before is picked, and a good cut with no room for its one more gives what the hand gives", () => {
    // a bag with room for five pumpkins and no more
    const tight: Purse = { ...me, bag: me.bag.map((_, i) => (i === 0 ? { item: "pumpkin" as ItemId, n: ITEMS.pumpkin.stack - 5 } : { item: "hoe" as ItemId, n: 1 })) };
    const did = done(rowTend(MID, KEYS, whole(), mine, 0, 0, tight, "me", NOON, all(KEYS)));
    // the first: two and one more; the second: two, and no room for one more; the third does not fit at all
    expect(did.each).toEqual([{ key: KEYS[3], crop: "pumpkin", n: 3, well: true }, { key: KEYS[2], crop: "pumpkin", n: 2, well: true }]);
    expect(Object.keys(did.plots).sort()).toEqual([KEYS[2], KEYS[3]].sort());
    // with no room at all for the first, nothing is done
    const full: Purse = { ...me, bag: me.bag.map(() => ({ item: "hoe" as ItemId, n: 1 })) };
    expect(rowTend(MID, KEYS, whole(), mine, 0, 0, full, "me", NOON, all(KEYS))).toEqual({ ok: false, why: "full" });
  });
});

describe("good things are harder for the skilled on the farm: a crop of the second tier or better, from the line's fourth rank", () => {
  it("the simplest crops are as they are for everybody, at any rank; and so is everybody below the fourth", () => {
    const marks = LINES.farming.marks, tiers = CROP_IDS.map((c) => ITEMS[c].tier);
    expect(tiers.filter((t) => t === 1).length).toBe(12);
    expect(tiers.filter((t) => t === 2).length).toBe(7);
    expect(tiers.filter((t) => t === 3).length).toBe(7);
    for (const crop of CROP_IDS) {
      expect(hardFor(crop, 0)).toBe(1);
      expect(hardFor(crop, marks[2])).toBe(1);
      for (const rank of [4, 5, 6, 10]) expect(hardFor(crop, marks[rank - 1]), `${crop} at rank ${rank}`).toBe(ITEMS[crop].tier >= 2 ? harderAt(rank) : 1);
    }
    expect(hardFor("eggplant", marks[3])).toBeCloseTo(1.08, 12);
    expect(hardFor("mango", marks[9])).toBeCloseTo(1.56, 12);
    expect(hardFor(null, marks[9])).toBe(1);
    // (what a crop is of is its thing's own tier: the second tier's begin at the eggplant, the third's at the mango)
    expect(ITEMS[CROPS.eggplant.seed].tier).toBe(2);
  });
});

describe("the hourglass of seasons: a bed grows three times as fast for three hours", () => {
  const GLASS = { had: ["thingHourglass"], charms: [] };
  const k = (dx: number, dy: number) => `${BX + dx},${BY + dy}`;
  const me = purseWith(GLASS), SPAN = HOURGLASS.hours * HOUR;
  /** A bed of mine: growing plants, a morning glory picked an hour ago and bearing again, a ripe cabbage, bare soil. */
  const bed = (): Record<string, Plot> => ({
    [k(0, 0)]: sown(), [k(1, 0)]: sown({ crop: "chili" }), [k(3, 0)]: { soil: "tilled", plant: null },
    [k(0, 2)]: sown({ crop: "kangkong", sown: NOON - 20 * HOUR, picked: 1, pickedAt: NOON - HOUR }), [k(4, 2)]: sown({ crop: "cabbage", sown: NOON - 30 * HOUR }),
  });

  it("adds twice a stretch's length to the growth of a plant it ran over, by the part of it gone by: nothing before it, all of it after", () => {
    const p = plant({ fast: [NOON] });
    expect(quickMs(p, p.sown, NOON)).toBe(0);
    expect(quickMs(p, p.sown, NOON + HOUR)).toBe(2 * HOUR);
    expect(quickMs(p, p.sown, NOON + SPAN)).toBe(2 * SPAN);
    expect(quickMs(p, p.sown, NOON + 9 * HOUR)).toBe(2 * SPAN);
    // (only the part between the two moments; two turnings add up; a plant no hourglass was turned over has nothing)
    expect(quickMs(p, NOON + 2 * HOUR, NOON + 9 * HOUR)).toBe(2 * HOUR);
    expect(quickMs(plant({ fast: [NOON, NOON + 30 * HOUR] }), 0, NOON + 31 * HOUR)).toBe(2 * SPAN + 2 * HOUR);
    expect(quickMs(plant(), 0, NOON + 99 * HOUR)).toBe(0);
    expect(quickMs(plant({ fast: [] }), 0, NOON + 99 * HOUR)).toBe(0);
    expect(quickUntil(p, NOON + HOUR)).toBe(NOON + SPAN);
    expect(quickUntil(p, NOON + SPAN)).toBeNull();
    expect(quickUntil(p, NOON - 1)).toBeNull();
    expect(quickUntil(plant(), NOON)).toBeNull();
  });

  it("so a plant has grown three hours in one of them, and is ripe six hours sooner for a whole stretch; one with no hourglass is as it always was", () => {
    const plain = plant(), quick = plant({ fast: [NOON] });
    for (const dt of [0, 0.5, 1, 3, 5, 200]) {
      expect(grown(plain, NOON + dt * HOUR)).toBe(5 + dt);
      expect(grown(quick, NOON + dt * HOUR)).toBe(5 + dt + 2 * Math.min(dt, HOURGLASS.hours));
    }
    // a pumpkin takes 144 hours: ripe at 139 hours after noon without it, at 133 with
    expect(growing(plain, NOON + 139 * HOUR - 1).ripe).toBe(false);
    expect(growing(plain, NOON + 139 * HOUR).ripe).toBe(true);
    expect(growing(quick, NOON + 133 * HOUR - 1).ripe).toBe(false);
    expect(growing(quick, NOON + 133 * HOUR).ripe).toBe(true);
    // (water, fertiliser and rain are added beside it, each as it was)
    const both = plant({ fast: [NOON], boost: 1_800_000, fed: NOON });
    expect(grown(both, NOON + 4 * HOUR)).toBe(5 + 4 + 0.5 + 4 * (FARMING.feed - 1) + 6);
  });

  it("a plant that waits to bear again waits a third as long through it", () => {
    // a morning glory bears again twelve hours after a picking: picked at noon, the glass turned an hour later
    const waits = plant({ crop: "kangkong", sown: NOON - 20 * HOUR, picked: 1, pickedAt: NOON }), quick = { ...waits, fast: [NOON + HOUR] };
    expect(growing(waits, NOON + 12 * HOUR - 1).ripe).toBe(false);
    expect(growing(waits, NOON + 12 * HOUR).ripe).toBe(true);
    expect(growing(quick, NOON + 6 * HOUR - 1).ripe).toBe(false);
    expect(growing(quick, NOON + 6 * HOUR).ripe).toBe(true);
    // (a turning before it was picked counts for nothing in the wait but the part since the picking: an hour of it here)
    const before = { ...waits, fast: [NOON - 2 * HOUR] };
    expect(growing(before, NOON + 10 * HOUR - 1).ripe).toBe(false);
    expect(growing(before, NOON + 10 * HOUR).ripe).toBe(true);
  });

  it("a plant ripe sooner is safe from pests sooner: nothing strikes one that only waits to be picked", () => {
    // found by looking: a plot whose pumpkin, unguarded, is struck in the hours before it would have been ripe
    let found: { key: string; p: Plant; t: number } | null = null;
    for (let i = 0; i < 4000 && !found; i++) {
      const key = `${BX + (i % 7)},${BY + (Math.floor(i / 7) % 7)}`, p = plant({ guard: 0, sown: NOON - 144 * HOUR + 3 * HOUR + i * 1000, cured: NOON - HOUR });
      const t = pestAt(key, p, NOON + 4 * HOUR);
      if (t !== null && t > NOON) found = { key, p, t };
    }
    expect(found).not.toBeNull();
    const { key, p, t } = found!;
    // (with the glass turned twenty hours before, it was ripe by then, and is not struck)
    expect(pestAt(key, { ...p, fast: [NOON - 20 * HOUR] }, NOON + 4 * HOUR)).toBeNull();
    expect(pestAt(key, { ...p, fast: [t + HOUR] }, NOON + 4 * HOUR)).toBe(t);
  });

  it("turned over a bed of mine, every plant that lives there remembers it: three hours from that moment, once a day", () => {
    expect(USES.thingHourglass).toEqual({ n: 1, per: "day" });
    expect(glassReach(bed(), me, "me", NOON, "me")).toEqual([k(0, 0), k(1, 0), k(0, 2), k(4, 2)]);
    const did = done(glassTurn(bed(), me, "me", NOON, "me"));
    expect(did.quickened).toEqual([k(0, 0), k(1, 0), k(0, 2), k(4, 2)]);
    expect(did.until).toBe(NOON + SPAN);
    for (const key of did.quickened) expect(did.plots[key].plant).toEqual({ ...bed()[key].plant!, fast: [NOON] });
    expect(Object.keys(did.plots).length).toBe(4);
    expect(usesLeft(did.purse, "thingHourglass", NOON)).toBe(0);
    expect({ ...did.purse, gifts: null }).toEqual({ ...me, gifts: null });
    // no more today, in this bed or another; tomorrow again
    const after = { ...bed(), ...did.plots };
    expect(glassTurn(after, did.purse, "me", NOON + HOUR, "me")).toEqual({ ok: false, why: "spent" });
    expect(glassTurn(bed(), did.purse, "me", NOON + 5 * HOUR, "me")).toEqual({ ok: false, why: "spent" });
    expect(glassReach(bed(), did.purse, "me", NOON + 5 * HOUR, "me")).toEqual([]);
    const next = done(glassTurn(after, did.purse, "me", NOON + 24 * HOUR, "me"));
    expect(next.plots[k(0, 0)].plant!.fast).toEqual([NOON, NOON + 24 * HOUR]);
    // (a plant remembers so many turnings and no more: the newest)
    const old = { [k(0, 0)]: sown({ fast: Array.from({ length: HOURGLASS.kept + 3 }, (_, i) => NOON - (60 - i) * 24 * HOUR) }) };
    const kept = done(glassTurn(old, me, "me", NOON, "me")).plots[k(0, 0)].plant!.fast!;
    expect(kept.length).toBe(HOURGLASS.kept);
    expect(kept.at(-1)).toBe(NOON);
  });

  it("is refused without the hourglass, in a bed that is not mine, while the sand still runs there, and where nothing grows that it would help", () => {
    expect(glassTurn(bed(), purseWith(undefined), "me", NOON, "me")).toEqual({ ok: false, why: "none" });
    expect(glassTurn(bed(), purseWith({ had: [], charms: [] }), "me", NOON, "me")).toEqual({ ok: false, why: "none" });
    expect(glassTurn(bed(), me, "me", NOON, "you")).toEqual({ ok: false, why: "theirs" });
    expect(glassTurn(bed(), me, "me", NOON, null)).toEqual({ ok: false, why: "theirs" });
    // (a turning of an hour ago, counted on the day before across its beginning: still running over these plants)
    const running = { ...bed(), [k(0, 0)]: sown({ fast: [NOON - HOUR] }) };
    expect(glassTurn(running, me, "me", NOON, "me")).toEqual({ ok: false, why: "running" });
    expect(done(glassTurn(running, me, "me", NOON + 2 * HOUR, "me")).quickened.length).toBe(4);
    expect(glassTurn({}, me, "me", NOON, "me")).toEqual({ ok: false, why: "soil" });
    expect(glassTurn({ [k(3, 0)]: { soil: "tilled", plant: null }, [k(4, 2)]: sown({ crop: "cabbage", sown: NOON - 30 * HOUR }) }, me, "me", NOON, "me")).toEqual({ ok: false, why: "soil" });
    // (nothing is counted of a turning that was refused)
    expect(usesLeft(me, "thingHourglass", NOON)).toBe(1);
  });

  it("what a plot shows follows it: a stage sooner, ripe sooner", () => {
    const quick = sown({ crop: "kangkong", sown: NOON, fast: [NOON] }), plain = sown({ crop: "kangkong", sown: NOON });
    // (a morning glory takes six hours: with the glass it has grown six in two)
    expect(see("1,1", plain, NOON + 2 * HOUR)).toMatchObject({ stage: 3, ripe: false });
    expect(see("1,1", quick, NOON + 2 * HOUR)).toMatchObject({ stage: 5, ripe: true });
  });
});

describe("the mandrake sprout: it sings as a plant is picked, and that plant bears once more", () => {
  const MANDRAKE = { had: ["famMandrake"], charms: [], familiar: "famMandrake" };
  const me = purseWith(MANDRAKE);
  /** A pumpkin that is ripe (picked once and gone, by its kind), and a morning glory at its third and last picking. */
  const pumpkin = (over: Partial<Plant> = {}): Plot => sown({ crop: "pumpkin", sown: NOON - 150 * HOUR, ...over });
  const lastGlory = (): Plot => sown({ crop: "kangkong", sown: NOON - 40 * HOUR, picked: 2, pickedAt: NOON - 13 * HOUR });

  it("a crop that is picked only once is not gone at its picking: it stays, sung to, and is ripe again after half its hours", () => {
    expect(USES.famMandrake).toEqual({ n: 7, per: "day" });
    expect(encoreHours("pumpkin")).toBe(CROPS.pumpkin.hours * ENCORE);
    const did = done(pick("1,1", me, pumpkin(), true, null, NOON));
    expect(did.got).toEqual([["pumpkin", 2]]);
    expect(did.plot.plant).toEqual({ ...pumpkin().plant!, picked: 1, pickedAt: NOON, watered: 0, more: 1 });
    expect(usesLeft(did.purse, "famMandrake", NOON)).toBe(6);
    expect(staminaOf(did.purse, NOON)).toBe(100 - FARMING.costs.pick);
    expect(sungTo(pumpkin(), did.plot)).toBe(true);
    // it waits as a plant that bears again waits: a stage back, and ripe after seventy-two hours
    const p = did.plot.plant!;
    expect(growing(p, NOON + HOUR)).toEqual({ stage: 4, ripe: false, spent: false });
    expect(growing(p, NOON + 72 * HOUR - 1).ripe).toBe(false);
    expect(growing(p, NOON + 72 * HOUR)).toEqual({ stage: 5, ripe: true, spent: false });
    expect(see("1,1", did.plot, NOON + 73 * HOUR)).toMatchObject({ stage: 5, ripe: true, pest: false, dead: false });
    // picked that once more it is gone, song or no song: a plant is sung to once
    const again = done(pick("1,1", did.purse, did.plot, true, null, NOON + 73 * HOUR));
    expect(again.plot).toEqual({ soil: "cleared", plant: null });
    expect(usesLeft(again.purse, "famMandrake", NOON + 73 * HOUR)).toBe(usesLeft(did.purse, "famMandrake", NOON + 73 * HOUR));
    expect(sungTo(did.plot, again.plot)).toBe(false);
    // (what it gives the second time is rolled afresh, as each picking of a plant that bears again is)
    expect(again.got![0][1]).toBe(yieldOf("1,1", p, null));
  });

  it("a plant that bears again is sung to at its last picking, not before: one more bearing after its kind's own while", () => {
    const early = done(pick("1,1", me, sown({ crop: "kangkong", sown: NOON - 9 * HOUR }), true, null, NOON));
    expect(early.plot.plant).toMatchObject({ picked: 1 });
    expect(early.plot.plant!.more).toBeUndefined();
    expect(usesLeft(early.purse, "famMandrake", NOON)).toBe(7);
    const did = done(pick("1,1", me, lastGlory(), true, null, NOON));
    expect(did.plot.plant).toMatchObject({ crop: "kangkong", picked: 3, pickedAt: NOON, more: 1 });
    expect(usesLeft(did.purse, "famMandrake", NOON)).toBe(6);
    expect(growing(did.plot.plant!, NOON + CROPS.kangkong.again! * HOUR - 1).ripe).toBe(false);
    expect(growing(did.plot.plant!, NOON + CROPS.kangkong.again! * HOUR).ripe).toBe(true);
    expect(done(pick("1,1", did.purse, did.plot, true, null, NOON + 13 * HOUR)).plot.plant).toBeNull();
  });

  it("only while it follows, and seven plants a day: the eighth is gone as ever, and tomorrow it sings again", () => {
    for (const gifts of [undefined, { had: ["famMandrake"], charms: [] }, { had: ["famMandrake", "famGnome"], charms: [], familiar: "famGnome" }, { had: [], charms: [], familiar: "famMandrake" }]) {
      const did = done(pick("1,1", purseWith(gifts), pumpkin(), true, null, NOON));
      expect(did.plot).toEqual({ soil: "cleared", plant: null });
      expect(did.purse.gifts).toEqual(purseWith(gifts).gifts);
    }
    let p = me;
    for (let i = 0; i < 7; i++) { const d = done(pick(`${i},1`, p, pumpkin(), true, null, NOON + i)); expect(d.plot.plant?.more).toBe(1); p = { ...d.purse, bag: me.bag }; }
    expect(usesLeft(p, "famMandrake", NOON)).toBe(0);
    expect(done(pick("9,1", p, pumpkin(), true, null, NOON + 9)).plot).toEqual({ soil: "cleared", plant: null });
    expect(done(pick("9,1", p, pumpkin(), true, null, NOON + 24 * HOUR)).plot.plant?.more).toBe(1);
  });

  it("is as a picking by hand in everything else: the same yield, the same stamina, refused the same ways, and nothing sung for a picking refused", () => {
    const plain = done(pick("1,1", purseWith(undefined), pumpkin(), true, null, NOON)), sung = done(pick("1,1", me, pumpkin(), true, null, NOON));
    expect(sung.got).toEqual(plain.got);
    expect({ ...sung.purse, gifts: null }).toEqual({ ...plain.purse, gifts: null });
    expect(pick("1,1", me, pumpkin(), false, null, NOON)).toEqual({ ok: false, why: "theirs" });
    expect(pick("1,1", me, sown(), true, null, NOON)).toEqual({ ok: false, why: "unripe" });
    const full: Purse = { ...me, bag: me.bag.map(() => ({ item: "hoe" as ItemId, n: 1 })) };
    expect(pick("1,1", full, pumpkin(), true, null, NOON)).toEqual({ ok: false, why: "full" });
  });

  it("through the farm's own deed and the sickle's row it is the same song: the bed keeps its plants, and is not left empty", () => {
    const mine: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
    const byDeed = done(tend("1,1", pumpkin(), mine, 0, 0, me, "me", NOON));
    expect(byDeed.deed).toBe("pick");
    expect(byDeed.plot.plant?.more).toBe(1);
    expect(byDeed.bed).toEqual({ ...mine, tended: NOON });
    // a row of seven pumpkins swept with the sickle, the mandrake at heel: all seven sung to, and every plot keeps its plant
    const both = purseWith({ had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake" });
    const row = Object.fromEntries(KEYS.map((key) => [key, pumpkin()]));
    const did = done(rowTend(MID, KEYS, row, mine, 0, 0, both, "me", NOON, all(KEYS)));
    expect(did.each.length).toBe(7);
    expect(did.got).toEqual([["pumpkin", 21]]);
    for (const key of KEYS) expect(sungTo(row[key], did.plots[key])).toBe(true);
    expect(usesLeft(did.purse, "famMandrake", NOON)).toBe(0);
    expect(did.bed).toEqual({ ...mine, tended: NOON });
  });

  it("the hourglass hastens the bearing more as it does any wait; a pest may come to it while it waits, as to any plant that is not ripe", () => {
    const waits = plant({ crop: "pumpkin", sown: NOON - 150 * HOUR, picked: 1, pickedAt: NOON, more: 1, guard: NOON + 999 * HOUR });
    expect(growing({ ...waits, fast: [NOON + HOUR] }, NOON + 66 * HOUR - 1).ripe).toBe(false);
    expect(growing({ ...waits, fast: [NOON + HOUR] }, NOON + 66 * HOUR).ripe).toBe(true);
    // (unguarded, over three days of waiting, some plot's pumpkin is struck; ripe again, none is)
    const struck = Array.from({ length: 49 }, (_, i) => pestAt(`${BX + (i % 7)},${BY + Math.floor(i / 7)}`, { ...waits, guard: 0 }, NOON + 71 * HOUR)).filter((t) => t !== null);
    expect(struck.length).toBeGreaterThan(5);
    expect(struck.every((t) => t! >= NOON && t! < NOON + 72 * HOUR)).toBe(true);
    // (and a plant never sung to, picked as often as its kind is, is spent: nothing of this touches it)
    expect(growing(plant({ crop: "pumpkin", sown: NOON - 150 * HOUR, picked: 1, pickedAt: NOON }), NOON + 99 * HOUR)).toEqual({ stage: 5, ripe: false, spent: true });
    expect(moreOf(plant())).toBe(0);
    expect(moreOf(plant({ more: 1 }))).toBe(1);
    expect(moreOf({ ...plant(), more: "1" as unknown as number })).toBe(0);
  });
});
