"use client";

import type { Progress, ProgressAt } from "@/lib/party";
import { PROGRESS_COLOR, PROGRESS_HELP, PROGRESS_LABEL, progressText } from "@/lib/party";
import { phasesOf } from "@/lib/phases";
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
 * Under it, the phase, for the fights that have a written list of them. A
 * generic P1..Pn would have asked every party to invent its own numbering —
 * two groups on the same fight disagreeing about whether it has four phases or
 * five, on a board whose whole job is to make them understand each other — so
 * the rows come from phases.ts and every party on that fight counts the same
 * way. A fight with no list offers no row, which is where this stood before.
 *
 * The phase and the mechanic are both worth having and answer different
 * questions. "P3" narrows it to a third of the fight; "second Wroth Flames"
 * tells somebody whether they have practised the thing being practised.
 *
 * The mechanic box appears only where a mechanic makes sense. Nothing in
 * particular is being drilled on a fresh start (everything is) or on a farm (it
 * dies), so on those two the box would be a field with no answer.
 */
export default function ProgressTrack(
  { value, onChange, contentKey }: {
    value: Progress;
    onChange: (p: Progress) => void;
    /** Which fight, so the phases offered are that fight's own. */
    contentKey?: string;
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
  /*
   * Only on the two rungs where part of a fight is a thing to name.
   *
   * A fresh start is the whole fight from the top and a farm run is the whole
   * fight until it dies — neither has a phase, and asking would be a question
   * with no answer. Prog and A2C both do: one is "we are drilling this bit",
   * the other is "we start here and take it to the end", and the Japanese
   * board writes both, as 「P3練習」 and 「P3クリ目」.
   */
  const phases = wantsMech ? phasesOf(contentKey) : [];

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
                        // And a phase is not a fact about a farm night or a
                        // fresh start. Dropped with the row that set it,
                        // rather than left behind where nothing on the form
                        // can reach it to turn it off.
                        phase: s.key === "prog" || s.key === "a2c"
                          ? value.phase : undefined,
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

      {/*
        * The phases of this fight, where somebody has written them down.
        *
        * With the boss on the chip rather than behind a tooltip. "P3" is what
        * a party says out loud and what a Japanese listing leads with, but it
        * is also the one label nobody can check: a lead who knows the fight as
        * Oracle of Darkness has to count the bosses on their fingers to find
        * out whether that is three or four, and counting wrong is the whole
        * reason this list exists.
        *
        * Pressable off as well as on: a party that set P3 and then decided the
        * night is about the whole fight has to be able to say so.
        */}
      {phases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {phases.map((ph) => {
            const on = value.phase === ph.n;
            return (
              <button key={ph.n} type="button"
                      onClick={() => onChange({
                        ...value, phase: on ? undefined : ph.n,
                      })}
                      style={on
                        ? { borderColor: tint, color: tint,
                            background: `color-mix(in srgb, ${tint} 14%, transparent)` }
                        : undefined}
                      className={`flex flex-col items-start rounded-lg border px-2.5 py-1 leading-tight transition-colors ${
                        on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                <span className="font-data text-[13px] uppercase tracking-[0.1em]">
                  {/^\d/.test(ph.n) ? `P${ph.n}` : ph.n}
                </span>
                <span className="text-[12.5px] opacity-75">{ph.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* What picking one is for, because nothing else on the page says so.
          The row appears and disappears as the rung changes, which is a
          behaviour worth one sentence rather than a thing to work out. */}
      {phases.length > 0 && (
        <span className="text-[13px] text-muted">{t("pf.phaseWhy")}</span>
      )}

      {wantsMech && (
        <input value={value.mech ?? ""}
               onChange={(e) => onChange({ ...value, mech: e.target.value.slice(0, 80) })}
               placeholder={t(at === "a2c" ? "pf.mechA2c" : "pf.mechProg")}
               className="rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted" />
      )}

      {/* Whose strategy, which is the first thing somebody checks before
          joining a party they did not arrange — and the one fact a Japanese
          listing is judged on that we were not asking anybody for. Free text
          because the answer is a name, and the names change every tier. */}
      <input value={value.plan ?? ""}
             onChange={(e) => onChange({ ...value, plan: e.target.value.slice(0, 40) })}
             placeholder={t("pf.planHint")}
             className="rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-muted" />

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
