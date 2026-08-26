"use client";

import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

/**
 * A pause before something that cannot be taken back easily.
 *
 * The browser's own confirm() would have done the job and is used elsewhere in
 * this codebase, but it arrives as a grey system box in the middle of a dark
 * page and says nothing about what is about to happen beyond the sentence in it.
 * This one names the action on its own button — Delete, Hide — so the answer to
 * "what did I just agree to" is on the thing being clicked rather than in a line
 * of text above it.
 *
 * Escape cancels and the confirming button takes focus, so the whole thing can
 * be answered without reaching for the mouse, and answered wrong only on purpose.
 */
export default function ConfirmDialog(
  { message, confirmLabel, danger = false, onConfirm, onCancel }: {
    message: string;
    confirmLabel: string;
    /** Red rather than accent: for deleting, which is the one that is final. */
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  },
) {
  const { t } = useLang();
  const yes = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    yes.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The lightbox underneath also closes on Escape, and answering a question
      // should not also put away the thing the question was about.
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <div role="dialog" aria-modal="true"
         onClick={onCancel}
         className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-2xl">
        <p className="text-[13.5px] leading-relaxed text-ink">{message}</p>
        <div className="mt-3.5 flex flex-wrap justify-end gap-2">
          <button onClick={onCancel}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-muted hover:text-ink">
            {t("common.cancel")}
          </button>
          <button ref={yes} onClick={onConfirm}
                  className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition-colors ${
                    danger
                      ? "border-chili bg-chili/15 text-chili hover:bg-chili/25"
                      : "border-accent bg-accent/15 text-accent hover:bg-accent/25"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
