"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAvatar } from "@/lib/avatars";
import { useLang, type Key } from "@/lib/i18n";

/**
 * Reports: the same question asked of a span of days, answered once per person.
 *
 * The activity log is a list of events, which is the right shape for "what
 * happened" and the wrong one for "who has been doing this". Somebody who sent
 * forty potatoes is forty lines there and one line here, with the number
 * beside their name.
 *
 * Built as a list of reports rather than one screen, because the next question
 * will want different columns — each report brings its own loader and says what
 * its numbers mean, and adding one is an entry in REPORTS.
 *
 * And a draw, because the reason to ask who has been handing out potatoes is
 * usually that somebody is about to give one of them something.
 */

/** One person in a report. `parts` is whatever that report counts separately. */
interface Row {
  id: string;
  characterId: number | null;
  name: string;
  avatar: string | null;
  total: number;
  parts: number[];
  /** Signed in but has never claimed a character. */
  unclaimed?: boolean;
}

interface Report {
  key: string;
  title: Key;
  /** The thing somebody would otherwise assume, said before they assume it. */
  note: Key;
  /** What the bracketed numbers are, in order. */
  partsLabel: Key;
  load: (
    supabase: NonNullable<ReturnType<typeof createClient>>,
    since: string, until: string,
  ) => Promise<Map<string, number[]>>;
}

/** A local date at both ends, as the reader's own day rather than as UTC. */
const startOf = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOf = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

const REPORTS: Report[] = [
  {
    key: "popoto-sent",
    title: "adm.rpPopoto",
    note: "adm.rpPopotoNote",
    partsLabel: "adm.rpPopotoParts",
    // Both tables at once, kept apart in the answer: a potato on a profile and
    // a potato on a picture are the same gesture aimed at different things, and
    // somebody may well want to know which somebody has been doing.
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
      const got = new Map<string, number[]>();
      const bump = (id: string, at: 0 | 1) => {
        const row = got.get(id) ?? [0, 0];
        row[at] += 1;
        got.set(id, row);
      };
      for (const k of (kudos.data ?? []) as { sender_id: string }[]) {
        bump(k.sender_id, 0);
      }
      for (const l of (likes.data ?? []) as { profile_id: string }[]) {
        bump(l.profile_id, 1);
      }
      return got;
    },
  },
];

const asDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")}`;
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
  { row, place, portraits }: {
    row: Row; place?: number; portraits: Record<number, string>;
  },
) {
  const { t } = useLang();
  // What they chose, then the picture the game has of their character, then
  // nothing. A grey disc is the answer for somebody with no character claimed;
  // for everybody else the game already has a portrait and there is no reason
  // to show a hole instead.
  const fallback = row.characterId != null
    ? row.avatar ?? portraits[row.characterId] ?? null
    : row.avatar;
  const face = useAvatar(row.characterId ?? -1, fallback);
  const name = row.characterId != null ? (
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
  );
  return (
    <>
      {place != null && (
        <span className="text-right font-data text-[11.5px] text-muted">{place}</span>
      )}
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={face} alt="" loading="lazy"
             className="size-8 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span className="size-8 shrink-0 rounded-full border border-line bg-card" />
      )}
      {name}
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
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [howMany, setHowMany] = useState("1");
  const [drawn, setDrawn] = useState<Row[] | null>(null);

  const report = REPORTS.find((r) => r.key === which) ?? REPORTS[0];

  const run = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setDrawn(null);
    const counts = await report.load(supabase, since, until);
    // Names and faces come from the profiles, so somebody who has left the
    // roster still appears as themselves rather than as a uuid.
    const { data } = await supabase.from("profiles")
      .select("id, character_id, character_name, display_name, discord_username, avatar_url");
    const who = new Map<string, Omit<Row, "total" | "parts">>();
    for (const p of (data ?? []) as {
      id: string; character_id: number | null; character_name: string | null;
      display_name: string | null; discord_username: string | null;
      avatar_url: string | null;
    }[]) {
      // display_name is free text, so an account with no character can be
      // called anything — including another member's character name, which is
      // exactly what one of them is called. A row that cannot be told apart
      // from a real member is worse than an ugly one, so an unclaimed account
      // is named by the login it signed in with and says that it has none.
      const claimed = p.character_id != null;
      who.set(p.id, {
        id: p.id,
        characterId: p.character_id,
        name: claimed
          ? (p.character_name || p.display_name || p.discord_username || "—")
          : (p.discord_username || p.display_name || "—"),
        avatar: p.avatar_url,
        unclaimed: !claimed,
      });
    }
    setRows([...counts.entries()]
      .map(([id, parts]) => ({
        ...(who.get(id) ?? {
          id, characterId: null, name: `#${id.slice(0, 8)}`, avatar: null,
          unclaimed: true,
        }),
        total: parts.reduce((a, b) => a + b, 0),
        parts,
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)));
    setLoading(false);
  }, [supabase, report, since, until]);

  useEffect(() => { void run(); }, [run]);

  const max = rows?.length ?? 0;
  const want = Math.max(1, Math.min(Number(howMany) || 1, Math.max(max, 1)));

  const draw = () => {
    if (!rows?.length) return;
    // Fisher-Yates on a copy. Every name has the same chance whatever their
    // total: this draws from the people who took part, it does not reward the
    // ones who took part most — that is what the list above already shows.
    const pool = [...rows];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setDrawn(pool.slice(0, want));
  };

  const totals = useMemo(() => {
    const sum = (rows ?? []).reduce((a, r) => a + r.total, 0);
    return { people: rows?.length ?? 0, sum };
  }, [rows]);

  const dateBox = "rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink";

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">{t("adm.reports")}</div>
      {/* Which report this is, said whether or not there is a picker. A section
          headed only "Reports" leaves its numbers to be guessed at, and the
          guess here is the wrong direction — these are potatoes given away, not
          potatoes received. */}
      <p className="mt-0.5 text-[13px] text-ink/85">
        {t(report.title)}
        <span className="ml-2 text-[12px] text-muted">{t(report.note)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {REPORTS.length > 1 && (
          <select value={which} onChange={(e) => setWhich(e.target.value)}
                  aria-label={t("adm.reports")} className={dateBox}>
            {REPORTS.map((r) => (
              <option key={r.key} value={r.key}>{t(r.title)}</option>
            ))}
          </select>
        )}
        <input type="date" value={since} max={until || undefined}
               onChange={(e) => setSince(e.target.value)}
               aria-label={t("adm.from")} className={dateBox} />
        <span className="self-center text-[12.5px] text-muted">{t("adm.to")}</span>
        <input type="date" value={until} min={since || undefined}
               onChange={(e) => setUntil(e.target.value)}
               aria-label={t("adm.to")} className={dateBox} />
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
        <input type="number" min={1} max={Math.max(max, 1)} value={howMany}
               onChange={(e) => setHowMany(e.target.value)}
               aria-label={t("adm.drawHowMany")}
               className="w-20 rounded-lg border border-line bg-card px-2.5 py-1 text-[13px] text-ink" />
        <span className="text-[12.5px] text-muted">{t("adm.drawOf", { n: max })}</span>
        <button onClick={draw} disabled={!max}
                className="rounded-lg border border-gold bg-gold/15 px-3.5 py-1.5 text-[13px] text-gold hover:bg-gold/25 disabled:opacity-40">
          {drawn ? t("adm.drawAgain") : t("adm.draw")}
        </button>
        {drawn && (
          <button onClick={() => setDrawn(null)}
                  className="text-[12.5px] text-muted underline hover:text-ink">
            {t("adm.drawClear")}
          </button>
        )}
      </div>

      {drawn && (
        <ol className="mt-2 flex flex-col gap-1 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5">
          {drawn.map((r, i) => (
            <li key={r.id}
                className="grid grid-cols-[20px_32px_1fr_auto] items-center gap-2 text-[13.5px]">
              <Person row={r} place={i + 1} portraits={portraits} />
              <span className="font-data text-[12px] text-muted">🥔 {r.total}</span>
            </li>
          ))}
        </ol>
      )}

      {/* ── The report itself ── */}
      <div className="mt-3">
        {loading && <p className="text-[12.5px] text-muted">{t("adm.loading")}</p>}
        {!loading && rows && rows.length === 0 && (
          <p className="py-3 text-center text-[12.5px] text-muted">{t("adm.rpEmpty")}</p>
        )}
        {!loading && rows && rows.length > 0 && (
          <>
            <div className="mb-2 text-[12.5px] text-muted">
              {t("adm.rpSummary", { people: totals.people, n: totals.sum })}
              <span className="ml-2 opacity-70">{t(report.partsLabel)}</span>
            </div>
            <ol className="flex flex-col gap-1">
              {rows.map((r, i) => (
                <li key={r.id}
                    className="grid grid-cols-[20px_32px_1fr_auto] items-center gap-2 border-b border-line/40 py-1 text-[13.5px] last:border-0">
                  <Person row={r} place={i + 1} portraits={portraits} />
                  {/* The potato in front of the number, the same way the
                      leaderboards and the profile button carry it, so a total
                      here is recognisable as the same thing counted. */}
                  <span className="font-data text-[12.5px] text-ink">
                    🥔 {r.total}
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
    </section>
  );
}
