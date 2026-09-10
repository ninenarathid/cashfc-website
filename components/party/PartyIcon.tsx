/* eslint-disable @next/next/no-img-element */

/**
 * The game's party badge — two figures on a blue plate.
 *
 * Served from this site rather than hotlinked. It is a wiki's copy of a Square
 * Enix UI asset, the wiki turns away anything that is not a browser, and a
 * button whose icon depends on somebody else's Cloudflare settings is a button
 * that will one day be a broken image.
 *
 * Not a TagIcon, which builds XIVAPI paths: this one is not in the icon sheets
 * XIVAPI serves, so it lives in public/ui and is drawn straight.
 */
export default function PartyIcon(
  { size = 17, className = "" }: { size?: number; className?: string },
) {
  return (
    <img src="/ui/party.png" alt="" width={size} height={size} aria-hidden
         style={{ width: size, height: size }}
         className={`shrink-0 object-contain ${className}`} />
  );
}
