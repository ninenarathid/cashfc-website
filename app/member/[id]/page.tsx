import { notFound } from "next/navigation";
import { allGuestIds, guestHome, guestMember } from "@/lib/guest-data";
import raw from "@/data/members.json";
import raidsRaw from "@/data/raids.json";
import achvRaw from "@/data/achv.json";
import MemberView from "@/components/MemberView";
import MemberPending from "@/components/MemberPending";
import { pendingMember } from "@/lib/pending-member";
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
  // Guests get a page too. They are not on the roster by definition, so without
  // this every link to one — from the board, from a tag on a picture — answered
  // with a 404, which reads as "this person does not exist" rather than "this
  // person is not in the FC".
  return [...data.members.map((m) => m.id), ...allGuestIds()]
    .map((id) => ({ id: String(id) }));
}

/** The roster first, then the guests. Nobody is in both. */
function findMember(id: string) {
  const own = data.members.find((x) => String(x.id) === id);
  if (own) return own;
  const home = guestHome(Number(id));
  return home ? guestMember(Number(id), home) : undefined;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = findMember(id);
  const home = guestHome(Number(id));
  return {
    title: m ? `${m.name} — Cafe And SHabu` : "Member — Cafe And SHabu",
    // A guest is placed by the two facts an FC member never needs: which world
    // they are on, and whose company they are in.
    description: m
      ? [m.name, m.title, home?.world, home?.fc].filter(Boolean).join(" · ")
      : undefined,
  };
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = findMember(id);
  if (!m) {
    // Not on the roster and not in guests.json — which for somebody who
    // verified this afternoon only means the nightly lookup has not run yet.
    // The claim in the database is enough to say so on a page of their own.
    const pending = await pendingMember(Number(id));
    if (!pending) notFound();
    return <MemberPending m={pending} />;
  }
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
