import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{grainOf}=await import('@/lib/town/wood-grain'),{listeningHarvest}=await import('@/lib/town/reward-wood');
const db=await rewardDB(218),now=Date.parse('2026-10-11T12:00:00+07:00'),day=dayOf(now);let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const base={...newPurse(),bag:[{item:'axe',n:1},...Array(15).fill(null)],hand:'axe',handAt:0,stamina:{day,left:40},gifts:{had:['charmListening','thingForesterKnife'],charms:['charmListening'],familiar:null}};
try{
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v218_')),'utf8');await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v218_verified).every(Boolean),true);
 const catalog=(await one("select town.cat('trees') c")).c,trees=catalog.wood.filter(t=>!catalog.elder||t[0]!==catalog.elder.id).slice(0,4);
 for(const tree of trees){
  const plan=grainOf(tree[0]);
  for(const [p,misses,notches,second]of [[base,0,plan.notches,'bark'],[base,0,plan.notches,'sap'],[base,0,plan.notches,'seed'],[{...base,wears:['barkKnife','sapTap']},0,plan.notches,'bark'],[{...base,wears:['braceStake']},1,plan.notches,'bark'],[base,0,plan.notches.map(x=>-x),'bark'],[{...base,gifts:{...base.gifts,charms:[]}},0,plan.notches,'bark'],[{...base,gifts:{...base.gifts,used:{charmListening:{k:day,n:5}}}},0,plan.notches,'bark']]){
   const grain={notches,direction:plan.lean,part:'wood',second},went={tree:tree[0],through:true,misses,secs:60,grain},grove={down:{},half:[]},luck=[{dark:1,scent:1,which:1,chain:1,keep:1,kind:1}],args=[JSON.stringify(p),JSON.stringify(grove),'test',JSON.stringify(went),tree[1]+1,tree[2],now,JSON.stringify(luck),'Test'];
   const original=(await one('select town.fell_v218($1::jsonb,$2::jsonb,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9) r',args)).r;eq(original.ok,true);
   const actual=(await one('select town.fell($1::jsonb,$2::jsonb,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9) r',args)).r;
   eq(actual,listeningHarvest(p,original,grain,misses,now,false));
   if(actual.purse.gifts.used?.charmListening?.n===1){eq(actual.purse.professionRewards.extraction,null);eq(actual.purse.gifts.used.charmListening.n,1);}
  }
 }
 // A bonus which cannot fit rejects the entire payout, not just the extra part.
 const p={...base,bag:[{item:'axe',n:1},{item:'log',n:1},{item:'timber',n:1},null]},tree=trees[0],plan=grainOf(tree[0]),went={tree:tree[0],through:true,misses:0,secs:60,grain:{notches:plan.notches,direction:plan.lean,part:'wood',second:'bark'}};
 eq((await one('select town.fell($1::jsonb,$2::jsonb,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9) r',[JSON.stringify(p),JSON.stringify({down:{},half:[]}),'test',JSON.stringify(went),tree[1]+1,tree[2],now,JSON.stringify([{dark:1,scent:1,which:1,chain:1,keep:1,kind:1}]),'Test'])).r,{ok:false,why:'full'});
 eq((await one("select has_function_privilege('authenticated','town.fell_v218(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)','EXECUTE') p")).p,false);
 writeFileSync('.codex/tier10/v218-validation.json',JSON.stringify({checks,localOnly:true,gemAndWarehouseBaseline:true},null,2));console.log(`v218: ${checks} real felling/listener parity, raw mistakes, caps, shared extraction and inventory checks passed.`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected}));process.exitCode=1;}finally{await db.close();}
