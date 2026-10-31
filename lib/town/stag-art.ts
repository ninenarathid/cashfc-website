import { loadScenery, type SceneryKit } from "./scenery";

/**
 * The moss stag's own pictures (the owner, 2026-10-31: "ช่วยปรับ กวางที่ขี่ได้ Gen ภาพมาใหม่ให้ดูดีขึ้น ภาพตอนวิ่ง หลายเฟรม
 * ตอนนี้มีแค่ เฟรมเดียว"): public/town/stag.json, the fc-cash-town skill's build-scenery.mjs `--set stag`, fetched the
 * first time a stag is drawn on any map. Named `stag_<SE|NE>_<run|walk|idle>_<i>`: SE faces the viewer to the lower right,
 * NE turns its back to the upper right, SW and NW are those mirrored.
 *
 * Every frame's point is the middle of the moss bed on its back, not its feet, so the body stays where it is from one
 * frame to the next and whoever rides, laid on that same point, stays on it whatever the legs are doing.
 */
export type StagGait = "run" | "walk" | "idle";

/** Map pixels to one of its own, a little finer than the dolls' 0.67 as the other animals are. */
export const STAG_K = 0.56;
/** How far up its moss is from the ground on the map, measured on the standing frames: 68 of its own pixels. */
export const STAG_SEAT = 38;

const RUN_FRAMES = 6, RUN_MS = 85;
const WALK_FRAMES = 4, WALK_MS = 170;
/** How much higher the whole stag and its rider are at each frame of the gallop, in map pixels: the push off, the stretch in the air, the landing. */
const RUN_LIFT: readonly number[] = [0, 1, 3, 2, 0, 0];
/** Whoever rides goes up with it and comes down a beat after it does: never off the moss (it is 12 of these thick), and not stiff on its back. */
const RIDER_LIFT: readonly number[] = [0, 1, 3, 4, 3, 1];
/** It stands quiet, and every so often lifts its head and pricks its ears. */
const IDLE_ROUND_MS = 4200, IDLE_LOOK_MS = 700;

/** The frame of a gait at a moment. */
export function stagFrame(gait: StagGait, now: number): number {
  if (gait === "run") return Math.floor(now / RUN_MS) % RUN_FRAMES;
  if (gait === "walk") return Math.floor(now / WALK_MS) % WALK_FRAMES;
  return now % IDLE_ROUND_MS < IDLE_LOOK_MS ? 1 : 0;
}
/** From behind, the gallop's first frame came out with its legs in a tangle: the last, as gathered, takes its turn too. */
const BACK_RUN: readonly number[] = [5, 1, 2, 3, 4, 5];
export const stagPicture = (gait: StagGait, back: boolean, now: number) => `stag_${back ? "NE" : "SE"}_${gait}_${back && gait === "run" ? BACK_RUN[stagFrame(gait, now)] : stagFrame(gait, now)}`;
/** How far its moss is lifted at a moment, in map pixels. */
export const stagLift = (gait: StagGait, now: number) => (gait === "run" ? RUN_LIFT[stagFrame(gait, now)] : 0);
/** How far its rider is lifted at a moment of the gallop, in map pixels. */
export const riderLift = (now: number) => RIDER_LIFT[stagFrame("run", now)];

/** The stag at its ground point: its shadow, and over it the frame of its gait with its moss at the seat. */
export function drawStag(ctx: CanvasRenderingContext2D, kit: SceneryKit, at: { x: number; y: number }, s: number, right: boolean, gait: StagGait, now: number, back: boolean, px = 1) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(at.x, at.y, 23 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
  kit.drawProp(ctx, stagPicture(gait, back, now), at.x, at.y - (STAG_SEAT + stagLift(gait, now)) * s, STAG_K * s, px, 0, !right);
}

let sheet: Promise<SceneryKit | null> | null = null;
/** The stag's sheet added to the town's scenery, as the pasture's are; null when it cannot be had (the icon stands in). */
export function loadStagArt(): Promise<SceneryKit | null> {
  sheet ??= (async () => {
    try {
      const into = await loadScenery();
      const r = await fetch("/town/stag.json");
      if (!r.ok) return null;
      const json = await r.json();
      const img = await new Promise<HTMLImageElement>((ok, no) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("stag picture did not load"));
        i.src = `/town/${json.image}`;
      });
      into.add(json, img);
      return into;
    } catch { return null; }
  })();
  return sheet;
}
