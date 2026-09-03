import raw from "@/data/members.json";
import feedRaw from "@/data/feed.json";
import newsRaw from "@/data/news.json";
import Announcements from "@/components/Announcements";
import LatestUpdate from "@/components/home/LatestUpdate";
import DiscordCard from "@/components/home/DiscordCard";
import Timeline from "@/components/home/Timeline";
import Birthdays from "@/components/home/Birthdays";
import Hero from "@/components/home/Hero";
import ActivityFeed from "@/components/home/ActivityFeed";
import HotGallery from "@/components/home/HotGallery";
import TopThree from "@/components/home/TopThree";
import { BUCKETS, topOf } from "@/lib/leaderboards";
import { allGuestIds, guestHome } from "@/lib/guest-data";
import type { BoardData, FeedEvent, NewsItem } from "@/lib/types";
import { isOnVacation } from "@/lib/types";

export default function Home() {
  const data = raw as unknown as BoardData;
  const feed = ((feedRaw as { events?: FeedEvent[] }).events ?? []).slice(0, 30);
  const news = ((newsRaw as { items?: NewsItem[] }).items ?? []);
  const members = data.members;
  const activeCount = members.filter((m) => !isOnVacation(m)).length;

  // Headline counts per playstyle, biggest first, skipping the buckets that only say
  // what could not be read.
  const SKIP = new Set(["casual", "private", "unknown"]);
  const tally: Record<string, number> = {};
  for (const m of members) {
    for (const t of m.tags) if (!SKIP.has(t)) tally[t] = (tally[t] ?? 0) + 1;
  }
  const tagStats = Object.entries(tally)
    .map(([tag, n]) => ({ tag, n }))
    .sort((a, b) => b.n - a.n);

  return (
    <main>
      <Hero fc={data.fc} total={data.fc.total} active={activeCount} tagStats={tagStats} />

      <Announcements />
      <DiscordCard />

      <Birthdays members={members} />

      <HotGallery />

      <TopThree
        // Worked out here, at build time, from the same roster the leaderboards
        // page reads — the two cannot disagree about who is ahead because they
        // are running the same function over the same file.
        buckets={BUCKETS.map((key) => ({ key, rows: topOf(members, key, 3) }))}
        names={{
          ...Object.fromEntries(allGuestIds().map((id) => {
            const g = guestHome(id);
            return [id, { name: g?.name ?? `#${id}`, avatar: g?.portrait ?? null }];
          })),
          ...Object.fromEntries(members.map((m) =>
            [m.id, { name: m.name, avatar: m.avatar ?? null }])),
        }}
      />

      <LatestUpdate />

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ActivityFeed feed={feed} />
        <Timeline news={news} />
      </div>
    </main>
  );
}
