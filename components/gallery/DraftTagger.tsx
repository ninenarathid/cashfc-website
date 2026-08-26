"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import MemberPicker, { type MemberOption } from "@/components/gallery/MemberPicker";

/** A pin placed before the post it belongs to exists. */
export interface DraftTag { id: number; name: string; x: number; y: number }

/**
 * Naming the people in a picture while it is still a file on your machine.
 *
 * Tagging used to begin after posting, which put it on the wrong side of the one
 * moment anybody remembers who is in the shot. You have the picture open, you
 * know it is Aqua on the left, and then you post and the thought is gone. So the
 * pins are placed here and written the instant the post exists.
 *
 * The pin is a point on the picture, not a name in a list, so it has to be
 * placed on a picture large enough to aim at — a face in a thumbnail is four
 * pixels wide. The preview opens to a workable size and the coordinates are
 * fractions of it, which is the same thing they will mean on a phone later.
 *
 * These are drawn always, unlike the pins on a posted picture: this is the
 * moment when the markers are the subject rather than something over the top of
 * it, and somebody placing them needs to see what they have already done.
 */
export default function DraftTagger(
  { src, tags, options, onChange, onClose }: {
    src: string;
    tags: DraftTag[];
    options: MemberOption[];
    onChange: (tags: DraftTag[]) => void;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const [placing, setPlacing] = useState<{ x: number; y: number } | null>(null);

  function place(e: React.MouseEvent<HTMLDivElement>) {
    // Only the photograph itself, so a click meant for a pin's ✕ is not also a
    // request to put another pin underneath it.
    if (!(e.target instanceof HTMLImageElement)) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setPlacing({
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-accent/40 bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-data text-[11px] uppercase tracking-[0.14em] text-accent">
          {t("gallery.tagClickFace")}
        </div>
        <button onClick={onClose}
                className="rounded-md border border-line px-2.5 py-0.5 text-[12px] text-muted hover:border-muted hover:text-ink">
          {t("gallery.tagDone")}
        </button>
      </div>

      <div onClick={place}
           className="relative mx-auto w-fit max-w-full cursor-crosshair">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false}
             className="block max-h-[55vh] w-auto max-w-full rounded-lg border border-line" />

        {tags.map((g) => (
          <div key={`${g.id}-${g.x}`} className="absolute"
               style={{ left: `${g.x * 100}%`, top: `${g.y * 100}%` }}>
            <div className="size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/85 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            <div className="absolute left-0 top-5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-line bg-bg/85 py-0.5 pl-2.5 pr-1 font-data text-[11.5px] text-ink backdrop-blur">
              {g.name}
              <button onClick={() => onChange(tags.filter((x) => x !== g))}
                      aria-label={t("gallery.tagRemove")}
                      className="rounded-full border border-line px-1 text-[10px] text-muted hover:border-chili hover:text-chili">
                ✕
              </button>
            </div>
          </div>
        ))}

        {placing && (
          <div className="absolute z-20"
               style={{ left: `${placing.x * 100}%`, top: `${placing.y * 100}%` }}>
            <div className="size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/20" />
            <div className="absolute left-1/2 top-5 w-60 max-w-[70vw] -translate-x-1/2 rounded-xl border border-line bg-surface p-2.5 shadow-2xl">
              <MemberPicker options={options} autoFocus
                            exclude={tags.map((g) => g.id)}
                            placeholder={t("gallery.tagWho")}
                            onPick={(o) => {
                              onChange([...tags, { id: o.id, name: o.name, ...placing }]);
                              setPlacing(null);
                            }} />
              <button onClick={() => setPlacing(null)}
                      className="mt-2 text-[12px] text-muted hover:text-ink">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted">{t("gallery.tagHint")}</p>
    </div>
  );
}
