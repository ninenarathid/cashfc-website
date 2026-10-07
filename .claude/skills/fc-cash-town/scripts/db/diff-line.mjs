/*
 * What a line's SQL changes in the stand-in database, function by function, as the database itself words them
 * (pg_get_functiondef before and after: so the file's own layout does not matter).
 *
 *   node diff-line.mjs <the worktree's root> <line> [out.md]
 *
 * New functions are listed; each changed one is shown as the lines taken out (-) and put in (+), with a line or two
 * round them. The shared SQL is run first and is not part of what is shown (give `shared` for its own).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";

const [root, line, out] = process.argv.slice(2);
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const lf = (s) => s.split("\r\n").join("\n");
const t = await standIn();
const defs = async () => Object.fromEntries((await t.sql(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname = 'town' or (n.nspname = 'public' and p.proname like 'town\\_%')) and p.prokind = 'f'`)).rows.map((r) => [r.name, r.def.trim()]));
const tables = async () => Object.fromEntries((await t.sql(`select c.relname as name, string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) as cols
  from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'town\\_%' group by 1`)).rows.map((r) => [r.name, r.cols]));
if (line !== "shared") await t.db.exec(lf(readFileSync(db("v153.shared.sql"), "utf8")));
// (a line that stands on another's is shown against that one's: the helpers' against the farm's)
for (const b of { helpers: ["farming"] }[line] ?? []) await t.db.exec(lf(readFileSync(db(`v153.${b}.sql`), "utf8")));
const was = await defs(), wasT = await tables();
if (!existsSync(db(`v153.${line}.sql`))) { console.log(`no v153.${line}.sql`); process.exit(2); }
await t.db.exec(lf(readFileSync(db(`v153.${line}.sql`), "utf8")));
const now = await defs(), nowT = await tables();

/** The lines of b that are not a's and of a that are not b's, in order (a longest common run of lines kept). */
function diff(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const rows = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { rows.push([" ", A[i]]); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) rows.push(["+", B[j++]]);
    else rows.push(["-", A[i++]]);
  }
  const keep = new Set();
  rows.forEach((r, k) => { if (r[0] !== " ") for (let d = -1; d <= 1; d++) keep.add(k + d); });
  const outRows = [];
  let last = -2;
  rows.forEach((r, k) => { if (!keep.has(k)) return; if (k > last + 1) outRows.push("  …"); outRows.push(`${r[0]} ${r[1]}`); last = k; });
  return { text: outRows.join("\n"), minus: rows.filter((r) => r[0] === "-").length, plus: rows.filter((r) => r[0] === "+").length };
}

const made = Object.keys(now).filter((k) => !(k in was)).sort();
const gone = Object.keys(was).filter((k) => !(k in now)).sort();
const changed = Object.keys(now).filter((k) => k in was && was[k] !== now[k]).sort();
const lines = [`# v153.${line}.sql against the database after v152`, "",
  `New functions (${made.length}): ${made.join("; ") || "none"}`, "",
  `Gone (${gone.length}): ${gone.join("; ") || "none"}`, "",
  `New tables: ${Object.keys(nowT).filter((k) => !(k in wasT)).map((k) => `${k} (${nowT[k]})`).join("; ") || "none"}`,
  `Tables changed: ${Object.keys(nowT).filter((k) => k in wasT && wasT[k] !== nowT[k]).map((k) => `${k}: ${wasT[k]} -> ${nowT[k]}`).join("; ") || "none"}`, "",
  `Changed functions (${changed.length}):`, ""];
for (const k of changed) { const d = diff(was[k], now[k]); lines.push(`## ${k}  (-${d.minus} +${d.plus})`, "```diff", d.text, "```", ""); }
const text = lines.join("\n");
if (out) { writeFileSync(out, text); console.log(`${made.length} new, ${changed.length} changed, ${gone.length} gone: ${out}`); } else console.log(text);
try { await t.db.close(); } catch { /* closed */ }
process.exit(0);
