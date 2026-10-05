// Writes pgtest/v124_draft.sql. What is new is written here; what is written again is taken from the text each
// function last ran with (git history), changed by the lines meant, so that nothing else can differ.
//   node who-reads-buffs.mjs fn2 town.leave town.collect public.town_leave public.town_take_back public.town_stall && node build-v124.mjs
import fs from "node:fs";
const here = new URL("./", import.meta.url);
const was = (name) => fs.readFileSync(new URL(`fn2/${name}.sql`, here), "utf8").trimEnd();
function again(name, ...lines) {
  let text = was(name);
  for (let i = 0; i < lines.length; i += 2) {
    const from = lines[i], to = lines[i + 1];
    if (text.split(from).length !== 2) throw new Error(`${name}: a line meant is not there once: ${from.slice(0, 60)}`);
    text = text.replace(from, () => to);
  }
  return text;
}

const sql = String.raw`-- v124 — the relatives' price moves
--
-- Run this once in the Supabase SQL editor, after v122, AND ONLY ONCE THE
-- SITE'S OWN CODE FOR IT IS LIVE (a page built before it shows the usual
-- price beside a thing, and the money that waits a little out). Running it
-- again is safe.
--
-- Why. On the game's second day the purses held 1,369 Popoto coins and the
-- plots about 13,200 more still to be picked; the uncle's relatives bought
-- without limit, at a price that never moved. The owner's own answer: "ถ้าผม
-- ทำให้ ของที่ถูกขายเยอะราคาน้อยลง แต่ของที่ไม่ค่อยถูกขาย (คนไม่นิยมเล่น) ราคาเพิ่มขึ้น"; so
-- that "ผู้เล่นไม่หาแต่ของแพงๆ tier สูงๆมาขาย ของ tier อ่อนกว่าจะถูกมองข้าม"; with a
-- graph where things are left to be sold ("ช่วยทำให้กราฟราคาด้วย ตอนฝากขาย"); and
-- never under what a thing costs ("ราคาขึ้นลงได้ แต่ไม่ควรลงเกินกว่าต้นทุนของสิ่งๆนั่น
-- ยังอยากให้ผู้เล่นที่เสียเวลาเล่นได้อะไรกลับไปบ้าง").
--
--   · A price is posted for a round (the relatives come twice a day): what is
--     left with the uncle in a round fetches that round's price, early or
--     late, and a lot keeps the price it was left at.
--   · Each thing is measured against its own usual amount: so many coins'
--     worth a head a round, by its kind (a vegetable 30, a fish 15, what else
--     a line brings up 10, what is cooked or made 15). A head is a member who
--     has done anything in the town in the last seven days; ten at the least.
--   · Sold more than that, its price falls; sold less, it rises: by
--     (usual / sold) to the power 0.7, half the last round remembered with
--     what was remembered before, a quarter of itself down in a round at the
--     most and a tenth up.
--   · Never under the thing's cost and half as much again (the seed at the
--     stall by what a plant gives; the cheapest bait that takes the fish),
--     nor under two fifths of the usual price. What is cooked or made does
--     not fall at all.
--   · The plainer the thing, the higher it may rise: 150% for the first
--     tier, 130% for the second, 115% for the third.
--   · What the uncle sells himself has one price, and so have tools, seeds,
--     staples and scrolls. His order of the day pays the usual price.
--
-- What it adds: nineteen knobs (those numbers, an admin's to turn), the
-- market as a row of town_things, town_market_log (a round to a row as it
-- ends: what each thing fetched and how many were sold; closed), and the
-- rules (town.market_things, town.market_next, town.market_rolled,
-- town.market_now and what they stand on).
--
-- What it writes again, each as it last ran, word for word but for the lines
-- meant: town.leave and town.collect (v106's: a lot keeps its price, and is
-- paid by it in whole coins), town_leave and town_take_back (v121's: the
-- round's price, and what is left counted as sold), town_stall (v111's: the
-- prices of what I hold, and their last seven days, for the graph).
--
-- What it does not change: every lot left before it ran is paid at the usual
-- price, as it was left; the price of a thing nobody has sold yet is the
-- usual one, and begins to move from the round after this file runs.

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The market's numbers (a knob is a whole number: hundredths where a share
-- is meant). A seed: one an admin has turned stays turned.
insert into public.town_knobs (key, value) values
  ('market_floor', 40),    -- the least a price falls to, in hundredths of the usual one
  ('market_made', 100),    -- and the least for what is cooked or made
  ('market_margin', 150),  -- a price is never under the thing's cost times this, in hundredths
  ('market_ceil_a', 150),  -- the most a price rises to: the first tier's,
  ('market_ceil_b', 130),  -- the second's,
  ('market_ceil_c', 115),  -- the third's
  ('market_fall', 25),     -- how far a price falls in a round at the most, in hundredths of itself
  ('market_rise', 10),     -- and rises
  ('market_memory', 50),   -- how much of a round's selling is remembered against what was, in hundredths
  ('market_bend', 70),     -- how hard a price answers to selling, in hundredths
  ('market_heads', 10),    -- the fewest heads the village is counted as
  ('market_lately', 14),   -- how many rounds back somebody is counted from (seven days)
  ('market_crop', 30),     -- the usual amount, in coins' worth a head a round: a vegetable,
  ('market_fish', 15),     -- a fish,
  ('market_catch', 10),    -- what else a line brings up,
  ('market_dish', 15),     -- a dish,
  ('market_goods', 15),    -- what else is made,
  ('market_wild', 15),     -- what the forest gives,
  ('market_bug', 10)       -- an insect
  on conflict (key) do nothing;

-- The market: the round its prices are of, where each thing's stands (f: the
-- price in hundredths of the usual one; m: how much of it the village has
-- been selling a round, as it is remembered), and what has been left to be
-- sold so far this round.
insert into public.town_things (key, doc)
  values ('market', jsonb_build_object('round', town.round_of(town.now_ms()), 'at', '{}'::jsonb, 'sold', '{}'::jsonb))
  on conflict (key) do nothing;

-- A round as it ended: for each thing that was sold in it, or whose price was
-- not the usual one, the price it had and how many were sold. Written by
-- town.market_now and by nothing else; read by no browser.
create table if not exists public.town_market_log (
  round   integer primary key,
  doc     jsonb not null,
  written timestamptz not null default now()
);

alter table public.town_market_log enable row level security;
revoke all on public.town_market_log from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- The numbers as one document, as the rules take them.
create or replace function town.market_knobs()
returns jsonb language sql stable set search_path = public
as $$
  with k as (select coalesce(jsonb_object_agg(substr(n.key, 8), n.value), '{}'::jsonb) as v from public.town_knobs n where n.key like 'market\_%')
  select jsonb_build_object(
    'floor', coalesce((k.v->>'floor')::int, 40), 'made', coalesce((k.v->>'made')::int, 100), 'margin', coalesce((k.v->>'margin')::int, 150),
    'ceil', jsonb_build_array(coalesce((k.v->>'ceil_a')::int, 150), coalesce((k.v->>'ceil_b')::int, 130), coalesce((k.v->>'ceil_c')::int, 115)),
    'fall', coalesce((k.v->>'fall')::int, 25), 'rise', coalesce((k.v->>'rise')::int, 10), 'memory', coalesce((k.v->>'memory')::int, 50),
    'bend', coalesce((k.v->>'bend')::int, 70), 'heads', coalesce((k.v->>'heads')::int, 10), 'lately', coalesce((k.v->>'lately')::int, 14),
    'usual', jsonb_build_object('crop', coalesce((k.v->>'crop')::int, 30), 'fish', coalesce((k.v->>'fish')::int, 15), 'catch', coalesce((k.v->>'catch')::int, 10),
      'dish', coalesce((k.v->>'dish')::int, 15), 'goods', coalesce((k.v->>'goods')::int, 15), 'wild', coalesce((k.v->>'wild')::int, 15), 'bug', coalesce((k.v->>'bug')::int, 10)))
    from k
$$;

-- Every thing whose price moves, each with its usual amount a head a round
-- and the least and the most its price is, in hundredths of the usual one:
-- {thing: [usual, floor, ceil]}. It moves when it fetches something, the
-- uncle does not sell it, and its kind has a usual amount. What it costs to
-- come by: a vegetable, its seed at the stall by what the plant gives in
-- all; a fish (and what else a line brings up), the cheapest bait it takes
-- that is used up (the stall's price, or what the relatives pay for one the
-- stall does not sell); anything else, nothing.
create or replace function town.market_things(p_k jsonb)
returns jsonb language sql stable set search_path = public
as $$
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
$$;

-- A round on, for one thing: so many were sold in the round that ended,
-- against the usual amount (for the whole village). Where its price stands
-- then, and what is remembered of its selling.
create or replace function town.market_next(p_st jsonb, p_sold double precision, p_usual double precision, p_floor double precision,
  p_ceil double precision, p_k jsonb)
returns jsonb language sql immutable
as $$
  select jsonb_build_object(
      'f', floor(case when w.want < s.f then greatest(w.want, s.f * (1 - (p_k->>'fall')::double precision / 100))
                      else least(w.want, s.f * (1 + (p_k->>'rise')::double precision / 100)) end + 0.5::double precision)::int,
      'm', m.m)
    from (select (p_st->>'f')::double precision as f) s,
         (select (1 - (p_k->>'memory')::double precision / 100) * (p_st->>'m')::double precision + (p_k->>'memory')::double precision / 100 * p_sold as m) m,
         lateral (select least(p_ceil, greatest(p_floor,
           100 * power(p_usual / greatest(m.m, p_usual / 100), (p_k->>'bend')::double precision / 100))) as want) w
$$;

-- The market brought to a round: each round gone by since it was kept moves
-- every price once (what was left in the first of them is what was sold;
-- nothing in the rest), and is told to be written down. A market left alone
-- for a long while is moved through as many rounds as it takes anything to
-- settle, and no more.
create or replace function town.market_rolled(p_market jsonb, p_round integer, p_heads integer, p_things jsonb, p_k jsonb)
returns jsonb language plpgsql immutable
as $$
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
$$;

-- How many the village is counted as: whoever has done anything in the town
-- lately; never fewer than the least.
create or replace function town.market_heads(p_k jsonb)
returns integer language sql stable set search_path = public
as $$
  select greatest((p_k->>'heads')::int, (select count(distinct d.member_id)::int from public.town_deeds d
    where d.at > to_timestamp(town.now_ms() / 1000.0) - make_interval(hours => 12 * (p_k->>'lately')::int)))
$$;

-- The market as it stands this round. When the round has turned since it was
-- kept, it is held, moved on, each round gone by written down, and kept.
create or replace function town.market_now()
returns jsonb language plpgsql set search_path = public
as $$
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
$$;

-- The price of a thing in a market, in hundredths of its usual one: the usual
-- one for a thing with one price, and for one nobody has sold yet.
create or replace function town.factor_of(p_market jsonb, p_item text)
returns integer language sql immutable
as $$ select coalesce((p_market->'at'->p_item->>'f')::int, 100) $$;

-- So many more of a thing left to be sold this round (fewer, when some are
-- taken back).
create or replace function town.market_count(p_item text, p_n integer)
returns void language plpgsql set search_path = public
as $$
declare
  market jsonb;
begin
  perform town.market_now();
  select t.doc into market from public.town_things t where t.key = 'market' for update;
  perform town.keep_thing('market', market || jsonb_build_object('sold',
    market->'sold' || jsonb_build_object(p_item, greatest(0, coalesce((market->'sold'->>p_item)::int, 0) + coalesce(p_n, 0)))));
end;
$$;

-- What a member is told of prices: for each thing in my bag, and each I have
-- left with the uncle, whose price moves: its price this round, and the
-- rounds of the last seven days as they ended (the round, its price, how
-- many the village sold), the oldest first. Of nothing else: what I do not
-- hold has no price here.
create or replace function town.prices_told(p_me uuid)
returns jsonb language plpgsql set search_path = public
as $$
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
$$;

/* ── a lot keeps its price: v106's, each with the lines meant ────────────── */

-- (p_f: the round's price for the thing, in hundredths of its usual one. It is kept with the lot when it is not
-- the usual one, and two lots of a thing at two prices are two lots.)
${again("town.leave",
  "create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint)",
  "create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer default 100)",
  "and (lots->i->>'pays')::int = pays then same := i; exit; end if;",
  "and (lots->i->>'pays')::int = pays\n       and coalesce((lots->i->>'f')::int, 100) = coalesce(p_f, 100) then same := i; exit; end if;",
  "    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur));",
  "    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur)\n      || case when coalesce(p_f, 100) = 100 then '{}'::jsonb else jsonb_build_object('f', p_f) end);")}

-- (the one of four words is not left beside the one of five: a call with four would not know which was meant)
drop function if exists town.leave(jsonb, integer, integer, bigint);

-- (what was fetched is paid by each lot's own price, in whole coins: the odd part is lost)
${again("town.collect",
  "  select coalesce(sum((l->>'n')::int * (l->>'pays')::int) filter (where (l->>'round')::int < cur), 0)::int,",
  "  select floor(coalesce(sum((l->>'n')::int * (l->>'pays')::int * coalesce((l->>'f')::int, 100)) filter (where (l->>'round')::int < cur), 0) / 100.0)::int,")}

/* ── leaving, taking back, and the stall: each with the lines meant ──────── */

${again("public.town_leave",
  "  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms());",
  "  -- (the round's price for the thing: the market is brought to this round if it has turned)\n  f integer := town.factor_of(town.market_now(), purse->'bag'->p_slot->>'item');\n  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms(), f);",
  "perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n); end if;",
  "perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n, 0,\n    case when f = 100 then '{}'::jsonb else jsonb_build_object('f', f) end); end if;\n  -- (what is left is counted as sold this round, for the next round's price)\n  if (did->>'ok')::boolean then perform town.market_count(purse->'bag'->p_slot->>'item', p_n); end if;",
  "  return town.answer(me, did);",
  "  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));")}

${again("public.town_take_back",
  "    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);\n  end if;",
  "    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);\n    -- (taken back in the round it was left in, it was not sold)\n    if (lot->>'round')::int = town.round_of(town.now_ms()) then perform town.market_count(lot->>'item', -(lot->>'n')::int); end if;\n  end if;",
  "  return town.answer(me, did);",
  "  return town.answer(me, did) || jsonb_build_object('prices', town.prices_told(me));")}

${again("public.town_stall",
  "    'found', town.thing('found', false),",
  "    'found', town.thing('found', false),\n    'prices', town.prices_told(me),")}

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the three deeds are a member's, as
-- they were.
revoke execute on all functions in schema town from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['town_leave(integer, integer)', 'town_take_back(integer)', 'town_stall()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) from public.town_knobs where key like 'market\_%';
--   -- 19
--
--   select t.doc->>'round' as round, t.doc->'at' as at, (select c.relrowsecurity from pg_class c where c.oid = 'public.town_market_log'::regclass) as closed,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_market_log' and grantee in ('anon', 'authenticated')) as grants
--     from public.town_things t where t.key = 'market';
--   -- this round | {} | true | 0
--
--   select count(*) as things, min((v.value->>1)::int) as least_floor, max((v.value->>1)::int) as most_floor, max((v.value->>2)::int) as most_ceil
--     from jsonb_each(town.market_things(town.market_knobs())) v;
--   -- some hundreds | 40 | 100 | 150
--
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_open,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace and p.proname = 'leave') as leaves;
--   -- 0 | 1
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- every price that is not the usual one, this round
--   select e.key as thing, (e.value->>'f')::int as hundredths, round((e.value->>'m')::numeric, 1) as sold_a_round
--     from public.town_things t, jsonb_each(t.doc->'at') e where t.key = 'market' and (e.value->>'f')::int <> 100 order by 2;
--
--   -- a thing through the last rounds: its price and how many were sold
--   select l.round, l.doc->'kangkong'->>0 as hundredths, l.doc->'kangkong'->>1 as sold from public.town_market_log l order by l.round desc limit 14;
--
--   update public.town_knobs set value = 50 where key = 'market_floor';   -- nothing falls under half its usual price
`;

fs.writeFileSync(new URL("pgtest/v124_draft.sql", here), sql);
console.log("written:", sql.split("\n").length, "lines");
