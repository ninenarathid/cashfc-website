// Cash Town's pixel avatars in real browsers: A changes look in the wardrobe,
// B sees exactly that look, and both are photographed walking and standing.
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-pixel.mjs <base> <outdir>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? ".";
const ONLY = process.argv[4] ?? "all";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const note = (s) => console.log(`  (${s})`);
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
  const evaluate = async (expr, gesture = false) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    label, logs, send, evaluate,
    async goto(url) { await send("Page.navigate", { url }); },
    async shot(file) { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(s.data, "base64")); },
    /** Close the tab the way a person does (✕): the page gets to say goodbye. */
    async closeTab() { await send("Page.close").catch(() => {}); },
    /** Headless Chrome's own shutdown, which does not run the page's handlers. */
    async quit() {
      const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const b = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((r) => (b.onopen = r));
      b.send(JSON.stringify({ id: 1, method: "Browser.close" }));
      await sleep(300);
      try { b.close(); } catch {}
    },
    /** The process gone with no goodbye: a crash, a killed app. */
    kill() { proc.kill("SIGKILL"); },
    close() { try { ws.close(); } catch {} try { proc.kill(); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); },
  };
}

async function until(label, fn, ms, every = 500) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e.message; }
    await sleep(every);
  }
  throw new Error(`${label} timed out (last: ${JSON.stringify(last)?.slice(0, 300)})`);
}
const T = "window.__cashTown";
const status = (X) => X.evaluate(`${T}?.status?.() ?? null`);
/** Whom X lists as here (not on their way out), by their test letter. */
const listed = async (X) => (await X.evaluate(`${T}.people()`)).filter((p) => !p.going).map((p) => p.name.split(" ").pop());
const sees = async (X, who) => (await listed(X)).includes(who);

const clickText = (re) => `(() => { const b = [...document.querySelectorAll("button")].find(x => ${re}.test(x.textContent.trim()) || ${re}.test(x.getAttribute("aria-label") ?? "")); if (!b) return false; b.click(); return true; })()`;
const all = [];
const open = async (label, dpr = 1) => {
  const X = await browser(label);
  all.push(X);
  if (dpr !== 1) await X.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 900, deviceScaleFactor: dpr, mobile: false });
  await X.goto(`${BASE}/town?townTest=${label}&townRoom=check`);
  return X;
};

try {
  const A = await open("A");
  const B = await open("B", 2);
  await until("A ready", async () => (await status(A)) === "ready", 120000);
  await until("B ready", async () => (await status(B)) === "ready", 60000);
  await until("A sees B", () => sees(A, "B"), 20000);
  await until("B sees A", () => sees(B, "A"), 20000);
  ok("both enter and see each other", true);
  await until("the pixel picture loads", () => A.evaluate(`performance.getEntriesByType("resource").some(r => r.name.includes("/town/pixel-") && r.name.endsWith(".png"))`), 15000);
  ok("the pixel atlas is fetched", true);

  // A dresses: a boy with the bowl cut and tuft (m08), ruby hair, amber cat eyes, dark Dunesfolk skin.
  ok("A opens the wardrobe", await A.evaluate(clickText(`/แต่งตัว|Wardrobe/`), true));
  await sleep(400);
  for (const re of [`/^(ชาย|Male)$/`, `/^(กะลาหัวจุก|Bowl cut with a tuft)$/`, `/^(แดงทับทิม|Ruby)$/`, `/^(ทองอำพัน|Amber)$/`, `/^(Dunesfolk เข้ม|Dunesfolk, dark)$/`, `/^(ตาแมว|Cat)$/`])
    ok(`A picks ${re}`, await A.evaluate(clickText(re), true));
  await sleep(900);
  await A.shot(join(OUT, "pixel-A-wardrobe.png"));
  ok("A turns around", await A.evaluate(clickText(`/หมุนขวา|Turn right/`), true));
  await sleep(500);
  await A.shot(join(OUT, "pixel-A-wardrobe-back.png"));
  ok("A closes the wardrobe", await A.evaluate(clickText(`/^(เสร็จ|Done)$/`), true));
  // version 4: gender 1 (m), hair 21 (m08 = l), hair colour 11 (ruby = b), eye colour 6 (amber), skin 6, eyes 4 (cat)
  const want = "501lb664"; // v5: Lalafell (race 0), then as before
  const aId = (await A.evaluate(`${T}.me()`)).id;
  const got = await until("B sees A's new look", async () => {
    // by id: a stale "A" from an earlier run may still be listed for a while
    const a = (await B.evaluate(`${T}.people()`)).find((p) => p.id === aId);
    return a?.look === want ? a.look : false;
  }, 10000).catch(async (e) => e.message + " people: " + JSON.stringify((await B.evaluate(`${T}.people()`)).map(p => [p.name, p.look])) + " A me: " + JSON.stringify((await A.evaluate(`${T}.me()`)).look));
  ok("B sees exactly A's look", got === want, got);

  // Walk A past B and photograph B's screen mid-walk; B zoomed in.
  await B.evaluate(`${T}.walkTo(29, 33)`);
  await A.evaluate(`${T}.walkTo(29, 29)`);
  await sleep(4000);
  for (let i = 0; i < 4; i++) await B.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }))`);
  await A.evaluate(`${T}.walkTo(35, 29)`);
  for (let i = 0; i < 3; i++) { await sleep(180); await B.shot(join(OUT, `pixel-B-walk-${i}.png`)); }
  await sleep(2500);
  await A.evaluate(`${T}.walkTo(35, 34)`);
  await sleep(350);
  await B.shot(join(OUT, "pixel-B-walk-sw.png"));
  await sleep(2500);
  await B.shot(join(OUT, "pixel-B-stand.png"));
  const errors = [...A.logs, ...B.logs].filter((l) => !/favicon|DevTools/.test(l));
  ok("no errors on either page", errors.length === 0, errors);
} catch (e) {
  ok("ran to the end", false, e.message);
} finally {
  for (const X of all) X.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
