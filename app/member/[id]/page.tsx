import { notFound } from "next/navigation";
import raw from "@/data/members.json";
import raidsRaw from "@/data/raids.json";
import achvRaw from "@/data/achv.json";
import MemberView from "@/components/MemberView";
import type { AchievementInfo } from "@/components/RareAchievements";
import type { BoardData, MemberRaids } from "@/lib/types";

const data = raw as unknown as BoardData;
const raids = raidsRaw as unknown as Record<string, MemberRaids>;
// Loaded here rather than in members.json: only this page renders it.
const achv = achvRaw as unknown as {
  catalog: Record<string, AchievementInfo>;
  members: Record<string, number[]>;
};

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
  const rareAchievements = (achv.members[id] ?? [])
    .map((aid) => achv.catalog[String(aid)])
    .filter(Boolean);

  return (
    <MemberView
      m={m}
      raids={raids[id] ?? null}
      rareAchievements={rareAchievements}
      extremeTotal={(data.extremes ?? []).length}
      tierLabels={data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"]}
      agg={agg}
      // Faces as well as names: a tag pinned to a picture shows the character
      // it names, and looking that up from the browser would mean a round trip
      // for something already sitting in the build.
      memberOptions={data.members.map((x) => ({
        id: x.id, name: x.name, avatar: x.avatar ?? null,
      }))}
      fc={{ name: data.fc.name, world: data.fc.world, region: data.fc.region ?? "JP" }}
    />
  );
}
