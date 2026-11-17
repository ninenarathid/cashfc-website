/**
 * 3D shadows for the live town's maps that are not the map editor's (the owner, 2026-11-17: "ทำให้ครบทุกแมพเลย"): the
 * forest and the mountain. Their trees, rocks and camps are drawn by the live town from its own sheets; here each one's
 * own picture is stood where the live town draws it, unseen, turned to the sun, and throws its shadow on white ground:
 * the tree's own outline, joined to its foot (the owner, of round shapes guessed for them: "ป่าเงายังไม่ถูกต้อง"). The
 * picture is laid over the live town's ground as the editor's maps' is (./engine's `renderAt`): the same camera, the
 * same sun.
 *
 * The same sheets throw the walkers' shadows on every map, the editor's too (`createSheets`): each walker's own doll as
 * the live town drew it a frame ago (the owner, 2026-11-17, of one outline for everybody: "เงาไม่ละเอียด").
 *
 * (Under a roof or under the ground there is no sun: the clothes shop, the casino and the cave have no shadows.)
 */
import * as THREE from "three";
import type { LiveView, Quality } from "./engine";

/** A picture standing on the map: its piece of its sheet, its foot in that piece, how large it is drawn, and its foot's tile. */
export interface Stand { img: HTMLImageElement | HTMLCanvasElement; sx: number; sy: number; w: number; h: number; ax: number; ay: number; k: number; x: number; y: number; mirror?: boolean }
export interface Shade { renderAt(v: LiveView, stands: readonly Stand[]): HTMLCanvasElement; dispose(): void }

/** The sun's stand at the day's hours (./engine's, the same four), and how far the night has come (0 to 1). */
const SUNS: Array<[number, [number, number, number], number]> = [
  [0, [-0.55, 0.58, 0.4], 1], [270, [-0.55, 0.58, 0.4], 1], [390, [0.74, 0.5, -0.2], 0], [630, [-0.1, 0.9, 0.6], 0],
  [900, [-0.1, 0.9, 0.6], 0], [1050, [-0.42, 0.45, 0.71], 0.35], [1170, [-0.55, 0.58, 0.4], 1], [1440, [-0.55, 0.58, 0.4], 1],
];
function sunAt(min: number, out: THREE.Vector3): number {
  const m = ((min % 1440) + 1440) % 1440;
  for (let i = 0; i < SUNS.length - 1; i++) if (m < SUNS[i + 1][0]) {
    const t = (m - SUNS[i][0]) / (SUNS[i + 1][0] - SUNS[i][0]), k = t * t * (3 - 2 * t), a = SUNS[i], b = SUNS[i + 1];
    out.set(a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k).normalize();
    return a[2] + (b[2] - a[2]) * k;
  }
  out.set(-0.55, 0.58, 0.4).normalize();
  return 1;
}

const PX_SIDE = 45.25, PX_UP = 39.2, PITCH = Math.PI / 6, YAW = Math.PI / 4;

/** The sun's strength and colour at the same hours (./engine's). */
const LIGHTS: Array<[number, number]> = [[1.15, 0x86a4ff], [1.15, 0x86a4ff], [2.5, 0xffe0c0], [3.0, 0xfffaf0], [3.0, 0xfffaf0], [3.0, 0xff9a52], [1.15, 0x86a4ff], [1.15, 0x86a4ff]];
const rimDir = new THREE.Vector3();
/**
 * The light on a walker's sunward edge at a minute of the day (./engine's doll wears it): the way to the sun on the
 * screen (x right, y up, one long), how strong it is and its colour ("r,g,b").
 */
export function rimAt(min: number): { x: number; y: number; a: number; rgb: string } {
  sunAt(min, rimDir);
  const m = ((min % 1440) + 1440) % 1440;
  let i = 0;
  while (i < SUNS.length - 2 && m >= SUNS[i + 1][0]) i++;
  const t = (m - SUNS[i][0]) / (SUNS[i + 1][0] - SUNS[i][0]), k = t * t * (3 - 2 * t), A = LIGHTS[i], B = LIGHTS[i + 1];
  const ch = (sh: number) => Math.round(((A[1] >> sh) & 255) + (((B[1] >> sh) & 255) - ((A[1] >> sh) & 255)) * k);
  const sx = rimDir.x * Math.SQRT1_2 - rimDir.z * Math.SQRT1_2;
  const sy = -rimDir.x * Math.sin(YAW) * Math.sin(PITCH) + rimDir.y * Math.cos(PITCH) - rimDir.z * Math.cos(YAW) * Math.sin(PITCH), sl = Math.hypot(sx, sy) || 1;
  return { x: sx / sl, y: sy / sl, a: 0.16 * (A[0] + (B[0] - A[0]) * k), rgb: `${ch(16)},${ch(8)},${ch(0)}` };
}

/**
 * How far about the view's middle the sun's shadows are worked out, in tiles: the view and what stands a little way
 * outside it, and no more, so that the shadows' own pixels are spent on what is seen (a doll's shadow has its doll's
 * shape only when they are small enough).
 */
export function reachOf(v: LiveView): number {
  return Math.min(30, Math.max(9, Math.max(v.cw, v.ch * 2) / (2 * PX_SIDE * v.s) + 5));
}

type Pic = HTMLImageElement | HTMLCanvasElement;
/** All that stands of one sheet: its pictures' sheets in one set of corners, written again each time. */
interface Batch { tex: THREE.Texture; mat: THREE.Material; geo: THREE.BufferGeometry; mesh: THREE.Mesh; pos: Float32Array; uv: Float32Array; room: number; n: number }
export interface Sheets { set(stands: readonly Stand[], sunDir: THREE.Vector3): void; dispose(): void }

/** Pictures stood unseen in a scene, each upright on its foot across the sun's way, to throw their shadows. */
export function createSheets(scene: THREE.Scene): Sheets {
  const batches = new Map<Pic, Batch>();
  const batchOf = (img: Pic, need: number): Batch => {
    let b = batches.get(img);
    if (b && b.room >= need) return b;
    const room = Math.max(64, need * 2);
    const tex = b?.tex ?? new THREE.Texture(img);
    if (!b) { tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; }
    const mat = b?.mat ?? new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
    if (b) { scene.remove(b.mesh); b.geo.dispose(); }
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(room * 12), uv = new Float32Array(room * 8), index = new Uint32Array(room * 6);
    for (let i = 0; i < room; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    b = { tex, mat, geo, mesh, pos, uv, room, n: 0 };
    batches.set(img, b);
    return b;
  };
  return {
    set(stands, sunDir) {
      // each picture's sheet: upright on its foot, across the sun's way, its left and right as the screen's
      const flat = Math.hypot(sunDir.x, sunDir.z) || 1;
      let rx = sunDir.z / flat, rz = -sunDir.x / flat;
      if (rx - rz < 0) { rx = -rx; rz = -rz; }
      const count = new Map<Pic, number>();
      for (const s of stands) count.set(s.img, (count.get(s.img) ?? 0) + 1);
      for (const b of batches.values()) b.n = 0;
      for (const s of stands) {
        const b = batchOf(s.img, count.get(s.img)!), i = b.n++, W = s.img.width, H = s.img.height;
        const l = (-s.ax * s.k) / PX_SIDE, r = ((s.w - s.ax) * s.k) / PX_SIDE, top = (s.ay * s.k) / PX_UP, bot = Math.min(0, ((s.ay - s.h) * s.k) / PX_UP);
        const u0 = s.sx / W, u1 = (s.sx + s.w) / W, v1 = 1 - s.sy / H, v0 = 1 - (s.sy + s.h) / H;
        const [ua, ub] = s.mirror ? [u1, u0] : [u0, u1];
        const fx = s.x, fz = s.y, p = b.pos, t = b.uv, o = i * 12, q = i * 8;
        p[o] = fx + rx * l; p[o + 1] = bot; p[o + 2] = fz + rz * l;
        p[o + 3] = fx + rx * r; p[o + 4] = bot; p[o + 5] = fz + rz * r;
        p[o + 6] = fx + rx * r; p[o + 7] = top; p[o + 8] = fz + rz * r;
        p[o + 9] = fx + rx * l; p[o + 10] = top; p[o + 11] = fz + rz * l;
        t[q] = ua; t[q + 1] = v0; t[q + 2] = ub; t[q + 3] = v0; t[q + 4] = ub; t[q + 5] = v1; t[q + 6] = ua; t[q + 7] = v1;
      }
      for (const [img, b] of batches) {
        b.geo.setDrawRange(0, b.n * 6);
        b.mesh.visible = b.n > 0;
        b.geo.attributes.position.needsUpdate = true; b.geo.attributes.uv.needsUpdate = true;
        // (a canvas is drawn on again each frame: the walkers' dolls)
        if (b.n && !(img instanceof HTMLImageElement)) b.tex.needsUpdate = true;
      }
    },
    dispose() {
      for (const b of batches.values()) { scene.remove(b.mesh); b.geo.dispose(); b.mat.dispose(); b.tex.dispose(); }
      batches.clear();
    },
  };
}

export function createShade(canvas: HTMLCanvasElement, quality: Quality): Shade {
  const lite = quality !== "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1), sun = new THREE.DirectionalLight(0xffffff, 1);
  const SH = lite ? 1024 : 2048;
  sun.castShadow = true;
  sun.shadow.mapSize.set(SH, SH);
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  // the ground: one white sheet under wherever the view is
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  const sheets = createSheets(scene);
  const sunDir = new THREE.Vector3(), eye = new THREE.Vector3();
  let sized = { w: 0, h: 0, d: 0 }, reached = 0;
  return {
    renderAt(v, stood) {
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const night = sunAt(v.min, sunDir);
      // (as ./engine's `renderAt`: lit ground is white, a shadow half of it by day and deeper by night)
      const sunI = ((0.5 + 0.16 * night) * Math.PI) / Math.max(0.3, sunDir.y);
      sun.intensity = sunI; hemi.intensity = Math.PI - sunI * sunDir.y;
      sheets.set(v.stands?.length ? [...stood, ...v.stands] : stood, sunDir);

      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      ground.position.set(Math.round(eye.x), 0, Math.round(eye.z));
      const reach = Math.ceil(reachOf(v));
      if (reach !== reached) { reached = reach; Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix(); }
      const texel = (reach * 2) / SH, ax = Math.round(eye.x / texel) * texel, az = Math.round(eye.z / texel) * texel;
      sun.target.position.set(ax, 0, az);
      sun.position.set(ax + sunDir.x * 90, sunDir.y * 90, az + sunDir.z * 90);
      renderer.render(scene, camera);
      return renderer.domElement;
    },
    dispose() {
      groundGeo.dispose(); groundMat.dispose();
      sheets.dispose();
      renderer.dispose();
    },
  };
}
