import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{CROSSINGS}=await import('@/lib/town/temporary-crossings'),db=await rewardDB(227),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d,patched=original.replace('cloudkind_ text;','cloudkind_ text;bridge_ jsonb;').replace("'pactEnd','pactCancel')","'pactEnd','pactCancel','bridgeBuild')")
 .replace(' p:=town.purse_of(me,true);',` if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);`)
 .replace("if p_input->>'action' in ('cloudBegin'",`if p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin'`);
 if(!patched.includes('did:=town.reward_bridge'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='famBeaver'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('crossings','${JSON.stringify(CROSSINGS)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-crossing.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v228_a_beavers_path_between_the_banks.sql',`-- v228: two marked forest crossings, one thirty-minute bridge/day.
-- Run after v227 with matching site. Four/eight real logs, two root fibres, three stamina.
-- All players use ordinary movement; no map gates, permanent paths or resources change.
-- World bridge row is locked before any purse. Exactly two derived site rows; rerun preserves active bridges.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher moved: rebuild v228';end if;end $guard$;
${catalog}\n${helper}\n${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_table_privilege('authenticated','town.reward_bridges','SELECT') as bridges_private;
`);console.log('Generated two bounded temporary forest crossings v228.');
}catch(e){console.error(e.stack,e.where??'');process.exitCode=1;}finally{await db.close();}
