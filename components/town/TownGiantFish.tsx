"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent as Press } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { isSpent } from "@/lib/town/stamina";
import { walkable } from "@/lib/town/world";
import { daylight, daylightAt } from "@/lib/town/daylight";
import { GIANT, GIANTS, callWords, fighting, holding, settled, type GiantHook, type GiantRefusal } from "@/lib/town/giant-fish";
import { BOARD, FIGHT_FEEL, atNet, cueing, hoopNow, lineGap, moveHoop, openHoop, rocksOf, scoops, shutHoop, startFish, stepFish, type FishState, type Hoop } from "@/lib/town/giant-fight";
import ART from "@/lib/town/catch-art.json";
import TownFoot from "./TownFoot";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import type { FarmDraw } from "./TownFarm";
import s from "./TownGiantPull.module.css";
import g from "./TownGiantFish.module.css";

/**
 * A giant fish landed together (lib/town/giant-fish; the owner, 2026-10-27: "ต้องมีเพื่อนเท่านั้น ต้องมีเฟสให้พิมพ์บอก
 * เพื่อนในเกมได้ด้วย"). Struck, the line is tied to the post and the angler's board holds: they type a call to the town
 * (the town's news, with a chip that shows the way), a boil marks the water on the map, and whoever stands near the post
 * may join as the netter. Then the fight, on the water seen from above (its own scene a water, scripts/pixel's
 * scene-giant-fish-*): the angler drags the rod tip to lead the fish past the rocks, the netter slides the hoop under it
 * at the net's line and holds it open as it comes. Three scoops and it is landed; three frays and the line breaks.
 *
 * The angler's page moves the fish (lib/town/giant-fight) and tells the netter's where it is, by the room's letterboxes
 * (`pair`); the netter's page tells where the hoop is, and judges its own scoops. Each reports what it judged (a fray, a
 * scoop) and whoever keeps the game counts them on its own clock (v309's town_giant_fish).
 */
const SCENES: Record<GiantHook["water"], string> = {
  town: "/town/giant-fish-town-a8cd4831d3.png", creek: "/town/giant-fish-creek-3ba0fdd718.png",
  headwater: "/town/giant-fish-headwater-1b7fc57b18.png", pool: "/town/giant-fish-pool-dc7e99a64c.png",
};
const PIECES = `/town/catch/${ART.image.split("/").pop()}`;
type Piece = keyof typeof ART.icons;
/** The scenes' own pixels; the fight's board (lib/town/giant-fight's BOARD) is laid over them at so many to one of its own. */
const W = 273, H = 182, KX = W / BOARD.w, KY = H / BOARD.h;
const SHADOW: Record<string, [Piece, Piece]> = { carp: ["gfCarpA", "gfCarpB"], cat: ["gfCatA", "gfCatB"], long: ["gfLongA", "gfLongB"], eel: ["gfEelA", "gfEelB"] };
const WOOD = "pressable tk tk-btn-wood min-h-11 px-3 text-ui font-semibold disabled:opacity-50";
const GREEN = "pressable tk tk-btn flex min-h-12 items-center justify-center gap-2 font-display text-ui font-semibold disabled:opacity-50";
const OPEN = "pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#f0c060] bg-[#3a2513]/95 py-1 pl-2 pr-4 text-ui font-semibold text-[#ffeccb] shadow-xl shadow-black/40";
const SEND_EVERY = 120;
/** The fight's count-in, seconds: the fish stays put and the rule is said. */
const COUNT_IN = 3;
const WATER: Record<GiantHook["water"], [string, string]> = { town: ["ท่าน้ำในเมือง", "the town's water"], creek: ["ลำธารในป่า", "the forest creek"], headwater: ["ต้นน้ำ", "the headwater"], pool: ["แอ่งน้ำตก", "the falls pool"] };
const REFUSED: Partial<Record<GiantRefusal, [string, string]>> = {
  far: ["ต้องยืนใกล้เสาที่ผูกสายไว้", "Stand near the post the line is tied to"], taken: ["มีคนช้อนแล้ว", "Somebody is netting it already"],
  gone: ["ปลาไปแล้ว", "The giant is gone"], soon: ["รออีกนิด", "A moment yet"], many: ["เรียกครบ 3 ครั้งแล้ว", "Three calls already"],
  long: ["ยาวเกิน 120 ตัวอักษร", "Longer than 120 letters"], empty: ["พิมพ์ข้อความก่อน", "Type something first"], full: ["กระเป๋าเต็ม ทำที่ว่างแล้วกดรับอีกครั้ง", "Your bag is full: make room and take it again"],
};
/** Ready-made calls, tapped into the box. */
const CHIPS: Array<[string, string]> = [["มาด่วน!", "Quick!"], ["ขอคนช้อน 1 คน", "One netter, please"], ["ใกล้หลุดแล้ว", "It's about to get away"]];

/** A piece of the boards' own small picture, as TownIcon draws one of the town's. */
function CatchIcon({ name, size }: { name: Piece; size: number }) {
  const [x, y, w, h] = ART.icons[name], k = size / Math.max(w, h);
  return <span aria-hidden className="inline-block shrink-0 align-middle" style={{ width: w * k, height: h * k, backgroundImage: `url(${PIECES})`, backgroundPosition: `${-x * k}px ${-y * k}px`, backgroundSize: `${ART.size[0] * k}px ${ART.size[1] * k}px`, imageRendering: "pixelated" }} />;
}
/** What the two pages tell each other, by the room's letterboxes: the angler where the fish is, the netter where the hoop is, a scoop as it is made. */
/** (`run`, `cue` and `open` are always said, 1 or 0, so that a flag the other page has seen is put down again when it ends) */
type Word = { gf: string; t?: number; x?: number; y?: number; vy?: number; run?: 0 | 1; cue?: 0 | 1; tip?: number; hx?: number; open?: 0 | 1; scoop?: number };
/** The room's letterboxes as the board uses them (components/town/Town wires them, as it does the handing game's). */
export interface GiantPairing { send: (to: string, data: Word) => void; hear: (fn: ((from: string, data: unknown) => void) | null) => void }
const wordOf = (data: unknown, id: string): Word | null => (data && typeof data === "object" && (data as Word).gf === id ? (data as Word) : null);
const clock = (ms: number) => { const sec = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
/** The way to a giant: a walk to the nearest tile within a netter's reach of the post that a walk is found to (a deck's end may be reached only from one side). */
function goNear(tile: [number, number], walkTo: (x: number, y: number) => boolean): boolean {
  for (let r = 0; r <= GIANT.reach; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !walkable(tile[0] + dx, tile[1] + dy)) continue;
    if (walkTo(tile[0] + dx, tile[1] + dy)) return true;
  }
  return false;
}

export interface GiantFishProps {
  me: string; myName: string; keeper: Keeper; th: boolean;
  /** Where I stand (asked at each look: the board looks twice a second), for the join and the way there. */
  here: () => { x: number; y: number } | null;
  hour: number | null;
  pairing: GiantPairing | null;
  registerDraw: (draw: FarmDraw | null) => void;
  walkTo: (x: number, y: number) => boolean;
  /** A giant just struck on my own line (TownFish), so the board holds at once. */
  struck: GiantHook | null;
}
export default function TownGiantFish({ me, myName, keeper, th, here, hour, pairing, registerDraw, walkTo, struck }: GiantFishProps) {
  const [giants, setGiants] = useState<GiantHook[]>([]);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [text, setText] = useState("");
  // (every board I have closed: closing a second must not bring back the first, nor hide a join while it is shown)
  const [shut, setShut] = useState<string[]>([]);
  const [steak, setSteak] = useState<string | null>(null);
  const [, tick] = useState(0);
  const lang = th ? 0 : 1, now = keeper.now(), pos = here(), at: [number, number] | null = pos ? [Math.floor(pos.x), Math.floor(pos.y)] : null;

  // ── the giants, read now and then, at the room's word, and at once after a deed of mine ──
  const read = useCallback(async () => { const all = await keeper.giantsNow?.(); if (all) setGiants(all); }, [keeper]);
  useEffect(() => {
    void read();
    const every = setInterval(() => void read(), 10_000), word = () => void read();
    window.addEventListener("cashtown:giants", word);
    return () => { clearInterval(every); window.removeEventListener("cashtown:giants", word); };
  }, [read]);
  useEffect(() => { if (struck) setGiants((all) => [...all.filter((h) => h.id !== struck.id), struck]); }, [struck]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(id); }, []);

  const live = giants.map((h) => settled(h, now));
  const mine = live.find((h) => (h.by === me || h.netter === me) && !shut.includes(h.id) && (!h.how || now - h.end < GIANT.after)) ?? null;
  const role: "angler" | "netter" | null = mine ? (mine.by === me ? "angler" : "netter") : null;
  const waiting = live.filter((h) => holding(h, now) && h.by !== me);
  const near = waiting.find((h) => at && Math.max(Math.abs(at[0] - h.tile[0]), Math.abs(at[1] - h.tile[1])) <= GIANT.reach) ?? null;
  const far = !mine && !near ? waiting.slice().sort((a, b) => dist(a) - dist(b))[0] ?? null : null;
  function dist(h: GiantHook) { return at ? Math.hypot(at[0] - h.tile[0], at[1] - h.tile[1]) : 0; }

  const act = useCallback(async (action: "call" | "join" | "free" | "claim", id: string, extra: { text?: string } = {}) => {
    if (busy) return null;
    setBusy(true); setSaid(null);
    try {
      const did = await keeper.giantFish?.(action, id, { ...extra, at: at ?? undefined, name: myName });
      if (!did) return null;
      if (!did.ok) { setSaid(REFUSED[did.why as GiantRefusal]?.[lang] ?? (th ? "ทำไม่ได้ตอนนี้" : "Not now")); return null; }
      setGiants((all) => all.map((h) => (h.id === id ? did.hook : h)));
      if (did.steak) setSteak(id);
      return did;
    } finally { setBusy(false); }
  }, [busy, keeper, at, myName, lang, th]);

  // (a "ไปช่วย" chip in the town's news or the chat: the way to that giant's water)
  useEffect(() => {
    const go = (e: Event) => { const id = (e as CustomEvent<string>).detail, h = giants.find((x) => x.id === id); if (!h) return; if (!goNear(h.tile, walkTo)) setSaid(th ? `ปลายักษ์อยู่ที่${WATER[h.water][0]}` : `The giant is at ${WATER[h.water][1]}`); };
    window.addEventListener("cashtown:giant-go", go);
    return () => window.removeEventListener("cashtown:giant-go", go);
  }, [giants, walkTo, th]);

  // ── my steak, taken as soon as it is mine to take ──
  const claimed = useRef<string | null>(null);
  useEffect(() => {
    if (mine?.how === "landed" && !mine.claimed.includes(me) && claimed.current !== mine.id) { claimed.current = mine.id; void act("claim", mine.id); }
  }, [mine, me, act]);

  // ── the boil on the map: the water churning where a giant holds or fights, and its fin ──
  const liveRef = useRef(live); liveRef.current = live;
  useEffect(() => {
    const draw: FarmDraw = (f) => {
      const t = f.now / 1000, [ix, iy, iw, ih] = ICON_ATLAS.icons.giantBoil ?? [0, 0, 0, 0];
      for (const h of liveRef.current) {
        if (!holding(h, f.now) && !fighting(h, f.now)) continue;
        const p = f.project({ x: h.tile[0] + 0.5, y: h.tile[1] + 0.5 });
        if (!f.onScreen(p)) continue;
        f.things.push({ depth: h.tile[0] + h.tile[1] + 0.2, draw: () => {
          const c = f.ctx, k = f.s;
          // rings going out on the water, pixel by pixel, and white water breaking at the middle
          for (let i = 0; i < 3; i++) {
            const u = ((t * 0.7 + i / 3) % 1), rx = (6 + u * 16) * k, a = (1 - u) * 0.8;
            c.fillStyle = `rgba(232,246,250,${a.toFixed(2)})`;
            for (let q = 0; q < 28; q++) { const ang = (q / 28) * Math.PI * 2; c.fillRect(Math.round(p.x + Math.cos(ang) * rx), Math.round(p.y + Math.sin(ang) * rx * 0.5), Math.max(1, Math.round(k)), Math.max(1, Math.round(k))); }
          }
          if (iw && f.img) { const sc = (20 * k) / Math.max(iw, ih), bob = Math.round(Math.sin(t * 3) * k); c.drawImage(f.img, ix, iy, iw, ih, Math.round(p.x - (iw * sc) / 2), Math.round(p.y - ih * sc + 4 * k + bob), Math.round(iw * sc), Math.round(ih * sc)); }
        } });
      }
    };
    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw]);

  // ── the fight: the angler's page moves the fish, the netter's draws it from the angler's word ──
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fight = useRef<{ id: string; fish: FishState; tip: number; hoop: Hoop; last: number; sent: number; scoops: number; heard: number; seen: Word | null; seenAt: number; flash: Array<{ at: number; x: number; y: number; kind: "fray" | "scoop" }>; keys: Record<string, boolean>; told: number } | null>(null);
  const isFighting = !!mine && fighting(mine, now) && mine.go > 0;
  if (mine && mine.go > 0 && (!fight.current || fight.current.id !== mine.id)) {
    fight.current = { id: mine.id, fish: startFish(mine.seed), tip: BOARD.w / 2, hoop: { x: BOARD.w / 2, open: null }, last: 0, sent: 0, scoops: mine.scoops.length, heard: mine.scoops.length, seen: null, seenAt: 0, flash: [], keys: {}, told: mine.frays.length };
  }
  // what the other page says
  useEffect(() => {
    if (!pairing || !mine) return;
    pairing.hear((from, data) => {
      const w = wordOf(data, mine.id), f = fight.current;
      if (!w || !f || (from !== mine.by && from !== mine.netter)) return;
      f.seen = { ...f.seen, ...w } as Word; f.seenAt = performance.now();
      if (typeof w.scoop === "number" && w.scoop > f.heard) f.heard = w.scoop;
    });
    return () => pairing.hear(null);
  }, [pairing, mine]);
  // a scoop the keeper counted that this page has not played yet: the fish thrashes off (the angler's page)
  if (mine && fight.current && mine.scoops.length > fight.current.heard) fight.current.heard = mine.scoops.length;
  // (`next dev`: the fight as it stands, for the check scripts, as TownFish hands over its own)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townGiant?: unknown };
    w.__townGiant = { fight: () => fight.current, giants: () => liveRef.current };
    return () => { delete w.__townGiant; };
  }, []);

  const reportFray = useCallback(async (id: string) => { const did = await keeper.giantFish?.("fray", id, {}); if (did?.ok) setGiants((all) => all.map((h) => (h.id === id ? did.hook : h))); return !!did?.ok; }, [keeper]);
  const reportScoop = useCallback(async (id: string) => {
    const did = await keeper.giantFish?.("scoop", id, {});
    if (did?.ok) { setGiants((all) => all.map((h) => (h.id === id ? did.hook : h))); if (mine?.by) pairing?.send(mine.by, { gf: id, scoop: did.hook.scoops.length }); }
    return !!did?.ok;
  }, [keeper, pairing, mine?.by]);

  useEffect(() => {
    if (!mine) return;
    const P = { scene: new Image(), pieces: new Image() };
    P.scene.src = SCENES[mine.water]; P.pieces.src = PIECES;
    const rocks = rocksOf(mine.seed), shapes = SHADOW[GIANTS[mine.giant].shadow];
    let raf = 0, before = performance.now(), scoopAsked = 0;
    const put = (ctx: CanvasRenderingContext2D, name: Piece, cx: number, cy: number, flip = false) => {
      const [x, y, w, h] = ART.icons[name];
      if (!flip) { ctx.drawImage(P.pieces, x, y, w, h, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h); return; }
      ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(1, -1); ctx.drawImage(P.pieces, x, y, w, h, -Math.round(w / 2), -Math.round(h / 2), w, h); ctx.restore();
    };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const ctx = canvas.current?.getContext("2d");
      if (!ctx || !P.scene.complete) return;
      const pnow = performance.now(), dt = Math.min(0.05, (pnow - before) / 1000); before = pnow;
      const knowNow = keeper.now(), h = giants.find((x) => x.id === mine.id) ?? mine, f = fight.current;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(P.scene, 0, 0, W, H);
      if (!P.pieces.complete) return;
      const t = h.go > 0 ? (knowNow - h.go) / 1000 : 0;
      // the rocks
      for (const o of rocks) put(ctx, o.kind ? "gfStones" : "gfBoulder", o.x * KX, o.y * KY);
      let fish: { x: number; y: number; vy: number; run: boolean; cue: boolean } | null = null, tip = BOARD.w / 2, hoop: Hoop | null = null;
      if (h.go === 0 || !f) {
        // held at the post: the giant's dark shape turning slowly under the boil
        const a = pnow / 2600, cx = BOARD.w / 2 + Math.cos(a) * 26, cy = 52 + Math.sin(a) * 12;
        fish = { x: cx, y: cy, vy: Math.cos(a), run: false, cue: false };
      } else if (role === "angler") {
        const dir = (f.keys.ArrowRight ? 1 : 0) - (f.keys.ArrowLeft ? 1 : 0);
        f.tip = Math.max(BOARD.left, Math.min(BOARD.right, f.tip + dir * 120 * dt));
        const tired = isSpent(keeper.purse(), knowNow), scooped = f.heard > f.scoops;
        if (scooped) { f.scoops = f.heard; f.flash.push({ at: pnow, x: f.fish.x, y: f.fish.y, kind: "scoop" }); }
        // (a count-in first, the two of them ready: the fish stays put till it is over)
        if (!h.how && t >= COUNT_IN && t <= GIANT.fight / 1000) {
          const step = stepFish(f.fish, t, dt, f.tip, tired, mine.seed, rocks, scooped);
          f.fish = step.fish;
          // (a fray the keeper did not take, two reports too close by the network's jitter, is not counted here either: the line can still break)
          if (step.frayed && f.told < GIANT.frays) { f.told++; f.flash.push({ at: pnow, x: f.fish.x, y: f.fish.y, kind: "fray" }); void reportFray(mine.id).then((ok) => { if (!ok && fight.current === f) f.told--; }); }
        }
        if (mine.netter && pnow - f.sent > SEND_EVERY) { f.sent = pnow; pairing?.send(mine.netter, { gf: mine.id, t, x: Math.round(f.fish.x * 10) / 10, y: Math.round(f.fish.y * 10) / 10, vy: Math.round(f.fish.vy), tip: Math.round(f.tip), run: f.fish.run ? 1 : 0, cue: cueing(f.fish, t) ? 1 : 0 }); }
        fish = { x: f.fish.x, y: f.fish.y, vy: f.fish.vy, run: !!f.fish.run, cue: cueing(f.fish, t) };
        tip = f.tip;
        if (f.seen && typeof f.seen.hx === "number") hoop = { x: f.seen.hx, open: f.seen.open === 1 ? 0 : null };
      } else {
        // the netter: the fish as the angler's page last said, eased towards it; my own hoop
        const dir = (f.keys.ArrowRight ? 1 : 0) - (f.keys.ArrowLeft ? 1 : 0);
        f.hoop = hoopNow(moveHoop(f.hoop, dir, dt), t);
        // (held open by a finger or by Space alike: dropped shut after a while, it is lifted again while still held)
        if ((f.keys[" "] || f.keys.held) && f.hoop.open == null) f.hoop = openHoop(f.hoop, t);
        if (!f.keys[" "] && f.keys.held === false && f.hoop.open != null) f.hoop = shutHoop(f.hoop, t);
        const w = f.seen;
        if (w && typeof w.x === "number" && typeof w.y === "number") {
          f.fish = { ...f.fish, x: f.fish.x + (w.x - f.fish.x) * Math.min(1, dt * 10), y: f.fish.y + (w.y - f.fish.y) * Math.min(1, dt * 10), vy: w.vy ?? 0 };
          fish = { x: f.fish.x, y: f.fish.y, vy: f.fish.vy, run: w.run === 1, cue: w.cue === 1 };
          tip = w.tip ?? tip;
          // (only on a fish the angler's page has said where it is lately: a page gone quiet leaves a fish nobody can net)
          if (!h.how && pnow - f.seenAt < 600 && scoops(f.hoop, f.fish, t) && pnow - scoopAsked > 1500) {
            scoopAsked = pnow; f.flash.push({ at: pnow, x: f.fish.x, y: f.fish.y, kind: "scoop" }); f.hoop = shutHoop(f.hoop, t);
            void reportScoop(mine.id);
          }
        }
        if (pnow - f.sent > SEND_EVERY) { f.sent = pnow; pairing?.send(mine.by, { gf: mine.id, hx: Math.round(f.hoop.x), open: f.hoop.open != null ? 1 : 0 }); }
        hoop = f.hoop;
      }
      // the line, from the rod tip on the deck to the fish's mouth, and the tip itself
      const tx = tip * KX, ty = BOARD.tip * KY;
      if (fish && h.how !== "broke" && h.how !== "landed") {
        const mx = fish.x * KX, my = fish.y * KY, shake = fish.cue ? Math.round(Math.sin(pnow / 30)) : 0;
        const rub = rocks.some((o) => lineGap(tip, fish!, o) < o.r);
        const n = Math.max(2, Math.ceil(Math.hypot(mx - tx, my - ty)));
        for (let i = 0; i <= n; i++) { const u = i / n; ctx.fillStyle = rub ? "#ffb08a" : "#f4efe0"; ctx.fillRect(Math.round(tx + (mx - tx) * u) + (i % 9 === 4 ? shake : 0), Math.round(ty + (my - ty) * u), 1, 1); }
      }
      // the fish under the water: two swim frames, head away while it runs, towards the deck while it is drawn in
      if (fish && h.how !== "landed") {
        const swim = Math.floor(pnow / (fish.run ? 140 : 260)) % 2, down = fish.vy > 3 && !fish.run;
        const [, , fw, fh] = ART.icons[shapes[0]];
        put(ctx, shapes[swim], fish.x * KX, fish.y * KY + (down ? -fh / 2 : fh / 2), down);
        void fw;
        // shown before it runs: rings going out round it
        if (fish.cue) { const u = (pnow / 500) % 1; ctx.fillStyle = `rgba(255,255,255,${(0.9 - u * 0.9).toFixed(2)})`; for (let q = 0; q < 24; q++) { const ang = (q / 24) * Math.PI * 2; ctx.fillRect(Math.round(fish.x * KX + Math.cos(ang) * (10 + u * 14)), Math.round(fish.y * KY + Math.sin(ang) * (6 + u * 8)), 1, 1); } }
      }
      put(ctx, "gfRodTip", tx, ty + 6);
      // the hoop, along the net's line; held open, a ring of light round it
      if (hoop) {
        // (being lifted again after it dropped shut: dimmed till it can be opened)
        const lifting = hoop.open == null && hoop.fell != null && t - hoop.fell < FIGHT_FEEL.lift;
        if (lifting) ctx.globalAlpha = 0.5;
        put(ctx, "gfHoop", hoop.x * KX, BOARD.net * KY + 6);
        ctx.globalAlpha = 1;
        if (hoop.open != null) { ctx.fillStyle = "rgba(255,224,138,0.85)"; for (let q = 0; q < 32; q++) { const ang = (q / 32) * Math.PI * 2; ctx.fillRect(Math.round(hoop.x * KX + Math.cos(ang) * 24), Math.round(BOARD.net * KY + 6 + Math.sin(ang) * 24), 1, 1); } }
      }
      // what happened: white water where a scoop took it, sparks where the line rubbed
      if (f) {
        f.flash = f.flash.filter((x) => pnow - x.at < 700);
        for (const x of f.flash) {
          const u = (pnow - x.at) / 700;
          ctx.fillStyle = x.kind === "scoop" ? `rgba(255,255,255,${(1 - u).toFixed(2)})` : `rgba(255,190,120,${(1 - u).toFixed(2)})`;
          for (let q = 0; q < 14; q++) { const ang = (q / 14) * Math.PI * 2 + q; const r = 4 + u * (x.kind === "scoop" ? 26 : 12); ctx.fillRect(Math.round(x.x * KX + Math.cos(ang) * r), Math.round(x.y * KY + Math.sin(ang) * r - u * 6), 2, 2); }
        }
      }
      // landed: the giant itself out of the water, at one of its pixels to one of the scene's
      if (h.how === "landed") {
        const [ix, iy, iw, ih] = ICON_ATLAS.icons[h.giant as IconName] ?? [0, 0, 0, 0], atlas = atlasImage();
        if (iw && atlas.complete) ctx.drawImage(atlas, ix, iy, iw, ih, Math.round(W / 2 - iw / 2), Math.round(H / 2 - ih / 2 - 6 + Math.sin(pnow / 300) * 2), iw, ih);
      }
      // the town's light, as the map is lit
      const sky = (hour !== null ? daylightAt(hour * 60) : daylight()).tint;
      if (sky[0] + sky[1] + sky[2] < 765) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mine, role, giants, keeper, pairing, reportFray, reportScoop, hour]);

  // ── the hands: the keys, a drag on the strip or the water, the hold ──
  useEffect(() => {
    if (!isFighting) return;
    const down = (e: KeyboardEvent) => { const f = fight.current; if (!f || !["ArrowLeft", "ArrowRight", " "].includes(e.key) || (e.target as HTMLElement)?.tagName === "INPUT") return; e.preventDefault(); f.keys[e.key] = true; if (e.key === " ") f.keys.held = true; };
    const up = (e: KeyboardEvent) => { const f = fight.current; if (!f) return; f.keys[e.key] = false; if (e.key === " ") f.keys.held = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [isFighting]);
  const drag = useRef<{ x: number; from: number } | null>(null);
  const onDrag = (phase: "down" | "move" | "up") => (e: Press<HTMLElement>) => {
    const f = fight.current;
    if (!f) return;
    if (phase === "down") { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, from: role === "angler" ? f.tip : f.hoop.x }; return; }
    if (phase === "up") { drag.current = null; return; }
    if (!drag.current) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = drag.current.from + ((e.clientX - drag.current.x) / box.width) * BOARD.w * 1.2;
    const clamped = Math.max(BOARD.left, Math.min(BOARD.right, x));
    if (role === "angler") f.tip = clamped; else f.hoop = { ...f.hoop, x: clamped };
  };
  const onHold = (open: boolean) => () => { const f = fight.current, h = mine; if (!f || !h || h.go === 0) return; const t = (keeper.now() - h.go) / 1000; f.hoop = open ? openHoop(f.hoop, t) : shutHoop(f.hoop, t); f.keys.held = open; };

  // ── what shows ──
  if (!mine) {
    // (a giant landed with me whose board I closed before my steak came, a full bag say: a way back to it)
    const owed = live.find((h) => h.how === "landed" && (h.by === me || h.netter === me) && !h.claimed.includes(me) && shut.includes(h.id) && now - h.end < GIANT.after);
    if (owed) return <TownFoot rank="chip" order={28}>
      <button className={OPEN} data-giant-fish-owed onClick={() => setShut((was) => was.filter((id) => id !== owed.id))}><TownIcon name="giantSteak" size={26} />{th ? "รับสเต๊กปลายักษ์" : "Take your giant steak"}</button>
    </TownFoot>;
    if (near) return <TownFoot rank="chip" order={28}>
      <button className={OPEN} data-giant-fish-join disabled={busy} onClick={() => void act("join", near.id)}><TownIcon name="netLong" size={26} />{th ? `ช่วย ${near.byName} ช้อนปลายักษ์` : `Help ${near.byName} net the giant`}</button>
      {said && <p role="status" className={s.said}>{said}</p>}
    </TownFoot>;
    if (far) {
      const dx = far.tile[0] - (at?.[0] ?? far.tile[0]), dy = far.tile[1] - (at?.[1] ?? far.tile[1]), deg = Math.round((Math.atan2(dx + dy, dx - dy) * 180) / Math.PI);
      return <TownFoot rank="chip" order={29}>
        <button className={`${OPEN} ${g.pill}`} data-giant-fish-far onClick={() => { if (!goNear(far.tile, walkTo)) setSaid(th ? `ปลายักษ์อยู่ที่${WATER[far.water][0]}` : `The giant is at ${WATER[far.water][1]}`); }}>
          <TownIcon name="giantBoil" size={26} /><span>{th ? `${far.byName} ติดปลายักษ์` : `${far.byName} has a giant`}<small> · {Math.round(dist(far))} {th ? "ช่อง" : "tiles"}</small></span>
          <span className={g.arrow} style={{ rotate: `${deg}deg` }} aria-hidden>➜</span>
        </button>
        {said && <p role="status" className={s.said}>{said}</p>}
      </TownFoot>;
    }
    return null;
  }

  const giant = GIANTS[mine.giant], hold = holding(mine, now), t = mine.go > 0 ? now - mine.go : 0;
  const left = hold ? mine.at + GIANT.hold - now : mine.go > 0 ? mine.go + GIANT.fight - now : 0;
  const callsLeft = GIANT.calls - mine.calls.length, callWait = mine.calls.length ? mine.calls[mine.calls.length - 1] + GIANT.callGap - now : 0;
  const sendCall = async (words: string) => { const w = callWords(words); if (!w) { setSaid(REFUSED[words.trim() ? "long" : "empty"]![lang]); return; } const did = await act("call", mine.id, { text: w }); if (did) setText(""); };
  const ended = !!mine.how, tag = mine.how === "landed" ? "landed" : mine.how ? "lost" : hold ? "hold" : "fight";
  const crew = <ul className={g.crew} aria-label={th ? "สองคนที่ขึ้นปลา" : "The two landing it"}>
    <li className={g.mate} data-me={mine.by === me || undefined}><b><TownIcon name="rodMaster" size={14} />{mine.by === me ? (th ? "คุณ" : "You") : mine.byName}</b><em>{th ? "คนตก" : "Angler"}</em></li>
    <li className={g.mate} data-me={mine.netter === me || undefined} data-free={!mine.netter || undefined}><b><TownIcon name="netLong" size={14} />{mine.netter ? (mine.netter === me ? (th ? "คุณ" : "You") : mine.netterName) : (th ? "ว่าง" : "Free")}</b><em>{th ? "คนช้อน" : "Netter"}</em></li>
  </ul>;
  const lostWords = mine.how === "broke" ? (th ? "สายขาด ปลายักษ์หลุดไปแล้ว" : "The line broke and the giant is gone") : mine.how === "freed" ? (th ? "ปล่อยปลายักษ์ไปแล้ว" : "You let the giant go") : mine.go === 0 ? (th ? "ไม่มีใครมาช้อนทัน ปลายักษ์ดิ้นหลุดไป" : "Nobody came to net it in time: it got away") : (th ? "หมดเวลา ปลายักษ์ดิ้นหลุดไป" : "Time ran out and the giant got away");
  return <TownFoot rank="board" wide order={62}>
    <section className={`tk tk-plate pointer-events-auto ${s.panel} ${g.fit}`} data-giant-fish={tag} aria-label={th ? "ปลายักษ์" : "A giant fish"}>
      <header className={s.title}>
        <TownIcon name={mine.how === "landed" ? (mine.giant as IconName) : "giantBoil"} size={26} />
        <h3 className="font-display text-ui font-semibold">{mine.how === "landed" ? (th ? "ได้ปลายักษ์!" : "Landed!") : hold ? (th ? "ปลายักษ์ติดเบ็ด!" : "A giant on the line!") : ended ? (th ? "ปลายักษ์หลุดไป" : "The giant got away") : role === "angler" ? (th ? "ปลายักษ์ · พาเข้าสวิง" : "The giant · lead it in") : (th ? "ปลายักษ์ · ช้อน" : "The giant · net it")}</h3>
        {ended && <button type="button" className={`${WOOD} grid min-w-11 place-items-center px-0`} aria-label={th ? "ปิด" : "Close"} onClick={() => { setShut((was) => [...was, mine.id]); setSteak(null); }}><TownIcon name="close" size={16} /></button>}
      </header>
      <div className={s.stage}>
        <canvas ref={canvas} width={W} height={H} className={`${s.canvas} ${g.scene}`} style={{ aspectRatio: `${W} / ${H}` }} />
        {hold && <div className={g.tag}>{th ? "ผูกสายไว้กับเสา" : "Tied to the post"}</div>}
        {mine.go > 0 && !ended && t < COUNT_IN * 1000 && <div className={s.count} aria-live="polite">{Math.max(1, Math.ceil(COUNT_IN - t / 1000))}</div>}
        {!hold && !ended && <><div className={g.tag}>{th ? `ช้อนแล้ว ${mine.scoops.length}/${GIANT.scoops}` : `Netted ${mine.scoops.length}/${GIANT.scoops}`}</div>
          <div className={g.tag} data-right data-tone={mine.frays.length ? "warn" : undefined}>{th ? "สายถลอก " : "Line "}{"●".repeat(mine.frays.length)}{"○".repeat(GIANT.frays - mine.frays.length)}</div></>}
        {!ended && <div className={g.bar} data-tone={left < 30_000 ? "warn" : undefined}><b>{hold ? (th ? `รอเพื่อน ${clock(left)}` : `Waiting ${clock(left)}`) : clock(left)}</b><i><span style={{ width: `${Math.max(0, Math.min(100, (left / (hold ? GIANT.hold : GIANT.fight)) * 100))}%` }} /></i></div>}
      </div>
      {crew}
      {hold && role === "angler" && <>
        <p className={`${s.note} ${g.roomy}`}>{th ? "ขึ้นคนเดียวไม่ได้ ต้องมีเพื่อนมาช้อน" : "It can't be landed alone: a friend must net it"}</p>
        <form className={g.call} onSubmit={(e) => { e.preventDefault(); void sendCall(text); }}>
          <label className={g.callHead} htmlFor="giant-call"><TownIcon name="chat" size={16} />{th ? "เรียกเพื่อนทั้งเมือง" : "Call the whole town"}</label>
          <div className={g.callRow}>
            <input id="giant-call" className={g.input} value={text} maxLength={GIANT.callLen} placeholder={th ? "พิมพ์เรียกเพื่อนมาช้อน" : "Call a friend to net it"} onChange={(e) => setText(e.target.value)} disabled={callsLeft <= 0} />
            <button type="submit" className={`${WOOD} min-w-16`} disabled={busy || callsLeft <= 0 || callWait > 0}>{th ? "ส่ง" : "Send"}</button>
          </div>
          <div className={g.chips}>{CHIPS.map((c) => <button key={c[0]} type="button" className={g.chip} disabled={busy || callsLeft <= 0 || callWait > 0} onClick={() => void sendCall(c[lang])}>{c[lang]}</button>)}</div>
          <small className={g.left}>{callsLeft <= 0 ? (th ? "เรียกครบ 3 ครั้งแล้ว" : "All three calls sent") : callWait > 0 ? (th ? `เรียกได้อีก ${callsLeft} ครั้ง · อีก ${Math.ceil(callWait / 1000)} วิ` : `${callsLeft} calls left · in ${Math.ceil(callWait / 1000)} s`) : (th ? `เรียกได้อีก ${callsLeft} ครั้ง · ห่างกัน 1 นาที` : `${callsLeft} calls left · a minute apart`)}</small>
        </form>
        <div className={s.row}><button type="button" className={`${WOOD} flex-1`} disabled={busy} onClick={() => void act("free", mine.id)}>{th ? "ปล่อยปลา" : "Let it go"}</button></div>
      </>}
      {isFighting && !ended && role === "angler" && <>
        <div className={g.drag} data-giant-fish-drag onPointerDown={onDrag("down")} onPointerMove={onDrag("move")} onPointerUp={onDrag("up")} onPointerCancel={onDrag("up")}><TownIcon name="rodMaster" size={26} /><span>{th ? "◂ ลากปลายคัน ▸" : "◂ drag the rod tip ▸"}</span></div>
        <p className={g.hint}>{th ? "ลากปลายคันพาปลาหลบหิน เข้าสวิงเพื่อน" : "Lead the fish past the rocks into your friend's net"}<span className={g.keys}> · ← →</span></p>
      </>}
      {isFighting && !ended && role === "netter" && <>
        <div className={g.duo}>
          <div className={g.drag} data-giant-fish-drag onPointerDown={onDrag("down")} onPointerMove={onDrag("move")} onPointerUp={onDrag("up")} onPointerCancel={onDrag("up")}><CatchIcon name="gfHoop" size={24} /><span>{th ? "◂ เลื่อนสวิง ▸" : "◂ move ▸"}</span></div>
          <button type="button" className={g.hold} data-giant-fish-hold data-open={fight.current?.hoop.open != null || undefined} onPointerDown={onHold(true)} onPointerUp={onHold(false)} onPointerLeave={onHold(false)} onPointerCancel={onHold(false)}><TownIcon name="netLong" size={26} /><span>{th ? <>กดค้าง<br />เปิดสวิง</> : <>Hold to<br />open</>}</span></button>
        </div>
        <p className={g.hint}>{th ? "ดักตรงที่ปลาจะเข้า เปิดสวิงตอนมันถึง" : "Wait where it comes in, open as it arrives"}<span className={g.keys}> · ← → Space</span></p>
      </>}
      {mine.how === "landed" && <div role="status" className={s.done}>
        <p className={s.big}>{giant.th && th ? giant.th : giant.en} · {mine.size} {th ? "ซม." : "cm"} · {mine.weight} {th ? "กก." : "kg"}</p>
        <p>{steak === mine.id || mine.claimed.includes(me) ? <>{th ? "ได้ " : "You got "}<span className={s.got}><TownIcon name="giantSteak" size={18} />{th ? "สเต๊กปลายักษ์ ×1" : "Giant fish steak ×1"}</span>{th ? " ขายให้ลุงได้" : ", the uncle buys it"}</> : (th ? "กำลังรับสเต๊ก…" : "Taking your steak…")}</p>
        <p className="text-meta text-muted">{th ? "บันทึกลงสมุดปลา หน้า \"ปลายักษ์\" พร้อมชื่อทั้งสองคน" : "Written in the fish book's giants, with both names"}</p>
        {!mine.claimed.includes(me) && steak !== mine.id && claimed.current === mine.id && !busy && <button type="button" className={`${GREEN} w-full`} onClick={() => void act("claim", mine.id)}>{th ? "รับสเต๊กอีกครั้ง" : "Take it again"}</button>}
      </div>}
      {ended && mine.how !== "landed" && <p role="status" className={s.note} data-tone="miss">{lostWords}</p>}
      {mine.go > 0 && !ended && t < 8000 && <p className={g.hint}>{th ? "ช้อนให้ได้ 3 ครั้ง · สายถลอกครบ 3 ครั้งจะขาด · ดูวงน้ำก่อนปลาพุ่ง" : "Net it 3 times · the line breaks at 3 frays · watch the rings before it runs"}</p>}
      {said && <p role="status" className={s.said}>{said}</p>}
    </section>
  </TownFoot>;
}

/** The town's atlas as one picture, for the landed giant. */
let atlasImg: HTMLImageElement | null = null;
function atlasImage(): HTMLImageElement { if (!atlasImg) { atlasImg = new Image(); atlasImg.src = ICON_ATLAS.image; } return atlasImg; }
