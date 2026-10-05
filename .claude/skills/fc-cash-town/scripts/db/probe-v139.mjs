// A read-only look at the live database for v139 (hunted, an insect grows scarce). Touches nothing; prints no key,
// no name and no id.
//   node probe-v139.mjs before     before the owner runs the file: the live `insects` row is what the file writes but
//                                  for `scarce` (and, while v138 has not run, the ladybird's four entries)
//   node probe-v139.mjs            after: the row is the file's to the entry, written alone; the rule is nobody's to
//                                  ask from outside; and how plentiful each kind is now, worked out here from the
//                                  catches the way the rule works it out
import fs from "node:fs";
const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 700))}`); };
const get = async (path) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(rows)) return rows;
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
};
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (the file while it is in supabase/, the draft beside this script before that, its copy afterwards)
const inRepo = fs.existsSync(`${repo}/supabase`) ? fs.readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v139_")) : null;
const beside = (name) => new URL(`./${name}`, import.meta.url);
const seed = fs.readFileSync(inRepo ? `${repo}/supabase/${inRepo}` : fs.existsSync(beside("v139_draft.sql")) ? beside("v139_draft.sql") : beside("v139.seed.sql"), "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (a, b) => { const x = flat(a), y = flat(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => x[k] !== y[k]).map((k) => `${k}: ${x[k]} → ${y[k]}`); };
const d = live.insects?.data ?? {};
const SCARCE = want.insects?.scarce ?? { day: 24, half: 20 };

/** How plentiful a kind is at a moment, from the catches as they are written down: lib/town/insects.ts's plentyOf. */
const catches = await get(`/rest/v1/town_deeds?select=at,thing,n&what=eq.net&at=gte.${encodeURIComponent(new Date(Date.now() - 25 * 3_600_000).toISOString())}&order=id`);
const plenty = (bug, at) => {
  const day = SCARCE.day * 3_600_000;
  let against = 0;
  for (const c of catches) { const ms = Date.parse(c.at); if (c.thing === bug && ms < at && ms > at - day) against += Number(c.n) * (day - (at - ms)); }
  return (SCARCE.half * day) / (SCARCE.half * day + against);
};
const table = () => {
  const now = Date.now(), kinds = Object.keys(d.bugs ?? {});
  const lines = kinds.map((bug) => ({ bug, caught: catches.filter((c) => c.thing === bug).reduce((s, c) => s + Number(c.n), 0), plenty: plenty(bug, now) })).filter((x) => x.caught > 0).sort((a, b) => a.plenty - b.plenty);
  console.log(`\n  caught in the day, and how plentiful each kind is by the rule now (1: as its haunts roll it):`);
  for (const x of lines) console.log(`    ${x.bug.padEnd(16)} ${String(x.caught).padStart(4)}   ${x.plenty.toFixed(2)}`);
  console.log(`    (${kinds.length - lines.length} kinds with none caught: 1.00)`);
};

ok("the file's block names one row, the insects'", same(Object.keys(want), ["insects"]), Object.keys(want));
if (BEFORE) {
  const moved = differ(d, want.insects), scarce = ["scarce.day: undefined → 24", "scarce.half: undefined → 20"];
  const ladybird = ["bugs.ladybird.weight: 60 → 6", 'bugs.ladybird.places: ["farm","town"] → undefined', "bugs.ladybird.hours: [[5,18]] → [[6,18]]", "bugs.ladybird.dry: undefined → true"];
  const v138 = d.bugs?.ladybird?.weight === 6;
  ok(v138 ? "v138 has run: the live row is what the file writes but for `scarce`" : "v138 has not run: the live row is what the file writes but for `scarce` and the ladybird's four entries",
    same([...moved].sort(), [...scarce, ...(v138 ? [] : ladybird)].sort()), moved.slice(0, 8));
  ok("the catches are there to read: a line for each, with its insect and its moment", Array.isArray(catches) && catches.every((c) => typeof c.thing === "string" && !Number.isNaN(Date.parse(c.at))), Array.isArray(catches) ? catches.length : catches);
  console.log(`\n  the catalog has ${rows.length} rows; ${Array.isArray(catches) ? catches.length : 0} catches in the last 25 hours`);
  if (Array.isArray(catches)) table();
} else {
  ok("the live `insects` row is what the file writes, to the entry", same(d, want.insects), differ(d, want.insects).slice(0, 8));
  ok("a catch counts for a day, and twenty counting halve a kind", same(d.scarce, { day: 24, half: 20 }), d.scarce);
  ok("a ladybird weighs 6 still; twenty-four insects", d.bugs?.ladybird?.weight === 6 && Object.keys(d.bugs ?? {}).length === 24, d.bugs?.ladybird);
  const at = live.insects?.updated_at, later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key);
  ok("it was written alone, and no row of the catalog since", same(later, ["insects"]), { at, later });
  const anon = async (fn, body) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 200) }; };
  let r = await anon("plenty", { p_bug: "dragonfly", p_at: Date.now() });
  ok("how plentiful a kind is, is not to be asked from outside", r.status === 404 || /PGRST202|42501/.test(r.body), r);
  r = await anon("town_bugs", {});
  ok("somebody signed out is not told what is out", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  r = await fetch(`${URL_}/rest/v1/town_deeds?select=id&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  const body = await r.text();
  ok("…nor reads the catches", r.status === 401 || r.status === 403 || /42501|permission denied/.test(body) || body === "[]", { status: r.status, body: body.slice(0, 120) });
  if (Array.isArray(catches)) {
    table();
    // what the village has made of it since: the catches by the hour, before the file and after
    const since = catches.filter((c) => Date.parse(c.at) >= Date.parse(at)), hours = Math.max(0.01, (Date.now() - Date.parse(at)) / 3_600_000);
    const before = catches.filter((c) => Date.parse(c.at) < Date.parse(at) && Date.parse(c.at) >= Date.parse(at) - 4 * 3_600_000);
    console.log(`\n  since (${hours.toFixed(1)} h): ${since.length} catches, ${(since.length / hours).toFixed(1)} an hour; in the four hours before: ${(before.length / 4).toFixed(1)} an hour`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
