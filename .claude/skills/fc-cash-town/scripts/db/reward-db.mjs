import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tier10DB} from './tier10-db.mjs';
/** All work is local. Include the installed warehouse and newer gem rules before deriving wrappers. */
export async function rewardDB(through=217,{rerun=false}={}){
 const db=await tier10DB();
 try{
  for(let n=207;n<=through;n++){
   const file=readdirSync('supabase').find(f=>f.startsWith(`v${n}_`));
   if(file){const sql=readFileSync('supabase/'+file,'utf8');await db.exec(sql);if(rerun)await db.exec(sql);}
   else if(n===215)await db.exec(execFileSync('git',['show','b574ac39^:supabase/v215_a_warehouse_for_friends_on_other_shifts.sql'],{encoding:'utf8'}));
   else throw Error(`Missing reward-chain migration v${n}`);
  }
  return db;
 }catch(e){await db.close();throw e;}
}
