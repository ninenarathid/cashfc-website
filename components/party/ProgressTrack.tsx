"use client";

import type { Progress, ProgressAt } from "@/lib/party";
import { PROGRESS_COLOR, PROGRESS_HELP, PROGRESS_LABEL, progressText } from "@/lib/party";
import { useLang } from "@/lib/i18n";
import { progressHelp } from "@/lib/party-i18n";

/**
 * Where the party is in the fight, as a track you click along.
 *
 * Drawn as a line rather than offered as a dropdown because prog *is* a line —
 * everybody goes fresh, then the fight, then the clear, in that order and no
 * other. A select box would hide that shape behind a click and make "one step
 * further than last week" a thing you have to read rather than see.
 *
 * Four rungs, and the middle one carries no phase number. Putting a generic
 * P1..Pn on the track would have asked every party to invent its own numbering
 * — two groups on the same fight disagreeing about whether it has four phases
 * or five, on a board whose whole job is to make them understand each other.
 * Numbers go back in when there is a real list of phases per boss.
 *
 * Until then the party says what it is drilling in its own words, which is more
 * use than a number anyway: "P3" narrows it to a third of the fight, and
 * "second Wroth Flames" tells somebody whether they have practised the thing
 * being practised.
 *
 * The mechanic box appears only where a mechanic makes sense. Nothing in
 * particular is being drilled on a fresh start (everything is) or on a farm (it
 * dies), so on those two the box would be a field with no answer.
 */
export default function ProgressTrack(
  { value, onChange }: {
    value: Progress;
    onChange: (p: Progress) => void;
  },
) {
  const { t } = useLang();
  const at = value.at;

  const steps: { key: ProgressAt; label: string }[] = [
    { key: "fresh", label: PROGRESS_LABEL.fresh },
    { key: "prog", label: PROGRESS_LABEL.prog },
    { key: "a2c", label: PROGRESS_LABEL.a2c },
    { key: "farm", label: PROGRESS_LABEL.farm },
  ];

  const tint = PROGRESS_COLOR[at];
  const wantsMech = at === "prog" || at === "a2c";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
          {t("pf.whereWeAre")}
        </span>
        <span className="text-[13px] text-muted">{progressHelp(at, t)}</span>
      </div>

      {/* One row. The rules between the buttons are what make it read as a
          road rather than as a row of chips — the order is the meaning. */}
      <div className="flex flex-wrap items-center gap-y-1.5">
        {steps.map((s, i) => {
          const on = at === s.key;
          return (
            <span key={s.key} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-1.5 h-px w-5 bg-line" />}
              <button type="button"
                      onClick={() => onChange({
                        ...value, at: s.key,
                        // Nothing is being drilled on a farm run.
                        mech: s.key === "farm" ? "" : value.mech,
                      })}
                      style={on
                        ? { borderColor: tint, color: tint,
                            background: `color-mix(in srgb, ${tint} 14%, transparent)` }
                        : undefined}
                      className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                        on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                {s.label}
              </button>
            </span>
          );
        })}
      </div>

      {wantsMech && (
        <input value={value.mech ?? ""}
               onChange={(e) => onChange({ ...value, mech: e.target.value.slice(0, 80) })}
               placeholder={t(at === "a2c" ? "pf.mechA2c" : "pf.mechProg")}
               className="rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted" />
      )}

      <span className="text-[13px]" style={{ color: tint }}>
        {t("pf.readsAs")} {progressText(value)}
      </span>
    </div>
  );
}

/** The same fact, small, for a row in the list. */
export function ProgressChip({ progress }: { progress: Progress | undefined }) {
  const { t } = useLang();
  const text = progressText(progress);
  if (!progress || !text) return null;
  const tint = PROGRESS_COLOR[progress.at];
  return (
    <span title={progressHelp(progress.at, t)}
          style={{ color: tint,
                   borderColor: `color-mix(in srgb, ${tint} 45%, transparent)`,
                   background: `color-mix(in srgb, ${tint} 10%, transparent)` }}
          className="rounded-full border px-2 py-[2px] font-data text-[12px] uppercase tracking-[0.1em]">
      {text}
    </span>
  );
}
