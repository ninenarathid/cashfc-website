import { notFound } from "next/navigation";
import { allGuestIds, guestHome, guestMember } from "@/lib/guest-data";
import raw from "@/data/members.json";
import raidsRaw from "@/data/raids.json";
import achvRaw from "@/data/achv.json";
import collRaw from "@/data/collections.json";
import MemberView from "@/components/MemberView";
import { dutyArtMap } from "@/lib/duty-server";
import MemberPending from "@/components/MemberPending";
import { pendingMember } from "@/lib/pending-member";
import type { AchievementInfo, CollectionItem } from "@/components/RareShelf";
import type { BoardData, MemberRaids } from "@/lib/types";

const data = raw as unknown as BoardData;
const raids = raidsRaw as unknown as Record<string, MemberRaids>;
// Loaded here rather than in members.json: only this page renders it.
const achv = achvRaw as unknown as {
  catalog: Record<string, AchievementInfo>;
  members: Record<string, number[]>;
};
// Same shape, one level deeper: a catalog and a member list per collection.
const coll = collRaw as unknown as {
  patch?: string | null;
  catalog: Record<string, Record<string, CollectionItem>>;
  members: Record<string, Record<string, number[]>>;
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

/**
 * Reading `v` is what makes this page render per request rather than being
 * built once, and it is worth the trade.
 *
 * Discord keeps two caches, not one. The embed — title, description, which
 * image to fetch — is keyed by the address of the page, and the Share link
 * button has always added a `v` to defeat that. The picture is keyed by the
 * address of the picture, and that never changed: Next names this route's image
 * after the route's own file, so every member and every share pointed at the
 * same `opengraph-image?08b02164c71f9fc9`. A member who changed their portrait
 * and shared their page got a fresh embed around the picture Discord had
 * already kept, which is exactly the complaint.
 *
 * Passing `v` down to the image gives it an address of its own each time, so
 * the second cache misses too. The cost is that five hundred member pages stop
 * being prerendered — everything they read is already in memory, so it is a
 * render rather than a fetch, and this is a Free Company of a few hundred
 * people rather than a site with traffic to protect.
 */
export async function generateMetadata(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  },
) {
  const { id } = await params;
  const v = (await searchParams).v;
  const m = findMember(id);
  const home = guestHome(Number(id));
  const stamp = typeof v === "string" && /^[a-z0-9]{1,16}$/i.test(v) ? v : null;
  return {
    title: m ? `${m.name} — Cafe And SHabu` : "Member — Cafe And SHabu",
    // A guest is placed by the two facts an FC member never needs: which world
    // they are on, and whose company they are in.
    description: m
      ? [m.name, m.title, home?.world, home?.fc].filter(Boolean).join(" · ")
      : undefined,
    openGraph: {
      // Set by hand rather than left to the file convention, which is what
      // pins every share to one address. Same route, same picture — only the
      // name it is asked for by changes.
      images: [{
        url: `/member/${id}/opengraph-image${stamp ? `?v=${stamp}` : ""}`,
        width: 1200, height: 630, alt: "FC member card",
      }],
    },
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

  // An id with no catalog entry is one the last run dropped out of the rare
  // slice; filtering rather than rendering a blank keeps the shelf honest.
  const rareOf = (kind: string): CollectionItem[] =>
    ((coll.members[id] ?? {})[kind] ?? [])
      .map((i) => (coll.catalog[kind] ?? {})[String(i)])
      .filter(Boolean);

  return (
    <MemberView
      m={m}
      raids={raids[id] ?? null}
      rareAchievements={rareAchievements}
      rareMounts={rareOf("mounts")}
      rareMinions={rareOf("minions")}
      patch={coll.patch ?? null}
      art={dutyArtMap()}
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
