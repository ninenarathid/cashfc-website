import { describe, expect, it } from "vitest";
import { FAMILIARS, GIFTS, USES, harderAt, harderFor, numberOf, useGift, usesLeft } from "./gifts";
import { isDayOf } from "./forest";
import {
  BUGS, BUG_IDS, FLUTE, HABITS, HAUNTS, HAUNT_KINDS, LURED, NECTAR, NECTAR_MAPS, NET, PAIR, ROAM, TIERS, UNHUNTED, WIND, againMs, aimAt, aimOf, asleep, bugTurn, bugTurnStart, cloakAt, followed, followerNow, followerPose,
  harderOn, hereAt, hereFor, knows, lulled, luredHaunt, luredNow, nectar, nectarHaunt, nectarMay, net, netMine, newMind,
  perchAt, plentyOf, poseOf, ringOf, roams, stealthOf, swarmAt, swarms, swingMs, taken, think, tierOf, windy,
  type BugId, type Haunt, type Hunt, type Lured, type Mind, type Person,
} from "./insects";
import { ITEMS } from "./items";
import { POINTS } from "./line-points";
import { LINES } from "./lines";
import { dayOf, staminaOf } from "./stamina";
import { DAY, HOUR, held, newPurse, put, type Purse } from "./trade";
import { ALWAYS_RAIN, DRY } from "./weather";
import { placeOf } from "./world";

/** 2026-10-05 12:00 in Bangkok, and the same day's midnight. */
const NOON = Date.UTC(2026, 9, 5, 5), NIGHT = Date.UTC(2026, 9, 5, 17);
const hauntOf = (kind: Haunt["kind"], place?: Haunt["place"], zone?: Haunt["zone"]) => HAUNTS.find((h) => h.kind === kind && (!place || h.place === place) && (zone === undefined || h.zone === zone))!;
const still = (x: number, y: number, more: Partial<Person> = {}): Person => ({ x, y, moving: false, hold: null, ...more });
const walking = (x: number, y: number, more: Partial<Person> = {}): Person => ({ x, y, moving: true, hold: null, ...more });
const withGifts = (had: string[], more: Partial<NonNullable<Purse["gifts"]>> = {}, purse: Partial<Purse> = {}): Purse => ({ ...newPurse(), ...purse, gifts: { had, charms: [], ...more } });
/** Somebody so far before a grasshopper's face, or behind it. */
const before = (h: Haunt, m: Mind, d: number, more: Partial<Person> = {}): Person => { const here = h.perches[m.at]; return still(here.x + (m.face * d) / Math.SQRT2, here.y - (m.face * d) / Math.SQRT2, more); };

describe("what an insect is among the others", () => {
  it("is common, uncommon or rare by what the relatives pay: nine, seven and eight of the twenty-four", () => {
    const of = (t: string) => BUG_IDS.filter((id) => tierOf(id) === t).sort();
    expect(of("common")).toEqual(["butterflyWhite", "caterpillar", "cricket", "dragonfly", "grasshopper", "ladybird", "monarch", "moth", "scarab"]);
    expect(of("uncommon")).toEqual(["carpenterBee", "cicada", "damselfly", "firefly", "goldenAnt", "honeyBee", "hoverfly", "lacewing", "leafInsect", "mantis", "orchardBeetle", "pollenMidge", "rhinoBeetle", "silkMoth", "stickInsect"]);
    expect(of("rare")).toEqual(["glassDragonfly", "hawkMoth", "herculesBeetle", "jewelBeetle", "lunaMoth", "morpho", "orchidMantis", "stagBeetle"]);
    // (the rare ones' mark is the one the line counts a rare catch from)
    expect(TIERS.rare).toBe(POINTS.insects.pays);
    for (const id of BUG_IDS) expect(ITEMS[id].pays >= TIERS.rare, id).toBe(tierOf(id) === "rare");
  });
});

describe("good insects are harder for whoever is good at the line (the owner's ladder, 2026-10-07)", () => {
  it("from the line's fourth rank, 8% a rank; nothing below it, and never for a common insect", () => {
    const marks = LINES.insects.marks;
    expect(harderFor("insects", marks[2])).toBe(1);
    expect(harderFor("insects", marks[3])).toBeCloseTo(1.08);
    expect(harderFor("insects", marks[5])).toBeCloseTo(1.24);
    expect(harderFor("insects", marks[9])).toBeCloseTo(1.56);
    for (const id of BUG_IDS) {
      expect(harderOn(id), id).toBe(1);
      expect(harderOn(id, 1.24), id).toBe(tierOf(id) === "common" ? 1 : 1.24);
      // (a number that is none, or under one, makes nothing easier)
      expect(harderOn(id, 0.5), id).toBe(1);
      expect(harderOn(id, NaN), id).toBe(1);
    }
  });

  it("the net's ring on one is that much narrower: a swing that took it takes it no more", () => {
    const hard = harderAt(6);
    for (const id of BUG_IDS) {
      const plain = ringOf(id, false), tired = ringOf(id, true);
      expect(ringOf(id, false, 1, 1)).toBe(plain);
      if (tierOf(id) === "common") { expect(ringOf(id, false, 1, hard)).toBe(plain); expect(ringOf(id, true, 1, hard)).toBe(tired); continue; }
      expect(ringOf(id, false, 1, hard)).toBeCloseTo(plain / hard);
      expect(ringOf(id, true, 1, hard)).toBeCloseTo(tired / hard);
    }
    // a stick insect lying still: a net landing just inside its ring has it, and for a good hunter does not
    const h = hauntOf("litter", "forest", "woods"), m = newMind("stickInsect", h, 7, NOON), p = poseOf("stickInsect", h, 7, m, NOON + 500);
    const at = { x: aimOf(p).x + ringOf("stickInsect", false) * 0.95, y: aimOf(p).y };
    expect(taken("stickInsect", p, at, false)).toBe(true);
    expect(taken("stickInsect", p, at, false, 1, hard)).toBe(false);
    expect(taken("stickInsect", p, aimOf(p), false, 1, hard)).toBe(true);
  });

  it("it knows of them from that much further off: where it let anybody stand, it is off from them", () => {
    const hard = harderAt(10);
    // a mantis (uncommon): somebody a little further before it than it sees
    const f = hauntOf("field", "farm"), m = newMind("mantis", f, f.id, NOON), d = HABITS.behind.back * 1.2;
    const behind = (more: Partial<Person> = {}): Person => { const here = f.perches[m.at]; return still(here.x - (m.face * d) / Math.SQRT2, here.y + (m.face * d) / Math.SQRT2, more); };
    expect(knows("mantis", f, m, behind())).toBe(false);
    expect(knows("mantis", f, m, behind({ wary: hard }))).toBe(true);
    // a grasshopper (common) minds a good hunter no more than anybody
    const g = newMind("grasshopper", f, f.id, NOON), far = HABITS.behind.ahead * 1.2;
    expect(knows("grasshopper", f, g, before(f, g, far))).toBe(false);
    expect(knows("grasshopper", f, g, before(f, g, far, { wary: hard }))).toBe(false);
    // a damselfly darts from a good hunter who walks where it lets anybody else walk
    const w = hauntOf("water", "forest"), dm = newMind("damselfly", w, w.id, NOON), perch = w.perches[dm.at], off = HABITS.spot.notice * 1.3;
    expect(think("damselfly", w, w.id, dm, NOON + 100, [walking(perch.x + off, perch.y)])).toBe(dm);
    expect(think("damselfly", w, w.id, dm, NOON + 100, [walking(perch.x + off, perch.y, { wary: hard })]).at).not.toBe(dm.at);
  });
});

describe("the lucky butterfly (insects, the second rank)", () => {
  it("halves the distance at which an insect startles, only while it follows", () => {
    expect(FAMILIARS.famButterfly).toBe(0.5);
    expect(numberOf("famButterfly")).toBe(0.5);
    expect(GIFTS.find((g) => g.id === "famButterfly")).toMatchObject({ kind: "familiar", line: "insects", rank: 2 });
    expect(stealthOf(newPurse(), NOON)).toBe(1);
    expect(stealthOf(withGifts(["famButterfly"]), NOON)).toBe(1);
    expect(stealthOf(withGifts(["famButterfly", "famSquirrel"], { familiar: "famSquirrel" }), NOON)).toBe(1);
    expect(stealthOf(withGifts(["famButterfly"], { familiar: "famButterfly" }), NOON)).toBe(0.5);
  });

  it("halves what a soft step leaves, too: a third with a meal's first level, where the old step left two fifths", () => {
    const meal = (level: number): Partial<Purse> => ({ buffs: [{ id: "net", level, until: NOON + HOUR }] });
    expect(stealthOf({ ...newPurse(), ...meal(1) }, NOON)).toBeCloseTo(2 / 3);
    expect(stealthOf(withGifts(["famButterfly"], { familiar: "famButterfly" }, meal(1)), NOON)).toBeCloseTo(1 / 3);
    expect(stealthOf(withGifts(["famButterfly"], { familiar: "famButterfly" }, meal(4)), NOON)).toBeCloseTo(1 / 6);
    // (a meal that is over leaves nothing)
    expect(stealthOf(withGifts(["famButterfly"], { familiar: "famButterfly" }, meal(1)), NOON + 2 * HOUR)).toBe(0.5);
  });

  it("lets its member stand where an insect sees anybody else; nearer, or the wrong way for its kind, it flees all the same", () => {
    const soft = 0.5;
    // a grasshopper: somebody before its face at four fifths of what it sees
    const f = hauntOf("field", "farm"), m = newMind("grasshopper", f, f.id, NOON), d = HABITS.behind.ahead * 0.8;
    expect(think("grasshopper", f, f.id, m, NOON + 100, [before(f, m, d)]).at).not.toBe(m.at);
    expect(think("grasshopper", f, f.id, m, NOON + 100, [before(f, m, d, { soft })]).at).toBe(m.at);
    expect(lulled("grasshopper", f, m, before(f, m, d, { soft }))).toBe(true);
    expect(lulled("grasshopper", f, m, before(f, m, d))).toBe(false);
    // …and nearer than half of it, before its face still: it is off
    const near = HABITS.behind.ahead * soft * 0.9;
    expect(think("grasshopper", f, f.id, m, NOON + 100, [before(f, m, near, { soft })]).at).not.toBe(m.at);
    expect(lulled("grasshopper", f, m, before(f, m, near, { soft }))).toBe(false);
    // a dragonfly, walked up to: at four fifths of its hearing it stays for the butterfly's member, at two fifths it darts
    const w = hauntOf("water", "town"), dm = newMind("dragonfly", w, w.id, NOON), perch = w.perches[dm.at], N = HABITS.spot.notice;
    expect(think("dragonfly", w, w.id, dm, NOON + 100, [walking(perch.x + N * 0.8, perch.y)]).at).not.toBe(dm.at);
    expect(think("dragonfly", w, w.id, dm, NOON + 100, [walking(perch.x + N * 0.8, perch.y, { soft })])).toBe(dm);
    expect(think("dragonfly", w, w.id, dm, NOON + 100, [walking(perch.x + N * 0.4, perch.y, { soft })]).at).not.toBe(dm.at);
    // a cicada that is quiet is off from whoever walks up within half its hearing; a cricket falls quiet
    const t = hauntOf("tree"), cm = newMind("cicada", t, t.id, NOON), trunk = t.perches[cm.at], S = HABITS.sound.notice;
    let quiet = NOON;
    for (let ms = 0; ms < 20_000; ms += 100) if (!poseOf("cicada", t, t.id, cm, NOON + ms).sings) { quiet = NOON + ms + HABITS.sound.grace + 50; break; }
    if (!poseOf("cicada", t, t.id, cm, quiet).sings) {
      expect(think("cicada", t, t.id, cm, quiet, [walking(trunk.x + S * 0.8, trunk.y, { soft })])).toBe(cm);
      expect(think("cicada", t, t.id, cm, quiet, [walking(trunk.x + S * 0.4, trunk.y, { soft })]).at).not.toBe(cm.at);
    }
    // somebody else beside the butterfly's member is seen as far as ever
    expect(think("grasshopper", f, f.id, m, NOON + 100, [before(f, m, d, { soft }), before(f, m, d)]).at).not.toBe(m.at);
    // and what is left of a grasshopper's sight is within a net's reach: the member may swing from before it
    expect(HABITS.behind.ahead * soft).toBeLessThan(NET.reach);
  });

  it("is no use against the good insects' wariness of a good hunter beyond its half: the two multiply", () => {
    const f = hauntOf("field", "farm"), m = newMind("mantis", f, f.id, NOON), hard = harderAt(10), d = HABITS.behind.ahead * 0.5 * 1.2;
    expect(knows("mantis", f, m, before(f, m, d, { soft: 0.5 }))).toBe(false);
    expect(knows("mantis", f, m, before(f, m, d, { soft: 0.5, wary: hard }))).toBe(true);
  });
});

describe("a rare insect does not stay (the owner's ladder: \"a rare insect moves perch every 20 s\")", () => {
  /** Of the insects that keep to a haunt of that kind, the ones that do not stay at a perch of it. */
  const roamers = (h: Haunt) => BUG_IDS.filter((id) => BUGS[id].at.includes(h.kind) && roams(id, h));

  it("the ones that would sit for good: the orchid mantis among its flowers, the three rare beetles up their trees", () => {
    const blooms = hauntOf("blooms", "forest"), tree = HAUNTS.find((h) => h.kind === "tree" && h.zone === "deep")!;
    expect(ROAM.every).toBe(20_000);
    expect(roamers(blooms)).toEqual(["orchidMantis"]);
    expect(roamers(tree).sort()).toEqual(["herculesBeetle", "jewelBeetle", "stagBeetle"]);
    // what is not rare stays, and so does a rare one that never stops by itself, or that has one perch only
    for (const id of BUG_IDS) for (const h of HAUNTS) {
      if (tierOf(id) !== "rare" || h.perches.length < 2) expect(roams(id, h), `${id} at ${h.id}`).toBe(false);
      if (["path", "lamp", "spot", "crawl"].includes(BUGS[id].habit)) expect(roams(id, h), id).toBe(false);
    }
  });

  it("is at another perch every twenty seconds, never the one before, the same for everybody by the clock", () => {
    for (const n of [2, 3, 4, 5, 6]) for (const seed of [1, 77, 912345]) {
      const seen = new Set<number>();
      let last = -1;
      for (let e = 88_000_000; e < 88_000_200; e++) {
        const at = perchAt(seed, n, e);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThan(n);
        expect(at, `${n}/${seed}/${e}`).not.toBe(last);
        expect(perchAt(seed, n, e)).toBe(at);
        seen.add(at);
        last = at;
      }
      // (in the long run it has been everywhere)
      expect(seen.size).toBe(n);
    }
    expect(perchAt(5, 1, 3)).toBe(0);
    expect(perchAt(5, 0, 3)).toBe(0);
  });

  it("an orchid mantis is somewhere else among its flowers in each stretch, whenever its mind began", () => {
    const h = hauntOf("blooms", "forest"), seed = h.id * 100003 + 5;
    const stretch = Math.floor(NOON / ROAM.every), t0 = stretch * ROAM.every + 1000;
    // two screens: one that has watched it since its turn began, one that opened a minute later
    let a = newMind("orchidMantis", h, seed, t0 - 5 * 60_000), b = newMind("orchidMantis", h, seed, t0 - 5 * 60_000);
    for (let t = t0 - 60_000; t <= t0; t += 500) a = think("orchidMantis", h, seed, a, t, []);
    b = think("orchidMantis", h, seed, b, t0, []);
    expect(a.at).toBe(perchAt(seed, h.perches.length, stretch));
    expect(b.at).toBe(a.at);
    // it stays the stretch out, and is elsewhere in the next
    const same = think("orchidMantis", h, seed, a, t0 + 5000, []);
    expect(same).toBe(a);
    const next = think("orchidMantis", h, seed, a, t0 + ROAM.every, []);
    expect(next.at).not.toBe(a.at);
    expect(next.at).toBe(perchAt(seed, h.perches.length, stretch + 1));
    expect(poseOf("orchidMantis", h, seed, next, t0 + ROAM.every)).toMatchObject({ x: h.perches[next.at].x, y: h.perches[next.at].y, seen: true, open: true });
    // a white butterfly's or a ladybird's mind is as it ever was
    const m = newMind("ladybird", h, seed, NOON);
    expect(think("ladybird", h, seed, m, NOON + 60_000, [])).toBe(m);
  });

  it("a rare beetle is up another trunk in each stretch: whoever had brought it down begins again under the new one", () => {
    const h = HAUNTS.find((x) => x.kind === "tree" && x.zone === "deep" && x.perches.length >= 3)!, seed = h.id * 100003 + 9;
    const stretch = Math.floor(NIGHT / ROAM.every), t0 = stretch * ROAM.every + 200;
    let m = think("stagBeetle", h, seed, newMind("stagBeetle", h, seed, NIGHT - 60_000), t0, []);
    const trunk = h.perches[m.at], under = still(trunk.x + 0.5, trunk.y + 0.6, { hold: "resin" });
    expect(m.at).toBe(perchAt(seed, h.perches.length, stretch));
    // something sweet held still under its trunk brings it down, within the stretch
    for (let t = t0; t <= t0 + HABITS.lure.patience + HABITS.lure.down + 300; t += 100) m = think("stagBeetle", h, seed, m, t, [under]);
    expect(poseOf("stagBeetle", h, seed, m, t0 + HABITS.lure.patience + HABITS.lure.down + 300).open).toBe(true);
    expect(HABITS.lure.patience + HABITS.lure.down).toBeLessThan(ROAM.every / 2);
    // the stretch turns: it is up another trunk, and what was held under the old one is nothing to it
    const t1 = (stretch + 1) * ROAM.every + 50, moved = think("stagBeetle", h, seed, m, t1, [under]);
    expect(moved.at).not.toBe(m.at);
    expect(moved.lured).toBe(0);
    expect(poseOf("stagBeetle", h, seed, moved, t1 + 100)).toMatchObject({ open: false, seen: false, x: h.perches[moved.at].x });
    // a rhinoceros beetle (not rare) keeps to the trunk it is in
    const r = newMind("rhinoBeetle", h, seed, NIGHT);
    expect(think("rhinoBeetle", h, seed, r, NIGHT + 3 * ROAM.every, [])).toBe(r);
  });
});

describe("the wind net (insects, the fourth rank: the net falls at once, where it is aimed; aimed badly it still misses)", () => {
  const worn = (left = 100): Purse => ({ ...withGifts(["charmWind"], { charms: ["charmWind"] }), stamina: { day: dayOf(NOON), left } });

  it("comes down in no time for whoever wears it and has stamina; not worn, or with none, the net is the plain one", () => {
    expect(GIFTS.find((g) => g.id === "charmWind")).toMatchObject({ kind: "charm", line: "insects", rank: 4 });
    expect(windy(worn(), NOON)).toBe(true);
    expect(windy(withGifts(["charmWind"]), NOON)).toBe(false);
    expect(windy(newPurse(), NOON)).toBe(false);
    // tired hands have no gust: the plain net as tired hands have it
    expect(windy(worn(0), NOON)).toBe(false);
    expect(swingMs(false)).toBe(NET.lands);
    expect(swingMs(false, true)).toBe(0);
    expect(swingMs(true, true)).toBe(NET.tired.lands);
    expect(swingMs(true)).toBe(NET.tired.lands);
  });

  it("is no quicker to swing over and over than the plain net: a gust every so long as a swing and its rest take", () => {
    expect(WIND.again).toBe(NET.lands + NET.again);
    expect(againMs(false, true)).toBe(againMs(false));
    expect(againMs(false)).toBe(NET.lands + NET.again);
    expect(againMs(true, true)).toBe(NET.tired.lands + NET.again);
  });

  it("lands where it is aimed, or as near that as its wearer reaches", () => {
    const me = { x: 10, y: 10 };
    expect(aimAt(me, { x: 11, y: 11.5 })).toEqual({ x: 11, y: 11.5 });
    expect(aimAt(me, me)).toEqual(me);
    const far_ = aimAt(me, { x: 20, y: 10 });
    expect(far_.x).toBeCloseTo(10 + NET.reach);
    expect(far_.y).toBeCloseTo(10);
    const slant = aimAt(me, { x: 13, y: 14 });
    expect(Math.hypot(slant.x - me.x, slant.y - me.y)).toBeCloseTo(NET.reach);
    expect((slant.y - me.y) / (slant.x - me.x)).toBeCloseTo(4 / 3);
  });

  it("takes a butterfly where it is, which the plain net misses; and misses one it is aimed beside, as any net does", () => {
    const h = hauntOf("blooms", "town"), m = newMind("butterflyWhite", h, 5, NOON);
    let met = 0, missed_ = 0;
    for (let t = NOON; t < NOON + 20_000; t += 700) {
      const now = poseOf("butterflyWhite", h, 5, m, t), then = poseOf("butterflyWhite", h, 5, m, t + NET.lands);
      // the wind's: down the moment it is aimed, on where the butterfly is
      expect(taken("butterflyWhite", poseOf("butterflyWhite", h, 5, m, t + swingMs(false, true)), aimOf(now), false)).toBe(true);
      // the plain net aimed at where it is: the butterfly has flown on by the time it lands
      if (taken("butterflyWhite", then, aimOf(now), false)) met++; else missed_++;
      // aimed a tile to the side, the wind's has nothing
      expect(taken("butterflyWhite", now, { x: aimOf(now).x + 1, y: aimOf(now).y }, false)).toBe(false);
    }
    expect(missed_).toBeGreaterThan(met);
  });

  it("is as narrow on a good insect for a good hunter as any net", () => {
    expect(ringOf("morpho", false, 1, harderAt(4))).toBeCloseTo(ringOf("morpho", false) / 1.08);
  });
});

describe("the lulling flute (insects, the fifth rank: every insect on the screen sleeps fifteen seconds; once in five minutes)", () => {
  it("is a thing of the fifth rank: fifteen seconds of sleep, once to a span of five minutes", () => {
    expect(GIFTS.find((g) => g.id === "thingFlute")).toMatchObject({ kind: "thing", line: "insects", rank: 5, by: 15 });
    expect(FLUTE.secs).toBe(15);
    expect(USES.thingFlute).toEqual({ n: 1, per: "span", ms: 300_000 });
    // played once, it rests until the span turns; then once more
    const had = withGifts(["thingFlute"]), t0 = Math.floor(NOON / 300_000) * 300_000 + 1000;
    const first = useGift(had, "thingFlute", t0);
    if (!first.ok) throw new Error(first.why);
    expect(first.left).toBe(0);
    expect(useGift(first.purse, "thingFlute", t0 + 60_000)).toEqual({ ok: false, why: "spent" });
    expect(useGift(first.purse, "thingFlute", t0 + 299_500).ok).toBe(true);
    expect(useGift(newPurse(), "thingFlute", t0)).toEqual({ ok: false, why: "none" });
  });

  it("an insect asleep is where it was, on the ground under its picture, still and in plain sight; a net takes it there, or misses beside it", () => {
    // a butterfly on the wing
    const b = hauntOf("blooms", "town"), bm = newMind("butterflyWhite", b, 5, NOON), flying = poseOf("butterflyWhite", b, 5, bm, NOON + 4000), sleeps = asleep("butterflyWhite", b, 5, bm, NOON + 4000)!;
    expect(flying.flying && flying.lift > 0.2).toBe(true);
    expect(sleeps).toMatchObject({ lift: 0, flying: false, seen: true, open: true, sings: false, twitch: false });
    // (its picture has not moved on the screen: the ground point under it is the same)
    expect(aimOf(sleeps).x).toBeCloseTo(aimOf(flying).x, 9);
    expect(aimOf(sleeps).y).toBeCloseTo(aimOf(flying).y, 9);
    expect(taken("butterflyWhite", sleeps, aimOf(sleeps), false)).toBe(true);
    expect(taken("butterflyWhite", sleeps, { x: aimOf(sleeps).x + 1, y: aimOf(sleeps).y }, false)).toBe(false);
    // and it is there still, seconds on, where the waking one has flown round
    const later = poseOf("butterflyWhite", b, 5, bm, NOON + 4000 + 6000);
    expect(Math.hypot(aimOf(later).x - aimOf(sleeps).x, aimOf(later).y - aimOf(sleeps).y)).toBeGreaterThan(0.5);
  });

  it("what hides shows itself asleep: a cricket is seen and sings no more, a firefly glows on, a stick insect twitches no more", () => {
    const f = hauntOf("field", "farm"), cm = newMind("cricket", f, f.id, NIGHT), awake = poseOf("cricket", f, f.id, cm, NIGHT + 5000), zc = asleep("cricket", f, f.id, cm, NIGHT + 5000)!;
    expect(awake.seen).toBe(false);
    expect(awake.sings).toBe(true);
    expect(zc).toMatchObject({ seen: true, sings: false, open: true, x: f.perches[cm.at].x, y: f.perches[cm.at].y });
    const w = hauntOf("water", "town"), fm = newMind("firefly", w, 9, NIGHT);
    let dark = NIGHT;
    for (let t = NIGHT; t < NIGHT + 10_000; t += 50) if (!poseOf("firefly", w, 9, fm, t).seen) { dark = t; break; }
    expect(poseOf("firefly", w, 9, fm, dark).seen).toBe(false);
    expect(asleep("firefly", w, 9, fm, dark)).toMatchObject({ seen: true, glow: 1, open: true, flying: false });
    const l = hauntOf("litter", "forest", "woods"), sm = newMind("stickInsect", l, 3, NOON);
    expect(asleep("stickInsect", l, 3, sm, NOON + 1000)).toMatchObject({ seen: true, twitch: false, glow: 0, x: l.perches[sm.at].x });
  });

  it("one in a hop sleeps where it lands; a beetle up its tree is out of hearing, one that has come down sleeps on its trunk", () => {
    const f = hauntOf("field", "farm"), m = newMind("grasshopper", f, f.id, NOON);
    const hop = think("grasshopper", f, f.id, m, NOON + 100, [before(f, m, 1)]);
    expect(hop.at).not.toBe(m.at);
    expect(poseOf("grasshopper", f, f.id, hop, NOON + 150).open).toBe(false);
    const z = asleep("grasshopper", f, f.id, hop, NOON + 150)!;
    expect(z).toMatchObject({ open: true, flying: false, lift: 0, x: f.perches[hop.at].x, y: f.perches[hop.at].y });
    const t = hauntOf("tree"), bm = newMind("rhinoBeetle", t, 4, NIGHT);
    expect(asleep("rhinoBeetle", t, 4, bm, NIGHT + 1000)).toBeNull();
    let down = bm;
    const under = still(t.perches[0].x + 0.4, t.perches[0].y + 0.6, { hold: "resin" });
    for (let ms = 0; ms <= HABITS.lure.patience + HABITS.lure.down + 200; ms += 100) down = think("rhinoBeetle", t, 4, down, NIGHT + ms, [under]);
    const when = NIGHT + HABITS.lure.patience + HABITS.lure.down + 200, awake = poseOf("rhinoBeetle", t, 4, down, when), zb = asleep("rhinoBeetle", t, 4, down, when)!;
    expect(awake.open).toBe(true);
    expect(aimOf(zb).x).toBeCloseTo(aimOf(awake).x, 9);
    expect(zb.open).toBe(true);
  });
});

describe("the butterfly-wing cloak (insects, the sixth rank): the rare insects of a day, every day", () => {
  const WORD = "cloak-test", MINUTE = 60_000;
  const dayKinds = BUG_IDS.filter((id) => BUGS[id].day);
  /** Every turn of every haunt over so many days: what everybody has, and what the cloak's wearer alone has. */
  const over = (days: number) => {
    const out: Array<{ h: Haunt; at: number; all: BugId | null; worn: BugId | null }> = [];
    for (const h of HAUNTS) {
      const every = HAUNT_KINDS[h.kind].every * MINUTE;
      for (let t = bugTurnStart(h, bugTurn(h, NOON)); t < NOON + days * DAY; t += every) out.push({ h, at: t + 1000, all: swarmAt(WORD, h, t + 1000)?.bug ?? null, worn: cloakAt(WORD, h, t + 1000)?.bug ?? null });
    }
    return out;
  };

  it("is a charm of the sixth rank, three seconds for the second of a pair", () => {
    expect(GIFTS.find((g) => g.id === "charmCloak")).toMatchObject({ kind: "charm", line: "insects", rank: 6, by: 3 });
    expect(dayKinds.sort()).toEqual(["glassDragonfly", "hawkMoth", "herculesBeetle", "jewelBeetle", "monarch", "morpho", "silkMoth"]);
  });

  it("has for its wearer, at a haunt, only an insect with days of its own on a day that is not one; everywhere else nothing of its own", () => {
    const turns = over(12), seen = new Set<BugId>();
    for (const x of turns) {
      if (!x.worn) continue;
      seen.add(x.worn);
      const day = BUGS[x.worn].day!;
      expect(day).toBeGreaterThan(0);
      // (never on a day of its own: then everybody has it by everybody's roll, and the cloak adds nothing)
      expect(isDayOf(WORD, x.worn, day, bugTurnStart(x.h, bugTurn(x.h, x.at)))).toBe(false);
      expect(BUGS[x.worn].at).toContain(x.h.kind);
      expect(x.all).not.toBe(x.worn);
    }
    expect([...seen].sort()).toEqual(["glassDragonfly", "hawkMoth", "herculesBeetle", "jewelBeetle", "monarch", "morpho", "silkMoth"]);
    // a luna moth waits for the full moon, cloak or no cloak
    expect(seen.has("lunaMoth")).toBe(false);
    // and a haunt none of whose insects has a day has nothing for the cloak, ever
    for (const x of turns) if (!dayKinds.some((id) => BUGS[id].at.includes(x.h.kind))) expect(x.worn).toBeNull();
  });

  it("shows each of them about as often on any day as everybody has it on a day of its own", () => {
    const turns = over(40);
    for (const id of ["monarch", "morpho", "hawkMoth"] as BugId[]) {
      const day = BUGS[id].day!, own = turns.filter((x) => x.all === id).length, cloak = turns.filter((x) => x.worn === id).length;
      // (everybody: on the days that are its own; the wearer: on all the others besides. The days are counted, not reckoned)
      const ownDays = Array.from({ length: 40 }, (_, d) => isDayOf(WORD, id, day, NOON + d * DAY)).filter(Boolean).length;
      const perOwnDay = own / ownDays, perOtherDay = cloak / (40 - ownDays);
      expect(ownDays).toBeGreaterThan(2);
      expect(perOwnDay).toBeGreaterThan(0);
      expect(perOtherDay / perOwnDay, id).toBeGreaterThan(0.7);
      expect(perOtherDay / perOwnDay, id).toBeLessThan(1.4);
    }
  }, 30_000); // Forty days of haunts are sampled even when CI is running other simulations.

  it("is seen in the place of what everybody has there, by its wearer alone; and whoever nets that haunt's insect first has had its turn's", () => {
    const x = over(12).find((y) => y.worn === "monarch" && y.all !== null)!, none = () => ({ n: 0, mine: false });
    expect(x).toBeDefined();
    expect(hereFor(WORD, x.h, x.at, DRY, [], UNHUNTED, false)?.bug).toBe(x.all);
    expect(hereFor(WORD, x.h, x.at, DRY, [], UNHUNTED, true)).toMatchObject({ bug: "monarch", cloak: true });
    expect(hereFor(WORD, x.h, x.at, DRY, [])).toEqual(hereAt(WORD, x.h, x.at, DRY, []));
    const plain = swarms(WORD, x.at, DRY, none), worn = swarms(WORD, x.at, DRY, none, [], UNHUNTED, true);
    expect(plain.find((s) => s.id === x.h.id)?.bug).toBe(x.all);
    expect(worn.find((s) => s.id === x.h.id)?.bug).toBe("monarch");
    // (the same turn, the same seed: one insect of the haunt's, seen as one or the other)
    expect(worn.find((s) => s.id === x.h.id)).toMatchObject({ turn: plain.find((s) => s.id === x.h.id)!.turn, seed: plain.find((s) => s.id === x.h.id)!.seed });
    // every other haunt is the same for both, but where the cloak has its own
    expect(worn.length).toBeGreaterThanOrEqual(plain.length);
    for (const s of plain) expect(worn.some((w) => w.id === s.id)).toBe(true);
    // caught by anybody, it is gone for both
    const taken_ = (h: Haunt) => ({ n: h.id === x.h.id ? 1 : 0, mine: false });
    expect(swarms(WORD, x.at, DRY, taken_).some((s) => s.id === x.h.id)).toBe(false);
    expect(swarms(WORD, x.at, DRY, taken_, [], UNHUNTED, true).some((s) => s.id === x.h.id)).toBe(false);
    // a kind hunted beyond counting is not there for the cloak either: its wearer has what everybody has
    const hunts: Hunt[] = [{ bug: "monarch", at: x.at - 3 * HOUR, n: 1_000_000 }];
    expect(cloakAt(WORD, x.h, x.at, DRY, hunts)).toBeNull();
    expect(hereFor(WORD, x.h, x.at, DRY, [], hunts, true)?.bug).toBe(swarmAt(WORD, x.h, x.at, DRY, hunts)?.bug);
  });

  it("brings them to a drop of nectar on any day, too", () => {
    const lamp = hauntOf("lamp", "town");
    let off = NIGHT;
    while (isDayOf(WORD, "hawkMoth", BUGS.hawkMoth.day!, off)) off += DAY;
    expect(nectarMay(WORD, lamp, off).map(([id]) => id)).not.toContain("hawkMoth");
    expect(nectarMay(WORD, lamp, off, DRY, UNHUNTED, true).map(([id]) => id)).toContain("hawkMoth");
    const at: [number, number] = [Math.floor(lamp.perches[0].x), Math.floor(lamp.perches[0].y)];
    const worn = { ...withGifts(["thingNectar", "charmCloak"], { charms: ["charmCloak"] }) }, bare = withGifts(["thingNectar"]);
    const kinds = (p: Purse) => { const got = new Set<string>(); for (let r = 0.0005; r < 1; r += 0.001) { const did = nectar(p, at, off, WORD, DRY, UNHUNTED, [r, 0, 0]); if (did.ok) got.add(did.lured.bug); } return got; };
    if (nectarHaunt(at)?.id === lamp.id) { expect(kinds(worn).has("hawkMoth")).toBe(true); expect(kinds(bare).has("hawkMoth")).toBe(false); }
  });
});

describe("the butterfly-wing cloak: a pair at a time (an insect caught has another following, to be netted within three seconds)", () => {
  const field = hauntOf("field", "farm"), tile: [number, number] = [Math.floor(field.perches[0].x), Math.floor(field.perches[0].y)];
  const has = { turn: 5, bug: "grasshopper" as BugId, n: 1, seed: 1 };
  const worn = (more: Partial<Purse> = {}): Purse => ({ ...withGifts(["charmCloak"], { charms: ["charmCloak"] }), bag: put(newPurse().bag, "bugNet", 1), hand: "bugNet", stamina: { day: dayOf(NOON), left: 100 }, ...more });

  it("an insect caught under the cloak leaves another of its kind following, kept in the purse for three seconds; without the cloak, nothing", () => {
    const did = net(worn(), field, has, 0, false, "bugNet", tile, 0, NOON);
    if (!did.ok) throw new Error(did.why);
    expect(did.purse.follower).toEqual({ bug: "grasshopper", n: 1, at: tile, until: NOON + 3000 });
    expect(followerNow(did.purse, NOON + 3000 + PAIR.slack)).toEqual(did.purse.follower);
    expect(followerNow(did.purse, NOON + 3000 + PAIR.slack + 1)).toBeNull();
    const bare = net({ ...worn(), gifts: { had: ["charmCloak"], charms: [] } }, field, has, 0, false, "bugNet", tile, 0, NOON);
    expect(bare.ok && bare.purse.follower).toBeUndefined();
    expect(followed(newPurse(), newPurse(), "moth", 1, [1, 1], NOON).follower).toBeUndefined();
    // a catch that is refused leaves nothing following
    expect(net(worn(), field, has, 1, false, "bugNet", tile, 0, NOON)).toEqual({ ok: false, why: "bare" });
  });

  it("the second is netted within its time, as any insect is: for its stamina, with a net, from near; and has none following", () => {
    const first = net(worn(), field, has, 0, false, "bugNet", tile, 0, NOON);
    if (!first.ok) throw new Error(first.why);
    const p = first.purse;
    expect(netMine(p, "pair", null, tile, 0, NOON + 1000)).toEqual({ ok: false, why: "tool" });
    expect(netMine(p, "pair", "bugNet", [tile[0] + 7, tile[1]], 0, NOON + 1000)).toEqual({ ok: false, why: "far" });
    expect(netMine({ ...p, bag: p.bag.map((s) => s ?? { item: "boot" as const, n: 1 }) }, "pair", "bugNet", tile, 0, NOON + 1000).ok).toBe(true);
    expect(netMine({ ...p, bag: p.bag.map(() => ({ item: "boot" as const, n: 1 })) }, "pair", "bugNet", tile, 0, NOON + 1000)).toEqual({ ok: false, why: "full" });
    expect(netMine(p, "lured", "bugNet", tile, 0, NOON + 1000)).toEqual({ ok: false, why: "none" });
    const second = netMine(p, "pair", "bugNet", [tile[0] + 1, tile[1] + 1], 1, NOON + 2500);
    if (!second.ok) throw new Error(second.why);
    expect(second.got).toEqual([["grasshopper", 1]]);
    expect(held(second.purse.bag, "grasshopper")).toBe(2);
    expect(second.purse.follower).toBeNull();
    expect(staminaOf(p, NOON) - staminaOf(second.purse, NOON)).toBe(BUGS.grasshopper.cost + 1);
    expect(netMine(second.purse, "pair", "bugNet", tile, 0, NOON + 2600)).toEqual({ ok: false, why: "none" });
  });

  it("not netted in time there is only the one: the keeper takes it a little late for the journey, and no later", () => {
    const first = net(worn(), field, has, 0, false, "bugNet", tile, 0, NOON);
    if (!first.ok) throw new Error(first.why);
    expect(numberOf("charmCloak")).toBe(3);
    expect(netMine(first.purse, "pair", "bugNet", tile, 0, NOON + 3000 + PAIR.slack).ok).toBe(true);
    expect(netMine(first.purse, "pair", "bugNet", tile, 0, NOON + 3000 + PAIR.slack + 1)).toEqual({ ok: false, why: "none" });
    expect(held(first.purse.bag, "grasshopper")).toBe(1);
  });

  it("the insect of a drop of nectar, caught under the cloak, has one following too", () => {
    const p: Purse = { ...worn(), lured: { x: tile[0], y: tile[1], haunt: field.id, bug: "cricket", n: 2, from: NOON - 1000, until: NOON + 60_000, seed: 3 } };
    const did = netMine(p, "lured", "bugNet", tile, 0, NOON);
    if (!did.ok) throw new Error(did.why);
    expect(did.purse.lured).toBeNull();
    expect(did.purse.follower).toEqual({ bug: "cricket", n: 2, at: tile, until: NOON + 3000 });
  });

  it("the one that follows wheels about the place of the catch, on the wing: never far from it, never still, the same when asked again", () => {
    const at = { x: 40.3, y: 22.7 };
    for (const bug of ["grasshopper", "morpho", "ladybird"] as BugId[]) for (const seed of [1, 99, 7777]) {
      const p0 = followerPose(bug, at, seed, NOON, NOON);
      expect(aimOf(p0).x).toBeCloseTo(at.x, 9);
      expect(aimOf(p0).y).toBeCloseTo(at.y, 9);
      let moved = 0, last = aimOf(p0);
      for (let ms = 100; ms <= 3000; ms += 100) {
        const p = followerPose(bug, at, seed, NOON, NOON + ms), g = aimOf(p);
        expect(p).toMatchObject({ flying: true, open: true, seen: true, lift: PAIR.lift });
        expect(Math.hypot(g.x - at.x, g.y - at.y)).toBeLessThanOrEqual(PAIR.radius * 1.2);
        moved += Math.hypot(g.x - last.x, g.y - last.y);
        last = g;
        expect(followerPose(bug, at, seed, NOON, NOON + ms)).toEqual(p);
      }
      // (it covers ground: some three to seven tiles in its three seconds; a quick kind more)
      expect(moved).toBeGreaterThan(2.5);
      expect(moved).toBeLessThan(9);
      // within a net's reach of whoever stood within reach of the first: at the most the reach and its wheel away
      expect(PAIR.radius).toBeLessThan(NET.reach);
    }
    const slow = (bug: BugId) => { let d = 0, last = aimOf(followerPose(bug, at, 5, NOON, NOON)); for (let ms = 50; ms <= 3000; ms += 50) { const g = aimOf(followerPose(bug, at, 5, NOON, NOON + ms)); d += Math.hypot(g.x - last.x, g.y - last.y); last = g; } return d; };
    expect(slow("morpho")).toBeGreaterThan(slow("grasshopper"));
    // a swing on it takes it; a good hunter's ring on a good one is narrower
    const p = followerPose("morpho", at, 5, NOON, NOON + 700);
    expect(taken("morpho", p, aimOf(p), false)).toBe(true);
    expect(taken("morpho", p, { x: aimOf(p).x + ringOf("morpho", false) * 0.95, y: aimOf(p).y }, false)).toBe(true);
    expect(taken("morpho", p, { x: aimOf(p).x + ringOf("morpho", false) * 0.95, y: aimOf(p).y }, false, 1, harderAt(6))).toBe(false);
  });
});

describe("a drop of nectar (insects, the third rank: within ten seconds an insect flies to it, of that place and hour; ten drops a day)", () => {
  const WORD = "nectar-test";
  const mine = (more: Partial<Purse> = {}): Purse => ({ ...withGifts(["thingNectar"]), bag: put(newPurse().bag, "bugNet", 1), hand: "bugNet", ...more });
  const tileBy = (h: Haunt): [number, number] => [Math.floor(h.perches[0].x), Math.floor(h.perches[0].y)];
  const MID: [number, number, number] = [0.5, 0, 0];

  it("is a thing of the third rank, ten drops a day, and its numbers are the catalog's", () => {
    expect(GIFTS.find((g) => g.id === "thingNectar")).toMatchObject({ kind: "thing", line: "insects", rank: 3 });
    expect(USES.thingNectar).toEqual({ n: 10, per: "day" });
    expect(NECTAR).toMatchObject({ within: 10, soon: 3, stays: 120 });
    expect(NECTAR.at).toEqual(["blooms", "water", "field", "lamp", "litter"]);
    // (the maps as the database is told them are the ones a tile is on)
    for (const [place, x, y, w, h] of NECTAR_MAPS) for (const [tx, ty] of [[x, y], [x + w - 1, y + h - 1], [x + Math.floor(w / 2), y + Math.floor(h / 2)]]) expect(placeOf(tx, ty)).toBe(place);
  });

  it("calls from the nearest haunt of the map one stands on that insects pass by often: never a tree, a glade or the fall", () => {
    for (const h of HAUNTS) {
      const from = nectarHaunt(tileBy(h))!;
      expect(from.place).toBe(h.place);
      expect(NECTAR.at).toContain(from.kind);
      if (NECTAR.at.includes(h.kind)) {
        // (beside a perch of such a haunt, it is that haunt or one as near)
        const d = (x: Haunt) => Math.min(...x.perches.map((p) => Math.hypot(p.x - tileBy(h)[0] - 0.5, p.y - tileBy(h)[1] - 0.5)));
        expect(d(from)).toBeLessThanOrEqual(d(h));
      }
    }
    expect(nectarHaunt([-3, 10])).toBeNull();
    expect(nectarHaunt([100, 100])).toBeNull();
  });

  it("brings one of the kinds of that place and that hour, by their weights there: within ten seconds, to stay two minutes", () => {
    const blooms = hauntOf("blooms", "town"), at = tileBy(blooms), h = nectarHaunt(at)!;
    const may = nectarMay(WORD, h, NOON);
    expect(may.length).toBeGreaterThan(0);
    for (const [id, w] of may) { expect(BUGS[id].at).toContain(h.kind); expect(w).toBe(BUGS[id].weight); }
    // every number of chance brings one of them, each as often as its weight
    const total = may.reduce((t, [, w]) => t + w, 0), seen = new Map<BugId, number>();
    for (let i = 0; i < 2000; i++) {
      const did = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, [(i + 0.5) / 2000, 0, 0]);
      expect(did.ok).toBe(true);
      if (did.ok) seen.set(did.lured.bug as BugId, (seen.get(did.lured.bug as BugId) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual(may.map(([id]) => id).sort());
    for (const [id, w] of may) expect(seen.get(id)! / 2000).toBeCloseTo(w / total, 2);
    // how soon, and how long
    const soon = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, [0.5, 0, 0]), late = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, [0.5, 0, 0.999999]);
    if (!soon.ok || !late.ok) throw new Error("a drop was refused");
    expect(soon.lured.from).toBe(NOON + 3000);
    expect(late.lured.from).toBeGreaterThan(NOON + 9900);
    expect(late.lured.from).toBeLessThan(NOON + 10_000);
    expect(soon.lured.until - soon.lured.from).toBe(120_000);
    expect(soon.lured).toMatchObject({ x: at[0], y: at[1], haunt: h.id, n: 1 });
    expect(soon.purse.lured).toEqual(soon.lured);
    // a cricket comes one or two at a catch, as at its haunt
    const field = hauntOf("field", "farm"), ns = new Set<number>();
    for (const r2 of [0, 0.49, 0.5, 0.999999]) { const did = nectar(mine(), tileBy(field), NIGHT, WORD, DRY, UNHUNTED, [0.5, r2, 0]); if (did.ok && did.lured.bug === "cricket") ns.add(did.lured.n); }
    expect([...ns].sort()).toEqual([1, 2]);
  });

  it("is refused to whoever has no nectar, has used the day's ten, or has one out; and a drop that is refused is not used", () => {
    const at = tileBy(hauntOf("blooms", "town"));
    expect(nectar(newPurse(), at, NOON, WORD, DRY, UNHUNTED, MID)).toEqual({ ok: false, why: "none" });
    let p = mine();
    for (let i = 0; i < 10; i++) {
      const did = nectar(p, at, NOON + i * 1000, WORD, DRY, UNHUNTED, MID);
      if (!did.ok) throw new Error(`drop ${i} refused: ${did.why}`);
      expect(did.left).toBe(9 - i);
      // (one is out: no other until it is caught or gone; after the tenth there is none to put down anyway)
      expect(nectar(did.purse, at, NOON + i * 1000 + 500, WORD, DRY, UNHUNTED, MID)).toEqual({ ok: false, why: i < 9 ? "out" : "spent" });
      p = { ...did.purse, lured: null };
    }
    expect(usesLeft(p, "thingNectar", NOON)).toBe(0);
    expect(nectar(p, at, NOON + 60_000, WORD, DRY, UNHUNTED, MID)).toEqual({ ok: false, why: "spent" });
    // the next day there are ten again
    const next = nectar(p, at, NOON + DAY, WORD, DRY, UNHUNTED, MID);
    expect(next.ok && next.left).toBe(9);
    // one whose time is over is no longer out
    const gone = nectar({ ...mine(), lured: { x: 1, y: 1, haunt: 0, bug: "moth", n: 1, from: NOON - 200_000, until: NOON - 1, seed: 1 } }, at, NOON, WORD, DRY, UNHUNTED, MID);
    expect(gone.ok).toBe(true);
  });

  it("brings nothing where nothing is about, and uses no drop for it: flowers at night, a lamp by day, a dry kind's place in the rain, off the maps", () => {
    const quiet = (h: Haunt | null, at: [number, number], when: number, rains = DRY) => {
      // (the haunt called from is the one stood by, or one as quiet)
      const from = nectarHaunt(at);
      if (h) expect(nectarMay(WORD, h, when, rains)).toEqual([]);
      if (!from || !nectarMay(WORD, from, when, rains).length) expect(nectar(mine(), at, when, WORD, rains, UNHUNTED, MID)).toEqual({ ok: false, why: "quiet" });
    };
    const blooms = hauntOf("blooms", "town"), lamp = hauntOf("lamp", "town");
    expect(nectarMay(WORD, blooms, NIGHT).map(([id]) => id)).toContain("lacewing");
    quiet(lamp, tileBy(lamp), NOON);
    quiet(blooms, tileBy(blooms), NOON, ALWAYS_RAIN);
    quiet(null, [-5, 5], NOON);
    expect(nectar(mine(), [-5, 5], NOON, WORD, DRY, UNHUNTED, MID)).toEqual({ ok: false, why: "quiet" });
    expect(nectarMay(WORD, lamp, NIGHT).map(([id]) => id)).toContain("moth");
  });

  it("never brings what comes down only to a hand, nor a glade's or the fall's own; a rare one as seldom as its weight beside the others", () => {
    const came = new Map<BugId, number>();
    let drops = 0;
    for (const h of HAUNTS) for (let hour = 0; hour < 24 * 6; hour += 1) {
      const now = NOON + hour * HOUR, may = nectarMay(WORD, nectarHaunt(tileBy(h))!, now), total = may.reduce((t, [, x]) => t + x, 0);
      for (const [id, w] of may) came.set(id, (came.get(id) ?? 0) + w / total);
      if (may.length) drops++;
    }
    for (const id of BUG_IDS) if (BUGS[id].habit === "lure" || ["morpho", "glassDragonfly", "cicada"].includes(id)) expect(came.get(id), id).toBeUndefined();
    // of every drop put down anywhere at any hour over six days, a rare insect comes to fewer than one in a hundred
    const rare = [...came].filter(([id]) => tierOf(id) === "rare").reduce((t, [, n]) => t + n, 0);
    expect(rare / drops).toBeLessThan(0.01);
    expect(rare).toBeGreaterThan(0);
    // and at the forest's flowers by day, an orchid mantis about one time in eighty
    const may = nectarMay(WORD, hauntOf("blooms", "forest"), NOON), total = may.reduce((t, [, w]) => t + w, 0);
    expect((may.find(([id]) => id === "orchidMantis")?.[1] ?? 0) / total).toBeCloseTo(2 / 176, 3);
  });

  it("a kind that is hunted comes seldom, and what is beside it there comes in its place; alone, it comes still", () => {
    const woods = HAUNTS.find((h) => h.kind === "litter" && h.zone === "woods")!, at = tileBy(woods), from = nectarHaunt(at)!;
    const hunts: Hunt[] = [{ bug: "stickInsect", at: NOON - 1000, n: 100_000 }];
    const plain = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, MID), scarce = nectar(mine(), at, NOON, WORD, DRY, hunts, MID);
    expect(from.kind).toBe("litter");
    expect(plain.ok && plain.lured.bug).toBe("stickInsect");
    expect(scarce.ok && scarce.lured.bug).toBe("caterpillar");
    expect(nectarMay(WORD, from, NOON, DRY, hunts).find(([id]) => id === "stickInsect")![1]).toBeCloseTo(100 * plentyOf(hunts, "stickInsect", NOON), 9);
    // at night a stick insect is all the woods' litter has: it comes, however hunted
    const alone = nectar(mine(), at, NIGHT, WORD, DRY, [{ bug: "stickInsect", at: NIGHT - 1000, n: 100_000 }], MID);
    expect(alone.ok && alone.lured.bug).toBe("stickInsect");
  });

  it("the insect is its owner's from when it has come until it is off, and keeps to a few perches round the drop", () => {
    const at = tileBy(hauntOf("water", "town")), did = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, MID);
    if (!did.ok) throw new Error(did.why);
    const l = did.lured;
    expect(luredNow(did.purse, l.from - 1)).toBeNull();
    expect(luredNow(did.purse, l.from)).toEqual(l);
    expect(luredNow(did.purse, l.until - 1)).toEqual(l);
    expect(luredNow(did.purse, l.until)).toBeNull();
    expect(luredNow(newPurse(), NOON)).toBeNull();
    const h = luredHaunt(l);
    expect(h.id).toBe(LURED);
    expect(h.place).toBe("town");
    expect(h.perches).toHaveLength(5);
    for (const p of h.perches) { const d = Math.hypot(p.x - at[0] - 0.5, p.y - at[1] - 0.5); expect(d).toBeGreaterThan(1.1); expect(d).toBeLessThan(1.9); expect(d).toBeLessThan(NET.reach); }
    expect(luredHaunt(l)).toEqual(h);
    // what goes round a light goes round the drop itself
    const moth: Lured = { ...l, bug: "moth" };
    expect(luredHaunt(moth).perches).toEqual([{ x: at[0] + 0.5, y: at[1] + 0.5 }]);
    // it is moved about as a haunt's insect is: what hovers, hovers at a perch of it
    const m = newMind(l.bug as BugId, h, l.seed, l.from), pose = poseOf(l.bug as BugId, h, l.seed, m, l.from + 100);
    expect(l.bug).toBe("dragonfly");
    expect(pose.open).toBe(true);
    expect(h.perches.some((p) => Math.hypot(p.x - pose.x, p.y - pose.y) < 0.2)).toBe(true);
  });

  it("is caught as a haunt's is: with a net, from near the drop, with room, for its stamina; once", () => {
    const at = tileBy(hauntOf("water", "town")), did = nectar(mine(), at, NOON, WORD, DRY, UNHUNTED, MID);
    if (!did.ok) throw new Error(did.why);
    const p = did.purse, l = did.lured, when = l.from + 5000, bug = l.bug as BugId;
    expect(netMine(p, "lured", "bugNet", at, 0, l.from - 1)).toEqual({ ok: false, why: "none" });
    expect(netMine(p, "lured", null, at, 0, when)).toEqual({ ok: false, why: "tool" });
    expect(netMine(p, "lured", "hoe", at, 0, when)).toEqual({ ok: false, why: "tool" });
    expect(netMine(p, "lured", "bugNet", [at[0] + 7, at[1]], 0, when)).toEqual({ ok: false, why: "far" });
    expect(netMine({ ...p, bag: p.bag.map(() => ({ item: "boot" as const, n: 1 })) }, "lured", "bugNet", at, 0, when)).toEqual({ ok: false, why: "full" });
    expect(netMine(p, "lured", "bugNet", at, 0, l.until)).toEqual({ ok: false, why: "none" });
    const got = netMine(p, "lured", "bugNet", [at[0] + 2, at[1] - 1], 5, when);
    if (!got.ok) throw new Error(got.why);
    expect(got.got).toEqual([[bug, l.n]]);
    expect(held(got.purse.bag, bug)).toBe(l.n);
    expect(got.purse.lured).toBeNull();
    // (its stamina, and a point a miss up to two)
    expect(staminaOf(p, when) - staminaOf(got.purse, when)).toBe(BUGS[bug].cost + NET.misses);
    expect(netMine(got.purse, "lured", "bugNet", at, 0, when)).toEqual({ ok: false, why: "none" });
    // the drops left are as they were: a catch uses none
    expect(usesLeft(got.purse, "thingNectar", when)).toBe(9);
  });
});
