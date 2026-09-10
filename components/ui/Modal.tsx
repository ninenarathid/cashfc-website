"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";

/**
 * A window over the page: a dialog on a desktop, a sheet on a phone.
 *
 * Two components rather than one because they are two different gestures. A
 * dialog with a mouse is a box you click out of; a full-height panel on a phone
 * is something you drag down, and a centred box on a 390px screen is a box with
 * no room in it. The pairing is the one CommandPalette already uses — this is
 * that arrangement, made reusable, because the party form needed the same thing
 * and copying it a second time is how two dialogs start behaving differently.
 *
 * What it is for: a task with a beginning and an end. Putting a party up is
 * one; so is choosing which fight it is. Both were long stretches of form that
 * pushed the board they belong to off the bottom of the screen — the create
 * form alone ran to 1,541px on a desktop and 2,801px on a phone, which is three
 * and a third screens of scrolling before you reach the button, with the board
 * still rendered underneath doing nothing.
 *
 * What it is not for: anything you need to see while doing something else. The
 * loot rule and the progress track stay on the form, because a decision behind
 * a button is a decision people forget to make.
 */

/** Below this a centred box has no room, and a sheet is the right shape. */
const PHONE = "(max-width: 639px)";

export function useIsPhone(): boolean {
  // False on the server and on the first client render, so the two agree; the
  // effect corrects it before paint. A hook that guessed would hydrate one
  // shape and swap to the other, which is a visible flash on every open.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const read = () => setPhone(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return phone;
}

export default function Modal(
  { open, onOpenChange, title, subtitle, children, wide = false }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    /** Named for screen readers, and drawn where there is room for a heading. */
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** For a picker that is a grid of pictures rather than a column of fields. */
    wide?: boolean;
  },
) {
  const phone = useIsPhone();

  // The scrolling belongs to the body, not to the page behind it: a long form
  // in a fixed box has to scroll somewhere, and letting the page do it is how
  // you end up scrolling the board by accident with the form still open.
  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
      {children}
    </div>
  );

  const head = (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3.5">
      <div className="flex min-w-0 flex-col">
        <span className="font-display text-[15px] font-semibold text-ink">{title}</span>
        {subtitle && <span className="truncate text-[12px] text-muted">{subtitle}</span>}
      </div>
      <button onClick={() => onOpenChange(false)} aria-label="Close"
              className="shrink-0 rounded-lg px-2 py-1 text-[12.5px] text-muted hover:text-ink">
        ✕
      </button>
    </div>
  );

  if (phone) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-bg/80 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[71] mt-16 flex max-h-[94vh] flex-col rounded-t-2xl border border-line bg-surface outline-none">
            {/* The handle. A sheet with nothing to grab reads as a page that
                has slid up and got stuck. */}
            <span aria-hidden
                  className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            {head}
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pop-in fixed inset-0 z-[70] bg-bg/80 backdrop-blur-sm" />
        <Dialog.Content
          className={`pop-in fixed left-1/2 top-[4vh] z-[71] flex max-h-[92vh] w-[calc(100vw-3rem)] -translate-x-1/2 flex-col rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60 ${
            wide ? "max-w-4xl" : "max-w-2xl"}`}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {head}
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
