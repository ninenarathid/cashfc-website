"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUGS, HABITS, HAUNTS, LURES, NET, aimOf, bugTurnStart, fledBy, mayNet, missed, newMind, poseOf, ringOf, swingMs, taken, think,
  type BugId, type BugSight, type Mind, type Person, type Pose,
} from "@/lib/town/insects";
import { FARMING } from "@/lib/town/farm";
import { ITEMS, byOf, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { WILD_WISHES, softStep } from "@/lib/town/forest-eye";
import { WISH, type WishId } from "@/lib/town/fountain";
import { isSpent, levelOf } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { TILE_H, placeOf, type Vec } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import { ICON_ATLAS, type IconName } from "./TownIcon";
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
};
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
  // (the fountain's soft step: an insect lets me come nearer, lib/town/forest-eye)
  // (the fountain's soft step, or a meal's: the softer at each of the meal's levels, items' byOf; with neither, as ever)
  const soft = softStep(byOf(WILD_WISHES.net, levelOf(purse, keeper.now(), WILD_WISHES.net as WishId)));
  const live = useRef({ hand, spent, busy, th, name, soft, me: keeper.id });
  live.current = { hand, spent, busy, th, name, soft, me: keeper.id };

  /** What each insect has in mind on this screen, how each is this frame, where I am and who is about, and the swing in the air. */
  const minds = useRef(new Map<number, { turn: number; bug: BugId; mind: Mind }>());
  const poses = useRef(new Map<number, { sight: BugSight; pose: Pose }>());
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
      for (const [id, { sight, pose }] of poses.current) {
        const h = HAUNTS[id], kept = minds.current.get(id);
        if (!h || !kept) continue;
        const key = `${id}:${sight.turn}`;
        if (!got && tile && taken(sight.bug, pose, s.at, live.current.spent)) {
          got = true;
          // (a beetle: whoever stands under its tree with something sweet)
          const lurer = BUGS[sight.bug].habit === "lure" ? about.current.find((p) => !p.moving && !!p.hold && LURES.includes(p.hold) && far(p, h.perches[0]) < HABITS.lure.reach) : null;
          const where = { x: pose.x, y: pose.y };
          void keeper.netDo(id, tile, { misses: misses.current.get(key) ?? 0, lure: lurer?.hold ?? null, by: lurer?.id ?? null }, live.current.name).then((did) => {
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
            gone.set(key, bugTurnStart(h, sight.turn + 1) - keeper.now() + Date.now());
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
      about.current = (frame.people?.() ?? []).map((p, i) => (i === 0 && live.current.soft < 1 ? { ...p, soft: live.current.soft } : p));
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
      for (const sight of seen.current) {
        const h = HAUNTS[sight.id];
        if (!h || h.place !== here) continue;
        shown.add(h.id);
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
        poses.current.set(h.id, { sight, pose });
        const k = SIZE * s, icon = iconFor(iconOf(sight.bug)), mind = kept.mind;
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

  // (for scripts in `next dev`: what is out for me, how each is this moment, and a swing at a point)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      sights: () => seen.current.map((x) => ({ ...x, place: HAUNTS[x.id]?.place, kind: HAUNTS[x.id]?.kind, x: HAUNTS[x.id]?.x, y: HAUNTS[x.id]?.y, perches: HAUNTS[x.id]?.perches })),
      poses: () => [...poses.current.entries()].map(([id, { sight, pose }]) => ({ id, bug: sight.bug, ...pose, aim: aimOf(pose), ring: ringOf(sight.bug, live.current.spent), mind: minds.current.get(id)?.mind ?? null })),
      me: () => me.current, people: () => about.current, haunts: () => HAUNTS, ringOf: (bug: BugId) => ringOf(bug, live.current.spent),
      swing: (x: number, y: number) => { const now = Date.now(); swing.current = { at: { x, y }, began: now, lands: now + swingMs(live.current.spent), done: false }; },
      /** A tap at a point of the map, as the map hands one over: whether it was taken for a swing. */
      tap: (x: number, y: number) => tapRef.current?.({ x, y }) ?? false,
      swinging: () => !!swing.current && !swing.current.done,
      caught: () => caught.current, note: () => note, tip: () => tip, ridShown: () => Date.now() < ridUntil.current, fled: () => [...(fled.current?.keys() ?? [])],
      // (how many swings have missed each insect, by "haunt:turn"; how an insect will be so many milliseconds on, as far
      // as the clock alone says; how long my swing takes; and every insect that fled from me forgotten)
      misses: () => Object.fromEntries(misses.current), swingMs: () => swingMs(live.current.spent),
      poseAt: (id: number, ms: number) => {
        const at = poses.current.get(id), kept = minds.current.get(id), h = HAUNTS[id];
        if (!at || !kept || !h) return null;
        const p = poseOf(at.sight.bug, h, at.sight.seed, kept.mind, Date.now() + ms);
        return { ...p, aim: aimOf(p) };
      },
      forget: () => { fled.current = new Map(); keepFled(fled.current); setTick((n) => n + 1); },
    };
    (window as unknown as { __townBugs?: typeof handle }).__townBugs = handle;
    return () => { delete (window as unknown as { __townBugs?: typeof handle }).__townBugs; };
  }, [note, tip]);

  if (!note && !tip) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2 pb-14" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {tip && <p className="pop-in max-w-[24rem] rounded-2xl bg-bg/85 px-4 py-2 text-center text-ui leading-relaxed text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-bug-tip aria-live="polite">{tip}</p>}
    </div>
  );
}
