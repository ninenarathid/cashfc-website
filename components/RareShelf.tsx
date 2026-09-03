"use client";

import { useState, type ReactNode } from "react";
import Tabs from "@/components/ui/Tabs";
import TagIcon, { GameIcon } from "@/components/TagIcon";
import { TAG_CLASS, TAG_LABELS } from "@/components/MemberTags";
import { useLang } from "@/lib/i18n";

/**
 * The rarest things a member has, in one place: achievements, mounts, minions.
 *
 * Three lists that answer the same question — what has this person got that
 * almost nobody has — and that used to be two sections and a stack, running
 * further down the page than everything above them put together. Nobody reads
 * somebody's minions and their achievements in the same moment, so only the one
 * being asked about is on screen.
 *
 * All three rarities come from FFXIV Collect's `owned` figure, which is why they
 * can share a colour ladder and be compared at a glance. Achievements are shown
 * against every achievement in the game; mounts and minions against the rarest
 * slice of their own catalogues, because those are short enough that a member
 * would otherwise have a hundred rows of things half the game owns.
 *
 * Titles, emotes, hairstyles, fashion accessories, bardings and triple triad
 * cards are not here and cannot be: The Lodestone does not publish them, so
 * neither Collect nor Lalachievements can say who owns one unless that person
 * installs an addon and uploads it themselves.
 */

export interface AchievementInfo {
  name: string | null;
  pct: number | null;
  icon: string | null;
  category: string | null;
  type: string | null;
  patch: string | null;
  points: number | null;
  title: string | null;
  /** The playstyle tag this achievement counts toward, if any. */
  bucket?: string | null;
}

export interface CollectionItem {
  name: string | null;
  pct: number | null;
  icon: string | null;
  patch: string | null;
  /** How it was earned — a dungeon, an event, the Gold Saucer. */
  source?: string | null;
}

/** A tab shows only its own list, so it can afford more of it than a stack could. */
const SHOW_FIRST = 12;

/** One ladder for all three, because all three are the same measurement. */
function rarityColor(pct: number | null): string {
  if (pct == null) return "#7a7a7a";
  if (pct < 0.5) return "#e5cc80";
  if (pct < 1) return "#e268a8";
  if (pct < 3) return "#ff8000";
  if (pct < 5) return "#a335ee";
  return "#2f7fd4";
}

function rarityLabel(pct: number | null, th: boolean): string {
  if (pct == null) return th ? "ไม่ทราบ" : "unknown";
  // Collect rounds to a tenth, so "0%" means "under a twentieth of a percent"
  // rather than nobody — and saying zero about something they are holding
  // would be the one reading that cannot be true.
  if (pct < 0.05) return th ? "ผู้เล่นน้อยกว่า 0.1% มี" : "under 0.1% of players";
  return th ? `ผู้เล่น ${pct}% มี` : `${pct}% of players`;
}

function Row(
  { icon, name, meta, pct, th }: {
    icon: string | null; name: string | null; meta: ReactNode;
    pct: number | null; th: boolean;
  },
) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" loading="lazy"
             className="size-9 shrink-0 rounded-md border border-line bg-card object-contain" />
      ) : (
        <span className="size-9 shrink-0 rounded-md border border-line bg-card" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] text-ink" title={name ?? ""}>
          {name ?? "—"}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
          {meta}
        </div>
      </div>
      <span className="shrink-0 font-data text-[12.5px] font-semibold"
            style={{ color: rarityColor(pct) }}
            title={rarityLabel(pct, th)}>
        {pct == null ? "—" : pct < 0.05 ? "<0.1%" : `${pct}%`}
      </span>
    </div>
  );
}

function List({ children, total, th }:
  { children: ReactNode[]; total: number; th: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {expanded ? children : children.slice(0, SHOW_FIRST)}
      </div>
      {total > SHOW_FIRST && (
        <button onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-[12.5px] text-accent underline-offset-2 hover:underline">
          {expanded
            ? (th ? "ย่อ" : "Show fewer")
            : (th ? `ดูทั้งหมด ${total}` : `Show all ${total}`)}
        </button>
      )}
    </>
  );
}

export default function RareShelf(
  { achievements, mounts, minions }: {
    achievements: AchievementInfo[];
    mounts: CollectionItem[];
    minions: CollectionItem[];
  },
) {
  const { lang } = useLang();
  const th = lang === "th";
  if (!achievements.length && !mounts.length && !minions.length) return null;

  const collection = (items: CollectionItem[]) => items.map((it, i) => (
    <Row key={`${it.name}-${i}`} icon={it.icon} name={it.name} pct={it.pct} th={th}
         meta={<span className="truncate">
           {[it.source, it.patch && `patch ${it.patch}`].filter(Boolean).join(" · ")}
         </span>} />
  ));

  // A tab for an empty shelf is a tab that disappoints whoever opens it.
  const tabs = [
    achievements.length && {
      key: "achv",
      // The three labels stay in English in both languages: they are what the
      // game calls them, and a Thai player looking for their minions is looking
      // for the word "Minions".
      label: (
        <>
          <GameIcon path="061000/061830" alt="achievements" size={15} square />
          Achievements
        </>
      ),
      hint: achievements.length,
      body: (
        <List total={achievements.length} th={th}>
          {achievements.map((a, i) => (
            <Row key={`${a.name}-${i}`} icon={a.icon} name={a.name} pct={a.pct} th={th}
                 meta={<>
                   {a.bucket && (
                     // Names the playstyle tag this one feeds, so the connection
                     // between "Legendary relic grinder" and the achievements
                     // behind it is visible.
                     <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[10px] ${
                       TAG_CLASS[a.bucket] ?? "border-line text-muted"}`}>
                       <TagIcon tag={a.bucket} size={11} />
                       {TAG_LABELS[a.bucket] ?? a.bucket}
                     </span>
                   )}
                   <span className="truncate">
                     {[a.category, a.patch && `patch ${a.patch}`].filter(Boolean).join(" · ")}
                     {a.title && (
                       <span className="text-gold"> · title &ldquo;{a.title}&rdquo;</span>
                     )}
                   </span>
                 </>} />
          ))}
        </List>
      ),
    },
    mounts.length && {
      key: "mounts",
      label: (
        <>
          <GameIcon path="061000/061813" alt="mounts" size={15} square />
          Mounts
        </>
      ),
      hint: mounts.length,
      body: <List total={mounts.length} th={th}>{collection(mounts)}</List>,
    },
    minions.length && {
      key: "minions", label: "Minions", hint: minions.length,
      body: <List total={minions.length} th={th}>{collection(minions)}</List>,
    },
  ].filter(Boolean) as {
    key: string; label: ReactNode; hint: number; body: ReactNode;
  }[];

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-display text-lg font-semibold">
        {th ? "ของหายากที่มี" : "Rarest things they have"}
      </h2>
      <Tabs tabs={tabs} />
    </section>
  );
}
