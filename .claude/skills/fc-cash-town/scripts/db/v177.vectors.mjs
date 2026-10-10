import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
const root = process.env.FC_REPO, dir = join(root, ".claude/skills/fc-cash-town/scripts/db");
const only = new Set((process.env.TOWN_VECTOR_FUNCTIONS ?? "").split(",").filter(Boolean));
const t = await standIn({ upTo: 176 });
await t.db.exec(readFileSync(join(dir, "v177_draft.sql"), "utf8"));
const same = (a,b) => typeof a === "number" && typeof b === "number" ? Math.abs(a-b) < 1e-8
  : a === null || b === null || typeof a !== "object" || typeof b !== "object" ? a === b
  : Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => k in b && same(a[k],b[k]));
for (const [part, callFile] of [["tools","v174.tools.calls.json"],["mining","v164.mining.calls.json"],["felling","v164.felling.calls.json"]]) {
  const vectors = JSON.parse(readFileSync(join(process.cwd(), "now177", `vectors-${part}.json`), "utf8"));
  const calls = JSON.parse(readFileSync(join(dir,callFile), "utf8")), groups = new Map();
  for (const v of vectors) { const g = groups.get(v.fn) ?? []; g.push(v); groups.set(v.fn,g); }
  for (const [fn, rows] of groups) {
    if (only.size && !only.has(`${part}.${fn}`)) continue;
    if (!calls[fn]) throw new Error(`missing call ${part}.${fn}`);
    const expression = calls[fn].replace(/\$(\d+)/g, (_,n) => `(v.args->>${Number(n)-1})`);
    let bad = 0, first = null;
    for (let i=0; i<rows.length; i+=200) {
      const batch = rows.slice(i,i+200);
      try {
        const got = (await t.sql(`select e.ord, ${expression} r from jsonb_array_elements($1::jsonb) with ordinality e(doc,ord) cross join lateral (select e.doc->'args' args) v order by e.ord`, [JSON.stringify(batch)])).rows;
        for (let j=0; j<got.length; j++) if (!same(got[j].r,batch[j].want)) { bad++; first ??= { args:batch[j].args,want:batch[j].want,got:got[j].r }; }
      } catch(e) { bad += batch.length; first ??= {error:e.message,args:batch[0]?.args}; }
    }
    t.check(`${part}.${fn}: ${rows.length} cases`, bad===0, bad ? `${bad} failures: ${JSON.stringify(first).slice(0,1800)}` : "");
  }
}
t.done(); await t.db.close();
