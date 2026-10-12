import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DbKeeper, type Ask } from "./keeper";
import { Trial } from "./trial";
import { newPurse } from "./trade";
import type { MarketQuote } from "./market";

const NOW = 1_800_000_000_000;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

function fixture() {
  const trial = new Trial("market-quote", { memoryOnly: true });
  const purse = newPurse({ profile: 30, gallery: 0 });
  purse.bag[0] = { item: "blueCorn", n: 7 };
  trial.fished(purse);
  const prices = trial.prices(), t = prices.things.blueCorn;
  const quote: MarketQuote = { item: "blueCorn", round: prices.round, f: t.f, base: t.base! };
  return { trial, quote };
}

describe("accepting the consignment offer shown on screen", () => {
  it.each([
    { item: "corn" }, { round: -1 }, { f: 999 }, { base: 8 },
  ])("refuses a changed offer without moving items or coins: %j", (changed) => {
    const { trial, quote } = fixture(), before = structuredClone(trial.purse());
    expect(trial.leave(0, 3, { ...quote, ...changed })).toEqual({ ok: false, why: "quote" });
    expect(trial.purse()).toEqual(before);
  });
  it("refuses a previously displayed round after the relatives arrive", () => {
    const { trial, quote } = fixture();
    trial.skipHours(12);
    expect(trial.leave(0, 7, quote)).toEqual({ ok: false, why: "quote" });
    expect(trial.purse().bag[0]).toEqual({ item: "blueCorn", n: 7 });
    expect(trial.purse().left).toEqual([]);
  });
  it("freezes the accepted factor and base, preserving them after the next price change", () => {
    const { trial, quote } = fixture();
    expect(trial.leave(0, 3, quote).ok).toBe(true);
    const lot = structuredClone(trial.purse().left[0]);
    expect(lot).toMatchObject({ item: quote.item, n: 3, pays: quote.base, round: quote.round });
    expect(lot.f ?? 100).toBe(quote.f);
    expect(trial.purse().bag[0]?.n).toBe(4);
    trial.skipHours(12);
    expect(trial.purse().left[0]).toEqual(lot);
  });
  it("retains the old deposit path when the server has not advertised quote support", () => {
    const { trial } = fixture();
    expect(trial.leave(0, 2).ok).toBe(true);
    expect(trial.purse().bag[0]?.n).toBe(5);
  });
  it("passes the displayed offer to the member RPC and keeps revised prices on refusal", async () => {
    const { trial, quote } = fixture(), purse = trial.purse();
    const sent: Array<[string, Record<string, unknown> | undefined]> = [];
    const ask: Ask = async (fn, args) => {
      if (fn === "town_is_open") return true;
      if (fn === "town_me") return { now: NOW, purse };
      if (fn === "town_leave_quote") {
        sent.push([fn, args]);
        return { ok: false, why: "quote", now: NOW, purse,
          prices: { ...trial.prices(), round: quote.round + 1 } };
      }
      if (fn === "town_leave") { sent.push([fn, args]); return { ok: false, why: "amount", now: NOW, purse }; }
      return null;
    };
    const keeper = new DbKeeper("market-quote", ask);
    for (let i = 0; i < 30; i++) await Promise.resolve();
    expect(await keeper.leave(0, 7, quote)).toMatchObject({ ok: false, why: "quote" });
    expect(sent[0]).toEqual(["town_leave_quote", { p_slot: 0, p_n: 7, p_item: quote.item,
      p_round: quote.round, p_f: quote.f, p_base: quote.base }]);
    expect(keeper.prices().round).toBe(quote.round + 1);
    expect(keeper.purse().bag[0]?.n).toBe(7);
    await keeper.leave(0, 0);
    expect(sent[1]).toEqual(["town_leave", { p_slot: 0, p_n: 0 }]);
    keeper.close();
  });
});
