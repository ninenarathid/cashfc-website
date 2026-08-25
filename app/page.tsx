import raw from "@/data/members.json";
import feedRaw from "@/data/feed.json";
import newsRaw from "@/data/news.json";
import Announcements from "@/components/Announcements";
import DiscordCard from "@/components/home/DiscordCard";
import Timeline from "@/components/home/Timeline";
import BirthdaysToday from "@/components/home/BirthdaysToday";
import ShowYourData from "@/components/home/ShowYourData";
import Hero from "@/components/home/Hero";
import ActivityFeed from "@/components/home/ActivityFeed";
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
      <DiscordCard />

      <ShowYourData
        known={members.filter((m) => m.mounts != null).length}
        total={members.length}
        publicAchv={members.filter((m) => m.ach_public === true).length}
      />

      <BirthdaysToday members={members} />

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ActivityFeed feed={feed} />
        <Timeline news={news} />
      </div>
    </main>
  );
}
