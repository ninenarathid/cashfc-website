import type { Member } from "@/lib/types";

/**
 * Which boards exist and in what order, in one place.
 *
 * The leaderboards page and the summary on the front page have to agree about
 * this — two lists of the same rankings that disagree about which rankings
 * there are is the kind of thing nobody notices until somebody asks why their
 * name is on one and not the other.
 *
 * No oldtimer: it ranked people by how long ago they started, which is not
 * something anybody did.
 */
export const BUCKETS = ["crafter", "gatherer", "relic", "explorer", "treasure",
                        "goldsaucer", "seasonal", "pvp"];

export interface BucketRow {
  id: number;
  name: string;
  avatar: string | null;
  /** Share of everything rare in that playstyle, which is what the page ranks by. */
  share: number | null;
  n: number;
  score: number;
  tier?: string;
}

/** The leaders of one playstyle, best first. */
export function topOf(members: Member[], key: string, limit: number): BucketRow[] {
  return members
    .map((m) => {
      const b = (m.achv_buckets ?? {})[key];
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar ?? null,
        share: b?.share ?? null,
        n: b?.n ?? 0,
        score: b?.score ?? 0,
        tier: (m.achv_tiers ?? {})[key],
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.n - a.n)
    .slice(0, limit);
}
