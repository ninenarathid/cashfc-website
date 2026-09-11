"use client";

import type { Party, SeatRule, SlotDef, SlotRole } from "@/lib/party";
import { openTo } from "@/lib/party";
import JobIcon, { ALL_JOBS, ROLE_GROUP } from "@/components/JobIcon";
import { useLang } from "@/lib/i18n";

/**
 * Which jobs a seat will take.
 *
 * "Healer" is not always a precise enough advert. A group with no raise wants a
 * White Mage or an Astrologian and will say so in Discord anyway; a group
 * pushing a savage fight often knows exactly which two DPS it is short. Saying
 * it on the seat means the person reading the board can tell at a glance
 * whether they are the person being asked for, which is the whole job of this
 * page.
 *
 * Left empty it says nothing and the seat takes any job of its role — which is
 * the ordinary case, and why the control opens closed.
 */

/** The jobs that can play a seat of this role, in the game's own order. */
/**
 * What a particular seat will take.
 *
 * A seat with no role is a number, and a number takes anything. It carries
 * "dps" internally because a SlotDef has to say something, and every job list
 * on this board was reading that placeholder as an answer — so a party of
 * eight with no composition was quietly a party of eight DPS, and the grid
 * advertised thirteen jobs on a seat whose whole point was that it did not
 * care. It is asked about the seat now rather than the role behind it.
 */
export function jobsForSlot(slot: SlotDef): string[] {
  if (!slot.free) return jobsForRole(slot.role);
  return (["tank", "healer", "dps"] as SlotRole[]).flatMap(jobsForRole);
}

export function jobsForRole(role: SlotRole): string[] {
  const want = role === "tank" ? "Tanks" : role === "healer" ? "Healers" : "DPS";
  return ALL_JOBS.filter((j) => ROLE_GROUP[j.role] === want)
    // Blue Mage cannot enter any of the content on this board, so offering it
    // is offering a choice that would be wrong wherever it was picked.
    .filter((j) => j.name !== "Blue Mage")
    .map((j) => j.name.replace(/\s+/g, ""));
}

export default function JobRule(
  { party, slot, value, onChange }: {
    party: Party;
    slot: SlotDef;
    value: SeatRule;
    onChange: (r: SeatRule) => void;
  },
) {
  const { t } = useLang();
  const all = jobsForSlot(slot);
  const picked = new Set(value.jobs ?? []);
  // What the seat is open to at this moment, which is not the same as what was
  // ticked: one-per-job takes jobs off the list as the party fills up.
  const live = openTo({ ...party, rules: { ...party.rules, [slot.id]: value } },
                      slot.id, all);
  const liveSet = new Set(live);

  const toggle = (job: string) => {
    const next = new Set(picked);
    if (!next.delete(job)) next.add(job);
    onChange({ ...value, jobs: [...next] });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-data text-[11.5px] uppercase tracking-[0.12em] text-muted">
          {t("pf.jobsFor", { seat: slot.label })}
        </span>
        {!!picked.size && (
          <button type="button" onClick={() => onChange({ ...value, jobs: [] })}
                  className="text-[13px] text-muted underline hover:text-ink">
            {t("pf.anyJob")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {all.map((job) => {
          const on = picked.has(job);
          // Ticked but ruled out by one-per-job: shown struck through rather
          // than removed, so it is clear the rule did it and not a misclick.
          const blocked = on && !liveSet.has(job);
          return (
            <button key={job} type="button" onClick={() => toggle(job)}
                    title={blocked ? "Somebody in the party is already on this" : job}
                    className={`flex items-center gap-1 rounded-full border px-2 py-[3px] text-[13px] transition-colors ${
                      on ? blocked
                        ? "border-line/60 text-muted line-through"
                        : "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              <JobIcon job={job} size={22} />
              {job.replace(/([a-z])([A-Z])/g, "$1 $2")}
            </button>
          );
        })}
      </div>

      {/* What the rule actually leaves open. A rule that has quietly closed a
          seat entirely is worth finding out about here rather than from
          somebody who could not join. */}
      <span className={`text-[13px] ${live.length ? "text-jade" : "text-chili"}`}>
        {live.length === all.length ? t("pf.openToAny", { role: slot.role })
          : live.length ? `${t("pf.openToN", { n: live.length })} ` + live
              .map((j) => j.replace(/([a-z])([A-Z])/g, "$1 $2")).join(", ")
          : t("pf.seatShut")}
        {/* Said here as well as on the party, because this is where somebody
            finds out their four ticks have become one. */}
        {party.oneOfEachJob && live.length < (value.jobs?.length || all.length) && (
          <span className="opacity-70"> · {t("pf.onePerJobOn")}</span>
        )}
      </span>
    </div>
  );
}

/** The rule on a seat, small enough to sit under a name in the grid. */
export function RuleMark({ party, slot }: { party: Party; slot: SlotDef }) {
  const { t } = useLang();
  // Only what this seat itself asks for. The no-duplicates rule is the party's
  // and is said once above the grid -- repeating it on all eight seats would
  // be eight copies of one sentence.
  if (!party.rules?.[slot.id]?.jobs?.length) return null;
  const live = openTo(party, slot.id, jobsForSlot(slot));
  if (!live.length) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {/* The icons, up to seven. Seven fit across a seat on two rows and are
          read at a glance; past that they are a wall rather than an answer,
          and a count says the same thing in less space. */}
      {live.length <= 7
        ? live.map((j) => <JobIcon key={j} job={j} size={26} />)
        : <span className="font-data text-[11px] uppercase tracking-[0.1em] text-muted">
            {t("pf.jobsN", { n: live.length })}
          </span>}
    </span>
  );
}

/** The party-wide rule, said once. */
export function OneEachMark({ party }: { party: Party }) {
  const { t } = useLang();
  if (!party.oneOfEachJob) return null;
  return (
    <span title={t("pf.noDouble")}
          className="rounded-full border border-line px-2 py-[2px] font-data text-[11px] uppercase tracking-[0.1em] text-muted">
      {t("pf.onePerJob")}
    </span>
  );
}
