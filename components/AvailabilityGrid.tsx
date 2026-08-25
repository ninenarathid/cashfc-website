"use client";

import { BLOCKS, DAYS, blockLabel, dayLabel, parse, slotIndex } from "@/lib/availability";
import { useLang } from "@/lib/i18n";

/**
 * The week as a grid: seven days down, four blocks across.
 *
 * Editing is click-to-toggle with a whole-row and whole-column shortcut, because
 * the real answers are shaped that way — "free every evening" and "free all
 * Saturday" are what people mean, and making them click four or seven cells to
 * say it is how a form gets abandoned half filled.
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

  const emit = (next: boolean[]) =>
    onChange?.(next.map((v) => (v ? "1" : "0")).join(""));

  const toggle = (day: number, block: number) => {
    const next = [...slots];
    const i = slotIndex(day, block);
    next[i] = !next[i];
    emit(next);
  };

  // Fill the row unless it is already full, in which case clear it — one control
  // that does the obvious thing in both directions.
  const toggleDay = (day: number) => {
    const full = BLOCKS.every((_, b) => slots[slotIndex(day, b)]);
    const next = [...slots];
    BLOCKS.forEach((_, b) => { next[slotIndex(day, b)] = !full; });
    emit(next);
  };

  const toggleBlock = (block: number) => {
    const full = DAYS.every((_, d) => slots[slotIndex(d, block)]);
    const next = [...slots];
    DAYS.forEach((_, d) => { next[slotIndex(d, block)] = !full; });
    emit(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[380px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-20" />
            {BLOCKS.map((b, i) => (
              <th key={b.key} className="px-1 pb-1 text-center align-bottom">
                {editable ? (
                  <button type="button" onClick={() => toggleBlock(i)}
                          title={b.hours}
                          className="w-full rounded-md px-1 py-0.5 text-[11.5px] text-muted transition-colors hover:bg-card hover:text-amber">
                    <div>{blockLabel(i, lang)}</div>
                    <div className="font-data text-[9.5px] opacity-70">{b.hours}</div>
                  </button>
                ) : (
                  <div className="px-1 text-[11.5px] text-muted" title={b.hours}>
                    <div>{blockLabel(i, lang)}</div>
                    <div className="font-data text-[9.5px] opacity-70">{b.hours}</div>
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((_, d) => (
            <tr key={d}>
              <th scope="row" className="text-left">
                {editable ? (
                  <button type="button" onClick={() => toggleDay(d)}
                          className="w-full rounded-md px-1.5 py-1 text-left text-[12.5px] font-normal text-muted transition-colors hover:bg-card hover:text-amber">
                    {dayLabel(d, lang)}
                  </button>
                ) : (
                  <span className="px-1.5 text-[12.5px] font-normal text-muted">
                    {dayLabel(d, lang)}
                  </span>
                )}
              </th>
              {BLOCKS.map((b, i) => {
                const on = slots[slotIndex(d, i)];
                const cls = on
                  ? "border-jade/60 bg-jade/20"
                  : "border-line bg-card";
                return (
                  <td key={b.key} className="p-0">
                    {editable ? (
                      <button type="button" onClick={() => toggle(d, i)}
                              aria-pressed={on}
                              aria-label={`${dayLabel(d, lang)} ${blockLabel(i, lang)}`}
                              className={`h-8 w-full rounded-md border transition-colors ${cls} ${
                                on ? "hover:bg-jade/30" : "hover:border-muted"}`} />
                    ) : (
                      <div aria-label={on ? `${dayLabel(d, lang)} ${blockLabel(i, lang)}` : undefined}
                           className={`h-6 w-full rounded-md border ${cls}`} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
