"use client";

import { useEffect, useState } from "react";

/** Long enough to look at, short enough that a second picture is worth waiting for. */
export const CYCLE_MS = 4000;

/**
 * Which picture of a set a tile should be showing right now.
 *
 * Shared by the gallery wall and the strip on the front page so a post with
 * several pictures behaves the same in both — the rule was written twice once
 * already, and the second copy is how two things that look alike start drifting.
 *
 * Each tile is given an offset from its position in the list, so a wall of them
 * does not turn over in unison; a row flipping as one reads as a glitch rather
 * than as motion.
 *
 * Stops when the reader has asked for less motion, and when the tab is in the
 * background — a page quietly swapping pictures nobody is looking at is work
 * done for no one, on somebody's battery.
 */
export function useCycle(count: number, index: number): number {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => setI((n) => (n + 1) % count), CYCLE_MS);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => (document.hidden ? stop() : start());

    const delay = setTimeout(start, (index % 5) * 700);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(delay);
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count, index]);

  // Guarded rather than trusted: a post can lose a picture while its tile is on
  // screen, and an index past the end would leave an empty frame.
  return count < 2 ? 0 : i % count;
}
