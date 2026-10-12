-- v220: directional domino, up to three real eligible trees, three chains/day.
-- Run after v219 with the matching site. Rerunnable; grove lock remains before purse access.
-- Hardest trunk's game, original per-tree costs, held targets, ordinary failure/full-bag semantics.
begin;
do $guard$ begin
if md5(replace(pg_get_functiondef('town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text)'::regprocedure),chr(13),'')) not in ('780147f91dbe13e15cb18d1453cce8f7', '36a0ffcbd743ead76ba106823fa39979') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('ee3235db50a98be59d7b05fe7266178c', 'ace75c7d307051d7085159f1a5b2690f') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
if md5(replace(pg_get_functiondef('public.town_fell_begin(integer,integer,integer)'::regprocedure),chr(13),'')) not in ('f38a589d8d33e220993697e1eb9900ae') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmDomino":{"kind":"charm","line":"felling","rank":5,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmDomino":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_group_v220(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint, p_me text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') then '[]'::jsonb else
    coalesce((select jsonb_agg(s.v order by s.far_, s.id) from (
      select w.v, town.tree_apart(w.v, p_first) as far_, (w.v->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') w(v)
       where (w.v->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w.v) and town.tree_apart(w.v, p_first) <= (c.k->'echo'->>'reach')::integer
         and town.axe_bites(p_axe, w.v) is null and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$function$
$copy$;end if;end $$;
do $$ begin if to_regprocedure('town.fell_v220(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_v220(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 begin
  if p_went->'grain' ? 'second' and (jsonb_typeof(p_went->'grain'->'second') is distinct from 'string' or p_went->'grain'->>'second' not in ('bark','sap','seed') or p_went->'grain'->>'second'=p_went->'grain'->>'part') then return town.no('none');end if;
  return town.reward_listening(p_purse,town.fell_v218(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who),p_went,p_now);
 end $function$
$copy$;end if;end $$;
create or replace function town.reward_domino_group(p jsonb,g jsonb,first_ jsonb,axe_ jsonb,t bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb:=jsonb_build_array(first_);from_ jsonb:=first_;next_ jsonb;dx integer;dy integer;i integer;
begin
 if jsonb_typeof(dir_) is distinct from 'array' or jsonb_array_length(dir_)<>2 or exists(select 1 from jsonb_array_elements(dir_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between -1 and 1) then return '[]'::jsonb;end if;
 dx:=(dir_->>0)::integer;dy:=(dir_->>1)::integer;
 if dx=0 and dy=0 or town.tree_elder(first_) or not town.gift_works(p,'charmDomino') or town.used_of(p,'charmDomino',t)>=3 then return '[]'::jsonb;end if;
 for i in 1..2 loop
  select w.v into next_ from jsonb_array_elements(town.cat('trees')->'wood') w(v)
   cross join lateral (select town.tree_apart(w.v,from_) n) d
   where not exists(select 1 from jsonb_array_elements(grp) a where a->0=w.v->0)
    and town.tree_grown(g,w.v,t) and d.n between 1 and 4
    and (w.v->>1)::integer-(from_->>1)::integer=dx*d.n and (w.v->>2)::integer-(from_->>2)::integer=dy*d.n
   order by d.n,(w.v->>0)::integer limit 1;
  if next_ is null or town.tree_elder(next_) or town.axe_bites(axe_,next_) is not null or town.tree_held(g,(next_->>0)::integer,t,me) then exit;end if;
  grp:=grp||jsonb_build_array(next_);from_:=next_;
 end loop;
 return grp;
end $$;
create or replace function town.fell_group(p_purse jsonb,p_grove jsonb,p_first jsonb,p_axe jsonb,p_now bigint,p_me text default null)
returns jsonb language plpgsql stable set search_path='' as $$ begin
 if p_purse ? 'dominoDirection' then return town.reward_domino_group(p_purse,p_grove,p_first,p_axe,p_now,p_me,p_purse->'dominoDirection');end if;
 return town.fell_group_v220(p_purse,p_grove,p_first,p_axe,p_now,p_me);
end $$;
create or replace function town.fell_domino_begin(p jsonb,g jsonb,tree_ integer,x integer,y integer,t bigint,seed_ bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb;
begin
 if town.tree_of(tree_) is null or town.axe_of(p) is null then return town.no('none');end if;
 grp:=town.reward_domino_group(p,g,town.tree_of(tree_),town.axe_of(p),t,me,dir_);
 if jsonb_array_length(grp)<2 then return town.no(case when town.used_of(p,'charmDomino',t)>=3 then 'spent' else 'none' end);end if;
 return town.fell_begin(p||jsonb_build_object('dominoDirection',dir_),g,tree_,x,y,t,seed_,me);
end $$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare go_ jsonb:=p_grove->'goes'->p_me;domino_ boolean;did jsonb;used_ jsonb;
begin
 domino_:=coalesce(go_ ? 'domino' and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree',false);
 if domino_ and (coalesce((p_went->>'one')::boolean,false) or not town.gift_works(p_purse,'charmDomino') or town.used_of(p_purse,'charmDomino',p_now)>=3) then return town.no('none');end if;
 did:=town.fell_v220(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmDomino',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return did;
end $$;
revoke all on function town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb),town.fell_domino_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text,jsonb),town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text),town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_fell_domino_begin(p_tree integer, p_x integer, p_y integer, p_direction jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  -- (the grove is held: of two who walk up to one tree at one moment, the second finds it held)
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, false);
  did := town.fell_domino_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text,p_direction);
  if (did->>'ok')::boolean then
    grove := town.fell_opened(grove, me::text, did->'trees', now_);
    grove:=jsonb_set(grove,array['goes',me::text,'domino'],p_direction);
    grove:=jsonb_set(grove,array['goes',me::text],(grove->'goes'->(me::text))||jsonb_build_object('comboLoadout',town.combo_loadout(purse),'comboTree',p_tree,'comboHints',did->'ask'->'grain'->'hints'));
    perform town.keep_thing('grove', grove);
  end if;
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return town.answer(me, (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$function$
;
revoke all on function town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text),town.fell_v220(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;
revoke all on function public.town_fell_domino_begin(integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.town_fell_domino_begin(integer,integer,integer,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)','EXECUTE'),'domino_ready',town.cat('gifts')->'gifts' ? 'charmDomino') as v220_verified;
