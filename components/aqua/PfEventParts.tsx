"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PRIZES, drawWinners, fmtM, fmtWhen, type PfEvent, type PfPerson, type scoreEvent,
} from "@/lib/pf-event";

/**
 * The pieces of the party finder event that Aqua's desk and the members' page
 * both draw: the prizes, the points board, a face. Kept apart from the desk so
 * the members' page does not carry the desk's admin code with it.
 */

type Who = "fc" | "out" | "all";

/* ── the three prizes ────────────────────────────────────────────────────── */

export function Prizes(
  { ev, s, people, onDraw }: {
    ev: PfEvent; s: NonNullable<ReturnType<typeof scoreEvent>>;
    people: Map<number, { name: string; avatar: string | null }>;
    /** Absent on the members' page: they read the draw, Aqua makes it. */
    onDraw?: (d: PfEvent["draw"]) => Promise<void>;
  },
) {
  const [busy, setBusy] = useState(false);
  const card = "flex flex-col rounded-xl border bg-card p-4";
  const pool = s.drawPool;
  const winners = (ev.draw?.winners ?? []).map((id) =>
    s.people.find((p) => p.id === id) ?? { id, name: people.get(id)?.name ?? `#${id}`, avatar: people.get(id)?.avatar ?? null });

  const draw = async (again: boolean) => {
    if (again && !confirm("สุ่มใหม่? ผลเดิมจะหายไป")) return;
    if (!again && !confirm(`สุ่ม ${Math.min(ev.drawCount, pool.length)} คนจากผู้ตั้งห้อง ${pool.length} คน?`)) return;
    if (!onDraw) return;
    setBusy(true);
    const ids = pool.map((p) => p.id);
    await onDraw({ at: new Date().toISOString(), pool: ids, winners: drawWinners(ids, ev.drawCount) });
    setBusy(false);
  };

  return (
    <section className="mt-4 grid gap-3 lg:grid-cols-3">
      <div className={`${card} border-gold/40`}>
        <PrizeHead icon="🏆" title="แต้มเยอะที่สุด" prize={PRIZES.points} />
        <Leaders list={s.topPoints} unit={(p) => `${p.points} แต้ม`} empty="ยังไม่มีใครได้แต้ม" />
        {s.topPoints.length > 1 && <p className="mt-2 text-meta text-gold">เสมอ {s.topPoints.length} คน — Aqua ตัดสิน</p>}
      </div>

      <div className={`${card} border-jade/40`}>
        <PrizeHead icon="📅" title="ลงสม่ำเสมอที่สุด"
                   prize={s.steady.people.length >= PRIZES.steadyPotFrom
                     ? `${fmtM(PRIZES.steadyPot)} หาร ${s.steady.people.length} = คนละ ${fmtM(s.steady.each)}`
                     : `คนละ ${fmtM(PRIZES.steadyEach)} gil`} />
        <Leaders list={s.steady.people} unit={(p) => `${p.days} วัน`} empty="ยังไม่มีใครลง" />
        <p className="mt-2 text-meta text-muted">นับจำนวนวันที่ได้แต้ม · เสมอเกิน 3 คน = {fmtM(PRIZES.steadyPot)} หารเท่ากัน</p>
      </div>

      <div className={`${card} border-accent/40`}>
        <PrizeHead icon="🎲" title="Lucky Draw ผู้ตั้งห้อง"
                   prize={`${ev.drawCount} คน · คนละ ${fmtM(PRIZES.luckyEach)} gil`} />
        {ev.draw ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {winners.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 py-0.5 pl-0.5 pr-2.5 text-ui text-ink">
                  <Face src={p.avatar} name={p.name} size={22} />{p.name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-meta text-muted">
              สุ่มเมื่อ {fmtWhen(ev.draw.at)} จาก {ev.draw.pool.length} คน
              {onDraw && (
                <button type="button" onClick={() => void draw(true)} disabled={busy}
                        className="ml-2 min-h-11 rounded-lg border border-line px-3 text-meta text-muted hover:text-ink">สุ่มใหม่</button>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-ui text-ink">ผู้ตั้งห้องที่ผ่าน <b className="font-data">{pool.length}</b> คน</p>
            {onDraw && pool.length > 0 && pool.length <= ev.drawCount && (
              <p className="mt-1 text-meta text-gold">มีผู้มีสิทธิ์ {pool.length} คน แต่รางวัลมี {ev.drawCount} — ถ้าสุ่มตอนนี้ทุกคนได้รางวัล</p>
            )}
            {!onDraw && <p className="mt-1 text-meta text-muted">สุ่มหลังจบกิจกรรม · ตั้งห้องแล้วผ่าน = มีสิทธิ์</p>}
            {onDraw && <div className="mt-auto pt-3">
              <button type="button" disabled={busy || pool.length === 0}
                      onClick={() => void draw(false)}
                      className="min-h-11 w-full rounded-lg border border-accent bg-accent/20 px-4 text-ui font-medium text-accent hover:bg-accent/30 disabled:opacity-40">
                สุ่มผู้โชคดี
              </button>
            </div>}
          </>
        )}
      </div>
    </section>
  );
}

function PrizeHead({ icon, title, prize }: { icon: string; title: string; prize: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-display text-lead font-semibold text-ink">
        <span aria-hidden>{icon}</span>{title}
      </div>
      <div className="mt-0.5 text-meta text-muted">{prize}</div>
    </div>
  );
}

function Leaders({ list, unit, empty }: { list: PfPerson[]; unit: (p: PfPerson) => string; empty: string }) {
  if (!list.length) return <p className="mt-3 text-ui text-muted">{empty}</p>;
  const shown = list.slice(0, 4);
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {shown.map((p) => (
        <li key={p.id} className="flex items-center gap-2">
          <Face src={p.avatar} name={p.name} size={28} />
          <span className="min-w-0 flex-1 truncate text-read text-ink">{p.name}</span>
          <span className="shrink-0 font-data text-ui font-semibold text-ink">{unit(p)}</span>
        </li>
      ))}
      {list.length > shown.length && <li className="text-meta text-muted">และอีก {list.length - shown.length} คน</li>}
    </ul>
  );
}

/* ── the board ───────────────────────────────────────────────────────────── */

export function Board({ s, ev }: { s: NonNullable<ReturnType<typeof scoreEvent>>; ev: PfEvent }) {
  const [who, setWho] = useState<Who>("fc");
  const [sort, setSort] = useState<"points" | "days">("points");
  const scored = s.people.filter((p) => p.runs > 0 || p.rooms > 0);
  const list = scored
    .filter((p) => who === "all" || (who === "fc" ? p.fc : !p.fc))
    .sort((a, b) => sort === "points"
      ? b.points - a.points || b.days - a.days
      : b.days - a.days || b.points - a.points);
  const n = { fc: scored.filter((p) => p.fc).length, out: scored.filter((p) => !p.fc).length, all: scored.length };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-line p-1">
          {([["fc", "ใน FC"], ["out", "นอก FC"], ["all", "ทั้งหมด"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setWho(k)} aria-pressed={who === k}
                    className={`min-h-11 rounded-md px-3 text-ui sm:min-h-9 ${who === k ? "bg-card text-accent" : "text-muted hover:text-ink"}`}>
              {label} <span className="font-data text-meta opacity-70">{n[k]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 rounded-lg border border-line p-1">
          {([["points", "เรียงแต้ม"], ["days", "เรียงวัน"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k}
                    className={`min-h-11 rounded-md px-3 text-ui sm:min-h-9 ${sort === k ? "bg-card text-accent" : "text-muted hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!list.length ? (
        <div className="mt-3 rounded-xl border border-dashed border-line p-8 text-center text-ui text-muted">ยังไม่มีใครในกลุ่มนี้</div>
      ) : (
        <ol className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
          <li className="hidden grid-cols-[2.5rem_1fr_4.5rem_4rem_4rem_4.5rem] gap-2 border-b border-line px-4 py-2 text-meta text-muted sm:grid">
            <span>#</span><span>ชื่อ</span><span className="text-right">แต้ม</span>
            <span className="text-right">วัน</span><span className="text-right">ห้อง</span><span className="text-right">ตั้งห้อง</span>
          </li>
          {list.map((p, i) => {
            const rank = i + 1;
            const win = s.eligible(p) && (sort === "points" ? s.topPoints.includes(p) : s.steady.people.includes(p));
            return (
              <li key={p.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-line/60 px-3 py-2.5 last:border-b-0 sm:grid-cols-[2.5rem_1fr_4.5rem_4rem_4rem_4.5rem] sm:px-4">
                <span className={`font-data text-ui ${win ? "text-gold" : "text-muted"}`}>{rank}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <Face src={p.avatar} name={p.name} size={28} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/member/${p.id}`} target="_blank" className="truncate text-read text-ink no-underline hover:text-accent">{p.name}</Link>
                      {p.newbie && <span aria-label="ผู้เล่นใหม่">🌱</span>}
                      {!p.fc && <span className="shrink-0 rounded border border-copper/50 px-1 text-[10px] uppercase text-copper">นอก FC</span>}
                    </div>
                    <div className="text-meta text-muted sm:hidden">
                      {p.days} วัน · {p.runs} ห้อง{p.helped ? ` · ช่วย ${p.helped}` : ""}{p.rooms ? ` · ตั้ง ${p.rooms}` : ""}
                    </div>
                    {(p.helped > 0 || p.raw > p.points) && (
                      <div className="hidden text-meta text-muted sm:block">
                        {p.helped > 0 ? `ช่วยมือใหม่ ${p.helped} ห้อง` : ""}
                        {p.helped > 0 && p.raw > p.points ? " · " : ""}
                        {p.raw > p.points ? `เกินโควต้า/เพดาน ${p.raw - p.points} แต้ม` : ""}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-right font-data text-lead font-semibold text-ink">
                  {p.points}<span className="ml-1 text-meta font-normal text-muted sm:hidden">แต้ม</span>
                </span>
                <span className="hidden text-right font-data text-ui text-ink sm:block">{p.days}</span>
                <span className="hidden text-right font-data text-ui text-muted sm:block">{p.runs}</span>
                <span className="hidden text-right font-data text-ui text-muted sm:block">{p.rooms || "–"}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 text-meta text-muted">
        แต้มนับเฉพาะห้องที่ “ผ่าน” · ห้องยากได้มากกว่า · สูงสุด {ev.dailyCap} แต้ม/คน/วัน · {ev.fcOnly ? "คนนอก FC แสดงไว้ดูแต่ไม่รับรางวัล" : "คนนอก FC รับรางวัลได้"}
      </p>
    </div>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

export function Face({ src, name, size }: { src: string | null; name: string; size: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} loading="lazy"
         className="shrink-0 rounded-full border border-line object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full border border-line bg-bg font-data text-[10px] text-muted"
          style={{ width: size, height: size }}>
      {name.slice(0, 1)}
    </span>
  );
}
