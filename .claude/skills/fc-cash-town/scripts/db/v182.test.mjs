import { readFileSync } from 'node:fs';
import { standIn } from './stand-in.mjs';
import { U } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { catalogOf } = await import('@/lib/town/catalog');
const { oddsOf,starOdds } = await import('@/lib/town/fishing');
const { RIVER_ITEMS,RIVER_FISH,RIVER_MAKES,RIVER_DISHES } = await import('@/lib/town/river-items');
const { cook } = await import('@/lib/town/cooking');
const { raised } = await import('@/lib/town/stamina');
const { castPattern,patternOdds } = await import('@/lib/town/river-fishing');
const { newPurse } = await import('@/lib/town/trade');
const t=await standIn({upTo:179});
const one=async(s,p=[]) => (await t.sql(s,p)).rows[0];
const file=n=>process.env.FC_REPO+`/.claude/skills/fc-cash-town/scripts/db/${n}`;
await t.run(readFileSync(file('v181_fishing_draft.sql'),'utf8'),'v181 prerequisite');
const before=(await t.sql('select key,data from public.town_catalog order by key')).rows;
const oldTown=[];
for(const bait of ['worm','loach','corn'])for(const hour of [4,12,22]) oldTown.push({bait,hour,odds:(await one('select town.odds($1,$2,true,true,false,array[\'after\'],0.15) o',[bait,hour])).o});
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??file('v182_river_draft.sql'),'utf8'),'v182');
const same=(a,b)=>{
 if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<1e-8;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
 const ks=Object.keys(a).sort();return JSON.stringify(ks)===JSON.stringify(Object.keys(b).sort())&&ks.every(k=>same(a[k],b[k]));
};
for(const c of oldTown)t.check(`town odds unchanged: ${c.bait} at ${c.hour}`,same(c.odds,(await one('select town.odds($1,$2,true,true,false,array[\'after\'],0.15) o',[c.bait,c.hour])).o));
const cat=catalogOf(), rows=Object.fromEntries((await t.sql('select key,data from public.town_catalog')).rows.map(r=>[r.key,r.data]));
for(const old of before){
 const preserve=(a,b)=>Object.entries(a).every(([key,val])=>Array.isArray(val)? val.every((v,i)=>same(v,b?.[key]?.[i])) : val&&typeof val==='object'? preserve(val,b?.[key]??{}):same(val,b?.[key]));
 t.check(`existing catalog fields preserved: ${old.key}`,preserve(old.data,rows[old.key]));
}
t.check('25 new item rules match site',Object.keys(RIVER_ITEMS).length===25&&Object.keys(RIVER_ITEMS).every(id=>same(rows.items[id],cat.items[id])));
t.check('all regional water tiles match site',Object.keys(cat.fishing.waters).length>20&&same(rows.fishing.waters,cat.fishing.waters));
for(const [id,rule] of Object.entries({...RIVER_MAKES,...Object.fromEntries(Object.entries(RIVER_DISHES).map(([id,d])=>[id,d.recipe]))})){
 const p={...newPurse(),bag:[...rule.needs.map(([item,n])=>({item,n})),...Array(12).fill(null)]}, crew=rule.in.length?rule.in:[null], now=Date.parse('2026-10-10T05:00:00Z');
 const got=(await one('select town.cook($1::jsonb,$2::jsonb,$3::jsonb,0,$4::bigint) o',[JSON.stringify(p),JSON.stringify(rule.needs),JSON.stringify(crew),now])).o;
 t.check(`river recipe ${id} cooks exactly like the site`,got.ok===true&&got.made===id&&same(got,cook(p,rule.needs,crew,0,now)),got);
}
const buffNow=Date.parse('2026-10-10T05:00:00Z'), buffPurse={...newPurse(),buffs:[{id:'calm',level:2,until:buffNow+3600000}]};
t.check('current meal buff agrees with site',same((await one("select town.raised($1::jsonb,'current',$2::bigint) o",[JSON.stringify(buffPurse),buffNow])).o,raised(buffPurse,'current',buffNow)));
t.check('river hints are appended once and match site',cat.hints.ids.filter(([id])=>Object.hasOwn(RIVER_MAKES,id)||Object.hasOwn(RIVER_DISHES,id)).every(rule=>rows.hints.ids.filter(([id])=>id===rule[0]).length===1&&rows.hints.ids.some(v=>same(v,rule))));
for(const habitat of ['town','creek','headwater','pool'])for(const current of ['eddy','run','shelter'])for(const bait of ['worm','corn','loach','shadeLure'])for(const hour of [4,7,12,21]){
 const got=(await one('select town.river_odds($1,$2,true,true,false,array[\'after\'],0.5,$3,$4) o',[bait,hour,habitat,current])).o;
 t.check(`${habitat}/${current}/${bait}/${hour}: server odds match game`,same(got,oddsOf(bait,hour,true,true,false,['after'],habitat,current)));
}
for(const habitat of ['town','creek','headwater','pool'])for(const current of ['eddy','run','shelter']) {
 const got=(await one('select town.river_star_odds(true,false,array[\'after\'],3,$1,$2) o',[habitat,current])).o;
 t.check(`star odds ${habitat}/${current}`,same(got,starOdds(true,false,['after'],3,habitat,current)));
}
const purse={...newPurse(),coins:1000,bag:[{item:'rodMaster',n:1},{item:'worm',n:10},...Array(16).fill(null)],hand:'rodMaster'};
let pattern=castPattern(purse,'worm',[150,140],'run',100);
for(let i=1;i<8;i++){
 const p={...purse,fishingPattern:pattern};
 const got=(await one('select town.river_pattern($1::jsonb,\'worm\',150,140,\'run\',$2::bigint) o',[JSON.stringify(p),100+i])).o;
 pattern=castPattern(p,'worm',[150,140],'run',100+i);
 t.check('pattern count agrees and is capped',same(got,pattern));
}
const os=oddsOf('loach',4,false,false,false,[],'creek','run');
for(const n of [1,4,6])t.check('repeated bait weights match game',same((await one('select town.river_pattern_odds($1::jsonb,$2) o',[JSON.stringify(os),n])).o,patternOdds(os,n)));
const put=async(p)=>t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2::jsonb) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[U.m1,JSON.stringify(p)]);
await put(purse);
const place=Object.entries(cat.fishing.waters).find(([,w])=>w.habitat==='creek')[0];
const [x,y]=place.split(',').map(Number);
for(const current of ['bogus',"run');drop table town_purses;--"]){
 const denied=await t.as(U.m1,'select public.town_cast(\'worm\',$1,$2,false,null,$3) r',[x,y,current]);
 t.check('invalid current is refused',denied.rows?.[0]?.r.ok===false,denied);
 t.check('invalid current does not spend bait',(await one('select town.held(town.purse_of($1::uuid,false)->\'bag\',\'worm\') n',[U.m1])).n===10);
}
const cast=await t.as(U.m1,'select public.town_cast(\'worm\',$1,$2,false,\'pair\',\'shelter\') r',[x,y]);
t.check('regional multi-line cast succeeds',cast.rows?.[0]?.r.ok===true&&cast.rows[0].r.line.lines===2,cast);
const line=(await one('select doc from public.town_lines where member_id=$1::uuid',[U.m1])).doc;
t.check('server remembers verified habitat and current',line.habitat==='creek'&&line.current==='shelter');
t.check('regional cast charges two baits',(await one('select town.held(town.purse_of($1::uuid,false)->\'bag\',\'worm\') n',[U.m1])).n===8);
t.check('successful cast stores pattern',(await one('select town.purse_of($1::uuid,false) p',[U.m1])).p.fishingPattern.n===1);
for(const role of ['anon','authenticated'])t.check('regional helper ACL stays private',!(await one("select has_function_privilege($1,'town.river_odds(text,integer,boolean,boolean,boolean,text[],double precision,text,text)','EXECUTE') allowed",[role])).allowed);
for(const who of ['anon',U.m1])t.check('private odds helper cannot be called',!!(await t.as(who,"select town.river_odds('worm',7,false,false,false,array[]::text[],null,'creek','run')")).error);
t.check('anonymous casting denied',!!(await t.as('anon','select public.town_cast(\'worm\',$1,$2)',[x,y])).error);
for(const who of [U.unver,U.nochar])t.check('casting requires a verified character',!!(await t.as(who,'select public.town_cast(\'worm\',$1,$2)',[x,y])).error);
t.check('only one public cast overload',(await one("select count(*)::int n from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='town_cast'")).n===1);
const altered=readFileSync(process.env.MIGRATION_FILE??file('v182_river_draft.sql'),'utf8');
await t.sql("comment on function public.town_cast(text,integer,integer,boolean,text,text) is 'guard tests';");
// Comments do not change function bodies; admin catalog knobs remain through a repeat install.
await t.sql("update public.town_catalog set data=jsonb_set(data,'{tilapia,rain}','9'::jsonb) where key='fish'");
await t.run(altered,'rerun with old admin knob');
t.check('admin modification preserved',(await one("select data->'tilapia'->>'rain' n from public.town_catalog where key='fish'")).n==='9');
t.done();await t.db.close();
