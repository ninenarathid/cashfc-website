"use client";
import { useState } from 'react';
import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { money, type CasinoWinner } from '@/lib/casino';
import { fmtDateTime } from '@/lib/dates';

/** How many a press brings. */
const PAGE = 50;

/**
 * Wins older than `before`, newest first, with how many there are in all on the first page: from the spins themselves,
 * which the admins may read, since the state's `winners` stop at fifty (the owner, 2026-10-31: "ช่วยทำให้ส่วนนี้ดูย้อนหลังได้ทั้งหมด").
 * By time and not by place, so that a win while reading does not show one twice.
 */
async function winnersBefore(client: SupabaseClient, before: string | null) {
  let ask = client.from('casino_live_spins').select('spin_id:id,user_id,player_name,prize,test,created_at,win:trail->>win,drop:trail->>drop', before ? undefined : { count: 'exact' })
    .in('prize->>kind', ['gil', 'physical']).order('created_at', { ascending: false }).limit(PAGE + 1);
  if (before) ask = ask.lt('created_at', before);
  const { data, count, error } = await ask;
  if (error) throw error;
  type Row = Omit<CasinoWinner, 'win_id' | 'drop_id' | 'claimed_at' | 'delivered_at'> & { win: string | null; drop: string | null };
  const rows = (data ?? []) as unknown as Row[], page = rows.slice(0, PAGE);
  const wins = page.flatMap(r => r.win ? [Number(r.win)] : []);
  // (a thing to hand over: how far it has gone is on its row of prize_wins)
  const handed = new Map<number, { claimed_at: string | null; delivered_at: string | null }>();
  if (wins.length) {
    const got = await client.from('prize_wins').select('id,claimed_at,delivered_at').in('id', wins);
    if (got.error) throw got.error;
    for (const w of (got.data ?? []) as Array<{ id: number; claimed_at: string | null; delivered_at: string | null }>) handed.set(w.id, w);
  }
  const winners = page.map(({ win, drop, ...r }): CasinoWinner => {
    const win_id = win ? Number(win) : null, h = win_id === null ? undefined : handed.get(win_id);
    return { ...r, win_id, drop_id: drop ? Number(drop) : null, claimed_at: h?.claimed_at ?? null, delivered_at: h?.delivered_at ?? null };
  });
  return { winners, total: count, more: rows.length > PAGE };
}

/**
 * Who won what at the casino, as the admins see it (v299's `winners`): a thing to hand over leads to its 1-1 thread in
 * the admin panel's prizes (the winner claims it there and the two talk); Gil went into the winner's wallet by itself.
 * Given a `client`, every win there has ever been can be read back, a page at a time, in a box of its own.
 */
export default function CasinoWinners({ winners, few, client }: { winners: CasinoWinner[]; few?: number; client?: SupabaseClient }) {
  const [all, setAll] = useState<CasinoWinner[] | null>(null), [total, setTotal] = useState(0), [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const read = async (before: string | null) => {
    if (!client || busy) return;
    setBusy(true); setError('');
    try {
      const got = await winnersBefore(client, before);
      setAll(was => before && was ? [...was, ...got.winners] : got.winners);
      if (got.total !== null && got.total !== undefined) setTotal(got.total);
      setMore(got.more);
    } catch (failed) { setError(failed instanceof Error ? failed.message : 'อ่านรายการผู้โชคดีไม่สำเร็จ ลองใหม่อีกครั้ง'); }
    setBusy(false);
  };
  const shown = all ?? (few ? winners.slice(0, few) : winners);
  const row = (w: CasinoWinner) => <article key={w.spin_id}>
      <strong>{w.player_name} · {w.prize.name}</strong>
      <small>{fmtDateTime(w.created_at)}{w.test ? ' · ทดสอบ' : ''} · {
        w.prize.kind === 'gil' ? 'เข้ากระเป๋าเงินแล้ว' : w.delivered_at ? 'ส่งมอบแล้ว' : w.claimed_at ? 'ผู้ชนะกดขอรับแล้ว รอส่งมอบ' : 'รอผู้ชนะกดขอรับ'}</small>
      {w.win_id && <Link href={`/admin#prizes:${w.win_id}`}>เปิดแชทรางวัลนี้ ↗</Link>}
    </article>;
  const button = 'pressable min-h-11 rounded-lg border border-line bg-bg px-3 text-ui text-ink disabled:opacity-50';
  return <section className="casino-queue casino-winners"><h2>ผู้โชคดี · {all ? money(total) : `${money(winners.length)}${winners.length === 50 ? '+' : ''}`}</h2>
    {!shown.length && <p>ยังไม่มีผู้โชคดี</p>}
    {all ? <div className="casino-winners-all slim-bar" data-casino-winners-all>{shown.map(row)}</div> : shown.map(row)}
    {error && <p role="alert" className="mt-2 text-meta text-chili">{error}</p>}
    {/* (opened, and the trial wiped under it: the way back stays) */}
    {client && (winners.length > 0 || all) && <div className="mt-3 flex flex-wrap items-center gap-2">
      {!all && <button type="button" className={button} disabled={busy} data-casino-winners-open onClick={() => void read(null)}>{busy ? 'กำลังโหลด…' : 'ดูทั้งหมด'}</button>}
      {all && more && <button type="button" className={button} disabled={busy} data-casino-winners-more onClick={() => void read(all[all.length - 1]?.created_at ?? null)}>{busy ? 'กำลังโหลด…' : 'โหลดเพิ่ม'}</button>}
      {all && <button type="button" className={button} disabled={busy} data-casino-winners-close onClick={() => { setAll(null); setError(''); }}>ย่อกลับ</button>}
      {all && <span className="text-meta text-muted">แสดง {money(all.length)} จาก {money(total)} รายการ</span>}
    </div>}
  </section>;
}
