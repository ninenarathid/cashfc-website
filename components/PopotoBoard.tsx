"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import LeaderRow, { type Leader } from "@/components/LeaderRow";

/**
 * Who the FC has handed the most potatoes to.
 *
 * The only board here not built from achievements: the others measure what
 * somebody collected on their own, and this one measures what the rest of the
 * FC thought of their screenshots. It is the one ranking on the page that
 * nobody can grind.
 *
 * Counted against the character a post belongs to rather than whoever uploaded
 * it, because that is the person a picture is credited to everywhere else on
 * the site — an admin posting on somebody's behalf should not collect their
 * potatoes.
 *
 * Client-side because likes live in the database and this page is otherwise
 * built at deploy time. A board of "as of the last deploy" would be wrong
 * within a day and quietly stay wrong.
 */
const TOP_N = 10;

/** The site's gold, which is already the potato's colour everywhere else. */
const GOLD = "#e5cc80";

export default function PopotoBoard(
  { names }: { names: Record<number, { name: string; avatar: string | null }> },
) {
  const { t } = useLang();
  const [rows, setRows] = useState<Leader[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      // Whatever the reader is allowed to see: a hidden post is not in this
      // result, so its potatoes do not count towards anybody's total either.
      const { data } = await supabase.from("gallery_posts")
        .select("character_id, like_count")
        .not("character_id", "is", null);

      const total = new Map<number, { score: number; n: number }>();
      for (const p of (data ?? []) as
           { character_id: number; like_count: number | null }[]) {
        const likes = p.like_count ?? 0;
        if (likes <= 0) continue;
        const at = total.get(p.character_id) ?? { score: 0, n: 0 };
        at.score += likes;
        // How many pictures earned any, which is what separates one lucky
        // screenshot from somebody the FC keeps coming back to.
        at.n += 1;
        total.set(p.character_id, at);
      }

      setRows([...total.entries()]
        .map(([id, v]) => ({
          id,
          name: names[id]?.name ?? `#${id}`,
          avatar: names[id]?.avatar ?? null,
          score: v.score,
          n: v.n,
        }))
        // Nobody on zero, so a quiet week is an empty board rather than a
        // ranking of people who have never been given one.
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
                     title={`${r.score} across ${r.n} picture${r.n === 1 ? "" : "s"}`} />
        ))}
      </ol>
    </section>
  );
}

export { TOP_N as POPOTO_TOP_N };
