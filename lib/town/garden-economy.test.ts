import { describe, expect, it } from "vitest";
import { BOWL, CROPS, DISHES, ITEMS, type CropId, type ItemId } from "./items";
import { GARDEN_CROPS, GARDEN_MAKES, type GardenCropId } from "./garden-items";
import { GARDEN } from "./gardening";
import { GOODS, leave, lotWorth, newPurse, roundOf } from "./trade";

// Nominal gross value over the full plant lifetime, without weather, bonuses,
// seed proceeds or failed harvests. Crop hours use the game's own time scale.
function grossPerCellHour(id: CropId) {
  const crop = CROPS[id], picks = crop.picks ?? 1;
  const lifetime = crop.hours + (crop.again ?? 0) * (picks - 1);
  const cells = GARDEN.shapes[id as GardenCropId]?.length ?? 1;
  return ITEMS[id].pays * (crop.yield[0] + crop.yield[1]) / 2 * picks / (cells * lifetime);
}
const inputValue = (needs: readonly (readonly [ItemId, number])[]) =>
  needs.reduce((sum, [id, n]) => sum + n * Math.max(ITEMS[id].pays, GOODS[id]?.price ?? 0), 0);

describe("garden base prices reward the extra growing work", () => {
  for (const [a, b, child] of GARDEN.crosses) {
    it(`${child} pays more per item and per occupied cell-hour than its parents`, () => {
      expect(ITEMS[child].pays).toBeGreaterThan(Math.max(ITEMS[a].pays, ITEMS[b].pays));
      const ratio = grossPerCellHour(child) / Math.max(grossPerCellHour(a), grossPerCellHour(b));
      // Gourd's per-item floor lifts its ratio close to two; the rest stay near 1.5.
      expect(ratio).toBeGreaterThanOrEqual(1.45);
      expect(ratio).toBeLessThanOrEqual(2);
    });
  }
  it("covers every hybrid and keeps seed/capacity rules separate from crop value", () => {
    expect(new Set(GARDEN.crosses.map(([, , child]) => child)).size).toBe(Object.keys(GARDEN_CROPS).length);
    for (const crop of Object.values(GARDEN_CROPS)) expect(ITEMS[crop.seed].pays).toBe(4);
  });
  for (const [id, recipe] of Object.entries(GARDEN_MAKES)) {
    it(`${id} adds value to a successful preparation batch`, () => {
      expect(ITEMS[id as ItemId].pays * recipe.gives).toBeGreaterThanOrEqual(inputValue(recipe.needs) * 1.15);
    });
  }
  const ingredients = new Set<string>([...Object.keys(GARDEN_CROPS), ...Object.keys(GARDEN_MAKES)]);
  const affectedDishes = Object.entries(DISHES).filter(([, dish]) => dish.recipe?.needs.some(([id]) => ingredients.has(id)));
  it("finds all six meals affected by the garden ingredients", () => {
    expect(affectedDishes.map(([id]) => id).sort()).toEqual([
      "pollenRice", "berryTea", "blueCornCake", "lotusGardenSoup", "orchardSoup", "rootStew",
    ].sort());
  });
  for (const [id, dish] of affectedDishes) {
    it(`${id} adds value per ordinary successful recipe pot`, () => {
      const bowls = dish.recipe!.serves * GOODS[BOWL]!.price;
      expect(ITEMS[id as ItemId].pays * dish.recipe!.serves).toBeGreaterThanOrEqual((inputValue(dish.recipe!.needs) + bowls) * 1.15);
    });
  }
  it("lists new crops at the new base without repricing or merging an old lot", () => {
    const now = 1_000_000, p = newPurse({ profile: 0, gallery: 0 });
    p.bag[0] = { item: "blueCorn", n: 1 };
    const old = { item: "blueCorn" as const, n: 2, pays: 8, round: roundOf(now), f: 80 };
    p.left = [old];
    const listed = leave(p, 0, 1, now, 80);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.purse.left).toHaveLength(2);
    expect(listed.purse.left[0]).toEqual(old);
    expect(lotWorth(listed.purse.left[0])).toBeCloseTo(12.8);
    expect(listed.purse.left[1].pays).toBe(ITEMS.blueCorn.pays);
    expect(listed.purse.left[1].f).toBe(80);
    expect(listed.purse.coins).toBe(p.coins);
  });
});
