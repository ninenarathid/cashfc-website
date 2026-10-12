import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {rewardDB} from './reward-db.mjs';await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{springAction,SPRINGS}=await import('@/lib/town/reward-springs'),db=await rewardDB(223),now=Date.parse('2026-10-11T12:00:00+07:00'),request='00000000-0000-4000-8000-000000000924',me='00000000-0000-4000-8000-000000000001';let checks=0;
const one=async(q,a=[])=>(await db.query(q,a)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++},base={...newPurse(),bag:[{item:'waterCart',n:1},null],hand:'waterCart',handAt:0,gifts:{had:['thingSpringStone'],charms:[]}};
const call=async(p,input,old=null,t=now)=>(await one('select town.reward_spring($1::jsonb,$2::jsonb,$3::uuid,$4::uuid,$5::jsonb,$6) r',[JSON.stringify(p),JSON.stringify(input),request,me,JSON.stringify(old),t])).r;
try{
 const sql=readFileSync('supabase/v224_twelve_bucketfuls_to_share.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(let site=0;site<5;site++){
  const input={action:'springPlace',site,at:SPRINGS.sites[site]},made=await call(base,input);eq(made,springAction(base,input,request,me,null,now));
  eq(await call(base,input,made.spring),{ok:false,why:'spent'});
  for(const hand of ['bucket','bucketIron','waterYoke','waterYokeGreat','waterCart'])for(const left of [1,2,5,12]){
   const p={...base,bag:[{item:hand,n:1},null],hand,handAt:0,gifts:{had:[],charms:[]}},draw={action:'springDraw',site,at:SPRINGS.sites[site]},old={...made.spring,left};eq(await call(p,draw,old),springAction(p,draw,request,me,old,now));
  }
  eq(await call(base,{action:'springDraw',site,at:SPRINGS.sites[site]},made.spring,now+3600000),{ok:false,why:'none'});
 }
 const made=await call(base,{action:'springPlace',site:0,at:SPRINGS.sites[0]}),draw={action:'springDraw',site:0,at:SPRINGS.sites[0]};
 for(const p of [{...base,bag:[{item:'waterCart',n:1,water:1},{item:'waterCart',n:1}]},{...base,bag:[{item:'waterCart',n:2},null]}])eq(await call(p,draw,made.spring),{ok:false,why:'none'});
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$select ${now}::bigint$$;`);await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(base)]);
 const rpc=async(input,id=crypto.randomUUID())=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[id,JSON.stringify(input)])).r;
 eq((await rpc({action:'springPlace',site:0,at:SPRINGS.sites[0]})).spring.left,12);
 await db.query("insert into public.town_line_water(member_id,item,hands,kind) values($1,'waterCart',array[$1::uuid],'moon') on conflict(member_id,item) do update set kind='moon'",[member]);
 const id=crypto.randomUUID(),first=await rpc(draw,id);eq(first.moved,6);eq((await one('select count(*)::integer n from public.town_line_water where member_id=$1',[member])).n,0);
 await db.query('update public.town_purses set coins=1234 where member_id=$1',[member]);eq((await rpc(draw,id)).moved,6);eq((await one('select doc from town.reward_springs where site=0')).doc.left,6);eq((await one('select town.purse_of($1,true) p',[member])).p.coins,1234);
 // A second authenticated visitor without this gift draws the remaining common stock.
 const secondId=(await one('select id from public.profiles where id<>$1 limit 1',[member])).id;
 await db.query('update public.profiles set is_admin=true where id=$1',[secondId]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[secondId]);await db.query('select town.purse_of($1,true)',[secondId]);await db.query('select town.keep_purse($1,$2::jsonb)',[secondId,JSON.stringify({...base,gifts:{had:[],charms:[]}})]);
 eq((await rpc(draw)).moved,6);eq((await one('select doc from town.reward_springs where site=0')).doc.left,0);eq((await one('select public.town_reward_springs() r')).r.springs.length,0);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);eq((await rpc(draw,id)).moved,6);eq((await one('select doc from town.reward_springs where site=0')).doc.left,0);eq((await one('select town.purse_of($1,true) p',[member])).p.bag[0].water,6);eq((await one('select town.purse_of($1,true) p',[secondId])).p.bag[0].water,6);
 eq((await one('select count(*)::integer n from town.reward_springs')).n,5);
 eq((await one("select has_table_privilege('authenticated','town.reward_springs','SELECT') a")).a,false);
 writeFileSync('.codex/tier10/v224-validation.json',JSON.stringify({checks,localOnly:true,sharedFiniteStock:true,ordinaryWater:true,replay:true},null,2));console.log(`v224: ${checks} shared volume, capacities, expiry, plain provenance, privacy and RPC replay checks passed.`);
}catch(e){console.error(e.stack,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
