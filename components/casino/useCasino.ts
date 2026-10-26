"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCasinoClient, useCasinoLive } from './CasinoSandbox';
import type { CasinoSpin, CasinoState } from '@/lib/casino';

/** The newest spins a page keeps, as the database tells them. */
const KEEP = 30;
/** How long a page waits, at the most and by chance, before reading the casino again after another's win or a change of settings. */
const SPREAD_MS = 2500;

/**
 * The casino's state, read once and then kept.
 *
 * LIVE (v299): every spin is told to the private channel 'casino-live' as it is written, with what a page draws of it,
 * and laid into the state here; the page reads the whole state again only for its own spin, somebody's win (the stock
 * and the Gil left move), or when an admin changes the settings ('changed'), each spread over a moment so that forty
 * pages do not read at once. Before v299 every spin made every page read again (the change feed): five machines and
 * forty players were some fifty reads a second on the small database.
 *
 * TEST (the volatile room, CasinoSandbox): its own channel stands in for the change feed, as it always did.
 */
export function useCasino(history = false, page = 0) {
  const client = useCasinoClient();
  const live = useCasinoLive();
  const [state, setState] = useState<CasinoState | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const offset = useRef(0), seq = useRef(0), me = useRef<string | null>(null);
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
    me.current = got.user_id;
    setState(got); setError(''); return got;
  }, [client, history, page, live]);
  useEffect(() => {
    if (!client) return;
    let gone = false, timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (spread = 150) => { if (!timer && !gone) timer = setTimeout(() => { timer = undefined; void reload(); }, spread); };
    const later = () => schedule(150 + Math.random() * SPREAD_MS);
    void reload();
    let ch: RealtimeChannel;
    if (live) {
      ch = client.channel('casino-live', { config: { private: true } })
        .on('broadcast', { event: 'spin' }, ({ payload }) => {
          const spin = payload as CasinoSpin;
          if (!spin || typeof spin.id !== 'string' || !Array.isArray(spin.reels)) return;
          setState(s => s && !s.spins.some(x => x.id === spin.id) ? { ...s, spins: [spin, ...s.spins].slice(0, KEEP) } : s);
          // (my own spin's answer is read by the page that spun; another's win moves the stock and the Gil left)
          if (spin.user_id === me.current) schedule(); else if (spin.prize) later();
        })
        .on('broadcast', { event: 'changed' }, later);
      void client.realtime.setAuth().catch(() => {}).then(() => {
        if (!gone) ch.subscribe(status => { if (gone) return; setConnected(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') later(); });
      });
    } else {
      ch = client.channel(`casino-state:${crypto.randomUUID()}`);
      for (const kind of ['settings', 'prizes', 'spins', 'receipts']) ch.on('postgres_changes', { event: '*', schema: 'public', table: `casino_lab_${kind}` }, () => schedule());
      ch.subscribe(status => { if (gone) return; setConnected(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') schedule(); });
    }
    const visible = () => { if (document.visibilityState === 'visible') later(); };
    document.addEventListener('visibilitychange', visible); window.addEventListener('focus', later);
    // (a slow fallback for a hint that was lost: once a minute or so, and only while looked at)
    const fallback = setInterval(() => { if (document.visibilityState === 'visible') later(); }, live ? 60000 : 15000);
    return () => { gone = true; ++seq.current; clearTimeout(timer); clearInterval(fallback);
      document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', later); void client.removeChannel(ch); };
  }, [client, reload, live]);
  return { client, live, state, error, setError, connected, reload, now: () => Date.now() + offset.current };
}
