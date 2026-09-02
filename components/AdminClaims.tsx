"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAvatar } from "@/lib/avatars";
import { fmtDate } from "@/lib/dates";
import { useLang, type Key } from "@/lib/i18n";

/**
 * Who has claimed which character — and, when there is something to give away,
 * a name pulled out of that list at random.
 *
 * The draw here is deliberately not the one in the popoto report. There, a day
 * of giving is a ticket and somebody who turns up often holds more of them;
 * that is the point of counting days. Here every claimed character is one
 * entry, because a claim is a claim — nobody has claimed harder than anybody
 * else, and weighting this list by anything would be inventing a merit the data
 * does not contain. The filter is what shapes the odds: narrow the list to the
 * people you meant to include, then draw from exactly what you can see.
 */

export interface ClaimedProfile {
  id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  character_id: number;
  character_name: string | null;
  auth_providers: string[] | null;
  character_verified_at: string | null;
}

const PROVIDER_NAME: Record<string, string> = {
  discord: "Discord", google: "Google", email: "Email",
};

const PROVIDER_TONE: Record<string, string> = {
  Discord: "border-[#5865F2]/50 bg-[#5865F2]/10 text-[#8b93f5]",
  Google: "border-[#ea4335]/50 bg-[#ea4335]/10 text-[#f08379]",
  Email: "border-line bg-card text-muted",
};

/**
 * Which services somebody signed in with. Plural, and that is the point.
 *
 * An account can have both Discord and Google linked to it, and showing only
 * one would answer "which door did they come through" with half the truth.
 *
 * `auth_providers` is the record and comes from migration_v21. Before that has
 * been run every row is null, so the avatar's host is read instead — Discord
 * and Google serve theirs from their own CDNs. That can only ever find the one
 * that supplied the picture, so it is shown dimmed with a "?" and says on hover
 * where it came from: a guess presented as a fact is worse than a blank.
 */
function providers(c: ClaimedProfile): { names: string[]; sure: boolean } | null {
  if (c.auth_providers?.length) {
    return {
      names: c.auth_providers.map((p) => PROVIDER_NAME[p] ?? p),
      sure: true,
    };
  }
  const host = c.discord_avatar ?? "";
  if (host.includes("discordapp.com") || host.includes("discord.com")) {
    return { names: ["Discord"], sure: false };
  }
  if (host.includes("googleusercontent.com")) return { names: ["Google"], sure: false };
  return null;
}

type ClaimSort = "character" | "provider" | "lodestone" | "claimed";

/**
 * What each column sorts on, as one comparable value.
 *
 * Null means "this row has nothing to say here", which is different from an
 * empty string — it sorts to the bottom either way round rather than pretending
 * to be the earliest date or the first name.
 */
function claimKey(c: ClaimedProfile, by: ClaimSort, name: string): string | number | null {
  switch (by) {
    case "character": return name.toLowerCase();
    case "provider": return providers(c)?.names.join(" ").toLowerCase() ?? null;
    // Not null for the unverified: "no" is an answer here, and belongs in the
    // order rather than swept to the bottom with the rows that have nothing to
    // say. Sorting this column is how you gather them up.
    case "lodestone": return c.character_verified_at ? 1 : 0;
    case "claimed":
      return c.character_verified_at ? Date.parse(c.character_verified_at) : null;
  }
}

const two = (n: number) => String(n).padStart(2, "0");
const asDay = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
/** Which local day a timestamp fell on, so the filter matches what the row shows. */
const dayOf = (iso: string) => asDay(new Date(iso));
const today = () => asDay(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return asDay(d);
};

/**
 * The page an admin would go and look at.
 *
 * Spelled out rather than imported from lib/verify: that module derives the
 * claim token with node's crypto, and pulling it into a client component would
 * drag the whole thing into the browser bundle for the sake of one string.
 */
const lodestoneUrl = (id: number) =>
  `https://na.finalfantasyxiv.com/lodestone/character/${id}/`;

/** Verified means one thing: the code was found on the Lodestone profile. */
const LODE: { key: "all" | "yes" | "no"; label: Key }[] = [
  { key: "all", label: "adm.lodeAll" },
  { key: "yes", label: "adm.lodeYes" },
  { key: "no", label: "adm.lodeNo" },
];

const SPANS: { label: Key; from: () => string }[] = [
  { label: "adm.spanToday", from: () => today() },
  { label: "adm.span7", from: () => daysAgo(6) },
  { label: "adm.span30", from: () => daysAgo(29) },
];

/** A face and a linked name, the same pair the popoto report draws. */
function Winner(
  { row, name, portraits }: {
    row: ClaimedProfile; name: string; portraits: Record<number, string>;
  },
) {
  const face = useAvatar(row.character_id, portraits[row.character_id] ?? null);
  return (
    <>
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={face} alt="" loading="lazy"
             className="size-8 shrink-0 rounded-full border border-line object-cover" />
      ) : (
        <span className="size-8 shrink-0 rounded-full border border-line bg-card" />
      )}
      <Link href={`/member/${row.character_id}`}
            className="truncate font-data text-ink no-underline hover:text-accent">
        {name}
      </Link>
    </>
  );
}

export default function AdminClaims(
  { claims, nameOf, portraits, onRelease }: {
    claims: ClaimedProfile[];
    nameOf: (id: number) => string;
    portraits: Record<number, string>;
    onRelease: (id: string) => void | Promise<void>;
  },
) {
  const { t } = useLang();

  // Which way the table is pointing. Newest-first is the useful default for a
  // date and A-to-Z for a name, so a column brings its own direction the first
  // time it is clicked rather than always starting ascending.
  const [sort, setSort] = useState<{ by: ClaimSort; dir: 1 | -1 }>(
    { by: "character", dir: 1 });
  const sortBy = (by: ClaimSort) => setSort((v) =>
    v.by === by ? { by, dir: (v.dir === 1 ? -1 : 1) as 1 | -1 }
                : { by, dir: by === "character" || by === "provider" ? 1 : -1 });

  // Blank, not the last thirty days. Most claims are old, and a report about
  // "who is here" that opens by hiding nearly everybody would be read as an
  // empty database rather than as a filter.
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "yes" | "no">("all");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [howMany, setHowMany] = useState("1");
  const [drawn, setDrawn] = useState<ClaimedProfile[] | null>(null);

  const named = useMemo(
    () => claims.map((c) => ({ c, name: c.character_name ?? nameOf(c.character_id) })),
    [claims, nameOf]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return named
      .filter(({ c, name }) => {
        if (needle && !name.toLowerCase().includes(needle)
            && !(c.discord_username ?? "").toLowerCase().includes(needle)) return false;
        if (only !== "all" && (only === "yes") !== !!c.character_verified_at) return false;
        // A date range asks when somebody verified, so it can only ever be
        // about the verified. The inputs are disabled while "not verified" is
        // picked, rather than quietly returning nothing.
        if (only !== "no" && (since || until)) {
          // A row with no claim date cannot be inside a range of dates. Saying
          // so by leaving it out beats guessing which side of the range it
          // would have fallen on.
          if (!c.character_verified_at) return false;
          const day = dayOf(c.character_verified_at);
          if (since && day < since) return false;
          if (until && day > until) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = claimKey(a.c, sort.by, a.name);
        const bv = claimKey(b.c, sort.by, b.name);
        // Empty cells sit at the bottom either way round.
        if (av == null || bv == null) {
          return av == null && bv == null ? a.name.localeCompare(b.name)
            : av == null ? 1 : -1;
        }
        const d = typeof av === "number" && typeof bv === "number"
          ? av - bv : String(av).localeCompare(String(bv));
        // The name breaks every tie, so rows never shuffle about between
        // renders on a column half of them share.
        return d !== 0 ? d * sort.dir : a.name.localeCompare(b.name);
      });
  }, [named, q, only, since, until, sort]);

  const verified = useMemo(
    () => named.filter(({ c }) => c.character_verified_at).length, [named]);
  const filtered = q.trim() !== "" || only !== "all" || since !== "" || until !== "";
  const want = Math.max(1, Math.min(Number(howMany) || 1, Math.max(rows.length, 1)));

  const draw = () => {
    if (!rows.length) return;
    // Shuffle the whole filtered list and take from the top, rather than
    // picking indexes at random and re-rolling the repeats: same result, and no
    // way for a winner to come out twice.
    const hat = rows.map((r) => r.c);
    for (let i = hat.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [hat[i], hat[j]] = [hat[j], hat[i]];
    }
    setDrawn(hat.slice(0, want));
  };

  const box = "rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink";

  return (
    <>
      <p className="text-[12.5px] leading-relaxed text-muted">
        {/* The count belongs above the table rather than under it: "how many
            have claimed a character" is a question about the whole list, and
            answering it after the list means scrolling to the end to find
            out. */}
        {filtered
          ? t("adm.claimShown", { n: rows.length, all: claims.length })
          : t("adm.claimCount", { n: claims.length })}
        {/* The split, always — a claim nobody has proved is the one an admin
            is looking for, and a number they have to work out is a number they
            will not check. */}
        <span className="ml-2 text-muted/80">
          {t("adm.claimVerified", { n: verified, m: claims.length - verified })}
        </span>
      </p>

      {/* ── The filter ── */}
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)}
               placeholder={t("adm.claimSearch")} aria-label={t("adm.claimSearch")}
               className={`${box} min-w-[180px] flex-1`} />
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {LODE.map((o) => (
            <button key={o.key} type="button" onClick={() => setOnly(o.key)}
                    aria-pressed={only === o.key}
                    className={`rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${
                      only === o.key ? "bg-accent/15 text-accent"
                                     : "text-muted hover:text-ink"}`}>
              {t(o.label)}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-2 flex flex-wrap gap-2 ${only === "no" ? "opacity-40" : ""}`}>
        <span className="self-center text-[12.5px] text-muted">{t("adm.colClaimed")}</span>
        <input type="date" value={since} max={until || undefined} disabled={only === "no"}
               onChange={(e) => setSince(e.target.value)}
               aria-label={t("adm.from")} className={box} />
        <span className="self-center text-[12.5px] text-muted">{t("adm.to")}</span>
        <input type="date" value={until} min={since || undefined} disabled={only === "no"}
               onChange={(e) => setUntil(e.target.value)}
               aria-label={t("adm.to")} className={box} />
        {SPANS.map((sp) => (
          <button key={sp.label} type="button" disabled={only === "no"}
                  onClick={() => { setSince(sp.from()); setUntil(today()); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:hover:border-line disabled:hover:text-muted">
            {t(sp.label)}
          </button>
        ))}
        <button type="button" disabled={only === "no"}
                onClick={() => { setSince(""); setUntil(""); }}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:hover:border-line disabled:hover:text-muted">
          {t("adm.anyDate")}
        </button>
      </div>

      {/* ── The draw ── */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/8 px-3 py-2.5">
        <span className="text-[12.5px] font-medium text-gold">🎲 {t("adm.drawTitle")}</span>
        <input type="number" min={1} max={Math.max(rows.length, 1)} value={howMany}
               onChange={(e) => setHowMany(e.target.value)}
               aria-label={t("adm.drawHowMany")}
               className="w-20 rounded-lg border border-line bg-card px-2.5 py-1 text-[13px] text-ink" />
        <span className="text-[12.5px] text-muted">{t("adm.drawOf", { n: rows.length })}</span>
        <button type="button" onClick={draw} disabled={!rows.length}
                className="rounded-lg border border-gold bg-gold/15 px-3.5 py-1.5 text-[13px] text-gold hover:bg-gold/25 disabled:opacity-40">
          {drawn ? t("adm.drawAgain") : t("adm.draw")}
        </button>
        {drawn && (
          <button type="button" onClick={() => setDrawn(null)}
                  className="text-[12.5px] text-muted underline hover:text-ink">
            {t("adm.drawClear")}
          </button>
        )}
      </div>

      {drawn && (
        <ol className="mt-2 flex flex-col gap-1 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5">
          {drawn.map((c, i) => (
            <li key={c.id}
                className="grid grid-cols-[20px_32px_1fr] items-center gap-2 text-[13.5px]">
              <span className="text-right font-data text-[11.5px] text-muted">{i + 1}</span>
              <Winner row={c} name={c.character_name ?? nameOf(c.character_id)}
                      portraits={portraits} />
            </li>
          ))}
        </ol>
      )}

      {/* A table because these are four facts about each of many rows, and a
          run-on line makes the eye re-find the boundary between them every
          time. It scrolls inside itself on a narrow screen rather than
          stretching the page. */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
              {([["character", "adm.colCharacter"],
                 ["provider", "adm.colProvider"],
                 ["lodestone", "adm.colLodestone"],
                 ["claimed", "adm.colClaimed"]] as const)
                .map(([by, label]) => (
                  <th key={by} className="py-1.5 pr-3 font-normal"
                      aria-sort={sort.by === by
                        ? (sort.dir === 1 ? "ascending" : "descending")
                        : "none"}>
                    <button type="button" onClick={() => sortBy(by)}
                            className={`inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors hover:text-ink ${
                              sort.by === by ? "text-accent" : ""}`}>
                      {t(label)}
                      {/* The arrow only on the column doing the sorting. One
                          on every header is four claims about the order when
                          only one of them is true. */}
                      <span aria-hidden className={sort.by === by ? "" : "opacity-0"}>
                        {sort.dir === 1 ? "↑" : "↓"}
                      </span>
                    </button>
                  </th>
                ))}
              <th className="py-1.5 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, name }) => {
              const p = providers(c);
              return (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5 pr-3">
                    {/* The name is the link. An admin reading this row is
                        usually on their way to that member's page. */}
                    <Link href={`/member/${c.character_id}`}
                          className="font-data text-ink no-underline hover:text-accent">
                      {name}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3">
                    {p ? (
                      <span className="flex flex-wrap gap-1">
                        {p.names.map((pname) => (
                          <span key={pname}
                                title={p.sure ? undefined : t("adm.guessed")}
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                  PROVIDER_TONE[pname] ?? "border-line text-muted"} ${
                                  p.sure ? "" : "opacity-60"}`}>
                            {pname}{p.sure ? "" : "?"}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted opacity-60">—</span>
                    )}
                  </td>
                  {/* The answer as a word, not as the presence of a date.
                      "Has this person proved the character is theirs" was
                      readable off the Claimed column only if you already knew
                      that a blank there meant no. The badge is a link, so the
                      next move — go and look at the profile — is one click. */}
                  <td className="py-1.5 pr-3">
                    <a href={lodestoneUrl(c.character_id)}
                       target="_blank" rel="noopener noreferrer"
                       title={t("adm.lodeOpen")}
                       className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] no-underline transition-colors ${
                         c.character_verified_at
                           ? "border-jade/50 bg-jade/10 text-jade hover:bg-jade/20"
                           : "border-dashed border-line text-muted hover:border-muted hover:text-ink"}`}>
                      <span aria-hidden>{c.character_verified_at ? "✓" : "·"}</span>
                      {c.character_verified_at ? t("adm.lodeYes") : t("adm.lodeNo")}
                    </a>
                  </td>
                  <td className="py-1.5 pr-3 font-data text-[11.5px] text-muted">
                    {c.character_verified_at
                      ? fmtDate(c.character_verified_at)
                      : <span className="opacity-60">—</span>}
                  </td>
                  <td className="py-1.5 text-right">
                    <button type="button" onClick={() => void onRelease(c.id)}
                            className="rounded-md border border-chili/50 px-2.5 py-1 text-[12px] text-chili hover:bg-chili/10">
                      {t("adm.release")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-2 text-[13px] text-muted">
            {claims.length === 0 ? t("adm.noClaims") : t("adm.claimNoMatch")}
          </div>
        )}
      </div>
    </>
  );
}
