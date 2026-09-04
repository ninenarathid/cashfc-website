"use client";

import { useRef, type PointerEvent } from "react";
import { badgeShades } from "@/lib/badge-colors";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLang } from "@/lib/i18n";

/** Everything one badge needs to draw itself, in either language. */
export interface BadgeLike {
  label: string;
  label_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  /** A PNG an admin uploaded. It is the emblem on the left of the plate — not
      the plate itself, which is always one of the four metals. */
  icon_url?: string | null;
  /** A key from BADGE_COLORS. Unknown keys fall back rather than disappear. */
  color?: string | null;
  /** Why this member in particular got it. Not translated: it is written once,
      about one person, by whoever gave it. */
  note?: string | null;
}

/**
 * A badge somebody was given: a struck metal plate with a foil sheen across it.
 *
 * Adapted from the 21st.dev award badge, which is a Product Hunt plaque — a
 * light plate on a dark page, an emblem on the left, the words on the right,
 * and a rainbow in the varnish. Two things about the original did not survive
 * the move, and both for the same reason: this site puts badges on a list of
 * five hundred people.
 *
 * The original recomputes a full matrix3d and writes it into React state on
 * every mousemove, so each frame is a state update and a re-render. Here the
 * pointer writes two CSS custom properties straight onto the element through a
 * ref — React renders once, the browser does the rest on the compositor, and a
 * row that is never hovered costs nothing at all.
 *
 * The rainbow was ten blurred SVG polygons rotating permanently — whether or
 * not anybody was looking, which on a page of badges is a page that never
 * idles. This is one gradient. It sits still at rest, which is what the plate
 * looks like in the original anyway, and only swings when a pointer is on it.
 *
 * ── The two sizes ────────────────────────────────────────────────────────
 *
 * `full` is the plaque, for somebody's own page. Two lines, the way the plate
 * it is adapted from sets them: a small line above saying what kind of thing
 * this is, and the award's own name under it in the size that makes it the
 * thing you read. That order is the point — the big line has to be the name,
 * because the name is what somebody is being told they hold.
 *
 * `compact` is the same plate shrunk to a square for the corner of a member
 * row, holding the emblem and nothing else, with the name kept for the hover.
 * A row that already carries a name, a title, six playstyle chips and a line of
 * progress has no room for more words, and a plate is read at a glance where a
 * seventh chip is read last or not at all. A badge with no emblem keeps its
 * name on the plate instead — an empty square cannot be hovered for a name it
 * does not show.
 */
export default function AwardBadge(
  { badge, size = "full" }: { badge: BadgeLike; size?: "full" | "compact" },
) {
  const ref = useRef<HTMLSpanElement>(null);
  const { lang } = useLang();
  const c = badgeShades(badge.color);

  // The English column wins only for an English reader, and only when it has
  // been filled in — the same fallback announcements use, so a badge whose
  // translation nobody got round to still says something rather than nothing.
  const en = lang === "en";
  const label = (en ? badge.label_en : null) || badge.label;
  const description = (en ? badge.description_en : null) || badge.description;

  // The reason, if there is one. The note is the more specific of the two, so
  // it leads; the description says what the badge means at all.
  const reason = [badge.note, description].filter(Boolean).join(" · ") || null;

  // The plate. Everything below sits on this, at both sizes.
  const plate = {
    background: c.background,
    borderColor: c.border,
    color: c.ink,
    boxShadow: `0 2px 16px -7px ${c.glow}`,
    // Read by the tilt and the sheen. Centre until the pointer says otherwise.
    ["--px" as string]: "0.5",
    ["--py" as string]: "0.5",
  };

  if (size === "compact") {
    // Everything the badge says, for the hover — on a plate this small the
    // name is nowhere else. The metal's own colour, because the tooltip is
    // dark and the ink on the plate is meant for a light one.
    const told = (
      <>
        <span className="font-semibold" style={{ color: c.accent }}>{label}</span>
        {reason && <span className="mt-0.5 block text-muted">{reason}</span>}
      </>
    );

    return (
      <Tooltip content={told} side="bottom">
        <span style={plate}
              className="badge-plate relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {badge.icon_url ? (
            // alt rather than aria-hidden: with the words gone this is the
            // only thing a screen reader has to go on.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badge.icon_url} alt={label}
                 className="size-[21px] object-contain" />
          ) : (
            // No emblem: the first letter, which is at least a way to tell two
            // plates of the same metal apart.
            <span className="font-display text-[13px] font-bold leading-none">
              {label.trim().slice(0, 1).toUpperCase()}
            </span>
          )}
          <span aria-hidden className="badge-foil-sheen" />
        </span>
      </Tooltip>
    );
  }

  // Pointer position as two 0–1 numbers, written where CSS can read them. No
  // state, so no re-render: the values land on the element and the transitions
  // do the work.
  const track = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String((e.clientX - r.left) / r.width));
    el.style.setProperty("--py", String((e.clientY - r.top) / r.height));
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0.5");
    el.style.setProperty("--py", "0.5");
  };

  return (
    <span
      ref={ref}
      onPointerMove={track}
      onPointerLeave={reset}
      style={plate}
      className="badge-foil badge-plate relative inline-flex select-none items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-2">
      {badge.icon_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={badge.icon_url} alt="" aria-hidden
             className="relative z-10 size-[30px] shrink-0 object-contain" />
      )}
      <span className="relative z-10 flex min-w-0 flex-col">
        {reason && (
          // Truncated, and only here. The kicker on the plate this copies is
          // two words; ours is whatever an admin typed about one member, and a
          // sentence that wraps to three lines would push the name — the part
          // that matters — out of the middle of the plate. The whole of it is
          // still on the hover.
          <span className="max-w-[20rem] truncate text-[10.5px] font-semibold
                           uppercase leading-tight tracking-[0.08em] opacity-65">
            {reason}
          </span>
        )}
        <span className="font-display text-[16px] font-bold leading-tight">
          {label}
        </span>
      </span>
      {/* The sheen. Its own element so it can be blended over the plate
          without touching the lettering — see globals.css. */}
      <span aria-hidden className="badge-foil-sheen" />
    </span>
  );
}
