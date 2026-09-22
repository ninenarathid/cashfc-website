"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
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
const LUCKY = "#f3c969";
const UNLUCKY = "#7d8794";
const AXIS = { fill: "#8b97a8", fontSize: 11 };
const AXIS_LINE = { stroke: "#2b3441" };

const SPANS = [7, 14, 30] as const;
type Span = (typeof SPANS)[number];

/** How many names each of the two lists is worth showing. */
const TOP = 10;

/**
 * How many popotos somebody needs before their luck is worth printing.
 *
 * A rare is about one popoto in fifty, so under a couple of dozen the whole
 * scale is "none" or "one", and one out of five is a 20% that means nothing at
 * all — it would sit at the top of the lucky list every time and say only that
 * somebody pressed the button five times. Thirty is where a single hit stops
 * being the whole chart.
 */
const MIN_LUCK = 30;

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
  /** Account id → the character it has claimed, for the accounts that have one. */
  charOf: Map<string, number>;
}

/** One name on the luck lists. */
interface LuckRow {
  name: string;
  /** Popotos that could have come up rare, sent and received together. */
  n: number;
  /** How many of them did. */
  hits: number;
  /** hits ÷ n, as a percentage to one decimal. */
  pct: number;
  /** "3/35", printed beside the bar so a 0% row still reads as something. */
  tally: string;
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
      const charOf = new Map<string, number>();
      for (const p of people) {
        who.set(p.id, p.character_id != null ? nameOf(p.character_id)
          : p.display_name ?? p.character_name ?? t("adm.pcSomebody"));
        if (p.character_id != null) charOf.set(p.id, p.character_id);
      }

      const next: Raw = { kudos, likes, sharers, who, charOf };
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

    /*
     * Luck: of the popotos that could have come up rare, how many did — for one
     * person, counting the ones they sent and the ones they were sent together.
     *
     * One number rather than two because that is the question people actually
     * ask. "Why does Farcia see so many rare" is about Farcia and not about
     * Farcia's outbox, and a rare is one event with a person at either end of
     * it, so it counts for both of them.
     *
     * What is left out of the denominator matters more than what is in it. A
     * popoto to your own character never rolls (v82) and a popoto on a picture
     * never rolls at all, so neither belongs here: counting them would put
     * whoever potatoes their own profile every morning at the bottom of the
     * unlucky list for pressing a button that was never in the draw.
     *
     * Nor are the days before the draw was switched on, which is why this
     * starts from `since` rather than from the start of the span. A fortnight
     * that reaches back past the day the rare popoto arrived is a fortnight
     * with days in it where nothing could possibly have come up, and counting
     * those said the FC was on 1.3% when it was on 1.8% — the same mistake as
     * dividing by the potatoes on pictures, just harder to see.
     */
    const luck = new Map<number, { n: number; hits: number }>();
    const mark = (character: number | undefined, hit: boolean) => {
      if (character == null) return;
      const e = luck.get(character) ?? { n: 0, hits: 0 };
      e.n++; if (hit) e.hits++;
      luck.set(character, e);
    };

    /*
     * The first day in the span that a rare actually came out of it, which is
     * the earliest day the draw can be shown to have been running.
     *
     * Taken from the potatoes rather than from the switch, because the switch
     * row remembers only when it was last touched and not what it was set to
     * on any given day. The whole of that day counts, not only the popotos
     * after the rare itself, so the window does not begin on a hit and hand
     * everybody involved in it a percentage point they did not earn. With no
     * rare in the span at all there is nothing to place, and every list is
     * then honestly empty of hits.
     */
    let since: string | null = null;
    for (const k of raw.kudos) {
      if (!k.rare_tier) continue;
      const day = bangkokDay(k.created_at);
      if (perDay.has(day) && (since === null || day < since)) since = day;
    }

    let rare = 0;
    /** Popotos that were in the draw at all, for the FC's own hit rate. */
    let rolled = 0;
    let hits = 0;
    for (const k of raw.kudos) {
      const day = bangkokDay(k.created_at);
      const d = perDay.get(day);
      if (!d) continue;
      d.profile++; d.gave.add(k.sender_id); d.got.add(k.receiver_character_id);
      gave.set(k.sender_id, (gave.get(k.sender_id) ?? 0) + 1);
      got.set(k.receiver_character_id, (got.get(k.receiver_character_id) ?? 0) + 1);
      if (k.rare_tier) rare++;
      const from = raw.charOf.get(k.sender_id);
      if (since !== null && day >= since && from !== k.receiver_character_id) {
        rolled++;
        if (k.rare_tier) hits++;
        mark(from, !!k.rare_tier);
        mark(k.receiver_character_id, !!k.rare_tier);
      }
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

    const ranked: LuckRow[] = [...luck]
      .filter(([, e]) => e.n >= MIN_LUCK)
      .map(([character, e]) => ({
        name: nameOf(character), n: e.n, hits: e.hits,
        pct: Math.round((1000 * e.hits) / e.n) / 10,
        tally: `${e.hits}/${e.n}`,
      }));
    // Where two people are on the same rate, the one who got there over more
    // popotos is the more convincing of the two — at both ends of the list,
    // which is why the tiebreak is the same on both and not mirrored.
    const luckier = (a: LuckRow, b: LuckRow) => b.pct - a.pct || b.n - a.n;
    const unluckier = (a: LuckRow, b: LuckRow) => a.pct - b.pct || b.n - a.n;

    /** What the whole FC came out at, for the line the two lists are read against. */
    const hitRate = rolled ? Math.round((1000 * hits) / rolled) / 10 : 0;

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
      lucky: [...ranked].sort(luckier).slice(0, TOP),
      unlucky: [...ranked].sort(unluckier).slice(0, TOP),
      /** Where the dashed line goes, and what both lists are read against. */
      hitRate,
      /*
       * One scale for both lists, worked out here rather than left to each
       * chart's own data. Side by side and each stretched to its own longest
       * bar, the unlucky half — every bar of which is at or near zero — came
       * out looking like the lucky half at a glance, which is the one reading
       * these two charts exist to make impossible.
       */
      luckMax: Math.max(...ranked.map((r) => r.pct), hitRate * 2),
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

  const luckLists: { title: Key; rows: LuckRow[]; color: string }[] = sums ? [
    { title: "adm.pcLucky", rows: sums.lucky, color: LUCKY },
    { title: "adm.pcUnlucky", rows: sums.unlucky, color: UNLUCKY },
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

          <div className="mt-5 font-display text-read font-semibold">{t("adm.pcLuck")}</div>
          {sums.lucky.length === 0 ? (
            <div className="mt-1.5 rounded-lg border border-dashed border-line p-6 text-center text-ui text-muted">
              {t("adm.pcLuckThin", { n: MIN_LUCK })}
            </div>
          ) : (
            <div className="mt-1.5 grid gap-4 lg:grid-cols-2">
              {luckLists.map((chart) => (
                <div key={chart.title}>
                  <div className="font-display text-read font-semibold">{t(chart.title)}</div>
                  <div className="mt-1.5" style={{ height: Math.max(140, chart.rows.length * 28) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart.rows} layout="vertical"
                                margin={{ left: 8, right: 44 }}>
                        {/* Both lists on the one scale (see luckMax), wide
                            enough to hold the FC's own line even when every bar
                            on this side is under it. */}
                        <XAxis type="number" unit="%" tick={AXIS} axisLine={AXIS_LINE}
                               tickLine={false}
                               domain={[0, sums.luckMax]} />
                        <YAxis type="category" dataKey="name" width={130} tick={AXIS}
                               axisLine={AXIS_LINE} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#e3e8ef0d" }} />
                        <ReferenceLine x={sums.hitRate} stroke="#8b97a8" strokeDasharray="3 3" />
                        {/* Two settings this chart does not work without, both
                            about the same row — the one at 0%, which is most of
                            the unlucky list and the whole reason it is drawn.
                            A bar at zero is no rectangle at all, and recharts
                            hangs the count off the rectangle, so without a
                            minimum the entire unlucky half came out as ten
                            names against an empty panel. It also holds a
                            LabelList back until the bar reports its animation
                            finished, and a row whose only content is that count
                            cannot wait on an event that may not arrive. */}
                        <Bar dataKey="pct" name={t("adm.pcHitRate")} unit="%" fill={chart.color}
                             radius={[0, 4, 4, 0]} isAnimationActive={false} minPointSize={2}>
                          <LabelList dataKey="tally" position="right" fill="#8b97a8"
                                     fontSize={11} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-meta leading-relaxed text-muted">{t("adm.pcShareNote")}</p>
        </>
      )}
    </>
  );
}
