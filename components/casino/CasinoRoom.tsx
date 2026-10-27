"use client";
import { useAdmin } from '@/lib/admin';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { accessOf, CHIP_PACKS, CHIP_WHY, chipsOf, CLAIM_LABEL, effectiveChance, letIn, money, PRIZE_LABEL, reelAt, spinRevealed, whereItGoes, type CasinoSpin, type SymbolId } from '@/lib/casino';
import type { TownSession } from '@/lib/town/session';
import type { CasinoRoomArt } from '@/lib/town/casino-room-art';
import { CASINO_EXIT, CASINO_ROOM } from '@/lib/town/casino-room';
import { defaultLook, encodeLook, savedLook } from '@/lib/town/look';
import CasinoMap, { MACHINE_X, SPAWN, type CasinoPeer } from './CasinoMap';
import CasinoSymbol from './CasinoSymbol';
import { useCasino } from './useCasino';
import './casino.css';
import { casinoWalkable } from '@/lib/town/casino-map';
import CasinoTownHud from './CasinoTownHud';
import Link from 'next/link';
import TownFoot from '@/components/town/TownFoot';
import TownIcon from '@/components/town/TownIcon';
import type {TownMapRuntime} from '@/lib/town/map-addon';
import {SIT_HERE} from '@/lib/town/world';
import type { CasinoCameraControls } from '@/components/town/TownCasinoMap';

type Pending = { id: string; machine: number; force: string | null; revision: number };
/**
 * The casino as a room of the town (components/casino/CasinoInTown): the town's own session walks and sits me, the
 * town's frame draws the room (`art`, which this tells what the reels show), and a tap on a machine or the counter comes
 * here (`tap`). Its tiles are the room's own moved into the tile space (lib/town/casino-room's CASINO_ROOM).
 */
export type CasinoInTown = { session: TownSession; art: CasinoRoomArt; tap: MutableRefObject<((n: number) => void) | null>; onSheet?: (open: boolean) => void;
  /** The town's purse read again: a spin takes its price out of it, and the coins it wins back go in (the town's top bar shows them). */
  onCoins?: () => void };
const CHEERS = ['ลุ้นด้วย!', 'มาแล้ว ๆ!', 'อีกนิดเดียว!', 'ยินดีด้วย!'];
export default function CasinoRoom({native,town}:{native?:TownMapRuntime;town?:CasinoInTown}) {
  const nativeRef=useRef(native);nativeRef.current=native;
  // (where the room's own tiles are in the walker's: the town's tile space, or the casino map's own)
  const origin=town?{x:CASINO_ROOM.x,y:CASINO_ROOM.y}:{x:0,y:0};
  const walker=town?.session??native?.session??null,walkerRef=useRef(walker);walkerRef.current=walker;
  const [history, setHistory] = useState(false), [page, setPage] = useState(0);
  const { client, live, state, error, setError, connected, reload, now } = useCasino(history, page);
  const {realAdmin:siteAdmin}=useAdmin();
  const roomName=live?'casino-live':'casino-lab';
  const label=live?'LIVE':'TEST';
  const [selected, setSelected] = useState(1), [force, setForce] = useState('');
  const [busy, setBusy] = useState(false), [recover, setRecover] = useState(false);
  const [pane, setPane] = useState<'none'|'slots'|'bag'|'feed'|'desk'>('none'), [arrived, setArrived] = useState(true);
  // ── Casino Coins (v303): changed from Popoto coins at the counter, and free once a day ──
  const [pack, setPack] = useState<number>(CHIP_PACKS[0]), [chipNote, setChipNote] = useState('');
  /** A change asked and not yet answered: asked again with the same request, so it is never paid twice. */
  const buying = useRef<{ id: string; n: number } | null>(null);
  useEffect(()=>{if(pane==='none')return;const close=(e:KeyboardEvent)=>{const field=e.target instanceof HTMLElement&&!!e.target.closest('input,select,textarea');if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setPane('none');document.querySelector<HTMLCanvasElement>('.casino-town-canvas')?.focus();}else if(!field&&e.key.toLowerCase()==='i')setPane('none');};document.addEventListener('keydown',close,true);return()=>document.removeEventListener('keydown',close,true);},[pane]);
  useEffect(()=>{const openNative=(e:PointerEvent)=>{if(e.target instanceof Element&&e.target.closest('button[aria-keyshortcuts="I"],button[data-town-lines-button]'))setPane('none');};document.addEventListener('pointerdown',openNative,true);return()=>document.removeEventListener('pointerdown',openNative,true);},[]);
  const [clock, setClock] = useState(Date.now());
  const [self, setSelf] = useState<CasinoPeer>({ id: '', name: 'Tester', look: '', ...SPAWN, seat: null });
  const [peers, setPeers] = useState<CasinoPeer[]>([]), [cheer, setCheer] = useState('');
  const [sound, setSound] = useState(false), [result, setResult] = useState<CasinoSpin | null>(null);
  const camera = useRef<CasinoCameraControls | null>(null);
  const setCamera = useCallback((controls: CasinoCameraControls | null) => { camera.current = controls; if(nativeRef.current)nativeRef.current.camera.current=controls; }, []);
  const presence = useRef<RealtimeChannel | null>(null), mine = useRef(self); mine.current = self;
  const pending = useRef<Pending | null>(null), lastCheer = useRef(0), cheerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const audio = useRef<AudioContext | null>(null), sounds = useRef(new Set<string>());
  const latestNow = useRef(now); latestNow.current = now;
  useEffect(() => {
    const tick = setInterval(() => { if (!document.hidden) setClock(latestNow.current()); }, 100);
    return () => { clearInterval(tick); clearTimeout(cheerTimer.current); void audio.current?.close(); };
  }, []);
  const play = useCallback((win: boolean) => {
    if (!audio.current) return;
    const ctx = audio.current;
    for (let i = 0; i < (win ? 4 : 2); i++) {
      const o = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + i * .12;
      o.type = 'sine'; o.frequency.value = win ? [523, 659, 784, 1046][i] : [294, 220][i];
      gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.055, at + .02); gain.gain.exponentialRampToValueAtTime(.0001, at + .18);
      o.connect(gain); gain.connect(ctx.destination); o.start(at); o.stop(at + .2);
    }
  }, []);
  useEffect(() => {
    if (!client || !state?.user_id) return;
    let gone = false;
    const uid = state.user_id, key = `${roomName}:${state.room_epoch??'live'}:pending:${uid}`;
    try { const old = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Pending | null;
      if (old?.id && typeof old.revision === 'number') { pending.current = old; setRecover(true); } } catch { /* unusable recovery data */ }
    const look = savedLook(uid) ?? defaultLook(uid);
    setSelf(s => ({ ...s, id: uid, look: encodeLook(look) }));
    void client.from('profiles').select('character_name,display_name,discord_username').eq('id', uid).maybeSingle().then(({ data }) => {
      if (!gone && data) setSelf(s => ({ ...s, name: data.character_name ?? data.display_name ?? data.discord_username ?? 'Tester' }));
    });
    if(nativeRef.current||walkerRef.current)return()=>{gone=true;};
    const ch = client.channel(roomName, { config: { private: true, presence: { key: uid }, broadcast: { self: false } } });
    presence.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const list: CasinoPeer[] = [];
      for (const [id, entries] of Object.entries(ch.presenceState())) {
        if (id === uid) continue;
        const p = entries[entries.length - 1] as unknown as CasinoPeer;
        if (!p || typeof p.name !== 'string' || typeof p.look !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        list.push({ id, name: p.name.slice(0, 40), look: p.look.slice(0, 12), x: Math.max(.5, Math.min(15.5, p.x)), y: Math.max(1.5, Math.min(11.5, p.y)),
          seat: Number.isInteger(p.seat) && p.seat! >= 1 && p.seat! <= 5 ? p.seat : null });
      }
      if (!gone) setPeers(list);
    });
    ch.on('broadcast', { event: 'cheer' }, ({ payload }) => {
      if (gone || typeof payload?.text !== 'string' || !payload.text.trim() || payload.text.length > 200 || typeof payload?.name !== 'string') return;
      setCheer(`${payload.name.slice(0, 40)}: ${payload.text}`); clearTimeout(cheerTimer.current);
      cheerTimer.current = setTimeout(() => setCheer(''), 4000);
    });
    void client.realtime.setAuth().then(() => {
      if (gone) return;
      ch.subscribe(status => { if (!gone && status === 'SUBSCRIBED') void ch.track(mine.current); });
    }).catch(() => { if (!gone) setError('เชื่อมต่อห้องร่วมกันไม่สำเร็จ ลองรีเฟรชหน้า'); });
    return () => { gone = true; presence.current = null; void client.removeChannel(ch); };
  }, [client, state?.user_id, state?.room_epoch, setError, roomName]);
  useEffect(() => {
    const t = setTimeout(() => { if (self.id && presence.current?.state === 'joined') void presence.current.track(self); }, 100);
    return () => clearTimeout(t);
  }, [self]);
  useEffect(() => {
    if (!sound || !state) return;
    for (const spin of state.spins) {
      if (spinRevealed(spin, clock) && clock - Date.parse(spin.reveal_at) < 1200 && !sounds.current.has(spin.id)) { sounds.current.add(spin.id); play(!!spin.prize); }
    }
  }, [clock, sound, state, play]);
  useEffect(()=>{const a=walker?.self;if(!a)return;const seat=!a.path.length&&a.info.sit===SIT_HERE&&Math.abs(a.pos.y-origin.y-3.5)<.1?MACHINE_X.findIndex(x=>Math.abs(origin.x+x-a.pos.x)<.1)+1||null:null;
    setSelf(p=>({...p,id:a.info.id,name:a.info.name,look:a.info.look??p.look,x:a.info.x,y:a.info.y,seat}));
    // (in the town, whether I am at the open machine is mine to work out: the casino's own map told it)
    if(town)setArrived(!a.path.length&&Math.hypot(a.pos.x-origin.x-MACHINE_X[selected-1],a.pos.y-origin.y-3.5)<.1);
  },[clock,walker,town,origin.x,origin.y,selected]);
  const select = (n: number) => { if(walker){const a=walker.self;const at={x:origin.x+MACHINE_X[n-1],y:origin.y+3.5};const here=!a.path.length&&Math.hypot(a.pos.x-at.x,a.pos.y-at.y)<.1;setSelected(n);setPane('slots');setArrived(here);walker.walkTo(at);walker.sitHere();return;} setSelected(n); setPane('slots'); setArrived(self.x===MACHINE_X[n-1]&&self.y===3.5); setSelf(p => ({ ...p, x: MACHINE_X[n - 1], y: 3.5, seat: n })); };
  const move = (x: number, y: number) => { if(walker){setPane('none');walker.walkTo({x:origin.x+x,y:origin.y+y});return;} if (!casinoWalkable({x,y})) return; setPane('none'); if(self.x!==x||self.y!==y)setArrived(false); setSelf(p => ({ ...p, x, y, seat: null })); };
  // ── in the town ── (the room's drawing is told what the reels show and which machine is open; a tap there comes here)
  const selectRef=useRef(select);selectRef.current=select;
  useEffect(()=>{if(!town)return;town.tap.current=n=>{if(n===0)setPane('desk');else selectRef.current(n);};return()=>{town.tap.current=null;};},[town]);
  const onSheet=town?.onSheet;
  useEffect(()=>{onSheet?.(pane!=='none');return()=>onSheet?.(false);},[onSheet,pane]);
  const spin = async (retry = false) => {
    if (!client || !state || busy) return;
    // (a forced result: the TEST room's, and the admins' trial of the real one, weighted only)
    const forcing = (!live || accessOf(state.settings) === 'admins') && state.settings.mode !== 'pool';
    const request: Pending = retry && pending.current ? pending.current : { id: crypto.randomUUID(), machine: selected, force: forcing ? force || null : null, revision: state.settings.revision };
    pending.current = request;
    const key = `${roomName}:${state.room_epoch??'live'}:pending:${state.user_id}`;
    try { sessionStorage.setItem(key, JSON.stringify(request)); } catch { /* retry remains available in this tab */ }
    setBusy(true); setError('');
    try {
      const { data, error: failed } = await client.rpc('casino_lab_spin', { p_request: request.id, p_machine: request.machine, p_force: request.force, p_revision: request.revision, player_name: self.name });
      if (failed) {
        const uncertain = !failed.code || failed.message.includes('Failed to fetch');
        if (uncertain) setRecover(true); else { pending.current = null; try { sessionStorage.removeItem(key); } catch { /* storage blocked */ } setRecover(false); }
        await reload();
        setError(uncertain ? 'การเชื่อมต่อขาดช่วง กดตรวจผลครั้งเดิม ระบบจะใช้รหัสเดิมเพื่อป้องกันหักเงินซ้ำ' : failed.message);
        return;
      }
      setResult(data as CasinoSpin); setSelected(request.machine); pending.current = null; setRecover(false); town?.onCoins?.();
      try { sessionStorage.removeItem(key); } catch { /* storage blocked */ }
      await reload();
    } catch { setRecover(true); setError('ยังยืนยันผลไม่ได้ กดตรวจผลครั้งเดิมเพื่อเรียกผลกลับมา'); }
    finally { setBusy(false); }
  };
  const chipCall = async (name: 'casino_live_buy' | 'casino_live_free', args: Record<string, unknown>, done: (r: { chips?: number; given?: number }) => string) => {
    if (!client || busy) return;
    setBusy(true); setChipNote('');
    try {
      const { data, error: failed } = await client.rpc(name, args);
      if (failed) { setChipNote(failed.code ? failed.message : 'การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่หักซ้ำ'); if (failed.code) buying.current = null; return; }
      const r = data as { ok?: boolean; why?: string; chips?: number; given?: number };
      buying.current = null;
      setChipNote(r?.ok ? done(r) : CHIP_WHY[r?.why ?? ''] ?? 'ยังทำรายการไม่ได้');
      if (r?.ok) town?.onCoins?.();
      await reload();
    } catch { setChipNote('การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่หักซ้ำ'); }
    finally { setBusy(false); }
  };
  const buyChips = (n: number) => {
    if (buying.current?.n !== n) buying.current = { id: crypto.randomUUID(), n };
    void chipCall('casino_live_buy', { p_request: buying.current.id, p_chips: n }, r => `ได้ ${money(n)} Casino Coin · มีอยู่ ${money(Number(r.chips ?? 0))}`);
  };
  const freeChips = () => void chipCall('casino_live_free', {}, r => `รับฟรี ${money(Number(r.given ?? 0))} Casino Coin แล้ว`);
  const credit = async (reset: boolean) => {
    if (!client || busy) return; setBusy(true);
    const { error } = await client.rpc('casino_lab_credit', { p_reset: reset });
    if (error) setError(error.message); else await reload(); setBusy(false);
  };
  const claim = async (id: string) => {
    if (!client || busy) return; setBusy(true);
    const { error } = await client.rpc('casino_lab_receipt', { p_id: id, p_action: 'request', p_note: '' });
    if (error) setError(error.message); else await reload(); setBusy(false);
  };
  const sendCheer = (text: string) => {
    if (Date.now() - lastCheer.current < 2000) return; lastCheer.current = Date.now();
    setCheer(`${self.name}: ${text}`); clearTimeout(cheerTimer.current); cheerTimer.current = setTimeout(() => setCheer(''), 4000);
    if(walker)walker.sendChat(text);
    void presence.current?.send({ type: 'broadcast', event: 'cheer', payload: { name: self.name, text } });
  };
  if (!state) return <main className="py-10"><h1 className="font-display text-head">Casino ทดลอง</h1><p className="mt-4" role="status">{error || 'กำลังเปิดประตูชั้นใต้ดิน…'}</p>
    <button className="mt-4 text-accent" onClick={() => void reload()}>ลองเชื่อมต่ออีกครั้ง</button></main>;
  const s = state.settings;
  // (what the page offers the admins goes by the database's word where it gives one, v299)
  const realAdmin = state.admin ?? siteAdmin;
  const latest = state.spins.find(p => p.machine === selected) ?? (result?.machine === selected ? result : null);
  const rolling = !!latest && !spinRevealed(latest, clock);
  const ownRolling = state.spins.some(p => p.user_id === state.user_id && !spinRevealed(p, clock));
  const visible = state.spins.filter(p => spinRevealed(p, clock));
  const remaining = s.per_player - state.account.spins;
  // (what a spin takes: Casino Coins once the database has them (v303), the town purse's Popoto coins before)
  const chips = live ? chipsOf(state) : null, purse = chips ?? state.account.coins, rate = s.chip_rate ?? 1;
  // (the admins' trial is at any hour, for the admins; everybody's within the event's hours)
  const trial = live && accessOf(s) === 'admins';
  const closed = !letIn(s, realAdmin) || (!trial && ((s.starts_at !== null && clock < Date.parse(s.starts_at)) || (s.ends_at !== null && clock >= Date.parse(s.ends_at))));
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (town) { town.art.spins = () => state.spins; town.art.clock = now; town.art.selected = pane === 'slots' ? selected : 0; town.art.sheetOpen = pane !== 'none'; }
  const myWin = latest && latest.user_id === state.user_id && latest.prize && !rolling ? latest.prize : null;
  return <main className={town?"casino-town-layer casino-in-town":native?"casino-town-layer":"casino-town-room"} data-pane={pane}>
    <section className="casino-room" aria-label="Casino laboratory">
      {!town && <CasinoMap native={native} self={self} peers={peers} spins={state.spins} selected={selected} clock={now} pane={pane} onMove={move} onSelect={select} onReception={()=>setPane('desk')} onDismiss={()=>setPane('none')} onReady={setArrived} onControls={setCamera} />}
      {!native && !town && <CasinoTownHud coins={state.account.coins} remaining={Math.max(0, remaining)} allowance={s.per_player} people={peers.length + 1} connected={connected} live={live} admin={realAdmin} pane={pane} onPane={setPane} onChat={sendCheer} sound={sound} onSound={() => { if (!sound) { audio.current ??= new AudioContext(); void audio.current.resume(); } setSound(!sound); }} camera={camera} />}
      {(native||town)&&<TownFoot rank="corner"><div className="casino-map-label tk tk-plate"><span>Casino {!live&&<small className="casino-test">TEST</small>}{trial&&<small className="casino-test">ทดสอบแอดมิน</small>}</span>{chips!==null&&<button className="tk tk-slot casino-chip-count" aria-label={`Casino Coin ${money(chips)} · แลกและรับฟรีที่เคาน์เตอร์`} aria-expanded={pane==='desk'} onClick={()=>setPane(p=>p==='desk'?'none':'desk')}>{money(chips)}<small>Casino Coin</small></button>}<button className="tk tk-slot" aria-label="ผลในห้อง" aria-expanded={pane==='feed'} onClick={()=>setPane(p=>p==='feed'?'none':'feed')}><TownIcon name="history" size={18}/></button></div></TownFoot>}
      {error && <p className="casino-error" role="alert">{error}</p>}
      <div className="casino-lower tk tk-window" role="dialog" aria-label={pane === 'feed' ? 'ผลและเสียงเชียร์' : pane==='desk'?'พนักงาน Casino':`Slot เครื่อง ${selected}`}><button className="casino-panel-close pressable tk tk-slot" aria-label="ปิดหน้าต่าง" onClick={() => setPane('none')}>×</button>
        <div className="casino-play-layout"><section className="casino-console"><h2>เครื่อง {selected}</h2>
        <nav className="casino-machines" aria-label="เลือกเครื่องสล็อต">{MACHINE_X.map((_, i) => <button key={i} className="casino-machine-tab pressable tk tk-slot" aria-label={`เครื่อง ${i + 1}`} aria-pressed={selected === i + 1} onClick={() => select(i + 1)}>{i + 1}</button>)}</nav>
        <p className="casino-allowance">{chips === null ? <>เหลือ {Math.max(0,remaining)} ครั้ง · ครั้งละ {money(s.price)} coin</> : <>Casino Coin <strong>{money(chips)}</strong> · ครั้งละ {money(s.price)} · เหลือ {Math.max(0,remaining)} ครั้ง</>}</p>
        <div className="casino-reels" aria-label={rolling ? 'กำลังหมุน' : latest ? latest.reels.join(', ') : 'พร้อมเล่น'}>
          {[0, 1, 2, 3].map(i => <div key={i} className={`casino-reel ${rolling && clock < Date.parse(latest!.reveal_at) - (3 - i) * 450 ? 'is-moving' : ''}`}>
            <CasinoSymbol id={latest ? reelAt(latest, i, clock, reduced) : 'popoto'} /></div>)}
        </div>
        <div className="casino-result" role="status">{rolling ? `${latest!.player_name} กำลังลุ้น…` : latest ? latest.prize ? `${latest.player_name} ได้ ${latest.prize.name}!${live && myWin ? ` · ${whereItGoes(myWin, chips !== null)}` : ''}` : `${latest.player_name} · รอบนี้ยังไม่ได้รางวัล` : 'เลือกเครื่อง แล้วดึงคันโยกได้เลย'}</div>
        <div className="casino-play-actions">{recover ? <button className="casino-spin pressable tk tk-btn" disabled={busy} onClick={() => void spin(true)}>ตรวจผลครั้งเดิม</button> :
          // (too few Casino Coins: the button is the way to the counter, where they are changed and given)
          chips !== null && chips < s.price && !closed && remaining > 0 && !ownRolling ? <button className="casino-spin pressable tk tk-btn" onClick={() => setPane('desk')}>Casino Coin ไม่พอ · แลกที่เคาน์เตอร์</button> :
          <button className="casino-spin pressable tk tk-btn" disabled={busy || !arrived || !self.seat || ownRolling || rolling || closed || remaining <= 0 || purse < s.price} onClick={() => void spin()}>
            {!arrived ? 'กำลังเดินไปหน้าเครื่อง…' : busy || ownRolling ? 'กำลังเล่น…' : closed ? 'เครื่องพักอยู่' : `ปั่น · ${money(s.price)} ${chips === null ? 'coin' : 'Casino Coin'}`}</button>}
        </div>
        <details className="casino-prize-details"><summary>โอกาสและรางวัล</summary>{state.prizes.filter(p => p.active).map(p => <p key={p.id}><strong>{PRIZE_LABEL[p.id] ?? p.id}</strong> · {p.name}: {effectiveChance(p, s, state.prizes).toFixed(3)}% · เหลือ {money(p.stock - p.issued)}</p>)}
          <p>งบ Gil {live?"":"ทดลอง"}เหลือ {money(s.budget - s.reserved)} · ผลใช้การตั้งค่ารุ่น {s.revision}</p><p>{live?`ของรางวัลเข้ากล่องรางวัลในเว็บ กดขอรับแล้วคุยกับแอดมินได้ · Gil เข้ากระเป๋าเงินในโปรไฟล์ · ${chips === null ? 'Coin เข้ากระเป๋า Cash Town' : 'Casino Coin ที่ได้คืนเข้ายอด Casino Coin'}`:"เครดิตและใบรับสิทธิ์ในห้องนี้เป็น TEST · ปิดทุกหน้าจะเริ่มใหม่"}</p>{trial&&<p>ตอนนี้เปิดให้แอดมินทดสอบ ทุกการหมุนเป็นการทดสอบ ล้างได้ที่หน้า Aqua</p>}</details>
      </section></div><section className="casino-desk-in-room"><h2>พนักงาน Casino</h2>
        {chips !== null && <div className="casino-chips">
          <p className="casino-chips-balance"><span>Casino Coin</span><strong>{money(chips)}</strong><small>Popoto coin {money(state.account.coins)}</small></p>
          {(s.free_chips ?? 0) > 0 && (state.account.free_today ? <p className="casino-chips-taken">รับฟรีวันนี้แล้ว · รับใหม่ได้หลัง 05:00</p> :
            <button className="casino-chips-free pressable tk tk-btn" disabled={busy || !letIn(s, realAdmin)} onClick={freeChips}>รับฟรีวันนี้ {money(s.free_chips ?? 0)} Casino Coin</button>)}
          <p className="casino-chips-rate">แลก {money(rate)} Popoto coin = 1 Casino Coin · แลกกลับไม่ได้</p>
          <div className="casino-chips-packs" role="radiogroup" aria-label="จำนวนที่จะแลก">{CHIP_PACKS.map(k => <button key={k} role="radio" aria-checked={pack === k} className="pressable tk tk-slot" onClick={() => setPack(k)}>{k} ครั้ง<small>{money(k * s.price)}</small></button>)}</div>
          <button className="casino-chips-buy pressable tk tk-btn" disabled={busy || !letIn(s, realAdmin) || state.account.coins < pack * s.price * rate} onClick={() => buyChips(pack * s.price)}>
            {state.account.coins < pack * s.price * rate ? `Popoto coin ไม่พอ (ใช้ ${money(pack * s.price * rate)})` : `แลก ${money(pack * s.price)} Casino Coin · ${money(pack * s.price * rate)} Popoto coin`}</button>
          {chipNote && <p className="casino-chips-note" role="status">{chipNote}</p>}
          <button className="casino-chips-back pressable tk tk-slot" onClick={() => select(selected)}>ไปเล่นที่เครื่อง {selected}</button>
        </div>}
        <p>{town?`แตะตู้หรือเก้าอี้เพื่อเข้าเล่น · ของรางวัลเข้ากล่องรางวัลในเว็บ · Gil เข้ากระเป๋าเงิน${chips === null ? ' · Coin เข้ากระเป๋า Cash Town' : ''}`:'แตะตู้หรือเก้าอี้เพื่อเข้าเล่น · ใบรับสิทธิ์อยู่ในแท็บ Event ของกระเป๋า'}</p>
        <div className="casino-actions"><button className="tk tk-slot" aria-pressed={sound} onClick={()=>{if(!sound){audio.current??=new AudioContext();void audio.current.resume();}setSound(!sound);}}>{sound?'ปิดเสียงสล็อต':'เปิดเสียงสล็อต'}</button>{town?<button className="tk tk-slot" onClick={()=>{setPane('none');walker?.walkTo({x:CASINO_EXIT.tiles[0][0]+.5,y:CASINO_EXIT.tiles[0][1]+.5});}}>เดินออกไปในเมือง</button>:<Link className="tk tk-slot" href="/town?map=town">กลับหมู่บ้าน</Link>}</div>
        {realAdmin&&<><Link className="casino-aqua-link tk tk-btn" href={live?'/admin/aqua/casino-live':'/admin/aqua/casino'}>Aqua · ตั้งค่า {label}</Link>{!live&&<details className="casino-lab-tools"><summary>เครื่องมือห้องทดลอง</summary><div className="casino-actions"><button disabled={busy||ownRolling} onClick={()=>void credit(false)}>เติม 20,000 coin ทดลอง</button><button disabled={busy||ownRolling} onClick={()=>void credit(true)}>เริ่มกระเป๋าทดลองใหม่</button></div><label className="casino-forced">ผลทดสอบ<select aria-label="ผลสำหรับทดสอบ" value={force} disabled={s.mode==='pool'} onChange={e=>setForce(e.target.value)}><option value="">สุ่มจริง</option><option value="miss">พลาด</option>{state.prizes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></details>}
          {trial&&<label className="casino-forced">ผลที่จะออก (แอดมินทดสอบ)<select aria-label="ผลที่จะออก" value={force} disabled={s.mode==='pool'} onChange={e=>setForce(e.target.value)}><option value="">สุ่มจริง</option><option value="miss">พลาด</option>{state.prizes.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{PRIZE_LABEL[p.id]} · {p.name}</option>)}</select></label>}</>}
      </section><section className="casino-feed"><h2>เสียงจากหน้าเครื่อง</h2><div className="casino-cheers">{CHEERS.map(text => <button key={text} className="tk tk-slot" onClick={() => sendCheer(text)}>{text}</button>)}</div>
        <p className="casino-cheer-text" role="status">{cheer}</p><ol aria-label="ผลการปั่นในห้อง">{visible.slice(0, 14).map(p => <li key={p.id} className={p.prize ? 'casino-win' : 'casino-miss'}>
          <strong>{p.player_name}</strong> · เครื่อง {p.machine}<br />{p.prize ? `ได้ ${p.prize.name}` : 'ยังไม่ได้รางวัล · คนข้าง ๆ ช่วยลุ้นรอบต่อไปได้'}
          <small>{new Date(p.reveal_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })} · {label}{p.forced ? ' · กำหนดผลทดสอบ' : ''}</small></li>)}</ol>
        {!visible.length && <p className="mt-4 text-sm">ผลทุกเครื่องจะปรากฏที่นี่หลังวงล้อหยุด</p>}</section></div>
      <section className="casino-bag tk tk-window" role="dialog" aria-label="กระเป๋า Event"><button className="casino-panel-close pressable tk tk-slot" aria-label="ปิดหน้าต่าง" onClick={() => setPane('none')}>ปิด</button><div className="casino-bag-head"><h2>กระเป๋า Event <span className="casino-test">{label}</span></h2><button onClick={() => { setHistory(!history); setPage(0); }}>{history ? 'ดูใบที่รอรับ' : 'ดูประวัติรับรางวัล'}</button></div>
        <p className="text-sm text-muted">ใบรับสิทธิ์แยกจากกระเป๋าของทั่วไป เก็บประวัติไว้หลังส่งมอบ</p><div className="casino-receipts">{state.receipts.slice(0, 20).map(r => <article className="casino-receipt" key={r.id}>
          <h3>{r.prize.name}</h3><p>{label} · {CLAIM_LABEL[r.status]}</p><code>{r.id}</code>{r.note && <p>{r.note}</p>}
          {r.status === 'pending' && <button disabled={busy || !!r.requested_at} onClick={() => void claim(r.id)}>{r.requested_at ? 'แจ้ง Aqua แล้ว' : (live?'ขอรับรางวัล':'ขอรับรางวัลทดลอง')}</button>}</article>)}</div>
        {!state.receipts.length && <p className="mt-4 text-sm">{history ? 'ยังไม่มีประวัติส่งมอบ' : 'เมื่อได้ Gil หรือของพิเศษ ใบรับสิทธิ์จะมาอยู่ตรงนี้'}</p>}
        <div className="casino-actions"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>ก่อนหน้า</button><span className="self-center text-xs">หน้า {page + 1}</span><button disabled={state.receipts.length <= 20} onClick={() => setPage(p => p + 1)}>ถัดไป</button></div>
      </section>
    </section></main>;
}
