-- v149 — lines of work: points, ranks and a title to wear
--
-- Run this once in the Supabase SQL editor, after v146 (it stops at its first
-- line without v121's deeds). Running it again is safe: the past is counted
-- once. **Run it after the site's own code for it is live**: a page from
-- before asks nothing of it, and a page with the code and a database without
-- this file is answered nothing and shows no lines.
--
-- Why. The owner, 2026-10-06, of the water carriers' three ranks and gifts:
--
--   "อยากทำให้มี progression และ ฉายา ได้ไอเทม เหมือนกับที่ ขนน้ำทำได้ด้วย"
--   "ขอถึงขั้น 10 เลย"   "นับย้อนหลังด้วย"   "เลือกได้ ทำ UI ให้ด้วย"
--   "ช่วยทำ UI progression ของแต่ละสายให้ด้วย มีบอกด้วยว่า ตอนนี้มีคะแนนเท่าไหร่
--    ต้องถึงเท่าไหร่ถึงได้ แต่ของที่ยังไม่ปลดล็อคจะยังไม่มีข้อมูลให้เห็น"
--
-- What it does (the rules are lib/town/lines.ts and line-points.ts again):
--
--   * Seven lines of work (kitchen, well, helpers, fishing, forest, insects,
--     farming), ten ranks each. A member's points on a line are kept
--     (`town_work`): all told, and what today's deeds were worth, since a
--     day's points past its bound count a quarter.
--   * Points come of what is written down anyway. A trigger after every line
--     of `town_deeds` and of `town_plays` reads it (`town.work_counts_of`) and
--     counts it for whoever it counts for: a pot by its helpings and a
--     helping somebody else ladles from it; help on other people's plants and
--     thanks for it; a fish by how rare it is; a forest thing by how it is
--     had; an insect by how it is caught; a picking by how long its crop
--     takes. The first of a kind is ten more. The well's line is the
--     bucketfuls its own book counts (v127's `town_carriers`), as before.
--     **The trigger can never stand in a deed's way**: whatever goes wrong in
--     it is swallowed, and the deed is written as it always was.
--   * The past is counted once, from both logs in the order things happened
--     (plays since the game opened, deeds since v121).
--   * A title of a rank one has may be worn under one's name (`town_titles`),
--     or none. `town_work()` tells a member their lines and everybody's worn
--     title; `town_title_wear(line, rank)` wears one.
--
-- What it changes: nothing that was there. Two tables new and closed, one
-- catalog row new (`work`), eight rules new, two triggers, two functions a
-- member calls. None of the game's functions is written again.

do $$ begin
  if to_regclass('public.town_deeds') is null or to_regclass('public.town_plays') is null then raise exception 'v121 has not run: nothing is written down to count'; end if;
  if to_regclass('public.town_carriers') is null then raise exception 'v127 has not run: the well keeps no book'; end if;
end $$;

-- <catalog:v149> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('work', $town${
    "ids": ["kitchen","well","helpers","fishing","forest","insects","farming"],
    "ranks": 10,
    "past": 0.25,
    "first": 10,
    "marks": {"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000]},
    "day": {"kitchen":150,"well":200,"helpers":200,"fishing":150,"forest":150,"insects":150,"farming":150},
    "kitchen": {"ladled":1,"pots":3,"ladling":9,"pot":{"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":3,"tomYum":4,"sourCurry":4,"friedPerch":2,"fishCake":4,"spicyEel":3,"grilledPrawn":2,"steamedGoby":3,"pumpkinSoup":5,"shabu":10,"somTam":3,"grilledEggplant":2,"tomKha":4,"friedGourami":2,"crabCurry":4,"steamedSheatfish":3,"friedFrog":2,"laab":4,"omelette":2,"snailCurry":4,"candiedPumpkin":5,"friedRice":3,"greenCurry":5,"khanomJeen":6,"hoMok":4,"mangoStickyRice":4,"bananaInCoconut":4,"taroPudding":6,"steamedCroaker":3,"gingerFish":4,"turmericFish":3,"jungleCurry":6,"megaLaab":20,"watermelonSlices":6,"khantoke":20,"naamPrik":4,"sushi":4,"ramen":3,"tempura":2,"unadon":2,"okonomiyaki":3,"kimchi":4,"bibimbap":4,"tteokbokki":3,"kimbap":3,"pajeon":2,"harGow":4,"chowMein":3,"springRoll":4,"congee":4,"mapoTofu":3,"pizza":6,"spaghetti":3,"risotto":4,"lasagna":6,"minestrone":5,"fishCurry":4,"naan":4,"biryani":5,"samosa":4,"lassi":3,"fishChips":4,"ukha":4,"thieboudienne":5,"piranhaSoup":3,"crawfishBoil":8,"masgouf":3,"salmonSteak":2,"arapaimaRoast":10,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":4,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":6,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":4,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"fishSauce":1,"compost":1,"growFert":1,"guardFert":1,"pestCure":1,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":1,"lineSpun":1,"mulch":1,"lavenderSachet":1,"bugNet":1,"driedFish":1,"saltedFish":1,"curryPaste":1,"pickle":1,"charcoal":1,"rope":1,"krabung":1,"noodle":1,"coconutMilk":1,"fermentedFish":1,"shrimpPaste":1,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":1}},
    "helpers": {"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3},
    "fishing": {"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":1,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":1,"popotoFish":1,"rainbowFish":1,"moonFish":8},
    "forest": {"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"]},
    "insects": {"butterflyWhite":1,"monarch":1,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":1,"scarab":1,"caterpillar":1},
    "farming": {"kangkong":1,"scallion":1,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":3,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v149>

-- ─── What is kept ────────────────────────────────────────────────────────

-- A member's standing on a line, as lib/town/line-points' LineKept: points,
-- the day last counted on, what that day was worth, what the day holds to so
-- many, the kinds had the first of.
create table if not exists public.town_work (
  member_id uuid not null references public.profiles (id) on delete cascade,
  line      text not null check (line ~ '^[a-z]{1,20}$'),
  kept      jsonb not null,
  primary key (member_id, line)
);
alter table public.town_work enable row level security;
revoke all on public.town_work from anon, authenticated;

-- The title a member wears under their name: of which line, which rank.
create table if not exists public.town_titles (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  line      text not null check (line ~ '^[a-z]{1,20}$'),
  rank      integer not null check (rank between 1 and 10),
  at        timestamptz not null default now()
);
alter table public.town_titles enable row level security;
revoke all on public.town_titles from anon, authenticated;

-- ─── The rules ───────────────────────────────────────────────────────────

-- The rank so many points are on a line: none (0) to the last.
create or replace function town.work_rank(p_line text, p_points double precision)
returns integer language sql stable
as $$
  select count(*)::integer from jsonb_array_elements_text(coalesce(town.cat('work')->'marks'->p_line, '[]'::jsonb)) m where p_points >= m::double precision
$$;

-- What some points come to on a day that has had so many already: in full up to the line's bound, a quarter past it.
create or replace function town.work_counted_on(p_line text, p_today double precision, p_add double precision)
returns double precision language sql stable
as $$
  select case when p_add <= 0 then 0::double precision else f.full_ + (p_add - f.full_) * (c.l->>'past')::double precision end
    from (select town.cat('work') as l) c,
         lateral (select greatest(0::double precision, least(p_add, (c.l->'day'->>p_line)::double precision - greatest(0::double precision, p_today))) as full_) f
$$;

-- What something done counts for, on every line it counts on: lib/town/line-points' countsOf, by the catalog's numbers.
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
returns jsonb language plpgsql stable
as $$
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
$$;

-- A line with nothing on it yet.
create or replace function town.work_new()
returns jsonb language sql immutable
as $$ select '{"points": 0, "day": -1, "today": 0, "held": {}, "firsts": []}'::jsonb $$;

-- A line with one more thing counted on it, on a day: lib/town/line-points' count.
create or replace function town.work_count(p_kept jsonb, p_c jsonb, p_day integer)
returns jsonb language plpgsql stable
as $$
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
$$;

-- A deed as the rule is to read it: with the owner of the bed, for a hoe's work in a bed that is somebody else's
-- (no plant is there to say whose).
create or replace function town.work_done(p_member uuid, p_what text, p_thing text, p_n numeric, p_doc jsonb)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  doc jsonb := coalesce(p_doc, '{}'::jsonb);
  owner_ uuid;
begin
  if p_what in ('clear', 'till') and not (doc ? 'whose') and jsonb_typeof(doc->'tile') = 'array' then
    select b.member_id into owner_ from public.town_beds b where b.bed = town.bed_of((doc->'tile'->>0)::integer, (doc->'tile'->>1)::integer);
    if owner_ is not null and owner_ <> p_member then doc := doc || jsonb_build_object('owner', owner_::text); end if;
  end if;
  return jsonb_build_object('from', 'deed', 'what', p_what, 'thing', p_thing, 'n', coalesce(p_n, 1), 'doc', doc);
end;
$$;

-- Something done, counted on whatever line it counts on, for whoever it counts for. A count for somebody who is no
-- member any more is let go, and the rest are counted.
create or replace function town.work_counted(p_member uuid, p_done jsonb, p_at bigint)
returns void language plpgsql set search_path = public
as $$
declare
  c jsonb;
  who uuid;
  day_ integer := town.day_of(p_at);
begin
  for c in select x from jsonb_array_elements(town.work_counts_of(p_done, p_member::text)) as t(x) loop
    begin
      who := coalesce((c->>'to')::uuid, p_member);
      insert into public.town_work (member_id, line, kept) values (who, c->>'line', town.work_count(town.work_new(), c, day_))
        on conflict (member_id, line) do update set kept = town.work_count(public.town_work.kept, c, day_);
    exception when others then null;
    end;
  end loop;
end;
$$;

-- ─── Counted as it is written down ───────────────────────────────────────

create or replace function town.work_deed()
returns trigger language plpgsql security definer set search_path = public
as $$
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
$$;

create or replace function town.work_play()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  begin
    if new.member_id is not null then
      perform town.work_counted(new.member_id,
        jsonb_build_object('from', 'play', 'what', new.game, 'thing', new.doc->>'what', 'n', 1, 'won', new.won, 'doc', '{}'::jsonb),
        floor(extract(epoch from new.at) * 1000)::bigint);
    end if;
  exception when others then null;
  end;
  return new;
end;
$$;

-- ─── The past, counted once ──────────────────────────────────────────────
-- Both logs, in the order things happened (a go before a deed of the same moment). The mark that it is done is a
-- thing of the village's, so that running the file again counts nothing twice. For a hoe's work in a bed, whose the
-- bed is now is taken for whose it was then: nothing keeps the past of that.

do $$
declare
  r record;
begin
  if exists (select 1 from public.town_things t where t.key = 'work_counted') then return; end if;
  for r in
    select d.member_id, d.at, 1 as src, d.id, town.work_done(d.member_id, d.what, d.thing, d.n, d.doc) as done
      from public.town_deeds d where d.member_id is not null
    union all
    select p.member_id, p.at, 0 as src, p.id, jsonb_build_object('from', 'play', 'what', p.game, 'thing', p.doc->>'what', 'n', 1, 'won', p.won, 'doc', '{}'::jsonb)
      from public.town_plays p where p.member_id is not null
    order by 2, 3, 4
  loop
    perform town.work_counted(r.member_id, r.done, floor(extract(epoch from r.at) * 1000)::bigint);
  end loop;
  insert into public.town_things (key, doc) values ('work_counted', to_jsonb(town.now_ms())) on conflict (key) do nothing;
end $$;

drop trigger if exists town_deeds_work on public.town_deeds;
create trigger town_deeds_work after insert on public.town_deeds for each row execute function town.work_deed();
drop trigger if exists town_plays_work on public.town_plays;
create trigger town_plays_work after insert on public.town_plays for each row execute function town.work_play();

-- ─── What a member is told, and the title they wear ──────────────────────

-- A member's lines as they are told them: on each, the points had and what today has been worth. The well's is the
-- bucketfuls its own book counts, and today's of them.
create or replace function town.work_told(p_member uuid, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
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
$$;

-- What `town_work` answers: my lines, the title I wear, and everybody's worn title for the names over heads.
create or replace function town.work_answer(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('now', town.now_ms(),
    'lines', town.work_told(p_member, town.now_ms()),
    'worn', (select jsonb_build_object('line', t.line, 'rank', t.rank) from public.town_titles t where t.member_id = p_member),
    'titles', (select coalesce(jsonb_object_agg(t.member_id::text, jsonb_build_object('line', t.line, 'rank', t.rank)), '{}'::jsonb) from public.town_titles t))
$$;

create or replace function public.town_work()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return town.work_answer(me);
end;
$$;

-- Wear a title one has earned under one's name, or none (a null line).
create or replace function public.town_title_wear(p_line text default null, p_rank integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_work() from public, anon;
grant execute on function public.town_work() to authenticated;
revoke execute on function public.town_title_wear(text, integer) from public, anon;
grant execute on function public.town_title_wear(text, integer) to authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select jsonb_array_length(data->'ids') as lines, data->'day'->'kitchen' as a_day from public.town_catalog where key = 'work';
--   -- 7 | 150
--
--   select tgname from pg_trigger where tgname in ('town_deeds_work', 'town_plays_work') order by 1;
--   -- town_deeds_work, town_plays_work
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who stands where on each line, the highest first
--   select l.line, l.member_id, (l.kept->>'points')::numeric as points, town.work_rank(l.line, (l.kept->>'points')::double precision) as rank,
--          (l.kept->>'today')::numeric as today
--     from public.town_work l order by 1, 3 desc limit 80;
--
--   -- the titles worn
--   select t.member_id, t.line, t.rank, t.at from public.town_titles t order by t.at desc limit 40;
