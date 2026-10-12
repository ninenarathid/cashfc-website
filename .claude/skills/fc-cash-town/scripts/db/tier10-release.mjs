import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
await import('./repo-ts-town.mjs');
const { SECRET_RULES } = await import('@/lib/town/private/combos');
const { GIFT_GUIDES } = await import('@/lib/town/gift-guides');
const sha256 = text => createHash('sha256').update(text).digest('hex');
const files = readdirSync('supabase');
const migrations = [];
const installed216=process.argv.includes('--installed216');
for (let version=207; version<=251; version++) {
 if (version===215) {
  const source='supabase/v215_a_warehouse_for_friends_on_other_shifts.sql';
  const sql=execFileSync('git',['show',`b574ac39^:${source}`]);
  migrations.push({version,source,status:'already-installed-by-other-session; verify-live',sha256:sha256(sql),gitSource:'b574ac39^',pending:false});
  continue;
 }
 const file=files.find(f=>f.startsWith(`v${version}_`));
 assert.ok(file,`Missing v${version}`);
 migrations.push({version,source:`supabase/${file}`,status:version===216&&installed216?'already-installed; live forge markers verified 2026-10-12':'prepared-local; actual-live-status-must-be-checked',pending:!(version===216&&installed216),sha256:sha256(readFileSync(`supabase/${file}`))});
}
const chunks=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name.endsWith('.js'))chunks.push(file);}}
walk('.next/static/chunks');
const needles=SECRET_RULES.flatMap(rule=>[rule.name.th,rule.name.en,rule.does.th,rule.does.en,JSON.stringify(rule.requires),JSON.stringify([...rule.requires].reverse())]);
const leaks=[];
for(const file of chunks){const text=readFileSync(file,'utf8');for(const needle of needles)if(text.includes(needle))leaks.push({file,needle});}
assert.equal(leaks.length,0,`Private combo recipes entered production client chunks: ${leaks.length} hits in ${[...new Set(leaks.map(l=>l.file))].join(', ')}`);
assert.equal(Object.keys(GIFT_GUIDES).length,90);
const bundleAudit={localOnly:true,checkedAt:new Date().toISOString(),clientChunks:chunks.length,privateRecipeStrings:needles.length,leaks,guideCount:90,scope:'Static production client JS; does not assert live API installation.'};
writeFileSync('.codex/tier10/bundle-audit.json',JSON.stringify(bundleAudit,null,2)+'\n');
const pendingFileCount=migrations.filter(m=>m.pending).length;
const manifest={localOnly:true,generatedAt:new Date().toISOString(),through:251,pendingFileCount,warehouseVersion215:'Already applied by another session; table observed 2026-10-12. Do not recreate as pending.',siteDeploy:'see deployment-2026-10-12.md for deployment status',liveSql:'not performed in this session',rerun:installed216?'43 immediate pending-file reruns verified after installed v215/v216; not whole-chain rewind':'44 immediate per-file reruns verified, not whole-chain rewind on a newer database',migrations};
writeFileSync('docs/plans/town-profession-tier10/release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`${pendingFileCount} pending migration files fingerprinted; ${chunks.length} production client chunks contain none of ${needles.length} private recipe strings; ${Object.keys(GIFT_GUIDES).length} public guides.`);
