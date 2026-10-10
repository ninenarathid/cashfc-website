import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual as eq} from 'node:util';
import {standIn} from './stand-in.mjs';
import {U} from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {GARDEN_ITEMS,GARDEN_CROPS,GARDEN_TOOLS}=await import('@/lib/town/garden-items');
const {gardenShape,gardenRoom,gardenCross,gardenHarvest,gardenTend,syncGarden}=await import('@/lib/town/gardening');
const {glassTurn,rowTend}=await import('@/lib/town/farm');
const {CROPS}=await import('@/lib/town/items');
const {newPurse,hold}=await import('@/lib/town/trade');
const {dayOf}=await import('@/lib/town/stamina');
const {bedCorner}=await import('@/lib/town/world');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0],json=JSON.stringify;
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??join(root,'supabase/v186_a_garden_that_spreads_and_crosses.sql'),'utf8'),'v186');
const NOW=Date.UTC(2026,9,10,5),cat=catalogOf(),[bx,by]=bedCorner(0),key=`${bx+2},${by+2}`,bed={by:U.m1,tended:NOW,empty:0};
const space=()=>Object.fromEntries(Array.from({length:49},(_,i)=>[`${bx+i%7},${by+Math.floor(i/7)}`,{soil:'tilled',plant:null}]));
const ripe=crop=>({by:U.m1,crop,sown:NOW-CROPS[crop].hours*3600000,boost:0,watered:0,fed:0,guard:NOW+3600000,cured:0,picked:0,pickedAt:0});
const purse=(items=[])=>({...newPurse(),bag:[...items.map(item=>({item,n:1})),...Array(15).fill(null)],stamina:{day:dayOf(NOW),left:100}});
const holding=(p,id)=>hold(p,p.bag.findIndex(s=>s?.item===id)).purse;
const seedPlots=async plots=>{
 await t.sql('delete from public.town_plots where bed=0');
 for(const [k,p]of Object.entries(plots)){const[x,y]=k.split(',').map(Number);await t.sql('insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,0,$3,$4,0)',[x,y,p.soil,p.plant?json(p.plant):null]);}
};
for(const id of Object.keys(GARDEN_ITEMS))t.check(`${id}: catalog agrees`,eq((await one("select town.cat('items')->$1 r",[id])).r,cat.items[id]));
const installedWorkshop=(await one("select town.cat('workshop') r")).r;
t.check('all installed phase recipes agree after chain',eq(installedWorkshop,{...cat.workshop,recipes:Object.fromEntries(Object.keys(installedWorkshop.recipes).map(id=>[id,cat.workshop.recipes[id]]))}));
for(const crop of Object.keys(GARDEN_CROPS))for(const rotation of [0,1,2,3])for(const at of [key,`${bx},${by}`,`${bx+6},${by+6}`]){
 const shape=(await one('select town.garden_shape($1,$2,$3) r',[at,crop,rotation])).r;
 t.check('shape agrees including boundaries',eq(shape,gardenShape(at,crop,rotation)),{at,crop,rotation,shape});
 t.check('placement checks every cell',eq((await one('select town.garden_room($1,$2,$3,$4) r',[at,crop,json(space()),rotation])).r,gardenRoom(at,crop,space(),rotation)));
}
for(const pair of [['pumpkin','cucumber'],['corn','basil'],['rowBean','teaBush'],['taro','kangkong']])for(const tools of [[],GARDEN_TOOLS]){
 const plots={...space(),[key]:{soil:'tilled',plant:ripe(pair[0])},[`${bx+3},${by+2}`]:{soil:'tilled',plant:ripe(pair[1])}},p=purse(tools);
 await seedPlots(plots);
 const want=gardenTend(key,plots,bed,1,0,p,U.m1,NOW,[]);
 const base=(await one('select town.tend($1,$2,$3,1,0,$4,$5,$6,false) r',[key,json(plots[key]),json(bed),json(p),U.m1,NOW])).r;
 t.check('cross selection agrees',eq((await one('select town.garden_cross($1,$2,$3,$4) r',[key,json(plots),U.m1,NOW])).r,gardenCross(key,plots,U.m1,NOW,[])));
 t.check('harvest pays cross and book exactly once',want.ok&&eq(base.purse,want.purse)&&eq(base.plot,want.plot)&&eq(base.got,want.got),{pair,tools,base,want});
 const repeat=(await one('select town.tend($1,$2,$3,1,0,$4,$5,$6,false) r',[key,json(base.plot),json(bed),json(base.purse),U.m1,NOW])).r;
 t.check('immediate repeat cannot pay a second harvest',!repeat.ok);
}
// Reservation trigger: the root mirrors care and clears its space, regardless of which RPC cared for it.
const cells=gardenShape(key,'bottleGourd',0),plant={...ripe('bottleGourd'),root:key,footprint:cells,rotation:0};
// A mixed row must count reservations beyond its row, and return all extras.
const vertical=gardenShape(key,'blueCorn',1),nextKey=`${bx+3},${by+2}`,mixed=space();
mixed[key].plant={...ripe('blueCorn'),root:key,footprint:vertical}; mixed[nextKey].plant=ripe('corn');
const mixedPlots=syncGarden(mixed),rowKeys=Object.keys(mixed).filter(k=>k.split(',')[1]===String(by+2));
const sickle={...purse(['gardenTwine']),gifts:{had:['charmSickle'],charms:['charmSickle']}};
await seedPlots(space());
for(const k of [key,nextKey]){const[x,y]=k.split(',').map(Number);await t.sql('update public.town_plots set plant=$1 where x=$2 and y=$3',[json(mixedPlots[k].plant),x,y]);}
const marks={[key]:true,[nextKey]:true},wantRow=rowTend(key,rowKeys,mixedPlots,bed,2,0,sickle,U.m1,NOW,marks,[]);
const gotRow=(await one('select town.row_tend($1,$2,$3,$4,2,0,$5,$6,$7,$8) r',[key,json(rowKeys),json(mixedPlots),json(bed),json(sickle),U.m1,NOW,json(marks)])).r;
t.check('sickle harvest agrees including extra crops and bed rest',wantRow.ok&&eq(gotRow.purse,wantRow.purse)&&eq(gotRow.got,wantRow.got)&&eq(gotRow.plots,wantRow.plots)&&eq(gotRow.bed,wantRow.bed),{gotRow,wantRow});
const growing={...mixedPlots,[key]:{soil:'tilled',plant:{...mixedPlots[key].plant,sown:NOW-3600000}}};
const clockP={...purse(),gifts:{had:['thingHourglass'],charms:[]}};
const glassWant=glassTurn(growing,clockP,U.m1,NOW,U.m1,[]),glassGot=(await one('select town.glass_turn($1,$2,$3,$4,$3) r',[json(growing),json(clockP),U.m1,NOW])).r;
t.check('hourglass counts roots instead of reserved cells',glassWant.ok&&eq(glassWant.quickened,glassGot.quickened)&&eq(glassWant.plots,glassGot.plots),{glassWant,glassGot});
const full={...purse(),bag:[{item:'longBean',n:1}]},crossPlots={...space(),[key]:{soil:'tilled',plant:ripe('longBean')},[nextKey]:{soil:'tilled',plant:ripe('basil')}};
await seedPlots(crossPlots);
t.check('full bag rejects the whole cross reward',(await one('select town.tend($1,$2,$3,1,0,$4,$5,$6,false) r',[key,json(crossPlots[key]),json(bed),json(full),U.m1,NOW])).r.why==='full');
const blocked=space();blocked[cells[1]].plant=ripe('corn');
t.check('occupied reservation refuses planting',(await one('select town.garden_room($1,$2,$3,0) r',[key,'bottleGourd',json(blocked)])).r===null);
await seedPlots(space());
const[x,y]=key.split(',').map(Number);
await t.sql('update public.town_plots set plant=$1 where x=$2 and y=$3',[json(plant),x,y]);
let stored=(await one('select town.garden_plots($1) r',[key])).r;
t.check('one root reserves every cell',cells.every(k=>eq(stored[k].plant,plant)));
t.check('satellite cannot be picked',(await one('select town.pick($1,$2,$3,true,null,$4) r',[cells[1],json(purse()),json(stored[cells[1]]),NOW])).r.why==='soil');
t.check('satellite offers no separate deed',(await one('select town.deed_for($1,$2,null,$3,$4,$3) r',[cells[1],json(stored[cells[1]]),U.m1,NOW])).r===null);
await t.sql("update public.town_plots set plant=jsonb_set(plant,'{fed}',to_jsonb($1::bigint)) where x=$2 and y=$3",[NOW,x,y]);
stored=(await one('select town.garden_plots($1) r',[key])).r;
t.check('a root feeding is mirrored across its footprint',cells.every(k=>stored[k].plant.fed===NOW));
await t.sql("update public.town_plots set plant=null,soil='cleared' where x=$1 and y=$2",[x,y]);
stored=(await one('select town.garden_plots($1) r',[key])).r;
t.check('removing a root frees its whole footprint',cells.every(k=>stored[k].plant===null));
const LIVE=(await one('select town.now_ms() n')).n,p=holding(purse(['seedBottleGourd','soilScoop']),'seedBottleGourd');
p.stamina={day:dayOf(LIVE),left:100};
await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[U.m1,json(p)]);
await t.sql('delete from public.town_beds where bed=0');
await seedPlots(space());
const planted=await t.as(U.m1,'select public.town_tend($1,$2,$3,false) r',[x,y,json({rotation:1})]);
t.check('member RPC accepts rotation and root reservation',planted.rows?.[0]?.r?.ok===true&&eq(planted.rows[0].r.plot?.plant?.footprint,gardenShape(key,'bottleGourd',1)),planted);
const docBefore=(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc;
const plotsBefore=(await one('select town.garden_plots($1) r',[key])).r;
const duplicate=await t.as(U.m1,'select public.town_tend($1,$2,null,false) r',[x,y]);
t.check('duplicate sow refuses without consuming anything',!duplicate.rows?.[0]?.r?.ok&&eq(docBefore,(await one('select doc from public.town_purses where member_id=$1::uuid',[U.m1])).doc)&&eq(plotsBefore,(await one('select town.garden_plots($1) r',[key])).r),duplicate);
for(const role of ['anon',U.unver,U.nochar]){const r=await t.as(role,'select public.town_tend($1,$2,null,false) r',[x,y]);t.check('unverified and anon cannot tend',!!r.error||!r.rows?.[0]?.r?.ok,r);}
for(const role of ['anon',U.m1,U.m2])t.check('garden reward helper private',!!(await t.as(role,'select town.garden_cross($1,$2,$3,$4)',[key,json(space()),U.m1,NOW])).error);
t.done();await t.db.close();
