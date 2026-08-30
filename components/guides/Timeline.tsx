"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLang } from "@/lib/i18n";
import {
  TAG_COLOR, TAG_LABEL, clock, cueSpan, say,
  type Beat, type MechTag,
} from "@/lib/guides/types";

/**
 * The whole fight as one line, left to right, drawn to scale.
 *
 * To scale is the whole idea. A list of casts tells you the order; a ruler
 * tells you the shape — that phase one is a long quiet opener and then four
 * cleaves in fifty seconds, that Aetherletting occupies half a minute on its
 * own, that the two Ultrasonics land back to back. Those are the facts a raid
 * plans cooldowns around, and no amount of ordering conveys them.
 *
 * Anything that lasts is a bar rather than two entries called Start and End.
 * The middle of a mechanic is where the mechanic actually is, and a sheet that
 * splits it in two is describing the edges of the thing instead of the thing.
 *
 * Every cue points at a skill that is explained once, so the second raidwide
 * opens the page you already read. A timeline shows how often something
 * happens; it should not multiply what you have to learn by the same number.
 */

/** Pixels per second of fight. The one number that sets how long the line is. */
const PPS = 7;
/** One row of chips. */
const LANE = 26;
/** Room above the lanes for the ruler and the phase names. */
const HEAD = 30;
/** Clear space between two chips in the same lane. */
const GAP = 5;
/** Roughly how wide a character is at the chip's font size. */
const CH = 5.4;

interface Laid {
  i: number;
  beat: Beat;
  left: number;
  width: number;
  lane: number;
  span: boolean;
  color: string;
}

export default function Timeline(
  { beats, at, onPick }: {
    beats: Beat[];
    /** Index into `beats` — which occurrence is being read. */
    at: number;
    onPick: (i: number) => void;
  },
) {
  const { lang } = useLang();
  const scroller = useRef<HTMLDivElement | null>(null);
  const here = useRef<HTMLButtonElement | null>(null);

  const { laid, lanes, t0, t1, phases } = useMemo(() => {
    const spans = beats.map((b) => cueSpan(b.cue));
    const t0 = Math.min(...spans.map((s) => s.from), 0);
    const t1 = Math.max(...spans.map((s) => s.to), t0 + 1);

    // Greedy lane packing. A chip needs room for its name whatever its
    // duration, so an instant cast still reserves a label's width and two
    // things a second apart end up stacked rather than printed on top of
    // each other.
    const ends: number[] = [];
    const laid: Laid[] = beats.map((b, i) => {
      const s = spans[i];
      const left = (s.from - t0) * PPS;
      const label = b.mech.name.length * CH + 20;
      const width = Math.max(label, (s.to - s.from) * PPS);
      let lane = ends.findIndex((e) => e <= left - GAP);
      if (lane < 0) lane = ends.length;
      ends[lane] = left + width;
      return {
        i, beat: b, left, width, lane,
        span: s.to > s.from,
        color: TAG_COLOR[(b.mech.tags?.[0] ?? "raid") as MechTag],
      };
    });

    // Where each phase begins on the line, for the dividers.
    const phases: { id: string; name: string; left: number }[] = [];
    beats.forEach((b, i) => {
      if (phases.some((p) => p.id === b.phase.id)) return;
      phases.push({
        id: b.phase.id,
        name: say(b.phase.name, lang),
        left: (spans[i].from - t0) * PPS,
      });
    });

    return { laid, lanes: Math.max(ends.length, 1), t0, t1, phases };
  }, [beats, lang]);

  // Walking the fight with the Next button should not leave the timeline
  // behind: the strip is how somebody keeps their place in a ten-minute fight.
  useEffect(() => {
    here.current?.scrollIntoView({ behavior: "smooth", block: "nearest",
                                   inline: "center" });
  }, [at]);

  const width = (t1 - t0) * PPS + 40;
  const height = HEAD + lanes * LANE + 4;

  // A tick every half minute, on the half minute, so the labels read like a
  // stopwatch rather than like an offset from whenever the log started.
  const ticks: number[] = [];
  for (let s = Math.ceil(t0 / 30) * 30; s <= t1; s += 30) ticks.push(s);

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={scroller}
           className="overflow-x-auto rounded-xl border border-line bg-surface p-2.5">
        <div className="relative" style={{ width, height }}>
          {/* ── The ruler ── */}
          <div className="absolute left-0 top-[22px] h-px w-full bg-line" />
          {ticks.map((s) => (
            <div key={s} className="absolute top-[14px]"
                 style={{ left: (s - t0) * PPS }}>
              <div className="h-2 w-px bg-line" />
              <div className="absolute -top-[13px] -translate-x-1/2 font-data text-[10px] text-muted">
                {clock(s)}
              </div>
            </div>
          ))}

          {/* ── Where the phases change ── */}
          {phases.map((p, n) => (
            <div key={p.id} className="absolute bottom-0 top-0"
                 style={{ left: p.left - 6 }}>
              {n > 0 && (
                <div className="absolute bottom-0 top-[22px] w-px bg-accent/35" />
              )}
              <div className="absolute top-0 whitespace-nowrap pl-1 font-data text-[10px] uppercase tracking-[0.14em] text-accent">
                {p.name}
              </div>
            </div>
          ))}

          {/* ── Everything that happens ── */}
          {laid.map((l) => {
            const on = l.i === at;
            return (
              <button key={l.i} ref={on ? here : undefined}
                      onClick={() => onPick(l.i)} aria-current={on}
                      title={`${l.beat.mech.name} · ${l.beat.cue.at}`}
                      className="absolute flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-1.5 text-left text-[11px] transition-colors"
                      style={{
                        left: l.left,
                        width: l.width,
                        top: HEAD + l.lane * LANE,
                        height: LANE - 5,
                        borderColor: on ? l.color : `${l.color}66`,
                        background: on ? `${l.color}30` : `${l.color}12`,
                        color: on ? l.color : undefined,
                        // Two lines' worth of emphasis on the one being read,
                        // because it has to be findable in a strip four
                        // thousand pixels long.
                        boxShadow: on ? `0 0 0 1px ${l.color}` : undefined,
                      }}>
                {/* A bar means it lasts; a dot means it is a moment. */}
                <span className="shrink-0 rounded-full"
                      style={{
                        background: l.color,
                        width: l.span ? 3 : 5,
                        height: l.span ? LANE - 11 : 5,
                      }} />
                <span className={on ? "" : "text-ink/85"}>{l.beat.mech.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The six colours, said once. A legend is cheaper than making somebody
          click every chip to learn what green means. */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(TAG_LABEL) as MechTag[]).map((t) => (
          <span key={t} className="flex items-center gap-1 text-[10.5px] text-muted">
            <span className="h-2 w-2 rounded-full"
                  style={{ background: TAG_COLOR[t] }} />
            {TAG_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
