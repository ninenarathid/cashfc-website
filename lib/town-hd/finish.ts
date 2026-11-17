/**
 * The HD town's finish over the live town's own picture (the owner, 2026-11-17: "วาดใหม่เป็น 3d เหมือนหน้า test hd
 * ทำให้ครบทุกแมพ"): the whole frame the live town has drawn, on any map, is taken as it is and given what makes the
 * trial's picture look as it does: the glow of what is bright, the hour's colour over everything, the corners drawn in,
 * and what hangs in the air (motes in the sun, fireflies at night, petals), seen by the live town's own camera.
 *
 * It is drawn on a canvas of its own laid over the live town's (which goes on being drawn under it, unseen): nothing of
 * the live town's drawing is changed, and with this off the town is as it always was.
 */
import * as THREE from "three";
import type { LiveView, Quality } from "./engine";
import { makeAir, makePost } from "./fx";

export interface Finish { /** The canvas it is drawn on. */ canvas: HTMLCanvasElement; render(src: HTMLCanvasElement, v: LiveView, more: { indoors: boolean; still: boolean }): void; dispose(): void }

/** The hours (./engine's SKIES, the same four): the colour over the picture, [colour's strength, corners, glow, motes, fireflies, mist, sun shafts, clouds], how far the lamps are lit, the sun's stand and colour. */
interface Hour { grade: number[]; air: number[]; lamps: number; sun: number[]; col: number }
const H: Record<string, Hour> = {
  morning: { grade: [0.97, 1.0, 1.05], air: [1.04, 0.2, 0.5, 0.5, 0, 1, 0.6, 0.6], lamps: 0, sun: [0.74, 0.5, -0.2], col: 0xffe0c0 },
  day: { grade: [1.0, 1.0, 1.0], air: [1.1, 0.14, 0.4, 0.7, 0, 0, 0.15, 1], lamps: 0, sun: [-0.1, 0.9, 0.6], col: 0xfffaf0 },
  evening: { grade: [1.04, 0.99, 0.95], air: [1.06, 0.24, 0.45, 0.8, 0.25, 0, 0.7, 0.6], lamps: 0.35, sun: [-0.42, 0.45, 0.71], col: 0xff9a52 },
  night: { grade: [0.92, 0.97, 1.08], air: [0.98, 0.34, 0.6, 0, 1, 0.3, 0, 0.3], lamps: 1, sun: [-0.55, 0.58, 0.4], col: 0x86a4ff },
};
const KEYS: Array<[number, string]> = [[0, "night"], [270, "night"], [390, "morning"], [630, "day"], [900, "day"], [1050, "evening"], [1170, "night"], [1440, "night"]];
const PX_SIDE = 45.25, PITCH = Math.PI / 6, YAW = Math.PI / 4;

export function createFinish(canvas: HTMLCanvasElement, quality: Quality): Finish {
  const lite = quality !== "high";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);
  scene.add(camera);
  let tex: THREE.CanvasTexture | null = null, texOf: HTMLCanvasElement | null = null, texSize = "";
  const post = makePost(renderer, scene, camera, lite, 0.8);
  const air = makeAir(scene, camera, { small: lite, fore: null, heightAt: () => 0, wetAt: () => false, chimneys: [], far: false, ratio: Math.min(window.devicePixelRatio || 1, 2) });
  const eye = new THREE.Vector3(), sunDir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), sunCol = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
  const grade = [1, 1, 1], airNow = [1, 0.2, 0.4, 0, 0, 0, 0, 0];
  let sized = "", last = 0;
  return {
    canvas,
    render(src, v, more) {
      const w = Math.max(1, Math.round(v.cw)), h = Math.max(1, Math.round(v.ch)), dpr = Math.min(v.dpr, lite ? 1.5 : 2);
      if (`${w},${h},${dpr}` !== sized) { sized = `${w},${h},${dpr}`; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); post.setSize(w, h, dpr); }
      // the live town's frame, as it is
      const size = `${src.width},${src.height}`;
      if (!tex || texOf !== src || texSize !== size) {
        tex?.dispose();
        tex = new THREE.CanvasTexture(src);
        tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter;
        texOf = src; texSize = size;
        scene.background = tex;
      }
      tex.needsUpdate = true;

      // the hour
      const m = ((v.min % 1440) + 1440) % 1440;
      let i = 0;
      while (i < KEYS.length - 2 && m >= KEYS[i + 1][0]) i++;
      const t = (m - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]), k = t * t * (3 - 2 * t), A = H[KEYS[i][1]], B = H[KEYS[i + 1][1]], mix = (a: number, b: number) => a + (b - a) * k;
      for (let j = 0; j < 3; j++) grade[j] = mix(A.grade[j], B.grade[j]);
      for (let j = 0; j < airNow.length; j++) airNow[j] = mix(A.air[j], B.air[j]);
      const lamps = mix(A.lamps, B.lamps);
      sunDir.set(mix(A.sun[0], B.sun[0]), mix(A.sun[1], B.sun[1]), mix(A.sun[2], B.sun[2])).normalize();
      sunCol.copy(cA.setHex(A.col)).lerp(cB.setHex(B.col), k);

      // the live town's own camera
      const half = v.ch / (2 * PX_SIDE * v.s);
      camera.top = half; camera.bottom = -half; camera.right = (half * v.cw) / v.ch; camera.left = -camera.right;
      camera.updateProjectionMatrix();
      eye.set((v.cx / 32 + v.cy / 16) / 2, 0, (v.cy / 16 - v.cx / 32) / 2);
      camera.position.set(eye.x + Math.sin(YAW) * Math.cos(PITCH) * 250, Math.sin(PITCH) * 250, eye.z + Math.cos(YAW) * Math.cos(PITCH) * 250);
      camera.lookAt(eye);
      camera.updateMatrixWorld();
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);

      // (the live town has laid its own night and weather over the frame: here the hour only colours it a little, and
      // what is bright in it glows, more by night when the bright things are its lamps)
      post.look(grade, more.indoors ? 1.04 : airNow[0], airNow[1] * 0.8, more.indoors ? 0.28 : 0.16 + 0.3 * lamps);
      const sec = performance.now() / 1000, dt = more.still ? 0 : Math.min(0.05, last ? sec - last : 0);
      last = sec;
      const out = more.indoors ? 0 : 1;
      air.update(dt, sec, eye, half, v.cw / v.ch, {
        motes: airNow[3] * 0.5 * out, flies: airNow[4] * out, mist: 0, rays: airNow[6] * 0.6 * out, rain: 0, dry: null, dim: lamps, petals: 0, smoke: 0,
        sunX: sunDir.dot(right), sunY: sunDir.dot(up), sun: sunCol,
      });
      post.render();
    },
    dispose() { tex?.dispose(); post.dispose(); air.dispose(); renderer.dispose(); },
  };
}
