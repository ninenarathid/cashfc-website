/**
 * What grows leans a little with the wind, each in its own time, and away from whoever walks by its foot: its top moved,
 * its foot still. The 3D town does it in its pictures' shader (./engine); the live town does the same to its own
 * pictures of the same things with these numbers, so that the two lie on each other (lib/town/town2-art, farm2-art).
 * No three.js here: the live town's art reads it without the 3D town's code.
 */

/** The pictures that sway, by their files' names; and those that lie flat on the ground, which do not. */
export const SWAY = /tree|cedar|zelkova|camphor|pine|maple|ginkgo|bush|shrub|hydrangea|tulip|flower|reed|bamboo|iris|azalea|fern|lily|chrysanth|bellflower/;
export const FLAT = /^(lotus_leaves|three_flat_grey_stepping_stones)/;

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/**
 * How far a picture's top is moved to the right of the screen, in the map's own pixels: `x`, `z` its foot (tiles),
 * `width` its picture's width as drawn on the map (pixels), `sec` the clock, `me` whoever walks (tiles) or null.
 */
export function swayPx(x: number, z: number, width: number, sec: number, me: { x: number; y: number } | null): number {
  const ph = x * 1.7 + z * 2.3;
  let px = (Math.sin(sec * 1.3 + ph) * 0.02 + Math.sin(sec * 2.9 + ph * 1.7) * 0.007) * width;
  if (me) {
    const bx = x - me.x, bz = z - me.y;
    px += (1 - smooth(0.25, 1.2, Math.hypot(bx, bz))) * Math.sign(bx * 0.7071 - bz * 0.7071 + 0.0001) * 0.1 * 45.25;
  }
  return px;
}
