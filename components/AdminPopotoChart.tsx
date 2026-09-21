"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { allRowsOrThrow } from "@/lib/rows";
import { bangkokDay } from "@/lib/evercold";
import { sharersOf } from "@/lib/popoto";
import { useLang, type Key } from "@/lib/i18n";

/**
 * Giving and getting popoto, drawn.
 *
 * The reports tab answers one question exactly — who has earned an entry in the
 * draw — and answers it as a list, because a draw is a list of names. This is
 * the other half: how much of this is happening at all, and whether a day like
 * the one where seventeen hundred were sent is the new normal or one afternoon
 * somebody spent clicking.
 *
 * Two tables, because there are two buttons. A potato on a profile writes a row
 * in `kudos`, a potato on a screenshot writes one in `gallery_likes`, and the
 * charts keep them apart rather than adding them into one number that hides
 * which of the two the FC actually uses.
 *
 * Presses on the way out: one press is one popoto given, whoever it ends up
 * credited to. On the way in the site's own rule applies — a potato on a picture
 * of five people is a fifth each (see sharersOf) — so the receiving chart agrees
 * with the leaderboard instead of quietly disagreeing with it by the number of
 * group photographs.
 */

const tooltipStyle = {
  background: "#1b212b", border: "1px solid #2b3441", borderRadius: 8,
  color: "#e3e8ef", fontSize: 12.5,
};

const PROFILE = "#e5cc80";
const PICTURE = "#4fb8a8";
const GIVERS = "#6aa9e0";
const RECEIVERS = "#c98a5b";
const AXIS = { fill: "#8b97a8", fontSize: 11 };
const AXIS_LINE = { stroke: "#2b3441" };

const SPANS = [7, 14, 30] as const;
type Span = (typeof SPANS)[number];

/** How many names each of the two lists is worth showing. */
const TOP = 10;

const today = () => bangkokDay(new Date().toISOString());

/** A Bangkok date n days before today, as YYYY-MM-DD. */
function back(n: number): string {
  const d = new Date(`${today()}T00:00:00+07:00`);
  d.setTime(d.getTime() - n * 86_400_000);
  return bangkokDay(d.toISOString());
}

interface Kudo {
  sender_id: string;
  receiver_character_id: number;
  created_at: string;
  rare_tier: string | null;
}
interface Like { profile_id: string; post_id: number; created_at: string }
interface Tag { post_id: number; character_id: number | null; confirmed_at: string | null }

interface Raw {
  kudos: Kudo[];
  likes: Like[];
  /** Post id → everybody that picture's potatoes are divided between. */
  sharers: Map<number, number[]>;
  /** Account id → what to call whoever holds it. */
  who: Map<string, string>;
}

export default function AdminPopotoChart(
  { nameOf }: {
    /** A character id, as the name on the roster. */
    nameOf: (id: number) => string;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [span, setSpan] = useState<Span>(14);
  const [raw, setRaw] = useState<Raw | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  /**
   * What each span fetched, kept for as long as the page is open.
   *
   * Flipping between a fortnight and a week is the same data asked for twice,
   * and the second ask is five round trips and a second of nothing in exchange
   * for an answer already on this machine.
   */
  const cache = useRef<Map<Span, Raw>>(new Map());

  const load = useCallback(async (want: Span, fresh = false) => {
    if (!supabase) return;
    const had = cache.current.get(want);
    if (!fresh && had) { setRaw(had); setBusy(false); return; }
    setBusy(true); setFailed(null);
    // The FC's midnight, the same one the draw and the bell count. A chart whose
    // first bar starts at the reader's breakfast disagrees with every other
    // total on the site, and only for readers who are not in Thailand.
    const from = `${back(want - 1)}T00:00:00+07:00`;
    try {
      const [kudos, likes, posts, tags, people] = await Promise.all([
        allRowsOrThrow<Kudo>((a, b) => supabase.from("kudos")
          .select("sender_id, receiver_character_id, created_at, rare_tier")
          .gte("created_at", from).order("id").range(a, b)),
        allRowsOrThrow<Like>((a, b) => supabase.from("gallery_likes")
          .select("profile_id, post_id, created_at").gte("created_at", from)
          .order("created_at").order("profile_id").order("post_id").range(a, b)),
        // Neither of these is date-ranged: a potato given this week can land on
        // a picture posted last year, and the picture is where the owner is.
        allRowsOrThrow<{ id: number; character_id: number | null; like_count: number | null }>(
          (a, b) => supabase.from("gallery_posts")
            .select("id, character_id, like_count").order("id").range(a, b)),
        allRowsOrThrow<Tag>((a, b) => supabase.from("gallery_tags")
          .select("post_id, character_id, confirmed_at")
          .order("post_id").order("character_id").range(a, b)),
        allRowsOrThrow<{
          id: string; character_id: number | null;
          display_name: string | null; character_name: string | null;
        }>((a, b) => supabase.from("profiles")
          .select("id, character_id, display_name, character_name").order("id").range(a, b)),
      ]);

      const byPost = new Map<number, Tag[]>();
      for (const tag of tags) {
        const list = byPost.get(tag.post_id) ?? [];
        list.push(tag); byPost.set(tag.post_id, list);
      }
      const sharers = new Map<number, number[]>();
      for (const post of posts) sharers.set(post.id, sharersOf(post, byPost.get(post.id) ?? []));

      const who = new Map<string, string>();
      for (const p of people) {
        who.set(p.id, p.character_id != null ? nameOf(p.character_id)
          : p.display_name ?? p.character_name ?? t("adm.pcSomebody"));
      }

      const next: Raw = { kudos, likes, sharers, who };
      cache.current.set(want, next);
      setRaw(next);
    } catch (e) {
      // Said out loud rather than drawn short. A chart missing a page of rows
      // looks exactly like a quiet week, and nothing on the screen would say
      // which of the two it was.
      setFailed(e instanceof Error ? e.message : String(e));
      setRaw(null);
    } finally {
      setBusy(false);
    }
  }, [supabase, nameOf, t]);

  useEffect(() => { void load(span); }, [load, span]);

  const sums = useMemo(() => {
    if (!raw) return null;
    const days: string[] = [];
    for (let i = span - 1; i >= 0; i--) days.push(back(i));
    // Every day in the span, including the ones nothing happened on: a line that
    // skips its quiet days is a line that makes a lull look like a weekend.
    const perDay = new Map(days.map((d) => [d, {
      profile: 0, picture: 0, gave: new Set<string>(), got: new Set<number>(),
    }]));

    const gave = new Map<string, number>();
    const got = new Map<number, number>();

    let rare = 0;
    for (const k of raw.kudos) {
      const d = perDay.get(bangkokDay(k.created_at));
      if (!d) continue;
      d.profile++; d.gave.add(k.sender_id); d.got.add(k.receiver_character_id);
      gave.set(k.sender_id, (gave.get(k.sender_id) ?? 0) + 1);
      got.set(k.receiver_character_id, (got.get(k.receiver_character_id) ?? 0) + 1);
      if (k.rare_tier) rare++;
    }
    for (const l of raw.likes) {
      const d = perDay.get(bangkokDay(l.created_at));
      if (!d) continue;
      d.picture++; d.gave.add(l.profile_id);
      gave.set(l.profile_id, (gave.get(l.profile_id) ?? 0) + 1);
      // A picture with nobody in it has nowhere to send its share, exactly as
      // the board treats it: counted as given, credited to no one.
      const share = raw.sharers.get(l.post_id) ?? [];
      for (const c of share) {
        d.got.add(c);
        got.set(c, (got.get(c) ?? 0) + 1 / share.length);
      }
    }

    const rows = days.map((day) => {
      const d = perDay.get(day)!;
      return {
        day,
        label: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
        profile: d.profile, picture: d.picture,
        givers: d.gave.size, receivers: d.got.size,
      };
    });

    const top = <K,>(m: Map<K, number>, name: (k: K) => string) =>
      [...m].sort((a, b) => b[1] - a[1]).slice(0, TOP)
        .map(([k, n]) => ({ name: name(k), n: Math.round(n * 10) / 10 }));

    const total = rows.reduce((s, r) => s + r.profile + r.picture, 0);
    return {
      rows,
      total,
      profile: rows.reduce((s, r) => s + r.profile, 0),
      picture: rows.reduce((s, r) => s + r.picture, 0),
      average: Math.round(total / span),
      givers: gave.size,
      receivers: got.size,
      rare,
      topGivers: top(gave, (id) => raw.who.get(id) ?? t("adm.pcSomebody")),
      topReceivers: top(got, (id) => nameOf(id)),
    };
  }, [raw, span, nameOf, t]);

  const pill = (on: boolean) =>
    `rounded-lg border px-2.5 py-1 text-ui transition-colors ${
      on ? "border-accent bg-accent/15 text-accent"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  const boxes: { key: Key; value: number }[] = sums ? [
    { key: "adm.pcTotal", value: sums.total },
    { key: "adm.pcOnProfiles", value: sums.profile },
    { key: "adm.pcOnPictures", value: sums.picture },
    { key: "adm.pcAverage", value: sums.average },
    { key: "adm.pcGivers", value: sums.givers },
    { key: "adm.pcRare", value: sums.rare },
  ] : [];

  const lists: { title: Key; note: Key; rows: { name: string; n: number }[]; color: string }[] =
    sums ? [
      { title: "adm.pcTopGivers", note: "adm.pcTopGiversNote",
        rows: sums.topGivers, color: GIVERS },
      { title: "adm.pcTopReceivers", note: "adm.pcTopReceiversNote",
        rows: sums.topReceivers, color: RECEIVERS },
    ] : [];

  return (
    <>
      <p className="mt-1 text-ui leading-relaxed text-muted">{t("adm.pcNote")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {SPANS.map((s) => (
          <button key={s} type="button" onClick={() => setSpan(s)}
                  aria-pressed={s === span} className={pill(s === span)}>
            {t("adm.pcDays", { n: s })}
          </button>
        ))}
        <button type="button" onClick={() => void load(span, true)}
                className="rounded-lg border border-line px-2.5 py-1 text-ui text-muted hover:border-muted hover:text-ink">
          {t("adm.pcRefresh")}
        </button>
        {busy && <span className="text-meta text-muted">{t("adm.pcLoading")}</span>}
      </div>

      {failed && (
        <div className="mt-3 rounded-lg border border-chili/40 bg-chili/10 p-3 text-ui text-chili">
          {t("adm.pcFailed", { why: failed })}
        </div>
      )}
      {!sums && !failed && (
        <div className="mt-3 rounded-lg border border-dashed border-line p-8 text-center text-ui text-muted">
          {t("adm.pcLoading")}
        </div>
      )}

      {sums && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {boxes.map((box) => (
              <div key={box.key} className="rounded-lg border border-line bg-card p-2.5">
                <div className="font-data text-2xl font-bold tabular-nums">
                  {box.value.toLocaleString()}
                </div>
                <div className="text-meta text-muted">{t(box.key)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 font-display text-read font-semibold">{t("adm.pcPerDay")}</div>
          <div className="mt-1.5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sums.rows}>
                <XAxis dataKey="label" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
                <YAxis allowDecimals={false} width={38} tick={AXIS}
                       axisLine={AXIS_LINE} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#e3e8ef0d" }} />
                <Bar dataKey="profile" name={t("adm.pcOnProfiles")} stackId="a" fill={PROFILE} />
                <Bar dataKey="picture" name={t("adm.pcOnPictures")} stackId="a" fill={PICTURE}
                     radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-meta text-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-sm" style={{ background: PROFILE }} />
              {t("adm.pcOnProfiles")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5 rounded-sm" style={{ background: PICTURE }} />
              {t("adm.pcOnPictures")}
            </span>
          </div>

          <div className="mt-4 font-display text-read font-semibold">
            {t("adm.pcPeoplePerDay")}
          </div>
          <p className="text-meta text-muted">{t("adm.pcPeoplePerDayNote")}</p>
          <div className="mt-1.5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sums.rows}>
                <XAxis dataKey="label" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
                <YAxis allowDecimals={false} width={38} tick={AXIS}
                       axisLine={AXIS_LINE} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="givers" name={t("adm.pcGivers")}
                      stroke={GIVERS} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="receivers" name={t("adm.pcReceivers")}
                      stroke={RECEIVERS} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {lists.map((chart) => (
              <div key={chart.title}>
                <div className="font-display text-read font-semibold">{t(chart.title)}</div>
                <p className="text-meta text-muted">{t(chart.note)}</p>
                <div className="mt-1.5" style={{ height: Math.max(140, chart.rows.length * 28) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.rows} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={AXIS} axisLine={AXIS_LINE} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={AXIS}
                             axisLine={AXIS_LINE} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#e3e8ef0d" }} />
                      <Bar dataKey="n" name={t("adm.pcPopoto")} fill={chart.color}
                           radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-meta leading-relaxed text-muted">{t("adm.pcShareNote")}</p>
        </>
      )}
    </>
  );
}
