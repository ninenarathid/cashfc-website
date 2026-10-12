// Local snapshots only. Reward changes build on passive equipment and element training.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.env.FC_REPO??process.cwd();
const bench=process.env.FC_DB_BENCH??'E:/NinenineProject/fcnext-codex-bench';
const req=createRequire(join(bench,'package.json'));
const {PGlite}=await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href);
const {migration}=await import(pathToFileURL(join(bench,'pglite-harness.mjs')).href);
export async function tier10DB(){
 const db=new PGlite({loadDataDir:new Blob([readFileSync(join(root,'.claude/skills/fc-cash-town/scripts/db/snap-v178.tar'))])});
 try {
  for(const n of [179,183,195,180,181,182,184,185,186,187,188,194,196,197,198,199,200,201,202,203,205]) await db.exec(migration(n,{repo:root}));
  return db;
 } catch(e){await db.close();throw e;}
}
