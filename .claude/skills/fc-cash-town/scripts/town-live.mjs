// Live checks of Cash Town on production (v102: verified members).
//   node town-live.mjs anon                 the public side: town_topic refuses anon
//   node town-live.mjs full <out> [--freeze] [--crowd N]
//        throwaway VERIFIED, NON-ADMIN members walk into the private room,
//        talk, walk apart (still heard: one room), and one closes the browser
//        (gone at once). --freeze adds a tab asleep 75 s; --crowd N brings the
//        room to N members, all in voice. Every account is deleted in finally.
// Refuses to run while real members are in the room (their ears would get
// the fake microphones' beeps and the probes' avatars); --even-if-busy
// overrides that. Never prints a key, a token, a name or the room's name.
import { createRequire } from "node:module";
import { readFileSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const SITE = process.env.SITE ?? "https://cashfc-website.vercel.app";
const env = Object.fromEntries(readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/)
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = new URL(URL_).hostname.split(".")[0];
const require = createRequire(`${REPO}/package.json`);
const { createChunks } = require("@supabase/ssr/dist/main/utils/chunker.js");
const { stringToBase64URL } = require("@supabase/ssr/dist/main/utils/base64url.js");

let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 300)}`); };
const note = (s) => console.log(`  (${s})`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

async function anonChecks() {
  const r = await fetch(`${URL_}/rest/v1/rpc/town_topic`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
  const body = await r.json().catch(() => ({}));
  if (body?.code === "PGRST202") { console.log("  the town's migration has not run"); return false; }
  ok("anon is refused the room's name", r.status === 401 || r.status === 403 || body?.code === "42501", { status: r.status, code: body?.code });
  return true;
}

/** How many real members (not probes) the room lists now; listens without being listed. */
async function membersInRoom() {
  const { createClient } = require("@supabase/supabase-js");
  const room = await (await fetch(`${URL_}/rest/v1/town_rooms?select=topic&id=eq.main`, { headers: svc })).json();
  const c = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const ch = c.channel(room[0].topic, { config: { private: true, presence: { key: `watcher-${Date.now()}` } } });
  let state = {};
  ch.on("presence", { event: "sync" }, () => { state = ch.presenceState(); });
  await new Promise((r) => ch.subscribe((st) => { if (st === "SUBSCRIBED" || st === "CHANNEL_ERROR" || st === "TIMED_OUT") r(st); }));
  await sleep(4000);
  await c.removeAllChannels();
  return Object.values(state).map((m) => m[m.length - 1]?.n ?? "").filter((n) => !/^Town (Probe|Iso) /.test(n)).length;
}

const made = [];
async function makeMember(tag) {
  const email = `town-probe-${tag}-${Date.now()}@example.com`;
  const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: svc, body: JSON.stringify({ email, email_confirm: true }) })).json();
  if (!u.id) throw new Error(`create user failed: ${JSON.stringify(u).slice(0, 200)}`);
  made.push(u.id);
  const p = await fetch(`${URL_}/rest/v1/profiles?id=eq.${u.id}`, { method: "PATCH", headers: { ...svc, Prefer: "return=minimal" },
    body: JSON.stringify({ is_admin: false, character_id: 900000200 + made.length, character_name: `Town Probe ${tag}`, character_verified_at: new Date().toISOString() }) });
  if (!p.ok) throw new Error(`profile patch ${p.status} ${await p.text()}`);
  const link = await (await fetch(`${URL_}/auth/v1/admin/generate_link`, { method: "POST", headers: svc, body: JSON.stringify({ type: "magiclink", email }) })).json();
  const token_hash = link.properties?.hashed_token ?? link.hashed_token;
  const session = await (await fetch(`${URL_}/auth/v1/verify`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", token_hash }) })).json();
  if (!session.access_token) throw new Error("verify gave no session");
  const value = "base64-" + stringToBase64URL(JSON.stringify(session));
  const cookies = createChunks(`sb-${ref}-auth-token`, value).map((c) => ({ name: c.name, value: c.value, url: SITE }));
  return { id: u.id, tag, cookies };
}

async function browser(label, cookies) {
  const profile = mkdtempSync(join(tmpdir(), `town-live-${label}-`));
  const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
  let port;
  for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0; const wait = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); }
    else if (m.method === "Runtime.exceptionThrown") logs.push(`exception: ${m.params.exceptionDetails.exception?.description?.split("\n")[0]}`);
  };
  ws.onclose = () => { for (const w of wait.values()) w.no(new Error("closed")); wait.clear(); };
  const send = (method, params = {}) => new Promise((ok_, no) => {
    if (ws.readyState !== 1) return no(new Error("closed"));
    const id = ++seq; wait.set(id, { ok: ok_, no }); ws.send(JSON.stringify({ id, method, params }));
  });
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCookies", { cookies });
  await send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expr, gesture = false) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return {
    label, logs, send, evaluate, goto: (u) => send("Page.navigate", { url: u }),
    shot: async (f) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(f, Buffer.from(s.data, "base64")); },
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
    close() { try { ws.close(); } catch {} try { proc.kill(); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); },
  };
}

async function until(label, fn, ms, every = 500) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await sleep(every); }
  throw new Error(`${label} timed out (last: ${JSON.stringify(last)?.slice(0, 200)})`);
}

const T = "window.__cashTown";
const press = `(() => { const b = [...document.querySelectorAll("button")].find(x => /เปิดไมค์|Turn mic on/.test(x.textContent)); if (!b || b.disabled) return false; b.click(); return true; })()`;
const listed = async (X) => (await X.evaluate(`${T}.people()`)).filter((p) => !p.going).map((p) => p.name.split(" ").pop());
const linesUp = (X, n) => until(`${X.label} has ${n} voice lines up`, async () => {
  const s = await X.evaluate(`${T}.voice()`);
  return s.length === n && s.every((l) => l.state === "connected" && l.bytesIn > 2000) ? s : false;
}, 60000, 1000);
const flowing = async (X) => {
  const before = await X.evaluate(`${T}.voice()`);
  await sleep(3000);
  const after = await X.evaluate(`${T}.voice()`);
  return after.length > 0 && after.every((l) => l.state === "connected" && l.bytesIn > (before.find((b) => b.id === l.id)?.bytesIn ?? 0)) ? after : false;
};

async function full(out) {
  const bs = [];
  const busy = await membersInRoom();
  if (busy > 0 && !process.argv.includes("--even-if-busy")) {
    console.log(`  ${busy} member(s) are in the town now: not walking test probes with beeping microphones in on them. Try later, or --even-if-busy.`);
    return;
  }
  try {
    const a = await makeMember("A"), b = await makeMember("B");
    ok("two throwaway verified members (not admins) signed in", true);
    const A = await browser("A", a.cookies), B = await browser("B", b.cookies);
    bs.push(A, B);
    await A.goto(`${SITE}/town`); await B.goto(`${SITE}/town`);
    await until("A ready", () => A.evaluate(`${T}?.status?.() === "ready"`), 60000);
    await until("B ready", () => B.evaluate(`${T}?.status?.() === "ready"`), 60000);
    ok("both members enter the private room", true);
    await until("A sees B", async () => (await listed(A)).includes("B"), 20000);
    await until("B sees A", async () => (await listed(B)).includes("A"), 20000);
    ok("each sees the other", true);
    ok("both press the mic button", (await A.evaluate(press, true)) && (await B.evaluate(press, true)));
    await linesUp(A, 1); await linesUp(B, 1);
    ok("audio flows both ways through production", true);

    await A.evaluate(`${T}.walkTo(34, 3)`); await B.evaluate(`${T}.walkTo(60, 31)`);
    await until("A sees B far away", () => A.evaluate(`(() => { const b = ${T}.people().find(p => p.name.endsWith(" B")); return b && b.pos.x > 59; })()`), 40000);
    const far = (await A.evaluate(`${T}.voice()`))[0];
    ok("opposite corners, still heard at full volume", far?.gain === 1 && !!(await flowing(A)), far);
    await A.shot(join(out, "town-live-A.png"));

    if (process.argv.includes("--freeze")) {
      await B.send("Page.setWebLifecycleState", { state: "frozen" });
      await sleep(75000);
      await B.send("Page.setWebLifecycleState", { state: "active" });
      await until("B ready again", () => B.evaluate(`${T}.status() === "ready"`), 60000);
      await until("A sees B back", async () => (await listed(A)).includes("B"), 60000);
      ok("after a frozen tab, the private room has both again, no reload", true);
      await until("A hears B again", () => flowing(A), 60000);
      await until("B hears A again", () => flowing(B), 60000);
      ok("after a frozen tab, voice flows both ways again", true);
    }

    const n = Number(arg("--crowd") ?? 0);
    if (n > 2) {
      const extra = [];
      for (let i = 3; i <= n; i++) {
        const m = await makeMember(String.fromCharCode(64 + i));
        const X = await browser(m.tag, m.cookies);
        bs.push(X); extra.push(X);
        await X.goto(`${SITE}/town`);
      }
      const everyone = [A, B, ...extra];
      for (const X of extra) await until(`${X.label} ready`, () => X.evaluate(`${T}?.status?.() === "ready"`), 90000);
      const tags = everyone.map((X) => X.label);
      for (const X of everyone) {
        await until(`${X.label} sees the other ${n - 1} probes`, async () => {
          const l = (await listed(X)).filter((t) => tags.includes(t));
          return l.length === n - 1 ? true : l.join("");
        }, 30000);
      }
      ok(`${n} members in the private room, each sees the other ${n - 1}`, true);
      for (const X of extra) await X.evaluate(press, true);
      for (const X of everyone) await linesUp(X, n - 1);
      ok(`everybody hears everybody: ${n * (n - 1) / 2} voice lines, audio at all ${n * (n - 1)} ends`, true);
      for (const X of everyone) {
        const s = await X.evaluate(`${T}.voice()`);
        const worst = (k) => Math.max(...s.map((l) => l[k] ?? 0));
        note(`${X.label}: rtt ≤ ${worst("rtt")} ms, jitter ≤ ${worst("jitter")} ms, loss ≤ ${worst("loss")}%`);
      }
      await A.shot(join(out, "town-live-crowd.png"));
    }

    // Closing the tab: gone from the others at once.
    const t0 = Date.now();
    await B.closeTab();
    await until("A stops listing B", async () => !(await listed(A)).includes("B"), 20000, 250);
    const t = (Date.now() - t0) / 1000;
    ok(`B closes the tab: gone from A's town in ${t}s`, t <= 3, t);
  } catch (e) {
    ok("the live run finished", false, e.message);
  } finally {
    for (const X of bs) if (X.logs.length) console.log(`  ${X.label} page errors:\n    ${[...new Set(X.logs)].join("\n    ")}`);
    for (const X of bs) X.close();
    for (const id of made) {
      const r = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svc });
      console.log(`  cleanup: throwaway ${id.slice(0, 8)}… deleted ${r.ok ? "✓" : `✗ ${r.status}`}`);
    }
  }
}

const mode = process.argv[2] ?? "anon";
const ran = await anonChecks();
if (mode === "full" && ran) await full(process.argv[3] ?? ".");
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
