import { describe, expect, it } from "vitest";
import { CROPS, DISHES, FISH, ITEMS, MAKES, type CropId, type DishId, type FishId, type ItemId } from "./items";
import { HINT_IDS, buyHint } from "./hints";
import { BASIC, ORDER, UNLOCKS, give, newVillage, orderOf, shelfOf, sourcesAt, wantsFor, type Village } from "./orders";
import { dayOf } from "./stamina";
import { GOODS, buy, newPurse, newStall, put, type Purse } from "./trade";
import { sources } from "./uses";

const NOW = Date.parse("2026-10-04T09:00:00+07:00"), DAY = 24 * 3_600_000;
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const slotOf = (p: Purse, id: ItemId) => p.bag.findIndex((s) => s?.item === id);
/** Bring the uncle all he wants of today's order, from a bag conjured for it. Gives the village as it is afterwards, and what was opened. */
function fill(village: Village, now: number): { village: Village; opened: ItemId | null } {
  let v = village, opened: ItemId | null = null;
  for (const w of orderOf(v, now).wants) {
    const p = purseWith([w.item, w.n]), d = done(give(p, v, slotOf(p, w.item), w.n, now));
    v = d.village;
    opened = d.opened ?? opened;
  }
  return { village: v, opened };
}

describe("the uncle's shelf (the owner: \"เราเอาของ basic ขึ้นมาก่อน แล้วค่อยๆปลดล็อคไปดีกว่า\")", () => {
  it("begins with the basic things, and everything else he ever sells is opened by an order, each once", () => {
    const all = Object.keys(GOODS) as ItemId[];
    expect(new Set([...BASIC, ...UNLOCKS]).size).toBe(BASIC.length + UNLOCKS.length);
    expect([...BASIC, ...UNLOCKS].sort()).toEqual([...all].sort());
    // (twenty-one, and the scroll of the cure for pests: the owner, 2026-10-04; and a net for insects, 2026-10-05)
    expect(BASIC.length).toBe(23);
    expect(UNLOCKS.length).toBe(all.length - 23);
    // the basic things are the early game's; what is opened comes tier by tier
    for (const id of BASIC) expect(ITEMS[id].tier).toBe(1);
    const tiers = UNLOCKS.map((id) => ITEMS[id].tier);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    // first of all, the early seeds that were to be found in the wild
    expect(UNLOCKS.slice(0, 6).every((id) => ITEMS[id].kind === "seed" && ITEMS[id].tier === 1)).toBe(true);
    expect(shelfOf(0)).toEqual(BASIC);
    expect(shelfOf(1)).toEqual([...BASIC, UNLOCKS[0]]);
    expect(shelfOf(999).length).toBe(all.length);
    expect(shelfOf(-3)).toEqual(BASIC);
  });

  it("sells only what is open", () => {
    const rich: Purse = { ...newPurse(), coins: 10_000 }, stall = newStall();
    expect(buy(rich, stall, "rod", 1, NOW, shelfOf(0)).ok).toBe(true);
    expect(buy(rich, stall, "seedGarlic", 1, NOW, shelfOf(0))).toEqual({ ok: false, why: "none" });
    expect(buy(rich, stall, "seedGarlic", 1, NOW, shelfOf(1)).ok).toBe(true);
    expect(buy(rich, stall, "rodMaster", 1, NOW, shelfOf(40))).toEqual({ ok: false, why: "none" });
    // (with no shelf named, the whole of it: the rule as it was)
    expect(buy(rich, stall, "rodMaster", 1, NOW).ok).toBe(true);
  });

  it("opens more to do with each thing: what cannot be had at first can be had later", () => {
    const first = sources(shelfOf(0));
    for (const id of ["minnow", "kangkong", "friedMinnow", "fishSauce", "basket"] as const) expect(first.has(id)).toBe(true);
    // (a gourami was one of these until 2026-10-05: it takes a cricket, and a cricket is now caught with a net on the
    // first day, as the owner allowed; a snail takes only the ball of bran his shelf opens later)
    for (const id of ["garlic", "stirKangkong", "curryPaste", "snail", "khantoke"] as const) expect(first.has(id)).toBe(false);
    expect(first.get("cricket")).toBe("net");
    expect(first.has("gourami")).toBe(true);
    expect(sources(shelfOf(0), false).has("gourami")).toBe(false);
    const second = sources(shelfOf(1));
    expect(second.has("garlic")).toBe(true);
    expect(second.has("stirKangkong")).toBe(true);
    // with everything open, everything in the game can be had
    expect(sources(shelfOf(UNLOCKS.length)).size).toBe(Object.keys(ITEMS).length);
  });
});

describe("the uncle's hints, with a shelf that is not whole yet", () => {
  it("are only of what can be made with what he sells so far", () => {
    const at = sourcesAt(0);
    let purse: Purse = { ...newPurse(), coins: 100_000 };
    const heard: ItemId[] = [];
    for (;;) { const d = buyHint(purse, [], (id) => at.has(id)); if (!d.ok) { expect(d.why).toBe("none"); break; } heard.push(d.hint); purse = d.purse; }
    expect(heard.length).toBeGreaterThanOrEqual(6);
    expect(heard.length).toBeLessThan(HINT_IDS.length);
    for (const id of heard) expect(at.has(id)).toBe(true);
    expect(heard).toContain("friedMinnow");
    expect(heard).toContain("basket");
    expect(heard).not.toContain("stirKangkong");
    // one more thing open, more to hint at
    const then = sourcesAt(1);
    expect(buyHint(purse, [], (id) => then.has(id)).ok).toBe(true);
  });
});

describe("the uncle's order (the owner: \"ลุงขายของ จะมีเควส รายวันปลดล็อคของในร้านทีละอย่าง\")", () => {
  it("is three things a day, each of which can be had with what he sells so far: never an order nobody can fill", () => {
    for (let stage = 0; stage <= UNLOCKS.length; stage++) {
      const from = sources(shelfOf(stage)), shelf = shelfOf(stage), top = Math.max(...shelf.map((id) => ITEMS[id].tier));
      for (let day = 20000; day < 20030; day++) {
        const wants = wantsFor(day, stage);
        expect(wants.length).toBe(3);
        expect(new Set(wants.map(([id]) => id)).size).toBe(3);
        for (const [item, n] of wants) {
          expect(from.has(item)).toBe(true);
          expect(ITEMS[item].pays).toBeGreaterThan(0);
          expect(ITEMS[item].stack).toBeGreaterThan(1);
          const kind = item in FISH ? "fish" : item in CROPS ? "crop" : "made";
          expect(n).toBeGreaterThanOrEqual(ORDER.n[kind][0]);
          expect(n).toBeLessThanOrEqual(ORDER.n[kind][1]);
          // nothing rare, nothing slow, nothing that takes a crowd
          if (kind === "fish") expect(FISH[item as FishId].tier).toBe("common");
          if (kind === "crop") { expect(CROPS[item as CropId].hours).toBeLessThanOrEqual(ORDER.ripe); expect(shelf).toContain(CROPS[item as CropId].seed); }
          if (kind === "made") {
            const r = item in DISHES ? DISHES[item as DishId].recipe! : { ...MAKES[item]!, cooks: 1 };
            expect(r.cooks).toBeLessThanOrEqual(ORDER.cooks);
            // nothing of a later tier than his shelf has reached
            expect(ITEMS[item].tier).toBeLessThanOrEqual(top);
            for (const tool of r.in) expect(shelf).toContain(tool);
          }
        }
      }
    }
  }, 30_000);

  it("is the same for everybody on a day, and not the same day after day", () => {
    expect(wantsFor(20001, 0)).toEqual(wantsFor(20001, 0));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(wantsFor(20000 + i, 0))));
    expect(seen.size).toBeGreaterThan(10);
    // on the first day there is something from the river, something from the plots and something from the kitchen
    const kinds = wantsFor(dayOf(NOW), 0).map(([id]) => (id in FISH ? "fish" : id in CROPS ? "crop" : "made"));
    expect(kinds).toEqual(["fish", "crop", "made"]);
  });

  it("is filled by the whole village between them, each paid on the spot for what they bring", () => {
    let village = newVillage();
    const order = orderOf(village, NOW), [first] = order.wants;
    expect(order.wants.every((w) => w.got === 0)).toBe(true);
    expect(order.filled).toBe(false);
    expect(order.opens).toBe(UNLOCKS[0]);
    // one member brings two of the first thing
    const a = purseWith([first.item, 3]), one = done(give(a, village, slotOf(a, first.item), 2, NOW));
    expect(one.given).toBe(2);
    expect(one.coins).toBe(2 * ITEMS[first.item].pays);
    expect(one.purse.coins).toBe(one.coins);
    expect(one.purse.bag[slotOf(a, first.item)]).toEqual({ item: first.item, n: 1 });
    expect(one.opened).toBeNull();
    village = one.village;
    expect(orderOf(village, NOW).wants[0].got).toBe(2);
    // another brings more than is still wanted: only what is wanted is taken
    const b = purseWith([first.item, 20]), two = done(give(b, village, slotOf(b, first.item), 20, NOW));
    expect(two.given).toBe(first.n - 2);
    expect(two.purse.bag[slotOf(b, first.item)]!.n).toBe(20 - (first.n - 2));
    village = two.village;
    // that thing is filled: no more of it is wanted; nor anything that is not on the order, nor nothing at all
    expect(give(b, village, slotOf(b, first.item), 1, NOW)).toEqual({ ok: false, why: "unwanted" });
    const rod = purseWith(["rod", 1]);
    expect(give(rod, village, 0, 1, NOW)).toEqual({ ok: false, why: "unwanted" });
    expect(give(newPurse(), village, 0, 1, NOW)).toEqual({ ok: false, why: "none" });
    expect(give(b, village, slotOf(b, first.item), 0, NOW)).toEqual({ ok: false, why: "amount" });
  });

  it("opens one more thing on the shelf the day it is filled, and only one", () => {
    const filled = fill(newVillage(), NOW);
    expect(filled.opened).toBe(UNLOCKS[0]);
    expect(filled.village.unlocked).toBe(1);
    const after = orderOf(filled.village, NOW);
    expect(after.filled).toBe(true);
    expect(after.opens).toBeNull();
    // the day's order is still the one it began with, and wants no more
    expect(after.wants.map((w) => [w.item, w.n])).toEqual(orderOf(newVillage(), NOW).wants.map((w) => [w.item, w.n]));
    const p = purseWith([after.wants[0].item, 5]);
    expect(give(p, filled.village, 0, 1, NOW)).toEqual({ ok: false, why: "unwanted" });
    // the next day there is a new order, with nothing brought yet, and it opens the next thing
    const tomorrow = orderOf(filled.village, NOW + DAY);
    expect(tomorrow.wants.every((w) => w.got === 0)).toBe(true);
    expect(tomorrow.opens).toBe(UNLOCKS[1]);
    // a day that is not filled opens nothing: two of the three brought, and the count stays
    let half = filled.village;
    for (const w of tomorrow.wants.slice(0, 2)) { const q = purseWith([w.item, w.n]); half = done(give(q, half, 0, w.n, NOW + DAY)).village; }
    expect(half.unlocked).toBe(1);
    expect(orderOf(half, NOW + 2 * DAY).opens).toBe(UNLOCKS[1]);
    expect(orderOf(half, NOW + 2 * DAY).wants.every((w) => w.got === 0)).toBe(true);
  });

  it("opens the whole shelf, a day at a time, and then only pays", () => {
    let village = newVillage();
    for (let day = 0; day < UNLOCKS.length; day++) {
      const d = fill(village, NOW + day * DAY);
      expect(d.opened).toBe(UNLOCKS[day]);
      village = d.village;
    }
    expect(village.unlocked).toBe(UNLOCKS.length);
    expect(shelfOf(village.unlocked).length).toBe(Object.keys(GOODS).length);
    const last = fill(village, NOW + UNLOCKS.length * DAY);
    expect(last.opened).toBeNull();
    expect(last.village.unlocked).toBe(UNLOCKS.length);
    expect(orderOf(last.village, NOW + UNLOCKS.length * DAY).filled).toBe(true);
  }, 30_000);
});
