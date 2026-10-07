import { describe, expect, it } from "vitest";
import { FARMING, dust, guardBy, hardIn, pestAt, pourFor, pourRow, see, tend, theirsAt, tiredAt, type Bed, type Plant, type Plot } from "./farm";
import { USES, giftOf, harderAt, numberOf, usesLeft } from "./gifts";
import { HEAT } from "./heat";
import { HELPING, aided, aidsOf, belled, bridged, chime, diesAt, dustUntil, pouredAs, ring, runOf, share, timesAt } from "./helping";
import { POINTS, countsOf, type Done } from "./line-points";
import { WATERS, keptAs, type Nature } from "./waters";
import { CROP_IDS, ITEMS, type ItemId } from "./items";
import { LINES } from "./lines";
import { startLong } from "./longpour";
import { startRound } from "./timing";
import { dayOf, staminaOf } from "./stamina";
import { HOUR, hold, newPurse, put, type Purse } from "./trade";
import { bedCorner, rowOf } from "./world";

/**
 * The gifts of the helpers' line (lib/town/gifts; the rules are lib/town/helping's and, where they need the farm's
 * own, lib/town/farm's). Each gift's own tests are under its name.
 */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-07T10:00:00");
const [BX, BY] = bedCorner(0);
const KEYS = rowOf(BX + 3, BY + 3).map(([x, y]) => `${x},${y}`), MID = KEYS[3];
const THEIRS: Bed = { by: "you", tended: NOON - HOUR, empty: 0 }, MINE: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
/** A purse with these gifts, a can with so many waterings in the hand, and so much stamina. */
const purse = (gifts: Purse["gifts"], water = 8, left = 100, ...more: Array<[ItemId, number]>): Purse => {
  const p = newPurse(), bag = [...more, ["can", 1] as [ItemId, number]].reduce((b, [id, n]) => put(b, id, n), Array<null>(20).fill(null) as Purse["bag"]);
  const slot = bag.findIndex((s) => s?.item === "can"), d = hold({ ...p, stamina: { day: dayOf(NOON), left }, bag: bag.map((s, i) => (i === slot && s ? { ...s, water } : s)), ...(gifts ? { gifts } : {}) }, slot);
  if (!d.ok) throw new Error("no can");
  return d.purse;
};
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "you", crop: "pumpkin", sown: NOON - 5 * HOUR, boost: 0, watered: 0, fed: 0, guard: NOON + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });
const row = (each: (i: number) => Plot | null): Record<string, Plot> => Object.fromEntries(KEYS.flatMap((k, i) => { const p = each(i); return p ? [[k, p] as [string, Plot]] : []; }));
const all = (keys: readonly string[], how = true) => Object.fromEntries(keys.map((k) => [k, how]));
const GLOVES = { had: ["charmGloves"], charms: ["charmGloves"] }, ANKLET = { had: ["charmGloves", "charmAnklet"], charms: ["charmGloves", "charmAnklet"] };
const waterLeft = (p: Purse) => p.bag.reduce((n, s) => n + (s?.item === "can" ? s.water ?? 0 : 0), 0);

describe("the gardener's gloves: work for somebody else takes no stamina, and a row of theirs is watered at one long pour", () => {
  const worn = purse(GLOVES), full = row(() => sown());

  it("says what it does now, and its number is what is left to pay: nothing", () => {
    const g = giftOf("charmGloves")!;
    expect(g.does.en).toMatch(/no stamina at all/);
    expect(g.does.th).toMatch(/ไม่เสียแรง/);
  });

  it("work in somebody else's bed takes no stamina at all: a watering, a hoe's work, a cure; and one's own costs as ever", () => {
    const watered = done(tend(MID, sown(), THEIRS, 3, 0, worn, "me", NOON));
    expect([watered.deed, staminaOf(watered.purse, NOON), waterLeft(watered.purse)]).toEqual(["water", 100, 7]);
    const mine = done(tend(MID, sown({ by: "me" }), MINE, 3, 0, worn, "me", NOON));
    expect(staminaOf(mine.purse, NOON)).toBe(100 - FARMING.costs.water);
    const bare = done(tend(MID, sown(), THEIRS, 3, 0, purse(undefined), "me", NOON));
    expect(staminaOf(bare.purse, NOON)).toBe(100 - FARMING.costs.water);
    const hoeing = purse(GLOVES, 8, 100, ["hoe", 1]), withHoe = done(hold(hoeing, hoeing.bag.findIndex((s) => s?.item === "hoe"))).purse;
    expect(staminaOf(done(tend(MID, { soil: "wild", plant: null }, THEIRS, 3, 0, withHoe, "me", NOON)).purse, NOON)).toBe(100);
    expect(staminaOf(done(tend(MID, { soil: "wild", plant: null }, MINE, 3, 0, withHoe, "me", NOON)).purse, NOON)).toBe(100 - FARMING.costs.clear);
  });

  it("what is somebody else's: a bed that is another's, or a plant another sowed", () => {
    expect([theirsAt(sown(), "you", "me"), theirsAt(sown({ by: "me" }), "you", "me"), theirsAt(sown(), "me", "me"), theirsAt(sown({ by: "me" }), "me", "me"), theirsAt(sown({ by: "me" }), null, "me"), theirsAt(undefined, null, "me")])
      .toEqual([true, true, true, false, false, false]);
  });

  it("offers the whole row of somebody else's thirsty plants, from the row's head, whichever of them is stood on", () => {
    expect(pourFor(MID, KEYS, full, worn, "me", NOON, "you")).toEqual(KEYS);
    expect(pourFor(KEYS[6], KEYS, full, worn, "me", NOON, "you")).toEqual(KEYS);
    // not the plants that are wet already, ripe and done, or dead; nor bare soil
    const mixed = row((i) => (i === 1 ? sown({ watered: NOON - 10 * 60_000 }) : i === 4 ? { soil: "tilled", plant: null } : i === 5 ? null : sown()));
    expect(pourFor(MID, KEYS, mixed, worn, "me", NOON, "you")).toEqual([KEYS[0], KEYS[2], KEYS[3], KEYS[6]]);
    // standing on a plant it would not water: nothing
    expect(pourFor(KEYS[1], KEYS, mixed, worn, "me", NOON, "you")).toEqual([]);
    expect(pourFor(`${BX + 7},${BY + 3}`, KEYS, full, worn, "me", NOON, "you")).toEqual([]);
  });

  it("is for others' plants only, with the gloves on and a can in the hand; one plant alone is no row", () => {
    expect(pourFor(MID, KEYS, row(() => sown({ by: "me" })), worn, "me", NOON, "me")).toEqual([]);
    expect(pourFor(MID, KEYS, full, purse({ had: ["charmGloves"], charms: [] }), "me", NOON, "you")).toEqual([]);
    expect(pourFor(MID, KEYS, full, purse(undefined), "me", NOON, "you")).toEqual([]);
    expect(pourFor(MID, KEYS, full, { ...worn, hand: null }, "me", NOON, "you")).toEqual([]);
    expect(pourFor(MID, KEYS, row((i) => (i === 3 ? sown() : null)), worn, "me", NOON, "you")).toEqual([]);
    // (in a bed of mine, the plants another sowed there are theirs still)
    expect(pourFor(MID, KEYS, row((i) => (i < 5 ? sown() : sown({ by: "me" }))), worn, "me", NOON, "me")).toEqual(KEYS.slice(0, 5));
  });

  it("reaches as far as the water in the can: each plant takes a watering, as ever", () => {
    expect(pourFor(MID, KEYS, full, purse(GLOVES, 4), "me", NOON, "you")).toEqual(KEYS.slice(0, 4));
    expect(pourFor(MID, KEYS, full, purse(GLOVES, 1), "me", NOON, "you")).toEqual([]);
    expect(pourFor(MID, KEYS, full, purse(GLOVES, 0), "me", NOON, "you")).toEqual([]);
  });

  it("is one deed: each plant the water reached is watered as by hand, for no stamina; the rest are left", () => {
    const marks = { ...all(KEYS.slice(0, 5)), ...all(KEYS.slice(5), false) };
    const did = done(pourRow(MID, KEYS, full, THEIRS, 3, 0, worn, "me", NOON, marks));
    expect(did.each.map((e) => e.key)).toEqual(KEYS.slice(0, 5));
    expect(did.each.every((e) => e.crop === "pumpkin" && e.times === 1)).toBe(true);
    expect(Object.keys(did.plots)).toEqual(KEYS.slice(0, 5));
    expect(Object.values(did.plots).every((p) => p.plant!.watered === NOON && p.plant!.boost === FARMING.water.adds * 60_000)).toBe(true);
    expect([staminaOf(did.purse, NOON), waterLeft(did.purse)]).toEqual([100, 3]);
    expect(did.bed).toEqual(THEIRS);
    // nothing reached: nothing done, and it is no refusal
    const none = done(pourRow(MID, KEYS, full, THEIRS, 3, 0, worn, "me", NOON, all(KEYS, false)));
    expect([none.each.length, none.purse]).toEqual([0, worn]);
    // a word of a plot that is not of the row is not heard
    expect(done(pourRow(MID, KEYS, full, THEIRS, 3, 0, worn, "me", NOON, { "1,1": true })).each).toEqual([]);
  });

  it("is refused where there is no row to pour along", () => {
    expect(pourRow(MID, KEYS, full, THEIRS, 3, 0, purse(undefined), "me", NOON, all(KEYS))).toEqual({ ok: false, why: "none" });
    expect(pourRow(MID, KEYS, row(() => sown({ by: "me" })), MINE, 3, 0, worn, "me", NOON, all(KEYS))).toEqual({ ok: false, why: "none" });
  });
});

describe("the garden fae anklet: another's plant its wearer waters grows the more, and a run of them more still", () => {
  const worn = purse(ANKLET, 40);

  it("a watering of somebody else's plant is twice over, and begins a run; one's own is as ever", () => {
    const did = done(tend(MID, sown(), THEIRS, 3, 0, worn, "me", NOON));
    expect([did.times, did.purse.chime]).toEqual([2, { n: 1, at: NOON }]);
    // (the plot is as any watering leaves it: whoever keeps the game makes it the more)
    expect(did.plot.plant!.boost).toBe(FARMING.water.adds * 60_000);
    const mine = done(tend(MID, sown({ by: "me" }), MINE, 3, 0, worn, "me", NOON));
    expect([mine.times, mine.purse.chime]).toEqual([undefined, undefined]);
    const bare = done(tend(MID, sown(), THEIRS, 3, 0, purse(GLOVES), "me", NOON));
    expect([bare.times, bare.purse.chime]).toEqual([undefined, undefined]);
  });

  it("the run grows while no more than eight seconds lie between two waterings, and begins anew after", () => {
    let p = worn;
    for (let i = 0; i < 5; i++) p = chime(p, NOON + i * 8000).purse;
    expect(p.chime).toEqual({ n: 5, at: NOON + 32000 });
    expect([runOf(p, NOON + 40000), runOf(p, NOON + 40001), runOf(p, NOON + 31999)]).toEqual([5, 0, 0]);
    expect(chime(p, NOON + 40001).purse.chime).toEqual({ n: 1, at: NOON + 40001 });
  });

  it("twenty in a row, and it is three times from then on", () => {
    let p = worn; const times: number[] = [];
    for (let i = 0; i < 22; i++) { const c = chime(p, NOON + i * 1000); times.push(c.times); p = c.purse; }
    expect(times).toEqual([...Array<number>(19).fill(2), 3, 3, 3]);
    expect([timesAt(19), timesAt(20), HELPING.anklet.run, HELPING.anklet.top]).toEqual([2, 3, 20, 3]);
  });

  it("a run kept wrongly is no run", () => {
    for (const kept of [null, "x", { n: "3", at: NOON }, { n: 3 }, { n: 0, at: NOON }, { n: 3, at: NOON + 5 }]) {
      expect(runOf({ chime: kept as unknown as Purse["chime"] }, NOON)).toBe(0);
    }
  });

  it("a row poured with the gloves counts each plant in the run, and its own seconds are not counted against it", () => {
    const full = row(() => sown());
    const first = done(pourRow(MID, KEYS, full, THEIRS, 3, 0, worn, "me", NOON, all(KEYS), 4));
    expect([first.each.map((e) => e.times), first.purse.chime]).toEqual([Array<number>(7).fill(2), { n: 7, at: NOON }]);
    // the next row eleven seconds later, four of them in the pouring: the run goes on
    const later = NOON + 11000, second = done(pourRow(MID, KEYS, full, THEIRS, 3, 0, first.purse, "me", later, all(KEYS), 4));
    expect(second.purse.chime).toEqual({ n: 14, at: later });
    // …with nothing said of the pouring it had been too long, and begins anew
    expect(done(pourRow(MID, KEYS, full, THEIRS, 3, 0, first.purse, "me", later, all(KEYS))).purse.chime).toEqual({ n: 7, at: later });
    // a third row: the twentieth plant and those after it are three times over
    const third = done(pourRow(MID, KEYS, full, THEIRS, 3, 0, second.purse, "me", later + 6000, all(KEYS), 3));
    expect(third.each.map((e) => e.times)).toEqual([2, 2, 2, 2, 2, 3, 3]);
    // what the page says of its seconds is believed only so far
    expect(bridged({ ...worn, chime: { n: 3, at: NOON } }, 9999, NOON + 60000).chime).toEqual({ n: 3, at: NOON + HELPING.anklet.long * 1000 });
    expect(bridged({ ...worn, chime: { n: 3, at: NOON } }, 5, NOON + 2000).chime).toEqual({ n: 3, at: NOON + 2000 });
    expect(bridged(purse(GLOVES), 5, NOON)).toEqual(purse(GLOVES));
  });
});

describe("a watering as it is kept: the gifts, the heat and the well's water in one sum, never past three times", () => {
  // (one in the afternoon: an hour the heat may be in)
  const T = NOON + 3 * HOUR, ADDS = FARMING.water.adds * 60_000, was = sown({ boost: 900_000, guard: T + HOUR }), next: Plot = { soil: "tilled", plant: { ...was.plant!, watered: T, boost: 900_000 + ADDS } };
  const KINDS: Array<Nature | null> = [null, "dawn", "rain", "moon"];

  it("with no gift in it, is kept as it always was under every sky and water; and the plant remembers whose watering it was", () => {
    for (const hot of [false, true]) for (const kind of KINDS) {
      const kept = pouredAs(was, next, T, hot, kind, "me");
      const { pour, ...plain } = kept.plant!;
      expect(plain).toEqual(keptAs(was, next, T, hot ? "clear" : "cloudy", kind).plant);
      expect(pour).toEqual({ by: "me", at: T, base: ADDS, x: 1 + (hot ? HEAT.by : 0) + (kind ? WATERS.adds[kind] : 0) });
    }
  });

  it("the anklet's twice and three times are of what the watering added", () => {
    expect(pouredAs(was, next, T, false, null, "me", 2).plant!.boost).toBe(900_000 + 2 * ADDS);
    expect(pouredAs(was, next, T, false, null, "me", 3).plant!.boost).toBe(900_000 + 3 * ADDS);
    expect(pouredAs(was, next, T, false, null, "me", 2).plant!.pour).toEqual({ by: "me", at: T, base: ADDS, x: 2 });
  });

  it("with whatever else makes a watering the more, the whole is never more than three times", () => {
    const x = (hot: boolean, kind: Nature | null, times: number) => pouredAs(was, next, T, hot, kind, "me", times).plant!.pour!.x;
    expect([x(true, null, 2), x(false, "dawn", 2), x(false, "rain", 2), x(true, "rain", 2), x(true, "dawn", 3), x(false, "moon", 2), x(false, "moon", 3)]).toEqual([3, 3, 3, 3, 3, 2, 3]);
    expect(HELPING.most).toBe(3);
    expect(pouredAs(was, next, T, true, "dawn", "me", 3).plant!.boost).toBe(900_000 + 3 * ADDS);
    // (the moon's water keeps the plant from pests as ever, whatever the gifts)
    expect(pouredAs(was, next, T, false, "moon", "me", 2).plant!.guard).toBe(T + WATERS.guards.moon * HOUR);
  });

  it("marks a watering by whoever wore the duet bell in a bed not their own, and leaves what is no watering as it is", () => {
    expect(pouredAs(was, next, T, false, null, "me", 1, true).plant!.pour).toEqual({ by: "me", at: T, base: ADDS, x: 1, worn: true });
    for (const other of [{ soil: "tilled", plant: { ...next.plant!, watered: T - 1 } }, { soil: "tilled", plant: { ...next.plant!, sown: 5 } }, { soil: "tilled", plant: { ...next.plant!, boost: 900_000 } }, { soil: "cleared", plant: null }] as Plot[]) {
      expect(pouredAs(was, other, T, true, "dawn", "me", 3)).toBe(other);
    }
    expect(pouredAs(undefined, next, T, false, null, "me", 2)).toBe(next);
    expect(pouredAs({ soil: "tilled", plant: { ...was.plant!, watered: T } }, next, T, false, null, "me", 2)).toBe(next);
  });
});

describe("the duet bell: two watering in the same bed within ten seconds, and both waterings count double", () => {
  const ADDS = FARMING.water.adds * 60_000;
  /** A plant of the bed's owner watered with a can by somebody, so long ago, kept so many times over. */
  const poured = (by: string, ago: number, x = 1, more: Partial<NonNullable<Plant["pour"]>> = {}): Plot =>
    sown({ watered: NOON - ago, boost: ADDS * x, pour: { by, at: NOON - ago, base: ADDS, x, ...more } });
  const [A, B, C] = KEYS;

  it("rings when a friend watered in the bed within ten seconds and one of the two wears it: both waterings are doubled, once", () => {
    const bed = { [A]: poured("me", 0), [B]: poured("pal", 4000) };
    const rang = ring(bed, [A], "me", true, NOON)!;
    expect([rang.mine, rang.pals, rang.near]).toEqual([[A], { pal: [B] }, ["pal"]]);
    expect([rang.plots[A].plant!.boost, rang.plots[B].plant!.boost]).toEqual([2 * ADDS, 2 * ADDS]);
    expect(rang.plots[B].plant!.pour).toEqual({ by: "pal", at: NOON - 4000, base: ADDS, x: 2, bell: true });
    // (the friend's watering, rung already, says only that the friend is there: mine is doubled, theirs not again)
    const again = ring({ [A]: rang.plots[A], [B]: rang.plots[B], [C]: poured("me", 0) }, [C], "me", true, NOON)!;
    expect([Object.keys(again.plots), again.pals, again.near]).toEqual([[C], {}, ["pal"]]);
  });

  it("one bell is enough: it rings for a wearer's friend who has none, whichever of them waters second", () => {
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 4000, 1, { worn: true }) }, [A], "me", false, NOON)).not.toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 4000) }, [A], "me", false, NOON)).toBeNull();
  });

  it("alone it does nothing; nor more than ten seconds apart; nor with a friend whose purse is not held", () => {
    expect(ring({ [A]: poured("me", 0), [B]: poured("me", 3000) }, [A], "me", true, NOON)).toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 10_001) }, [A], "me", true, NOON)).toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 10_000) }, [A], "me", true, NOON)).not.toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 4000) }, [A], "me", true, NOON, [])).toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: poured("pal", 4000) }, [A], "me", true, NOON, ["pal"])).not.toBeNull();
    // (a plant watered since by something that is no can, or never watered with one: no friend's watering)
    expect(ring({ [A]: poured("me", 0), [B]: sown({ watered: NOON - 100 }) }, [A], "me", true, NOON)).toBeNull();
    expect(ring({ [A]: poured("me", 0), [B]: { soil: "tilled", plant: { ...poured("pal", 4000).plant!, watered: NOON - 50 } } }, [A], "me", true, NOON)).toBeNull();
  });

  it("with the anklet's twice or the heat's, the whole is still never more than three times", () => {
    const rang = ring({ [A]: poured("me", 0, 2), [B]: poured("pal", 100, 3), [C]: poured("pal", 100, 1.5) }, [A], "me", true, NOON)!;
    expect([rang.plots[A].plant!.pour!.x, rang.plots[B].plant!.pour!.x, rang.plots[C].plant!.pour!.x]).toEqual([3, 3, 3]);
    expect([rang.plots[A].plant!.boost, rang.plots[B].plant!.boost, rang.plots[C].plant!.boost]).toEqual([3 * ADDS, 3 * ADDS, 3 * ADDS]);
  });

  it("gives two stamina back a plant, never above the full gauge, of no more plants a day than its bound", () => {
    const at = (left: number, rung?: Purse["rung"]) => ({ ...purse(undefined, 8, left), ...(rung ? { rung } : {}) });
    const day = dayOf(NOON);
    expect(belled(at(50), 7, NOON)).toMatchObject({ back: 14, purse: { stamina: { day, left: 64 }, rung: { day, n: 7 } } });
    expect(belled(at(99), 7, NOON)).toMatchObject({ back: 1, purse: { stamina: { left: 100 }, rung: { n: 1 } } });
    const full = at(100);
    expect(belled(full, 7, NOON)).toEqual({ purse: full, back: 0 });
    expect(belled(at(50, { day, n: HELPING.bell.plants - 2 }), 7, NOON)).toMatchObject({ back: 4, purse: { rung: { day, n: HELPING.bell.plants } } });
    expect(belled(at(50, { day, n: HELPING.bell.plants }), 7, NOON).back).toBe(0);
    expect(belled(at(50, { day: day - 1, n: HELPING.bell.plants }), 3, NOON)).toMatchObject({ back: 6, purse: { rung: { day, n: 3 } } });
    expect([HELPING.bell.back, HELPING.bell.within, HELPING.bell.plants]).toEqual([2, 10, 25]);
  });

  it("tells a purse of what a friend's gift did, the newest few kept", () => {
    let p = purse(undefined);
    for (let i = 0; i < HELPING.told + 3; i++) p = aided(p, { what: "bell", by: "pal", name: "Pal", n: i, at: NOON + i });
    expect(aidsOf(p).map((a) => a.n)).toEqual(Array.from({ length: HELPING.told }, (_, i) => i + 3));
    expect(aidsOf({ aided: [null, "x", { what: "ring" }, { what: "ring", by: "pal", name: "", n: 30, at: 5 }] as unknown as Purse["aided"] }).length).toBe(1);
  });

  it("counts on the helpers' line: a watering's worth more for each of somebody else's plants it rang over", () => {
    const bellOf = (n: number): Done => ({ from: "deed", what: "bell", thing: null, n, doc: {} });
    expect(countsOf(bellOf(6), "me")).toEqual([{ to: null, line: "helpers", raw: 6 * POINTS.helpers.water }]);
    expect(countsOf(bellOf(0), "me")).toEqual([]);
  });
});

describe("the ring of shared strength: thirty stamina to a friend standing near, for half of it", () => {
  const RING = { had: ["charmRing"], charms: ["charmRing"] };
  const at = (gifts: Purse["gifts"], left: number) => purse(gifts, 8, left);
  const day = dayOf(NOON);

  it("gives the friend thirty and takes fifteen, counts the day's use, and tells the friend who gave it", () => {
    const did = done(share(at(RING, 60), at(undefined, 40), "me", "Me", 1, NOON));
    expect([did.gave, did.paid, did.left, staminaOf(did.mine, NOON), staminaOf(did.theirs, NOON)]).toEqual([30, 15, USES.charmRing!.n - 1, 45, 70]);
    expect(aidsOf(did.theirs)).toEqual([{ what: "ring", by: "me", name: "Me", n: 30, at: NOON }]);
    expect(usesLeft(did.mine, "charmRing", NOON)).toBe(2);
    expect([numberOf("charmRing"), HELPING.ring.part, USES.charmRing]).toEqual([30, 0.5, { n: 3, per: "day" }]);
  });

  it("never lifts the friend above the full gauge: what would be over is not given and not paid for", () => {
    const did = done(share(at(RING, 60), at(undefined, 90), "me", "Me", 0, NOON));
    expect([did.gave, did.paid, staminaOf(did.mine, NOON), staminaOf(did.theirs, NOON)]).toEqual([10, 5, 55, 100]);
    // (a friend the day has not counted yet has a full gauge)
    expect(share(at(RING, 60), { ...at(undefined, 5), stamina: { day: day - 1, left: 5 } }, "me", "Me", 0, NOON)).toEqual({ ok: false, why: "full" });
  });

  it("is refused without the ring worn, to a friend not near or with a full gauge, to a wearer who has not what it costs, and after the day's third", () => {
    expect(share(at({ had: ["charmRing"], charms: [] }, 60), at(undefined, 40), "me", "Me", 1, NOON)).toEqual({ ok: false, why: "none" });
    expect(share(at(RING, 60), at(undefined, 40), "me", "Me", HELPING.ring.reach + 0.01, NOON)).toEqual({ ok: false, why: "far" });
    expect(share(at(RING, 60), at(undefined, 40), "me", "Me", -1, NOON)).toEqual({ ok: false, why: "far" });
    expect(share(at(RING, 60), at(undefined, 40), "me", "Me", HELPING.ring.reach, NOON).ok).toBe(true);
    expect(share(at(RING, 60), at(undefined, 100), "me", "Me", 1, NOON)).toEqual({ ok: false, why: "full" });
    expect(share(at(RING, 14.9), at(undefined, 40), "me", "Me", 1, NOON)).toEqual({ ok: false, why: "weak" });
    expect(share(at(RING, 15), at(undefined, 40), "me", "Me", 1, NOON).ok).toBe(true);
    // (a friend with room for six costs three: a wearer with three can give that)
    expect(share(at(RING, 3), at(undefined, 94), "me", "Me", 1, NOON).ok).toBe(true);
    let p = at(RING, 100);
    for (let i = 0; i < 3; i++) p = done(share(p, at(undefined, 0), "me", "Me", 1, NOON)).mine;
    expect([staminaOf(p, NOON), share(p, at(undefined, 0), "me", "Me", 1, NOON)]).toEqual([55, { ok: false, why: "spent" }]);
    // (a new day: it gives again; a friend that day has not counted yet has a full gauge, so one who has spent theirs)
    expect(share(p, { ...at(undefined, 0), stamina: { day: day + 1, left: 0 } }, "me", "Me", 1, NOON + 24 * HOUR).ok).toBe(true);
  });
});

describe("garden fae dust: a pest-ridden plant of somebody else's does not die for twelve hours", () => {
  const KILLS = FARMING.pests.kills * HOUR, SPAN = 12 * HOUR, DUST = { had: ["thingDust"], charms: [] };
  /** A neighbour's plant sown days ago that no cover keeps, in a plot a pest has struck (the first such plot of the bed, by the farm's own roll), with when. */
  const base: Plant = plant({ sown: NOON - 60 * HOUR, guard: 0 });
  const found = (() => { for (let i = 0; i < 49; i++) { const key = `${BX + (i % 7)},${BY + Math.floor(i / 7)}`, at = pestAt(key, base, NOON + 40 * HOUR); if (at !== null) return { key, at }; } throw new Error("no pest in the bed"); })();
  const KEY = found.key, STRUCK = found.at, sick = (dusts?: number[]): Plot => ({ soil: "tilled", plant: { ...base, ...(dusts ? { dust: dusts } : {}) } });

  it("a plant dies six hours after a pest struck it, as ever; dust stops that clock for twelve hours from each sprinkling", () => {
    expect(diesAt(base, STRUCK, KILLS)).toBe(STRUCK + KILLS);
    expect(diesAt({ dust: [STRUCK + 2 * HOUR] }, STRUCK, KILLS)).toBe(STRUCK + KILLS + SPAN);
    // (dusted at the very end of its six hours it lives; a moment after, the dust comes too late)
    expect(diesAt({ dust: [STRUCK + KILLS] }, STRUCK, KILLS)).toBe(STRUCK + KILLS + SPAN);
    expect(diesAt({ dust: [STRUCK + KILLS + 1] }, STRUCK, KILLS)).toBe(STRUCK + KILLS);
    // (dusted again as the first runs out: twelve hours more; dust from before the pest came stops only what is left of it)
    expect(diesAt({ dust: [STRUCK + 2 * HOUR, STRUCK + 14 * HOUR] }, STRUCK, KILLS)).toBe(STRUCK + KILLS + 2 * SPAN);
    expect(diesAt({ dust: [STRUCK - 8 * HOUR] }, STRUCK, KILLS)).toBe(STRUCK + KILLS + 4 * HOUR);
    expect(diesAt({ dust: [STRUCK - 20 * HOUR, "x" as unknown as number] }, STRUCK, KILLS)).toBe(STRUCK + KILLS);
    expect([dustUntil({ dust: [NOON] }, NOON), dustUntil({ dust: [NOON] }, NOON + SPAN - 1), dustUntil({ dust: [NOON] }, NOON + SPAN), dustUntil({}, NOON)]).toEqual([NOON + SPAN, NOON + SPAN, null, null]);
    expect(numberOf("thingDust")).toBe(12);
  });

  it("the plant shows a pest and lives while the dust keeps it; without dust it is dead; and it is no cure", () => {
    const dusted = sick([STRUCK + 3 * HOUR]);
    expect(see(KEY, sick(), STRUCK + KILLS + 1)).toMatchObject({ pest: false, dead: true });
    expect(see(KEY, dusted, STRUCK + KILLS + 1)).toMatchObject({ pest: true, dead: false });
    expect(see(KEY, dusted, STRUCK + KILLS + SPAN)).toMatchObject({ pest: true, dead: false });
    expect(see(KEY, dusted, STRUCK + KILLS + SPAN + 1)).toMatchObject({ pest: false, dead: true });
    // (a plant no dust was sprinkled on is seen as it always was, at every moment)
    for (const dt of [0, HOUR, KILLS, KILLS + 1, 30 * HOUR]) expect(see(KEY, sick([]), STRUCK + dt)).toEqual(see(KEY, sick(), STRUCK + dt));
  });

  it("is sprinkled on another's plant that has a pest: the plant remembers it, the day's use is counted, and no stamina is spent", () => {
    const now = STRUCK + 2 * HOUR, mine = purse(DUST, 8, 40), did = done(dust(KEY, mine, sick(), "me", now));
    expect([did.left, did.until, did.plot.plant!.dust, staminaOf(did.purse, now)]).toEqual([USES.thingDust!.n - 1, now + SPAN, [now], staminaOf(mine, now)]);
    expect(see(KEY, did.plot, now).pest).toBe(true);
    expect(usesLeft(did.purse, "thingDust", now)).toBe(4);
  });

  it("is refused without the dust, with the day's five gone, where no living plant has a pest, on a plant of one's own, and while dust still lies on it", () => {
    const now = STRUCK + 2 * HOUR, mine = purse(DUST, 8, 40);
    expect(dust(KEY, purse(undefined), sick(), "me", now)).toEqual({ ok: false, why: "none" });
    expect(dust(KEY, purse({ ...DUST, used: { thingDust: { k: dayOf(now), n: 5 } } }), sick(), "me", now)).toEqual({ ok: false, why: "spent" });
    expect(dust(KEY, mine, sown(), "me", now)).toEqual({ ok: false, why: "soil" });
    expect(dust(KEY, mine, { soil: "tilled", plant: null }, "me", now)).toEqual({ ok: false, why: "soil" });
    expect(dust(KEY, mine, sick(), "me", STRUCK + KILLS + 1)).toEqual({ ok: false, why: "soil" });
    expect(dust(KEY, mine, { soil: "tilled", plant: { ...base, by: "me" } }, "me", now)).toEqual({ ok: false, why: "own" });
    expect(dust(KEY, mine, sick([now - HOUR]), "me", now)).toEqual({ ok: false, why: "running" });
    // (its dust gone, it may be dusted again, and remembers both)
    expect(done(dust(KEY, mine, sick([STRUCK + HOUR]), "me", STRUCK + HOUR + SPAN)).plot.plant!.dust).toEqual([STRUCK + HOUR, STRUCK + HOUR + SPAN]);
  });

  it("counts on the helpers' line as feeding somebody else's plant does", () => {
    const d: Done = { from: "deed", what: "dust", thing: "pumpkin", n: 1, doc: { whose: "you" } };
    expect(countsOf(d, "me")).toEqual([{ to: null, line: "helpers", raw: POINTS.helpers.feed }]);
    expect(countsOf({ ...d, doc: {} }, "me")).toEqual([]);
  });
});

describe("the guardian's cloak, and good things harder for the skilled", () => {
  const CLOAK = { had: ["charmGuard"], charms: ["charmGuard"] };

  it("with no stamina, work for somebody else is not tired work under the cloak; one's own is, and so is anybody's without it", () => {
    expect([tiredAt(purse(CLOAK), true, true), tiredAt(purse(CLOAK), true, false), tiredAt(purse(undefined), true, true), tiredAt(purse({ had: ["charmGuard"], charms: [] }), true, true)]).toEqual([false, true, true, true]);
    // (with stamina nobody's hands are tired)
    expect([tiredAt(purse(CLOAK), false, true), tiredAt(purse(undefined), false, false)]).toEqual([false, false]);
  });

  it("its games of work for somebody else are twice as wide, and no others", () => {
    expect([guardBy(purse(CLOAK), true), guardBy(purse(CLOAK), false), guardBy(purse(undefined), true), numberOf("charmGuard")]).toEqual([2, 1, 1, 2]);
    // (twice as wide is not without failing: the long pour's marks are still marks, and the swing's stretch a part of the bar)
    expect(startLong([0, 1, 2, 3, 4, 5, 6], { wide: guardBy(purse(CLOAK), true) }).zone).toBeLessThan(1.5);
    expect(startRound(3, { wide: guardBy(purse(CLOAK), true) }, 1).width).toBeLessThanOrEqual(0.5);
  });

  it("somebody else's crop of the second tier or better is harder by the helpers' rank, one's own by the farming rank, and the simplest not at all", () => {
    const fourth = LINES.helpers.marks[3], tenth = LINES.helpers.marks[9], master = LINES.farming.marks[9];
    const better = CROP_IDS.find((c) => ITEMS[c].tier >= 2)!, simple = CROP_IDS.find((c) => ITEMS[c].tier < 2)!;
    expect([hardIn(better, true, 0, fourth - 1), hardIn(better, true, 0, fourth), hardIn(better, true, 0, tenth)]).toEqual([1, harderAt(4), harderAt(10)]);
    expect([harderAt(4), harderAt(10)]).toEqual([1.08, 1.56]);
    // (for somebody else the farming rank does not count; for oneself the helpers' rank does not)
    expect([hardIn(better, true, master, 0), hardIn(better, false, master, 0), hardIn(better, false, 0, tenth)]).toEqual([1, harderAt(10), 1]);
    expect([hardIn(simple, true, master, tenth), hardIn(null, true, master, tenth)]).toEqual([1, 1]);
  });
});

describe("the anklet's tune: a note a plant, climbing", () => {
  it("climbs a step with every plant of a run, to its twentieth note, and stays there", async () => {
    const { chimeHz } = await import("./sfx");
    const notes = Array.from({ length: 20 }, (_, i) => chimeHz(i + 1));
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]);
    expect(notes[5] / notes[0]).toBeCloseTo(2, 9);
    expect([chimeHz(21), chimeHz(99), chimeHz(0)]).toEqual([notes[19], notes[19], notes[0]]);
    // (no higher than a small bell: it is to be quiet)
    expect(notes[19]).toBeLessThan(3000);
  });
});
