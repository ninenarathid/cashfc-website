import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade');
const {beginExtraction,endExtraction,extractionSource,extractionMarks}=await import('@/lib/town/reward-actions');
const {dayOf}=await import('@/lib/town/stamina');
const {stowAll}=await import('@/lib/town/pouches');
const {scanMineral,learnMinerals}=await import('@/lib/town/reward-actions');
const db=await tier10DB(),sql=readFileSync('supabase/v207_the_minerals_and_parts_we_earned.sql','utf8');
const one=async(q,args=[])=>(await db.query(q,args)).rows[0];
const request='00000000-0000-4000-8000-000000000111',now=Date.parse('2026-10-11T12:00:00+07:00');
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
try{
 const before=await one('select (select count(*) from public.town_purses) n,(select jsonb_agg(to_jsonb(p) order by member_id) from public.town_purses p) doc');
 await db.exec(sql);await db.exec(sql);
 eq(await one('select (select count(*) from public.town_purses) n,(select jsonb_agg(to_jsonb(p) order by member_id) from public.town_purses p) doc'),before);
 const verified=(await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v207_verified;eq(Object.values(verified).every(v=>v===true),true);
 const privateFns=['town.reward_minerals(jsonb)','town.reward_learn(jsonb,jsonb)','town.reward_extract(jsonb,uuid,jsonb,bigint)','town.reward_scan(jsonb,jsonb,text,bigint)','town.fell_v207(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)','town.stow_all_v207(jsonb,jsonb)'];
 for(const sig of privateFns)eq((await one('select has_function_privilege($1,$2,\'EXECUTE\') p',['authenticated',sig])).p,false);
 const p={...newPurse(),bag:Array(10).fill(null),gifts:{had:['thingOreCompass','thingForesterKnife'],charms:[],familiar:null},stamina:{day:dayOf(now),left:50}};
 const rocks=Array.from({length:20},(_,id)=>[id,10+id,10,0]);
 const g={floor:0,at:[10,10],rocks,cave:{},crystal:null,today:{way:null,crystal:null},element:'fire'};
 const known=learnMinerals(p,[['shardCopper',1],['chipRuby',1]]),fates=new Map();
 for(const r of rocks)fates.set(r[0],(await one('select town.mine_holds(town.mine_word(),0,$1,town.mine_turn($2),$3::jsonb,town.mine_pick($4::jsonb)) r',[r[0],now,JSON.stringify(g.today),JSON.stringify(p)])).r);
 for(const mineral of ['shardCopper','chipRuby']){
  const d=(await one('select town.reward_scan($1::jsonb,$2::jsonb,$3,$4) r',[JSON.stringify(known),JSON.stringify(g),mineral,now])).r;
  eq(d,scanMineral(known,mineral,g.at,now,{rocks:rocks.map(([id,x,y,look])=>({id,x,y,look})),ore:'shardCopper',gem:'chipRuby',stands:()=>true,fate:id=>fates.get(id)}));
 }
 const source=extractionSource(p,7,[10,10],'wood','heart',now),input={action:'extractBegin',part:'bark',at:[10,10]};
 const b=(await one('select town.reward_extract($1::jsonb,$2::uuid,$3::jsonb,$4) r',[JSON.stringify(source),request,JSON.stringify(input),now])).r;
 const expected=beginExtraction(source,request,'bark',[10,10],now,b.run.seed);eq(b,expected);
 for(const marks of [extractionMarks(b.run.seed),[0,0,0]]) for(const t of [now+1000,now+3000,now+100000]){
   const i={action:'extractEnd',run:request,marks,at:[10,10]};
   const d=(await one('select town.reward_extract($1::jsonb,$2::uuid,$3::jsonb,$4) r',[JSON.stringify(b.purse),request,JSON.stringify(i),t])).r;
   eq(d,endExtraction(b.purse,request,marks,[10,10],t));
 }
 for(const gift of ['thingSack','thingBundle'])for(const item of ['shardCopper','wholeGeode','pineBark','heartwood']){
   const own={...p,gifts:{...p.gifts,had:[...p.gifts.had,gift]}},got=[[item,2]];
   eq((await one('select town.stow_all($1::jsonb,$2::jsonb) r',[JSON.stringify(own),JSON.stringify(got)])).r,stowAll(own,got));
 }
 // The actual member RPC replays a receipt against the current purse, never an old purse snapshot.
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);
 await db.query('select town.purse_of($1,true)',[member]);
 const clock=(await one('select town.now_ms() n')).n;
 await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify({...source,professionRewards:{...source.professionRewards,extraction:{...source.professionRewards.extraction,until:Number(clock)+180000}}})]);
 const a=(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 eq(a.ok,true);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);
 const retry=(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 eq(retry.run,a.run);eq((await one('select coins from public.town_purses where member_id=$1',[member])).coins,9876);
 eq((await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify({...input,part:'sap'})])).r.ok,false);
 eq((await one("select position('town.shared_read(' in pg_get_functiondef('public.town_bugs()'::regprocedure))>0 preserved")).preserved,true);
 writeFileSync('.codex/tier10/v207-validation.json',JSON.stringify({checks,verified,localOnly:true},null,2));
 console.log(`v207: ${checks} PostgreSQL parity, privilege, rerun, replay and preservation checks passed.`);
}catch(e){console.error(e.stack?.split('\n').slice(0,6).join('\n')??e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
