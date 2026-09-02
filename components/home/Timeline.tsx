"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate, fromDay } from "@/lib/dates";

interface Item {
  kind: "official" | "fc";
  title: string;
  body?: string | null;
  url?: string | null;
  date: string;
  image?: string | null;
}

export default function Timeline({ news }: { news: NewsItem[] }) {
  const { t } = useLang();
  const [items, setItems] = useState<Item[]>(
    news.map((n) => ({ kind: "official", title: n.title, url: n.url,
                       date: n.date ?? "" })));

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("timeline_posts")
      .select("title, body, url, posted_at, image_url")
      .order("posted_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const fc: Item[] = (data ?? []).map((p) => ({
          kind: "fc", title: p.title, body: p.body, url: p.url,
          date: p.posted_at as string, image: p.image_url as string | null,
        }));
        const merged = [...fc,
          ...news.map((n): Item => ({ kind: "official", title: n.title,
                                      url: n.url, date: n.date ?? "" }))];
        merged.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setItems(merged.slice(0, 12));
      });
  }, [news]);

  if (!items.length) return null;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-display text-lg font-semibold">{t("home.timeline")}</h2>
        <span className="text-[12px] text-muted">
          <span className="text-accent">●</span> {t("home.timelineOfficial")} ·{" "}
          <span className="text-jade">●</span> {t("home.timelineFc")}
        </span>
      </div>
      <div className="flex flex-col gap-0 border-l border-line pl-4">
        {items.map((it, i) => (
          <div key={i} className="relative pb-3.5">
            <span
              className={`absolute -left-[21.5px] top-1.5 size-2.5 rounded-full ${
                it.kind === "official" ? "bg-accent" : "bg-jade"}`}
            />
            <div className="text-[11.5px] font-medium text-muted">
              {it.date &&
                fmtDate(fromDay(it.date))}
              {it.kind === "fc" && (
                <span className="ml-2 text-jade">{t("home.postedByFc")}</span>
              )}
            </div>
            {it.url ? (
              <a href={it.url} target="_blank" rel="noopener noreferrer"
                 className="text-[14px] text-ink no-underline hover:text-accent">
                {it.title}
              </a>
            ) : (
              <div className="text-[14px] text-ink">{it.title}</div>
            )}
            {it.body && (
              <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">
                {it.body}
              </p>
            )}
            {it.image && (
              // Capped rather than full width: the timeline is a column of short
              // entries, and a full-bleed screenshot would bury the ones around it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" loading="lazy"
                   className="mt-1.5 max-h-48 w-auto rounded-lg border border-line" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
