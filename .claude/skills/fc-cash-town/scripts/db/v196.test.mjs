import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {standIn} from './stand-in.mjs';
import {U} from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {STREAM_ITEMS,STREAM_MAKES,STREAM_DISHES}=await import('@/lib/town/stream-items');
const {STREAM_WORK,streamWork}=await import('@/lib/town/stream-work');
const {newPurse}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const {cook}=await import('@/lib/town/cooking');
const {WELL}=await import('@/lib/town/world');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,j=JSON.stringify,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql','v188_the_parts_a_forest_can_spare.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??join(root,'supabase/v196_the_channels_and_properties_of_water.sql'),'utf8'),'v196');
const cat=catalogOf(),NOW=Date.UTC(2026,9,10,5),p=(things=[])=>({...newPurse(),coins:1000,bag:[...things.map(([item,n])=>({item,n})),...Array(8).fill(null)],stamina:{day:dayOf(NOW),left:100}}),upper=[21,252],lower=[42,254],well=[WELL.x+1,WELL.y];
t.check('stream rules are database-owned',eq(cat.stream_work,(await one("select town.cat('stream_work') r")).r));
for(const id of Object.keys(STREAM_ITEMS))t.check('item '+id,eq(cat.items[id],(await one("select town.cat('items')->$1 r",[id])).r));
async function parity(purse,action,choice,at,gate=null,now=NOW){
 const want=streamWork(purse,action,choice,at,gate,U.m1,now),got=(await one('select town.stream_work($1,$2,$3,$4,$5,$6,$7,$8) r',[j(purse),action,choice,...at,gate?j(gate):null,U.m1,now])).r;
 t.check(`${action} ${choice} agrees`,eq(got,want),{got,want});
}
for(const s of STREAM_WORK.sites)for(const choice of s.items)for(const tools of [[],[['bucket',1]],[['waterSampler',1]]])for(const route of ['pool','reed'])await parity(p(tools),'sample',choice,[s.x,s.y],{route,until:NOW+10000,by:U.m1});
for(const[id,r]of Object.entries(STREAM_MAKES)){
 const tool=id.endsWith('Blend')?'mixingJug':'filterFrame';
 await parity(p([...r.needs,[tool,1]]),'prepare',id,upper);
 await parity(p([[tool,1]]),'prepare',id,upper);
 await parity(p(r.needs),'prepare',id,upper);
}
for(const choice of ['pool','reed','fake'])for(const tools of [[],[['sluiceKey',1]]])for(const gate of [null,{route:'pool',until:NOW+STREAM_WORK.gateMinutes*60000,by:U.m1},{route:'pool',until:NOW-1,by:U.m1}])await parity(p(tools),'gate',choice,upper,gate);
for(const id of Object.keys(STREAM_WORK.nature))for(const tools of [[],[['sealedFlask',1]]])for(const level of [0,1,4])await parity({...p([[id,1],...tools]),buffs:level?[{id:'waterProperty',level,until:NOW+10000}]:[]},'pour',id,well);
await parity(p(),'sample','riverGrit',[0,0]);await parity(p(),'pour','moonBlend',upper);await parity(p(),'sample','fake',upper);
const full={...p(),bag:Array(8).fill({item:'boot',n:1})};await parity(full,'sample','riverGrit',upper);
for(const[id,r]of Object.entries({...STREAM_MAKES,...Object.fromEntries(Object.entries(STREAM_DISHES).map(([id,d])=>[id,d.recipe]))})){
 const purse=p(r.needs.map(([id,n])=>[id,n+1])),want=cook(purse,r.needs,r.in,0,NOW),got=(await one('select town.cook($1,$2,$3,0,$4) r',[j(purse),j(r.needs),j(r.in),NOW])).r;
 t.check('real cooking path '+id,got.ok&&got.made===id&&eq(got,want),{got,want});
}
const LIVE=(await one('select town.now_ms() n')).n;
await t.sql("update public.town_knobs set value=1 where key='far_open'");
for(const id of [U.m1,U.m2])await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[id,j({...p([['sluiceKey',1],['bucket',1],['moonBlend',2],['sealedFlask',1]]),stamina:{day:dayOf(LIVE),left:100}})]);
const rpc=async(who,action,choice,at,req=randomUUID())=>t.as(who,'select public.town_stream($1,$2,$3,$4,$5::uuid) r',[action,choice,...at,req]);
const request=randomUUID(),first=await rpc(U.m1,'sample','riverGrit',upper,request);
t.check('member really samples',first.rows?.[0]?.r?.ok===true,first);
const after=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
t.check('retry has no extra reward',(await rpc(U.m1,'sample','riverGrit',upper,request)).rows?.[0]?.r?.why==='had'&&eq(after,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc));
t.check('different request cannot bypass source cooldown',(await rpc(U.m1,'sample','riverGrit',upper)).rows?.[0]?.r?.why==='spent');
t.check('member changes shared route',(await rpc(U.m1,'gate','reed',upper)).rows?.[0]?.r?.stream?.route==='reed');
t.check('friend sees the gate',(await t.as(U.m2,"select public.town_stream() r")).rows?.[0]?.r?.stream?.route==='reed');
t.check('friend samples the routed current',(await rpc(U.m2,'sample','rushingSample',lower)).rows?.[0]?.r?.ok===true);
await t.sql("update public.town_things set doc='0'::jsonb where key='well'; update public.town_things set doc='null'::jsonb where key='well_water'");
const buckets=(await one('select coalesce(sum(buckets),0) n from public.town_well_water')).n;
const poured=await rpc(U.m1,'pour','moonBlend',well);
t.check('prepared water really pours',poured.rows?.[0]?.r?.ok===true,poured);
t.check('one water lot and carrier credit',(await one('select coalesce(sum(buckets),0) n from public.town_well_water')).n===buckets+1);
const w=(await one("select town.thing('well_water',false) r")).r;
t.check('moon property preserved once with flask',w?.kind==='moon'&&Math.abs(w.until-LIVE-60*60000)<20000,w);
await t.sql("update public.town_things set doc=to_jsonb((town.cat('farming')->>'well')::integer) where key='well'");
const beforeFull=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
t.check('full well preserves water item',(await rpc(U.m1,'pour','moonBlend',well)).rows?.[0]?.r?.why==='full'&&eq(beforeFull,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc));
for(const who of ['anon',U.unver,U.nochar])t.check('ineligible caller refused',!!(await rpc(who,'sample','wetClay',upper)).error);
for(const who of ['anon',U.m1,U.m2]){
 for(const table of ['town_stream_gate','town_stream_receipts'])t.check('private table '+table,!!(await t.as(who,`select * from public.${table}`)).error);
 t.check('private helper',!!(await t.as(who,'select town.stream_work($1,\'sample\',\'wetClay\',21,252,null,$2,$3)',[j(p()),U.m1,NOW])).error);
}
t.done();await t.db.close();
