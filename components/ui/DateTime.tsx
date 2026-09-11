"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { useLang } from "@/lib/i18n";
import { Sheet, useIsPhone } from "@/components/ui/Modal";

/**
 * When, on a twenty-four hour clock.
 *
 * The native datetime-local input was doing three things badly at once. It
 * writes its own clock in whatever format the operating system is set to —
 * lang="en-GB" does not move it and neither does the browser's language — so a
 * Windows machine set to US English shows 08:00 PM for an evening every single
 * person on this board, and the game itself, calls 20:00. It also drew a
 * different control in every browser, and the one it drew was not the one the
 * rest of this page is made of.
 *
 * So the whole thing is ours: a calendar to pick the day, and two lists for the
 * time, in a popover. Five-minute steps, because twelve options is a short list
 * and nobody has ever arranged a raid for 20:07.
 *
 * The value is a wall clock, not an instant: "2026-09-11T20:30", the same shape
 * the input it replaces used, with Bangkok assumed by whoever reads it. That is
 * deliberate — the party is at eight in the evening Thai time whatever the
 * reader's laptop thinks the time is, and converting here would mean converting
 * back in three other places.
 *
 * On a phone it is a sheet rather than a popover, which is the rule the rest of
 * this page follows. A calendar and two clock columns side by side is four
 * hundred pixels wide; on a 360px screen the popover was pushed against the
 * right edge with the minutes half off it, which is what a member reported.
 */

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** "2026-09-11" → a Date at local midnight, which is what the calendar wants. */
const toDate = (day: string): Date | undefined => {
  const [y, m, d] = day.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};

const toDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  + `-${String(d.getDate()).padStart(2, "0")}`;

/*
 * Tailwind rather than the library's stylesheet.
 *
 * react-day-picker ships CSS that the App Router will only let us import from
 * the root layout, which would put a calendar's styles on every page to serve
 * one control on one. The class map is the same thing said in the tokens the
 * rest of the site is built from, so the calendar matches the form it opens
 * from rather than looking like a component bolted on.
 */
const CAL = {
  // Positioned, because the nav buttons are absolute against it. Without this
  // they anchor to whatever the calendar happens to be sitting inside, which
  // on a phone put next month's arrow in the sheet's own title bar.
  root: "relative",
  months: "flex flex-col gap-3",
  month: "flex flex-col gap-3",
  month_caption: "flex items-center justify-center h-8",
  caption_label: "font-display text-[13.5px] font-semibold text-ink",
  nav: "flex items-center gap-1 absolute right-1 top-1",
  button_previous:
    "inline-flex size-7 items-center justify-center rounded-md border border-line"
    + " text-muted transition-colors hover:border-muted hover:text-ink"
    + " disabled:opacity-30 disabled:hover:border-line",
  button_next:
    "inline-flex size-7 items-center justify-center rounded-md border border-line"
    + " text-muted transition-colors hover:border-muted hover:text-ink"
    + " disabled:opacity-30 disabled:hover:border-line",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "w-9 font-data text-[10px] uppercase tracking-[0.1em] text-muted font-normal",
  week: "flex w-full mt-1",
  day: "p-0",
  day_button:
    "size-9 rounded-md text-[13px] text-ink transition-colors"
    + " hover:bg-surface disabled:cursor-not-allowed disabled:opacity-25"
    + " disabled:hover:bg-transparent",
  selected: "[&>button]:bg-accent/20 [&>button]:text-accent [&>button]:font-semibold",
  today: "[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-line",
  outside: "[&>button]:text-muted/40",
  disabled: "opacity-30",
  hidden: "invisible",
} as const;

export default function DateTime(
  { value, min, onChange, invalid = false, className = "" }: {
    /** "YYYY-MM-DDTHH:mm", a wall clock with no zone. */
    value: string;
    /** The same shape. Earlier days are offered but cannot be chosen. */
    min?: string;
    onChange: (v: string) => void;
    /** Drawn as a mistake — the form decides what counts as one. */
    invalid?: boolean;
    className?: string;
  },
) {
  const { t, lang } = useLang();
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const clock = useRef<HTMLDivElement>(null);

  /*
   * Open on the hour that is already set.
   *
   * Twenty-four of them do not fit, and a list that opens at midnight makes
   * somebody scroll to find where they are before they can change it.
   *
   * By hand rather than with scrollIntoView, which scrolls every scrollable
   * ancestor as well: inside the phone sheet that scrolled the sheet itself,
   * taking the calendar's month and its arrows off the top of the screen to
   * centre an hour that was already going to be visible.
   */
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      clock.current?.querySelectorAll('[role="listbox"]').forEach((list) => {
        const on = list.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!on) return;
        // From where the two actually are on the screen, rather than from
        // offsetTop, which is measured against the nearest positioned ancestor
        // and that is the calendar rather than this list.
        const a = on.getBoundingClientRect();
        const b = list.getBoundingClientRect();
        list.scrollTop += (a.top - b.top) - (b.height - a.height) / 2;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const day = value.slice(0, 10);
  const hh = value.slice(11, 13) || "20";
  const mm = value.slice(14, 16) || "00";

  const selected = useMemo(() => toDate(day), [day]);
  const floor = useMemo(() => toDate((min ?? "").slice(0, 10)), [min]);

  /*
   * What the button says.
   *
   * Intl rather than a written-out format, so the day name comes out in the
   * reader's language and the month in the order their language puts it — the
   * one part of a date that is genuinely worth localising. The time is never
   * localised: 20:30 is what the game says and what the FC says.
   */
  const label = useMemo(() => {
    const d = toDate(day);
    if (!d) return t("pf.pickDay");
    const on = new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB",
      { weekday: "short", day: "2-digit", month: "short" }).format(d);
    return `${on} · ${hh}:${mm}`;
  }, [day, hh, mm, lang, t]);

  const set = (patch: { day?: string; hh?: string; mm?: string }) =>
    onChange(`${patch.day ?? day}T${patch.hh ?? hh}:${patch.mm ?? mm}`);

  const col = "flex h-[13.5rem] w-14 flex-col gap-0.5 overflow-y-auto"
    + " overscroll-contain pr-1";
  const tick = (on: boolean) =>
    `shrink-0 rounded-md py-1 text-center font-data text-[13px] tabular-nums`
    + ` transition-colors ${on ? "bg-accent/20 text-accent font-semibold"
                               : "text-muted hover:bg-surface hover:text-ink"}`;

  /*
   * The same calendar and the same two columns either way.
   *
   * In a row where there is width for one and stacked where there is not: the
   * phone gets the calendar at full width with the clock under it, rather than
   * a narrower copy of the desktop arrangement squeezed sideways.
   */
  const body = (
    <div className={`flex gap-3 ${phone ? "flex-col items-center" : ""}`}>
      <DayPicker mode="single" selected={selected} defaultMonth={selected}
                 disabled={floor ? { before: floor } : undefined}
                 showOutsideDays
                 onSelect={(d) => { if (d) set({ day: toDay(d) }); }}
                 classNames={CAL} />

      {/* The clock, as two lists. A twenty-four hour column is the whole point
          of the control, and it is a column rather than a spinner because
          picking 21 from a list is one press and typing it is four. */}
      <div className={`flex flex-col gap-1.5 ${
        phone ? "w-full border-t border-line pt-3" : "border-l border-line pl-3"}`}>
        <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
          {t("pf.timeOfDay")}
        </span>
        <div ref={clock} className={`flex gap-1 ${phone ? "justify-center" : ""}`}>
          <div className={col} role="listbox" aria-label={t("pf.hour")}>
            {HOURS.map((h) => (
              <button key={h} type="button" role="option" aria-selected={h === hh}
                      onClick={() => set({ hh: h })} className={tick(h === hh)}>
                {h}
              </button>
            ))}
          </div>
          <div className={col} role="listbox" aria-label={t("pf.minute")}>
            {MINUTES.map((m) => (
              <button key={m} type="button" role="option" aria-selected={m === mm}
                      onClick={() => set({ mm: m })} className={tick(m === mm)}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)}
                className={`mt-1 rounded-lg border border-accent/60 bg-accent/10 text-[12.5px] text-accent transition-colors hover:bg-accent/20 ${
                  phone ? "w-full py-2.5" : "px-3 py-1"}`}>
          {t("pf.done")}
        </button>
      </div>
    </div>
  );

  const trigger = (
    <button type="button" onClick={phone ? () => setOpen(true) : undefined}
            className={`flex items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-[13.5px] text-ink transition-colors hover:border-muted ${
              invalid ? "border-chili/60" : "border-line"} ${className}`}>
      {/* A calendar leaf, drawn rather than fetched: this is the site's own
          furniture, not the game's, and every other icon here is a duty badge
          that would be wrong on a date. */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden
           stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-muted">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      {label}
    </button>
  );

  // A sheet on a phone, which is where the rest of this page puts a step.
  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}
               title={t("pf.starts")} subtitle={label}>
          {body}
        </Sheet>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        {/*
          * Above whatever opened it. The form this sits in is itself a window,
          * and Radix stacks its layers for dismissal but not visually — a
          * popover at the page's z-index would open behind the dialog.
          */}
        <Popover.Content align="start" sideOffset={6} collisionPadding={12}
                         className="z-[95] max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-surface p-3 shadow-2xl shadow-black/60">
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
