"use client";
import { useRef, useState } from 'react';
import { CasinoLive, type CasinoBench } from './CasinoSandbox';
import { useCasino } from './useCasino';
import { cashableOf, cashBackOf, CHIP_WHY, chipsOf, money } from '@/lib/casino';

/**
 * Casino Coins back into Popoto coins at the town's banker (the owner, 2026-10-31: "ช่วยทำให้นายธนาคารเปลี่ยนเหรียญเป็น popoto
 * coin ได้"): the counter's rule and its call (v312), for whoever has come out of the room or finds its door shut.
 */
export default function CasinoBank({ bench, onCoins }: { bench?: CasinoBench | null; onCoins?: () => void }) {
  return <CasinoLive bench={bench}><Teller onCoins={onCoins} /></CasinoLive>;
}

function Teller({ onCoins }: { onCoins?: () => void }) {
  const { client, state, error, reload } = useCasino();
  const [n, setN] = useState(10), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  // (the same request again until it is answered, so it is never paid twice)
  const asked = useRef<{ id: string; n: number } | null>(null);
  if (!state) return <p className="text-meta text-muted" role="status">{error || 'กำลังเปิดสมุดบัญชี…'}</p>;
  const chips = chipsOf(state) ?? 0, rate = state.settings.chip_rate ?? 1, can = Math.min(cashableOf(state), 1_000_000);
  const free = Math.min(Number(state.account.free_left ?? 0), chips), take = Math.min(Math.max(10, n), Math.max(10, can));
  const change = async () => {
    if (!client || busy) return;
    if (asked.current?.n !== take) asked.current = { id: crypto.randomUUID(), n: take };
    setBusy(true); setNote('');
    try {
      const { data, error: failed } = await client.rpc('casino_live_cashout', { p_request: asked.current.id, p_chips: take });
      if (failed) { setNote(failed.code ? failed.message : 'การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่จ่ายซ้ำ'); if (failed.code) asked.current = null; return; }
      const r = data as { ok?: boolean; why?: string; got?: number };
      asked.current = null;
      setNote(r?.ok ? `แลก ${money(take)} Casino Coin ได้ ${money(Number(r.got ?? 0))} Popoto coin แล้ว` : CHIP_WHY[r?.why ?? ''] ?? 'ยังทำรายการไม่ได้');
      if (r?.ok) onCoins?.();
      await reload();
    } catch { setNote('การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่จ่ายซ้ำ'); }
    finally { setBusy(false); }
  };
  return <>
    <p className="mb-2 text-ui text-muted">แลกเป็น Popoto coin · 10 Casino Coin ได้ {money(cashBackOf(10, rate))} Popoto coin · แลกทีละ 10</p>
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-line-strong px-3 py-2" data-bank-casino>
      <span className="min-w-0 flex-1 text-ui font-semibold text-ink">Casino Coin ที่แลกได้</span>
      <span className="font-data text-title tabular-nums text-ink">{money(can)}</span>
    </div>
    {free > 0 && <p className="mt-1.5 text-ui text-muted">เหรียญฟรี {money(free)} แลกไม่ได้ ใช้หมุนที่ Casino เท่านั้น</p>}
    {can >= 10 ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-1">
        <button type="button" disabled={take <= 10} onClick={() => setN(take - 10)} aria-label="ลดลง"
                className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink disabled:opacity-40">−</button>
        <span className="w-16 text-center font-data text-title tabular-nums text-ink" aria-live="polite">{money(take)}</span>
        <button type="button" disabled={take >= can} onClick={() => setN(take + 10)} aria-label="เพิ่มขึ้น"
                className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink disabled:opacity-40">+</button>
        {can > 10 && <button type="button" onClick={() => setN(can)} className="pressable ml-1 min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink hover:border-accent">ทั้งหมด</button>}
      </div>
      <button type="button" disabled={busy || take > can} onClick={() => void change()} data-bank-casino-go
              className="pressable ml-auto min-h-11 rounded-full bg-accent px-5 text-ui font-semibold text-bg disabled:opacity-40">แลก · ได้ {money(cashBackOf(take, rate))} Popoto coin</button>
    </div> : <p className="mt-3 text-ui text-muted">{chips > 0 ? 'ยังมี Casino Coin ที่แลกได้ไม่ถึง 10' : 'ยังไม่มี Casino Coin'}</p>}
    {note && <p className="mt-2 text-ui font-semibold text-ink" role="status" data-bank-casino-note>{note}</p>}
  </>;
}
