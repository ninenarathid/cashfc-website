import { describe, expect, it } from "vitest";
import { ITEMS, type ItemId } from "./items";
import { NOTICES, capOf as noticeCap, dearOf } from "./notices";
import { capOf as stallCap } from "./shop";
import { GEMS } from "./tools";

describe("the most a gem may be asked for", () => {
  it("is a gem's own at a stall and on the board, and a fragment's a tenth of it", () => {
    for (const g of Object.values(GEMS)) {
      expect(noticeCap(g.gem)).toBe(100_000);
      expect(stallCap(g.gem)).toBe(100_000);
      expect(noticeCap(g.chip)).toBe(10_000);
      expect(stallCap(g.chip)).toBe(10_000);
    }
  });
  it("leaves every other thing's as it was: ten times what the relatives pay, five hundred for what they do not take", () => {
    const dear = new Set(Object.values(GEMS).flatMap((g) => [g.gem, g.chip]));
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      if (dear.has(id)) continue;
      expect(dearOf(id)).toBeNull();
      const want = ITEMS[id].pays > 0 ? ITEMS[id].pays * NOTICES.cap : NOTICES.capless;
      expect(noticeCap(id)).toBe(want);
      expect(stallCap(id)).toBe(want);
    }
  });
});
