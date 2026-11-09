import { loadScenery, type SceneryKit } from "./scenery";
import { POP_MS, type LambColour, type Pt } from "./flock";

/**
 * The cloud ram's flock's pictures (lib/town/flock): public/town/flock.json, the fc-cash-town skill's build-scenery.mjs
 * `--set flock` (flock-frames.mjs), fetched the first time a ram is ridden on any map.
 *
 *   fl_big_<SE|NE>_stand, fl_big_<SE|NE>_walk_<0-5>         the owner's big ram (1.3 times the ram it was)
 *   fl_lamb_<w|c|p>_<SE|NE>_stand, _walk_<0-5>, _graze       a passenger's lamb: white, cream or pink
 *   fl_cloud_<SE|NE>_<0-5>                                    the magic ram's spell, a sheep-shaped cloud that floats
 *   fl_pop_<SE|NE>_<out|in>_<0-5>                             a lamb puffing out of the fleece, and jumping back in
 *   <a front view's frame>_head                               its head again, laid over its rider: the legs go behind it
 *   fl_full                                                   the full flock's icon
 *
 * SE faces the viewer to the lower right, NE turns its back to the upper right; SW and NW are those mirrored. A mount's
 * point is its feet on the ground, and `seat` (the json's) is where its rider's hips go against it, in its own pixels,
 * frame by frame (the specials kit's flock-seats.json): the rider stays in the saddle and rises and falls with the gait.
 * The order is the mount, its rider, then its head.
 */

/** Map pixels to one of its own: the live ram's own pixel size (its 1.05 times the pasture's 0.5 times its sheet's 0.959). */
export const FLOCK_K = 1.05 * 0.5 * 0.959;
/** Map pixels to one of a doll's (lib/town/pixeldoll's DOLL_PX). */
const DOLL_K = 0.67;
/** A sitting doll's hips against its point, in its own pixels, seen from the front and from behind (measured on its shorts). */
const HIPS = { front: [-6, -7], back: [3, -5] } as const;
const BIG_MS = 105, LAMB_MS = 88, CLOUD_MS = 150;

type FlockJson = Parameters<SceneryKit["add"]>[0] & { image: string; size: [number, number]; props: Record<string, number[]>; seat?: Record<string, [number, number]> };
let sheet: Promise<SceneryKit | null> | null = null;
let seats: Record<string, [number, number]> = {};
let names = new Set<string>();
/** The flock's sheet added to the town's scenery, as the stag's is; null when it cannot be had (the ram it was stands in). */
export function loadFlockArt(): Promise<SceneryKit | null> {
  sheet ??= (async () => {
    try {
      const into = await loadScenery();
      const r = await fetch("/town/flock.json");
      if (!r.ok) return null;
      const json = await r.json() as FlockJson;
      const img = await new Promise<HTMLImageElement>((ok, no) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("flock picture did not load"));
        i.src = `/town/${json.image}`;
      });
      into.add(json, img);
      seats = json.seat ?? {};
      names = new Set(Object.keys(json.props));
      return into;
    } catch { return null; }
  })();
  return sheet;
}
/** Whether the sheet has a piece (a lamb's grazing, the back view's pops, are drawn later than the rest). */
export const flockHas = (name: string): boolean => names.has(name);
/** Where a mount's rider's hips go against its point, in its own pixels (y negative: up). */
export const seatOf = (name: string): readonly [number, number] => seats[name] ?? [0, 0];

const view = (back: boolean) => (back ? "NE" : "SE");
/** The big ram's picture: its six-step walk while it goes, its standing while it stands. */
export function bigPicture(back: boolean, moving: boolean, now: number): string {
  return moving ? `fl_big_${view(back)}_walk_${Math.floor(now / BIG_MS) % 6}` : `fl_big_${view(back)}_stand`;
}
/** A lamb's picture: its walk on its own beat, its standing, or its head down in the grass where that is drawn. */
export function lambPicture(colour: LambColour, back: boolean, moving: boolean, graze: boolean, now: number, beat: number): string {
  const v = `fl_lamb_${colour}_${view(back)}`;
  if (moving) return `${v}_walk_${Math.floor((now + beat) / LAMB_MS) % 6}`;
  return graze && names.has(`${v}_graze`) ? `${v}_graze` : `${v}_stand`;
}
/** The cloud: its bob, always, on its own beat. */
export const cloudPicture = (back: boolean, now: number, beat: number) => `fl_cloud_${view(back)}_${Math.floor((now + beat) / CLOUD_MS) % 6}`;
/** A pop's frame, `part` 0..1 through it: the back view's own where drawn, else the front's. */
export function popPicture(way: "out" | "in", back: boolean, part: number): string {
  const i = Math.min(5, Math.max(0, Math.floor(part * 6)));
  const own = `fl_pop_${view(back)}_${way}_${i}`;
  return names.has(own) ? own : `fl_pop_SE_${way}_${i}`;
}
export const popFrame = (start: number, now: number) => Math.min(1, Math.max(0, (now - start) / POP_MS));

/** A mount at its point on the screen, `s` the camera's zoom: its shadow, then its picture. */
export function drawMount(ctx: CanvasRenderingContext2D, kit: SceneryKit, name: string, at: Pt, s: number, right: boolean, px: number, shadow: [number, number, number]) {
  const [rx, ry, a] = shadow;
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(at.x, at.y, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.fill();
  kit.drawProp(ctx, name, at.x, at.y, FLOCK_K * s, px, 0, !right);
}
/** A front view's head laid again over its rider, where the frame has one. */
export function drawHead(ctx: CanvasRenderingContext2D, kit: SceneryKit, name: string, at: Pt, s: number, right: boolean, px: number) {
  if (names.has(`${name}_head`)) kit.drawProp(ctx, `${name}_head`, at.x, at.y, FLOCK_K * s, px, 0, !right);
}
/**
 * Where a mount's rider's doll is laid on the screen (its point), over the mount drawn at `at`: its hips on the seat. `back`
 * and `mirror` are the doll's own (as it is drawn: from behind, turned to the left).
 */
export function riderOn(name: string, at: Pt, s: number, right: boolean, back: boolean, mirror: boolean): Pt {
  const [sx, sy] = seatOf(name), [hx, hy] = HIPS[back ? "back" : "front"];
  return { x: at.x + (sx * (right ? 1 : -1) * FLOCK_K - hx * (mirror ? -1 : 1) * DOLL_K) * s, y: at.y + (sy * FLOCK_K - hy * DOLL_K) * s };
}
