"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ACCESS_LABEL, backRows, CLAIM_LABEL, coinsBack, draftOf, draftProblem, effectiveChance, money, PRIZE_LABEL, prizeWithAmount, wipedWords, type CasinoAccess, type CasinoDraft, type CasinoReceipt } from '@/lib/casino';
import CasinoWinners from './CasinoWinners';
import CasinoSymbol from './CasinoSymbol';
import { useCasino } from './useCasino';
import './casino.css';

const localTime = (v: string | null) => {
  if (!v) return '';
  const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export default function CasinoDesk() {
  const { client, live, state, error, setError, connected, reload } = useCasino();
  const [draft, setDraft] = useState<CasinoDraft | null>(null), [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirming,setConfirming]=useState<string|null>(null);
  useEffect(() => {
    if (state && !dirty) { setDraft(draftOf(state)); setRevision(state.settings.revision); }
  }, [state, dirty]);
  const edit = <K extends keyof CasinoDraft>(key: K, value: CasinoDraft[K]) => {
    setDirty(true); setMessage(''); setDraft(d => d ? { ...d, [key]: value } : d);
  };
  const save = async () => {
    if (!client || !state || !draft || busy) return;
    const issue = draftProblem({...draft,prizes:draft.prizes.map(p=>({...p,issued:state.prizes.find(x=>x.id===p.id)!.issued}))}, state.settings); if (issue) { setError(issue); return; }
    setBusy(true); setMessage(''); setError('');
    try {
      const { error: failed } = await client.rpc('casino_lab_save', { p_revision: revision, p_doc: draft });
      if (failed) { setError(failed.message); return; }
      setDirty(false); await reload(); setMessage('บันทึกแล้ว · มีผลกับการหมุนครั้งใหม่ ผลที่ออกแล้วคงเดิม');
    } catch { setError('ยังยืนยันการบันทึกไม่ได้ กรุณาโหลดค่าปัจจุบันก่อนลองใหม่'); }
    finally { setBusy(false); }
  };
  const handle = async (r: CasinoReceipt, action: string) => {
    if (!client || busy) return;
    const note = notes[r.id] ?? '';
    if ((action === 'release' || action === 'cancel') && !note.trim()) { setError('กรอกเหตุผลก่อนคืนคิวหรือยกเลิก'); return; }
    if (action === 'fulfill' && confirming!==r.id) {setConfirming(r.id);return;}
    setBusy(true); setError('');
    try {
      const { error: failed } = await client.rpc('casino_lab_receipt', { p_id: r.id, p_action: action, p_note: note });
      await reload(); if (failed) setError(failed.message);
    } catch { setError('การเชื่อมต่อขาดช่วง กรุณาตรวจสถานะรายการก่อนดำเนินการต่อ'); }
    finally { setBusy(false);setConfirming(null); }
  };
  if (!state || !draft) return <p className="py-10" role="status">{error || 'กำลังอ่านตั้งค่า Casino…'}</p>;
  const settings = state.settings, issue = draftProblem({...draft,prizes:draft.prizes.map(p=>({...p,issued:state.prizes.find(x=>x.id===p.id)!.issued}))}, settings);
  const changed = revision !== settings.revision;
  const chance = state.prizes.reduce((n, p) => n + effectiveChance(p, settings, state.prizes), 0);
  const expected = state.prizes.reduce((n, p) => n + (p.kind === 'gil' ? p.amount * effectiveChance(p, settings, state.prizes) / 100 : 0), 0);
  const activeQueue = state.queue;
  const back = coinsBack(draft, settings);
  // (a spin takes Casino Coins once the database has them, v303: the desk sets their rate and the free ones)
  const chips = live && draft.chip_rate !== undefined, unit = chips ? 'Casino Coin' : 'Coin';
  const wipe = async () => {
    if (!client || busy) return;
    if (!window.confirm(`ล้างผลทดสอบของแอดมินทั้งหมด ${money(state.tests ?? 0)} ครั้ง? coin สต็อก งบ Gil รายการผู้โชคดี แชท และกระเป๋าเงินที่มาจากการทดสอบจะกลับเป็นเหมือนก่อนทดสอบ`)) return;
    setBusy(true); setError('');
    try { const { data, error: failed } = await client.rpc('casino_live_wipe_tests'); if (failed) setError(failed.message); else { setMessage(wipedWords(data)); await reload(); } }
    finally { setBusy(false); }
  };
  return <main id="casino"><div className="casino-links"><Link href="/admin/aqua">กลับ Aqua</Link><Link href={live?"/town":"/town?map=casino-test"}>{live?"เข้า Cash Town (ประตูโรงเก็บของ kura)":"เข้าห้อง Casino TEST"} ↗</Link><Link href={live?"/admin/aqua/casino":"/admin/aqua/casino-live"}>ตั้งค่า {live?"TEST":"LIVE"} ↗</Link></div>
    <section className="casino-desk"><h2><span className="casino-test">{live?"LIVE":"TEST"}</span>Casino · โต๊ะ Aqua</h2>
      <p>{live?"ค่าชุดนี้ใช้เงินจริงของ Cash Town และบันทึกรางวัลถาวร เลือก \"ใครหมุนได้\" เป็นแอดมินทดสอบก่อน แล้วค่อยเปิดทุกคนเมื่อพร้อม (เปลี่ยนได้ที่หน้า Aqua ด้วย) การเปลี่ยนค่ามีผลกับรอบใหม่ทันที":"ค่าชุดนี้ใช้กับห้องทดลอง Nine และ Aqua เท่านั้น ข้อมูลอยู่ในห้อง Realtime และไม่เขียนฐานข้อมูล ค่าที่บันทึกจำไว้ในเบราว์เซอร์นี้ เมื่อทุกหน้าของห้องถูกปิด Coin การหมุน และรางวัลทดลองจะเริ่มใหม่"}</p>
      <p>{connected ? 'อัปเดตสด' : 'กำลังเชื่อมต่ออัปเดตสด'} · รุ่น {settings.revision} · หมุนแล้ว {money(settings.spins)} ครั้ง</p>
      {error && <p role="alert" className="casino-error">{error}</p>}
      {message && <p role="status">{message}</p>}
      {changed && dirty && <p role="alert">อีกบัญชีเปลี่ยนค่าแล้ว กรุณาโหลดค่าปัจจุบันก่อนบันทึก</p>}
      <div className="casino-desk-grid">
        <label>ชื่อกิจกรรม<input value={draft.title} maxLength={100} onChange={e => edit('title', e.target.value)} /></label>
        <label>วิธีสุ่ม<select value={draft.mode} onChange={e => edit('mode', e.target.value as CasinoDraft['mode'])}><option value="weighted">สุ่มตาม % · จำกัดสต็อก</option><option value="pool">กองรางวัลจำกัด · จับแล้วไม่คืน</option></select></label>
        <label>{unit} ต่อครั้ง<input type="number" min={1} max={100000} value={draft.price} onChange={e => edit('price', Number(e.target.value))} /></label>
        {chips && <label>Popoto coin ต่อ 1 Casino Coin<input type="number" min={1} max={10000} value={draft.chip_rate} onChange={e => edit('chip_rate', Number(e.target.value))} /></label>}
        {chips && <label>Casino Coin ฟรีต่อคนต่อวัน (0 = ปิด)<input type="number" min={0} max={100000} value={draft.free_chips} onChange={e => edit('free_chips', Number(e.target.value))} /></label>}
        {/* (no limit a player on how many spins: the owner, 2026-10-27, "หมุนกี่ครั้งก็ได้ ไม่จำกัด"; the live one is kept at its most) */}
        <label>งบ Gil ทั้งหมด<input type="number" min={settings.reserved} max={1e12} value={draft.budget} onChange={e => edit('budget', Number(e.target.value))} /></label>
        <label>สิทธิ์ในกองทั้งหมด<input type="number" disabled={draft.mode !== 'pool'} min={Math.max(1, settings.pool_draws)} max={1e7} value={draft.pool_size} onChange={e => edit('pool_size', Number(e.target.value))} /></label>
        <label>เริ่ม (เวลาบนอุปกรณ์)<input type="datetime-local" value={localTime(draft.starts_at)} onChange={e => edit('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>
        <label>สิ้นสุด (เวลาบนอุปกรณ์)<input type="datetime-local" value={localTime(draft.ends_at)} onChange={e => edit('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>
        {live ? <label>ใครหมุนได้<select value={draft.access} onChange={e => { const access = e.target.value as CasinoAccess; setDirty(true); setMessage(''); setDraft(d => d ? { ...d, access, open: access === 'everyone' } : d); }}>
          {(['closed', 'admins', 'everyone'] as const).map(a => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}</select></label>
          : <label className="casino-check"><input type="checkbox" checked={draft.open} onChange={e => edit('open', e.target.checked)} />เปิดรับการหมุน</label>}
      </div>
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th>เปิด</th><th>ชื่อรางวัล</th><th>ประเภท</th><th>จำนวน / มูลค่า</th><th>โอกาส %</th><th>สต็อกทั้งหมด</th><th>ออกแล้ว</th><th>ประกาศทั้ง Cash Town</th></tr></thead>
        <tbody>{draft.prizes.map((p, index) => {
          const change = (patch: Partial<typeof p>) => edit('prizes', draft.prizes.map((old, i) => i === index ? { ...old, ...patch } : old));
          const issued = state.prizes.find(q => q.id === p.id)?.issued ?? p.issued;
          return <tr key={p.id}><td><input aria-label={`เปิด ${p.id}`} type="checkbox" checked={p.active} onChange={e => change({ active: e.target.checked })} /></td>
            <td><label><span>{PRIZE_LABEL[p.id] ?? p.id}</span><input aria-label={`ชื่อ ${p.id}`} value={p.name} maxLength={100} onChange={e => change({ name: e.target.value })} /></label></td>
            <td><select aria-label={`ประเภท ${p.id}`} value={p.kind} disabled={p.id === 'pair'} onChange={e => change(prizeWithAmount(p, p.amount, e.target.value as typeof p.kind))}><option value="physical">ของนอกเกม</option><option value="gil">FFXIV Gil</option><option value="coin">{chips ? 'Casino Coin' : 'Coin ในเกม'}</option></select></td>
            <td>{p.id === 'pair' && draft.back_table ? <span title="ตามตาราง Coin คืนด้านล่าง">ตามตาราง</span> : <input aria-label={`มูลค่า ${p.id}`} type="number" min={p.kind === 'physical' ? 0 : 1} max={1e9} value={p.amount} onChange={e => change(prizeWithAmount(p, Number(e.target.value)))} />}</td>
            <td><input aria-label={`โอกาส ${p.id}`} type="number" min={0} max={100} step="0.000001" disabled={draft.mode === 'pool'} value={p.chance} onChange={e => change({ chance: Number(e.target.value) })} /></td>
            <td><input aria-label={`สต็อก ${p.id}`} type="number" min={issued} max={1e6} value={p.stock} onChange={e => change({ stock: Number(e.target.value) })} /></td><td>{money(issued)}</td>
            <td><label className="casino-check"><input type="checkbox" checked={p.announce} onChange={e => change({ announce: e.target.checked })} />ประกาศ</label></td></tr>;
        })}</tbody></table></div>
      {draft.back_table && (() => { const pairRow = draft.prizes.find(p => p.id === 'pair');
        // (how often a pair comes as the draft would have it: its chance, or in a pool its stock left over the draws left)
        const pairChance = pairRow ? effectiveChance({ ...pairRow, issued: state.prizes.find(p => p.id === 'pair')?.issued ?? 0 }, { ...settings, mode: draft.mode, pool_size: draft.pool_size }, draft.prizes) : 0;
        const rows = backRows(draft.back_table, draft.price, pairChance);
        const set = (i: number, patch: { pct?: number; share?: number }) => edit('back_table', draft.back_table!.map((old, j) => j === i ? { ...old, ...patch } : old));
        return <section className="casino-paytable-desk"><h3>ตาราง Coin คืน · สองช่องแรกตรงกัน</h3>
          <p>สองช่องแรกเป็นรูปไหน ได้ Casino Coin เท่านั้น % ของราคาหมุน (1–1,000% · เกิน 100% คือกำไร) · สัดส่วนบอกว่ารูปนั้นออกบ่อยแค่ไหนในโอกาส {pairChance.toFixed(2)}% ของ Coin คืน · รวมแล้ว Coin ที่ได้คืนเฉลี่ยต้องน้อยกว่าราคาหมุน ผู้เล่นจึงเสียมากกว่าได้</p>
          <div style={{ overflowX: 'auto' }}><table><thead><tr><th>รูป</th><th>ได้ % ของราคา</th><th>สัดส่วน</th><th>ได้คืน</th><th>โอกาสต่อการหมุน</th></tr></thead>
            <tbody>{rows.map((row, i) => <tr key={row.sym}><td><span className="casino-paytable-pair"><CasinoSymbol id={row.sym} /><CasinoSymbol id={row.sym} /></span></td>
              <td><input aria-label={`คืน % ${row.sym}`} type="number" min={1} max={1000} value={row.pct} onChange={e => set(i, { pct: Number(e.target.value) })} /></td>
              <td><input aria-label={`สัดส่วน ${row.sym}`} type="number" min={0} max={1000} value={row.share} onChange={e => set(i, { share: Number(e.target.value) })} /></td>
              <td>{money(row.amount)} Casino Coin{row.amount > draft.price ? ' · กำไร' : ''}</td><td>{row.chance.toFixed(2)}%</td></tr>)}</tbody></table></div></section>; })()}
      <p>{draft.mode === 'pool' ? 'โอกาสคำนวณจากสต็อกที่เหลือ / สิทธิ์ที่เหลือในกอง ถ้าจับครบกอง รางวัลที่เปิดไว้จะออกครบ' : 'โอกาสเป็นของแต่ละครั้ง จำนวนรางวัลที่ออกจริงไม่รับประกัน เมื่อสต็อกหรืองบไม่พอ โอกาสส่วนนั้นจะเป็นรอบไม่ชนะ'}</p>
      <p>{live ? 'ของนอกเกมเข้ากล่องรางวัลของผู้ชนะ (ผู้ชนะกดขอรับ แล้วคุยกับแอดมินในแชท 1-1) · Gil เข้ากระเป๋าเงินในโปรไฟล์ · ' + (chips ? 'Casino Coin เข้ายอด Casino Coin ทันที' : 'Coin เข้ากระเป๋า Cash Town ทันที') : 'ของนอกเกมและ Gil ออกเป็นสิทธิ์ในกระเป๋า Event ส่วน Coin เข้าบัญชีทดลองทันที'} · สองช่องแรกตรงกันได้ Coin คืน · การประกาศอิงค่าขณะรับการหมุน</p>
      <p>{unit} ที่ได้คืนเฉลี่ย {back.toFixed(1)} ต่อการหมุน · ต้องน้อยกว่าราคาหมุน {money(draft.price)} {chips ? 'ไม่ให้ Casino Coin ฟรีหมุนได้ไม่สิ้นสุด' : 'เพื่อไม่ให้เหรียญในเมืองเฟ้อ'}</p>
      {chips && <p>ผู้เล่นแลก Popoto coin เป็น Casino Coin ที่เคาน์เตอร์ในห้อง (แลกคืนได้ 10 ได้ 9 · เหรียญฟรีแลกคืนไม่ได้) และรับฟรีได้วันละครั้งหลัง 05:00 · ตอนแอดมินทดสอบ การแลกและรับฟรีนับเป็นการทดสอบ ล้างแล้วคืน Popoto coin และเอา Casino Coin ออก</p>}
      {issue && <p role="status">{issue}</p>}
      <div className="casino-actions"><button className="casino-save" disabled={busy || !dirty || !!issue || changed} onClick={() => void save()}>บันทึกทั้งชุด</button>
        <button disabled={busy} onClick={() => { setDirty(false); setMessage(''); void reload(); }}>โหลดค่าปัจจุบัน</button></div>
      <p className="casino-forecast">ค่าที่ใช้อยู่: โอกาสได้รางวัล {chance.toFixed(4)}% · Gil เฉลี่ยก่อนสต็อกเปลี่ยน {money(Math.round(expected))} ต่อครั้ง<br />
        งบ {money(settings.budget)} · จองสำหรับผู้ชนะแล้ว {money(settings.reserved)} · ส่งมอบแล้ว {money(state.paid_gil)} · ยังไม่ถูกจอง {money(settings.budget - settings.reserved)}<br />
        {settings.mode === 'pool' ? `กองเหลือ ${money(settings.pool_size - settings.pool_draws)} สิทธิ์` : 'ตัวเลขเฉลี่ยเป็นการประมาณ สต็อกและงบเป็นเพดานที่ระบบบังคับจริง'}</p>
      {live && <section className="casino-queue"><h2>ผลทดสอบของแอดมิน · {money(state.tests ?? 0)} ครั้ง</h2>
        <p>ตอนเปิดให้แอดมินทดสอบ ทุกการหมุนจะติดป้ายทดสอบ ล้างแล้ว coin สต็อก งบ Gil รายการผู้โชคดี แชท และกระเป๋าเงินที่มาจากการทดสอบจะกลับเป็นเหมือนเดิม ควรล้างก่อนเปิดให้ทุกคน</p>
        <div className="casino-actions"><button disabled={busy || !state.tests} onClick={() => void wipe()}>ล้างผลทดสอบทั้งหมด</button></div></section>}
      {live && <CasinoWinners winners={state.winners ?? []} />}
      {(!live || activeQueue.length > 0) && <section className="casino-queue"><h2>คิวส่งมอบรางวัล {live?'LIVE':'TEST'} · {activeQueue.length}{activeQueue.length === 100 ? '+' : ''}</h2>
        <p>รับรายการไว้ก่อนส่งมอบ อีกแอดมินจะทำรายการเดียวกันไม่ได้ หลังยืนยัน ไอเทมหายจากกระเป๋าที่รอรับ แต่ยังอยู่ในประวัติ</p>
        {activeQueue.length === 100 && <p>แสดง 100 รายการแรก เมื่อดำเนินการแล้ว รายการถัดไปจะเข้าคิวแสดง</p>}
        {!activeQueue.length && <p>ยังไม่มีสิทธิ์รอส่งมอบ</p>}
        {activeQueue.map(r => <article key={r.id}><strong>{r.player_name} · {r.prize.name}</strong><small>{live?"LIVE":"TEST"} · {CLAIM_LABEL[r.status]} · รหัส {r.id} · {r.requested_at ? 'ผู้เล่นยืนยันขอรับแล้ว' : 'ยังไม่ได้ยืนยันขอรับ'}</small>
          {r.status === 'processing' && r.handled_by !== state.user_id ? <p>อีกแอดมินกำลังดูแลรายการนี้</p> : <>
            <label>บันทึกการส่งมอบ / เหตุผล<input maxLength={1000} value={notes[r.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} /></label>
            <div className="casino-actions">{r.status === 'pending' ? <button disabled={busy} onClick={() => void handle(r, 'take')}>รับรายการนี้</button> : <>
              <button disabled={busy} onClick={() => void handle(r, 'fulfill')}>ยืนยันส่งมอบ {live?"LIVE":"TEST"} แล้ว</button><button disabled={busy} onClick={() => void handle(r, 'release')}>คืนคิว</button><button disabled={busy} onClick={() => void handle(r, 'cancel')}>ยกเลิกสิทธิ์พร้อมเหตุผล</button></>}</div>
            {confirming===r.id&&<div role="alert" className="casino-confirm"><p>ส่งมอบ {r.prize.name} ให้ {r.player_name} เรียบร้อยแล้วใช่ไหม?</p><button disabled={busy} onClick={()=>void handle(r,'fulfill')}>ยืนยันส่งมอบรางวัล</button><button disabled={busy} onClick={()=>setConfirming(null)}>กลับไปตรวจสอบ</button></div>}</>}
        </article>)}
      </section>}
    </section>
  </main>;
}
