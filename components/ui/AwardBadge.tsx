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
  /** A PNG an admin uploaded. Optional — most badges are words. */
  icon_url?: string | null;
  /** A key from BADGE_COLORS. Unknown keys fall back rather than disappear. */
  color?: string | null;
  /** Why this member in particular got it. Not translated: it is written once,
      about one person, by whoever gave it. */
  note?: string | null;
}

/**
 * A badge somebody was given, with a foil sheen that catches the light.
 *
 * Adapted from the 21st.dev award badge, which is a Product Hunt plaque that
 * tilts under the pointer and has a rainbow moving across it. Two things about
 * that original did not survive the move, and both for the same reason: this
 * site puts badges on a list of five hundred people.
 *
 * The original recomputes a full matrix3d and writes it into React state on
 * every mousemove, so each frame is a state update and a re-render. Here the
 * pointer writes two CSS custom properties straight onto the element through a
 * ref — React renders once, the browser does the rest on the compositor, and a
 * row that is never hovered costs nothing at all.
 *
 * The rainbow was ten blurred, permanently rotating SVG polygons. Permanently:
 * they animate whether or not anybody is looking, which on a page of badges is
 * a page that never idles. This is one gradient that only moves under the
 * pointer, and it borrows the badge's own colour rather than being a rainbow,
 * because the colour is the thing the admin chose.
 *
 * ── The two sizes ────────────────────────────────────────────────────────
 *
 * `full` is the plaque, for somebody's own page: it has room for the reason it
 * was given, and it is worth looking at because you came to look at them.
 *
 * `compact` is for the member list, and where the badge has a picture it is
 * only the picture — a seal or a wreath pinned to the corner of the row, the
 * way an award actually appears on a page, with the name kept for the hover.
 * A row that already carries a name, a title, six playstyle chips and a line
 * of progress does not have room for more words, and an emblem is read at a
 * glance where a seventh chip is read last or not at all. Badges with no
 * picture keep the text chip: an emblem that is not there cannot be hovered.
 *
 * The sheen and the tilt are dropped at this size either way — five hundred
 * rows of foil is a disco, not a board.
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

  const icon = badge.icon_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={badge.icon_url} alt="" aria-hidden
         className="size-[22px] shrink-0 object-contain" />
  ) : null;

  if (size === "compact") {
    // Everything the badge says, for the hover — the name has to be here
    // because on an emblem it is nowhere else.
    const told = (
      <>
        <span className="font-semibold" style={{ color: c.text }}>{label}</span>
        {reason && <span className="mt-0.5 block text-muted">{reason}</span>}
      </>
    );

    if (badge.icon_url) {
      return (
        <Tooltip content={told} side="bottom">
          <span className="inline-flex size-8 items-center justify-center">
            {/* alt rather than aria-hidden: with the words gone this is the
                only thing a screen reader has to go on. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badge.icon_url} alt={label}
                 className="max-h-full max-w-full object-contain
                            drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]" />
          </span>
        </Tooltip>
      );
    }

    return (
      <Tooltip content={told} side="bottom">
        <span
          style={{ color: c.text, borderColor: c.border, background: c.background }}
          className="inline-flex max-w-[11rem] items-center whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium">
          <span className="truncate">{label}</span>
        </span>
      </Tooltip>
    );
  }

  // Pointer position as two 0–1 numbers, written where CSS can read them. No
  // state, so no re-render: the values land on the element and the transitions
  // below do the work.
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
      style={{
        color: c.text, borderColor: c.border, background: c.background,
        // Read by the tilt and the sheen. Centre until the pointer says otherwise.
        ["--px" as string]: "0.5", ["--py" as string]: "0.5",
        boxShadow: `0 2px 14px -6px ${c.glow}`,
      }}
      className="badge-foil group relative inline-flex select-none items-center gap-2 overflow-hidden rounded-lg border px-3 py-1.5">
      {icon && <span className="relative z-10 flex items-center">{icon}</span>}
      <span className="relative z-10 flex flex-col">
        <span className="font-display text-[13.5px] font-semibold leading-tight">
          {label}
        </span>
        {reason && (
          <span className="text-[11px] leading-tight opacity-70">{reason}</span>
        )}
      </span>
      {/* The sheen. Its own element so it can be blended over the plaque
          without tinting the words, and hidden from anybody who asked for
          less motion — see globals.css. */}
      <span aria-hidden className="badge-foil-sheen" />
    </span>
  );
}
