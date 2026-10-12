-- v218: choose a second part before a perfectly read and played trunk.
-- Run after v217 with the matching site. Running it again is safe.
-- Five trunks/day, first trunk only; the knife and listener share two parts/trunk.
-- Original logs, costs, training, companion and gem rules remain in the wrapped deed.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('2274eab11d83eb7d4ce616f9b364ab3a','ee3235db50a98be59d7b05fe7266178c') then raise exception 'Felling changed: rebuild v218 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmListening":{"kind":"charm","line":"felling","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmListening":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.fell_v218(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_v218(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare did jsonb;f jsonb;p jsonb;
begin
 did:=town.fell_v207(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 and town.gift_works(p_purse,'thingForesterKnife') and p_went->'grain' is not null then
  f:=did->'felled'->0;
  if f->>'quality' in ('rough','clear','heart') then
   p:=did->'purse';p:=p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',jsonb_build_object('key','tree:'||(f->>'id')||':'||p_now,'tree',f->'id','at',jsonb_build_array(p_x,p_y),'excluded',p_went->'grain'->'part','quality',f->'quality','until',p_now+180000)));
   did:=jsonb_set(did,'{purse}',p);
  end if;
 end if;
 return did;
end $function$
$copy$;end if;end $$;
create or replace function town.reward_listening(before_ jsonb,did jsonb,went jsonb,t bigint)
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
 end $$;
revoke all on function town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.fell_v218(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.reward_listening(jsonb,jsonb,jsonb,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_listening(jsonb,jsonb,jsonb,bigint)','EXECUTE'),'listener_ready',town.cat('gifts')->'gifts' ? 'charmListening') as v218_verified;
