"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { domainPollOver, useDomainPoll } from "@/lib/domain-poll";

/**
 * Which domain the site should move to, on the front page while a round runs.
 *
 * On the front page because everybody passes through it, and a vote that lives
 * behind a tab is decided by whoever happened to open that tab.
 *
 * The names are set when the round opens, and nothing else is on the card: no
 * price and no suggesting. The first round did both; this is the run-off, and
 * the question is only which name.
 *
 * Results wait until you have voted, as on the gallery poll. The list stays in
 * the order the names were put on while the vote is open, so the row under your
 * pointer does not jump when a count changes; once it closes it is sorted, and
 * the order is the answer.
 */
export default function DomainVote() {
  const { t } = useLang();
  const { poll, choices, mine, tally, eligible, signedIn, ready, busy, vote } = useDomainPoll();

  if (!ready || !poll || !choices.length) return null;
  const over = domainPollOver(poll);

  const show = mine != null || over;
  const canVote = signedIn && eligible && !over;
  const total = tally ? Object.values(tally).reduce((n, v) => n + v, 0) : 0;
  const best = tally ? Math.max(0, ...Object.values(tally)) : 0;
  const rows = over
    ? [...choices].sort((a, b) => (tally?.[b.id] ?? 0) - (tally?.[a.id] ?? 0))
    : choices;

  const left = !over
    ? Math.max(0, Math.ceil((new Date(poll.closes_at).getTime() - Date.now()) / 3_600_000))
    : null;

  return (
    <section className="mt-4 rounded-xl border border-accent/40 bg-surface p-4">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <h2 className="font-display text-read font-semibold text-accent">
          {t("domain.heading")}
        </h2>
        {left != null && (
          <span className="text-ui text-muted">
            {left >= 24
              ? t("poll.daysLeft", { n: Math.ceil(left / 24) })
              : t("poll.hoursLeft", { n: left })}
          </span>
        )}
        {over && <span className="text-ui text-muted">{t("poll.closed")}</span>}
      </div>

      <p className="text-lead leading-relaxed text-ink">{t("domain.question")}</p>

      <div className="mt-3 flex flex-col gap-2">
        {rows.map((c) => {
          const n = tally?.[c.id] ?? 0;
          const pct = show && total ? Math.round((n / total) * 100) : 0;
          const picked = mine === c.id;
          const top = over && n > 0 && n === best;
          return (
            <button key={c.id} type="button"
                    disabled={!canVote || busy}
                    onClick={() => void vote(c.id)}
                    aria-pressed={picked}
                    className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors ${
                      picked || top ? "border-accent" : "border-line"} ${
                      canVote ? "hover:border-accent" : "cursor-default"}`}>
              {/* The share, drawn behind the name, so the row is both the
                  answer and how many chose it. */}
              {show && (
                <span aria-hidden
                      style={{ width: `${pct}%` }}
                      className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                        picked || top ? "bg-accent/25" : "bg-card"}`} />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-data text-read text-ink">
                  {picked && <span className="mr-1.5 text-accent">✓</span>}
                  {c.domain}
                  {top && (
                    <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 font-body text-label text-accent">
                      {t("domain.top")}
                    </span>
                  )}
                </span>
                {show && (
                  <span className="shrink-0 font-data text-ui text-muted">
                    {pct}% <span className="opacity-70">({n})</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-ui text-muted">
        {over ? t("poll.votes", { n: total })
          : !signedIn ? t("poll.signIn")
          : !eligible ? <>
              {t("domain.needCharacter")}{" "}
              <Link href="/profile" className="text-accent">{t("domain.verify")} →</Link>
            </>
          : mine != null ? t("poll.canChange") : t("domain.howTo")}
      </p>
    </section>
  );
}
