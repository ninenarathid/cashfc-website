"use client";

import * as Radix from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/**
 * A line of explanation, on hover.
 *
 * shadcn's shape on Radix's behaviour, wearing this site's tokens. Smaller and
 * quieter than the HoverCard next to it in this folder, and the two are for
 * different things: a hover card holds a paragraph and a chip and can be moved
 * into, a tooltip holds a sentence and gets out of the way.
 *
 * Replaces the browser's `title` attribute where the answer is short. That
 * attribute waits about a second, cannot be styled, ignores the site's fonts,
 * and never appears on a touch screen at all.
 *
 * ── The trigger, and who can reach it ────────────────────────────────────
 *
 * `asChild`, so the thing being explained stays the element it was. Where that
 * element is not focusable — a span of text, which is most of the uses here —
 * the tooltip is reachable by pointer and not by keyboard. That is a real
 * limitation and the alternative is worse: the member list would gain five
 * hundred tab stops on text nobody can do anything with, which makes the page
 * harder to move around for exactly the people the focusable version was meant
 * to help. Where the answer matters, it is on the page rather than only here.
 */
export function Tooltip(
  { content, children, side = "top" }: {
    content: ReactNode;
    children: ReactNode;
    side?: "top" | "right" | "bottom" | "left";
  },
) {
  if (!content) return <>{children}</>;
  return (
    <Radix.Root>
      <Radix.Trigger asChild>{children}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          side={side} sideOffset={6} collisionPadding={10}
          className="pop-in z-[90] max-w-[16rem] rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] leading-snug text-ink shadow-lg shadow-black/40">
          {content}
          <Radix.Arrow className="fill-line" width={10} height={4} />
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

/**
 * One provider for the whole app, at the root.
 *
 * Radix shares its timing across everything inside a provider: the first
 * tooltip waits, and moving straight to another shows it at once. On a list of
 * five hundred names that is the difference between reading down a column and
 * waiting half a second on every row.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <Radix.Provider delayDuration={350} skipDelayDuration={250}>
      {children}
    </Radix.Provider>
  );
}
