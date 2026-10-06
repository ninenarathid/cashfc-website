"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUGS, HABITS, HAUNTS, LURED, LURES, NET, aimOf, bugTurnStart, fledBy, lulled, luredHaunt, mayNet, missed, newMind, poseOf, ringOf, stealthOf, swingMs, taken, think,
  type BugId, type BugSight, type Haunt, type Lured, type Mind, type Person, type Pose,
} from "@/lib/town/insects";
import { FARMING } from "@/lib/town/farm";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { GIFTS, familiarOf, harderFor, hasThing, usesLeft, wearing } from "@/lib/town/gifts";
import { isSpent } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { TILE_H, placeOf, type Vec } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
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
 * word. How sure it is, is said in words that follow its number (lib/town/farm's FARMING.rids), never the number; and
 * how long it stays, in milliseconds.
 */
const SURE = (often: number): [th: string, en: string] =>
  (often >= 0.9 ? ["สำเร็จแทบทุกครั้ง", "nearly every time"] : often >= 0.65 ? ["สำเร็จเป็นส่วนใหญ่", "more often than not"]
    : often >= 0.4 ? ["สำเร็จราวครึ่งหนึ่ง", "about half the time"] : ["นานๆ จะสำเร็จสักครั้ง", "only now and then"]);
function howTo(id: ItemId, th: boolean): string | null {
  const often = FARMING.rids[id];
  if (often === undefined) return null;
  const name = th ? ITEMS[id].name.th : ITEMS[id].name.en, sure = SURE(often)[th ? 0 : 1];
  return th ? `วิธีใช้: ถือ${name}ไว้ในมือ แล้วปล่อยบนต้นที่มีศัตรูพืช มันจะกินศัตรูพืชให้ (${sure}) ถ้าไม่สำเร็จมันจะบินหนีไป`
    : `Hold the ${name.toLowerCase()} and let it go on a plant that has a pest: it eats the pest (${sure}), or else it flies off.`;
}
const TIP_MS = 9000;
const WHY_BUGS: Record<string, [string, string]> = {
  had: ["จับตัวนี้ไปแล้ว", "You have caught this one already"], bare: ["มีคนจับไปก่อนแล้ว", "Somebody caught it first"], far: ["อยู่ไกลเกินไป", "Too far away"],
  none: ["ไม่อยู่แล้ว", "It is gone"], lure: ["มันปีนกลับขึ้นไปแล้ว", "It has climbed back up"],
  fled: ["มันตกใจหนีไปแล้ว", "It took fright and is gone"],
  // (a drop of nectar: one is out already; nothing is about this place at this hour; the day's drops are used)
  out: ["มีหยดน้ำหวานวางอยู่แล้ว", "A drop is out already"], quiet: ["แถวนี้ตอนนี้ยังไม่มีแมลงมาตอม", "No insect is about here just now"],
  drops: ["วันนี้น้ำหวานหมดแล้ว", "No nectar left today"], left: ["แมลงที่มาตอมน้ำหวานบินไปแล้ว", "The insect at your nectar has flown off"],
};
/** How long before it is there the insect of a drop is seen flying in, in milliseconds; and from how many tiles off. */
const ARRIVE = { ms: 1700, from: 7 };
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
/** The colour an insect is drawn in while its picture is not there. */
const DOT = "#f4e9c9";
const far = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const iconFor = (name: string): IconName | null => (name in ICON_ATLAS.icons ? (name as IconName) : null);

/** A swing of the net: where it was aimed, when it began, and when it lands. */
interface Swing { at: Vec; began: number; lands: number; done: boolean }

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
export default function TownBugs({ keeper, th, name, sfx, bottom, busy, register, registerTap }: {
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
  registerTap: (tap: ((at: Vec) => boolean) | null) => void;
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
  const live = useRef({ hand, spent, busy, th, name, soft, flutter, wary, sees, lured: luredKept.current, me: keeper.id });
  live.current = { hand, spent, busy, th, name, soft, flutter, wary, sees, lured: luredKept.current, me: keeper.id };
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
  const poses = useRef(new Map<number, { sight: BugSight; pose: Pose; h: Haunt }>());
  const me = useRef<Vec | null>(null), about = useRef<Array<Person & { id: string }>>([]);
  /** When each singer was last heard. */
  const sang = useRef(new Map<number, number>());
  const swing = useRef<Swing | null>(null), ready = useRef(0);
  const misses = useRef(new Map<string, number>()), stirred = useRef(new Map<number, boolean>());
  const caught = useRef<Array<{ bug: BugId; first: boolean; rid: string | null }>>([]);
  /** Until when the line about a pest gone is written over my head. */
  const ridUntil = useRef(0);
  const tapRef = useRef<((at: Vec) => boolean) | null>(null);

  useEffect(() => {
    const nameOf = (id: ItemId) => (live.current.th ? ITEMS[id].name.th : ITEMS[id].name.en);
    const say = (why: string) => { const w = WHY_BUGS[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (live.current.th ? w[0] : w[1]) : null); };

    /** The net has come down: whatever is under its ring is caught, and whatever it only came near minds it. */
    const land = (s: Swing, now: number) => {
      const here = me.current, tile: [number, number] | null = here ? [Math.floor(here.x), Math.floor(here.y)] : null;
      let got = false;
      for (const [id, { sight, pose, h }] of poses.current) {
        const kept = minds.current.get(id);
        if (!kept) continue;
        const key = `${id}:${sight.turn}`;
        if (!got && tile && taken(sight.bug, pose, s.at, live.current.spent, 1, live.current.wary)) {
          got = true;
          // (a beetle: whoever stands under its tree with something sweet; the tree it is in now, for one that does not stay)
          const lurer = BUGS[sight.bug].habit === "lure" ? about.current.find((p) => !p.moving && !!p.hold && LURES.includes(p.hold) && far(p, h.perches[kept.mind.at] ?? h.perches[0]) < HABITS.lure.reach) : null;
          const where = { x: pose.x, y: pose.y };
          // (the insect of my drop of nectar is no haunt's: it is caught as mine alone)
          const asked = id === LURED ? keeper.netMine("lured", tile, { misses: misses.current.get(key) ?? 0 }, live.current.name)
            : keeper.netDo(id, tile, { misses: misses.current.get(key) ?? 0, lure: lurer?.hold ?? null, by: lurer?.id ?? null }, live.current.name);
          void asked.then((did) => {
            if (!did.ok) { say(did.why); return; }
            misses.current.delete(key);
            caught.current.push({ bug: sight.bug, first: did.first, rid: did.rid ?? null });
            if (did.rid) { ridUntil.current = Date.now() + RID_MS; vfx.add("sparkle", null, { lift: 40 }); }
            const what = did.got.map(([item, n]) => `${nameOf(item)} ×${n}`).join(" · ");
            setNote(did.first ? `${what} · ${live.current.th ? "ตัวแรกของหมู่บ้าน" : "the village's first"}` : what);
            // (one that eats pests: how it is used, said each time one is caught)
            const how = did.got.map(([item]) => howTo(item, live.current.th)).find((line) => !!line);
            if (how) setTip(how);
            sfx?.wake();
            sfx?.work("netted");
            if (did.got.length) vfx.add("pop", where, { icon: iconOf(did.got[0][0]) });
          });
          continue;
        }
        if (far(aimOf(pose), s.at) <= NET.near) {
          misses.current.set(key, (misses.current.get(key) ?? 0) + 1);
          // tired hands lose it at the second miss: it is off, and is not seen here again this turn
          if (fledBy(misses.current.get(key) ?? 0, live.current.spent)) {
            const gone = fled.current ?? new Map<string, number>();
            gone.set(key, (id === LURED ? live.current.lured?.l.until ?? keeper.now() : bugTurnStart(h, sight.turn + 1)) - keeper.now() + Date.now());
            fled.current = gone;
            keepFled(gone);
            misses.current.delete(key);
            sfx?.work("flit");
            vfx.add("leaves", { x: pose.x, y: pose.y }, { lift: 30 });
            say("fled");
            continue;
          }
          const was = kept.mind;
          kept.mind = missed(sight.bug, h, sight.seed, kept.mind, now, here ?? s.at);
          if (kept.mind !== was && pose.seen) sfx?.work("flit", 0.7);
        }
      }
      if (!got) vfx.add("dust", { x: s.at.x, y: s.at.y });
    };

    register((frame) => {
      const { ctx, things, project, onScreen, s, img, still } = frame, now = Date.now();
      vfx.draw(frame);
      me.current = frame.self;
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
        if (born !== undefined && minds.current.get(h.id)?.turn !== sight.turn) minds.current.set(h.id, { turn: sight.turn, bug: sight.bug, mind: newMind(sight.bug, h, sight.seed, born) });
        let kept = minds.current.get(h.id);
        // (a mind is one insect's: another at the same haunt, in the same turn or the next, begins with its own)
        if (!kept || kept.turn !== sight.turn || kept.bug !== sight.bug) { kept = { turn: sight.turn, bug: sight.bug, mind: newMind(sight.bug, h, sight.seed, bugTurnStart(h, sight.turn)) }; minds.current.set(h.id, kept); }
        const before = kept.mind;
        if (!still) kept.mind = think(sight.bug, h, sight.seed, kept.mind, now, about.current);
        const pose = poseOf(sight.bug, h, sight.seed, kept.mind, now), bug = BUGS[sight.bug], at = project({ x: pose.x, y: pose.y });
        // heard: off in a fright from somebody; and what sings, over and over, softer from further off
        const away = frame.self ? far(frame.self, pose) : 99;
        if (kept.mind.visit !== before.visit && bug.habit !== "spot" && away < 9) sfx?.work("flit", Math.max(0.15, 1 - away / 9) * 0.6);
        if (pose.sings && away < 11 && now - (sang.current.get(h.id) ?? 0) > (bug.shy === "flight" ? 1100 : 620)) {
          sang.current.set(h.id, now);
          sfx?.work(bug.shy === "flight" ? "cicada" : "chirp", Math.max(0.06, 1 - away / 11) ** 1.6);
        }
        poses.current.set(h.id, { sight, pose, h });
        const k = SIZE * s, icon = iconFor(iconOf(sight.bug)), mind = kept.mind;
        // the net's silver glint over it, whether it shows itself or not; one off the screen is pointed to from the edge
        if (live.current.sees) {
          lit++;
          frame.over?.(() => {
            const W = ctx.canvas.width, H = ctx.canvas.height, m = Math.max(22, 12 * s), top = at.y - pose.lift * TILE_H * s - 18 * s;
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
        if (live.current.flutter && about.current[0] && frame.self && lulled(sight.bug, h, mind, about.current[0])) {
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
      for (const id of [...poses.current.keys()]) if (!shown.has(id)) { poses.current.delete(id); minds.current.delete(id); stirred.current.delete(id); }

      // a ladybird took a pest off some plant with it: said over my head, a little while
      if (now < ridUntil.current && frame.self) {
        const head = project(frame.self);
        frame.sign(live.current.th ? RID[0] : RID[1], head.x, head.y - 78 * s);
      }

      // the swing: the ring it will take, and the net coming down on it
      const sw = swing.current;
      if (sw) {
        const c = project(sw.at), t = Math.min(1, (now - sw.began) / Math.max(1, sw.lands - sw.began));
        if (!sw.done && now >= sw.lands) { sw.done = true; land(sw, now); }
        if (now > sw.lands + 220) swing.current = null;
        else things.push({ depth: sw.at.x + sw.at.y + 3, draw: () => {
          const r = NET.radius * (live.current.spent ? NET.tired.radius : 1);
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

    const tap = (at: Vec) => {
      const l = live.current, here = me.current, now = Date.now();
      if (l.busy || !here || !mayNet(l.hand)) return false;
      if (swing.current && !swing.current.done) return true;
      // a tap on an insect within reach, or just ahead of it, is a swing; anywhere else it is a step, as ever
      let near: Pose | null = null, least = AIM;
      for (const { pose } of poses.current.values()) { const d = far(aimOf(pose), at); if (d <= least) { least = d; near = pose; } }
      if (!near || far(near, here) > NET.reach) return false;
      if (now < ready.current) return true;
      swing.current = { at, began: now, lands: now + swingMs(l.spent), done: false };
      ready.current = now + swingMs(l.spent) + NET.again;
      sfx?.wake();
      sfx?.work("swish");
      return true;
    };
    tapRef.current = tap;
    registerTap(tap);
    return () => { register(null); registerTap(null); tapRef.current = null; };
  }, [keeper, register, registerTap, sfx, vfx]);

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

  // (for scripts in `next dev`: what is out for me, how each is this moment, and a swing at a point)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      // (my drop of nectar: what is out, and one put down where I stand)
      lured: () => live.current.lured?.l ?? null, luredHaunt: () => live.current.lured?.h ?? null, dropNectar,
      sights: () => seen.current.map((x) => ({ ...x, place: HAUNTS[x.id]?.place, kind: HAUNTS[x.id]?.kind, x: HAUNTS[x.id]?.x, y: HAUNTS[x.id]?.y, perches: HAUNTS[x.id]?.perches })),
      poses: () => [...poses.current.entries()].map(([id, { sight, pose }]) => ({ id, bug: sight.bug, ...pose, aim: aimOf(pose), ring: ringOf(sight.bug, live.current.spent, 1, live.current.wary), mind: minds.current.get(id)?.mind ?? null })),
      me: () => me.current, people: () => about.current, haunts: () => HAUNTS, ringOf: (bug: BugId) => ringOf(bug, live.current.spent, 1, live.current.wary), glints: () => glints.current, lulls: () => lulls.current,
      soft: () => live.current.soft, wary: () => live.current.wary,
      swing: (x: number, y: number) => { const now = Date.now(); swing.current = { at: { x, y }, began: now, lands: now + swingMs(live.current.spent), done: false }; },
      /** A tap at a point of the map, as the map hands one over: whether it was taken for a swing. */
      tap: (x: number, y: number) => tapRef.current?.({ x, y }) ?? false,
      swinging: () => !!swing.current && !swing.current.done,
      caught: () => caught.current, note: () => note, tip: () => tip, ridShown: () => Date.now() < ridUntil.current, fled: () => [...(fled.current?.keys() ?? [])],
      // (how many swings have missed each insect, by "haunt:turn"; how an insect will be so many milliseconds on, as far
      // as the clock alone says; how long my swing takes; and every insect that fled from me forgotten)
      misses: () => Object.fromEntries(misses.current), swingMs: () => swingMs(live.current.spent),
      poseAt: (id: number, ms: number) => {
        const at = poses.current.get(id), kept = minds.current.get(id);
        if (!at || !kept) return null;
        const p = poseOf(at.sight.bug, at.h, at.sight.seed, kept.mind, Date.now() + ms);
        return { ...p, aim: aimOf(p) };
      },
      forget: () => { fled.current = new Map(); keepFled(fled.current); setTick((n) => n + 1); },
    };
    (window as unknown as { __townBugs?: typeof handle }).__townBugs = handle;
    return () => { delete (window as unknown as { __townBugs?: typeof handle }).__townBugs; };
  }, [note, tip, dropNectar]);

  // The hunter's belt: the things of the insects' ranks that are used by hand, there while a net is held. Each shows
  // its state (how many are left, whether it is out) and says nothing of what it does.
  const belt = !busy && mayNet(hand) && hasNectar;
  if (!note && !tip && !belt) return null;
  return (
    <>
      {(note || tip) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2 pb-14" style={{ bottom }}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
          {tip && <p className="pop-in max-w-[24rem] rounded-2xl bg-bg/85 px-4 py-2 text-center text-ui leading-relaxed text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-bug-tip aria-live="polite">{tip}</p>}
        </div>
      )}
      {belt && (
        <div className="pointer-events-none absolute left-2 z-20 flex flex-col gap-2 sm:left-3" style={{ bottom: `calc(${bottom} + 3.75rem)` }} data-bug-belt>
          {hasNectar && (
            <button type="button" onClick={dropNectar} disabled={!!lured || drops <= 0} data-bug-nectar data-left={drops} data-out={lured ? "1" : "0"}
                    title={giftName("thingNectar", th)} aria-label={`${giftName("thingNectar", th)} ${drops}`}
                    className="pressable pointer-events-auto relative grid size-12 place-items-center rounded-full border-2 border-[#8a5a1c] bg-[#2b1a0c]/90 shadow-lg shadow-black/40 backdrop-blur-sm transition-opacity disabled:opacity-55">
              <TownIcon name={"thingNectar" as IconName} size={30} />
              <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border border-[#8a5a1c] bg-[#f0a02c] px-1 font-data text-label font-semibold leading-4 text-[#2b1a0c]">{drops}</span>
              {lured && <span aria-hidden className="absolute inset-[-3px] animate-pulse rounded-full border-2 border-[#ffd674] motion-reduce:animate-none" />}
            </button>
          )}
        </div>
      )}
    </>
  );
}
