"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  barShare, beginPlay, brace, chop, headingFor, isOver, leave, missesOf, onTheEdge, outcomeOf, paceNow, seen, startFelling, tick, timberOf,
  type FellEnd, type FellOutcome, type FellPlay, type FellingAsk, type Side,
} from "@/lib/town/felling";
import type { Look } from "@/lib/town/look";
import { loadPixelKit, type PixelKit } from "@/lib/town/pixeldoll";
import { loadFelling, type Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { STAGE, useFrames, useGameHandle } from "./TownGame";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";

/** How many segments of the trunk the board shows at once, the one that is level and those above it. */
const ROWS = 8;
/** How long a chop's pictures last, in milliseconds: the trunk coming down a segment, the axe's swing, the cut piece flying off, a branch's blow, and what a chop put back into the bar. */
const DROP = 90, SWING = 170, FLY = 320, BLOW = 380, GAIN = 420;
/** The board stays up so long after a go is over. */
const REST = 900;
/** How wide a trunk is drawn, by its girth (a plain one is the picture's own width, a little over); the ancient tree's is its own. */
const WIDE = [0.84, 1.12, 1.44] as const, WIDE_ELDER = 1.7;
/** What a pine of each girth is called. */
export const GIRTH_NAME: ReadonlyArray<[th: string, en: string]> = [["สนต้นเล็ก", "Slender pine"], ["สนต้นกลาง", "Plain pine"], ["สนต้นใหญ่", "Stout pine"]];
const TIMBER = ("timber" in ICON_ATLAS.icons ? "timber" : "log") as IconName;

interface Flying { at: number; side: Side }
interface Chip { at: number; x: number; y: number; vx: number; vy: number }
/** The pictures the board draws from: its own sheet, the icons' (for the axe), and my own doll's. */
interface Arts { img: HTMLImageElement; art: (name: string) => Sprite | null }

/** What the board says when a go is over, by how it ended (a pine comes down however it went; the ancient tree stands when its go is lost). */
function endWord(end: FellEnd, timber: number, elder: boolean, th: boolean): string {
  if (end === "through") {
    if (elder) return th ? "โค่นต้นไม้เก่าแก่ได้แล้ว!" : "The ancient tree is down!";
    return timber > 0 ? (th ? `ล้มแล้ว! ไม้เนื้อดี ×${timber}` : `Timber! Fine timber ×${timber}`) : th ? "ล้มแล้ว ได้แต่ท่อนไม้" : "Down: logs only";
  }
  const how = end === "time" ? (th ? "ไม่ทันเวลา" : "Out of time") : end === "dropped" ? (th ? "ขวานหลุดมือ" : "The axe slipped") : th ? "วางขวาน" : "Axe put down";
  return elder ? (th ? `${how} ต้นไม้เก่าแก่ยังยืนอยู่` : `${how}: the ancient tree stands`) : th ? `${how} ต้นไม้ล้มแล้ว ได้แต่ท่อนไม้` : `${how}: it is down, logs only`;
}

/**
 * A tree being felled for its fine timber, on the screen (lib/town/felling): the trunk in the middle of a clearing,
 * as wide as its girth, my own doll beside it with the axe, a chop from the left or from the right, branches coming
 * down with the trunk, and a bar of time along the top. The left and right arrow keys chop, or a touch on that half
 * of the picture.
 *
 * The tree comes down however the go ends; the board is played for the fine timber, and says where that stands: a
 * pip for each fine timber the go is still heading for, going out at the miss that loses it.
 *
 * The one board of the town that says how it is played (the owner, 2026-10-08, of a game nobody had understood:
 * "ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย"): three short marks under its title, each a picture and a few words.
 */
export default function TownFelling({ th, ask, elder, look, reduced, sfx, powers, braced, onDone, onCancel }: {
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
  /** The friend who braces the trunk just now, by name, if anybody does: from then on the bar runs slower, for this go. */
  braced?: string | null;
  onDone: (out: FellOutcome, how: { one?: boolean; twice?: boolean }) => void;
  /** The board is left before its first chop: nothing was begun. */
  onCancel: () => void;
}) {
  const game = useMemo(() => startFelling(ask), [ask]);
  const play = useRef<FellPlay>(beginPlay(game));
  const [, setShown] = useState(0);
  const [twice, setTwice] = useState(false);
  const twiceRef = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null), bar = useRef<HTMLSpanElement>(null), gain = useRef<HTMLSpanElement>(null);
  const arts = useRef<Arts | null>(null), icons = useRef<HTMLImageElement | null>(null), kit = useRef<PixelKit | null>(null);
  // what a chop leaves on the screen for a moment
  const fx = useRef({ chopAt: -1e9, hitAt: -1e9, gainAt: -1e9, gainFrom: 0, gainTo: 0, side: 0 as Side | 0, flying: [] as Flying[], chips: [] as Chip[], gone: new Set<number>(), lift: 0 });
  const [banner, setBanner] = useState<string | null>(null);
  const [by, setBy] = useState<string | null>(null);
  const ended = useRef(false), auto = useRef<{ on: boolean; due: number; every: number }>({ on: false, due: 0, every: 110 });

  useEffect(() => { let on = true; loadFelling().then((a) => { if (on) arts.current = a; }).catch(() => { /* the stage is its plain hollow until the picture comes */ }); return () => { on = false; }; }, []);
  useEffect(() => { const i = new Image(); i.decoding = "async"; i.src = ICON_ATLAS.image; icons.current = i; }, []);
  useEffect(() => { let on = true; if (look) loadPixelKit(look.race).then((k) => { if (on) kit.current = k; }).catch(() => { /* the axe alone, until a reload */ }); return () => { on = false; }; }, [look]);

  /** The go is over: what the board says of it, and after a moment it is handed on. */
  const finish = useCallback((how: { one?: boolean } = {}) => {
    if (ended.current) return;
    ended.current = true;
    const p = play.current, out = outcomeOf(game, p), asked = { ...how, ...(twiceRef.current ? { twice: true } : {}) };
    if (!how.one && p.end) setBanner(endWord(p.end, headingFor(game, p).reduce((a, b) => a + b, 0), elder, th));
    window.setTimeout(() => onDone(out, asked), how.one ? 0 : REST);
  }, [game, onDone, elder, th]);

  /**
   * Time goes by, up to a moment: the bar runs down by the clock itself, not by the frames drawn (a page that is
   * drawn seldom, behind another window, has no slower a bar; and a chop is judged with the bar as it is at that
   * moment). Run out, the go is over.
   */
  const clock = useRef<number | null>(null);
  const advance = useCallback((now: number) => {
    const last = clock.current ?? now, was = play.current;
    clock.current = now;
    if (ended.current || isOver(game, was)) return;
    const next = tick(game, was, Math.min(10, Math.max(0, (now - last) / 1000)));
    if (next === was) return;
    play.current = next;
    if (!isOver(game, next)) return;
    // the bar ran out
    sfx?.wake(); sfx?.work(elder ? "nothing" : "timber");
    fx.current.side = 0;
    setShown((n) => n + 1);
    finish();
  }, [game, sfx, elder, finish]);

  // A friend braces the trunk: the bar runs slower from now, for this go (once: it holds though the friend lets go).
  useEffect(() => {
    if (!braced || ended.current) return;
    const was = play.current, now = brace(game, was);
    if (now === was) return;
    advance(performance.now());
    play.current = brace(game, play.current);
    setBy(braced);
    sfx?.wake(); sfx?.work("pluck", 0.8);
  }, [braced, game, advance, sfx]);

  /** A chop from a side. */
  const press = useCallback((side: Side) => {
    const now = performance.now(), f = fx.current;
    advance(now);
    const was = play.current;
    if (ended.current || isOver(game, was)) return;
    const did = chop(game, was, side);
    if (!did.what) return;
    play.current = did.play;
    sfx?.wake();
    f.chopAt = now; f.side = side;
    // what the chop put back into the bar, to be seen for a moment
    const from = barShare(was), to = barShare(did.play);
    if (to > from) { f.gainAt = now; f.gainFrom = from; f.gainTo = to; }
    // the piece that was cut out flies off, away from the hand, with the branch it had
    f.flying.push({ at: now, side });
    if (!reduced) for (let i = 0; i < 5; i++) f.chips.push({ at: now, x: side * 0.35, y: 0, vx: -side * (0.6 + Math.random() * 1.6), vy: -(1 + Math.random() * 2.2) });
    if (did.what === "hit" || did.what === "dropped") { f.hitAt = now; sfx?.work("crack"); }
    else if (did.what === "forgiven") { f.gone.add(was.cut + 1); sfx?.work("chop"); sfx?.work("pluck", 0.7); }
    else if (did.what === "felled") sfx?.work("timber");
    else sfx?.work("chop");
    if (did.what === "dropped") sfx?.work(elder ? "wrong" : "timber");
    setShown((n) => n + 1);
    if (isOver(game, did.play)) finish();
  }, [game, reduced, sfx, elder, finish, advance]);

  // The board is taken away while a go is on (whoever played walked off): the axe is put down, and the go is handed on as it stands.
  const handOn = useRef(onDone);
  handOn.current = onDone;
  useEffect(() => () => {
    const p = play.current;
    if (ended.current || !p.running || isOver(game, p)) return;
    ended.current = true;
    play.current = leave(game, p);
    handOn.current(outcomeOf(game, play.current), twiceRef.current ? { twice: true } : {});
  }, [game]);

  /** The board's own way out: before the first chop nothing was begun; after it the axe is put down, and the go is over. */
  const stop = useCallback(() => {
    if (ended.current) return;
    advance(performance.now());
    const was = play.current;
    if (isOver(game, was)) return;
    if (!was.running) { onCancel(); return; }
    play.current = leave(game, was);
    sfx?.wake(); sfx?.work(elder ? "nothing" : "timber");
    setShown((n) => n + 1);
    finish();
  }, [game, advance, onCancel, sfx, elder, finish]);

  useFrames((_dt, now) => {
    advance(now);
    if (!ended.current && !isOver(game, play.current)) {
      // (for scripts: a hand that plays by itself, from the side no branch comes down on)
      const a = auto.current, p = play.current;
      if (a.on && now >= a.due) {
        a.due = now + a.every;
        const up = game.branches[p.cut + 1];
        press(up === 1 ? -1 : up === -1 ? 1 : p.side || -1);
      }
    }
    const f = fx.current;
    if (bar.current) {
      const share = barShare(play.current);
      bar.current.style.transform = `scaleX(${share.toFixed(4)})`;
      bar.current.style.backgroundColor = share > 0.5 ? "#8fd45f" : share > 0.25 ? "#f0c060" : "#e9573f";
    }
    if (gain.current) {
      // (what the last chop put back: a bright piece of the bar where it was added, fading; with motion off it only shows and goes)
      const e = (now - f.gainAt) / GAIN, on = e >= 0 && e < 1;
      gain.current.style.opacity = on ? (reduced ? "0.9" : (0.95 * (1 - e)).toFixed(3)) : "0";
      if (on) { gain.current.style.left = `${(f.gainFrom * 100).toFixed(2)}%`; gain.current.style.width = `${((f.gainTo - f.gainFrom) * 100).toFixed(2)}%`; }
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
    // (a segment is as tall as the stage allows with every segment whose branch is seen in sight, and one more for the boughs)
    const inSight = Math.max(5, Math.min(ROWS, game.ahead + 2)), cx = W / 2, ground = H * 0.9;
    const rh = Math.min((ground - H * 0.07) / (inSight + 0.75), W * 0.2), base = ground - rh * 0.7;
    const trunk = elder ? "fellElder" : "fellTrunk", limb = elder ? "fellElderBranch" : "fellBranch";
    // (the trunk is as wide as its girth: a slender pine's is thin, a stout one's broad)
    const [tw0, th0] = sizeOf(trunk), tw = rh * (tw0 / th0) * (elder ? WIDE_ELDER : WIDE[game.girth - 1]), [bw0, bh0] = sizeOf(limb), bw = rh * 1.55, bh = bw * (bh0 / bw0);
    // (the trunk comes down a segment after a chop: for a moment it is still on its way)
    const since = now - f.chopAt, falling = reduced || over ? 0 : Math.max(0, 1 - since / DROP) * rh;
    // (a pine is down however the go ended; the ancient tree stands when its go was lost)
    const rows = seen(game, p, ROWS), down = over && (p.end === "through" || !elder);

    // the stump the trunk stands on
    const [pw0, ph0] = sizeOf("fellStump"), pw = tw * 1.7, ph = pw * (ph0 / pw0);
    blit("fellStump", cx - pw / 2, ground + rh * 0.16 - ph, pw, ph);

    if (!down) {
      // the trunk, from the segment that is level upwards; each with its branch, where it is seen
      for (let j = rows.length - 1; j >= 0; j--) {
        const row = rows[j];
        if (row === "top") continue;
        const y = base - (j + 1) * rh - falling;
        blit(trunk, cx - tw / 2, y - rh * 0.03, tw, rh * 1.06);
        if (row && !f.gone.has(p.cut + j)) {
          const y2 = y + (rh - bh) / 2;
          if (row === 1) blit(limb, cx + tw * 0.36, y2, bw, bh); else blit(limb, cx - tw * 0.36 - bw, y2, bw, bh, true);
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
    const hidden = !down && game.chops - (over ? game.chops : p.cut) > game.ahead + 1, want = hidden ? 1 : 0;
    f.lift = reduced ? want : f.lift + (want - f.lift) * 0.25;
    const [gw0, gh0] = sizeOf("gameBoughs"), gw = Math.max(W * 1.25, rh * 9), gh = gw * (gh0 / gw0), edge = base - (game.ahead + 1) * rh + rh * 0.12;
    const top = edge - gh * 0.52 - (1 - f.lift) * (edge + rh);
    if (top + gh * 0.56 > 0) {
      if (top > 0) { ctx.fillStyle = "#12302a"; ctx.fillRect(0, 0, W, Math.ceil(top) + 1); }
      blit("gameBoughs", (W - gw) / 2, top, gw, gh);
    }

    // my own doll at the trunk, on the side it last chopped from, and the axe
    // (before the first chop: on the side the lowest branch in sight is not on)
    const first = rows.find((r, j) => j > 0 && (r === 1 || r === -1));
    const side: Side = p.running && p.side ? p.side : first === -1 ? 1 : first === 1 ? -1 : p.side || -1, doll = kit.current, tall = rh * 2.05, at = cx + side * (tw / 2 + rh * 0.78);
    const blow = now - f.hitAt, shake = !reduced && blow < BLOW ? Math.sin(blow / 22) * rh * 0.08 * (1 - blow / BLOW) : 0;
    if (doll && look) {
      const stands = doll.heightOf(look) ?? 77, scale = Math.min(tall / 77, (rh * 3.1) / stands);
      if (blow < BLOW && Math.floor(blow / 60) % 2 === 1 && !reduced) ctx.globalAlpha = 0.45;
      doll.draw(ctx, look, "front", side > 0, at + shake, ground, scale, {}, dpr);
      ctx.globalAlpha = 1;
    }
    // (a branch that has come level on my side is on me: drawn over the doll, and the stage flushes red for a moment)
    const level = rows[0], on = !down && (level === 1 || level === -1) && level === side && !f.gone.has(p.cut);
    if (on) {
      const y = base - rh - falling + (rh - bh) / 2;
      if (level === 1) blit(limb, cx + tw * 0.36, y, bw, bh); else blit(limb, cx - tw * 0.36 - bw, y, bw, bh, true);
    }
    if (blow < 140) { ctx.fillStyle = `rgba(233,87,63,${(0.22 * (1 - blow / 140)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const ic = icons.current, cell = ICON_ATLAS.icons["axe" as IconName];
    if (ic?.complete && ic.naturalWidth && cell && p.end !== "dropped" && p.end !== "left") {
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

  // The arrow keys chop (and A, D); Escape is the board's way out. Heard before the town hears them.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stop(); return; }
      const side: Side | 0 = e.key === "ArrowLeft" || e.key === "a" || e.key === "A" ? -1 : e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : 0;
      if (!side) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) press(side);
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [stop, press]);

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
      const p = play.current;
      return { trees: game.trees.map((t) => t.id), girth: game.girth, family: game.family, cut: p.cut, chops: game.chops, bar: p.bar, share: barShare(p), running: p.running, side: p.side, misses: missesOf(p), forgiven: p.forgiven,
        ahead: game.ahead, spared: game.spared, most: game.most, pace: paceNow(game, p), braced: p.braced, over: isOver(game, p), end: p.end, heading: headingFor(game, p), edge: onTheEdge(game, p), rows: seen(game, p, ROWS), spent: game.spent };
    },
    /** A chop from a side (-1 the left, 1 the right); the side no branch comes down on, and the side one does (0: neither). */
    chop: (side: number) => press(side < 0 ? -1 : 1),
    safe: () => { const p = play.current, up = isOver(game, p) ? 0 : game.branches[p.cut + 1]; return up === 1 ? -1 : up === -1 ? 1 : p.side || -1; },
    under: () => { const p = play.current; return isOver(game, p) ? 0 : game.branches[p.cut + 1] ?? 0; },
    /** A hand that plays by itself, a chop every so many milliseconds. */
    auto: (on: boolean, every = 110) => { auto.current = { on, due: 0, every }; },
    one, stop, twice: (on: boolean) => { twiceRef.current = on; setTwice(on); },
  }, [press, game, stop]);

  const p = play.current, over = isOver(game, p), many = game.trees.length > 1;
  const what = elder ? (th ? "ต้นไม้เก่าแก่" : "the ancient tree") : th ? GIRTH_NAME[game.girth - 1][0] : GIRTH_NAME[game.girth - 1][1].toLowerCase();
  const title = `${th ? `โค่น${what}` : `Fell ${elder ? what : `a ${what}`}`}${many ? (th ? ` · ${game.trees.length} ต้น` : ` · ${game.trees.length} trees`) : ""}`;
  const ready = !p.running && p.cut === 0 && !over;
  const heading = headingFor(game, p), edge = onTheEdge(game, p), left = Math.max(0, game.most - missesOf(p));
  const spared = Math.max(0, game.spared - p.forgiven);
  return (
    <section aria-label={title} data-town-game data-felling-girth={game.girth}
             className="select-none rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
      <div className="flex min-h-9 items-center gap-2">
        <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{title}</h2>
        {/* tired hands: a mark for each miss they still have in them, going out one by one */}
        {game.most > 0 && (
          <span className="ml-1 flex gap-1" aria-label={th ? `พลาดได้อีก ${left}` : `${left} misses left`} data-misses-left={left}>
            {Array.from({ length: game.most }, (_, i) => <span key={i} className={`size-2.5 border-2 border-[#2a190d] ${i < left ? "bg-[#e9573f]" : "bg-[#4a2f18]"}`} />)}
          </span>
        )}
        <button type="button" onClick={stop} data-felling-stop={p.running ? "leave" : "cancel"}
                className="pressable -mr-1 ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">
          {p.running ? (th ? "วางขวาน" : "Put the axe down") : th ? "เลิก" : "Stop"}
        </button>
      </div>
      {/* how it is played, in three marks */}
      <ul className="mb-1.5 grid grid-cols-3 gap-1 text-[#ffeccb]" data-felling-how>
        {([
          [<span key="k" aria-hidden className="flex shrink-0 gap-0.5 font-data text-meta font-semibold text-[#3a2209]"><kbd className="rounded-[3px] bg-[#f0c060] px-1">←</kbd><kbd className="rounded-[3px] bg-[#f0c060] px-1">→</kbd></span>,
            th ? "ฟันซ้ายหรือขวา" : "Chop left or right", th ? "หรือแตะฝั่งนั้น" : "or tap that side"],
          [<TownIcon key="b" name={"pineBranch" as IconName} size={24} />, th ? "อย่ายืนใต้กิ่ง" : "Never under a branch", elder ? (th ? "โดนกิ่งแล้วเสียเวลา" : "a hit costs time") : th ? "โดนกิ่ง ไม้เนื้อดีลด" : "a hit costs fine timber"],
          [<span key="t" aria-hidden className="block h-3 w-7 shrink-0 border-2 border-[#2a190d] bg-[#2a190d]"><span className="block h-full w-2/3 bg-[#8fd45f]" /></span>,
            th ? "ฟันให้ขาดก่อนแถบหมด" : "Cut through in time", elder ? (th ? "ไม่ทัน ต้นไม้ไม่ล้ม" : "too slow: it stands") : th ? "ไม่ทันก็ยังได้ท่อนไม้" : "too slow: logs all the same"],
        ] as const).map(([mark, word, more], i) => (
          <li key={i} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[4px] border-2 border-[#2a190d] bg-[#4a2f18] px-1 py-1 text-center">
            {mark}
            <span className="flex flex-col leading-tight"><span className="text-meta font-semibold">{word}</span><span className="text-label text-[#e9cfa4]">{more}</span></span>
          </li>
        ))}
      </ul>
      <div className={`${STAGE} aspect-[5/6] w-full touch-none sm:aspect-square`} data-look="felling" data-felling-stage data-ready={ready ? "" : undefined} onPointerDown={point}>
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {/* the bar of time, and over it for a moment what a chop put back */}
        <span className={`absolute inset-x-2 top-2 block h-3.5 border-2 bg-[#2a190d]/80 ${p.braced ? "border-[#9fd8ff]" : "border-[#2a190d]"}`} role="progressbar" aria-label={th ? "เวลา" : "Time"} data-felling-bar data-braced={p.braced ? "" : undefined}>
          <span ref={bar} className="block h-full w-full origin-left bg-[#8fd45f]" />
          <span ref={gain} aria-hidden className="absolute inset-y-0 block bg-[#f4ffd9] opacity-0" data-felling-gain />
        </span>
        {/* where the go stands: the fine timber it is heading for, a pip each (a group a tree), and the chops made */}
        <div className="pointer-events-none absolute inset-x-2 top-7 flex flex-wrap items-start gap-1.5">
          <span className="flex items-center gap-1 rounded-full border-2 border-[#2a190d] bg-[#4a2f18]/90 px-1.5 py-0.5 font-data text-label tabular-nums text-[#ffeccb]" data-felling-cut={p.cut} data-felling-chops={game.chops}
                data-hits={p.end === "through" ? game.chops : p.cut} data-need={game.chops}>
            <TownIcon name={"axe" as IconName} size={16} />{p.end === "through" ? game.chops : p.cut}/{game.chops}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 rounded-full border-2 border-[#2a190d] bg-[#4a2f18]/90 px-1.5 py-0.5" data-felling-pips={heading.join(",")} data-edge={edge ? "" : undefined}
                role="img" aria-label={th ? `ไม้เนื้อดีที่กำลังจะได้ ${heading.reduce((a, b) => a + b, 0)}` : `Fine timber in reach: ${heading.reduce((a, b) => a + b, 0)}`}>
            {!many && !elder && <span className="pl-0.5 text-label text-[#ffeccb]">{th ? "ไม้เนื้อดี" : "Fine timber"}</span>}
            {game.trees.map((t, i) => (
              <span key={t.id} className="flex gap-0.5">
                {t.timber.map((_, j) => {
                  // (the pip that the next miss puts out has an amber edge)
                  const lit = j < heading[i], last = lit && j === heading[i] - 1 && !over && timberOf(t.timber, missesOf(p) + 1) < heading[i];
                  return <span key={j} className={`grid size-[22px] place-items-center rounded-[3px] border-2 ${lit ? (last ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#5a3a1c]") : "border-[#2a190d] bg-[#2a190d]/70 opacity-45 grayscale"}`} data-pip={lit ? (last ? "edge" : "lit") : "out"}><TownIcon name={TIMBER} size={16} /></span>;
                })}
              </span>
            ))}
          </span>
          {spared > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full border-2 border-[#2a190d] bg-[#4a2f18]/90 px-1.5 py-0.5 font-data text-label tabular-nums text-[#ffeccb]" data-felling-spared={spared}>
              <TownIcon name={"pineBranch" as IconName} size={16} />×{spared}
            </span>
          )}
        </div>
        {/* the two sides, to touch */}
        <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 grid size-11 place-items-center rounded-full border-2 border-[#2a190d] bg-[#f0c060]/85 font-data text-title font-semibold text-[#3a2209]">←</span>
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 grid size-11 place-items-center rounded-full border-2 border-[#2a190d] bg-[#f0c060]/85 font-data text-title font-semibold text-[#3a2209]">→</span>
        {by && !over && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 mx-auto w-fit max-w-[70%] truncate rounded-full border-2 border-[#2a190d] bg-[#24465c]/95 px-3 py-0.5 text-center text-meta font-semibold text-[#dff3ff]" aria-live="polite" data-felling-braced>
            {th ? `${by} ช่วยค้ำต้นไม้ แถบเดินช้าลง` : `${by} braces the trunk: a slower bar`}
          </p>
        )}
        {(banner || ready) && (
          <p className="pointer-events-none absolute inset-x-3 top-[4.25rem] mx-auto w-fit max-w-full rounded-md border-2 border-[#2a190d] bg-[#3a2513]/95 px-3 py-1 text-center text-read font-semibold text-[#ffeccb]" aria-live="polite" data-felling-banner={banner ? "" : "ready"}>
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
    </section>
  );
}
