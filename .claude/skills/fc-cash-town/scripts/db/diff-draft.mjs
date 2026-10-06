/*
 * What a whole draft changes in the stand-in database after the last file that ran: the functions new, written again
 * and gone, the tables new and changed, the catalog's rows that differ, as the database itself has them.
 *
 *   node diff-draft.mjs <draft.sql> [out.md]       (FULL=1: each changed function's lines too)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { standIn } from "./stand-in.mjs";

const [file, out] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const t = await standIn();
const defs = async () => Object.fromEntries((await t.sql(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname = 'town' or (n.nspname = 'public' and p.proname like 'town\\_%')) and p.prokind = 'f'`)).rows.map((r) => [r.name, r.def.trim()]));
const tables = async () => Object.fromEntries((await t.sql(`select c.relname as name, string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) as cols
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'town\\_%' group by 1`)).rows.map((r) => [r.name, r.cols]));
const rows = async () => Object.fromEntries((await t.sql(`select key, data::text as d from public.town_catalog`)).rows.map((r) => [r.key, r.d]));
const was = await defs(), wasT = await tables(), wasC = await rows();
await t.db.exec(lf(readFileSync(file, "utf8")));
const now = await defs(), nowT = await tables(), nowC = await rows();
const short = (k) => k.replace(/\(.*$/, "");
const made = Object.keys(now).filter((k) => !(k in was)).sort(), gone = Object.keys(was).filter((k) => !(k in now)).sort();
const changed = Object.keys(now).filter((k) => k in was && was[k] !== now[k]).sort();
const count = (a, b) => { const A = a.split("\n"), B = new Set(b.split("\n")); return A.filter((l) => !B.has(l)).length; };
const text = [
  `# ${file.split(/[\\/]/).pop()} against the database after v152`, "",
  `Functions before ${Object.keys(was).length}, after ${Object.keys(now).length}.`, "",
  `New rules of schema town (${made.filter((k) => k.startsWith("town.")).length}): ${made.filter((k) => k.startsWith("town.")).map(short).join(", ")}`, "",
  `New for a member to call (${made.filter((k) => k.startsWith("public.")).length}): ${made.filter((k) => k.startsWith("public.")).join("; ")}`, "",
  `Written again (${changed.length}): ${changed.map((k) => `${short(k)} (-${count(was[k], now[k])} +${count(now[k], was[k])})`).join(", ")}`, "",
  `Gone (${gone.length}): ${gone.join("; ") || "none"}`, "",
  `New tables: ${Object.keys(nowT).filter((k) => !(k in wasT)).join(", ") || "none"}; changed: ${Object.keys(nowT).filter((k) => k in wasT && wasT[k] !== nowT[k]).join(", ") || "none"}`, "",
  `Catalog rows that differ: ${Object.keys(nowC).filter((k) => wasC[k] !== nowC[k]).join(", ") || "none"}; new rows: ${Object.keys(nowC).filter((k) => !(k in wasC)).join(", ") || "none"}`, "",
].join("\n");
if (out) { writeFileSync(out, text); console.log(`written: ${out}`); } else console.log(text);
try { await t.db.close(); } catch { /* closed */ }
process.exit(0);
