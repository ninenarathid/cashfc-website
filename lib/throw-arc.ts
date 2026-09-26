/**
 * The path a thrown popoto takes, as numbers. Drawn by components/ui/throwPotato.
 *
 * A thrown thing moves two ways at once: steadily across, and up then down
 * under gravity. Together that is a parabola, and this is the one that leaves
 * the button at (0, 0), lands on the face at (dx, dy), and at its highest is
 * `lift` above the button — always above both ends, so a face higher on the
 * page than the button is still reached over the top rather than in a line.
 *
 * The tilt is the potato leaning into the arc: nose up as it climbs, level at
 * the top, nose down as it drops. It used to spin instead, which suited an
 * emoji; a potato with a face spinning twice in under a second shows you its
 * face for about a tenth of that. So the tilt is only part of the path's real
 * angle, and capped, and the face stays the right way up enough to be read.
 */
export interface ArcPoint {
  /** Share of the flight, 0 to 1. The path is sampled evenly in time. */
  t: number;
  x: number;
  y: number;
  /** Degrees, clockwise. Already turned round for a throw to the left. */
  tilt: number;
}

/** How much of the path's real angle the potato leans by. */
const LEAN = 0.55;
/** And no further than this either way, in degrees. */
const MAX_TILT = 24;

/** How high the arc goes above the button: higher for a longer throw. */
export function lift(dx: number, dy: number): number {
  return Math.min(0, dy) - 90 - Math.hypot(dx, dy) * 0.18;
}

export function throwArc(dx: number, dy: number, steps: number): ArcPoint[] {
  const top = lift(dx, dy);
  /*
   * y(t) = v·t + g·t², through y(0) = 0 and y(1) = dy, whose lowest value (the
   * highest point on screen, where y grows downward) is `top`. Solving those
   * gives v, how fast it leaves going up, and g, gravity. `top` is below both
   * 0 and dy, so the root is always real.
   */
  const v = 2 * (top - Math.sqrt(top * (top - dy)));
  const g = dy - v;
  const facing = dx < 0 ? -1 : 1;
  const across = Math.max(Math.abs(dx), 1);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const slope = (v + 2 * g * t) / across;
    const angle = (Math.atan(slope) * 180) / Math.PI * LEAN;
    const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, angle)) * facing;
    return { t, x: dx * t, y: v * t + g * t * t, tilt };
  });
}
