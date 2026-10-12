import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {SECRET_RULES}=await import('@/lib/town/private/combos'),db=await rewardDB(220),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const sigs=['public.town_reward(uuid,jsonb)','town.combo_rules()'],originals=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const current=(await db.query('select town.combo_rules() r')).rows[0].r,registry=`create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select '${JSON.stringify([...current.filter(r=>r.key!=='SC14'),SECRET_RULES.find(r=>r.key==='SC14')]).replaceAll("'","''")}'::jsonb $rules$;`;
 const helper=`create or replace function town.reward_domino_preview(p jsonb,g jsonb,me text,input jsonb,t bigint)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare first_ jsonb;axe_ jsonb:=town.axe_of(p);grp jsonb;last_ jsonb;stop_ jsonb;dir_ jsonb:=input->'direction';dx integer;dy integer;used_ jsonb;path_ jsonb;action_ text;
 begin
  if jsonb_typeof(input->'tree') is distinct from 'number' or (input->>'tree')::numeric<>floor((input->>'tree')::numeric) or (input->>'tree')::numeric not between 0 and 10000 then return town.no('none');end if;
  first_:=town.tree_of((input->>'tree')::integer);
  if first_ is null or axe_ is null or town.tree_elder(first_) or not town.tree_grown(g,first_,t) or town.axe_bites(axe_,first_) is not null or town.tree_held(g,(first_->>0)::integer,t,me) or town.tree_far(first_,(input->'at'->>0)::integer,(input->'at'->>1)::integer)>1 then return town.no('none');end if;
  grp:=town.reward_domino_group(p,g,first_,axe_,t,me,dir_);if jsonb_array_length(grp)=0 then return town.no('none');end if;
  dx:=(dir_->>0)::integer;dy:=(dir_->>1)::integer;last_:=grp->(jsonb_array_length(grp)-1);
  if jsonb_array_length(grp)<3 then
   select w.v into stop_ from jsonb_array_elements(town.cat('trees')->'wood') w(v) cross join lateral (select town.tree_apart(w.v,last_) n) d
   where not exists(select 1 from jsonb_array_elements(grp) a where a->0=w.v->0) and town.tree_grown(g,w.v,t) and d.n between 1 and 4
    and (w.v->>1)::integer-(last_->>1)::integer=dx*d.n and (w.v->>2)::integer-(last_->>2)::integer=dy*d.n order by d.n,(w.v->>0)::integer limit 1;
  end if;
  select jsonb_agg(a->0 order by ord) into path_ from jsonb_array_elements(grp) with ordinality q(a,ord);
  action_:='domino:'||(first_->>0)||':'||dx||','||dy||':'||town.day_of(t);
  used_:=town.combo_grant(p,'SC14',action_,t,jsonb_build_object('path',path_,'stop',stop_->0,'previewAt',t));
  if used_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
  return jsonb_build_object('ok',true,'combo',used_->'effect','purse',used_->'purse');
 end $$;
 revoke all on function town.reward_domino_preview(jsonb,jsonb,text,jsonb,bigint) from public,anon,authenticated;`;
 const patched=originals[0].replace('g jsonb;','g jsonb;grove_ jsonb;').replace("'coreCancel')","'coreCancel','dominoPreview')").replace(' p:=town.purse_of(me,true);',` if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;\n p:=town.purse_of(me,true);`).replace(" if p_input->>'action' in ('liftAnchor','liftRide') then", " if p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);\n elsif p_input->>'action' in ('liftAnchor','liftRide') then");
 if(!patched.includes('did:=town.reward_domino_preview')||!patched.includes("'coreCancel','dominoPreview'"))throw Error('Reward dispatcher moved');
 await db.exec(registry);await db.exec(helper);await db.exec(patched);const normalized=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v221_echoes_along_the_falling_trunks.sql',`-- v221: a private equipment bond projects actual eligible domino trunks and a blocker.
-- Run after v220 with the matching site. Rerunnable; no trees reserved, quota paid or gameplay played by preview.
begin;
do $guard$ begin
${sigs.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest(normalized[i])}') then raise exception 'Reward/combo definitions moved: rebuild v221';end if;`).join('\n')}
end $guard$;
${registry}
${helper}
${patched};
revoke all on function town.combo_rules(),public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_function_privilege('authenticated','town.reward_domino_preview(jsonb,jsonb,text,jsonb,bigint)','EXECUTE')) as v221_verified;
`);console.log('Generated v221: private SC14, actual ray projection and world-before-purse order.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
