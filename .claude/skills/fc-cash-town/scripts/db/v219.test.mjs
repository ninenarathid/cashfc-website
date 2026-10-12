import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf,staminaOf}=await import('@/lib/town/stamina'),{beginCore,coreAction}=await import('@/lib/town/reward-core'),{trailAnswer}=await import('@/lib/town/reward-trails'),{floorSpots}=await import('@/lib/town/cave-state'),{caveLayout}=await import('@/lib/town/mining-row'),{oreOf}=await import('@/lib/town/mining');
const db=await rewardDB(218),now=Date.parse('2026-10-11T12:00:00+07:00'),id='00000000-0000-4000-8000-000000000919';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const player=f=>({...newPurse(),bag:[{item:'pick',n:1},...Array(16).fill(null)],hand:'pick',handAt:0,stamina:{day:dayOf(now),left:50},gifts:{had:['thingCoreSpade'],charms:[],familiar:null},professionRewards:{visited:[f],minerals:[oreOf(f),'chipRuby']}});
try{
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v219_')),'utf8'),old=(await one("select pg_get_functiondef('town.shared_read(text,bigint,jsonb,text,jsonb)'::regprocedure) d")).d;
 await db.exec(sql);await db.exec(sql);eq((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v219_verified,{helper_private:true,core_ready:true});eq((await one("select pg_get_functiondef('town.shared_read(text,bigint,jsonb,text,jsonb)'::regprocedure) d")).d,old);
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 for(const t of [now,now+86400000])await db.query('insert into public.town_cave_days(day,floor,layout) select $1,ord::integer,v from jsonb_array_elements($2::jsonb) with ordinality a(v,ord) on conflict do nothing',[dayOf(t),JSON.stringify(Array.from({length:30},(_,i)=>caveLayout(i+1,dayOf(t))))]);
 const call=async(p,input,t=now,seed=123,request=id)=>(await one('select town.reward_core($1::jsonb,$2::uuid,$3::uuid,$4::jsonb,$5,$6) r',[JSON.stringify(p),member,request,JSON.stringify(input),t,seed])).r;
 const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 for(const f of [1,3,10,20,30])for(const seed of [0,123,4294967295]){
  const p=player(f),at=floorSpots(f,dayOf(now)).arrive,input={action:'coreBegin',floor:f,at},b=await call(p,input,now,seed);eq(b,beginCore(p,f,id,at,now,seed));let q=b.purse;
  for(const [i,route] of ['ore','crystal','safe'].entries()){
   const req=uid(920+i),t=now+i*6000,cmd={action:'coreRoom',core:id,route,at},s=await call(q,cmd,t,seed,req);eq(s,coreAction(q,cmd,req,t));
   const change={...cmd,route:route==='ore'?'safe':'ore'};eq(await call(s.purse,change,t),coreAction(s.purse,change,id,t));
   const end={action:'coreEnd',core:id,challenge:req,answers:trailAnswer(s.core.room.node),at};
   eq(await call(s.purse,end,t+100),coreAction(s.purse,end,id,t+100));
   const d=await call(s.purse,end,t+3000);eq(d,coreAction(s.purse,end,id,t+3000));q=d.purse;
   eq(await call(q,end,t+4000),coreAction(q,end,id,t+4000));
  }
  eq(q.professionRewards.core,null);eq(staminaOf(q,now+16000),41);
 }
 const f=3,p=player(f),at=floorSpots(f,dayOf(now)).arrive,b=await call(p,{action:'coreBegin',floor:f,at});
 for(const bad of [{...p,hand:null},{...p,professionRewards:{}},{...p,gifts:{had:[],charms:[],familiar:null}}])eq(await call(bad,{action:'coreBegin',floor:f,at}),beginCore(bad,f,id,at,now,123));
 const s=await call(b.purse,{action:'coreRoom',core:id,route:'crystal',at}),end={action:'coreEnd',core:id,challenge:id,answers:trailAnswer(s.core.room.node).map(n=>(n+1)%3),at},miss=await call(s.purse,end,now+3000);eq(miss,coreAction(s.purse,end,id,now+3000));
 const t=now+86400000,cmd={action:'coreRoom',core:id,route:'crystal',at:floorSpots(f,dayOf(t)).arrive};eq(await call(miss.purse,cmd,t),coreAction(miss.purse,cmd,id,t));
 const full={...s.purse,bag:[{item:'pick',n:1}]},success={...end,answers:trailAnswer(s.core.room.node)};eq(await call(full,success,now+3000),coreAction(full,success,id,now+3000));eq((await call(full,success,now+3000)).why,'full');
 eq(await call({...s.purse,hand:null},{action:'coreCancel',core:id,at}),coreAction({...s.purse,hand:null},{action:'coreCancel',core:id,at},id,now));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");
 await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(p)]);
 const rpc=async(cmd,req)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[req,JSON.stringify(cmd)])).r,begin={action:'coreBegin',floor:f,at};eq((await rpc(begin,id)).ok,true);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);eq((await rpc(begin,id)).core.id,id);eq((await one('select town.purse_of($1,true) p',[member])).p.coins,9876);
 eq((await rpc({...begin,floor:4},id)).why,'none');const opened=await rpc({action:'coreRoom',core:id,route:'safe',at},uid(990));eq(opened.ok,true);
 await db.query("select set_config('test.reward.clock',$1,false)",[String(now+3000)]);const close={action:'coreEnd',core:id,challenge:uid(990),answers:trailAnswer(opened.core.room.node),at};eq((await rpc(close,uid(991))).got,[['stone',2]]);eq((await rpc(close,uid(991))).got,[['stone',2]]);
 const saved=(await one('select town.purse_of($1,true) p',[member])).p;eq(saved.professionRewards.core.next,1);eq(saved.gifts.used.thingCoreSpade.n,1);eq(saved.bag.find(s=>s?.item==='stone').n,2);
 writeFileSync('.codex/tier10/v219-validation.json',JSON.stringify({checks,localOnly:true,threeRoomBudget:true,routeLocked:true,dayResume:true,currentPurseReplay:true},null,2));console.log(`v219: ${checks} SQL/TS, route, budget, cost, resume, full-bag, RPC replay and privacy checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
