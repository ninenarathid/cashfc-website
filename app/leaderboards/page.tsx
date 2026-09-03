import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { isOnVacation } from "@/lib/types";
import { BUCKETS, topOf } from "@/lib/leaderboards";
// Straight from lib/tags, not through MemberTags. That file is "use client",
// and a server component importing data through it gets a client reference
// rather than the object — every colour came out undefined and every label fell
// back to the raw key, which the capitalize class then dressed up convincingly
// enough that eight grey boxes looked like a styling choice.
import { TAG_COLOR, TAG_LABELS } from "@/lib/tags";
import TagIcon from "@/components/TagIcon";
import LeaderboardIntro from "@/components/LeaderboardIntro";
import LeaderRow from "@/components/LeaderRow";
import LbTopTen from "@/components/LbTopTen";
import PopotoBoards from "@/components/PopotoBoard";
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

export default function LeaderboardsPage() {
  const data = raw as unknown as BoardData;

  const boards = BUCKETS
    .map((key) => ({ key, rows: topOf(data.members, key, TOP_N) }))
    .filter((b) => b.rows.length > 0);

  // Who is away, by id, so a row built from the shared ranking function does
  // not have to carry a whole Member around to say so.
  const vacationers = new Set(data.members.filter(isOnVacation).map((m) => m.id));

  // Names and faces for the potato board, which knows character ids and nothing
  // else — it reads likes from the database and the roster lives in this file.
  // Guests are not on the roster, so a potato of theirs used to be credited to
  // a bare character id. They have a name too.
  const who: Record<number, { name: string; avatar: string | null }> = {
    ...Object.fromEntries(allGuestIds().map((id) => {
      const g = guestHome(id);
      return [id, { name: g?.name ?? `#${id}`, avatar: g?.portrait ?? null }];
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
          {/* First, because these two are what the FC awards rather than what
              the game does. */}
          <PopotoBoards names={who} />

          {boards.map(({ key, rows }) => (
            // Each board wears its own colour, on the edge and under the
            // heading. Eight cards of identical grey is a page you have to read
            // to navigate; a colour down the side is one you can scroll to.
            <section key={key}
                     style={{ borderTopColor: TAG_COLOR[key] ?? undefined }}
                     className="overflow-hidden rounded-xl border border-line border-t-4 bg-surface">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-2.5 pt-3"
                   style={{ background: `${TAG_COLOR[key] ?? "#8b97a8"}22`,
                            borderBottom: `1px solid ${TAG_COLOR[key] ?? "#8b97a8"}33` }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${TAG_COLOR[key] ?? "#8b97a8"}33`,
                               border: `1px solid ${TAG_COLOR[key] ?? "#8b97a8"}80` }}>
                  <TagIcon tag={key} size={22} />
                </span>
                {/* Lifted towards white so the muted ones — crafter's brown,
                    pvp's slate — still read as a heading rather than as
                    something greyed out. */}
                <span className="font-display text-[17.5px] font-bold"
                      style={{ color: `color-mix(in srgb, ${
                        TAG_COLOR[key] ?? "#8b97a8"} 78%, #ffffff)` }}>
                  {TAG_LABELS[key] ?? key}
                </span>
                {/* What this list is, not what the badge means. The tag help
                    says "top 30% of the FC", which is the rule for wearing the
                    badge and reads as a contradiction beside a list of ten. */}
                <LbTopTen />
              </div>
              <ol className="flex flex-col gap-1 px-4 pb-4 pt-3">
                {rows.map((r, i) => (
                  <LeaderRow key={r.id} place={i + 1}
                             row={{
                               id: r.id, name: r.name, avatar: r.avatar,
                               score: r.score, n: r.n, tier: r.tier,
                               note: vacationers.has(r.id) ? "on vacation" : undefined,
                               noteTone: "muted",
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
