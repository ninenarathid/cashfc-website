"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { isOnVacation } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

/**
 * Whose day it is, and whose it is about to be.
 *
 * Asked for by a member: a note when somebody's day comes round, and a week's
 * warning so there is time to say something. The warning is the useful half —
 * finding out on the day that you missed it by an hour is the thing this is
 * meant to prevent.
 *
 * Two kinds of day, kept apart on purpose. A birthday is a real one, entered by
 * that person on their own profile, and belongs to them rather than to their
 * character. A nameday is the character's, read off the Lodestone, and every
 * member has one whether or not they ever filled anything in — which is what
 * stops this from being a section that shows nothing for weeks at a time.
 * Labelling them the same would be a small lie told five hundred times.
 *
 * Only members still playing. Wishing a happy birthday to somebody who has not
 * logged in since last winter is worse than saying nothing.
 */

/** How far ahead to look. A week is enough notice to organise something. */
const AHEAD = 7;

interface Day {
  id: number;
  name: string;
  kind: "birthday" | "nameday";
  /** Days from today. 0 is today. */
  inDays: number;
  /** The date it lands on this year, for showing. */
  on: Date;
  /** The Eorzean wording, for a nameday. */
  text?: string | null;
}

/**
 * How many days until the next month/day, counting today as none.
 *
 * A nameday can fall on the 32nd of a moon, which no real month has, so a day
 * past the end of its month is kept at the end of that month. The alternative is
 * spilling into the next one, which would move somebody's day to a date they do
 * not recognise.
 */
function until(month: number, day: number, from: Date): { inDays: number; on: Date } {
  const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (const year of [midnight.getFullYear(), midnight.getFullYear() + 1]) {
    const last = new Date(year, month, 0).getDate();
    const on = new Date(year, month - 1, Math.min(day, last));
    const inDays = Math.round((on.getTime() - midnight.getTime()) / 86_400_000);
    if (inDays >= 0) return { inDays, on };
  }
  return { inDays: Infinity, on: midnight };
}

export default function Birthdays({ members }: { members: Member[] }) {
  const { t, lang } = useLang();
  const [birthdays, setBirthdays] = useState<Day[]>([]);
  // Today, as the reader's browser reckons it. Deliberately not read during
  // render: this page is prerendered, so a date taken there is the date of the
  // last deploy, and the section would quietly go stale between builds — worst
  // on the one morning it matters. Null until mounted, so nothing is drawn
  // until there is a real day to draw it for.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  // Everyone still playing, by character id. Both kinds of day are filtered
  // through this, so the rule lives in one place.
  const playing = useMemo(
    () => new Map(members.filter((m) => !isOnVacation(m)).map((m) => [m.id, m])),
    [members]);

  // Namedays need nothing but the roster file, so they render on the server's
  // first paint and never depend on being signed in.
  const namedays = useMemo(() => {
    const out: Day[] = [];
    if (!now) return out;
    for (const m of playing.values()) {
      const n = m.nameday;
      if (!n?.month || !n.day) continue;
      const { inDays, on } = until(n.month, n.day, now);
      if (inDays <= AHEAD) {
        out.push({ id: m.id, name: m.name, kind: "nameday", inDays, on, text: n.text });
      }
    }
    return out;
  }, [playing, now]);

  // Real birthdays are opt-in and live in Supabase, so they arrive after.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !now) return;
    supabase
      .from("profiles")
      .select("character_id, birth_month, birth_day")
      .not("character_id", "is", null)
      .not("birth_month", "is", null)
      .then(({ data, error }) => {
        // Silently absent before migration_v3.sql adds the columns.
        if (error || !data) return;
        const out: Day[] = [];
        for (const r of data as {
          character_id: number; birth_month: number | null; birth_day: number | null;
        }[]) {
          const m = playing.get(r.character_id);
          if (!m || !r.birth_month || !r.birth_day) continue;
          const { inDays, on } = until(r.birth_month, r.birth_day, now);
          if (inDays <= AHEAD) {
            out.push({ id: m.id, name: m.name, kind: "birthday", inDays, on });
          }
        }
        setBirthdays(out);
      });
  }, [playing, now]);

  const all = useMemo(() => {
    // A real birthday outranks a nameday on the same day: it is the rarer thing
    // and the one somebody chose to tell us.
    const rows = [...birthdays, ...namedays];
    rows.sort((a, b) => a.inDays - b.inDays
      || (a.kind === b.kind ? 0 : a.kind === "birthday" ? -1 : 1)
      || a.name.localeCompare(b.name));
    return rows;
  }, [birthdays, namedays]);

  if (!all.length) return null;

  const today = all.filter((d) => d.inDays === 0);
  const soon = all.filter((d) => d.inDays > 0);
  const when = (d: Day) => d.on.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB",
    { day: "numeric", month: "short" });

  const Name = ({ d }: { d: Day }) => (
    <Link href={`/member/${d.id}`}
          title={d.kind === "nameday" ? d.text ?? undefined : undefined}
          className="text-ink no-underline hover:text-gold">
      {d.name}
    </Link>
  );

  return (
    <section className="mt-5 rounded-xl border border-gold/40 bg-gold/8 px-4 py-3">
      {today.length > 0 && (
        <p className="leading-relaxed">
          <span className="font-display font-semibold text-gold">
            🎂 {t("bday.today")}{" "}
          </span>
          {today.map((d, i) => (
            <span key={`${d.kind}-${d.id}`}>
              {i > 0 && " · "}
              <Name d={d} />
              {d.kind === "nameday" && (
                <span className="ml-1 text-[12px] text-muted">({t("bday.nameday")})</span>
              )}
            </span>
          ))}
          <span className="text-[13px] text-muted"> — {t("bday.wish")}</span>
        </p>
      )}

      {/* Grouped by the day rather than listed one per line. Six people share
          the last day of a moon in this week alone, and printing the same date
          six times is a list you read instead of a date you notice. */}
      {soon.length > 0 && (
        <div className={today.length > 0 ? "mt-2.5 border-t border-gold/20 pt-2.5" : ""}>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-gold/80">
            {t("bday.soon", { n: AHEAD })}
          </div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {[...new Set(soon.map((d) => d.inDays))].map((inDays) => {
              const on = soon.filter((d) => d.inDays === inDays);
              return (
                <li key={inDays} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
                  <span className="font-data text-[11.5px] text-muted">
                    {when(on[0])}
                    <span className="ml-1.5">
                      {inDays === 1 ? t("bday.tomorrow") : t("bday.inDays", { n: inDays })}
                    </span>
                  </span>
                  <span className="min-w-0">
                    {on.map((d, i) => (
                      <span key={`${d.kind}-${d.id}`}>
                        {i > 0 && <span className="text-muted"> · </span>}
                        <Name d={d} />
                        {d.kind === "birthday" && (
                          <span className="ml-1 text-[12px] text-gold">
                            🎂 {t("bday.birthday")}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* Said once, at the bottom, rather than after every name: nearly all
              of these are namedays, so it is the exception that is worth
              marking, not the rule. */}
          <p className="mt-1.5 text-[11.5px] text-muted">{t("bday.namedayNote")}</p>
        </div>
      )}
    </section>
  );
}
