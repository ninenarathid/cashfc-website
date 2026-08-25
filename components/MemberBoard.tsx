"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BoardData, Member, Overlay } from "@/lib/types";
import { BOARD_QUERY_KEY } from "@/lib/types";
import {
  ACHV_TIER_LABEL, LFG_OPTIONS, RANK_ORDER, RACE_ORDER, isOnVacation,
  ON_VACATION_RANK,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import MemberTags, { TAG_CLASS, TAG_LABELS, tagHelp } from "@/components/MemberTags";
import TagIcon from "@/components/TagIcon";
import { useLang } from "@/lib/i18n";
import JobIcon, {
  ALL_JOBS, ROLE_GROUP, ROLE_LABEL, ROLE_ORDER, jobRole, jobRoleGroup,
} from "@/components/JobIcon";
import TagLegend from "@/components/TagLegend";


// Defaults to Active. Nearly two thirds of the roster is marked On vacation, so
// opening on the whole list mostly shows people who are not playing — the wrong
// answer to "who is around?", which is why anyone opens this page.
const ACTIVITY_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "vacation", label: "On vacation" },
  { key: "all", label: "Everyone" },
];
const ACTIVITY_DEFAULT = "active";
type SortKey = "name" | "mounts" | "rare";

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
  boss: number[]; race: string; activity: string;
  /** Any job of this role with a recorded score. */
  role: string;
  /** One specific job with a recorded score. */
  job: string;
  /** Extreme trials that must all be cleared, by boss name. */
  ex: string[];
  /** Tags a member must have *all* of. The chip row above picks one; this narrows. */
  tags: string[];
  /** Lowest grade a member must hold — scoped by the job and tag filters. */
  grade: string;
}
const ADV_EMPTY: Adv = {
  lfg: "", rank: "", boss: [],
  race: "", activity: ACTIVITY_DEFAULT, ex: [], role: "", job: "",
  tags: [], grade: "",
};

/**
 * Grades are a ladder, so picking one means "this or better": somebody filtering for
 * Expert crafters does not want the Legendary ones hidden.
 */
const GRADE_RANK: Record<string, number> = { expert: 1, master: 2, legendary: 3 };
const GRADES = ["legendary", "master", "expert"] as const;

/**
 * The role filter takes either one precise role or a whole group. Splitting Healer
 * into Pure and Barrier made "find me a healer" cost two searches, which is the
 * wrong trade — the split is meant to let you be specific, not to stop you being
 * general.
 */
const GROUP_PREFIX = "group:";
const roleGroups = ["Tanks", "Healers", "DPS"] as const;
const roleMatches = (job: string, sel: string) =>
  sel.startsWith(GROUP_PREFIX)
    ? jobRoleGroup(job) === sel.slice(GROUP_PREFIX.length)
    : jobRole(job) === sel;

export default function MemberBoard({ data }: { data: BoardData }) {
  const { t, lang } = useLang();
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];
  const extremes = data.extremes ?? [];
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [view, setView] = useState<"list" | "kitchen">("list");
  const [adv, setAdv] = useState<Adv>(ADV_EMPTY);
  const [overlays, setOverlays] = useState<Record<number, Overlay>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const inited = useRef(false);

  // Read filters back out of the URL on mount, so a filtered link can be shared
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQuery(p.get("q")!);
    if (p.get("sort")) setSortBy(p.get("sort") as SortKey);
    if (p.get("view") === "kitchen") setView("kitchen");
    const boss = (p.get("boss") ?? "").split(",").filter(Boolean).map(Number);
    const ex = (p.get("ex") ?? "").split(",").filter(Boolean);
    const single = p.get("tag");
    const tags = [...new Set([
      ...(single && single !== "all" ? [single] : []),
      ...(p.get("tags") ?? "").split(",").filter(Boolean),
    ])];
    setAdv({
      lfg: p.get("lfg") ?? "", rank: p.get("rank") ?? "",
      boss,
      race: p.get("race") ?? "",
      activity: p.get("act") ?? ACTIVITY_DEFAULT, ex,
      role: p.get("role") ?? "", job: p.get("job") ?? "", tags,
      grade: p.get("grade") ?? "",
    });
    inited.current = true;
  }, []);

  // Mirror state back into the URL
  useEffect(() => {
    if (!inited.current) return;
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sortBy !== "name") p.set("sort", sortBy);
    if (view === "kitchen") p.set("view", "kitchen");
    if (adv.lfg) p.set("lfg", adv.lfg);
    if (adv.rank) p.set("rank", adv.rank);
    if (adv.boss.length) p.set("boss", adv.boss.join(","));
    if (adv.ex.length) p.set("ex", adv.ex.join(","));
    if (adv.race) p.set("race", adv.race);
    if (adv.activity !== ACTIVITY_DEFAULT) p.set("act", adv.activity);
    if (adv.role) p.set("role", adv.role);
    if (adv.job) p.set("job", adv.job);
    if (adv.tags.length) p.set("tags", adv.tags.join(","));
    if (adv.grade) p.set("grade", adv.grade);
    const qs = p.toString();
    window.history.replaceState(null, "",
      qs ? `?${qs}` : window.location.pathname);
    // So a member page can offer a way back to this exact list.
    try { sessionStorage.setItem(BOARD_QUERY_KEY, qs); } catch { /* private mode */ }
  }, [query, sortBy, view, adv]);

  // Profiles + overrides from Supabase
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const BASE = "character_id, bio, accent_color, discord_username, lfg, banner";
    const V3 = `${BASE}, nickname, birth_month, birth_day, character_verified_at`;
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
          verifiedAt: (r.character_verified_at as string | null) ?? null,
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

  // Everything the secondary filters count is counted within the activity selection,
  // so switching to Active re-labels them all. A "Crafter 12" that still says 12
  // after narrowing to the active roster is telling you about people you excluded.
  const inScope = useMemo(
    () => visible.filter((m) =>
      adv.activity === "active" ? !isOnVacation(m)
      : adv.activity === "vacation" ? isOnVacation(m)
      : true),
    [visible, adv.activity]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inScope.length };
    for (const m of inScope) for (const t of m.tags) c[t] = (c[t] ?? 0) + 1;
    return c;
  }, [inScope]);

  const ranks = useMemo(() => {
    const set = new Set(inScope.map((m) => m.rank).filter(Boolean) as string[]);
    return [...set].sort(
      (a, b) => (RANK_ORDER.indexOf(a) + 99) - (RANK_ORDER.indexOf(b) + 99));
  }, [inScope]);

  // Head count per race. Empty until the pipeline has scraped character pages,
  // which is why the race filter hides itself when nothing has been collected yet.
  const races = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of inScope) if (m.race) c[m.race] = (c[m.race] ?? 0) + 1;
    return Object.entries(c).sort(
      (a, b) => (RACE_ORDER.indexOf(a[0]) + 99) - (RACE_ORDER.indexOf(b[0]) + 99));
  }, [inScope]);
  const racedCount = useMemo(
    () => races.reduce((s, [, n]) => s + n, 0), [races]);

  // Who plays what, from any recorded score rather than only graded ones — someone
  // can play a job perfectly well without being teaching material.
  const roleCounts = useMemo(() => {
    const c: Record<string, number> = { total: 0 };
    for (const r of ROLE_ORDER) c[r] = 0;
    for (const g of roleGroups) c[GROUP_PREFIX + g] = 0;
    for (const m of inScope) {
      const roles = new Set(Object.keys(m.job_scores ?? {}).map(jobRole));
      if (roles.size) c.total += 1;
      for (const r of roles) if (r) c[r] += 1;
      // Counted once per member, not once per job, so somebody who plays both a
      // Pure and a Barrier healer is one healer rather than two.
      for (const g of new Set([...roles].map((r) => r && ROLE_GROUP[r])))
        if (g) c[GROUP_PREFIX + g] += 1;
    }
    return c;
  }, [inScope]);

  const jobsPlayed = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of inScope) {
      for (const j of Object.keys(m.job_scores ?? {})) c[j] = (c[j] ?? 0) + 1;
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [inScope]);

  const gradeCounts = useMemo(() => {
    const c: Record<string, number> = { total: 0 };
    for (const g of GRADES) c[g] = 0;
    for (const m of inScope) {
      const held = [
        ...Object.values(m.achv_tiers ?? {}),
        ...Object.values(m.job_scores ?? {}).map((j) => j.tier),
      ].filter(Boolean) as string[];
      if (!held.length) continue;
      c.total += 1;
      const best = Math.max(...held.map((t) => GRADE_RANK[t] ?? 0));
      for (const g of GRADES) if (best >= GRADE_RANK[g]) c[g] += 1;
    }
    return c;
  }, [inScope]);

  const activityCounts = useMemo(() => {
    const vacation = visible.filter(isOnVacation).length;
    return { active: visible.length - vacation, vacation };
  }, [visible]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = visible.filter((m) => {
      // AND, not OR: "Crafter and Gatherer" should mean someone who is both.
      for (const t of adv.tags) if (!m.tags.includes(t)) return false;
      const ov = overlays[m.id];
      // Search covers the nickname, race and clan too — in the FC people go by their
      // nickname, so that is what somebody types, and "viera" or "seeker" find people
      // by look without having to open the filter panel first.
      if (q && ![m.name, ov?.nickname, m.race, m.clan].some(
        (f) => f && f.toLowerCase().includes(q))) return false;
      if (adv.lfg && !(ov?.lfg ?? []).includes(adv.lfg)) return false;
      if (adv.rank && m.rank !== adv.rank) return false;
      if (adv.race && m.race !== adv.race) return false;
      // A recorded score is enough to count as playing the job. Requiring a tier
      // would hide everyone who plays it competently but is not teaching material.
      if (adv.role || adv.job) {
        const played = Object.keys(m.job_scores ?? {});
        if (adv.job && !played.includes(adv.job)) return false;
        if (adv.role && !played.some((j) => roleMatches(j, adv.role))) return false;
      }
      if (adv.grade) {
        const min = GRADE_RANK[adv.grade] ?? 0;
        const tiers = m.achv_tiers ?? {};
        const jobs = m.job_scores ?? {};
        const ok = (t?: string | null) => !!t && (GRADE_RANK[t] ?? 0) >= min;
        // Scoped to whatever else is selected, so "Legendary" beside "Crafter" asks
        // for a Legendary crafter rather than a Legendary anything who also crafts.
        // Any one of the selected tags counts: requiring the grade in all of them
        // would leave almost nobody once two tags are picked.
        const names = Object.keys(jobs);
        const scopedJobs = adv.job ? names.filter((j) => j === adv.job)
          : adv.role ? names.filter((j) => roleMatches(j, adv.role))
          : null;
        const scopedTags = adv.tags.length ? adv.tags : null;
        if (scopedJobs || scopedTags) {
          if (!(scopedJobs ?? []).some((j) => ok(jobs[j]?.tier))
              && !(scopedTags ?? []).some((t) => ok(tiers[t]))) return false;
        } else if (!names.some((j) => ok(jobs[j]?.tier))
                   && !Object.values(tiers).some((t) => ok(t))) {
          return false;
        }
      }
      if (adv.activity === "active" && isOnVacation(m)) return false;
      if (adv.activity === "vacation" && !isOnVacation(m)) return false;
      for (const i of adv.boss) if (!m.current_clears?.[i]) return false;
      for (const name of adv.ex) if (!m.ex_cleared?.includes(name)) return false;
      return true;
    });
    const val = (m: Member): number =>
      sortBy === "mounts" ? (m.mounts ?? -1)
      : (m.rare_achv ?? -1);
    // Active members always sort above the ~320 marked On vacation, whatever the
    // chosen order is. Otherwise the first screen of the board is mostly people who
    // are not playing, which is nobody's reason for opening it.
    return [...filtered].sort((a, b) =>
      (isOnVacation(a) ? 1 : 0) - (isOnVacation(b) ? 1 : 0) ||
      (sortBy === "name" ? a.name.localeCompare(b.name) : val(b) - val(a)));
  }, [visible, overlays, query, sortBy, adv]);

  const advCount = (adv.lfg ? 1 : 0) + (adv.rank ? 1 : 0) +
    adv.boss.length + adv.ex.length +
    (adv.race ? 1 : 0) + (adv.role ? 1 : 0) + (adv.job ? 1 : 0) +
    (adv.grade ? 1 : 0) +
    adv.tags.length;

  // How many members we actually have acquisition dates for. Shown next to the
  // "last seen" filter so a small result set reads as missing data, not inactivity.
  // How many members cleared each extreme, so the chips can show what is worth picking.
  const exCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of inScope) for (const n of m.ex_cleared ?? []) c[n] = (c[n] ?? 0) + 1;
    return c;
  }, [inScope]);

  const selCls = "rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink";

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-3.5 pb-4 pt-6">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Members</h1>
          <div className="mt-0.5 text-[13.5px] text-muted">
            {t("board.verifiedHint")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "list" ? "kitchen" : "list")}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] ${
              view === "kitchen"
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-muted hover:border-muted hover:text-ink"}`}>
            🍲 Kitchen view
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {/* Top level, not tucked inside the advanced panel: on a roster where most
            people are on vacation, this is the first cut almost everyone wants. */}
        <div className="inline-flex self-start rounded-lg border border-line bg-surface p-0.5"
             role="group" aria-label="Filter by activity">
          {ACTIVITY_OPTIONS.map((o) => {
            const on = adv.activity === o.key;
            const n = o.key === "active" ? activityCounts.active
              : o.key === "vacation" ? activityCounts.vacation
              : visible.length;
            return (
              <button key={o.key} onClick={() => setAdv({ ...adv, activity: o.key })}
                      aria-pressed={on}
                      className={`rounded-md px-3.5 py-1.5 text-[13.5px] transition-colors ${
                        on ? "bg-accent/15 text-accent"
                           : "text-muted hover:text-ink"}`}>
                {o.key !== "all" && (
                  <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${
                    o.key === "active" ? "bg-[#43b581]" : "bg-[#747f8d]"}`} />
                )}
                {o.label}
                <small className="ml-1.5 font-data opacity-70">{n}</small>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder={t("board.search")} aria-label={t("board.search")}
                 className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="Sort by"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <option value="name">{t("board.sortName")}</option>
            <option value="mounts">{t("board.sortMounts")}</option>
            <option value="rare">{t("board.sortRare")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
          {advCount > 0 && (
            <button onClick={() => setAdv(ADV_EMPTY)}
                    className="self-end text-[12.5px] text-muted underline hover:text-ink">
              {t("board.clearAll", { n: advCount })}
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
          {/* Recruiting questions are usually shaped "a tank who is progging", so
              role sits next to the other who-are-they filters rather than under
              raiding. Counts come from who has a recorded score on such a job. */}
          {roleCounts.total > 0 && (
            <select value={adv.role}
                    onChange={(e) => setAdv({ ...adv, role: e.target.value, job: "" })}
                    className={selCls} aria-label="Role played">
              <option value="">{t("board.roleAny")}</option>
              {roleGroups.map((group) => {
                const fine = ROLE_ORDER.filter((r) => ROLE_GROUP[r] === group);
                const all = GROUP_PREFIX + group;
                return (
                  <optgroup key={group} label={group}>
                    {/* An optgroup label cannot be selected, so the whole group
                        gets its own entry. Skipped where the group holds a single
                        role, which would just be the same option twice. */}
                    {fine.length > 1 && (
                      <option value={all} disabled={!roleCounts[all]}>
                        {group === "DPS" ? t("board.anyDps")
                          : group === "Healers" ? t("board.anyHealer")
                          : t("board.anyTank")}
                        {" "}({roleCounts[all]})
                      </option>
                    )}
                    {fine.map((r) => (
                      <option key={r} value={r} disabled={!roleCounts[r]}>
                        {fine.length > 1 ? " " : ""}{ROLE_LABEL[r]} ({roleCounts[r]})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          )}
          {jobsPlayed.length > 0 && (
            <select value={adv.job}
                    onChange={(e) => setAdv({ ...adv, job: e.target.value })}
                    className={selCls} aria-label="Job played">
              <option value="">{t("board.jobAny")}</option>
              {jobsPlayed.map(([job, n]) => (
                <option key={job} value={job}>{job} ({n})</option>
              ))}
            </select>
          )}
          {/* Sits after job and before race because it narrows the two filters
              above it rather than standing alone: with a job or a tag picked it
              asks for that grade in that thing, and on its own it asks for anyone
              carrying it. */}
          {gradeCounts.total > 0 && (
            <select value={adv.grade}
                    onChange={(e) => setAdv({ ...adv, grade: e.target.value })}
                    className={selCls} aria-label="Lowest grade held"
                    title="Applies to the job or tag you have selected, if any">
              <option value="">{t("board.gradeAny")}</option>
              {GRADES.map((g) => (
                <option key={g} value={g} disabled={!gradeCounts[g]}>
                  {ACHV_TIER_LABEL[g]}+ ({gradeCounts[g]})
                </option>
              ))}
            </select>
          )}
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
          </div>

          {/* Every tag, AND-ed — the only tag filter on the board. A second row
              of single-select chips sat below this one saying the same thing with
              one chip picked, which left two controls disagreeing about what was
              selected. */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-line pt-3">
            <span className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
              Has all of
            </span>
            {Object.keys(TAG_LABELS)
              .filter((tag) => tag !== "all" && counts[tag])
              .map((tag) => {
                const on = adv.tags.includes(tag);
                return (
                  <button key={tag}
                    onClick={() => setAdv({ ...adv,
                      tags: on ? adv.tags.filter((x) => x !== tag) : [...adv.tags, tag] })}
                    aria-pressed={on}
                    title={tagHelp(tag, lang)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] ${
                      on ? TAG_CLASS[tag] ?? "border-accent bg-accent/15 text-accent"
                         : "border-line text-muted hover:border-muted"}`}>
                    <TagIcon tag={tag} size={13} />
                    {TAG_LABELS[tag]}
                    <small className="ml-1 opacity-70">{counts[tag]}</small>
                  </button>
                );
              })}
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
                const n = inScope.filter((m) => m.current_clears?.[i]).length;
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

        <div className="text-[13px] text-muted">
          {/* Names the activity scope rather than only the raw numbers: with Active
              as the default, "179 of 502" on its own reads like something is broken. */}
          {t(adv.activity === "active" ? "board.showingActive"
             : adv.activity === "vacation" ? "board.showingVacation"
             : "board.showing",
             { shown: list.length,
               total: adv.activity === "active" ? activityCounts.active
                 : adv.activity === "vacation" ? activityCounts.vacation
                 : visible.length })}
          {adv.activity !== "all" && (
            <>
              {" · "}
              <button onClick={() => setAdv({ ...adv, activity: "all" })}
                      className="underline hover:text-ink">
                {t("board.showEveryone")}
              </button>
            </>
          )}
        </div>

        <TagLegend present={new Set(Object.keys(counts))} />
      </div>

      {view === "kitchen" ? (
        <div className="mt-2.5 flex flex-col gap-5">
          {ranks.map((r) => {
            const group = list.filter((m) => m.rank === r);
            if (!group.length) return null;
            return (
              <div key={r}>
                <div className="mb-2 font-display text-[15px] font-semibold text-accent">
                  {r} <span className="text-[12px] font-normal text-muted">({group.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {group.map((m) => (
                    <Link key={m.id} href={`/member/${m.id}`}
                          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 no-underline transition-colors hover:border-accent">
                      <Avatar m={m} size={9} />
                      <span className="min-w-0">
                        <span className="block truncate font-data text-[13px] font-semibold text-ink">
                          {m.name}
                          {overlays[m.id] && <span className="ml-1 text-accent">✦</span>}
                        </span>
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
              const accent = ov?.accent ?? "#6aa9e0";
              const meta = [m.rank ?? "—"];
              if (m.race) meta.push(m.race);
              if (m.mounts != null) meta.push(`${m.mounts} mounts`);
              if (m.rare_achv != null) meta.push(`${m.rare_achv} rare achv`);
              return (
                <div key={m.id}
                     className="grid grid-cols-[44px_1fr] items-center gap-x-3.5 gap-y-2 rounded-xl border border-line bg-surface p-3.5 transition-colors [content-visibility:auto] hover:border-[#55492f] sm:grid-cols-[44px_minmax(150px,1fr)_minmax(0,2.2fr)] sm:px-4">
                  <Link href={`/member/${m.id}`} className="contents">
                    <Avatar m={m} />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/member/${m.id}`}
                          className="truncate font-data text-[15px] font-semibold tracking-[0.01em] text-ink no-underline hover:text-accent">
                      {m.name}
                      {ov?.nickname && (
                        <span className="ml-1 font-normal text-muted">
                          ({ov.nickname})
                        </span>
                      )}
                      {/* Only for a character somebody proved they own. A claim
                          on its own used to be enough, which made the mark a
                          decoration rather than a statement. */}
                      {ov?.verifiedAt && (
                        <span className="ml-1.5" style={{ color: accent }}
                              title={ov.discord
                                ? `Verified owner · ${ov.discord}` : "Verified owner"}>
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
                    <MemberTags m={m} extremeTotal={extremes.length} />
                    {(ov?.lfg ?? []).map((k) => {
                      const o = LFG_OPTIONS.find((x) => x.key === k);
                      return o ? (
                        <span key={k}
                              className="whitespace-nowrap rounded-full border border-dashed border-accent/60 px-2.5 py-[3px] text-[11.5px] text-accent">
                          {o.label}
                        </span>
                      ) : null;
                    })}
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
