import { describe, expect, it } from "vitest";
import {
  forecast, gilInName, gilShort, rollsPerDay, sizeOf, spanDays, summarize,
  type AquaRaw, type CupboardPrize,
} from "@/lib/aqua";

/**
 * The sums on Aqua's page.
 *
 * Two of them matter more than the rest. The owed line is worked out
 * backwards from today rather than added up from the first payment, and a
 * walk back that forgets a handover draws a line that is wrong on every day
 * but the last while looking perfectly reasonable. And the forecast is what
 * she changes a chance by: if it counts popotos a prize is never drawn on,
 * every figure it gives is too big, and too big in the direction that makes
 * people nervous about spending.
 */

const at = (day: string, time = "12:00") => `${day}T${time}:00+07:00`;

const prize = (over: Partial<CupboardPrize> & { id: number }): CupboardPrize => ({
  name: `prize ${over.id}`, kind: "gil", gil: 100, chance: 10, active: true, stock: null,
  draw: "give", audience: "all", otherSide: "anyone", ...over,
});

function raw(over: Partial<AquaRaw> = {}): AquaRaw {
  return {
    days: ["2026-09-26", "2026-09-27", "2026-09-28"],
    recent: ["2026-09-26", "2026-09-27"],
    drops: [
      { amount: 100, prizeId: 1, prize: "100 gil", to: "a", at: at("2026-09-26") },
      { amount: 20_000, prizeId: 2, prize: "20,000 gil", to: "a", at: at("2026-09-27") },
      { amount: 500, prizeId: 3, prize: "500 gil", to: "b", at: at("2026-09-27", "23:59") },
      { amount: 50_000, prizeId: 4, prize: "50,000 gil", to: "b", at: at("2026-09-27", "08:00") },
      { amount: 1_000, prizeId: 5, prize: "1,000 gil", to: "c", at: at("2026-09-28") },
      // The day before the span: not on the chart, not in any total.
      { amount: 99_999, prizeId: 6, prize: "100,000 gil", to: "c", at: at("2026-09-25") },
    ],
    sends: { "2026-09-26": 10, "2026-09-27": 100, "2026-09-28": 0 },
    wallets: [
      { to: "a", balance: 300_000 },
      { to: "b", balance: 40_000 },
      { to: "c", balance: 0 },
    ],
    purse: { on: true, threshold: 250_000, at: null },
    master: { on: true, at: null },
    open: [
      { id: 7, winner: "b", prize: "เงินสะสม", prizeEn: "Saved gil", gil: 260_000,
        wonAt: at("2026-09-27"), claimedAt: at("2026-09-27") },
      { id: 3, winner: "a", prize: "Minion", prizeEn: null, gil: null,
        wonAt: at("2026-09-20"), claimedAt: at("2026-09-21") },
      { id: 9, winner: "c", prize: "Mount", prizeEn: null, gil: null,
        wonAt: at("2026-09-28"), claimedAt: null },
    ],
    handedOver: [{ gil: 250_000, at: at("2026-09-28", "09:00") }],
    names: { a: "Aqua", b: "Farcia", c: "Nine" },
    cupboard: [],
    ...over,
  };
}

const NOW = Date.parse(at("2026-09-28", "18:00"));

describe("sizeOf", () => {
  it("splits exactly on the two lines", () => {
    expect(sizeOf(9_999)).toBe("small");
    expect(sizeOf(10_000)).toBe("medium");
    expect(sizeOf(29_999)).toBe("medium");
    expect(sizeOf(30_000)).toBe("large");
  });
});

describe("gilShort", () => {
  it("says a tick in as few characters as it can", () => {
    expect(gilShort(500)).toBe("500");
    expect(gilShort(12_500)).toBe("12.5k");
    expect(gilShort(250_000)).toBe("250k");
    expect(gilShort(1_000_000)).toBe("1M");
    expect(gilShort(1_117_030)).toBe("1.1M");
  });
});

describe("gilInName", () => {
  // The big gil prizes are filed as items and handed over by hand, so the
  // database has no amount for them and the name is the only place it is.
  it("reads the figure off a gil prize filed as an item", () => {
    expect(gilInName("ลาภมันฝรั่ง 10,000,000 Gils")).toBe(10_000_000);
    expect(gilInName("250,000 gil")).toBe(250_000);
  });

  it("falls back to the English name, and prices nothing it cannot read", () => {
    expect(gilInName("ลาภมันฝรั่ง", "500,000 gil")).toBe(500_000);
    expect(gilInName("Wind-up Kupka", null)).toBeNull();
    expect(gilInName("Gilded Mikoshi")).toBeNull();
  });
});

describe("spanDays", () => {
  it("ends on today and runs forward, across a month end", () => {
    expect(spanDays("2026-10-01", 3)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });
});

describe("summarize", () => {
  const s = summarize(raw(), NOW);

  it("owes what is in the wallets plus the cash-outs not handed over", () => {
    expect(s.owed.inWallets).toBe(340_000);
    expect(s.owed.waitingGil).toBe(260_000);
    expect(s.owed.total).toBe(600_000);
    expect(s.owed.holders).toBe(2);
    expect(s.owed.ready).toBe(1);
    expect(s.owed.readyGil).toBe(300_000);
  });

  // Today ends on what is owed now. Each day before it undoes the day after:
  // take off what came in, and put back what was handed over.
  it("walks the owed line back from now, day by day", () => {
    const [d26, d27, d28] = s.days;
    expect(d28.owedEnd).toBe(600_000);
    expect(d27.owedEnd).toBe(600_000 - 1_000 + 250_000);
    expect(d26.owedEnd).toBe(849_000 - 70_500);
  });

  it("buckets each day's payments by size and leaves the day before out", () => {
    const d27 = s.days[1];
    expect(d27).toMatchObject({ small: 500, medium: 20_000, large: 50_000, total: 70_500, count: 3 });
    expect(s.paid).toBe(100 + 70_500 + 1_000);
    expect(s.payments).toBe(5);
  });

  it("averages over the days that have finished, not today", () => {
    expect(s.perDay).toBe((100 + 70_500) / 2);
    expect(s.today).toBe(1_000);
    expect(s.top).toEqual({ day: "2026-09-27", gil: 70_500 });
  });

  it("prices a popoto only on days somebody gave one", () => {
    expect(s.days[0].perSend).toBe(10);
    expect(s.days[2].perSend).toBeNull();
    expect(s.perSend).toBeCloseTo(71_600 / 110);
  });

  it("puts one person's waiting prizes together, the longest wait first", () => {
    expect(s.groups.map((g) => [g.who, g.items.length, g.gil, g.waited])).toEqual([
      ["Aqua", 1, 0, 7],
      ["Farcia", 1, 260_000, 1],
    ]);
  });

  // An item prize with a figure in its name is gil Aqua has to find, and the
  // total says so. One without a figure is counted and not priced.
  it("adds the gil prizes filed as items to what is owed", () => {
    const withBig = summarize(raw({
      open: [{ id: 11, winner: "a", prize: "ลาภมันฝรั่ง 1,000,000 Gils", prizeEn: null,
               gil: null, wonAt: at("2026-09-22"), claimedAt: at("2026-09-22") }],
    }), NOW);
    expect(withBig.owed.itemsGil).toBe(1_000_000);
    expect(withBig.owed.total).toBe(340_000 + 1_000_000);
    expect(s.owed.items).toBe(2);
    expect(s.owed.itemsUnpriced).toBe(2);
  });

  it("averages from the first day anything was paid", () => {
    const early = summarize(raw({
      days: ["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28"],
      drops: raw().drops.filter((d) => !d.at.startsWith("2026-09-25")),
    }), NOW);
    expect(early.perDay).toBe((100 + 70_500) / 2);
  });

  it("queues what has been asked for, the longest wait first", () => {
    expect(s.queue.map((q) => q.id)).toEqual([3, 7]);
    expect(s.queue[0]).toMatchObject({ who: "Aqua", winner: "a", waited: 7 });
    expect(s.unclaimed).toBe(1);
  });

  it("ranks who was paid most and what paid it", () => {
    expect(s.recipients[0]).toEqual({ name: "Farcia", gil: 50_500, count: 2 });
    expect(s.byPrize[0]).toMatchObject({ name: "50,000 gil", gil: 50_000, count: 1 });
  });

  it("lists the fullest wallets and marks the ones past the bar", () => {
    expect(s.purses).toEqual([
      { name: "Aqua", balance: 300_000, ready: true },
      { name: "Farcia", balance: 40_000, ready: false },
    ]);
  });

  it("costs the forecast's own week, not the chart's", () => {
    expect(s.recentPerDay).toBe((100 + 70_500) / 2);
  });

  it("never draws a debt below nought when the history is short", () => {
    const thin = summarize(raw({ wallets: [], open: [], handedOver: [] }), NOW);
    expect(thin.days.every((d) => d.owedEnd >= 0)).toBe(true);
  });
});

describe("rollsPerDay", () => {
  const days = ["2026-09-26", "2026-09-27"];
  const drop = (prizeId: number, day: string) => ({ prizeId, at: at(day) });

  // Two prizes on one line are drawn on the same popotos, so their payouts
  // pool: 60 wins at a combined 60% over two days is fifty popotos a day.
  it("pools the prizes on a line to measure how often it is drawn", () => {
    const cupboard = [prize({ id: 1, chance: 40 }), prize({ id: 2, chance: 20 })];
    const drops = [
      ...Array.from({ length: 40 }, () => drop(1, "2026-09-26")),
      ...Array.from({ length: 20 }, () => drop(2, "2026-09-27")),
    ];
    expect(rollsPerDay(cupboard, drops, days)).toEqual({ "give|all|anyone": 50 });
  });

  // A prize that insists on a proved FC member at the other end is drawn on
  // far fewer popotos, and borrowing the busier line's count would make it
  // look several times more expensive than it is.
  it("keeps lines with a different other end apart", () => {
    const cupboard = [
      prize({ id: 1, chance: 50 }),
      prize({ id: 2, chance: 50, otherSide: "fc_verified" }),
    ];
    const drops = [
      ...Array.from({ length: 100 }, () => drop(1, "2026-09-26")),
      ...Array.from({ length: 10 }, () => drop(2, "2026-09-26")),
    ];
    expect(rollsPerDay(cupboard, drops, days)).toEqual({
      "give|all|anyone": 100, "give|all|fc_verified": 10,
    });
  });

  it("ignores days outside the window and lines with nothing to go on", () => {
    const cupboard = [prize({ id: 1 }), prize({ id: 2, otherSide: "fc" })];
    expect(rollsPerDay(cupboard, [drop(1, "2026-09-20")], days)).toEqual({});
  });
});

describe("forecast", () => {
  const rolls = { "give|all|anyone": 1_000 };

  it("costs each gil prize at its chance on its own line", () => {
    const f = forecast([
      prize({ id: 1, gil: 100, chance: 40 }),
      prize({ id: 2, gil: 10_000, chance: 1 }),
    ], rolls, true);
    expect(f.prizes.map((p) => p.perDay)).toEqual([400, 10]);
    expect(f.gilPerDay).toBe(400 * 100 + 10 * 10_000);
    expect(f.chance).toBe(41);
  });

  it("counts nothing for a prize that cannot come up", () => {
    const f = forecast([
      prize({ id: 1, active: false }),
      prize({ id: 2, kind: "item", gil: null, stock: 0 }),
      prize({ id: 3 }),
    ], rolls, false);
    expect(f.prizes.map((p) => p.live)).toEqual([false, false, false]);
    expect(f.gilPerDay).toBe(0);
  });

  it("says when it has nothing to measure a prize by rather than guessing", () => {
    const f = forecast([prize({ id: 1, otherSide: "fc" })], rolls, true);
    expect(f.prizes[0].perDay).toBeNull();
    expect(f.unknown).toBe(1);
  });

  it("gives an item prize a rate but no gil", () => {
    const f = forecast([prize({ id: 1, kind: "item", gil: null, chance: 0.5, stock: 3 })], rolls, true);
    expect(f.prizes[0]).toMatchObject({ perDay: 5, gilPerDay: null, live: true });
  });
});
