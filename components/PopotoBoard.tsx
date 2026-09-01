"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import LeaderRow, { type Leader } from "@/components/LeaderRow";

/**
 * Every potato the FC has handed somebody, from both places it can come from.
 *
 * There are two, and they are separate all the way down: Send popoto on a
 * profile writes a row in `kudos`, and a potato on a screenshot writes a row in
 * `gallery_likes`. Neither table knows the other exists, so the count on a
 * member's profile has never included their pictures and never will — which is
 * exactly why they are added together here rather than one of them being taken
 * as the total.
 *
 * One board because they are the same gesture twice: somebody in this FC saw
 * something and said so. Splitting them ranks two things at once and makes a
 * reader work out which column they care about. If it ever becomes interesting
 * to know who is liked and who takes good screenshots, the loaders below are
 * already separate and the split is a small change.
 *
 * Not earned in game, which makes it the only ranking on this page nobody can
 * grind alone.
 */

const TOP_N = 10;
/** The site's gold, which is already the potato's colour everywhere else. */
const GOLD = "#e5cc80";

/** Who received how many, from one source. */
type Totals = Map<number, number>;

const add = (m: Totals, id: number, n: number) => m.set(id, (m.get(id) ?? 0) + n);

/**
 * Potatoes on a profile. One row per sender per person per day, which the table
 * enforces, so counting rows counts potatoes.
 */
async function fromProfiles(
  supabase: NonNullable<ReturnType<typeof createClient>>,
): Promise<Totals> {
  const { data } = await supabase.from("kudos").select("receiver_character_id");
  const out: Totals = new Map();
  for (const k of (data ?? []) as { receiver_character_id: number }[]) {
    add(out, k.receiver_character_id, 1);
  }
  return out;
}

/**
 * Potatoes on pictures, counted against the character a post belongs to rather
 * than whoever uploaded it — that is who a picture is credited to everywhere
 * else, and an admin posting on somebody's behalf should not collect theirs.
 */
async function fromPictures(
  supabase: NonNullable<ReturnType<typeof createClient>>,
): Promise<Totals> {
  const { data } = await supabase.from("gallery_posts")
    .select("character_id, like_count").not("character_id", "is", null);
  const out: Totals = new Map();
  for (const p of (data ?? []) as
       { character_id: number; like_count: number | null }[]) {
    if ((p.like_count ?? 0) > 0) add(out, p.character_id, p.like_count!);
  }
  return out;
}

export type Names = Record<number, { name: string; avatar: string | null }>;

export default function PopotoBoard({ names }: { names: Names }) {
  const { t } = useLang();
  const [rows, setRows] = useState<(Leader & { parts: string })[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const [profile, pictures] = await Promise.all([
        fromProfiles(supabase), fromPictures(supabase),
      ]);
      const everyone = new Set([...profile.keys(), ...pictures.keys()]);
      setRows([...everyone]
        .map((id) => {
          const a = profile.get(id) ?? 0;
          const b = pictures.get(id) ?? 0;
          return {
            id,
            name: names[id]?.name ?? `#${id}`,
            avatar: names[id]?.avatar ?? null,
            score: a + b,
            n: a,
            // Where they came from, on hover. Two sources adding to one number
            // is a thing worth being able to check.
            parts: `${a} on their profile · ${b} on pictures`,
          };
        })
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
                     value={`🥔 ${r.score}`} title={r.parts} />
        ))}
      </ol>
    </section>
  );
}
