import{readFileSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{nursery,nurseryNode}=await import('@/lib/town/reward-nursery'),{trailAnswer}=await import('@/lib/town/reward-trails'),db=await rewardDB(225),now=Date.parse('2026-10-11T12:00:00+07:00'),at=[40,32],request='00000000-0000-4000-8000-000000000926';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++},p={...newPurse(),bag:[{item:'axe',n:1},{item:'pineNut',n:3},...Array(6).fill(null)],hand:'axe',handAt:0,gifts:{had:['thingTinyForest'],charms:[]}},proof=['pine','ironwood','moonwood','elder'];
const call=async(p,input,t=now,seed=123,known=proof,id=request)=>(await one('select town.reward_nursery($1::jsonb,$2::jsonb,$3::uuid,$4::jsonb,$5,$6) r',[JSON.stringify(p),JSON.stringify(input),id,JSON.stringify(known),t,seed])).r;
try{
 const sql=readFileSync('supabase/v226_three_living_trees_inside_a_bottle.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(const seed of [0,123,4294967295])for(const kind of proof){
  const input={action:'nurseryBegin',kinds:[kind,kind,kind],at},made=await call(p,input,now,seed);eq(made,nursery(p,input,request,now,seed,proof));if(!made.ok)throw Error('No nursery');
  for(let stage=0;stage<3;stage++)for(const part of ['wood','bark','sap','seed','root']){
   const before={...made.purse,professionRewards:{...made.purse.professionRewards,nursery:{...made.nursery,next:stage}}},stageInput={action:'nurseryStage',nursery:request,part,at},s=await call(before,stageInput);eq(s,nursery(before,stageInput,request,now,123));
   const answers=trailAnswer(nurseryNode(s.nursery)),end={action:'nurseryEnd',nursery:request,challenge:request,answers,at};eq(await call(s.purse,end,now+3000),nursery(s.purse,end,request,now+3000,123));
   const wrong=answers.slice();wrong[0]=stage===2?0:(wrong[0]+1)%3;const miss={...end,answers:wrong};eq(await call(s.purse,miss,now+3000),nursery(s.purse,miss,request,now+3000,123));
  }
 }
 const begin={action:'nurseryBegin',kinds:['pine','pine','pine'],at},made=await call(p,begin),stage={action:'nurseryStage',nursery:request,part:'wood',at},s=await call(made.purse,stage),end={action:'nurseryEnd',nursery:request,challenge:request,answers:trailAnswer(nurseryNode(s.nursery)),at};
 eq(await call(s.purse,end,now+100),{ok:false,why:'none'});eq(await call(s.purse,{...end,at:[43,32]},now+3000),{ok:false,why:'far'});eq(await call(s.purse,{...stage,part:'sap'}),{ok:false,why:'none'});
 const full={...s.purse,bag:[{item:'axe',n:1},{item:'log',n:30}]};eq(await call(full,end,now+3000),{ok:false,why:'full'});eq(await call(s.purse,end,now+3000),nursery(s.purse,end,request,now+3000,123));
 eq(await call(p,{...begin,kinds:['pine','pine','moonwood']},now,123,[]),{ok:false,why:'none'});eq(await call({...p,bag:[{item:'axe',n:1},{item:'pineNut',n:3,water:1}]},begin),{ok:false,why:'none'});
 const cancelled=await call(s.purse,{action:'nurseryCancel',nursery:request,at});eq(cancelled,nursery(s.purse,{action:'nurseryCancel',nursery:request,at},request,now,123));eq(cancelled.purse.gifts.used.thingTinyForest.n,1);
 const resumed=await call(s.purse,stage,now+86400000);eq(resumed,nursery(s.purse,stage,request,now+86400000,123));
 const a=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now}::bigint$$;`);await db.query('select town.purse_of($1,true)',[a]);await db.query('select town.keep_purse($1,$2::jsonb)',[a,JSON.stringify(p)]);await db.query("select town.note($1,'fell','elder',1,0,'{}'::jsonb)",[a]);
 const rpc=async(input,id=crypto.randomUUID())=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(input)])).r;
 eq((await rpc({action:'nurseryLook',at})).ok,true);eq((await one('select town.purse_of($1,true) p',[a])).p.professionRewards.treeKinds.includes('elder'),true);
 const b=await rpc({...begin,kinds:['elder','pine','pine']},request);eq(b.ok,true);eq((await one('select town.purse_of($1,true) p',[a])).p.bag[1],null);const cid=crypto.randomUUID(),opened=await rpc({...stage,part:'wood'},cid);eq(opened.ok,true);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now+3000}::bigint$$;`);
 const id=crypto.randomUUID(),cmd={...end,challenge:cid,answers:trailAnswer(nurseryNode(opened.nursery))},ended=await rpc(cmd,id);eq(ended.got,[['cedarSliver',1]]);eq(ended.nursery.next,1);
 await db.query('update public.town_purses set coins=6789 where member_id=$1',[a]);eq((await rpc(cmd,id)).got,ended.got);eq((await one('select town.purse_of($1,true) p',[a])).p.coins,6789);eq((await one('select town.purse_of($1,true) p',[a])).p.professionRewards.nursery.next,1);
 eq((await one("select has_function_privilege('authenticated','town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)','EXECUTE') a")).a,false);
 writeFileSync('.codex/tier10/v226-validation.json',JSON.stringify({checks,localOnly:true,finiteThreeTrees:true,knownKinds:true,realSeeds:true,choicesLocked:true,replay:true},null,2));console.log(`v226: ${checks} nursery choices, costs, finite stages, misses, day resume, full bag and replay checks passed.`);
}catch(e){console.error(e.stack,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
