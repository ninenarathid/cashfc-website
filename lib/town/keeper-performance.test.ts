import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DbKeeper, type Ask } from "./keeper";
import { newPurse } from "./trade";

const NOW = 1_800_000_000_000;
const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); await vi.advanceTimersByTimeAsync(0); };
let keeper: DbKeeper;
let page: EventTarget & { visibilityState: string };
let calls: string[];
let water: string;
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("document", page);
  calls = []; water = "dew";
  const ask: Ask = async (fn) => {
    calls.push(fn);
    if (fn === "town_is_open") return true;
    if (fn === "town_me") return { now: Date.now(), purse: newPurse() };
    if (fn === "town_well_ranks") return { now: Date.now(), wellWater: { kind: water, by: "me", until: Date.now() + 60_000 } };
    return null;
  };
  keeper = new DbKeeper("me", ask); await settle();
  calls.length = 0;
});
afterEach(() => { keeper.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const count = (fn: string) => calls.filter((c) => c === fn).length;
const visibility = (state: string) => { page.visibilityState = state; page.dispatchEvent(new Event("visibilitychange")); };

describe("database reads while the town is busy", () => {
  it("reads water immediately, then once at the end of a burst using the latest state", async () => {
    keeper.nudged("farm"); await settle();
    expect(count("town_well_ranks")).toBe(1);
    for (let i = 0; i < 100; i++) { keeper.nudged("farm"); await settle(); }
    expect(count("town_well_ranks")).toBe(1);
    water = "rain";
    await vi.advanceTimersByTimeAsync(20_000); await settle();
    expect(count("town_well_ranks")).toBe(2);
    expect(keeper.wellWater()?.kind).toBe("rain");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(count("town_well_ranks")).toBe(2);
  });
  it("does not read water or periodic books while hidden, then catches up once", async () => {
    visibility("hidden");
    for (let i = 0; i < 100; i++) keeper.nudged("farm");
    await vi.advanceTimersByTimeAsync(10 * 60_000); await settle();
    expect(count("town_well_ranks")).toBe(0);
    expect(count("town_work")).toBe(0);
    visibility("visible"); await settle();
    expect(count("town_well_ranks")).toBe(1);
    expect(count("town_work")).toBe(1);
    visibility("visible"); await settle();
    expect(count("town_well_ranks")).toBe(1);
  });
  it("keeps a hidden trailing update for the next visible page", async () => {
    keeper.nudged("farm"); await settle();
    keeper.nudged("farm"); visibility("hidden");
    await vi.advanceTimersByTimeAsync(20_000); await settle();
    expect(count("town_well_ranks")).toBe(1);
    visibility("visible"); await settle();
    expect(count("town_well_ranks")).toBe(2);
  });
  it("cancels the trailing water refresh and periodic books when closed", async () => {
    keeper.nudged("farm"); await settle(); keeper.nudged("farm"); keeper.close();
    await vi.advanceTimersByTimeAsync(10 * 60_000); visibility("visible"); await settle();
    expect(count("town_well_ranks")).toBe(1);
    expect(count("town_work")).toBe(0);
  });
});
