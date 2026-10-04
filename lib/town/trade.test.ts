import { describe, expect, it } from "vitest";
import { oddsOf } from "./fishing";
import { FISH, FLOTSAM_IDS } from "./items";
import { INSIDE, foundScrolls } from "./scrolls";
import {
  GOODS, ITEMS, RULES, SHELF, buy, change, collect, handOf, held, hold, leave, letGo, mayBuy, mayChange, newPurse, newStall, nextRoundAt, onShelf,
  leftOf, roomFor, roomy, roundOf, roundStart, takeBack, waiting, weekOf, type Purse, type Stall,
} from "./trade";

/** A moment by Bangkok's clock. */
const at = (s: string) => Date.parse(`${s}+07:00`);
/** Saturday the 3rd of October 2026, mid-morning: inside the round that began at 07:00. */
const NOW = at("2026-10-03T10:00:00");
const rich = (coins = 1000): Purse => ({ ...newPurse({ profile: 247, gallery: 31 }), coins });
/** Frozen all the way down: a rule that changed what it was given would throw. */
function frozen<T>(v: T): T {
  if (v && typeof v === "object") { Object.values(v).forEach(frozen); Object.freeze(v); }
  return v;
}

describe("what the stall has", () => {
  it("prices every thing on the shelf, with stock for the village and a limit for each", () => {
    expect([...SHELF].sort()).toEqual(Object.keys(GOODS).sort());
    for (const id of SHELF) {
      const it = ITEMS[id], g = GOODS[id]!;
      expect(g.price).toBeGreaterThan(0);
      // nothing is made by selling the uncle his own goods back
      expect(it.pays).toBeLessThan(g.price);
      expect(g.each).toBeGreaterThanOrEqual(1);
      expect(g.stock).toBeGreaterThanOrEqual(g.each);
      expect(it.stack).toBeGreaterThanOrEqual(1);
    }
    // a tool is one to a slot
    for (const id of SHELF) if (ITEMS[id].kind === "tool") expect(ITEMS[id].stack).toBe(1);
    // what the stall does not sell cannot be bought
    expect(buy(rich(), newStall(), "koi", 1, NOW)).toEqual({ ok: false, why: "none" });
  });
});

describe("the uncle's rounds, and the banker's week", () => {
  it("begins a round at 07:00 and at 19:00 in Bangkok", () => {
    expect(RULES.rounds).toEqual([7, 19]);
    const morning = roundOf(at("2026-10-03T07:00:00"));
    expect(roundOf(at("2026-10-03T06:59:59"))).toBe(morning - 1);
    expect(roundOf(at("2026-10-03T18:59:59"))).toBe(morning);
    expect(roundOf(at("2026-10-03T19:00:00"))).toBe(morning + 1);
    // the evening's round runs on past midnight, to the next morning
    expect(roundOf(at("2026-10-04T03:00:00"))).toBe(morning + 1);
    expect(roundOf(at("2026-10-04T07:00:00"))).toBe(morning + 2);
  });

  it("says when a round began and when the next comes", () => {
    for (const t of [NOW, at("2026-10-03T23:30:00"), at("2026-10-04T02:00:00"), at("2026-12-31T19:00:00")]) {
      const r = roundOf(t);
      expect(roundStart(r)).toBeLessThanOrEqual(t);
      expect(roundStart(r + 1)).toBeGreaterThan(t);
      expect(nextRoundAt(t)).toBe(roundStart(r + 1));
      expect(roundOf(roundStart(r))).toBe(r);
      expect(roundOf(roundStart(r) - 1)).toBe(r - 1);
    }
    expect(nextRoundAt(NOW)).toBe(at("2026-10-03T19:00:00"));
    expect(nextRoundAt(at("2026-10-03T22:00:00"))).toBe(at("2026-10-04T07:00:00"));
  });

  it("begins a week on Monday's first minute in Bangkok", () => {
    // the 5th of October 2026 is a Monday
    const week = weekOf(at("2026-10-05T00:00:00"));
    expect(weekOf(at("2026-10-04T23:59:59"))).toBe(week - 1);
    expect(weekOf(at("2026-10-11T23:59:59"))).toBe(week);
    expect(weekOf(at("2026-10-12T00:00:00"))).toBe(week + 1);
    expect(weekOf(NOW)).toBe(week - 1);
  });
});

describe("the bag", () => {
  it("has ten slots to begin with (the owner: \"เพิ่ม กระเป๋าเริ่มต้นจาก 5 เป็น 10 ช่อง\"), and a tool takes one like anything else", () => {
    const p = newPurse();
    expect(p.bag).toHaveLength(10);
    expect(RULES.slots).toBe(10);
    expect(roomFor(p.bag, "rod")).toBe(10);
    expect(roomFor(p.bag, "worm")).toBe(10 * ITEMS.worm.stack);
    // a bag kept from when it began with five is given the slots it lacks, and keeps what is in it where it is
    const old: Purse = { ...p, bag: [{ item: "rod", n: 1 }, null, { item: "worm", n: 3 }, null, null] };
    expect(roomy(old).bag).toEqual([{ item: "rod", n: 1 }, null, { item: "worm", n: 3 }, null, null, null, null, null, null, null]);
    // as much again as what is worn carries; a bag that is big enough already is left alone
    expect(roomy({ ...old, wears: ["basket"] }).bag).toHaveLength(10 + 5);
    expect(roomy(p)).toBe(p);
    const big: Purse = { ...p, bag: Array<null>(24).fill(null) };
    expect(roomy(big)).toBe(big);
    let purse = rich(), stall = newStall();
    for (const tool of ["rod", "hoe", "can", "pot"] as const) {
      const r = buy(purse, stall, tool, 1, NOW);
      expect(r.ok).toBe(true);
      if (r.ok) ({ purse, stall } = r);
    }
    // four tools: the other slots are left for everything else
    expect(purse.bag.filter(Boolean)).toHaveLength(4);
    expect(roomFor(purse.bag, "worm")).toBe((RULES.slots - 4) * ITEMS.worm.stack);
    expect(roomFor(purse.bag, "rod")).toBe(RULES.slots - 4);
  });

  it("stacks things of a kind in a slot, and starts another when it is full", () => {
    let purse = rich(), stall = newStall();
    const get = (n: number, now = NOW) => { const r = buy(purse, stall, "seedKangkong", n, now); expect(r.ok).toBe(true); if (r.ok) ({ purse, stall } = r); };
    get(6);
    expect(purse.bag).toEqual([{ item: "seedKangkong", n: 6 }, ...Array<null>(RULES.slots - 1).fill(null)]);
    // two more the next round (eight a round each): four fill the first slot, the rest start a second
    get(2);
    get(8, at("2026-10-03T19:30:00"));
    expect(purse.bag.slice(0, 3)).toEqual([{ item: "seedKangkong", n: 10 }, { item: "seedKangkong", n: 6 }, null]);
    expect(held(purse.bag, "seedKangkong")).toBe(16);
  });
});

describe("buying from the uncle", () => {
  it("takes the coins, fills the bag, and takes it off the stall for everybody", () => {
    const purse = frozen(rich(100)), stall = frozen(newStall());
    const r = buy(purse, stall, "rod", 1, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purse.coins).toBe(100 - GOODS.rod!.price);
    expect(held(r.purse.bag, "rod")).toBe(1);
    expect(onShelf(r.stall, "rod", NOW)).toBe(GOODS.rod!.stock - 1);
    // somebody else, with a purse of their own, finds one fewer
    expect(mayBuy(rich(), r.stall, "rod", NOW).n).toBe(1);
    expect(onShelf(stall, "rod", NOW)).toBe(GOODS.rod!.stock);
  });

  it("lets one person buy only so many of a thing in a round", () => {
    let purse = rich(), stall = newStall();
    const first = buy(purse, stall, "worm", GOODS.worm!.each, NOW);
    expect(first.ok).toBe(true);
    if (first.ok) ({ purse, stall } = first);
    expect(mayBuy(purse, stall, "worm", NOW)).toEqual({ n: 0, stop: "each" });
    expect(buy(purse, stall, "worm", 1, NOW)).toEqual({ ok: false, why: "each" });
    // the stall itself still has plenty, for the others
    expect(onShelf(stall, "worm", NOW)).toBe(GOODS.worm!.stock - GOODS.worm!.each);
  });

  it("sells out, for the whole village, until the next round", () => {
    let stall = newStall();
    // six different people each buy the one rod they may
    for (let i = 0; i < GOODS.rod!.stock; i++) {
      const r = buy(rich(), stall, "rod", 1, NOW);
      expect(r.ok).toBe(true);
      if (r.ok) stall = r.stall;
    }
    expect(onShelf(stall, "rod", NOW)).toBe(0);
    expect(buy(rich(), stall, "rod", 1, NOW)).toEqual({ ok: false, why: "sold" });
    // the relatives come at 19:00: the stall is full again, and so is what each may buy
    const evening = at("2026-10-03T19:00:00");
    expect(onShelf(stall, "rod", evening)).toBe(GOODS.rod!.stock);
    const again = buy(rich(), stall, "rod", 1, evening);
    expect(again.ok).toBe(true);
    if (again.ok) expect(onShelf(again.stall, "rod", evening)).toBe(GOODS.rod!.stock - 1);
  });

  it("refuses what cannot be paid for, carried, or counted", () => {
    expect(buy(rich(59), newStall(), "rod", 1, NOW)).toEqual({ ok: false, why: "coins" });
    let purse = rich(), stall = newStall();
    for (const tool of ["rod", "hoe", "can", "pot"] as const) { const r = buy(purse, stall, tool, 1, NOW); if (r.ok) ({ purse, stall } = r); }
    const worms = buy(purse, stall, "worm", 5, NOW);
    if (worms.ok) ({ purse, stall } = worms);
    // every slot taken (four tools, the worms, and old boots in the rest): seeds have nowhere to go, though worms still fit their own stack
    purse = { ...purse, bag: purse.bag.map((s) => s ?? { item: "boot", n: 1 }) };
    expect(buy(purse, stall, "seedChili", 1, NOW)).toEqual({ ok: false, why: "full" });
    expect(mayBuy(purse, stall, "seedChili", NOW)).toEqual({ n: 0, stop: "full" });
    expect(buy(purse, stall, "worm", 2, NOW).ok).toBe(true);
    for (const n of [0, -1, 1.5, NaN]) expect(buy(rich(), newStall(), "worm", n, NOW)).toEqual({ ok: false, why: "amount" });
  });
});

describe("selling through the uncle", () => {
  const withSeeds = (): { purse: Purse; stall: Stall } => {
    const r = buy(rich(100), newStall(), "seedCabbage", 4, NOW);
    if (!r.ok) throw new Error(r.why);
    return r;
  };

  it("takes what is left out of the bag at once, and pays nothing yet", () => {
    const { purse } = withSeeds();
    const r = leave(frozen(purse), 0, 3, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purse.bag[0]).toEqual({ item: "seedCabbage", n: 1 });
    expect(r.purse.coins).toBe(purse.coins);
    expect(waiting(r.purse, NOW)).toEqual({ held: [{ item: "seedCabbage", n: 3, pays: ITEMS.seedCabbage.pays, round: roundOf(NOW) }], fetched: [], coins: 0 });
    expect(collect(r.purse, NOW)).toEqual({ ok: false, why: "nothing" });
    // the whole of a slot empties it
    const all = leave(purse, 0, 4, NOW);
    expect(all.ok && all.purse.bag[0]).toBeNull();
    // and more of the same in the same round is one lot
    const more = leave(r.purse, 0, 1, NOW);
    expect(more.ok && more.purse.left).toEqual([{ item: "seedCabbage", n: 4, pays: ITEMS.seedCabbage.pays, round: roundOf(NOW) }]);
  });

  it("gives it back while the uncle still has it", () => {
    const { purse } = withSeeds();
    const gone = leave(purse, 0, 4, NOW);
    if (!gone.ok) throw new Error(gone.why);
    const back = takeBack(frozen(gone.purse), 0, at("2026-10-03T18:59:00"));
    expect(back.ok).toBe(true);
    if (back.ok) { expect(held(back.purse.bag, "seedCabbage")).toBe(4); expect(back.purse.left).toEqual([]); }
    // after the relatives have come it is theirs
    expect(takeBack(gone.purse, 0, at("2026-10-03T19:00:00"))).toEqual({ ok: false, why: "gone" });
  });

  it("pays once the relatives have come, when it is collected, and once only", () => {
    const { purse } = withSeeds();
    const gone = leave(purse, 0, 4, NOW);
    if (!gone.ok) throw new Error(gone.why);
    const evening = at("2026-10-03T19:00:00"), due = 4 * ITEMS.seedCabbage.pays;
    expect(waiting(gone.purse, at("2026-10-03T18:59:59")).coins).toBe(0);
    expect(waiting(gone.purse, evening).coins).toBe(due);
    // the money waits: a week later it is all still there
    expect(waiting(gone.purse, at("2026-10-10T12:00:00")).coins).toBe(due);
    const paid = collect(frozen(gone.purse), evening);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.coins).toBe(due);
    expect(paid.purse.coins).toBe(purse.coins + due);
    expect(paid.purse.left).toEqual([]);
    expect(collect(paid.purse, evening)).toEqual({ ok: false, why: "nothing" });
    // less than was paid for them: nothing is made by it
    expect(due).toBeLessThan(4 * GOODS.seedCabbage!.price);
  });

  it("keeps what was left later apart from what is already fetched", () => {
    let { purse } = withSeeds();
    const a = leave(purse, 0, 2, NOW);
    if (a.ok) purse = a.purse;
    const evening = at("2026-10-03T20:00:00");
    const b = leave(purse, 0, 1, evening);
    if (b.ok) purse = b.purse;
    const w = waiting(purse, evening);
    expect(w.fetched.map((l) => l.n)).toEqual([2]);
    expect(w.held.map((l) => l.n)).toEqual([1]);
    const paid = collect(purse, evening);
    expect(paid.ok && paid.purse.left).toEqual(w.held);
    // what is not there cannot be left, nor more than there is
    expect(leave(purse, 3, 1, NOW)).toEqual({ ok: false, why: "none" });
    expect(leave(purse, 0, 9, NOW)).toEqual({ ok: false, why: "none" });
    expect(leave(purse, 0, 0, NOW)).toEqual({ ok: false, why: "amount" });
    // what fetches nothing is nobody's to sell: a basket of one's own weaving, a scroll he sells himself
    for (const item of ["basket", "scrollGrilledFish"] as const) {
      expect(ITEMS[item].pays).toBe(0);
      expect(leave({ ...newPurse(), bag: [{ item, n: 1 }, null, null, null, null] }, 0, 1, NOW)).toEqual({ ok: false, why: "unwanted" });
    }
    // what a line brings up that is no fish fetches a little, every one of them (the owner, 2026-10-04): an old boot
    // what a minnow does; nothing early more than the cheapest fish but the things that are made into something
    for (const id of FLOTSAM_IDS) expect(ITEMS[id].pays).toBeGreaterThan(0);
    expect(ITEMS.boot.pays).toBe(ITEMS.minnow.pays);
    const boot = leave({ ...newPurse(), bag: [{ item: "boot", n: 2 }, null, null, null, null] }, 0, 2, NOW);
    expect(boot.ok && boot.purse.left).toEqual([{ item: "boot", n: 2, pays: 3, round: roundOf(NOW) }]);
    // …and what opens is worth less sold shut than what is in it fetches on average, so that opening it is still the better guess
    for (const id of ["boot", "bottle", "chest"] as const) {
      const all = foundScrolls(INSIDE[id]!.tiers), inside = INSIDE[id]!.chance * all.reduce((t, s) => t + ITEMS[s].pays, 0) / all.length;
      expect(ITEMS[id].pays).toBeLessThan(inside);
    }
    // a bite on the early baits is worth next to nothing more for it: all that is no fish comes to a few hundredths of the fish
    for (const bait of ["worm", "dough"] as const) {
      let fish = 0, junk = 0;
      for (let hour = 0; hour < 24; hour++) for (const o of oddsOf(bait, hour)) { if (o.what in FISH) fish += o.p * ITEMS[o.what].pays; else junk += o.p * ITEMS[o.what].pays; }
      expect(junk / fish).toBeLessThan(0.03);
    }
  });
});

describe("changing popoto at the bank", () => {
  it("gives five coins a popoto, and the popoto really go", () => {
    const purse = frozen(newPurse({ profile: 247, gallery: 31 }));
    const r = change(purse, "profile", 4, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coins).toBe(4 * RULES.rate);
    expect(r.purse.coins).toBe(20);
    expect(r.purse.popoto).toEqual({ profile: 243, gallery: 31 });
    expect(mayChange(r.purse, NOW)).toBe(RULES.weekly - 4);
  });

  it("stops at twenty a week, both kinds together, until Monday", () => {
    let purse = newPurse({ profile: 247, gallery: 31 });
    const a = change(purse, "profile", 15, NOW);
    if (a.ok) purse = a.purse;
    const b = change(purse, "gallery", 5, NOW);
    if (b.ok) purse = b.purse;
    expect(purse.coins).toBe(100);
    expect(mayChange(purse, NOW)).toBe(0);
    expect(change(purse, "gallery", 1, at("2026-10-04T23:59:59"))).toEqual({ ok: false, why: "cap" });
    const monday = at("2026-10-05T00:00:00");
    expect(mayChange(purse, monday)).toBe(RULES.weekly);
    const c = change(purse, "gallery", 1, monday);
    expect(c.ok && c.purse.popoto.gallery).toBe(25);
    expect(c.ok && mayChange(c.purse, monday)).toBe(RULES.weekly - 1);
  });

  it("refuses more popoto than there are, and what is not a whole number of them", () => {
    const purse = newPurse({ profile: 3, gallery: 2.7 });
    expect(change(purse, "profile", 4, NOW)).toEqual({ ok: false, why: "popoto" });
    // a share of a picture's popoto is not a popoto: only whole ones are changed
    expect(change(purse, "gallery", 3, NOW)).toEqual({ ok: false, why: "popoto" });
    const two = change(purse, "gallery", 2, NOW);
    expect(two.ok && two.purse.popoto.gallery).toBeCloseTo(0.7);
    for (const n of [0, -2, 0.5]) expect(change(purse, "profile", n, NOW)).toEqual({ ok: false, why: "amount" });
    expect(change(purse, "profile", 21, NOW)).toEqual({ ok: false, why: "cap" });
  });
});

describe("the hand", () => {
  const withBag = (bag: Purse["bag"]): Purse => frozen({ ...newPurse(), bag });

  it("holds anything from the bag, which stays in the bag (the owner: \"ของทุกชิ้นสามารถ กดใส่เพื่อถือในมือได้\")", () => {
    const purse = withBag([{ item: "rod", n: 1 }, { item: "minnow", n: 3 }, null, null, null]);
    expect(handOf(purse)).toBeNull();
    for (const [slot, item] of [[0, "rod"], [1, "minnow"]] as const) {
      const done = hold(purse, slot);
      expect(done.ok && handOf(done.purse)).toBe(item);
      // nothing left the bag for it
      expect(done.ok && done.purse.bag).toEqual(purse.bag);
    }
    // every thing there is can be held
    for (const id of Object.keys(ITEMS) as Array<keyof typeof ITEMS>) {
      const one = hold(withBag([{ item: id, n: 1 }]), 0);
      expect(one.ok && handOf(one.purse)).toBe(id);
    }
    expect(hold(purse, 2)).toEqual({ ok: false, why: "none" });
    expect(hold(purse, 9)).toEqual({ ok: false, why: "none" });
  });

  it("is empty again when the thing is put away, or when the last of it has left the bag", () => {
    const taken = hold(withBag([{ item: "minnow", n: 2 }, null, null, null, null]), 0);
    if (!taken.ok) throw new Error("not held");
    expect(handOf(letGo(taken.purse))).toBeNull();
    // one of the two left to be sold: still held; the second: no longer
    const one = leave(taken.purse, 0, 1, NOW);
    expect(one.ok && handOf(one.purse)).toBe("minnow");
    const none = one.ok ? leave(one.purse, 0, 1, NOW) : one;
    expect(none.ok && handOf(none.purse)).toBeNull();
    // and a purse from before there were hands has none
    expect(handOf(newPurse())).toBeNull();
  });
});

describe("how long until the relatives come (the owner, 2026-10-04: \"ช่วยทำให้ขึ้นเวลาด้วยว่า รอบต่อไปที่เงินจะเข้าเหลือเวลาอีกเท่าไหร่\")", () => {
  it("is counted down in hours and minutes, and by the second under ten minutes", () => {
    // ten in the morning: they come at seven in the evening
    const at = nextRoundAt(NOW);
    expect(leftOf(at - NOW)).toEqual({ h: 9, m: 0, s: null });
    expect(leftOf(2 * 3_600_000 + 15 * 60_000 + 30_000)).toEqual({ h: 2, m: 15, s: null });
    expect(leftOf(59 * 60_000 + 59_000)).toEqual({ h: 0, m: 59, s: null });
    expect(leftOf(10 * 60_000)).toEqual({ h: 0, m: 10, s: null });
    expect(leftOf(9 * 60_000 + 59_000)).toEqual({ h: 0, m: 9, s: 59 });
    expect(leftOf(60_000)).toEqual({ h: 0, m: 1, s: 0 });
    // (a second begun is a second left: nothing says none while there is some)
    expect(leftOf(1_500)).toEqual({ h: 0, m: 0, s: 2 });
    expect(leftOf(1)).toEqual({ h: 0, m: 0, s: 1 });
    expect(leftOf(0)).toEqual({ h: 0, m: 0, s: 0 });
    expect(leftOf(-5_000)).toEqual({ h: 0, m: 0, s: 0 });
    // the moment they come, the next time is half a day off
    expect(leftOf(nextRoundAt(at) - at)).toEqual({ h: 12, m: 0, s: null });
    expect(leftOf(nextRoundAt(at - 1) - (at - 1))).toEqual({ h: 0, m: 0, s: 1 });
  });
});
