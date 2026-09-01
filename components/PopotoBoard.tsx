"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import LeaderRow, { type Leader } from "@/components/LeaderRow";

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
 */

const TOP_N = 10;

/** Who received how many, and from how many distinct places. */
type Totals = Map<number, { score: number; n: number }>;

interface Board {
  key: string;
  color: string;
  icon: string;
  title: Key;
  hint: Key;
  /** What the bracketed number under the total means, for the tooltip. */
  unit: (n: number) => string;
  load: (supabase: NonNullable<ReturnType<typeof createClient>>) => Promise<Totals>;
}

const BOARDS: Board[] = [
  {
    key: "profile",
    // The site's gold, which is already the potato's colour everywhere else.
    color: "#e5cc80",
    icon: "🥔",
    title: "lb.popoto",
    hint: "lb.popotoHint",
    unit: (n) => `from ${n} member${n === 1 ? "" : "s"}`,
    // One row per sender per person per day, which the table enforces, so
    // counting rows counts potatoes and counting senders counts people.
    load: async (supabase) => {
      const { data } = await supabase.from("kudos")
        .select("receiver_character_id, sender_id");
      const out: Totals = new Map();
      const senders = new Map<number, Set<string>>();
      for (const k of (data ?? []) as
           { receiver_character_id: number; sender_id: string }[]) {
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
    icon: "🥔",
    title: "lb.gallery",
    hint: "lb.galleryHint",
    unit: (n) => `across ${n} picture${n === 1 ? "" : "s"}`,
    // Counted against the character a post belongs to rather than whoever
    // uploaded it, because that is who a picture is credited to everywhere else
    // — an admin posting on somebody's behalf should not collect their potatoes.
    load: async (supabase) => {
      const { data } = await supabase.from("gallery_posts")
        .select("character_id, like_count").not("character_id", "is", null);
      const out: Totals = new Map();
      for (const p of (data ?? []) as
           { character_id: number; like_count: number | null }[]) {
        const likes = p.like_count ?? 0;
        if (likes <= 0) continue;
        const at = out.get(p.character_id) ?? { score: 0, n: 0 };
        at.score += likes;
        at.n += 1;
        out.set(p.character_id, at);
      }
      return out;
    },
  },
];

export type Names = Record<number, { name: string; avatar: string | null }>;

function OneBoard({ board, names }: { board: Board; names: Names }) {
  const { t } = useLang();
  const [rows, setRows] = useState<Leader[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const got = await board.load(supabase);
      setRows([...got.entries()]
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
        .slice(0, TOP_N));
    })();
  }, [board, names]);

  // Nothing at all until it has something to say. An empty box on a page of
  // full ones reads as broken rather than as new.
  if (!rows?.length) return null;

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
        <span className="text-[11.5px] text-muted">{t(board.hint)}</span>
      </div>
      <ol className="flex flex-col gap-1 px-4 pb-4 pt-3">
        {rows.map((r, i) => (
          <LeaderRow key={r.id} row={r} place={i + 1}
                     value={`${board.icon} ${r.score}`}
                     title={board.unit(r.n)} />
        ))}
      </ol>
    </section>
  );
}

export default function PopotoBoards({ names }: { names: Names }) {
  return (
    <>
      {BOARDS.map((b) => <OneBoard key={b.key} board={b} names={names} />)}
    </>
  );
}
