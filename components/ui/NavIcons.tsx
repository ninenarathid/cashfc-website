/**
 * The marks on the tabs, in the header and along the bottom of a phone.
 *
 * Two kinds, and the split is not arbitrary. Four of them are the game's own
 * art, asked for by name; the rest are drawn here as strokes, matching the two
 * already in this header (the search lens, the three bars) — 24-unit box, 2.2
 * stroke, round ends, no fill.
 *
 * The game art is served from this site rather than hotlinked, for the reason
 * PartyIcon gives about the party badge: these are a wiki's copies of Square
 * Enix assets, the wiki turns away anything that is not a browser — a plain
 * fetch answers 403 — and a tab whose picture depends on somebody else's
 * Cloudflare settings is a tab that will one day be a broken image.
 *
 * Not TagIcon's job, which builds XIVAPI paths: none of these are in the icon
 * sheets XIVAPI serves, so they live in public/ui and are drawn straight.
 *
 * A picture cannot be recoloured, which is the one thing the drawn marks do for
 * free. Where a stroke goes from muted to accent, these can only go from dim to
 * bright — hence `active`, and the treatment in DIM below.
 */

import type React from "react";

type Props = {
  className?: string;
  size?: number;
  /**
   * Whether the tab this sits on is the current page. Ignored by the drawn
   * marks, which take their colour from the text around them.
   */
  active?: boolean;
};

/*
 * How a picture reads as "not the page you are on".
 *
 * Opacity alone was not enough. The gallery mark is a dark plate, and at the
 * 60% this started as it fell to 2.52:1 against the page — under the 3:1 an
 * icon needs, in the state a tab spends nearly all its life in. Lifting the
 * brightness as it dims puts the worst of the four at 3.77:1 while still
 * reading as clearly off; every one of these numbers was measured against
 * #0f1319 rather than guessed at.
 */
const DIM = "opacity-75 saturate-75 brightness-110";

/** One of the game's own marks, sized and dimmed by the tab it sits on. */
function GameIcon(
  { src, size = 20, active, className = "" }: Props & { src: string },
) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src} alt="" aria-hidden
      width={size} height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain transition-[opacity,filter] duration-150 ${
        active ? "opacity-100" : DIM
      } ${className}`}
    />
  );
}

const svg = (size: number, className?: string) => ({
  viewBox: "0 0 24 24",
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});

/** The roster. A ring with a wave through it — the game's player marker. */
export const MembersIcon = (p: Props) =>
  <GameIcon {...p} src="/ui/nav/members.png" />;

/** Standings. A ring with a flare off it. */
export const RanksIcon = (p: Props) =>
  <GameIcon {...p} src="/ui/nav/ranks.png" />;

/**
 * The party board. Three figures on a blue hex.
 *
 * Pointed at the copy the party board already ships rather than a second one
 * beside it: the file asked for here is byte-for-byte what is in public/ui
 * already, and two names for one picture is one of them going stale.
 */
export const PartyIcon = (p: Props) =>
  <GameIcon {...p} src="/ui/party.png" />;

/** Pictures. */
export const GalleryIcon = (p: Props) =>
  <GameIcon {...p} src="/ui/nav/gallery.png" />;

/** Something said, waiting for an answer. */
export function FeedbackIcon({ className, size = 20 }: Props) {
  return (
    <svg {...svg(size, className)}>
      <path d="M20.8 11.6a8.4 8.4 0 0 1-8.4 8.4H4l2-2.6a8.4 8.4 0 1 1 14.8-5.8Z" />
    </svg>
  );
}

/** A book, open. */
export function GuidesIcon({ className, size = 20 }: Props) {
  return (
    <svg {...svg(size, className)}>
      <path d="M12 6.4C10.6 5.1 8.7 4.5 6 4.5H3.5v13H6c2.7 0 4.6.6 6 1.9" />
      <path d="M12 6.4c1.4-1.3 3.3-1.9 6-1.9h2.5v13H18c-2.7 0-4.6.6-6 1.9" />
      <path d="M12 6.4v13" />
    </svg>
  );
}

/** The rest of them. */
export function MoreIcon({ className, size = 20 }: Props) {
  return (
    <svg {...svg(size, className)} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** Looked up by the tab's href, so a tab carries no drawing of its own. */
export const NAV_ICON: Record<string, (p: Props) => React.ReactElement> = {
  "/members": MembersIcon,
  "/leaderboards": RanksIcon,
  "/party": PartyIcon,
  "/gallery": GalleryIcon,
  "/feedback": FeedbackIcon,
  "/guides": GuidesIcon,
};
