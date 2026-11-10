"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { KIND_LABEL } from "@/lib/party";
import {
  pointsOf,
  fmtShortDay, fmtWhen, loadPfEvent, loadPfParties, phaseOf, scoreEvent,
  type ContentInfo, type PfEvent, type PfParty, type Review, type RunState,
} from "@/lib/pf-event";
import { Board, Face, Prizes } from "@/components/aqua/PfEventParts";

/**
 * CASH PARTY FINDER, the members' side: how to take part, where everybody
 * stands, and where you do.
 *
 * Scored by the same function as Aqua's desk from the same rows, so the two
 * pages cannot disagree. A draft reaches only admins (the database decides),
 * and they see it here with a band across the top saying so.
 */

interface Person { id: number; name: string; face: string | null; fc: boolean }

const SHORT = { easy: "ห้องทั่วไปครบโควต้าวันนั้น", practice: "ห้องฝึกครบโควต้าวันนั้น", day: "เต็มเพดานแต้มวันนั้น" } as const;

const MINE: Record<RunState, { label: string; tone: string }> = {
  open: { label: "ยังไม่ถึงเวลาจบห้อง", tone: "border-accent/50 bg-accent/10 text-accent" },
  ok: { label: "ผ่าน", tone: "border-jade/60 bg-jade/15 text-jade" },
  pending: { label: "รอ Aqua ตรวจ", tone: "border-gold/60 bg-gold/10 text-gold" },
  bare: { label: "ยังไม่มีรูป — ส่งรูปในแชตห้อง", tone: "border-line bg-bg/40 text-muted" },
  no: { label: "ไม่ผ่าน", tone: "border-chili/60 bg-chili/10 text-chili" },
};

export default function PfEventPublic(
  { content, people }: { content: Record<string, ContentInfo>; people: Person[] },
) {
  const [supabase] = useState(createClient);
  const [state, setState] = useState<"loading" | "none" | "error" | "ok">("loading");
  const [ev, setEv] = useState<PfEvent | null>(null);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [parties, setParties] = useState<PfParty[]>([]);
  /** undefined while asking; null signed out; 0 signed in without a proved character. */
  const [me, setMe] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) { setState("none"); return; }
    let live = true;
    void (async () => {
      const got = await loadPfEvent(supabase);
      if (!live) return;
      if (got.state !== "ok") { setState(got.state === "error" ? "error" : "none"); return; }
      try {
        const ps = await loadPfParties(supabase, got.event);
        if (!live) return;
        setEv(got.event); setReviews(got.reviews); setParties(ps); setState("ok");
      } catch { if (live) setState("error"); }
    })();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { if (live) setMe(null); return; }
      const { data: p } = await supabase.from("profiles")
        .select("character_id, character_verified_at").eq("id", data.user.id).maybeSingle();
      const row = p as { character_id: number | null; character_verified_at: string | null } | null;
      if (live) setMe(row?.character_id && row.character_verified_at ? Number(row.character_id) : 0);
    })();
    return () => { live = false; };
  }, [supabase]);

  const known = useMemo(() => new Map(people.map((p) => [p.id, { name: p.name, avatar: p.face }])), [people]);
  const fcOf = useMemo(() => {
    const fc = new Set(people.filter((p) => p.fc).map((p) => p.id));
    return (id: number) => fc.has(id);
  }, [people]);
  const s = useMemo(
    () => (ev ? scoreEvent(ev, parties, reviews, content, fcOf, known) : null),
    [ev, parties, reviews, content, fcOf, known]);

  if (state === "loading") {
    return (
      <main className="pb-16 pt-6">
        <div aria-hidden className="h-44 animate-pulse rounded-2xl border border-line bg-surface/60" />
      </main>
    );
  }
  if (state !== "ok" || !ev || !s) {
    return (
      <main className="pb-16 pt-6">
        <Link href="/party" className="text-ui text-muted no-underline hover:text-ink">← หาปาร์ตี้</Link>
        <div className="mt-4 rounded-2xl border border-dashed border-line p-10 text-center text-read text-muted">
          {state === "error" ? "โหลดกิจกรรมไม่ได้ ลองใหม่อีกครั้ง" : "ตอนนี้ยังไม่มีกิจกรรม Party Finder"}
        </div>
      </main>
    );
  }

  const ph = phaseOf(ev);
  const last = new Date(Date.parse(ev.endsAt) - 1).toISOString();
  const chip = ph.stage === "live" ? { t: `กำลังจัด · เหลือ ${ph.daysLeft} วัน`, c: "border-jade/60 bg-jade/15 text-jade" }
    : ph.stage === "soon" ? { t: `เริ่มในอีก ${ph.daysLeft} วัน`, c: "border-accent/60 bg-accent/15 text-accent" }
      : { t: "จบแล้ว", c: "border-line bg-bg/40 text-muted" };
  const newbies = ev.newbies.map((id) => ({ id, ...(known.get(id) ?? { name: `#${id}`, avatar: null }) }));

  return (
    <main className="pb-16 pt-6">
      <Link href="/party" className="text-ui text-muted no-underline hover:text-ink">← หาปาร์ตี้</Link>

      {!ev.publishedAt && (
        <div className="mt-3 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-ui text-gold">
          <b>ฉบับร่าง</b> — หน้านี้เห็นเฉพาะแอดมิน สมาชิกจะเห็นเมื่อกด “เผยแพร่” ที่หน้า Aqua
        </div>
      )}

      <header className="mt-4 overflow-hidden rounded-2xl border border-gold/40 bg-surface p-5 sm:p-7"
              style={{ background: "linear-gradient(150deg, color-mix(in oklab, var(--color-gold) 14%, var(--color-surface)) 0%, var(--color-surface) 60%)" }}>
        <div className="font-data text-meta uppercase tracking-[0.22em] text-gold">กิจกรรม · Party Finder</div>
        <h1 className="mt-1 font-display text-head font-semibold leading-tight text-ink sm:text-[34px]">{ev.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-ui text-muted">
          <span>{fmtShortDay(ev.startsAt)} – {fmtShortDay(last)}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-meta font-medium ${chip.c}`}>{chip.t}</span>
        </div>
        <p className="mt-3 max-w-prose text-read leading-relaxed text-ink/90">
          ตั้งหรือเข้าปาร์ตี้ใน หาปาร์ตี้ ลงให้จบ ส่งรูปยืนยัน แล้วสะสมแต้มชิงรางวัล
        </p>
        <Link href="/party"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-accent bg-accent/20 px-4 text-ui font-medium text-accent no-underline hover:bg-accent/30">
          ไปหาปาร์ตี้ →
        </Link>
      </header>

      <Mine me={me} s={s} ev={ev} />

      <section className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5">
        <h2 className="font-display text-title font-semibold text-ink">วิธีร่วม</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["ตั้งหรือเข้าปาร์ตี้", "ใน หาปาร์ตี้ บนเว็บนี้ ต้องยืนยันตัวละครในเว็บก่อนถึงจะได้แต้ม"],
            ["ลงให้จบ แล้วถ่ายรูป", `ห้องสุดท้าย / ตอนรับหีบสมบัติ / หรือห้องฝึกที่อยู่เกิน ${ev.practiceMinutes} นาที`],
            ["ส่งรูป", "ส่งในแชตของห้องนั้น (ใครในปาร์ตี้ส่งก็ได้) หรือหัวห้องอัปรูปกลุ่มตอนกด “สำเร็จ”"],
            ["Aqua ตรวจหลังห้องจบ", `ผ่าน 1 ห้อง = 1 แต้มทุกคนในปาร์ตี้ · สูงสุด ${ev.dailyCap} แต้ม/คน/วัน · นับเป็นวันที่ห้องจบ`],
          ].map(([h, b], i) => (
            <li key={h} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/50 bg-gold/10 font-data text-ui font-semibold text-gold">{i + 1}</span>
              <span>
                <span className="block text-read font-medium text-ink">{h}</span>
                <span className="block text-ui leading-relaxed text-muted">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-ui text-muted">
          <li>⏱ เล่นจบแล้วหัวห้องกด “สำเร็จ” หรือจบห้องเลย ห้องจะขึ้นให้ตรวจทันที ถ้าไม่กด ต้องรอถึงเวลาจบที่ตั้งไว้</li>
          <li>🌱 ลงกับผู้เล่นใหม่ใน FC ตามรายชื่อด้านล่าง คนที่ช่วย (Helper) ได้เพิ่ม +{ev.helperBonus} แต้ม</li>
          <li>⚠ ดันเลเวลต่ำกว่า {ev.unsyncMinLevel} ต้องลงแบบปรับเลเวลลง (sync) ถ้าลงเลเวลเต็ม (unsync) นับเฉพาะดันเลเวล {ev.unsyncMinLevel} ขึ้นไป</li>
          <li>นับประเภท: {ev.kinds.map((k) => KIND_LABEL[k]).join(", ")}</li>
          <li>{ev.fcOnly ? "รางวัลเฉพาะสมาชิกใน FC (คนนอก FC ยังเห็นแต้มของตัวเอง)" : "ทุกคนรับรางวัลได้ ทั้งใน FC และนอก FC"}</li>
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-gold/40 bg-card p-4 sm:p-5">
        <h2 className="font-display text-title font-semibold text-ink">แต้มต่อห้อง</h2>
        <p className="mt-0.5 text-ui text-muted">ห้องยากได้แต้มมากกว่า ทุกคนในปาร์ตี้ได้เท่ากัน</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...ev.kinds].sort((a, b) => pointsOf(ev, b) - pointsOf(ev, a)).map((k) => (
            <div key={k} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line bg-bg/40 px-3">
              <span className="min-w-0 truncate text-ui text-ink">{KIND_LABEL[k]}</span>
              <span className="shrink-0 font-data text-read font-semibold text-gold">
                {pointsOf(ev, k)}
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-ui text-muted">
          <li>• ห้อง 1 แต้ม นับได้ <b className="text-ink">{ev.easyCap} ห้อง/คน/วัน</b></li>
          <li>• ห้องฝึก (เนื้อหายาก ยังไม่เคลียร์ อยู่ในห้องเกิน {ev.practiceMinutes} นาที) = {ev.practicePoints} แต้ม นับได้ <b className="text-ink">{ev.practiceCap} ห้อง/คน/วัน</b></li>
          <li>• ช่วยผู้เล่นใหม่ 🌱 ได้เพิ่ม <b className="text-ink">+{ev.helperBonus}</b> · รวมไม่เกิน <b className="text-ink">{ev.dailyCap} แต้ม/คน/วัน</b></li>
        </ul>
      </section>

      <h2 className="mt-8 font-display text-title font-semibold text-ink">รางวัล</h2>
      {ph.stage === "soon" && (
        <p className="mt-1 text-ui text-muted">กิจกรรมยังไม่เริ่ม — แต้มเริ่มนับตั้งแต่ {fmtShortDay(ev.startsAt)}</p>
      )}
      <Prizes ev={ev} s={s} people={known} />

      {newbies.length > 0 && (
        <section className="mt-4 rounded-xl border border-jade/40 bg-card p-4 sm:p-5">
          <h2 className="font-display text-title font-semibold text-ink">🌱 ผู้เล่นใหม่ใน FC</h2>
          <p className="mt-0.5 text-ui text-muted">ลงด้วยกันแล้วผ่าน คนที่ช่วยได้ {ev.helperPoints} แต้ม</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {newbies.map((p) => (
              <Link key={p.id} href={`/member/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-jade/40 bg-jade/10 py-0.5 pl-0.5 pr-3 text-ui text-ink no-underline hover:border-jade">
                <Face src={p.avatar} name={p.name} size={26} />{p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-8 font-display text-title font-semibold text-ink">ตารางแต้ม</h2>
      <div className="mt-3"><Board s={s} ev={ev} /></div>
    </main>
  );
}

/** Your own line: where you stand and what each of your runs is waiting on. */
function Mine(
  { me, s, ev }: { me: number | null | undefined; s: NonNullable<ReturnType<typeof scoreEvent>>; ev: PfEvent },
) {
  const [all, setAll] = useState(false);
  if (me === undefined) return null;
  const box = "mt-4 rounded-xl border border-accent/40 bg-card p-4 sm:p-5";
  if (me === null) {
    return (
      <div className={`${box} text-ui text-muted`}>
        เข้าสู่ระบบและยืนยันตัวละคร เพื่อดูแต้มและห้องของคุณ
      </div>
    );
  }
  if (me === 0) {
    return (
      <div className={`${box} text-ui text-muted`}>
        ยืนยันตัวละครในเว็บก่อน ถึงจะได้แต้มจากกิจกรรมนี้ —{" "}
        <Link href="/profile" className="text-accent">ไปที่โปรไฟล์</Link>
      </div>
    );
  }
  const p = s.people.find((x) => x.id === me);
  const runs = s.runs.filter((r) => r.party.ownerCharacterId === me
    || r.party.members.some((m) => m.characterId === me)).reverse();
  const group = s.people.filter((x) => x.fc === (p?.fc ?? true) && x.points > 0);
  const rank = p && p.points > 0 ? group.findIndex((x) => x.id === me) + 1 : null;

  return (
    <section className={box}>
      <h2 className="font-display text-title font-semibold text-ink">แต้มของฉัน</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["แต้ม", p?.points ?? 0],
          ["วันที่ลง", p?.days ?? 0],
          [p?.fc === false ? "อันดับ (นอก FC)" : "อันดับ", rank ?? "–"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-bg/40 p-3">
            <div className="text-meta text-muted">{k}</div>
            <div className="font-data text-title font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>
      {p && p.raw > p.points && (
        <p className="mt-2 text-meta text-muted">เกินเพดาน {ev.dailyCap} แต้ม/วันไป {p.raw - p.points} แต้ม</p>
      )}
      {runs.length > 0 ? (
        <ul className="mt-3 divide-y divide-line/60 overflow-hidden rounded-lg border border-line">
          {(all ? runs : runs.slice(0, 5)).map((r) => (
            <li key={r.party.id}>
              <Link href={`/party/${r.party.id}`}
                    className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 no-underline hover:bg-bg/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-read text-ink">{r.name}</span>
                  <span className="block text-meta text-muted">{fmtWhen(r.party.startsAt)}</span>
                </span>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-meta ${MINE[r.state].tone}`}>
                  {MINE[r.state].label}{r.state === "ok" ? ` · +${r.gave.get(me) ?? 0}` : ""}
                  {r.state === "ok" && r.short.has(me) ? ` (${SHORT[r.short.get(me)!]})` : ""}
                </span>
              </Link>
            </li>
          ))}
          {!all && runs.length > 5 && (
            <li>
              <button type="button" onClick={() => setAll(true)}
                      className="min-h-11 w-full text-ui text-accent hover:bg-bg/40">
                ดูทั้งหมด ({runs.length} ห้อง)
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-3 text-ui text-muted">ยังไม่มีห้องของคุณในช่วงกิจกรรม — <Link href="/party" className="text-accent">ไปหาปาร์ตี้</Link></p>
      )}
    </section>
  );
}
