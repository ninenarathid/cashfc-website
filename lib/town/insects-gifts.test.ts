import { describe, expect, it } from "vitest";
import { FAMILIARS, GIFTS, harderAt, harderFor, numberOf } from "./gifts";
import {
  BUGS, BUG_IDS, HABITS, HAUNTS, NET, ROAM, TIERS, aimOf, harderOn, knows, lulled, newMind, perchAt, poseOf, ringOf, roams, stealthOf, taken, think, tierOf,
  type BugId, type Haunt, type Mind, type Person,
} from "./insects";
import { ITEMS } from "./items";
import { POINTS } from "./line-points";
import { LINES } from "./lines";
import { HOUR, newPurse, type Purse } from "./trade";

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
    expect(of("uncommon")).toEqual(["cicada", "damselfly", "firefly", "leafInsect", "mantis", "rhinoBeetle", "stickInsect"]);
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
