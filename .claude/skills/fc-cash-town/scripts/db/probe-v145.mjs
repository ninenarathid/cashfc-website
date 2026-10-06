// A read-only look at the live database for v145 (an insect that eats pests, and a cure that keeps them off). Touches
// nothing; prints no key, no name and no id.
//   node probe-v145.mjs before     before the owner runs the file: the two live rows it writes over (`farming`,
//                                  `insects`) are what the file writes but for its five entries; and what has been
//                                  put on plants so far
//   node probe-v145.mjs            after: the two rows are the file's to the entry, written together and no row since;
//                                  the rules are nobody's to ask from outside; and, once members have let insects go
//                                  on plants with pests, how often each ate one (`town_deeds`: feed, with `rid`)
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
const inRepo = fs.existsSync(`${repo}/supabase`) ? fs.readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v145_")) : null;
const beside = (name) => new URL(`./${name}`, import.meta.url);
const seed = fs.readFileSync(inRepo ? `${repo}/supabase/${inRepo}` : fs.existsSync(beside("v145_draft.sql")) ? beside("v145_draft.sql") : beside("v145.seed.sql"), "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (a, b) => { const x = flat(a), y = flat(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => x[k] !== y[k]).map((k) => `${k}: ${x[k]} → ${y[k]}`); };
const FIVE = { farming: ["rids.ladybird: undefined → 0.5", "rids.mantis: undefined → 0.7", "cures.pestCure: undefined → 24"], insects: ["bugs.ladybird.weight: 6 → 13", "bugs.mantis.weight: 22 → 50"] };

/** What has been put on plants, by what was in the hand; and for the insects that eat pests, what came of each. */
const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
const put = await get(`/rest/v1/town_deeds?select=at,what,doc&what=in.(feed,cure)&at=gte.${encodeURIComponent(since)}&order=id`);
const table = (from) => {
  if (!Array.isArray(put)) { console.log(`\n  (the deeds could not be read: ${JSON.stringify(put).slice(0, 160)})`); return; }
  const rows_ = put.filter((d) => !from || Date.parse(d.at) >= from), by = new Map();
  for (const d of rows_) { const k = `${d.what} ${d.doc?.with ?? "?"}`, row = by.get(k) ?? { n: 0, tried: 0, ate: 0 }; row.n++; if (typeof d.doc?.rid === "boolean") { row.tried++; if (d.doc.rid) row.ate++; } by.set(k, row); }
  console.log(`\n  put on plants ${from ? "since the file ran" : "in the last three days"} (${rows_.length} deeds):`);
  for (const [k, row] of [...by].sort((a, b) => b[1].n - a[1].n)) console.log(`    ${k.padEnd(24)} ${String(row.n).padStart(4)}${row.tried ? `   on a pest ${row.tried}: ate it ${row.ate}, off ${row.tried - row.ate}` : ""}`);
};

ok("the file's block names two rows, the farm's and the insects'", same(Object.keys(want).sort(), ["farming", "insects"]), Object.keys(want));
if (BEFORE) {
  for (const key of ["farming", "insects"]) {
    const moved = differ(live[key]?.data ?? {}, want[key]);
    ok(`the live \`${key}\` row is what the file writes but for its own entries (${FIVE[key].length})`, same([...moved].sort(), [...FIVE[key]].sort()), moved.slice(0, 8));
    console.log(`    (last written ${live[key]?.updated_at})`);
  }
  ok("hunted, a kind is scarce as the file leaves it: a day, and twenty to halve it", same(live.insects?.data?.scarce, { day: 24, half: 20 }) && same(want.insects?.scarce, { day: 24, half: 20 }), live.insects?.data?.scarce);
  console.log(`\n  the catalog has ${rows.length} rows`);
  table(0);
} else {
  for (const key of ["farming", "insects"]) ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), differ(live[key]?.data ?? {}, want[key]).slice(0, 8));
  const f = live.farming?.data ?? {}, i = live.insects?.data ?? {};
  ok("a ladybird eats a pest half the time, a mantis seven times in ten; the pest cure keeps a plant 24 hours", same(f.rids, { ladybird: 0.5, mantis: 0.7 }) && same(f.cures, { pestCure: 24 }), { rids: f.rids, cures: f.cures });
  ok("a ladybird weighs 13 and a mantis 50; twenty-four insects; hunted scarce as before", i.bugs?.ladybird?.weight === 13 && i.bugs?.mantis?.weight === 50 && Object.keys(i.bugs ?? {}).length === 24 && same(i.scarce, { day: 24, half: 20 }), { ladybird: i.bugs?.ladybird?.weight, mantis: i.bugs?.mantis?.weight });
  const at = Math.min(Date.parse(live.farming?.updated_at), Date.parse(live.insects?.updated_at)), later = rows.filter((r) => Date.parse(r.updated_at) >= at).map((r) => r.key);
  ok("the two were written together, and no row of the catalog since", same(later.sort(), ["farming", "insects"]) && Math.abs(Date.parse(live.farming?.updated_at) - Date.parse(live.insects?.updated_at)) < 5000, { later, farming: live.farming?.updated_at, insects: live.insects?.updated_at });
  const anon = async (fn, body) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 200) }; };
  let r = await anon("town_tend", { p_x: 0, p_y: 0 });
  ok("somebody signed out tends no plot", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
  for (const [fn, body] of [["feed", { p_key: "0,0", p_purse: {}, p_plot: {}, p_hand: "ladybird", p_now: 0 }], ["cure", { p_key: "0,0", p_purse: {}, p_plot: {}, p_hand: "pestCure", p_now: 0 }], ["deed_for", { p_key: "0,0", p_plot: {}, p_hand: "ladybird", p_me: "me", p_now: 0, p_owner: null }]]) {
    r = await anon(fn, body);
    ok(`the rule \`${fn}\` is not to be asked from outside`, r.status === 404 || /PGRST202|42501/.test(r.body), r);
  }
  table(at);
  // what the village has made of it: each try at a pest, by insect
  if (Array.isArray(put)) {
    const tried = put.filter((d) => Date.parse(d.at) >= at && typeof d.doc?.rid === "boolean");
    for (const bug of ["ladybird", "mantis"]) {
      const mine = tried.filter((d) => d.doc.with === bug), ate = mine.filter((d) => d.doc.rid).length;
      console.log(`  ${bug}: let go on a plant with a pest ${mine.length} times since; ate it ${ate}${mine.length ? ` (${Math.round((100 * ate) / mine.length)} in 100; ${bug === "ladybird" ? 50 : 70} is the rule)` : ""}`);
    }
    const cures = put.filter((d) => Date.parse(d.at) >= at && d.what === "cure").length;
    console.log(`  cures put on plants since: ${cures}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
