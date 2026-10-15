import {rewardDB} from './reward-db.mjs';
import {readFileSync,readdirSync} from 'node:fs';
export async function rewardAuditDB(){
 const db=await rewardDB(251);
 try{
  // v256 admin identity and v257 auth sessions do not redefine reward functions.
  for(const name of readdirSync('supabase').filter(f=>/^v(252|253|254|255)_/.test(f)).sort()){
   try{await db.exec(readFileSync('supabase/'+name,'utf8'));}catch(e){throw Error(name+': '+e.message);}
  }
  return db;
 }catch(e){await db.close();throw e;}
}
