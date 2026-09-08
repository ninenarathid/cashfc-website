/**
 * A fork and a knife, for the unit the FC measures a raid night in.
 *
 * Drawn here rather than fetched. Every other symbol on this site is the game's
 * own art, on the principle that a player should not have to learn a second
 * vocabulary — but the game has no icon for this, because "food" as a length of
 * time is the FC's invention rather than Square Enix's. Both candidates were
 * checked and rejected: the Well Fed status (216202) is a hamper with a coin on
 * it, and the Culinarian class symbol (062015) is a cooking pot. Neither reads
 * as "half an hour".
 *
 * `currentColor` throughout, so it takes the colour of whatever line it sits in
 * and needs no variant for the places it appears — beside a duration in a list,
 * beside the unit in a form, on a dark row or a light one.
 */
export default function FoodIcon(
  { size = 14, className = "" }: { size?: number; className?: string },
) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden
         fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round"
         className={`inline-block shrink-0 ${className}`}>
      {/* The fork: three tines over a stem, which is the shape that reads as a
          fork at fourteen pixels. Four tines turn to mush at this size. */}
      <path d="M6 3v6" />
      <path d="M9.5 3v6" />
      <path d="M3 3v6a3.2 3.2 0 0 0 3.25 3.2A3.2 3.2 0 0 0 9.5 9V3" />
      <path d="M6.25 12.2V21" />
      {/* The knife: a blade with its back straight and its edge curving up to
          the point, then the handle below it. */}
      <path d="M18.5 3c-2.2 1.8-3.2 4.4-3.2 7.1 0 1.6 1.1 2.6 3.2 2.6V3Z" />
      <path d="M18.5 12.7V21" />
    </svg>
  );
}
