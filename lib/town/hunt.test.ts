import { describe, expect, it } from "vitest";
import { DIG_SITES, FORAGING, SECRETS, SPOTS, isDayOf } from "./forest";
import { USES, giftOf, stretchOf, usedOf, usesLeft } from "./gifts";
import { CHEST_SCROLLS, DAY_RARES, HUNT, chestOf, huntArea, huntOf, huntRow, huntSite, huntTold, mapDig, mapUse, warmthOf } from "./hunt";
import { ITEMS, type ItemId } from "./items";
import { dayOf } from "./stamina";
import { GOODS, held, newPurse, type Purse } from "./trade";
import { GATES, findPath, groundAt, placeOf } from "./world";

/** 2026-10-05 12:00 in Bangkok. */
const NOON = Date.UTC(2026, 9, 5, 5), DAY = 86_400_000;
const withMap = (more: Partial<Purse> = {}): Purse => ({ ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, gifts: { had: ["thingMap"], charms: [] }, ...more });
const k = stretchOf(USES.thingMap!, NOON);

describe("a sprite's treasure map (the forest's fifth rank): a hunt for a chest, hot and cold", () => {
  it("the forest has many places a chest may be buried: open ground somebody can walk to, off the trails, clear of every place", () => {
    expect(DIG_SITES.length).toBe(180);
    const from = GATES.find((g) => g.leads === "forest")!.to;
    for (const [x, y] of DIG_SITES) {
      expect(placeOf(x, y)).toBe("forest");
      expect(["wood", "grass"]).toContain(groundAt(x, y));
      for (const s of [...SPOTS, ...SECRETS]) expect(Math.hypot(s.x - x, s.y - y)).toBeGreaterThanOrEqual(FORAGING.apart);
    }
    // (every one of them is walked to; looked at for a few, since a path is slow to find)
    for (const [x, y] of DIG_SITES.filter((_, i) => i % 15 === 0)) expect(findPath(from, { x: x + 0.5, y: y + 0.5 })).not.toBeNull();
    const far = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (const [i, a] of DIG_SITES.entries()) for (const b of DIG_SITES.slice(i + 1)) expect(far(a, b)).toBeGreaterThanOrEqual(3);
  });

  it("a map is a thing of the fifth rank, three a day; used, a hunt begins, one at a time", () => {
    expect(giftOf("thingMap")).toMatchObject({ kind: "thing", line: "forest", rank: 5 });
    expect(USES.thingMap).toEqual({ n: 3, per: "day" });
    const p = withMap();
    expect(huntOf(p, NOON)).toBeNull();
    const did = mapUse(p, NOON);
    expect(did.ok && did.left).toBe(2);
    expect(did.ok && huntOf(did.purse, NOON)).toEqual({ k, n: 1, digs: 0 });
    expect(did.ok && usedOf(did.purse, "thingMap", NOON)).toBe(1);
    // with a hunt on, another map is not used up
    expect(did.ok && mapUse(did.purse, NOON)).toEqual({ ok: false, why: "had" });
    // the second and third of the day are the second and third hunts; a fourth there is not
    const second = mapUse({ ...withMap(), gifts: { had: ["thingMap"], charms: [], used: { thingMap: { k, n: 1 } } } }, NOON);
    expect(second.ok && huntOf(second.purse, NOON)).toEqual({ k, n: 2, digs: 0 });
    expect(mapUse({ ...withMap(), gifts: { had: ["thingMap"], charms: [], used: { thingMap: { k, n: 3 } } } }, NOON)).toEqual({ ok: false, why: "spent" });
    expect(mapUse({ ...newPurse() }, NOON)).toEqual({ ok: false, why: "none" });
    // what else the forest keeps in the purse is kept
    const kept = mapUse(withMap({ forest: { secrets: [211], chests: 4 } }), NOON);
    expect(kept.ok && kept.purse.forest).toEqual({ secrets: [211], chests: 4, hunt: { k, n: 1, digs: 0 } });
  });

  it("a hunt lasts its day: by the next dawn it is gone, and the maps are three again", () => {
    const did = mapUse(withMap(), NOON);
    if (!did.ok) throw new Error("no hunt");
    expect(huntOf(did.purse, NOON + 10 * 3_600_000)).not.toBeNull();
    expect(huntOf(did.purse, NOON + DAY)).toBeNull();
    expect(usesLeft(did.purse, "thingMap", NOON + DAY)).toBe(3);
    expect(mapDig(did.purse, "w", "me", [0, 0], NOON + DAY, [0, 0])).toEqual({ ok: false, why: "none" });
    // (a hunt kept wrongly is none)
    for (const hunt of [null, undefined, "x", { k }, { k: "1", n: 1 }, { k: k - 1, n: 1, digs: 0 }]) expect(huntOf({ forest: { hunt: hunt as never } }, NOON)).toBeNull();
    expect(huntOf({ forest: { hunt: { k, n: 2, digs: -3 } } }, NOON)).toEqual({ k, n: 2, digs: 0 });
    expect(huntOf({ forest: null as never }, NOON)).toBeNull();
  });

  it("the chest is at a dig site of its own for each member, day and map, by the keeper's word; and the ring always has it inside", () => {
    const seen = new Set<string>();
    for (const me of ["a", "b", "00000000-0000-0000-0000-000000000001"]) for (const day of [k, k + 1, k + 2]) for (const n of [1, 2, 3]) for (const salt of ["w", "x"]) {
      const site = huntSite(salt, me, { k: day, n }), area = huntArea(salt, me, { k: day, n });
      expect(DIG_SITES.some(([x, y]) => x === site[0] && y === site[1])).toBe(true);
      expect(huntSite(salt, me, { k: day, n })).toEqual(site);
      expect(area.r).toBe(HUNT.radius);
      expect(Math.abs(area.x - site[0])).toBeLessThanOrEqual(HUNT.off);
      expect(Math.abs(area.y - site[1])).toBeLessThanOrEqual(HUNT.off);
      expect(Math.hypot(area.x - site[0], area.y - site[1])).toBeLessThan(area.r);
      seen.add(site.join());
    }
    // (54 hunts, and nearly as many tiles)
    expect(seen.size).toBeGreaterThan(40);
    // the ring's middle is seldom the chest
    let on = 0;
    for (let n = 1; n <= 200; n++) { const s = huntSite("w", "me", { k, n }), a = huntArea("w", "me", { k, n }); if (a.x === s[0] && a.y === s[1]) on++; }
    expect(on).toBeLessThan(8);
    const told = huntTold({ forest: { hunt: { k, n: 2, digs: 3 } } }, "w", "me", NOON);
    expect(told).toEqual({ n: 2, digs: 3, area: huntArea("w", "me", { k, n: 2 }) });
    expect(huntTold({}, "w", "me", NOON)).toBeNull();
  });

  it("a dig says how warm it was: on it, beside it, near, not far, far, cold", () => {
    const site: [number, number] = [200, 150];
    expect(warmthOf(site, [200, 150])).toBe(0);
    expect(warmthOf(site, [201, 149])).toBe(1);
    expect([[202, 150], [200, 153], [197, 147]].map((at) => warmthOf(site, at as [number, number]))).toEqual([2, 2, 2]);
    expect([[204, 150], [200, 156]].map((at) => warmthOf(site, at as [number, number]))).toEqual([3, 3]);
    expect([[207, 150], [190, 150]].map((at) => warmthOf(site, at as [number, number]))).toEqual([4, 4]);
    expect([[211, 150], [200, 20], [0, 0]].map((at) => warmthOf(site, at as [number, number]))).toEqual([5, 5, 5]);
    // from the ring's middle it is never worse than "not far", and from its rim never cold
    for (let n = 1; n <= 60; n++) {
      const s = huntSite("w", "me", { k, n }), a = huntArea("w", "me", { k, n });
      expect(warmthOf(s, [a.x, a.y])).toBeLessThanOrEqual(3);
      for (const [dx, dy] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) expect(warmthOf(s, [a.x + dx, a.y + dy])).toBeLessThanOrEqual(4);
    }
  });

  it("off the chest a dig is counted and nothing else changes; on it the chest is up, the hunt over, and it is one more chest found", () => {
    const begun = mapUse(withMap({ forest: { chests: 2 } }), NOON);
    if (!begun.ok) throw new Error("no hunt");
    const site = huntSite("w", "me", { k, n: 1 });
    const miss = mapDig(begun.purse, "w", "me", [site[0] + 2, site[1]], NOON, [0.9, 0.3]);
    expect(miss).toMatchObject({ ok: true, found: false, warm: 2, digs: 1, got: [] });
    expect(miss.ok && miss.purse.bag).toEqual(begun.purse.bag);
    expect(miss.ok && huntOf(miss.purse, NOON)).toEqual({ k, n: 1, digs: 1 });
    expect(miss.ok && miss.purse.stamina).toEqual(begun.purse.stamina);
    if (!miss.ok) throw new Error("no dig");
    const hit = mapDig(miss.purse, "w", "me", [site[0], site[1]], NOON, [0.9, 0.3]);
    expect(hit).toMatchObject({ ok: true, found: true, warm: 0, digs: 2 });
    if (!hit.ok) throw new Error("no chest");
    expect(hit.got.length).toBe(1);
    expect(held(hit.purse.bag, hit.got[0][0])).toBe(hit.got[0][1]);
    expect(hit.purse.forest).toEqual({ chests: 3, hunt: null });
    expect(huntOf(hit.purse, NOON)).toBeNull();
    expect(hit.purse.coins).toBe(begun.purse.coins);
    // the next map of the day is another hunt, somewhere else
    const next = mapUse(hit.purse, NOON);
    expect(next.ok && huntOf(next.purse, NOON)).toEqual({ k, n: 2, digs: 0 });
    // with no room in the bag the chest waits: nothing is lost
    const full = { ...miss.purse, bag: miss.purse.bag.map(() => ({ item: "rod" as ItemId, n: 1 })) };
    expect(mapDig(full, "w", "me", [site[0], site[1]], NOON, [0.9, 0.3])).toEqual({ ok: false, why: "full" });
    // with no hunt on there is nothing to dig for
    expect(mapDig(withMap(), "w", "me", [site[0], site[1]], NOON, [0, 0])).toEqual({ ok: false, why: "none" });
    // somebody else's hunt is somewhere else: the same tile is nothing to them
    const other = huntSite("w", "you", { k, n: 1 });
    expect(other.join() === site.join() ? 0 : warmthOf(other, [site[0], site[1]])).toBeGreaterThanOrEqual(0);
  });

  it("a chest holds a rare thing of the forest whose day it is, or a scroll that is only ever found: never coins", () => {
    expect(DAY_RARES.map(([id]) => id).sort()).toEqual(["starShard", "truffle", "wildOrchid"]);
    expect(CHEST_SCROLLS.length).toBeGreaterThan(20);
    for (const s of CHEST_SCROLLS) { expect(ITEMS[s].kind).toBe("scroll"); expect(GOODS[s]).toBeUndefined(); expect(ITEMS[s].tier).toBeLessThanOrEqual(2); }
    // a day with a rare thing of its own, and a day with none: found by looking
    const days = Array.from({ length: 200 }, (_, i) => NOON + i * DAY);
    const rich = days.find((t) => DAY_RARES.some(([id, day]) => isDayOf("w", id, day, t)))!, poor = days.find((t) => !DAY_RARES.some(([id, day]) => isDayOf("w", id, day, t)))!;
    const onRich = DAY_RARES.filter(([id, day]) => isDayOf("w", id, day, rich)).map(([id]) => id);
    for (const r1 of [0, 0.3, 0.6, 0.999]) {
      const [item, n] = chestOf("w", rich, [0.1, r1]);
      expect(onRich).toContain(item);
      expect(n).toBe(ITEMS[item].pays < HUNT.pair ? 2 : 1);
      expect(ITEMS[chestOf("w", rich, [HUNT.rare, r1])[0]].kind).toBe("scroll");
      expect(ITEMS[chestOf("w", poor, [0, r1])[0]].kind).toBe("scroll");
      expect(chestOf("w", poor, [0.9, r1])[1]).toBe(1);
    }
    expect(chestOf("w", poor, [0, 0])[0]).toBe(CHEST_SCROLLS[0]);
    expect(chestOf("w", poor, [0, 0.9999])[0]).toBe(CHEST_SCROLLS[CHEST_SCROLLS.length - 1]);
    // about half the days have a rare thing, and on those half the chests: a chest in four or so holds one
    const share = days.filter((t) => DAY_RARES.some(([id, day]) => isDayOf("w", id, day, t))).length / days.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.7);
  });

  it("the catalog's part has all the database needs to look up", () => {
    const row = huntRow();
    expect(row.sites).toEqual(DIG_SITES.map(([x, y]) => [x, y]));
    expect(row).toMatchObject({ off: HUNT.off, radius: HUNT.radius, bands: HUNT.bands, rare: HUNT.rare, pair: HUNT.pair, rares: DAY_RARES, scrolls: CHEST_SCROLLS });
    expect(JSON.parse(JSON.stringify(row))).toEqual(row);
  });
});
