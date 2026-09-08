"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Dropping a picture onto the page, in the one shape everybody already knows.
 *
 * Every upload on this site used to be a button that opened a file dialog, and
 * a file dialog is the slowest way to reach a file that is already under the
 * cursor or already on the clipboard. An FFXIV screenshot lives four folders
 * down under My Documents; a screenshot of a bug was taken ten seconds ago and
 * has never been a file at all.
 *
 * So: a dashed rectangle, a cloud, and a button underneath for anybody who
 * would still rather browse. Not an invention — it is what the rest of the
 * internet settled on years ago, and the whole value of it is that nobody has
 * to be told what it does.
 *
 * The drag logic lives here rather than in five components because it has one
 * genuinely fiddly part. dragenter and dragleave fire for every element the
 * pointer crosses inside the zone, so a plain boolean turns the highlight off
 * the moment the file passes over the icon on its way in; counting how deep it
 * has gone is what holds it still. Written five times, that would have been
 * fixed in one place and left broken in four.
 */

/**
 * The drag handlers for anything that should accept a dropped picture.
 *
 * For the places that already draw the thing being replaced — a member's
 * portrait, the cover behind their name — where a dashed rectangle would be a
 * second box beside a picture that is already exactly the right target.
 */
export function useDropTarget(
  { onFiles, disabled = false }:
  { onFiles: (files: File[]) => void; disabled?: boolean },
) {
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const holding = (e: React.DragEvent) => !!e.dataTransfer?.types?.includes("Files");

  /*
   * The innermost target owns the drag, and its ancestors hear none of it.
   *
   * Drag events bubble like any other, and the gallery uploader is a card that
   * accepts a drop anywhere on it with the dashed zone sitting inside that card.
   * Dropping five files on the zone ran the zone's handler and then the card's,
   * and five pictures became ten. Reported from the FC: "ลาก 5 ไฟล์จะกลายเป็น
   * 10 ไฟล์ครับ แต่ถ้ากด Upload แล้วเลือกไม่เป็น" -- the file dialog was fine,
   * because a dialog fires one change event and cannot bubble into anything.
   *
   * Stopping the drop alone would have left the card lit up forever: its
   * dragenter had already run and counted, and the drop that would have reset
   * it never arrived. So all four are stopped together and the counter on the
   * outer target is never started in the first place. One target highlights,
   * one target receives, and they are the same one.
   */
  const mine = (e: React.DragEvent) => e.stopPropagation();

  return {
    /** True while a file is being held over it, for the highlight. */
    over,
    handlers: {
      onDragEnter: (e: React.DragEvent) => {
        if (disabled || !holding(e)) return;
        mine(e);
        depth.current += 1;
        setOver(true);
      },
      // Without this the browser opens the file instead of handing it over,
      // which navigates away from whatever was half-written on the page.
      onDragOver: (e: React.DragEvent) => {
        if (disabled || !holding(e)) return;
        mine(e);
        e.preventDefault();
      },
      onDragLeave: (e: React.DragEvent) => {
        if (disabled) return;
        mine(e);
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        mine(e);
        depth.current = 0;
        setOver(false);
        if (disabled) return;
        const files = [...(e.dataTransfer?.files ?? [])]
          .filter((f) => f.type.startsWith("image/"));
        if (files.length) onFiles(files);
      },
    },
  };
}

/**
 * A picture on the clipboard, pasted straight in.
 *
 * Ignores a paste going into a text box, with one exception: a textarea, which
 * is what a message is written in, and pasting a screenshot into the words you
 * are typing about it is exactly where this belongs.
 */
export function usePasteImages(
  onFiles: (files: File[]) => void,
  active = true,
  /**
   * The part of the page this one is the uploader for.
   *
   * Only needed where two of these can be on screen at once. The feedback page
   * has an attach box on the message you are writing and another on the reply
   * you are typing, and both listened to the whole window: one screenshot went
   * into both boxes, and then into two different messages.
   */
  scope?: { current: HTMLElement | null },
) {
  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.isContentEditable)) return;
      const found = [...(e.clipboardData?.files ?? [])]
        .filter((f) => f.type.startsWith("image/"));
      if (!found.length) return;
      e.preventDefault();

      // These listen on the window, so stopPropagation cannot separate them the
      // way it separates two nested drop targets -- there is nothing in between
      // to stop. The event itself carries the answer: whoever takes it marks it,
      // and everybody else stands down.
      const seen = e as ClipboardEvent & { __tookImages?: boolean };
      const take = () => {
        if (seen.__tookImages) return;
        seen.__tookImages = true;
        onFiles(found);
      };

      // Pasted into the box this one belongs to: it is plainly meant for here.
      if (!scope || (el && scope.current?.contains(el))) { take(); return; }

      // Pasted somewhere else. Every listener for one event runs before any
      // microtask does, so waiting a tick lets the box that was actually being
      // typed in claim it first, and this only picks up a paste that landed
      // nowhere in particular.
      queueMicrotask(take);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });   // Every render: onFiles closes over current state, and there is one
        // listener either way.
}

export default function DropZone(
  { onFiles, multiple = false, disabled = false, size = "lg",
    title, hint, paste = true, className = "" }: {
    onFiles: (files: File[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    /** "lg" is a panel of its own; "sm" sits in a form beside other fields. */
    size?: "lg" | "sm";
    /** Overrides the heading, for a zone that takes one particular picture. */
    title?: string;
    /** The line underneath: what it accepts, and how big. */
    hint?: string;
    /** Off where two zones could be on screen at once and neither owns Ctrl+V. */
    paste?: boolean;
    className?: string;
  },
) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const { over, handlers } = useDropTarget({ onFiles, disabled });
  usePasteImages(onFiles, paste && !disabled);

  const lg = size === "lg";

  return (
    <div {...handlers}
         onClick={() => { if (!disabled) input.current?.click(); }}
         className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${
           lg ? "gap-3 px-4 py-12" : "gap-2 px-4 py-6"} ${
           disabled ? "border-line opacity-50"
             : over ? "border-accent bg-accent/10"
                    : "border-line hover:border-accent/60 hover:bg-card/40"} ${className}`}>
      <input ref={input} type="file" accept="image/*" multiple={multiple}
             className="hidden"
             onChange={(e) => {
               const chosen = [...(e.target.files ?? [])];
               e.target.value = "";
               if (chosen.length) onFiles(chosen);
             }} />

      <svg viewBox="0 0 24 24" aria-hidden width={lg ? 46 : 30} height={lg ? 46 : 30}
           fill="none" stroke="currentColor" strokeWidth="1.5"
           strokeLinecap="round" strokeLinejoin="round"
           className={over ? "text-accent" : "text-muted"}>
        <path d="M6.5 18.5A4.5 4.5 0 0 1 6 9.55a6 6 0 0 1 11.6-1.6A4.25 4.25 0 0 1 18 16.4" />
        <path d="M12 12v8" />
        <path d="m8.75 15.25 3.25-3.25 3.25 3.25" />
      </svg>

      <div className={`font-display font-semibold ${lg ? "text-[15px]" : "text-[13.5px]"} ${
        over ? "text-accent" : "text-ink"}`}>
        {over ? t("drop.now") : title ?? t("drop.title")}
      </div>

      {/* A rule with a word in it, so "or" reads as the second of two ways in
          rather than as another line of the sentence above it. */}
      <div className="flex w-full max-w-[16rem] items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
          {t("common.or")}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button type="button" disabled={disabled}
              onClick={(e) => { e.stopPropagation(); input.current?.click(); }}
              className={`rounded-lg border border-accent bg-accent/15 text-accent transition-colors hover:bg-accent/25 disabled:opacity-50 ${
                lg ? "px-4 py-1.5 text-[13px]" : "px-3 py-1 text-[12.5px]"}`}>
        {t("drop.browse")}
      </button>

      <p className="text-[11.5px] leading-relaxed text-muted">
        {paste && <>{t("drop.paste")}<span className="mx-1.5 opacity-50">·</span></>}
        {hint ?? t("gallery.limits")}
      </p>
    </div>
  );
}
