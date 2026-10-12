import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{beanAction,beanNode}=await import('@/lib/town/reward-bean'),{trailAnswer}=await import('@/lib/town/reward-trails');
const db=await rewardDB(238),t=Date.parse('2026-10-11T12:00:00+07:00'),at=[134,6],me='me',id='00000000-0000-4000-8000-000000009239',plot={soil:'tilled',plant:{by:me,crop:'longBean',sown:t,boost:0,watered:0,fed:0,guard:t+86400000,cured:0,picked:0,pickedAt:0}},p={...newPurse(),bag:[{item:'longBean',n:3},{item:'seedLongBean',n:1},...Array(8).fill(null)],gifts:{had:['thingSkyBean'],charms:[],familiar:null},gardenBook:['rowBean']};
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(q,c,time,seed)=>(await db.query('select town.reward_bean($1::jsonb,$2::jsonb,$3::uuid,$4,$5,$6,$7::jsonb) r',[JSON.stringify(q),JSON.stringify(c),id,time,seed,me,JSON.stringify(plot)])).rows[0].r;
try{
 const sql=readFileSync('supabase/v239_three_canopy_gardens_on_a_real_bean_vine.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(const seed of [0,123,4294967200]){
  const begin={action:'beanBegin',at};let d=await call(p,begin,t,seed);eq(d,beanAction(p,begin,id,t,seed,me,plot,[]));eq((await call(d.purse,begin,t,seed)).ok,false);let q=d.purse;
  for(let i=0;i<3;i++){
   const stage={action:'beanStage',run:id,at};d=await call(q,stage,t+i*3000,seed);eq(d,beanAction(q,stage,id,t+i*3000,seed,me,plot,[]));const end={action:'beanEnd',run:id,challenge:id,answers:trailAnswer(beanNode(d.bean)),at};eq((await call(d.purse,end,t+i*3000+2399,seed)).ok,false);
   if(i===2){const full={...d.purse,bag:[{item:'stone',n:9999}]};eq(await call(full,end,t+i*3000+2400,seed),{ok:false,why:'full'});}
   const e=await call(d.purse,end,t+i*3000+2400,seed);eq(e,beanAction(d.purse,end,id,t+i*3000+2400,seed,me,plot,[]));q=e.purse;
  }
  eq(q.professionRewards.bean,null);eq(q.bag.filter(Boolean).map(v=>[v.item,v.n]),[['longBean',6],['seedRowBean',1]]);
 }
 eq((await db.query("select has_function_privilege('authenticated','town.reward_bean(jsonb,jsonb,uuid,bigint,bigint,text,jsonb)','EXECUTE') a")).rows[0].a,false);
 await db.exec(sql);writeFileSync('.codex/tier10/v239-validation.json',JSON.stringify({checks,localOnly:true,finiteHarvest:true,paidSupplies:true,checkpoint:true,fullAtomic:true},null,2));console.log(`v239: ${checks} paid inputs, checkpoint, timing, finite payout, full bag, privacy and rerun checks passed.`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected}));process.exitCode=1;}finally{await db.close();}
