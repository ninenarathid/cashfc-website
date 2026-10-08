-- v163 — the lamp relay at dusk
--
-- A DRAFT: it is not in supabase/ and has not run. Run it once in the Supabase
-- SQL editor, after v160 (the bridge built by hand), which it stands on.
-- Running it again is safe.
--
-- The owner, 2026-10-08, of three games like the bucket line ("เอา 1 2 3"), and
-- then of this one: "ส่งไฟจุดโคมตอนค่ำ เหลือไฟในมือ 5 วินาทีพอ ยิ่งจุดเยอะ แมพยิ่งสวย
-- ขอให้เป็นบรรยากาศสวยๆน่าจดจำไปเลย"; it takes the place of the lamps he had meant
-- as a builder's works ("แทนงานโคมลุงก่อสร้างเลย").
--
-- From half past five in the evening (Bangkok) until five in the morning the
-- farm and the forest each have one fire and twelve lamp posts.
--
--   · **A flame is taken at the fire with empty hands** (nothing in the hand,
--     no stone of the bridge's in the hands, no live flame): for nothing. It
--     is in the hands, never in the bag: `town_lamp_flames` has, for whoever
--     bears one, the moment it dies (**five seconds on, by this database's
--     clock**) and whose hands it has been through (the last eight, the bearer
--     last).
--   · **Handed on** to somebody with empty hands: for nothing, and it is fresh
--     again, five seconds from that moment. **A handing on asked for up to a
--     second after the flame's time still counts**: lag is nobody's fault.
--   · **Never from a lamp**: there is no way to a flame but a fire.
--   · **A post is lit** with a flame that is alive (or within that second),
--     from a tile by the post: one stamina (none left: lit all the same, and
--     the flame is good for the 1.2 seconds longer that tired hands hold the
--     button for). The flame is spent; the post is lit **until five in the
--     morning** (`town_lamps_lit`, by the night); and **everybody whose hands
--     the flame went through has three points on the helpers' line**: a deed
--     for whoever lit it (`lamp_light`) and one for each of the others
--     (`lamp_hand`), which v149's trigger counts by `town.work_counts_of`. The
--     helpers' day's bound holds them as it holds every point of theirs.
--   · A night on which every lamp of a map was lit is kept (`town_lamp_nights`:
--     `full_at`), and a page is told how many there have been.
--   · No coins come of it, nothing that can be sold, and no thing: a flame is
--     no item. Nothing is lost when nobody lights: no lamp is lit, that is all.
--
-- **It needs no opening**: it runs by the clock, every night, for whoever the
-- town's game is open to. The numbers are the catalog's row `lamps` (to stop
-- it without a deploy, put its night out of the day:
-- `update public.town_catalog set data = data || '{"from": 1740}' where key = 'lamps';`
-- and no moment is night to the database: a page still shows the night by its
-- own clock, and is answered `day`).
--
-- The database cannot know where anybody stands (nothing of the game's can:
-- the room is the page's), so how near two are for a flame to be handed on is
-- the page's to hold to; the tile somebody takes a flame or lights a post from
-- is the page's word, held to the catalog's tiles, as it is at the bridge.
--
-- **Two functions that were there are written again, each main's text exactly
-- as it is live after v159 (v153's) with v160's marked block as v160 has it,
-- and one block more of this file's, marked with a comment at its top and at
-- its end**: `town.work_counts_of`, for the two deeds of a post lit, and
-- `town.deed_th`, for four words. Nothing else in them is changed, not even
-- the layout, and nothing else that was there is written again. **A file
-- after this one that writes either again carries both blocks with its own.**
-- The rules are lib/town/lamps.ts written again (`town.lamp_night`, `lamp_by`,
-- `flame_take`, `flame_pass`, `lamp_light`), held to the code case by case by
-- the dry run.
--
-- **The code goes out before this file**: a page with the code and a database
-- without the file is told nothing of any lamps, and shows nothing of them.

/* ── v149 and v160 first ─────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regclass('public.town_work') is null or to_regclass('public.town_deeds') is null then
    raise exception 'v163 needs v149: a post lit is counted on the helpers'' line, which that file made';
  end if;
  if to_regprocedure('town.works_carried(uuid)') is null then
    raise exception 'v163 needs v160: a flame is taken with empty hands, and whether a stone is in them is that file''s to say';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v163> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('lamps', $town${
    "from": 1050,
    "until": 300,
    "life": 5,
    "grace": 1,
    "reach": 3,
    "near": 2,
    "cost": 1,
    "hold": 1.2,
    "light": 6,
    "hands": 8,
    "point": 3,
    "more": [4,8],
    "maps": {"farm":{"fire":[155,24],"posts":[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39]]},"forest":{"fire":[193,159],"posts":[[194,168],[192,177],[190,182],[190,186],[193,148],[192,141],[194,132],[189,124],[205,158],[213,158],[218,150],[224,146]]}}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v163>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A night on a map on which somebody came to light a lamp (the night is the
-- number of the Bangkok day its evening is of), and when every lamp of that
-- map was lit on it (null: not all of them were).
create table if not exists public.town_lamp_nights (
  night   integer not null,
  map     text not null,
  full_at timestamptz,
  primary key (night, map)
);
-- A post lit: on which night, which map's, which post, who lit it, whose hands
-- the flame came by (in the order it went through them, whoever lit it last),
-- and when.
create table if not exists public.town_lamps_lit (
  night     integer not null,
  map       text not null,
  post      integer not null check (post >= 0),
  member_id uuid references public.profiles (id) on delete set null,
  hands     uuid[] not null default '{}',
  lit_at    timestamptz not null default now(),
  primary key (night, map, post),
  foreign key (night, map) references public.town_lamp_nights (night, map) on delete cascade
);
-- The flame somebody bears: at which map's fire it was taken, whose hands it
-- has been through (the bearer last), and the moment it dies, in milliseconds
-- of the town's clock. (One that has gone out stays until its bearer takes
-- another or is handed one: nothing reads it.)
create table if not exists public.town_lamp_flames (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  map       text not null,
  hands     uuid[] not null default '{}',
  until_ms  bigint not null,
  at        timestamptz not null default now()
);
alter table public.town_lamp_nights enable row level security;
alter table public.town_lamps_lit enable row level security;
alter table public.town_lamp_flames enable row level security;
revoke all on public.town_lamp_nights, public.town_lamps_lit, public.town_lamp_flames from anon, authenticated;

/* ── the rules: lib/town/lamps.ts, written again ─────────────────────────── */

-- The night a moment is in: the number of the Bangkok day its evening is of
-- (the same from half past five until five the next morning); nothing by day.
create or replace function town.lamp_night(p_now bigint)
returns integer language sql stable
as $$
  select case when mod(x.t, 86400000) >= ((l.k->>'from')::bigint - (l.k->>'until')::bigint) * 60000 then (x.t / 86400000)::integer end
    from (select town.cat('lamps') as k) l, lateral (select p_now + 7 * 3600000 - (l.k->>'until')::bigint * 60000 as t) x
$$;

-- Whether somebody on a tile stands by a map's fire (no post said) or by one
-- of its posts: within so many tiles of it, either way. (No tile is near a
-- map that has no lamps, or a post it has none of.)
create or replace function town.lamp_by(p_map text, p_post integer, p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select p_x is not null and p_y is not null and coalesce(jsonb_typeof(t.tile) = 'array', false)
     and coalesce(greatest(abs(p_x - (t.tile->>0)::integer), abs(p_y - (t.tile->>1)::integer)) <= (l.k->>'near')::integer, false)
    from (select town.cat('lamps') as k) l,
         lateral (select case when p_post is null then l.k->'maps'->p_map->'fire' when p_post >= 0 then l.k->'maps'->p_map->'posts'->p_post end as tile) t
$$;

-- Whether a flame is alive at a moment: there is one, and it has not reached
-- its time.
create or replace function town.flame_alive(p_flame jsonb, p_now bigint)
returns boolean language sql immutable
as $$
  select coalesce(jsonb_typeof(p_flame), '') = 'object' and p_now < (p_flame->>'until')::bigint
$$;

-- Whether a flame can still be handed on or lit with at a moment: up to its
-- time and the second of grace (and so many seconds more, for tired hands
-- that hold the button).
create or replace function town.flame_good(p_flame jsonb, p_now bigint, p_more double precision)
returns boolean language sql stable
as $$
  select p_now <= (p_flame->>'until')::bigint + round(((town.cat('lamps')->>'grace')::numeric + coalesce(p_more, 0)::numeric) * 1000)::bigint
$$;

-- Take a flame at a map's fire: by night, from a tile by the fire, with
-- nothing in the hand, no stone in the hands and no live flame, while that map
-- still has a post unlit. For nothing. It lives five seconds.
create or replace function town.flame_take(p_purse jsonb, p_flame jsonb, p_stone boolean, p_lit integer, p_map text, p_x integer, p_y integer, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  l jsonb := town.cat('lamps');
  posts jsonb := l->'maps'->p_map->'posts';
begin
  if town.lamp_night(p_now) is null then return town.no('day'); end if;
  if coalesce(jsonb_typeof(posts), '') <> 'array' then return town.no('far'); end if;
  if coalesce(p_lit, 0) >= jsonb_array_length(posts) then return town.no('whole'); end if;
  if town.flame_alive(p_flame, p_now) then return town.no('held'); end if;
  if town.hand_of(p_purse) is not null then return town.no('hand'); end if;
  if coalesce(p_stone, false) then return town.no('stone'); end if;
  if not town.lamp_by(p_map, null, p_x, p_y) then return town.no('far'); end if;
  return jsonb_build_object('ok', true,
    'flame', jsonb_build_object('from', p_map, 'until', p_now + round((l->>'life')::numeric * 1000)::bigint, 'hands', jsonb_build_array(p_me)));
end;
$$;

-- Hand the flame one bears on to somebody with nothing in the hand, no stone
-- and no live flame: for nothing, and it is fresh again from this moment. It
-- goes with the hands it came by, the taker's last (once), the last so many
-- remembered. Up to a second after the flame's time it still counts.
create or replace function town.flame_pass(p_flame jsonb, p_to text, p_theirs jsonb, p_their_flame jsonb, p_their_stone boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  l jsonb := town.cat('lamps');
  most integer := (l->>'hands')::integer;
  hands jsonb;
begin
  if coalesce(jsonb_typeof(p_flame), '') <> 'object' then return town.no('none'); end if;
  if not town.flame_good(p_flame, p_now, 0) then return town.no('out'); end if;
  if town.flame_alive(p_their_flame, p_now) then return town.no('held'); end if;
  if town.hand_of(p_theirs) is not null then return town.no('hand'); end if;
  if coalesce(p_their_stone, false) then return town.no('stone'); end if;
  select coalesce(jsonb_agg(x.id order by x.ord), '[]'::jsonb) || jsonb_build_array(p_to) into hands
    from jsonb_array_elements_text(p_flame->'hands') with ordinality x(id, ord) where x.id <> p_to;
  if jsonb_array_length(hands) > most then
    select jsonb_agg(x.v order by x.ord) into hands from jsonb_array_elements(hands) with ordinality x(v, ord) where x.ord > jsonb_array_length(hands) - most;
  end if;
  return jsonb_build_object('ok', true,
    'flame', jsonb_build_object('from', p_flame->'from', 'until', p_now + round((l->>'life')::numeric * 1000)::bigint, 'hands', hands));
end;
$$;

-- Light a post with the flame one bears: by night, from a tile by the post,
-- which is not lit yet (`p_lit`: the posts of that map lit tonight, by their
-- numbers). One stamina (none left: lit all the same, and the flame is good
-- for the hold's time longer). Says whose hands the flame came by, how many of
-- the map's posts are lit now and of how many, and whether that is all.
create or replace function town.lamp_light(p_purse jsonb, p_flame jsonb, p_lit jsonb, p_map text, p_post integer, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  l jsonb := town.cat('lamps');
  lit jsonb := coalesce(p_lit, '[]'::jsonb);
  n integer;
  of_ integer;
begin
  if town.lamp_night(p_now) is null then return town.no('day'); end if;
  if coalesce(jsonb_typeof(p_flame), '') <> 'object' then return town.no('none'); end if;
  if not town.flame_good(p_flame, p_now, case when town.stamina_of(p_purse, p_now) <= 0 then (l->>'hold')::double precision else 0 end) then return town.no('out'); end if;
  if p_post is null or not town.lamp_by(p_map, p_post, p_x, p_y) then return town.no('far'); end if;
  if lit @> to_jsonb(p_post) then return town.no('lit'); end if;
  n := jsonb_array_length(lit) + 1;
  of_ := jsonb_array_length(l->'maps'->p_map->'posts');
  return jsonb_build_object('ok', true,
    'purse', town.spend(p_purse, (l->>'cost')::double precision, p_now),
    'hands', p_flame->'hands', 'n', n, 'of', of_, 'full', n >= of_);
end;
$$;

/* ── what is kept, read ──────────────────────────────────────────────────── */

-- The flame a member bears, as the rules read it. Nothing, for none.
create or replace function town.lamps_flame(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('from', f.map, 'until', f.until_ms, 'hands', to_jsonb(f.hands)) from public.town_lamp_flames f where f.member_id = p_member
$$;

-- The posts of a map lit on a night, by their numbers. (None, by day.)
create or replace function town.lamps_lit(p_map text, p_night integer)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(l.post order by l.post), '[]'::jsonb) from public.town_lamps_lit l where l.night = p_night and l.map = p_map
$$;

-- The lamps as a member is told them (lib/town/lamps' `told`): the night it
-- is (nothing by day); of each map the posts lit tonight, each with the hands
-- its flame came by, **the night's lighters in the order they first came, with
-- no numbers**, and how many nights every lamp of the map has been lit; and
-- the flame the member bears, while it lives: the moment it dies, and how many
-- hands it has been through.
create or replace function town.lamps_told(p_member uuid, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'night', n.night,
    'maps', (
      select jsonb_object_agg(m.map, jsonb_build_object(
        'lit', coalesce((
          select jsonb_agg(jsonb_build_object('post', l.post, 'at', round(extract(epoch from l.lit_at) * 1000)::bigint,
                   'hands', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) order by x.ord)
                                        from unnest(l.hands) with ordinality x(id, ord) join public.profiles pr on pr.id = x.id), '[]'::jsonb))
                   order by l.post)
            from public.town_lamps_lit l where l.night = n.night and l.map = m.map), '[]'::jsonb),
        'lighters', coalesce((
          select jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name) order by q.first_at, q.first_post, q.first_ord)
            from (select distinct on (x.id) x.id, coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name,
                         l.lit_at as first_at, l.post as first_post, x.ord as first_ord
                    from public.town_lamps_lit l cross join lateral unnest(l.hands) with ordinality x(id, ord) join public.profiles pr on pr.id = x.id
                   where l.night = n.night and l.map = m.map
                   order by x.id, l.lit_at, l.post, x.ord) q), '[]'::jsonb),
        'full', (select count(*)::integer from public.town_lamp_nights f where f.map = m.map and f.full_at is not null)))
        from jsonb_object_keys(town.cat('lamps')->'maps') as m(map)),
    'flame', (select jsonb_build_object('until', f.until_ms, 'hands', coalesce(array_length(f.hands, 1), 0))
                from public.town_lamp_flames f where f.member_id = p_member and p_now < f.until_ms))
    from (select town.lamp_night(p_now) as night) n
$$;

/* ── the helpers' line counts a post lit; the tally's words ───────────────── */

-- `town.work_counts_of`: **main's text of it exactly as it is live after v159** (v153's), with v160's marked block as
-- v160 has it, and one block more of this file's, marked at its top and its end: a post lit is three points on the
-- helpers' line for whoever lit it and for each of the others its flame came by (what it is worth is the lamps' own
-- number, the catalog's `lamps.point`). Nothing else in it is changed, not even its layout: a file after this one
-- that writes it again carries both blocks with its own.
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
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
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
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;

-- `town.deed_th`: main's text of it exactly as it is live after v159 (v153's), with v160's marked block as v160 has
-- it, and one block more of this file's, marked the same way: four words, for the lamps' four deeds.
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
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    -- ── the lamp relay at dusk (v163) ──
    when 'flame_take' then 'รับไฟจากกองไฟ' when 'flame_pass' then 'ส่งไฟต่อให้คนถัดไป' when 'lamp_light' then 'จุดโคม' when 'lamp_hand' then 'ไฟที่ช่วยกันส่งต่อมาจุดโคม'
    -- ── the lamp relay at dusk (v163): its end ──
    else p_what end
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The lamps as I am told them, and the flame I bear.
create or replace function public.town_lamps_read()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  return jsonb_build_object('now', now_, 'lamps', town.lamps_told(me, now_));
end;
$$;

-- Take a flame at a map's fire, from the tile I stand on.
create or replace function public.town_flame_take(p_map text, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  -- (my purse's row is held first, as by every deed of mine: the flame I bear needs no holding of its own)
  mine jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.flame_take(mine, town.lamps_flame(me), town.works_carried(me) is not null,
                         jsonb_array_length(town.lamps_lit(p_map, town.lamp_night(now_))), p_map, p_x, p_y, me::text, now_);
  if (did->>'ok')::boolean then
    -- (a flame of mine that has gone out is written over)
    insert into public.town_lamp_flames (member_id, map, hands, until_ms, at)
      values (me, p_map, array[me], (did->'flame'->>'until')::bigint, to_timestamp(now_ / 1000.0))
      on conflict (member_id) do update set map = excluded.map, hands = excluded.hands, until_ms = excluded.until_ms, at = excluded.at;
    perform town.note(me, 'flame_take', 'flame', 1, 0, jsonb_build_object('map', p_map, 'tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, (did - 'flame') || jsonb_strip_nulls(jsonb_build_object('until', did->'flame'->'until')) || jsonb_build_object('lamps', town.lamps_told(me, now_)));
end;
$$;

-- Hand the flame I bear on to somebody: into their empty hands, fresh again.
create or replace function public.town_flame_pass(p_to uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
    return town.answer(me, town.no('none') || jsonb_build_object('lamps', town.lamps_told(me, now_)));
  end if;
  -- (two who hand to each other at the same moment: the two purses are held in the order of their ids; the flame each
  -- bears is theirs alone to change, under their own purse)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.flame_pass(town.lamps_flame(me), p_to::text, theirs, town.lamps_flame(p_to), town.works_carried(p_to) is not null, now_);
  if (did->>'ok')::boolean then
    delete from public.town_lamp_flames f where f.member_id = me;
    -- (a flame of theirs that has gone out is written over)
    insert into public.town_lamp_flames (member_id, map, hands, until_ms, at)
      values (p_to, did->'flame'->>'from',
              array(select x.id::uuid from jsonb_array_elements_text(did->'flame'->'hands') with ordinality x(id, ord) order by x.ord),
              (did->'flame'->>'until')::bigint, to_timestamp(now_ / 1000.0))
      on conflict (member_id) do update set map = excluded.map, hands = excluded.hands, until_ms = excluded.until_ms, at = excluded.at;
    perform town.note(me, 'flame_pass', 'flame', 1, 0, jsonb_build_object('to', p_to, 'map', did->'flame'->'from', 'hands', jsonb_array_length(did->'flame'->'hands')));
  end if;
  return town.answer(me, (did - 'flame') || jsonb_strip_nulls(jsonb_build_object('until', did->'flame'->'until')) || jsonb_build_object('lamps', town.lamps_told(me, now_)));
end;
$$;

-- Light a post with the flame I bear, from the tile I stand on: the post is
-- lit until five in the morning, the flame is spent, and everybody whose hands
-- it went through has the helpers' points for it.
create or replace function public.town_lamp_light(p_map text, p_post integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb := town.purse_of(me, true);
  night_ integer := town.lamp_night(now_);
  hands uuid[];
  did jsonb;
begin
  -- (the night's row for this map is held after my purse's: two who light at the same moment are counted one after
  -- the other, the last lamp of the map is seen to be the last, and of two at one post the second is told it is lit)
  if night_ is not null and town.cat('lamps')->'maps' ? coalesce(p_map, '') then
    insert into public.town_lamp_nights (night, map) values (night_, p_map) on conflict (night, map) do nothing;
    perform 1 from public.town_lamp_nights n where n.night = night_ and n.map = p_map for update;
  end if;
  did := town.lamp_light(mine, town.lamps_flame(me), town.lamps_lit(p_map, night_), p_map, p_post, p_x, p_y, now_);
  if (did->>'ok')::boolean then
    hands := array(select x.id::uuid from jsonb_array_elements_text(did->'hands') with ordinality x(id, ord) order by x.ord);
    perform town.keep_purse(me, did->'purse');
    delete from public.town_lamp_flames f where f.member_id = me;
    insert into public.town_lamps_lit (night, map, post, member_id, hands, lit_at)
      values (night_, p_map, p_post, me, hands, to_timestamp(now_ / 1000.0));
    if (did->>'full')::boolean then
      update public.town_lamp_nights n set full_at = to_timestamp(now_ / 1000.0) where n.night = night_ and n.map = p_map and n.full_at is null;
    end if;
    perform town.note(me, 'lamp_light', 'flame', 1, 0,
      jsonb_build_object('map', p_map, 'post', p_post, 'lit', did->'n', 'hands', jsonb_array_length(did->'hands'), 'tile', jsonb_build_array(p_x, p_y))
        || case when (did->>'full')::boolean then jsonb_build_object('full', true) else '{}'::jsonb end);
    -- (a line of the deeds for each of the others the flame came by, at the moment the post was lit: only those who are still here)
    insert into public.town_deeds (member_id, at, what, thing, n, doc)
      select h.id, to_timestamp(now_ / 1000.0), 'lamp_hand', 'flame', 1, jsonb_build_object('by', me, 'map', p_map, 'post', p_post)
        from unnest(hands) with ordinality h(id, ord) join public.profiles pr on pr.id = h.id
       where h.id <> me
       order by h.ord;
  end if;
  return town.answer(me, (did - 'purse' - 'hands') || jsonb_build_object('lamps', town.lamps_told(me, now_)));
end;
$$;

revoke execute on function public.town_lamps_read() from public, anon;
revoke execute on function public.town_flame_take(text, integer, integer) from public, anon;
revoke execute on function public.town_flame_pass(uuid) from public, anon;
revoke execute on function public.town_lamp_light(text, integer, integer, integer) from public, anon;
grant execute on function public.town_lamps_read() to authenticated;
grant execute on function public.town_flame_take(text, integer, integer) to authenticated;
grant execute on function public.town_flame_pass(uuid) to authenticated;
grant execute on function public.town_lamp_light(text, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select c.relname, c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in ('town_lamp_nights', 'town_lamps_lit', 'town_lamp_flames') order by 1;
--   -- three rows, each t | 0
--
--   select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_lamps_read', 'town_flame_take', 'town_flame_pass', 'town_lamp_light') order by 1;
--   -- four rows, each f | t
--
--   select town.cat('lamps')->>'life' as life, town.cat('lamps')->>'grace' as grace, jsonb_array_length(town.cat('lamps')->'maps'->'farm'->'posts') as farm,
--          jsonb_array_length(town.cat('lamps')->'maps'->'forest'->'posts') as forest, town.deed_th('lamp_light') as light,
--          pg_get_functiondef('town.work_counts_of(jsonb, text)'::regprocedure) like '%''lamp_hand''%' as counted,
--          pg_get_functiondef('town.work_counts_of(jsonb, text)'::regprocedure) like '%''stone_hand''%' as bridge_kept;
--   -- 5 | 1 | 12 | 12 | จุดโคม | t | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- tonight's lamps, map by map: which posts, who lit each, and whose hands its flame came by
--   select l.map, l.post, l.lit_at, p.character_name as lit_by,
--          (select array_agg(h.character_name order by o.ord) from unnest(l.hands) with ordinality o(id, ord) join public.profiles h on h.id = o.id) as hands
--     from public.town_lamps_lit l left join public.profiles p on p.id = l.member_id
--    where l.night = town.lamp_night(town.now_ms()) order by l.map, l.post;
--
--   -- the nights every lamp of a map was lit (the night is the day its evening was of, counted from 1970)
--   select date '1970-01-01' + n.night as evening, n.map, n.full_at from public.town_lamp_nights n where n.full_at is not null order by n.night desc, n.map;
--
--   -- how many posts were lit each night, and by how many hands the flames came (a relay shows as more than one)
--   select date '1970-01-01' + l.night as evening, l.map, count(*) as lit, round(avg(coalesce(array_length(l.hands, 1), 0)), 2) as hands_a_post, max(coalesce(array_length(l.hands, 1), 0)) as longest
--     from public.town_lamps_lit l group by 1, 2 order by 1 desc, 2;
--
--   -- flames taken, handed on and posts lit, by day: how many flames went out unspent is the takings less the lightings
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*) from public.town_deeds d where d.what in ('flame_take', 'flame_pass', 'lamp_light', 'lamp_hand') group by 1, 2 order by 1 desc, 2;
