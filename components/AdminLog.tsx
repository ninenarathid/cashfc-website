"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
const VERB: Record<string, string> = {
  insert: "added", update: "changed", delete: "removed",
};

const THING: Record<string, string> = {
  gallery_posts: "a gallery post",
  gallery_images: "a picture",
  gallery_tags: "a tag",
  gallery_comments: "a comment",
  gallery_likes: "a popoto",
  profiles: "a profile",
  announcements: "an announcement",
  site_settings: "a site setting",
  member_overrides: "a member override",
  timeline_posts: "a timeline post",
  kudos: "a kudos",
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

export default function AdminLog() {
  const [supabase] = useState(createClient);
  const [lines, setLines] = useState<Line[]>([]);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchPage = useCallback(async (from: number, replace: boolean) => {
    if (!supabase) return;
    setLoading(true);
    let q = supabase.from("audit_log")
      .select("id, at, actor_name, action, target_kind, target_id, detail")
      .order("at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (who.trim()) q = q.ilike("actor_name", `%${who.trim()}%`);
    if (kind) q = q.eq("target_kind", kind);
    const { data } = await q;
    const rows = (data as Line[]) ?? [];
    setLines((prev) => (replace ? rows : [...prev, ...rows]));
    setMore(rows.length === PAGE);
    setLoading(false);
  }, [supabase, who, kind]);

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
      <div className="font-display font-semibold">Activity log</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        Every insert, change and deletion, recorded by the database itself — so it
        holds what actually happened rather than what the site remembered to
        mention, and an admin&rsquo;s actions sit in it beside everybody else&rsquo;s.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input value={who} onChange={(e) => setWho(e.target.value)}
               placeholder="Who…"
               className="w-40 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink placeholder:text-muted" />
        <select value={kind} onChange={(e) => setKind(e.target.value)}
                aria-label="What kind of thing"
                className="rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink">
          <option value="">Anything</option>
          {Object.entries(THING).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
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
                <span className="font-medium text-ink">{l.actor_name ?? "somebody"}</span>
                <span className="text-muted">{VERB[op] ?? op}</span>
                <span className="text-ink/85">
                  {THING[l.target_kind ?? ""] ?? l.target_kind}
                </span>
                {l.target_id && (
                  <span className="font-data text-[11.5px] text-muted">#{l.target_id}</span>
                )}
                {l.detail && (
                  <button onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                          className="ml-auto text-[11.5px] text-accent underline">
                    {expanded === l.id ? "less" : "detail"}
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
          <p className="py-4 text-center text-[12.5px] text-muted">Nothing recorded yet.</p>
        )}
      </div>

      {more && (
        <button onClick={() => fetchPage(lines.length, false)} disabled={loading}
                className="mt-3 rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-accent hover:text-accent disabled:opacity-50">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </section>
  );
}
