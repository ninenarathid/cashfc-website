"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import LeaderRow, { type Leader } from "@/components/LeaderRow";

/**
 * Potatoes given on a member's profile.
 *
 * The Send popoto button, and only that. A potato on a screenshot is a
 * different thing kept in a different table — it says something about the
 * picture rather than about the person — and adding the two produced a number
 * that matched nothing anybody could see anywhere else on the site. This one
 * agrees with the count on their own profile page, which is the number they
 * will check it against.
 *
 * Not earned in game, which makes it the only ranking on this page nobody can
 * grind alone: every potato here came from another member.
 */

const TOP_N = 10;
/** The site's gold, which is already the potato's colour everywhere else. */
const GOLD = "#e5cc80";

export type Names = Record<number, { name: string; avatar: string | null }>;

export default function PopotoBoard({ names }: { names: Names }) {
  const { t } = useLang();
  const [rows, setRows] = useState<Leader[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      // One row per sender per person per day, which the table enforces, so
      // counting rows counts potatoes and counting senders counts people.
      const { data } = await supabase.from("kudos")
        .select("receiver_character_id, sender_id");

      const got = new Map<number, { score: number; senders: Set<string> }>();
      for (const k of (data ?? []) as
           { receiver_character_id: number; sender_id: string }[]) {
        const at = got.get(k.receiver_character_id)
          ?? { score: 0, senders: new Set<string>() };
        at.score += 1;
        at.senders.add(k.sender_id);
        got.set(k.receiver_character_id, at);
      }

      setRows([...got.entries()]
        .map(([id, v]) => ({
          id,
          name: names[id]?.name ?? `#${id}`,
          avatar: names[id]?.avatar ?? null,
          score: v.score,
          n: v.senders.size,
        }))
        // Nobody on zero, so a quiet month is an empty board rather than a
        // ranking of people nobody has given one to.
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || b.n - a.n)
        .slice(0, TOP_N));
    })();
  }, [names]);

  // Nothing at all until it has something to say. An empty box on a page of
  // full ones reads as broken rather than as new.
  if (!rows?.length) return null;

  return (
    <section style={{ borderTopColor: GOLD }}
             className="overflow-hidden rounded-xl border border-line border-t-[3px] bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2.5 pt-3"
           style={{ background: `${GOLD}14` }}>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[17px]"
              style={{ background: `${GOLD}26`, border: `1px solid ${GOLD}59` }}>
          🥔
        </span>
        <span className="font-display text-[17px] font-semibold" style={{ color: GOLD }}>
          {t("lb.popoto")}
        </span>
        <span className="text-[11.5px] text-muted">{t("lb.popotoHint")}</span>
      </div>
      <ol className="flex flex-col gap-1 px-4 pb-4 pt-3">
        {rows.map((r, i) => (
          <LeaderRow key={r.id} row={r} place={i + 1}
                     value={`🥔 ${r.score}`}
                     title={`from ${r.n} member${r.n === 1 ? "" : "s"}`} />
        ))}
      </ol>
    </section>
  );
}
