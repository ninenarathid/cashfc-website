// A read-only look at the live database after v131 (an insect caught is gone for everybody and comes back elsewhere;
// the common insects fetch less): the `insects` and `items` rows are what the file writes, to the entry; the
// relatives' usual amount of an insect; where insects come back is there and closed; nobody signed out may ask what is
// out or catch; the new rules are not to be asked from outside. Then what the town has made of it so far, as counts.
// Touches nothing; prints no key, no name, no id.
//   node probe-v131.mjs
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
  const there = fs.readdirSync(`${REPO}/supabase`).find((f) => f.startsWith("v131_"));
  if (there) return fs.readFileSync(`${REPO}/supabase/${there}`, "utf8");
  const name = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=", "--name-only", "--", "supabase/v131_*.sql"], { encoding: "utf8" }).trim().split("\n")[0];
  if (!name) throw new Error("v131 is neither in supabase/ nor in history yet");
  const commit = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=%H", "-1", "--", name], { encoding: "utf8" }).trim();
  return execFileSync("git", ["-C", REPO, "show", `${commit}:${name}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
})().replace(/\r\n/g, "\n");
const want = {};
for (const m of FILE.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const cat = await get(`/rest/v1/town_catalog?select=key,data,updated_at&key=in.(insects,items)`);
const live = Object.fromEntries((cat.body ?? []).map((r) => [r.key, r]));
ok("the file's block names two rows, the insects' and the things'", same(Object.keys(want).sort(), ["insects", "items"]), Object.keys(want));
if (!live.insects?.data?.comeback) {
  console.log("\n  v131 has not run yet: the live insects' row says nothing of coming back. Nothing more to look at.");
} else {
  for (const key of ["insects", "items"]) ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), Object.keys(want[key] ?? {}).filter((k) => !same(live[key]?.data?.[k], want[key][k])).slice(0, 8));
  const d = live.insects.data, it = live.items.data;
  ok("an insect is one member's, and comes back half a minute on where two minutes of a turn are left", Object.values(d.kinds).every((k) => k.shares === 1) && same(d.comeback, { after: 30, least: 120 }), { kinds: d.kinds, comeback: d.comeback });
  ok("the common insects fetch less, the rare ones what they did", it.ladybird.pays === 2 && it.butterflyWhite.pays === 2 && it.cicada.pays === 5 && it.stickInsect.pays === 5 && it.glassDragonfly.pays === 60 && it.herculesBeetle.pays === 150,
    { ladybird: it.ladybird.pays, cicada: it.cicada.pays, glass: it.glassDragonfly.pays, hercules: it.herculesBeetle.pays });
  const knob = await get(`/rest/v1/town_knobs?select=key,value&key=eq.market_bug`);
  console.log(`  (the relatives' usual amount of an insect: ${knob.body?.[0]?.value} coins a head a round; the file turns it to 7 only from the 10 it was seeded with)`);
  ok("the knob is there", knob.status === 200 && knob.body?.length === 1 && Number(knob.body[0].value) > 0, knob.body);
  const backs = await get(`/rest/v1/town_comebacks?select=haunt,turn,bug,from_ms&order=from_ms.desc`);
  ok("where insects come back is there, and the site's key reads it", backs.status === 200 && Array.isArray(backs.body), backs.status);
  const anon = await get(`/rest/v1/town_comebacks?select=haunt`, ANON);
  ok("somebody signed out reads nothing of it", anon.status >= 400 || (Array.isArray(anon.body) && anon.body.length === 0), { status: anon.status, n: anon.body?.length });
  for (const [fn, args] of [["town_bugs", {}], ["town_net", { p_haunt: 0, p_x: 0, p_y: 0 }]]) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => ({}));
    ok(`somebody signed out is refused ${fn}`, r.status === 401 || r.status === 403 || j.code === "42501", { status: r.status, code: j.code });
  }
  for (const [fn, args] of [["comeback", { p_haunt: 0, p_now: 0, p_backs: [], p_r1: 0.5, p_r2: 0.5, p_r3: 0.5 }], ["bug_here", { p_haunt: 0, p_now: 0, p_backs: [] }], ["backs_now", { p_now: 0 }]]) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify(args) });
    ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
  }
  // what the town has made of it so far (counts only)
  const deeds = await get(`/rest/v1/town_deeds?select=thing,doc,at,member_id&what=eq.net&order=id.desc`);
  if (Array.isArray(deeds.body) && Array.isArray(backs.body)) {
    const since = deeds.body.filter((x) => x.at >= live.insects.updated_at);
    console.log(`\n  since it ran (${live.insects.updated_at}): ${since.length} catches by ${new Set(since.map((x) => x.member_id)).size} members; ${since.filter((x) => x.doc?.next !== undefined).length} brought one back, ${since.filter((x) => x.doc?.back).length} were of one that had come back`);
    console.log(`  lines of where insects come back kept now: ${backs.body.length} (thrown away after six hours)`);
    console.log(`  catches written down in all: ${deeds.body.length}, at ${new Set(deeds.body.map((x) => x.doc?.haunt)).size} haunts`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
