// A read-only look at the live catalog for v138 (few ladybirds, and anywhere). Touches nothing; prints no key, no
// name and no id.
//   node probe-v138.mjs before     before the owner runs the file: the live `insects` row is what the file writes
//                                  but for the ladybird's four entries, so the file changes nothing else
//   node probe-v138.mjs            after: the row is the file's to the entry, written alone; and the catches since
import fs from "node:fs";
const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 700))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: "0-999" } })).json();
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (the file while it is in supabase/, its copy beside this script afterwards)
const inRepo = fs.existsSync(`${repo}/supabase`) ? fs.readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v138_")) : null;
const seed = fs.readFileSync(inRepo ? `${repo}/supabase/${inRepo}` : new URL("./v138.seed.sql", import.meta.url), "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (a, b) => { const x = flat(a), y = flat(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => x[k] !== y[k]).map((k) => `${k}: ${x[k]} → ${y[k]}`); };

ok("the file's block names one row, the insects'", same(Object.keys(want), ["insects"]), Object.keys(want));
const NEW = { n: [1, 1], at: ["field", "blooms"], dry: true, cost: 1, rids: 0.1, habit: "crawl", hours: [[6, 18]], weight: 6 };
const OLD = { n: [1, 1], at: ["field", "blooms"], cost: 1, rids: 0.1, habit: "crawl", hours: [[5, 18]], places: ["farm", "town"], weight: 60 };
const d = live.insects?.data ?? {};
if (BEFORE) {
  const moved = differ(d, want.insects);
  ok("the live row is what the file writes but for four entries, all the ladybird's", same([...moved].sort(), ["bugs.ladybird.weight: 60 → 6", 'bugs.ladybird.places: ["farm","town"] → undefined', "bugs.ladybird.hours: [[5,18]] → [[6,18]]", "bugs.ladybird.dry: undefined → true"].sort()), moved.slice(0, 8));
  ok("the live ladybird is as v126 and v131 left it", same(d.bugs?.ladybird, OLD), d.bugs?.ladybird);
  ok("the row was last written by v131 (2026-10-05 04:39 UTC): nobody has changed it by hand since", live.insects?.updated_at?.startsWith("2026-10-05T04:39"), live.insects?.updated_at);
  console.log(`\n  the catalog has ${rows.length} rows`);
} else {
  ok("the live `insects` row is what the file writes, to the entry", same(d, want.insects), differ(d, want.insects).slice(0, 8));
  ok("a ladybird weighs 6, keeps to no map, is out from six to six under a dry sky, and has its chance in ten still", same(d.bugs?.ladybird, NEW), d.bugs?.ladybird);
  ok("twenty-four insects, their weights 1,560; every haunt where it was", Object.keys(d.bugs ?? {}).length === 24 && Object.values(d.bugs ?? {}).reduce((s, b) => s + b.weight, 0) === 1560 && (d.haunts ?? []).length === want.insects.haunts.length, { n: Object.keys(d.bugs ?? {}).length, haunts: (d.haunts ?? []).length });
  const at = live.insects?.updated_at, later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key);
  ok("it was written alone, and no row of the catalog since", same(later, ["insects"]), { at, later });
  ok("it was written after the file was made (2026-10-05 07:40 UTC)", Date.parse(at) > Date.parse("2026-10-05T07:40:00Z"), at);
  // somebody signed out is told nothing of what is out, and the rule is nobody's to ask from outside
  const anon = async (fn, body) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 200) }; };
  let r = await anon("town_bugs", {});
  ok("somebody signed out is not told what is out", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  r = await anon("bug_at", { p_haunt: 0, p_now: 0 });
  ok("the rule of what is out is not to be asked from outside", r.status === 404 || /PGRST202|42501/.test(r.body), r);
  // what the village has made of it since (counts only): the catches, and the ladybirds among them by map and hour
  const since = await get(`/rest/v1/town_deeds?select=at,thing,doc&what=eq.net&at=gte.${encodeURIComponent(at ?? "2100-01-01")}&order=id`);
  if (Array.isArray(since)) {
    const lady = since.filter((x) => x.thing === "ladybird"), hours = Math.max(0.01, (Date.now() - Date.parse(at)) / 3_600_000);
    const by = lady.reduce((m, x) => ({ ...m, [x.doc?.map]: (m[x.doc?.map] ?? 0) + 1 }), {});
    console.log(`\n  since (${hours.toFixed(1)} h): ${since.length} catches, ${lady.length} of them ladybirds ${JSON.stringify(by)}: ${(lady.length / hours).toFixed(1)} an hour (there were five an hour before)`);
    const hr = (x) => (((Date.parse(x.at) + 7 * 3_600_000) % 86_400_000) / 3_600_000);
    // (a turn that began before the file ran is over within ten minutes of it)
    const late = lady.filter((x) => Date.parse(x.at) > Date.parse(at) + 11 * 60_000);
    if (late.length) ok("no ladybird has been caught before six in the morning or after six in the evening since", late.every((x) => hr(x) >= 6 && hr(x) < 18.2), late.map(hr).slice(0, 5));
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
