// How many are in Cash Town's room right now, and are any of them test probes?
// Listens as the service role without tracking itself, so nobody sees it.
// Prints counts only, no names, no keys, no room name.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const require = createRequire(`${REPO}/package.json`);
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/)
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const svc = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const room = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/town_rooms?select=topic&id=eq.main`, { headers: svc })).json();
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ch = c.channel(room[0].topic, { config: { private: true, presence: { key: "watcher-" + Date.now() } } });
let state = null;
ch.on("presence", { event: "sync" }, () => { state = ch.presenceState(); });
await new Promise((r) => ch.subscribe((s) => { if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") r(s); }));
await new Promise((r) => setTimeout(r, 4000));
const people = Object.values(state ?? {}).map((m) => m[m.length - 1]?.n ?? "?");
const probes = people.filter((n) => /^Town (Probe|Iso)/.test(n)).length;
console.log(`in the room now: ${people.length} (test probes: ${probes}, members: ${people.length - probes})`);
await c.removeAllChannels();
process.exit(0);
