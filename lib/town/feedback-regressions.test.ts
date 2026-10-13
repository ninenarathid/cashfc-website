import { describe, it, expect } from "vitest";
import { newPurse, put, type Purse } from "./trade";
import { agree, dealChoices, hasAll, lay, newDeal, swap } from "./deal";
import { bowlsToday, dayOf, getUp, mayEat, mealOf, nextMealAt, sitDown } from "./stamina";
import { stretchOf, takeGift } from "./gifts";
import { landCatch } from "./fishing";
import { heldIn, pouchesOf } from "./pouches";
import { announcementText } from "./announcements";

const at = (time: string) => Date.parse(`${time}+07:00`);
describe("Cash Town feedback regressions", () => {
  it("offers two matching tools separately and transfers precisely the chosen metadata", () => {
    const owner: Purse = { ...newPurse(), bag: [{ item: "axe", n: 1, plus: 7, opts: ["axOne"] }, { item: "axe", n: 1, plus: 9, gems: ["fire"] }, null] };
    const choices = dealChoices(owner.bag); expect(choices).toHaveLength(2);
    let deal = lay(newDeal("a", "b", { a: "A", b: "B" }, 1), "a", owner, [choices[0]]);
    if (!deal.ok) throw Error(deal.why);
    const yesA = agree(deal.deal, "a"); if (!yesA.ok) throw Error(yesA.why);
    const yesB = agree(yesA.deal, "b"); if (!yesB.ok) throw Error(yesB.why);
    const exchanged = swap(yesB.deal, owner, newPurse()); if (!exchanged.ok) throw Error(exchanged.why);
    expect(exchanged.a.bag[1]).toEqual(owner.bag[1]);
    expect(exchanged.b.bag.find(Boolean)).toEqual(owner.bag[0]);
    expect(hasAll({ ...owner, bag: [owner.bag[1], owner.bag[0], null] }, [choices[0]])).toBe(false);
    expect(hasAll(owner, [choices[0], ["axe", 1, choices[0][2]]])).toBe(false);
  });
  it("allows a full late-night meal after dinner is used, preserves legacy counts and resets at dawn", () => {
    const dinner = at("2026-10-13T22:59:59"), night = at("2026-10-13T23:00:00"), dawn = at("2026-10-14T05:00:00");
    let p: Purse = { ...newPurse(), bag: put(newPurse().bag, "riceBox", 4), meals: { day: dayOf(dinner), eaten: [true, true, true], bowls: [3, 3, 3] } };
    expect(mayEat(p, dinner)).toBe(false); expect(mayEat(p, night)).toBe(true);
    expect(bowlsToday(p, night)).toEqual([3, 3, 3, 0]); expect(mealOf(night)).toBe(3);
    for (let i = 0; i < 3; i++) { const ate = sitDown(p, 0, true, night); if (!ate.ok) throw Error(ate.why); p = getUp(ate.purse, 0, night); }
    expect(bowlsToday(p, night)).toEqual([3, 3, 3, 3]); expect(mayEat(p, night)).toBe(false);
    expect(nextMealAt(dinner)).toBe(night); expect(nextMealAt(night)).toBe(dawn); expect(bowlsToday(p, dawn)).toEqual([0, 0, 0, 0]);
    expect(stretchOf({ n: 1, per: "meal" }, night)).not.toBe(stretchOf({ n: 1, per: "meal" }, dawn));
  });
  it("lands fish in the creel even with a full main bag and keeps the catch record", () => {
    const full = { ...newPurse(), bag: Array.from({ length: 10 }, () => ({ item: "log" as const, n: 99 })), gifts: { had: ["thingCreel"], charms: [] } };
    const caught = landCatch(full, "arowana", 77);
    expect(caught.kept).toBe(true); expect(caught.record).toBe(true);
    expect(caught.purse.bag).toEqual(full.bag); expect(heldIn(caught.purse, "arowana")).toBe(1);
    expect(pouchesOf(caught.purse)[0].slots).toHaveLength(5); expect(caught.purse.best.arowana).toBe(77);
  });
  it("lets an existing rank-one fisher claim the added creel without losing the earlier gift", () => {
    const old: Purse = { ...newPurse(), gifts: { had: ["charmFloat"], charms: ["charmFloat"] } };
    const claim = takeGift(old, { fishing: 50 }, "fishing", 1); if (!claim.ok) throw Error(claim.why);
    expect(claim.gift).toBe("thingCreel"); expect(claim.purse.gifts?.had).toEqual(["charmFloat", "thingCreel"]);
    expect(takeGift(claim.purse, { fishing: 50 }, "fishing", 1)).toEqual({ ok: false, why: "had" });
    expect(takeGift(old, { fishing: 49 }, "fishing", 1)).toEqual({ ok: false, why: "rank" });
  });
  it("uses the identical forge wording in the banner and chat", () => {
    expect(announcementText({ id: 1, at: 0, member: "a", name: "A", kind: "forge", subject: "axe", level: 9, portrait: { look: null, expression: "neutral" } }, false)).toContain("+9");
  });
});
