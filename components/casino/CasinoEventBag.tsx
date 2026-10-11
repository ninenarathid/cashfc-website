"use client";
import {useState} from 'react';
import {CLAIM_LABEL} from '@/lib/casino';
import {useCasino} from './useCasino';
import CasinoSymbol from './CasinoSymbol';
export default function CasinoEventBag() {
  const [history,setHistory]=useState(false),[page,setPage]=useState(0),[busy,setBusy]=useState<string|null>(null);
  const {client,state,live,reload,error,setError}=useCasino(history,page);
  const claim=async(id:string)=>{
    if(!client||busy)return;setBusy(id);
    try{const r=await client.rpc('casino_lab_receipt',{p_id:id,p_action:'request',p_note:''});if(r.error)setError(r.error.message);else await reload();}
    catch{setError('ยังส่งคำขอไม่ได้ ลองอีกครั้ง');}finally{setBusy(null);}
  };
  return <section className="casino-event-bag" aria-label="กระเป๋า Event">
    <div className="casino-event-heading"><span>ใบรับสิทธิ์รางวัล {!live&&<small className="casino-test">TEST</small>}</span>
      <button className="tk tk-slot" onClick={()=>{setHistory(!history);setPage(0);}}>{history?'รอรับ':'ประวัติ'}</button></div>
    <p className="casino-event-note">เก็บได้ไม่จำกัดช่อง · ส่งมอบแล้วเก็บประวัติไว้</p>
    {error&&<p role="alert">{error}</p>}
    {!state?<p role="status">กำลังเปิดกระเป๋า…</p>:!state.receipts.length?<div className="casino-event-empty"><CasinoSymbol id="popoto"/><p>{history?'ยังไม่มีประวัติรับรางวัล':'ใบรับสิทธิ์จะอยู่ที่นี่เมื่อคุณได้รางวัล'}</p></div>:
      <div className="casino-receipts">{state.receipts.slice(0,20).map(r=><article className="casino-receipt" key={r.id}>
        <CasinoSymbol id={r.prize.id}/><div><h3>{r.prize.name}</h3><p>{CLAIM_LABEL[r.status]}</p>
          <details><summary>รายละเอียดใบรับสิทธิ์</summary><code>{r.id}</code><p>{new Date(r.created_at).toLocaleString('th-TH')}{r.note&&` · ${r.note}`}</p></details>
          {r.status==='pending'&&<button className="tk tk-btn" disabled={!!busy||!!r.requested_at} onClick={()=>void claim(r.id)}>{r.requested_at?'แจ้ง Aqua แล้ว':'ขอรับรางวัล'}</button>}</div></article>)}</div>}
    {(page>0||(state?.receipts.length??0)>20)&&<div className="casino-actions"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>ก่อนหน้า</button><span>หน้า {page+1}</span><button disabled={(state?.receipts.length??0)<=20} onClick={()=>setPage(p=>p+1)}>ถัดไป</button></div>}
  </section>;
}
