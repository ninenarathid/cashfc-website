import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comboDB } from './combo-db.mjs';
await import('./repo-ts-town.mjs');
const { newPurse }=await import('@/lib/town/trade');
const { giftsOf }=await import('@/lib/town/gifts');
const { comboLoadout,prepareCombo,rescueCombo }=await import('@/lib/town/private/combos');
const db=await comboDB(), q=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
let checks=0; const check=(name,yes)=>{assert.ok(yes,name);checks++;};
const m1='00000000-0000-0000-0000-000000000001',NOW=Date.UTC(2026,9,10,5);
const p=(charms,familiar)=>{const p=newPurse();return {...p,gifts:{...giftsOf(p),had:[...charms,familiar],charms,familiar}};};
const as=async(role,sub,sql,args=[])=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[sub??'']);await db.query("select set_config('request.jwt.claim.role',$1,false)",[role]);await db.exec(`set role ${role}`);try{return await db.query(sql,args);}finally{await db.exec('reset role');}};
const before=(await q("select jsonb_agg(jsonb_build_array(key,data) order by key) d from public.town_catalog")).d;
const purses=(await q('select jsonb_agg(to_jsonb(p)) d from public.town_purses p')).d;
const sql=readFileSync('supabase/v194_secret_equipment_bonds.sql','utf8');await db.exec(sql);await db.exec(sql);
const pair=p(['charmFloat','charmLine'],'famOtter');
check('SQL matcher supports two charms',(await q('select town.combo_match($1,$2) d',[JSON.stringify(pair),JSON.stringify({requires:['charmFloat','charmLine']})])).d);
check('SQL matcher never activates two pets',(await q('select town.combo_match($1,$2) d',[JSON.stringify({...pair,gifts:{...pair.gifts,had:[...pair.gifts.had,'famBat']}}),JSON.stringify({requires:['famOtter','famBat']})])).d===false);
check('installation and rerun preserve catalog',JSON.stringify((await q("select jsonb_agg(jsonb_build_array(key,data) order by key) d from public.town_catalog")).d)===JSON.stringify(before));
check('installation and rerun do not change purses',JSON.stringify((await q('select jsonb_agg(to_jsonb(p)) d from public.town_purses p')).d)===JSON.stringify(purses));
for(const role of ['anon','authenticated'])for(const sig of ['town.combo_rules()','town.combo_loadout(jsonb)','town.combo_match(jsonb,jsonb)','town.combo_cue(jsonb,text)','town.combo_grant(jsonb,text,text,bigint,jsonb)','town.combo_rescue(jsonb,text,bigint,text)'])check(`private: ${role} ${sig}`,!(await q('select has_function_privilege($1,$2,\'EXECUTE\') ok',[role,sig])).ok);
check('member RPC only',!(await q("select has_function_privilege('anon','public.town_combo(text,jsonb)','EXECUTE') ok")).ok && (await q("select has_function_privilege('authenticated','public.town_combo(text,jsonb)','EXECUTE') ok")).ok);
for(const [charms,fam] of [[['charmFloat'],'famOtter'],[['charmFloat','charmLine'],'famOtter'],[['charmEchoAxe'],'famWoodpecker'],[['charmMinerLamp'],'famBat'],[['charmMinerLamp'],'famWoodpecker']]){
 const purse=p(charms,fam),loadout=(await q('select town.combo_loadout($1) d',[JSON.stringify(purse)])).d;
 check('normalized snapshots agree',loadout===comboLoadout(purse));
 for(const context of ['wear','wood','cavity','echo']){ const result=(await q('select town.combo_cue($1,$2) d',[JSON.stringify(purse),context])).d; if(context==='wear')check('equipment cue reveals no recipe',typeof result==='string'); }
}
let otter=p(['charmFloat'],'famOtter');
for(let i=0;i<4;i++){
 const expected=rescueCombo(otter,`fish:${i}`,NOW,comboLoadout(otter));
 const got=(await q('select town.combo_rescue($1,$2,$3,$4) d',[JSON.stringify(otter),`fish:${i}`,NOW,comboLoadout(otter)])).d;
 check('water quota agrees with trial',!!got.ok===!!expected);
 if(expected) assert.deepEqual(got.effect,expected.effect);
 if(expected){assert.deepEqual(got.purse,expected.purse);otter=expected.purse;}
}
const repeated=(await q('select town.combo_rescue($1,$2,$3,$4) d',[JSON.stringify(otter),'fish:2',NOW,comboLoadout(otter)])).d;
check('duplicate at exhausted quota does not consume again',repeated.ok && repeated.purse.combos.used.rescue.n===3 && !repeated.effect.fresh);
check('snapshot change rejects rescue',!(await q('select town.combo_rescue($1,$2,$3,$4) d',[JSON.stringify(p(['charmFloat','charmLine'],'famOtter')),'fish:new',NOW,comboLoadout(otter)])).d.ok);
check('new dawn resets shared pool',(await q('select town.combo_rescue($1,$2,$3,$4) d',[JSON.stringify(otter),'fish:tomorrow',NOW+86400000,comboLoadout(otter)])).d.purse.combos.used.rescue.n===1);
// Set up actual member context and a pending server-owned vein; inputs cannot select a recipe or seed.
const bat=p(['charmMinerLamp'],'famBat');
bat.mine={vein:{f:12,rock:2,turn:3,seed:13,gem:null,mods:{strikes:8,back:0,cross:0,spent:false},more:0,geology:{hint:false,cavities:false},comboLoadout:comboLoadout(bat)}};
await db.query('select town.purse_of($1,true)',[m1]);
await db.query('select town.keep_purse($1,$2)',[m1,JSON.stringify(bat)]);
const rpc=async(c,input={})=>(await as('authenticated',m1,'select public.town_combo($1,$2) d',[c,JSON.stringify(input)])).rows[0].d;
let r=await rpc('wear');check('wear is a hint only',r.ok && r.cue==='echo' && !r.purse?.combos);
r=await rpc('cavity',{key:'SC13',seed:999,cap:999});check('server target grants correct reaction',r.ok && r.effect.cavities && r.effect.fresh && r.purse.combos.found[0].key==='SC03');
r=await rpc('cavity');check('RPC replay is idempotent',r.ok && !r.effect.fresh && r.purse.combos.found.length===1);
check('wrong target context does not reveal recipes',!(await rpc('echo')).ok);
const swapped={...bat,gifts:{...bat.gifts,had:['charmMinerLamp','famWoodpecker'],familiar:'famWoodpecker'}};
await db.query('select town.keep_purse($1,$2)',[m1,JSON.stringify(swapped)]);check('switching equipment after opening cannot claim',(await rpc('echo')).ok===false);
await db.query('select town.keep_purse($1,$2)',[m1,JSON.stringify({...bat,mine:{}})]);check('no active vein rejects discovery',(await rpc('cavity')).ok===false);
for(const sub of ['00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005']){
 let refused=false;try{const r=await as('authenticated',sub,"select public.town_combo('wear') d");refused=!r.rows[0].d.ok;}catch{refused=true;}check('non-member cannot inspect reactions',refused);
}
// Wood is bound to the held go; only one bad notch beyond existing hints is returned.
const wood=p(['charmEchoAxe'],'famWoodpecker');await db.query('select town.keep_purse($1,$2)',[m1,JSON.stringify(wood)]);
const now=(await q('select town.now_ms() n')).n;
await db.query("select town.keep_thing('grove',$1)",[JSON.stringify({down:{},half:[],goes:{[m1]:{trees:[5],at:Number(now),comboTree:5,comboHints:1,comboLoadout:comboLoadout(wood)}}})]);
const w=await rpc('wood',{notches:[-1,1,-1],tree:999});check('wood trusts held tree and hint snapshot',w.ok && w.effect.index===1 && w.effect.side===-1);
check('wrong-shaped wood input rejects',(await rpc('wood',{notches:[0,1,-1]})).ok===false);
check('corrected retry gives the same hint',(await rpc('wood',{notches:[1,-1,1]})).effect.index===1);
await db.query("select town.keep_thing('grove',$1)",[JSON.stringify({down:{},half:[],goes:{[m1]:{trees:[5],at:Number(now)-46000,comboTree:5,comboHints:0,comboLoadout:comboLoadout(wood)}}})]);
check('expired tree go rejects',(await rpc('wood',{notches:[-1,1,-1]})).ok===false);
// The real landing RPC must grant the fixed warm start only after an ordinary otter rescue.
for(const trio of [false,true]){
 const fishP=p(trio?['charmFloat','charmLine']:['charmFloat'],'famOtter');
 await db.query('select town.keep_purse($1,$2)',[m1,JSON.stringify(fishP)]);
 const t=Number((await q('select town.now_ms() n')).n);
 const line={what:'catfish',size:30,bait:'worm',cast_at:t-30000,struck_at:t-12000,bites_at:t-15000,wait:15,nibbles:[],harder:1,spent:false,deep:false,x:9,y:9,hour:12,comboLoadout:comboLoadout(fishP)};
 await db.query('insert into public.town_lines(member_id,doc) values($1,$2) on conflict(member_id) do update set doc=excluded.doc',[m1,JSON.stringify(line)]);
 const result=(await as('authenticated',m1,"select public.town_land('snapped','{\"resume\":1}'::jsonb) d")).rows[0].d;
 check('real rescue has server-owned boost',result.again && result.combo.resume===(trio?.35:.2) && result.combo.fresh);
 const saved=(await q('select doc d from public.town_lines where member_id=$1',[m1])).d;
 check('line remembers boost and otter quota is spent',saved.again && saved.comboResume===(trio?.35:.2) && result.purse.gifts.used.famOtter.n===1);
 // Immediate fake landing still fails, even if the request claims 100% progress.
 const fake=(await as('authenticated',m1,"select public.town_land('landed','{\"resume\":1}'::jsonb) d")).rows[0].d;
 check('client resume claims cannot bypass shortest fight',fake.how==='slipped' && !fake.kept);
}
console.log(`${checks} combo database checks passed, including real member RPCs, rerun, privilege checks and quota parity.`);await db.close();
