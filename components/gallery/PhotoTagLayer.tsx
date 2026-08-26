"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import type { GalleryTag } from "@/lib/gallery";
import MemberPicker, { type MemberOption } from "@/components/gallery/MemberPicker";

/**
 * The pins drawn on top of a picture, and the card each one opens.
 *
 * Kept out of the way until asked for: the markers appear when the pointer is
 * over the picture and the card only when the pointer is over a marker. A
 * gallery is for looking at screenshots, and a permanent scatter of dots across
 * somebody's GPose shot would be the site talking over the picture.
 *
 * Where there is no hover — a phone — the markers are always faintly visible,
 * because a pin nobody can discover is a pin nobody will ever tap.
 *
 * Everything is positioned in fractions of the picture, so the layer needs no
 * measurements and nothing to recalculate when the window changes size.
 */

/** A tag being placed: the point is chosen, the person is not yet. */
export interface Placing { x: number; y: number }

export default function PhotoTagLayer(
  { tags, faces, placing, options, onPlace, onCancel, onRemove, canEdit }: {
    /** Only the tags belonging to the picture underneath. */
    tags: GalleryTag[];
    /** Character faces by id, for the card a pin opens. */
    faces: Record<number, { name: string; avatar: string | null }>;
    placing: Placing | null;
    options: MemberOption[];
    onPlace: (o: MemberOption) => void;
    onCancel: () => void;
    onRemove: (tagId: number) => void;
    canEdit: boolean;
  },
) {
  const { t } = useLang();
  const [openPin, setOpenPin] = useState<number | null>(null);

  return (
    <div className="pointer-events-none absolute inset-0">
      {tags.map((g) => {
        const face = faces[g.character_id];
        const pending = !g.confirmed_at;
        const open = openPin === g.id;
        return (
          <div key={g.id}
               className="pointer-events-auto absolute"
               style={{ left: `${(g.x ?? 0) * 100}%`, top: `${(g.y ?? 0) * 100}%` }}>
            {/* The marker itself, centred on the point rather than hanging from
                it — the coordinate is where the person is, not where a corner
                of a box goes. */}
            <button onClick={() => setOpenPin(open ? null : g.id)}
                    onMouseEnter={() => setOpenPin(g.id)}
                    onMouseLeave={() => setOpenPin((n) => (n === g.id ? null : n))}
                    aria-label={g.name}
                    className={`-translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-bg/40 backdrop-blur-[1px] transition-all duration-200 ${
                      open ? "size-9 border-accent" : "size-7 border-ink/70"} ${
                      pending ? "border-dashed" : ""} ${
                      // Faint until the picture is hovered, then legible.
                      "opacity-45 group-hover/photo:opacity-100 [@media(hover:none)]:opacity-70"}`} />

            {open && (
              // Above the marker, and never clipped to the picture: a face near
              // the top edge would otherwise open its card off-screen.
              <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/95 py-1.5 pl-1.5 pr-2.5 shadow-xl backdrop-blur">
                  {face?.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face.avatar} alt=""
                         className="size-9 shrink-0 rounded-full border border-line object-cover" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/member/${g.character_id}`}
                          className="block whitespace-nowrap font-data text-[13px] font-semibold text-ink no-underline hover:text-accent">
                      {face?.name ?? g.name}
                    </Link>
                    {pending && (
                      <div className="whitespace-nowrap text-[11px] italic text-muted">
                        {t("gallery.tagPending")}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => onRemove(g.id)}
                            aria-label={t("gallery.tagRemove")}
                            className="ml-1 shrink-0 rounded-full border border-line px-1.5 text-[11px] text-muted hover:border-chili hover:text-chili">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* A point has been clicked and is waiting for a name. The picker sits at
          the point so it is obvious which face is being named. */}
      {placing && (
        <div className="pointer-events-auto absolute z-20"
             style={{ left: `${placing.x * 100}%`, top: `${placing.y * 100}%` }}>
          <div className="size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/20" />
          <div className="absolute left-1/2 top-4 w-64 max-w-[70vw] -translate-x-1/2 rounded-xl border border-line bg-surface p-2.5 shadow-2xl">
            <MemberPicker options={options} autoFocus
                          placeholder={t("gallery.tagWho")}
                          onPick={onPlace} />
            <button onClick={onCancel}
                    className="mt-2 text-[12px] text-muted hover:text-ink">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
