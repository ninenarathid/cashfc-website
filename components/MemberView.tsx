"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Member, MemberRaids, Overlay, RaidZone } from "@/lib/types";
import { LFG_OPTIONS } from "@/lib/types";
import { computeBadges, percentile, topN } from "@/lib/badges";
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

const DEFAULT_BANNER = "linear-gradient(135deg,#241b10,#3a2c14)";

export default function MemberView({
  m, raids, tierLabels, agg, fc,
}: {
  m: Member;
  raids: MemberRaids | null;
  tierLabels: string[];
  agg: { mounts: (number | null)[]; minions: (number | null)[]; rare: (number | null)[] };
  fc: { name: string; world: string; region: string };
}) {
  const [supabase] = useState(createClient);
  const [ov, setOv] = useState<Overlay | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [kudos, setKudos] = useState<number | null>(null);
  const [kudosMsg, setKudosMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("profiles")
      .select("bio, favorite_job, accent_color, discord_username, lfg, banner, character_id")
      .eq("character_id", m.id).maybeSingle()
      .then(({ data }) => {
        if (data)
          setOv({ bio: data.bio, job: data.favorite_job, accent: data.accent_color,
                  discord: data.discord_username, lfg: data.lfg ?? [], banner: data.banner });
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
      setKudosMsg("login ด้วย Discord ก่อนถึงส่งได้");
      return;
    }
    const { error } = await supabase.from("kudos")
      .insert({ sender_id: user.id, receiver_character_id: m.id });
    if (error) {
      setKudosMsg(error.code === "23505"
        ? "วันนี้ส่งให้คนนี้ไปแล้ว — พรุ่งนี้มาใหม่นะ" : "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } else {
      setKudos((k) => (k ?? 0) + 1);
      setKudosMsg("ส่ง popoto แล้ว 🥔");
    }
    setTimeout(() => setKudosMsg(""), 3000);
  }

  const accent = ov?.accent ?? "#e8a33d";
  const badges = useMemo(
    () => computeBadges(m, raids, {
      mountsTop10: topN(agg.mounts, 10),
      rareTop10: topN(agg.rare, 10),
    }, !!ov),
    [m, raids, agg, ov]);

  const legacyGroups = useMemo(() => {
    const g: Record<string, RaidZone[]> = {};
    for (const z of raids?.legacy ?? [])
      (g[z.expansion ?? "อื่นๆ"] ??= []).push(z);
    return g;
  }, [raids]);

  const currentCards = tierLabels.map((label, i) => ({
    label,
    enc: raids?.current?.encounters.find((e) => e.label === label) ?? null,
    cleared: raids?.current?.clears?.[i] ?? false,
  }));
  const hasCurrentData = !!raids?.current?.encounters?.length;

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
            <div className="mt-1 text-[11px] text-muted">มากกว่า {pct}% ของ FC</div>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="pt-5">
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
            <div className="font-data text-[11px] uppercase tracking-[0.2em] text-ink/60">
              {fc.name} · {m.rank ?? "Member"}
            </div>
            <h1 className="font-data text-3xl font-bold tracking-tight sm:text-4xl">
              {m.name}
              {ov && (
                <span className="ml-2" style={{ color: accent }}
                      title={ov.discord ? `เชื่อม Discord: ${ov.discord}` : "ยืนยันตัวตนแล้ว"}>
                  ✦
                </span>
              )}
            </h1>
            <div className="mt-1 text-[13px] text-ink/70">
              Lv {m.level ?? "—"}
              {ov?.job && <> · จ๊อบโปรด <b className="font-data">{ov.job}</b></>}
              {m.nameday?.text && <> · 🎂 {m.nameday.text}</>}
            </div>
            {ov?.bio && (
              <p className="mt-2 text-[14px] italic" style={{ color: accent }}>
                &ldquo;{ov.bio}&rdquo;
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(ov?.lfg ?? []).map((k) => {
                const o = LFG_OPTIONS.find((x) => x.key === k);
                return o ? (
                  <span key={k} className="rounded-full border border-dashed border-amber/70 bg-bg/40 px-2.5 py-[3px] text-[11.5px] text-amber">
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
                   className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-data text-[10.5px] tracking-[0.06em] text-ink/80 no-underline hover:border-amber hover:text-amber">
                  {label}
                </a>
              ))}
              <button onClick={sendKudos}
                      className="rounded-md border border-amber/60 bg-bg/40 px-3 py-1 text-[12.5px] text-amber hover:bg-amber/15">
                🥔 ส่ง popoto{kudos != null ? ` · ${kudos}` : ""}
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href);
                                 setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="rounded-md border border-line bg-bg/40 px-3 py-1 text-[12.5px] text-ink/70 hover:border-muted hover:text-ink">
                {copied ? "คัดลอกแล้ว ✓" : "แชร์ลิงก์"}
              </button>
              {isOwner && (
                <Link href="/profile"
                      className="rounded-md border border-jade/60 bg-bg/40 px-3 py-1 text-[12.5px] text-jade no-underline hover:bg-jade/15">
                  แต่งหน้านี้
                </Link>
              )}
            </div>
            {kudosMsg && <div className="mt-1.5 text-[12.5px] text-amber">{kudosMsg}</div>}
          </div>
        </div>
      </section>

      {/* ── ป้ายตำแหน่ง ── */}
      {badges.length > 0 && (
        <section className="mt-4 flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b.name} title={b.desc}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/8 px-3 py-1.5 text-[12.5px] text-gold">
              <span>{b.icon}</span> {b.name}
            </span>
          ))}
        </section>
      )}

      {/* ── Raid: tier ปัจจุบัน ── */}
      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg font-semibold">
          Tier ปัจจุบัน{" "}
          <span className="text-[13px] font-normal text-muted">
            {tierLabels[0]}–{tierLabels[tierLabels.length - 1]}
            {raids?.current?.zone ? ` · ${raids.current.zone}` : ""}
          </span>
        </h2>
        {raids === null ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] text-muted">
            ยังไม่เชื่อม FF Logs — ข้อมูล raid จะขึ้นอัตโนมัติหลังตั้งค่า API แล้วรัน pipeline
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {currentCards.map(({ label, enc, cleared }) => (
              <div key={label}
                   className={`rounded-xl border p-3.5 ${
                     enc || cleared ? "border-line bg-surface"
                                    : "border-dashed border-line bg-transparent opacity-60"}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-data text-[15px] font-semibold text-ink">{label}</span>
                  {cleared && <span className="text-[11px] text-jade">เคลียร์แล้ว</span>}
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-muted">
                  {enc?.name ?? (hasCurrentData ? "ยังไม่มี log" : "รอข้อมูล")}
                </div>
                <div className="mt-2 font-data text-3xl font-semibold"
                     style={{ color: parseColor(enc?.best) }}>
                  {enc?.best ?? "—"}
                </div>
                <div className="text-[11px] text-muted">
                  {enc ? `${enc.kills} kills${enc.job ? ` · ${enc.job}` : ""}` : "\u00A0"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Raid: Ultimates ── */}
      {(raids?.ultimates?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Ultimates</h2>
          <div className="flex flex-col gap-2">
            {raids!.ultimates!.map((u) => (
              <div key={u.zone_id}
                   className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
                <div className="min-w-0">
                  <span className="font-data text-[14px] font-semibold text-ink">{u.zone}</span>
                  {u.cleared && (
                    <span className="ml-2 rounded-full border border-gold/50 bg-gold/10 px-2 py-[2px] text-[11px] text-gold">
                      🏆 Legend
                    </span>
                  )}
                  <div className="text-[11.5px] text-muted">
                    {u.kills} kills{u.job ? ` · ${u.job}` : ""}
                    {u.expansion ? ` · ${u.expansion}` : ""}
                  </div>
                </div>
                <div className="font-data text-xl font-semibold"
                     style={{ color: parseColor(u.best) }}>
                  {u.best ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Raid: Legacy ── */}
      {Object.keys(legacyGroups).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">
            Savage รุ่นก่อน{" "}
            <span className="text-[13px] font-normal text-muted">(เก็บครบ กดกางดูได้)</span>
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(legacyGroups).map(([exp, zones]) => (
              <details key={exp} className="rounded-xl border border-line bg-surface">
                <summary className="cursor-pointer select-none px-4 py-2.5 font-display text-[14.5px] font-semibold marker:text-amber">
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
                            เคลียร์ {kills}/{z.encounters.length} · best{" "}
                            <b style={{ color: parseColor(best < 0 ? null : best) }}>
                              {best < 0 ? "—" : best}
                            </b>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {z.encounters.map((e, i) => (
                            <span key={i} title={e.name ?? ""}
                                  className="rounded-md border border-line bg-card px-2.5 py-1 font-data text-[11.5px]"
                                  style={{ color: parseColor(e.best) }}>
                              {e.label ?? e.name} {e.best ?? "✓"}
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

      {/* ── Collection ── */}
      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg font-semibold">ของสะสม</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {pctTile("Mounts", m.mounts, agg.mounts, "#4fb8a8")}
          {pctTile("Minions", m.minions, agg.minions, "#7ea6c9")}
          {pctTile("Rare achv", m.rare_achv, agg.rare, "#e5cc80")}
        </div>
        {m.ach_public === false && (
          <p className="mt-2 text-[12px] text-muted">
            ผู้เล่นตั้ง achievement เป็น private — ข้อมูล rare achievement จึงไม่แสดง
          </p>
        )}
      </section>
    </main>
  );
}
