import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{beginResource,resourceAction}=await import('@/lib/town/reward-resources'),{resourceCorrection}=await import('@/lib/town/private/combos'),{trailAnswer}=await import('@/lib/town/reward-trails');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),at=[50,24],id='00000000-0000-4000-8000-000000000666';let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(p,input,t=now,seed=123)=>(await one('select town.reward_resource($1::jsonb,$2::uuid,$3::jsonb,$4,$5) r',[JSON.stringify(p),id,JSON.stringify(input),t,seed])).r;
try{
 for(const n of [207,208,209,210,211])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v211_')),'utf8');await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v211_verified).every(v=>v===true),true);
 const p={...newPurse(),bag:[{item:'gemRuby',n:5},{item:'gemSapphire',n:5},{item:'sparkPowder',n:5},...Array(7).fill(null)],stamina:{day:dayOf(now),left:40},gifts:{had:['charmGemColor','famSprite'],charms:['charmGemColor'],familiar:'famSprite'}};
 for(const seed of [0,123,4294967295]){
  const begin={action:'resourceBegin',kind:'color',recipe:'gemRuby:gemSapphire:gemRuby',at},b=await call(p,begin,now,seed);eq(b,beginResource(p,'color',begin.recipe,id,at,now,seed));
  const wrong=trailAnswer(b.resource.node).map(n=>(n+1)%3),miss={action:'resourceEnd',run:id,answers:wrong,at};
  const retry=await call(b.purse,miss,now+3000);eq(retry,resourceAction(b.purse,miss,now+3000,resourceCorrection));eq(retry.correction,true);eq(retry.purse.bag,p.bag);eq(retry.purse.combos.used.gemCorrection.n,1);
  eq(await call(retry.purse,miss,now+4000),resourceAction(retry.purse,miss,now+4000,resourceCorrection));
  eq(await call(retry.purse,miss,now+6000),resourceAction(retry.purse,miss,now+6000,resourceCorrection));
  const correct={...miss,answers:trailAnswer(retry.resource.node)};eq(await call(retry.purse,correct,now+6000),resourceAction(retry.purse,correct,now+6000,resourceCorrection));
  const removed={...b.purse,gifts:{...p.gifts,familiar:null}};eq(await call(removed,miss,now+3000),resourceAction(removed,miss,now+3000,resourceCorrection));
  const exhausted={...b.purse,combos:retry.purse.combos,professionRewards:{...b.purse.professionRewards,resource:{...b.resource,id:'next'}}},nextMiss={...miss,run:'next'};eq(await call(exhausted,nextMiss,now+3000),resourceAction(exhausted,nextMiss,now+3000,resourceCorrection));eq((await call(exhausted,nextMiss,now+3000)).correction,undefined);
  const atStart={...p,gifts:{...p.gifts,familiar:null}},noSprite=await call(atStart,begin,now,seed),switched={...noSprite.purse,gifts:p.gifts};eq(await call(switched,miss,now+3000),resourceAction(switched,miss,now+3000,resourceCorrection));
 }
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(p)]);
 const publicCall=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 const b=await publicCall({action:'resourceBegin',kind:'color',recipe:'gemRuby:gemSapphire:gemRuby',at},id);eq(b.ok,true);
 await db.query("select set_config('test.reward.clock',$1,false)",[String(b.resource.began+3000)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");
 const wrong=trailAnswer(b.resource.node).map(n=>(n+1)%3),finish={action:'resourceEnd',run:id,answers:wrong,at},finishId='00000000-0000-4000-8000-000000000667',retry=await publicCall(finish,finishId);eq(retry.correction,true);
 await publicCall(finish,finishId);const state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.combos.used.gemCorrection.n,1);eq(state.combos.found.filter(x=>x.key==='SC15').length,1);eq(state.bag,p.bag);
 writeFileSync('.codex/tier10/v211-validation.json',JSON.stringify({checks,localOnly:true},null,2));console.log(`v211: ${checks} private-rule, snapshot, one-correction, budget and RPC replay checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
