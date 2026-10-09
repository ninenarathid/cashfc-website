// Staying in Cash Town while looking at other pages, and typing to each other.
// Two headless Chromes with fake microphones on the dev test room.
//   node town-stay.mjs <base> <outdir>
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
  const profile = mkdtempSync(join(tmpdir(), `stay-${label}-`));
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
    goto: (url) => send("Page.navigate", { url }),
    reload: () => send("Page.reload"),
    shot: async (file) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(s.data, "base64")); },
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

const T = "window.__cashTown";
const DOCK = `document.querySelector('[role=region][aria-label="Cash Town"]')`;
// (the microphone is offered in a little tray since 2026-10-09: a tap on its button, then the button with the words)
const press = `(async () => { const find = () => [...document.querySelectorAll("button")].find(x => /เปิดไมค์|Turn mic on/.test(x.textContent)); let b = find(); if (!b) { document.querySelector("[data-town-mic=off]")?.click(); await new Promise((r) => setTimeout(r, 400)); b = find(); } if (!b || b.disabled) return false; b.click(); return true; })()`;
// (by id once both are in: somebody else may be in the dev test room under the same letter, the owner trying things out)
const ID = {};
const other = (X, who) => X.evaluate(`${T}?.people?.().find(p => ${ID[who] ? `p.id === ${JSON.stringify(ID[who])}` : `p.name.endsWith(" ${who}")`}) ?? null`);
const flowing = async (X) => {
  const before = await X.evaluate(`${T}.voice()`);
  await sleep(2500);
  const after = await X.evaluate(`${T}.voice()`);
  return after.length > 0 && after.every((l) => l.state === "connected" && l.bytesIn > (before.find((b) => b.id === l.id)?.bytesIn ?? 0)) ? after : false;
};
/** Type into the page's chat box (the town's, or the dock's) and send. */
const type = async (X, text) => {
  await X.evaluate(`document.querySelector('input[enterkeyhint="send"]').focus()`);
  await X.send("Input.insertText", { text });
  await X.evaluate(`document.querySelector('input[enterkeyhint="send"]').form.requestSubmit()`);
};
const heard = (X, text) => X.evaluate(`(${T}?.chatLog?.() ?? []).some(l => l.text === ${JSON.stringify(text)})`);

const A = await browser("A"), B = await browser("B");
try {
  await A.goto(`${BASE}/town?townTest=A&townRoom=check`);
  await B.goto(`${BASE}/town?townTest=B&townRoom=check`);
  await until("A ready", () => A.evaluate(`${T}?.status?.() === "ready"`), 120000);
  await until("B ready", () => B.evaluate(`${T}?.status?.() === "ready"`), 60000);
  ID.A = await A.evaluate(`${T}.me().id`);
  ID.B = await B.evaluate(`${T}.me().id`);
  await until("each sees the other", async () => (await other(A, "B")) && (await other(B, "A")), 20000);
  ok("A and B are in town", true);
  ok("both turn their mic on", (await A.evaluate(press, true)) && (await B.evaluate(press, true)));
  await until("voice up", async () => (await flowing(A)) && (await flowing(B)), 40000, 1000);
  ok("they hear each other", true);

  // ── typing ──
  await type(A, "สวัสดี B มาตีบอสกันไหม");
  await until("B reads A's line", () => heard(B, "สวัสดี B มาตีบอสกันไหม"), 5000);
  ok("A types, and B reads it", true);
  ok("B sees it under the map too", await B.evaluate(`document.body.innerText.includes("สวัสดี B มาตีบอสกันไหม")`));
  await B.shot(join(OUT, "stay-B-chat.png"));

  // ── another page, same tab ──
  const stay = await A.evaluate(`${T}.session`);
  await A.evaluate(`[...document.querySelectorAll('a[href="/members"]')][0].click()`, true);
  await until("A is on /members", () => A.evaluate(`location.pathname === "/members"`), 15000);
  await until("the dock shows", () => A.evaluate(`!!${DOCK}`), 15000);
  ok("A opens another page: the dock shows", true);
  ok("…and it is the same stay (nothing reconnected)", (await A.evaluate(`${T}.session`)) === stay);
  await until("B sees A away", async () => (await other(B, "A"))?.away === true, 5000);
  ok("B sees A as on another page, still in town", true);
  ok("voice keeps flowing both ways", !!(await flowing(A)) && !!(await flowing(B)));
  await A.shot(join(OUT, "stay-A-dock.png"));

  await sleep(800);
  await type(B, "มาๆ ไปตีบอส");
  await until("A gets it in the dock", () => A.evaluate(`${T}.unread() === 1`), 5000);
  ok("B types: A's dock counts it as new", true);
  ok("…and shows the line", await A.evaluate(`${DOCK}.innerText.includes("มาๆ ไปตีบอส")`));
  await A.evaluate(`${DOCK}.querySelector('button[aria-expanded]').click()`, true);
  await until("the chat opens", () => A.evaluate(`!!${DOCK}.querySelector("form")`), 3000);
  ok("opening the dock's chat reads it", await A.evaluate(`${T}.unread() === 0`));
  await type(A, "โอเค เดี๋ยวไป");
  await until("B reads the reply", () => heard(B, "โอเค เดี๋ยวไป"), 5000);
  ok("A replies from the dock, and B reads it", true);
  await A.shot(join(OUT, "stay-A-dock-chat.png"));

  // ── back to the map ──
  await A.evaluate(`${DOCK}.querySelector('a[href="/town"]').click()`, true);
  await until("A is back on the map", () => A.evaluate(`location.pathname === "/town" && !!document.querySelector("canvas")`), 15000);
  ok("back to the map from the dock: the same stay", (await A.evaluate(`${T}.session`)) === stay);
  await until("B sees A looking again", async () => (await other(B, "A"))?.away === false, 5000);
  ok("B sees A back on the map", true);

  // ── a reload ──
  const before = Date.now();
  await A.reload();
  let vanished = false;
  for (let i = 0; i < 20 && !vanished; i++) { if (!(await other(B, "A"))) vanished = true; else await sleep(150); }
  await until("A is back after the reload", async () => (await A.evaluate(`${T}?.status?.()`)) === "ready", 30000);
  await until("B sees A again", async () => !!(await other(B, "A")), 15000);
  ok(`A reloads the town: back in by themselves (${((Date.now() - before) / 1000).toFixed(1)}s)`, true);
  ok("…with the microphone back on", await A.evaluate(`${T}.me().voice === true`));
  await until("voice after the reload", async () => (await flowing(A)) && (await flowing(B)), 40000, 1000);
  ok("…and the voice flows again", true);

  // ── a reload on another page ──
  await A.evaluate(`[...document.querySelectorAll('a[href="/gallery"]')][0].click()`, true);
  await until("A on /gallery", () => A.evaluate(`location.pathname === "/gallery"`), 15000);
  await A.reload();
  await until("the dock comes back by itself", () => A.evaluate(`!!${DOCK} && ${T}?.status?.() === "ready"`), 30000);
  ok("a reload on another page: the dock puts A back in town", true);
  await until("B sees A again, away", async () => (await other(B, "A"))?.away === true, 15000);
  ok("…and B sees A, on another page", true);
  await until("voice on the other page", async () => (await flowing(A)) && (await flowing(B)), 40000, 1000);
  ok("…still talking", true);

  // ── leaving ──
  await A.evaluate(`${DOCK}.querySelector('button[aria-label="ออกจากเมือง"]').click()`, true);
  const t0 = Date.now();
  await until("B stops listing A", async () => !(await other(B, "A")), 5000, 100);
  ok(`A leaves from the dock: gone from B's town in ${((Date.now() - t0) / 1000).toFixed(2)}s`, Date.now() - t0 < 2000);
  ok("…and the dock is gone", await A.evaluate(`!${DOCK}`));
  await A.reload();
  await sleep(5000);
  ok("a reload after leaving does not walk A back in", !(await A.evaluate(`!!${DOCK}`)) && !(await other(B, "A")));
} catch (e) {
  ok("the run finished", false, e.message);
} finally {
  for (const X of [A, B]) if (X.logs.length) console.log(`  ${X.label} page errors:\n    ${[...new Set(X.logs)].join("\n    ")}`);
  A.close(); B.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
