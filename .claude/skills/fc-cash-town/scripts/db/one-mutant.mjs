// One break by hand, to see what the test says of it:  node one-mutant.mjs <draft.sql> <test.mjs> <mutations.mjs> <index>
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [draft, test, muts, at] = process.argv.slice(2);
const cut = (from, to) => (s) => { const a = s.indexOf(from), b = a < 0 ? -1 : s.indexOf(to, a + from.length); if (a < 0 || b < 0) throw new Error("anchor missing"); return s.slice(0, a) + s.slice(b); };
const swap = (from, to) => (s) => { if (!s.includes(from)) throw new Error("anchor missing: " + from); return s.replace(from, () => to); };
delete process.env.FROM; delete process.env.TO;
const list = (await import(pathToFileURL(resolve(muts)).href)).default({ cut, swap });
const [name, mutate] = list[Number(at)];
writeFileSync("one-mutant.sql", mutate(readFileSync(draft, "utf8")));
const run = spawnSync(process.execPath, [test], { encoding: "utf8", env: { ...process.env, MIGRATION_FILE: resolve("one-mutant.sql") } });
console.log(name, "→ exit", run.status);
console.log(run.stdout.split("\n").filter((l) => /FAIL|passed|failed/.test(l)).join("\n"));
console.log(run.stderr.slice(0, 1500));
