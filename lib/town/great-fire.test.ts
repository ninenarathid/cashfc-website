import { describe, expect, it } from "vitest";
import { GREAT_FIRE, fireSpent, fireTold, fireWhy, halfFound, joinRow, leaveRow, litAt, newGreatFire, openTo, soundGreatFire, type GreatFire } from "./great-fire";

const HOUR = 3_600_000, DAY = 24 * HOUR;
const A = { id: "a", name: "Aqua" }, B = { id: "b", name: "Nine" }, C = { id: "c", name: "Cee" };
const lit = (at = 1000): GreatFire => {
  let f = newGreatFire();
  f = halfFound(f, "flint", A, at).fire;
  return halfFound(f, "tinder", B, at + 5).fire;
};
const join = (f: GreatFire, who: { id: string; name: string }, now: number) => { const did = joinRow(f, who, true, now); if (!did.ok) throw new Error(did.why); return did.fire; };

describe("the forge's great fire", () => {
  it("has its halves found by the first rock broken and the first tree felled once its time has come, and by no later one", () => {
    const f0 = { ...newGreatFire(), due: 5000 };
    expect(halfFound(f0, "flint", A, 4999)).toMatchObject({ found: false, lit: false });
    const one = halfFound(f0, "flint", A, 5000);
    expect(one).toMatchObject({ found: true, lit: false });
    expect(halfFound(one.fire, "flint", B, 5001).found).toBe(false);
    const two = halfFound(one.fire, "tinder", B, 6000);
    expect(two).toMatchObject({ found: true, lit: true });
    expect(litAt(two.fire)).toBe(6000);
    expect(two.fire.flint).toMatchObject({ id: "a", name: "Aqua" });
  });

  it("takes into the row only somebody who has not taken the top, has a tool one under it, and is not there already", () => {
    const f = newGreatFire();
    expect(joinRow(f, A, false, 1)).toEqual({ ok: false, why: "level" });
    const one = join(f, A, 1);
    expect(joinRow(one, A, true, 2)).toEqual({ ok: false, why: "twice" });
    expect(joinRow({ ...f, topped: ["a"] }, A, true, 2)).toEqual({ ok: false, why: "topped" });
    expect(leaveRow(one, "a")).toMatchObject({ ok: true, fire: { row: [] } });
    expect(leaveRow(one, "b")).toEqual({ ok: false, why: "none" });
  });

  it("is the row's first's alone for a while, then one more's with each such while: who is away is passed over and keeps the place", () => {
    let f = lit(1000);
    for (const [who, at] of [[A, 10], [B, 20], [C, 30]] as const) f = join(f, who, at);
    const from = litAt(f)!;
    expect(openTo(f, from)).toBe(1);
    expect(fireWhy(f, "a", from)).toBeNull();
    expect(fireWhy(f, "b", from)).toBe("turn");
    expect(fireWhy(f, "b", from + GREAT_FIRE.turn)).toBeNull();
    expect(fireWhy(f, "c", from + GREAT_FIRE.turn)).toBe("turn");
    expect(openTo(f, from + 30 * DAY)).toBe(3);
    expect(fireWhy(f, "zz", from)).toBe("row");
    expect(fireWhy({ ...f, topped: ["zz"] }, "zz", from)).toBe("topped");
    // (nobody is put out of the row by a turn that went by)
    expect(f.row.map((w) => w.id)).toEqual(["a", "b", "c"]);
  });

  it("is nobody's while it is not lit", () => {
    const f = join(halfFound(newGreatFire(), "flint", A, 5).fire, B, 6);
    expect(fireWhy(f, "b", 10 * DAY)).toBe("fire");
    expect(openTo(f, 10 * DAY)).toBe(0);
  });

  it("is spent by a try whatever comes of it; taken counts for good, failed goes to the row's end; the next comes after a while drawn by chance", () => {
    let f = lit(1000);
    for (const [who, at] of [[A, 10], [B, 20], [C, 30]] as const) f = join(f, who, at);
    const failed = fireSpent(f, A, "down", 9000, 0);
    expect(failed).toMatchObject({ flint: null, tinder: null, due: 9000 + GREAT_FIRE.wait.least, topped: [] });
    expect(failed.row.map((w) => w.id)).toEqual(["b", "c", "a"]);
    expect(fireSpent(f, A, "stays", 9000, 1).due).toBe(9000 + GREAT_FIRE.wait.most);
    const mid = fireSpent(f, A, "stays", 0, 0.5).due / DAY;
    expect(mid).toBeCloseTo(24, 5);
    const taken = fireSpent(f, B, "taken", 9000, 0.3);
    expect(taken.row.map((w) => w.id)).toEqual(["a", "c"]);
    expect(taken.topped).toEqual(["b"]);
    expect(joinRow(taken, B, true, 9001)).toEqual({ ok: false, why: "topped" });
    // (it does not pile up: found again only after its time, and then it is one fire)
    expect(halfFound(taken, "flint", C, taken.due - 1).found).toBe(false);
    expect(halfFound(taken, "flint", C, taken.due + 400 * DAY).found).toBe(true);
  });

  it("tells a page the halves, the row and the turns, and never when the next one comes", () => {
    const f = join(lit(1000), B, 50);
    const told = fireTold(f, "b", 2000);
    expect(told).toEqual({ flint: { name: "Aqua" }, tinder: { name: "Nine" }, lit: true, row: [{ id: "b", name: "Nine" }], open: 1, mine: 0, topped: false });
    expect(JSON.stringify(fireTold(fireSpent(f, B, "stays", 3000, 0.5), "b", 3001))).not.toMatch(/due|\d{9,}/);
  });

  it("makes what was kept sound", () => {
    const f = soundGreatFire({ due: "x", flint: { id: "a", name: 7, at: 5 }, tinder: { id: "", at: 5 }, row: [{ id: "a", name: "A", since: 1 }, { id: "a", name: "A", since: 2 }, { id: "t", name: "T", since: 3 }, null, 5], topped: ["t", "t", 4] });
    expect(f).toEqual({ due: 0, flint: { id: "a", name: "", at: 5 }, tinder: null, row: [{ id: "a", name: "A", since: 1 }], topped: ["t"] });
    expect(soundGreatFire(null)).toEqual(newGreatFire());
  });
});
