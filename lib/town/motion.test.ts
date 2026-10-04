import { afterEach, describe, expect, it, vi } from "vitest";
import { keepMotion, keptMotion, movesOf } from "./motion";

describe("whether the town moves (the owner, 2026-10-04: \"ทำไมบาง browser ไม่เห็นฝน หรือ ลม ที่พัดมาใน cash town\")", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("moves for everybody until they say otherwise", () => {
    expect(movesOf(null)).toBe(true);
    expect(movesOf("on")).toBe(true);
  });

  it("stands still only for whoever turned it off", () => {
    expect(movesOf("off")).toBe(false);
    for (const odd of ["", " ", "OFF", "false", "0", "reduce", undefined, {}, [], 0, false, NaN]) expect(movesOf(odd), String(odd)).toBe(true);
  });

  it("keeps the choice on the device, and reads it back", () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) });
    expect(keptMotion()).toBe(true);
    keepMotion(false);
    expect([...kept]).toEqual([["cashTown:motion", "off"]]);
    expect(keptMotion()).toBe(false);
    keepMotion(true);
    expect(keptMotion()).toBe(true);
  });

  it("moves where nothing can be kept (a private window)", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("no"); }, setItem: () => { throw new Error("no"); } });
    expect(keptMotion()).toBe(true);
    expect(() => keepMotion(false)).not.toThrow();
  });
});
