import { describe, expect, it } from "vitest";
import { fireFromPurse, fireResetAt, fireSpent, fireTold, fireWhy, joinRow, newGreatFire, soundGreatFire } from "./great-fire";
import { dayOf } from "./stamina";
import { DAY } from "./trade";

const NOW = Date.parse("2026-10-10T09:00:00+07:00");
const A = { id: "a", name: "A" };
describe("daily great fire", () => {
  it.each(["taken", "stays", "down"] as const)("spends the member's right on %s without spending anyone else's", (out) => {
    const f = fireSpent(newGreatFire(), A, out, NOW);
    expect(fireWhy(f, A.id, NOW)).toBe("daily");
    for (let i = 0; i < 160; i++) expect(fireWhy(f, `other-${i}`, NOW)).toBeNull();
    expect(fireWhy(f, A.id, NOW + DAY)).toBeNull();
  });
  it("resets at 05:00 Bangkok, including the millisecond boundary", () => {
    const dawn = Date.parse("2026-10-11T05:00:00+07:00");
    const f = fireSpent(newGreatFire(), A, "stays", NOW);
    expect(fireResetAt(NOW)).toBe(dawn);
    expect(fireWhy(f, A.id, dawn - 1)).toBe("daily");
    expect(fireWhy(f, A.id, dawn)).toBeNull();
    expect(fireResetAt(dawn)).toBe(dawn + DAY);
  });
  it("allows another tool after a previous top, on the next game day", () => {
    const f = fireSpent(newGreatFire(), A, "taken", NOW);
    expect(joinRow(f, A, true, NOW)).toEqual({ ok: false, why: "daily" });
    expect(joinRow(f, A, true, NOW + DAY).ok).toBe(true);
    expect(joinRow(f, A, false, NOW + DAY)).toEqual({ ok: false, why: "level" });
  });
  it("reads the counter from the purse, shared across tools and devices", () => {
    const f = fireFromPurse({ forgeDay: dayOf(NOW) }, A.id);
    expect(fireWhy(f, A.id, NOW)).toBe("daily");
    expect(fireTold(f, A.id, NOW).daily).toEqual({ day: dayOf(NOW), used: true, resetAt: fireResetAt(NOW) });
    expect(fireTold(f, "b", NOW).daily?.used).toBe(false);
    expect(fireFromPurse({}, A.id)).toEqual(newGreatFire());
  });
  it("ignores the obsolete queue and rejects malformed counters", () => {
    expect(soundGreatFire({ due: NOW + 10 * DAY, row: [{ id: "a" }], topped: ["a", "a", 3], used: { a: dayOf(NOW), b: "today", c: 1.5, "": 2 } }))
      .toEqual({ ...newGreatFire(), topped: ["a"], used: { a: dayOf(NOW) } });
  });
});
