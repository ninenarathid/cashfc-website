// v284: which of the town's functions, tables and catalog rows as the database has them after v281 name the farm's
// first 24 beds or its first 60×44 tiles (a scan, not a test: what the file has to widen).
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v284.scan.mjs
import { readFileSync, readdirSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
const db = await rewardDB(252);
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  for (let n = 276; n <= 281; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { await db.exec("rollback"); console.log("SKIP", f, e.message.slice(0, 120)); }
  }
  const fns = (await db.query(`select p.oid::regprocedure::text sig, replace(pg_get_functiondef(p.oid), chr(13), '') d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f'`)).rows;
  const pats = [/0 and 23/, /[<>]=? ?2[34]\b/, /\b23\b/, /\[132, ?4\]/, /\b44\b/, /\b188\b/, /BEDS|beds_in/i];
  for (const { sig, d } of fns) {
    const hits = [];
    d.split("\n").forEach((line, i) => { if (pats.slice(0, 6).some((p) => p.test(line)) && /bed|farm|plot|cloud|conduit|map/i.test(line)) hits.push(`${i + 1}: ${line.trim().slice(0, 220)}`); });
    if (hits.length) console.log(`\n## ${sig}\n${hits.join("\n")}`);
  }
  console.log("\n--- broad: functions touching beds, plots or the farm with a bare 23, 24, 43, 44, 47, 48 or 86 anywhere");
  for (const { sig, d } of fns) {
    if (!/bed_of|bedsAt|town_beds|town_plots|'farm'|cloudCorners/.test(d)) continue;
    const hits = d.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /(?<![\w.])(23|24|43|44|47|48|86)(?![\w.])/.test(l.replace(/--.*$/, "")) && !/interval|hour|3600|86400|minute|day/i.test(l));
    if (hits.length) console.log(`\n## ${sig}\n` + hits.slice(0, 8).map(([i, l]) => `${i}: ${l.trim().slice(0, 200)}`).join("\n"));
  }
  console.log("\n--- any function with the farm's x (128, 187, 188) and its old last rows (43, 44) on one line");
  for (const { sig, d } of fns) {
    const hits = d.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /(?<![\w.])(128|187|188)(?![\w.])/.test(l) && /(?<![\w.])(43|44)(?![\w.])/.test(l));
    if (hits.length) console.log(`\n## ${sig}\n` + hits.slice(0, 6).map(([i, l]) => `${i}: ${l.trim().slice(0, 200)}`).join("\n"));
  }
  const nb = (await db.query(`select data->'nurseryBoxes' n from public.town_catalog where key = 'rewards'`)).rows[0]?.n;
  console.log("\nrewards.nurseryBoxes on the bench:", JSON.stringify(nb));
  const cons = (await db.query(`select conrelid::regclass::text t, pg_get_constraintdef(oid) c from pg_constraint where contype = 'c' and pg_get_constraintdef(oid) ~ '23|24'`)).rows;
  console.log("\nCHECKS", cons);
  const cat = (await db.query(`select key, data::text d from public.town_catalog`)).rows;
  for (const { key, d } of cat) for (const m of d.matchAll(/"(\w+)":\s*\[\[132,\s?4\]/g)) console.log("CATALOG corners", key, m[1]);
  for (const { key, d } of cat) for (const m of d.matchAll(/"(\w+)":\s*\[128,\s?0,\s?60,\s?44\]/g)) console.log("CATALOG farm rect", key, m[1]);
} finally { await db.close(); }
