"use client";

import { useMemo, useState } from "react";
import type { ContentDef, SlotDef } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import type { SuggestRow } from "@/lib/suggest";
import { hasHistory, seatWantLabel, suggestFor } from "@/lib/suggest";
import JobIcon, { jobLabel } from "@/components/JobIcon";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";

/**
 * Who to ask for this seat.
 *
 * Filling a party used to mean remembering who plays what and who has seen the
 * fight — which the lead of a static knows and nobody else does, so seats went
 * to whoever came to mind and the member quietly learning M12S for a month
 * never got asked.
 *
 * Every fact here is already on this site: the jobs come from FF Logs, so do
 * the clears and the progress, and the hours are the grid people filled in
 * themselves. None of it is new; it has simply never been pointed at a seat.
 *
 * A suggestion is not a decision. This orders a list and says why each name is
 * on it; the search box underneath still finds anybody at all, including people
 * who are not on this site.
 */

/** More than this and it stops being a suggestion and becomes the roster. */
const SHOW = 6;

export default function SeatSuggest(
  { slot, def, rows, labels, startsAt, when, exclude, asked, people, onPick }: {
    slot: SlotDef;
    def: ContentDef | undefined;
    rows: SuggestRow[];
    labels: string[];
    startsAt: string;
    /** Character id -> availability grid, as the profile stores it. */
    when: Record<number, string | null>;
    exclude: Set<number>;
    /**
     * Anybody who has said on the board that they are looking for this.
     *
     * Everything else in this list is inference — they play the job, they
     * ticked the hour, they killed it last tier — and this is the one thing
     * that is not. Somebody who put their hand up is not a better guess than
     * the others; they are not a guess.
     */
    asked?: Set<number>;
    /** For the name and the face, which the index deliberately does not carry. */
    people: PersonOption[];
    onPick: (p: PersonOption) => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  /*
   * On by default.
   *
   * The first question about a suggestion is whether they can come at all, and
   * a list that opens with everybody in it puts the ones who cannot at the top
   * as often as not. The switch is right there for the night when nobody who
   * ticked the hour can make it — and the count beside it says how many the
   * filter is holding back, so it is never a silent one.
   */
  const [freeOnly, setFreeOnly] = useState(true);
  const [more, setMore] = useState(false);

  const byId = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])) as Record<number, PersonOption>,
    [people]);

  const all = useMemo(() => suggestFor({
    rows, slot, kind: def?.kind, boss: def?.name, short: def?.short ?? def?.badge,
    labels, startsAt, when, exclude,
  // The index carries everybody the pipeline knows; the party can only contain
  // somebody this page has a name and a face for.
  }).filter((s) => byId[s.id]), [rows, slot, def, labels, startsAt, when, exclude, byId]);

  /*
   * Only the ones who said they play then.
   *
   * Strict on purpose: it keeps the people who ticked the hour and nobody else,
   * including everybody who has never filled the grid in. That is a real cost —
   * "has not said" is not "is busy" — which is why the count of who is being
   * held back sits next to the switch rather than the filter working quietly.
   */
  const list = useMemo(() => {
    const some = freeOnly ? all.filter((s) => s.free === true) : all;
    // Volunteers first, and never filtered out by the "free then" switch: an
    // empty grid is why most of the roster fails that test, and somebody who
    // has just told the board they want this evening has answered the
    // question the grid was being asked in place of.
    if (!asked?.size) return some;
    const up = all.filter((s) => asked.has(s.id));
    const rest = some.filter((s) => !asked.has(s.id));
    return [...up, ...rest];
  }, [all, freeOnly, asked]);
  const shown = more ? list.slice(0, 24) : list.slice(0, SHOW);

  if (!all.length) return null;

  const withHistory = hasHistory(def?.kind);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.12em] text-muted">
          {t("pf.suggested", { want: seatWantLabel(slot) })}
        </span>
        <label className="flex items-center gap-1.5 text-[13px] text-muted">
          <input type="checkbox" checked={freeOnly}
                 onChange={(e) => { setFreeOnly(e.target.checked); setMore(false); }} />
          {t("pf.freeThen")}
        </label>
      </div>

      {!shown.length && (
        <span className="text-[13px] text-muted">{t("pf.nobodyFree")}</span>
      )}

      {shown.map((s) => {
        const p = byId[s.id];
        const src = overrides[s.id] || p.avatar;
        return (
          <button key={s.id} type="button" onClick={() => onPick(p)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" width={34} height={34}
                   className="size-[34px] shrink-0 rounded-full border border-line object-cover" />
            ) : <span className="size-[34px] shrink-0 rounded-full border border-line" />}

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[14.5px] text-ink">{p.name}</span>
                {asked?.has(s.id) && (
                  <span className="rounded-full border border-jade/50 px-1.5 py-[1px] font-data text-[11px] uppercase tracking-[0.08em] text-jade">
                    {t("want.askedFor")}
                  </span>
                )}
                {/*
                  * The jobs, with the ones they actually killed this fight on
                  * ringed.
                  *
                  * "Plays White Mage" and "cleared this on White Mage" are
                  * different claims, and a lead reading a row of icons under
                  * "cleared it" takes them for the second. Three at most: past
                  * that the row is a list of everything they have ever touched
                  * rather than an answer to the seat.
                  */}
                {s.jobs.slice(0, 3).map((j) => (
                  <span key={j}
                        title={s.onThis.includes(j)
                          ? t("pf.clearedOn", { job: jobLabel(j) }) : jobLabel(j)}
                        className={`inline-flex rounded-full ${
                          s.onThis.includes(j)
                            ? "ring-1 ring-jade/70" : ""}`}>
                    <JobIcon job={j} size={17} />
                  </span>
                ))}
              </span>

              {/*
                * Why this name is here.
                *
                * Said out loud, because a list that has quietly reordered
                * itself is a list nobody trusts — and "cleared it" and "is
                * learning it, 240 pulls in" are different reasons to ask
                * somebody, worth telling apart at a glance.
                */}
              <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted">
                {withHistory && s.history === "cleared" && (
                  <span className="text-jade">
                    {s.onThis.length
                      ? t("pf.clearedOn", { job: jobLabel(s.onThis[0]) })
                      // They know the fight, and not from this seat. Worth
                      // saying rather than hiding: knowing it is most of why
                      // you would ask them.
                      : s.elsewhere ? t("pf.clearedElsewhere")
                        : t("pf.hasCleared")}
                  </span>
                )}
                {withHistory && s.history === "learning" && (
                  <span className="text-gold">
                    {t("pf.isLearning")}
                    {s.pulls ? ` · ${t("pf.nPulls", { n: s.pulls })}` : ""}
                  </span>
                )}
                {s.free === true && (
                  <>
                    {withHistory && s.history && <span className="opacity-40">·</span>}
                    <span>{t("pf.freeAtTime")}</span>
                  </>
                )}
                {!s.exact && (
                  <>
                    {(s.history || s.free === true) && <span className="opacity-40">·</span>}
                    {/* The seat's convention is a preference, not a rule. A
                        Sage on H1 is a good healer and a slightly odd party,
                        so they are here and the row says why they are lower. */}
                    <span className="opacity-70">{t("pf.offConvention")}</span>
                  </>
                )}
              </span>
            </span>
          </button>
        );
      })}

      {list.length > shown.length && (
        <button type="button" onClick={() => setMore(true)}
                className="self-start text-[13px] text-muted underline hover:text-ink">
          {t("pf.moreSuggestions", { n: list.length - shown.length })}
        </button>
      )}
    </div>
  );
}
