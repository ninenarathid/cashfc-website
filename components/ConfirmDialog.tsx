"use client";

import * as Alert from "@radix-ui/react-alert-dialog";
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
 * Radix's AlertDialog rather than its Dialog, and rather than the hand-rolled
 * one this replaces. An alert dialog is the variant for a question that must be
 * answered: it takes focus on open, keeps Tab inside itself, hides the rest of
 * the page from screen readers, restores focus to whatever opened it, and
 * deliberately does not close when you click the backdrop — because dismissing
 * "delete this picture?" by missing the button is not an answer.
 *
 * That last point is a behaviour change. The old one closed on a backdrop click,
 * which read as Cancel and usually was; Escape still cancels, and Cancel is
 * still the button focus lands on.
 *
 * The dialog is always open while mounted: the caller decides it exists at all,
 * which is the shape every call site here already used.
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

  return (
    <Alert.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Alert.Portal>
        <Alert.Overlay className="pop-in fixed inset-0 z-[60] bg-bg/80 backdrop-blur-sm" />
        <Alert.Content
          // The lightbox underneath also closes on Escape, and answering a
          // question should not also put away the thing the question was about.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          className="pop-in fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/60">
          <Alert.Description className="text-[13.5px] leading-relaxed text-ink">
            {message}
          </Alert.Description>
          <div className="mt-3.5 flex flex-wrap justify-end gap-2">
            {/* Cancel takes focus, not the confirm button. The old one focused
                the confirming button, which put the irreversible answer under
                the space bar of somebody who opened this by accident. */}
            <Alert.Cancel asChild>
              <button className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted outline-none transition-colors hover:border-muted hover:text-ink focus-visible:border-accent">
                {t("common.cancel")}
              </button>
            </Alert.Cancel>
            <Alert.Action asChild>
              <button onClick={onConfirm}
                      className={`rounded-lg border px-3.5 py-1.5 text-[13px] outline-none transition-colors ${
                        danger
                          ? "border-chili bg-chili/15 text-chili hover:bg-chili/25"
                          : "border-accent bg-accent/15 text-accent hover:bg-accent/25"}`}>
                {confirmLabel}
              </button>
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}
