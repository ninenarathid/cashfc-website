import { describe, expect, it } from "vitest";
import { FARMING, PUT_ON, see, type Plant, type Plot } from "./farm";
import { oddsOf } from "./fishing";
import {
  BUGS, BUG_IDS, COMEBACK, HABITS, HAUNTS, HAUNT_KINDS, LURES, NET, NETS, aimOf, bugTurn, bugTurnStart, comeback, hereAt, mayNet, missed, nearHaunt, net, newMind, poseOf, ringOf, swarmAt,
  swarms, swingMs, taken, think, type BugId, type Comeback, type Haunt, type Mind, type Person, type Swarm, pestToRid, fledBy,
} from "./insects";
import { BAITS, BAIT_AS, FISH, FISH_IDS, ITEMS, MAKES, type ItemId } from "./items";
import { BASIC } from "./orders";
import { staminaOf } from "./stamina";
import { GOODS, HOUR, held, newPurse, put, type Purse } from "./trade";
import { sources } from "./uses";
import { ALWAYS_RAIN, DRY } from "./weather";
import { SPEED, placeOf, walkable } from "./world";

/** 2026-10-05 12:00 in Bangkok, and the same day's midnight. */
const NOON = Date.UTC(2026, 9, 5, 5), NIGHT = Date.UTC(2026, 9, 5, 17), MINUTE = 60_000;
const bagOf = (...items: Array<[ItemId, number]>): Purse => ({ ...newPurse(), bag: items.reduce((bag, [id, n]) => put(bag, id, n), newPurse().bag) });
const hauntOf = (kind: Haunt["kind"], place?: Haunt["place"], zone?: Haunt["zone"]) => HAUNTS.find((h) => h.kind === kind && (!place || h.place === place) && (zone === undefined || h.zone === zone))!;
const swarmOf = (h: Haunt, bug: BugId, now: number): Swarm => ({ turn: bugTurn(h, now), bug, n: BUGS[bug].n[0], seed: h.id * 100003 + bugTurn(h, now) });
const still = (x: number, y: number, hold: ItemId | null = null): Person => ({ x, y, moving: false, hold });
const walking = (x: number, y: number): Person => ({ x, y, moving: true, hold: null });
/** What is out at every haunt over so many days from a moment, a turn at a time. */
function outOver(salt: string, from: number, days: number, rains = DRY): Map<BugId, number> {
  const seen = new Map<BugId, number>();
  for (const h of HAUNTS) {
    const every = HAUNT_KINDS[h.kind].every * MINUTE;
    for (let t = from; t < from + days * 24 * HOUR; t += every) { const s = swarmAt(salt, h, t, rains); if (s) seen.set(s.bug, (seen.get(s.bug) ?? 0) + 1); }
  }
  return seen;
}

describe("insects (the owner: \"จับแมลง ในทุกแมพในเกม แมพกลางเมือง ฟาร์ม ป่า จะมีแมลงออกมา\")", () => {
  it("are twenty-four, of eight habits, each an item of its own and none of one country alone", () => {
    expect(BUG_IDS).toHaveLength(24);
    expect(new Set(BUG_IDS.map((id) => BUGS[id].habit)).size).toBe(8);
    for (const id of BUG_IDS) {
      expect(ITEMS[id], id).toBeDefined();
      expect(ITEMS[id].kind === "bug" || id === "cricket", id).toBe(true);
      expect(BUGS[id].size, id).toBeGreaterThan(0.5);
      expect(BUGS[id].size, id).toBeLessThanOrEqual(1);
      expect(BUGS[id].cost, id).toBeGreaterThanOrEqual(1);
    }
  });

  it("have haunts on every map, each with perches somebody can get near", () => {
    for (const place of ["town", "farm", "forest"] as const) expect(HAUNTS.filter((h) => h.place === place).length, place).toBeGreaterThan(10);
    for (const kind of Object.keys(HAUNT_KINDS) as Array<Haunt["kind"]>) expect(HAUNTS.some((h) => h.kind === kind), kind).toBe(true);
    for (const h of HAUNTS) {
      expect(h.id).toBe(HAUNTS.indexOf(h));
      expect(placeOf(Math.floor(h.x), Math.floor(h.y)), `haunt ${h.id}`).toBe(h.place);
      expect(h.perches.length, `haunt ${h.id}`).toBeGreaterThanOrEqual(h.kind === "lamp" ? 1 : 3);
      for (const p of h.perches) {
        let near = false;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (walkable(Math.floor(p.x) + dx, Math.floor(p.y) + dy)) near = true;
        expect(near, `haunt ${h.id}`).toBe(true);
      }
    }
    // every insect has somewhere to be
    for (const id of BUG_IDS) {
      const b = BUGS[id];
      expect(HAUNTS.some((h) => b.at.includes(h.kind) && (!b.places || b.places.includes(h.place)) && (!b.zones || (!!h.zone && b.zones.includes(h.zone)))), id).toBe(true);
    }
  });

  it("are out by the keeper's word: the same for everybody who looks, another with another word", () => {
    const h = hauntOf("blooms", "town");
    const a = Array.from({ length: 60 }, (_, i) => swarmAt("one", h, NOON + i * 10 * MINUTE)?.bug ?? null);
    expect(Array.from({ length: 60 }, (_, i) => swarmAt("one", h, NOON + i * 10 * MINUTE)?.bug ?? null)).toEqual(a);
    expect(Array.from({ length: 60 }, (_, i) => swarmAt("two", h, NOON + i * 10 * MINUTE)?.bug ?? null)).not.toEqual(a);
    // a turn is one insect, the whole turn long
    const start = bugTurnStart(h, bugTurn(h, NOON));
    expect(swarmAt("one", h, start)).toEqual(swarmAt("one", h, start + 9 * MINUTE));
    expect(bugTurn(h, start + 10 * MINUTE)).toBe(bugTurn(h, start) + 1);
  });

  it("keep to their hours, their sky and their days: every one of them is out some time in a month, the rare ones seldom", () => {
    const month = outOver("check", NOON, 30);
    for (const id of BUG_IDS) expect(month.get(id) ?? 0, id).toBeGreaterThan(0);
    // by day no cricket and no moth; by night no butterfly
    for (const h of HAUNTS) for (let i = 0; i < 12; i++) {
      const day = swarmAt("check", h, NOON + i * 10 * MINUTE), night = swarmAt("check", h, NIGHT + i * 10 * MINUTE);
      if (day) expect(["cricket", "moth", "firefly", "rhinoBeetle"], `${day.bug} by day`).not.toContain(day.bug);
      if (night) expect(["butterflyWhite", "monarch", "dragonfly", "grasshopper", "cicada"], `${night.bug} by night`).not.toContain(night.bug);
    }
    // in the rain no butterfly and no moth
    const wet = outOver("check", NOON, 2, ALWAYS_RAIN);
    for (const id of ["butterflyWhite", "monarch", "morpho", "moth", "cicada", "firefly"] as BugId[]) expect(wet.get(id) ?? 0, id).toBe(0);
    expect(wet.get("dragonfly") ?? 0).toBeGreaterThan(0);
    // the rare ones: a handful of each a day over the whole map, taking one day with another
    for (const id of ["glassDragonfly", "orchidMantis", "lunaMoth", "hawkMoth", "stagBeetle", "jewelBeetle", "herculesBeetle", "morpho"] as BugId[]) {
      expect((month.get(id) ?? 0) / 30, id).toBeLessThan(16);
    }
    expect((month.get("herculesBeetle") ?? 0) / 30).toBeLessThan(2);
  });

  it("pay no more than the forest does for a point of stamina, the common ones", () => {
    for (const id of BUG_IDS) {
      const b = BUGS[id];
      if (b.day || b.moon || b.weight < 40) continue;
      const pays = (ITEMS[id].pays * (b.n[0] + b.n[1])) / 2 / b.cost;
      expect(pays, id).toBeGreaterThanOrEqual(1);
      expect(pays, id).toBeLessThanOrEqual(4);
    }
  });

  // The owner, 2026-10-05: "ช่วยทำให้ การจับแมลงขาย balance ด้วย อย่าให้ได้เงินเยอะกว่าอาชีพอื่น". A net costs once and an
  // insect nothing, so what one fetches is held to what the other lines fetch for the same stamina: a common fish
  // about 2 coins a point, the forest about 2.4, a quick vegetable 3.7.
  it("fetch no more for the stamina than the other lines of work: a day of them, caught with no miss, about a common fish's worth", () => {
    const day = Date.UTC(2026, 9, 5, 17);
    for (const place of ["town", "farm", "forest"] as const) {
      let coins = 0, cost = 0, n = 0;
      for (const h of HAUNTS.filter((x) => x.place === place)) {
        const every = HAUNT_KINDS[h.kind].every * MINUTE;
        for (let t = day; t < day + 24 * HOUR; t += every) {
          const has = swarmAt("the day's word", h, t);
          if (!has || ITEMS[has.bug].pays >= 15) continue;
          n++; coins += ITEMS[has.bug].pays * has.n; cost += BUGS[has.bug].cost;
        }
      }
      expect(n, place).toBeGreaterThan(300);
      expect(coins / cost, place).toBeGreaterThan(1.6);
      expect(coins / cost, place).toBeLessThanOrEqual(2.9);
      // (and with a swing that missed before each, which costs a point: well under)
      expect(coins / (cost + n), place).toBeLessThan(1.8);
    }
    // the ones that walk or fly about in plain sight fetch two coins; none of the common ones more than six
    for (const id of ["butterflyWhite", "dragonfly", "grasshopper", "ladybird", "moth", "caterpillar"] as BugId[]) expect(ITEMS[id].pays, id).toBe(2);
    for (const id of BUG_IDS) if (BUGS[id].weight >= 40 && !BUGS[id].day && !BUGS[id].moon && BUGS[id].habit !== "lure") expect(ITEMS[id].pays, id).toBeLessThanOrEqual(6);
  });
});

describe("a net", () => {
  it("is on the uncle's shelf from the first day, and can be made of what the forest gives", () => {
    expect(BASIC).toContain("bugNet");
    expect(GOODS.bugNet?.price).toBe(35);
    expect(MAKES.bugNet).toEqual({ needs: [["bambooCane", 1], ["vine", 2]], in: [], gives: 1 });
    expect(NETS).toEqual(["bugNet"]);
    expect(mayNet("bugNet")).toBe(true);
    expect(mayNet("hoe")).toBe(false);
    expect(mayNet(null)).toBe(false);
  });

  it("catches what a haunt has: once each, for so many, with the net in the hand, from near enough, for stamina", () => {
    const h = hauntOf("blooms", "town"), has = swarmOf(h, "butterflyWhite", NOON), at: [number, number] = [Math.floor(h.x), Math.floor(h.y)];
    const mine = bagOf(["bugNet", 1]);
    const did = net(mine, h, has, 0, false, "bugNet", at, 0, NOON);
    expect(did.ok && did.got).toEqual([["butterflyWhite", 1]]);
    expect(did.ok && held(did.purse.bag, "butterflyWhite")).toBe(1);
    expect(did.ok && staminaOf(did.purse, NOON)).toBe(99);
    // each swing that missed first is a point more, up to two
    for (const [misses, cost] of [[1, 2], [2, 3], [7, 3], [-3, 1], [0.9, 1]]) {
      const d = net(mine, h, has, 0, false, "bugNet", at, misses, NOON);
      expect(d.ok && staminaOf(d.purse, NOON), `${misses} misses`).toBe(100 - cost);
    }
    expect(net(mine, h, null, 0, false, "bugNet", at, 0, NOON)).toEqual({ ok: false, why: "none" });
    expect(net(mine, h, has, 0, true, "bugNet", at, 0, NOON)).toEqual({ ok: false, why: "had" });
    expect(net(mine, h, has, HAUNT_KINDS.blooms.shares, false, "bugNet", at, 0, NOON)).toEqual({ ok: false, why: "bare" });
    expect(net(mine, h, has, HAUNT_KINDS.blooms.shares - 1, false, "bugNet", at, 0, NOON).ok).toBe(true);
    expect(net(mine, h, has, 0, false, null, at, 0, NOON)).toEqual({ ok: false, why: "tool" });
    expect(net(mine, h, has, 0, false, "hoe", at, 0, NOON)).toEqual({ ok: false, why: "tool" });
    expect(net(mine, h, has, 0, false, "bugNet", [at[0] + 12, at[1]], 0, NOON)).toEqual({ ok: false, why: "far" });
    expect(nearHaunt(h, at)).toBe(true);
    // a full bag takes nothing, and costs nothing
    let full = mine;
    for (let i = 0; full.bag.some((s) => !s); i++) full = { ...full, bag: put(full.bag, (["rod", "hoe", "can", "pot", "pan", "grill", "bucket", "skewer", "bowl"] as ItemId[])[i % 9], 1) };
    expect(net(full, h, has, 0, false, "bugNet", at, 0, NOON)).toEqual({ ok: false, why: "full" });
    // with no stamina it is still caught
    const tired: Purse = { ...mine, stamina: { day: mine.stamina?.day ?? 0, left: 0 } };
    expect(net(tired, h, has, 0, false, "bugNet", at, 0, NOON).ok).toBe(true);
  });

  it("takes a beetle only when somebody holds something sweet under its tree", () => {
    const h = hauntOf("tree"), has = swarmOf(h, "rhinoBeetle", NIGHT), at: [number, number] = [Math.floor(h.perches[0].x), Math.floor(h.perches[0].y) + 1];
    const mine = bagOf(["bugNet", 1]);
    expect(net(mine, h, has, 0, false, "bugNet", at, 0, NIGHT)).toEqual({ ok: false, why: "lure" });
    expect(net(mine, h, has, 0, false, "bugNet", at, 0, NIGHT, "twig")).toEqual({ ok: false, why: "lure" });
    for (const lure of LURES) expect(net(mine, h, has, 0, false, "bugNet", at, 0, NIGHT, lure).ok, lure).toBe(true);
    // (and what brings one down is what the forest gives)
    for (const lure of LURES) expect(sources().get(lure), lure).toBe("forest");
  });

  it("is slow, and its ring is small: smaller and slower for tired hands", () => {
    expect(swingMs(false)).toBe(NET.lands);
    expect(swingMs(true)).toBeGreaterThan(NET.lands);
    for (const id of BUG_IDS) {
      expect(ringOf(id, true), id).toBeLessThan(ringOf(id, false));
      expect(ringOf(id, false), id).toBeLessThanOrEqual(NET.radius);
      expect(ringOf(id, true), id).toBeGreaterThan(0.12);
    }
    // (the owner, 2026-10-05: "การจับแมลงควรต้องทำให้ยากกว่านี้ตอน stamina หมด": less than half the ring, twice as long a swing)
    expect(NET.tired).toEqual({ radius: 0.4, lands: 600, misses: 2 });
    expect(swingMs(true)).toBe(2 * NET.lands);
    for (const id of BUG_IDS) expect(ringOf(id, true) / ringOf(id, false), id).toBeCloseTo(0.4, 10);
    // a swing can be aimed further than a grasshopper lets somebody come behind it, and nearer than it sees before it
    expect(NET.reach).toBeGreaterThan(HABITS.behind.back + NET.radius);
    expect(NET.reach).toBeLessThan(HABITS.behind.ahead);
    expect(NET.reach).toBeLessThan(HABITS.spot.notice);
  });
});

describe("tired hands", () => {
  it("lose an insect at the second swing that misses it; hands with stamina never do", () => {
    expect(fledBy(0, true)).toBe(false);
    expect(fledBy(1, true)).toBe(false);
    expect(fledBy(2, true)).toBe(true);
    expect(fledBy(7, true)).toBe(true);
    for (const misses of [0, 1, 2, 9, 30]) expect(fledBy(misses, false), `${misses} misses, with stamina`).toBe(false);
  });

  it("can still catch: a swing that lands on it takes it, whatever went before, and costs nothing they have not got", () => {
    const h = hauntOf("field", "farm"), has = swarmOf(h, "ladybird", NOON), at: [number, number] = [Math.floor(h.perches[0].x), Math.floor(h.perches[0].y)];
    const tired: Purse = { ...bagOf(["bugNet", 1]), stamina: { day: bagOf().stamina?.day ?? 0, left: 0 } };
    const did = net(tired, h, has, 0, false, "bugNet", at, 1, NOON);
    expect(did.ok && did.got).toEqual([["ladybird", 1]]);
    // a walker a ring's width off is taken by fresh hands and missed by tired ones: the ring is under half as wide
    const mind = newMind("ladybird", h, has.seed, bugTurnStart(h, has.turn)), pose = poseOf("ladybird", h, has.seed, mind, NOON), aim = aimOf(pose);
    const beside = { x: aim.x + ringOf("ladybird", true) + 0.05, y: aim.y };
    expect(taken("ladybird", pose, beside, false)).toBe(true);
    expect(taken("ladybird", pose, beside, true)).toBe(false);
    expect(taken("ladybird", pose, aim, true)).toBe(true);
  });
});

describe("how each insect is caught", () => {
  const at = (id: BugId, h: Haunt, m: Mind, now: number) => poseOf(id, h, h.id, m, now);

  it("a butterfly never stops: a net aimed at where it is misses, one aimed at where it will be takes it", () => {
    const h = hauntOf("blooms", "town"), m = newMind("butterflyWhite", h, h.id, NOON);
    let on = 0, ahead = 0;
    for (let i = 0; i < 200; i++) {
      const now = NOON + i * 137, here = at("butterflyWhite", h, m, now), then = at("butterflyWhite", h, m, now + NET.lands);
      expect(here.flying && here.seen && here.open).toBe(true);
      if (taken("butterflyWhite", then, aimOf(here), false)) on++;
      if (taken("butterflyWhite", then, aimOf(then), false)) ahead++;
    }
    expect(ahead).toBe(200);
    expect(on).toBeLessThan(50);
    // it goes no faster than can be led, and faster than a net can be dropped on
    const a = at("butterflyWhite", h, m, NOON), b = at("butterflyWhite", h, m, NOON + 300);
    const moved = Math.hypot(b.x - a.x, b.y - a.y);
    expect(moved).toBeGreaterThan(0.3);
    expect(moved).toBeLessThan(1.4);
    expect(HABITS.path.speed).toBeLessThan(SPEED);
    // it minds nobody
    expect(think("butterflyWhite", h, h.id, m, NOON, [walking(a.x, a.y)])).toBe(m);
  });

  it("a moth goes round its lamp, always within reach of somebody beside it", () => {
    const h = hauntOf("lamp", "town"), m = newMind("moth", h, h.id, NIGHT);
    for (let i = 0; i < 100; i++) {
      const p = at("moth", h, m, NIGHT + i * 211), r = Math.hypot(p.x - h.x, p.y - h.y);
      expect(r).toBeGreaterThanOrEqual(HABITS.lamp.near - 0.01);
      expect(r).toBeLessThanOrEqual(HABITS.lamp.far + 0.01);
      expect(r + 1.5).toBeLessThan(NET.reach + 1.5);
    }
  });

  it("a ladybird only walks, from perch to perch, and anybody may come up to it", () => {
    const h = hauntOf("field", "farm"), m = newMind("ladybird", h, h.id, NOON);
    const a = at("ladybird", h, m, NOON), b = at("ladybird", h, m, NOON + 1000);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(HABITS.crawl.speed + 0.01);
    expect(a.lift).toBe(0);
    expect(think("ladybird", h, h.id, m, NOON, [walking(a.x, a.y)])).toBe(m);
    expect(taken("ladybird", a, aimOf(a), false)).toBe(true);
  });

  it("a dragonfly hovers and darts on; it darts at once from somebody who walks up, and not from somebody who stands", () => {
    const h = hauntOf("water", "town");
    let m = newMind("dragonfly", h, h.id, NOON);
    const perch = h.perches[m.at];
    expect(think("dragonfly", h, h.id, m, NOON + 100, [still(perch.x + 1, perch.y)])).toBe(m);
    const fled = think("dragonfly", h, h.id, m, NOON + 100, [walking(perch.x + 1, perch.y)]);
    expect(fled.at).not.toBe(m.at);
    expect(fled.land).toBeGreaterThan(NOON + 100);
    // (to the perch furthest from them)
    const far = Math.hypot(h.perches[fled.at].x - perch.x - 1, h.perches[fled.at].y - perch.y);
    for (const [i, p] of h.perches.entries()) if (i !== m.at) expect(Math.hypot(p.x - perch.x - 1, p.y - perch.y)).toBeLessThanOrEqual(far + 1e-9);
    // left alone it goes on by itself, within a few seconds
    for (let t = NOON; t < NOON + 4000 && m.visit === 0; t += 50) m = think("dragonfly", h, h.id, m, t, []);
    expect(m.visit).toBe(1);
    // and a damselfly sooner
    let d = newMind("damselfly", h, h.id, NOON), when = 0;
    for (let t = NOON; t < NOON + 4000 && d.visit === 0; t += 10) { d = think("damselfly", h, h.id, d, t, []); when = t; }
    expect(when - NOON).toBeLessThan(HABITS.spot.hover[1] / (BUGS.damselfly.quick ?? 1) + 20);
  });

  it("a grasshopper sees far before it and hardly behind: whoever comes behind it may swing", () => {
    const h = hauntOf("field", "farm"), m = newMind("grasshopper", h, h.id, NOON), here = h.perches[m.at], f = m.face;
    // (before it is the way it faces across the screen: more x and less y to the right)
    const before = still(here.x + f * 1.5, here.y - f * 1.5), behind = still(here.x - f * 1.5, here.y + f * 1.5);
    expect(Math.hypot(before.x - here.x, before.y - here.y)).toBeLessThan(NET.reach);
    const stays = think("grasshopper", h, h.id, m, NOON + 100, [behind]);
    expect(stays.at).toBe(m.at);
    const hops = think("grasshopper", h, h.id, m, NOON + 100, [before]);
    expect(hops.at).not.toBe(m.at);
    expect(at("grasshopper", h, hops, NOON + 110).open).toBe(false);
    // right on top of it, it is off whichever way it faces
    expect(think("grasshopper", h, h.id, m, NOON + 100, [still(here.x - f * 0.3, here.y + f * 0.3)]).at).not.toBe(m.at);
    // it looks about now and then, the other way some of the time
    const faces = new Set<number>();
    let mind = m;
    for (let t = NOON; t < NOON + 120_000; t += 500) { mind = think("grasshopper", h, h.id, mind, t, []); faces.add(mind.face); }
    expect(faces.size).toBe(2);
  });

  it("a mantis turns to whoever is nearest: alone nobody gets behind it, with a friend before it somebody does", () => {
    const h = hauntOf("field", "farm"), m = newMind("mantis", h, h.id, NOON), here = h.perches[m.at];
    const look = HABITS.behind.tracks[1] + 50;
    // alone, wherever I stand it has turned to me by its next look
    for (const side of [1, -1]) {
      const me = still(here.x + side * 3, here.y - side * 3);
      const turned = think("mantis", h, h.id, m, NOON + look, [me]);
      expect(turned.at).toBe(m.at);
      expect(turned.face).toBe(side);
    }
    // a friend nearer than I am, before it and out of its sight, holds its eye: I am behind it
    const friend = still(here.x + 2.5, here.y - 2.5), me = still(here.x - 2.8, here.y + 2.8);
    const held = think("mantis", h, h.id, m, NOON + look, [friend, me]);
    expect(held.face).toBe(1);
    expect(held.at).toBe(m.at);
    // and a step in, I am within reach and still not seen
    const close = still(here.x - 1.5, here.y + 1.5);
    expect(think("mantis", h, h.id, held, NOON + look + 200, [friend, close]).at).toBe(m.at);
  });

  it("a cricket is not seen: it sings while nobody near it walks, and is taken where its song comes from", () => {
    const h = hauntOf("field", "farm"), m = newMind("cricket", h, h.id, NIGHT), here = h.perches[m.at];
    const p = at("cricket", h, m, NIGHT + 5000);
    expect(p.seen).toBe(false);
    expect(p.sings).toBe(true);
    const hushed = think("cricket", h, h.id, m, NIGHT + 5000, [walking(here.x + 2, here.y)]);
    expect(at("cricket", h, hushed, NIGHT + 5001).sings).toBe(false);
    expect(hushed.at).toBe(m.at);
    // (somebody further off, or standing, is nothing to it)
    expect(think("cricket", h, h.id, m, NIGHT + 5000, [walking(here.x + 5, here.y)])).toBe(m);
    expect(think("cricket", h, h.id, m, NIGHT + 5000, [still(here.x + 1, here.y)])).toBe(m);
    // it sings again a moment after they stand
    expect(at("cricket", h, hushed, NIGHT + 5000 + HABITS.sound.still + 1).sings).toBe(true);
    expect(taken("cricket", p, aimOf(p), false)).toBe(true);
    // a miss beside it sends it off, quiet for a while
    const off = missed("cricket", h, h.id, m, NIGHT + 5000, { x: here.x + 1, y: here.y });
    expect(off.at).not.toBe(m.at);
    expect(at("cricket", h, off, off.land + 100).sings).toBe(false);
  });

  it("a cicada sings and rests in turn: walked up to while it sings it stays, while it is quiet it is off", () => {
    const h = hauntOf("tree"), m = newMind("cicada", h, h.id, NOON), here = h.perches[m.at];
    let sang = 0, quiet = 0, flew = 0, stayed = 0;
    for (let t = NOON; t < NOON + 30_000; t += 100) {
      const p = at("cicada", h, m, t), next = think("cicada", h, h.id, m, t, [walking(here.x + 1.5, here.y + 1.5)]);
      if (p.sings) { sang++; expect(next.at).toBe(m.at); stayed++; } else { quiet++; if (next.at !== m.at) flew++; }
      expect(p.seen).toBe(true);
    }
    expect(sang).toBeGreaterThan(60);
    expect(quiet).toBeGreaterThan(40);
    // (a moment's grace as its song ends, then it is off for certain)
    expect(flew).toBeGreaterThan(quiet * 0.6);
    expect(flew).toBeLessThan(quiet);
  });

  it("a stick insect lies among sticks, gives itself away now and then, and is somewhere else after a miss", () => {
    const h = hauntOf("litter", "forest"), m = newMind("stickInsect", h, h.id, NOON);
    expect(BUGS.stickInsect.like).toBe("twig");
    let twitches = 0;
    for (let t = NOON + 100; t < NOON + 20_000; t += 100) { const p = at("stickInsect", h, m, t); expect(p.seen && p.open).toBe(true); if (p.twitch) twitches++; }
    expect(twitches).toBeGreaterThan(5);
    expect(twitches).toBeLessThan(60);
    expect(think("stickInsect", h, h.id, m, NOON + 500, [walking(h.perches[m.at].x, h.perches[m.at].y)])).toBe(m);
    const moved = missed("stickInsect", h, h.id, m, NOON + 500, h.perches[m.at]);
    expect(moved.at).not.toBe(m.at);
    // (and keeps still a while)
    for (let t = NOON + 500; t < NOON + 500 + HABITS.look.still; t += 100) expect(at("stickInsect", h, moved, t).twitch).toBe(false);
  });

  it("a firefly shows only while it glows", () => {
    const h = hauntOf("water", "forest"), m = newMind("firefly", h, h.id, NIGHT);
    let lit = 0, dark = 0;
    for (let t = NIGHT; t < NIGHT + 20_000; t += 50) { const p = at("firefly", h, m, t); expect(p.seen).toBe(p.glow > 0); expect(p.open).toBe(true); if (p.seen) lit++; else dark++; }
    expect(lit).toBeGreaterThan(30);
    expect(dark).toBeGreaterThan(lit);
  });

  it("a beetle comes down its tree only while somebody stands still under it with something sweet", () => {
    const h = hauntOf("tree"), trunk = h.perches[0], H = HABITS.lure;
    let m = newMind("rhinoBeetle", h, h.id, NIGHT);
    expect(m.at).toBe(0);
    const alone = [still(trunk.x + 1, trunk.y, "bugNet")], lured = [still(trunk.x + 1, trunk.y, "bugNet"), still(trunk.x, trunk.y + 1, "resin")];
    for (let t = NIGHT; t < NIGHT + 10_000; t += 100) { m = think("rhinoBeetle", h, h.id, m, t, alone); const p = at("rhinoBeetle", h, m, t); expect(p.seen || p.open).toBe(false); }
    let down = 0;
    for (let t = NIGHT + 10_000; t < NIGHT + 20_000; t += 100) { m = think("rhinoBeetle", h, h.id, m, t, lured); if (at("rhinoBeetle", h, m, t).open) down ||= t; }
    expect(down - NIGHT - 10_000).toBeGreaterThanOrEqual(H.patience + H.down - 100);
    expect(down - NIGHT - 10_000).toBeLessThan(H.patience + H.down + 300);
    // whoever holds it walks off, or puts it away: back up it goes
    for (const gone of [[still(trunk.x + 1, trunk.y, "bugNet"), { ...walking(trunk.x, trunk.y + 1), hold: "resin" as ItemId }], alone]) {
      let up = m;
      for (let t = NIGHT + 20_000; t < NIGHT + 22_000; t += 100) up = think("rhinoBeetle", h, h.id, up, t, gone);
      expect(at("rhinoBeetle", h, up, NIGHT + 22_000).open).toBe(false);
    }
    // one hand cannot hold the net and the resin: the one who lures is never the one who nets
    expect(LURES.some((l) => NETS.includes(l))).toBe(false);
  });
});

describe("what an insect is good for, besides the uncle's relatives", () => {
  it("four go on a hook, each as a bait there already was: nothing else in the river changes", () => {
    expect(BAIT_AS).toEqual({ caterpillar: "worm", moth: "dough", dragonfly: "minnow", grasshopper: "cricket" });
    for (const [bug, as] of Object.entries(BAIT_AS) as Array<[keyof typeof BAIT_AS, NonNullable<(typeof BAIT_AS)[keyof typeof BAIT_AS]>]>) {
      expect(BAITS).toContain(bug);
      for (const hour of [6, 12, 20, 2]) for (const rain of [false, true]) for (const shallow of [false, true]) {
        expect(oddsOf(bug, hour, rain, false, shallow), `${bug} at ${hour}`).toEqual(oddsOf(as, hour, rain, false, shallow));
      }
      for (const id of FISH_IDS) expect(FISH[id].baits[bug], `${id} on ${bug}`).toBe(FISH[id].baits[as]);
      // (an insect is of its bait's tier, so that a later tier's fish still takes only that tier's baits)
      expect(ITEMS[bug].tier).toBe(ITEMS[as].tier);
    }
    // a cricket caught is the cricket that goes on a hook
    expect(BAITS).toContain("cricket");
    expect(BUGS.cricket.n).toEqual([1, 2]);
  });

  it("five are let go on a plant", () => {
    expect(PUT_ON.ladybird).toBe("guard");
    expect(PUT_ON.mantis).toBe("guard");
    expect(PUT_ON.butterflyWhite).toBe("feed");
    expect(PUT_ON.monarch).toBe("feed");
    expect(PUT_ON.scarab).toBe("feed");
  });

  it("every one can be had by somebody with a net; a beetle, with a friend who has been to the forest", () => {
    const from = sources();
    // (a cricket is on the uncle's shelf too, in time)
    for (const id of BUG_IDS) expect(from.get(id), id).toBe(id === "cricket" ? "shop" : "net");
    expect(sources(BASIC).get("cricket")).toBe("net");
    // without the forest counted, none of them is: the uncle never asks for one
    const tame = sources(undefined, false);
    for (const id of BUG_IDS) if (id !== "cricket") expect(tame.has(id), id).toBe(false);
  });
});

describe("under the fountain's soft step", () => {
  it("an insect sees and hears less far of whoever has it, and as far as ever of anybody else", () => {
    const soft = 2 / 3;
    // a grasshopper, somebody before it at a distance it sees plainly and one under the blessing at the same place
    const h = hauntOf("field", "farm"), m = newMind("grasshopper", h, h.id, NOON), here = h.perches[m.at], f = m.face;
    const d = HABITS.behind.ahead * 0.8, at = { x: here.x + (f * d) / Math.SQRT2, y: here.y - (f * d) / Math.SQRT2 };
    expect(think("grasshopper", h, h.id, m, NOON + 100, [still(at.x, at.y)]).at).not.toBe(m.at);
    expect(think("grasshopper", h, h.id, m, NOON + 100, [{ ...still(at.x, at.y), soft }]).at).toBe(m.at);
    // (and nearer than that it sees them too)
    const near = HABITS.behind.ahead * soft * 0.9, in_ = { x: here.x + (f * near) / Math.SQRT2, y: here.y - (f * near) / Math.SQRT2 };
    expect(think("grasshopper", h, h.id, m, NOON + 100, [{ ...still(in_.x, in_.y), soft }]).at).not.toBe(m.at);
    // a dragonfly, walked up to
    const w = hauntOf("water", "town"), dm = newMind("dragonfly", w, w.id, NOON), perch = w.perches[dm.at], off = HABITS.spot.notice * 0.8;
    expect(think("dragonfly", w, w.id, dm, NOON + 100, [walking(perch.x + off, perch.y)]).at).not.toBe(dm.at);
    expect(think("dragonfly", w, w.id, dm, NOON + 100, [{ ...walking(perch.x + off, perch.y), soft }])).toBe(dm);
    // a cricket goes on singing
    const c = hauntOf("field", "farm"), cm = newMind("cricket", c, c.id, NIGHT), spot = c.perches[cm.at], by = HABITS.sound.notice * 0.8;
    expect(think("cricket", c, c.id, cm, NIGHT + 5000, [walking(spot.x + by, spot.y)])).not.toBe(cm);
    expect(think("cricket", c, c.id, cm, NIGHT + 5000, [{ ...walking(spot.x + by, spot.y), soft }])).toBe(cm);
    // with it, a swing still reaches where a grasshopper lets somebody stand before it
    expect(HABITS.behind.ahead * soft).toBeLessThan(NET.reach);
  });
});

describe("a ladybird caught (the owner: \"จะสุ่มโอกาศเล็กน้อย ประมาณ 10% ที่จะลดแมลงที่กินพืชอยู่ในแปลงได้แบบสุ่ม\")", () => {
  /** A plant sown at a moment, nothing done to it since. */
  const plant = (sown: number, more: Partial<Plant> = {}): Plant => ({ by: "a", crop: "pumpkin", sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
  /** Plots of the farm sown two days before a noon, and those of them a pest is on at that noon. */
  const farm = (() => {
    const plots: Record<string, Plot> = {};
    for (let x = 132; x < 139; x++) for (let y = 4; y < 11; y++) plots[`${x},${y}`] = { soil: "tilled", plant: plant(NOON - 50 * HOUR + x * 60_000) };
    return plots;
  })();
  // (a moment at which several of them have a pest on them, found by looking)
  const when = (() => { for (let t = NOON; t < NOON + 48 * HOUR; t += HOUR / 2) if (Object.keys(farm).filter((k) => see(k, farm[k], t).pest).length >= 3) return t; return NOON; })();
  const struck = Object.keys(farm).filter((k) => see(k, farm[k], when).pest);

  it("has one chance in ten of taking a pest off some plant with it, and is out the whole of the day", () => {
    expect(BUGS.ladybird.rids).toBe(0.1);
    expect(BUG_IDS.filter((id) => BUGS[id].rids)).toEqual(["ladybird"]);
    expect(BUGS.ladybird.hours).toEqual([[5, 18]]);
    // (the pests' own hours are inside the ladybird's)
    expect(BUGS.ladybird.hours![0][0]).toBeLessThanOrEqual(FARMING.pests.from);
    expect(BUGS.ladybird.hours![0][1]).toBeGreaterThanOrEqual(FARMING.pests.to);
  });

  it("rids one of the plants that have a pest on them, whoever sowed it: which, by the pick, in the order of their tiles", () => {
    expect(struck.length).toBeGreaterThanOrEqual(3);
    const sorted = [...struck].sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]) || Number(a.split(",")[1]) - Number(b.split(",")[1]));
    expect(pestToRid(farm, when, DRY, 0)).toBe(sorted[0]);
    expect(pestToRid(farm, when, DRY, 0.9999)).toBe(sorted[sorted.length - 1]);
    expect(pestToRid(farm, when, DRY, 1)).toBe(sorted[sorted.length - 1]);
    expect(pestToRid(farm, when, DRY, -1)).toBe(sorted[0]);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pestToRid(farm, when, DRY, i / 400)!);
    expect([...seen].sort()).toEqual([...struck].sort());
    // every one it may pick has a pest on it, and none of the others is ever picked
    for (const k of seen) expect(see(k, farm[k], when).pest).toBe(true);
  });

  it("takes none where there is none: no plant, a plant with no pest, one covered, one already dead of its pest", () => {
    expect(pestToRid({}, when, DRY, 0.5)).toBeNull();
    expect(pestToRid({ "132,4": { soil: "tilled", plant: null } }, when, DRY, 0.5)).toBeNull();
    const clean = Object.fromEntries(Object.entries(farm).filter(([k]) => !struck.includes(k)));
    expect(pestToRid(clean, when, DRY, 0.5)).toBeNull();
    // cured, it has none; and the cure is what a ladybird leaves behind
    const k = struck[0], cured: Plot = { ...farm[k], plant: { ...farm[k].plant!, cured: when } };
    expect(see(k, cured, when).pest).toBe(false);
    expect(pestToRid({ [k]: cured }, when, DRY, 0)).toBeNull();
    // left long enough the plant dies, and a dead plant has no pest to take
    const later = when + (FARMING.pests.kills + 1) * HOUR;
    expect(see(k, farm[k], later).dead).toBe(true);
    expect(pestToRid({ [k]: farm[k] }, later, DRY, 0)).toBeNull();
  });
});


describe("an insect caught (the owner: \"เมื่อจับแมลงแล้ว ช่วยทำให้หายไปจากแมพ ในหน้าจอคนอื่นด้วย หลังจากนั้น จะมี delay เล็กน้อยก่อนสุ่มเกิดที่ใหม่\")", () => {
  const WORD = "a word";
  const none = () => ({ n: 0, mine: false });
  /** A haunt of a map that has an insect of its own at a moment, found by looking. */
  const withOne = (place: Haunt["place"], now: number) => HAUNTS.find((h) => h.place === place && !!swarmAt(WORD, h, now))!;
  /** The haunts of a map an insect may come back to after a catch at one of them at a moment. */
  const freeOf = (from: Haunt, now: number, backs: Comeback[] = []) => {
    const at = now + COMEBACK.after * 1000, seen = new Set<number>();
    for (let i = 0; i < 600; i++) { const b = comeback(WORD, from, now, DRY, backs, [i / 600, 0.5, 0]); if (b) seen.add(b.haunt); }
    return { at, ids: [...seen].sort((a, b) => a - b) };
  };

  it("is one member's: every kind of haunt has it once, and whoever swings second is told it is gone", () => {
    for (const kind of Object.keys(HAUNT_KINDS) as Array<keyof typeof HAUNT_KINDS>) expect(HAUNT_KINDS[kind].shares, kind).toBe(1);
    const h = withOne("farm", NOON), has = swarmAt(WORD, h, NOON)!, at: [number, number] = [Math.floor(h.perches[0].x), Math.floor(h.perches[0].y)];
    expect(net(bagOf(["bugNet", 1]), h, has, 0, false, "bugNet", at, 0, NOON).ok).toBe(true);
    expect(net(bagOf(["bugNet", 1]), h, has, 1, false, "bugNet", at, 0, NOON)).toEqual({ ok: false, why: "bare" });
    // and it is on nobody's map any more: not the catcher's, not anybody else's
    expect(swarms(WORD, NOON, DRY, none).some((x) => x.id === h.id)).toBe(true);
    expect(swarms(WORD, NOON, DRY, (x) => ({ n: x.id === h.id ? 1 : 0, mine: false })).some((x) => x.id === h.id)).toBe(false);
    expect(swarms(WORD, NOON, DRY, (x) => ({ n: x.id === h.id ? 1 : 0, mine: x.id === h.id })).some((x) => x.id === h.id)).toBe(false);
  });

  it("comes back a little later at another haunt of the same map, one that had nothing in its turn", () => {
    expect(COMEBACK).toEqual({ after: 30, least: 120 });
    for (const place of ["town", "farm", "forest"] as const) {
      const from = withOne(place, NOON), { at, ids } = freeOf(from, NOON);
      expect(ids.length, place).toBeGreaterThanOrEqual(3);
      for (const id of ids) {
        const h = HAUNTS[id];
        expect(h.place, place).toBe(place);
        expect(id).not.toBe(from.id);
        // nothing of its own there in the turn it will be in, and enough of that turn left to be found in
        expect(swarmAt(WORD, h, at)).toBeNull();
        expect(bugTurnStart(h, bugTurn(h, at) + 1) - at).toBeGreaterThanOrEqual(COMEBACK.least * 1000);
      }
      // and every such haunt of the map may be the one: none is left out
      const all = HAUNTS.filter((h) => h.place === place && h.id !== from.id && !swarmAt(WORD, h, at) && bugTurnStart(h, bugTurn(h, at) + 1) - at >= COMEBACK.least * 1000);
      expect(ids.every((id) => all.some((h) => h.id === id))).toBe(true);
    }
  });

  it("is there from that moment and not before, until that haunt's turn ends: seen by everybody, caught by one", () => {
    const from = withOne("farm", NOON), back = comeback(WORD, from, NOON, DRY, [], [0.37, 0.5, 0])!;
    const h = HAUNTS[back.haunt];
    expect(back.from).toBe(NOON + COMEBACK.after * 1000);
    expect(back.turn).toBe(bugTurn(h, back.from));
    expect(hereAt(WORD, h, back.from - 1, DRY, [back])).toBeNull();
    const there = hereAt(WORD, h, back.from, DRY, [back])!;
    expect(there).toEqual({ turn: back.turn, bug: back.bug, n: back.n, seed: h.id * 100003 + back.turn, back: true });
    expect(hereAt(WORD, h, bugTurnStart(h, back.turn + 1) - 1, DRY, [back])?.bug).toBe(back.bug);
    // (the next turn the haunt rolls for itself again: what came back is not there any more)
    expect(hereAt(WORD, h, bugTurnStart(h, back.turn + 1), DRY, [back])?.back).toBeUndefined();
    expect(hereAt(WORD, h, back.from, DRY, [])).toBeNull();
    // on everybody's map from then, and off it when somebody has caught it
    expect(swarms(WORD, back.from - 1, DRY, none, [back]).some((x) => x.id === h.id)).toBe(false);
    expect(swarms(WORD, back.from, DRY, none, [back]).find((x) => x.id === h.id)).toEqual({ id: h.id, bug: back.bug, turn: back.turn, seed: h.id * 100003 + back.turn });
    expect(swarms(WORD, back.from, DRY, (x, turn) => ({ n: x.id === h.id && turn === back.turn ? 1 : 0, mine: false }), [back]).some((x) => x.id === h.id)).toBe(false);
    // a haunt's own insect is its own, whatever is said to have come back there
    const own = swarmAt(WORD, from, NOON)!;
    expect(hereAt(WORD, from, NOON, DRY, [{ haunt: from.id, turn: own.turn, bug: "ladybird", n: 1, from: 0 }])).toEqual(own);
  });

  it("is an insect that may be at that haunt at that hour, by that haunt's own odds", () => {
    const from = withOne("forest", NIGHT), seen = new Map<number, Set<BugId>>();
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) {
      const b = comeback(WORD, from, NIGHT, DRY, [], [i / 40, j / 40, 0.99])!;
      (seen.get(b.haunt) ?? seen.set(b.haunt, new Set()).get(b.haunt)!).add(b.bug);
      const kind = HAUNTS[b.haunt].kind, bug = BUGS[b.bug];
      expect(bug.at, b.bug).toContain(kind);
      if (bug.places) expect(bug.places, b.bug).toContain("forest");
      // (a night's insect at night: none of the day's)
      if (bug.hours) expect(bug.hours.some(([a, z]) => { const hr = ((b.from + 7 * HOUR) % (24 * HOUR)) / HOUR; return hr >= a && hr < z; }), b.bug).toBe(true);
      expect(b.n).toBeGreaterThanOrEqual(bug.n[0]);
      expect(b.n).toBeLessThanOrEqual(bug.n[1]);
    }
    expect(seen.size).toBeGreaterThan(5);
    // numbers out of their range pick the first or the last, never nothing
    expect(comeback(WORD, from, NIGHT, DRY, [], [-1, -1, -1])).not.toBeNull();
    expect(comeback(WORD, from, NIGHT, DRY, [], [2, 2, 2])).not.toBeNull();
  });

  it("never comes back where one has come back already in that turn; and nowhere, when the map has no such haunt left", () => {
    const from = withOne("town", NOON), backs: Comeback[] = [];
    for (let i = 0; i < 60; i++) {
      const b = comeback(WORD, from, NOON, DRY, backs, [0, 0.5, 0]);
      if (!b) break;
      expect(backs.some((x) => x.haunt === b.haunt && x.turn === b.turn)).toBe(false);
      backs.push(b);
    }
    expect(backs.length).toBeGreaterThanOrEqual(3);
    expect(backs.length).toBeLessThan(HAUNTS.filter((h) => h.place === "town").length);
    expect(comeback(WORD, from, NOON, DRY, backs, [0.5, 0.5, 0.5])).toBeNull();
    expect(new Set(backs.map((b) => b.haunt)).size).toBe(backs.length);
  });
});
