"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Member, MemberRaids, Overlay, RaidEncounter, RaidZone } from "@/lib/types";
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
import RareAchievements, { type AchievementInfo } from "@/components/RareAchievements";
import { createClient } from "@/lib/supabase/client";

function parseColor(p: number | null | undefined): string {
  if (p == null) return "#7a7a7a";
  if (p >= 100) return "#e5cc80";
  if (p >= 99) return "#e268a8";
  if (p >= 95) return "#ff8000";
  if (p >= 75) return "#a335ee";
  if (p >= 50) return "#2f7fd4";
  if (p >= 25) return "#4caf50";
  return "#7a7a7a";
}

const DEFAULT_BANNER = "linear-gradient(135deg,#151b25,#22304a)";

export default function MemberView({
  m, raids, tierLabels, agg, fc, rareAchievements = [], extremeTotal,
  memberOptions = [],
}: {
  m: Member;
  raids: MemberRaids | null;
  rareAchievements?: AchievementInfo[];
  /** How many extreme trials this patch has, for the "cleared x of y" chip. */
  extremeTotal?: number;
  tierLabels: string[];
  agg: { mounts: (number | null)[]; minions: (number | null)[]; rare: (number | null)[] };
  fc: { name: string; world: string; region: string };
  /** The roster to search when tagging somebody in a gallery picture. */
  memberOptions?: { id: number; name: string }[];
}) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [ov, setOv] = useState<Overlay | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [kudos, setKudos] = useState<number | null>(null);
  const [kudosMsg, setKudosMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const BASE = "bio, accent_color, discord_username, lfg, banner, character_id";
    const V3 = `${BASE}, nickname, birth_month, birth_day`;
    const V7 = `${V3}, availability`;
    // Same fallback as the board, one step longer: an unknown column fails the
    // whole select, so each migration this page reads gets a rung to fall back to
    // rather than blanking every field because one is missing.
    const load = (cols: string) =>
      supabase.from("profiles").select(cols).eq("character_id", m.id).maybeSingle();

    load(V7).then(async ({ data, error }) => {
      let row = (error ? null : data) as Record<string, unknown> | null;
      if (error) {
        const v3 = await load(V3);
        row = (v3.error ? (await load(BASE)).data : v3.data) as
          Record<string, unknown> | null;
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
      }
    });
  }, [supabase, m.id]);

  async function sendKudos() {
    if (!supabase || !user) {
      setKudosMsg("Log in with Discord first");
      return;
    }
    const { error } = await supabase.from("kudos")
      .insert({ sender_id: user.id, receiver_character_id: m.id });
    if (error) {
      setKudosMsg(error.code === "23505"
        ? "Already sent to this member today — come back tomorrow" : "Could not send, try again");
    } else {
      setKudos((k) => (k ?? 0) + 1);
      setKudosMsg("Popoto sent 🥔");
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
  const extremes = raids?.extremes ?? [];

  // Why the collection tiles are empty, which decides what this member has to do
  // about it: never looked up on FFXIV Collect at all, or looked up but keeping
  // achievements private on The Lodestone.
  const collectState: "ok" | "private" | "unknown" =
    m.mounts == null && m.minions == null ? "unknown"
    : m.ach_public === false ? "private"
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
    <main className="pt-5">
      <Link href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted no-underline transition-colors hover:text-accent">
        <span aria-hidden>←</span> {t("member.back")}
      </Link>

      {/* ── Header / banner ── */}
      <section className="overflow-hidden rounded-2xl border border-line"
               style={{ background: ov?.banner ?? DEFAULT_BANNER }}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
          {(m.portrait || m.avatar) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.portrait ?? m.avatar ?? ""} alt=""
                 className="h-44 w-32 shrink-0 rounded-xl border border-line object-cover object-top sm:h-52 sm:w-40" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.2em] text-ink/60">
              <span
                title={onVacation ? ON_VACATION_RANK : "Active"}
                aria-label={onVacation ? ON_VACATION_RANK : "Active"}
                role="img"
                className={`size-2.5 shrink-0 rounded-full ${
                  onVacation ? "bg-[#747f8d]" : "bg-[#43b581]"}`}
              />
              {fc.name} · {m.rank ?? "Member"}
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
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href);
                                 setCopied(true); setTimeout(() => setCopied(false), 2000); }}
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
      <RareAchievements items={rareAchievements} />

      {/* ── Raid: current tier. Hidden entirely when FF Logs has nothing — four
          empty cards saying "Awaiting data" is worse than not asking. ── */}
      {(hasCurrentData || extremes.length > 0) && (
      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg font-semibold">
          {t("member.currentPatch")}{" "}
          <span className="text-[13px] font-normal text-muted">
            {tierLabels[0]}–{tierLabels[tierLabels.length - 1]}
            {raids?.current?.zone ? ` · ${raids.current.zone}` : ""}
            {extremes.length > 0 && ` · ${extremes.length} extreme trials`}
          </span>
        </h2>
        {raids === null ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] text-muted">
            {t("member.notLinked")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {currentCards.map(({ key, label, enc, cleared }) => (
              <div key={key}
                   className={`rounded-xl border p-3.5 ${
                     enc || cleared ? "border-line bg-surface"
                                    : "border-dashed border-line bg-transparent opacity-60"}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-data text-[15px] font-semibold text-ink">{label}</span>
                  {cleared && <span className="text-[11px] text-jade">{t("member.cleared")}</span>}
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-muted">
                  {enc?.name ?? t(hasCurrentData ? "member.noLogYet" : "member.awaitingData")}
                </div>
                <div className="mt-2 font-data text-3xl font-semibold"
                     style={{ color: parseColor(enc?.best) }}>
                  {enc?.best ?? "—"}
                </div>
                <div className="text-[11px] text-muted">
                  {enc ? (
                    <span className="inline-flex items-center gap-1">
                      {enc.kills} kills
                      {enc.job && <> · <JobIcon job={enc.job} size={14} /> {enc.job}</>}
                    </span>
                  ) : "\u00A0"}
                </div>
              </div>
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
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {t("member.progressHint")}
            </p>
          </>
        )}

        {/* Same patch, lower difficulty — kept in this section so "what is this
            person doing right now" is one answer rather than two. */}
        {extremes.length > 0 && (
          <>
            <h3 className="mb-2 mt-4 font-display text-[15px] font-semibold">
              {t("member.extremeTrials")}{" "}
              <span className="text-[12.5px] font-normal text-muted">
                {t("member.clearedCount", {
                  done: extremes.filter((e) => e.cleared).length,
                  total: extremes.length,
                })}
              </span>
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {extremes.map((e) => (
                <div key={`${e.zone_id}-${e.name}`}
                     className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                       e.cleared ? "border-line bg-surface" : "border-dashed border-line opacity-60"}`}>
                  <div className="min-w-0">
                    <div className="truncate font-data text-[13.5px] text-ink">{e.name}</div>
                    <div className="text-[11.5px] text-muted">
                      {e.cleared ? `${e.kills} kills` : "no log"}
                      {e.job && (
                        <span className="inline-flex items-center gap-1">
                          {" · "}<JobIcon job={e.job} size={14} /> {e.job}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-data text-lg font-semibold"
                       style={{ color: parseColor(e.best) }}>
                    {e.best ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      )}

      <JobBreakdown raids={raids} jobScores={m.job_scores} />

      {/* Ultimates nobody logged. FF Logs is opt-in, so a clear can be real and
          invisible there; the Lodestone achievement still proves it happened. */}
      {(m.ult_achv_only?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">
            Ultimates{" "}
            <span className="text-[13px] font-normal text-muted">
              (from achievements — no FF Logs record)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {m.ult_achv_only!.map((name) => (
              <span key={name}
                    className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/8 px-3.5 py-2 text-[13.5px]">
                <span className="rounded-md border border-gold/40 bg-gold/10 px-1.5 py-[1px] font-data text-[12px] font-bold text-gold">
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
        </section>
      )}

      {/* ── Raid: Ultimates ── */}
      {(raids?.ultimates?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Ultimates</h2>
          <div className="flex flex-col gap-2">
            {raids!.ultimates!.map((u, i) => {
              // Prefer the fight name over the zone: FF Logs groups five different
              // Ultimates under zones named "Ultimates", "Ultimates (Legacy)" and
              // "Ultimates (Stormblood)", which say nothing about what was cleared.
              const title = u.name ?? u.zone;
              const short = u.name ? ultimateAbbr(u.name) : null;
              return (
                <div key={`${u.zone_id}-${u.name ?? i}`}
                     className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
                  <div className="min-w-0">
                    {short && (
                      <span className="mr-2 rounded-md border border-gold/40 bg-gold/10 px-1.5 py-[1px] font-data text-[12px] font-bold text-gold">
                        {short}
                      </span>
                    )}
                    <span className="font-data text-[14px] font-semibold text-ink">
                      {title}
                    </span>
                    <div className="text-[11.5px] text-muted">
                      {u.kills} kills
                      {u.job && (
                        <span className="inline-flex items-center gap-1">
                          {" · "}<JobIcon job={u.job} size={14} /> {u.job}
                        </span>
                      )}
                      {u.expansion ? ` · ${u.expansion}` : ""}
                    </div>
                  </div>
                  <div className="font-data text-xl font-semibold"
                       style={{ color: parseColor(u.best) }}>
                    {u.best ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Raid: Legacy ── */}
      {Object.keys(legacyGroups).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">
            Previous savage tiers{" "}
            <span className="text-[13px] font-normal text-muted">(all kept — expand to view)</span>
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
        <h2 className="mb-2 font-display text-lg font-semibold">{t("member.collection")}</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {pctTile(t("member.mounts"), m.mounts, agg.mounts, "#4fb8a8")}
          {pctTile(t("member.minions"), m.minions, agg.minions, "#7ea6c9")}
          {pctTile(t("member.rareAchv"), m.rare_achv, agg.rare, "#e5cc80")}
        </div>
        {/* Three blank tiles explain nothing, and the two reasons they can be blank
            need different fixes. Nobody chose either state on purpose: The Lodestone
            hides achievements by default, and FFXIV Collect only knows characters
            somebody has looked up there. */}
        {collectState !== "ok" && (
          <CollectionHelp state={collectState} characterId={m.id} />
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
