"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  barShare, beginPlay, chop, isOver, missesOf, outcomeOf, seen, startFelling, tick,
  type FellOutcome, type FellPlay, type FellingAsk, type Side,
} from "@/lib/town/felling";
import type { Look } from "@/lib/town/look";
import { loadPixelKit, type PixelKit } from "@/lib/town/pixeldoll";
import { loadFelling, type Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { GameFrame, STAGE, useFrames, useGameHandle } from "./TownGame";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";

/** How many segments of the trunk the board shows at once, the one that is level and those above it. */
const ROWS = 8;
/** How long a chop's pictures last, in milliseconds: the trunk coming down a segment, the axe's swing, the cut piece flying off, a branch's blow. */
const DROP = 90, SWING = 170, FLY = 320, BLOW = 380;
/** After a tree's stretch has ended the hand rests so long before the next begins, and the board stays up so long after the last. */
const REST = 650;

interface Flying { at: number; side: Side }
interface Chip { at: number; x: number; y: number; vx: number; vy: number }
/** The pictures the board draws from: its own sheet, the icons' (for the axe), and my own doll's. */
interface Arts { img: HTMLImageElement; art: (name: string) => Sprite | null }

/**
 * A tree being felled, on the screen (lib/town/felling): the trunk in the middle of a clearing, my own doll beside
 * it with the axe, a chop from the left or from the right, branches coming down with the trunk, and a bar of time
 * along the top. The left and right arrow keys chop, or a touch on that half of the picture.
 *
 * The one board of the town that says how it is played (the owner, 2026-10-08, of a game nobody had understood:
 * "ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย"): three short marks under its title, each a picture and a few words.
 */
export default function TownFelling({ th, ask, elder, look, reduced, sfx, powers, onDone, onCancel }: {
  th: boolean;
  /** The game, as whoever keeps it put it together (lib/town/trees). */
  ask: FellingAsk;
  /** Whether it is the ancient tree's. */
  elder: boolean;
  /** How I look: my own doll stands at the trunk. */
  look: Look | null;
  /** The town's own motion switch: off, nothing slides or flies. */
  reduced: boolean;
  sfx: FishSfx | null;
  /** What the axe in the hand has left today of its counted powers: a tree at one chop, twice the wood (0: not this axe's, or none left). */
  powers?: { one: number; twice: number };
  onDone: (out: FellOutcome, how: { one?: boolean; twice?: boolean }) => void;
  onCancel: () => void;
}) {
  const game = useMemo(() => startFelling(ask), [ask]);
  const play = useRef<FellPlay>(beginPlay(game));
  const [, setShown] = useState(0);
  const [twice, setTwice] = useState(false);
  const twiceRef = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null), bar = useRef<HTMLSpanElement>(null);
  const arts = useRef<Arts | null>(null), icons = useRef<HTMLImageElement | null>(null), kit = useRef<PixelKit | null>(null);
  // what a chop leaves on the screen for a moment
  const fx = useRef({ chopAt: -1e9, hitAt: -1e9, side: 0 as Side | 0, flying: [] as Flying[], chips: [] as Chip[], gone: new Set<string>(), restUntil: 0, lift: 0 });
  const [banner, setBanner] = useState<string | null>(null);
  const ended = useRef(false), auto = useRef<{ on: boolean; due: number; every: number }>({ on: false, due: 0, every: 110 });

  useEffect(() => { let on = true; loadFelling().then((a) => { if (on) arts.current = a; }).catch(() => { /* the stage is its plain hollow until the picture comes */ }); return () => { on = false; }; }, []);
  useEffect(() => { const i = new Image(); i.decoding = "async"; i.src = ICON_ATLAS.image; icons.current = i; }, []);
  useEffect(() => { let on = true; if (look) loadPixelKit(look.race).then((k) => { if (on) kit.current = k; }).catch(() => { /* the axe alone, until a reload */ }); return () => { on = false; }; }, [look]);

  const finish = useCallback((how: { one?: boolean } = {}) => {
    if (ended.current) return;
    ended.current = true;
    const out = outcomeOf(game, play.current), asked = { ...how, ...(twiceRef.current ? { twice: true } : {}) };
    window.setTimeout(() => onDone(out, asked), how.one ? 0 : REST);
  }, [game, onDone]);

  /** A chop from a side. */
  const press = useCallback((side: Side) => {
    const now = performance.now(), f = fx.current, was = play.current;
    if (ended.current || isOver(game, was) || now < f.restUntil) return;
    const did = chop(game, was, side);
    if (!did.what) return;
    play.current = did.play;
    sfx?.wake();
    f.chopAt = now; f.side = side;
    // the piece that was cut out flies off, away from the hand, with the branch it had
    f.flying.push({ at: now, side });
    if (!reduced) for (let i = 0; i < 5; i++) f.chips.push({ at: now, x: side * 0.35, y: 0, vx: -side * (0.6 + Math.random() * 1.6), vy: -(1 + Math.random() * 2.2) });
    if (did.what === "hit" || did.what === "dropped") { f.hitAt = now; sfx?.work("crack"); }
    else if (did.what === "forgiven") { f.gone.add(`${was.at}:${was.cut + 1}`); sfx?.work("chop"); sfx?.work("pluck", 0.7); }
    else if (did.what === "felled") sfx?.work("timber");
    else sfx?.work("chop");
    if (did.what === "dropped") { sfx?.work("wrong"); setBanner(th ? "ขวานหลุดมือ" : "The axe slips from your hand"); }
    if (did.what === "felled") {
      const more = did.play.at < game.stretches.length;
      setBanner(more ? (th ? `ล้มแล้ว! ต้นต่อไป ${did.play.at + 1}/${game.stretches.length}` : `Timber! Next tree ${did.play.at + 1}/${game.stretches.length}`) : (th ? "ล้มแล้ว!" : "Timber!"));
      f.restUntil = now + REST;
      if (more) window.setTimeout(() => setBanner(null), REST);
    }
    setShown((n) => n + 1);
    if (isOver(game, did.play)) finish();
  }, [game, reduced, sfx, th, finish]);

  useFrames((dt, now) => {
    const was = play.current;
    if (!ended.current && !isOver(game, was)) {
      const next = tick(game, was, dt);
      if (next !== was) {
        play.current = next;
        if (next.at !== was.at || isOver(game, next)) {
          // the bar ran out: this tree stands
          sfx?.wake(); sfx?.work("nothing");
          const more = !isOver(game, next);
          setBanner(more ? (th ? `ไม่ทัน ต้นนี้ยังยืนอยู่ · ต้นต่อไป ${next.at + 1}/${game.stretches.length}` : `Out of time: it stands. Next tree ${next.at + 1}/${game.stretches.length}`) : (th ? "ไม่ทัน ต้นไม้ยังยืนอยู่" : "Out of time: the tree stands"));
          fx.current.restUntil = now + REST;
          fx.current.side = 0;
          if (more) window.setTimeout(() => setBanner(null), REST);
          setShown((n) => n + 1);
          if (!more) finish();
        }
      }
      // (for scripts: a hand that plays by itself, from the side no branch comes down on)
      const a = auto.current, p = play.current;
      if (a.on && now >= a.due && now >= fx.current.restUntil && !isOver(game, p)) {
        a.due = now + a.every;
        const up = game.stretches[p.at].branches[p.cut + 1];
        press(up === 1 ? -1 : up === -1 ? 1 : p.side || -1);
      }
    }
    if (bar.current) {
      const share = barShare(play.current);
      bar.current.style.transform = `scaleX(${share.toFixed(4)})`;
      bar.current.style.backgroundColor = share > 0.5 ? "#8fd45f" : share > 0.25 ? "#f0c060" : "#e9573f";
    }
    draw(now);
  });

  /** The whole picture, drawn afresh. */
  function draw(now: number) {
    const cv = canvas.current, a = arts.current;
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (!a) return;
    const blit = (name: string, x: number, y: number, w: number, h: number, mirror = false, turn = 0) => {
      const s = a.art(name);
      if (!s) return;
      ctx.save();
      ctx.translate(Math.round(x + w / 2), Math.round(y + h / 2));
      if (turn) ctx.rotate(turn);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(a.img, s.at[0], s.at[1], s.at[2], s.at[3], -Math.round(w / 2), -Math.round(h / 2), Math.round(w), Math.round(h));
      ctx.restore();
    };
    const sizeOf = (name: string): [number, number] => { const s = a.art(name); return s ? [s.at[2], s.at[3]] : [1, 1]; };

    // the clearing: laid over the whole stage, its ground along the bottom
    const [sw, sh] = sizeOf("gameWood"), k = Math.max(W / sw, H / sh);
    blit("gameWood", (W - sw * k) / 2, H - sh * k, sw * k, sh * k);

    const p = play.current, f = fx.current, over = isOver(game, p);
    const st = game.stretches[Math.min(p.at, game.stretches.length - 1)];
    // (a segment is as tall as the stage allows with every segment whose branch is seen in sight, and one more for the boughs)
    const inSight = Math.max(5, Math.min(ROWS, game.ahead + 2)), cx = W / 2, ground = H * 0.9;
    const rh = Math.min((ground - H * 0.07) / (inSight + 0.75), W * 0.2), base = ground - rh * 0.7;
    const trunk = elder ? "fellElder" : "fellTrunk", limb = elder ? "fellElderBranch" : "fellBranch";
    const [tw0, th0] = sizeOf(trunk), tw = rh * (tw0 / th0) * 1.12, [bw0, bh0] = sizeOf(limb), bw = rh * 1.55, bh = bw * (bh0 / bw0);
    // (the trunk comes down a segment after a chop: for a moment it is still on its way)
    const since = now - f.chopAt, falling = reduced || over ? 0 : Math.max(0, 1 - since / DROP) * rh;
    const rows = seen(game, p, ROWS), standing = !over || p.ends[game.stretches.length - 1] !== "felled" || p.dropped;
    const felledAll = over && !standing;

    // the stump the trunk stands on
    const [pw0, ph0] = sizeOf("fellStump"), pw = tw * 1.7, ph = pw * (ph0 / pw0);
    blit("fellStump", cx - pw / 2, ground + rh * 0.16 - ph, pw, ph);

    if (!felledAll) {
      // the trunk, from the segment that is level upwards; each with its branch, where it is seen
      for (let j = rows.length - 1; j >= 0; j--) {
        const row = rows[j];
        if (row === "top") continue;
        const y = base - (j + 1) * rh - falling;
        blit(trunk, cx - tw / 2, y - rh * 0.03, tw, rh * 1.06);
        const i = p.cut + j;
        if (row && !f.gone.has(`${p.at}:${i}`)) {
          const by = y + (rh - bh) / 2;
          if (row === 1) blit(limb, cx + tw * 0.36, by, bw, bh); else blit(limb, cx - tw * 0.36 - bw, by, bw, bh, true);
        }
      }
    }
    // what was cut out, flying off
    f.flying = f.flying.filter((x) => now - x.at < FLY);
    if (!reduced) for (const x of f.flying) {
      const e = (now - x.at) / FLY, dx = -x.side * e * W * 0.42, dy = -Math.sin(e * Math.PI) * rh * 0.9 + e * rh * 0.6;
      ctx.globalAlpha = 1 - e * e;
      blit(trunk, cx - tw / 2 + dx, base - rh + dy, tw, rh * 1.06, false, -x.side * e * 2.4);
      ctx.globalAlpha = 1;
    }
    f.chips = f.chips.filter((c) => now - c.at < 420);
    for (const c of f.chips) {
      const e = (now - c.at) / 1000, x = cx + (c.x + c.vx * e) * rh, y = base - rh * 0.5 + (c.vy * e + 9 * e * e) * rh;
      ctx.fillStyle = "#f3d9a4";
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(2, Math.round(rh * 0.09)), Math.max(2, Math.round(rh * 0.09)));
    }

    // the boughs the trunk goes up into: branches are seen only so far up (they lift away once the top is in sight)
    const hidden = !felledAll && st.chops - (over ? st.chops : p.cut) > game.ahead + 1, want = hidden ? 1 : 0;
    f.lift = reduced ? want : f.lift + (want - f.lift) * 0.25;
    const [gw0, gh0] = sizeOf("gameBoughs"), gw = Math.max(W * 1.25, rh * 9), gh = gw * (gh0 / gw0), edge = base - (game.ahead + 1) * rh + rh * 0.12;
    const top = edge - gh * 0.52 - (1 - f.lift) * (edge + rh);
    if (top + gh * 0.56 > 0) {
      if (top > 0) { ctx.fillStyle = "#12302a"; ctx.fillRect(0, 0, W, Math.ceil(top) + 1); }
      blit("gameBoughs", (W - gw) / 2, top, gw, gh);
    }

    // my own doll at the trunk, on the side it last chopped from (before the first chop: the left), and the axe
    // (before the first chop of a tree: on the side the lowest branch in sight is not on)
    const first = rows.find((r, j) => j > 0 && (r === 1 || r === -1));
    const side: Side = p.running && p.side ? p.side : first === -1 ? 1 : first === 1 ? -1 : p.side || -1, doll = kit.current, tall = rh * 2.05, at = cx + side * (tw / 2 + rh * 0.78);
    const blow = now - f.hitAt, shake = !reduced && blow < BLOW ? Math.sin(blow / 22) * rh * 0.08 * (1 - blow / BLOW) : 0;
    if (doll && look) {
      const stands = doll.heightOf(look) ?? 77, scale = Math.min(tall / 77, (rh * 3.1) / stands);
      if (blow < BLOW && Math.floor(blow / 60) % 2 === 1 && !reduced) ctx.globalAlpha = 0.45;
      doll.draw(ctx, look, "front", side > 0, at + shake, ground, scale, {}, dpr);
      ctx.globalAlpha = 1;
    }
    const ic = icons.current, cell = ICON_ATLAS.icons["axe" as IconName];
    if (ic?.complete && ic.naturalWidth && cell && !p.dropped) {
      const swing = reduced ? 1 : Math.min(1, since / SWING), bite = swing < 0.45 ? swing / 0.45 : 1 - (swing - 0.45) / 0.55;
      const size = rh * 0.95, ax = cx + side * (tw / 2 + rh * 0.36), ay = ground - tall * 0.4;
      ctx.save();
      ctx.translate(Math.round(ax + shake), Math.round(ay));
      // (the icon stands at a slant, its blade up and to the right: raised over the shoulder, and brought down into the trunk)
      ctx.scale(-side, 1);
      ctx.rotate(-0.9 + bite * 1.5);
      ctx.drawImage(ic, cell[0], cell[1], cell[2], cell[3], -Math.round(size * 0.3), -Math.round(size * 0.8), Math.round(size), Math.round((size * cell[3]) / cell[2]));
      ctx.restore();
    }
  }

  // The arrow keys chop (and A, D); Escape gives the work up. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      const side: Side | 0 = e.key === "ArrowLeft" || e.key === "a" || e.key === "A" ? -1 : e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : 0;
      if (!side) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) press(side);
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel, press]);

  const point = (e: React.PointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width) press(e.clientX - box.left < box.width / 2 ? -1 : 1);
  };
  /** The axe's one chop: the tree falls with no game. */
  const one = () => { if (ended.current || play.current.running) return; sfx?.wake(); sfx?.work("timber"); finish({ one: true }); };

  useGameHandle({
    kind: "felling",
    /** The game as it stands, and what is seen of the trunk. */
    state: () => {
      const p = play.current, st = game.stretches[Math.min(p.at, game.stretches.length - 1)];
      return { at: p.at, trees: game.stretches.length, cut: p.cut, chops: st.chops, bar: p.bar, share: barShare(p), running: p.running, side: p.side, misses: missesOf(p), forgiven: p.forgiven.reduce((x, y) => x + y, 0),
        ahead: game.ahead, spared: game.spared, most: game.most, pace: st.pace, over: isOver(game, p), ends: p.ends, rows: seen(game, p, ROWS), spent: game.spent };
    },
    /** A chop from a side (-1 the left, 1 the right); the side no branch comes down on, and the side one does (0: neither). */
    chop: (side: number) => press(side < 0 ? -1 : 1),
    safe: () => { const p = play.current, up = isOver(game, p) ? 0 : game.stretches[p.at].branches[p.cut + 1]; return up === 1 ? -1 : up === -1 ? 1 : p.side || -1; },
    under: () => { const p = play.current; return isOver(game, p) ? 0 : game.stretches[p.at].branches[p.cut + 1] ?? 0; },
    /** A hand that plays by itself, a chop every so many milliseconds. */
    auto: (on: boolean, every = 110) => { auto.current = { on, due: 0, every }; },
    one, twice: (on: boolean) => { twiceRef.current = on; setTwice(on); },
  }, [press, game]);

  const p = play.current, st = game.stretches[Math.min(p.at, game.stretches.length - 1)], many = game.stretches.length > 1;
  const title = `${elder ? (th ? "โค่นต้นไม้เก่าแก่" : "Fell the ancient tree") : th ? "ตัดต้นไม้" : "Fell the tree"}${many ? ` · ${Math.min(p.at + 1, game.stretches.length)}/${game.stretches.length}` : ""}`;
  const ready = !p.running && p.at === 0 && p.cut === 0 && !isOver(game, p);
  return (
    <GameFrame th={th} title={title} need={st.chops} hits={isOver(game, p) && p.ends[game.stretches.length - 1] === "felled" ? st.chops : p.cut} misses={missesOf(p)} most={game.most} onCancel={onCancel}>
      {/* how it is played, in three marks */}
      <ul className="mb-1.5 grid grid-cols-3 gap-1 text-[#ffeccb]" data-felling-how>
        {([
          [<span key="k" aria-hidden className="flex shrink-0 gap-0.5 font-data text-meta font-semibold text-[#3a2209]"><kbd className="rounded-[3px] bg-[#f0c060] px-1">←</kbd><kbd className="rounded-[3px] bg-[#f0c060] px-1">→</kbd></span>,
            th ? "ฟันซ้ายหรือขวา" : "Chop left or right", th ? "หรือแตะฝั่งนั้น" : "or tap that side"],
          [<TownIcon key="b" name={"pineBranch" as IconName} size={24} />, th ? "ระวังกิ่งไม้" : "Mind the branches", th ? "อย่ายืนใต้กิ่ง" : "never stand under one"],
          [<span key="t" aria-hidden className="block h-3 w-7 shrink-0 border-2 border-[#2a190d] bg-[#2a190d]"><span className="block h-full w-2/3 bg-[#8fd45f]" /></span>,
            th ? "โค่นให้ทันเวลา" : "Beat the bar", th ? "แถบหมด ต้นไม้ไม่ล้ม" : "out of time, it stands"],
        ] as const).map(([mark, what, more], i) => (
          <li key={i} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[4px] border-2 border-[#2a190d] bg-[#4a2f18] px-1 py-1 text-center">
            {mark}
            <span className="flex flex-col leading-tight"><span className="text-meta font-semibold">{what}</span><span className="text-label text-[#e9cfa4]">{more}</span></span>
          </li>
        ))}
      </ul>
      <div className={`${STAGE} aspect-[5/6] w-full touch-none sm:aspect-square`} data-look="felling" data-felling-stage data-ready={ready ? "" : undefined} onPointerDown={point}>
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {/* the bar of time */}
        <span className="absolute inset-x-2 top-2 block h-3.5 border-2 border-[#2a190d] bg-[#2a190d]/80" role="progressbar" aria-label={th ? "เวลา" : "Time"} data-felling-bar>
          <span ref={bar} className="block h-full w-full origin-left bg-[#8fd45f]" />
        </span>
        {/* the two sides, to touch */}
        <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 grid size-11 place-items-center rounded-full border-2 border-[#2a190d] bg-[#f0c060]/85 font-data text-title font-semibold text-[#3a2209]">←</span>
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 grid size-11 place-items-center rounded-full border-2 border-[#2a190d] bg-[#f0c060]/85 font-data text-title font-semibold text-[#3a2209]">→</span>
        {game.spared > 0 && (
          <span className="pointer-events-none absolute right-2 top-7 flex items-center gap-1 rounded-full border-2 border-[#2a190d] bg-[#4a2f18]/90 px-1.5 py-0.5 font-data text-label tabular-nums text-[#ffeccb]" data-felling-spared={game.spared - (p.forgiven[Math.min(p.at, game.stretches.length - 1)] ?? 0)}>
            <TownIcon name={"pineBranch" as IconName} size={16} />×{Math.max(0, game.spared - (p.forgiven[Math.min(p.at, game.stretches.length - 1)] ?? 0))}
          </span>
        )}
        {(banner || ready) && (
          <p className="pointer-events-none absolute inset-x-3 top-8 mx-auto w-fit max-w-full rounded-md border-2 border-[#2a190d] bg-[#3a2513]/95 px-3 py-1 text-center text-read font-semibold text-[#ffeccb]" aria-live="polite" data-felling-banner={banner ? "" : "ready"}>
            {banner ?? (th ? "กด ← หรือ → เพื่อเริ่มฟัน" : "Press ← or → to begin")}
          </p>
        )}
      </div>
      {/* the axe's own, counted by the day: offered before the first chop */}
      {ready && powers && (powers.one > 0 || powers.twice > 0) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {powers.one > 0 && !elder && (
            <button type="button" onClick={one} data-felling-one data-left={powers.one}
                    className="pressable flex min-h-11 items-center gap-2 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-3 text-ui font-semibold text-[#3a2209] shadow-[inset_0_-3px_0_#c98f2f,inset_0_2px_0_#ffe19a]">
              <TownIcon name={"axe" as IconName} size={22} />{th ? "ฟันเดียวล้ม" : "One stroke"}
              <span className="rounded-full bg-[#3a2209]/15 px-2 py-px font-data text-meta tabular-nums">{powers.one}</span>
            </button>
          )}
          {powers.twice > 0 && !elder && (
            <button type="button" aria-pressed={twice} onClick={() => { twiceRef.current = !twice; setTwice(!twice); }} data-felling-twice data-left={powers.twice}
                    className={`pressable flex min-h-11 items-center gap-2 rounded-md border-[3px] border-[#2a190d] px-3 text-ui font-semibold shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] ${twice ? "bg-[#8fd45f] text-[#1c3a0d]" : "bg-[#4a2f18] text-[#ffeccb]"}`}>
              <TownIcon name={"log" as IconName} size={22} />{th ? "ไม้สองเท่า" : "Double haul"}
              <span className="rounded-full bg-black/20 px-2 py-px font-data text-meta tabular-nums">{powers.twice}</span>
            </button>
          )}
        </div>
      )}
    </GameFrame>
  );
}
