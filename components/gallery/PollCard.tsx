"use client";

import { useLang } from "@/lib/i18n";
import { pollOver, usePoll } from "@/lib/poll";

/**
 * The question the FC is being asked, above the pictures it is about.
 *
 * On the gallery page because that is where the thing being voted on happens —
 * a question about who a potato belongs to is answered better by somebody
 * looking at a wall of pictures with several people in them than by the same
 * person on a settings screen.
 *
 * Results are held back until you have answered. A running score in front of
 * somebody still making up their mind is a nudge rather than information, and
 * this poll decides a leaderboard.
 */
export default function PollCard() {
  const { t, lang } = useLang();
  const th = lang !== "en";
  const { poll, mine, tally, eligible, signedIn, ready, busy, vote } = usePoll();

  if (!ready || !poll) return null;
  const over = pollOver(poll);
  // Nothing to say to somebody who cannot vote and arrived after it closed.
  if (over && !mine && !tally) return null;

  const total = tally
    ? Object.values(tally).reduce((n, v) => n + v, 0) : 0;
  const show = !!mine || over;
  const canVote = signedIn && eligible && !over;

  const left = poll.closes_at && !over
    ? Math.max(0, Math.ceil(
        (new Date(poll.closes_at).getTime() - Date.now()) / 3_600_000))
    : null;

  return (
    <section className="mx-auto mt-4 w-full max-w-[1040px] rounded-2xl border border-accent/40 bg-surface p-4">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[13px] font-semibold text-accent">
          {t("poll.heading")}
        </span>
        {left != null && (
          <span className="text-[12px] text-muted">
            {left >= 24
              ? t("poll.daysLeft", { n: Math.ceil(left / 24) })
              : t("poll.hoursLeft", { n: left })}
          </span>
        )}
        {over && <span className="text-[12px] text-muted">{t("poll.closed")}</span>}
      </div>

      <p className="text-[14px] leading-relaxed text-ink">
        {(th ? null : poll.question_en) || poll.question}
      </p>
      {(poll.note || poll.note_en) && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {(th ? null : poll.note_en) || poll.note}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {poll.options.map((o) => {
          const n = tally?.[o.key] ?? 0;
          const pct = show && total ? Math.round((n / total) * 100) : 0;
          const picked = mine === o.key;
          return (
            <button key={o.key} type="button"
                    disabled={!canVote || busy}
                    onClick={() => void vote(o.key)}
                    aria-pressed={picked}
                    className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                      picked ? "border-accent text-ink" : "border-line text-ink/85"} ${
                      canVote ? "hover:border-accent" : "cursor-default"}`}>
              {/* The share, drawn behind the words rather than beside them, so
                  the row is both the answer and how many chose it. */}
              {show && (
                <span aria-hidden
                      style={{ width: `${pct}%` }}
                      className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                        picked ? "bg-accent/25" : "bg-card"}`} />
              )}
              <span className="relative flex items-baseline justify-between gap-3">
                <span>
                  {picked && <span className="mr-1.5 text-accent">✓</span>}
                  {(th ? o.th : o.en) || o.th}
                </span>
                {show && (
                  <span className="shrink-0 font-data text-[12.5px] text-muted">
                    {pct}% <span className="opacity-70">({n})</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[12px] text-muted">
        {!signedIn ? t("poll.signIn")
          : !eligible ? t("poll.needCharacter")
          : mine && !over ? t("poll.canChange")
          : show ? t("poll.votes", { n: total })
          : t("poll.oneEach")}
      </p>
    </section>
  );
}
