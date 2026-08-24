"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BoardData, Member, Overlay } from "@/lib/types";
import { LFG_OPTIONS, RANK_ORDER } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const TAG_LABELS: Record<string, string> = {
  all: "ทั้งหมด", raider: "Raider", ultimate: "Ultimate", collector: "Collector",
  crafter: "Crafter", pvp: "PvP", casual: "Casual", unknown: "ไม่มีข้อมูล",
};
const TAG_CLASS: Record<string, string> = {
  raider: "border-chili/50 bg-chili/10 text-chili",
  ultimate: "border-gold/50 bg-gold/10 text-gold",
  collector: "border-jade/45 bg-jade/10 text-jade",
  crafter: "border-copper/50 bg-copper/10 text-copper",
  pvp: "border-steel/45 bg-steel/10 text-steel",
  casual: "border-line text-muted",
  unknown: "border-dashed border-line text-muted",
};
const FFLOGS_NOTE: Record<string, string> = {
  ok: "มีข้อมูลบน FF Logs", none: "ไม่พบ log", hidden: "ผู้เล่นซ่อนโปรไฟล์ FF Logs",
  skipped: "ยังไม่ได้เชื่อม FF Logs", error: "ดึงข้อมูลไม่สำเร็จ", pending: "รอรอบอัปเดต",
};
const JOBS = ["PLD","WAR","DRK","GNB","WHM","SCH","AST","SGE","MNK","DRG","NIN","SAM","RPR","VPR","BRD","MCH","DNC","BLM","SMN","RDM","PCT","BLU"];
const BRACKETS = [
  { key: "100", label: "ทอง (100)", min: 100 },
  { key: "99", label: "ชมพู (99+)", min: 99 },
  { key: "95", label: "ส้ม (95+)", min: 95 },
  { key: "75", label: "ม่วง (75+)", min: 75 },
  { key: "50", label: "ฟ้า (50+)", min: 50 },
];

type SortKey = "name" | "parse" | "level" | "mounts" | "rare";

function parseColor(p: number | null): string {
  if (p == null) return "#7a7a7a";
  if (p >= 100) return "#e5cc80";
  if (p >= 99) return "#e268a8";
  if (p >= 95) return "#ff8000";
  if (p >= 75) return "#a335ee";
  if (p >= 50) return "#2f7fd4";
  if (p >= 25) return "#4caf50";
  return "#7a7a7a";
}
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");
const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Avatar({ m, size = 11 }: { m: Member; size?: number }) {
  const [broken, setBroken] = useState(false);
  const cls = size === 11 ? "size-11" : "size-9";
  if (!m.avatar || broken) {
    return (
      <div className={`${cls} flex shrink-0 items-center justify-center rounded-full border border-line font-data text-[12px] font-semibold text-bg`}
           style={{ background: `hsl(${hue(m.name)} 45% 68%)` }}>
        {initials(m.name)}
      </div>
    );
  }
  return (
    <div className={`${cls} shrink-0 overflow-hidden rounded-full border border-line bg-card`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.avatar} alt="" loading="lazy" className="block size-full object-cover"
           onError={() => setBroken(true)} />
    </div>
  );
}

interface Adv {
  lfg: string; job: string; rank: string; bracket: string;
  boss: number[]; ult: boolean; lvMin: string;
}
const ADV_EMPTY: Adv = { lfg: "", job: "", rank: "", bracket: "", boss: [], ult: false, lvMin: "" };

export default function MemberBoard({ data }: { data: BoardData }) {
  const labels = data.current_tier?.labels ?? ["M9S", "M10S", "M11S", "M12S"];
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [view, setView] = useState<"list" | "kitchen">("list");
  const [adv, setAdv] = useState<Adv>(ADV_EMPTY);
  const [advOpen, setAdvOpen] = useState(false);
  const [overlays, setOverlays] = useState<Record<number, Overlay>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const inited = useRef(false);

  // อ่าน filter จาก URL ตอน mount (แชร์ลิงก์ผลกรองได้)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tag")) setTag(p.get("tag")!);
    if (p.get("q")) setQuery(p.get("q")!);
    if (p.get("sort")) setSortBy(p.get("sort") as SortKey);
    if (p.get("view") === "kitchen") setView("kitchen");
    const boss = (p.get("boss") ?? "").split(",").filter(Boolean).map(Number);
    setAdv({
      lfg: p.get("lfg") ?? "", job: p.get("job") ?? "", rank: p.get("rank") ?? "",
      bracket: p.get("br") ?? "", boss, ult: p.get("ult") === "1",
      lvMin: p.get("lv") ?? "",
    });
    if (p.get("lfg") || p.get("job") || p.get("rank") || p.get("br") ||
        boss.length || p.get("ult") || p.get("lv")) setAdvOpen(true);
    inited.current = true;
  }, []);

  // เขียน state ลง URL
  useEffect(() => {
    if (!inited.current) return;
    const p = new URLSearchParams();
    if (tag !== "all") p.set("tag", tag);
    if (query) p.set("q", query);
    if (sortBy !== "name") p.set("sort", sortBy);
    if (view === "kitchen") p.set("view", "kitchen");
    if (adv.lfg) p.set("lfg", adv.lfg);
    if (adv.job) p.set("job", adv.job);
    if (adv.rank) p.set("rank", adv.rank);
    if (adv.bracket) p.set("br", adv.bracket);
    if (adv.boss.length) p.set("boss", adv.boss.join(","));
    if (adv.ult) p.set("ult", "1");
    if (adv.lvMin) p.set("lv", adv.lvMin);
    const qs = p.toString();
    window.history.replaceState(null, "",
      qs ? `?${qs}` : window.location.pathname);
  }, [tag, query, sortBy, view, adv]);

  // โปรไฟล์ + override จาก Supabase
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.from("profiles")
      .select("character_id, bio, favorite_job, accent_color, discord_username, lfg, banner")
      .not("character_id", "is", null)
      .then(({ data: rows }) => {
        const map: Record<number, Overlay> = {};
        for (const r of rows ?? []) {
          if (r.character_id == null) continue;
          map[r.character_id as number] = {
            bio: r.bio, job: r.favorite_job, accent: r.accent_color,
            discord: r.discord_username, lfg: r.lfg ?? [], banner: r.banner,
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bracketMin = BRACKETS.find((b) => b.key === adv.bracket)?.min;
    const lv = Number(adv.lvMin) || null;
    const filtered = visible.filter((m) => {
      if (tag !== "all" && !m.tags.includes(tag)) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      const ov = overlays[m.id];
      if (adv.lfg && !(ov?.lfg ?? []).includes(adv.lfg)) return false;
      if (adv.job && ov?.job !== adv.job) return false;
      if (adv.rank && m.rank !== adv.rank) return false;
      if (bracketMin != null && !(m.parse != null && m.parse >= bracketMin)) return false;
      for (const i of adv.boss) if (!m.current_clears?.[i]) return false;
      if (adv.ult && m.ult_clears <= 0) return false;
      if (lv != null && (m.level ?? 0) < lv) return false;
      return true;
    });
    const val = (m: Member): number =>
      sortBy === "level" ? (m.level ?? -1)
      : sortBy === "parse" ? (m.parse ?? -1)
      : sortBy === "mounts" ? (m.mounts ?? -1)
      : (m.rare_achv ?? -1);
    return [...filtered].sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : val(b) - val(a));
  }, [visible, overlays, tag, query, sortBy, adv]);

  const advCount = (adv.lfg ? 1 : 0) + (adv.job ? 1 : 0) + (adv.rank ? 1 : 0) +
    (adv.bracket ? 1 : 0) + adv.boss.length + (adv.ult ? 1 : 0) + (adv.lvMin ? 1 : 0);

  const selCls = "rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink";

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-3.5 pb-4 pt-6">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">สมาชิก</h1>
          <div className="mt-0.5 text-[13.5px] text-muted">
            ✦ = ยืนยันตัวตนผ่าน Discord · คลิกชื่อเพื่อดูโปรไฟล์เต็ม
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/compare"
                className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted no-underline hover:border-amber hover:text-amber">
            ⚖️ เทียบ 2 คน
          </Link>
          <button
            onClick={() => setView(view === "list" ? "kitchen" : "list")}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] ${
              view === "kitchen"
                ? "border-amber bg-amber/10 text-amber"
                : "border-line text-muted hover:border-muted hover:text-ink"}`}>
            🍲 มุมมองครัว
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder="ค้นหาชื่อตัวละคร…" aria-label="ค้นหาชื่อตัวละคร"
                 className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="เรียงลำดับ"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <option value="name">เรียงตามชื่อ</option>
            <option value="parse">เรียงตาม parse</option>
            <option value="level">เรียงตามเลเวล</option>
            <option value="mounts">เรียงตาม mounts</option>
            <option value="rare">เรียงตาม rare achv</option>
          </select>
          <button onClick={() => setAdvOpen(!advOpen)}
                  className={`rounded-lg border px-3.5 py-2 text-[13.5px] ${
                    advOpen || advCount
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-line bg-surface text-muted hover:border-muted"}`}>
            ตัวกรองขั้นสูง{advCount ? ` (${advCount})` : ""}
          </button>
        </div>

        {advOpen && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-surface p-3">
            <select value={adv.lfg} onChange={(e) => setAdv({ ...adv, lfg: e.target.value })}
                    className={selCls} aria-label="สถานะกำลังหา">
              <option value="">กำลังหา: ทั้งหมด</option>
              {LFG_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <select value={adv.job} onChange={(e) => setAdv({ ...adv, job: e.target.value })}
                    className={selCls} aria-label="จ๊อบโปรด">
              <option value="">จ๊อบโปรด: ทั้งหมด</option>
              {JOBS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <select value={adv.rank} onChange={(e) => setAdv({ ...adv, rank: e.target.value })}
                    className={selCls} aria-label="ยศ FC">
              <option value="">ยศ: ทั้งหมด</option>
              {ranks.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={adv.bracket}
                    onChange={(e) => setAdv({ ...adv, bracket: e.target.value })}
                    className={selCls} aria-label="ระดับ parse">
              <option value="">parse: ทั้งหมด</option>
              {BRACKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
            <span className="flex items-center gap-1.5">
              {labels.map((lb, i) => {
                const on = adv.boss.includes(i);
                return (
                  <button key={lb}
                    onClick={() => setAdv({ ...adv,
                      boss: on ? adv.boss.filter((x) => x !== i) : [...adv.boss, i] })}
                    className={`rounded-md border px-2 py-1 font-data text-[11.5px] ${
                      on ? "border-chili bg-chili/15 text-chili"
                         : "border-line text-muted hover:border-muted"}`}
                    title={`เฉพาะคนที่เคลียร์ ${lb} แล้ว`}>
                    {lb}
                  </button>
                );
              })}
            </span>
            <button onClick={() => setAdv({ ...adv, ult: !adv.ult })}
                    className={`rounded-md border px-2.5 py-1 text-[12px] ${
                      adv.ult ? "border-gold bg-gold/15 text-gold"
                              : "border-line text-muted hover:border-muted"}`}>
              🏆 มี Ultimate
            </button>
            <input type="number" min={1} max={100} value={adv.lvMin}
                   onChange={(e) => setAdv({ ...adv, lvMin: e.target.value })}
                   placeholder="Lv ≥" aria-label="เลเวลขั้นต่ำ"
                   className="w-20 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink placeholder:text-muted" />
            {advCount > 0 && (
              <button onClick={() => setAdv(ADV_EMPTY)}
                      className="ml-auto text-[12.5px] text-muted underline hover:text-ink">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามแท็ก">
          {Object.keys(TAG_LABELS).map((key) => {
            if (key !== "all" && !counts[key]) return null;
            const on = tag === key;
            return (
              <button key={key} onClick={() => setTag(key)} aria-pressed={on}
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
          แสดง {list.length} จาก {visible.length} คน
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
              ไม่พบสมาชิกที่ตรงกับเงื่อนไข — ลองล้างคำค้นหรือตัวกรอง
            </div>
          ) : (
            list.map((m) => {
              const ov = overlays[m.id];
              const accent = ov?.accent ?? "#e8a33d";
              const meta = [m.rank ?? "—", `Lv ${m.level ?? "—"}`];
              if (ov?.job) meta.push(ov.job);
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
                              title={ov.discord ? `เชื่อม Discord: ${ov.discord}` : "ยืนยันตัวตนแล้ว"}>
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
                    {m.tags.map((t) => (
                      <span key={t}
                            className={`whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${TAG_CLASS[t] ?? "border-line text-muted"}`}>
                        {TAG_LABELS[t] ?? t}
                      </span>
                    ))}
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
                    <div className="min-w-[34px] text-right font-data text-sm font-semibold"
                         style={{ color: parseColor(m.parse) }}
                         title={FFLOGS_NOTE[m.fflogs] ?? ""}>
                      {m.parse ?? "—"}
                      <small className="block text-[9.5px] font-medium tracking-[0.08em] text-muted">
                        BEST %
                      </small>
                    </div>
                    <Link href={`/member/${m.id}`}
                          className="rounded-md border border-line px-2.5 py-1 font-data text-[10.5px] tracking-[0.06em] text-muted no-underline transition-colors hover:border-amber hover:text-amber">
                      โปรไฟล์
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
