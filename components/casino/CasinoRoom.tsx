"use client";
import { useAdmin } from '@/lib/admin';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { accessOf, backRows, CHIP_PACKS, CHIP_WHY, chipsOf, chipsShown, CLAIM_LABEL, letIn, mineOfRoom, money, PRIZE_LABEL, reelTeasing, spinRevealed, whereItGoes, wonWords, type CasinoMine, type CasinoSpin, type SymbolId } from '@/lib/casino';
import type { TownSession } from '@/lib/town/session';
import type { CasinoRoomArt } from '@/lib/town/casino-room-art';
import { CASINO_EXIT, CASINO_ROOM, CASINO_SOFA_SEATS, CASINO_STOOLS } from '@/lib/town/casino-room';
import { defaultLook, encodeLook, savedLook } from '@/lib/town/look';
import CasinoMap, { MACHINE_X, SPAWN, type CasinoPeer } from './CasinoMap';
import CasinoSymbol from './CasinoSymbol';
import CasinoLever from './CasinoLever';
import CasinoReel from './CasinoReel';
import { useCasino } from './useCasino';
import './casino.css';
import { CasinoSounds, outcomeSound } from '@/lib/town/casino-sound';
import { CASINO_MAP, casinoWalkable } from '@/lib/town/casino-map';
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
  onCoins?: () => void;
  /** The Casino Coins held, for the town's status bar while in the casino (v303; null: none to say) */
  onChips?: (chips: number | null) => void };
/** A minute sat at a machine without a spin, and one is stood up (the database lets another have it then, v305). */
const AFK_MS = 60_000;
/** The TEST room's own map: its five stools on one row, in its own tiles. */
const TEST_STOOLS = MACHINE_X.map(x => ({ x, y: 3.5 }));
const CHEERS = ['ลุ้นด้วย!', 'มาแล้ว ๆ!', 'อีกนิดเดียว!', 'ยินดีด้วย!'];
export default function CasinoRoom({native,town}:{native?:TownMapRuntime;town?:CasinoInTown}) {
  const nativeRef=useRef(native);nativeRef.current=native;
  // (where the room's own tiles are in the walker's: the town's tile space, or the casino map's own)
  const origin=town?{x:CASINO_ROOM.x,y:CASINO_ROOM.y}:{x:0,y:0};
  // (each machine's stool where the walker sits: the town's room has ten on two rows, the TEST room's own map five on one)
  // (one list each, made once: an effect follows it, and a new one every render would never let it rest: Codex's check)
  const stools=town?CASINO_STOOLS:TEST_STOOLS;
  const walker=town?.session??native?.session??null,walkerRef=useRef(walker);walkerRef.current=walker;
  const [history, setHistory] = useState(false), [page, setPage] = useState(0);
  const { client, live, state, error, setError, connected, reload, now } = useCasino(history, page);
  const {realAdmin:siteAdmin}=useAdmin();
  const roomName=live?'casino-live':'casino-lab';
  const label=live?'LIVE':'TEST';
  const [selected, setSelected] = useState(1), [force, setForce] = useState('');
  const [busy, setBusy] = useState(false), [recover, setRecover] = useState(false);
  const [pane, setPane] = useState<'none'|'slots'|'bag'|'feed'|'desk'|'mine'>('none'), [arrived, setArrived] = useState(true);
  // ── Casino Coins (v303): changed from Popoto coins at the counter, and free once a day ──
  const [pack, setPack] = useState<number>(CHIP_PACKS[0]), [chipNote, setChipNote] = useState(''), [popotoN, setPopotoN] = useState(10);
  /** A change of popoto asked and not yet answered: asked again with the same request, so it is never spent twice. */
  const changing = useRef<{ id: string; n: number; to: string } | null>(null);
  /** A change asked and not yet answered: asked again with the same request, so it is never paid twice. */
  const buying = useRef<{ id: string; n: number } | null>(null);
  useEffect(()=>{if(pane==='none')return;const close=(e:KeyboardEvent)=>{const field=e.target instanceof HTMLElement&&!!e.target.closest('input,select,textarea');if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setPane('none');document.querySelector<HTMLCanvasElement>('.casino-town-canvas')?.focus();}else if(!field&&e.key.toLowerCase()==='i')setPane('none');};document.addEventListener('keydown',close,true);return()=>document.removeEventListener('keydown',close,true);},[pane]);
  useEffect(()=>{const openNative=(e:PointerEvent)=>{if(e.target instanceof Element&&e.target.closest('button[aria-keyshortcuts="I"],button[data-town-lines-button]'))setPane('none');};document.addEventListener('pointerdown',openNative,true);return()=>document.removeEventListener('pointerdown',openNative,true);},[]);
  const [clock, setClock] = useState(Date.now());
  // (the town's status bar says my Casino Coins while I am here, what a spin brings back once its reels stop)
  const steadyChips = useRef<number | null>(null);
  const chipsNow = live && state ? chipsShown(state, clock, steadyChips.current) : null, onChips = town?.onChips;
  // (the count before my own reels turn, kept for while they do)
  if (live && state && !state.spins.some(p => p.user_id === state.user_id && !spinRevealed(p, clock))) steadyChips.current = chipsOf(state);
  useEffect(() => { onChips?.(chipsNow); }, [onChips, chipsNow]);
  useEffect(() => () => onChips?.(null), [onChips]);
  // (a "+N" by the count when Casino Coins come in: a win as its reels stop, or what the counter gave)
  const [plus, setPlus] = useState<{ n: number; key: number } | null>(null), lastChips = useRef<number | null>(null);
  useEffect(() => { const was = lastChips.current; lastChips.current = chipsNow; if (was !== null && chipsNow !== null && chipsNow > was) setPlus({ n: chipsNow - was, key: Date.now() }); }, [chipsNow]);
  useEffect(() => { if (!plus) return; const gone = setTimeout(() => setPlus(null), 1900); return () => clearTimeout(gone); }, [plus]);
  // ── what I won (the owner, 2026-10-27: "ดูกระเป๋าตังค์ตัวเองยากว่าชนะอะไรไปแล้วบ้าง"): today's count, asked of the database
  // (v308) when the pane opens and again as my reels stop; until v308 has run, the room's latest spins say it ──
  const [myDay, setMyDay] = useState<CasinoMine | null>(null);
  const mineTurning = !!state && state.spins.some(p => p.user_id === state.user_id && !spinRevealed(p, clock));
  const loadMine = useCallback(async () => {
    if (!client || !live) return;
    const { data, error: failed } = await client.rpc('casino_live_mine');
    const got = data as (Omit<CasinoMine, 'today'> & { ok?: boolean }) | null;
    setMyDay(!failed && got?.ok ? { ...got, today: true } : null);
  }, [client, live]);
  // (and again when a spin of mine comes in, from this tab or another, and when the town's day turns at 05:00 Bangkok: Codex)
  const myLatest = state?.spins.find(p => p.user_id === state.user_id)?.id ?? '', townDay = Math.floor((clock + 7_200_000) / 86_400_000);
  useEffect(() => { if (pane === 'mine' && !mineTurning) void loadMine(); }, [pane, mineTurning, loadMine, myLatest, townDay]);
  const [self, setSelf] = useState<CasinoPeer>({ id: '', name: 'Tester', look: '', ...SPAWN, seat: null });
  const [peers, setPeers] = useState<CasinoPeer[]>([]), [cheer, setCheer] = useState('');
  // (sound is on unless this browser turned it off: the owner's slot sounds, lib/town/casino-sound)
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('casino-sound') !== 'off'; } catch { return true; } }), [result, setResult] = useState<CasinoSpin | null>(null);
  const camera = useRef<CasinoCameraControls | null>(null);
  const setCamera = useCallback((controls: CasinoCameraControls | null) => { camera.current = controls; if(nativeRef.current)nativeRef.current.camera.current=controls; }, []);
  const presence = useRef<RealtimeChannel | null>(null), mine = useRef(self); mine.current = self;
  const pending = useRef<Pending | null>(null), lastCheer = useRef(0), cheerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sfx = useRef<CasinoSounds | null>(null), sounds = useRef(new Set<string>()), spun = useRef(new Set<string>());
  if (!sfx.current) sfx.current = new CasinoSounds();
  const latestNow = useRef(now); latestNow.current = now;
  useEffect(() => {
    const tick = setInterval(() => { if (!document.hidden) setClock(latestNow.current()); }, 100);
    return () => { clearInterval(tick); clearTimeout(cheerTimer.current); sfx.current?.close(); };
  }, []);
  // (a tap anywhere makes the sounds ready: browsers start sound only from one)
  useEffect(() => { if (!sound) return; const wake = () => sfx.current?.wake(); document.addEventListener('pointerdown', wake, true); return () => document.removeEventListener('pointerdown', wake, true); }, [sound]);
  const toggleSound = () => { const on = !sound; if (on) sfx.current?.wake(); setSound(on); try { localStorage.setItem('casino-sound', on ? 'on' : 'off'); } catch { /* this tab only */ } };
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
        list.push({ id, name: p.name.slice(0, 40), look: p.look.slice(0, 12), x: Math.max(.5, Math.min(CASINO_MAP.width - .5, p.x)), y: Math.max(1.5, Math.min(11.5, p.y)),
          seat: Number.isInteger(p.seat) && p.seat! >= 1 && p.seat! <= 10 ? p.seat : null });
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
  // (the machine I play or look at: its reels as they turn, then what came of them; the other nine are quiet)
  useEffect(() => {
    if (!sound || !state) return;
    if (pane !== 'slots' && self.seat !== selected) return;
    for (const spin of state.spins) {
      if (spin.machine !== selected) continue;
      const left = Date.parse(spin.reveal_at) - clock;
      if (left > 0 && left < 4000 && !spun.current.has(spin.id)) { spun.current.add(spin.id); sfx.current?.play('spin', left); }
      if (spinRevealed(spin, clock) && clock - Date.parse(spin.reveal_at) < 1200 && !sounds.current.has(spin.id)) {
        sounds.current.add(spin.id); const key = outcomeSound(spin); if (key) sfx.current?.play(key);
      }
    }
  }, [clock, sound, state, pane, selected, self.seat]);
  useEffect(()=>{const a=walker?.self;if(!a)return;const seat=!a.path.length&&a.info.sit===SIT_HERE?stools.findIndex(p=>Math.abs(p.x-a.pos.x)<.1&&Math.abs(p.y-a.pos.y)<.1)+1||null:null;
    setSelf(p=>({...p,id:a.info.id,name:a.info.name,look:a.info.look??p.look,x:a.info.x,y:a.info.y,seat}));
    // (in the town, whether I am at the open machine is mine to work out: the casino's own map told it)
    if(town)setArrived(!a.path.length&&Math.hypot(a.pos.x-stools[selected-1].x,a.pos.y-stools[selected-1].y)<.1);
  },[clock,walker,town,stools,selected]);
  // ── one player a machine, and the idle stood up (v305) ── (sitting down holds the machine; it is let go on standing up,
  // and a minute without a spin stands one up for the next player, as the database lets another have it then)
  const lastPlay = useRef(0), heldSeat = useRef<number | null>(null);
  const select = async (n: number) => { if(walker){
    if(live&&town&&client){
      const {data,error:failed}=await client.rpc('casino_live_seat',{p_machine:n});
      const r=data as {ok?:boolean;why?:string;name?:string}|null;
      if(!failed&&r&&!r.ok&&r.why==='taken'){setError(`เครื่อง ${n} มี ${r.name??'คนอื่น'} เล่นอยู่ เลือกเครื่องอื่นได้เลย`);return;}
      if(!failed&&r?.ok){heldSeat.current=n;lastPlay.current=latestNow.current();setError('');}
    }
    // (from here till sat down, a moment's standing is the re-sit's, not a standing up: Codex's check, after a refusal above)
    resitting.current = true;
    const a=walker.self;const at=stools[n-1];const here=!a.path.length&&Math.hypot(a.pos.x-at.x,a.pos.y-at.y)<.1;setSelected(n);setPane('slots');setArrived(here);walker.walkTo(at);walker.sitHere();return;} setSelected(n); setPane('slots'); setArrived(self.x===MACHINE_X[n-1]&&self.y===3.5); setSelf(p => ({ ...p, x: MACHINE_X[n - 1], y: 3.5, seat: n })); };
  const move = (x: number, y: number) => { if(walker){setPane('none');walker.walkTo({x:origin.x+x,y:origin.y+y});return;} if (!casinoWalkable({x,y})) return; setPane('none'); if(self.x!==x||self.y!==y)setArrived(false); setSelf(p => ({ ...p, x, y, seat: null })); };
  // ── in the town ── (the room's drawing is told what the reels show and which machine is open; a tap there comes here)
  const selectRef=useRef(select);selectRef.current=select;
  // (a sofa, 100 and its place among the furniture: the free place on it nearest its middle, sat on from the floor before it)
  const sitSofa=(sofa:number)=>{const w=walkerRef.current;if(!w)return;const places=CASINO_SOFA_SEATS.filter(p=>p.sofa===sofa);
    // (a place is had by whoever sits there or is on the way to it: Codex's check, two tapping one sofa at once)
    const at=(v:{x:number;y:number},p:{stand:{x:number;y:number}})=>Math.abs(v.x-p.stand.x)<.1&&Math.abs(v.y-p.stand.y)<.1;
    const taken=(p:{stand:{x:number;y:number}})=>w.people.some(a=>at(a.path.length?a.path[a.path.length-1]:a.pos,p));
    const free=[places[1],places[0],places[2]].find(p=>p&&!taken(p));if(!free)return;setPane('none');w.walkTo(free.stand);w.sitHere();};
  const sitSofaRef=useRef(sitSofa);sitSofaRef.current=sitSofa;
  useEffect(()=>{if(!town)return;town.tap.current=n=>{if(n===0)setPane('desk');else if(n>=100)sitSofaRef.current(n-100);else selectRef.current(n);};return()=>{town.tap.current=null;};},[town]);
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
    // (a spin pressed is play: the minute starts again now, not when its answer comes: Codex's check)
    lastPlay.current = latestNow.current();
    setBusy(true); setError('');
    try {
      const { data, error: failed } = await client.rpc('casino_lab_spin', { p_request: request.id, p_machine: request.machine, p_force: request.force, p_revision: request.revision, player_name: self.name });
      if (failed) {
        const uncertain = !failed.code || failed.message.includes('Failed to fetch');
        if (uncertain) setRecover(true); else { pending.current = null; try { sessionStorage.removeItem(key); } catch { /* storage blocked */ } setRecover(false); }
        await reload();
        setError(uncertain ? 'การเชื่อมต่อขาดช่วง กดตรวจผลครั้งเดิม ระบบจะใช้รหัสเดิมเพื่อป้องกันหักเงินซ้ำ' : failed.message.includes('Machine taken') ? `เครื่อง ${request.machine} มีคนเล่นอยู่ เลือกเครื่องอื่นได้เลย` : failed.message);
        return;
      }
      setResult(data as CasinoSpin); setSelected(request.machine); pending.current = null; setRecover(false); town?.onCoins?.();
      heldSeat.current = request.machine; lastPlay.current = latestNow.current();
      try { sessionStorage.removeItem(key); } catch { /* storage blocked */ }
      await reload();
    } catch { setRecover(true); setError('ยังยืนยันผลไม่ได้ กดตรวจผลครั้งเดิมเพื่อเรียกผลกลับมา'); }
    finally { setBusy(false); }
  };
  // (`added`: the Casino Coins the call put in, counted at once into the count kept while my reels turn: Codex)
  const chipCall = async (name: 'casino_live_buy' | 'casino_live_free' | 'casino_live_popoto', args: Record<string, unknown>, done: (r: { chips?: number; given?: number; got?: number }) => string, added: (r: { given?: number; got?: number }) => number) => {
    if (!client || busy) return;
    setBusy(true); setChipNote('');
    try {
      const { data, error: failed } = await client.rpc(name, args);
      if (failed) { setChipNote(failed.code ? failed.message : 'การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่หักซ้ำ'); if (failed.code) buying.current = null; return; }
      const r = data as { ok?: boolean; why?: string; chips?: number; given?: number; got?: number };
      buying.current = null;
      setChipNote(r?.ok ? done(r) : CHIP_WHY[r?.why ?? ''] ?? 'ยังทำรายการไม่ได้');
      if (r?.ok) { town?.onCoins?.(); if (steadyChips.current !== null) steadyChips.current += Math.max(0, Number(added(r)) || 0); }
      await reload();
    } catch { setChipNote('การเชื่อมต่อขาดช่วง กดอีกครั้งได้ ระบบไม่หักซ้ำ'); }
    finally { setBusy(false); }
  };
  const buyChips = (n: number) => {
    if (buying.current?.n !== n) buying.current = { id: crypto.randomUUID(), n };
    void chipCall('casino_live_buy', { p_request: buying.current.id, p_chips: n }, r => `ได้ ${money(n)} Casino Coin · มีอยู่ ${money(Number(r.chips ?? 0))}`, () => n);
  };
  const freeChips = () => void chipCall('casino_live_free', {}, r => `รับฟรี ${money(Number(r.given ?? 0))} Casino Coin แล้ว`, r => Number(r.given ?? 0));
  const changePopoto = (to: 'coins' | 'chips') => {
    if (changing.current?.n !== popotoN || changing.current?.to !== to) changing.current = { id: crypto.randomUUID(), n: popotoN, to };
    const req = changing.current;
    void chipCall('casino_live_popoto', { p_request: req.id, p_popoto: req.n, p_to: to }, r => { changing.current = null; return `ได้ ${money(Number(r.got ?? 0))} ${to === 'coins' ? 'Popoto coin' : 'Casino Coin'}`; }, r => to === 'chips' ? Number(r.got ?? 0) : 0);
  };
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
  // (standing up lets the held machine go; sat a minute without a spin, one is stood up for the next player: the owner,
  // 2026-10-27, "ถ้ามีคน AFK ตอนเล่น slot machine อยู่ จะมีระบบ auto kick ให้")
  const satAt = useRef<number | null>(null);
  const idleLeft = town && live && heldSeat.current && self.seat === heldSeat.current ? Math.max(0, AFK_MS - (clock - lastPlay.current)) : null;
  useEffect(() => {
    if (!town || !live || !client || !walker) return;
    const held = heldSeat.current;
    if (held && self.seat === held) satAt.current = held;
    else if (satAt.current && self.seat !== satAt.current) {
      // (stood up: let it go, unless the machine walked to next is the one held now)
      if (heldSeat.current === satAt.current) { heldSeat.current = null; void client.rpc('casino_live_seat', { p_machine: null }); }
      satAt.current = null;
    }
    // (never while a spin of mine is being asked or its reels still turn)
    const turning = state?.spins.some(p => p.user_id === state.user_id && !spinRevealed(p, clock));
    if (held && self.seat === held && !busy && !turning && clock - lastPlay.current > AFK_MS) {
      heldSeat.current = null; satAt.current = null; setPane('none');
      void client.rpc('casino_live_seat', { p_machine: null });
      const stool = stools[held - 1]; walker.walkTo({ x: stool.x, y: stool.y + 1 });
      setError('ไม่ได้หมุนเกิน 1 นาที ลุกจากเครื่องให้คนอื่นเล่นแล้ว');
    }
  }, [clock, self.seat, town, live, client, walker, stools, setError, busy, state]);
  // (standing up from the machine whose sheet is open shuts the sheet; sitting down at another keeps it, for that one: the
  // owner, 2026-10-27, "ตอนกด x เพื่อลุกออกจากเครื่อง ถ้าเปิด UI เครื่องนั้นอยู่ช่วยปิดด้วย")
  // (not the moment of standing that sitting down again takes: `resitting` from a tap on a machine till one sits)
  const wasSeat = useRef<number | null>(null), resitting = useRef(false);
  useEffect(() => {
    if (self.seat === selected) resitting.current = false;
    if (wasSeat.current && !self.seat && selected === wasSeat.current && !resitting.current) setPane(p => p === 'slots' ? 'none' : p);
    wasSeat.current = self.seat;
  }, [self.seat, selected]);
  // (leaving the casino lets the machine go at once, not a minute on: Codex's check)
  useEffect(() => () => { if (heldSeat.current && client) void client.rpc('casino_live_seat', { p_machine: null }); }, [client]);
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
  const chips = live ? chipsOf(state) : null, purse = chips ?? state.account.coins, rate = s.chip_rate ?? 1, bankRate = state.account.bank_rate ?? 5;
  // (the admins' trial is at any hour, for the admins; everybody's within the event's hours)
  const trial = live && accessOf(s) === 'admins';
  const closed = !letIn(s, realAdmin) || (!trial && ((s.starts_at !== null && clock < Date.parse(s.starts_at)) || (s.ends_at !== null && clock >= Date.parse(s.ends_at))));
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (town) { town.art.spins = () => state.spins; town.art.clock = now; town.art.selected = pane === 'slots' ? selected : 0; town.art.sheetOpen = pane !== 'none'; }
  const myWin = latest && latest.user_id === state.user_id && latest.prize && !rolling ? latest.prize : null;
  // (the lever plays unless the play is to look again at a spin, or to go and get Casino Coins: then a button says so)
  const short = chips !== null && chips < s.price && !closed && !ownRolling, leverOn = !recover && !short;
  const leverReady = leverOn && !(busy || !arrived || !self.seat || ownRolling || rolling || closed || purse < s.price);
  // (grey while it cannot be pulled at all; while the reels turn it keeps its colour)
  const leverDim = !leverOn || (!leverReady && !busy && !ownRolling && !rolling);
  const leverWords = !arrived ? 'กำลังเดินไปหน้าเครื่อง…' : busy || ownRolling ? 'กำลังเล่น…' : closed ? 'เครื่องพักอยู่' : null;
  return <main className={town?"casino-town-layer casino-in-town":native?"casino-town-layer":"casino-town-room"} data-pane={pane}>
    <section className="casino-room" aria-label="Casino laboratory">
      {!town && <CasinoMap native={native} self={self} peers={peers} spins={state.spins} selected={selected} clock={now} pane={pane} onMove={move} onSelect={select} onReception={()=>setPane('desk')} onDismiss={()=>setPane('none')} onReady={setArrived} onControls={setCamera} />}
      {!native && !town && <CasinoTownHud coins={state.account.coins} remaining={Math.max(0, remaining)} allowance={s.per_player} people={peers.length + 1} connected={connected} live={live} admin={realAdmin} pane={pane} onPane={setPane} onChat={sendCheer} sound={sound} onSound={toggleSound} camera={camera} />}
      {(native||town)&&<TownFoot rank="corner"><div className="casino-map-label tk tk-plate"><span>Casino {!live&&<small className="casino-test">TEST</small>}{trial&&<small className="casino-test">ทดสอบแอดมิน</small>}</span>{chips!==null&&<button className="tk tk-slot casino-chip-count" aria-label="แลกและรับ Casino Coin ที่เคาน์เตอร์" aria-expanded={pane==='desk'} onClick={()=>setPane(p=>p==='desk'?'none':'desk')}>แลก Coin</button>}<button className="tk tk-slot casino-mine-button" aria-label="ของฉัน: วันนี้ได้อะไรไปบ้าง" aria-expanded={pane==='mine'} onClick={()=>setPane(p=>p==='mine'?'none':'mine')}>ของฉัน</button><button className="tk tk-slot" aria-label="ผลในห้อง" aria-expanded={pane==='feed'} onClick={()=>setPane(p=>p==='feed'?'none':'feed')}><TownIcon name="history" size={18}/></button></div></TownFoot>}
      {error && <p className="casino-error" role="alert">{error}</p>}
      <div className="casino-lower tk tk-window" role="dialog" aria-label={pane === 'feed' ? 'ผลและเสียงเชียร์' : pane==='desk'?'พนักงาน Casino':pane==='mine'?'ของฉัน':`Slot เครื่อง ${selected}`}><button className="casino-panel-close pressable tk tk-slot" aria-label="ปิดหน้าต่าง" onClick={() => setPane('none')}>×</button>
        <div className="casino-play-layout"><section className="casino-console"><h2>เครื่อง {selected}</h2>
        <p className="casino-allowance">{chips === null ? <>ครั้งละ {money(s.price)} coin</> : <>Casino Coin <span className="casino-count"><strong>{money(chipsNow ?? chips)}</strong>{plus && <span key={plus.key} className="casino-plus" aria-hidden>+{money(plus.n)}</span>}</span></>}</p>
        {idleLeft !== null && idleLeft < 15_000 && <p className="casino-afk" role="status">ไม่ได้หมุนนาน จะลุกจากเครื่องใน {Math.ceil(idleLeft / 1000)} วินาที</p>}
        {/* the machine itself (the owner, 2026-10-27): its lights, its reels, its price under them, and its lever at the side */}
        <div className={`casino-machine${rolling ? ' is-rolling' : ''}${rolling && !reduced && reelTeasing(latest!, clock) ? ' is-tease' : ''}`}><div className="casino-cabinet">
          <div className="casino-bulbs" aria-hidden>{Array.from({ length: 11 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 2) * 270}ms` }} />)}</div>
          <div className="casino-reels" aria-label={rolling ? 'กำลังหมุน' : latest ? latest.reels.join(', ') : 'พร้อมเล่น'}>
            {/* (each reel a strip turning past the line, the faces over and under it seen: lib/casino's reelView) */}
            {[0, 1, 2, 3].map(i => <div key={i} className="casino-reel"><CasinoReel spin={latest} reel={i} reduced={reduced} now={latestNow} /></div>)}
          </div>
          <p className="casino-plate">ครั้งละ <b>{money(s.price)}</b> {chips === null ? 'coin' : 'Casino Coin'}</p></div>
          <CasinoLever className={leverOn ? 'casino-spin' : ''} ready={leverReady} dim={leverDim}
            label={leverWords ?? `ดึงคันโยก · ${money(s.price)} ${chips === null ? 'coin' : 'Casino Coin'}`} onPull={() => void spin()} /></div>
        <div className="casino-result" role="status">{rolling ? `${latest!.player_name} กำลังลุ้น…` : latest ? latest.prize ? <>{`${latest.player_name} ${wonWords(latest.prize)}!`}{live && myWin && <small className="casino-result-where">{whereItGoes(myWin, chips !== null)}</small>}</> : `${latest.player_name} · รอบนี้ยังไม่ได้รางวัล` : 'เลือกเครื่อง แล้วดึงคันโยกได้เลย'}</div>
        <div className="casino-play-actions">{recover ? <button className="casino-spin pressable tk tk-btn" disabled={busy} onClick={() => void spin(true)}>ตรวจผลครั้งเดิม</button> :
          // (too few Casino Coins: the button is the way to the counter, where they are changed and given)
          short ? <button className="casino-spin pressable tk tk-btn" onClick={() => setPane('desk')}>Casino Coin ไม่พอ · แลกที่เคาน์เตอร์</button> :
          <p className="casino-lever-hint">{leverWords ?? 'ลากคันโยกลง หรือแตะคันโยก เพื่อหมุน'}</p>}
        </div>
        {/* the machine's paytable, as a player reads one: the symbols, what they win (the chances are the desk's) */}
        <details className="casino-prize-details"><summary>ตารางรางวัล</summary><div className="casino-paytable">
          {state.prizes.filter(p => p.active && p.id !== 'pair').map(p => <p key={p.id} className="casino-paytable-row is-prize"><span className="casino-paytable-pair">{[0, 1, 2, 3].map(i => <CasinoSymbol key={i} id={p.id as SymbolId} />)}</span><span>{p.name}</span></p>)}
          {state.prizes.some(p => p.id === 'pair' && p.active) && (s.back_table ? backRows(s.back_table, s.price, 0).map(row => <p key={row.sym} className={`casino-paytable-row${row.amount > s.price ? ' is-profit' : ''}`}>
            <span className="casino-paytable-pair"><CasinoSymbol id={row.sym} /><CasinoSymbol id={row.sym} /></span><span>{money(row.amount)} Casino Coin</span></p>) :
            <p className="casino-paytable-row"><span>สองช่องแรกเหมือนกัน</span><span>{state.prizes.find(p => p.id === 'pair')?.name}</span></p>)}</div>
          </details>
      </section></div><section className="casino-desk-in-room"><h2>พนักงาน Casino</h2>
        {chips !== null && <div className="casino-chips">
          <p className="casino-chips-balance"><span>Casino Coin</span><strong>{money(chipsNow ?? chips)}</strong><small>Popoto coin {money(state.account.coins)}</small></p>
          {(s.free_chips ?? 0) > 0 && (state.account.free_today ? <p className="casino-chips-taken">รับฟรีวันนี้แล้ว · รับใหม่ได้หลัง 05:00</p> :
            <button className="casino-chips-free pressable tk tk-btn" disabled={busy || !letIn(s, realAdmin)} onClick={freeChips}>รับฟรีวันนี้ {money(s.free_chips ?? 0)} Casino Coin</button>)}
          <p className="casino-chips-rate">แลก {money(rate)} Popoto coin = 1 Casino Coin · แลกกลับไม่ได้</p>
          <div className="casino-chips-packs" role="radiogroup" aria-label="จำนวนที่จะแลก">{CHIP_PACKS.map(k => <button key={k} role="radio" aria-checked={pack === k} className="pressable tk tk-slot" onClick={() => setPack(k)}>{k} ครั้ง<small>{money(k * s.price)}</small></button>)}</div>
          <button className="casino-chips-buy pressable tk tk-btn" disabled={busy || !letIn(s, realAdmin) || state.account.coins < pack * s.price * rate} onClick={() => buyChips(pack * s.price)}>
            {state.account.coins < pack * s.price * rate ? `Popoto coin ไม่พอ (ใช้ ${money(pack * s.price * rate)})` : `แลก ${money(pack * s.price)} Casino Coin · ${money(pack * s.price * rate)} Popoto coin`}</button>
          {/* popoto changed here with no week's limit (v305: the owner, "NPC ใน casino สามารถแลก popoto เป็น popoto coin หรือ casino coin ได้แบบ ไม่มี limit") */}
          {state.account.popoto_left !== undefined && <div className="casino-popoto">
            <p className="casino-chips-rate">แลก popoto · มี {money(state.account.popoto_left)} · {money(popotoN)} popoto = {money(popotoN * bankRate)} coin</p>
            <div className="casino-popoto-row"><input aria-label="จำนวน popoto ที่จะแลก" type="number" inputMode="numeric" min={1} max={Math.max(1, Math.min(1000, state.account.popoto_left))} value={popotoN} onChange={e => setPopotoN(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value) || 1))))} />
              <button className="pressable tk tk-slot" disabled={busy || !letIn(s, realAdmin) || popotoN > state.account.popoto_left} onClick={() => changePopoto('coins')}>เป็น Popoto coin</button>
              <button className="pressable tk tk-slot" disabled={busy || !letIn(s, realAdmin) || popotoN > state.account.popoto_left || Math.floor(popotoN * bankRate / rate) < 1} onClick={() => changePopoto('chips')}>เป็น Casino Coin</button></div>
          </div>}
          {chipNote && <p className="casino-chips-note" role="status">{chipNote}</p>}
          <button className="casino-chips-back pressable tk tk-slot" onClick={() => void select(selected)}>ไปเล่นที่เครื่อง {selected}</button>
        </div>}
        <p>{town?`แตะตู้หรือเก้าอี้เพื่อเข้าเล่น · ของรางวัลเข้ากล่องรางวัลในเว็บ · Gil เข้ากระเป๋าเงิน${chips === null ? ' · Coin เข้ากระเป๋า Cash Town' : ''}`:'แตะตู้หรือเก้าอี้เพื่อเข้าเล่น · ใบรับสิทธิ์อยู่ในแท็บ Event ของกระเป๋า'}</p>
        <div className="casino-actions"><button className="tk tk-slot" aria-pressed={sound} onClick={toggleSound}>{sound?'ปิดเสียงสล็อต':'เปิดเสียงสล็อต'}</button>{town?<button className="tk tk-slot" onClick={()=>{setPane('none');walker?.walkTo({x:CASINO_EXIT.tiles[0][0]+.5,y:CASINO_EXIT.tiles[0][1]+.5});}}>เดินออกไปในเมือง</button>:<Link className="tk tk-slot" href="/town?map=town">กลับหมู่บ้าน</Link>}</div>
        {realAdmin&&<><Link className="casino-aqua-link tk tk-btn" href={live?'/admin/aqua/casino-live':'/admin/aqua/casino'}>Aqua · ตั้งค่า {label}</Link>{!live&&<details className="casino-lab-tools"><summary>เครื่องมือห้องทดลอง</summary><div className="casino-actions"><button disabled={busy||ownRolling} onClick={()=>void credit(false)}>เติม 20,000 coin ทดลอง</button><button disabled={busy||ownRolling} onClick={()=>void credit(true)}>เริ่มกระเป๋าทดลองใหม่</button></div><label className="casino-forced">ผลทดสอบ<select aria-label="ผลสำหรับทดสอบ" value={force} disabled={s.mode==='pool'} onChange={e=>setForce(e.target.value)}><option value="">สุ่มจริง</option><option value="miss">พลาด</option>{state.prizes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></details>}
          {trial&&<label className="casino-forced">ผลที่จะออก (แอดมินทดสอบ)<select aria-label="ผลที่จะออก" value={force} disabled={s.mode==='pool'} onChange={e=>setForce(e.target.value)}><option value="">สุ่มจริง</option><option value="miss">พลาด</option>{state.prizes.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{PRIZE_LABEL[p.id]} · {p.name}</option>)}</select></label>}</>}
      </section><section className="casino-feed"><h2>เสียงจากหน้าเครื่อง</h2><div className="casino-cheers">{CHEERS.map(text => <button key={text} className="tk tk-slot" onClick={() => sendCheer(text)}>{text}</button>)}</div>
        <p className="casino-cheer-text" role="status">{cheer}</p><ol aria-label="ผลการปั่นในห้อง">{visible.slice(0, 14).map(p => <li key={p.id} className={p.prize ? 'casino-win' : 'casino-miss'}>
          <strong>{p.player_name}</strong> · เครื่อง {p.machine}<br />{p.prize ? wonWords(p.prize) : 'ยังไม่ได้รางวัล · คนข้าง ๆ ช่วยลุ้นรอบต่อไปได้'}
          <small>{new Date(p.reveal_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })} · {label}{p.forced ? ' · กำหนดผลทดสอบ' : ''}</small></li>)}</ol>
        {!visible.length && <p className="mt-4 text-sm">ผลทุกเครื่องจะปรากฏที่นี่หลังวงล้อหยุด</p>}</section>
        {/* what I won today: how many spins, what they cost, what came back, and each win with its faces and where it went */}
        <section className="casino-mine"><h2>ของฉัน</h2>{(() => { const m = myDay ?? mineOfRoom(state, clock); return <>
          <p className="casino-mine-when">{m.today ? 'วันนี้ ตั้งแต่ 05:00' : 'รอบล่าสุดในห้อง'}</p>
          <div className="casino-mine-stats"><p><b>{money(m.spins)}</b><span>ครั้งที่หมุน</span></p><p><b>{money(m.spent)}</b><span>Coin ที่ใช้ไป</span></p><p><b>+{money(m.back)}</b><span>Coin ที่ได้คืน</span></p></div>
          <h3>ได้อะไรไปบ้าง{m.wins ? ` · ${money(m.wins)} ครั้ง` : ''}</h3>
          {m.won.length ? <ol>{m.won.slice(0, 30).map(w => <li key={w.id}><span className="casino-mine-faces" aria-label={w.reels.join(', ')}>{w.reels.map((r, i) => <CasinoSymbol key={i} id={r} />)}</span>
            <span className="casino-mine-what"><strong>{wonWords(w.prize)}</strong>{w.prize.kind !== 'coin' && <small>{whereItGoes(w.prize, chips !== null)}</small>}</span>
            <small className="casino-mine-at">{new Date(w.at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })} · เครื่อง {w.machine}</small></li>)}</ol>
            : <p className="casino-mine-none">ยังไม่ได้รางวัล · หมุนต่อได้เลย</p>}
        </>; })()}</section></div>
      <section className="casino-bag tk tk-window" role="dialog" aria-label="กระเป๋า Event"><button className="casino-panel-close pressable tk tk-slot" aria-label="ปิดหน้าต่าง" onClick={() => setPane('none')}>ปิด</button><div className="casino-bag-head"><h2>กระเป๋า Event <span className="casino-test">{label}</span></h2><button onClick={() => { setHistory(!history); setPage(0); }}>{history ? 'ดูใบที่รอรับ' : 'ดูประวัติรับรางวัล'}</button></div>
        <p className="text-sm text-muted">ใบรับสิทธิ์แยกจากกระเป๋าของทั่วไป เก็บประวัติไว้หลังส่งมอบ</p><div className="casino-receipts">{state.receipts.slice(0, 20).map(r => <article className="casino-receipt" key={r.id}>
          <h3>{r.prize.name}</h3><p>{label} · {CLAIM_LABEL[r.status]}</p><code>{r.id}</code>{r.note && <p>{r.note}</p>}
          {r.status === 'pending' && <button disabled={busy || !!r.requested_at} onClick={() => void claim(r.id)}>{r.requested_at ? 'แจ้ง Aqua แล้ว' : (live?'ขอรับรางวัล':'ขอรับรางวัลทดลอง')}</button>}</article>)}</div>
        {!state.receipts.length && <p className="mt-4 text-sm">{history ? 'ยังไม่มีประวัติส่งมอบ' : 'เมื่อได้ Gil หรือของพิเศษ ใบรับสิทธิ์จะมาอยู่ตรงนี้'}</p>}
        <div className="casino-actions"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>ก่อนหน้า</button><span className="self-center text-xs">หน้า {page + 1}</span><button disabled={state.receipts.length <= 20} onClick={() => setPage(p => p + 1)}>ถัดไป</button></div>
      </section>
    </section></main>;
}
