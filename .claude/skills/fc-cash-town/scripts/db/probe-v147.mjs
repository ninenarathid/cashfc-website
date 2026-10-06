// A read-only look at the live database for v147 (pests come a little oftener to a farm with insects on it). Touches
// nothing; prints no key, no name and no id.
//   node probe-v147.mjs before     before the owner runs the file: v145 has run (the farm's row has `rids`), and the
//                                  live `farming` row is what the file writes but for its three entries
//   node probe-v147.mjs            after: the row is the file's to the entry, written alone and no row since; the
//                                  hours' table is there and closed, the rules are nobody's to ask from outside; and
//                                  the hours counted so far, one by one (an hour is counted by the first look at the
//                                  farm in it: none are there until somebody has been to the farm in the pests' hours)
import fs from "node:fs";
const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 700))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (the file while it is in supabase/, the draft beside this script before that, its copy afterwards)
const inRepo = fs.existsSync(`${repo}/supabase`) ? fs.readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v147_")) : null;
const beside = (name) => new URL(`./${name}`, import.meta.url);
const seed = fs.readFileSync(inRepo ? `${repo}/supabase/${inRepo}` : fs.existsSync(beside("v147_draft.sql")) ? beside("v147_draft.sql") : beside("v147.seed.sql"), "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (a, b) => { const x = flat(a), y = flat(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => x[k] !== y[k]).map((k) => `${k}: ${x[k]} → ${y[k]}`); };
const THREE = ["pests.swarm.some: undefined → 1", "pests.swarm.many: undefined → 4", "pests.swarm.adds: undefined → [0.01,0.02]"];
const anon = async (path, init = {}) => { const r = await fetch(`${URL_}${path}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(init.headers ?? {}) } }); return { status: r.status, body: (await r.text()).slice(0, 200) }; };

ok("the file's block names one row, the farm's", same(Object.keys(want), ["farming"]), Object.keys(want));
const f = live.farming?.data ?? {};
if (BEFORE) {
  ok("v145 has run: the farm's row says which insects eat pests, and that the pest cure keeps a plant a day", same(f.rids, { ladybird: 0.5, mantis: 0.7 }) && same(f.cures, { pestCure: 24 }), { rids: f.rids, cures: f.cures });
  const moved = differ(f, want.farming);
  ok("the live `farming` row is what the file writes but for its own three entries", same([...moved].sort(), [...THREE].sort()), moved.slice(0, 8));
  console.log(`    (last written ${live.farming?.updated_at})`);
  const r = await anon(`/rest/v1/town_swarms?select=hour&limit=1`);
  ok("the hours' table is not there yet", r.status === 404 || /PGRST205|42P01|does not exist|Could not find/.test(r.body), r);
} else {
  ok("the live `farming` row is what the file writes, to the entry", same(f, want.farming), differ(f, want.farming).slice(0, 8));
  ok("three in a hundred, and one or two more where the farm had some insects or many (one, and four)", same(f.pests, { from: 8, to: 18, chance: 0.03, kills: 6, swarm: { some: 1, many: 4, adds: [0.01, 0.02] } }), f.pests);
  const at = live.farming?.updated_at, later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key);
  ok("it was written alone, and no row of the catalog since", same(later, ["farming"]), { at, later });
  let r = await anon(`/rest/v1/town_swarms?select=hour&limit=1`);
  ok("the hours are not read from outside", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  r = await anon(`/rest/v1/town_swarms`, { method: "POST", body: JSON.stringify({ hour: 1, bugs: 0, noted: 0 }) });
  ok("…nor written", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  r = await anon(`/rest/v1/rpc/town_farm`, { method: "POST", body: JSON.stringify({ p_since: 0 }) });
  ok("somebody signed out is not shown the farm, and counts no hour by asking", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  for (const [fn, body] of [["farm_bugs", { p_now: 0 }], ["swarm_note", { p_now: 0 }], ["swarms_told", { p_since: 0 }], ["pest_at", { p_key: "0,0", p_plant: {}, p_now: 0 }]]) {
    r = await anon(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
    ok(`the rule \`${fn}\` is not to be asked from outside`, r.status === 404 || /PGRST202|42501/.test(r.body), r);
  }
  // the hours counted so far, by Bangkok's clock: each by the first look at the farm in it
  const hours = await get(`/rest/v1/town_swarms?select=hour,bugs,noted&order=hour.desc&limit=60`);
  if (!Array.isArray(hours)) console.log(`\n  (the hours could not be read: ${JSON.stringify(hours).slice(0, 160)})`);
  else {
    ok("every hour counted is one of the pests' (eight to six, Bangkok), counted within itself, with a number of insects the farm can have", hours.every((x) => { const hod = (((Number(x.hour) * 3600000 + 25200000) % 86400000) + 86400000) % 86400000 / 3600000; return hod >= 8 && hod < 18 && Math.floor(Number(x.noted) / 3600000) === Number(x.hour) && x.bugs >= 0 && x.bugs <= 15; }), hours.slice(0, 3));
    console.log(`\n  hours counted so far: ${hours.length}${hours.length === 60 ? " and more" : ""} (none ${hours.filter((x) => x.bugs === 0).length}, some ${hours.filter((x) => x.bugs >= 1 && x.bugs < 4).length}, many ${hours.filter((x) => x.bugs >= 4).length})`);
    for (const x of hours.slice(0, 20)) console.log(`    ${new Date(Number(x.hour) * 3600000 + 25200000).toISOString().slice(0, 13).replace("T", " ")}:00  ${String(x.bugs).padStart(2)} insects   counted at :${new Date(Number(x.noted) + 25200000).toISOString().slice(14, 19)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
