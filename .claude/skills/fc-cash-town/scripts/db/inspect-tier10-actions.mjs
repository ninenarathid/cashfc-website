import {writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {tier10DB} from './tier10-db.mjs';
const db=await tier10DB();
try{
 for(const n of [207,208,209,210,211,212,213])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const rows=(await db.query("select p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('town','public') and p.prokind='f' and (p.proname like '%cast%' or p.proname like '%fish%' or p.proname like '%lift%' or p.proname like '%meal%' or p.proname like '%garden%' or p.proname like '%camp%' or p.proname like '%vein%') order by 1")).rows;
 writeFileSync('.codex/tier10/action-baseline.json',JSON.stringify(rows,null,2));
 for(const r of rows)if(r.signature.startsWith('town_cast(')||r.signature.startsWith('town_lift(')||r.signature.startsWith('town.cave_held(')||r.signature.startsWith('town.cast('))writeFileSync('.codex/tier10/'+r.signature.split('(')[0].replace('town.','')+'.sql',r.definition);
 console.log(rows.map(r=>r.signature).join('\n'));
}finally{await db.close();}
