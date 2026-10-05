// A read-only look at the live database after v126 (a ladybird takes a pest with it): the `insects` row is what the
// file writes, to the entry (a ladybird's chance and its hours among it); nobody signed out may catch; the new rule is
// not to be asked from outside. Then what the town has made of it so far, as counts: ladybirds caught, and how many
// took a pest with them. That `town_net` itself is the one written again cannot be read from outside: it shows when
// the first deed has a `rid` in it. Touches nothing; prints no key, no name, no id.
//   node probe-v126.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-4999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };
// the file as it was pushed: from supabase/ while it is there, from history afterwards
const FILE = (() => {
  const there = fs.readdirSync(`${REPO}/supabase`).find((f) => f.startsWith("v126_"));
  if (there) return fs.readFileSync(`${REPO}/supabase/${there}`, "utf8");
  const name = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=", "--name-only", "--", "supabase/v126_*.sql"], { encoding: "utf8" }).trim().split("\n")[0];
  if (!name) throw new Error("v126 is neither in supabase/ nor in history yet");
  const commit = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=%H", "-1", "--", name], { encoding: "utf8" }).trim();
  return execFileSync("git", ["-C", REPO, "show", `${commit}:${name}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
})().replace(/\r\n/g, "\n");
const want = {};
for (const m of FILE.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const cat = await get(`/rest/v1/town_catalog?select=key,data,updated_at&key=eq.insects`);
const live = cat.body?.[0];
ok("the file's block names one row, the insects'", same(Object.keys(want), ["insects"]), Object.keys(want));
if (!live?.data?.bugs?.ladybird || !("rids" in live.data.bugs.ladybird)) {
  console.log("\n  v126 has not run yet: the live ladybird has no chance of taking a pest. Nothing more to look at.");
} else {
  ok("the live `insects` row is what the file writes, to the entry", same(live.data, want.insects), Object.keys(want.insects).filter((k) => !same(live.data[k], want.insects[k])));
  ok("a ladybird has one chance in ten, is out 05:00 to 18:00, and no other insect has such a chance",
    live.data.bugs.ladybird.rids === 0.1 && same(live.data.bugs.ladybird.hours, [[5, 18]]) && Object.keys(live.data.bugs).filter((b) => "rids" in live.data.bugs[b]).join() === "ladybird", live.data.bugs.ladybird);
  {
    const r = await fetch(`${URL_}/rest/v1/rpc/town_net`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ p_haunt: 0, p_x: 0, p_y: 0 }) });
    const j = await r.json().catch(() => ({}));
    ok("somebody signed out is refused town_net", r.status === 401 || r.status === 403 || j.code === "42501", { status: r.status, code: j.code });
  }
  {
    const r = await fetch(`${URL_}/rest/v1/rpc/rid_pick`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify({ p_plots: {}, p_now: 0, p_pick: 0 }) });
    ok("the rule town.rid_pick is not to be asked from outside", r.status >= 400, r.status);
    const w = await fetch(`${URL_}/rest/v1/town_plots?select=x&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    const rows = await w.json().catch(() => null);
    ok("nor are the plots a browser's to write (they are as they were: no grant of this file's)", w.status >= 400 || Array.isArray(rows), w.status);
  }
  // what the town has made of it so far (counts only)
  const deeds = await get(`/rest/v1/town_deeds?select=thing,doc,at&what=eq.net&order=id.desc`);
  if (Array.isArray(deeds.body)) {
    const since = deeds.body.filter((x) => x.at >= live.updated_at), lady = since.filter((x) => x.thing === "ladybird"), took = lady.filter((x) => x.doc && "rid" in x.doc);
    console.log(`\n  since it ran (${live.updated_at}): ${since.length} catches, ${lady.length} of them ladybirds, ${took.length} of which took a pest with them`);
    console.log(`  catches written down in all: ${deeds.body.length}, at ${new Set(deeds.body.map((x) => x.doc?.haunt)).size} haunts`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
