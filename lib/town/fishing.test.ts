import { describe, expect, it } from "vitest";
import { BAITS, DISHES, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, ITEMS, type BaitId, type CatchId, type FishId, type ItemId, type Sign } from "./items";
import {
  ALL_SIGNS, FIGHT, ORB, REST, SIGNS, SILK, STEPS, STRIKE, bangkokDay, PAIR, WARY, biggerBy, boutsOf, harderOf, hookStar, isWary, leastMs, lightOrb, orbHaste, orbOf, starOdds, tookUp, underOrb, castFrom, castLine, driveBack, hookBait, hookBaits, moonAge, oddsOf, playFight, replayFight, seeded, seesOdds, settling, signsOf, startFight, stepFight, sift, startPair, stepPair, strikeOf, strikeWindow, surging, warning,
  type Fight, type FightMods, type OrbSky, type Pair,
} from "./fishing";
import { hastened } from "./fountain";
import { USES, harderAt, numberOf, usesLeft } from "./gifts";
import { STAMINA, dayOf } from "./stamina";
import { held, newPurse, put, type Purse } from "./trade";

const share = (odds: Array<{ what: CatchId; p: number }>, what: CatchId) => odds.find((o) => o.what === what)?.p ?? 0;
/** What takes a bait at an hour where a fish lives, under the sky it bites under, with what it waits for: its own water. */
const home = (id: FishId, bait: BaitId, hour: number) => oddsOf(bait, hour, (FISH[id].dry ?? 1) === 0, false, FISH[id].water === "bank", FISH[id].needs ?? [], FISH[id].habitat?.[0] ?? "town", FISH[id].current?.[0] ?? "eddy");
/** The early game's twelve fish (the later tiers' are tried in tiers.test.ts). */
const EARLY = FISH_IDS.filter((id) => ITEMS[id].tier === 1 && !FISH[id].habitat);
/** A hand with no delay at all: reels below the middle of the safe stretch, and keeps low in it while the fish surges. */
const steady = (f: Fight) => f.tension < f.lo + (f.hi - f.lo) * (surging(f) || warning(f) ? 0.25 : 0.5);
/**
 * Somebody who sees the gauge so many seconds late, and whose thumb now and
 * then stays where it was for half a second: the made-up players the fight's
 * numbers were chosen with. Gives how a fight ended for them.
 */
function human(delay: number, lapses: number, seed: number) {
  const rnd = seeded(seed);
  return (start: Fight) => {
    const dt = 1 / 60, lag = Math.round(delay / dt), seen: Fight[] = [];
    let f = start, hold = false, frozen = 0;
    while (!f.over && f.t < 180) {
      seen.push(f);
      if (frozen > 0) frozen -= dt;
      else {
        if (rnd() < lapses * dt) frozen = 0.5;
        hold = steady(seen[Math.max(0, seen.length - 1 - lag)]);
      }
      f = stepFight(f, hold, dt);
    }
    return f.over;
  };
}
const SKILLED: [number, number] = [0.15, 0.1], AVERAGE: [number, number] = [0.25, 0.2], NEW: [number, number] = [0.35, 0.3];
/** A very good hand ("คนที่เล่นเก่งมาก"): what is still to be done with no stamina left is measured by it. */
const MASTER: [number, number] = [0.08, 0.04];
/** Of so many fights with a fish, the share somebody lands. */
function lands(id: FishId, [delay, lapses]: [number, number], mods: FightMods = {}, many = 80): number {
  let won = 0;
  for (let i = 0; i < many; i++) if (human(delay, lapses, 77 + i)(startFight(id, "good", mods, 1000 + i * 7919)) === "landed") won++;
  return won / many;
}

describe("what takes the bait", () => {
  it("adds up, for every bait at every hour, and something always comes up", () => {
    for (const bait of BAITS) for (let hour = 0; hour < 24; hour++) for (const rain of [false, true]) for (const shallow of [false, true]) {
      const odds = oddsOf(bait, hour, rain, false, shallow);
      expect(odds.length).toBeGreaterThanOrEqual(2);
      expect(odds.reduce((t, o) => t + o.p, 0)).toBeCloseTo(1, 9);
      for (const o of odds) expect(o.p).toBeGreaterThan(0);
    }
  });

  it("brings a fish only on a bait it takes, in the hours it feeds", () => {
    for (const id of FISH_IDS) for (const bait of BAITS) for (let hour = 0; hour < 24; hour++) {
      const feeds = FISH[id].hours.some(([a, b]) => hour >= a && hour < b), takes = (FISH[id].baits[bait] ?? 0) > 0;
      expect(share(home(id, bait, hour), id) > 0).toBe(feeds && takes);
    }
    // the two baits the uncle sells bring a fish at any hour of the day or night
    for (const bait of ["worm", "dough"] as const) for (let hour = 0; hour < 24; hour++)
      expect(oddsOf(bait, hour).some((o) => o.what in FISH)).toBe(true);
    // every fish can be caught at some hour on some bait
    for (const id of FISH_IDS) expect(BAITS.some((b) => Array.from({ length: 24 }, (_, h) => h).some((h) => share(home(id, b, h), id) > 0))).toBe(true);
    // and every fish is a thing in the catalog, with a picture of that name (two are eaten as they come up, and so are dishes among the things)
    for (const id of FISH_IDS) expect(ITEMS[id].kind).toBe(id in DISHES ? "dish" : "fish");
    expect(FISH_IDS.filter((id) => id in DISHES)).toEqual(["dozyFish", "rainbowFish"]);
  });

  it("brings the night's fish out in the rain, and the rare ones to the lucky", () => {
    // (not half as often again, as it was while the eel had the rain to itself: the salmon comes up in it too)
    expect(share(oddsOf("worm", 21, true), "eel")).toBeGreaterThan(share(oddsOf("worm", 21, false), "eel") * 1.3);
    expect(share(oddsOf("worm", 21, true), "catfish")).toBeGreaterThan(share(oddsOf("worm", 21, false), "catfish"));
    expect(share(oddsOf("minnow", 22, false, true), "goby")).toBeGreaterThan(share(oddsOf("minnow", 22), "goby"));
    expect(share(oddsOf("dough", 6, false, true), "koi")).toBeGreaterThan(share(oddsOf("dough", 6), "koi") * 1.3);
  });

  it("keeps the river's legend rare: a cast or two in a hundred at dawn and dusk, never otherwise", () => {
    for (const hour of [5, 6, 17, 18]) {
      const p = share(oddsOf("dough", hour), "koi");
      expect(p).toBeGreaterThan(0.008);
      expect(p).toBeLessThan(0.03);
    }
    for (const hour of [0, 4, 7, 12, 16, 19, 23]) expect(share(oddsOf("dough", hour), "koi")).toBe(0);
    expect(share(oddsOf("worm", 6), "koi")).toBe(0);
  });

  it("brings only the common fish to the bank's shallow water: the rest need the deck", () => {
    for (const bait of BAITS) for (let hour = 0; hour < 24; hour++) for (const rain of [false, true]) for (const lucky of [false, true]) {
      for (const o of oddsOf(bait, hour, rain, lucky, true)) if (o.what in FISH) expect(FISH[o.what as FishId].tier).toBe("common");
    }
    // the common ones are there in the shallows as often beside each other as in deep water
    const deep = oddsOf("worm", 21), shallow = oddsOf("worm", 21, false, false, true);
    expect(share(deep, "eel")).toBeGreaterThan(0);
    expect(share(shallow, "eel")).toBe(0);
    expect(share(shallow, "catfish") / share(shallow, "minnow")).toBeCloseTo(share(deep, "catfish") / share(deep, "minnow"), 9);
    // and the shallows have fish of their own, which the deck never sees (2026-10-05)
    for (const id of ["loach", "crayfish"] as const) { expect(share(shallow, id)).toBeGreaterThan(0); expect(share(deep, id)).toBe(0); }
    // a fish of the uncle's two baits still comes at every hour, even there
    for (const bait of ["worm", "dough"] as const) for (let hour = 0; hour < 24; hour++)
      expect(oddsOf(bait, hour, false, false, true).some((o) => o.what in FISH)).toBe(true);
    // and a cast there is a cast of those odds
    for (let seed = 1; seed <= 400; seed++) {
      const c = castLine("worm", 21, true, true, seeded(seed), true);
      if (c.what in FISH) expect(FISH[c.what as FishId].tier).toBe("common");
    }
  });

  it("is shown to nobody before the line is dropped, for now", () => {
    expect(seesOdds("anybody")).toBe(false);
  });
});

describe("twenty more of the early game's fish (the owner: \"แต่ละปลามีเงื่อนไขในการเจอ และ วัตถุประสงค์ในการใช้งาน ที่แตกต่างกันด้วย\")", () => {
  const NEW: FishId[] = ["loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp", "piranha", "herring", "archerfish", "pacu",
    "pike", "nilePerch", "salmon", "wels", "gar", "arapaima", "dozyFish", "popotoFish", "rainbowFish", "moonFish"];
  const HOURS = Array.from({ length: 24 }, (_, h) => h);
  /** Every way a line can be dropped: the bait, the hour, the rain, the water, and one sign or none. */
  const WAYS = BAITS.flatMap((bait) => HOURS.flatMap((hour) => [false, true].flatMap((rain) => [false, true].flatMap((shallow) =>
    [[] as Sign[], ...ALL_SIGNS.map((s) => [s])].map((signs) => ({ bait, hour, rain, shallow, signs }))))));
  const bites = (id: FishId) => WAYS.filter((w) => share(oddsOf(w.bait, w.hour, w.rain, false, w.shallow, w.signs), id) > 0);

  it("are twenty, all of the first tier, on the first tier's baits", () => {
    expect(new Set(NEW).size).toBe(20);
    for (const id of NEW) {
      expect(FISH[id]).toBeDefined();
      expect(ITEMS[id].tier).toBe(1);
      for (const bait of Object.keys(FISH[id].baits)) expect(ITEMS[bait as BaitId].tier).toBe(1);
    }
    expect(FISH_IDS.filter(id => !FISH[id].habitat).length).toBe(32 + 20);
    // they are weighed after the fish there were, in this order
    expect(FISH_IDS.filter(id => !FISH[id].habitat).slice(-20)).toEqual(NEW);
  });

  it("are each found their own way: no two bite in the same set of casts", () => {
    const where = NEW.map((id) => bites(id).map((w) => `${w.bait}/${w.hour}/${w.rain}/${w.shallow}/${w.signs}`).join(" "));
    for (const w of where) expect(w.length).toBeGreaterThan(0);
    expect(new Set(where).size).toBe(20);
  });

  it("keep to their water: five only off the bank, the rest of the uncommon and rare ones only off the deck, and one common fish too", () => {
    for (const id of ["loach", "mosquitofish", "mussel", "crayfish", "goldfish"] as const) expect(bites(id).every((w) => w.shallow)).toBe(true);
    for (const id of ["piranha", "herring", "archerfish", "pacu", "pike", "nilePerch", "salmon", "wels", "gar", "arapaima", "moonFish"] as const) expect(bites(id).every((w) => !w.shallow)).toBe(true);
    for (const id of ["carp", "dozyFish", "popotoFish", "rainbowFish"] as const) { expect(bites(id).some((w) => w.shallow)).toBe(true); expect(bites(id).some((w) => !w.shallow)).toBe(true); }
  });

  it("mind the sky: a salmon only in the rain, an archerfish and a Nile perch never in it, a loach three times as readily", () => {
    expect(bites("salmon").every((w) => w.rain)).toBe(true);
    expect(bites("archerfish").every((w) => !w.rain)).toBe(true);
    expect(bites("nilePerch").every((w) => !w.rain)).toBe(true);
    const dry = oddsOf("worm", 10, false, false, true), wet = oddsOf("worm", 10, true, false, true);
    expect(share(wet, "loach") / share(wet, "minnow")).toBeCloseTo(3 * share(dry, "loach") / share(dry, "minnow"), 9);
    // one the sky keeps away has no place among the odds at all
    expect(oddsOf("worm", 10, true).some((o) => o.what === "archerfish")).toBe(false);
    expect(oddsOf("worm", 10, false).some((o) => o.what === "salmon")).toBe(false);
  });

  it("wait, five of them, for a sign: the tired, a crowd, the weekend, the rain's end, a full moon", () => {
    const sign: Partial<Record<FishId, Sign>> = { dozyFish: "tired", popotoFish: "crowd", goldfish: "weekend", rainbowFish: "after", moonFish: "full" };
    for (const id of FISH_IDS.filter(id => !FISH[id].habitat)) expect(FISH[id].needs).toEqual(sign[id] ? [sign[id]] : undefined);
    for (const [id, s] of Object.entries(sign) as Array<[FishId, Sign]>) {
      expect(bites(id).length).toBeGreaterThan(0);
      expect(bites(id).every((w) => w.signs.includes(s))).toBe(true);
    }
    // and with no sign the water is what it is on any day
    for (const w of WAYS) if (!w.signs.length) for (const o of oddsOf(w.bait, w.hour, w.rain, false, w.shallow)) if (o.what in FISH) expect(FISH[o.what as FishId].needs).toBeUndefined();
    // somebody with no stamina, on a worm at any hour, off the deck or the bank: about one bite in five is the dozy one
    for (const shallow of [false, true]) for (const hour of [3, 10, 21]) {
      const p = share(oddsOf("worm", hour, false, false, shallow, ["tired"]), "dozyFish");
      expect(p).toBeGreaterThan(0.15);
      expect(p).toBeLessThan(0.45);
    }
  });

  it("holds a sign by the clock, the purse, the others' lines and the rain that fell", () => {
    const AT = Date.UTC(2026, 9, 5, 5, 0), calm = { now: AT, spent: false, others: 0, wet: 0 };   // a Monday noon in Bangkok, no moon to speak of
    expect(signsOf(calm, false)).toEqual([]);
    expect(signsOf({ ...calm, spent: true }, false)).toEqual(["tired"]);
    expect(signsOf({ ...calm, others: SIGNS.crowd - 1 }, false)).toEqual([]);
    expect(signsOf({ ...calm, others: SIGNS.crowd }, false)).toEqual(["crowd"]);
    // the rain's end: it rained in the last half hour, and does not now
    expect(signsOf({ ...calm, wet: 60_000 }, false)).toEqual(["after"]);
    expect(signsOf({ ...calm, wet: 60_000 }, true)).toEqual([]);
    // the weekend is Bangkok's: from Friday's midnight there (17:00 UTC) to Sunday's
    expect(bangkokDay(Date.UTC(2026, 9, 2, 16, 59))).toBe(5);
    expect(bangkokDay(Date.UTC(2026, 9, 2, 17, 0))).toBe(6);
    expect(bangkokDay(Date.UTC(2026, 9, 4, 16, 59))).toBe(0);
    expect(bangkokDay(Date.UTC(2026, 9, 4, 17, 0))).toBe(1);
    expect(signsOf({ ...calm, now: Date.UTC(2026, 9, 3, 5, 0) }, false)).toEqual(["weekend"]);
    // the moon: full on 2026-10-26 (04:12 UTC) and on 2026-11-24 (14:53 UTC), new on 2026-10-10: by its mean month, within a day
    const full = Date.UTC(2026, 9, 26, 4, 12), month = 29.530588853;
    expect(Math.abs(moonAge(full) - month / 2)).toBeLessThan(0.8);
    expect(Math.abs(moonAge(Date.UTC(2026, 10, 24, 14, 53)) - month / 2)).toBeLessThan(0.8);
    expect(Math.min(moonAge(Date.UTC(2026, 9, 10, 15, 50)), month - moonAge(Date.UTC(2026, 9, 10, 15, 50)))).toBeLessThan(0.8);
    expect(signsOf({ ...calm, now: full }, false)).toEqual(["full"]);
    expect(signsOf({ ...calm, now: full + 3 * 86_400_000 }, false)).toEqual([]);
    // three nights of it, each month: from a day and a half before to a day and a half after
    const nights = Array.from({ length: 30 }, (_, d) => Date.UTC(2026, 9, 12 + d, 15, 0)).filter((at) => signsOf({ ...calm, now: at }, false).includes("full"));
    expect(nights.length).toBe(3);
    // all of them at once, in the order they are listed
    expect(signsOf({ now: Date.UTC(2026, 9, 25, 5, 0), spent: true, others: 5, wet: 1 }, false)).toEqual(ALL_SIGNS);
  });

  it("keeps the river's new legend rarer than its old one, and only on a loach", () => {
    for (const hour of [5, 6, 17, 18]) {
      const p = share(oddsOf("loach", hour), "arapaima");
      expect(p).toBeGreaterThan(0.005);
      expect(p).toBeLessThan(0.03);
    }
    for (const bait of BAITS) if (bait !== "loach") for (const hour of HOURS) expect(share(oddsOf(bait, hour), "arapaima")).toBe(0);
    // no rare fish is more than a bite in six of any cast, whatever the bait: a thin water does not make one common
    for (const w of WAYS) for (const o of oddsOf(w.bait, w.hour, w.rain, false, w.shallow, w.signs)) {
      if (o.what in FISH && ITEMS[o.what].tier === 1 && ["rare", "legend"].includes(FISH[o.what as FishId].tier)) expect(o.p).toBeLessThan(0.17);
    }
  });
});

describe("a cast", () => {
  it("is the same cast for the same seed", () => {
    expect(castLine("worm", 9, false, false, seeded(42))).toEqual(castLine("worm", 9, false, false, seeded(42)));
    expect(castLine("worm", 9, false, false, seeded(42))).not.toEqual(castLine("worm", 9, false, false, seeded(43)));
  });

  it("waits as long as its fish does, nibbles before it bites, and is as long as its kind", () => {
    const counts = new Map<CatchId, number>();
    for (let seed = 1; seed <= 3000; seed++) {
      const c = castLine("worm", 20, false, false, seeded(seed));
      counts.set(c.what, (counts.get(c.what) ?? 0) + 1);
      if (c.what in FISH) {
        const f = FISH[c.what as keyof typeof FISH];
        expect(c.wait).toBeGreaterThanOrEqual(f.wait[0]);
        expect(c.wait).toBeLessThanOrEqual(f.wait[1]);
        expect(c.size).toBeGreaterThanOrEqual(f.size[0]);
        expect(c.size).toBeLessThanOrEqual(f.size[1]);
      } else {
        expect(c.nibbles).toEqual([]);
        expect(c.size).toBe(0);
      }
      // (the owner: a short wait, then half of that again, and half of that once more: seconds to a minute, the rare ones longer)
      expect(c.wait).toBeGreaterThanOrEqual(3);
      expect(c.wait).toBeLessThanOrEqual(120);
      // a nibble is well before the bite and well apart from another, so it is never the bite by its timing
      expect(c.nibbles.length).toBeLessThanOrEqual(2);
      const marks = [...c.nibbles, c.wait];
      for (let i = 0; i < marks.length; i++) {
        expect(marks[i]).toBeGreaterThanOrEqual(3);
        if (i) expect(marks[i] - marks[i - 1]).toBeGreaterThanOrEqual(3);
      }
    }
    // what came up is what the odds said, near enough
    for (const o of oddsOf("worm", 20)) expect(Math.abs((counts.get(o.what) ?? 0) / 3000 - o.p)).toBeLessThan(0.035);
    // the wait is anybody's guess: for one kind of fish it runs from a few seconds to several times that, spread all over
    const waits = Array.from({ length: 4000 }, (_, i) => castLine("worm", 9, false, false, seeded(40000 + i))).filter((c) => c.what === "minnow").map((c) => c.wait);
    const [w0, w1] = FISH.minnow.wait;
    expect(w1).toBeGreaterThanOrEqual(w0 * 4);
    expect(Math.min(...waits)).toBeLessThanOrEqual(w0 + 2);
    expect(Math.max(...waits)).toBeGreaterThanOrEqual(w1 - 2);
    for (let k = 0; k < 5; k++) {
      const from = w0 + ((w1 - w0) * k) / 5, to = w0 + ((w1 - w0) * (k + 1)) / 5;
      expect(waits.filter((w) => w >= from && w <= to).length).toBeGreaterThan(waits.length * 0.12);
    }
    // and nobody waits long for a common fish: none of them more than a little over half a minute; the rarest two minutes
    for (const id of FISH_IDS) if (FISH[id].tier === "common") expect(FISH[id].wait[1]).toBeLessThanOrEqual(35);
    for (const id of FISH_IDS) expect(FISH[id].wait[1]).toBeLessThanOrEqual(120);
    // (a bite is never sooner than a nibble could be told from it)
    for (const id of FISH_IDS) expect(FISH[id].wait[0]).toBeGreaterThanOrEqual(3);
    for (const id of FLOTSAM_IDS) { expect(FLOTSAM[id].wait[0]).toBeGreaterThanOrEqual(3); expect(FLOTSAM[id].wait[1]).toBeLessThanOrEqual(75); }
    // most fish are small ones
    const sizes = Array.from({ length: 2000 }, (_, i) => castLine("dough", 10, false, false, seeded(9000 + i))).filter((c) => c.what === "tilapia").map((c) => c.size);
    const [lo, hi] = FISH.tilapia.size;
    expect(sizes.filter((s) => s < (lo + hi) / 2).length).toBeGreaterThan(sizes.length * 0.6);
  });
});

describe("the strike", () => {
  it("has to come after the bite and within moments of it", () => {
    expect(strikeOf(-0.2)).toBeNull();
    expect(strikeOf(0)).toBe("perfect");
    expect(strikeOf(STRIKE.perfect)).toBe("perfect");
    expect(strikeOf(STRIKE.perfect + 0.01)).toBe("good");
    expect(strikeOf(STRIKE.good + 0.01)).toBe("late");
    expect(strikeOf(STRIKE.window)).toBe("late");
    expect(strikeOf(STRIKE.window + 0.01)).toBeNull();
    expect(strikeOf(NaN)).toBeNull();
    // moments, not minutes: the float has to be watched
    expect(STRIKE.window).toBeLessThan(3);
    expect(strikeWindow()).toBe(STRIKE.window);
  });

  it("is easier to time after a meal that sharpens the eye", () => {
    expect(strikeOf(STRIKE.perfect * 1.4, { keen: true })).toBe("perfect");
    expect(strikeOf(STRIKE.window * 1.4, { keen: true })).toBe("late");
    expect(strikeOf(STRIKE.window * 1.6, { keen: true })).toBeNull();
    expect(strikeWindow({ keen: true })).toBeCloseTo(STRIKE.window * 1.5, 9);
    // a keen eye at each of its levels (the owner, 2026-10-06: buffs to a fourth level, "มากสุดแค่ x3"): the first is
    // what it always was, the fourth three times the moment
    expect([0, 1, 2, 3, 4, 9].map((keen) => Math.round((strikeWindow({ keen }) / STRIKE.window) * 100) / 100)).toEqual([1, 1.5, 2, 2.5, 3, 3]);
  });
  it("brings the rare fish oftener the luckier the meal: half as often again, to three times at the fourth level", () => {
    // (one bait, one hour: every rare or better fish's share against the commonest thing on the line)
    const rare = (lucky: number | boolean) => {
      const odds = oddsOf("minnow", 21, false, lucky), top = Math.max(...odds.filter((o) => !(o.what in FISH) || FISH[o.what as FishId].tier === "common").map((o) => o.p));
      return odds.filter((o) => o.what in FISH && ["rare", "legend"].includes(FISH[o.what as FishId].tier)).reduce((t, o) => t + o.p, 0) / top;
    };
    const none = rare(0);
    expect(none).toBeGreaterThan(0);
    expect(rare(false)).toBe(none);
    expect(rare(true)).toBeCloseTo(rare(1), 12);
    expect([1, 2, 3, 4].map((l) => Math.round((rare(l) / none) * 100) / 100)).toEqual([1.5, 2, 2.5, 3]);
  });

  it("is much harder to time with no stamina left", () => {
    // (2026-10-04, eased that night) a second, where a fed hand has a second and a half
    expect(strikeWindow({ spent: true })).toBeLessThan(STRIKE.window * 0.65);
    expect(strikeOf(0.9)).toBe("good");
    expect(strikeOf(1.0, { spent: true })).toBeNull();
    expect(strikeOf(0.9, { spent: true })).toBe("late");
    expect(strikeOf(0.5, { spent: true })).toBe("good");
    // still to be had, by a member watching the float: nine in ten of the members' own strikes come within 0.91 s
    // of the bite (146 of them, kept with their goes), and with half a second only one in ten did
    expect(strikeWindow({ spent: true })).toBeGreaterThanOrEqual(0.91);
    // and a meal that sharpens the eye helps then too
    expect(strikeWindow({ spent: true, keen: true })).toBeGreaterThan(1.4);
  });

  it("is not taken while the line has only just gone out (the members: \"ขอ time zone ช่วงที่โยนผิดไม่นับเสียเหยื่อซัก 2 วิ\")", () => {
    expect(REST.settle).toBe(2);
    expect(settling(0, 12)).toBe(true);
    expect(settling(1.99, 12)).toBe(true);
    expect(settling(2, 12)).toBe(false);
    // never past the bite: a strike that would have hooked something is always taken
    expect(settling(0.99, 1)).toBe(true);
    expect(settling(1, 1)).toBe(false);
    for (const id of FISH_IDS) for (const wait of [FISH[id].wait[0], Math.max(1, Math.ceil(FISH[id].wait[0] * 0.6))])
      for (let s = wait; s <= wait + STRIKE.window; s += 0.1) expect(settling(s, wait), `${id} ${wait} ${s}`).toBe(false);
    // and what a go came to is looked at for a moment before anything goes on from it
    expect(REST.pause).toBeGreaterThanOrEqual(0.8);
    expect(REST.pause).toBeLessThanOrEqual(1.5);
  });
});

describe("the fight", () => {
  it("begins with line to win, the tension in its safe stretch, in the middle of the gauge", () => {
    for (const id of FISH_IDS) {
      const f = startFight(id, "good", {}, 7);
      expect(f.line).toBe(FISH[id].fight.line);
      expect(f.tension).toBeGreaterThan(f.lo);
      expect(f.tension).toBeLessThan(f.hi);
      expect(f.hi - f.lo).toBeCloseTo(FISH[id].fight.band, 9);
      expect((f.lo + f.hi) / 2).toBeCloseTo(FIGHT.centre, 9);
      expect(f.over).toBeNull();
    }
  });

  it("snaps the line of somebody who only reels, and slips the hook of somebody who never does", () => {
    for (const id of FISH_IDS) {
      expect(playFight(startFight(id, "good", {}, 11), () => true).over).toBe("snapped");
      expect(playFight(startFight(id, "good", {}, 11), () => false).over).toBe("slipped");
    }
  });

  it("can be won, every fish of it, by a steady hand", () => {
    for (const id of FISH_IDS) for (const seed of [1, 2, 3, 4, 5]) {
      const r = playFight(startFight(id, "good", {}, seed * 7919), steady);
      expect(r.over).toBe("landed");
      // a small one in seconds, the legend within a minute or so
      expect(r.t).toBeGreaterThan(3);
      expect(r.t).toBeLessThan(90);
    }
    // the harder the fish, the longer it takes
    const secs = (id: (typeof FISH_IDS)[number]) => playFight(startFight(id, "good", {}, 31), steady).t;
    expect(secs("minnow")).toBeLessThan(secs("catfish"));
    expect(secs("catfish")).toBeLessThan(secs("koi"));
  });

  it("is the same fight for the same seed, and leaves what it was given alone", () => {
    const a = startFight("snakehead", "good", {}, 99), frozen = Object.freeze({ ...a, surge: Object.freeze({ ...a.surge }) }) as Fight;
    const hold = (f: Fight) => Math.floor(f.t * 2) % 2 === 0;
    expect(playFight(frozen, hold)).toEqual(playFight(startFight("snakehead", "good", {}, 99), hold));
    expect(stepFight(frozen, true, 1 / 60)).not.toBe(frozen);
    expect(frozen.t).toBe(0);
    // a fight that is over stays as it ended
    let f = a;
    while (!f.over) f = stepFight(f, true, 1 / 60);
    expect(stepFight(f, false, 1)).toBe(f);
  });

  it("wins line only while reeling in the safe stretch", () => {
    const f = startFight("barb", "good", {}, 5);
    const reeling = stepFight(f, true, 0.1), giving = stepFight(f, false, 0.1);
    expect(reeling.line).toBeLessThan(f.line);
    expect(giving.line).toBe(f.line);
    expect(reeling.tension).toBeGreaterThan(f.tension);
    expect(giving.tension).toBeLessThan(f.tension);
    // too tight: no line is won, and the line strains
    const tight = stepFight({ ...f, tension: f.hi + 0.1 }, true, 0.1);
    expect(tight.line).toBe(f.line);
    expect(tight.strain).toBeGreaterThan(0);
    // too slack: the fish takes line back, and the hook works loose
    const slack = stepFight({ ...f, tension: f.lo - 0.2 }, false, 0.1);
    expect(slack.line).toBeGreaterThan(f.line);
    expect(slack.slack).toBeGreaterThan(0);
    // and both mend, back in the stretch
    expect(stepFight({ ...f, strain: 0.5 }, false, 0.5).strain).toBeLessThan(0.5);
  });

  it("is shorter after a perfect strike, and begins with a surge after a late one", () => {
    const good = startFight("tilapia", "good", {}, 3), perfect = startFight("tilapia", "perfect", {}, 3), late = startFight("tilapia", "late", {}, 3);
    expect(perfect.line).toBeCloseTo(good.line * FIGHT.perfect, 9);
    expect(late.line).toBeCloseTo(good.line * FIGHT.late, 9);
    expect(surging(late)).toBe(true);
    expect(surging(good)).toBe(false);
    // a fish that carries the stretch with it has thrown it up the gauge already
    const leap = startFight("koi", "late", {}, 3);
    expect(leap.to).toBeGreaterThan(leap.at);
  });

  it("gives a surge away first for the fish that do, and not for the ones that dart or bolt", () => {
    const tells = (id: (typeof FISH_IDS)[number]) => {
      let f = startFight(id, "good", {}, 21), seen = false;
      while (!f.over && f.t < 20) { seen ||= warning(f); f = stepFight(f, steady(f), 1 / 60); }
      return seen;
    };
    expect(tells("snakehead")).toBe(true);
    expect(tells("catfish")).toBe(true);
    expect(tells("perch")).toBe(false);
    expect(tells("goby")).toBe(false);
  });
});

describe("the safe stretch", () => {
  /** A fight watched for so long, never let end: where the stretch went, how fast, and how long it lay still at a time. */
  function watch(id: FishId, mods: FightMods = {}, seed = 4, secs = 60) {
    let f = startFight(id, "good", mods, seed), low = f.at, high = f.at, fastest = 0, fastestDown = 0, still = 0, longest = 0, inSurge = 0, upInSurge = 0, begun = false;
    const dt = 1 / 60;
    for (let i = 0; i < secs * 60; i++) {
      const next = stepFight({ ...f, over: null, strain: 0, slack: 0, line: 1, tension: f.at }, false, dt);
      const moved = next.at - f.at;
      fastest = Math.max(fastest, Math.abs(moved) / dt);
      if (moved < 0) fastestDown = Math.max(fastestDown, -moved / dt);
      // (how long it lies still at a time, once it has first set off)
      begun ||= moved !== 0;
      still = moved === 0 && begun ? still + dt : 0;
      longest = Math.max(longest, still);
      if (surging(next) && moved !== 0) { inSurge++; if (moved > 0) upInSurge++; }
      low = Math.min(low, next.at); high = Math.max(high, next.at);
      // it never leaves the gauge
      expect(next.lo).toBeGreaterThanOrEqual(FIGHT.edge - 1e-9);
      expect(next.hi).toBeLessThanOrEqual(1 - FIGHT.edge + 1e-9);
      expect(next.hi - next.lo).toBeCloseTo(f.band, 9);
      f = next;
    }
    return { range: high - low, low, high, fastest, fastestDown, longest, inSurge, upInSurge, f };
  }

  it("moves to and fro for every fish (the owner: \"อยากให้แถบสีเขียว ขยับไปมา ตามความยากของปลา\")", () => {
    for (const id of FISH_IDS) {
      const w = watch(id), f = FISH[id].fight;
      // it goes somewhere, a good way in all, no faster than a flick of it (or a leap)
      expect(w.range).toBeGreaterThan(f.sway * 0.8);
      expect(w.fastest).toBeLessThanOrEqual(f.pace * Math.max(FIGHT.leap, FIGHT.flick) + 1e-6);
      expect(w.fastest).toBeGreaterThan(f.pace * 0.9);
      // and it never drops much faster than the tension can fall with the reel let go
      expect(w.fastestDown).toBeLessThanOrEqual((FIGHT.fall - f.pull * FIGHT.loose) * FIGHT.outrun + 1e-6);
      // (the gauge is twice as long as the stretch was drawn for: no stretch is more than a quarter of it)
      expect(f.band).toBeLessThanOrEqual(0.25);
    }
  }, 30_000); // Every fish's simulated fight also runs beside the larger vector suites in CI.

  it("is not held to the middle: it may go anywhere on the gauge (the owner: \"ช่วยทำให้มันมีโอกาศวิ่งไปได้ทั้งหลอดเลย\")", () => {
    for (const id of [...EARLY, "frog", "stingray"] as FishId[]) {
      // over a few fights even the easiest fish takes it to the top of the gauge, or near it, and well below the middle
      const seen = [1, 2, 3, 4, 5, 6].map((seed) => watch(id, {}, seed, 90));
      const low = Math.min(...seen.map((w) => w.low)), high = Math.max(...seen.map((w) => w.high)), half = FISH[id].fight.band / 2;
      expect(high).toBeGreaterThan(1 - FIGHT.edge - half - 0.12);
      expect(low).toBeLessThan(FIGHT.centre - 0.12);
      // and one that does not carry it up when it surges takes it to the bottom as well
      if (!["leaper", "sleeper"].includes(FISH[id].fight.style)) expect(low).toBeLessThan(FIGHT.edge + half + 0.12);
    }
  }, 30_000);

  it("moves further at a time and faster the harder the fish", () => {
    const order: FishId[] = ["minnow", "barb", "tilapia", "catfish", "pangasius", "snakehead", "koi"];
    for (let i = 1; i < order.length; i++) expect(FISH[order[i]].fight.sway).toBeGreaterThanOrEqual(FISH[order[i - 1]].fight.sway);
    // every fish of a tier moves at least as far as the easiest of the tier before it
    const least = (tier: string) => Math.min(...EARLY.filter((id) => FISH[id].tier === tier).map((id) => FISH[id].fight.sway));
    expect(least("uncommon")).toBeGreaterThan(least("common"));
    expect(least("rare")).toBeGreaterThan(least("uncommon"));
    // of the steady ones there were at first, the harder is also the faster
    const steadies = (["barb", "tilapia", "catfish", "pangasius"] as FishId[]).filter((id) => FISH[id].fight.style === "steady");
    expect(steadies.length).toBe(4);
    for (let i = 1; i < steadies.length; i++) expect(FISH[steadies[i]].fight.pace).toBeGreaterThan(FISH[steadies[i - 1]].fight.pace);
  });

  it("is anybody's guess (the owner: \"ช่วยทำให้ การสะบัดของหลอดเขียว random กว่านี้\"): where it goes, how fast, and whether it rests", () => {
    /** The moves of a fight's first minute: where each ended, and how fast it went. */
    const moves = (id: FishId, seed: number) => {
      let f = startFight(id, "good", {}, seed);
      const out: Array<{ to: number; speed: number; from: number }> = [];
      for (let i = 0; i < 60 * 60; i++) {
        const next = stepFight({ ...f, over: null, strain: 0, slack: 0, line: 1, tension: f.at }, false, 1 / 60);
        if (next.to !== f.to) out.push({ to: next.to, speed: next.speed, from: f.at });
        f = next;
      }
      return out;
    };
    for (const id of ["barb", "perch", "eel", "koi"] as const) {
      const f = FISH[id].fight, a = moves(id, 11), b = moves(id, 12);
      expect(a.length).toBeGreaterThan(6);
      // no two fights alike
      expect(a.map((m) => m.to.toFixed(3)).join()).not.toBe(b.map((m) => m.to.toFixed(3)).join());
      // not to and fro like a clock: it goes on the same way sometimes, and both ways in all
      const ways = a.map((m) => Math.sign(m.to - m.from));
      expect(ways.some((w, i) => i > 0 && w === ways[i - 1])).toBe(true);
      expect(ways.includes(1) && ways.includes(-1)).toBe(true);
      // long moves and short, quick and slow
      const far = a.map((m) => Math.abs(m.to - m.from)), speeds = [...new Set(a.map((m) => m.speed.toFixed(4)))];
      expect(Math.max(...far)).toBeGreaterThan(Math.min(...far) * 2);
      expect(speeds.length).toBeGreaterThan(4);
      // and every move does go somewhere, no further at a time than the fish's sway
      for (const m of a) { expect(Math.abs(m.to - m.from)).toBeGreaterThan(0.005); expect(Math.abs(m.to - m.from)).toBeLessThanOrEqual(f.sway + 1e-9); }
    }
    // a flick is quicker than a slide and shorter: the darters flick about half the time, the heavy fish seldom
    const flicks = (id: FishId) => { const all = [5, 6, 7, 8].flatMap((s) => moves(id, s)); return all.filter((m) => m.speed > FISH[id].fight.pace * 2).length / all.length; };
    expect(flicks("perch")).toBeGreaterThan(0.3);
    expect(flicks("barb")).toBeLessThan(0.25);
    for (const m of moves("perch", 5)) if (m.speed > FISH.perch.fight.pace * 2) expect(Math.abs(m.to - m.from)).toBeLessThanOrEqual(FISH.perch.fight.sway * FIGHT.dart[1] + 1e-9);
  });

  it("moves in each kind's own way: the slippery one never rests, the sleeper lies still, a leap carries it up", () => {
    expect(watch("eel").longest).toBeLessThan(0.3);
    expect(watch("goby").longest).toBeGreaterThan(2);
    expect(watch("barb").longest).toBeGreaterThan(0.5);
    for (const id of ["snakehead", "featherback", "koi", "goby"] as const) {
      const w = watch(id);
      expect(w.inSurge).toBeGreaterThan(0);
      expect(w.upInSurge).toBe(w.inSurge);
    }
  });

  it("is never out of a hand's reach: it moves no faster than the tension can follow", () => {
    for (const id of FISH_IDS) {
      const f = FISH[id].fight;
      // down, with the reel let go, at rest; up, with it held, even while the stretch is carried
      expect(f.pace).toBeLessThan(FIGHT.fall - f.pull * FIGHT.loose);
      expect(f.pace * FIGHT.leap).toBeLessThan(FIGHT.rise + f.surge * FIGHT.held);
    }
  });
});

describe("with no stamina left (the owner: \"ถ้า stamina หมด mini game ทุกอย่างจะยากขึ้นมากด้วย\")", () => {
  it("the stretch is narrower, moves further and faster, and the fish surges harder; steady hands widen it", () => {
    const fresh = startFight("catfish", "good", {}, 3), spent = startFight("catfish", "good", { spent: true }, 3), calm = startFight("catfish", "good", { calm: true }, 3);
    // (steady hands at each level: a fifth wider, as ever, to three times as wide)
    expect([1, 2, 3, 4].map((l) => { const f = startFight("catfish", "good", { calm: l }, 3); return Math.round(((f.hi - f.lo) / (fresh.hi - fresh.lo)) * 100) / 100; })).toEqual([1.2, 1.6, 2.2, 3]);
    // (2026-10-04, eased that night: half of the stretch was left, where with a good third of it the members landed
    // nothing. 2026-10-07, eased again: three quarters of it, since a tired newcomer still landed not one minnow)
    expect(spent.hi - spent.lo).toBeLessThan((fresh.hi - fresh.lo) * 0.8);
    expect(spent.hi - spent.lo).toBeGreaterThan((fresh.hi - fresh.lo) * 0.7);
    expect(spent.power).toBeGreaterThan(fresh.power * 1.1);
    expect(spent.sway).toBeGreaterThan(fresh.sway * 1.05);
    expect(spent.pace).toBeGreaterThan(fresh.pace * 1.15);
    expect(calm.hi - calm.lo).toBeGreaterThan((fresh.hi - fresh.lo) * 1.15);
    // every number of it makes things harder, none easier
    expect(STAMINA.spent.strike).toBeLessThan(1);
    expect(STAMINA.spent.band).toBeLessThan(1);
    for (const k of ["surge", "sway", "pace"] as const) expect(STAMINA.spent[k]).toBeGreaterThan(1);
    // still to be won, by a hand steady enough
    expect(playFight(spent, steady).over).toBe("landed");
  });

  it("the small fish are still landed, the big ones are for whoever has eaten (the owner, 2026-10-07, of a member's complaint: \"มีคนบ่นว่า stamina หมดแล้วตกปลาได้ยาก ในขณะที่เข้าป่าตอน stamina หมดยังเก็บของได้เรื่อยๆ\")", () => {
    const SMALL = ["minnow", "barb", "tilapia", "catfish"] as const, BIG = ["perch", "pangasius", "snakehead"] as const, tired = { spent: true };
    // (as it was until that day a tired newcomer landed not one fish, not a minnow, and lost the bait each time)
    expect(lands("minnow", NEW, tired)).toBeGreaterThan(0.5);
    expect(lands("barb", NEW, tired)).toBeGreaterThan(0.3);
    expect(lands("tilapia", NEW, tired)).toBeGreaterThan(0.1);
    expect(lands("minnow", AVERAGE, tired)).toBeGreaterThan(0.75);
    expect(lands("barb", AVERAGE, tired)).toBeGreaterThan(0.6);
    expect(lands("tilapia", AVERAGE, tired)).toBeGreaterThan(0.5);
    // tired hands land fewer of every one of them than fed hands do: a meal is still worth having
    for (const id of SMALL) for (const hand of [NEW, AVERAGE]) expect(lands(id, hand, tired), id).toBeLessThan(lands(id, hand));
    for (const id of SMALL) expect(lands(id, SKILLED, tired), id).toBeLessThanOrEqual(lands(id, SKILLED));
    // a catfish is the first that takes a meal, or practice
    expect(lands("catfish", NEW, tired)).toBeLessThan(0.1);
    expect(lands("catfish", SKILLED, tired)).toBeGreaterThan(0.6);
    // the bigger fish are for somebody who has eaten: a newcomer and an average hand land next to none of them, a
    // practised hand far fewer than fed
    for (const id of BIG) {
      expect(lands(id, NEW, tired), id).toBeLessThan(0.05);
      expect(lands(id, AVERAGE, tired), id).toBeLessThan(0.1);
      expect(lands(id, SKILLED, tired), id).toBeLessThan(lands(id, SKILLED) - 0.25);
      expect(lands(id, MASTER), id).toBeGreaterThan(0.8);
    }
  });
});

describe("how hard it is, for made-up players of three speeds (the owner: \"ยากระดับหนึ่ง จะได้ learning curve สูง\")", () => {
  it("lets a newcomer land the small ones, and keeps the big ones for practised hands", () => {
    expect(lands("minnow", NEW)).toBeGreaterThan(0.8);
    expect(lands("barb", NEW)).toBeGreaterThan(0.6);
    expect(lands("catfish", NEW)).toBeGreaterThan(0.25);
    expect(lands("catfish", NEW)).toBeLessThan(0.75);
    expect(lands("pangasius", NEW)).toBeLessThan(0.4);
    expect(lands("koi", NEW)).toBeLessThan(0.1);
  });

  it("rewards practice: the skilled land far more of every hard fish than the average, and the average more than a newcomer", () => {
    for (const id of ["catfish", "pangasius", "snakehead", "goby", "koi"] as const) {
      const [s, a, n] = [lands(id, SKILLED), lands(id, AVERAGE), lands(id, NEW)];
      expect(s).toBeGreaterThan(a);
      expect(a).toBeGreaterThanOrEqual(n);
    }
    // the legend can be landed, and mostly is not
    expect(lands("koi", SKILLED)).toBeGreaterThan(0.1);
    expect(lands("koi", SKILLED)).toBeLessThan(0.6);
    expect(lands("koi", AVERAGE)).toBeLessThan(0.3);
  });
});

describe("a fight written down", () => {
  it("plays again exactly: the same end at the same step, from how it began and when the reel was held", () => {
    for (const [id, seed] of [["catfish", 5], ["koi", 6], ["eel", 7], ["goby", 8]] as const) {
      const start = startFight(id, "good", {}, seed), holds: number[] = [];
      let f = start, was = false, steps = 0;
      while (!f.over && steps < STEPS * 120) {
        // a hand that looks only every third step
        const hold: boolean = steps % 3 === 0 ? steady(f) : was;
        if (hold !== was) { holds.push(steps); was = hold; }
        f = stepFight(f, hold, 1 / STEPS);
        steps++;
      }
      const again = replayFight(startFight(id, "good", {}, seed), holds, steps);
      expect(again).toEqual(f);
      // and a different hand ends differently: the reel let go for good a quarter of the way through
      const other = replayFight(startFight(id, "good", {}, seed), holds.slice(0, Math.floor(holds.length / 8) * 2), STEPS * 120);
      expect(other.over).toBe("slipped");
    }
  });
});

/* ── the gifts of the deck's ranks ── */
const NOON = Date.parse("2026-10-06T12:00:00+07:00");
/** A purse with all its stamina, and these gifts. */
const gifted = (gifts: Purse["gifts"] = { had: [], charms: [] }, more: Partial<Purse> = {}): Purse => ({ ...newPurse(), stamina: { day: dayOf(NOON), left: 100 }, gifts, ...more });

describe("a cast from what may take it", () => {
  it("is the cast a bait's own odds make, and what the odds say it is when they say one thing", () => {
    for (const seed of [1, 2, 3, 99]) expect(castFrom(oddsOf("worm", 12), seeded(seed))).toEqual(castLine("worm", 12, false, false, seeded(seed)));
    const koi = castFrom([{ what: "koi", p: 1 }], seeded(5));
    expect(koi.what).toBe("koi");
    expect(koi.size).toBeGreaterThanOrEqual(FISH.koi.size[0]);
    expect(koi.wait).toBeGreaterThanOrEqual(FISH.koi.wait[0]);
  });
});

describe("the otter (the owner: \"ปลาหลุดเมื่อไหร่ นากต้อนกลับมาให้สู้ใหม่ทันทีอีกหนึ่งรอบ\")", () => {
  const follows = gifted({ had: ["famOtter"], charms: [], familiar: "famOtter" });
  it("drives a fish that got away back: a line snapped or a hook slipped, and counts it", () => {
    for (const how of ["snapped", "slipped"]) {
      const did = driveBack(follows, how, false, NOON);
      expect(did.ok && did.left).toBe(USES.famOtter!.n - 1);
      expect(did.ok && usesLeft(did.purse, "famOtter", NOON)).toBe(USES.famOtter!.n - 1);
    }
  });
  it("once to a line: lost again, it is lost", () => {
    expect(driveBack(follows, "slipped", true, NOON)).toEqual({ ok: false, why: "none" });
  });
  it("is for a fish lost in the fight, not for one landed, a line taken up or a strike mistimed", () => {
    for (const how of ["landed", "left", "early", "missed"]) expect(driveBack(follows, how, false, NOON)).toEqual({ ok: false, why: "none" });
  });
  it("only while it follows, and so many times to a meal's hours", () => {
    expect(driveBack(gifted({ had: ["famOtter"], charms: [], familiar: null }), "slipped", false, NOON)).toEqual({ ok: false, why: "none" });
    expect(driveBack(gifted(), "slipped", false, NOON)).toEqual({ ok: false, why: "none" });
    let p = follows, n = 0;
    for (;;) { const did = driveBack(p, "snapped", false, NOON); if (!did.ok) { expect(did.why).toBe("spent"); break; } p = did.purse; n++; }
    expect(n).toBe(10);
    // (the next meal's hours begin anew)
    expect(driveBack(p, "snapped", false, NOON + 6 * 3_600_000).ok).toBe(true);
  });
});

describe("a rod of two lines (the owner: \"ตกได้ทีละคู่: ปลาอีกตัวติดสายที่สองมาด้วย ต้องสู้สองตัวพร้อมกัน\")", () => {
  const NARROW = { narrow: numberOf("thingRod") };
  /** A hand that keeps the needle where the two stretches lie over each other, when they do; else in the upper one. */
  const meet = (p: Pair) => {
    const live = ([0, 1] as const).filter((i) => !p.ended[i]), lo = Math.max(...live.map((i) => p.lo[i])), hi = Math.min(...live.map((i) => p.hi[i]));
    const u = live.reduce((a, i) => (p.hi[i] > p.hi[a] ? i : a)), [a, b] = hi > lo ? [lo, hi] : [p.lo[u], p.hi[u]];
    return p.tension < a + (b - a) * (live.some((i) => surging(p.fights[i]) || warning(p.fights[i])) ? 0.25 : 0.5);
  };
  const play = (p: Pair, hold: (p: Pair) => boolean, limit = 240) => {
    const order: Array<[number, string]> = [];
    while (!(p.ended[0] && p.ended[1]) && p.t < limit) {
      const before = p.ended;
      p = stepPair(p, hold(p), 1 / 60);
      for (const i of [0, 1] as const) if (!before[i] && p.ended[i]) order.push([i, p.ended[i]!]);
    }
    return { p, order };
  };

  it("never brings a legend as one of a pair: what may take the bait is sifted of them, and still adds up", () => {
    expect(PAIR.never).toEqual(["legend"]);
    for (const [bait, hour] of [["dough", 6], ["dough", 18], ["loach", 6], ["worm", 12], ["minnow", 23]] as Array<[BaitId, number]>) {
      const own = oddsOf(bait, hour), left = sift(own, PAIR.never);
      expect(left.every((o) => !(o.what in FISH) || FISH[o.what as FishId].tier !== "legend")).toBe(true);
      expect(left.reduce((t, o) => t + o.p, 0)).toBeCloseTo(1, 9);
      // (what is left keeps its order and its shares beside each other)
      expect(left.map((o) => o.what)).toEqual(own.filter((o) => !(o.what in FISH) || FISH[o.what as FishId].tier !== "legend").map((o) => o.what));
      if (left.length > 1) expect(left[0].p / left[1].p).toBeCloseTo(own.find((o) => o.what === left[0].what)!.p / own.find((o) => o.what === left[1].what)!.p, 9);
    }
    // (dough at dawn does bring the koi to a single line: it is the pair that never does)
    expect(oddsOf("dough", 6).some((o) => o.what === "koi")).toBe(true);
    expect(sift(oddsOf("dough", 6), PAIR.never).some((o) => o.what === "koi")).toBe(false);
    // (sifted of nothing, the odds are as they were)
    expect(sift(oddsOf("worm", 12), [])).toEqual(oddsOf("worm", 12));
  });

  it("takes two of the bait: as many have to be in the bag, a bait that is not eaten stays, and a rod is needed as ever", () => {
    const bag = (things: Array<[ItemId, number]>) => things.reduce((b, [id, n]) => put(b, id, n), newPurse().bag);
    const p = gifted(undefined, { bag: bag([["rod", 1], ["worm", 5], ["lure", 2]]) });
    const two = hookBaits(p, "worm", 2);
    expect(two.ok && held(two.purse.bag, "worm")).toBe(3);
    expect(hookBaits(gifted(undefined, { bag: bag([["rod", 1], ["worm", 1]]) }), "worm", 2)).toEqual({ ok: false, why: "none" });
    expect(hookBaits(gifted(undefined, { bag: bag([["worm", 5]]) }), "worm", 2)).toEqual({ ok: false, why: "tool" });
    const lures = hookBaits(p, "lure", 2);
    expect(lures.ok && held(lures.purse.bag, "lure")).toBe(2);
    expect(hookBaits(gifted(undefined, { bag: bag([["rod", 1], ["lure", 1]]) }), "lure", 2)).toEqual({ ok: false, why: "none" });
    // (one is the plain line's)
    expect(hookBaits(p, "worm", 1)).toEqual(hookBait(p, "worm"));
  });

  it("begins with both on one line's tension, each in a stretch of its own a quarter narrower, lying over each other", () => {
    const p = startPair(["barb", "tilapia"], "good", NARROW, 5), alone = startFight("barb", "good", {}, 5);
    expect(NARROW.narrow).toBe(0.75);
    expect(p.hi[0] - p.lo[0]).toBeCloseTo((alone.hi - alone.lo) * 0.75, 9);
    expect(p.hi[1] - p.lo[1]).toBeCloseTo(FISH.tilapia.fight.band * 0.75, 9);
    expect(p.tension).toBe(0.5);
    expect(p.ended).toEqual([null, null]);
    expect(Math.min(p.hi[0], p.hi[1]) - Math.max(p.lo[0], p.lo[1])).toBeGreaterThan(0);
    for (const i of [0, 1] as const) expect(p.fights[i].line).toBe(p.fights[i].length);
  });

  it("wins line for each fish whose stretch the tension is in: for both where the two lie over each other, for one where they part", () => {
    // (held to a place by hand: the tension put where it is wanted, a step taken with the reel held)
    const p = startPair(["barb", "tilapia"], "good", NARROW, 5);
    const lo = Math.max(p.lo[0], p.lo[1]), hi = Math.min(p.hi[0], p.hi[1]);
    const both = stepPair({ ...p, tension: (lo + hi) / 2 - 0.004 }, true, 1 / 60);
    expect(both.fights[0].line).toBeLessThan(p.fights[0].line);
    expect(both.fights[1].line).toBeLessThan(p.fights[1].line);
    // parted: the first fish high on the gauge and the second as far below it as it strays (two narrow stretches, of
    // two fish that keep still and do not surge meanwhile)
    const q = startPair(["eel", "prawn"], "good", NARROW, 5), still = { rest: 99, surge: { from: 99, to: 100 } };
    const parted: Pair = { ...q, fights: [{ ...q.fights[0], at: 0.8, to: 0.8, ...still }, { ...q.fights[1], at: 0.12, to: 0.12, ...still }] };
    const upper = stepPair({ ...parted, tension: 0.8 }, true, 1 / 60);
    expect(upper.lo[0]).toBeGreaterThan(upper.hi[1]);
    expect(upper.fights[0].line).toBeLessThan(parted.fights[0].line);
    expect(upper.fights[1].line).toBe(parted.fights[1].line);
    // between the two nothing is won, and nothing strains or goes slack
    const gap = (upper.lo[0] + upper.hi[1]) / 2, between = stepPair({ ...parted, tension: gap + 0.003, strain: 0.3, slack: 0.3 }, false, 1 / 60);
    expect(between.tension).toBeGreaterThan(between.hi[1]);
    expect(between.tension).toBeLessThan(between.lo[0]);
    expect(between.fights[0].line).toBe(parted.fights[0].line);
    expect(between.fights[1].line).toBe(parted.fights[1].line);
    expect(between.strain).toBeLessThan(0.3);
    expect(between.slack).toBeLessThan(0.3);
    // above both the line strains; below both the hook works loose and both take line back
    expect(stepPair({ ...parted, tension: 0.95 }, true, 1 / 60).strain).toBeGreaterThan(0);
    const under = stepPair({ ...parted, tension: 0.3 }, false, 1 / 60);
    expect(under.slack).toBeGreaterThan(0);
    expect(under.fights[0].line).toBeGreaterThan(parted.fights[0].line);
    expect(under.fights[1].line).toBeGreaterThan(parted.fights[1].line);
  });

  it("loses them one at a time: only reeling snaps one line and then the other; never reeling slips one hook and then the other", () => {
    for (const seed of [3, 11, 29]) {
      const taut = play(startPair(["catfish", "carp"], "good", NARROW, seed), () => true), slack = play(startPair(["catfish", "carp"], "good", NARROW, seed), () => false);
      expect(taut.order.map(([, how]) => how)).toEqual(["snapped", "snapped"]);
      expect(slack.order.map(([, how]) => how)).toEqual(["slipped", "slipped"]);
      // (one and then the other: never both in the same moment, and the second's meters begin anew)
      expect(taut.order[0][0]).not.toBe(taut.order[1][0]);
    }
    const p = startPair(["catfish", "carp"], "good", NARROW, 3);
    let q = p, first = -1;
    while (!q.ended[0] && !q.ended[1]) q = stepPair(q, true, 1 / 60);
    first = q.ended[0] ? 0 : 1;
    expect(q.ended[first === 0 ? 1 : 0]).toBeNull();
    expect(q.strain).toBe(0);
    expect(q.slack).toBe(0);
  });

  it("can be won, both of them, by a hand that keeps where the two meet; and a fish landed leaves the other to be won alone", () => {
    let both = 0, any = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { p, order } = play(startPair(["minnow", "barb"], "good", NARROW, seed * 7919), meet);
      const n = p.ended.filter((e) => e === "landed").length;
      if (n === 2) both++;
      if (n >= 1) any++;
      expect(order.length).toBe(2);
    }
    expect(both).toBeGreaterThan(22);
    expect(any).toBe(30);
    // alone again, the second fish's stretch goes back to moving all its own way
    let p = startPair(["minnow", "pangasius"], "good", NARROW, 77);
    expect(p.own).toBe(PAIR.stray);
    while (!p.ended[0] && p.t < 120) p = stepPair(p, meet(p), 1 / 60);
    expect(p.ended[0]).not.toBeNull();
    const at = p.t;
    while (!p.ended[1] && p.t < at + PAIR.alone * 3) p = stepPair(p, meet(p), 1 / 60);
    if (!p.ended[1]) { expect(p.own).toBeGreaterThan(0.95); expect(Math.abs(p.about - FIGHT.centre)).toBeLessThan(0.03); }
  });

  it("is harder than either alone, and quicker than one after the other for a hand that can", () => {
    const hand = (delay: number, lapses: number, seed: number, fish: [FishId, FishId]) => {
      const rnd = seeded(seed), dt = 1 / 60, lag = Math.round(delay / dt), seen: Pair[] = [];
      let p = startPair(fish, "good", NARROW, 1000 + seed * 7919), hold = false, frozen = 0;
      while (!(p.ended[0] && p.ended[1]) && p.t < 240) {
        seen.push(p);
        if (frozen > 0) frozen -= dt; else { if (rnd() < lapses * dt) frozen = 0.5; hold = meet(seen[Math.max(0, seen.length - 1 - lag)]); }
        p = stepPair(p, hold, dt);
      }
      return p;
    };
    const many = 60, of = (who: [number, number], fish: [FishId, FishId]) => { let n = 0, secs = 0; for (let i = 0; i < many; i++) { const p = hand(who[0], who[1], 77 + i, fish); n += p.ended.filter((e) => e === "landed").length; secs += p.t; } return { landed: n / many, secs: secs / many }; };
    const small: [FishId, FishId] = ["minnow", "barb"], skilled = of(SKILLED, small), average = of(AVERAGE, small), fresh = of(NEW, small);
    // a practised hand lands most of two small fish; an average one fewer; a newcomer about one of the two
    expect(skilled.landed).toBeGreaterThan(1.6);
    expect(average.landed).toBeGreaterThan(1.2);
    expect(average.landed).toBeLessThan(skilled.landed);
    expect(fresh.landed).toBeLessThan(average.landed);
    // …and fewer than the same hand lands of the two one after the other
    expect(skilled.landed).toBeLessThan(lands("minnow", SKILLED) + lands("barb", SKILLED));
    expect(average.landed).toBeLessThan(lands("minnow", AVERAGE) + lands("barb", AVERAGE));
    // two fish that are hard alone are far harder together
    const hard = of(SKILLED, ["snakehead", "eel"]);
    expect(hard.landed).toBeLessThan(lands("snakehead", SKILLED) + lands("eel", SKILLED) - 0.1);
    expect(of(MASTER, ["snakehead", "eel"]).landed).toBeGreaterThan(1.3);
  });
});

describe("a line of dragon silk (the owner: \"สายตึงเกินหรือหย่อนเกินยังไม่หลุดทันที มีเวลาแก้ 3 วินาที แก้ไม่ทันปลาหลุดตามเดิม\")", () => {
  const SECS = numberOf("charmLine"), silk = { silk: SECS };
  /** Play on from a fight until something is being mended (or it is over). */
  const untilMend = (f: Fight, hold: boolean) => { while (!f.over && !f.mend) f = stepFight(f, hold, 1 / 120); return f; };

  it("gives three seconds from the moment the fish would have been lost: only reeling, the line snaps three seconds later than it would", () => {
    expect(SECS).toBe(3);
    for (const id of ["minnow", "catfish", "snakehead", "koi"] as const) for (const seed of [3, 11]) {
      const plain = playFight(startFight(id, "good", {}, seed), () => true, 1 / 120), worn = playFight(startFight(id, "good", silk, seed), () => true, 1 / 120);
      expect(plain.over).toBe("snapped");
      expect(worn.over).toBe("snapped");
      expect(worn.t - plain.t).toBeGreaterThan(SECS - 0.02);
      expect(worn.t - plain.t).toBeLessThan(SECS + 0.05);
      const slack = playFight(startFight(id, "good", {}, seed), () => false, 1 / 120), loose = playFight(startFight(id, "good", silk, seed), () => false, 1 / 120);
      expect(slack.over).toBe("slipped");
      expect(loose.over).toBe("slipped");
      expect(loose.t).toBeGreaterThan(slack.t);
    }
  });

  it("begins the mending at the moment the line would have snapped or the hook slipped, and says which", () => {
    const taut = untilMend(startFight("catfish", "good", silk, 5), true), plain = playFight(startFight("catfish", "good", {}, 5), () => true, 1 / 120);
    expect(taut.over).toBeNull();
    expect(taut.mend).toEqual({ how: "snapped", left: SECS });
    expect(taut.t).toBeCloseTo(plain.t, 6);
    const loose = untilMend(startFight("catfish", "good", silk, 5), false);
    expect(loose.mend?.how).toBe("slipped");
  });

  it("mended, the fish is on still: the tension back in the safe stretch in time, with half of that strain left on the line", () => {
    let f = untilMend(startFight("catfish", "good", silk, 5), true);
    // (the reel let go: the tension falls back into the stretch)
    let secs = 0;
    while (f.mend && !f.over) { f = stepFight(f, false, 1 / 120); secs += 1 / 120; }
    expect(f.over).toBeNull();
    expect(f.mend).toBeNull();
    expect(secs).toBeLessThan(SECS);
    expect(f.strain).toBe(SILK.left);
    expect(f.tension).toBeLessThanOrEqual(f.hi);
    // (once to a fight: the silk has done what it does)
    expect(f.silk).toBe(0);
    // …and can be won from there by a steady hand
    expect(playFight(f, steady).over).toBe("landed");
    // not mended, it is lost as ever
    let g = untilMend(startFight("catfish", "good", silk, 5), true);
    while (!g.over) g = stepFight(g, true, 1 / 120);
    expect(g.over).toBe("snapped");
  });

  it("takes no failing away (the owner: \"แรงไป แบบนี้จะไม่มีการ fail เกิดขึ้นเลย\"): it mends once to a fight, and the next time the fish is lost at once", () => {
    // mended once…
    let f = untilMend(startFight("catfish", "good", silk, 5), true);
    while (f.mend && !f.over) f = stepFight(f, false, 1 / 120);
    expect(f.over).toBeNull();
    // …the line strained through again snaps there and then, as a line with no silk does
    const from = f.t;
    let g = f, plain: Fight = { ...f, silk: undefined, mend: undefined };
    while (!g.over) { g = stepFight(g, true, 1 / 120); plain = stepFight(plain, true, 1 / 120); }
    expect(g.over).toBe("snapped");
    expect(g.t).toBe(plain.t);
    expect(g.t).toBeGreaterThan(from);
    expect(g.mend).toBeNull();
    // a fish never reeled is gone all the same: the hook saved once, the slack comes again
    expect(playFight(startFight("barb", "good", silk, 9), () => false).over).toBe("slipped");
    // made-up hands land more with it than without, and still lose the hard fish
    for (const [id, hand] of [["snakehead", AVERAGE], ["koi", SKILLED], ["pangasius", AVERAGE]] as Array<[FishId, [number, number]]>) {
      expect(lands(id, hand, silk), id).toBeGreaterThan(lands(id, hand) + 0.15);
      expect(lands(id, hand, silk), id).toBeLessThan(0.85);
    }
    expect(lands("koi", AVERAGE, silk)).toBeLessThan(0.1);
    expect(lands("snakehead", NEW, silk)).toBeLessThan(0.1);
  });

  it("is nothing to a fight without it: the same fight step for step", () => {
    const hold = (f: Fight) => Math.floor(f.t * 2) % 2 === 0;
    for (const seed of [1, 2, 3]) {
      let a = startFight("eel", "good", {}, seed), b = startFight("eel", "good", { silk: 0 }, seed);
      expect(b).toEqual(a);
      while (!a.over) { a = stepFight(a, hold(a), 1 / 120); b = stepFight(b, hold(b), 1 / 120); }
      expect(b).toEqual(a);
    }
  });

  it("holds for two fish at once as for one: three seconds to bring the tension back into either stretch before one is lost", () => {
    const NARROW = { narrow: numberOf("thingRod") };
    const lose = (mods: FightMods) => { let p = startPair(["catfish", "carp"], "good", mods, 3); while (!p.ended[0] && !p.ended[1]) p = stepPair(p, true, 1 / 120); return p; };
    const plain = lose(NARROW), worn = lose({ ...NARROW, ...silk });
    expect(worn.t - plain.t).toBeGreaterThan(SECS - 0.02);
    expect(worn.t - plain.t).toBeLessThan(SECS + 0.05);
    // mended: back into a stretch in time, neither is lost, and half the strain is left
    let p = startPair(["catfish", "carp"], "good", { ...NARROW, ...silk }, 3);
    while (!p.mend) p = stepPair(p, true, 1 / 120);
    expect(p.mend).toEqual({ how: "snapped", left: SECS });
    while (p.mend) p = stepPair(p, false, 1 / 120);
    expect(p.ended).toEqual([null, null]);
    expect(p.strain).toBe(SILK.left);
    expect(p.silk).toBe(0);
    // without it the pair is as it was
    expect(startPair(["catfish", "carp"], "good", NARROW, 3).silk).toBe(0);
  });
});

describe("a sky orb (the owner: \"เลือกฟ้าเอง (กลางคืน ฝน หรือจันทร์เต็มดวง) 30 นาที และช่วงนั้นปลากินเบ็ดเร็วขึ้น 2 เท่า วันละครั้ง เฉพาะเรา\")", () => {
  const owner = gifted({ had: ["thingOrb"], charms: [] });
  it("is lit under one of three skies by whoever has it, for thirty minutes, once a day", () => {
    expect(ORB.skies).toEqual(["night", "rain", "moon"]);
    const lit = lightOrb(owner, "rain", NOON);
    expect(lit.ok && lit.until).toBe(NOON + 30 * 60_000);
    expect(lit.ok && lit.purse.orb).toEqual({ sky: "rain", until: NOON + 30 * 60_000 });
    expect(lit.ok && usesLeft(lit.purse, "thingOrb", NOON)).toBe(0);
    // once a day: not again today, under any sky; again tomorrow
    expect(lit.ok && lightOrb(lit.purse, "moon", NOON + 60_000)).toEqual({ ok: false, why: "spent" });
    expect(lit.ok && lightOrb(lit.purse, "moon", NOON + 31 * 60_000)).toEqual({ ok: false, why: "spent" });
    expect(lit.ok && lightOrb(lit.purse, "moon", NOON + 24 * 3_600_000).ok).toBe(true);
    // a sky there is none of; somebody who has no orb
    expect(lightOrb(owner, "noon", NOON)).toEqual({ ok: false, why: "none" });
    expect(lightOrb(gifted(), "rain", NOON)).toEqual({ ok: false, why: "none" });
    expect(usesLeft(owner, "thingOrb", NOON)).toBe(1);
  });

  it("shines until its minutes are over, and a sky kept wrongly is no sky", () => {
    const lit = lightOrb(owner, "night", NOON);
    if (!lit.ok) throw new Error("not lit");
    expect(orbOf(lit.purse, NOON)).toBe("night");
    expect(orbOf(lit.purse, NOON + 30 * 60_000 - 1)).toBe("night");
    expect(orbOf(lit.purse, NOON + 30 * 60_000)).toBeNull();
    expect(orbOf(owner, NOON)).toBeNull();
    for (const orb of [null, "night", { sky: "noon", until: NOON + 9 }, { sky: "rain" }, { sky: "rain", until: "soon" }, ["rain", NOON + 9]]) expect(orbOf({ orb } as unknown as Purse, NOON)).toBeNull();
  });

  it("makes the water answer as if under its sky: an hour of the night, rain, a night of a full moon", () => {
    expect(underOrb(null, 12, false, ["after"])).toEqual({ hour: 12, rain: false, signs: ["after"] });
    expect(underOrb("night", 12, false, ["after"])).toEqual({ hour: ORB.night, rain: false, signs: ["after"] });
    expect(underOrb("night", 12, true, [])).toEqual({ hour: ORB.night, rain: true, signs: [] });
    // (under an orb's rain no sky has just cleared)
    expect(underOrb("rain", 12, false, ["tired", "after"])).toEqual({ hour: 12, rain: true, signs: ["tired"] });
    expect(underOrb("moon", 12, false, ["tired"])).toEqual({ hour: ORB.night, rain: false, signs: ["tired", "full"] });
    expect(underOrb("moon", 3, false, ["full"])).toEqual({ hour: ORB.night, rain: false, signs: ["full"] });
    // what comes of it, at noon under a clear sky: the night's fish on a minnow; the rain's own on a loach; the moon's on dough
    const at = (sky: OrbSky | null, bait: BaitId) => { const u = underOrb(sky, 12, false, []); return oddsOf(bait, u.hour, u.rain, false, false, u.signs).map((o) => o.what); };
    expect(at(null, "minnow")).not.toContain("featherback");
    expect(at("night", "minnow")).toContain("featherback");
    expect(at(null, "loach")).not.toContain("salmon");
    expect(at("rain", "loach")).toContain("salmon");
    expect(at("night", "dough")).not.toContain("moonFish");
    expect(at("moon", "dough")).toContain("moonFish");
    // …and what bites by day does not bite under an orb's night, as it does not at night
    expect(at(null, "dough")).toContain("tilapia");
    expect(at("night", "dough")).not.toContain("tilapia");
    expect(at("rain", "dough")).toContain("tilapia");
  });

  it("brings bites twice as soon", () => {
    expect(orbHaste()).toBe(0.5);
    for (const seed of [1, 2, 3, 4, 5]) {
      const cast = castLine("worm", 12, false, false, seeded(seed)), soon = hastened(cast, orbHaste());
      expect(soon.wait).toBe(Math.max(1, Math.ceil(cast.wait / 2)));
      expect(soon.nibbles).toEqual(cast.nibbles.map((n) => n / 2));
      expect(soon.what).toBe(cast.what);
    }
  });
});

describe("stardust bait (the owner: \"ปลาที่กินเหยื่อนี้เป็นปลาหายากขึ้นไปแน่นอน (ยังต้องสู้ให้ได้เอง) วันละ 3 ชิ้น\")", () => {
  const tier = (what: CatchId) => (what in FISH ? FISH[what as FishId].tier : null);
  it("is taken only by what is rare or better, and by nothing that is no fish", () => {
    for (const rain of [false, true]) for (const signs of [[], ["full"], [...ALL_SIGNS]] as Sign[][]) for (const top of [1, 2, 3]) {
      const odds = starOdds(rain, false, signs, top);
      expect(odds.length).toBeGreaterThan(3);
      expect(odds.every((o) => tier(o.what) === "rare" || tier(o.what) === "legend")).toBe(true);
      expect(odds.reduce((t, o) => t + o.p, 0)).toBeCloseTo(1, 9);
    }
  });
  it("minds neither the bait a fish likes nor the hour: the night's fish and the dawn's legend are both in it at once", () => {
    const whats = starOdds(false, false, [], 1).map((o) => o.what);
    expect(whats).toEqual(expect.arrayContaining(["featherback", "goby", "wels", "gar", "koi", "arapaima"]));
    // (no hour at which a bait brings all of those: a minnow by night, dough at dawn, a loach at dusk)
    for (let h = 0; h < 24; h++) for (const bait of BAITS) expect(["featherback", "koi", "gar"].every((w) => oddsOf(bait, h).some((o) => o.what === w))).toBe(false);
    // a legend is one bite in seven or so, not the next thing to every bite
    const legends = starOdds(false, false, [], 1).filter((o) => tier(o.what) === "legend").reduce((t, o) => t + o.p, 0);
    expect(legends).toBeGreaterThan(0.1);
    expect(legends).toBeLessThan(0.2);
  });
  it("still minds the water, the sky, the signs, and how far the uncle's shelf has come", () => {
    // nothing rare lives in the shallows
    expect(starOdds(false, true, [...ALL_SIGNS], 3)).toEqual([]);
    // the moon's fish only under a full moon
    expect(starOdds(false, false, [], 3).some((o) => o.what === "moonFish")).toBe(false);
    expect(starOdds(false, false, ["full"], 3).some((o) => o.what === "moonFish")).toBe(true);
    // rain brings the wels twice as readily
    const share = (rain: boolean) => { const odds = starOdds(rain, false, [], 1), wels = odds.find((o) => o.what === "wels")!.p, goby = odds.find((o) => o.what === "goby")!.p; return wels / goby; };
    expect(share(true)).toBeCloseTo(share(false) * 2, 9);
    // the later tiers' fish only once the shelf has reached them
    for (const id of FISH_IDS) for (const top of [1, 2, 3]) expect(starOdds(false, false, [...ALL_SIGNS], top).some((o) => o.what === id), `${id} at ${top}`).toBe((tier(id) === "rare" || tier(id) === "legend") && ITEMS[id].tier <= top && FISH[id].water !== "bank" && !FISH[id].habitat);
    expect(starOdds(false, false, [], 0)).toEqual([]);
  });
  it("needs a rod and no bait, three a day, by whoever has it", () => {
    const bag = put(newPurse().bag, "rod", 1), owner = gifted({ had: ["thingBait"], charms: [] }, { bag });
    let p = owner;
    for (const left of [2, 1, 0]) { const did = hookStar(p, NOON); if (!did.ok) throw new Error(did.why); expect(did.left).toBe(left); expect(did.purse.bag).toEqual(bag); p = did.purse; }
    expect(hookStar(p, NOON)).toEqual({ ok: false, why: "spent" });
    expect(hookStar(p, NOON + 24 * 3_600_000).ok).toBe(true);
    expect(hookStar(gifted({ had: ["thingBait"], charms: [] }), NOON)).toEqual({ ok: false, why: "tool" });
    expect(hookStar(gifted(undefined, { bag }), NOON)).toEqual({ ok: false, why: "none" });
  });
});

describe("wary fish: lines taken up again and again, and the rare fish are gone a while", () => {
  it("counts a line taken up, and at the fourth within five minutes the rare fish are gone for ten", () => {
    expect(WARY).toEqual({ ups: 3, within: 300, gone: 600, tiers: ["rare", "legend"] });
    let p = gifted();
    expect(isWary(p, NOON)).toBe(false);
    for (let i = 0; i < 3; i++) { p = tookUp(p, NOON + i * 60_000); expect(isWary(p, NOON + i * 60_000)).toBe(false); expect(p.wary!.ups.length).toBe(i + 1); }
    p = tookUp(p, NOON + 200_000);
    expect(isWary(p, NOON + 200_000)).toBe(true);
    expect(p.wary).toEqual({ ups: [], until: NOON + 200_000 + 600_000 });
    expect(isWary(p, NOON + 200_000 + 599_999)).toBe(true);
    expect(isWary(p, NOON + 200_000 + 600_000)).toBe(false);
  });
  it("forgets the lines taken up more than five minutes ago, and begins the count anew once the fish are gone", () => {
    let p = gifted();
    for (const at of [0, 100_000, 200_000]) p = tookUp(p, NOON + at);
    // (the first is five minutes old by now: three are counted still, and the water is as it was)
    p = tookUp(p, NOON + 300_000);
    expect(isWary(p, NOON + 300_000)).toBe(false);
    expect(p.wary!.ups).toEqual([NOON + 100_000, NOON + 200_000, NOON + 300_000]);
    p = tookUp(p, NOON + 310_000);
    expect(isWary(p, NOON + 310_000)).toBe(true);
    // gone already, three more are needed before they are gone for longer
    const until = p.wary!.until;
    for (const at of [320_000, 330_000, 340_000]) { p = tookUp(p, NOON + at); expect(p.wary!.until).toBe(until); }
    p = tookUp(p, NOON + 350_000);
    expect(p.wary!.until).toBe(NOON + 350_000 + 600_000);
  });
  it("leaves a purse kept wrongly sound, and what is sifted of the rare and better is what a wary water has", () => {
    for (const wary of [null, "x", [1, 2], { ups: "x" }, { ups: [NOON - 1, "2", null], until: "soon" }]) {
      const p = tookUp({ wary } as unknown as Purse, NOON);
      expect(p.wary!.ups.at(-1)).toBe(NOON);
      expect(p.wary!.ups.every((t) => typeof t === "number")).toBe(true);
      expect(isWary({ wary } as unknown as Purse, NOON)).toBe(false);
    }
    const left = sift(oddsOf("minnow", 23), WARY.tiers);
    expect(oddsOf("minnow", 23).some((o) => o.what === "featherback")).toBe(true);
    expect(left.every((o) => !(o.what in FISH) || !WARY.tiers.includes(FISH[o.what as FishId].tier))).toBe(true);
    expect(left.length).toBeGreaterThan(0);
    // (and a stardust bait finds nothing there at all)
    expect(sift(starOdds(false, false, [], 3), WARY.tiers)).toEqual([]);
  });
});

describe("a legend's second bout, and good fish harder for the skilled", () => {
  it("is two fights running for a legend, one for every other fish", () => {
    for (const id of FISH_IDS) expect(boutsOf(id), id).toBe(FISH[id].tier === "legend" ? 2 : 1);
  });
  it("begins the second with the fish away at once, and the whole of its line to win", () => {
    const first = startFight("koi", "good", {}, 9), second = startFight("koi", "good", { bout: 2 }, 9);
    expect(second.surge.from).toBe(0);
    expect(first.surge.from).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);
    // (a fish that carries the stretch has thrown it up the gauge already)
    expect(second.to).toBeGreaterThan(second.at);
    // a first bout is as it was
    expect(startFight("koi", "good", { bout: 1 }, 9)).toEqual(first);
  });
  it("makes a legend far harder to land: both bouts have to be won", () => {
    const both = (hand: [number, number], many = 60) => { let won = 0; for (let i = 0; i < many; i++) if (human(hand[0], hand[1], 77 + i)(startFight("koi", "good", {}, 1000 + i * 7919)) === "landed" && human(hand[0], hand[1], 177 + i)(startFight("koi", "good", { bout: 2 }, 5000 + i * 7919)) === "landed") won++; return won / many; };
    expect(both(MASTER)).toBeLessThan(lands("koi", MASTER) - 0.1);
    expect(both(MASTER)).toBeGreaterThan(0.35);
    expect(both(SKILLED)).toBeLessThan(0.25);
  });

  it("is harder for the skilled by what gifts says: nothing below the fourth rank, 8% a rank from it, for what is uncommon or better", () => {
    expect(harderOf("minnow", harderAt(6))).toBe(1);
    expect(harderOf("boot", harderAt(6))).toBe(1);
    expect(harderOf("snakehead", harderAt(3))).toBe(1);
    expect(harderOf("snakehead", harderAt(4))).toBeCloseTo(1.08, 9);
    expect(harderOf("koi", harderAt(10))).toBeCloseTo(1.56, 9);
    for (const id of FISH_IDS) expect(harderOf(id, 1.24), id).toBe(FISH[id].tier === "common" ? 1 : 1.24);
  });
  it("makes such a fish pull and surge so many times as hard, with so many times the line to win; a common fish is as it is", () => {
    const plain = startFight("snakehead", "good", {}, 4), hard = startFight("snakehead", "good", { harder: 1.24 }, 4);
    expect(hard.pull).toBeCloseTo(plain.pull * 1.24, 9);
    expect(hard.power).toBeCloseTo(plain.power * 1.24, 9);
    expect(hard.length).toBeCloseTo(plain.length * 1.24, 9);
    expect(hard.hi - hard.lo).toBe(plain.hi - plain.lo);
    expect(startFight("barb", "good", { harder: 1.24 }, 4)).toEqual(startFight("barb", "good", {}, 4));
    expect(startFight("snakehead", "good", { harder: 1 }, 4)).toEqual(plain);
    // it can still be won by a steady hand, and the made-up hands land fewer of it the higher the rank
    expect(playFight(startFight("snakehead", "good", { harder: harderAt(10) }, 4), steady).over).toBe("landed");
    expect(lands("snakehead", SKILLED, { harder: harderAt(6) })).toBeLessThan(lands("snakehead", SKILLED));
    expect(lands("snakehead", SKILLED, { harder: harderAt(10) })).toBeLessThan(lands("snakehead", SKILLED, { harder: harderAt(6) }) + 0.05);
    expect(lands("snakehead", MASTER, { harder: harderAt(10) })).toBeGreaterThan(0.5);
  });
  it("makes it longer with it, to the tenth; and holds a landing to the longer fight", () => {
    expect(biggerBy(50, 1.08)).toBe(54);
    expect(biggerBy(12.3, 1.24)).toBe(15.3);
    expect(biggerBy(12.3, 1)).toBe(12.3);
    const least = 0.5;
    expect(leastMs("snakehead", 1, 1, least)).toBe(Math.floor((FISH.snakehead.fight.line / FIGHT.reel) * least * 1000));
    expect(leastMs("snakehead", 1.08, 1, least)).toBeGreaterThan(leastMs("snakehead", 1, 1, least) * 1.07);
    expect(leastMs("barb", 1.56, 1, least)).toBe(leastMs("barb", 1, 1, least));
    expect(leastMs("koi", 1, 2, least)).toBeGreaterThanOrEqual(leastMs("koi", 1, 1, least) * 2 - 1);
  });
});
