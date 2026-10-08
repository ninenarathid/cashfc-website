import { describe, expect, it } from "vitest";
import { companyOf, type Beside } from "./company";

const at = (id: string, eating: boolean, seated = true, near = true, sat = 1): Beside => ({ id, eating, seated, near, sat });
/** A meal of mine watched moment by moment: the count at each, with who ate with me carried on. */
const watch = (moments: Array<{ mine?: boolean; others: Beside[] }>) => {
  let ate: ReadonlyMap<string, number> = new Map();
  return moments.map(({ mine = true, others }) => { const c = companyOf(others, ate, mine); ate = c.ate; return c.n; });
};

describe("who a meal is eaten with (the owner: \"เฉพาะคนที่กำลังกิน\"; a member: \"อยากให้ stack ยังอยู่ ถ้าคนที่กินเสร็จก่อนกินหมดแล้ว\")", () => {
  it("is whoever sits eating within reach", () => {
    expect(companyOf([at("a", true), at("b", true), at("c", true, true, false), at("d", true, false)], new Map(), true).n).toBe(2);
  });

  it("is nobody while I am not eating, however many eat about me", () => {
    expect(companyOf([at("a", true), at("b", true)], new Map([["a", 1]]), false)).toEqual({ n: 0, ate: new Map() });
  });

  it("keeps whoever was eating beside me once they are done, for as long as they stay seated there", () => {
    expect(watch([
      { others: [at("a", true), at("b", true)] },
      { others: [at("a", false), at("b", true)] },   // a has eaten up, and sits on
      { others: [at("a", false), at("b", false)] },  // b too
    ])).toEqual([2, 2, 2]);
  });

  it("loses whoever gets up or goes, and does not have them back for sitting down again with nothing to eat", () => {
    expect(watch([
      { others: [at("a", true)] },
      { others: [at("a", false)] },
      { others: [at("a", false, false)] },             // got up
      { others: [at("a", false, true, true, 2)] },     // sat down again, not eating: another sitting
      { others: [at("a", false, true, false, 2)] },    // (or sits out of reach)
    ])).toEqual([1, 1, 0, 0, 0]);
  });

  it("…even when no look saw them on their feet: it is another sitting", () => {
    expect(watch([
      { others: [at("a", true)] },
      { others: [at("a", false)] },
      { others: [at("a", false, true, true, 2)] },     // up and down again between two looks
    ])).toEqual([1, 1, 0]);
  });

  it("has them back if they sit down to another helping, and keeps them from that sitting on", () => {
    expect(watch([
      { others: [at("a", true)] },
      { others: [at("a", false, false)] },
      { others: [at("a", true, true, true, 2)] },
      { others: [at("a", false, true, true, 2)] },
    ])).toEqual([1, 0, 1, 1]);
  });

  it("never counts somebody who only sat by and did not eat while I did", () => {
    expect(watch([{ others: [at("a", false)] }, { others: [at("a", false), at("b", true)] }])).toEqual([0, 1]);
  });

  it("forgets everybody when my helping ends: the next begins with those eating then", () => {
    expect(watch([
      { others: [at("a", true)] },
      { others: [at("a", false)] },
      { mine: false, others: [at("a", false)] },   // my helping is over
      { others: [at("a", false)] },                // my next: a is done and only sits
      { others: [at("a", false), at("b", true)] },
    ])).toEqual([1, 1, 0, 0, 1]);
  });

  it("hands back a map of its own", () => {
    const ate = new Map([["a", 1]]), c = companyOf([at("a", false)], ate, true);
    expect(c.ate).not.toBe(ate);
    expect([...c.ate]).toEqual([["a", 1]]);
  });
});
