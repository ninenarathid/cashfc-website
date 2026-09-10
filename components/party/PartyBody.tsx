"use client";

import { useRef, useState } from "react";
import type { PartyBlock } from "@/lib/party";
import { blockId } from "@/lib/party";
import ImageLightbox from "@/components/ui/ImageLightbox";
import DropZone, { useDropTarget } from "@/components/ui/DropZone";
import { createClient } from "@/lib/supabase/client";
import { uploadPartyImage } from "@/lib/party-db";
import { useLang } from "@/lib/i18n";

/**
 * The write-up on a party: paragraphs and pictures, read and written.
 *
 * Two components in one file because they are two views of the same list and
 * the shapes have to agree — a picture with a caption under it when it is being
 * read is a picture with a caption field under it when it is being written, and
 * the day those drift apart is the day somebody writes something that does not
 * come out the way they left it.
 */

/** The write-up as everybody else sees it. */
export function PartyBody({ body }: { body: PartyBlock[] }) {
  const shots = body.filter((b) => b.kind === "image" && b.url).map((b) => b.url!);
  const [zoom, setZoom] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2.5">
      {body.map((b) => {
        if (b.kind === "text") {
          return b.text?.trim() ? (
            // Newlines kept: somebody who pressed return meant it, and a raid
            // plan is mostly short lines.
            <p key={b.id} className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/90">
              {b.text}
            </p>
          ) : null;
        }
        if (!b.url) return null;
        const n = shots.indexOf(b.url);
        return (
          <figure key={b.id} className="flex flex-col gap-1">
            <button onClick={() => setZoom(n)} className="self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt={b.caption ?? ""}
                   className="max-h-80 w-auto rounded-lg border border-line object-contain" />
            </button>
            {b.caption && (
              <figcaption className="text-[12px] text-muted">{b.caption}</figcaption>
            )}
          </figure>
        );
      })}

      {zoom !== null && (
        <ImageLightbox images={shots} at={zoom} onMove={setZoom}
                       onClose={() => setZoom(null)} />
      )}
    </div>
  );
}

/**
 * Writing one.
 *
 * Blocks are added at the end and moved with two arrows. No drag to reorder:
 * this is a list of three or four things, and a drag handle would be more
 * machinery than the whole feature is worth.
 *
 * Dropping pictures anywhere on the editor appends them, which is what somebody
 * with four screenshots does — they drop all four and then write around them.
 */
export function BodyEditor(
  { body, onChange, userId }: {
    body: PartyBlock[];
    onChange: (b: PartyBlock[]) => void;
    /** Whose folder the screenshots are filed in. */
    userId: string;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const add = (b: PartyBlock) => onChange([...body, b]);
  const set = (id: string, patch: Partial<PartyBlock>) =>
    onChange(body.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const drop = (id: string) => onChange(body.filter((b) => b.id !== id));
  const move = (i: number, d: number) => {
    const to = i + d;
    if (to < 0 || to >= body.length) return;
    const next = [...body];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  /*
   * Uploaded as they are dropped, not when the party is saved.
   *
   * Somebody who drops four screenshots and then writes three paragraphs
   * around them has given the upload a minute of their own time to happen in;
   * doing it on the button instead would spend that minute after they had
   * finished, staring at a form that looked stuck.
   */
  const takeFiles = async (files: File[]) => {
    if (!supabase) return;
    setBusy((n) => n + files.length);
    setErr(null);
    for (const f of files) {
      const r = await uploadPartyImage(supabase, userId, f);
      setBusy((n) => n - 1);
      if ("error" in r) {
        setErr(r.error === "too-big" ? "That picture is too large."
          : r.error === "not-image" ? "That is not a picture."
          : r.error);
        continue;
      }
      onChange([...bodyRef.current, {
        id: blockId(), kind: "image" as const, url: r.url,
      }]);
    }
  };

  // The callback above runs over several awaits and would otherwise append to
  // whatever the list was when the drop started, losing every picture but the
  // last when four arrive together.
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const { over, handlers } = useDropTarget({ onFiles: takeFiles });

  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";

  return (
    <div {...handlers}
         className={`flex flex-col gap-2 rounded-lg border p-2.5 transition-colors ${
           over ? "border-accent bg-accent/5" : "border-line bg-bg/40"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          {t("pf.plan")}
        </span>
        {busy > 0 && (
          <span className="text-[11.5px] text-muted">
            {t("pf.uploading", { n: busy })}
          </span>
        )}
        {err && <span className="text-[11.5px] text-chili">{err}</span>}
      </div>

      {body.map((b, i) => (
        <div key={b.id} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {b.kind === "text" ? (
              <textarea value={b.text ?? ""} rows={3}
                        onChange={(e) => set(b.id, { text: e.target.value.slice(0, 2000) })}
                        placeholder={t("pf.planText")}
                        className={`${sel} w-full placeholder:text-muted`} />
            ) : (
              <div className="flex flex-col gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt=""
                     className="max-h-56 w-auto self-start rounded-lg border border-line object-contain" />
                <input value={b.caption ?? ""}
                       onChange={(e) => set(b.id, { caption: e.target.value.slice(0, 140) })}
                       placeholder={t("pf.caption")}
                       className={`${sel} w-full placeholder:text-muted`} />
              </div>
            )}
          </div>

          {/* Up, down, gone. Stacked beside the block rather than under it, so
              a column of three blocks has one column of controls. */}
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label={t("pf.moveUp")}
                    className="rounded border border-line px-1.5 text-[11px] text-muted hover:text-ink disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === body.length - 1}
                    aria-label={t("pf.moveDown")}
                    className="rounded border border-line px-1.5 text-[11px] text-muted hover:text-ink disabled:opacity-30">
              ↓
            </button>
            <button type="button" onClick={() => drop(b.id)} aria-label={t("pf.remove")}
                    className="rounded border border-chili/50 px-1.5 text-[11px] text-chili hover:bg-chili/10">
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button"
                onClick={() => add({ id: blockId(), kind: "text", text: "" })}
                className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:border-accent/60 hover:text-ink">
          {t("pf.paragraph")}
        </button>
        <span className="text-[11.5px] text-muted">
          {t("pf.dropAnywhere")}
        </span>
      </div>

      {/* The full zone only while there is nothing yet: once the write-up has
          something in it, a dashed rectangle in the middle of the form is a
          second empty box under the one being filled. */}
      {!body.length && (
        <DropZone size="sm" multiple paste={false} onFiles={takeFiles}
                  title={t("pf.dropShots")}
                  hint={t("pf.dropShotsHint")} />
      )}
    </div>
  );
}
