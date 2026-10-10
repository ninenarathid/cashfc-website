import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual as eq } from 'node:util';
import { standIn } from './stand-in.mjs';
import { U } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { accountOf, veinFrom }=await import('@/lib/town/vein-account');
const { faceOf,bestRoute }=await import('@/lib/town/vein');
const { echoOf,geologicalYield,geologyMods }=await import('@/lib/town/geology');
const { GEOLOGY_ITEMS,GEOLOGY_TOOLS }=await import('@/lib/town/geology-items');
const { catalogOf }=await import('@/lib/town/catalog');
const { newPurse }=await import('@/lib/town/trade');
const t=await standIn({upTo:179}),root=process.env.FC_REPO,one=async(sql,args=[])=>(await t.sql(sql,args)).rows[0];
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
await t.runTwice(readFileSync(process.env.MIGRATION_FILE??join(root,'supabase/v185_listening_to_the_layers_of_rock.sql'),'utf8'),'v185');
const NOW=Date.UTC(2026,9,10,5),cat=catalogOf();
for(const id of Object.keys(GEOLOGY_ITEMS))t.check(`${id} catalog matches site`,eq((await one("select town.cat('items')->$1 r",[id])).r,cat.items[id]));
for(const tools of [[],GEOLOGY_TOOLS])for(const floor of [1,12,25])for(let seed=10;seed<16;seed++){
 const v={f:floor,rock:1,turn:2,seed,gem:'fire',mods:{strikes:12,back:1,cross:1,spent:false},more:0},p={...newPurse(),bag:[...tools.map(item=>({item,n:1})),...Array(15).fill(null)],mine:{vein:v}},route=bestRoute(faceOf(seed,true),v.mods);
 if(seed===10)t.check('geology modifiers agree',eq((await one('select town.geology_mods($1,$2) r',[JSON.stringify(p),NOW])).r,geologyMods(p,NOW)));
 for(const focus of ['ore','crystal'])for(const echo of [-1,1]){
  const choice={echo,focus},a=accountOf(v,route.strikes,choice),want=veinFrom(p,a,NOW),got=(await one('select town.vein_end($1,$2,$3) r',[JSON.stringify(p),JSON.stringify(a),NOW])).r;
  t.check('accepted vein account yields match',eq(got,want),{seed,floor,focus,echo,got,want});
  t.check('geological bonus matches',eq((await one('select town.geological_yield($1,$2,$3,$4,$5) r',[JSON.stringify(v),JSON.stringify(choice),a.ore,a.gems.length,JSON.stringify(p)])).r,geologicalYield(v,choice,a.ore,a.gems.length,p)));
 }
}
for(const v of [null,{},[],{echo:'-1',focus:'ore'},{echo:-1},{focus:'crystal'},{echo:1,focus:'coins'}])t.check('hostile choices rejected',(await one('select town.rock_choice($1) r',[JSON.stringify(v)])).r===false);
const vein={f:12,rock:1,turn:2,seed:13,gem:'fire',mods:{strikes:12,back:1,cross:1,spent:false},more:0},p={...newPurse(),bag:Array(8).fill(null),mine:{vein}},route=bestRoute(faceOf(13,true),vein.mods),a=accountOf(vein,route.strikes,{echo:echoOf(13),focus:'crystal'});
const first=(await one('select town.vein_end($1,$2,$3) r',[JSON.stringify(p),JSON.stringify(a),NOW])).r;
t.check('replayed vein cannot yield twice',(await one('select town.vein_end($1,$2,$3) r',[JSON.stringify(first.purse),JSON.stringify(a),NOW])).r.why==='none');
const full={...p,bag:[{item:'salt',n:20}]};
t.check('full bag leaves the open vein unpaid',(await one('select town.vein_end($1,$2,$3) r',[JSON.stringify(full),JSON.stringify(a),NOW])).r.why==='full');
for(const role of ['anon',U.m1,U.m2])t.check('reward helper is private',!!(await t.as(role,'select town.geological_yield($1,$2,1,1,$3) r',[JSON.stringify(vein),JSON.stringify(a.geology),JSON.stringify(p)])).error);
for(const role of ['anon',U.unver,U.nochar]){const r=await t.as(role,'select public.town_vein($1) r',[JSON.stringify(a)]);t.check('only verified members can claim',!!r.error||!r.rows?.[0]?.r?.ok,r);}
t.done();await t.db.close();
