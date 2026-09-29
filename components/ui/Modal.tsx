"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

/**
 * Below this there is no room to stand a window and a panel side by side.
 *
 * Forty rem of panel plus a window narrow enough to fit beside it is a window
 * with a seat grid four across in about thirty rem, which is two across and
 * wrapping. Between this and the phone the panel simply covers what it was
 * opened from, which is what every sheet on the site does anyway.
 */
const ROOM_BESIDE = "(min-width: 1180px)";

/** The width of the wide panel, for whatever has to make room for one. */
export const SHEET_WIDE = "40rem";

/**
 * How many of these are already open, so a window opened from inside another
 * one lands on top of it — and, more to the point, so its overlay lands on top
 * of it too.
 *
 * Radix stacks the layers for dismissal and focus on its own; it does not
 * stack them visually, and z-70 does not cover z-71. The picker was opening
 * over the form and blurring only the board behind them both, which left the
 * thing you were picking for as bright as the thing you were picking from.
 */
const Depth = createContext(0);

/** The overlay and the box, ten apart, one storey up per window. */
const layer = (depth: number) => ({ over: 70 + depth * 10, box: 71 + depth * 10 });

// False on the server and on the first client render, so the two agree; the
// effect corrects it before paint. A hook that guessed would hydrate one shape
// and swap to the other, which is a visible flash on every open.
function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const read = () => setOn(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, [query]);
  return on;
}

export function useIsPhone(): boolean {
  return useMedia(PHONE);
}

/**
 * Whether a window and a panel can stand side by side on this screen.
 *
 * Modal asks this itself before it moves. It is exported for whatever opens
 * both, which has the other half of the arrangement to decide: a scrim over
 * something the reader has just been given room to read. See Sheet's `quiet`.
 */
export function useRoomBeside(): boolean {
  return useMedia(ROOM_BESIDE);
}

export default function Modal(
  { open, onOpenChange, title, subtitle, children, wide = false,
    sticky = false, icon, beside, hideClose = false }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    /** Named for screen readers, and drawn where there is room for a heading. */
    title: string;
    /** Beside the heading, so the window and the button that opened it match. */
    icon?: React.ReactNode;
    subtitle?: string;
    children: React.ReactNode;
    /** For a picker that is a grid of pictures rather than a column of fields. */
    wide?: boolean;
    /**
     * Only the ✕ and Escape close it.
     *
     * For a window holding work: a click that lands beside a form somebody has
     * been filling in for two minutes is a slip, not an answer, and there is
     * nothing to undo it with. A picker is the opposite — you open it, you
     * change your mind, you click away — so this is asked for rather than the
     * default.
     */
    sticky?: boolean;
    /**
     * A panel this wide has opened on the right, so move out from under it.
     *
     * Given as a CSS length — SHEET_WIDE for the usual case. The window slides
     * left by half of it and gives back the width, so the two stand side by
     * side: the party and the conversation about it are the same subject, and
     * a panel that covers half of what it was opened from makes the reader
     * close it to check the thing they are chatting about.
     *
     * Only where there is room for both. See ROOM_BESIDE.
     */
    beside?: string;
    /**
     * Somewhere else has the ✕ for this.
     *
     * For the pair above: a window with a panel standing beside it is one thing
     * on the screen, and two crosses on one thing is a question — does this one
     * shut half of it? The panel's is the one that is kept, because it is the
     * top right of the pair, which is where the cross for a window has always
     * been. Escape still closes it, as it closes anything.
     */
    hideClose?: boolean;
  },
) {
  const phone = useIsPhone();
  const room = useMedia(ROOM_BESIDE);
  /** Standing beside a panel on a desktop: moved over and narrowed for it. */
  const aside = !phone && room ? beside : undefined;
  /** And on a phone, where there is only one way to divide a screen. */
  const split = phone && !!beside;
  const depth = useContext(Depth);
  const z = layer(depth);
  const keep = sticky
    ? { onPointerDownOutside: (e: Event) => e.preventDefault(),
        onInteractOutside: (e: Event) => e.preventDefault() }
    : {};

  // The scrolling belongs to the body, not to the page behind it: a long form
  // in a fixed box has to scroll somewhere, and letting the page do it is how
  // you end up scrolling the board by accident with the form still open.
  const body = (
    <div className="slim-bar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
      <Depth.Provider value={depth + 1}>{children}</Depth.Provider>
    </div>
  );

  const head = (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3.5">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 font-display text-title font-semibold text-ink">
          {icon}
          {title}
        </span>
        {subtitle && <span className="truncate text-ui text-muted">{subtitle}</span>}
      </div>
      {!hideClose && (
        <button onClick={() => onOpenChange(false)} aria-label="Close"
                className="shrink-0 rounded-lg px-2 py-1 text-ui text-muted hover:text-ink">
          ✕
        </button>
      )}
    </div>
  );

  if (phone) {
    // Not modal while it is the top half of a split screen, for the reason the
    // desktop one is not: the lock would take the scrolling of the conversation
    // below it. See the dialog branch.
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange} modal={!split}
                   // Mounted afresh when the screen is divided, because vaul
                   // closes a drawer that is told mid-life that it is no longer
                   // modal — and the lock it installs while it is modal is the
                   // thing that stops the conversation below it scrolling. The
                   // cost is the panel re-entering, which is a movement the eye
                   // reads as the pair rearranging itself, and is what it is.
                   key={split ? "paired" : "alone"}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ zIndex: z.over }}
                          className="fixed inset-0 bg-bg/80 backdrop-blur-sm" />
          {/*
            * Up to the top half when a panel has taken the bottom one.
            *
            * A phone has one dimension to spend and the panel wants some of it,
            * so the two share the height rather than one covering the other —
            * the party above, what people are saying about it below. Animated,
            * because the window is already on the screen when the panel opens
            * and a sheet that changes shape between two frames reads as a
            * second sheet replacing the first.
            */}
          <Drawer.Content {...keep}
                          // Live while the panel is below it, for the same
                          // reason as the window on a desktop: the panel's own
                          // layer turns the pointer off on everything but
                          // itself, whatever it has been told about modality.
                          style={{ zIndex: z.box,
                                   ...(split ? { pointerEvents: "auto" as const } : {}) }}
                          className={`fixed inset-x-0 flex flex-col border border-line bg-surface outline-none transition-[top,bottom,height,border-radius] duration-300 ease-out ${
                            split
                              ? "top-0 h-[44vh] rounded-b-2xl"
                              : "bottom-0 mt-16 max-h-[94vh] rounded-t-2xl"}`}>
            {/* The handle, on the edge it is dragged from. A sheet with nothing
                to grab reads as a page that has slid up and got stuck — and one
                at the top of the screen is not dragged anywhere, so it goes. */}
            {!split && (
              <span aria-hidden
                    className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
            )}
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            {head}
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  /*
   * Modal while it is the only thing, and not while it is half of a pair.
   *
   * A modal dialog takes the scrolling of the whole document and gives it back
   * only inside itself, which is right when it is the only thing you can be
   * doing. Beside a panel it is not: the lock is what stopped the conversation
   * scrolling under the wheel, since the panel is, as far as the lock is
   * concerned, outside. Dropping it is safe because the panel is still a layer
   * above this one, and a dialog only answers a click outside it while it is
   * the topmost layer — so clicking into the conversation does not close the
   * window the conversation is about.
   */
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={!aside}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ zIndex: z.over }}
                        className="rise-in fixed inset-0 bg-bg/80 backdrop-blur-sm" />
        {/* Moved with `left` rather than with a transform: the opening
            animation is a transform, and the two would fight over it — the
            window would slide out from under the panel by scaling up into
            place. Both properties are transitioned, so it gives the width back
            as it goes rather than jumping to a new size. */}
        {/*
          * And still usable while it is beside something.
          *
          * A panel opening over this one takes the pointer with it: Radix hands
          * every layer below the top one `pointer-events: none`, and vaul does
          * not pass its own `modal` down to the dialog it is built on, so a
          * panel that has been told it is not modal disables this window
          * anyway. It looked open and it was not — the seats would not take a
          * click and the write-up would not scroll under the wheel.
          *
          * So a window that has made room for a panel says it is still live.
          * Radix spreads the caller's style after its own, which is the whole
          * mechanism. Anything that opens over BOTH of them — the "delete this
          * party?" question, a picture at full size — brings its own sheet of
          * glass above the pair, so this does not reach past the one case it is
          * for.
          */}
        <Dialog.Content {...keep}
          style={{ zIndex: z.box,
                   ...(aside
                     ? { left: `calc(50% - (${aside} / 2))`,
                         maxWidth: `calc(100vw - ${aside} - 3rem)`,
                         pointerEvents: "auto" }
                     : {}) }}
          className={`rise-in fixed left-1/2 top-[3vh] flex max-h-[94vh] w-[calc(100vw-2rem)] -translate-x-1/2 flex-col lit-top rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60 transition-[left,max-width] duration-300 ease-out ${
            wide ? "max-w-6xl" : "max-w-3xl"}`}>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {head}
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A panel that slides in beside what you were doing.
 *
 * For a step inside a task, where Modal is for the task itself. Choosing who is
 * in D3 is a step: the party form has to still be there when you come back, and
 * a second box centred over the first would cover the seat grid the question is
 * about. The panel this replaces was worse again — it opened underneath the
 * grid and pushed the rest of the form down as it grew, so the button you were
 * reaching for moved while you were reaching for it.
 *
 * In from the right on a desktop, up from the bottom on a phone: the same
 * gesture in whichever shape the screen has room for. Both are vaul, so both
 * can be dragged shut, and both nest inside the dialog they are opened from —
 * they are Radix dialogs underneath, and Radix keeps its own stack of those.
 */
export function Sheet(
  { open, onOpenChange, title, subtitle, children, wide = false,
    flush = false, quiet = false, split = false, hideClose = false }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** For a panel holding a conversation rather than a column of fields. */
    wide?: boolean;
    /**
     * The panel gives its whole body to the child and scrolls nothing itself.
     *
     * For a child that has to own its own scrolling — a chat is the case this
     * exists for. A thread opens at the newest message and follows the
     * conversation from there, and neither is possible from the inside when the
     * scrollbar belongs to the panel: the panel would have to be told where to
     * go by the thing sitting in it. So it hands over the height instead.
     */
    flush?: boolean;
    /**
     * Beside, rather than over: what is behind this stays live while it is open.
     *
     * For the case where the window underneath has stepped aside to make room
     * — the party and the conversation about it, side by side. Three things
     * follow from that, and they are one decision rather than three:
     *
     * No scrim, because dimming and blurring the thing somebody has just been
     * given room to look at is the panel taking back what the window gave.
     *
     * No layer over it either. An invisible sheet of glass across the screen
     * reads as a scrim that has been turned off; it is still the thing the
     * clicks land on.
     *
     * And not modal. A panel that owns the whole screen locks the scrolling and
     * the pointer everywhere but itself, which is right when it is the only
     * thing you can be doing — and here it meant the party window sat there
     * looking usable with a seat grid you could not reach and a write-up that
     * would not scroll. Nothing to dismiss by clicking away from, either: the
     * thing beside it is what you would be clicking on.
     */
    quiet?: boolean;
    /**
     * On a phone, half the height rather than nearly all of it.
     *
     * The other half is the window this was opened from, which has moved up to
     * the top of the screen to make it — see Modal's `beside`. A phone has one
     * dimension to divide and this is the division: the thing above, and what
     * is being said about it below.
     */
    split?: boolean;
    /** Somewhere else has the ✕ for this. See Modal's `hideClose`. */
    hideClose?: boolean;
  },
) {
  const phone = useIsPhone();
  const depth = useContext(Depth);
  const z = layer(depth);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}
                 direction={phone ? "bottom" : "right"}
                 modal={!quiet}>
      <Drawer.Portal>
        {!quiet && (
          <Drawer.Overlay style={{ zIndex: z.over }}
                          className="fixed inset-0 bg-bg/70 backdrop-blur-[2px]" />
        )}
        <Drawer.Content
          // The custom property is vaul's: it is where the panel starts from
          // before it slides in, and the default assumes a sheet coming up from
          // the bottom edge.
          style={{
            zIndex: z.box,
            ...(phone ? {} : { "--initial-transform": "calc(100% + 8px)" }),
          } as React.CSSProperties}
          className={`fixed flex flex-col border-line bg-surface outline-none ${
            phone
              // A fixed height rather than a ceiling when the body is a
              // conversation: a panel that takes its height from its contents
              // grows by a bubble every time somebody says something, and the
              // box you are typing in slides down the screen as you use it.
              ? `inset-x-0 bottom-0 mt-16 rounded-t-2xl border ${
                split ? "h-[56vh]" : flush ? "h-[88vh]" : "max-h-[88vh]"}`
              // The wide one is SHEET_WIDE, which is also what a window beside
              // it is told to make room for. The two have to agree.
              : `inset-y-0 right-0 max-w-[94vw] border-l shadow-2xl shadow-black/60 ${
                wide ? "w-[40rem]" : "w-[28rem]"}`}`}>
          {phone && (
            <span aria-hidden
                  className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
          )}
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3.5">
            <div className="flex min-w-0 flex-col">
              <span className="font-display text-lead font-semibold text-ink">
                {title}
              </span>
              {subtitle && (
                <span className="truncate text-ui text-muted">{subtitle}</span>
              )}
            </div>
            {!hideClose && (
              <button onClick={() => onOpenChange(false)} aria-label="Close"
                      className="shrink-0 rounded-lg px-2 py-1 text-ui text-muted hover:text-ink">
                ✕
              </button>
            )}
          </div>
          <div className={flush
            ? "flex min-h-0 flex-1 flex-col"
            : "slim-bar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"}>
            <Depth.Provider value={depth + 1}>{children}</Depth.Provider>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
