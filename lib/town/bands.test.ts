import { describe, expect, it } from "vitest";
import { BANDS, bandAt, bandOf } from "./bands";

describe("the eight parts of the day", () => {
  it("names every hour by the owner's eight bands", () => {
    const at = (h: number) => bandAt(h * 60).th;
    expect([3, 4.99, 5, 6.99, 7, 10.99, 11, 12.99, 13, 15.99, 16, 18.99, 19, 22.99, 23, 0, 2.99].map(at)).toEqual([
      "ก่อนรุ่ง", "ก่อนรุ่ง", "เช้าตรู่", "เช้าตรู่", "สาย", "สาย", "เที่ยง", "เที่ยง", "บ่าย", "บ่าย",
      "เย็น", "เย็น", "ค่ำ", "ค่ำ", "ดึก", "ดึก", "ดึก",
    ]);
  });

  it("covers the whole day once, with no gap and no overlap", () => {
    for (let m = 0; m < 1440; m++) {
      const h = m / 60, holding = BANDS.filter((b) => (h >= b.from && h < b.to) || (h + 24 >= b.from && h + 24 < b.to));
      expect(holding).toHaveLength(1);
    }
    expect(BANDS.reduce((sum, b) => sum + b.to - b.from, 0)).toBe(24);
  });

  it("reads the hour in Thai time, whatever the browser's own zone", () => {
    // 20:30 UTC is 03:30 in Bangkok
    expect(bandOf(new Date(Date.UTC(2026, 9, 15, 20, 30))).id).toBe("beforeDawn");
    // 07:00 UTC is 14:00 in Bangkok
    expect(bandOf(new Date(Date.UTC(2026, 9, 15, 7, 0))).id).toBe("afternoon");
  });
});
