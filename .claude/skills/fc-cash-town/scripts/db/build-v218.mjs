import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(217),sig='town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d,alias=original.replace('FUNCTION town.fell(', 'FUNCTION town.fell_v218(');
 const helper=`create or replace function town.reward_listening(before_ jsonb,did jsonb,went jsonb,t bigint)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare grain jsonb:=went->'grain';second_ text:=grain->>'second';f jsonb:=did->'felled'->0;used_ jsonb;got_ jsonb;home jsonb;state_ jsonb;
 begin
  if did->'ok' is distinct from 'true'::jsonb or jsonb_array_length(did->'felled')=0 or second_ is null then return did;end if;
  if second_ not in ('bark','sap','seed') or second_=grain->>'part' then return town.no('none');end if;
  if coalesce((did->>'one')::boolean,false) or did->'through' is distinct from 'true'::jsonb or town.tree_elder(town.tree_of((f->>'id')::integer)) or went->'misses' is distinct from '0'::jsonb or town.wood_quality((f->>'id')::integer,grain,0,'{"bag":[]}'::jsonb,t)<>'heart' then return did;end if;
  used_:=town.gift_use(did->'purse','charmListening',t);if used_->'ok' is distinct from 'true'::jsonb then return did;end if;
  got_:=town.wood_yield(false,second_,'heart',before_);home:=town.stow_all(used_->'purse',got_);if home is null then return town.no('full');end if;
  if home ? 'professionRewards' then state_:=home->'professionRewards';home:=home||jsonb_build_object('professionRewards',state_||jsonb_build_object('extraction',null,'run',null));end if;
  return jsonb_set(did,'{felled,0}',f||jsonb_build_object('got',(f->'got')||got_))||jsonb_build_object('purse',home,'got',(did->'got')||got_);
 end $$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
 returns jsonb language plpgsql stable set search_path='' as $$
 begin
  if p_went->'grain' ? 'second' and (jsonb_typeof(p_went->'grain'->'second') is distinct from 'string' or p_went->'grain'->>'second' not in ('bark','sap','seed') or p_went->'grain'->>'second'=p_went->'grain'->>'part') then return town.no('none');end if;
  return town.reward_listening(p_purse,town.fell_v218(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who),p_went,p_now);
 end $$;`;
 const g=REWARD_GIFTS.find(g=>g.id==='charmListening'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';`;
 await db.exec(catalog);await db.exec(alias);await db.exec(helper);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v218_a_second_part_from_a_perfect_trunk.sql',`-- v218: choose a second part before a perfectly read and played trunk.
-- Run after v217 with the matching site. Running it again is safe.
-- Five trunks/day, first trunk only; the knife and listener share two parts/trunk.
-- Original logs, costs, training, companion and gem rules remain in the wrapped deed.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Felling changed: rebuild v218 on current definitions';end if;end $guard$;
${catalog}
do $$ begin if to_regprocedure('${sig.replace('(', '_v218(')}') is null then execute $copy$${alias}$copy$;end if;end $$;
${helper}
revoke all on function ${sig},${sig.replace('(', '_v218(')},town.reward_listening(jsonb,jsonb,jsonb,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_listening(jsonb,jsonb,jsonb,bigint)','EXECUTE'),'listener_ready',town.cat('gifts')->'gifts' ? 'charmListening') as v218_verified;
`);console.log('Generated v218 on warehouse/gem/guardian baseline.');
}finally{await db.close();}
