"use client";

import { useLang } from "@/lib/i18n";
import { CHANGELOG, type Change, type ChangeKind, type Release } from "@/lib/changelog";

/**
 * What changed on the site, day by day.
 *
 * Written for somebody who was not watching. Every line says what is different
 * for them rather than what was done to the code — "the gallery loads 32x
 * faster" and not "added thumbnail generation" — because a changelog nobody
 * outside the project can read is a changelog nobody outside the project reads.
 *
 * One component for both places it appears: the whole list on its own page, and
 * the newest day alone on the front page. `limit` is the only difference, so
 * the two can never fall out of step.
 */

const KIND_TONE: Record<ChangeKind, string> = {
  new: "border-jade/50 bg-jade/10 text-jade",
  better: "border-accent/50 bg-accent/10 text-accent",
  fix: "border-gold/50 bg-gold/10 text-gold",
};

const KIND_KEY = { new: "log.new", better: "log.better", fix: "log.fix" } as const;

export default function Changelog({ limit }: { limit?: number }) {
  const { t, lang } = useLang();
  const releases = limit ? CHANGELOG.slice(0, limit) : CHANGELOG;
  if (!releases.length) {
    return <p className="text-[13px] text-muted">{t("log.none")}</p>;
  }

  // Today and yesterday get a word instead of a date. It is the difference
  // between "there is something new" and "there was something new at some
  // point", which is the only reason anybody looks at the top of this list.
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const when = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const on = new Date(y, m - 1, d);
    const days = Math.round((midnight.getTime() - on.getTime()) / 86_400_000);
    if (days === 0) return t("log.today");
    if (days === 1) return t("log.yesterday");
    return on.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB",
      { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="flex flex-col gap-4">
      {releases.map((r: Release) => (
        <section key={r.date}>
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-data text-[11px] uppercase tracking-[0.18em] text-accent">
              {when(r.date)}
            </span>
            {r.title && (
              <h3 className="font-display text-[15px] font-semibold">
                {r.title[lang]}
              </h3>
            )}
          </div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {r.changes.map((c: Change, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.1em] ${KIND_TONE[c.kind]}`}>
                  {t(KIND_KEY[c.kind])}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink/90">
                  {c.what[lang]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
