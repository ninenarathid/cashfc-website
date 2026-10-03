import { describe, expect, it } from "vitest";
import { BUILDING, CHOICES, STAGES, countsOf, daysUntil, etaShort, etaText, moved, progressOf, stageText } from "./board";
import { SHOP } from "./world";

/** A moment in Bangkok (UTC+7). */
const bkk = (s: string) => new Date(`${s}+07:00`);

describe("the Popoto Board", () => {
  it("counts down by Bangkok calendar day, whatever the hour", () => {
    expect(daysUntil("2026-10-05", bkk("2026-10-02T00:30:00"))).toBe(3);
    expect(daysUntil("2026-10-05", bkk("2026-10-02T23:30:00"))).toBe(3);
    // 23:30 UTC on the 2nd is already the 3rd in Bangkok
    expect(daysUntil("2026-10-05", new Date("2026-10-02T23:30:00Z"))).toBe(2);
    expect(daysUntil("2026-10-05", bkk("2026-10-05T12:00:00"))).toBe(0);
    expect(daysUntil("2026-10-05", bkk("2026-10-07T12:00:00"))).toBe(-2);
  });

  it("says what the owner said on the day: three to four days for Popoto Shop", () => {
    expect(etaText(BUILDING, bkk("2026-10-02T20:00:00"), true)).toBe("อีกราว 3–4 วันกว่าจะเสร็จ");
    expect(etaText(BUILDING, bkk("2026-10-02T20:00:00"), false)).toBe("About 3–4 more days");
    expect(etaShort(BUILDING, bkk("2026-10-02T20:00:00"), true)).toBe("อีก 3–4 วัน");
    expect(etaShort(BUILDING, bkk("2026-10-09T20:00:00"), false)).toBe("nearly done");
  });

  it("never counts below today, and never goes stale or negative", () => {
    expect(etaText(BUILDING, bkk("2026-10-05T09:00:00"), true)).toBe("น่าจะเสร็จวันนี้หรือพรุ่งนี้");
    expect(etaText(BUILDING, bkk("2026-10-06T09:00:00"), true)).toBe("น่าจะเสร็จวันนี้");
    expect(etaText(BUILDING, bkk("2026-10-09T09:00:00"), true)).toBe("ใกล้เสร็จแล้ว อีกนิดเดียว");
    expect(etaText({ ...BUILDING, soonest: "2026-10-04", latest: "2026-10-04" }, bkk("2026-10-03T09:00:00"), false)).toBe("About 1 more day");
  });

  it("says which stage the shop is at, in words, and stays within its stages", () => {
    expect(stageText(2, true)).toBe("ขั้นที่ 2 จาก 3 · ขึ้นโครงและผนัง");
    expect(stageText(2, false)).toBe("Stage 2 of 3 · Frame and walls");
    expect(stageText(0, false)).toBe("Stage 1 of 3 · Foundation");
    expect(stageText(9, true)).toBe("ขั้นที่ 3 จาก 3 · มุงหลังคาและตกแต่ง");
    // the shop's own stage is one of them
    expect(SHOP.stage).toBeGreaterThanOrEqual(1);
    expect(SHOP.stage).toBeLessThanOrEqual(STAGES.length);
  });

  it("fills its bar as the days go, never empty and never full", () => {
    const days = ["2026-10-01T12:00:00", "2026-10-02T06:00:00", "2026-10-02T20:00:00", "2026-10-04T12:00:00", "2026-10-06T12:00:00", "2026-10-20T12:00:00"]
      .map((s) => progressOf(BUILDING, bkk(s)));
    expect(days[0]).toBe(0.08);
    for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    expect(days[2]).toBeGreaterThan(0.15);
    expect(days[2]).toBeLessThan(0.35);
    expect(days[5]).toBe(0.92);
  });

  it("has the three choices v103 opened the poll with", () => {
    expect(CHOICES.map((c) => c.n)).toEqual([1, 2, 3]);
  });

  it("fills in the choices nobody voted for, and ignores ones that don't exist", () => {
    expect(countsOf([{ choice: 3, votes: 2 }])).toEqual({ 1: 0, 2: 0, 3: 2 });
    expect(countsOf([{ choice: 7, votes: 9 }, { choice: 1, votes: -4 }])).toEqual({ 1: 0, 2: 0, 3: 0 });
  });

  it("moves my vote in the counts before the database answers", () => {
    const c = { 1: 2, 2: 0, 3: 1 };
    expect(moved(c, null, 2)).toEqual({ 1: 2, 2: 1, 3: 1 });
    expect(moved(c, 1, 3)).toEqual({ 1: 1, 2: 0, 3: 2 });
    expect(moved(c, 3, null)).toEqual({ 1: 2, 2: 0, 3: 0 });
    expect(moved(c, 2, null)).toEqual({ 1: 2, 2: 0, 3: 1 });
    expect(c).toEqual({ 1: 2, 2: 0, 3: 1 });
  });
});
