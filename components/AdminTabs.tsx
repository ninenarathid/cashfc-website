"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
  const card = useRef<HTMLElement>(null);

  /*
   * A tab can be linked to: /admin#prizes opens the prizes one.
   *
   * There are three of these cards on the admin page, so each only answers
   * for a key it actually holds and the other two leave the address alone.
   * Written this way rather than by putting the open tab in the address,
   * because clicking through the tabs should not fill up the back button.
   */
  const keys = tabs.map((x) => x.key).join(",");
  useEffect(() => {
    const jump = () => {
      // Everything after a colon belongs to whatever is inside the tab: the
      // inbox links at one prize claim, not at the prizes tab in general, and
      // the panel that holds it reads that part for itself.
      const want = window.location.hash.slice(1).split(":")[0];
      if (!want || !keys.split(",").includes(want)) return;
      setOpen(want);
      // And brought into view, because nothing on the page has that id for the
      // browser to scroll to: a tab three cards down that quietly changed is a
      // link that did nothing as far as the person who clicked it can tell.
      card.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    jump();
    // And again whenever the address changes without the page doing so. A link
    // from one part of the admin page to another — the inbox sending somebody to
    // the prizes queue — moves the hash and nothing else, so a tab card that only
    // read the hash when it mounted sat on whichever tab it happened to be on and
    // the link appeared to do nothing at all.
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
  }, [keys]);

  return (
    <section ref={card}
             className={`${className} rounded-xl border border-line bg-surface p-4`}>
      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {tabs.map((tab) => {
          const on = tab.key === open;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={on}
                    onClick={() => setOpen(tab.key)}
                    className={`rounded-lg px-3 py-1.5 font-display text-read font-semibold transition-colors ${
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
