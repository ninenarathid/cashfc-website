"use client";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/client';
import CasinoSandbox, { CasinoLive } from './CasinoSandbox';
const Room = dynamic(() => import('./CasinoNativeTown'), { loading: () => <p className="py-12">กำลังเตรียมห้อง Casino…</p> });
const Desk = dynamic(() => import('./CasinoDesk'), { loading: () => <p className="py-12">กำลังโหลดตั้งค่า Casino…</p> });
export default function CasinoGate({ desk = false, live = false }: { desk?: boolean; live?: boolean }) {
  const { realAdmin, canEnterTown, ready } = useAdmin();
  const [allowed, setAllowed] = useState(false), [checked, setChecked] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let gone = false;
    if (!ready) return;
    if ((!live || desk) ? !realAdmin : !canEnterTown) { setAllowed(false); setChecked(true); return; }
    const client = createClient();
    if (!client) { setError('ยังไม่ได้ตั้งค่า Supabase'); setChecked(true); return; }
    void client.rpc(live ? 'casino_live_allowed' : 'casino_lab_allowed').then(async ({ data, error }) => {
      if (gone) return;
      let permitted = data === true;
      if(live && permitted && !realAdmin){const s=await client.from('casino_live_settings').select('open,starts_at,ends_at').eq('id',1).single();const now=Date.now();permitted=!!s.data?.open&&(!s.data.starts_at||now>=Date.parse(s.data.starts_at))&&(!s.data.ends_at||now<Date.parse(s.data.ends_at));}
      if(gone)return;setAllowed(permitted);setChecked(true);
      if (error) setError(error.code === 'PGRST202' ? `ต้องรัน SQL v${live?'206':'204'} ก่อนใช้งาน` : error.message);
    });
    return () => { gone = true; };
  }, [realAdmin, canEnterTown, ready, desk, live]);
  if (!ready || !checked) return <p className="py-12">กำลังตรวจสิทธิ์เข้าห้อง…</p>;
  if (!allowed) return <main className="py-12"><h1 className="font-display text-head">Casino ยังไม่เปิดตัว</h1>
    <p className="mt-3">{error || (live?'ห้อง Casino ยังพักอยู่ หรือบัญชีนี้ยังไม่มีสิทธิ์เข้า Cash Town':'ห้องทดลองนี้เปิดให้บัญชีแอดมินที่กำหนดไว้ กรุณาเข้าสู่ระบบด้วยบัญชี Nine หรือ Aqua')}</p>
    <Link href="/town" className="mt-5 inline-block text-accent">กลับ Cash Town</Link></main>;
  const contents=desk ? <Desk /> : <Room />;
  return live ? <CasinoLive>{contents}</CasinoLive> : <CasinoSandbox>{contents}</CasinoSandbox>;
}
