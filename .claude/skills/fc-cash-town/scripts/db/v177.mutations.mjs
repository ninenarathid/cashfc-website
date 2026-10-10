import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const dir = join(process.env.FC_REPO, ".claude/skills/fc-cash-town/scripts/db");
const original = readFileSync(join(dir, "v177_draft.sql"), "utf8");
const scratch = mkdtempSync(join(tmpdir(), "fcnext-v177-mutations-"));
const breaks = [
  ["private helper exposed", s => s.replace("notify pgrst, 'reload schema';", "grant execute on function town.sweep_caught(jsonb,bigint) to authenticated;\nnotify pgrst, 'reload schema';"), "all private functions closed"],
  ["unbounded sweep duration", s => s.replace("p_now + 10000", "p_now + 300000"), "member power grants five catches for ten seconds"],
  ["successful catches do not spend sweep", s => s.replace("to_jsonb((p_purse->'netSweep'->>'left')::numeric - 1)", "to_jsonb((p_purse->'netSweep'->>'left')::numeric)"), "five successful catches exhaust the server grant"],
];
let caught = 0;
for (const [name, mutate, check] of breaks) {
  const sql = mutate(original); if (sql === original) throw new Error(`missing mutation anchor: ${name}`);
  const file = join(scratch, `${caught}.sql`); writeFileSync(file, sql);
  const r = spawnSync(process.execPath, [join(process.cwd(), "v177.test.mjs")], { cwd: process.cwd(), env: { ...process.env, V177_SQL: file }, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const out = r.stdout + r.stderr; writeFileSync(join(scratch, `${caught}.log`), out);
  if (r.status !== 0 && out.split("\n").some(line => line.includes("FAIL") && line.includes(check))) { caught++; console.log(`CAUGHT ${name}: ${check}`); }
  else { console.log(`SURVIVED ${name}\n${out.slice(-1500)}`); process.exitCode = 1; }
}
console.log(`${caught}/${breaks.length} mutations caught; logs: ${scratch}`);
