// A read-only look at the live database after v134 (a box to keep things in) or v137 (things dropped on the ground):
// the file's catalog row is there, to the entry, and no other row of the catalog was written with it; its table is
// there and closed; nobody signed out may call its three functions; its rules are not to be asked from outside. Then
// what the town has made of it so far, as counts.
// Touches nothing; prints no key, no name, no id.
//   node probe-v134-v137.mjs v134|v137
//   node probe-v134-v137.mjs v134|v137 wait     (asks every twenty seconds until the row is there, then looks)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WHICH = {
  v134: {
    row: "box", table: "town_boxes",
    fns: [["town_box", {}], ["town_box_put", { p_slot: 0, p_n: 1, p_x: 34, p_y: 35 }], ["town_box_take", { p_slot: 0, p_n: 1, p_x: 34, p_y: 35 }]],
    rules: [["by_box", { p_x: 34, p_y: 35 }], ["box_roomy", { p_box: {} }], ["stow", { p_purse: {}, p_box: {}, p_slot: 0, p_n: 1, p_x: 34, p_y: 35 }], ["unstow", { p_purse: {}, p_box: {}, p_slot: 0, p_n: 1, p_x: 34, p_y: 35 }],
      ["box_of", { p_member: "00000000-0000-0000-0000-000000000000" }], ["keep_box", { p_member: "00000000-0000-0000-0000-000000000000", p_box: {} }]],
    deeds: ["box_put", "box_take"],
  },
  v137: {
    row: "ground", table: "town_ground",
    fns: [["town_ground", {}], ["town_ground_drop", { p_slot: 0, p_x: 30, p_y: 38 }], ["town_ground_take", { p_id: 1, p_x: 30, p_y: 38 }]],
    rules: [["on_ground", { p_x: 30, p_y: 38 }], ["ground_drop", { p_purse: {}, p_slot: 0, p_by: "x", p_x: 30, p_y: 38, p_now: 0, p_id: 1 }], ["ground_pick", { p_purse: {}, p_dropped: {}, p_x: 30, p_y: 38, p_now: 0 }], ["ground_now", { p_now: 0 }]],
    deeds: ["ground_drop", "ground_take"],
  },
};
const v = process.argv[2], W = WHICH[v];
if (!W) { console.log("which: v134 or v137"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-4999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };
// the file as it was pushed: from supabase/ while it is there, from history afterwards
const FILE = (() => {
  const there = fs.readdirSync(`${REPO}/supabase`).find((f) => f.startsWith(`${v}_`));
  if (there) return fs.readFileSync(`${REPO}/supabase/${there}`, "utf8");
  const name = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=", "--name-only", "--", `supabase/${v}_*.sql`], { encoding: "utf8" }).trim().split("\n")[0];
  if (!name) throw new Error(`${v} is neither in supabase/ nor in history yet`);
  const commit = execFileSync("git", ["-C", REPO, "log", "--all", "--diff-filter=A", "--format=%H", "-1", "--", name], { encoding: "utf8" }).trim();
  return execFileSync("git", ["-C", REPO, "show", `${commit}:${name}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
})().replace(/\r\n/g, "\n");
const want = {};
for (const m of FILE.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (x) => (Array.isArray(x) ? x.map(settle) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, settle(x[k])])) : x);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const rowNow = async () => (await get(`/rest/v1/town_catalog?select=key,data,updated_at&key=eq.${W.row}`)).body?.[0];

if (process.argv[3] === "wait") {
  for (let i = 0; i < 300 && !(await rowNow()); i++) await new Promise((r) => setTimeout(r, 20000));
  // (a look within seconds of a run is answered 404 for new tables and functions until PostgREST has read the schema again)
  await new Promise((r) => setTimeout(r, 40000));
}
ok(`the file's block names one row, \`${W.row}\``, same(Object.keys(want), [W.row]), Object.keys(want));
const live = await rowNow();
if (!live) console.log(`\n  ${v} has not run yet: the catalog has no \`${W.row}\` row. Nothing more to look at.`);
else {
  ok(`the live \`${W.row}\` row is what the file writes, to the entry`, same(live.data, want[W.row]), live.data);
  const all = (await get(`/rest/v1/town_catalog?select=key,updated_at&order=key`)).body ?? [];
  const beside = all.filter((r) => r.key !== W.row && Math.abs(new Date(r.updated_at) - new Date(live.updated_at)) < 60000).map((r) => r.key);
  ok(`no other row of the catalog was written with it (${all.length} rows now)`, beside.length === 0, beside);
  const kept = await get(`/rest/v1/${W.table}?select=*`);
  ok(`the table ${W.table} is there, and the site's key reads it`, kept.status >= 200 && kept.status < 300 && Array.isArray(kept.body), kept.status);
  const anon = await get(`/rest/v1/${W.table}?select=*`, ANON);
  ok("somebody signed out reads nothing of it", anon.status >= 400 || (Array.isArray(anon.body) && anon.body.length === 0), { status: anon.status, n: anon.body?.length });
  for (const [fn, args] of W.fns) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => ({}));
    // (a function that is not there answers 404 with PGRST202: that is not a refusal)
    ok(`somebody signed out is refused ${fn}, which is there`, (r.status === 401 || r.status === 403 || j.code === "42501") && j.code !== "PGRST202", { status: r.status, code: j.code });
  }
  for (const [fn, args] of W.rules) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify(args) });
    ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
  }
  if (v === "v137") {
    // v121's way of throwing a thing away stays, for pages built before
    const r = await fetch(`${URL_}/rest/v1/rpc/town_drop`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ p_slot: 0 }) });
    const j = await r.json().catch(() => ({}));
    ok("town_drop, which throws a thing away, is still there for pages built before", (r.status === 401 || r.status === 403 || j.code === "42501") && j.code !== "PGRST202", { status: r.status, code: j.code });
  }
  // what the town has made of it so far (counts only)
  const deeds = (await get(`/rest/v1/town_deeds?select=what,thing,n,member_id,at&what=in.(${W.deeds.join(",")})&order=id.asc`)).body ?? [];
  const n = (what) => deeds.filter((d) => d.what === what).length;
  console.log(`\n  since it ran (${live.updated_at}):`);
  if (v === "v134") {
    const boxes = kept.body ?? [];
    console.log(`  boxes kept: ${boxes.length}, with ${boxes.reduce((t, b) => t + (b.things ?? []).filter(Boolean).length, 0)} slots in use; any with more than the free slots: ${boxes.filter((b) => Number(b.more) > 0).length}`);
    console.log(`  things put in ${n("box_put")} times and taken out ${n("box_take")} times, by ${new Set(deeds.map((d) => d.member_id)).size} member(s)`);
  } else {
    const lying = (kept.body ?? []).filter((g) => Number(g.until_ms) > Date.now()).length;
    console.log(`  lying on the ground now: ${lying} (lines kept: ${(kept.body ?? []).length})`);
    console.log(`  dropped ${n("ground_drop")} times and picked up ${n("ground_take")} times, by ${new Set(deeds.map((d) => d.member_id)).size} member(s); so ${Math.max(0, n("ground_drop") - n("ground_take") - lying)} lost`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows a fetch still closing makes node die of an assertion with code 127 after its last line)
process.exitCode = fail ? 1 : 0;
