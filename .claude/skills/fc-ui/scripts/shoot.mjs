#!/usr/bin/env node
/*
 * Screenshots of pages at phone and desktop sizes, through the Chrome that is
 * already installed, over its DevTools protocol. Nothing to npm install: Node
 * 24 has fetch and WebSocket built in, and that is all this needs.
 *
 *   node shoot.mjs <url> [more urls]
 *     --sizes 360x640,390x844,1280x800   width x height, comma separated
 *     --out <dir>                        default ./shots
 *     --wait <ms>                        after load, for data and motion (1500)
 *     --reduced-motion                   emulate prefers-reduced-motion: reduce
 *     --lang th|en                       the site's language (localStorage fc_lang)
 *     --full                             the whole page, not just the viewport
 *     --dpr <n>                          device pixel ratio (1; 2 for detail)
 *     --cookies <file.json>              [{name,value,url}] set before loading,
 *                                        for a signed-in page (see fc-security
 *                                        live-probe.md for a throwaway session)
 *
 * Prints each PNG path, then any page errors, exceptions and failed requests
 * it saw, because a screen that renders over a thrown error is not finished.
 * Look at the PNGs with the Read tool.
 *
 * Why not agent-browser or Playwright: neither is installed here, and a
 * screenshot is four protocol calls.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const opt = { sizes: "360x640,390x844,1280x800", out: "shots", wait: 1500, lang: "", dpr: 1, reduced: false, full: false, cookies: "" };
const urls = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--sizes") opt.sizes = argv[++i];
  else if (a === "--out") opt.out = argv[++i];
  else if (a === "--wait") opt.wait = Number(argv[++i]);
  else if (a === "--lang") opt.lang = argv[++i];
  else if (a === "--dpr") opt.dpr = Number(argv[++i]);
  else if (a === "--cookies") opt.cookies = argv[++i];
  else if (a === "--reduced-motion") opt.reduced = true;
  else if (a === "--full") opt.full = true;
  else if (a.startsWith("--")) fail(`unknown flag ${a}`);
  else urls.push(a);
}
if (!urls.length) fail("usage: node shoot.mjs <url...> [--sizes 360x640,1280x800] [--reduced-motion] [--lang en] [--full]");

const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));
if (!chrome) fail("no Chrome found; set CHROME_PATH");

const profile = mkdtempSync(join(tmpdir(), "fc-shoot-"));
const proc = spawn(chrome, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
  "about:blank",
], { stdio: "ignore" });

const problems = [];
let ws;
try {
  // Chrome writes the port it chose into the profile folder.
  const port = await until(() => {
    try { return readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { return null; }
  }, 15000, "Chrome did not start");
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error("DevTools socket failed")); });

  let seq = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { ok, no } = waiting.get(m.id);
      waiting.delete(m.id);
      m.error ? no(new Error(`${m.error.message}`)) : ok(m.result);
    } else if (m.method) for (const l of listeners) l(m);
  };
  const send = (method, params = {}) => new Promise((ok, no) => {
    const id = ++seq;
    waiting.set(id, { ok, no });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (method, ms) => new Promise((ok, no) => {
    const t = setTimeout(() => { listeners.delete(l); no(new Error(`${method} timed out`)); }, ms);
    const l = (m) => { if (m.method === method) { clearTimeout(t); listeners.delete(l); ok(m.params); } };
    listeners.add(l);
  });

  let current = "";
  listeners.add((m) => {
    const p = m.params;
    if (m.method === "Runtime.exceptionThrown") {
      problems.push(`${current}: exception ${(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).split("\n")[0]}`);
    } else if (m.method === "Runtime.consoleAPICalled" && p.type === "error") {
      problems.push(`${current}: console.error ${p.args.map((x) => x.value ?? x.description ?? "").join(" ").slice(0, 240)}`);
    } else if (m.method === "Log.entryAdded" && (p.entry.level === "error" || p.entry.source === "security")) {
      // Messages from the browser itself, such as CSP violations (report-only included).
      problems.push(`${current}: ${p.entry.source} ${p.entry.text.slice(0, 240)}`);
    } else if (m.method === "Network.loadingFailed" && !p.canceled) {
      problems.push(`${current}: request failed ${p.errorText} (${p.type ?? "?"})`);
    } else if (m.method === "Network.responseReceived" && p.response.status >= 400) {
      problems.push(`${current}: HTTP ${p.response.status} ${p.response.url.slice(0, 160)}`);
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Log.enable");
  if (opt.reduced) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (opt.lang) await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem("fc_lang",${JSON.stringify(opt.lang)})}catch{}` });
  if (opt.cookies) await send("Network.setCookies", { cookies: JSON.parse(readFileSync(opt.cookies, "utf8")) });

  mkdirSync(opt.out, { recursive: true });
  for (const url of urls) {
    for (const size of opt.sizes.split(",")) {
      const [w, h] = size.split("x").map(Number);
      if (!w || !h) fail(`bad size ${size}`);
      const phone = w < 640;
      current = `${url} @${w}x${h}`;
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: opt.dpr, mobile: phone });
      await send("Emulation.setTouchEmulationEnabled", phone ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      const loaded = once("Page.loadEventFired", 45000);
      await send("Page.navigate", { url });
      await loaded;
      await new Promise((r) => setTimeout(r, opt.wait));

      let extra = {};
      if (opt.full) {
        const m = await send("Page.getLayoutMetrics");
        const height = Math.min(Math.ceil(m.cssContentSize.height), 16000);
        extra = { captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height, scale: 1 } };
      }
      const shot = await send("Page.captureScreenshot", { format: "png", ...extra });
      const file = join(opt.out, `${slug(url)}-${w}x${h}${opt.lang ? `-${opt.lang}` : ""}${opt.reduced ? "-rm" : ""}${opt.full ? "-full" : ""}.png`);
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      console.log(file);
    }
  }
} finally {
  try { ws?.close(); } catch {}
  proc.kill();
  // Chrome keeps the profile locked for a moment after it is told to go.
  await new Promise((r) => setTimeout(r, 400));
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s) seen:`);
  for (const p of [...new Set(problems)]) console.log(`  ${p}`);
} else {
  console.log("\nno page errors seen");
}

function slug(url) {
  try {
    const u = new URL(url);
    const path = u.protocol === "file:" ? u.pathname.split("/").pop() : `${u.hostname}${u.pathname}`;
    return path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "page";
  } catch {
    return "page";
  }
}

async function until(fn, ms, message) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(message);
}

function fail(message) {
  console.error(message);
  process.exit(2);
}
