import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {standIn} from './stand-in.mjs';
import {U} from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {PREP_ITEMS,PREP_MAKES,PREP_DISHES}=await import('@/lib/town/preparation-items');
const {CAMP_ITEMS,CAMP_DISHES}=await import('@/lib/town/camp-items');
const {PREPARATION,prepare,preparationTargets}=await import('@/lib/town/preparation');
const {CAMPS,makeCamp,campBenefit}=await import('@/lib/town/camps');
const {newPurse}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const {cook}=await import('@/lib/town/cooking');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,j=JSON.stringify,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql','v188_the_parts_a_forest_can_spare.sql','v196_the_channels_and_properties_of_water.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
await t.runTwice(readFileSync(join(root,'supabase/v197_preparing_food_and_a_camp_for_friends.sql'),'utf8'),'v197');
const cat=catalogOf(),NOW=Date.UTC(2026,9,10,6),p=(things=[])=>({...newPurse(),coins:1000,bag:[...things.map(([item,n])=>({item,n})),...Array(10).fill(null)],stamina:{day:dayOf(NOW),left:100}}),at=PREPARATION.stations[0],site=CAMPS.sites[0];
for(const key of ['preparation','camps'])t.check('rules '+key,eq(cat[key],(await one('select town.cat($1) r',[key])).r));
for(const id of Object.keys({...PREP_ITEMS,...CAMP_ITEMS}))t.check('item '+id,eq(cat.items[id],(await one("select town.cat('items')->$1 r",[id])).r));
async function prep(purse,run,answers,where=at,now=NOW+2000,id=run.id){const want=prepare(purse,run,id,answers,where,now),got=(await one('select town.prepare($1,$2,$3::uuid,$4,$5,$6,$7) r',[j(purse),j(run),id,j(answers),...where,now])).r;t.check('prepare '+run.recipe,eq(got,want),{got,want});}
for(const[id,r]of Object.entries(PREP_MAKES)){
 const run={id:randomUUID(),recipe:id,seed:3,at:NOW,until:NOW+180000,tile:at},target=preparationTargets(run),supplies=[...r.needs,...r.in.map(id=>[id,1]),['prepBoard',1]];
 for(const method of [0,1,2])for(const heat of [0,1,2])for(const finish of [0,1,2])await prep(p(supplies),run,{method,heat,finish});
 for(const extras of [[],[['tastingSpoon',1]]])for(const level of [0,4])await prep({...p([...supplies,...extras]),buffs:level?[{id:'seasoning',level,until:NOW+10000}]:[]},run,{...target,method:(target.method+1)%3,correction:true});
 await prep(p(supplies),run,target,at,NOW+1999);await prep(p(supplies),run,target,at,NOW+180001);await prep(p(supplies),run,target,[0,0]);await prep(p([]),run,target);await prep(p(supplies),run,{...target,method:0.5});await prep(p(supplies),run,{...target,correction:'yes'});
 // Inputs remain partially occupied, leaving no output slot: a full bag must preserve the entire purse.
 await prep({...p(supplies.map(([id,n])=>[id,n+1])),bag:[...supplies.map(([item,n])=>({item,n:n+1})),{item:'boot',n:1}]},run,target);
}
async function camp(purse,action,index,supply,where,old=null,now=NOW){const want=action==='place'?makeCamp(purse,index,where,old,U.m1,now):campBenefit(purse,old,supply,where,now),got=(await one('select town.camp_work($1,$2,$3,$4,$5,$6,$7,$8,$9) r',[j(purse),action,index,supply,...where,old?j(old):null,U.m1,now])).r;t.check('camp '+action+' '+supply,eq(got,want),{got,want});}
const campDoc={site:0,x:site[0],y:site[1],by:U.m2,until:NOW+30000,left:3,wide:false,lit:false};
for(const extra of [[],[['provisionChest',1],['weatherAwning',1],['signalPennant',1],['campLantern',1]]])for(const old of [null,campDoc,{...campDoc,until:NOW-1}])await camp(p([['campKit',1],['trailRation',5],['campCanvas',1],['dryTinder',1],...extra]),'place',0,null,site,old);
for(const supply of Object.keys(CAMPS.supplies))for(const level of [0,1,4])for(const used of [0,3])await camp({...p([[supply,2],['fieldKettle',1]]),buffs:level?[{id:'campPreparation',level,until:NOW+10000}]:[],campUses:{day:dayOf(NOW),n:used}},'benefit',0,supply,site,campDoc);
await camp({...p([['trailRation',1]]),buffs:[{id:'calm',level:4,until:NOW+3600000}]},'benefit',0,'trailRation',site,campDoc);
await camp(p([]),'place',0,null,site);await camp(p([]),'benefit',0,'fake',site,campDoc);await camp(p([['sharedTea',1]]),'benefit',0,'sharedTea',site,campDoc);
for(const[id,r]of Object.entries({...PREP_MAKES,...Object.fromEntries(Object.entries({...PREP_DISHES,...CAMP_DISHES}).map(([id,d])=>[id,d.recipe]))})){
 const purse=p(r.needs.map(([id,n])=>[id,n+1])),want=cook(purse,r.needs,r.in,0,NOW),got=(await one('select town.cook($1,$2,$3,0,$4) r',[j(purse),j(r.needs),j(r.in),NOW])).r;
 t.check('real cooking '+id,got.ok&&got.made===id&&eq(got,want),{got,want});
}
const LIVE=(await one('select town.now_ms() n')).n;
await t.sql("update public.town_knobs set value=1 where key='far_open'");
const set=async(who,things)=>t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[who,j({...p(things),stamina:{day:dayOf(LIVE),left:100}})]);
await set(U.m1,[['prepBoard',1],['cleaver',1],['carrot',4],['daikon',2],['campKit',1],['campCanvas',1],['dryTinder',1],['trailRation',7],['provisionChest',1]]);await set(U.m2,[['trailRation',4]]);
const rpcPrep=async(who,action,id,answers=null,where=at)=>t.as(who,'select public.town_preparation($1,\'dicedRoot\',$2,$3,$4::uuid,$5) r',[action,...where,id,answers?j(answers):null]);
const rpcCamp=async(who,action,supply=null,id=randomUUID(),index=0)=>t.as(who,'select public.town_camp($1,$2,$3,$4,$5,$6::uuid) r',[action,index,supply,...CAMPS.sites[index],id]);
const request=randomUUID(),begin=await rpcPrep(U.m1,'begin',request);t.check('real preparation begins',begin.rows?.[0]?.r?.ok===true,begin);
t.check('same begin has no new run',(await rpcPrep(U.m1,'begin',request)).rows?.[0]?.r?.why==='had');
t.check('friend cannot finish another run',(await rpcPrep(U.m2,'end',request,{method:0,heat:0,finish:0})).rows?.[0]?.r?.ok===false);
await t.sql("update public.town_preparation_run set run=jsonb_set(run,'{at}',to_jsonb(town.now_ms()-3000)) where member_id=$1::uuid",[U.m1]);
const end=await rpcPrep(U.m1,'end',request,{method:0,heat:0,finish:0});t.check('real preparation consumes and remembers',end.rows?.[0]?.r?.ok===true,end);
const saved=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
t.check('replayed end never awards twice',(await rpcPrep(U.m1,'end',request,{method:0,heat:0,finish:0})).rows?.[0]?.r?.why==='had'&&eq(saved,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc));
const campId=randomUUID(),placed=await rpcCamp(U.m1,'place',null,campId);t.check('real camp places',placed.rows?.[0]?.r?.ok===true,placed);
t.check('same camp request refused',(await rpcCamp(U.m1,'place',null,campId)).rows?.[0]?.r?.why==='had');
t.check('friend sees shared camp',(await t.as(U.m2,"select public.town_camp() r")).rows?.[0]?.r?.camps?.length===1);
for(let i=0;i<3;i++)t.check('friend draws one shared preparation',(await rpcCamp(U.m2,'benefit','trailRation')).rows?.[0]?.r?.ok===true);
t.check('global daily camp limit',(await rpcCamp(U.m2,'benefit','trailRation')).rows?.[0]?.r?.why==='spent');
t.check('shared remaining charges',(await one('select camp from public.town_field_camps where site=0')).camp.left===2);
t.check('only another camp earns helper credit',(await one("select town.work_counts_of($1,$2) r",[j({from:'deed',what:'camp_prepare',doc:{owner:U.m1}}),U.m2])).r[0]?.to===U.m1&&(await one("select town.work_counts_of($1,$2) r",[j({from:'deed',what:'camp_prepare',doc:{owner:U.m1}}),U.m1])).r.length===0);
for(const who of ['anon',U.unver,U.nochar]){t.check('ineligible prep caller refused',!!(await rpcPrep(who,'begin',randomUUID())).error);t.check('ineligible camp caller refused',!!(await rpcCamp(who,'place')).error);}
for(const who of ['anon',U.m1,U.m2])for(const table of ['town_preparation_run','town_field_camps','town_field_receipts'])t.check('private table '+table,!!(await t.as(who,`select * from public.${table}`)).error);
t.done();await t.db.close();
