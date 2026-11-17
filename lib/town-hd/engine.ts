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
import * as THREE from "three";
import MAP from "@/lib/town/town2-map.json";
import {
  T2_COLS, T2_HALL, T2_LEFT_OUT, T2_PLAZA, T2_ROWS, T2_TEXTURES, inT2, t2BankLook, t2InHall, t2Lift, t2Look, t2OnStage, t2Tile,
  type T2Look,
} from "@/lib/town/town2";
import { WALK_FPS, loadPixelKit, type PixelKit, type View } from "@/lib/town/pixeldoll";
import { defaultLook, type Look } from "@/lib/town/look";
import { PX_UP, buildHall, buildStage, buildThing, makeKit, type Box4, type Kit } from "./build";
import * as skin from "./textures";
import { findWay, nearestOpen, step, type P } from "./walk";

/** A tile's side in isometric pixels (64 across its diagonal). */
const PX_SIDE = 45.25;
/** The ground beyond the town: how far the trial's world goes on, in tiles. */
const WORLD = { x0: -22, z0: -22, x1: 102, z1: 102 };
const SUB = 8, GRID = 3;
const LOOKS: T2Look[] = ["t2grass", "t2water", "t2sand", "t2road", "t2wood", "t2plaza"];
const WATER = 1;
const WATER_Y = -0.17, BED_Y = -0.55;

export type TimeId = "morning" | "day" | "evening" | "night";
interface Sky { sun: [number, number, number]; sunCol: number; sunI: number; top: number; ground: number; hemiI: number; sky: number; lamps: number }
const SKIES: Record<TimeId, Sky> = {
  morning: { sun: [0.78, 0.5, 0.45], sunCol: 0xffe0c0, sunI: 2.5, top: 0xcfe4ff, ground: 0x9a8468, hemiI: 1.5, sky: 0xbfe0f0, lamps: 0 },
  day: { sun: [0.38, 0.95, 0.42], sunCol: 0xfffaf0, sunI: 3.0, top: 0xd6ecff, ground: 0x8f8a70, hemiI: 1.7, sky: 0x8ccaf2, lamps: 0 },
  evening: { sun: [-0.8, 0.52, 0.5], sunCol: 0xff9a52, sunI: 3.0, top: 0xa99be0, ground: 0x7a5040, hemiI: 1.15, sky: 0xf2b184, lamps: 0.35 },
  night: { sun: [-0.45, 0.8, 0.5], sunCol: 0x86a4ff, sunI: 1.15, top: 0x41589f, ground: 0x1c2440, hemiI: 1.05, sky: 0x0c1632, lamps: 1 },
};

export interface HdTown {
  setTime(t: TimeId): void;
  /** Turn the view an eighth of a turn, one way or the other. */
  turn(dir: 1 | -1): void;
  zoom(by: number): void;
  dispose(): void;
}
export interface HdOpts { time: TimeId; /** Where to stand first, in tiles (a tester's `?at=x,y`); the plaza otherwise. */ at?: { x: number; y: number }; onReady?: () => void; onFps?: (fps: number) => void }

type Obj = number[];
const sprites = MAP.sprites as Array<[string, number, number]>;
const names = MAP.names as string[];
const SEASONAL = /^game_(pumpkin|jacko)/;
const FLAT = /^(lotus_leaves|three_flat_grey_stepping_stones)/;
const SKIP = /^(game_ring|chest_open|kitchen_house_inside)/;
const LAMP = /kasuga_stone_lantern|hanging_red_pape/;

function loadTexture(manager: THREE.LoadingManager, src: string): THREE.Texture {
  const t = new THREE.TextureLoader(manager).load(src);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function createHdTown(canvas: HTMLCanvasElement, opts: HdOpts): HdTown {
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);
  const disposables: Array<{ dispose(): void }> = [];
  let dead = false;
  // the town is shown once its pictures have come (or have been waited for long enough), not half painted
  const pictures = new THREE.LoadingManager();
  const came = { pictures: false, doll: false, since: performance.now() };
  pictures.onLoad = () => { came.pictures = true; };

  /* ── light ────────────────────────────────────────────────────────────── */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  const SH = coarse ? 1024 : 2048, REACH = 30;
  sun.shadow.mapSize.set(SH, SH);
  Object.assign(sun.shadow.camera, { left: -REACH, right: REACH, top: REACH, bottom: -REACH, near: 1, far: 220 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xffffff, 60, 150);
  scene.background = new THREE.Color(0x8ccaf2);

  // the sky now, and the two it is between while the hour asked for changes
  const copy = (q: Sky): Sky => ({ ...q, sun: [...q.sun] });
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
    if (inT2(x, z)) return LOOKS.indexOf(t2Look(x, z));
    const bank = t2BankLook(x, z);
    if (bank) return LOOKS.indexOf(bank);
    // beyond the banks the builder drew: the town's edge goes on (its water as water), then the woods' floor
    const ex = Math.min(Math.max(x, 0.02), T2_COLS - 0.02), ez = Math.min(Math.max(z, 0.02), T2_ROWS - 0.02);
    const edge = LOOKS.indexOf(t2Look(ex, ez)), out = Math.max(Math.abs(x - ex), Math.abs(z - ez));
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

  {
    const nx = (WORLD.x1 - WORLD.x0) * GRID + 1, nz = (WORLD.z1 - WORLD.z0) * GRID + 1;
    const pos = new Float32Array(nx * nz * 3), idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = WORLD.x0 + i / GRID, z = WORLD.z0 + j / GRID, o = (j * nx + i) * 3;
      pos[o] = x; pos[o + 1] = wetAt(x, z) ? BED_Y : 0; pos[o + 2] = z;
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
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.hdIndex = { value: indexTex };
      sh.uniforms.hdOrigin = { value: new THREE.Vector4(WORLD.x0, WORLD.z0, WORLD.x1 - WORLD.x0, WORLD.z1 - WORLD.z0) };
      LOOKS.forEach((_, i) => { sh.uniforms[`hdLook${i}`] = { value: lookTex[i] }; });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 hdAt;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nhdAt = position.xz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec2 hdAt;\nuniform sampler2D hdIndex;\nuniform vec4 hdOrigin;\n${LOOKS.map((_, i) => `uniform sampler2D hdLook${i};`).join("\n")}`)
        .replace("#include <map_fragment>", `
          float hdId = floor(texture2D(hdIndex, (hdAt - hdOrigin.xy) / hdOrigin.zw).r * 255.0 + 0.5);
          vec2 hdUv = hdAt / 5.657;
          vec3 hdBed = texture2D(hdLook2, hdUv).rgb * vec3(0.30, 0.52, 0.66);
          vec3 hdCol = texture2D(hdLook0, hdUv).rgb * (1.0 - step(0.5, hdId));
          hdCol += hdBed * step(0.5, hdId) * (1.0 - step(1.5, hdId));
          hdCol += texture2D(hdLook2, hdUv).rgb * step(1.5, hdId) * (1.0 - step(2.5, hdId));
          hdCol += texture2D(hdLook3, hdUv).rgb * step(2.5, hdId) * (1.0 - step(3.5, hdId));
          hdCol += texture2D(hdLook4, hdUv).rgb * step(3.5, hdId) * (1.0 - step(4.5, hdId));
          hdCol += texture2D(hdLook5, hdUv).rgb * step(4.5, hdId);
          diffuseColor.rgb *= hdCol;`);
    };
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    scene.add(ground);
    disposables.push(geo, mat);
  }

  // the water: the editor's own water picture, drifting, over the sunk bed
  const waterTex = loadTexture(pictures, T2_TEXTURES.find((q) => q.look === "t2water")!.src);
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.minFilter = THREE.LinearMipmapLinearFilter;
  disposables.push(waterTex);
  const K: Kit = makeKit(waterTex);
  {
    const w = WORLD.x1 - WORLD.x0, d = WORLD.z1 - WORLD.z0, geo = new THREE.PlaneGeometry(w, d), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 5.657, uv.getY(i) * d / 5.657);
    const m = new THREE.Mesh(geo, K.water);
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

  interface Card { x: number; z: number; y: number; w: number; h: number; off: number; flip: boolean }
  const cards = new Map<number, Card[]>();
  const lamps: Array<{ x: number; y: number; z: number }> = [];
  const flats: Array<{ s: number; o: Obj; wet: boolean }> = [];
  const card = (s: number, c: Card) => { const l = cards.get(s); if (l) l.push(c); else cards.set(s, [c]); };

  (MAP.objects as Obj[]).forEach((o, i) => {
    const name = names[o[0]], sp = sprites[o[1]];
    if (T2_LEFT_OUT.has(i) || SKIP.test(name) || SEASONAL.test(name)) return;
    const box: Box4 = [o[8], o[9], o[10], o[11]], cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2;
    const tall = (sp[2] * o[4] - (box[2] - box[0] + box[3] - box[1]) * 16) / PX_UP;
    if (i === T2_HALL.thing) { hall.upper = buildHall(town, K, Math.max(3.6, tall)).upper; return; }
    if (/^oval_wooden_festival_stage/.test(name)) { buildStage(town, K); return; }
    if (/^(bridge|fishing_pier|pier_of_mossy_stone)/.test(name)) return; // (their decks are laid below, tile by tile)
    if (o[6] === 2 || /^wishing_basin$/.test(name)) {
      const built = buildThing(town, K, name, box, tall);
      if (built) { if (built.spin) spins.push(built.spin); return; }
    }
    if (FLAT.test(name)) { flats.push({ s: o[1], o, wet: wetAt(cx, cz) }); return; }
    const w = sp[1] * o[4] / PX_SIDE, h = sp[2] * o[4] / PX_UP;
    // (its picture's middle is not always over its footprint's: the difference, across the view)
    const off = (o[2] + sp[1] * o[4] / 2 - (cx - cz) * 32) / PX_SIDE;
    card(o[1], { x: cx, z: cz, y: wetAt(cx, cz) ? WATER_Y : 0, w, h, off: Math.abs(off) < 1.2 ? off * 0.6 : 0, flip: o[5] === 1 });
    if (LAMP.test(name)) lamps.push({ x: cx, y: h * 0.72, z: cz });
  });

  // woods beyond the town, so its edge is not the world's: the town's own trees, scattered on the woods' floor
  {
    const trees = sprites.map((sp, s) => ({ s, sp })).filter(({ sp }) => /cedar|zelkova|camphor|pine-|maple|ginkgo/.test(sp[0]));
    let seed = 12345;
    const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; trees.length && n < 520; n++) {
      const x = WORLD.x0 + 2 + r() * (WORLD.x1 - WORLD.x0 - 4), z = WORLD.z0 + 2 + r() * (WORLD.z1 - WORLD.z0 - 4);
      if (inT2(x, z) || lookAt(x, z) !== 4) continue;
      const { s, sp } = trees[Math.floor(r() * trees.length)], k = 1.0 + r() * 0.35;
      card(s, { x, z, y: 0, w: sp[1] * k / PX_SIDE, h: sp[2] * k / PX_UP, off: 0, flip: r() < 0.5 });
    }
  }

  // every picture upright on its foot, one instanced set a picture; a second set, unseen, turned to the sun to cast its shadow
  const cardGeo = new THREE.PlaneGeometry(1, 1);
  cardGeo.translate(0, 0.5, 0);
  { const n = cardGeo.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); }
  disposables.push(cardGeo);
  const cardSets: Array<{ list: Card[]; seen: THREE.InstancedMesh; shade: THREE.InstancedMesh }> = [];
  const picture = new Map<number, THREE.Texture>();
  const pictureOf = (s: number) => {
    let t = picture.get(s);
    if (!t) { t = loadTexture(pictures, `/town/town2/${sprites[s][0]}`); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; picture.set(s, t); disposables.push(t); }
    return t;
  };
  for (const [s, list] of cards) {
    const map = pictureOf(s);
    const mat = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
    const ghost = new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
    const seen = new THREE.InstancedMesh(cardGeo, mat, list.length), shade = new THREE.InstancedMesh(cardGeo, ghost, list.length);
    shade.castShadow = true;
    seen.frustumCulled = shade.frustumCulled = false;
    town.add(seen, shade);
    cardSets.push({ list, seen, shade });
    disposables.push(mat, ghost);
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function faceCards(yaw: number) {
    Q.setFromAxisAngle(UP, yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (const { list, seen } of cardSets) {
      list.forEach((c, i) => seen.setMatrixAt(i, M.compose(V.set(c.x + rx * c.off, c.y, c.z + rz * c.off), Q, S.set(c.flip ? -c.w : c.w, c.h, 1))));
      seen.instanceMatrix.needsUpdate = true;
    }
  }
  function shadeCards() {
    Q.setFromAxisAngle(UP, Math.atan2(sunDir.x, sunDir.z));
    for (const { list, shade } of cardSets) {
      list.forEach((c, i) => shade.setMatrixAt(i, M.compose(V.set(c.x, c.y, c.z), Q, S.set(c.flip ? -c.w : c.w, c.h, 1))));
      shade.instanceMatrix.needsUpdate = true;
    }
  }

  // what lies flat (stepping stones, lotus leaves, flower beds): its picture laid back onto the ground it was drawn on
  for (const { s, o, wet } of flats) {
    const sp = sprites[s], w = sp[1] * o[4], h = sp[2] * o[4], y = wet ? WATER_Y + 0.02 : 0.03;
    const at = (ix: number, iy: number) => [(ix / 32 + iy / 16) / 2, y, (iy / 16 - ix / 32) / 2];
    const geo = new THREE.BufferGeometry(), flip = o[5] === 1;
    geo.setAttribute("position", new THREE.Float32BufferAttribute([...at(o[2], o[3] + h), ...at(o[2] + w, o[3] + h), ...at(o[2] + w, o[3]), ...at(o[2], o[3])], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(flip ? [1, 0, 0, 0, 0, 1, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const mat = new THREE.MeshLambertMaterial({ map: pictureOf(s), alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    town.add(m);
    disposables.push(geo, mat);
  }

  // decks: every tile of a bridge or a pier, in four boards, each at its own height (a bridge rises to its middle)
  {
    const at: Array<[number, number, number]> = [];
    const rails: Array<[number, number, number, boolean]> = [];
    const bridges = (MAP.objects as Obj[]).filter((o) => names[o[0]] === "bridge").map((o) => [o[8], o[9], o[10], o[11]]);
    for (let z = 0; z < T2_ROWS; z++) for (let x = 0; x < T2_COLS; x++) {
      if (t2Tile(x, z) !== "=" || t2OnStage(x, z)) continue;
      for (const [dx, dz] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) at.push([x + dx, t2Lift(x + dx, z + dz) / PX_UP, z + dz]);
      const b = bridges.find((q) => x + 0.5 >= q[0] && x + 0.5 <= q[2] && z + 0.5 >= q[1] && z + 0.5 <= q[3]);
      if (!b) continue;
      const along = b[2] - b[0] >= b[3] - b[1], up = t2Lift(x + 0.5, z + 0.5) / PX_UP;
      if (along) { if (t2Tile(x, z - 1) !== "=") rails.push([x + 0.5, up, z + 0.06, true]); if (t2Tile(x, z + 1) !== "=") rails.push([x + 0.5, up, z + 0.94, true]); }
      else { if (t2Tile(x - 1, z) !== "=") rails.push([x + 0.06, up, z + 0.5, false]); if (t2Tile(x + 1, z) !== "=") rails.push([x + 0.94, up, z + 0.5, false]); }
    }
    const slab = new THREE.BoxGeometry(0.5, 0.16, 0.5), boards = new THREE.InstancedMesh(slab, K.planks, at.length);
    at.forEach(([x, y, z], i) => boards.setMatrixAt(i, M.makeTranslation(x, y - 0.05, z)));
    const leg = new THREE.BoxGeometry(0.14, 0.9, 0.14), legAt = at.filter(([x, , z]) => wetAt(x, z) && Math.floor(x * 2) % 4 === 0 && Math.floor(z * 2) % 4 === 0);
    const legs = new THREE.InstancedMesh(leg, K.post, legAt.length);
    legAt.forEach(([x, y, z], i) => legs.setMatrixAt(i, M.makeTranslation(x, y - 0.55, z)));
    const railX = new THREE.BoxGeometry(1, 0.1, 0.1), railZ = new THREE.BoxGeometry(0.1, 0.1, 1), stub = new THREE.BoxGeometry(0.12, 0.62, 0.12);
    const rx = rails.filter((q) => q[3]), rz = rails.filter((q) => !q[3]);
    const a = new THREE.InstancedMesh(railX, K.red, rx.length), c = new THREE.InstancedMesh(railZ, K.red, rz.length), d = new THREE.InstancedMesh(stub, K.red, rails.length);
    rx.forEach(([x, y, z], i) => a.setMatrixAt(i, M.makeTranslation(x, y + 0.62, z)));
    rz.forEach(([x, y, z], i) => c.setMatrixAt(i, M.makeTranslation(x, y + 0.62, z)));
    rails.forEach(([x, y, z], i) => d.setMatrixAt(i, M.makeTranslation(x, y + 0.33, z)));
    for (const m of [boards, legs, a, c, d]) { m.castShadow = true; m.receiveShadow = true; town.add(m); }
    disposables.push(slab, leg, railX, railZ, stub);
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
    pool.position.set(l.x, 0.04, l.z);
    lit.add(halo, pool);
  }
  lit.visible = false;
  scene.add(lit);
  const near = Array.from({ length: coarse ? 3 : 5 }, () => { const p = new THREE.PointLight(0xffb060, 0, 9, 1.4); scene.add(p); return p; });

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
  const dollGhost = new THREE.MeshLambertMaterial({ map: dollTex, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
  const doll = new THREE.Mesh(dollGeo, dollMat), dollShade = new THREE.Mesh(dollGeo, dollGhost);
  dollShade.castShadow = true;
  // (behind a house I am still seen, faintly: the same picture drawn over whatever stands before me)
  const dollThrough = new THREE.MeshBasicMaterial({ map: dollTex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, fog: false });
  const dollOver = new THREE.Mesh(dollGeo, dollThrough);
  dollOver.renderOrder = 10;
  doll.visible = dollShade.visible = dollOver.visible = false;
  scene.add(doll, dollShade, dollOver);
  disposables.push(dollTex, dollGeo, dollMat, dollGhost, dollThrough);

  let kit: PixelKit | null = null;
  const look: Look = defaultLook("hd2d-test");
  const start = (opts.at && nearestOpen(opts.at.x, opts.at.y)) ?? nearestOpen(T2_PLAZA.x + T2_PLAZA.w / 2, T2_PLAZA.y + T2_PLAZA.h * 0.72) ?? { x: 40, y: 45 };
  const me = { x: start.x + 0.5, z: start.y + 0.5, y: 0, view: "front" as View, mirror: false, walking: false, drawn: "" };
  let way: P[] = [];
  loadPixelKit(look.race).then(async (k) => {
    await k.ready(look);
    if (dead) return;
    kit = k;
    doll.visible = dollShade.visible = dollOver.visible = true;
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

  /* ── the view ─────────────────────────────────────────────────────────── */
  const PITCH = 0.66;
  const view = { yaw: 0, yawTo: 0, dist: 30, distTo: 30, at: new THREE.Vector3(me.x, 0, me.z) };
  let facedYaw = NaN, shadedFor = "";
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // (an upright screen sees less across: the camera stands back a little, by its field of view)
    camera.fov = w < h ? 36 : 28;
    camera.updateProjectionMatrix();
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
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE[e.code]) { keys.add(e.code); way = []; e.preventDefault(); }
    else if (e.code === "KeyQ") api.turn(-1);
    else if (e.code === "KeyE") api.turn(1);
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.code); };
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const ray = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  function walkTo(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(floor, hit)) return;
    const to = nearestOpen(hit.x, hit.z, 3), from = { x: Math.floor(me.x), y: Math.floor(me.z) };
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
  function tryMove(dx: number, dz: number) {
    const tx = Math.floor(me.x), tz = Math.floor(me.z);
    const nx = me.x + dx, nz = me.z + dz;
    const ok = (x: number, z: number) => step(tx, tz, Math.floor(x), Math.floor(z));
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
      tryMove(dx * SPEED * dt, dz * SPEED * dt);
      face(dx, dz);
      me.walking = bx !== me.x || bz !== me.z;
    } else if (way.length) {
      let left = SPEED * dt;
      while (way.length && left > 0) {
        const to = way[0], dx = to.x - me.x, dz = to.y - me.z, d = Math.hypot(dx, dz);
        if (d <= left) { me.x = to.x; me.z = to.y; left -= d; way.shift(); if (d > 0.001) face(dx, dz); }
        else { me.x += (dx / d) * left; me.z += (dz / d) * left; left = 0; face(dx, dz); }
      }
      me.walking = true;
    }
    const up = t2Lift(me.x, me.z) / PX_UP;
    me.y += (up - me.y) * Math.min(1, dt * 14);
  }

  /* ── a frame ──────────────────────────────────────────────────────────── */
  let last = performance.now(), frames = 0, since = last, raf = 0, ready = false, lampTick = 0;
  function frame(t: number) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000), sec = t / 1000;
    last = t;
    walk(dt);

    // the sky moves towards the hour asked for
    if (turned < 1) {
      turned = Math.min(1, turned + dt / 1.4);
      const k = turned * turned * (3 - 2 * turned);
      for (let i = 0; i < 3; i++) now.sun[i] = mix(from.sun[i], want.sun[i], k);
      now.sunI = mix(from.sunI, want.sunI, k); now.hemiI = mix(from.hemiI, want.hemiI, k); now.lamps = mix(from.lamps, want.lamps, k);
      now.sunCol = mixHex(from.sunCol, want.sunCol, k); now.top = mixHex(from.top, want.top, k);
      now.ground = mixHex(from.ground, want.ground, k); now.sky = mixHex(from.sky, want.sky, k);
    }
    sunDir.set(now.sun[0], now.sun[1], now.sun[2]).normalize();
    sun.color.setHex(now.sunCol); sun.intensity = now.sunI;
    hemi.color.setHex(now.top); hemi.groundColor.setHex(now.ground); hemi.intensity = now.hemiI;
    (scene.background as THREE.Color).setHex(now.sky);
    scene.fog!.color.setHex(now.sky);
    const shadeKey = `${sunDir.x.toFixed(2)},${sunDir.z.toFixed(2)}`;
    if (shadeKey !== shadedFor) { shadedFor = shadeKey; shadeCards(); }

    // lanterns and windows
    const lampsOn = now.lamps;
    lit.visible = lampsOn > 0.02;
    haloMat.opacity = lampsOn * 0.85; poolMat.opacity = lampsOn * 0.32;
    for (const m of Object.values(K.walls)) m.emissiveIntensity = lampsOn * 1.5;
    K.lantern.emissiveIntensity = 0.15 + lampsOn * 1.6; K.ember.emissiveIntensity = 0.6 + lampsOn * 1.2;
    if (sec - lampTick > 0.25) {
      lampTick = sec;
      const by = lamps.map((l) => ({ l, d: (l.x - me.x) ** 2 + (l.z - me.z) ** 2 })).sort((a, b) => a.d - b.d);
      near.forEach((p, i) => { const q = by[i]; if (q) p.position.set(q.l.x, q.l.y, q.l.z); p.visible = !!q && lampsOn > 0.02; });
    }
    for (const p of near) p.intensity = lampsOn * 14;

    // the view follows
    view.yaw += (view.yawTo - view.yaw) * Math.min(1, dt * 9);
    view.dist += (view.distTo - view.dist) * Math.min(1, dt * 10);
    view.at.lerp(V.set(me.x, me.y + 0.6, me.z), Math.min(1, dt * 7));
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    camera.position.set(view.at.x + Math.sin(view.yaw) * cp * view.dist, view.at.y + sp * view.dist, view.at.z + Math.cos(view.yaw) * cp * view.dist);
    camera.lookAt(view.at);
    (scene.fog as THREE.Fog).near = view.dist * 1.5; (scene.fog as THREE.Fog).far = view.dist * 4.6;
    if (!(Math.abs(view.yaw - facedYaw) <= 0.001)) { facedYaw = view.yaw; faceCards(view.yaw); }

    // the sun stands over where I look, its shadows a texel at a time so they do not swim
    const texel = (REACH * 2) / SH, ax = Math.round(view.at.x / texel) * texel, az = Math.round(view.at.z / texel) * texel;
    sun.target.position.set(ax, 0, az);
    sun.position.set(ax + sunDir.x * 90, sunDir.y * 90, az + sunDir.z * 90);

    // me
    drawDoll(sec);
    doll.position.set(me.x, me.y, me.z); doll.rotation.y = view.yaw;
    dollShade.position.copy(doll.position); dollShade.rotation.y = Math.atan2(sunDir.x, sunDir.z);
    dollOver.position.copy(doll.position); dollOver.rotation.y = view.yaw;
    if (hall.upper) hall.upper.visible = !t2InHall(Math.floor(me.x), Math.floor(me.z));

    waterTex.offset.set(sec * 0.012, sec * 0.02);
    for (const s of spins) s.rotation.z = -sec * 0.5;

    renderer.render(scene, camera);
    if (!ready && ((came.pictures && came.doll) || t - came.since > 25000)) { ready = true; opts.onReady?.(); }
    frames++;
    if (t - since >= 1000) { opts.onFps?.(Math.round((frames * 1000) / (t - since))); frames = 0; since = t; }
  }
  raf = requestAnimationFrame(frame);
  const onVisible = () => { last = performance.now(); };
  document.addEventListener("visibilitychange", onVisible);

  const api: HdTown = {
    setTime(t) { if (SKIES[t] === want) return; from = copy(now); want = SKIES[t]; turned = 0; },
    turn(dir) { view.yawTo += dir * Math.PI / 4; },
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
      renderer.dispose();
    },
  };
  return api;
}
