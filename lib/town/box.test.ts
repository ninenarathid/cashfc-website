import { describe, expect, it } from "vitest";
import { BOX, fits, nearBox, newBox, roomyBox, stow, unstow, type Box } from "./box";
import { ITEMS, type ItemId } from "./items";
import { handOf, held, hold, newPurse, put, type Purse, type Stack } from "./trade";
import { BENCHES, FOUNTAIN, PLAZA, PROPS, STOREBOX, findPath, thingAt, walkable } from "./world";

const purseWith = (slots: number, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, coins: 50, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(slots).fill(null) as Purse["bag"]) };
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
/** A tile beside the box. */
const BY: [number, number] = [STOREBOX.x + 1, STOREBOX.y + 1];
const count = (slots: Array<Stack | null>, id: ItemId) => held(slots, id);

describe("the storage box in the plaza (the owner: \"กล่องเก็บของ มาตั้งไว้กลางเมือง เก็บได้ฟรี 10 ชิ้น\")", () => {
  it("has ten slots for nothing, all of them empty to begin with", () => {
    expect(BOX.slots).toBe(10);
    const box = newBox();
    expect(box.things).toHaveLength(10);
    expect(box.things.every((s) => s === null)).toBe(true);
    expect(box.more).toBe(0);
  });

  it("takes what is put away out of the bag, and gives it back", () => {
    const purse = purseWith(10, ["kangkong", 12], ["minnow", 3]);
    const put1 = done(stow(purse, newBox(), 0, 12, BY));
    expect(put1.item).toBe("kangkong");
    expect(put1.n).toBe(12);
    expect(count(put1.purse.bag, "kangkong")).toBe(0);
    expect(put1.purse.bag[0]).toBeNull();
    expect(put1.box.things[0]).toEqual({ item: "kangkong", n: 12 });
    // the other things stay where they were, and nothing else of the purse changes
    expect(put1.purse.bag[1]).toEqual({ item: "minnow", n: 3 });
    expect({ ...put1.purse, bag: null }).toEqual({ ...purse, bag: null });
    const back = done(unstow(put1.purse, put1.box, 0, 12, BY));
    expect(count(back.purse.bag, "kangkong")).toBe(12);
    expect(back.box.things.every((s) => s === null)).toBe(true);
  });

  it("takes a part of a stack, and stacks what is put away onto its own kind", () => {
    const purse = purseWith(10, ["kangkong", 20], ["kangkong", 15]);
    expect(ITEMS.kangkong.stack).toBe(20);
    let did = done(stow(purse, newBox(), 1, 5, BY));
    expect(did.purse.bag[1]).toEqual({ item: "kangkong", n: 10 });
    expect(did.box.things[0]).toEqual({ item: "kangkong", n: 5 });
    // a whole stack onto those five: fifteen fill the slot, the other five begin the next
    did = done(stow(did.purse, did.box, 0, 20, BY));
    expect(did.box.things.slice(0, 3)).toEqual([{ item: "kangkong", n: 20 }, { item: "kangkong", n: 5 }, null]);
    expect(count(did.purse.bag, "kangkong") + count(did.box.things, "kangkong")).toBe(35);
    // and a part taken out again goes onto the bag's own stack
    const out = done(unstow(did.purse, did.box, 0, 7, BY));
    expect(out.box.things[0]).toEqual({ item: "kangkong", n: 13 });
    expect(count(out.purse.bag, "kangkong")).toBe(17);
  });

  it("keeps a thing that holds something as it is: a pot with its food, a can with its water", () => {
    const pot: Stack = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, can: Stack = { item: "can", n: 1, water: 5 }, dry: Stack = { item: "can", n: 1, water: 0 };
    const purse: Purse = { ...newPurse(), bag: [pot, can, dry, null, null] };
    let did = done(stow(purse, newBox(), 0, 1, BY));
    did = done(stow(did.purse, did.box, 1, 1, BY));
    did = done(stow(did.purse, did.box, 2, 1, BY));
    expect(did.box.things.slice(0, 3)).toEqual([pot, can, dry]);
    expect(did.purse.bag.every((s) => s === null)).toBe(true);
    // out again, each into a slot of its own, with what it held
    let out = done(unstow(did.purse, did.box, 1, 1, BY));
    out = done(unstow(out.purse, out.box, 0, 1, BY));
    expect(out.purse.bag.slice(0, 2)).toEqual([can, pot]);
    expect(out.box.things.slice(0, 3)).toEqual([null, null, dry]);
  });

  it("is only for whoever stands by it", () => {
    const purse = purseWith(10, ["minnow", 3]);
    expect(nearBox(BY)).toBe(true);
    expect(nearBox([STOREBOX.x - BOX.reach, STOREBOX.y])).toBe(true);
    // (not from the box's own tile, where nobody can stand; nor from a step further off)
    expect(nearBox([STOREBOX.x, STOREBOX.y])).toBe(false);
    expect(nearBox([STOREBOX.x + BOX.reach + 1, STOREBOX.y])).toBe(false);
    const far: [number, number] = [STOREBOX.x + BOX.reach + 1, STOREBOX.y];
    expect(stow(purse, newBox(), 0, 3, far)).toEqual({ ok: false, why: "far" });
    const kept = done(stow(purse, newBox(), 0, 3, BY));
    expect(unstow(kept.purse, kept.box, 0, 3, far)).toEqual({ ok: false, why: "far" });
    expect(unstow(kept.purse, kept.box, 0, 3, [0, 0])).toEqual({ ok: false, why: "far" });
  });

  it("refuses what is not there and a number that is none", () => {
    const purse = purseWith(10, ["minnow", 3]), box = newBox();
    for (const slot of [1, -1, 99, 0.5, NaN]) expect(stow(purse, box, slot, 1, BY)).toEqual({ ok: false, why: "none" });
    for (const n of [0, -1, 1.5, 4, NaN, Infinity]) expect(stow(purse, box, 0, n, BY)).toEqual({ ok: false, why: "amount" });
    const kept = done(stow(purse, box, 0, 3, BY));
    for (const slot of [1, -1, 99, 0.5]) expect(unstow(kept.purse, kept.box, slot, 1, BY)).toEqual({ ok: false, why: "none" });
    for (const n of [0, -1, 1.5, 4]) expect(unstow(kept.purse, kept.box, 0, n, BY)).toEqual({ ok: false, why: "amount" });
  });

  it("is packed when it has no room, and says how many of a thing still fit", () => {
    // ten slots, nine of them taken by things that do not stack, and one by seventeen of a thing that stacks to twenty
    const tools: ItemId[] = ["rod", "hoe", "can", "pot", "pan", "grill", "bucket", "bugNet", "bowl"];
    const box: Box = { more: 0, things: [...tools.map((item): Stack => ({ item, n: 1 })), { item: "kangkong", n: 17 }] };
    const purse = purseWith(10, ["kangkong", 8], ["minnow", 2], ["apron", 1]);
    expect(fits(box.things, purse.bag[0]!)).toBe(3);
    expect(fits(box.things, purse.bag[1]!)).toBe(0);
    expect(stow(purse, box, 0, 8, BY)).toEqual({ ok: false, why: "packed" });
    expect(stow(purse, box, 1, 1, BY)).toEqual({ ok: false, why: "packed" });
    expect(stow(purse, box, 2, 1, BY)).toEqual({ ok: false, why: "packed" });
    const did = done(stow(purse, box, 0, 3, BY));
    expect(did.box.things[9]).toEqual({ item: "kangkong", n: 20 });
    expect(did.purse.bag[0]).toEqual({ item: "kangkong", n: 5 });
    // a thing that holds something wants a slot of its own
    expect(fits([null, { item: "can", n: 1 }], { item: "can", n: 1, water: 3 })).toBe(1);
    expect(fits([{ item: "can", n: 1 }], { item: "can", n: 1, water: 3 })).toBe(0);
  });

  it("gives nothing back to a bag with no room for it", () => {
    const tools: ItemId[] = ["rod", "hoe", "can", "pot", "pan"];
    const purse: Purse = { ...newPurse(), bag: tools.map((item): Stack => ({ item, n: 1 })) };
    const box: Box = { more: 0, things: [{ item: "minnow", n: 4 }, ...Array<null>(9).fill(null)] };
    expect(unstow(purse, box, 0, 4, BY)).toEqual({ ok: false, why: "full" });
    // with room for some of them: so many, and no more
    const some: Purse = { ...purse, bag: [...purse.bag.slice(0, 4), { item: "minnow", n: ITEMS.minnow.stack - 2 }] };
    expect(fits(some.bag, box.things[0]!)).toBe(2);
    expect(unstow(some, box, 0, 3, BY)).toEqual({ ok: false, why: "full" });
    expect(done(unstow(some, box, 0, 2, BY)).box.things[0]).toEqual({ item: "minnow", n: 2 });
  });

  it("empties the hand of a thing put away to the last, and fills it again when the thing comes back", () => {
    const purse = done(hold(purseWith(10, ["rod", 1], ["minnow", 2]), 0)).purse;
    expect(handOf(purse)).toBe("rod");
    const away = done(stow(purse, newBox(), 0, 1, BY));
    expect(handOf(away.purse)).toBeNull();
    expect(handOf(done(unstow(away.purse, away.box, 0, 1, BY)).purse)).toBe("rod");
  });

  it("has more slots when it is given more, and is never made smaller", () => {
    expect(roomyBox(newBox()).things).toHaveLength(BOX.slots);
    const grown = roomyBox({ ...newBox(), more: 5 });
    expect(grown.things).toHaveLength(BOX.slots + 5);
    // what is in it stays where it is, and the new slots take things
    const purse = purseWith(10, ["minnow", 3]);
    const full: Box = { more: 1, things: Array.from({ length: BOX.slots }, (): Stack => ({ item: "rod", n: 1 })) };
    const did = done(stow(purse, full, 0, 3, BY));
    expect(did.box.things).toHaveLength(BOX.slots + 1);
    expect(did.box.things[BOX.slots]).toEqual({ item: "minnow", n: 3 });
    // a box that was once bigger keeps every slot it has
    const big: Box = { more: 0, things: Array<null>(BOX.slots + 3).fill(null) };
    expect(roomyBox(big)).toBe(big);
    expect(roomyBox({ more: -4, things: Array<null>(BOX.slots).fill(null) }).things).toHaveLength(BOX.slots);
  });

  it("makes nothing and loses nothing, whatever is moved in whatever order", () => {
    let a = 20261005;
    const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const ids: ItemId[] = ["kangkong", "minnow", "rod", "worm", "koi", "cabbage", "bowl"];
    let purse = purseWith(10, ["kangkong", 31], ["minnow", 20], ["rod", 1], ["worm", 20], ["koi", 1], ["cabbage", 10], ["bowl", 1]);
    purse = { ...purse, bag: purse.bag.map((s, i) => (i === 9 ? { item: "can", n: 1, water: 4 } : s)) };
    let box = newBox(), moved = 0;
    const all = (id: ItemId) => count(purse.bag, id) + count(box.things, id);
    const was = Object.fromEntries([...ids, "can" as ItemId].map((id) => [id, all(id)]));
    for (let i = 0; i < 4000; i++) {
      const slot = Math.floor(rnd() * 12) - 1, n = Math.floor(rnd() * 22), did = rnd() < 0.5 ? stow(purse, box, slot, n, BY) : unstow(purse, box, slot, n, BY);
      if (!did.ok) continue;
      purse = did.purse; box = did.box; moved++;
      // no stack is over its own number, none is of nothing, and neither the bag nor the box has changed its size
      for (const s of [...purse.bag, ...box.things]) if (s) { expect(s.n).toBeGreaterThan(0); expect(s.n).toBeLessThanOrEqual(ITEMS[s.item].stack); }
      expect(purse.bag).toHaveLength(10);
      expect(box.things).toHaveLength(BOX.slots);
    }
    expect(moved).toBeGreaterThan(500);
    expect(Object.fromEntries([...ids, "can" as ItemId].map((id) => [id, all(id)]))).toEqual(was);
    // (the can still has its water, wherever it is)
    expect([...purse.bag, ...box.things].find((s) => s?.item === "can")).toEqual({ item: "can", n: 1, water: 4 });
  });
});

describe("where the box stands", () => {
  it("is in the plaza, in front of the fountain, and is the last thing laid out", () => {
    expect(STOREBOX.x).toBeGreaterThanOrEqual(PLAZA.x);
    expect(STOREBOX.x).toBeLessThan(PLAZA.x + PLAZA.w);
    expect(STOREBOX.y).toBeGreaterThanOrEqual(PLAZA.y);
    expect(STOREBOX.y).toBeLessThan(PLAZA.y + PLAZA.h);
    // (nearer the viewer than the fountain, on its diagonal: straight below it on the screen)
    expect(STOREBOX.x - (FOUNTAIN.x + FOUNTAIN.w / 2)).toBe(STOREBOX.y - (FOUNTAIN.y + FOUNTAIN.h / 2));
    expect(STOREBOX.x).toBeGreaterThan(FOUNTAIN.x + FOUNTAIN.w);
    expect(PROPS[PROPS.length - 1]).toEqual({ kind: "storebox", x: STOREBOX.x, y: STOREBOX.y, solid: true });
    expect(PROPS.filter((p) => p.kind === "storebox")).toHaveLength(1);
    // nothing else stood there, and the town's benches are numbered as they were (somebody sitting is told by the number)
    expect(PROPS.filter((p) => p.x === STOREBOX.x && p.y === STOREBOX.y)).toHaveLength(1);
    expect(BENCHES.slice(0, 8).map((b) => [b.x, b.y])).toEqual([[31, 28], [32, 28], [28, 31], [28, 32], [35, 31], [35, 32], [31, 35], [32, 35]]);
  });

  it("is not walked through, and shuts no way: the tiles about it are stood on and walked to as before", () => {
    expect(walkable(STOREBOX.x, STOREBOX.y)).toBe(false);
    expect(thingAt(STOREBOX.x, STOREBOX.y)).toBe("prop");
    // (one of the eight about it is the bin at the end of the benches; the other seven are open, and each is walked
    // to from across the plaza. So nothing laid out from where one may walk moved when the box came: no tile lost its
    // last open neighbour, and no way was cut. The database's copies of such layouts are held to the code by v134's
    // dry run.)
    const from = { x: PLAZA.x + 1, y: PLAZA.y + PLAZA.h - 2 };
    let open = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const x = STOREBOX.x + dx, y = STOREBOX.y + dy;
      if (!walkable(x, y)) continue;
      open++;
      expect(nearBox([x, y])).toBe(true);
      expect(findPath(from, { x, y }), `a way to ${x},${y}`).not.toBeNull();
    }
    expect(open).toBe(7);
    // and everywhere it is reached from that can be stood on is in the plaza
    let stood = 0;
    for (let x = STOREBOX.x - BOX.reach; x <= STOREBOX.x + BOX.reach; x++) for (let y = STOREBOX.y - BOX.reach; y <= STOREBOX.y + BOX.reach; y++) {
      if (!walkable(x, y)) continue;
      stood++;
      expect(nearBox([x, y])).toBe(true);
    }
    expect(stood).toBeGreaterThanOrEqual(16);
  });
});
