"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Play } from "@/lib/town/animals";
import { SPECIES, type Animal } from "@/lib/town/animals";
import {
  EGGS, MILK, SWIRL, SHEAR, basketWidth, boxAt, caughtBy, chewAt, eggsPlay, eggsStart, fallMs, handleOf, milkPlay, milkPress, milkStart, milkTick, milkWindow,
  shearMove, shearNear, shearPlay, shearStart, type Ease, type Egg, type MilkState, type ShearState,
} from "@/lib/town/animal-games";
import type { SceneryKit } from "@/lib/town/scenery";
import { GAME_ART } from "@/lib/town/pasture-art";
import { drawAnimal, shade } from "./pasture-draw";

/*
 * The pasture's three games (docs/plans/animals/README.md "Mini-games"), each its own play and its own look, on the
 * foot's board: milking in the barn's warm stall (two pump handles to the cow's chewing beat, a pressure needle), the
 * coop's eggs (nest boxes in a row, eggs tapped out in the order one likes, a padded basket slid under them), and
 * shearing in the pen (the fleece's swirl traced with the shears). Their rules are lib/town/animal-games; each ends
 * with its Play, which the keeper's `collect` turns into what is given. The scenes are drawn here by hand until the
 * art piece's pictures come (// ART:, lib/town/pasture-art's GAME_ART names).
 */

export interface GameProps { animal: Animal; ease: Ease; th: boolean; kit: SceneryKit | null; reduced: boolean; onDone: (play: Play, cracked?: number) => void; onQuit: () => void }
const W = 320, H = 240;
/** A board's canvas, sized to its box, drawn every frame by `paint` in the board's own 320 by 240 units. */
function useBoard(paint: (ctx: CanvasRenderingContext2D, now: number) => void, running: boolean) {
  const ref = useRef<HTMLCanvasElement>(null), paintRef = useRef(paint);
  paintRef.current = paint;
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const cv = ref.current;
      if (cv) {
        const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const ctx = cv.getContext("2d");
        if (ctx) { ctx.setTransform(w / W, 0, 0, h / H, 0, 0); ctx.imageSmoothingEnabled = false; paintRef.current(ctx, performance.now()); }
      }
      if (running) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return ref;
}
/** A board's scene: the middle of its picture laid over the whole board, as tall as the board (its sides beyond the board's 4:3 fall away); false while the pasture's sheet has none. */
function scene(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, name: string): boolean {
  if (!kit?.has(name)) return false;
  kit.drawProp(ctx, name, W / 2, H, H / kit.sizeOf(name)[1], 1);
  return true;
}
/** Board units to one pixel of a game's piece (drawn on the icon template's grid, a little coarser than its scene). */
const P = 2.2;
/** A piece of a board standing on (x, y), at k board units to one of its pixels; false while the sheet has none. */
function piece(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, name: string, x: number, y: number, k = P, mirror = false): boolean {
  if (!kit?.has(name)) return false;
  kit.drawProp(ctx, name, x, y, k, 1, 0, mirror);
  return true;
}
/** A piece turned by a about its own middle, which stands at (x, y): the gauge's needle on its hub. */
function turned(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, name: string, x: number, y: number, a: number, k = P): boolean {
  if (!kit?.has(name)) return false;
  const [w, h] = kit.sizeOf(name), [ax, ay] = kit.anchorOf(name);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  kit.drawProp(ctx, name, (ax - w / 2) * k, (ay - h / 2) * k, k, 1);
  ctx.restore();
  return true;
}
/** Where a pointer is on a board, in its own units. */
const boardPoint = (cv: HTMLCanvasElement, e: { clientX: number; clientY: number }) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };

function Shell({ title, th, children, onQuit, hint, tired, harp, data }: { title: string; th: boolean; children: React.ReactNode; onQuit: () => void; hint: string; tired: boolean; harp: boolean; data: string }) {
  return (
    <section aria-labelledby="town-game-h" data-town-game={data} className="pointer-events-auto flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <h2 id="town-game-h" className="min-w-0 flex-1 truncate font-display text-title font-semibold text-ink">{title}</h2>
        {tired && <span className="rounded-full bg-[#ff7a93]/15 px-2 py-0.5 text-meta text-[#ff9fb0]" data-tired>{th ? "เหนื่อย: ช่องแคบลง" : "Tired: narrower"}</span>}
        {harp && <span className="rounded-full bg-jade/15 px-2 py-0.5 text-meta text-jade" data-harp>{th ? "เสียงพิณ ×2" : "Harp ×2"}</span>}
        <button type="button" onClick={onQuit} className="pressable min-h-11 rounded-full border border-line-strong px-3 text-ui text-ink" data-game-quit>{th ? "ไว้ทีหลัง" : "Later"}</button>
      </div>
      <p className="px-3 pt-1.5 text-meta leading-snug text-muted">{hint}</p>
      {children}
    </section>
  );
}

/* ── milking ── */
export function MilkGame({ animal, ease, th, kit, reduced, onDone, onQuit }: GameProps) {
  const [state, setState] = useState<"ready" | "on" | "done">("ready");
  const s = useRef<MilkState | null>(null), last = useRef<{ side: "L" | "R"; said: string; at: number } | null>(null);
  const [, setTick] = useState(0);
  const press = useCallback((side: "L" | "R") => {
    const st = s.current;
    if (!st || state !== "on") return;
    const said = milkPress(st, side, performance.now(), ease);
    last.current = { side, said, at: performance.now() };
    setTick((n) => n + 1);
  }, [ease, state]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.repeat) return; if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); press("L"); } if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); press("R"); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [press]);
  const ref = useBoard((ctx, now) => {
    const st = s.current;
    if (st && state === "on" && milkTick(st, now, ease)) { setState("done"); onDone(milkPlay(st, now)); }
    // the barn's stall (its scene: plank walls, a lantern, a hay rack, straw); the stand-in's boards while there is none
    const lit = scene(ctx, kit, GAME_ART.milk.scene);
    if (!lit) {
      ctx.fillStyle = "#3a2414"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#47301c" : "#3f2a18"; ctx.fillRect(i * 40, 0, 40, 150); }
      ctx.fillStyle = "#c9a35a"; ctx.fillRect(0, 150, W, 90);
      ctx.fillStyle = "#b08a44"; for (let i = 0; i < 40; i++) ctx.fillRect((i * 37) % W, 156 + ((i * 13) % 70), 10, 2);
    }
    const shifted = !!st && now < st.shiftedUntil;
    const chewing = !!st && Math.abs(((now - chewAt(st, 0)) % MILK.beat + MILK.beat) % MILK.beat) < 160;
    drawAnimal(ctx, kit, { species: "cow", breed: animal.breed, stage: "adult", pose: chewing ? "eat" : "idle", right: false }, { x: 172 + (shifted ? (reduced ? 6 : Math.sin(now / 40) * 6) : 0), y: lit ? 196 : 168 }, 2.3, 1, now, reduced);
    // the milking machine, its two pump levers (the one pumped last is down a moment) and the pail with its milk
    const level = st ? st.hits / MILK.beats : 0, l0 = last.current, pumped = (side: "L" | "R") => !!l0 && l0.side === side && now - l0.at < 200;
    if (piece(ctx, kit, GAME_ART.milk.machine, 112, 222)) {
      piece(ctx, kit, pumped("L") ? GAME_ART.milk.handleDown : GAME_ART.milk.handleUp, 86, 224, P, true);
      piece(ctx, kit, pumped("R") ? GAME_ART.milk.handleDown : GAME_ART.milk.handleUp, 138, 224);
      piece(ctx, kit, GAME_ART.milk.pail[level >= 0.95 ? 2 : level >= 0.35 ? 1 : 0], 178, 226);
      if (l0 && l0.said === "hit" && now - l0.at < 320) piece(ctx, kit, GAME_ART.milk.splash, 178, 186 - ((now - l0.at) / 320) * 8, 1.6);
    } else {
      ctx.fillStyle = "#b9c2cc"; ctx.fillRect(132, 176, 50, 46); ctx.fillStyle = "#e8eef4"; ctx.fillRect(136, 180 + 38 * (1 - level), 42, 38 * level + 2);
      ctx.strokeStyle = "#6a7480"; ctx.lineWidth = 2; ctx.strokeRect(132, 176, 50, 46);
    }
    // the beat line: the chews to come, sliding to the mark
    if (st) {
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(10, 10, 300, 26);
      ctx.fillStyle = "#f0c060"; ctx.fillRect(60, 8, 3, 30);
      const w = milkWindow(ease) / MILK.beat * 70;
      ctx.fillStyle = "rgba(240,192,96,0.25)"; ctx.fillRect(61.5 - w, 12, w * 2, 22);
      for (let n = 0; n < MILK.beats; n++) {
        if (st.pressed.has(n)) continue;
        const x = 61.5 + ((chewAt(st, n) - now) / MILK.beat) * 70;
        if (x < 0 || x > 310) continue;
        ctx.fillStyle = handleOf(n) === "L" ? "#7ad0f0" : "#ff9fb0"; ctx.beginPath(); ctx.arc(x, 23, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#151a22"; ctx.font = "700 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(handleOf(n) === "L" ? (th ? "ซ" : "L") : (th ? "ข" : "R"), x, 23.5);
      }
      // the pressure gauge: its dial, and its needle turned from the green (left) to the red (right) as the pressure rises
      const cx = 280, cy = 92;
      if (piece(ctx, kit, GAME_ART.milk.gauge, cx, cy + 20)) turned(ctx, kit, GAME_ART.milk.needle, cx, cy + 1, (Math.min(1, st.pressure) - 0.5) * Math.PI * 0.9, 1.9);
      else {
        ctx.fillStyle = "#2a1a0e"; ctx.beginPath(); ctx.arc(cx, cy, 26, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = "#e05a3a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 21, Math.PI * 1.7, Math.PI * 2); ctx.stroke();
        const a = Math.PI + Math.min(1, st.pressure) * Math.PI;
        ctx.strokeStyle = "#f3e3c3"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); ctx.stroke();
      }
      ctx.fillStyle = "#f3e3c3"; ctx.font = "600 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText(th ? "แรงดัน" : "pressure", cx, cy + 30);
    }
    const l = last.current;
    if (l && now - l.at < 600) { ctx.fillStyle = l.said === "hit" ? "#a8f0c0" : "#ffb4a0"; ctx.font = "800 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(l.said === "hit" ? (th ? "ฉ่า!" : "Squirt!") : l.said === "wrong" ? (th ? "ผิดข้าง" : "Wrong side") : l.said === "shift" ? (th ? "วัวขยับหนี!" : "She shifts!") : l.said === "still" ? (th ? "รอวัวนิ่งก่อน" : "Wait…") : (th ? "เร็วไป" : "Too fast"), 160, 62); }
    if (state === "ready") { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H); }
  }, state !== "done");
  return (
    <Shell title={th ? `รีดนม · ${animal.name || SPECIES.cow.name.th}` : `Milking · ${animal.name || "the cow"}`} th={th} onQuit={onQuit} tired={ease.tired} harp={ease.harp} data="milk"
           hint={th ? "กดคันโยกซ้าย-ขวาสลับกันตอนวัวเคี้ยว (จุดเลื่อนมาถึงเส้นทอง) กดรัวเกินเข็มแรงดันขึ้น วัวจะขยับหนี" : "Pump left and right in turn as the cow chews (a dot reaches the gold line). Pumping too fast raises the needle and she shifts."}>
      <canvas ref={ref} className="mx-3 mt-2 block aspect-[4/3] max-h-[44vh] w-[calc(100%-1.5rem)] rounded-xl border border-line" style={{ imageRendering: "pixelated" }} aria-label={th ? "คอกรีดนม" : "The milking stall"} role="img" />
      <div className="grid grid-cols-2 gap-3 p-3">
        {state === "ready" ? <button type="button" className="pressable col-span-2 min-h-14 rounded-xl bg-accent text-title font-semibold text-bg" onClick={() => { s.current = milkStart(performance.now()); setState("on"); }} data-game-start>{th ? "เริ่มรีดนม" : "Start milking"}</button> : <>
          <button type="button" onPointerDown={(e) => { e.preventDefault(); press("L"); }} className="pressable min-h-16 rounded-xl border-2 border-[#7ad0f0] bg-[#1e3440] text-title font-semibold text-[#cfeffd]" data-handle="L" disabled={state !== "on"}>{th ? "คันซ้าย" : "Left"}</button>
          <button type="button" onPointerDown={(e) => { e.preventDefault(); press("R"); }} className="pressable min-h-16 rounded-xl border-2 border-[#ff9fb0] bg-[#40202a] text-title font-semibold text-[#ffe0e6]" data-handle="R" disabled={state !== "on"}>{th ? "คันขวา" : "Right"}</button>
        </>}
      </div>
    </Shell>
  );
}

/* ── the coop's eggs ── */
export function EggsGame({ animal, ease, th, kit, reduced, onDone, onQuit }: GameProps) {
  const [state, setState] = useState<"ready" | "on" | "done">("ready");
  const go = useRef<{ eggs: Egg[]; due: number[]; started: number } | null>(null), basket = useRef(0.5), aim = useRef(0.5);
  const n = Math.max(1, animal.banked);
  // (for scripts trying it out, `next dev`: the go's eggs, and where the basket is aimed)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townEggs?: unknown };
    w.__townEggs = { eggs: () => go.current?.eggs ?? [], aim: (x: number) => { aim.current = x; }, box: (i: number) => boxAt(i) };
    return () => { delete w.__townEggs; };
  }, []);
  const roll = useCallback((i: number) => { const g = go.current; if (!g || state !== "on") return; const e = g.eggs[i]; if (e && e.out === null) e.out = performance.now(); }, [state]);
  useEffect(() => {
    const keys = new Set<string>();
    const down = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); keys.add(e.key); } };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    const t = setInterval(() => { if (keys.has("ArrowLeft")) aim.current = Math.max(0.05, aim.current - 0.03); if (keys.has("ArrowRight")) aim.current = Math.min(0.95, aim.current + 0.03); }, 16);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { clearInterval(t); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  const ref = useBoard((ctx, now) => {
    const g = go.current;
    // the basket slides to where it is aimed (quickly, not at once)
    basket.current += (aim.current - basket.current) * 0.35;
    if (g && state === "on") {
      g.eggs.forEach((e, i) => { if (e.out === null && now >= g.due[i]) e.out = now; if (e.out !== null && !e.landed && now >= e.out + fallMs(ease)) { e.landed = true; e.caught = caughtBy(e.box, basket.current, ease); } });
      if (g.eggs.every((e) => e.landed)) { setState("done"); const p = eggsPlay(g.eggs, g.started, now); onDone({ hits: p.hits, misses: p.misses, secs: Math.max(p.secs, 3.2) }, p.cracked); }
    }
    // the coop inside (its scene: a beam along the top, plank walls, a straw floor); the stand-in's boards while there is none
    const lit = scene(ctx, kit, GAME_ART.eggs.scene);
    if (!lit) {
      ctx.fillStyle = "#4a3422"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#5a4028"; ctx.fillRect(0, 0, W, 64);
      ctx.fillStyle = "#e6c46a"; ctx.fillRect(0, 214, W, 26);
    } else for (const [x, y] of [[34, 236], [292, 238]] as const) piece(ctx, kit, GAME_ART.eggs.straw, x, y, 1.8);
    // the five nest boxes on the beam, a hen peeping over each box that still holds her egg
    for (let i = 0; i < EGGS.boxes; i++) {
      const x = boxAt(i) * W, sitting = !!g && g.eggs.some((e) => e.box === i && e.out === null);
      if (sitting) drawAnimal(ctx, kit, { species: animal.species, breed: animal.breed, stage: "adult", pose: "idle", right: i % 2 === 0 }, { x, y: 44 }, 1.5, 1, now, reduced);
      if (!piece(ctx, kit, GAME_ART.eggs.box, x, 72, 1.8)) {
        ctx.fillStyle = "#7a5432"; ctx.fillRect(x - 26, 20, 52, 38); ctx.fillStyle = "#2a1a0e"; ctx.fillRect(x - 20, 26, 40, 26);
        ctx.fillStyle = "#d8b450"; ctx.fillRect(x - 20, 46, 40, 6);
      }
    }
    // eggs: wobbling in their boxes, then rolling off the lip and falling
    const anEgg = (x: number, y: number, cracked: boolean) => { if (!piece(ctx, kit, cracked ? GAME_ART.eggs.crack : GAME_ART.eggs.egg, x, y + (cracked ? 4 : 8), cracked ? 1.6 : 1.2)) egg(ctx, x, y, cracked); };
    if (g) for (const e of g.eggs) {
      const x = boxAt(e.box) * W;
      if (e.out === null) { const wob = reduced ? 0 : Math.sin(now / 90 + e.box) * 2; anEgg(x + wob, 54, false); continue; }
      const f = Math.min(1, (now - e.out) / fallMs(ease));
      if (!e.landed) anEgg(x, 60 + f * f * 150, false);
      else if (!e.caught) anEgg(x, 220, true);
    }
    // the padded basket, as wide as it catches (the eggs caught in it, nestled in its cloth)
    const bw = basketWidth(ease) * W, bx = basket.current * W;
    const inBasket = g ? g.eggs.filter((e) => e.landed && e.caught).length : 0;
    if (kit?.has(GAME_ART.eggs.basket)) {
      for (let k = 0; k < Math.min(5, inBasket); k++) anEgg(bx + (k - (Math.min(5, inBasket) - 1) / 2) * 9, 200, false);
      piece(ctx, kit, GAME_ART.eggs.basket, bx, 216, bw / kit.sizeOf(GAME_ART.eggs.basket)[0]);
    } else {
      if (g) for (const e of g.eggs) if (e.landed && e.caught) egg(ctx, bx, 200, false);
      ctx.fillStyle = "#a0602a"; ctx.fillRect(bx - bw / 2, 196, bw, 18); ctx.fillStyle = "#d84a4a"; ctx.fillRect(bx - bw / 2 + 3, 196, bw - 6, 6);
      ctx.fillStyle = "#f4f0e0"; for (let k = 0; k < bw / 8; k++) ctx.fillRect(bx - bw / 2 + 4 + k * 8, 197, 4, 4);
    }
    if (state === "ready") { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H); }
  }, state !== "done");
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { const p = boardPoint(e.currentTarget, e); aim.current = Math.max(0.05, Math.min(0.95, p.x / W)); };
  // (a tap on the row of boxes rolls that box's egg out; anywhere, it aims the basket)
  const tapBox = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = boardPoint(e.currentTarget, e);
    move(e);
    if (p.y >= 70) return;
    const box = Math.max(0, Math.min(EGGS.boxes - 1, Math.floor((p.x / W) * EGGS.boxes))), i = go.current?.eggs.findIndex((x) => x.box === box) ?? -1;
    if (i >= 0) roll(i);
  };
  return (
    <Shell title={th ? `เก็บไข่ในเล้า · ${n} ฟอง` : `The coop's eggs · ${n}`} th={th} onQuit={onQuit} tired={ease.tired} harp={ease.harp} data="eggs"
           hint={th ? "แตะรังเพื่อเขี่ยไข่ออกตามลำดับที่ชอบ (ไม่แตะก็กลิ้งออกเอง) เลื่อนตะกร้าไปรับให้ทัน ไข่ที่ตกพื้นจะแตก" : "Tap a box to roll its egg out in the order you like (left alone, it rolls out by itself). Slide the basket under it; an egg that hits the floor cracks."}>
      <canvas ref={ref} onPointerDown={tapBox} onPointerMove={move} className="mx-3 mt-2 block aspect-[4/3] max-h-[46vh] w-[calc(100%-1.5rem)] touch-none rounded-xl border border-line" style={{ imageRendering: "pixelated" }} aria-label={th ? "เล้าไก่ รังไข่ด้านบน ตะกร้าด้านล่าง" : "The coop: nest boxes above, the basket below"} role="img" />
      <div className="grid grid-cols-2 gap-3 p-3">
        {state === "ready" ? <button type="button" className="pressable col-span-2 min-h-14 rounded-xl bg-accent text-title font-semibold text-bg" onClick={() => { go.current = eggsStart(n, Math.floor(Math.random() * 1e6), performance.now()); setState("on"); }} data-game-start>{th ? "เริ่มเก็บไข่" : "Start"}</button> : <>
          <button type="button" className="pressable min-h-14 rounded-xl border border-line-strong text-ui text-ink" onPointerDown={(e) => { e.preventDefault(); aim.current = Math.max(0.05, aim.current - 0.2); }}>{th ? "◀ เลื่อนซ้าย" : "◀ Left"}</button>
          <button type="button" className="pressable min-h-14 rounded-xl border border-line-strong text-ui text-ink" onPointerDown={(e) => { e.preventDefault(); aim.current = Math.min(0.95, aim.current + 0.2); }}>{th ? "เลื่อนขวา ▶" : "Right ▶"}</button>
        </>}
      </div>
    </Shell>
  );
}
function egg(ctx: CanvasRenderingContext2D, x: number, y: number, cracked: boolean) {
  ctx.fillStyle = cracked ? "#f2d96a" : "#f4e8cc"; ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y, cracked ? 9 : 6, cracked ? 3 : 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (cracked) { ctx.fillStyle = "#f4e8cc"; ctx.fillRect(x - 6, y - 4, 4, 3); ctx.fillRect(x + 3, y - 4, 4, 3); }
}

/* ── shearing ── */
export function ShearGame({ animal, ease, th, kit, reduced, onDone, onQuit }: GameProps) {
  const [state, setState] = useState<"ready" | "on" | "done">("ready");
  const s = useRef<ShearState>(shearStart()), shears = useRef<{ x: number; y: number }>({ ...SWIRL[0] }), aim = useRef<{ x: number; y: number } | null>(null), trail = useRef<Array<{ x: number; y: number; off: boolean }>>([]);
  const lastT = useRef(0), tufts = useRef<{ n: number; list: Array<{ x: number; y: number; t: number; d: number }> }>({ n: 0, list: [] });
  const ref = useBoard((ctx, now) => {
    const dt = lastT.current ? Math.min(0.05, (now - lastT.current) / 1000) : 0;
    lastT.current = now;
    if (state === "on" && aim.current) {
      // the shears go toward the finger, at most so fast: a fleece is sheared, not swiped
      const p = shears.current, a = aim.current, d = Math.hypot(a.x - p.x, a.y - p.y), step = Math.min(d, SHEAR.speed * dt);
      if (d > 0.01) { p.x += ((a.x - p.x) / d) * step; p.y += ((a.y - p.y) / d) * step; }
      const done = shearMove(s.current, p, now, ease);
      trail.current.push({ x: p.x, y: p.y, off: s.current.off });
      if (trail.current.length > 600) trail.current.shift();
      if (done) { setState("done"); onDone(shearPlay(s.current, now)); }
    }
    // the shearing pen (its scene: a rail fence, the grass); the stand-in's boards while there is none
    if (!scene(ctx, kit, GAME_ART.shear.scene)) {
      ctx.fillStyle = "#6a8a4a"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#8a6a3a"; for (let i = 0; i < 4; i++) ctx.fillRect(0, 30 + i * 60, W, 6);
    }
    drawAnimal(ctx, kit, { species: "sheep", breed: animal.breed, stage: "adult", pose: "idle", right: true, shorn: false }, { x: 152, y: 230 }, 4.6, 1, now, reduced);
    // what has been shorn: the fleece taken off along the shears' way
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = shade("#f2efe6", -0.25); ctx.lineWidth = 16; ctx.beginPath(); trail.current.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    // the swirl to follow: dotted marks, the ones done faded
    for (let i = 0; i < SWIRL.length; i++) { ctx.fillStyle = i < s.current.at ? "rgba(255,255,255,0.15)" : i === s.current.at ? "#f0c060" : "rgba(90,60,30,0.75)"; ctx.beginPath(); ctx.arc(SWIRL[i].x, SWIRL[i].y, i === s.current.at ? 4.5 : 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "rgba(240,192,96,0.35)"; ctx.lineWidth = shearNear(ease) * 2; ctx.globalAlpha = 0.18; ctx.beginPath(); SWIRL.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.globalAlpha = 1;
    // nicks: where the shears left the line, a ragged tuft torn from the fleece (a red mark while the sheet has none)
    ctx.fillStyle = "#e05a3a"; for (let i = 1; i < trail.current.length; i++) if (trail.current[i].off && !trail.current[i - 1].off) { if (!piece(ctx, kit, GAME_ART.shear.nick, trail.current[i].x, trail.current[i].y + 6, 1.1)) ctx.fillRect(trail.current[i].x - 2, trail.current[i].y - 2, 4, 4); }
    ctx.restore();
    // the fleece shorn off: a tuft at each mark reached, falling and fading where the shears took it
    if (s.current.at > tufts.current.n) { const q = SWIRL[Math.min(SWIRL.length - 1, s.current.at - 1)]; tufts.current.n = s.current.at; tufts.current.list.push({ x: q.x, y: q.y, t: now, d: (s.current.at % 2 ? 1 : -1) }); if (tufts.current.list.length > 12) tufts.current.list.shift(); }
    if (kit?.has(GAME_ART.shear.tuft)) for (const f of tufts.current.list) {
      const age = (now - f.t) / 900;
      if (age >= 1 || reduced) continue;
      ctx.save(); ctx.globalAlpha = 1 - age * age;
      piece(ctx, kit, GAME_ART.shear.tuft, f.x + f.d * age * 14, f.y + age * age * 46, 1);
      ctx.restore();
    }
    // the shears
    const p = shears.current;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.6);
    if (!piece(ctx, kit, GAME_ART.shear.shears, 0, 8, 1.6)) { ctx.fillStyle = "#cfd6de"; ctx.fillRect(-2, -14, 3, 14); ctx.fillRect(1, -14, 3, 14); ctx.fillStyle = "#8a5a2a"; ctx.fillRect(-4, 0, 10, 8); }
    ctx.restore();
    if (state === "ready") { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H); }
  }, state !== "done");
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { aim.current = boardPoint(e.currentTarget, e); };
  const pct = Math.round((s.current.at / SWIRL.length) * 100);
  return (
    <Shell title={th ? `ตัดขนแกะ · ${animal.name || SPECIES.sheep.name.th}` : `Shearing · ${animal.name || "the sheep"}`} th={th} onQuit={onQuit} tired={ease.tired} harp={ease.harp} data="shear"
           hint={th ? "ลากกรรไกรไปตามเกลียวขนจากด้านนอกเข้าด้านใน ออกนอกเส้นจะเฉือนขนเสีย ตัดครบทั้งเกลียวได้ขนเต็มผืน" : "Drag the shears along the fleece's swirl, outside in. Off the line nicks the fleece; the whole swirl traced gives a whole fleece."}>
      <canvas ref={ref} onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a pointer the page did not see begin */ } point(e); }} onPointerMove={(e) => { if (e.buttons || e.pointerType !== "mouse") point(e); }} onPointerUp={() => { aim.current = null; }}
              className="mx-3 mt-2 block aspect-[4/3] max-h-[46vh] w-[calc(100%-1.5rem)] touch-none rounded-xl border border-line" style={{ imageRendering: "pixelated" }} aria-label={th ? "คอกตัดขน" : "The shearing pen"} role="img" />
      <div className="flex items-center gap-3 p-3">
        {state === "ready" ? <button type="button" className="pressable min-h-14 flex-1 rounded-xl bg-accent text-title font-semibold text-bg" onClick={() => { s.current = shearStart(); shears.current = { ...SWIRL[0] }; trail.current = []; setState("on"); }} data-game-start>{th ? "เริ่มตัดขน" : "Start shearing"}</button>
          : <p className="flex-1 text-ui text-ink" data-shear-progress={pct}>{th ? `ตัดไปแล้ว ${pct}% · เฉือนพลาด ${s.current.misses} ครั้ง` : `${pct}% shorn · ${s.current.misses} nicks`}</p>}
      </div>
    </Shell>
  );
}
