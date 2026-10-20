import type { SceneryKit } from "@/lib/town/scenery";
import { drawIcon, type IconName } from "./TownIcon";
import type { Vec } from "@/lib/town/world";
import { BUILDING_FIT, POPOTO_FRAMES, PROP_K, animalSprite, pastureScale, shornSprite, type AnimalFrame, type ArtStage, type Facing } from "@/lib/town/pasture-art";

/**
 * The pasture drawn on the map: each thing by its picture in the pasture's sheet when the art piece has made it
 * (lib/town/pasture-art's names), and until then by a plain stand-in drawn here. **Every stand-in is temporary** and
 * marked `// ART:`; docs/plans/animals/ART-NEEDED.md lists what replaces each. The stand-ins keep the map's scale and
 * perspective (they are laid on the same tiles, projected the same way) so that layout and play can be judged now.
 */

/** A tile's point on the screen. */
export type Project = (t: Vec) => Vec;
/** What a breed looks like, for its stand-in: its body, a second colour (comb, bill, face, spots), and a mark of its own. */
const LOOK: Record<string, [body: string, accent: string, mark?: "spots" | "glow" | "stars" | "bands" | "flowers" | "horns" | "sheen" | "fluff"]> = {
  barnHen: ["#a5532b", "#d84a3a"], silkie: ["#f4f1ea", "#6b6b8a", "fluff"], araucana: ["#8a8f99", "#c47a4a"], marans: ["#2b2a2e", "#b8732f"],
  lanternHen: ["#e0a040", "#ffe9a0", "glow"], cloudHen: ["#f8fbff", "#cfe6ff", "fluff"], goldenHen: ["#e8c040", "#fff1a0", "glow"], pocketPhoenix: ["#e05a2a", "#ffcf4a", "glow"],
  puddleDuck: ["#f2f2ee", "#f0a030"], runner: ["#e8dcc0", "#f0a030"], cayuga: ["#1f2a24", "#3f7a52", "sheen"], mandarin: ["#e07a2a", "#7a3fa0", "bands"],
  raindropDuck: ["#a8d8f0", "#ffffff", "glow"], moonDuck: ["#eef0ff", "#c8d0ff", "glow"], paperboatDuck: ["#f6f1e2", "#c8b890", "bands"], littleLeviathan: ["#1f5f7a", "#4fc0c8", "sheen"],
  meadowSheep: ["#f2efe6", "#e8d8c0", "fluff"], shetland: ["#8a7560", "#5a4a3a", "fluff"], jacob: ["#f2efe6", "#2a2a2a", "horns"], valais: ["#f6f4ee", "#1a1a1a", "fluff"],
  dandelionLamb: ["#fff6c8", "#e8d060", "fluff"], rainbowSheep: ["#f4b0b0", "#7ad0f0", "bands"], starFleece: ["#26306a", "#fff6a0", "stars"], goldenFleece: ["#e8c040", "#fff1a0", "horns"],
  dairyCow: ["#f4f4f0", "#222226", "spots"], jersey: ["#c89a62", "#8a6034"], highland: ["#c8602a", "#8a3a1a", "horns"], brownSwiss: ["#8a7a6a", "#e8e0d4"],
  strawberryCow: ["#f4a8b8", "#f8e060", "spots"], cocoaCow: ["#5a3420", "#f0e0c0", "horns"], flowerCow: ["#f4f4f0", "#f08ab0", "flowers"], milkyWayCow: ["#1f2a5a", "#fff6c8", "stars"],
};
const YOUNG: Record<string, [string, string]> = { chicken: ["#f8e060", "#f0a030"], duck: ["#f8e070", "#f0a030"], sheep: ["#f4f0e8", "#3a3a3a"], cow: ["#d8b890", "#f4f0e8"] };
/** How long each kind is drawn, in the map's pixels, grown (a baby is about half, a young one three quarters): a cow longer than a member is wide, a hen at their knee. */
export const ANIMAL_LEN: Record<string, number> = { cow: 62, sheep: 44, chicken: 19, duck: 20 };
export const lengthOf = (species: string, stage: string) => (ANIMAL_LEN[species] ?? 24) * (stage === "adult" ? 1 : stage === "young" ? 0.74 : 0.55);
const SIZE = ANIMAL_LEN;
const BIRD = (sp: string) => sp === "chicken" || sp === "duck";
const facingOf = (right: boolean): Facing => (right ? "SE" : "SW");

export interface AnimalLook { species: string; breed: string; stage: ArtStage; pose: "walk" | "idle" | "eat" | "sleep" | "swim" | "happy"; right: boolean; shorn?: boolean }
/**
 * How large each kind's pictures are drawn: map pixels to one of the picture's own. Near the dolls' own (two thirds of
 * a map pixel, lib/town/pixeldoll's LALAFELL_SIZE), so that an animal's pixels are the size of the members' beside it,
 * and a grown hen stands a little under half a member's height, a cow nearly as tall as one.
 */
export const ANIMAL_K: Readonly<Record<string, number>> = { chicken: 0.6, duck: 0.6, sheep: 0.5, cow: 0.5 };
/** The map pixels to one of a picture's own: its kind's, times the picture's own share (lib/town/pasture-art's pastureScale). */
export const animalK = (species: string, name: string) => (ANIMAL_K[species] ?? 0.6) * pastureScale(name);
/**
 * The picture an animal is drawn with: the frame asked for, else the walk's first step for its second, else the animal
 * standing (a frame not drawn falls back to the animal, never to the stand-in). SE is the facing drawn; SW is SE
 * mirrored (ART-NEEDED: the page turns them by the way they go). Null while the sheet has no picture of the animal.
 */
export function animalPicture(kit: SceneryKit | null, a: Pick<AnimalLook, "species" | "breed" | "stage" | "shorn" | "right">, frame: AnimalFrame): { name: string; mirror: boolean } | null {
  if (!kit) return null;
  const want: AnimalFrame[] = [frame, ...(frame === "walk2" ? ["walk1" as const] : []), "idle"];
  const facing = facingOf(a.right);
  for (const f of want) {
    const own = a.shorn ? shornSprite(a.breed, facing, f) : animalSprite(a.species, a.breed, a.stage, facing, f);
    if (kit.has(own)) return { name: own, mirror: false };
    if (facing === "SW") {
      const se = a.shorn ? shornSprite(a.breed, "SE", f) : animalSprite(a.species, a.breed, a.stage, "SE", f);
      if (kit.has(se)) return { name: se, mirror: true };
    }
  }
  // (a shorn sheep with no picture of its own yet is the sheep)
  return a.shorn ? animalPicture(kit, { ...a, shorn: false }, frame) : null;
}
/** How large an animal is on the map at scale 1 (map pixels): its picture's, or its stand-in's. For taps, bubbles and cards. */
export function animalSize(kit: SceneryKit | null, a: Pick<AnimalLook, "species" | "breed" | "stage">): { w: number; h: number } {
  const p = animalPicture(kit, { ...a, right: true }, "idle");
  if (p && kit) { const [w, h] = kit.sizeOf(p.name), k = animalK(a.species, p.name); return { w: w * k, h: h * k }; }
  const len = lengthOf(a.species, a.stage);
  return { w: len, h: len * 0.9 };
}
/** An animal at its feet's point: its picture, or its stand-in. */
export function drawAnimal(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, a: AnimalLook, at: Vec, s: number, px: number, now: number, still: boolean) {
  const frame: AnimalFrame = a.pose === "walk" ? (still || Math.floor(now / 260) % 2 ? "walk1" : "walk2") : a.pose;
  const pic = animalPicture(kit, a, frame);
  if (pic && kit) {
    const k = s * animalK(a.species, pic.name), [w, h] = kit.sizeOf(pic.name);
    if (a.pose === "swim" && !pic.name.endsWith("_swim")) {
      // swimming with no picture of it: the animal standing, sunk to its middle (its feet under the water), and the
      // water's ring about it
      ctx.save();
      ctx.beginPath(); ctx.rect(at.x - w * k, at.y - h * k * 1.3, w * k * 2, h * k * 1.3); ctx.clip();
      kit.drawProp(ctx, pic.name, at.x, at.y + h * k * 0.3, k, px, 0, pic.mirror);
      ctx.restore();
    } else kit.drawProp(ctx, pic.name, at.x, at.y, k, px, 0, pic.mirror);
    if (a.pose === "swim") {
      const r = still ? 0 : Math.sin(now / 500);
      ctx.save(); ctx.strokeStyle = "rgba(225,245,255,0.7)"; ctx.lineWidth = Math.max(1, s * 0.8);
      ctx.beginPath(); ctx.ellipse(at.x, at.y - 1 * s, w * k * (0.55 + r * 0.04), 3 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (a.pose === "sleep" && !still) sleepZ(ctx, at, s, now, h * k / s);
    return;
  }
  // ART: a stand-in animal (body, head, legs in its breed's colours) until the pasture's sheet has `an_*` pictures.
  const len = lengthOf(a.species, a.stage), bird = BIRD(a.species);
  void SIZE;
  const [body, accent, mark] = a.stage === "baby" ? [...(YOUNG[a.species] ?? ["#ddd", "#999"]), undefined] as const : LOOK[a.breed] ?? ["#ddd", "#999"];
  const step = a.pose === "walk" && !still ? Math.sin(now / 130) : 0;
  ctx.save();
  ctx.translate(Math.round(at.x), Math.round(at.y));
  ctx.scale(s * (a.right ? 1 : -1), s);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(0, 0, len * 0.5, len * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  if (a.pose === "swim") {
    ctx.fillStyle = "rgba(225,245,255,0.55)";
    ctx.beginPath(); ctx.ellipse(0, 0, len * 0.62, len * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  const lying = a.pose === "sleep", legH = lying || a.pose === "swim" ? 0 : bird ? len * 0.22 : len * 0.28, h = bird ? len * 0.62 : len * 0.5;
  const cy = -legH - h / 2 + (lying ? h * 0.18 : 0) + (a.pose === "swim" ? h * 0.3 : 0);
  // legs
  if (legH > 0) {
    ctx.fillStyle = bird ? "#e89a3a" : a.species === "sheep" ? "#2a2a2a" : shade(body, -0.35);
    const legs = bird ? [-0.08, 0.1] : [-0.3, -0.16, 0.16, 0.3];
    legs.forEach((lx, i) => { const k = (i % 2 ? 1 : -1) * step; ctx.fillRect(len * lx - 0.8 + k * 0.9, -legH, bird ? 1.2 : 2.4, legH); });
  }
  // body
  ctx.fillStyle = body;
  if (mark === "fluff" || a.species === "sheep") {
    if (a.shorn) { ctx.beginPath(); ctx.ellipse(0, cy, len * 0.42, h * 0.42, 0, 0, Math.PI * 2); ctx.fill(); }
    else for (const [dx, dy, r] of [[-0.25, 0.05, 0.26], [0, -0.1, 0.3], [0.22, 0.04, 0.26], [-0.06, 0.16, 0.28], [0.12, 0.18, 0.24]]) { ctx.beginPath(); ctx.arc(len * dx, cy + h * dy, len * r, 0, Math.PI * 2); ctx.fill(); }
  } else { ctx.beginPath(); ctx.ellipse(0, cy, len * 0.48, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  // marks
  ctx.fillStyle = accent;
  if (mark === "spots" || mark === "stars" || mark === "flowers") for (const [dx, dy, r] of [[-0.2, -0.1, 0.09], [0.05, 0.12, 0.07], [0.18, -0.12, 0.06], [-0.05, -0.2, 0.05]]) { ctx.beginPath(); ctx.arc(len * dx, cy + h * dy, len * r * (mark === "stars" ? 0.55 : 1), 0, Math.PI * 2); ctx.fill(); }
  if (mark === "bands") for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#f0e060", "#7ad0f0", "#b080e0"][i]; ctx.fillRect(len * (-0.3 + i * 0.18), cy - h * 0.25, len * 0.08, h * 0.5); }
  if (mark === "sheen") { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(len * 0.05, cy - h * 0.15, len * 0.28, h * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  // head
  const hr = bird ? len * 0.2 : len * 0.17, hx = len * (bird ? 0.36 : 0.5), hy = cy - h * (bird ? 0.45 : 0.25) + (a.pose === "eat" ? h * 0.55 : 0) + (lying ? h * 0.25 : 0);
  ctx.fillStyle = a.species === "sheep" && a.stage !== "baby" ? accent : bird ? body : shade(body, a.species === "cow" ? -0.05 : 0);
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
  if (a.species === "chicken" && a.stage !== "baby") { ctx.fillStyle = "#d83a2a"; ctx.fillRect(hx - hr * 0.4, hy - hr * 1.45, hr * 0.8, hr * 0.6); }
  if (bird) { ctx.fillStyle = a.species === "duck" ? "#f0a030" : "#e8b030"; ctx.fillRect(hx + hr * 0.7, hy - hr * 0.15, hr * (a.species === "duck" ? 0.9 : 0.55), hr * 0.42); }
  if (!bird && a.stage !== "baby" && (mark === "horns" || a.species === "cow")) { ctx.fillStyle = mark === "horns" ? "#e8dcc0" : "#d8ccb0"; ctx.fillRect(hx - hr * 0.6, hy - hr * 1.3, hr * 0.3, hr * 0.55); ctx.fillRect(hx + hr * 0.2, hy - hr * 1.3, hr * 0.3, hr * 0.55); }
  if (mark === "glow" && !still) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(now / 400); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(-len * 0.4, cy, len * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  // eye: shut, asleep
  ctx.fillStyle = "#1a1410";
  if (lying) ctx.fillRect(hx + hr * 0.15, hy - hr * 0.1, hr * 0.5, Math.max(0.6, hr * 0.12)); else { ctx.beginPath(); ctx.arc(hx + hr * 0.35, hy - hr * 0.15, Math.max(0.7, hr * 0.16), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (lying && !still) sleepZ(ctx, at, s, now, h + legH);
}
/** A small "z" drifting up over a sleeper now and then (`tall`: how tall it lies, in map pixels). */
function sleepZ(ctx: CanvasRenderingContext2D, at: Vec, s: number, now: number, tall: number) {
  const f = ((now / 1600) + (at.x % 7) / 7) % 1;
  ctx.save(); ctx.globalAlpha = 0.7 * (1 - f); ctx.fillStyle = "#f3e3c3"; ctx.font = `700 ${Math.round(8 * s)}px sans-serif`; ctx.textAlign = "center";
  ctx.fillText("z", at.x + 6 * s, at.y - (tall + 6 + f * 10) * s); ctx.restore();
}

/** A colour made lighter (k > 0) or darker (k < 0). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * ART: a building's stand-in: a box on its tiles with a gabled roof, its door on the side that faces the lanes
 * (+y, the screen's lower left). `wall` and `roof` in the map's own pixels at scale 1.
 */
export function drawHouse(ctx: CanvasRenderingContext2D, project: Project, r: { x: number; y: number; w: number; h: number }, look: { wall: string; roof: string; trim: string; wallH: number; roofH: number; door: number; label?: string; windows?: number }, s: number) {
  const A = project({ x: r.x, y: r.y }), B = project({ x: r.x + r.w, y: r.y }), C = project({ x: r.x + r.w, y: r.y + r.h }), D = project({ x: r.x, y: r.y + r.h });
  const up = (p: Vec, k = look.wallH) => ({ x: p.x, y: p.y - k * s });
  const poly = (pts: Vec[], fill: string, stroke?: string) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, s); ctx.stroke(); } };
  ctx.save();
  // walls: the one along x (its face looks +y) and the one along y (its face looks +x)
  poly([D, C, up(C), up(D)], look.wall, look.trim);
  poly([C, B, up(B), up(C)], shade(look.wall, -0.22), look.trim);
  // boards
  ctx.strokeStyle = shade(look.wall, -0.18); ctx.lineWidth = Math.max(1, s * 0.6);
  for (let i = 1; i < 4; i++) { const k = (look.wallH * i) / 4; ctx.beginPath(); ctx.moveTo(D.x, D.y - k * s); ctx.lineTo(C.x, C.y - k * s); ctx.stroke(); }
  // the door, in the middle of the +y wall, and windows either side
  const mid = (a: Vec, b: Vec, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const d0 = mid(D, C, 0.5 - look.door / 2), d1 = mid(D, C, 0.5 + look.door / 2), dh = look.wallH * 0.68;
  poly([d0, d1, up(d1, dh), up(d0, dh)], shade(look.wall, -0.55), look.trim);
  ctx.strokeStyle = look.trim; ctx.beginPath(); ctx.moveTo(d0.x, d0.y - dh * s); ctx.lineTo(d1.x, d1.y); ctx.moveTo(d1.x, d1.y - dh * s); ctx.lineTo(d0.x, d0.y); ctx.stroke();
  for (let wv = 0; wv < (look.windows ?? 2); wv++) {
    const t = wv === 0 ? 0.18 : 0.82, w0 = mid(D, C, t - 0.05), w1 = mid(D, C, t + 0.05);
    poly([up(w0, look.wallH * 0.45), up(w1, look.wallH * 0.45), up(w1, look.wallH * 0.75), up(w0, look.wallH * 0.75)], "#f6d98a", look.trim);
  }
  // the roof: a ridge along x, raised
  const rA = up(mid(A, D, 0.5), look.wallH + look.roofH), rB = up(mid(B, C, 0.5), look.wallH + look.roofH);
  poly([up(A), up(B), rB, rA], shade(look.roof, -0.15), shade(look.roof, -0.45));
  poly([up(D), up(C), rB, rA], look.roof, shade(look.roof, -0.45));
  poly([up(C), up(B), rB], shade(look.wall, -0.1), look.trim);
  // shingles
  ctx.strokeStyle = shade(look.roof, -0.3); ctx.lineWidth = Math.max(1, s * 0.6);
  for (let i = 1; i < 4; i++) { const p0 = mid(up(D), rA, i / 4), p1 = mid(up(C), rB, i / 4); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  ctx.restore();
}

/** ART: a long low box on the ground (a trough, the making table, the nest's bed, the stall's counter). */
export function drawBlock(ctx: CanvasRenderingContext2D, project: Project, r: { x: number; y: number; w: number; h: number }, side: string, top: string, height: number, s: number) {
  const A = project({ x: r.x, y: r.y }), B = project({ x: r.x + r.w, y: r.y }), C = project({ x: r.x + r.w, y: r.y + r.h }), D = project({ x: r.x, y: r.y + r.h });
  const up = (p: Vec) => ({ x: p.x, y: p.y - height * s });
  const poly = (pts: Vec[], fill: string) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = shade(side, -0.45); ctx.lineWidth = Math.max(1, s * 0.7); ctx.stroke(); };
  poly([D, C, up(C), up(D)], side);
  poly([C, B, up(B), up(C)], shade(side, -0.2));
  poly([up(A), up(B), up(C), up(D)], top);
}

/** The middle between the gate's two posts' feet in each of its pictures (its own pixels), measured on them. */
const GATE_MID: Readonly<Record<string, readonly [number, number]>> = { pa_gateShut: [49, 78], pa_gateOpen: [53, 71] };
/** How large a meadow forage spot's plant stands, in map pixels at scale 1 (ART-NEEDED: about 16 to 20). */
const FORAGE_SIZE = 20;
/** Where the ox walks ahead of the wagon's point, in map pixels at scale 1 (its yoke at the shafts' ends; measured in the game). */
export const OX_AHEAD: readonly [number, number] = [34, 8];
/** A thing of the pasture's sheet at its own scale (PROP_K); false while the sheet has no picture of it. */
export function drawPastureProp(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, name: string, x: number, y: number, s: number, px = 1, mirror = false): boolean {
  if (!kit?.has(name)) return false;
  kit.drawProp(ctx, name, x, y, s * (PROP_K[name] ?? 0.67) * pastureScale(name), px, 0, mirror);
  return true;
}
/**
 * A building of the pasture on its footprint: its picture's front corner on the footprint's front corner, at the scale
 * that makes its walls' foot as wide as the footprint (lib/town/pasture-art's BUILDING_FIT); false while there is none.
 */
export function drawBuilding(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, project: Project, r: { x: number; y: number; w: number; h: number }, name: string, s: number, px = 1): boolean {
  const fit = BUILDING_FIT[name];
  if (!fit || !kit?.has(name)) return false;
  const C = project({ x: r.x + r.w, y: r.y + r.h }), k = s * ((r.w + r.h) * 32) / fit.base;
  kit.drawProp(ctx, name, C.x - fit.corner[0] * k, C.y - fit.corner[1] * k, k, px);
  return true;
}

/** ART: Uncle Popoto: the uncle's own frames stand in for his (a popoto in a farmer's straw hat is to be drawn). */
export function drawPopoto(ctx: CanvasRenderingContext2D, scenery: SceneryKit | null, kit: SceneryKit | null, at: Vec, s: number, px: number, beat: number) {
  const frame = POPOTO_FRAMES[beat === 3 ? 1 : beat === 7 || beat === 8 ? 2 : beat === 12 ? 3 : 0];
  if (kit?.has(frame)) { const k = s * (PROP_K[frame] ?? 0.8); kit.drawProp(ctx, frame, at.x, at.y, k, px); return { tall: kit.sizeOf(frame)[1] * k, w: kit.sizeOf(frame)[0] * k }; }
  const stand = ["un_stand", "un_wave", "un_show", "un_laugh"][POPOTO_FRAMES.indexOf(frame)];
  if (scenery?.has(stand)) {
    const k = s * 0.78;
    scenery.drawProp(ctx, stand, at.x, at.y, k, px);
    const [w, h] = scenery.sizeOf(stand), [, ay] = scenery.anchorOf(stand);
    // ART: his straw hat over the uncle's frames
    ctx.save(); ctx.fillStyle = "#e8c870"; ctx.strokeStyle = "#8a6a2a"; ctx.lineWidth = Math.max(1, s);
    const top = at.y - ay * k;
    ctx.beginPath(); ctx.ellipse(at.x, top + 5 * s, 15 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(at.x, top + 1 * s, 8 * s, 5 * s, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#c0503a"; ctx.fillRect(at.x - 8 * s, top + 1 * s, 16 * s, 2 * s);
    ctx.restore();
    return { tall: h * k, w: w * k };
  }
  return { tall: 40 * s, w: 24 * s };
}

/** ART: the cloud ram under its rider (and a passenger behind): a puff of cloud with a curled-horn head, stepping as it goes. */
export function drawRam(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, at: Vec, s: number, right: boolean, hop: number, now: number, moving: boolean, px = 1) {
  const name = moving ? (Math.floor(now / 200) % 2 ? "pa_ram_walk1" : "pa_ram_walk2") : "pa_ram_idle";
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(at.x, at.y, 22 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (kit?.has(name)) { kit.drawProp(ctx, name, at.x, at.y - hop, s * (PROP_K[name] ?? 0.5) * pastureScale(name), px, 0, !right); return; }
  ctx.save();
  ctx.translate(Math.round(at.x), Math.round(at.y - hop));
  ctx.scale(s * (right ? 1 : -1), s);
  ctx.fillStyle = "#3a3a44";
  for (const lx of [-12, -5, 6, 13]) ctx.fillRect(lx, -12 + (moving ? Math.sin(now / 110 + lx) * 1.5 : 0), 3, 12);
  ctx.fillStyle = "#f6f8ff";
  for (const [dx, dy, r] of [[-12, -20, 9], [-3, -24, 11], [8, -22, 10], [15, -18, 7], [-6, -15, 9], [6, -15, 9]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#dfe6ff";
  for (const [dx, dy, r] of [[-14, -16, 5], [10, -15, 5]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#4a4652"; ctx.beginPath(); ctx.ellipse(24, -26, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#e8d8a8"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(21, -29, 4.5, Math.PI * 0.2, Math.PI * 1.7); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.fillRect(25, -28, 2, 2);
  ctx.restore();
}

/** ART: the hay wagon and its ox, at the wagon's point (the bed's middle), the ox ahead the way it goes. */
export function drawWagon(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, at: Vec, s: number, right: boolean, now: number, moving: boolean, px = 1) {
  if (kit?.has("pa_wagon")) {
    kit.drawProp(ctx, "pa_wagon", at.x, at.y, s * (PROP_K.pa_wagon ?? 0.5), px, 0, !right);
    const ox = moving ? (Math.floor(now / 300) % 2 ? "pa_ox_walk1" : "pa_ox_walk2") : "pa_ox_idle";
    if (kit.has(ox)) kit.drawProp(ctx, ox, at.x + (right ? OX_AHEAD[0] : -OX_AHEAD[0]) * s, at.y + OX_AHEAD[1] * s, s * (PROP_K[ox] ?? 0.5) * pastureScale(ox), px, 0, !right);
    return;
  }
  ctx.save();
  ctx.translate(Math.round(at.x), Math.round(at.y));
  ctx.scale(s * (right ? 1 : -1), s);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(10, 4, 48, 11, 0, 0, Math.PI * 2); ctx.fill();
  // the ox, ahead
  const bob = moving ? Math.sin(now / 160) * 1.2 : 0;
  ctx.fillStyle = "#6a4a30"; for (const lx of [30, 36, 46, 52]) ctx.fillRect(lx, -10 + (moving ? Math.sin(now / 140 + lx) : 0), 3, 12);
  ctx.fillStyle = "#8a6440"; ctx.beginPath(); ctx.ellipse(41, -16 + bob, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7a5636"; ctx.beginPath(); ctx.arc(57, -21 + bob, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillRect(53, -29 + bob, 2, 4); ctx.fillRect(59, -29 + bob, 2, 4);
  // the yoke and shafts
  ctx.strokeStyle = "#5a3a20"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(36, -16); ctx.stroke();
  // wheels
  ctx.fillStyle = "#4a3020"; for (const wx of [-16, 10]) { ctx.beginPath(); ctx.arc(wx, -6, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#8a6a40"; ctx.beginPath(); ctx.arc(wx, -6, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#4a3020"; }
  // the bed and its hay
  ctx.fillStyle = "#9a6a3a"; ctx.fillRect(-24, -20, 42, 10);
  ctx.fillStyle = "#7a522a"; ctx.fillRect(-24, -12, 42, 2);
  ctx.fillStyle = "#e8c860"; ctx.beginPath(); ctx.ellipse(-3, -21, 20, 5, 0, Math.PI, 0); ctx.fill();
  ctx.restore();
}

/** ART: a little bubble over an animal: hungry (an empty bowl), ready (what it gives), a friend's hungry (a heart). */
export function drawBubble(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, kind: "hungry" | "ready" | "care", game: "eggs" | "milk" | "shear", x: number, y: number, s: number, now: number, still: boolean, px = 1) {
  const bob = still ? 0 : Math.sin(now / 300) * 1.5 * s;
  const name = kind === "hungry" ? "pa_bubbleHungry" : kind === "care" ? "pa_bubbleCare" : game === "milk" ? "pa_bubbleReadyMilk" : game === "shear" ? "pa_bubbleReadyWool" : "pa_bubbleReady";
  if (kit?.has(name)) { kit.drawProp(ctx, name, x, y + bob, s * (PROP_K[name] ?? 1), px); return; }
  const r = 8.5 * Math.max(0.85, s);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = kind === "ready" ? "#fff6d8" : "#f4f6fa";
  ctx.strokeStyle = kind === "ready" ? "#d4a02a" : kind === "care" ? "#d0607a" : "#8a96a8"; ctx.lineWidth = Math.max(1.2, s);
  ctx.beginPath(); ctx.arc(0, -r, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(0, 4); ctx.lineTo(3, -1); ctx.fill();
  const k = r / 8.5;
  if (kind === "hungry") { ctx.fillStyle = "#8a5a2a"; ctx.beginPath(); ctx.ellipse(0, -r + 2 * k, 5 * k, 3 * k, 0, 0, Math.PI); ctx.fill(); ctx.fillRect(-5 * k, -r + 1 * k, 10 * k, 1.5 * k); }
  else if (kind === "care") { ctx.fillStyle = "#e0607a"; ctx.beginPath(); ctx.arc(-2 * k, -r - 1 * k, 2.6 * k, 0, Math.PI * 2); ctx.arc(2 * k, -r - 1 * k, 2.6 * k, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4.6 * k, -r); ctx.lineTo(0, -r + 4.5 * k); ctx.lineTo(4.6 * k, -r); ctx.fill(); }
  else if (game === "eggs") { ctx.fillStyle = "#f0e2c8"; ctx.strokeStyle = "#a8865a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -r, 3.4 * k, 4.4 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (game === "milk") { ctx.fillStyle = "#fbfbf6"; ctx.strokeStyle = "#7a8aa0"; ctx.lineWidth = 1; ctx.fillRect(-2.8 * k, -r - 3 * k, 5.6 * k, 7 * k); ctx.strokeRect(-2.8 * k, -r - 3 * k, 5.6 * k, 7 * k); ctx.fillStyle = "#7a8aa0"; ctx.fillRect(-1.6 * k, -r - 5 * k, 3.2 * k, 2 * k); }
  else { ctx.fillStyle = "#fbf8ee"; for (const [dx, dy] of [[-2.5, 0.5], [0, -1.5], [2.5, 0.5], [0, 1.6]]) { ctx.beginPath(); ctx.arc(dx * k, -r + dy * k, 2.6 * k, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}

/** ART: an egg laid out on the meadow, with a glint for its owner under the herd bell. */
export function drawEggOut(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, at: Vec, s: number, glint: boolean, now: number, still: boolean, px = 1) {
  if (kit?.has("pa_eggOutside")) kit.drawProp(ctx, "pa_eggOutside", at.x, at.y, s * (PROP_K.pa_eggOutside ?? 0.45), px);
  else {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(at.x, at.y, 6 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a9a40"; for (const dx of [-6, -3, 4, 7]) ctx.fillRect(at.x + dx * s, at.y - 5 * s, 1.2 * s, 5 * s);
    ctx.fillStyle = "#f2e6cc"; ctx.strokeStyle = "#a88a5a"; ctx.lineWidth = Math.max(1, s * 0.8);
    ctx.beginPath(); ctx.ellipse(at.x - 1.5 * s, at.y - 3.5 * s, 3 * s, 4 * s, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(at.x + 2.5 * s, at.y - 3 * s, 2.6 * s, 3.5 * s, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (glint) {
    const a = still ? 0.8 : 0.4 + 0.4 * Math.sin(now / 220);
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#fff6b0"; ctx.lineWidth = Math.max(1, s);
    const cx = at.x + 4 * s, cy = at.y - 10 * s;
    ctx.beginPath(); ctx.moveTo(cx - 4 * s, cy); ctx.lineTo(cx + 4 * s, cy); ctx.moveTo(cx, cy - 4 * s); ctx.lineTo(cx, cy + 4 * s); ctx.stroke(); ctx.restore();
  }
}

/** ART: a forage spot of the meadow: a clump with a flower of its colour (plain grass once taken this band). */
export function drawForage(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, at: Vec, s: number, colour: string, taken: boolean, now: number, still: boolean, px = 1, icons: HTMLImageElement | null = null, item: string | null = null) {
  // what grows there this band is its own bag icon, a clump of the plant drawn to stand in the grass; once taken, a
  // tuft grazed short
  if (!taken && item && drawIcon(ctx, icons, item as IconName, at.x, at.y - FORAGE_SIZE * s * 0.45, FORAGE_SIZE * s)) return;
  const name = taken ? "pa_forageTaken" : "pa_forage";
  if (kit?.has(name)) { kit.drawProp(ctx, name, at.x, at.y, s * (PROP_K[name] ?? 0.45), px); return; }
  ctx.save();
  const sway = still ? 0 : Math.sin(now / 700 + at.x) * 1.2 * s;
  ctx.strokeStyle = taken ? "#5a7a3a" : "#4a8a30"; ctx.lineWidth = Math.max(1, 1.2 * s);
  for (const [dx, h] of [[-5, 8], [-2, 11], [1, 9], [4, 12], [6, 7]]) { ctx.beginPath(); ctx.moveTo(at.x + dx * s, at.y); ctx.lineTo(at.x + dx * s + sway, at.y - (taken ? h * 0.5 : h) * s); ctx.stroke(); }
  if (!taken) { ctx.fillStyle = colour; for (const [dx, h] of [[-2, 11], [4, 12]]) { ctx.beginPath(); ctx.arc(at.x + dx * s + sway, at.y - h * s, 2.4 * s, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}

/** ART: the village gate: two posts and a field gate of three bars, swung open toward the meadow, or shut across. */
export function drawGateArt(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, project: Project, g: { x: number; y: number; w: number }, open: boolean, s: number, px = 1) {
  const name = open ? "pa_gateOpen" : "pa_gateShut";
  const foot = project({ x: g.x + g.w / 2, y: g.y + 0.5 });
  // (drawn running from the lower left up to the upper right, as the town's fence; the gate runs down to the right:
  // mirrored. Both pictures stand by the middle between their two posts' feet, so the posts stay where they are as it opens)
  if (kit?.has(name)) {
    const k = s * (PROP_K[name] ?? 1), [ax, ay] = kit.anchorOf(name), [mx, my] = GATE_MID[name] ?? [ax, ay];
    kit.drawProp(ctx, name, foot.x + (mx - ax) * k, foot.y - (my - ay) * k, k, px, 0, true);
    return;
  }
  const L = project({ x: g.x - 0.1, y: g.y + 0.5 }), R = project({ x: g.x + g.w + 0.1, y: g.y + 0.5 });
  ctx.save();
  ctx.fillStyle = "#6a4a2a";
  for (const p of [L, R]) { ctx.fillRect(p.x - 2.5 * s, p.y - 26 * s, 5 * s, 26 * s); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(p.x - 3.5 * s, p.y - 28 * s, 7 * s, 3 * s); ctx.fillStyle = "#6a4a2a"; }
  ctx.strokeStyle = "#b08a5a"; ctx.lineWidth = Math.max(1.5, 2.5 * s);
  const bars = [8, 14, 20];
  if (!open) for (const b of bars) { ctx.beginPath(); ctx.moveTo(L.x, L.y - b * s); ctx.lineTo(R.x, R.y - b * s); ctx.stroke(); }
  else {
    // swung in, toward the meadow (up the screen, to the right)
    const hinge = L, tip = project({ x: g.x - 0.1, y: g.y - g.w + 0.5 });
    for (const b of bars) { ctx.beginPath(); ctx.moveTo(hinge.x, hinge.y - b * s); ctx.lineTo(tip.x, tip.y - b * s); ctx.stroke(); }
  }
  ctx.restore();
}
