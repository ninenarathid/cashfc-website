import { describe, expect, it } from "vitest";
import { closeAfter, isOpen, LATE_MS, minBid, placeBid, ranked, stepOf, winners, type AuctionRound, type Bid } from "./auction";
import { TAILOR, cannotBuy, inSeason } from "./tailor";

const H = 3600_000;
const round: AuctionRound = { id: 1, design: "count", wearables: ["count", "counthat"], run: 1, copies: 3, start: 8000, stepPct: 5, stepMin: 500, opensAt: 0, closesAt: 10 * H, hardClose: 11 * H };
const me = (id: string, coins = 1e6, owns = false) => ({ id, name: id, coins, owns });

describe("the limited auction (the owner, 2026-10-25)", () => {
  it("steps by 5% in fifties, never under 500", () => {
    expect([stepOf(8000, 5, 500), stepOf(12000, 5, 500), stepOf(45000, 5, 500), stepOf(45100, 5, 500)]).toEqual([500, 600, 2250, 2300]);
  });

  it("takes the start while a copy is free, then the lowest held copy and a step; a raise of one's own only needs to be more", () => {
    let bids: Bid[] = [];
    const place = (who: string, amount: number, at: number) => { const p = placeBid(round, bids, me(who), amount, at); if (p.ok) bids = p.bids; return p; };
    expect(place("a", 7999, 1).ok).toBe(false);
    expect(place("a", 8000, 1)).toMatchObject({ ok: true, pay: 8000, out: [] });
    expect(place("b", 8000, 2).ok).toBe(true);
    expect(place("c", 9000, 3).ok).toBe(true);
    expect(minBid(round, bids, "d")).toBe(8500);
    expect(place("d", 8400, 4)).toMatchObject({ ok: false, why: "low" });
    // (a tie goes to whoever bid that much first: b is pushed out, not a)
    expect(place("d", 8500, 5)).toMatchObject({ ok: true, out: [{ member: "b", amount: 8000 }] });
    expect(ranked(bids).map((b) => b.member)).toEqual(["c", "d", "a"]);
    expect(minBid(round, bids, "a")).toBe(8001);
    expect(place("a", 10000, 6)).toMatchObject({ ok: true, pay: 2000, out: [] });
  });

  it("refuses a closed round, a design had, and a purse short of the difference", () => {
    expect(placeBid(round, [], me("a"), 9000, 10 * H)).toMatchObject({ ok: false, why: "closed" });
    expect(placeBid({ ...round, settledAt: 1 }, [], me("a"), 9000, 1)).toMatchObject({ ok: false, why: "closed" });
    expect(placeBid(round, [], me("a", 1e6, true), 9000, 1)).toMatchObject({ ok: false, why: "known" });
    expect(placeBid(round, [], me("a", 8999), 9000, 1)).toMatchObject({ ok: false, why: "coins" });
    expect(placeBid(round, [{ member: "a", name: "a", amount: 8000, at: 0 }], me("a", 1000), 9000, 1)).toMatchObject({ ok: true, pay: 1000 });
  });

  it("moves the close in the last five minutes, never past the hard close", () => {
    expect(closeAfter(round, 9 * H)).toBe(10 * H);
    expect(closeAfter(round, 10 * H - 60_000)).toBe(10 * H - 60_000 + LATE_MS);
    expect(closeAfter({ ...round, closesAt: 11 * H - 60_000 }, 11 * H - 30_000)).toBe(11 * H);
    expect(isOpen(round, 10 * H - 1)).toBe(true);
  });

  it("numbers the copies best first", () => {
    const bids: Bid[] = [{ member: "a", name: "a", amount: 9000, at: 2 }, { member: "b", name: "b", amount: 12000, at: 3 }, { member: "c", name: "c", amount: 9000, at: 1 }];
    expect(winners(round, bids).map((w) => [w.member, w.edition])).toEqual([["b", 1], ["c", 2], ["a", 3]]);
  });
});

describe("Granny Twilla's rails", () => {
  it("sells the four of the pumpkins' season from 1 October to 2 November only, Bangkok's days", () => {
    const at = (s: string) => Date.parse(s);
    expect(inSeason(TAILOR.skeleton, at("2026-10-01T00:30:00+07:00"))).toBe(true);
    expect(inSeason(TAILOR.skeleton, at("2026-09-30T23:59:00+07:00"))).toBe(false);
    expect(inSeason(TAILOR.ghostcap, at("2026-11-02T23:30:00+07:00"))).toBe(true);
    expect(inSeason(TAILOR.ghostcap, at("2026-11-03T00:10:00+07:00"))).toBe(false);
    expect(inSeason(TAILOR.knit, at("2026-06-01T12:00:00+07:00"))).toBe(true);
    expect(inSeason({ price: 1, season: [12, 20, 1, 5] }, at("2027-01-03T12:00:00+07:00"))).toBe(true);
  });

  it("says why not", () => {
    const now = Date.parse("2026-10-25T12:00:00+07:00");
    expect([cannotBuy("witch", 1e6, new Set(), now), cannotBuy("knit", 1199, new Set(), now), cannotBuy("knit", 1200, new Set(["knit"]), now), cannotBuy("knit", 1200, new Set(), now)])
      .toEqual(["none", "coins", "known", null]);
    expect(Object.keys(TAILOR)).toHaveLength(40);
    expect(Object.values(TAILOR).reduce((n, g) => n + g.price, 0)).toBe(63750);
  });
});
