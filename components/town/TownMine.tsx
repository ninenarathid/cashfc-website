"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isRest } from "@/lib/town/cave";
import { chamberOf, floorAtTile } from "@/lib/town/cave-state";
import { familiarOf, wearing } from "@/lib/town/gifts";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { MINING, hasBelow, isDug, lightOf, oreOf, pickOf, swingsFor, turnOf, type Peek, type PendingVein } from "@/lib/town/mining";
import { powerLeft } from "@/lib/town/powers";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { gemLevel, has, levelOf } from "@/lib/town/tools";
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
 * Glowing moss (now and then a plain rock of the cave lets some out) lights the chamber its rock stood in. The map's
 * art has no light to set down that is not a torch standing there, so the chamber is lit by the lights it does have:
 * for as long as the moss glows, the own light of whoever stands in that chamber reaches to its furthest wall, on
 * everybody's screen.
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
  tool: ["ต้องถืออีเต้อไว้ในมือ", "Hold a pickaxe"], none: ["ไม่มีหินก้อนนั้นแล้ว", "That rock is not there"], gone: ["หินก้อนนี้แตกไปแล้ว", "This rock is broken already"],
  far: ["อยู่ไกลเกินไป", "Too far away"], weak: ["อีเต้อเล่มนี้ยังกัดผลึกไม่เข้า", "This pickaxe will not bite the crystal"],
  full: WHY.full, vein: ["ยังมีสายแร่ที่เปิดค้างไว้", "A vein is still open"], spent: ["วันนี้ใช้ไปครบแล้ว", "Used up for today"],
  open: ["ทางลงชั้นนี้เปิดอยู่แล้ว", "The way down is open already"], here: ["ตรงนี้ทำไม่ได้", "Not on this spot"], away: WHY.away,
  shut: ["ทางลงชั้นนี้ยังไม่มีใครหาเจอ", "Nobody has found the way down yet"],
};
/** What a peek shows over a rock: the picture, by what it said. */
const PEEK_ICON = (peek: Peek, floor: number): string => (peek === "vein" ? "veinOre" : peek === "shards" ? iconOf(oreOf(floor)) : "stone");
/** How long the card of what a rock left stays, and a line of words (milliseconds). */
const CARD_MS = 3200, NOTE_MS = 2600;
/** Glowing moss on the rubble of the rock it came out of: two small pictures drawn once (a slow shimmer from one to the other), laid on the map each frame. */
let MOSS: HTMLCanvasElement[] | null = null;
function mossArt(): HTMLCanvasElement[] {
  if (MOSS) return MOSS;
  // (each tuft: where it is on a picture of 26 by 14, and how wide)
  const tufts: Array<[number, number, number]> = [[2, 9, 5], [6, 6, 6], [11, 8, 7], [17, 5, 5], [19, 9, 5], [9, 3, 4]];
  MOSS = [0, 1].map((turn) => {
    const c = document.createElement("canvas");
    c.width = 26; c.height = 14;
    const g = c.getContext("2d")!;
    for (const [x, y, w] of tufts) {
      g.fillStyle = "#17452e"; g.fillRect(x, y + 1, w, 3);
      g.fillStyle = "#2f9c63"; g.fillRect(x + 1, y, w - 2, 3);
      g.fillStyle = "#7df0aa"; g.fillRect(x + 1 + ((x + turn * 2) % Math.max(1, w - 3)), y + 1, 2, 1);
      g.fillStyle = "#e6ffe9"; g.fillRect(x + 1 + ((x + y + turn) % Math.max(1, w - 2)), y, 1, 1);
    }
    return c;
  });
  return MOSS;
}
/** The furthest a member's light is let reach for moss, in tiles (a chamber is not wider); and how much of the way to where it is going a light comes each frame, as a chamber lights up or goes dark. */
const MOSS_MOST = 16, MOSS_EASE = 0.14;
/** Whoever stands so near beyond a glowing chamber's furthest wall is in it all the same (a rock may stand in a tunnel's mouth, and its breaker beside it). */
const MOSS_NEAR = 2.5;
/** A swing as it is seen: how long the pick takes to come down. */
const SWING_MS = 190;
/** A hand that has not swung for so long has rested: the swings it made and has not told yet are told (milliseconds). */
const REST_MS = 900;

/** What a rock left, on its card: `by`, somebody else struck the last of my rock away (their name); `helped`, it was somebody else's rock (their name) and I lent a hand. */
interface Came { key: number; got: Array<[ItemId, number]>; way: boolean; crystal: boolean; vein: boolean; by?: string; helped?: string; moss?: boolean }
/** A line of words over the map for a moment: with the picture of the thing it wants, where it wants one. */
interface Note { text: string; icon?: IconName }
/**
 * A press on the map, as the map tells of it (components/town/Town's pointers): where it came down, in the screen's
 * own pixels; and that it was let go, or became a pull at the map. `up` answers whether the press had done anything
 * here already (a swing, a walk up to the rock): the letting go is then no tap besides.
 */
export interface MineHold { down: (x: number, y: number) => void; up: () => boolean }
/** A press being held: where and since when; the rock under it (not looked for until it has been held long enough; null: none); and what it has done. */
interface Held { x: number; y: number; at: number; rock?: Pick<Tapped, "floor" | "id" | "tile"> | null; swung: boolean; walked: boolean }

/** The cracks of a rock being struck, three stages of them: small pictures drawn once, laid on the rock each frame. */
let CRACKS: HTMLCanvasElement[] | null = null;
function cracks(): HTMLCanvasElement[] {
  if (CRACKS) return CRACKS;
  const first: Array<[number, number, number, number]> = [[14, 2, 12, 8], [12, 8, 15, 13]];
  const second: Array<[number, number, number, number]> = [...first, [15, 13, 11, 19], [12, 8, 6, 10], [15, 13, 21, 14]];
  const third: Array<[number, number, number, number]> = [...second, [11, 19, 13, 23], [6, 10, 3, 15], [21, 14, 24, 19], [14, 2, 18, 0], [11, 19, 6, 21], [21, 14, 25, 11]];
  CRACKS = [first, second, third].map((stage) => {
    const c = document.createElement("canvas");
    c.width = 28; c.height = 24;
    const g = c.getContext("2d")!;
    // (each a dark groove two pixels wide, with a pale edge of dust on its right)
    const pass = (dx: number, w: number, col: string) => {
      g.fillStyle = col;
      for (const [x0, y0, x1, y1] of stage) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) + dx, Math.round(y0 + ((y1 - y0) * i) / n), w, 1);
      }
    };
    pass(2, 1, "rgba(255,240,214,0.6)");
    pass(0, 2, "#120b07");
    return c;
  });
  return CRACKS;
}

export default function TownMine({ keeper, th, name, sfx, busy, bottom, reduced, register, here, warp, walk, openChest, tellLight, lightOfOther, registerHold }: {
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
  /** Hand the map what it is to tell of a press on it (and take it back with null): a press held on a rock keeps the pick swinging. */
  registerHold: (hold: MineHold | null) => void;
}) {
  const [, setTick] = useState(0);
  const again = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => { const stop = keeper.watch(again), t = setInterval(again, 5000); return () => { stop(); clearInterval(t); }; }, [keeper, again]);
  const vfx = useMemo(() => new Vfx(), []);
  const [note, setNote] = useState<Note | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), NOTE_MS); return () => clearTimeout(t); }, [note]);
  // (a refusal for want of a pick shows the pick it wants)
  const say = useCallback((why: string) => { const w = WHY_MINE[why] ?? (WHY as Record<string, [string, string]>)[why]; if (w) setNote({ text: th ? w[0] : w[1], ...(why === "tool" || why === "weak" ? { icon: "pick" as IconName } : {}) }); }, [th]);
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
  const dayWas = useRef<number | null>(null);
  useEffect(() => {
    if (!told) return;
    setCaveDay(told.day);
    // (the day has turned while I stood in the cave: its floors are other ones now, and I am stood where this one is come down into)
    if (dayWas.current !== null && dayWas.current !== told.day && whereRef.current.floor > 0 && !isRest(whereRef.current.floor)) {
      const a = World.caveSpots(whereRef.current.floor).arrive;
      warp(a[0], a[1]);
      setNote({ text: th ? "ถ้ำเปลี่ยนรูปไปแล้ว" : "The cave has shifted" });
    }
    dayWas.current = told.day;
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
  // a pick that makes some rocks glint: what glints is told by where I stand, so it is asked again as I walk (a few
  // tiles on from where it was last asked, and no oftener than every other second)
  const sees = !!pick && gemLevel(pick, "light") > 0 && where.floor > 0, askedAt = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!sees) return;
    const t = setInterval(() => {
      const at = tile(), was = askedAt.current;
      if (!at || (was && Math.max(Math.abs(at[0] - was[0]), Math.abs(at[1] - was[1])) < 2)) return;
      askedAt.current = at;
      void keeper.caveLook(whereRef.current.floor, at).then(again);
    }, 2000);
    return () => { clearInterval(t); askedAt.current = null; };
  }, [sees, keeper, tile, again]);
  // a guiding bat: a floor's small map is known whole on coming to it
  const bat = keeper.gives("famBat") && familiarOf(purse) === "famBat";
  useEffect(() => { if (where.floor > 0) setKnownWhole(where.floor, bat); }, [where.floor, bat]);
  // how far each member's light reaches: mine by what I wear and hold, another's by what they hold
  const lights = useRef(new Map<string, number>());
  const myLight = lightOf(purse);
  // glowing moss: the chambers that glow now, each with its middle and how far its furthest wall is from it (worked
  // out when what is told of the moss changes); and how far each member's light reaches for it, as the map's frame
  // last worked it out
  const mossSig = (told?.moss ?? []).map((m) => `${m.f}:${m.x}:${m.y}:${m.until}`).join("|"), mossDay = told?.day ?? 0;
  const glowing = useMemo(() => (keeper.cave()?.moss ?? []).flatMap((m) => { const c = chamberOf(m.f, mossDay, m.x, m.y); return c ? [{ ...m, c }] : []; }),
    [keeper, mossSig, mossDay]); // eslint-disable-line react-hooks/exhaustive-deps -- `mossSig` is what of the moss this reads
  const glowingRef = useRef(glowing), mossy = useRef(new Map<string, number>());
  glowingRef.current = glowing;
  useEffect(() => {
    setCaveLight((id) => Math.max(id === keeper.id ? myLight : Math.max(lights.current.get(id) ?? MINING.light.walker, lightOfOther(id)), mossy.current.get(id) ?? 0));
    return () => setCaveLight(null);
  }, [keeper.id, myLight, lightOfOther]);
  // (a lamp worn is told to the room, so that those near see by it; what is held is told already)
  const lamp = keeper.gives("charmMinerLamp") && wearing(purse, "charmMinerLamp") ? MINING.light.lamp : 0;
  useEffect(() => { tellLight(lamp); }, [tellLight, lamp]);

  // ── a rock struck ──
  // Swings add up with whoever keeps the game, mine and anybody's (lib/town/mining): the page counts the ones it has
  // not told yet, and tells them when they would strike the last of the rock away (as far as it knows), at my first
  // swing at a rock while anybody else is about (so that who struck it first is whoever did), at every swing at a rock
  // somebody else began (so that a hand lent is never a hand unseen), and when my hand has rested a moment. What the
  // rock leaves is for whoever struck it first.
  /** My swings at each rock not yet told, by "floor:rock:turn", with what telling them takes; how much of each rock whoever keeps the game last said was struck away; the swings I have made at each this turn, all told. */
  const unsent = useRef(new Map<string, { n: number; floor: number; rock: number; at: [number, number]; tile: [number, number] }>());
  const known = useRef(new Map<string, number>()), made = useRef(new Map<string, number>());
  /** When my last swing was; whether whoever keeps the game is being asked; whether anybody else is about (on my floor, or on the mountain with me); and the rocks of somebody else's I have been told are theirs. */
  const lastSwing = useRef(0), asking = useRef(false), company = useRef(false), whoseSaid = useRef(new Set<string>());
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
  /** How much of a rock of the place I am in is struck away, as far as this page knows: what was told of it, or what whoever keeps the game last answered me, whichever is more. */
  const partOf = useCallback((floor: number, rock: number, k: string): number => {
    const t = keeper.cave(), said = t && t.place === floor ? t.struck?.[String(rock)]?.part ?? 0 : 0;
    return Math.max(said, known.current.get(k) ?? 0);
  }, [keeper]);

  /** Tell whoever keeps the game the swings I have made at a rock and not told yet; and what comes of it. */
  const send = useCallback((k: string, armed = false) => {
    const mine = unsent.current.get(k);
    if (!mine || mine.n < 1 || asking.current) return;
    // (swings at a rock of a turn gone by are swings at a rock that is no more)
    if (Number(k.split(":")[2]) !== turnOf(keeper.now())) { unsent.current.delete(k); return; }
    const { n, floor, rock, at, tile } = mine;
    asking.current = true;
    unsent.current.delete(k);
    void keeper.mineDo(floor, rock, at, n, name, armed ? "quake" : undefined).then((did) => {
      asking.current = false;
      if (armed) setQuake(false);
      if (!did.ok) {
        // (quicker than a hand swings, or whoever keeps the game was not heard from, or wants a rock's swings all at once: they
        // are told again with the next; a rock that broke meanwhile is plainly gone, and whoever struck it first has been
        // paid for it)
        if (did.why === "soon" || did.why === "away" || did.why === "more") { const more = unsent.current.get(k); unsent.current.set(k, { n: n + (more?.n ?? 0), floor, rock, at, tile }); }
        else { known.current.delete(k); made.current.delete(k); if (did.why !== "gone") say(did.why); if (did.why === "weak") sfx?.work("clink"); }
        again();
        return;
      }
      const part = did.part ?? (did.broke.length ? 1 : 0), theirs = did.whose ?? null;
      if (!did.broke.length) {
        // it still stands, so much of it struck away
        known.current.set(k, part);
        if (did.waits && theirs) setNote({ text: th ? `หินก้อนนี้รอ ${theirs} มาเก็บ (กระเป๋าเขายังรับไม่ได้)` : `This rock waits for ${theirs}: they cannot take what it leaves yet` });
        else if (theirs && !whoseSaid.current.has(k)) { whoseSaid.current.add(k); setNote({ text: th ? `หินก้อนนี้ ${theirs} เริ่มทุบไว้` : `${theirs} began this rock` }); }
        again();
        return;
      }
      known.current.delete(k); made.current.delete(k); unsent.current.delete(k);
      sfx?.work(did.crystal ? "crystalRing" : "rockBreak");
      vfx.add("dust", { x: tile[0] + 0.5, y: tile[1] + 0.5 }, { lift: 4 });
      if (did.got[0]) vfx.add("pop", { x: tile[0] + 0.5, y: tile[1] + 0.5 }, { icon: iconOf(did.got[did.got.length - 1][0]), lift: 26 });
      // (a rock somebody else struck first: what it left is theirs, and I lent a hand)
      if (did.helped) setCame({ key: Date.now(), got: [], way: did.way, crystal: did.crystal, vein: false, helped: theirs ?? "", moss: !!did.moss });
      else setCame({ key: Date.now(), got: did.got, way: did.way, crystal: did.crystal, vein: !!did.vein, moss: !!did.moss });
      if (did.moss) setTimeout(() => sfx?.work("veinGlint"), 160);
      if (did.vein) { const v = did.vein; setTimeout(() => setVein(v), reduced ? 150 : 650); }
      void keeper.caveLook(floor, at).then(again);
      again();
    });
  }, [keeper, name, th, sfx, vfx, say, again, reduced]);
  // (my hand has rested: what it had struck and not told is told, a rock at a time)
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tellRest = useCallback(() => {
    if (rest.current) clearTimeout(rest.current);
    rest.current = setTimeout(function tellNow() {
      rest.current = null;
      const next = [...unsent.current.keys()][0];
      if (next === undefined) return;
      if (asking.current || performance.now() - lastSwing.current < REST_MS) { rest.current = setTimeout(tellNow, 300); return; }
      send(next);
      if (unsent.current.size) rest.current = setTimeout(tellNow, 300);
    }, REST_MS);
  }, [send]);
  useEffect(() => () => { if (rest.current) clearTimeout(rest.current); }, []);

  const strikeRock = useCallback((tap: Pick<Tapped, "floor" | "id" | "tile">): boolean => {
    const p = keeper.purse(), held = pickOf(p), me = here(), t = keeper.cave();
    if (!me || !t || busyRef.current || vein) return false;
    // no pick in the hand: said, as any other refusal is, and the tap is no step
    if (!held) { say("tool"); return true; }
    if (t.vein) { aside.current = null; setVein(t.vein); return true; }
    const floor = tap.floor, rock = tap.id, turn = turnOf(keeper.now()), k = `${floor}:${rock}:${turn}`;
    if ((t.gone[String(floor)] ?? []).includes(rock)) return false;
    // a pick that sees into stone: the first tap looks, and costs nothing
    if (has(held, "pkPeek") && !peeks.current.has(k)) {
      void keeper.minePeek(floor, rock).then((did) => { if (did.ok) { peeks.current.set(k, did.peek); again(); } else say(did.why); });
      peeks.current.set(k, "stone");
      // (a press held on goes on to swing only after a swing's own time: what the look said is seen first)
      lastSwing.current = performance.now();
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
    // (a rock somebody else has begun is theirs: said once; and the earthshaker's one swing is not for it)
    const begun = t.place === floor ? t.struck?.[String(rock)] : undefined, theirs = !!begun && !begun.mine;
    if (theirs && begun.by && !whoseSaid.current.has(k)) { whoseSaid.current.add(k); setNote({ text: th ? `หินก้อนนี้ ${begun.by} เริ่มทุบไว้` : `${begun.by} began this rock` }); }
    const n = (unsent.current.get(k)?.n ?? 0) + 1, armed = quake && has(held, "pkQuake") && !theirs;
    unsent.current.set(k, { n, floor, rock, at, tile: tap.tile });
    made.current.set(k, (made.current.get(k) ?? 0) + 1);
    sfx?.work("pickHit");
    vfx.add("dust", { x: tap.tile[0] + 0.5, y: tap.tile[1] + 0.5 }, { lift: 10 });
    // told at once: the swing that strikes the last of it away, as far as I know; every swing at somebody else's rock;
    // and my first at a rock nobody is known to have begun, while anybody else is about. Otherwise when my hand rests.
    const first = n === 1 && !begun && !known.current.has(k);
    if (armed || theirs || partOf(floor, rock, k) + n / needOf(floor, rock) >= 1 - 1e-6 || (first && company.current)) send(k, armed);
    else tellRest();
    again();
    return true;
  }, [keeper, here, walk, vein, quake, needOf, partOf, send, tellRest, th, sfx, vfx, say, again]);

  // (a rock I struck first, broken for me by somebody else: what it left me is said once, with who it was. What was
  // paid before this page came up is not said again.)
  const paid = told?.paid ?? null, paidSeen = useRef<number | null>(null);
  useEffect(() => {
    if (!told) return;
    const at = paid?.at ?? 0;
    if (paidSeen.current === null) { paidSeen.current = at; return; }
    if (!paid || at <= paidSeen.current) return;
    paidSeen.current = at;
    sfx?.work(paid.crystal ? "crystalRing" : "rockBreak");
    setCame({ key: at, got: paid.got, way: paid.way, crystal: paid.crystal, vein: paid.vein, by: paid.by });
  }, [!!told, paid?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  // (a new turn: every rock is back whole, and what this page kept of the last turn's rocks is dropped)
  useEffect(() => {
    const turn = String(told?.turn ?? ""), old = (k: string) => k.split(":")[2] !== turn;
    for (const m of [unsent.current, known.current, made.current, peeks.current] as Array<Map<string, unknown>>) for (const k of [...m.keys()]) if (old(k)) m.delete(k);
    for (const k of [...whoseSaid.current]) if (old(k)) whoseSaid.current.delete(k);
  }, [told?.turn]);

  // ── a press held on a rock: the pick keeps swinging, a swing at the swing's own time (the map's frame drives it) ──
  const hold = useRef<Held | null>(null), strikeRef = useRef(strikeRock);
  strikeRef.current = strikeRock;
  useEffect(() => {
    registerHold({
      // (only a press with a pick in the hand, and nothing else on the screen, may come to be held on a rock)
      down: (x, y) => { hold.current = !busyRef.current && pickOf(keeper.purse()) ? { x, y, at: performance.now(), swung: false, walked: false } : null; },
      up: () => { const h = hold.current; hold.current = null; return !!h && (h.swung || h.walked); },
    });
    return () => { registerHold(null); hold.current = null; };
  }, [registerHold, keeper]);

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
  /** (where the layout cannot be told a way is shut) A move between floors that is meant: the lift's, or a script's. */
  const meant = useRef(0);
  const ride = useCallback(async (to: number) => {
    const did = await keeper.liftRide(to);
    if (!did.ok) { say(did.why); return; }
    meant.current = performance.now();
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
      // the mine's mouth: whoever has reached a resting floor is asked where to; anybody else walks in, by its threshold
      registerTap("mouth", (tap) => ((keeper.cave()?.rests.length ?? 0) > 0 ? openLift(0, tap.tile) : walk(tap.tile[0], tap.tile[1]))),
      registerTap("ladderDown", (tap) => {
        if (tap.floor >= MINING.floors) { setSign(true); return true; }
        // (where the layout cannot be told that a way is shut: its ladder stands, and takes nobody down until the way is found)
        if (!setCaveWay && isDug(tap.floor) && !keeper.cave()?.ways[String(tap.floor)]) { say("shut"); return true; }
        return false;
      }),
    ];
    return () => { for (const stop of stops) stop(); };
  }, [!!told, strikeRock, openChest, openLift, keeper, say, walk]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── what is the mine's own on the map: drawn each frame ──
  const glintBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const draw: FarmDraw = (frame: FarmFrame) => {
      const me = frame.self, floor = me ? floorAtTile(Math.floor(me.x), Math.floor(me.y)) : 0;
      const mountain = !!me && !floor && me.x >= MOUNTAIN.x && me.y >= MOUNTAIN.y && me.x < MOUNTAIN.x + MOUNTAIN.w && me.y < MOUNTAIN.y + MOUNTAIN.h;
      if (floor !== whereRef.current.floor || mountain !== whereRef.current.mountain) {
        const from = whereRef.current.floor;
        // (the fallback's own guard: with a layout that cannot be told a way is shut, whoever its ladder took down from a
        // floor whose way nobody has found is stood back beside that ladder)
        if (!setCaveWay && floor === from + 1 && isDug(from) && !keeper.cave()?.ways[String(from)] && performance.now() - meant.current > 1500 && keeper.cave()) {
          const d = World.caveSpots(from).down;
          warp(d[0] + 1, d[1] + 1);
          say("shut");
          return;
        }
        whereRef.current = { floor, mountain };
        setWhere(whereRef.current);
      }
      // a lift I was walking to: its panel, on getting there
      const want = liftWant.current;
      if (want && me && Math.max(Math.abs(Math.floor(me.x) - want.tile[0]), Math.abs(Math.floor(me.y) - want.tile[1])) <= 1) { liftWant.current = null; setLift({ at: want.at }); }
      if (!floor && !mountain) return;
      // everybody's light, for the dark: by what each holds; and whether anybody else is about (on my floor, or on the mountain with me)
      if (frame.people) {
        const all = frame.people();
        if (floor) { lights.current.clear(); for (const p of all) if (p.hold === MINING.mushroom) lights.current.set(p.id, MINING.light.mushroom); }
        company.current = all.some((p) => p.id !== keeper.id && (floor ? floorAtTile(Math.floor(p.x), Math.floor(p.y)) === floor : p.x >= MOUNTAIN.x && p.y >= MOUNTAIN.y && p.x < MOUNTAIN.x + MOUNTAIN.w && p.y < MOUNTAIN.y + MOUNTAIN.h));
      }
      const t = keeper.cave(), turn = turnOf(keeper.now()), art = cracks(), s = frame.s;
      if (!t) return;
      const rocks = floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS, gone = t.gone[String(floor)] ?? [];
      const loose = t.loose && t.loose.floor === floor ? t.loose.ids : [];
      // glowing moss: whoever stands in a chamber that glows has a light that reaches its furthest wall, on everybody's
      // screen (the dark is cut by the lights the map's art has: nothing is drawn for it here but the moss itself)
      const lit = floor ? glowingRef.current.filter((m) => m.f === floor && m.until > keeper.now()) : [];
      if (lit.length || mossy.current.size) {
        const reach = (x: number, y: number) => { let r = 0; for (const m of lit) { const d = Math.hypot(x - m.c.x, y - m.c.y); if (d <= m.c.r + MOSS_NEAR) r = Math.max(r, Math.min(MOSS_MOST, d + m.c.r + 1)); } return r; };
        const ease = (id: string, to: number) => {
          const was = mossy.current.get(id) ?? 0, next = frame.still || Math.abs(to - was) < 0.1 ? to : was + (to - was) * MOSS_EASE;
          if (next > 0.05) mossy.current.set(id, next); else mossy.current.delete(id);
        };
        const here_ = new Set<string>([keeper.id]);
        ease(keeper.id, me ? reach(me.x, me.y) : 0);
        for (const p of frame.people?.() ?? []) if (p.id !== keeper.id && floorAtTile(Math.floor(p.x), Math.floor(p.y)) === floor) { here_.add(p.id); ease(p.id, reach(p.x, p.y)); }
        for (const id of [...mossy.current.keys()]) if (!here_.has(id)) mossy.current.delete(id);
        const pics = mossArt(), pic = pics[frame.still ? 0 : Math.floor(performance.now() / 700) % 2];
        for (const m of lit) {
          const c = frame.project({ x: m.x + 0.5, y: m.y + 0.62 });
          if (!frame.onScreen(c)) continue;
          frame.things.push({ depth: m.x + m.y + 1.01, draw: () => {
            frame.ctx.imageSmoothingEnabled = false;
            frame.ctx.drawImage(pic, Math.round(c.x - (pic.width * s) / 2), Math.round(c.y - (pic.height - 3) * s), Math.round(pic.width * s), Math.round(pic.height * s));
          } });
        }
      }
      // a press held on a rock: once it has been held long enough the rock under it is looked for (the one in front
      // first, where its picture is on the screen), and the pick swings at it, a swing at the swing's own time, until
      // the press is let go, the rock is gone, or I am moved out of its reach
      const h = hold.current;
      if (h && me && !busyRef.current) {
        const tick = performance.now();
        if (h.rock === undefined && tick - h.at >= MINING.swing.hold) {
          let under: (typeof rocks)[number] | null = null;
          for (const r of rocks) {
            if (gone.includes(r.id)) continue;
            const c = frame.project({ x: r.x + 0.5, y: r.y + 0.62 });
            if (Math.abs(h.x - c.x) <= 20 * s && h.y >= c.y - 34 * s && h.y <= c.y + 2 * s && (!under || r.x + r.y > under.x + under.y)) under = r;
          }
          h.rock = under ? { floor, id: under.id, tile: [under.x, under.y] } : null;
        }
        if (h.rock) {
          const inReach = Math.max(Math.abs(Math.floor(me.x) - h.rock.tile[0]), Math.abs(Math.floor(me.y) - h.rock.tile[1])) <= MINING.reach;
          if (h.rock.floor !== floor || gone.includes(h.rock.id) || (h.swung && !inReach)) h.rock = null;
          else if (inReach ? tick - lastSwing.current >= MINING.swing.ms && !asking.current : !h.walked) {
            // (out of reach: walked up to once, and swung at on getting there)
            if (inReach) h.swung = true; else h.walked = true;
            strikeRef.current(h.rock);
          }
        }
      }
      for (const r of rocks) {
        if (gone.includes(r.id)) continue;
        const k = `${floor}:${r.id}:${turn}`, n = unsent.current.get(k)?.n ?? 0, peek = peeks.current.get(k);
        // (how much of it is struck away: what whoever keeps the game says, mine and anybody's, and my swings not told yet)
        const said = Math.max(t.place === floor ? t.struck?.[String(r.id)]?.part ?? 0 : 0, known.current.get(k) ?? 0);
        if (!n && !said && !peek && !loose.includes(r.id)) continue;
        const c = frame.project({ x: r.x + 0.5, y: r.y + 0.5 });
        if (!frame.onScreen(c)) continue;
        // the cracks: by how far through it I am (a rock loosened shows the first of them)
        const part = Math.min(1, said + (n ? n / Math.max(1, needOf(floor, r.id)) : 0)), stage = part > 0 ? Math.min(2, Math.floor(part * 3)) : loose.includes(r.id) ? 0 : -1;
        if (stage >= 0) frame.things.push({ depth: r.x + r.y + 1.02, draw: () => {
          const w = art[stage].width * s, h = art[stage].height * s;
          frame.ctx.imageSmoothingEnabled = false;
          frame.ctx.drawImage(art[stage], Math.round(c.x - w / 2), Math.round(c.y - h - 5 * s), Math.round(w), Math.round(h));
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
            const g = frame.ctx, kx = (22 * s) / Math.max(cell[2], cell[3]), turnBy = (-1.25 + Math.min(1, age) * 1.6) * left;
            g.save();
            g.imageSmoothingEnabled = false;
            g.translate(c.x - left * 11 * s, c.y - 18 * s);
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
        // (the map's points are the screen's own pixels, as this box's are: one to one where the box is the canvas's size)
        const k = box.clientWidth / Math.max(1, frame.ctx.canvas.clientWidth);
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
  }, [register, keeper, vfx, needOf, warp, say]);

  // ── for scripts in `next dev` ──
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __townMine?: unknown }).__townMine = {
      where: () => whereRef.current,
      told: () => keeper.cave(),
      need: (floor: number, rock: number) => needOf(floor, rock),
      /** The swings I have made at a rock this turn; those of them not told yet; and how much of the rock is struck away, as far as this page knows. */
      swings: (floor: number, rock: number) => made.current.get(`${floor}:${rock}:${turnOf(keeper.now())}`) ?? 0,
      unsent: (floor: number, rock: number) => unsent.current.get(`${floor}:${rock}:${turnOf(keeper.now())}`)?.n ?? 0,
      part: (floor: number, rock: number) => partOf(floor, rock, `${floor}:${rock}:${turnOf(keeper.now())}`),
      /** Tell what is not told yet, now (a script that will not wait for the hand to rest). */
      flush: () => { for (const k of [...unsent.current.keys()]) send(k); },
      company: () => company.current,
      /** The chambers that glow with moss now (each with its middle and its reach), and how far each member's light reaches for it. */
      moss: () => glowingRef.current.filter((m) => m.until > keeper.now()),
      mossLight: () => Object.fromEntries(mossy.current),
      /** A tap on a rock, as the map hands one over (its tile looked up). */
      hit: (floor: number, rock: number) => { const r = (floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS).find((x) => x.id === rock); return r ? strikeRock({ floor, id: rock, tile: [r.x, r.y] }) : false; },
      rocks: (floor: number) => (floor ? World.caveRocks(floor) : World.MOUNTAIN_ROCKS),
      peeks: () => Object.fromEntries(peeks.current),
      light: () => myLight,
      hooks: () => ({ way: !!setCaveWay, crystal: !!setCrystalRock, laid: World.CAVE.laid.length }),
      lift: (at: number) => setLift({ at }),
      /** A script's own move between floors is meant (the layout's ladder is not stood back from). */
      meant: () => { meant.current = performance.now(); },
      ride: (to: number) => ride(to),
    };
    return () => { delete (window as unknown as { __townMine?: unknown }).__townMine; };
  }, [keeper, needOf, strikeRock, myLight, ride, partOf, send]);

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
                 data-state="open" data-mine-came={came.crystal ? "crystal" : came.way ? "way" : came.vein ? "vein" : "rock"} data-mine-by={came.by ?? ""} data-mine-helped={came.helped ?? ""} aria-live="polite">
              {/* somebody else struck the last of my rock away; or it was somebody else's rock, and I lent a hand */}
              {came.by !== undefined && <span className="basis-full text-center text-ui text-[#f6e3bd]">{th ? `${came.by || "เพื่อน"} ช่วยทุบก้อนที่เราเริ่มไว้จนแตก` : `${came.by || "A friend"} struck the last of your rock away`}</span>}
              {came.helped !== undefined && <span className="basis-full text-center text-ui text-[#f6e3bd]">{th ? `ช่วย ${came.helped || "เพื่อน"} ทุบหินแตกแล้ว` : `You helped ${came.helped || "a friend"} break their rock`}</span>}
              {came.got.map(([id, n]) => (
                <span key={id} className="flex items-center gap-1.5 text-ui" data-mine-got={id} data-n={n}><TownIcon name={iconOf(id) as IconName} size={24} /><span>{itemName(id)}</span><span className="font-data font-semibold tabular-nums">×{n}</span></span>
              ))}
              {came.way && <span className="basis-full text-center font-display text-read font-semibold text-[#ffd15c]" data-mine-way>{th ? "เจอทางลงแล้ว!" : "The way down!"}</span>}
              {came.vein && <span className="basis-full text-center font-display text-read font-semibold text-[#ffd15c]">{th ? "เจอสายแร่!" : "A vein!"}</span>}
              {came.crystal && <span className="basis-full text-center font-display text-read font-semibold text-[#bfeaff]">{th ? "ผลึกแตกแล้ว!" : "The crystal breaks!"}</span>}
              {came.moss && <span className="basis-full text-center font-display text-read font-semibold text-[#9dffc4]" data-mine-moss>{th ? "ตะไคร่เรืองแสงส่องสว่างทั้งโถง!" : "Glowing moss lights the chamber!"}</span>}
            </div>
          )}
          {note && (
            <p className={`${reduced ? "" : "pop-in"} flex items-center gap-2 rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm`} data-state="open" data-mine-note data-mine-wants={note.icon ?? ""} aria-live="polite">
              {note.icon && <TownIcon name={note.icon} size={22} />}{note.text}
            </p>
          )}
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
