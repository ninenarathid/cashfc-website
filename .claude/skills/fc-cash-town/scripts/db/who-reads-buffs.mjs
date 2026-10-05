// Which of the town's database functions read a buff, in the text each last ran with. Reads git history only.
import { execSync } from "node:child_process";
import fs from "node:fs";
const repo = "E:/NinenineProject/fcnext";
const git = (cmd) => execSync(`git -C ${repo} ${cmd}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const files = [...new Set(git(`log --all --diff-filter=A --name-only --format= -- supabase/`).split(/\r?\n/).filter((f) => /supabase\/v1(0[5-9]|1\d|2\d)_/.test(f)))].sort();
const draft = `${repo}/.claude/skills/fc-cash-town/scripts/db/v122_draft.sql`;
const last = new Map();   // function → { file, body }
const out = process.argv[2];
for (const f of [...files, ...(fs.existsSync(draft) ? [draft] : [])]) {
  const sql = f === draft ? fs.readFileSync(draft, "utf8") : git(`show ${git(`log --all --diff-filter=A --format=%h -1 -- ${f}`).trim()}:${f}`);
  for (const m of sql.matchAll(/create or replace function\s+((?:public|town)\.\w+)\s*\(([\s\S]*?)\)\s*returns[\s\S]*?as \$\$([\s\S]*?)\$\$;/g)) {
    last.set(m[1], { file: f.split("/").pop(), args: m[2].replace(/\s+/g, " "), body: m[3], whole: m[0] });
  }
}
console.log(`${last.size} functions in all`);
for (const [name, d] of last) {
  const lines = d.body.split(/\r?\n/).filter((l) => /buff_of\(|p_buff|->'buff'|->>'buff'|'buff'/.test(l));
  if (lines.length) console.log(`\n${name}(${d.args})  [${d.file}]\n` + lines.map((l) => "   " + l.trim().slice(0, 230)).join("\n"));
}
if (out) { fs.mkdirSync(out, { recursive: true }); for (const name of process.argv.slice(3)) if (last.has(name)) fs.writeFileSync(`${out}/${name}.sql`, last.get(name).whole + "\n"); }
