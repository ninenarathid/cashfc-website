"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_KINDS } from "@/lib/notifications";
import { bangkokDay } from "@/lib/evercold";
import { fmtDateTime } from "@/lib/dates";
import { useLang, type Key } from "@/lib/i18n";

/**
 * The notifications addressed to the admins, read where the work is done.
 *
 * They used to ring the same bell as a potato and a party invitation, which
 * made the bell two things at once: an admin's evening and an admin's job. The
 * job is here now (see lib/notifications), and the bell went back to being
 * personal — the whole point of the move, so that a red dot on the bell means
 * somebody said something to *you*.
 *
 * Which means this list is the only thing that says a prize is waiting, and it
 * is therefore drawn at the top of the page rather than folded into a tab. A
 * queue nobody is told about is a queue somebody waits in for a week.
 *
 * Every row leads at the thing itself rather than at the screen it is on: one
 * claim's conversation, one feedback thread. Landing on a list of forty claims
 * having been told about one of them is being handed the haystack.
 *
 * Nothing is deleted and nothing is cleared: read or unread is the only state,
 * because the work itself is tracked where the work is — a claim is done when
 * the prize is handed over, on the prizes tab, not when a line here is ticked.
 */

/** What each kind says, and where its work is actually done. */
const SAY: Record<string, { key: Key; icon: string; where: Key }> = {
  prize_claim: { key: "notif.prizeClaim", icon: "🎁", where: "adm.prizes" },
  prize_ask: { key: "notif.prizeAsk", icon: "💬", where: "adm.prizes" },
  feedback: { key: "notif.feedback", icon: "✉️", where: "nav.feedback" },
};

/**
 * One page of them.
 *
 * Ten, which is a glance rather than a scroll. It was thirty, on the reasoning
 * that this list is the record as well as the queue — which is true, and is
 * what the button underneath is for. What it cost was that the thing anybody
 * opens this page to do next was under three weeks of things they had already
 * done.
 */
const SHOW = 10;

const box = "rounded-lg border border-line bg-card px-3 py-1.5 text-read text-ink";

/** The FC's today, and the FC's day before that: the clock everything here keeps. */
const today = () => bangkokDay(new Date().toISOString());
const daysAgo = (n: number) =>
  bangkokDay(new Date(Date.parse(`${today()}T00:00:00+07:00`) - n * 86_400_000).toISOString());

const SPANS: { label: Key; from: string; to: string }[] = [
  { label: "adm.spanToday", from: today(), to: today() },
  { label: "adm.span7", from: daysAgo(6), to: today() },
  { label: "adm.span30", from: daysAgo(29), to: today() },
];

interface Row {
  id: number;
  kind: string;
  actor: string | null;
  actor_name: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export default function AdminInbox() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [take, setTake] = useState(SHOW);
  const [more, setMore] = useState(false);
  // Empty means every one of them, which is what this list is for most days.
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  /**
   * Which feedback thread each of these notifications is about.
   *
   * The row does not say. A feedback notification carries the subject somebody
   * typed and nothing else — no thread id, no post id — so the thread is found
   * by matching that subject back to the threads table. By author and subject
   * where the author is known, because two people can report the same bug with
   * the same words; by subject alone otherwise, newest first, which is the best
   * guess available and lands on a real conversation either way.
   */
  const [threads, setThreads] = useState<{
    both: Map<string, number>; subject: Map<string, number>;
  }>({ both: new Map(), subject: new Map() });

  const load = useCallback(async (want: number) => {
    if (!supabase) return;
    let q = supabase.from("notifications")
      .select("id, kind, actor, actor_name, body, created_at, read_at")
      .in("kind", ADMIN_KINDS as unknown as string[]);
    // Bangkok midnights, the same day the rest of the site counts in, so a
    // range picked here means the days it names to whoever picked them.
    if (since) q = q.gte("created_at", `${since}T00:00:00+07:00`);
    if (until) q = q.lte("created_at", `${until}T23:59:59.999+07:00`);
    const { data } = await q.order("created_at", { ascending: false }).range(0, want);
    const got = (data as Row[]) ?? [];
    // One more than asked for, so "older" appears only when there is an older.
    setMore(got.length > want);
    const shown = got.slice(0, want);
    setRows(shown);

    const subjects = [...new Set(shown
      .filter((r) => r.kind === "feedback" && r.body)
      .map((r) => r.body as string))];
    if (!subjects.length) { setThreads({ both: new Map(), subject: new Map() }); return; }
    const { data: th } = await supabase.from("feedback_threads")
      .select("id, subject, author_id, created_at")
      .in("subject", subjects).order("created_at", { ascending: false });
    const both = new Map<string, number>();
    const subject = new Map<string, number>();
    for (const row of (th ?? []) as { id: number; subject: string; author_id: string }[]) {
      const key = `${row.author_id}|${row.subject}`;
      if (!both.has(key)) both.set(key, row.id);
      if (!subject.has(row.subject)) subject.set(row.subject, row.id);
    }
    setThreads({ both, subject });
  }, [supabase, since, until]);

  useEffect(() => { void load(take); }, [load, take]);
  // A new range is a new list, not page four of the old one.
  useEffect(() => { setTake(SHOW); }, [since, until]);

  const unread = (rows ?? []).filter((r) => !r.read_at).length;

  /**
   * Where a row leads.
   *
   * A prize goes to its own claim: the body of those notifications is the win's
   * id, and the prizes tab opens the one named after the colon. A feedback row
   * goes to its thread when the subject could be matched, and to the page
   * itself when it could not — a link that lands somewhere useful beats one
   * that is missing because it could not be perfect.
   */
  function hrefOf(r: Row): string {
    if (r.kind === "prize_claim" || r.kind === "prize_ask") {
      const win = Number(r.body);
      return Number.isFinite(win) && r.body ? `#prizes:${win}` : "#prizes";
    }
    if (r.kind === "feedback" && r.body) {
      const id = (r.actor ? threads.both.get(`${r.actor}|${r.body}`) : undefined)
        ?? threads.subject.get(r.body);
      return id ? `/feedback#t${id}` : "/feedback";
    }
    return "/feedback";
  }

  /**
   * Read, said once for the lot.
   *
   * Deliberately a button rather than the bell's trick of marking everything
   * read the moment the panel opens: this list is on the page an admin has open
   * while they work, and "read" would then mean "was on screen once".
   *
   * And only what is actually listed. With a range picked, "mark all read" that
   * quietly reached outside it would tick off things nobody has seen.
   */
  async function markAll() {
    if (!supabase || !unread) return;
    const ids = (rows ?? []).filter((r) => !r.read_at).map((r) => r.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setRows((v) => (v ?? []).map((r) => (r.read_at ? r : { ...r, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).in("id", ids);
  }

  async function markOne(id: number) {
    if (!supabase) return;
    const now = new Date().toISOString();
    setRows((v) => (v ?? []).map((r) => (r.id === id ? { ...r, read_at: now } : r)));
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
  }

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-display font-semibold">{t("adm.inbox")}</div>
        {unread > 0 && (
          <span className="rounded-full bg-chili/20 px-2 py-0.5 font-data text-meta font-bold text-chili">
            {t("adm.inboxUnread", { n: unread })}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => void load(take)}
                  className="rounded-md border border-line px-2.5 py-1 text-ui text-muted hover:border-muted hover:text-ink">
            {t("adm.pcRefresh")}
          </button>
          {unread > 0 && (
            <button type="button" onClick={() => void markAll()}
                    className="rounded-md border border-accent bg-accent/15 px-2.5 py-1 text-ui text-accent hover:bg-accent/25">
              {t("adm.inboxMarkRead")}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-ui leading-relaxed text-muted">{t("adm.inboxNote")}</p>

      {/* The same row of controls as the reports tab, in the same order, because
          it is the same question asked of a different list. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <input type="date" value={since} max={until || undefined}
               onChange={(e) => setSince(e.target.value)}
               aria-label={t("adm.from")} className={box} />
        <span className="self-center text-ui text-muted">{t("adm.to")}</span>
        <input type="date" value={until} min={since || undefined}
               onChange={(e) => setUntil(e.target.value)}
               aria-label={t("adm.to")} className={box} />
        {SPANS.map((sp) => (
          <button key={sp.label} type="button"
                  onClick={() => { setSince(sp.from); setUntil(sp.to); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
            {t(sp.label)}
          </button>
        ))}
        {(since || until) && (
          <button type="button" onClick={() => { setSince(""); setUntil(""); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
            {t("adm.inboxAllDays")}
          </button>
        )}
      </div>

      {rows === null && (
        <div className="mt-3 text-ui text-muted">{t("adm.pcLoading")}</div>
      )}
      {rows?.length === 0 && (
        <div className="mt-3 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
          {since || until ? t("adm.inboxNoneInRange") : t("adm.inboxEmpty")}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {(rows ?? []).map((r) => {
          const say = SAY[r.kind];
          return (
            <Link key={r.id} href={hrefOf(r)} onClick={() => void markOne(r.id)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors hover:border-muted ${
                    r.read_at ? "border-line bg-card" : "border-accent/40 bg-accent/5"}`}>
              <span aria-hidden className="text-lg leading-none">{say?.icon ?? "•"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-ui text-ink">
                  {say ? t(say.key, { who: r.actor_name ?? "—" }) : r.kind}
                </div>
                {/* The body of a prize notification is the win's id, which is
                    the link's business and not the reader's. A feedback one is
                    the title somebody wrote, which is the whole point of it. */}
                {r.kind === "feedback" && r.body && (
                  <div className="mt-0.5 truncate text-ui text-muted">{r.body}</div>
                )}
                <div className="mt-0.5 font-data text-meta text-muted">
                  {fmtDateTime(r.created_at)}
                  {say && <span> · {t("adm.inboxGoTo", { where: t(say.where) })}</span>}
                </div>
              </div>
              {!r.read_at && (
                <span aria-label={t("adm.inboxNew")} title={t("adm.inboxNew")}
                      className="mt-1 size-2 shrink-0 rounded-full bg-chili" />
              )}
            </Link>
          );
        })}
      </div>

      {more && (
        <button type="button" onClick={() => setTake((v) => v + SHOW)}
                className="mt-2 text-meta text-accent hover:underline">
          {t("adm.inboxOlder")}
        </button>
      )}
    </section>
  );
}
