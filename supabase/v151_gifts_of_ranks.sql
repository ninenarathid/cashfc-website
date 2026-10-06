-- v151 — the gifts of the lines' ranks: a charm taken, and two worn
--
-- Run this once in the Supabase SQL editor, after v149 (it stops at its first
-- line without v149's lines of work). Running it again is safe. **Run it
-- after the site's own code for it is live**: a page from before asks nothing
-- of it, and a page with the code and a database without this file is told
-- no gifts are given and offers none.
--
-- Why. The owner, 2026-10-06, of the lines' ranks:
--
--   "อยากทำให้มี progression และ ฉายา ได้ไอเทม เหมือนกับที่ ขนน้ำทำได้ด้วย"
--   "ช่องเครื่องราง 2 ช่อง"   "ผูกกับตัวทั้งหมด ไม่นับรวมใน ช่องเก็บของ"
--   and of the forest's first gift, a lamp: "ตามนั้นเลยครับ เอาเลย"
--
-- What it does (the rules are lib/town/gifts.ts again):
--
--   * The first rank of every line but the well's gives a charm (the well's
--     first is its yoke, as before). A gift is taken once, of a rank reached
--     (`town_gift_take(line, rank)`), is bound to its member and is in no slot
--     of the bag: it is kept in the purse (`gifts`: those taken, the charms
--     worn of them). Two charms are worn at a time (`town_charms_wear(ids)`),
--     changed as often as one likes.
--   * Four of the six charms are the page's own to read (its games are played
--     in the browser). Two are judged here, so two of the game's rules are
--     written again, each as it last ran but for the lines meant
--     (v151.lines.mjs): `town.strike_window` (v146's: the whispering float
--     makes the strike's moment half as long again) and `town.tend` (v119's:
--     with the gardener's gloves on, work on somebody else's plant or in
--     somebody else's bed takes half its stamina; farm work costs a point or
--     two, so the half is kept exact from one piece of work to the next, and
--     two waterings cost one point).
--   * `town.work_answer` (v149's) says that gifts are given.
--
-- What it changes: one catalog row new (`gifts`), eight rules new, three
-- written again, two functions a member calls. No table: a purse has one
-- field more. No coins and no thing that can be sold comes of it.

do $$ begin
  if to_regclass('public.town_work') is null or to_regprocedure('town.work_told(uuid, bigint)') is null then raise exception 'v149 has not run: there are no lines of work to give for'; end if;
  if to_regprocedure('town.buff_by(jsonb, bigint, text)') is null then raise exception 'v146 has not run: the strike has no levels'; end if;
end $$;

-- <catalog:v151> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1.5},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0.5},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1.5},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1.5},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1.5}}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v151>

-- ─── The rules ───────────────────────────────────────────────────────────

-- A purse's gifts, made sound (lib/town/gifts' giftsOf): only gifts there are, each once; the charms worn are ones
-- had, each once, no more than the places for them; what the gloves' half has left owing, a part of a point.
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
  return jsonb_build_object('had', had, 'charms', charms, 'owed', owed);
end;
$$;

-- Whether somebody wears a charm now.
create or replace function town.wearing(p_purse jsonb, p_id text)
returns boolean language sql stable
as $$ select town.gifts_of(p_purse)->'charms' ? p_id $$;

-- What a charm does for whoever wears it: its number, or what does nothing.
create or replace function town.charm_by(p_purse jsonb, p_id text, p_else double precision)
returns double precision language sql stable
as $$ select case when town.wearing(p_purse, p_id) then (town.cat('gifts')->'gifts'->p_id->>'by')::double precision else p_else end $$;

-- Take the gift of a rank one has reached: once (lib/town/gifts' takeGift). It goes into no bag.
create or replace function town.gift_take(p_purse jsonb, p_points jsonb, p_line text, p_rank integer)
returns jsonb language plpgsql stable
as $$
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
$$;

-- Wear these charms and no others (none: take them all off): ones had, each once, no more than the places for them.
create or replace function town.charms_wear(p_purse jsonb, p_ids jsonb)
returns jsonb language plpgsql stable
as $$
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
$$;

-- A purse after something was done, with so much of what it cost left to pay (lib/town/stamina's eased). Stamina is
-- whole points and farm work costs one or two, so the part is kept exact over time: what a part comes to is paid in
-- whole points, and the rest of a point is owed to the next time.
create or replace function town.eased(p_before jsonb, p_after jsonb, p_now bigint, p_part double precision, p_owed double precision)
returns jsonb language plpgsql stable
as $$
declare
  cost double precision := greatest(0::double precision, town.stamina_of(p_before, p_now) - town.stamina_of(p_after, p_now));
  due double precision := cost * least(1::double precision, greatest(0::double precision, p_part)) + case when p_owed > 0 and p_owed < 1 then p_owed else 0 end;
  pay double precision := least(cost, floor(due + 1e-9));
begin
  return jsonb_build_object(
    'purse', case when pay < cost then p_after || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now), 'left', town.stamina_of(p_after, p_now) + (cost - pay))) else p_after end,
    'owed', greatest(0::double precision, due - pay));
end;
$$;

-- Work in somebody else's bed with the gardener's gloves on: the purse after it, with half its stamina given back.
-- Without the gloves, the purse as it is.
create or replace function town.gloved(p_before jsonb, p_after jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb;
  did jsonb;
begin
  if not town.wearing(p_before, 'charmGloves') then return p_after; end if;
  mine := town.gifts_of(p_after);
  did := town.eased(p_before, p_after, p_now, (town.cat('gifts')->'gifts'->'charmGloves'->>'by')::double precision, (mine->>'owed')::double precision);
  return (did->'purse') || jsonb_build_object('gifts', mine || jsonb_build_object('owed', did->'owed'));
end;
$$;

-- ─── Two of the game's rules, each as it last ran but for the lines meant ─

-- <strike_window>
create or replace function town.strike_window(p_purse jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select (c.f->>'strike')::double precision * (
    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision))
    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)))
    from (select town.cat('fishing') as f) c
$$;
-- </strike_window>

-- <tend>
create or replace function town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean default false)
returns jsonb language plpgsql stable
as $$
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
$$;
-- </tend>

-- ─── The lines of work say that gifts are given ──────────────────────────

-- <work_answer>
create or replace function town.work_answer(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('now', town.now_ms(), 'gifting', true,
    'lines', town.work_told(p_member, town.now_ms()),
    'worn', (select jsonb_build_object('line', t.line, 'rank', t.rank) from public.town_titles t where t.member_id = p_member),
    'titles', (select coalesce(jsonb_object_agg(t.member_id::text, jsonb_build_object('line', t.line, 'rank', t.rank)), '{}'::jsonb) from public.town_titles t))
$$;
-- </work_answer>

-- ─── What a member does ──────────────────────────────────────────────────

-- Take the gift of a rank I have reached on a line.
create or replace function public.town_gift_take(p_line text, p_rank integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Wear these charms and no others.
create or replace function public.town_charms_wear(p_charms text[])
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_gift_take(text, integer) from public, anon;
grant execute on function public.town_gift_take(text, integer) to authenticated;
revoke execute on function public.town_charms_wear(text[]) from public, anon;
grant execute on function public.town_charms_wear(text[]) to authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->'slots' as places, (select count(*) from jsonb_object_keys(data->'gifts')) as gifts from public.town_catalog where key = 'gifts';
--   -- 2 | 6
--
--   select town.work_answer(null)->'gifting' as gifting;
--   -- true
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who has taken which gift, and what is worn
--   select p.member_id, p.doc->'gifts'->'had' as had, p.doc->'gifts'->'charms' as worn from public.town_purses p where p.doc ? 'gifts' order by 1 limit 80;
--
--   -- the taking and the wearing, as they were written down
--   select d.member_id, d.at, d.what, d.thing, d.doc from public.town_deeds d where d.what in ('gift', 'charms') order by d.at desc limit 40;
