/**
 * The HD-2D trial (the owner, 2026-11-17: "อยากได้ HD-2D เต็มตัว", "ไม่เอาภาพเบลอ"; then: a rough mock made by Claude
 * without 3D models, on a test URL anybody with the link may open, "ใช้ตัวละคร test ... มีแค่แผนที่เดียว ให้ลองเดินเล่นพอ").
 *
 * The editor's town (lib/town/town2-map.json, the live town's own map) stood up in depth:
 * - the ground a height field in the editor's own ground pictures, its water sunk below its banks;
 * - its wide things (houses, gates, stalls, the stage, bridges and piers) as blocks made by code (./build);
 * - its trees, plants, lanterns and small things from their own pictures, upright and turned to the camera;
 * - one sun with real shadows, at four times of day; lanterns and windows lit at night;
 * - one test character (the game's own doll) walked by tap, click or keys. No depth-of-field blur.
 *
 * It reads nothing from the database and writes nothing: no session, no other players, no game.
 */
import { createSheets, probe, reachOf, type Sheets, type Stand } from "./shade";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  T2_HALL, T2_STAGE_UP, T2_TEXTURES, inT2, t2InHall, t2Lift, t2OnStage, t2Tile,
  type T2Look,
} from "@/lib/town/town2";
import { WALK_FPS, loadPixelKit, type PixelKit, type View } from "@/lib/town/pixeldoll";
import { defaultLook, type Look } from "@/lib/town/look";
import { PX_UP, buildHall, buildStage, buildThing, makeKit, type Box4, type Kit } from "./build";
import { NOISE, makeAir, makePost, noise2 } from "./fx";
import * as skin from "./textures";
import { MAPS, type MapId } from "./maps";
import { makeWalk, type P } from "./walk";

/** A tile's side in isometric pixels (64 across its diagonal). */
const PX_SIDE = 45.25;
/** The ground beyond the town: how far the trial's world goes on, in tiles. */
const SUB = 8, GRID = 3;
const LOOKS: T2Look[] = ["t2grass", "t2water", "t2sand", "t2road", "t2wood", "t2plaza"];
const WATER = 1;
const WATER_Y = -0.17, BED_Y = -0.55;

export type TimeId = "morning" | "day" | "evening" | "night";
interface Sky { sun: [number, number, number]; sunCol: number; sunI: number; top: number; ground: number; hemiI: number; sky: number; lamps: number; /** The hour's colour over the whole picture. */ grade: [number, number, number]; /** [colour's strength, dark corners, glow, dust, fireflies, mist, shafts, cloud shadows] */ air: number[] }
const SKIES: Record<TimeId, Sky> = {
  morning: { sun: [0.74, 0.5, -0.2], sunCol: 0xffe0c0, sunI: 2.5, top: 0xcfe4ff, ground: 0x9a8468, hemiI: 1.5, sky: 0xbfe0f0, lamps: 0, grade: [0.97, 1.0, 1.05], air: [1.04, 0.2, 0.5, 0.5, 0, 1, 0.6, 0.6] },
  day: { sun: [-0.1, 0.9, 0.6], sunCol: 0xfffaf0, sunI: 3.0, top: 0xd6ecff, ground: 0x8f8a70, hemiI: 1.7, sky: 0x8ccaf2, lamps: 0, grade: [1.0, 1.0, 1.0], air: [1.1, 0.14, 0.4, 0.7, 0, 0, 0.15, 1] },
  evening: { sun: [-0.42, 0.45, 0.71], sunCol: 0xff9a52, sunI: 3.0, top: 0xa99be0, ground: 0x7a5040, hemiI: 1.15, sky: 0xf2b184, lamps: 0.35, grade: [1.04, 0.99, 0.95], air: [1.06, 0.24, 0.45, 0.8, 0.25, 0, 0.7, 0.6] },
  night: { sun: [-0.55, 0.58, 0.4], sunCol: 0x86a4ff, sunI: 1.15, top: 0x41589f, ground: 0x1c2440, hemiI: 1.05, sky: 0x0c1632, lamps: 1, grade: [0.92, 0.97, 1.08], air: [0.98, 0.34, 0.6, 0, 1, 0.3, 0, 0.3] },
};

/** Where the live town's own camera looks, as it says it: the middle of the view in isometric pixels, its scale, the view's size. */
export interface LiveView {
  /** Points of the map (tiles) asked whether they are in a shadow, and the answers (0 dark to 1 lit), written by `renderAt`: ./shade's `probe`. */
  probes?: Array<[x: number, y: number]>;
  shades?: number[];
  /** What else stands in the view, to throw its shadow: the walkers, each their own doll as it was last drawn (./shade's sheets). */
  stands?: Stand[]; cx: number; cy: number; s: number; cw: number; ch: number; dpr: number; /** The minute of the day, for where the sun stands. */ min: number }
export interface HdTown {
  /**
   * For the live town (`underlay`): the shadows of what stands, on white ground, drawn as the live town's camera sees the
   * map, and handed back as a picture to lay over the live town's own ground by multiplying (white leaves it as it is,
   * a shadow darkens it). Nothing else is drawn: the ground, the water and all that stands are the live town's own.
   */
  renderAt(v: LiveView): HTMLCanvasElement;
  /**
   * For the live town: what lives on the map's water, alone on nothing, as the live town's camera sees it: foam along
   * the banks, the sun's glints, the banks' dark band, and rings where rain falls (`wet`, 0 to 1). Laid over the live
   * town's own water as soon as that is drawn.
   */
  renderWater(v: LiveView, wet: number): HTMLCanvasElement;
  /** For the live town (`underlay: "raised"`): the ground and the water in their own colours, with the ground's heights, as the live town's camera sees them; drawn where the live town drew its ground. */
  renderGround(v: LiveView, wet: number): HTMLCanvasElement;
  /** How high the ground is at a point of the map (tiles), in tiles; 0 everywhere on level ground. */
  heightAt(x: number, y: number): number;
  /** Whether a point of the map (tiles) is water. */
  wetAt(x: number, y: number): boolean;
  /** After `renderAt`, the same frame: what stands in the map alone, lit and in shadow, on nothing (for the live town to lay over its own pictures). */
  renderLit(): HTMLCanvasElement;
  /** Whether the ground's pictures have come (until then `renderAt` would paint it black). */
  ready(): boolean;
  setTime(t: TimeId): void;
  /** The hour by the clock, in minutes of the day; null hands the hour back to `setTime`. */
  setClock(min: number | null): void;
  setRain(on: boolean): void;
  zoom(by: number): void;
  dispose(): void;
}
export type Quality = "high" | "mid" | "low";
export interface HdOpts { /** Only the ground, the water and the shadows, for the live town to draw over (see `renderAt`). */ underlay?: boolean | "raised"; /** How much is drawn: everything, a phone's share, or the bare scene. Left out, the device decides, and a slow one is given less. */ quality?: Quality; /** Light and air (glow, colour, dust, mist); a tester's `?fx=0` turns them off to compare. */ fx?: boolean; /** Which map is stood up. */ map?: MapId; time: TimeId; /** Where to stand first, in tiles (a tester's `?at=x,y`); the plaza otherwise. */ at?: { x: number; y: number }; /** The name plate of the test character: moved here each frame to sit under its feet. */ nameEl?: HTMLElement | null; /** Show where may be walked (a tester's `?walk=1`). */ showWalk?: boolean; onReady?: () => void; onFps?: (fps: number) => void }

type Obj = number[];
const SEASONAL = /^game_(pumpkin|jacko)/;
const FLAT = /^(lotus_leaves|three_flat_grey_stepping_stones)/;
const SKIP = /^(game_ring|chest_open|kitchen_house_inside)/;
const SWAY = /tree|cedar|zelkova|camphor|pine|maple|ginkgo|bush|shrub|hydrangea|tulip|flower|reed|bamboo|iris|azalea|fern|lily|chrysanth|bellflower/;
const LAMP = /kasuga_stone_lantern|hanging_red_pape|street_lantern/;

function loadTexture(manager: THREE.LoadingManager, src: string): THREE.Texture {
  const t = new THREE.TextureLoader(manager).load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function createHdTown(canvas: HTMLCanvasElement, opts: HdOpts): HdTown {
  const map = MAPS[opts.map ?? "town"], TOWN = map.id === "town", below = !!opts.underlay, flat = opts.underlay === true;
  // (`raised`: under the live town with the ground's heights, the live town lifting all it draws by `heightAt`; the
  // ground and the water are then this town's own too: `renderGround`)
  const sprites = map.sprites, names = map.names, OBJECTS = map.objects as Obj[], DIR = map.dir;
  const { findWay, nearestOpen, step } = makeWalk(map), isDeck = map.isDeck;
  /** The ground beyond the map: how far the trial's world goes on, in tiles. */
  const WORLD = { x0: map.x0 - 22, z0: map.y0 - 22, x1: map.x0 + map.cols + 22, z1: map.y0 + map.rows + 22 };
  const inMap = (x: number, z: number) => x >= map.x0 && z >= map.y0 && x < map.x0 + map.cols && z < map.y0 + map.rows;
  /** How far up somebody stands at a point, in isometric pixels (a stage, a bridge: the town's). */
  const lift = (x: number, z: number) => (TOWN ? t2Lift(x, z) : 0);
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  // (the owner was told, 2026-11-17, that the look's cost on a phone was never measured: so three shares of it)
  const quality: Quality = opts.quality ?? (coarse ? "mid" : "high"), lite = quality !== "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: below, powerPreference: "high-performance" });
  let land: { mesh: THREE.Mesh; real: THREE.Material; white: THREE.Material } | null = null, river: THREE.Mesh | null = null;
  // (under the live town: what is hidden while only shadows are drawn and shown for the lit picture, and the other way)
  const litShown: THREE.Object3D[] = [], litHidden: THREE.Object3D[] = [];
  renderer.shadowMap.enabled = true;
  // (under the live town the shadows are kept sharp, a pixel of the town's art to an edge: a walker's shadow is a few pixels
  // wide, and a soft one was a smear; the owner, 2026-11-17: "เงาไม่ละเอียด")
  renderer.shadowMap.type = below ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  const disposables: Array<{ dispose(): void }> = [];
  let dead = false;
  // the town is shown once its pictures have come (or have been waited for long enough), not half painted
  const pictures = new THREE.LoadingManager();
  const came = { pictures: false, doll: false, since: performance.now() };
  pictures.onLoad = () => { came.pictures = true; };

  /* ── light ────────────────────────────────────────────────────────────── */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = !map.indoors;
  const SH = below ? (lite ? 2048 : 4096) : lite ? 1024 : 2048, REACH = 30;
  sun.shadow.mapSize.set(SH, SH);
  Object.assign(sun.shadow.camera, { left: -REACH, right: REACH, top: REACH, bottom: -REACH, near: 1, far: 220 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xffffff, 60, 150);
  scene.background = new THREE.Color(0x8ccaf2);

  // the sky now, and the two it is between while the hour asked for changes
  const copy = (q: Sky): Sky => ({ ...q, sun: [...q.sun], grade: [...q.grade], air: [...q.air] });
  const now: Sky = copy(SKIES[opts.time]);
  let from: Sky = copy(now), want: Sky = SKIES[opts.time], turned = 1;
  const sunDir = new THREE.Vector3(...now.sun).normalize();
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixHex = (a: number, b: number, k: number) => cA.setHex(a).lerp(cB.setHex(b), k).getHex();
  const mix = (a: number, b: number, k: number) => a + (b - a) * k;

  /* ── the ground ───────────────────────────────────────────────────────── */
  const IW = (WORLD.x1 - WORLD.x0) * SUB, IH = (WORLD.z1 - WORLD.z0) * SUB;
  const index = new Uint8Array(IW * IH);
  const lookAt = (x: number, z: number): number => {
    if (map.indoors) return 7;
    if (inMap(x, z)) return map.look(x, z);
    const bank = map.bank?.(x, z);
    if (bank != null) return bank;
    // beyond the banks the builder drew: the map's edge goes on (its water as water), then the woods' floor
    const ex = Math.min(Math.max(x, map.x0 + 0.02), map.x0 + map.cols - 0.02), ez = Math.min(Math.max(z, map.y0 + 0.02), map.y0 + map.rows - 0.02);
    const edge = map.look(ex, ez), out = Math.max(Math.abs(x - ex), Math.abs(z - ez));
    if (edge === WATER && out < 30) return WATER;
    return out > 4 ? 4 : 0;
  };
  for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) index[j * IW + i] = lookAt(WORLD.x0 + (i + 0.5) / SUB, WORLD.z0 + (j + 0.5) / SUB);
  const wetAt = (x: number, z: number) => {
    const i = Math.min(IW - 1, Math.max(0, Math.floor((x - WORLD.x0) * SUB))), j = Math.min(IH - 1, Math.max(0, Math.floor((z - WORLD.z0) * SUB)));
    return index[j * IW + i] === WATER;
  };
  const indexTex = new THREE.DataTexture(index, IW, IH, THREE.RedFormat, THREE.UnsignedByteType);
  indexTex.magFilter = indexTex.minFilter = THREE.NearestFilter;
  indexTex.needsUpdate = true;
  disposables.push(indexTex);

  const lookTex = LOOKS.map((look) => {
    const t = loadTexture(pictures, T2_TEXTURES.find((q) => q.look === look)!.src);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    disposables.push(t);
    return t;
  });

  /*
   * The ground's heights (the owner, 2026-11-17: "ความสูงของพื้น ทำให้แตกต่างกันได้ไปเลย"). The maps were drawn on flat
   * ground and say nothing of heights, so these are made here: low rounded hills over open land, none where the ground
   * must be level (water and its banks, a plaza's stone, a bed's soil, boards), and one height under each building,
   * which stands on its own level patch. Everything that stands is raised with the ground under its middle. Beyond a
   * map the hills grow.
   */
  const NX = (WORLD.x1 - WORLD.x0) * GRID + 1, NZ = (WORLD.z1 - WORLD.z0) * GRID + 1;
  const HGT = new Float32Array(NX * NZ);
  // (under the live town the ground stays level: its pictures are all drawn on level ground)
  if (!map.indoors && !flat) {
    let land = new Float32Array(NX * NZ), tmp = new Float32Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = WORLD.x0 + i / GRID, z = WORLD.z0 + j / GRID, l = lookAt(x, z), tx = Math.floor(x), tz = Math.floor(z);
      land[j * NX + i] = l === WATER || l === 5 || l === 6 || map.isDeck(tx, tz) || (TOWN && t2OnStage(tx, tz)) ? 0 : 1;
    }
    // (how far a point is from ground that must be level, roughly: the level ground's edges spread out)
    const R = 4 * GRID;
    for (let pass = 0; pass < 4; pass++) {
      const across = pass % 2 === 0, n = across ? NX : NZ, m = across ? NZ : NX;
      for (let b = 0; b < m; b++) {
        let sum = 0;
        const at = (a: number) => { const c = Math.min(n - 1, Math.max(0, a)); return across ? b * NX + c : c * NX + b; };
        for (let a = -R; a <= R; a++) sum += land[at(a)];
        for (let a = 0; a < n; a++) { tmp[at(a)] = sum / (2 * R + 1); sum += land[at(a + R + 1)] - land[at(a - R)]; }
      }
      [land, tmp] = [tmp, land];
    }
    const smooth = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = WORLD.x0 + i / GRID, z = WORLD.z0 + j / GRID;
      const out = Math.max(map.x0 - x, x - map.x0 - map.cols, map.y0 - z, z - map.y0 - map.rows, 0);
      const n = noise2(x * 0.055, z * 0.055) * 0.65 + noise2(x * 0.13 + 7.3, z * 0.13 + 2.1) * 0.35;
      HGT[j * NX + i] = Math.max(0, n - 0.3) * (2.4 + 3.2 * smooth(out / 14)) * smooth((land[j * NX + i] - 0.55) / 0.43);
    }
    // a level patch under each wide thing, at the height of the ground under its middle
    const M2 = 2.5;
    OBJECTS.forEach((o, i) => {
      const name = names[o[0]], w = o[10] - o[8], d = o[11] - o[9];
      if (o[6] === 1 || o[6] === 3 || Math.max(w, d) < 2 || map.leftOut.has(i) || SKIP.test(name) || (o[6] === 4 && !map.shown?.test(name))) return;
      const ci = Math.round(((o[8] + o[10]) / 2 - WORLD.x0) * GRID), cj = Math.round(((o[9] + o[11]) / 2 - WORLD.z0) * GRID);
      const level = HGT[Math.min(NZ - 1, Math.max(0, cj)) * NX + Math.min(NX - 1, Math.max(0, ci))];
      for (let j = Math.max(0, Math.floor((o[9] - M2 - WORLD.z0) * GRID)); j <= Math.min(NZ - 1, Math.ceil((o[11] + M2 - WORLD.z0) * GRID)); j++) {
        for (let i2 = Math.max(0, Math.floor((o[8] - M2 - WORLD.x0) * GRID)); i2 <= Math.min(NX - 1, Math.ceil((o[10] + M2 - WORLD.x0) * GRID)); i2++) {
          const x = WORLD.x0 + i2 / GRID, z = WORLD.z0 + j / GRID, off = Math.max(o[8] - x, x - o[10], o[9] - z, z - o[11], 0);
          const k = smooth(1 - off / M2);
          HGT[j * NX + i2] += (level - HGT[j * NX + i2]) * k;
        }
      }
    });
  }
  /** The ground's height at a point. */
  const Hat = (x: number, z: number): number => {
    const fx = Math.min(NX - 1.001, Math.max(0, (x - WORLD.x0) * GRID)), fz = Math.min(NZ - 1.001, Math.max(0, (z - WORLD.z0) * GRID));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = j * NX + i;
    return (HGT[a] * (1 - u) + HGT[a + 1] * u) * (1 - v) + (HGT[a + NX] * (1 - u) + HGT[a + NX + 1] * u) * v;
  };
  /** What every shader that moves reads: the time, how much of the clouds' shadows there is, the sun's glint on water. */
  const clock = { value: 0 }, cloudy = { value: 1 }, wetU = { value: 0 }, meAt = { value: new THREE.Vector2(-999, -999) }, glint = { value: new THREE.Vector3(0.3, 0.3, 0.25) };

  {
    const nx = NX, nz = NZ;
    const pos = new Float32Array(nx * nz * 3), idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = WORLD.x0 + i / GRID, z = WORLD.z0 + j / GRID, o = (j * nx + i) * 3;
      pos[o] = x; pos[o + 1] = flat ? 0 : wetAt(x, z) ? BED_Y : HGT[j * nx + i]; pos[o + 2] = z;
    }
    let k = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    if (!flat) mat.onBeforeCompile = (sh) => {
      sh.uniforms.hdIndex = { value: indexTex };
      sh.uniforms.hdTime = clock; sh.uniforms.hdCloud = cloudy; sh.uniforms.hdWet = wetU;
      sh.uniforms.hdUvK = { value: flat ? new THREE.Vector2(1 / 8, -1 / 8) : new THREE.Vector2(1 / 5.657, 1 / 5.657) };
      sh.uniforms.hdOrigin = { value: new THREE.Vector4(WORLD.x0, WORLD.z0, WORLD.x1 - WORLD.x0, WORLD.z1 - WORLD.z0) };
      LOOKS.forEach((_, i) => { sh.uniforms[`hdLook${i}`] = { value: lookTex[i] }; });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 hdAt;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nhdAt = position.xz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec2 hdAt;\nuniform sampler2D hdIndex;\nuniform vec4 hdOrigin;\nuniform float hdTime;\nuniform float hdCloud;\nuniform float hdWet;\nuniform vec2 hdUvK;\n${NOISE}\n${LOOKS.map((_, i) => `uniform sampler2D hdLook${i};`).join("\n")}`)
        .replace("#include <map_fragment>", `
          float hdId = floor(texture2D(hdIndex, (hdAt - hdOrigin.xy) / hdOrigin.zw).r * 255.0 + 0.5);
          vec2 hdUv = hdAt * hdUvK;
          vec3 hdBed = texture2D(hdLook2, hdUv).rgb * vec3(0.30, 0.52, 0.66);
          vec3 hdCol = texture2D(hdLook0, hdUv).rgb * (1.0 - step(0.5, hdId));
          hdCol += hdBed * step(0.5, hdId) * (1.0 - step(1.5, hdId));
          hdCol += texture2D(hdLook2, hdUv).rgb * step(1.5, hdId) * (1.0 - step(2.5, hdId));
          hdCol += texture2D(hdLook3, hdUv).rgb * step(2.5, hdId) * (1.0 - step(3.5, hdId));
          hdCol += texture2D(hdLook4, hdUv).rgb * step(3.5, hdId) * (1.0 - step(4.5, hdId));
          hdCol += texture2D(hdLook5, hdUv).rgb * step(4.5, hdId) * (1.0 - step(5.5, hdId));
          hdCol += texture2D(hdLook3, hdUv).rgb * vec3(0.62, 0.47, 0.36) * step(5.5, hdId) * (1.0 - step(6.5, hdId));
          // clouds' shadows, drifting over the land
          float hdSh = smoothstep(0.5, 0.74, hdNoise(hdAt * 0.045 + hdTime * vec2(0.05, 0.018)) * 0.65 + hdNoise(hdAt * 0.11 - hdTime * vec2(0.03, 0.04)) * 0.35);
          diffuseColor.rgb *= hdCol * (1.0 - hdCloud * 0.3 * hdSh);
          // wet ground: darker and cooler, with a pale sheen where water stands
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.64, 0.69, 0.78), hdWet);
          diffuseColor.rgb += hdWet * 0.09 * step(0.7, hdNoise(hdAt * 0.9)) * vec3(0.55, 0.65, 0.85);`);
    };
    // (under the live town the ground is white, for the shadows' picture; its own colours are worn only for `renderGround`)
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ground = new THREE.Mesh(geo, below ? white : mat);
    ground.receiveShadow = true;
    litHidden.push(ground);
    scene.add(ground);
    land = { mesh: ground, real: mat, white };
    disposables.push(geo, mat, white);
  }

  // the water: the editor's own water picture, drifting, over the sunk bed
  const waterTex = loadTexture(pictures, T2_TEXTURES.find((q) => q.look === "t2water")!.src);
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.minFilter = THREE.LinearMipmapLinearFilter;
  disposables.push(waterTex);
  const K: Kit = makeKit(waterTex, map.shut);
  // The water lives: the sun glints on it in the town's own pixels, and foam comes and goes along its banks.
  K.water.onBeforeCompile = (sh) => {
    sh.uniforms.hdIndex = { value: indexTex };
    sh.uniforms.hdOrigin = { value: new THREE.Vector4(WORLD.x0, WORLD.z0, WORLD.x1 - WORLD.x0, WORLD.z1 - WORLD.z0) };
    sh.uniforms.hdMid = { value: new THREE.Vector2((WORLD.x0 + WORLD.x1) / 2, (WORLD.z0 + WORLD.z1) / 2) };
    sh.uniforms.hdTime = clock; sh.uniforms.hdGlint = glint; sh.uniforms.hdWet = wetU;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 hdW;\nuniform vec2 hdMid;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nhdW = vec2(position.x + hdMid.x, hdMid.y - position.y);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 hdW;\nuniform sampler2D hdIndex;\nuniform vec4 hdOrigin;\nuniform float hdTime;\nuniform vec3 hdGlint;\nuniform float hdWet;\n${NOISE}
        float hdLand(vec2 p) { return step(0.5, abs(floor(texture2D(hdIndex, (p - hdOrigin.xy) / hdOrigin.zw).r * 255.0 + 0.5) - 1.0)); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec2 hdP = floor(hdW * 22.63) / 22.63;
        float hdShore = max(max(hdLand(hdP + vec2(0.24, 0.0)), hdLand(hdP - vec2(0.24, 0.0))), max(hdLand(hdP + vec2(0.0, 0.24)), hdLand(hdP - vec2(0.0, 0.24))));
        float hdNear = max(max(hdLand(hdP + vec2(0.1, 0.0)), hdLand(hdP - vec2(0.1, 0.0))), max(hdLand(hdP + vec2(0.0, 0.1)), hdLand(hdP - vec2(0.0, 0.1))));
        float hdWave = hdNoise(hdP * 3.1 + vec2(hdTime * 0.55, -hdTime * 0.4));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), max(hdNear * 0.7, hdShore * step(0.5, hdWave) * 0.6));
        // (glints: few and small, a pixel or two each, where two slow ripples meet)
        float hdG = hdNoise(hdP * 5.5 + vec2(hdTime * 0.3, hdTime * 0.18)) * hdNoise(hdP * 11.0 - vec2(hdTime * 0.45, 0.0));
        diffuseColor.rgb += hdGlint * step(0.56, hdG);
        // the banks in the water: a darker, rippling band along them
        float hdFar = max(max(hdLand(hdP + vec2(0.9, 0.0)), hdLand(hdP - vec2(0.9, 0.0))), max(hdLand(hdP + vec2(0.0, 0.9)), hdLand(hdP - vec2(0.0, 0.9))));
        diffuseColor.rgb *= 1.0 - 0.2 * hdFar * (0.75 + 0.25 * sin(hdW.x * 9.0 + hdW.y * 7.0 + hdTime * 1.6));
        // rain: rings opening where drops fall
        vec2 hdC = floor(hdW * 2.0);
        float hdR = fract(hdHash(hdC) + hdTime * 0.9);
        float hdD = length(fract(hdW * 2.0) - 0.5 - (vec2(hdHash(hdC + 3.1), hdHash(hdC + 7.7)) - 0.5) * 0.5);
        diffuseColor.rgb += hdWet * 0.5 * (1.0 - hdR) * step(abs(hdD - hdR * 0.35), 0.035);`);
  };
  {
    const w = WORLD.x1 - WORLD.x0, d = WORLD.z1 - WORLD.z0, geo = new THREE.PlaneGeometry(w, d), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 5.657, uv.getY(i) * d / 5.657);
    const m = new THREE.Mesh(geo, K.water);
    m.visible = !below;
    river = m;
    m.rotation.x = -Math.PI / 2;
    m.position.set((WORLD.x0 + WORLD.x1) / 2, WATER_Y, (WORLD.z0 + WORLD.z1) / 2);
    m.receiveShadow = true;
    scene.add(m);
    disposables.push(geo);
  }

  /* ── what stands in the town ──────────────────────────────────────────── */
  const town = new THREE.Group();
  scene.add(town);
  const spins: THREE.Object3D[] = [];
  const hall: { upper: THREE.Group | null } = { upper: null };
  // A room's own light (the owner, 2026-11-17, of the kitchen hall at night: "ข้างในบ้านควรทำให้ดู อบอุ่น cozy กว่านี้หน่อย"):
  // warm lamps over its floor, lit while I am inside; the night outside stays the night.
  const hearths = (map.indoors
    ? [[map.x0 + map.cols * 0.35, map.y0 + map.rows * 0.4], [map.x0 + map.cols * 0.7, map.y0 + map.rows * 0.65]]
    : TOWN ? [[T2_HALL.box[0] * 0.7 + T2_HALL.box[2] * 0.3, (T2_HALL.box[1] + T2_HALL.box[3]) / 2], [T2_HALL.box[0] * 0.3 + T2_HALL.box[2] * 0.7, (T2_HALL.box[1] + T2_HALL.box[3]) / 2]] : []
  ).map(([x, z]) => { const l = new THREE.PointLight(0xffb868, 0, 15, 1.2); l.position.set(x, 3.6, z); scene.add(l); return l; });

  /** A picture stood upright: seen at (x, z), where its foot was drawn; its shadow thrown from (sx, sz), the middle of what it is. */
  interface Card { x: number; z: number; sx: number; sz: number; y: number; w: number; h: number; flip: boolean; unseen?: boolean; /** Its shadow is thrown by a block on its footprint instead. */ blocked?: boolean }
  const cards = new Map<number, Card[]>();
  const lamps: Array<{ x: number; y: number; z: number; /** The ground under it. */ b: number }> = [];
  const flats: Array<{ s: number; o: Obj; wet: boolean }> = [];
  // (a picture and its mirror are two sets: see `cardFlip` below)
  const card = (s: number, c: Card) => { const k = s * 2 + (c.flip ? 1 : 0), l = cards.get(k); if (l) l.push(c); else cards.set(k, [c]); };

  /*
   * A wide thing's own picture, laid back onto its shape (the owner, 2026-11-17: "แปลง asset ในแมพแรก เป็น 3d เท่าที่ควรจะเป็น").
   * The picture was drawn from one direction; from there every point of the world falls on one pixel of it, by a rule that
   * is straight in x, y and z. So each corner of a shape is given the pixel it was drawn at, and the shape wears the picture:
   * the house is the artist's house, and has depth, a shadow of its own and the sun's light on it.
   * (A border of one clear pixel goes round each picture, so that nothing is smeared beyond its edge.)
   */
  const artMats = new Map<number, THREE.MeshLambertMaterial>();
  function artOf(s: number): THREE.MeshLambertMaterial {
    const had = artMats.get(s);
    if (had) return had;
    const [file, pw, ph] = sprites[s];
    const cv = document.createElement("canvas"), gv = document.createElement("canvas");
    cv.width = gv.width = pw + 2; cv.height = gv.height = ph + 2;
    const map = new THREE.CanvasTexture(cv), glow = new THREE.CanvasTexture(gv);
    for (const t of [map, glow]) { t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
    const src = `${DIR}/${file}`, img = new Image();
    pictures.itemStart(src);
    img.onload = () => {
      const g = cv.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 1, 1, pw, ph);
      // what shines at night: the picture's own paper windows and lanterns (its bright, warm pixels), in their own colours
      const d = g.getImageData(0, 0, cv.width, cv.height), q = d.data;
      for (let i = 0; i < q.length; i += 4) {
        const warm = q[i + 3] > 200 && q[i] > 205 && q[i + 1] > 100 && q[i + 2] < 190 && q[i] - q[i + 2] > 36;
        if (!warm) q[i] = q[i + 1] = q[i + 2] = 0;
        q[i + 3] = 255;
      }
      gv.getContext("2d")!.putImageData(d, 0, 0);
      map.needsUpdate = glow.needsUpdate = true;
      pictures.itemEnd(src);
    };
    img.onerror = () => { pictures.itemError(src); pictures.itemEnd(src); };
    img.src = src;
    const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0 });
    if (below) { mat.colorWrite = false; mat.depthWrite = false; }
    artMats.set(s, mat);
    disposables.push(map, glow, mat);
    return mat;
  }
  /** Where in its picture a point of the world was drawn (u, v). */
  const drawnAt = (o: Obj) => {
    const [, pw, ph] = sprites[o[1]], k = o[4], flip = o[5] === 1;
    return (x: number, y: number, z: number): [number, number] => {
      const px = ((x - z) * 32 - o[2]) / k, py = ((x + z) * 16 - y * PX_UP - o[3]) / k;
      return [((flip ? pw - px : px) + 1) / (pw + 2), 1 - (py + 1) / (ph + 2)];
    };
  };
  /** What a shape does not reach of its picture: the ground it stands on and two walls behind it, wearing the rest. */
  function behind(o: Obj): THREE.Mesh {
    const [, pw, ph] = sprites[o[1]], L = o[2], R = o[2] + pw * o[4], T = o[3], B = o[3] + ph * o[4], X0 = o[8], Z0 = o[9], at = drawnAt(o);
    const Xf = Math.max(o[10], (R / 32 + B / 16) / 2, Z0 + R / 32), Zf = Math.max(o[11], (B / 16 - L / 32) / 2, X0 - L / 32);
    const top = Math.max(0.5, ((2 * X0 - L / 32) * 16 - T) / PX_UP, ((2 * Z0 + R / 32) * 16 - T) / PX_UP), y = 0.02;
    const P = [
      X0, y, Z0, X0, y, Zf, Xf, y, Zf, Xf, y, Z0,
      X0, y, Zf, X0, y, Z0, X0, top, Z0, X0, top, Zf,
      X0, y, Z0, Xf, y, Z0, Xf, top, Z0, X0, top, Z0,
    ];
    const U: number[] = [], N: number[] = [], I: number[] = [];
    for (let i = 0; i < 12; i++) { U.push(...at(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])); N.push(0, 1, 0); }
    for (let f = 0; f < 3; f++) I.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    geo.setIndex(I);
    return new THREE.Mesh(geo, artOf(o[1]));
  }
  /** Dress a built thing in its picture: its still blocks made one shape, a turning part left to turn. */
  /**
   * (The owner, 2026-11-17: "เงาต้องเป็น layer หลังวัตถุ": a shadow lies on the ground behind things, never across them, so a
   * dressed thing takes no shadow. And "เงาเสาญี่ปุ่นดูเล็กไป": a gate or a board is thin, and its blocks' shadow was thinner
   * than its picture; `thin` throws the shadow of the picture itself instead.)
   */
  function dress(g: THREE.Group, o: Obj, spin?: THREE.Object3D, thin = false) {
    g.updateMatrixWorld(true);
    const mat = artOf(o[1]), at = drawnAt(o), parts: THREE.BufferGeometry[] = [], gone: THREE.Mesh[] = [], p = new THREE.Vector3();
    g.traverse((q) => {
      const m = q as THREE.Mesh;
      if (!m.isMesh) return;
      let turning = false;
      for (let a: THREE.Object3D | null = m; a; a = a.parent) if (a === spin) turning = true;
      const geo = turning ? m.geometry : m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!turning) geo.applyMatrix4(m.matrixWorld);
      const pos = geo.attributes.position, uv = geo.attributes.uv, n = geo.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        if (turning) p.applyMatrix4(m.matrixWorld);
        const [u, v] = at(p.x, p.y, p.z);
        uv.setXY(i, u, v);
        // (lit as the ground is, as its picture already has its own light and dark; the sun's part is its shadows)
        if (!turning) n.setXYZ(i, 0, 1, 0);
      }
      if (turning) { m.material = mat; uv.needsUpdate = true; } else { parts.push(geo); gone.push(m); }
    });
    for (const m of gone) { m.parent?.remove(m); m.geometry.dispose(); }
    if (parts.length) {
      const all = new THREE.Mesh(mergeGeometries(parts), mat);
      all.castShadow = !thin;
      g.add(all);
      for (const q of parts) q.dispose();
    }
    g.add(behind(o));
    if (thin) {
      // its shadow: its picture stood along its own line (post to post), unseen, so each post's shadow starts at its foot
      // (the owner, 2026-11-17: "เงาของบางอย่างไม่ต่อกัน": thrown from one sheet turned to the sun, it started beside them)
      const cx = (o[8] + o[10]) / 2, cz = (o[9] + o[11]) / 2, alongX = o[10] - o[8] >= o[11] - o[9];
      const half = Math.max(o[10] - o[8], o[11] - o[9]) / 2 + 2, up = sprites[o[1]][2] * o[4] / PX_UP + 1;
      const ax = alongX ? half : 0, az = alongX ? 0 : half;
      const P = [cx - ax, 0, cz - az, cx + ax, 0, cz + az, cx + ax, up, cz + az, cx - ax, up, cz - az], U: number[] = [];
      for (let i = 0; i < 4; i++) U.push(...at(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const unseen = new THREE.MeshBasicMaterial({ map: mat.map, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
      const sheet = new THREE.Mesh(geo, unseen);
      sheet.castShadow = true;
      g.add(sheet);
      disposables.push(unseen);
    }
  }
  /**
   * A thing's picture stood upright where it was drawn (the owner, 2026-11-17: "ของบางอย่าง เช่นเก้าอี้หน้าเวที ดูลอย"): the
   * foot of its picture is the nearest of it, not its middle, so it stands on the ground point its lowest pixels were
   * drawn over. Stood on its middle, a low wide thing (a bench) hung in the air by half its depth.
   */
  function stood(o: Obj, cx: number, cz: number, unseen = false, blocked = false) {
    const sp = sprites[o[1]], ix = o[2] + sp[1] * o[4] / 2, iy = o[3] + sp[2] * o[4];
    card(o[1], { x: (ix / 32 + iy / 16) / 2, z: (iy / 16 - ix / 32) / 2, sx: cx, sz: cz, y: wetAt(cx, cz) ? WATER_Y : Hat(cx, cz), w: sp[1] * o[4] / PX_SIDE, h: sp[2] * o[4] / PX_UP, flip: o[5] === 1, unseen, blocked });
  }
  const stand = () => { const g = new THREE.Group(); town.add(g); return g; };
  const hallIn: { room: THREE.Mesh | null } = { room: null };
  const blocks: Array<[number, number, number, number, number, number]> = [];
  const chimneys: THREE.Vector3[] = [];
  const decked: Array<{ o: Obj; box: Box4; g: THREE.Group; bridge: boolean; /** How high its boards were drawn over the ground. */ up: number }> = [];

  OBJECTS.forEach((o, i) => {
    const name = names[o[0]], sp = sprites[o[1]];
    // (the kitchen hall from inside: its own picture of its room, on the floor and the two far walls)
    if (TOWN && i === T2_HALL.inside) { hallIn.room = behind(o); hallIn.room.position.y = Hat((o[8] + o[10]) / 2, (o[9] + o[11]) / 2); hallIn.room.visible = false; town.add(hallIn.room); return; }
    if (map.leftOut.has(i) || SKIP.test(name) || SEASONAL.test(name) || (o[6] === 4 && !map.shown?.test(name))) return;
    const box: Box4 = [o[8], o[9], o[10], o[11]], cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2;
    const tall = (sp[2] * o[4] - (box[2] - box[0] + box[3] - box[1]) * 16) / PX_UP;
    if (TOWN && i === T2_HALL.thing) { const g = stand(); buildHall(g, K, Math.max(3.6, tall)); dress(g, o); g.position.y = Hat(cx, cz); hall.upper = g; return; }
    if (TOWN && /^oval_wooden_festival_stage/.test(name)) { const g = stand(); buildStage(g, K); dress(g, o); g.position.y = Hat(cx, cz); return; }
    // (a bridge's or a pier's deck is laid below, tile by tile, and dressed there)
    if (TOWN && /^(bridge|fishing_pier|pier_of_mossy_stone)/.test(name)) { decked.push({ o, box, g: stand(), bridge: name === "bridge", up: /^fishing_pier/.test(name) ? 1.1 : 0.4 }); return; }
    if (o[6] === 2 || /^wishing_basin$/.test(name) || (o[6] === 4 && /^barn/.test(name))) {
      const g = stand(), built = buildThing(g, K, name, box, tall, map.plainHouses);
      // (the water wheel stands still: a picture of a wheel turned about is not a wheel turning; that wants frames of its own)
      if (built) {
        dress(g, o, undefined, /^(torii|village_gate|tall_wooden_village_gateway|trade_board_cloud|kosatsu_board_cloud)/.test(name));
        g.position.y = Hat(cx, cz);
        // (smoke: the bathhouse's chimney, the forge's kiln)
        if (name === "bathhouse") chimneys.push(new THREE.Vector3(box[0] + 1.5, Hat(cx, cz) + Math.min(8, tall) + 1.7, box[1] + 1.5));
        if (name === "forge") chimneys.push(new THREE.Vector3(cx - (box[2] - box[0] - 0.6) / 4, Hat(cx, cz) + 1.9, cz - (box[3] - box[1] - 0.6) / 5));
        return;
      }
      town.remove(g);
    }
    // (what a map calls floor, a pen's trodden yard, lies on the ground as flat things do)
    if (FLAT.test(name) || o[6] === 0) { flats.push({ s: o[1], o, wet: wetAt(cx, cz) }); return; }
    // A long thing (a bench, a fence, a boat) throws its shadow from a block on its own footprint, so the shadow joins
    // it along its whole length whatever the sun's side (the owner, 2026-11-17: "เก้าอี้นี้เงาไม่ติดกัน ช่วยแก้เคสเดียวกัน
    // ทั้งหมด"). A sheet turned to the sun, stood on its middle, joins only a thing that stands on one foot: a tree, a post.
    const bw = box[2] - box[0], bd = box[3] - box[1], long = Math.max(bw, bd) >= Math.min(bw, bd) * 1.5 && Math.max(bw, bd) >= 0.7;
    // A length of fence stands on a tile's edge, its footprint a tile about that edge's middle (the farm's `wall`): its
    // shadow is thrown from the edge itself, a thin block along it (the owner, 2026-11-17: "เงารั้วไม่ตรง", of the sheet
    // turned to the sun in the tile's middle, which lay across the fence and not along it).
    const fence = name === "wall" && Math.abs(bw - 1) < 0.01 && Math.abs(bd - 1) < 0.01, north = fence && Math.abs(box[1] % 1) > 0.25;
    if (fence) blocks.push([cx, cz, north ? 1 : 0.08, north ? 0.08 : 1, Math.max(0.4, (sp[2] * o[4] - 16) / PX_UP * 0.85), Hat(cx, cz)]);
    else if (long) blocks.push([cx, cz, bw * 0.92, bd * 0.92, Math.min(3, Math.max(0.25, tall)), wetAt(cx, cz) ? WATER_Y : Hat(cx, cz)]);
    stood(o, cx, cz, false, long || fence);
    const h = sp[2] * o[4] / PX_UP;
    if (LAMP.test(name)) lamps.push({ x: cx, y: h * 0.72 + Hat(cx, cz), z: cz, b: Hat(cx, cz) });
  });

  // woods beyond the town, so its edge is not the world's: the town's own trees, scattered on the woods' floor
  {
    const trees = sprites.map((sp, s) => ({ s, sp })).filter(({ sp }) => /cedar|zelkova|camphor|pine-|maple|ginkgo/.test(sp[0]));
    let seed = 12345;
    const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; trees.length && !below && n < 520; n++) {
      const x = WORLD.x0 + 2 + r() * (WORLD.x1 - WORLD.x0 - 4), z = WORLD.z0 + 2 + r() * (WORLD.z1 - WORLD.z0 - 4);
      if (inMap(x, z) || lookAt(x, z) !== 4) continue;
      const { s, sp } = trees[Math.floor(r() * trees.length)], k = 1.0 + r() * 0.35;
      card(s, { x, z, sx: x, sz: z, y: Hat(x, z), w: sp[1] * k / PX_SIDE, h: sp[2] * k / PX_UP, flip: r() < 0.5 });
    }
  }

  // every picture upright on its foot, one instanced set a picture; a second set, unseen, turned to the sun to cast its shadow
  const cardGeo = new THREE.PlaneGeometry(1, 1);
  cardGeo.translate(0, 0.5, 0);
  { const n = cardGeo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); }
  // A mirrored picture has its own sheet, mirrored in what it shows and not in its shape (the owner, 2026-11-17, of the
  // tulip bed: "แปลงดอกไม้ดูบั๊คแปลกๆ"): a sheet turned inside out to mirror it shows its back, and its back was lit
  // from below, so every mirrored tree, bush and flower in the town stood dark among the others.
  const cardFlip = cardGeo.clone();
  { const uv = cardFlip.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
  disposables.push(cardGeo, cardFlip);
  const cardSets: Array<{ list: Card[]; seen: THREE.InstancedMesh; shade: THREE.InstancedMesh }> = [];
  const picture = new Map<number, THREE.Texture>();
  const pictureOf = (s: number) => {
    let t = picture.get(s);
    if (!t) { t = loadTexture(pictures, `${DIR}/${sprites[s][0]}`); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; picture.set(s, t); disposables.push(t); }
    return t;
  };
  for (const [key, list] of cards) {
    const map = pictureOf(key >> 1), geo = key & 1 ? cardFlip : cardGeo;
    const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
    // what grows leans a little with the wind, each in its own time (its top moved, its foot still)
    if (SWAY.test(sprites[key >> 1][0])) {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.hdTime = clock; sh.uniforms.hdMe = meAt;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float hdTime;\nuniform vec2 hdMe;")
          .replace("#include <begin_vertex>", `#include <begin_vertex>
            #ifdef USE_INSTANCING
              float hdPh = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
              transformed.x += step(0.5, position.y) * (sin(hdTime * 1.3 + hdPh) * 0.02 + sin(hdTime * 2.9 + hdPh * 1.7) * 0.007);
              // (and leans away from whoever walks by its foot)
              vec2 hdBy = instanceMatrix[3].xz - hdMe;
              transformed.x += step(0.5, position.y) * (1.0 - smoothstep(0.25, 1.2, length(hdBy))) * sign(dot(hdBy, vec2(0.7071, -0.7071)) + 0.0001) * 0.1 / max(0.3, length(instanceMatrix[0].xyz));
            #endif`);
      };
      mat.customProgramCacheKey = () => "hd-sway";
    }
    const ghost = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
    const seen = new THREE.InstancedMesh(geo, mat, list.length), shade = new THREE.InstancedMesh(geo, ghost, list.length);
    shade.castShadow = true;
    seen.frustumCulled = shade.frustumCulled = false;
    seen.visible = !below;
    litShown.push(seen);
    town.add(seen, shade);
    cardSets.push({ list, seen, shade });
    disposables.push(mat, ghost);
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function faceCards(yaw: number) {
    Q.setFromAxisAngle(UP, yaw);
    for (const { list, seen } of cardSets) {
      list.forEach((c, i) => seen.setMatrixAt(i, M.compose(V.set(c.x, c.y, c.z), Q, c.unseen ? S.set(0, 0, 0) : S.set(c.w, c.h, 1))));
      seen.instanceMatrix.needsUpdate = true;
    }
  }
  function shadeCards() {
    Q.setFromAxisAngle(UP, Math.atan2(sunDir.x, sunDir.z));
    for (const { list, shade } of cardSets) {
      list.forEach((c, i) => shade.setMatrixAt(i, M.compose(V.set(c.sx, c.y, c.sz), Q, c.blocked ? S.set(0, 0, 0) : S.set(c.w, c.h, 1))));
      shade.instanceMatrix.needsUpdate = true;
    }
  }

  {
    const unit = new THREE.BoxGeometry(1, 1, 1), unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    const cast = new THREE.InstancedMesh(unit, unseen, blocks.length);
    const I = new THREE.Quaternion();
    blocks.forEach(([x, z, w, d, up, y], i) => cast.setMatrixAt(i, M.compose(V.set(x, y + up / 2, z), I, S.set(w, up, d))));
    cast.castShadow = true;
    cast.frustumCulled = false;
    town.add(cast);
    disposables.push(unit, unseen);
  }

  // what lies flat (stepping stones, lotus leaves, flower beds): its picture laid back onto the ground it was drawn on
  for (const { s, o, wet } of flats) {
    const sp = sprites[s], w = sp[1] * o[4], h = sp[2] * o[4], y = flat ? 0.03 : wet ? WATER_Y + 0.02 : Hat((o[8] + o[10]) / 2, (o[9] + o[11]) / 2) + 0.03;
    const at = (ix: number, iy: number) => [(ix / 32 + iy / 16) / 2, y, (iy / 16 - ix / 32) / 2];
    const geo = new THREE.BufferGeometry(), flip = o[5] === 1;
    geo.setAttribute("position", new THREE.Float32BufferAttribute([...at(o[2], o[3] + h), ...at(o[2] + w, o[3] + h), ...at(o[2] + w, o[3]), ...at(o[2], o[3])], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(flip ? [1, 0, 0, 0, 0, 1, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const mat = new THREE.MeshLambertMaterial({ map: pictureOf(s), alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    if (below) { m.visible = false; litShown.push(m); }
    town.add(m);
    disposables.push(geo, mat);
  }

  // decks: every tile of a bridge or a pier, in four boards, each at its own height (a bridge rises to its middle);
  // under a bridge's or a pier's own picture its boards wear that picture, elsewhere they are plain boards
  {
    const at: Array<[number, number, number]> = [], legAt: Array<[number, number, number]> = [], raised: Array<[number, number, number]> = [];
    const slab = new THREE.BoxGeometry(0.5, 0.16, 0.5), leg = new THREE.BoxGeometry(0.14, 0.9, 0.14);
    const railX = new THREE.BoxGeometry(1, 0.1, 0.1), railZ = new THREE.BoxGeometry(0.1, 0.1, 1), stub = new THREE.BoxGeometry(0.12, 0.62, 0.12);
    const lay = (g: THREE.Group, geo: THREE.BufferGeometry, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, K.planks); m.position.set(x, y, z); g.add(m); };
    for (let z = map.y0; z < map.y0 + map.rows; z++) for (let x = map.x0; x < map.x0 + map.cols; x++) {
      if (!TOWN || !isDeck(x, z) || t2OnStage(x, z)) continue;
      // (a deck's picture reaches a little past its footprint, to the shore it joins)
      const own = decked.find((q) => x + 0.5 >= q.box[0] - 1 && x + 0.5 <= q.box[2] + 1 && z + 0.5 >= q.box[1] - 1 && z + 0.5 <= q.box[3] + 1);
      for (const [dx, dz] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const bx = x + dx, bz = z + dz, by = lift(bx, bz) / PX_UP;
        const legged = wetAt(bx, bz) && Math.floor(bx * 2) % 4 === 0 && Math.floor(bz * 2) % 4 === 0;
        if (own) { lay(own.g, slab, bx, by - 0.05, bz); if (legged) lay(own.g, leg, bx, by - 0.55, bz); }
        else { at.push([bx, by, bz]); if (legged) legAt.push([bx, by, bz]); }
      }
      // (a pier is drawn standing on legs, though it is walked at the ground's height: its shadow is thrown from where
      // it was drawn; the owner, 2026-11-17: "ที่ตกปลาไม่มีเงา make sure หน่อยว่า ทุกอย่างจะมีเงา")
      if (own && !own.bridge && lift(x + 0.5, z + 0.5) / PX_UP < 0.3) raised.push([x, z, own.up]);
      if (!own?.bridge) continue;
      const b = own.box, along = b[2] - b[0] >= b[3] - b[1], up = lift(x + 0.5, z + 0.5) / PX_UP;
      const rail = (rx: number, rz: number, isX: boolean) => { lay(own.g, isX ? railX : railZ, rx, up + 0.62, rz); lay(own.g, stub, rx, up + 0.33, rz); };
      if (along) { if (!isDeck(x, z - 1)) rail(x + 0.5, z + 0.06, true); if (!isDeck(x, z + 1)) rail(x + 0.5, z + 0.94, true); }
      else { if (!isDeck(x - 1, z)) rail(x + 0.06, z + 0.5, false); if (!isDeck(x + 1, z)) rail(x + 0.94, z + 0.5, false); }
    }
    for (const q of decked) dress(q.g, q.o);
    // (and what stands shut on a pier, with its boards on two sides of it or more: a hut, its stacked boxes)
    for (const q of decked) if (q.up > 1) for (let z = Math.floor(q.box[1]); z <= q.box[3]; z++) for (let x = Math.floor(q.box[0]); x <= q.box[2]; x++) {
      if (t2Tile(x, z) === "=" || !inT2(x, z)) continue;
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => t2Tile(x + dx, z + dz) === "=").length;
      if (sides >= 2) raised.push([x, z, 2.6]);
    }
    {
      const tile = new THREE.BoxGeometry(1, 1, 1), unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      const cast = new THREE.InstancedMesh(tile, unseen, raised.length);
      raised.forEach(([x, z, up], i) => cast.setMatrixAt(i, M.compose(V.set(x + 0.5, up / 2, z + 0.5), Q.identity(), S.set(1, up, 1))));
      cast.castShadow = true;
      town.add(cast);
      disposables.push(tile, unseen);
    }
    const boards = new THREE.InstancedMesh(slab, K.planks, at.length), legs = new THREE.InstancedMesh(leg, K.post, legAt.length);
    at.forEach(([x, y, z], i) => boards.setMatrixAt(i, M.makeTranslation(x, y - 0.05, z)));
    legAt.forEach(([x, y, z], i) => legs.setMatrixAt(i, M.makeTranslation(x, y - 0.55, z)));
    for (const m of [boards, legs]) { m.castShadow = true; m.receiveShadow = true; m.visible = !below; town.add(m); }
    disposables.push(slab, leg, railX, railZ, stub);
  }

  if (opts.showWalk) {
    const P: number[] = [], I: number[] = [];
    for (let z = map.y0; z < map.y0 + map.rows; z++) for (let x = map.x0; x < map.x0 + map.cols; x++) {
      if (!step(x, z, x, z)) continue;
      const n = P.length / 3, e = 0.06;
      for (const [dx, dz] of [[e, e], [1 - e, e], [1 - e, 1 - e], [e, 1 - e]]) P.push(x + dx, lift(x + dx, z + dz) / PX_UP + Hat(x + dx, z + dz) + 0.12, z + dz);
      I.push(n, n + 2, n + 1, n, n + 3, n + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    geo.setIndex(I);
    const mat = new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.4, depthTest: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 5;
    scene.add(m);
    disposables.push(mat);
  }

  /* ── lanterns ─────────────────────────────────────────────────────────── */
  const glowTex = skin.glow();
  disposables.push(glowTex);
  const haloMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false });
  const poolGeo = new THREE.PlaneGeometry(5.5, 5.5);
  poolGeo.rotateX(-Math.PI / 2);
  disposables.push(haloMat, poolMat, poolGeo);
  const lit = new THREE.Group();
  for (const l of lamps) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(l.x, l.y, l.z); halo.scale.setScalar(1.7);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(l.x, l.b + 0.04, l.z);
    lit.add(halo, pool);
  }
  lit.visible = false;
  scene.add(lit);
  const near = Array.from({ length: quality === "low" ? 0 : lite ? 3 : 5 }, () => { const p = new THREE.PointLight(0xffb060, 0, 9, 1.4); scene.add(p); return p; });

  /* ── the test character ───────────────────────────────────────────────── */
  const DOLL = { w: 120, h: 150, foot: 142, scale: 1.5 };
  const dollCanvas = document.createElement("canvas");
  dollCanvas.width = DOLL.w; dollCanvas.height = DOLL.h;
  const dollCtx = dollCanvas.getContext("2d")!;
  const dollTex = new THREE.CanvasTexture(dollCanvas);
  dollTex.colorSpace = THREE.SRGBColorSpace;
  dollTex.magFilter = THREE.NearestFilter; dollTex.minFilter = THREE.LinearFilter; dollTex.generateMipmaps = false;
  const dw = DOLL.w / DOLL.scale / PX_SIDE, dh = DOLL.h / DOLL.scale / PX_UP, dfoot = (DOLL.h - DOLL.foot) / DOLL.scale / PX_UP;
  const dollGeo = new THREE.PlaneGeometry(dw, dh);
  dollGeo.translate(0, dh / 2 - dfoot, 0);
  { const n = dollGeo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); }
  const dollMat = new THREE.MeshLambertMaterial({ map: dollTex, alphaTest: 0.5, side: THREE.DoubleSide });
  // It stands in the scene's light: an edge of sun on the side the sun is, and the dark of a house's shadow over all of
  // it when its body is in that shadow (asked at one point of it, before its own shadow's sheet, so it is in or out whole).
  const rim = { value: new THREE.Vector3() }, rimCol = { value: new THREE.Color() }, body = { value: new THREE.Vector3() };
  dollMat.onBeforeCompile = (sh) => {
    sh.uniforms.hdRim = rim; sh.uniforms.hdRimCol = rimCol; sh.uniforms.hdBody = body;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec3 hdBody;")
      .replace("#include <shadowmap_vertex>", `#include <shadowmap_vertex>
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * vec4( hdBody, 1.0 );
        #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 hdRim;\nuniform vec3 hdRimCol;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb += hdRimCol * (1.0 - texture2D(map, vMapUv + hdRim.xy).a) * hdRim.z;
        #endif`);
  };
  const dollGhost = new THREE.MeshLambertMaterial({ map: dollTex, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
  const doll = new THREE.Mesh(dollGeo, dollMat), dollShade = new THREE.Mesh(dollGeo, dollGhost);
  dollShade.castShadow = true;
  doll.receiveShadow = !map.indoors;
  // (behind a house I am still seen, faintly: the same picture drawn over whatever stands before me)
  const dollThrough = new THREE.MeshBasicMaterial({ map: dollTex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, fog: false });
  const dollOver = new THREE.Mesh(dollGeo, dollThrough);
  dollOver.renderOrder = 10;
  doll.visible = dollShade.visible = dollOver.visible = false;
  scene.add(doll, dollShade, dollOver);
  // On boards (a pier, a bridge, the stage, their stairs) my shadow has no ground to fall on: the boards wear a picture
  // and take no shadow. A small dark round under my feet says where I stand on them, and on stairs I rise and dip with
  // each step (the owner, 2026-11-17, of the pier's stairs: "ต้องรู้สึกว่าเดินขึ้นไปแล้วสูงขึ้น").
  const underGeo = new THREE.CircleGeometry(0.34, 20);
  underGeo.rotateX(-Math.PI / 2);
  const underMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const under = new THREE.Mesh(underGeo, underMat);
  under.scale.set(1, 1, 0.62);
  under.renderOrder = 2;
  scene.add(under);
  disposables.push(underGeo, underMat);
  const onStairs = () => TOWN && ((me.z >= 63 && me.z < 65 && me.x >= 19 && me.x < 21.2) || (t2OnStage(Math.floor(me.x), Math.floor(me.z)) && lift(me.x, me.z) < T2_STAGE_UP - 1));
  disposables.push(dollTex, dollGeo, dollMat, dollGhost, dollThrough);

  let kit: PixelKit | null = null;
  const look: Look = defaultLook("hd2d-test");
  const start = (opts.at && nearestOpen(opts.at.x, opts.at.y)) ?? nearestOpen(map.start.x, map.start.y, 12) ?? { x: Math.floor(map.start.x), y: Math.floor(map.start.y) };
  const me = { x: start.x + 0.5, z: start.y + 0.5, y: 0, view: "front" as View, mirror: false, walking: false, drawn: "" };
  let way: P[] = [];
  loadPixelKit(look.race).then(async (k) => {
    await k.ready(look);
    if (dead) return;
    kit = k;
    doll.visible = dollShade.visible = dollOver.visible = !below;
    came.doll = true;
  }).catch(() => { came.doll = true; /* the town is walked without a body rather than not at all */ });

  function drawDoll(t: number) {
    if (!kit) return;
    const stepNo = me.walking ? Math.floor(t * WALK_FPS) % 4 : -1, blink = !me.walking && t % 4.2 < 0.14;
    const key = `${me.view}${me.mirror ? 1 : 0}${stepNo}${blink ? 1 : 0}`;
    if (key === me.drawn) return;
    me.drawn = key;
    dollCtx.clearRect(0, 0, DOLL.w, DOLL.h);
    kit.draw(dollCtx, look, me.view, me.mirror, DOLL.w / 2, DOLL.foot, DOLL.scale, { step: stepNo < 0 ? undefined : stepNo, blink, smooth: false });
    dollTex.needsUpdate = true;
  }

  /* ── light and air ────────────────────────────────────────────────────── */
  scene.add(camera);
  const post = opts.fx === false || quality === "low" || below ? null : makePost(renderer, scene, camera, lite);
  const air = opts.fx === false || map.indoors || quality === "low" || below ? null : makeAir(scene, camera, { small: lite, fore: null, heightAt: Hat, wetAt, chimneys, ratio: Math.min(window.devicePixelRatio || 1, 2) });

  /* ── the view ─────────────────────────────────────────────────────────── */
  // (the owner, 2026-11-17: "กล้องตายตัว". The one view is the one the town's pictures were drawn from: across the tiles'
  // corners, 30° down; so a picture laid back onto its shape is seen as it was drawn.)
  const PITCH = Math.PI / 6, YAW = Math.PI / 4;
  const view = { yaw: YAW, yawTo: YAW, dist: 30, distTo: 30, at: new THREE.Vector3(me.x, 0, me.z) };
  let facedYaw = NaN, shadedFor = "", lens = 0.25, perUnit = 40;
  /*
   * The view has no vanishing point (the owner, 2026-11-17: "บางโมเดลยังดูเบี้ยวๆ ลอยๆ", then "ดูภาพมันเลื่อนๆ ดูแล้วเวียนหัว").
   * A picture laid on a shape that is not quite its own is seen true only along the lines it was drawn by; a lens that
   * spreads sees it askew, and differently at each place on the screen, so a house swam as one walked by. Straight
   * lines of sight show every picture as it was drawn, wherever it stands. The depth is still there: in what hides
   * what, and in the shadows.
   */
  function frame2(dist: number) {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, half = dist * lens;
    camera.top = half; camera.bottom = -half; camera.right = half * w / h; camera.left = -half * w / h;
    camera.updateProjectionMatrix();
    perUnit = (h * renderer.getPixelRatio()) / (half * 2);
  }
  const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)), UPV = new THREE.Vector3(-Math.sin(YAW) * Math.sin(PITCH), Math.cos(PITCH), -Math.cos(YAW) * Math.sin(PITCH));
  const eye = new THREE.Vector3();
  function resize() {
    if (below) return; // (the live town says the size, each frame)
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "low" ? 1 : lite ? 1.5 : 2));
    renderer.setSize(w, h, false);
    post?.setSize(w, h, renderer.getPixelRatio());
    // (an upright screen sees less across: the camera stands back a little, by its field of view)
    // (an upright screen sees less across, so it sees a little more up and down)
    lens = Math.tan(((w < h ? 36 : 28) * Math.PI) / 360);
    frame2(view.dist);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  /* ── walking ──────────────────────────────────────────────────────────── */
  const keys = new Set<string>();
  const MOVE: Record<string, [number, number]> = {
    KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
  };
  const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
  const onKeyDown = (e: KeyboardEvent) => {
    if (below || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    // (the arrows are the page's own while a link or a button has the focus: only the letters walk from there)
    const t = e.target as HTMLElement | null, elsewhere = !!t && t !== canvas && !!t.closest?.("a,button,select,[role=button],[tabindex]");
    if (elsewhere && e.code.startsWith("Arrow")) return;
    if (MOVE[e.code]) { keys.add(e.code); way = []; e.preventDefault(); }
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.code); };
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  // (what is tapped may stand raised, the stage's top or a bridge's boards: the tap is read at each height something is
  // walked at, highest first, and taken where the ground under it is at that height)
  const HEIGHTS = [T2_STAGE_UP / PX_UP, 17 / PX_UP, 0];
  function walkTo(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let to: P | null = null;
    for (const up of HEIGHTS) {
      // (the ground is not level: the tap is read again at the height of the ground it first found, a few times)
      let h = up, met = false;
      for (let n = 0; n < (up > 0 ? 1 : 4); n++) {
        floor.constant = -h;
        met = !!ray.ray.intersectPlane(floor, hit);
        if (!met) break;
        if (up === 0) h = Hat(hit.x, hit.z);
      }
      if (!met || (up > 0 && Math.abs(lift(hit.x, hit.z) / PX_UP - up) > 0.2)) continue;
      to = nearestOpen(hit.x, hit.z, 3);
      if (to) break;
    }
    const from = { x: Math.floor(me.x), y: Math.floor(me.z) };
    if (!to) return;
    const found = findWay(from, to);
    if (found) way = found;
  }
  const touches = new Map<number, { x: number; y: number; x0: number; y0: number; t: number }>();
  let pinch = 0;
  const onDown = (e: PointerEvent) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() });
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  };
  const onMove = (e: PointerEvent) => {
    const p = touches.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (touches.size === 2 && pinch > 0) {
      const [a, b] = [...touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) { api.zoom(pinch / d); pinch = d; }
    }
  };
  const onUp = (e: PointerEvent) => {
    const p = touches.get(e.pointerId), many = touches.size > 1;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
    if (!p || many || e.type === "pointercancel") return;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) < 10 && performance.now() - p.t < 600) walkTo(e.clientX, e.clientY);
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); api.zoom(Math.exp(e.deltaY * 0.0012)); };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const SPEED = 4.4;
  /** (stairs are climbed, not run up) */
  const pace = () => (onStairs() ? 0.6 : 1);
  // Walked by the keys, a body has a width (the owner, 2026-11-17: "จุดที่เดินผ่านไม่ได้ ยังไม่ถูกต้อง"): it stops short of a
  // wall, a rail or a deck's edge by that much, not with its middle on the line and half of it through.
  const BODY = 0.3;
  function tryMove(dx: number, dz: number) {
    const tx = Math.floor(me.x), tz = Math.floor(me.z);
    const ok = (x: number, z: number) => {
      for (const ox of [-BODY, BODY]) for (const oz of [-BODY, BODY]) {
        const qx = Math.floor(x + ox), qz = Math.floor(z + oz);
        if ((qx !== tx || qz !== tz) && !step(tx, tz, qx, qz)) return false;
      }
      return step(tx, tz, Math.floor(x), Math.floor(z));
    };
    const nx = me.x + dx, nz = me.z + dz;
    if (ok(nx, nz)) { me.x = nx; me.z = nz; }
    else if (dx && ok(nx, me.z)) me.x = nx;
    else if (dz && ok(me.x, nz)) me.z = nz;
  }
  function face(dx: number, dz: number) {
    // across and towards the viewer, as the view is turned
    const across = dx * Math.cos(view.yaw) - dz * Math.sin(view.yaw), towards = dx * Math.sin(view.yaw) + dz * Math.cos(view.yaw);
    if (Math.abs(towards) > 0.05) me.view = towards > 0 ? "front" : "back";
    if (Math.abs(across) > 0.05) me.mirror = across < 0;
  }
  function walk(dt: number) {
    let kx = 0, kz = 0;
    for (const k of keys) { const m = MOVE[k]; if (m) { kx += m[0]; kz += m[1]; } }
    me.walking = false;
    if (kx || kz) {
      const n = Math.hypot(kx, kz), ax = kx / n, az = kz / n;
      // the keys are the screen's: turned into the world by the view
      const dx = ax * Math.cos(view.yaw) + az * Math.sin(view.yaw), dz = -ax * Math.sin(view.yaw) + az * Math.cos(view.yaw);
      const bx = me.x, bz = me.z;
      tryMove(dx * SPEED * pace() * dt, dz * SPEED * pace() * dt);
      face(dx, dz);
      me.walking = bx !== me.x || bz !== me.z;
    } else if (way.length) {
      let left = SPEED * pace() * dt;
      while (way.length && left > 0) {
        const to = way[0], dx = to.x - me.x, dz = to.y - me.z, d = Math.hypot(dx, dz);
        if (d <= left) { me.x = to.x; me.z = to.y; left -= d; way.shift(); if (d > 0.001) face(dx, dz); }
        else { me.x += (dx / d) * left; me.z += (dz / d) * left; left = 0; face(dx, dz); }
      }
      me.walking = true;
    }
    const up = lift(me.x, me.z) / PX_UP + Hat(me.x, me.z);
    me.y += (up - me.y) * Math.min(1, dt * 14);
  }

  /* ── a frame ──────────────────────────────────────────────────────────── */
  /** The hour's light at a minute of the day: between the hours' own lights, as the day goes. */
  const DAY: Array<[number, TimeId]> = [[0, "night"], [270, "night"], [390, "morning"], [630, "day"], [900, "day"], [1050, "evening"], [1170, "night"], [1440, "night"]];
  function hourOf(min: number): [TimeId, TimeId, number] {
    const m = ((min % 1440) + 1440) % 1440;
    for (let i = 0; i < DAY.length - 1; i++) if (m < DAY[i + 1][0]) { const t = (m - DAY[i][0]) / (DAY[i + 1][0] - DAY[i][0]); return [DAY[i][1], DAY[i + 1][1], t * t * (3 - 2 * t)]; }
    return ["night", "night", 0];
  }
  function blend(A: Sky, B: Sky, k: number) {
    for (let i = 0; i < 3; i++) { now.sun[i] = mix(A.sun[i], B.sun[i], k); now.grade[i] = mix(A.grade[i], B.grade[i], k); }
    for (let i = 0; i < now.air.length; i++) now.air[i] = mix(A.air[i], B.air[i], k);
    now.sunI = mix(A.sunI, B.sunI, k); now.hemiI = mix(A.hemiI, B.hemiI, k); now.lamps = mix(A.lamps, B.lamps, k);
    now.sunCol = mixHex(A.sunCol, B.sunCol, k); now.top = mixHex(A.top, B.top, k);
    now.ground = mixHex(A.ground, B.ground, k); now.sky = mixHex(A.sky, B.sky, k);
  }
  let sized = { w: 0, h: 0, d: 0 };
  let clockMin: number | null = null, raining = false, wet = 0, dusted = 0, wasIn = !!map.indoors, dark = 0, room = map.indoors ? 1 : 0, slow = 0, spent = false;
  let last = performance.now(), frames = 0, since = last, raf = 0, ready = false, lampTick = 0;
  function frame(t: number) {
    if (dead) return;
    if (!below) raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000), sec = t / 1000;
    last = t;
    walk(dt);

    // the sky moves towards the hour asked for
    if (clockMin !== null) { const q = hourOf(clockMin); blend(SKIES[q[0]], SKIES[q[1]], q[2]); }
    else if (turned < 1) { turned = Math.min(1, turned + dt / 1.4); blend(from, want, turned * turned * (3 - 2 * turned)); }
    wet += ((raining ? 1 : 0) - wet) * Math.min(1, dt * 0.6);
    wetU.value = wet; meAt.value.set(me.x, me.z);
    const flick = 1 + 0.07 * Math.sin(sec * 9.1) + 0.05 * Math.sin(sec * 23.7);
    sunDir.set(now.sun[0], now.sun[1], now.sun[2]).normalize();
    sun.color.setHex(now.sunCol); sun.intensity = now.sunI * (1 - 0.5 * wet);
    hemi.color.setHex(now.top); hemi.groundColor.setHex(now.ground); hemi.intensity = now.hemiI;
    (scene.background as THREE.Color).setHex(now.sky);
    scene.fog!.color.setHex(now.sky);
    const shadeKey = `${sunDir.x.toFixed(2)},${sunDir.z.toFixed(2)}`;
    if (shadeKey !== shadedFor) { shadedFor = shadeKey; shadeCards(); }

    // lanterns and windows
    const lampsOn = now.lamps;
    lit.visible = lampsOn > 0.02;
    haloMat.opacity = lampsOn * 0.42 * flick; poolMat.opacity = lampsOn * 0.2 * flick;
    for (const m of Object.values(K.walls)) m.emissiveIntensity = lampsOn * 1.5;
    for (const m of artMats.values()) m.emissiveIntensity = lampsOn * 1.3;
    K.lantern.emissiveIntensity = 0.15 + lampsOn * 1.6; K.ember.emissiveIntensity = 0.6 + lampsOn * 1.2;
    if (sec - lampTick > 0.25) {
      lampTick = sec;
      const by = lamps.map((l) => ({ l, d: (l.x - me.x) ** 2 + (l.z - me.z) ** 2 })).sort((a, b) => a.d - b.d);
      near.forEach((p, i) => { const q = by[i]; if (q) p.position.set(q.l.x, q.l.y, q.l.z); p.visible = !!q && lampsOn > 0.02; });
    }
    // (the owner, 2026-11-17: "ตอนกลางคืนโคมสว่างเวอร์ไปหน่อย เอาให้สว่างพอดีๆ")
    for (const p of near) p.intensity = lampsOn * 6 * flick;

    // the view follows
    view.yaw += (view.yawTo - view.yaw) * Math.min(1, dt * 9);
    view.dist += (view.distTo - view.dist) * Math.min(1, dt * 10);
    view.at.lerp(V.set(me.x, me.y + 0.6, me.z), Math.min(1, dt * 12));
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    frame2(view.dist);
    // (the view moves a whole pixel of the screen at a time: between pixels the town's pixels crawl)
    const ar = view.at.dot(RIGHT), au = view.at.dot(UPV);
    eye.copy(view.at).addScaledVector(RIGHT, Math.round(ar * perUnit) / perUnit - ar).addScaledVector(UPV, Math.round(au * perUnit) / perUnit - au);
    camera.position.set(eye.x + Math.sin(view.yaw) * cp * 250, eye.y + sp * 250, eye.z + Math.cos(view.yaw) * cp * 250);
    camera.lookAt(eye);
    (scene.fog as THREE.Fog).near = 250 + view.dist * 1.6; (scene.fog as THREE.Fog).far = 250 + view.dist * 5;
    if (!(Math.abs(view.yaw - facedYaw) <= 0.001)) { facedYaw = view.yaw; faceCards(view.yaw); }

    // the sun stands over where I look, its shadows a texel at a time so they do not swim
    const texel = (REACH * 2) / SH, ax = Math.round(view.at.x / texel) * texel, az = Math.round(view.at.z / texel) * texel;
    sun.target.position.set(ax, 0, az);
    sun.position.set(ax + sunDir.x * 90, sunDir.y * 90, az + sunDir.z * 90);

    // me
    drawDoll(sec);
    const boards = isDeck(Math.floor(me.x), Math.floor(me.z)) || lift(me.x, me.z) > 0 || onStairs();
    const hop = me.walking && onStairs() ? Math.abs(Math.sin(sec * 11)) * 0.07 : 0;
    doll.position.set(me.x, me.y + hop, me.z); doll.rotation.y = view.yaw;
    under.position.set(me.x, me.y + 0.1, me.z);
    underMat.opacity += ((boards && kit ? 0.3 : 0) - underMat.opacity) * Math.min(1, dt * 10);
    dollShade.position.copy(doll.position); dollShade.rotation.y = Math.atan2(sunDir.x, sunDir.z);
    dollOver.position.copy(doll.position); dollOver.rotation.y = view.yaw;
    if (opts.nameEl) {
      // (after the camera is placed this frame: its matrices are made here so the plate does not trail a frame behind)
      camera.updateMatrixWorld();
      // (under its feet, as the town's own names are: the owner, 2026-11-17, "ชื่อควรจะอยู่ด้านล่างตัวลคร ไม่ใช่ด้านบน")
      V.set(me.x, me.y, me.z).project(camera);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      opts.nameEl.style.transform = `translate3d(${Math.round((V.x * 0.5 + 0.5) * w)}px, ${Math.round((-V.y * 0.5 + 0.5) * h)}px, 0) translate(-50%, 4px)`;
      opts.nameEl.style.visibility = kit ? "visible" : "hidden";
    }
    const indoors = TOWN && t2InHall(Math.floor(me.x), Math.floor(me.z));
    if (hall.upper) hall.upper.visible = !indoors;
    if (hallIn.room) hallIn.room.visible = indoors;

    waterTex.offset.set(sec * 0.012, sec * 0.02);
    clock.value = sec; cloudy.value = now.air[7];
    glint.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(0.13 * now.sunI);
    const sx = sunDir.dot(RIGHT), sy = sunDir.dot(UPV), sl = Math.hypot(sx, sy) || 1;
    rim.value.set((sx / sl) * 1.6 / DOLL.w, (sy / sl) * 1.6 / DOLL.h, 0.16 * now.sunI);
    rimCol.value.copy(sun.color);
    body.value.set(me.x + sunDir.x * 0.45, me.y + 0.8, me.z + sunDir.z * 0.45);
    // Indoors the light is the room's: warmer, closer about the corners. Going in or out the picture goes dark and comes back.
    const inRoom = !!map.indoors || (TOWN && t2InHall(Math.floor(me.x), Math.floor(me.z)));
    if (inRoom !== wasIn) { wasIn = inRoom; dark = 1; }
    dark = Math.max(0, dark - dt * 2.4);
    room += ((inRoom ? 1 : 0) - room) * Math.min(1, dt * 4);
    const lightUp = (1 - dark * dark) * (1 - 0.08 * wet * (1 - room));
    // (by day the sun does most of it; at night the lamps are the room's whole light)
    for (const l of hearths) l.intensity = room * (4 + 9 * now.lamps) * flick;
    if (!spent) post?.look(
      [mix(now.grade[0], 1.08, room * 0.8) * lightUp, mix(now.grade[1], 1.0, room * 0.8) * lightUp, mix(now.grade[2], 0.88, room * 0.8) * lightUp * (1 + 0.03 * wet * (1 - room))],
      now.air[0] * (1 - 0.15 * wet), now.air[1] + 0.14 * room, now.air[2]);
    if (me.walking && sec - dusted > 0.22 && wet < 0.3) { const l = lookAt(me.x, me.z); if (l === 2 || l === 3) { dusted = sec; air?.puff(me.x, me.y + 0.08, me.z); } }
    air?.update(dt, sec, view.at, view.dist * lens, (canvas.clientWidth || 1) / (canvas.clientHeight || 1), {
      motes: now.air[3] * (1 - wet) * 0.5, flies: now.air[4] * (1 - wet), mist: Math.max(now.air[5], wet * 0.5), rays: now.air[6] * (1 - wet) * 0.6, rain: wet, dry: inRoom && TOWN ? T2_HALL.box : null, dim: now.lamps, petals: TOWN ? (1 - now.lamps) * 0.4 : 0, smoke: 1, sunX: sx, sunY: sy, sun: sun.color,
    });
    for (const s of spins) s.rotation.z = -sec * 0.5;

    if (post && !spent) post.render(); else renderer.render(scene, camera);
    if (!ready && ((came.pictures && came.doll) || t - came.since > 25000)) { ready = true; opts.onReady?.(); }
    frames++;
    if (t - since >= 1000) {
      const fps = Math.round((frames * 1000) / (t - since));
      opts.onFps?.(fps);
      // a device that cannot keep up is given the plain scene: three slow seconds running, and the glow and colour are let go
      slow = ready && fps < 24 && document.hasFocus() ? slow + 1 : 0;
      if (slow >= 3 && !opts.quality && post && !spent) spent = true;
      frames = 0; since = t;
    }
  }
  raf = requestAnimationFrame(frame);
  const onVisible = () => { last = performance.now(); };
  document.addEventListener("visibilitychange", onVisible);

  let sheets: Sheets | null = null, reached = REACH;
  let surf: THREE.Mesh | null = null;
  const surfClock = { value: 0 }, surfGlint = { value: 0.3 }, surfWet = { value: 0 };
  const api: HdTown = {
    setTime(t) { if (clockMin === null && SKIES[t] === want) return; clockMin = null; from = copy(now); want = SKIES[t]; turned = 0; },
    setClock(min) { clockMin = min; },
    ready: () => came.pictures,
    renderAt(v) {
      if (below && !sheets) sheets = createSheets(scene);
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch));
      // (a lower share is drawn on fewer pixels and laid out larger: the ground is soft enough to bear it)
      const dpr = Math.min(v.dpr, quality === "low" ? 1 : lite && flat ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const sec = performance.now() / 1000, q = hourOf(v.min);
      blend(SKIES[q[0]], SKIES[q[1]], q[2]);
      sunDir.set(now.sun[0], now.sun[1], now.sun[2]).normalize();
      // Lit to the ground's own colours and no further: the live town lays its own night, weather and lamps over the
      // picture. What the sun adds here is where its shadows fall, and how deep they are (shallow by night).
      // (by night the moon's shadows are kept plain to see: at a fifth of the day's depth they were not seen at all under the
      // live town's night; the owner, 2026-11-17, at night: "ยังไม่มีเงา 3d")
      // (a shadow is half as bright as the lit ground by day, a little less deep by night, however high the sun stands)
      // (deeper by night, not shallower: the live town's night darkens lit and shadowed ground alike, and what was left
      // between them was too little to see; the owner, 2026-11-17: "เห็นเงาแล้ว แต่เงากลางคินจางเกิน")
      const sunI = ((0.5 + 0.16 * now.lamps) * Math.PI) / Math.max(0.3, sunDir.y);
      sun.color.setHex(0xffffff); sun.intensity = sunI;
      hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0xffffff); hemi.intensity = Math.PI - sunI * sunDir.y;
      (scene.background as THREE.Color).setHex(0xffffff);
      (scene.fog as THREE.Fog).near = 1e5; (scene.fog as THREE.Fog).far = 1e6;
      const shadeKey = `${sunDir.x.toFixed(2)},${sunDir.z.toFixed(2)}`;
      if (shadeKey !== shadedFor) { shadedFor = shadeKey; shadeCards(); }
      if (v.stands && !flat) for (const s of v.stands) s.up = Hat(s.x, s.y);
      sheets?.set(v.stands ?? [], sunDir);
      clock.value = sec; cloudy.value = 0; wetU.value = 0;
      glint.value.setScalar(0.16 * (1 - now.lamps));
      waterTex.offset.set(sec * 0.012, sec * 0.02);
      // the live town's own camera: a point of the ground at the view's middle, and so many of the screen's pixels a tile
      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      // (the shadows' pixels on the view and a little about it, not on the whole map: ./shade's reachOf)
      const reach = Math.ceil(reachOf(v));
      if (reach !== reached) { reached = reach; Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach }); sun.shadow.camera.updateProjectionMatrix(); }
      const texel = (reach * 2) / SH, ax = Math.round(eye.x / texel) * texel, az = Math.round(eye.z / texel) * texel;
      sun.target.position.set(ax, 0, az);
      sun.position.set(ax + sunDir.x * 90, sunDir.y * 90, az + sunDir.z * 90);
      renderer.render(scene, camera);
      probe(renderer, camera, v, sunDir, flat ? undefined : Hat);
      return renderer.domElement;
    },
    wetAt: (x, y) => wetAt(x, y),
    heightAt: (x, y) => (flat ? 0 : Hat(x, y)),
    renderGround(v, wet) {
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite && flat ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const sec = performance.now() / 1000, q = hourOf(v.min);
      blend(SKIES[q[0]], SKIES[q[1]], q[2]);
      // (in its own colours and no more: the shadows and the slopes' shade come with the shadows' picture, laid over it)
      sun.intensity = 0;
      hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0xffffff); hemi.intensity = Math.PI;
      (scene.background as THREE.Color).setHex(0x24352a);
      (scene.fog as THREE.Fog).near = 1e5; (scene.fog as THREE.Fog).far = 1e6;
      clock.value = sec; cloudy.value = 0; wetU.value = wet;
      glint.value.setScalar(0.3 * (1 - 0.8 * now.lamps) * (1 - 0.6 * wet));
      waterTex.offset.set(sec * 0.012, sec * 0.02);
      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      if (land) land.mesh.material = land.real;
      if (river) river.visible = true;
      renderer.shadowMap.autoUpdate = false;
      renderer.render(scene, camera);
      renderer.shadowMap.autoUpdate = true;
      if (land) land.mesh.material = land.white;
      if (river) river.visible = false;
      return renderer.domElement;
    },
    renderWater(v, wet) {
      if (!surf) {
        // (./engine's own water, its shader's four doings, on a sheet over the live town's water: nothing where there is land)
        const w = WORLD.x1 - WORLD.x0, d = WORLD.z1 - WORLD.z0, geo = new THREE.PlaneGeometry(w, d);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.ShaderMaterial({
          uniforms: { hdIndex: { value: indexTex }, hdOrigin: { value: new THREE.Vector4(WORLD.x0, WORLD.z0, w, d) }, hdTime: surfClock, hdGlint: surfGlint, hdWet: surfWet },
          vertexShader: "varying vec2 hdW; void main() { vec4 p = modelMatrix * vec4(position, 1.0); hdW = p.xz; gl_Position = projectionMatrix * viewMatrix * p; }",
          fragmentShader: `varying vec2 hdW; uniform sampler2D hdIndex; uniform vec4 hdOrigin; uniform float hdTime; uniform float hdGlint; uniform float hdWet;
${NOISE}
            float hdLand(vec2 p) { return step(0.5, abs(floor(texture2D(hdIndex, (p - hdOrigin.xy) / hdOrigin.zw).r * 255.0 + 0.5) - 1.0)); }
            void main() {
              vec2 hdP = floor(hdW * 22.63) / 22.63;
              if (hdLand(hdP) > 0.5) discard;
              float hdShore = max(max(hdLand(hdP + vec2(0.24, 0.0)), hdLand(hdP - vec2(0.24, 0.0))), max(hdLand(hdP + vec2(0.0, 0.24)), hdLand(hdP - vec2(0.0, 0.24))));
              float hdNear = max(max(hdLand(hdP + vec2(0.1, 0.0)), hdLand(hdP - vec2(0.1, 0.0))), max(hdLand(hdP + vec2(0.0, 0.1)), hdLand(hdP - vec2(0.0, 0.1))));
              float hdWave = hdNoise(hdP * 3.1 + vec2(hdTime * 0.55, -hdTime * 0.4));
              float hdWhite = max(hdNear * 0.7, hdShore * step(0.5, hdWave) * 0.6);
              float hdG = hdNoise(hdP * 5.5 + vec2(hdTime * 0.3, hdTime * 0.18)) * hdNoise(hdP * 11.0 - vec2(hdTime * 0.45, 0.0));
              hdWhite = max(hdWhite, hdGlint * step(0.56, hdG));
              float hdFar = max(max(hdLand(hdP + vec2(0.9, 0.0)), hdLand(hdP - vec2(0.9, 0.0))), max(hdLand(hdP + vec2(0.0, 0.9)), hdLand(hdP - vec2(0.0, 0.9))));
              float hdDark = 0.2 * hdFar * (0.75 + 0.25 * sin(hdW.x * 9.0 + hdW.y * 7.0 + hdTime * 1.6));
              vec2 hdC = floor(hdW * 2.0);
              float hdR = fract(hdHash(hdC) + hdTime * 0.9);
              float hdD = length(fract(hdW * 2.0) - 0.5 - (vec2(hdHash(hdC + 3.1), hdHash(hdC + 7.7)) - 0.5) * 0.5);
              hdWhite = max(hdWhite, hdWet * 0.5 * (1.0 - hdR) * step(abs(hdD - hdR * 0.35), 0.035));
              gl_FragColor = vec4(vec3(hdWhite), hdWhite + hdDark * (1.0 - hdWhite));
            }`,
          transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
        });
        surf = new THREE.Mesh(geo, mat);
        surf.position.set((WORLD.x0 + WORLD.x1) / 2, 0, (WORLD.z0 + WORLD.z1) / 2);
        surf.frustumCulled = false;
        disposables.push(mat);
      }
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite && flat ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const q = hourOf(v.min);
      blend(SKIES[q[0]], SKIES[q[1]], q[2]);
      surfClock.value = performance.now() / 1000; surfGlint.value = 0.36 * (1 - 0.7 * now.lamps) * (1 - 0.6 * wet); surfWet.value = wet;
      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.autoUpdate = false;
      renderer.render(surf, camera);
      renderer.shadowMap.autoUpdate = true;
      return renderer.domElement;
    },
    renderLit() {
      // the same view again, the shadows as they were just thrown: now only what stands, in its own colours, lit and
      // shaded, on nothing (the live town lays each thing of it over its own picture of that thing)
      for (const o of litShown) o.visible = true;
      for (const o of litHidden) o.visible = false;
      for (const m of artMats.values()) { m.colorWrite = true; m.depthWrite = true; }
      const back = scene.background;
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.autoUpdate = false;
      renderer.render(scene, camera);
      renderer.shadowMap.autoUpdate = true;
      scene.background = back;
      for (const o of litShown) o.visible = false;
      for (const o of litHidden) o.visible = true;
      for (const m of artMats.values()) { m.colorWrite = false; m.depthWrite = false; }
      return renderer.domElement;
    },
    setRain(on) { raining = on; },
    zoom(by) { view.distTo = Math.min(60, Math.max(11, view.distTo * by)); },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisible);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const d of disposables) d.dispose();
      post?.dispose(); air?.dispose();
      renderer.dispose();
    },
  };
  return api;
}
