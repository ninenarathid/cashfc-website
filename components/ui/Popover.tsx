"use client";

import * as Radix from "@radix-ui/react-popover";
import type { ReactNode } from "react";

/**
 * A card that opens when you press something, and can be answered.
 *
 * The hover card's sibling, and the difference is the whole reason both exist:
 * a hover card explains and a popover asks. This one opens on a press, takes
 * focus, closes on Escape or a press outside, and can hold a button — none of
 * which a hover card should do, because a thing that appears when the pointer
 * merely passes over it must never be a thing that can be answered by mistake.
 *
 * On the seat grid it is what turns the grid into the control: the seats
 * already say which are free, so a row of buttons underneath repeating them
 * was the same list twice. Press the seat, confirm in place.
 *
 * Built on Radix because the fiddly parts are the ones that matter — flipping
 * above the seat near the bottom of the window, staying within the viewport on
 * a phone, returning focus where it came from, and closing on Escape without
 * swallowing the key from anything else.
 *
 * The shape is shadcn's; the colours are this site's tokens rather than
 * shadcn's --background/--foreground, so it inherits the theme like everything
 * else and a theme change carries it along.
 */

export function Popover(
  { trigger, children, open, onOpenChange, side = "top", align = "center",
    className = "" }: {
    trigger: ReactNode;
    children: ReactNode;
    /** Controlled, where the opener has to close it after the answer lands. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    className?: string;
  },
) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      {/* asChild so the seat stays the element it was — wrapping it would
          change the grid's layout and put it in the tab order twice. */}
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          side={side} align={align} sideOffset={7} collisionPadding={12}
          /*
           * Above the window it was opened from, which is most of them.
           *
           * The seat grid lives inside the party's dialog, and Modal puts that
           * box on z-71. This content is portalled to the body, so the two are
           * siblings and 50 loses: the popover opened every time, behind an
           * opaque panel, and pressing a seat looked like a button that did
           * nothing at all.
           *
           * 100 clears a window and a window opened from inside it (71, 81)
           * and stays under ConfirmDialog at 120 — a question that has to be
           * answered should cover a card that is only being offered.
           */
          className={`pop-in z-[100] w-[min(17rem,92vw)] rounded-xl border border-line bg-surface p-3 text-[14.5px] leading-relaxed text-ink shadow-xl shadow-black/50 ${className}`}
        >
          {children}
          <Radix.Arrow className="fill-line" width={11} height={5} />
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
