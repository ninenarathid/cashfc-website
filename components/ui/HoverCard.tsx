"use client";

import * as Radix from "@radix-ui/react-hover-card";
import type { ReactNode } from "react";

/**
 * A card that opens when you hover something, and can hold more than a sentence.
 *
 * Replaces the browser's `title` attribute on the tags. That attribute was doing
 * a lot of work it is bad at: it waits about a second before appearing, cannot be
 * styled, ignores the site's fonts, wraps Thai wherever it likes, is invisible on
 * a touch screen, and can only ever be one flat string — which is why the tag
 * explanations had been joined together with " · " into a run-on line.
 *
 * Built on Radix rather than by hand because the fiddly parts are the ones that
 * matter and are easy to get wrong: staying open while the pointer travels from
 * the chip to the card, closing on Escape, flipping above the chip near the
 * bottom of the window, and not trapping a keyboard user.
 *
 * The shape is shadcn's; the colours are this site's tokens rather than
 * shadcn's --background/--foreground, so it inherits the theme like everything
 * else and a theme change carries it along.
 */

export function HoverCard(
  { trigger, children, side = "top", align = "center", className = "" }: {
    trigger: ReactNode;
    children: ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    className?: string;
  },
) {
  return (
    <Radix.Root openDelay={120} closeDelay={80}>
      {/* asChild so the chip stays the element it was — wrapping it in a button
          would change its layout and put it in the tab order twice. */}
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          side={side} align={align} sideOffset={7} collisionPadding={12}
          className={`pop-in z-50 max-w-[19rem] rounded-xl border border-line bg-surface px-3.5 py-3 text-[12.5px] leading-relaxed text-ink shadow-xl shadow-black/40 ${className}`}
        >
          {children}
          <Radix.Arrow className="fill-line" width={11} height={5} />
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
