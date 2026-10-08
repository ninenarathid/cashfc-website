"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isRest } from "@/lib/town/cave";
import { floorAtTile } from "@/lib/town/cave-state";
import { familiarOf, wearing } from "@/lib/town/gifts";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { MINING, hasBelow, isDug, lightOf, oreOf, pickOf, swingsFor, turnOf, type Peek, type PendingVein } from "@/lib/town/mining";
import { powerLeft } from "@/lib/town/powers";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { has, levelOf } from "@/lib/town/tools";
import { handOf } from "@/lib/town/trade";
import * as World from "@/lib/town/world";
import { MOUNTAIN, MOUNTAIN_AT, setCaveDay, walkable, type Vec } from "@/lib/town/world";
import * as Art from "./mountain-art";
import { registerTap, setCaveLight, setCaveRocksDown, setKnownWhole, setRocksDown, setTorches, type Tapped } from "./mountain-art";
import type { FarmDraw, FarmFrame } from "./TownFarm";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";
import { Vfx } from "./vfx";

const TownVein = lazy(() => import("./TownVein"));

/**
 * Mining, on the map (lib/town/mining): no board. With a pick in the hand a tap on a rock within reach is a swing,
 * and so many swings break it; what it left is shown on a small card. A rock that hides a vein opens the vein's board
 * (components/town/TownVein). And the cave's own things: the lift's panel, a torch set down from the hand, the sign
 * at the last floor's way down, the chest in the foot yard, and what a pick's counted powers are used from.
 *
 * What stands on these maps is drawn by components/town/mountain-art from a state: this sets that state from what
 * whoever keeps the game tells (the rocks gone, the ways down open, the torches burning, how far each member's light
 * reaches), and asks it for the taps. Only `next dev` asks for this file, as for that one.
 *
 * Nothing here explains itself on the screen: states and refusals, never rules (the owner's rule).
 */
/** What the map's own layout may let a keeper say, where it has been taught to (asked of it by name: lib/town/world's `setCaveWay`, components/town/mountain-art's `setCrystalRock`). */
const setCaveWay = (World as unknown as { setCaveWay?: (floor: number, tile: [number, number] | null | undefined) => void }).setCaveWay ?? null;
const setCrystalRock = (Art as unknown as { setCrystalRock?: (floor: number, id: number | null) => void }).setCrystalRock ?? null;
/** Every floor laid, where the layout laid only some for its preview (its list is a plain one: floors are made as they are asked for). */
function layAll() {
  const laid = World.CAVE.laid;
  for (let n = 1; n <= MINING.floors; n++) if (!laid.includes(n)) laid.push(n);
  laid.sort((a, b) => a - b);
}

const WHY_MINE: Record<string, [th: string, en: string]> = {
  tool: ["ต้องถืออีเต้อไว้ในมือ", "Hold a pickaxe"], none: ["ไม่มีหินก้อนนั้นแล้ว", "That rock is not there"], gone: ["มีคนทุบไปก่อนแล้ว", "Somebody broke it first"],
  far: ["อยู่ไกลเกินไป", "Too far away"], weak: ["อีเต้อเล่มนี้ยังกัดผลึกไม่เข้า", "This pickaxe will not bite the crystal"],
  full: WHY.full, vein: ["ยังมีสายแร่ที่เปิดค้างไว้", "A vein is still open"], spent: ["วันนี้ใช้ไปครบแล้ว", "Used up for today"],
  open: ["ทางลงชั้นนี้เปิดอยู่แล้ว", "The way down is open already"], here: ["ตรงนี้ทำไม่ได้", "Not on this spot"], away: WHY.away,
  shut: ["ทางลงชั้นนี้ยังไม่มีใครหาเจอ", "Nobody has found the way down yet"],
};
/** What a peek shows over a rock: the picture, by what it said. */
const PEEK_ICON = (peek: Peek, floor: number): string => (peek === "vein" ? "veinOre" : peek === "shards" ? iconOf(oreOf(floor)) : "stone");
/** How long the card of what a rock left stays, and a line of words (milliseconds). */
const CARD_MS = 3200, NOTE_MS = 2600;
/** A swing as it is seen: how long the pick takes to come down. */
const SWING_MS = 190;

interface Came { key: number; got: Array<[ItemId, number]>; way: boolean; crystal: boolean; vein: boolean }

/** The cracks of a rock being struck, three stages of them: small pictures drawn once, laid on the rock each frame. */
let CRACKS: HTMLCanvasElement[] | null = null;
function cracks(): HTMLCanvasElement[] {
  if (CRACKS) return CRACKS;
  const lines: Array<Array<[number, number, number, number]>> = [
    [[11, 3, 10, 7], [10, 7, 12, 10]],
    [[11, 3, 10, 7], [10, 7, 12, 10], [12, 10, 9, 14], [10, 7, 6, 8], [12, 10, 16, 11]],
    [[11, 3, 10, 7], [10, 7, 12, 10], [12, 10, 9, 14], [10, 7, 6, 8], [12, 10, 16, 11], [9, 14, 11, 18], [6, 8, 4, 12], [16, 11, 18, 15], [11, 3, 14, 1], [9, 14, 5, 16]],
  ];
  CRACKS = lines.map((stage) => {
    const c = document.createElement("canvas");
    c.width = 22; c.height = 20;
    const g = c.getContext("2d")!;
    const dot = (x: number, y: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    for (const [x0, y0, x1, y1] of stage) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); dot(x + 1, y, "rgba(255,240,214,0.55)"); dot(x, y, "#120b07"); }
    }
    return c;
  });
  return CRACKS;
}

export default function TownMine({ keeper, th, name, sfx, busy, bottom, reduced, register, here, warp, walk, openChest, tellLight, lightOfOther }: {
  keeper: Keeper;
  th: boolean;
  /** My name, for whoever opened a way down. */
  name: string;
  sfx: FishSfx | null;
  /** Whether something else has the screen (a talk, the bag, a board): no swing begins then. */
  busy: boolean;
  /** How far up from the foot of the map what is said sits. */
  bottom: string;
  /** The map's own motion switch. */
  reduced: boolean;
  /** Hand the map the way to draw what is the mine's own (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
  /** Where I am on the map; stand me on a tile at once; walk me to a tile. */
  here: () => Vec | null;
  warp: (x: number, y: number) => boolean;
  walk: (x: number, y: number) => boolean;
  /** Open my storage box at a chest (walking up to it first). */
  openChest: (tile: [number, number]) => void;
  /** Tell the room how far my own light reaches when what I wear lights more than a walker's own (0: nothing does); and how far somebody else's was told to reach. */
  tellLight: (tiles: number) => void;
  lightOfOther: (id: string) => number;
}) {
  const [, setTick] = useState(0);
  const again = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { const stop = keeper.watch(again), t = setInterval(again, 5000); return () => { stop(); clearInterval(t); }; }, [keeper, again]);
  const vfx = useMemo(() => new Vfx(), []);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), NOTE_MS); return () => clearTimeout(t); }, [note]);
  const say = useCallback((why: string) => { const w = WHY_MINE[why] ?? (WHY as Record<string, [string, string]>)[why]; if (w) setNote(th ? w[0] : w[1]); }, [th]);
  const [came, setCame] = useState<Came | null>(null);
  useEffect(() => { if (!came) return; const t = setTimeout(() => setCame(null), CARD_MS); return () => clearTimeout(t); }, [came]);

  /** Where I am: the cave's floor (0 off it), and whether on the mountain. Looked at as the map is drawn, told to the page when it changes. */
  const [where, setWhere] = useState<{ floor: number; mountain: boolean }>({ floor: 0, mountain: false });
  const whereRef = useRef(where);
  const about = where.mountain || where.floor > 0;
  useEffect(() => { layAll(); }, []);
  useEffect(() => (about ? keeper.look("cave") : undefined), [keeper, about]);
  const tile = useCallback((): [number, number] | null => { const p = here(); return p ? [Math.floor(p.x), Math.floor(p.y)] : null; }, [here]);
  // on coming to a floor: say so (a resting floor reached is a lift's stop), and ask what is told there
  useEffect(() => {
    if (where.floor > 0) void keeper.caveReach(where.floor).then(again);
    void keeper.caveLook(where.floor, tile()).then(again);
  }, [keeper, where.floor, tile, again]);

  const told = keeper.cave(), purse = keeper.purse(), now = keeper.now(), pick = pickOf(purse), hand = handOf(purse);
  const points = keeper.lines()?.lines.mining?.points ?? 0, spent = isSpent(purse, now);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // ── what is told, set on the map's own state ──
  const sig = told ? JSON.stringify([told.day, told.gone, told.ways, told.torches.map((t) => [t.f, t.x, t.y]), told.crystal]) : "";
  useEffect(() => {
    if (!told) return;
    setCaveDay(told.day);
    setRocksDown(told.gone["0"] ?? []);
    for (let f = 1; f <= MINING.floors; f++) {
      const way = told.ways[String(f)];
      // (the rock a way down was found under is gone, and the ladder stands where it stood)
      setCaveRocksDown(f, told.gone[String(f)] ?? []);
      setTorches(f, told.torches.filter((t) => t.f === f).map((t) => ({ x: t.x, y: t.y, r: MINING.light.torch })));
      if (setCaveWay && isDug(f)) setCaveWay(f, hasBelow(f) ? (way ? [way.x, way.y] : null) : undefined);
    }
    if (setCrystalRock) for (const f of [28, 29]) setCrystalRock(f, told.crystal && told.crystal.floor === f ? told.crystal.rock : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` is what of `told` this reads
  }, [sig]);
  // what was told changes by itself at the rocks' next turn, or when a torch burns out: looked at again then
  useEffect(() => {
    if (!told) return;
    const t = setTimeout(() => { void keeper.caveLook(whereRef.current.floor, tile()).then(again); }, Math.max(500, told.again - keeper.now() + 300));
    return () => clearTimeout(t);
  }, [keeper, told?.again, tile, again]); // eslint-disable-line react-hooks/exhaustive-deps
  // a guiding bat: a floor's small map is known whole on coming to it
  const bat = keeper.gives("famBat") && familiarOf(purse) === "famBat";
  useEffect(() => { if (where.floor > 0) setKnownWhole(where.floor, bat); }, [where.floor, bat]);
  // how far each member's light reaches: mine by what I wear and hold, another's by what they hold
  const lights = useRef(new Map<string, number>());
  const myLight = lightOf(purse);
  useEffect(() => {
    setCaveLight((id) => (id === keeper.id ? myLight : Math.max(lights.current.get(id) ?? MINING.light.walker, lightOfOther(id))));
    return () => setCaveLight(null);
  }, [keeper.id, myLight, lightOfOther]);
  // (a lamp worn is told to the room, so that those near see by it; what is held is told already)
  const lamp = keeper.gives("charmMinerLamp") && wearing(purse, "charmMinerLamp") ? MINING.light.lamp : 0;
  useEffect(() => { tellLight(lamp); }, [tellLight, lamp]);

  // ── a rock struck ──
  /** The swings I have made at each rock this turn, by "floor:rock:turn"; when the last one was; and whether a break is being asked. */
  const swings = useRef(new Map<string, number>()), lastSwing = useRef(0), asking = useRef(false);
  /** A swing as it is seen, for a moment; what my peeks have said this turn; and whether the next swing is the earthshaker's. */
  const swung = useRef<{ at: number; tile: [number, number]; from: Vec } | null>(null);
  const peeks = useRef(new Map<string, Peek>());
  const [quake, setQuake] = useState(false);
  const [vein, setVein] = useState<PendingVein | null>(null);
  // (a vein opened before and not played out: its board comes up again; one put aside with the bag full stays put
  // aside until a rock is struck)
  const aside = useRef<number | null>(null), pending = told?.vein ?? null, veinSent = useRef(false);
  // (a board whose vein whoever keeps the game no longer has, and that was never sent: put away)
  useEffect(() => { if (vein && !pending && !veinSent.current) setVein(null); }, [vein, pending]);
  useEffect(() => { veinSent.current = false; }, [vein]);
  useEffect(() => { if (pending && !vein && pending.seed !== aside.current) setVein(pending); }, [pending?.seed, pending?.again, vein]); // eslint-disable-line react-hooks/exhaustive-deps

  const needOf = useCallback((floor: number, rock: number): number => {
    const p = keeper.purse(), t = keeper.cave(), loose = !!t?.loose && t.loose.floor === floor && t.loose.ids.includes(rock);
    return swingsFor(pickOf(p), floor, isSpent(p, keeper.now()), loose, points);
  }, [keeper, points]);

  const strikeRock = useCallback((tap: Pick<Tapped, "floor" | "id" | "tile">): boolean => {
    const p = keeper.purse(), held = pickOf(p), me = here(), t = keeper.cave();
    if (!held || !me || !t || busyRef.current || vein) return false;
    if (t.vein) { aside.current = null; setVein(t.vein); return true; }
    const floor = tap.floor, rock = tap.id, turn = turnOf(keeper.now()), k = `${floor}:${rock}:${turn}`;
    if ((t.gone[String(floor)] ?? []).includes(rock)) return false;
    // a pick that sees into stone: the first tap looks, and costs nothing
    if (has(held, "pkPeek") && !peeks.current.has(k)) {
      void keeper.minePeek(floor, rock).then((did) => { if (did.ok) { peeks.current.set(k, did.peek); again(); } else say(did.why); });
      peeks.current.set(k, "stone");
      return true;
    }
    const at: [number, number] = [Math.floor(me.x), Math.floor(me.y)];
    if (Math.max(Math.abs(at[0] - tap.tile[0]), Math.abs(at[1] - tap.tile[1])) > MINING.reach) {
      // out of reach: walk up to the nearest tile beside it
      const beside = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]): [number, number] => [tap.tile[0] + dx, tap.tile[1] + dy])
        .filter(([x, y]) => walkable(x, y)).sort((a, b) => Math.hypot(a[0] + 0.5 - me.x, a[1] + 0.5 - me.y) - Math.hypot(b[0] + 0.5 - me.x, b[1] + 0.5 - me.y));
      for (const [x, y] of beside) if (walk(x, y)) break;
      return true;
    }
    const tick = performance.now();
    if (asking.current || tick - lastSwing.current < MINING.swing.ms) return true;
    lastSwing.current = tick;
    swung.current = { at: tick, tile: tap.tile, from: me };
    // the day's crystal rock, and a pick that is not at the top: it rings off
    if (t.crystal && t.crystal.floor === floor && t.crystal.rock === rock && levelOf(held) < MINING.crystal.plus) { sfx?.work("clink"); say("weak"); again(); return true; }
    const n = (swings.current.get(k) ?? 0) + 1, armed = quake && has(held, "pkQuake");
    swings.current.set(k, n);
    sfx?.work("pickHit");
    vfx.add("dust", { x: tap.tile[0] + 0.5, y: tap.tile[1] + 0.5 }, { lift: 10 });
    if (n >= (armed ? 1 : needOf(floor, rock))) {
      asking.current = true;
      void keeper.mineDo(floor, rock, at, n, name, armed ? "quake" : undefined).then((did) => {
        asking.current = false;
        if (armed) setQuake(false);
        if (!did.ok) {
          // (more swings than the page thought: it goes on; quicker than a hand: the next tap asks again)
          if (did.why !== "more" && did.why !== "soon") { swings.current.delete(k); say(did.why); if (did.why === "weak") sfx?.work("clink"); }
          else if (did.why === "soon") swings.current.set(k, n - 1);
          again();
          return;
        }
        swings.current.delete(k);
        sfx?.work(did.crystal ? "crystalRing" : "rockBreak");
        vfx.add("dust", { x: tap.tile[0] + 0.5, y: tap.tile[1] + 0.5 }, { lift: 4 });
        if (did.got[0]) vfx.add("pop", { x: tap.tile[0] + 0.5, y: tap.tile[1] + 0.5 }, { icon: iconOf(did.got[did.got.length - 1][0]), lift: 26 });
        setCame({ key: Date.now(), got: did.got, way: did.way, crystal: did.crystal, vein: !!did.vein });
        if (did.vein) { const v = did.vein; setTimeout(() => setVein(v), reduced ? 150 : 650); }
        void keeper.caveLook(floor, at).then(again);
        again();
      });
    }
    again();
    return true;
  }, [keeper, here, walk, vein, quake, needOf, name, sfx, vfx, say, again, reduced]);

  // ── the lift, the last floor's sign ──
  const [lift, setLift] = useState<{ at: number } | null>(null), liftWant = useRef<{ at: number; tile: [number, number] } | null>(null);
  const [sign, setSign] = useState(false);
  const openLift = useCallback((at: number, standAt: [number, number]): boolean => {
    const me = here();
    if (!me) return false;
    if (Math.max(Math.abs(Math.floor(me.x) - standAt[0]), Math.abs(Math.floor(me.y) - standAt[1])) <= 2) { liftWant.current = null; setLift({ at }); return true; }
    liftWant.current = { at, tile: standAt };
    if (!walk(standAt[0], standAt[1])) liftWant.current = null;
    return true;
  }, [here, walk]);
  const ride = useCallback(async (to: number) => {
    const did = await keeper.liftRide(to);
    if (!did.ok) { say(did.why); return; }
    sfx?.work("liftRun");
    setLift(null);
    const at = did.at ?? [MOUNTAIN_AT.mouth.x + 3, MOUNTAIN_AT.mouth.y];
    warp(at[0], at[1]);
  }, [keeper, say, sfx, warp]);

  useEffect(() => {
    if (!told) return;
    const stops = [
      registerTap("rock", (tap) => strikeRock(tap)),
      registerTap("caveRock", (tap) => strikeRock(tap)),
      registerTap("chest", (tap) => { openChest(tap.tile); return true; }),
      registerTap("lift", (tap) => openLift(tap.floor, tap.tile)),
      // the mine's mouth: whoever has reached a resting floor is asked where to; anybody else walks in
      registerTap("mouth", (tap) => ((keeper.cave()?.rests.length ?? 0) > 0 ? openLift(0, tap.tile) : false)),
      registerTap("ladderDown", (tap) => {
        if (tap.floor >= MINING.floors) { setSign(true); return true; }
        // (where the layout cannot be told that a way is shut: its ladder stands, and takes nobody down until the way is found)
        if (!setCaveWay && isDug(tap.floor) && !keeper.cave()?.ways[String(tap.floor)]) { say("shut"); return true; }
        return false;
      }),
    ];
    return () => { for (const stop of stops) stop(); };
  }, [!!told, strikeRock, openChest, openLift, keeper, say]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── what is the mine's own on the map: drawn each frame ──
  const glintBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const draw: FarmDraw = (frame: FarmFrame) => {
      const me = frame.self, floor = me ? floorAtTile(Math.floor(me.x), Math.floor(me.y)) : 0;
      const mountain = !!me && !floor && me.x >= MOUNTAIN.x && me.y >= MOUNTAIN.y && me.x < MOUNTAIN.x + MOUNTAIN.w && me.y < MOUNTAIN.y + MOUNTAIN.h;
      if (floor !== whereRef.current.floor || mountain !== whereRef.current.mountain) { whereRef.current = { floor, mountain }; setWhere(whereRef.current); }
      // a lift I was walking to: its panel, on getting there
      const want = liftWant.current;
      if (want && me && Math.max(Math.abs(Math.floor(me.x) - want.tile[0]), Math.abs(Math.floor(me.y) - want.tile[1])) <= 1) { liftWant.current = null; setLift({ at: want.at }); }
      if (!floor && !mountain) return;
      // (the fallback's own guard: with a layout that cannot be told a way is shut, whoever its ladder took down a floor
      // whose way nobody has found is stood back beside it)
      // everybody's light, for the dark: by what each holds
      if (floor && frame.people) { lights.current.clear(); for (const p of frame.people()) if (p.hold === MINING.mushroom) lights.current.set(p.id, MINING.light.mushroom); }
      const t = keeper.cave(), turn = turnOf(keeper.now()), art = cracks(), s = frame.s;
      if (!t) return;
      const rocks = floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS, gone = t.gone[String(floor)] ?? [];
      const loose = t.loose && t.loose.floor === floor ? t.loose.ids : [];
      for (const r of rocks) {
        if (gone.includes(r.id)) continue;
        const k = `${floor}:${r.id}:${turn}`, n = swings.current.get(k) ?? 0, peek = peeks.current.get(k);
        if (!n && !peek && !loose.includes(r.id)) continue;
        const c = frame.project({ x: r.x + 0.5, y: r.y + 0.5 });
        if (!frame.onScreen(c)) continue;
        // the cracks: by how far through it I am (a rock loosened shows the first of them)
        const need = Math.max(1, needOf(floor, r.id)), stage = n ? Math.min(2, Math.floor((n / need) * 3)) : loose.includes(r.id) ? 0 : -1;
        if (stage >= 0) frame.things.push({ depth: r.x + r.y + 1.02, draw: () => {
          const w = art[stage].width * s * 1.1, h = art[stage].height * s * 1.1;
          frame.ctx.imageSmoothingEnabled = false;
          frame.ctx.drawImage(art[stage], Math.round(c.x - w / 2), Math.round(c.y - h - 3 * s), Math.round(w), Math.round(h));
        } });
        if (peek && frame.img) {
          const cell = ICON_ATLAS.icons[PEEK_ICON(peek, floor) as IconName] as [number, number, number, number] | undefined;
          if (cell) frame.things.push({ depth: r.x + r.y + 1.04, draw: () => {
            const kx = (11 * s) / Math.max(cell[2], cell[3]);
            frame.ctx.imageSmoothingEnabled = false;
            frame.ctx.globalAlpha = 0.95;
            frame.ctx.drawImage(frame.img!, cell[0], cell[1], cell[2], cell[3], Math.round(c.x - (cell[2] * kx) / 2), Math.round(c.y - 34 * s - cell[3] * kx), Math.round(cell[2] * kx), Math.round(cell[3] * kx));
            frame.ctx.globalAlpha = 1;
          } });
        }
      }
      // a swing, as it is seen: the pick coming down on the rock from my side
      const sw = swung.current, cell = ICON_ATLAS.icons["pick" as IconName] as [number, number, number, number] | undefined;
      if (sw && cell && frame.img && !frame.still) {
        const age = (performance.now() - sw.at) / SWING_MS;
        if (age >= 1.25) swung.current = null;
        else {
          const c = frame.project({ x: sw.tile[0] + 0.5, y: sw.tile[1] + 0.5 }), left = frame.project(sw.from).x > c.x ? -1 : 1;
          frame.things.push({ depth: sw.tile[0] + sw.tile[1] + 1.06, draw: () => {
            const g = frame.ctx, kx = (18 * s) / Math.max(cell[2], cell[3]), turnBy = (-1.1 + Math.min(1, age) * 1.5) * left;
            g.save();
            g.imageSmoothingEnabled = false;
            g.translate(c.x - left * 9 * s, c.y - 15 * s);
            g.rotate(turnBy);
            if (left < 0) g.scale(-1, 1);
            g.drawImage(frame.img!, cell[0], cell[1], cell[2], cell[3], Math.round(-cell[2] * kx * 0.2), Math.round(-cell[3] * kx), Math.round(cell[2] * kx), Math.round(cell[3] * kx));
            g.restore();
          } });
        }
      }
      vfx.draw(frame);
      // what glints for me (a light gem's): marks laid over the dark, each where its rock is on the screen
      const box = glintBox.current;
      if (box) {
        const k = box.clientWidth / Math.max(1, frame.ctx.canvas.width);
        let i = 0;
        for (const id of floor ? t.glints : []) {
          const r = rocks.find((x) => x.id === id), el = box.children[i] as HTMLElement | undefined;
          if (!r || !el || gone.includes(id)) continue;
          const c = frame.project({ x: r.x + 0.5, y: r.y + 0.5 });
          el.style.transform = `translate(${Math.round(c.x * k)}px, ${Math.round((c.y - 20 * s) * k)}px)`;
          el.style.opacity = frame.onScreen(c) ? "1" : "0";
          i++;
        }
        for (; i < box.children.length; i++) (box.children[i] as HTMLElement).style.opacity = "0";
      }
    };
    register(draw);
    return () => register(null);
  }, [register, keeper, vfx, needOf]);

  // ── for scripts in `next dev` ──
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __townMine?: unknown }).__townMine = {
      where: () => whereRef.current,
      told: () => keeper.cave(),
      need: (floor: number, rock: number) => needOf(floor, rock),
      swings: (floor: number, rock: number) => swings.current.get(`${floor}:${rock}:${turnOf(keeper.now())}`) ?? 0,
      /** A tap on a rock, as the map hands one over (its tile looked up). */
      hit: (floor: number, rock: number) => { const r = (floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS).find((x) => x.id === rock); return r ? strikeRock({ floor, id: rock, tile: [r.x, r.y] }) : false; },
      rocks: (floor: number) => (floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS),
      peeks: () => Object.fromEntries(peeks.current),
      light: () => myLight,
      hooks: () => ({ way: !!setCaveWay, crystal: !!setCrystalRock, laid: World.CAVE.laid.length }),
      lift: (at: number) => setLift({ at }),
      ride: (to: number) => ride(to),
    };
    return () => { delete (window as unknown as { __townMine?: unknown }).__townMine; };
  }, [keeper, needOf, strikeRock, myLight, ride]);

  if (!told) return null;
  const floor = where.floor, itemName = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const torchHere = floor > 0 && hand === MINING.torch && !busy && !vein;
  const wayIsOpen = floor > 0 && (isRest(floor) || !!told.ways[String(floor)]);
  const canQuake = !!pick && has(pick, "pkQuake") && about, canDrill = !!pick && has(pick, "pkDrill") && isDug(floor) && hasBelow(floor) && !wayIsOpen;
  const gleams = !!pick && has(pick, "pkGleam") && about;
  const stops = [0, 10, 20, 30].filter((n) => n <= MINING.floors);

  return (
    <>
      {/* what glints for me, over the dark */}
      <div ref={glintBox} aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden" data-mine-glints={told.glints.length}>
        {told.glints.map((id) => (
          <span key={id} className="absolute left-0 top-0 -ml-2 -mt-2 block size-4 opacity-0" data-mine-glint={id}>
            <span className={`block size-full rotate-45 border-2 border-[#fff6d8] bg-[#fff6d8]/40 ${reduced ? "" : "animate-pulse"}`} />
          </span>
        ))}
      </div>

      {(note || came) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2 pb-14" style={{ bottom }}>
          {came && (
            <div key={came.key} className={`${reduced ? "" : "pop-in"} flex max-w-[22rem] flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-4 py-2 text-[#ffeccb] shadow-[inset_0_0_0_2px_#9c6b3d,0_10px_20px_rgba(0,0,0,0.45)]`}
                 data-state="open" data-mine-came={came.crystal ? "crystal" : came.way ? "way" : came.vein ? "vein" : "rock"} aria-live="polite">
              {came.got.map(([id, n]) => (
                <span key={id} className="flex items-center gap-1.5 text-ui" data-mine-got={id} data-n={n}><TownIcon name={iconOf(id) as IconName} size={24} /><span>{itemName(id)}</span><span className="font-data font-semibold tabular-nums">×{n}</span></span>
              ))}
              {came.way && <span className="basis-full text-center font-display text-read font-semibold text-[#ffd15c]" data-mine-way>{th ? "เจอทางลงแล้ว!" : "The way down!"}</span>}
              {came.vein && <span className="basis-full text-center font-display text-read font-semibold text-[#ffd15c]">{th ? "เจอสายแร่!" : "A vein!"}</span>}
              {came.crystal && <span className="basis-full text-center font-display text-read font-semibold text-[#bfeaff]">{th ? "ผลึกแตกแล้ว!" : "The crystal breaks!"}</span>}
            </div>
          )}
          {note && <p className={`${reduced ? "" : "pop-in"} rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm`} data-state="open" data-mine-note aria-live="polite">{note}</p>}
        </div>
      )}

      {/* a torch in the hand, in the cave: set it down */}
      {torchHere && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-2" style={{ bottom }}>
          <button type="button" data-mine-torch
                  onClick={() => { const at = tile(); if (at) void keeper.torchDown(at).then((did) => { if (!did.ok) say(did.why); again(); }); }}
                  className="pressable pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 py-2 text-ui font-medium text-ink shadow-lg shadow-black/40 backdrop-blur-sm">
            <TownIcon name={"torch" as IconName} size={22} />{th ? "ปักคบไฟตรงนี้" : "Set the torch down"}
          </button>
        </div>
      )}

      {/* what a pick's counted powers are used from, while such a pick is held here */}
      {(canQuake || canDrill || gleams) && !vein && (
        <div className="pointer-events-none absolute left-2 z-20 flex flex-col gap-2 sm:left-3" style={{ bottom: `calc(${bottom} + 3.75rem)` }} data-mine-belt>
          {gleams && (
            <span className="pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-[#5f7fb8] bg-[#101a2b]/90 px-3 py-1.5 font-data text-meta text-[#dbe9ff] shadow-lg shadow-black/40" data-mine-gleam={told.crystal?.floor ?? 0}>
              <TownIcon name={"veinCrystal" as IconName} size={20} />{told.crystal ? (th ? `ชั้น ${told.crystal.floor}` : `Floor ${told.crystal.floor}`) : (th ? "แตกไปแล้ว" : "Broken")}
            </span>
          )}
          {canQuake && (
            <button type="button" onClick={() => setQuake((q) => !q)} disabled={powerLeft(purse, "pkQuake", now) <= 0} data-mine-quake={quake ? "1" : "0"} data-left={powerLeft(purse, "pkQuake", now)}
                    aria-pressed={quake} aria-label={th ? "แผ่นดินสะเทือน" : "Earthshaker"} title={th ? "แผ่นดินสะเทือน" : "Earthshaker"}
                    className={`pressable pointer-events-auto relative grid size-12 place-items-center rounded-full border-2 bg-[#2b1a0c]/90 shadow-lg shadow-black/40 backdrop-blur-sm transition-opacity disabled:opacity-55 ${quake ? "border-[#ffd674]" : "border-[#8a5a1c]"}`}>
              <TownIcon name={"pick" as IconName} size={28} />
              <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border border-[#8a5a1c] bg-[#f0a02c] px-1 font-data text-label font-semibold leading-4 text-[#2b1a0c]">{powerLeft(purse, "pkQuake", now)}</span>
              {quake && <span aria-hidden className={`absolute inset-[-3px] rounded-full border-2 border-[#ffd674] ${reduced ? "" : "animate-pulse"}`} />}
            </button>
          )}
          {canDrill && (
            <button type="button" disabled={powerLeft(purse, "pkDrill", now) <= 0} data-mine-drill data-left={powerLeft(purse, "pkDrill", now)}
                    aria-label={th ? "เจาะทะลุพื้น" : "Floor-breaker"} title={th ? "เจาะทะลุพื้น" : "Floor-breaker"}
                    onClick={() => { const at = tile(); if (at) void keeper.drillDo(at, name).then((did) => { if (!did.ok) say(did.why); else { sfx?.work("rockBreak"); setCame({ key: Date.now(), got: [], way: true, crystal: false, vein: false }); void keeper.caveLook(floor, at).then(again); } again(); }); }}
                    className="pressable pointer-events-auto relative grid size-12 place-items-center rounded-full border-2 border-[#8a5a1c] bg-[#2b1a0c]/90 shadow-lg shadow-black/40 backdrop-blur-sm transition-opacity disabled:opacity-55">
              <TownIcon name={"stone" as IconName} size={26} />
              <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border border-[#8a5a1c] bg-[#f0a02c] px-1 font-data text-label font-semibold leading-4 text-[#2b1a0c]">{powerLeft(purse, "pkDrill", now)}</span>
            </button>
          )}
        </div>
      )}

      {/* the lift: where it goes, as states */}
      {lift && !vein && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/35 p-3" onClick={() => setLift(null)} data-mine-lift>
          <section role="dialog" aria-label={th ? "ลิฟต์เหมือง" : "The mine's lift"} onClick={(e) => e.stopPropagation()}
                   className={`${reduced ? "" : "pop-in"} w-full max-w-[19rem] select-none rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]`} data-state="open">
            <div className="flex min-h-9 items-center">
              <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{th ? "ลิฟต์เหมือง" : "The mine's lift"}</h2>
              <button type="button" onClick={() => setLift(null)} className="pressable -mr-1 ml-auto min-h-9 rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "ปิด" : "Close"}</button>
            </div>
            <ul className="mt-1 flex flex-col gap-1.5">
              {stops.map((n) => {
                const reached = n === 0 || told.rests.includes(n), at = lift.at === n;
                return (
                  <li key={n}>
                    <button type="button" disabled={!reached || at} onClick={() => void ride(n)} data-lift-stop={n} data-state={at ? "here" : reached ? "reached" : "far"}
                            className={`pressable flex min-h-12 w-full items-center gap-3 rounded-md border-[3px] border-[#2a190d] px-3 text-left text-read font-semibold ${at ? "bg-[#4a2f18] text-[#e9cfa4]" : reached ? "bg-[#f0c060] text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] active:translate-y-px" : "bg-[#3a2513] text-[#8a6d4a]"}`}>
                      <span className="grid size-8 place-items-center rounded-sm border-2 border-[#2a190d] bg-[#2a190d]/30 font-data tabular-nums">{n === 0 ? "0" : n}</span>
                      <span className="flex-1">{n === 0 ? (th ? "ปากเหมือง" : "The mouth") : reached ? (th ? `ชั้นพัก ${n}` : `Resting floor ${n}`) : "???"}</span>
                      {at && <span className="font-data text-meta font-normal">{th ? "อยู่ที่นี่" : "Here"}</span>}
                    </button>
                  </li>
                );
              })}
              {lift.at === 0 && (
                <li>
                  <button type="button" data-lift-walk onClick={() => { setLift(null); const t = MOUNTAIN_AT.mouthTiles[1] ?? MOUNTAIN_AT.mouthTiles[0]; if (t) walk(t[0], t[1]); }}
                          className="pressable min-h-11 w-full rounded-md px-3 text-left text-ui text-[#f3dcb4] hover:text-[#fff6e3]">{th ? "เดินลงชั้น 1" : "Walk down to floor 1"}</button>
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {/* the sign at the last floor's way down */}
      {sign && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/35 p-3" onClick={() => setSign(false)} data-mine-sign>
          <div className={`${reduced ? "" : "pop-in"} max-w-[18rem] rounded-md border-[3px] border-[#2a190d] bg-[#f6e3bd] px-5 py-4 text-center text-[#3a2209] shadow-[0_8px_0_rgba(0,0,0,0.35)]`} data-state="open" role="dialog" aria-label={th ? "ป้าย" : "A sign"}>
            <p className="font-display text-title font-semibold">{th ? "ทางลงถูกปิดไว้" : "The way down is boarded up"}</p>
            <p className="mt-1.5 text-ui leading-relaxed">{th ? "ลึกกว่าชั้นนี้ยังไม่มีใครขุดถึง" : "Nobody has dug deeper than this floor yet."}</p>
          </div>
        </div>
      )}

      {/* a vein opened: its board, over the map */}
      {vein && (
        <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/45 px-2 pt-2 sm:items-center sm:p-4" style={{ paddingBottom: bottom }} data-mine-vein>
          <Suspense fallback={null}>
            <TownVein vein={vein} th={th} reduced={reduced} sfx={sfx}
                      onEnd={async (strikes) => { veinSent.current = true; const did = await keeper.veinDo(strikes); again(); return did.ok ? did : { ok: false, why: did.why }; }}
                      onClose={() => { const next = keeper.cave()?.vein ?? null; aside.current = next && !(next.again && !vein.again) ? next.seed : null; setVein(next && next.again && !vein.again ? next : null); again(); }} />
          </Suspense>
        </div>
      )}
    </>
  );
}
