"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BoardData, Member, Overlay } from "@/lib/types";
import {
  LFG_OPTIONS, RANK_ORDER, RACE_ORDER, isOnVacation, ON_VACATION_RANK, ultimateAbbr,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// Order matters: this is the order the filter chips appear in. Raid standing first,
// then the playstyles derived from rare achievements — this game is not only raiding,
// and the board should not read as though it were.
const TAG_LABELS: Record<string, string> = {
  all: "All",
  "tier-clear": "Tier cleared", prog: "Progging", raider: "Raider",
  ultimate: "Ultimate", veteran: "Veteran", extreme: "Extreme",
  collector: "Collector", achiever: "Achiever",
  crafter: "Crafter", gatherer: "Gatherer", relic: "Relic grinder",
  explorer: "Explorer", treasure: "Treasure hunter", goldsaucer: "Gold Saucer",
  seasonal: "Seasonal", pvp: "PvP", oldtimer: "Old-timer",
  casual: "Casual", unknown: "No data",
};
const TAG_HELP: Record<string, string> = {
  "tier-clear": "Cleared every boss of the current savage tier",
  prog: "Partway through the current savage tier",
  raider: "Has savage kills in the current tier",
  ultimate: "Has cleared at least one Ultimate",
  veteran: "Cleared savage or Ultimate content, but not this tier",
  extreme: "Cleared at least one extreme trial this patch",
  collector: "Top 20% of the FC for mounts or minions",
  achiever: "Top 20% of the FC for rare achievements overall",
  crafter: "Rare crafting achievements — top 30% of everyone who has any",
  gatherer: "Rare fishing, mining and botany achievements — top 30%",
  relic: "Rare relic weapon and tool achievements — top 30%",
  explorer: "Rare Eureka, Bozja and exploration achievements — top 30%",
  treasure: "Rare treasure map and hunt achievements — top 30%",
  goldsaucer: "Rare Gold Saucer achievements — top 30%",
  seasonal: "Rare seasonal event achievements — top 30%",
  pvp: "Rare PvP achievements — top 30%",
  oldtimer: "Rare legacy achievements from the game's early years — top 30%",
  casual: "No standout stats, but some data is public",
  unknown: "Logs and achievements are both private",
};
const TAG_CLASS: Record<string, string> = {
  "tier-clear": "border-chili/60 bg-chili/15 text-chili",
  prog: "border-chili/35 bg-chili/5 text-chili/85",
  raider: "border-chili/50 bg-chili/10 text-chili",
  ultimate: "border-gold/50 bg-gold/10 text-gold",
  veteran: "border-gold/30 bg-gold/5 text-gold/80",
  extreme: "border-[#c86fd1]/50 bg-[#c86fd1]/10 text-[#d79ade]",
  collector: "border-jade/45 bg-jade/10 text-jade",
  achiever: "border-jade/30 bg-jade/5 text-jade/85",
  crafter: "border-copper/50 bg-copper/10 text-copper",
  gatherer: "border-[#6aa84f]/50 bg-[#6aa84f]/10 text-[#93c47d]",
  relic: "border-[#b07ce8]/50 bg-[#b07ce8]/10 text-[#c9a8f0]",
  explorer: "border-[#4fa8b8]/50 bg-[#4fa8b8]/10 text-[#7fc7d4]",
  treasure: "border-[#d9a441]/45 bg-[#d9a441]/10 text-[#e3bd76]",
  goldsaucer: "border-[#e07bb0]/45 bg-[#e07bb0]/10 text-[#efa5cb]",
  seasonal: "border-[#8fa3d9]/45 bg-[#8fa3d9]/10 text-[#b0bee6]",
  pvp: "border-steel/45 bg-steel/10 text-steel",
  oldtimer: "border-[#a58b6a]/50 bg-[#a58b6a]/10 text-[#c2ac91]",
  casual: "border-line text-muted",
  unknown: "border-dashed border-line text-muted",
};

const ACTIVITY_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "vacation", label: "On vacation" },
];
// Filters on the real acquisition dates from Lalachievements. Kept separate from the
// rank-based Active filter above on purpose: that one covers everyone, this one only
// covers members the site has actually indexed, so merging them would quietly drop
// people from results for a reason nobody could see.
const SEEN_OPTIONS = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "180", label: "Last 6 months", days: 180 },
  { key: "old", label: "Over 6 months ago", days: -180 },
];

type SortKey = "name" | "parse" | "level" | "mounts" | "rare";

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Avatar({ m, size = 11 }: { m: Member; size?: number }) {
  const [broken, setBroken] = useState(false);
  const cls = size === 11 ? "size-11" : "size-9";
  const face = (!m.avatar || broken) ? (
    <div className={`${cls} flex items-center justify-center rounded-full border border-line font-data text-[12px] font-semibold text-bg`}
         style={{ background: `hsl(${hue(m.name)} 45% 68%)` }}>
      {initials(m.name)}
    </div>
  ) : (
    <div className={`${cls} overflow-hidden rounded-full border border-line bg-card`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.avatar} alt="" loading="lazy" className="block size-full object-cover"
           onError={() => setBroken(true)} />
    </div>
  );
  return (
    <div className="relative shrink-0">
      {face}
      <PresenceDot m={m} size={size} />
    </div>
  );
}

/** Discord-style presence dot: green when active, dimmed when the member is on vacation. */
function PresenceDot({ m, size = 11 }: { m: Member; size?: number }) {
  const away = isOnVacation(m);
  const label = away ? ON_VACATION_RANK : "Active";
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`absolute bottom-0 right-0 rounded-full border-2 border-surface ${
        size === 11 ? "size-3.5" : "size-3"} ${
        away ? "bg-[#747f8d]" : "bg-[#43b581]"}`}
    />
  );
}

interface Adv {
  lfg: string; rank: string;
  boss: number[]; lvMin: string; race: string; activity: string;
  /** Extreme trials that must all be cleared, by boss name. */
  ex: string[];
  /** "Last seen collecting" window, from SEEN_OPTIONS. */
  seen: string;
}
const ADV_EMPTY: Adv = {
  lfg: "", rank: "", boss: [], lvMin: "",
  race: "", activity: "", ex: [], seen: "",
};

const daysSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000);

export default function MemberBoard({ data }: { data: BoardData }) {
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];
  const extremes = data.extremes ?? [];
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [view, setView] = useState<"list" | "kitchen">("list");
  const [adv, setAdv] = useState<Adv>(ADV_EMPTY);
  const [advOpen, setAdvOpen] = useState(false);
  const [overlays, setOverlays] = useState<Record<number, Overlay>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const inited = useRef(false);

  // Read filters back out of the URL on mount, so a filtered link can be shared
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tag")) setTag(p.get("tag")!);
    if (p.get("q")) setQuery(p.get("q")!);
    if (p.get("sort")) setSortBy(p.get("sort") as SortKey);
    if (p.get("view") === "kitchen") setView("kitchen");
    const boss = (p.get("boss") ?? "").split(",").filter(Boolean).map(Number);
    const ex = (p.get("ex") ?? "").split(",").filter(Boolean);
    setAdv({
      lfg: p.get("lfg") ?? "", rank: p.get("rank") ?? "",
      boss,
      lvMin: p.get("lv") ?? "", race: p.get("race") ?? "",
      activity: p.get("act") ?? "", ex, seen: p.get("seen") ?? "",
    });
    if (p.get("lfg") || p.get("rank") ||
        boss.length || ex.length || p.get("lv") || p.get("race") ||
        p.get("act") || p.get("seen")) setAdvOpen(true);
    inited.current = true;
  }, []);

  // Mirror state back into the URL
  useEffect(() => {
    if (!inited.current) return;
    const p = new URLSearchParams();
    if (tag !== "all") p.set("tag", tag);
    if (query) p.set("q", query);
    if (sortBy !== "name") p.set("sort", sortBy);
    if (view === "kitchen") p.set("view", "kitchen");
    if (adv.lfg) p.set("lfg", adv.lfg);
    if (adv.rank) p.set("rank", adv.rank);
    if (adv.boss.length) p.set("boss", adv.boss.join(","));
    if (adv.ex.length) p.set("ex", adv.ex.join(","));
    if (adv.lvMin) p.set("lv", adv.lvMin);
    if (adv.race) p.set("race", adv.race);
    if (adv.activity) p.set("act", adv.activity);
    if (adv.seen) p.set("seen", adv.seen);
    const qs = p.toString();
    window.history.replaceState(null, "",
      qs ? `?${qs}` : window.location.pathname);
  }, [tag, query, sortBy, view, adv]);

  // Profiles + overrides from Supabase
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const BASE = "character_id, bio, accent_color, discord_username, lfg, banner";
    const V3 = `${BASE}, nickname, birth_month, birth_day`;
    // Selecting a column that does not exist fails the whole query, which would blank
    // every profile overlay on the board. Fall back to the pre-v3 column list so the
    // board still works on a database where migration_v3.sql has not been run yet.
    const load = (cols: string) =>
      supabase.from("profiles").select(cols).not("character_id", "is", null);

    load(V3).then(async ({ data, error }) => {
      const rows = error ? (await load(BASE)).data : data;
      const map: Record<number, Overlay> = {};
      for (const r of (rows ?? []) as unknown as Record<string, unknown>[]) {
        const id = r.character_id as number | null;
        if (id == null) continue;
        map[id] = {
          bio: r.bio as string | null,
          accent: r.accent_color as string | null,
          discord: r.discord_username as string | null,
          lfg: (r.lfg as string[] | null) ?? [], banner: r.banner as string | null,
          nickname: (r.nickname as string | null) ?? null,
          birthMonth: (r.birth_month as number | null) ?? null,
          birthDay: (r.birth_day as number | null) ?? null,
        };
      }
      setOverlays(map);
    });
    supabase.from("member_overrides").select("character_id").eq("hidden", true)
      .then(({ data: rows }) =>
        setHiddenIds(new Set((rows ?? []).map((r) => r.character_id as number))));
  }, []);

  const visible = useMemo(
    () => data.members.filter((m) => !hiddenIds.has(m.id)),
    [data.members, hiddenIds]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: visible.length };
    for (const m of visible) for (const t of m.tags) c[t] = (c[t] ?? 0) + 1;
    return c;
  }, [visible]);

  const ranks = useMemo(() => {
    const set = new Set(visible.map((m) => m.rank).filter(Boolean) as string[]);
    return [...set].sort(
      (a, b) => (RANK_ORDER.indexOf(a) + 99) - (RANK_ORDER.indexOf(b) + 99));
  }, [visible]);

  // Head count per race. Empty until the pipeline has scraped character pages,
  // which is why the race filter hides itself when nothing has been collected yet.
  const races = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of visible) if (m.race) c[m.race] = (c[m.race] ?? 0) + 1;
    return Object.entries(c).sort(
      (a, b) => (RACE_ORDER.indexOf(a[0]) + 99) - (RACE_ORDER.indexOf(b[0]) + 99));
  }, [visible]);
  const racedCount = useMemo(
    () => races.reduce((s, [, n]) => s + n, 0), [races]);

  const activityCounts = useMemo(() => {
    const vacation = visible.filter(isOnVacation).length;
    return { active: visible.length - vacation, vacation };
  }, [visible]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lv = Number(adv.lvMin) || null;
    const filtered = visible.filter((m) => {
      if (tag !== "all" && !m.tags.includes(tag)) return false;
      // Search covers race and clan too, so "viera" or "seeker" find people by look
      // without having to open the filter panel first.
      if (q && ![m.name, m.race, m.clan].some(
        (f) => f && f.toLowerCase().includes(q))) return false;
      const ov = overlays[m.id];
      if (adv.lfg && !(ov?.lfg ?? []).includes(adv.lfg)) return false;
      if (adv.rank && m.rank !== adv.rank) return false;
      if (adv.race && m.race !== adv.race) return false;
      if (adv.activity === "active" && isOnVacation(m)) return false;
      if (adv.activity === "vacation" && !isOnVacation(m)) return false;
      if (adv.seen) {
        // Members with no acquisition data can't satisfy a "last seen" window, so
        // they drop out rather than being silently counted as recently active.
        if (!m.last_active) return false;
        const d = daysSince(m.last_active);
        const want = SEEN_OPTIONS.find((o) => o.key === adv.seen);
        if (!want) return false;
        if (want.days > 0 ? d > want.days : d <= -want.days) return false;
      }
      for (const i of adv.boss) if (!m.current_clears?.[i]) return false;
      for (const name of adv.ex) if (!m.ex_cleared?.includes(name)) return false;
      if (lv != null && (m.level ?? 0) < lv) return false;
      return true;
    });
    const val = (m: Member): number =>
      sortBy === "level" ? (m.level ?? -1)
      : sortBy === "parse" ? (m.parse ?? -1)
      : sortBy === "mounts" ? (m.mounts ?? -1)
      : (m.rare_achv ?? -1);
    // Active members always sort above the ~320 marked On vacation, whatever the
    // chosen order is. Otherwise the first screen of the board is mostly people who
    // are not playing, which is nobody's reason for opening it.
    return [...filtered].sort((a, b) =>
      (isOnVacation(a) ? 1 : 0) - (isOnVacation(b) ? 1 : 0) ||
      (sortBy === "name" ? a.name.localeCompare(b.name) : val(b) - val(a)));
  }, [visible, overlays, tag, query, sortBy, adv]);

  const advCount = (adv.lfg ? 1 : 0) + (adv.rank ? 1 : 0) +
    adv.boss.length + adv.ex.length +
    (adv.lvMin ? 1 : 0) + (adv.race ? 1 : 0) + (adv.activity ? 1 : 0) +
    (adv.seen ? 1 : 0);

  // How many members we actually have acquisition dates for. Shown next to the
  // "last seen" filter so a small result set reads as missing data, not inactivity.
  const seenKnown = useMemo(
    () => visible.filter((m) => m.last_active).length, [visible]);

  // How many members cleared each extreme, so the chips can show what is worth picking.
  const exCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of visible) for (const n of m.ex_cleared ?? []) c[n] = (c[n] ?? 0) + 1;
    return c;
  }, [visible]);

  const selCls = "rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink";

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-3.5 pb-4 pt-6">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Members</h1>
          <div className="mt-0.5 text-[13.5px] text-muted">
            ✦ = verified via Discord · click a name for the full profile
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/compare"
                className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted no-underline hover:border-amber hover:text-amber">
            ⚖️ Compare two
          </Link>
          <button
            onClick={() => setView(view === "list" ? "kitchen" : "list")}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] ${
              view === "kitchen"
                ? "border-amber bg-amber/10 text-amber"
                : "border-line text-muted hover:border-muted hover:text-ink"}`}>
            🍲 Kitchen view
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search character name…" aria-label="Search character name"
                 className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="Sort by"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <option value="name">Sort by name</option>
            <option value="parse">Sort by parse</option>
            <option value="level">Sort by level</option>
            <option value="mounts">Sort by mounts</option>
            <option value="rare">Sort by rare achv</option>
          </select>
          <button onClick={() => setAdvOpen(!advOpen)}
                  className={`rounded-lg border px-3.5 py-2 text-[13.5px] ${
                    advOpen || advCount
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-line bg-surface text-muted hover:border-muted"}`}>
            Advanced filters{advCount ? ` (${advCount})` : ""}
          </button>
        </div>

        {advOpen && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
            {advCount > 0 && (
              <button onClick={() => setAdv(ADV_EMPTY)}
                      className="self-end text-[12.5px] text-muted underline hover:text-ink">
                Clear all {advCount} filter{advCount > 1 ? "s" : ""}
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                Who
              </span>
            <select value={adv.lfg} onChange={(e) => setAdv({ ...adv, lfg: e.target.value })}
                    className={selCls} aria-label="Looking-for status">
              <option value="">Looking for: any</option>
              {LFG_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <select value={adv.rank} onChange={(e) => setAdv({ ...adv, rank: e.target.value })}
                    className={selCls} aria-label="FC rank">
              <option value="">Rank: any</option>
              {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={adv.activity}
                    onChange={(e) => setAdv({ ...adv, activity: e.target.value })}
                    className={selCls} aria-label="Activity status">
              <option value="">Activity: any</option>
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({activityCounts[o.key as "active" | "vacation"]})
                </option>
              ))}
            </select>
            {races.length > 0 && (
              <select value={adv.race}
                      onChange={(e) => setAdv({ ...adv, race: e.target.value })}
                      className={selCls} aria-label="Race">
                <option value="">Race: any ({racedCount})</option>
                {races.map(([r, n]) => (
                  <option key={r} value={r}>{r} ({n})</option>
                ))}
              </select>
            )}
            {seenKnown > 0 && (
              <select value={adv.seen}
                      onChange={(e) => setAdv({ ...adv, seen: e.target.value })}
                      className={selCls} aria-label="Last seen collecting"
                      title={`Based on mount, minion and achievement dates — known for ${seenKnown} of ${visible.length} members`}>
                <option value="">Last seen: any ({seenKnown} known)</option>
                {SEEN_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            )}
            <input type="number" min={1} max={100} value={adv.lvMin}
                   onChange={(e) => setAdv({ ...adv, lvMin: e.target.value })}
                   placeholder="Lv ≥" aria-label="Minimum level"
                   className="w-20 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink placeholder:text-muted" />
            </div>

            {/* Current-patch content, one chip per fight. Chips are AND-ed, so picking
                three bosses finds people who cleared all three. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-line pt-3">
              <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
                This patch
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] text-muted">Savage</span>
                {labels.map((lb, i) => {
                  const on = adv.boss.includes(i);
                  const n = visible.filter((m) => m.current_clears?.[i]).length;
                  return (
                    <button key={lb}
                      onClick={() => setAdv({ ...adv,
                        boss: on ? adv.boss.filter((x) => x !== i) : [...adv.boss, i] })}
                      aria-pressed={on}
                      className={`rounded-md border px-2 py-1 font-data text-[11.5px] ${
                        on ? "border-chili bg-chili/15 text-chili"
                           : "border-line text-muted hover:border-muted"}`}
                      title={`Cleared ${lb} — ${n} member${n === 1 ? "" : "s"}`}>
                      {lb}<small className="ml-1 opacity-70">{n}</small>
                    </button>
                  );
                })}
              </span>

              {extremes.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] text-muted">Extreme</span>
                  {extremes.map((name) => {
                    const on = adv.ex.includes(name);
                    const n = exCounts[name] ?? 0;
                    return (
                      <button key={name}
                        onClick={() => setAdv({ ...adv,
                          ex: on ? adv.ex.filter((x) => x !== name) : [...adv.ex, name] })}
                        aria-pressed={on}
                        className={`rounded-md border px-2 py-1 text-[11.5px] ${
                          on ? "border-[#c86fd1] bg-[#c86fd1]/15 text-[#d79ade]"
                             : "border-line text-muted hover:border-muted"}`}
                        title={`Cleared ${name} — ${n} member${n === 1 ? "" : "s"}`}>
                        {name}<small className="ml-1 opacity-70">{n}</small>
                      </button>
                    );
                  })}
                </span>
              )}

            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {Object.keys(TAG_LABELS).map((key) => {
            if (key !== "all" && !counts[key]) return null;
            const on = tag === key;
            return (
              <button key={key} onClick={() => setTag(key)} aria-pressed={on}
                title={TAG_HELP[key] ?? ""}
                className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-1.5 pl-2.5 text-[13.5px] transition-colors ${
                  on ? "border-amber bg-amber/10 text-amber"
                     : "border-line bg-card text-muted hover:border-muted hover:text-ink"}`}>
                <span className={`size-[5px] rounded-full ${
                  on ? "bg-amber shadow-[0_0_8px_rgba(232,163,61,0.7)]" : "bg-line"}`} />
                {TAG_LABELS[key]}
                <small className="font-data text-[11px] opacity-75">{counts[key] ?? 0}</small>
              </button>
            );
          })}
        </div>

        <div className="text-[13px] text-muted">
          Showing {list.length} of {visible.length} members
        </div>
      </div>

      {view === "kitchen" ? (
        <div className="mt-2.5 flex flex-col gap-5">
          {ranks.map((r) => {
            const group = list.filter((m) => m.rank === r);
            if (!group.length) return null;
            return (
              <div key={r}>
                <div className="mb-2 font-display text-[15px] font-semibold text-amber">
                  {r} <span className="text-[12px] font-normal text-muted">({group.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {group.map((m) => (
                    <Link key={m.id} href={`/member/${m.id}`}
                          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 no-underline transition-colors hover:border-amber">
                      <Avatar m={m} size={9} />
                      <span className="min-w-0">
                        <span className="block truncate font-data text-[13px] font-semibold text-ink">
                          {m.name}
                          {overlays[m.id] && <span className="ml-1 text-amber">✦</span>}
                        </span>
                        <span className="block text-[11px] text-muted">Lv {m.level ?? "—"}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
              No members match those filters — try clearing the search or filters
            </div>
          ) : (
            list.map((m) => {
              const ov = overlays[m.id];
              const accent = ov?.accent ?? "#e8a33d";
              const meta = [m.rank ?? "—", `Lv ${m.level ?? "—"}`];
              if (m.race) meta.push(m.race);
              if (m.mounts != null) meta.push(`${m.mounts} mounts`);
              if (m.rare_achv != null) meta.push(`${m.rare_achv} rare achv`);
              return (
                <div key={m.id}
                     className="grid grid-cols-[44px_1fr] items-center gap-x-3.5 gap-y-2 rounded-xl border border-line bg-surface p-3.5 transition-colors [content-visibility:auto] hover:border-[#55492f] sm:grid-cols-[44px_minmax(150px,1.3fr)_1.6fr_auto] sm:px-4">
                  <Link href={`/member/${m.id}`} className="contents">
                    <Avatar m={m} />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/member/${m.id}`}
                          className="truncate font-data text-[15px] font-semibold tracking-[0.01em] text-ink no-underline hover:text-amber">
                      {m.name}
                      {ov && (
                        <span className="ml-1.5" style={{ color: accent }}
                              title={ov.discord ? `Linked Discord: ${ov.discord}` : "Verified"}>
                          ✦
                        </span>
                      )}
                    </Link>
                    <div className="text-[12.5px] text-muted">{meta.join(" · ")}</div>
                    {ov?.bio && (
                      <div className="mt-0.5 truncate text-[12px] italic" style={{ color: accent }}>
                        &ldquo;{ov.bio}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-auto">
                    {m.tags.map((t) => {
                      const ults = m.ult_cleared ?? [];
                      // Which Ultimates, not just that there were some: UCOB and FRU
                      // are worlds apart and the shorthand is what people use.
                      const abbr = t === "ultimate" && ults.length
                        ? ults.map(ultimateAbbr) : null;
                      return (
                        <span key={t}
                              title={abbr ? `Cleared: ${ults.join(", ")}` : (TAG_HELP[t] ?? "")}
                              className={`whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${TAG_CLASS[t] ?? "border-line text-muted"}`}>
                          {abbr ? abbr.join(" · ") : (TAG_LABELS[t] ?? t)}
                          {t === "extreme" && (m.ex_cleared?.length ?? 0) > 0 && (
                            <small className="ml-1 opacity-75">
                              {m.ex_cleared!.length}/{extremes.length || "?"}
                            </small>
                          )}
                        </span>
                      );
                    })}
                    {(ov?.lfg ?? []).map((k) => {
                      const o = LFG_OPTIONS.find((x) => x.key === k);
                      return o ? (
                        <span key={k}
                              className="whitespace-nowrap rounded-full border border-dashed border-amber/60 px-2.5 py-[3px] text-[11.5px] text-amber">
                          {o.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="col-start-2 flex items-center gap-3.5 sm:col-start-auto sm:justify-self-end">
                    <Link href={`/member/${m.id}`}
                          className="rounded-md border border-line px-2.5 py-1 font-data text-[10.5px] tracking-[0.06em] text-muted no-underline transition-colors hover:border-amber hover:text-amber">
                      PROFILE
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
