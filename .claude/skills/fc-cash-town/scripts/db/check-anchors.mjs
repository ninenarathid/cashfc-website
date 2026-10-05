// Every break's anchor is in the draft, and every check it names is one the dry run makes:  node check-anchors.mjs <draft.sql> <mutations.mjs> <test log>
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [draft, muts, log] = process.argv.slice(2);
const src = readFileSync(draft, "utf8"), names = readFileSync(log, "utf8").split("\n").filter((l) => /^  (PASS|FAIL) /.test(l)).map((l) => l.slice(7));
const cut = (from, to) => (s) => { const a = s.indexOf(from), b = a < 0 ? -1 : s.indexOf(to, a + from.length); if (a < 0 || b < 0) throw new Error("anchor missing"); return s.slice(0, a) + s.slice(b); };
const swap = (from, to) => (s) => { if (!s.includes(from)) throw new Error("anchor missing"); if (s.split(from).length !== 2) throw new Error("anchor there more than once"); return s.replace(from, () => to); };
delete process.env.FROM; delete process.env.TO;
const list = (await import(pathToFileURL(resolve(muts)).href)).default({ cut, swap });
let bad = 0;
list.forEach(([name, mutate, must], i) => {
  try { if (mutate(src) === src) throw new Error("changes nothing"); } catch (e) { bad++; console.log(`${i} ${name}: ${e.message}`); }
  for (const m of must) if (!names.some((n) => n.startsWith(m))) { bad++; console.log(`${i} ${name}: no check begins "${m.slice(0, 70)}"`); }
  if (!must.length) { bad++; console.log(`${i} ${name}: names no check`); }
});
console.log(`${list.length} breaks, ${bad} wrong`);
