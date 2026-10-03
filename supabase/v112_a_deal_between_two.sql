-- v112 — a deal between two
--
-- Run this once in the Supabase SQL editor, after v111. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. It is the seventh of the migrations Cash
-- Town's game waits for, built as v106 says: the rules of lib/town/deal.ts
-- written again in SQL in the schema `town` and held to the code's answers
-- case by case, and five functions in `public` for the browser.
--
-- What it keeps: every deal between two members (`town_deals`): while it is
-- open, what each has laid out and whether each has given their word; and
-- for good once it is done, who gave what to whom, things and coins. The
-- owner asked for trade between members ("ช่วยทำระบบ เทรด แลกเปลี่ยน item สำหรับผู้เล่น
-- ด้วยกันเองด้วย … ไม่งั้นคนที่เน้นเล่นทำอาหาร จะไม่มีของจากสายอื่น") and then for coins
-- in it ("อย่าลืมทำระบบเทรด item หรือ popoto coin ให้ด้วย"). Coins come from popoto,
-- twenty a week each, and handing them on is a way round that for anybody
-- who would feed one purse from several: so no deal is ever forgotten here,
-- and what moved can be read back.
--
-- What the database decides, and what it believes:
--
--   · It does the swap itself, in one go, from what it holds of both bags:
--     everything changes hands or nothing does. A side that no longer has
--     what it laid out, coins it has spent since, or a bag with no room for
--     what is coming, refuses the lot, and both words are taken back.
--   · Changing a side takes back both words, so nobody agrees to one thing
--     and receives another.
--   · It names the two by their characters, from their profiles.
--   · It believes the browser that the two stand near each other when a deal
--     is opened: that is the town's room's to know. What bounds a lie: the
--     other side has to lay out and give their word for anything to move, a
--     deal can be called off by either, and one left untouched for ten
--     minutes is off by itself, so nobody is kept from dealing by a deal
--     they never answered.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v112> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('deals', $town${
    "kinds": 8,
    "near": 3,
    "idle": 600,
    "shown": 10
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v112>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A deal: the code's Deal as a document, when it was last touched, and how
-- it ended. A deal that is done is kept for good; whoever was in it may go
-- (their account closed), and the record stays.
create table if not exists public.town_deals (
  id       bigint generated always as identity primary key,
  a        uuid references public.profiles (id) on delete set null,
  b        uuid references public.profiles (id) on delete set null,
  doc      jsonb not null,
  touched  bigint not null,
  ended    text check (ended in ('done', 'off')),
  ended_at bigint
);

create index if not exists town_deals_a on public.town_deals (a, id);
create index if not exists town_deals_b on public.town_deals (b, id);

alter table public.town_deals enable row level security;
revoke all on public.town_deals from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- tidyGive(): a side, tidied: each kind once, whole numbers above nothing,
-- in the order the kinds were first named.
create or replace function town.tidy_give(p_give jsonb)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(jsonb_build_array(t.id, t.n) order by t.first), '[]'::jsonb)
    from (select x.v->>0 as id, sum((x.v->>1)::numeric) as n, min(x.ord) as first
            from jsonb_array_elements(p_give) with ordinality x(v, ord), (select town.cat('items') as items) i
           where i.items ? (x.v->>0) and (x.v->>1)::numeric = floor((x.v->>1)::numeric) and (x.v->>1)::numeric > 0
           group by x.v->>0) t
$$;

-- hasAll(): whether a bag has everything a side lays out.
create or replace function town.has_all(p_purse jsonb, p_give jsonb)
returns boolean language sql stable
as $$
  select not exists (select 1 from jsonb_array_elements(town.tidy_give(p_give)) g(v) where town.held(p_purse->'bag', g.v->>0) < (g.v->>1)::numeric)
$$;

-- sideOf(): which side of a deal somebody is, or null when they are neither.
create or replace function town.side_of(p_deal jsonb, p_me text)
returns text language sql immutable
as $$ select case when p_deal->>'a' = p_me then 'a' when p_deal->>'b' = p_me then 'b' end $$;

-- lay(): change one side of a deal, its things and its coins: both words are
-- taken back.
create or replace function town.lay(p_deal jsonb, p_me text, p_purse jsonb, p_give jsonb, p_coins numeric)
returns jsonb language plpgsql stable
as $$
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
$$;

-- agree(): give one's word, or take it back.
create or replace function town.agree(p_deal jsonb, p_me text, p_word boolean)
returns jsonb language plpgsql immutable
as $$
declare
  side text := town.side_of(p_deal, p_me);
begin
  if side is null then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'deal', p_deal || jsonb_build_object('ok', (p_deal->'ok') || jsonb_build_object(side, p_word)));
end;
$$;

-- pull(): some things out of a bag, as the stacks they are (so that what a
-- thing holds goes with it): from its last stacks first.
create or replace function town.pull(p_bag jsonb, p_give jsonb)
returns jsonb language plpgsql immutable
as $$
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
$$;

-- push(): stacks into a bag: one that holds something into a slot of its
-- own, as it is; the rest onto their own kind. Null when they do not fit.
create or replace function town.push(p_bag jsonb, p_stacks jsonb)
returns jsonb language plpgsql stable
as $$
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
$$;

-- swap(): do the deal: what each laid out leaves their bag and goes into the
-- other's, and so do the coins. Refused, with nothing changed, when either
-- has not given their word, no longer has what they laid out, or has no room
-- for what is coming.
create or replace function town.swap(p_deal jsonb, p_a jsonb, p_b jsonb)
returns jsonb language plpgsql stable
as $$
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
$$;

/* ── keeping a deal ──────────────────────────────────────────────────────── */

-- The open deal somebody is in, if any. One nobody has touched for a while
-- is off first.
create or replace function town.open_deal(p_member uuid)
returns bigint language plpgsql set search_path = public
as $$
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
$$;

-- A deal as one of its two sides is told of it.
create or replace function town.deal_told(p_id bigint, p_me uuid)
returns jsonb language sql stable set search_path = public
as $$
  select d.doc || jsonb_build_object('id', d.id, 'mine', town.side_of(d.doc, p_me::text), 'end', d.ended)
    from public.town_deals d where d.id = p_id and (d.a = p_me or d.b = p_me)
$$;

-- Whether somebody is of the town: a proved character, or an admin.
create or replace function town.is_member(p_who uuid)
returns boolean language sql stable set search_path = public
as $$
  select exists (select 1 from public.profiles p
                  where p.id = p_who and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin))
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The deal I am in: open, or just ended (told for a few seconds more, so
-- that both sides see how it ended).
create or replace function public.town_deal()
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Open a deal with somebody (who stands near me: the browser's word).
-- Refused when either of us is in one already.
create or replace function public.town_deal_open(p_other uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Lay out my side of the deal: its things (a list of pairs, a thing and how
-- many) and its coins. Both words are taken back.
create or replace function public.town_deal_lay(p_give jsonb, p_coins numeric default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Give my word (or take it back). When both have, everything changes hands
-- at once, and the deal is done; when it cannot (a side no longer has what
-- it laid out, coins spent since, a bag with no room), nothing does, both
-- words are taken back, and the answer says why.
create or replace function public.town_deal_agree(p_word boolean default true)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Call the deal off.
create or replace function public.town_deal_cancel()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine bigint := town.open_deal(me);
begin
  if mine is null then return town.answer(me, town.no('gone')); end if;
  update public.town_deals d set ended = 'off', ended_at = now_, touched = now_ where d.id = mine and d.ended is null;
  return town.answer(me, '{"ok": true}'::jsonb) || jsonb_build_object('deal', town.deal_told(mine, me));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['town_deal()', 'town_deal_open(uuid)', 'town_deal_lay(jsonb, numeric)', 'town_deal_agree(boolean)', 'town_deal_cancel()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select data from public.town_catalog where key = 'deals';
--   -- {"idle": 600, "near": 3, "kinds": 8, "shown": 10}
--
--   select c.relrowsecurity,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_deals' and grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_deals'::regclass;
--   -- true | 0
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_deal', 'town_deal_open', 'town_deal_lay', 'town_deal_agree', 'town_deal_cancel');
--   -- 0 | 5
--
--   select town.tidy_give('[["worm", 2], ["rod", 1], ["worm", 3], ["nothing", 1], ["rice", 0]]'::jsonb) as a_side_tidied;
--   -- [["worm", 5], ["rod", 1]]
