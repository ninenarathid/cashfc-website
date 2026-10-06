-- Every function of the town's as the database has it after v152 (generated from the stand-in database by
-- dump-functions.mjs: a reference, NOT a migration and not the text the files have: pg_get_functiondef's own layout).
-- 345 functions. The tables first, each with its columns:
--   public.town_beds (bed smallint, member_id uuid, tended bigint, empty bigint)
--   public.town_blessings (id bigint, at timestamp with time zone, day integer, round integer, wish text, goal numeric, by_member uuid, people integer, until timestamp with time zone)
--   public.town_boxes (member_id uuid, things jsonb, more integer, updated_at timestamp with time zone)
--   public.town_carriers (member_id uuid, buckets integer, taken integer[])
--   public.town_catalog (key text, data jsonb, updated_at timestamp with time zone)
--   public.town_changed (character_id bigint, popoto integer, cut_id bigint, updated_at timestamp with time zone)
--   public.town_comebacks (haunt integer, turn bigint, bug text, n integer, from_ms bigint, by uuid, at timestamp with time zone)
--   public.town_deals (id bigint, a uuid, b uuid, doc jsonb, touched bigint, ended text, ended_at bigint)
--   public.town_deeds (id bigint, member_id uuid, at timestamp with time zone, what text, thing text, n numeric, coins numeric, doc jsonb)
--   public.town_exchanges (id bigint, member_id uuid, kind text, character_id bigint, popoto integer, coins integer, week date, created_at timestamp with time zone)
--   public.town_ground (id bigint, member_id uuid, stack jsonb, x integer, y integer, until_ms bigint, at timestamp with time zone)
--   public.town_jar (one boolean, round integer, coins integer, things jsonb)
--   public.town_jar_log (id bigint, member_id uuid, at timestamp with time zone, round integer, what text, coins integer, things jsonb)
--   public.town_jar_owed (member_id uuid, coins integer, things jsonb)
--   public.town_knobs (key text, value integer, updated_at timestamp with time zone)
--   public.town_line_water (member_id uuid, item text, hands uuid[], kind text)
--   public.town_lines (member_id uuid, doc jsonb, updated_at timestamp with time zone)
--   public.town_market_log (round integer, doc jsonb, written timestamp with time zone)
--   public.town_notice_books (member_id uuid, due bigint, more integer)
--   public.town_notice_sales (id bigint, at bigint, item text, n integer, price integer, kind text, seller uuid, buyer uuid, notice bigint)
--   public.town_notices (id bigint, member_id uuid, kind text, item text, n integer, rest integer, price integer, held integer, at bigint, until bigint)
--   public.town_plays (id bigint, member_id uuid, game text, at timestamp with time zone, won boolean, secs real, spent boolean, buff text, doc jsonb)
--   public.town_plot_help (x integer, y integer, helper uuid, owner uuid, water integer, carry integer)
--   public.town_plots (x smallint, y smallint, bed smallint, soil text, plant jsonb, changed bigint)
--   public.town_pots (id bigint, member_id uuid, dish text, helpings integer, x smallint, y smallint, tok boolean, set_at bigint)
--   public.town_purses (member_id uuid, coins integer, created_at timestamp with time zone, updated_at timestamp with time zone, doc jsonb)
--   public.town_secrets (key text, word text)
--   public.town_shops (member_id uuid, x integer, y integer, lines jsonb, since bigint, beat bigint, took bigint, paid bigint)
--   public.town_swarms (hour bigint, bugs integer, noted bigint)
--   public.town_takes (what text, place integer, turn bigint, member_id uuid, at timestamp with time zone)
--   public.town_thanks (id bigint, from_id uuid, to_id uuid, day integer, at timestamp with time zone)
--   public.town_things (key text, doc jsonb, updated_at timestamp with time zone)
--   public.town_titles (member_id uuid, line text, rank integer, at timestamp with time zone)
--   public.town_weather (slot bigint, sky text, wind real, gust real, rain real, written timestamp with time zone)
--   public.town_well_cans (member_id uuid, item text, carrier uuid, waterings integer)
--   public.town_well_kept (one boolean, upto bigint, read_at timestamp with time zone)
--   public.town_well_reach (day integer, carrier uuid, x integer, y integer, owner uuid, n integer)
--   public.town_well_water (id bigint, member_id uuid, buckets integer)
--   public.town_wish_notes (id bigint, member_id uuid, at timestamp with time zone, day integer, wish text, note text, cheers uuid[], reports uuid[], hidden boolean, hidden_by uuid)
--   public.town_work (member_id uuid, line text, kept jsonb)
--   public.town_yard_reach (day integer, carrier uuid, cook uuid, n integer)
--   public.town_yard_water (id bigint, member_id uuid, buckets integer)

-- public.town_bank()
CREATE OR REPLACE FUNCTION public.town_bank()
 RETURNS TABLE(coins integer, rate integer, weekly integer, changed integer, profile_left integer, gallery_left integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  this_week date := date_trunc('week', now() at time zone 'Asia/Bangkok')::date;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the bank is for a proved character' using errcode = '42501';
  end if;
  perform town.member();
  return query
    select coalesce((select p.coins from public.town_purses p where p.member_id = me), 0),
           (select k.value from public.town_knobs k where k.key = 'bank_rate'),
           (select k.value from public.town_knobs k where k.key = 'bank_weekly'),
           coalesce((select sum(e.popoto) from public.town_exchanges e
                      where e.member_id = me and e.week = this_week), 0)::integer,
           l.profile_left, l.gallery_left
      from public.town_popoto_left(me) l;
end;
$function$;

-- public.town_box()
CREATE OR REPLACE FUNCTION public.town_box()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('box', town.box_of(me), 'now', town.now_ms());
end;
$function$;

-- public.town_box_put(p_slot integer, p_n integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_box_put(p_slot integer, p_n integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  -- (my purse's row is held first, as by every deed of mine: two deeds of mine at the box wait for each other on it,
  -- so the box's own row needs no holding)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.stow(purse, town.box_of(me), p_slot, p_n, p_x, p_y);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_box(me, did->'box');
    -- what is put away has been in a bag: the notice board counts it as met (v128's `seen` looks through the bags
    -- every ten minutes, and a thing caught and put away between two looks was in none of them)
    update public.town_things t
       set doc = jsonb_set(t.doc, '{ids}', coalesce(t.doc->'ids', '{}'::jsonb) || jsonb_build_object(did->>'item', true)), updated_at = now()
     where t.key = 'seen' and not coalesce(t.doc->'ids', '{}'::jsonb) ? (did->>'item');
    perform town.note(me, 'box_put', did->>'item', (did->>'n')::numeric, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'box') || jsonb_build_object('box', town.box_of(me));
end;
$function$;

-- public.town_box_take(p_slot integer, p_n integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_box_take(p_slot integer, p_n integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.unstow(purse, town.box_of(me), p_slot, p_n, p_x, p_y);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_box(me, did->'box');
    perform town.note(me, 'box_take', did->>'item', (did->>'n')::numeric, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'box') || jsonb_build_object('box', town.box_of(me));
end;
$function$;

-- public.town_bugs()
CREATE OR REPLACE FUNCTION public.town_bugs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(now_);
  took jsonb;
  has jsonb;
  t jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'haunt' and tk.at > now() - interval '2 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    has := town.bug_here(i, now_, backs, ins, word);
    continue when has is null;
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, has->>'bug', (has->>'turn')::bigint, (has->>'seed')::bigint, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'bugs', out_,
    'bugsAgain', (select min((x->>'from')::bigint) from jsonb_array_elements(backs) x where (x->>'from')::bigint > now_),
    'book', (select coalesce(jsonb_object_agg(b.key, b.value->>'name'), '{}'::jsonb) from jsonb_each(town.thing('bugs', false)) b));
end;
$function$;

-- public.town_buy(p_item text, p_n integer)
CREATE OR REPLACE FUNCTION public.town_buy(p_item text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  stall jsonb := town.thing('stall', true);
  village jsonb := town.thing('village', false);
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.buy(purse, stall, p_item, p_n, town.now_ms(), town.shelf_of((village->>'unlocked')::int));
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('stall', did->'stall');
    perform town.note(me, 'buy', p_item, p_n, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric);
  end if;
  return town.answer(me, did) || jsonb_build_object('stall', town.thing('stall', false));
end;
$function$;

-- public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean)
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  did := town.hook_bait(purse, p_bait);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  line := town.cast_line(p_bait, hour, town.raining(now_), town.has_buff(purse, now_, 'lucky'), not deep::boolean, signs,
    array[random(), random(), random(), random(), random(), random()], town.buff_by(purse, now_, 'lucky'));
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs)));
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end));
end;
$function$;

-- public.town_charms_wear(p_charms text[])
CREATE OR REPLACE FUNCTION public.town_charms_wear(p_charms text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  ids jsonb := to_jsonb(coalesce(p_charms, '{}'::text[]));
  did jsonb := town.charms_wear(town.purse_of(me, true), ids);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'charms', null, jsonb_array_length(ids), 0, jsonb_build_object('worn', ids));
  end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_cheer(p_note bigint, p_coins integer)
CREATE OR REPLACE FUNCTION public.town_cheer(p_note bigint, p_coins integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  w record;
  did jsonb;
begin
  select n.wish, n.member_id into w from public.town_wish_notes n where n.id = p_note and not n.hidden;
  if w.wish is null then return town.answer(me, town.no('gone')) || jsonb_build_object('fountain', town.fountain_told(me)); end if;
  if w.member_id = me then return town.answer(me, town.no('none')) || jsonb_build_object('fountain', town.fountain_told(me)); end if;
  did := town.tossed(me, w.wish, p_coins, jsonb_build_object('cheer', p_note));
  -- (the wish's row is taken last, as a toss with words takes it: the purse, the fountain, then the words)
  if (did->>'ok')::boolean then
    update public.town_wish_notes n set cheers = array_append(n.cheers, me) where n.id = p_note and not (me = any (n.cheers));
  end if;
  return town.answer(me, did) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$function$;

-- public.town_chew(p_company integer)
CREATE OR REPLACE FUNCTION public.town_chew(p_company integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.chew(town.purse_kept(me, true), coalesce(p_company, 0), town.now_ms());
begin
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, jsonb_build_object('ok', true, 'done', did->'done'));
end;
$function$;

-- public.town_chore(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_chore(p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  at_ text := case
    when greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) = 1 then 'well'
    when town.cat('fishing')->'places' ? (p_x::text || ',' || p_y::text) then 'river' end;
  well integer;
  did jsonb;
begin
  if at_ is null then return town.answer(me, town.no('none')); end if;
  -- (the well is held only by somebody at it: drawing at the river does not touch it)
  well := (town.thing('well', at_ = 'well') #>> '{}')::int;
  did := town.chore(purse, at_, well, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
    -- (how much: the bucketfuls poured into the well, or drawn at the river; a can takes one from the well)
    perform town.note(me, did->>'chore', town.hand_of(purse),
      case did->>'chore' when 'pour' then (did->>'well')::numeric - well when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric
        + (case when town.has_buff(purse, now_, 'carry') then (town.wishing()->>'carry')::numeric else 0 end) else 1 end,
      0, jsonb_build_object('well', did->'well'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well));
end;
$function$;

-- public.town_collect()
CREATE OR REPLACE FUNCTION public.town_collect()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.collect(town.purse_of(me, true), town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'collect', null, 1, (did->>'coins')::numeric); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_cook(p_things jsonb, p_crew uuid[], p_timing jsonb)
CREATE OR REPLACE FUNCTION public.town_cook(p_things jsonb, p_crew uuid[] DEFAULT '{}'::uuid[], p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook(purse, p_things, crew, misses, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims));
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$function$;

-- public.town_deal()
CREATE OR REPLACE FUNCTION public.town_deal()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine bigint := town.open_deal(me);
begin
  if mine is null then
    select d.id into mine from public.town_deals d
     where (d.a = me or d.b = me) and d.ended is not null and now_ - d.ended_at <= (town.cat('deals')->>'shown')::bigint * 1000
     order by d.id desc limit 1;
  end if;
  return jsonb_build_object('now', now_, 'deal', town.deal_told(mine, me));
end;
$function$;

-- public.town_deal_agree(p_word boolean)
CREATE OR REPLACE FUNCTION public.town_deal_agree(p_word boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine bigint;
  side_a uuid;
  side_b uuid;
  purse_a jsonb;
  purse_b jsonb;
  deal jsonb;
  did jsonb;
  swapped jsonb;
begin
  select d.id, d.a, d.b into mine, side_a, side_b from public.town_deals d
   where d.ended is null and (d.a = me or d.b = me) order by d.id desc limit 1;
  if mine is null or side_a is null or side_b is null then return town.answer(me, town.no('gone')); end if;
  -- both purses, the lesser id first; then the deal
  if side_a < side_b then purse_a := town.purse_of(side_a, true); purse_b := town.purse_of(side_b, true);
  else purse_b := town.purse_of(side_b, true); purse_a := town.purse_of(side_a, true); end if;
  if town.open_deal(me) is distinct from mine then return town.answer(me, town.no('gone')); end if;
  select d.doc into deal from public.town_deals d where d.id = mine and d.ended is null for update;
  if deal is null then return town.answer(me, town.no('gone')); end if;
  did := town.agree(deal, me::text, coalesce(p_word, true));
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  deal := did->'deal';
  if not ((deal->'ok'->>'a')::boolean and (deal->'ok'->>'b')::boolean) then
    update public.town_deals d set doc = deal, touched = now_ where d.id = mine;
    return town.answer(me, '{"ok": true, "done": false}'::jsonb) || jsonb_build_object('deal', town.deal_told(mine, me));
  end if;
  swapped := town.swap(deal, purse_a, purse_b);
  if not (swapped->>'ok')::boolean then
    update public.town_deals d set doc = deal || '{"ok": {"a": false, "b": false}}'::jsonb, touched = now_ where d.id = mine;
    return town.answer(me, swapped) || jsonb_build_object('deal', town.deal_told(mine, me));
  end if;
  perform town.keep_purse(side_a, swapped->'a');
  perform town.keep_purse(side_b, swapped->'b');
  update public.town_deals d set doc = deal, touched = now_, ended = 'done', ended_at = now_ where d.id = mine;
  return town.answer(me, '{"ok": true, "done": true}'::jsonb) || jsonb_build_object('deal', town.deal_told(mine, me));
end;
$function$;

-- public.town_deal_cancel()
CREATE OR REPLACE FUNCTION public.town_deal_cancel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine bigint := town.open_deal(me);
begin
  if mine is null then return town.answer(me, town.no('gone')); end if;
  update public.town_deals d set ended = 'off', ended_at = now_, touched = now_ where d.id = mine and d.ended is null;
  return town.answer(me, '{"ok": true}'::jsonb) || jsonb_build_object('deal', town.deal_told(mine, me));
end;
$function$;

-- public.town_deal_lay(p_give jsonb, p_coins numeric)
CREATE OR REPLACE FUNCTION public.town_deal_lay(p_give jsonb, p_coins numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  mine bigint := town.open_deal(me);
  deal jsonb;
  did jsonb;
begin
  if mine is null then return town.answer(me, town.no('gone')); end if;
  select d.doc into deal from public.town_deals d where d.id = mine and d.ended is null for update;
  if deal is null then return town.answer(me, town.no('gone')); end if;
  if p_give is null or jsonb_typeof(p_give) <> 'array' or jsonb_array_length(p_give) > 64
     or exists (select 1 from jsonb_array_elements(p_give) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 100000) then
    return town.answer(me, town.no('none')) || jsonb_build_object('deal', town.deal_told(mine, me));
  end if;
  did := town.lay(deal, me::text, purse, p_give, p_coins);
  if (did->>'ok')::boolean then
    update public.town_deals d set doc = did->'deal', touched = now_ where d.id = mine;
  end if;
  return town.answer(me, did - 'deal') || jsonb_build_object('deal', town.deal_told(mine, me));
end;
$function$;

-- public.town_deal_open(p_other uuid)
CREATE OR REPLACE FUNCTION public.town_deal_open(p_other uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  new_id bigint;
begin
  if p_other is null or p_other = me or not town.is_member(p_other) then return town.answer(me, town.no('none')); end if;
  -- both purses are held, the lesser id first, as every function that touches two does: two deals opened at once are taken one after the other
  perform town.purse_of(least(me, p_other), true);
  perform town.purse_of(greatest(me, p_other), true);
  if town.open_deal(me) is not null or town.open_deal(p_other) is not null then return town.answer(me, town.no('busy')); end if;
  insert into public.town_deals (a, b, doc, touched)
    values (me, p_other, jsonb_build_object('a', me, 'b', p_other, 'at', now_,
      'names', jsonb_build_object(
        'a', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me),
        'b', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_other)),
      'give', '{"a": [], "b": []}'::jsonb, 'coins', '{"a": 0, "b": 0}'::jsonb, 'ok', '{"a": false, "b": false}'::jsonb), now_)
    returning id into new_id;
  return town.answer(me, '{"ok": true}'::jsonb) || jsonb_build_object('deal', town.deal_told(new_id, me));
end;
$function$;

-- public.town_ditch(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_ditch(p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  hand text := town.hand_of(purse);
  bed jsonb;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
  was jsonb;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed, as every deed there
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  did := town.ditch(purse, bed, p_x, p_y, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  -- (the bucketfuls first, then a watering a plant: the well's book reads them in this order)
  perform town.note(me, 'ditch', hand, (did->>'used')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n, 'plants', jsonb_array_length(did->'watered')));
  for k in select jsonb_array_elements_text(did->'watered') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    was := bed->k->'plant';
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
    perform town.note(me, 'water', was->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'ditch', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_
   where b.bed = bed_n and b.member_id = me
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty), true, now_) = me::text;
  -- (the plots as they are kept: with what the heat added, if it is hot)
  return town.answer(me, did - 'plots') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n and did->'watered' ? (p.x::text || ',' || p.y::text)));
end;
$function$;

-- public.town_drop(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_drop(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
begin
  if p_slot is null or p_slot < 0 or p_slot >= jsonb_array_length(purse->'bag') or purse->'bag'->p_slot = 'null'::jsonb then
    return town.answer(me, town.no('none'));
  end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', jsonb_set(purse->'bag', array[p_slot::text], 'null'::jsonb)));
  perform town.note(me, 'drop', purse->'bag'->p_slot->>'item', (purse->'bag'->p_slot->>'n')::numeric);
  return town.answer(me, '{"ok": true}'::jsonb);
end;
$function$;

-- public.town_exchange(p_kind text, p_popoto integer)
CREATE OR REPLACE FUNCTION public.town_exchange(p_kind text, p_popoto integer)
 RETURNS TABLE(ok boolean, why text, coins integer, changed integer, profile_left integer, gallery_left integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  this_week date := date_trunc('week', now() at time zone 'Asia/Bangkok')::date;
  rate integer;
  weekly integer;
  used integer;
  have_profile integer;
  have_gallery integer;
  mine bigint;
  refusal text;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the bank is for a proved character' using errcode = '42501';
  end if;
  perform town.member();
  if p_kind is null or p_kind not in ('profile', 'gallery') then
    raise exception 'no such kind of popoto' using errcode = '22023';
  end if;

  -- My purse, made if this is the first time, and held until this is done:
  -- a second exchange of mine waits here and then sees this one.
  insert into public.town_purses (member_id) values (me) on conflict (member_id) do nothing;
  perform 1 from public.town_purses p where p.member_id = me for update;

  select k.value into rate from public.town_knobs k where k.key = 'bank_rate';
  select k.value into weekly from public.town_knobs k where k.key = 'bank_weekly';
  select coalesce(sum(e.popoto), 0) into used
    from public.town_exchanges e where e.member_id = me and e.week = this_week;
  select l.profile_left, l.gallery_left into have_profile, have_gallery
    from public.town_popoto_left(me) l;

  if p_popoto is null or p_popoto < 1 then
    refusal := 'amount';
  elsif used + p_popoto > weekly then
    refusal := 'cap';
  elsif p_popoto > (case p_kind when 'profile' then have_profile else have_gallery end) then
    refusal := 'popoto';
  end if;

  if refusal is null then
    if p_kind = 'profile' then
      select p.character_id into mine from public.profiles p where p.id = me;
    end if;
    insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week)
      values (me, p_kind, mine, p_popoto, p_popoto * rate, this_week);
    update public.town_purses p
       set coins = p.coins + p_popoto * rate, updated_at = now()
     where p.member_id = me;
    -- the board counts them no longer: the character's oldest first
    if p_kind = 'profile' then perform town.mark_changed(mine, p_popoto); end if;
    used := used + p_popoto;
    if p_kind = 'profile' then have_profile := have_profile - p_popoto;
    else have_gallery := have_gallery - p_popoto; end if;
  end if;

  return query
    select refusal is null, refusal,
           (select p.coins from public.town_purses p where p.member_id = me),
           used, have_profile, have_gallery;
end;
$function$;

-- public.town_familiar_wear(p_id text)
CREATE OR REPLACE FUNCTION public.town_familiar_wear(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.familiar_wear(town.purse_of(me, true), p_id);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'familiar', p_id, case when p_id is null then 0 else 1 end, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_farm(p_since bigint)
CREATE OR REPLACE FUNCTION public.town_farm(p_since bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  since bigint := greatest(coalesce(p_since, 0), 0) - 10000;
begin
  -- (somebody is looking at the farm: this hour of the pests' is counted, if it has not been)
  perform town.swarm_note(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'swarms', town.swarms_told(since),
    'well', town.thing('well', false),
    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                from public.town_plots p where p.changed > since),
    'beds', (select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b));
end;
$function$;

-- public.town_fountain()
CREATE OR REPLACE FUNCTION public.town_fountain()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('fountain', town.fountain_told(me), 'purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$function$;

-- public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb)
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
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', f->'kinds'->(spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0));
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$;

-- public.town_get_up(p_company integer)
CREATE OR REPLACE FUNCTION public.town_get_up(p_company integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_kept(me, true);
begin
  perform town.keep_purse(me, town.get_up(purse, coalesce(p_company, 0), town.now_ms()));
  -- (only somebody at a meal gets up from one)
  if coalesce(purse->'eating', 'null'::jsonb) <> 'null'::jsonb then perform town.note(me, 'get_up', purse->'eating'->>'dish'); end if;
  return town.answer(me, '{"ok": true}'::jsonb);
end;
$function$;

-- public.town_gift_take(p_line text, p_rank integer)
CREATE OR REPLACE FUNCTION public.town_gift_take(p_line text, p_rank integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  points jsonb := (select coalesce(jsonb_object_agg(k.key, k.value->'points'), '{}'::jsonb) from jsonb_each(town.work_told(me, town.now_ms())) k);
  did jsonb := town.gift_take(town.purse_of(me, true), points, p_line, coalesce(p_rank, 0));
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift', did->>'gift', 1, 0, jsonb_build_object('line', p_line, 'rank', p_rank));
  end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_gift_use(p_id text)
CREATE OR REPLACE FUNCTION public.town_gift_use(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.gift_use(town.purse_of(me, true), p_id, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift_use', p_id, 1, 0, jsonb_build_object('left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_give(p_slot integer, p_n integer)
CREATE OR REPLACE FUNCTION public.town_give(p_slot integer, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  village jsonb := town.thing('village', true);
  did jsonb := town.give(purse, village, p_slot, p_n, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('village', did->'village');
    village := did->'village';
    perform town.note(me, 'give', purse->'bag'->p_slot->>'item', (did->>'given')::numeric, (did->>'coins')::numeric,
      case when coalesce(did->'opened', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('opened', did->'opened') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object(
    'order', town.order_of(village, town.now_ms()),
    'shelf', town.shelf_of((village->>'unlocked')::int));
end;
$function$;

-- public.town_ground()
CREATE OR REPLACE FUNCTION public.town_ground()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  return jsonb_build_object('ground', town.ground_now(now_), 'now', now_);
end;
$function$;

-- public.town_ground_drop(p_slot integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_ground_drop(p_slot integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb;
  id_ bigint;
begin
  did := town.ground_drop(purse, p_slot, me::text, p_x, p_y, now_, 0);
  if (did->>'ok')::boolean then
    -- (what has lain its time is thrown away here, where a line is written anyway)
    delete from public.town_ground g where g.until_ms <= now_;
    insert into public.town_ground (member_id, stack, x, y, until_ms)
      values (me, did->'dropped'->'stack', p_x, p_y, (did->'dropped'->>'until')::bigint) returning id into id_;
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'ground_drop', did->'dropped'->'stack'->>'item', (did->'dropped'->'stack'->>'n')::numeric, 0,
      jsonb_build_object('id', id_, 'tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'dropped') || case when id_ is not null then jsonb_build_object('id', id_) else '{}'::jsonb end
    || jsonb_build_object('ground', town.ground_now(now_));
end;
$function$;

-- public.town_ground_take(p_id bigint, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_ground_take(p_id bigint, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  -- (my purse's row first, as by every deed of mine; then the thing's own line: of two who reach for it at the same
  -- moment the second waits here, and finds it gone)
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  d jsonb;
  did jsonb;
begin
  select jsonb_build_object('id', g.id, 'by', g.member_id, 'stack', g.stack, 'at', jsonb_build_array(g.x, g.y), 'until', g.until_ms) into d
    from public.town_ground g where g.id = p_id for update;
  did := town.ground_pick(purse, d, p_x, p_y, now_);
  if (did->>'ok')::boolean then
    delete from public.town_ground g where g.id = p_id;
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'ground_take', did->>'item', (did->>'n')::numeric, 0,
      jsonb_build_object('id', p_id, 'tile', jsonb_build_array(p_x, p_y))
      || case when d->>'by' is distinct from me::text then jsonb_build_object('whose', d->'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('ground', town.ground_now(now_));
end;
$function$;

-- public.town_hint()
CREATE OR REPLACE FUNCTION public.town_hint()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.buy_hint(purse, town.thing('found', false), (town.thing('village', false)->>'unlocked')::int, random());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'hint', did->>'hint', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_hold(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_hold(p_slot integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_slot is null then did := jsonb_build_object('ok', true, 'purse', purse || '{"hand": null}'::jsonb);
  else did := town.hold(purse, p_slot); end if;
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  -- (nothing in the hand and nothing taken up is no deed)
  if (did->>'ok')::boolean and coalesce(did->'purse'->>'hand', purse->>'hand') is not null then
    perform town.note(me, case when p_slot is null then 'put_away' else 'hold' end, coalesce(did->'purse'->>'hand', purse->>'hand'));
  end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_is_open()
CREATE OR REPLACE FUNCTION public.town_is_open()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select auth.uid() is not null
     and (public.is_admin()
          or (public.verified_character()
              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0));
$function$;

-- public.town_jar_drop(p_slot integer, p_n integer, p_coins integer)
CREATE OR REPLACE FUNCTION public.town_jar_drop(p_slot integer DEFAULT NULL::integer, p_n integer DEFAULT NULL::integer, p_coins integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.jar_drop(purse, jar, case when p_coins is not null then jsonb_build_object('coins', p_coins) else jsonb_build_object('slot', p_slot, 'n', p_n) end);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things' where j.one;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'drop', coalesce(p_coins, 0),
              case when p_coins is null then jsonb_build_array(jsonb_build_array(purse->'bag'->p_slot->>'item', p_n)) else '[]'::jsonb end);
    perform town.note(me, 'jar_drop', case when p_coins is null then purse->'bag'->p_slot->>'item' end, coalesce(p_n, 1), -coalesce(p_coins, 0), '{}'::jsonb);
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$function$;

-- public.town_jar_take()
CREATE OR REPLACE FUNCTION public.town_jar_take()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  mine jsonb;
  did jsonb;
begin
  select jsonb_build_object('coins', o.coins, 'things', o.things) into mine from public.town_jar_owed o where o.member_id = me for update;
  did := town.jar_collect(purse, mine);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if did->'mine' is null or did->'mine' = 'null'::jsonb then delete from public.town_jar_owed o where o.member_id = me;
    else update public.town_jar_owed o set coins = 0, things = did->'mine'->'things' where o.member_id = me; end if;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'take', (did->>'coins')::integer, did->'things');
    perform town.note(me, 'jar_take', null, 1, (did->>'coins')::numeric, jsonb_build_object('things', did->'things'));
  end if;
  return town.answer(me, did - 'mine') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$function$;

-- public.town_kitchen()
CREATE OR REPLACE FUNCTION public.town_kitchen()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object(
    'now', town.now_ms(),
    'pots', (select coalesce(jsonb_agg(town.pot_doc(o.id) order by o.id), '[]'::jsonb) from public.town_pots o),
    'found', town.thing('found', false),
    'finders', (select coalesce(jsonb_object_agg(f.key, f.value->'name'), '{}'::jsonb) from jsonb_each(town.thing('finders', false)) f));
end;
$function$;

-- public.town_land(p_how text, p_fight jsonb)
CREATE OR REPLACE FUNCTION public.town_land(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    if how = 'landed' and (took < floor((fish->>'line')::double precision / (cat->>'reel')::double precision * (cat->>'least')::double precision * 1000)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
    elsif how in ('snapped', 'slipped') and not suspect then
      back := town.back_bait(case when how = 'snapped' then town.lose_bait(purse, line->>'bait') else purse end, line->>'bait');
      perform town.keep_purse(me, back);
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')));
end;
$function$;

-- public.town_leave(p_slot integer, p_n integer)
CREATE OR REPLACE FUNCTION public.town_leave(p_slot integer, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  -- (the round's price for the thing: the market is brought to this round if it has turned)
  f integer := town.factor_of(town.market_now(), purse->'bag'->p_slot->>'item');
  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms(), f);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n, 0,
    case when f = 100 then '{}'::jsonb else jsonb_build_object('f', f) end); end if;
  -- (what is left is counted as sold this round, for the next round's price)
  if (did->>'ok')::boolean then perform town.market_count(purse->'bag'->p_slot->>'item', p_n); end if;
  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));
end;
$function$;

-- public.town_line()
CREATE OR REPLACE FUNCTION public.town_line()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  line jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me;
  return jsonb_build_object('now', town.now_ms(), 'line', case when line is null then null else
    jsonb_build_object('bait', line->'bait', 'x', line->'x', 'y', line->'y', 'cast_at', line->'cast_at', 'wait', line->'wait', 'nibbles', line->'nibbles',
      'struck_at', line->'struck_at')
    || case when line->'struck_at' <> 'null'::jsonb then jsonb_build_object('what', line->'what', 'size', line->'size') else '{}'::jsonb end end);
end;
$function$;

-- public.town_me()
CREATE OR REPLACE FUNCTION public.town_me()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$function$;

-- public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric, p_by uuid)
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
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
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_here(p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random());
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
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$;

-- public.town_notice_buy(p_id bigint, p_n integer)
CREATE OR REPLACE FUNCTION public.town_notice_buy(p_id bigint, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'sell' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  coins := p_n::bigint * pinned.price;
  if (purse->>'coins')::numeric < coins then return town.noticed(me, town.no('coins')); end if;
  if town.room(purse->'bag', pinned.item) < p_n then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - coins, 'bag', town.put(purse->'bag', pinned.item, p_n)));
  if pinned.rest = p_n then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set rest = x.rest - p_n where x.id = pinned.id; end if;
  insert into public.town_notice_books (member_id, due) values (pinned.member_id, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice)
    values (now_, pinned.item, p_n, pinned.price, 'sell', pinned.member_id, me, pinned.id);
  perform town.note(me, 'notice_buy', pinned.item, p_n, -coins, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'from', pinned.member_id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$function$;

-- public.town_notice_collect()
CREATE OR REPLACE FUNCTION public.town_notice_collect()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  due_ bigint;
  coins bigint;
begin
  select b.due into due_ from public.town_notice_books b where b.member_id = me for update;
  coins := coalesce(due_, 0) / 100;
  if coins <= 0 then return town.noticed(me, town.no('nothing')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + coins));
  update public.town_notice_books b set due = b.due - coins * 100 where b.member_id = me;
  perform town.note(me, 'notice_collect', null, 1, coins);
  return town.noticed(me, jsonb_build_object('ok', true, 'coins', coins));
end;
$function$;

-- public.town_notice_down(p_id bigint)
CREATE OR REPLACE FUNCTION public.town_notice_down(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  things integer;
  coins bigint;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null then return town.noticed(me, town.no('none')); end if;
  things := case when pinned.kind = 'sell' then pinned.rest else pinned.held end;
  coins := case when pinned.kind = 'want' then pinned.rest::bigint * pinned.price else 0 end;
  if town.room(purse->'bag', pinned.item) < things then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + coins,
    'bag', case when things > 0 then town.put(purse->'bag', pinned.item, things) else purse->'bag' end));
  delete from public.town_notices x where x.id = pinned.id;
  perform town.note(me, 'notice_down', pinned.item, things, coins, jsonb_build_object('notice', pinned.id, 'kind', pinned.kind));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'things', things, 'coins', coins));
end;
$function$;

-- public.town_notice_fetch(p_id bigint)
CREATE OR REPLACE FUNCTION public.town_notice_fetch(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  got integer;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null or pinned.kind <> 'want' or pinned.held <= 0 then return town.noticed(me, town.no('none')); end if;
  got := least(pinned.held, town.room(purse->'bag', pinned.item));
  if got <= 0 then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put(purse->'bag', pinned.item, got)));
  if pinned.rest = 0 and pinned.held = got then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set held = x.held - got where x.id = pinned.id; end if;
  perform town.note(me, 'notice_fetch', pinned.item, got, 0, jsonb_build_object('notice', pinned.id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'got', got));
end;
$function$;

-- public.town_notice_fill(p_id bigint, p_n integer)
CREATE OR REPLACE FUNCTION public.town_notice_fill(p_id bigint, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'want' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  if town.plain(purse->'bag', pinned.item) < p_n then return town.noticed(me, town.no('none')); end if;
  coins := p_n::bigint * pinned.price;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.take_plain(purse->'bag', pinned.item, p_n)));
  update public.town_notices x set rest = x.rest - p_n, held = x.held + p_n where x.id = pinned.id;
  insert into public.town_notice_books (member_id, due) values (me, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice)
    values (now_, pinned.item, p_n, pinned.price, 'want', me, pinned.member_id, pinned.id);
  perform town.note(me, 'notice_fill', pinned.item, p_n, 0, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'to', pinned.member_id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$function$;

-- public.town_notice_post(p_kind text, p_item text, p_n integer, p_price integer)
CREATE OR REPLACE FUNCTION public.town_notice_post(p_kind text, p_item text, p_n integer, p_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  had integer;
  up integer;
  pinned bigint;
begin
  if p_item is null or not town.cat('items') ? p_item or p_kind is null or p_kind not in ('sell', 'want') then return town.noticed(me, town.no('none')); end if;
  if p_n is null or p_n <= 0 or p_price is null or p_price <= 0 or p_n > (k->>'most')::int then return town.noticed(me, town.no('amount')); end if;
  if p_kind = 'want' and not town.seen_has(p_item) then return town.noticed(me, town.no('none')); end if;
  if p_kind = 'sell' and town.plain(purse->'bag', p_item) < p_n then return town.noticed(me, town.no('none')); end if;
  if p_price > town.notice_cap(p_item, k) then return town.noticed(me, town.no('dear')); end if;
  if p_kind = 'want' and (purse->>'coins')::numeric < p_n::bigint * p_price then return town.noticed(me, town.no('coins')); end if;
  select b.more into had from public.town_notice_books b where b.member_id = me;
  select count(*) into up from public.town_notices x where x.member_id = me;
  if up >= (k->>'slots')::int + least((k->>'more')::int, coalesce(had, 0)) then return town.noticed(me, town.no('slots')); end if;
  insert into public.town_notices (member_id, kind, item, n, rest, price, at, until)
    values (me, p_kind, p_item, p_n, p_n, p_price, now_, now_ + (k->>'hours')::bigint * 3600000)
    returning id into pinned;
  perform town.keep_purse(me, case when p_kind = 'sell'
    then purse || jsonb_build_object('bag', town.take_plain(purse->'bag', p_item, p_n))
    else purse || jsonb_build_object('coins', (purse->>'coins')::numeric - p_n::bigint * p_price) end);
  perform town.note(me, 'notice_post', p_item, p_n, case when p_kind = 'want' then -(p_n::bigint * p_price) else 0 end,
    jsonb_build_object('kind', p_kind, 'price', p_price, 'notice', pinned));
  return town.noticed(me, jsonb_build_object('ok', true, 'id', pinned));
end;
$function$;

-- public.town_notice_slot()
CREATE OR REPLACE FUNCTION public.town_notice_slot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  k jsonb := town.notice_knobs();
  had integer;
  price bigint;
begin
  insert into public.town_notice_books (member_id) values (me) on conflict (member_id) do nothing;
  select b.more into had from public.town_notice_books b where b.member_id = me for update;
  if had >= (k->>'more')::int then return town.noticed(me, town.no('slots')); end if;
  price := (k->>'slot_price')::bigint * (2 ^ had)::bigint;
  if (purse->>'coins')::numeric < price then return town.noticed(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - price));
  update public.town_notice_books b set more = b.more + 1 where b.member_id = me;
  perform town.note(me, 'notice_slot', null, 1, -price);
  return town.noticed(me, jsonb_build_object('ok', true, 'coins', price));
end;
$function$;

-- public.town_notices()
CREATE OR REPLACE FUNCTION public.town_notices()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('notices', town.notices_told(me), 'now', town.now_ms());
end;
$function$;

-- public.town_open(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_open(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.open(purse, p_slot, array[random(), random()]);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'open', purse->'bag'->p_slot->>'item', 1, 0, jsonb_build_object('found', did->'found')); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_pass(p_to uuid)
CREATE OR REPLACE FUNCTION public.town_pass(p_to uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there: a proved character, or an admin)
  if p_to is null or p_to = me or not exists (
       select 1 from public.town_purses pp join public.profiles p on p.id = pp.member_id
        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who hand to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.pass(mine, theirs, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'from');
    perform town.keep_purse(p_to, did->'to');
    perform town.note(me, 'pass', did->>'can', (did->>'n')::numeric, 0, jsonb_build_object('to', p_to, 'into', did->>'into'));
  end if;
  return town.answer(me, did - 'from' - 'to');
end;
$function$;

-- public.town_popoto_left(p_member uuid)
CREATE OR REPLACE FUNCTION public.town_popoto_left(p_member uuid)
 RETURNS TABLE(profile_left integer, gallery_left integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with who as (
    select p.id,
           case when p.character_verified_at is not null then p.character_id end as character_id
      from public.profiles p
     where p.id = p_member
  )
  select greatest(0,
           (select count(*) from public.kudos k
             where k.receiver_character_id = w.character_id and k.sender_id <> w.id)
           - coalesce((select sum(e.popoto) from public.town_exchanges e
                        where e.kind = 'profile' and e.character_id = w.character_id), 0)
         )::integer,
         case when coalesce((select k.value from public.town_knobs k where k.key = 'bank_gallery'), 0) > 0 then
           greatest(0,
             (select count(*) from public.gallery_likes l
                join public.gallery_posts g on g.id = l.post_id
               where g.author_id = w.id and l.profile_id <> w.id)
             - coalesce((select sum(e.popoto) from public.town_exchanges e
                          where e.kind = 'gallery' and e.member_id = w.id), 0)
           )::integer
         else 0 end
    from who w;
$function$;

-- public.town_pot_down(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_pot_down(p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  if exists (select 1 from public.town_pots o where abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me) >= (ck->>'pots')::int then return town.answer(me, town.no('many')); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int, p_x, p_y, coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms())
    on conflict (x, y) do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_down', did->'pot'->>'dish', (did->'pot'->>'left')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id));
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$function$;

-- public.town_pot_ladle(p_id bigint, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_pot_ladle(p_id bigint, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.ladle(purse, pot);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'ladle', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id) || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  return town.answer(me, did) || jsonb_build_object('dish', pot->'dish');
end;
$function$;

-- public.town_pot_take(p_id bigint, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_pot_take(p_id bigint, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.take_up(purse, pot, me::text);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  delete from public.town_pots o where o.id = p_id;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_take', pot->>'dish', (pot->>'left')::numeric, 0, jsonb_build_object('pot', p_id));
  return town.answer(me, did);
end;
$function$;

-- public.town_read(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_read(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.read_scroll(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'read', did->>'dish'); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_serve(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_serve(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.serve(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'serve', did->>'dish'); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_shop()
CREATE OR REPLACE FUNCTION public.town_shop()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('shops', town.shops_told(me), 'purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$function$;

-- public.town_shop_beat()
CREATE OR REPLACE FUNCTION public.town_shop_beat()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  quiet bigint := (town.shop_knobs()->>'quiet')::bigint * 1000;
  kept integer;
begin
  update public.town_shops s set beat = now_ where s.member_id = me and now_ - s.beat < quiet;
  get diagnostics kept = row_count;
  return jsonb_build_object('ok', kept > 0, 'now', now_);
end;
$function$;

-- public.town_shop_buy(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_shop_buy(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'sell', p_item, p_n, p_x, p_y);
end;
$function$;

-- public.town_shop_close()
CREATE OR REPLACE FUNCTION public.town_shop_close()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  was public.town_shops;
begin
  delete from public.town_shops s where s.member_id = me returning * into was;
  if was.member_id is not null then
    perform town.note(me, 'shop_close', null, 1, 0, jsonb_build_object('took', was.took, 'paid', was.paid, 'lines', was.lines));
  end if;
  return jsonb_build_object('ok', true, 'shops', town.shops_told(me), 'now', town.now_ms());
end;
$function$;

-- public.town_shop_look(p_who uuid)
CREATE OR REPLACE FUNCTION public.town_shop_look(p_who uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  shop jsonb := town.shop_of(p_who, false);
begin
  return jsonb_build_object('shopWho', p_who, 'now', now_,
    'shopTold', case when shop is null then null else town.shop_told_of(shop, town.purse_of(p_who, false), now_, town.shop_knobs()) end);
end;
$function$;

-- public.town_shop_open(p_lines jsonb, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_shop_open(p_lines jsonb, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or exists (select 1 from jsonb_array_elements(p_lines) e where jsonb_typeof(e) <> 'object') then
    return town.shopped(me, town.no('lines'));
  end if;
  -- (a stall stands on a tile of one of the town's maps: v137's)
  if p_x is null or p_y is null or not town.on_ground(p_x, p_y) then return town.shopped(me, town.no('none')); end if;
  did := town.shop_open(purse, me::text, p_lines, p_x, p_y, now_, town.shop_seen(), town.shop_knobs());
  if (did->>'ok')::boolean then
    insert into public.town_shops (member_id, x, y, lines, since, beat, took, paid)
      values (me, p_x, p_y, did->'shop'->'lines', now_, now_, 0, 0)
      on conflict (member_id) do update set x = excluded.x, y = excluded.y, lines = excluded.lines, since = excluded.since, beat = excluded.beat, took = 0, paid = 0;
    perform town.note(me, 'shop_open', null, jsonb_array_length(did->'shop'->'lines'), 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'lines', did->'shop'->'lines'));
  end if;
  return town.shopped(me, did - 'shop');
end;
$function$;

-- public.town_shop_sell(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_shop_sell(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'buy', p_item, p_n, p_x, p_y);
end;
$function$;

-- public.town_sit(p_slot integer, p_seated boolean)
CREATE OR REPLACE FUNCTION public.town_sit(p_slot integer, p_seated boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.sit_down(town.purse_of(me, true), p_slot, p_seated, town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'eat', did->>'dish'); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_sky(p_since bigint)
CREATE OR REPLACE FUNCTION public.town_sky(p_since bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'now', n.ms,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_array(w.slot, w.sky, w.wind, w.gust, w.rain) order by w.slot)
        from public.town_weather w where w.slot >= n.slot - 8), '[]'::jsonb),
    'wet', coalesce((
      select jsonb_agg(w.slot order by w.slot)
        from public.town_weather w
       where w.slot >= greatest(floor(coalesce(p_since, 0)::numeric / 900000)::bigint, n.slot - 5760) and town.wet_sky(w.sky)), '[]'::jsonb))
    from (select town.now_ms() as ms, floor(town.now_ms()::numeric / 900000)::bigint as slot) n
$function$;

-- public.town_stall()
CREATE OR REPLACE FUNCTION public.town_stall()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  village jsonb := town.thing('village', false);
begin
  return jsonb_build_object(
    'stall', town.thing('stall', false),
    'shelf', town.shelf_of((village->>'unlocked')::int),
    'order', town.order_of(village, town.now_ms()),
    'unlocked', (village->>'unlocked')::int,
    'found', town.thing('found', false),
    'prices', town.prices_told(me),
    'now', town.now_ms());
end;
$function$;

-- public.town_strike(p_reaction integer)
CREATE OR REPLACE FUNCTION public.town_strike(p_reaction integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text;
  landed jsonb;
  spent boolean := town.stamina_of(purse, now_) <= 0;
  play jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or line->'struck_at' <> 'null'::jsonb then return town.answer(me, town.no('none')); end if;
  play := jsonb_build_object('place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'claims', jsonb_build_object('rain', line->'rain', 'reaction', p_reaction));
  how := case
    when now_ < (line->>'bites_at')::bigint - (cat->'slack'->>'early')::bigint then 'early'
    when now_ > (line->>'bites_at')::bigint + floor(town.strike_window(purse, now_) * 1000)::bigint + (cat->'slack'->>'late')::bigint then 'missed'
    end;
  if how is not null then
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  fish := town.cat('fish')->(line->>'what');
  if fish is null then
    landed := town.land_catch(purse, line->>'what', 0);
    perform town.keep_purse(me, landed->'purse');
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', true, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', 'landed', 'kept', landed->'kept', 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
  end if;
  -- a fight costs its stamina whatever comes of it
  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false));
end;
$function$;

-- public.town_take_back(p_at integer)
CREATE OR REPLACE FUNCTION public.town_take_back(p_at integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.take_back(purse, coalesce(p_at, -1), town.now_ms());
  lot jsonb;
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then
    -- (which lot it was: the first place where what he held and what he holds now differ)
    select b.l into lot from jsonb_array_elements(purse->'left') with ordinality b(l, ord)
      left join jsonb_array_elements(did->'purse'->'left') with ordinality a(l, ord) on a.ord = b.ord
     where a.l is distinct from b.l order by b.ord limit 1;
    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);
    -- (taken back in the round it was left in, it was not sold)
    if (lot->>'round')::int = town.round_of(town.now_ms()) then perform town.market_count(lot->>'item', -(lot->>'n')::int); end if;
  end if;
  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));
end;
$function$;

-- public.town_take_off(p_item text)
CREATE OR REPLACE FUNCTION public.town_take_off(p_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.take_off(town.purse_of(me, true), p_item);
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'take_off', p_item); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_tend(p_x integer, p_y integer, p_timing jsonb, p_sure boolean)
CREATE OR REPLACE FUNCTION public.town_tend(p_x integer, p_y integer, p_timing jsonb DEFAULT NULL::jsonb, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses);
end;
$function$;

-- public.town_thank(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_thank(p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb;
begin
  if p_x is null or p_y is null then return jsonb_build_object('ok', false, 'why', 'none', 'now', now_); end if;
  -- (one at a time for one member: two taps at once thank nobody twice)
  perform pg_advisory_xact_lock(hashtext('town.thanks'), hashtext(me::text));
  did := town.thank(p_x, p_y, me, now_);
  if (did->>'ok')::boolean then
    perform town.note(me, 'thank', null, jsonb_array_length(did->'thanked'), 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'to', did->'thanked'));
  end if;
  return did || jsonb_build_object('now', now_, 'toThank', town.to_thank(me, now_));
end;
$function$;

-- public.town_title_wear(p_line text, p_rank integer)
CREATE OR REPLACE FUNCTION public.town_title_wear(p_line text DEFAULT NULL::text, p_rank integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  has double precision;
begin
  if p_line is null then
    delete from public.town_titles t where t.member_id = me;
    perform town.note(me, 'title', null, 0);
    return jsonb_build_object('ok', true) || town.work_answer(me);
  end if;
  if not (town.cat('work')->'marks' ? p_line) or p_rank is null then return town.no('none'); end if;
  has := (town.work_told(me, town.now_ms())->p_line->>'points')::double precision;
  if p_rank < 1 or p_rank > town.work_rank(p_line, has) then return town.no('none'); end if;
  insert into public.town_titles (member_id, line, rank) values (me, p_line, p_rank)
    on conflict (member_id) do update set line = excluded.line, rank = excluded.rank, at = now();
  perform town.note(me, 'title', p_line, p_rank);
  return jsonb_build_object('ok', true) || town.work_answer(me);
end;
$function$;

-- public.town_to_thank()
CREATE OR REPLACE FUNCTION public.town_to_thank()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'toThank', town.to_thank(me, town.now_ms()));
end;
$function$;

-- public.town_toss(p_wish text, p_coins integer, p_note text)
CREATE OR REPLACE FUNCTION public.town_toss(p_wish text, p_coins integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  said text := town.tidy_note(p_note);
  did jsonb;
begin
  if p_note is not null and said is null and btrim(p_note) <> '' then
    return town.answer(me, town.no('note')) || jsonb_build_object('fountain', town.fountain_told(me));
  end if;
  did := town.tossed(me, p_wish, p_coins, case when said is null then '{}'::jsonb else '{"note": true}'::jsonb end);
  if (did->>'ok')::boolean and said is not null then
    insert into public.town_wish_notes (member_id, at, day, wish, note)
      values (me, to_timestamp(town.now_ms() / 1000.0), town.day_of(town.now_ms()), p_wish, said)
      on conflict (member_id, day) do update
        set wish = excluded.wish, note = excluded.note, at = excluded.at, cheers = '{}', reports = '{}',
            -- (what an admin hid stays hidden for the day, whatever is written over it)
            hidden = public.town_wish_notes.hidden_by is not null;
  end if;
  return town.answer(me, did) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$function$;

-- public.town_wear(p_slot integer)
CREATE OR REPLACE FUNCTION public.town_wear(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  did jsonb := town.wear(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'wear', did->'purse'->'wears'->>-1); end if;
  return town.answer(me, did);
end;
$function$;

-- public.town_weather_kept()
CREATE OR REPLACE FUNCTION public.town_weather_kept()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  cur bigint := floor(extract(epoch from now()) / 900)::bigint;
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'the weather that was is kept as it was' using errcode = '42501';
  end if;
  if new.slot > cur + 8 or new.slot < cur - 700 then
    raise exception 'that quarter hour is too far off to be written now' using errcode = '22003';
  end if;
  new.written := now();
  return new;
end;
$function$;

-- public.town_well()
CREATE OR REPLACE FUNCTION public.town_well()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  -- (what the book no longer reads is thrown away as it is opened: a week of days is kept)
  delete from public.town_well_reach r where r.day < town.day_of(now_) - 7;
  delete from public.town_yard_reach r where r.day < town.day_of(now_) - 7;
  perform town.jar_now(now_);
  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_, 'thanks', town.thanks_board(me, now_), 'jar', town.jar_told(me, now_),
    'wellWater', town.well_water_told(now_));
end;
$function$;

-- public.town_well_ranks()
CREATE OR REPLACE FUNCTION public.town_well_ranks()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(),
    'ranks', (select coalesce(jsonb_object_agg(c.member_id::text, town.well_rank(c.buckets)), '{}'::jsonb)
                from public.town_carriers c where town.well_rank(c.buckets) > 0),
    'thanked', town.thanks_board(me, town.now_ms())->'today',
    'yard', jsonb_build_object('jar', coalesce((select (t.doc #>> '{}')::integer from public.town_things t where t.key = 'yard'), 0)),
    'line', true,
    'wellWater', town.well_water_told(town.now_ms()));
end;
$function$;

-- public.town_well_take()
CREATE OR REPLACE FUNCTION public.town_well_take()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  v_buckets integer;
  v_taken integer[];
  did jsonb;
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = me for update;
  did := town.well_take(purse, coalesce(v_buckets, 0), coalesce(v_taken, '{}'));
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_carriers c set taken = c.taken || (did->>'rank')::integer where c.member_id = me;
    perform town.note(me, 'gift', did->>'gift', 1, 0, jsonb_build_object('from', 'well', 'rank', (did->>'rank')::integer));
  end if;
  return town.answer(me, did) || jsonb_build_object('wellBook', town.well_book(me, town.now_ms()));
end;
$function$;

-- public.town_wild()
CREATE OR REPLACE FUNCTION public.town_wild()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  word text := town.word();
  took jsonb;
  has jsonb;
  t jsonb;
  kind jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  -- (what has been taken of late, in one look: no turn is longer than half a day)
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'spot' and tk.at > now() - interval '13 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(f->'spots') - 1 loop
    has := town.wild_holds(i, now_, f, word);
    continue when has is null;
    kind := f->'kinds'->(f->'spots'->i->>0);
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (kind->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, case when kind->>'how' = 'dig' then null else has->>'item' end, (has->>'n')::int, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'wild', out_);
end;
$function$;

-- public.town_wish_hide(p_note bigint, p_hidden boolean)
CREATE OR REPLACE FUNCTION public.town_wish_hide(p_note bigint, p_hidden boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  n_ integer;
begin
  if not public.is_admin() then raise exception 'only an admin hides a wish' using errcode = '42501'; end if;
  update public.town_wish_notes n set hidden = coalesce(p_hidden, true), hidden_by = case when coalesce(p_hidden, true) then me end,
         reports = case when coalesce(p_hidden, true) then n.reports else '{}' end
   where n.id = p_note;
  get diagnostics n_ = row_count;
  return town.answer(me, case when n_ > 0 then '{"ok": true}'::jsonb else town.no('none') end) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$function$;

-- public.town_wish_report(p_note bigint)
CREATE OR REPLACE FUNCTION public.town_wish_report(p_note bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  n_ integer;
begin
  update public.town_wish_notes n
     set reports = array_append(n.reports, me), hidden = n.hidden or cardinality(n.reports) + 1 >= 3
   where n.id = p_note and n.member_id <> me and not (me = any (n.reports));
  get diagnostics n_ = row_count;
  if n_ > 0 then perform town.note(me, 'report', null, 1, 0, jsonb_build_object('note', p_note)); end if;
  return town.answer(me, case when n_ > 0 then '{"ok": true}'::jsonb else town.no('none') end) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$function$;

-- public.town_wish_unsay(p_note bigint)
CREATE OR REPLACE FUNCTION public.town_wish_unsay(p_note bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  n_ integer;
begin
  delete from public.town_wish_notes n where n.id = p_note and n.member_id = me;
  get diagnostics n_ = row_count;
  return town.answer(me, case when n_ > 0 then '{"ok": true}'::jsonb else town.no('none') end) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$function$;

-- public.town_work()
CREATE OR REPLACE FUNCTION public.town_work()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return town.work_answer(me);
end;
$function$;

-- public.town_yard()
CREATE OR REPLACE FUNCTION public.town_yard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'yard', jsonb_build_object('jar', coalesce((town.thing('yard', false) #>> '{}')::integer, 0)));
end;
$function$;

-- public.town_yard_pour(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION public.town_yard_pour(p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  hand text := town.hand_of(purse);
  jar integer;
  did jsonb;
begin
  if p_x is null or p_y is null or not exists (
       select 1 from jsonb_array_elements(town.cat('yard')->'at') t where (t->>0)::integer = p_x and (t->>1)::integer = p_y) then
    return town.answer(me, town.no('none'));
  end if;
  jar := coalesce((town.thing('yard', true) #>> '{}')::integer, 0);
  did := town.yard_pour(purse, jar, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('yard', did->'jar');
    perform town.note(me, 'yard', hand, (did->>'poured')::numeric, 0, jsonb_build_object('jar', did->'jar'));
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('yard', jsonb_build_object('jar', coalesce((did->>'jar')::integer, jar)));
end;
$function$;

-- town.agree(p_deal jsonb, p_me text, p_word boolean)
CREATE OR REPLACE FUNCTION town.agree(p_deal jsonb, p_me text, p_word boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  side text := town.side_of(p_deal, p_me);
begin
  if side is null then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'deal', p_deal || jsonb_build_object('ok', (p_deal->'ok') || jsonb_build_object(side, p_word)));
end;
$function$;

-- town.answer(p_member uuid, p_did jsonb)
CREATE OR REPLACE FUNCTION town.answer(p_member uuid, p_did jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select (p_did - 'purse' - 'stall' - 'village')
    || jsonb_build_object('purse', town.purse_of(p_member, false), 'now', town.now_ms())
$function$;

-- town.asks(p_kind text, p_stage integer)
CREATE OR REPLACE FUNCTION town.asks(p_kind text, p_stage integer)
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(array_agg(e->>0 order by ord), '{}')
    from jsonb_array_elements(town.cat('order')->'asks'->p_kind) with ordinality x(e, ord)
   where (e->>1)::int between 0 and p_stage
$function$;

-- town.back_bait(p_purse jsonb, p_bait text)
CREATE OR REPLACE FUNCTION town.back_bait(p_purse jsonb, p_bait text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when town.cat('fishing')->'kept' ? p_bait or town.room(p_purse->'bag', p_bait) < 1 then p_purse
    else p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', p_bait, 1)) end
$function$;

-- town.backs_now(p_now bigint)
CREATE OR REPLACE FUNCTION town.backs_now(p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('haunt', c.haunt, 'turn', c.turn, 'bug', c.bug, 'n', c.n, 'from', c.from_ms) order by c.from_ms, c.haunt), '[]'::jsonb)
    from public.town_comebacks c where c.from_ms > p_now - 2 * 3600000::bigint
$function$;

-- town.bed_of(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.bed_of(p_x integer, p_y integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce((
    select (b.ord - 1)::integer
      from (select town.cat('farming') as f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord)
     where p_x >= (b.at->>0)::int and p_x < (b.at->>0)::int + (c.f->>'side')::int
       and p_y >= (b.at->>1)::int and p_y < (b.at->>1)::int + (c.f->>'side')::int
     limit 1), -1)
$function$;

-- town.bed_told(p_bed integer)
CREATE OR REPLACE FUNCTION town.bed_told(p_bed integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty,
           'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, ''))
    from public.town_beds b join public.profiles pr on pr.id = b.member_id
   where b.bed = p_bed
$function$;

-- town.blessed(p_purse jsonb, p_f jsonb, p_me text, p_now bigint)
CREATE OR REPLACE FUNCTION town.blessed(p_purse jsonb, p_f jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when jsonb_array_length(m.mine) > 0 then p_purse || jsonb_build_object('blessed', m.mine) else p_purse - 'blessed' end
    from (select town.blessings_of(coalesce(p_f, '{}'::jsonb), p_me, p_now) as mine) m
$function$;

-- town.blessings_of(p_f jsonb, p_me text, p_now bigint)
CREATE OR REPLACE FUNCTION town.blessings_of(p_f jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.v->>'id', 'until', (b.v->>'until')::bigint) order by b.ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_f->'blessings', '[]'::jsonb)) with ordinality b(v, ord)
   where (b.v->>'until')::bigint > p_now and b.v->'of' ? p_me
$function$;

-- town.bowls_back(p_purse jsonb, p_more integer)
CREATE OR REPLACE FUNCTION town.bowls_back(p_purse jsonb, p_more integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  owed integer := coalesce((p_purse->>'owed')::int, 0) + coalesce(p_more, 0);
  bowl text;
  fits integer;
begin
  if owed = 0 then return p_purse; end if;
  bowl := town.cat('cooking')->>'bowl';
  fits := least(owed, town.room(p_purse->'bag', bowl));
  return (p_purse - 'owed')
    || jsonb_build_object('bag', case when fits > 0 then town.put(p_purse->'bag', bowl, fits) else p_purse->'bag' end)
    || case when owed > fits then jsonb_build_object('owed', owed - fits) else '{}'::jsonb end;
end;
$function$;

-- town.bowls_today(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.bowls_today(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when (p_purse->'meals'->>'day')::int is distinct from town.day_of(p_now) then '[0, 0, 0]'::jsonb
    when jsonb_typeof(p_purse->'meals'->'bowls') = 'array' then p_purse->'meals'->'bowls'
    else (select jsonb_agg(case when x.e::boolean then 1 else 0 end order by x.ord) from jsonb_array_elements_text(p_purse->'meals'->'eaten') with ordinality as x(e, ord)) end
$function$;

-- town.box_move(p_from jsonb, p_slot integer, p_n numeric, p_to jsonb, p_full text)
CREATE OR REPLACE FUNCTION town.box_move(p_from jsonb, p_slot integer, p_n numeric, p_to jsonb, p_full text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot >= 0 then p_from->p_slot end;
  moved jsonb;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n <= 0 or p_n > (s->>'n')::numeric then return town.no('amount'); end if;
  moved := town.push(p_to, jsonb_build_array(s || jsonb_build_object('n', p_n::int)));
  if moved is null then return town.no(p_full); end if;
  return jsonb_build_object('ok', true, 'item', s->>'item', 'n', p_n::int, 'to', moved,
    'from', jsonb_set(p_from, array[p_slot::text],
      case when (s->>'n')::numeric = p_n then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - p_n::int) end));
end;
$function$;

-- town.box_of(p_member uuid)
CREATE OR REPLACE FUNCTION town.box_of(p_member uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select town.box_roomy(coalesce(
    (select jsonb_build_object('things', b.things, 'more', b.more) from public.town_boxes b where b.member_id = p_member),
    jsonb_build_object('things', '[]'::jsonb, 'more', 0)))
$function$;

-- town.box_roomy(p_box jsonb)
CREATE OR REPLACE FUNCTION town.box_roomy(p_box jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when w.want > jsonb_array_length(p_box->'things')
    then p_box || jsonb_build_object('things', (p_box->'things')
      || (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_box->'things'))))
    else p_box end
    from (select (town.cat('box')->>'slots')::int + greatest(0, coalesce((p_box->>'more')::int, 0)) as want) w
$function$;

-- town.buff_by(p_purse jsonb, p_now bigint, p_id text)
CREATE OR REPLACE FUNCTION town.buff_by(p_purse jsonb, p_now bigint, p_id text)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
  select case when l.level >= 1
    then coalesce((c.st->'steps'->p_id->>(least((c.st->>'levels')::int, l.level) - 1))::double precision, 0::double precision)
    else 0::double precision end
    from (select town.level_of(p_purse, p_now, p_id) as level) l, (select town.cat('stamina') as st) c
$function$;

-- town.buff_of(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.buff_of(p_purse jsonb, p_now bigint)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when coalesce(p_purse->'buff', 'null'::jsonb) <> 'null'::jsonb and (p_purse->'buff'->>'until')::bigint > p_now then p_purse->'buff'->>'id' end
$function$;

-- town.bug_at(p_haunt integer, p_now bigint, p_cat jsonb, p_word text)
CREATE OR REPLACE FUNCTION town.bug_at(p_haunt integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  ids jsonb := ins->'order';
  bug jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick text := null;
  i integer;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>i, h->>1, h->>2, at_, word));
    if fits[i + 1] then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * total;
  for i in 0..jsonb_array_length(ids) - 1 loop
    if fits[i + 1] then
      pick := ids->>i;
      left_ := left_ - (ins->'bugs'->pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  -- hunted, it is out less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is as the turn begins. Nothing takes its place.
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase);
end;
$function$;

-- town.bug_here(p_haunt integer, p_now bigint, p_backs jsonb, p_cat jsonb, p_word text)
CREATE OR REPLACE FUNCTION town.bug_here(p_haunt integer, p_now bigint, p_backs jsonb, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  own jsonb := town.bug_at(p_haunt, p_now, ins, p_word);
  every bigint;
  phase bigint;
  turn bigint;
  b jsonb;
begin
  if own is not null then return own; end if;
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  select x.one into b from jsonb_array_elements(coalesce(p_backs, '[]'::jsonb)) with ordinality as x(one, ord)
   where (x.one->>'haunt')::int = p_haunt and (x.one->>'turn')::bigint = turn and (x.one->>'from')::bigint <= p_now
   order by x.ord limit 1;
  if b is null then return null; end if;
  return jsonb_build_object('turn', turn, 'bug', b->>'bug', 'n', (b->>'n')::int, 'seed', p_haunt::bigint * 100003 + turn,
    'until', (turn + 1) * every - phase, 'back', true);
end;
$function$;

-- town.buy(p_purse jsonb, p_stall jsonb, p_id text, p_n integer, p_now bigint, p_shelf jsonb)
CREATE OR REPLACE FUNCTION town.buy(p_purse jsonb, p_stall jsonb, p_id text, p_n integer, p_now bigint, p_shelf jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  g jsonb := town.cat('goods')->p_id;
  cur integer := town.round_of(p_now);
  sold integer;
  bought integer;
  lim_sold integer;
  lim_each integer;
  lim_full integer;
  lim_coins integer;
  may integer;
  stop text;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if g is null or (p_shelf is not null and not p_shelf ? p_id) then
    return town.no('none');
  end if;
  sold := case when (p_stall->>'round')::int = cur then coalesce((p_stall->'sold'->>p_id)::int, 0) else 0 end;
  bought := case when (p_purse->'bought'->>'round')::int = cur then coalesce((p_purse->'bought'->'n'->>p_id)::int, 0) else 0 end;
  lim_sold := greatest(0, (g->>'stock')::int - sold);
  lim_each := (g->>'each')::int - bought;
  lim_full := town.room(p_purse->'bag', p_id);
  lim_coins := floor((p_purse->>'coins')::numeric / (g->>'price')::int)::int;
  may := greatest(0, least(lim_sold, lim_each, lim_full, lim_coins));
  stop := case when lim_sold <= may then 'sold' when lim_each <= may then 'each' when lim_full <= may then 'full' else 'coins' end;
  if p_n > may then return town.no(stop); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object(
      'coins', (p_purse->>'coins')::int - p_n * (g->>'price')::int,
      'bag', town.put(p_purse->'bag', p_id, p_n),
      'bought', jsonb_build_object('round', cur, 'n',
        (case when (p_purse->'bought'->>'round')::int = cur then p_purse->'bought'->'n' else '{}'::jsonb end) || jsonb_build_object(p_id, bought + p_n))),
    'stall', jsonb_build_object('round', cur, 'sold',
      (case when (p_stall->>'round')::int = cur then p_stall->'sold' else '{}'::jsonb end) || jsonb_build_object(p_id, sold + p_n)));
end;
$function$;

-- town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
CREATE OR REPLACE FUNCTION town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  hint text := town.next_hint(p_purse, p_found, p_stage, p_r);
  price integer;
begin
  if hint is null then return town.no('none'); end if;
  price := (town.cat('hints')->'price'->>(town.cat('items')->hint->>'tier'))::int;
  if (p_purse->>'coins')::int < price then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'hint', hint, 'purse', p_purse || jsonb_build_object(
    'coins', (p_purse->>'coins')::int - price,
    'hints', coalesce(p_purse->'hints', '[]'::jsonb) || to_jsonb(hint)));
end;
$function$;

-- town.by_box(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.by_box(p_x integer, p_y integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(greatest(abs(p_x - (b.k->'at'->>0)::int), abs(p_y - (b.k->'at'->>1)::int)) between 1 and (b.k->>'reach')::int, false)
    from (select town.cat('box') as k) b
$function$;

-- town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision)
CREATE OR REPLACE FUNCTION town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs, p_luck);
  n integer := jsonb_array_length(odds);
  apart integer := (town.cat('fishing')->>'apart')::int;
  k integer := 2;
  r double precision := p_rnd[1];
  what text := odds->(n - 1)->>'what';
  fish jsonb;
  span jsonb;
  wait integer;
  many integer := 0;
  nibbles integer[] := '{}';
  at_ integer;
  big double precision;
  size double precision := 0;
  i integer;
begin
  for i in 0..n - 1 loop
    if r < (odds->i->>'p')::double precision then what := odds->i->>'what'; exit; end if;
    r := r - (odds->i->>'p')::double precision;
  end loop;
  fish := town.cat('fish')->what;
  span := coalesce(fish->'wait', town.cat('flotsam')->what->'wait');
  wait := floor((span->>0)::double precision + ((span->>1)::double precision - (span->>0)::double precision) * p_rnd[k] + 0.5::double precision)::int;
  k := k + 1;
  -- a fish may nibble once or twice first; what is no fish only drifts onto the hook
  if fish is not null then
    many := case when p_rnd[k] < 0.3 then 0 when p_rnd[k] < 0.75 then 1 else 2 end;
    k := k + 1;
  end if;
  for i in 1..many loop
    at_ := floor((0.25::double precision + 0.6::double precision * p_rnd[k]) * wait + 0.5::double precision)::int;
    k := k + 1;
    if at_ >= apart and wait - at_ >= apart and not exists (select 1 from unnest(nibbles) x where abs(x - at_) < apart) then
      nibbles := nibbles || at_;
    end if;
  end loop;
  -- most are small: the roll is multiplied by itself
  if fish is not null then
    big := p_rnd[k];
    size := floor(((fish->'size'->>0)::double precision + ((fish->'size'->>1)::double precision - (fish->'size'->>0)::double precision) * (big * big)) * 10 + 0.5::double precision)
      / 10::double precision;
  end if;
  return jsonb_build_object('what', what, 'wait', wait, 'size', size,
    'nibbles', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(nibbles) x));
end;
$function$;

-- town.cat(p_key text)
CREATE OR REPLACE FUNCTION town.cat(p_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ select c.data from public.town_catalog c where c.key = p_key $function$;

-- town.charm_by(p_purse jsonb, p_id text, p_else double precision)
CREATE OR REPLACE FUNCTION town.charm_by(p_purse jsonb, p_id text, p_else double precision)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$ select case when town.wearing(p_purse, p_id) then (town.cat('gifts')->'gifts'->p_id->>'by')::double precision else p_else end $function$;

-- town.charms_wear(p_purse jsonb, p_ids jsonb)
CREATE OR REPLACE FUNCTION town.charms_wear(p_purse jsonb, p_ids jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  g jsonb := town.cat('gifts');
  mine jsonb := town.gifts_of(p_purse);
  ids jsonb := case when jsonb_typeof(p_ids) = 'array' then p_ids else '[]'::jsonb end;
begin
  if jsonb_array_length(ids) > (g->>'slots')::integer or (select count(distinct e) from jsonb_array_elements(ids) e) <> jsonb_array_length(ids) then return town.no('slots'); end if;
  if exists (select 1 from jsonb_array_elements(ids) e
              where jsonb_typeof(e) <> 'string' or not (mine->'had' ? (e #>> '{}')) or g->'gifts'->(e #>> '{}')->>'kind' is distinct from 'charm') then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('charms', ids)));
end;
$function$;

-- town.chew(p_purse jsonb, p_company double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised(p_purse, dish->>'buff', p_now) else '{}'::jsonb end;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));
end;
$function$;

-- town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  what text := town.chore_for(p_purse, p_where, p_well);
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  has integer;
  pours integer;
begin
  if what is null or hand is null then return town.no('none'); end if;
  if what = 'draw' then
    select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well,
      'purse', town.spend(p_purse, (f->'chores'->>'draw')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', (f->'buckets'->>hand)::int
          + (case when town.has_buff(p_purse, p_now, 'carry') then (town.wishing()->>'carry')::int else 0 end)))));
  end if;
  if what = 'pour' then
    -- as much of it as the well has room for; the rest stays in the bucket
    select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) <> 0 order by x.ord limit 1;
    pours := least(has, (f->>'well')::int - p_well);
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well + pours,
      'purse', town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text],
             case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
  end if;
  -- a can takes one bucket of the well's water, however much was left in it
  if p_well < 1 then return town.no('dry'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric order by x.ord limit 1;
  return jsonb_build_object('ok', true, 'chore', what, 'well', p_well - 1,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', f->'cans'->hand))));
end;
$function$;

-- town.chore_for(p_purse jsonb, p_where text, p_well integer)
CREATE OR REPLACE FUNCTION town.chore_for(p_purse jsonb, p_where text, p_well integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
begin
  if hand is null then return null; end if;
  if f->'buckets' ? hand then
    if p_where = 'river' and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) = 0) then return 'draw'; end if;
    if p_where = 'well' and p_well < (f->>'well')::int
       and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) <> 0) then return 'pour'; end if;
  end if;
  if p_where = 'well' and f->'cans' ? hand
     and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric) then return 'fill'; end if;
  return null;
end;
$function$;

-- town.claims(p_doc jsonb)
CREATE OR REPLACE FUNCTION town.claims(p_doc jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$ select case when p_doc is not null and jsonb_typeof(p_doc) = 'object' and pg_column_size(p_doc) <= 24000 then p_doc else null end $function$;

-- town.collect(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.collect(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cur integer := town.round_of(p_now);
  coins integer;
  kept jsonb;
begin
  select floor(coalesce(sum((l->>'n')::int * (l->>'pays')::int * coalesce((l->>'f')::int, 100)) filter (where (l->>'round')::int < cur), 0) / 100.0)::int,
         coalesce(jsonb_agg(l order by ord) filter (where (l->>'round')::int >= cur), '[]'::jsonb)
    into coins, kept
    from jsonb_array_elements(p_purse->'left') with ordinality x(l, ord);
  if coins = 0 then return town.no('nothing'); end if;
  return jsonb_build_object('ok', true, 'coins', coins,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::int + coins, 'left', kept));
end;
$function$;

-- town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision, p_cat jsonb, p_word text)
CREATE OR REPLACE FUNCTION town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  whence jsonb := ins->'haunts'->p_haunt;
  at_ bigint := p_now + (ins->'comeback'->>'after')::bigint * 1000;
  least_ bigint := (ins->'comeback'->>'least')::bigint * 1000;
  ids jsonb := ins->'order';
  backs jsonb := coalesce(p_backs, '[]'::jsonb);
  free integer[] := '{}';
  turns bigint[] := '{}';
  begins bigint[] := '{}';
  h jsonb;
  kind jsonb;
  bug jsonb;
  every bigint;
  phase bigint;
  turn bigint;
  began bigint;
  some_ boolean;
  n integer;
  nth integer;
  i integer;
  j integer;
  total double precision := 0;
  left_ double precision;
  pick text := null;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    every := (kind->>'every')::bigint * 60000;
    phase := floor(town.roll('bugphase', i) * (kind->>'every')::double precision)::bigint * 60000;
    turn := floor((at_ + phase)::numeric / every)::bigint;
    began := turn * every - phase;
    continue when began + every - at_ < least_;
    continue when town.bug_at(i, at_, ins, word) is not null;
    continue when exists (select 1 from jsonb_array_elements(backs) x where (x->>'haunt')::int = i and (x->>'turn')::bigint = turn);
    some_ := false;
    for j in 0..jsonb_array_length(ids) - 1 loop
      bug := ins->'bugs'->(ids->>j);
      if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, began, word) then some_ := true; exit; end if;
    end loop;
    continue when not some_;
    free := free || i;
    turns := turns || turn;
    begins := begins || began;
  end loop;
  n := coalesce(array_length(free, 1), 0);
  if n = 0 then return null; end if;
  nth := least(n - 1, greatest(0, floor(coalesce(p_r1, 0) * n)::int)) + 1;
  i := free[nth];
  h := ins->'haunts'->i;
  -- the insect: by that haunt's own weights, as its own turn would roll it
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * total;
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then
      pick := ids->>j;
      left_ := left_ - (bug->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  -- hunted, it is back less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is at the catch. Nothing takes its place.
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, p_now, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('haunt', i, 'turn', turns[nth], 'bug', pick,
    'n', lo + least(hi - lo, greatest(0, floor(coalesce(p_r3, 0) * (hi - lo + 1))::int)), 'from', at_);
end;
$function$;

-- town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb := town.tidy(p_things);
  kinds integer := jsonb_array_length(alls);
  crew_n integer := jsonb_array_length(p_crew);
  x jsonb;
  made text;
  t jsonb;
  short boolean;
  dish text;
  bag jsonb := p_purse->'bag';
  pot integer;
  spent jsonb;
  near jsonb;
  left_ integer;
  n integer;
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null or ck->'never' ? (items->(x->>0)->>'kind')
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  made := town.made_of(alls);
  if made is not null then
    t := town.takes(made);
    short := crew_n < (t->>'cooks')::int;
    if short or not town.in_hands(t->'in', p_crew) then
      -- somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if coalesce(p_purse->'made', '[]'::jsonb) ? made then
        return town.no(case when short or crew_n > 1 or jsonb_array_length(t->'in') > 1 then 'crew' else 'tool' end);
      end if;
      made := null;
    end if;
  end if;
  -- what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  dish := case when made is not null then (case when town.cat('dishes') ? made then made end)
               when jsonb_typeof(p_crew->0) = 'string' and ck->'cookware' ? (p_crew->>0) then ck->>'oddDish' end;
  for x in select v from jsonb_array_elements(alls) e(v) loop bag := town.take(bag, x->>0, (x->>1)::int); end loop;
  -- (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  if dish is not null then
    select (s.ord - 1)::int into pot from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
    if pot is null then return town.no('full'); end if;
  end if;
  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);
  -- what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  if made is null then
    near := town.taste_of(alls, p_crew);
    if near->>'of' is not null and near->>'lacks' is not null and near->>'taste' in ('swap', 'less')
       and near->>'lacks' = (town.needs_of(near->>'of')->-1)->>0 then
      spent := spent || jsonb_build_object('tries', coalesce(spent->'tries', '{}'::jsonb)
        || jsonb_build_object(near->>'of', coalesce((spent->'tries'->>(near->>'of'))::int, 0) + 1));
    end if;
  end if;
  if dish is not null then
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_)))))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  if town.room(bag, made) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put(bag, made, n)));
end;
$function$;

-- town.cook_hands(p_crew jsonb)
CREATE OR REPLACE FUNCTION town.cook_hands(p_crew jsonb)
 RETURNS text[]
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(array_agg(h.v #>> '{}'), '{}')
    from jsonb_array_elements(p_crew) h(v), (select town.cat('cooking')->'cookware' as ware) c
   where jsonb_typeof(h.v) = 'string' and c.ware ? (h.v #>> '{}')
$function$;

-- town.cost_of(p_purse jsonb, p_n double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.cost_of(p_purse jsonb, p_n double precision, p_now bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select floor(p_n * (1::double precision - town.buff_by(p_purse, p_now, 'hearty')) + 0.5::double precision)::integer
$function$;

-- town.cure(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.cure(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if coalesce(town.tool_of(p_hand), '') <> 'cure' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb or not (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
  -- (a cure that keeps pests off afterwards, `farming.cures`: the plant is covered for so many hours from this
  -- moment, as by a cover; another only rids it)
  return jsonb_build_object('ok', true, 'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)
      || case when coalesce((f->'cures'->>p_hand)::bigint, 0) > 0 then jsonb_build_object('guard', p_now + (f->'cures'->>p_hand)::bigint * 3600000) else '{}'::jsonb end),
    'purse', town.spend(p_purse, (f->'costs'->>'cure')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$function$;

-- town.dawned(p_f jsonb, p_now bigint, p_supply double precision, p_k jsonb)
CREATE OR REPLACE FUNCTION town.dawned(p_f jsonb, p_now bigint, p_supply double precision, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when (p_f->>'day')::int = town.day_of(p_now) then p_f
    else p_f || jsonb_build_object('day', town.day_of(p_now), 'first', town.first_goal(p_supply, p_k), 'given', 0) end
$function$;

-- town.day_of(p_now bigint)
CREATE OR REPLACE FUNCTION town.day_of(p_now bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$ select ((p_now + 7 * 3600000::bigint - (town.cat('rules')->>'dawn')::int * 3600000::bigint) / 86400000)::integer $function$;

-- town.deal_told(p_id bigint, p_me uuid)
CREATE OR REPLACE FUNCTION town.deal_told(p_id bigint, p_me uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select d.doc || jsonb_build_object('id', d.id, 'mine', town.side_of(d.doc, p_me::text), 'end', d.ended)
    from public.town_deals d where d.id = p_id and (d.a = p_me or d.b = p_me)
$function$;

-- town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
CREATE OR REPLACE FUNCTION town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now
       and (not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null) then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$function$;

-- town.deed_th(p_what text)
CREATE OR REPLACE FUNCTION town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ' else p_what end
$function$;

-- town.ditch(p_purse jsonb, p_bed jsonb, p_x integer, p_y integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.ditch(p_purse jsonb, p_bed jsonb, p_x integer, p_y integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  d jsonb := town.cat('ditch');
  hand text := town.hand_of(p_purse);
  slot integer;
  has integer;
  keys text[];
  k text;
  p jsonb;
  used integer;
  plots jsonb := '{}'::jsonb;
begin
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, has from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  select array_agg(q.key order by q.far, q.y, q.x) into keys
    from (
      select e.key, t.x, t.y, (t.x - p_x) * (t.x - p_x) + (t.y - p_y) * (t.y - p_y) as far
        from jsonb_each(p_bed) e, lateral (select split_part(e.key, ',', 1)::int as x, split_part(e.key, ',', 2)::int as y) t
       where town.deed_for(e.key, e.value, 'can', '', p_now, null) = 'water'
       order by far, t.y, t.x
       limit has * (d->>'plants')::int
    ) q;
  if keys is null then
    return town.no(case when exists (
      select 1 from jsonb_each(p_bed) e, lateral (select town.see(e.key, e.value, p_now) as s) z
       where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (z.s->>'dead')::boolean and (z.s->>'wet')::boolean) then 'wet' else 'soil' end);
  end if;
  used := ceil(array_length(keys, 1)::numeric / (d->>'plants')::numeric)::int;
  foreach k in array keys loop
    p := p_bed->k->'plant';
    plots := plots || jsonb_build_object(k, (p_bed->k) || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + (f->'water'->>'adds')::double precision * 60000::double precision)));
  end loop;
  return jsonb_build_object('ok', true, 'used', used, 'watered', to_jsonb(keys), 'plots', plots,
    'purse', town.spend(p_purse, (d->>'cost')::double precision * used, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
           case when has > used then jsonb_build_object('item', hand, 'n', 1, 'water', has - used) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$function$;

-- town.eased(p_before jsonb, p_after jsonb, p_now bigint, p_part double precision, p_owed double precision)
CREATE OR REPLACE FUNCTION town.eased(p_before jsonb, p_after jsonb, p_now bigint, p_part double precision, p_owed double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cost double precision := greatest(0::double precision, town.stamina_of(p_before, p_now) - town.stamina_of(p_after, p_now));
  due double precision := cost * least(1::double precision, greatest(0::double precision, p_part)) + case when p_owed > 0 and p_owed < 1 then p_owed else 0 end;
  pay double precision := least(cost, floor(due + 1e-9));
begin
  return jsonb_build_object(
    'purse', case when pay < cost then p_after || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now), 'left', town.stamina_of(p_after, p_now) + (cost - pay))) else p_after end,
    'owed', greatest(0::double precision, due - pay));
end;
$function$;

-- town.eaten_today(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.eaten_today(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$ select case when (p_purse->'meals'->>'day')::int = town.day_of(p_now) then p_purse->'meals'->'eaten' else '[false, false, false]'::jsonb end $function$;

-- town.factor_of(p_market jsonb, p_item text)
CREATE OR REPLACE FUNCTION town.factor_of(p_market jsonb, p_item text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$ select coalesce((p_market->'at'->p_item->>'f')::int, 100) $function$;

-- town.familiar_wear(p_purse jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.familiar_wear(p_purse jsonb, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  g jsonb := town.cat('gifts');
  mine jsonb := town.gifts_of(p_purse);
begin
  if p_id is not null and (not (mine->'had' ? p_id) or g->'gifts'->p_id->>'kind' is distinct from 'familiar') then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('familiar', p_id)));
end;
$function$;

-- town.farm_bugs(p_now bigint)
CREATE OR REPLACE FUNCTION town.farm_bugs(p_now bigint)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(p_now);
  rids jsonb := coalesce(town.cat('farming')->'rids', '{}'::jsonb);
  has jsonb;
  taken integer;
  n integer := 0;
  i integer;
begin
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    continue when ins->'haunts'->i->>1 <> 'farm';
    has := town.bug_here(i, p_now, backs, ins, word);
    continue when has is null or rids ? (has->>'bug');
    select count(*)::int into taken from public.town_takes tk where tk.what = 'haunt' and tk.place = i and tk.turn = (has->>'turn')::bigint;
    continue when taken >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int;
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- town.feed(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.feed(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if kind not in ('feed', 'guard') or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean
     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed). But an insect that eats pests (`farming.rids`: how often) is let
  -- go on it: so often it eats the pest, and the plant is rid of it as a cure rids it and covered by nothing; the
  -- other times it is off, and the plant is as it was. Either way the insect and the stamina are gone. Which, by a
  -- number made of the plot, its plant and this very moment (lib/town/farm.ts's ridLuck).
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then
    if f->'rids'->>p_hand is null then return town.no('soil'); end if;
    return jsonb_build_object('ok', true,
      'plot', case when town.roll('rid|' || p_key, p_now, (p->>'sown')::bigint) < (f->'rids'->>p_hand)::double precision
                then p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)) else p_plot end,
      'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
  end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || case when kind = 'feed' then jsonb_build_object('fed', p_now)
      else jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000) end),
    'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$function$;

-- town.first_goal(p_supply double precision, p_k jsonb)
CREATE OR REPLACE FUNCTION town.first_goal(p_supply double precision, p_k jsonb)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select greatest((p_k->>'least')::double precision,
    floor((p_k->>'share')::double precision * greatest(0::double precision, p_supply) + 0.5::double precision))
$function$;

-- town.fountain_told(p_me uuid)
CREATE OR REPLACE FUNCTION town.fountain_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'goal', town.goal_of(t.f, t.k), 'pot', t.f->'pot', 'by', t.f->'by', 'given', t.f->'given', 'rounds', t.k->'rounds',
    'who', coalesce((select jsonb_agg(coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id::text = w.id), '') order by w.ord)
                       from jsonb_array_elements_text(t.f->'who') with ordinality w(id, ord)), '[]'::jsonb),
    'mine', t.f->'who' ? p_me::text,
    'blessings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.v->>'id', 'from', (b.v->>'from')::bigint, 'until', (b.v->>'until')::bigint,
        'by', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id::text = b.v->>'by'), ''),
        'people', jsonb_array_length(b.v->'of'), 'mine', b.v->'of' ? p_me::text) order by b.ord)
      from jsonb_array_elements(t.f->'blessings') with ordinality b(v, ord) where (b.v->>'until')::bigint > t.now_), '[]'::jsonb),
    'hours', t.k->'hours', 'people', t.k->'people', 'within', t.k->'within', 'counts', t.k->'counts',
    -- what can be wished for, in its order: a page offers these and no others
    'wishes', to_jsonb(town.wishes()),
    -- the wishes in their writers' words: the newest twelve of today and yesterday that are not hidden (my own is
    -- told to me hidden or not, and that it is), and whether whoever asks may hide one
    'notes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'by', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = n.member_id), ''),
        'wish', n.wish, 'note', n.note, 'cheers', cardinality(n.cheers), 'mine', n.member_id = p_me, 'cheered', p_me = any (n.cheers),
        'reported', p_me = any (n.reports), 'hidden', n.hidden, 'at', floor(extract(epoch from n.at) * 1000)::bigint) order by n.at desc, n.id desc)
      from (select w.* from public.town_wish_notes w
             where (not w.hidden or w.member_id = p_me or public.is_admin()) and w.day >= town.day_of(t.now_) - 1
             order by w.at desc, w.id desc limit 12) n), '[]'::jsonb),
    'admin', public.is_admin())
    from (select town.dawned(town.thing('fountain', false), n.now_, (select coalesce(sum(p.coins), 0) from public.town_purses p)::double precision, k.k) as f, k.k, n.now_
            from (select town.wishing() as k) k, (select town.now_ms() as now_) n) t
$function$;

-- town.fresh()
CREATE OR REPLACE FUNCTION town.fresh()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'bag', (select jsonb_agg('null'::jsonb) from generate_series(1, (town.cat('rules')->>'slots')::int)),
    'bought', '{"round": 0, "n": {}}'::jsonb, 'left', '[]'::jsonb,
    'stamina', '{"day": -1, "left": 0}'::jsonb, 'meals', '{"day": -1, "eaten": [false, false, false]}'::jsonb,
    'eating', 'null'::jsonb, 'buff', 'null'::jsonb, 'best', '{}'::jsonb, 'recipes', '[]'::jsonb)
$function$;

-- town.full_moon(p_at bigint)
CREATE OR REPLACE FUNCTION town.full_moon(p_at bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select 'full' = any(town.signs_of(p_at, false, 0, 0::bigint, false)) $function$;

-- town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint)
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
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > (f->>'reach')::int then return town.no('far'); end if;
  if kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int);
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$function$;

-- town.get_up(p_purse jsonb, p_company double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.get_up(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  counted jsonb;
  up jsonb;
begin
  if coalesce(p_purse->'eating', 'null'::jsonb) = 'null'::jsonb then return p_purse; end if;
  counted := town.chew(p_purse, p_company, p_now)->'purse';
  up := counted || jsonb_build_object('eating', 'null'::jsonb,
    'buff', case when counted->'eating' <> 'null'::jsonb then coalesce(p_purse->'buff', 'null'::jsonb) else counted->'buff' end);
  -- (a meal that ran out as it was counted gave its bowl back already)
  if counted->'eating' <> 'null'::jsonb and town.cat('cooking')->'bowled' ? (p_purse->'eating'->>'dish') then return town.bowls_back(up, 1); end if;
  return up;
end;
$function$;

-- town.gift_take(p_purse jsonb, p_points jsonb, p_line text, p_rank integer)
CREATE OR REPLACE FUNCTION town.gift_take(p_purse jsonb, p_points jsonb, p_line text, p_rank integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  g jsonb := town.cat('gifts');
  id text := (select e.key from jsonb_each(g->'gifts') e where e.value->>'line' = p_line and (e.value->>'rank')::integer = p_rank order by e.key limit 1);
  mine jsonb;
begin
  if id is null then return town.no('none'); end if;
  if town.work_rank(p_line, coalesce((p_points->>p_line)::double precision, 0)) < p_rank then return town.no('rank'); end if;
  mine := town.gifts_of(p_purse);
  if mine->'had' ? id then return town.no('had'); end if;
  return jsonb_build_object('ok', true, 'gift', id, 'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('had', mine->'had' || to_jsonb(id))));
end;
$function$;

-- town.gift_use(p_purse jsonb, p_id text, p_now bigint)
CREATE OR REPLACE FUNCTION town.gift_use(p_purse jsonb, p_id text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  mine jsonb;
  n integer;
begin
  if rule is null or not town.gift_works(p_purse, p_id) then return town.no('none'); end if;
  n := town.used_of(p_purse, p_id, p_now);
  if n >= (rule->>'n')::integer then return town.no('spent'); end if;
  mine := town.gifts_of(p_purse);
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - n - 1,
    'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('used',
      (mine->'used') || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_of(rule->>'per', p_now), 'n', n + 1)))));
end;
$function$;

-- town.gift_works(p_purse jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.gift_works(p_purse jsonb, p_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(m.g->'had' ? p_id and case town.cat('gifts')->'gifts'->p_id->>'kind'
      when 'charm' then m.g->'charms' ? p_id when 'familiar' then m.g->>'familiar' = p_id else true end, false)
    from (select town.gifts_of(p_purse) as g) m
$function$;

-- town.gifts_of(p_purse jsonb)
CREATE OR REPLACE FUNCTION town.gifts_of(p_purse jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  g jsonb := town.cat('gifts');
  kept jsonb := p_purse->'gifts';
  had jsonb := '[]'::jsonb;
  charms jsonb := '[]'::jsonb;
  x jsonb;
  owed double precision := 0;
  fam text;
begin
  if jsonb_typeof(kept->'had') = 'array' then
    for x in select t.e from jsonb_array_elements(kept->'had') with ordinality as t(e, ord) order by t.ord loop
      if jsonb_typeof(x) = 'string' and g->'gifts' ? (x #>> '{}') and not (had ? (x #>> '{}')) then had := had || x; end if;
    end loop;
  end if;
  if jsonb_typeof(kept->'charms') = 'array' then
    for x in select t.e from jsonb_array_elements(kept->'charms') with ordinality as t(e, ord) order by t.ord loop
      if jsonb_array_length(charms) < (g->>'slots')::integer and jsonb_typeof(x) = 'string' and had ? (x #>> '{}')
         and g->'gifts'->(x #>> '{}')->>'kind' = 'charm' and not (charms ? (x #>> '{}')) then charms := charms || x; end if;
    end loop;
  end if;
  if jsonb_typeof(kept->'owed') = 'number' and (kept->>'owed')::double precision > 0 and (kept->>'owed')::double precision < 1 then owed := (kept->>'owed')::double precision; end if;
  if jsonb_typeof(kept->'familiar') = 'string' and had ? (kept->>'familiar') and g->'gifts'->(kept->>'familiar')->>'kind' = 'familiar' then fam := kept->>'familiar'; end if;
  return jsonb_build_object('had', had, 'charms', charms, 'owed', owed, 'familiar', fam,
    'used', case when jsonb_typeof(kept->'used') = 'object' then kept->'used' else '{}'::jsonb end);
end;
$function$;

-- town.give(p_purse jsonb, p_village jsonb, p_slot integer, p_n integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.give(p_purse jsonb, p_village jsonb, p_slot integer, p_n integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  ord_ jsonb;
  want jsonb;
  given integer;
  coins integer;
  got jsonb;
  filled boolean;
  opened jsonb;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  ord_ := town.order_of(p_village, p_now);
  select w into want from jsonb_array_elements(ord_->'wants') w where w->>'item' = s->>'item';
  if want is null or (want->>'got')::int >= (want->>'n')::int then return town.no('unwanted'); end if;
  given := least(p_n, (s->>'n')::int, (want->>'n')::int - (want->>'got')::int);
  coins := given * (town.cat('items')->(s->>'item')->>'pays')::int;
  got := (case when (p_village->>'day')::int = (ord_->>'day')::int then p_village->'got' else '{}'::jsonb end)
    || jsonb_build_object(s->>'item', (want->>'got')::int + given);
  filled := not exists (select 1 from jsonb_array_elements(ord_->'wants') w
    where (case when w->>'item' = s->>'item' then (want->>'got')::int + given else (w->>'got')::int end) < (w->>'n')::int);
  opened := case when filled and ord_->'opens' <> 'null'::jsonb then ord_->'opens' else 'null'::jsonb end;
  return jsonb_build_object('ok', true, 'given', given, 'coins', coins, 'opened', opened,
    'purse', p_purse || jsonb_build_object(
      'coins', (p_purse->>'coins')::int + coins,
      'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
        case when (s->>'n')::int = given then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - given) end)),
    'village', jsonb_build_object(
      'unlocked', (p_village->>'unlocked')::int + case when opened <> 'null'::jsonb then 1 else 0 end,
      'day', (ord_->>'day')::int, 'got', got,
      'opened', case when opened <> 'null'::jsonb then (ord_->>'day')::int else (p_village->>'opened')::int end));
end;
$function$;

-- town.gloved(p_before jsonb, p_after jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.gloved(p_before jsonb, p_after jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  mine jsonb;
  did jsonb;
begin
  if not town.wearing(p_before, 'charmGloves') then return p_after; end if;
  mine := town.gifts_of(p_after);
  did := town.eased(p_before, p_after, p_now, (town.cat('gifts')->'gifts'->'charmGloves'->>'by')::double precision, (mine->>'owed')::double precision);
  return (did->'purse') || jsonb_build_object('gifts', mine || jsonb_build_object('owed', did->'owed'));
end;
$function$;

-- town.goal_of(p_f jsonb, p_k jsonb)
CREATE OR REPLACE FUNCTION town.goal_of(p_f jsonb, p_k jsonb)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when (p_f->>'given')::int >= (p_k->>'rounds')::int then null
    else (p_f->>'first')::double precision * power((p_k->>'more')::double precision, (p_f->>'given')::int) end
$function$;

-- town.ground_drop(p_purse jsonb, p_slot integer, p_by text, p_x integer, p_y integer, p_now bigint, p_id bigint)
CREATE OR REPLACE FUNCTION town.ground_drop(p_purse jsonb, p_slot integer, p_by text, p_x integer, p_y integer, p_now bigint, p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot >= 0 then p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if not town.on_ground(p_x, p_y) then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)),
    'dropped', jsonb_build_object('id', p_id, 'by', p_by, 'stack', s, 'at', jsonb_build_array(p_x, p_y),
      'until', p_now + (town.cat('ground')->>'lasts')::bigint * 1000));
end;
$function$;

-- town.ground_now(p_now bigint)
CREATE OR REPLACE FUNCTION town.ground_now(p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'by', g.member_id, 'stack', g.stack, 'at', jsonb_build_array(g.x, g.y), 'until', g.until_ms) order by g.id), '[]'::jsonb)
    from public.town_ground g where g.until_ms > p_now
$function$;

-- town.ground_pick(p_purse jsonb, p_dropped jsonb, p_x integer, p_y integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.ground_pick(p_purse jsonb, p_dropped jsonb, p_x integer, p_y integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bag jsonb;
begin
  if p_dropped is null or p_dropped = 'null'::jsonb or (p_dropped->>'until')::bigint <= p_now then return town.no('lost'); end if;
  if p_x is null or p_y is null
     or greatest(abs(p_x - (p_dropped->'at'->>0)::int), abs(p_y - (p_dropped->'at'->>1)::int)) > (town.cat('ground')->>'reach')::int then
    return town.no('far');
  end if;
  -- (as the stack it is, so that what it holds comes with it: v112's push)
  bag := town.push(p_purse->'bag', jsonb_build_array(p_dropped->'stack'));
  if bag is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag),
    'item', p_dropped->'stack'->>'item', 'n', (p_dropped->'stack'->>'n')::int);
end;
$function$;

-- town.growing(p_plant jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.growing(p_plant jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select town.growth(p_plant->>'crop', town.grown(p_plant, p_now), (p_plant->>'picked')::int,
    (p_now - (p_plant->>'pickedAt')::bigint)::double precision / 3600000::double precision)
$function$;

-- town.grown(p_plant jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.grown(p_plant jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + town.wet_ms(p.sown, p_now)::double precision * (w.f->>'adds')::double precision / (w.f->>'every')::double precision) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$function$;

-- town.growth(p_crop text, p_hours double precision, p_picked integer, p_since double precision)
CREATE OR REPLACE FUNCTION town.growth(p_crop text, p_hours double precision, p_picked integer, p_since double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  c jsonb := town.cat('crops')->p_crop;
  st jsonb := town.cat('farming')->'stages';
  part double precision;
begin
  if p_picked >= (c->>'picks')::int then return '{"stage": 5, "ripe": false, "spent": true}'::jsonb; end if;
  if p_picked > 0 then
    if c->>'again' is not null and p_since >= (c->>'again')::double precision then return '{"stage": 5, "ripe": true, "spent": false}'::jsonb; end if;
    return '{"stage": 4, "ripe": false, "spent": false}'::jsonb;
  end if;
  if p_hours >= (c->>'hours')::double precision then return '{"stage": 5, "ripe": true, "spent": false}'::jsonb; end if;
  part := greatest(0::double precision, p_hours) / (c->>'hours')::double precision;
  return jsonb_build_object('ripe', false, 'spent', false, 'stage',
    case when part < (st->>1)::double precision then 1 when part < (st->>2)::double precision then 2 when part < (st->>3)::double precision then 3 else 4 end);
end;
$function$;

-- town.hand_of(p_purse jsonb)
CREATE OR REPLACE FUNCTION town.hand_of(p_purse jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$ select case when town.held(p_purse->'bag', p_purse->>'hand') > 0 then p_purse->>'hand' end $function$;

-- town.has_all(p_purse jsonb, p_give jsonb)
CREATE OR REPLACE FUNCTION town.has_all(p_purse jsonb, p_give jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select not exists (select 1 from jsonb_array_elements(town.tidy_give(p_give)) g(v) where town.held(p_purse->'bag', g.v->>0) < (g.v->>1)::numeric)
$function$;

-- town.has_buff(p_purse jsonb, p_now bigint, p_id text)
CREATE OR REPLACE FUNCTION town.has_buff(p_purse jsonb, p_now bigint, p_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select town.level_of(p_purse, p_now, p_id) > 0
$function$;

-- town.hastened(p_line jsonb, p_by double precision)
CREATE OR REPLACE FUNCTION town.hastened(p_line jsonb, p_by double precision)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select p_line || jsonb_build_object(
    'wait', greatest(1, ceil((p_line->>'wait')::double precision * (1 - p_by)))::int,
    'nibbles', (select coalesce(jsonb_agg((n.x #>> '{}')::double precision * (1 - p_by) order by n.ord), '[]'::jsonb)
                  from jsonb_array_elements(p_line->'nibbles') with ordinality n(x, ord)))
$function$;

-- town.held(p_bag jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.held(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$ select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s where s->>'item' = p_id $function$;

-- town.helped(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.helped(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$ select p_purse || jsonb_build_object('meals', coalesce(p_purse->'meals', '{}'::jsonb) || jsonb_build_object('bowls', town.bowls_today(p_purse, p_now))) $function$;

-- town.helpers_of(p_x integer, p_y integer, p_me uuid)
CREATE OR REPLACE FUNCTION town.helpers_of(p_x integer, p_y integer, p_me uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', h.helper, 'water', h.water, 'carry', h.carry) order by h.water + h.carry desc, h.helper::text collate "C"), '[]'::jsonb)
    from public.town_plot_help h
   where h.x = p_x and h.y = p_y and h.owner = p_me and h.helper <> p_me
$function$;

-- town.helpings(p_dish text, p_crew jsonb, p_misses double precision, p_bag jsonb)
CREATE OR REPLACE FUNCTION town.helpings(p_dish text, p_crew jsonb, p_misses double precision, p_bag jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ck jsonb := town.cat('cooking');
  best double precision;
  whole double precision;
begin
  select greatest(1::double precision, coalesce(max(coalesce((ck->'gear'->>(h.v #>> '{}'))::double precision, 1::double precision)), 1::double precision)) into best
    from jsonb_array_elements(p_crew) h(v) where jsonb_typeof(h.v) = 'string';
  if exists (select 1 from jsonb_array_elements(p_bag) s where s->>'item' = 'stoveBig') then
    best := greatest(best, coalesce((ck->'gear'->>'stoveBig')::double precision, 1::double precision));
  end if;
  whole := (town.cat('dishes')->p_dish->'recipe'->>'serves')::double precision * best
    + case when exists (select 1 from jsonb_array_elements(p_bag) s where s->>'item' = 'ladle') then (ck->>'ladle')::double precision else 0::double precision end;
  return greatest(ceil(whole / 2::double precision), floor(whole + 0.5::double precision) - greatest(0::double precision, floor(p_misses)))::integer;
end;
$function$;

-- town.hoe(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.hoe(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
begin
  if coalesce(town.tool_of(p_hand), '') <> 'hoe' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  if p_plot->>'soil' = 'wild' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'clear')::double precision, p_now));
  end if;
  if p_plot->>'soil' = 'cleared' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "tilled", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'till')::double precision, p_now));
  end if;
  return town.no('soil');
end;
$function$;

-- town.hold(p_purse jsonb, p_slot integer)
CREATE OR REPLACE FUNCTION town.hold(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item'));
end;
$function$;

-- town.holds_all(p_tools jsonb, p_hands text[])
CREATE OR REPLACE FUNCTION town.holds_all(p_tools jsonb, p_hands text[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select not exists (
    select 1 from (select t.v as tool, count(*) as n from jsonb_array_elements_text(p_tools) t(v) group by t.v) need
     where need.n > (select count(*) from unnest(p_hands) h(v) where h.v = need.tool))
$function$;

-- town.hook_bait(p_purse jsonb, p_bait text)
CREATE OR REPLACE FUNCTION town.hook_bait(p_purse jsonb, p_bait text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cat jsonb := town.cat('fishing');
begin
  if not exists (select 1 from jsonb_array_elements_text(cat->'rods') r where town.held(p_purse->'bag', r) > 0) then return town.no('tool'); end if;
  if not cat->'baits' ? p_bait or town.held(p_purse->'bag', p_bait) = 0 then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse',
    case when cat->'kept' ? p_bait then p_purse else p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, 1)) end);
end;
$function$;

-- town.hot(p_now bigint)
CREATE OR REPLACE FUNCTION town.hot(p_now bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.town_weather w, (select town.cat('heat') as k) h
     where w.slot = floor(p_now::numeric / 900000)::bigint and h.k->'skies' ? w.sky
       and town.hour_at(p_now) >= (h.k->>'from')::double precision and town.hour_at(p_now) < (h.k->>'to')::double precision)
$function$;

-- town.hour_at(p_at bigint)
CREATE OR REPLACE FUNCTION town.hour_at(p_at bigint)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$ select ((((p_at + 25200000) % 86400000) + 86400000) % 86400000)::double precision / 3600000::double precision $function$;

-- town.in_hands(p_tools jsonb, p_crew jsonb)
CREATE OR REPLACE FUNCTION town.in_hands(p_tools jsonb, p_crew jsonb)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select town.holds_all(p_tools, town.cook_hands(p_crew)) $function$;

-- town.is_member(p_who uuid)
CREATE OR REPLACE FUNCTION town.is_member(p_who uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p
                  where p.id = p_who and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin))
$function$;

-- town.jar_add(p_things jsonb, p_id text, p_n integer)
CREATE OR REPLACE FUNCTION town.jar_add(p_things jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when exists (select 1 from jsonb_array_elements(p_things) e where e->>0 = p_id)
    then (select jsonb_agg(case when e.one->>0 = p_id then jsonb_build_array(p_id, (e.one->>1)::integer + p_n) else e.one end order by e.at)
            from jsonb_array_elements(p_things) with ordinality as e(one, at))
    else p_things || jsonb_build_array(jsonb_build_array(p_id, p_n)) end
$function$;

-- town.jar_collect(p_purse jsonb, p_mine jsonb)
CREATE OR REPLACE FUNCTION town.jar_collect(p_purse jsonb, p_mine jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bag jsonb := p_purse->'bag';
  v_coins integer := coalesce((p_mine->>'coins')::integer, 0);
  v_took jsonb := '[]'::jsonb;
  v_rest jsonb := '[]'::jsonb;
  thing jsonb;
  v_fits integer;
begin
  if p_mine is null or p_mine = 'null'::jsonb or (v_coins = 0 and jsonb_array_length(p_mine->'things') = 0) then return town.no('nothing'); end if;
  for thing in select * from jsonb_array_elements(p_mine->'things') loop
    v_fits := least((thing->>1)::integer, town.room(bag, thing->>0));
    if v_fits > 0 then
      bag := town.put(bag, thing->>0, v_fits);
      v_took := v_took || jsonb_build_array(jsonb_build_array(thing->>0, v_fits));
    end if;
    if v_fits < (thing->>1)::integer then v_rest := v_rest || jsonb_build_array(jsonb_build_array(thing->>0, (thing->>1)::integer - v_fits)); end if;
  end loop;
  if v_coins = 0 and jsonb_array_length(v_took) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', v_coins, 'things', v_took,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer + v_coins, 'bag', bag),
    'mine', case when jsonb_array_length(v_rest) > 0 then jsonb_build_object('coins', 0, 'things', v_rest) end);
end;
$function$;

-- town.jar_drop(p_purse jsonb, p_jar jsonb, p_what jsonb)
CREATE OR REPLACE FUNCTION town.jar_drop(p_purse jsonb, p_jar jsonb, p_what jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  v_coins numeric;
  v_slot integer;
  v_n numeric;
  s jsonb;
begin
  if p_what ? 'coins' then
    v_coins := (p_what->>'coins')::numeric;
    if v_coins is null or v_coins <> floor(v_coins) or v_coins <= 0 then return town.no('amount'); end if;
    if v_coins > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
    return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer - v_coins::integer),
      'jar', p_jar || jsonb_build_object('coins', (p_jar->>'coins')::integer + v_coins::integer));
  end if;
  v_slot := (p_what->>'slot')::integer;
  v_n := (p_what->>'n')::numeric;
  s := case when v_slot >= 0 then p_purse->'bag'->v_slot end;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;
  if v_n is null or v_n <> floor(v_n) or v_n <= 0 or v_n > (s->>'n')::numeric then return town.no('amount'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[v_slot::text],
      case when (s->>'n')::integer = v_n::integer then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::integer - v_n::integer) end)),
    'jar', p_jar || jsonb_build_object('things', town.jar_add(p_jar->'things', s->>'item', v_n::integer)));
end;
$function$;

-- town.jar_now(p_now bigint)
CREATE OR REPLACE FUNCTION town.jar_now(p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_round integer := town.round_of(p_now);
  jar jsonb;
  work jsonb;
  did jsonb;
  s record;
begin
  insert into public.town_jar (round) values (v_round) on conflict (one) do nothing;
  select jsonb_build_object('round', j.round, 'coins', j.coins, 'things', j.things) into jar from public.town_jar j for update;
  if v_round <= (jar->>'round')::integer then return jar; end if;
  work := town.jar_work((jar->>'round')::integer, v_round);
  did := town.jar_settle(jar, (select coalesce(jsonb_object_agg(o.member_id::text, jsonb_build_object('coins', o.coins, 'things', o.things)), '{}'::jsonb)
                                 from public.town_jar_owed o where o.member_id::text in (select w->>0 from jsonb_array_elements(work) w)), work, v_round);
  if (did->>'shared')::boolean then
    for s in select e.key as who, e.value as mine from jsonb_each(did->'owed') e loop
      insert into public.town_jar_owed (member_id, coins, things) values (s.who::uuid, (s.mine->>'coins')::integer, s.mine->'things')
        on conflict (member_id) do update set coins = excluded.coins, things = excluded.things;
    end loop;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (null, to_timestamp(p_now / 1000.0), (jar->>'round')::integer, 'share', (jar->>'coins')::integer, jsonb_build_object('things', jar->'things', 'work', work));
  end if;
  jar := did->'jar';
  update public.town_jar j set round = (jar->>'round')::integer, coins = (jar->>'coins')::integer, things = jar->'things' where j.one;
  return jar;
end;
$function$;

-- town.jar_settle(p_jar jsonb, p_owed jsonb, p_work jsonb, p_round integer)
CREATE OR REPLACE FUNCTION town.jar_settle(p_jar jsonb, p_owed jsonb, p_work jsonb, p_round integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_owed jsonb := coalesce(p_owed, '{}'::jsonb);
  s jsonb;
  thing jsonb;
  mine jsonb;
begin
  if jsonb_array_length(p_work) = 0 or ((p_jar->>'coins')::integer = 0 and jsonb_array_length(p_jar->'things') = 0) then
    return jsonb_build_object('jar', p_jar || jsonb_build_object('round', p_round), 'owed', v_owed, 'shared', false);
  end if;
  for s in select * from jsonb_array_elements(town.jar_shares((p_jar->>'coins')::integer, p_work)) loop
    mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
    v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('coins', (mine->>'coins')::integer + (s->>1)::integer));
  end loop;
  for thing in select * from jsonb_array_elements(p_jar->'things') loop
    for s in select * from jsonb_array_elements(town.jar_shares((thing->>1)::integer, p_work)) loop
      mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
      v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('things', town.jar_add(mine->'things', thing->>0, (s->>1)::integer)));
    end loop;
  end loop;
  return jsonb_build_object('jar', jsonb_build_object('round', p_round, 'coins', 0, 'things', '[]'::jsonb), 'owed', v_owed, 'shared', true);
end;
$function$;

-- town.jar_shares(p_total integer, p_work jsonb)
CREATE OR REPLACE FUNCTION town.jar_shares(p_total integer, p_work jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_all bigint := (select coalesce(sum((w->>1)::bigint), 0) from jsonb_array_elements(p_work) w);
  v_left integer;
  v_got jsonb;
  g record;
begin
  if coalesce(p_total, 0) <= 0 or v_all <= 0 then return '[]'::jsonb; end if;
  select jsonb_object_agg(w.one->>0, (p_total::bigint * (w.one->>1)::bigint) / v_all) into v_got from jsonb_array_elements(p_work) with ordinality as w(one, at);
  v_left := p_total - (select sum(v::text::integer) from jsonb_each(v_got) e(k, v));
  for g in select w.one->>0 as who from jsonb_array_elements(p_work) w(one)
            order by (p_total::bigint * (w.one->>1)::bigint) % v_all desc, (w.one->>1)::bigint desc, (w.one->>0) collate "C" loop
    exit when v_left <= 0;
    v_got := jsonb_set(v_got, array[g.who], to_jsonb((v_got->>g.who)::integer + 1));
    v_left := v_left - 1;
  end loop;
  return (select coalesce(jsonb_agg(jsonb_build_array(w.one->>0, (v_got->>(w.one->>0))::integer) order by w.at), '[]'::jsonb)
            from jsonb_array_elements(p_work) with ordinality as w(one, at) where (v_got->>(w.one->>0))::integer > 0);
end;
$function$;

-- town.jar_told(p_me uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.jar_told(p_me uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('coins', j.coins, 'things', j.things, 'round', j.round, 'next', town.round_from(town.round_of(p_now) + 1),
           'mine', (select jsonb_build_object('coins', o.coins, 'things', o.things) from public.town_jar_owed o where o.member_id = p_me))
    from public.town_jar j
$function$;

-- town.jar_work(p_from integer, p_to integer)
CREATE OR REPLACE FUNCTION town.jar_work(p_from integer, p_to integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_array(q.member_id, q.w) order by q.id_text), '[]'::jsonb)
    from (
      select d.member_id, d.member_id::text collate "C" as id_text,
             sum(case when d.what in ('pour', 'yard', 'line') then floor(d.n) * (town.cat('jar')->>'bucket')::integer else 1 end)::integer as w
        from public.town_deeds d
       where d.at >= to_timestamp(town.round_from(p_from) / 1000.0) and d.at < to_timestamp(town.round_from(p_to) / 1000.0)
         and d.member_id is not null
         and ((d.what in ('pour', 'yard', 'line') and d.n >= 1) or (d.what = 'water' and d.doc ? 'whose'))
       group by d.member_id
    ) q
   where q.w > 0
$function$;

-- town.keep_box(p_member uuid, p_box jsonb)
CREATE OR REPLACE FUNCTION town.keep_box(p_member uuid, p_box jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.town_boxes (member_id, things, updated_at) values (p_member, p_box->'things', now())
  on conflict (member_id) do update set things = excluded.things, updated_at = now()
$function$;

-- town.keep_purse(p_member uuid, p_purse jsonb)
CREATE OR REPLACE FUNCTION town.keep_purse(p_member uuid, p_purse jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  update public.town_purses
     set coins = (p_purse->>'coins')::int, doc = p_purse - 'coins' - 'popoto' - 'changed', updated_at = now()
   where member_id = p_member
$function$;

-- town.keep_thing(p_key text, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.keep_thing(p_key text, p_doc jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ update public.town_things set doc = p_doc, updated_at = now() where key = p_key $function$;

-- town.ladle(p_purse jsonb, p_pot jsonb)
CREATE OR REPLACE FUNCTION town.ladle(p_purse jsonb, p_pot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bowl text := town.cat('cooking')->>'bowl';
  left_ numeric := (p_pot->>'left')::numeric;
  bag jsonb;
begin
  if left_ < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  bag := town.take(p_purse->'bag', bowl, 1);
  if town.room(bag, p_pot->>'dish') < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true,
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || jsonb_build_object('bag', town.put(bag, p_pot->>'dish', 1)));
end;
$function$;

-- town.land_catch(p_purse jsonb, p_what text, p_size double precision)
CREATE OR REPLACE FUNCTION town.land_catch(p_purse jsonb, p_what text, p_size double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kept boolean := town.room(p_purse->'bag', p_what) > 0;
  fish boolean := town.cat('fish') ? p_what;
  record boolean := fish and p_size > coalesce((p_purse->'best'->>p_what)::double precision, 0);
begin
  return jsonb_build_object('kept', kept, 'record', record, 'purse', p_purse || jsonb_build_object(
    'bag', case when kept then town.put(p_purse->'bag', p_what, 1) else p_purse->'bag' end,
    'best', case when record then (p_purse->'best') || jsonb_build_object(p_what, p_size) else p_purse->'best' end));
end;
$function$;

-- town.lay(p_deal jsonb, p_me text, p_purse jsonb, p_give jsonb, p_coins numeric)
CREATE OR REPLACE FUNCTION town.lay(p_deal jsonb, p_me text, p_purse jsonb, p_give jsonb, p_coins numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  side text := town.side_of(p_deal, p_me);
  mine jsonb := town.tidy_give(p_give);
begin
  if side is null then return town.no('none'); end if;
  if jsonb_array_length(mine) > (town.cat('deals')->>'kinds')::int or p_coins is null or p_coins <> floor(p_coins) or p_coins < 0 then return town.no('amount'); end if;
  if not town.has_all(p_purse, mine) then return town.no('none'); end if;
  if p_coins > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'deal', p_deal || jsonb_build_object(
    'give', coalesce(p_deal->'give', '{}'::jsonb) || jsonb_build_object(side, mine),
    'coins', coalesce(p_deal->'coins', '{}'::jsonb) || jsonb_build_object(side, p_coins),
    'ok', '{"a": false, "b": false}'::jsonb));
end;
$function$;

-- town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer)
CREATE OR REPLACE FUNCTION town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  cur integer := town.round_of(p_now);
  pays integer;
  lots jsonb := p_purse->'left';
  same integer := -1;
  i integer;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb or (s->>'n')::int < p_n then return town.no('none'); end if;
  pays := (town.cat('items')->(s->>'item')->>'pays')::int;
  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;
  for i in 0..jsonb_array_length(lots) - 1 loop
    if lots->i->>'item' = s->>'item' and (lots->i->>'round')::int = cur and (lots->i->>'pays')::int = pays
       and coalesce((lots->i->>'f')::int, 100) = coalesce(p_f, 100) then same := i; exit; end if;
  end loop;
  if same < 0 then
    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur)
      || case when coalesce(p_f, 100) = 100 then '{}'::jsonb else jsonb_build_object('f', p_f) end);
  else
    lots := jsonb_set(lots, array[same::text, 'n'], to_jsonb((lots->same->>'n')::int + p_n));
  end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = p_n then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - p_n) end),
    'left', lots));
end;
$function$;

-- town.level_of(p_purse jsonb, p_now bigint, p_id text)
CREATE OR REPLACE FUNCTION town.level_of(p_purse jsonb, p_now bigint, p_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select greatest(
    coalesce((select (e.b->>'level')::int from jsonb_array_elements(town.meal_buffs(p_purse, p_now)) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1), 0),
    case when exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_purse->'blessed') = 'array' then p_purse->'blessed' else '[]'::jsonb end) b
                       where b->>'id' = p_id and (b->>'until')::bigint > p_now) then 1 else 0 end)
$function$;

-- town.line_counted(p_member uuid, p_thing text, p_n integer, p_at bigint, p_into text)
CREATE OR REPLACE FUNCTION town.line_counted(p_member uuid, p_thing text, p_n integer, p_at bigint, p_into text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.town_deeds (member_id, at, what, thing, n, doc)
    select h.id, to_timestamp(p_at / 1000.0), 'line', p_thing, p_n, jsonb_build_object('by', p_member, 'into', p_into)
      from public.town_line_water l, unnest(l.hands) with ordinality h(id, ord) join public.profiles pr on pr.id = h.id
     where l.member_id = p_member and l.item = p_thing and h.id <> p_member and p_n > 0
     order by h.ord
$function$;

-- town.lose_bait(p_purse jsonb, p_bait text)
CREATE OR REPLACE FUNCTION town.lose_bait(p_purse jsonb, p_bait text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when town.cat('fishing')->'kept' ? p_bait and town.held(p_purse->'bag', p_bait) > 0
    then p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, 1)) else p_purse end
$function$;

-- town.made_of(p_things jsonb)
CREATE OR REPLACE FUNCTION town.made_of(p_things jsonb)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select r.id
    from (select town.cat('cooking') as k, town.things_of(p_things) as mine) c,
         jsonb_array_elements_text(c.k->'recipes') with ordinality r(id, ord)
   where c.k->'needs'->r.id = c.mine
   order by r.ord limit 1
$function$;

-- town.mark_changed(p_character bigint, p_popoto integer)
CREATE OR REPLACE FUNCTION town.mark_changed(p_character bigint, p_popoto integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  had integer;
  cut bigint;
  next_cut bigint;
begin
  if p_character is null or p_popoto is null or p_popoto < 1 then return; end if;
  select c.popoto, c.cut_id into had, cut from public.town_changed c where c.character_id = p_character for update;
  had := coalesce(had, 0);
  cut := coalesce(cut, 0);
  select k.id into next_cut from public.kudos k
   where k.receiver_character_id = p_character and k.id > cut order by k.id offset p_popoto - 1 limit 1;
  if next_cut is null then
    select max(k.id) into next_cut from public.kudos k where k.receiver_character_id = p_character and k.id > cut;
  end if;
  insert into public.town_changed (character_id, popoto, cut_id) values (p_character, had + p_popoto, coalesce(next_cut, cut))
    on conflict (character_id) do update set popoto = excluded.popoto, cut_id = excluded.cut_id, updated_at = now();
end;
$function$;

-- town.market_count(p_item text, p_n integer)
CREATE OR REPLACE FUNCTION town.market_count(p_item text, p_n integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  market jsonb;
begin
  perform town.market_now();
  select t.doc into market from public.town_things t where t.key = 'market' for update;
  perform town.keep_thing('market', market || jsonb_build_object('sold',
    market->'sold' || jsonb_build_object(p_item, greatest(0, coalesce((market->'sold'->>p_item)::int, 0) + coalesce(p_n, 0)))));
end;
$function$;

-- town.market_heads(p_k jsonb)
CREATE OR REPLACE FUNCTION town.market_heads(p_k jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select greatest((p_k->>'heads')::int, (select count(distinct d.member_id)::int from public.town_deeds d
    where d.at > to_timestamp(town.now_ms() / 1000.0) - make_interval(hours => 12 * (p_k->>'lately')::int)))
$function$;

-- town.market_knobs()
CREATE OR REPLACE FUNCTION town.market_knobs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with k as (select coalesce(jsonb_object_agg(substr(n.key, 8), n.value), '{}'::jsonb) as v from public.town_knobs n where n.key like 'market\_%')
  select jsonb_build_object(
    'floor', coalesce((k.v->>'floor')::int, 40), 'made', coalesce((k.v->>'made')::int, 100), 'margin', coalesce((k.v->>'margin')::int, 150),
    'ceil', jsonb_build_array(coalesce((k.v->>'ceil_a')::int, 150), coalesce((k.v->>'ceil_b')::int, 130), coalesce((k.v->>'ceil_c')::int, 115)),
    'fall', coalesce((k.v->>'fall')::int, 25), 'rise', coalesce((k.v->>'rise')::int, 10), 'memory', coalesce((k.v->>'memory')::int, 50),
    'bend', coalesce((k.v->>'bend')::int, 70), 'heads', coalesce((k.v->>'heads')::int, 10), 'lately', coalesce((k.v->>'lately')::int, 14),
    'usual', jsonb_build_object('crop', coalesce((k.v->>'crop')::int, 30), 'fish', coalesce((k.v->>'fish')::int, 15), 'catch', coalesce((k.v->>'catch')::int, 10),
      'dish', coalesce((k.v->>'dish')::int, 15), 'goods', coalesce((k.v->>'goods')::int, 15), 'wild', coalesce((k.v->>'wild')::int, 15), 'bug', coalesce((k.v->>'bug')::int, 10)))
    from k
$function$;

-- town.market_next(p_st jsonb, p_sold double precision, p_usual double precision, p_floor double precision, p_ceil double precision, p_k jsonb)
CREATE OR REPLACE FUNCTION town.market_next(p_st jsonb, p_sold double precision, p_usual double precision, p_floor double precision, p_ceil double precision, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select jsonb_build_object(
      'f', floor(case when w.want < s.f then greatest(w.want, s.f * (1 - (p_k->>'fall')::double precision / 100))
                      else least(w.want, s.f * (1 + (p_k->>'rise')::double precision / 100)) end + 0.5::double precision)::int,
      'm', m.m)
    from (select (p_st->>'f')::double precision as f) s,
         (select (1 - (p_k->>'memory')::double precision / 100) * (p_st->>'m')::double precision + (p_k->>'memory')::double precision / 100 * p_sold as m) m,
         lateral (select least(p_ceil, greatest(p_floor,
           100 * power(p_usual / greatest(m.m, p_usual / 100), (p_k->>'bend')::double precision / 100))) as want) w
$function$;

-- town.market_now()
CREATE OR REPLACE FUNCTION town.market_now()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cur integer := town.round_of(town.now_ms());
  market jsonb;
  k jsonb;
  did jsonb;
  entry jsonb;
begin
  select t.doc into market from public.town_things t where t.key = 'market';
  if market is not null and (market->>'round')::int >= cur then return market; end if;
  -- (held only to be moved on: of two who come at the turn of a round, the second finds it moved)
  insert into public.town_things (key, doc) values ('market', jsonb_build_object('round', cur, 'at', '{}'::jsonb, 'sold', '{}'::jsonb)) on conflict (key) do nothing;
  select t.doc into market from public.town_things t where t.key = 'market' for update;
  if (market->>'round')::int >= cur then return market; end if;
  k := town.market_knobs();
  did := town.market_rolled(market, cur, town.market_heads(k), town.market_things(k), k);
  for entry in select * from jsonb_array_elements(did->'log') loop
    insert into public.town_market_log (round, doc) values ((entry->>0)::int, entry->1) on conflict (round) do nothing;
  end loop;
  perform town.keep_thing('market', did->'market');
  return did->'market';
end;
$function$;

-- town.market_rolled(p_market jsonb, p_round integer, p_heads integer, p_things jsonb, p_k jsonb)
CREATE OR REPLACE FUNCTION town.market_rolled(p_market jsonb, p_round integer, p_heads integer, p_things jsonb, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  was_round integer := (p_market->>'round')::int;
  at_ jsonb := coalesce(p_market->'at', '{}'::jsonb);
  log jsonb := '[]'::jsonb;
  steps integer;
  now_at jsonb;
  things jsonb;
begin
  if p_round <= was_round then return jsonb_build_object('market', p_market, 'log', log); end if;
  steps := least(p_round - was_round, 2 * (p_k->>'lately')::int);
  for i in 0..steps - 1 loop
    select coalesce(jsonb_object_agg(x.id, x.nx), '{}'::jsonb),
           coalesce(jsonb_object_agg(x.id, jsonb_build_array(x.f, x.sold)) filter (where x.sold > 0 or x.f <> 100), '{}'::jsonb)
      into now_at, things
      from (select e.key as id, (st.v->>'f')::int as f, s.sold,
                   town.market_next(st.v, s.sold, u.usual, (e.value->>1)::double precision, (e.value->>2)::double precision, p_k) as nx
              from jsonb_each(p_things) e
             cross join lateral (select (e.value->>0)::double precision * p_heads as usual) u
             cross join lateral (select coalesce(at_->e.key, jsonb_build_object('f', 100, 'm', u.usual)) as v) st
             cross join lateral (select case when i = 0 then coalesce((p_market->'sold'->>e.key)::double precision, 0) else 0 end as sold) s) x;
    log := log || jsonb_build_array(jsonb_build_array(was_round + i, things));
    at_ := now_at;
  end loop;
  return jsonb_build_object('market', jsonb_build_object('round', p_round, 'at', at_, 'sold', '{}'::jsonb), 'log', log);
end;
$function$;

-- town.market_things(p_k jsonb)
CREATE OR REPLACE FUNCTION town.market_things(p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with c as (select town.cat('items') as items, town.cat('goods') as goods, town.cat('fish') as fish, town.cat('flotsam') as flotsam,
                    town.cat('crops') as crops, town.cat('fishing') as fishing),
       bait as (
         select b.id, case when c.goods ? b.id then (c.goods->b.id->>'price')::double precision else coalesce((c.items->b.id->>'pays')::double precision, 0) end as cost
           from c, jsonb_array_elements_text(c.fishing->'baits') b(id)
          where not c.fishing->'kept' ? b.id),
       thing as (
         select i.key as id, i.value->>'kind' as kind, (i.value->>'tier')::int as tier, (i.value->>'pays')::double precision as pays,
                case i.value->>'kind'
                  when 'crop' then coalesce((c.goods->(c.crops->i.key->>'seed')->>'price')::double precision, 0)
                                   / (coalesce((c.crops->i.key->>'picks')::double precision, 1)
                                      * ((c.crops->i.key->'yield'->>0)::double precision + (c.crops->i.key->'yield'->>1)::double precision) / 2)
                  when 'fish' then (select min(bait.cost) from bait where c.fish->i.key->'baits' ? bait.id)
                  when 'catch' then (select min(bait.cost) from bait where coalesce(c.flotsam->i.key->'on', 'null'::jsonb) = 'null'::jsonb or c.flotsam->i.key->'on' ? bait.id)
                  else 0 end as cost
           from c, jsonb_each(c.items) i
          where (i.value->>'pays')::double precision > 0 and not c.goods ? i.key and p_k->'usual' ? (i.value->>'kind'))
  select coalesce(jsonb_object_agg(t.id, jsonb_build_array(
      (p_k->'usual'->>t.kind)::double precision / t.pays,
      case when t.kind in ('dish', 'goods') then (p_k->>'made')::int
           else least(100, greatest((p_k->>'floor')::int, ceil(coalesce(t.cost, 0) * (p_k->>'margin')::double precision / t.pays)::int)) end,
      coalesce((p_k->'ceil'->>(t.tier - 1))::int, (p_k->'ceil'->>-1)::int))), '{}'::jsonb)
    from thing t
$function$;

-- town.may_take(p_pot jsonb, p_me text)
CREATE OR REPLACE FUNCTION town.may_take(p_pot jsonb, p_me text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select p_pot->>'by' = p_me $function$;

-- town.meal_buffs(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.meal_buffs(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(jsonb_agg(e.b order by e.ord), '[]'::jsonb)
    from jsonb_array_elements(
      case when jsonb_typeof(p_purse->'buffs') = 'array' then p_purse->'buffs'
           when coalesce(p_purse->'buff', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_array((p_purse->'buff') || jsonb_build_object('level', 1))
           else '[]'::jsonb end) with ordinality as e(b, ord)
   where (e.b->>'until')::bigint > p_now
$function$;

-- town.meal_of(p_now bigint)
CREATE OR REPLACE FUNCTION town.meal_of(p_now bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  with h as (
    select ((p_now + 7 * 3600000::bigint) % 86400000)::double precision / 3600000 as h,
           town.cat('stamina')->'meals' as meals, (town.cat('rules')->>'dawn')::int as dawn)
  select case when h.h >= (h.meals->>2)::int or h.h < h.dawn then 2 when h.h >= (h.meals->>1)::int then 1 else 0 end from h
$function$;

-- town.member()
CREATE OR REPLACE FUNCTION town.member()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the town is for a proved character' using errcode = '42501';
  end if;
  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) <= 0 then
    raise exception 'the town''s game is not open yet' using errcode = '42501';
  end if;
  return me;
end;
$function$;

-- town.needs_of(p_id text)
CREATE OR REPLACE FUNCTION town.needs_of(p_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$ select coalesce(town.cat('dishes')->p_id->'recipe'->'needs', town.cat('makes')->p_id->'needs', '[]'::jsonb) $function$;

-- town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
CREATE OR REPLACE FUNCTION town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           <= (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  return jsonb_build_object('ok', true, 'purse', town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$;

-- town.next_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
CREATE OR REPLACE FUNCTION town.next_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  with cat as materialized (select town.cat('hints')->'ids' as ids, town.cat('items') as items),
  may as (
    select e->>0 as id, ord, (cat.items->(e->>0)->>'tier')::int as tier
      from cat, jsonb_array_elements(cat.ids) with ordinality x(e, ord)
     where (e->>1)::int between 0 and p_stage
       and not coalesce(p_purse->'hints', '[]'::jsonb) ? (e->>0)
       and not coalesce(p_purse->'recipes', '[]'::jsonb) ? (e->>0)
       and not coalesce(p_found, '[]'::jsonb) ? (e->>0)
  ),
  pool as (
    select id, row_number() over (order by ord) as nth, count(*) over () as n
      from may where tier = (select min(tier) from may)
  )
  select id from pool
   where nth = least(n, floor(case when p_r is null or p_r = 'NaN'::double precision or p_r <= 0 then 0 else least(p_r, 1) end * n)::bigint + 1)
$function$;

-- town.no(p_why text)
CREATE OR REPLACE FUNCTION town.no(p_why text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$ select jsonb_build_object('ok', false, 'why', p_why) $function$;

-- town.note(p_member uuid, p_what text, p_thing text, p_n numeric, p_coins numeric, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.note(p_member uuid, p_what text, p_thing text DEFAULT NULL::text, p_n numeric DEFAULT 1, p_coins numeric DEFAULT 0, p_doc jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.town_deeds (member_id, at, what, thing, n, coins, doc)
  values (p_member, to_timestamp(town.now_ms() / 1000.0), coalesce(p_what, '?'), p_thing, coalesce(p_n, 1), coalesce(p_coins, 0), coalesce(p_doc, '{}'::jsonb) || town.under(p_member))
$function$;

-- town.notice_cap(p_item text, p_k jsonb)
CREATE OR REPLACE FUNCTION town.notice_cap(p_item text, p_k jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$function$;

-- town.notice_knobs()
CREATE OR REPLACE FUNCTION town.notice_knobs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'slots', coalesce((select k.value from public.town_knobs k where k.key = 'notice_slots'), 3),
    'more', coalesce((select k.value from public.town_knobs k where k.key = 'notice_more'), 5),
    'slot_price', coalesce((select k.value from public.town_knobs k where k.key = 'notice_slot_price'), 100),
    'fee', coalesce((select k.value from public.town_knobs k where k.key = 'notice_fee'), 10),
    'hours', coalesce((select k.value from public.town_knobs k where k.key = 'notice_hours'), 72),
    'cap', coalesce((select k.value from public.town_knobs k where k.key = 'notice_cap'), 10),
    'capless', coalesce((select k.value from public.town_knobs k where k.key = 'notice_capless'), 500),
    'most', coalesce((select k.value from public.town_knobs k where k.key = 'notice_most'), 200),
    'shown', coalesce((select k.value from public.town_knobs k where k.key = 'notice_shown'), 120),
    'days', coalesce((select k.value from public.town_knobs k where k.key = 'notice_days'), 7))
$function$;

-- town.notice_told(p_notice town_notices, p_me uuid)
CREATE OR REPLACE FUNCTION town.notice_told(p_notice town_notices, p_me uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', p_notice.id, 'kind', p_notice.kind, 'item', p_notice.item, 'n', p_notice.n, 'left', p_notice.rest, 'price', p_notice.price,
    'held', case when p_notice.member_id = p_me then p_notice.held else 0 end,
    'by', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_notice.member_id), ''),
    'mine', p_notice.member_id = p_me,
    'until', p_notice.until)
$function$;

-- town.noticed(p_member uuid, p_did jsonb)
CREATE OR REPLACE FUNCTION town.noticed(p_member uuid, p_did jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ select town.answer(p_member, p_did) || jsonb_build_object('notices', town.notices_told(p_member)) $function$;

-- town.notices_told(p_me uuid)
CREATE OR REPLACE FUNCTION town.notices_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  today integer := town.day_of(town.now_ms());
  k jsonb := town.notice_knobs();
  due_ bigint;
  had integer;
  seen jsonb;
begin
  select b.due, b.more into due_, had from public.town_notice_books b where b.member_id = p_me;
  had := coalesce(had, 0);
  select coalesce(jsonb_agg(x.id order by x.id), '[]'::jsonb) into seen
    from (select jsonb_object_keys(town.seen_now()) as id
          union
          select jsonb_array_elements_text(town.shelf_of((town.thing('village', false)->>'unlocked')::int))) x
   where town.cat('items') ? x.id;
  return jsonb_build_object(
    'notices', coalesce((select jsonb_agg(town.notice_told(up, p_me) order by up.id desc)
                           from (select * from public.town_notices x where now_ < x.until and x.rest > 0 order by x.id desc limit (k->>'shown')::int) up), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(town.notice_told(x, p_me) order by x.id desc) from public.town_notices x where x.member_id = p_me), '[]'::jsonb),
    'due', (coalesce(due_, 0) / 100)::int,
    'slots', (k->>'slots')::int + least((k->>'more')::int, had),
    'more', case when had >= (k->>'more')::int then null else (k->>'slot_price')::int * (2 ^ had)::int end,
    'fee', (k->>'fee')::int, 'hours', (k->>'hours')::int, 'cap', (k->>'cap')::int, 'capless', (k->>'capless')::int, 'most', (k->>'most')::int,
    'seen', seen,
    'sales', coalesce((select jsonb_object_agg(d.item, d.days)
                         from (select s.item, jsonb_agg(jsonb_build_array(s.day, s.n, s.coins) order by s.day) as days
                                 from (select x.item, town.day_of(x.at) as day, sum(x.n)::int as n, sum(x.n::bigint * x.price)::int as coins
                                         from public.town_notice_sales x
                                        where town.day_of(x.at) > today - (k->>'days')::int and town.day_of(x.at) <= today
                                        group by x.item, town.day_of(x.at)) s
                                group by s.item) d), '{}'::jsonb));
end;
$function$;

-- town.now_ms()
CREATE OR REPLACE FUNCTION town.now_ms()
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$ select floor(extract(epoch from now()) * 1000)::bigint $function$;

-- town.odd_helpings(p_things jsonb, p_misses double precision)
CREATE OR REPLACE FUNCTION town.odd_helpings(p_things jsonb, p_misses double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select greatest(ceil(f.whole / 2::double precision), f.whole - greatest(0::double precision, floor(p_misses)))::integer
    from (select greatest(1::double precision, least((o.odd->>'most')::double precision,
                   floor(coalesce((select sum((x->>1)::double precision) from jsonb_array_elements(p_things) x), 0::double precision) / (o.odd->>'per')::double precision))) as whole
            from (select town.cat('cooking')->'odd' as odd) o) f
$function$;

-- town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_luck double precision)
CREATE OR REPLACE FUNCTION town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cat jsonb := town.cat('fishing');
  fish jsonb := town.cat('fish');
  flot jsonb := town.cat('flotsam');
  lucky_by double precision := coalesce(p_luck, (town.cat('stamina')->'buffs'->>'lucky')::double precision);
  h integer := ((p_hour % 24) + 24) % 24;
  ids text[] := '{}';
  ws double precision[] := '{}';
  id text;
  f jsonb;
  likes double precision;
  sky double precision;
  total double precision := 0;
  odds jsonb := '[]'::jsonb;
  i integer;
begin
  for id in select jsonb_array_elements_text(cat->'fish') loop
    f := fish->id;
    likes := coalesce((f->'baits'->>p_bait)::double precision, 0);
    continue when likes = 0;
    continue when not exists (select 1 from jsonb_array_elements(f->'hours') x where h >= (x->>0)::int and h < (x->>1)::int);
    -- (a fish that says where it lives keeps to that water; of the rest only the common ones come to the bank)
    continue when case when f ? 'water' then f->>'water' <> (case when p_shallow then 'bank' else 'deck' end) else p_shallow and f->>'tier' <> 'common' end;
    -- (one that waits for a sign bites only while every sign of it holds)
    continue when f ? 'needs' and exists (select 1 from jsonb_array_elements_text(f->'needs') n where not (n = any(coalesce(p_signs, '{}'::text[]))));
    -- (one the sky keeps away is not in the water at all: it is given no share, not a share of nothing)
    sky := case when p_rain then (f->>'rain')::double precision else coalesce((f->>'dry')::double precision, 1::double precision) end;
    continue when not (sky > 0);
    ids := ids || id;
    ws := ws || ((cat->'tiers'->>(f->>'tier'))::double precision * likes
      * sky
      * (case when p_lucky and f->>'tier' in ('rare', 'legend') then 1::double precision + lucky_by else 1::double precision end));
  end loop;
  for id in select jsonb_array_elements_text(cat->'flotsam') loop
    f := flot->id;
    if f->'on' is null or f->'on' ? p_bait then
      ids := ids || id;
      ws := ws || (f->>'weight')::double precision;
    end if;
  end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop total := total + ws[i]; end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop
    odds := odds || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ws[i] / total));
  end loop;
  return odds;
end;
$function$;

-- town.on_ground(p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.on_ground(p_x integer, p_y integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(bool_or(p_x >= (m.v->>0)::int and p_y >= (m.v->>1)::int and p_x < (m.v->>0)::int + (m.v->>2)::int and p_y < (m.v->>1)::int + (m.v->>3)::int), false)
    from jsonb_array_elements(town.cat('ground')->'maps') m(v)
$function$;

-- town.open(p_purse jsonb, p_slot integer, p_rolls double precision[])
CREATE OR REPLACE FUNCTION town.open(p_purse jsonb, p_slot integer, p_rolls double precision[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  inside jsonb;
  bag jsonb;
  many integer;
  inside_it text;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  inside := town.cat('cooking')->'inside'->(s->>'item');
  if inside is null then return town.no('none'); end if;
  bag := jsonb_set(p_purse->'bag', array[p_slot::text],
    case when (s->>'n')::int = 1 then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - 1) end);
  if not exists (select 1 from jsonb_array_elements(bag) b where b = 'null'::jsonb) then return town.no('full'); end if;
  many := jsonb_array_length(inside->'scrolls');
  if p_rolls[1] < (inside->>'chance')::double precision and many > 0 then
    inside_it := inside->'scrolls'->>least(many - 1, greatest(0, floor(p_rolls[2] * many)::int));
  end if;
  return jsonb_build_object('ok', true, 'found', inside_it,
    'purse', p_purse || jsonb_build_object('bag', case when inside_it is not null then town.put(bag, inside_it, 1) else bag end));
end;
$function$;

-- town.open_deal(p_member uuid)
CREATE OR REPLACE FUNCTION town.open_deal(p_member uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  idle bigint := (town.cat('deals')->>'idle')::bigint * 1000;
  open_id bigint;
begin
  update public.town_deals d set ended = 'off', ended_at = now_
   where d.ended is null and (d.a = p_member or d.b = p_member) and now_ - d.touched > idle;
  select d.id into open_id from public.town_deals d where d.ended is null and (d.a = p_member or d.b = p_member) order by d.id desc limit 1;
  return open_id;
end;
$function$;

-- town.order_of(p_village jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.order_of(p_village jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  today integer := town.day_of(p_now);
  same boolean := (p_village->>'day')::int = today;
  unlocked integer := (p_village->>'unlocked')::int;
  opened boolean := (p_village->>'opened')::int = today;
  wants jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('item', w->>0, 'n', (w->>1)::int,
           'got', least((w->>1)::int, case when same then coalesce((p_village->'got'->>(w->>0))::int, 0) else 0 end)) order by ord), '[]'::jsonb)
    into wants
    from jsonb_array_elements(town.wants(today, case when opened then unlocked - 1 else unlocked end)) with ordinality x(w, ord);
  return jsonb_build_object('day', today, 'wants', wants,
    'filled', jsonb_array_length(wants) > 0 and not exists (select 1 from jsonb_array_elements(wants) w where (w->>'got')::int < (w->>'n')::int),
    'opens', case when opened then 'null'::jsonb else coalesce(town.cat('shelf')->'unlocks'->unlocked, 'null'::jsonb) end);
end;
$function$;

-- town.owner_of(p_bed jsonb, p_planted boolean, p_now bigint)
CREATE OR REPLACE FUNCTION town.owner_of(p_bed jsonb, p_planted boolean, p_now bigint)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when p_bed is null or p_bed = 'null'::jsonb then null
    when p_planted and p_now - (p_bed->>'tended')::bigint > (b.k->>'untended')::bigint * 3600000 then null
    when not p_planted and p_now - (case when (p_bed->>'empty')::bigint <> 0 then (p_bed->>'empty')::bigint else (p_bed->>'tended')::bigint end)
      > (b.k->>'empty')::bigint * 3600000 then null
    else p_bed->>'by' end
    from (select town.cat('farming')->'beds' as k) b
$function$;

-- town.pass(p_from jsonb, p_to jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.pass(p_from jsonb, p_to jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_from);
  theirs text := town.hand_of(p_to);
  slot integer;
  has integer;
  into_ integer;
  n integer;
begin
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, has from jsonb_array_elements(p_from->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  if theirs is null or not (f->'buckets' ? theirs) then return town.no('none'); end if;
  select (x.ord - 1)::int into into_ from jsonb_array_elements(p_to->'bag') with ordinality x(s, ord)
   where x.s->>'item' = theirs and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
  if into_ is null then return town.no('full'); end if;
  n := least(has, (f->'buckets'->>theirs)::int);
  return jsonb_build_object('ok', true, 'n', n, 'can', hand, 'into', theirs,
    'from', town.spend(p_from, (town.cat('line')->>'cost')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_from->'bag', array[slot::text],
           case when has > n then jsonb_build_object('item', hand, 'n', 1, 'water', has - n) else jsonb_build_object('item', hand, 'n', 1) end)),
    'to', p_to || jsonb_build_object('bag', jsonb_set(p_to->'bag', array[into_::text], jsonb_build_object('item', theirs, 'n', 1, 'water', n))));
end;
$function$;

-- town.pest_at(p_key text, p_plant jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.pest_at(p_key text, p_plant jsonb, p_now bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks then false
        when picked > 0 then again is not null and (t - picked_at)::double precision / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then return t; end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$function$;

-- town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
begin
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)) end,
    'purse', town.spend(p_purse, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', p->>'crop', n)));
end;
$function$;

-- town.plain(p_bag jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.plain(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s
   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0
$function$;

-- town.plenty(p_bug text, p_at bigint, p_cat jsonb)
CREATE OR REPLACE FUNCTION town.plenty(p_bug text, p_at bigint, p_cat jsonb DEFAULT NULL::jsonb)
 RETURNS double precision
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  sc jsonb := coalesce(p_cat, town.cat('insects'))->'scarce';
  day bigint;
  half numeric;
  against numeric;
begin
  if sc is null or p_bug is null or p_at is null then return 1; end if;
  day := ((sc->>'day')::numeric * 3600000)::bigint;
  half := (sc->>'half')::numeric;
  select coalesce(sum(d.n * (day - (p_at - m.ms))), 0) into against
    from public.town_deeds d, lateral (select floor(extract(epoch from d.at) * 1000)::bigint as ms) m
   where d.what = 'net' and d.thing = p_bug
     and d.at > to_timestamp((p_at - day) / 1000.0) - interval '1 second'
     and d.at < to_timestamp(p_at / 1000.0) + interval '1 second'
     and m.ms < p_at and m.ms > p_at - day;
  return (half * day)::double precision / (half * day + against)::double precision;
end;
$function$;

-- town.plot_heat()
CREATE OR REPLACE FUNCTION town.plot_heat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  added double precision;
  more double precision := 0;
  w jsonb;
  k jsonb;
  hours double precision;
begin
  begin
    if new.plant is not null and old.plant is not null and jsonb_typeof(new.plant) = 'object' and jsonb_typeof(old.plant) = 'object'
       and (new.plant->>'sown') = (old.plant->>'sown')
       and (new.plant->>'watered')::bigint = new.changed and (old.plant->>'watered')::bigint < new.changed then
      added := (new.plant->>'boost')::double precision - (old.plant->>'boost')::double precision;
      if added > 0 then
        if town.hot(new.changed) then more := more + (town.cat('heat')->>'by')::double precision; end if;
        w := town.well_water_told(new.changed);
        if jsonb_typeof(w) = 'object' then
          k := town.cat('waters');
          more := more + coalesce((k->'adds'->>(w->>'kind'))::double precision, 0);
          hours := coalesce((k->'guards'->>(w->>'kind'))::double precision, 0);
          if hours > 0 then
            new.plant := new.plant || jsonb_build_object('guard', greatest((new.plant->>'guard')::bigint, new.changed + (hours * 3600000)::bigint));
          end if;
        end if;
        if more > 0 then
          new.plant := new.plant || jsonb_build_object('boost', (new.plant->>'boost')::double precision + added * more);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'the heat and the well''s water missed plot %,%: %', new.x, new.y, sqlerrm;
  end;
  return new;
end;
$function$;

-- town.pot_doc(p_id bigint)
CREATE OR REPLACE FUNCTION town.pot_doc(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('id', o.id::text, 'by', o.member_id, 'dish', o.dish, 'left', o.helpings, 'at', jsonb_build_array(o.x, o.y))
           || case when o.tok then '{"tok": true}'::jsonb else '{}'::jsonb end
    from public.town_pots o where o.id = p_id
$function$;

-- town.prices_told(p_me uuid)
CREATE OR REPLACE FUNCTION town.prices_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  purse jsonb := town.purse_kept(p_me, false);
  told jsonb;
begin
  select coalesce(jsonb_object_agg(h.id, jsonb_build_object(
      'f', town.factor_of(market, h.id), 'floor', (things->h.id->>1)::int, 'ceil', (things->h.id->>2)::int,
      'was', coalesce((select jsonb_agg(jsonb_build_array(l.round, coalesce((l.doc->h.id->>0)::int, 100), coalesce((l.doc->h.id->>1)::numeric, 0)) order by l.round)
                         from public.town_market_log l where l.round >= cur - (k->>'lately')::int and l.round < cur), '[]'::jsonb))), '{}'::jsonb)
    into told
    from (select distinct x.id from (
            select s.v->>'item' as id from jsonb_array_elements(coalesce(purse->'bag', '[]'::jsonb)) s(v) where s.v <> 'null'::jsonb
            union all
            select l.v->>'item' from jsonb_array_elements(coalesce(purse->'left', '[]'::jsonb)) l(v)) x
           where things ? x.id) h;
  return jsonb_build_object('round', cur, 'things', told);
end;
$function$;

-- town.pull(p_bag jsonb, p_give jsonb)
CREATE OR REPLACE FUNCTION town.pull(p_bag jsonb, p_give jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  stacks jsonb := '[]'::jsonb;
  g jsonb;
  s jsonb;
  more numeric;
  less numeric;
  i integer;
begin
  for g in select e.v from jsonb_array_elements(p_give) with ordinality e(v, ord) order by e.ord loop
    more := (g->>1)::numeric;
    for i in reverse jsonb_array_length(bag) - 1..0 loop
      exit when more <= 0;
      s := bag->i;
      continue when s = 'null'::jsonb or s->>'item' <> g->>0;
      less := least(more, (s->>'n')::numeric);
      more := more - less;
      stacks := stacks || jsonb_build_array(s || jsonb_build_object('n', less));
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::numeric = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::numeric - less) end);
    end loop;
  end loop;
  return jsonb_build_object('bag', bag, 'stacks', stacks);
end;
$function$;

-- town.purse_kept(p_member uuid, p_hold boolean)
CREATE OR REPLACE FUNCTION town.purse_kept(p_member uuid, p_hold boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  coins integer;
  doc jsonb;
  left_ record;
begin
  if p_hold then
    insert into public.town_purses (member_id) values (p_member) on conflict (member_id) do nothing;
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member for update;
  else
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member;
  end if;
  select l.profile_left, l.gallery_left into left_ from public.town_popoto_left(p_member) l;
  return town.roomy(coalesce(doc, town.fresh())) || jsonb_build_object(
    'coins', coalesce(coins, 0),
    'popoto', jsonb_build_object('profile', coalesce(left_.profile_left, 0), 'gallery', coalesce(left_.gallery_left, 0)),
    'changed', jsonb_build_object('week', town.week_of(now_), 'n', coalesce((
      select sum(e.popoto) from public.town_exchanges e
       where e.member_id = p_member
         and e.week = date_trunc('week', to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::date), 0)::int));
end;
$function$;

-- town.purse_of(p_member uuid, p_hold boolean)
CREATE OR REPLACE FUNCTION town.purse_of(p_member uuid, p_hold boolean)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ select town.helped(town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms()), town.now_ms()) $function$;

-- town.push(p_bag jsonb, p_stacks jsonb)
CREATE OR REPLACE FUNCTION town.push(p_bag jsonb, p_stacks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  slot integer;
begin
  for s in select e.v from jsonb_array_elements(p_stacks) with ordinality e(v, ord) order by e.ord loop
    if coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' then
      select (b.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality b(v, ord) where b.v = 'null'::jsonb order by b.ord limit 1;
      if slot is null then return null; end if;
      bag := jsonb_set(bag, array[slot::text], s);
    else
      if town.room(bag, s->>'item') < (s->>'n')::numeric then return null; end if;
      bag := town.put(bag, s->>'item', (s->>'n')::int);
    end if;
  end loop;
  return bag;
end;
$function$;

-- town.put(p_bag jsonb, p_id text, p_n integer)
CREATE OR REPLACE FUNCTION town.put(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  stack integer := (town.cat('items')->p_id->>'stack')::int;
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  add integer;
  i integer;
begin
  for i in 0..jsonb_array_length(bag) - 1 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id and (s->>'n')::int < stack then
      add := least(more, stack - (s->>'n')::int);
      bag := jsonb_set(bag, array[i::text, 'n'], to_jsonb((s->>'n')::int + add));
      more := more - add;
    end if;
  end loop;
  for i in 0..jsonb_array_length(bag) - 1 loop
    exit when more <= 0;
    if bag->i = 'null'::jsonb then
      add := least(more, stack);
      bag := jsonb_set(bag, array[i::text], jsonb_build_object('item', p_id, 'n', add));
      more := more - add;
    end if;
  end loop;
  return bag;
end;
$function$;

-- town.raining(p_now bigint)
CREATE OR REPLACE FUNCTION town.raining(p_now bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (select 1 from public.town_weather w where w.slot = floor(p_now::numeric / 900000)::bigint and town.wet_sky(w.sky))
$function$;

-- town.raised(p_purse jsonb, p_id text, p_now bigint)
CREATE OR REPLACE FUNCTION town.raised(p_purse jsonb, p_id text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  st jsonb := town.cat('stamina');
  live jsonb := town.meal_buffs(p_purse, p_now);
  at_ integer := (select (e.ord - 1)::int from jsonb_array_elements(live) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1);
  buffs jsonb;
begin
  if at_ is null then
    buffs := live || jsonb_build_array(jsonb_build_object('id', p_id, 'level', 1, 'until', p_now + (st->>'hours')::bigint * 3600000));
    at_ := jsonb_array_length(buffs) - 1;
  else
    buffs := jsonb_set(live, array[at_::text, 'level'], to_jsonb(least((st->>'levels')::int, (live->at_->>'level')::int + 1)));
  end if;
  return jsonb_build_object('buffs', buffs,
    'buff', case when st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', buffs->at_->'until') else coalesce(p_purse->'buff', 'null'::jsonb) end);
end;
$function$;

-- town.reaches(p_pot jsonb, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.reaches(p_pot jsonb, p_x integer, p_y integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_x is not null and p_y is not null
     and sqrt(((p_pot->'at'->>0)::double precision - p_x) ^ 2 + ((p_pot->'at'->>1)::double precision - p_y) ^ 2)
         <= (case when coalesce((p_pot->>'tok')::boolean, false) then c.k->>'tok' else c.k->>'reach' end)::double precision
    from (select town.cat('cooking') as k) c
$function$;

-- town.read_scroll(p_purse jsonb, p_slot integer)
CREATE OR REPLACE FUNCTION town.read_scroll(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  dish text;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  dish := town.cat('scrolls')->>(s->>'item');
  if dish is null then return town.no('none'); end if;
  if p_purse->'recipes' ? dish then return town.no('known'); end if;
  return jsonb_build_object('ok', true, 'dish', dish, 'purse', p_purse || jsonb_build_object(
    'recipes', (p_purse->'recipes') || to_jsonb(dish),
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - 1) end)));
end;
$function$;

-- town.record(p_member uuid, p_game text, p_won boolean, p_secs double precision, p_spent boolean, p_buff text, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.record(p_member uuid, p_game text, p_won boolean, p_secs double precision, p_spent boolean, p_buff text, p_doc jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.town_plays (member_id, game, at, won, secs, spent, buff, doc)
  values (p_member, p_game, to_timestamp(town.now_ms() / 1000.0), p_won, greatest(0, p_secs)::real, p_spent, p_buff, coalesce(p_doc, '{}'::jsonb) || town.under(p_member))
$function$;

-- town.rid_pick(p_plots jsonb, p_now bigint, p_pick double precision)
CREATE OR REPLACE FUNCTION town.rid_pick(p_plots jsonb, p_now bigint, p_pick double precision)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kills bigint := (town.cat('farming')->'pests'->>'kills')::bigint * 3600000;
  keys text[];
  n integer;
begin
  select array_agg(e.key order by split_part(e.key, ',', 1)::int, split_part(e.key, ',', 2)::int) into keys
    from jsonb_each(coalesce(p_plots, '{}'::jsonb)) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb
     and p_now - town.pest_at(e.key, e.value->'plant', p_now) <= kills;
  n := coalesce(array_length(keys, 1), 0);
  if n = 0 then return null; end if;
  return keys[least(n, greatest(1, floor(coalesce(p_pick, 0) * n)::int + 1))];
end;
$function$;

-- town.roll(p_word text, VARIADIC p_nums bigint[])
CREATE OR REPLACE FUNCTION town.roll(p_word text, VARIADIC p_nums bigint[] DEFAULT '{}'::bigint[])
 RETURNS double precision
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  s text := p_word || '|' || array_to_string(p_nums, '|');
  h bigint := 2166136261;
  i integer;
begin
  for i in 1..char_length(s) loop
    h := h # ascii(substr(s, i, 1));
    h := ((h::numeric * 16777619) % 4294967296)::bigint;
  end loop;
  h := h # (h >> 15);
  h := ((h::numeric * 2246822507) % 4294967296)::bigint;
  h := h # (h >> 13);
  h := ((h::numeric * 3266489909) % 4294967296)::bigint;
  h := h # (h >> 16);
  return h::double precision / 4294967296;
end;
$function$;

-- town.room(p_bag jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.room(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(case when s = 'null'::jsonb then st.stack when s->>'item' = p_id then st.stack - (s->>'n')::int else 0 end), 0)::integer
    from jsonb_array_elements(p_bag) s, (select (town.cat('items')->p_id->>'stack')::int as stack) st
$function$;

-- town.roomy(p_purse jsonb)
CREATE OR REPLACE FUNCTION town.roomy(p_purse jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when w.want > jsonb_array_length(p_purse->'bag')
    then p_purse || jsonb_build_object('bag', (p_purse->'bag')
      || (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_purse->'bag'))))
    else p_purse end
    from (select (town.cat('rules')->>'slots')::int + coalesce((
                   select sum((c.carries->>(x.v #>> '{}'))::int)
                     from jsonb_array_elements(coalesce(p_purse->'wears', '[]'::jsonb)) x(v), (select town.cat('carries') as carries) c), 0)::int as want) w
$function$;

-- town.round_from(p_round integer)
CREATE OR REPLACE FUNCTION town.round_from(p_round integer)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  select (p_round / 2)::bigint * 86400000
       + (town.cat('rules')->'rounds'->>(case when p_round % 2 = 0 then 0 else 1 end))::bigint * 3600000 - 7 * 3600000::bigint
$function$;

-- town.round_of(p_now bigint)
CREATE OR REPLACE FUNCTION town.round_of(p_now bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  with r as (select (town.cat('rules')->'rounds'->>0)::int as a, (town.cat('rules')->'rounds'->>1)::int as b),
       t as (select p_now + 7 * 3600000::bigint - r.a * 3600000::bigint as t, r.a, r.b from r)
  select ((t.t / 86400000) * 2 + case when t.t - (t.t / 86400000) * 86400000 >= (t.b - t.a) * 3600000 then 1 else 0 end)::integer from t
$function$;

-- town.see(p_key text, p_plot jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.see(p_key text, p_plot jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  dead := struck is not null and p_now - struck > kills;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then struck + kills else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now));
end;
$function$;

-- town.seen_has(p_item text)
CREATE OR REPLACE FUNCTION town.seen_has(p_item text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select town.seen_now() ? p_item
      or town.shelf_of((town.thing('village', false)->>'unlocked')::int) ? p_item
$function$;

-- town.seen_now()
CREATE OR REPLACE FUNCTION town.seen_now()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  every_ bigint := coalesce((select k.value from public.town_knobs k where k.key = 'notice_seen_minutes'), 10) * 60000::bigint;
  kept jsonb := town.thing('seen', false);
  ids jsonb;
begin
  if now_ - coalesce((kept->>'at')::bigint, 0) < every_ then return coalesce(kept->'ids', '{}'::jsonb); end if;
  kept := town.thing('seen', true);
  if now_ - coalesce((kept->>'at')::bigint, 0) < every_ then return coalesce(kept->'ids', '{}'::jsonb); end if;
  select coalesce(kept->'ids', '{}'::jsonb) || coalesce(jsonb_object_agg(x.id, true), '{}'::jsonb) into ids
    from (
      select s.v->>'item' as id from public.town_purses p, jsonb_array_elements(coalesce(p.doc->'bag', '[]'::jsonb)) s(v) where s.v <> 'null'::jsonb
      union
      select l.v->>'item' from public.town_purses p, jsonb_array_elements(coalesce(p.doc->'left', '[]'::jsonb)) l(v)
      union
      select n.item from public.town_notices n
      union
      select d.thing from public.town_deeds d
       where d.what in ('buy', 'leave', 'take_back', 'drop', 'give', 'hold', 'eat')
         and d.at >= to_timestamp(coalesce((kept->>'at')::bigint, 0) / 1000.0)) x
   where x.id is not null and town.cat('items') ? x.id;
  perform town.keep_thing('seen', jsonb_build_object('at', now_, 'ids', ids));
  return ids;
end;
$function$;

-- town.serve(p_purse jsonb, p_slot integer)
CREATE OR REPLACE FUNCTION town.serve(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bowl text := town.cat('cooking')->>'bowl';
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  dish text;
  left_ numeric;
  bag jsonb;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb
     or (s->'of'->>'left')::numeric < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  dish := s->'of'->>'dish';
  left_ := (s->'of'->>'left')::numeric - 1;
  bag := town.take(jsonb_set(p_purse->'bag', array[p_slot::text],
    case when left_ > 0 then s || jsonb_build_object('of', jsonb_build_object('dish', dish, 'left', left_)) else 'null'::jsonb end), bowl, 1);
  if town.room(bag, dish) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'dish', dish, 'purse', p_purse || jsonb_build_object('bag', town.put(bag, dish, 1)));
end;
$function$;

-- town.set_down(p_purse jsonb, p_slot integer, p_me text, p_at jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.set_down(p_purse jsonb, p_slot integer, p_me text, p_at jsonb, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'pot', jsonb_build_object('id', p_id, 'by', p_me, 'dish', s->'of'->'dish', 'left', s->'of'->'left', 'at', p_at)
      || case when town.held(p_purse->'bag', 'tok') > 0 then '{"tok": true}'::jsonb else '{}'::jsonb end,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)));
end;
$function$;

-- town.settle(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.settle(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  ends bigint;
begin
  if e = 'null'::jsonb then return town.bowls_back(p_purse, 0); end if;
  ends := (e->>'from')::bigint + (town.cat('stamina')->>'minutes')::bigint * 60000;
  if p_now >= ends then return town.chew(p_purse, 0, ends)->'purse'; end if;
  return town.bowls_back(p_purse, 0);
end;
$function$;

-- town.shelf_of(p_unlocked integer)
CREATE OR REPLACE FUNCTION town.shelf_of(p_unlocked integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select (town.cat('shelf')->'basic') || coalesce((
    select jsonb_agg(u order by ord) from jsonb_array_elements(town.cat('shelf')->'unlocks') with ordinality x(u, ord)
     where ord <= greatest(0, p_unlocked)), '[]'::jsonb)
$function$;

-- town.shop_alive(p_shop jsonb, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_alive(p_shop jsonb, p_now bigint, p_k jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select p_shop is not null and p_shop <> 'null'::jsonb and p_now - (p_shop->>'beat')::bigint < (p_k->>'quiet')::bigint * 1000 $function$;

-- town.shop_buy(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_buy(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  found jsonb := town.shop_line(p_shop, 'sell', p_me, p_item, p_n, p_x, p_y, p_now, p_k);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain(p_theirs->'bag', p_item) < p_n then return town.no('gone'); end if;
  if (p_mine->>'coins')::numeric < coins then return town.no('coins'); end if;
  if town.room(p_mine->'bag', p_item) < p_n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric - coins, 'bag', town.put(p_mine->'bag', p_item, p_n)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric + coins, 'bag', town.take_plain(p_theirs->'bag', p_item, p_n)));
end;
$function$;

-- town.shop_can(p_line jsonb, p_keeper jsonb)
CREATE OR REPLACE FUNCTION town.shop_can(p_line jsonb, p_keeper jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select greatest(0, case when p_line->>'kind' = 'sell'
    then least((p_line->>'left')::int, town.plain(p_keeper->'bag', p_line->>'item'))
    else least((p_line->>'left')::int, floor((p_keeper->>'coins')::numeric / (p_line->>'price')::numeric)::int, town.room(p_keeper->'bag', p_line->>'item')) end)
$function$;

-- town.shop_cap(p_item text, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_cap(p_item text, p_k jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$function$;

-- town.shop_deal(p_me uuid, p_who uuid, p_kind text, p_item text, p_n integer, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.shop_deal(p_me uuid, p_who uuid, p_kind text, p_item text, p_n integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  now_ bigint := town.now_ms();
  k jsonb := town.shop_knobs();
  mine jsonb;
  theirs jsonb;
  shop jsonb;
  did jsonb;
  price_ numeric;
begin
  if p_who is null or not town.is_member(p_who) then
    return town.answer(p_me, town.no('shut')) || jsonb_build_object('shopWho', p_who, 'shopTold', null);
  end if;
  if p_me <= p_who then mine := town.purse_of(p_me, true); theirs := town.purse_of(p_who, true);
  else theirs := town.purse_of(p_who, true); mine := town.purse_of(p_me, true); end if;
  shop := town.shop_of(p_who, true);
  did := case when p_kind = 'sell' then town.shop_buy(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k)
              else town.shop_sell(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k) end;
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_me, did->'mine');
    perform town.keep_purse(p_who, did->'theirs');
    update public.town_shops s set lines = did->'shop'->'lines', took = (did->'shop'->>'took')::numeric::bigint, paid = (did->'shop'->>'paid')::numeric::bigint
     where s.member_id = p_who;
    price_ := (did->>'coins')::numeric / p_n;
    if p_kind = 'sell' then
      perform town.note(p_me, 'shop_buy', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)));
      perform town.note(p_who, 'shop_sold', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_me, 'price', price_));
    else
      perform town.note(p_me, 'shop_sell', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)));
      perform town.note(p_who, 'shop_bought', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_me, 'price', price_));
    end if;
  end if;
  shop := town.shop_of(p_who, false);
  return town.answer(p_me, did - 'mine' - 'theirs' - 'shop') || jsonb_build_object('shopWho', p_who,
    'shopTold', case when shop is null then null else town.shop_told_of(shop, town.purse_of(p_who, false), now_, k) end);
end;
$function$;

-- town.shop_knobs()
CREATE OR REPLACE FUNCTION town.shop_knobs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'lines', coalesce((select k.value from public.town_knobs k where k.key = 'shop_lines'), 6),
    'reach', coalesce((select k.value from public.town_knobs k where k.key = 'shop_reach'), 3),
    'most', coalesce((select k.value from public.town_knobs k where k.key = 'shop_most'), 200),
    'quiet', coalesce((select k.value from public.town_knobs k where k.key = 'shop_quiet'), 150),
    'every', coalesce((select k.value from public.town_knobs k where k.key = 'shop_every'), 50),
    'cap', coalesce((select k.value from public.town_knobs k where k.key = 'notice_cap'), 10),
    'capless', coalesce((select k.value from public.town_knobs k where k.key = 'notice_capless'), 500))
$function$;

-- town.shop_line(p_shop jsonb, p_kind text, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_line(p_shop jsonb, p_kind text, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  i integer;
begin
  if p_n is null or p_n <= 0 then return town.no('amount'); end if;
  if not town.shop_alive(p_shop, p_now, p_k) then return town.no('shut'); end if;
  if p_shop->>'by' = p_me then return town.no('own'); end if;
  if p_x is null or p_y is null
     or greatest(abs(p_x - (p_shop->'at'->>0)::int), abs(p_y - (p_shop->'at'->>1)::int)) > (p_k->>'reach')::int then return town.no('far'); end if;
  select (t.n - 1)::int into i from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n)
   where t.e->>'kind' = p_kind and t.e->>'item' = p_item order by t.n limit 1;
  if i is null or (p_shop->'lines'->i->>'left')::int < p_n then return town.no('gone'); end if;
  return jsonb_build_object('ok', true, 'i', i);
end;
$function$;

-- town.shop_mine(p_shop jsonb, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_mine(p_shop jsonb, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when not town.shop_alive(p_shop, p_now, p_k) then null else jsonb_build_object(
    'at', p_shop->'at', 'lines', p_shop->'lines', 'since', p_shop->'since', 'took', p_shop->'took', 'paid', p_shop->'paid') end
$function$;

-- town.shop_of(p_member uuid, p_hold boolean)
CREATE OR REPLACE FUNCTION town.shop_of(p_member uuid, p_hold boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  s public.town_shops;
begin
  if p_hold then select * into s from public.town_shops x where x.member_id = p_member for update;
  else select * into s from public.town_shops x where x.member_id = p_member; end if;
  if s.member_id is null then return null; end if;
  return jsonb_build_object('by', s.member_id, 'at', jsonb_build_array(s.x, s.y), 'lines', s.lines, 'since', s.since, 'beat', s.beat, 'took', s.took, 'paid', s.paid);
end;
$function$;

-- town.shop_open(p_purse jsonb, p_me text, p_ask jsonb, p_x integer, p_y integer, p_now bigint, p_seen jsonb, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_open(p_purse jsonb, p_me text, p_ask jsonb, p_x integer, p_y integer, p_now bigint, p_seen jsonb, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  l jsonb;
  item_ text;
  owed numeric := 0;
  lines_ jsonb := '[]'::jsonb;
  n_ numeric;
  price_ numeric;
begin
  if p_ask is null or jsonb_typeof(p_ask) <> 'array' or jsonb_array_length(p_ask) < 1 or jsonb_array_length(p_ask) > (p_k->>'lines')::int then return town.no('lines'); end if;
  if (select count(distinct coalesce(e->>'item', '')) from jsonb_array_elements(p_ask) e) <> jsonb_array_length(p_ask) then return town.no('lines'); end if;
  if p_x is null or p_y is null then return town.no('none'); end if;
  for l in select e from jsonb_array_elements(p_ask) e loop
    item_ := l->>'item';
    if item_ is null or not (town.cat('items') ? item_) or coalesce(l->>'kind', '') not in ('sell', 'buy') then return town.no('none'); end if;
    if jsonb_typeof(l->'n') is distinct from 'number' or jsonb_typeof(l->'price') is distinct from 'number' then return town.no('amount'); end if;
    n_ := (l->>'n')::numeric;
    price_ := (l->>'price')::numeric;
    if n_ <= 0 or n_ <> trunc(n_) or price_ <= 0 or price_ <> trunc(price_) or n_ > (p_k->>'most')::numeric then return town.no('amount'); end if;
    if price_ > town.shop_cap(item_, p_k) then return town.no('dear'); end if;
    if l->>'kind' = 'sell' and town.plain(p_purse->'bag', item_) < n_ then return town.no('none'); end if;
    if l->>'kind' = 'buy' and not (p_seen ? item_) then return town.no('none'); end if;
    if l->>'kind' = 'buy' then owed := owed + n_ * price_; end if;
    lines_ := lines_ || jsonb_build_array(jsonb_build_object('kind', l->>'kind', 'item', item_, 'n', n_::int, 'left', n_::int, 'price', price_::int));
  end loop;
  if owed > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'shop', jsonb_build_object(
    'by', p_me, 'at', jsonb_build_array(p_x, p_y), 'lines', lines_, 'since', p_now, 'beat', p_now, 'took', 0, 'paid', 0));
end;
$function$;

-- town.shop_seen()
CREATE OR REPLACE FUNCTION town.shop_seen()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(x.id order by x.id), '[]'::jsonb)
    from (select jsonb_object_keys(town.seen_now()) as id
          union
          select jsonb_array_elements_text(town.shelf_of((town.thing('village', false)->>'unlocked')::int))) x
   where town.cat('items') ? x.id
$function$;

-- town.shop_sell(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_sell(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  found jsonb := town.shop_line(p_shop, 'buy', p_me, p_item, p_n, p_x, p_y, p_now, p_k);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain(p_mine->'bag', p_item) < p_n then return town.no('none'); end if;
  if (p_theirs->>'coins')::numeric < coins then return town.no('short'); end if;
  if town.room(p_theirs->'bag', p_item) < p_n then return town.no('packed'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric + coins, 'bag', town.take_plain(p_mine->'bag', p_item, p_n)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric - coins, 'bag', town.put(p_theirs->'bag', p_item, p_n)));
end;
$function$;

-- town.shop_spent(p_shop jsonb, p_i integer, p_n integer, p_coins numeric)
CREATE OR REPLACE FUNCTION town.shop_spent(p_shop jsonb, p_i integer, p_n integer, p_coins numeric)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select jsonb_set(p_shop, array['lines', p_i::text, 'left'], to_jsonb((p_shop->'lines'->p_i->>'left')::int - p_n))
    || case when p_shop->'lines'->p_i->>'kind' = 'sell'
         then jsonb_build_object('took', (p_shop->>'took')::numeric + p_coins)
         else jsonb_build_object('paid', (p_shop->>'paid')::numeric + p_coins) end
$function$;

-- town.shop_told_of(p_shop jsonb, p_keeper jsonb, p_now bigint, p_k jsonb)
CREATE OR REPLACE FUNCTION town.shop_told_of(p_shop jsonb, p_keeper jsonb, p_now bigint, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when not town.shop_alive(p_shop, p_now, p_k) then null else jsonb_build_object(
    'by', p_shop->'by', 'at', p_shop->'at',
    'lines', coalesce((select jsonb_agg(jsonb_build_object('kind', t.e->'kind', 'item', t.e->'item', 'price', t.e->'price', 'can', town.shop_can(t.e, p_keeper)) order by t.n)
                         from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n) where town.shop_can(t.e, p_keeper) > 0), '[]'::jsonb)) end
$function$;

-- town.shopped(p_member uuid, p_did jsonb)
CREATE OR REPLACE FUNCTION town.shopped(p_member uuid, p_did jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ select town.answer(p_member, p_did) || jsonb_build_object('shops', town.shops_told(p_member)) $function$;

-- town.shops_told(p_me uuid)
CREATE OR REPLACE FUNCTION town.shops_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  k jsonb := town.shop_knobs();
begin
  return jsonb_build_object(
    'mine', town.shop_mine(town.shop_of(p_me, false), town.now_ms(), k),
    'seen', town.shop_seen(),
    'lines', (k->>'lines')::int, 'reach', (k->>'reach')::int, 'most', (k->>'most')::int,
    'cap', (k->>'cap')::int, 'capless', (k->>'capless')::int, 'every', (k->>'every')::int);
end;
$function$;

-- town.side_of(p_deal jsonb, p_me text)
CREATE OR REPLACE FUNCTION town.side_of(p_deal jsonb, p_me text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$ select case when p_deal->>'a' = p_me then 'a' when p_deal->>'b' = p_me then 'b' end $function$;

-- town.signs_of(p_now bigint, p_spent boolean, p_others integer, p_wet bigint, p_rain boolean)
CREATE OR REPLACE FUNCTION town.signs_of(p_now bigint, p_spent boolean, p_others integer, p_wet bigint, p_rain boolean)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := town.cat('fishing')->'signs';
  -- the moon's month in days, and its age at this moment in days, from a moment it was new (2000-01-06 18:14 UTC)
  month double precision := 29.530588853;
  days double precision := (p_now - 947182440000)::double precision / 86400000::double precision;
  age double precision := days - floor(days / month) * month;
  -- the day of the week in Bangkok: 0 is Sunday (the first day of 1970 was a Thursday)
  dow integer := (((floor((p_now + 25200000)::numeric / 86400000)::bigint + 4) % 7 + 7) % 7)::int;
  signs text[] := '{}';
begin
  if coalesce(p_spent, false) then signs := signs || 'tired'::text; end if;
  if coalesce(p_others, 0) >= (s->>'crowd')::int then signs := signs || 'crowd'::text; end if;
  if s->'weekend' @> to_jsonb(dow) then signs := signs || 'weekend'::text; end if;
  if not coalesce(p_rain, false) and coalesce(p_wet, 0) > 0 then signs := signs || 'after'::text; end if;
  if abs(age - month / 2::double precision) <= (s->>'moon')::double precision then signs := signs || 'full'::text; end if;
  return signs;
end;
$function$;

-- town.sit_down(p_purse jsonb, p_slot integer, p_seated boolean, p_now bigint)
CREATE OR REPLACE FUNCTION town.sit_down(p_purse jsonb, p_slot integer, p_seated boolean, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  meal integer := town.meal_of(p_now);
  bowls jsonb := town.bowls_today(p_purse, p_now);
begin
  if s is null or s = 'null'::jsonb or coalesce(town.cat('items')->(s->>'item')->>'kind', '') <> 'dish' then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb or (bowls->>meal)::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', s->>'item', 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - 1) end),
    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))
                from (select case when x.ord - 1 = meal then x.e::int + 1 else x.e::int end as n, x.ord from jsonb_array_elements_text(bowls) with ordinality as x(e, ord)) b),
    'eating', jsonb_build_object('dish', s->>'item', 'meal', meal, 'from', p_now, 'till', p_now, 'got', 0)));
end;
$function$;

-- town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
CREATE OR REPLACE FUNCTION town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  crop text := f->'seeds'->>p_hand;
begin
  if crop is null or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p_plot->>'soil' <> 'tilled' or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  return jsonb_build_object('ok', true,
    'plot', jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', p_me, 'crop', crop, 'sown', p_now,
      'boost', case when town.has_buff(p_purse, p_now, 'sprout')
        then (town.wishing()->>'sprout')::double precision * (town.cat('crops')->crop->>'hours')::double precision * 3600000 else 0 end, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)),
    'purse', town.spend(p_purse, (f->'costs'->>'sow')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$function$;

-- town.spend(p_purse jsonb, p_n double precision, p_now bigint)
CREATE OR REPLACE FUNCTION town.spend(p_purse jsonb, p_n double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select p_purse || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now),
    'left', greatest(0::double precision, town.stamina_of(p_purse, p_now) - town.cost_of(p_purse, p_n, p_now))))
$function$;

-- town.stamina_of(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.stamina_of(p_purse jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
  select case when (p_purse->'stamina'->>'day')::int = town.day_of(p_now) then (p_purse->'stamina'->>'left')::double precision
              else (town.cat('stamina')->>'max')::double precision end
$function$;

-- town.stow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.stow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kept jsonb := town.box_roomy(p_box);
  did jsonb;
begin
  if not town.by_box(p_x, p_y) then return town.no('far'); end if;
  did := town.box_move(p_purse->'bag', p_slot, p_n, kept->'things', 'packed');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'from'), 'box', kept || jsonb_build_object('things', did->'to'));
end;
$function$;

-- town.stretch_of(p_per text, p_now bigint)
CREATE OR REPLACE FUNCTION town.stretch_of(p_per text, p_now bigint)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$ select case when p_per = 'day' then town.day_of(p_now)::bigint else town.day_of(p_now)::bigint * 3 + town.meal_of(p_now) end $function$;

-- town.strike_window(p_purse jsonb, p_now bigint)
CREATE OR REPLACE FUNCTION town.strike_window(p_purse jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
  select (c.f->>'strike')::double precision * (
    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision))
    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)))
    from (select town.cat('fishing') as f) c
$function$;

-- town.swap(p_deal jsonb, p_a jsonb, p_b jsonb)
CREATE OR REPLACE FUNCTION town.swap(p_deal jsonb, p_a jsonb, p_b jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  pay_a numeric := coalesce((p_deal->'coins'->>'a')::numeric, 0);
  pay_b numeric := coalesce((p_deal->'coins'->>'b')::numeric, 0);
  from_a jsonb;
  from_b jsonb;
  bag_a jsonb;
  bag_b jsonb;
begin
  if not coalesce((p_deal->'ok'->>'a')::boolean, false) or not coalesce((p_deal->'ok'->>'b')::boolean, false) then return town.no('none'); end if;
  if not town.has_all(p_a, p_deal->'give'->'a') or not town.has_all(p_b, p_deal->'give'->'b') then return town.no('none'); end if;
  if (p_a->>'coins')::numeric < pay_a or (p_b->>'coins')::numeric < pay_b then return town.no('coins'); end if;
  from_a := town.pull(p_a->'bag', town.tidy_give(p_deal->'give'->'a'));
  from_b := town.pull(p_b->'bag', town.tidy_give(p_deal->'give'->'b'));
  bag_a := town.push(from_a->'bag', from_b->'stacks');
  bag_b := town.push(from_b->'bag', from_a->'stacks');
  if bag_a is null or bag_b is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true,
    'a', p_a || jsonb_build_object('bag', bag_a, 'coins', (p_a->>'coins')::numeric - pay_a + pay_b),
    'b', p_b || jsonb_build_object('bag', bag_b, 'coins', (p_b->>'coins')::numeric - pay_b + pay_a));
end;
$function$;

-- town.swarm_note(p_now bigint)
CREATE OR REPLACE FUNCTION town.swarm_note(p_now bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  f jsonb := town.cat('farming');
  h bigint := floor(p_now::numeric / 3600000)::bigint;
  -- (the hour of the day, by Bangkok's clock; not named as the table's column is)
  of_day integer := ((((h * 3600000 + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
begin
  if of_day < (f->'pests'->>'from')::int or of_day >= (f->'pests'->>'to')::int then return; end if;
  if exists (select 1 from public.town_swarms s where s.hour = h) then return; end if;
  insert into public.town_swarms (hour, bugs, noted) values (h, town.farm_bugs(p_now), p_now) on conflict (hour) do nothing;
end;
$function$;

-- town.swarms_told(p_since bigint)
CREATE OR REPLACE FUNCTION town.swarms_told(p_since bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb)
    from public.town_swarms s
   where s.bugs > 0 and s.noted > p_since and s.hour > floor(town.now_ms()::numeric / 3600000)::bigint - 30 * 24
$function$;

-- town.take(p_bag jsonb, p_id text, p_n integer)
CREATE OR REPLACE FUNCTION town.take(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else jsonb_build_object('item', p_id, 'n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$function$;

-- town.take_back(p_purse jsonb, p_at integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.take_back(p_purse jsonb, p_at integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cur integer := town.round_of(p_now);
  lots jsonb := p_purse->'left';
  lot jsonb;
  k integer := -1;
  hit integer := -1;
  i integer;
begin
  for i in 0..jsonb_array_length(lots) - 1 loop
    if (lots->i->>'round')::int >= cur then
      k := k + 1;
      if k = p_at then hit := i; exit; end if;
    end if;
  end loop;
  if hit < 0 then return town.no(case when jsonb_array_length(lots) > 0 then 'gone' else 'none' end); end if;
  lot := lots->hit;
  if town.room(p_purse->'bag', lot->>'item') < (lot->>'n')::int then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', town.put(p_purse->'bag', lot->>'item', (lot->>'n')::int), 'left', lots - hit));
end;
$function$;

-- town.take_off(p_purse jsonb, p_item text)
CREATE OR REPLACE FUNCTION town.take_off(p_purse jsonb, p_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  more integer := (town.cat('carries')->>p_item)::int;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  things jsonb;
  slots integer;
begin
  if more is null or not wears ? p_item then return town.no('none'); end if;
  select coalesce(jsonb_agg(s order by ord), '[]'::jsonb) into things
    from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord) where s <> 'null'::jsonb;
  slots := jsonb_array_length(p_purse->'bag') - more;
  if jsonb_array_length(things) + 1 > slots then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', things || jsonb_build_array(jsonb_build_object('item', p_item, 'n', 1))
      || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, slots - jsonb_array_length(things) - 1)),
    'wears', (select coalesce(jsonb_agg(w order by ord), '[]'::jsonb) from jsonb_array_elements(wears) with ordinality y(w, ord) where w <> to_jsonb(p_item))));
end;
$function$;

-- town.take_plain(p_bag jsonb, p_id text, p_n integer)
CREATE OR REPLACE FUNCTION town.take_plain(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$function$;

-- town.take_up(p_purse jsonb, p_pot jsonb, p_me text)
CREATE OR REPLACE FUNCTION town.take_up(p_purse jsonb, p_pot jsonb, p_me text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  slot integer;
begin
  if not coalesce(town.may_take(p_pot, p_me), false) or (p_pot->>'left')::numeric < 1 then return town.no('none'); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
  if slot is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
    jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', p_pot->'dish', 'left', p_pot->'left')))));
end;
$function$;

-- town.taken(p_what text, p_place integer, p_turn bigint, p_member uuid)
CREATE OR REPLACE FUNCTION town.taken(p_what text, p_place integer, p_turn bigint, p_member uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('n', count(*), 'mine', coalesce(bool_or(t.member_id = p_member), false))
    from public.town_takes t where t.what = p_what and t.place = p_place and t.turn = p_turn
$function$;

-- town.takes(p_id text)
CREATE OR REPLACE FUNCTION town.takes(p_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select case when coalesce(d.r, 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('in', d.r->'in', 'cooks', d.r->'cooks')
              else jsonb_build_object('in', town.cat('makes')->p_id->'in', 'cooks', 1) end
    from (select town.cat('dishes')->p_id->'recipe' as r) d
$function$;

-- town.takes_water(p_made text)
CREATE OR REPLACE FUNCTION town.takes_water(p_made text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_made is not null and c.dishes ? p_made and p_made <> c.odd and coalesce(c.dishes->p_made->'recipe', 'null'::jsonb) <> 'null'::jsonb
     and not exists (select 1 from jsonb_array_elements_text(c.dishes->p_made->'recipe'->'in') w where town.cat('yard')->'dry' ? w)
    from (select town.cat('dishes') as dishes, town.cat('cooking')->>'oddDish' as odd) c
$function$;

-- town.tally(p_from timestamp with time zone, p_to timestamp with time zone)
CREATE OR REPLACE FUNCTION town.tally(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(name text, what text, th text, times bigint, n numeric, coins numeric, first_at timestamp with time zone, last_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(p.character_name, p.display_name, p.discord_username, '(gone)'), d.what, town.deed_th(d.what),
         count(*), sum(d.n), sum(d.coins), min(d.at), max(d.at)
    from town.doings d left join public.profiles p on p.id = d.member_id
   where (p_from is null or d.at >= p_from) and (p_to is null or d.at < p_to)
   group by d.member_id, 1, d.what
   order by 1, count(*) desc, d.what
$function$;

-- town.taste_of(p_things jsonb, p_crew jsonb)
CREATE OR REPLACE FUNCTION town.taste_of(p_things jsonb, p_crew jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  hands text[] := town.cook_hands(p_crew);
  crew_n integer := jsonb_array_length(p_crew);
  best record;
  missing_n integer;
  wrong integer;
  there integer;
  taste text;
begin
  select s.id, s.missing, s.extra, s.off, s.total into best
    from (
      select r.id, r.ord, jsonb_array_length(r.rec->'needs') as total,
             (select coalesce(array_agg(e.n->>0 order by e.ord), '{}') from jsonb_array_elements(r.rec->'needs') with ordinality e(n, ord)
               where not c.mine ? (e.n->>0)) as missing,
             (select count(*)::int from jsonb_object_keys(c.mine) k(v)
               where not exists (select 1 from jsonb_array_elements(r.rec->'needs') n(v) where n.v->>0 = k.v)) as extra,
             (select count(*)::int from jsonb_array_elements(r.rec->'needs') n(v)
               where c.mine ? (n.v->>0) and c.mine->(n.v->>0) <> n.v->1) as off,
             crew_n >= (r.rec->>'cooks')::int and town.holds_all(r.rec->'in', hands) as ready
        from (select town.things_of(p_things) as mine) c,
             (select x.id, x.ord, coalesce(nullif(d.dishes->x.id->'recipe', 'null'::jsonb), d.makes->x.id || '{"cooks": 1}'::jsonb) as rec
                from (select town.cat('dishes') as dishes, town.cat('makes') as makes) d,
                     jsonb_array_elements_text(town.cat('cooking')->'recipes') with ordinality x(id, ord)) r
    ) s
   order by (coalesce(array_length(s.missing, 1), 0) + s.extra) * 1000 + s.off * 10 + case when s.ready then 0 else 1 end, s.ord
   limit 1;
  if best.id is null then return '{"taste": "far", "of": null, "lacks": null}'::jsonb; end if;
  missing_n := coalesce(array_length(best.missing, 1), 0);
  wrong := missing_n + best.extra;
  there := best.total - missing_n;
  taste := case
    when wrong = 0 then (case when best.off > 0 then 'amounts' else 'way' end)
    when missing_n = 1 and best.extra = 1 then 'swap'
    when wrong = 1 then (case when best.extra > 0 then 'more' else 'less' end)
    when there >= 1 and there * 2 >= best.total then 'some'
    else 'far' end;
  return jsonb_build_object('taste', taste, 'of', case when taste = 'far' then null else best.id end,
    'lacks', case when taste in ('less', 'swap') then best.missing[1] end);
end;
$function$;

-- town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean)
CREATE OR REPLACE FUNCTION town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
begin
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', case when (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me)
        then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end,
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end;
end;
$function$;

-- town.thank(p_x integer, p_y integer, p_me uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.thank(p_x integer, p_y integer, p_me uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_left jsonb := town.unthanked(p_x, p_y, p_me, town.day_of(p_now));
begin
  if jsonb_array_length(v_left) = 0 then return town.no('none'); end if;
  insert into public.town_thanks (from_id, to_id, day, at)
    select p_me, (h.one->>'id')::uuid, town.day_of(p_now), to_timestamp(p_now / 1000.0)
      from jsonb_array_elements(v_left) with ordinality as h(one, at) order by h.at
    on conflict (from_id, to_id, day) do nothing;
  return jsonb_build_object('ok', true, 'thanked', (select jsonb_agg(h.one->>'id' order by h.at) from jsonb_array_elements(v_left) with ordinality as h(one, at)));
end;
$function$;

-- town.thanks_board(p_me uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.thanks_board(p_me uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_listed integer := (town.cat('thanks')->>'listed')::integer;
  v_day integer := town.day_of(p_now);
  v_week integer := town.week_of(p_now);
  v_today jsonb;
  v_top jsonb;
  v_ever jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', t.from_id, 'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) order by t.at, t.from_id::text collate "C"), '[]'::jsonb)
    into v_today from public.town_thanks t join public.profiles pr on pr.id = t.from_id where t.to_id = p_me and t.day = v_day;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.to_id, 'name', q.name, 'n', q.n) order by q.n desc, q.id_text), '[]'::jsonb) into v_top
    from (select t.to_id, count(*)::integer as n, t.to_id::text collate "C" as id_text, max(coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) as name
            from public.town_thanks t join public.profiles pr on pr.id = t.to_id
           where town.week_of(round(extract(epoch from t.at) * 1000)::bigint) = v_week
           group by t.to_id order by count(*) desc, t.to_id::text collate "C" limit v_listed) q;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.to_id, 'name', q.name, 'n', q.n) order by q.n desc, q.id_text), '[]'::jsonb) into v_ever
    from (select t.to_id, count(*)::integer as n, t.to_id::text collate "C" as id_text, max(coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) as name
            from public.town_thanks t join public.profiles pr on pr.id = t.to_id
           group by t.to_id order by count(*) desc, t.to_id::text collate "C" limit v_listed) q;
  return jsonb_build_object('today', v_today,
    'week', (select count(*)::integer from public.town_thanks t where t.to_id = p_me and town.week_of(round(extract(epoch from t.at) * 1000)::bigint) = v_week),
    'all', (select count(*)::integer from public.town_thanks t where t.to_id = p_me),
    'top', v_top, 'ever', v_ever);
end;
$function$;

-- town.thing(p_key text, p_hold boolean)
CREATE OR REPLACE FUNCTION town.thing(p_key text, p_hold boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  doc jsonb;
begin
  if p_hold then select t.doc into doc from public.town_things t where t.key = p_key for update;
  else select t.doc into doc from public.town_things t where t.key = p_key; end if;
  return doc;
end;
$function$;

-- town.things_of(p_things jsonb)
CREATE OR REPLACE FUNCTION town.things_of(p_things jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$ select coalesce(jsonb_object_agg(x->>0, x->1), '{}'::jsonb) from jsonb_array_elements(town.tidy(p_things)) x $function$;

-- town.tidy(p_things jsonb)
CREATE OR REPLACE FUNCTION town.tidy(p_things jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(jsonb_agg(jsonb_build_array(t.id, t.n) order by t.id collate "C"), '[]'::jsonb)
    from (select x->>0 as id, sum((x->>1)::double precision) as n
            from jsonb_array_elements(p_things) x where (x->>1)::double precision > 0 group by x->>0) t
$function$;

-- town.tidy_give(p_give jsonb)
CREATE OR REPLACE FUNCTION town.tidy_give(p_give jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(jsonb_agg(jsonb_build_array(t.id, t.n) order by t.first), '[]'::jsonb)
    from (select x.v->>0 as id, sum((x.v->>1)::numeric) as n, min(x.ord) as first
            from jsonb_array_elements(p_give) with ordinality x(v, ord), (select town.cat('items') as items) i
           where i.items ? (x.v->>0) and (x.v->>1)::numeric = floor((x.v->>1)::numeric) and (x.v->>1)::numeric > 0
           group by x.v->>0) t
$function$;

-- town.tidy_note(p_text text)
CREATE OR REPLACE FUNCTION town.tidy_note(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when t.s = '' or char_length(t.s) > 80 then null else t.s end
    from (select btrim(regexp_replace(regexp_replace(coalesce(p_text, ''), '[' || chr(1) || '-' || chr(31) || chr(127) || ']', ' ', 'g'), ' +', ' ', 'g'), ' ') as s) t
$function$;

-- town.timing_said(p_timing jsonb)
CREATE OR REPLACE FUNCTION town.timing_said(p_timing jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select jsonb_build_object(
    'hits', case when jsonb_typeof(s.said->'hits') = 'number' then least(greatest((s.said->>'hits')::numeric, 0), 1000) end,
    'misses', case when jsonb_typeof(s.said->'misses') = 'number' then least(greatest((s.said->>'misses')::numeric, 0), 1000) end,
    'secs', case when jsonb_typeof(s.said->'secs') = 'number' then least(greatest((s.said->>'secs')::numeric, 0), 3600) end)
    from (select town.claims(p_timing) as said) s
$function$;

-- town.to_thank(p_me uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.to_thank(p_me uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, p.helpers), '{}'::jsonb)
    from (
      select h.x, h.y, jsonb_agg(jsonb_build_object('id', h.helper, 'water', h.water, 'carry', h.carry,
               'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, ''))
               order by h.water + h.carry desc, h.helper::text collate "C") as helpers
        from public.town_plot_help h join public.profiles pr on pr.id = h.helper
       where h.owner = p_me and h.helper <> p_me
         and not exists (select 1 from public.town_thanks t where t.from_id = p_me and t.to_id = h.helper and t.day = town.day_of(p_now))
       group by h.x, h.y
    ) p
$function$;

-- town.tool_of(p_hand text)
CREATE OR REPLACE FUNCTION town.tool_of(p_hand text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$ select town.cat('farming')->'tools'->>p_hand $function$;

-- town.toss(p_purse jsonb, p_f jsonb, p_me text, p_wish text, p_coins double precision, p_now bigint, p_supply double precision, p_k jsonb)
CREATE OR REPLACE FUNCTION town.toss(p_purse jsonb, p_f jsonb, p_me text, p_wish text, p_coins double precision, p_now bigint, p_supply double precision, p_k jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  today jsonb;
  goal double precision;
  lately jsonb;
  each_ double precision;
  took double precision;
  counted double precision;
  pot double precision;
  by_ jsonb;
  who jsonb;
  running jsonb;
  filled boolean;
  most double precision;
  granted text;
  rest double precision;
begin
  if p_wish is null or not (p_wish = any (town.wishes())) then return town.no('none'); end if;
  if p_coins is null or p_coins <> floor(p_coins) or p_coins < 1 then return town.no('amount'); end if;
  if p_coins > (p_purse->>'coins')::double precision then return town.no('coins'); end if;
  today := town.dawned(p_f, p_now, p_supply, p_k);
  goal := town.goal_of(today, p_k);
  -- tossed together: this coin, and whoever else tossed within the last minute
  select coalesce(jsonb_agg(l.v order by l.ord), '[]'::jsonb) into lately
    from jsonb_array_elements(today->'lately') with ordinality l(v, ord)
   where l.v->>0 <> p_me and p_now - (l.v->>1)::bigint < (p_k->>'within')::double precision * 1000;
  lately := lately || jsonb_build_array(jsonb_build_array(p_me, p_now));
  each_ := case when jsonb_array_length(lately) >= (p_k->>'people')::int then (p_k->>'counts')::double precision else 1 end;
  pot := (today->>'pot')::double precision;
  -- no more than fills the pot; one coin at the least, which is what fills a pot that was full when the day began
  took := case when goal is null then p_coins else least(p_coins, greatest(1::double precision, ceil((goal - pot) / each_))) end;
  counted := case when goal is null then took * each_ else least(took * each_, greatest(goal - pot, 0::double precision)) end;
  by_ := today->'by' || jsonb_build_object(p_wish, coalesce((today->'by'->>p_wish)::double precision, 0) + counted);
  pot := pot + counted;
  who := case when today->'who' ? p_me then today->'who' else today->'who' || to_jsonb(p_me) end;
  -- those that have ended are let go; a coin tossed while one lasts has what is left of it
  select coalesce(jsonb_agg(case when b.v->'of' ? p_me then b.v else b.v || jsonb_build_object('of', b.v->'of' || to_jsonb(p_me)) end order by b.ord), '[]'::jsonb)
    into running from jsonb_array_elements(today->'blessings') with ordinality b(v, ord)
   where (b.v->>'until')::bigint > p_now;
  filled := goal is not null and pot >= goal;
  if filled then
    -- the wish with the most behind it; of two with as much, the one just tossed towards, then the first as they are listed
    select max(coalesce((by_->>w.x)::double precision, 0)) into most from unnest(town.wishes()) w(x);
    if coalesce((by_->>p_wish)::double precision, 0) >= most then granted := p_wish;
    else select w.x into granted from unnest(town.wishes()) with ordinality w(x, ord) where coalesce((by_->>w.x)::double precision, 0) >= most order by w.ord limit 1;
    end if;
  end if;
  rest := case when filled then pot - goal else pot end;
  return jsonb_build_object('ok', true, 'took', took, 'counted', counted, 'granted', granted,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::double precision - took),
    'fountain', today || jsonb_build_object(
      'lately', lately,
      'given', (today->>'given')::int + (case when filled then 1 else 0 end),
      -- a pot filled is empty again; one that held more than its goal when the day began keeps the rest, and whose it is
      'pot', rest,
      'by', case when filled and rest <= 0 then '{}'::jsonb else by_ end,
      'who', case when filled and rest <= 0 then '[]'::jsonb else who end,
      'blessings', case when granted is null then running else running || jsonb_build_array(jsonb_build_object(
        'id', granted, 'from', p_now, 'until', p_now + floor((p_k->>'hours')::double precision * 3600000)::bigint, 'by', p_me, 'of', who)) end));
end;
$function$;

-- town.tossed(p_me uuid, p_wish text, p_coins integer, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.tossed(p_me uuid, p_wish text, p_coins integer, p_doc jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  purse jsonb := town.purse_of(p_me, true);
  f jsonb := town.thing('fountain', true);
  now_ bigint := town.now_ms();
  k jsonb := town.wishing();
  did jsonb;
  mine jsonb;
begin
  did := town.toss(purse, f, p_me::text, p_wish, p_coins, now_, (select coalesce(sum(p.coins), 0) from public.town_purses p)::double precision, k);
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_me, did->'purse');
    perform town.keep_thing('fountain', did->'fountain');
    perform town.note(p_me, 'toss', p_wish, (did->>'took')::numeric, -(did->>'took')::numeric,
      jsonb_build_object('counted', did->'counted') || case when did->>'granted' is null then '{}'::jsonb else jsonb_build_object('granted', did->'granted') end
        || coalesce(p_doc, '{}'::jsonb));
    if did->>'granted' is not null then
      -- (the blessing just given is the fountain's last)
      mine := did->'fountain'->'blessings'->-1;
      insert into public.town_blessings (at, day, round, wish, goal, by_member, people, until)
        values (to_timestamp(now_ / 1000.0), (did->'fountain'->>'day')::int, (did->'fountain'->>'given')::int, did->>'granted',
                town.goal_of(town.dawned(f, now_, 0, k) || jsonb_build_object('first', did->'fountain'->'first'), k)::numeric,
                p_me, jsonb_array_length(mine->'of'), to_timestamp((mine->>'until')::bigint / 1000.0));
    end if;
  end if;
  return did - 'fountain';
end;
$function$;

-- town.under(p_member uuid)
CREATE OR REPLACE FUNCTION town.under(p_member uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when jsonb_array_length(b.ids) > 0 then jsonb_build_object('under', b.ids) else '{}'::jsonb end
    from (select coalesce((select jsonb_agg(x.v->>'id' order by x.ord) from jsonb_array_elements(
            town.blessings_of(coalesce(town.thing('fountain', false), '{}'::jsonb), p_member::text, town.now_ms())) with ordinality x(v, ord)), '[]'::jsonb) as ids) b
$function$;

-- town.unstow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
CREATE OR REPLACE FUNCTION town.unstow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kept jsonb := town.box_roomy(p_box);
  did jsonb;
begin
  if not town.by_box(p_x, p_y) then return town.no('far'); end if;
  did := town.box_move(kept->'things', p_slot, p_n, p_purse->'bag', 'full');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'to'), 'box', kept || jsonb_build_object('things', did->'from'));
end;
$function$;

-- town.unthanked(p_x integer, p_y integer, p_me uuid, p_day integer)
CREATE OR REPLACE FUNCTION town.unthanked(p_x integer, p_y integer, p_me uuid, p_day integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(h.one order by h.at), '[]'::jsonb)
    from jsonb_array_elements(town.helpers_of(p_x, p_y, p_me)) with ordinality as h(one, at)
   where not exists (select 1 from public.town_thanks t where t.from_id = p_me and t.to_id = (h.one->>'id')::uuid and t.day = p_day)
$function$;

-- town.uproot(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_sure boolean, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.uproot(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_sure boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  left_ text := f->>'pulled';
  dead boolean;
  room boolean;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'hoe' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if coalesce(p_plot->'plant', 'null'::jsonb) = 'null'::jsonb then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  dead := (town.see(p_key, p_plot, p_now)->>'dead')::boolean;
  if not dead and not coalesce(p_sure, false) then return town.no('sure'); end if;
  room := dead and town.room(p_purse->'bag', left_) > 0;
  return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb,
    'purse', town.spend(p_purse, (f->'costs'->>'pull')::double precision, p_now)
      || jsonb_build_object('bag', case when room then town.put(p_purse->'bag', left_, 1) else p_purse->'bag' end),
    'got', case when room then jsonb_build_array(jsonb_build_array(left_, 1)) else '[]'::jsonb end);
end;
$function$;

-- town.used_of(p_purse jsonb, p_id text, p_now bigint)
CREATE OR REPLACE FUNCTION town.used_of(p_purse jsonb, p_id text, p_now bigint)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_of(rule->>'per', p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$function$;

-- town.wants(p_day integer, p_stage integer)
CREATE OR REPLACE FUNCTION town.wants(p_day integer, p_stage integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kinds constant text[] := array['fish', 'crop', 'made'];
  wants jsonb := '[]'::jsonb;
  pool text[];
  lo integer;
  hi integer;
  i integer;
begin
  for i in 0..2 loop
    pool := town.asks(kinds[i + 1], p_stage);
    if coalesce(array_length(pool, 1), 0) = 0 then pool := town.asks('fish', p_stage); end if;
    pool := array(select p from unnest(pool) with ordinality u(p, ord)
                   where not exists (select 1 from jsonb_array_elements(wants) w where w->>0 = p) order by ord);
    continue when coalesce(array_length(pool, 1), 0) = 0;
    lo := (town.cat('order')->'n'->kinds[i + 1]->>0)::int;
    hi := (town.cat('order')->'n'->kinds[i + 1]->>1)::int;
    wants := wants || jsonb_build_array(jsonb_build_array(
      pool[1 + floor(town.roll('want', p_day, i) * array_length(pool, 1))::int],
      lo + floor(town.roll('many', p_day, i) * (hi - lo + 1))::int));
  end loop;
  return wants;
end;
$function$;

-- town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
CREATE OR REPLACE FUNCTION town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  slot integer;
  can jsonb;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'can' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean or ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null)
     or (town.growing(p, p_now)->>'spent')::boolean then return town.no('soil'); end if;
  if (seen->>'wet')::boolean then return town.no('wet'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = p_hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('dry'); end if;
  can := p_purse->'bag'->slot;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision
        + ((f->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f->'field'->>p_hand)::double precision, 1::double precision)
          * (1::double precision + town.buff_by(p_purse, p_now, 'green')))),
    'purse', town.spend(p_purse, (f->'costs'->>'water')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text], can || jsonb_build_object('water', (can->>'water')::numeric - (case when town.has_buff(p_purse, p_now, 'spring') then 0 else 1 end)))));
end;
$function$;

-- town.water_kind(p_at bigint)
CREATE OR REPLACE FUNCTION town.water_kind(p_at bigint)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case
    when town.raining(p_at) then 'rain'
    when town.hour_at(p_at) >= (w.k->'dawn'->>0)::double precision and town.hour_at(p_at) < (w.k->'dawn'->>1)::double precision then 'dawn'
    when (town.hour_at(p_at) >= (w.k->'night'->>0)::double precision or town.hour_at(p_at) < (w.k->'night'->>1)::double precision) and town.full_moon(p_at) then 'moon'
  end
    from (select town.cat('waters') as k) w
$function$;

-- town.wear(p_purse jsonb, p_slot integer)
CREATE OR REPLACE FUNCTION town.wear(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  more integer;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  bag jsonb;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  more := (town.cat('carries')->>(s->>'item'))::int;
  if more is null then return town.no('none'); end if;
  if wears ? (s->>'item') then return town.no('worn'); end if;
  bag := jsonb_set(p_purse->'bag', array[p_slot::text],
    case when (s->>'n')::int > 1 then s || jsonb_build_object('n', (s->>'n')::int - 1) else 'null'::jsonb end);
  bag := bag || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, more));
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag, 'wears', wears || to_jsonb(s->>'item')));
end;
$function$;

-- town.wearing(p_purse jsonb, p_id text)
CREATE OR REPLACE FUNCTION town.wearing(p_purse jsonb, p_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ select town.gifts_of(p_purse)->'charms' ? p_id $function$;

-- town.week_of(p_now bigint)
CREATE OR REPLACE FUNCTION town.week_of(p_now bigint)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$ select ((((p_now + 7 * 3600000::bigint) / 86400000) + 3) / 7)::integer $function$;

-- town.well_book(p_member uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.well_book(p_member uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  w jsonb := town.cat('well');
  v_day integer := town.day_of(p_now);
  v_from timestamptz := to_timestamp((v_day::bigint * 86400000 - 7 * 3600000::bigint + (town.cat('rules')->>'dawn')::integer * 3600000::bigint) / 1000.0);
  v_till timestamptz := v_from + interval '1 day';
  v_buckets integer := 0;
  v_taken integer[] := '{}';
  v_today integer;
  v_waterings integer;
  v_plants integer;
  v_people integer;
  v_watered integer;
  v_helped integer;
  v_pots integer;
  v_cooks integer;
  v_carriers jsonb;
  v_water jsonb := town.well_water_told(p_now);
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = p_member;
  v_buckets := coalesce(v_buckets, 0);
  v_taken := coalesce(v_taken, '{}');
  select coalesce(sum(floor(d.n)), 0)::integer into v_today
    from public.town_deeds d where d.member_id = p_member and d.at >= v_from and d.at < v_till and d.n >= 1
     and (d.what in ('pour', 'yard', 'line') or (d.what = 'ditch' and d.thing is not null));
  select coalesce(sum(r.n), 0)::integer, count(*)::integer, count(distinct r.owner)::integer into v_waterings, v_plants, v_people
    from public.town_well_reach r where r.day = v_day and r.carrier = p_member;
  select count(*)::integer, count(distinct d.doc->>'whose')::integer into v_watered, v_helped
    from public.town_deeds d where d.member_id = p_member and d.what = 'water' and d.at >= v_from and d.at < v_till and d.doc ? 'whose';
  select coalesce(sum(r.n), 0)::integer, count(*)::integer into v_pots, v_cooks
    from public.town_yard_reach r where r.day = v_day and r.carrier = p_member;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name, 'buckets', q.buckets, 'rank', town.well_rank(q.total)) order by q.first_at, q.id_text), '[]'::jsonb)
    into v_carriers
    from (
      select t.member_id, t.buckets, t.first_at, t.member_id::text collate "C" as id_text,
             coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name, coalesce(c.buckets, 0) as total
        from (select d.member_id, sum(floor(d.n))::integer as buckets, min(d.at) as first_at
                from public.town_deeds d
               where d.at >= v_from and d.at < v_till and d.n >= 1 and d.member_id is not null
                 and (d.what in ('pour', 'yard', 'line') or (d.what = 'ditch' and d.thing is not null))
               group by d.member_id) t
        join public.profiles pr on pr.id = t.member_id
        left join public.town_carriers c on c.member_id = t.member_id
       order by t.first_at, t.member_id::text collate "C"
       limit (w->>'listed')::integer
    ) q;
  return jsonb_build_object(
    'buckets', v_buckets, 'rank', town.well_rank(v_buckets), 'towards', town.well_towards(v_buckets), 'gift', town.well_due(v_buckets, v_taken) is not null,
    'today', jsonb_build_object('buckets', v_today, 'waterings', v_waterings, 'plants', v_plants, 'people', v_people, 'watered', v_watered, 'helped', v_helped)
      || case when v_cooks > 0 then jsonb_build_object('pots', v_pots, 'cooks', v_cooks) else '{}'::jsonb end,
    'carriers', v_carriers)
    || case when jsonb_typeof(v_water) = 'object' then jsonb_build_object('water', v_water || jsonb_build_object('name',
         coalesce((select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') from public.profiles pr where pr.id = (v_water->>'by')::uuid), ''))) else '{}'::jsonb end;
end;
$function$;

-- town.well_deed()
CREATE OR REPLACE FUNCTION town.well_deed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    perform town.well_seen(new.member_id, round(extract(epoch from new.at) * 1000)::bigint, new.what, new.thing, new.n, new.doc);
  exception when others then
    raise warning 'the well''s book missed line %: %', new.id, sqlerrm;
  end;
  return null;
end;
$function$;

-- town.well_due(p_buckets integer, p_taken integer[])
CREATE OR REPLACE FUNCTION town.well_due(p_buckets integer, p_taken integer[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select g.gift
    from jsonb_array_elements(town.cat('well')->'gifts') with ordinality as g(gift, at)
   where (g.gift->>0)::integer <= town.well_rank(p_buckets)
     and not ((g.gift->>0)::integer = any (coalesce(p_taken, '{}')))
   order by g.at limit 1
$function$;

-- town.well_poured(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.well_poured(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', least(p_now + (k->>'most')::bigint * 60000, v_from + p_n::bigint * (k->>'lasts')::bigint * 60000));
end;
$function$;

-- town.well_rank(p_buckets integer)
CREATE OR REPLACE FUNCTION town.well_rank(p_buckets integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$ select count(*)::integer from jsonb_array_elements_text(town.cat('well')->'ranks') r where coalesce(p_buckets, 0) >= r::integer $function$;

-- town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_n integer;
  v_lot bigint;
  v_lot_by uuid;
  v_lot_has integer;
  v_can text;
  v_carrier uuid;
  v_waterings integer;
  v_owner uuid;
  v_x integer;
  v_y integer;
  v_to uuid;
  v_hands uuid[];
  v_most integer;
  v_kind text;
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
    -- (water with a nature gives it to the well for a while)
    select l.kind into v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    if v_kind is not null then
      perform town.keep_thing('well_water', coalesce(town.well_poured(town.thing('well_water', true), v_kind, v_n, p_member, p_at), 'null'::jsonb));
    end if;
  elsif p_what in ('ditch', 'yard') then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 or (p_what = 'ditch' and p_thing is null) then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    if p_what = 'ditch' then
      insert into public.town_well_cans (member_id, item, carrier, waterings)
        values (p_member, p_thing, p_member, greatest(0, floor(coalesce((p_doc->>'plants')::numeric, 0))::integer))
        on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
    else
      insert into public.town_yard_water (member_id, buckets) values (p_member, v_n);
    end if;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
  elsif p_what = 'line' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
  elsif p_what = 'draw' then
    if p_thing is not null then
      delete from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
      -- (the nature of the moment it was drawn at, when it has one: nobody's hands are on it yet)
      v_kind := town.water_kind(p_at);
      if v_kind is not null then
        insert into public.town_line_water (member_id, item, hands, kind) values (p_member, p_thing, '{}', v_kind);
      end if;
    end if;
  elsif p_what = 'pass' then
    v_to := (p_doc->>'to')::uuid;
    if p_thing is null or v_to is null or p_doc->>'into' is null or floor(coalesce(p_n, 0)) <= 0 then return; end if;
    select l.hands, l.kind into v_hands, v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    -- (whoever takes it is the last of them, once; only the last so many are remembered; a bucket nobody's hands were on yet begins with its giver's)
    v_hands := array_remove(case when coalesce(cardinality(v_hands), 0) = 0 then array[p_member] else v_hands end, v_to) || v_to;
    v_most := (town.cat('line')->>'hands')::integer;
    if array_length(v_hands, 1) > v_most then v_hands := v_hands[array_length(v_hands, 1) - v_most + 1:]; end if;
    -- (the water's nature goes with it)
    insert into public.town_line_water (member_id, item, hands, kind) values (v_to, p_doc->>'into', v_hands, v_kind)
      on conflict (member_id, item) do update set hands = excluded.hands, kind = excluded.kind;
  elsif p_what = 'fresh' then
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_yard_water w order by w.id limit 1 for update;
    if v_lot is null then return; end if;
    if v_lot_has > 1 then update public.town_yard_water w set buckets = w.buckets - 1 where w.id = v_lot;
    else delete from public.town_yard_water w where w.id = v_lot; end if;
    if v_lot_by is null or v_lot_by = p_member then return; end if;
    insert into public.town_yard_reach (day, carrier, cook, n) values (town.day_of(p_at), v_lot_by, p_member, 1)
      on conflict (day, carrier, cook) do update set n = public.town_yard_reach.n + 1;
  elsif p_what = 'fill' then
    if p_thing is null then return; end if;
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_well_water w order by w.id limit 1 for update;
    if v_lot is not null then
      if v_lot_has > 1 then update public.town_well_water w set buckets = w.buckets - 1 where w.id = v_lot;
      else delete from public.town_well_water w where w.id = v_lot; end if;
    end if;
    insert into public.town_well_cans (member_id, item, carrier, waterings)
      values (p_member, p_thing, v_lot_by, coalesce((town.cat('farming')->'cans'->>p_thing)::integer, 0))
      on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
  elsif p_what = 'water' then
    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);
    if jsonb_typeof(p_doc->'tile') = 'array' then
      v_x := (p_doc->'tile'->>0)::integer;
      v_y := (p_doc->'tile'->>1)::integer;
    end if;
    if v_owner <> p_member and v_x is not null then
      -- (a plant of somebody else's than the one the plot's helpers helped: theirs are forgotten)
      delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
      insert into public.town_plot_help (x, y, helper, owner, water) values (v_x, v_y, p_member, v_owner, 1)
        on conflict (x, y, helper) do update set water = public.town_plot_help.water + 1;
    end if;
    v_can := p_doc->>'with';
    if v_can is null then return; end if;
    select c.carrier, c.waterings into v_carrier, v_waterings from public.town_well_cans c where c.member_id = p_member and c.item = v_can for update;
    if v_waterings is null or v_waterings <= 0 then return; end if;
    update public.town_well_cans c set waterings = c.waterings - 1 where c.member_id = p_member and c.item = v_can;
    if v_carrier is null or v_carrier = v_owner or v_x is null then return; end if;
    insert into public.town_well_reach (day, carrier, x, y, owner, n)
      values (town.day_of(p_at), v_carrier, v_x, v_y, v_owner, 1)
      on conflict (day, carrier, x, y) do update set n = public.town_well_reach.n + 1, owner = excluded.owner;
    delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
    insert into public.town_plot_help (x, y, helper, owner, carry) values (v_x, v_y, v_carrier, v_owner, 1)
      on conflict (x, y, helper) do update set carry = public.town_plot_help.carry + 1;
  elsif p_what = 'sow' then
    if jsonb_typeof(p_doc->'tile') = 'array' then
      delete from public.town_plot_help h where h.x = (p_doc->'tile'->>0)::integer and h.y = (p_doc->'tile'->>1)::integer;
    end if;
  end if;
end;
$function$;

-- town.well_take(p_purse jsonb, p_buckets integer, p_taken integer[])
CREATE OR REPLACE FUNCTION town.well_take(p_purse jsonb, p_buckets integer, p_taken integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  due jsonb := town.well_due(p_buckets, p_taken);
begin
  if due is null then return town.no('none'); end if;
  if town.room(p_purse->'bag', due->>1) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'gift', due->>1, 'rank', (due->>0)::integer,
    'purse', p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', due->>1, 1)));
end;
$function$;

-- town.well_towards(p_buckets integer)
CREATE OR REPLACE FUNCTION town.well_towards(p_buckets integer)
 RETURNS double precision
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  marks jsonb := town.cat('well')->'ranks';
  v_rank integer := town.well_rank(p_buckets);
  v_from integer := case when v_rank > 0 then (marks->>(v_rank - 1))::integer else 0 end;
  v_to integer := (marks->>v_rank)::integer;
begin
  if v_to is null then return 1; end if;
  return greatest(0, least(1, (coalesce(p_buckets, 0) - v_from)::double precision / (v_to - v_from)));
end;
$function$;

-- town.well_water_told(p_now bigint)
CREATE OR REPLACE FUNCTION town.well_water_told(p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when jsonb_typeof(t.doc) = 'object' and (t.doc->>'until')::bigint > p_now then t.doc else 'null'::jsonb end
    from (select (select x.doc from public.town_things x where x.key = 'well_water') as doc) t
$function$;

-- town.wet_ms(p_from bigint, p_to bigint)
CREATE OR REPLACE FUNCTION town.wet_ms(p_from bigint, p_to bigint)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(least(p_to, (w.slot + 1) * 900000) - greatest(p_from, w.slot * 900000)), 0)::bigint
    from public.town_weather w
   where p_to > p_from
     and w.slot >= floor(p_from::numeric / 900000)::bigint and w.slot * 900000 < p_to
     and town.wet_sky(w.sky)
$function$;

-- town.wet_sky(p_sky text)
CREATE OR REPLACE FUNCTION town.wet_sky(p_sky text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select p_sky in ('drizzle', 'rain', 'storm') $function$;

-- town.wild_fits(p_what jsonb, p_id text, p_place text, p_zone text, p_at bigint, p_word text)
CREATE OR REPLACE FUNCTION town.wild_fits(p_what jsonb, p_id text, p_place text, p_zone text, p_at bigint, p_word text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  h double precision;
begin
  if p_what ? 'places' and not p_what->'places' ? p_place then return false; end if;
  if p_what ? 'zones' and (p_zone is null or not p_what->'zones' ? p_zone) then return false; end if;
  if p_what ? 'hours' then
    h := town.hour_at(p_at);
    if not exists (select 1 from jsonb_array_elements(p_what->'hours') r where h >= (r->>0)::double precision and h < (r->>1)::double precision) then return false; end if;
  end if;
  if p_what ? 'rain' and town.wet_ms(p_at - ((p_what->>'rain')::double precision * 3600000)::bigint, p_at) <= 0 then return false; end if;
  if coalesce((p_what->>'dry')::boolean, false) and town.wet_ms(p_at - 1800000, p_at) > 0 then return false; end if;
  if p_what ? 'day' and not town.roll(p_word || ':day:' || p_id, town.day_of(p_at)::bigint) < (p_what->>'day')::double precision then return false; end if;
  if coalesce((p_what->>'moon')::boolean, false) and not town.full_moon(p_at) then return false; end if;
  return true;
end;
$function$;

-- town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb, p_word text)
CREATE OR REPLACE FUNCTION town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := f->'spots'->p_spot;
  kind jsonb := f->'kinds'->(spot->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  finds jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick jsonb := null;
  i integer;
  lo integer;
  hi integer;
begin
  if p_spot is null or p_spot < 0 or spot is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('phase', p_spot) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision then return null; end if;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    fits := fits || town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':what', p_spot, turn) * total;
  for i in 0..jsonb_array_length(finds) - 1 loop
    if fits[i + 1] then
      pick := finds->i;
      left_ := left_ - (pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  lo := (pick->'n'->>0)::int;
  hi := (pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
    'until', (turn + 1) * every - phase);
end;
$function$;

-- town.wishes()
CREATE OR REPLACE FUNCTION town.wishes()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['calm', 'keen', 'lucky', 'hearty', 'green', 'swift', 'clear', 'spring', 'sprout', 'feast', 'carry', 'forage', 'net'] $function$;

-- town.wishing()
CREATE OR REPLACE FUNCTION town.wishing()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'share', coalesce((select k.value from public.town_knobs k where k.key = 'wish_share'), 30) / 1000.0,
    'least', coalesce((select k.value from public.town_knobs k where k.key = 'wish_least'), 100),
    'rounds', coalesce((select k.value from public.town_knobs k where k.key = 'wish_rounds'), 3),
    'more', coalesce((select k.value from public.town_knobs k where k.key = 'wish_more'), 200) / 100.0,
    'hours', coalesce((select k.value from public.town_knobs k where k.key = 'wish_minutes'), 180) / 60.0,
    'people', coalesce((select k.value from public.town_knobs k where k.key = 'wish_people'), 3),
    'within', coalesce((select k.value from public.town_knobs k where k.key = 'wish_within'), 60),
    'counts', coalesce((select k.value from public.town_knobs k where k.key = 'wish_counts'), 150) / 100.0,
    'swift', coalesce((select k.value from public.town_knobs k where k.key = 'wish_swift'), 40) / 100.0,
    'sprout', coalesce((select k.value from public.town_knobs k where k.key = 'wish_sprout'), 15) / 100.0,
    'feast', coalesce((select k.value from public.town_knobs k where k.key = 'wish_feast'), 1),
    'carry', coalesce((select k.value from public.town_knobs k where k.key = 'wish_carry'), 1))
$function$;

-- town.word()
CREATE OR REPLACE FUNCTION town.word()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ select word from public.town_secrets where key = 'wild' $function$;

-- town.work_answer(p_member uuid)
CREATE OR REPLACE FUNCTION town.work_answer(p_member uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('now', town.now_ms(), 'gifting', true,
    'gives', (select coalesce(jsonb_agg(k.id order by k.id), '[]'::jsonb) from jsonb_object_keys(town.cat('gifts')->'gifts') as k(id)),
    'lines', town.work_told(p_member, town.now_ms()),
    'worn', (select jsonb_build_object('line', t.line, 'rank', t.rank) from public.town_titles t where t.member_id = p_member),
    'titles', (select coalesce(jsonb_object_agg(t.member_id::text, jsonb_build_object('line', t.line, 'rank', t.rank)), '{}'::jsonb) from public.town_titles t))
$function$;

-- town.work_count(p_kept jsonb, p_c jsonb, p_day integer)
CREATE OR REPLACE FUNCTION town.work_count(p_kept jsonb, p_c jsonb, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  first_ double precision := (town.cat('work')->>'first')::double precision;
  on_ jsonb := case when (p_kept->>'day')::integer = p_day then p_kept else p_kept || jsonb_build_object('day', p_day, 'today', 0, 'held', '{}'::jsonb) end;
  raw double precision := greatest(0::double precision, (p_c->>'raw')::double precision);
  held jsonb := on_->'held';
  firsts jsonb := on_->'firsts';
  key_ text;
  had integer;
begin
  if jsonb_typeof(p_c->'held') = 'object' then
    key_ := p_c->'held'->>'key';
    had := coalesce((held->>key_)::integer, 0);
    if had >= (p_c->'held'->>'most')::integer then raw := 0; else held := held || jsonb_build_object(key_, had + 1); end if;
  end if;
  if p_c ? 'first' and jsonb_typeof(p_c->'first') = 'string' and not (firsts ? (p_c->>'first')) then
    raw := raw + first_;
    firsts := firsts || jsonb_build_array(p_c->>'first');
  end if;
  if raw <= 0 then return on_ || jsonb_build_object('held', held, 'firsts', firsts); end if;
  return jsonb_build_object(
    'points', (on_->>'points')::double precision + town.work_counted_on(p_c->>'line', (on_->>'today')::double precision, raw),
    'day', p_day, 'today', (on_->>'today')::double precision + raw, 'held', held, 'firsts', firsts);
end;
$function$;

-- town.work_counted(p_member uuid, p_done jsonb, p_at bigint)
CREATE OR REPLACE FUNCTION town.work_counted(p_member uuid, p_done jsonb, p_at bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  c jsonb;
  who uuid;
  day_ integer := town.day_of(p_at);
begin
  for c in select x from jsonb_array_elements(town.work_counts_of(p_done, p_member::text)) as t(x) loop
    begin
      who := coalesce((c->>'to')::uuid, p_member);
      update public.town_work w set kept = town.work_count(w.kept, c, day_) where w.member_id = who and w.line = c->>'line';
      if not found then
        insert into public.town_work (member_id, line, kept) values (who, c->>'line', town.work_count(town.work_new(), c, day_))
          on conflict (member_id, line) do update set kept = town.work_count(public.town_work.kept, c, day_);
      end if;
    exception when others then null;
    end;
  end loop;
end;
$function$;

-- town.work_counted_on(p_line text, p_today double precision, p_add double precision)
CREATE OR REPLACE FUNCTION town.work_counted_on(p_line text, p_today double precision, p_add double precision)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
  select case when p_add <= 0 then 0::double precision else f.full_ + (p_add - f.full_) * (c.l->>'past')::double precision end
    from (select town.cat('work') as l) c,
         lateral (select greatest(0::double precision, least(p_add, (c.l->'day'->>p_line)::double precision - greatest(0::double precision, p_today))) as full_) f
$function$;

-- town.work_counts_of(p_done jsonb, p_doer text)
CREATE OR REPLACE FUNCTION town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  return '[]'::jsonb;
end;
$function$;

-- town.work_deed()
CREATE OR REPLACE FUNCTION town.work_deed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- (a line never stands in the way of the deed it counts)
  begin
    if new.member_id is not null then
      perform town.work_counted(new.member_id, town.work_done(new.member_id, new.what, new.thing, new.n, new.doc), floor(extract(epoch from new.at) * 1000)::bigint);
    end if;
  exception when others then null;
  end;
  return new;
end;
$function$;

-- town.work_done(p_member uuid, p_what text, p_thing text, p_n numeric, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.work_done(p_member uuid, p_what text, p_thing text, p_n numeric, p_doc jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  doc jsonb := coalesce(p_doc, '{}'::jsonb);
  owner_ uuid;
begin
  if p_what in ('clear', 'till') and not (doc ? 'whose') and jsonb_typeof(doc->'tile') = 'array' then
    -- (a tile that is no tile says whose nothing is)
    begin
      select b.member_id into owner_ from public.town_beds b where b.bed = town.bed_of((doc->'tile'->>0)::integer, (doc->'tile'->>1)::integer);
    exception when others then owner_ := null;
    end;
    if owner_ is not null and owner_ <> p_member then doc := doc || jsonb_build_object('owner', owner_::text); end if;
  end if;
  return jsonb_build_object('from', 'deed', 'what', p_what, 'thing', p_thing, 'n', coalesce(p_n, 1), 'doc', doc);
end;
$function$;

-- town.work_new()
CREATE OR REPLACE FUNCTION town.work_new()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$ select '{"points": 0, "day": -1, "today": 0, "held": {}, "firsts": []}'::jsonb $function$;

-- town.work_play()
CREATE OR REPLACE FUNCTION town.work_play()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    if new.member_id is not null then
      perform town.work_counted(new.member_id, town.work_went(new.member_id, new.game, new.won, new.doc), floor(extract(epoch from new.at) * 1000)::bigint);
    end if;
  exception when others then null;
  end;
  return new;
end;
$function$;

-- town.work_rank(p_line text, p_points double precision)
CREATE OR REPLACE FUNCTION town.work_rank(p_line text, p_points double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select count(*)::integer from jsonb_array_elements_text(coalesce(town.cat('work')->'marks'->p_line, '[]'::jsonb)) m where p_points >= m::double precision
$function$;

-- town.work_told(p_member uuid, p_now bigint)
CREATE OR REPLACE FUNCTION town.work_told(p_member uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_object_agg(i.id, case when i.id = 'well'
      then jsonb_build_object(
        'points', coalesce((select c.buckets from public.town_carriers c where c.member_id = p_member), 0),
        'today', coalesce((select sum(d.n) from public.town_deeds d
                            where d.member_id = p_member and d.what = 'pour' and d.at > to_timestamp(p_now / 1000.0) - interval '2 days'
                              and town.day_of(floor(extract(epoch from d.at) * 1000)::bigint) = town.day_of(p_now)), 0))
      else jsonb_build_object(
        'points', coalesce((k.kept->>'points')::double precision, 0),
        'today', case when (k.kept->>'day')::integer = town.day_of(p_now) then coalesce((k.kept->>'today')::double precision, 0) else 0 end) end)
    from jsonb_array_elements_text(town.cat('work')->'ids') as i(id)
    left join public.town_work k on k.member_id = p_member and k.line = i.id
$function$;

-- town.work_went(p_member uuid, p_game text, p_won boolean, p_doc jsonb)
CREATE OR REPLACE FUNCTION town.work_went(p_member uuid, p_game text, p_won boolean, p_doc jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when p_game = 'farming'
    then town.work_done(p_member, p_doc->>'what', null, 1, jsonb_build_object('tile', p_doc->'tile'))
    else jsonb_build_object('from', 'play', 'what', p_game, 'thing', p_doc->>'what', 'n', 1, 'won', p_won, 'doc', '{}'::jsonb) end
$function$;

-- town.yard_fresh()
CREATE OR REPLACE FUNCTION town.yard_fresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  dish text := new.doc->>'what';
  jar integer;
  doc jsonb;
  did jsonb;
begin
  begin
    if new.member_id is null or not coalesce(town.takes_water(dish), false) then return null; end if;
    jar := (town.thing('yard', true) #>> '{}')::integer;
    if jar is null or jar < 1 then return null; end if;
    select p.doc into doc from public.town_purses p where p.member_id = new.member_id for update;
    did := town.yard_freshen(doc, dish, jar);
    if (did->>'fresh')::boolean then
      update public.town_purses p set doc = did->'purse', updated_at = now() where p.member_id = new.member_id;
      perform town.keep_thing('yard', did->'jar');
      perform town.note(new.member_id, 'fresh', dish, 1, 0, jsonb_build_object('jar', did->'jar'));
    end if;
  exception when others then
    raise warning 'the yard''s jar missed play %: %', new.id, sqlerrm;
  end;
  return null;
end;
$function$;

-- town.yard_freshen(p_purse jsonb, p_made text, p_jar integer)
CREATE OR REPLACE FUNCTION town.yard_freshen(p_purse jsonb, p_made text, p_jar integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  slot integer;
begin
  if not coalesce(town.takes_water(p_made), false) or coalesce(p_jar, 0) < 1 then return jsonb_build_object('purse', p_purse, 'jar', p_jar, 'fresh', false); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality s(v, ord)
   where s.v->>'item' = 'potFull' and s.v->'of'->>'dish' = p_made order by s.ord limit 1;
  if slot is null then return jsonb_build_object('purse', p_purse, 'jar', p_jar, 'fresh', false); end if;
  return jsonb_build_object('fresh', true, 'jar', p_jar - 1,
    'purse', jsonb_set(p_purse, array['bag', slot::text, 'of', 'left'], to_jsonb((p_purse->'bag'->slot->'of'->>'left')::int + (town.cat('yard')->>'gives')::int)));
end;
$function$;

-- town.yard_pour(p_purse jsonb, p_jar integer, p_now bigint)
CREATE OR REPLACE FUNCTION town.yard_pour(p_purse jsonb, p_jar integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  y jsonb := town.cat('yard');
  hand text := town.hand_of(p_purse);
  slot integer;
  has integer;
  pours integer;
begin
  if hand is null or not (town.cat('farming')->'buckets' ? hand) or p_jar >= (y->>'holds')::int then return town.no('none'); end if;
  select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('none'); end if;
  pours := least(has, (y->>'holds')::int - p_jar);
  return jsonb_build_object('ok', true, 'jar', p_jar + pours, 'poured', pours,
    'purse', town.spend(p_purse, (y->>'cost')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
           case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$function$;

-- town.yield_of(p_key text, p_plant jsonb, p_hand text)
CREATE OR REPLACE FUNCTION town.yield_of(p_key text, p_plant jsonb, p_hand text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select ((c.crop->'yield'->>0)::int
    + floor(town.roll(p_key, (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint)
        * ((c.crop->'yield'->>1)::int - (c.crop->'yield'->>0)::int + 1)::double precision)::int
    + case when p_hand is not null
            and p_hand = c.f->'blades'->>(case when (c.crop->>'picks')::int >= (c.f->>'tree')::int then 'tree' else 'plant' end) then 1 else 0 end)::integer
    from (select town.cat('crops')->(p_plant->>'crop') as crop, town.cat('farming') as f) c
$function$;
