-- v153, the forest's part: the gifts of the forest line's second to sixth ranks (lib/town/gifts, lib/town/forest).
-- Run after v153.shared.sql. Safe to run twice. Every function that was there before is written whole, from its
-- text as the database has it after v152, with as few lines changed as the gift needs.

-- ── the squirrel (rank 2): it fetches what lies on the ground as its member walks past ──────────────────────────
-- Whether a squirrel fetches a kind of place's thing for somebody (lib/town/forest's fetches): what is picked up
-- with no game, while it follows them.
create or replace function town.wild_fetches(p_purse jsonb, p_how text)
returns boolean language sql stable
as $$ select coalesce(p_how = 'pick' and town.gift_works(p_purse, 'famSquirrel'), false) $$;

-- How far somebody reaches a kind of place from, in tiles (lib/town/forest's reachOf): a tile; or as far as their
-- squirrel fetches.
create or replace function town.wild_reach(p_purse jsonb, p_how text)
returns integer language sql stable
as $$
  select case when town.wild_fetches(p_purse, p_how) then (town.cat('forest')->>'squirrel')::integer
    else (town.cat('forest')->>'reach')::integer end
$$;

-- The stamina a gathering of a kind of place costs somebody (lib/town/forest's costFor): its own; none of theirs
-- when the squirrel fetches it.
create or replace function town.wild_cost(p_purse jsonb, p_kind jsonb)
returns double precision language sql stable
as $$ select case when town.wild_fetches(p_purse, p_kind->>'how') then 0 else (p_kind->>'cost')::double precision end $$;

-- ── the truffle piglet (rank 3): no hoe, one more from every hole, so many holes to a meal's hours ─────────────
-- Whether a truffle piglet may dig for somebody now (lib/town/forest's pigletDigs): it follows them and has a hole
-- left of its count to these hours.
create or replace function town.piglet_digs(p_purse jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select town.gift_works(p_purse, 'famPiglet')
     and town.used_of(p_purse, 'famPiglet', p_now) < (town.cat('gifts')->'uses'->'famPiglet'->>'n')::integer
$$;

-- town.gather: v125's, with one argument more at its end (`p_with`: the gift a gathering is asked to be done with;
-- none, for the plain way), so the function of eleven arguments goes and this one answers its calls too.
-- Changed: how far one reaches (a line); what it costs (a line); and asked of the piglet, what is dug takes no hoe,
-- is one of the piglet's holes, and gives one more (three declarations, the hoe's line grown into a block, a line
-- for how many, and the purse the stamina is spent from).
drop function if exists town.gather(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, double precision, bigint);
CREATE OR REPLACE FUNCTION town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_with text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('forest');
  spot jsonb := f->'spots'->p_spot;
  kind jsonb := f->'kinds'->(spot->>0);
  bag jsonb := p_purse->'bag';
  item text := p_has->>'item';
  n integer;
  wrong integer := 0;
  piglet boolean := coalesce(kind->>'how' = 'dig' and p_with = 'famPiglet', false);
  mine jsonb := p_purse;
  used jsonb;
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > town.wild_reach(p_purse, kind->>'how') then return town.no('far'); end if;
  if piglet then
    used := town.gift_use(p_purse, 'famPiglet', p_now);
    if not (used->>'ok')::boolean then return used; end if;
    mine := used->'purse';
  elsif kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int)
    + case when piglet then (town.cat('gifts')->'gifts'->'famPiglet'->>'by')::int else 0 end;
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(mine, town.wild_cost(p_purse, kind), p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$function$;

-- public.town_gather: v125's. Changed: what the gathering is asked to be done with is read from `p_went` and handed
-- on (a declaration, and the call's last argument); the deed says when it was the squirrel that fetched the thing
-- or the piglet that dug it (a line).
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
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  if p_spot is null or p_spot < 0 or p_spot >= jsonb_array_length(f->'spots') then return town.answer(me, town.no('none')); end if;
  spot := f->'spots'->p_spot;
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', f->'kinds'->(spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, f->'kinds'->(spot->>0)->>'how') then jsonb_build_object('by', 'famSquirrel')
              when with_ = 'famPiglet' and f->'kinds'->(spot->>0)->>'how' = 'dig' then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end);
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$;

revoke execute on function public.town_gather(integer, integer, integer, jsonb) from public, anon;
grant execute on function public.town_gather(integer, integer, integer, jsonb) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
