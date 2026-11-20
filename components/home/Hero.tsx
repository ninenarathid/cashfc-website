"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import TagIcon from "@/components/TagIcon";
import { TAG_CLASS, TAG_LABELS } from "@/components/MemberTags";
import TagHoverCard from "@/components/TagHoverCard";

/**
 * The front page is a server component so the roster is baked in at build time.
 * Everything on it that has to speak the reader's language lives here instead —
 * the counts and their labels, and the playstyle links.
 *
 * Tag labels stay in English deliberately: Crafter, Gatherer and Ultimate are
 * what the FC calls them out loud, and they are the same words the filters and
 * the member chips use.
 */
export default function Hero(
  { name, total, active, tagStats }: {
    name: string;
    total: number;
    active: number;
    tagStats: { tag: string; n: number }[];
  },
) {
  const { t } = useLang();
  const [showAllTags, setShowAllTags] = useState(false);
  const mobileTagCount = 3;
  const moreTags = tagStats.length - mobileTagCount;

  const tagLink = ({ tag, n }: { tag: string; n: number }) => (
    <TagHoverCard key={tag} tag={tag}>
      <Link href={`/members?tag=${tag}`}
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-sm text-meta font-semibold text-ink no-underline transition-colors hover:text-accent">
        <span className={TAG_CLASS[tag]}><TagIcon tag={tag} size={16} /></span>
        {TAG_LABELS[tag] ?? tag}
        <small className="font-data text-meta text-muted tabular-nums">{n}</small>
      </Link>
    </TagHoverCard>
  );

  return (
    <header className="pb-4 pt-2 sm:pb-6 sm:pt-4">
      <h1 className="sr-only">{name}</h1>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8 md:gap-12 lg:gap-20">
        <div className="w-full max-w-[15rem] overflow-hidden md:max-w-[24rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={1000} height={722} fetchPriority="high"
               className="-mt-[14%] block h-auto w-full" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:shrink-0">
          <Link href="/members"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gold px-4 py-2 text-read font-bold text-bg no-underline transition-colors hover:bg-ink">
            {t("home.browseAll", { n: total })}
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </Link>
          <span className="inline-flex items-center gap-2 text-read text-muted">
            <span aria-hidden className="size-2 rounded-full bg-jade" />
            <span><strong className="font-data text-ink tabular-nums">{active}</strong> {t("home.active")}</span>
          </span>
        </div>
      </div>

      {/* How the FC actually spends its time. Jobs stay off the front page —
          that is a question for a member's own profile, not a headline. */}
      {tagStats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-3 border-t border-line pt-2 sm:gap-x-4 sm:gap-y-1 md:mt-5">
          {tagStats.slice(0, mobileTagCount).map(tagLink)}
          {moreTags > 0 && (
            <>
              <button type="button" aria-expanded={showAllTags} aria-controls="home-extra-tags"
                      onClick={() => setShowAllTags((shown) => !shown)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm pr-1 text-meta font-semibold text-accent hover:underline sm:hidden">
                {showAllTags ? t("home.fewerTags") : t("home.moreTags", { n: moreTags })}
                <svg aria-hidden viewBox="0 0 16 16" className={`size-3 ${showAllTags ? "rotate-180" : ""}`}
                     fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
              <div id="home-extra-tags" className={showAllTags ? "contents" : "hidden sm:contents"}>
                {tagStats.slice(mobileTagCount).map(tagLink)}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
