"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import TagIcon from "@/components/TagIcon";
import { TAG_CLASS, TAG_LABELS } from "@/components/MemberTags";
import TagHoverCard from "@/components/TagHoverCard";

/**
 * The front page is a server component so the roster is baked in at build time.
 * Everything on it that has to speak the reader's language lives here instead —
 * the counts and their labels, the tagline, and the playstyle chips.
 *
 * Tag labels stay in English deliberately: Crafter, Gatherer and Ultimate are
 * what the FC calls them out loud, and they are the same words the filters and
 * the member chips use.
 */
export default function Hero(
  { fc, total, active, tagStats }: {
    fc: { name: string; world: string; dc: string };
    total: number;
    active: number;
    tagStats: { tag: string; n: number }[];
  },
) {
  const { t, lang } = useLang();
  return (
    <header className="pb-3 pt-4 text-center sm:pt-6">
      {/* The wordmark carries the FC name, so the h1 stays for screen readers and
          search results but is not painted twice. */}
      <h1 className="sr-only">{fc.name}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt={fc.name}
           className="mx-auto w-full max-w-sm sm:max-w-md"
           width={1000} height={722} />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
        <Link href="/members"
              className="rounded-lg border border-accent bg-accent/15 px-5 py-2 text-accent no-underline transition-colors hover:bg-accent/25">
          {t("home.browseAll", { n: total })}
        </Link>
      </div>
      <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <div className="font-data text-2xl font-semibold text-ink">{total}</div>
          <div className="text-xs text-muted">{t("home.members")}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <div className="flex items-baseline justify-center gap-2">
            <span className="size-2.5 rounded-full bg-[#43b581]" />
            <span className="font-data text-2xl font-semibold text-ink">{active}</span>
          </div>
          <div className="text-xs text-muted">{t("home.active")}</div>
        </div>
      </div>

      {/* How the FC actually spends its time. Jobs stay off the front page —
          that is a question for a member's own profile, not a headline. */}
      {tagStats.length > 0 && (
        <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-1.5">
          {tagStats.map(({ tag, n }) => (
            <TagHoverCard key={tag} tag={tag}>
              <Link href={`/members?tag=${tag}`}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium no-underline transition-opacity hover:opacity-80 ${
                      TAG_CLASS[tag] ?? "border-line text-muted"}`}>
                <TagIcon tag={tag} size={14} />
                {TAG_LABELS[tag] ?? tag}
                <small className="font-data opacity-75">{n}</small>
              </Link>
            </TagHoverCard>
          ))}
        </div>
      )}
    </header>
  );
}
