import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{newGrove}=await import('@/lib/town/trees'),{dominoPreview}=await import('@/lib/town/private/combos'),{DOMINO_DIRECTIONS}=await import('@/lib/town/reward-domino');
const db=await rewardDB(220),now=Date.parse('2026-10-11T12:00:00+07:00'),id='00000000-0000-4000-8000-000000000921';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const p={...newPurse(),bag:[{item:'axe',n:1},...Array(20).fill(null)],hand:'axe',handAt:0,gifts:{had:['charmDomino','famBat'],charms:['charmDomino'],familiar:'famBat'}};
try{
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v221_')),'utf8');await db.exec(sql);await db.exec(sql);eq((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v221_verified,{private:true});
 const cat=(await one("select town.cat('trees') c")).c,wood=cat.wood.map(w=>({id:w[0],x:w[1],y:w[2],tier:w[3],size:w[4],...(w[0]===cat.elder.id?{elder:true}:{})}));
 const call=async(p,g,t,d,at=[t.x+1,t.y])=>(await one('select town.reward_domino_preview($1::jsonb,$2::jsonb,$3,$4::jsonb,$5) r',[JSON.stringify(p),JSON.stringify(g),'me',JSON.stringify({action:'dominoPreview',tree:t.id,direction:d,at}),now])).r;
 let replay,first;
 for(const t of wood.slice(0,25))for(const d of DOMINO_DIRECTIONS){const wanted=dominoPreview(p,newGrove(),t.id,d,[t.x+1,t.y],now,wood,'me'),actual=await call(p,newGrove(),t,d);eq(actual,wanted?{ok:true,combo:wanted.effect,purse:wanted.purse}:{ok:false,why:'none'});if(wanted?.effect.path?.length>1&&!replay){replay={t,d,wanted};first=actual;}}
 if(!replay)throw Error('No preview path');const {t,d}=replay;
 eq((await call(first.purse,newGrove(),t,d)).combo.fresh,false);eq((await call(first.purse,newGrove(),t,d)).purse.combos.found.length,1);eq(first.purse.gifts,p.gifts);
 for(const bad of [{...p,gifts:{...p.gifts,familiar:null}},{...p,gifts:{...p.gifts,charms:[]}},{...p,gifts:{...p.gifts,had:['charmDomino']}},{...p,gifts:{...p.gifts,used:{charmDomino:{k:dayOf(now),n:3}}}}])eq(await call(bad,newGrove(),t,d),{ok:false,why:'none'});
 const blocker=wood.find(w=>w.id===replay.wanted.effect.path[1]),held={...newGrove(),goes:{other:{trees:[blocker.id],at:now}}},b=await call(p,held,t,d);eq(b.combo.path,[t.id]);eq(b.combo.stop,blocker.id);
 for(const bad of [[0,0],[1.1,0],['1',0],[1],null])eq(await call(p,newGrove(),t,bad),{ok:false,why:'none'});
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(p)]);await db.exec("select town.keep_thing('grove','{\"down\":{},\"half\":[]}'::jsonb)");
 const input={action:'dominoPreview',tree:t.id,direction:d,at:[t.x+1,t.y]},rpc=async()=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(input)])).r;eq((await rpc()).combo.path,first.combo.path);
 await db.query('update public.town_purses set coins=1234 where member_id=$1',[member]);eq((await rpc()).combo.path,first.combo.path);eq((await one('select town.purse_of($1,true) p',[member])).p.coins,1234);eq((await one("select town.thing('grove',false) g")).g,{down:{},half:[]});
 writeFileSync('.codex/tier10/v221-validation.json',JSON.stringify({checks,localOnly:true,privateRegistry:true,actualRay:true,noExtraQuotaOrLoot:true},null,2));console.log(`v221: ${checks} private combo, actual blockers, legal loadout, replay, unchanged grove and RPC checks passed.`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
