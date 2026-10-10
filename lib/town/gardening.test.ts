import { describe, expect, it } from "vitest";
import { GARDEN_CROPS, GARDEN_ITEMS, GARDEN_TOOLS, type GardenCropId } from "./garden-items";
import { GARDEN, gardenCross, gardenMods, gardenRoom, gardenShape, gardenTend, syncGarden } from "./gardening";
import { deedFor, glassTurn, gnomeWater, pick, rowFor, rowTend, type FarmSky, type Plant, type Plot } from "./farm";
import { CROPS, type CropId, type ItemId } from "./items";
import { held, hold, newPurse, type Purse } from "./trade";
import { dayOf } from "./stamina";
import { bedCorner } from "./world";
import { sources, usesOf } from "./uses";

const NOW = Date.UTC(2026, 9, 10, 5), [bx, by] = bedCorner(0), key = `${bx + 2},${by + 2}`;
const sky: FarmSky = [];
const base = (items: ItemId[] = []): Purse => ({ ...newPurse(), bag: [...items.map(item => ({ item, n: 1 })), ...Array(12).fill(null)], stamina: { day: dayOf(NOW), left: 100 } });
const ripe = (crop: CropId): Plant => ({ by: "me", crop, sown: NOW - CROPS[crop].hours * 3600000, boost: 0, watered: 0, fed: 0, guard: NOW + 3600000, cured: 0, picked: 0, pickedAt: 0 });
const bed = { by: "me", tended: NOW, empty: 0 };
const space = () => Object.fromEntries(Array.from({ length: 49 }, (_, i) => [`${bx + i % 7},${by + Math.floor(i / 7)}`, { soil: "tilled", plant: null }])) as Record<string, Plot>;
const holding = (p: Purse, id: ItemId) => { const d = hold(p, p.bag.findIndex(s => s?.item === id)); if (!d.ok) throw new Error("cannot hold"); return d.purse; };
describe("sprawling gardens", () => {
  it("has 25 usable, obtainable additions and eight accompanying seeds", () => {
    expect(Object.keys(GARDEN_ITEMS)).toHaveLength(25);
    const from = sources();
    for (const id of Object.keys(GARDEN_ITEMS) as ItemId[]) expect(from.has(id), id).toBe(true);
    for (const id of GARDEN_TOOLS) expect(usesOf(id)).toContain("garden");
    expect(Object.keys(GARDEN_CROPS)).toHaveLength(8);
  });
  it("rotates footprints without crossing the bed or consuming a seed on an occupied cell", () => {
    for (const crop of Object.keys(GARDEN_CROPS) as GardenCropId[]) for (let r = 0; r < 4; r++) expect(gardenShape(key, crop, r)).toHaveLength(GARDEN.shapes[crop].length);
    expect(gardenShape(key, "rowBean", 4)).toBeNull();
    expect(gardenShape(`${bx},${by}`, "rowBean", 2)).toBeNull();
    const p = holding(base(["seedBottleGourd"]), "seedBottleGourd"), plots = space(), before = structuredClone(p);
    plots[`${bx + 3},${by + 2}`].plant = ripe("corn");
    expect(gardenTend(key, plots, bed, 1, 0, p, "me", NOW, sky)).toEqual({ ok: false, why: "soil" });
    expect(p).toEqual(before);
  });
  it("reserves every cell and refuses a second harvest from the same plant", () => {
    const p = holding(base(["seedRowBean"]), "seedRowBean"), planted = gardenTend(key, space(), bed, 0, 0, p, "me", NOW, sky);
    expect(planted.ok).toBe(true); if (!planted.ok) return;
    const plots = { ...space(), ...planted.plots }, root = { ...ripe("rowBean"), ...planted.plot.plant!, sown: ripe("rowBean").sown, guard: NOW + 3600000 };
    plots[key] = { soil: "tilled", plant: root };
    const synced = syncGarden(plots), second = root.footprint![1];
    expect(deedFor(second, synced[second], null, "me", NOW, "me", sky)).toBeNull();
    expect(pick(second, base(), synced[second], true, null, NOW, sky).ok).toBe(false);
    const d = gardenTend(key, synced, bed, 1, 0, base(), "me", NOW, sky);
    expect(d.ok).toBe(true); if (!d.ok) return;
    expect(held(d.purse.bag, "rowBean")).toBeGreaterThan(0);
    expect(gardenTend(key, { ...synced, ...d.plots }, bed, 1, 0, d.purse, "me", NOW, sky).ok).toBe(false);
  });
  it("records a ripe neighbour cross once and keeps bag failures atomic", () => {
    const plots = space(), next = `${bx + 3},${by + 2}`;
    plots[key] = { soil: "tilled", plant: ripe("longBean") }; plots[next] = { soil: "tilled", plant: ripe("basil") };
    expect(gardenCross(key, plots, "me", NOW, sky)).toBe("rowBean");
    const d = gardenTend(key, plots, bed, 1, 0, base(["graftKnife"]), "me", NOW, sky);
    expect(d.ok).toBe(true); if (!d.ok) return;
    expect(held(d.purse.bag, "seedRowBean")).toBe(2);
    expect(d.purse.gardenBook).toEqual(["rowBean"]);
    expect(gardenCross(key, { ...plots, ...d.plots }, "me", NOW, sky)).toBeNull();
    const p = { ...base(), bag: [{ item: "longBean" as const, n: 1 }] }, before = structuredClone(plots);
    expect(gardenTend(key, plots, bed, 1, 0, p, "me", NOW, sky)).toEqual({ ok: false, why: "full" });
    expect(plots).toEqual(before);
  });
  it("all field tools affect distinct decisions without stacking pollen hints", () => {
    const p = base([...GARDEN_TOOLS]);
    expect(Object.values(gardenMods(p, NOW)).every(Boolean)).toBe(true);
    const withMeal = { ...p, buff: { id: "pollen" as const, until: NOW + 1000, level: 1 } };
    expect(gardenMods(withMeal, NOW).hint).toBe(gardenMods(p, NOW).hint);
    const planted = gardenTend(key, space(), bed, 0, 0, holding({ ...p, bag: [{ item: "seedRowBean", n: 1 }, ...p.bag] }, "seedRowBean"), "me", NOW, sky);
    expect(planted.ok).toBe(true); if (planted.ok) expect(planted.plot.plant?.boost).toBe(GARDEN.boost);
  });
  it("does not let a row gift bypass multi-plot placement or clear other members' plants", () => {
    const p = holding(base(["seedRowBean"]), "seedRowBean");
    expect(rowFor(key, Object.keys(space()), space(), p, "me", NOW, "me", sky)).toBeNull();
    const plots = space(); plots[key].plant = ripe("rowBean");
    expect(gardenTend(key, plots, { ...bed, by: "friend" }, 0, 0, base(), "me", NOW, sky).ok).toBe(false);
  });
  it("whole-bed gifts care for a sprawling plant once at its root", () => {
    const cells = gardenShape(key, "bottleGourd", 0)!, plots = space();
    plots[key].plant = { ...ripe("bottleGourd"), sown: NOW - 3600000, root: key, footprint: cells };
    const planted = syncGarden(plots);
    const glass = glassTurn(planted, { ...base(), gifts: { had: ["thingHourglass"], charms: [] } }, "me", NOW, "me", sky);
    expect(glass.ok).toBe(true); if (!glass.ok) return;
    expect(glass.quickened).toEqual([key]);
    const quickened = syncGarden({ ...planted, ...glass.plots });
    for (const cell of cells) expect(quickened[cell].plant?.fast).toEqual([NOW]);
    const gnome = gnomeWater(0, planted, { ...base(), gifts: { had: ["famGnome"], charms: [], familiar: "famGnome" } }, "me", NOW, "me", sky);
    expect(gnome.ok).toBe(true); if (!gnome.ok) return;
    expect(gnome.watered).toEqual([key]);
    for (const cell of cells) expect(syncGarden({ ...planted, ...gnome.plots })[cell].plant?.watered).toBe(NOW);
  });
  it("the sickle removes vertical reservations and rests the bed after the last root", () => {
    const cells = gardenShape(key, "blueCorn", 1)!, plots = space(), next = `${bx + 3},${by + 2}`;
    plots[key].plant = { ...ripe("blueCorn"), root: key, footprint: cells };
    plots[next].plant = ripe("corn");
    const planted = syncGarden(plots), keys = Object.keys(plots).filter(k => k.split(",")[1] === String(by + 2));
    const p = { ...base(["gardenTwine"]), gifts: { had: ["charmSickle"], charms: ["charmSickle"] } };
    const did = rowTend(key, keys, planted, bed, 2, 0, p, "me", NOW, { [key]: true, [next]: true }, sky);
    expect(did.ok).toBe(true); if (!did.ok) return;
    expect(did.each.map(e => e.key)).toEqual([key, next]);
    expect(did.bed?.empty).toBe(NOW);
    expect(cells.every(k => did.plots[k]?.plant === null)).toBe(true);
    expect(did.got.find(([id]) => id === "blueCorn")?.[1]).toBe(held(did.purse.bag, "blueCorn"));
  });
});
