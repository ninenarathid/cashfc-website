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
export function makePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, small: boolean, /** How bright a thing is before it glows (1: only what is lit past white, as the 3D town's lamps are). */ threshold = 1.0): Post {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // (on a phone the glow is worked out on a quarter of the pixels: it is soft, and nothing is lost by it)
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, small ? 0.35 : 0.5, threshold);
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
export interface AirNow { motes: number; flies: number; mist: number; rays: number; petals: number; smoke: number; sunX: number; sunY: number; sun: THREE.Color; /** How hard it rains. */ rain: number; /** A room one stands in: no rain is seen over its floor, while it goes on falling outside. */ dry: readonly number[] | null; /** How dark the far hills are (the night's share). */ dim: number }
export interface Air { /** A puff of dust at somebody's feet. */ puff(x: number, y: number, z: number): void; update(dt: number, sec: number, at: THREE.Vector3, halfH: number, aspect: number, now: AirNow): void; dispose(): void }

export function makeAir(scene: THREE.Scene, camera: THREE.Camera, o: { small: boolean; /** A tree's picture, for the dark boughs that hang near the eye at the foot of the view. */ fore: THREE.Texture | null; /** The ground's height at a point. */ heightAt: (x: number, z: number) => number; wetAt: (x: number, z: number) => boolean; chimneys: THREE.Vector3[]; ratio: number; /** No hills beyond the land (over the live town's picture there is nothing behind it). */ far?: boolean }): Air {
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
    const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, color, transparent: true, opacity: 0, blending, depthWrite: false, vertexColors: colored, fog: false });
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

  // rain: thin pale strokes falling aslant, about where one looks
  const RAIN = o.small ? 110 : 240, rainGeo = new THREE.PlaneGeometry(0.02, 1);
  const rainMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const rain = new THREE.InstancedMesh(rainGeo, rainMat, RAIN), drop = new THREE.Object3D();
  // (far, middle, near: its length, its speed and how pale it is come of how near a streak is)
  const rainAt = Array.from({ length: RAIN }, (_, i) => { const near = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.6 : 0.3; return [r() * SPAN, r() * 12, r() * SPAN, 8 + near * 9, 0.35 + near * 0.75, near]; });
  rainAt.forEach((q, i) => rain.setColorAt(i, new THREE.Color(0xbfd6f2).multiplyScalar(0.45 + q[5] * 0.55)));
  const splash = cloud(o.small ? 40 : 90, 2, 0xffffff, THREE.NormalBlending, true);
  rain.frustumCulled = false; rain.visible = false;
  drop.rotation.set(0, Math.PI / 4, 0.2);
  scene.add(rain);
  kept.push(rainGeo, rainMat);
  // dust at the feet: a few small puffs, used in turn
  const dusts = Array.from({ length: 8 }, () => {
    const m = new THREE.SpriteMaterial({ map: dot, color: 0xd9c7a4, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(m);
    scene.add(sp);
    kept.push(m);
    return { sp, m, age: 9 };
  });
  let nextDust = 0;
  // far hills behind everything, sliding slower than the ground: seen wherever the land ends
  const far = (() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    const ridges: Array<[string, number, number]> = [["#8fa9c4", 150, 26], ["#6f8cab", 180, 20], ["#52708f", 208, 15]];
    ridges.forEach(([col, base, amp], n) => {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, 256);
      for (let x = 0; x <= 512; x += 4) g.lineTo(x, base - amp * (Math.sin((x / 512) * Math.PI * 2 * (2 + n)) * 0.5 + Math.sin((x / 512) * Math.PI * 2 * (5 + n * 2) + n) * 0.3 + 0.5));
      g.lineTo(512, 256); g.fill();
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter;
    const geo = new THREE.PlaneGeometry(1, 1), mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = -5; m.frustumCulled = false; m.visible = o.far !== false;
    camera.add(m);
    kept.push(t, geo, mat);
    return { m, t, mat };
  })();

  // The rain's own pictures (the owner, 2026-11-17: "การที่ใช้ code ขีดเป้นเส้นๆ มันดูไม่สวย ... ใช้ credit ได้"): three
  // streaks, short to long, drawn slanting one way, and a drop landing in three moments (public/town/hd/rain-1..6.png,
  // drawn through gen.mjs; the pixel README has the call). Each stands upright, turned to the eye, at the town's pixels.
  const PX = 45.25, SIZES: Array<[number, number]> = [[5, 10], [9, 17], [12, 24], [19, 13], [20, 9], [21, 10]];
  const rainSet = SIZES.map(([w, h], i) => {
    const t = new THREE.TextureLoader().load(`/town/hd/rain-${i + 1}.png`);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    const geo = new THREE.PlaneGeometry((w / PX) * 0.7, (h / 39.2) * 0.7);
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const n = i < 3 ? (o.small ? 45 : 90) : (o.small ? 20 : 44);
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false; mesh.visible = false;
    scene.add(mesh);
    kept.push(t, geo, mat);
    return { mesh, mat, n, at: Array.from({ length: n }, () => [r() * SPAN, r() * 11, r() * SPAN, r()]) };
  });
  const stand = new THREE.Object3D();
  stand.rotation.set(0, Math.PI / 4, 0);

  // near the eye: a few dark boughs along the foot of the view, sliding faster than the ground as one walks
  const foreMat = o.fore ? new THREE.MeshBasicMaterial({ map: o.fore, color: 0x101820, transparent: true, alphaTest: 0.5, depthTest: false, depthWrite: false, fog: false }) : null;
  const foreGeo = new THREE.PlaneGeometry(1, 1);
  kept.push(foreGeo);
  if (foreMat) kept.push(foreMat);
  const fores = foreMat ? [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(foreGeo, foreMat);
    m.renderOrder = 9; m.frustumCulled = false;
    if (i === 1) m.scale.x = -1;
    camera.add(m);
    return m;
  }) : [];

  return {
    puff(x, y, z) { const d = dusts[nextDust++ % dusts.length]; d.sp.position.set(x, y, z); d.age = 0; },
    update(dt, sec, at, halfH, aspect, now) {
      const cx = at.x - SPAN / 2, cz = at.z - SPAN / 2;
      rainMat.opacity = 0; rain.visible = false; // (the strokes made by code gave way to the rain's own pictures, below)
      if (rain.visible) {
        for (let i = 0; i < RAIN; i++) {
          const q = rainAt[i], fall = sec * q[3];
          drop.position.set(cx + wrap(q[0] - fall * 0.2 - cx, SPAN), wrap(q[1] - fall, 12), cz + wrap(q[2] - cz, SPAN));
          drop.scale.set(1, q[4], 1);
          drop.updateMatrix();
          rain.setMatrixAt(i, drop.matrix);
        }
        rain.instanceMatrix.needsUpdate = true;
      }
      // where drops land: a pale speck for an instant, here and there on the ground
      splash.mat.opacity = 0; splash.pts.visible = false;
      if (splash.pts.visible) {
        for (let i = 0; i < splash.n; i++) {
          const b = i * 4, ph = splash.base[b + 3], turn = Math.floor(sec * 3 + ph), k = sec * 3 + ph - turn, hop = Math.sin(turn * 12.9898 + i) * 43758.5453, at2 = hop - Math.floor(hop);
          splash.pos[i * 3] = cx + wrap(splash.base[b] + at2 * 9 - cx, SPAN);
          splash.pos[i * 3 + 1] = 0.08 + (k < 0.5 ? k * 0.3 : 0);
          splash.pos[i * 3 + 2] = cz + wrap(splash.base[b + 2] + at2 * 5 - cz, SPAN);
          const lit = k < 0.35 ? 1 : 0;
          splash.col[i * 3] = 0.8 * lit; splash.col[i * 3 + 1] = 0.9 * lit; splash.col[i * 3 + 2] = 1 * lit;
        }
        splash.geo.attributes.position.needsUpdate = true; splash.geo.attributes.color.needsUpdate = true;
      }
      rainSet.forEach((q, i) => {
        q.mesh.visible = now.rain > 0.02;
        if (!q.mesh.visible) return;
        q.mat.opacity = now.rain * (i < 3 ? 0.5 + i * 0.12 : 0.8);
        for (let j = 0; j < q.n; j++) {
          const a = q.at[j];
          if (i < 3) {
            // a streak falls along its own slant (its foot to the left, as it was drawn): far ones slower
            const fall = sec * (7 + i * 3.5 + a[3] * 2), y = wrap(a[1] - fall, 11), drift = (fall + (11 - y)) * 0.22;
            stand.position.set(cx + wrap(a[0] - drift - cx, SPAN), y, cz + wrap(a[2] + drift - cz, SPAN));
            // (over a room's floor as the eye sees it, a streak is not drawn: where it stands, less its height along the line of sight)
            const gx = stand.position.x - y * 1.225, gz = stand.position.z - y * 1.225, d = now.dry;
            stand.scale.setScalar(d && gx > d[0] - 0.6 && gx < d[2] + 0.6 && gz > d[1] - 0.6 && gz < d[3] + 0.6 ? 0 : 1);
          } else {
            // a drop lands somewhere new each time: the crown, the ring, the ring breaking, one after the other
            const turn = Math.floor(sec * 2.2 + a[3] * 7), k = sec * 2.2 + a[3] * 7 - turn, hop = Math.sin(turn * 12.9898 + j * 78.233) * 43758.5453, u = hop - Math.floor(hop);
            const x = cx + wrap(a[0] + u * 11 - cx, SPAN), z = cz + wrap(a[2] + u * 7 - cz, SPAN);
            stand.position.set(x, o.heightAt(x, z) + 0.1, z);
            const d = now.dry, roofed = !!d && x > d[0] - 0.6 && x < d[2] + 0.6 && z > d[1] - 0.6 && z < d[3] + 0.6;
            stand.scale.setScalar(Math.floor(k * 4) === i - 3 && !o.wetAt(x, z) && !roofed ? 1 : 0);
          }
          stand.updateMatrix();
          q.mesh.setMatrixAt(j, stand.matrix);
        }
        q.mesh.instanceMatrix.needsUpdate = true;
      });
      for (const d of dusts) {
        d.age += dt;
        const k = Math.min(1, d.age / 0.7);
        d.m.opacity = (1 - k) * 0.45; d.sp.scale.setScalar(0.25 + k * 0.5); d.sp.position.y += dt * 0.3;
      }
      {
        const gap = halfH * aspect * 1.5, slide = (at.x - at.z) * 0.9;
        fores.forEach((m, i) => {
          m.position.set(wrap(i * gap - slide, gap * 3) - gap * 1.5, -halfH * 1.32, -30);
          m.scale.set((i === 1 ? -1 : 1) * halfH * 1.5, halfH * 1.5, 1);
        });
      }
      far.m.position.set(0, halfH * 0.35, -590);
      far.m.scale.set(halfH * aspect * 2.2, halfH * 1.3, 1);
      far.t.offset.x = (at.x - at.z) * 0.004;
      far.mat.color.setScalar(1 - now.dim * 0.72);
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
      for (const m of fores) camera.remove(m);
      camera.remove(far.m);
    },
  };
}
