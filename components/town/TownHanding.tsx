"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  HANDING, at, inMouth, landOf, landsAt, otherSeed, slide, standOf, startHolding, startTipping, thrownAt, tiltFor, tip, wander,
  type Holding, type Tipping, type Told, type Track,
} from "@/lib/town/handing";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";
import { GameFrame, GameScene, PixelGround, STAGE, useFrames, useGameHandle } from "./TownGame";

/** What this page has heard of the other's hand so far: kept by whoever hears it (components/town/TownLine), read here every frame. */
export interface OtherHand {
  /** Where their thing was, moment by moment: where the water was aimed (whoever throws), or where the bucket stood (whoever takes). */
  track: Track;
  /** Whoever throws: the bucket's tilt, and the aim it is thrown with, once told that it is fixed. */
  tilt: Track; thrown: number | null;
  /** Whoever takes: whether it came down into the bucket, once told. */
  verdict: boolean | null;
}
export const newOtherHand = (): OtherHand => ({ track: [], tilt: [], thrown: null, verdict: null });

/** How a handing-over went: whether the water came down into the bucket, and how long it took from its first moment. */
export interface HandingResult { won: boolean; secs: number }

// The picture, in its own pixels: a canvas this size, shown with its pixels kept square.
const W = 180, H = 120, GROUND = 109;
/** Where along the picture a place on the ground is (0: at the thrower's feet; 1: as far as the other's bucket may stand). */
const X0 = 62, XW = 86, xOf = (v: number) => X0 + v * XW;
/** The middle of the bucket that is thrown from, how big both are drawn, how far a full tilt turns it (radians), and how high the water's arc rises. */
const BX = 30, BY = 42, BIG = 32, TURN = 1.75, ARC = 16;
/** How much time gone by between two frames is still played through, in seconds. */
const LATE = 3;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Water handed on, on the screen (lib/town/handing; the owner, 2026-10-06: "minigame ตอนส่งน้ำ เป็นแบบเล่นพร้อมกัน", then
 * "ต้องทำให้ minigame จบเร็วที่สุด" and "เป็นการเน้น reaction เร็วๆ"): one picture for both, the bucket that is thrown from on
 * the left and the bucket held under on the right. **Each page moves its own bucket and is told the other's.**
 *
 * - **Whoever throws** moves a finger or the mouse up and down over the picture (or the arrow keys): the bucket tips
 *   as far as that, and a mark on the ground shows where the water is aimed. Their board is up from the button,
 *   before the other has even answered (`time` null: no moment goes by yet), so the hand is at it at once.
 * - Under the picture a strip shows the three beats and where in them the two are: the aim, the swing (the aim is
 *   fixed), the flight.
 * - As the water flies, **a shadow on the ground shows where it comes down**, which is never just where it was
 *   aimed. **Whoever takes** moves theirs from side to side: the bucket goes there.
 * - Tired hands shake and are slow: only the bucket of whoever has no stamina.
 *
 * Whoever takes the water says whether it came down into the bucket, the moment it lands; whoever threw goes by that
 * word (and by its own reckoning only if none has come a good while after). The water is handed on at that moment
 * (`onDone`); the board stays a blink longer to say how it went (`onClose`).
 */
export default function TownHanding({ th, role, m, time, seed, tired, names, icons, other, tell, onDone, onClose, onCancel, sfx, scene = null }: {
  th: boolean;
  /** Which bucket is mine: the one thrown from (`from`), or the one held under (`to`). */
  role: "from" | "to";
  /** Which handing-over this is (lib/town/handing's `Told.m`). */
  m: string;
  /** Seconds from the start, by the count the two began together; null while the other has not answered yet (only whoever asks is shown the board that early). */
  time: (() => number) | null;
  seed: number;
  tired: { from: boolean; to: boolean };
  names: { from: string; to: string };
  /** The two buckets' pictures: the one thrown from with water in it and without, the one held under without and with. */
  icons: { from: IconName; fromEmpty: IconName; to: IconName; toFull: IconName };
  other: MutableRefObject<OtherHand>;
  tell: (told: Told) => void;
  /** How it went, the moment that is settled; and, a blink later, that the board has said so and may go. */
  onDone: (result: HandingResult) => void;
  onClose: () => void;
  onCancel: () => void;
  sfx: FishSfx | null;
  scene?: Sprite | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null), cursor = useRef<HTMLSpanElement>(null);
  const sheet = useRef<HTMLImageElement | null>(null);
  useEffect(() => { const img = new Image(); img.src = ICON_ATLAS.image; sheet.current = img; }, []);
  const place = standOf(seed);
  const pour = useRef<Tipping | null>(null), held = useRef<Holding | null>(null);
  /** Where my hand wants my bucket: its tilt, or its place along the ground. */
  const aim = useRef(role === "from" ? 0 : place);
  /** An arrow key held (−1, 0, 1); and, for a script, a hand that plays by itself. */
  const key = useRef(0), auto = useRef(false);
  const told = useRef(-9), fixed = useRef(0), flew = useRef(false);
  const over = useRef<HandingResult | null>(null);
  /** (for scripts: how many frames this board has drawn, and how many times it has told the other page of its hand) */
  const seen = useRef({ frames: 0, told: 0 });
  const say = useCallback((word: Told) => { seen.current.told++; tell(word); }, [tell]);
  const [phase, setPhase] = useState<"wait" | "aim" | "swing" | "flight" | "won" | "lost">(time ? "aim" : "wait");

  const finish = useCallback((won: boolean, secs: number) => {
    if (over.current) return;
    const result = { won, secs: Math.round(Math.max(0, secs) * 10) / 10 };
    over.current = result;
    setPhase(won ? "won" : "lost");
    sfx?.wake();
    sfx?.work(won ? "dip" : "knock", 0.8);
    onDone(result);
    window.setTimeout(onClose, 420);
  }, [onDone, onClose, sfx]);

  useFrames((dt) => {
    const o = other.current, T = time ? time() : -HANDING.count, mine = role === "from";
    seen.current.frames++;
    if (!over.current) {
      const now = !time ? "wait" : T < HANDING.aim ? "aim" : T < thrownAt() ? "swing" : "flight";
      if (now !== phase) setPhase(now);
      if (mine) {
        let p = pour.current ?? startTipping(tired.from, seed);
        if (key.current) aim.current = clamp(aim.current + key.current * 0.9 * dt, -HANDING.spare, 1 + HANDING.spare);
        const steady = (t: number) => tiltFor(at(o.track, t) || place) - (p.tired ? HANDING.tired.sway.tilt * wander(p.seed, t - HANDING.aim).sway : 0);
        if (!time) {
          // asked, and not answered yet: the hand may tip the bucket already, and no moment goes by
          if (auto.current) aim.current = steady(-HANDING.count);
          p = tip({ ...p, t: -HANDING.count - dt }, aim.current, dt);
        } else {
          // (a page that draws seldom still plays every moment through, the hand where it was; a tab that slept is only caught up with)
          if (T - p.t > LATE) p = { ...p, t: T - LATE };
          for (let due = T - p.t; due > 1e-6;) {
            const h = Math.min(due, 1 / 120);
            due -= h;
            if (auto.current) aim.current = steady(p.t + h);
            p = tip(p, aim.current, h);
          }
          // told a few times a second while it may still be aimed; and, the moment it is fixed, the aim it is thrown
          // with (twice: it is the one word that has to come)
          if (p.thrown === null) { if (T - told.current >= 0.1) { told.current = T; say({ k: "g", m, t: r3(p.t), q: r3(p.aim), a: r3(p.tilt) }); } }
          else if (fixed.current < 2 && (!fixed.current || T - told.current >= 0.08)) { fixed.current++; told.current = T; say({ k: "g", m, t: r3(HANDING.aim), q: r3(p.thrown), a: r3(p.tilt), e: true }); }
          // the other's word, the moment it comes; my own reckoning when none has come a good while after the water came down
          if (o.verdict !== null) finish(o.verdict, T);
          else if (T >= landsAt() + 1) finish(inMouth(landOf(p.thrown ?? 0, seed), at(o.track, landsAt()) || place), T);
        }
        pour.current = p;
      } else {
        let h = held.current ?? { ...startHolding(tired.to, otherSeed(seed), place), t: Math.min(T, 0) };
        if (T - h.t > LATE) h = { ...h, t: T - LATE };
        if (key.current) aim.current = clamp(aim.current + key.current * 0.9 * dt, HANDING.near - HANDING.spare, 1 + HANDING.spare);
        // where it comes down: by the aim it was thrown with, as told fixed, or as last heard while that word is on its way
        const landing = landOf(o.thrown ?? at(o.track, HANDING.aim), seed);
        for (let due = Math.min(T, landsAt()) - h.t; due > 1e-6;) {
          const step = Math.min(due, 1 / 120);
          due -= step;
          if (auto.current) aim.current = (h.t + step >= thrownAt() && landing > 0 ? landing : place) - (h.tired ? HANDING.tired.sway.bucket * wander(h.seed, h.t + step - landsAt()).sway : 0);
          h = slide(h, aim.current, step);
        }
        held.current = h;
        if (T - told.current >= 0.1) { told.current = T; say({ k: "t", m, t: r3(h.t), b: r3(h.x) }); }
        // it lands: in the bucket's mouth, or beside it; said at once
        if (T >= landsAt()) {
          const caught = inMouth(landing, h.x);
          say({ k: "end", m, c: caught });
          finish(caught, T);
        }
      }
      if (time && T >= thrownAt() && !flew.current) { flew.current = true; sfx?.wake(); sfx?.work("pour", 0.7); }
    }

    // ── the picture ──
    const p = pour.current, h = held.current;
    const bucket = mine ? at(o.track, T) || place : h?.x ?? place;
    const aimed = mine ? p?.aim ?? 0 : at(o.track, Math.min(T, HANDING.aim));
    const thrown = mine ? p?.thrown ?? null : T >= HANDING.aim ? o.thrown ?? at(o.track, HANDING.aim) : null;
    const landing = thrown !== null ? landOf(thrown, seed) : 0;
    if (cursor.current) cursor.current.style.left = `${clamp(T / landsAt(), 0, 1) * 100}%`;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    // where the other's bucket may stand: a worn line along the ground
    ctx.fillStyle = "rgba(42, 25, 13, 0.5)";
    ctx.fillRect(Math.round(xOf(HANDING.near)) - 12, GROUND + 2, Math.round(XW * (1 - HANDING.near)) + 24, 1);
    // where the water is aimed, while it may still be aimed and through the swing: a little mark on the ground
    if (aimed > 0 && T < thrownAt()) {
      const x = Math.round(xOf(aimed));
      ctx.fillStyle = T < HANDING.aim ? "#ffe19a" : "#ffffff";
      ctx.fillRect(x, GROUND + 4, 1, 1); ctx.fillRect(x - 1, GROUND + 5, 3, 1); ctx.fillRect(x - 2, GROUND + 6, 5, 1);
    }
    // the bucket that is thrown from, turned about its middle: as the hand has it, rocked back through the swing, flung forward at the throw
    const base = mine ? p?.tilt ?? 0 : at(o.tilt, T);
    const tilt = T < HANDING.aim ? base : T < thrownAt() ? base - 0.2 * Math.sin((Math.PI * (T - HANDING.aim)) / HANDING.swing) : Math.min(1, base + 0.45 * Math.min(1, (T - thrownAt()) / 0.1));
    const lipAt = (v: number) => { const a = v * TURN, c = Math.cos(a), s = Math.sin(a); return [BX + 13 * c + 12 * s, BY + 13 * s - 12 * c]; };
    ctx.save();
    ctx.translate(BX, BY);
    ctx.rotate(Math.max(0, tilt) * TURN);
    drawIcon(ctx, sheet.current, T < thrownAt() ? icons.from : icons.fromEmpty, 0, 0, BIG);
    ctx.restore();
    const mouth = GROUND - 24, end = Math.round(xOf(landing));
    if (landing > 0 && T >= thrownAt()) {
      const s = clamp((T - thrownAt()) / HANDING.flight, 0, 1), hit = !!over.current && over.current.won;
      if (s < 1) {
        // where it comes down: a shadow on the ground, growing as the water nears it. This is what a quick hand answers.
        const half = 6 + Math.round(4 * s), bob = Math.floor(T * 12) % 2, top = mouth - 20 + bob * 2;
        ctx.fillStyle = "rgba(16, 36, 56, 0.6)";
        ctx.fillRect(end - half, GROUND + 3, half * 2 + 1, 3);
        ctx.fillStyle = "#bfe6ff";
        ctx.fillRect(end - half, GROUND + 2, half * 2 + 1, 1); ctx.fillRect(end - half, GROUND + 6, half * 2 + 1, 1);
        // (and an arrow over it, so that it is seen at once)
        ctx.fillStyle = "#2a190d";
        ctx.fillRect(end - 2, top - 1, 5, 8); ctx.fillRect(end - 6, top + 6, 13, 3); ctx.fillRect(end - 4, top + 9, 9, 2); ctx.fillRect(end - 2, top + 11, 5, 2);
        ctx.fillStyle = "#ffe19a";
        ctx.fillRect(end - 1, top, 3, 7); ctx.fillRect(end - 5, top + 7, 11, 1); ctx.fillRect(end - 4, top + 8, 9, 1); ctx.fillRect(end - 3, top + 9, 7, 1); ctx.fillRect(end - 2, top + 10, 5, 1); ctx.fillRect(end - 1, top + 11, 3, 1);
        // the water in the air: a slug of it on its arc from the lip, with drops strung out behind
        const [lx, ly] = lipAt(Math.min(1, base + 0.2));
        for (let k = 0; k < 11; k++) {
          const u = s - k * 0.028;
          if (u < 0) break;
          const x = lx + (end - lx) * u, y = ly + (mouth - ly) * u - ARC * 4 * u * (1 - u), big = k < 3 ? 4 : k < 7 ? 3 : 2;
          ctx.fillStyle = "#4fa3cf";
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, big, big);
          ctx.fillStyle = k % 3 ? "#8fd2ee" : "#e6f6ff";
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, big - 1, big - 1);
        }
      } else if (!hit) {
        // beside the bucket: a puddle where it came down
        const f = Math.floor(T * 20) % 3;
        ctx.fillStyle = "#48a0c8";
        ctx.fillRect(end - 7, GROUND + 3, 15, 2);
        ctx.fillStyle = "#8fd2ee";
        for (let i = 0; i < 4; i++) ctx.fillRect(end - 6 + i * 4, GROUND - 2 - ((i + f) % 3) * 2, 2, 2);
      }
    }
    // the bucket held under; with the water in it, drops leap from its mouth
    const won = !!over.current && over.current.won, bx = Math.round(xOf(bucket));
    drawIcon(ctx, sheet.current, won ? icons.toFull : icons.to, bx, GROUND - 14, BIG - 2);
    if (won) { const f = Math.floor(T * 24) % 4; ctx.fillStyle = "#e6f6ff"; for (let i = 0; i < 5; i++) ctx.fillRect(bx - 8 + i * 4, mouth - 3 - ((i * 2 + f) % 5), 2, 2); }
  });

  // Where the finger or the mouse is over the picture is where my hand wants my bucket: up and down for the tilt, side to side for the place.
  const point = useCallback((e: { clientX: number; clientY: number }) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    auto.current = false;
    aim.current = role === "from"
      ? -HANDING.spare + (1 - (e.clientY - box.top) / box.height) * (1 + 2 * HANDING.spare)
      : (((e.clientX - box.left) / box.width) * W - X0) / XW;
  }, [role]);

  // A mouse is followed wherever it is on the page, not only over the picture: the picture is small, and a hand that
  // strays off its edge has not let go of the bucket. (A finger is followed from where it came down: the picture takes it.)
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === "mouse") point(e); };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [point]);

  // The arrow keys move my bucket while they are held; Escape gives it up. Heard before the town hears them.
  useEffect(() => {
    const way = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (role === "from") return k === "arrowup" || k === "w" ? 1 : k === "arrowdown" || k === "s" ? -1 : 0;
      return k === "arrowright" || k === "d" ? 1 : k === "arrowleft" || k === "a" ? -1 : 0;
    };
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      const w = way(e);
      if (!w) return;
      e.preventDefault();
      e.stopPropagation();
      auto.current = false;
      key.current = w;
    };
    const up = (e: KeyboardEvent) => { if (way(e) === key.current) key.current = 0; };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [role, onCancel]);

  // (for scripts in `next dev`: what stands where, a hand put somewhere, and a hand that plays by itself)
  const setAim = useCallback((v: number) => { auto.current = false; aim.current = v; }, []);
  const setAuto = useCallback((on = true) => { auto.current = on; }, []);
  useGameHandle({
    kind: "handing", role,
    state: () => {
      const o = other.current, p = pour.current, h = held.current, T = time ? time() : -HANDING.count;
      const thrown = p ? p.thrown : o.thrown ?? (T >= HANDING.aim && o.track.length ? at(o.track, HANDING.aim) : null);
      return {
        t: T, waiting: !time, tired, place, tilt: p?.tilt ?? at(o.tilt, T), aim: p?.aim ?? at(o.track, T), thrown, landing: thrown !== null ? landOf(thrown, seed) : null,
        x: h?.x ?? (at(o.track, T) || place), heard: o.track.length, over: over.current, ...seen.current,
      };
    },
    aim: setAim, auto: setAuto,
  }, [role, time, tired, place, seed, setAim, setAuto]);

  const mine = role === "from", [b1, b2] = [(HANDING.aim / landsAt()) * 100, (thrownAt() / landsAt()) * 100];
  const tag = (name: string, me: boolean, weary: boolean, side: string) => (
    <span className={`pointer-events-none absolute top-1 ${side} flex max-w-[46%] items-center gap-1 rounded-sm bg-[#2a190d]/80 px-1.5 py-0.5 text-label ${me ? "font-semibold text-[#ffe19a]" : "text-[#e9cfa4]"}`}>
      <span className="min-w-0 truncate">{me ? (th ? "คุณ" : "You") : name}</span>
      {weary && <span className="shrink-0 text-[#ffb09c]" data-handing-tired>{th ? "หมดแรง" : "tired"}</span>}
    </span>
  );
  return (
    <GameFrame th={th} title={mine ? (th ? "สาดน้ำส่งต่อ" : "Throw it over") : th ? "รับน้ำที่สาดมา" : "Catch the water"} need={0} hits={0} misses={0} most={0} onCancel={onCancel}
               word={mine ? (th ? "ลากขึ้น–ลง: เล็งให้ถึงถัง" : "Up and down: aim it at the bucket") : th ? "น้ำลอยมาแล้วรีบลากถังไปรับ" : "When it flies, get the bucket under it"}>
      <div ref={stage} className={`${STAGE} aspect-[3/2] w-full touch-none ${mine ? "cursor-ns-resize" : "cursor-ew-resize"}`} data-look="handing" data-role={role} data-phase={phase}
           onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); point(e); }} onPointerMove={point}>
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="soil" w={90} h={10} className="absolute inset-x-0 bottom-0 h-[16.6%] w-full border-t-[3px] border-[#2a190d]" />}
        <canvas ref={canvas} width={W} height={H} aria-hidden className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]" />
        {tag(names.from, mine, tired.from, "left-1")}
        {tag(names.to, !mine, tired.to, "right-1")}
        {(phase === "wait" || phase === "won" || phase === "lost") && (
          <p className={`pointer-events-none absolute inset-x-0 top-[34%] px-2 text-center font-display font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d] ${phase === "wait" ? "text-read" : "text-title"}`} aria-live="polite" data-handing-word={phase}>
            {phase === "wait" ? (th ? `กำลังเรียก ${names.to || "เพื่อน"}…` : `Calling ${names.to || "them"}…`) : phase === "won" ? (th ? "รับได้! ส่งน้ำถึงมือ" : "Caught! Handed over") : th ? "น้ำหก… ลองอีกที" : "Spilt… try again"}
          </p>
        )}
      </div>
      {/* the three beats, and where in them the two are: the aim, the swing (the aim is fixed), the water in the air */}
      <div aria-hidden className="relative mt-2 h-3 border-[3px] border-[#2a190d] bg-[#1c2c38]" data-handing-beats>
        <span className="absolute inset-y-0 left-0 bg-[#c9a04a]" style={{ width: `${b1}%` }} />
        <span className="absolute inset-y-0 bg-[#e9573f]" style={{ left: `${b1}%`, width: `${b2 - b1}%` }} />
        <span className="absolute inset-y-0 right-0 bg-[#3f96c2]" style={{ left: `${b2}%` }} />
        <span ref={cursor} className="absolute inset-y-[-4px] -ml-[2px] w-[4px] bg-[#fff6e3] shadow-[0_0_0_1px_#2a190d]" style={{ left: "0%" }} />
      </div>
    </GameFrame>
  );
}
