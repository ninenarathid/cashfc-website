-- v152 — the familiars: one follows its member, for everybody to see
--
-- Run this once in the Supabase SQL editor, after v151 (it stops at its first
-- line without v151's gifts). Running it again is safe. **Run it after the
-- site's own code for it is live**: a page from before asks nothing of it,
-- and a page with the code and a database without this file offers the six
-- charms as before and no familiar.
--
-- Why. The owner, 2026-10-06, of what the lines' ranks give:
--
--   "ใส่ ภูติ หรือ สัตว์เดินตามได้ 1 ชนิด"   (changed "อิสระ")
--   and, of building every rank's gift: "ทำต่อได้เลย เอาให้ครบถึงขั้น 10 เลย"
--
-- What it does (the rules are lib/town/gifts.ts again):
--
--   * The second rank of three lines gives a familiar: the forest's a
--     squirrel, the insects' a lucky butterfly, the farm's a garden gnome.
--     It is taken as a charm is (`town_gift_take`, v151's, as it is), is
--     bound to its member and is in no slot of the bag.
--   * One familiar follows its member at a time (`town_familiar_wear(id)`;
--     null sends it to rest), changed as often as one likes. Which follows
--     is kept in the purse (`gifts.familiar`), so `town.gifts_of` (v151's)
--     is written again to keep it: as it ran but for the lines meant
--     (v152.lines.mjs). Everybody's page draws it at its member's heels;
--     that is told through the room, not through the database.
--   * What these three do is the page's own to read (their games are played
--     in the browser): no rule of the game is judged otherwise here.
--   * What a gift does only so many times (the gnome weeds ten plots to a
--     meal's hours) is counted in the purse (`gifts.used`), here, so that the
--     count is the same on every device: `town_gift_use(id)` uses one, for
--     what the page itself then does.
--   * `town.work_answer` (v151's) says which gifts are given, so that a page
--     offers those and no other.
--
-- What it changes: one catalog row written over (`gifts`: three gifts more,
-- and what is counted), five rules new, two written again, two functions a
-- member calls. No table.
-- No coins and no thing that can be sold comes of it.

do $$ begin
  if to_regprocedure('town.gifts_of(jsonb)') is null or to_regprocedure('public.town_gift_take(text, integer)') is null then raise exception 'v151 has not run: there are no gifts to add a familiar to'; end if;
end $$;

-- <catalog:v152> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "uses": {"famGnome":{"n":10,"per":"meal"}},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1.5},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0.5},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1.5},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1.5},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1.5},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":1},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":10}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v152>

-- ─── The rules ───────────────────────────────────────────────────────────

-- A purse's gifts, made sound (lib/town/gifts' giftsOf): as v151 wrote it, and which familiar follows.
-- <gifts_of>
create or replace function town.gifts_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
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
$$;
-- </gifts_of>

-- Have this familiar follow me and no other (null: none follows): one I have (lib/town/gifts' wearFamiliar).
create or replace function town.familiar_wear(p_purse jsonb, p_id text)
returns jsonb language plpgsql stable
as $$
declare
  g jsonb := town.cat('gifts');
  mine jsonb := town.gifts_of(p_purse);
begin
  if p_id is not null and (not (mine->'had' ? p_id) or g->'gifts'->p_id->>'kind' is distinct from 'familiar') then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('familiar', p_id)));
end;
$$;

-- Whether a gift works for somebody now (lib/town/gifts' works): one they have; and a charm is worn, a familiar follows.
create or replace function town.gift_works(p_purse jsonb, p_id text)
returns boolean language sql stable
as $$
  select coalesce(m.g->'had' ? p_id and case town.cat('gifts')->'gifts'->p_id->>'kind'
      when 'charm' then m.g->'charms' ? p_id when 'familiar' then m.g->>'familiar' = p_id else true end, false)
    from (select town.gifts_of(p_purse) as g) m
$$;

-- The stretch of time a count is of, as one number (lib/town/gifts' stretchOf): the day, or the day and which meal's hours of it.
create or replace function town.stretch_of(p_per text, p_now bigint)
returns bigint language sql stable
as $$ select case when p_per = 'day' then town.day_of(p_now)::bigint else town.day_of(p_now)::bigint * 3 + town.meal_of(p_now) end $$;

-- How many times a counted gift has been used in the stretch p_now is in (lib/town/gifts' usedOf): none, of a count
-- kept wrongly or of another stretch.
create or replace function town.used_of(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_of(rule->>'per', p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- Use a counted gift once (lib/town/gifts' useGift): it has to work for me now, and to have a time left in this stretch.
create or replace function town.gift_use(p_purse jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
$$;

-- ─── The lines of work say which gifts are given ─────────────────────────

-- <work_answer>
create or replace function town.work_answer(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('now', town.now_ms(), 'gifting', true,
    'gives', (select coalesce(jsonb_agg(k.id order by k.id), '[]'::jsonb) from jsonb_object_keys(town.cat('gifts')->'gifts') as k(id)),
    'lines', town.work_told(p_member, town.now_ms()),
    'worn', (select jsonb_build_object('line', t.line, 'rank', t.rank) from public.town_titles t where t.member_id = p_member),
    'titles', (select coalesce(jsonb_object_agg(t.member_id::text, jsonb_build_object('line', t.line, 'rank', t.rank)), '{}'::jsonb) from public.town_titles t))
$$;
-- </work_answer>

-- ─── What a member does ──────────────────────────────────────────────────

-- Have this familiar of mine follow me, or none.
create or replace function public.town_familiar_wear(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Use a gift of mine that is counted, once: for what the page itself then does (the gnome's weeding).
create or replace function public.town_gift_use(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_familiar_wear(text) from public, anon;
grant execute on function public.town_familiar_wear(text) to authenticated;
revoke execute on function public.town_gift_use(text) from public, anon;
grant execute on function public.town_gift_use(text) to authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select (select count(*) from jsonb_object_keys(data->'gifts')) as gifts,
--          (select count(*) from jsonb_each(data->'gifts') e where e.value->>'kind' = 'familiar') as familiars
--     from public.town_catalog where key = 'gifts';
--   -- 9 | 3
--
--   select jsonb_array_length(town.work_answer(null)->'gives') as given;
--   -- 9
--
--   select town.gifts_of('{"gifts": {"had": ["famGnome"], "familiar": "famGnome"}}'::jsonb)->>'familiar' as follows;
--   -- famGnome
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- whom which familiar follows
--   select p.member_id, p.doc->'gifts'->>'familiar' as follows from public.town_purses p where p.doc->'gifts'->>'familiar' is not null order by 1 limit 80;
--
--   -- what was used of the gifts that are counted, as it was written down
--   select d.member_id, d.at, d.thing, d.doc->'left' as left from public.town_deeds d where d.what = 'gift_use' order by d.at desc limit 40;
--
--   -- a familiar called or sent to rest, as it was written down
--   select d.member_id, d.at, d.thing from public.town_deeds d where d.what = 'familiar' order by d.at desc limit 40;
