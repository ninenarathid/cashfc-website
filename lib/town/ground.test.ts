import { describe, expect, it } from "vitest";
import { GROUND, GROUND_MAPS, drop, lying, pickUp, reaches, type Dropped } from "./ground";
import { ITEMS, type ItemId } from "./items";
import { handOf, held, hold, newPurse, put, type Purse, type Stack } from "./trade";
import { FARM, FOREST, placeOf } from "./world";

const purseWith = (slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, coins: 50, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const HERE: [number, number] = [30, 40], NOW = Date.parse("2026-10-06T09:00:00+07:00");

describe("things dropped on the ground (the owner: \"ทิ้งของที่ไม่ใช้จากกระเป๋าได้ ลงพื้น คนอื่นเก็บได้ … ไม่มีคนเก็บจะหายไปใน 10 วิ\")", () => {
  it("lie for ten seconds", () => {
    expect(GROUND.lasts).toBe(10);
  });

  it("takes the whole of a slot out of the bag and lays it where its holder stands", () => {
    const purse = purseWith(10, ["kangkong", 12], ["minnow", 3]);
    const did = done(drop(purse, 0, "me", HERE, NOW, 7));
    expect(did.dropped).toEqual({ id: 7, by: "me", stack: { item: "kangkong", n: 12 }, at: HERE, until: NOW + 10_000 });
    expect(did.purse.bag[0]).toBeNull();
    expect(did.purse.bag[1]).toEqual({ item: "minnow", n: 3 });
    // nothing else of the purse changes: no coin, no stamina
    expect({ ...did.purse, bag: null }).toEqual({ ...purse, bag: null });
  });

  it("drops a thing that holds something as it is, and the thing in the hand out of the hand", () => {
    const pot: Stack = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, can: Stack = { item: "can", n: 1, water: 5 };
    const purse: Purse = { ...done(hold({ ...newPurse(), bag: [pot, can, { item: "rod", n: 1 }, null, null] }, 2)).purse };
    expect(handOf(purse)).toBe("rod");
    expect(done(drop(purse, 0, "me", HERE, NOW, 1)).dropped.stack).toEqual(pot);
    expect(done(drop(purse, 1, "me", HERE, NOW, 2)).dropped.stack).toEqual(can);
    expect(handOf(done(drop(purse, 2, "me", HERE, NOW, 3)).purse)).toBeNull();
  });

  it("drops nothing out of an empty slot, a slot that is none, or onto no map", () => {
    const purse = purseWith(10, ["minnow", 3]);
    for (const slot of [1, -1, 99, 0.5, NaN]) expect(drop(purse, slot, "me", HERE, NOW, 1)).toEqual({ ok: false, why: "none" });
    for (const at of [[-1, 5], [64, 5], [100, 100], [3.5, 4], [NaN, 4]] as Array<[number, number]>) expect(drop(purse, 0, "me", at, NOW, 1)).toEqual({ ok: false, why: "none" });
    // every map is one a thing may be dropped on, and the boxes the database is told are those maps
    for (const at of [[0, 0], [63, 63], [FARM.x, FARM.y], [FARM.x + FARM.w - 1, FARM.y + FARM.h - 1], [FOREST.x, FOREST.y], [FOREST.x + FOREST.w - 1, FOREST.y + FOREST.h - 1]] as Array<[number, number]>) {
      expect(done(drop(purse, 0, "me", at, NOW, 1)).dropped.at).toEqual(at);
    }
    const inBoxes = (x: number, y: number) => GROUND_MAPS.some(([bx, by, w, h]) => x >= bx && y >= by && x < bx + w && y < by + h);
    for (let x = -2; x < 260; x += 3) for (let y = -2; y < 200; y += 3) expect(inBoxes(x, y), `${x},${y}`).toBe(placeOf(x, y) !== null);
  });

  it("is picked up by anybody who stands by it, all of it at once", () => {
    const thing = done(drop(purseWith(10, ["kangkong", 12]), 0, "me", HERE, NOW, 1)).dropped;
    const other = purseWith(10, ["kangkong", 15], ["rod", 1]);
    for (const at of [[30, 40], [31, 41], [29, 40], [30, 39], [31, 39]] as Array<[number, number]>) expect(reaches(thing, at)).toBe(true);
    for (const at of [[32, 40], [30, 42], [28, 38], [0, 0]] as Array<[number, number]>) {
      expect(reaches(thing, at)).toBe(false);
      expect(pickUp(other, thing, at, NOW + 1000)).toEqual({ ok: false, why: "far" });
    }
    const did = done(pickUp(other, thing, [31, 41], NOW + 1000));
    expect(did.item).toBe("kangkong");
    expect(did.n).toBe(12);
    // onto their own stack first, then into an empty slot
    expect(did.purse.bag.slice(0, 3)).toEqual([{ item: "kangkong", n: 20 }, { item: "rod", n: 1 }, { item: "kangkong", n: 7 }]);
    expect({ ...did.purse, bag: null }).toEqual({ ...other, bag: null });
  });

  it("is picked up again by whoever dropped it, as it was: a pot with its food, a can with its water", () => {
    const pot: Stack = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, can: Stack = { item: "can", n: 1, water: 5 };
    const purse: Purse = { ...newPurse(), bag: [pot, can, null] };
    const a = done(drop(purse, 0, "me", HERE, NOW, 1)), b = done(drop(a.purse, 1, "me", HERE, NOW, 2));
    expect(b.purse.bag.every((s) => s === null)).toBe(true);
    const back = done(pickUp(done(pickUp(b.purse, b.dropped, HERE, NOW + 9999)).purse, a.dropped, HERE, NOW + 9999));
    expect(back.purse.bag).toEqual([can, pot, null]);
  });

  it("is gone after ten seconds, and for whoever comes second", () => {
    const thing = done(drop(purseWith(10, ["minnow", 3]), 0, "me", HERE, NOW, 1)).dropped;
    const other = purseWith(10);
    expect(lying([thing], NOW)).toEqual([thing]);
    expect(lying([thing], NOW + 9999)).toEqual([thing]);
    expect(lying([thing], NOW + 10_000)).toEqual([]);
    expect(done(pickUp(other, thing, HERE, NOW + 9999)).n).toBe(3);
    expect(pickUp(other, thing, HERE, NOW + 10_000)).toEqual({ ok: false, why: "lost" });
    expect(pickUp(other, thing, HERE, NOW + 60_000)).toEqual({ ok: false, why: "lost" });
    // (somebody had it first: whoever keeps the game has it no more)
    expect(pickUp(other, null, HERE, NOW + 1000)).toEqual({ ok: false, why: "lost" });
    expect(pickUp(other, undefined, [0, 0], NOW + 1000)).toEqual({ ok: false, why: "lost" });
  });

  it("stays on the ground when the bag has no room for all of it", () => {
    const thing: Dropped = { id: 1, by: "me", stack: { item: "kangkong", n: 12 }, at: HERE, until: NOW + 10_000 };
    const tools: ItemId[] = ["rod", "hoe", "can", "pot"];
    const full: Purse = { ...newPurse(), bag: [...tools.map((item): Stack => ({ item, n: 1 })), { item: "kangkong", n: ITEMS.kangkong.stack - 11 }] };
    expect(pickUp(full, thing, HERE, NOW)).toEqual({ ok: false, why: "full" });
    expect(done(pickUp({ ...full, bag: [...full.bag.slice(0, 4), { item: "kangkong", n: ITEMS.kangkong.stack - 12 }] }, thing, HERE, NOW)).purse.bag[4]).toEqual({ item: "kangkong", n: 20 });
    // a thing that holds something wants a slot of its own
    const can: Dropped = { ...thing, stack: { item: "can", n: 1, water: 2 } };
    expect(pickUp(full, can, HERE, NOW)).toEqual({ ok: false, why: "full" });
  });

  it("makes nothing and loses nothing while it is handed about; what nobody picks up is lost", () => {
    let a = 20261005;
    const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const purses: Purse[] = [purseWith(10, ["kangkong", 31], ["minnow", 20], ["rod", 1], ["worm", 20], ["koi", 1]), purseWith(10, ["cabbage", 10], ["bowl", 1], ["kangkong", 5])];
    let ground: Dropped[] = [], now = NOW, next = 1, lost = 0, handed = 0;
    const ids: ItemId[] = ["kangkong", "minnow", "rod", "worm", "koi", "cabbage", "bowl"];
    const all = (id: ItemId) => purses.reduce((n, p) => n + held(p.bag, id), 0) + ground.reduce((n, d) => n + (d.stack.item === id ? d.stack.n : 0), 0);
    const was = Object.fromEntries(ids.map((id) => [id, all(id)]));
    const gone: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      now += Math.floor(rnd() * 2500);
      // what has lain too long is lost
      for (const d of ground.filter((x) => x.until <= now)) { gone[d.stack.item] = (gone[d.stack.item] ?? 0) + d.stack.n; lost++; }
      ground = lying(ground, now);
      const who = rnd() < 0.5 ? 0 : 1;
      if (rnd() < 0.5) {
        const did = drop(purses[who], Math.floor(rnd() * 11), String(who), HERE, now, next);
        if (did.ok) { purses[who] = did.purse; ground.push(did.dropped); next++; }
      } else if (ground.length) {
        const d = ground[Math.floor(rnd() * ground.length)], did = pickUp(purses[who], d, HERE, now);
        if (did.ok) { purses[who] = did.purse; ground = ground.filter((x) => x !== d); if (d.by !== String(who)) handed++; }
      }
      for (const id of ids) expect(all(id) + (gone[id] ?? 0)).toBe(was[id]);
    }
    expect(handed).toBeGreaterThan(20);
    expect(lost).toBeGreaterThan(3);
  });
});
