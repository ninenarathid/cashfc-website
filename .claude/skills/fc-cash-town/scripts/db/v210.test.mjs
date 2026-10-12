import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {newPurse}=await import('@/lib/town/trade'),{GEMS,ELEMENTS}=await import('@/lib/town/tools'),{SPOTS}=await import('@/lib/town/forest'),{dayOf}=await import('@/lib/town/stamina');
const {resourceRecipe,beginResource,resourceAction,RESOURCE_GIFTS}=await import('@/lib/town/reward-resources'),{trailAnswer}=await import('@/lib/town/reward-trails');
const db=await tier10DB(),now=Date.parse('2026-10-11T12:00:00+07:00'),smith=[50,24],forest=[SPOTS[10].x,SPOTS[10].y],id='00000000-0000-4000-8000-000000000555';let checks=0;
const one=async(q,args=[])=>(await db.query(q,args)).rows[0],eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const call=async(p,input,t=now,seed=123)=>(await one('select town.reward_resource($1::jsonb,$2::uuid,$3::jsonb,$4,$5) r',[JSON.stringify(p),id,JSON.stringify(input),t,seed])).r;
const player=(kind,key)=>{const r=resourceRecipe(kind,key);return {...newPurse(),bag:[...r.needs.map(([item,n])=>({item,n:n*4})),...Array(15).fill(null)],stamina:{day:dayOf(now),left:40},gifts:{had:[RESOURCE_GIFTS[kind]],charms:kind==='color'?['charmGemColor']:[],familiar:null},professionRewards:{minerals:ELEMENTS.map(e=>GEMS[e].chip)}};};
try{
 for(const n of [207,208,209,210])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const sql=readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith('v210_')),'utf8');await db.exec(sql);eq(Object.values((await one(sql.slice(sql.lastIndexOf('select jsonb_build_object(')))).v210_verified).every(v=>v===true),true);
 const recipes=[['hive','honey'],['hive','wax'],...ELEMENTS.map(e=>['repair',GEMS[e].chip])];
 for(const a of ELEMENTS)for(const b of ELEMENTS)if(a!==b)for(const target of ELEMENTS)recipes.push(['color',`${GEMS[a].gem}:${GEMS[b].gem}:${GEMS[target].gem}`]);
 for(const [kind,key]of recipes){
  eq((await one('select town.reward_resource_recipe($1,$2) r',[kind,key])).r,resourceRecipe(kind,key));
  const p=player(kind,key),at=kind==='hive'?forest:smith,input={action:'resourceBegin',kind,recipe:key,at};
  const opened=await call(p,input);eq(opened,beginResource(p,kind,key,id,at,now,123));
  const end={action:'resourceEnd',run:id,answers:trailAnswer(opened.resource.node),at};
  eq(await call(opened.purse,end,now+3000),resourceAction(opened.purse,end,now+3000));
 }
 const p=player('repair','chipRuby'),opened=await call(p,{action:'resourceBegin',kind:'repair',recipe:'chipRuby',at:smith});
 const end={action:'resourceEnd',run:id,answers:trailAnswer(opened.resource.node),at:smith};
 for(const t of [now+1,now+90001])eq(await call(opened.purse,end,t),resourceAction(opened.purse,end,t));
 const miss={...end,answers:[0,0,0]};eq(await call(opened.purse,miss,now+3000),resourceAction(opened.purse,miss,now+3000));
 const full={...opened.purse,bag:opened.purse.bag.filter(x=>x!==null)};eq(await call(full,end,now+3000),resourceAction(full,end,now+3000));
 for(const at of [[0,0],[51,24]])eq(await call(opened.purse,{...end,at},now+3000),resourceAction(opened.purse,{...end,at},now+3000));
 eq(await call(opened.purse,{action:'resourceCancel',run:id,at:[0,0]}),resourceAction(opened.purse,{action:'resourceCancel',run:id,at:[0,0]},now));
 const color=player('color','gemRuby:gemSapphire:gemAmber'),input={action:'resourceBegin',kind:'color',recipe:'gemRuby:gemSapphire:gemAmber',at:smith};
 for(const bad of [{...color,gifts:{...color.gifts,charms:[]}},{...color,professionRewards:{minerals:[]}},{...color,bag:[]}])eq(await call(bad,input),beginResource(bad,'color',input.recipe,id,smith,now,123));
 const member=(await one('select id from public.profiles where is_admin limit 1')).id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[member]);await db.query('select town.purse_of($1,true)',[member]);await db.query('select town.keep_purse($1,$2::jsonb)',[member,JSON.stringify(p)]);
 const publicCall=async(input,request)=>(await one('select public.town_reward($1::uuid,$2::jsonb) r',[request,JSON.stringify(input)])).r;
 const started=await publicCall({action:'resourceBegin',kind:'repair',recipe:'chipRuby',at:smith},id);eq(started.ok,true);
 const t=started.resource.began;await db.query("select set_config('test.reward.clock',$1,false)",[String(t+3000)]);await db.exec("create or replace function town.now_ms() returns bigint language sql stable as $$select current_setting('test.reward.clock')::bigint$$;");
 const finish={action:'resourceEnd',run:id,answers:trailAnswer(started.resource.node),at:smith},finishId='00000000-0000-4000-8000-000000000556',paid=await publicCall(finish,finishId);eq(paid.got,[['wholeGeode',1]]);
 await db.query('update public.town_purses set coins=9876 where member_id=$1',[member]);eq((await publicCall(finish,finishId)).got,paid.got);eq((await one('select coins from public.town_purses where member_id=$1',[member])).coins,9876);eq((await one("select town.held(town.purse_of($1,true)->'bag','wholeGeode') n",[member])).n,1);
 writeFileSync('.codex/tier10/v210-validation.json',JSON.stringify({checks,recipes:recipes.length,localOnly:true},null,2));console.log(`v210: ${checks} checks across ${recipes.length} real recipes, reruns, replay and privilege checks passed.`);
}catch(e){console.error(e.message);if(e.actual!==undefined)console.error(JSON.stringify({actual:e.actual,expected:e.expected},null,2));process.exitCode=1;}finally{await db.close();}
