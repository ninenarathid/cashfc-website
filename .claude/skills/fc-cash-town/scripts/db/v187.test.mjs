import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual as eq} from 'node:util';
import {standIn} from './stand-in.mjs';
import {U} from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {INSECT_ITEMS,INSECT_SPECIES,INSECT_DISHES,INSECT_MAKES}=await import('@/lib/town/insect-items');
const {insectCare}=await import('@/lib/town/insect-garden');
const {newPurse}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const {see}=await import('@/lib/town/farm');
const {bedCorner}=await import('@/lib/town/world');
const {swarmAt,HAUNTS}=await import('@/lib/town/insects');
const {cook}=await import('@/lib/town/cooking');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,json=JSON.stringify,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
const before=(await one("select town.cat('insects') r")).r;
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??join(root,'supabase/v187_visitors_that_tend_the_garden.sql'),'utf8'),'v187');
const cat=catalogOf(),NOW=Date.UTC(2026,9,10,5),[bx,by]=bedCorner(0),key=`${bx+2},${by+2}`;
const plant={by:U.m1,crop:'corn',sown:NOW-3600000,boost:0,fed:0,watered:0,guard:NOW+3600000,cured:0,picked:0,pickedAt:0},plot={soil:'tilled',plant};
const purse=ids=>({...newPurse(),coins:1000,bag:ids.map(item=>({item,n:2})),stamina:{day:dayOf(NOW),left:100}});
for(const k of Object.keys(INSECT_ITEMS))t.check('item agrees '+k,eq((await one("select town.cat('items')->$1 r",[k])).r,cat.items[k]));
for(const k of ['insect_garden'])t.check('rules agree',eq((await one('select town.cat($1) r',[k])).r,cat[k]));
const installed=(await one("select town.cat('insects') r")).r;
t.check('species and order agree',eq(installed.bugs,cat.insects.bugs)&&eq(installed.order,cat.insects.order));
for(const k of Object.keys(before.bugs))t.check('original insect rule unchanged '+k,eq(before.bugs[k],installed.bugs[k]));
// Recipe ingredients must pass the server's pantry rules, including the three insect materials.
for(const [id,recipe] of Object.entries({...INSECT_MAKES,...Object.fromEntries(Object.entries(INSECT_DISHES).map(([id,d])=>[id,d.recipe]))})) {
 const p={...purse([]),bag:[...recipe.needs.map(([item,n])=>({item,n:n+1})),...Array(4).fill(null)]};
 const crew=recipe.in,things=recipe.needs;
 const want=cook(p,things,crew,0,NOW);
 const got=(await one('select town.cook($1,$2,$3,0,$4) r',[json(p),json(things),json(crew),NOW])).r;
 t.check('insect preparation cooks on server '+id,got.ok&&got.made===id&&eq(got,want),{got,want});
 const short={...p,bag:p.bag.map((s,i)=>i===0?{...s,n:0}:s)};
 t.check('missing ingredient cannot pay '+id,(await one('select town.cook($1,$2,$3,0,$4) r',[json(short),json(things),json(crew),NOW])).r.ok===false);
 const full={...p,bag:p.bag.filter(Boolean)};
 const fullWant=cook(full,things,crew,0,NOW),fullGot=(await one('select town.cook($1,$2,$3,0,$4) r',[json(full),json(things),json(crew),NOW])).r;
 t.check('full bag agrees '+id,eq(fullGot,fullWant),{fullGot,fullWant});
}
for(const items of [['honeyBee'],['hoverfly','pollenFan','releaseCage'],['butterflyWhite']]) {
 const p=purse(items),want=insectCare(key,plot,p,0,'pollinate',U.m1,NOW,[]),got=(await one('select town.insect_care($1,$2,$3,0,$4,$5,$6) r',[key,json(plot),json(p),'pollinate',U.m1,NOW])).r;
 t.check('pollination agrees including costs and journal',eq(got,want),{got,want});
 t.check('same bearing cannot pay twice',(await one('select town.insect_care($1,$2,$3,0,$4,$5,$6) r',[key,json(got.plot),json(got.purse),'pollinate',U.m1,NOW])).r.why==='wet');
 t.check('another bearing allows a new release',(await one('select town.insect_care($1,$2,$3,0,$4,$5,$6) r',[key,json({...got.plot,plant:{...got.plot.plant,picked:1}}),json(got.purse),'pollinate',U.m1,NOW])).r.ok===true);
}
for(const [slot,mode,owner]of [[-1,'pollinate',U.m1],[99,'pollinate',U.m1],[null,'pollinate',U.m1],[0,'bogus',U.m1],[0,null,U.m1],[0,'guard',U.m1],[0,'pollinate',U.m2]]){
 t.check('invalid release refuses',(await one('select town.insect_care($1,$2,$3,$4,$5,$6,$7) r',[key,json(plot),json(purse(['honeyBee'])),slot,mode,owner,NOW])).r.ok===false);
}
let pest;
for(let h=2;h<120;h++){const p={...plot,plant:{...plant,sown:NOW-h*3600000,guard:0}};if(see(key,p,NOW,[]).pest){pest=p;break;}}
t.check('fixture has real pest',!!pest);
if(pest)for(const id of ['lacewing','goldenAnt','ladybird']){
 const p=purse([id,'pestWhistle']),want=insectCare(key,pest,p,0,'guard',U.m2,NOW,[]),got=(await one('select town.insect_care($1,$2,$3,0,$4,$5,$6) r',[key,json(pest),json(p),'guard',U.m2,NOW])).r;
 t.check('predator cure on another garden agrees',eq(got,want),{got,want});
 t.check('cured pest cannot consume a second insect',(await one('select town.insect_care($1,$2,$3,0,$4,$5,$6) r',[key,json(got.plot),json(got.purse),'guard',U.m2,NOW])).r.ok===false);
 const sat=`${bx+3},${by+2}`,plots={[key]:pest,[sat]:{...pest,plant:{...pest.plant,root:key}}};
 t.check('random ladybird cure selects only root',(await one('select town.rid_pick($1,$2,0.999) r',[json(plots),NOW])).r===key);
}
// All new species really occur in the database's weighted habitat selection.
const word='insect visitors',seen=new Set();
for(const h of HAUNTS)for(let day=0;day<20;day++)for(const hour of [6,9,16,20,23]){
 const now=NOW-5*3600000+day*86400000+hour*3600000;
 const got=(await one('select town.bug_at($1,$2,null,$3) r',[h.id,now,word])).r;
 if(got)seen.add(got.bug);
 const want=swarmAt(word,h,now,[]);
 const stripped=got?{turn:got.turn,bug:got.bug,n:got.n,seed:got.seed}:null;
 t.check('habitat roll agrees',eq(stripped,want),{h:h.id,now,got,want});
}
for(const id of Object.keys(INSECT_SPECIES))t.check('new insect discoverable '+id,seen.has(id));
// Public RPC touches only the caller and propagates garden root care through v186's trigger.
const LIVE=(await one('select town.now_ms() n')).n,[x,y]=key.split(',').map(Number),sat=`${x+1},${y}`,cells=[key,sat];
const livePlant={...plant,sown:LIVE-3600000,guard:LIVE+3600000,root:key,footprint:cells},p=purse(['honeyBee']);p.stamina.day=dayOf(LIVE);
for(const id of [U.m1,U.m2])await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[id,json(p)]);
await t.sql('delete from public.town_plots where bed=0');
await t.sql('insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,0,\'tilled\',$3,0)',[x,y,json(livePlant)]);
const otherBefore=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m2])).doc;
const result=await t.as(U.m1,'select public.town_insect_care($1,$2,0,\'pollinate\') r',[x,y]);
t.check('member can release one insect',result.rows?.[0]?.r?.ok===true,result);
t.check('other purse untouched',eq(otherBefore,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m2])).doc));
const after=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
const plots=(await one('select town.garden_plots($1) r',[key])).r;
t.check('satellite mirrors root boost',plots[sat].plant.boost===plots[key].plant.boost&&plots[key].plant.boost>0);
const replay=await t.as(U.m1,'select public.town_insect_care($1,$2,0,\'pollinate\') r',[x,y]);
t.check('replay refuses and preserves purse',replay.rows?.[0]?.r?.ok===false&&eq(after,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc));
for(const role of ['anon',U.unver,U.nochar]){const r=await t.as(role,'select public.town_insect_care($1,$2,0,\'pollinate\') r',[x,y]);t.check('ineligible caller refused',!!r.error||r.rows?.[0]?.r?.ok===false,r);}
for(const role of ['anon',U.m1,U.m2])t.check('helper private',!!(await t.as(role,'select town.insect_care($1,$2,$3,0,\'pollinate\',$4,$5)',[key,json(plot),json(p),U.m1,NOW])).error);
t.done();await t.db.close();
