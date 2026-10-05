// A read-only look at the live database after v125 (the forest, and a net for insects): the fifteen catalog rows are
// what the file writes, to the entry; the word is there, once, and no browser reads it; the village's book of insects
// is there; nobody signed out may ask what the forest has, gather, or catch; the rules are not to be asked from
// outside. Then what the town has made of it so far, as counts. Touches nothing; prints no key, no name, no id, and
// never the word.
//   node probe-v125.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const REPO = "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };
// the file as it was pushed: from supabase/ while it is there, from history afterwards
const FILE = (() => {
  const name = "supabase/v125_a_forest_and_a_net.sql";
  if (fs.existsSync(`${REPO}/${name}`)) return fs.readFileSync(`${REPO}/${name}`, "utf8");
  const commit = execFileSync("git", ["-C", REPO, "log", "--diff-filter=A", "--format=%H", "-1", "--", name], { encoding: "utf8" }).trim();
  return execFileSync("git", ["-C", REPO, "show", `${commit}:${name}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
})().replace(/\r\n/g, "\n");
const want = {};
for (const m of FILE.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const FIFTEEN = ["cooking", "dishes", "farming", "fish", "fishing", "flotsam", "forest", "goods", "hints", "insects", "items", "makes", "order", "scrolls", "shelf"];

const cat = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries((cat.body ?? []).map((r) => [r.key, r]));
ok("the file's block names fifteen rows", same(Object.keys(want).sort(), FIFTEEN), Object.keys(want).sort());
if (!live.forest) {
  console.log("\n  v125 has not run yet: the catalog has no `forest` row. Nothing more to look at.");
} else {
  for (const key of FIFTEEN) {
    ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), Object.keys(want[key] ?? {}).filter((k) => !same(live[key]?.data?.[k], want[key][k])).slice(0, 6));
  }
  const d = (key) => live[key]?.data ?? {};
  ok("the forest's places and the haunts are the code's, a net is on the first shelf, a skewer is cookware, an insect is never put in a pot",
    d("forest").spots?.length === want.forest.spots.length && d("insects").haunts?.length === want.insects.haunts.length && d("shelf").basic?.includes("bugNet") && d("goods").bugNet?.price === 35
    && d("cooking").cookware?.includes("skewer") && d("cooking").never?.includes("bug"), { spots: d("forest").spots?.length, haunts: d("insects").haunts?.length });
  ok("four insects go on a hook and five on a plant", ["caterpillar", "moth", "dragonfly", "grasshopper"].every((b) => d("fishing").baits?.includes(b))
    && ["ladybird", "mantis", "butterflyWhite", "monarch", "scarab"].every((b) => d("farming").tools?.[b]), { baits: d("fishing").baits, tools: Object.keys(d("farming").tools ?? {}).length });
  // the word: one line, and only its key is asked for here
  const word = await get(`/rest/v1/town_secrets?select=key`);
  ok("the word is there, once", word.status === 200 && same(word.body, [{ key: "wild" }]), { status: word.status, n: word.body?.length });
  for (const [who, key] of [["somebody signed out", ANON]]) {
    const s = await get(`/rest/v1/town_secrets?select=key`, key), t = await get(`/rest/v1/town_takes?select=place`, key);
    ok(`${who} reads neither the word nor who took what`, (s.status >= 400 || (Array.isArray(s.body) && s.body.length === 0)) && (t.status >= 400 || (Array.isArray(t.body) && t.body.length === 0)), { secrets: s.status, takes: t.status });
  }
  const book = await get(`/rest/v1/town_things?select=key,doc&key=eq.bugs`);
  ok("the village's book of insects is there", book.status === 200 && book.body?.length === 1 && typeof book.body[0].doc === "object", { status: book.status, n: book.body?.length });
  // nobody signed out may ask, gather or catch; the rules are in a schema no browser reaches
  for (const [fn, args] of [["town_wild", {}], ["town_bugs", {}], ["town_gather", { p_spot: 0, p_x: 0, p_y: 0 }], ["town_net", { p_haunt: 0, p_x: 0, p_y: 0 }]]) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => ({}));
    ok(`somebody signed out is refused ${fn}`, r.status === 401 || r.status === 403 || j.code === "42501", { status: r.status, code: j.code });
  }
  for (const [fn, args] of [["word", {}], ["wild_holds", { p_spot: 0, p_now: 0 }], ["bug_at", { p_haunt: 0, p_now: 0 }]]) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify(args) });
    ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
  }
  // what the town has made of it so far (counts only)
  const at = live.forest.updated_at;
  const deeds = await get(`/rest/v1/town_deeds?select=what,thing,doc&what=in.(gather,net)&order=id.desc`);
  if (Array.isArray(deeds.body)) {
    const by = (what) => deeds.body.filter((x) => x.what === what);
    const things = {};
    for (const x of deeds.body) things[x.thing] = (things[x.thing] ?? 0) + 1;
    console.log(`\n  since it ran (${at}): ${by("gather").length} gatherings, ${by("net").length} catches; with no stamina ${deeds.body.filter((x) => x.doc?.spent).length}; by thing ${JSON.stringify(things)}`);
    console.log(`  kinds in the book of insects: ${Object.keys(book.body?.[0]?.doc ?? {}).length} of ${want.insects.order.length}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
