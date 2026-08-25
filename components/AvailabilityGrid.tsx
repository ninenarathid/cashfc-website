"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DAYS, HOURS, dayLabel, dayShort, describeDay, hourLabel, parse, slotIndex,
} from "@/lib/availability";
import { useLang } from "@/lib/i18n";

/**
 * The week at one-hour resolution: days across, hours down.
 *
 * Painted by dragging rather than clicked cell by cell, which is what makes 168
 * cells no more work than a handful of blocks — press on the first hour you are
 * free and pull down to the last. The drag decides on the first cell whether it
 * is filling or clearing, so pulling back over what you just painted erases it,
 * the way any selection behaves.
 *
 * Pointer events rather than mouse events so a finger works the same as a mouse;
 * touch-action is disabled on the grid or the browser scrolls the page instead
 * of letting the drag through.
 *
 * The hour labels live *inside* each row rather than in a column beside the
 * grid. Two parallel columns have to agree on row height to line up, and they
 * stopped agreeing the moment the cells grew a border — the labels drifted a
 * fraction of a row each hour and were a row and a half out by the bottom. In
 * one row they cannot disagree. A label also names the row it sits in rather
 * than the line above it: this row is 10:00, meaning 10:00 to 11:00, which is
 * what the summary underneath says too.
 *
 * The same component renders the read-only view on a member's page, so what
 * somebody filled in and what everybody else sees cannot drift apart.
 */
export default function AvailabilityGrid(
  { value, onChange }: {
    value: string | null;
    onChange?: (next: string) => void;
  },
) {
  const { lang } = useLang();
  const slots = parse(value);
  const editable = !!onChange;

  // What this drag is doing — set once, on the cell it started from.
  const painting = useRef<boolean | null>(null);
  const [dragging, setDragging] = useState(false);

  const emit = useCallback((next: boolean[]) =>
    onChange?.(next.map((v) => (v ? "1" : "0")).join("")), [onChange]);

  const paint = (day: number, hour: number, mode: boolean) => {
    const i = slotIndex(day, hour);
    if (slots[i] === mode) return;
    const next = [...slots];
    next[i] = mode;
    emit(next);
  };

  // A drag that ends outside the grid — or in another window — must still stop,
  // or the next hover would keep painting with no button held.
  useEffect(() => {
    if (!dragging) return;
    const stop = () => { painting.current = null; setDragging(false); };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  const fillDay = (day: number) => {
    const full = Array.from({ length: HOURS }, (_, h) => slots[slotIndex(day, h)])
      .every(Boolean);
    const next = [...slots];
    for (let h = 0; h < HOURS; h++) next[slotIndex(day, h)] = !full;
    emit(next);
  };

  const fillHour = (hour: number) => {
    const full = DAYS.every((_, d) => slots[slotIndex(d, hour)]);
    const next = [...slots];
    DAYS.forEach((_, d) => { next[slotIndex(d, hour)] = !full; });
    emit(next);
  };

  const rowH = editable ? "h-[18px]" : "h-[13px]";
  const anyOn = slots.some(Boolean);

  return (
    <div>
      {/* Day names, over a spacer the same width as the hour column. */}
      <div className="mb-1 flex gap-1">
        <div className="w-12 shrink-0" />
        {DAYS.map((_, d) => (
          editable ? (
            <button key={d} type="button" onClick={() => fillDay(d)}
                    title={dayLabel(d, lang)}
                    className="min-w-0 flex-1 rounded-md py-0.5 text-center text-[11.5px] text-muted transition-colors hover:bg-card hover:text-accent">
              {dayShort(d, lang)}
            </button>
          ) : (
            <div key={d} title={dayLabel(d, lang)}
                 className="min-w-0 flex-1 py-0.5 text-center text-[11.5px] text-muted">
              {dayShort(d, lang)}
            </div>
          )
        ))}
      </div>

      <div className="select-none" style={{ touchAction: "none" }}>
        {Array.from({ length: HOURS }, (_, h) => (
          <div key={h} className="flex gap-1">
            <div className={`flex w-12 shrink-0 items-center justify-end pr-1 ${rowH}`}>
              {editable ? (
                <button type="button" onClick={() => fillHour(h)}
                        className={`font-data text-[10px] leading-none transition-colors hover:text-accent ${
                          h % 3 === 0 ? "text-muted" : "text-muted/45"}`}>
                  {hourLabel(h)}
                </button>
              ) : (
                <span className={`font-data text-[10px] leading-none ${
                  h % 3 === 0 ? "text-muted" : "text-muted/45"}`}>
                  {hourLabel(h)}
                </span>
              )}
            </div>

            {DAYS.map((_, d) => {
              const on = slots[slotIndex(d, h)];
              // A heavier line every six hours, so the eye finds 06:00 and 18:00
              // without reading every label.
              const edge = [
                "border-x border-line",
                h === 0 ? "border-t rounded-t-md" : "",
                h === HOURS - 1 ? "border-b rounded-b-md" : "",
                h % 6 === 0 && h !== 0 ? "border-t border-t-line" : "",
              ].join(" ");
              const cls = `min-w-0 flex-1 ${rowH} ${edge} ${
                on ? "bg-jade/35" : "bg-card"}`;
              if (!editable) return <div key={d} className={cls} />;
              return (
                <div
                  key={d}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${dayLabel(d, lang)} ${hourLabel(h)}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    painting.current = !on;
                    setDragging(true);
                    paint(d, h, !on);
                  }}
                  onPointerEnter={() => {
                    if (painting.current !== null) paint(d, h, painting.current);
                  }}
                  className={`${cls} cursor-pointer transition-colors ${
                    on ? "hover:bg-jade/50" : "hover:bg-line/60"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* The grid says when at a glance; this says it in words, which is what
          somebody reads out when they are arranging a night. */}
      {anyOn && (
        <dl className="mt-3 flex flex-col gap-0.5 text-[12px] leading-relaxed">
          {DAYS.map((_, d) => {
            const text = describeDay(slots, d, lang);
            if (!text) return null;
            return (
              <div key={d} className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted">{dayLabel(d, lang)}</dt>
                <dd className="font-data text-ink/85">{text}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
