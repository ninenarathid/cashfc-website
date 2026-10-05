import { describe, expect, it } from "vitest";
import { PACE, fpsOf, nap, paceOf, paced, wokenFor } from "./pace";

/**
 * A screen of `hz` asking for frames for `secs` seconds, each told at `tell(time)`: which of its frames the town
 * draws (their numbers), held to `fps`.
 */
function run(hz: number, fps: number, secs = 20, tell: (t: number) => number = (t) => t): number[] {
  const drawn: number[] = [];
  let next = 0, last = 0;
  for (let i = 0; i < hz * secs; i++) {
    const now = tell(1000 + (i * 1000) / hz), after = paced(now, last, next, fps);
    if (after === null) continue;
    next = after; last = now;
    drawn.push(i);
  }
  return drawn;
}
/** Frames a second, over the run. */
const rate = (hz: number, fps: number, secs = 20, tell?: (t: number) => number) => run(hz, fps, secs, tell).length / secs;
/**
 * The steps between drawn frames, in the screen's own frames: which there are. (Not the first: the frame after a
 * long wait, as the first is, has the one after it due at once, which is tried by itself below.)
 */
const steps = (hz: number, fps: number, tell?: (t: number) => number) => {
  const d = run(hz, fps, 20, tell).slice(2);
  return [...new Set(d.slice(1).map((n, i) => n - d[i]))].sort((a, b) => a - b);
};

/** A time told a little wrong, the same way each run: up to `by` ms either side. */
function shaky(by: number): (t: number) => number {
  let a = 20261004;
  return (t) => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return t + ((((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1) * by;
  };
}

/** How many of the steps between drawn frames are of `n` of the screen's frames, as a share. */
const share = (hz: number, fps: number, n: number) => {
  const d = run(hz, fps, 60).slice(2), all = d.slice(1).map((v, i) => v - d[i]);
  return all.filter((s) => s === n).length / all.length;
};

describe("how often the map is drawn (the owner, 2026-10-04: \"ช่วยล็อคให้รันได้มากสุดแค่ 60 fps\")", () => {
  it("draws 60 a second at the most, and that is what everybody has until they choose", () => {
    expect(PACE.most).toBe(60);
    expect(PACE.choices).toContain(PACE.most);
    expect(Math.max(...PACE.choices)).toBe(PACE.most);
    expect(fpsOf(null)).toBe(60);
  });

  it("a screen of 60 a second draws every frame, as it did", () => {
    expect(steps(60, 60)).toEqual([1]);
    // a screen is never quite its number: neither way is a frame let go
    for (const hz of [59.94, 59.95, 60.004, 60.01, 60.02, 60.05]) expect(steps(hz, 60), `${hz}`).toEqual([1]);
    // nor in a browser that tells the time to the whole millisecond (16, 17, 17, 16 …), over a long while
    for (const tell of [Math.round, Math.floor, Math.ceil]) {
      expect(steps(60, 60, tell)).toEqual([1]);
      expect(run(60.02, 60, 300, tell).length).toBe(Math.floor(60.02 * 300));
    }
    // and a slower screen, or a machine that cannot keep up, draws every frame it has
    for (const hz of [24, 30, 48, 50]) expect(steps(hz, 60), `${hz}`).toEqual([1]);
  });

  it("a fast screen draws 60, however fast it is", () => {
    for (let hz = 61; hz <= 600; hz++) {
      const f = rate(hz, 60);
      expect(f, `${hz}`).toBeLessThanOrEqual(60.15);
      expect(f, `${hz}`).toBeGreaterThan(59.8);
    }
    // (a screen a hair over 60.06 has a frame let go now and then, and no more than that)
    expect(rate(60.2, 60, 120)).toBeLessThanOrEqual(60.1);
    expect(rate(60.2, 60, 120)).toBeGreaterThan(59.9);
    // told to the whole millisecond too
    for (const hz of [75, 90, 100, 120, 144, 165, 240, 360]) {
      for (const tell of [Math.round, Math.floor]) {
        const f = rate(hz, 60, 20, tell);
        expect(f, `${hz}`).toBeLessThanOrEqual(60.15);
        expect(f, `${hz}`).toBeGreaterThan(59.5);
      }
    }
    // what the count of each second reads, as the map counts it (frames since the last count, at the first frame a
    // second or more after it; not the first second, which has the frame after a long wait in it): 60 every second
    // on a screen 60 divides; on one it does not, a second has a frame more or fewer in it now and then
    for (const hz of [75, 90, 100, 120, 144, 165, 180, 240, 360]) {
      const d = run(hz, 60, 60), read: number[] = [];
      let since = 1000, n = 0;
      for (const i of d) {
        const now = 1000 + (i * 1000) / hz;
        n++;
        if (now - since >= 1000) { read.push(Math.round((n * 1000) / (now - since))); n = 0; since = now; }
      }
      const seen = [...new Set(read.slice(1))].sort();
      if (hz % 60 === 0) expect(seen, `${hz}`).toEqual([60]);
      else { expect(seen, `${hz}`).toContain(60); expect(seen.every((f) => f >= 59 && f <= 61), `${hz}: ${seen}`).toBe(true); }
    }
  });

  it("…in steps as even as the screen's rate allows", () => {
    // 60 divides these: every second, third, fourth, sixth frame (one in some hundreds comes a frame sooner, which is
    // the pace counted a hair over 60 so that a 60.02 screen never has a frame let go: nothing ever waits longer)
    for (const [hz, n] of [[120, 2], [180, 3], [240, 4], [360, 6]] as const) {
      expect(steps(hz, 60).filter((s) => s !== n && s !== n - 1), `${hz}`).toEqual([]);
      expect(share(hz, 60, n), `${hz}`).toBeGreaterThan(1 - n * PACE.over * 1.5);
    }
    // it does not divide these: the two steps either side, and never a longer wait
    expect(steps(75, 60)).toEqual([1, 2]);
    expect(steps(90, 60)).toEqual([1, 2]);
    expect(steps(100, 60)).toEqual([1, 2]);
    expect(steps(144, 60)).toEqual([2, 3]);
    expect(steps(165, 60)).toEqual([2, 3]);
    for (let hz = 61; hz <= 400; hz++) {
      const s = steps(hz, 60);
      expect(s.length, `${hz}`).toBeLessThanOrEqual(2);
      expect(s[s.length - 1] - s[0], `${hz}`).toBeLessThanOrEqual(1);
      expect(s[s.length - 1], `${hz}`).toBeLessThanOrEqual(Math.ceil(hz / 60));
    }
    // …and with the time told to the whole millisecond, or a little wrong: still never a longer wait than that
    for (const hz of [60, 75, 90, 100, 120, 144, 165, 180, 240]) {
      for (const fps of PACE.choices) {
        for (const tell of [Math.round, Math.floor, shaky(0.3), shaky(0.6)]) {
          const s = steps(hz, fps, tell), even = hz / fps;
          expect(s[s.length - 1], `${hz} at ${fps}`).toBeLessThanOrEqual(Math.ceil(even - 1e-9));
          expect(s[0], `${hz} at ${fps}`).toBeGreaterThanOrEqual(Math.max(1, Math.ceil(even - 1e-9) - 1));
        }
      }
    }
  });

  it("whoever asks for 30 has 30, on any screen", () => {
    for (const [hz, n] of [[60, 2], [120, 4], [240, 8]] as const) {
      expect(steps(hz, 30).filter((s) => s !== n && s !== n - 1), `${hz}`).toEqual([]);
      expect(share(hz, 30, n), `${hz}`).toBeGreaterThan(1 - n * PACE.over * 1.5);
    }
    for (const tell of [Math.round, Math.floor]) expect(steps(60, 30, tell).filter((s) => s !== 1 && s !== 2)).toEqual([]);
    expect(steps(60.02, 30)).toEqual([2]);
    for (let hz = 31; hz <= 400; hz++) {
      const f = rate(hz, 30);
      expect(f, `${hz}`).toBeLessThanOrEqual(30.1);
      expect(f, `${hz}`).toBeGreaterThan(29.85);
    }
    expect(steps(24, 30)).toEqual([1]);
  });

  it("a frame that comes late is drawn at once, and lost time is not made up", () => {
    expect(paced(1000, 0, 0, 60)).toBe(1000);
    // the next is due a frame's time on, and one that comes sooner is let go by
    const next = paced(1000, 1000, 1000, 60)!;
    expect(next).toBeCloseTo(1000 + 1000 / (60 * (1 + PACE.over)), 6);
    expect(paced(1008, 1000, next, 60)).toBeNull();
    expect(paced(1014, 1000, next, 60)).toBeNull();
    // (a hair early is the frame it was waiting for, a whole frame's time after the last…)
    expect(paced(1016, 1000, next, 60)).toBeCloseTo(next + 1000 / (60 * (1 + PACE.over)), 6);
    expect(paced(1017, 1000, next, 60)).toBeCloseTo(next + 1000 / (60 * (1 + PACE.over)), 6);
    // (…and not one that comes sooner after the last than that: it has to be fully due)
    expect(paced(1016, 1004, next, 60)).toBeNull();
    expect(paced(1017, 1004, next, 60)).toBeCloseTo(next + 1000 / (60 * (1 + PACE.over)), 6);
    // a tab left for ten minutes and come back to: one frame for it, not ten minutes' worth; the one after it may
    // come at once (a frame's time is the most that is ever made up), and from there on it is the pace again
    const back = paced(601_000, 1000, next, 60)!;
    expect(back).toBe(601_000);
    let n = 0, due = back, at = 601_000;
    for (let t = 601_001; t <= 601_100; t += 1) { const a = paced(t, at, due, 60); if (a !== null) { due = a; at = t; n++; } }
    expect(n).toBe(7);
    // a machine that takes 40 ms a frame draws every frame it has
    let slow = 0;
    due = 0; at = 0;
    for (let t = 1000; t < 2000; t += 40) { const a = paced(t, at, due, 60); if (a !== null) { due = a; at = t; slow++; } }
    expect(slow).toBe(25);
  });

  it("what was kept on the device is read as a choice, and anything else is the most", () => {
    expect(fpsOf("30")).toBe(30);
    expect(fpsOf("60")).toBe(60);
    expect(fpsOf(30)).toBe(30);
    for (const odd of ["", " ", "144", "0", "-30", "abc", "30.5", "Infinity", undefined, null, {}, [], true, 1e9, NaN]) {
      expect(fpsOf(odd), String(odd)).toBe(PACE.most);
    }
  });
});

/**
 * A browser with a town at rest in it, for the sleeping between frames: a screen of `hz`, a page that asks for
 * frames as the map does while it rests (components/town/Town.tsx's `ask` and `frame`), held to `fps`, for `secs`
 * seconds. `how` is what the browser does with a frame asked for after a sleep: `handed` the screen's frame it is
 * in, at once, told as begun when that one began (what Chrome does when nothing else is being drawn); `next` the
 * screen's next. `late(n)` is how much later than asked the nth sleep ends. Says how many frames were asked for, how
 * many drawn, and the times between those drawn.
 */
function rest(hz: number, fps: number, secs: number, how: "handed" | "next" = "handed", late: (n: number) => number = () => 0) {
  const own = 1000 / hz, before = (t: number) => 1000 + Math.floor((t - 1000) / own + 1e-9) * own, after = (t: number) => before(t) + own;
  let due = 0, last = 0, napped = false, sleeps = 0, took = 0;
  const count = { asked: 0, drawn: 0, slept: 0, gaps: [] as number[] };
  // (the first frame is asked for as the page opens)
  let at = after(1000), stamp = at;
  while (at < 1000 + secs * 1000) {
    // the frame comes: `at` by the clock, told as `stamp`
    count.asked++;
    const next = napped ? wokenFor(stamp, due, fps) : paced(stamp, last, due, fps);
    napped = false;
    if (next !== null) {
      if (count.drawn) count.gaps.push(at - took);
      took = at;
      due = next; last = stamp;
      count.drawn++;
    }
    // …and the next is asked for, a ms of work later: at once, or after a sleep
    const clock = at + 1, ms = nap(clock, due);
    if (ms <= 0) { at = after(clock); stamp = at; continue; }
    napped = true;
    count.slept++;
    const woke = clock + ms + late(sleeps++);
    if (how === "handed") { at = woke; stamp = before(woke); }
    else { at = after(woke); stamp = at; }
  }
  return { ...count, perSec: count.drawn / secs, askedPerSec: count.asked / secs };
}

describe("the map rests while nobody is at it (the owner, 2026-10-05: \"คนใน cashtown เล่นแล้วใช้ CPU เยอะมาก\")", () => {
  it("is drawn at the pace chosen while somebody is at it", () => {
    for (const chosen of PACE.choices) {
      expect(paceOf(chosen, { focused: true, idle: 0, walking: false })).toBe(chosen);
      expect(paceOf(chosen, { focused: true, idle: PACE.restAfter - 1, walking: false })).toBe(chosen);
      // walking somewhere far off, hands off the mouse: the map moves under me, and is drawn as chosen
      expect(paceOf(chosen, { focused: true, idle: PACE.restAfter * 10, walking: true })).toBe(chosen);
      // the mouse moved over a window that is behind another: as chosen, for a moment
      expect(paceOf(chosen, { focused: false, idle: 0, walking: false })).toBe(chosen);
      expect(paceOf(chosen, { focused: false, idle: PACE.awayAfter - 1, walking: false })).toBe(chosen);
    }
  });

  it("rests at 30 once nobody has touched the page for a while", () => {
    expect(PACE.rest).toBe(30);
    expect(PACE.restAfter).toBeGreaterThanOrEqual(10_000);
    expect(paceOf(60, { focused: true, idle: PACE.restAfter, walking: false })).toBe(30);
    expect(paceOf(60, { focused: true, idle: 3_600_000, walking: false })).toBe(30);
    // whoever chose 30 has 30, never more for resting
    expect(paceOf(30, { focused: true, idle: PACE.restAfter, walking: false })).toBe(30);
  });

  it("is drawn at 20 while its window is behind another, walking or not", () => {
    expect(PACE.away).toBe(20);
    for (const chosen of PACE.choices) {
      for (const walking of [false, true]) {
        expect(paceOf(chosen, { focused: false, idle: PACE.awayAfter, walking })).toBe(20);
        expect(paceOf(chosen, { focused: false, idle: 3_600_000, walking })).toBe(20);
      }
    }
    // no pace is ever more than the one chosen
    for (const chosen of [20, 30, 60]) for (const focused of [true, false]) for (const idle of [0, 5000, 60_000]) for (const walking of [true, false]) {
      expect(paceOf(chosen, { focused, idle, walking })).toBeLessThanOrEqual(chosen);
    }
  });

  it("at rest the page sleeps till its frame is nearly due", () => {
    expect(nap(1000, 1050)).toBeCloseTo(50 - PACE.lead, 6);
    // a frame nearly due, or overdue, is asked for at once
    expect(nap(1000, 1000 + PACE.lead + PACE.worth - 0.1)).toBe(0);
    expect(nap(1000, 1000)).toBe(0);
    expect(nap(1000, 0)).toBe(0);
    // the frame that comes is the one slept for, whatever time it is told as: the next is due a frame on from when this was
    expect(wokenFor(1047 - 5, 1050, 20)).toBeCloseTo(1050 + 1000 / (20 * (1 + PACE.over)), 6);
    // …and lost time is not made up after a sleep either
    expect(wokenFor(5000, 1050, 20)).toBe(5000);
  });

  it("…and is woken only for the frames it draws, on any screen", () => {
    for (const how of ["handed", "next"] as const) {
      for (const hz of [60, 75, 120, 144, 165, 180, 240, 360]) {
        for (const fps of [PACE.rest, PACE.away]) {
          const p = rest(hz, fps, 30, how), say = `${hz} at ${fps}, ${how}`;
          expect(p.perSec, say).toBeGreaterThan(fps - 0.2);
          expect(p.perSec, say).toBeLessThanOrEqual(fps * 1.002 + 0.05);
          // woken once for each frame, where it was woken for every one of the screen's (240 a second, for 20 drawn)
          expect(p.asked, say).toBe(p.drawn);
          expect(p.slept, say).toBeGreaterThanOrEqual(p.drawn - 1);
          // the frames come evenly: a frame's time apart, give or take one of the screen's
          const gaps = p.gaps.slice(2);
          expect(Math.max(...gaps), say).toBeLessThan(1000 / fps + 1000 / hz + 0.5);
          expect(Math.min(...gaps), say).toBeGreaterThan(1000 / fps - 1000 / hz - 0.5);
        }
      }
    }
  });

  it("…and a sleep that runs over costs that frame's lateness, and nothing after it", () => {
    // every tenth sleep ends 40 ms late (the page was busy with something else): that frame is late, the pace holds
    for (const how of ["handed", "next"] as const) {
      const p = rest(144, 20, 60, how, (n) => (n % 10 === 3 ? 40 : 0));
      expect(p.perSec).toBeGreaterThan(19.5);
      expect(p.perSec).toBeLessThanOrEqual(20.1);
      // (the frame after a late one is due too soon to sleep for: it is asked for at once, and now and then once more)
      expect(p.asked).toBeLessThan(p.drawn * 1.06);
    }
    // timers a whole 16 ms coarse (a laptop on its battery): still its pace, a little uneven, which nobody is there to see
    let a = 7;
    const coarse = () => { a = (Math.imul(a, 1103515245) + 12345) | 0; return ((a >>> 8) % 1600) / 100; };
    const q = rest(60, 30, 60, "handed", coarse);
    expect(q.perSec).toBeGreaterThan(29.5);
    expect(q.perSec).toBeLessThanOrEqual(30.1);
  });
});
