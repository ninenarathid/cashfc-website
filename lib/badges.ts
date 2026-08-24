import type { Member, MemberRaids } from "@/lib/types";

export interface Badge { icon: string; name: string; desc: string }

export interface FcAgg {
  mountsTop10: number;   // lowest mount count still inside the FC top 10
  rareTop10: number;     // lowest rare-achievement count still inside the FC top 10
}

/** Automatic restaurant-themed badges — tweak the thresholds here. */
export function computeBadges(
  m: Member, raids: MemberRaids | null, agg: FcAgg, claimed: boolean,
): Badge[] {
  const out: Badge[] = [];

  const currentBest = Math.max(
    -1, ...(raids?.current?.encounters ?? []).map((e) => e.best ?? -1));
  if (currentBest >= 99)
    out.push({ icon: "⭐⭐⭐", name: "Three Michelin Stars",
               desc: `parse ${currentBest} in the current tier` });
  else if (currentBest >= 95)
    out.push({ icon: "⭐⭐", name: "Two Michelin Stars",
               desc: `parse ${currentBest} in the current tier` });

  for (const u of raids?.ultimates ?? [])
    if (u.cleared)
      out.push({ icon: "🏆", name: `Legend — ${u.zone}`,
                 desc: "Ultimate cleared" });

  if ((m.mounts ?? 0) >= agg.mountsTop10 && (m.mounts ?? 0) > 0)
    out.push({ icon: "🐎", name: "Head Chef of Collecting",
               desc: `${m.mounts} mounts — FC top 10` });

  if ((m.rare_achv ?? 0) >= agg.rareTop10 && (m.rare_achv ?? 0) > 0)
    out.push({ icon: "🥔", name: "Popoto King",
               desc: `${m.rare_achv} rare achievements — FC top 10` });

  if (claimed)
    out.push({ icon: "🍲", name: "Regular", desc: "Verified via Discord" });

  return out;
}

export function topN(values: (number | null | undefined)[], n: number): number {
  const v = values.filter((x): x is number => x != null && x > 0)
                  .sort((a, b) => b - a);
  return v.length ? v[Math.min(n, v.length) - 1] : Number.POSITIVE_INFINITY;
}

export function percentile(values: (number | null | undefined)[], me: number | null | undefined): number | null {
  if (me == null) return null;
  const v = values.filter((x): x is number => x != null);
  if (!v.length) return null;
  const below = v.filter((x) => x < me).length;
  return Math.round((below / v.length) * 100);
}
