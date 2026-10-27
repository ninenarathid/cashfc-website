// v301's dry run: the giant seeds count the day only when the giant takes. Run from the repo root with FC_REPO set to it.
import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{newPurse}=await import('@/lib/town/trade'),{gardenAction,giantCells}=await import('@/lib/town/reward-garden'),{extractionMarks}=await import('@/lib/town/reward-actions'),{usesLeft}=await import('@/lib/town/gifts'),{staminaOf}=await import('@/lib/town/stamina'),{held}=await import('@/lib/town/trade'),db=await rewardDB(237),t=Date.parse('2026-10-11T12:00:00+07:00'),at=[134,6],key=at.join(','),p={...newPurse(),bag:[{item:'seedPumpkin',n:4},...Array(20).fill(null)],gifts:{had:['thingGiantSeeds'],charms:[],familiar:null}},one=async(q,a=[])=>(await db.query(q,a)).rows[0];let checks=0;const eq=(a,b,what)=>{assert.deepEqual(a,b,what);checks++;};
const ids=Array.from({length:9},(_,i)=>`00000000-0000-4000-8000-00000000930${i}`);
try{
 await db.exec(readFileSync('supabase/v238_one_giant_root_and_pollen_kept_for_tomorrow.sql','utf8'));const sql=readFileSync('supabase/v301_a_giant_root_counted_when_it_takes.sql','utf8');await db.exec(sql);await db.exec(sql);checks++;
 const me=(await one('select id from public.profiles where is_admin limit 1')).id,bed=(await one('select town.bed_of($1,$2) b',at)).b;await db.query('insert into public.town_beds(bed,member_id,tended,empty) values($1,$2,$3,0) on conflict(bed) do update set member_id=excluded.member_id,tended=excluded.tended,empty=0',[bed,me,t]);
 const plots=Object.fromEntries(giantCells(key).map(k=>[k,{soil:'tilled',plant:null}])),clear=async()=>{await db.query('delete from public.town_plots where bed=$1',[bed]);for(const k of Object.keys(plots))await db.query('insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,$3,$4,null,$5)',[...k.split(',').map(Number),bed,'tilled',t]);};await clear();
 const call=async(q,c,id,time)=>(await one('select town.reward_garden($1::jsonb,$2::jsonb,$3::uuid,$4,123,$5::uuid) r',[JSON.stringify(q),JSON.stringify(c),id,time,me])).r;
 // Each step is asked of the database and of the page's twin, and both must say the same.
 const both=async(q,c,i,time,what)=>{const d=await call(q,c,ids[i],time);eq(d,gardenAction(q,c,ids[i],time,c.action==='giantBegin'?123:0,me,plots,me,[]),what);return d;};
 const begin={action:'giantBegin',crop:'pumpkin',at},end=(i,marks)=>({action:'giantEnd',run:ids[i],marks,at});
 let d=await both(p,begin,0,t,'begin');eq(d.ok,true);eq(usesLeft(d.purse,'thingGiantSeeds',t),1,'a begin keeps the day');
 d=await both(d.purse,{action:'giantCancel',at},1,t+1000,'cancel');eq(usesLeft(d.purse,'thingGiantSeeds',t),1,'a cancel keeps the day');
 d=await both(d.purse,begin,2,t+2000,'begin after a cancel');eq(d.ok,true);
 const left=await both(d.purse,begin,3,t+2000+121000,'begin after a run ran out');eq(left.ok,true);eq(usesLeft(left.purse,'thingGiantSeeds',t),1,'a run left to run out keeps the day');
 const wrong=extractionMarks(123).map(n=>n>.5?n-.3:n+.3);d=await both(d.purse,end(2,wrong),4,t+4400,'a miss');eq(d.gardenPassed,false);eq(usesLeft(d.purse,'thingGiantSeeds',t),1,'a miss keeps the day');eq(held(d.purse.bag,'seedPumpkin'),4,'a miss keeps the seeds');eq(staminaOf(d.purse,t+4400),staminaOf(p,t)-2,'a miss costs 2 stamina');
 eq((await call(d.purse,end(2,extractionMarks(123)),ids[5],t+5000)).ok,false,'the missed run is over');
 d=await both(d.purse,begin,6,t+6000,'begin after a miss');eq(d.ok,true);
 d=await both(d.purse,end(6,extractionMarks(123)),7,t+8400,'a pass');eq(d.gardenPassed,true);eq(usesLeft(d.purse,'thingGiantSeeds',t),0,'a pass spends the day');eq(held(d.purse.bag,'seedPumpkin'),0,'a pass spends four seeds');
 await clear();eq(await both({...d.purse,bag:p.bag},begin,8,t+9000,'no second giant the same day'),{ok:false,why:'spent'});
 eq((await one("select has_function_privilege('authenticated','town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)','EXECUTE') a")).a,false,'members cannot call it directly');
 await db.exec("create or replace function town.reward_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid) returns jsonb language sql as $$select '{}'::jsonb$$");await assert.rejects(db.exec(sql),/Definition moved/);checks++;
 console.log(`v301: ${checks} checks passed (database and page agree; cancel, run out and miss keep the day; a pass spends it; guard and rerun).`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,1).slice(0,3000));process.exitCode=1;}finally{await db.close();}
