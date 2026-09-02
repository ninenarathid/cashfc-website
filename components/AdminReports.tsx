"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAvatar } from "@/lib/avatars";
import { fmtDate } from "@/lib/dates";
import { useLang, type Key } from "@/lib/i18n";

/**
 * Reports: a span of days, answered as a list of entries.
 *
 * The activity log is a list of events, which is the right shape for "what
 * happened" and the wrong one for "who has been taking part". Somebody who gave
 * forty potatoes is forty lines there and a handful here — one for each day they
 * turned up.
 *
 * A day is the unit, not a potato. Giving three in an afternoon counts as one
 * day of taking part, the same as giving one; giving on five separate days
 * counts five times. That is what makes the draw fair to somebody who visits
 * often and gives modestly rather than to whoever clicked most in one sitting.
 *
 * Built as a list of reports rather than one screen, because the next question
 * will count something else — each brings its own loader and says what its own
 * numbers mean.
 */

/** One person on one day: the unit everything here is counted in. */
interface Entry {
  key: string;
  profileId: string;
  characterId: number | null;
  name: string;
  avatar: string | null;
  unclaimed?: boolean;
  /** Local day, YYYY-MM-DD. */
  day: string;
  /** How many they gave that day, and the split behind it. */
  count: number;
  parts: number[];
}

interface Report {
  key: string;
  title: Key;
  note: Key;
  /** What the bracketed numbers are, in order. */
  partsLabel: Key;
  /** Raw counts: profile id → day → parts. */
  load: (
    supabase: NonNullable<ReturnType<typeof createClient>>,
    since: string, until: string,
  ) => Promise<Map<string, Map<string, number[]>>>;
}

const two = (n: number) => String(n).padStart(2, "0");
/** Which local day a timestamp fell on — the day the person was living in. */
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

const startOf = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOf = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

const REPORTS: Report[] = [
  {
    key: "popoto-given",
    title: "adm.rpPopoto",
    note: "adm.rpPopotoNote",
    partsLabel: "adm.rpPopotoParts",
    load: async (supabase, since, until) => {
      const range = <T,>(q: T) => {
        let out = q as { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T };
        if (since) out = out.gte("created_at", startOf(since)) as typeof out;
        if (until) out = out.lte("created_at", endOf(until)) as typeof out;
        return out as T;
      };
      const [kudos, likes] = await Promise.all([
        range(supabase.from("kudos").select("sender_id, created_at")),
        range(supabase.from("gallery_likes").select("profile_id, created_at")),
      ]);

      const got = new Map<string, Map<string, number[]>>();
      const bump = (id: string, iso: string, at: 0 | 1) => {
        const days = got.get(id) ?? new Map<string, number[]>();
        const day = dayOf(iso);
        const parts = days.get(day) ?? [0, 0];
        parts[at] += 1;
        days.set(day, parts);
        got.set(id, days);
      };
      for (const k of (kudos.data ?? []) as
           { sender_id: string; created_at: string }[]) {
        bump(k.sender_id, k.created_at, 0);
      }
      for (const l of (likes.data ?? []) as
           { profile_id: string; created_at: string }[]) {
        bump(l.profile_id, l.created_at, 1);
      }
      return got;
    },
  },
];

const asDate = (d: Date) =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const today = () => asDate(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return asDate(d);
};

const SPANS: { label: Key; from: () => string }[] = [
  { label: "adm.spanToday", from: () => today() },
  { label: "adm.span7", from: () => daysAgo(6) },
  { label: "adm.span30", from: () => daysAgo(29) },
];

function Person(
  { row, portraits }: { row: Entry; portraits: Record<number, string> },
) {
  const { t } = useLang();
  // What they chose, then the picture the game has of their character. A grey
  // disc is the answer only for a profile with no character claimed at all.
  const fallback = row.characterId != null
    ? row.avatar ?? portraits[row.characterId] ?? null
    : row.avatar;
  const face = useAvatar(row.characterId ?? -1, fallback);
  return (
    <>
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={face} alt="" loading="lazy"
             className="size-8 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span className="size-8 shrink-0 rounded-full border border-line bg-card" />
      )}
      {row.characterId != null ? (
        <Link href={`/member/${row.characterId}`}
              className="truncate font-data text-ink no-underline hover:text-accent">
          {row.name}
        </Link>
      ) : (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-data text-ink/80">{row.name}</span>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-line px-1.5 text-[10.5px] text-muted">
            {t("adm.noCharacter")}
          </span>
        </span>
      )}
    </>
  );
}

export default function AdminReports(
  { portraits }: { portraits: Record<number, string> },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [which, setWhich] = useState(REPORTS[0].key);
  const [since, setSince] = useState(daysAgo(29));
  const [until, setUntil] = useState(today());
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [howMany, setHowMany] = useState("1");
  const [drawn, setDrawn] = useState<Entry[] | null>(null);

  const report = REPORTS.find((r) => r.key === which) ?? REPORTS[0];

  const run = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setDrawn(null);
    const perDay = await report.load(supabase, since, until);
    const { data } = await supabase.from("profiles")
      .select("id, character_id, character_name, display_name, discord_username, avatar_url");

    const who = new Map<string, Pick<Entry,
      "characterId" | "name" | "avatar" | "unclaimed">>();
    for (const p of (data ?? []) as {
      id: string; character_id: number | null; character_name: string | null;
      display_name: string | null; discord_username: string | null;
      avatar_url: string | null;
    }[]) {
      // display_name is free text, so an account with no character can call
      // itself anything — including another member's character name. An
      // unclaimed account is named by the login it signed in with.
      const claimed = p.character_id != null;
      who.set(p.id, {
        characterId: p.character_id,
        name: claimed
          ? (p.character_name || p.display_name || p.discord_username || "—")
          : (p.discord_username || p.display_name || "—"),
        avatar: p.avatar_url,
        unclaimed: !claimed,
      });
    }

    const out: Entry[] = [];
    for (const [profileId, days] of perDay) {
      const person = who.get(profileId) ?? {
        characterId: null, name: `#${profileId.slice(0, 8)}`,
        avatar: null, unclaimed: true,
      };
      for (const [day, parts] of days) {
        const count = parts.reduce((a, b) => a + b, 0);
        if (count > 0) {
          out.push({ key: `${profileId}:${day}`, profileId, day, count, parts, ...person });
        }
      }
    }
    // Newest first, busiest day first within a date. A report about taking part
    // reads best as "who has been about lately".
    out.sort((a, b) => b.day.localeCompare(a.day)
      || b.count - a.count || a.name.localeCompare(b.name));
    setRows(out);
    setLoading(false);
  }, [supabase, report, since, until]);

  useEffect(() => { void run(); }, [run]);

  const people = useMemo(
    () => new Set((rows ?? []).map((r) => r.profileId)).size, [rows]);
  const given = useMemo(
    () => (rows ?? []).reduce((a, r) => a + r.count, 0), [rows]);

  const want = Math.max(1, Math.min(Number(howMany) || 1, Math.max(people, 1)));

  const draw = () => {
    if (!rows?.length) return;
    // Every entry is a ticket, so one day of giving is one chance and five days
    // are five — which is the whole reason days are counted rather than
    // potatoes. Tickets are drawn one at a time and a name already out is
    // passed over, so turning up often improves the odds without letting
    // anybody win twice.
    const tickets = [...rows];
    for (let i = tickets.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [tickets[i], tickets[j]] = [tickets[j], tickets[i]];
    }
    const seen = new Set<string>();
    const won: Entry[] = [];
    for (const ticket of tickets) {
      if (won.length >= want) break;
      if (seen.has(ticket.profileId)) continue;
      seen.add(ticket.profileId);
      won.push(ticket);
    }
    setDrawn(won);
  };

  const box = "rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink";

  // Bare: the tab it lives in supplies the card and the heading.
  return (
    <>
      <p className="text-[13px] text-ink/85">
        {t(report.title)}
        <span className="ml-2 text-[12px] text-muted">{t(report.note)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {REPORTS.length > 1 && (
          <select value={which} onChange={(e) => setWhich(e.target.value)}
                  aria-label={t("adm.reports")} className={box}>
            {REPORTS.map((r) => (
              <option key={r.key} value={r.key}>{t(r.title)}</option>
            ))}
          </select>
        )}
        <input type="date" value={since} max={until || undefined}
               onChange={(e) => setSince(e.target.value)}
               aria-label={t("adm.from")} className={box} />
        <span className="self-center text-[12.5px] text-muted">{t("adm.to")}</span>
        <input type="date" value={until} min={since || undefined}
               onChange={(e) => setUntil(e.target.value)}
               aria-label={t("adm.to")} className={box} />
        {SPANS.map((sp) => (
          <button key={sp.label}
                  onClick={() => { setSince(sp.from()); setUntil(today()); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
            {t(sp.label)}
          </button>
        ))}
      </div>

      {/* ── The draw ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/8 px-3 py-2.5">
        <span className="text-[12.5px] font-medium text-gold">🎲 {t("adm.drawTitle")}</span>
        <input type="number" min={1} max={Math.max(people, 1)} value={howMany}
               onChange={(e) => setHowMany(e.target.value)}
               aria-label={t("adm.drawHowMany")}
               className="w-20 rounded-lg border border-line bg-card px-2.5 py-1 text-[13px] text-ink" />
        <span className="text-[12.5px] text-muted">{t("adm.drawOf", { n: people })}</span>
        <button onClick={draw} disabled={!people}
                className="rounded-lg border border-gold bg-gold/15 px-3.5 py-1.5 text-[13px] text-gold hover:bg-gold/25 disabled:opacity-40">
          {drawn ? t("adm.drawAgain") : t("adm.draw")}
        </button>
        {drawn && (
          <button onClick={() => setDrawn(null)}
                  className="text-[12.5px] text-muted underline hover:text-ink">
            {t("adm.drawClear")}
          </button>
        )}
        <span className="w-full text-[11.5px] text-muted">{t("adm.drawHint")}</span>
      </div>

      {drawn && (
        <ol className="mt-2 flex flex-col gap-1 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5">
          {drawn.map((r, i) => (
            <li key={r.key}
                className="grid grid-cols-[20px_32px_1fr_auto] items-center gap-2 text-[13.5px]">
              <span className="text-right font-data text-[11.5px] text-muted">{i + 1}</span>
              <Person row={r} portraits={portraits} />
              {/* How many chances they were holding, so a draw can be checked
                  against the list rather than taken on faith. */}
              <span className="font-data text-[12px] text-muted">
                {t("adm.rpDays", {
                  n: (rows ?? []).filter((x) => x.profileId === r.profileId).length,
                })}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* ── The entries ── */}
      <div className="mt-3">
        {loading && <p className="text-[12.5px] text-muted">{t("adm.loading")}</p>}
        {!loading && rows && rows.length === 0 && (
          <p className="py-3 text-center text-[12.5px] text-muted">{t("adm.rpEmpty")}</p>
        )}
        {!loading && rows && rows.length > 0 && (
          <>
            <div className="mb-2 text-[12.5px] text-muted">
              {t("adm.rpSummary", { entries: rows.length, people, n: given })}
              <span className="ml-2 opacity-70">{t(report.partsLabel)}</span>
            </div>
            <ol className="flex flex-col gap-1">
              {rows.map((r) => (
                <li key={r.key}
                    className="grid grid-cols-[76px_32px_1fr_auto] items-center gap-2 border-b border-line/40 py-1 text-[13.5px] last:border-0">
                  {/* The day, because the day is the entry — the same name on
                      three dates is three chances, and has to look like three
                      rows rather than a repeat somebody wants to tidy away. */}
                  <span className="font-data text-[11.5px] text-muted">
                    {fmtDate(`${r.day}T00:00:00`)}
                  </span>
                  <Person row={r} portraits={portraits} />
                  <span className="font-data text-[12.5px] text-ink">
                    🥔 {r.count}
                    <span className="ml-1 text-[11.5px] text-muted">
                      ({r.parts.join("/")})
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </>
  );
}
