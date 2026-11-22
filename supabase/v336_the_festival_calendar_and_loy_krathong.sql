-- v336: the festival calendar and Loy Krathong (Cash Town)
--
-- The owner, 2026-11-22: a festival calendar pinned on the village's Popoto Board where members see the festivals
-- to come; the first, Loy Krathong, yearly: members put together a custom krathong from the things of every line,
-- enter it in a contest, then float it; the year's outstanding makers are named with a plate and a picture beside
-- their krathong, and win what only the festival gives. His "ทำเลย" took the schedule both AIs advised (B):
--   made for the contest 23 Nov 18:00 -> 24 Nov 18:00 (Bangkok); floated 24 Nov 18:00 -> 26 Nov 05:00 (two nights);
--   voted 24 Nov 18:00 -> 25 Nov 18:00; results 25 Nov 20:00.
-- Every time, count and word here is a row he may change (`town_festivals.windows`, `.rules`): nothing in the code
-- holds a date.
--
-- What it adds (nothing it touches is older than it, but the bag it takes from):
--   public.town_festivals         a festival's edition a year: names, windows (jsonb), rules (jsonb), the judge's pick
--   public.town_krathongs         one krathong a member an edition: its design, what it took, entered or not, floated
--   public.town_krathong_votes    a member's popoto on a krathong (three each, never their own)
--   public.town_festival_awards   the year's outstanding krathongs and their makers, settled once
--   public.town_festivals_list()                         the calendar
--   public.town_krathong(festival)                       the stall: mine, the gallery, my popoto, the awards (settles them when due)
--   public.town_krathong_make(festival, design, name, request)   paid once from the bag, final
--   public.town_krathong_rename(festival, name)
--   public.town_krathong_vote(entry)                     a popoto given, or taken back
--   public.town_krathong_float(festival, wish)           once, while the float is open; the wish is the maker's alone
--   public.town_krathong_river(festival)                 what floats now, for the map
--   public.town_festival_judge(festival, entry)          an admin's pick, before the results
-- Tables: RLS on, no policy, nothing granted: only these functions reach them. Functions: SECURITY DEFINER,
-- search_path '', execute for `authenticated` only; `town.member()` lets in a proved character (or an admin).
-- Runs twice without harm.

begin;

create table if not exists public.town_festivals (
  id integer primary key,
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  year integer not null check (year between 2026 and 2100),
  name_th text not null,
  name_en text not null,
  about_th text not null default '',
  about_en text not null default '',
  icon text not null default 'festivalCalendar',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  windows jsonb not null default '[]'::jsonb check (jsonb_typeof(windows) = 'array'),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  published boolean not null default true,
  judge_entry bigint,
  settled_at timestamptz,
  unique (slug, year)
);

create table if not exists public.town_krathongs (
  id bigint generated always as identity primary key,
  festival integer not null references public.town_festivals (id) on delete cascade,
  member_id uuid not null,
  character_id bigint,
  name text not null check (char_length(name) between 1 and 24),
  design jsonb not null,
  paid jsonb not null,
  entered boolean not null,
  made_at timestamptz not null,
  floated_at timestamptz,
  wish text check (wish is null or char_length(wish) <= 140),
  request uuid not null,
  unique (festival, member_id)
);
create index if not exists town_krathongs_floated on public.town_krathongs (festival, floated_at) where floated_at is not null;

create table if not exists public.town_krathong_votes (
  festival integer not null references public.town_festivals (id) on delete cascade,
  entry bigint not null references public.town_krathongs (id) on delete cascade,
  voter uuid not null,
  at timestamptz not null default now(),
  primary key (entry, voter)
);
create index if not exists town_krathong_votes_voter on public.town_krathong_votes (festival, voter);

create table if not exists public.town_festival_awards (
  festival integer not null references public.town_festivals (id) on delete cascade,
  entry bigint not null references public.town_krathongs (id) on delete cascade,
  member_id uuid not null,
  kind text not null check (kind in ('popular', 'judge')),
  place integer not null,
  votes integer not null default 0,
  title_th text not null,
  title_en text not null,
  at timestamptz not null default now(),
  primary key (festival, entry, kind)
);

alter table public.town_festivals enable row level security;
alter table public.town_krathongs enable row level security;
alter table public.town_krathong_votes enable row level security;
alter table public.town_festival_awards enable row level security;
revoke all on public.town_festivals, public.town_krathongs, public.town_krathong_votes, public.town_festival_awards from public, anon, authenticated;

-- ── the first edition: Loy Krathong 2026 ──
-- <krathong-windows>
--   '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T11:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T11:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T13:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb
-- <krathong-parts>
--   '{"b_wood":{"slot":"base","pay":[["splitPlank",3],["carvingBlank",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",3],["fernTip",4]]},"b_bread":{"slot":"base","pay":[["flour",3],["pineNutFlour",3]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",4],["fernTip",5]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",4],["wildflower",6]]},"r_marigold":{"slot":"ring","pay":[["marigold",6]]},"l_candle":{"slot":"light","pay":[["beeswax",1]]},"l_firefly":{"slot":"light","pay":[["firefly",3]]},"c_flower":{"slot":"centre","pay":[["marigold",4],["wildflower",4],["wildOrchid",1],["moonflower",1],["goldenDandelion",1]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",2],["mushroomSpores",3]]},"c_shell":{"slot":"centre","pay":[["snail",3],["pearl",1]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",2],["monarch",1],["lunaMoth",1],["silkMoth",1]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",2],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",2],["lure",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",4],["gardenHoney",2],["sweetGlaze",1],["candiedPumpkin",1]]},"c_feather":{"slot":"centre","pay":[["feather",4],["wool",2],["yarn",1]]},"c_bell":{"slot":"centre","pay":[["copperBlank",2],["floatBell",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",4],["lotusRootBed",1]]},"t_flower":{"slot":"trim","pay":[["marigold",2],["wildflower",2],["fragrantPetal",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",2],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1]]},"t_carving":{"slot":"trim","pay":[["splitPlank",2],["carvingBlank",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",2],["gardenHoney",1],["sweetGlaze",1]]},"t_feather":{"slot":"trim","pay":[["feather",2],["wool",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",2]]}}'::jsonb
insert into public.town_festivals (id, slug, year, name_th, name_en, about_th, about_en, icon, starts_at, ends_at, windows, rules)
values (1, 'loykrathong', 2026, 'ลอยกระทง', 'Loy Krathong',
  'ประกอบกระทงจากของทุกสาย ประกวด แล้วลอยใต้จันทร์เต็มดวง',
  'Build a krathong from every line''s finds, enter it, then float it under the full moon',
  'floatKrathong', '2026-11-22T15:00:00Z', '2026-11-25T22:00:00Z',
  '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T11:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T11:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T13:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb,
  jsonb_build_object(
    'parts', '{"b_wood":{"slot":"base","pay":[["splitPlank",3],["carvingBlank",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",3],["fernTip",4]]},"b_bread":{"slot":"base","pay":[["flour",3],["pineNutFlour",3]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",4],["fernTip",5]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",4],["wildflower",6]]},"r_marigold":{"slot":"ring","pay":[["marigold",6]]},"l_candle":{"slot":"light","pay":[["beeswax",1]]},"l_firefly":{"slot":"light","pay":[["firefly",3]]},"c_flower":{"slot":"centre","pay":[["marigold",4],["wildflower",4],["wildOrchid",1],["moonflower",1],["goldenDandelion",1]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",2],["mushroomSpores",3]]},"c_shell":{"slot":"centre","pay":[["snail",3],["pearl",1]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",2],["monarch",1],["lunaMoth",1],["silkMoth",1]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",2],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",2],["lure",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",4],["gardenHoney",2],["sweetGlaze",1],["candiedPumpkin",1]]},"c_feather":{"slot":"centre","pay":[["feather",4],["wool",2],["yarn",1]]},"c_bell":{"slot":"centre","pay":[["copperBlank",2],["floatBell",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",4],["lotusRootBed",1]]},"t_flower":{"slot":"trim","pay":[["marigold",2],["wildflower",2],["fragrantPetal",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",2],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1]]},"t_carving":{"slot":"trim","pay":[["splitPlank",2],["carvingBlank",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",2],["gardenHoney",1],["sweetGlaze",1]]},"t_feather":{"slot":"trim","pay":[["feather",2],["wool",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",2]]}}'::jsonb,
    'max_trims', 3, 'votes_each', 3, 'places', 3,
    'titles', jsonb_build_object(
      'popular1', jsonb_build_object('th', 'ช่างกระทงแห่งปี 2026', 'en', 'Krathong Maker of 2026'),
      'popular', jsonb_build_object('th', 'ช่างกระทงดีเด่น 2026', 'en', 'Outstanding Krathong 2026'),
      'judge', jsonb_build_object('th', 'กระทงในดวงใจกรรมการ 2026', 'en', 'Judges'' Choice 2026'))))
on conflict (id) do nothing;

-- ── the rules ──

create or replace function town.festival_now() returns timestamptz
language sql stable set search_path to '' as $$ select to_timestamp(town.now_ms() / 1000.0) $$;

-- Whether a window of a festival's is open at a moment (a window with no `until` stays open).
create or replace function town.festival_open(p_windows jsonb, p_kind text, p_at timestamptz) returns boolean
language sql stable set search_path to '' as $$
  select coalesce(bool_or((w->>'from')::timestamptz <= p_at and (w->>'until' is null or p_at < (w->>'until')::timestamptz)), false)
    from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) w where w->>'kind' = p_kind
$$;

create or replace function town.festival_from(p_windows jsonb, p_kind text) returns timestamptz
language sql stable set search_path to '' as $$
  select min((w->>'from')::timestamptz) from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) w where w->>'kind' = p_kind
$$;

-- A design as it may be kept (only its five places), or null when any part is unknown, out of its place, or paid for
-- in a way the part has not. The twin of lib/town/krathong's `check`.
create or replace function town.krathong_design(p_parts jsonb, p_design jsonb, p_max integer) returns jsonb
language plpgsql immutable set search_path to '' as $$
declare
  places jsonb := '[]'::jsonb;
  e jsonb;
  pick jsonb;
  part jsonb;
begin
  if p_design is null or jsonb_typeof(p_design) <> 'object' or jsonb_typeof(p_design->'trims') is distinct from 'array'
     or jsonb_array_length(p_design->'trims') > p_max then return null; end if;
  places := jsonb_build_array(jsonb_build_array('base', p_design->'base'), jsonb_build_array('ring', p_design->'ring'),
                              jsonb_build_array('light', p_design->'light'), jsonb_build_array('centre', p_design->'centre'));
  for e in select jsonb_build_array('trim', t) from jsonb_array_elements(p_design->'trims') t loop places := places || jsonb_build_array(e); end loop;
  for e in select x from jsonb_array_elements(places) x loop
    pick := e->1;
    if pick is null or jsonb_typeof(pick) <> 'array' or jsonb_array_length(pick) <> 2
       or jsonb_typeof(pick->0) <> 'string' or jsonb_typeof(pick->1) <> 'number' or (pick->>1) !~ '^[0-9]{1,3}$' then return null; end if;
    part := p_parts->(pick->>0);
    if part is null or part->>'slot' is distinct from e->>0 then return null; end if;
    if (pick->>1)::int >= jsonb_array_length(part->'pay') then return null; end if;
  end loop;
  return jsonb_build_object('base', p_design->'base', 'ring', p_design->'ring', 'light', p_design->'light',
                            'centre', p_design->'centre', 'trims', p_design->'trims');
end;
$$;

-- What a kept design takes: {item: n}. The twin of lib/town/krathong's `costOf`.
create or replace function town.krathong_cost(p_parts jsonb, p_design jsonb) returns jsonb
language plpgsql immutable set search_path to '' as $$
declare
  need jsonb := '{}'::jsonb;
  pick jsonb;
  pay jsonb;
begin
  for pick in select x from jsonb_array_elements(jsonb_build_array(p_design->'base', p_design->'ring', p_design->'light', p_design->'centre') || (p_design->'trims')) x loop
    pay := p_parts->(pick->>0)->'pay'->((pick->>1)::int);
    need := need || jsonb_build_object(pay->>0, coalesce((need->>(pay->>0))::int, 0) + (pay->>1)::int);
  end loop;
  return need;
end;
$$;

-- A name or a wish as kept: one line, trimmed, cut to its length by characters.
create or replace function town.krathong_line(p_text text, p_max integer) returns text
language sql immutable set search_path to '' as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')), p_max), '')
$$;

create or replace function town.krathong_view(k public.town_krathongs) returns jsonb
language sql stable set search_path to '' as $$
  select jsonb_build_object('id', k.id, 'name', k.name, 'design', k.design, 'entered', k.entered,
    'made', (extract(epoch from k.made_at) * 1000)::bigint,
    'floated', case when k.floated_at is null then null else (extract(epoch from k.floated_at) * 1000)::bigint end)
$$;

create or replace function town.festival_view(f public.town_festivals) returns jsonb
language sql stable set search_path to '' as $$
  select jsonb_build_object('id', f.id, 'slug', f.slug, 'year', f.year,
    'name', jsonb_build_object('th', f.name_th, 'en', f.name_en), 'about', jsonb_build_object('th', f.about_th, 'en', f.about_en),
    'icon', f.icon, 'starts', f.starts_at, 'ends', f.ends_at, 'windows', f.windows)
$$;

-- The year's outstanding krathongs, once, when the results' window has opened: the `places` most-voted (equal popoto
-- share a place, the next skipped: 1, 1, 3; at least one popoto), and the judge's pick. The twin of `awardsOf`.
create or replace function town.krathong_settle(p_festival integer) returns void
language plpgsql security definer set search_path to '' as $$
declare
  f public.town_festivals%rowtype;
  t jsonb;
begin
  select * into f from public.town_festivals where id = p_festival for update;
  if not found or f.settled_at is not null or not town.festival_open(f.windows, 'results', town.festival_now()) then return; end if;
  t := f.rules->'titles';
  insert into public.town_festival_awards (festival, entry, member_id, kind, place, votes, title_th, title_en, at)
  select f.id, r.id, r.member_id, 'popular', r.place, r.votes,
         case when r.place = 1 then t->'popular1'->>'th' else t->'popular'->>'th' end,
         case when r.place = 1 then t->'popular1'->>'en' else t->'popular'->>'en' end, town.festival_now()
    from (select k.id, k.member_id, v.votes, rank() over (order by v.votes desc) as place
            from public.town_krathongs k
            join (select entry, count(*)::int as votes from public.town_krathong_votes where festival = f.id group by entry) v on v.entry = k.id
           where k.festival = f.id and k.entered) r
   where r.place <= coalesce((f.rules->>'places')::int, 3)
  on conflict do nothing;
  if f.judge_entry is not null then
    insert into public.town_festival_awards (festival, entry, member_id, kind, place, votes, title_th, title_en, at)
    select f.id, k.id, k.member_id, 'judge', 1, (select count(*)::int from public.town_krathong_votes v where v.entry = k.id),
           t->'judge'->>'th', t->'judge'->>'en', town.festival_now()
      from public.town_krathongs k where k.id = f.judge_entry and k.festival = f.id and k.entered
    on conflict do nothing;
  end if;
  update public.town_festivals set settled_at = town.festival_now() where id = f.id;
end;
$$;

-- ── what a member calls ──

create or replace function public.town_festivals_list() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'festivals',
    coalesce((select jsonb_agg(town.festival_view(f) order by f.starts_at) from public.town_festivals f where f.published), '[]'::jsonb));
end;
$$;

create or replace function public.town_krathong(p_festival integer) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  mine public.town_krathongs%rowtype;
  shown boolean;
  each_ integer;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.no('none'); end if;
  if f.settled_at is null and town.festival_open(f.windows, 'results', town.festival_now()) then
    perform town.krathong_settle(f.id);
    select * into f from public.town_festivals where id = p_festival;
  end if;
  shown := f.settled_at is not null;
  each_ := coalesce((f.rules->>'votes_each')::int, 3);
  select * into mine from public.town_krathongs where festival = f.id and member_id = me;
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'festival', town.festival_view(f),
    'rules', f.rules - 'titles',
    'mine', case when mine.id is null then null else town.krathong_view(mine) || jsonb_build_object('wish', mine.wish) end,
    'entries', coalesce((
      select jsonb_agg(town.krathong_view(k) || jsonb_build_object(
               'mine', k.member_id = me,
               'fc', exists (select 1 from public.fc_roster r where r.character_id = k.character_id))
             || case when shown then jsonb_build_object(
               'votes', (select count(*) from public.town_krathong_votes v where v.entry = k.id),
               'maker', (select jsonb_build_object('name', p.character_name, 'character', p.character_id) from public.profiles p where p.id = k.member_id))
             else '{}'::jsonb end
             order by k.id)
        from public.town_krathongs k where k.festival = f.id and k.entered), '[]'::jsonb),
    'voted', coalesce((select jsonb_agg(v.entry order by v.entry) from public.town_krathong_votes v where v.festival = f.id and v.voter = me), '[]'::jsonb),
    'votesEach', each_,
    'floated', (select count(*) from public.town_krathongs k where k.festival = f.id and k.floated_at is not null),
    'judged', f.judge_entry is not null,
    'awards', case when shown then coalesce((
      select jsonb_agg(jsonb_build_object('entry', a.entry, 'kind', a.kind, 'place', a.place, 'votes', a.votes,
               'title', jsonb_build_object('th', a.title_th, 'en', a.title_en),
               'krathong', town.krathong_view(k),
               'maker', (select jsonb_build_object('name', p.character_name, 'character', p.character_id) from public.profiles p where p.id = a.member_id),
               'fc', exists (select 1 from public.fc_roster r where r.character_id = k.character_id))
             order by a.kind desc, a.place, a.entry)
        from public.town_festival_awards a join public.town_krathongs k on k.id = a.entry where a.festival = f.id), '[]'::jsonb) else null end,
    'capsule', coalesce((
      select jsonb_agg(jsonb_build_object('year', o.year, 'name', k.name, 'design', k.design, 'wish', k.wish) order by o.year desc)
        from public.town_krathongs k join public.town_festivals o on o.id = k.festival
       where k.member_id = me and o.slug = f.slug and o.year < f.year and k.wish is not null), '[]'::jsonb));
end;
$$;

create or replace function public.town_krathong_make(p_festival integer, p_design jsonb, p_name text, p_request uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  k public.town_krathongs%rowtype;
  design jsonb;
  need jsonb;
  nm text;
  purse jsonb;
  bag jsonb;
  item text;
  n integer;
  at_ timestamptz := town.festival_now();
  entering boolean;
begin
  if p_request is null then return town.answer(me, town.no('none')); end if;
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.answer(me, town.no('none')); end if;
  -- the purse is held first: two sends at once wait for each other here
  perform town.purse_of(me, true);
  perform 1 from public.town_purses p where p.member_id = me for update;
  select * into k from public.town_krathongs where festival = f.id and member_id = me;
  if found then
    if k.request = p_request then return town.answer(me, jsonb_build_object('ok', true, 'repeated', true, 'krathong', town.krathong_view(k))); end if;
    return town.answer(me, town.no('made'));
  end if;
  entering := town.festival_open(f.windows, 'make', at_);
  if not (entering or town.festival_open(f.windows, 'float', at_)) then return town.answer(me, town.no('closed')); end if;
  nm := town.krathong_line(p_name, 24);
  if nm is null then return town.answer(me, town.no('name')); end if;
  design := town.krathong_design(f.rules->'parts', p_design, coalesce((f.rules->>'max_trims')::int, 3));
  if design is null then return town.answer(me, town.no('design')); end if;
  need := town.krathong_cost(f.rules->'parts', design);
  purse := town.purse_of(me, true);
  bag := purse->'bag';
  for item, n in select key, value::int from jsonb_each_text(need) loop
    if town.held(bag, item) < n then return town.answer(me, town.no('short') || jsonb_build_object('item', item, 'need', n)); end if;
  end loop;
  for item, n in select key, value::int from jsonb_each_text(need) loop
    bag := town.take(bag, item, n);
  end loop;
  perform town.keep_purse(me, jsonb_set(purse, '{bag}', bag));
  insert into public.town_krathongs (festival, member_id, character_id, name, design, paid, entered, made_at, request)
  values (f.id, me, (select p.character_id from public.profiles p where p.id = me), nm, design, need, entering, at_, p_request)
  returning * into k;
  perform town.note(me, 'krathong', f.slug, 1, 0, jsonb_build_object('entered', entering, 'paid', need));
  return town.answer(me, jsonb_build_object('ok', true, 'krathong', town.krathong_view(k)));
end;
$$;

create or replace function public.town_krathong_rename(p_festival integer, p_name text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  k public.town_krathongs%rowtype;
  nm text := town.krathong_line(p_name, 24);
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.no('none'); end if;
  if f.settled_at is not null or town.festival_open(f.windows, 'results', town.festival_now()) then return town.no('closed'); end if;
  if nm is null then return town.no('name'); end if;
  update public.town_krathongs set name = nm where festival = f.id and member_id = me returning * into k;
  if not found then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'krathong', town.krathong_view(k));
end;
$$;

create or replace function public.town_krathong_vote(p_entry bigint) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  k public.town_krathongs%rowtype;
  f public.town_festivals%rowtype;
  each_ integer;
begin
  select * into k from public.town_krathongs where id = p_entry;
  if not found or not k.entered then return town.no('none'); end if;
  select * into f from public.town_festivals where id = k.festival and published;
  if not found then return town.no('none'); end if;
  if not town.festival_open(f.windows, 'vote', town.festival_now()) then return town.no('closed'); end if;
  if k.member_id = me then return town.no('own'); end if;
  each_ := coalesce((f.rules->>'votes_each')::int, 3);
  -- one member's popoto one at a time
  perform pg_advisory_xact_lock(hashtextextended('town-krathong-vote:' || f.id || ':' || me::text, 0));
  if exists (select 1 from public.town_krathong_votes where entry = k.id and voter = me) then
    delete from public.town_krathong_votes where entry = k.id and voter = me;
  else
    if (select count(*) from public.town_krathong_votes where festival = f.id and voter = me) >= each_ then return town.no('spent'); end if;
    insert into public.town_krathong_votes (festival, entry, voter, at) values (f.id, k.id, me, town.festival_now());
  end if;
  return jsonb_build_object('ok', true,
    'voted', coalesce((select jsonb_agg(v.entry order by v.entry) from public.town_krathong_votes v where v.festival = f.id and v.voter = me), '[]'::jsonb),
    'votesEach', each_);
end;
$$;

create or replace function public.town_krathong_float(p_festival integer, p_wish text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  k public.town_krathongs%rowtype;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.no('none'); end if;
  select * into k from public.town_krathongs where festival = f.id and member_id = me for update;
  if not found then return town.no('none'); end if;
  if k.floated_at is not null then return jsonb_build_object('ok', true, 'repeated', true, 'krathong', town.krathong_view(k)); end if;
  if not town.festival_open(f.windows, 'float', town.festival_now()) then return town.no('closed'); end if;
  update public.town_krathongs set floated_at = town.festival_now(), wish = town.krathong_line(p_wish, 140)
   where id = k.id returning * into k;
  perform town.note(me, 'krathong_float', f.slug, 1, 0, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'krathong', town.krathong_view(k));
end;
$$;

-- What floats now, for the map: every krathong floated while the float is open, newest last (at most 300).
create or replace function public.town_krathong_river(p_festival integer) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found or not town.festival_open(f.windows, 'float', town.festival_now()) then
    return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'design', x.design, 'floated', (extract(epoch from x.floated_at) * 1000)::bigint, 'mine', x.member_id = me) order by x.floated_at)
      from (select * from public.town_krathongs k where k.festival = f.id and k.floated_at is not null order by k.floated_at desc limit 300) x), '[]'::jsonb));
end;
$$;

create or replace function public.town_festival_judge(p_festival integer, p_entry bigint) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  f public.town_festivals%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then return town.no('denied'); end if;
  select * into f from public.town_festivals where id = p_festival for update;
  if not found then return town.no('none'); end if;
  if f.settled_at is not null then return town.no('closed'); end if;
  if p_entry is not null and not exists (select 1 from public.town_krathongs k where k.id = p_entry and k.festival = f.id and k.entered) then
    return town.no('none');
  end if;
  update public.town_festivals set judge_entry = p_entry where id = f.id;
  return jsonb_build_object('ok', true, 'judge', p_entry);
end;
$$;

revoke all on function town.festival_now(), town.festival_open(jsonb, text, timestamptz), town.festival_from(jsonb, text),
  town.krathong_design(jsonb, jsonb, integer), town.krathong_cost(jsonb, jsonb), town.krathong_line(text, integer),
  town.krathong_view(public.town_krathongs), town.festival_view(public.town_festivals), town.krathong_settle(integer)
  from public, anon, authenticated;
revoke all on function public.town_festivals_list(), public.town_krathong(integer), public.town_krathong_make(integer, jsonb, text, uuid),
  public.town_krathong_rename(integer, text), public.town_krathong_vote(bigint), public.town_krathong_float(integer, text),
  public.town_krathong_river(integer), public.town_festival_judge(integer, bigint) from public, anon;
grant execute on function public.town_festivals_list(), public.town_krathong(integer), public.town_krathong_make(integer, jsonb, text, uuid),
  public.town_krathong_rename(integer, text), public.town_krathong_vote(bigint), public.town_krathong_float(integer, text),
  public.town_krathong_river(integer), public.town_festival_judge(integer, bigint) to authenticated;

commit;

-- Afterwards (each should say what is written beside it):
-- select id, slug, year, jsonb_array_length(windows), (select count(*) from jsonb_object_keys(rules->'parts')) from public.town_festivals;  -- 1 loykrathong 2026 6 28
-- select has_table_privilege('anon', 'public.town_krathongs', 'select'), has_function_privilege('anon', 'public.town_krathong(integer)', 'execute');  -- f f
