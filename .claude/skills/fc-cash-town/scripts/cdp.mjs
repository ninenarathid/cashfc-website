// Headless Chrome over the DevTools protocol, for the town check scripts: `browser(label, size)` gives a page with
// `goto`, `evaluate`, `shot`, `send` and `close`; `until(label, fn, ms)` waits for something to come true.
// `page.tab(label)` opens another tab of the same browser: the same localStorage, its own sessionStorage, so a second
// tester who shares what the trial keeps for the whole browser (the farm, the well, the pots).
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A page of a browser, by its DevTools socket. */
async function attach(label, url, size) {
  const ws = new WebSocket(url);
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
  await send("Emulation.setDeviceMetricsOverride", { width: size.width, height: size.height, deviceScaleFactor: size.dpr ?? 1, mobile: !!size.mobile });
  // (a tab that is not in front still draws and keeps its timers: the checks need both tabs alive)
  await send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
  const evaluate = async (expr, gesture = false) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  // What the page threw and nobody caught. (The checks ask `X.errors`, some as a list and one as a function: it is both.
  // It was neither until 2026-10-07, so "no page errors" passed whatever the page did.)
  const errors = () => logs.filter((l) => l.startsWith("exception:"));
  Object.defineProperty(errors, "length", { get: () => errors().length });
  errors.toJSON = () => errors();
  return {
    label, logs, errors, send, evaluate, ws,
    async goto(to) { await send("Page.navigate", { url: to }); },
    async shot(file) { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(file, Buffer.from(s.data, "base64")); },
    /** Close the tab the way a person does (✕): the page gets to say goodbye. */
    async closeTab() { await send("Page.close").catch(() => {}); },
  };
}

/** `flags`: more of Chrome's own switches, for a check that needs a browser unlike a member's (town-fps: a fast screen). */
export async function browser(label, size = { width: 1280, height: 860 }, flags = []) {
  const profile = mkdtempSync(join(tmpdir(), `town-${label}-`));
  const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...flags, "about:blank"], { stdio: "ignore" });
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); }
  }
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  const page = await attach(label, target.webSocketDebuggerUrl, size);
  const tabs = [];
  return {
    ...page,
    /** Another tab of this browser: the same storage for the site, its own session. */
    async tab(name, tabSize = size) {
      const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
      const other = await attach(name, t.webSocketDebuggerUrl, tabSize);
      tabs.push(other);
      return other;
    },
    /**
     * Another window of this browser: the same storage for the site, its own session, and **drawn as often as the
     * first** (of two tabs of one window only the one in front is: the other gets a frame now and then, which is
     * enough to stand about in but not to play a game for two in: town-handing).
     */
    async window(name, winSize = size) {
      const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const b = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((r) => (b.onopen = r));
      const made = new Promise((r) => (b.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id === 1) r(m.result); }));
      b.send(JSON.stringify({ id: 1, method: "Target.createTarget", params: { url: "about:blank", newWindow: true } }));
      const { targetId } = await made;
      try { b.close(); } catch {}
      const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((p) => p.id === targetId);
      const other = await attach(name, t.webSocketDebuggerUrl, winSize);
      tabs.push(other);
      return other;
    },
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
    close() {
      for (const t of [page, ...tabs]) { try { t.ws.close(); } catch {} }
      try { proc.kill(); } catch {}
      setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
    },
  };
}

export async function until(label, fn, ms, every = 500) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e.message; }
    await sleep(every);
  }
  throw new Error(`${label} timed out (last: ${JSON.stringify(last)?.slice(0, 300)})`);
}
export const status = (X) => X.evaluate("window.__cashTown?.status?.() ?? null");
