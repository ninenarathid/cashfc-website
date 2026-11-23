/**
 * The city's water, drawn live (the owner, 2026-11-23: "อยากทำกราฟฟิกใหม่ ให้มันดูเหมือนน้ำจริงๆเลย ไม่ใช่ jpg"): the sea, the
 * bay and the canal are no longer the map's still picture of water. The page draws this first, under everything; the
 * ground (lib/town/scenery leaves the map's water out of it) and the map's pictures of raised and sunk ground (their water
 * cut out by pixel/build-city.mjs) are laid over it, so it shows exactly where the map has its water, along the very shore
 * the editor drew, an eighth of a tile at a time.
 *
 * It is drawn on the graphics card (WebGL), a pixel of it a pixel of the world, on the ground's own grid of texels (32 to
 * a tile's edge), in the map's own water colours, so it is pixel art like the ground round it:
 * - its colour by its depth: light along the beach, deeper blue out at sea, the canal darker under its walls;
 * - light dancing on it (moving caustics, two layers drifting their own ways);
 * - waves rolling in to the shore, a crest catching the light as each comes;
 * - foam washing up the beach and back, broken at its edge, and a thinner line further out; the canal lapping its walls;
 * - now and then the sun glinting off a ripple.
 * All by the wall clock, so everybody sees the same water, at twelve frames a second like the map's other moving things.
 * Where WebGL is not to be had, the map's own water texture, still.
 */
import { T2_COLS, T2_ORIGIN, T2_ROWS, T2_SUB, T2_TEXTURES, T2_WATER_LOOK, t2Lift, t2Tile, t2WaterAt } from "./city";

const OX = T2_ORIGIN.x, OY = T2_ORIGIN.y, S = T2_SUB, W = T2_COLS * S, H = T2_ROWS * S;
/** How far below the level ground the sunk water is, in isometric pixels (four steps of nine). */
const SUNK = 36;
/** Frames a second. */
const FPS = 12;

/**
 * The water as the graphics card reads it, one RGBA texel an eighth of a tile (the ground's own cells):
 * R water on the level ground, and the cells round it (drawn under the ground's edge, so no gap shows);
 * G water sunk four steps (the canal), and the cells round it (under its walls' feet);
 * B how far from the shore, in cells (0 on land);
 * A which water exactly: 255 level, 128 sunk, 96 sunk under a bridge, 0 none.
 */
function mapData(): Uint8Array {
  const sunkTile = new Uint8Array(T2_COLS * T2_ROWS), near = new Uint8Array(T2_COLS * T2_ROWS);
  for (let y = 0; y < T2_ROWS; y++) for (let x = 0; x < T2_COLS; x++) {
    const c = t2Tile(x + OX, y + OY), lift = t2Lift(x + OX + 0.5, y + OY + 0.5);
    if (lift < -SUNK / 2) sunkTile[y * T2_COLS + x] = c === "~" ? 2 : 1;
    // (the ground's water is looked at cell by cell only on and round a tile walked as water, or painted as it at its middle)
    if (c === "~" || c === "=" || t2WaterAt(x + OX + 0.5, y + OY + 0.5))
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < T2_COLS && ny < T2_ROWS) near[ny * T2_COLS + nx] = 1;
      }
  }
  // (a bridge: ground over the sunk water, five tiles across at most, the water on both sides of it in a line; the canal
  // runs on under it in its shade, and is no shore there: the owner, 2026-11-23, "ใต้สะพานดูแปลกๆ ช่วยปรับให้ดีขึ้นหน่อย")
  const sunkWet = (x: number, y: number) => x >= 0 && y >= 0 && x < T2_COLS && y < T2_ROWS && sunkTile[y * T2_COLS + x] === 2;
  const under = new Uint8Array(T2_COLS * T2_ROWS);
  for (let y = 0; y < T2_ROWS; y++) for (let x = 0; x < T2_COLS; x++) {
    if (sunkTile[y * T2_COLS + x] || t2Tile(x + OX, y + OY) === "~") continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let a = 1, b = 1;
      while (a <= 5 && !sunkWet(x - dx * a, y - dy * a) && t2Tile(x - dx * a + OX, y - dy * a + OY) !== "~" && !sunkTile[(y - dy * a) * T2_COLS + x - dx * a]) a++;
      while (b <= 5 && !sunkWet(x + dx * b, y + dy * b) && t2Tile(x + dx * b + OX, y + dy * b + OY) !== "~" && !sunkTile[(y + dy * b) * T2_COLS + x + dx * b]) b++;
      if (a + b - 1 <= 5 && sunkWet(x - dx * a, y - dy * a) && sunkWet(x + dx * b, y + dy * b)) { under[y * T2_COLS + x] = 1; break; }
    }
  }
  const exact = new Uint8Array(W * H);
  for (let ty = 0; ty < T2_ROWS; ty++) for (let tx = 0; tx < T2_COLS; tx++) {
    const t = ty * T2_COLS + tx;
    if (!near[t] && !under[t]) continue;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const cx = tx * S + i, cy = ty * S + j;
      if (sunkTile[t] === 2 || under[t]) exact[cy * W + cx] = under[t] ? 3 : 2;
      else if (!sunkTile[t] && t2WaterAt(OX + (cx + 0.5) / S, OY + (cy + 0.5) / S)) exact[cy * W + cx] = 1;
    }
  }
  // how far from the shore: two passes (a step 1, a corner 1.41); the map's edge is open water, and so is the step down from
  // the level sea to the harbour sunk beside it: one water
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = exact[i] ? 1e6 : 0;
  const step = (i: number, j: number, by: number, d: number) => Math.min(d, exact[j] ? dist[j] + by : by);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!exact[i]) continue;
    let d = dist[i];
    if (x > 0) d = step(i, i - 1, 1, d);
    if (y > 0) {
      d = step(i, i - W, 1, d);
      if (x > 0) d = step(i, i - W - 1, 1.41, d);
      if (x < W - 1) d = step(i, i - W + 1, 1.41, d);
    }
    dist[i] = d;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (!exact[i]) continue;
    let d = dist[i];
    if (x < W - 1) d = step(i, i + 1, 1, d);
    if (y < H - 1) {
      d = step(i, i + W, 1, d);
      if (x < W - 1) d = step(i, i + W + 1, 1.41, d);
      if (x > 0) d = step(i, i + W - 1, 1.41, d);
    }
    dist[i] = Math.min(d, 255);
  }
  // the cells round each water, where the ground's edge or a wall's foot may leave a pixel uncovered
  const grow = (want: number, by: number) => {
    const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      let at = -1e9;
      for (let x = 0; x < W; x++) { if (exact[y * W + x] === want) at = x; if (x - at <= by) a[y * W + x] = 1; }
      at = 1e9;
      for (let x = W - 1; x >= 0; x--) { if (exact[y * W + x] === want) at = x; if (at - x <= by) a[y * W + x] = 1; }
    }
    for (let x = 0; x < W; x++) {
      let at = -1e9;
      for (let y = 0; y < H; y++) { if (a[y * W + x]) at = y; if (y - at <= by) b[y * W + x] = 1; }
      at = 1e9;
      for (let y = H - 1; y >= 0; y--) { if (a[y * W + x]) at = y; if (at - y <= by) b[y * W + x] = 1; }
    }
    return b;
  };
  const level = grow(1, S / 2), sunk = grow(2, S), bridged = grow(3, S);
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    out[i * 4] = level[i] ? 255 : 0;
    out[i * 4 + 1] = sunk[i] || bridged[i] ? 255 : 0;
    out[i * 4 + 2] = exact[i] ? Math.min(255, Math.round(dist[i])) : 0;
    out[i * 4 + 3] = exact[i] === 1 ? 255 : exact[i] === 2 ? 128 : exact[i] === 3 ? 96 : 0;
  }
  return out;
}

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uMapSize, uOrigin, uCorner, uSize;
uniform float uTime, uSunk, uSub, uStill;
// the map's water, darkest to lightest (its own six), a deeper blue for the open sea, and foam
const vec3 DEEP2 = vec3(18.0, 112.0, 186.0) / 255.0;
const vec3 DEEP = vec3(24.0, 136.0, 208.0) / 255.0;
const vec3 W0 = vec3(28.0, 159.0, 227.0) / 255.0;
const vec3 W1 = vec3(36.0, 168.0, 236.0) / 255.0;
const vec3 W2 = vec3(42.0, 176.0, 244.0) / 255.0;
const vec3 W3 = vec3(48.0, 187.0, 255.0) / 255.0;
const vec3 HI = vec3(100.0, 221.0, 255.0) / 255.0;
const vec3 HI2 = vec3(148.0, 244.0, 255.0) / 255.0;
const vec3 FOAM = vec3(236.0, 250.0, 255.0) / 255.0;
// (beyond the map's edge its edge runs on: the sea out to the open sea, the canal on as a river; lib/town/city's surroundings)
vec4 cell(vec2 t) {
  vec2 c = clamp(floor((t - uOrigin) * uSub), vec2(0.0), uMapSize - 1.0);
  return texture2D(uMap, (c + 0.5) / uMapSize);
}
float cellDist(vec2 c) { return texture2D(uMap, (clamp(c, vec2(0.0), uMapSize - 1.0) + 0.5) / uMapSize).b * 255.0; }
// how far from the shore, in tiles, smooth between cells' middles (a cell of land is half a cell inland)
float dist(vec2 t) {
  vec2 q = (t - uOrigin) * uSub - 0.5, i = floor(q), f = q - i;
  float a = cellDist(i), b = cellDist(i + vec2(1.0, 0.0)), c = cellDist(i + vec2(0.0, 1.0)), d = cellDist(i + 1.0);
  return (mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 0.5) / uSub;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = p - i; f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
// light on the water: the edges between cells drifting about (F2 - F1 of their points)
float caustic(vec2 p, float t) {
  vec2 i = floor(p), f = p - i;
  float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), o = hash2(i + g);
    o = 0.5 + 0.42 * sin(t * 0.9 + 6.2831 * o);
    float d = length(g + o - f);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return f2 - f1;
}
float bayer(vec2 p) {
  vec2 q = mod(p, 4.0);
  float b;
  if (q.y < 1.0) b = q.x < 1.0 ? 0.0 : q.x < 2.0 ? 8.0 : q.x < 3.0 ? 2.0 : 10.0;
  else if (q.y < 2.0) b = q.x < 1.0 ? 12.0 : q.x < 2.0 ? 4.0 : q.x < 3.0 ? 14.0 : 6.0;
  else if (q.y < 3.0) b = q.x < 1.0 ? 3.0 : q.x < 2.0 ? 11.0 : q.x < 3.0 ? 1.0 : 9.0;
  else b = q.x < 1.0 ? 15.0 : q.x < 2.0 ? 7.0 : q.x < 3.0 ? 13.0 : 5.0;
  return (b + 0.5) / 16.0;
}
vec2 tileAt(vec2 w) { return vec2((w.x / 32.0 + w.y / 16.0) * 0.5, (w.y / 16.0 - w.x / 32.0) * 0.5); }
void main() {
  // this pixel's world point (isometric pixels), the screen's top-left at uCorner; on the level ground, or four steps down
  vec2 w = uCorner + vec2(floor(gl_FragCoord.x), uSize.y - 1.0 - floor(gl_FragCoord.y)) + 0.5;
  vec2 t0 = tileAt(w), t1 = tileAt(w - vec2(0.0, uSunk));
  vec4 c0 = cell(t0), c1 = cell(t1);
  vec2 t; float low, shade = 0.0;
  if (c0.a > 0.75) { t = t0; low = 0.0; }
  else if (c1.g > 0.5) { t = t1; low = 1.0; shade = c1.a > 0.3 && c1.a < 0.45 ? 1.0 : 0.0; }
  else if (c0.r > 0.5) { t = t0; low = 0.0; }
  else { gl_FragColor = vec4(0.0); return; }
  // how far from the shore, read on the ground's own texels (32 to a tile's edge); the light on it is laid on the screen,
  // two pixels by one as the ground's texels are, so that it runs on unbroken where the sea steps down to the harbour
  vec2 tx = floor(t * 32.0), tc = (tx + 0.5) / 32.0, sp = floor(vec2(w.x * 0.5, w.y)), sc = sp / 32.0;
  float time = uTime, d = dist(tc);
  float n = noise(sc * 0.9 + vec2(time * 0.05, -time * 0.03));
  // its colour by its depth, dithered between the tones (sunk between walls, a little darker near them)
  float far = (d - 0.4) / 5.5;
  float depth = clamp(far, 0.0, 1.0) + low * 0.35 * (1.0 - clamp(d / 3.0, 0.0, 1.0));
  depth += (n - 0.5) * 0.18;
  float lv = depth * 4.0 + bayer(sp) - 0.5;
  vec3 col = lv < 0.5 ? W3 : lv < 1.5 ? W2 : lv < 2.5 ? W1 : lv < 3.5 ? W0 : DEEP;
  // (the deepest blue comes in little by little further out, not all at once along a line the shore's shape)
  if (bayer(sp + 2.0) < 0.6 * clamp((far - 0.85 + (n - 0.5) * 0.3) / 1.3, 0.0, 1.0)) col = DEEP2;
  // light dancing on it: two layers of caustics drifting their own ways
  vec2 cp = sp / 13.0;
  float ca = caustic(cp + vec2(time * 0.11, time * 0.05), time), cb = caustic(cp * 1.37 + vec2(-time * 0.07, time * 0.09) + 4.3, time * 1.3);
  float c = min(ca, cb + 0.03);
  float shallow = 1.0 - clamp(d / 6.0, 0.0, 1.0);
  if (c < 0.035 + 0.04 * shallow) col = mix(col, HI, 0.55);
  if (c < 0.028) col = HI;
  float lengths = noise(sc * 0.45 + vec2(-time * 0.04, time * 0.06));
  if (low > 0.5) {
    // between walls: shade along their feet, and the water lapping at them
    if (d < 0.55 && bayer(sp + 1.0) < 0.6) col = mix(col, DEEP, 0.55);
    float lap = 0.07 + 0.05 * (0.5 + 0.5 * sin(time * 1.6 + n * 6.0 + (sc.x + sc.y) * 0.8));
    if (d < lap && shade < 0.5) col = HI2;
  } else {
    // waves rolling in: a crest of light along the shore, broken into lengths, coming in and fading as it nears
    float wave = sin(d * 2.6 - time * 1.5 + n * 0.7);
    if (d > 0.7 && d < 4.5 && wave > 0.975 - 0.02 * shallow && lengths > 0.42 && bayer(sp + 1.0) < 0.8) col = mix(col, HI2, 0.6 * clamp((4.5 - d) / 2.0, 0.0, 1.0) + 0.2);
    // foam: washing up and back along the shore, broken at its edge, and a thinner line further out
    float wash = 0.12 + 0.14 * (0.5 + 0.5 * sin(time * 1.25 + n * 5.0 + (sc.x + sc.y) * 0.35));
    if (d < wash) col = FOAM;
    else if (d < wash + 0.1 && bayer(sp) < 0.5) col = mix(col, FOAM, 0.8);
    float line2 = 0.48 + 0.16 * sin(time * 1.25 - 1.3 + n * 2.0);
    if (abs(d - line2) < 0.035 && lengths > 0.35 && bayer(sp + 3.0) < 0.55) col = mix(col, FOAM, 0.6);
  }
  // a glint now and then where the light is
  if (uStill < 0.5 && c < 0.05 && hash(sp + floor(time * 3.0)) > 0.985) col = vec3(1.0);
  // under a bridge: in its shade, the light on the water faint
  if (shade > 0.5) col = mix(col, DEEP2 * 0.42, 0.72);
  gl_FragColor = vec4(col, 1.0);
}`;

interface Gl { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> }
let canvas: HTMLCanvasElement | null = null, made: Gl | null | undefined;
let last = "", lostAt = -Infinity;
function make(): Gl | null {
  if (made !== undefined) return made;
  try {
    canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true, alpha: true });
    if (!gl) return (made = null);
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, mapData());
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    const u: Gl["u"] = {};
    for (const n of ["uMap", "uMapSize", "uOrigin", "uCorner", "uSize", "uTime", "uSunk", "uSub", "uStill"]) u[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(u.uMap, 0); gl.uniform2f(u.uMapSize, W, H); gl.uniform2f(u.uOrigin, OX, OY);
    gl.uniform1f(u.uSunk, SUNK); gl.uniform1f(u.uSub, S);
    return (made = { gl, u });
  } catch (e) {
    console.warn("[Cash Town] the city's water stays still", e);
    return (made = null);
  }
}

/** The map's water texture (fetched once), for where WebGL is not to be had. */
let still: HTMLImageElement | null = null, stillReady = false;
const stillPattern = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/**
 * Draw the city's water over the whole screen, under everything (the ground and the map's pictures are drawn over it,
 * with holes where their water is). `corner` is the screen's top-left in isometric pixels, `s` the screen pixels to one of
 * them, `cw` × `ch` the screen; `sec` the wall clock in seconds (0 to stand still).
 */
export function drawCityWater(ctx: CanvasRenderingContext2D, corner: { x: number; y: number }, s: number, cw: number, ch: number, sec: number) {
  let g = make();
  // (the browser takes a page's oldest graphics context back when it has too many, and the water went black: the owner,
  // 2026-11-23, "ทำไมตรงนี้มีลอยต่อแมพ". Made anew, no more than once in five seconds)
  if (g && g.gl.isContextLost() && performance.now() - lostAt > 5000) {
    lostAt = performance.now();
    console.warn("[Cash Town] the city's water lost its graphics context: made anew");
    made = undefined; canvas = null; last = "";
    g = make();
  }
  // (a world pixel a pixel of the water, its corner on a whole world pixel, drawn at the camera's scale)
  const x0 = Math.floor(corner.x), y0 = Math.floor(corner.y), w = Math.ceil(cw / s) + 2, h = Math.ceil(ch / s) + 2;
  if (g && canvas && !g.gl.isContextLost()) {
    const { gl, u } = g;
    const frame = sec ? Math.floor(sec * FPS) : 0, key = `${x0},${y0},${w},${h},${frame}`;
    if (key !== last) {
      last = key;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uCorner, x0, y0); gl.uniform2f(u.uSize, w, h);
      gl.uniform1f(u.uTime, (frame / FPS) % 3600); gl.uniform1f(u.uStill, sec ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, w, h, (x0 - corner.x) * s, (y0 - corner.y) * s, w * s, h * s);
    ctx.restore();
    return;
  }
  // (no WebGL: the map's water, still, laid along the tiles as the ground is)
  if (!still && typeof Image !== "undefined") {
    const src = T2_TEXTURES.find((t) => t.look === T2_WATER_LOOK)?.src;
    if (src) { still = new Image(); still.onload = () => { stillReady = true; }; still.src = src; }
  }
  if (!still || !stillReady) return;
  let pat = stillPattern.get(ctx) ?? null;
  if (!pat) { pat = ctx.createPattern(still, "repeat"); if (pat) stillPattern.set(ctx, pat); }
  if (!pat) return;
  // (a texel a world pixel along the tiles' two ways: the ground's own 32 a tile edge)
  pat.setTransform(new DOMMatrix([s, s / 2, -s, s / 2, -corner.x * s, -corner.y * s]));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}
