"use client";

import { useEffect, useRef, useState } from "react";
import type { PartyBlock } from "@/lib/party";
import { blockId } from "@/lib/party";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { useDropTarget } from "@/components/ui/DropZone";
import { createClient } from "@/lib/supabase/client";
import { uploadPartyImage } from "@/lib/party-db";
import { useLang } from "@/lib/i18n";
import Linkify from "@/components/Linkify";
import { clips, youtubeSrc } from "@/lib/youtube";

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
          if (!b.text?.trim()) return null;
          /*
           * The videos in this paragraph, under it.
           *
           * A raid plan is half video — somebody's phase-two explanation at
           * 4:12 — and a link to one is a page you have to leave to watch.
           * Capped at two: a paragraph with six in it is a playlist, and six
           * players loading at once is what the write-up costs everybody who
           * opens the party.
           */
          const seen = clips(b.text);
          return (
            <div key={b.id} className="flex flex-col gap-2">
              {/* Newlines kept: somebody who pressed return meant it, and a
                  raid plan is mostly short lines. */}
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink/90">
                <Linkify text={b.text} />
              </p>
              {seen.map((v) => (
                <div key={v.id}
                     className="aspect-video w-full max-w-xl overflow-hidden rounded-lg border border-line">
                  <iframe src={youtubeSrc(v)} title="YouTube" loading="lazy"
                          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                          allowFullScreen
                          className="size-full" />
                </div>
              ))}
            </div>
          );
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
              <figcaption className="text-[13.5px] text-muted">{b.caption}</figcaption>
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

  /*
   * Pictures that are still on their way up.
   *
   * Held here rather than on the block, because a block is what gets saved and
   * "this one is still uploading" is a fact about this browser in this minute.
   * The block exists from the moment somebody drops the file — in the place
   * they dropped it — and fills in when the upload lands.
   */
  const [pending, setPending] = useState<Set<string>>(new Set());

  /** Which textarea to put the cursor in after the next render. */
  const [focusId, setFocusId] = useState<string | null>(null);
  const boxes = useRef<Record<string, HTMLTextAreaElement | null>>({});

  /*
   * The list as it is right now, not as it was when React last rendered.
   *
   * Two things need this. A handler that runs across awaits would otherwise
   * write into whatever the list was when the drop started, losing every
   * picture but the last when four arrive together. And a handler that changes
   * the list twice — which pasting into a sentence does, splitting it and then
   * putting the picture in the gap — would build the second change from the
   * list before the first, throwing the first away.
   *
   * So every write goes through commit, which moves the ref forward at the same
   * moment it tells the parent. The alternative was remembering, at every call
   * site, which of them had already happened.
   */
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const commit = (next: PartyBlock[]) => { bodyRef.current = next; onChange(next); };

  const set = (id: string, patch: Partial<PartyBlock>) =>
    commit(bodyRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const drop = (id: string) =>
    commit(bodyRef.current.filter((b) => b.id !== id));
  const move = (i: number, d: number) => {
    const to = i + d;
    if (to < 0 || to >= body.length) return;
    const next = [...body];
    [next[i], next[to]] = [next[to], next[i]];
    commit(next);
  };

  /*
   * Somewhere to type, always.
   *
   * A write-up that ends in a picture has nowhere to put the sentence after it,
   * and an empty one has nowhere to start. Both are the same fix: the document
   * ends in a line you can write on, the way a document does. An empty trailing
   * line costs nothing — the reader skips it and hasBody does not count it.
   */
  useEffect(() => {
    const last = body[body.length - 1];
    if (last && last.kind === "text") return;
    commit([...body, { id: blockId(), kind: "text", text: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body.length && body[body.length - 1]?.kind, body.length]);

  useEffect(() => {
    if (!focusId) return;
    const el = boxes.current[focusId];
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    setFocusId(null);
  }, [focusId, body]);

  /** A textarea that is exactly as tall as what is in it. */
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(28, el.scrollHeight)}px`;
  };

  /*
   * Uploaded as they are dropped, not when the party is saved.
   *
   * Somebody who drops four screenshots and then writes three paragraphs
   * around them has given the upload a minute of their own time to happen in;
   * doing it on the button instead would spend that minute after they had
   * finished, staring at a form that looked stuck.
   *
   * The block goes in first, empty, where it was put. Uploading and then
   * inserting would drop the picture at the end of whatever the list had become
   * — which is the one place the person deliberately did not put it.
   */
  const place = async (files: File[], afterId: string | null) => {
    if (!supabase) return;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setErr(null);

    const made = images.map(() => ({ id: blockId(), kind: "image" as const }));
    const at = afterId
      ? bodyRef.current.findIndex((b) => b.id === afterId) + 1
      : bodyRef.current.length;
    const next = [...bodyRef.current];
    next.splice(at, 0, ...made);
    commit(next);
    setPending((v) => new Set([...v, ...made.map((m) => m.id)]));
    setBusy((n) => n + images.length);

    await Promise.all(images.map(async (f, i) => {
      const r = await uploadPartyImage(supabase, userId, f);
      setBusy((n) => n - 1);
      setPending((v) => { const s2 = new Set(v); s2.delete(made[i].id); return s2; });
      if ("error" in r) {
        setErr(r.error === "too-big" ? t("pf.tooBig")
          : r.error === "not-image" ? t("pf.notPicture") : r.error);
        // The placeholder goes with it. A frame that will never hold anything
        // is worse than the picture simply not having arrived.
        drop(made[i].id);
        return;
      }
      set(made[i].id, { url: r.url });
    }));
  };

  /*
   * A picture pasted into a sentence goes into the sentence.
   *
   * Which is the whole of what "place them freely" means: the line is cut where
   * the cursor was, the picture goes in the gap, and the rest of the line
   * carries on underneath it. Appending to the end — which is what this did —
   * meant writing the paragraph, pasting, and then walking the picture up
   * through the document one press at a time.
   */
  const pasteInto = async (e: React.ClipboardEvent<HTMLTextAreaElement>, b: PartyBlock) => {
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();

    const el = e.currentTarget;
    const cut = el.selectionStart ?? (b.text ?? "").length;
    const text = b.text ?? "";
    const before = text.slice(0, cut);
    const after = text.slice(cut);

    const tail = { id: blockId(), kind: "text" as const, text: after };
    const list = bodyRef.current.map((x) => (x.id === b.id ? { ...x, text: before } : x));
    const at = list.findIndex((x) => x.id === b.id) + 1;
    list.splice(at, 0, tail);
    commit(list);
    // Between the two halves, which is where the cursor was.
    await place(files, b.id);
  };

  /** Backspace on an empty line joins it to the one above, as a document does. */
  const backspace = (e: React.KeyboardEvent<HTMLTextAreaElement>, i: number, b: PartyBlock) => {
    if (e.key !== "Backspace") return;
    const el = e.currentTarget;
    if (el.selectionStart !== 0 || el.selectionEnd !== 0) return;
    if ((b.text ?? "").length) return;
    const prev = body[i - 1];
    if (!prev) return;
    e.preventDefault();
    commit(body.filter((x) => x.id !== b.id));
    if (prev.kind === "text") setFocusId(prev.id);
  };

  const { over, handlers } = useDropTarget({ onFiles: (f) => void place(f, null) });

  return (
    <div {...handlers}
         className={`flex flex-col gap-1 rounded-lg border p-2.5 transition-colors ${
           over ? "border-accent bg-accent/5" : "border-line bg-bg/40"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
          {t("pf.plan")}
        </span>
        {busy > 0 && (
          <span className="text-[13px] text-muted">
            {t("pf.uploading", { n: busy })}
          </span>
        )}
        {err && <span className="text-[13px] text-chili">{err}</span>}
      </div>

      {body.map((b, i) => (
        <BlockRow key={b.id} block={b} index={i} last={i === body.length - 1}
                  pending={pending.has(b.id)}
                  onFiles={(f) => void place(f, b.id)}
                  onMove={(d) => move(i, d)} onDrop={() => drop(b.id)}>
          {b.kind === "text" ? (
            /*
              * No border and no box.
              *
              * Three bordered textareas stacked up read as a form with three
              * questions on it; the same three without borders read as a
              * document with three paragraphs in it, which is what this is.
              */
            <textarea
              ref={(el) => { boxes.current[b.id] = el; grow(el); }}
              value={b.text ?? ""} rows={1}
              onChange={(e) => { grow(e.currentTarget); set(b.id, { text: e.target.value.slice(0, 2000) }); }}
              onPaste={(e) => void pasteInto(e, b)}
              onKeyDown={(e) => backspace(e, i, b)}
              placeholder={i === 0 ? t("pf.planText") : ""}
              className="w-full resize-none border-0 bg-transparent px-1 py-0.5 text-[15px] leading-relaxed text-ink outline-none focus:bg-surface/40 focus-visible:outline-none placeholder:text-muted" />
          ) : (
            <div className="flex flex-col gap-1.5 py-1">
              {b.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.url} alt=""
                     className="max-h-56 w-auto self-start rounded-lg border border-line object-contain" />
              ) : (
                // The gap the picture is going to fill, so the document does
                // not jump when it arrives.
                <span className="skeleton flex h-32 w-56 items-center justify-center rounded-lg text-[13px] text-muted">
                  {t("pf.uploading", { n: 1 })}
                </span>
              )}
              <input value={b.caption ?? ""}
                     onChange={(e) => set(b.id, { caption: e.target.value.slice(0, 140) })}
                     placeholder={t("pf.caption")}
                     className="w-full max-w-md border-0 bg-transparent px-1 text-[13.5px] italic text-muted outline-none focus:bg-surface/40 focus-visible:outline-none placeholder:text-muted/60" />
            </div>
          )}
        </BlockRow>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button"
                onClick={() => {
                  const b = { id: blockId(), kind: "text" as const, text: "" };
                  commit([...body, b]);
                  setFocusId(b.id);
                }}
                className="rounded-lg border border-line px-3 py-1 text-[14px] text-muted hover:border-accent/60 hover:text-ink">
          {t("pf.paragraph")}
        </button>
        <span className="text-[13px] text-muted">
          {t("pf.dropAnywhere")}
        </span>
      </div>
    </div>
  );
}

/**
 * One block in the document, with the controls that belong to it.
 *
 * The controls appear on hover rather than sitting beside every block: a
 * write-up with four blocks in it had four columns of arrows down the side,
 * which is more furniture than document. They are always there on a touch
 * screen, where there is no hover to wait for.
 *
 * Its own drop target, so a picture dropped on a paragraph lands after that
 * paragraph rather than at the end. useDropTarget stops the event at the
 * innermost target, which is what keeps the container from also taking it —
 * the bug that once turned five dropped files into ten.
 */
function BlockRow(
  { block, index, last, pending, children, onFiles, onMove, onDrop }: {
    block: PartyBlock;
    index: number;
    last: boolean;
    pending: boolean;
    children: React.ReactNode;
    onFiles: (files: File[]) => void;
    onMove: (d: number) => void;
    onDrop: () => void;
  },
) {
  const { t } = useLang();
  const { over, handlers } = useDropTarget({ onFiles });

  return (
    <div {...handlers}
         className={`group/blk relative flex items-start gap-1 rounded-md ${
           over ? "bg-accent/10 ring-1 ring-accent/40" : ""}`}>
      <div className="min-w-0 flex-1">{children}</div>

      <div className="absolute right-0 top-0 flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/blk:opacity-100 max-sm:opacity-60">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
                aria-label={t("pf.moveUp")}
                className="rounded border border-line bg-surface px-1.5 text-[12.5px] text-muted hover:text-ink disabled:opacity-30">
          ↑
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={last}
                aria-label={t("pf.moveDown")}
                className="rounded border border-line bg-surface px-1.5 text-[12.5px] text-muted hover:text-ink disabled:opacity-30">
          ↓
        </button>
        <button type="button" onClick={onDrop} disabled={pending}
                aria-label={t("pf.remove")}
                className="rounded border border-chili/50 bg-surface px-1.5 text-[12.5px] text-chili hover:bg-chili/10 disabled:opacity-30">
          ✕
        </button>
      </div>
    </div>
  );
}
