"use client";

import { BOUNDS, floorBounds } from "@/lib/town/camera";
import { CAVE_LIGHT, CAVE_SIZE, lightsOf, reveal, type CaveLight } from "@/lib/town/cave";
import { sampleAge, type TreeAge } from "@/lib/town/mountain";
import { loadScenery, type SceneryKit } from "@/lib/town/scenery";
import { SMITH_CLOSED, SMITH_WHO, smithAsk, smithTalk } from "@/lib/town/smith";
import type { Line } from "@/lib/town/talk";
import {
  BEYOND_MORE_PROPS, BRIDGE, CAVE, CAVE_SEATS, GATES, MOUNTAIN, MOUNTAIN_AT, MOUNTAIN_PROPS, PEAKS, SMITH, TILE_H, TILE_W,
  caveRocks, caveSpots, caveToday, caveWay, floorCorner, floorOf, setBridge, setCaveDay, setCaveWay, walkable, type Place, type Prop, type Vec,
} from "@/lib/town/world";

/**
 * What is to come, drawn: the bridge over the river and the blacksmith in the town, the mountain's foot, and the
 * cave under it with its dark (the owner, 2026-10-08: a preview to look at before any game is built on these maps).
 * All of it is in this file, which only `next dev` asks for: the map (components/town/Town) hands it a frame and
 * knows nothing of what it draws.
 *
 * What stands on these maps is drawn from a state that whoever builds the games on them sets, not straight from
 * the layout: how each tree looks (a stump, a sprout, a young tree, grown), whether each rock still stands, how far
 * each member's light reaches in the cave, what lights have been set down, which floors' small maps are known whole.
 * And a tap on a tree, a rock, a ladder, a lift, the mine's mouth or the chest is handed to whoever has asked for
 * taps of that kind; with nobody asking, it is a step, as anywhere.
 *
 * Nothing here explains itself on the screen: the town shows states, never rules (the owner's rule).
 */

/* ── what whoever keeps the game sets ───────────────────────────────────── */

/** What can be tapped on these maps: a tree or a rock of the mountain, its ancient cedar, a rock of a cave floor, a floor's two ladders, a resting floor's lift, the mine's mouth, and the chest in the foot yard. */
export type TapKind = "tree" | "ancient" | "rock" | "caveRock" | "ladderUp" | "ladderDown" | "lift" | "mouth" | "chest";
/** A tap: on what, its number where it has one (a tree's, a rock's; -1 otherwise), the cave's floor (0 off it), and its tile. */
export interface Tapped { kind: TapKind; id: number; floor: number; tile: [number, number] }
/** Answer false to let the tap go on (to whatever is behind, and then to a step); anything else and it is taken. */
export type TapFn = (tap: Tapped) => boolean | void;

const treeLooks = new Map<number, TreeAge>(), rocksDown = new Set<number>(), caveDown = new Map<number, Set<number>>();
const torches = new Map<number, CaveLight[]>(), knownWhole = new Set<number>(), taps = new Map<TapKind, TapFn>();
const treeScales = new Map<number, number>(), glows = new Map<number, CaveLight[]>();
let lightOf: (member: string) => number = () => CAVE_LIGHT.walker;
let sample = false;
let ancientLook: 0 | 3 = 3;
/** The one rock that has crystals in it, once whoever keeps the game has said (or that there is none): until then, every rock the layout gave crystals. */
let crystal: { floor: number; id: number } | null | undefined;

/** How a tree of the mountain looks (lib/town/world's MOUNTAIN_TREES, by its number): 0 a stump, 1 a sprout, 2 a young tree, 3 grown. Grown until it is said otherwise. */
export function setTreeLook(id: number, look: TreeAge) { if (look === 3) treeLooks.delete(id); else treeLooks.set(id, look); }
/** Every tree's look at once: those not named are grown. */
export function setTreeLooks(looks: Iterable<readonly [number, TreeAge]>) { treeLooks.clear(); for (const [id, look] of looks) setTreeLook(id, look); }
export const treeLook = (id: number): TreeAge => treeLooks.get(id) ?? (sample ? sampleAge(id) : 3);
/**
 * How large each grown tree of the mountain is drawn against its picture's own size, by its number (a slender tree a
 * little smaller, a stout one a little larger): every tree's at once, and those not named are drawn as they are. Only
 * a grown tree is drawn by it: a stump, a sprout and a young tree are the size they are.
 */
export function setTreeScales(scales: Iterable<readonly [number, number]>) { treeScales.clear(); for (const [id, k] of scales) if (k > 0 && k !== 1) treeScales.set(id, k); }
/** How the ancient cedar looks: 3 grown (as it is until this is said otherwise), 0 felled, when its picture is not drawn and its great stump stands in its place. */
export function setAncientLook(look: 0 | 3) { ancientLook = look; }
export const ancientLookNow = (): 0 | 3 => ancientLook;
/** Whether a rock of the mountain stands (MOUNTAIN_ROCKS, by its number). Standing until it is said otherwise; a rock that does not is drawn as the rubble it left. */
export function setRockStands(id: number, stands: boolean) { if (stands) rocksDown.delete(id); else rocksDown.add(id); }
export function setRocksDown(ids: Iterable<number>) { rocksDown.clear(); for (const id of ids) rocksDown.add(id); }
export const rockStands = (id: number) => !rocksDown.has(id);
/** Whether a rock of a cave floor stands (lib/town/world's caveRocks(floor), by its number on that floor today). */
export function setCaveRockStands(floor: number, id: number, stands: boolean) {
  const down = caveDown.get(floor) ?? new Set<number>();
  if (stands) down.delete(id); else down.add(id);
  caveDown.set(floor, down);
}
export function setCaveRocksDown(floor: number, ids: Iterable<number>) { caveDown.set(floor, new Set(ids)); }
export const caveRockStands = (floor: number, id: number) => !caveDown.get(floor)?.has(id);
/**
 * The cave's one crystal rock (there is one a day, not one a floor): once this has been called at all, only that
 * rock of that floor is drawn with crystals, and blue on the small map, and every other rock the layout gave
 * crystals is a plain one (`null`: none anywhere). Never called, every such rock has them, as the layout says.
 */
export function setCrystalRock(floor: number, id: number | null) { crystal = id === null ? null : { floor, id }; }
/** Whether a rock of a floor is drawn with crystals; and the plain look of one that the layout gave crystals and that has none. */
const hasCrystals = (floor: number, r: { id: number; look: number }) => (crystal === undefined ? r.look === 3 : !!crystal && crystal.floor === floor && crystal.id === r.id);
const plainLook = (r: { id: number; look: number }) => (r.look === 3 ? r.id % 3 : r.look);
/** How far a member's own light reaches in the cave, in tiles: asked of this for everybody drawn there. Two tiles with nothing said (null puts that back). */
export function setCaveLight(reach: ((member: string) => number) | null) { lightOf = reach ?? (() => CAVE_LIGHT.walker); }
/** The lights set down on a floor (a torch: four tiles, for everybody), each where it stands in the world's tiles and how far it reaches. */
export function setTorches(floor: number, lights: ReadonlyArray<{ x: number; y: number; r?: number }>) {
  const c = floorCorner(floor);
  torches.set(floor, lights.map((l) => ({ u: l.x - c.x, v: l.y - c.y, r: l.r ?? CAVE_LIGHT.torch })));
}
/**
 * Lights on a floor with nothing drawn where they are (no torch stands there), for everybody: each where it is in the
 * world's tiles and how far it reaches. The dark is cut by them as by a torch, and they are a pale pool on the ground,
 * with no flame. All of a floor's at once: an empty list puts them out.
 */
export function setGlows(floor: number, lights: ReadonlyArray<{ x: number; y: number; r: number }>) {
  const c = floorCorner(floor), set = lights.filter((l) => l.r > 0).map((l) => ({ u: l.x - c.x, v: l.y - c.y, r: l.r }));
  if (set.length) glows.set(floor, set); else glows.delete(floor);
}
/** Whether a floor's small map is known whole (shown all at once), or filled in as it is walked. */
export function setKnownWhole(floor: number, whole: boolean) { if (whole) knownWhole.add(floor); else knownWhole.delete(floor); }
/** Ask for the taps on a kind of thing: the one who asked last has them. Gives a way to stop asking. */
export function registerTap(kind: TapKind, fn: TapFn): () => void {
  taps.set(kind, fn);
  return () => { if (taps.get(kind) === fn) taps.delete(kind); };
}
/** A few trees shown at their other ages, where nobody keeps the game yet (the preview's `&townSample=1`). */
export function setSample(on: boolean) { sample = on; }

/* ── what the map hands this, every frame ───────────────────────────────── */

export interface MoreFrame {
  ctx: CanvasRenderingContext2D;
  /** What stands up, to be drawn back to front; and what is drawn over everything, after the sky. */
  things: Array<{ depth: number; draw: () => void }>;
  signs: Array<() => void>;
  project: (t: Vec) => Vec;
  onScreen: (p: Vec) => boolean;
  /** Screen pixels to one of the map's own, the screen's size, device pixels to one of the screen's, and the frame's clock. */
  s: number; cw: number; ch: number; dpr: number; now: number;
  scenery: SceneryKit | null;
  /** Whether the town stands still (its own motion switch), and whether its words are Thai. */
  still: boolean; th: boolean;
  place: Place;
  me: { id: string; x: number; y: number } | null;
  others: Array<{ id: string; x: number; y: number }>;
  /** How far the lamps are lit: 0 by day, 1 at night. */
  lamps: number;
  label: (text: string, x: number, y: number, icon?: boolean) => void;
  flames: (x: number, y: number, k: number) => void;
  glow: (x: number, y: number, r: number, rgb: string, alpha: number, flat?: number) => void;
  sway: (p: { kind: string; x: number; y: number }) => number;
  /** The benches and the shopkeepers on the screen this frame, for taps: this adds its own. */
  benches: Array<{ i: number; x0: number; y0: number; x1: number; y1: number; depth: number }>;
  benchOf: (p: Prop) => number;
  keepers: Array<{ id: string; x0: number; y0: number; x1: number; y1: number }>;
}
/** What this needs of the map besides a frame: to stand me somewhere at once, and to walk me to a tile. */
export interface MoreHost { warp: (x: number, y: number) => boolean; walk: (x: number, y: number) => boolean; me: () => { id: string; x: number; y: number } | null }

/* ── pictures ───────────────────────────────────────────────────────────── */

/** How large each picture is drawn against its own pixels (the model draws some things a little small or large). */
const K: Record<string, number> = {
  mt2_0: 1.2, mt2_1: 1.2, mt2_2: 1.2, mt2_3: 1.2, ancient: 1.3, ancientStump: 1.1, mouth: 1.2, lookout: 1.4, flagpole: 1.05, storebox: 0.9, rubble: 0.5,
  ladderUp: 1.25, ladderDown: 1.15, lift: 0.95, torch: 0.6, smithboard: 0.9, smithsign: 0.95, stalagmite: 0.9, minecart: 1,
};
const kOf = (name: string) => K[name] ?? 1;
/** The blacksmith is drawn down to a popoto's size, as the uncle and the banker are. */
const SMITH_K = 0.8;
/** The bridge's picture, from its ground point in its own pixels: where its floor is (the rows its far and near edges are at), where its two ends are, and how long a span is. */
const BRIDGE_ART = { far: -79, near: -43, left: -213, right: 213, lanterns: [[-204, 100], [204, 100]] as Array<[number, number]> };
/** A doll's height on the map, in the map's own pixels (components/town/Town's). */
const DOLL = 77;

const pictures = new Map<string, HTMLImageElement>();
/** A picture by its address, for a part of a prop to be drawn by itself (the bridge, span by span). */
function pictureOf(src: string): HTMLImageElement | null {
  let img = pictures.get(src);
  if (!img) { img = new Image(); img.decoding = "async"; img.src = src; pictures.set(src, img); }
  return img.complete && img.naturalWidth ? img : null;
}
/**
 * A part of a prop, where it is in the whole: `box` is the part, in the prop's own pixels from its ground point
 * (left, top, right, bottom), and (x, y) is where the ground point is on the screen.
 */
function drawSlice(f: MoreFrame, name: string, x: number, y: number, box: readonly [number, number, number, number]) {
  const sprite = f.scenery?.sprite(name), img = sprite && pictureOf(sprite.src);
  if (!sprite || !img || !f.scenery) return;
  const [sx, sy, w, h] = sprite.at, [ax, ay] = f.scenery.anchorOf(name);
  const x0 = Math.max(0, Math.floor(box[0] + ax)), y0 = Math.max(0, Math.floor(box[1] + ay)), x1 = Math.min(w, Math.ceil(box[2] + ax)), y1 = Math.min(h, Math.ceil(box[3] + ay));
  if (x1 <= x0 || y1 <= y0) return;
  const { ctx, s, dpr } = f, at = (v: number) => Math.round(v * dpr) / dpr;
  ctx.save();
  ctx.imageSmoothingEnabled = s * dpr < 1;
  const dx0 = at(x + (x0 - ax) * s), dy0 = at(y + (y0 - ay) * s), dx1 = at(x + (x1 - ax) * s), dy1 = at(y + (y1 - ay) * s);
  ctx.drawImage(img, sx + x0, sy + y0, x1 - x0, y1 - y0, dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.restore();
}

/** The pictures of their own that these maps have (public/town/mountain.json, cave.json): each fetched once, by whoever goes that way, and added to the scenery. */
const loaded: Record<"mountain" | "cave", { asked: number; here: boolean }> = { mountain: { asked: -1e9, here: false }, cave: { asked: -1e9, here: false } };
const AGAIN_MS = 30_000;
function loadMore(set: "mountain" | "cave", now: number) {
  const state = loaded[set];
  if (state.here || now - state.asked < AGAIN_MS) return;
  state.asked = now;
  void (async () => {
    const into = await loadScenery();
    const r = await fetch(`/town/${set}.json`);
    if (!r.ok) throw new Error(`${set}.json ${r.status}`);
    const json = await r.json();
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    into.add(json, img);
    state.here = true;
  })().catch(() => { /* its things are not drawn until it comes: asked for again in a while */ });
}

/* ── the dark of the cave ───────────────────────────────────────────────── */

/**
 * A light as a picture, made once: all of it at the middle and for most of the way out, fading to nothing at the
 * rim. It is cut out of the dark at each light's size, so the dark costs a few pictures a frame and no gradient.
 */
let hole: HTMLCanvasElement | null = null;
function holePicture(): HTMLCanvasElement {
  if (hole) return hole;
  const R = 96;
  hole = document.createElement("canvas");
  hole.width = hole.height = R * 2;
  const g = hole.getContext("2d");
  if (g) {
    const fade = g.createRadialGradient(R, R, 0, R, R, R);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.62, "rgba(0,0,0,1)");
    fade.addColorStop(0.82, "rgba(0,0,0,0.55)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fade;
    g.fillRect(0, 0, R * 2, R * 2);
  }
  return hole;
}
/** The dark is laid at a third of the screen's size and drawn up: its edges are soft anyway. */
const DARK_SCALE = 3;
/** A light's picture is drawn so much wider than the light reaches: what is within reach is plainly seen, and the dark closes just beyond it. */
const HOLE_WIDER = 1.3;

/* ── the art itself ─────────────────────────────────────────────────────── */

export class MountainArt {
  /** What can be tapped on the screen this frame: where, how far forward, and what it is. */
  private hits: Array<{ x0: number; y0: number; x1: number; y1: number; depth: number; tap: Tapped; art: string }> = [];
  /** The floor of the cave I am on (0 off it), and the day whose cave it is. */
  private floor = 0;
  /** What of each floor I have seen, for its small map; and the small map's picture, with what it was made from. */
  private seen = new Map<number, Uint8Array>();
  private mapArt: { canvas: HTMLCanvasElement; key: string } | null = null;
  private dark: HTMLCanvasElement | null = null;
  private smithTurn = 0;
  /** Where the address asked to be put at once (`&townAt=`), until it has been. */
  private wanted: string | null = null;
  /** How many pixels the last frame's dark left lit, of how many (at the dark's own size), for the checks. */
  private litLast = { lit: 0, of: 0, lights: 0 };

  constructor(private readonly host: MoreHost) {
    // (the test room's words, `next dev` only: in a production build the address says nothing to this, and the day is Bangkok's)
    const dev = process.env.NODE_ENV === "development";
    const q = new URLSearchParams(dev ? location.search : "");
    // how much of the bridge there is, and whether it is opened
    if (q.has("townBridge")) { const n = Number(q.get("townBridge")); if (Number.isFinite(n)) setBridge(n, q.get("townBridgeOpen") !== "0"); }
    else if (q.get("townBridgeOpen") === "0") setBridge(BRIDGE.spans, false);
    // the day whose cave it is: Bangkok's, counted from 1970; or the one asked for
    const day = Number(q.get("townCaveDay"));
    setCaveDay(q.has("townCaveDay") && Number.isFinite(day) ? Math.floor(day) : Math.floor((Date.now() + 7 * 3_600_000) / 86_400_000));
    if (q.get("townSample") === "1") setSample(true);
    this.wanted = q.get("townAt");
    if (dev) (window as unknown as { __townMore?: unknown }).__townMore = {
      /** Where I am, as this sees it; how much of the bridge there is; and what the dark last left lit. */
      state: () => ({ floor: this.floor, bridge: { spans: BRIDGE.spans, open: BRIDGE.open }, lit: { ...this.litLast }, seen: Object.fromEntries([...this.seen].map(([n, tiles]) => [n, tiles.reduce((sum, t) => sum + t, 0)])) }),
      /** What can be tapped on the screen this frame, each with its middle. */
      hits: () => this.hits.map((h) => ({ ...h.tap, art: h.art, x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2, foot: h.y1 })),
      /** The places `&townAt=` knows, and going to one now. */
      places: () => Object.keys(this.places()),
      go: (name: string) => this.go(name),
      /** Where things are, for whoever checks: a cave floor's ladders today, the mountain's own, the bridge, the blacksmith. */
      spots: (n: number) => caveSpots(n),
      rocks: (n: number) => caveRocks(n),
      world: () => ({ mountain: MOUNTAIN, at: MOUNTAIN_AT, cave: CAVE, bridge: { foot: BRIDGE.foot, tiles: BRIDGE.tiles }, smith: SMITH }),
      setTreeLook, setTreeLooks, setAncientLook, setRockStands, setCaveRockStands, setCaveLight, setTorches, setKnownWhole, setSample, registerTap, setCrystalRock, setCaveWay,
      way: (n: number) => caveWay(n),
    };
  }

  close() { delete (window as unknown as { __townMore?: unknown }).__townMore; }

  /* ── where the address can put me ── */

  /** The places `&townAt=` knows: each a tile to stand on. */
  private places(): Record<string, [number, number]> {
    const M = MOUNTAIN, to = GATES.find((g) => g.from === "town" && g.leads === "mountain")?.to;
    const out: Record<string, [number, number]> = {
      bridge: [12, 29], smith: [Math.floor(SMITH.at.x), Math.floor(SMITH.at.y) + 2],
      foot: to ? [Math.floor(to.x), Math.floor(to.y)] : [M.x + 68, M.y + 29],
      camp: [M.x + 65, M.y + 39], mouth: [MOUNTAIN_AT.mouth.x + 3, MOUNTAIN_AT.mouth.y],
      slope: [M.x + 47, M.y + 17], cedar: [MOUNTAIN_AT.cedar.x + 3, MOUNTAIN_AT.cedar.y + 4], upper: [M.x + 25, M.y + 28],
      summit: [M.x + 9, M.y + 30], lookout: [MOUNTAIN_AT.lookout.x + 3, MOUNTAIN_AT.lookout.y + 1],
    };
    for (const n of CAVE.laid) out[`cave${n}`] = caveSpots(n).arrive;
    return out;
  }
  private go(name: string): boolean {
    const at = this.places()[name];
    if (!at) return false;
    // (the tile itself, or the nearest one beside it that can be stood on)
    for (let far = 0; far <= 3; far++) for (let dy = -far; dy <= far; dy++) for (let dx = -far; dx <= far; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === far && walkable(at[0] + dx, at[1] + dy)) return this.host.warp(at[0] + dx, at[1] + dy);
    }
    return false;
  }

  /* ── every frame ── */

  /**
   * Before a frame is drawn: whether I have come to another floor of the cave since the last one. The camera is to
   * be put on me at once then, as through a gate (its bounds are this floor's from now on).
   */
  moved(me: { x: number; y: number } | null): boolean {
    if (this.wanted && me) { const name = this.wanted; this.wanted = null; this.go(name); }
    const n = me ? floorOf(me.x, me.y) : 0;
    if (n === this.floor) return false;
    this.floor = n;
    if (n) BOUNDS.cave = floorBounds(n);
    return n > 0;
  }

  /** What stands on the map I am on, handed to the map to be drawn back to front with everything else. */
  things(f: MoreFrame) {
    this.hits = [];
    if (!f.scenery) return;
    if (f.place === "town") { if (f.me && f.me.y - f.me.x > 14) loadMore("mountain", f.now); this.town(f); }
    else if (f.place === "mountain") { loadMore("mountain", f.now); if (f.me && f.me.x < MOUNTAIN_AT.mouth.x + 12) loadMore("cave", f.now); this.mountain(f); }
    else if (f.place === "cave") { loadMore("cave", f.now); loadMore("mountain", f.now); this.cave(f); }
  }

  /** A prop at its tile, drawn at its own size, and where it is on the screen (for taps). */
  private stand(f: MoreFrame, name: string, at: Vec, depth: number, more?: { tap?: Tapped; hit?: [number, number]; mirror?: boolean; skew?: number; faint?: boolean; scale?: number; after?: (c: Vec, k: number) => void }) {
    const scenery = f.scenery!;
    if (!scenery.has(name)) return;
    const c = f.project(at);
    if (!f.onScreen(c)) return;
    const k = f.s * kOf(name) * (more?.scale ?? 1), [w, h] = scenery.sizeOf(name), [ax, ay] = scenery.anchorOf(name);
    f.things.push({ depth, draw: () => {
      // (whatever tall stands in front of me is drawn faint, so that nobody is lost to their own sight among the trees)
      const me = more?.faint && f.me ? { at: f.project(f.me), depth: f.me.x + f.me.y } : null;
      const dim = !!me && depth > me.depth && h * k > 60 * f.s && Math.abs(c.x - me.at.x) < (w / 2) * k && c.y - h * k < me.at.y - 12 * f.s;
      if (dim) f.ctx.globalAlpha = 0.38;
      scenery.drawProp(f.ctx, name, c.x, c.y, k, f.dpr, 0, !!more?.mirror, more?.skew ?? 0);
      if (dim) f.ctx.globalAlpha = 1;
      more?.after?.(c, k);
      if (more?.tap) {
        // (the lower part of a tall thing: a tap on a tree's crown is for what stands behind it)
        const [wide, tall] = more.hit ?? [1, 1], left = more.mirror ? c.x - (w - ax) * k : c.x - ax * k, bottom = c.y + (h - ay) * k;
        this.hits.push({ x0: left + (w * k * (1 - wide)) / 2, x1: left + w * k - (w * k * (1 - wide)) / 2, y0: bottom - h * k * tall, y1: bottom, depth, tap: more.tap, art: name });
      }
    } });
  }
  /** A bench, where it is on the screen (a little larger), for a tap to sit on it. */
  private seat(f: MoreFrame, p: Prop, name: string, c: Vec, k: number, mirror = false) {
    const [w, h] = f.scenery!.sizeOf(name), [ax, ay] = f.scenery!.anchorOf(name), pad = 8, left = mirror ? c.x - (w - ax) * k : c.x - ax * k;
    f.benches.push({ i: f.benchOf(p), x0: left - pad, y0: c.y - ay * k - pad, x1: left + w * k + pad, y1: c.y + (h - ay) * k + pad, depth: p.x + p.y });
  }
  /** Things that only stand there, from a list of props: each at its tile, as its kind's picture. */
  private scatter(f: MoreFrame, props: readonly Prop[], faint = false) {
    const scenery = f.scenery!;
    for (const p of props) {
      const name = p.kind === "mrock" ? `mrock${p.look ?? 0}` : p.kind === "boulder" && !scenery.has("boulder") ? "rock" : p.kind;
      if (p.kind === "flowers") continue;
      this.stand(f, name, { x: p.x + 0.5, y: p.y + 0.62 }, p.x + p.y + 1, { skew: f.sway(p), faint });
    }
  }

  /* ── the town: the bridge, the blacksmith, and the mountains beyond the west gate ── */

  private town(f: MoreFrame) {
    const scenery = f.scenery!, { s } = f;
    // The bridge, as much of it as is laid: so many spans of the whole one from the town's bank outwards, and the
    // bare frame of the next. Its floor lies under whoever walks on it; its near rail and what is under that are
    // drawn again before them.
    if (BRIDGE.spans > 0 && scenery.has("bridge")) {
      const [a, b] = BRIDGE.ends, mid = f.project({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      if (f.onScreen(mid)) {
        const A = BRIDGE_ART, foot = { x: mid.x, y: mid.y - ((A.far + A.near) / 2) * s }, span = (A.right - A.left) / BRIDGE.tiles.length, whole = BRIDGE.spans >= BRIDGE.tiles.length;
        /** A span's part of a picture, the town's first (the right end of the picture): all of it, or what is above or below the near rail. */
        const part = (name: string, i: number, rows: readonly [number, number]) =>
          drawSlice(f, name, foot.x, foot.y, [i === BRIDGE.tiles.length - 1 ? -1e4 : A.right - span * (i + 1), rows[0], i === 0 ? 1e4 : A.right - span * i, rows[1]]);
        const laid = (rows: readonly [number, number]) => {
          for (let i = 0; i < BRIDGE.spans; i++) part("bridge", i, rows);
          if (!whole && scenery.has("bridgeFrame")) part("bridgeFrame", BRIDGE.spans, rows);
        };
        const row = a.x + a.y;
        f.things.push({ depth: row - 2.1, draw: () => laid([-1e4, A.near]) });
        f.things.push({ depth: row + 1.02, draw: () => laid([A.near, 1e4]) });
        if (!whole) {
          // being built: a popoto nailing the last span laid, stopping now and then to wipe its brow
          const t = f.still ? 0 : f.now, at = { x: foot.x + (A.right - span * (BRIDGE.spans - 0.45)) * s, y: mid.y + 6 * s };
          if (scenery.has("rush_h1")) f.things.push({ depth: row + 0.5, draw: () =>
            scenery.drawProp(f.ctx, t % 5200 > 4300 ? "rush_wipe" : `rush_h${1 + (Math.floor(t / 130) % 2)}`, at.x, at.y, s * 1.2, f.dpr) });
          f.signs.push(() => f.label(f.th ? "สะพาน · กำลังสร้าง" : "Bridge · being built", foot.x + (A.right - span * BRIDGE.spans * 0.5) * s, mid.y - 78 * s, true));
        }
      }
    }
    // The blacksmith: his forge with its fire, the post his sign hangs from, the notice board, and himself at the
    // anvil, going through a little round of his own by the clock.
    if (scenery.has("forge") && scenery.has("sm_stand")) {
      const stand = f.project(SMITH.stand), at = f.project(SMITH.at);
      if (f.onScreen(stand)) {
        this.stand(f, "smithsign", SMITH.sign, SMITH.sign.x + SMITH.sign.y);
        this.stand(f, "smithboard", SMITH.board, SMITH.board.x + SMITH.board.y);
        f.things.push({ depth: SMITH.stand.x + SMITH.stand.y, draw: () => {
          scenery.drawProp(f.ctx, "forge", stand.x, stand.y, s, f.dpr);
          f.flames(stand.x + SMITH.fire[0] * s, stand.y - (SMITH.fire[1] - 5) * s, s * 0.55);
        } });
        // mostly standing; now and then three strokes at the anvil, and a wipe of the brow
        const beat = f.still ? 0 : Math.floor(f.now / 320) % 30;
        const frame = beat >= 6 && beat < 12 ? (beat % 2 ? "sm_hit" : "sm_up") : beat === 20 || beat === 21 ? "sm_wipe" : "sm_stand";
        f.things.push({ depth: SMITH.at.x + SMITH.at.y, draw: () => {
          const size = s * SMITH_K;
          scenery.drawProp(f.ctx, frame, at.x, at.y, size, f.dpr);
          // a tap on him or on his forge opens a talk
          const [fw, fh] = scenery.sizeOf("sm_stand"), [sw, sh] = scenery.sizeOf("forge");
          f.keepers.push({ id: SMITH.id, x0: Math.min(at.x - (fw / 2) * size, stand.x - (sw / 2) * s), y0: Math.min(at.y - fh * size, stand.y - sh * s), x1: Math.max(at.x + (fw / 2) * size, stand.x + (sw / 2) * s), y1: Math.max(at.y, stand.y) });
          f.signs.push(() => f.label(f.th ? SMITH_WHO.name.th : "The blacksmith", at.x, at.y - fh * size - 10));
        } });
      }
    }
    // Beyond the west gate: pines thinning into rock, and the peaks behind them.
    this.scatter(f, BEYOND_MORE_PROPS.west);
    this.peaks(f);
  }
  /** The far peaks: each a big picture, further back the higher its foot is on the screen. */
  private peaks(f: MoreFrame) {
    for (const p of PEAKS) {
      const name = `peak${p.art}`;
      if (!f.scenery!.has(name)) continue;
      const c = f.project(p), k = f.s * p.k, [w, h] = f.scenery!.sizeOf(name);
      if (c.x + (w / 2) * k < 0 || c.x - (w / 2) * k > f.cw || c.y < 0 || c.y - h * k > f.ch) continue;
      f.things.push({ depth: p.x + p.y - 40, draw: () => f.scenery!.drawProp(f.ctx, name, c.x, c.y, k, f.dpr, 0, !!p.mirror) });
    }
  }

  /* ── the mountain's foot ── */

  private mountain(f: MoreFrame) {
    const scenery = f.scenery!, { s } = f;
    // flowers lie flat: under whoever walks over them
    for (const p of MOUNTAIN_PROPS) if (p.kind === "flowers") { const c = f.project({ x: p.x + 0.5, y: p.y + 0.62 }); if (f.onScreen(c)) scenery.drawProp(f.ctx, "flowers", c.x, c.y, s, f.dpr); }
    // the lookout's deck lies flat too, and is walked on
    const L = MOUNTAIN_AT.lookout, deck = f.project({ x: L.x + L.w / 2 + 0.35, y: L.y + L.h / 2 + 0.35 });
    if (scenery.has("lookout") && f.onScreen(deck)) scenery.drawProp(f.ctx, "lookout", deck.x, deck.y + 30 * s, s * kOf("lookout"), f.dpr);
    for (const p of MOUNTAIN_PROPS) {
      const at = { x: p.x + 0.5, y: p.y + 0.62 }, depth = p.x + p.y + 1, tile: [number, number] = [p.x, p.y];
      if (p.kind === "flowers") continue;
      if (p.kind === "mtree") {
        // a tree as whoever keeps the game says it looks; grown, with nothing said
        const look = treeLook(p.id!);
        this.stand(f, `mt${p.tier}_${look}`, at, depth, { faint: true, scale: look === 3 ? treeScales.get(p.id!) ?? 1 : 1, skew: look >= 2 ? f.sway({ kind: "pine", x: p.x, y: p.y }) * (p.tier === 1 ? 1 : 0.7) : 0, tap: { kind: "tree", id: p.id!, floor: 0, tile }, hit: look === 3 ? [0.6, 0.5] : look === 2 ? [0.8, 0.7] : [1, 1] });
      } else if (p.kind === "mrock") {
        // a rock that still stands; the rubble of one that does not
        const stands = rockStands(p.id!);
        this.stand(f, stands ? `mrock${p.look}` : "rubble", at, depth, stands ? { tap: { kind: "rock", id: p.id!, floor: 0, tile } } : undefined);
      } else if (p.kind === "campfire") {
        this.stand(f, "campfire", at, depth, { after: (c) => f.flames(c.x, c.y - 7 * s, s) });
      } else if (p.kind === "logseat") {
        this.stand(f, "logseat", at, depth, { after: (c, k) => this.seat(f, p, "logseat", c, k) });
      } else if (p.kind === "bench") {
        // (the lookout's: sat on with one's back to the map)
        const back = p.facing === "NE" || p.facing === "NW", mirror = p.facing === "SW" || p.facing === "NW", name = back ? "bench_back" : "bench";
        this.stand(f, name, at, depth, { mirror, after: (c, k) => this.seat(f, p, name, c, k, mirror) });
      } else if (p.kind === "storebox") {
        this.stand(f, "storebox", at, depth, { tap: { kind: "chest", id: -1, floor: 0, tile } });
      } else {
        const name = p.kind === "boulder" && !scenery.has("boulder") ? "rock" : p.kind;
        this.stand(f, name, at, depth, { faint: true, skew: f.sway(p) });
      }
    }
    // the ancient cedar, over its three tiles by three: grown, or its great stump once it is felled (its own picture,
    // stood where the tree stands; a pine's stump drawn large until that picture has come)
    const C = MOUNTAIN_AT.cedar, cedarAt = { x: C.x + C.w - 0.6, y: C.y + C.h - 0.6 }, cedarTap: Tapped = { kind: "ancient", id: -1, floor: 0, tile: [C.x + 1, C.y + 1] };
    if (ancientLook === 3) this.stand(f, "ancient", cedarAt, C.x + C.y + C.w + C.h - 1, { faint: true, tap: cedarTap, hit: [0.5, 0.45] });
    else this.stand(f, scenery.has("ancientStump") ? "ancientStump" : "mt1_0", cedarAt, C.x + C.y + C.w + C.h - 1, { tap: cedarTap });
    // the lookout's flag, at its far corner
    this.stand(f, "flagpole", { x: L.x + 0.3, y: L.y + 0.4 }, L.x + L.y + 0.7);
    // the mine's mouth, on the cliff's face behind its threshold
    const M = MOUNTAIN_AT.mouth;
    this.stand(f, "mouth", { x: M.x, y: M.y }, M.x + M.y - 0.6, { tap: { kind: "mouth", id: -1, floor: 0, tile: MOUNTAIN_AT.mouthTiles[1] } });
    // beyond its edges: the low country it is come up from, and the peaks beyond its summit
    this.scatter(f, BEYOND_MORE_PROPS.low);
    this.scatter(f, BEYOND_MORE_PROPS.high);
    this.peaks(f);
  }

  /* ── a floor of the cave ── */

  private cave(f: MoreFrame) {
    const n = f.me ? floorOf(f.me.x, f.me.y) : 0;
    if (!n) return;
    const spots = caveSpots(n), floor = caveToday(n), { s } = f, mid = ([x, y]: [number, number]): Vec => ({ x: x + 0.5, y: y + 0.62 });
    // the way down, where whoever keeps the game says it is (the layout's own with nothing said; none at all until it is found)
    const way = caveWay(n);
    for (const r of caveRocks(n)) {
      // (the way down stands where its rock stood: neither that rock nor its rubble is under the ladder)
      if (way && way[0] === r.x && way[1] === r.y) continue;
      const stands = caveRockStands(n, r.id);
      this.stand(f, stands ? (hasCrystals(n, r) ? "mcrystal" : `mrock${plainLook(r)}`) : "rubble", mid([r.x, r.y]), r.x + r.y + 1, stands ? { tap: { kind: "caveRock", id: r.id, floor: n, tile: [r.x, r.y] } } : undefined);
    }
    // the ladder one came down by, against the rock at the back of its chamber (whoever steps to it is drawn before it), and the way down
    this.stand(f, "ladderUp", { x: spots.up[0] + 0.35, y: spots.up[1] + 0.35 }, spots.up[0] + spots.up[1] + 0.2, { tap: { kind: "ladderUp", id: -1, floor: n, tile: spots.up } });
    if (way) this.stand(f, "ladderDown", { x: way[0] + 0.5, y: way[1] + 0.8 }, way[0] + way[1] + 0.1, { tap: { kind: "ladderDown", id: -1, floor: n, tile: way } });
    // a resting floor: its fire, the logs round it, and its lift
    if (floor.rest && spots.fire && spots.lift) {
      this.stand(f, "campfire", mid(spots.fire), spots.fire[0] + spots.fire[1] + 1, { after: (c) => f.flames(c.x, c.y - 7 * s, s) });
      for (const p of CAVE_SEATS) if (floorOf(p.x, p.y) === n) this.stand(f, "logseat", mid([p.x, p.y]), p.x + p.y + 1, { after: (c, k) => this.seat(f, p, "logseat", c, k) });
      this.stand(f, "lift", { x: spots.lift[0] + 0.5, y: spots.lift[1] + 0.7 }, spots.lift[0] + spots.lift[1] + 1, { tap: { kind: "lift", id: -1, floor: n, tile: spots.liftAt ?? spots.lift } });
    }
    // torches set down, each burning
    for (const t of torches.get(n) ?? []) {
      const c0 = floorCorner(n);
      this.stand(f, "torch", { x: c0.x + t.u, y: c0.y + t.v + 0.12 }, c0.x + t.u + c0.y + t.v);
    }
  }

  /** The lights of these maps, added after the sky has had its say: the forge's fire and the bridge's lanterns, the camp's fire and the mouth's lantern. */
  lights(f: MoreFrame) {
    const { s, ctx } = f, flicker = f.still ? 0.92 : 0.9 + 0.06 * Math.sin(f.now / 760) + 0.04 * Math.sin(f.now / 430 + 1.3);
    if (f.place !== "town" && f.place !== "mountain") return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (f.place === "town") {
      const stand = f.project(SMITH.stand);
      if (f.onScreen(stand) && f.scenery?.has("forge")) {
        // faint by day, warm at night, as the cooking yard's fire is
        const lit = (0.14 + 0.86 * f.lamps) * flicker, x = stand.x + SMITH.fire[0] * s, y = stand.y - SMITH.fire[1] * s;
        f.glow(x, y, 40 * s, "255,150,70", 0.5 * lit);
        f.glow(x, y - 4 * s, 110 * s, "255,170,90", 0.3 * lit);
        f.glow(x + 14 * s, stand.y + 8 * s, 190 * s, "255,150,70", 0.2 * lit, 0.5);
      }
      if (BRIDGE.spans >= BRIDGE.tiles.length && f.lamps > 0.02 && f.scenery?.has("bridge")) {
        const [a, b] = BRIDGE.ends, mid = f.project({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), foot = mid.y - ((BRIDGE_ART.far + BRIDGE_ART.near) / 2) * s;
        if (f.onScreen(mid)) for (const [x, up] of BRIDGE_ART.lanterns) {
          f.glow(mid.x + x * s, foot - up * s, 30 * s, "255,214,150", 0.55 * f.lamps);
          f.glow(mid.x + x * s, foot - (up - 40) * s, 80 * s, "255,190,120", 0.2 * f.lamps, 0.6);
        }
      }
    } else {
      const fire = MOUNTAIN_PROPS.find((p) => p.kind === "campfire");
      const at = fire && f.project({ x: fire.x + 0.5, y: fire.y + 0.62 });
      if (at && f.onScreen(at)) {
        const lit = (0.15 + 0.85 * f.lamps) * flicker;
        f.glow(at.x, at.y - 14 * s, 150 * s, "255,170,90", 0.5 * lit);
        f.glow(at.x, at.y + 6 * s, 330 * s, "255,150,70", 0.2 * lit, 0.5);
      }
      const mouth = f.project(MOUNTAIN_AT.mouth);
      if (f.onScreen(mouth) && f.scenery?.has("mouth")) f.glow(mouth.x, mouth.y - 52 * s, 36 * s, "255,200,130", (0.2 + 0.5 * f.lamps) * flicker);
    }
    ctx.restore();
  }

  /**
   * The cave's dark, laid over everything: black, but for a pool of light about every light there is. One sees two
   * tiles about one's own doll, and everybody's light adds up: whoever stands near lights their own ground on my
   * screen too. The lamp on the ladder one came down by lights three, a resting floor's fire and a torch four.
   * Then the lamps' own warmth, and the small map of the floor in a corner, filled in as it is walked.
   */
  darkness(f: MoreFrame) {
    if (f.place !== "cave" || !f.me) return;
    const n = floorOf(f.me.x, f.me.y);
    if (!n) return;
    const floor = caveToday(n), corner = floorCorner(n), { ctx, s, cw, ch } = f;
    const mine = { u: f.me.x - corner.x, v: f.me.y - corner.y, r: lightOf(f.me.id) };
    const walkers = [mine, ...f.others.filter((o) => floorOf(o.x, o.y) === n).map((o) => ({ u: o.x - corner.x, v: o.y - corner.y, r: lightOf(o.id) }))];
    // (the lights in their order: the floor's own, the walkers', the torches set down, and last the lights with nothing drawn)
    const set = torches.get(n) ?? [], pale = glows.get(n) ?? [], lights = lightsOf(floor, walkers, [...set, ...pale]), fixed = lights.length - walkers.length - set.length - pale.length;

    // the dark: a black sheet at a third of the screen's size, each light's picture cut out of it
    const w = Math.ceil(cw / DARK_SCALE), h = Math.ceil(ch / DARK_SCALE);
    this.dark ??= document.createElement("canvas");
    if (this.dark.width !== w || this.dark.height !== h) { this.dark.width = w; this.dark.height = h; }
    const g = this.dark.getContext("2d");
    if (g) {
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "destination-out";
      const pic = holePicture(), ground = (TILE_W / 2) * Math.SQRT2 * s * HOLE_WIDER / DARK_SCALE;
      lights.forEach((l, i) => {
        const c = f.project({ x: corner.x + l.u, y: corner.y + l.v }), rx = l.r * ground, ry = rx * (TILE_H / TILE_W);
        if (c.x + rx * DARK_SCALE < -80 || c.x - rx * DARK_SCALE > cw + 80 || c.y + ry * DARK_SCALE < -120 || c.y - ry * DARK_SCALE > ch + 160) return;
        // its pool on the ground, as far as it reaches…
        g.drawImage(pic, c.x / DARK_SCALE - rx, c.y / DARK_SCALE - ry, rx * 2, ry * 2);
        // …and what stands in it: a walker's own doll, the ladder with its lamp, a fire
        if (i >= lights.length - pale.length) return;
        const walker = i >= fixed && i < fixed + walkers.length, tall = (walker ? DOLL * 0.62 : i === 0 ? 74 : 40) * s / DARK_SCALE, wide = Math.min(rx, (walker ? 46 : 60) * s / DARK_SCALE);
        g.drawImage(pic, c.x / DARK_SCALE - wide, c.y / DARK_SCALE - tall - wide * 0.9, wide * 2, wide * 1.8 + tall * 0.6);
      });
      // (how much of the screen it left lit, for whoever checks: a pixel of the dark's own that is more than half cut out)
      if (f.now - this.countedAt > 400) {
        this.countedAt = f.now;
        try {
          const d = g.getImageData(0, 0, w, h).data;
          let lit = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] < 128) lit++;
          this.litLast = { lit, of: w * h, lights: lights.length };
        } catch { /* a canvas that cannot be read back is not counted */ }
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.dark, 0, 0, w, h, 0, 0, w * DARK_SCALE, h * DARK_SCALE);
      // the warmth of what burns: the lamp on the ladder, a fire, a torch
      ctx.globalCompositeOperation = "lighter";
      const waver = f.still ? 0.94 : 0.92 + 0.05 * Math.sin(f.now / 900) + 0.03 * Math.sin(f.now / 370 + 0.8);
      lights.forEach((l, i) => {
        const c = f.project({ x: corner.x + l.u, y: corner.y + l.v }), up = i === 0 ? 70 : 24;
        // (a walker's own light is only a little warmth about them)
        if (i >= fixed && i < fixed + walkers.length) { f.glow(c.x, c.y - 26 * s, l.r * (TILE_W / 2) * 1.1 * s, "255,214,160", 0.13 * waver, 0.7); return; }
        // (a light with nothing burning in it: a pale pool on the ground, and no flame)
        if (i >= lights.length - pale.length) { f.glow(c.x, c.y - 6 * s, l.r * (TILE_W / 2) * 1.2 * s, "178,236,198", 0.1 * waver, 0.5); return; }
        f.glow(c.x - (i === 0 ? 14 * s : 0), c.y - up * s, 34 * s, "255,210,140", 0.5 * waver);
        f.glow(c.x, c.y - 6 * s, l.r * (TILE_W / 2) * 1.2 * s, "255,176,100", 0.16 * waver, 0.5);
      });
      ctx.restore();
    }

    // the small map: what my own light has reached, and any light that burns where I have come within reach of it
    let seen = this.seen.get(n);
    if (!seen) { seen = new Uint8Array(CAVE_SIZE * CAVE_SIZE); this.seen.set(n, seen); }
    reveal(seen, [mine, ...lights.filter((l, i) => (i < fixed || i >= fixed + walkers.length) && Math.hypot(l.u - mine.u, l.v - mine.v) <= l.r + mine.r)]);
    this.smallMap(f, n, seen, mine);
  }
  private countedAt = -1e9;

  /** The small map of a floor, in the screen's corner under the town's own badges: floor and rock as far as they have been seen, the two ladders once they have, and me. */
  private smallMap(f: MoreFrame, n: number, seen: Uint8Array, me: { u: number; v: number }) {
    const floor = caveToday(n), whole = knownWhole.has(n), cell = 4, W = CAVE_SIZE * cell * 2, H = CAVE_SIZE * cell;
    let count = 0;
    for (let i = 0; i < seen.length; i++) count += seen[i];
    const way = caveWay(n), corner = floorCorner(n), down: [number, number] | null = way ? [way[0] - corner.x, way[1] - corner.y] : null;
    const key = `${n}:${floor.day}:${whole ? "all" : count}:${caveDown.get(n)?.size ?? 0}:${down?.join(",") ?? "none"}:${crystal === undefined ? "" : crystal ? `${crystal.floor}.${crystal.id}` : "-"}`;
    if (!this.mapArt || this.mapArt.key !== key) {
      const canvas = this.mapArt?.canvas ?? document.createElement("canvas");
      canvas.width = W; canvas.height = H + cell;
      const g = canvas.getContext("2d");
      if (g) {
        g.clearRect(0, 0, canvas.width, canvas.height);
        // (each tile a little diamond, laid as the map itself lies on the screen)
        const put = (u: number, v: number, colour: string, size = 1) => {
          const x = W / 2 + (u - v) * cell, y = (u + v) * (cell / 2);
          g.fillStyle = colour;
          g.fillRect(Math.round(x - cell * size), Math.round(y), Math.round(cell * 2 * size), Math.round(cell * size));
        };
        for (let v = 0; v < CAVE_SIZE; v++) for (let u = 0; u < CAVE_SIZE; u++) {
          if (!whole && !seen[v * CAVE_SIZE + u]) continue;
          const kind = floor.open[v * CAVE_SIZE + u];
          put(u, v, kind === 0 ? "#3a3340" : "#b4946a");
        }
        const shown = (at: readonly [number, number]) => whole || seen[at[1] * CAVE_SIZE + at[0]] === 1;
        for (const r of floor.rocks) if (shown([r.u, r.v]) && caveRockStands(n, r.id) && !(down && down[0] === r.u && down[1] === r.v)) put(r.u, r.v, hasCrystals(n, r) ? "#9db8ff" : "#6f6a70", 0.7);
        if (floor.rest) { if (shown(floor.rest.fire)) put(floor.rest.fire[0], floor.rest.fire[1], "#ff9a3c"); if (shown(floor.rest.lift)) put(floor.rest.lift[0], floor.rest.lift[1], "#d9c08a"); }
        if (shown(floor.up)) put(floor.up[0], floor.up[1], "#ffe08a", 1.2);
        if (down && shown(down)) put(down[0], down[1], "#1b1620", 1.2);
      }
      this.mapArt = { canvas, key };
    }
    const { ctx } = f, pad = 8, x = 14, y = 132, phone = f.cw < 640, k = phone ? 0.75 : 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(15,19,25,0.78)";
    ctx.strokeStyle = "rgba(229,204,128,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, (W + pad * 2) * k, (H + cell + pad * 2) * k, 10);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(this.mapArt.canvas, x + pad * k, y + pad * k, W * k, (H + cell) * k);
    // me: a bright dot, on the tile I stand on
    const mx = x + (pad + W / 2 + (me.u - me.v) * cell) * k, my = y + (pad + (me.u + me.v) * (cell / 2)) * k;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(mx - 2), Math.round(my - 2), 4, 4);
    ctx.fillStyle = "#e5cc80";
    ctx.fillRect(Math.round(mx - 1), Math.round(my - 1), 2, 2);
    ctx.restore();
  }

  /* ── taps, talk, names ── */

  /** A tap on the map: handed to whoever asked for taps on what is under it, the thing in front first. Whether it was taken (otherwise it is a step, as anywhere). */
  tap(x: number, y: number): boolean {
    const under = this.hits.filter((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1).sort((a, b) => b.depth - a.depth);
    for (const h of under) {
      const fn = taps.get(h.tap.kind);
      if (fn && fn({ ...h.tap }) !== false) return true;
    }
    return false;
  }
  /** What a gateway of these maps is called, over it; nothing for a gateway that is not theirs. */
  gateName(g: { from: Place; leads: Place }, th: boolean): string | null {
    return g.leads === "mountain" ? (th ? "ไปตีนเขา" : "To the mountain") : null;
  }
  /** The blacksmith's next talk: his name and portrait, and what he says at this hour. */
  talk(hour: number): { as: { name: Line; job: Line; art: [string, string] }; lines: Line[] } {
    return { as: SMITH_WHO, lines: smithTalk(hour, this.smithTurn++) };
  }
  /** His one line while his forge is not open to me (no smith kept): no greeting and no choice. */
  closed(): { as: { name: Line; job: Line; art: [string, string] }; lines: Line[] } {
    return { as: SMITH_WHO, lines: [SMITH_CLOSED] };
  }
  /** His talk where his forge is open (whoever keeps the game has a smith): the greeting, and what he asks; the choices are the map's to add. */
  ask(hour: number): { as: { name: Line; job: Line; art: [string, string] }; lines: Line[] } {
    return { as: SMITH_WHO, lines: smithAsk(hour) };
  }
}

/** The art for the map to ask of: made once the map is there. */
export const openMore = (host: MoreHost) => new MountainArt(host);
