/**
 * Light and air for the HD-2D trial (the owner, 2026-11-17, of the list of what the look still lacked: "ทำทุกข้อเลย"):
 * what makes a scene of pixel pictures read as lit, and as having weather in it.
 * - `makePost`: the bright parts of the picture glow past their edges (windows, lanterns, the sun on water), and the
 *   whole picture takes the hour's colour and darkens a little to its corners. Nothing is blurred: only what is
 *   brighter than white spreads, over a scene that stays as sharp as it was drawn.
 * - `makeAir`: what floats: dust in the sun, fireflies, petals, mist on the water before the day, smoke from a
 *   chimney, and the sun's shafts across the view.
 * - `NOISE`: one small piece of shader the ground's cloud shadows and the water's glints are made of.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export const NOISE = `
float hdHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hdNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hdHash(i), hdHash(i + vec2(1.0, 0.0)), f.x), mix(hdHash(i + vec2(0.0, 1.0)), hdHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

/** The same noise for what is laid out once, off the card: the hills beyond a map. */
export function noise2(x: number, y: number): number {
  const h = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const GRADE = {
  uniforms: { tDiffuse: { value: null }, tint: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 }, vig: { value: 0.2 } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 tint; uniform float sat; uniform float vig; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 g = mix(vec3(l), c.rgb, sat) * tint;
      float edge = smoothstep(0.38, 0.9, length((vUv - 0.5) * vec2(1.0, 0.92)));
      gl_FragColor = vec4(max(g * (1.0 - vig * edge), 0.0), c.a);
    }`,
};

export interface Post { render(): void; setSize(w: number, h: number, ratio: number): void; look(tint: readonly number[], sat: number, vig: number, bloom: number): void; dispose(): void }
export function makePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, small: boolean): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // (on a phone the glow is worked out on a quarter of the pixels: it is soft, and nothing is lost by it)
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, small ? 0.35 : 0.5, 1.0);
  const grade = new ShaderPass(GRADE);
  composer.addPass(bloom);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(w, h, ratio) { composer.setPixelRatio(ratio); composer.setSize(w, h); if (small) bloom.resolution.set(w / 2, h / 2); },
    look(tint, sat, vig, strength) {
      (grade.uniforms.tint.value as THREE.Vector3).set(tint[0], tint[1], tint[2]);
      grade.uniforms.sat.value = sat; grade.uniforms.vig.value = vig; bloom.strength = strength;
    },
    dispose: () => composer.dispose(),
  };
}

/** How much of each thing is in the air at an hour, 0 to 1. */
export interface AirNow { motes: number; flies: number; mist: number; rays: number; petals: number; smoke: number; sunX: number; sunY: number; sun: THREE.Color }
export interface Air { update(dt: number, sec: number, at: THREE.Vector3, halfH: number, aspect: number, now: AirNow): void; dispose(): void }

export function makeAir(scene: THREE.Scene, camera: THREE.Camera, o: { small: boolean; wetAt: (x: number, z: number) => boolean; chimneys: THREE.Vector3[]; ratio: number }): Air {
  const kept: Array<{ dispose(): void }> = [];
  let seed = 4242;
  const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const SPAN = 34, TALL = 7;
  const dot = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!, soft = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    soft.addColorStop(0, "rgba(255,255,255,1)"); soft.addColorStop(0.5, "rgba(255,255,255,0.45)"); soft.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = soft; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    kept.push(t);
    return t;
  })();
  /** A cloud of points about where one looks, each on its own slow path, wrapped so it is never left behind. */
  function cloud(n: number, size: number, color: number, blending: THREE.Blending, colored = false) {
    const base = new Float32Array(n * 4), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { base[i * 4] = r() * SPAN; base[i * 4 + 1] = r() * TALL; base[i * 4 + 2] = r() * SPAN; base[i * 4 + 3] = r() * 6.283; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    if (colored) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: size * o.ratio, sizeAttenuation: false, color, transparent: true, opacity: 0, blending, depthWrite: false, vertexColors: colored, fog: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    kept.push(geo, mat);
    return { n, base, pos, col, geo, mat, pts };
  }
  const wrap = (v: number, by: number) => ((v % by) + by) % by;
  const motes = cloud(o.small ? 60 : 130, 2, 0xfff0c8, THREE.AdditiveBlending);
  const flies = cloud(o.small ? 36 : 70, 3, 0xffffff, THREE.AdditiveBlending, true);
  const petals = cloud(o.small ? 40 : 90, 3, 0xffb7cf, THREE.NormalBlending);

  // mist: soft sheets lying low on water
  const mistMat = new THREE.SpriteMaterial({ map: dot, color: 0xdfeeff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  kept.push(mistMat);
  const mist = Array.from({ length: o.small ? 10 : 22 }, () => {
    const s = new THREE.Sprite(mistMat);
    s.scale.set(7 + r() * 5, 2 + r() * 1.2, 1);
    s.visible = false;
    scene.add(s);
    return { s, ox: (r() - 0.5) * 44, oz: (r() - 0.5) * 44, ph: r() * 6.283 };
  });

  // smoke: a few puffs a chimney, each rising, widening and thinning out
  const puffs = o.chimneys.flatMap((c) => Array.from({ length: 6 }, (_, i) => {
    const m = new THREE.SpriteMaterial({ map: dot, color: 0xb9b2aa, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m);
    scene.add(s);
    kept.push(m);
    return { s, m, c, at: i / 6 };
  }));

  // the sun's shafts: long pale bands across the view, lying the way the light falls
  const shaft = (() => {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 128;
    const g = c.getContext("2d")!, across = g.createLinearGradient(0, 0, 32, 0);
    across.addColorStop(0, "rgba(255,255,255,0)"); across.addColorStop(0.5, "rgba(255,255,255,1)"); across.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = across; g.fillRect(0, 0, 32, 128);
    const along = g.createLinearGradient(0, 0, 0, 128);
    along.addColorStop(0, "rgba(0,0,0,0)"); along.addColorStop(0.3, "rgba(0,0,0,1)"); along.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in"; g.fillStyle = along; g.fillRect(0, 0, 32, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const rayGeo = new THREE.PlaneGeometry(1, 1), rayMat = new THREE.MeshBasicMaterial({ map: shaft, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false });
  kept.push(shaft, rayGeo, rayMat);
  const rays = [-0.72, -0.3, 0.08, 0.5, 0.86].map((x, i) => {
    const m = new THREE.Mesh(rayGeo, rayMat);
    m.renderOrder = 8; m.frustumCulled = false;
    camera.add(m);
    return { m, x, w: 0.16 + (i % 3) * 0.07, ph: i * 1.9 };
  });

  return {
    update(dt, sec, at, halfH, aspect, now) {
      const cx = at.x - SPAN / 2, cz = at.z - SPAN / 2;
      // dust in the sun: drifting, turning over slowly
      motes.mat.opacity = now.motes * 0.55; motes.pts.visible = now.motes > 0.02;
      if (motes.pts.visible) {
        for (let i = 0; i < motes.n; i++) {
          const b = i * 4, ph = motes.base[b + 3];
          motes.pos[i * 3] = cx + wrap(motes.base[b] + sec * 0.25 + Math.sin(sec * 0.4 + ph) * 0.6 - cx, SPAN);
          motes.pos[i * 3 + 1] = 0.4 + wrap(motes.base[b + 1] + Math.sin(sec * 0.3 + ph * 2) * 0.5, TALL);
          motes.pos[i * 3 + 2] = cz + wrap(motes.base[b + 2] + Math.cos(sec * 0.33 + ph) * 0.6 - cz, SPAN);
        }
        motes.geo.attributes.position.needsUpdate = true;
      }
      // fireflies: low, wandering, each lit for a breath and dark for two
      flies.mat.opacity = now.flies; flies.pts.visible = now.flies > 0.02;
      if (flies.pts.visible) {
        for (let i = 0; i < flies.n; i++) {
          const b = i * 4, ph = flies.base[b + 3], lit = Math.max(0, Math.sin(sec * (0.7 + (ph % 1) * 0.6) + ph * 3)) ** 3;
          flies.pos[i * 3] = cx + wrap(flies.base[b] + Math.sin(sec * 0.35 + ph) * 1.6 - cx, SPAN);
          flies.pos[i * 3 + 1] = 0.5 + (flies.base[b + 1] / TALL) * 1.8 + Math.sin(sec * 0.8 + ph * 2) * 0.3;
          flies.pos[i * 3 + 2] = cz + wrap(flies.base[b + 2] + Math.cos(sec * 0.3 + ph * 1.3) * 1.6 - cz, SPAN);
          flies.col[i * 3] = 1.6 * lit; flies.col[i * 3 + 1] = 2.0 * lit; flies.col[i * 3 + 2] = 0.5 * lit;
        }
        flies.geo.attributes.position.needsUpdate = true; flies.geo.attributes.color.needsUpdate = true;
      }
      // petals: falling aslant, a few at a time
      petals.mat.opacity = now.petals * 0.9; petals.pts.visible = now.petals > 0.02;
      if (petals.pts.visible) {
        for (let i = 0; i < petals.n; i++) {
          const b = i * 4, ph = petals.base[b + 3], fall = sec * (0.5 + (ph % 1) * 0.3);
          petals.pos[i * 3] = cx + wrap(petals.base[b] + fall * 0.8 + Math.sin(sec * 1.1 + ph) * 0.4 - cx, SPAN);
          petals.pos[i * 3 + 1] = wrap(petals.base[b + 1] - fall, TALL);
          petals.pos[i * 3 + 2] = cz + wrap(petals.base[b + 2] + Math.cos(sec * 0.9 + ph) * 0.4 - cz, SPAN);
        }
        petals.geo.attributes.position.needsUpdate = true;
      }
      // mist: only over water, wherever in the view that is
      mistMat.opacity = now.mist * 0.2;
      for (const q of mist) {
        const x = at.x + wrap(q.ox + sec * 0.25 - at.x + 22, 44) - 22, z = at.z + wrap(q.oz - at.z + 22, 44) - 22;
        q.s.visible = now.mist > 0.02 && o.wetAt(x, z);
        if (q.s.visible) q.s.position.set(x, 0.45 + Math.sin(sec * 0.3 + q.ph) * 0.12, z);
      }
      for (const p of puffs) {
        p.at = (p.at + dt / 5) % 1;
        const k = p.at;
        p.s.position.set(p.c.x + k * k * 1.4 + Math.sin(sec + k * 9) * 0.08, p.c.y + k * 2.6, p.c.z - k * k * 0.5);
        p.s.scale.setScalar(0.5 + k * 1.5);
        p.m.opacity = now.smoke * 0.5 * Math.sin(Math.min(1, k * 1.15) * Math.PI);
      }
      // (the bands lie along the light's own way down the screen, and breathe)
      const turn = Math.atan2(now.sunY, now.sunX) - Math.PI / 2;
      rayMat.opacity = now.rays * 0.09; rayMat.color.copy(now.sun);
      for (const q of rays) {
        q.m.visible = now.rays > 0.02;
        q.m.position.set(q.x * halfH * aspect, 0.1 * halfH, -40);
        q.m.rotation.z = turn;
        q.m.scale.set(q.w * halfH * (0.9 + 0.15 * Math.sin(sec * 0.35 + q.ph)), halfH * 3.2, 1);
      }
    },
    dispose() {
      for (const q of kept) q.dispose();
      for (const q of rays) camera.remove(q.m);
    },
  };
}
