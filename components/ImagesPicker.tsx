"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import DropZone, { useDropTarget } from "@/components/ui/DropZone";
import { uploadToBucket } from "@/components/ImagePicker";

/**
 * Several pictures for one post, in an order the poster chooses.
 *
 * An announcement held exactly one, because the first one was a poster and a
 * poster is one picture. An event is not: the rules are on the second image and
 * the prize on the third, and an admin with three of them had to pick which one
 * the Free Company got to see and paste the others into Discord.
 *
 * The first is the one that leads — it is what the card on the front page draws
 * and what image_url keeps holding for anything still reading that column — so
 * the order is worth being able to change, and moving one is two arrows rather
 * than a drag. A drag needs a pointer, and this is an admin panel that is used
 * on a phone the evening an event goes up.
 */
export default function ImagesPicker(
  { supabase, value, onChange, max = 8 }: {
    supabase: SupabaseClient;
    value: string[];
    onChange: (urls: string[]) => void;
    max?: number;
  },
) {
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const take = async (files: File[]) => {
    setErr(null);
    const room = max - value.length;
    if (room <= 0) { setErr(`That is the limit — ${max} pictures`); return; }
    const chosen = files.slice(0, room);
    if (chosen.length < files.length) setErr(`Only ${max} pictures fit`);

    setBusy((n) => n + chosen.length);
    /*
     * One after another rather than all at once, because the order is the
     * order they were dropped in. Uploading in parallel and appending as each
     * finishes hands the first place to whichever file happened to be smallest.
     */
    const done: string[] = [];
    for (const f of chosen) {
      const r = await uploadToBucket(supabase, f);
      setBusy((n) => n - 1);
      if ("error" in r) { setErr(r.error); continue; }
      done.push(r.url);
    }
    if (done.length) onChange([...value, ...done]);
  };

  const { over, handlers } = useDropTarget({
    onFiles: (f) => void take(f), disabled: busy > 0,
  });

  const move = (i: number, d: number) => {
    const to = i + d;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  return (
    <div {...handlers} className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((src, i) => (
            <figure key={src}
                    className={`relative w-28 overflow-hidden rounded-lg border-2 transition-colors ${
                      over ? "border-dashed border-accent/60" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-full bg-bg object-contain" />

              {/* The one that leads, said on the picture rather than in a
                  caption underneath: which picture the front page uses is the
                  question being answered here, and it should be answered where
                  the eye already is. */}
              {i === 0 && (
                <figcaption className="absolute left-1 top-1 rounded bg-accent/90 px-1.5 py-0.5 font-data text-[9.5px] uppercase tracking-wider text-bg">
                  Cover
                </figcaption>
              )}

              <div className="flex items-center justify-between gap-1 bg-card/90 px-1 py-1">
                <span className="flex gap-0.5">
                  <Nudge label="Move left" off={i === 0}
                         onClick={() => move(i, -1)} back />
                  <Nudge label="Move right" off={i === value.length - 1}
                         onClick={() => move(i, 1)} />
                </span>
                <button type="button" aria-label="Remove"
                        onClick={() => onChange(value.filter((_, n) => n !== i))}
                        className="rounded px-1.5 text-[13px] leading-none text-chili hover:bg-chili/10">
                  ✕
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}

      {value.length < max && (
        <DropZone size="sm" paste={false} multiple onFiles={(f) => void take(f)}
                  disabled={busy > 0}
                  title={busy > 0 ? `Uploading ${busy}…` : undefined}
                  hint={value.length
                    ? `PNG or JPG, up to 5MB — ${max - value.length} more`
                    : "PNG or JPG, up to 5MB. The first one is the cover."} />
      )}

      {err && <p className="text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}

function Nudge(
  { back = false, off, label, onClick }: {
    back?: boolean; off: boolean; label: string; onClick: () => void;
  },
) {
  return (
    <button type="button" onClick={onClick} disabled={off} aria-label={label}
            className="grid size-5 place-items-center rounded text-muted hover:bg-surface hover:text-ink disabled:opacity-25">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
           stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden
           style={back ? undefined : { transform: "rotate(180deg)" }}>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
