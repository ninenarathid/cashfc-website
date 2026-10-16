"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { money, type CasinoDraft, type CasinoSettings } from '@/lib/casino';
import { DEFAULT_CASINO_SIMULATION_SPINS, MAX_CASINO_SIMULATION_SPINS, simulateCasino, type CasinoSimulation as Simulation } from '@/lib/casino-simulation';

export default function CasinoSimulation({ draft, settings, issue = null, onClose }: {
  draft: CasinoDraft; settings: CasinoSettings; issue?: string | null; onClose?: () => void;
}) {
  const id = useId();
  const [count, setCount] = useState(String(DEFAULT_CASINO_SIMULATION_SPINS));
  const [result, setResult] = useState<{ value: Simulation; source: string } | null>(null);
  const [error, setError] = useState('');
  const resultPanel = useRef<HTMLDivElement>(null);
  const n = Number(count);
  const valid = count.trim() !== '' && Number.isSafeInteger(n) && n >= 1 && n <= MAX_CASINO_SIMULATION_SPINS;
  const source = JSON.stringify([draft, settings.reserved, settings.pool_draws]);
  const stale = result !== null && result.source !== source;
  useEffect(() => {
    if (!result || !matchMedia('(max-width: 639px)').matches) return;
    const frame = requestAnimationFrame(() => {
      const panel = resultPanel.current, layout = panel?.closest<HTMLElement>('.casino-play-layout');
      if (panel && layout) layout.scrollTop = panel.offsetTop - layout.offsetTop;
    });
    return () => cancelAnimationFrame(frame);
  }, [result, stale]);
  const run = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || issue) return;
    try {
      setResult({ value: simulateCasino(draft, settings, n), source });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'จำลองไม่สำเร็จ กรุณาตรวจสอบค่าแล้วลองใหม่'); }
  };
  const r = result?.value;
  return <section className="casino-simulation" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>จำลองการเล่น</h2>
    <p>ใช้ตั้งค่าห้องนี้ · ไม่ใช้ Coin หรือออกรางวัลจริง</p>
    <form className="casino-simulation-controls" onSubmit={run}>
      <label htmlFor={`${id}-count`}>จำนวนครั้ง (1–10,000)
        <input id={`${id}-count`} type="number" inputMode="numeric" min={1} max={MAX_CASINO_SIMULATION_SPINS} step={1} required
          value={count} aria-invalid={!valid} aria-describedby={!valid ? `${id}-count-error` : undefined}
          onChange={e => setCount(e.target.value)} />
      </label>
      <button type="submit" className="pressable tk tk-btn" disabled={!valid || !!issue}>จำลองการเล่น</button>
      {onClose && <button type="button" className="pressable tk tk-slot" onClick={onClose}>กลับไปเล่น</button>}
    </form>
    {!valid && <p id={`${id}-count-error`} role="status">กรอกจำนวนเต็ม 1–10,000 ครั้ง</p>}
    {issue && <p role="status">ตรวจสอบตั้งค่าก่อนจำลอง: {issue}</p>}
    {error && <p role="alert">{error}</p>}
    <p className="casino-simulation-note">เป็นยอดรวมหลายผู้เล่น ไม่จำกัดตาม Coin หรือโควตาต่อคน · ผลสุ่มแต่ละชุดอาจต่างกัน</p>
    <div aria-live="polite" aria-atomic="true">
      {r && <div className="casino-simulation-result" ref={resultPanel}>
        {stale && <p className="casino-simulation-warning" role="status">ตั้งค่าหรือสต็อกเปลี่ยนแล้ว ผลนี้เป็นค่าก่อนเปลี่ยน กรุณากดจำลองใหม่</p>}
        <p className="casino-simulation-total">จำลองแล้ว {money(r.spins)} / {money(r.requested)} ครั้ง · ได้รางวัล {money(r.wins)} ครั้ง ({r.spins ? (r.wins / r.spins * 100).toFixed(2) : '0.00'}%) · พลาด {money(r.misses)} ครั้ง</p>
        {r.poolRemaining === 0 && <p>กองรางวัลหมดแล้ว{r.spins < r.requested ? ' จึงหยุดจำลองที่จำนวนนี้' : ''}</p>}
        <dl className="casino-simulation-totals">
          <div><dt>Coin ที่ใช้รวม</dt><dd>{money(r.coinSpent)}</dd></div>
          <div><dt>Coin รางวัลที่ได้</dt><dd>{money(r.coinWon)}</dd></div>
          <div><dt>Gil รางวัลที่ออก</dt><dd>{money(r.gilWon)}</dd></div>
          <div><dt>งบ Gil คงเหลือ</dt><dd>{money(r.gilRemaining)}</dd></div>
        </dl>
        <ul className="casino-simulation-prizes" aria-label="รางวัลจากการจำลอง">
          {r.prizes.map(p => <li key={p.id}><strong>{p.kind === 'gil' ? `${money(p.amount)} Gil` : p.kind === 'coin' ? `${money(p.amount)} Coin` : p.name}</strong><span>ออก {money(p.wins)} · เหลือ {money(p.remaining)}</span></li>)}
        </ul>
        {r.poolRemaining !== null && <p>กองเหลือ {money(r.poolRemaining)} สิทธิ์</p>}
      </div>}
    </div>
  </section>;
}
