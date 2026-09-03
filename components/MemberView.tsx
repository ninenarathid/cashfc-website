"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Member, MemberRaids, Overlay, RaidEncounter, RaidZone, UltimateEntry } from "@/lib/types";
import {
  BOARD_QUERY_KEY, LFG_OPTIONS, ON_VACATION_RANK, isOnVacation, formatBirthday,
  ultimateAbbr,
} from "@/lib/types";
import { percentile } from "@/lib/badges";
import CollectionHelp from "@/components/CollectionHelp";
import ProgressBadge from "@/components/ProgressBadge";
import MemberGallery from "@/components/gallery/MemberGallery";
import { useLang } from "@/lib/i18n";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { isEmpty } from "@/lib/availability";
import JobBreakdown from "@/components/JobBreakdown";
import JobIcon, { jobLabel } from "@/components/JobIcon";
import MemberTags from "@/components/MemberTags";
import RareShelf, { type AchievementInfo, type CollectionItem } from "@/components/RareShelf";
import Tabs from "@/components/ui/Tabs";
import TagIcon from "@/components/TagIcon";
import DutyCard from "@/components/DutyCard";
import { artFocus, dutySlug, NO_ART, type DutyArt } from "@/lib/duty";
import { byReleaseOrder, dutyOf, savageDuty } from "@/lib/duties";
import { createClient } from "@/lib/supabase/client";
import { memberTitle } from "@/lib/tags";
import { GUEST_RANK, guestHome } from "@/lib/guest-data";
import { parseColor } from "@/lib/parse";

/**
 * The wash behind a member's name, built from the one colour they picked.
 *
 * It used to be a separate choice from its own palette of six, which meant two
 * pickers for one decision and a page whose banner could contradict its own
 * accent. Derived instead: the accent at a low opacity over the site's ground,
 * which is what every one of those six presets was doing by hand anyway.
 */
const bannerFor = (accent: string) =>
  `linear-gradient(135deg,#151b25,${accent}38)`;

export default function MemberView({
  m, raids, tierLabels, agg, fc, rareAchievements = [],
  rareMounts = [], rareMinions = [], patch = null, art = NO_ART, extremeTotal,
  memberOptions = [],
}: {
  m: Member;
  raids: MemberRaids | null;
  rareAchievements?: AchievementInfo[];
  rareMounts?: CollectionItem[];
  rareMinions?: CollectionItem[];
  /** Which patch the game is on, worked out by the pipeline. */
  patch?: string | null;
  /** Fight slug to picture, from whatever is in public/duty. */
  art?: DutyArt;
  /** How many extreme trials this patch has, for the "cleared x of y" chip. */
  extremeTotal?: number;
  tierLabels: string[];
  agg: { mounts: (number | null)[]; minions: (number | null)[]; rare: (number | null)[] };
  fc: { name: string; world: string; region: string };
  /** The roster to search when tagging somebody in a gallery picture. */
  memberOptions?: { id: number; name: string; avatar?: string | null }[];
}) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [ov, setOv] = useState<Overlay | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [kudos, setKudos] = useState<number | null>(null);
  const [kudosMsg, setKudosMsg] = useState("");
  /** Whether the reader has claimed a character, which giving a popoto needs. */
  const [iHaveCharacter, setIHaveCharacter] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const BASE = "bio, accent_color, discord_username, lfg, banner, character_id";
    const V3 = `${BASE}, nickname, birth_month, birth_day`;
    const V7 = `${V3}, availability`;
    const V16 = `${V7}, avatar_url, cover_url`;
    // Same fallback as the board, one step longer: an unknown column fails the
    // whole select, so each migration this page reads gets a rung to fall back to
    // rather than blanking every field because one is missing.
    const load = (cols: string) =>
      supabase.from("profiles").select(cols).eq("character_id", m.id).maybeSingle();

    load(V16).then(async ({ data, error }) => {
      let row = (error ? null : data) as Record<string, unknown> | null;
      if (error) {
        const v7 = await load(V7);
        if (v7.error) {
          const v3 = await load(V3);
          row = (v3.error ? (await load(BASE)).data : v3.data) as
            Record<string, unknown> | null;
        } else {
          row = v7.data as Record<string, unknown> | null;
        }
      }
      if (!row) return;
      setOv({
        bio: row.bio as string | null,
        accent: row.accent_color as string | null,
        discord: row.discord_username as string | null,
        lfg: (row.lfg as string[] | null) ?? [], banner: row.banner as string | null,
        nickname: (row.nickname as string | null) ?? null,
        birthMonth: (row.birth_month as number | null) ?? null,
        birthDay: (row.birth_day as number | null) ?? null,
        availability: (row.availability as string | null) ?? null,
        avatarUrl: (row.avatar_url as string | null) ?? null,
        coverUrl: (row.cover_url as string | null) ?? null,
      });
    });
    supabase.from("kudos")
      .select("*", { count: "exact", head: true })
      .eq("receiver_character_id", m.id)
      .then(({ count }) => setKudos(count ?? 0));
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: me } = await supabase.from("profiles")
          .select("character_id").eq("id", data.user.id).single();
        setIsOwner(me?.character_id === m.id);
        setIHaveCharacter(me?.character_id != null);
      }
    });
  }, [supabase, m.id]);

  async function sendKudos() {
    if (!supabase || !user) {
      setKudosMsg(t("kudos.signIn"));
      return;
    }
    // Claim a character first. A potato is the FC saying something about
    // somebody, and a login with a name nobody can place is not the FC saying
    // it — the database refuses this too, so the message is here to explain
    // rather than to enforce.
    if (!iHaveCharacter) {
      setKudosMsg(t("kudos.needCharacter"));
      setTimeout(() => setKudosMsg(""), 5000);
      return;
    }
    const { error } = await supabase.from("kudos")
      .insert({ sender_id: user.id, receiver_character_id: m.id });
    if (error) {
      setKudosMsg(error.code === "23505"
        ? "Already sent to this member today — come back tomorrow" : "Could not send, try again");
    } else {
      setKudos((k) => (k ?? 0) + 1);
      setKudosMsg(t("kudos.sent"));
    }
    setTimeout(() => setKudosMsg(""), 3000);
  }

  const accent = ov?.accent ?? "#6aa9e0";
  const onVacation = isOnVacation(m);
  const birthday = formatBirthday(ov?.birthMonth, ov?.birthDay);
  // Compared in the viewer's own timezone, which is what "is it their birthday
  // today" means to the person looking at the page.
  const now = new Date();
  const isBirthdayToday = !!ov?.birthMonth && !!ov?.birthDay &&
    ov.birthMonth === now.getMonth() + 1 && ov.birthDay === now.getDate();
  const legacyGroups = useMemo(() => {
    const g: Record<string, RaidZone[]> = {};
    for (const z of raids?.legacy ?? [])
      (g[z.expansion ?? "Other"] ??= []).push(z);
    return g;
  }, [raids]);

  // FF Logs splits the final boss of a tier into two encounters, so one label can
  // own two cards — M12S-1 and M12S-2 are fought and parsed separately. Only the
  // last part counts as clearing the tier, which is what clears[] already records.
  interface TierCard {
    key: string; label: string; enc: RaidEncounter | null; cleared: boolean;
  }
  const currentCards: TierCard[] = tierLabels.flatMap((label, i): TierCard[] => {
    const cleared = raids?.current?.clears?.[i] ?? false;
    const parts = (raids?.current?.encounters ?? []).filter(
      (e) => e.label === label || e.label?.startsWith(`${label}-`));
    if (!parts.length) return [{ key: label, label, enc: null, cleared }];
    return parts.map((enc, j) => ({
      key: enc.label ?? `${label}-${j}`,
      label: enc.label ?? label,
      enc,
      cleared: j === parts.length - 1 ? cleared : (enc.kills ?? 0) > 0,
    }));
  });
  const hasCurrentData = !!raids?.current?.encounters?.length;
  // In the order the patches released them, not the order FF Logs happens to
  // return. "EX1 through EX7" is how this tier is talked about, and a list that
  // is not in that order has to be read rather than glanced at.
  const extremes = byReleaseOrder(raids?.extremes ?? []);

  // Why the collection tiles are empty, which decides what this member has to do
  // about it: never looked up on FFXIV Collect at all, or looked up but keeping
  // achievements private on The Lodestone.
  // "kept" is private-now-but-we-read-it-before. The shelf is not thrown away
  // when somebody closes their profile — a closed profile is not a lost
  // collection — but it stops claiming to be current, and says when it was read.
  // Where a guest plays. Undefined for an FC member, which is the point: they
  // are all on the same world in the same company.
  const home = m.rank === GUEST_RANK ? guestHome(m.id) : undefined;

  // Only The Lodestone gets to say "private". `ach_public` is FFXIV Collect's
  // view, and Collect re-reads a character only when somebody presses Refresh —
  // so for members whose last press was in 2022 it was reporting a setting from
  // 2022. This page was telling people to go and make their achievements public
  // when they already had.
  //
  // "pending" is the gap that opens once the two are told apart: nothing is
  // hidden, the data has simply not been fetched yet. It says so and asks for
  // nothing, because there is nothing for the member to do.
  const collectState: "ok" | "private" | "kept" | "unknown" | "pending" =
    m.mounts == null && m.minions == null ? "unknown"
    : m.lode_achv_public === false ? (m.rare_achv != null ? "kept" : "private")
    : m.rare_achv == null && m.ach_public !== true ? "pending"
    : "ok";

  // Back to the list you came from, filters and all. Falls back to the plain
  // roster, which is also what somebody who arrived on a shared link gets.
  const [backHref, setBackHref] = useState("/members");
  useEffect(() => {
    try {
      const qs = sessionStorage.getItem(BOARD_QUERY_KEY);
      if (qs) setBackHref(`/members?${qs}`);
    } catch { /* private mode */ }
  }, []);

  const pctTile = (label: string, value: number | null,
                   values: (number | null)[], color: string) => {
    const pct = percentile(values, value);
    return (
      <div key={label} className="rounded-xl border border-line bg-surface p-3.5">
        <div className="font-data text-2xl font-semibold" style={{ color }}>
          {value ?? "—"}
        </div>
        <div className="text-xs text-muted">{label}</div>
        {pct != null && (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="mt-1 text-[11px] text-muted">{t("member.higherThan", { n: pct })}</div>
          </>
        )}
      </div>
    );
  };

  return (
    // The one colour they picked, standing in for the site's own for the length
    // of their page. Every accent utility below — headings, links, the buttons,
    // the focus ring, the gallery underneath — reads the same variable, so this
    // one line is the whole feature and nothing on the page can be left behind
    // wearing the site blue. The header and footer sit outside it and stay the
    // site's, which is what keeps a member page feeling like a room in this
    // building rather than a different website.
    <main className="pt-5"
          style={{ "--color-accent": accent } as React.CSSProperties}>
      <Link href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted no-underline transition-colors hover:text-accent">
        <span aria-hidden>←</span> {t("member.back")}
      </Link>

      {/* ── Header / banner ── */}
      <section className="relative overflow-hidden rounded-2xl border border-line"
               style={{ background: bannerFor(accent) }}>
        {/* A cover the member chose, with a wash over it. Without the wash the
            name and the rank land on whatever happens to be in the picture, and
            white text on a bright sky is unreadable however good the shot is. */}
        {ov?.coverUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ov.coverUrl} alt=""
                 className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/25" />
          </>
        )}
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
          {(ov?.avatarUrl || m.portrait || m.avatar) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ov?.avatarUrl ?? m.portrait ?? m.avatar ?? ""} alt=""
                 className={`shrink-0 rounded-xl border border-line object-cover object-top ${
                   // A picture they cropped square is shown square. Forcing it
                   // into the Lodestone's tall frame would crop their crop.
                   ov?.avatarUrl ? "size-32 sm:size-40"
                                 : "h-44 w-32 sm:h-52 sm:w-40"}`} />
          )}
          <div className="min-w-0 flex-1">
            {/* Whose company this is. For a member it is this one, and the
                dot beside it says whether they are about; for a guest it is
                theirs, and that dot would be a claim about a roster they are
                not on — so it goes grey and says what they are instead.
                Somebody in no company at all gets the word Guest, which is
                then the only true thing there is to put here. */}
            <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.2em] text-ink/60">
              <span
                title={home ? GUEST_RANK : onVacation ? ON_VACATION_RANK : "Active"}
                aria-label={home ? GUEST_RANK : onVacation ? ON_VACATION_RANK : "Active"}
                role="img"
                className={`size-2.5 shrink-0 rounded-full ${
                  home ? "bg-[#8b7fd4]" : onVacation ? "bg-[#747f8d]" : "bg-[#43b581]"}`}
              />
              {home ? (home.fc || GUEST_RANK) : fc.name}
              {memberTitle(m) && ` · ${memberTitle(m)}`}
            </div>
            <h1 className="font-data text-3xl font-bold tracking-tight sm:text-4xl">
              {m.name}
              {ov && (
                <span className="ml-2" style={{ color: accent }}
                      title={ov.discord ? `Linked Discord: ${ov.discord}` : "Verified"}>
                  ✦
                </span>
              )}
            </h1>
            {ov?.nickname && (
              <div className="text-[15px] font-medium" style={{ color: accent }}>
                &ldquo;{ov.nickname}&rdquo;
              </div>
            )}
            <div className="mt-1 text-[13px] text-ink/70">
              Lv {m.level ?? "—"}
              {/* For somebody outside the FC, the world and the company they
                  are actually in are the two facts that place them. Every FC
                  member would only repeat the same pair, so it is said here
                  only where it says something. */}
              {home?.world && (
                <> · {home.world}{home.dc ? ` [${home.dc}]` : ""}</>
              )}
              {m.race && (
                <> · {m.race}{m.clan ? ` (${m.clan})` : ""}</>
              )}
              {/* Two different dates, so both say which they are: the real-world
                  birthday the member entered, and the in-game Eorzean nameday. */}
              {birthday && (
                <> · 🎂 {birthday}{isBirthdayToday ? " — today!" : ""}</>
              )}
              {m.nameday?.text && <> · nameday {m.nameday.text}</>}
            </div>
            {m.last_active && (
              // Never shown on its own: this can only be as fresh as the last time
              // Lalachievements re-read the character, and without that caveat an
              // out-of-date sync reads as "this person quit".
              <div className="mt-0.5 text-[12px] text-ink/55">
                Last seen collecting {m.last_active}
                {m.lala_synced && (
                  <span className="text-ink/40"> · data synced {m.lala_synced}</span>
                )}
              </div>
            )}
            {ov?.bio && (
              <p className="mt-2 text-[14px] italic" style={{ color: accent }}>
                &ldquo;{ov.bio}&rdquo;
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(ov?.lfg ?? []).map((k) => {
                const o = LFG_OPTIONS.find((x) => x.key === k);
                return o ? (
                  <span key={k} className="rounded-full border border-dashed border-accent/70 bg-bg/40 px-2.5 py-[3px] text-[11.5px] text-accent">
                    {o.label}
                  </span>
                ) : null;
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                [`https://na.finalfantasyxiv.com/lodestone/character/${m.id}/`, "LODE"],
                [`https://www.fflogs.com/character/${fc.region.toLowerCase()}/${fc.world.toLowerCase()}/${encodeURIComponent(m.name)}`, "LOGS"],
                [`https://ffxivcollect.com/characters/${m.id}`, "COLL"],
              ].map(([href, label]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                   className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-data text-[10.5px] tracking-[0.06em] text-ink/80 no-underline hover:border-accent hover:text-accent">
                  {label}
                </a>
              ))}
              <button onClick={sendKudos}
                      className="rounded-md border border-accent/60 bg-bg/40 px-3 py-1 text-[12.5px] text-accent hover:bg-accent/15">
                🥔 Send popoto{kudos != null ? ` · ${kudos}` : ""}
              </button>
              {/* Copies the page with a throwaway query on the end. Discord keeps
                  what it has already unfurled, keyed by URL, so a link it has
                  seen before shows whatever card it saw then — a portrait since
                  replaced, a cover since set. This one it has not seen, which
                  changes nothing about where it goes and everything about
                  whether it looks again. Same button, same name: nobody should
                  have to know any of that to share their own page. */}
              <button
                onClick={() => {
                  const url = `${location.origin}${location.pathname}?v=${
                    Date.now().toString(36)}`;
                  navigator.clipboard?.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-md border border-line bg-bg/40 px-3 py-1 text-[12.5px] text-ink/70 hover:border-muted hover:text-ink">
                {copied ? "Copied ✓" : "Share link"}
              </button>
              {isOwner && (
                <Link href="/profile"
                      className="rounded-md border border-jade/60 bg-bg/40 px-3 py-1 text-[12.5px] text-jade no-underline hover:bg-jade/15">
                  Edit this page
                </Link>
              )}
            </div>
            {kudosMsg && <div className="mt-1.5 text-[12.5px] text-accent">{kudosMsg}</div>}
          </div>
        </div>
      </section>

      {/* ── Playstyle tags, the same chips the board shows ── */}
      <section className="mt-4 flex flex-wrap gap-2">
        <MemberTags m={m} extremeTotal={extremeTotal} size="md" />
      </section>

      {/* Ahead of the raid tier: for most of this FC the achievements are the
          interesting part, and plenty of members have no raid data at all. */}
      {/* One block for all three, rather than beside the collection tiles above:
          those say how many, and this says which — a different question, and the
          one people actually want to ask about somebody else's shelf. */}
      <RareShelf achievements={rareAchievements}
                 mounts={rareMounts} minions={rareMinions} />

      {/* ── Raid: current tier. Hidden entirely when FF Logs has nothing — four
          empty cards saying "Awaiting data" is worse than not asking. ── */}
      {(hasCurrentData || extremes.length > 0) && (
      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {t("member.currentPatch")}{" "}
          {/* The patch number, not the tier's boss list. "M9S–M12S-2 · AAC
              Heavyweight" named the savage tier in a heading that now covers
              extremes and Ultimates too, and the tab underneath already says
              which of the three you are looking at. The number comes from the
              newest thing in FFXIV Collect's catalogues, so it moves on its own. */}
          {patch && (
            <span className="font-data text-[13px] font-normal text-muted">
              {patch}
            </span>
          )}
        </h2>

        {/* Three questions about the same patch, and nobody asks two at once.
            Extremes first because they are what most of this FC actually does;
            savage second; Ultimates last, being the fewest people and the
            rarest news. A tab with nothing behind it is not offered. */}
        <Tabs tabs={[
          ...(extremes.length > 0 ? [{
            key: "ex",
            label: (
              <>
                <TagIcon tag="extreme" size={15} />
                {t("member.extremeTrials")}
              </>
            ),
            hint: `${extremes.filter((e) => e.cleared).length}/${extremes.length}`,
            body: (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {extremes.map((e) => (
                    <DutyCard key={`${e.zone_id}-${e.name}`}
                              name={dutyOf(e.name)?.duty ?? e.name}
                              subtitle={dutyOf(e.name) ? e.name : null}
                              badge={dutyOf(e.name) && (
                                <span className="shrink-0 rounded-md border border-[#b8452c]/45 bg-[#b8452c]/12 px-1.5 py-[1px] font-data text-[11px] font-bold text-[#e2825f]">
                                  {dutyOf(e.name)!.badge}
                                </span>
                              )}
                              cleared={!!e.cleared} kills={e.kills}
                              jobs={[e.job]} best={e.best} dim={!e.cleared}
                              art={art.extreme[dutySlug(e.name)]}
                              focus={artFocus(dutySlug(e.name))} />
                  ))}
                </div>
              </>
            ),
          }] : []),
          ...(hasCurrentData || raids === null ? [{
            key: "savage",
            label: (
              <>
                <TagIcon tag="tier-clear" size={15} />
                Savage raids
              </>
            ),
            hint: `${(raids?.current?.clears ?? []).filter(Boolean).length}/${tierLabels.length}`,
            body: (
              <>
            {raids === null ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] text-muted">
                {t("member.notLinked")}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {currentCards.map(({ key, label, enc, cleared }) => (
                  // The same card as the extremes and the Ultimates. This was
                  // four tall tiles with the parse in 30px type, which said the
                  // number mattered more than the fight — and left nowhere for
                  // a picture to go.
                  <DutyCard key={key}
                            // The duty on top, the boss under it, the same way
                            // round as the extremes: one is what you queue for
                            // and the other is what the parse belongs to.
                            name={savageDuty(label, raids?.current?.zone)
                                  ?? enc?.name
                                  ?? t(hasCurrentData ? "member.noLogYet" : "member.awaitingData")}
                            subtitle={savageDuty(label, raids?.current?.zone)
                                      ? enc?.name ?? null : null}
                            badge={
                              <span className="shrink-0 rounded-md border border-line bg-bg/50 px-1.5 py-[1px] font-data text-[11px] font-bold text-ink/80">
                                {label}
                              </span>
                            }
                            cleared={!!cleared} kills={enc?.kills} jobs={[enc?.job]}
                            best={enc?.best} dim={!enc && !cleared}
                            art={art.savage[dutySlug(enc?.name)]}
                              focus={artFocus(dutySlug(enc?.name))} />
                ))}
              </div>
            )}

            {/* What is still being learned. Sits under the cards because it is the
                answer to the same question they ask, and above the extremes because a
                fight in progress is more current than one already finished. */}
            {(raids?.progress?.length ?? 0) > 0 && (
              <>
                <h3 className="mb-2 mt-4 font-display text-[15px] font-semibold">
                  {t("member.inProgress")}{" "}
                  <span className="text-[12.5px] font-normal text-muted">
                    ({raids!.progress!.length})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {raids!.progress!.map((p) => (
                    <ProgressBadge key={p.encounter_id} progress={p} size="md" />
                  ))}
                </div>
              </>
            )}
              </>
            ),
          }] : []),
          ...((raids?.ultimates?.length ?? 0) > 0
              || (m.ult_achv_only?.length ?? 0) > 0 ? [{
            key: "ult",
            label: (
              <>
                <TagIcon tag="ultimate" size={15} />
                Ultimate raids
              </>
            ),
            hint: (raids?.ultimates?.length ?? 0) + (m.ult_achv_only?.length ?? 0),
            body: (
              <div className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
                    {/* One card per fight. FF Logs files the same Ultimate
                        under its own zone and again under "Ultimates (Legacy)",
                        so a member who killed it twice on two jobs came out as
                        two identical cards — same picture, same name, one of
                        them quietly claiming fewer kills than they have. */}
                    {Object.values(
                      (raids!.ultimates!).reduce((acc, u) => {
                        const key = u.name ?? u.zone ?? String(u.zone_id);
                        const at = acc[key] ?? {
                          ...u, kills: 0, best: null as number | null,
                          jobs: [] as (string | null | undefined)[],
                        };
                        at.kills = (at.kills ?? 0) + (u.kills ?? 0);
                        // The best pull across every zone it was logged in: the
                        // number belongs to the person, not to FF Logs' filing.
                        if (u.best != null && (at.best == null || u.best > at.best)) at.best = u.best;
                        if (u.job && !at.jobs.includes(u.job)) at.jobs.push(u.job);
                        acc[key] = at;
                        return acc;
                      }, {} as Record<string, UltimateEntry
                                            & { jobs: (string | null | undefined)[] }>),
                    ).map((u, i) => {
                      // Prefer the fight name over the zone: FF Logs groups five
                      // different Ultimates under zones named "Ultimates",
                      // "Ultimates (Legacy)" and "Ultimates (Stormblood)", which
                      // say nothing about what was cleared.
                      const title = u.name ?? u.zone;
                      const short = u.name ? ultimateAbbr(u.name) : null;
                      return (
                        <DutyCard key={`${u.zone_id}-${u.name ?? i}`}
                                  name={title}
                                  badge={short ? (
                                    <span className="shrink-0 rounded-md border border-[#c13ae0]/45 bg-[#c13ae0]/12 px-1.5 py-[1px] font-data text-[11px] font-bold text-[#d060ea]">
                                      {short}
                                    </span>
                                  ) : undefined}
                                  cleared kills={u.kills} jobs={u.jobs} best={u.best}
                                  art={art.ultimate[dutySlug(u.name)]}
                              focus={artFocus(dutySlug(u.name))} />
                      );
                    })}
                  </div>
        <div className="flex flex-wrap gap-2">
                    {m.ult_achv_only!.map((name) => (
                      <span key={name}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#c13ae0]/40 bg-[#c13ae0]/8 px-3.5 py-2 text-[13.5px]">
                        {/* The same violet as the logged ones beside them. These
                            are the clears FF Logs never saw; nothing about them
                            is a lesser Ultimate, so nothing here says so. */}
                        <span className="rounded-md border border-[#c13ae0]/45 bg-[#c13ae0]/12 px-1.5 py-[1px] font-data text-[12px] font-bold text-[#d060ea]">
                          {ultimateAbbr(name)}
                        </span>
                        <span className="font-data text-ink">{name}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">
                    Cleared according to Lodestone. Parse and kill counts need an uploaded
                    log, so there are none to show.
                  </p>
              </div>
            ),
          }] : []),
        ]} />
      </section>
      )}

      <JobBreakdown raids={raids} jobScores={m.job_scores} />

      {/* ── Raid: Legacy ── */}
      {Object.keys(legacyGroups).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">
            Previous savage tiers
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(legacyGroups).map(([exp, zones]) => (
              <details key={exp} className="rounded-xl border border-line bg-surface">
                <summary className="cursor-pointer select-none px-4 py-2.5 font-display text-[14.5px] font-semibold marker:text-accent">
                  {exp} <span className="text-[12px] font-normal text-muted">
                    — {zones.length} tier
                  </span>
                </summary>
                <div className="flex flex-col gap-3 px-4 pb-4">
                  {zones.map((z) => {
                    const best = Math.max(-1,
                      ...z.encounters.map((e) => e.best ?? -1));
                    const kills = z.encounters.filter((e) => e.kills > 0).length;
                    return (
                      <div key={z.zone_id}>
                        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-data text-[13px] font-semibold text-ink">
                            {z.zone}
                          </span>
                          <span className="text-[11.5px] text-muted">
                            {kills}/{z.encounters.length} cleared · best{" "}
                            <b style={{ color: parseColor(best < 0 ? null : best) }}>
                              {best < 0 ? "—" : best}
                            </b>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {z.encounters.map((e, i) => (
                            <span key={i}
                                  title={[e.name, e.job && jobLabel(e.job),
                                          e.kills ? t("member.kills", { n: e.kills }) : null]
                                    .filter(Boolean).join(" · ")}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1 font-data text-[11.5px]">
                              <span style={{ color: parseColor(e.best) }}>
                                {e.label ?? e.name} {e.best ?? "✓"}
                              </span>
                              {/* The job is already in the data and every other part
                                  of the page shows it — an old tier was the one place
                                  that dropped it. */}
                              {e.job && <JobIcon job={e.job} size={13} />}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Shown only when somebody actually filled it in — an empty grid would
          read as "never free" rather than "never answered". */}
      {!isEmpty(ov?.availability) && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">
            {t("member.availability")}{" "}
            <span className="text-[13px] font-normal text-muted">
              ({t("member.availabilityNote")})
            </span>
          </h2>
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <AvailabilityGrid value={ov?.availability ?? null} />
          </div>
        </section>
      )}

      {/* ── Collection ── */}
      <section className="mt-6">
        <h2 className="mb-2 flex flex-wrap items-baseline gap-2.5 font-display text-lg font-semibold">
          {t("member.collection")}
          {/* Said on the heading rather than left to the explanation below it. An
              empty tile is a question, and the answer here is short enough to be
              the label: nothing is broken and nothing is missing, this member has
              their achievements set to private. */}
          {collectState === "private" && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[11.5px] font-normal text-muted">
              {t("member.achvPrivate")}
            </span>
          )}
          {collectState === "kept" && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[11.5px] font-normal text-muted">
              {m.achv_seen_at
                ? t("member.achvKeptOn", { on: m.achv_seen_at })
                : t("member.achvKept")}
            </span>
          )}
          {collectState === "unknown" && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[11.5px] font-normal text-muted">
              {t("member.collectUnknown")}
            </span>
          )}
          {collectState === "pending" && (
            <span className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[11.5px] font-normal text-muted">
              {t("member.achvPending")}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {pctTile(t("member.mounts"), m.mounts, agg.mounts, "#4fb8a8")}
          {pctTile(t("member.minions"), m.minions, agg.minions, "#7ea6c9")}
          {pctTile(t("member.rareAchv"), m.rare_achv, agg.rare, "#e5cc80")}
        </div>
        {/* Three blank tiles explain nothing, and the two reasons they can be blank
            need different fixes. Nobody chose either state on purpose: The Lodestone
            hides achievements by default, and FFXIV Collect only knows characters
            somebody has looked up there. */}
        {(collectState === "private" || collectState === "unknown") && (
          <CollectionHelp state={collectState} characterId={m.id} />
        )}
        {/* No steps and no links: the other two states are things a member can
            fix, and this one is a queue they are already in. */}
        {collectState === "pending" && (
          <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-3 text-[12.5px] leading-[1.8] text-muted">
            {t("member.achvPendingNote")}
          </div>
        )}
      </section>
      {/* Last on the page on purpose: somebody with a lot of screenshots
          should be able to reach them and keep scrolling, rather than having
          the rest of their profile appear underneath the pictures. */}
      <MemberGallery characterId={m.id} name={m.name} avatar={m.avatar ?? null}
                     memberOptions={memberOptions} />

    </main>
  );
}
