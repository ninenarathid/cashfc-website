"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import {
  CHOICES_EACH, domainPollOver, useDomainPoll, type AddRefusal,
} from "@/lib/domain-poll";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2,
});

const inputCls =
  "rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted";

/**
 * Which domain the site should move to, on the front page for its three days.
 *
 * On the front page because everybody passes through it, and a vote that lives
 * behind a tab is decided by whoever happened to open that tab.
 *
 * The ballot is the members' own: anybody who can vote can put a name on it,
 * with its price a year, so it is a choice between names somebody actually
 * wants at prices somebody actually looked up. Three each, and a name can be
 * taken back to fix a typo only until somebody else has voted for it.
 *
 * Results wait until you have voted, as on the gallery poll. The list stays in
 * the order names were suggested while the vote is open, so the row under your
 * pointer does not jump when a count changes; once it closes it is sorted, and
 * the order is the answer.
 */
export default function DomainVote() {
  const { t } = useLang();
  const {
    poll, choices, mine, tally, me, eligible, signedIn, ready, busy,
    addedByMe, vote, add, takeBack,
  } = useDomainPoll();
  const [domain, setDomain] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState<string | null>(null);

  if (!ready || !poll) return null;
  const over = domainPollOver(poll);
  // Nothing to report from a round that closed with no names on it.
  if (over && !choices.length) return null;

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

  const refusals: Record<AddRefusal, string> = {
    invalid: t("domain.invalid"),
    taken: t("domain.taken"),
    refused: t("domain.refused"),
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const p = price.trim();
    const n = p ? Number(p.replace(/^\$/, "").replace(/,/g, "")) : null;
    if (n != null && (!Number.isFinite(n) || n < 0 || n >= 100_000)) {
      setNote(t("domain.badPrice"));
      return;
    }
    const refusal = await add(domain, n == null ? null : Math.round(n * 100) / 100);
    if (refusal) { setNote(refusals[refusal]); return; }
    setDomain("");
    setPrice("");
  }

  async function remove(id: number) {
    setNote(null);
    if (!(await takeBack(id))) setNote(t("domain.backed"));
  }

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
      {!over && (
        <p className="mt-1 text-ui leading-relaxed text-muted">{t("domain.howTo")}</p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {!rows.length && <p className="text-ui text-muted">{t("domain.empty")}</p>}
        {rows.map((c) => {
          const n = tally?.[c.id] ?? 0;
          const pct = show && total ? Math.round((n / total) * 100) : 0;
          const picked = mine === c.id;
          const top = over && n > 0 && n === best;
          return (
            <div key={c.id} className="flex items-stretch gap-1.5">
              <button type="button"
                      disabled={!canVote || busy}
                      onClick={() => void vote(c.id)}
                      aria-pressed={picked}
                      className={`relative min-w-0 flex-1 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors ${
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
                  <span className="min-w-0">
                    <span className="block truncate font-data text-read text-ink">
                      {picked && <span className="mr-1.5 text-accent">✓</span>}
                      {c.domain}
                      {top && (
                        <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 font-body text-label text-accent">
                          {t("domain.top")}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-ui text-muted">
                      {c.price_usd != null
                        ? <span className="font-data text-ink/85">
                            {usd.format(c.price_usd)}{t("domain.perYear")}
                          </span>
                        : t("domain.noPrice")}
                      {c.by && <> · {t("domain.by", { name: c.by })}</>}
                    </span>
                  </span>
                  {show && (
                    <span className="shrink-0 font-data text-ui text-muted">
                      {pct}% <span className="opacity-70">({n})</span>
                    </span>
                  )}
                </span>
              </button>
              {canVote && c.added_by === me && (
                <button type="button" disabled={busy}
                        onClick={() => void remove(c.id)}
                        title={t("domain.takeBackHint")}
                        className="shrink-0 rounded-lg border border-line px-2.5 text-ui text-muted transition-colors hover:border-chili/60 hover:text-chili">
                  {t("domain.takeBack")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canVote && addedByMe < CHOICES_EACH && (
        <form onSubmit={(e) => void submit(e)}
              className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-[2_1_12rem] flex-col gap-1">
            <span className="text-ui text-muted">{t("domain.name")}</span>
            <input value={domain} onChange={(e) => setDomain(e.target.value)}
                   placeholder={t("domain.placeholder")}
                   autoCapitalize="off" autoCorrect="off" spellCheck={false}
                   maxLength={260} required
                   className={`${inputCls} font-data`} />
          </label>
          <label className="flex min-w-0 flex-[1_1_8rem] flex-col gap-1">
            <span className="text-ui text-muted">{t("domain.price")}</span>
            <span className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">$</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)}
                     inputMode="decimal" placeholder="12.99"
                     className={`${inputCls} w-full pl-6 font-data`} />
            </span>
          </label>
          <button type="submit" disabled={busy || !domain.trim()}
                  className="rounded-lg border border-accent bg-accent/15 px-5 py-2 text-accent transition-colors hover:bg-accent/25 disabled:opacity-50">
            {t("domain.add")}
          </button>
        </form>
      )}

      {note && <p role="alert" className="mt-2 text-ui text-chili">{note}</p>}

      <p className="mt-2 text-ui text-muted">
        {over ? t("poll.votes", { n: total })
          : !signedIn ? t("poll.signIn")
          : !eligible ? <>
              {t("domain.needCharacter")}{" "}
              <Link href="/profile" className="text-accent">{t("domain.verify")} →</Link>
            </>
          : <>
              {mine != null ? t("poll.canChange") : t("poll.oneEach")}{" "}
              {addedByMe < CHOICES_EACH
                ? t("domain.addsLeft", { n: CHOICES_EACH - addedByMe })
                : t("domain.addsDone", { n: CHOICES_EACH })}
            </>}
      </p>
    </section>
  );
}
