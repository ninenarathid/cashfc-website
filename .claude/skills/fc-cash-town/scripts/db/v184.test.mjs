import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { standIn } from './stand-in.mjs';
import { U } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { grainOf } = await import('@/lib/town/wood-grain');
const { woodMods, woodQuality, woodYield } = await import('@/lib/town/woodcutting');
const { newPurse, held } = await import('@/lib/town/trade');
const { dayOf } = await import('@/lib/town/stamina');
const { catalogOf } = await import('@/lib/town/catalog');
const { WOOD_ITEMS } = await import('@/lib/town/wood-items');
const root = process.env.FC_REPO;
const t = await standIn({ upTo: 179 }), one = async (sql, args = []) => (await t.sql(sql,args)).rows[0];
const file = process.env.MIGRATION_FILE ?? join(root,'supabase/v184_reading_the_grain_before_the_axe.sql');
for (const n of [180,181,182]) {
 const name = {180:'v180_a_workshop_for_the_tools.sql',181:'v181_more_lines_on_the_water.sql',182:'v182_fishing_the_streams_and_pools.sql'}[n];
 await t.run(readFileSync(join(root,'supabase',name),'utf8'),`v${n} prerequisite`);
}
await t.runTwice(readFileSync(file,'utf8'),'v184');
const NOW = Date.UTC(2026,9,10,5);
const ready = tools => ({...newPurse(),bag:[{item:'axe',n:1},...tools.map(item=>({item,n:1})),...Array(12).fill(null)],hand:'axe',handAt:0,stamina:{day:dayOf(NOW),left:100}});
const eq=isDeepStrictEqual;
const cat=catalogOf();
for (const id of Object.keys(WOOD_ITEMS)) t.check(`${id} catalog matches site`,eq((await one("select town.cat('items')->$1 as r",[id])).r,cat.items[id]));
for (const tools of [[],['notchGauge'],['grainLens','braceStake'],['barkKnife','sapTap']]) {
 const p=ready(tools);if(tools.includes('grainLens'))p.buffs=[{id:'grain',level:4,until:NOW+10000}];
 t.check('strongest grain hints agree',eq((await one('select town.wood_mods($1,$2) r',[JSON.stringify(p),NOW])).r,woodMods(p,NOW)));
 for(let id=0;id<16;id++) for(const misses of [0,1,2]) {
  const plan=grainOf(id), choice={notches:plan.notches,direction:plan.lean,part:'wood'};
  if(misses===2)choice.direction=-choice.direction;
  const quality=woodQuality(id,choice,misses,p,NOW);
  t.check('grain quality server/site parity',(await one('select town.wood_quality($1,$2,$3,$4,$5) r',[id,JSON.stringify(choice),misses,JSON.stringify(p),NOW])).r===quality);
 }
 for(const elder of [false,true]) for(const part of ['wood','bark','sap','seed','root']) for(const quality of ['rough','clear','heart']) {
  const choice={...grainOf(3),direction:grainOf(3).lean,part};
  t.check('selected part server/site parity',eq((await one('select town.wood_yield($1,$2,$3,$4) r',[elder,part,quality,JSON.stringify(p)])).r,woodYield(3,elder,choice,quality,p)));
 }
}
for(const value of [null,{},[],{notches:[-1,-1,-1],part:'wood'},{notches:[-1,-1,-1],direction:-1},{notches:['-1',-1,-1],direction:-1,part:'wood'},{notches:[-1,-1,-1],direction:-1,part:'coin'}]) t.check('malformed grain choices rejected',(await one('select town.wood_choice($1) r',[JSON.stringify(value)])).r===false);
const tr=(await one("select town.cat('trees')->'wood'->0 r")).r,id=tr[0],at=[tr[1],tr[2]],p=ready([]),g={down:{},half:[]};
const plan=grainOf(id),went={tree:id,through:true,misses:0,secs:60,grain:{notches:plan.notches,direction:plan.lean,part:'wood'}};
const cut=async (purse,grove,w=went)=> (await one('select town.fell($1,$2,$3,$4,$5,$6,$7,$8,$3) r',[JSON.stringify(purse),JSON.stringify(grove),'me',JSON.stringify(w),...at,NOW,'[]'])).r;
let did=await cut(p,g);
t.check('complete board earns selected wood',did.ok&&held(did.purse.bag,'heartwood')===2&&did.felled[0].quality==='heart',did);
t.check('replay cannot collect twice',(await cut(did.purse,did.grove)).why==='stump');
const lost=await cut(p,g,{...went,through:false});
t.check('lost board changes neither bag nor stamina',lost.ok&&eq(lost.purse,p)&&lost.got.length===0,lost);
const full={...p,bag:[{item:'axe',n:1},{item:'log',n:1},{item:'timber',n:1},{item:'salt',n:20},{item:'rice',n:20}]};
t.check('full bag refuses whole harvest',(await cut(full,g)).why==='full');
t.check('another player owns their open tree',(await cut(p,{...g,goes:{other:{trees:[id],at:NOW}}})).ok===false);
for(const role of ['anon',U.m1,U.m2]) {
 const result=await t.as(role,"select town.wood_yield(false,'wood','heart',$1) r",[JSON.stringify(p)]);
 t.check('member cannot mint wood through helper',!!result.error,result);
}
for(const role of ['anon',U.unver,U.nochar]) {
 const result=await t.as(role,'select public.town_fell($1,$2,$3) r',[JSON.stringify(went),...at]);
 t.check('anonymous/unverified cannot fell',!!result.error||!result.rows?.[0]?.r?.ok,result);
}
t.done();
await t.db.close();
