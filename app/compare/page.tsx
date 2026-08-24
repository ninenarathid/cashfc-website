import raw from "@/data/members.json";
import CompareClient from "@/components/CompareClient";
import type { BoardData } from "@/lib/types";

export const metadata = { title: "เทียบสมาชิก — Cafe And SHabu" };

export default function ComparePage() {
  const data = raw as unknown as BoardData;
  const slim = data.members.map((m) => ({
    id: m.id, name: m.name, avatar: m.avatar, rank: m.rank, level: m.level,
    parse: m.parse, tags: m.tags, mounts: m.mounts, minions: m.minions,
    rare_achv: m.rare_achv, ult_clears: m.ult_clears,
  }));
  return <CompareClient options={slim} />;
}
