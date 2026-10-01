// Who gets into Cash Town's room since v102, tried for real on production.
//   · signed in but unverified: told no name, refused even with the name,
//     cannot post into anybody's letterbox;
//   · verified (not admin): told the name, let into the room and their own
//     letterbox, refused somebody else's letterbox, can post into it;
//   · anon: told no name; a public channel of the same name hears nothing.
// Three throwaway accounts, deleted in finally. Never prints the room's name,
// a key or a token.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const require = createRequire(`${REPO}/package.json`);
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/)
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d).slice(0, 300)}`); };
const subscribe = (ch) => new Promise((res) => {
  const t = setTimeout(() => res({ status: "NO_ANSWER", err: null }), 15000);
  ch.subscribe((status, err) => {
    if (status !== "SUBSCRIBED" && status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") return;
    clearTimeout(t);
    res({ status, err: err?.message ?? null });
  });
});

const made = [];
const clients = [];

/** A throwaway account, signed in; verified means a proved character. */
async function member(tag, verified) {
  const email = `town-iso-${tag}-${Date.now()}@example.com`;
  const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: svc, body: JSON.stringify({ email, email_confirm: true }) })).json();
  if (!u.id) throw new Error(`create ${tag} failed`);
  made.push(u.id);
  if (verified) {
    const p = await fetch(`${URL_}/rest/v1/profiles?id=eq.${u.id}`, { method: "PATCH", headers: { ...svc, Prefer: "return=minimal" },
      body: JSON.stringify({ is_admin: false, character_id: 900000110 + made.length, character_name: `Town Iso ${tag}`, character_verified_at: new Date().toISOString() }) });
    if (!p.ok) throw new Error(`profile ${tag}: ${p.status}`);
  }
  const link = await (await fetch(`${URL_}/auth/v1/admin/generate_link`, { method: "POST", headers: svc, body: JSON.stringify({ type: "magiclink", email }) })).json();
  const session = await (await fetch(`${URL_}/auth/v1/verify`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: link.properties?.hashed_token ?? link.hashed_token }) })).json();
  if (!session.access_token) throw new Error(`no session for ${tag}`);
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  await c.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  await c.realtime.setAuth(session.access_token);
  clients.push(c);
  return { id: u.id, c };
}

try {
  const room = await (await fetch(`${URL_}/rest/v1/town_rooms?select=topic&id=eq.main`, { headers: svc })).json();
  const topic = room[0]?.topic;
  if (!topic) throw new Error("no room row");
  const box = (id) => `${topic}:u:${id}`;

  // ── anon ──
  const r = await fetch(`${URL_}/rest/v1/rpc/town_topic`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
  const body = await r.json().catch(() => ({}));
  ok("anon is told no name", r.status === 401 || r.status === 403 || body.code === "42501" || body === null, { status: r.status, code: body?.code });

  const V1 = await member("V1", true);
  const V2 = await member("V2", true);
  const U = await member("U", false);

  // ── unverified ──
  const askedU = await U.c.rpc("town_topic");
  ok("signed in but unverified: told no name", !askedU.error && askedU.data === null, askedU);
  const sneak = await subscribe(U.c.channel(topic, { config: { private: true } }));
  ok("unverified, even with the name: refused the room", sneak.status !== "SUBSCRIBED", sneak);

  // ── verified ──
  const askedV = await V1.c.rpc("town_topic");
  ok("verified member (not admin): told the name", !askedV.error && askedV.data === topic, { error: askedV.error, same: askedV.data === topic });
  const roomCh = V1.c.channel(topic, { config: { private: true } });
  const inRoom = await subscribe(roomCh);
  ok("verified member: let into the room", inRoom.status === "SUBSCRIBED", inRoom);

  const got = [];
  const mine = V1.c.channel(box(V1.id), { config: { private: true } });
  mine.on("broadcast", { event: "rtc" }, (m) => got.push(m.payload));
  const ownBox = await subscribe(mine);
  ok("verified member: can open their own letterbox", ownBox.status === "SUBSCRIBED", ownBox);

  const peek = await subscribe(V2.c.channel(box(V1.id), { config: { private: true } }));
  ok("another member cannot open somebody else's letterbox", peek.status !== "SUBSCRIBED", peek);

  const post = await V2.c.channel(box(V1.id), { config: { private: true } }).httpSend("rtc", { from: V2.id, data: { probe: "v2" } }).catch((e) => ({ error: e.message }));
  await sleep(2000);
  ok("…but can post into it, and it arrives", post?.success === true && got.some((p) => p?.data?.probe === "v2"), { post, got: got.length });

  const postU = await U.c.channel(box(V1.id), { config: { private: true } }).httpSend("rtc", { from: U.id, data: { probe: "u" } }).catch((e) => ({ error: e.message }));
  await sleep(2000);
  ok("an unverified account cannot post into a letterbox", postU?.success !== true && !got.some((p) => p?.data?.probe === "u"), { postU, got: got.length });

  // ── a public channel of the same name ──
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  clients.push(anon);
  const heard = [];
  const eaves = anon.channel(topic, { config: { private: false } });
  eaves.on("broadcast", { event: "mv" }, (m) => heard.push(m));
  await subscribe(eaves);
  // The member who is in the room talks in it; the room's own listener (V2)
  // proves the words went out.
  const v2room = V2.c.channel(topic, { config: { private: true } });
  const inside = [];
  v2room.on("broadcast", { event: "mv" }, (m) => inside.push(m));
  await subscribe(v2room);
  for (let i = 0; i < 3; i++) { await roomCh.send({ type: "broadcast", event: "mv", payload: { id: V1.id, x: i, y: i } }); await sleep(300); }
  await sleep(2500);
  ok("a member in the room hears it (the words went out)", inside.length >= 1, { inside: inside.length });
  ok("a public listener on the same name hears nothing from the room", heard.length === 0, { heard: heard.length });
} catch (e) {
  ok("the run finished", false, e.message);
} finally {
  for (const c of clients) { try { await c.removeAllChannels(); } catch {} }
  for (const id of made) {
    const r = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svc });
    console.log(`  cleanup: throwaway ${id.slice(0, 8)}… deleted ${r.ok ? "✓" : `✗ ${r.status}`}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
