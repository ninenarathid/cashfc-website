"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, type RefObject } from 'react';
import TownIcon, { type IconName } from '@/components/town/TownIcon';
import TownClock from '@/components/town/TownClock';
import { HUD_CSS, hudTierFor } from '@/components/town/TownHud';
import { SKIN_CSS } from '@/components/town/TownSkin';
import type { CasinoCameraControls } from '@/components/town/TownCasinoMap';

const button = 'pressable tk tk-slot town-hud-button grid shrink-0 place-items-center text-read';

/** The same skin, icons, materials and control positions as the village HUD. */
export default function CasinoTownHud({ coins, remaining, allowance, people, connected, live, admin, pane, onPane, onChat, sound, onSound, camera }: {
  coins: number; remaining: number; allowance: number; people: number; connected: boolean;
  live: boolean; admin: boolean; pane: string;
  onPane: (pane: 'none' | 'slots' | 'bag' | 'feed') => void; onChat: (text: string) => void;
  sound: boolean; onSound: () => void; camera: RefObject<CasinoCameraControls | null>;
}) {
  const [menu, setMenu] = useState(false), [draft, setDraft] = useState('');
  const menuBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]');
      if (e.key.toLowerCase() === 'i' && !typing) { e.preventDefault(); setMenu(false); onPane('bag'); return; }
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      setMenu(false); onPane('none');
    };
    const outside = (e: PointerEvent) => { if (!menuBox.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener('keydown', close); window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', outside); };
  }, [onPane]);
  const tile = (name: string, icon: IconName, action: () => void, pressed?: boolean) => (
    <span className="flex flex-col items-center gap-1 text-center font-data text-meta text-ink">
      <button type="button" className={button} aria-label={name} aria-pressed={pressed} onClick={action}><TownIcon name={icon} size={22} /></button><span aria-hidden>{name}</span>
    </span>
  );
  return <div className="casino-hud" data-town-hud-tier={hudTierFor(coins).id}>
    <style href="town-skin" precedence="medium">{SKIN_CSS}</style>
    <style href="town-hud" precedence="medium">{HUD_CSS}</style>
    <header className="casino-top town-hud-top pointer-events-none absolute z-[35] flex items-start justify-between gap-2">
      <div className="tk tk-plate town-hud-surface town-hud-overview flex min-w-0 flex-col items-stretch sm:flex-row sm:items-center">
        <div className="town-hud-status pointer-events-auto flex h-8 items-center gap-3 px-2.5" role="status" aria-label={`เหรียญ ${coins} · เหลือ ${remaining} ครั้ง`}>
          <span className="flex min-w-0 flex-1 items-center gap-1.5" title={`สิทธิ์เล่น ${remaining}/${allowance}`}>
            <TownIcon name="dice" size={15} /><span className="tk-bar min-w-0 flex-1"><i style={{ width: `${Math.max(0, Math.min(100, remaining / allowance * 100))}%` }} /></span>
            <span className="font-data text-meta font-semibold tabular-nums">{remaining}</span>
          </span>
          <span className="casino-credit flex items-center gap-1.5" title={`${live ? 'Popoto coin' : 'coin ทดลอง'} ${coins.toLocaleString('th-TH')}`}>
            <TownIcon name="coin" size={14} /><strong data-coins className="font-data text-meta font-semibold leading-none tabular-nums text-gold">{coins.toLocaleString('th-TH')}</strong>
          </span>
        </div>
        <div className="town-hud-place pointer-events-auto flex h-7 min-w-0 items-center gap-2 px-2.5">
          <span className="flex items-center gap-1.5" title={connected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ'}><i className={`size-1.5 rounded-full ${connected ? 'bg-jade' : 'bg-gold'}`} /><TownIcon name="people" size={15} /><span className="font-data text-meta font-semibold">{people}</span><span className="sr-only"> คนในห้อง</span></span>
          <span aria-hidden className="hidden h-3 w-px bg-current opacity-30 sm:block" /><TownClock th compact bare />
        </div>
      </div>
      <div ref={menuBox} className="relative shrink-0 [&>*]:pointer-events-auto">
        <button type="button" data-town-menu className={button} aria-label="เมนู" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <span aria-hidden className="flex h-4 w-5 flex-col justify-between">{[0, 1, 2].map(i => <i key={i} className="block h-1 bg-[#f5dab7] shadow-[0_2px_0_#1a0e06]" />)}</span><kbd aria-hidden className="tk-key town-hud-key absolute -bottom-1 -left-1 hidden sm:inline-grid">Esc</kbd>
        </button>
        <div hidden={!menu} data-town-menu-panel className="tk tk-window town-hud-surface town-hud-menu absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)]">
          <p className="town-hud-menu-heading mb-3 font-display text-title font-semibold">Cash Town <span className="font-data text-label font-normal text-muted">{live ? 'Casino' : 'Casino TEST'}</span></p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {tile('เสียง', sound ? 'music' : 'musicOff', onSound, sound)}
            {tile('เต็มจอ', 'fullscreen', () => { const stage = document.querySelector<HTMLElement>('.casino-town-room'); if (document.fullscreenElement) void document.exitFullscreen(); else void stage?.requestFullscreen(); })}
            {tile('ผลในห้อง', 'history', () => { setMenu(false); onPane('feed'); })}
            {tile('ขยาย', 'zoomIn', () => camera.current?.zoom(1.25))}
            {tile('ย่อ', 'zoomOut', () => camera.current?.zoom(1 / 1.25))}
            {tile('หาตัวฉัน', 'recenter', () => { camera.current?.recenter(); setMenu(false); })}
          </div>
          <div className="casino-menu-links mt-4 grid gap-2">
            {admin && <Link target="_blank" className="pressable tk tk-btn-wood town-hud-surface flex min-h-11 items-center justify-center px-4 font-display text-ui" href={live ? '/admin/aqua/casino-live' : '/admin/aqua/casino'}>Aqua · ตั้งค่า {live ? 'LIVE' : 'TEST'}</Link>}
            <Link href="/town" className="pressable tk tk-btn-wood town-hud-surface flex min-h-11 items-center justify-center px-4 font-display text-ui">กลับ Cash Town</Link>
          </div>
        </div>
      </div>
    </header>
    <div className="casino-place-label tk tk-plate font-data text-label text-muted">Cash Town · Popoto Casino{!live && <span className="text-gold"> · TEST</span>}</div>
    <footer className="casino-foot town-foot pointer-events-none absolute flex items-end justify-between gap-2">
      <div className="casino-chat tk tk-plate town-hud-surface town-hud-cluster town-hud-chat-row pointer-events-auto flex items-center gap-1">
        <button type="button" className={`${button} town-hud-labelled casino-chat-toggle`} aria-label="ผลและเสียงเชียร์" aria-expanded={pane === 'feed'} onClick={() => onPane(pane === 'feed' ? 'none' : 'feed')}><TownIcon name="chat" size={22} /><span className="town-hud-label">แชท</span></button>
        <form className="flex min-w-0 flex-1 items-center gap-1.5" onSubmit={e => { e.preventDefault(); const text = draft.trim(); if (text) { onChat(text); setDraft(''); } }}>
          <span className="tk tk-plate town-hud-surface town-hud-input flex h-11 min-w-0 flex-1 items-center px-3"><input aria-label="พูดคุยในห้อง Casino" placeholder="พิมพ์คุยกับทุกคน… (Enter)" maxLength={200} value={draft} onChange={e => setDraft(e.target.value)} className="h-full min-w-0 w-full bg-transparent text-read text-ink outline-none placeholder:text-muted" /></span>
          <button type="submit" className="pressable tk tk-btn town-hud-send h-11 shrink-0 px-3 font-display text-ui font-medium">ส่ง</button>
        </form>
      </div>
      <div className="tk tk-plate town-hud-surface town-hud-cluster pointer-events-auto flex items-end gap-1">
        <button type="button" aria-label="กระเป๋า Event" title="กระเป๋า Event (I)" aria-expanded={pane === 'bag'} onClick={() => onPane(pane === 'bag' ? 'none' : 'bag')} className={`${button} town-hud-bag town-hud-labelled`}><TownIcon name="bag" size={23} /><span className="town-hud-label font-semibold">Event</span><kbd aria-hidden className="tk-key town-hud-key absolute -right-1 -top-1 hidden sm:inline-grid">I</kbd></button>
      </div>
    </footer>
  </div>;
}
