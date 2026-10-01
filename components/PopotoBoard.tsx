"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { useLang, type Key } from "@/lib/i18n";
import LeaderRow from "@/components/LeaderRow";
import PopotoIcon from "@/components/ui/PopotoIcon";
import Skeleton from "@/components/ui/Skeleton";
import { periodStart, popotoText, type PopotoPeriod } from "@/lib/popoto";
import { TOP_N, galleryTotals, profileTotals, rank,
         type BoardRow, type FirstLook, type Names, type Totals } from "@/lib/popoto-board";

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
 *
 * The counting is in lib/popoto-board.ts, because the page asks it too while
 * it is built: that copy is what the boards show, out of focus, while they ask
 * for the numbers as they are now.
 */

const PERIODS: { key: PopotoPeriod; label: Key; none: Key }[] = [
  { key: "month", label: "lb.thisMonth", none: "lb.noneMonth" },
  { key: "year", label: "lb.thisYear", none: "lb.noneYear" },
  { key: "all", label: "lb.allTime", none: "lb.noneAll" },
];

interface Board {
  key: keyof FirstLook;
  color: string;
  icon: ReactNode;
  title: Key;
  hint: Key;
  /** What the bracketed number under the total means, for the tooltip. */
  unit: (n: number) => string;
  /** Everybody's total since `from`, or ever when it is null. */
  load: (supabase: SupabaseClient, from: string | null) => Promise<Totals>;
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
    load: profileTotals,
  },
  {
    key: "gallery",
    color: "#4fb8a8",
    icon: <PopotoIcon />,
    title: "lb.gallery",
    hint: "lb.galleryHint",
    unit: (n) => `across ${n} picture${n === 1 ? "" : "s"}`,
    load: galleryTotals,
  },
];

/** A place on a board with nobody in it yet, the size a LeaderRow will be. */
function SkeletonRow({ place }: { place: number }) {
  const top = place <= 3;
  return (
    <li aria-hidden className={`grid items-center gap-2 text-read ${
      top ? "grid-cols-[22px_78px_1fr_auto] py-2" : "grid-cols-[22px_1fr_auto]"}`}>
      <span className="text-right font-data text-meta text-muted/50">{place}</span>
      {top && <Skeleton rounded="rounded-full" className="size-[78px]" />}
      {/* A line of text tall, the height a name takes. */}
      <span className="flex h-[1.5em] items-center">
        <Skeleton className={top ? "h-4 w-32" : "h-3 w-28"} />
      </span>
      <Skeleton className="h-3 w-10" />
    </li>
  );
}

/**
 * Ten rows of nothing yet, drawn the size the ten rows will be, so the boards
 * below stay where they are when the numbers arrive. Only for when there is no
 * earlier copy of the board to show instead.
 */
function Placeholder() {
  return (
    <ol aria-hidden className="flex flex-col gap-1 px-4 pb-4 pt-3">
      {Array.from({ length: TOP_N }, (_, i) => <SkeletonRow key={i} place={i + 1} />)}
    </ol>
  );
}

/**
 * What the blur means, said over it.
 *
 * A board out of focus with nothing on it could be a board that broke; a
 * board out of focus with this on it is a board on its way. The ring stops
 * under reduced motion and the words stay, which is the part that says it.
 */
function Counting() {
  const { t } = useLang();
  return (
    <span role="status"
          className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-card/90 px-3.5 py-1.5 text-ui text-ink shadow-lg">
      <span aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
      {t("lb.counting")}
    </span>
  );
}

function OneBoard({ board, names, period, first }: {
  board: Board; names: Names; period: PopotoPeriod;
  /** This month as the page was built, if the build could read it. */
  first: BoardRow[] | null;
}) {
  const { t } = useLang();
  // Every period read so far, kept while the page is open. Going back to one
  // is the same question asked twice, and all time is forty pages of rows.
  const [lists, setLists] = useState<Partial<Record<PopotoPeriod, BoardRow[]>>>({});
  const [failed, setFailed] = useState<Partial<Record<PopotoPeriod, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  // Asked for and not back yet counts as asked, so pressing back and forth
  // while a period is on its way does not send for it a second time.
  const asked = useRef(new Set<PopotoPeriod>());
  // The board as it last stood: the build's copy until the live numbers land,
  // then whichever period was on screen last. It stays up, out of focus,
  // while the next numbers come, so a reload or a switch never empties the
  // board and fills it again — which read as the boards vanishing and coming
  // back after the rest of the page.
  const [behind, setBehind] = useState<{ period: PopotoPeriod; rows: BoardRow[] } | null>(
    first ? { period: "month", rows: first } : null);

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

  const rows = lists[period];
  useEffect(() => { if (rows) setBehind({ period, rows }); }, [period, rows]);

  const retry = () => {
    asked.current.delete(period);
    setFailed((had) => ({ ...had, [period]: false }));
    setAttempt((n) => n + 1);
  };

  const { label, none } = PERIODS.find((p) => p.key === period)!;
  const loading = !rows && !failed[period];
  // The same list either way, so the change from waiting to here is the blur
  // lifting off the rows already on screen rather than one list swapped for
  // another.
  const shown = rows?.length ? rows
    : loading && behind?.rows.length ? behind.rows : null;
  // Another period's rows stand in for this one's, so the board is made up to
  // a full ten while it waits: a month with three names in it is about to
  // become a year with ten, and growing now, as the press lands, is better
  // than pushing everything below down four seconds later.
  const pad = loading && behind && behind.period !== period
    ? TOP_N - behind.rows.length : 0;

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
      {shown ? (
        <div className="relative" aria-busy={loading}>
          {/* Out of focus and out of reach while it is the old copy: these
              numbers are about to change, and a name on them is not one to
              open yet. A small blur, lifted in 200ms; under reduced motion it
              simply goes. */}
          <ol inert={loading}
              className={`flex flex-col gap-1 px-4 pb-4 pt-3 transition-[filter,opacity] duration-200 ease-[var(--ease-settle)] ${
                loading ? "opacity-55 blur-[3px]" : ""}`}>
            {/* Keyed by place, not by person. When the numbers land the
                places stay put and who is in them changes; keyed by person,
                somebody who was first this month and fifth all year was a row
                moved four places down, and the browser counted that as the
                page jumping. */}
            {shown.map((r, i) => (
              <LeaderRow key={i} row={r} place={i + 1}
                         value={<>{board.icon} {popotoText(r.score)}</>}
                         title={board.unit(r.n)} />
            ))}
            {Array.from({ length: Math.max(0, pad) }, (_, i) => (
              <SkeletonRow key={`wait-${i}`} place={shown.length + i + 1} />
            ))}
          </ol>
          {loading && <Counting />}
        </div>
      ) : rows ? (
        // Early on the 1st this is every board, so it is a quiet moment
        // rather than a broken one: the potato is asleep, not missing.
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-read leading-relaxed text-muted">
          <PopotoIcon pose="sleep" size={40} />
          {t(none)}
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
        <div className="relative" aria-busy>
          <Placeholder />
          <Counting />
        </div>
      )}
    </section>
  );
}

export default function PopotoBoards({ names, first = null }: {
  names: Names;
  /** This month's boards as the page was built, shown while the live ones load. */
  first?: FirstLook | null;
}) {
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
        <OneBoard key={b.key} board={b} names={names} period={period}
                  first={first?.[b.key] ?? null} />
      ))}
    </>
  );
}
