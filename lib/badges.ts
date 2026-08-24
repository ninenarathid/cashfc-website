import type { Member, MemberRaids } from "@/lib/types";

export interface Badge { icon: string; name: string; desc: string }

export interface FcAgg {
  mountsTop10: number;   // ค่า mounts ต่ำสุดของ top 10
  rareTop10: number;     // ค่า rare achv ต่ำสุดของ top 10
}

/** ป้ายตำแหน่งอัตโนมัติธีมร้านอาหาร — เกณฑ์ปรับได้ที่นี่ */
export function computeBadges(
  m: Member, raids: MemberRaids | null, agg: FcAgg, claimed: boolean,
): Badge[] {
  const out: Badge[] = [];

  const currentBest = Math.max(
    -1, ...(raids?.current?.encounters ?? []).map((e) => e.best ?? -1));
  if (currentBest >= 99)
    out.push({ icon: "⭐⭐⭐", name: "มิชลินสามดาว",
               desc: `parse ${currentBest} ใน tier ปัจจุบัน` });
  else if (currentBest >= 95)
    out.push({ icon: "⭐⭐", name: "มิชลินสองดาว",
               desc: `parse ${currentBest} ใน tier ปัจจุบัน` });

  for (const u of raids?.ultimates ?? [])
    if (u.cleared)
      out.push({ icon: "🏆", name: `Legend — ${u.zone}`,
                 desc: "เคลียร์ Ultimate" });

  if ((m.mounts ?? 0) >= agg.mountsTop10 && (m.mounts ?? 0) > 0)
    out.push({ icon: "🐎", name: "เชฟใหญ่สายสะสม",
               desc: `mounts ${m.mounts} — top 10 ของ FC` });

  if ((m.rare_achv ?? 0) >= agg.rareTop10 && (m.rare_achv ?? 0) > 0)
    out.push({ icon: "🥔", name: "ราชา popoto",
               desc: `rare achievement ${m.rare_achv} — top 10 ของ FC` });

  if (claimed)
    out.push({ icon: "🍲", name: "ขาประจำร้าน", desc: "ยืนยันตัวตนผ่าน Discord" });

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
