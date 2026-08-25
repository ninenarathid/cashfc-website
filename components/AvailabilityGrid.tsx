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

  const cell = (day: number, hour: number) => {
    const on = slots[slotIndex(day, hour)];
    const base = on ? "bg-jade/35" : "bg-card";
    // A line every six hours, so the eye can find 06:00 and 18:00 without
    // counting rows.
    const rule = hour % 6 === 0 ? "border-t-line" : "border-t-transparent";
    if (!editable) {
      return <div key={hour} className={`h-3 border-t ${rule} ${base}`} />;
    }
    return (
      <div
        key={hour}
        role="checkbox"
        aria-checked={on}
        aria-label={`${dayLabel(day, lang)} ${hourLabel(hour)}`}
        onPointerDown={(e) => {
          e.preventDefault();
          painting.current = !on;
          setDragging(true);
          paint(day, hour, !on);
        }}
        onPointerEnter={() => {
          if (painting.current !== null) paint(day, hour, painting.current);
        }}
        className={`h-4 cursor-pointer border-t transition-colors ${rule} ${base} ${
          on ? "hover:bg-jade/50" : "hover:bg-line/60"}`}
      />
    );
  };

  const anyOn = slots.some(Boolean);

  return (
    <div>
      <div className="flex gap-1 select-none" style={{ touchAction: "none" }}>
        {/* Hour rail. Every third hour is labelled — enough to navigate by
            without a wall of numbers beside a grid this fine. */}
        <div className="w-11 shrink-0 pt-[22px]">
          {Array.from({ length: HOURS }, (_, h) => (
            <div key={h} className={editable ? "h-4" : "h-3"}>
              {h % 3 === 0 && (
                editable ? (
                  <button type="button" onClick={() => fillHour(h)}
                          className="-mt-[7px] block w-full text-right font-data text-[10px] leading-none text-muted transition-colors hover:text-amber">
                    {hourLabel(h)}
                  </button>
                ) : (
                  <span className="-mt-[6px] block text-right font-data text-[10px] leading-none text-muted">
                    {hourLabel(h)}
                  </span>
                )
              )}
            </div>
          ))}
        </div>

        {DAYS.map((_, d) => (
          <div key={d} className="min-w-0 flex-1">
            {editable ? (
              <button type="button" onClick={() => fillDay(d)}
                      className="mb-1 block w-full rounded-md py-0.5 text-center text-[11.5px] text-muted transition-colors hover:bg-card hover:text-amber">
                {dayShort(d, lang)}
              </button>
            ) : (
              <div className="mb-1 py-0.5 text-center text-[11.5px] text-muted">
                {dayShort(d, lang)}
              </div>
            )}
            <div className="overflow-hidden rounded-md border border-line">
              {Array.from({ length: HOURS }, (_, h) => cell(d, h))}
            </div>
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
