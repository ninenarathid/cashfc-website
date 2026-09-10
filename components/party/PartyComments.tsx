"use client";

import { useState } from "react";
import type { PartyComment } from "@/lib/party";
import { blockId } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import { useAvatarOverrides } from "@/lib/avatars";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { useDropTarget } from "@/components/ui/DropZone";
import { createClient } from "@/lib/supabase/client";
import { uploadPartyImage } from "@/lib/party-db";
import { useLang } from "@/lib/i18n";

/**
 * Replies on a party.
 *
 * The thing a raid lead posts is a plan, and the thing everybody else has is a
 * question about it: can I bring Reaper, is this the old strat, I am ten minutes
 * late. That conversation currently happens in Discord where it is four
 * messages up by the time the second person asks the same thing, and the answer
 * belongs under the plan it is about.
 *
 * Pictures on a reply, for the same reason the plan has them — "do you mean
 * this spot?" is a screenshot, not a sentence.
 */
export default function PartyComments(
  { comments, me, userId, onAdd }: {
    comments: PartyComment[];
    /** Whoever is reading, or null if nobody is signed in. */
    me: PersonOption | null;
    /** Their account, which the pictures are filed under. */
    userId: string | null;
    onAdd: (c: PartyComment) => void | Promise<void>;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const face = (id: number | null, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

  const [text, setText] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [zoom, setZoom] = useState<{ images: string[]; at: number } | null>(null);

  const [supabase] = useState(createClient);
  const [busy, setBusy] = useState(0);

  // Uploaded on the drop, the same as the write-up above: by the time somebody
  // has typed "do you mean this spot?" the picture is already stored.
  const take = async (files: File[]) => {
    if (!supabase || !userId) return;
    setBusy((n) => n + files.length);
    for (const f of files) {
      const r = await uploadPartyImage(supabase, userId, f);
      setBusy((n) => n - 1);
      if (!("error" in r)) setShots((v) => [...v, r.url]);
    }
  };
  const { over, handlers } = useDropTarget({ onFiles: take });

  const send = () => {
    if (!text.trim() && !shots.length) return;
    void onAdd({
      id: blockId(),
      author: me
        ? { characterId: me.id, name: me.name, avatar: me.avatar }
        // Signed in but with no character verified. The reply is still
        // theirs to make; it simply has no face to put on it.
        : { characterId: null, name: "You", avatar: null },
      text: text.trim(),
      images: shots.length ? shots : undefined,
      at: new Date().toISOString(),
    });
    setText("");
    setShots([]);
  };

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-3">
      <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
        {comments.length ? `${comments.length} comment${comments.length > 1 ? "s" : ""}`
                         : "Comments"}
      </span>

      {comments.map((c) => {
        const src = face(c.author.characterId, c.author.avatar);
        return (
          <article key={c.id} className="flex gap-2.5">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" width={30} height={30}
                   className="size-[30px] shrink-0 rounded-full border border-line object-cover" />
            ) : (
              <span className={`grid size-[30px] shrink-0 place-items-center rounded-full text-[12px] text-muted ${
                      c.author.characterId == null
                        ? "border border-dashed border-line" : "border border-line bg-card"}`}>
                {c.author.characterId == null ? "?" : ""}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] text-ink">{c.author.name}</span>
                <span className="font-data text-[10.5px] text-muted">
                  {fmtDateTime(c.at)}
                </span>
              </span>
              {c.text && (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/85">
                  {c.text}
                </p>
              )}
              {!!c.images?.length && (
                <div className="flex flex-wrap gap-2">
                  {c.images.map((src2, n) => (
                    <button key={src2} onClick={() => setZoom({ images: c.images!, at: n })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src2} alt=""
                           className="h-24 w-auto rounded-md border border-line object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}

      {/* Writing one. Dropping a picture anywhere on the box attaches it, which
          is where somebody's cursor already is when they have the screenshot. */}
      <div {...handlers}
           className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-colors ${
             over ? "border-accent bg-accent/5" : "border-line bg-bg/40"}`}>
        <textarea value={text} rows={2}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  placeholder={t("pf.commentBox")}
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
        {!!shots.length && (
          <div className="flex flex-wrap gap-2">
            {shots.map((src, n) => (
              <span key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-20 w-auto rounded-md border border-line" />
                <button onClick={() => setShots((v) => v.filter((_, i) => i !== n))}
                        aria-label={t("pf.remove")}
                        className="absolute right-1 top-1 rounded border border-chili/60 bg-bg/85 px-1 text-[11px] text-chili">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={send} disabled={(!text.trim() && !shots.length) || busy > 0}
                  className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[12.5px] text-accent hover:bg-accent/25 disabled:opacity-40">
            {t("pf.comment")}
          </button>
          <span className="text-[11.5px] text-muted">
            {busy > 0 ? t("pf.uploading", { n: busy }) : t("pf.orDropShot")}
          </span>
        </div>
      </div>

      {zoom && (
        <ImageLightbox images={zoom.images} at={zoom.at}
                       onMove={(at) => setZoom({ ...zoom, at })}
                       onClose={() => setZoom(null)} />
      )}
    </section>
  );
}
