import Link from "next/link";
import raw from "@/data/members.json";
import feedRaw from "@/data/feed.json";
import newsRaw from "@/data/news.json";
import Announcements from "@/components/Announcements";
import DiscordCard from "@/components/home/DiscordCard";
import Timeline from "@/components/home/Timeline";
import type { BoardData, FeedEvent, Member, NewsItem } from "@/lib/types";

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

  // สมาชิกประจำวัน — seed จากวันที่ของข้อมูล ทุกคนเห็นคนเดียวกัน
  const dateSeed = (data.generated_at ?? "").slice(0, 10);
  const spot: Member = members[hashStr(dateSeed) % Math.max(members.length, 1)];

  // nameday วันนี้ (อิงวันที่ generate ข้อมูล — รีเฟรชทุกคืนพร้อม pipeline)
  const gen = new Date(data.generated_at);
  const todayNamedays = members.filter(
    (m) => m.nameday?.month === gen.getUTCMonth() + 1 &&
           m.nameday?.day === gen.getUTCDate());

  return (
    <main>
      {/* ── Hero ── */}
      <header className="pb-6 pt-9 text-center sm:pt-12">
        <div className="font-data text-[11px] uppercase tracking-[0.24em] text-amber">
          Free Company · {data.fc.world} [{data.fc.dc}]
        </div>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {data.fc.name}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] text-muted">
          บ้านหลังที่สองของพวกเรา — ดูสมาชิก ติดตามความเคลื่อนไหว
          และรวมตัวกันทำกิจกรรม
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/members"
            className="rounded-lg border border-amber bg-amber/15 px-5 py-2 text-amber no-underline transition-colors hover:bg-amber/25"
          >
            ดูสมาชิกทั้ง {data.fc.total} คน
          </Link>
          <Link
            href="/events"
            className="rounded-lg border border-line px-5 py-2 text-muted no-underline transition-colors hover:border-muted hover:text-ink"
          >
            กิจกรรม
          </Link>
        </div>
        <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-2.5">
          {[
            ["สมาชิก", data.fc.total, "text-ink"],
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

      {todayNamedays.length > 0 && (
        <section className="mt-5 rounded-xl border border-gold/40 bg-gold/8 px-4 py-3">
          <span className="font-display font-semibold text-gold">
            🎂 วันนี้ nameday ของ:{" "}
          </span>
          {todayNamedays.map((m, i) => (
            <span key={m.id}>
              {i > 0 && " · "}
              <Link href={`/member/${m.id}`} className="text-ink no-underline hover:text-gold">
                {m.name}
              </Link>
            </span>
          ))}
          <span className="text-[13px] text-muted"> — ไปอวยพรกันหน่อย!</span>
        </section>
      )}

      {/* ── ฟีด + Timeline ── */}
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">
            ความเคลื่อนไหวใน FC
          </h2>
          {feed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] leading-relaxed text-muted">
              ฟีดจะเริ่มมีเหตุการณ์ตั้งแต่รอบอัปเดตถัดไป
              (ระบบเทียบข้อมูลวันต่อวัน — parse นิวไฮ, เคลียร์บอสใหม่,
              mount ใหม่ จะเด้งขึ้นที่นี่อัตโนมัติ)
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
                      {new Date(e.date + "T00:00:00").toLocaleDateString("th-TH",
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

          {/* ── สมาชิกประจำวัน ── */}
          {spot && (
            <section className="mt-6">
              <h2 className="mb-2 font-display text-lg font-semibold">
                สมาชิกประจำวัน
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
                    ดูโปรไฟล์ →
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
