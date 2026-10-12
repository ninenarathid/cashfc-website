import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{waterRelay}=await import('@/lib/town/reward-relay'),db=await rewardDB(221),now=Date.parse('2026-10-11T12:00:00+07:00');let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++},base={...newPurse(),bag:[{item:'waterCart',n:1},{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:1,gifts:{had:['famWaterRelay'],familiar:'famWaterRelay'}};
const call=async(p,input,trace={})=>(await one('select town.reward_relay($1::jsonb,$2::jsonb,$3,$4::jsonb) r',[JSON.stringify(p),JSON.stringify(input),now,JSON.stringify(trace)])).r;
try{
 const sql=readFileSync('supabase/v222_water_to_our_waiting_container.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(const item of ['bucket','bucketIron','waterYoke','waterYokeGreat','waterCart'])for(const volume of [1,2,4,6]){
  const p={...base,bag:[{item,n:1},{item:'waterCart',n:1,water:volume},null]},place={action:'relayPlace',slot:0,at:[20,20]},a=waterRelay(p,place,now),b=await call(p,place);eq(b,a);
  const input={action:'relaySend',at:[55,20]},trace={kind:'moon',hands:['00000000-0000-4000-8000-000000000001']},sent=await call(b.purse,input,trace);eq(sent,waterRelay(a.purse,input,now,trace));
  if(sent.ok){eq(await call(sent.purse,{action:'relaySend',at:[55,20]}),{ok:false,why:'none'});eq(await call(sent.purse,{action:'relayTake',at:[20,21]}),waterRelay(sent.purse,{action:'relayTake',at:[20,21]},now));}
 }
 const placed=await call(base,{action:'relayPlace',slot:0,at:[20,20]});
 for(const at of [[61,20],[128,20],[-1,0],[144,112]])eq(await call(placed.purse,{action:'relaySend',at}),{ok:false,why:'far'});
 for(const slot of [-1,0.1,null,'0',99])eq(await call(base,{action:'relayPlace',slot,at:[20,20]}),{ok:false,why:'none'});
 eq(await call({...placed.purse,bag:[{item:'stone',n:1}]},{action:'relayTake',at:[20,20]}),{ok:false,why:'full'});
 const me=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me]);await db.query('select town.purse_of($1,true)',[me]);await db.query('select town.keep_purse($1,$2::jsonb)',[me,JSON.stringify(base)]);
 await db.query("insert into public.town_line_water(member_id,item,hands,kind) values($1,'waterCart',array[$1::uuid],'moon') on conflict(member_id,item) do update set hands=excluded.hands,kind=excluded.kind",[me]);
 const rpc=async(input,id=crypto.randomUUID())=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(input)])).r;
 eq((await rpc({action:'relayPlace',slot:0,at:[20,20]})).ok,true);eq((await rpc({action:'relaySend',at:[55,20]})).moved,6);
 await db.query("update public.town_line_water set kind='rain',hands='{}' where member_id=$1",[me]);
 const request=crypto.randomUUID(),input={action:'relayTake',at:[20,20]};eq((await rpc(input,request)).ok,true);eq((await one("select kind,hands from public.town_line_water where member_id=$1 and item='waterCart'",[me])),{kind:'moon',hands:[me]});
 await db.query('update public.town_purses set coins=1234 where member_id=$1',[me]);eq((await rpc(input,request)).ok,true);eq((await one('select town.purse_of($1,true) p',[me])).p.coins,1234);
 eq((await one("select count(*)::integer n from public.town_line_water where member_id=$1",[me])).n,1);
 eq((await one("select has_function_privilege('anon','public.town_reward(uuid,jsonb)','EXECUTE') a,has_function_privilege('authenticated','town.reward_relay(jsonb,jsonb,bigint,jsonb)','EXECUTE') h")).a,false);
 writeFileSync('.codex/tier10/v222-validation.json',JSON.stringify({checks,localOnly:true,conserved:true,provenance:true,replay:true},null,2));console.log(`v222: ${checks} container/volume parity, map boundaries, provenance and replay checks passed.`);
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
