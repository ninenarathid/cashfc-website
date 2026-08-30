"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Member } from "@/lib/types";
import { isOnVacation } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

/**
 * Whose birthday it is, and whose it is about to be.
 *
 * Asked for by a member: a note when somebody's day comes round, and a week's
 * warning so there is time to say something. The warning is the useful half —
 * finding out on the day that you missed it by an hour is the thing this is
 * meant to prevent.
 *
 * Real birthdays only, entered by that person on their own profile. The
 * character's Eorzean nameday is on the Lodestone for all five hundred members
 * and would fill this section every week of the year, but it is not the same
 * thing and nobody asked to be wished a happy nameday. A quiet week is the
 * right price for the section meaning what it says.
 *
 * Only members still playing. Wishing a happy birthday to somebody who has not
 * logged in since last winter is worse than saying nothing.
 */

/** How far ahead to look. A week is enough notice to organise something. */
const AHEAD = 7;

interface Day {
  id: number;
  name: string;
  /** Days from today. 0 is today. */
  inDays: number;
  /** The date it lands on, for showing. */
  on: Date;
}

/** How many days until the next month/day, counting today as none. */
function until(month: number, day: number, from: Date): { inDays: number; on: Date } {
  const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (const year of [midnight.getFullYear(), midnight.getFullYear() + 1]) {
    // 29 February in a year that has none is kept inside February rather than
    // spilling into March, which would move somebody's birthday to a date they
    // do not recognise.
    const last = new Date(year, month, 0).getDate();
    const on = new Date(year, month - 1, Math.min(day, last));
    const inDays = Math.round((on.getTime() - midnight.getTime()) / 86_400_000);
    if (inDays >= 0) return { inDays, on };
  }
  return { inDays: Infinity, on: midnight };
}

export default function Birthdays({ members }: { members: Member[] }) {
  const { t, lang } = useLang();
  const [days, setDays] = useState<Day[]>([]);
  // Today, as the reader's browser reckons it. Deliberately not read during
  // render: this page is prerendered, so a date taken there is the date of the
  // last deploy, and the section would quietly go stale between builds — worst
  // on the one morning it matters.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  const playing = useMemo(
    () => new Map(members.filter((m) => !isOnVacation(m)).map((m) => [m.id, m])),
    [members]);

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
          if (inDays <= AHEAD) out.push({ id: m.id, name: m.name, inDays, on });
        }
        out.sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name));
        setDays(out);
      });
  }, [playing, now]);

  if (!days.length) return null;

  const today = days.filter((d) => d.inDays === 0);
  const soon = days.filter((d) => d.inDays > 0);
  const when = (d: Day) => d.on.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB",
    { day: "numeric", month: "short" });

  const Name = ({ d }: { d: Day }) => (
    <Link href={`/member/${d.id}`} className="text-ink no-underline hover:text-gold">
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
            <span key={d.id}>
              {i > 0 && " · "}
              <Name d={d} />
            </span>
          ))}
          <span className="text-[13px] text-muted"> — {t("bday.wish")}</span>
        </p>
      )}

      {/* Grouped by the day rather than listed one per line, so a date two
          people share is one date you notice instead of two lines you read. */}
      {soon.length > 0 && (
        <div className={today.length > 0 ? "mt-2.5 border-t border-gold/20 pt-2.5" : ""}>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-gold/80">
            {t("bday.soon", { n: AHEAD })}
          </div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {[...new Set(soon.map((d) => d.inDays))].map((inDays) => {
              const on = soon.filter((d) => d.inDays === inDays);
              return (
                <li key={inDays}
                    className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
                  <span className="font-data text-[11.5px] text-muted">
                    {when(on[0])}
                    <span className="ml-1.5">
                      {inDays === 1 ? t("bday.tomorrow") : t("bday.inDays", { n: inDays })}
                    </span>
                  </span>
                  <span className="min-w-0">
                    {on.map((d, i) => (
                      <span key={d.id}>
                        {i > 0 && <span className="text-muted"> · </span>}
                        <Name d={d} />
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
