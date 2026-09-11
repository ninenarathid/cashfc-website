"use client";

import { ROULETTES, RESETS_AT } from "@/lib/roulettes";
import { useLang } from "@/lib/i18n";

/**
 * Which roulettes tonight is.
 *
 * The whole content of the listing, and the reason it is ticked off a list
 * rather than written in prose: "Expert and Alliance" and "Leveling with the
 * new person" are different evenings sharing one content key, and a board that
 * only said "Duty Roulette" would show eleven identical rows.
 *
 * All of them, in the order the Duty Finder puts them — which is by reward
 * rather than by release, because the one people open the window for is Expert
 * and a list that buries it fifth is a list they have to read rather than scan.
 */
export default function RoulettePicker(
  { value, onChange }: {
    value: string[] | undefined;
    onChange: (v: string[] | undefined) => void;
  },
) {
  const { t } = useLang();
  const picked = new Set(value ?? []);

  const toggle = (name: string) => {
    const next = new Set(picked);
    if (!next.delete(name)) next.add(name);
    // An empty list is no list. Storing [] would put a field on the listing
    // that renders as nothing and reads as something.
    onChange(next.size ? ROULETTES.filter((r) => next.has(r.name)).map((r) => r.name) : undefined);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
          {t("pf.whichRoulettes")}
        </span>
        {/*
          * When the day turns over, in the FC's own clock.
          *
          * Said here because "shall we do roulettes tonight" is a question
          * about which side of ten it is: a party at half past nine and a
          * party at half past ten are on different days' rewards, and the one
          * that starts at 21:30 will cross the line halfway through.
          */}
        <span className="text-[13px] text-muted">
          {t("pf.roulettesReset", { at: RESETS_AT })}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ROULETTES.map((r) => {
          const on = picked.has(r.name);
          return (
            <button key={r.id} type="button" onClick={() => toggle(r.name)}
                    title={r.full}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                      on ? "border-accent bg-accent/15 text-accent"
                         : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              <span className={`grid size-4 shrink-0 place-items-center rounded-[3px] border text-[11.5px] leading-none ${
                on ? "border-accent bg-accent/30 text-accent" : "border-line"}`}>
                {on ? "✓" : ""}
              </span>
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
