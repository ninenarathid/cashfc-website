import Link from "next/link";
import raw from "@/data/members.json";
import type { BoardData, Member } from "@/lib/types";
import { ACHV_TIER_LABEL, isOnVacation } from "@/lib/types";
import { TAG_CLASS, TAG_HELP, TAG_LABELS } from "@/components/MemberTags";
import TagIcon from "@/components/TagIcon";

export const metadata = { title: "Leaderboards — Cafe And SHabu" };

const TOP_N = 20;

// Same order and keys the pipeline uses for its playstyle buckets.
const BOARDS = ["crafter", "gatherer", "relic", "explorer", "treasure",
                "goldsaucer", "seasonal", "pvp", "oldtimer"];

interface Row { m: Member; score: number; n: number; share?: number | null; tier?: string }

export default function LeaderboardsPage() {
  const data = raw as unknown as BoardData;

  const boards = BOARDS.map((key) => {
    const rows: Row[] = data.members
      .map((m) => {
        const b = (m.achv_buckets ?? {})[key];
        return {
          m,
          score: b?.score ?? 0,
          share: b?.share ?? null,
          n: b?.n ?? 0,
          tier: (m.achv_tiers ?? {})[key],
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.n - a.n)
      .slice(0, TOP_N);
    return { key, rows };
  }).filter((b) => b.rows.length > 0);

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
        Leaderboards
      </div>
      <h1 className="font-display text-3xl font-bold">Who does what best</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Ranked by rare achievements, where each one is worth as much as it is rare:{" "}
        <b className="text-ink">10 ÷ % of players who own it</b>. Something 10% of
        players have scores 1 point, 1% scores 10, and 0.2% scores 50 — holding more
        of them still adds up, but one genuinely hard achievement outweighs a pile of
        easy ones. The percentage is how much of everything rare in that playstyle
        somebody holds, and it is what earns the Legendary, Master and Expert titles.
        Only members with public achievements can appear here.
      </p>

      {boards.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] leading-relaxed text-muted">
          Nothing to rank yet. Scores appear once the pipeline has read achievements
          from FFXIV Collect for members who keep them public.
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {boards.map(({ key, rows }) => (
            <section key={key} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] font-medium ${
                  TAG_CLASS[key] ?? "border-line text-muted"}`}>
                  <TagIcon tag={key} size={14} />
                  {TAG_LABELS[key] ?? key}
                </span>
                <span className="text-[11.5px] text-muted">{TAG_HELP[key]}</span>
              </div>
              <ol className="mt-3 flex flex-col gap-1">
                {rows.map((r, i) => (
                  <li key={r.m.id}
                      className="grid grid-cols-[22px_1fr_auto] items-baseline gap-2 text-[13px]">
                    <span className="text-right font-data text-[11.5px] text-muted">
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate">
                      <Link href={`/member/${r.m.id}`}
                            className="font-data text-ink no-underline hover:text-amber">
                        {r.m.name}
                      </Link>
                      {r.tier && (
                        <span className="ml-1.5 text-[11px] text-amber">
                          {ACHV_TIER_LABEL[r.tier]}
                        </span>
                      )}
                      {isOnVacation(r.m) && (
                        <span className="ml-1.5 text-[11px] text-muted/70">
                          on vacation
                        </span>
                      )}
                    </span>
                    <span className="text-right font-data text-[12px] text-muted"
                          title={`${r.n} rare achievements · ${r.score.toFixed(1)} points`}>
                      {/* Always the share, never the raw score: the two are on
                          different scales and a column that silently switches
                          between them ranks nothing. */}
                      {r.share != null ? `${(r.share * 100).toFixed(1)}%` : "—"}
                      <small className="ml-1 opacity-60">({r.n})</small>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
