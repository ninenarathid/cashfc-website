"use client";

import type { ContentKind, Loot, LootRule } from "@/lib/party";
import { LOOT_COLOR, LOOT_HELP, LOOT_LABEL, lootRulesFor, lootText } from "@/lib/party";

/**
 * Who gets what, chosen before anybody walks in.
 *
 * Three buttons rather than a dropdown, for the same reason the progress track
 * is a track: there are exactly three answers, they are short, and a party
 * reading the board should be able to see which one without opening anything.
 * A select box would hide one word behind a click.
 *
 * Set on every party regardless of how far along it is. A prog night that
 * unexpectedly kills the boss still has to answer this, and the worst possible
 * time to answer it is at one in the morning with a chest already open.
 *
 * Which rules are on offer depends on the content: only a savage tier drops
 * the weekly books, so only savage is asked about them.
 */
export default function LootPlan(
  { value, onChange, kind }: {
    value: Loot; onChange: (l: Loot) => void; kind: ContentKind | undefined;
  },
) {
  const rules = lootRulesFor(kind);
  const tint = LOOT_COLOR[value.rule];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
          Loot
        </span>
        <span className="text-[11.5px] text-muted">{LOOT_HELP[value.rule]}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rules.map((r) => {
          const on = value.rule === r;
          return (
            <button key={r} type="button"
                    onClick={() => onChange({
                      rule: r,
                      // The price only means anything under one of the three,
                      // so it is dropped rather than carried around invisibly
                      // waiting to reappear.
                      pay: r === "merc" ? value.pay : undefined,
                    })}
                    style={on
                      ? { borderColor: LOOT_COLOR[r], color: LOOT_COLOR[r],
                          background: `color-mix(in srgb, ${LOOT_COLOR[r]} 14%, transparent)` }
                      : undefined}
                    className={`rounded-full border px-3 py-[3px] text-[12.5px] transition-colors ${
                      on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {LOOT_LABEL[r]}
            </button>
          );
        })}
      </div>

      {value.rule === "merc" && (
        <label className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted">Paying each person</span>
          <input type="number" min={0} step={100000}
                 value={value.pay ?? ""}
                 onChange={(e) => onChange({
                   ...value,
                   pay: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                 })}
                 placeholder="2000000"
                 className="w-40 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13.5px] text-ink placeholder:text-muted" />
          <span className="text-[12.5px] text-muted">gil</span>
          {/* Written out as it will be read. Seven digits in a number field are
              hard to check by eye, and the difference between two hundred
              thousand and two million is the whole deal. */}
          {!!value.pay && (
            <span className="font-data text-[12px]" style={{ color: tint }}>
              {value.pay.toLocaleString("en-US")}
            </span>
          )}
        </label>
      )}
    </div>
  );
}

/** The same fact, small, for a row in the list. */
export function LootChip({ loot }: { loot: Loot | undefined }) {
  const text = lootText(loot);
  if (!loot || !text) return null;
  const tint = LOOT_COLOR[loot.rule];
  return (
    <span title={LOOT_HELP[loot.rule]}
          style={{ color: tint,
                   borderColor: `color-mix(in srgb, ${tint} 45%, transparent)`,
                   background: `color-mix(in srgb, ${tint} 10%, transparent)` }}
          className="rounded-full border px-2 py-[2px] font-data text-[10.5px] uppercase tracking-[0.1em]">
      {text}
    </span>
  );
}
