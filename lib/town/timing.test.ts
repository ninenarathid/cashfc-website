import { describe, expect, it } from "vitest";
import { COOKING, stirMods } from "./cooking";
import { FARMING, hitsFor } from "./farm";
import { seeded } from "./fishing";
import { TIMING, dropped, finished, markerAt, over, press, pressRow, rowDone, startRound, startRow, type Round, type TimingMods } from "./timing";

/** The first moment from `from` on at which the marker is over the stretch (or not), found by looking every millisecond. */
function when(r: Round, from: number, inside: boolean): number {
  for (let t = from; t < from + 20; t += 0.001) if (over(r, t) === inside) return t;
  throw new Error("never");
}
/**
 * A made-up hand at the game: it aims each press at the moment the marker is over the middle of the stretch, and is
 * off by so much (seconds, either way; the members' own presses on the game's first day were off by about 0.07).
 * Gives the share of so many rounds it finishes, and the misses of a round.
 */
function plays(unsure: number, mods: TimingMods, need: number, many = 300): { done: number; misses: number } {
  const rnd = seeded(91), off = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()) * unsure;
  let done = 0, misses = 0;
  for (let i = 0; i < many; i++) {
    let r = startRound(need, mods, 500 + i * 131), t = 0;
    for (let presses = 0; presses < 400 && !finished(r) && !dropped(r); presses++) {
      // the next moment the marker passes the middle of the stretch (nobody presses twice in a sixth of a second)
      let at = t + 0.16;
      while (Math.abs(markerAt(r, at) - (r.lo + r.width / 2)) > r.speed * 0.00051) at += 0.001;
      t = Math.max(t + 0.05, at + off());
      r = press(r, t);
    }
    if (finished(r)) done++;
    misses += r.misses;
  }
  return { done: done / many, misses: misses / many };
}
/** The share of so many plots it hoes. */
const hoes = (unsure: number, mods: TimingMods, many = 300) => plays(unsure, mods, 3, many).done;

describe("the game of timing", () => {
  it("runs the marker to one end of the bar and back to the other, evenly", () => {
    const r = startRound(3, {}, 1), sweep = 1 / r.speed;
    expect(markerAt(r, 0)).toBe(0);
    expect(markerAt(r, sweep / 2)).toBeCloseTo(0.5, 6);
    expect(markerAt(r, sweep)).toBeCloseTo(1, 6);
    expect(markerAt(r, sweep * 1.5)).toBeCloseTo(0.5, 6);
    expect(markerAt(r, sweep * 2)).toBeCloseTo(0, 6);
    for (let t = 0; t < 10; t += 0.013) { const m = markerAt(r, t); expect(m).toBeGreaterThanOrEqual(0); expect(m).toBeLessThanOrEqual(1); }
  });

  it("counts a press over the stretch as a hit: the stretch moves, the marker quickens and carries on from where it was", () => {
    const r = startRound(3, {}, 7), t = when(r, 0, true) + 0.01, hit = press(r, t);
    expect(hit.hits).toBe(1);
    expect(hit.misses).toBe(0);
    expect(hit.speed).toBeCloseTo(r.speed * TIMING.quicken, 9);
    // the stretch is somewhere else, still on the bar
    expect(Math.abs(hit.lo - r.lo)).toBeGreaterThanOrEqual(r.width - 1e-9);
    expect(hit.lo).toBeGreaterThanOrEqual(TIMING.edge - 1e-9);
    expect(hit.lo + hit.width).toBeLessThanOrEqual(1 - TIMING.edge + 1e-9);
    // no jump: just after the press the marker is where it was just before
    expect(markerAt(hit, t)).toBeCloseTo(markerAt(r, t), 9);
    expect(Math.abs(markerAt(hit, t + 0.01) - markerAt(r, t))).toBeLessThan(0.05);
    // what it was given is left alone
    expect(r.hits).toBe(0);
  });

  it("counts a press anywhere else as a miss, and the work goes on", () => {
    const r = startRound(2, {}, 7), miss = press(r, when(r, 0, false));
    expect(miss).toEqual({ ...r, misses: 1 });
    expect(finished(miss)).toBe(false);
  });

  it("is done after so many hits, and takes no more presses", () => {
    let r = startRound(3, {}, 11), t = 0;
    for (let n = 0; n < 3; n++) { t = when(r, t, true) + 0.005; r = press(r, t); }
    expect(finished(r)).toBe(true);
    expect(r.hits).toBe(3);
    expect(press(r, t + 1)).toBe(r);
    // never faster than the fastest, however many hits
    let long = startRound(40, {}, 3), at = 0;
    for (let n = 0; n < 40; n++) { at = when(long, at, true) + 0.002; long = press(long, at); }
    expect(long.speed).toBeLessThanOrEqual(TIMING.fastest + 1e-9);
    expect(finished(long)).toBe(true);
  });

  it("is easier with a better tool and much harder with no stamina left", () => {
    const plain = startRound(3, {}, 5), good = startRound(3, { tool: 2.2 }, 5), spent = startRound(3, { spent: true }, 5);
    expect(good.width).toBeGreaterThan(plain.width * 1.3);
    // (2026-10-04) a good third of the stretch is left, and the marker is over it for a quarter as long
    expect(spent.width).toBeLessThan(plain.width * 0.4);
    expect(spent.speed).toBeGreaterThan(plain.speed * 1.3);
    expect(plain.width / plain.speed).toBeGreaterThan(0.15);
    expect(spent.width / spent.speed).toBeLessThan(0.06);
    // hard, not impossible: the stretch is to be seen (a twentieth of the bar), and the marker is over it for more than two pictures of a phone's screen
    expect(spent.width).toBeGreaterThanOrEqual(0.05);
    expect(spent.width / spent.speed).toBeGreaterThan(0.04);
    // a good hoe helps tired hands as it helps any
    expect(startRound(3, { tool: 2.2, spent: true }, 5).width).toBeGreaterThan(spent.width * 1.3);
    // the same seed is the same round
    expect(startRound(3, {}, 5)).toEqual(plain);
    expect(startRound(3, {}, 6)).not.toEqual(plain);
  });

  it("with no stamina left, drops the work at the third miss, where the work asks for that (the hoe)", () => {
    const hoe = startRound(3, { spent: true, drops: true }, 9), miss = when(hoe, 0, false);
    expect(hoe.most).toBe(3);
    expect(TIMING.spent.misses).toBe(3);
    const twice = press(press(hoe, miss), miss);
    expect(dropped(twice)).toBe(false);
    const thrice = press(twice, miss);
    expect(thrice.misses).toBe(3);
    expect(dropped(thrice)).toBe(true);
    expect(finished(thrice)).toBe(false);
    // and takes no more presses: a hit no more than a miss
    expect(press(thrice, when(thrice, miss, true) + 0.003)).toBe(thrice);
    expect(press(thrice, miss)).toBe(thrice);
    // two misses and then the hits: done, and not dropped
    let r = twice, t = miss;
    for (let n = 0; n < 3; n++) { t = when(r, t, true) + 0.003; r = press(r, t); }
    expect(finished(r)).toBe(true);
    expect(dropped(r)).toBe(false);
    // with stamina the hoe is never dropped (a miss costs stamina there), nor is a pot's stirring with none (a miss costs a helping)
    for (const mods of [{ drops: true }, { spent: true }, {}]) {
      let other = startRound(3, mods, 9);
      const m = when(other, 0, false);
      expect(other.most).toBe(0);
      for (let n = 0; n < 12; n++) other = press(other, m);
      expect(other.misses).toBe(12);
      expect(dropped(other)).toBe(false);
    }
  });

  it("with no stamina left can still be done, by a very good hand (the owner: \"ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก\")", () => {
    const tired = { spent: true, drops: true };
    // fed, every hand hoes its plot: it only misses more
    for (const unsure of [0.07, 0.035, 0.02]) expect(hoes(unsure, { drops: true })).toBe(1);
    // with none: a hand as unsure as the members' were, now and then; a practised one, less than half the time; a very good one, mostly
    expect(hoes(0.07, tired)).toBeGreaterThan(0.02);
    expect(hoes(0.07, tired)).toBeLessThan(0.25);
    expect(hoes(0.035, tired)).toBeGreaterThan(0.25);
    expect(hoes(0.035, tired)).toBeLessThan(0.6);
    expect(hoes(0.02, tired)).toBeGreaterThan(0.75);
    // and a good hoe is worth having then
    expect(hoes(0.035, { ...tired, tool: 2.2 })).toBeGreaterThan(hoes(0.035, tired) + 0.15);
  });
});

describe("work that is kinder than the rest, and work that tired hands find hard (the owner, 2026-10-04)", () => {
  it("can have a wider stretch at any time, and its own numbers for no stamina", () => {
    const plain = startRound(5, {}, 5), kind = startRound(5, { wide: 2 }, 5), own = { zone: 0.75, speed: 1.15 };
    expect(kind.width).toBeCloseTo(plain.width * 2, 9);
    expect(kind.speed).toBe(plain.speed);
    const tired = startRound(5, { wide: 2, spent: true, tired: own }, 5), hoe = startRound(5, { spent: true }, 5);
    expect(tired.width).toBeCloseTo(plain.width * 2 * 0.75, 9);
    expect(tired.speed).toBeCloseTo(plain.speed * 1.15, 9);
    expect(tired.width / tired.speed).toBeGreaterThan((hoe.width / hoe.speed) * 4);
    // its own numbers are for no stamina only, and it is not dropped unless it asks to be
    expect(startRound(5, { wide: 2, tired: own }, 5)).toEqual(kind);
    expect(tired.most).toBe(0);
    // never more than half the bar, however wide and however good the tool
    expect(startRound(5, { wide: 2, tool: 4 }, 5).width).toBe(0.5);
  });

  it("stirs a pot kindly (\"ทำอาหารทำให้ง่ายกว่าปกติหน่อย … ไม่อยากให้ fail มาก\"): fed, hardly a miss; with no stamina, a miss or two, and never dropped", () => {
    const fed = stirMods([], false), none = stirMods([], true);
    expect(fed).toEqual({ tool: 1, spent: false, wide: COOKING.stirring.wide, tired: COOKING.stirring.spent });
    expect(startRound(7, none, 1).most).toBe(0);
    // a hand as unsure as the members' were, at a pot stirred seven times: with the hoe's stretch it missed three
    // stirs and more, and was left with half the pot
    expect(plays(0.07, {}, 7).misses).toBeGreaterThan(2.5);
    expect(plays(0.07, fed, 7).misses).toBeLessThan(0.8);
    // with no stamina it is harder, and nothing like the hoe's
    expect(plays(0.07, none, 7).misses).toBeGreaterThan(plays(0.07, fed, 7).misses + 0.5);
    expect(plays(0.07, none, 7).misses).toBeLessThan(2.6);
    expect(plays(0.07, { spent: true }, 7).misses).toBeGreaterThan(15);
    // a practised hand loses next to nothing either way; and an apron helps as it did
    expect(plays(0.035, none, 7).misses).toBeLessThan(0.4);
    expect(startRound(7, stirMods([{ item: "apron", n: 1 }], false), 1).width).toBeGreaterThan(startRound(7, fed, 1).width);
  });

  it("makes the farm's lighter work a short round with no stamina left (\"ออกแบบเพิ่มเลย\"): two hits, dropped at the third miss", () => {
    const need = hitsFor("water", true), tired = { spent: true, drops: true };
    expect(need).toBe(FARMING.tired);
    expect(startRound(need, tired, 3).most).toBe(TIMING.spent.misses);
    // lighter than the hoe's for every hand, and still for a very good one to do nearly always
    for (const unsure of [0.07, 0.035, 0.02]) expect(plays(unsure, tired, need).done).toBeGreaterThan(hoes(unsure, tired));
    expect(plays(0.07, tired, need).done).toBeGreaterThan(0.12);
    expect(plays(0.07, tired, need).done).toBeLessThan(0.45);
    expect(plays(0.035, tired, need).done).toBeGreaterThan(0.5);
    expect(plays(0.02, tired, need).done).toBeGreaterThan(0.88);
    // a better can widens the stretch for tired hands as a better hoe does
    expect(plays(0.07, { ...tired, tool: 2.2 }, need).done).toBeGreaterThan(plays(0.07, tired, need).done + 0.1);
  });
});

describe("a row's round (the enchanted hoe: the owner, 2026-10-07, a power that does many at once has a longer game, and a miss costs a part)", () => {
  it("has a swing to each beat: a hit is that plot done, a miss leaves it, and either way it goes on to the next", () => {
    let r = startRow(7, {}, 11);
    expect(r.need).toBe(7);
    expect(r.most).toBe(0);
    let t = 0;
    const went = [true, false, true, true, false, true, true];
    for (const hit of went) {
      const at = when(r, t, hit);
      const next = pressRow(r, at);
      expect(next.marks.length).toBe(r.marks.length + 1);
      expect(next.marks[next.marks.length - 1]).toBe(hit);
      // the stretch has moved on and the marker runs faster, whether it was hit or not
      expect(next.lo).not.toBe(r.lo);
      expect(next.speed).toBeGreaterThanOrEqual(r.speed);
      expect(rowDone(next)).toBe(next.marks.length === 7);
      r = next;
      t = at + 0.05;
    }
    expect(r.marks).toEqual(went);
    expect(r.hits).toBe(5);
    expect(r.misses).toBe(2);
    // (nothing more is taken once every beat has had its swing)
    expect(pressRow(r, t + 1)).toBe(r);
  });

  it("cannot be dropped, with no stamina either: tired hands leave plots undone, they do not lose the row", () => {
    let r = startRow(7, { spent: true, drops: true }, 3), t = 0;
    expect(r.most).toBe(0);
    expect(r.width).toBeLessThan(startRow(7, {}, 3).width * 0.5);
    for (let i = 0; i < 7; i++) { const at = when(r, t, false); r = pressRow(r, at); t = at + 0.02; expect(dropped(r)).toBe(false); }
    expect(rowDone(r)).toBe(true);
    expect(r.marks).toEqual([false, false, false, false, false, false, false]);
  });

  it("is harder at its end than at its beginning: the marker quickens with every beat, to the game's fastest", () => {
    let r = startRow(7, {}, 5), t = 0;
    const first = r.speed;
    for (let i = 0; i < 7; i++) { const at = when(r, t, true); r = pressRow(r, at); t = at + 0.02; }
    expect(r.speed).toBeGreaterThan(first * 1.5);
    expect(r.speed).toBeLessThanOrEqual(TIMING.fastest);
    // and a row is as wide and as fast at its first beat as a plot hoed by itself
    const one = startRound(3, { tool: 2 }, 5), row = startRow(7, { tool: 2 }, 5);
    expect(row.width).toBe(one.width);
    expect(row.speed).toBe(one.speed);
  });
});
