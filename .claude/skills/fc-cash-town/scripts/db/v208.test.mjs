import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse,put}=await import('@/lib/town/trade');
const {fieldProcess,FIELD_RECIPES}=await import('@/lib/town/reward-field');
const {dayOf}=await import('@/lib/town/stamina');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00');let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
try{
 await db.exec(readFileSync('supabase/v207_the_minerals_and_parts_we_earned.sql','utf8'));
 const cook=(await one("select pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure) d")).d;
 const sql=readFileSync('supabase/v208_working_with_wood_and_minerals_on_the_road.sql','utf8');await db.exec(sql);await db.exec(sql);
 eq((await one("select pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure) d")).d,cook);
 eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v208_verified).every(v=>v===true),true);
 for(const kind of ['wood','mineral'])for(const [id,r] of Object.entries(FIELD_RECIPES[kind])){
  const gift=kind==='wood'?'thingPocketSawmill':'famDwarf';let bag=Array(20).fill(null);for(const [item,n]of r.needs)bag=put(bag,item,n*4);for(const item of r.in)bag=put(bag,item,1);
  const p={...newPurse(),bag,made:[id],gifts:{had:[gift],charms:[],familiar:kind==='mineral'?'famDwarf':null},stamina:{day:dayOf(now),left:50}};
  for(const q of [p,{...p,made:[]},{...p,bag:[]},{...p,gifts:{...p.gifts,familiar:null}}, {...p,gifts:{...p.gifts,had:[]}}]){
   const got=(await one('select town.reward_process($1::jsonb,$2::jsonb,$3) r',[JSON.stringify(q),JSON.stringify({kind,recipe:id}),now])).r;
   eq(got,fieldProcess(q,kind,id,now));
  }
 }
 writeFileSync('.codex/tier10/v208-validation.json',JSON.stringify({checks,localOnly:true},null,2));console.log(`v208: ${checks} PostgreSQL parity, ownership, recipe, rerun and preservation checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
