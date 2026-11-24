// The windows of a building's picture, to be lit at night (the owner, 2026-11-24, of the city at night: "ช่วยปรับให้เมือง
// ตอนกลางคืน ดูมีไฟ สวยๆ cozyๆ ออกมาจากตึก ให้ดูไม่มืดเกินไปหน่อย"). The editor's buildings are AI pixel art, each its own:
// what makes a window here is that a building has many of them alike. So, for each picture:
// - its dark glass: pixels darker than the wall about them (and not warm), tried at several strengths;
// - in compact, nearly rectangular patches wholly inside the picture, neither a sliver nor a wall;
// - kept only where four or more patches are alike in width and height (a row of windows), the strength that finds the
//   most of them being the building's;
// - and what the artist painted lit already (warm, bright, saturated panes), two or more alike.
// A lit layer is then the picture's own pane pixels in a warm light, each keeping its shading (lightest where the glass
// caught the light).

/** The luminance of each pixel, whether it is solid, and the mean luminance of the solid ones about it. */
function prepare(data, W, H) {
  const L = new Float32Array(W * H), A = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { L[i] = 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]; A[i] = data[i * 4 + 3] > 200 ? 1 : 0; }
  const R = Math.max(5, Math.round(Math.min(W, H) / 40)), S = W + 1;
  const sum = new Float64Array(S * (H + 1)), cnt = new Float64Array(S * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, j = (y + 1) * S + x + 1;
    sum[j] = (A[i] ? L[i] : 0) + sum[j - 1] + sum[j - S] - sum[j - S - 1];
    cnt[j] = A[i] + cnt[j - 1] + cnt[j - S] - cnt[j - S - 1];
  }
  const mean = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(W, x + R + 1), y1 = Math.min(H, y + R + 1);
    const n = cnt[y1 * S + x1] - cnt[y0 * S + x1] - cnt[y1 * S + x0] + cnt[y0 * S + x0];
    mean[y * W + x] = n ? (sum[y1 * S + x1] - sum[y0 * S + x1] - sum[y1 * S + x0] + sum[y0 * S + x0]) / n : 0;
  }
  return { L, A, mean };
}

function tryRule(data, W, H, P, rule) {
  const { L, A, mean } = P, hit = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!A[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (rule.warm) { if (r > 215 && g > 150 && b < 150 && r - b > 100) hit[i] = 1; continue; }
    if (L[i] < mean[i] * rule.dark && (!rule.cool || (b >= r - 4 && b >= g - 24))) hit[i] = 1;
  }
  const seen = new Uint8Array(W * H), comps = [];
  const least = Math.max(12, (W * H) / 30000) * (rule.warm ? 4 : 1);
  for (let i = 0; i < W * H; i++) {
    if (!hit[i] || seen[i]) continue;
    const st = [i], px = [];
    seen[i] = 1;
    let edge = false;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j / W) | 0;
      px.push(j);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy, k = Y * W + X;
        if (X < 0 || Y < 0 || X >= W || Y >= H || !A[k]) { edge = true; continue; }
        if (hit[k] && !seen[k]) { seen[k] = 1; st.push(k); }
      }
    }
    if (edge) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const j of px) { const x = j % W, y = (j / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, area = px.length, fill = area / (bw * bh);
    if (area < least || area > (W * H) / 100 || fill < 0.5 || bw / bh > 2.5 || bh / bw > 4) continue;
    comps.push({ px, x0, y0, x1, y1, bw, bh, area });
  }
  const alike = (c, d) => Math.abs(d.bw - c.bw) <= Math.max(2, c.bw * 0.2) && Math.abs(d.bh - c.bh) <= Math.max(2, c.bh * 0.2);
  return comps.filter((c) => comps.filter((d) => alike(c, d)).length >= (rule.warm ? 2 : 4));
}

const RULES = [{ dark: 0.62, cool: true }, { dark: 0.72, cool: true }, { dark: 0.8, cool: true }, { dark: 0.88, cool: true }, { dark: 0.72, cool: false }, { dark: 0.8, cool: false }];

/** A picture's windows: [{ px: pixel indexes, x0, y0, x1, y1, area }]. */
export function panes(data, W, H) {
  const P = prepare(data, W, H);
  let solid = 0;
  for (let i = 0; i < W * H; i++) solid += P.A[i];
  let best = [], bestArea = 0;
  for (const rule of RULES) {
    const got = tryRule(data, W, H, P, rule), area = got.reduce((a, c) => a + c.area, 0);
    if (area > solid * 0.12) continue;
    if (area > bestArea) { best = got; bestArea = area; }
  }
  return [...best, ...tryRule(data, W, H, P, { warm: true })];
}

/** The lit layer: the picture's pane pixels in a warm light, each keeping its shading; the rest clear. */
export function litLayer(data, W, H, found) {
  const out = Buffer.alloc(W * H * 4);
  for (const w of found) for (const j of w.px) {
    const l = (0.3 * data[j * 4] + 0.59 * data[j * 4 + 1] + 0.11 * data[j * 4 + 2]) / 255;
    out[j * 4] = 255; out[j * 4 + 1] = Math.round(168 + 64 * l); out[j * 4 + 2] = Math.round(84 + 70 * l); out[j * 4 + 3] = 255;
  }
  return out;
}
