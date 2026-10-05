-- v123 — a wish at the fountain
--
-- Run this once in the Supabase SQL editor, AFTER v122 (it writes v122's town_cast
-- again, and stops at its first line if v122 has not run). Running it again is
-- safe.
--
-- Why. On the game's second day the purses held 1,369 Popoto coins between
-- them and the plots about 13,200 more still to be picked; the uncle's
-- relatives buy without limit, and nothing but his stall took a coin back. The
-- owner asked what would take coins out and be worth doing ("ควรเพิ่ม Feature ไหน
-- ในการทำให้เกมส์ยิ่งสนุก และ ทำให้เงินเฟ้อลดลง"), and of what was offered: "ช่วยทำ
-- บ่ออธิษฐาน … อยากให้ลงลึกรายละเอียด"; to its numbers, "ใช้ได้ครับ"; and of the
-- buffs, "เอาแบบบัพคู่ หรือ มากกว่า 2 บัพได้ไปเลย".
--
-- The fountain in the middle of the plaza takes coins for wishes:
--
--   · a coin is tossed towards a wish, and is gone. The wishes are the five
--     things a meal leaves behind (calm, keen, lucky, hearty, green) and five
--     that are the fountain's own ("อยากให้ช่วยคิดบัฟใหม่ๆที่เกี่ยวกับตัวเกม … คิดเพิ่ม
--     แล้วใส่เข้าไปในบ่อน้ำพุได้เลย"), each sparing time or a chore, or giving a little
--     more food, none making a thing fetch more coins:
--       swift   a bite comes sooner (the wait is shorter by two fifths)
--       clear   the shade of what is on its way to the hook is told at the
--               cast: how rare a fish it is, or that it is no fish
--       spring  watering takes no water from the can
--       sprout  a seed sown is 15% of its way to ripe at once
--       feast   a pot cooked gives one helping more
--       carry   a bucket drawn at the river holds one bucketful more ("บัฟ
--               เกี่ยวกับผู้เล่นที่ชอบขนน้ำมาเติมน้ำในบ่อให้ผู้อื่น");
--     (two more are named in the site's code and wait for what they are
--     about, the forest and the insects: their own files put them on the
--     fountain's list, town.wishes(), which is what a page offers)
--   · the village fills a pot between them. The day's first goal is 3% of
--     all the coins in everybody's purses, counted when the day's first coin
--     is tossed, and never under 100. A pot not filled waits for the next day;
--   · the coin that fills it grants the wish with the most behind it, there
--     and then, for three hours: to everybody whose coins are in that pot, and
--     to whoever tosses one while it lasts (they have what is left of it);
--   · a second blessing the same day costs twice the first, a third four
--     times, and that is the day's last;
--   · when three people have tossed within the same minute, a coin counts for
--     one and a half towards the goal (a coin tossed is still a coin gone);
--   · a blessing is held beside a meal's buff, and beside another blessing;
--   · a toss may carry a line of words, the wish itself ("คำอธิษฐาน ยืนยันว่าเอา"):
--     eighty letters at the most, one a member a day (a new one takes the old
--     one's place), read at the fountain by whoever looks, with its writer's
--     name. Words only: they change nothing of the pot or of a blessing.
--     Anybody may toss a coin onto another's wish (it counts towards that
--     wish like any coin), report one (three reports hide it), and take
--     their own back; an admin hides one, and its writer's next that day
--     stays hidden.
--
-- What it adds: twelve knobs (the numbers above, an admin's to turn), the
-- fountain as a row of `town_things`, `town_blessings` (a line for each
-- wish granted, closed like `town_deeds`), the rules (`town.toss` and what
-- it stands on), `town_fountain()` and `town_toss(wish, coins)` for a member.
--
-- What it writes again, each as it last ran, word for word but for the line
-- meant: a rule asked whether the meal's buff was the one it cared for, and
-- now asks whether the member has that buff at all (`town.has_buff`):
-- `town.cost_of` (v107's: hearty), `town.strike_window` (v108's: keen),
-- `town.water` (v110's: green), `town_cast` (v122's: lucky). Four of them
-- gain a line for a blessing of the fountain's own: `town.water` (spring),
-- `town.sow` (v110's: sprout), `town.cook` (v111's: feast), `town_cast`
-- (swift, and what clear water tells); and `town.chore` (v110's) with
-- `town_chore` (v121's) for carry: the bucket drawn, and how many
-- bucketfuls the deed is written down as. `town.note` (v121's) and
-- `town.record` (v108's) write beside every deed and every go at a game the
-- blessings it was done under (`under`, in the line's `doc`; nothing, when
-- there were none): the owner asked whether what is written down of every
-- deed takes in what is new ("การบันทึก Action ทั้งหมดในเกมได้อัพเดท action ใหม่ใน
-- session นี้ด้วยไหม"). A toss is a deed of its own (`toss`: the wish, the
-- coins taken, what they counted for, the wish it granted), and a wish
-- granted a line of `town_blessings`. `town.purse_of`
-- (v107's) reads a purse with the blessings its member has; `town.deed_th`
-- (v121's) has a word for the toss. `town.buff_of` is as it was, the meal's
-- buff, which is what a go is kept with.
--
-- What it does not change: a page loaded before it ran plays on as it was (it
-- knows no fountain and asks for none), and nobody has a blessing until
-- somebody tosses.

/* ── v122 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.signs_of(bigint, boolean, integer, bigint, boolean)') is null then
    raise exception 'v122 has not run yet: run it first (this file writes its town_cast again)';
  end if;
end $$;

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The fountain's numbers (a knob is a whole number, so each has its unit). A
-- seed: one an admin has turned stays turned.
insert into public.town_knobs (key, value) values
  ('wish_share', 30),     -- the day's first goal: so many thousandths of all the coins in the village's purses (3%)
  ('wish_least', 100),    -- and the least it is, in coins
  ('wish_rounds', 3),     -- blessings a day
  ('wish_more', 200),     -- the next one's goal, as hundredths of the last one's (twice)
  ('wish_minutes', 180),  -- how long a blessing lasts
  ('wish_people', 3),     -- tossed together: so many people
  ('wish_within', 60),    -- within so many seconds
  ('wish_counts', 150),   -- and what a coin then counts for towards the goal, in hundredths (one and a half)
  ('wish_swift', 40),     -- swift: how much sooner a bite comes, in hundredths of the wait
  ('wish_sprout', 15),    -- sprout: how far to ripe a seed is when it is sown, in hundredths
  ('wish_feast', 1),      -- feast: the helpings a pot cooked gives besides
  ('wish_carry', 1)       -- carry: the bucketfuls a bucket drawn holds besides
  on conflict (key) do nothing;

-- The fountain itself: the day its count is of, that day's first goal and how
-- many blessings it has given; the pot being filled (what is in it, how much
-- of that is behind each wish, whose coins they are); who tossed lately (for
-- coins tossed together); and the blessings that are running.
insert into public.town_things (key, doc) values
  ('fountain', '{"day": -1, "first": 0, "given": 0, "pot": 0, "by": {}, "who": [], "lately": [], "blessings": []}'::jsonb)
  on conflict (key) do nothing;

-- Every wish granted, a line each: when, which, what the pot had to reach,
-- whose coin filled it, how many people's coins were in it, and until when it
-- ran. Written by town_toss and by nothing else; read by no browser.
create table if not exists public.town_blessings (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  day       integer not null,
  round     integer not null,
  wish      text not null,
  goal      numeric not null,
  by_member uuid references public.profiles (id) on delete set null,
  people    integer not null,
  until     timestamptz not null
);

create index if not exists town_blessings_at on public.town_blessings (at desc);

alter table public.town_blessings enable row level security;
revoke all on public.town_blessings from anon, authenticated;

-- A wish in its writer's words: one a member a day (the game's day), the wish
-- it was tossed towards, who tossed a coin onto it and who reported it (each
-- once), and whether it is hidden (by three reports, or by an admin: then
-- hidden_by says who, and what its writer writes that day stays hidden).
-- Written and read through the functions below, and by nothing else.
create table if not exists public.town_wish_notes (
  id        bigint generated always as identity primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  at        timestamptz not null default now(),
  day       integer not null,
  wish      text not null,
  note      text not null check (char_length(note) between 1 and 80),
  cheers    uuid[] not null default '{}',
  reports   uuid[] not null default '{}',
  hidden    boolean not null default false,
  hidden_by uuid references public.profiles (id) on delete set null,
  unique (member_id, day)
);

create index if not exists town_wish_notes_at on public.town_wish_notes (at desc);

alter table public.town_wish_notes enable row level security;
revoke all on public.town_wish_notes from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- The numbers as one document, as the rules take them: a share, coins, a
-- count, a multiple, hours, people, seconds, a multiple; and what three of
-- the fountain's own blessings come to.
create or replace function town.wishing()
returns jsonb language sql stable set search_path = public
as $$
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
$$;

-- What can be wished for: what a meal leaves behind, then the fountain's own,
-- in the order the site lists them (of two wishes with as much behind them,
-- the earlier wins).
create or replace function town.wishes()
returns text[] language sql immutable
as $$ select array['calm', 'keen', 'lucky', 'hearty', 'green', 'swift', 'clear', 'spring', 'sprout', 'feast', 'carry'] $$;

-- A line dropped under the swift blessing: the bite, and each twitch of the
-- float before it, come sooner. (Whole seconds to the bite, as a line's are;
-- one at the least.)
create or replace function town.hastened(p_line jsonb, p_by double precision)
returns jsonb language sql immutable
as $$
  select p_line || jsonb_build_object(
    'wait', greatest(1, ceil((p_line->>'wait')::double precision * (1 - p_by)))::int,
    'nibbles', (select coalesce(jsonb_agg((n.x #>> '{}')::double precision * (1 - p_by) order by n.ord), '[]'::jsonb)
                  from jsonb_array_elements(p_line->'nibbles') with ordinality n(x, ord)))
$$;

-- The day's first goal, when the village's purses hold so many coins.
create or replace function town.first_goal(p_supply double precision, p_k jsonb)
returns double precision language sql immutable
as $$
  select greatest((p_k->>'least')::double precision,
    floor((p_k->>'share')::double precision * greatest(0::double precision, p_supply) + 0.5::double precision))
$$;

-- The fountain on the day a moment is in: a new day has a new first goal and
-- its blessings ahead of it; the pot, and the blessings still running, are as
-- they were.
create or replace function town.dawned(p_f jsonb, p_now bigint, p_supply double precision, p_k jsonb)
returns jsonb language sql stable
as $$
  select case when (p_f->>'day')::int = town.day_of(p_now) then p_f
    else p_f || jsonb_build_object('day', town.day_of(p_now), 'first', town.first_goal(p_supply, p_k), 'given', 0) end
$$;

-- What the pot has to reach for the next blessing; null when the day's last
-- has been given.
create or replace function town.goal_of(p_f jsonb, p_k jsonb)
returns double precision language sql immutable
as $$
  select case when (p_f->>'given')::int >= (p_k->>'rounds')::int then null
    else (p_f->>'first')::double precision * power((p_k->>'more')::double precision, (p_f->>'given')::int) end
$$;

-- The blessings somebody has now: those running that their coin is in, the
-- oldest first.
create or replace function town.blessings_of(p_f jsonb, p_me text, p_now bigint)
returns jsonb language sql immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.v->>'id', 'until', (b.v->>'until')::bigint) order by b.ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_f->'blessings', '[]'::jsonb)) with ordinality b(v, ord)
   where (b.v->>'until')::bigint > p_now and b.v->'of' ? p_me
$$;

-- Toss coins towards a wish. The fountain takes no more than fills the pot
-- (`took`); what it took counts for `counted` towards the goal; and when that
-- fills the pot, `granted` is the wish that came true. `p_supply` is all the
-- coins in the village's purses (read only on the day's first toss).
create or replace function town.toss(p_purse jsonb, p_f jsonb, p_me text, p_wish text, p_coins double precision, p_now bigint,
  p_supply double precision, p_k jsonb)
returns jsonb language plpgsql stable
as $$
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
$$;

-- A purse as the rules are to see it: with the blessings its member has,
-- while they last.
create or replace function town.blessed(p_purse jsonb, p_f jsonb, p_me text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when jsonb_array_length(m.mine) > 0 then p_purse || jsonb_build_object('blessed', m.mine) else p_purse - 'blessed' end
    from (select town.blessings_of(coalesce(p_f, '{}'::jsonb), p_me, p_now) as mine) m
$$;

-- Whether somebody has a buff now, from a meal or from the fountain: what
-- every rule asks. (The same one twice is no stronger.)
create or replace function town.has_buff(p_purse jsonb, p_now bigint, p_id text)
returns boolean language sql stable
as $$
  select coalesce(town.buff_of(p_purse, p_now) = p_id, false)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_purse->'blessed') = 'array' then p_purse->'blessed' else '[]'::jsonb end) b
                  where b->>'id' = p_id and (b->>'until')::bigint > p_now)
$$;

/* ── the rules that ask for a buff: each as it last ran, asking has_buff ─── */

-- (v107's: a hearty meal, or a hearty blessing)

create or replace function town.cost_of(p_purse jsonb, p_n double precision, p_now bigint)
returns integer language sql stable
as $$
  select floor(p_n * (case when town.has_buff(p_purse, p_now, 'hearty')
    then 1::double precision - (town.cat('stamina')->'buffs'->>'hearty')::double precision else 1::double precision end) + 0.5::double precision)::integer
$$;

-- (v108's: keen)

create or replace function town.strike_window(p_purse jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select (c.f->>'strike')::double precision * (
    (case when town.has_buff(p_purse, p_now, 'keen') then 1::double precision + (town.cat('stamina')->'buffs'->>'keen')::double precision else 1::double precision end)
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision)))
    from (select town.cat('fishing') as f) c
$$;

-- (v110's: green; and under the fountain's spring the can is not the emptier for it)

create or replace function town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
          * (case when town.has_buff(p_purse, p_now, 'green') then 1::double precision + (town.cat('stamina')->'buffs'->>'green')::double precision
                  else 1::double precision end))),
    'purse', town.spend(p_purse, (f->'costs'->>'water')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text], can || jsonb_build_object('water', (can->>'water')::numeric - (case when town.has_buff(p_purse, p_now, 'spring') then 0 else 1 end)))));
end;
$$;

/* ── the fountain's own blessings, in the rules they change ──────────────── */

-- (v110's: under the fountain's warm soil a seed is some of its way to ripe at once)

create or replace function town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
$$;

-- (v111's: under the fountain's big pot, a pot of food gives a helping more)

create or replace function town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
$$;

-- (v110's: under the fountain's blessing for water bearers a bucket drawn holds a bucketful more)

create or replace function town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
$$;

-- (v121's: the bucketfuls drawn are written down as the bucket holds them)

create or replace function public.town_chore(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

/* ── a purse read: v107's, with the blessings its member has ─────────────── */

create or replace function town.purse_of(p_member uuid, p_hold boolean)
returns jsonb language sql set search_path = public
as $$ select town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms()) $$;

/* ── a line dropped: v122's, lucky by a meal or by a blessing; swift; clear ─ */

create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
    array[random(), random(), random(), random(), random(), random()]);
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
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end));
end;
$$;

/* ── what a member asks ──────────────────────────────────────────────────── */

-- The fountain as a member is told it: today's goal and how the pot stands,
-- how much is behind each wish, who has tossed into it (by name, in the order
-- they first did, and never how much each), whether my coin is in it; the
-- blessings running (which, until when, whose coin filled the pot, how many
-- have it, whether I do); and the numbers a page words itself with.
create or replace function town.fountain_told(p_me uuid)
returns jsonb language sql stable set search_path = public
as $$
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
$$;

-- Look at the fountain.
create or replace function public.town_fountain()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('fountain', town.fountain_told(me), 'purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$$;

-- A toss done and kept: my purse and the fountain held, the rule asked, and
-- what it gave kept and written down (p_doc beside it: that it carried
-- words, or was tossed onto somebody's). What the rule answered, less the
-- fountain.
create or replace function town.tossed(p_me uuid, p_wish text, p_coins integer, p_doc jsonb)
returns jsonb language plpgsql set search_path = public
as $$
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
$$;

-- A wish's words as they are kept: what cannot be seen made a space, runs of
-- spaces made one, none at either end. Null when nothing is left, or more
-- than eighty letters.
create or replace function town.tidy_note(p_text text)
returns text language sql immutable
as $$
  select case when t.s = '' or char_length(t.s) > 80 then null else t.s end
    from (select btrim(regexp_replace(regexp_replace(coalesce(p_text, ''), '[' || chr(1) || '-' || chr(31) || chr(127) || ']', ' ', 'g'), ' +', ' ', 'g'), ' ') as s) t
$$;

-- Toss coins into it, towards a wish; with a line of words, if I like: my wish
-- of the day (one I wrote earlier today is written over, and whoever tossed a
-- coin onto the old one has not tossed onto the new). Words that cannot be
-- kept refuse the toss: nothing is taken for a wish that is not written.
create or replace function public.town_toss(p_wish text, p_coins integer, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Toss coins onto somebody's wish: towards the wish it was for, like any coin,
-- and my name beside theirs (once). Not onto my own, nor onto one that is
-- hidden or gone.
create or replace function public.town_cheer(p_note bigint, p_coins integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Say that somebody's wish should not be there: once each, never of my own.
-- The third report hides it.
create or replace function public.town_wish_report(p_note bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

-- Take my own wish's words back.
create or replace function public.town_wish_unsay(p_note bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  n_ integer;
begin
  delete from public.town_wish_notes n where n.id = p_note and n.member_id = me;
  get diagnostics n_ = row_count;
  return town.answer(me, case when n_ > 0 then '{"ok": true}'::jsonb else town.no('none') end) || jsonb_build_object('fountain', town.fountain_told(me));
end;
$$;

-- An admin hides a wish, or shows it again. Hidden by an admin, what its
-- writer writes for the rest of that day stays hidden.
create or replace function public.town_wish_hide(p_note bigint, p_hidden boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
$$;

/* ── what is written down: v121's and v108's, with the blessings held ────── */

-- The blessings somebody has at this moment, as a line's doc keeps them:
-- {"under": ["swift", "clear"]}, or nothing.
create or replace function town.under(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select case when jsonb_array_length(b.ids) > 0 then jsonb_build_object('under', b.ids) else '{}'::jsonb end
    from (select coalesce((select jsonb_agg(x.v->>'id' order by x.ord) from jsonb_array_elements(
            town.blessings_of(coalesce(town.thing('fountain', false), '{}'::jsonb), p_member::text, town.now_ms())) with ordinality x(v, ord)), '[]'::jsonb) as ids) b
$$;

create or replace function town.note(p_member uuid, p_what text, p_thing text default null, p_n numeric default 1,
  p_coins numeric default 0, p_doc jsonb default '{}'::jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_deeds (member_id, at, what, thing, n, coins, doc)
  values (p_member, to_timestamp(town.now_ms() / 1000.0), coalesce(p_what, '?'), p_thing, coalesce(p_n, 1), coalesce(p_coins, 0), coalesce(p_doc, '{}'::jsonb) || town.under(p_member))
$$;

create or replace function town.record(p_member uuid, p_game text, p_won boolean, p_secs double precision, p_spent boolean, p_buff text, p_doc jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_plays (member_id, game, at, won, secs, spent, buff, doc)
  values (p_member, p_game, to_timestamp(town.now_ms() / 1000.0), p_won, greatest(0, p_secs)::real, p_spent, p_buff, coalesce(p_doc, '{}'::jsonb) || town.under(p_member))
$$;

/* ── the tally's word for it: v121's, with one more ──────────────────────── */

create or replace function town.deed_th(p_what text)
returns text language sql immutable
as $$
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
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    else p_what end
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the two deeds and the line are a
-- member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_fountain() from public, anon;
grant execute on function public.town_fountain() to authenticated;
-- (a draft of this file had a toss of two words: it is not left beside the one of three)
drop function if exists public.town_toss(text, integer);
do $$
declare
  f text;
begin
  foreach f in array array['town_toss(text, integer, text)', 'town_cheer(bigint, integer)', 'town_wish_report(bigint)', 'town_wish_unsay(bigint)', 'town_wish_hide(bigint, boolean)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.town_cast(text, integer, integer, boolean) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) from public.town_knobs where key like 'wish\_%';
--   -- 12
--
--   select t.doc->>'pot' as pot, jsonb_array_length(t.doc->'blessings') as running,
--          (select c.relrowsecurity from pg_class c where c.oid = 'public.town_blessings'::regclass) as closed,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_blessings' and grantee in ('anon', 'authenticated')) as grants
--     from public.town_things t where t.key = 'fountain';
--   -- 0 | 0 | true | 0
--
--   select count(*) filter (where p.prosrc like '%town.has_buff(%') as ask_has_buff,
--          count(*) filter (where p.prosrc like '%town.buff_of(%= ''%') as ask_the_old_way
--     from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace)
--      and p.proname in ('cost_of', 'strike_window', 'water', 'sow', 'cook', 'chore', 'town_chore', 'town_cast');
--   -- 8 | 0
--
--   select has_function_privilege('authenticated', 'public.town_toss(text, integer, text)', 'execute') as member,
--          has_function_privilege('anon', 'public.town_toss(text, integer, text)', 'execute') as anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_open;
--   -- true | false | 0
--
--   select town.goal_of(town.dawned(t.doc, town.now_ms(), (select sum(coins) from public.town_purses), town.wishing()), town.wishing()) as todays_goal
--     from public.town_things t where t.key = 'fountain';
--   -- 3% of all the coins there are, and never under 100
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   select * from public.town_blessings order by at desc limit 20;          -- the wishes granted
--   select * from town.tally() where what = 'toss';                         -- who tossed, how often, how many coins
--   update public.town_knobs set value = 0.05 where key = 'wish_share';     -- the fountain asks for more
