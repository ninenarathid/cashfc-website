-- v251: unfinished bonds are invalid after an equipment change, even when swapping back.
-- Run after v250 with matching site; safe rerun. No changes to owned equipment, earned rewards, completed effects or quotas.
-- Successful catches end a quiet approach. No-op equipment saves keep their current signature.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.combo_loadout(jsonb)'::regprocedure),chr(13),'')) not in ('d7bdcda838e5db371c54523855357da6','e73d796be4a35b460a425cdadf080b50') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_charms_wear(text[])'::regprocedure),chr(13),'')) not in ('cce116bebcf8e5d731093bc116be5c42','6a9f698efc16ebecb168a03eea967094') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_familiar_wear(text)'::regprocedure),chr(13),'')) not in ('4734f72c608e88231b007084ca9d7497','3dc821f0c2495765e6146b3623adcfa5') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_net(integer,integer,integer,numeric,uuid)'::regprocedure),chr(13),'')) not in ('9b31f65d06e78c9c07e575ce444f95c3','1d08283b114cd215c0b3cb1b0381e893') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_net_mine(text,integer,integer,numeric)'::regprocedure),chr(13),'')) not in ('263212779bd9f498939164b38cf5d628','f2fa5cd4616137d35808b65a87feb643') then raise exception 'Definition moved: rebuild v251';end if;
end $guard$;create or replace function town.combo_equipped(before_ jsonb,after_ jsonb) returns jsonb language sql stable set search_path='' as $$ select case when town.combo_loadout(before_)=town.combo_loadout(after_) then after_ else after_||jsonb_build_object('comboEpoch',coalesce((before_->>'comboEpoch')::bigint,0)+1) end $$;revoke all on function town.combo_equipped(jsonb,jsonb) from public,anon,authenticated;
create or replace function town.combo_loadout(p jsonb) returns text language sql stable set search_path='' as $$ select replace((jsonb_build_array(coalesce((select jsonb_agg(v order by v) from jsonb_array_elements(g->'charms') v),'[]'::jsonb),g->'familiar')||case when coalesce((p->>'comboEpoch')::bigint,0)>0 then jsonb_build_array((p->>'comboEpoch')::bigint) else '[]'::jsonb end)::text,', ', ',') from (select town.gifts_of(p) g) q $$;
CREATE OR REPLACE FUNCTION public.town_charms_wear(p_charms text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  ids jsonb := to_jsonb(coalesce(p_charms, '{}'::text[]));
  before_ jsonb:=town.purse_of(me,true);
  did jsonb := town.charms_wear(before_, ids);
begin
  if (did->>'ok')::boolean then
    did:=jsonb_set(did,'{purse}',town.combo_equipped(before_,did->'purse'));
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'charms', null, jsonb_array_length(ids), 0, jsonb_build_object('worn', ids));
  end if;
  return town.answer(me, did);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_familiar_wear(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  before_ jsonb:=town.purse_of(me,true);
  did jsonb := town.familiar_wear(before_, p_id);
begin
  if (did->>'ok')::boolean then
    did:=jsonb_set(did,'{purse}',town.combo_equipped(before_,did->'purse'));
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'familiar', p_id, case when p_id is null then 0 else 1 end, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    if did->'purse'->'professionRewards'?'bugApproach' then did:=jsonb_set(did,'{purse,professionRewards,bugApproach}','null'::jsonb);end if;
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random(),
        -- ── the older tools (v174): the row as the forged net in the hand has it (null, the row as it is, with any other) ──
        town.net_cat(purse, ins));
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_net_mine(p_which text, p_x integer, p_y integer, p_misses numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  did jsonb;
  bug text;
  h jsonb;
  book jsonb;
  is_first boolean := false;
  rid jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_which is null or p_which not in ('lured', 'pair') then return town.answer(me, town.no('none')); end if;
  did := town.net_mine(purse, p_which, town.hand_of(purse), p_x, p_y, misses, now_);
  if (did->>'ok')::boolean then
    bug := did->'got'->0->>0;
    if did->'purse'->'professionRewards'?'bugApproach' then did:=jsonb_set(did,'{purse,professionRewards,bugApproach}','null'::jsonb);end if;
    perform town.keep_purse(me, did->'purse');
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    rid := town.rid_by(bug, now_);
    h := case when p_which = 'lured' then ins->'haunts'->((purse->'lured'->>'haunt')::int) end;
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when p_which = 'lured' then jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1) else jsonb_build_object('pair', true) end
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$function$
;
notify pgrst,'reload schema';commit;