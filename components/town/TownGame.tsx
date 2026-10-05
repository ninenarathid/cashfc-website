"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PACE, paced } from "@/lib/town/pace";
import type { Sprite } from "@/lib/town/scenery";

/** How a game went: what the game of timing always gave back, and every game gives now. `dropped`: the work was not done (tired hands, and too many misses). */
export interface GameResult { hits: number; misses: number; secs: number; need: number; dropped?: boolean }
/** What every game is given by whoever opens it. */
export interface GameProps {
  th: boolean;
  title: string;
  onDone: (result: GameResult) => void;
  onCancel: () => void;
  /** Told at each part done and each miss: for a sound, and for what flies up where the work is. */
  onHit?: (hit: boolean) => void;
}

/**
 * The board every game of the town is played on (the owner, 2026-10-04: "แก้ไขเป็นเกมส์ใหม่ ที่แตกต่างกัน พร้อม UI ใหม่แต่ละ
 * mini game ให้สื่อถึงสิ่งที่ทำด้วย"): a wooden sign, of the town's own make, not the site's dark card. Its head says what
 * the work is, shows a square for each part of it wanted (filled as they are done) and, for tired hands, one for
 * each miss they still have in them. What is on it below is the game's own picture of the work.
 *
 * Nothing on it explains the game beyond a word or two: what moves says it.
 */
export function GameFrame({ th, title, need, hits, misses, most, onCancel, children, word }: {
  th: boolean;
  title: string;
  need: number;
  hits: number;
  misses: number;
  /** How many misses end it: none, when it cannot be lost. */
  most: number;
  onCancel: () => void;
  children: ReactNode;
  /** A word or two under the title: what the hand does. */
  word?: string;
}) {
  const left = Math.max(0, most - misses);
  return (
    <section aria-label={title} data-town-game
             className="select-none rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
      <div className="flex min-h-9 items-center gap-2">
        <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{title}</h2>
        {/* a square for each part wanted, filled as they come */}
        <span className="ml-1 flex gap-1" aria-label={`${hits} / ${need}`} data-hits={hits} data-need={need}>
          {Array.from({ length: need }, (_, i) => (
            <span key={i} className={`size-3 border-2 border-[#2a190d] ${i < hits ? "bg-[#8fd45f]" : "bg-[#4a2f18]"}`} />
          ))}
        </span>
        {/* tired hands: a mark for each miss they still have in them, going out one by one */}
        {most > 0 ? (
          <span className="ml-1 flex gap-1" aria-label={`${left} / ${most}`} data-misses-left={left}>
            {Array.from({ length: most }, (_, i) => <span key={i} className={`size-2.5 border-2 border-[#2a190d] ${i < left ? "bg-[#e9573f]" : "bg-[#4a2f18]"}`} />)}
          </span>
        ) : misses > 0 && <span className="font-data text-meta tabular-nums text-[#ffb09c]" data-misses={misses}>×{misses}</span>}
        <button type="button" onClick={onCancel}
                className="pressable -mr-1 ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "เลิก" : "Stop"}</button>
      </div>
      {word && <p className="-mt-0.5 mb-1 text-label text-[#e9cfa4]">{word}</p>}
      {children}
    </section>
  );
}

/** What a game's picture stands in: a hollow in the board, dark, with hard edges. */
export const STAGE = "relative overflow-hidden rounded-[4px] border-[3px] border-[#2a190d] bg-[#3a2513]";
/** The board's own big button: for the games that are played by one. */
export const BIG = "min-h-14 w-full touch-none select-none rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] text-read font-semibold text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] active:translate-y-px active:shadow-[inset_0_-2px_0_#c98f2f]";

/**
 * A game's own scene, filling its stage: a picture out of the town's scenery (lib/town/scenery's `sprite`), shown
 * with its pixels kept square, cut to the stage's shape about its middle. Nothing is drawn while the picture has
 * not come: the stage is its plain dark hollow until then.
 */
export function GameScene({ sprite, className = "" }: { sprite: Sprite | null; className?: string }) {
  if (!sprite) return null;
  const [x, y, w, h] = sprite.at;
  return (
    <svg aria-hidden viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className={`pointer-events-none ${className}`} style={{ imageRendering: "pixelated" }}>
      <image href={sprite.src} width={sprite.sheet[0]} height={sprite.sheet[1]} style={{ imageRendering: "pixelated" }} />
    </svg>
  );
}

/** A number in [0, 1) from a seed and a place: the same every time. */
function speck(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const GROUND = {
  // earth with weeds' roots and crumbs in it; tilled earth, in rows; water, in ripples
  soil: { base: "#6a4426", dark: ["#54341c", "#442a16"], light: ["#7d5330", "#8a623a"], odd: "#5e8c3a" },
  rows: { base: "#5b3a1f", dark: ["#48290f", "#3b210c"], light: ["#734a28", "#80562e"], odd: "#9a8468" },
  water: { base: "#2f7fa8", dark: ["#276d92", "#205d7f"], light: ["#48a0c8", "#7cc6e6"], odd: "#bfe6ff" },
  // the forest's floor: dark earth under old leaves, with a little moss
  leaf: { base: "#3f3a24", dark: ["#322d1b", "#282414"], light: ["#5a5230", "#6f5a2f"], odd: "#6f8a3a" },
} as const;

/**
 * Ground drawn in the town's own big pixels: earth, tilled rows, or water. A small picture, worked out from a seed,
 * shown many times its size with its pixels kept square.
 */
export function PixelGround({ kind, seed = 7, w = 80, h = 40, className = "" }: { kind: keyof typeof GROUND; seed?: number; w?: number; h?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const g = GROUND[kind];
    ctx.fillStyle = g.base;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = speck(seed, x, y);
      // rows of tilled earth and ripples of water run across; plain earth is crumbs
      const band = kind === "soil" ? 0 : Math.floor((y + (kind === "water" ? Math.floor(Math.sin(x / 5) * 1.5) : 0)) / (kind === "water" ? 4 : 5)) % 2;
      let c: string | null = null;
      if (band && r < 0.6) c = g.dark[0];
      // (water is calm: a glint here and there; earth is all crumbs)
      const few = kind === "water" ? 0.35 : 1;
      if (r < 0.1 * few) c = g.dark[1];
      else if (r > 1 - 0.1 * few) c = g.light[0];
      else if (r > 1 - 0.14 * few) c = g.light[1];
      else if (r > 1 - 0.155 * few) c = g.odd;
      if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
    }
  }, [kind, seed, w, h]);
  return <canvas ref={ref} width={w} height={h} aria-hidden className={`[image-rendering:pixelated] ${className}`} />;
}

/**
 * Call something every frame the game draws, with the seconds gone by since the last (never more than a tenth) and the
 * time. No more often than the map is drawn at the most (lib/town/pace): a game on a screen of 144 or 240 a second is
 * played no better for being drawn that often, and the machine runs hot for it.
 */
export function useFrames(step: (dt: number, now: number) => void) {
  const fn = useRef(step);
  useEffect(() => { fn.current = step; });
  useEffect(() => {
    let raf = 0, last = performance.now(), due = 0;
    const frame = (now: number) => {
      const after = paced(now, last, due, PACE.most);
      if (after !== null) {
        due = after;
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        fn.current(dt, now);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** For scripts in `next dev`: the game that is up, by its kind, with what it lets a script see and do. */
export function useGameHandle(handle: Record<string, unknown>, deps: unknown[]) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __townGame?: unknown }).__townGame = handle;
    return () => { delete (window as unknown as { __townGame?: unknown }).__townGame; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handle is rebuilt when what it closes over changes
  }, deps);
}
