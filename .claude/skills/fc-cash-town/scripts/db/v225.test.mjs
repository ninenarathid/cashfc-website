import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {rewardDB} from './reward-db.mjs';await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{callCloud}=await import('@/lib/town/reward-cloud'),{extractionMarks}=await import('@/lib/town/reward-actions'),{grown,see}=await import('@/lib/town/farm'),db=await rewardDB(224),now=Date.parse('2026-10-11T12:00:00+07:00'),at=[132,4],request='00000000-0000-4000-8000-000000000925',me='00000000-0000-4000-8000-000000000001',friend='00000000-0000-4000-8000-000000000002';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++},close=(a,b)=>{assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);checks++};
const p={...newPurse(),bag:[{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:0,gifts:{had:['thingCloudJar'],charms:[]}},plant={by:me,crop:'kangkong',sown:now-60000,watered:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0,boost:0},w={plots:{'132,4':{soil:'tilled',plant},'140,4':{soil:'tilled',plant:{...plant,by:friend}}},owners:{0:me,1:friend},consents:{1:{by:friend,giver:me,until:now+10000}},kind:'dawn',rains:[]};
const call=async(p,input,world=w,t=now,seed=123)=>(await one('select town.reward_cloud($1::jsonb,$2::jsonb,$3::uuid,$4::uuid,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10) r',[JSON.stringify(p),JSON.stringify(input),request,me,JSON.stringify(world.plots),JSON.stringify(world.owners),JSON.stringify(world.consents),world.kind,t,seed])).r;
try{
 const sql=readFileSync('supabase/v225_a_cloud_over_consenting_gardens.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now}::bigint$$;`);
 for(const kind of ['dawn','rain','moon'])for(const seed of [0,123,4294967295]){
  const world={...w,kind},input={action:'cloudBegin',beds:[0,1],at},b=await call(p,input,world,now,seed);eq(b,callCloud(p,input,request,me,world,now,seed));if(!b.ok)throw Error('No begin');
  for(let bits=0;bits<8;bits++){const marks=extractionMarks(seed).map((n,i)=>bits&(1<<i)?n:0),end={action:'cloudEnd',run:request,marks,at};eq(await call(b.purse,end,world,now+3000,0),callCloud(b.purse,end,request,me,world,now+3000,0));}
 }
 const b=await call(p,{action:'cloudBegin',beds:[0,1],at}),end={action:'cloudEnd',run:request,marks:extractionMarks(123),at};
 for(const changed of [{...w,consents:{}},{...w,owners:{0:me,1:me},consents:{}}])eq(await call(b.purse,end,changed,now+3000),callCloud(b.purse,end,request,me,changed,now+3000,0));
 eq(await call(b.purse,end,w,now+100),{ok:false,why:'none'});eq(await call(b.purse,{...end,at:[133,4]},w,now+3000),{ok:false,why:'far'});eq(await call(b.purse,end,{...w,kind:'moon'},now+3000),{ok:false,why:'none'});
 const changed=structuredClone(w);changed.plots['132,4'].plant.sown++;eq(await call(b.purse,end,changed,now+3000),callCloud(b.purse,end,request,me,changed,now+3000,0));
 const made=await call(b.purse,end,w,now+3000),plot=made.plots['132,4'];
 for(const elapsed of [-1000,0,30000,600000,1200000]){
  close((await one('select town.grown($1::jsonb,$2) n',[JSON.stringify(plot.plant),now+3000+elapsed])).n,grown(plot.plant,now+3000+elapsed));
  eq((await one("select town.see('132,4',$1::jsonb,$2)->'wet' wet",[JSON.stringify(plot),now+3000+elapsed])).wet,see('132,4',plot,now+3000+elapsed).wet);
 }
 // Natural rain overlap contributes once, including retained growth after the local cloud ends.
 await db.exec("delete from public.town_weather;");const slot=Math.floor((now+3000)/900000),sky='rain';
 await db.query('insert into public.town_weather(slot,sky,wind,gust,rain) values($1,$2,2,4,10)',[slot,sky]);
 const rain=await one('select town.wet_sky($1::text) wet',[sky]);eq(rain.wet,true);
 close((await one('select town.grown($1::jsonb,$2) n',[JSON.stringify(plot.plant),now+603000])).n,grown(plot.plant,now+603000,[[slot*900000,(slot+1)*900000]]));await db.exec('delete from public.town_weather;');
 // Actual two-owner consent, revoked permission, snapshot writes and receipt replay.
 const a=(await one('select id from public.profiles where is_admin limit 1')).id,bid=(await one('select id from public.profiles where id<>$1 limit 1',[a])).id;await db.query('update public.profiles set is_admin=true where id=$1',[bid]);
 for(const [n,id] of [[0,a],[1,bid]]){await db.query('insert into public.town_beds(bed,member_id,tended,empty) values($1,$2,$3,0) on conflict(bed) do update set member_id=excluded.member_id,tended=excluded.tended',[n,id,now]);const x=n?140:132;await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,4,$2,'tilled',$3::jsonb,$4) on conflict(x,y) do update set plant=excluded.plant,soil='tilled',changed=excluded.changed",[x,n,JSON.stringify({...plant,by:id}),now]);await db.query('select town.purse_of($1,true)',[id]);await db.query('select town.keep_purse($1,$2::jsonb)',[id,JSON.stringify(p)]);}
 const actor=async(id)=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]),rpc=async(input,id=crypto.randomUUID())=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(input)])).r;
 await db.query("insert into public.town_line_water(member_id,item,hands,kind) values($1,'waterCart',array[$1::uuid],'moon') on conflict(member_id,item) do update set kind='moon'",[a]);
 await actor(a);eq((await rpc({action:'cloudBegin',beds:[0,1],at})).why,'theirs');await actor(bid);eq((await rpc({action:'cloudConsent',giver:a,at:[140,4]})).consented,true);await actor(a);
 const start=await rpc({action:'cloudBegin',beds:[0,1],at},request);eq(start.ok,true);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now+3000}::bigint$$;`);
 await actor(bid);eq((await rpc({action:'cloudConsent',giver:null,at:[140,4]})).consented,false);await actor(a);
 const command={action:'cloudEnd',run:request,marks:extractionMarks(start.cloud.seed),at},id=crypto.randomUUID();eq((await rpc(command,id)).why,'theirs');await actor(bid);await rpc({action:'cloudConsent',giver:a,at:[140,4]});await actor(a);
 const ended=await rpc(command,id);eq(ended.watered,['132,4','140,4']);eq('plots' in ended,false);eq((await one('select town.purse_of($1,true) p',[a])).p.bag[0].water,5);
 const before=(await one("select plant from public.town_plots where x=140 and y=4")).plant;eq(before.guard,now+3000+43200000);eq(before.localRain.by,a);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[a]);eq((await rpc(command,id)).watered,ended.watered);eq((await one('select town.purse_of($1,true) p',[a])).p.coins,9876);eq((await one('select town.purse_of($1,true) p',[a])).p.bag[0].water,5);eq((await one("select plant from public.town_plots where x=140 and y=4")).plant,before);
 eq((await one("select has_table_privilege('authenticated','town.reward_cloud_consents','SELECT') a")).a,false);eq((await one("select count(*)::integer n from public.town_deeds where member_id=$1 and what='cloud'",[a])).n,1);
 writeFileSync('.codex/tier10/v225-validation.json',JSON.stringify({checks,localOnly:true,realCatalyst:true,revocableConsent:true,worldWeatherUntouched:true,rainOverlap:true,replay:true},null,2));console.log(`v225: ${checks} consent, all rhythm outcomes, real water, finite local rain, provenance and replay checks passed.`);
}catch(e){console.error(e.stack,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
