"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ROASTING, doneFrom, fireAt, roastAt, roastOf, roasted, startRoast, turn, type Roast } from "@/lib/town/roasting";
import type { Sprite } from "@/lib/town/scenery";
import { GameFrame, GameScene, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** A face's colour by how far it is cooked: pale, golden, brown, and black once it is burnt. */
function colourOf(f: number, done: number): string {
  if (f > ROASTING.burnt) return "#221612";
  if (f >= done) return "#c8802c";
  const k = Math.max(0, Math.min(1, f / done));
  // (from the pale of something raw to the gold of something done)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * k);
  return `rgb(${mix(236, 214)},${mix(214, 150)},${mix(176, 66)})`;
}

/**
 * Roasting on a stick, on the screen (lib/town/roasting): the camp's fire seen close, and over it the end of the
 * stick with its morsel, seen end on: a round of four faces, each coloured by how far it is cooked, with a ring
 * about it that fills as each face does and is notched where a face is done. A touch anywhere, or the space bar,
 * turns the stick a quarter. The fire's flames are drawn here, so that they can crackle and flare.
 */
export default function TownRoasting({ th, title, spent, calm = 1, harder = 1, scene, onDone, onCancel, onHit, onTurn, onFlare }: GameProps & {
  spent: boolean;
  /** How many times harder this roast is for whoever turns it (lib/town/cooking's harderCook): nothing of it is shown but the game itself. */
  harder?: number;
  /** Steady hands (a meal's buff): so many times as long between the fire's flares. */
  calm?: number;
  scene: Sprite | null;
  /** Told when the stick is turned, and when the fire crackles before it flares: for their sounds. */
  onTurn?: () => void;
  onFlare?: () => void;
}) {
  const roast = useRef<Roast>(startRoast(spent, Math.floor(Math.random() * 2 ** 31), calm, harder));
  const from = useRef(0), ended = useRef(false), turned = useRef(0);
  const [, setShown] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null), told = useRef<boolean[]>([]), burnt = useRef<boolean[]>([]);
  const now = () => (performance.now() - from.current) / 1000;
  useEffect(() => { from.current = performance.now(); }, []);

  const give = useCallback(() => {
    if (ended.current) return;
    roast.current = turn(roastAt(roast.current, now()));
    turned.current = performance.now();
    onTurn?.();
    setShown((n) => n + 1);
  }, [onTurn]);
  const crackled = useRef(false);

  useFrames(() => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const t = now();
    if (!ended.current) {
      const was = roast.current, next = roastAt(was, t), done = doneFrom(next);
      roast.current = next;
      next.faces.forEach((f, i) => {
        if (f >= done && !told.current[i]) { told.current[i] = true; onHit?.(true); setShown((n) => n + 1); }
        if (f > ROASTING.burnt && !burnt.current[i]) { burnt.current[i] = true; onHit?.(false); setShown((n) => n + 1); }
      });
      if (roasted(next)) {
        ended.current = true;
        const out = roastOf(next);
        window.setTimeout(() => onDone({ ...out, secs: Math.round(t * 10) / 10, need: ROASTING.faces }), 450);
      }
    }
    // the picture: the flames, then the stick's end with its morsel over them
    const r = roast.current, w = c.width, h = c.height, fire = fireAt(r, t), done = doneFrom(r);
    if (fire.crackling && !crackled.current && !ended.current) onFlare?.();
    crackled.current = fire.crackling;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, base = h * 0.8, tall = h * (fire.flaring ? 0.52 : fire.crackling ? 0.3 : 0.34);
    for (let i = 0; i < 7; i++) {
      const x = cx + (i - 3) * w * 0.045, sway = Math.sin(t * (7 + i) + i * 1.7) * w * 0.012, up = tall * (0.55 + 0.45 * Math.abs(Math.sin(t * (5 + i * 0.7) + i)));
      const g = ctx.createLinearGradient(0, base, 0, base - up);
      g.addColorStop(0, "rgba(255,238,170,0.95)"); g.addColorStop(0.45, "rgba(255,150,40,0.9)"); g.addColorStop(1, "rgba(220,60,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.035, base);
      ctx.quadraticCurveTo(x - w * 0.03 + sway, base - up * 0.5, x + sway * 1.6, base - up);
      ctx.quadraticCurveTo(x + w * 0.03 + sway, base - up * 0.5, x + w * 0.035, base);
      ctx.fill();
    }
    // (a crackle before it flares: sparks going up)
    if (fire.crackling) for (let i = 0; i < 6; i++) {
      const k = (t * 2.2 + i * 0.17) % 1;
      ctx.fillStyle = `rgba(255,230,150,${1 - k})`;
      ctx.fillRect(Math.round(cx + Math.sin(i * 2.3 + t * 3) * w * 0.12), Math.round(base - h * 0.2 - k * h * 0.3), Math.max(2, w * 0.008), Math.max(2, w * 0.008));
    }
    // the morsel, end on: it turns a quarter at a time, the turn drawn over a moment
    const R = Math.min(w, h) * 0.2, my = h * 0.36, spun = Math.max(0, 1 - (performance.now() - turned.current) / 130), n = ROASTING.faces;
    ctx.save();
    ctx.translate(cx, my);
    // (the face turned to the fire is the one drawn at the foot: the round is turned back by as many quarters as it has been given)
    ctx.rotate((-r.down + spun) * (Math.PI / 2));
    for (let i = 0; i < n; i++) {
      // face i sits a quarter round from the last, the first at the foot
      const mid = Math.PI / 2 + i * (Math.PI / 2), a0 = mid - Math.PI / 4, a1 = mid + Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
      ctx.fillStyle = colourOf(r.faces[i], done); ctx.fill();
      ctx.strokeStyle = "#3a2414"; ctx.lineWidth = Math.max(2, R * 0.07); ctx.stroke();
      // its ring: how far it is cooked, of the way to burning
      ctx.beginPath(); ctx.arc(0, 0, R * 1.2, a0 + 0.06, a1 - 0.06);
      ctx.strokeStyle = "rgba(20,12,6,0.55)"; ctx.lineWidth = R * 0.13; ctx.stroke();
      const share = Math.min(1, r.faces[i] / ROASTING.burnt);
      ctx.beginPath(); ctx.arc(0, 0, R * 1.2, a0 + 0.06, a0 + 0.06 + (a1 - a0 - 0.12) * share);
      ctx.strokeStyle = r.faces[i] > ROASTING.burnt ? "#e2543a" : r.faces[i] >= done ? "#f2c14e" : "#f4ead0"; ctx.stroke();
      // (the notch a face is done at)
      const at = a0 + 0.06 + (a1 - a0 - 0.12) * (done / ROASTING.burnt);
      ctx.beginPath(); ctx.moveTo(Math.cos(at) * R * 1.1, Math.sin(at) * R * 1.1); ctx.lineTo(Math.cos(at) * R * 1.3, Math.sin(at) * R * 1.3);
      ctx.strokeStyle = "#fff8e0"; ctx.lineWidth = Math.max(2, R * 0.05); ctx.stroke();
    }
    // the stick's end, in the middle
    ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, Math.PI * 2); ctx.fillStyle = "#8a5a2c"; ctx.fill(); ctx.strokeStyle = "#3a2414"; ctx.lineWidth = Math.max(2, R * 0.05); ctx.stroke();
    ctx.restore();
  });

  // The space bar turns the stick; Escape gives the work up. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      if ((e.key !== " " && e.code !== "Space") || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      give();
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel, give]);

  useGameHandle({ kind: "roasting", roast: () => roastAt(roast.current, now()), fire: () => fireAt(roast.current, now()), turn: give, time: now, done: () => doneFrom(roast.current) }, [give]);

  const r = roast.current, out = roastOf(r);
  return (
    <GameFrame th={th} title={title} need={ROASTING.faces} hits={out.hits} misses={out.misses} most={0} onCancel={onCancel}>
      <div className={`${STAGE} mt-2 aspect-[3/2] w-full touch-none select-none`} data-look="roasting" onPointerDown={(e) => { e.preventDefault(); give(); }}>
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="leaf" className="absolute inset-0 size-full" />}
        <canvas ref={canvas} width={480} height={320} className="pointer-events-none absolute inset-0 size-full" />
      </div>
    </GameFrame>
  );
}
