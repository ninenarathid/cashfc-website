// Shared local check/generator connection. Local snapshot plus current pending chain; no live connection.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.FC_REPO ?? process.cwd();
const req = createRequire(join(process.env.FC_DB_BENCH ?? 'E:/NinenineProject/fcnext-codex-bench','package.json'));
const { PGlite } = await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href);
export async function comboDB() {
 const db = new PGlite({ loadDataDir: new Blob([readFileSync(join(root,'.claude/skills/fc-cash-town/scripts/db/snap-v178.tar'))]) });
 const { migration } = await import(pathToFileURL(join(process.env.FC_DB_BENCH ?? 'E:/NinenineProject/fcnext-codex-bench','pglite-harness.mjs')).href);
 await db.exec(migration(179,{repo:root}));
 for (const [n,name] of [[180,'a_workshop_for_the_tools'],[181,'more_lines_on_the_water'],[182,'fishing_the_streams_and_pools']]) {
  await db.exec(readFileSync(join(root,`supabase/v${n}_${name}.sql`),'utf8'));
 }
 await db.exec(migration(183,{repo:root}));
 for (const [n,name] of [[184,'reading_the_grain_before_the_axe'],[185,'listening_to_the_layers_of_rock']]) await db.exec(readFileSync(join(root,`supabase/v${n}_${name}.sql`),'utf8'));
 const later=readdirSync(join(root,'supabase')).filter(f=>/^v(18[6-9]|19[0-3])_.*\.sql$/.test(f)).sort();
 for(const file of later) await db.exec(readFileSync(join(root,'supabase',file),'utf8'));
 return db;
}
