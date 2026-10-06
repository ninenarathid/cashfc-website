/*
 * A draft's own "Checking it" lines run against the stand-in database with the draft in it: each query's answer beside
 * what the file says it should be. "Reading it" queries are run too, only to see that they run.
 *
 *   node check-foot.mjs <draft.sql>
 */
import { readFileSync } from "node:fs";
import { standIn } from "./stand-in.mjs";

const lf = (s) => s.split("\r\n").join("\n");
const text = lf(readFileSync(process.argv[2], "utf8"));
const t = await standIn();
await t.db.exec(text);
const foot = text.slice(text.indexOf("─── Checking it"));
const lines = foot.split("\n").map((l) => l.replace(/^-- ?/, ""));
let sql = [], bad = 0, n = 0, reading = false;
const run = async (want) => {
  const q = sql.join("\n").trim(); sql = [];
  if (!q) return;
  n++;
  try {
    const r = (await t.sql(q)).rows;
    if (reading || want === null) { console.log(`  runs (${r.length} rows): ${q.slice(0, 70).replace(/\s+/g, " ")}…`); return; }
    const got = Object.values(r[0] ?? {}).map((v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : String(v))).join(" | ");
    const same = got.replace(/\s+/g, "") === want.replace(/\s+/g, "");
    if (!same) bad++;
    console.log(`  ${same ? "PASS" : "FAIL"} ${q.slice(0, 60).replace(/\s+/g, " ")}…\n       says ${want}\n       got  ${got}`);
  } catch (e) { bad++; console.log(`  FAIL (does not run) ${q.slice(0, 80)}: ${e.message}`); }
};
for (const l of lines) {
  if (l.includes("─── Reading it")) { await run(null); reading = true; continue; }
  if (l.includes("───")) continue;
  const s = l.replace(/^  /, "");
  if (/^\s*-- /.test(s) && sql.length && sql.join("\n").trim().endsWith(";")) { await run(s.trim().replace(/^-- /, "")); continue; }
  if (/^\s*-- /.test(s) && !sql.length) continue;   // a note above a query
  if (s.trim() === "") { if (sql.length && sql.join("\n").trim().endsWith(";")) await run(null); continue; }
  sql.push(s);
}
await run(null);
console.log(`\n${n} queries, ${bad} not as the file says`);
try { await t.db.close(); } catch { /* closed */ }
process.exit(bad ? 1 : 0);
