"use client";

import { useEffect, useId, useRef, type PointerEvent } from "react";
import { badgeShades } from "@/lib/badge-colors";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLang } from "@/lib/i18n";

/**
 * The fan, exactly as the plate this is adapted from stacks it: ten hourglass
 * wedges ten degrees apart, each one flat-coloured, blurred and half opaque.
 * The two empty slots are the original's — they hold the white one out at
 * ninety degrees, and taking them out would close the fan.
 */
const FOIL_LAYERS: (string | null)[] = [
  "hsl(358, 100%, 62%)",
  "hsl(30, 100%, 50%)",
  "hsl(60, 100%, 50%)",
  "hsl(96, 100%, 50%)",
  "hsl(233, 85%, 47%)",
  "hsl(271, 85%, 47%)",
  "hsl(300, 20%, 35%)",
  null,
  null,
  "white",
];

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
 * The rainbow is the original's, wedge for wedge, after two attempts at
 * approximating it with a single rotating gradient looked wrong. Rotating a
 * gradient only re-angles bands that stay where they are; rotating a fan of
 * hourglasses makes every wedge scissor across the plate and cross the ones
 * beside it, and the crossing is the whole effect.
 *
 * What did not survive is the ten sets of keyframes it uses to move those
 * layers, which all move together by the same ten degrees — one rotation on
 * the group does that, and a group can be paused. The fan runs on the full
 * plaque only: a member row's corner can hold five hundred of the small
 * plates, and a page that never idles is a page whose fans never stop.
 *
 * What it does under a pointer is the original's, though, because that is the
 * part somebody notices. The plate is met with a flick away from the hand
 * before it settles towards it; the rainbow turns by how far the pointer is
 * from the middle; and letting go throws both a little past centre before they
 * come to rest. Without that the plate simply snaps to wherever the pointer is,
 * which reads as a hover state rather than as a thing being picked up.
 *
 * ── The two sizes ────────────────────────────────────────────────────────
 *
 * `full` is the plaque, for somebody's own page. Two lines, the way the plate
 * it is adapted from sets them: a small line above saying what kind of thing
 * this is, and the award's own name under it in the size that makes it the
 * thing you read. That order is the point — the big line has to be the name,
 * because the name is what somebody is being told they hold.
 *
 * `compact` is the same metal shrunk to a square for the corner of a member
 * row, holding the emblem and nothing else, with the name kept for the hover.
 * No foil on it: at 32px the emblem fills the plate, a sheen underneath is
 * invisible, and a blurred blended layer on each of five hundred rows is a
 * real cost for something nobody can see.
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
  // The blur filter is referenced by id, and a page can hold several plaques.
  const uid = useId().replace(/:/g, "");
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
              className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
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
        </span>
      </Tooltip>
    );
  }

  // No state anywhere below: every value is written straight onto the element
  // as a custom property, so React renders once and the browser does the rest
  // on the compositor.
  //
  // Two timers, and both have to be cancellable — leaving and re-entering
  // quickly would otherwise let the settle from the first pass land in the
  // middle of the second.
  const settling = useRef(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  /** Where the pointer is, as two 0–1 numbers across the plate. */
  const at = (e: PointerEvent<HTMLSpanElement>, el: HTMLSpanElement) => {
    const r = el.getBoundingClientRect();
    return {
      px: (e.clientX - r.left) / r.width,
      py: (e.clientY - r.top) / r.height,
    };
  };

  const write = (el: HTMLSpanElement, px: number, py: number, damp = 1) => {
    el.style.setProperty("--px", String(px));
    el.style.setProperty("--py", String(py));
    // The original's own measure: how far the pointer is from the middle, in
    // pixels, over 1.5 — which on a plate this shape reaches something near a
    // right angle at the corners and zero in the centre. It is a distance
    // rather than a direction, so the two sides of the plate turn the fan the
    // same way; that is not a bug in it. With a fan of hourglasses, turning
    // ninety degrees is a different picture at every step of the way, and it
    // reads as the light finding the hand rather than as a switch.
    const r = el.getBoundingClientRect();
    const turn = (Math.abs(px - 0.5) * r.width + Math.abs(py - 0.5) * r.height) / 1.5;
    el.style.setProperty("--sheen", `${turn * damp}deg`);
    // Slightly smaller the further out the pointer is, the way a real plate
    // pushed at one corner sits back into the page.
    const away = Math.abs(px - 0.5) + Math.abs(py - 0.5);
    el.style.setProperty("--pscale", String(1 - Math.min(away, 1) * 0.04));
  };

  const enter = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const { px, py } = at(e, el);
    // Away from the hand first. The original calls this its opposite matrix,
    // and it is what makes the plate feel caught rather than found.
    write(el, 0.5 - (px - 0.5) * 0.7, 0.5 - (py - 0.5) * 0.7);
    settling.current = true;
    later(() => {
      settling.current = false;
      if (ref.current) write(ref.current, px, py);
    }, 170);
  };

  const track = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || settling.current) return;
    const { px, py } = at(e, el);
    write(el, px, py);
  };

  const leave = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    settling.current = false;
    const { px, py } = at(e, el);
    // A quarter of the way past centre, then centre — the plate rocking back
    // rather than snapping flat. The foil is damped harder than the tilt, so
    // it settles rather than swinging the whole way over.
    write(el, 0.5 - (px - 0.5) * 0.25, 0.5 - (py - 0.5) * 0.25, 0.4);
    later(() => { if (ref.current) write(ref.current, 0.5, 0.5); }, 200);
  };

  return (
    <span
      ref={ref}
      onPointerEnter={enter}
      onPointerMove={track}
      onPointerLeave={leave}
      style={plate}
      className="badge-foil relative inline-flex select-none items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-2">
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
      {/* The foil. Stretched over the plate whatever shape it ended up, which
          is why the viewBox is the original's 260x54 and the aspect ratio is
          not preserved: the wedges are meant to fill it. */}
      <svg aria-hidden viewBox="0 0 260 54" preserveAspectRatio="none"
           className="pointer-events-none absolute inset-0 size-full">
        <defs>
          <filter id={`foil-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        {/* The plate already clips, so the original's mask is not needed. */}
        <g style={{ mixBlendMode: "overlay" }} className="badge-foil-fan">
          {FOIL_LAYERS.map((fill, i) => fill && (
            <g key={i} className="badge-foil-layer"
               style={{ ["--i" as string]: i }}>
              <polygon points="0,0 260,54 260,0 0,54" fill={fill}
                       filter={`url(#foil-${uid})`} opacity="0.5" />
            </g>
          ))}
        </g>
      </svg>
    </span>
  );
}
