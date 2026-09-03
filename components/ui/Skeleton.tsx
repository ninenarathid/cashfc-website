/**
 * A placeholder for content that is on its way.
 *
 * Only for content that is genuinely coming and whose shape is genuinely known.
 * A skeleton for something that might never arrive is a promise the page cannot
 * keep, and one drawn in the wrong shape moves everything when the real thing
 * lands — which is the problem it was meant to solve.
 *
 * Marked aria-hidden and paired with a live region by its caller where the wait
 * is worth announcing: a screen reader should hear "loading guests", not eleven
 * empty boxes.
 */
export default function Skeleton(
  { className = "", rounded = "rounded-md" }:
  { className?: string; rounded?: string },
) {
  return <span aria-hidden className={`skeleton block ${rounded} ${className}`} />;
}
