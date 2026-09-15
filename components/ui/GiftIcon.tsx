import { useId } from "react";

/**
 * A wrapped present, drawn.
 *
 * The emoji was a different box on every platform — a flat red one here, a
 * glossy blue one there, a grey smudge at badge size — and none of them the
 * parcel that actually opens: brown paper and a red ribbon. This is that
 * parcel, so the thing in the bell, the thing on the shelf and the thing that
 * unwraps are visibly the same object.
 *
 * Drawn on a 32-unit grid in solid shapes — the only lines are the faint
 * creases in the bow, which can vanish at badge size without the parcel
 * losing anything — so it holds together at sixteen pixels as well as at forty.
 */
export default function GiftIcon(
  { size = 24, className = "" }: { size?: number; className?: string },
) {
  // Ids of its own: several of these share a page, and a gradient referenced by
  // an id that belongs to a copy which is hidden stops painting in Chrome.
  const uid = useId().replace(/:/g, "");
  const paper = `gp${uid}`, lid = `gl${uid}`, ribbon = `gr${uid}`;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden
         className={className} style={{ display: "block" }}>
      <defs>
        <linearGradient id={paper} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4ab6c" />
          <stop offset="1" stopColor="#a87a3f" />
        </linearGradient>
        <linearGradient id={lid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2bd80" />
          <stop offset="1" stopColor="#b88a4c" />
        </linearGradient>
        <linearGradient id={ribbon} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef5a45" />
          <stop offset="1" stopColor="#b8321f" />
        </linearGradient>
      </defs>

      {/* the box */}
      <rect x="5" y="14" width="22" height="15" rx="2" fill={`url(#${paper})`} />
      {/* a shadow under the lid, so the lid sits on it rather than beside it */}
      <rect x="5" y="14" width="22" height="2" fill="#7a5426" opacity=".35" />
      {/* the lid */}
      <rect x="3.5" y="10" width="25" height="5.5" rx="1.6" fill={`url(#${lid})`} />
      <rect x="4.5" y="10.6" width="23" height="1.2" rx=".6" fill="#fff" opacity=".35" />

      {/* the ribbon, down the box and across the lid */}
      <rect x="13.8" y="10" width="4.4" height="19" fill={`url(#${ribbon})`} />
      <rect x="3.5" y="11.6" width="25" height="2.4" fill={`url(#${ribbon})`} opacity=".9" />

      {/* the bow: two loops and their tails, and a knot */}
      <path d="M16 10.2 C12.6 4.6 7.2 5.2 8 8.6 C8.6 11 12.4 10.9 16 10.2 Z" fill={`url(#${ribbon})`} />
      <path d="M16 10.2 C19.4 4.6 24.8 5.2 24 8.6 C23.4 11 19.6 10.9 16 10.2 Z" fill={`url(#${ribbon})`} />
      <path d="M11.4 7.6 C12.6 7.4 14.2 8.6 15 9.8" stroke="#8f2415" strokeWidth="1" fill="none" opacity=".55" />
      <path d="M20.6 7.6 C19.4 7.4 17.8 8.6 17 9.8" stroke="#8f2415" strokeWidth="1" fill="none" opacity=".55" />
      <ellipse cx="16" cy="10.3" rx="2.4" ry="2" fill="#d6402c" />
      <ellipse cx="15.4" cy="9.7" rx=".9" ry=".6" fill="#fff" opacity=".45" />
    </svg>
  );
}
