import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {rewardAuditDB} from './reward-audit-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const {dragonDraw}=await import('@/lib/town/reward-dragon');
const {resourceRecipe}=await import('@/lib/town/reward-resources');
const {nursery,nurseryNode}=await import('@/lib/town/reward-nursery');
const {beginCore,coreAction}=await import('@/lib/town/reward-core');
const {arenaAction,arenaTargets}=await import('@/lib/town/reward-arena');
const {trailAnswer}=await import('@/lib/town/reward-trails');
const {floorSpots}=await import('@/lib/town/cave-state');
const {caveLayout}=await import('@/lib/town/mining-row');
const {oreOf}=await import('@/lib/town/mining');
const db=await rewardAuditDB(),t=Date.parse('2026-10-15T12:00:00+07:00'),id='00000000-0000-4000-8000-000000009258';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const one=async(q,a=[])=>(await db.query(q,a)).rows[0];
const json=JSON.stringify;
const p={...newPurse(),bag:[{item:'axe',n:1},{item:'pineNut',n:3},{item:'scarab',n:1},...Array(16).fill(null)],hand:'axe',handAt:0,stamina:{day:dayOf(t),left:100},gifts:{had:['thingOreCompass','thingTinyForest','thingCoreSpade','thingBeetleRing','charmEchoAxe'],charms:['charmEchoAxe'],familiar:null},professionRewards:{minerals:['chipRuby','shardCopper']}};
try{
 const sql=readFileSync('supabase/v258_finite_profession_rewards.sql','utf8');await db.exec(sql);await db.exec(sql);
 const me=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query('insert into public.town_cave_days(day,floor,layout) select $1,ord::integer,v from jsonb_array_elements($2::jsonb) with ordinality a(v,ord) on conflict do nothing',[dayOf(t),json(Array.from({length:30},(_,i)=>caveLayout(i+1,dayOf(t))))]);
 // Empty results must be saved as successful charged operations. Spent probes are independent of rocks.
 let q=p;
 for(let i=0;i<5;i++){
  const d=(await one("select town.reward_scan($1::jsonb,'{\"at\":[10,10],\"floor\":1,\"rocks\":[]}'::jsonb,'chipRuby',$2) r",[json(q),t])).r;
  eq(d.ok,true);eq(d.left,4-i);eq(d.direction,undefined);q=d.purse;
 }
 for(const rocks of [[],[[0,11,10]]])eq((await one("select town.reward_scan($1::jsonb,$2::jsonb,'chipRuby',$3) r",[json(q),json({at:[10,10],floor:1,rocks}),t])).r,{ok:false,why:'spent'});
 // Bell pair path uses the same exclusion as stardust; ordinary one-line weighting remains finite.
 const school={...p,gifts:{had:['thingSchoolBell'],charms:[]},professionRewards:{school:{fish:'catfish',left:3,until:t+1800000}}},pool=[{what:'catfish',p:.1},{what:'loach',p:.9}];
 const unboosted=(await one('select town.reward_school_weights($1::jsonb,$2::jsonb,true,$3) r',[json(school),json(pool),t])).r;
 eq(unboosted.purse,school);eq(unboosted.odds,pool);
 eq((await one("select position('star or pair' in pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure))>0 yes")).yes,true);
 // Weight multiplication matches TS, stays below 100%, consumes one eligible call, excludes pair/star.
 const dragon={...p,best:{arowana:60},gifts:{had:['famRiverDragon'],charms:[],familiar:'famRiverDragon'},professionRewards:{dragon:{fish:'arowana',bait:'lure',current:'eddy',at:[12,39],until:t+1800000}}},odds=[{what:'arowana',p:.1},{what:'catfish',p:.9}];
 for(const [pair,star] of [[false,false],[true,false],[false,true]]){
  const d=(await one("select town.reward_dragon_draw($1::jsonb,$2::jsonb,'lure','eddy','[12,39]'::jsonb,$3,$4,$5) r",[json(dragon),json(odds),pair,star,t])).r;
  const js=dragonDraw(dragon,odds,'lure','eddy',[12,39],pair,star,t);eq(d.purse,js.purse);for(let i=0;i<2;i++){assert.ok(Math.abs(d.odds[i].p-js.odds[i].p)<1e-12);checks++;}
 }
 for(const [kind,key] of [['repair','chipRuby'],['color','gemRuby:gemSapphire:gemDiamond'],['color','gemRuby:gemSapphire:gemOnyx'],['color','gemRuby:gemSapphire:gemAmber']])eq((await one('select town.reward_resource_recipe($1,$2) r',[kind,key])).r,resourceRecipe(kind,key));
 // Three missed trees consume the three opportunities; each old challenge becomes unusable.
 const at=[40,32],nurseryCall=async(q,c,request,now)=>(await one("select town.reward_nursery($1::jsonb,$2::jsonb,$3::uuid,'[]'::jsonb,$4,123) r",[json(q),json(c),request,now])).r;
 const begin={action:'nurseryBegin',kinds:['pine','pine','pine'],at};let n=await nurseryCall(p,begin,id,t);eq(n,nursery(p,begin,id,t,123));q=n.purse;
 for(let i=0;i<3;i++){
  const request=`00000000-0000-4000-8000-${String(92580+i).padStart(12,'0')}`,c={action:'nurseryStage',nursery:id,part:'wood',at};
  const s=await nurseryCall(q,c,request,t+i*6000);eq(s,nursery(q,c,request,t+i*6000,123));
  const answers=trailAnswer(nurseryNode(s.nursery)).map(x=>x<1?(x+.5)%1:(x+1)%3),end={action:'nurseryEnd',nursery:id,challenge:request,answers,at};
  const d=await nurseryCall(s.purse,end,id,t+i*6000+3000);eq(d,nursery(s.purse,end,id,t+i*6000+3000,123));eq(d.got,[]);q=d.purse;
  eq((await nurseryCall(q,end,id,t+i*6000+4000)).ok,false);
 }
 eq(q.professionRewards.nursery,null);
 // Core payout and forfeiture have identical SQL/TS semantics for all three routes.
 const floor=3,pos=floorSpots(floor,dayOf(t)).arrive,miner={...p,bag:[{item:'pick',n:1},...Array(16).fill(null)],hand:'pick',professionRewards:{visited:[floor],minerals:[oreOf(floor),'chipRuby']}};
 const coreCall=async(q,c,request,now)=>(await one('select town.reward_core($1::jsonb,$2::uuid,$3::uuid,$4::jsonb,$5,123) r',[json(q),me,request,json(c),now])).r;
 const b=await coreCall(miner,{action:'coreBegin',floor,at:pos},id,t);eq(b,beginCore(miner,floor,id,pos,t,123));q=b.purse;
 for(const [i,route] of ['ore','crystal','safe'].entries()){
  const request=`00000000-0000-4000-8000-${String(93580+i).padStart(12,'0')}`,c={action:'coreRoom',core:id,route,at:pos},now=t+i*6000,s=await coreCall(q,c,request,now);eq(s,coreAction(q,c,request,now));
  const answers=trailAnswer(s.core.room.node),end={action:'coreEnd',core:id,challenge:request,answers:i===1?answers.map(x=>(x+1)%3):answers,at:pos};
  const d=await coreCall(s.purse,end,id,now+3000);eq(d,coreAction(s.purse,end,id,now+3000));eq(d.got,i===0?[[oreOf(floor),8]]:i===1?[]:[['stone',8]]);q=d.purse;
 }
 eq(q.professionRewards.core,null);
 // Five ring prizes, no unlimited currency; all carried beetles remain.
 q=p;
 for(let i=0;i<7;i++){
  const now=t+i*10000,request=`00000000-0000-4000-8000-${String(94580+i).padStart(12,'0')}`,c={action:'arenaBegin',bug:'scarab',at};
  const call=async(q,c,now)=>(await one("select town.reward_arena($1::jsonb,$2::jsonb,$3::uuid,$4,'[\"scarab\"]'::jsonb,123) r",[json(q),json(c),request,now])).r;
  const b=await call(q,c,now);eq(b,arenaAction(q,c,request,now,123,['scarab']));
  const end={action:'arenaEnd',run:request,at,answers:arenaTargets(123).map(x=>({stance:(x.attack+1)%3,mark:x.mark}))},d=await call(b.purse,end,now+6000);
  eq(d,arenaAction(b.purse,end,id,now+6000,0,[]));q=d.purse;
 }
 eq(q.coins,p.coins+60);eq(q.bag,p.bag);
 // Echo allowance is used only on a successful extra tree; an equipment swap cannot borrow start effects.
 const firstTree=(await one("select v from jsonb_array_elements(town.cat('trees')->'wood') a(v) where (v->>3)::integer=1 and jsonb_array_length(town.fell_group($1::jsonb,'{\"down\":{},\"half\":[]}'::jsonb,v,'{\"item\":\"axe\",\"n\":1}'::jsonb,$2,'tester'))=2 limit 1",[json(p),t])).v,tree=firstTree[0],x=firstTree[1],y=firstTree[2];
 const grove={down:{},half:[]},echo=(await one("select town.fell_begin($1::jsonb,$2::jsonb,$3,$4,$5,$6,123,'tester') r",[json(p),json(grove),tree,x,y,t])).r;
 eq(echo.ok,true);
 const held=(await one("select town.fell_opened($1::jsonb,'tester',$2::jsonb,$3) g",[json(grove),json(echo.trees),t])).g;
 held.goes.tester.comboLoadout=(await one('select town.combo_loadout($1::jsonb) k',[json(p)])).k;
 const swapped={...p,gifts:{...p.gifts,had:[...p.gifts.had,'charmListening'],charms:['charmListening']}},went={tree,through:true,misses:0,secs:100};
 eq((await one("select town.fell($1::jsonb,$2::jsonb,'tester',$3::jsonb,$4,$5,$6,'[]'::jsonb) r",[json(swapped),json(held),json(went),x,y,t+1000])).r,{ok:false,why:'none'});
 const capped={...p,gifts:{...p.gifts,used:{charmEchoAxe:{k:dayOf(t),n:5}}}};
 eq((await one("select town.fell_begin($1::jsonb,$2::jsonb,$3,$4,$5,$6,123,'tester') r",[json(capped),json(grove),tree,x,y,t])).r.trees,[tree]);
 q=p;
 for(let i=0;i<5;i++){
  const d=(await one("select town.fell($1::jsonb,$2::jsonb,'tester',$3::jsonb,$4,$5,$6,'[]'::jsonb) r",[json(q),json(held),json(went),x,y,t+1000])).r;
  eq(d.ok,true);eq(d.felled.length,2);eq(d.purse.gifts.used.charmEchoAxe.n,i+1);q=d.purse;
 }
 eq((await one("select town.fell_begin($1::jsonb,$2::jsonb,$3,$4,$5,$6,123,'tester') r",[json(q),json(grove),tree,x,y,t+1000])).r.trees,[tree]);
 eq((await one("select position('greatest(3,' in pg_get_functiondef('public.town_fell(jsonb,integer,integer)'::regprocedure))>0 yes")).yes,true);
 eq((await one("select position('substr(p_request::text,1,8)' in pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure))=0 yes")).yes,true);
 // A guest cannot end the owner's lease by steering back.
 const owner='00000000-0000-4000-8000-000000000001',guest='00000000-0000-4000-8000-000000000002',boat={owner,guest,site:0,station:1,open:false,trip:null,until:t+1800000};
 eq((await one("select town.reward_boat($1::jsonb,'{\"action\":\"return\",\"at\":[180,137]}'::jsonb,$2::uuid,$3::jsonb,$4,false,false) r",[json(p),guest,json(boat),t])).r.ok,false);
 // Authenticate one real cast. Replaying a dropped otter response must keep its returned fish and quota.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me]);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${t}::bigint$$;`);
 const fisher={...p,bag:[{item:'rod',n:1},{item:'lure',n:20},...Array(12).fill(null)],hand:'rod',gifts:{had:['famOtter'],charms:[],familiar:'famOtter'}};
 await db.query('select town.purse_of($1,true)',[me]);await db.query('select town.keep_purse($1,$2::jsonb)',[me,json(fisher)]);
 eq((await one("select public.town_cast('lure',12,39,false,null,'eddy') r")).r.ok,true);
 await db.query("update public.town_lines set doc=doc||jsonb_build_object('what','catfish','size',5,'struck_at',$2::bigint,'again',false) where member_id=$1",[me,t-10000]);
 const fight={request:id,seed:12,steps:20,secs:10},land=async(fight)=>(await one("select public.town_land('snapped',$1::jsonb) r",[json(fight)])).r;
 const first=await land(fight);eq(first.again,true);
 const saved=(await one('select town.purse_of($1,true) p',[me])).p,returned=(await one('select doc from public.town_lines where member_id=$1',[me])).doc;
 saved.coins+=7;await db.query('select town.keep_purse($1,$2::jsonb)',[me,json(saved)]);
 const second=await land(fight);eq(second.again,true);eq((await one('select town.purse_of($1,true) p',[me])).p,saved);eq((await one('select doc from public.town_lines where member_id=$1',[me])).doc,returned);
 eq((await land({...fight,secs:11})).ok,false);
 await db.query('delete from public.town_lines where member_id=$1',[me]);
 const schoolPool=(await one("select town.reward_school_pool($1::jsonb,$2::uuid,'{\"at\":[12,39],\"bait\":\"lure\",\"current\":\"eddy\"}'::jsonb,$3) r",[json(fisher),me,t])).r;
 const eligible=schoolPool.find(o=>o.p>0&&o.what!=='arowana'&&o.what!=='stingray');assert.ok(eligible);checks++;
 const paired={...fisher,gifts:{had:['thingRod','thingSchoolBell'],charms:[],familiar:null},professionRewards:{school:{fish:eligible.what,left:3,until:t+1800000}}};
 await db.query('select town.keep_purse($1,$2::jsonb)',[me,json(paired)]);
 eq((await one("select public.town_cast('lure',12,39,false,'pair','eddy') r")).r.ok,true);
 eq((await one('select town.purse_of($1,true) p',[me])).p.professionRewards.school.left,3);
 const pairedLine=(await one('select doc from public.town_lines where member_id=$1',[me])).doc;eq(!!(pairedLine.two||pairedLine.others),true);
 for(const sig of ['town.land_v258(text,jsonb)','town.reward_scan(jsonb,jsonb,text,bigint)','town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint)'])eq((await one("select has_function_privilege('authenticated',$1,'EXECUTE') a",[sig])).a,false);
 await db.exec(sql);eq((await one('select doc from public.town_lines where member_id=$1',[me])).doc,pairedLine);
 mkdirSync('.codex/tier10',{recursive:true});writeFileSync('.codex/tier10/v258-validation.json',json({checks,localOnly:true,rerun:true,tsSqlParity:true,otterResponseReplay:true}));
 console.log(`v258: ${checks} local SQL, parity, quota, lost-response replay, privacy and rerun checks passed.`);
}catch(e){console.error('Check',checks,e.message,e.where??'');if(e.actual!==undefined)console.error(json({actual:e.actual,expected:e.expected}));process.exitCode=1;}finally{await db.close();}
