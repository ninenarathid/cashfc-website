"use client";

import type { ContentKind, Loot, PayOn } from "@/lib/party";
import {
  DEFAULT_PAY_ON, LOOT_COLOR, LOOT_HELP, LOOT_LABEL, lootRulesFor, lootText,
  payOnsFor,
} from "@/lib/party";
import { useLang, type Key } from "@/lib/i18n";
import { lootHelp, lootLine, lootSay } from "@/lib/party-i18n";

/**
 * Who gets what, chosen before anybody walks in.
 *
 * Buttons rather than a dropdown, for the same reason the progress track is a
 * track: there are two or four answers, they are short, and a party reading the
 * board should be able to see which one without opening anything. A select box
 * would hide one word behind a click.
 *
 * Set on every party regardless of how far along it is. A prog night that
 * unexpectedly kills the boss still has to answer this, and the worst possible
 * time to answer it is at one in the morning with a chest already open.
 *
 * Which rules are on offer depends on the content: only a savage tier drops
 * the weekly books, so only savage is asked about them, and a map night is
 * offered the two answers a map night actually has.
 */

const PAY_LABEL: Record<PayOn, Key> = {
  clear: "party.payClear",
  mount: "party.payMount",
  both: "party.payBoth",
};
const PAY_WHY: Record<PayOn, Key> = {
  clear: "party.payClearWhy",
  mount: "party.payMountWhy",
  both: "party.payBothWhy",
};
const PAY_ORDER: PayOn[] = ["clear", "mount", "both"];

export default function LootPlan(
  { value, onChange, kind }: {
    value: Loot; onChange: (l: Loot) => void; kind: ContentKind | undefined;
  },
) {
  const { t } = useLang();
  const rules = lootRulesFor(kind);
  const tint = LOOT_COLOR[value.rule];
  /*
   * What this content can be paid on, and what it is set to within that.
   *
   * Read back through the list rather than trusted: a party written as an
   * extreme and then changed to an ultimate carries a trigger the ultimate
   * has no way to mean, and the line under this would have gone on promising
   * a rare mount that fight does not drop.
   */
  const pays = payOnsFor(kind);
  const stored = value.payOn ?? DEFAULT_PAY_ON;
  const payOn = pays.includes(stored) ? stored : pays[0];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
          {t("party.loot")}
        </span>
        <span className="text-[13px] text-muted">{lootHelp(value.rule, t)}</span>
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
                      payOn: r === "merc" ? (value.payOn ?? DEFAULT_PAY_ON) : undefined,
                    })}
                    style={on
                      ? { borderColor: LOOT_COLOR[r], color: LOOT_COLOR[r],
                          background: `color-mix(in srgb, ${LOOT_COLOR[r]} 14%, transparent)` }
                      : undefined}
                    className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                      on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {lootSay(r, t)}
            </button>
          );
        })}
      </div>

      {value.rule === "merc" && (
        <>
        {/*
          * A wage or a bet, and the FC has run both.
          *
          * "Mercenary, two million" reads like one deal and is two: paid at the
          * end of the night whatever dropped, or paid only if the mount does —
          * which on a bad night is nobody. Both are perfectly normal
          * arrangements and a terrible thing to discover at 1am, so the board
          * asks rather than letting two people each assume the other.
          */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-muted">{t("party.payWhen")}</span>
          {/* One trigger is a statement, not a choice: a row of buttons with
              nothing to pick between is furniture. The sentence under it says
              the same thing in words. */}
          {PAY_ORDER.filter((k) => pays.includes(k)).map((k) => {
            const on = payOn === k;
            return (
              <button key={k} type="button" title={t(PAY_WHY[k])}
                      onClick={() => onChange({ ...value, payOn: k })}
                      style={on
                        ? { borderColor: tint, color: tint,
                            background: `color-mix(in srgb, ${tint} 14%, transparent)` }
                        : undefined}
                      className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                        on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                {t(PAY_LABEL[k])}
              </button>
            );
          })}
          <span className="basis-full text-[13px] text-muted">{t(PAY_WHY[payOn])}</span>
        </div>

        <label className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-muted">{t("pf.payEach")}</span>
          <input type="number" min={0} step={100000}
                 value={value.pay ?? ""}
                 onChange={(e) => onChange({
                   ...value,
                   pay: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                 })}
                 placeholder="2000000"
                 className="w-40 rounded-lg border border-line bg-surface px-3 py-1.5 text-[15px] text-ink placeholder:text-muted" />
          <span className="text-[14px] text-muted">gil</span>
          {/* Written out as it will be read. Seven digits in a number field are
              hard to check by eye, and the difference between two hundred
              thousand and two million is the whole deal. */}
          {!!value.pay && (
            <span className="font-data text-[13.5px]" style={{ color: tint }}>
              {value.pay.toLocaleString("en-US")}
            </span>
          )}
        </label>
        </>
      )}
    </div>
  );
}

/** The same fact, small, for a row in the list. */
export function LootChip({ loot }: { loot: Loot | undefined }) {
  const { t } = useLang();
  const text = lootLine(loot, t);
  if (!loot || !text) return null;
  const tint = LOOT_COLOR[loot.rule];
  return (
    <span title={lootHelp(loot.rule, t)}
          style={{ color: tint,
                   borderColor: `color-mix(in srgb, ${tint} 45%, transparent)`,
                   background: `color-mix(in srgb, ${tint} 10%, transparent)` }}
          className="rounded-full border px-2 py-[2px] font-data text-[12px] uppercase tracking-[0.1em]">
      {text}
    </span>
  );
}
