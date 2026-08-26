"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import type { GalleryTag } from "@/lib/gallery";
import MemberPicker, { type MemberOption } from "@/components/gallery/MemberPicker";

/**
 * The tags on a picture: nothing to see until you go looking.
 *
 * There is no marker drawn on the photograph. A scatter of rings across
 * somebody's GPose shot is the site talking over the picture, and the picture is
 * the entire reason anybody opened it. What exists is an invisible catch around
 * each point; move the pointer onto a face that has been tagged and the ring
 * fades up under the cursor with the name beside it, and moving away takes it
 * away again. The screenshot is never covered by anything nobody asked for.
 *
 * Hovering and clicking mean different things. A hover is a glance — it shows
 * the card and takes it back when you leave. A click is a decision, so the card
 * stays put and its name can be walked to and clicked through to the member's
 * page; a card that vanished as the pointer travelled to the link would make
 * that trip impossible. Clicking anywhere else on the picture puts it away.
 *
 * The catches are deliberately larger than the rings they reveal — a face in a
 * group shot is a small target, and a tag you cannot land on may as well not be
 * there. Nothing is drawn for them, so their size costs the picture nothing.
 *
 * The names are also written out under the picture, which is how somebody on a
 * phone, or on a keyboard, or reading with a screen reader finds out who is in
 * it without hunting the photograph for hotspots.
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
    /** Character faces by id, for the card a tag opens. */
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
  // A glance and a decision, kept apart: leaving with the pointer clears the
  // first and has no business clearing the second.
  const [hover, setHover] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* While a card is held open, the rest of the picture is the way out of
          it. Rendered before the tags so it never sits on top of one. */}
      {held != null && !placing && (
        <div className="pointer-events-auto absolute inset-0"
             onClick={() => setHeld(null)} />
      )}

      {tags.map((g) => {
        const face = faces[g.character_id];
        const pending = !g.confirmed_at;
        const open = held === g.id || hover === g.id;
        return (
          <div key={g.id} className="absolute"
               style={{ left: `${(g.x ?? 0) * 100}%`, top: `${(g.y ?? 0) * 100}%` }}>
            {/* The catch: a generous, entirely invisible target centred on the
                point. The ring inside it is the only thing ever drawn, and only
                while somebody is pointing at it. */}
            <button onMouseEnter={() => setHover(g.id)}
                    onMouseLeave={() => setHover((n) => (n === g.id ? null : n))}
                    onFocus={() => setHover(g.id)}
                    onBlur={() => setHover((n) => (n === g.id ? null : n))}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeld((n) => (n === g.id ? null : g.id));
                    }}
                    aria-label={g.name}
                    className="pointer-events-auto absolute left-0 top-0 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
              <span className={`size-9 rounded-full border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"} ${
                pending ? "border-dashed border-accent" : "border-ink/85"}`} />
            </button>

            {open && (
              // Above the point, so the ring somebody is pointing at is never
              // the thing the card covers.
              <div onClick={(e) => e.stopPropagation()}
                   className="pointer-events-auto absolute bottom-0 left-0 z-10 mb-7 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/95 py-1.5 pl-1.5 pr-2.5 shadow-xl backdrop-blur">
                  {face?.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face.avatar} alt=""
                         className="size-9 shrink-0 rounded-full border border-line object-cover" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/member/${g.character_id}`}
                          className="block whitespace-nowrap font-data text-[13px] font-semibold text-ink no-underline hover:text-accent hover:underline">
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

      {/* A point has been clicked and is waiting for a name. This one is drawn,
          because it is the only moment when the marker is the subject. */}
      {placing && (
        <div className="pointer-events-auto absolute z-20"
             style={{ left: `${placing.x * 100}%`, top: `${placing.y * 100}%` }}>
          <div className="size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/20" />
          <div className="absolute left-1/2 top-5 w-64 max-w-[70vw] -translate-x-1/2 rounded-xl border border-line bg-surface p-2.5 shadow-2xl">
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
