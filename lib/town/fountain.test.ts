import { describe, expect, it } from "vitest";
import { cook } from "./cooking";
import { chore, sow, water, type Plot } from "./farm";
import { BLESSINGS, LATER, NOTE, WISH, WISHES, WISHING, blessed, blessingsOf, dawned, firstGoal, goalOf, hastened, newFountain, shadeOf, tidyNote, toss, type Fountain, type WishId } from "./fountain";
import { BUFFS, CROPS, type ItemId } from "./items";
import { buffOf, buffsOf, costOf, hasBuff } from "./stamina";
import { HOUR, newPurse, type Purse, type Stack } from "./trade";

const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-05T12:00:00"), MIN = 60_000;
const rich = (coins: number): Purse => ({ ...newPurse(), coins });
/** Toss, and fail the test if it was refused. */
function tossed(purse: Purse, f: Fountain, me: string, wish: Parameters<typeof toss>[3], coins: number, now: number, supply = 0) {
  const did = toss(purse, f, me, wish, coins, now, supply);
  if (!did.ok) throw new Error(`refused: ${did.why}`);
  return did;
}

describe("the day's goal", () => {
  it("is a share of all the village's coins, and never under the least", () => {
    expect(firstGoal(0)).toBe(WISHING.least);
    expect(firstGoal(1_369)).toBe(100);       // the village on the game's second day
    expect(firstGoal(50_000)).toBe(1_500);
    expect(firstGoal(-5)).toBe(WISHING.least);
  });
  it("is set by the day's first toss and stays the day long, however the purses change", () => {
    const first = tossed(rich(10), newFountain(), "a", "lucky", 1, NOON, 50_000).fountain;
    expect(first.first).toBe(1_500);
    expect(tossed(rich(10), first, "b", "lucky", 1, NOON + HOUR, 900_000).fountain.first).toBe(1_500);
    // (a day begins at dawn: 04:59 is still yesterday)
    expect(dawned(first, at("2026-10-06T04:59:00"), 900_000).first).toBe(1_500);
    expect(dawned(first, at("2026-10-06T05:00:00"), 900_000).first).toBe(27_000);
  });
  it("doubles for each blessing the day has given, and there is none after the third", () => {
    const f = { ...newFountain(), first: 100 };
    expect([0, 1, 2, 3].map((given) => goalOf({ ...f, given }))).toEqual([100, 200, 400, null]);
  });
});

describe("a coin tossed", () => {
  it("leaves the purse for good and counts towards its wish", () => {
    const did = tossed(rich(40), newFountain(), "a", "green", 30, NOON);
    expect(did.purse.coins).toBe(10);
    expect(did).toMatchObject({ took: 30, counted: 30, granted: null });
    expect(did.fountain).toMatchObject({ pot: 30, by: { green: 30 }, who: ["a"], given: 0, blessings: [] });
  });
  it("is refused for a wish there is not, for no coins, and for more than the purse holds", () => {
    const f = newFountain();
    expect(toss(rich(40), f, "a", "rain" as never, 5, NOON, 0)).toEqual({ ok: false, why: "none" });
    for (const n of [0, -3, 1.5, NaN]) expect(toss(rich(40), f, "a", "lucky", n, NOON, 0)).toEqual({ ok: false, why: "amount" });
    expect(toss(rich(40), f, "a", "lucky", 41, NOON, 0)).toEqual({ ok: false, why: "coins" });
  });
  it("can be for any of what a meal leaves behind, and for the eight that are the fountain's own", () => {
    // (the last two are the forest's and the insects': in the database their own file, v125, puts them after v123's eleven)
    expect(WISHES).toEqual([...Object.keys(BUFFS).filter(id => !LATER.includes(id as WishId)), "swift", "clear", "spring", "sprout", "feast", "carry", "forage", "net"]);
    expect(new Set(Object.keys(WISH).filter((w) => !WISHES.includes(w as WishId)))).toEqual(new Set(LATER));
    expect(toss(rich(5), newFountain(), "a", "current" as WishId, 1, NOON, 0)).toEqual({ ok: false, why: "none" });
    expect(toss(rich(5), newFountain(), "a", "rain" as WishId, 1, NOON, 0)).toEqual({ ok: false, why: "none" });
    for (const w of WISHES) expect(WISH[w].name.th && WISH[w].about.th && WISH[w].icon).toBeTruthy();
    for (const w of WISHES) expect(tossed(rich(5), newFountain(), "a", w, 1, NOON).fountain.by).toEqual({ [w]: 1 });
  });
});

describe("the pot filled", () => {
  it("grants the wish with the most behind it, there and then, to everybody whose coins are in it", () => {
    let f = tossed(rich(100), newFountain(), "a", "lucky", 60, NOON).fountain;
    f = tossed(rich(100), f, "b", "green", 30, NOON + 5 * MIN).fountain;
    const last = tossed(rich(100), f, "c", "green", 10, NOON + 9 * MIN);
    expect(last.granted).toBe("lucky");
    expect(last.fountain.blessings).toEqual([{ id: "lucky", from: NOON + 9 * MIN, until: NOON + 9 * MIN + WISHING.hours * HOUR, by: "c", of: ["a", "b", "c"] }]);
    expect(last.fountain).toMatchObject({ given: 1, pot: 0, by: {}, who: [] });
    expect(goalOf(last.fountain)).toBe(200);
  });
  it("takes no more than fills it: the rest stays in the purse", () => {
    const f = tossed(rich(100), newFountain(), "a", "calm", 90, NOON).fountain;
    const did = tossed(rich(500), f, "b", "calm", 500, NOON + MIN);
    expect(did).toMatchObject({ took: 10, counted: 10, granted: "calm" });
    expect(did.purse.coins).toBe(490);
  });
  it("of two wishes with as much behind them, grants the one just tossed towards", () => {
    const f = tossed(rich(100), newFountain(), "a", "calm", 50, NOON).fountain;
    expect(tossed(rich(100), f, "b", "hearty", 50, NOON + 5 * MIN).granted).toBe("hearty");
    expect(tossed(rich(100), f, "b", "calm", 50, NOON + 5 * MIN).granted).toBe("calm");
    // (and when the coin that fills it is for neither: the first as they are listed)
    const tied = tossed(rich(100), tossed(rich(100), newFountain(), "a", "hearty", 45, NOON).fountain, "b", "keen", 45, NOON + 5 * MIN).fountain;
    expect(tossed(rich(100), tied, "c", "green", 10, NOON + 9 * MIN).granted).toBe("keen");
  });
  it("is not lost when the day turns before it is full: the pot, and whose coins they are, wait", () => {
    const f = tossed(rich(100), newFountain(), "a", "keen", 70, NOON).fountain;
    const morning = at("2026-10-06T08:00:00");
    const did = tossed(rich(100), f, "b", "keen", 100, morning, 2_000);
    expect(did).toMatchObject({ took: 30, granted: "keen" });
    expect(did.fountain.blessings[0].of).toEqual(["a", "b"]);
    expect(did.fountain).toMatchObject({ day: f.day + 1, first: 100, given: 1 });
  });
  it("a second blessing the same day costs twice, a third four times, and after that coins wait for the morning", () => {
    let f = newFountain(), now = NOON;
    for (const [goal, n] of [[100, 1], [200, 2], [400, 3]] as const) {
      expect(goalOf(dawned(f, now, 0))).toBe(goal);
      const did = tossed(rich(1_000), f, "a", "lucky", 1_000, now);
      expect(did).toMatchObject({ took: goal, granted: "lucky" });
      expect(did.fountain.given).toBe(n);
      f = did.fountain; now += HOUR;
    }
    // the day's last has been given: a coin is taken whole, and grants nothing
    const late = tossed(rich(1_000), f, "b", "green", 250, now);
    expect(late).toMatchObject({ took: 250, counted: 250, granted: null });
    expect(late.fountain).toMatchObject({ pot: 250, given: 3 });
    // in the morning the pot already holds more than the new day's goal: one coin grants it, and the rest stays in
    const morning = at("2026-10-06T06:00:00");
    const first = tossed(rich(10), late.fountain, "c", "green", 5, morning, 0);
    expect(first).toMatchObject({ took: 1, counted: 0, granted: "green" });
    expect(first.fountain).toMatchObject({ given: 1, pot: 150, who: ["b", "c"] });
    expect(first.fountain.blessings.at(-1)?.of).toEqual(["b", "c"]);
  });
});

describe("tossed together", () => {
  it("counts for one and a half once three people have tossed within the minute", () => {
    let f = newFountain();
    const one = tossed(rich(50), f, "a", "lucky", 10, NOON);
    const two = tossed(rich(50), one.fountain, "b", "lucky", 10, NOON + 20_000);
    const three = tossed(rich(50), two.fountain, "c", "lucky", 10, NOON + 40_000);
    expect([one.counted, two.counted, three.counted]).toEqual([10, 10, 15]);
    expect(three.purse.coins).toBe(40);           // a coin tossed is a coin gone, whatever it counts for
    f = three.fountain;
    // while the three are still within the minute, the next coin of any of them counts for more too
    expect(tossed(rich(50), f, "a", "lucky", 4, NOON + 50_000).counted).toBe(6);
    // one person tossing three times is not three people
    let alone = newFountain();
    for (let i = 0; i < 3; i++) { const did = tossed(rich(50), alone, "a", "lucky", 10, NOON + i * 1_000); expect(did.counted).toBe(10); alone = did.fountain; }
    // a minute on, the others have gone
    expect(tossed(rich(50), f, "d", "lucky", 10, NOON + 40_000 + WISHING.within * 1000).counted).toBe(10);
  });
  it("still takes no more coins than fill the pot", () => {
    let f = newFountain();
    f = tossed(rich(100), f, "a", "calm", 80, NOON).fountain;
    f = tossed(rich(100), f, "b", "calm", 5, NOON + 1_000).fountain;
    const did = tossed(rich(100), f, "c", "calm", 100, NOON + 2_000);
    // fifteen are wanted and a coin counts for one and a half: ten coins fill it
    expect(did).toMatchObject({ took: 10, counted: 15, granted: "calm" });
  });
});

describe("a blessing", () => {
  const granted = tossed(rich(100), tossed(rich(100), newFountain(), "a", "hearty", 99, NOON).fountain, "b", "hearty", 1, NOON + MIN).fountain;
  const until = NOON + MIN + WISHING.hours * HOUR;
  it("is theirs whose coins filled the pot, for three hours", () => {
    expect(blessingsOf(granted, "a", NOON + 2 * MIN)).toEqual([{ id: "hearty", until }]);
    expect(blessingsOf(granted, "b", until - 1)).toEqual([{ id: "hearty", until }]);
    expect(blessingsOf(granted, "b", until)).toEqual([]);
    expect(blessingsOf(granted, "z", NOON + 2 * MIN)).toEqual([]);
  });
  it("is whoever's tosses a coin while it lasts, for what is left of it", () => {
    const joined = tossed(rich(5), granted, "z", "green", 1, NOON + HOUR).fountain;
    expect(blessingsOf(joined, "z", NOON + HOUR)).toEqual([{ id: "hearty", until }]);
    // (and their coin is in the next pot)
    expect(joined).toMatchObject({ pot: 1, by: { green: 1 }, who: ["z"] });
    // once it has ended, a coin tossed joins nothing, and the fountain has let it go
    const late = tossed(rich(5), granted, "z", "green", 1, until + MIN).fountain;
    expect(blessingsOf(late, "z", until + MIN)).toEqual([]);
    expect(late.blessings).toEqual([]);
  });
  it("is held beside a meal's buff: each does what it does, and each ends in its own time", () => {
    const fed: Purse = { ...rich(0), buff: { id: "calm", until: until + HOUR } };
    const now = NOON + HOUR, mine = blessed(fed, granted, "a", now);
    expect(buffsOf(mine, now)).toEqual(["calm", "hearty"]);
    expect(hasBuff(mine, now, "calm") && hasBuff(mine, now, "hearty")).toBe(true);
    expect(hasBuff(mine, now, "lucky")).toBe(false);
    expect(costOf(mine, 10, now)).toBe(Math.round(10 * (1 - BUFFS.hearty.by)));
    // (what a go is kept with is still the meal's)
    expect(buffOf(mine, now)).toBe("calm");
    // the blessing ends first, the meal's an hour after it
    expect(buffsOf(mine, until)).toEqual(["calm"]);
    expect(buffsOf(mine, until + HOUR)).toEqual([]);
    // somebody whose coin is not in it has only their meal's
    expect(buffsOf(blessed(fed, granted, "z", now), now)).toEqual(["calm"]);
    // a purse read after the blessing ended no longer carries it
    expect(blessed(mine, granted, "a", until)).toEqual(fed);
  });
  it("is held beside the next one granted, and the same one twice is no stronger", () => {
    const again = tossed(rich(500), granted, "c", "lucky", 500, NOON + HOUR);
    expect(again).toMatchObject({ took: 200, granted: "lucky" });
    // c's coin joined the first as it was tossed, and filled the second
    expect(blessingsOf(again.fountain, "c", NOON + HOUR)).toEqual([{ id: "hearty", until }, { id: "lucky", until: NOON + HOUR + WISHING.hours * HOUR }]);
    // a and b have the first only: their coins were in no pot of the second
    expect(blessingsOf(again.fountain, "a", NOON + HOUR)).toEqual([{ id: "hearty", until }]);
    const both = blessed({ ...rich(0), buff: { id: "hearty", until: until + HOUR } }, again.fountain, "c", NOON + HOUR);
    expect(buffsOf(both, NOON + HOUR)).toEqual(["hearty", "lucky"]);
    expect(costOf(both, 10, NOON + HOUR)).toBe(Math.round(10 * (1 - BUFFS.hearty.by)));
  });
});

describe("the fountain's own blessings", () => {
  const bag = (stacks: Stack[]): Purse["bag"] => [...stacks, ...Array<null>(10).fill(null)].slice(0, 10);
  const having = (ids: WishId[], stacks: Stack[], hand: ItemId | null): Purse =>
    ({ ...newPurse(), bag: bag(stacks), hand, ...(ids.length ? { blessed: ids.map((id) => ({ id, until: NOON + HOUR })) } : {}) });

  it("swift: the bite, and each twitch of the float before it, come sooner; never in no time", () => {
    expect(hastened({ wait: 20, nibbles: [5, 12] })).toEqual({ wait: 12, nibbles: [3, 7.199999999999999] });
    expect(hastened({ wait: 1, nibbles: [] }).wait).toBe(1);
    expect(hastened({ wait: 7, nibbles: [2] }, 0)).toEqual({ wait: 7, nibbles: [2] });
    // (whole seconds, as a line's wait is)
    for (let wait = 1; wait <= 120; wait++) { const w = hastened({ wait, nibbles: [] }).wait; expect(Number.isInteger(w) && w >= 1 && w <= wait).toBe(true); }
  });
  it("clear: what is on its way shows as how rare a fish it is, or as no fish", () => {
    expect([shadeOf("minnow"), shadeOf("eel"), shadeOf("goby"), shadeOf("koi"), shadeOf("boot"), shadeOf("hyacinth")]).toEqual(["common", "uncommon", "rare", "legend", "other", "other"]);
  });
  it("sprout: a seed sown is some of its way to ripe at once, by the plant it is", () => {
    const tilled: Plot = { soil: "tilled", plant: null };
    const plain = sow(having([], [{ item: "seedChili", n: 1 }], "seedChili"), tilled, "seedChili", "a", NOON);
    const warm = sow(having(["sprout"], [{ item: "seedChili", n: 1 }], "seedChili"), tilled, "seedChili", "a", NOON);
    const late = sow(having(["sprout"], [{ item: "seedChili", n: 1 }], "seedChili"), tilled, "seedChili", "a", NOON + HOUR);
    if (!plain.ok || !warm.ok || !late.ok) throw new Error("refused");
    expect(plain.plot.plant!.boost).toBe(0);
    expect(warm.plot.plant!.boost).toBe(BLESSINGS.sprout.by * CROPS.chili.hours * HOUR);
    expect(late.plot.plant!.boost).toBe(0);
    // (nothing else of the sowing differs)
    expect({ ...warm.plot.plant!, boost: 0 }).toEqual(plain.plot.plant);
  });
  it("spring: watering takes no water from the can, and waters as it did", () => {
    const plot: Plot = { soil: "tilled", plant: { by: "a", crop: "chili", sown: NOON - 2 * HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } };
    const plain = water("3,3", having([], [{ item: "can", n: 1, water: 5 }], "can"), plot, "can", NOON);
    const brim = water("3,3", having(["spring"], [{ item: "can", n: 1, water: 5 }], "can"), plot, "can", NOON);
    const both = water("3,3", having(["spring", "green"], [{ item: "can", n: 1, water: 1 }], "can"), plot, "can", NOON);
    if (!plain.ok || !brim.ok || !both.ok) throw new Error("refused");
    expect([plain.purse.bag[0]!.water, brim.purse.bag[0]!.water, both.purse.bag[0]!.water]).toEqual([4, 5, 1]);
    expect(brim.plot).toEqual(plain.plot);
    // (held beside green fingers: half as much growth again, and still no water gone)
    expect(both.plot.plant!.boost).toBe(plain.plot.plant!.boost * (1 + BUFFS.green.by));
    // an empty can waters nothing, blessing or no
    expect(water("3,3", having(["spring"], [{ item: "can", n: 1, water: 0 }], "can"), plot, "can", NOON)).toEqual({ ok: false, why: "dry" });
  });
  it("feast: a pot cooked gives a helping more, a recipe's or not; what is made otherwise is as it was", () => {
    const stacks: Stack[] = [{ item: "minnow", n: 3 }, { item: "salt", n: 2 }, { item: "kangkong", n: 2 }, { item: "chili", n: 2 }, { item: "scallion", n: 2 }];
    const fry: Array<[ItemId, number]> = [["minnow", 3], ["salt", 1]], odd: Array<[ItemId, number]> = [["kangkong", 2], ["salt", 1]], cure: Array<[ItemId, number]> = [["chili", 2], ["scallion", 2], ["salt", 1]];
    const made = (ids: WishId[], things: Array<[ItemId, number]>, tool: ItemId) => { const did = cook(having(ids, stacks, null), things, [tool], 0, NOON); if (!did.ok) throw new Error(did.why); return did; };
    expect([made([], fry, "pan").n, made(["feast"], fry, "pan").n]).toEqual([2, 3]);
    expect(made(["feast"], fry, "pan").purse.bag.find((b) => b?.item === "potFull")?.of).toEqual({ dish: "friedMinnow", left: 3 });
    expect(made(["feast"], odd, "pot").n).toBe(made([], odd, "pot").n + 1);
    expect(made(["feast"], cure, "pot").n).toBe(made([], cure, "pot").n);
  });
});

describe("a wish in words", () => {
  it("is kept tidy: what cannot be seen made a space, runs of spaces one, none at either end", () => {
    expect(tidyNote("  ขอให้เคลียร์  savage\tสัปดาห์นี้ \n")).toBe("ขอให้เคลียร์ savage สัปดาห์นี้");
    expect(tidyNote("a\u0000b\u007fc")).toBe("a b c");
    expect(tidyNote("plain")).toBe("plain");
  });
  it("is nothing when nothing is left, or when it is longer than eighty letters (a letter is a letter, whatever it takes to write)", () => {
    for (const blank of ["", "   ", "\n\t", null, undefined]) expect(tidyNote(blank)).toBeNull();
    expect(tidyNote("ก".repeat(NOTE.most))).toBe("ก".repeat(NOTE.most));
    expect(tidyNote("ก".repeat(NOTE.most + 1))).toBeNull();
    expect(tidyNote("🐟".repeat(NOTE.most))).toBe("🐟".repeat(NOTE.most));
    expect(tidyNote("🐟".repeat(NOTE.most + 1))).toBeNull();
    // (spaces at the ends do not count against it)
    expect(tidyNote("  " + "x".repeat(NOTE.most) + "  ")).toBe("x".repeat(NOTE.most));
  });
});

describe("the water bearers' blessing", () => {
  const withBucket = (ids: WishId[], bucket: ItemId): Purse =>
    ({ ...newPurse(), bag: [{ item: bucket, n: 1 }, ...Array<null>(9).fill(null)], hand: bucket, ...(ids.length ? { blessed: ids.map((id) => ({ id, until: NOON + HOUR })) } : {}) });
  it("carry: a bucket drawn at the river holds one bucketful more, whatever bucket it is; and all of it goes into the well", () => {
    const plain = chore(withBucket([], "bucket"), "river", 10, NOON), full = chore(withBucket(["carry"], "bucket"), "river", 10, NOON), iron = chore(withBucket(["carry"], "bucketIron"), "river", 10, NOON);
    if (!plain.ok || !full.ok || !iron.ok) throw new Error("refused");
    expect([plain.purse.bag[0]!.water, full.purse.bag[0]!.water, iron.purse.bag[0]!.water]).toEqual([1, 2, 3]);
    expect(full.purse.stamina).toEqual(plain.purse.stamina);
    const poured = chore(full.purse, "well", 10, NOON + 60_000);
    if (!poured.ok) throw new Error("refused");
    expect(poured.well).toBe(12);
    // once the blessing has ended a bucket holds what it holds
    const later = chore(withBucket(["carry"], "bucket"), "river", 10, NOON + HOUR);
    expect(later.ok && later.purse.bag[0]!.water).toBe(1);
  });
});
