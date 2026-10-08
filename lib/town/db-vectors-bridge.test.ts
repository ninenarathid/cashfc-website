import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRIDGE, MARKS, counted, drop, give, laid, lay, lift, markLuck, markOf, nearTile, newWorks, pass, spanOf, spansOf, told, wants, workOf, type Carried, type Work, type WorksKept, type WorksTold } from "./bridge";
import type { ItemId } from "./items";
import { count, countsOf, newLine, type LineKept } from "./line-points";
import { dayOf, staminaOf } from "./stamina";
import { hold, letGo, newPurse, put, type Purse } from "./trade";

/**
 * The cases the database's rules of the bridge built by hand and of the village's works are held to (v160;
 * lib/town/db-vectors-line.test.ts is the same for the bucket line, and says how). Two kinds:
 *
 * - **rules**: each of `town.stone_lift`, `stone_pass`, `stone_lay`, `stone_drop`, `works_give`, `works_wants`,
 *   `stone_spans`, `stone_into`, `stone_near`, `stone_mark` (and the number a stone is tried by, from its lifter and
 *   the moment) and `work_counts_of` with its words, as the database takes them, and what the code answers;
 * - **stories**: four members at the bridge, one deed after another through the functions a member calls (a stone
 *   lifted, handed on, laid, let go of; a thing taken into the hand and put away), each with the moment it is done
 *   at, what it answers, the doer's stamina and what they are told of the works; and at the end what is kept: how
 *   many the bridge has, who was counted how many and when each first came, whose hands built each span, what was
 *   found in the stones, who still holds a stone, whose hands it came by and what it has in it, and where each stands
 *   on the helpers' line (some stories run past the helpers' day's bound). A stone's mark is drawn by its lifter and
 *   its moment, so the database, at the story's clock, draws the same.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-bridge.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Deed =
  | { fn: "lift" | "lay"; at: [number, number] | null }
  | { fn: "pass"; to: string | null }
  | { fn: "drop" | "read" | "put_away" }
  | { fn: "hold"; slot: number };
interface Step { by: string; now: number; deed: Deed; want: { ok?: boolean; why?: string; have?: number; spans?: number; span?: boolean; whole?: boolean; into?: number; find?: string | null }; stamina: number; told: WorksTold }
interface Story {
  need: number | null; have: number; stamina: Record<string, number>; steps: Step[];
  end: { bridge: WorksKept["works"][string]; carried: Record<string, Carried>; helpers: Record<string, Pick<LineKept, "points" | "today" | "day">> };
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
/** Somebody who is nobody of the town's, and a name that is no id. */
const NOBODY = "00000000-0000-0000-0000-0000000000ff";
const MIN = 60_000, HOUR = 60 * MIN;
const MORNING = Date.parse("2026-10-08T09:00:00+07:00");
const PILE = BRIDGE.pile, FOOT = BRIDGE.foot;
const about = (c: ReturnType<typeof chance>, t: { x: number; y: number }, far = 0): [number, number] => [t.x + c.int(-BRIDGE.near - far, BRIDGE.near + far), t.y + c.int(-BRIDGE.near - far, BRIDGE.near + far)];

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(160);
  const purse = (now: number): Purse => {
    let p: Purse = { ...newPurse(), coins: c.int(0, 50) };
    const thing = c.of<ItemId | null>(["rod", "bucket", "hoe", null, null, null, null]);
    if (thing) { p = { ...p, bag: put(p.bag, thing, 1) }; if (c.maybe(0.75)) p = { ...p, hand: thing }; }
    // (a hand that names a thing the bag no longer has is an empty hand)
    else if (c.maybe(0.1)) p = { ...p, hand: "rod" };
    if (c.maybe(0.5)) p = { ...p, bag: put(p.bag, "kangkong", c.int(1, 30)) };
    if (c.maybe(0.6)) p = { ...p, stamina: { day: dayOf(now) - (c.maybe(0.15) ? 1 : 0), left: c.of([0, 0, 1, 2, 40, 100]) } };
    return p;
  };
  const hands = () => { const n = c.of([1, 1, 2, 3, 5, 7, 8]); return [...WHO, "b1", "b2", "b3", "b4", "b5"].sort(() => c.next() - 0.5).slice(0, n); };
  // (what a stone has in it: nothing for most, a kind for some; and now and then a stone that says nothing of it, as one lifted before marks were would)
  const carried = (p = 0.7): Carried | null => (c.maybe(p) ? { work: "bridge", thing: c.maybe(0.95) ? "stone" : "wood", hands: hands(), ...(c.maybe(0.1) ? {} : { mark: c.maybe(0.3) ? c.of(MARKS) : null }) } : null);
  const work = (): Work | null => {
    if (c.maybe(0.06)) return null;
    const need = c.of<number | null>([600, 600, 600, 12, null]), have = need === null ? c.int(0, 5000) : c.of([0, 1, need - 1, need, need + 1, c.int(0, need)]);
    return { open: c.maybe(0.9), needs: c.maybe(0.05) ? {} : { stone: { need, have }, ...(c.maybe(0.2) ? { wood: { need: null, have: 3 } } : {}) } };
  };
  const tile = (near: { x: number; y: number }): [number, number] | null => (c.maybe(0.06) ? null : c.maybe(0.75) ? about(c, near) : c.maybe(0.5) ? about(c, near, 2) : about(c, near === PILE ? FOOT : PILE));
  for (let i = 0; i < 700; i++) {
    const now = MORNING + c.int(0, 600) * MIN, p = purse(now), has = carried(0.25), w = work(), at = tile(PILE), me = c.of(WHO);
    out.push({ fn: "lift", args: [p, has, w, at?.[0] ?? null, at?.[1] ?? null, me, now], want: lift(p, has, w, at, me, now) });
  }
  for (let i = 0; i < 500; i++) {
    const has = carried(0.85), to = c.maybe(0.3) && has ? c.of(has.hands) : c.of([...WHO, "b6"]), theirs = purse(MORNING), their = carried(0.2), w = work();
    out.push({ fn: "pass", args: [has, to, theirs, their, w], want: pass(has, to, theirs, their, w) });
  }
  for (let i = 0; i < 700; i++) {
    const now = MORNING + c.int(0, 600) * MIN, p = purse(now), has = carried(0.85), w = work(), at = tile(FOOT);
    out.push({ fn: "lay", args: [p, has, w, at?.[0] ?? null, at?.[1] ?? null, now], want: lay(p, has, w, at, now) });
  }
  for (let i = 0; i < 120; i++) { const has = carried(0.6), w = work(); out.push({ fn: "drop", args: [has, w], want: drop(has, w) }); }
  for (let i = 0; i < 500; i++) {
    const p = purse(MORNING), need = c.of<number | null>([40, 10, null]), have = need === null ? c.int(0, 900) : c.int(0, need);
    const w: Work | null = c.maybe(0.05) ? null : { open: c.maybe(0.9), needs: { kangkong: { need, have }, ...(c.maybe(0.3) ? { rod: { need: 1, have: 0 } } : {}) } };
    const thing = c.of(["kangkong", "kangkong", "kangkong", "rod", "salt"]), n = c.of([1, 1, 2, 3, 5, 10, 30, 0, -2]);
    out.push({ fn: "give", args: [p, w, thing, n], want: give(p, w, thing, n) });
  }
  for (let i = 0; i < 160; i++) { const w = work(), thing = c.of(["stone", "stone", "wood"]); out.push({ fn: "wants", args: [w, thing], want: wants(w, thing) }); }
  for (const need of [600, 12, 7, 1, null, 0]) for (const have of [0, 1, 2, 6, 7, 11, 12, 99, 100, 101, 199, 200, 599, 600, 601, 1200]) out.push({ fn: "spans", args: [have, need], want: spansOf(have, need) }, { fn: "into", args: [have, need], want: spanOf(have, need) });
  // (what a stone has in it by its number: about the bounds of each kind's share, and over the whole of it; and the number itself, from a lifter and a moment)
  const { one, kinds } = BRIDGE.marks, share = 1 / (one * kinds.length);
  for (let k = 0; k <= kinds.length + 1; k++) for (const by of [-1e-9, 0, 1e-9, share / 2]) out.push({ fn: "mark", args: [k * share + by], want: markOf(k * share + by) });
  for (let i = 0; i < 300; i++) { const luck = c.maybe(0.6) ? c.next() / one * 1.2 : c.next(); out.push({ fn: "mark", args: [luck], want: markOf(luck) }); }
  out.push({ fn: "mark", args: [null], want: null }, { fn: "mark", args: [0.999999], want: null });
  for (let i = 0; i < 200; i++) { const me = c.of(WHO), now = MORNING + c.int(0, 86_400_000); out.push({ fn: "luck", args: [me, now], want: markLuck(me, now) }); }
  for (const [which, t] of [["pile", PILE], ["foot", FOOT]] as const) {
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) out.push({ fn: "near", args: [t.x + dx, t.y + dy, which], want: nearTile([t.x + dx, t.y + dy], t) });
    out.push({ fn: "near", args: [null, t.y, which], want: false }, { fn: "near", args: [t.x, null, which], want: false }, { fn: "near", args: [null, null, which], want: false });
  }
  // (what counts on the helpers' line: a stone laid, for whoever laid it and for each it came by; no other deed of the bridge's)
  for (const what of ["stone_lay", "stone_hand", "stone_lift", "stone_pass", "stone_drop", "work_give"]) for (const doer of [WHO[1], WHO[2]]) {
    const done = { from: "deed" as const, what, thing: "stone", n: 1, doc: what === "stone_hand" ? { by: WHO[0], work: "bridge" } : { work: "bridge" } };
    out.push({ fn: "counts", args: [done, doer], want: countsOf(done, doer) });
  }
  return out;
}

/** A story: its seed, what the bridge needs and has as it begins, and how long it is. */
function story(seed: number, need: number | null, have: number, length: number, start: number[], secs = 40, people = WHO.length): Story {
  const c = chance(seed), steps: Step[] = [], WHO_ = WHO.slice(0, people);
  let now = MORNING + c.int(0, 120) * MIN, kept: WorksKept = newWorks();
  kept = { ...kept, works: { bridge: { ...kept.works.bridge, opened: now - HOUR, needs: { stone: { need, have } } } } };
  // (each has a rod in the first slot of the bag, to take into the hand; and so much stamina today)
  const stamina = Object.fromEntries(WHO.map((id) => [id, c.of(start)]));
  const purses: Record<string, Purse> = Object.fromEntries(WHO.map((id) => { const p = newPurse(); return [id, { ...p, bag: put(p.bag, "rod", 1), stamina: { day: dayOf(now), left: stamina[id] } }]; }));
  const lines: Record<string, LineKept> = {};
  const name = (id: string) => id;
  for (let i = 0; i < length; i++) {
    now += c.int(1, secs) * 1000 + c.int(1, 999);
    const by = c.of(WHO_), mine = kept.carried[by] ?? null, work = workOf(kept, mine?.work ?? BRIDGE.work), kind = c.next();
    let deed: Deed, want: Step["want"];
    if (kind < 0.04) { deed = { fn: "read" }; want = {}; }
    else if (kind < 0.09) {
      // a thing taken into the hand, or put away: empty hands are what a stone is lifted with and handed into
      if (purses[by].hand) { deed = { fn: "put_away" }; purses[by] = letGo(purses[by]); want = { ok: true }; }
      else { deed = { fn: "hold", slot: 0 }; const did = hold(purses[by], 0); if (did.ok) purses[by] = did.purse; want = { ok: did.ok }; }
    } else if (!mine && kind < 0.95) {
      const at = c.maybe(0.9) ? about(c, PILE) : c.maybe(0.5) ? about(c, FOOT) : null;
      deed = { fn: "lift", at };
      const did = lift(purses[by], mine, work, at, by, now);
      if (did.ok) { purses[by] = did.purse; kept = { ...kept, carried: { ...kept.carried, [by]: did.carried } }; want = { ok: true }; } else want = did;
    } else if (kind < 0.5) {
      // (mostly to somebody whose hands are empty, as a page offers; now and then to whoever, and to nobody at all)
      const others = WHO_.filter((id) => id !== by), free = others.filter((id) => !kept.carried[id] && !purses[id].hand);
      const to = c.maybe(0.9) ? c.of(free.length && c.maybe(0.7) ? free : others) : c.of([by, null, NOBODY]);
      deed = { fn: "pass", to };
      // (nobody, oneself and somebody who is not of the town: there is nobody there to take it)
      const did = !to || to === by || !WHO_.includes(to) ? { ok: false as const, why: "none" as const } : pass(mine, to, purses[to], kept.carried[to] ?? null, work);
      if (did.ok) { const carried = { ...kept.carried }; delete carried[by]; carried[to!] = did.carried; kept = { ...kept, carried }; want = { ok: true }; } else want = did;
    } else if (kind < 0.9) {
      const at = c.maybe(0.9) ? about(c, FOOT) : c.maybe(0.5) ? about(c, PILE) : null;
      deed = { fn: "lay", at };
      const did = lay(purses[by], mine, work, at, now);
      if (did.ok) {
        purses[by] = did.purse;
        const carried = { ...kept.carried };
        delete carried[by];
        kept = laid({ ...kept, carried }, mine!.work, mine!.thing, did.hands, did.into, did.find, now);
        // (a helpers' point to each of them, by the line's own rule and the day's bound)
        for (const h of did.hands) for (const k of countsOf({ from: "deed", what: h === by ? "stone_lay" : "stone_hand", thing: mine!.thing, n: 1, doc: {} }, h)) lines[h] = count(lines[h] ?? newLine(), k, dayOf(now));
        want = { ok: true, have: did.have, spans: did.spans, span: did.span, whole: did.whole, into: did.into, find: did.find };
      } else want = did;
    } else {
      deed = { fn: "drop" };
      const did = drop(mine, work);
      if (did.ok) { const carried = { ...kept.carried }; delete carried[by]; kept = { ...kept, carried }; }
      want = did;
    }
    steps.push({ by, now, deed, want, stamina: staminaOf(purses[by], now), told: told(kept, by, name) });
  }
  return { need, have, stamina, steps, end: { bridge: kept.works.bridge, carried: kept.carried, helpers: Object.fromEntries(Object.entries(lines).map(([id, l]) => [id, { points: l.points, today: l.today, day: l.day }])) } };
}

describe("the cases the database's rules of the bridge built by hand are held to", () => {
  it("are made the same every time", () => {
    const made = () => ({
      rules: rules(),
      stories: [
        ...Array.from({ length: 16 }, (_, i) => story(1600 + i, 600, [0, 0, 97, 195, 588][i % 5], 90, [100, 100, 3, 0])),
        // (a small bridge: its spans, and whole, within a story)
        ...Array.from({ length: 6 }, (_, i) => story(1700 + i, 12, i % 3, 110, [100, 2, 0])),
        // (a work that takes any amount is never whole)
        story(1800, null, 5, 60, [100]),
        // (a long day for two: past the helpers' day's bound)
        story(1900, 3000, 0, 4000, [100, 0], 10, 2),
      ],
    });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    // each rule comes out every way it can
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => { const w = v.want as { ok?: boolean; why?: string }; return w.ok ? "ok" : w.why; }));
    expect(whys("lift")).toEqual(new Set(["ok", "closed", "whole", "held", "hand", "far"]));
    expect(whys("pass")).toEqual(new Set(["ok", "closed", "none", "held", "hand"]));
    expect(whys("lay")).toEqual(new Set(["ok", "closed", "none", "whole", "far"]));
    expect(whys("drop")).toEqual(new Set(["ok", "closed", "none"]));
    expect(whys("give")).toEqual(new Set(["ok", "closed", "none", "short", "over"]));
    const laid = all.rules.filter((v) => v.fn === "lay" && (v.want as { ok: boolean }).ok).map((v) => v.want as { span: boolean; whole: boolean; purse: Purse });
    expect(laid.some((d) => d.span && !d.whole) && laid.some((d) => d.whole) && laid.some((d) => !d.span)).toBe(true);
    // lifted and laid with no stamina left, too
    for (const fn of ["lift", "lay"]) expect(all.rules.some((v) => v.fn === fn && (v.want as { ok: boolean }).ok && (v.args[0] as Purse).stamina.left === 0 && (v.args[0] as Purse).stamina.day === dayOf(v.args.at(-1) as number))).toBe(true);
    const passed = all.rules.filter((v) => v.fn === "pass" && (v.want as { ok: boolean }).ok).map((v) => [v.args[0] as Carried, v.want as { carried: Carried }] as const);
    expect(passed.some(([was, d]) => was.hands.length === BRIDGE.hands && d.carried.hands.length === BRIDGE.hands && d.carried.hands[0] !== was.hands[0])).toBe(true);
    expect(passed.some(([was, d]) => was.hands.includes(d.carried.hands.at(-1)!) && d.carried.hands.length === was.hands.length)).toBe(true);
    // what a stone has in it goes with it from hand to hand, and is found when it is laid; a stone lifted is marked now and then
    expect(passed.some(([was, d]) => !!was.mark && d.carried.mark === was.mark) && passed.some(([was, d]) => was.mark === null && d.carried.mark === null) && passed.some(([was, d]) => !("mark" in was) && !("mark" in d.carried))).toBe(true);
    const lifted = all.rules.filter((v) => v.fn === "lift" && (v.want as { ok: boolean }).ok).map((v) => (v.want as { carried: Carried }).carried.mark);
    expect(lifted.some((m) => m === null) && lifted.some((m) => !!m)).toBe(true);
    const found = all.rules.filter((v) => v.fn === "lay" && (v.want as { ok: boolean }).ok).map((v) => (v.want as { find: string | null }).find);
    expect(found.some((f) => f === null) && new Set(found.filter(Boolean)).size >= 3).toBe(true);
    expect(new Set(all.rules.filter((v) => v.fn === "mark").map((v) => v.want))).toEqual(new Set([null, ...MARKS]));
    expect(all.rules.filter((v) => v.fn === "into").some((v) => v.want === 0) && new Set(all.rules.filter((v) => v.fn === "into").map((v) => v.want)).size).toBe(BRIDGE.spans + 1);
    // the stories reach what they are for
    const steps = all.stories.flatMap((s) => s.steps), did = (fn: string, why?: string) => steps.filter((x) => x.deed.fn === fn && (why ? x.want.why === why : x.want.ok)).length;
    expect(did("lift")).toBeGreaterThan(400);
    expect(did("pass")).toBeGreaterThan(200);
    expect(did("lay")).toBeGreaterThan(300);
    expect(did("drop")).toBeGreaterThan(20);
    for (const [fn, why] of [["lift", "far"], ["lift", "hand"], ["lift", "whole"], ["pass", "none"], ["pass", "held"], ["pass", "hand"], ["lay", "far"], ["lay", "whole"], ["drop", "none"]]) expect([fn, why, did(fn, why) > 0]).toEqual([fn, why, true]);
    expect(steps.some((x) => x.want.span && !x.want.whole)).toBe(true);
    expect(all.stories.filter((s) => s.end.bridge.done !== null).length).toBeGreaterThanOrEqual(3);
    expect(all.stories.find((s) => s.need === null)!.end.bridge.done).toBe(null);
    // a stone that came by three hands and more; somebody left holding one at the end; stamina run out and work done all the same
    expect(all.stories.some((s) => Object.values(s.end.carried).some((k) => k.hands.length >= 3))).toBe(true);
    expect(steps.some((x) => x.deed.fn === "lay" && x.want.ok && x.stamina === 0)).toBe(true);
    // the long day passes the helpers' bound: points fall behind what the day was worth
    const long = all.stories.at(-1)!;
    expect(Object.values(long.end.helpers).some((l) => l.today > 200 && l.points < l.today)).toBe(true);
    // everybody the stone came by is counted it: what the hands were counted comes to more than what the bridge has
    const counted_ = (s: Story) => Object.values(s.end.bridge.hands).reduce((n, h) => n + (h.stone?.n ?? 0), 0);
    expect(all.stories.some((s) => counted_(s) > s.end.bridge.needs.stone.have - s.have)).toBe(true);
    // marked stones in the stories, by their lifters and moments alone: some lifted, some laid and set in the bridge (one by more than one pair of hands), one still carried at an end
    const finds = all.stories.flatMap((s) => s.end.bridge.finds ?? []);
    expect(finds.length).toBeGreaterThanOrEqual(5);
    expect(finds.some((f) => f.hands.length >= 2)).toBe(true);
    expect(steps.filter((x) => x.deed.fn === "lay" && x.want.ok && x.want.find).length).toBe(finds.length);
    expect(steps.some((x) => x.told.works.bridge.finds.length > 0 && !JSON.stringify(x.told.carried ?? {}).includes("mark"))).toBe(true);
    // each span's hands: more than one span built in a story, and more than one pair of hands in a span
    expect(all.stories.some((s) => Object.keys(s.end.bridge.built ?? {}).length >= 2)).toBe(true);
    expect(all.stories.some((s) => Object.values(s.end.bridge.built ?? {}).some((by) => Object.keys(by).length >= 3))).toBe(true);
    expect(all.stories.find((s) => s.need === null)!.end.bridge.built ?? {}).toEqual({});
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v160.json`, JSON.stringify(all)); }
  });
});
