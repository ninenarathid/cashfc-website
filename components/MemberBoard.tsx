"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BoardData, Member, Overlay } from "@/lib/types";
import { BOARD_QUERY_KEY } from "@/lib/types";
import {
  ACHV_TIER_LABEL, LFG_OPTIONS, RANK_ORDER, RACE_ORDER, isOnVacation,
  ON_VACATION_RANK,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import MemberTags, { TAG_CLASS, TAG_LABELS } from "@/components/MemberTags";
import TagHoverCard from "@/components/TagHoverCard";
import { memberTitle } from "@/lib/tags";
import TagIcon from "@/components/TagIcon";
import ProgressBadge from "@/components/ProgressBadge";
import { useLang } from "@/lib/i18n";
import { useAvatar } from "@/lib/avatars";
import { ultimateAbbr } from "@/lib/types";
import JobIcon, {
  ALL_JOBS, ROLE_GROUP, ROLE_LABEL, ROLE_ORDER, jobLabel, jobRole, jobRoleGroup,
} from "@/components/JobIcon";
import TagLegend from "@/components/TagLegend";
import { GUEST_RANK, allGuestIds, guestHome, useGuests } from "@/lib/guests";
import Skeleton from "@/components/ui/Skeleton";
// Imported directly, having tried not to. LazyMotion with an async `domMax`
// made this route bigger, not smaller — AnimatePresence and useReducedMotion
// are needed at render time, so the package is in the graph either way and the
// dynamic import only added a chunk to it. 415 KB against 390 KB, measured.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { rarityColor, rarityLabel } from "@/lib/rarity";
import { Tooltip } from "@/components/ui/Tooltip";


// Defaults to Active. Nearly two thirds of the roster is marked On vacation, so
// opening on the whole list mostly shows people who are not playing — the wrong
// answer to "who is around?", which is why anyone opens this page.
//
// Active counts guests, and Guests still shows them on their own. Somebody who
// registers here is by definition around, and appearing nowhere until a visitor
// changes a filter is the worst possible answer to having just signed up.
// Excluding them was never a decision; it fell out of Active meaning "in the FC
// and not on vacation", which a guest can never be.
const ACTIVITY_OPTIONS = [
  // Named for the company, because that is what the rank means. "Active" on its
  // own invited the question of whether a guest counted — and the answer used to
  // be yes, which made the number disagree with the words.
  { key: "active", label: "FC active" },
  { key: "vacation", label: "FC on vacation" },
  { key: "guest", label: "Guests" },
];

/**
 * Which of them somebody is looking at. Several at once, because they are three
 * separate groups rather than four views of one list, and "the people around"
 * has always meant the FC who are playing plus whoever came from outside.
 *
 * Everyone is all three ticked rather than an option of its own: a fourth
 * button that silently un-ticks the other three is a checkbox pretending to be
 * a radio, and nobody can tell from looking which one it is.
 */
type Activity = string[];
/** Not in the FC, and marked so on the row as well as in the filter. */
const ACTIVITY_DEFAULT: Activity = ["active", "guest"];
const ALL_ACTIVITY = ACTIVITY_OPTIONS.map((o) => o.key);
type SortKey = "name" | "mounts" | "rare";

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Avatar({ m, size = 11 }: { m: Member; size?: number }) {
  const [broken, setBroken] = useState(false);
  const cls = size === 11 ? "size-11" : "size-9";
  // What they chose, or what the Lodestone has. Resolved here rather than baked
  // into members.json, which is written nightly and knows nothing about accounts.
  const src = useAvatar(m.id, m.avatar);
  const face = (!src || broken) ? (
    <div className={`${cls} flex items-center justify-center rounded-full border border-line font-data text-[12px] font-semibold text-bg`}
         style={{ background: `hsl(${hue(m.name)} 45% 68%)` }}>
      {initials(m.name)}
    </div>
  ) : (
    <div className={`${cls} overflow-hidden rounded-full border border-line bg-card`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" className="block size-full object-cover"
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
  boss: number[]; race: string; activity: Activity;
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
  /**
   * Ultimates picked from the chip row, AND-ed the way the boss chips are.
   *
   * Replaces the single `ult` this used to carry. An old link with ?ult= still
   * works — it is read into here on the way in, which also means the thing it
   * picked can be unpicked, which it could not be before.
   */
  ults: string[];
  /**
   * Somebody currently learning a fight, from their own recent logs.
   *
   * "" is everybody; "any" is anybody progressing anything; otherwise the name
   * of one fight. A separate axis from the tags: the prog tag says somebody has
   * logged in the current tier without finishing it, which stays true for months
   * after they stopped, and this says what they were pulling last week.
   */
  progressing: string;
}
const ADV_EMPTY: Adv = {
  lfg: "", rank: "", boss: [],
  race: "", activity: ACTIVITY_DEFAULT, ex: [], role: "", job: "",
  tags: [], grade: "", ults: [], progressing: "",
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
/**
 * What a member is in the middle of, as a list.
 *
 * progress_all arrived after progress did, so a members.json written by an older
 * pipeline still has only the single headline row. Reading both here keeps every
 * caller from having to remember that.
 */
const progressRows = (m: Member) =>
  m.progress_all ?? (m.progress ? [m.progress] : []);

/** Party-list order, so a role's jobs read the way the game lists them. */
const JOB_ORDER = ALL_JOBS.map((j) => j.name.replace(/ /g, ""));

/**
 * Somebody who is either through a fight or in the middle of it.
 *
 * Clicking a boss used to mean "has cleared this", which answers half the
 * question people actually ask a roster. "Who is on M12S-2" is asked by somebody
 * looking for a group, and the people worth finding are the ones still learning
 * it as much as the ones who are done — the second half of that list is who you
 * would be raiding with.
 *
 * Two different sources say so, which is why this is a function rather than a
 * boolean on the row: the clear comes from FF Logs rankings, and being on it
 * comes from reading recent reports.
 */
const onFight = (m: Member, i: number, names: string[]) => {
  if (m.current_clears?.[i]) return true;
  const name = names[i];
  return !!name && progressRows(m).some((p) => p.name === name);
};

const onUltimate = (m: Member, name: string) =>
  (m.ult_cleared ?? []).includes(name)
  || (m.ult_achv_only ?? []).includes(name)
  || progressRows(m).some((p) => p.kind === "ultimate" && p.name === name);

/**
 * Whether somebody belongs to the chosen slice of the roster.
 *
 * A guest is neither active nor on vacation — those are FC ranks and a guest has
 * no rank in this FC — so they sit alongside the other two rather than inside
 * one of them.
 *
 * One function because there were two copies of this rule: one deciding what the
 * counts said and one deciding what the list showed. They agreed until Guests
 * was added to the first and not the second, and picking a category with nobody
 * in it showed everybody. A rule written twice is a rule that will disagree with
 * itself eventually; this one did it immediately.
 */
/** The one group a member belongs to. Exactly one, always. */
const activityOf = (m: Member): string =>
  m.rank === GUEST_RANK ? "guest" : isOnVacation(m) ? "vacation" : "active";

/**
 * One function because there were two copies of this rule: one deciding what
 * the counts said and one deciding what the list showed. They agreed until
 * Guests was added to the first and not the second, and picking a category with
 * nobody in it showed everybody. A rule written twice is a rule that will
 * disagree with itself eventually; this one did it immediately.
 *
 * Nothing ticked shows nothing, and the row below says so. Silently falling
 * back to everything would mean the one gesture that clears a filter produces
 * the largest possible result.
 */
const inActivity = (m: Member, activity: Activity) =>
  activity.includes(activityOf(m));

/** Same members, whatever order they were ticked in. */
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((k) => b.includes(k));

const GROUP_PREFIX = "group:";
const roleGroups = ["Tanks", "Healers", "DPS"] as const;
const roleMatches = (job: string, sel: string) =>
  sel.startsWith(GROUP_PREFIX)
    ? jobRoleGroup(job) === sel.slice(GROUP_PREFIX.length)
    : jobRole(job) === sel;

export default function MemberBoard({ data }: { data: BoardData }) {
  const { t, lang } = useLang();
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];
  // The fight behind each label, so a chip can ask about people learning it and
  // not only about people who have finished it. Same order as the labels because
  // both come from the zone as FF Logs ranks it.
  const tierNames = (data.current_tier?.zone?.encounters ?? []).map((e) => e.name);
  /** Every Ultimate anybody here has cleared or is learning, hardest-won first. */
  const allUltimates = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of data.members) {
      for (const u of new Set([
        ...(m.ult_cleared ?? []), ...(m.ult_achv_only ?? []),
        ...(m.progress_all ?? []).filter((p) => p.kind === "ultimate").map((p) => p.name),
      ])) c.set(u, (c.get(u) ?? 0) + 1);
    }
    return [...c.keys()].sort();
  }, [data.members]);
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
      // A comma-joined list, and "none" for a deliberate empty selection —
      // without it an empty parameter and a missing one look the same, and a
      // shared link showing nothing would arrive showing the default.
      activity: p.has("act")
        ? (p.get("act") === "none" ? []
           : p.get("act")!.split(",").filter((k) => ALL_ACTIVITY.includes(k)))
        : ACTIVITY_DEFAULT,
      ex,
      role: p.get("role") ?? "", job: p.get("job") ?? "", tags,
      grade: p.get("grade") ?? "",
      progressing: p.get("prog") ?? "",
      ults: [...new Set([
        ...(p.get("ults") ?? "").split(",").filter(Boolean),
        ...(p.get("ult") ? [p.get("ult")!] : []),
      ])],
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
    if (!sameSet(adv.activity, ACTIVITY_DEFAULT)) {
      p.set("act", adv.activity.length ? [...adv.activity].sort().join(",") : "none");
    }
    if (adv.role) p.set("role", adv.role);
    if (adv.job) p.set("job", adv.job);
    if (adv.progressing) p.set("prog", adv.progressing);
    if (adv.ults.length) p.set("ults", adv.ults.join(","));
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

  /**
   * People who verified a character that is not on the FC roster.
   *
   * Anybody can sign in here and prove a character is theirs — the check reads
   * The Lodestone and asks nothing about which Free Company it belongs to — so a
   * static who-plays-with-us page and a roster scraped from the FC page are two
   * different lists. Friends of the FC, alts on other servers, people who raid
   * with us on Thursdays: they exist in the database and appeared nowhere.
   *
   * What is known about them is only what they typed and what they chose. The
   * pipeline never looks a non-member up, so there are no mounts, no parse, no
   * tags — and the tag and grade filters will therefore never match one, which is
   * correct rather than a gap. They are here to be seen, not ranked.
   */
  const rosterIds = useMemo(
    () => new Set(data.members.map((m) => m.id)), [data.members]);
  const { guests, loading: guestsLoading } = useGuests(rosterIds);
  const stillMotion = useReducedMotion();

  /**
   * Whether rows should slide to their new positions.
   *
   * Off for the full roster and off for anybody who has asked for less
   * movement. Motion measures every laid-out element on every frame of a layout
   * animation, and five hundred of them is a stutter rather than a flourish —
   * but an unfiltered list is also the one case where nothing has moved, so
   * there is nothing being given up. The moment a filter narrows it, the list is
   * small enough to animate and the movement is the whole point.
   */
  const LAYOUT_LIMIT = 90;

  /**
   * How many guest rows are still to come.
   *
   * Not a guess: data/guests.json ships with the build and the nightly sweep
   * keeps it in step with the claims table, so this is the right number on any
   * day nobody has joined since the last run — and one short on the day somebody
   * has, which is the correct way round to be wrong.
   *
   * The rest of the board needs no skeleton. The roster is a static file that is
   * already in the page when it renders, and drawing placeholders over content
   * that never waited would be a costume.
   */
  const guestsExpected = useMemo(() => allGuestIds().length, []);

  const visible = useMemo(
    () => [...data.members, ...guests].filter((m) => !hiddenIds.has(m.id)),
    [data.members, guests, hiddenIds]);

  // Everything the secondary filters count is counted within the activity selection,
  // so switching to Active re-labels them all. A "Crafter 12" that still says 12
  // after narrowing to the active roster is telling you about people you excluded.
  const inScope = useMemo(
    () => visible.filter((m) => inActivity(m, adv.activity)),
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

  /**
   * The fights somebody in scope is currently learning, with a head count.
   *
   * Built from what members are actually pulling rather than from the whole
   * catalogue: the pipeline only tracks Ultimates and the current savage tier, so
   * this is that list minus everything nobody has touched — and a dropdown of
   * twenty fights at zero apiece is a worse answer than the four with people
   * behind them.
   */
  const progressing = useMemo(() => {
    const c = new Map<string, { n: number; kind: string }>();
    for (const m of inScope) {
      // Counted once per fight per member: somebody learning three bosses is
      // one person on each of those three lists, not three progressers.
      for (const p of progressRows(m).filter((x) => x.state === "learning")) {
        const at = c.get(p.name);
        c.set(p.name, { n: (at?.n ?? 0) + 1, kind: p.kind ?? "savage" });
      }
    }
    return [...c].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
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
    // Every member is in exactly one of the three, so these add up to the whole
    // board and no chip's number is part of another's.
    const c: Record<string, number> = { active: 0, vacation: 0, guest: 0 };
    for (const m of visible) c[activityOf(m)] += 1;
    return c;
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
      if (adv.progressing) {
        const learning = progressRows(m).filter((p) => p.state === "learning");
        if (!learning.length) return false;
        if (adv.progressing !== "any"
            && !learning.some((p) => p.name === adv.progressing)) return false;
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
      if (!inActivity(m, adv.activity)) return false;
      for (const i of adv.boss) if (!onFight(m, i, tierNames)) return false;
      for (const name of adv.ults) if (!onUltimate(m, name)) return false;
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

  const animateLayout = !stillMotion && list.length > 0 && list.length <= LAYOUT_LIMIT;

  const advCount = (adv.lfg ? 1 : 0) + (adv.rank ? 1 : 0) +
    adv.boss.length + adv.ex.length + adv.ults.length +
    (adv.race ? 1 : 0) + (adv.role ? 1 : 0) + (adv.job ? 1 : 0) +
    (adv.progressing ? 1 : 0) +
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
        {/* The kitchen view — the roster grouped by FC rank — is still here and
            still reachable with ?view=kitchen, but it is not offered. It answers
            a question about the hierarchy, and the board is opened to answer
            questions about people. */}
      </header>

      <div className="flex flex-col gap-3">
        {/* Top level, not tucked inside the advanced panel: on a roster where most
            people are on vacation, this is the first cut almost everyone wants. */}
        <div className="inline-flex flex-wrap self-start rounded-lg border border-line bg-surface p-0.5"
             role="group" aria-label="Filter by activity">
          {ACTIVITY_OPTIONS.map((o) => {
            const on = adv.activity.includes(o.key);
            return (
              <button key={o.key}
                      onClick={() => setAdv({
                        ...adv,
                        activity: on ? adv.activity.filter((k) => k !== o.key)
                                     : [...adv.activity, o.key],
                      })}
                      role="checkbox" aria-checked={on}
                      className={`rounded-md px-3.5 py-1.5 text-[13.5px] transition-colors ${
                        on ? "bg-accent/15 text-accent"
                           : "text-muted hover:text-ink"}`}>
                {/* A guest is not a dimmed member, so they do not get the
                    vacation grey. Hollow, because the dot is a presence light
                    for the FC and they are not in it. Unticked, every dot
                    empties out — the colour is what is being included, not
                    what the group is. */}
                <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${
                  !on ? "border border-muted/60"
                  : o.key === "active" ? "bg-[#43b581]"
                  : o.key === "guest" ? "border border-muted"
                  : "bg-[#747f8d]"}`} />
                {o.label}
                <small className="ml-1.5 font-data opacity-70">
                  {activityCounts[o.key] ?? 0}
                </small>
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
          {/* The looking-for filter is hidden for now. The statuses are still
              set on profiles and still shown as chips on a member's row; it is
              only the control that is put away, so nothing has to be unpicked
              to bring it back. */}
          <select value={adv.rank} onChange={(e) => setAdv({ ...adv, rank: e.target.value })}
                  className={selCls} aria-label="FC rank">
            <option value="">Rank: any</option>
            {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Before role and job rather than after, because it reads as an
              adjective on them: "Legendary" then "Reaper" is the order somebody
              says it in, and the grade picked first narrows the counts in the
              control that follows. */}
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

          {/* Role and job in one control. They were two selects that could
              only ever disagree — picking a job cleared the role and picking a
              role cleared the job — which is two questions for one answer. A job
              belongs to a role, so the roles are the headings and the jobs sit
              under the one they belong to. */}
          {(roleCounts.total > 0 || jobsPlayed.length > 0) && (
            <select
              value={adv.job ? `job:${adv.job}` : adv.role ? `role:${adv.role}` : ""}
              onChange={(e) => {
                const v = e.target.value;
                setAdv({
                  ...adv,
                  role: v.startsWith("role:") ? v.slice(5) : "",
                  job: v.startsWith("job:") ? v.slice(4) : "",
                });
              }}
              className={selCls} aria-label="Role or job played">
              <option value="">{t("board.roleAny")}</option>
              {roleGroups.map((group) => {
                const fine = ROLE_ORDER.filter((r) => ROLE_GROUP[r] === group);
                const all = GROUP_PREFIX + group;
                const jobs = jobsPlayed
                  .filter(([j]) => jobRoleGroup(j) === group)
                  .sort((a, b) => JOB_ORDER.indexOf(a[0]) - JOB_ORDER.indexOf(b[0]));
                if (!roleCounts[all] && !jobs.length) return null;
                return (
                  <optgroup key={group} label={group}>
                    {/* An optgroup label cannot be selected, so the whole group
                        gets its own entry. Skipped where the group holds a single
                        role, which would just be the same option twice. */}
                    {fine.length > 1 && (
                      <option value={`role:${all}`} disabled={!roleCounts[all]}>
                        {group === "DPS" ? t("board.anyDps")
                          : group === "Healers" ? t("board.anyHealer")
                          : t("board.anyTank")}
                        {" "}({roleCounts[all]})
                      </option>
                    )}
                    {/* Each role followed by the jobs that are it, rather than
                        every role and then every job. "Barrier healer" and then
                        Sage and Scholar reads as one answer with two spellings;
                        the same names at the bottom of the group read as a
                        second, unrelated list. */}
                    {fine.map((r) => (
                      <Fragment key={r}>
                        <option value={`role:${r}`} disabled={!roleCounts[r]}>
                          {fine.length > 1 ? " " : ""}{ROLE_LABEL[r]} ({roleCounts[r]})
                        </option>
                        {jobs.filter(([j]) => jobRole(j) === r).map(([job, n]) => (
                          <option key={job} value={`job:${job}`}>
                            {"  "}{jobLabel(job)} ({n})
                          </option>
                        ))}
                      </Fragment>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          )}

          {/* Who is pulling something right now. Its own control rather than a
              tag, because the tags describe what somebody is and this describes
              what they are in the middle of. */}
          {progressing.length > 0 && (
            <select value={adv.progressing}
                    onChange={(e) => setAdv({ ...adv, progressing: e.target.value })}
                    className={selCls} aria-label="Currently progressing">
              <option value="">{t("board.progAny")}</option>
              <option value="any">
                {t("board.progressingAny", {
                  n: progressing.reduce((sum, [, v]) => sum + v.n, 0),
                })}
              </option>
              {(["ultimate", "savage"] as const).map((kind) => {
                const rows = progressing.filter(([, v]) => v.kind === kind);
                if (!rows.length) return null;
                return (
                  <optgroup key={kind}
                            label={kind === "ultimate" ? "Ultimate" : "Savage"}>
                    {rows.map(([name, v]) => (
                      <option key={name} value={name}>{name} ({v.n})</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          )}

          {/* The Ultimate select is gone: the chip row under "This patch" asks the
              same question better. It only appeared once the Ultimate tag was
              picked, offered one at a time, and asked about clears alone. */}

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
                  <TagHoverCard key={tag} tag={tag}>
                    <button
                      onClick={() => setAdv({ ...adv,
                        tags: on ? adv.tags.filter((x) => x !== tag) : [...adv.tags, tag] })}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] ${
                        on ? TAG_CLASS[tag] ?? "border-accent bg-accent/15 text-accent"
                           : "border-line text-muted hover:border-muted"}`}>
                      <TagIcon tag={tag} size={16} />
                      {TAG_LABELS[tag]}
                      <small className="ml-1 opacity-70">{counts[tag]}</small>
                    </button>
                  </TagHoverCard>
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
                const n = inScope.filter((m) => onFight(m, i, tierNames)).length;
                return (
                  <button key={lb}
                    onClick={() => setAdv({ ...adv,
                      boss: on ? adv.boss.filter((x) => x !== i) : [...adv.boss, i] })}
                    aria-pressed={on}
                    className={`rounded-md border px-2 py-1 font-data text-[11.5px] ${
                      on ? "border-chili bg-chili/15 text-chili"
                         : "border-line text-muted hover:border-muted"}`}
                    title={`On or through ${lb}${
                      tierNames[i] ? ` (${tierNames[i]})` : ""} — ${n} member${
                      n === 1 ? "" : "s"}`}>
                    {lb}<small className="ml-1 opacity-70">{n}</small>
                  </button>
                );
              })}
            </span>

            {allUltimates.length > 0 && (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] text-muted">Ultimate</span>
                {allUltimates.map((name) => {
                  const on = adv.ults.includes(name);
                  const n = inScope.filter((m) => onUltimate(m, name)).length;
                  return (
                    <button key={name}
                      onClick={() => setAdv({ ...adv,
                        ults: on ? adv.ults.filter((x) => x !== name)
                                 : [...adv.ults, name] })}
                      aria-pressed={on}
                      className={`rounded-md border px-2 py-1 font-data text-[11.5px] ${
                        on ? "border-gold bg-gold/15 text-gold"
                           : "border-line text-muted hover:border-muted"}`}
                      title={`On or through ${name} — ${n} member${n === 1 ? "" : "s"}`}>
                      {ultimateAbbr(name)}<small className="ml-1 opacity-70">{n}</small>
                    </button>
                  );
                })}
              </span>
            )}

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
          {/* Names the scope rather than only the raw numbers: on a default that
              hides two thirds of the roster, "179 of 502" alone reads like
              something is broken. */}
          {adv.activity.length === 0
            ? t("board.showingNone")
            : t("board.showing", {
                shown: list.length,
                total: adv.activity.reduce(
                  (n, k) => n + (activityCounts[k] ?? 0), 0),
              })}
          {!sameSet(adv.activity, ALL_ACTIVITY) && (
            <>
              {" · "}
              <button onClick={() => setAdv({ ...adv, activity: ALL_ACTIVITY })}
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
            <AnimatePresence initial={false} mode="popLayout">
            {list.map((m, i) => {
              const ov = overlays[m.id];
              const accent = ov?.accent ?? "#6aa9e0";
              // Only the title now, coloured by how few players wear it.
              //
              // Race, mount count and rare-achievement count came off this
              // line. All three were on every row, all three were identical
              // across most of them, and the numbers repeat what the collection
              // tiles say on the member's own page — five hundred rows reading
              // "Au Ra · 131 mounts · 143 rare achv" is five hundred rows of
              // the same sentence with the digits changed. A title is chosen,
              // and how rare it is says something no other column does.
              const title = memberTitle(m);
              // Where a guest actually plays. It is the first thing anybody
              // wants to know about a name that is not on the roster, and the
              // FC's own members would only ever repeat the same two words.
              const meta: string[] = [];
              if (m.rank === GUEST_RANK) {
                const home = guestHome(m.id);
                if (home?.world) meta.push(home.world);
                if (home?.fc) meta.push(home.fc);
              }
              return (
                <motion.div key={m.id}
                     /**
                      * Rows travel to their new place when a filter changes,
                      * rather than vanishing and leaving the ones below to jump
                      * up into the gap. Which of the five hundred stayed is then
                      * something you can watch happen instead of having to
                      * re-read the list.
                      *
                      * `layout` is only switched on once a filter has actually
                      * narrowed things: it measures every row on every frame, and
                      * doing that to all five hundred at once janks — while an
                      * unfiltered list has nothing to animate anyway, since
                      * nothing moved. `animateLayout` below is that condition.
                      *
                      * popLayout on the AnimatePresence takes leaving rows out of
                      * the flow immediately, so the ones staying start closing the
                      * gap at once rather than waiting for the fade to finish.
                      */
                     layout={animateLayout ? "position" : false}
                     /* Arriving is the half that was missing. `initial={false}`
                        turned it off outright, so a row joining the list simply
                        appeared and the only thing anyone could see was rows
                        leaving — which, when a filter cuts five hundred down to
                        five, looks like the list blinking rather than moving.
                        AnimatePresence still carries initial={false}, which is a
                        different switch: it stops the whole board animating
                        itself in on page load. */
                     initial={stillMotion ? false : { opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={stillMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
                     transition={{
                       duration: 0.26,
                       ease: [0.22, 1, 0.36, 1],
                       /* Down the list, so it reads as filling in from the top
                          rather than flashing all at once. Capped at ten:
                          beyond that a stagger stops being rhythm and becomes
                          the twentieth row waiting its turn. */
                       delay: animateLayout ? Math.min(i, 10) * 0.022 : 0,
                     }}
                     className={`grid grid-cols-[44px_1fr] items-center gap-x-3.5 gap-y-2 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-[#55492f] sm:grid-cols-[44px_minmax(150px,1fr)_minmax(0,2.2fr)] sm:px-4 ${
                       /* content-visibility skips layout for anything off
                          screen, which is what makes five hundred rows cheap —
                          and exactly what stops Motion being able to measure a
                          row it is meant to be moving. Dropped only while the
                          list is short enough to be animating anyway. */
                       animateLayout ? "" : "[content-visibility:auto]"}`}>
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
                    <div className="flex flex-wrap items-baseline gap-x-1.5 text-[12.5px]">
                      {title && (
                        <Tooltip content={rarityLabel(m.title_pct, lang === "th")}>
                          <span style={{ color: rarityColor(m.title_pct) }}>
                            {title}
                          </span>
                        </Tooltip>
                      )}
                      {title && meta.length > 0 && <span className="text-muted opacity-50">·</span>}
                      {meta.length > 0 && (
                        <span className="text-muted">{meta.join(" · ")}</span>
                      )}
                    </div>
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

                  {/* On a line of its own, last. The tags above say what somebody
                      is; this says what they were doing on Tuesday, which is a
                      different kind of fact and was getting lost at the end of a
                      row of them. */}
                  {progressRows(m).length > 0 && (
                    <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-span-2">
                      {/* All of them, not the best one. Somebody can clear two
                          bosses for the first time in a week and be learning two
                          more, and picking one of the four to stand for the rest
                          threw away most of what happened. Four is where a line
                          of news becomes a list. */}
                      {progressRows(m).slice(0, 4).map((p) => (
                        <ProgressBadge key={p.encounter_id} progress={p} />
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}

          {/* The guests, before they arrive.
              Only while the list is still being fetched, only as many rows as
              the build knows are coming, and only when guests are actually
              being shown — a skeleton for rows the current filter would hide
              is a promise of something that will never appear. */}
          {guestsLoading && guestsExpected > 0
            && adv.activity.includes("guest") && (
            <>
              <span className="sr-only" role="status">{t("board.loadingGuests")}</span>
              {Array.from({ length: guestsExpected }, (_, i) => (
                <div key={`skeleton:${i}`}
                     className="grid grid-cols-[44px_1fr] items-center gap-x-3.5 gap-y-2 rounded-xl border border-line bg-surface p-3.5 sm:grid-cols-[44px_minmax(150px,1fr)_minmax(0,2.2fr)] sm:px-4">
                  <Skeleton className="size-11" rounded="rounded-full" />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Skeleton className="h-[15px] w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  {/* Where the tags sit. Two, because that is nearer the truth
                      than one and cheaper to be wrong about than five. */}
                  <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-3">
                    <Skeleton className="h-[22px] w-24" rounded="rounded-full" />
                    <Skeleton className="h-[22px] w-16" rounded="rounded-full" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
