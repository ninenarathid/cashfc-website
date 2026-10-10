"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUGS, FLUTE, HABITS, HAUNTS, LURED, LURES, NET, PAIR, aimAt, aimOf, againMs, asleep, bugTurn, bugTurnStart, fledBy, followerPose, lulled, luredHaunt, mayNet, missed, newMind, poseOf, ringOf, stealthOf, swingMs, taken, think, windy,
  type BugId, type BugSight, type Haunt, type Lured, type Mind, type Person, type Pose,
} from "@/lib/town/insects";
import { ridWords } from "@/lib/town/farm";
import { insectCareMode, scentMods } from "@/lib/town/insect-garden";
import { missesWith, netFx, partOf, slowPartOf } from "@/lib/town/forged";
import { optN } from "@/lib/town/tools";
import { powerLeft } from "@/lib/town/powers";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { GIFTS, USES, familiarOf, harderFor, hasThing, numberOf, usesLeft, wearing } from "@/lib/town/gifts";
import { isSpent } from "@/lib/town/stamina";
import { handOf, heldStack } from "@/lib/town/trade";
import { TILE_H, placeOf, type Vec } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownFoot from "./TownFoot";
import { WHY } from "./TownTrade";
import { Vfx } from "./vfx";

/**
 * What is written over the head of whoever catches a ladybird that took a pest off some plant with it (the owner,
 * 2026-10-05: "จะมี text ขึ้นบนหัว ซักครู่ … ทำให้ดูคลุมเคลือหน่อย"): that it happened, not where or to whose plant; and how
 * long it stays, in milliseconds.
 */
const RID: [th: string, en: string] = ["จับเต่าทองตัวนี้แล้ว ศัตรูพืชที่ไหนสักแห่งก็หายไปหนึ่งตัว", "With this one caught, a pest somewhere is gone"];
const RID_MS = 6000;
/**
 * How an insect that eats pests is used, said under what was caught when one is (the owner, 2026-10-06, when he had
 * the two work again: "พร้อมเขียนบอกวิธีใช้ตอนได้แมลงไปเลย"): the one thing of the town's that is told what it is for, by his
 * word. How sure it is, is said as its number (the owner, 2026-10-07; until then in round words that followed it), in
 * the words its line in the bag has (lib/town/farm's `ridWords`); and how long it stays, in milliseconds.
 */
function howTo(id: ItemId, th: boolean): string | null {
  const does = ridWords(id);
  if (!does) return null;
  return th ? `วิธีใช้: ถือ${ITEMS[id].name.th}ไว้ในมือ แล้ว${does.th}` : `Hold the ${ITEMS[id].name.en.toLowerCase()} in your hand. ${does.en}`;
}
const TIP_MS = 9000;
const WHY_BUGS: Record<string, [string, string]> = {
  had: ["จับตัวนี้ไปแล้ว", "You have caught this one already"], bare: ["มีคนจับไปก่อนแล้ว", "Somebody caught it first"], far: ["อยู่ไกลเกินไป", "Too far away"],
  none: ["ไม่อยู่แล้ว", "It is gone"], lure: ["มันปีนกลับขึ้นไปแล้ว", "It has climbed back up"],
  fled: ["มันตกใจหนีไปแล้ว", "It took fright and is gone"],
  // (a drop of nectar: one is out already; nothing is about this place at this hour; the day's drops are used)
  out: ["มีหยดน้ำหวานวางอยู่แล้ว", "A drop is out already"], quiet: ["แถวนี้ตอนนี้ยังไม่มีแมลงมาตอม", "No insect is about here just now"],
  drops: ["วันนี้น้ำหวานหมดแล้ว", "No nectar left today"], left: ["แมลงที่มาตอมน้ำหวานบินไปแล้ว", "The insect at your nectar has flown off"],
  // (the lulling flute: nothing on the screen to lull; it has been played and rests)
  hush: ["ตอนนี้บนจอไม่มีแมลงให้กล่อม", "No insect on the screen to lull"], rests: ["ขลุ่ยยังพักอยู่", "The flute is resting"],
  // (the butterfly-wing cloak: the one that followed was not netted in time)
  flown: ["ตัวที่ตามมาบินหนีไปแล้ว", "The one that followed has flown"],
  // (the silver-web net's mark over one that does not show itself, tapped with no net in the hand: what it is a mark of, and what the hand lacks)
  netless: ["ประกายเงินคือแมลงที่ซ่อนอยู่ · ต้องถือสวิงจึงจะจับได้", "The silver mark is a hidden insect · hold a net to catch it"],
};
/** What is said beside the second of a pair when it is caught. */
const PAIR_WORD: [th: string, en: string] = ["ได้ครบคู่", "the pair"];
/** How long before it is there the insect of a drop is seen flying in, in milliseconds; and from how many tiles off. */
const ARRIVE = { ms: 1700, from: 7 };
/** The lulling flute on the screen: how long its notes and the hush going out from its player show, and how long an insect takes to be itself again as it wakes, in milliseconds. */
const LULL = { notes: 2200, wake: 450 };
/** The second of a pair on the screen (the butterfly-wing cloak): how long it is there to be netted, the cloak's number of seconds; and how long it takes to be off when it was not, in milliseconds. */
const PAIRED = { ms: numberOf("charmCloak") * 1000, off: 500 };
/** The insect that follows one I just caught: its kind, the point of the ground the first was taken over, when it was first seen and when it is off, the seed its wheel follows from, the swings that have missed it, and whether it has been netted or said to be off. */
interface Following { bug: BugId; at: Vec; began: number; until: number; seed: number; missed: number; done: boolean; said: boolean }
const giftName = (id: string, th: boolean) => { const g = GIFTS.find((x) => x.id === id); return g ? (th ? g.name.th : g.name.en) : id; };
/** Where the insects that fled from my tired hands are kept on this device, each until its turn ends: a page opened again does not bring them back. */
const FLED_KEY = "cashTown:bugsFled";
function fledKept(): Map<string, number> {
  try {
    const kept = JSON.parse(window.localStorage.getItem(FLED_KEY) ?? "{}") as Record<string, number>, now = Date.now();
    return new Map(Object.entries(kept).filter(([, until]) => typeof until === "number" && until > now - 60_000));
  } catch { return new Map(); }
}
function keepFled(fled: Map<string, number>) {
  try { window.localStorage.setItem(FLED_KEY, JSON.stringify(Object.fromEntries(fled))); } catch { /* a device that keeps nothing: it is forgotten with the page */ }
}
/** How big an insect is drawn on the map: screen pixels to one of its picture's, at the map's own scale 1. */
const SIZE = 0.66;
/** How near an insect a tap has to be to be a swing at it, and not a step: in tiles. */
const AIM = 1.5;
/** How near the silver-web net's mark over an insect that does not show itself a tap has to be to be a tap on it: in tiles. */
const MARK = 0.9;
/** The colour an insect is drawn in while its picture is not there. */
const DOT = "#f4e9c9";
const far = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const iconFor = (name: string): IconName | null => (name in ICON_ATLAS.icons ? (name as IconName) : null);

/** A swing of the net: where it was aimed, when it began, and when it lands; and whether it is the wind's, which comes down at once. */
interface Swing { at: Vec; began: number; lands: number; done: boolean; wind?: boolean }
/**
 * What the map asks of the wind net while it is pressed (lib/town/gifts' charmWind): whether a press at a point of
 * the map begins an aim (then the press is neither a step nor a pull at the map), where it is dragged to, and where
 * it is let go (null: it is called off, or it was a plain tap, which the map hands over as ever).
 */
export interface BugsAim { press: (at: Vec) => boolean; move: (at: Vec) => void; loose: (at: Vec | null) => void }
/** A little shape of square specks: each a cell across and down from its corner, so many screen pixels a cell; dark behind it, so that it shows over grass in full day. */
function specks(ctx: CanvasRenderingContext2D, cells: ReadonlyArray<readonly [number, number]>, x: number, y: number, u: number, fill: string, edge: string) {
  // (its shade a pixel down and across: an edge all round would fill so small a shape in)
  ctx.fillStyle = edge;
  for (const [cx, cy] of cells) ctx.fillRect(Math.round(x + cx * u) + 1, Math.round(y + cy * u) + 1, u, u);
  ctx.fillStyle = fill;
  for (const [cx, cy] of cells) ctx.fillRect(Math.round(x + cx * u), Math.round(y + cy * u), u, u);
}
const ZED: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]];
const QUAVER: ReadonlyArray<readonly [number, number]> = [[2, 0], [3, 0], [4, 1], [2, 1], [2, 2], [2, 3], [2, 4], [0, 4], [1, 4], [0, 5], [1, 5], [2, 5]];
/** An insect from above, seven cells across and down: two feelers, a body, three legs a side. */
const HIDER: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [5, 0], [2, 1], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3],
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6],
];
/**
 * Whether the silver-web net marks an insect with a little insect of silver in its place, and not with the star it has
 * over the others: one that does not show itself where it is (a cricket in the grass, a beetle still up its tree), and
 * a firefly on the wing, which shows only the moment it glows (the same mark lit or not: one that changed at every
 * blink would flicker; asleep to the flute it lies in plain sight, and has the star). A star over bare ground said
 * nothing of what it was a mark of (the owner, 2026-10-08, of one in the forest at night, which was taken for a place
 * to dig), and it stood a net's miss above where the insect was.
 */
const hides = (id: BugId, pose: Pose) => !pose.seen || (BUGS[id].habit === "look" && !BUGS[id].like && pose.flying);
/** An insect asleep: three small letters going up from it, one after another. */
function drawSleep(ctx: CanvasRenderingContext2D, x: number, top: number, s: number, now: number, still: boolean, seed: number) {
  for (let i = 0; i < 3; i++) {
    const t = still ? (i + 1) / 4 : (now / 2400 + i / 3 + seed * 0.17) % 1, a = Math.sin(Math.PI * t), u = Math.max(2, Math.round((1 + 0.9 * t) * s));
    specks(ctx, ZED, x + (5 + 12 * t) * s + Math.sin(t * 5 + i) * 2 * s, top - (12 + 26 * t) * s, u, `rgba(232,244,255,${a.toFixed(3)})`, `rgba(18,28,58,${(0.8 * a).toFixed(3)})`);
  }
}
/** The flute played: its five notes going up and out from the player's head, and a hush going out over the ground from their feet. */
function drawLull(ctx: CanvasRenderingContext2D, feet: Vec, s: number, t: number, still: boolean) {
  ctx.save();
  if (!still) for (const lag of [0, 0.22]) {
    const k = Math.min(1, Math.max(0, (t - lag) / 0.7));
    if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = `rgba(206,255,232,${(0.55 * (1 - k)).toFixed(3)})`; ctx.lineWidth = Math.max(2, 2.5 * s * (1 - k) + 1);
    groundRing(ctx, feet, 1 + 13 * k, s); ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const k = still ? 0.5 : Math.min(1, Math.max(0, t * 1.25 - i * 0.15)), a = still ? 1 : Math.sin(Math.PI * k), u = Math.max(2, Math.round(1.4 * s));
    if (a <= 0.01) continue;
    const fan = (i - 2) * 0.42, x = feet.x + Math.sin(fan) * (10 + 34 * k) * s, y = feet.y - 62 * s - Math.cos(fan) * 30 * k * s + Math.sin(k * 7 + i) * 2 * s;
    specks(ctx, QUAVER, x, y, u, `rgba(206,255,232,${a.toFixed(3)})`, `rgba(12,48,40,${(0.65 * a).toFixed(3)})`);
  }
  ctx.restore();
}
/** A sleeper waking: from where it slept back to where it would be, `t` of the way (0 to 1), over the ground and up. */
function rising(from: Pose, to: Pose, t: number): Pose {
  const e = t * t * (3 - 2 * t), gx = from.x - from.lift + (to.x - to.lift - (from.x - from.lift)) * e, gy = from.y - from.lift + (to.y - to.lift - (from.y - from.lift)) * e, lift = to.lift * e;
  return { ...to, x: gx + lift, y: gy + lift, lift };
}
// ── forging: old tools ──
/** How long an insect held still by a net takes to be itself again when it is let go, in milliseconds; how near where a swing is aimed the insect it holds has to be, in tiles. */
const HELD = { thaw: 350, near: 1.3 };
/** An insect let go by the net that held it: from where it was held to where it would be, `t` of the way (0 to 1), in the air as it was. */
function eased(from: Pose, to: Pose, t: number): Pose {
  const e = Math.min(1, Math.max(0, t)), k = e * e * (3 - 2 * e);
  return { ...to, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, lift: from.lift + (to.lift - from.lift) * k };
}
/** An insect held still by the net that is coming down on it: a ring of frost about it, running down with the time it has left (`left`: 1 to 0), and four specks of ice. */
function drawHeld(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, left: number, now: number, still: boolean) {
  const cy = y - 6 * s, d = Math.max(2, Math.round(1.8 * s));
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, 2 * s); ctx.strokeStyle = "rgba(18,40,66,0.55)";
  ctx.beginPath(); ctx.arc(x, cy, 12 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(190,236,255,0.95)";
  ctx.beginPath(); ctx.arc(x, cy, 12 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, left))); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4, blink = still ? 1 : 0.6 + 0.4 * Math.sin(now / 170 + i * 1.9);
    const px = Math.round(x + Math.cos(a) * 15 * s), py = Math.round(cy + Math.sin(a) * 15 * s);
    ctx.fillStyle = `rgba(226,246,255,${blink.toFixed(3)})`;
    ctx.fillRect(px - d, py, 3 * d, d);
    ctx.fillRect(px, py - d, d, 3 * d);
  }
  ctx.restore();
}
/** A ring of the ground about a point of the screen, so many tiles across its half: half as high as it is wide, as the map's tiles are. */
const groundRing = (ctx: CanvasRenderingContext2D, c: Vec, tiles: number, s: number) => { ctx.beginPath(); ctx.ellipse(c.x, c.y, tiles * 45 * s, tiles * 22.5 * s, 0, 0, Math.PI * 2); };
/** The wind net held over where it is aimed: how far it reaches about me, faintly, and the gust turning over its ring. */
function drawAim(ctx: CanvasRenderingContext2D, me: Vec, c: Vec, r: number, s: number, now: number, still: boolean, reach = NET.reach) {
  ctx.save();
  ctx.lineWidth = Math.max(1, s);
  ctx.setLineDash([5 * s, 6 * s]);
  ctx.strokeStyle = "rgba(205,238,255,0.4)";
  groundRing(ctx, me, reach, s); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(205,238,255,0.14)"; ctx.strokeStyle = "rgba(225,246,255,0.95)"; ctx.lineWidth = Math.max(1.5, 1.6 * s);
  groundRing(ctx, c, r, s); ctx.fill(); ctx.stroke();
  // four strokes of wind going round it
  ctx.strokeStyle = "rgba(225,246,255,0.75)"; ctx.lineWidth = Math.max(1.5, 1.3 * s); ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = (still ? 0 : now / 260) + (i * Math.PI) / 2;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 1.55 * 45 * s, r * 1.55 * 22.5 * s, 0, a, a + 0.7); ctx.stroke();
  }
  ctx.restore();
}
/** The wind net come down, `t` of the way through the moment it shows (0 to 1): the gust closing in on its ring, and the ring's flash going out. */
function drawGust(ctx: CanvasRenderingContext2D, c: Vec, r: number, s: number, t: number, still: boolean) {
  ctx.save();
  ctx.fillStyle = `rgba(225,246,255,${(0.3 * (1 - t)).toFixed(3)})`; ctx.strokeStyle = `rgba(235,250,255,${(1 - t * 0.8).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, 1.8 * s);
  groundRing(ctx, c, r * (1 + 0.3 * t), s); ctx.fill(); ctx.stroke();
  if (!still) {
    ctx.strokeStyle = `rgba(225,246,255,${(0.9 * (1 - t)).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, 1.4 * s); ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      // each stroke comes in from far out, turning as it comes
      const a = (i * Math.PI) / 3 + t * 1.6, out = r * (2.6 - 1.7 * t);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, out * 45 * s, out * 22.5 * s, 0, a, a + 0.55 * (1 - t) + 0.12); ctx.stroke();
    }
  }
  ctx.restore();
}

/** A drop of nectar on the ground: an amber bead with a light on it and a ring going out from it; and while nothing has come to it yet, its scent rising. */
function drawDrop(ctx: CanvasRenderingContext2D, c: Vec, s: number, now: number, still: boolean, waits: boolean) {
  const u = Math.max(2, Math.round(1.5 * s)), x = Math.round(c.x), y = Math.round(c.y);
  ctx.save();
  if (!still) for (const lag of [0, 0.5]) {
    const t = (now / 1500 + lag) % 1;
    ctx.strokeStyle = `rgba(255,206,104,${(0.85 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, 1.3 * s);
    ctx.beginPath(); ctx.ellipse(x, y - u, (4 + 15 * t) * s, (2 + 7.5 * t) * s, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // the bead: a drop with its point up, a dark edge, an amber body, a light on its shoulder
  const rows: Array<[number, number]> = [[-0.5, 1], [-1.5, 3], [-1.5, 3], [-2.5, 5], [-2.5, 5], [-2.5, 5], [-1.5, 3]];
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, y + 1, 3.6 * u, 1.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5e2d08";
  rows.forEach(([ox, w], i) => ctx.fillRect(Math.round(x + ox * u) - 1, y - (rows.length - i) * u - 1, w * u + 2, u + 2));
  ctx.fillStyle = "#f0a02c";
  rows.forEach(([ox, w], i) => ctx.fillRect(Math.round(x + ox * u), y - (rows.length - i) * u, w * u, u));
  ctx.fillStyle = "#c9761a"; ctx.fillRect(Math.round(x + 0.5 * u), y - 3 * u, 2 * u, 2 * u); ctx.fillRect(Math.round(x - 0.5 * u), y - u, 2 * u, u);
  ctx.fillStyle = "#ffe08a"; ctx.fillRect(Math.round(x - 1.5 * u), y - 4 * u, u, 2 * u); ctx.fillRect(Math.round(x - 0.5 * u), y - 6 * u, u, u);
  ctx.fillStyle = "#fffbe6"; ctx.fillRect(Math.round(x - 1.5 * u), y - 4 * u, u, u);
  if (waits) for (let i = 0; i < 4; i++) {
    const t = still ? (i + 1) / 5 : (now / 1700 + i / 4) % 1;
    ctx.fillStyle = `rgba(255,240,180,${(0.9 * Math.sin(Math.PI * t)).toFixed(3)})`;
    ctx.fillRect(Math.round(x + Math.sin(t * 6 + i * 2) * 5 * s), Math.round(y - 9 * u - t * 22 * s), u, u);
  }
  ctx.restore();
}

/**
 * The insects, to catch (the owner, 2026-10-05: "จับแมลง ในทุกแมพในเกม … สามารถใช้ที่จับแมลงจับมาได้ แต่ต้องวิ่งไปจับให้ทัน
 * (แมลงจะพยายามหนีถ้ามีคนเข้าไปไกล้) … อาศัยความแม่นยำ"). The rules are lib/town/insects'. This is no game on a board:
 * it is played on the map itself. Every haunt that has an insect for me has it drawn there, doing as its kind
 * does, and minding whoever is about on this screen. With a net in the hand a tap on (or just ahead of) an insect
 * within reach is a swing: the ring it will take is shown where it was aimed, and the net comes down on it a
 * moment later. Whatever is under the ring then is caught; a miss near one is something it minds.
 *
 * Nothing is said of how any of them is caught: only what was caught, and why not.
 */
export default function TownBugs({ keeper, th, name, sfx, bottom, busy, register, registerTap, registerAim }: {
  keeper: Keeper;
  th: boolean;
  /** My name, for the village's book of insects. */
  name: string;
  sfx: FishSfx | null;
  /** How far up from the foot of the map what is said sits. */
  bottom: string;
  /** Whether something else has the screen (a talk, the bag, a board): no swing begins then. */
  busy: boolean;
  /** Hand the map the way to draw the insects (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
  /** Hand the map what a tap on it is asked first: whether it was a swing of the net (and take it back with null). */
  registerTap: (tap: ((at: Vec, only?: boolean) => boolean) | null) => void;
  /** Hand the map what a press on it is asked: whether it begins the wind net's aim (and take it back with null). */
  registerAim?: (aim: BugsAim | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 5000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  // (what is out is asked for wherever I am: there are insects on every map)
  useEffect(() => keeper.look("bugs"), [keeper]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2800); return () => clearTimeout(t); }, [note]);
  /** How what was just caught is used, for the two that eat pests: it stays longer than the catch's own line. */
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => { if (!tip) return; const t = setTimeout(() => setTip(null), TIP_MS); return () => clearTimeout(t); }, [tip]);
  const vfx = useMemo(() => new Vfx(), []);

  // What every haunt has for me now: looked at afresh when something changes and every few seconds, not every frame.
  // (less those that fled from my tired hands: gone for me, for the rest of their turn)
  const fled = useRef<Map<string, number> | null>(null);
  if (!fled.current && typeof window !== "undefined") fled.current = fledKept();
  const seen = useRef<BugSight[]>([]);
  seen.current = keeper.bugs().filter((s) => !fled.current?.has(`${s.id}:${s.turn}`));
  const purse = keeper.purse(), hand = handOf(purse), spent = isSpent(purse, keeper.now());
  // (the fountain's soft step, or a meal's: an insect lets me come nearer, the nearer at each of the meal's levels;
  // and with the lucky butterfly following, the distance at which one startles is halved again: lib/town/insects'
  // stealthOf. With neither, as ever)
  const soft = stealthOf(purse, keeper.now()), flutter = familiarOf(purse) === "famButterfly";
  // (good at the line, the good insects are harder for me: they know of me from further off, and the ring on them is
  // narrower. lib/town/gifts' harderFor; nothing on the screen says so)
  const wary = harderFor("insects", keeper.lines()?.lines.insects.points ?? 0);
  // (the silver-web net worn as a charm: every insect that is out on the map I am on glints silver where it is, the
  // hidden ones too, on my own screen. Where, never how it is caught. lib/town/gifts)
  const sees = wearing(purse, "charmNet");
  // (a drop of nectar of mine that is out, with what it brings: lib/town/insects' Lured, kept in my purse. Its insect
  // is mine alone; once it has come it is drawn and minded as a haunt's is, at a haunt of its own round the drop)
  const hasNectar = keeper.gives("thingNectar") && hasThing(purse, "thingNectar"), drops = hasNectar ? usesLeft(purse, "thingNectar", keeper.now()) : 0;
  const lured = purse.lured && purse.lured.until > keeper.now() ? purse.lured : null;
  const luredKept = useRef<{ l: Lured; h: Haunt } | null>(null);
  if (!lured) luredKept.current = null;
  else if (luredKept.current?.l.from !== lured.from || luredKept.current.l.seed !== lured.seed) luredKept.current = { l: lured, h: luredHaunt(lured) };
  const luredUntil = lured?.until ?? 0;
  // (the butterfly-wing cloak put on or taken off changes what the haunts have for me: whoever keeps the game is asked again)
  const cloaked = wearing(purse, "charmCloak"), wasCloaked = useRef(cloaked);
  useEffect(() => { if (wasCloaked.current !== cloaked) { wasCloaked.current = cloaked; keeper.nudged("bugs"); } }, [keeper, cloaked]);
  // (the wind net worn as a charm, with stamina to swing: the net comes down at once where it is aimed, lib/town/insects' windy)
  const wind = windy(purse, keeper.now());
  // (the lulling flute: once in a span of time, lib/town/gifts' USES; how long until it may be played again)
  const hasFlute = keeper.gives("thingFlute") && hasThing(purse, "thingFlute"), fluteSpan = USES.thingFlute?.ms ?? 300_000;
  const fluteWait = hasFlute && usesLeft(purse, "thingFlute", keeper.now()) <= 0 ? fluteSpan - (((keeper.now() % fluteSpan) + fluteSpan) % fluteSpan) : 0;
  useEffect(() => {
    if (fluteWait <= 0) return;
    const t = setTimeout(() => setTick((n) => n + 1), fluteWait + 80);
    return () => clearTimeout(t);
  }, [fluteWait]);
  // ── forging: old tools ── (what the net in my hand carries of its own, as the catching reads it: lib/town/forged. A plain net: nothing.)
  const fx = netFx(mayNet(hand) ? heldStack(purse, keeper.handSlot()) : null);
  const route = scentMods(purse, keeper.now()).route;
  const live = useRef({ hand, spent, busy, th, name, soft, flutter, wary, sees, wind, route, lured: luredKept.current, me: keeper.id, fx });
  live.current = { hand, spent, busy, th, name, soft, flutter, wary, sees, wind, route, lured: luredKept.current, me: keeper.id, fx };
  useEffect(() => {
    if (!luredUntil) return;
    // (it is off again at its time: said once, where I had not caught it; and the belt is looked at afresh)
    const t = setTimeout(() => {
      setTick((n) => n + 1);
      if (keeper.purse().lured?.until === luredUntil) { sfx?.work("flit", 0.6); setNote(live.current.th ? WHY_BUGS.left[0] : WHY_BUGS.left[1]); }
    }, Math.max(0, luredUntil - keeper.now()) + 60);
    return () => clearTimeout(t);
  }, [keeper, luredUntil, sfx]);
  /** How many insects glinted in the last frame drawn, and how many my butterfly kept from knowing of me (for scripts). */
  const glints = useRef(0), lulls = useRef(0);

  /** What each insect has in mind on this screen, how each is this frame, where I am and who is about, and the swing in the air. */
  const minds = useRef(new Map<number, { turn: number; bug: BugId; mind: Mind }>());
  const poses = useRef(new Map<number, { sight: BugSight; pose: Pose; h: Haunt; on: boolean }>());
  /** The insects asleep to my flute on this screen: each where it fell asleep, until when, and which insect it is (by its turn); and when the flute was last played. */
  const sleeping = useRef(new Map<number, { turn: number; until: number; pose: Pose }>()), played = useRef(0);
  // ── forging: old tools ── (what the net in my hand does on this screen alone, as the flute's sleep is this screen's:
  // `frozen`, the insects a swing of mine holds still: each where it was, from when until when, and which insect it is;
  // `nests`, the haunts I have emptied with a net that knows them: they say when another may come there;
  // `slow`, the insects' own clock: with ice in the net it runs slower than the wall's, and this is how far behind it has fallen, and when that was last reckoned)
  const frozen = useRef(new Map<number, { turn: number; from: number; until: number; pose: Pose }>());
  const nests = useRef(new Set<number>());
  const slow = useRef({ at: 0, lag: 0 });
  const me = useRef<Vec | null>(null), about = useRef<Array<Person & { id: string }>>([]);
  /** When each singer was last heard. */
  const sang = useRef(new Map<number, number>());
  const swing = useRef<Swing | null>(null), ready = useRef(0);
  /** The wind net held over where it is aimed, while the map is pressed. */
  const aim = useRef<{ at: Vec } | null>(null), aimRef = useRef<BugsAim | null>(null);
  /** Under the butterfly-wing cloak, the insect that follows the one I just caught, while it is there. */
  const follow = useRef<Following | null>(null);
  /** The map's own way from a point of it to a point of the screen, as the last frame had it (for scripts). */
  const projectRef = useRef<((t: Vec) => Vec) | null>(null), landedRef = useRef<Swing | null>(null);
  const misses = useRef(new Map<string, number>()), stirred = useRef(new Map<number, boolean>());
  const caught = useRef<Array<{ bug: BugId; first: boolean; rid: string | null }>>([]);
  /** Until when the line about a pest gone is written over my head. */
  const ridUntil = useRef(0);
  const tapRef = useRef<((at: Vec) => boolean) | null>(null);

  useEffect(() => {
    const nameOf = (id: ItemId) => (live.current.th ? ITEMS[id].name.th : ITEMS[id].name.en);
    const say = (why: string) => { const w = WHY_BUGS[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (live.current.th ? w[0] : w[1]) : null); };

    /**
     * Under the butterfly-wing cloak the insect just caught has another of its kind following (the keeper put it in
     * my purse): it is there on this screen from now, for its three seconds, wheeling about where the first was.
     */
    const follows = (spot: Vec) => {
      const f = keeper.purse().follower, now = Date.now();
      if (!f || !(f.bug in BUGS) || f.until <= keeper.now()) return;
      follow.current = { bug: f.bug as BugId, at: spot, began: now, until: now + PAIRED.ms, seed: Math.floor(f.until % 1_000_003), missed: 0, done: false, said: false };
      vfx.add("sparkle", spot, { lift: 18 });
    };
    /** The net has come down: whatever is under its ring is caught, and whatever it only came near minds it. */
    const land = (s: Swing, now: number) => {
      const here = me.current, tile: [number, number] | null = here ? [Math.floor(here.x), Math.floor(here.y)] : null;
      let got = false;
      // ── forging: old tools ── (a sweeping net: where two insects or more that a net could take are within its reach of where it
      // lands, it takes every one of them, so many a day. Whoever keeps the game counts it; each insect is caught, and paid for, as any is.)
      const l = live.current, sweep = l.fx.wide > 0 && !!tile && powerLeft(keeper.purse(), "ntWide", keeper.now()) > 0
        && [...poses.current.values()].filter(({ pose }) => pose.open && far(aimOf(pose), s.at) <= l.fx.wide).length >= 2;
      const ready = sweep ? keeper.toolPower("ntWide") : Promise.resolve({ ok: true as const });
      if (sweep) { vfx.add("leaves", { x: s.at.x, y: s.at.y }, { lift: 6 }); sfx?.work("gust", 0.6); }
      // the one that follows a catch of mine, while it is there: netted as any insect is, or missed
      const fo = follow.current;
      if (fo && !fo.done && tile && now < fo.until) {
        const p = followerPose(fo.bug, fo.at, fo.seed, fo.began, now);
        if (taken(fo.bug, p, s.at, live.current.spent, 1, live.current.wary, live.current.fx.ring)) {
          got = true;
          fo.done = true;
          const where = { x: p.x, y: p.y };
          void keeper.netMine("pair", tile, { misses: missesWith(fo.missed, live.current.fx.spared) }, live.current.name).then((did) => {
            if (!did.ok) { say(did.why); return; }
            keeper.record({ game: "insects", board: "net", at: keeper.now(), won: true, secs: 0, spent: live.current.spent, buff: null, what: fo.bug, need: 1, hits: 1, misses: fo.missed });
            caught.current.push({ bug: fo.bug, first: did.first, rid: did.rid ?? null });
            if (did.rid) { ridUntil.current = Date.now() + RID_MS; vfx.add("sparkle", null, { lift: 40 }); }
            setNote(`${did.got.map(([item, n]) => `${nameOf(item)} ×${n}`).join(" · ")} · ${live.current.th ? PAIR_WORD[0] : PAIR_WORD[1]}`);
            sfx?.wake();
            sfx?.work("netted");
            if (did.got.length) { vfx.add("pop", where, { icon: iconOf(did.got[0][0]) }); vfx.add("sparkle", where, { lift: 18 }); }
          });
        } else if (far(aimOf(p), s.at) <= NET.near) fo.missed++;
      }
      let swept = 0;
      for (const [id, { sight, pose, h }] of poses.current) {
        const kept = minds.current.get(id);
        if (!kept) continue;
        const key = `${id}:${sight.turn}`;
        if (tile && (sweep ? swept < optN("ntWide", "catches") && pose.open && far(aimOf(pose), s.at) <= l.fx.wide : !got && taken(sight.bug, pose, s.at, live.current.spent, 1, live.current.wary, live.current.fx.ring))) {
          got = true; if (sweep) swept++;
          // (a beetle: whoever stands under its tree with something sweet; the tree it is in now, for one that does not stay)
          const lurer = BUGS[sight.bug].habit === "lure" ? about.current.find((p) => !p.moving && !!p.hold && LURES.includes(p.hold) && far(p, h.perches[kept.mind.at] ?? h.perches[0]) < HABITS.lure.reach) : null;
          const where = { x: pose.x, y: pose.y }, spot = aimOf(pose);
          // (the insect of my drop of nectar is no haunt's: it is caught as mine alone)
          // ── forging: old tools ── (the misses the net forgives are not told of: nothing is paid for them)
          const missedBy = missesWith(misses.current.get(key) ?? 0, live.current.fx.spared);
          const asked = ready.then((grant) => grant.ok ? (id === LURED ? keeper.netMine("lured", tile, { misses: missedBy }, live.current.name)
            : keeper.netDo(id, tile, { misses: missedBy, lure: lurer?.hold ?? null, by: lurer?.id ?? null }, live.current.name)) : { ok: false as const, why: "none" as const });
          const missed = misses.current.get(key) ?? 0;
          void asked.then((did) => {
            if (!did.ok) { say(did.why); return; }
            misses.current.delete(key);
            // (a go with the net, written down beside its deed: one that fled is written down below, and has no deed)
            keeper.record({ game: "insects", board: "net", at: keeper.now(), won: true, secs: 0, spent: live.current.spent, buff: null, what: sight.bug, need: 1, hits: 1, misses: missed });
            // ── forging: old tools ── (a haunt emptied with a net that knows them: from now it says when another may come there)
            if (id !== LURED && live.current.fx.nest) nests.current.add(id);
            caught.current.push({ bug: sight.bug, first: did.first, rid: did.rid ?? null });
            if (did.rid) { ridUntil.current = Date.now() + RID_MS; vfx.add("sparkle", null, { lift: 40 }); }
            const what = did.got.map(([item, n]) => `${nameOf(item)} ×${n}`).join(" · ");
            setNote(did.first ? `${what} · ${live.current.th ? "ตัวแรกของหมู่บ้าน" : "the village's first"}` : what);
            // (one that eats pests: how it is used, said each time one is caught)
            const how = did.got.map(([item]) => howTo(item, live.current.th)).find((line) => !!line);
            if (how) setTip(how);
            else if (insectCareMode(sight.bug)) setTip(live.current.th ? "ลองถือตัวนี้ไปเยี่ยมต้นในสวน หรือเก็บไว้ใช้ต่อ" : "Try holding this visitor beside a garden plant, or keep it for later.");
            sfx?.wake();
            sfx?.work("netted");
            if (did.got.length) vfx.add("pop", where, { icon: iconOf(did.got[0][0]) });
            follows(spot);
          });
          continue;
        }
        if (far(aimOf(pose), s.at) <= NET.near) {
          misses.current.set(key, (misses.current.get(key) ?? 0) + 1);
          // tired hands lose it at the second miss: it is off, and is not seen here again this turn
          if (fledBy(missesWith(misses.current.get(key) ?? 0, live.current.fx.spared), live.current.spent, live.current.fx.bears)) {
            const gone = fled.current ?? new Map<string, number>();
            gone.set(key, (id === LURED ? live.current.lured?.l.until ?? keeper.now() : bugTurnStart(h, sight.turn + 1)) - keeper.now() + Date.now());
            fled.current = gone;
            keepFled(gone);
            keeper.record({ game: "insects", board: "net", at: keeper.now(), won: false, secs: 0, spent: live.current.spent, buff: null, what: sight.bug, need: 1, hits: 0, misses: misses.current.get(key) ?? 0 });
            misses.current.delete(key);
            sfx?.work("flit");
            vfx.add("leaves", { x: pose.x, y: pose.y }, { lift: 30 });
            say("fled");
            continue;
          }
          // (one asleep to my flute sleeps on: the miss is counted, and it has not minded it)
          const z = sleeping.current.get(id);
          if (z && z.turn === sight.turn && now < z.until) continue;
          // ── forging: old tools ── (and so does one my net holds still)
          const fz = frozen.current.get(id);
          if (fz && fz.turn === sight.turn && now < fz.until) continue;
          const was = kept.mind;
          // (by the insects' own clock: lib/town/forged's flight)
          kept.mind = missed(sight.bug, h, sight.seed, kept.mind, now - slow.current.lag, here ?? s.at);
          if (kept.mind !== was && pose.seen) sfx?.work("flit", 0.7);
        }
      }
      if (!got) vfx.add("dust", { x: s.at.x, y: s.at.y });
    };

    register((frame) => {
      const { ctx, things, project, onScreen, s, img, still } = frame, now = Date.now();
      // ── forging: old tools ── (the insects' own clock: with ice in the net in my hand it runs at so many times the wall's pace, never under one
      // part in the cap, and `tick` is what it reads now: everything an insect does by the clock is done by this one. With a plain net and no
      // insect on the screen it is the wall's again.)
      const rate = Math.min(1, slowPartOf(1, live.current.fx.flight));
      if (slow.current.at && rate < 1) slow.current.lag += Math.min(1000, Math.max(0, now - slow.current.at)) * (1 - rate);
      else if (rate === 1 && !minds.current.size) slow.current.lag = 0;
      slow.current.at = now;
      const tick = now - slow.current.lag;
      vfx.draw(frame);
      me.current = frame.self;
      projectRef.current = project;
      // (everybody about, myself first: the map lists me first, and only my own blessing is known here)
      // (and only of me is it known how good I am at the line: the good insects are warier of me by that much)
      about.current = (frame.people?.() ?? []).map((p, i) => (i === 0 && (live.current.soft < 1 || live.current.wary > 1) ? { ...p, soft: live.current.soft, wary: live.current.wary } : p));
      const here = frame.self ? placeOf(Math.floor(frame.self.x), Math.floor(frame.self.y)) : null;
      const blit = (name: IconName | null, c: Vec, lift: number, flip: boolean, k: number, wide = 1, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(Math.round(c.x), Math.round(c.y - lift));
        const cell = name ? ICON_ATLAS.icons[name] : null;
        if (!cell || !img?.complete || !img.naturalWidth) {
          // (no picture of it yet: a pale speck)
          ctx.fillStyle = DOT; ctx.beginPath(); ctx.ellipse(0, -3 * s, 4 * s * wide, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          const [x, y, w, hh] = cell;
          ctx.imageSmoothingEnabled = false;
          ctx.scale((flip ? -1 : 1) * wide, 1);
          ctx.drawImage(img, x, y, w, hh, -(w * k) / 2, -hh * k + 3 * s, w * k, hh * k);
        }
        ctx.restore();
      };
      const shown = new Set<number>();
      let lit = 0, calm = 0;
      // my drop of nectar on the ground, and what it brings on its way to it (the keeper's clock said by this machine's)
      const drop = live.current.lured, lag = now - keeper.now(), came = drop ? drop.l.from + lag : 0;
      if (drop && drop.h.place === here && now < drop.l.until + lag) {
        // (it lies beside the feet of whoever put it down, level with them on the screen: under them, or under their
        // name, it would not be seen)
        const c0 = { x: drop.l.x + 1.2, y: drop.l.y - 0.2 }, c = project(c0), t = (now - (came - ARRIVE.ms)) / ARRIVE.ms;
        if (onScreen(c)) things.push({ depth: c0.x + c0.y + 0.2, draw: () => drawDrop(ctx, c, s, now, still, now < came) });
        if (!still && t >= 0 && t < 1) {
          // it flies in from far off, down to where it will be the moment it is there
          const id = drop.l.bug as BugId, end = poseOf(id, drop.h, drop.l.seed, newMind(id, drop.h, drop.l.seed, came), came);
          const ang = (drop.l.seed % 360) * (Math.PI / 180), e = 1 - (1 - t) ** 3;
          const from = { x: end.x + Math.cos(ang) * ARRIVE.from, y: end.y + Math.sin(ang) * ARRIVE.from };
          const fly = { x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e }, lift = end.lift + (1 - e) * 2.2 + 0.12 * Math.sin(now / 90), p = project(fly);
          if (onScreen(p)) things.push({ depth: fly.x + fly.y + 3.6, draw: () => {
            ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4.5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
            blit(iconFor(iconOf(id)), p, lift * TILE_H * s, end.x - from.x - (end.y - from.y) >= 0, SIZE * s, 0.5 + 0.5 * Math.abs(Math.sin(now / 60)));
          } });
        }
      }
      // (every haunt's insect; and my drop's, once it has come, at a haunt of its own round the drop)
      const outs: Array<{ sight: BugSight; h: Haunt | undefined; born?: number }> = seen.current.map((sight) => ({ sight, h: HAUNTS[sight.id] }));
      if (drop && now >= came && now < drop.l.until + lag && !fled.current?.has(`${LURED}:${drop.l.from}`)) outs.push({ sight: { id: LURED, bug: drop.l.bug as BugId, turn: drop.l.from, seed: drop.l.seed }, h: drop.h, born: came });
      for (const { sight, h, born } of outs) {
        if (!h || h.place !== here) continue;
        shown.add(h.id);
        // (the insect of my drop: its mind begins the moment it came)
        // (a mind's moments are the insects' own clock's: one that begins now begins as far behind the wall's clock as that clock is)
        if (born !== undefined && minds.current.get(h.id)?.turn !== sight.turn) minds.current.set(h.id, { turn: sight.turn, bug: sight.bug, mind: newMind(sight.bug, h, sight.seed, born - slow.current.lag) });
        let kept = minds.current.get(h.id);
        // (a mind is one insect's: another at the same haunt, in the same turn or the next, begins with its own)
        if (!kept || kept.turn !== sight.turn || kept.bug !== sight.bug) { kept = { turn: sight.turn, bug: sight.bug, mind: newMind(sight.bug, h, sight.seed, bugTurnStart(h, sight.turn) - slow.current.lag) }; minds.current.set(h.id, kept); }
        const before = kept.mind;
        // (asleep to my flute: it is where it fell asleep and minds nobody; waking, it is a moment getting back to itself)
        const z = sleeping.current.get(h.id), slept = !!z && z.turn === sight.turn, dozing = slept && now < z!.until, waking = slept && !dozing && now < z!.until + LULL.wake;
        if (z && !dozing && !waking) sleeping.current.delete(h.id);
        // ── forging: old tools ── (held still by my net: it is where it was when the swing began and minds nobody, for its seconds; let go, it is a moment getting back to where it would be)
        const fz = frozen.current.get(h.id), iced = !!fz && fz.turn === sight.turn && !dozing, holding = iced && now < fz!.until, thawing = iced && !holding && now < fz!.until + HELD.thaw;
        if (fz && !holding && !thawing) frozen.current.delete(h.id);
        if (!still && !dozing && !holding) kept.mind = think(sight.bug, h, sight.seed, kept.mind, tick, about.current);
        const awake = poseOf(sight.bug, h, sight.seed, kept.mind, tick);
        const pose = dozing ? z!.pose : holding ? fz!.pose : thawing && !still ? eased(fz!.pose, awake, (now - fz!.until) / HELD.thaw) : waking && !still ? rising(z!.pose, awake, (now - z!.until) / LULL.wake) : awake, bug = BUGS[sight.bug], at = project({ x: pose.x, y: pose.y });
        if (holding && onScreen(at)) frame.over?.(() => drawHeld(ctx, at.x, at.y - pose.lift * TILE_H * s, s, (fz!.until - now) / Math.max(1, fz!.until - fz!.from), now, still));
        // heard: off in a fright from somebody; and what sings, over and over, softer from further off
        const away = frame.self ? far(frame.self, pose) : 99;
        if (live.current.route && mayNet(live.current.hand) && away < 7 && pose.seen && !dozing && !holding) {
          // The dotted trace predicts undisturbed movement, not a guaranteed catch.
          const dots = [300, 600, 900].map(ms => poseOf(sight.bug, h, sight.seed, kept.mind, tick + ms)).map(p => project({ x: p.x, y: p.y }));
          frame.over?.(() => { const px = Math.max(2, Math.round(2 * s)); ctx.fillStyle = "#d6e7a4"; for (let i = 0; i < dots.length; i++) { ctx.globalAlpha = 0.55 - i * 0.12; ctx.fillRect(Math.round(dots[i].x), Math.round(dots[i].y - pose.lift * TILE_H * s), px, px); } ctx.globalAlpha = 1; });
        }
        if (kept.mind.visit !== before.visit && bug.habit !== "spot" && away < 9) sfx?.work("flit", Math.max(0.15, 1 - away / 9) * 0.6);
        if (pose.sings && away < 11 && now - (sang.current.get(h.id) ?? 0) > (bug.shy === "flight" ? 1100 : 620)) {
          sang.current.set(h.id, now);
          sfx?.work(bug.shy === "flight" ? "cicada" : "chirp", Math.max(0.06, 1 - away / 11) ** 1.6);
        }
        poses.current.set(h.id, { sight, pose, h, on: onScreen(at) });
        const flyingIcon = `fly${sight.bug[0].toUpperCase()}${sight.bug.slice(1)}`;
        const k = SIZE * s, icon = (pose.flying ? iconFor(flyingIcon) : null) ?? iconFor(iconOf(sight.bug)), mind = kept.mind;
        if (dozing && onScreen(at)) frame.over?.(() => drawSleep(ctx, at.x, at.y - pose.lift * TILE_H * s, s, now, still, h.id));
        // the net's silver glint over it, whether it shows itself or not; one off the screen is pointed to from the edge
        // ── forging: old tools ── (and with light in the net in my hand, over every insect within so many tiles of me)
        const near = live.current.fx.seen > 0 && !!me.current && far(aimOf(pose), me.current) <= live.current.fx.seen;
        if (live.current.sees || near) {
          lit++;
          frame.over?.(() => {
            const W = ctx.canvas.width, H = ctx.canvas.height, m = Math.max(22, 12 * s), hid = hides(sight.bug, pose), top = at.y - pose.lift * TILE_H * s - (hid ? 3 : 18) * s;
            const on = at.x >= m && at.x <= W - m && top >= m && top <= H - m;
            const gx = Math.round(Math.min(W - m, Math.max(m, at.x))), gy = Math.round(Math.min(H - m, Math.max(m, top)));
            const d = Math.max(3, Math.round(2.8 * s)), a = still ? 1 : 0.7 + 0.3 * Math.sin(now / 300 + h.id * 1.3);
            const silver = (k: number) => `rgba(232,244,255,${(a * k).toFixed(3)})`, edge = `rgba(26,44,78,${(a * 0.7).toFixed(3)})`;
            if (on) {
              // a ring of silver going out from where it is, over and over
              if (!still) for (const lag of [0, 0.5]) {
                const t = (now / 1100 + lag + h.id * 0.29) % 1;
                ctx.strokeStyle = `rgba(232,244,255,${(0.7 * (1 - t)).toFixed(3)})`;
                ctx.lineWidth = Math.max(1.5, 1.2 * s);
                ctx.beginPath(); ctx.ellipse(at.x, at.y - pose.lift * TILE_H * s - 3 * s, (5 + 13 * t) * s, (2.5 + 6.5 * t) * s, 0, 0, Math.PI * 2); ctx.stroke();
              }
              // one that does not show itself: a little insect of silver where it is, which is where a net has to come down
              if (hid) { const u = Math.max(3, Math.round(2.2 * s)); specks(ctx, HIDER, gx - 3.5 * u, gy - 3.5 * u, u, silver(1), edge); return; }
              // the star: four points, with a dark edge so that it shows on grass in full day
              ctx.fillStyle = edge;
              ctx.fillRect(gx - 2 * d - 1, gy - 1, 5 * d + 2, d + 2);
              ctx.fillRect(gx - 1, gy - 2 * d - 1, d + 2, 5 * d + 2);
              ctx.fillStyle = silver(1);
              ctx.fillRect(gx - 2 * d, gy, 5 * d, d);
              ctx.fillRect(gx, gy - 2 * d, d, 5 * d);
            } else {
              // an arrowhead at the edge, turned towards where it is
              const turn = Math.atan2(top - gy, at.x - gx), r = Math.max(13, 7.5 * s);
              ctx.save();
              ctx.translate(gx, gy);
              ctx.rotate(turn);
              ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.62); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.62); ctx.closePath();
              ctx.fillStyle = silver(0.95); ctx.fill();
              ctx.lineWidth = Math.max(1.5, s); ctx.strokeStyle = edge; ctx.stroke();
              ctx.restore();
            }
          });
        }
        // my butterfly keeps it from knowing of me: with all its senses it would have. A little of the butterfly's
        // dust comes down over it, for as long as that is so (a state: nothing says why)
        if (live.current.flutter && !dozing && about.current[0] && frame.self && lulled(sight.bug, h, mind, about.current[0])) {
          calm++;
          frame.over?.(() => {
            const top = at.y - pose.lift * TILE_H * s;
            for (let i = 0; i < 6; i++) {
              const t = still ? (i + 1) / 7 : (now / 1300 + i / 6 + h.id * 0.13) % 1, d = Math.max(3, Math.round(2 * s)), a = Math.sin(Math.PI * t);
              const x = Math.round(at.x + Math.sin(i * 2.1 + h.id) * 9 * s + (still ? 0 : Math.sin(now / 260 + i) * 2 * s)), y = Math.round(top - 24 * s + t * 22 * s);
              // (a speck with a dark edge, so that it shows over grass in full day; every other one a little cross)
              ctx.fillStyle = `rgba(60,40,10,${(0.45 * a).toFixed(3)})`;
              ctx.fillRect(x - 1, y - 1, d + 2, d + 2);
              ctx.fillStyle = `rgba(255,232,150,${(0.95 * a).toFixed(3)})`;
              ctx.fillRect(x, y, d, d);
              if (i % 2 === 0) { ctx.fillRect(x - d, y, 3 * d, d); ctx.fillRect(x, y - d, d, 3 * d); }
            }
          });
        }
        // what it is taken for lies at its other perches
        if (bug.like) h.perches.forEach((p, i) => {
          if (i === mind.at) return;
          const c = project(p);
          if (onScreen(c)) things.push({ depth: p.x + p.y + 0.55, draw: () => blit(iconFor(bug.like!), c, 0, (i + h.id) % 2 === 0, k) });
        });
        if (!onScreen(at)) continue;
        // something moves up in the tree: a leaf or two comes down, once each time
        if (pose.stirs && !stirred.current.get(h.id) && !still) vfx.add("leaves", { x: pose.x, y: pose.y }, { lift: 40 });
        stirred.current.set(h.id, pose.stirs);
        if (pose.sings && !still) things.push({ depth: pose.x + pose.y + 0.7, draw: () => {
          // its song: rings going out from where it is, over and over
          const up = pose.lift * TILE_H * s;
          for (const lag of [0, 0.5]) {
            const t = (now / 900 + lag + h.id * 0.37) % 1;
            ctx.strokeStyle = `rgba(255,244,200,${0.55 * (1 - t)})`;
            ctx.lineWidth = Math.max(1, s);
            ctx.beginPath(); ctx.ellipse(at.x, at.y - up - 2 * s, (4 + 14 * t) * s, (2 + 7 * t) * s, 0, 0, Math.PI * 2); ctx.stroke();
          }
        } });
        if (!pose.seen) continue;
        // (what is in the air, or on a trunk, is drawn over whoever stands before it: it is what is being looked for)
        things.push({ depth: pose.x + pose.y + (pose.lift > 0.2 ? 3.6 : 0.6), draw: () => {
          const up = pose.lift * TILE_H * s;
          if (pose.glow > 0) {
            const g = ctx.createRadialGradient(at.x, at.y - up - 4 * s, 0, at.x, at.y - up - 4 * s, 13 * s);
            g.addColorStop(0, "rgba(214,255,120,0.85)"); g.addColorStop(1, "rgba(214,255,120,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(at.x, at.y - up - 4 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
          }
          if (pose.lift > 0.2 && bug.habit !== "lure" && bug.habit !== "sound") {
            ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(at.x, at.y, 4.5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
          }
          const flap = pose.flying && pose.lift > 0.2 && !still ? 0.5 + 0.5 * Math.abs(Math.sin(now / 60 + h.id)) : 1;
          blit(icon, { x: at.x + (pose.twitch ? s : 0), y: at.y }, up, pose.right, k, flap);
        } });
      }
      glints.current = lit;
      lulls.current = calm;
      for (const id of [...poses.current.keys()]) if (!shown.has(id)) { poses.current.delete(id); minds.current.delete(id); stirred.current.delete(id); sleeping.current.delete(id); frozen.current.delete(id); }
      // ── forging: old tools ── (a haunt I have emptied, with a net that knows them in my hand: while nothing is there, it says over its
      // place how long until another may come: the moment its next turn begins, which is no promise that anything will)
      if (live.current.fx.nest) for (const id of new Set([...nests.current, ...shown])) {
        const h = HAUNTS[id];
        if (!h || h.place !== here) continue;
        const c = project(h.perches[0]);
        if (!onScreen(c)) continue;
        if (shown.has(id)) { frame.sign(live.current.th ? "มีแมลง" : "Occupied", c.x, c.y - 14 * s); continue; }
        const at = keeper.now(), secs = Math.ceil(Math.max(0, bugTurnStart(h, bugTurn(h, at) + 1) - at) / 1000), clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        frame.sign(live.current.th ? `อีก ${clock}` : `in ${clock}`, c.x, c.y - 14 * s);
      }

      // under the cloak, the one that follows the insect I just caught: on the wing about where that was for its three
      // seconds, a ring about it running down; not netted, it is up and away
      const fo = follow.current;
      if (fo) {
        const off = now >= fo.until;
        if (fo.done || now >= fo.until + PAIRED.off) follow.current = null;
        else {
          if (off && !fo.said) { fo.said = true; sfx?.work("flit", 0.8); setNote(live.current.th ? WHY_BUGS.flown[0] : WHY_BUGS.flown[1]); }
          const p = followerPose(fo.bug, fo.at, fo.seed, fo.began, still ? fo.began : Math.min(now, fo.until)), e = off ? (now - fo.until) / PAIRED.off : 0;
          const at = project({ x: p.x, y: p.y }), up = (p.lift + e * e * 3.5) * TILE_H * s, icon = iconFor(iconOf(fo.bug));
          if (onScreen(at)) {
            things.push({ depth: p.x + p.y + 3.6, draw: () => {
              // (the dust of the cloak behind it, where it has just been)
              if (!still && !off) for (let i = 1; i <= 4; i++) {
                const q = followerPose(fo.bug, fo.at, fo.seed, fo.began, now - i * 70), c = project({ x: q.x, y: q.y }), d = Math.max(2, Math.round(1.6 * s));
                ctx.fillStyle = i % 2 ? `rgba(170,205,255,${(0.75 - i * 0.15).toFixed(2)})` : `rgba(226,180,255,${(0.75 - i * 0.15).toFixed(2)})`;
                ctx.fillRect(Math.round(c.x), Math.round(c.y - q.lift * TILE_H * s - 6 * s), d, d);
              }
              if (!off) { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(at.x, at.y, 4.5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill(); }
              blit(icon, at, up, p.right, SIZE * s, still ? 1 : 0.5 + 0.5 * Math.abs(Math.sin(now / 55)), 1 - e);
            } });
            // (how long it is still there: a ring about it that runs down)
            if (!off) frame.over?.(() => {
              const left = (fo.until - now) / PAIRED.ms, cy = at.y - up - 7 * s;
              ctx.save();
              ctx.lineCap = "round";
              ctx.lineWidth = Math.max(2, 2 * s); ctx.strokeStyle = "rgba(20,24,56,0.55)";
              ctx.beginPath(); ctx.arc(at.x, cy, 13 * s, 0, Math.PI * 2); ctx.stroke();
              ctx.lineWidth = Math.max(2, 2 * s); ctx.strokeStyle = left > 0.34 ? "rgba(196,214,255,0.95)" : "rgba(255,196,214,0.95)";
              ctx.beginPath(); ctx.arc(at.x, cy, 13 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left)); ctx.stroke();
              ctx.restore();
            });
          }
        }
      }

      // my flute just played: its notes go up from my head, and a hush goes out over the ground
      if (now - played.current < LULL.notes && frame.self) {
        const feet = project(frame.self), t = (now - played.current) / LULL.notes;
        frame.over?.(() => drawLull(ctx, feet, s, t, still));
      }

      // a ladybird took a pest off some plant with it: said over my head, a little while
      if (now < ridUntil.current && frame.self) {
        const head = project(frame.self);
        frame.sign(live.current.th ? RID[0] : RID[1], head.x, head.y - 78 * s);
      }

      // the wind net held over where it is aimed (drawn over the night, as what the hand is doing)
      const held = aim.current;
      if (held && frame.self) {
        const mine = project(frame.self), c = project(held.at);
        frame.over?.(() => drawAim(ctx, mine, c, NET.radius * partOf(1, live.current.fx.ring), s, now, still, NET.reach + live.current.fx.reach));
      }

      // the swing: the ring it will take, and the net coming down on it
      const sw = swing.current;
      if (sw) {
        const c = project(sw.at), t = Math.min(1, (now - sw.began) / Math.max(1, sw.lands - sw.began));
        if (!sw.done && now >= sw.lands) { sw.done = true; landedRef.current = { ...sw }; land(sw, now); }
        if (now > sw.lands + (sw.wind ? 320 : 220)) swing.current = null;
        else if (sw.wind) things.push({ depth: sw.at.x + sw.at.y + 3, draw: () => {
          // the wind's: down already, the gust closing in on its ring, and the net pressed flat a moment
          const g = Math.min(1, (now - sw.lands) / 320);
          drawGust(ctx, c, NET.radius, s, g, still);
          const net = iconFor("bugNet"), cell = net ? ICON_ATLAS.icons[net] : null;
          if (cell && img?.complete && img.naturalWidth) {
            const [x, y, w, hh] = cell, kk = 0.8 * s, squash = still ? 1 : 0.8 + 0.2 * Math.min(1, g * 2.5);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.globalAlpha = 1 - Math.max(0, g - 0.6) / 0.4;
            ctx.translate(c.x + 16 * s, c.y + 4 * s);
            ctx.scale(1, squash);
            ctx.drawImage(img, x, y, w, hh, -w * kk, -hh * kk, w * kk, hh * kk);
            ctx.restore();
          }
        } });
        else things.push({ depth: sw.at.x + sw.at.y + 3, draw: () => {
          const r = NET.radius * (live.current.spent ? NET.tired.radius : 1) * partOf(1, live.current.fx.ring);
          // (a ring of the ground, as wide as the net: half as high as it is wide, as the map's tiles are)
          ctx.save();
          ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.5 * t})`;
          ctx.fillStyle = `rgba(255,255,255,${0.08 + 0.14 * t})`;
          ctx.lineWidth = Math.max(1.5, 1.5 * s);
          ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 45 * s, r * 22.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
          const net = iconFor("bugNet"), cell = net ? ICON_ATLAS.icons[net] : null;
          if (cell && img?.complete && img.naturalWidth) {
            const [x, y, w, hh] = cell, kk = 0.8 * s;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.translate(c.x + 16 * s, c.y + 4 * s);
            ctx.rotate((-1.25 + 1.25 * Math.min(1, t * t)) * (Math.PI / 2));
            ctx.drawImage(img, x, y, w, hh, -w * kk, -hh * kk, w * kk, hh * kk);
            ctx.restore();
          }
        } });
      }
    });

    /** Whether a point of the map is on an insect within my reach, or just ahead of one: where a swing may be begun. */
    const byInsect = (at: Vec, here: Vec) => {
      // (the one that follows a catch of mine: wherever it is on its wheel about the place I caught the first at)
      const fo = follow.current;
      if (fo && !fo.done && Date.now() < fo.until && far(aimOf(followerPose(fo.bug, fo.at, fo.seed, fo.began, Date.now())), at) <= AIM && far(fo.at, here) <= NET.reach + live.current.fx.reach + PAIR.radius) return true;
      let near: Pose | null = null, least = AIM;
      for (const { pose } of poses.current.values()) { const d = far(aimOf(pose), at); if (d <= least) { least = d; near = pose; } }
      return !!near && far(near, here) <= NET.reach + live.current.fx.reach;
    };
    /** The wind net comes down, at once, where it is aimed (or as near that as I reach). */
    const gust = (at: Vec, here: Vec, now: number) => {
      const lands = aimAt(here, at, NET.reach + live.current.fx.reach);
      swing.current = { at: lands, began: now, lands: now, done: false, wind: true };
      ready.current = now + againMs(false, true, live.current.fx.lands, live.current.fx.again);
      sfx?.wake();
      sfx?.work("gust");
      vfx.add("leaves", lands, { lift: 6 });
    };
    // ── forging: old tools ── (a net that holds still what it is swung at: the insect nearest where the swing is aimed, of those a net
    // could take, stays as it is for the net's seconds, on this screen. So many a day: whoever keeps the game counts each.)
    const hold = (at: Vec, now: number) => {
      const l = live.current;
      if (!(l.fx.freeze > 0) || powerLeft(keeper.purse(), "ntFreeze", keeper.now()) < 1) return;
      let best: number | null = null, least = HELD.near;
      for (const [id, { pose, sight }] of poses.current) {
        const d = far(aimOf(pose), at), z = sleeping.current.get(id);
        if (!pose.open || d > least || frozen.current.has(id) || (z && z.turn === sight.turn && now < z.until)) continue;
        least = d; best = id;
      }
      const one = best === null ? null : poses.current.get(best);
      if (best === null || !one) return;
      frozen.current.set(best, { turn: one.sight.turn, from: now, until: now + l.fx.freeze * 1000, pose: one.pose });
      void keeper.toolPower("ntFreeze");
      vfx.add("sparkle", { x: one.pose.x, y: one.pose.y }, { lift: 18 });
    };
    // (`only`: asked before whoever stands under the tap (the map does, where somebody does): then it is the net's
    // only for an insect there, and a swing still in the air does not take a tap that is for a person)
    const tap = (at: Vec, only = false) => {
      const l = live.current, here = me.current, now = Date.now();
      if (l.busy || !here) return false;
      if (!mayNet(l.hand)) {
        // (the silver mark of one that does not show itself, tapped with no net in the hand: what it is a mark of is
        // said, and what the hand lacks; the tap is a step as ever)
        if (l.sees && !only && [...poses.current.values()].some(({ sight, pose }) => hides(sight.bug, pose) && far(aimOf(pose), at) <= MARK)) say("netless");
        return false;
      }
      if (only && !byInsect(at, here)) return false;
      if (swing.current && !swing.current.done) return true;
      // a tap on an insect within reach, or just ahead of it, is a swing; anywhere else it is a step, as ever
      if (!byInsect(at, here)) return false;
      if (now < ready.current) return true;
      // (the wind's: it is down as the tap is)
      if (l.wind) { gust(at, here, now); return true; }
      swing.current = { at, began: now, lands: now + swingMs(l.spent, false, l.fx.lands), done: false };
      hold(at, now);
      ready.current = now + againMs(l.spent, false, l.fx.lands, l.fx.again);
      sfx?.wake();
      sfx?.work("swish");
      return true;
    };
    // The wind net is aimed for as long as the map is pressed, and falls the moment it is let go: a press on an insect
    // within reach holds the gust over that point, a drag moves it (never beyond my reach), and letting go looses it.
    const aiming: BugsAim = {
      press: (at) => {
        const l = live.current, here = me.current;
        if (!l.wind || l.busy || !here || !mayNet(l.hand) || Date.now() < ready.current || (swing.current && !swing.current.done) || !byInsect(at, here)) return false;
        aim.current = { at: aimAt(here, at, NET.reach + l.fx.reach) };
        return true;
      },
      move: (at) => { const here = me.current; if (aim.current && here) aim.current = { at: aimAt(here, at, NET.reach + live.current.fx.reach) }; },
      loose: (at) => {
        const held = aim.current, here = me.current;
        aim.current = null;
        if (held && at && here && live.current.wind && !live.current.busy) gust(at, here, Date.now());
      },
    };
    tapRef.current = tap;
    aimRef.current = aiming;
    registerTap(tap);
    registerAim?.(aiming);
    return () => { register(null); registerTap(null); registerAim?.(null); tapRef.current = null; aimRef.current = null; aim.current = null; };
  }, [keeper, register, registerTap, registerAim, sfx, vfx]);

  /** Put a drop of nectar down where I stand: what it brings is the keeper's to say. */
  const dropNectar = useCallback(() => {
    const here = me.current;
    if (!here) return;
    void keeper.nectarDrop([Math.floor(here.x), Math.floor(here.y)]).then((did) => {
      if (did.ok) { sfx?.wake(); sfx?.work("drip"); return; }
      const w = did.why === "spent" ? WHY_BUGS.drops : WHY_BUGS[did.why] ?? WHY[did.why as keyof typeof WHY];
      setNote(w ? (live.current.th ? w[0] : w[1]) : null);
    });
  }, [keeper, sfx]);

  /** Play the lulling flute: every insect on the screen that a net could take where it is sleeps, on this screen. Kept for another time when there is none to lull. */
  const playFlute = useCallback(() => {
    // (by the insects' own clock, which a net with ice in it slows: lib/town/forged's flight)
    const hear = () => [...poses.current.entries()].filter(([id, p]) => p.on && !!minds.current.get(id) && !!asleep(p.sight.bug, p.h, p.sight.seed, minds.current.get(id)!.mind, Date.now() - slow.current.lag));
    if (!hear().length) { setNote(live.current.th ? WHY_BUGS.hush[0] : WHY_BUGS.hush[1]); return; }
    void keeper.giftUse("thingFlute").then((did) => {
      if (!did.ok) { const w = did.why === "spent" ? WHY_BUGS.rests : WHY[did.why as keyof typeof WHY]; setNote(w ? (live.current.th ? w[0] : w[1]) : null); return; }
      const now = Date.now(), until = now + FLUTE.secs * 1000;
      for (const [id, p] of hear()) {
        const pose = asleep(p.sight.bug, p.h, p.sight.seed, minds.current.get(id)!.mind, now - slow.current.lag);
        if (pose) sleeping.current.set(id, { turn: p.sight.turn, until, pose });
      }
      played.current = now;
      sfx?.wake();
      sfx?.work("lull");
    });
  }, [keeper, sfx]);

  // (for scripts in `next dev`: what is out for me, how each is this moment, and a swing at a point)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      // (the cloak's pair: the one that follows my last catch while it is there, how it is this moment or so many
      // milliseconds on, and how long it has left)
      follower: (ms = 0) => { const fo = follow.current; if (!fo || fo.done || Date.now() >= fo.until) return null; const p = followerPose(fo.bug, fo.at, fo.seed, fo.began, Date.now() + ms); return { bug: fo.bug, left: fo.until - Date.now(), missed: fo.missed, at: fo.at, ...p, aim: aimOf(p), ring: ringOf(fo.bug, live.current.spent, 1, live.current.wary, live.current.fx.ring) }; },
      // (the lulling flute: played, and which insects are asleep to it on this screen, each until when)
      playFlute, asleep: () => [...sleeping.current.entries()].filter(([, z]) => Date.now() < z.until).map(([id, z]) => ({ id, until: z.until, ...z.pose })),
      // (my drop of nectar: what is out, and one put down where I stand)
      lured: () => live.current.lured?.l ?? null, luredHaunt: () => live.current.lured?.h ?? null, dropNectar,
      // (the wind net: whether mine is one now; a press, a drag and a letting go at points of the map, as the map hands
      // them over; where it is held; and the last swing, with whether it was the wind's)
      windy: () => live.current.wind, press: (x: number, y: number) => aimRef.current?.press({ x, y }) ?? false, drag: (x: number, y: number) => aimRef.current?.move({ x, y }),
      loose: (x: number | null, y = 0) => aimRef.current?.loose(x === null ? null : { x, y }), aimed: () => aim.current?.at ?? null,
      lastSwing: () => landedRef.current, ready: () => Math.max(0, ready.current - Date.now()),
      /** Where a point of the map is on the map's canvas, in its own pixels, as the last frame had it. */
      project: (x: number, y: number) => projectRef.current?.({ x, y }) ?? null,
      sights: () => seen.current.map((x) => ({ ...x, place: HAUNTS[x.id]?.place, kind: HAUNTS[x.id]?.kind, x: HAUNTS[x.id]?.x, y: HAUNTS[x.id]?.y, perches: HAUNTS[x.id]?.perches })),
      poses: () => [...poses.current.entries()].map(([id, { sight, pose, on }]) => ({ id, bug: sight.bug, ...pose, on, aim: aimOf(pose), ring: ringOf(sight.bug, live.current.spent, 1, live.current.wary, live.current.fx.ring), mind: minds.current.get(id)?.mind ?? null })),
      me: () => me.current, people: () => about.current, haunts: () => HAUNTS, ringOf: (bug: BugId) => ringOf(bug, live.current.spent, 1, live.current.wary, live.current.fx.ring), glints: () => glints.current, lulls: () => lulls.current,
      soft: () => live.current.soft, wary: () => live.current.wary,
      swing: (x: number, y: number) => { const now = Date.now(); swing.current = { at: { x, y }, began: now, lands: now + swingMs(live.current.spent, false, live.current.fx.lands), done: false }; },
      /** A tap at a point of the map, as the map hands one over: whether it was taken for a swing. */
      tap: (x: number, y: number) => tapRef.current?.({ x, y }) ?? false,
      swinging: () => !!swing.current && !swing.current.done,
      caught: () => caught.current, note: () => note, tip: () => tip, ridShown: () => Date.now() < ridUntil.current, fled: () => [...(fled.current?.keys() ?? [])],
      // (how many swings have missed each insect, by "haunt:turn"; how an insect will be so many milliseconds on, as far
      // as the clock alone says; how long my swing takes; and every insect that fled from me forgotten)
      misses: () => Object.fromEntries(misses.current), swingMs: () => swingMs(live.current.spent, live.current.wind, live.current.fx.lands), againMs: () => againMs(live.current.spent, live.current.wind, live.current.fx.lands, live.current.fx.again), fx: () => live.current.fx, reach: () => NET.reach + live.current.fx.reach,
      poseAt: (id: number, ms: number) => {
        const at = poses.current.get(id), kept = minds.current.get(id);
        if (!at || !kept) return null;
        // (so many milliseconds of the wall's clock on: of the insects' own, as many times its pace less)
        const p = poseOf(at.sight.bug, at.h, at.sight.seed, kept.mind, Date.now() - slow.current.lag + ms * Math.min(1, slowPartOf(1, live.current.fx.flight)));
        return { ...p, aim: aimOf(p) };
      },
      /** (forging) What my net does on this screen: the insects it holds still, the haunts it has emptied, and how far behind the wall's the insects' clock runs. */
      frozen: () => [...frozen.current.entries()].filter(([, f]) => Date.now() < f.until).map(([id, f]) => ({ id, until: f.until, ...f.pose })),
      nests: () => [...nests.current], slowBy: () => slow.current.lag,
      forget: () => { fled.current = new Map(); keepFled(fled.current); setTick((n) => n + 1); },
    };
    (window as unknown as { __townBugs?: typeof handle }).__townBugs = handle;
    return () => { delete (window as unknown as { __townBugs?: typeof handle }).__townBugs; };
  }, [note, tip, dropNectar, playFlute]);

  // The hunter's belt: the things of the insects' ranks that are used by hand, there while a net is held. Each shows
  // its state (how many are left, whether it is out, how long it rests) and says nothing of what it does.
  const belt = !busy && mayNet(hand) && (hasNectar || hasFlute);
  if (!note && !tip && !belt) return null;
  return (
    <>
      {(note || tip) && (
        <TownFoot rank="note" order={6}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
          {tip && <p className="pop-in max-w-[24rem] rounded-2xl bg-bg/85 px-4 py-2 text-center text-ui leading-relaxed text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-bug-tip aria-live="polite">{tip}</p>}
        </TownFoot>
      )}
      {belt && (
        <TownFoot rank="side">
        <div className="pointer-events-none flex gap-2" data-bug-belt>
          {hasNectar && (
            <button type="button" onClick={dropNectar} disabled={!!lured || drops <= 0} data-bug-nectar data-left={drops} data-out={lured ? "1" : "0"}
                    title={giftName("thingNectar", th)} aria-label={`${giftName("thingNectar", th)} ${drops}`}
                    className="pressable pointer-events-auto relative grid size-12 place-items-center rounded-full border-2 border-[#8a5a1c] bg-[#2b1a0c]/90 shadow-lg shadow-black/40 backdrop-blur-sm transition-opacity disabled:opacity-55">
              <TownIcon name={"thingNectar" as IconName} size={30} />
              <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border border-[#8a5a1c] bg-[#f0a02c] px-1 font-data text-label font-semibold leading-4 text-[#2b1a0c]">{drops}</span>
              {lured && <span aria-hidden className="absolute inset-[-3px] animate-pulse rounded-full border-2 border-[#ffd674] motion-reduce:animate-none" />}
            </button>
          )}
          {hasFlute && (
            <button type="button" onClick={playFlute} disabled={fluteWait > 0} data-bug-flute data-ready={fluteWait > 0 ? "0" : "1"} data-wait={Math.ceil(fluteWait / 1000)}
                    title={giftName("thingFlute", th)} aria-label={giftName("thingFlute", th)}
                    className="pressable pointer-events-auto relative grid size-12 place-items-center overflow-hidden rounded-full border-2 border-[#3f7a66] bg-[#10261f]/90 shadow-lg shadow-black/40 backdrop-blur-sm">
              <TownIcon name={"thingFlute" as IconName} size={30} />
              {/* (resting: a shade over it that draws back as its time comes round) */}
              {fluteWait > 0 && <span aria-hidden className="absolute inset-0" style={{ background: `conic-gradient(rgba(8,14,12,0.78) ${Math.round((fluteWait / fluteSpan) * 360)}deg, transparent 0)` }} />}
            </button>
          )}
        </div>
        </TownFoot>
      )}
    </>
  );
}
