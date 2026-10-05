// A read-only look at the live database for v141 (the jar's row by name). The file looks at the jar once itself, so
// that it has run can be read from outside: the jar is at the round that is. (Before it, the jar stood at the round
// it was made in: nobody's page could move it, and the well's book answered nobody.) Touches nothing; prints no key,
// no name and no id.
//   node probe-v141.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const anon = async (fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.text() }; };

// the round that is: two a day, at the catalog's two hours, Bangkok (lib/town/trade's roundOf; the stall keeps the same)
const rounds = (await get(`/rest/v1/town_catalog?select=data&key=eq.rules`))[0]?.data?.rounds ?? [7, 19];
const DAY = 86400000, HOUR = 3600000, local = Date.now() + 7 * HOUR, hour = (local % DAY) / HOUR, day = Math.floor(local / DAY);
const now = hour >= rounds[1] ? day * 2 + 1 : hour >= rounds[0] ? day * 2 : (day - 1) * 2 + 1;
const [jar] = await get(`/rest/v1/town_jar?select=round,coins,things`);
ok("the jar is at the round that is: the file has run, or a page has moved it since", jar?.round === now, { jar: jar?.round, now });

let r = await anon("town_jar_drop", { p_coins: 1 });
ok("somebody signed out drops nothing into the jar", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
r = await anon("town_well");
ok("…and is shown no book", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
r = await anon("jar_now", { p_now: 0 });
ok("the jar's own rule is not to be asked from outside", r.status === 404 || /PGRST202|42501/.test(r.body), r);

// what the jar has had since: nothing could be dropped before the file (its log had no line)
const log = await get(`/rest/v1/town_jar_log?select=what,round,coins&order=id`);
const by = {};
if (Array.isArray(log)) for (const l of log) by[l.what] = (by[l.what] ?? 0) + 1;
console.log(`    the jar: round ${jar?.round}, ${jar?.coins} coins, ${(jar?.things ?? []).length} kinds of thing; its log: ${JSON.stringify(by)}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
