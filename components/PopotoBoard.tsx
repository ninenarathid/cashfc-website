"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { allRowsOrThrow } from "@/lib/rows";
import { useLang, type Key } from "@/lib/i18n";
import LeaderRow, { type Leader } from "@/components/LeaderRow";
import PopotoIcon from "@/components/ui/PopotoIcon";
import Skeleton from "@/components/ui/Skeleton";
import { periodStart, popotoText, splitPopoto, splitPopotoLikes,
         type PopotoPeriod, type PopotoPost, type PopotoTag } from "@/lib/popoto";

/**
 * The two boards the game had no hand in.
 *
 * Potatoes come from two places and they are separate all the way down: Send
 * popoto on a profile writes a row in `kudos`, a potato on a screenshot writes
 * one in `gallery_likes`, and neither table knows the other exists. Adding them
 * gave a number that matched nothing anybody could see anywhere else, so each
 * gets its own board and each agrees exactly with the count it sits next to —
 * the profile board with the number on that member's page, the gallery board
 * with the potatoes under their pictures.
 *
 * They also mean different things. One is the FC saying something about a
 * person; the other is the FC saying something about a screenshot. Somebody
 * everybody likes and somebody who takes good pictures are both worth knowing
 * about, and one column could only ever have said which had the larger total.
 *
 * Between them they are the only rankings here nobody can grind alone: every
 * point came from another member pressing something.
 *
 * Both open on this month. A board of every potato since the site opened is
 * topped by the same few people for good, and a month is a race somebody new
 * can still win. This year and all time are one press away; the all-time
 * numbers are the ones each member's own page shows, and that page still shows
 * them.
 */

const TOP_N = 10;

const PERIODS: { key: PopotoPeriod; label: Key; none: Key }[] = [
  { key: "month", label: "lb.thisMonth", none: "lb.noneMonth" },
  { key: "year", label: "lb.thisYear", none: "lb.noneYear" },
  { key: "all", label: "lb.allTime", none: "lb.noneAll" },
];

/** Who received how many, and from how many distinct places. */
type Totals = Map<number, { score: number; n: number }>;

interface Board {
  key: string;
  color: string;
  icon: ReactNode;
  title: Key;
  hint: Key;
  /** What the bracketed number under the total means, for the tooltip. */
  unit: (n: number) => string;
  /** Everybody's total since `from`, or ever when it is null. */
  load: (supabase: NonNullable<ReturnType<typeof createClient>>,
         from: string | null) => Promise<Totals>;
}

const BOARDS: Board[] = [
  {
    key: "profile",
    // The site's gold, which is already the potato's colour everywhere else.
    color: "#e5cc80",
    icon: <PopotoIcon />,
    title: "lb.popoto",
    hint: "lb.popotoHint",
    unit: (n) => `from ${n} member${n === 1 ? "" : "s"}`,
    // One row per sender per person per day, which the table enforces, so
    // counting rows counts potatoes and counting senders counts people.
    load: async (supabase, from) => {
      // Paged. This used to be one select, which meant the board counted the
      // first thousand rows of the table and then quietly stopped — every
      // total on the page was short from the day kudos passed that mark, while
      // each member's own page, which filters to one person, stayed right.
      // In id order, so no page can repeat or skip a row of the one before.
      const data = await allRowsOrThrow<{ receiver_character_id: number; sender_id: string }>(
        (a, b) => {
          let q = supabase.from("kudos").select("receiver_character_id, sender_id");
          if (from) q = q.gte("created_at", from);
          return q.order("id").range(a, b);
        });
      const out: Totals = new Map();
      const senders = new Map<number, Set<string>>();
      for (const k of data) {
        const at = out.get(k.receiver_character_id) ?? { score: 0, n: 0 };
        at.score += 1;
        out.set(k.receiver_character_id, at);
        const s = senders.get(k.receiver_character_id) ?? new Set<string>();
        s.add(k.sender_id);
        senders.set(k.receiver_character_id, s);
      }
      for (const [id, s] of senders) {
        const at = out.get(id);
        if (at) at.n = s.size;
      }
      return out;
    },
  },
  {
    key: "gallery",
    color: "#4fb8a8",
    icon: <PopotoIcon />,
    title: "lb.gallery",
    hint: "lb.galleryHint",
    unit: (n) => `across ${n} picture${n === 1 ? "" : "s"}`,
    // Divided between everybody in the picture, which the FC voted for. The
    // rule itself is in lib/popoto.ts, shared with the front page so the two
    // boards can never come to different answers about the same photograph.
    //
    // Not filtered to posts with a character on them any more: a picture posted
    // for nobody in particular still belongs to whoever is tagged in it.
    load: async (supabase, from) => {
      // Paged for the same reason, before it becomes the same bug: these two
      // are in the dozens today and the gallery only grows.
      const [posts, tags, likes] = await Promise.all([
        allRowsOrThrow<PopotoPost>((a, b) => supabase.from("gallery_posts")
          .select("id, character_id, like_count").order("id").range(a, b)),
        allRowsOrThrow<PopotoTag>((a, b) => supabase.from("gallery_tags")
          .select("post_id, character_id, confirmed_at")
          .order("post_id").order("character_id").range(a, b)),
        // All time is already counted on each picture. A month needs the
        // potatoes themselves, to know when each one was pressed.
        from == null ? null
          : allRowsOrThrow<{ post_id: number }>((a, b) => supabase.from("gallery_likes")
              .select("post_id").gte("created_at", from)
              .order("post_id").order("profile_id").range(a, b)),
      ]);
      return likes ? splitPopotoLikes(posts, tags, likes) : splitPopoto(posts, tags);
    },
  },
];

export type Names = Record<number, { name: string; avatar: string | null }>;

/** The top of a board, from everybody's totals. */
const rank = (got: Totals, names: Names): Leader[] =>
  [...got.entries()]
    .map(([id, v]) => ({
      id,
      name: names[id]?.name ?? `#${id}`,
      avatar: names[id]?.avatar ?? null,
      score: v.score,
      n: v.n,
    }))
    // Nobody on zero, so a quiet month is an empty board rather than a
    // ranking of people nobody has given one to.
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.n - a.n)
    .slice(0, TOP_N);

/**
 * Ten rows of nothing yet, drawn the size the ten rows will be, so the boards
 * below stay where they are when the numbers arrive.
 */
function Placeholder() {
  const { t } = useLang();
  return (
    <>
      <span role="status" className="sr-only">{t("common.loading")}</span>
      <ol aria-hidden className="flex flex-col gap-1 px-4 pb-4 pt-3">
        {Array.from({ length: TOP_N }, (_, i) => (
          <li key={i} className={`grid items-center gap-2 text-read ${
            i < 3 ? "grid-cols-[22px_78px_1fr_auto] py-2" : "grid-cols-[22px_1fr_auto]"}`}>
            <span className="text-right font-data text-meta text-muted/50">{i + 1}</span>
            {i < 3 && <Skeleton rounded="rounded-full" className="size-[78px]" />}
            {/* A line of text tall, the height a name takes. */}
            <span className="flex h-[1.5em] items-center">
              <Skeleton className={i < 3 ? "h-4 w-32" : "h-3 w-28"} />
            </span>
            <Skeleton className="h-3 w-10" />
          </li>
        ))}
      </ol>
    </>
  );
}

function OneBoard({ board, names, period }: {
  board: Board; names: Names; period: PopotoPeriod;
}) {
  const { t } = useLang();
  // Every period read so far, kept while the page is open. Going back to one
  // is the same question asked twice, and all time is forty pages of rows.
  const [lists, setLists] = useState<Partial<Record<PopotoPeriod, Leader[]>>>({});
  const [failed, setFailed] = useState<Partial<Record<PopotoPeriod, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  // Asked for and not back yet counts as asked, so pressing back and forth
  // while a period is on its way does not send for it a second time.
  const asked = useRef(new Set<PopotoPeriod>());

  useEffect(() => {
    if (asked.current.has(period)) return;
    const supabase = createClient();
    if (!supabase) return;
    asked.current.add(period);
    board.load(supabase, periodStart(period)).then(
      (got) => setLists((had) => ({ ...had, [period]: rank(got, names) })),
      // Said out loud rather than drawn short. A board missing a page of rows
      // looks exactly like a quiet month, and nothing on it would say which.
      () => setFailed((had) => ({ ...had, [period]: true })));
  }, [board, names, period, attempt]);

  const retry = () => {
    asked.current.delete(period);
    setFailed((had) => ({ ...had, [period]: false }));
    setAttempt((n) => n + 1);
  };

  const rows = lists[period];
  const { label, none } = PERIODS.find((p) => p.key === period)!;

  return (
    <section style={{ borderTopColor: board.color }}
             className="overflow-hidden rounded-xl border border-line border-t-4 bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2.5 pt-3"
           style={{ background: `${board.color}22`,
                    borderBottom: `1px solid ${board.color}33` }}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg text-[19px]"
              style={{ background: `${board.color}33`,
                       border: `1px solid ${board.color}80` }}>
          {board.icon}
        </span>
        <span className="font-display text-[17.5px] font-bold"
              style={{ color: `color-mix(in srgb, ${board.color} 78%, #ffffff)` }}>
          {t(board.title)}
        </span>
        {/* Which span the numbers cover, on the board itself, for phones: there
            the switch is a whole board away from the second one. Side by side
            the switch sits right above both, and a chip here only pushed one
            header onto two lines, which put its rows out of step with the
            board beside it. */}
        <span className="rounded-full border border-line-strong px-2 font-data text-meta text-ink/85 md:hidden">
          {t(label)}
        </span>
        <span className="text-meta text-muted">{t(board.hint)}</span>
      </div>
      {rows ? (
        // Keyed by the period, so a different span arrives as a new panel with
        // the tab panel's short entrance rather than as numbers changing in
        // place, which is easy to miss.
        <div key={period} data-state="active" className="tab-in">
          {rows.length ? (
            <ol className="flex flex-col gap-1 px-4 pb-4 pt-3">
              {rows.map((r, i) => (
                <LeaderRow key={r.id} row={r} place={i + 1}
                           value={<>{board.icon} {popotoText(r.score)}</>}
                           title={board.unit(r.n)} />
              ))}
            </ol>
          ) : (
            // Early on the 1st this is every board, so it is a quiet moment
            // rather than a broken one: the potato is asleep, not missing.
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-read leading-relaxed text-muted">
              <PopotoIcon pose="sleep" size={40} />
              {t(none)}
            </div>
          )}
        </div>
      ) : failed[period] ? (
        <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center text-read text-muted">
          <p role="status">{t("lb.failed")}</p>
          <button type="button" onClick={retry}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-ui text-ink transition-colors hover:border-accent hover:text-accent">
            {t("lb.retry")}
          </button>
        </div>
      ) : (
        <Placeholder />
      )}
    </section>
  );
}

export default function PopotoBoards({ names }: { names: Names }) {
  const { t } = useLang();
  const [period, setPeriod] = useState<PopotoPeriod>("month");
  // Without a database there are no potatoes to count, and the achievement
  // boards stand on their own.
  if (!supabaseConfigured) return null;

  return (
    <>
      {/* One switch for both, across both columns. The two are read side by
          side, and this month of one beside all time of the other would be
          two different questions answered next to each other. */}
      <div role="group" aria-label={t("lb.period")}
           className="-mb-2 flex w-fit overflow-hidden rounded-lg border border-line-strong md:col-span-2">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
                  aria-pressed={period === p.key}
                  className={`px-3.5 py-2 text-read transition-colors ${
                    period === p.key ? "bg-accent/15 text-accent"
                                     : "text-muted hover:bg-card hover:text-ink"}`}>
            {t(p.label)}
          </button>
        ))}
      </div>
      {BOARDS.map((b) => (
        <OneBoard key={b.key} board={b} names={names} period={period} />
      ))}
    </>
  );
}
