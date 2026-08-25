"use client";

import Link from "next/link";
import type { FeedEvent } from "@/lib/types";
import { useLang } from "@/lib/i18n";

const FEED_ICON: Record<string, string> = {
  parse_up: "📈", boss_clear: "⚔️", ex_clear: "🌪️", ult_clear: "🏆",
  rare_up: "💎", grade_up: "✨", job_up: "🎓",
  mounts_up: "🐎", minions_up: "🐣", level_100: "⬆️",
  new_member: "🍲", leave: "👋",
};

/**
 * What changed since the last pipeline run.
 *
 * The event text itself is written by the pipeline in English and left alone:
 * it names bosses, jobs and mounts, so translating the sentence around them
 * would leave a half-English line either way.
 */
export default function ActivityFeed({ feed }: { feed: FeedEvent[] }) {
  const { t, lang } = useLang();
  const locale = lang === "th" ? "th-TH" : "en-GB";
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold">{t("home.activity")}</h2>
      {feed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] leading-relaxed text-muted">
          {t("home.activityEmpty")}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {feed.map((e, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
              <span className="text-base leading-6">{FEED_ICON[e.type] ?? "•"}</span>
              <div className="min-w-0 text-[13.5px] leading-relaxed">
                <Link href={`/member/${e.id}`}
                      className="font-data font-semibold text-ink no-underline hover:text-accent">
                  {e.name}
                </Link>{" "}
                <span className="text-muted">{e.text}</span>
                <span className="ml-2 text-[11px] text-muted/70">
                  {new Date(e.date + "T00:00:00").toLocaleDateString(locale,
                    { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
