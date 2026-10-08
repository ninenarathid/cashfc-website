// Cash Town in real browsers: headless Chromes with fake microphones walk into
// the dev test room. Two first (seeing, walking, voice across the whole map, a
// tab that sleeps, a network that drops), then a crowd of six (everybody hears
// everybody, a full room turns the seventh away, closing the tab, a killed
// browser, walking off to another page). Prints PASS/FAIL lines.
//
//   node town-e2e.mjs <base> <outdir> [two|crowd|all]
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
// (the microphone is offered in a little tray since 2026-10-09: a tap on its button, then the button with the words)
const press = `(async () => { const find = () => [...document.querySelectorAll("button")].find(x => /เปิดไมค์|Turn mic on/.test(x.textContent)); let b = find(); if (!b) { document.querySelector("[data-town-mic=off]")?.click(); await new Promise((r) => setTimeout(r, 400)); b = find(); } if (!b || b.disabled) return false; b.click(); return true; })()`;
/** Every line X has is connected and audio has arrived on it; returns the lines. */
const linesUp = (X, n) => until(`${X.label} has ${n} voice lines up`, async () => {
  const s = await X.evaluate(`${T}.voice()`);
  return s.length === n && s.every((l) => l.state === "connected" && l.bytesIn > 2000) ? s : false;
}, 60000, 1000);
/** Audio still arriving on every line, a few seconds later. */
const flowing = async (X) => {
  const before = await X.evaluate(`${T}.voice()`);
  await sleep(3000);
  const after = await X.evaluate(`${T}.voice()`);
  return after.length > 0 && after.every((l) => l.state === "connected" && l.bytesIn > (before.find((b) => b.id === l.id)?.bytesIn ?? 0)) ? after : false;
};
/** Seconds until X stops listing `who` at all, polling every 250 ms. */
const goneAfter = async (X, who, ms) => {
  const t0 = Date.now();
  await until(`${X.label} stops listing ${who}`, async () => !(await X.evaluate(`${T}.people().some(p => p.name.endsWith(" ${who}"))`)), ms, 250);
  return (Date.now() - t0) / 1000;
};

const all = [];
const open = async (label, extra = "") => {
  const X = await browser(label);
  all.push(X);
  await X.goto(`${BASE}/town?townTest=${label}&townRoom=check${extra}`);
  return X;
};

try {
  const A = await open("A");
  const B = await open("B");
  await until("A ready", async () => (await status(A)) === "ready", 120000);
  await until("B ready", async () => (await status(B)) === "ready", 60000);
  ok("both browsers enter the town", true);

  await until("A sees B", () => sees(A, "B"), 20000);
  await until("B sees A", () => sees(B, "A"), 20000);
  ok("each sees the other", true);

  // Walking: A walks somewhere, and B sees A arrive there.
  await A.evaluate(`${T}.walkTo(31, 20)`);
  // by id: somebody else's tab on the same test letter has the same name
  const aId = (await A.evaluate(`${T}.me()`)).id, bId = (await B.evaluate(`${T}.me()`)).id;
  await until("B sees A arrive", () => B.evaluate(`(() => { const a = ${T}.people().find(p => p.id === ${JSON.stringify(aId)}); return a && Math.abs(a.pos.x - 31.5) < 0.05 && Math.abs(a.pos.y - 20.5) < 0.05; })()`), 15000);
  ok("a walk on one screen arrives on the other", true);

  ok("A presses the mic button", await A.evaluate(press, true));
  ok("B presses the mic button", await B.evaluate(press, true));
  await linesUp(A, 1); await linesUp(B, 1);
  ok("voice connects both ways, audio arriving", true);

  let heard = 0;
  for (let i = 0; i < 20; i++) { heard = Math.max(heard, (await A.evaluate(`${T}.voice()`))[0].level); await sleep(150); }
  ok("A's ears pick up B's voice (level > 0)", heard > 0.01, heard);

  // One room: from opposite corners, still at full volume.
  // the far ends of the north and east paths, just inside their road works (the river cuts the other two)
  await A.evaluate(`${T}.walkTo(34, 3)`);
  await B.evaluate(`${T}.walkTo(60, 31)`);
  await until("A sees B in the far corner", () => A.evaluate(`(() => { const b = ${T}.people().find(p => p.id === ${JSON.stringify(bId)}); return b && b.pos.x > 59; })()`), 40000);
  await sleep(1000);
  const far = (await A.evaluate(`${T}.voice()`))[0];
  ok("across the whole map, A still hears B at full volume", far?.gain === 1 && far.state === "connected", far);
  ok("…and the audio keeps arriving", !!(await flowing(A)));

  // The stats panel.
  await A.evaluate(`[...document.querySelectorAll("button")].find(b => /สถิติ|Stats/.test(b.textContent)).click()`, true);
  await until("stats panel shows the line", () => A.evaluate(`/สายเสียง 1\\/1|1\\/1 voice lines/.test(document.body.innerText)`), 6000);
  ok("the stats panel shows 1/1 voice lines up", true);
  await sleep(2500);
  await A.shot(join(OUT, "town-A-stats.png"));
  await B.shot(join(OUT, "town-B.png"));

  if (ONLY !== "crowd") {
    // A tab frozen long enough for the server to hang up on it.
    await B.send("Page.setWebLifecycleState", { state: "frozen" });
    const f0 = Date.now();
    let goingAt = null, goneAt = null;
    while (Date.now() - f0 < 75000) {
      const p = (await A.evaluate(`${T}.people()`)).find((x) => x.name.endsWith(" B"));
      if (p?.going && goingAt === null) goingAt = (Date.now() - f0) / 1000;
      if (!p && goneAt === null) goneAt = (Date.now() - f0) / 1000;
      await sleep(1000);
    }
    note(goneAt !== null
      ? `while B was frozen, A dropped B ${goneAt}s in (the room let go at ~${goingAt ?? "?"}s); no ghost`
      : `while B was frozen for 75s, A kept listing B: the server had not hung up yet`);
    await B.send("Page.setWebLifecycleState", { state: "active" });
    const recovers = async (what) => {
      await until(`${what}: B ready again`, async () => (await status(B)) === "ready", 60000);
      await until(`${what}: A sees B`, () => sees(A, "B"), 60000);
      await until(`${what}: B sees A`, () => sees(B, "A"), 30000);
      ok(`${what}: both see each other again, no reload`, true);
      await until(`${what}: A hears B`, () => flowing(A), 60000);
      await until(`${what}: B hears A`, () => flowing(B), 60000);
      ok(`${what}: voice flows both ways again`, true);
    };
    await recovers("after a frozen tab");

    // The network gone for a while.
    await B.send("Network.enable");
    await B.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const o0 = Date.now();
    let offGone = null;
    while (Date.now() - o0 < 40000) {
      if (offGone === null && !(await sees(A, "B"))) offGone = (Date.now() - o0) / 1000;
      await sleep(1000);
    }
    note(offGone !== null ? `with B offline, A dropped B after ${offGone}s` : "with B offline for 40s, A kept listing B");
    await B.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await recovers("after the network dropped");
  }

  if (ONLY !== "two") {
    // ── a crowd of six ──
    const crowd = [];
    for (const l of ["C", "D", "E", "F"]) crowd.push(await open(l));
    const [C, D, E, F] = crowd;
    const six = [A, B, ...crowd];
    for (const X of crowd) await until(`${X.label} ready`, async () => (await status(X)) === "ready", 90000);
    for (const X of six) {
      await until(`${X.label} sees the other five`, async () => (await listed(X)).length === 5 ? true : (await listed(X)).join(""), 30000);
    }
    ok("six in the room, each sees the other five", true);
    for (const X of crowd) ok(`${X.label} presses the mic button`, await X.evaluate(press, true));
    for (const X of six) await linesUp(X, 5);
    ok("everybody has a voice line to everybody (15 lines), audio arriving at all 30 ends", true);
    for (const X of six) {
      const s = await X.evaluate(`${T}.voice()`);
      const worst = (k) => Math.max(...s.map((l) => l[k] ?? 0));
      note(`${X.label}: rtt ≤ ${worst("rtt")} ms, jitter ≤ ${worst("jitter")} ms, loss ≤ ${worst("loss")}%, paths ${[...new Set(s.map((l) => l.path))].join("/")}`);
    }
    await A.shot(join(OUT, "town-A-crowd.png"));

    // A seventh, with the room made full at six: turned away, and not left behind.
    const G = await open("G", "&townCap=6");
    await until("G is told the room is full", async () => (await status(G)) === "full", 60000);
    ok("the seventh is told the room is full", await G.evaluate(`/ห้องเต็มแล้ว|room is full/.test(document.body.innerText)`));
    await G.shot(join(OUT, "town-G-full.png"));
    await sleep(6000);
    ok("…and nobody inside still lists them", !(await sees(A, "G")) && !(await sees(C, "G")), await listed(A));

    // Closing the tab (or the window it is alone in).
    await F.closeTab();
    const tF = await goneAfter(A, "F", 20000);
    ok(`closing the tab: gone from the others at once (${tF}s)`, tF <= 3, tF);

    // A browser killed with no goodbye.
    E.kill();
    const tE = await goneAfter(A, "E", 60000);
    ok(`a killed browser: gone from the others in ${tE}s`, tE <= 15, tE);

    // Walking off to another page.
    await B.goto("about:blank");
    const tB = await goneAfter(A, "B", 20000);
    ok(`leaving for another page: gone at once (${tB}s)`, tB <= 3, tB);

    // Now there is room: the seventh gets in on their own.
    await until("G gets in after the room empties", async () => (await status(G)) === "ready", 45000);
    await until("A sees G", () => sees(A, "G"), 15000);
    ok("the one turned away gets in by themselves once there is room", true);
    const left = await A.evaluate(`${T}.lines()`);
    ok("A's voice lines follow who is left (C and D)", left === 2, left);
    ok("D still hears everybody left in voice", !!(await flowing(D)));
  }
} catch (e) {
  ok("the run finished", false, e.message);
} finally {
  for (const X of all) if (X.logs.length) console.log(`  ${X.label} page errors:\n    ${[...new Set(X.logs)].join("\n    ")}`);
  for (const X of all) X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
