// Copy beside the PGlite harness in fcnext-codex-bench; FC_REPO=<checkout> node v179.test.mjs
import { pathToFileURL } from 'node:url';
import './repo-ts-town.mjs';
import { standIn } from './stand-in.mjs';
import { U, migration } from './pglite-harness.mjs';
const root = process.env.FC_REPO ?? 'E:/NinenineProject/fcnext';
const { moveBox, sortBox, roomyBox } = await import(pathToFileURL(`${root}/lib/town/box.ts`));
const t = await standIn({upTo:176});
const source = migration(179);
const one = async (sql,args=[]) => (await t.sql(sql,args)).rows[0];
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).sort().map(([k,x])=>[k,canon(x)])) : v;
const same = (a,b) => JSON.stringify(canon(a))===JSON.stringify(canon(b));
const catalog = (await t.sql('select key,data from public.town_catalog order by key')).rows;
await t.runTwice(source,'v179');
t.check('catalog and prices unchanged',same(catalog,(await t.sql('select key,data from public.town_catalog order by key')).rows));
const pool = [null,{item:'log',n:30},{item:'log',n:40},{item:'stone',n:9},{item:'timber',n:2},{item:'minnow',n:4},
  {item:'potFull',n:1,of:{dish:'tomYum',left:3}},{item:'can',n:1,water:2},{item:'axe',n:1,plus:6,forged:{opts:['axGrain'],gems:['fire']}},
  {item:'futureItem',n:3,extra:{keep:true}},{item:'log',n:1,custom:'keep this'}];
let seed=421; const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
let bad=[],cases=0;
for (let i=0;i<160;i++) {
  const more=[0,10,30][rand(3)],box=roomyBox({more,things:Array.from({length:10+more},()=>structuredClone(pool[rand(pool.length)]))});
  const from=rand(box.things.length+2)-1,to=rand(box.things.length+2)-1;
  const want=moveBox(box,from,to,[35,35]);
  const got=(await one('select town.box_move($1::jsonb,$2::int,$3::int) r',[JSON.stringify(box),from,to])).r;
  if(!same(want,got))bad.push({i,from,to,want,got}); cases++;
  const wantSort=sortBox(box,[35,35]).box;
  const gotSort=(await one('select town.box_sort($1::jsonb) r',[JSON.stringify(box)])).r;
  if(!same(wantSort,gotSort))bad.push({i,wantSort,gotSort}); cases++;
}
t.check(`${cases} move/sort code and SQL vectors agree`,!bad.length,bad[0]);
const state=id=>one('select town.box_of($1::uuid) box,town.purse_of($1::uuid,false) purse',[id]);
const seedBox=async id=>{
  await t.sql('insert into public.town_purses(member_id,coins,doc) values($1,1234,town.fresh()) on conflict(member_id) do update set coins=excluded.coins,doc=excluded.doc',[id]);
  const box=roomyBox({more:30,things:[pool[6],pool[1],null,pool[2],pool[7],pool[8],pool[9]]});
  await t.sql('insert into public.town_boxes(member_id,things,more) values($1,$2::jsonb,30) on conflict(member_id) do update set things=excluded.things,more=excluded.more',[id,JSON.stringify(box.things)]);
};
const move=async(id,from,to,expected,x=35,y=35)=>{
  const r=await t.as(id,'select public.town_box_move($1::int,$2::int,$3::jsonb,$4::int,$5::int) r',[from,to,JSON.stringify(expected),x,y]);
  return r.error?r:r.rows[0].r;
};
const sort=async(id,expected,x=35,y=35)=>{
  const r=await t.as(id,'select public.town_box_sort($1::jsonb,$2::int,$3::int) r',[JSON.stringify(expected),x,y]);
  return r.error?r:r.rows[0].r;
};
await seedBox(U.m1);await seedBox(U.m2);
const other=await state(U.m2),start=await state(U.m1);
const read=await t.as(U.m1,'select public.town_box() r');
t.check('read advertises layout controls',read.rows[0].r.boxTidy===true);
const moved=await move(U.m1,0,9,start.box.things),afterMove=await state(U.m1);
t.check('move persists the full food stack in target slot',moved.ok&&same(afterMove.box.things[9],pool[6])&&afterMove.box.things[0]===null,moved);
t.check('move retains capacity and full purse',afterMove.box.more===30&&afterMove.box.things.length===40&&same(afterMove.purse,start.purse));
const stale=await move(U.m1,0,8,start.box.things);
t.check('stale drag is refused and returns current storage',!stale.ok&&stale.why==='changed'&&same(stale.box,afterMove.box)&&same(afterMove,await state(U.m1)),stale);
const staleSort=await sort(U.m1,start.box.things);
t.check('stale sort is refused without overwriting newer positions',staleSort.why==='changed'&&same(afterMove,await state(U.m1)));
const sorted=await sort(U.m1,afterMove.box.things),afterSort=await state(U.m1);
t.check('sort persists and matches the pure rule',sorted.ok&&same(afterSort.box,sortBox(afterMove.box,[35,35]).box),sorted);
t.check('sort retains food, water, forging, unknown items and purse',same(afterSort.purse,start.purse)&&[pool[6],pool[7],pool[8],pool[9]].every(s=>afterSort.box.things.some(x=>same(x,s))));
t.check('other character unchanged',same(other,await state(U.m2)));
const forged=structuredClone(afterSort.box.things);forged[0]={item:'log',n:99999};
t.check('clients cannot inject replacement contents',(await sort(U.m1,forged)).why==='changed'&&same(afterSort,await state(U.m1)));
for(const [from,to,x,y,why]of [[0,40,35,35,'none'],[0,0,35,35,'none'],[39,0,35,35,'none'],[0,1,0,0,'far'],[0,1,null,35,'far']]){
  const did=await move(U.m1,from,to,afterSort.box.things,x,y);
  t.check(`refusal ${why} changes nothing`,did.why===why&&same(afterSort,await state(U.m1)),did);
}
t.check('null snapshot is refused',(await sort(U.m1,null)).why==='changed');
t.check('anonymous cannot move',(await move('anon',0,1,afterSort.box.things)).code==='42501');
t.check('anonymous cannot sort',(await sort('anon',afterSort.box.things)).code==='42501');
t.check('unverified member refused',!!(await sort(U.unver,afterSort.box.things)).error);
t.check('account without character refused',!!(await sort(U.nochar,afterSort.box.things)).error);
t.check('private helper closed',(await t.as(U.m1,"select town.box_sort('{}'::jsonb)")).code==='42501');
t.check('direct writes closed',(await t.as(U.m1,"update public.town_boxes set things='[]'::jsonb")).code==='42501');
await t.sql("update public.town_knobs set value=0 where key='game_open'");
t.check('closed game refuses arrangement',!!(await sort(U.m1,afterSort.box.things)).error);
await t.sql("update public.town_knobs set value=1 where key='game_open'");
await t.db.exec(source);
t.check('migration rerun preserves all stored things and resources',same(afterSort,await state(U.m1))&&same(other,await state(U.m2)));
t.done(); await t.db.close();
