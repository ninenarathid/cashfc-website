import { describe, expect, it } from "vitest";
import { ROASTING, doneFrom, fireAt, roastAt, roastOf, roasted, startRoast, turn, type Roast } from "./roasting";

/** Somebody who turns the stick as soon as the face to the fire is done, looking so often. */
function hand(spent: boolean, seed: number, every = 0.05, late = 0): { out: ReturnType<typeof roastOf>; secs: number; turns: number } {
  let r = startRoast(spent, seed), t = 0;
  while (!roasted(r) && t < ROASTING.longest + 1) {
    t += every;
    r = roastAt(r, t);
    if (!roasted(r) && r.faces[r.down] >= doneFrom(r) + late) r = turn(r);
  }
  return { out: roastOf(r), secs: r.t, turns: r.turns };
}

describe("roasting on a stick (the owner: \"เราต้องการให้ UI และ gameplay ของ mini game unique\")", () => {
  it("cooks the face turned to the fire, the two beside it a little, and the one turned away not at all", () => {
    const r = roastAt({ ...startRoast(false, 1), flares: [] }, 1);
    expect(r.faces[0]).toBeCloseTo(ROASTING.rate, 2);
    expect(r.faces[1]).toBeCloseTo(ROASTING.rate * ROASTING.side, 2);
    expect(r.faces[3]).toBeCloseTo(ROASTING.rate * ROASTING.side, 2);
    expect(r.faces[2]).toBe(0);
    const turned = roastAt(turn(r), 2);
    expect(turned.down).toBe(1);
    expect(turned.faces[1]).toBeCloseTo(ROASTING.rate * ROASTING.side + ROASTING.rate, 2);
    expect(turned.faces[3]).toBeCloseTo(ROASTING.rate * ROASTING.side, 2);
  });

  it("has a fire that flares now and then, with a crackle before: more often for tired hands", () => {
    const r = startRoast(false, 7), tired = startRoast(true, 7);
    expect(r.flares.length).toBeGreaterThan(5);
    expect(tired.flares.length).toBeGreaterThan(r.flares.length);
    const f = r.flares[0];
    expect(fireAt(r, f - 0.1)).toEqual({ by: 1, flaring: false, crackling: true });
    expect(fireAt(r, f + 0.1)).toEqual({ by: ROASTING.flare.by, flaring: true, crackling: false });
    expect(fireAt(r, f + ROASTING.flare.lasts + 0.05).flaring).toBe(false);
    for (let i = 1; i < r.flares.length; i++) expect(r.flares[i] - r.flares[i - 1]).toBeGreaterThanOrEqual(ROASTING.flare.every[0] - 0.01);
  });

  it("is over when every face is done, a face burnt being a miss; and in any case after a long while", () => {
    let r: Roast = { ...startRoast(false, 3), flares: [] };
    r = roastAt(r, 60);
    // (left alone, the first face burns black and the one turned away never cooks: it ends by the clock)
    expect(roasted(r)).toBe(true);
    expect(r.t).toBe(ROASTING.longest);
    expect(roastOf(r).misses).toBeGreaterThanOrEqual(1);
    expect(r.faces[2]).toBe(0);
    expect(turn(r)).toBe(r);
    expect(roastAt(r, 99)).toBe(r);
  });

  it("can be done well by a quick hand, takes seconds and not minutes, and punishes a slow one", () => {
    let clean = 0, burnt = 0, slow = 0, secs = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const quick = hand(false, seed);
      if (quick.out.misses === 0 && quick.out.hits === ROASTING.faces) clean++;
      burnt += quick.out.misses;
      secs += quick.secs;
      slow += hand(false, seed, 0.05, 0.3).out.misses;
      expect(quick.out.hits + quick.out.misses).toBe(ROASTING.faces);
    }
    // a hand that turns the moment a face is done comes off clean most of the time, though a flare can still catch a face beside the fire
    expect(clean).toBeGreaterThan(120);
    expect(secs / 200).toBeGreaterThan(3);
    expect(secs / 200).toBeLessThan(12);
    // one that lets each face go well past done burns far more
    expect(slow).toBeGreaterThan(burnt * 2 + 40);
  });

  it("is harder with no stamina: a face is done only a little short of burning", () => {
    expect(doneFrom(startRoast(true, 1))).toBeGreaterThan(doneFrom(startRoast(false, 1)));
    let fresh = 0, tired = 0;
    for (let seed = 1; seed <= 200; seed++) { fresh += hand(false, seed, 0.12).out.misses; tired += hand(true, seed, 0.12).out.misses; }
    expect(tired).toBeGreaterThan(fresh);
  });
});
