import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOX, nearBox, newBox, roomyBox, stow, unstow, type Box } from "./box";
import { newPurse, type Purse, type Stack } from "./trade";
import { STOREBOX } from "./world";

/**
 * The cases the database's rules of the storage box are held to (v134; lib/town/db-vectors-kind.test.ts is the same
 * for the jar at the well, and says how). Two kinds:
 *
 * - **rules**: each a function of the schema `town` with its arguments and what the code answers: who stands by the
 *   box, a box given the slots it lacks, and things put away and taken out, of every sort (what stacks, what does
 *   not, what holds something), from bags and boxes full, half full and empty, by slots and numbers that are and are
 *   not, from tiles by the box and away from it;
 * - **stories**: one member's bag and a run of deeds at the box, one after another, each with what the code answers
 *   and what the bag and the box hold after it: the dry run does the same through the functions a member calls. Now
 *   and then the bag is filled afresh (as if they had been out fishing), so that a box comes to be full.
 *
 *   TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors-box.test.ts
 */

interface Vector { fn: string; args: unknown[]; want: unknown }
type Step =
  | { deed: "put" | "take"; slot: number; n: number; at: [number, number]; want: { ok: boolean; why?: string; item?: string; n?: number }; bag: Purse["bag"]; things: Box["things"] }
  | { deed: "fill"; bag: Purse["bag"] };
interface Story { bag: Purse["bag"]; steps: Step[] }

function chance(seed: number) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const of = <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)];
  return { next, int, of, maybe: (p: number) => next() < p };
}

/** What may be in a slot: things that stack (some of them a full stack), things that do not, and things that hold something. */
const THINGS: Stack[] = [
  { item: "kangkong", n: 7 }, { item: "kangkong", n: 20 }, { item: "kangkong", n: 13 }, { item: "minnow", n: 1 }, { item: "minnow", n: 19 }, { item: "worm", n: 12 },
  { item: "cabbage", n: 10 }, { item: "cabbage", n: 4 }, { item: "koi", n: 1 }, { item: "rod", n: 1 }, { item: "hoe", n: 1 }, { item: "scrollFriedMinnow", n: 1 },
  { item: "bucket", n: 1, water: 1 }, { item: "bucket", n: 1 }, { item: "can", n: 1, water: 0 }, { item: "can", n: 1, water: 6 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } },
];
const BY: Array<[number, number]> = [[STOREBOX.x + 1, STOREBOX.y + 1], [STOREBOX.x - 1, STOREBOX.y], [STOREBOX.x + 2, STOREBOX.y - 2], [STOREBOX.x, STOREBOX.y + 2]];
const AWAY: Array<[number, number]> = [[STOREBOX.x, STOREBOX.y], [STOREBOX.x + 3, STOREBOX.y], [STOREBOX.x - 1, STOREBOX.y + 3], [0, 0], [157, 23]];
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function rules(): Vector[] {
  const out: Vector[] = [], c = chance(134);
  // who stands by the box: every tile about it, and some far off
  for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) out.push({ fn: "by_box", args: [STOREBOX.x + dx, STOREBOX.y + dy], want: nearBox([STOREBOX.x + dx, STOREBOX.y + dy]) });
  for (const at of AWAY) out.push({ fn: "by_box", args: at, want: nearBox(at) });
  // a box given the slots it lacks
  for (const len of [0, 3, BOX.slots, BOX.slots + 2, BOX.slots + 7]) for (const more of [0, 1, 5, -2]) {
    const box: Box = { more, things: Array.from({ length: len }, () => (c.maybe(0.5) ? { ...c.of(THINGS) } : null)) };
    out.push({ fn: "box_roomy", args: [box], want: roomyBox(box) });
  }
  const slots = (len: number, full: number) => Array.from({ length: len }, () => (c.maybe(full) ? { ...c.of(THINGS) } : null));
  for (let i = 0; i < 1400; i++) {
    const purse: Purse = { ...newPurse(), coins: c.int(0, 40), bag: slots(c.of([10, 10, 10, 15]), c.of([0.2, 0.6, 1])) };
    if (c.maybe(0.2)) purse.hand = purse.bag.find(Boolean)?.item ?? null;
    const box: Box = { more: c.of([0, 0, 0, 3]), things: slots(c.of([0, 4, BOX.slots, BOX.slots, BOX.slots, BOX.slots + 3]), c.of([0, 0.5, 0.9, 1])) };
    const put = c.maybe(0.5), from = put ? purse.bag : box.things;
    // (more often than not a number there are of what is in the slot; otherwise any, which is mostly none)
    const slot = c.of([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 12, 14, -1]), n = from[slot] && c.maybe(0.6) ? c.int(1, from[slot]!.n) : c.of([1, 1, 1, 2, 5, 7, 13, 19, 20, 0, -1, 1.5, 21]);
    const at = c.maybe(0.88) ? c.of(BY) : c.of(AWAY);
    const did = put ? { fn: "stow", did: stow(purse, box, slot, n, at) } : { fn: "unstow", did: unstow(purse, box, slot, n, at) };
    out.push({ fn: did.fn, args: plain([purse, box, slot, n, at[0], at[1]]), want: plain(did.did) });
  }
  return out;
}

function story(seed: number): Story {
  const c = chance(seed);
  const first = Array.from({ length: 10 }, () => (c.maybe(0.8) ? { ...c.of(THINGS) } : null));
  let purse: Purse = { ...newPurse(), bag: first }, box = newBox();
  const steps: Step[] = [];
  for (let i = 0; i < 70; i++) {
    if (i % 12 === 11) {
      purse = { ...purse, bag: Array.from({ length: 10 }, () => (c.maybe(0.9) ? { ...c.of(THINGS) } : null)) };
      steps.push({ deed: "fill", bag: plain(purse.bag) });
      continue;
    }
    const deed = c.maybe(0.6) ? "put" as const : "take" as const, from = deed === "put" ? purse.bag : box.things;
    // (mostly a slot with something in it and a number there are of it; sometimes not)
    const taken = from.flatMap((s, k) => (s ? [k] : []));
    const slot = taken.length && c.maybe(0.85) ? c.of(taken) : c.int(-1, 11);
    const have = from[slot]?.n ?? 1, n = c.maybe(0.8) ? c.int(1, have) : c.of([0, have + 1, 1]);
    const at = c.maybe(0.93) ? c.of(BY) : c.of(AWAY);
    const did = deed === "put" ? stow(purse, box, slot, n, at) : unstow(purse, box, slot, n, at);
    if (did.ok) { purse = did.purse; box = did.box; }
    steps.push({ deed, slot, n, at, want: did.ok ? { ok: true, item: did.item, n: did.n } : { ok: false, why: did.why }, bag: plain(purse.bag), things: plain(box.things) });
  }
  return { bag: plain(first), steps };
}

describe("the cases the database's rules of the storage box are held to", () => {
  it("are made the same every time: the box's rules, and stories of things put away and taken out", () => {
    const made = () => ({ rules: rules(), stories: Array.from({ length: 24 }, (_, i) => story(1340 + i)) });
    const all = made();
    expect(JSON.stringify(made())).toBe(JSON.stringify(all));
    expect(all.rules.length).toBeGreaterThan(1400);
    // each refusal there is, and each rule done
    const whys = (fn: string) => new Set(all.rules.filter((v) => v.fn === fn).map((v) => (v.want as { ok?: boolean; why?: string }).ok ? "ok" : (v.want as { why?: string }).why));
    expect(whys("stow")).toEqual(new Set(["ok", "none", "amount", "far", "packed"]));
    expect(whys("unstow")).toEqual(new Set(["ok", "none", "amount", "far", "full"]));
    const done = (fn: string) => all.rules.filter((v) => v.fn === fn && (v.want as { ok: boolean }).ok);
    expect(done("stow").length).toBeGreaterThan(150);
    expect(done("unstow").length).toBeGreaterThan(100);
    // a thing that holds something moved as it is; a part of a stack; a box that grew as it was put into
    const moved = (v: Vector) => (v.args[0] as Purse).bag[v.args[2] as number];
    expect(done("stow").some((v) => moved(v)?.of)).toBe(true);
    expect(done("stow").some((v) => (moved(v)?.water ?? 0) > 0)).toBe(true);
    expect(done("stow").some((v) => moved(v)!.n > (v.args[3] as number))).toBe(true);
    expect(done("stow").some((v) => (v.want as { box: Box }).box.things.length > (v.args[1] as Box).things.length)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "by_box").some((v) => v.want === true)).toBe(true);
    expect(all.rules.filter((v) => v.fn === "by_box").some((v) => v.want === false)).toBe(true);
    // the stories put away and take out, are refused now and then, and fill a box
    const steps = all.stories.flatMap((s) => s.steps).flatMap((s) => (s.deed === "fill" ? [] : [s]));
    expect(steps.filter((s) => s.want.ok && s.deed === "put").length).toBeGreaterThan(300);
    expect(steps.filter((s) => s.want.ok && s.deed === "take").length).toBeGreaterThan(200);
    expect(new Set(steps.filter((s) => !s.want.ok).map((s) => s.want.why))).toEqual(new Set(["none", "amount", "far", "packed", "full"]));
    expect(steps.some((s) => s.things.every(Boolean))).toBe(true);
    const dir = process.env.TOWN_VECTORS;
    if (dir) { mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/vectors-v134.json`, JSON.stringify(all)); }
  });
});
