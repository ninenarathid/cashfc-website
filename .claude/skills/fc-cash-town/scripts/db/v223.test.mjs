import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');const {newPurse}=await import('@/lib/town/trade'),{conduit,conduitAnswer}=await import('@/lib/town/reward-conduit'),db=await rewardDB(222),now=Date.parse('2026-10-11T12:00:00+07:00'),at=[132,4],request='00000000-0000-4000-8000-000000000923';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const p={...newPurse(),bag:[{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:0,gifts:{had:['thingRiverHorn'],charms:[]}},bed=Object.fromEntries(Array.from({length:24},(_,i)=>[`${132+i%6},${4+Math.floor(i/6)}`,{soil:'tilled',plant:{by:'friend',crop:'kangkong',sown:now-60000,watered:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0,boost:0}}]));
const call=async(p,input,b=bed,c=0,t=now,seed=123)=>(await one('select town.reward_conduit($1::jsonb,$2::jsonb,$3::uuid,$4::jsonb,$5,$6,$7) r',[JSON.stringify(p),JSON.stringify(input),request,JSON.stringify(b),c,t,seed])).r;
try{
 const sql=readFileSync('supabase/v223_three_branches_of_real_water.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now}::bigint$$;`);
 const input={action:'conduitBegin',at};
 for(const seed of [0,123,4294967295]){
  const b=await call(p,input,bed,0,now,seed),wanted=conduit(p,input,request,bed,0,now,seed);eq(b,wanted);if(!b.ok)throw Error('No begin');
  for(let i=0;i<27;i++){const answers=[i%3,Math.floor(i/3)%3,Math.floor(i/9)%3],end={action:'conduitEnd',run:request,answers,at};eq(await call(b.purse,end,bed,0,now+3000,0),conduit(b.purse,end,request,bed,0,now+3000,0));}
 }
 const b=await call(p,input),end={action:'conduitEnd',run:request,answers:conduitAnswer(123),at};
 eq(await call(b.purse,end,bed,now+5400000,now+3000),{ok:false,why:'spent'});eq(await call(b.purse,end,bed,0,now+100),{ok:false,why:'none'});eq(await call(b.purse,{...end,at:[133,4]},bed,0,now+3000),{ok:false,why:'far'});
 const changed=structuredClone(bed),key=b.conduit.roots[0].key;changed[key].plant.sown=now+1;eq(await call(b.purse,end,changed,0,now+3000),conduit(b.purse,end,request,changed,0,now+3000,0));
 const me=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me]);await db.query('select town.purse_of($1,true)',[me]);await db.query('select town.keep_purse($1,$2::jsonb)',[me,JSON.stringify(p)]);
 for(const [key,plot] of Object.entries(bed)){const [x,y]=key.split(',').map(Number),plant={...plot.plant,by:me};await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,0,'tilled',$3::jsonb,$4) on conflict(x,y) do update set plant=excluded.plant,soil='tilled',changed=excluded.changed",[x,y,JSON.stringify(plant),now]);}
 const begin=(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;eq(begin.ok,true);end.answers=conduitAnswer(begin.conduit.seed);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now+3000}::bigint$$;`);
 const id=crypto.randomUUID(),ended=(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(end)])).r;eq(ended.watered.length,24);eq(ended.used,3);
 eq((await one('select count(*)::integer n from town.reward_conduits')).n,1);eq((await one("select count(*)::integer n from public.town_deeds where member_id=$1 and what='water'",[me])).n,24);
 await db.query('update public.town_purses set coins=1234 where member_id=$1',[me]);eq((await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(end)])).r.used,3);eq((await one('select town.purse_of($1,true) p',[me])).p.coins,1234);eq((await one("select count(*)::integer n from public.town_deeds where member_id=$1 and what='water'",[me])).n,24);
 eq((await one("select has_table_privilege('authenticated','town.reward_conduits','SELECT') a")).a,false);
 writeFileSync('.codex/tier10/v223-validation.json',JSON.stringify({checks,localOnly:true,rootIdentity:true,all27Choices:true,sharedBedCooldown:true,replay:true},null,2));console.log(`v223: ${checks} partial-route parity, replant, cooldown, actual plot writes and replay checks passed.`);
}catch(e){console.error(e.stack,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
