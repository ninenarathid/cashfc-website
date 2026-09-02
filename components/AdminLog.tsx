"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { postPath } from "@/lib/gallery";

interface Line {
  id: number;
  at: string;
  actor_name: string | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
}

const PAGE = 40;

/**
 * Everything that has happened, most recent first.
 *
 * Written by triggers on the tables themselves rather than by the code that
 * calls them, so it records what the database actually did — including anything
 * done straight through the API, and including an admin's own actions, which is
 * the half worth insisting on. The people who can do the most are the ones a log
 * is least useful without.
 *
 * The English here is deliberately not translated. A log is read by whoever is
 * working out what went wrong, it names database tables either way, and a line
 * that says gallery_posts.delete in two languages is not twice as clear.
 */
const VERB: Record<string, Key> = {
  insert: "adm.opInsert", update: "adm.opUpdate", delete: "adm.opDelete",
};

/**
 * What each table is, in words rather than in its own name.
 *
 * The raw table name is still the fallback for anything not listed: those are
 * the database's own words, and a row for a table nobody has named here should
 * say which table it was rather than nothing at all.
 */
const THING: Record<string, Key> = {
  gallery_posts: "adm.thPost",
  gallery_images: "adm.thImage",
  gallery_tags: "adm.thTag",
  gallery_comments: "adm.thComment",
  gallery_likes: "adm.thLikes",
  profiles: "adm.thProfile",
  announcements: "adm.thAnn",
  site_settings: "adm.thSetting",
  member_overrides: "adm.thOverride",
  timeline_posts: "adm.thTimeline",
  kudos: "adm.thKudos",
  feedback_threads: "adm.thThread",
  feedback_messages: "adm.thMessage",
  site_updates: "adm.thUpdate",
};

/** The columns worth naming in a one-line summary of a change. */
function summarise(line: Line): string | null {
  const d = line.detail;
  if (!d) return null;
  const keys = Object.keys(d);
  if (!keys.length) return null;
  if (line.action.endsWith(".update")) {
    return keys.slice(0, 6).join(", ") + (keys.length > 6 ? ` +${keys.length - 6}` : "");
  }
  // An insert or a delete carries the whole row; a few telling fields read far
  // better than a wall of JSON, and the whole thing is one click away anyway.
  const shown = ["name", "title", "caption", "key", "value", "character_id", "body"]
    .filter((k) => d[k] != null && d[k] !== "")
    .map((k) => `${k}: ${String(d[k]).slice(0, 60)}`);
  return shown.length ? shown.join(" · ") : null;
}

/**
 * What the "kind" filter offers.
 *
 * Mostly one table each, but a popoto lands in two of them — kudos for a
 * profile, gallery_likes for a picture — and "show me the popoto" is a question
 * somebody will have without caring which. So the list is filters rather than
 * tables: one entry covering both, and one for each on its own.
 */
const POPOTO = ["kudos", "gallery_likes"];

const FILTERS: { value: string; label: Key; kinds: string[] }[] = [
  // First and together, because a popoto is the thing anybody comes to this log
  // looking for, and the three ways of asking for one belong side by side
  // rather than scattered down a list of table names.
  { value: "popoto", label: "adm.popotoAny", kinds: POPOTO },
  ...POPOTO.map((k) => ({ value: k, label: THING[k], kinds: [k] })),
  ...Object.entries(THING)
    .filter(([k]) => !POPOTO.includes(k))
    .map(([value, label]) => ({ value, label, kinds: [value] })),
];

/**
 * The other end of a popoto.
 *
 * The log already names who did it — that is the actor. What it could not say
 * was who it was done to, which for a popoto is the entire content of the
 * event: "Ninenine added a popoto" is a sentence with the interesting half
 * missing.
 *
 * A profile popoto names the member. A picture popoto links to the picture,
 * because "which one" is a question a name cannot answer and a thumbnail can.
 */
function Recipient(
  { line, nameOf, profiles }: {
    line: Line;
    nameOf: (id: number) => string;
    profiles: Record<string, Who>;
  },
) {
  const { t } = useLang();
  const d = line.detail ?? {};

  // A profile row is about somebody, and its id is a uuid that says so to
  // nobody. Named, and linked when the profile holds a character.
  if (line.target_kind === "profiles") {
    const who = profiles[String(line.target_id)];
    if (!who) return null;
    return (
      <>
        <span className="text-muted">{t("adm.ofWhom")}</span>
        {who.characterId != null ? (
          <Link href={`/member/${who.characterId}`}
                className="font-medium text-ink no-underline hover:text-accent">
            {who.name}
          </Link>
        ) : (
          <span className="font-medium text-ink">{who.name}</span>
        )}
      </>
    );
  }
  if (line.target_kind === "kudos") {
    const to = Number(d.receiver_character_id);
    if (!Number.isFinite(to)) return null;
    return (
      <>
        <span className="text-muted">{t("adm.toWhom")}</span>
        <Link href={`/member/${to}`}
              className="font-medium text-ink no-underline hover:text-accent">
          {nameOf(to)}
        </Link>
      </>
    );
  }
  if (line.target_kind === "gallery_likes") {
    const post = Number(d.post_id);
    if (!Number.isFinite(post)) return null;
    return (
      <>
        <span className="text-muted">{t("adm.onWhat")}</span>
        <Link href={postPath(post)}
              className="font-medium text-ink no-underline hover:text-accent">
          {t("adm.picture", { n: post })}
        </Link>
      </>
    );
  }
  return null;
}

/** A local date as the date input wants it, which is not what toISOString gives. */
const asDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")}`;
const today = () => asDate(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return asDate(d);
};

/** The spans somebody actually asks a log for. */
const SPANS = [
  { label: "adm.spanToday" as Key, from: () => today() },
  { label: "adm.span7" as Key, from: () => daysAgo(6) },
  { label: "adm.span30" as Key, from: () => daysAgo(29) },
];

/**
 * Every profile by its row id, so a log line can name the person it is about.
 *
 * A profile's id is a uuid, and a line reading "changed a profile
 * #6805ef04-9a57…" answers nothing anybody was asking. One query for the lot,
 * shared by every row on the page.
 */
function useProfileNames() {
  const [names, setNames] = useState<Record<string, Who>>({});
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.from("profiles")
        .select("id, character_id, character_name, display_name, discord_username");
      const out: Record<string, Who> = {};
      for (const r of (data ?? []) as {
        id: string; character_id: number | null; character_name: string | null;
        display_name: string | null; discord_username: string | null;
      }[]) {
        const name = r.character_name || r.display_name || r.discord_username;
        if (name) out[r.id] = { name, characterId: r.character_id };
      }
      setNames(out);
    })();
  }, []);
  return names;
}

interface Who { name: string; characterId: number | null }

/**
 * Who did it, when the database recorded nobody.
 *
 * actor_name comes from the signed-in user, so it is empty for the two things
 * that happen without one: a profile row created by the signup trigger, and
 * anything written with the service key from outside the site.
 *
 * The first of those has an answer. Nothing but the signup trigger inserts a
 * profile, so the person a new profile belongs to is the person who signed up —
 * that is who to name, rather than shrugging at a row that knows perfectly well.
 * The second genuinely was not a person using the site, and says so instead of
 * pretending a member is responsible for it.
 */
function actorOf(
  line: Line, profiles: Record<string, Who>, t: (k: Key) => string,
): string {
  if (line.actor_name) return line.actor_name;
  if (line.action === "profiles.insert") {
    const who = profiles[String(line.target_id)];
    if (who) return who.name;
  }
  return t("adm.system");
}

export default function AdminLog(
  { nameOf }: { nameOf: (id: number) => string },
) {
  const { t } = useLang();
  const profiles = useProfileNames();
  const [supabase] = useState(createClient);
  const [lines, setLines] = useState<Line[]>([]);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("");
  // A day each, as the reader's calendar reckons them. Either may stand alone:
  // "since Tuesday" and "up to Tuesday" are both questions somebody has.
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchPage = useCallback(async (from: number, replace: boolean) => {
    if (!supabase) return;
    setLoading(true);
    let q = supabase.from("audit_log")
      .select("id, at, actor_name, action, target_kind, target_id, detail")
      .order("at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (who.trim()) q = q.ilike("actor_name", `%${who.trim()}%`);
    // The inputs are local dates and `at` is a timestamp with a zone, so each
    // end is converted from the reader's midnight rather than compared as text
    // — otherwise "today" quietly means whatever today is in UTC.
    if (since) q = q.gte("at", new Date(`${since}T00:00:00`).toISOString());
    if (until) q = q.lte("at", new Date(`${until}T23:59:59.999`).toISOString());
    const kinds = FILTERS.find((f) => f.value === kind)?.kinds ?? [];
    if (kinds.length === 1) q = q.eq("target_kind", kinds[0]);
    else if (kinds.length > 1) q = q.in("target_kind", kinds);
    const { data } = await q;
    const rows = (data as Line[]) ?? [];
    setLines((prev) => (replace ? rows : [...prev, ...rows]));
    setMore(rows.length === PAGE);
    setLoading(false);
  }, [supabase, who, kind, since, until]);

  // Typing a name runs ahead of the database, so the query waits for a pause.
  useEffect(() => {
    const id = setTimeout(() => { void fetchPage(0, true); }, 300);
    return () => clearTimeout(id);
  }, [fetchPage]);

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB",
      { day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">{t("adm.log")}</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        {t("adm.logHint")}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input value={who} onChange={(e) => setWho(e.target.value)}
               placeholder={t("adm.who")}
               className="w-40 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink placeholder:text-muted" />
        <select value={kind} onChange={(e) => setKind(e.target.value)}
                aria-label={t("adm.anything")}
                className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink">
          <option value="">{t("adm.anything")}</option>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{t(f.label)}</option>
          ))}
        </select>

        {/* Two ends, either optional. Typing dates is the precise way and
            nobody wants to do it for "what happened today", so the common
            spans are a click. */}
        <input type="date" value={since} max={until || undefined}
               onChange={(e) => setSince(e.target.value)} aria-label={t("adm.from")}
               className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink" />
        <span className="self-center text-[12.5px] text-muted">{t("adm.to")}</span>
        <input type="date" value={until} min={since || undefined}
               onChange={(e) => setUntil(e.target.value)} aria-label={t("adm.to")}
               className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink" />

        {SPANS.map((s) => (
          <button key={s.label} onClick={() => { setSince(s.from()); setUntil(today()); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
            {t(s.label)}
          </button>
        ))}
        {(since || until) && (
          <button onClick={() => { setSince(""); setUntil(""); }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:border-chili hover:text-chili">
            {t("adm.anyDate")}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {lines.map((l) => {
          const [, op] = l.action.split(".");
          const summary = summarise(l);
          return (
            <div key={l.id}
                 className="rounded-lg border border-line bg-card px-3 py-2 text-[12.5px]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-data text-[11.5px] text-muted">{when(l.at)}</span>
                <span className="font-medium text-ink">{actorOf(l, profiles, t)}</span>
                <span className="text-muted">{VERB[op] ? t(VERB[op]) : op}</span>
                <span className="text-ink/85">
                  {THING[l.target_kind ?? ""]
                    ? t(THING[l.target_kind ?? ""]) : l.target_kind}
                </span>
                <Recipient line={l} nameOf={nameOf} profiles={profiles} />
                {/* The raw id, unless the line already named who or what it
                    was — a uuid beside a name is a worse answer to the same
                    question. */}
                {l.target_id && l.target_kind !== "profiles"
                  && l.target_kind !== "kudos" && l.target_kind !== "gallery_likes" && (
                  <span className="font-data text-[11.5px] text-muted">#{l.target_id}</span>
                )}
                {l.detail && (
                  <button onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                          className="ml-auto text-[11.5px] text-accent underline">
                    {expanded === l.id ? t("adm.less") : t("adm.detail")}
                  </button>
                )}
              </div>
              {summary && expanded !== l.id && (
                <div className="mt-0.5 truncate text-[12px] text-muted">{summary}</div>
              )}
              {expanded === l.id && (
                <pre className="mt-1.5 max-h-56 overflow-auto rounded-md border border-line bg-bg p-2 font-data text-[11px] leading-relaxed text-muted">
                  {JSON.stringify(l.detail, null, 2)}
                </pre>
              )}
            </div>
          );
        })}

        {lines.length === 0 && !loading && (
          <p className="py-4 text-center text-[12.5px] text-muted">{t("adm.nothingLogged")}</p>
        )}
      </div>

      {more && (
        <button onClick={() => fetchPage(lines.length, false)} disabled={loading}
                className="mt-3 rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent disabled:opacity-50">
          {loading ? t("adm.loading") : t("adm.loadMore")}
        </button>
      )}
    </section>
  );
}
