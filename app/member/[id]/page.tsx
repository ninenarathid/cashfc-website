import { notFound } from "next/navigation";
import raw from "@/data/members.json";
import raidsRaw from "@/data/raids.json";
import MemberView from "@/components/MemberView";
import type { BoardData, MemberRaids } from "@/lib/types";

const data = raw as unknown as BoardData;
const raids = raidsRaw as unknown as Record<string, MemberRaids>;

export function generateStaticParams() {
  return data.members.map((m) => ({ id: String(m.id) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = data.members.find((x) => String(x.id) === id);
  return {
    title: m ? `${m.name} — Cafe And SHabu` : "Member — Cafe And SHabu",
    description: m
      ? `${m.name} · ${m.rank ?? ""} · Lv ${m.level ?? "?"}`
      : undefined,
  };
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = data.members.find((x) => String(x.id) === id);
  if (!m) notFound();
  const agg = {
    mounts: data.members.map((x) => x.mounts),
    minions: data.members.map((x) => x.minions),
    rare: data.members.map((x) => x.rare_achv),
  };
  return (
    <MemberView
      m={m}
      raids={raids[id] ?? null}
      tierLabels={data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"]}
      agg={agg}
      fc={{ name: data.fc.name, world: data.fc.world, region: data.fc.region ?? "JP" }}
    />
  );
}
