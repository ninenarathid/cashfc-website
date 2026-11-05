"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/admin";
import { KIND_COLOR, KIND_LABEL, type ContentKind } from "@/lib/party";
import {
  DEFAULT_KINDS, PF_KINDS, bkkMidnight, fmtShortDay, fmtWhen,
  loadPfEvent, loadPfParties, phaseOf, savePfDraw, savePfEvent, savePfPublish, savePfReview, scoreEvent,
  type ContentInfo, type EventDraft, type PfEvent, type PfRun, type Review,
  type RunState, type Verdict,
} from "@/lib/pf-event";
import Modal from "@/components/ui/Modal";
import ImageLightbox from "@/components/ui/ImageLightbox";
import AdminSwitch from "@/components/AdminSwitch";
import { Board, Face, Prizes } from "@/components/aqua/PfEventParts";

/**
 * Aqua's desk for the CASH PARTY FINDER event.
 *
 * Three things to do, in the order she does them: look at the pictures and
 * say pass or not, read who is ahead, and make the draw. Everything else is
 * the board's own data scored by lib/pf-event, so the page never holds a
 * number that could disagree with the parties it came from.
 */

export interface PfPersonOption {
  id: number; name: string; face: string | null; fc: boolean; sprout: boolean;
}

type Tab = "review" | "board" | "all";

const STATE_LABEL: Record<RunState, string> = {
  ok: "ผ่าน", no: "ไม่ผ่าน", pending: "รอตรวจ", bare: "ยังไม่มีรูป",
};
const STATE_TONE: Record<RunState, string> = {
  ok: "border-jade/60 bg-jade/15 text-jade",
  no: "border-chili/60 bg-chili/10 text-chili",
  pending: "border-gold/60 bg-gold/10 text-gold",
  bare: "border-line bg-bg/40 text-muted",
};

export default function PfEventDesk(
  { content, people, startTab = "review", startSettings = false }: {
    content: Record<string, ContentInfo>; people: PfPersonOption[];
    startTab?: Tab; startSettings?: boolean;
  },
) {
  const { realAdmin, isAdmin, ready } = useAdmin();
  const [supabase] = useState(createClient);
  const [stage, setStage] = useState<"loading" | "missing" | "none" | "ok" | "error">("loading");
  const [failed, setFailed] = useState<string | null>(null);
  const [ev, setEv] = useState<PfEvent | null>(null);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [parties, setParties] = useState<Awaited<ReturnType<typeof loadPfParties>>>([]);
  const [tab, setTab] = useState<Tab>(startTab);
  const [settings, setSettings] = useState(startSettings);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setFailed(null);
    const got = await loadPfEvent(supabase);
    if (got.state !== "ok") {
      setStage(got.state === "error" ? "error" : got.state);
      if (got.state === "error") setFailed(got.error);
      return;
    }
    try {
      const ps = await loadPfParties(supabase, got.event);
      setEv(got.event); setReviews(got.reviews); setParties(ps); setStage("ok");
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e)); setStage("error");
    }
  }, [supabase]);

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const known = useMemo(
    () => new Map(people.map((p) => [p.id, { name: p.name, avatar: p.face }])), [people]);
  const fcOf = useMemo(() => {
    const fc = new Set(people.filter((p) => p.fc).map((p) => p.id));
    return (id: number) => fc.has(id);
  }, [people]);
  const s = useMemo(
    () => (ev ? scoreEvent(ev, parties, reviews, content, fcOf, known) : null),
    [ev, parties, reviews, content, fcOf, known]);

  const judge = async (run: PfRun, verdict: Verdict | null) => {
    if (!supabase || !ev) return;
    const before = reviews;
    const next = new Map(reviews);
    if (verdict) next.set(run.party.id, { verdict, note: null }); else next.delete(run.party.id);
    setReviews(next);
    const r = await savePfReview(supabase, ev.id, run.party.id, verdict);
    if (r.error) { setReviews(before); setFlash(`บันทึกไม่ได้: ${r.error}`); }
  };

  if (!ready) return null;
  if (!realAdmin) {
    return <div className="mt-7 rounded-xl border border-dashed border-line p-10 text-center text-muted">เฉพาะแอดมิน</div>;
  }
  if (!isAdmin) {
    return <main className="pt-7"><AdminSwitch /></main>;
  }

  return (
    <main className="pb-16 pt-6">
      <Link href="/admin/aqua" className="text-ui text-muted no-underline hover:text-ink">← หน้า Aqua</Link>

      {stage === "loading" && (
        <div aria-hidden className="mt-4 h-40 animate-pulse rounded-2xl border border-line bg-surface/60" />
      )}
      {stage === "missing" && (
        <Note tone="gold">
          ยังไม่ได้รัน <b>v320</b> (ฉบับล่าสุด) ใน Supabase — รันไฟล์ <code>supabase/v320_a_party_finder_event.sql</code> แล้วกลับมาหน้านี้
        </Note>
      )}
      {stage === "error" && <Note tone="chili">โหลดไม่ได้: {failed}</Note>}
      {stage === "none" && (
        <section className="mt-4 rounded-2xl border border-dashed border-accent/50 bg-accent/5 p-6 text-center">
          <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">กิจกรรม Party Finder</div>
          <p className="mt-2 text-read text-ink">ยังไม่มีกิจกรรม ตั้งช่วงวันและกติกาก่อน แล้วหน้านี้จะนับแต้มให้เอง</p>
          <button type="button" onClick={() => setSettings(true)}
                  className="mt-4 min-h-11 rounded-lg border border-accent bg-accent/20 px-5 text-ui font-medium text-accent hover:bg-accent/30">
            สร้างกิจกรรม CASH PARTY FINDER
          </button>
        </section>
      )}

      {stage === "ok" && ev && s && (
        <>
          <Header ev={ev} onSettings={() => setSettings(true)} onRefresh={() => void load()}
                  onPublish={async (on) => {
                    if (!supabase) return;
                    const r = await savePfPublish(supabase, ev.id, on);
                    if (r.error) setFlash(`บันทึกไม่ได้: ${r.error}`);
                    else setEv({ ...ev, publishedAt: r.publishedAt ?? null });
                  }} />
          <Stats s={s} onPending={() => setTab("review")} />
          <Prizes ev={ev} s={s} people={known}
                  onDraw={async (draw) => {
                    if (!supabase) return;
                    const r = await savePfDraw(supabase, ev.id, draw);
                    if (r.error) setFlash(`บันทึกผลสุ่มไม่ได้: ${r.error}`);
                    else setEv({ ...ev, draw });
                  }} />

          <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-line p-1">
            {([
              ["review", "ตรวจรูป", s.counts.pending],
              ["board", "ตารางแต้ม", s.people.length],
              ["all", "ห้องทั้งหมด", s.runs.length],
            ] as const).map(([k, label, n]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                      className={`inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-read transition-colors ${tab === k ? "bg-card text-accent" : "text-muted hover:text-ink"}`}>
                {label}
                <span className={`rounded-full px-1.5 font-data text-meta ${k === "review" && n > 0 ? "bg-gold/20 text-gold" : "opacity-70"}`}>{n}</span>
              </button>
            ))}
          </div>

          <div className="tab-in pt-3">
            {tab === "review" && (
              <ReviewList ev={ev} runs={s.runs.filter((r) => r.state === "pending")}
                          bare={s.runs.filter((r) => r.state === "bare").length}
                          onJudge={judge} people={known} fcOf={fcOf} newbies={ev.newbies} />
            )}
            {tab === "board" && <Board s={s} ev={ev} />}
            {tab === "all" && <AllRuns ev={ev} runs={s.runs} onJudge={judge} people={known} fcOf={fcOf} />}
          </div>
        </>
      )}

      {flash && (
        <div role="status" className="fixed inset-x-4 bottom-20 z-50 sm:bottom-4 mx-auto max-w-md rounded-lg border border-chili/50 bg-surface p-3 text-center text-ui text-chili shadow-lg">
          {flash}
        </div>
      )}

      {settings && supabase && (
        <Settings ev={stage === "ok" ? ev : null} people={people} onClose={() => setSettings(false)}
                  onSave={async (draft) => {
                    const r = await savePfEvent(supabase, draft, stage === "ok" ? ev?.id : undefined);
                    if (r.error) return r.error;
                    setSettings(false);
                    await load();
                    return null;
                  }} />
      )}
    </main>
  );
}

/* ── the top ─────────────────────────────────────────────────────────────── */

function Note({ tone, children }: { tone: "gold" | "chili"; children: React.ReactNode }) {
  const c = tone === "gold" ? "border-gold/40 bg-gold/10 text-gold" : "border-chili/40 bg-chili/10 text-chili";
  return <div className={`mt-4 rounded-xl border p-4 text-ui leading-relaxed ${c}`}>{children}</div>;
}

function Header(
  { ev, onSettings, onRefresh, onPublish }: {
    ev: PfEvent; onSettings: () => void; onRefresh: () => void; onPublish: (on: boolean) => Promise<void>;
  },
) {
  const [busy, setBusy] = useState(false);
  const publish = async (on: boolean) => {
    if (!confirm(on
      ? "เผยแพร่ให้ทุกคนเห็น? หน้ากิจกรรม ตารางแต้ม และผลตรวจรูปจะเปิดให้สมาชิกดู"
      : "กลับเป็นฉบับร่าง? สมาชิกจะไม่เห็นกิจกรรมนี้จนกว่าจะเผยแพร่อีกครั้ง")) return;
    setBusy(true); await onPublish(on); setBusy(false);
  };
  const ph = phaseOf(ev);
  const chip = ph.stage === "live" ? { t: `กำลังจัด · เหลือ ${ph.daysLeft} วัน`, c: "border-jade/60 bg-jade/15 text-jade" }
    : ph.stage === "soon" ? { t: `เริ่มในอีก ${ph.daysLeft} วัน`, c: "border-accent/60 bg-accent/15 text-accent" }
      : { t: "จบแล้ว", c: "border-line bg-bg/40 text-muted" };
  const last = new Date(Date.parse(ev.endsAt) - 1).toISOString();
  return (
    <header className="mt-4 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">กิจกรรม · Party Finder</div>
        <h1 className="mt-1 font-display text-head font-semibold leading-tight text-ink">{ev.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-ui text-muted">
          <span>{fmtShortDay(ev.startsAt)} – {fmtShortDay(last)}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-meta font-medium ${chip.c}`}>{chip.t}</span>
          <span className="text-meta">{ev.fcOnly ? "รางวัลเฉพาะคนใน FC" : "คนนอก FC รับรางวัลได้"}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onRefresh} aria-label="โหลดใหม่"
                className="grid size-11 place-items-center rounded-lg border border-line bg-bg/40 text-muted hover:border-muted hover:text-ink">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
          </svg>
        </button>
        <button type="button" onClick={onSettings}
                className="min-h-11 rounded-lg border border-line bg-bg/40 px-3.5 text-ui text-ink hover:border-muted">
          ตั้งค่า
        </button>
      </div>
      <div className={`flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-ui ${ev.publishedAt ? "border-jade/40 bg-jade/10" : "border-gold/40 bg-gold/10"}`}>
        <span className={`font-medium ${ev.publishedAt ? "text-jade" : "text-gold"}`}>
          {ev.publishedAt ? "เผยแพร่แล้ว — ทุกคนเห็น" : "ฉบับร่าง — เห็นเฉพาะแอดมิน"}
        </span>
        <Link href="/party/event" target="_blank"
              className="inline-flex min-h-11 items-center px-1 text-ui text-muted underline hover:text-ink sm:min-h-9">
          ดูหน้าสมาชิก ↗
        </Link>
        <button type="button" disabled={busy} onClick={() => void publish(!ev.publishedAt)}
                className={`ml-auto min-h-11 rounded-lg border px-3.5 text-ui font-medium disabled:opacity-50 sm:min-h-9 ${ev.publishedAt ? "border-line text-muted hover:text-ink" : "border-jade bg-jade/20 text-jade hover:bg-jade/30"}`}>
          {ev.publishedAt ? "กลับเป็นร่าง" : "เผยแพร่"}
        </button>
      </div>
    </header>
  );
}

function Stats({ s, onPending }: { s: NonNullable<ReturnType<typeof scoreEvent>>; onPending: () => void }) {
  const tile = "rounded-xl border border-line bg-card p-3 sm:p-4";
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <div className={tile}>
        <div className="text-meta text-muted">ห้องที่ผ่าน</div>
        <div className="mt-0.5 font-data text-title font-semibold text-jade">{s.counts.ok}</div>
      </div>
      <button type="button" onClick={onPending}
              className={`${tile} flex flex-col items-start justify-start text-left transition-colors hover:border-gold/60 ${s.counts.pending ? "border-gold/50" : ""}`}>
        <div className="text-meta text-muted">รอตรวจรูป</div>
        <div className={`mt-0.5 font-data text-title font-semibold ${s.counts.pending ? "text-gold" : "text-ink"}`}>{s.counts.pending}</div>
      </button>
      <div className={tile}>
        <div className="text-meta text-muted">คนที่ได้แต้ม</div>
        <div className="mt-0.5 font-data text-title font-semibold text-ink">{s.fcPeople + s.outsidePeople}</div>
        <div className="text-meta text-muted">ใน FC {s.fcPeople} · นอก FC {s.outsidePeople}</div>
      </div>
      <div className={tile}>
        <div className="text-meta text-muted">แต้มรวม</div>
        <div className="mt-0.5 font-data text-title font-semibold text-ink">{s.totalPoints}</div>
      </div>
    </div>
  );
}

/* ── pictures to judge ───────────────────────────────────────────────────── */

type JudgeFn = (run: PfRun, v: Verdict | null) => Promise<void>;

/** Faces shown on a card before "+N": an alliance is twenty-four. */
const ROSTER = 10;

function ReviewList(
  { ev, runs, bare, onJudge, people, fcOf, newbies }: {
    ev: PfEvent; runs: PfRun[]; bare: number; onJudge: JudgeFn;
    people: Map<number, { name: string; avatar: string | null }>;
    fcOf: (id: number) => boolean; newbies: number[];
  },
) {
  return (
    <div className="flex flex-col gap-3">
      <Rules ev={ev} />
      {!runs.length && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-ui text-muted">
          ไม่มีรูปรอตรวจ 🎉
        </div>
      )}
      {runs.map((r) => <RunCard key={r.party.id} run={r} ev={ev} onJudge={onJudge} people={people} fcOf={fcOf} newbies={newbies} />)}
      {bare > 0 && (
        <p className="text-meta text-muted">
          อีก {bare} ห้องยังไม่มีรูป (หัวห้องยังไม่อัปรูปกลุ่ม หรือยังไม่มีใครส่งรูปในแชตห้อง) — ดูได้ในแท็บ “ห้องทั้งหมด”
        </p>
      )}
    </div>
  );
}

function Rules({ ev }: { ev: PfEvent }) {
  return (
    <details className="rounded-xl border border-line bg-card/60 px-4 py-2.5 text-ui text-muted">
      <summary className="cursor-pointer select-none py-1 text-ink">กติกาที่ใช้ตรวจ</summary>
      <ul className="mt-1 list-disc space-y-1 pb-1 pl-5">
        <li>รูปห้องสุดท้าย / รับหีบสมบัติ / หรือห้องฝึกที่อยู่ในห้องเกิน {ev.practiceMinutes} นาที</li>
        <li>ดันที่เลเวลต่ำกว่า {ev.unsyncMinLevel} ต้องลงแบบ sync (unsync ไม่นับ)</li>
        <li>ผ่าน 1 ห้อง = 1 แต้มทุกคนในปาร์ตี้ · สูงสุด {ev.dailyCap} แต้ม/คน/วัน (เวลาไทย)</li>
        <li>มีผู้เล่นใหม่ตามรายชื่อในปาร์ตี้ → คนอื่นในปาร์ตี้ (Helper) ได้ {ev.helperPoints} แต้ม</li>
        <li>นับประเภท: {ev.kinds.map((k) => KIND_LABEL[k]).join(", ")}</li>
      </ul>
    </details>
  );
}

function RunCard(
  { run, ev, onJudge, people, fcOf, newbies, compact = false }: {
    run: PfRun; ev: PfEvent; onJudge: JudgeFn;
    people: Map<number, { name: string; avatar: string | null }>;
    fcOf: (id: number) => boolean; newbies: number[]; compact?: boolean;
  },
) {
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [everyone, setEveryone] = useState(false);
  const p = run.party;
  const pics = [...p.photos, ...p.shots];
  const lead = p.ownerCharacterId != null ? people.get(p.ownerCharacterId) : undefined;
  const newbie = new Set(newbies);
  const color = run.kind ? KIND_COLOR[run.kind] : "var(--color-line)";
  const per = run.state === "ok" ? Math.max(0, ...run.gave.values()) : null;

  const act = async (v: Verdict | null) => { setBusy(true); await onJudge(run, v); setBusy(false); };

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/party/${p.id}`} target="_blank"
                  className="font-display text-lead font-semibold text-ink no-underline hover:text-accent">
              {run.name}
            </Link>
            <span className="text-meta text-muted">
              {run.kind ? KIND_LABEL[run.kind] : "?"}{run.level ? ` · Lv${run.level}` : ""}
            </span>
          </div>
          <div className="mt-0.5 text-meta text-muted">
            {fmtWhen(p.startsAt)} · หัวห้อง {lead?.name ?? p.members[0]?.name ?? "?"}
            {p.outcome === "success" ? " · หัวห้องกดสำเร็จแล้ว" : p.outcome === "fail" ? " · ไม่ได้กดสำเร็จ" : ""}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-meta font-medium ${STATE_TONE[run.state]}`}>
          {STATE_LABEL[run.state]}{per != null && per > 0 ? ` · +${per}` : ""}
        </span>
      </div>

      {(run.flags.lowLevel || run.flags.practice || run.flags.newbie || run.flags.nameOnly > 0) && (
        <div className="flex flex-wrap gap-1.5 px-3 sm:px-4">
          {run.flags.lowLevel && (
            <Flag tone="gold">⚠ Lv{run.level} ต่ำกว่า {ev.unsyncMinLevel} — ต้อง sync{run.flags.few ? ` · มี ${p.members.length} คน` : ""}</Flag>
          )}
          {run.flags.practice && <Flag tone="accent">ห้องฝึก — ดูว่าเกิน {ev.practiceMinutes} นาที</Flag>}
          {run.flags.newbie && <Flag tone="jade">🌱 มีผู้เล่นใหม่ — Helper ได้ {ev.helperPoints} แต้ม</Flag>}
          {run.flags.nameOnly > 0 && <Flag tone="muted">ไม่มีบัญชีในเว็บ {run.flags.nameOnly} คน (ไม่ได้แต้ม)</Flag>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 sm:px-4">
        {(everyone ? p.members : p.members.slice(0, ROSTER)).map((m, i) => {
          const id = m.characterId;
          const out = id != null && !fcOf(id);
          const pts = id != null ? run.gave.get(id) : undefined;
          return (
            <span key={`${id ?? m.name}-${i}`}
                  className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-2 text-meta ${out ? "border-copper/50 text-copper" : id == null ? "border-dashed border-line text-muted" : "border-line text-ink"}`}>
              <Face src={m.avatar} name={m.name} size={20} />
              <span className="max-w-[9rem] truncate">{m.name}</span>
              {id != null && newbie.has(id) && <span aria-label="ผู้เล่นใหม่">🌱</span>}
              {out && <span className="text-[10px] uppercase tracking-wide">นอก FC</span>}
              {pts != null && <span className="font-data text-jade">+{pts}</span>}
            </span>
          );
        })}
        {!everyone && p.members.length > ROSTER && (
          <button type="button" onClick={() => setEveryone(true)}
                  className="rounded-full border border-line px-2.5 py-0.5 text-meta text-muted hover:text-ink">
            +{p.members.length - ROSTER} คน
          </button>
        )}
        {!p.members.length && <span className="text-meta text-muted">ไม่มีคนในที่นั่ง</span>}
      </div>

      {!compact && pics.length > 0 && (
        <div className="px-3 pt-3 text-meta text-muted sm:px-4">
          หลักฐาน {pics.length} รูป{pics.length > 1 ? " · เลื่อนดู / กดเพื่อขยาย" : " · กดเพื่อขยาย"}
        </div>
      )}
      {!compact && pics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-1.5 sm:px-4">
          {pics.map((src, i) => (
            <button key={src + i} type="button" onClick={() => setZoom(i)}
                    className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-bg hover:border-accent sm:h-32 sm:w-48">
              <Thumb src={src} />
              <span className="absolute bottom-1 left-1 rounded bg-bg/80 px-1.5 text-[10px] text-muted">
                {i < p.photos.length ? "รูปกลุ่ม" : "ในแชต"}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3 sm:px-4">
        {run.state === "ok" || run.state === "no" ? (
          <>
            <span className="text-meta text-muted">ตัดสินแล้ว</span>
            <button type="button" disabled={busy} onClick={() => void act(null)}
                    className="min-h-11 rounded-lg border border-line px-3 text-ui text-muted hover:text-ink">
              เปลี่ยนเป็นรอตรวจ
            </button>
            {compact && pics.length > 0 && (
              <button type="button" onClick={() => setZoom(0)}
                      className="min-h-11 rounded-lg border border-line px-3 text-ui text-muted hover:text-ink">
                ดูรูป ({pics.length})
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => void act("ok")}
                    className="min-h-11 flex-1 rounded-lg border border-jade bg-jade/20 px-4 text-ui font-medium text-jade hover:bg-jade/30 sm:flex-none">
              ✓ ผ่าน
            </button>
            <button type="button" disabled={busy} onClick={() => void act("no")}
                    className="min-h-11 flex-1 rounded-lg border border-chili/60 bg-chili/10 px-4 text-ui font-medium text-chili hover:bg-chili/20 sm:flex-none">
              ✕ ไม่ผ่าน
            </button>
            {compact && pics.length > 0 && (
              <button type="button" onClick={() => setZoom(0)}
                      className="min-h-11 rounded-lg border border-line px-3 text-ui text-muted hover:text-ink">
                ดูรูป ({pics.length})
              </button>
            )}
          </>
        )}
      </div>

      {zoom != null && (
        <ImageLightbox images={pics} at={zoom} onMove={setZoom} onClose={() => setZoom(null)} />
      )}
    </article>
  );
}

/** A picture of proof, or a plain word where it will not load. */
function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className="grid size-full place-items-center p-2 text-center text-meta text-muted">โหลดรูปไม่ได้</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" />;
}

function Flag({ tone, children }: { tone: "gold" | "accent" | "jade" | "muted"; children: React.ReactNode }) {
  const c = {
    gold: "border-gold/50 bg-gold/10 text-gold",
    accent: "border-accent/50 bg-accent/10 text-accent",
    jade: "border-jade/50 bg-jade/10 text-jade",
    muted: "border-line bg-bg/40 text-muted",
  }[tone];
  return <span className={`rounded-md border px-2 py-0.5 text-meta ${c}`}>{children}</span>;
}

function AllRuns(
  { ev, runs, onJudge, people, fcOf }: {
    ev: PfEvent; runs: PfRun[]; onJudge: JudgeFn;
    people: Map<number, { name: string; avatar: string | null }>; fcOf: (id: number) => boolean;
  },
) {
  const [state, setState] = useState<RunState | "every">("every");
  const shown = [...runs].reverse().filter((r) => state === "every" || r.state === state);
  const count = (k: RunState) => runs.filter((r) => r.state === k).length;
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-line p-1">
        {(["every", "ok", "pending", "bare", "no"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setState(k)} aria-pressed={state === k}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-md px-3 text-ui sm:min-h-9 ${state === k ? "bg-card text-accent" : "text-muted hover:text-ink"}`}>
            {k === "every" ? "ทั้งหมด" : STATE_LABEL[k]}
            <span className="ml-1 font-data text-meta opacity-70">{k === "every" ? runs.length : count(k)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {!shown.length && <div className="rounded-xl border border-dashed border-line p-8 text-center text-ui text-muted">ไม่มีห้องในกลุ่มนี้</div>}
        {shown.map((r) => (
          <RunCard key={r.party.id} run={r} ev={ev} onJudge={onJudge} people={people} fcOf={fcOf}
                   newbies={ev.newbies} compact />
        ))}
      </div>
    </div>
  );
}

/* ── settings ────────────────────────────────────────────────────────────── */

const toLocalDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

function Settings(
  { ev, people, onClose, onSave }: {
    ev: PfEvent | null; people: PfPersonOption[];
    onClose: () => void; onSave: (d: EventDraft) => Promise<string | null>;
  },
) {
  const today = bkkMidnight(Date.now());
  const [title, setTitle] = useState(ev?.title ?? "CASH PARTY FINDER");
  const [from, setFrom] = useState(toLocalDay(ev?.startsAt ?? today));
  // The last day, inclusive, as Aqua thinks of it; stored as the midnight after.
  const [to, setTo] = useState(toLocalDay(ev
    ? new Date(Date.parse(ev.endsAt) - 1).toISOString()
    : new Date(Date.parse(today) + 29 * 864e5).toISOString()));
  const [kinds, setKinds] = useState<ContentKind[]>(ev?.kinds ?? DEFAULT_KINDS);
  const [cap, setCap] = useState(ev?.dailyCap ?? 10);
  const [helper, setHelper] = useState(ev?.helperPoints ?? 2);
  const [minLv, setMinLv] = useState(ev?.unsyncMinLevel ?? 80);
  const [mins, setMins] = useState(ev?.practiceMinutes ?? 15);
  const [fcOnly, setFcOnly] = useState(ev?.fcOnly ?? true);
  const [drawN, setDrawN] = useState(ev?.drawCount ?? 10);
  const [newbies, setNewbies] = useState<number[]>(ev?.newbies ?? []);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const fc = useMemo(() => people.filter((p) => p.fc), [people]);
  const found = q.trim()
    ? fc.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()) && !newbies.includes(p.id)).slice(0, 8)
    : [];
  const sprouts = fc.filter((p) => p.sprout && !newbies.includes(p.id));

  const save = async () => {
    setErr(null);
    const startsAt = `${from}T00:00:00+07:00`;
    const endsAt = new Date(Date.parse(`${to}T00:00:00+07:00`) + 864e5).toISOString();
    if (!title.trim()) return setErr("ใส่ชื่อกิจกรรม");
    if (Date.parse(endsAt) <= Date.parse(startsAt)) return setErr("วันจบต้องไม่ก่อนวันเริ่ม");
    if (!kinds.length) return setErr("เลือกประเภทที่นับอย่างน้อย 1");
    setBusy(true);
    const e = await onSave({
      title, startsAt, endsAt, kinds, dailyCap: cap, helperPoints: helper,
      unsyncMinLevel: minLv, practiceMinutes: mins, fcOnly, newbies, drawCount: drawN,
    });
    setBusy(false);
    if (e) setErr(e);
  };

  const field = "mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-read text-ink outline-none focus:border-accent";
  const num = (v: number, set: (n: number) => void, min: number, max: number, label: string) => (
    <label className="block text-ui text-muted">
      {label}
      <input type="number" inputMode="numeric" min={min} max={max} value={v}
             onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
             className={field} />
    </label>
  );

  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }} title={ev ? "ตั้งค่ากิจกรรม" : "สร้างกิจกรรม"} sticky>
      <div className="flex flex-col gap-4">
        <label className="block text-ui text-muted">
          ชื่อกิจกรรม
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-ui text-muted">เริ่ม (เวลาไทย)
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          </label>
          <label className="block text-ui text-muted">ถึงวัน (รวมวันนี้)
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          </label>
        </div>

        <fieldset>
          <legend className="text-ui text-muted">ประเภทปาร์ตี้ที่นับ</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PF_KINDS.map((k) => {
              const on = kinds.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on}
                        onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])}
                        className={`min-h-11 rounded-full border px-3.5 text-ui ${on ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>
                  {KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          {num(cap, setCap, 1, 100, "แต้มสูงสุด/คน/วัน")}
          {num(helper, setHelper, 1, 10, "แต้ม Helper")}
          {num(minLv, setMinLv, 1, 200, "unsync นับตั้งแต่ Lv")}
          {num(mins, setMins, 1, 600, "ห้องฝึกขั้นต่ำ (นาที)")}
          {num(drawN, setDrawN, 1, 100, "Lucky Draw กี่คน")}
          <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-line px-3 text-ui text-ink">
            <input type="checkbox" checked={fcOnly} onChange={(e) => setFcOnly(e.target.checked)} className="size-4" />
            รางวัลเฉพาะคนใน FC
          </label>
        </div>

        <fieldset>
          <legend className="text-ui text-muted">ผู้เล่นใหม่ใน FC (Helper ได้ {helper} แต้ม) · {newbies.length} คน</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {newbies.map((id) => {
              const p = byId.get(id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full border border-jade/50 bg-jade/10 py-0.5 pl-0.5 pr-1 text-ui text-ink">
                  <Face src={p?.face ?? null} name={p?.name ?? "?"} size={22} />
                  {p?.name ?? `#${id}`}
                  <button type="button" aria-label={`เอา ${p?.name ?? id} ออก`}
                          onClick={() => setNewbies(newbies.filter((x) => x !== id))}
                          className="-my-1 grid size-10 place-items-center rounded-full text-muted hover:text-chili">✕</button>
                </span>
              );
            })}
            {!newbies.length && <span className="text-meta text-muted">ยังไม่มี</span>}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อคนใน FC เพื่อเพิ่ม" className={field} />
          {found.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-lg border border-line">
              {found.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setNewbies([...newbies, p.id]); setQ(""); }}
                          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-read text-ink hover:bg-card">
                    <Face src={p.face} name={p.name} size={24} />{p.name}{p.sprout && " 🌱"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sprouts.length > 0 && (
            <button type="button" onClick={() => setNewbies([...newbies, ...sprouts.map((p) => p.id)])}
                    className="mt-2 min-h-11 rounded-lg border border-jade/50 px-3 text-ui text-jade hover:bg-jade/10">
              + เพิ่มทุกคนที่มีต้นกล้า 🌱 ({sprouts.length})
            </button>
          )}
        </fieldset>

        {err && <p className="rounded-lg border border-chili/40 bg-chili/10 p-2.5 text-ui text-chili">{err}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
                  className="min-h-11 flex-1 rounded-lg border border-line text-ui text-muted hover:text-ink">ยกเลิก</button>
          <button type="button" disabled={busy} onClick={() => void save()}
                  className="min-h-11 flex-1 rounded-lg border border-accent bg-accent/20 text-ui font-medium text-accent hover:bg-accent/30 disabled:opacity-50">
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
