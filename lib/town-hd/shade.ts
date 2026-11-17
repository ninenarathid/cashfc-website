/**
 * 3D shadows for the live town's maps that are not the map editor's (the owner, 2026-11-17: "ทำให้ครบทุกแมพเลย"): the
 * forest and the mountain. Their trees, rocks and camps are lists in lib/town/world, drawn by the live town from its own
 * sheets; here each is only a plain shape of its kind's size, unseen, standing where the live town draws it and throwing
 * its shadow on white ground. The picture is laid over the live town's ground as the editor's maps' is (./engine's
 * `renderAt`): the same camera, the same sun.
 *
 * (Under a roof or under the ground there is no sun: the clothes shop, the casino and the cave have no shadows.)
 */
import * as THREE from "three";
import { FOREST_PROPS, GREAT_TREE, MOUNTAIN_PROPS, type Prop } from "@/lib/town/world";
import type { LiveView, Quality } from "./engine";

export type ShadePlace = "forest" | "mountain";
export interface Shade { renderAt(v: LiveView): HTMLCanvasElement; ready(): boolean; dispose(): void }

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

/** What a kind of thing is, to its shadow: a round crown on a trunk, a cone, a low mound, a block; sizes in tiles. */
type Form = { crown?: [radius: number, height: number]; cone?: [radius: number, height: number]; mound?: number; block?: [w: number, h: number, d: number]; trunk?: [radius: number, height: number] };
const FORMS: Record<string, Form> = {
  tree: { crown: [1.15, 2.3], trunk: [0.16, 2] }, oak: { crown: [1.3, 2.4], trunk: [0.2, 2] }, birch: { crown: [0.85, 2.7], trunk: [0.1, 2.4] },
  pine: { cone: [0.95, 3.6] }, mtree: { cone: [0.9, 3.4] }, bamboo: { trunk: [0.32, 3.2] },
  bush: { mound: 0.55 }, rock: { mound: 0.45 }, mrock: { mound: 0.5 }, boulder: { mound: 0.8 },
  log: { block: [1.3, 0.4, 0.5] }, logseat: { block: [1.2, 0.4, 0.5] }, stump: { trunk: [0.36, 0.45] }, tent: { cone: [1.1, 1.6] },
  bench: { block: [1.2, 0.5, 0.5] }, storebox: { block: [0.9, 0.7, 0.7] }, signpost: { trunk: [0.08, 1.6] }, lamp: { trunk: [0.08, 1.8] },
};
const PX_SIDE = 45.25, PITCH = Math.PI / 6, YAW = Math.PI / 4;

export function createShade(canvas: HTMLCanvasElement, place: ShadePlace, quality: Quality): Shade {
  const lite = quality !== "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1), sun = new THREE.DirectionalLight(0xffffff, 1);
  const SH = lite ? 1024 : 2048, REACH = 30;
  sun.castShadow = true;
  sun.shadow.mapSize.set(SH, SH);
  Object.assign(sun.shadow.camera, { left: -REACH, right: REACH, top: REACH, bottom: -REACH, near: 1, far: 220 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  // the ground: one white sheet under wherever the view is
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // what stands: a shape a kind, all of a kind in one set, unseen
  const props: Prop[] = place === "forest" ? FOREST_PROPS : MOUNTAIN_PROPS;
  const unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const ball = new THREE.SphereGeometry(1, 12, 8), cone = new THREE.ConeGeometry(1, 1, 12), post = new THREE.CylinderGeometry(1, 1, 1, 8), box = new THREE.BoxGeometry(1, 1, 1);
  const at: Record<"ball" | "cone" | "post" | "box", THREE.Matrix4[]> = { ball: [], cone: [], post: [], box: [] };
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const put = (set: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number) => set.push(new THREE.Matrix4().compose(P.set(x, y, z), Q, S.set(sx, sy, sz)));
  const stand = (f: Form, x: number, z: number, k = 1) => {
    if (f.trunk) put(at.post, x, (f.trunk[1] * k) / 2, z, f.trunk[0] * k, f.trunk[1] * k, f.trunk[0] * k);
    if (f.crown) put(at.ball, x, f.crown[1] * k, z, f.crown[0] * k, f.crown[0] * k * 0.85, f.crown[0] * k);
    if (f.cone) put(at.cone, x, (f.cone[1] * k) / 2, z, f.cone[0] * k, f.cone[1] * k, f.cone[0] * k);
    if (f.mound) put(at.ball, x, f.mound * k * 0.35, z, f.mound * k, f.mound * k * 0.7, f.mound * k);
    if (f.block) put(at.box, x, (f.block[1] * k) / 2, z, f.block[0] * k, f.block[1] * k, f.block[2] * k);
  };
  for (const p of props) { const f = FORMS[p.kind as string]; if (f) stand(f, p.x + 0.5, p.y + 0.62); }
  // (the forest's great tree, three tiles a side)
  if (place === "forest") stand({ crown: [3.4, 6], trunk: [0.9, 5] }, GREAT_TREE.x + GREAT_TREE.w / 2, GREAT_TREE.y + GREAT_TREE.h / 2);
  const sets: THREE.InstancedMesh[] = [];
  (Object.entries(at) as Array<[keyof typeof at, THREE.Matrix4[]]>).forEach(([kind, list]) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(kind === "ball" ? ball : kind === "cone" ? cone : kind === "post" ? post : box, unseen, list.length);
    list.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.castShadow = true; m.frustumCulled = false;
    scene.add(m);
    sets.push(m);
  });

  const sunDir = new THREE.Vector3(), eye = new THREE.Vector3();
  let sized = { w: 0, h: 0, d: 0 };
  return {
    ready: () => true,
    renderAt(v) {
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, quality === "low" ? 1 : lite ? 1.5 : 2);
      if (w !== sized.w || h !== sized.h || dpr !== sized.d) { sized = { w, h, d: dpr }; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      const night = sunAt(v.min, sunDir);
      // (as ./engine's `renderAt`: lit ground is white, a shadow half of it by day and deeper by night)
      const sunI = ((0.5 + 0.16 * night) * Math.PI) / Math.max(0.3, sunDir.y);
      sun.intensity = sunI; hemi.intensity = Math.PI - sunI * sunDir.y;
      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      ground.position.set(Math.round(eye.x), 0, Math.round(eye.z));
      const texel = (REACH * 2) / SH, ax = Math.round(eye.x / texel) * texel, az = Math.round(eye.z / texel) * texel;
      sun.target.position.set(ax, 0, az);
      sun.position.set(ax + sunDir.x * 90, sunDir.y * 90, az + sunDir.z * 90);
      renderer.render(scene, camera);
      return renderer.domElement;
    },
    dispose() {
      for (const g of [groundGeo, ball, cone, post, box]) g.dispose();
      groundMat.dispose(); unseen.dispose();
      for (const m of sets) m.dispose();
      renderer.dispose();
    },
  };
}
