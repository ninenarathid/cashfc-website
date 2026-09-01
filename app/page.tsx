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
  const SKIP = new Set(["casual", "unknown"]);
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
      <LatestUpdate />
      <DiscordCard />

      <Birthdays members={members} />

      <HotGallery />

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ActivityFeed feed={feed} />
        <Timeline news={news} />
      </div>
    </main>
  );
}
