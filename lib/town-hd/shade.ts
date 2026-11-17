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
import { NOISE, noise2 } from "./fx";

/** A picture standing on the map: its piece of its sheet, its foot in that piece, how large it is drawn, and its foot's tile. */
export interface Stand { img: HTMLImageElement | HTMLCanvasElement; sx: number; sy: number; w: number; h: number; ax: number; ay: number; k: number; x: number; y: number; mirror?: boolean; /** How high the ground it stands on is, in tiles. */ up?: number }
export interface Shade {
  renderAt(v: LiveView, stands: readonly Stand[]): HTMLCanvasElement;
  /**
   * What lives on a map's water that is not the editor's (the forest's pool, the mountain's stream), alone on nothing:
   * the sun's glints and the rings where rain falls, well inside the water (`wet`: a tile and all about it water), so
   * that nothing of it lies on a bank the live town drew its own way.
   */
  renderWater(v: LiveView, wet: number, box: { x: number; y: number; w: number; h: number }, wetAt: (x: number, y: number) => boolean): HTMLCanvasElement;
  /**
   * Where the map's ground is raised (`raise`): the live town's own picture of its level ground (`src`: the screen and
   * `extra` of the screen's pixels below it, drawn by the live town's camera) laid on the raised ground, as that camera
   * sees it; nothing outside the raised land. Drawn over the level ground. Null where nothing is raised.
   */
  renderGround(v: LiveView, src: HTMLCanvasElement, extra: number): HTMLCanvasElement | null;
  /** How high the ground is at a point of the map (tiles), in tiles; 0 where nothing is raised. */
  heightAt(x: number, y: number): number;
  dispose(): void;
}
/** A map's land that low hills may rise on (./engine's heights, made the same way): its box in tiles, and whether a tile is open land (not water, a path, a floor, a clearing people sit in). */
export interface Raise { box: { x: number; y: number; w: number; h: number }; land: (x: number, y: number) => boolean }

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

const probeAt = new THREE.Vector3(), probeBuf = new Uint8Array(4);
/**
 * How light the shadows' picture just drawn is at points of the map (`v.probes`: tiles, and how high the ground is
 * there), 0 dark to 1 lit, written to `v.shades`: whether somebody stands in a shadow (./engine's doll is dimmed whole
 * when its body is in one). Asked a little towards the sun from their feet, before their own shadow.
 */
export function probe(renderer: THREE.WebGLRenderer, camera: THREE.Camera, v: LiveView, sunDir: THREE.Vector3, heightAt?: (x: number, y: number) => number) {
  if (!v.probes?.length) return;
  const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, flat = Math.hypot(sunDir.x, sunDir.z) || 1;
  v.shades = v.probes.map(([x, y]) => {
    const px = x + (sunDir.x / flat) * 0.4, pz = y + (sunDir.z / flat) * 0.4;
    probeAt.set(px, heightAt ? heightAt(px, pz) : 0, pz).project(camera);
    const sx = Math.round((probeAt.x * 0.5 + 0.5) * W), sy = Math.round((probeAt.y * 0.5 + 0.5) * H);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return 1;
    gl.readPixels(sx, sy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probeBuf);
    return probeBuf[1] / 255;
  });
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
        const up = s.up ?? 0;
        p[o] = fx + rx * l; p[o + 1] = bot + up; p[o + 2] = fz + rz * l;
        p[o + 3] = fx + rx * r; p[o + 4] = bot + up; p[o + 5] = fz + rz * r;
        p[o + 6] = fx + rx * r; p[o + 7] = top + up; p[o + 8] = fz + rz * r;
        p[o + 9] = fx + rx * l; p[o + 10] = top + up; p[o + 11] = fz + rz * l;
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

export function createShade(canvas: HTMLCanvasElement, quality: Quality, raise?: Raise): Shade {
  const lite = quality !== "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1), sun = new THREE.DirectionalLight(0xffffff, 1);
  const SH = lite ? 2048 : 4096;
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

  // The raised land: hills over the map's open land, none within four tiles of ground that must be level, as ./engine
  // makes its own. One sheet of it, white for the shadows' picture, wearing the live town's ground for `renderGround`.
  const G = 2, PAD = 6;
  const hx0 = raise ? raise.box.x - PAD : 0, hz0 = raise ? raise.box.y - PAD : 0, HX = raise ? (raise.box.w + 2 * PAD) * G + 1 : 2, HZ = raise ? (raise.box.h + 2 * PAD) * G + 1 : 2;
  const HGT = new Float32Array(HX * HZ);
  let hill: THREE.Mesh | null = null, hillWhite: THREE.MeshLambertMaterial | null = null, hillWorn: THREE.ShaderMaterial | null = null, hillTex: THREE.CanvasTexture | null = null, hillOf = "";
  if (raise) {
    const B = raise.box;
    let land = new Float32Array(HX * HZ), tmp = new Float32Array(HX * HZ);
    for (let j = 0; j < HZ; j++) for (let i = 0; i < HX; i++) {
      const x = hx0 + i / G, z = hz0 + j / G, tx = Math.floor(x), tz = Math.floor(z);
      land[j * HX + i] = tx >= B.x && tz >= B.y && tx < B.x + B.w && tz < B.y + B.h && raise.land(tx, tz) ? 1 : 0;
    }
    const R = 4 * G;
    for (let pass = 0; pass < 4; pass++) {
      const across = pass % 2 === 0, n = across ? HX : HZ, m = across ? HZ : HX;
      for (let b = 0; b < m; b++) {
        let sum = 0;
        const at = (a: number) => { const c = Math.min(n - 1, Math.max(0, a)); return across ? b * HX + c : c * HX + b; };
        for (let a = -R; a <= R; a++) sum += land[at(a)];
        for (let a = 0; a < n; a++) { tmp[at(a)] = sum / (2 * R + 1); sum += land[at(a + R + 1)] - land[at(a - R)]; }
      }
      [land, tmp] = [tmp, land];
    }
    const smooth = (q: number) => { const t = Math.min(1, Math.max(0, q)); return t * t * (3 - 2 * t); };
    const pos = new Float32Array(HX * HZ * 3), idx = new Uint32Array((HX - 1) * (HZ - 1) * 6);
    for (let j = 0; j < HZ; j++) for (let i = 0; i < HX; i++) {
      const x = hx0 + i / G, z = hz0 + j / G, n = noise2(x * 0.055, z * 0.055) * 0.65 + noise2(x * 0.13 + 7.3, z * 0.13 + 2.1) * 0.35;
      const up = Math.max(0, n - 0.3) * 2.4 * smooth((land[j * HX + i] - 0.55) / 0.43);
      HGT[j * HX + i] = up;
      pos.set([x, up, z], (j * HX + i) * 3);
    }
    let o = 0;
    for (let j = 0; j < HZ - 1; j++) for (let i = 0; i < HX - 1; i++) { const a = j * HX + i; idx.set([a, a + HX, a + 1, a + 1, a + HX, a + HX + 1], o); o += 6; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    hillWhite = new THREE.MeshLambertMaterial({ color: 0xffffff });
    hillWorn = new THREE.ShaderMaterial({
      uniforms: { hdMap: { value: null }, hdK: { value: 1 } },
      // (each point of the raised ground shows what the level ground's picture has where that point lies on level ground)
      vertexShader: "varying vec2 hdUv; uniform float hdK; void main() { vec4 f = projectionMatrix * viewMatrix * vec4(position.x, 0.0, position.z, 1.0); hdUv = vec2(f.x / f.w * 0.5 + 0.5, 1.0 - (0.5 - f.y / f.w * 0.5) * hdK); gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 hdUv; uniform sampler2D hdMap; void main() { if (hdUv.x < 0.0 || hdUv.x > 1.0 || hdUv.y < 0.0 || hdUv.y > 1.0) discard; gl_FragColor = vec4(texture2D(hdMap, hdUv).rgb, 1.0); }",
    });
    hill = new THREE.Mesh(geo, hillWhite);
    hill.receiveShadow = true; hill.frustumCulled = false;
    scene.add(hill);
  }
  const Hat = (x: number, z: number): number => {
    if (!raise) return 0;
    const fx = (x - hx0) * G, fz = (z - hz0) * G;
    if (fx < 0 || fz < 0 || fx >= HX - 1 || fz >= HZ - 1) return 0;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j, a = j * HX + i;
    return (HGT[a] * (1 - u) + HGT[a + 1] * u) * (1 - w) + (HGT[a + HX] * (1 - u) + HGT[a + HX + 1] * u) * w;
  };

  const sheets = createSheets(scene);
  const sunDir = new THREE.Vector3(), eye = new THREE.Vector3();
  let surf: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; tex: THREE.DataTexture; geo: THREE.BufferGeometry; of: string } | null = null;
  const aim = (v: LiveView) => {
    const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite ? 1.5 : 2);
    if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
    const half = v.ch / (2 * PX_SIDE * v.s);
    camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
    camera.updateProjectionMatrix();
    eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
    camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
    camera.lookAt(eye);
  };
  let sized = { w: 0, h: 0, d: 0 }, reached = 0;
  return {
    renderAt(v, stood) {
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const night = sunAt(v.min, sunDir);
      // (as ./engine's `renderAt`: lit ground is white, a shadow half of it by day and deeper by night)
      const sunI = ((0.5 + 0.16 * night) * Math.PI) / Math.max(0.3, sunDir.y);
      sun.intensity = sunI; hemi.intensity = Math.PI - sunI * sunDir.y;
      const all = v.stands?.length ? [...stood, ...v.stands] : stood;
      if (raise) for (const s of all) s.up = Hat(s.x, s.y);
      sheets.set(all, sunDir);

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
      probe(renderer, camera, v, sunDir, raise ? Hat : undefined);
      return renderer.domElement;
    },
    heightAt: Hat,
    renderGround(v, src, extra) {
      if (!hill || !hillWorn || !hillWhite) return null;
      const of = `${src.width},${src.height}`;
      if (!hillTex || hillOf !== of) {
        hillTex?.dispose();
        hillTex = new THREE.CanvasTexture(src);
        // (the picture's own colours, untouched: read as they are and written as they are)
        hillTex.colorSpace = THREE.NoColorSpace; hillTex.generateMipmaps = false; hillTex.minFilter = hillTex.magFilter = THREE.NearestFilter;
        hillOf = of;
        hillWorn.uniforms.hdMap.value = hillTex;
      }
      hillTex.needsUpdate = true;
      aim(v);
      hillWorn.uniforms.hdK.value = v.ch / (v.ch + extra);
      hill.material = hillWorn;
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.autoUpdate = false;
      renderer.render(hill, camera);
      renderer.shadowMap.autoUpdate = true;
      hill.material = hillWhite;
      return renderer.domElement;
    },
    renderWater(v, wet, box, wetAt) {
      const of = `${box.x},${box.y},${box.w},${box.h}`;
      if (!surf || surf.of !== of) {
        if (surf) { surf.geo.dispose(); surf.mat.dispose(); surf.tex.dispose(); }
        // (a tile is the water's only if it and the eight about it are water)
        const data = new Uint8Array(box.w * box.h);
        for (let j = 0; j < box.h; j++) for (let i = 0; i < box.w; i++) {
          let all = true;
          for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1 && all; dx++) all = wetAt(box.x + i + dx, box.y + j + dy);
          data[j * box.w + i] = all ? 255 : 0;
        }
        const tex = new THREE.DataTexture(data, box.w, box.h, THREE.RedFormat, THREE.UnsignedByteType);
        tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true;
        const geo = new THREE.PlaneGeometry(box.w, box.h);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.ShaderMaterial({
          uniforms: { hdIndex: { value: tex }, hdOrigin: { value: new THREE.Vector4(box.x, box.y, box.w, box.h) }, hdTime: { value: 0 }, hdGlint: { value: 0.3 }, hdWet: { value: 0 } },
          vertexShader: "varying vec2 hdW; void main() { vec4 p = modelMatrix * vec4(position, 1.0); hdW = p.xz; gl_Position = projectionMatrix * viewMatrix * p; }",
          fragmentShader: `varying vec2 hdW; uniform sampler2D hdIndex; uniform vec4 hdOrigin; uniform float hdTime; uniform float hdGlint; uniform float hdWet;\n${NOISE}
            void main() {
              vec2 hdP = floor(hdW * 22.63) / 22.63;
              if (texture2D(hdIndex, (hdP - hdOrigin.xy) / hdOrigin.zw).r < 0.5) discard;
              float hdG = hdNoise(hdP * 5.5 + vec2(hdTime * 0.3, hdTime * 0.18)) * hdNoise(hdP * 11.0 - vec2(hdTime * 0.45, 0.0));
              float hdWhite = hdGlint * step(0.56, hdG);
              vec2 hdC = floor(hdW * 2.0);
              float hdR = fract(hdHash(hdC) + hdTime * 0.9);
              float hdD = length(fract(hdW * 2.0) - 0.5 - (vec2(hdHash(hdC + 3.1), hdHash(hdC + 7.7)) - 0.5) * 0.5);
              hdWhite = max(hdWhite, hdWet * 0.5 * (1.0 - hdR) * step(abs(hdD - hdR * 0.35), 0.035));
              gl_FragColor = vec4(vec3(hdWhite), hdWhite);
            }`,
          transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(box.x + box.w / 2, 0, box.y + box.h / 2);
        mesh.frustumCulled = false;
        surf = { mesh, mat, tex, geo, of };
      }
      aim(v);
      const night = sunAt(v.min, sunDir);
      surf.mat.uniforms.hdTime.value = performance.now() / 1000;
      surf.mat.uniforms.hdGlint.value = 0.36 * (1 - 0.7 * night) * (1 - 0.6 * wet);
      surf.mat.uniforms.hdWet.value = wet;
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.autoUpdate = false;
      renderer.render(surf.mesh, camera);
      renderer.shadowMap.autoUpdate = true;
      return renderer.domElement;
    },
    dispose() {
      if (surf) { surf.geo.dispose(); surf.mat.dispose(); surf.tex.dispose(); }
      if (hill) { hill.geometry.dispose(); hillWhite?.dispose(); hillWorn?.dispose(); hillTex?.dispose(); }
      groundGeo.dispose(); groundMat.dispose();
      sheets.dispose();
      renderer.dispose();
    },
  };
}
