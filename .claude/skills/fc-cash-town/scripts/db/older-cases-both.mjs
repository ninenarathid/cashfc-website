/*
 * Every rule case of the files that HAVE run, asked of the database before a draft and after it: each answer the same.
 * What a draft that writes live functions again has to show of everything it did not mean to change.
 *
 *   node older-cases-both.mjs <the worktree's root> <version> [<a file's name, as a regex>]
 *   node older-cases-both.mjs <the worktree's root> <version> --each [<how many at once: 3>]
 *     (run where the harness is: the scratch folder of the dry runs. `--each` asks every file of cases in a process
 *      of its own, a few at a time, and adds them up: one process for all of them dies of its size after some two
 *      hundred thousand questions.)
 *
 * The cases: ./now/vectors-*.json beside this script, written first, in the worktree:
 *     TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors
 * but for those of the draft's own parts (`vectors-<part>.json` for each <version>.<part>.sql there is): their
 * functions are not in the database before the draft, and each part's own try holds them to the code.
 *
 * Before: the stand-in as it is after the last file that ran before the draft (`standIn({ upTo: N - 1 })`), its
 * catalog its own. After: the same with the draft run on it, twice, as a file is. The draft: MIGRATION_FILE, or
 * <version>_draft.sql in the root's scripts/db, or beside this script.
 *
 * How a case is asked is read from every `*.calls.json` and from the maps written inside the dry runs' own scripts
 * (`"<case fn>": "town.x($1::jsonb, …)"`). A case whose call is not known, or is written for another number of
 * arguments than the case has (an older signature), is not asked, and is counted as such. A case that answers
 * otherwise than today's code in BOTH databases (a seed the old script gave, a rule changed since by a file that
 * ran) is counted too: it is the same before and after, which is what is asked here.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [root, version, ...rest] = process.argv.slice(2);
if (!root || !/^v\d+$/.test(version ?? "")) { console.log("node older-cases-both.mjs <the worktree's root> <version> [<file regex> | --each [<at once>]]"); process.exit(2); }
const dir = join(root, ".claude/skills/fc-cash-town/scripts/db");
const here = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url));
const OWN = readdirSync(dir).map((f) => new RegExp(`^${version}\\.([a-z]+)\\.sql$`).exec(f)?.[1]).filter((p) => p && !["head", "foot", "shared"].includes(p)).map((p) => `vectors-${p}.json`);
const FILES = readdirSync(here("now")).filter((f) => f.startsWith("vectors-") && f.endsWith(".json") && !OWN.includes(f)).sort();

if (rest[0] === "--each") {
  const atOnce = Number(rest[1] ?? 3), queue = [...FILES], lines = [];
  const sum = { asked: 0, differ: 0, off: 0, none: 0, files: 0, failed: [] };
  const one = (file) => new Promise((done) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), root, version, `^${file.replace(/\./g, "\\.")}$`], { cwd: here("."), env: process.env });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      const m = /^ALL: (\d+) cases asked before and after; (\d+) differ; (\d+) are not .*?; (\d+) had no call known/m.exec(out);
      if (code !== 0 || !m) sum.failed.push(file);
      else { sum.asked += Number(m[1]); sum.differ += Number(m[2]); sum.off += Number(m[3]); sum.none += Number(m[4]); sum.files++; }
      const said = out.split("\n").filter((l) => l.startsWith("vectors-") || l.startsWith("   FIRST") || l.startsWith("   DIFFER") || /NOT BEFORE AND AFTER/.test(l)).join("\n") || `${file}: NO ANSWER (exit ${code}) ${out.slice(-300)}`;
      console.log(said); lines.push(said);
      done();
    });
  });
  const worker = async () => { while (queue.length) await one(queue.shift()); };
  await Promise.all(Array.from({ length: atOnce }, worker));
  const total = `EVERY FILE: ${sum.files} of ${FILES.length} files, ${sum.asked} cases asked before and after ${version}; ${sum.differ} differ; ${sum.off} answer otherwise than today's code in both alike; ${sum.none} had no call known${sum.failed.length ? `; NO ANSWER FROM: ${sum.failed.join(", ")}` : ""}`
    + (OWN.length ? ` (left out, the draft's own: ${OWN.join(", ")})` : "");
  console.log(total); lines.push(total);
  writeFileSync(here(`older-cases-${version}.log`), lines.join("\n") + "\n");
  process.exit(sum.differ === 0 && sum.failed.length === 0 ? 0 : 1);
}

const { standIn } = await import("./stand-in.mjs");
process.env.FC_REPO ??= root;
const lf = (s) => s.split("\r\n").join("\n");
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const str = (v) => JSON.stringify(settle(v ?? null));
// (the call maps: every *.calls.json, and the maps written inside the dry runs' own scripts)
const maps = {}, ALL = {};
const RX = /"?\b([A-Za-z_0-9]+)"?:\s*[`"]((?:town\.|public\.|to_jsonb\(|coalesce\(|\()[^`"\n]*\$1[^`"\n]*)[`"]/g;
for (const f of readdirSync(dir).sort((a, b) => (parseInt(a.slice(1)) || 0) - (parseInt(b.slice(1)) || 0))) {
  let m = null;
  if (f.endsWith(".calls.json")) m = JSON.parse(readFileSync(join(dir, f), "utf8"));
  else if (f.endsWith(".mjs")) { m = {}; for (const x of readFileSync(join(dir, f), "utf8").matchAll(RX)) m[x[1]] = x[2]; }
  if (m && Object.keys(m).length) { maps[f] = m; Object.assign(ALL, m); }
}
const mapFor = (file) => {
  const name = file.replace(/^vectors-/, "").replace(/\.json$/, "");
  const own = Object.keys(maps).filter((f) => f.startsWith(`${name}.`) || f.includes(`.${name.replace(/^gifts-/, "")}.calls.json`));
  return Object.assign({}, ALL, ...own.map((f) => maps[f]));
};
const cases = (v) => (Array.isArray(v) ? (v.length && v.every((x) => x && typeof x === "object" && typeof x.fn === "string" && Array.isArray(x.args)) ? v : v.flatMap(cases))
  : v && typeof v === "object" ? Object.values(v).flatMap(cases) : []);
const filter = new RegExp(rest[0] ?? ".");
const draft = process.env.MIGRATION_FILE || [join(dir, `${version}_draft.sql`), here(`${version}_draft.sql`)].find((f) => existsSync(f));
if (!draft) { console.log(`no ${version}_draft.sql in the root's scripts/db nor beside this script (MIGRATION_FILE=<a file> names another)`); process.exit(2); }
const FILE = lf(readFileSync(draft, "utf8")), N = Number(version.slice(1));
const A = await standIn({ upTo: N - 1 }), B = await standIn({ upTo: N - 1 });
await B.db.exec(FILE); await B.db.exec(FILE);
// (the two databases are what they are said to be: the first has nothing of the draft, the second all of it)
const marked = async (t) => Number((await t.sql(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f' and p.prosrc like $1`, [`%(${version})%`])).rows[0].n);
const mA = await marked(A), mB = await marked(B);
console.log(`functions with a mark of ${version}: before ${mA}, after ${mB}`);
if (mA !== 0 || mB === 0) { console.log("THE TWO DATABASES ARE NOT BEFORE AND AFTER THE DRAFT"); process.exit(1); }
let total = 0, differ = 0, off = 0, unmapped = 0;
for (const file of FILES.filter((f) => filter.test(f))) {
  const vectors = cases(JSON.parse(readFileSync(here(`now/${file}`), "utf8"))), CALL = mapFor(file), t0 = Date.now();
  let n = 0, bad = 0, wrong = 0, none = 0, first = null;
  const noMap = new Set(), badBy = new Map();
  for (const v of vectors) {
    const sql = CALL[v.fn];
    // (a call written for another number of arguments than the case has, or with a script's own placeholder left in it, is not asked: an older signature)
    const most = sql ? Math.max(0, ...[...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]))) : 0;
    if (!sql || sql.includes("${") || most !== v.args.length) { none++; noMap.add(v.fn); continue; }
    n++;
    const ask = async (t) => { try { const r = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; return typeof r === "bigint" ? Number(r) : r; } catch (e) { return { error: e.message }; } };
    const a = await ask(A), b = await ask(B), sa = str(a), sb = str(b);
    if (sa !== sb) { bad++; badBy.set(v.fn, (badBy.get(v.fn) ?? 0) + 1); first ??= { fn: v.fn, args: v.args, before: a, after: b }; }
    else if (sb !== str(v.want)) wrong++;
  }
  total += n; differ += bad; off += wrong; unmapped += none;
  console.log(`${file}: ${n} asked, ${bad} differ before/after, ${wrong} not today's code's answer in both alike${none ? `, ${none} with no call known (${[...noMap].slice(0, 8).join(", ")})` : ""} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (first) { console.log(`   DIFFER BY RULE: ${JSON.stringify([...badBy])}`); console.log(`   FIRST THAT DIFFERS: ${JSON.stringify(first).slice(0, 3000)}`); }
}
console.log(`ALL: ${total} cases asked before and after; ${differ} differ; ${off} are not what today's code answers, in both alike; ${unmapped} had no call known`);
process.exit(0);
