/*
 * Each line's SQL broken a little, one place at a time, to see that its rule cases and scenes notice.
 *
 *   node mutate-lines.mjs <the worktree's root> <out dir> <line> [line …]      (N=<breaks a line>, 10; AT_ONCE=<runs at once>, 6)
 *
 * A break is one small change inside a function's body: a comparison's edge moved, a least for a greatest, a number
 * one more, a true for a false, a branch's word for another. The places are taken evenly through the file, so the
 * same ones every time. For each, try-all.mjs is run with that line's file replaced by the broken copy, its own rule
 * cases and its own scenes: noticed when a check fails (or the file no longer runs). What is NOT noticed is listed
 * with its line, to be looked at: a break that changes nothing that matters, or something the checks do not hold.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const [root, out, ...LINES] = process.argv.slice(2);
const N = Number(process.env.N ?? 10), AT_ONCE = Number(process.env.AT_ONCE ?? 6);
// (the lines every run is of; "shared" is no line of try-all's, it is run before them always: breaking it is SUB=shared=…)
const ALL = (process.env.WITH ?? LINES.join(",")).split(",").filter((l) => l !== "shared");
mkdirSync(out, { recursive: true });
const lf = (s) => s.split("\r\n").join("\n");
const SWAPS = [
  [/ >= /g, " > "], [/ <= /g, " < "], [/ > /g, " >= "], [/ < /g, " <= "],
  [/\bleast\(/g, "greatest("], [/\bgreatest\(/g, "least("],
  [/ \+ 1\b/g, " + 2"], [/ - 1\b/g, " - 0"], [/ \* 1000\b/g, " * 1001"],
  [/\bis not null\b/g, "is null"], [/, false\)/g, ", true)"], [/, true\)/g, ", false)"],
  [/town\.no\('([a-z]+)'\)/g, "town.no('odd')"], [/ and not /g, " and "], [/ or /g, " and "],
];

/** The places of a file that may be broken: inside a function's body, not in a comment, not a grant. */
function places(sql) {
  const lines = sql.split("\n"), found = [];
  let inside = false;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^as \$(function)?\$/i.test(t) || /\bas \$(function)?\$\s*$/i.test(t)) { inside = true; return; }
    if (/^\$(function)?\$;/.test(t) || /\$(function)?\$;\s*$/.test(t)) { inside = false; return; }
    if (!inside || t.startsWith("--") || /^(revoke|grant) /i.test(t)) return;
    const code = line.replace(/--.*$/, "");
    SWAPS.forEach(([re, to], k) => { for (const m of code.matchAll(re)) found.push({ i, at: m.index, len: m[0].length, to: m[0].replace(new RegExp(re.source), to), k }); });
  });
  return { lines, found };
}

const jobs = [];
for (const line of LINES) {
  const file = join(root, ".claude/skills/fc-cash-town/scripts/db", `v153.${line}.sql`);
  const { lines, found } = places(lf(readFileSync(file, "utf8")));
  // (evenly through the file, and no two of them on one line)
  const seen = new Set(), picks = [];
  for (let n = 0; n < found.length && picks.length < N; n++) {
    const p = found[Math.floor((n * found.length) / Math.min(N * 3, found.length)) % found.length];
    if (!p || seen.has(p.i)) continue;
    seen.add(p.i); picks.push(p);
  }
  picks.forEach((p, n) => {
    const broken = [...lines];
    broken[p.i] = lines[p.i].slice(0, p.at) + p.to + lines[p.i].slice(p.at + p.len);
    const copy = join(out, `${line}-${n}.sql`);
    writeFileSync(copy, broken.join("\n"));
    jobs.push({ line, n, copy, row: p.i + 1, was: lines[p.i].trim().slice(0, 150), change: `${lines[p.i].slice(p.at, p.at + p.len).trim()} -> ${p.to.trim()}` });
  });
  console.log(`${line}: ${found.length} places, ${picks.length} taken`);
}

const run = (job) => new Promise((done) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("./try-all.mjs", import.meta.url)), root, ...ALL],
    { env: { ...process.env, SUB: `${job.line}=${job.copy}`, ONLY: job.line, CASES: job.line }, stdio: ["ignore", "pipe", "pipe"] });
  let text = "";
  child.stdout.on("data", (d) => { text += d; }); child.stderr.on("data", (d) => { text += d; });
  child.on("close", (code) => {
    const fails = text.split("\n").filter((l) => l.includes("FAIL")).length;
    job.noticed = code !== 0 || fails > 0; job.fails = fails; job.code = code;
    job.first = text.split("\n").find((l) => l.includes("FAIL"))?.trim().slice(0, 160) ?? (code !== 0 ? text.trim().split("\n").pop().slice(0, 160) : "");
    done();
  });
});
let next = 0;
await Promise.all(Array.from({ length: AT_ONCE }, async () => { while (next < jobs.length) { const j = jobs[next++]; await run(j); process.stdout.write(j.noticed ? "." : "M"); } }));
console.log("");
const report = [];
for (const line of LINES) {
  const mine = jobs.filter((j) => j.line === line), missed = mine.filter((j) => !j.noticed);
  report.push(`${line}: ${mine.length - missed.length} of ${mine.length} breaks noticed`);
  for (const j of missed) report.push(`  NOT NOTICED  line ${j.row}: ${j.change}\n      ${j.was}`);
}
writeFileSync(join(out, "report.txt"), report.join("\n") + "\n\n" + jobs.map((j) => `${j.line}-${j.n} line ${j.row} [${j.change}] ${j.noticed ? "noticed" : "MISSED"}: ${j.first}`).join("\n") + "\n");
console.log(report.join("\n"));
process.exit(0);
