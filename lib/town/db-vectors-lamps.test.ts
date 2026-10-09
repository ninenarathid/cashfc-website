import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAMPS, LAMP_MAPS, byTile, fireOf, held, light, lighted, litOf, newLamps, nightEnds, nightOf, pass, postOf, postsOf, take, told, type Flame, type LampMap, type LampsKept, type LampsTold } from "./lamps";
import type { ItemId } from "./items";
import { count, countsOf, newLine, type LineKept } from "./line-points";
import { dayOf, staminaOf } from "./stamina";
import { hold, letGo, newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the lamp relay at dusk are held to (v163; lib/town/db-vectors-bridge.test.ts is
 * the same for the bridge, and says how). Two kinds:
 *
 * - **rules**: each of `town.lamp_night`, `lamp_by`, `flame_take`, `flame_pass`, `lamp_light` and `work_counts_of`
 *   with its words, as the database takes them, and what the code answers;
 * - **stories**: four members through a night (and one through the morning into the next), one deed after another
 *   through the functions a member calls (a flame taken, handed on, a post lit; a thing taken into the hand and put
 *   away; the lamps read), each with the moment it is done at, what it answers, the doer's stamina and what they are
 *   told of the lamps; and at the end what is kept: every post lit and whose hands its flame came by, who still bears
 *   a flame, the nights every lamp of a map was lit, and where each stands on the helpers' line. The database cannot
 *   know where anybody stands, so a story's member is by the fire at one moment and by a far post the next.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-lamps.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Deed =
  | { fn: "take"; map: string; at: [number, number] | null }
  | { fn: "pass"; to: string | null }
  | { fn: "light"; map: string; post: number; at: [number, number] | null }
  | { fn: "read" | "put_away" }
  | { fn: "hold"; slot: number };
interface Step { by: string; now: number; deed: Deed; want: { ok?: boolean; why?: string; until?: number; n?: number; of?: number; full?: boolean }; stamina: number; told: LampsTold }
interface Story {
  stamina: Record<string, number>; steps: Step[];
  end: { lit: LampsKept["lit"]; flames: Record<string, Flame>; full: LampsKept["full"]; helpers: Record<string, Pick<LineKept, "points" | "today" | "day">> };
}

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/** The dry run's own people (the fc-migration skill's harness: `U`), all of them of the town. */
const WHO = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
/** Somebody who is nobody of the town's. */
const NOBODY = "00000000-0000-0000-0000-0000000000ff";
const MIN = 60_000, HOUR = 60 * MIN;
const EVENING = Date.parse("2026-10-08T19:00:00+07:00"), NOON = Date.parse("2026-10-08T12:00:00+07:00");
const about = (c: ReturnType<typeof chance>, t: readonly [number, number], far = 0): [number, number] => [t[0] + c.int(-LAMPS.near - far, LAMPS.near + far), t[1] + c.int(-LAMPS.near - far, LAMPS.near + far)];

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(163);
  const purse = (now: number): Purse => {
    let p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    const thing = c.of<ItemId | null>(["rod", "bucket", "hoe", null, null, null, null, null]);
    if (thing) { p = { ...p, bag: put(p.bag, thing, 1) }; if (c.maybe(0.75)) p = { ...p, hand: thing }; }
    // (a hand that names a thing the bag no longer has is an empty hand)
    else if (c.maybe(0.1)) p = { ...p, hand: "rod" };
    if (c.maybe(0.7)) p = { ...p, stamina: { day: dayOf(now) - (c.maybe(0.15) ? 1 : 0), left: c.of([0, 0, 0, 1, 2, 40, 100]) } };
    return p;
  };
  const hands = () => { const n = c.of([1, 1, 2, 3, 5, 7, 8]); return [...WHO, "b1", "b2", "b3", "b4", "b5"].sort(() => c.next() - 0.5).slice(0, n); };
  // (a flame about its time: alive, just out, within the second of grace, within the hold's time of tired hands, long dead; and none)
  const flame = (now: number, p = 0.8): Flame | null => (c.maybe(p)
    ? { from: c.of(LAMP_MAPS), until: now + c.of([4999, 2500, 1, 0, -1, -999, -1000, -1001, -1500, -2199, -2200, -2201, -60_000]), hands: hands() } : null);
  // (by night mostly; by day now and then; and about the night's two ends)
  const moment = () => (c.maybe(0.12) ? NOON + c.int(0, 5 * 60) * MIN : c.maybe(0.08) ? c.of([Date.parse("2026-10-08T17:29:59.999+07:00"), Date.parse("2026-10-08T17:30:00+07:00"), Date.parse("2026-10-09T04:59:59.999+07:00"), Date.parse("2026-10-09T05:00:00+07:00")]) : EVENING + c.int(0, 9 * 60) * MIN + c.int(0, 59_999));
  const map = () => c.of(["farm", "farm", "farm", "forest", "forest", "town", ""]);
  for (const iso of ["2026-10-08T00:00:00", "2026-10-08T04:59:59.999", "2026-10-08T05:00:00", "2026-10-08T12:00:00", "2026-10-08T17:29:59.999", "2026-10-08T17:30:00", "2026-10-08T23:59:59.999", "2026-10-09T00:00:00", "2026-10-09T04:59:59.999", "2026-10-09T05:00:00", "2027-01-01T03:00:00", "2026-12-31T18:00:00"]) {
    const now = Date.parse(`${iso}+07:00`);
    out.push({ fn: "night", args: [now], want: nightOf(now) });
  }
  for (let i = 0; i < 60; i++) { const now = EVENING + c.int(-30 * 24 * 60, 30 * 24 * 60) * MIN + c.int(0, 59_999); out.push({ fn: "night", args: [now], want: nightOf(now) }); }
  for (let i = 0; i < 800; i++) {
    const now = moment(), p = purse(now), has = flame(now, 0.3), m = map(), fire = fireOf(m) ?? LAMPS.maps.farm.fire;
    const at = c.maybe(0.05) ? null : c.maybe(0.8) ? about(c, fire) : c.maybe(0.5) ? about(c, fire, 2) : about(c, LAMPS.maps[m === "farm" ? "forest" : "farm"].fire);
    const stone = c.maybe(0.08), lit = c.of([0, 0, 0, 3, 7, 11, 12, 27, 28, 29, 39, 40, 41]), me = c.of(WHO);
    out.push({ fn: "take", args: [p, has, stone, lit, m, at?.[0] ?? null, at?.[1] ?? null, me, now], want: take(p, has, stone, lit, m, at, me, now) });
  }
  for (let i = 0; i < 600; i++) {
    const now = moment(), has = flame(now, 0.9), to = c.maybe(0.3) && has ? c.of(has.hands) : c.of([...WHO, "b6"]), theirs = purse(now), their = flame(now, 0.2), stone = c.maybe(0.08);
    out.push({ fn: "pass", args: [has, to, theirs, their, stone, now], want: pass(has, to, theirs, their, stone, now) });
  }
  for (let i = 0; i < 900; i++) {
    const now = moment(), p = purse(now), has = flame(now, 0.9), m = map(), post = c.of([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12, 13, 19, 23, 24, 27, 28, 33, 39, 40, -1]);
    const tile = postOf(m, post) ?? LAMPS.maps.farm.posts[0];
    const at = c.maybe(0.05) ? null : c.maybe(0.8) ? about(c, tile) : about(c, tile, 2);
    // (the posts lit already: none, some, all but this one, this one among them)
    const all = [...Array(postsOf(m) || 12).keys()], lit = c.maybe(0.3) ? [] : c.maybe(0.3) ? all.filter((n) => n !== post) : all.filter(() => c.maybe(0.4));
    out.push({ fn: "light", args: [p, has, lit, m, post, at?.[0] ?? null, at?.[1] ?? null, now], want: light(p, has, lit, m, post, at, now) });
  }
  for (const m of [...LAMP_MAPS, "town"]) {
    for (const post of [null, 0, 5, 11, 12, 27, 28, 39, 40, -1]) {
      const tile = post === null ? fireOf(m) : postOf(m, post), mid = tile ?? LAMPS.maps.farm.fire;
      for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) out.push({ fn: "by", args: [m, post, mid[0] + dx, mid[1] + dy], want: byTile([mid[0] + dx, mid[1] + dy], tile) });
      out.push({ fn: "by", args: [m, post, null, mid[1]], want: false }, { fn: "by", args: [m, post, mid[0], null], want: false });
    }
  }
  // (what counts on the helpers' line: a post lit, for whoever lit it and for each the flame came by; no other deed of the lamps')
  for (const what of ["lamp_light", "lamp_hand", "flame_take", "flame_pass"]) for (const doer of [WHO[1], WHO[2]]) {
    const done = { from: "deed" as const, what, thing: "flame", n: 1, doc: what === "lamp_hand" ? { by: WHO[0], map: "farm", post: 3 } : { map: "farm" } };
    out.push({ fn: "counts", args: [done, doer], want: countsOf(done, doer) });
  }
  return out;
}

/** A story: its seed, when it begins, how long it is, what stamina each begins with, how many seconds at the most go by between two deeds, how many of the four take part, how readily a flame is lit with rather than handed on, and how often and how many minutes the clock leaps. */
function story(seed: number, begin: number, length: number, start: number[], secs = 2, people = WHO.length, eager = 0.5, leap: [p: number, from: number, to: number] = [0.03, 5, 40]): Story {
  const c = chance(seed), steps: Step[] = [], WHO_ = WHO.slice(0, people);
  let now = begin + c.int(0, 20) * MIN, kept: LampsKept = newLamps();
  // (each has a rod in the first slot of the bag, to take into the hand; and so much stamina today)
  const stamina = Object.fromEntries(WHO.map((id) => [id, c.of(start)]));
  const purses: Record<string, Purse> = Object.fromEntries(WHO.map((id) => { const p = newPurse(); return [id, { ...p, bag: put(p.bag, "rod", 1), stamina: { day: dayOf(now), left: stamina[id] } }]; }));
  const lines: Record<string, LineKept> = {};
  const name = (id: string) => id;
  for (let i = 0; i < length; i++) {
    // (a moment or a few seconds on, so that a flame is alive, just out or long out at the next deed; now and then a leap of minutes or hours)
    now += c.maybe(leap[0]) ? c.int(leap[1], leap[2]) * MIN : c.int(0, secs) * 1000 + c.int(1, 999);
    const by = c.of(WHO_), mine = kept.flames[by] ?? null, kind = c.next(), night = nightOf(now);
    let deed: Deed, want: Step["want"];
    if (kind < 0.04) { deed = { fn: "read" }; want = {}; }
    else if (kind < 0.08) {
      // a thing taken into the hand, or put away: empty hands are what a flame is taken with and handed into
      if (purses[by].hand) { deed = { fn: "put_away" }; purses[by] = letGo(purses[by]); want = { ok: true }; }
      else { deed = { fn: "hold", slot: 0 }; const did = hold(purses[by], 0); if (did.ok) purses[by] = did.purse; want = { ok: did.ok }; }
    } else if (!mine || now >= mine.until + 2500 || kind < 0.14) {
      const map = c.maybe(0.9) ? c.of(LAMP_MAPS) : c.of(["town", ""]), fire = fireOf(map) ?? LAMPS.maps.farm.fire;
      const at = c.maybe(0.9) ? about(c, fire) : c.maybe(0.5) ? about(c, fire, 3) : null;
      deed = { fn: "take", map, at };
      const did = take(purses[by], mine, false, litOf(kept, map, night).length, map, at, by, now);
      if (did.ok) { kept = held(kept, by, did.flame); want = { ok: true, until: did.flame.until }; } else want = did;
    } else if (kind < 0.14 + (1 - eager) * 0.8) {
      // (mostly to somebody whose hands are empty, as a page offers; now and then to whoever, and to nobody at all)
      const others = WHO_.filter((id) => id !== by), free = others.filter((id) => !(kept.flames[id] && now < kept.flames[id].until) && !purses[id].hand);
      const to = c.maybe(0.9) ? c.of(free.length && c.maybe(0.7) ? free : others.length ? others : [NOBODY]) : c.of([by, null, NOBODY]);
      deed = { fn: "pass", to };
      // (nobody, oneself and somebody who is not of the town: there is nobody there to take it)
      const did = !to || to === by || !WHO_.includes(to) ? { ok: false as const, why: "none" as const } : pass(mine, to, purses[to], kept.flames[to] ?? null, false, now);
      if (did.ok) { kept = held(kept, to!, did.flame, by); want = { ok: true, until: did.flame.until }; } else want = did;
    } else {
      // (mostly a post that is still dark, from a tile by it; now and then one that is lit, or from too far)
      const map: LampMap = c.maybe(0.8) ? mine.from : c.of(LAMP_MAPS), lit = litOf(kept, map, night), dark = [...Array(LAMPS.maps[map].posts.length).keys()].filter((n) => !lit.includes(n));
      const post = dark.length && c.maybe(0.9) ? c.of(dark) : c.int(-1, 40), tile = postOf(map, post) ?? LAMPS.maps[map].posts[0];
      const at = c.maybe(0.92) ? about(c, tile) : c.maybe(0.5) ? about(c, tile, 3) : null;
      deed = { fn: "light", map, post, at };
      const did = light(purses[by], mine, lit, map, post, at, now);
      if (did.ok) {
        purses[by] = did.purse;
        kept = lighted(kept, by, map, post, did.hands, did.full, now);
        // (three helpers' points to each of them, by the line's own rule and the day's bound)
        for (const h of did.hands) for (const k of countsOf({ from: "deed", what: h === by ? "lamp_light" : "lamp_hand", thing: "flame", n: 1, doc: {} }, h)) lines[h] = count(lines[h] ?? newLine(), k, dayOf(now));
        want = { ok: true, n: did.n, of: did.of, full: did.full };
      } else want = did;
    }
    steps.push({ by, now, deed, want, stamina: staminaOf(purses[by], now), told: told(kept, by, name, now) });
  }
  return { stamina, steps, end: { lit: kept.lit, flames: kept.flames, full: kept.full, helpers: Object.fromEntries(Object.entries(lines).map(([id, l]) => [id, { points: l.points, today: l.today, day: l.day }])) } };
}

describe("the cases the database's rules of the lamp relay are held to", () => {
  it("are made the same every time", () => {
    const made = () => ({
      rules: rules(),
      stories: [
        // (an evening of four: flames taken, handed on, posts lit, some too late)
        ...Array.from({ length: 16 }, (_, i) => story(1630 + i, EVENING + i * 20 * MIN, 200, [100, 100, 3, 0])),
        // (two who light eagerly: every lamp of a map, and a night counted whole)
        ...Array.from({ length: 4 }, (_, i) => story(1660 + i, EVENING + HOUR, 260, [100, 100], 2, 2, 0.9)),
        // (by day: nothing is given)
        story(1670, NOON, 40, [100]),
        // (through the night's end into the morning: what was lit is lit no more)
        story(1671, Date.parse("2026-10-09T04:30:00+07:00"), 160, [100, 0], 8),
        // (an evening and the next: the first night's lamps are not the second's, and both may be counted whole)
        story(1672, Date.parse("2026-10-08T23:30:00+07:00"), 900, [100, 100], 2, 2, 0.95, [0.012, 180, 600]),
      ],
    });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    // each rule comes out every way it can
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok?: boolean; why?: string }; return w.ok ? "ok" : w.why; }));
    expect(whys("take")).toEqual(new Set(["ok", "day", "far", "whole", "held", "hand", "stone"]));
    expect(whys("pass")).toEqual(new Set(["ok", "none", "out", "held", "hand", "stone"]));
    expect(whys("light")).toEqual(new Set(["ok", "day", "none", "out", "far", "lit"]));
    expect(new Set(all.rules.filter((v) => v.fn === "night").map((v) => v.want === null))).toEqual(new Set([true, false]));
    expect(new Set(all.rules.filter((v) => v.fn === "by").map((v) => v.want))).toEqual(new Set([true, false]));
    const lit = all.rules.filter((v) => v.fn === "light" && (v.want as { ok: boolean }).ok).map((v) => [v.args, v.want as { full: boolean; n: number; purse: Purse }] as const);
    expect(lit.some(([, d]) => d.full) && lit.some(([, d]) => !d.full && d.n === 1)).toBe(true);
    // lit with no stamina left, within the hold's time after the second of grace: tired hands alone
    const late = (args: readonly unknown[]) => (args[7] as number) - (args[1] as Flame).until;
    expect(lit.some(([args]) => late(args) > 1000 && late(args) <= 2200 && staminaOf(args[0] as Purse, args[7] as number) === 0)).toBe(true);
    expect(lit.every(([args]) => late(args) <= 1000 || staminaOf(args[0] as Purse, args[7] as number) === 0)).toBe(true);
    expect(lit.some(([args]) => late(args) > 0 && late(args) <= 1000 && staminaOf(args[0] as Purse, args[7] as number) > 0)).toBe(true);
    // handed on within the second of grace, and fresh again from that moment; the last eight hands kept, the taker's once
    const passed = all.rules.filter((v) => v.fn === "pass" && (v.want as { ok: boolean }).ok).map((v) => [v.args, (v.want as { flame: Flame }).flame] as const);
    expect(passed.some(([args]) => (args[5] as number) > (args[0] as Flame).until)).toBe(true);
    expect(passed.every(([args, f]) => f.until === (args[5] as number) + LAMPS.life * 1000 && f.hands.at(-1) === args[1])).toBe(true);
    expect(passed.some(([args, f]) => (args[0] as Flame).hands.length === LAMPS.hands && f.hands.length === LAMPS.hands && f.hands[0] !== (args[0] as Flame).hands[0])).toBe(true);
    expect(passed.some(([args, f]) => (args[0] as Flame).hands.includes(args[1] as string) && f.hands.length === (args[0] as Flame).hands.length)).toBe(true);
    // the stories reach what they are for
    const steps = all.stories.flatMap((s) => s.steps), did = (fn: string, why?: string) => steps.filter((x) => x.deed.fn === fn && (why ? x.want.why === why : x.want.ok)).length;
    expect(did("take")).toBeGreaterThan(300);
    expect(did("pass")).toBeGreaterThan(100);
    expect(did("light")).toBeGreaterThan(150);
    for (const [fn, why] of [["take", "day"], ["take", "far"], ["take", "held"], ["take", "hand"], ["take", "whole"], ["pass", "none"], ["pass", "out"], ["pass", "held"], ["pass", "hand"], ["light", "out"], ["light", "far"], ["light", "lit"]]) {
      expect([fn, why, did(fn, why) > 0]).toEqual([fn, why, true]);
    }
    // a map's last lamp, and a night counted whole; a flame that came by two hands and more lighting a post
    expect(steps.some((x) => x.deed.fn === "light" && x.want.full)).toBe(true);
    expect(all.stories.some((s) => s.end.full.length >= 1)).toBe(true);
    expect(all.stories.some((s) => s.end.lit.some((l) => l.hands.length >= 2))).toBe(true);
    expect(all.stories.some((s) => s.end.lit.some((l) => l.hands.length >= 3))).toBe(true);
    // a post lit with no stamina left; somebody still bearing a flame at an end
    expect(steps.some((x) => x.deed.fn === "light" && x.want.ok && x.stamina === 0)).toBe(true);
    expect(all.stories.some((s) => Object.keys(s.end.flames).length > 0)).toBe(true);
    // the story by day lights nothing; the one through the morning is told of no lamp after five
    expect(all.stories.find((s) => s.steps[0].now < EVENING - HOUR && s.steps.length === 40)!.end.lit).toEqual([]);
    const morning = all.stories.at(-2)!, night = nightOf(morning.steps[0].now)!;
    expect(morning.steps.some((x) => x.now < nightEnds(night) && x.told.maps.farm.lit.length + x.told.maps.forest.lit.length > 0)).toBe(true);
    expect(morning.steps.filter((x) => x.now >= nightEnds(night)).every((x) => x.told.night === null && x.told.maps.farm.lit.length === 0 && x.told.maps.forest.lit.length === 0)).toBe(true);
    // the long one runs into the next evening: posts lit on two nights
    expect(new Set(all.stories.at(-1)!.end.lit.map((l) => l.night)).size).toBeGreaterThanOrEqual(2);
    // everybody the flame came by is among the night's lighters, in what a page is told
    expect(steps.some((x) => x.told.maps.farm.lighters.length >= 3 || x.told.maps.forest.lighters.length >= 3)).toBe(true);
    // three points a post to each of them
    expect(all.stories.some((s) => Object.values(s.end.helpers).some((l) => l.points > 0 && l.points % 3 === 0))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v163.json`, JSON.stringify(all)); }
  });
});
