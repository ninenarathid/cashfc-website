"use client";

import { useState, type ReactNode } from "react";

/**
 * One card, several panels, a row of tabs to pick between them.
 *
 * The admin page had grown to eight stacked cards, and the stack hid the shape
 * of the thing: writing a site update, posting an announcement and adding a
 * timeline entry are three answers to "say something on the site", but sat as
 * far apart on the page as any two unrelated tools. Same for the two screens
 * about members. Grouping them says which decisions belong together, and gets
 * the page down to something you can see the whole of.
 *
 * Every panel stays mounted and the closed ones are hidden, so a half-written
 * announcement survives a look at the timeline. It costs the initial render of
 * panels nobody has opened; on a page this size that is cheaper than losing
 * somebody's draft.
 */

export interface Tab {
  key: string;
  label: string;
  body: ReactNode;
}

export default function AdminTabs(
  { tabs, className = "mt-3" }: { tabs: Tab[]; className?: string },
) {
  const [open, setOpen] = useState(tabs[0]?.key ?? "");

  return (
    <section className={`${className} rounded-xl border border-line bg-surface p-4`}>
      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {tabs.map((tab) => {
          const on = tab.key === open;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={on}
                    onClick={() => setOpen(tab.key)}
                    className={`rounded-lg px-3 py-1.5 font-display text-[13.5px] font-semibold transition-colors ${
                      on ? "border border-accent bg-accent/15 text-accent"
                         : "border border-transparent text-muted hover:text-ink"}`}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel"
             className={tab.key === open ? "pt-3" : "hidden"}>
          {tab.body}
        </div>
      ))}
    </section>
  );
}
