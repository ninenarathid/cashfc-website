-- v195 — less work when the town is read
-- Run in the Supabase SQL Editor after v179. Running it again is safe.
-- It does not depend on the pending profession expansions. Run it again if
-- an older pending migration subsequently replaces one of these readers.
--
-- The 2026-10-10 diagnostic found town_bugs averaging 373 ms across 139,347
-- calls. Every viewer calculated every haunt independently. Share only the
-- world calculations: catches, shares, secret-spot access, purses and clocks
-- remain checked in the original RPC. Three cache rows is the entire limit.
-- Turn fingerprints and light/recovery deadlines prevent crossing a game
-- boundary; source writes invalidate within their transaction. The same
-- advisory lock orders a cache fill against its invalidation.
begin;

create table if not exists town.read_cache (
  key_ text primary key check (key_ in ('bugs', 'wild', 'cave')),
  stamp text not null,
  from_ms bigint not null,
  until_ms bigint not null,
  doc jsonb not null
);
alter table town.read_cache enable row level security;
revoke all on town.read_cache from public, anon, authenticated;

create or replace function town.invalidate_read_cache()
returns trigger language plpgsql security definer set search_path = public
as $$
declare keys_ text[]; cache_key_ text;
begin
  if tg_table_name = 'town_deeds' then
    if tg_op = 'INSERT' and new.what <> 'net' then return null; end if;
    if tg_op = 'DELETE' and old.what <> 'net' then return null; end if;
    if tg_op = 'UPDATE' and new.what <> 'net' and old.what <> 'net' then return null; end if;
    keys_ := array['bugs'];
  elsif tg_table_name = 'town_comebacks' then keys_ := array['bugs'];
  elsif tg_table_name = 'town_cave' then keys_ := array['cave'];
  elsif tg_table_name = 'town_forest_rest' then keys_ := array['wild'];
  else keys_ := array['bugs', 'cave', 'wild'];
  end if;
  foreach cache_key_ in array keys_ loop
    perform pg_advisory_xact_lock(hashtext('town.read_cache'), hashtext(cache_key_));
    delete from town.read_cache c where c.key_ = cache_key_;
  end loop;
  return null;
end;
$$;
revoke all on function town.invalidate_read_cache() from public, anon, authenticated;

do $$
declare table_ text;
begin
  foreach table_ in array array['town_deeds', 'town_comebacks', 'town_cave',
                                'town_catalog', 'town_weather', 'town_secrets', 'town_forest_rest'] loop
    if to_regclass('public.' || table_) is null then continue; end if;
    execute format('drop trigger if exists town_read_cache_changed on public.%I', table_);
    execute format('create trigger town_read_cache_changed after insert or update or delete on public.%I for each row execute function town.invalidate_read_cache()', table_);
    execute format('drop trigger if exists town_read_cache_truncated on public.%I', table_);
    execute format('create trigger town_read_cache_truncated after truncate on public.%I for each statement execute function town.invalidate_read_cache()', table_);
  end loop;
end;
$$;

create or replace function town.shared_read(p_kind text, p_now bigint,
  p_cat jsonb default null, p_word text default null, p_backs jsonb default null)
returns jsonb language plpgsql volatile set search_path = public
as $$
declare
  stamp_ text;
  turns_ jsonb := '[]'::jsonb;
  until_ bigint := p_now + 30000;
  c town.read_cache%rowtype;
  result_ jsonb := '{}'::jsonb;
  spot_ jsonb; rule_ jsonb; has_ jsonb;
  every_ bigint; phase_ bigint; turn_ bigint;
  count_ integer; i integer; boundary_ bigint;
  cacheable_ boolean := true;
begin
  if p_kind not in ('bugs', 'wild', 'cave') or p_kind is null or p_now is null then
    raise exception 'invalid shared reader';
  end if;
  if p_kind in ('bugs', 'wild') then
    count_ := case when p_kind = 'bugs' then jsonb_array_length(p_cat->'haunts')
      else jsonb_array_length(p_cat->'spots') + jsonb_array_length(coalesce(p_cat->'secret'->'spots', '[]'::jsonb)) end;
    for i in 0..count_ - 1 loop
      spot_ := case when p_kind = 'bugs' then p_cat->'haunts'->i
        else coalesce(p_cat->'spots'->i, p_cat->'secret'->'spots'->(i - jsonb_array_length(p_cat->'spots'))) end;
      rule_ := coalesce(p_cat->'kinds'->(spot_->>0), p_cat->'secret'->'kinds'->(spot_->>0));
      every_ := (rule_->>'every')::bigint * 60000;
      phase_ := floor(town.roll(case when p_kind = 'bugs' then 'bugphase' else 'phase' end, i)
        * (rule_->>'every')::double precision)::bigint * 60000;
      turn_ := floor((p_now + phase_)::numeric / every_)::bigint;
      turns_ := turns_ || to_jsonb(turn_);
      until_ := least(until_, (turn_ + 1) * every_ - phase_);
    end loop;
    if p_kind = 'bugs' then
      select least(until_, min((x->>'from')::bigint)) into until_
        from jsonb_array_elements(coalesce(p_backs, '[]'::jsonb)) x
       where (x->>'from')::bigint > p_now;
      stamp_ := md5(jsonb_build_array(p_cat, p_word, p_backs, turns_)::text);
    else
      -- v188 may be run before or after this independent performance file.
      -- If it added recovery without our invalidation trigger, bypass this
      -- cache until v195 is rerun. Never hide a recovery boundary for 30 s.
      if to_regclass('public.town_forest_rest') is not null then
        cacheable_ := exists(select 1 from pg_trigger where tgrelid = 'public.town_forest_rest'::regclass
          and tgname = 'town_read_cache_changed' and not tgisinternal);
        execute 'select min(t) from public.town_forest_rest r cross join lateral (values (r.begins), (r.ends)) v(t) where t > $1'
          into boundary_ using p_now;
        until_ := least(until_, boundary_);
      end if;
      stamp_ := md5(jsonb_build_array(p_cat, p_word, turns_)::text);
    end if;
  else
    stamp_ := md5(jsonb_build_array(town.day_of(p_now), town.mine_turn(p_now), town.cat('mining'))::text);
  end if;

  if cacheable_ then
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return c.doc; end if;
    perform pg_advisory_xact_lock(hashtext('town.read_cache'), hashtext(p_kind));
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return c.doc; end if;
  end if;

  if p_kind in ('bugs', 'wild') then
    for i in 0..count_ - 1 loop
      has_ := case when p_kind = 'bugs' then town.bug_here(i, p_now, p_backs, p_cat, p_word)
        else town.wild_holds(i, p_now, p_cat, p_word) end;
      if has_ is not null then result_ := result_ || jsonb_build_object(i::text, has_); end if;
      if p_kind = 'bugs' then
        has_ := town.cloak_at(i, p_now, p_cat, p_word);
        if has_ is not null then result_ := result_ || jsonb_build_object('cloak:' || i::text, has_); end if;
      end if;
    end loop;
  else
    select coalesce(jsonb_object_agg(f.place::text, town.cave_at(f.doc, p_now)), '{}'::jsonb)
      into result_ from public.town_cave f;
    select least(until_, min((l.value->>'until')::bigint)) into until_
      from jsonb_each(result_) f
      cross join lateral jsonb_array_elements(coalesce(f.value->'torches', '[]'::jsonb)
        || coalesce(f.value->'moss', '[]'::jsonb)) l
     where (l.value->>'until')::bigint > p_now;
  end if;
  if cacheable_ then
    insert into town.read_cache(key_, stamp, from_ms, until_ms, doc)
      values (p_kind, stamp_, p_now, until_, result_)
      on conflict on constraint read_cache_pkey do update
        set stamp = excluded.stamp, from_ms = excluded.from_ms,
            until_ms = excluded.until_ms, doc = excluded.doc;
  end if;
  return result_;
end;
$$;
revoke all on function town.shared_read(text,bigint,jsonb,text,jsonb) from public, anon, authenticated;

-- Patch only the world calculation in the currently installed readers.
-- Their gates, per-member filtering, outputs and newer expansion logic stay
-- in place. Refuse a moved definition instead of replacing it from an old dump.
do $$
declare def_ text;
begin
  def_ := pg_get_functiondef('public.town_bugs()'::regprocedure);
  if position('town.shared_read(' in def_) = 0 then
    if position('  took jsonb;' in def_) = 0 or
      (position('has := town.bug_here(i, now_, backs, ins, word);' in def_) = 0
       and position('has := town.bug_for(cloak, i, now_, backs, ins, word);' in def_) = 0) then
      raise exception 'town_bugs changed: review v195 before applying';
    end if;
    def_ := replace(def_, '  took jsonb;', E'  shared_ jsonb := town.shared_read(''bugs'', now_, ins, word, backs);\n  took jsonb;');
    def_ := replace(def_, 'has := town.bug_here(i, now_, backs, ins, word);', 'has := shared_->i::text;');
    def_ := replace(def_, 'has := town.bug_for(cloak, i, now_, backs, ins, word);',
      'has := coalesce(case when cloak then shared_->(''cloak:'' || i::text) end, shared_->i::text);');
    execute def_;
  end if;
  def_ := pg_get_functiondef('public.town_wild()'::regprocedure);
  if position('town.shared_read(' in def_) = 0 then
    if position('  took jsonb;' in def_) = 0 or position('has := town.wild_holds(i, now_, f, word);' in def_) = 0 then
      raise exception 'town_wild changed: review v195 before applying';
    end if;
    def_ := replace(def_, '  took jsonb;', E'  shared_ jsonb := town.shared_read(''wild'', now_, f, word);\n  took jsonb;');
    def_ := replace(def_, 'has := town.wild_holds(i, now_, f, word);', 'has := shared_->i::text;');
    execute def_;
  end if;
  def_ := pg_get_functiondef('town.cave_told(uuid,jsonb,integer,integer,integer,bigint)'::regprocedure);
  if position('town.shared_read(' in def_) = 0 then
    if position('coalesce((select jsonb_object_agg(c.place::text, town.cave_at(c.doc, p_now)) from public.town_cave c), ''{}''::jsonb)' in def_) = 0 then
      raise exception 'cave_told changed: review v195 before applying';
    end if;
    def_ := replace(def_, 'coalesce((select jsonb_object_agg(c.place::text, town.cave_at(c.doc, p_now)) from public.town_cave c), ''{}''::jsonb)',
      'town.shared_read(''cave'', p_now)');
    def_ := replace(def_, E' STABLE\n', E' VOLATILE\n');
    execute def_;
  end if;
  def_ := pg_get_functiondef('public.town_well_ranks()'::regprocedure);
  if position('town.thanks_board(me, town.now_ms())->''today''' in def_) > 0 then
    def_ := replace(def_, 'town.thanks_board(me, town.now_ms())->''today''',
      '(select coalesce(jsonb_agg(jsonb_build_object(''id'', t.from_id, ''name'', coalesce(pr.character_name, pr.display_name, pr.discord_username, '''')) order by t.at, t.from_id::text collate "C"), ''[]''::jsonb) from public.town_thanks t join public.profiles pr on pr.id = t.from_id where t.to_id = me and t.day = town.day_of(town.now_ms()))');
    execute def_;
  elsif position('from public.town_thanks t join public.profiles pr' in def_) = 0 then
    raise exception 'town_well_ranks changed: review v195 before applying';
  end if;
end;
$$;

-- Empty only these three derived rows on rerun; no game records are removed.
delete from town.read_cache where true;
notify pgrst, 'reload schema';
commit;

-- The SQL Editor returns these checks after applying the file; all should be true.
select jsonb_build_object(
  'rls', (select relrowsecurity from pg_class where oid = 'town.read_cache'::regclass),
  'cache_private', not has_table_privilege('authenticated', 'town.read_cache', 'SELECT'),
  'helper_private', not has_function_privilege('authenticated', 'town.shared_read(text,bigint,jsonb,text,jsonb)', 'EXECUTE'),
  'bounded', (select count(*) <= 3 from town.read_cache),
  'shared_bugs', position('town.shared_read(' in pg_get_functiondef('public.town_bugs()'::regprocedure)) > 0,
  'shared_wild', position('town.shared_read(' in pg_get_functiondef('public.town_wild()'::regprocedure)) > 0,
  'shared_cave', position('town.shared_read(' in pg_get_functiondef('town.cave_told(uuid,jsonb,integer,integer,integer,bigint)'::regprocedure)) > 0,
  'today_only', position('town.thanks_board' in pg_get_functiondef('public.town_well_ranks()'::regprocedure)) = 0
) as v195_verified;

-- What it should say afterwards (read-only):
-- select relrowsecurity from pg_class where oid = 'town.read_cache'::regclass; -- true
-- select has_table_privilege('authenticated','town.read_cache','SELECT'); -- false
-- select has_function_privilege('authenticated','town.shared_read(text,bigint,jsonb,text,jsonb)','EXECUTE'); -- false
-- select count(*) <= 3 as bounded from town.read_cache; -- true
-- select position('town.shared_read(' in pg_get_functiondef('public.town_bugs()'::regprocedure)) > 0 as shared_bugs; -- true
-- select position('town.thanks_board' in pg_get_functiondef('public.town_well_ranks()'::regprocedure)) = 0 as today_only; -- true
