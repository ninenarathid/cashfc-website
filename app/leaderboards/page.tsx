import raw from "@/data/members.json";
import type { BoardData, Member } from "@/lib/types";
import { ACHV_TIER_LABEL, isOnVacation } from "@/lib/types";
import { TAG_CLASS, TAG_LABELS } from "@/components/MemberTags";
import TagIcon from "@/components/TagIcon";
import LeaderboardIntro from "@/components/LeaderboardIntro";
import LeaderRow from "@/components/LeaderRow";
import LbTopTen from "@/components/LbTopTen";
import PopotoBoard from "@/components/PopotoBoard";
import { allGuestIds, guestHome } from "@/lib/guest-data";

export const metadata = { title: "Leaderboards — Cafe And SHabu" };

/**
 * Ten, not twenty.
 *
 * A leaderboard is read to find out who is at the top, and a second screenful
 * of it answers a question nobody asked. Everybody's own standing is on their
 * member page either way.
 */
const TOP_N = 10;

/**
 * The playstyle buckets, in the pipeline's own order.
 *
 * No oldtimer: it ranked people by how long ago they started, which is not
 * something anybody did.
 */
const BOARDS = ["crafter", "gatherer", "relic", "explorer", "treasure",
                "goldsaucer", "seasonal", "pvp"];

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

  // Names and faces for the potato board, which knows character ids and nothing
  // else — it reads likes from the database and the roster lives in this file.
  // Guests are not on the roster, so a potato of theirs used to be credited to
  // a bare character id. They have a name too.
  const who: Record<number, { name: string; avatar: string | null }> = {
    ...Object.fromEntries(allGuestIds().map((id) => {
      const g = guestHome(id);
      return [id, { name: g?.name ?? `#${id}`, avatar: null }];
    })),
    ...Object.fromEntries(data.members.map((m) =>
      [m.id, { name: m.name, avatar: m.avatar ?? null }])),
  };

  return (
    <main className="pt-7">
      <LeaderboardIntro />

      {boards.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-10 text-center text-[13.5px] leading-relaxed text-muted">
          Nothing to rank yet. Scores appear once the pipeline has read achievements
          from FFXIV Collect for members who keep them public.
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {/* First, because it is the one board on this page that the FC awards
              rather than the game. */}
          <PopotoBoard names={who} />

          {boards.map(({ key, rows }) => (
            <section key={key} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] font-medium ${
                  TAG_CLASS[key] ?? "border-line text-muted"}`}>
                  <TagIcon tag={key} size={14} />
                  {TAG_LABELS[key] ?? key}
                </span>
                {/* What this list is, not what the badge means. The tag help
                    says "top 30% of the FC", which is the rule for wearing the
                    badge and reads as a contradiction beside a list of ten. */}
                <LbTopTen />
              </div>
              <ol className="mt-3 flex flex-col gap-1">
                {rows.map((r, i) => (
                  <LeaderRow key={r.m.id} place={i + 1}
                             row={{
                               id: r.m.id, name: r.m.name, avatar: r.m.avatar ?? null,
                               score: r.score, n: r.n,
                               note: r.tier ? ACHV_TIER_LABEL[r.tier]
                                 : isOnVacation(r.m) ? "on vacation" : undefined,
                               noteTone: r.tier ? "accent" : "muted",
                             }}
                             // Always the share, never the raw score: the two are
                             // on different scales and a column that silently
                             // switches between them ranks nothing.
                             value={r.share != null ? `${(r.share * 100).toFixed(1)}%` : "—"}
                             sub={String(r.n)}
                             title={`${r.n} rare achievements · ${r.score.toFixed(1)} points`} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
