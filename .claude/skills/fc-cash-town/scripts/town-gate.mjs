// Cash Town's two maps in real browsers: a tap on the town's gateway walks A to the gate and through it to the farm;
// B, still in town, sees A there at once (not walked across the nothing between); A walks about the farm; a tap on
// the farm's gateway brings A back, and B sees that too. Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-gate.mjs <base> <outdir>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? ".";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browser(label) {
  const profile = mkdtempSync(join(tmpdir(), `town-${label}-`));
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); }
  }
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0; const wait = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && wait.has(m.id)) { const { ok: res, no } = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(m.error.message)) : res(m.result); }
    else if (m.method === "Runtime.exceptionThrown") logs.push(`exception: ${m.params.exceptionDetails.exception?.description?.split("\n")[0]}`);
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") logs.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200)}`);
  };
  ws.onclose = () => { for (const { no } of wait.values()) no(new Error("closed")); wait.clear(); };
  const send = (method, params = {}) => new Promise((res, no) => {
    if (ws.readyState !== 1) return no(new Error("closed"));
    const id = ++seq; wait.set(id, { ok: res, no }); ws.send(JSON.stringify({ id, method, params }));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    label, logs, send, evaluate,
    async goto(url) { await send("Page.navigate", { url }); },
    async shot(file) { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(s.data, "base64")); },
    async tap(x, y) {
      const r = await evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
      for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: r.x + x, y: r.y + y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
    },
    close() { try { ws.close(); } catch {} try { proc.kill(); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); },
  };
}

async function until(label, fn, ms, every = 300) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e.message; }
    await sleep(every);
  }
  throw new Error(`${label} timed out (last: ${JSON.stringify(last)?.slice(0, 300)})`);
}
const T = "window.__cashTown", V = "window.__townView";
const me = (X) => X.evaluate(`${T}.me().pos`);
/** Where X sees the other one of the two standing (the dev test room is shared with whatever else is being tried). */
const other = (X) => X.evaluate(`${T}.people().find((p) => p.name.endsWith(" ${X.label === "GA" ? "GB" : "GA"}"))?.pos ?? null`);
const inFarm = (p) => !!p && p.x >= 128;
const inTown = (p) => !!p && p.x < 64;
/** Tap the gateway X has on the screen (after looking at it). */
async function tapGate(X, x, y) {
  await X.evaluate(`${V}.lookAt(${x}, ${y})`);
  // (the boxes are those of the last frame drawn: let the look take, and a frame or two be drawn from there)
  await X.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  await sleep(250);
  const g = await until("a gateway on the screen", async () => (await X.evaluate(`${V}.gates()`))[0], 5000);
  await X.tap((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2);
}

const A = await browser("GA"), B = await browser("GB");
try {
  for (const X of [A, B]) await X.goto(`${BASE}/town?townTest=${X.label}&townRoom=check&townHour=12&townWeather=clear`);
  for (const X of [A, B]) await until(`${X.label} ready`, async () => (await X.evaluate(`${T}?.status?.() ?? null`)) === "ready", 120000);
  await until("each sees the other", async () => (await other(A)) && (await other(B)), 30000);
  ok("both enter the town and see each other", true);

  // A starts by the east path's end (so the walk to the gate is short), then taps the gateway.
  await A.evaluate(`${V}.warp(58, 31)`);
  await until("B sees A by the east gate", async () => { const p = await other(B); return p && p.x > 57 && p.x < 60; }, 30000);   // (B walks A there from wherever A arrived: half the town away, sometimes)
  await tapGate(A, 61, 31.5);
  const farm = await until("A is through the gate", async () => { const p = await me(A); return inFarm(p) && p; }, 15000).catch((e) => e.message);
  ok("a tap on the town's gateway walks A to the gate and through it to the farm", inFarm(farm), farm);
  await sleep(700);
  await A.shot(`${OUT}/gate-A-farm.png`);
  const seen = await until("B sees A in the farm", async () => { const p = await other(B); return inFarm(p) && p; }, 8000).catch((e) => e.message);
  ok("B, in town, sees A in the farm", inFarm(seen), seen);
  ok("…stood there at once, where A is", inFarm(seen) && Math.hypot(seen.x - farm.x, seen.y - farm.y) < 0.6, { seen, farm });
  ok("B is still in town", inTown(await me(B)));

  // A walks about the farm: a tap on a plot a few tiles off.
  await A.evaluate(`${V}.lookAt(140, 16)`);
  await sleep(600);
  await A.tap(550, 450);
  const walked = await until("A walks in the farm", async () => { const p = await me(A); return inFarm(p) && Math.hypot(p.x - farm.x, p.y - farm.y) > 4 && p; }, 12000).catch((e) => e.message);
  ok("A walks about the farm", inFarm(walked), walked);
  const follows = await until("B sees A's walk", async () => { const p = await other(B), q = await me(A); return p && Math.hypot(p.x - q.x, p.y - q.y) < 1.5; }, 12000).catch((e) => e.message);
  ok("…and B sees where A walked to", follows === true, follows);

  // Back through the farm's gateway.
  await A.evaluate(`${V}.warp(132, 21)`);
  await sleep(600);
  await tapGate(A, 130, 21.5);
  const back = await until("A is back in town", async () => { const p = await me(A); return inTown(p) && p; }, 15000).catch((e) => e.message);
  ok("a tap on the farm's gateway brings A back to the town", inTown(back) && back.x > 55, back);
  const seenBack = await until("B sees A back", async () => { const p = await other(B); return inTown(p) && p.x > 55; }, 8000).catch((e) => e.message);
  ok("…and B sees A back by the east path's end", seenBack === true, seenBack);
  await sleep(700);
  await A.shot(`${OUT}/gate-A-back.png`);
  ok("no page errors", A.logs.length + B.logs.length === 0, [...A.logs, ...B.logs]);
} catch (e) { ok("the run", false, e.message); } finally { A.close(); B.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
