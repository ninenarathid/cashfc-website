// Local PGlite parity, ownership and migration tests; never uses live player data.
import assert from 'node:assert/strict';
import { standIn } from './stand-in.mjs';
import { migration, U } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { PASSIVE_EQUIPMENT,carriedBag }=await import('@/lib/town/passive-equipment');
const {newPurse,wear,takeOff,put}=await import('@/lib/town/trade');
const {woodMods,woodYield,woodQuality}=await import('@/lib/town/woodcutting');
const {geologyMods,geologicalYield}=await import('@/lib/town/geology');
const {strikeWindowOf}=await import('@/lib/town/fishing');
const {fitHook}=await import('@/lib/town/rod-hook');
const {cook,setDown}=await import('@/lib/town/cooking');
const {DISHES}=await import('@/lib/town/items');
const {makeCamp,CAMPS}=await import('@/lib/town/camps');
const {prepare,PREPARATION,preparationTargets}=await import('@/lib/town/preparation');
const {PREP_MAKES}=await import('@/lib/town/preparation-items');
const {streamWork}=await import('@/lib/town/stream-work');
const ids=Object.keys(PASSIVE_EQUIPMENT),now=Date.UTC(2026,9,10,5),t=await standIn();
const one=async(q,args=[])=> (await t.sql(q,args)).rows[0].r;
const j=JSON.stringify;
const pack=items=>({...newPurse(),bag:items.reduce((bag,[id,n])=>put(bag,id,n),Array(70).fill(null))});
const equip=(p,id)=>{const d=wear(p,p.bag.findIndex(s=>s?.item===id));assert.ok(d.ok);return d.purse;};
let cases=0;
const same=(actual,want,label)=>{assert.deepEqual(actual,want,label);cases++;};
try {
 for(const n of [180,181,182,183,184,185,186,187,188,194,195,196,197,198])await t.sql(migration(n));
 if(process.env.WITH_RECENT==='1')for(const n of [199,200,201,202])await t.sql(migration(n));
 const before=(await t.sql("select p.oid::regprocedure::text sig,pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('town','public') and p.prokind='f'")).rows;
 const sql=migration(203);await t.sql(sql);await t.sql(sql);
 same(await one('select town.passive_equipment() r'),ids,'whitelist');
 for(const id of ids){
  const p=pack([[id,1]]),expected=wear(p,0);
  same(await one('select town.wear($1::jsonb,0) r',[j(p)]),expected,id+' equip');
  same(await one('select town.take_off($1::jsonb,$2) r',[j(expected.purse),id]),takeOff(expected.purse,id),id+' remove');
  same(await one('select town.carried_bag($1::jsonb) r',[j(expected.purse)]),carriedBag(expected.purse),id+' effect bag');
 }
 for(const stack of [{item:'apron',n:0},{item:'apron',n:.5},{item:'apron',n:1,plus:3},{item:'apron',n:1,of:{dish:'friedMinnow',left:2}},{item:'oven',n:1},{item:'rod',n:1},{item:'campCanvas',n:1}]){
  const p={...newPurse(),bag:[stack]};same(await one('select town.wear($1::jsonb,0) r',[j(p)]),wear(p,0),'reject '+j(stack));
 }
 const bag=pack(ids.map(id=>[id,1])),equipped=ids.reduce(equip,bag);
 same(await one('select town.carried_bag($1::jsonb) r',[j(equipped)]),carriedBag(equipped),'all equipment');
 for(const p of [bag,equipped]){
  same(await one('select town.wood_mods($1::jsonb,$2::bigint) r',[j(p),now]),woodMods(p,now),'wood mods');
  same(await one('select town.geology_mods($1::jsonb,$2::bigint) r',[j(p),now]),geologyMods(p,now),'geology mods');
  const selected={part:'bark',notches:[1,-1,-1],direction:-1};
  same(await one("select town.wood_yield(false,'bark','heart',$1::jsonb) r",[j(p)]),woodYield(1,false,selected,'heart',p),'bark');
  same(await one('select town.wood_quality(1,$1::jsonb,1,$2::jsonb,$3::bigint) r',[j(selected),j(p),now]),woodQuality(1,selected,1,p,now),'brace');
  const vein={f:12,rock:1,turn:2,seed:13,gem:'fire',mods:{strikes:12,back:1,cross:1,spent:false},more:0},choice={echo:1,focus:'crystal'};
  same(await one('select town.geological_yield($1::jsonb,$2::jsonb,2,1,$3::jsonb) r',[j(vein),j(choice),j(p)]),geologicalYield(vein,choice,2,1,p),'geode');
  const f=pack([['rod',1]]);f.wears=p.wears;f.bag=p.wears?[...f.bag]:put(f.bag,'floatBell',1);
  same(await one('select town.strike_window($1::jsonb,$2::bigint) r',[j(f),now]),strikeWindowOf(f,now),'strike');
  const withRod={...p,bag:put(p.bag,'rod',1)};
  same(await one("select town.fit_hook($1::jsonb,'hookTwin') r",[j(withRod)]),fitHook(withRod,'hookTwin'),'hook');
 }
 const full={...equipped,bag:Array(10).fill({item:'boot',n:1})};
 same(await one("select town.take_off($1::jsonb,'apron') r",[j(full)]),{ok:false,why:'full'},'full removal');
 const duplicate={...equipped,bag:put(equipped.bag,'apron',1)};
 same(await one('select town.wear($1::jsonb,0) r',[j(duplicate)]),wear(duplicate,0),'duplicate equip');
 const basket=equip(equip(pack([['basket',1],['apron',1],['worm',1]]),'basket'),'apron');
 same(await one("select town.take_off($1::jsonb,'apron') r",[j(basket)]),takeOff(basket,'apron'),'basket coexistence');
 const ingredients=DISHES.friedMinnow.recipe.needs,pCook=['stoveBig','ladle'].reduce(equip,pack([...ingredients,['pan',1],['stoveBig',1],['ladle',1]]));
 same(await one('select town.cook($1::jsonb,$2::jsonb,$3::jsonb,0,$4::bigint) r',[j(pCook),j(ingredients),j(['pan']),now]),cook(pCook,ingredients,['pan'],0,now),'cook servings and costs');
 const pTable=equip(pack([['tok',1]]),'tok');pTable.bag[0]={item:'potFull',n:1,of:{dish:'friedMinnow',left:4}};
 same(await one("select town.set_down($1::jsonb,0,'A',$2::jsonb,'pot') r",[j(pTable),j([30,40])]),setDown(pTable,0,'A',[30,40],'pot'),'table serving reach');
 const pCamp=['provisionChest','signalPennant','campLantern','weatherAwning'].reduce(equip,pack([['campKit',1],['campCanvas',1],['dryTinder',1],['trailRation',5],...['provisionChest','signalPennant','campLantern','weatherAwning'].map(id=>[id,1])]));
 same(await one("select town.camp_work($1::jsonb,'place',0,null,$2,$3,null,'A',$4::bigint) r",[j(pCamp),...CAMPS.sites[0],now]),makeCamp(pCamp,0,CAMPS.sites[0],null,'A',now),'camp charges and exact ingredients');
 const pWater=equip(pack([['moonBlend',1],['sealedFlask',1]]),'sealedFlask'),well=(await import('@/lib/town/world')).WELL,at=[well.x+1,well.y];
 same(await one("select town.stream_work($1::jsonb,'pour','moonBlend',$2,$3,null,'A',$4::bigint) r",[j(pWater),...at,now]),streamWork(pWater,'pour','moonBlend',at,null,'A',now),'flask duration and cost');
 const recipe='dicedRoot',r=PREP_MAKES[recipe],pPrep=equip(pack([...r.needs,...r.in.map(id=>[id,1]),['prepBoard',1],['tastingSpoon',1]]),'tastingSpoon'),tile=PREPARATION.stations[0],run={id:U.m1,recipe,seed:7,at:now-3000,until:now+60000,tile},target=preparationTargets(run),answers={...target,method:(target.method+1)%3,correction:true};
 same(await one('select town.prepare($1::jsonb,$2::jsonb,$3::uuid,$4::jsonb,$5,$6,$7::bigint) r',[j(pPrep),j(run),U.m1,j(answers),...tile,now]),prepare(pPrep,run,U.m1,answers,tile,now),'tasting correction');
 // Authoritative existing RPCs own the transfer, persist it, and isolate members.
 await t.as(U.m1,'select public.town_me()');
 const p=pack([['apron',1]]);
 await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,0,$2::jsonb) on conflict(member_id) do nothing',[U.m1,j(p)]);
 await t.sql('select town.keep_purse($1::uuid,$2::jsonb)',[U.m1,j(p)]);
 const rpc=await t.as(U.m1,'select public.town_wear(0) r');assert.ok(rpc.rows[0].r.ok,JSON.stringify(rpc));
 assert.ok((await one('select town.purse_of($1::uuid,false) r',[U.m1])).wears.includes('apron'));
 await t.as(U.m2,'select public.town_me()');
 const other=await t.as(U.m2,'select public.town_wear(0) r');assert.equal(other.rows[0].r.ok,false);
 const removed=await t.as(U.m1,"select public.town_take_off('apron') r");assert.ok(removed.rows[0].r.ok);
 const again=await t.as(U.m1,"select public.town_take_off('apron') r");assert.equal(again.rows[0].r.ok,false);
 const kept=await one('select town.purse_of($1::uuid,false) r',[U.m1]);assert.equal(kept.bag.filter(s=>s?.item==='apron').length,1);assert.equal(kept.coins,p.coins);
 assert.equal((await t.as('anon','select public.town_wear(0)')).code,'42501');
 assert.equal((await t.as(U.m1,"select town.carried_bag('{}'::jsonb)")).code,'42501');
 // Drift guard refuses an unrelated definition without touching player inventory.
 const d=(await t.sql("select pg_get_functiondef('town.wood_mods(jsonb,bigint)'::regprocedure) d")).rows[0].d;
 await t.sql(d.replace('AS $function$','AS $function$\n-- drift'));
 await assert.rejects(t.db.exec(sql),/Definition changed/);await t.db.exec('rollback');
 // Read-only checks and unrelated functions stay intact.
 const after=(await t.sql("select p.oid::regprocedure::text sig,pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('town','public') and p.prokind='f'")).rows;
 const unchanged=before.filter(b=>!sql.includes('-- <'+b.sig+'>'));
 for(const b of unchanged)assert.equal(after.find(a=>a.sig===b.sig).d,b.d,'unrelated '+b.sig);
 console.log('v203: '+cases+' SQL/TS parity cases; rerun, ownership, capacity, costs, grants and drift guard passed');
}finally{await t.db.close();}
