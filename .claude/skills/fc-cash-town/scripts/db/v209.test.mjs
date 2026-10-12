import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade');
const {beginTrail,trailAction,trailAnswer}=await import('@/lib/town/reward-trails');
const {SPOTS}=await import('@/lib/town/forest');
const {dayOf}=await import('@/lib/town/stamina');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),at=[SPOTS[10].x,SPOTS[10].y],id='00000000-0000-4000-8000-000000000222';let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(p,input,request,t,seed=null)=>(await one('select town.reward_trail($1::jsonb,$2::uuid,$3::jsonb,$4,$5) r',[JSON.stringify(p),request,JSON.stringify(input),t,seed])).r;
try{
 for(const name of ['v207_the_minerals_and_parts_we_earned.sql','v208_working_with_wood_and_minerals_on_the_road.sql'])await db.exec(readFileSync(`supabase/${name}`,'utf8'));
 const sql=readFileSync('supabase/v209_personal_traces_under_the_forest_canopy.sql','utf8');await db.exec(sql);await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v209_verified).every(v=>v===true),true);
 const player={...newPurse(),bag:Array(20).fill(null),stamina:{day:dayOf(now),left:50},gifts:{had:['thingForestRing','thingStarBottle'],charms:[],familiar:null}};
 for(const kind of ['forest','star'])for(const seed of [0,1,16,123,123456,4294967295]){
  const input={action:'trailBegin',kind,at},b=await call(player,input,id,now,seed);eq(b,beginTrail(player,kind,id,at,now,seed));let p=b.purse;
  for(let i=0;i<3;i++){
   const trail=p.professionRewards.trail,node=trail.nodes[i],request=`00000000-0000-4000-8000-00000000000${i}`;
   const stage={action:'trailStage',trail:id,at:node.at},s=await call(p,stage,request,now+i*10000);eq(s,trailAction(p,stage,request,now+i*10000));
   const end={action:'trailEnd',trail:id,challenge:request,answers:trailAnswer(node),at:node.at};
   for(const t of [now+i*10000+1000,now+i*10000+3000,now+i*10000+100000])eq(await call(s.purse,end,request,t),trailAction(s.purse,end,request,t));
   const won=await call(s.purse,end,request,now+i*10000+3000);p=won.purse;
   eq(await call(p,end,request,now+i*10000+4000),trailAction(p,end,request,now+i*10000+4000));
  }
 }
 const b=await call({...player,bag:[]},{action:'trailBegin',kind:'forest',at},id,now,123),node=b.trail.nodes[0],stage={action:'trailStage',trail:id,at:node.at},s=await call(b.purse,stage,id,now);
 const end={action:'trailEnd',trail:id,challenge:id,answers:trailAnswer(node),at:node.at};eq(await call(s.purse,end,id,now+3000),{ok:false,why:'full'});
 // Actual member commands share the persistent receipt layer and preserve newer wallet data.
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);
 await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);
 await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");
 await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(player)]);
 const publicCall=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 const opened=await publicCall({action:'trailBegin',kind:'forest',at},id);eq(opened.ok,true);
 const first=opened.trail.nodes[0],stageId='00000000-0000-4000-8000-000000000333';
 eq((await publicCall({action:'trailStage',trail:id,at:first.at},stageId)).ok,true);
 await db.query("select set_config('test.reward.clock',$1,false)",[String(now+3000)]);
 const finish={action:'trailEnd',trail:id,challenge:stageId,answers:trailAnswer(first),at:first.at},finishId='00000000-0000-4000-8000-000000000444';
 const paid=await publicCall(finish,finishId);eq(paid.ok,true);eq(paid.got,[['forestLichen',1]]);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);
 eq((await publicCall(finish,finishId)).got,paid.got);eq((await one('select coins from public.town_purses where member_id=$1',[member])).coins,9876);
 eq((await one("select town.held(town.purse_of($1,true)->'bag','forestLichen') n",[member])).n,1);
 writeFileSync('.codex/tier10/v209-validation.json',JSON.stringify({checks,fixtureAt:at,localOnly:true},null,2));console.log(`v209: ${checks} PostgreSQL parity, finite-budget, checkpoint, expiry, rerun and full-bag checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
