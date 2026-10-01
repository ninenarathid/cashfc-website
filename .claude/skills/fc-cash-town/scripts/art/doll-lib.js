// The paper-doll cutter, run inside a headless Chrome page. Pure canvas work:
// split sheets into views, find ears and eyes by key colour, cut bodies,
// heads and face parts, and line everything up on the body.

const H_TARGET = 460; // the female front view's height in output pixels

async function load(url) {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  return { W: c.width, H: c.height, d: x.getImageData(0, 0, c.width, c.height).data };
}

function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const CL = { clear: 0, green: 1, violet: 2, skin: 3, blue: 4, cream: 5, brown: 6, dark: 7, white: 8, pink: 9, other: 10 };
function classify(r, g, b, a) {
  if (a < 60) return CL.clear;
  const [h, s, l] = hsl(r, g, b);
  if (l < 0.2) return CL.dark;
  if (s < 0.18 && l > 0.88) return CL.white;
  if (h >= 70 && h <= 170 && s > 0.2 && l > 0.15) return CL.green;
  if (h >= 245 && h <= 300 && s > 0.18) return CL.violet;
  if (h >= 195 && h <= 240 && s > 0.18 && l > 0.3) return CL.blue;
  if (h >= 12 && h <= 36 && s > 0.25 && l >= 0.45 && l <= 0.86) return CL.skin;
  if (h <= 50 && l < 0.45 && s > 0.15) return CL.brown;
  if (l > 0.75 && s < 0.8 && h >= 20 && h <= 70) return CL.cream;
  if ((h >= 330 || h <= 12) && s > 0.3 && l > 0.45) return CL.pink;
  return CL.other;
}
function labels(v) {
  const L = new Uint8Array(v.W * v.H);
  for (let p = 0, i = 0; p < L.length; p++, i += 4) L[p] = classify(v.d[i], v.d[i + 1], v.d[i + 2], v.d[i + 3]);
  return L;
}

function crop(img, b) {
  const W = b.x1 - b.x0, H = b.y1 - b.y0, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) d.set(img.d.subarray(((b.y0 + y) * img.W + b.x0) * 4, ((b.y0 + y) * img.W + b.x1) * 4), y * W * 4);
  return { W, H, d };
}

function bboxOf(v, x0 = 0, x1 = v.W) {
  let minX = x1, maxX = x0, minY = v.H, maxY = 0;
  for (let y = 0; y < v.H; y++) for (let x = x0; x < x1; x++) if (v.d[(y * v.W + x) * 4 + 3] > 60) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

/** Three views in a row: cut at the emptiest columns near the thirds. */
function splitViews(img, n = 3) {
  const occ = new Array(img.W).fill(0);
  for (let y = 0; y < img.H; y++) for (let x = 0; x < img.W; x++) if (img.d[(y * img.W + x) * 4 + 3] > 60) occ[x]++;
  const cuts = [];
  for (let k = 1; k < n; k++) {
    const c = Math.round(img.W * k / n); let best = c, bv = Infinity;
    for (let x = Math.round(c - img.W * 0.12); x <= Math.round(c + img.W * 0.12); x++) if (occ[x] < bv) { bv = occ[x]; best = x; }
    cuts.push(best);
  }
  const edges = [0, ...cuts, img.W];
  return edges.slice(0, -1).map((x0, i) => {
    const sub = crop(img, { x0, y0: 0, x1: edges[i + 1], y1: img.H });
    const b = bboxOf(sub);
    return crop(sub, b);
  });
}

/** Where the skin reaches furthest left and right (the ear tips), above a line. */
function earTips(v, L, yMax = v.H) {
  let lx = Infinity, rx = -1; const ly = [], ry = [];
  for (let y = 0; y < Math.min(yMax, v.H); y++) for (let x = 0; x < v.W; x++) {
    if (L[y * v.W + x] !== CL.skin) continue;
    if (x < lx) { lx = x; ly.length = 0; } if (x === lx) ly.push(y);
    if (x > rx) { rx = x; ry.length = 0; } if (x === rx) ry.push(y);
  }
  const mid = (a) => a.length ? a[a.length >> 1] : 0;
  return { L: { x: lx, y: mid(ly) }, R: { x: rx, y: mid(ry) } };
}

/** The first row where at least `share` of the width is in `cls` (the tunic, not an eye). */
function topRow(v, L, cls, share) {
  for (let y = 0; y < v.H; y++) {
    let n = 0;
    for (let x = 0; x < v.W; x++) if (cls.includes(L[y * v.W + x])) n++;
    if (n >= v.W * share) return y;
  }
  return v.H;
}

function topOf(v, L, cls, x0 = 0, x1 = v.W, yFrom = 0) {
  for (let y = yFrom; y < v.H; y++) for (let x = x0; x < x1; x++) if (cls.includes(L[y * v.W + x])) return y;
  return v.H;
}

/** The eyes: the two largest compact patches of eye colour that hold real violet, left then right. */
function eyesOf(v, L, yMax) {
  const W = v.W, H = Math.min(yMax, v.H);
  const isEye = (c) => c === CL.violet || c === CL.blue;
  const seen = new Uint8Array(W * H), comps = [], stack = [];
  for (let p = 0; p < W * H; p++) {
    if (seen[p] || !isEye(L[p])) continue;
    seen[p] = 1; stack.push(p);
    let n = 0, vio = 0, sx = 0, sy = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (stack.length) {
      const q = stack.pop(), x = q % W, y = (q / W) | 0;
      n++; sx += x; sy += y; if (L[q] === CL.violet) vio++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx; if (!seen[r] && isEye(L[r])) { seen[r] = 1; stack.push(r); }
      }
    }
    comps.push({ n, vio, cx: sx / n, cy: sy / n, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  const cand = comps.filter((c) => c.n > 120 && c.vio / c.n > 0.08 && c.h < H * 0.3 && c.w < W * 0.3).sort((a, b) => b.n - a.n);
  if (!cand.length) return null;
  const first = cand[0];
  const second = cand.slice(1).find((c) => Math.abs(c.cy - first.cy) < Math.max(c.h, first.h) * 0.6);
  return (second ? [first, second] : [first]).sort((a, b) => a.cx - b.cx);
}

/** The mouth: dark or pink marks between the eyes and the collar. */
function mouthOf(v, L, eyes, yMax) {
  const [a, b] = eyes.length === 2 ? eyes : [eyes[0], eyes[0]];
  const eh = Math.max(a.h, b.h);
  const x0 = Math.round(Math.min(a.cx, b.cx) + 2), x1 = Math.round(Math.max(a.cx, b.cx) - 2);
  const y0 = Math.round(Math.max(a.cy, b.cy) + eh * 0.75), y1 = Math.round(Math.min(yMax, y0 + eh * 1.6));
  let sx = 0, sy = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = L[y * v.W + x];
    if (c === CL.dark || c === CL.pink || c === CL.other) { sx += x; sy += y; n++; }
  }
  return n > 8 ? { cx: sx / n, cy: sy / n } : { cx: (a.cx + b.cx) / 2, cy: (a.cy + b.cy) / 2 + eh * 1.25 };
}

/**
 * The neck stub under a head: cut everything but hair below the chin. The
 * chin is where, going up from the neck's narrowest point, the run of skin
 * through the neck's middle suddenly widens into the jaw.
 */
function cutNeck(v, L, back = false) {
  const W = v.W, H = v.H;
  // The neck's middle: the lowest skin, which is the stub's base (hair is
  // never skin). Not all the skin low down: from behind, a jaw and an ear
  // beside a hanging tail outweigh the neck and pull the middle onto them.
  let bottom = 0;
  for (let y = Math.round(H * 0.6); y < H; y++) for (let x = 0; x < W; x++) if (L[y * W + x] === CL.skin) bottom = Math.max(bottom, y);
  const xs = [];
  for (let y = Math.max(0, bottom - Math.max(6, Math.round(H * 0.05))); y <= bottom; y++) for (let x = 0; x < W; x++) if (L[y * W + x] === CL.skin) xs.push(x);
  xs.sort((a, b) => a - b);
  const cx = xs.length ? xs[xs.length >> 1] : Math.round(W / 2);
  const isNeck = (c) => c === CL.skin || c === CL.dark || c === CL.other;
  const extent = (y) => {
    if (!isNeck(L[y * W + cx])) return null;
    let a = cx, b = cx;
    while (a > 0 && isNeck(L[y * W + a - 1])) a--;
    while (b < W - 1 && isNeck(L[y * W + b + 1])) b++;
    return { a, b };
  };
  const run = (y) => { const e = extent(y); return e ? e.b - e.a + 1 : 0; };
  // The stub ends in a rounded base, like a mannequin's stand: narrow at its
  // very bottom, wide across, then narrowing into the neck. The climb starts
  // at the base's widest row, or that round bottom passes for a jaw.
  let start = bottom - 2, peak = 0;
  for (let y = bottom - 2; y > H * 0.25; y--) {
    const w = run(y);
    if (!w) continue;
    if (w >= peak) { peak = w; start = y; } else if (w < peak * 0.9) break;
  }
  // One pass up from there, narrowing to the neck; the first widening after
  // the narrowest point is the jaw. It stops there, so bangs hanging over the
  // face higher up never count.
  let minW = Infinity, minY = start, chin = -1;
  for (let y = start; y > H * 0.25; y--) {
    const w = run(y);
    if (!w) continue;
    if (w < minW) { minW = w; minY = y; }
    else if (w > minW * 1.8 && minY - y > 3) { chin = y; break; }
  }
  const found = chin >= 0;
  if (chin < 0) chin = minY;
  // Cut the neck: a band over the whole stub, from its own edges (the ear's
  // skin pulls cx off the neck's middle, so a band around cx misses a side).
  let x0 = W, x1 = 0;
  for (let y = chin + 1; y <= bottom; y++) { const e = extent(y); if (e) { x0 = Math.min(x0, e.a - 3); x1 = Math.max(x1, e.b + 4); } }
  if (x1 <= x0) { x0 = Math.round(cx - minW / 2 - 3); x1 = Math.round(cx + minW / 2 + 4); }
  x0 = Math.max(0, x0); x1 = Math.min(W, x1);
  // Under the chin only hair stays: green, and the outline (brown or dark)
  // within a few pixels of it. The stub's own outline goes, faint edges too.
  const nearHair = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && L[yy * W + xx] === CL.green) return true;
    }
    return false;
  };
  const out = { W, H, d: new Uint8ClampedArray(v.d) };
  const stub = { W, H, d: new Uint8ClampedArray(W * H * 4) };
  for (let y = chin + 3; y < H; y++) for (let x = x0; x < x1; x++) {
    const c = L[y * W + x];
    const keep = c === CL.green || ((c === CL.brown || c === CL.dark) && nearHair(x, y));
    if (keep) continue;
    const i = (y * W + x) * 4;
    stub.d.set(v.d.subarray(i, i + 4), i);
    out.d[i + 3] = 0;
  }
  // The stub starts a few rows under the head too, so where both soft edges
  // meet there is no seam for the background to show through.
  for (let y = Math.max(0, chin - 2); y < chin + 3; y++) for (let x = x0; x < x1; x++) {
    const c = L[y * W + x];
    if (c === CL.skin || c === CL.dark || c === CL.other) { const i = (y * W + x) * 4; stub.d.set(v.d.subarray(i, i + 4), i); }
  }
  // From behind, hair covers the skull and the skin left under it is this
  // picture's nape: shaded by the hair and shaped like the stand. The body
  // brings its own neck up behind the hair, so the nape goes too, with the
  // outline that closed it; the hair's own outline stays.
  let nape = 0;
  let greens = 0;
  for (let p = 0; p < W * H; p++) if (L[p] === CL.green) greens++;
  if (back && greens > W * H * 0.05) {
    const skinish = (c) => c === CL.skin || c === CL.brown || c === CL.other;
    let sy = -1;
    for (let y = chin + 2; y > Math.max(0, chin - 30); y--) if (skinish(L[y * W + cx])) { sy = y; break; }
    if (sy >= 0) {
      const yTop = Math.max(0, chin - Math.round(H * 0.3));
      const gone = new Uint8Array(W * H), q = [sy * W + cx];
      gone[sy * W + cx] = 1;
      while (q.length) {
        const p = q.pop(), x = p % W, y = (p / W) | 0;
        out.d[p * 4 + 3] = 0; nape++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < x0 || xx >= x1 || yy < yTop || yy > chin + 2) continue;
          const r = yy * W + xx;
          if (!gone[r] && skinish(L[r])) { gone[r] = 1; q.push(r); }
        }
      }
      // The outline that closed the nape (not the hair's).
      for (let y = yTop; y <= chin + 2; y++) for (let x = x0; x < x1; x++) {
        const p = y * W + x, c = L[p];
        if (gone[p] || !(c === CL.dark || c === CL.brown || c === CL.other) || nearHair(x, y)) continue;
        let by = false;
        for (let dy = -2; dy <= 2 && !by; dy++) for (let dx = -2; dx <= 2 && !by; dx++) { const r = (y + dy) * W + x + dx; by = r >= 0 && r < W * H && gone[r] === 1; }
        if (by) out.d[p * 4 + 3] = 0;
      }
    }
  }
  return { img: out, stub, chin, found, minY, nape, neck: { x0, x1, cx, bottom, W, H } };
}

/** A bald body's neck from behind: its narrowest row, and where the head begins above it. */
function neckOf(v, L, fromY) {
  const W = v.W;
  const xs = [];
  for (let y = Math.max(0, fromY - 30); y < fromY; y++) for (let x = 0; x < W; x++) if (L[y * W + x] === CL.skin) xs.push(x);
  xs.sort((a, b) => a - b);
  const cx = xs.length ? xs[xs.length >> 1] : Math.round(W / 2);
  // The skin's span through cx, stepping over specks of shading but not an
  // outline: a collar's shading, a shoulder's outline or an ear lobe beside
  // the neck must not count as neck.
  const span = (y) => {
    if (L[y * W + cx] !== CL.skin) return null;
    let a = cx, b = cx;
    for (let x = cx, gap = 0; x >= 0; x--) { if (L[y * W + x] === CL.skin) { a = x; gap = 0; } else if (++gap > 2) break; }
    for (let x = cx, gap = 0; x < W; x++) { if (L[y * W + x] === CL.skin) { b = x; gap = 0; } else if (++gap > 2) break; }
    return { a, b, w: b - a + 1 };
  };
  // Up from where the skin begins above the collar: the neck narrows, and the
  // first clear widening is the head. Some necks are a few rows of skin under
  // a round head, so the widening asked for is small.
  let y0 = fromY;
  while (y0 > 0 && L[y0 * W + cx] !== CL.skin) y0--;
  let min = null, minY = y0, chin = -1;
  for (let y = y0; y > 0; y--) {
    const r = span(y);
    if (!r || r.w < 16) continue;
    if (!min || r.w < min.w) { min = r; minY = y; }
    else if (r.w > min.w * 1.3 && minY - y > 3) { chin = y; break; }
  }
  return min && chin > 0 ? { chin, minY, a: min.a, b: min.b } : null;
}

/** A body: the full character below its chin, with its own hair taken out. */
function cutBody(v, L, eyes, view, tunicTop, bald = false) {
  const out = { W: v.W, H: v.H, d: new Uint8ClampedArray(v.d) };
  const W = v.W, H = v.H;
  // The collar's top in the middle band: everything above it was the head.
  let bandX0, bandX1;
  if (eyes && eyes.length) {
    const mid = eyes.length === 2 ? (eyes[0].cx + eyes[1].cx) / 2 : eyes[0].cx;
    const span = eyes.length === 2 ? Math.abs(eyes[1].cx - eyes[0].cx) : W * 0.15;
    bandX0 = Math.round(mid - span * 0.45); bandX1 = Math.round(mid + span * 0.45);
  } else { bandX0 = Math.round(W * 0.42); bandX1 = Math.round(W * 0.58); }
  const yFrom = eyes && eyes.length ? Math.round(Math.max(...eyes.map((e) => e.cy + e.h * 0.9))) : Math.round(H * 0.25);
  const collar = topOf(v, L, [CL.cream, CL.blue], bandX0, bandX1, yFrom);
  let cut = collar - 2;
  if (view === 2) {
    // From behind the hair hides the collar: cut under the last of the head's
    // skin (the ear, the nape), above the shoulders.
    const blueTop = tunicTop;
    let maxSkin = -1;
    for (let y = 0; y < Math.min(H, blueTop + H * 0.05); y++) for (let x = Math.round(W * 0.2); x < Math.round(W * 0.95); x++) if (L[y * W + x] === CL.skin) maxSkin = y;
    cut = maxSkin > 0 ? maxSkin + 2 : blueTop - 2;
  }
  // A bald body from behind shows its whole neck (and skin inside a scoop
  // neckline, which fools the rule above): keep everything from the neck's
  // narrowest row down, and above it a clean neck: that row, outline and
  // all, repeated straight up to the ear. The head goes over it, so wherever
  // the hair ends, the neck under it is this one; none of the bald head's
  // chin shadow or ear is left to peek out.
  let cyl = null;
  if (view === 2 && bald) {
    const nk = neckOf(v, L, tunicTop);
    if (nk) {
      cut = nk.minY - 2;
      const ears = earTips(v, L, tunicTop);
      cyl = { y0: Math.max(0, Math.min(ears.R.y, nk.chin - 40)), x0: Math.max(0, nk.a - 6), x1: Math.min(W - 1, nk.b + 6), row: nk.minY };
    }
  }
  // Hair anywhere goes, with the outline that traced it. A hairless sheet has
  // none to take out, and its near-white highlights can read as green (HSL
  // saturation runs wild near white), so it skips this and keeps its stitches.
  const near = new Uint8Array(W * H);
  const R = 9; // an outline and its soft edge

  for (let y = 0; y < H && !bald; y++) for (let x = 0; x < W; x++) {
    if (L[y * W + x] !== CL.green) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) near[yy * W + xx] = 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, c = L[p];
    const drop = y < cut || (!bald && (c === CL.green || (near[p] && (c === CL.dark || c === CL.brown || c === CL.other))));
    if (drop) out.d[p * 4 + 3] = 0;
  }
  if (cyl) for (let y = cyl.y0; y < cut; y++) for (let x = cyl.x0; x <= cyl.x1; x++) {
    const i = (cyl.row * W + x) * 4;
    out.d.set(v.d.subarray(i, i + 4), (y * W + x) * 4);
  }
  // Specks of the old head's outline left floating above the tunic: drop dark
  // pixels with no body colour nearby.
  const bodyNear = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx; if (out.d[q * 4 + 3] <= 60) continue;
      const c = L[q]; if (c === CL.blue || c === CL.cream || c === CL.skin || c === CL.brown) return true;
    }
    return false;
  };
  for (let y = cut; y < Math.min(H, tunicTop + 12); y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (out.d[p * 4 + 3] <= 60) continue;
    if ((L[p] === CL.dark || L[p] === CL.other) && !bodyNear(x, y)) out.d[p * 4 + 3] = 0;
  }
  // Holes the hair left inside the upper body (a back view): fill from around.
  const top = cut, bottom = Math.min(H, cut + Math.round((H - cut) * 0.45));
  const hole = new Uint8Array(W * H);
  for (let y = top; y < bottom; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++) if (out.d[(y * W + x) * 4 + 3] > 60) { if (a < 0) a = x; b = x; }
    if (a < 0) continue;
    for (let x = a; x <= b; x++) if (out.d[(y * W + x) * 4 + 3] <= 60 && L[y * W + x] !== CL.clear) hole[y * W + x] = 1;
  }
  for (let it = 0; it < 80; it++) {
    let left = 0;
    for (let y = top; y < bottom; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x; if (!hole[p]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && !hole[q] && out.d[q * 4 + 3] > 60) { r += out.d[q * 4]; g += out.d[q * 4 + 1]; b += out.d[q * 4 + 2]; n++; }
      if (n) { out.d[p * 4] = r / n; out.d[p * 4 + 1] = g / n; out.d[p * 4 + 2] = b / n; out.d[p * 4 + 3] = 255; hole[p] = 0; } else left++;
    }
    if (!left) break;
  }
  return { img: out, collar, cut };
}

/** Separate pieces of a sheet: 8-connected components of opaque pixels. */
function components(v) {
  const W = v.W, H = v.H, lab = new Int32Array(W * H).fill(-1), comps = [];
  const stack = [];
  for (let p = 0; p < W * H; p++) {
    if (lab[p] !== -1 || v.d[p * 4 + 3] <= 60) continue;
    const id = comps.length; let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0;
    lab[p] = id; stack.push(p);
    while (stack.length) {
      const q = stack.pop(), x = q % W, y = (q / W) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx; if (lab[r] === -1 && v.d[r * 4 + 3] > 60) { lab[r] = id; stack.push(r); }
      }
    }
    comps.push({ id, x0, x1: x1 + 1, y0, y1: y1 + 1, n });
  }
  return { lab, comps };
}

function toCanvas(img) {
  const c = document.createElement("canvas"); c.width = img.W; c.height = img.H;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(img.d), img.W, img.H), 0, 0);
  return c;
}

/** Draw img (in its own pixels) scaled by s, with its point (ax, ay) landing at (tx, ty). */
function place(ctx, img, s, ax, ay, tx, ty) {
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(toCanvas(img), tx - ax * s, ty - ay * s, img.W * s, img.H * s);
}

/**
 * Only the hair of a hair sheet's view: the green, every non-skin pixel close
 * to it (its outline, strand lines, highlights) and the bows (brown pieces of
 * some size touching it). The face, ears and neck under it are the reference
 * head's; the mannequin body brings its own.
 */
function hairOnly(v, L) {
  const W = v.W, H = v.H, N = W * H;
  // Hair is green in patches of some size: soft edge pixels of the reference
  // head's outline can carry odd colours that class as green, one here, one
  // there, and would trace its jaw faintly across the new face.
  const hair = new Uint8Array(N), seenG = new Uint8Array(N);
  for (let p0 = 0; p0 < N; p0++) {
    if (seenG[p0] || L[p0] !== CL.green) continue;
    const comp = [p0]; seenG[p0] = 1;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i], x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx;
        if (!seenG[r] && L[r] === CL.green) { seenG[r] = 1; comp.push(r); }
      }
    }
    if (comp.length >= 40) for (const p of comp) hair[p] = 1;
  }
  const near = new Uint8Array(N);
  const R = 3;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!hair[y * W + x]) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) near[yy * W + xx] = 1;
    }
  }
  const keep = new Uint8Array(N);
  for (let p = 0; p < N; p++) if (hair[p]) keep[p] = 1;
  // Bows and ties: patches of brown alone, of some size, touching the hair.
  // (Not brown and dark together: every outline is dark with brown soft
  // edges, and through them a bow would claim the reference head's jaw.)
  const seen = new Uint8Array(N);
  for (let p0 = 0; p0 < N; p0++) {
    if (seen[p0] || L[p0] !== CL.brown) continue;
    const comp = [p0]; seen[p0] = 1;
    let touches = false;
    for (let i = 0; i < comp.length; i++) {
      const p = comp[i], x = p % W, y = (p / W) | 0;
      if (near[p]) touches = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx;
        if (!seen[r] && L[r] === CL.brown) { seen[r] = 1; comp.push(r); }
      }
    }
    if (touches && comp.length >= 80) for (const p of comp) keep[p] = 2;
  }
  // Then each bow takes its loops, creases and outline: a walk on from it
  // that crosses at most 5 dark pixels in a row before reaching solid brown
  // again. A bow's inner lines are thinner than that; an outline is longer,
  // and its brown soft edges are specks, not solid brown.
  {
    const big = new Uint8Array(N), seenB = new Uint8Array(N);
    for (let p0 = 0; p0 < N; p0++) {
      if (seenB[p0] || L[p0] !== CL.brown) continue;
      const comp = [p0]; seenB[p0] = 1;
      for (let i = 0; i < comp.length; i++) {
        const p = comp[i], x = p % W, y = (p / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const r = yy * W + xx;
          if (!seenB[r] && L[r] === CL.brown) { seenB[r] = 1; comp.push(r); }
        }
      }
      if (comp.length >= 20) for (const p of comp) big[p] = 1;
    }
    const run = new Int8Array(N).fill(-1), q = [];
    for (let p = 0; p < N; p++) if (keep[p] === 2) { run[p] = 0; q.push(p); }
    for (let i = 0; i < q.length; i++) {
      const p = q[i], x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx, c = L[r];
        if (keep[r] === 1 || !(c === CL.brown || c === CL.dark || c === CL.other)) continue;
        const nr = big[r] ? 0 : run[p] + 1;
        if (nr > 5 || (run[r] >= 0 && run[r] <= nr)) continue;
        run[r] = nr; keep[r] = 2; q.push(r);
      }
    }
  }
  // Near the hair or a bow, for the lines that belong to them.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (keep[y * W + x] !== 2) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) near[yy * W + xx] = 1;
    }
  }
  // Lines and highlights near the hair stay only if hair lies across them:
  // walking out both ways across the line, one side must reach hair (or a
  // bow). An ear's or a neck's contour has skin on one side and nothing on
  // the other, so it goes even where a strand passes close by.
  const hairish = (q) => keep[q] === 1 || keep[q] === 2;
  const lineish = (c) => c !== CL.skin && c !== CL.clear && c !== CL.green;
  const across = (x, y) => {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let a = false, b = false;
      for (const sgn of [1, -1]) {
        for (let k = 1; k <= 6; k++) {
          const xx = x + dx * k * sgn, yy = y + dy * k * sgn;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) break;
          const q = yy * W + xx;
          if (hairish(q)) { if (sgn === 1) a = true; else b = true; break; }
          if (!lineish(L[q])) break;
        }
      }
      if (a || b) return true;
    }
    return false;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (keep[p] || !near[p] || !lineish(L[p])) continue;
    if (across(x, y)) keep[p] = 3;
  }
  const out = { W, H, d: new Uint8ClampedArray(v.d) };
  for (let p = 0; p < N; p++) if (!keep[p]) out.d[p * 4 + 3] = 0;
  return out;
}

/** The chin under a point of a blank face: the first outline below it. */
function chinBelow(v, L, x, yFrom) {
  const W = v.W, xi = Math.round(x);
  for (let y = Math.round(yFrom); y < v.H; y++) {
    const c = L[y * W + xi];
    if (c === CL.dark || c === CL.brown) return y;
  }
  return null;
}

/**
 * A head's neck can end a few pixels above the body's collar (the two come
 * from different pictures). Where a column shows such a gap, fill it from the
 * head's own neck stub, outline and all, down to the body; columns with open
 * background below (beside the collar) stay as they are.
 */
function bridgeNeck(hc, bc, stub, scale, a, at, yCut) {
  const W = hc.width, H = hc.height;
  const sc = document.createElement("canvas"); sc.width = W; sc.height = H;
  place(sc.getContext("2d"), stub, scale, a.x, a.y, at.x, at.y);
  const hd = hc.getContext("2d").getImageData(0, 0, W, H).data;
  const bd = bc.getContext("2d").getImageData(0, 0, W, H).data;
  const sd = sc.getContext("2d").getImageData(0, 0, W, H).data;
  // A whole neck can be missing now (heads are cut at the jaw); the fill is
  // the head's own neck and stops at the collar, so a long reach is safe.
  const G = Math.round(H * 0.07), y0 = Math.round(yCut);
  const solid = (d, x, y) => d[(y * W + x) * 4 + 3] > 128;
  const mask = document.createElement("canvas"); mask.width = W; mask.height = H;
  const mx = mask.getContext("2d");
  let cols = 0, rows = 0;
  for (let x = 0; x < W; x++) {
    let reach = false;
    for (let y = Math.max(0, y0 - 4); y < Math.min(H, y0 + G + 8) && !reach; y++) reach = sd[(y * W + x) * 4 + 3] > 60;
    if (!reach) continue;
    let hb = -1;
    for (let y = Math.min(H - 1, y0 + 2); y >= Math.max(0, y0 - G); y--) if (solid(hd, x, y)) { hb = y; break; }
    if (hb < 0) continue;
    let y = hb + 1;
    while (y < H && y - hb <= G && !solid(hd, x, y) && !solid(bd, x, y)) y++;
    if (y === hb + 1 || y >= H || y - hb > G || solid(hd, x, y)) continue;
    mx.fillRect(x, hb - 1, 1, y - hb + 1); // the gap, tucked under the head's soft edge
    cols++; rows = Math.max(rows, y - hb - 1);
  }
  if (!cols) return null;
  const sx = sc.getContext("2d");
  sx.globalCompositeOperation = "destination-in"; sx.drawImage(mask, 0, 0);
  const hx = hc.getContext("2d");
  hx.globalCompositeOperation = "destination-over"; hx.drawImage(sc, 0, 0); hx.globalCompositeOperation = "source-over";
  return { cols, rows };
}

async function build(urls) {
  const src = {};
  for (const [k, u] of Object.entries(urls)) src[k] = await load(u);
  const manifest = { views: ["front", "threeQuarter", "back"], bodies: {}, heads: {}, faces: {}, parts: {}, regions: {} };
  const images = {};
  const emit = (name, canvas) => { images[name] = canvas.toDataURL("image/png"); };

  // ── the full characters: where the eyes are, and their ears to map them by ──
  const charViews = {};
  for (const g of ["f", "m"]) {
    let frontDist = 0;
    charViews[g] = splitViews(src[g]).map((v, vi) => {
      const L = labels(v);
      const blueTop = topRow(v, L, [CL.blue], 0.15);
      let eyes = vi < 2 ? eyesOf(v, L, blueTop) : null;
      if (vi === 0 && eyes?.length === 2) frontDist = eyes[1].cx - eyes[0].cx;
      if (vi === 1 && eyes?.length === 1 && frontDist) eyes = [eyes[0], { ...eyes[0], cx: eyes[0].cx + frontDist * 0.62, w: eyes[0].w * 0.7 }];
      return { v, eyes, ears: earTips(v, L, blueTop) };
    });
  }

  // ── the bodies: from the hairless sheets when there are some ──
  const bodyViews = {};
  for (const g of ["f", "m"]) {
    const views = splitViews(src[g + "b"] ?? src[g]);
    let frontDist = 0;
    bodyViews[g] = views.map((v, vi) => {
      const L = labels(v);
      const blueTop = topRow(v, L, [CL.blue], 0.15);
      let eyes = vi < 2 ? eyesOf(v, L, blueTop) : null;
      if (vi === 0 && eyes?.length === 2) frontDist = eyes[1].cx - eyes[0].cx;
      // Three-quarter: the far eye can hide at the face's edge; put it where it would be.
      if (vi === 1 && eyes?.length === 1 && frontDist) eyes = [eyes[0], { ...eyes[0], cx: eyes[0].cx + frontDist * 0.62, w: eyes[0].w * 0.7 }];
      const ears = earTips(v, L, blueTop);
      const mouth = eyes && eyes.length ? mouthOf(v, L, eyes, blueTop) : null;
      const body = cutBody(v, L, eyes, vi, blueTop, !!src[g + "b"]);
      return { v, L, eyes, ears, mouth, body };
    });
  }
  const kOf = { f: H_TARGET / bodyViews.f[0].v.H, m: H_TARGET / bodyViews.m[0].v.H };
  // With hairless sheets the body is the whole mannequin: head, face and neck
  // from one picture, so nothing can show a seam there; heads are hair only.
  const mannequin = !!(src.fb && src.mb);
  manifest.mode = mannequin ? "mannequin" : "heads";

  // ── heads: hair sheets (and the bald one), necks cut ──
  const headViews = {};
  for (const style of ["twin", "spiky", "bald"]) {
    headViews[style] = splitViews(src[style]).map((v, vi) => {
      const L = labels(v);
      const cut = cutNeck(v, L, vi === 2);
      const L2 = labels(cut.img);
      return { v: cut.img, L: L2, ears: earTips(cut.img, L2), chin: cut.chin, stub: cut.stub, found: cut.found, minY: cut.minY, nape: cut.nape, neck: cut.neck, full: v, Lf: L };
    });
  }

  manifest.necks = Object.fromEntries(Object.entries(headViews).flatMap(([st, vs]) => vs.map((h, vi) => [`${st}-${vi}`, { chin: h.chin, minY: h.minY, found: h.found, nape: h.nape, ...h.neck }])));

  // Each doll canvas: the body view's box, padded, at output scale.
  const PAD = 0.28;
  const bodyCanvas = { f: [], m: [] };
  for (const g of ["f", "m"]) {
    manifest.bodies[g] = [];
    const k = kOf[g];
    bodyViews[g].forEach((bv, vi) => {
      const Wd = Math.round(bv.v.W * (1 + 2 * PAD) * k), Hd = Math.round(bv.v.H * (1 + PAD) * k);
      const ox = bv.v.W * PAD * k, oy = bv.v.H * PAD * k; // body pixel (0,0) lands here
      const c = document.createElement("canvas"); c.width = Wd; c.height = Hd;
      const ctx = c.getContext("2d");
      place(ctx, mannequin ? bv.v : bv.body.img, k, 0, 0, ox, oy);
      bodyCanvas[g][vi] = c;
      emit(`body-${g}-${vi}.png`, c);
      manifest.bodies[g].push({ W: Wd, H: Hd, feetY: oy + bv.v.H * k });

      // Heads onto this body: scale from the front view's ear span, place by the ear tip each view shows.
      for (const style of ["twin", "spiky", "bald"]) {
        const front = headViews[style][0], bodyFront = bodyViews[g][0];
        const s = (bodyFront.ears.R.x - bodyFront.ears.L.x) / (front.ears.R.x - front.ears.L.x);
        const hv = headViews[style][vi];
        let a, t;
        if (vi === 0) { a = { x: (hv.ears.L.x + hv.ears.R.x) / 2, y: (hv.ears.L.y + hv.ears.R.y) / 2 }; t = { x: (bv.ears.L.x + bv.ears.R.x) / 2, y: (bv.ears.L.y + bv.ears.R.y) / 2 }; }
        else if (vi === 1) { a = hv.ears.L; t = bv.ears.L; }
        else { a = hv.ears.R; t = bv.ears.R; }
        const hc = document.createElement("canvas"); hc.width = Wd; hc.height = Hd;
        const at = { x: ox + t.x * k, y: oy + t.y * k };
        if (mannequin) {
          // The bald style is the mannequin as it is: an empty layer.
          if (style !== "bald") place(hc.getContext("2d"), hairOnly(hv.full, hv.Lf), s * k, a.x, a.y, at.x, at.y);
        } else {
          place(hc.getContext("2d"), hv.v, s * k, a.x, a.y, at.x, at.y);
          const bridged = bridgeNeck(hc, c, hv.stub, s * k, a, at, at.y + (hv.chin + 3 - a.y) * s * k);
          if (bridged) (manifest.bridged ??= {})[`${style}-${g}-${vi}`] = bridged;
        }
        emit(`head-${style}-${g}-${vi}.png`, hc);

        if (mannequin) {
          // The face goes on the mannequin's head: the full character's eyes,
          // carried over by the ears (same gender, same view), and the mouth
          // halfway from the eyes to the mannequin's own chin.
          const cv = charViews[g][vi], charFront = charViews[g][0];
          if (cv.eyes && cv.eyes.length) {
            const cs = (bodyFront.ears.R.x - bodyFront.ears.L.x) / (charFront.ears.R.x - charFront.ears.L.x);
            const ca = vi === 0 ? { x: (cv.ears.L.x + cv.ears.R.x) / 2, y: (cv.ears.L.y + cv.ears.R.y) / 2 } : vi === 1 ? cv.ears.L : cv.ears.R;
            const ta = vi === 0 ? { x: (bv.ears.L.x + bv.ears.R.x) / 2, y: (bv.ears.L.y + bv.ears.R.y) / 2 } : vi === 1 ? bv.ears.L : bv.ears.R;
            const toBody = (q) => ({ x: ta.x + (q.x - ca.x) * cs, y: ta.y + (q.y - ca.y) * cs });
            const toDoll = (q) => ({ x: ox + q.x * k, y: oy + q.y * k });
            const eb = cv.eyes.map((e) => ({ ...toBody({ x: e.cx, y: e.cy }), w: e.w * cs, h: e.h * cs }));
            const eyes = eb.map((e) => ({ ...toDoll(e), w: e.w * k, h: e.h * k }));
            const mxb = eb.length === 2 ? (eb[0].x + eb[1].x) / 2 + (vi === 1 ? (eb[1].x - eb[0].x) * 0.12 : 0) : eb[0].x;
            const eyb = (eb[0].y + eb[eb.length - 1].y) / 2, ehb = Math.max(...eb.map((e) => e.h));
            const chinB = chinBelow(bv.v, bv.L, mxb, eyb + ehb * 1.2) ?? eyb + ehb * 3;
            const chin = toDoll({ x: mxb, y: chinB }).y;
            const ey = (eyes[0].y + eyes[eyes.length - 1].y) / 2;
            const mx = toDoll({ x: mxb, y: 0 }).x;
            ((manifest.faces[style] ??= {})[g] ??= [])[vi] = { eyes, mouth: { x: mx, y: ey + (chin - ey) * 0.5 }, chin };
          }
          continue;
        }

        // Where the face goes on this head: the full character's eyes,
        // carried onto this head by the same ear-tip fit, and the mouth set
        // by this head's own chin, so it never lands on the jaw.
        const cv = charViews[g][vi], charFront = charViews[g][0];
        if (cv.eyes && cv.eyes.length) {
          const toDoll = (p) => ({ x: ox + t.x * k + (p.x - a.x) * s * k, y: oy + t.y * k + (p.y - a.y) * s * k });
          // Character pixels to this head's pixels: both fitted by the ears the view shows.
          const cs = (front.ears.R.x - front.ears.L.x) / (charFront.ears.R.x - charFront.ears.L.x);
          const ca = vi === 0 ? { x: (cv.ears.L.x + cv.ears.R.x) / 2, y: (cv.ears.L.y + cv.ears.R.y) / 2 } : vi === 1 ? cv.ears.L : cv.ears.R;
          const toHead = (p) => ({ x: a.x + (p.x - ca.x) * cs, y: a.y + (p.y - ca.y) * cs });
          const sz = cs * s * k;
          const eyes = cv.eyes.map((e) => ({ ...toDoll(toHead({ x: e.cx, y: e.cy })), w: e.w * sz, h: e.h * sz }));
          const chin = toDoll({ x: a.x, y: hv.chin }).y;
          const ey = (eyes[0].y + eyes[eyes.length - 1].y) / 2;
          const mx = eyes.length === 2 ? (eyes[0].x + eyes[1].x) / 2 + (vi === 1 ? (eyes[1].x - eyes[0].x) * 0.12 : 0) : eyes[0].x;
          ((manifest.faces[style] ??= {})[g] ??= [])[vi] = { eyes, mouth: { x: mx, y: ey + (chin - ey) * 0.5 }, chin };
        }
      }
    });
  }

  // ── face parts ──
  const P = src.parts;
  const { lab, comps } = components(P);
  const big = comps.filter((c) => c.n > 60);
  // Rows by vertical position.
  big.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rows = [];
  let prevCy = -Infinity;
  for (const c of big) {
    const cy = (c.y0 + c.y1) / 2;
    if (cy - prevCy > 60 || !rows.length) rows.push({ cy, items: [] });
    rows[rows.length - 1].items.push(c);
    prevCy = cy;
  }
  const violetIn = (c) => {
    let n = 0, sx = 0, sy = 0;
    for (let y = c.y0; y < c.y1; y++) for (let x = c.x0; x < c.x1; x++) {
      const p = y * P.W + x; if (lab[p] !== c.id) continue;
      const i = p * 4, cl = classify(P.d[i], P.d[i + 1], P.d[i + 2], P.d[i + 3]); if (cl === CL.violet || cl === CL.blue) { n++; sx += x; sy += y; }
    }
    return n ? { n, cx: sx / n, cy: sy / n } : null;
  };
  const cutPart = (cs) => {
    const x0 = Math.min(...cs.map((c) => c.x0)), x1 = Math.max(...cs.map((c) => c.x1));
    const y0 = Math.min(...cs.map((c) => c.y0)), y1 = Math.max(...cs.map((c) => c.y1));
    const ids = new Set(cs.map((c) => c.id));
    const W = x1 - x0, H = y1 - y0, d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (y0 + y) * P.W + x0 + x;
      if (!ids.has(lab[p])) continue;
      d.set(P.d.subarray(p * 4, p * 4 + 4), (y * W + x) * 4);
    }
    return { img: { W, H, d }, x0, y0 };
  };
  // Small bits (tears, sparkles, a fang) join the piece they sit beside.
  const attach = (row) => {
    const items = row.items.slice().sort((a, b) => a.x0 - b.x0);
    const groups = [];
    for (const c of items) {
      const prev = groups[groups.length - 1];
      const near = prev && c.x0 - Math.max(...prev.map((q) => q.x1)) < 10 && (c.n < 1500 || prev.some((q) => q.n < 1500));
      if (near) prev.push(c); else groups.push([c]);
    }
    return groups;
  };
  const describe = (row) => attach(row).map((g) => {
    const v = g.map(violetIn).filter(Boolean);
    const cut = cutPart(g);
    const vio = v.length ? { cx: v.reduce((a, q) => a + q.cx * q.n, 0) / v.reduce((a, q) => a + q.n, 0) - cut.x0, cy: v.reduce((a, q) => a + q.cy * q.n, 0) / v.reduce((a, q) => a + q.n, 0) - cut.y0 } : null;
    const h = Math.max(...g.map((q) => q.y1)) - Math.min(...g.map((q) => q.y0));
    return { cut, vio, h, x: cut.x0, y: cut.y0 };
  });

  const [r1, r2, r3, r4, r5] = rows;
  const splitRowsByY = (row) => {
    // In the eye rows, brows sit above the eyes in the same row band: separate by height.
    const top = [], bottom = [];
    const ys = row.items.map((c) => (c.y0 + c.y1) / 2), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    for (const c of row.items) ((c.y0 + c.y1) / 2 < mid - 6 && c.y1 - c.y0 < 28 ? top : bottom).push(c);
    return { brows: { items: top }, eyes: { items: bottom } };
  };
  const pairUp = (arr) => { const out = []; for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]]); return out; };

  const e1 = splitRowsByY(r1), e2 = splitRowsByY(r2);
  const eyes1 = describe(e1.eyes), eyes2 = describe(e2.eyes);
  const eyeNames1 = ["sparkle", "round", "sharp", "sleepy", "cat", "determined"];
  const eyeNames2 = ["happy", "closed", "wink", "surprised", "teary"];
  const refEye = eyes1[2]; // "round", no lashes: the size reference
  manifest.parts.eyes = [];
  const savePart = (name, piece) => { emit(`${name}.png`, toCanvas(piece.cut.img)); return { file: `${name}.png`, w: piece.cut.img.W, h: piece.cut.img.H, anchor: piece.vio ?? { cx: piece.cut.img.W / 2, cy: piece.cut.img.H / 2 } }; };
  pairUp(eyes1).forEach(([l, r], i) => manifest.parts.eyes.push({ id: eyeNames1[i] ?? `eye${i}`, L: savePart(`eye-${eyeNames1[i]}-L`, l), R: savePart(`eye-${eyeNames1[i]}-R`, r) }));
  pairUp(eyes2).forEach(([l, r], i) => manifest.parts.eyes.push({ id: eyeNames2[i] ?? `eyes${i}`, L: savePart(`eye-${eyeNames2[i]}-L`, l), R: savePart(`eye-${eyeNames2[i]}-R`, r) }));
  const browNames = ["soft", "thick", "angry", "worried"];
  manifest.parts.brows = pairUp(describe(r3)).map(([l, r], i) => ({ id: browNames[i], L: savePart(`brow-${browNames[i]}-L`, l), R: savePart(`brow-${browNames[i]}-R`, r) }));
  const mouthNames = ["smile", "happy", "grin", "flat", "o", "pout", "frown", "laugh"];
  manifest.parts.mouths = describe(r4).map((m, i) => ({ id: mouthNames[i] ?? `mouth${i}`, ...savePart(`mouth-${mouthNames[i] ?? i}`, m) }));
  const extras = describe(r5);
  manifest.parts.extras = extras.map((x, i) => ({ id: ["blushL", "blushR", "sweat", "anger"][i] ?? `extra${i}`, ...savePart(`extra-${i}`, x) }));
  // Parts scale: the reference eye's violet height to each body's measured eye height.
  const refV = (() => { const c = refEye.cut.img; let y0 = Infinity, y1 = -1; for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) { const i = (y * c.W + x) * 4, cl = classify(c.d[i], c.d[i + 1], c.d[i + 2], c.d[i + 3]); if (cl === CL.violet || cl === CL.blue) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } } return y1 - y0 + 1; })();
  manifest.parts.scale = {};
  for (const g of ["f", "m"]) {
    const e = manifest.faces.twin[g][0].eyes;
    manifest.parts.scale[g] = Math.max(...e.map((q) => q.h)) / refV;
  }
  manifest.k = kOf;
  manifest.rows = rows.map((r) => r.items.length);
  return { manifest, images };
}
