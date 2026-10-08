"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { HANDING, canThrow, caught, inTime, shownAt, sideOf, type Side, type Told } from "@/lib/town/handing";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";
import { BIG, GameFrame, GameScene, PixelGround, STAGE, useFrames, useGameHandle } from "./TownGame";

/** What this page has heard from the other's so far: kept by whoever hears it (components/town/TownLine), read here every frame. */
export interface OtherHand {
  /** Whoever takes the water: that they are ready, and the side their bucket was last put to. */
  ready: boolean; put: Side | 0;
  /** Whoever throws: when this page was told it was thrown (its own `performance.now()`), once it was. */
  thrown: number | null;
  /** Whether it was caught, once the page of whoever takes it has said. */
  verdict: boolean | null;
}
export const newOtherHand = (): OtherHand => ({ ready: false, put: 0, thrown: null, verdict: null });

/** How a handing-over went: whether the water was caught, and how long the board was up. */
export interface HandingResult { won: boolean; secs: number }

// The picture, in its own pixels: a canvas this size, shown with its pixels kept square.
const W = 180, H = 120, GROUND = 109;
/** The middle of the bucket that is thrown from, where the other stands at first and to either side, how big both are drawn, and how high the water's arc rises. */
const BX = 30, BY = 44, MID = 127, STEP = 24, BIGGER = 32, ARC = 18;
const spot = (put: Side | 0) => MID + put * STEP;

type Phase = "calling" | "wait" | "ready" | "flight" | "won" | "lost";
/** The two buckets' pictures when none are said (a stone has no bucket). */
const PLAIN = { from: "bucketFull", fromEmpty: "bucket", to: "bucket", toFull: "bucketFull" } as const satisfies Record<string, IconName>;
/**
 * ── the bridge built by hand ── An open hand, for a stone handed on (lib/town/bridge): the palm of the atlas's `hand`
 * (the picture of empty hands; its upper half is a star, which is not wanted here).
 */
const PALM = ((): [number, number, number, number] => { const [x, y, w, h] = ICON_ATLAS.icons.hand, top = Math.round(h * 0.49); return [x, y + top, w, h - top]; })();

/**
 * Water handed on by tired hands, on the screen (lib/town/handing; the owner, 2026-10-06, of the game before this
 * one: "ที่ยากคือ คนไม่เข้าใจวิธีเล่น ฝั่งรับน้ำ พอเข้าใจได้ แต่ฝั่งเทนี้เล่นยังไง", and "เอาให้ง่ายๆไปเลย … เขียนวิธีเล่น ให้เข้าใจง่ายๆด้วย").
 *
 * **Everything is a button, and the board says which, step by step.** Over the picture are the two steps of
 * whoever looks at it, the one to do now lit:
 *
 * - whoever throws: ① wait for the other to be ready, ② press **Throw**;
 * - whoever takes: ① press **Ready**, ② press the side the arrow shows.
 *
 * Under the picture are the buttons themselves, as big as the board is wide; the space bar and the arrow keys are
 * the same buttons, and so is a tap on the picture. One picture for both: the bucket that is thrown from on the
 * left, the other's on the right, with a place to either side of it.
 *
 * Tired hands: whoever throws can only while the bucket swings forward (the button is lit then, and says so);
 * whoever takes is shown the arrow late. Each board marks which side is tired.
 *
 * ── the bridge built by hand ── **The same board hands a stone on** (`thing="stone"`; lib/town/bridge: with no stamina
 * on either side, as water): the same three presses, a stone tossed from an open hand to an open hand, and a stone's
 * words.
 */
export default function TownHanding({ th, role, m, seed, tired, names, icons = PLAIN, other, waiting, tell, onDone, onClose, onCancel, sfx, scene = null, thing = "water", stone = null }: {
  th: boolean;
  /** Which bucket is mine: the one thrown from (`from`), or the one held under (`to`). */
  role: "from" | "to";
  /** Which handing-over this is (lib/town/handing's `Told.m`). */
  m: string;
  seed: number;
  tired: { from: boolean; to: boolean };
  names: { from: string; to: string };
  /** The two buckets' pictures: the one thrown from with water in it and without, the one held under without and with. */
  icons?: { from: IconName; fromEmpty: IconName; to: IconName; toFull: IconName };
  other: MutableRefObject<OtherHand>;
  /** Whoever throws: asked, and the other has not answered yet. */
  waiting: boolean;
  tell: (told: Told) => void;
  /** How it went, the moment that is settled; and, a blink later, that the board has said so and may go. */
  onDone: (result: HandingResult) => void;
  onClose: () => void;
  onCancel: () => void;
  sfx: FishSfx | null;
  scene?: Sprite | null;
  /** What is handed on: water out of a bucket, as it began; or a stone for the bridge, with its own picture (`stone`) and words. */
  thing?: "water" | "stone";
  stone?: Sprite | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLImageElement | null>(null);
  useEffect(() => { const img = new Image(); img.src = ICON_ATLAS.image; sheet.current = img; }, []);
  // ── the bridge built by hand ── (a stone's own picture, out of the works' sheet; and the open hands it goes between)
  const rock = thing === "stone", stoneSrc = stone?.src ?? null;
  const stoneImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => { if (!stoneSrc) { stoneImg.current = null; return; } const img = new Image(); img.src = stoneSrc; stoneImg.current = img; }, [stoneSrc]);
  const drawStone = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    const img = stoneImg.current;
    if (!stone || !img?.complete || !img.naturalWidth) return;
    const [x, y, w, h] = stone.at, k = size / Math.max(w, h);
    ctx.drawImage(img, x, y, w, h, Math.round(cx - (w * k) / 2), Math.round(cy - (h * k) / 2), w * k, h * k);
  };
  const drawPalm = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, flip: boolean) => {
    const img = sheet.current;
    if (!img?.complete || !img.naturalWidth) return;
    const [x, y, w, h] = PALM, k = size / w;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, x, y, w, h, -(w * k) / 2, -(h * k) / 2, w * k, h * k);
    ctx.restore();
  };
  const mine = role === "from", side = sideOf(seed);
  const born = useRef(0);
  useEffect(() => { born.current = performance.now(); }, []);
  /** Whoever takes: ready, and the side the bucket is put to. Whoever throws: since when the other is ready, and until when the hands are of no use after a fumble. */
  const ready = useRef(false), put = useRef<Side | 0>(0), readyAt = useRef<number | null>(null), numb = useRef(0);
  /** When the water flew, as this page has it (its own clock); and where the other's bucket is drawn (it hops, it does not jump). */
  const flew = useRef<number | null>(null), drawnAt = useRef(MID);
  const auto = useRef(false), over = useRef<HandingResult | null>(null), said = useRef(0);
  const [phase, setPhase] = useState<Phase>(mine && waiting ? "calling" : "wait");
  /** What the button of whoever throws can do now: throw (`lit`), nothing yet (`dark`: tired hands between swings), or nothing for a moment (`fumble`). */
  const [hands, setHands] = useState<"lit" | "dark" | "fumble">("dark");
  const [shown, setShown] = useState(false);
  const [mineSide, setMineSide] = useState<Side | 0>(0);

  const finish = useCallback((won: boolean) => {
    if (over.current) return;
    const result = { won, secs: Math.round((performance.now() - born.current) / 100) / 10 };
    over.current = result;
    setPhase(won ? "won" : "lost");
    sfx?.wake();
    sfx?.work(won ? (rock ? "pick" : "dip") : "knock", 0.8);
    onDone(result);
    window.setTimeout(onClose, 500);
  }, [onDone, onClose, sfx, rock]);

  /** Whoever throws presses the button: thrown, if the other is ready and the hands can. */
  const press = useCallback(() => {
    if (!mine || over.current || flew.current !== null || waiting || readyAt.current === null) return;
    const now = performance.now();
    if (now < numb.current) return;
    if (!canThrow(tired.from, seed, (now - readyAt.current) / 1000)) {
      // tired hands, and the bucket not on its forward swing: they fumble for a moment, and nothing worse
      numb.current = now + HANDING.fumble * 1000;
      sfx?.wake();
      sfx?.work("knock", 0.5);
      return;
    }
    flew.current = now;
    tell({ k: "th", m });
    sfx?.wake();
    sfx?.work(rock ? "pull" : "pour", 0.7);
  }, [mine, waiting, tired.from, seed, tell, m, sfx, rock]);
  /** Whoever takes it says they are ready. */
  const beReady = useCallback(() => {
    if (mine || over.current || ready.current) return;
    ready.current = true;
    tell({ k: "r", m });
    setPhase("ready");
  }, [mine, tell, m]);
  /** Whoever takes it puts the bucket to a side (ready, if they were not yet). */
  const go = useCallback((to: Side) => {
    if (mine || over.current) return;
    if (!ready.current) { beReady(); return; }
    if (flew.current !== null && !inTime((performance.now() - flew.current) / 1000)) return;
    if (put.current === to) return;
    put.current = to;
    setMineSide(to);
    tell({ k: "p", m, d: to });
  }, [mine, beReady, tell, m]);

  useFrames((dt) => {
    const o = other.current, now = performance.now();
    if (!over.current) {
      // nobody is kept waiting by somebody who went away: a board that has been up too long with nothing thrown gives it up
      if (flew.current === null && born.current && now - born.current > HANDING.limit * 1000) { onCancel(); return; }
      if (mine) {
        if (!waiting && o.ready && readyAt.current === null) readyAt.current = now;
        const can = readyAt.current !== null && flew.current === null;
        const state = !can ? "dark" : now < numb.current ? "fumble" : canThrow(tired.from, seed, (now - readyAt.current!) / 1000) ? "lit" : "dark";
        if (state !== hands) setHands(state);
        if (auto.current && state === "lit") press();
        if (flew.current !== null) {
          // the other's word, the moment it comes; with none a good while after it landed, it was not caught
          if (o.verdict !== null) finish(o.verdict);
          else if ((now - flew.current) / 1000 > HANDING.flight + 2.5) finish(false);
        }
        const next: Phase = waiting ? "calling" : readyAt.current === null ? "wait" : flew.current === null ? "ready" : "flight";
        if (next !== phase) setPhase(next);
      } else {
        if (auto.current && !ready.current) beReady();
        if (o.thrown !== null && flew.current === null) { flew.current = o.thrown; setPhase("flight"); sfx?.wake(); sfx?.work(rock ? "pull" : "pour", 0.7); }
        if (flew.current !== null) {
          const f = (now - flew.current) / 1000, see = f >= shownAt(tired.to);
          if (see !== shown) setShown(see);
          if (auto.current && see && put.current !== side) go(side);
          // it lands: caught if the bucket was put to that side. Said at once, and once more (it is the one word that has to come).
          if (!inTime(f)) {
            const got = caught(side, put.current);
            tell({ k: "end", m, c: got });
            said.current = now;
            finish(got);
          }
        }
      }
    } else if (!mine && said.current && now - said.current > 150) { said.current = 0; tell({ k: "end", m, c: over.current.won }); }

    // ── the picture ──
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    const f = flew.current === null ? -1 : (now - flew.current) / 1000, flying = f >= 0 && f <= HANDING.flight;
    const see = f >= shownAt(tired.to), isReady = mine ? o.ready : ready.current, held = mine ? o.put : put.current;
    // the two places the water may come down on, either side of where the other stands
    for (const s of [-1, 1] as const) {
      const lit = flying && see && s === side;
      ctx.fillStyle = lit ? (rock ? "#ffe19a" : "#bfe6ff") : "rgba(42, 25, 13, 0.55)";
      ctx.fillRect(spot(s) - 9, GROUND + 3, 19, 2);
      if (lit) { ctx.fillStyle = "rgba(16, 36, 56, 0.6)"; ctx.fillRect(spot(s) - 7, GROUND + 5, 15, 1); }
    }
    // the bucket that is thrown from: at rest tipped a little; tired, swinging back and forth (forward is when it can be thrown); flung forward at the throw
    const swing = readyAt.current !== null && tired.from && mine ? (canThrow(true, seed, (now - readyAt.current) / 1000) ? 0.55 : -0.12) : 0.18 + 0.05 * Math.sin(now / 420);
    const turn = f >= 0 ? Math.min(1.5, 0.3 + f * 12) : now < numb.current ? -0.25 + 0.08 * Math.sin(now / 40) : swing;
    if (rock) {
      // (a stone: on the open hand that throws it, lifted and let down as the bucket swings; off it once it is thrown)
      const lift = f >= 0 ? -3 : Math.round(-turn * 9);
      drawPalm(ctx, BX, BY + 22 + lift, BIGGER, false);
      if (f < 0) drawStone(ctx, BX + 3, BY + 8 + lift, 24);
    } else {
      ctx.save();
      ctx.translate(BX, BY);
      ctx.rotate(turn);
      drawIcon(ctx, sheet.current, f >= 0 ? icons.fromEmpty : icons.from, 0, 0, BIGGER);
      ctx.restore();
    }
    const mouth = GROUND - 24;
    if (flying && rock) {
      // the stone in the air: towards where the other stands, and to its side once that is shown
      const lean = see ? Math.min(1, (f - shownAt(tired.to)) / 0.12) : 0, end = MID + side * STEP * lean, lx = BX + 16, ly = BY - 4, u = f / HANDING.flight;
      drawStone(ctx, lx + (end - lx) * u, ly + (mouth - ly) * u - ARC * 4 * u * (1 - u), 20);
    }
    if (flying) {
      // the water in the air: towards where the other stands, and to its side once that is shown
      const lean = see ? Math.min(1, (f - shownAt(tired.to)) / 0.12) : 0, end = MID + side * STEP * lean, lx = BX + 16, ly = BY - 4;
      for (let k = 0; k < 11 && !rock; k++) {
        const u = f / HANDING.flight - k * 0.028;
        if (u < 0) break;
        const x = lx + (end - lx) * u, y = ly + (mouth - ly) * u - ARC * 4 * u * (1 - u), big = k < 3 ? 4 : k < 7 ? 3 : 2;
        ctx.fillStyle = "#4fa3cf";
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, big, big);
        ctx.fillStyle = k % 3 ? "#8fd2ee" : "#e6f6ff";
        ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, big - 1, big - 1);
      }
      if (see) {
        // which way it comes: a big arrow over that place
        const x = spot(side), bob = Math.floor(now / 90) % 2, top = mouth - 22 + bob * 2;
        ctx.fillStyle = "#2a190d";
        ctx.fillRect(x - 2, top - 1, 5, 8); ctx.fillRect(x - 6, top + 6, 13, 3); ctx.fillRect(x - 4, top + 9, 9, 2); ctx.fillRect(x - 2, top + 11, 5, 2);
        ctx.fillStyle = "#ffe19a";
        ctx.fillRect(x - 1, top, 3, 7); ctx.fillRect(x - 5, top + 7, 11, 1); ctx.fillRect(x - 4, top + 8, 9, 1); ctx.fillRect(x - 3, top + 9, 7, 1); ctx.fillRect(x - 2, top + 10, 5, 1); ctx.fillRect(x - 1, top + 11, 3, 1);
      }
    }
    const won = !!over.current && over.current.won, lost = !!over.current && !over.current.won;
    if (lost && f >= 0 && rock) drawStone(ctx, spot(side), GROUND - 3, 18);   // (beside the hand: the stone, where it came down)
    else if (lost && f >= 0) {
      // beside the bucket: a puddle where it came down
      const x = spot(side), j = Math.floor(now / 50) % 3;
      ctx.fillStyle = "#48a0c8";
      ctx.fillRect(x - 7, GROUND + 3, 15, 2);
      ctx.fillStyle = "#8fd2ee";
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 6 + i * 4, GROUND - 2 - ((i + j) % 3) * 2, 2, 2);
    }
    // the other's bucket: set down until they are ready, held out then, and hopping to the side it is put to
    const want = won ? spot(side) : spot(held), gap = want - drawnAt.current;
    drawnAt.current += Math.sign(gap) * Math.min(Math.abs(gap), 260 * dt);
    const bx = Math.round(drawnAt.current);
    ctx.globalAlpha = isReady || over.current ? 1 : 0.55;
    if (rock) {
      // (a stone: the other's open hand, held out once they are ready; caught, the stone lies on it)
      const hy = GROUND - 17 + (isReady || over.current ? -3 : 0);
      drawPalm(ctx, bx, hy, BIGGER - 2, true);
      ctx.globalAlpha = 1;
      if (won) drawStone(ctx, bx - 3, hy - 13, 22);
    } else drawIcon(ctx, sheet.current, won ? icons.toFull : icons.to, bx, GROUND - 14 + (isReady || over.current ? -3 : 0), BIGGER - 2);
    ctx.globalAlpha = 1;
    if (won && !rock) { const j = Math.floor(now / 42) % 4; ctx.fillStyle = "#e6f6ff"; for (let i = 0; i < 5; i++) ctx.fillRect(bx - 8 + i * 4, mouth - 6 - ((i * 2 + j) % 5), 2, 2); }
  });

  // The space bar is the big button (throw; ready), the arrow keys the two sides; Escape gives it up. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      const k = e.key.toLowerCase(), way: Side | 0 = k === "arrowleft" || k === "a" ? -1 : k === "arrowright" || k === "d" ? 1 : 0;
      if (e.key !== " " && e.code !== "Space" && !way) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      auto.current = false;
      if (mine) { if (!way) press(); } else if (way) go(way); else beReady();
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [mine, press, go, beReady, onCancel]);

  // (for scripts in `next dev`: what stands how, the buttons, and hands that play by themselves)
  const setAuto = useCallback((on = true) => { auto.current = on; }, []);
  useGameHandle({
    kind: "handing", role,
    state: () => {
      const now = performance.now(), f = flew.current === null ? null : (now - flew.current) / 1000;
      return {
        phase, waiting, tired, side, ready: mine ? other.current.ready : ready.current, put: mine ? other.current.put : put.current,
        lit: mine && readyAt.current !== null && flew.current === null && now >= numb.current && canThrow(tired.from, seed, (now - readyAt.current) / 1000),
        fumbling: now < numb.current, flew: f, shown: f !== null && f >= shownAt(tired.to), over: over.current,
      };
    },
    press: mine ? press : beReady, side: go, auto: setAuto,
  }, [role, phase, waiting, tired, side, mine, seed, press, beReady, go, setAuto]);

  // ── the words ──
  const them = (mine ? names.to : names.from) || (th ? "เพื่อน" : "your friend");
  const done = phase === "won" || phase === "lost";
  /** The two steps of whoever looks at this board, and which is to be done now (0, 1; 2: both done). */
  const steps = mine
    ? [th ? "รอเพื่อนกด “พร้อมรับ”" : "Wait for “Ready”", rock ? (th ? "กดปุ่ม “โยน!”" : "Press “Toss!”") : th ? "กดปุ่ม “สาด!”" : "Press “Throw!”"]
    : [th ? "กดปุ่ม “พร้อมรับ”" : "Press “Ready”", th ? "ลูกศรชี้ทางไหน กดทางนั้น" : "Press the side the arrow shows"];
  const at = done || phase === "flight" && mine ? 2 : phase === "calling" || phase === "wait" ? 0 : 1;
  const word = done
    ? phase === "won" ? (rock ? (th ? "รับได้! หินถึงมือ" : "Caught! Handed over") : th ? "รับได้! ส่งน้ำถึงมือ" : "Caught! Handed over") : th ? "รับไม่ทัน… ลองอีกที" : "Missed… try again"
    : mine
      ? phase === "calling" ? (th ? `กำลังเรียก ${them}…` : `Calling ${them}…`)
        : phase === "wait" ? (th ? `รอ ${them} กดพร้อม…` : `Waiting for ${them}…`)
          : phase === "flight" ? (rock ? (th ? "หินลอยไปแล้ว!" : "There it goes!") : th ? "น้ำลอยไปแล้ว!" : "There it goes!")
            : hands === "lit" ? (rock ? (th ? `${them} พร้อมแล้ว กด “โยน!” เลย` : `${them} is ready: toss it!`) : th ? `${them} พร้อมแล้ว กด “สาด!” เลย` : `${them} is ready: throw!`)
              : hands === "fumble" ? (th ? "ยกไม่ไหว! รอแป๊บ" : "Too heavy! A moment") : rock ? (th ? "หินหนัก… รอปุ่มสว่างก่อน" : "Heavy… wait for the light") : th ? "ถังหนัก… รอปุ่มสว่างก่อน" : "Heavy… wait for the light"
      : phase === "wait" ? (rock ? (th ? `${them} จะโยนหินให้ กด “พร้อมรับ”` : `${them} has a stone for you: press Ready`) : th ? `${them} จะส่งน้ำให้ กด “พร้อมรับ”` : `${them} has water for you: press Ready`)
        : phase === "ready" ? (rock ? (th ? "เตรียมรับ… รอหินลอยมา" : "Ready… wait for it") : th ? "เตรียมรับ… รอน้ำลอยมา" : "Ready… wait for it")
          : shown ? (side < 0 ? (th ? "← ซ้าย!" : "← Left!") : th ? "ขวา! →" : "Right! →") : rock ? (th ? "หินมาแล้ว! รอดูลูกศร" : "Here it comes! Watch for the arrow") : th ? "น้ำมาแล้ว! รอดูลูกศร" : "Here it comes! Watch for the arrow";
  const weary = mine ? tired.from : tired.to;
  const tag = (name: string, me: boolean, spent: boolean, where: string) => (
    <span className={`pointer-events-none absolute top-1 ${where} flex max-w-[46%] items-center gap-1 rounded-sm bg-[#2a190d]/80 px-1.5 py-0.5 text-label ${me ? "font-semibold text-[#ffe19a]" : "text-[#e9cfa4]"}`}>
      <span className="min-w-0 truncate">{me ? (th ? "คุณ" : "You") : name}</span>
      {spent && <span className="shrink-0 text-[#ffb09c]" data-handing-tired>{th ? "หมดแรง" : "tired"}</span>}
    </span>
  );
  const sideButton = (to: Side, label: string) => (
    <button type="button" className={`${BIG} ${shown && !done && to === side ? "ring-4 ring-[#fff6e3]" : ""} ${mineSide === to ? "bg-[#ffd98a]" : ""}`} data-handing-side={to} data-go={shown && to === side}
            onPointerDown={(e) => { e.preventDefault(); auto.current = false; go(to); }}>
      {label}
    </button>
  );
  return (
    <GameFrame th={th} title={rock ? (mine ? (th ? "โยนหินส่งต่อ" : "Toss the stone over") : th ? "รับหินที่โยนมา" : "Catch the stone") : mine ? (th ? "สาดน้ำส่งต่อ" : "Throw it over") : th ? "รับน้ำที่สาดมา" : "Catch the water"} need={0} hits={0} misses={0} most={0} onCancel={onCancel}>
      {/* how it is played: the two steps of whoever looks at this board, the one to do now lit */}
      <ol className="mb-1.5 mt-0.5 grid grid-cols-2 gap-1.5" data-handing-steps={at}>
        {steps.map((s, i) => (
          <li key={i} data-now={i === at} className={`flex items-center gap-1.5 rounded-[4px] border-2 border-[#2a190d] px-2 py-1 text-label leading-snug ${i === at ? "bg-[#ffe19a] font-semibold text-[#3a2209]" : i < at ? "bg-[#4a2f18] text-[#8fd45f]" : "bg-[#4a2f18] text-[#c9a57a]"}`}>
            <span className="font-data shrink-0 tabular-nums">{i < at ? "✓" : i + 1}</span>
            <span className="min-w-0">{s}</span>
          </li>
        ))}
      </ol>
      {weary && (
        <p className="mb-1 text-label text-[#ffb09c]" data-handing-weary>
          {mine ? (rock ? (th ? "หมดแรง หินหนัก: กดโยนได้เฉพาะตอนปุ่มสว่าง" : "Tired, and the stone is heavy: toss only while the button is lit") : th ? "หมดแรง ถังหนัก: กดสาดได้เฉพาะตอนปุ่มสว่าง" : "Tired, and the bucket is heavy: throw only while the button is lit")
            : th ? "หมดแรง: ลูกศรจะขึ้นช้า ต้องกดให้ไว" : "Tired: the arrow shows late, be quick"}
        </p>
      )}
      <div ref={stage} className={`${STAGE} aspect-[3/2] w-full touch-none`} data-look="handing" data-thing={thing} data-role={role} data-phase={phase}
           onPointerDown={(e) => {
             auto.current = false;
             if (mine) { press(); return; }
             const box = e.currentTarget.getBoundingClientRect();
             if (!ready.current) beReady(); else go(e.clientX - box.left < box.width * (MID / W) ? -1 : 1);
           }}>
        {scene ? <GameScene sprite={scene} className="absolute inset-0 size-full" /> : <PixelGround kind="soil" w={90} h={10} className="absolute inset-x-0 bottom-0 h-[16.6%] w-full border-t-[3px] border-[#2a190d]" />}
        <canvas ref={canvas} width={W} height={H} aria-hidden className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]" />
        {tag(names.from, mine, tired.from, "left-1")}
        {tag(names.to, !mine, tired.to, "right-1")}
        <p className={`pointer-events-none absolute inset-x-0 top-[22%] px-2 text-center font-display font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d] ${done || (phase === "flight" && shown && !mine) ? "text-title" : "text-read"}`} aria-live="polite" data-handing-word={phase}>{word}</p>
      </div>
      {/* the buttons themselves: one for whoever throws; for whoever takes, one to be ready and then one for each side */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {mine ? (
          <button type="button" className={`${BIG} col-span-2 ${phase === "ready" && hands === "lit" ? "" : "opacity-45"}`} data-handing-throw={phase === "ready" ? hands : "off"}
                  onPointerDown={(e) => { e.preventDefault(); auto.current = false; press(); }}>
            {rock ? (th ? "โยน!" : "Toss!") : th ? "สาด!" : "Throw!"}
            <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
          </button>
        ) : phase === "wait" ? (
          <button type="button" className={`${BIG} col-span-2`} data-handing-ready onPointerDown={(e) => { e.preventDefault(); auto.current = false; beReady(); }}>
            {th ? "พร้อมรับ" : "Ready"}
            <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>
          </button>
        ) : (
          <>
            {sideButton(-1, th ? "← ซ้าย" : "← Left")}
            {sideButton(1, th ? "ขวา →" : "Right →")}
          </>
        )}
      </div>
    </GameFrame>
  );
}
