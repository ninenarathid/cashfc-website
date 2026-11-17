/**
 * Putting a frame's world together in the 3D town's own picture, from what the live town drew through the bridge
 * (./capture): a canvas's picture laid whole (the floor), the sheet's pieces and the live town's plain pictures laid in
 * their turns, each as far forward as it stands, and the walkers stood in the scene in its light. Shared by the
 * editor's maps' town (./engine) and the other maps' (./shade): each has its own ground, shadows and what stands; this
 * is what both lay over them.
 */
import * as THREE from "three";
import type { Actor, Card } from "./capture";
import type { LiveView } from "./engine";

const PX_UP = 39.2, PITCH = Math.PI / 6, YAW = Math.PI / 4;
const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)), UPV = new THREE.Vector3(-Math.sin(YAW) * Math.sin(PITCH), Math.cos(PITCH), -Math.cos(YAW) * Math.sin(PITCH));

/** The scene the world is laid in: its renderer, lights and camera (aimed at the frame's view already), the ground's height, where the sun stands, how strong and what colour its light on a walker's edge is, and what is hidden while a walker is stood (the ground, down already). */
export interface WorldHost {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera;
  heightAt(x: number, z: number): number;
  sunDir: THREE.Vector3;
  light(): { i: number; col: number };
  grounds(): THREE.Object3D[];
}
type Box = { x: number; y: number; w: number; h: number; ax: number; ay: number; depth?: number };
export interface World {
  /** A canvas's picture, so many boxes of it, each laid where it was drawn on the screen (all in the frame's own pixels). */
  lay(c: HTMLCanvasElement, list: ReadonlyArray<Box>, W: number, H: number): void;
  /** Every piece, plain picture and walker of the frame, in its turn; `solid`: each behind or before what stands in the scene, by how far forward it stands. */
  pieces(v: LiveView, atlas: HTMLCanvasElement, cards: ReadonlyArray<Card>, dolls: HTMLCanvasElement | null, W: number, H: number, solid: boolean): void;
  dispose(): void;
}

export function createWorld(h: WorldHost): World {
  const { renderer, scene, camera } = h;
  const V = new THREE.Vector3();
  const kept: Array<{ dispose(): void }> = [];
  type Deep = (q: { x: number; y: number; w: number; h: number; depth?: number }) => [number, number];

  // ── a canvas's picture, in boxes ──
  const qGeo = new THREE.BufferGeometry();
  const qMat = new THREE.ShaderMaterial({
    uniforms: { hdMap: { value: null } },
    vertexShader: "varying vec2 hdUv; void main() { hdUv = uv; gl_Position = vec4(position.xyz, 1.0); }",
    fragmentShader: "varying vec2 hdUv; uniform sampler2D hdMap; void main() { gl_FragColor = texture2D(hdMap, hdUv); }",
    // (a canvas's picture comes with its colours already weighed by how solid they are: laid as such)
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const qMesh = new THREE.Mesh(qGeo, qMat);
  qMesh.frustumCulled = false;
  kept.push(qGeo, qMat);
  let qPos = new Float32Array(0), qUv = new Float32Array(0), qRoom = 0;
  const qTex = new Map<HTMLCanvasElement, { tex: THREE.CanvasTexture; key: string }>();
  const texOf = (c: HTMLCanvasElement) => {
    const key = `${c.width},${c.height}`;
    let t = qTex.get(c);
    if (!t || t.key !== key) {
      t?.tex.dispose();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.premultiplyAlpha = true;
      t = { tex, key };
      qTex.set(c, t);
    }
    t.tex.needsUpdate = true;
    return t.tex;
  };
  const room = (n: number, geo: THREE.BufferGeometry, extra?: string) => {
    const size = Math.max(256, n * 2), pos = new Float32Array(size * 12), uv = new Float32Array(size * 8), idx = new Uint32Array(size * 6);
    for (let i = 0; i < size; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const more = extra ? new Float32Array(size * 4) : null;
    if (more && extra) geo.setAttribute(extra, new THREE.BufferAttribute(more, 1).setUsage(THREE.DynamicDrawUsage));
    return { size, pos, uv, more };
  };
  const lay = (c: HTMLCanvasElement, list: ReadonlyArray<Box>, W: number, H: number, deep?: Deep) => {
    if (!list.length) return;
    if (qRoom < list.length) { const r = room(list.length, qGeo); qRoom = r.size; qPos = r.pos; qUv = r.uv; }
    list.forEach((q, i) => {
      const x0 = (q.x / W) * 2 - 1, x1 = ((q.x + q.w) / W) * 2 - 1, y0 = 1 - (q.y / H) * 2, y1 = 1 - ((q.y + q.h) / H) * 2;
      const u0 = q.ax / c.width, u1 = (q.ax + q.w) / c.width, v0 = 1 - q.ay / c.height, v1 = 1 - (q.ay + q.h) / c.height;
      const [zb, zt] = deep ? deep(q) : [0, 0];
      qPos.set([x0, y1, zb, x1, y1, zb, x1, y0, zt, x0, y0, zt], i * 12);
      qUv.set([u0, v1, u1, v1, u1, v0, u0, v0], i * 8);
    });
    qGeo.attributes.position.needsUpdate = true; qGeo.attributes.uv.needsUpdate = true;
    qGeo.setDrawRange(0, list.length * 6);
    qMat.uniforms.hdMap.value = texOf(c);
    qMat.depthTest = !!deep;
    renderer.render(qMesh, camera);
  };

  // ── the live town's own pictures drawn plainly, all of one picture, straight from it ──
  const sGeo = new THREE.BufferGeometry();
  const sMat = new THREE.ShaderMaterial({
    uniforms: { hdMap: { value: null } },
    vertexShader: "attribute float hdA; varying vec2 hdUv; varying float hdAlpha; void main() { hdUv = uv; hdAlpha = hdA; gl_Position = vec4(position.xyz, 1.0); }",
    fragmentShader: "varying vec2 hdUv; varying float hdAlpha; uniform sampler2D hdMap; void main() { vec4 c = texture2D(hdMap, hdUv); gl_FragColor = vec4(c.rgb, c.a * hdAlpha); }",
    transparent: true, depthWrite: false,
  });
  const sMesh = new THREE.Mesh(sGeo, sMat);
  sMesh.frustumCulled = false;
  kept.push(sGeo, sMat);
  let sPos = new Float32Array(0), sUv = new Float32Array(0), sAl = new Float32Array(0), sRoom = 0;
  const sTex = new Map<HTMLImageElement, THREE.Texture>(), sSoft = new Map<HTMLImageElement, THREE.Texture>();
  const laySprites = (img: HTMLImageElement, list: ReadonlyArray<Card>, W: number, H: number, deep?: Deep) => {
    if (sRoom < list.length) { const r = room(list.length, sGeo, "hdA"); sRoom = r.size; sPos = r.pos; sUv = r.uv; sAl = r.more!; }
    // (as the live town drew it: its pixels as they are, or smoothed)
    const soft = !!list[0].sprite!.smooth, of = soft ? sSoft : sTex;
    let tex = of.get(img);
    if (!tex) {
      tex = new THREE.Texture(img);
      tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = soft ? THREE.LinearFilter : THREE.NearestFilter; tex.needsUpdate = true;
      of.set(img, tex);
    }
    const IW = img.naturalWidth, IH = img.naturalHeight;
    list.forEach((q, i) => {
      const sp = q.sprite!;
      const x0 = (q.x / W) * 2 - 1, x1 = ((q.x + q.w) / W) * 2 - 1, y0 = 1 - (q.y / H) * 2, y1 = 1 - ((q.y + q.h) / H) * 2;
      let u0 = q.ax / IW, u1 = (q.ax + sp.sw) / IW;
      if (sp.flip) [u0, u1] = [u1, u0];
      const v0 = 1 - q.ay / IH, v1 = 1 - (q.ay + sp.sh) / IH, [zb, zt] = deep ? deep(q) : [0, 0];
      sPos.set([x0, y1, zb, x1, y1, zb, x1, y0, zt, x0, y0, zt], i * 12);
      sUv.set([u0, v1, u1, v1, u1, v0, u0, v0], i * 8);
      sAl.fill(sp.alpha, i * 4, i * 4 + 4);
    });
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.uv.needsUpdate = true; sGeo.attributes.hdA.needsUpdate = true;
    sGeo.setDrawRange(0, list.length * 6);
    sMat.uniforms.hdMap.value = tex;
    sMat.depthTest = !!deep;
    renderer.render(sMesh, camera);
  };

  // ── a walker stood in the scene: their doll's cell of the live town's dolls' sheet on an upright sheet where they stand,
  // in the scene's light as the trial's doll is: an edge of sun on the sun's side, and the dark of a shadow over all of
  // them when their body is in one (asked at one point, before their own shadow, so they are in or out whole) ──
  let actor: { mesh: THREE.Mesh; geo: THREE.BufferGeometry; mat: THREE.MeshLambertMaterial; tex: THREE.CanvasTexture; of: string } | null = null;
  const rim = { value: new THREE.Vector3() }, rimCol = { value: new THREE.Color() }, body = { value: new THREE.Vector3() };
  let stagedAt = -1, frameNo = 0;
  const stage = (v: LiveView, c: Card, a: Actor, dolls: HTMLCanvasElement, dp: number, solid: boolean) => {
    const of = `${dolls.width},${dolls.height}`;
    if (!actor || actor.of !== of) {
      if (actor) { scene.remove(actor.mesh); actor.geo.dispose(); actor.mat.dispose(); actor.tex.dispose(); }
      const tex = new THREE.CanvasTexture(dolls);
      tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false });
      mat.onBeforeCompile = (sh) => {
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
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(8), 2).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.visible = false;
      scene.add(mesh);
      actor = { mesh, geo, mat, tex, of };
    }
    const A = actor, d = a.bx + a.bz;
    // (a point of the screen, on the upright sheet through where they stand that faces the view)
    const at = (X: number, Y: number): [number, number, number] => {
      const ix = v.cx + (X / dp - v.cw / 2) / v.s, iy = v.cy + (Y / dp - v.ch / 2) / v.s;
      return [(d + ix / 32) / 2, (d * 16 - iy) / PX_UP, (d - ix / 32) / 2];
    };
    const pos = A.geo.attributes.position as THREE.BufferAttribute, uv = A.geo.attributes.uv as THREE.BufferAttribute;
    [at(c.x, c.y + c.h), at(c.x + c.w, c.y + c.h), at(c.x + c.w, c.y), at(c.x, c.y)].forEach((q, i) => pos.setXYZ(i, q[0], q[1], q[2]));
    const u0 = c.ax / dolls.width, u1 = (c.ax + a.sw) / dolls.width, v1 = 1 - c.ay / dolls.height, v0 = 1 - (c.ay + a.sh) / dolls.height;
    uv.setXY(0, u0, v0); uv.setXY(1, u1, v0); uv.setXY(2, u1, v1); uv.setXY(3, u0, v1);
    pos.needsUpdate = true; uv.needsUpdate = true;
    if (stagedAt !== frameNo) { A.tex.needsUpdate = true; stagedAt = frameNo; }
    const L = h.light(), sx = h.sunDir.dot(RIGHT), sy = h.sunDir.dot(UPV), sl = Math.hypot(sx, sy) || 1;
    rim.value.set(((sx / sl) * 1.6 * (a.sw / c.w)) / dolls.width, ((sy / sl) * 1.6 * (a.sh / c.h)) / dolls.height, 0.16 * L.i);
    rimCol.value.setHex(L.col);
    body.value.set(a.bx + h.sunDir.x * 0.45, h.heightAt(a.bx, a.bz) + 0.8, a.bz + h.sunDir.z * 0.45);
    A.mat.opacity = a.alpha;
    A.mat.depthTest = solid;
    // (alone: the ground is down already, and nothing else of the scene is seen)
    const grounds = h.grounds().filter((g) => g.visible);
    A.mesh.visible = true;
    for (const g of grounds) g.visible = false;
    // (a scene with a colour behind it wipes the picture before it draws: there is none behind this one)
    const back = scene.background;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = true;
    scene.background = back;
    for (const g of grounds) g.visible = true;
    A.mesh.visible = false;
  };

  return {
    lay: (c, list, W, H) => lay(c, list, W, H),
    pieces(v, atlas, cards, dolls, W, H, solid) {
      frameNo++;
      const dp = W / v.cw, deep: Deep | undefined = solid ? (q) => {
        const d = q.depth ?? 0, z = (X: number, Y: number) => {
          const ix = v.cx + (X / dp - v.cw / 2) / v.s, iy = v.cy + (Y / dp - v.ch / 2) / v.s;
          return V.set((d + ix / 32) / 2, (d * 16 - iy) / PX_UP, (d - ix / 32) / 2).project(camera).z;
        };
        return [z(q.x + q.w / 2, q.y + q.h), z(q.x + q.w / 2, q.y)];
      } : undefined;
      // (a run of the sheet's pieces; a run of one picture's own; a walker)
      const kind = (q: Card | undefined) => (!q ? null : q.actor ? "actor" : q.sprite ? q.sprite.img : atlas);
      const same = (a: Card, b: Card) => kind(a) === kind(b) && !!a.sprite?.smooth === !!b.sprite?.smooth;
      let from = 0;
      for (let i = 0; i <= cards.length; i++) {
        const c = cards[i];
        if (c && i > from && same(c, cards[i - 1]) && !c.actor) continue;
        if (i > from) {
          const run = cards.slice(from, i), first = run[0];
          if (first.sprite) laySprites(first.sprite.img, run, W, H, deep);
          else if (!first.actor) lay(atlas, run, W, H, deep);
        }
        from = i;
        if (c?.actor) { if (dolls) stage(v, c, c.actor, dolls, dp, solid); from = i + 1; }
      }
    },
    dispose() {
      for (const k of kept) k.dispose();
      for (const t of qTex.values()) t.tex.dispose();
      for (const t of [...sTex.values(), ...sSoft.values()]) t.dispose();
      if (actor) { scene.remove(actor.mesh); actor.geo.dispose(); actor.mat.dispose(); actor.tex.dispose(); }
    },
  };
}
