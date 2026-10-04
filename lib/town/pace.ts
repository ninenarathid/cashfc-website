/**
 * How often the map is drawn.
 *
 * A browser asks for a frame as often as the screen shows one, and the town drew the whole map at every one of them:
 * 60 times a second on most screens, but 144, 165 or 240 on a fast one, where a town of pixel art looks no better for
 * it and the machine runs hot (the owner, 2026-10-04: "บางคนรันแล้ว fps สูงเกินไป แล้วคอมร้อนเพราะ CPU รันมากเกินไป ช่วยล็อค
 * ให้รันได้มากสุดแค่ 60 fps"). So a frame is drawn only when one is due: `PACE.most` a second at the most, or fewer for
 * whoever asks in the settings at the top right of the town. A frame the screen asks for sooner is let go by with
 * nothing done.
 *
 * It is kept as a time the next frame is due, moved on by one frame's time at each frame drawn (`paced`), so a
 * screen faster than the pace draws that many a second whatever its own rate: 144 a second draws two frames of
 * every five (every second or third, as near even as its rate allows), 120 every second one, 240 every fourth. A
 * screen no faster than the pace draws every frame, as before.
 */
export const PACE = {
  /** The most frames a second anybody's town draws, and what everybody's draws until they choose. */
  most: 60,
  /** What can be chosen: the fewer is for a machine that still runs hot, or a phone's battery. */
  choices: [30, 60],
  /**
   * How much over its number the pace is counted, as a share. A screen said to show 60 a second shows 60.01 or
   * 60.02: held to 60 exactly, it would have a frame let go every minute or so, a hitch for nothing. So a screen up
   * to this much faster draws every frame, and a faster one draws 60.06. (More, and a screen 60 divides has a
   * second with 61 in it now and then: at half a hundredth a screen of 180 did, one second in three.)
   */
  over: 0.001,
  /**
   * How much sooner than it is due a frame may come and still be drawn, in ms, where a whole frame's time has gone by
   * since the last drawn: some browsers tell the time to the whole millisecond, and a frame told as 16 after the
   * last is the 16.7 one. (It does not add up: the time the next is due moves on by the frame's own time, not from
   * when this one came. And a frame that comes sooner after the last than that has to be fully due: or a screen
   * 60 divides would, with the time told that roughly, now and then let its own frame go and wait a whole one more.)
   */
  early: 1.5,
} as const;

/** How many frames a second, of those that can be chosen. */
export type Fps = (typeof PACE.choices)[number];

/**
 * Whether the frame the screen asks for at `now` is drawn, held to `fps` a second: `last` is when one was last
 * drawn, `next` when one was next due (0 before any). Given back is when the one after is due, if this one is to be
 * drawn; null if it is let go by. (All in ms. A frame that comes late is drawn at once and the lost time is not made
 * up beyond one frame's: a tab come back to after an hour draws one frame, not an hour's.)
 */
export function paced(now: number, last: number, next: number, fps: number): number | null {
  const frame = 1000 / (fps * (1 + PACE.over));
  if (now < next - (now - last >= frame - PACE.early ? PACE.early : 0)) return null;
  return Math.max(next + frame, now);
}

/** What was chosen, from what was kept: anything that is not one of the choices is the most. */
export function fpsOf(kept: unknown): Fps {
  const n = typeof kept === "string" && kept.trim() !== "" ? Number(kept) : kept;
  return (PACE.choices as readonly unknown[]).includes(n) ? (n as Fps) : PACE.most;
}

/** Kept on this device only, like the music's choice: a hot machine is this machine's, not the member's. */
const KEY = "cashTown:fps";

/** What this device was told to draw at. */
export function keptFps(): Fps {
  try { return fpsOf(localStorage.getItem(KEY)); } catch { return PACE.most; }
}

/** Keep the choice on this device. */
export function keepFps(fps: Fps): void {
  try { localStorage.setItem(KEY, String(fps)); } catch { /* private mode: it just won't be remembered */ }
}
