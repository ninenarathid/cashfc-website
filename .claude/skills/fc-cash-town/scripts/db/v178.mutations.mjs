import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const dir = join(process.env.FC_REPO, ".claude/skills/fc-cash-town/scripts/db");
const original = readFileSync(join(dir, "v178_draft.sql"), "utf8");
const scratch = mkdtempSync(join(tmpdir(), "fcnext-v178-mutations-"));
const breaks = [
  ["server still fells three", "'{echo,trees}', '2'::jsonb", "'{echo,trees}', '3'::jsonb", "server echo count is two"],
  ["gift still promises three", "'{gifts,charmEchoAxe,by}', '2'::jsonb", "'{gifts,charmEchoAxe,by}', '3'::jsonb", "gift count is two"],
];
let caught = 0;
for (const [name, from, to, check] of breaks) {
  if (!original.includes(from)) throw new Error(`missing mutation anchor: ${name}`);
  const file = join(scratch, `${caught}.sql`); writeFileSync(file, original.replace(from, to));
  const r = spawnSync(process.execPath, [join(process.cwd(), "v178.test.mjs")], { cwd: process.cwd(), env: { ...process.env, V178_SQL: file }, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const out = r.stdout + r.stderr; writeFileSync(join(scratch, `${caught}.log`), out);
  if (r.status !== 0 && out.split("\n").some((line) => line.includes("FAIL") && line.includes(check))) { caught++; console.log(`CAUGHT ${name}: ${check}`); }
  else { console.log(`SURVIVED ${name}\n${out.slice(-1500)}`); process.exitCode = 1; }
}
console.log(`${caught}/${breaks.length} mutations caught; logs: ${scratch}`);
