import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{caveLayout}=await import('@/lib/town/mining-row'),{floorSpots}=await import('@/lib/town/cave-state'),{portableLift,LIFT_MOUTH}=await import('@/lib/town/reward-lift');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),id='00000000-0000-4000-8000-000000000888';let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const player={...newPurse(),bag:[{item:'pick',n:1},...Array(9).fill(null)],hand:'pick',handAt:0,stamina:{day:dayOf(now),left:40},gifts:{had:['thingPocketLift'],charms:[],familiar:null}};
const lay=async t=>db.query('insert into public.town_cave_days(day,floor,layout) select $1,ord::integer,v from jsonb_array_elements($2::jsonb) with ordinality a(v,ord) on conflict do nothing',[dayOf(t),JSON.stringify(Array.from({length:30},(_,i)=>caveLayout(i+1,dayOf(t))))]);
try{
 for(const n of [207,208,209,210,211,212])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const old=(await one("select pg_get_functiondef('public.town_lift(integer)'::regprocedure) lift,pg_get_functiondef('town.shared_read(text,bigint,jsonb,text,jsonb)'::regprocedure) reader"));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v213_')),'utf8');await db.exec(sql);await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v213_verified).every(v=>v===true),true);
 eq((await one("select pg_get_functiondef('public.town_lift(integer)'::regprocedure) lift,pg_get_functiondef('town.shared_read(text,bigint,jsonb,text,jsonb)'::regprocedure) reader")),old);
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");await lay(now);await lay(now+86400000);
 const call=async(p,input,t=now)=>(await one('select town.reward_lift($1::jsonb,$2::uuid,$3::uuid,$4::jsonb,$5) r',[JSON.stringify(p),member,id,JSON.stringify(input),t])).r;
 for(const f of [1,3,10,20,30]){
  const input={action:'liftAnchor',floor:f,at:floorSpots(f,dayOf(now)).arrive};
  eq(await call(player,input),portableLift(player,input,id,now));
  let q={...player,professionRewards:{visited:[f]}};const b=await call(q,input);eq(b,portableLift(q,input,id,now));q=b.purse;
  for(let n=0;n<6;n++){const f_=n%2?f:0,ride={action:'liftRide',floor:f_,to:f_?0:f,at:f_?input.at:LIFT_MOUTH},d=await call(q,ride);eq(d,portableLift(q,ride,id,now));q=d.purse;}
  const ride={action:'liftRide',floor:0,to:f,at:LIFT_MOUTH};eq(await call(q,ride),portableLift(q,ride,id,now));eq(await call(q,ride,now+86400000),portableLift(q,ride,id,now+86400000));
 }
 // Old rests authorize exactly their own floors. A real old deed can be retained without eager scanning of every purse.
 const input={action:'liftAnchor',floor:3,at:floorSpots(3,dayOf(now)).arrive};
 await db.query("insert into public.town_deeds(member_id,what,n,coins,doc) values($1,'mine',1,0,'{\"floor\":3}')",[member]);eq(await call(player,input),portableLift(player,input,id,now,[3]));
 const rest={...player,mine:{rests:[10]}};eq(await call(rest,{...input,floor:10,at:floorSpots(10,dayOf(now)).arrive}),portableLift(rest,{...input,floor:10,at:floorSpots(10,dayOf(now)).arrive},id,now));
 // The normal completed mining payout remembers a floor while preserving the existing training/payout.
 const layout=caveLayout(3,dayOf(now)),r=layout.rocks[0],go=(await one('select town.mine_go($1,3,$2,$3,$4,100,false,town.cave_at(town.cave_kept(3,true),$5),$5) r',[member,r[0],...layout.arrive,now])).r;
 const struck={first:member,name:'Test',at:now,by:{[member]:1}},args=[JSON.stringify(player),JSON.stringify(go),JSON.stringify(r),JSON.stringify(struck),false,true,'test-lift'];
 const before=(await one('select town.mine_pay_v213($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) r',args)).r,after=(await one('select town.mine_pay($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) r',args)).r;
 eq(before.ok,true);eq(after.purse.professionRewards.visited,[3]);eq({...after,purse:{...after.purse,professionRewards:{...after.purse.professionRewards,visited:undefined}}},{...before,purse:{...before.purse,professionRewards:{...before.purse.professionRewards,visited:undefined}}});
 await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify({...player,professionRewards:{visited:[3]}})]);
 const rpc=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 eq((await rpc(input,id)).ok,true);
 const ride={action:'liftRide',floor:0,to:3,at:LIFT_MOUTH},rideId='00000000-0000-4000-8000-000000000889';eq((await rpc(ride,rideId)).ok,true);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);eq((await rpc(ride,rideId)).ride.at,layout.arrive);
 const state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.coins,9876);eq(state.gifts.used.thingPocketLift.n,1);
 eq((await rpc({...ride,at:[0,0]},'00000000-0000-4000-8000-000000000890')).why,'far');eq((await rpc({...ride,at:layout.arrive},'00000000-0000-4000-8000-000000000891')).why,'far');
 writeFileSync('.codex/tier10/v213-validation.json',JSON.stringify({checks,localOnly:true,currentDaySafeArrival:true,oldLiftAndReadersUnchanged:true},null,2));console.log(`v213: ${checks} exact-floor, actual-work, quota, next-day, privacy and current-purse replay checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
