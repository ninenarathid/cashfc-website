import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{gather,SPOTS,turnOf}=await import('@/lib/town/forest');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),day=dayOf(now);let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const base={...newPurse(),bag:[{item:'rootSpade',n:1},...Array(8).fill(null)],stamina:{day,left:40},gifts:{had:['famForestGuardian'],charms:[],familiar:'famForestGuardian',owed:0,used:{}}};
try{
 for(const n of [207,208,209,210,211,212,213,214,216,217])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v217_')),'utf8');await db.exec(sql);
 eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v217_verified).every(Boolean),true);
 for(const kind of ['flowers','greens']){
  const spot=SPOTS.find(s=>s.kind===kind),has={turn:turnOf(spot,now),item:kind==='flowers'?'chamomile':'wildGreens',n:3};
  for(const [p,misses,wrong,hand,at,taken,mine,with_,lost] of [
   [base,0,0,null,[spot.x,spot.y],0,false,null,false],
   [base,0.1,0,null,[spot.x,spot.y],0,false,null,false],
   [base,0,1,null,[spot.x,spot.y],0,false,null,false],
   [{...base,wears:['pruningKnife','forageBasket']},0.1,0,null,[spot.x,spot.y],0,false,null,false],
   [{...base,gifts:{...base.gifts,familiar:null}},0,0,null,[spot.x,spot.y],0,false,null,false],
   [{...base,gifts:{...base.gifts,used:{famForestGuardian:{k:day,n:5}}}},0,0,null,[spot.x,spot.y],0,false,null,false],
   [{...base,bag:[{item:'rootSpade',n:1},null]},0,0,null,[spot.x,spot.y],0,false,null,false],
   [{...base,bag:Array(8).fill(null)},0,0,null,[spot.x,spot.y],0,false,null,false],
   [{...base,bag:Array(8).fill(null)},0,0,'hoe',[spot.x,spot.y],0,false,null,false],
   [base,0,0,null,[spot.x+5,spot.y],0,false,null,false],
   [base,0,0,null,[spot.x,spot.y],0,true,null,false],
   [base,0,0,null,[spot.x,spot.y],0,false,'famPiglet',false],
   [base,0,0,null,[spot.x,spot.y],0,false,null,true]
  ]){
   const actual=(await one("select town.gather_part($1::jsonb,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,'paired',$12,$13) r",[JSON.stringify(p),spot.id,JSON.stringify(has),taken,mine,hand,...at,misses,wrong,now,with_,lost])).r;
   eq(actual,gather(p,spot,has,taken,mine,hand,at,{part:'paired',misses,wrong,...(with_?{with:with_}:{}),lost},now));
  }
 }
 // Public RPC: one take, one deed, normal recovery, raw fractional mistakes survive input normalization.
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);
 await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now}::bigint$$;`);
 let selected;
 for(const spot of SPOTS.filter(s=>s.kind==='flowers'||s.kind==='greens')){const has=(await one('select town.wild_holds($1,$2) r',[spot.id,now])).r;if(has){selected={spot,has};break;}}
 assert(selected,'No live ordinary flower/green fixture');const {spot,has}=selected;
 await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(base)]);
 const rpc=async(misses)=>(await one('select public.town_gather($1,$2,$3,$4::jsonb) r',[spot.id,spot.x,spot.y,JSON.stringify({part:'paired',misses,wrong:0,secs:8})])).r;
 const paid=await rpc(0);eq(paid.ok,true);eq(paid.got.length,2);
 eq(Number((await one("select count(*) n from public.town_takes where what='spot' and place=$1 and member_id=$2",[spot.id,member])).n),1);
 eq((await one('select town.purse_of($1,true) p',[member])).p.gifts.used.famForestGuardian.n,1);
 eq((await rpc(0)).why,'had');eq((await one('select ends-begins n from public.town_forest_rest where spot=$1',[spot.id])).n,900000);
 await db.query("delete from public.town_takes where member_id=$1 and what='spot' and place=$2",[member,spot.id]);
 await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(base)]);
 eq((await rpc(0.1)).got.length,1);eq((await one('select town.purse_of($1,true) p',[member])).p.gifts.used.famForestGuardian,undefined);
 eq((await one("select has_function_privilege('anon','public.town_gather(integer,integer,integer,jsonb)','EXECUTE') b")).b,false);
 eq((await one("select has_function_privilege('authenticated','town.gather_part_v217(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)','EXECUTE') b")).b,false);
 writeFileSync('.codex/tier10/v217-validation.json',JSON.stringify({checks,localOnly:true,rawMistakes:true,atomicParts:true,oneSharedClaim:true},null,2));
 console.log(`v217: ${checks} guardian parity, raw mistakes, atomic inventory, quotas, actual shared claims and privacy checks passed.`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected}));process.exitCode=1;}finally{await db.close();}
