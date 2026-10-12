import {mkdirSync,writeFileSync} from 'node:fs';
import {tier10DB} from './tier10-db.mjs';
const db=await tier10DB();
try {
 const rows=(await db.query("select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('town','public') and p.prokind='f' and (p.proname like '%gift%' or p.proname like '%mine%' or p.proname like '%cave%' or p.proname in ('purse_of','keep_purse','stow_all','fell','town_fell','town_lift','town_vein')) order by 1")).rows;
 mkdirSync('.codex/tier10',{recursive:true});
 writeFileSync('.codex/tier10/database-baseline.json',JSON.stringify(rows,null,2));
 console.log('Loaded current local gameplay baseline through v203/v205; recorded '+rows.length+' definitions.');
 for(const r of rows.filter(r=>['town_mine(','town_mine_peek(','town.cave_held('].some(s=>r.signature.startsWith(s))))console.log(r.definition);
}finally{await db.close();}
