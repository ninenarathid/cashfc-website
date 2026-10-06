/**
 * A sign on its pole, as a few pixels (the town's icons are pixel art, never
 * emoji): for the button that holds one up. Drawn here rather than in the
 * icon atlas, which every session's sheets are built into.
 */
export default function SignIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden className={className}>
      {/* the pole */}
      <rect x="7" y="8" width="2" height="8" fill="#2a1b12" />
      <rect x="7" y="9" width="1" height="6" fill="#9a6b3c" />
      {/* the board: a dark edge, planks, a light top and a shaded foot */}
      <rect x="1" y="1" width="14" height="9" fill="#2a1b12" />
      <rect x="2" y="2" width="12" height="7" fill="#c8975a" />
      <rect x="2" y="2" width="12" height="1" fill="#e9c78b" />
      <rect x="2" y="8" width="12" height="1" fill="#a47238" />
      {/* what is written on it */}
      <rect x="4" y="4" width="8" height="1" fill="#3d2913" />
      <rect x="4" y="6" width="5" height="1" fill="#3d2913" />
    </svg>
  );
}
