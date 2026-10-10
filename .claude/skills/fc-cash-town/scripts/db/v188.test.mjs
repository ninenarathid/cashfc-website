import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual as eq} from 'node:util';
import {standIn} from './stand-in.mjs';
import {U} from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {FORAGE_ITEMS,FORAGE_MAKES,FORAGE_DISHES}=await import('@/lib/town/foraging-items');
const {FORAGE_PARTS}=await import('@/lib/town/foraging-parts');
const {gather,SPOTS,turnOf,ruleOf}=await import('@/lib/town/forest');
const {cook}=await import('@/lib/town/cooking');
const {newPurse}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,json=JSON.stringify,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
const before=(await one("select town.cat('forest') r")).r;
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??join(root,'supabase/v188_the_parts_a_forest_can_spare.sql'),'utf8'),'v188');
const cat=catalogOf(),NOW=Date.UTC(2026,9,10,5),purse=(ids=[])=>({...newPurse(),coins:1000,bag:[...ids.map(item=>({item,n:1})),...Array(8).fill(null)],stamina:{day:dayOf(NOW),left:100}});
t.check('original spawn rules untouched',eq(before,(await one("select town.cat('forest') r")).r));
t.check('forest part rules agree',eq(cat.forest_parts,(await one("select town.cat('forest_parts') r")).r));
for(const id of Object.keys(FORAGE_ITEMS))t.check('item '+id,eq(cat.items[id],(await one("select town.cat('items')->$1 r",[id])).r));
for(const [kind,parts]of Object.entries(FORAGE_PARTS.parts)){
 const spot=SPOTS.find(s=>s.kind===kind),has={turn:turnOf(spot,NOW),item:'daisy',n:3};
 for(const part of Object.keys(parts))for(const tools of [[],['rootSpade'],['pruningKnife','specimenPress','seedSieve','forageBasket','rootSpade']])for(const misses of [0,1,4]){
  const p=purse(tools),want=gather(p,spot,has,0,false,null,[spot.x,spot.y],{part,misses,wrong:0},NOW);
  const got=(await one('select town.gather_part($1,$2,$3,0,false,null,$4,$5,$6,0,$7,$8,null,false) r',[json(p),spot.id,json(has),spot.x,spot.y,misses,NOW,part])).r;
  t.check('part outcome agrees including tool limits, journal and recovery',eq(got,want),{kind,part,tools,misses,got,want});
 }
}
const spot=SPOTS.find(s=>s.kind==='flowers'),has={turn:turnOf(spot,NOW),item:'daisy',n:3};
for(const [part,taken,mine,x,with_,lost]of [['leaf',0,true,spot.x,null,false],['leaf',ruleOf(spot).shares,false,spot.x,null,false],['leaf',0,false,0,null,false],['fake',0,false,spot.x,null,false],['root',0,false,spot.x,'famPiglet',false],['leaf',0,false,spot.x,null,true]]) {
 const p=purse(['rootSpade']),want=gather(p,spot,has,taken,mine,null,[x,spot.y],{part,misses:0,wrong:0,with:with_,lost},NOW),got=(await one('select town.gather_part($1,$2,$3,$4,$5,null,$6,$7,0,0,$8,$9,$10,$11) r',[json(p),spot.id,json(has),taken,mine,x,spot.y,NOW,part,with_,lost])).r;
 t.check('invalid or exhausted collection agrees',eq(got,want),{got,want});
}
const full={...purse(),bag:Array(8).fill({item:'boot',n:1})};
t.check('full inventory cannot consume a turn',(await one('select town.gather_part($1,$2,$3,0,false,null,$4,$5,0,0,$6,\'leaf\',null,false) r',[json(full),spot.id,json(has),spot.x,spot.y,NOW])).r.why==='full');
for(const[id,r]of Object.entries({...FORAGE_MAKES,...Object.fromEntries(Object.entries(FORAGE_DISHES).map(([id,d])=>[id,d.recipe]))})) {
 const p={...purse(),bag:[...r.needs.map(([item,n])=>({item,n:n+1})),...Array(5).fill(null)]},want=cook(p,r.needs,r.in,0,NOW),got=(await one('select town.cook($1,$2,$3,0,$4) r',[json(p),json(r.needs),json(r.in),NOW])).r;
 t.check('preparation really cooks '+id,got.ok&&got.made===id&&eq(got,want),{got,want});
 const short={...p,bag:p.bag.slice(1)};
 t.check('short ingredients refuse '+id,(await one('select town.cook($1,$2,$3,0,$4) r',[json(short),json(r.needs),json(r.in),NOW])).r.ok===false);
}
// The public RPC serializes members at a place. Recovery does not erase friends' current shares.
const LIVE=(await one('select town.now_ms() n')).n,word=(await one('select town.word() w')).w;
const places=SPOTS.filter(s=>s.kind==='flowers');let live;
for(const s of places)if((await one('select town.wild_holds($1,$2) r',[s.id,LIVE])).r){live=s;break;}
t.check('fixture has a visible flower patch',!!live);
if(live){
 for(const id of [U.m1,U.m2])await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[id,json({...purse(['rootSpade']),stamina:{day:dayOf(LIVE),left:100}})]);
 // An expired row must be replaced, not joined across the previous rest's gap.
 await t.sql('insert into public.town_forest_rest(spot,begins,ends) values($1,$2,$3)',[live.id,LIVE-300000,LIVE-100000]);
 const other=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m2])).doc;
 const first=await t.as(U.m1,'select public.town_gather($1,$2,$3,$4) r',[live.id,live.x,live.y,json({part:'root',misses:0,wrong:0})]);
 t.check('member roots a patch',first.rows?.[0]?.r?.ok===true,first);
 t.check('another purse unchanged',eq(other,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m2])).doc));
 const after=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
 const replay=await t.as(U.m1,'select public.town_gather($1,$2,$3,$4) r',[live.id,live.x,live.y,json({part:'root'})]);
 t.check('replay refuses without another root',replay.rows?.[0]?.r?.why==='had'&&eq(after,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc));
 const rest=await one('select begins,ends from public.town_forest_rest where spot=$1',[live.id]);
 t.check('expired recovery replaced and current shares still grow',rest.begins>LIVE&&(await one('select town.wild_holds($1,$2) r',[live.id,LIVE])).r!==null);
 const friend=await t.as(U.m2,'select public.town_gather($1,$2,$3,$4) r',[live.id,live.x,live.y,json({part:'leaf'})]);
 t.check('friend can still collect this turn',friend.rows?.[0]?.r?.ok===true,friend);
 t.check('patch absent while recovery lasts',(await one('select town.wild_holds($1,$2) r',[live.id,rest.begins])).r===null);
 const restored=(await one('select town.wild_holds($1,$2,null,$3) r',[live.id,rest.ends,word])).r;
 await t.sql('delete from public.town_forest_rest where spot=$1',[live.id]);
 t.check('end of recovery restores the normal spawn roll',eq(restored,(await one('select town.wild_holds($1,$2,null,$3) r',[live.id,rest.ends,word])).r));
 for(const who of ['anon',U.unver,U.nochar])t.check('ineligible caller refused',!!(await t.as(who,'select public.town_gather($1,$2,$3,$4)',[live.id,live.x,live.y,json({part:'leaf'})])).error);
}
for(const who of ['anon',U.m1,U.m2]) {
 t.check('shared ecological state cannot be read directly',!!(await t.as(who,'select * from public.town_forest_rest')).error);
 t.check('shared ecological state cannot be forged',!!(await t.as(who,'insert into public.town_forest_rest values(999,0,1)')).error);
 t.check('part helper is private',!!(await t.as(who,'select town.gather_part($1,$2,$3,0,false,null,$4,$5,0,0,$6,\'leaf\',null,false)',[json(purse()),spot.id,json(has),spot.x,spot.y,NOW])).error);
}
t.done();await t.db.close();
