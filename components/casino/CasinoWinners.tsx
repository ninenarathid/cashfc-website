"use client";
import Link from 'next/link';
import { money, type CasinoWinner } from '@/lib/casino';
import { fmtDateTime } from '@/lib/dates';

/**
 * Who won what at the casino, as the admins see it (v299's `winners`): a thing to hand over leads to its 1-1 thread in
 * the admin panel's prizes (the winner claims it there and the two talk); Gil went into the winner's wallet by itself.
 */
export default function CasinoWinners({ winners, few }: { winners: CasinoWinner[]; few?: number }) {
  const shown = few ? winners.slice(0, few) : winners;
  return <section className="casino-queue casino-winners"><h2>ผู้โชคดี · {money(winners.length)}{winners.length === 50 ? '+' : ''}</h2>
    {!shown.length && <p>ยังไม่มีผู้โชคดี</p>}
    {shown.map(w => <article key={w.spin_id}>
      <strong>{w.player_name} · {w.prize.name}</strong>
      <small>{fmtDateTime(w.created_at)}{w.test ? ' · ทดสอบ' : ''} · {
        w.prize.kind === 'gil' ? 'เข้ากระเป๋าเงินแล้ว' : w.delivered_at ? 'ส่งมอบแล้ว' : w.claimed_at ? 'ผู้ชนะกดขอรับแล้ว รอส่งมอบ' : 'รอผู้ชนะกดขอรับ'}</small>
      {w.win_id && <Link href={`/admin#prizes:${w.win_id}`}>เปิดแชทรางวัลนี้ ↗</Link>}
    </article>)}
  </section>;
}
