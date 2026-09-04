"use client";

import type { ReactNode } from "react";
import JobIcon from "@/components/JobIcon";
import { parseColor } from "@/lib/parse";

/**
 * One fight, on a card with a still from it behind the words.
 *
 * The same card for extremes, savage bosses and Ultimates, because they are the
 * same three facts every time — what it was called, how it went, and the best
 * parse — and three near-identical layouts drifting apart was how the page got
 * to where it was.
 *
 * The picture goes on as a background rather than as an <img>: a fight whose
 * file nobody has added yet renders as the plain card it always was, instead of
 * a broken-image glyph sitting in the middle of the row.
 *
 * ── Why it is this tall, and why the words sit at the bottom ─────────────
 *
 * `cover` crops away whatever does not fit, so a short card over a wide picture
 * shows a band across the middle and throws the rest out. These stills are
 * about 3.1:1; at 88px the card was nearly 6:1, and half of every picture was
 * being cut off top and bottom. At 150px it is close enough to the pictures'
 * own shape that they arrive very nearly whole.
 *
 * Which then means the text cannot sit in the middle of them. It goes to the
 * bottom under a gradient rising from the floor of the card, the way a caption
 * sits on a poster, leaving the top two thirds of the picture clear. Cards with
 * no picture keep their text centred: empty space above a line of text reads as
 * a mistake rather than as a frame.
 */
export default function DutyCard(
  { name, badge, subtitle, cleared, kills, jobs = [], best, art,
    focus = "center top", dim = false }: {
    // Nullable: FF Logs names most fights and occasionally does not, and a row
    // for a kill it will not name is still a kill worth showing.
    name: string | null | undefined;
    /** M9S, EX3, UWU — the short label people actually say out loud. */
    badge?: ReactNode;
    /** The boss, where the title is the duty they queue for. */
    subtitle?: string | null;
    cleared: boolean;
    kills?: number | null;
    /**
      * The job their best parse was set on — FF Logs' bestSpec, one per zone.
      *
      * Not the jobs they killed it on. FF Logs reports a fight's kills as one
      * all-jobs total and names only the job of the best parse, so "55 kills ·
      * Dark Knight" was reading as fifty-five kills on Dark Knight when two of
      * them were: the other fifty-three were Paladin. There is no per-job kill
      * count in what we ask for, so the card stops implying one.
      */
    jobs?: (string | null | undefined)[];
    best?: number | null;
    art?: string | null;
    /** Where to anchor the crop; see artFocus in lib/duty.ts. */
    focus?: string;
    /** Not cleared, or nothing logged: shown, but quieter. */
    dim?: boolean;
  },
) {
  return (
    <div
      style={art ? {
        backgroundImage:
          // Up from the floor, not across from the left. A tall card wants its
          // caption band along the bottom; the left-to-right wash this replaces
          // put a dark column down one side and did nothing for the rest.
          `linear-gradient(to top, rgba(18,22,29,0.97) 0%, rgba(18,22,29,0.9) 24%, rgba(18,22,29,0.4) 56%, rgba(18,22,29,0.12) 100%), url(${art})`,
        backgroundSize: "cover",
        // Top by default: `cover` crops whatever does not fit, a 16:9 shot in a
        // 3.5:1 card loses two thirds of its height, and a screenshot almost
        // always keeps its subject in the upper half. Almost — hence the
        // override the caller can pass.
        backgroundPosition: focus,
      } : undefined}
      className={`flex min-h-[150px] justify-between gap-3 overflow-hidden rounded-xl border px-3.5 py-3 ${
        art ? "items-end" : "items-center"} ${
        dim ? "border-dashed border-line opacity-60" : "border-line bg-surface"}`}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {badge}
          <span className="truncate font-data text-[14px] font-semibold text-ink">
            {name ?? "—"}
          </span>
        </div>
        {subtitle && (
          // The boss under the duty. Both are wanted and neither replaces the
          // other: the duty is what you search the Party Finder for, the boss is
          // what the parse belongs to.
          <div className="mt-0.5 truncate text-[12px] text-ink/75">{subtitle}</div>
        )}
        {/* Wraps rather than truncating: somebody who killed an Ultimate on
            four jobs has earned all four being named, and this line is the only
            place on the card with room to spare. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
          <span>{cleared && kills != null ? `${kills} kills` : "no log"}</span>
          {jobs.filter(Boolean).length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <span className="opacity-50">·</span>
              <span className="opacity-75">best on</span>
              {jobs.filter(Boolean).map((j) => (
                <span key={j} className="inline-flex items-center gap-1">
                  <JobIcon job={j!} size={14} /> {j}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 font-data text-xl font-semibold"
           style={{ color: parseColor(best ?? null) }}>
        {best ?? "—"}
      </div>
    </div>
  );
}
