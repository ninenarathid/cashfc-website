import { describe, expect, it } from "vitest";
import { BAITS, FISH, FISH_IDS, ITEMS, type CatchId, type FishId } from "./items";
import {
  FIGHT, STEPS, STRIKE, castLine, oddsOf, playFight, replayFight, seeded, seesOdds, startFight, stepFight, strikeOf, strikeWindow, surging, warning,
  type Fight, type FightMods,
} from "./fishing";
import { STAMINA } from "./stamina";

const share = (odds: Array<{ what: CatchId; p: number }>, what: CatchId) => odds.find((o) => o.what === what)?.p ?? 0;
/** The early game's twelve fish (the later tiers' are tried in tiers.test.ts). */
const EARLY = FISH_IDS.filter((id) => ITEMS[id].tier === 1);
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
      expect(share(oddsOf(bait, hour), id) > 0).toBe(feeds && takes);
    }
    // the two baits the uncle sells bring a fish at any hour of the day or night
    for (const bait of ["worm", "dough"] as const) for (let hour = 0; hour < 24; hour++)
      expect(oddsOf(bait, hour).some((o) => o.what in FISH)).toBe(true);
    // every fish can be caught at some hour on some bait
    for (const id of FISH_IDS) expect(BAITS.some((b) => Array.from({ length: 24 }, (_, h) => h).some((h) => share(oddsOf(b, h), id) > 0))).toBe(true);
    // and every fish is a thing in the catalog, with a picture of that name
    for (const id of FISH_IDS) expect(ITEMS[id].kind).toBe("fish");
  });

  it("brings the night's fish out in the rain, and the rare ones to the lucky", () => {
    expect(share(oddsOf("worm", 21, true), "eel")).toBeGreaterThan(share(oddsOf("worm", 21, false), "eel") * 1.5);
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
    // the common ones are there in the shallows as often beside each other as in deep water, and oftener in all
    const deep = oddsOf("worm", 21), shallow = oddsOf("worm", 21, false, false, true);
    expect(share(deep, "eel")).toBeGreaterThan(0);
    expect(share(shallow, "eel")).toBe(0);
    expect(share(shallow, "catfish")).toBeGreaterThan(share(deep, "catfish"));
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
      // (the owner: a short wait, then half of that again: seconds to a minute or two, the rare ones longer)
      expect(c.wait).toBeGreaterThanOrEqual(5);
      expect(c.wait).toBeLessThanOrEqual(240);
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
    // and nobody waits long for a common fish: none of them more than a little over a minute
    for (const id of FISH_IDS) if (FISH[id].tier === "common") expect(FISH[id].wait[1]).toBeLessThanOrEqual(70);
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
  });

  it("is much harder to time with no stamina left", () => {
    // (2026-10-04) half a second, where a fed hand has a second and a half
    expect(strikeWindow({ spent: true })).toBeLessThan(STRIKE.window * 0.35);
    expect(strikeOf(0.6)).toBe("good");
    expect(strikeOf(0.6, { spent: true })).toBeNull();
    expect(strikeOf(0.4, { spent: true })).toBe("late");
    expect(strikeOf(0.25, { spent: true })).toBe("good");
    // still to be had, by somebody watching the float: never less than a quick hand and a phone need between them
    expect(strikeWindow({ spent: true })).toBeGreaterThanOrEqual(0.45);
    // and a meal that sharpens the eye helps then too
    expect(strikeWindow({ spent: true, keen: true })).toBeGreaterThan(0.7);
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
  });

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
    // of the steady ones, the harder is also the faster
    const steadies = EARLY.filter((id) => FISH[id].fight.style === "steady");
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
    // (2026-10-04) a good third of the stretch is left: with a fifth of it nobody lands anything
    expect(spent.hi - spent.lo).toBeLessThan((fresh.hi - fresh.lo) * 0.4);
    expect(spent.hi - spent.lo).toBeGreaterThan((fresh.hi - fresh.lo) * 0.3);
    expect(spent.power).toBeGreaterThan(fresh.power * 1.2);
    expect(spent.sway).toBeGreaterThan(fresh.sway * 1.1);
    expect(spent.pace).toBeGreaterThan(fresh.pace * 1.2);
    expect(calm.hi - calm.lo).toBeGreaterThan((fresh.hi - fresh.lo) * 1.15);
    // every number of it makes things harder, none easier
    expect(STAMINA.spent.strike).toBeLessThan(1);
    expect(STAMINA.spent.band).toBeLessThan(1);
    for (const k of ["surge", "sway", "pace"] as const) expect(STAMINA.spent[k]).toBeGreaterThan(1);
    // still to be won, by a hand steady enough
    expect(playFight(spent, steady).over).toBe("landed");
  });

  it("is about three times as hard as it first was, and still to be won by a very good hand (the owner, 2026-10-04: \"ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก\")", () => {
    const SMALL = ["minnow", "barb", "tilapia", "catfish"] as const;
    const four = (hand: [number, number]) => SMALL.reduce((t, id) => t + lands(id, hand, { spent: true }), 0) / SMALL.length;
    // everybody lands far fewer than they do fed, and the average hand next to nothing: it has to eat
    for (const id of SMALL) {
      expect(lands(id, SKILLED, { spent: true })).toBeLessThan(lands(id, SKILLED) - 0.15);
      expect(lands(id, AVERAGE, { spent: true })).toBeLessThan(0.15);
    }
    // a practised hand, which landed nearly every small fish with the first numbers: a good third of them
    expect(four(SKILLED)).toBeGreaterThan(0.25);
    expect(four(SKILLED)).toBeLessThan(0.6);
    // a very good hand lands most of the small ones
    expect(lands("minnow", MASTER, { spent: true })).toBeGreaterThan(0.85);
    expect(lands("barb", MASTER, { spent: true })).toBeGreaterThan(0.75);
    expect(lands("tilapia", MASTER, { spent: true })).toBeGreaterThan(0.7);
    expect(lands("catfish", MASTER, { spent: true })).toBeGreaterThan(0.5);
    expect(four(MASTER)).toBeGreaterThan(0.75);
    // the bigger fish are for somebody who has eaten, however good
    for (const id of ["perch", "pangasius", "snakehead"] as const) {
      expect(lands(id, MASTER)).toBeGreaterThan(0.8);
      expect(lands(id, MASTER, { spent: true })).toBeLessThan(0.15);
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
