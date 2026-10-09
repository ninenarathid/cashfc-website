"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ARMS, BOARD_AT, LAMPS, LAMP_MAPS, RING, byTile, embers, holdFor, isLampMap, leftOf, nightBegins, nightOf, postBy, postsOf, stepOf, takers, tierOf,
  type Bearer, type Lack, type LampMap, type LampsTold, type LitTold, type Named,
} from "@/lib/town/lamps";
import { loadLampsArt } from "@/lib/town/lamps-art";
import type { Keeper } from "@/lib/town/keeper";
import { PAST_BOUND, pastBound } from "@/lib/town/lines";
import type { SceneryKit, Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { FARM, FARM_PUMPKINS, FOREST, GREAT_TREE, TILE_W, WATERFALL, WELL, findPath, groundAt, placeOf, walkable, type Vec } from "@/lib/town/world";
import type { FarmFrame } from "./TownFarm";
import TownFoot from "./TownFoot";

export type { Bearer };
/** What a tap on the map came to here: nothing of the lamps' (null), or the brazier's, a board's or a post's: done where I stand, or to be walked to. With `peek` nothing is done. */
export type LampTap = (x: number, y: number, peek?: boolean) => { walk: Vec | null } | null;
/**
 * What the map asks of the lamps as it draws (components/town/Town.tsx): the frame's own things (`draw`); whether a
 * tap was on one of them (`tap`); the hour's dark laid over the map with it lifted in the ring of every lit lamp in
 * sight (`dark`: true if it was laid here; false, nothing is lit in sight and the map lays its own, as it always
 * did); and the flame somebody bears (`flame`: the ring of embers at their feet that says what is left of it, the
 * flame in their hands, and its light over the night's dark, which `late` draws after the dark).
 */
export interface LampsHooks {
  draw: (frame: FarmFrame) => void;
  tap: LampTap;
  dark: (ctx: CanvasRenderingContext2D, cw: number, ch: number, tint: readonly [number, number, number]) => boolean;
  flame: (ctx: CanvasRenderingContext2D, until: number, p: Vec, h: number, layer: "feet" | "hands" | "both", px: number, late: Array<() => void>) => void;
}

/** How long each thing is said, in milliseconds: what a post lit earned me, a flame handed to me, and the night every lamp of a map is lit. Slowly, each. */
const EARNED_MS = 5600, GIFT_MS = 4200, FETE_MS = 14_000;
/** How long a lamp's light takes to come up, in milliseconds (the owner's brief: a warm pool of light that comes up over three seconds). */
const RISE_MS = 3000;
/** How near a board one stands to read it, in tiles. */
const READ = 3;
/** How many times smaller than the screen the picture of the night's dark is made (it is soft: laid back over the map smoothed). */
const DARK_K = 6;
/** How large each picture is drawn on the map, as a share of its own size (the sheets came at pixels of several sizes). */
const POST_K = 0.9, FIRE_K = 0.95, BOARD_K = 0.85, BLOOM_K = 0.55, SHROOM_K = 0.62, ONE_K = 0.7, MOTH_K = 0.26, FLY_K = 0.3, SKY_K = 0.42, WISP_K = 0.8, HELD_K = 0.5, EMBER_K = 0.56, MARK_K = 0.55;
/** Where a post's foot and its lantern are in its picture, in the picture's own pixels from its left and from its foot (the post stands at the left of it, the lantern hangs from its arm). */
const POST = { foot: 9.4, lantern: 26, up: 44 };
/** The light a lamp throws, a fire's, and the cool light of the forest's own things: red, green, blue. */
const WARM = "255,206,138", WARMER = "255,170,96", COOL = "120,232,226", PALE = "196,232,255", LEAF = "214,246,150";
/**
 * What the night's dark is lifted to in a lamp's ring: nothing at all, the day's own colours (the coordinator's ruling,
 * 2026-10-08: a lit ring is real daylight, the tint itself taken away, not a glow over a scene that is still dark).
 * And how much wider than the lamp's six tiles its picture is laid, for the soft edge to end beyond them.
 */
const LIFT = "255,255,255", EDGE = 1.1;
/** Flowers and mushrooms round a post, in tiles from its foot: close by it, on its own tile. */
const ROUND: Array<[dx: number, dy: number]> = [[-0.42, 0.22], [0.36, 0.4], [0.44, -0.32]];

/** Why not, in the lamps' own words. */
const WHY: Record<string, [th: string, en: string]> = {
  day: ["โคมจุดได้ตั้งแต่ 17:30 น. ถึงตี 5", "The lamps are lit from 17:30 until 5 in the morning"],
  whole: ["คืนนี้โคมแมพนี้ติดครบทุกต้นแล้ว", "Every lamp of this map is lit tonight"],
  held: ["ถือไฟอยู่แล้ว", "You bear a flame already"], hand: ["เก็บของที่ถืออยู่ก่อน ถึงจะรับไฟได้", "Put away what you hold first"],
  stone: ["วางหินก่อน ถึงจะรับไฟได้", "Lay the stone down first"], far: ["ต้องยืนใกล้กว่านี้", "Stand nearer"],
  none: ["ไม่ได้ถือไฟอยู่", "You bear no flame"],
  out: ["ไฟดับไปแล้ว ไม่เสียอะไร กลับไปรับไฟใหม่ที่กองไฟได้เลย", "The flame went out. Nothing is lost: take another at the fire"],
  lit: ["โคมต้นนี้ติดแล้ว ไฟยังอยู่กับเรา", "This lamp is lit already: the flame is still yours"],
  away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
  early: ["กดค้างไว้จนแถบเต็ม โคมถึงจะติด", "Keep it held until the bar is full"],
};
const WHY_PASS: Record<string, [th: string, en: string]> = {
  ...WHY, hand: ["อีกฝ่ายถือของอยู่ ยังรับไฟไม่ได้ ไฟยังอยู่กับเรา", "They have a thing in their hand: the flame is still yours"],
  held: ["อีกฝ่ายถือไฟอยู่แล้ว ไฟยังอยู่กับเรา", "They bear a flame already: yours is still yours"],
  stone: ["อีกฝ่ายถือหินอยู่ ยังรับไฟไม่ได้", "They carry a stone: the flame is still yours"],
  none: ["ไม่มีใครรับไฟ", "Nobody is there to take it"],
};
/** What somebody close by lacks to be handed a flame, said of them by name. */
const LACKS: Record<Lack, [(name: string) => string, (name: string) => string]> = {
  walking: [(n) => `${n} ต้องยืนนิ่งก่อน ถึงจะรับไฟได้`, (n) => `${n} has to stand still to take the flame`],
  hand: [(n) => `${n} ต้องมือเปล่าก่อน ถึงจะรับไฟได้`, (n) => `${n} has to have empty hands to take the flame`],
  stone: [(n) => `${n} ถือหินอยู่ รับไฟไม่ได้`, (n) => `${n} carries a stone`],
  held: [(n) => `${n} ถือไฟอยู่แล้ว`, (n) => `${n} bears a flame already`],
};
/** How it is done, in three steps: what the strip over the buttons and the board both say. */
const STEPS: Array<[th: string, en: string]> = [
  ["รับไฟที่กองไฟ (มือเปล่า)", "Take a flame at the fire, with empty hands"],
  ["รีบพาไฟไป หรือส่งต่อให้เพื่อนที่ยืนนิ่งมือเปล่า", "Carry it, or hand it to a friend who stands still with empty hands"],
  ["จุดโคมที่ยังมืด", "Light a lamp that is dark"],
];
/** Said beforehand, in one line each: how long a flame lives, what a lamp lit counts for, and that nothing is lost. */
const LIVES: [th: string, en: string] = [`ไฟอยู่ในมือได้ ${LAMPS.life} วินาที ส่งต่อเมื่อไหร่นับใหม่อีก ${LAMPS.life} วินาที`, `A flame lives ${LAMPS.life} seconds in a hand. Handed on, it is fresh again: ${LAMPS.life} more`];
const COUNTS: [th: string, en: string] = ["โคมติดเมื่อไหร่ ทุกมือที่ไฟผ่านได้ +3 แต้มผู้ช่วยเท่ากัน", "Once a lamp is lit, every hand the flame went through has 3 helpers' points, all alike"];
const NO_LOSS: [th: string, en: string] = ["ไฟดับกลางทางไม่เสียอะไร กลับมารับใหม่ได้เสมอ", "A flame that goes out costs nothing: there is always another at the fire"];
const MAP_NAME: Record<LampMap, [th: string, en: string]> = { farm: ["แปลงผัก", "The farm"], forest: ["ป่า", "The forest"] };

/** What moves in the night every lamp is lit, and in what is told: slowly, and not at all for whoever asked for less motion. */
const CSS = `
  @keyframes lamps-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  @keyframes lamps-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
  @keyframes lamps-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes lamps-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
  @keyframes lamps-burn { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  .lamps-fete { animation: lamps-in 1100ms ease-out both; }
  .lamps-fete [data-sway] { transform-origin: 50% 0; animation: lamps-sway 5.2s ease-in-out infinite; }
  .lamps-fete [data-breathe] { animation: lamps-breathe 3.6s ease-in-out infinite; }
  .lamps-rise { animation: lamps-rise 600ms ease-out both; }
  @media (prefers-reduced-motion: reduce) { .lamps-fete, .lamps-fete [data-sway], .lamps-fete [data-breathe], .lamps-rise { animation: none; } }
`;

/** One of the lamps' own pictures, cut out of the scenery's picture: its pixels kept square. `wide`: as wide as the box, and as high as it comes to. `shadow`: only its shape, dark. */
function Art({ sprite, box, wide = false, shadow = false }: { sprite: Sprite | null; box: number; wide?: boolean; shadow?: boolean }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: wide ? box / 3 : box }} />;
  const [x, y, w, h] = sprite.at, k = box / (wide ? w : Math.max(w, h));
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: wide ? h * k : box }}>
      <span style={{ width: w * k, height: h * k, backgroundImage: `url(${sprite.src})`, backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`, backgroundPosition: `${-x * k}px ${-y * k}px`, imageRendering: "pixelated", ...(shadow ? { filter: "brightness(0)", opacity: 0.35 } : {}) }} />
    </span>
  );
}

/**
 * The three steps, the one to do now lit and those done ticked (`at`: 0 to 2). Over the buttons, on a narrow screen,
 * only the step to do now is written out and the other two are their numbers (three columns of wrapped words stood as
 * tall as the map there); the board's panel (`wide`) writes all three, one under the other.
 */
function Steps({ th, at, wide = false }: { th: boolean; at: number; wide?: boolean }) {
  return (
    <ol className={wide ? "grid grid-cols-1 gap-1.5" : "flex gap-1.5"} data-lamps-steps={at}>
      {STEPS.map((s, i) => (
        <li key={i} data-now={i === at} aria-label={th ? s[0] : s[1]}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-label leading-snug ${wide || i === at ? "min-w-0 flex-1" : "shrink-0 sm:min-w-0 sm:flex-1"} ${i === at ? "border-gold/70 bg-gold/15 font-semibold text-ink" : i < at ? "border-line bg-bg/60 text-jade" : "border-line bg-bg/60 text-muted"}`}>
          <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full font-data tabular-nums ${i === at ? "bg-gold text-bg" : "bg-surface text-muted"}`}>{i < at ? "✓" : i + 1}</span>
          <span className={`min-w-0 ${wide || i === at ? "" : "hidden sm:inline"}`}>{th ? s[0] : s[1]}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A button that is held, for tired hands (lib/town/lamps' `holdFor`): it fills while it is held, and the post is lit
 * when it is full. Let go of early, nothing is done and nothing is lost (`onEarly` says so). **Nothing to be quick
 * at, and it cannot fail**: by the mouse, a finger, or the space bar and Enter held down. (As the bridge's is.)
 */
function HoldButton({ secs, onDone, onEarly, disabled, className, children }: { secs: number; onDone: () => void; onEarly: () => void; disabled: boolean; className: string; children: ReactNode }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), done = useRef(onDone);
  done.current = onDone;
  const stop = useCallback((early: boolean) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; if (early) onEarly(); }
    setHolding(false);
  }, [onEarly]);
  const start = useCallback(() => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); done.current(); }, secs * 1000);
  }, [disabled, secs]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <button type="button" disabled={disabled} data-lamps-light="hold" data-hold={secs} data-holding={holding}
            onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button !== 0) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture: held all the same */ } start(); }}
            onPointerUp={() => stop(true)} onPointerCancel={() => stop(false)} onBlur={() => stop(false)} onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) start(); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stop(true); } }}
            className={`${className} relative select-none overflow-hidden`} style={{ touchAction: "none", WebkitTouchCallout: "none" }}>
      <span aria-hidden className="absolute inset-0 origin-left bg-gold/40" data-lamps-fill style={{ transform: `scaleX(${holding ? 1 : 0})`, transition: holding ? `transform ${secs}s linear` : "transform 200ms ease-out" }} />
      <span className="relative flex min-w-0 items-center gap-2">{children}</span>
    </button>
  );
}

/* ── light, as pictures made once ────────────────────────────────────────── */

const lights = new Map<string, HTMLCanvasElement>();
/**
 * A round light of a colour, as a picture made once and laid at whatever size and strength it is wanted (as the map's
 * own lights are): `soft` fades from its heart to nothing at its rim; `ring` is whole to most of its width and has
 * a soft edge, which is what takes the night's tint away round a lamp.
 */
function lightPicture(rgb: string, kind: "soft" | "ring" = "soft"): HTMLCanvasElement {
  const key = `${kind}|${rgb}`;
  let c = lights.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const fill = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    // (a lit post's ring: the whole of the day's colours through the rule's six tiles, which is 1 / EDGE of this picture's
    // reach, and a soft edge of a little over half a tile beyond them; it was whole only to five tiles and a bit)
    const stops: Array<[number, number]> = kind === "ring" ? [[0, 1], [1 / EDGE, 1], [0.96, 0.5], [1, 0]] : [[0, 1], [0.22, 0.72], [0.5, 0.3], [0.78, 0.08], [1, 0]];
    for (const [at, a] of stops) fill.addColorStop(at, `rgba(${rgb},${a})`);
    g.fillStyle = fill;
    g.fillRect(0, 0, 128, 128);
  }
  lights.set(key, c);
  return c;
}
/** Lay a light on the canvas: its middle at (x, y), so wide and so high either way, at a strength. */
function lay(ctx: CanvasRenderingContext2D, pic: HTMLCanvasElement, x: number, y: number, rx: number, ry: number, alpha: number) {
  if (alpha <= 0.004) return;
  const was = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = was * Math.min(1, alpha);
  ctx.drawImage(pic, x - rx, y - ry, 2 * rx, 2 * ry);
  ctx.globalAlpha = was;
}

/* ── the ways out from a fire, worked out once a map ─────────────────────── */

const lengthOf = (path: readonly Vec[]): number => { let d = 0; for (let i = 1; i < path.length; i++) d += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); return d; };
/** The point so far along a path, and which way the path runs there. */
function pointAt(path: readonly Vec[], far: number): { at: Vec; dir: Vec } {
  let left = Math.max(0, far);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg > 0 && (left <= seg || i === path.length - 1)) { const t = Math.min(1, left / seg); return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg } }; }
    left -= seg;
  }
  return { at: path[path.length - 1] ?? { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
}
interface Ways { arms: Vec[][]; shrooms: Vec[]; stream: Vec[] }
const ways = new Map<LampMap, Ways>();
/**
 * What goes along a map's ways is laid out from them once: each arm as anybody walks it from the fire out to its
 * last post (lib/town/world's `findPath`, from post to post); where glowing mushrooms line the forest's trail (every
 * couple of tiles along each arm, a little to one side and the other in turn, never on water or where a tree
 * stands); and a scatter of the forest stream's own tiles, for the fireflies over it.
 */
function waysOf(map: LampMap): Ways {
  const known = ways.get(map);
  if (known) return known;
  const [fx, fy] = LAMPS.maps[map].fire;
  // (the camp's fire is not stood on: from a tile beside it that is)
  const start = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => ({ x: fx + dx, y: fy + dy })).find((t) => walkable(t.x, t.y)) ?? { x: fx, y: fy };
  const arms = ARMS[map].map((arm) => {
    const out: Vec[] = [{ x: start.x + 0.5, y: start.y + 0.5 }];
    let from = out[0];
    for (const i of arm) { const [px, py] = LAMPS.maps[map].posts[i], to = { x: px + 0.5, y: py + 0.5 }; out.push(...(findPath(from, to) ?? [to])); from = to; }
    return out;
  });
  const shrooms: Vec[] = [], stream: Vec[] = [];
  if (map === "forest") {
    for (const arm of arms) {
      const whole = lengthOf(arm);
      for (let far = 3, n = 0; far < whole - 1; far += 2.3, n++) {
        const { at, dir } = pointAt(arm, far), side = n % 2 ? 1 : -1, p = { x: at.x - dir.y * 1.15 * side, y: at.y + dir.x * 1.15 * side };
        const tx = Math.floor(p.x), ty = Math.floor(p.y), ground = groundAt(tx, ty);
        if (walkable(tx, ty) && ground !== "water" && ground !== "road") shrooms.push(p);
      }
    }
    for (let v = 0; v < FOREST.h; v++) for (let u = 0; u < FOREST.w; u++) {
      if ((u * 7 + v * 13) % 9 === 0 && groundAt(FOREST.x + u, FOREST.y + v) === "water") stream.push({ x: FOREST.x + u + 0.5, y: FOREST.y + v + 0.5 });
    }
  }
  const made = { arms, shrooms, stream };
  ways.set(map, made);
  return made;
}

/**
 * The lamp relay at dusk (lib/town/lamps; the owner, 2026-10-08: "ส่งไฟจุดโคมตอนค่ำ เหลือไฟในมือ 5 วินาทีพอ ยิ่งจุดเยอะ แมพยิ่งสวย
 * ขอให้เป็นบรรยากาศสวยๆน่าจดจำไปเลย"; and of every such piece: "ขอ UI ดีๆเท่าที่จะเป็นไปได้ mini game เข้าใจไม่ยาก ถ้าเข้าใจยาก
 * เขียนวิธีเล่นไว้คร่าวๆด้วย").
 *
 * From half past five in the evening until five in the morning the farm and the forest each have a fire (a brazier
 * beside the farm's well; the forest's camp fire) and twelve lamp posts along their ways. Standing by
 * the fire with empty hands, a button takes a flame (a tap on the brazier walks up to it and takes one). The flame
 * is seen in my hands by everybody, with a ring of ten embers round my feet that go out one by one: five seconds.
 * A tap on a dark post walks to it and lights it on arriving; standing by one, a button lights it. Whoever stands
 * still with empty hands within three tiles is offered by name, three at the most, those further from the fire
 * first: a press, and the flame is theirs, fresh again. With nobody to offer, whoever stands close by is named with
 * what they lack.
 *
 * **Nobody is ever unsure what to do, nothing is lost by a slip, nothing is gated by quick hands, and everybody who
 * took part is counted and named**:
 * - **No board at any stamina.** With none, the same button is held for a little over a second and fills
 *   (`HoldButton`); let go of early, the flame is where it was; held to the end the post is lit (the keeper counts
 *   a flame good for that much longer in tired hands).
 * - **A flame that goes out costs nothing**, and that is said when it does.
 * - **How it is done is said in three steps, the one to do now lit**: over the buttons at the fire and while a flame
 *   is borne, and on the board that stands by each fire.
 * - **Every hand sees what it earned**: when a post is lit by a flame that went through my hands, wherever I stand,
 *   "+3 helpers' points" and how many of the map's lamps are lit; a tap on a lit post says whose hands lit it.
 * - **The board by each fire**: the three steps, how many are lit tonight of twelve, the night's lighters in the
 *   order they came (no numbers, no ranking), and how many nights the village has lit every lamp of this map. A tap
 *   on the board opens it, and so does a button on the fire's card, which says how many are lit (on a phone the card
 *   lies over the board itself).
 *
 * **What a lit lamp does, and what the night becomes** (all drawn from prepared pictures, slowly, nothing that
 * flickers; what moves stands still for whoever asked for less motion):
 * - every lit post **takes the night's tint away for six tiles round it**, for everybody: real daylight, not a glow
 *   over the dark (`dark`: the hour's tint is laid from a small picture of its own in which each lamp in sight has a
 *   ring of no tint at all, whole to most of the six tiles and soft at its edge), coming up over three seconds, with
 *   a faint warmth of the lamp's own on it. **Outside the rings the dark is laid exactly as the map lays it, and
 *   nothing is seen less than before. A ring only shows: what the forest gives by night, what the firefly lantern
 *   finds and how far the forest walker's lamp reaches are their own rules', which this never asks or changes**; the flowers round a farm post open and moths circle its lantern; the mushrooms
 *   round a forest post glow and a warm light stands in the branches over it;
 * - from four lit: fireflies along the farm's lane between lit posts; fireflies over the forest's stream;
 * - from eight: the farm's four great pumpkins glow from within; glowing mushrooms line the forest's trail;
 * - all twelve, "คืนโคมเต็ม": sky lanterns rise from every post of the farm, one by one, and the well's water gives
 *   the light back; the great tree's lights drift out along the forest's trail, and the waterfall glows. Everybody
 *   on the map sees a short celebration with the names of the night's lighters.
 * By night a dark post shows a faint twinkle, so that it can be found.
 *
 * What is kept is the keeper's: for a member the database's (v163), in `next dev`'s test room the browser's trial. A
 * keeper that knows of no lamps (the database before v163) shows nothing at all: no post, no brazier.
 */
export default function TownLamps({ keeper, me, th, here, place, people, sfx, phone, tabbar, register, bear }: {
  keeper: Keeper;
  me: string;
  th: boolean;
  /** The tile I stand still on, while nothing else is open over the map; null otherwise. */
  here: [number, number] | null;
  /** Which of the maps that have lamps I am on, if either. */
  place: LampMap | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Bearer[];
  sfx: FishSfx | null;
  phone: boolean;
  tabbar: boolean;
  /** Hand the map what it asks of the lamps as it draws (and take it back with null). */
  register: (hooks: LampsHooks | null) => void;
  /** Tell the room of the flame I bear: the moment it dies, or 0 for none. */
  bear: (until: number) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const lamps = keeper.lamps(), known = !!lamps;
  const now = keeper.now(), night = known ? nightOf(now) : null, fresh = night !== null && lamps?.night === night;
  const purse = keeper.purse(), hand = handOf(purse), tired = isSpent(purse, now), stone = !!keeper.works()?.carried;
  // (Whoever keeps the game counts a tired lighter's flame good for the hold longer, so that a hold begun in time cannot
  // fail. The page has to keep its button for as long: taken away at the flame's own end, the hold was cut off under
  // the finger and no lighting was ever asked for.)
  const flame = lamps?.flame ?? null, left = leftOf(flame, now), bearing = left > 0 || (!!flame && tired && now < flame.until + LAMPS.hold * 1000);
  const mine = place && lamps ? lamps.maps[place] : null;
  const litHere = fresh && mine ? mine.lit : [];
  const litKey = litHere.map((l) => l.post).join(",");
  const of = place ? postsOf(place) : 0, whole = !!place && litHere.length >= of;

  // The lamps' own pictures: fetched once there are lamps to show, and the scenery they were added to kept for the map.
  const kit = useRef<SceneryKit | null>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (!known) return;
    let gone = false;
    void loadLampsArt().then((k) => { if (!gone) { kit.current = k; setDrawn(true); } }).catch(() => { /* no picture: nothing is drawn, and the buttons work all the same */ });
    return () => { gone = true; };
  }, [known]);
  const art = (name: string) => (drawn ? kit.current?.sprite(name) ?? null : null);

  // The room is told of the flame I bear, so that every page draws it with what is left of it.
  const until = bearing && flame ? flame.until : 0;
  useEffect(() => { bear(until); }, [until, bear]);
  // While I am where there are lamps by night, they are read again now and then (a flame handed to me and every post
  // lit are told through the room at once; this is for a word the room lost).
  const watching = known && !!place && night !== null;
  useEffect(() => (watching ? keeper.look("lamps") : undefined), [keeper, watching]);
  // The night begins and ends by the clock: when what was told is of another night than it is, it is asked for again.
  useEffect(() => {
    if (!known) return;
    const again = setInterval(() => { if (nightOf(keeper.now()) !== (keeper.lamps()?.night ?? null)) void keeper.lampsLook(); setTick((n) => n + 1); }, 20_000);
    return () => clearInterval(again);
  }, [keeper, known]);
  // And the map's ways are laid out once I am on it (not in the middle of a frame).
  useEffect(() => { if (known && place) waysOf(place); }, [known, place]);

  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3800); return () => clearTimeout(t); }, [note]);
  const [busy, setBusy] = useState(false);
  const say = useCallback((words: Record<string, [string, string]>, why: string) => { const w = words[why] ?? words.far; setNote(th ? w[0] : w[1]); }, [th]);
  const hereRef = useRef(here), placeRef = useRef(place), lampsRef = useRef<LampsTold | null>(lamps), busyRef = useRef(false), thRef = useRef(th);
  hereRef.current = here; placeRef.current = place; lampsRef.current = lamps; thRef.current = th;

  // What is left of my flame is counted on the page while I bear one: four times a second, and at the moment it dies.
  useEffect(() => {
    if (!bearing || !flame) return;
    const each = setInterval(() => setTick((n) => n + 1), 250), end = setTimeout(() => setTick((n) => n + 1), Math.max(0, flame.until - keeper.now()) + 30);
    return () => { clearInterval(each); clearTimeout(end); };
  }, [bearing, flame, keeper]);
  // who stands where is the map's, and changes without anything of the keeper's changing: looked at five times a second while I stand with a flame
  // (twice a second until a flame lived three seconds: half a second of not seeing a friend stop is a sixth of it)
  const looking = bearing && !!here;
  useEffect(() => {
    if (!looking) return;
    const t = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(t);
  }, [looking]);

  const atFire = !!here && !!place && byTile(here, LAMPS.maps[place].fire);
  const byPost = place && here && fresh ? postBy(place, here, litHere.map((l) => l.post)) : -1;
  // (a flame goes the way out from the fire it was taken at: on a map with no lamps, from the farm's)
  const found = looking && here ? takers(me, { x: here[0] + 0.5, y: here[1] + 0.5 }, people(), place ?? "farm", now) : null;
  const offered = found?.offered ?? [], lacks = found?.lacks ?? null;
  const nameOf = useCallback((id: string, told = "") => told || people().find((p) => p.id === id)?.name || "", [people]);
  const called = (who: Named) => nameOf(who.id, who.name) || (th ? "ชาวบ้าน" : "A villager");
  const names = (list: Named[]) => list.map(called).join(th ? " · " : ", ");

  /** A flame of my own taking is no news to me, and one I lit a post with or handed on did not go out. */
  const taking = useRef(false), spent = useRef(false);
  const take = useCallback(async () => {
    const at = hereRef.current, map = placeRef.current;
    if (!at || !map || busyRef.current) return;
    busyRef.current = true; setBusy(true); taking.current = true;
    const did = await keeper.flameTake(map, at);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { taking.current = false; say(WHY, did.why); return; }
    // (whatever was being said is of before the flame)
    setNote(null);
    sfx?.wake();
    sfx?.work("pick", 0.7);
  }, [keeper, sfx, say]);
  const light = useCallback(async (post: number) => {
    const at = hereRef.current, map = placeRef.current;
    if (!at || !map || busyRef.current) return;
    busyRef.current = true; setBusy(true); spent.current = true;
    const did = await keeper.lampLight(map, post, at);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { spent.current = false; say(WHY, did.why); return; }
    // (what it earned, and the night every lamp is lit, are said by what the keeper tells of the lamps then: below)
    sfx?.wake();
    sfx?.chime(did.n, did.full);
  }, [keeper, sfx, say]);
  /** Hand the flame on to somebody: it is in their hands, fresh, and they are told through the room. Refused (they took a thing up meanwhile), the flame is where it was, and why is said. */
  const passTo = useCallback(async (to: { id: string; name: string }) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); spent.current = true;
    const did = await keeper.flamePass(to.id);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { spent.current = false; say(WHY_PASS, did.why); return; }
    sfx?.wake();
    sfx?.work("pick", 0.5);
    setNote(thRef.current ? `ส่งไฟให้ ${to.name || "เพื่อน"} แล้ว` : `Handed to ${to.name || "them"}`);
  }, [keeper, sfx, say]);
  const early = useCallback(() => say(WHY, "early"), [say]);
  const putAway = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    await keeper.hold(null);
    busyRef.current = false; setBusy(false);
  }, [keeper]);

  // ── what the keeper's telling of the lamps has new in it, said once each ──
  // A flame that came into my hands by somebody's hand; a flame of mine that went out; a post lit by a flame that
  // went through my hands (wherever I stand); and the last lamp of the map I am on (to everybody on it).
  const [gift, setGift] = useState(false);
  useEffect(() => { if (!gift) return; const t = setTimeout(() => setGift(false), GIFT_MS); return () => clearTimeout(t); }, [gift]);
  const [earned, setEarned] = useState<{ n: number; lit: number; of: number; map: LampMap; past: boolean } | null>(null);
  useEffect(() => { if (!earned) return; const t = setTimeout(() => setEarned(null), EARNED_MS); return () => clearTimeout(t); }, [earned]);
  const [fete, setFete] = useState<{ map: LampMap; names: Named[]; nights: number } | null>(null);
  useEffect(() => { if (!fete) return; const t = setTimeout(() => setFete(null), FETE_MS); return () => clearTimeout(t); }, [fete]);
  const was = useRef<{ night: number | null; bearing: boolean; lit: Record<LampMap, Set<number>> } | null>(null);
  const toldKey = lamps ? `${lamps.night}|${LAMP_MAPS.map((m) => lamps.maps[m].lit.map((l) => l.post).join(",")).join("|")}` : "";
  useEffect(() => {
    const before = was.current, told = lampsRef.current;
    was.current = told ? { night: told.night, bearing, lit: { farm: new Set(told.maps.farm.lit.map((l) => l.post)), forest: new Set(told.maps.forest.lit.map((l) => l.post)) } } : null;
    if (!before || !told) return;
    if (bearing && !before.bearing) {
      if (taking.current) taking.current = false;
      else { setGift(true); sfx?.wake(); sfx?.work("pick", 0.7); }
    }
    if (!bearing && before.bearing) {
      if (spent.current) spent.current = false;
      else say(WHY, "out");
    }
    if (told.night === null || told.night !== before.night) return;
    for (const map of LAMP_MAPS) {
      const fresh_ = told.maps[map].lit.filter((l) => !before.lit[map].has(l.post));
      if (!fresh_.length) continue;
      const mineOf = fresh_.filter((l) => l.hands.some((h) => h.id === me || h.id === keeper.id)).length;
      // (three helpers' points a post; past the day's bound of theirs a point counts a quarter: lib/town/lines)
      if (mineOf) setEarned({ n: mineOf, lit: told.maps[map].lit.length, of: postsOf(map), map, past: pastBound("helpers", keeper.lines()?.lines.helpers.today ?? 0) });
      if (map === placeRef.current && told.maps[map].lit.length >= postsOf(map) && before.lit[map].size < postsOf(map)) {
        setFete({ map, names: told.maps[map].lighters, nights: told.maps[map].full });
        sfx?.wake();
        sfx?.chime(12, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by what the lamps tell, not by the sound's identity or who is where
  }, [toldKey, bearing]);

  // ── the board's panel ──
  const [panel, setPanel] = useState(false);
  /** What a tap asked for and I am walking to: the brazier (a flame is taken on arriving), a board (its panel opens), or a post (it is lit). */
  const want = useRef<"fire" | "board" | { post: number } | null>(null);
  const byBoard = !!here && !!place && byTile(here, BOARD_AT[place], READ);
  // (it is read from by the board, and from by the fire: the fire's card has a button for it, since on a phone the card lies over the board itself)
  const mayRead = byBoard || (!!here && !!place && byTile(here, LAMPS.maps[place].fire));
  useEffect(() => { if (!mayRead) setPanel(false); }, [mayRead]);
  useEffect(() => { if (panel) void keeper.lampsLook(); }, [panel, keeper]);
  useEffect(() => {
    if (!panel) return;
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setPanel(false); } };
    const again = setInterval(() => void keeper.lampsLook(), 15_000);
    window.addEventListener("keydown", down);
    return () => { window.removeEventListener("keydown", down); clearInterval(again); };
  }, [panel, keeper]);
  // Walked up to what was tapped: the flame is taken, the board is read, or the post is lit (with stamina: tired hands hold the button, which stands lit over the map then).
  const hereKey = here ? `${here[0]},${here[1]}` : "";
  const tiredRef = useRef(tired);
  tiredRef.current = tired;
  useEffect(() => {
    const at = hereRef.current, map = placeRef.current, w = want.current;
    if (!w || !at || !map) return;
    if (w === "fire") { if (byTile(at, LAMPS.maps[map].fire)) { want.current = null; void take(); } }
    else if (w === "board") { if (byTile(at, BOARD_AT[map], READ)) { want.current = null; setPanel(true); } }
    else if (byTile(at, LAMPS.maps[map].posts[w.post])) { want.current = null; if (!tiredRef.current) void light(w.post); }
  }, [hereKey, take, light]);

  // ── what the map draws, and what it asks ──
  const boxes = useRef<{ fire: Box | null; board: Box | null; posts: Array<[number, Box]> }>({ fire: null, board: null, posts: [] });
  /** The rings of the lamps in sight this frame, for the night's dark to be lifted in: where on the screen, how wide and high, how far up its light has come. */
  const rings = useRef<Array<{ x: number; y: number; rx: number; ry: number; k: number }>>([]);
  const shade = useRef<HTMLCanvasElement | null>(null), tintWas = useRef<readonly [number, number, number] | null>(null);
  /** The map's scale and whether it stands still, as the last frame had them: what a bearer's flame is drawn by. */
  const view = useRef({ s: 1, still: false, dark: 0 });
  useEffect(() => {
    const draw = (frame: FarmFrame) => {
      const { ctx, things, project, s, now: t, still, self, over, dark = 0 } = frame;
      view.current = { s, still, dark };
      rings.current = [];
      boxes.current = { fire: null, board: null, posts: [] };
      const k = kit.current, told = lampsRef.current, map = self ? placeOf(Math.floor(self.x), Math.floor(self.y)) : null;
      if (!k || !told || !over || !isLampMap(map)) return;
      const px = Math.abs(ctx.getTransform().a) || 1, cw = ctx.canvas.width / px, ch = ctx.canvas.height / px;
      const clock = keeper.now(), tonight = nightOf(clock), isNight = tonight !== null, lit = new Map<number, LitTold>(isNight && told.night === tonight ? told.maps[map].lit.map((l) => [l.post, l]) : []);
      const tier = tierOf(lit.size, postsOf(map));
      // (how bright the lamps' light is: as the town's own lamps go by the hour, never less than a third by night)
      const lum = isNight ? Math.max(0.36, Math.min(1, 0.3 + 0.7 * dark)) : 0;
      const breath = still ? 0.94 : 0.9 + 0.07 * Math.sin(t / 1900) + 0.03 * Math.sin(t / 830 + 1.1);
      const inSight = (c: Vec, rx: number, ry: number) => c.x > -rx && c.x < cw + rx && c.y > -ry && c.y < ch + ry;
      const tile = (x: number, y: number) => project({ x: x + 0.5, y: y + 0.62 });
      const boxOf = (name: string, at: Vec, z: number, pad = 0, dx = 0): Box => { const [pw, ph] = k.sizeOf(name), [ax, ay] = k.anchorOf(name); return { x0: at.x + dx - ax * z - pad, y0: at.y - ay * z - pad, x1: at.x + dx + (pw - ax) * z + pad, y1: at.y + pad }; };
      const ringOf = (reach: number) => { const rx = reach * (TILE_W / 2) * 1.42 * s; return [rx, rx / 2] as const; };
      const soft = (rgb: string) => lightPicture(rgb);

      // ── the fire: the farm's brazier (the forest's is the camp's own, which the map draws), and the board by it
      const [fx, fy] = LAMPS.maps[map].fire, fire = tile(fx, fy);
      if (map === "farm" && k.has("brazier") && inSight(fire, 80 * s, 120 * s)) {
        const name = isNight && k.has("brazierLit") ? "brazierLit" : "brazier", z = s * FIRE_K;
        boxes.current.fire = boxOf(name, fire, z, 4);
        things.push({ depth: fx + fy + 1, draw: () => k.drawProp(ctx, name, fire.x, fire.y, z, px) });
      }
      // (the brazier's own warm light on the ground, as the camp's fire has the map's: added over the dark, which it
      // does not lift. **Only a lit post takes the night's tint away**: the dark about a fire is as it was)
      if (isNight && map === "farm" && inSight(fire, 160 * s, 120 * s)) over(() => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        lay(ctx, soft(WARMER), fire.x, fire.y - 22 * s, 46 * s, 46 * s, 0.5 * lum * breath);
        lay(ctx, soft(WARMER), fire.x, fire.y + 4 * s, 150 * s, 75 * s, 0.22 * lum * breath);
        ctx.restore();
      });
      const [bx, by] = BOARD_AT[map], board = tile(bx, by);
      if (k.has("lampBoard") && inSight(board, 60 * s, 90 * s)) {
        const z = s * BOARD_K;
        boxes.current.board = boxOf("lampBoard", board, z, 3);
        things.push({ depth: bx + by + 1, draw: () => k.drawProp(ctx, "lampBoard", board.x, board.y, z, px) });
      }

      // ── the posts: dark or lit, each with what grows round it
      const z = s * POST_K, [ringX, ringY] = ringOf(LAMPS.light * EDGE);
      const round = map === "farm" ? ["bloomShut", "bloomOpen", BLOOM_K] as const : ["shroom", "shroomGlow", SHROOM_K] as const;
      LAMPS.maps[map].posts.forEach(([x, y], i) => {
        const at = tile(x, y), l = lit.get(i) ?? null;
        if (!inSight(at, ringX, ringY + 90 * s)) return;
        const rise = !l ? 0 : still ? 1 : Math.max(0, Math.min(1, (clock - l.at) / RISE_MS));
        // (the post's own foot is on the tile's point: its picture has the lantern hanging out to one side of it)
        const [pw] = k.sizeOf("lampPost"), dx = (pw / 2 - POST.foot) * z, lantern = { x: at.x + (POST.lantern - POST.foot) * z, y: at.y - POST.up * z };
        const name = l && rise > 0.12 && k.has("lampPostLit") ? "lampPostLit" : "lampPost";
        if (k.has(name)) {
          boxes.current.posts.push([i, boxOf(name, at, z, 4, dx)]);
          things.push({ depth: x + y + 1, draw: () => k.drawProp(ctx, name, at.x + dx, at.y, z, px) });
        }
        // (what grows round it: shut and plain by day and by a dark post, open and glowing by a lit one)
        const grown = l && rise > 0.55 ? round[1] : round[0];
        if (k.has(grown)) for (const [j, [ox, oy]] of ROUND.entries()) {
          if (map === "forest" && j === 2) continue;
          const c = project({ x: x + 0.5 + ox, y: y + 0.62 + oy });
          things.push({ depth: x + ox + y + oy + 1, draw: () => k.drawProp(ctx, grown, c.x, c.y, s * round[2], px, 0, j === 1) });
        }
        if (!isNight) return;
        if (!l) {
          // by night a dark post is found by a faint twinkle at its lantern, which comes and goes slowly
          if (k.has("twinkle")) over(() => {
            const [, th_] = k.sizeOf("twinkle");
            ctx.save();
            ctx.globalAlpha = still ? 0.5 : 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t / 1500 + i * 1.7));
            k.drawProp(ctx, "twinkle", lantern.x, lantern.y + (th_ / 2) * s * MARK_K, s * MARK_K, px);
            ctx.restore();
          });
          return;
        }
        rings.current.push({ x: at.x, y: at.y, rx: ringX, ry: ringY, k: rise });
        over(() => {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          // (the ring itself is the day come back, laid by `dark`: this is only the lamp's own warmth on it, faint,
          // and a heart at the lantern)
          lay(ctx, soft(WARM), at.x, at.y - 2 * s, ringX * 0.7, ringY * 0.7, 0.12 * lum * rise * breath);
          lay(ctx, soft(WARM), lantern.x, lantern.y, 30 * s, 30 * s, 0.6 * lum * rise * breath);
          // (the forest's lamps stand under trees: a warm light in the branches over them)
          if (map === "forest") lay(ctx, soft(WARMER), at.x, at.y - 84 * s, 110 * s, 70 * s, 0.16 * lum * rise * breath);
          else if (rise > 0.55 && k.has("moth")) {
            // two moths round the lantern, slowly, their wings open and half folded in turn
            ctx.globalCompositeOperation = "source-over";
            for (let m = 0; m < 2; m++) {
              const turn = still ? m * 2.6 + i : t / 2300 + m * Math.PI + i, wing = !still && Math.floor(t / 420 + m) % 2 ? "mothShut" : "moth";
              const mx = lantern.x + Math.cos(turn) * (15 + 3 * m) * s, my = lantern.y + (Math.sin(turn) * 6 + Math.sin(turn * 2.3 + m) * 2) * s;
              const [, mh] = k.sizeOf(wing);
              k.drawProp(ctx, wing, mx, my + (mh / 2) * s * MOTH_K, s * MOTH_K, px, 0, Math.sin(turn) > 0);
            }
          } else if (rise > 0.55 && k.has("shroomGlow")) {
            // the mushrooms' own cool light
            for (const [j, [ox, oy]] of ROUND.entries()) { if (j === 2) continue; const c = project({ x: x + 0.5 + ox, y: y + 0.62 + oy }); lay(ctx, soft(COOL), c.x, c.y - 9 * s, 22 * s, 16 * s, 0.34 * lum * breath); }
          }
          ctx.restore();
        });
      });
      if (!isNight || tier < 1) return;
      const made = ways.get(map);

      // ── from four lit: fireflies
      /** A firefly at a point of the screen: the speck in a soft halo, glowing and going dim on its own slow beat. */
      const fly = (c: Vec, beat: number) => {
        const a = still ? 0.8 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t / 1700 + beat * 1.9));
        lay(ctx, soft(LEAF), c.x, c.y, 9 * s, 9 * s, 0.55 * a);
        ctx.globalAlpha = a;
        if (k.has("firefly")) { const [, fh] = k.sizeOf("firefly"); k.drawProp(ctx, "firefly", c.x, c.y + (fh / 2) * s * FLY_K, s * FLY_K, px); }
        ctx.globalAlpha = 1;
      };
      if (map === "farm") {
        // along the lane, between two posts that are both lit (the brazier is the first of every arm)
        const spans: Array<[Vec, Vec, number]> = [];
        for (const arm of ARMS.farm) arm.forEach((post, j) => {
          if (!lit.has(post) || (j > 0 && !lit.has(arm[j - 1]))) return;
          const [ax, ay] = j > 0 ? LAMPS.maps.farm.posts[arm[j - 1]] : LAMPS.maps.farm.fire, [px_, py_] = LAMPS.maps.farm.posts[post];
          spans.push([{ x: ax + 0.5, y: ay + 0.5 }, { x: px_ + 0.5, y: py_ + 0.5 }, post]);
        });
        if (spans.length) over(() => {
          ctx.save();
          for (const [a, b, post] of spans) for (let f = 0; f < 5; f++) {
            const beat = post * 5 + f, along = (((f + 0.5) / 5 + (still ? 0 : t / 46_000) + post * 0.13) % 1 + 1) % 1, side = still ? 0.3 : Math.sin(t / 3100 + beat * 2.1) * 0.7;
            const c = project({ x: a.x + (b.x - a.x) * along + side * 0.5, y: a.y + (b.y - a.y) * along + side });
            if (inSight(c, 20 * s, 60 * s)) fly({ x: c.x, y: c.y - (26 + (still ? 0 : 8 * Math.sin(t / 2300 + beat))) * s }, beat);
          }
          ctx.restore();
        });
      } else if (made?.stream.length) over(() => {
        // over the stream: each about its own spot of the water
        ctx.save();
        for (const [f, spot] of made.stream.entries()) {
          const c = project({ x: spot.x + (still ? 0 : Math.sin(t / 3700 + f * 1.3) * 0.8), y: spot.y + (still ? 0 : Math.cos(t / 4300 + f * 0.9) * 0.6) });
          if (inSight(c, 20 * s, 60 * s)) fly({ x: c.x, y: c.y - (16 + (still ? 0 : 7 * Math.sin(t / 2100 + f))) * s }, f);
        }
        ctx.restore();
      });
      if (tier < 2) return;

      // ── from eight lit: the farm's great pumpkins glow from within; glowing mushrooms line the forest's trail
      if (map === "farm") over(() => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const [n, [u, v]] of FARM_PUMPKINS.entries()) {
          const c = project({ x: FARM.x + u + 0.55, y: FARM.y + v + 0.6 });
          if (!inSight(c, 60 * s, 60 * s)) continue;
          const beat = still ? 0.9 : 0.8 + 0.2 * Math.sin(t / 1600 + n * 1.4);
          lay(ctx, soft(WARMER), c.x, c.y - 13 * s, 15 * s, 12 * s, 0.75 * lum * beat);
          lay(ctx, soft(WARM), c.x, c.y - 10 * s, 40 * s, 28 * s, 0.3 * lum * beat);
        }
        ctx.restore();
      });
      else if (made && k.has("shroomOne")) {
        const seen: Vec[] = [];
        for (const p of made.shrooms) {
          const c = project(p);
          if (!inSight(c, 20 * s, 30 * s)) continue;
          seen.push(c);
          things.push({ depth: p.x + p.y, draw: () => k.drawProp(ctx, "shroomOne", c.x, c.y, s * ONE_K, px) });
        }
        if (seen.length) over(() => {
          ctx.save();
          for (const [n, c] of seen.entries()) {
            const beat = still ? 0.85 : 0.7 + 0.3 * Math.sin(t / 2200 + n * 0.8);
            // (seen in the dark as it is, in its own cool light)
            ctx.globalAlpha = 0.9 * beat;
            k.drawProp(ctx, "shroomOne", c.x, c.y, s * ONE_K, px);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "lighter";
            lay(ctx, soft(COOL), c.x, c.y - 7 * s, 13 * s, 10 * s, 0.4 * lum * beat);
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.restore();
        });
      }
      if (tier < 3) return;

      // ── every lamp lit, "คืนโคมเต็ม"
      if (map === "farm") over(() => {
        // sky lanterns rise from every post, one after another, slowly, and are gone far up; the well's water gives the light back
        ctx.save();
        if (k.has("skyLantern")) for (const [i, [x, y]] of LAMPS.maps.farm.posts.entries()) {
          const at = tile(x, y);
          if (!inSight(at, 60 * s, 420 * s)) continue;
          const life = still ? 0.35 + (i % 4) * 0.12 : (((t - i * 2300) / 27_000) % 1 + 1) % 1;
          const fade = life < 0.08 ? life / 0.08 : life > 0.78 ? Math.max(0, (1 - life) / 0.22) : 1, up = (POST.up + 20 + life * 300) * s;
          const lx = at.x + (POST.lantern - POST.foot) * z + (still ? 0 : Math.sin(t / 2900 + i * 1.3) * 12 * life) * s, ly = at.y - up, kz = s * SKY_K * (1 - 0.3 * life);
          ctx.globalCompositeOperation = "lighter";
          lay(ctx, soft(WARM), lx, ly - 12 * s, 30 * s, 30 * s, 0.42 * fade * lum);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = fade;
          k.drawProp(ctx, "skyLantern", lx, ly, kz, px);
          ctx.globalAlpha = 1;
        }
        const well = tile(WELL.x, WELL.y);
        if (inSight(well, 80 * s, 80 * s)) {
          const beat = still ? 0.9 : 0.75 + 0.25 * Math.sin(t / 2100);
          ctx.globalCompositeOperation = "lighter";
          lay(ctx, soft(WARM), well.x, well.y - 17 * s, 24 * s, 11 * s, 0.6 * lum * beat);
          lay(ctx, soft(WARM), well.x, well.y - 12 * s, 70 * s, 40 * s, 0.2 * lum * beat);
          ctx.globalCompositeOperation = "source-over";
          if (k.has("twinkle")) for (let g = 0; g < 3; g++) {
            const a = still ? 0.7 : Math.max(0, Math.sin(t / 1300 + g * 2.1));
            ctx.globalAlpha = a * 0.9;
            k.drawProp(ctx, "twinkle", well.x + (g - 1) * 8 * s, well.y - (14 + g * 3) * s, s * 0.34, px);
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      });
      else over(() => {
        // the great tree's lights drift out along the trail to the camp, and round the tree itself; the waterfall glows
        ctx.save();
        const trail = made?.arms[1] ?? [], whole = lengthOf(trail);
        const wisp = (c: Vec, a: number) => {
          if (!inSight(c, 30 * s, 60 * s)) return;
          ctx.globalCompositeOperation = "lighter";
          lay(ctx, soft(LEAF), c.x, c.y - 6 * s, 20 * s, 20 * s, 0.5 * a * lum);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = a;
          if (k.has("wisp")) k.drawProp(ctx, "wisp", c.x, c.y, s * WISP_K, px);
          ctx.globalAlpha = 1;
        };
        if (whole > 0) for (let w = 0; w < 9; w++) {
          const life = still ? (w + 0.5) / 9 : ((t / 70_000 + w / 9) % 1 + 1) % 1, p = pointAt(trail, whole * (1 - life)).at;
          const c = project({ x: p.x + (still ? 0 : Math.sin(t / 2700 + w * 1.7) * 0.5), y: p.y + (still ? 0 : Math.cos(t / 3300 + w) * 0.4) });
          wisp({ x: c.x, y: c.y - (30 + (still ? 0 : 9 * Math.sin(t / 1900 + w * 2))) * s }, life < 0.06 ? life / 0.06 : life > 0.9 ? (1 - life) / 0.1 : 1);
        }
        const tree = { x: GREAT_TREE.x + GREAT_TREE.w / 2, y: GREAT_TREE.y + GREAT_TREE.h / 2 };
        for (let w = 0; w < 5; w++) {
          const turn = still ? w * 1.3 : t / 5200 + w * 1.26, c = project({ x: tree.x + Math.cos(turn) * 2.6, y: tree.y + Math.sin(turn) * 2.6 });
          wisp({ x: c.x, y: c.y - (70 + 26 * Math.sin(turn * 1.7 + w)) * s }, still ? 0.8 : 0.55 + 0.45 * Math.sin(t / 1500 + w * 2.2));
        }
        const fall = project(WATERFALL);
        if (inSight(fall, 160 * s, 200 * s)) {
          const beat = still ? 0.9 : 0.78 + 0.22 * Math.sin(t / 2400);
          ctx.globalCompositeOperation = "lighter";
          lay(ctx, soft(PALE), fall.x, fall.y - 60 * s, 64 * s, 116 * s, 0.68 * lum * beat);
          lay(ctx, soft(COOL), fall.x, fall.y + 14 * s, 150 * s, 72 * s, 0.38 * lum * beat);
          ctx.globalCompositeOperation = "source-over";
          if (k.has("twinkle")) for (let g = 0; g < 5; g++) {
            ctx.globalAlpha = (still ? 0.7 : Math.max(0, Math.sin(t / 1400 + g * 1.9))) * 0.9;
            k.drawProp(ctx, "twinkle", fall.x + (g - 2) * 22 * s + Math.sin(g * 7.1) * 9 * s, fall.y + (20 + ((g * 37) % 30)) * s, s * 0.36, px);
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      });
    };

    const tap: LampTap = (x, y, peek = false) => {
      const hit = (b: Box | null) => !!b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
      const b = boxes.current, at = hereRef.current, map = placeRef.current, told = lampsRef.current;
      if (!map || !told) return null;
      const far = (t: Vec) => (at ? Math.hypot(t.x - at[0], t.y - at[1]) : 0);
      /** The tile near enough a place that is nearest me and can be stood on. */
      const beside = (t: readonly [number, number], reach: number): Vec | null => {
        let best: Vec | null = null;
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
          const c = { x: t[0] + dx, y: t[1] + dy };
          if ((dx || dy) && walkable(c.x, c.y) && (!best || far(c) < far(best))) best = c;
        }
        return best;
      };
      const clock = keeper.now(), tonight = nightOf(clock), th_ = thRef.current, words = (w: [string, string]) => setNote(th_ ? w[0] : w[1]);
      if (hit(b.board)) {
        if (peek) return { walk: null };
        if (at && byTile(at, BOARD_AT[map], READ)) { want.current = null; setPanel(true); return { walk: null }; }
        want.current = "board";
        return { walk: beside(BOARD_AT[map], 1) };
      }
      const post = b.posts.find(([, box]) => hit(box))?.[0];
      if (post !== undefined) {
        if (peek) return { walk: null };
        const l = tonight !== null && told.night === tonight ? told.maps[map].lit.find((q) => q.post === post) ?? null : null, tile = LAMPS.maps[map].posts[post];
        want.current = null;
        if (l) {
          // (a lit lamp says whose hands lit it)
          const by = l.hands.map((h) => h.name || people().find((p) => p.id === h.id)?.name || "").filter(Boolean).join(th_ ? " · " : ", ");
          words(by ? [`โคมต้นนี้ติดแล้ว จากมือของ ${by}`, `Lit tonight, from the hands of ${by}`] : ["โคมต้นนี้ติดแล้ว", "This lamp is lit"]);
          return { walk: null };
        }
        if (tonight === null) { words(WHY.day); return { walk: null }; }
        if (leftOf(told.flame, clock) <= 0) { words(["โคมต้นนี้ยังมืด รับไฟที่กองไฟกลางแมพ แล้วพามาจุด", "This lamp is dark. Take a flame at the fire in the middle of the map, and bring it here"]); return { walk: null }; }
        if (at && byTile(at, tile)) { if (!tiredRef.current) void light(post); return { walk: null }; }
        want.current = { post };
        return { walk: beside(tile, LAMPS.near) };
      }
      if (hit(b.fire)) {
        if (peek) return { walk: null };
        want.current = null;
        if (tonight === null) { words(WHY.day); return { walk: null }; }
        if (leftOf(told.flame, clock) > 0) { words(WHY.held); return { walk: null }; }
        if (at && byTile(at, LAMPS.maps[map].fire)) { void take(); return { walk: null }; }
        want.current = "fire";
        return { walk: beside(LAMPS.maps[map].fire, LAMPS.near) };
      }
      if (!peek) want.current = null;
      return null;
    };

    const dark: LampsHooks["dark"] = (ctx, cw, ch, [r, g, b]) => {
      const list = rings.current;
      tintWas.current = [r, g, b];
      if (!list.length) return false;
      const w = Math.max(1, Math.ceil(cw / DARK_K)), h = Math.max(1, Math.ceil(ch / DARK_K));
      const c = (shade.current ??= document.createElement("canvas"));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const to = c.getContext("2d");
      if (!to) return false;
      to.globalCompositeOperation = "source-over";
      to.globalAlpha = 1;
      to.fillStyle = `rgb(${r},${g},${b})`;
      to.fillRect(0, 0, w, h);
      const ring = lightPicture(LIFT, "ring");
      to.imageSmoothingEnabled = true;
      for (const o of list) { to.globalAlpha = o.k; to.drawImage(ring, (o.x - o.rx) / DARK_K, (o.y - o.ry) / DARK_K, (2 * o.rx) / DARK_K, (2 * o.ry) / DARK_K); }
      to.globalAlpha = 1;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(c, 0, 0, w * DARK_K, h * DARK_K);
      ctx.restore();
      return true;
    };

    const flame: LampsHooks["flame"] = (ctx, until, p, h, layer, px, late) => {
      const k = kit.current, { s, still, dark: dim } = view.current, leftNow = until - keeper.now();
      if (!k || leftNow <= 0 || !k.has("flameHeld")) return;
      const glowing = embers(leftNow), t = performance.now();
      if (layer !== "hands") {
        // the ring round their feet: ten embers, going out one by one from the last
        const [, eh] = k.sizeOf("ember"), ez = s * EMBER_K;
        const each = (i: number): [number, number, number, number] => { const a = -Math.PI / 2 + (i + 0.5) * ((2 * Math.PI) / RING); return [p.x + Math.cos(a) * 25 * s, p.y + Math.sin(a) * 11 * s + (eh / 2) * ez, Math.cos(a), Math.sin(a)]; };
        for (let i = 0; i < RING; i++) { const [x, y] = each(i); k.drawProp(ctx, i < glowing ? "ember" : "emberOut", x, y, ez, px); }
        late.push(() => {
          // (the embers that still glow are seen in the dark; not those behind the legs)
          ctx.save();
          for (let i = 0; i < glowing; i++) {
            const [x, y, cx, sy] = each(i);
            if (sy < 0 && Math.abs(cx) < 0.6) continue;
            k.drawProp(ctx, "ember", x, y, ez, px);
            ctx.globalCompositeOperation = "lighter";
            lay(ctx, lightPicture(WARMER), x, y - (eh / 2) * ez, 8 * s, 8 * s, 0.5);
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.restore();
        });
      }
      if (layer !== "feet") {
        const fz = s * HELD_K, x = p.x, y = p.y - h * 0.3;
        k.drawProp(ctx, "flameHeld", x, y, fz, px);
        const front = layer === "hands", breath = still ? 0.94 : 0.9 + 0.08 * Math.sin(t / 900) + 0.02 * Math.sin(t / 370);
        late.push(() => {
          ctx.save();
          if (front) k.drawProp(ctx, "flameHeld", x, y, fz, px);
          ctx.globalCompositeOperation = "lighter";
          const lum = Math.max(0.4, Math.min(1, 0.35 + 0.65 * dim));
          lay(ctx, lightPicture(WARMER), x, y - 12 * s, 26 * s, 26 * s, 0.55 * lum * breath);
          lay(ctx, lightPicture(WARM), p.x, p.y - 4 * s, 76 * s, 38 * s, 0.2 * lum * breath);
          ctx.restore();
        });
      }
    };

    register({ draw, tap, dark, flame });
    return () => register(null);
  }, [register, keeper, people, take, light]);

  // (for scripts in `next dev`: the lamps as kept, the trial's own switches, what is offered, what is said, and each deed)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      lamps: () => keeper.lamps(), night: () => nightOf(keeper.now()), left: () => leftOf(keeper.lamps()?.flame, keeper.now()), place: () => placeRef.current, here: () => hereRef.current,
      toNight: () => keeper.trial?.lampsNight(), lit: (map: LampMap, n: number) => keeper.trial?.lampsLit(map, n), anew: () => keeper.trial?.lampsAnew(), give: (secs?: number, map?: LampMap) => keeper.trial?.lampsFlame(secs, map),
      atFire: () => atFire, byPost: () => byPost, offered: () => offered.map((p) => p.id), lacks: () => (lacks ? { who: lacks.who.id, why: lacks.why } : null), tired: () => tired, hold: () => holdFor(tired),
      take, light, pass: (id: string) => { const to = offered.find((p) => p.id === id); if (to) void passTo(to); },
      idle: () => ({ busy: busyRef.current, panel }), note: () => note, gift: () => gift, earned: () => earned, fete: () => (fete ? { map: fete.map, names: fete.names.map((h) => h.id), nights: fete.nights } : null),
      tier: () => (placeRef.current ? tierOf(litHere.length, postsOf(placeRef.current)) : 0), rings: () => rings.current.length, boxes: () => boxes.current, drawn: () => drawn,
      // (the picture the night's dark was last laid from: the hour's tint, and what it is at a point of the screen: the tint itself outside every ring, no tint at all in a ring's middle)
      tint: () => tintWas.current, shadeAt: (x: number, y: number) => { const c = shade.current, g = c?.getContext("2d"); if (!c || !g || !rings.current.length) return null; const d = g.getImageData(Math.max(0, Math.min(c.width - 1, Math.floor(x / DARK_K))), Math.max(0, Math.min(c.height - 1, Math.floor(y / DARK_K))), 1, 1).data; return [d[0], d[1], d[2]]; },
      ringsAt: () => rings.current.map((o) => ({ ...o })),
      panel: (on = true) => setPanel(on), isPanel: () => panel, ways: (map: LampMap) => { const w = waysOf(map); return { arms: w.arms.map((a) => a.length), shrooms: w.shrooms.length, stream: w.stream.length }; },
      fires: { farm: LAMPS.maps.farm.fire, forest: LAMPS.maps.forest.fire }, posts: { farm: LAMPS.maps.farm.posts, forest: LAMPS.maps.forest.posts }, boards: BOARD_AT,
      life: LAMPS.life, reach: LAMPS.reach, near: LAMPS.near, light_: LAMPS.light,
    };
    (window as unknown as { __townLamps?: typeof handle }).__townLamps = handle;
    return () => { delete (window as unknown as { __townLamps?: typeof handle }).__townLamps; };
  });

  if (!known || !lamps) return null;
  const step = stepOf(bearing, byPost >= 0);
  const pill = "pop-in pressable pointer-events-auto flex min-h-11 max-w-[22rem] items-center gap-2 rounded-full border bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors disabled:opacity-60";
  const bowl = art("flameHeld");
  // What is offered over the map: while I bear a flame, always (walking too: what is left of it is to be seen); by a
  // fire at night while a lamp of the map is still dark; and by a dark post, where to get a flame.
  const offering = !panel && (bearing || (!!here && night !== null && fresh && !!place && !whole && (atFire || byPost >= 0)));
  const lighters = mine?.lighters ?? [];
  const secs = Math.ceil(left / 100) / 10;
  const hold = holdFor(tired);
  const title = th ? "โคมยามค่ำ" : "The lamps at dusk";
  const until17 = night === null ? Math.max(0, nightBegins(now) - now) : 0;
  return (
    <>
      {(gift || earned || fete) && (
        <TownFoot rank="toast" order={35}>
          <style>{CSS}</style>
          {fete && (
            // (the last lamp of the map I am on is lit: everybody on it, for a while, slowly; a tap puts it away)
            <div role="status" aria-live="polite" onClick={() => setFete(null)} data-lamps-fete={fete.map}
                 className="lamps-fete pointer-events-auto relative w-[26rem] max-w-full cursor-pointer overflow-hidden rounded-2xl border border-gold/60 bg-surface/95 px-4 pb-3 pt-11 text-center shadow-xl shadow-black/40 backdrop-blur-sm">
              <span aria-hidden data-breathe className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <Art sprite={art("feteString")} box={208} wide /><Art sprite={art("feteString")} box={208} wide />
              </span>
              <div className="relative flex flex-col items-center gap-1">
                <span aria-hidden data-sway><Art sprite={art("feteLantern")} box={58} /></span>
                <p className="font-display text-title font-semibold text-ink">{th ? "คืนโคมเต็ม!" : "Every lamp is lit!"}</p>
                <p className="text-ui text-ink">{th ? `${MAP_NAME[fete.map][0]}สว่างครบทั้ง ${postsOf(fete.map)} ต้นแล้ว` : `${MAP_NAME[fete.map][1]} is lit, all ${postsOf(fete.map)} lamps`}</p>
                {fete.names.length > 0 && (
                  <p className="max-w-full text-ui leading-relaxed text-ink" data-lamps-fete-names>
                    <span className="text-muted">{th ? "คืนนี้จุดโดย " : "Lit tonight by "}</span>{names(fete.names)}
                  </p>
                )}
                {fete.nights > 0 && <p className="text-meta text-muted">{th ? `หมู่บ้านจุดโคมครบทั้งแมพนี้มาแล้ว ${fete.nights} คืน` : `The village has lit every lamp of this map on ${fete.nights} ${fete.nights === 1 ? "night" : "nights"}`}</p>}
              </div>
            </div>
          )}
          {earned && (
            // (a post was lit by a flame that went through my hands: what it earned me, wherever I stand)
            <p className="lamps-rise flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-gold/60 bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" aria-live="polite" data-lamps-earned={earned.n}>
              <Art sprite={art("lampPostLit")} box={22} />
              <span>{th ? "โคมที่ไฟผ่านมือเราติดแล้ว" : earned.n === 1 ? "A lamp your flame reached is lit" : `${earned.n} lamps your flame reached are lit`}</span>
              <span className="font-normal text-muted">· <span className="font-data tabular-nums text-ink">{earned.lit}/{earned.of}</span> {th ? MAP_NAME[earned.map][0] : MAP_NAME[earned.map][1].toLowerCase()}</span>
              <span className="rounded-full bg-jade/15 px-2 py-0.5 text-meta font-semibold text-jade" data-lamps-point>
                +{(earned.past ? PAST_BOUND : 1) * earned.n * LAMPS.point} {th ? "แต้มผู้ช่วย" : "helpers' points"}
              </span>
            </p>
          )}
          {gift && (
            <p className="pop-in flex items-center gap-2 rounded-full border border-gold/60 bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-lamps-gift>
              <Art sprite={bowl} box={22} />
              {th ? "มีคนส่งไฟมาให้! พาไปจุดโคม หรือส่งต่อ" : "Somebody handed you a flame! Light a lamp with it, or hand it on"}
            </p>
          )}
        </TownFoot>
      )}
      {(offering || note) && !panel && (
        <TownFoot rank="chip" order={27}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-center text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-lamps-note>{note}</p>}
          {offering && (
            <div className="pop-in pointer-events-auto w-[26rem] max-w-full rounded-2xl border border-line-lit bg-surface/92 p-2 shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-lamps-card={bearing ? "flame" : atFire ? "fire" : "post"}>
              <style>{CSS}</style>
              {/* how it is done: three steps, the one to do now lit */}
              <Steps th={th} at={step} />
              {bearing && flame ? (
                // what is left of the flame: a bar that burns down with it, and the seconds
                <div className="mt-2 flex items-center gap-2 px-1" data-lamps-left={secs}>
                  <Art sprite={bowl} box={22} />
                  <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full border border-line-strong bg-surface" role="img" aria-label={th ? `ไฟเหลือ ${secs} วินาที` : `${secs} seconds of flame left`}>
                    <span key={flame.until} className="block h-full origin-left bg-gold" style={{ animation: `lamps-burn ${Math.max(0.05, left / 1000)}s linear both`, transform: "scaleX(1)" }} />
                  </span>
                  <span className="w-12 text-right font-data text-ui tabular-nums text-ink">{secs.toFixed(1)}{th ? " วิ" : " s"}</span>
                </div>
              ) : (
                <p className="mt-1.5 px-1 text-center text-label leading-snug text-muted" data-lamps-hint>{atFire ? (th ? LIVES[0] : LIVES[1]) : th ? "โคมต้นนี้ยังมืด: รับไฟที่กองไฟกลางแมพ แล้วพามาจุด หลายคนช่วยกันส่งต่อจะไปได้ไกล" : "This lamp is dark: take a flame at the fire in the middle of the map and bring it here. Handed from friend to friend it goes far"}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {!bearing && atFire && (
                  // (how many are lit tonight, and the way to the board's panel: the board itself may lie under this card on a small screen)
                  <button type="button" onClick={() => setPanel(true)} data-lamps-board={litHere.length} aria-label={th ? `คืนนี้ติด ${litHere.length} จาก ${of} ดูป้าย` : `${litHere.length} of ${of} lit tonight: read the board`}
                          className="pressable pointer-events-auto order-last flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-bg/70 px-3 text-meta text-muted transition-colors hover:text-ink">
                    <Art sprite={art("lampBoard")} box={20} />
                    <span className="font-data tabular-nums text-ink">{litHere.length}/{of}</span>
                    {th ? "ดูป้าย" : "The board"}
                  </button>
                )}
                {!bearing ? (
                  atFire && (hand ? (
                    // (a thing in the hand: it is put away with one press, and then the flame can be taken)
                    <button type="button" onClick={() => void putAway()} disabled={busy} data-lamps-lacks="hand" className={`${pill} border-line-lit hover:border-accent`}>
                      <Art sprite={bowl} box={20} />
                      {th ? "เก็บของที่ถือ เพื่อรับไฟ" : "Put away what you hold, to take a flame"}
                    </button>
                  ) : stone ? (
                    <p className="flex items-center gap-2 rounded-full border border-line bg-bg/80 px-4 py-2 text-ui text-muted" aria-live="polite" data-lamps-lacks="stone">{th ? WHY.stone[0] : WHY.stone[1]}</p>
                  ) : (
                    <button type="button" onClick={() => void take()} disabled={busy} data-lamps-take className={`${pill} border-gold/70 hover:border-gold`}>
                      <Art sprite={bowl} box={26} />
                      {th ? "รับไฟ" : "Take a flame"}
                    </button>
                  ))
                ) : here ? (
                  <>
                    {byPost >= 0 && (hold > 0 ? (
                      <HoldButton secs={hold} disabled={busy} onDone={() => void light(byPost)} onEarly={early} className={`${pill} border-gold/70 hover:border-gold`}>
                        <Art sprite={art("lampPostLit")} box={24} />
                        <span className="min-w-0 truncate">{th ? "กดค้างไว้ จุดโคม" : "Hold to light the lamp"}</span>
                      </HoldButton>
                    ) : (
                      <button type="button" onClick={() => void light(byPost)} disabled={busy} data-lamps-light="press" className={`${pill} border-gold/70 hover:border-gold`}>
                        <Art sprite={art("lampPostLit")} box={24} />
                        {th ? "จุดโคม" : "Light the lamp"}
                      </button>
                    ))}
                    {/* one for each of those it may go to, the likeliest first and named in full: a press, and it is theirs */}
                    {offered.map((p, i) => {
                      const name = p.name || (th ? "เพื่อน" : "them");
                      return (
                        <button key={p.id} type="button" onClick={() => void passTo(p)} disabled={busy} data-lamps-chip={p.id} className={`${pill} border-line-lit hover:border-accent`}>
                          <Art sprite={bowl} box={20} />
                          <span className="min-w-0 truncate">{i === 0 ? (th ? `ส่งไฟต่อให้ ${name}` : `Hand it on to ${name}`) : th ? `หรือ ${name}` : `or ${name}`}</span>
                        </button>
                      );
                    })}
                    {!offered.length && lacks && (
                      // (nobody to hand it to: who stands close by, and what they lack. Nothing to press.)
                      <p className="flex max-w-[22rem] items-center gap-2 rounded-full border border-line bg-bg/80 px-4 py-2 text-ui text-muted" aria-live="polite" data-lamps-lacks={lacks.why}>
                        <span className="min-w-0">{LACKS[lacks.why][th ? 0 : 1](lacks.who.name || (th ? "เพื่อน" : "Your friend"))}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="px-1 text-center text-label leading-snug text-muted" data-lamps-walking>{th ? "แตะโคมที่ยังมืดเพื่อเดินไปจุด หรือหยุดข้างเพื่อนเพื่อส่งต่อ" : "Tap a dark lamp to walk to it and light it, or stop by a friend to hand it on"}</p>
                )}
              </div>
              {bearing && here && (
                <p className="mt-1.5 px-1 text-center text-label leading-snug text-muted" data-lamps-said>
                  {tired && byPost >= 0 ? (th ? "หมดแรงแล้ว: กดปุ่มค้างไว้จนแถบเต็ม โคมติดแน่นอน" : "Out of stamina: hold the button until it fills. The lamp is lit, always") : th ? COUNTS[0] : COUNTS[1]}
                </p>
              )}
            </div>
          )}
        </TownFoot>
      )}
      {panel && place && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 max-h-[min(84%,42rem)] rounded-t-2xl"
               : "right-3 top-16 w-[24rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { maxHeight: "calc(100% - 4.75rem)" }}
             data-state="open" data-lamps-panel={place}>
          <section aria-labelledby="town-lamps-h" className="flex max-h-[inherit] flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Art sprite={art("lampBoard")} box={34} />
              <h2 id="town-lamps-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{title} · {th ? MAP_NAME[place][0] : MAP_NAME[place][1]}</h2>
              <button type="button" onClick={() => setPanel(false)} data-lamps-close className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
                {th ? "ปิด" : "Close"}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              {/* tonight: so many lit of the map's posts, a lantern each (smaller ones for a map of many); a twinkle where more of the night comes out */}
              <div className="rounded-2xl border border-line bg-bg/60 p-3" data-lamps-tonight={litHere.length}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-ui font-semibold text-ink">
                    {night === null ? (th ? "ยังไม่ถึงเวลาจุดโคม" : "Not yet time for the lamps") : whole ? (th ? "คืนโคมเต็ม: ติดครบทุกต้นแล้ว" : "Every lamp is lit tonight") : th ? `คืนนี้ติด ${litHere.length} จาก ${of}` : `Tonight: ${litHere.length} of ${of} lit`}
                  </p>
                  {night !== null && <p className="font-data text-read tabular-nums text-ink" data-lamps-have>{litHere.length}<span className="text-muted"> / {of}</span></p>}
                </div>
                <ul className="mt-2 flex flex-wrap items-end gap-x-1 gap-y-2" role="img" aria-label={th ? `โคมติดแล้ว ${litHere.length} จาก ${of} ต้น` : `${litHere.length} of ${of} lamps lit`}>
                  {Array.from({ length: of }, (_, i) => {
                    const on = night !== null && i < litHere.length, more = i + 1 === LAMPS.more[0] || i + 1 === LAMPS.more[1] || i + 1 === of;
                    return (
                      <li key={i} data-pip={i + 1} data-lit={on} className="flex items-end">
                        <Art sprite={art("feteLantern")} box={of > 16 ? 18 : 24} shadow={!on} />
                        {more && <span className="-ml-1 mr-1" data-more={i + 1}><Art sprite={art("twinkle")} box={14} shadow={!on} /></span>}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-meta leading-relaxed text-muted">
                  {night === null
                    ? (th ? `โคมจุดได้ตั้งแต่ 17:30 น. ถึงตี 5 · อีก ${Math.max(1, Math.ceil(until17 / 3_600_000))} ชั่วโมง` : `The lamps are lit from 17:30 until 5 in the morning: in about ${Math.max(1, Math.ceil(until17 / 3_600_000))} h`)
                    : th ? "ยิ่งจุดเยอะ แมพยิ่งสวย โคมที่ติดแล้วสว่างไปถึงตี 5" : "The more are lit, the more beautiful the map. A lamp lit stays lit until 5 in the morning"}
                </p>
              </div>

              {/* how it is done, and the three lines said beforehand */}
              <div className="mt-3">
                <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "วิธีเล่น" : "How it is done"}</h3>
                <Steps th={th} at={step} wide />
                <ul className="mt-2 grid gap-1 text-meta leading-relaxed text-muted" data-lamps-rules>
                  <li className="flex items-start gap-1.5"><Art sprite={bowl} box={16} /><span>{th ? LIVES[0] : LIVES[1]}</span></li>
                  <li className="flex items-start gap-1.5"><Art sprite={art("lampPostLit")} box={16} /><span>{th ? COUNTS[0] : COUNTS[1]}</span></li>
                  <li className="flex items-start gap-1.5"><Art sprite={art("emberOut")} box={16} /><span>{th ? NO_LOSS[0] : NO_LOSS[1]}</span></li>
                </ul>
              </div>

              {/* the night's lighters, in the order they came: no numbers, no ranking */}
              <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? `คนจุดโคมคืนนี้ (${lighters.length})` : `Tonight's lighters (${lighters.length})`}</h3>
              {lighters.length ? (
                <ul className="flex flex-wrap gap-1.5" data-lamps-names>
                  {lighters.map((h) => (
                    <li key={h.id} data-id={h.id} className={`max-w-full truncate rounded-full border px-2.5 py-1 text-meta ${h.id === keeper.id || h.id === me ? "border-gold/60 bg-gold/10 text-ink" : "border-line bg-bg/60 text-ink"}`}>
                      {called(h)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-meta leading-relaxed text-muted">{night === null ? (th ? "รอค่ำก่อน แล้วมาช่วยกันจุด" : "Come back at dusk, and light them together") : th ? "คืนนี้ยังไม่มีใครจุดโคม มาเป็นคนแรกกันไหม" : "Nobody has lit a lamp tonight. Be the first?"}</p>
              )}

              {/* how many nights every lamp of this map has been lit; and the other map, in a line */}
              <p className="mt-3 rounded-xl border border-line bg-bg/60 px-3 py-2 text-ui text-ink" data-lamps-nights={mine?.full ?? 0}>
                {(mine?.full ?? 0) > 0
                  ? (th ? <>หมู่บ้านจุดโคมครบทั้งแมพนี้มาแล้ว <b className="font-data tabular-nums text-gold">{mine!.full.toLocaleString()}</b> คืน</> : <>The village has lit every lamp of this map on <b className="font-data tabular-nums text-gold">{mine!.full.toLocaleString()}</b> {mine!.full === 1 ? "night" : "nights"}</>)
                  : th ? "ยังไม่เคยมีคืนไหนที่โคมแมพนี้ติดครบทุกต้น" : "No night yet has seen every lamp of this map lit"}
              </p>
              {LAMP_MAPS.filter((m) => m !== place).map((m) => (
                <p key={m} className="mt-1.5 px-1 text-meta text-muted" data-lamps-other={m}>
                  {th ? `${MAP_NAME[m][0]}ก็มีโคม ${postsOf(m)} ต้นเหมือนกัน` : `${MAP_NAME[m][1]} has ${postsOf(m)} lamps of its own`}
                  {fresh && <> · <span className="font-data tabular-nums text-ink">{lamps.maps[m].lit.length}/{postsOf(m)}</span></>}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

interface Box { x0: number; y0: number; x1: number; y1: number }
