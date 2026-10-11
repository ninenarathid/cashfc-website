"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCasinoClient, useCasinoLive } from './CasinoSandbox';
import type { CasinoState } from '@/lib/casino';

/** Realtime hints are coalesced. Reads reconcile on reconnect/focus and a slow fallback. */
export function useCasino(history = false, page = 0) {
  const client = useCasinoClient();
  const live = useCasinoLive();
  const [state, setState] = useState<CasinoState | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const offset = useRef(0), seq = useRef(0);
  const reload = useCallback(async () => {
    if (!client) { setError('ยังไม่ได้ตั้งค่า Supabase'); return null; }
    const request = ++seq.current, before = Date.now();
    const { data, error: failed } = await client.rpc('casino_lab_state', { p_receipt_page: page, p_history: history });
    if (request !== seq.current) return null;
    if (failed) {
      setError(failed.code === 'PGRST202' ? `ต้องรัน SQL v${live?'206':'204'} ก่อนใช้งาน Casino` : failed.message);
      return null;
    }
    const got = data as CasinoState;
    offset.current = Date.parse(got.server_now) - (before + Date.now()) / 2;
    setState(got); setError(''); return got;
  }, [client, history, page, live]);
  useEffect(() => {
    if (!client) return;
    let gone = false, timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { if (!timer && !gone) timer = setTimeout(() => { timer = undefined; void reload(); }, 150); };
    void reload();
    const ch = client.channel(`casino-state:${crypto.randomUUID()}`);
    for (const kind of ['settings', 'prizes', 'spins', 'receipts']) {
      const table=`casino_${live?'live':'lab'}_${kind}`;
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    }
    ch.subscribe(status => { if (gone) return; setConnected(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') schedule(); });
    const visible = () => { if (document.visibilityState === 'visible') schedule(); };
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', schedule);
    const fallback = setInterval(() => { if (document.visibilityState === 'visible') schedule(); }, 15000);
    return () => { gone = true; ++seq.current; clearTimeout(timer); clearInterval(fallback);
      document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', schedule); void client.removeChannel(ch); };
  }, [client, reload, live]);
  return { client, live, state, error, setError, connected, reload, now: () => Date.now() + offset.current };
}
