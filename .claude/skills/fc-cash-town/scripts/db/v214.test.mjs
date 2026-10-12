import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{dayOf}=await import('@/lib/town/stamina'),{caveLayout}=await import('@/lib/town/mining-row'),{floorSpots}=await import('@/lib/town/cave-state'),{rememberVeinSite,rememberBranch}=await import('@/lib/town/reward-branch'),{accountOf,veinFrom}=await import('@/lib/town/vein-account'),{faceOf,bestRoute}=await import('@/lib/town/vein'),{beginResource,resourceAction}=await import('@/lib/town/reward-resources'),{trailAnswer}=await import('@/lib/town/reward-trails');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),day=dayOf(now),at=floorSpots(3,day).arrive,id='00000000-0000-4000-8000-000000000999';let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const base={...newPurse(),bag:[{item:'pick',n:1},...Array(9).fill(null)],hand:'pick',handAt:0,stamina:{day,left:40},gifts:{had:['charmBranchVein'],charms:['charmBranchVein'],familiar:null}};
try{
 for(const n of [207,208,209,210,211,212,213,214])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v214_')),'utf8');await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v214_verified).every(v=>v===true),true);
 await db.query('insert into public.town_cave_days(day,floor,layout) select $1,ord::integer,v from jsonb_array_elements($2::jsonb) with ordinality a(v,ord)',[day,JSON.stringify(Array.from({length:30},(_,i)=>caveLayout(i+1,day)))]);
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query("select set_config('test.reward.clock',$1,false)",[String(now)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");
 const source=async(after,before,v,ore,gems,choice,t=now)=>(await one('select town.reward_branch_source($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb,$7) r',[JSON.stringify(after),JSON.stringify(before),JSON.stringify(v),ore,gems,JSON.stringify(choice),t])).r;
 const call=async(p,input,t=now)=>(await one('select town.reward_resource($1::jsonb,$2::uuid,$3::jsonb,$4,123) r',[JSON.stringify(p),id,JSON.stringify(input),t])).r;
 let fixture;
 for(const seed of [0,1,13,123,4294967295]){
  const v={f:3,rock:0,turn:123,seed,gem:'fire',mods:{strikes:6,back:0,cross:0,spent:false},more:0},q=rememberVeinSite(base,base,v,at,day),echo=seed%2?1:-1;
  eq((await one('select town.reward_vein_site($1::jsonb,$1::jsonb,$2::jsonb,$3::jsonb,$4) r',[JSON.stringify(base),JSON.stringify(v),JSON.stringify(at),day])).r,q);
  for(const [before,ore,gems,choice,t]of [[q,2,1,{echo,focus:'ore'},now],[base,2,1,{echo,focus:'ore'},now],[q,0,0,{echo,focus:'ore'},now],[q,2,1,{echo:-echo,focus:'ore'},now],[q,2,1,{echo,focus:'ore'},now+86400000],[{...q,gifts:{...q.gifts,charms:[]}},2,1,{echo,focus:'ore'},now]])eq(await source(q,before,v,ore,gems,choice,t),rememberBranch(q,before,v,ore,gems,'shardCopper',choice,t));
  const face=faceOf(seed,true),route=bestRoute(face,v.mods),account=accountOf(v,route.strikes,{echo,focus:'ore'}),p={...q,mine:{vein:v}};
  const d=(await one('select town.vein_end($1::jsonb,$2::jsonb,$3) r',[JSON.stringify(p),JSON.stringify(account),now])).r;eq(d,veinFrom(p,account,now));
  const b=await source(q,q,v,2,1,{echo,focus:'ore'});fixture=b;
  for(const recipe of ['ore','crystal']){
   const input={action:'resourceBegin',kind:'branch',recipe,at},opened=await call(b,input);eq(opened,beginResource(b,'branch',recipe,id,at,now,123));
   const end={action:'resourceEnd',run:id,at,answers:trailAnswer(opened.resource.node)};
   for(const t of [now+1,now+3000,now+90001])eq(await call(opened.purse,end,t),resourceAction(opened.purse,end,t));
   eq(await call(opened.purse,{...end,answers:[0,0,0]},now+3000),resourceAction(opened.purse,{...end,answers:[0,0,0]},now+3000));
   eq(await call(opened.purse,{action:'resourceCancel',run:id,at},now+100),resourceAction(opened.purse,{action:'resourceCancel',run:id,at},now+100));
  }
 }
 // Real completed mining payout creates the site; preserving the entire old payout keeps training and visited floors.
 const layout=caveLayout(3,day),rock=layout.rocks[0],go=(await one('select town.mine_go($1,3,$2,$3,$4,100,false,town.cave_at(town.cave_kept(3,true),$5),$5) r',[member,rock[0],...layout.arrive,now])).r;
 const word=(await one("select w from (select 'branch-fixture-'||n w from generate_series(1,300) n) q where town.mine_holds_by(w,3,$1,town.mine_turn($2),$3::jsonb,1::double precision)->>'kind'='vein' limit 1",[rock[0],now,JSON.stringify(go.today)])).w;
 assert(word,'No deterministic vein fixture');
 const tally={first:member,name:'Test',at:now,by:{[member]:1}},args=[JSON.stringify(base),JSON.stringify(go),JSON.stringify(rock),JSON.stringify(tally),false,true,word];
 const original=(await one('select town.mine_pay_v214($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) r',args)).r,paidMine=(await one('select town.mine_pay($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) r',args)).r;
 eq(paidMine, {...original,purse:rememberVeinSite(original.purse,base,original.vein,go.at,go.day)});eq(paidMine.purse.professionRewards.veinSite.floor,3);
 for(const q of [{...fixture,bag:[]},{...fixture,gifts:{...fixture.gifts,used:{charmBranchVein:{k:day,n:3}}}}])eq(await call(q,{action:'resourceBegin',kind:'branch',recipe:'ore',at}),beginResource(q,'branch','ore',id,at,now,123));
 await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(fixture)]);
 const rpc=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 const opened=await rpc({action:'resourceBegin',kind:'branch',recipe:'ore',at},id);eq(opened.ok,true);
 await db.query("select set_config('test.reward.clock',$1,false)",[String(now+3000)]);
 const end={action:'resourceEnd',run:id,at,answers:trailAnswer(opened.resource.node)},request='00000000-0000-4000-8000-000000000998',paid=await rpc(end,request);eq(paid.got,[['shardCopper',4]]);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);eq((await rpc(end,request)).got,paid.got);const state=(await one('select town.purse_of($1,true) p',[member])).p;eq(state.coins,9876);eq(state.gifts.used.charmBranchVein.n,1);eq(state.professionRewards.branch,null);
 writeFileSync('.codex/tier10/v214-validation.json',JSON.stringify({checks,localOnly:true,mainPayoutParity:true},null,2));console.log(`v214: ${checks} main-yield/source/branch, parity, quotas, failure, expiry and current-purse replay checks passed.`);
}catch(e){console.error(e.message,e.where??'');if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
