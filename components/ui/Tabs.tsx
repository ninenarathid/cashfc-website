"use client";

import * as Radix from "@radix-ui/react-tabs";
import { useState, type ReactNode } from "react";

/**
 * One card, several panels, a row of tabs to pick between them.
 *
 * shadcn's shape on Radix's behaviour, wearing this site's tokens rather than
 * shadcn's --background/--foreground, so a theme change carries it along.
 *
 * Radix rather than the hand-rolled version elsewhere in this codebase because
 * a tab list has real keyboard behaviour to get right: arrow keys move between
 * tabs, Home and End jump to the ends, and the panel is tied to its tab by id
 * so a screen reader announces which of how many is open. Written by hand that
 * is a dozen lines nobody remembers to add.
 *
 * Only the open panel is mounted. These panels are lists of up to a hundred
 * items each and the closed ones have nothing to preserve — no half-typed
 * anything — so rendering all of them to keep state would be paying for
 * something nobody would notice.
 */

export interface TabDef {
  key: string;
  /** A node, not a string: a tab may want the game's icon beside its name. */
  label: ReactNode;
  /** Shown after the label, dimmed — a count, usually. */
  hint?: ReactNode;
  body: ReactNode;
}

/**
 * Left to itself it opens the first tab and keeps the choice. Given `value`
 * it is the caller's choice instead (a guide remembers which way of playing a
 * mechanic its reader picked, across visits), told back through
 * `onValueChange`.
 */
export default function Tabs(
  { tabs, className = "", value, onValueChange }:
  { tabs: TabDef[]; className?: string; value?: string; onValueChange?: (key: string) => void },
) {
  const [own, setOwn] = useState(tabs[0]?.key ?? "");
  const open = value ?? own;
  const setOpen = (key: string) => { setOwn(key); onValueChange?.(key); };
  if (!tabs.length) return null;

  return (
    <Radix.Root value={open} onValueChange={setOpen} className={className}>
      <Radix.List className="flex flex-wrap gap-1 rounded-lg border border-line p-1">
        {tabs.map((tab) => (
          <Radix.Trigger key={tab.key} value={tab.key}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-read text-muted outline-none transition-colors hover:text-ink data-[state=active]:bg-card data-[state=active]:text-accent">
            {tab.label}
            {tab.hint != null && (
              <span className="ml-1.5 font-data text-meta opacity-70">
                {tab.hint}
              </span>
            )}
          </Radix.Trigger>
        ))}
      </Radix.List>

      {tabs.map((tab) => (
        <Radix.Content key={tab.key} value={tab.key}
                       className="tab-in pt-3 outline-none">
          {tab.body}
        </Radix.Content>
      ))}
    </Radix.Root>
  );
}
