-- v271: the insects' shared look asks far less of the database (2026-10-16).
-- Run after v270. Safe to run twice. No site code goes with it.
--
-- pg_stat_statements on 2026-10-16: public.town_bugs (every page asks it every 45 s) costs the database more time than
-- anything else, 113 ms on average, 108,000 calls; the owner's log shows looks waiting on the cache's lock
-- (town.read_cache). On the bench a look with the cache fresh is 2 ms: the cost is the cache running out. v200 kept one
-- deadline for the whole of it, the next turn of any of the 149 haunts (most turn every seven minutes, each at its own
-- moment), so it lasted some three seconds, and nearly every look rolled every haunt again while the others waited.
-- town.shared_read_data's insects' branch now keeps each haunt's own deadline and rolls again only the haunts whose
-- turn has come. What a look is told is the same (v271.test.mjs: against every haunt rolled afresh, moment by moment).
-- The forest's finds (wild) and the cave are as they were.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' and p.proname='quality_bed_gift' and p.prosrc like '%v270%') then raise exception 'Run v270 before v271'; end if;
-- <guards:v271>
 if md5(replace(pg_get_functiondef('town.shared_read_data(text,bigint,jsonb,text,jsonb)'::regprocedure),chr(13),'')) not in ('839999c646f6c4e34b19c96d858560d5','faecde0b74f8ef85e73f33278091da1c') then raise exception 'Definition changed: town.shared_read_data(text,bigint,jsonb,text,jsonb); rebuild v271'; end if;
-- </guards:v271>
end $$;

CREATE OR REPLACE FUNCTION town.shared_read_data(p_kind text, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text, p_backs jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  -- v200: use the stored turn deadline before rolling every haunt again. (v271: the insects' own branch, below.)
  stamp_ text;
  extra_ jsonb := '{}'::jsonb;
  turns_ jsonb := '[]'::jsonb;
  until_ bigint := p_now + 30000;
  c town.read_cache%rowtype;
  result_ jsonb := '{}'::jsonb;
  spot_ jsonb; rule_ jsonb; has_ jsonb;
  every_ bigint; phase_ bigint; turn_ bigint;
  count_ integer; i integer; boundary_ bigint;
  cacheable_ boolean := true;
  -- v271: each haunt's own deadline, kept beside the insects' cache
  was_ jsonb; us_ bigint[] := '{}'; u_ bigint;
begin
  if p_kind not in ('bugs', 'wild', 'cave') or p_kind is null or p_now is null then
    raise exception 'invalid shared reader';
  end if;
  -- v271: the insects' cache keeps each haunt's own deadline (its next turn; a comeback of its own; a good garden's
  -- haunt, which reads its bed, 30 s at the most, as every haunt was), and a miss works out again only the haunts whose
  -- deadline has come, the rest as they were: with 149 haunts turning every few minutes at their own moments the whole
  -- cache used to last some three seconds, and nearly every page's look rolled them all again under the lock. What a
  -- look is told is the same: a haunt's insect is fixed within its turn but for those. A change of the catalog, the
  -- word or the comebacks (the stamp), or a write the triggers watch (they take the row away), works them all out.
  if p_kind = 'bugs' then
    stamp_ := md5(jsonb_build_array('v271', p_cat, p_word, p_backs)::text);
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return jsonb_build_object('doc', c.doc, 'extra', '{}'::jsonb); end if;
    perform pg_advisory_xact_lock(hashtext('town.read_cache'), hashtext(p_kind));
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return jsonb_build_object('doc', c.doc, 'extra', '{}'::jsonb); end if;
    count_ := jsonb_array_length(p_cat->'haunts');
    if c.stamp = stamp_ and c.from_ms <= p_now and jsonb_typeof(c.extra->'u') = 'array' and jsonb_array_length(c.extra->'u') = count_ then
      result_ := c.doc; was_ := c.extra->'u';
    end if;
    until_ := null;
    for i in 0..count_ - 1 loop
      u_ := case when was_ is not null then (was_->>i)::bigint end;
      if u_ is null or u_ <= p_now then
        result_ := result_ - i::text - ('cloak:' || i::text);
        has_ := town.bug_here(i, p_now, p_backs, p_cat, p_word);
        if has_ is not null then result_ := result_ || jsonb_build_object(i::text, has_); end if;
        has_ := town.cloak_at(i, p_now, p_cat, p_word);
        if has_ is not null then result_ := result_ || jsonb_build_object('cloak:' || i::text, has_); end if;
        spot_ := p_cat->'haunts'->i;
        rule_ := p_cat->'kinds'->(spot_->>0);
        every_ := (rule_->>'every')::bigint * 60000;
        phase_ := floor(town.roll('bugphase', i) * (rule_->>'every')::double precision)::bigint * 60000;
        turn_ := floor((p_now + phase_)::numeric / every_)::bigint;
        u_ := (turn_ + 1) * every_ - phase_;
        select least(u_, min((x->>'from')::bigint)) into u_
          from jsonb_array_elements(coalesce(p_backs, '[]'::jsonb)) x
         where (x->>'haunt')::int = i and (x->>'from')::bigint > p_now;
        if spot_->>0 = 'garden' then u_ := least(u_, p_now + 30000); end if;
      end if;
      us_ := us_ || u_;
      until_ := least(until_, u_);
    end loop;
    insert into town.read_cache(key_, stamp, from_ms, until_ms, doc, extra)
      values (p_kind, stamp_, p_now, until_, result_, jsonb_build_object('u', to_jsonb(us_)))
      on conflict on constraint read_cache_pkey do update
        set stamp = excluded.stamp, from_ms = excluded.from_ms,
            until_ms = excluded.until_ms, doc = excluded.doc, extra = excluded.extra;
    return jsonb_build_object('doc', result_, 'extra', '{}'::jsonb);
  end if;
  if p_kind = 'bugs' then
    stamp_ := md5(jsonb_build_array('v200', p_cat, p_word, p_backs)::text);
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return jsonb_build_object('doc', c.doc, 'extra', c.extra); end if;
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
      if p_kind = 'wild' then turns_ := turns_ || to_jsonb(turn_); end if;
      until_ := least(until_, (turn_ + 1) * every_ - phase_);
    end loop;
    if p_kind = 'bugs' then
      select least(until_, min((x->>'from')::bigint)) into until_
        from jsonb_array_elements(coalesce(p_backs, '[]'::jsonb)) x
       where (x->>'from')::bigint > p_now;
      -- The miss calculated the earliest turn/comeback deadline above.
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
    stamp_ := md5(jsonb_build_array('v200', town.day_of(p_now), town.mine_turn(p_now),
      coalesce(p_cat, town.cat('mining')), coalesce(p_word, town.mine_word()))::text);
  end if;
  if cacheable_ then
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return jsonb_build_object('doc', c.doc, 'extra', c.extra); end if;
    perform pg_advisory_xact_lock(hashtext('town.read_cache'), hashtext(p_kind));
    select * into c from town.read_cache r where r.key_ = p_kind;
    if c.stamp = stamp_ and c.from_ms <= p_now and p_now < c.until_ms then return jsonb_build_object('doc', c.doc, 'extra', c.extra); end if;
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
    extra_ := jsonb_build_object('crystal', town.mine_crystal(town.day_of(p_now)));
    select least(until_, min((l.value->>'until')::bigint)) into until_
      from jsonb_each(result_) f
      cross join lateral jsonb_array_elements(coalesce(f.value->'torches', '[]'::jsonb)
        || coalesce(f.value->'moss', '[]'::jsonb)) l
     where (l.value->>'until')::bigint > p_now;
  end if;
  if cacheable_ then
    insert into town.read_cache(key_, stamp, from_ms, until_ms, doc, extra)
      values (p_kind, stamp_, p_now, until_, result_, extra_)
      on conflict on constraint read_cache_pkey do update
        set stamp = excluded.stamp, from_ms = excluded.from_ms,
            until_ms = excluded.until_ms, doc = excluded.doc, extra = excluded.extra;
  end if;
  return jsonb_build_object('doc', result_, 'extra', extra_);
end;
$function$;
-- (the function written over keeps the grants it had)

-- the cache as v200 left it has no deadlines of its own: worked out afresh at the next look
delete from town.read_cache where key_ = 'bugs';

commit;

-- What it should say afterwards (a look's time, a few ms when the cache has the haunts that have not turned):
--   select key_, until_ms - from_ms as lasts_ms, jsonb_array_length(extra->'u') as haunts from town.read_cache where key_ = 'bugs';
