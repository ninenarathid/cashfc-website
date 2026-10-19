// v290: which of the town's functions, tables and catalog rows as the database has them after v289 name the town's
// 64×64 tiles (a scan, not a test: what the file has to widen for the town's southern strip).
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v290.scan.mjs
import { readFileSync, readdirSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
const db = await rewardDB(252);
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  for (let n = 276; n <= 289; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { await db.exec("rollback"); console.log("SKIP", f, e.message.slice(0, 120)); }
  }
  const fns = (await db.query(`select p.oid::regprocedure::text sig, replace(pg_get_functiondef(p.oid), chr(13), '') d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f'`)).rows;
  console.log("functions:", fns.length);
  for (const { sig, d } of fns) {
    const hits = d.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /(?<![\w.])(63|64)(?![\w.])/.test(l.replace(/--.*$/, "")) && !/interval|hour|minute|second|day|3600|86400|bit|md5|hash|base64|int8|bigint/i.test(l));
    if (hits.length) console.log(`\n## ${sig}\n` + hits.slice(0, 8).map(([i, l]) => `${i}: ${l.trim().slice(0, 220)}`).join("\n"));
  }
  const cons = (await db.query(`select conrelid::regclass::text t, pg_get_constraintdef(oid) c from pg_constraint where contype = 'c' and pg_get_constraintdef(oid) ~ '63|64'`)).rows;
  console.log("\nCHECKS", cons);
  const cat = (await db.query(`select key, data::text d from public.town_catalog`)).rows;
  for (const { key, d } of cat) for (const m of d.matchAll(/.{0,60}(\[0, ?0, ?64, ?64\]|"town", ?0, ?0, ?64, ?64|\[64, ?64\]).{0,30}/g)) console.log("CATALOG", key, m[0]);
} finally { await db.close(); }
