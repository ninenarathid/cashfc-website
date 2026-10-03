#!/usr/bin/env node
/*
 * Prove the checks bite: break a migration one rule at a time and confirm the
 * test notices every break. A test that still passes with the v85 policies
 * cut out is not testing the v85 policies.
 *
 *   node mutate.mjs <migration.sql> <test.mjs> <mutations.mjs>
 *   node mutate.mjs "$FC_REPO/.claude/skills/fc-migration/references/template.sql" template.test.mjs template.mutations.mjs
 *
 * The test must read the migration from process.env.MIGRATION_FILE when it is
 * set (template.test.mjs shows the one line that takes).
 *
 * mutations.mjs has a default export: ({ cut, swap }) => [[name, mutate, mustFail], ...]
 *   name      what the break is, in words
 *   mutate    sql => broken sql; cut(from, to) removes from `from` up to `to`,
 *             swap(a, b) replaces the first `a` with `b` (both throw if the
 *             anchor is missing, so a stale mutation cannot pass silently)
 *   mustFail  the names (or name prefixes) of checks that must FAIL on it
 *
 * Worth it for anything security-critical. Exit code 1 if any break was missed.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [migrationPath, testPath, mutationsPath] = process.argv.slice(2);
if (!migrationPath || !testPath || !mutationsPath) {
  console.error("usage: node mutate.mjs <migration.sql> <test.mjs> <mutations.mjs>");
  process.exit(2);
}

const cut = (from, to) => (s) => {
  const a = s.indexOf(from);
  const b = a < 0 ? -1 : s.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error(`mutation anchor missing: ${a < 0 ? from : to}`);
  return s.slice(0, a) + s.slice(b);
};
const swap = (from, to) => (s) => {
  if (!s.includes(from)) throw new Error(`mutation anchor missing: ${from}`);
  // (as a function: a string with $$ in it, which SQL is full of, would be halved)
  return s.replace(from, () => to);
};

const source = readFileSync(migrationPath, "utf8");
const mutations = (await import(pathToFileURL(resolve(mutationsPath)).href)).default({ cut, swap });
const test = resolve(testPath);
const dir = mkdtempSync(join(tmpdir(), "fc-mutant-"));
const mutant = join(dir, "mutant.sql");

// The unbroken file first: if it fails, the mutations mean nothing.
const clean = spawnSync(process.execPath, [test], {
  cwd: dirname(test), encoding: "utf8", env: { ...process.env, MIGRATION_FILE: resolve(migrationPath) },
});
if (clean.status !== 0) {
  console.log("the unbroken migration already fails its test; fix that first\n");
  console.log(clean.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).join("\n"), clean.stderr);
  process.exit(1);
}

let caught = 0;
for (const [name, mutate, mustFail] of mutations) {
  writeFileSync(mutant, mutate(source));
  const run = spawnSync(process.execPath, [test], {
    cwd: dirname(test), encoding: "utf8", env: { ...process.env, MIGRATION_FILE: mutant },
  });
  const failed = run.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).map((l) => l.slice(7));
  const missing = mustFail.filter((m) => !failed.some((f) => f.startsWith(m)));
  const ok = missing.length === 0 && failed.length > 0;
  if (ok) caught++;
  console.log(`${ok ? "CAUGHT" : "MISSED"}  ${name}  (${failed.length} FAIL line(s)${missing.length ? `; still passing: ${missing.join(" | ")}` : ""})`);
}
rmSync(dir, { recursive: true, force: true });
console.log(`\n${caught}/${mutations.length} breaks caught`);
process.exitCode = caught === mutations.length ? 0 : 1;
