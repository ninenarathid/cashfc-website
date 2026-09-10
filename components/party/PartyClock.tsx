"use client";

import { useEffect, useMemo, useState } from "react";
import type { Party, PartyStatus } from "@/lib/party";
import {
  STATUS_COLOR, endsAt, partyStatus, spanTo, tickMs,
} from "@/lib/party";
import { useLang, type Key } from "@/lib/i18n";

/**
 * The clock, for a board whose whole subject is when things happen.
 *
 * A listing that says 20:00 has told you the time and not answered the
 * question, which is always "is that soon". People do that arithmetic in their
 * heads badly, especially across a day boundary, and a party that reads
 * "tomorrow 20:00" on a Tuesday night is one nobody quite registers is nine
 * hours away.
 */

/**
 * One clock for the whole board.
 *
 * A ticker per row would be thirty intervals firing out of step, and thirty
 * separate re-renders a second on a page where every row wants the same number.
 * So the board holds the time and hands it down, and the rows are ordinary
 * functions of it.
 *
 * The rate follows the nearest thing that is actually about to happen: seconds
 * while something is within the hour, a minute otherwise. Redrawing the board
 * once a second so that "in 3 days" can go on saying "in 3 days" is a fan
 * spinning for nothing.
 */
export function useNow(parties: Party[]): number {
  const [now, setNow] = useState(() => Date.now());

  // Distance to the next thing that changes anything: a start, or an end.
  // Recomputed as the board changes rather than as it ticks, which is why this
  // depends on the list and not on `now`.
  const nearest = useMemo(() => {
    let best = Infinity;
    const at = Date.now();
    for (const p of parties) {
      best = Math.min(best,
        Math.abs(new Date(p.startsAt).getTime() - at),
        Math.abs(new Date(endsAt(p)).getTime() - at));
    }
    return best;
  }, [parties]);

  useEffect(() => {
    const every = tickMs(nearest);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [nearest]);

  return now;
}

const STATUS_KEY: Record<PartyStatus, Key> = {
  upcoming: "party.stUpcoming",
  soon: "party.stSoon",
  live: "party.stLive",
  justEnded: "party.stJustEnded",
  done: "party.stDone",
};

export const statusLabel = (
  st: PartyStatus, t: (k: Key) => string,
): string => t(STATUS_KEY[st]);

/** Which of the five it is, in a word and a colour. */
export function StatusPill(
  { status, size = "sm" }: { status: PartyStatus; size?: "sm" | "xs" },
) {
  const { t } = useLang();
  const c = STATUS_COLOR[status];
  return (
    <span style={{ color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
                   background: `color-mix(in srgb, ${c} 12%, transparent)` }}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-data uppercase tracking-[0.1em] ${
            size === "xs" ? "px-1.5 py-[1px] text-[9.5px]" : "px-2 py-[2px] text-[10px]"}`}>
      {/* A dot that beats while it is running, and sits still otherwise. The
          only animation on the board, spent on the one state where "right now"
          is the whole of the message. */}
      <span style={{ background: c }}
            className={`size-1.5 rounded-full ${status === "live" ? "animate-pulse" : ""}`} />
      {statusLabel(status, t)}
    </span>
  );
}

/**
 * How long is left, in words, ticking.
 *
 * Two parts at most and never more precise than it is useful: days and hours
 * far out, hours and minutes within a day, minutes and seconds within the hour.
 * A countdown reading "2 days 4 hours 17 minutes 3 seconds" makes the reader
 * work to find the part they wanted.
 *
 * One dictionary line per shape rather than a number with a unit stuck on the
 * end, because Thai does not append units the way English does: "3 วัน 1 ชม."
 * and "3d 1h" are the same fact with the spacing and the words in different
 * places, and neither should be assembled out of fragments by whichever
 * component happened to need one.
 */
export function spanSay(
  at: string, now: number,
  t: (k: Key, vars?: Record<string, string | number>) => string,
): string {
  const s = spanTo(at, now);
  return s.days ? t("party.leftDH", { d: s.days, h: s.hours })
    : s.hours ? t("party.leftHM", { h: s.hours, m: s.minutes })
      : s.minutes
        ? t("party.leftMS", { m: s.minutes, s: String(s.seconds).padStart(2, "0") })
        : t("party.leftS", { s: s.seconds });
}

export function Countdown(
  { at, now, className = "" }: { at: string; now: number; className?: string },
) {
  const { t } = useLang();
  return <span className={`tabular-nums ${className}`}>{spanSay(at, now, t)}</span>;
}

/**
 * The whole sentence: what is about to happen, and how long until it does.
 *
 * Which end of the party it counts to depends on where the party is in itself.
 * Before it starts, the number people want is the wait; once it is running, the
 * number they want is how much of it is left; afterwards, how long ago it
 * finished, which is what decides whether it is worth asking how it went.
 */
export function WhenLine(
  { party, now, className = "" }:
  { party: Party; now: number; className?: string },
) {
  const { t } = useLang();
  const st = partyStatus(party, now);
  if (st === "done") return null;
  const to = st === "upcoming" || st === "soon" ? party.startsAt : endsAt(party);
  const left = spanSay(to, now, t);
  const key: Key = st === "justEnded" ? "party.endedAgo"
    : st === "live" ? "party.endsIn" : "party.startsIn";
  return (
    <span className={`tabular-nums ${className}`}>{t(key, { left })}</span>
  );
}
