import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{FISH,FISH_IDS}=await import('@/lib/town/items'),{dayOf}=await import('@/lib/town/stamina'),{startSchool,schoolWeights}=await import('@/lib/town/reward-fishing');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),fish=FISH_IDS.find(id=>FISH[id].tier!=='legend'),other=FISH_IDS.find(id=>id!==fish),legend=FISH_IDS.find(id=>FISH[id].tier==='legend'),pool=[{what:fish,p:.2},{what:other,p:.8}];let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const p={...newPurse(),bag:[{item:'rod',n:1},{item:'worm',n:30},...Array(8).fill(null)],stamina:{day:dayOf(now),left:40},best:{[fish]:30},gifts:{had:['thingSchoolBell','thingRod','thingBait'],charms:[],familiar:null}};
const start=async(p,fish,odds,t=now)=>(await one('select town.reward_school_start($1::jsonb,$2,$3::jsonb,$4) r',[JSON.stringify(p),fish,JSON.stringify(odds),t])).r;
const weight=async(p,odds,star,t=now)=>(await one('select town.reward_school_weights($1::jsonb,$2::jsonb,$3,$4) r',[JSON.stringify(p),JSON.stringify(odds),star,t])).r;
try{
 for(const n of [207,208,209,210,211,212])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v212_')),'utf8');await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v212_verified).every(v=>v===true),true);
 const b=await start(p,fish,pool);eq(b,startSchool(p,fish,pool,now));let q=b.purse;
 for(let i=0;i<4;i++){const d=await weight(q,pool,false);eq(d,schoolWeights(q,pool,false,now));q=d.purse;}
 for(const [odds,star,t]of [[pool,true,now],[pool,false,now+1800000],[[{what:other,p:1}],false,now]])eq(await weight(b.purse,odds,star,t),schoolWeights(b.purse,odds,star,t));
 for(const [bad,f,odds]of [[{...p,best:{}},fish,pool],[{...p,gifts:{had:[],charms:[],familiar:null}},fish,pool],[p,fish,[]],[{...p,best:{[legend]:30}},legend,[{what:legend,p:1}]]])eq(await start(bad,f,odds),startSchool(bad,f,odds,now));
 eq(await start(b.purse,fish,pool),startSchool(b.purse,fish,pool,now));
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");await db.query('select town.purse_of($1,true)',[member]);
 const key=(await one("select key from jsonb_each(town.cat('fishing')->'places') order by key limit 1")).key,at=key.split(',').map(Number),input={action:'schoolStart',fish,bait:'worm',at};
 const eligible=(await one('select town.reward_school_pool($1::jsonb,$2::uuid,$3::jsonb,$4) r',[JSON.stringify(p),member,JSON.stringify(input),now])).r,target=eligible.find(o=>FISH[o.what]&&FISH[o.what].tier!=='legend')?.what;
 assert(target,'No eligible normal fish');input.fish=target;const liveFixture={...p,best:{[target]:30}};await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(liveFixture)]);
 const request='00000000-0000-4000-8000-000000000777',call=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 eq((await call(input,request)).ok,true);eq((await call(input,request)).school.left,3);
 const cast=async(how=null)=>(await one('select public.town_cast($1,$2,$3,false,$4) r',['worm',...at,how])).r;
 const pair=await cast('pair');eq(pair.ok,true);eq(pair.line.lines,2);let state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.professionRewards.school.left,2);eq(state.gifts.used.thingSchoolBell.n,1);
 await cast('star');state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.professionRewards.school.left,2);
 eq((await call(input,request)).school.left,3);state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.professionRewards.school.left,2);
 writeFileSync('.codex/tier10/v212-validation.json',JSON.stringify({checks,fixture:{at,fish:target,bait:'worm'},localOnly:true},null,2));console.log(`v212: ${checks} pool/charge/known-target/legend, rerun, real pair/star casts and retry checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
