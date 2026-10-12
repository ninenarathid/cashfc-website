-- v217: the forest guardian reads two parts through two manual games.
-- Run after v214 and v216 with the matching site. Running it again is safe.
-- Five perfect plants/day, two ordinary stamina costs, one shared gathering claim.
-- Misses keep the ordinary leaf result; full bags never pay a partial result.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)'::regprocedure),chr(13),'')) not in ('06f018a52e965b83ffef36e99ffbcd3c','4e633176ff6442b08096f2b011d9b87a') then raise exception 'Gathering changed: rebuild v217 on current definitions';end if;
if md5(replace(pg_get_functiondef('public.town_gather(integer,integer,integer,jsonb)'::regprocedure),chr(13),'')) not in ('e2cab894733949fc4bba6c3dd4d5487b','422b4c4fc8e765e8423088d061e2882d') then raise exception 'Public gathering changed: rebuild v217 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famForestGuardian":{"kind":"familiar","line":"forest","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famForestGuardian":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.gather_part_v217(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.gather_part_v217(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_part text, p_with text, p_lost boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 f jsonb:=town.cat('forest'); k jsonb:=town.cat('forest_parts'); spot jsonb:=town.wild_place(f,p_spot);
 rule jsonb:=town.wild_rule(f,spot->>0); item text; protected boolean; forgiven integer;
 n integer; book jsonb:=coalesce(p_purse->'forestPartsBook','[]'::jsonb); entry text; next_ bigint;
 rest jsonb;
begin
 if p_has is null or p_has='null'::jsonb or spot is null then return town.no('none'); end if;
 if coalesce(p_mine,false) then return town.no('had'); end if;
 if coalesce(p_taken,0)>=(rule->>'shares')::integer then return town.no('bare'); end if;
 if p_x is null or p_y is null or greatest(abs(p_x-(spot->>1)::integer),abs(p_y-(spot->>2)::integer))>town.wild_reach(p_purse,rule->>'how',p_now) then return town.no('far'); end if;
 if p_part is null or p_part not in ('leaf','root') or town.wild_secret(f,p_spot) or p_with is not null or coalesce(p_lost,false) then return town.no('none'); end if;
 item:=k->'parts'->(spot->>0)->>p_part;
 if item is null then return town.no('none'); end if;
 if p_part='root' and town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool'); end if;
 protected:=p_part='leaf' and town.held(town.carried_bag(p_purse),'pruningKnife')>0
   or item='forestLichen' and town.held(town.carried_bag(p_purse),'specimenPress')>0
   or item in ('berryPip','mushroomSpores') and town.held(town.carried_bag(p_purse),'seedSieve')>0;
 forgiven:=case when town.held(town.carried_bag(p_purse),'forageBasket')>0 then 1 else 0 end;
 n:=greatest(1,(k->>p_part)::integer+case when protected then (k->>'bonus')::integer else 0 end-greatest(0,floor(coalesce(p_misses,0)+coalesce(p_wrong,0))::integer-forgiven));
 if town.room(p_purse->'bag',item)<n then return town.no('full'); end if;
 entry:=(spot->>0)||':'||p_part||':'||item;
 if not book ? entry then book:=book||to_jsonb(entry); end if;
 if p_part='root' then
  next_:=((p_has->>'turn')::bigint+1)*(rule->>'every')::bigint*60000-floor(town.roll('phase',p_spot)*(rule->>'every')::double precision)::bigint*60000;
  rest:=jsonb_build_object('from',next_,'until',next_+60000*case when town.held(town.carried_bag(p_purse),'rootSpade')>0 then (k->>'spadeMinutes')::bigint else (k->>'restMinutes')::bigint end);
 end if;
 return jsonb_build_object('ok',true,'got',jsonb_build_array(jsonb_build_array(item,n)),
   'purse',town.spend(p_purse,(rule->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(p_purse->'bag',item,n),'forestPartsBook',book))
   ||case when rest is not null then jsonb_build_object('rest',rest) else '{}'::jsonb end;
end $function$
$copy$;end if;end $$;
create or replace function town.gather_part(p_purse jsonb,p_spot integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_wrong double precision,p_now bigint,p_part text,p_with text,p_lost boolean)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare f jsonb:=town.cat('forest');k jsonb:=town.cat('forest_parts');spot jsonb:=town.wild_place(f,p_spot);a jsonb;b jsonb;used_ jsonb;
 begin
  if p_part is distinct from 'paired' then return town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,p_part,p_with,p_lost);end if;
  if not town.gift_works(p_purse,'famForestGuardian') or spot is null or k->'parts'->(spot->>0)->>'leaf' is null or k->'parts'->(spot->>0)->>'root' is null or not coalesce(p_misses>=0 and p_wrong>=0,false) or p_misses='Infinity'::double precision or p_wrong='Infinity'::double precision or p_misses='NaN'::double precision or p_wrong='NaN'::double precision then return town.no('none');end if;
  used_:=town.gift_use(p_purse,'famForestGuardian',p_now);if not coalesce((used_->>'ok')::boolean,false) then return town.no('none');end if;
  if town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool');end if;
  a:=town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,'leaf',p_with,p_lost);
  if not coalesce((a->>'ok')::boolean,false) or p_misses+p_wrong<>0 then return a;end if;
  b:=town.gather_part_v217(a->'purse',p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,0,0,p_now,'root',p_with,p_lost);
  if not coalesce((b->>'ok')::boolean,false) then return b;end if;
  used_:=town.gift_use(b->'purse','famForestGuardian',p_now);
  return b || jsonb_build_object('purse',used_->'purse','got',(a->'got')||(b->'got'));
 end $$;
CREATE OR REPLACE FUNCTION public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  with_ text := case when jsonb_typeof(went->'with') = 'string' then went->>'with' end;
  lost_ boolean := coalesce(case when jsonb_typeof(went->'lost') = 'boolean' then (went->>'lost')::boolean end, false);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  -- Paired mastery uses raw mistakes, before the normal game rounds them down.
  if went->>'part'='paired' then
    if jsonb_typeof(went->'misses') is distinct from 'number' or jsonb_typeof(went->'wrong') is distinct from 'number' or (went->>'misses')::numeric<0 or (went->>'wrong')::numeric<0 then return town.answer(me,town.no('none'));end if;
    misses:=least((went->>'misses')::numeric,(f->>'misses')::integer);
    wrong:=least((went->>'wrong')::numeric,(f->>'misses')::integer);
  end if;
  if went->>'part' is not null and went->>'part'<>'whole' then
    did:=town.gather_part(purse,p_spot,has,(t->>'n')::integer,(t->>'mine')::boolean,town.hand_of(purse),p_x,p_y,misses,wrong,now_,went->>'part',with_,lost_);
  else
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  end if;
  if (did->>'ok')::boolean then
    if did ? 'rest' then
      insert into public.town_forest_rest(spot,begins,ends) values(p_spot,(did->'rest'->>'from')::bigint,(did->'rest'->>'until')::bigint)
        on conflict on constraint town_forest_rest_pkey do update set begins=case when town_forest_rest.ends<=now_ then excluded.begins else least(town_forest_rest.begins,excluded.begins) end,ends=greatest(town_forest_rest.ends,excluded.ends);
    end if;
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', did->'got'->0->>0, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', town.wild_rule(f, spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, town.wild_rule(f, spot->>0)->>'how', now_) then jsonb_build_object('by', 'famSquirrel', 'left',
                (town.cat('gifts')->'uses'->'famSquirrel'->>'n')::integer - town.used_of(did->'purse', 'famSquirrel', now_))
              when with_ = 'famPiglet' and town.wild_rule(f, spot->>0)->>'how' = 'dig' and not town.wild_secret(f, p_spot) then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end
      || case when town.wild_secret(f, p_spot) then jsonb_build_object('secret', true) else '{}'::jsonb end);
    end if;
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$
;
revoke all on function town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean),town.gather_part_v217(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)','EXECUTE'),'guardian_ready',town.cat('gifts')->'gifts' ? 'famForestGuardian') as v217_verified;
