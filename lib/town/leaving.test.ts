import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEFT_MS, Leaving } from "./leaving";
import type { WorkPlay } from "./plays";

const play = (board: string): WorkPlay => ({ game: "farming", board, how: "left", at: 0, won: false, secs: 0, spent: true, buff: null, what: "water", need: 0, hits: 0, misses: 0 });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("a board that was shut", () => {
  it("is told of as left a moment later", () => {
    const told: string[] = [], l = new Leaving((p) => told.push(p.board ?? ""));
    l.left({}, play("pouring"));
    vi.advanceTimersByTime(LEFT_MS - 1);
    expect(told).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(told).toEqual(["pouring"]);
    // (and once only, with no timer left behind)
    vi.advanceTimersByTime(5000);
    expect(told).toEqual(["pouring"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is not told of at all when its own end comes in that moment, however long what follows the end takes", () => {
    const told: string[] = [], l = new Leaving((p) => told.push(p.board ?? ""));
    const go = {};
    l.left(go, play("stirring"));
    // (the board's end comes 0.62 s after its last hit at the latest: the go is struck off then, before any deed is asked)
    vi.advanceTimersByTime(620);
    l.ended(go);
    vi.advanceTimersByTime(60_000);
    expect(told).toEqual([]);
    // an end with nothing waiting is nothing
    l.ended(go);
    l.ended({});
  });

  it("is its own go: the next go at the same board neither takes its place nor is struck off with it", () => {
    const told: string[] = [], l = new Leaving((p) => told.push(p.board ?? ""));
    const first = {}, second = {};
    l.left(first, play("choosing"));
    // the board opened again at once and played to its end
    vi.advanceTimersByTime(300);
    l.ended(second);
    vi.advanceTimersByTime(LEFT_MS);
    expect(told).toEqual(["choosing"]);
    // two shut one after another are both told of
    l.left(first, play("weeding"));
    l.left(second, play("timing"));
    vi.advanceTimersByTime(LEFT_MS);
    expect(told).toEqual(["choosing", "weeding", "timing"]);
    // and the same go shut twice is one go
    l.left(first, play("steady"));
    l.left(first, play("steady"));
    vi.advanceTimersByTime(LEFT_MS);
    expect(told).toEqual(["choosing", "weeding", "timing", "steady"]);
  });

  it("is its own go at a board opened twice: two shut one after the other in the same moment are two", () => {
    // (the moon flask's board: shut, opened again and shut again before the first was told of)
    const told: string[] = [], l = new Leaving((p) => told.push(p.board ?? ""));
    let go = {};
    l.left(go, play("pouring"));
    vi.advanceTimersByTime(200);
    go = {};
    l.left(go, play("pouring"));
    vi.advanceTimersByTime(LEFT_MS);
    expect(told).toEqual(["pouring", "pouring"]);
  });
});
