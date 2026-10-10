// Regression for silver-web net indicators disappearing beyond a high-DPI canvas.
// Requires next dev and agent-browser. Uses only the local trial, never a live purse.
// AGENT_BROWSER_BIN may point to the native agent-browser executable.
// node town-net-display.mjs http://localhost:3348 .codex/insect-radar/regression
import { spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [base = "http://localhost:3348", out = ".codex/insect-radar/regression"] = process.argv.slice(2);
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local trial only");
const bin = process.env.AGENT_BROWSER_BIN || "agent-browser", session = process.env.AGENT_BROWSER_SESSION || `net-display-${process.pid}`;
const output = resolve(out);
mkdirSync(output, { recursive: true });
const evidence = [];
let passed = 0;
function command(args, input) {
  // File handles avoid a newly started Windows browser daemon keeping stdout pipes open.
  const response = resolve(output, "agent-response.json"), errors = resolve(output, "agent-stderr.txt");
  const stdout = openSync(response, "w"), stderr = openSync(errors, "w");
  let call;
  try {
    call = spawnSync(bin, ["--session", session, "--json", ...args], { input: input ?? "", stdio: ["pipe", stdout, stderr], encoding: "utf8", timeout: 45_000 });
  } finally { closeSync(stdout); closeSync(stderr); }
  if (call.error) throw call.error;
  const result = JSON.parse(readFileSync(response, "utf8"));
  if (call.status !== 0 || !result.success) throw new Error(result.error || readFileSync(errors, "utf8"));
  return result.data;
}
const evaluate = source => command(["eval", "--stdin"], source).result;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(label, condition, details) {
  if (!condition) throw new Error(`${label}: ${JSON.stringify(details)}`);
  passed++;
  console.log(`PASS ${label}`);
}
function probe() {
  const p = CanvasRenderingContext2D.prototype;
  if (!window.__radarPaintOriginal) {
    window.__radarPaintOriginal = { fill: p.fill, fillRect: p.fillRect };
    window.__radarPaint = [];
    p.fillRect = function (x, y, w, h) {
      if (x === 0 && y === 0 && w > 100) window.__radarPaint = [];
      if (typeof this.fillStyle === "string" && this.fillStyle.startsWith("rgba(232, 244, 255")) window.__radarPaint.push({ x, y, kind: "mark" });
      return window.__radarPaintOriginal.fillRect.apply(this, arguments);
    };
    p.fill = function () {
      const t = this.getTransform(), px = Math.hypot(t.a, t.b);
      if (typeof this.fillStyle === "string" && this.fillStyle.startsWith("rgba(232, 244, 255")) window.__radarPaint.push({ x: t.e / px, y: t.f / px, kind: "arrow" });
      return window.__radarPaintOriginal.fill.apply(this, arguments);
    };
  }
  const c = document.querySelector("canvas"), r = c.getBoundingClientRect(), paint = window.__radarPaint;
  return {
    viewport: [r.width, r.height], bitmap: [c.width, c.height], dpr: devicePixelRatio,
    glints: window.__townBugs.glints(), poses: window.__townBugs.poses().length,
    arrows: paint.filter(m => m.kind === "arrow").length,
    marks: paint.filter(m => m.kind === "mark").length,
    outside: paint.filter(m => m.x < 0 || m.y < 0 || m.x >= r.width || m.y >= r.height),
  };
}
const paint = () => evaluate(`(${probe.toString()})()`);
try {
  command(["open", `${base}/town?townTest=N&townRoom=check&townHour=12&townWeather=clear`]);
  const deadline = Date.now() + 30_000;
  while (!evaluate("!!window.__townBugs && !!window.__townTrade && !!window.__townView")) {
    if (Date.now() > deadline) throw new Error("Trial did not become ready");
    await pause(250);
  }
  evaluate("window.__townTrade.setGifts(true)");
  evaluate("window.__townKeeper.charmsWear(['charmNet'])");
  paint();
  for (const [width, height, dpr] of [[1280, 860, 1], [1280, 860, 1.25], [1280, 860, 2], [390, 844, 3]]) {
    command(["set", "viewport", String(width), String(height), String(dpr)]);
    for (const place of ["town", "farm", "forest", "mountain"]) {
      evaluate(`(() => {
        const all = window.__townBugs.haunts().filter(h => h.place === ${JSON.stringify(place)});
        const preferred = all.filter(h => h.kind === 'tree' || h.kind === 'field');
        const h = preferred.length ? preferred : all;
        for (const haunt of h) window.__townTrade.setBug(haunt.id, haunt.kind === 'tree' ? 'cicada' : haunt.kind === 'field' ? 'cricket' : 'butterflyWhite');
        window.__townView.warp(h.length ? Math.floor(h[0].x) + 3 : 4, h.length ? Math.floor(h[0].y) + 3 : 212);
      })()`);
      await pause(1200);
      const result = paint();
      evidence.push({ width, height, dpr, place, ...result });
      const label = `${place} ${width}x${height} DPR ${dpr}`;
      if (place === 'mountain') {
        check(`${label}: no insects or marks leak from other maps`, result.glints === 0 && result.poses === 0 && result.marks + result.arrows === 0, result);
      } else {
        check(`${label}: insects are marked`, result.glints > 0 && result.glints === result.poses, result);
        check(`${label}: indicators stay in the visible canvas`, result.outside.length === 0 && result.arrows + result.marks > 0, result);
      }
      if (place === "farm") command(["screenshot", "--screenshot-dir", output]);
    }
  }
  evaluate("(() => { const h = window.__townBugs.haunts().find(h => h.place === 'farm'); window.__townView.warp(Math.floor(h.x) + 3, Math.floor(h.y) + 3); })()");
  await pause(600);
  const worn = paint();
  check("Indicators are visible before removing the charm", worn.glints > 0 && worn.marks + worn.arrows > 0, worn);
  evaluate("window.__townKeeper.charmsWear([])");
  await pause(600);
  const bare = paint();
  check("Taking the charm off removes its indicators", bare.glints === 0 && bare.marks + bare.arrows === 0, bare);
  const errors = command(["errors"]);
  check("No page exceptions", !errors.errors?.length, errors);
} finally {
  writeFileSync(resolve(output, "results.json"), JSON.stringify({ passed, evidence }, null, 2) + "\n");
  command(["close"]);
}
console.log(`${passed} passed`);
