import Link from "next/link";
import raw from "@/data/members.json";
import feedRaw from "@/data/feed.json";
import newsRaw from "@/data/news.json";
import Announcements from "@/components/Announcements";
import DiscordCard from "@/components/home/DiscordCard";
import Timeline from "@/components/home/Timeline";
import BirthdaysToday from "@/components/home/BirthdaysToday";
import type { BoardData, FeedEvent, Member, NewsItem } from "@/lib/types";
import { isOnVacation } from "@/lib/types";

const FEED_ICON: Record<string, string> = {
  parse_up: "📈", boss_clear: "⚔️", ult_clear: "🏆", mounts_up: "🐎",
  rare_up: "💎", level_100: "⬆️", new_member: "🍲", leave: "👋",
};

function hashStr(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  return h;
}

export default function Home() {
  const data = raw as unknown as BoardData;
  const feed = ((feedRaw as { events?: FeedEvent[] }).events ?? []).slice(0, 30);
  const news = ((newsRaw as { items?: NewsItem[] }).items ?? []);
  const members = data.members;
  const count = (t: string) => members.filter((m) => m.tags.includes(t)).length;

  // Member of the day. A hash of the date picked at random, so some members came up
  // twice while others never appeared; walking a fixed shuffle by day number instead
  // gives every active member exactly one turn before anyone repeats. The shuffle is
  // seeded from character ids, so the order is stable and everyone sees the same
  // person on the same day.
  const dateSeed = (data.generated_at ?? "").slice(0, 10);
  const dayNumber = Math.floor(Date.parse(`${dateSeed}T00:00:00Z`) / 86_400_000);
  const rotation = members
    .filter((m) => !isOnVacation(m))
    .sort((a, b) => hashStr(String(a.id)) - hashStr(String(b.id)));
  const spot: Member | undefined = rotation.length
    ? rotation[((dayNumber % rotation.length) + rotation.length) % rotation.length]
    : undefined;

  return (
    <main>
      {/* ── Hero ── */}
      <header className="pb-6 pt-9 text-center sm:pt-12">
        <div className="font-data text-[11px] uppercase tracking-[0.24em] text-amber">
          Free Company · {data.fc.world} [{data.fc.dc}]
        </div>
        {/* The wordmark carries the FC name, so the h1 stays for screen readers and
            search results but is not painted twice. */}
        <h1 className="sr-only">{data.fc.name}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt={data.fc.name}
             className="mx-auto mt-2 w-full max-w-sm sm:max-w-md"
             width={1000} height={722} />
        <p className="mx-auto mt-2 max-w-md text-[14.5px] text-muted">
          Our second home — meet the roster, follow what everyone is up to,
          and get together in game.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/members"
            className="rounded-lg border border-amber bg-amber/15 px-5 py-2 text-amber no-underline transition-colors hover:bg-amber/25"
          >
            Browse all {data.fc.total} members
          </Link>
        </div>
        <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-2.5">
          {[
            ["Members", data.fc.total, "text-ink"],
            ["Raider", count("raider"), "text-chili"],
            ["Ultimate", count("ultimate"), "text-gold"],
          ].map(([label, n, cls]) => (
            <div key={label as string} className="rounded-xl border border-line bg-surface px-3 py-2.5">
              <div className={`font-data text-2xl font-semibold ${cls}`}>{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
      </header>

      <Announcements />
      <DiscordCard />

      <BirthdaysToday members={members} />

      {/* ── Activity feed + Timeline ── */}
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">
            FC activity
          </h2>
          {feed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] leading-relaxed text-muted">
              Events start showing up after the next update run. The pipeline diffs
              the roster day over day, so new best parses, first boss clears and
              fresh mounts land here automatically.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {feed.map((e, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
                  <span className="text-base leading-6">{FEED_ICON[e.type] ?? "•"}</span>
                  <div className="min-w-0 text-[13.5px] leading-relaxed">
                    <Link href={`/member/${e.id}`} className="font-data font-semibold text-ink no-underline hover:text-amber">
                      {e.name}
                    </Link>{" "}
                    <span className="text-muted">{e.text}</span>
                    <span className="ml-2 text-[11px] text-muted/70">
                      {new Date(e.date + "T00:00:00").toLocaleDateString("en-GB",
                        { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div>
          <Timeline news={news} />

          {/* ── Member of the day ── */}
          {spot && (
            <section className="mt-6">
              <h2 className="mb-2 font-display text-lg font-semibold">
                Member of the day
              </h2>
              <Link
                href={`/member/${spot.id}`}
                className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 no-underline transition-colors hover:border-amber"
              >
                {spot.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={spot.avatar} alt="" className="size-16 rounded-full border border-line" />
                )}
                <div className="min-w-0">
                  <div className="font-data text-[16px] font-semibold text-ink">
                    {spot.name}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {spot.rank ?? "—"} · Lv {spot.level ?? "—"}
                    {spot.mounts != null && ` · ${spot.mounts} mounts`}
                  </div>
                  <div className="mt-1 text-[12px] text-amber">
                    View profile →
                  </div>
                </div>
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
