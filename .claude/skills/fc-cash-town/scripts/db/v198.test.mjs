// Copy next to the existing PGlite harness. No remote writes.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { standIn } from './stand-in.mjs';
import { migration } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { catalogOf }=await import('@/lib/town/catalog');
const { REGIONAL_ITEMS,REGIONAL_FISH,REGIONAL_DISHES,REGIONAL_SCROLLS }=await import('@/lib/town/regional-fish');
const { oddsOf,starOdds }=await import('@/lib/town/fishing');
const { cook }=await import('@/lib/town/cooking');
const { newPurse }=await import('@/lib/town/trade');
const root=process.env.FC_REPO,t=await standIn({upTo:178}),one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
await t.run(migration(179),'v179');
// Include the independently installed hook slot in the tested release path.
await t.run(migration(183),'v183');
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql','v188_the_parts_a_forest_can_spare.sql','v194_secret_equipment_bonds.sql','v196_the_channels_and_properties_of_water.sql','v197_preparing_food_and_a_camp_for_friends.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
const eq=(a,b)=>{
 if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<1e-8;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 const ks=Object.keys(a).sort();return JSON.stringify(ks)===JSON.stringify(Object.keys(b).sort())&&ks.every(k=>eq(a[k],b[k]));
};
const preserve=(a,b)=>Object.entries(a).every(([key,val])=>Array.isArray(val)?val.every((v,i)=>eq(v,b?.[key]?.[i])):val&&typeof val==='object'?preserve(val,b?.[key]??{}):eq(val,b?.[key]));
const before=(await t.sql('select key,data from public.town_catalog')).rows,people=(await t.sql('select * from public.town_purses order by member_id')).rows;
const town=[];
for(const bait of ['worm','corn','loach'])for(const hour of [4,12,22])town.push({bait,hour,odds:(await one("select town.odds($1,$2,true,true,false,array['after'],0.5) r",[bait,hour])).r});
const sql=readFileSync(join(root,'supabase/v198_twenty_fish_for_each_water.sql'),'utf8');
await t.run(sql,'v198 first run');
const once=(await t.sql('select key,data from public.town_catalog order by key')).rows;
await t.run(sql,'v198 rerun');
t.check('rerun has no duplicate fish, dishes, hints or scrolls',eq(once,(await t.sql('select key,data from public.town_catalog order by key')).rows));
t.check('no member inventory or coins changed',eq(people,(await t.sql('select * from public.town_purses order by member_id')).rows));
const cat=catalogOf(),rows=Object.fromEntries(once.map(r=>[r.key,r.data]));
for(const old of before)t.check('existing catalog preserved '+old.key,preserve(old.data,rows[old.key]));
for(const habitat of ['creek','headwater','pool'])t.check('twenty exclusive '+habitat,Object.values(rows.fish).filter(f=>f.habitat?.length===1&&f.habitat[0]===habitat).length===20);
for(const c of town)t.check('town odds preserved '+c.bait+'/'+c.hour,eq(c.odds,(await one("select town.odds($1,$2,true,true,false,array['after'],0.5) r",[c.bait,c.hour])).r));
for(const id of Object.keys(REGIONAL_ITEMS))t.check('item rules '+id,eq(rows.items[id],cat.items[id]));
for(const[id,f]of Object.entries(REGIONAL_FISH)){
 t.check('fish rules '+id,eq(rows.fish[id],cat.fish[id]));
 const bait=Object.keys(f.baits)[0],hour=f.hours[0][0],current=f.current[0],signs=f.needs??[];
 for(const habitat of ['town','creek','headwater','pool']){
  const got=(await one('select town.river_odds($1,$2,true,false,false,$3::text[],0,$4,$5) r',[bait,hour,signs,habitat,current])).r,want=oddsOf(bait,hour,true,false,false,signs,habitat,current);
  t.check('reachable and exclusive '+id+'/'+habitat,eq(got,want)&&got.some(o=>o.what===id)===(habitat===f.habitat[0]),{got,want});
 }
}
for(const habitat of ['town','creek','headwater','pool'])for(const current of ['eddy','run','shelter']){
 const got=(await one("select town.river_star_odds(true,false,array['after'],3,$1,$2) r",[habitat,current])).r;
 t.check('star habitat filter '+habitat+'/'+current,eq(got,starOdds(true,false,['after'],3,habitat,current)));
}
const now=Date.UTC(2026,9,10,6);
for(const[id,d]of Object.entries(REGIONAL_DISHES)){
 const r=d.recipe,p={...newPurse(),bag:[...r.needs.map(([item,n])=>({item,n})),null]};
 const got=(await one('select town.cook($1,$2,$3,0,$4) r',[JSON.stringify(p),JSON.stringify(r.needs),JSON.stringify(r.in),now])).r;
 t.check('actual cooking '+id,got.ok&&got.made===id&&eq(got,cook(p,r.needs,r.in,0,now)),{got});
 const full={...p,bag:r.needs.map(([item,n])=>({item,n:n+1}))},noRoom=(await one('select town.cook($1,$2,$3,0,$4) r',[JSON.stringify(full),JSON.stringify(r.needs),JSON.stringify(r.in),now])).r;
 t.check('full bag refuses '+id,noRoom.ok===false&&noRoom.why==='full');
 t.check('hint and helper points '+id,rows.hints.ids.filter(([known])=>known===id).length===1&&rows.work.kitchen.pot[id]>0);
}
for(const[id,d]of Object.entries(REGIONAL_SCROLLS))t.check('recipe scroll '+id,rows.scrolls[id]===d&&eq(rows.items[id],cat.items[id]));
t.done();await t.db.close();
