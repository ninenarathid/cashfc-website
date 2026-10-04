/**
 * Whether the town moves.
 *
 * Until 2026-10-04 the map stood still for a browser that asks for reduced motion (`prefers-reduced-motion`): no rain
 * falling, no leaves on the wind, no swaying trees, the river and the fountain stopped. That is the machine's setting,
 * not the town's, and many have it on for reasons that have nothing to do with a game (Windows' animation effects
 * turned off to make the desktop quicker, a phone's "remove animations"): they stood in a storm and saw none of it,
 * beside somebody who did (the owner: "ทำไมบาง browser ไม่เห็นฝน หรือ ลม ที่พัดมาใน cash town").
 *
 * So the town moves for everybody, whatever the machine says, until somebody turns it off in the town's own settings
 * (the cog: components/town/TownSettingsButton). Turned off, the map stands still as it did for such a browser: the
 * wet ground and the dark of heavy rain are still there, and nothing falls, blows, flows or sways.
 */

/** Kept on this device only, like the frame rate beside it: what makes one dizzy on a big screen may not on a phone. */
const KEY = "cashTown:motion";

/** What was chosen, from what was kept: the town stands still only for whoever said so. */
export function movesOf(kept: unknown): boolean {
  return kept !== "off";
}

/** Whether the town moves on this device. */
export function keptMotion(): boolean {
  try { return movesOf(localStorage.getItem(KEY)); } catch { return true; }
}

/** Keep the choice on this device. */
export function keepMotion(moving: boolean): void {
  try { localStorage.setItem(KEY, moving ? "on" : "off"); } catch { /* private mode: it just won't be remembered */ }
}
