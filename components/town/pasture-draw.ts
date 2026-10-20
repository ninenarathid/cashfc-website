import type { SceneryKit } from "@/lib/town/scenery";
import { drawIcon, type IconName } from "./TownIcon";
import type { Vec } from "@/lib/town/world";
import { BUILDING_FIT, PASTURE_ART, POPOTO_FRAMES, PROP_K, TROUGH_ART, TROUGH_FIT, animalFrame, pastureScale, type AnimalFrame, type ArtAction, type ArtStage, type Facing } from "@/lib/town/pasture-art";
import { TROUGH, troughOf } from "@/lib/town/pasture";

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

export interface AnimalLook {
  species: string; breed: string; stage: ArtStage; pose: "walk" | "idle" | "eat" | "sleep" | "swim" | "happy"; right: boolean; shorn?: boolean;
  /** A grown male (a rooster, a drake, a ram, a bull) has pictures of his own. */ sex?: "m" | "f";
  /** Its back to the viewer (going up the screen). */ back?: boolean;
  /** Its own offset of the loops' clock (from its id), so that a herd does not step as one. */ seed?: number;
}
/**
 * How large each kind's pictures are drawn: map pixels to one of the picture's own. Near the dolls' own (two thirds of
 * a map pixel, lib/town/pixeldoll's LALAFELL_SIZE), so that an animal's pixels are the size of the members' beside it,
 * and a grown hen stands a little under half a member's height, a cow nearly as tall as one.
 */
export const ANIMAL_K: Readonly<Record<string, number>> = { chicken: 0.6, duck: 0.6, sheep: 0.5, cow: 0.5 };
/** The map pixels to one of a picture's own: its kind's, times the picture's own share (lib/town/pasture-art's pastureScale). */
export const animalK = (species: string, name: string) => (ANIMAL_K[species] ?? 0.6) * pastureScale(name);
/** Which of the four ways it faces: SE and SW toward the viewer, NE and NW away; W the mirrored. */
const facingOf = (right: boolean, back = false): Facing => (back ? (right ? "NE" : "NW") : right ? "SE" : "SW");
/**
 * The picture an animal is drawn with (the art round's frames, lib/town/pasture-art's animalFrame: its own look or the
 * nearest, its view or the front, the loop's picture for the moment), or null while no sheet has it (its stand-in).
 */
export function animalPicture(kit: SceneryKit | null, a: Pick<AnimalLook, "species" | "breed" | "stage" | "shorn" | "right" | "sex" | "back">, frame: AnimalFrame | ArtAction, now = 0): { name: string; mirror: boolean } | null {
  const action: ArtAction = frame === "walk1" || frame === "walk2" ? "walk" : (frame as ArtAction);
  return animalFrame(kit, { species: a.species, breed: a.breed, stage: a.stage, sex: a.sex, shorn: a.shorn, facing: facingOf(a.right, a.back), action, now });
}
/** How large an animal is on the map at scale 1 (map pixels): its picture's, or its stand-in's. For taps, bubbles and cards. */
export function animalSize(kit: SceneryKit | null, a: Pick<AnimalLook, "species" | "breed" | "stage" | "sex">): { w: number; h: number } {
  const p = animalPicture(kit, { ...a, right: true }, "idle");
  if (p && kit) { const [w, h] = kit.sizeOf(p.name), k = animalK(a.species, p.name); return { w: w * k, h: h * k }; }
  const len = lengthOf(a.species, a.stage);
  return { w: len, h: len * 0.9 };
}
/** An animal at its feet's point: its picture (walking or standing, its loop by its own clock), or its stand-in. */
export function drawAnimal(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, a: AnimalLook, at: Vec, s: number, px: number, now: number, still: boolean) {
  const action: ArtAction = a.pose === "walk" ? "walk" : a.pose;
  const pic = animalPicture(kit, a, action, still ? 0 : now + (a.seed ?? 0));
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
  // ART: a grown male's marks on the stand-in until his own pictures come: a rooster's tall comb, wattle and sickle
  // tail; a drake's green head and curl; a ram's curled horns; a bull's horns and nose ring
  if (a.sex === "m" && a.stage === "adult") {
    if (a.species === "chicken") {
      ctx.fillStyle = "#d83a2a"; ctx.fillRect(hx - hr * 0.55, hy - hr * 1.9, hr * 1.1, hr * 0.9); ctx.fillRect(hx + hr * 0.45, hy + hr * 0.35, hr * 0.35, hr * 0.6);
      ctx.fillStyle = shade(body, -0.45); ctx.beginPath(); ctx.moveTo(-len * 0.42, cy - h * 0.1); ctx.quadraticCurveTo(-len * 0.75, cy - h * 1.1, -len * 0.3, cy - h * 0.75); ctx.lineTo(-len * 0.3, cy - h * 0.4); ctx.fill();
    } else if (a.species === "duck") {
      ctx.fillStyle = "#2f7a4a"; ctx.beginPath(); ctx.arc(hx, hy, hr * 1.02, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(-len * 0.45, cy - h * 0.45, len * 0.06, Math.PI * 0.2, Math.PI * 1.6); ctx.stroke();
    } else if (a.species === "sheep") {
      ctx.strokeStyle = "#cdb98a"; ctx.lineWidth = Math.max(1.2, hr * 0.32); ctx.beginPath(); ctx.arc(hx - hr * 0.35, hy - hr * 0.1, hr * 0.62, Math.PI * 0.9, Math.PI * 2.3); ctx.stroke();
    } else if (a.species === "cow") {
      ctx.fillStyle = "#e8dcc0"; ctx.fillRect(hx - hr * 0.9, hy - hr * 1.25, hr * 0.5, hr * 0.32); ctx.fillRect(hx + hr * 0.4, hy - hr * 1.25, hr * 0.5, hr * 0.32);
      ctx.strokeStyle = "#d8b040"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(hx + hr * 0.75, hy + hr * 0.45, hr * 0.28, 0, Math.PI * 2); ctx.stroke();
    }
  }
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
 * Fallback (the building's picture is in the pasture's sheet, drawBuilding): a box on its tiles with a gabled roof, its door on the side that faces the lanes
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

/** Fallback while the sheet has no picture of it: a long low box on the ground (a trough, the making table, the nest's bed, the stall's counter). */
export function drawBlock(ctx: CanvasRenderingContext2D, project: Project, r: { x: number; y: number; w: number; h: number }, side: string, top: string, height: number, s: number) {
  const A = project({ x: r.x, y: r.y }), B = project({ x: r.x + r.w, y: r.y }), C = project({ x: r.x + r.w, y: r.y + r.h }), D = project({ x: r.x, y: r.y + r.h });
  const up = (p: Vec) => ({ x: p.x, y: p.y - height * s });
  const poly = (pts: Vec[], fill: string) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = shade(side, -0.45); ctx.lineWidth = Math.max(1, s * 0.7); ctx.stroke(); };
  poly([D, C, up(C), up(D)], side);
  poly([C, B, up(B), up(C)], shade(side, -0.2));
  poly([up(A), up(B), up(C), up(D)], top);
}

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

/** Uncle Popoto: his own frames (pp_*, popoto-rancher); while the sheet has none, the uncle's frames with a straw hat stand in. */
export function drawPopoto(ctx: CanvasRenderingContext2D, scenery: SceneryKit | null, kit: SceneryKit | null, at: Vec, s: number, px: number, beat: number) {
  const frame = POPOTO_FRAMES[beat === 3 ? 1 : beat === 7 || beat === 8 ? 2 : beat === 12 ? 3 : 0];
  if (kit?.has(frame)) { const k = s * (PROP_K[frame] ?? 0.8); kit.drawProp(ctx, frame, at.x, at.y, k, px); return { tall: kit.sizeOf(frame)[1] * k, w: kit.sizeOf(frame)[0] * k }; }
  const stand = ["un_stand", "un_wave", "un_show", "un_laugh"][POPOTO_FRAMES.indexOf(frame)];
  if (scenery?.has(stand)) {
    const k = s * 0.78;
    scenery.drawProp(ctx, stand, at.x, at.y, k, px);
    const [w, h] = scenery.sizeOf(stand), [, ay] = scenery.anchorOf(stand);
    // (the stand-in: a straw hat over the uncle's frames)
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

/** The hay wagon and its ox (pa_wagon, pa_ox_*; a stand-in while the sheet has none), at the wagon's point (the bed's middle), the ox ahead the way it goes. */
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

/** A little bubble over an animal (pa_bubble*; a stand-in while the sheet has none): hungry (an empty bowl), ready (what it gives), a friend's hungry (a heart). */
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

/** An egg laid out on the meadow (pa_eggOutside; a stand-in while the sheet has none), with a glint for its owner under the herd bell. */
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

/** A forage spot of the meadow: its plant's own icon, a grazed tuft once taken (pa_forageTaken); a stand-in while neither has come. */
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

/* ── the animal farm's barns (lib/town/pasture's BARNS: 8 x 4 tiles each, the door in the middle of the front) ── */

type Box = { x: number; y: number; w: number; h: number };
/**
 * A barn's door in its picture (pa_barn), in its own pixels from its walls' front corner (the footprint's lowest point),
 * measured on it: bottom left, bottom right, top right, top left. The open door's stand-in is laid over it.
 */
const BARN_DOOR: ReadonlyArray<readonly [number, number]> = [[-216, -86], [-104, -46], [-104, -135], [-216, -175]];
/** The colours of the barn's picture, for the stand-ins laid with it: its door's boards, its trim, its outline, its walls inside. */
const BARN_INK = { door: "#6c2a1d", trim: "#dabf9a", line: "#2a170c", wall: "#5e2418", wallLit: "#7e3122", floor: "#7a5a36", plank: "#5f4428", straw: "#d8b45a", rail: "#8a5a32" } as const;
/**
 * A barn as seen from outside: its walls and roof (the old barn's picture, or the member's front if bought, drawn at the
 * scale that makes its walls' foot the footprint), its door open or shut, at `alpha` (the roof coming off for whoever
 * walks in).
 */
export function drawBarnOutside(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, project: Project, r: Box, art: string, s: number, px: number, open: boolean, alpha: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const name = kit?.has(art) ? art : PASTURE_ART.barn, fit = BUILDING_FIT[name];
  if (!drawBuilding(ctx, kit, project, r, name, s, px)) {
    // ART: the barn's plain stand-in while the sheet has none
    drawHouse(ctx, project, r, { wall: "#8e3626", roof: "#5a3424", trim: BARN_INK.trim, wallH: 70, roofH: 56, door: 0.34, windows: 2 }, s);
  } else if (open && fit) {
    // ART: the door slid open (its two leaves along the wall either side, the barn dark inside) until the next art
    // round's pa_barnDoorOpen; drawn in the picture's own pixels from its front corner, so it lies on the door it opens
    const C = project({ x: r.x + r.w, y: r.y + r.h }), k = s * ((r.w + r.h) * 32) / fit.base;
    const at = ([qx, qy]: readonly [number, number], dx = 0, dy = 0) => ({ x: C.x + (qx + dx) * k, y: C.y + (qy + dy) * k });
    const [bl, br, tr, tl] = BARN_DOOR, half = [(br[0] - bl[0]) / 2, (br[1] - bl[1]) / 2] as const, tall = bl[1] - tl[1];
    const quad = (pts: Vec[], fill: string, line?: string) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, 3 * k); ctx.stroke(); } };
    // the dark inside, a little lighter on the floor
    quad([at(bl), at(br), at(tr), at(tl)], "#1e130c", BARN_INK.line);
    quad([at(bl), at(br), at(br, 0, -16), at(bl, 0, -16)], "#3a2614");
    // the two leaves, slid aside along the wall
    const leaf = (from: readonly [number, number]) => {
      const a = at(from), b = at(from, half[0], half[1]), c = { x: b.x, y: b.y - tall * k }, d = { x: a.x, y: a.y - tall * k };
      quad([a, b, c, d], BARN_INK.door, BARN_INK.line);
      ctx.strokeStyle = BARN_INK.trim; ctx.lineWidth = Math.max(1, 4 * k);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    };
    leaf([bl[0] - half[0] * 0.95, bl[1] - half[1] * 0.95]);
    leaf([br[0] - half[0] * 0.05, br[1] - half[1] * 0.05]);
  }
  ctx.restore();
}
/**
 * A barn as seen from inside, for whoever stands in it (its roof and walls off, as the cooking yard's are): its floor,
 * its two back walls, the one trough along the back wall with a slot for each place (lib/town/pasture's troughOf), the
 * nest and the hay in the front corners, a low sill where its front walls were. No stalls: its animals go about together
 * (the owner, 2026-10-20). Each part is pushed with its own depth, so that whoever stands inside is drawn among them.
 * ART: every part but the nest and the hay is a stand-in until the next art round's pa_barnInside and trough pieces.
 */
export function drawBarnInside(things: Array<{ depth: number; draw: () => void }>, ctx: CanvasRenderingContext2D, kit: SceneryKit | null, scenery: SceneryKit | null, project: Project,
  b: Box & { nest: readonly [number, number]; hay: readonly [number, number] }, s: number, px: number, opts: { slots: Array<{ species: string; food: number } | null>; eggs: number; open: boolean; alpha: number }) {
  const { x, y, w, h } = b, base = x + y, WALL = 64;
  const P = (u: number, v: number) => project({ x: x + u, y: y + v });
  const up = (p: Vec, k: number) => ({ x: p.x, y: p.y - k * s });
  const poly = (pts: Vec[], fill: string, line?: string, lw = 1) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, lw * s); ctx.stroke(); } };
  const fade = (draw: () => void) => () => { ctx.save(); ctx.globalAlpha *= opts.alpha; draw(); ctx.restore(); };
  // the floor: boards along the barn, straw strewn in the stalls, the daylight through the door when it is open
  things.push({ depth: base - 1, draw: fade(() => {
    poly([P(0, 0), P(w, 0), P(w, h), P(0, h)], BARN_INK.floor, BARN_INK.line);
    ctx.strokeStyle = BARN_INK.plank; ctx.lineWidth = Math.max(1, 0.8 * s);
    for (let v = 0.5; v < h; v += 0.5) { const a = P(0, v), c = P(w, v); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
    ctx.fillStyle = BARN_INK.straw;
    for (let i = 0; i < 70; i++) { const u = (((i * 37) % 97) / 97) * w, v = (((i * 53) % 89) / 89) * 2; const p = P(u, v); ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, 2 * s), Math.max(1, s)); }
    if (opts.open) poly([P(3, h), P(5, h), P(5, h - 1.6), P(3, h - 1.6)], "rgba(255,226,160,0.16)");
  }) });
  // the back walls: boards, a beam along the top, a window in the long one
  things.push({ depth: base - 0.9, draw: fade(() => {
    const A = P(0, 0), B = P(w, 0), D = P(0, h);
    poly([D, A, up(A, WALL), up(D, WALL)], BARN_INK.wall, BARN_INK.line);
    poly([A, B, up(B, WALL), up(A, WALL)], BARN_INK.wallLit, BARN_INK.line);
    ctx.strokeStyle = "rgba(42,23,12,0.55)"; ctx.lineWidth = Math.max(1, 0.8 * s);
    for (let u = 0.5; u < w; u += 0.5) { const p = P(u, 0); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - WALL * s); ctx.stroke(); }
    for (let v = 0.5; v < h; v += 0.5) { const p = P(0, v); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - WALL * s); ctx.stroke(); }
    for (const [p0, p1] of [[D, A], [A, B]] as const) poly([up(p0, WALL), up(p1, WALL), up(p1, WALL - 6), up(p0, WALL - 6)], BARN_INK.trim, BARN_INK.line);
    const w0 = P(3.4, 0), w1 = P(4.6, 0);
    poly([up(w0, 30), up(w1, 30), up(w1, 50), up(w0, 50)], "#f6d98a", BARN_INK.trim, 2);
  }) });
  // the one trough along the back wall: its two ends and a slot for each place, each slot its animal's feed and level
  {
    const tr = troughOf(b, opts.slots.length), u0 = tr.x0 - x, u1 = tr.x1 - x, V0 = 0.06, V1 = V0 + TROUGH.depth, H = 13;
    // (behind whatever stands on the floor: it is against the back wall)
    things.push({ depth: base + 0.5, draw: fade(() => {
      // ART: a stand-in of the trough until the art round's ends and slots (pasture-art's TROUGH_ART)
      if (drawTroughArt(ctx, kit, P, tr.slots.length, u0, V1, opts.slots, s, px)) return;
      // the body: a long box of planks, its near face lit, its far side the wall's shadow, its inside dark
      const side = (a: number, b2: number, h2: number, front: string, end: string, top: string) => {
        const A = P(a, V0), B = P(b2, V0), C = P(b2, V1), D = P(a, V1);
        poly([D, C, up(C, h2), up(D, h2)], front, BARN_INK.line);
        poly([C, B, up(B, h2), up(C, h2)], end, BARN_INK.line);
        poly([up(A, h2), up(B, h2), up(C, h2), up(D, h2)], top, BARN_INK.line);
      };
      side(u0, u1, H, "#9a6a3a", "#7a5030", "#2e1d10");
      // (a plank's seam along the near face, and the rim)
      { const a = up(P(u0, V1), H * 0.5), c = up(P(u1, V1), H * 0.5); ctx.strokeStyle = "#6e4a28"; ctx.lineWidth = Math.max(1, s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
      { const a = up(P(u0, V1), H), c = up(P(u1, V1), H); ctx.strokeStyle = BARN_INK.trim; ctx.lineWidth = Math.max(1, 2 * s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
      opts.slots.forEach((slot, k) => {
        const a = u0 + TROUGH.end + k * TROUGH.slot, c = a + TROUGH.slot, fill = slot ? Math.max(0, Math.min(1, slot.food / 24)) : 0;
        if (fill > 0.02 && slot) {
          // the feed in the slot, heaped as high as it is full (half or full), its own colour, a few grains lit
          const top = fill < 0.55 ? H - 6 : H - 1, ink = FEED_INK[slot.species] ?? "#c9a05a";
          poly([up(P(a + 0.1, V0 + 0.08), top), up(P(c - 0.1, V0 + 0.08), top), up(P(c - 0.1, V1 - 0.08), top), up(P(a + 0.1, V1 - 0.08), top)], ink, shade(ink, -0.45));
          ctx.fillStyle = shade(ink, 0.35);
          for (let q = 0; q < 6; q++) { const p2 = up(P(a + 0.22 + (q % 3) * 0.25, V0 + 0.15 + Math.floor(q / 3) * 0.16), top + 1); ctx.fillRect(Math.round(p2.x), Math.round(p2.y), Math.max(1, 2 * s), Math.max(1, s)); }
        }
        // (a board between one slot and the next)
        if (k < opts.slots.length - 1) { const d0 = up(P(c, V0), H + 1), d1 = up(P(c, V1), H + 1); ctx.strokeStyle = BARN_INK.line; ctx.lineWidth = Math.max(1, 3 * s); ctx.beginPath(); ctx.moveTo(d0.x, d0.y); ctx.lineTo(d1.x, d1.y); ctx.stroke(); ctx.strokeStyle = "#b07a48"; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.beginPath(); ctx.moveTo(d0.x, d0.y); ctx.lineTo(d1.x, d1.y); ctx.stroke(); }
      });
      // the two ends: thick posts a little taller, capped
      for (const [a, c] of [[u0, u0 + TROUGH.end * 0.6], [u1 - TROUGH.end * 0.6, u1]] as const) side(a, c, H + 6, "#7a5030", "#5e3c22", BARN_INK.trim);
    }) });
  }
  // the nest (an egg in it while a bird's child is coming) and the hay
  { const c = P(b.nest[0] - x + 0.5, b.nest[1] - y + 0.5);
    things.push({ depth: b.nest[0] + b.nest[1] + 1, draw: fade(() => { if (!drawPastureProp(ctx, kit, opts.eggs ? PASTURE_ART.nestEgg : PASTURE_ART.nest, c.x, c.y + 4 * s, s, px)) drawBlock(ctx, project, { x: b.nest[0] + 0.1, y: b.nest[1] + 0.1, w: 0.8, h: 0.8 }, "#a07838", "#d8b050", 5, s); }) }); }
  { const c = P(b.hay[0] - x + 0.5, b.hay[1] - y + 0.62);
    things.push({ depth: b.hay[0] + b.hay[1] + 1, draw: fade(() => { if (scenery?.has("hay")) scenery.drawProp(ctx, "hay", c.x, c.y, s * 0.7, px); else drawBlock(ctx, project, { x: b.hay[0] + 0.1, y: b.hay[1] + 0.1, w: 0.8, h: 0.8 }, "#b08a3a", "#e8c860", 14, s); }) }); }
  // the low sill where the front walls were, open at the door, and the door's two posts
  things.push({ depth: base + w + h - 0.2, draw: fade(() => {
    const SILL = 9;
    for (const [u0, v0, u1, v1] of [[0, h, 3, h], [5, h, w, h], [w, h, w, 0]] as const) {
      const a = P(u0, v0), c = P(u1, v1);
      poly([a, c, up(c, SILL), up(a, SILL)], u0 === w ? BARN_INK.wall : BARN_INK.wallLit, BARN_INK.line);
      poly([up(a, SILL), up(c, SILL), up(c, SILL + 3), up(a, SILL + 3)], BARN_INK.trim);
    }
    for (const u of [3, 5]) { const p = P(u, h); ctx.fillStyle = BARN_INK.line; ctx.fillRect(p.x - 3 * s, p.y - 26 * s, 6 * s, 26 * s); ctx.fillStyle = BARN_INK.trim; ctx.fillRect(p.x - 2 * s, p.y - 25 * s, 4 * s, 24 * s); }
  }) });
}

/** The colour of each species' feed in its slot of the trough (its sack's grain, greens, clover or hay). */
const FEED_INK: Record<string, string> = { chicken: "#e2bd52", duck: "#7fae4a", sheep: "#a6cf62", cow: "#c79a55" };
/**
 * The trough of the art round's pieces (pasture-art's TROUGH_ART and TROUGH_FIT): every piece stands on its slot's point,
 * where the compartment's front wall meets the floor at its middle. Ours runs along +x (down to the right), so the
 * pieces are drawn mirrored and laid from the slot nearest the viewer's right up to the left, a step of their own each
 * (not the tile's: the joints would drift); the slots first, then the left end on the first slot's point and the right
 * end on the last's. False while the sheet has none of them.
 */
function drawTroughArt(ctx: CanvasRenderingContext2D, kit: SceneryKit | null, P: (u: number, v: number) => Vec, n: number, u0: number, v1: number, slots: Array<{ species: string; food: number } | null>, s: number, px: number): boolean {
  const A = TROUGH_ART;
  if (!kit?.has(A.left) || !kit.has(A.right) || !kit.has(A.empty)) return false;
  const k = s * TROUGH_FIT.k, step = { x: -TROUGH_FIT.step[0] * k, y: TROUGH_FIT.step[1] * k };
  // (the first drawn is our last slot, at the east end; each next one a step up to the left)
  const first = P(u0 + TROUGH.end + (n - 1) * TROUGH.slot + TROUGH.slot / 2, v1);
  const at = (i: number) => ({ x: first.x + step.x * i, y: first.y + step.y * i });
  for (let i = 0; i < n; i++) {
    const sl = slots[n - 1 - i], fill = sl ? sl.food / 24 : 0, want = sl && fill > 0.02 ? A.feed(sl.species, fill < 0.55 ? "half" : "full") : A.empty;
    const name = kit.has(want) ? want : A.empty, p = at(i);
    kit.drawProp(ctx, name, p.x, p.y, k * pastureScale(name), px, 0, true);
  }
  const l = at(0), r = at(n - 1);
  kit.drawProp(ctx, A.left, l.x, l.y, k * pastureScale(A.left), px, 0, true);
  kit.drawProp(ctx, A.right, r.x, r.y, k * pastureScale(A.right), px, 0, true);
  return true;
}
/**
 * One side of a wide gate in the animal farm's fence (lib/town/pasture's FARM_GATES), always open: a tall post at the
 * fence's end, and its leaf swung back against the garden's rim. ART: a stand-in in the fence's own wood until
 * pa_farmGate.
 */
export function drawGateSide(ctx: CanvasRenderingContext2D, project: Project, gx: number, y: number, s: number) {
  const a = project({ x: gx + 0.5, y }), c = project({ x: gx + 0.5 - 2.4, y });
  // the leaf: three bars and a brace, its far end's stile
  for (const [ink, lw] of [[BARN_INK.line, 3.6], ["#b07a48", 2]] as const) {
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, lw * s);
    for (const k of [10, 20, 30]) { ctx.beginPath(); ctx.moveTo(a.x, a.y - k * s); ctx.lineTo(c.x, c.y - k * s); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(a.x, a.y - 10 * s); ctx.lineTo(c.x, c.y - 30 * s); ctx.stroke();
  }
  ctx.fillStyle = BARN_INK.line; ctx.fillRect(c.x - 2.5 * s, c.y - 33 * s, 5 * s, 26 * s);
  ctx.fillStyle = "#8a5a32"; ctx.fillRect(c.x - 1.5 * s, c.y - 32 * s, 3 * s, 24 * s);
  // the post, capped
  ctx.fillStyle = BARN_INK.line; ctx.fillRect(a.x - 4 * s, a.y - 46 * s, 8 * s, 46 * s);
  ctx.fillStyle = "#7a4424"; ctx.fillRect(a.x - 3 * s, a.y - 45 * s, 6 * s, 44 * s);
  ctx.fillStyle = "#9a5a30"; ctx.fillRect(a.x - 3 * s, a.y - 45 * s, 2 * s, 44 * s);
  ctx.fillStyle = BARN_INK.line; ctx.fillRect(a.x - 5 * s, a.y - 50 * s, 10 * s, 6 * s);
  ctx.fillStyle = "#8a4e28"; ctx.fillRect(a.x - 4 * s, a.y - 49 * s, 8 * s, 4 * s);
}
/** One side of Uncle Popoto's pen: a low rail fence along the paddock's back (drawn before what is in it) or front (after). ART: a stand-in until pa_penFence. */
export function drawPenFence(ctx: CanvasRenderingContext2D, project: Project, r: Box, s: number, side: "back" | "front") {
  const corners: Array<[number, number]> = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  const edges: Array<[number, number]> = side === "back" ? [[3, 0], [0, 1]] : [[1, 2], [2, 3]];
  for (const [i, j] of edges) {
    const a = project({ x: corners[i][0], y: corners[i][1] }), c = project({ x: corners[j][0], y: corners[j][1] });
    for (const [ink, lw] of [[BARN_INK.line, 3.4], ["#a06a3c", 2]] as const) {
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, lw * s);
      for (const k of [9, 18]) { ctx.beginPath(); ctx.moveTo(a.x, a.y - k * s); ctx.lineTo(c.x, c.y - k * s); ctx.stroke(); }
    }
    const n = Math.round(Math.hypot(corners[j][0] - corners[i][0], corners[j][1] - corners[i][1]));
    for (let t = 0; t <= n; t++) { const p = { x: a.x + ((c.x - a.x) * t) / n, y: a.y + ((c.y - a.y) * t) / n }; ctx.fillStyle = BARN_INK.line; ctx.fillRect(p.x - 2.5 * s, p.y - 22 * s, 5 * s, 22 * s); ctx.fillStyle = "#8a5a32"; ctx.fillRect(p.x - 1.5 * s, p.y - 21 * s, 3 * s, 20 * s); }
  }
}
