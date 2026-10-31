-- v317 — a plant that fills its ground, gold, and animals of many sizes
-- Run this once in the Supabase SQL editor, after v316. Running it again is safe.
--
-- The owner, 2026-10-31: "ยิ่ง quality เยอะยิ่งใหญ่ สุงสุดได้ คือ ทั้งแปลงเป้นผักต้นเดียว ใช้คนในการช่วยกันถอนมากขึ้น ได้ราคาสูงขึ้น
-- ให้คุ้มกันพื้นที่ๆกินไป", "ผักที่ Display กลายพันธุ์ กลายเป้นสีทองคำได้", "การเลี้ยงสัตว์จะมี quality ... ตัวใหญ่เล็กไม่เท่ากัน";
-- "จะกดปล่อยให้โตได้ ต้องมีพื้นที่รองรับก่อน"; "ต้นไม่ยักษ์ในเกมตอนนี้จะถือว่าเป็น 2x2 สามารถ พัฒนาต่อได้"; of money, "ปล่อยเฟ้่อได้".
--
-- What changes (lib/town/giant-sizes, giant-pull, quality-plant and animals are the page's twins, in their numbers too):
--   * public.town_grow(p_x, p_y, p_n): the keeper of a bed asks a ripe plant of the five crops to grow to n a side: its
--     ceiling must reach the step's mark, every plot of the square must be tilled and bare, a seed a row it grows by. It
--     takes the square at once and swells for so many times its crop's hours, wanting nothing (town.see says it is not
--     ripe, town.deed_for offers it nothing but the hoe, and a ripe plant meets no pest). The bed is kept for it: `tended`
--     is set ahead to the plant's end, and a trigger on town_beds keeps it there against every other deed's "now".
--   * public.town_giant_pull: as v307, with `dig` (its keeper alone, no sale) and, by the plant's size, the hands it
--     needs before it can start, the most in its crew, how many pulling one half-swing are worth the 3, and its roots' hold.
--     A call at one grown is the town's news, once in ten minutes for a plant, as a giant fish's is (the kind `pull`,
--     with its "ไปช่วย"), for a crew of six is not found by standing there. Only its root's copy holds a call and a go:
--     town.garden_spread no longer writes every plot of the square for each report of a go.
--   * town.pick: one grown is sold whole on the spot, once (town.sale_now, the coins written on its pick's deed), and
--     town.row_for leaves it out of a sickle's row, so that every such sale goes through town_tend. One that began on
--     one plot gives its own fruits; a rank-7 one keeps its six times.
--   * Gold: town.quality_harvest draws it once a round, with the salt no browser sees: past 10 of the floor raised,
--     half a percent a point. Its fruits come a grade up, its sale twice. public.town_plant_gold writes a ripe plant's
--     draw on it for its grower's page to show.
--   * The farming line's seventh rank, the giant seeds (the owner, 2026-11-01: "คนที่เล่นสายนี้คาดหวังแรงค์ 7 ให้เป็นของที่ดีมากๆ"; of
--     keeping its 2x2 too, "เก็บ"): town.reward_garden's giantBegin and giantEnd, given `grow`, play the same game for a ripe plant
--     to be grown at once (town.reward_grow): it asks everything town_grow asks, and the swell takes no time. The day's one use
--     is shared with planting a giant, and is counted only when it takes; a miss costs its 2 stamina and leaves the plant, the
--     seeds and the day. The sale keeps its `wait` on purpose: being paid for a wait not sat through is the gift.
--   * Animals: town.animal_settle counts the days a young one grew with each of the four cares (`rearing`), and on the
--     settle that finds it grown rolls its body's size and its gold, once. Adults of today have theirs from their hearts.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

do $guard$ begin
  if to_regprocedure('public.town_giant_pull(text,integer,integer,jsonb)') is null or to_regprocedure('town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)') is null
     or to_regprocedure('town.see(text,jsonb,bigint)') is null or to_regprocedure('town.deed_for(text,jsonb,text,text,bigint,text)') is null
     or to_regprocedure('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)') is null or to_regprocedure('town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)') is null
     or to_regprocedure('town.twice_wanted(text,jsonb,bigint)') is null or to_regprocedure('public.town_tend(integer,integer,jsonb,boolean)') is null
     or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)') is null
     or to_regprocedure('town.garden_spread()') is null or to_regprocedure('public.town_announcements_v309(bigint,text)') is null
     or to_regprocedure('town.announce(uuid,text,text,integer,text,boolean)') is null
     or to_regprocedure('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)') is null
    then raise exception 'v317: run the farm''s migrations, v291, v307 and v311 first'; end if;
end $guard$;

-- ── 1. The steps: lib/town/giant-sizes' SIZES and lib/town/giant-pull's needsOf ──
create or replace function town.giant_size(p_n integer)
returns jsonb language sql immutable set search_path = '' as $$
  select case p_n
    when 2 then '{"n":2,"from":70,"hands":2,"wait":0.5,"crew":4,"together":2,"grip":24}'::jsonb
    when 3 then '{"n":3,"from":78,"hands":3,"wait":1,"crew":5,"together":2,"grip":28}'::jsonb
    when 4 then '{"n":4,"from":85,"hands":3,"wait":1.5,"crew":5,"together":2,"grip":32}'::jsonb
    when 5 then '{"n":5,"from":90,"hands":4,"wait":2,"crew":6,"together":3,"grip":36}'::jsonb
    when 6 then '{"n":6,"from":95,"hands":5,"wait":2.5,"crew":7,"together":3,"grip":42}'::jsonb
    when 7 then '{"n":7,"from":100,"hands":6,"wait":3,"crew":8,"together":4,"grip":48}'::jsonb
  end
$$;

-- ── 2. Their live text, but for these ──
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.see(text,jsonb,bigint)', '  g := town.growing(p, case when dead then ends else p_now end);',
     '  g := town.growing(p, case when dead then ends else p_now end);
  -- (v317: one swelling over its ground is not ripe until it has done: lib/town/giant-sizes)
  if coalesce((p->''size''->>''until'')::bigint, 0) > p_now then g := g || ''{"stage": 4, "ripe": false}''::jsonb; end if;'],
    ['town.deed_for(text,jsonb,text,text,bigint,text)', '  if kind = ''seed'' then return case when mine and p_plot->>''soil'' = ''tilled'' and p = ''null''::jsonb then ''sow'' end; end if;',
     '  if kind = ''seed'' then return case when mine and p_plot->>''soil'' = ''tilled'' and p = ''null''::jsonb then ''sow'' end; end if;
  -- (v317: one swelling over its ground wants nothing but time)
  if coalesce((p->''size''->>''until'')::bigint, 0) > p_now then return null; end if;'],
    ['town.twice_wanted(text,jsonb,bigint)', '  if p = ''null''::jsonb then return false; end if;',
     '  if p = ''null''::jsonb or coalesce((p->''size''->>''until'')::bigint, 0) > p_now then return false; end if;'],
    ['town.pick(text,jsonb,jsonb,boolean,text,bigint,text)', 'if p->''giant''=''true''::jsonb then n:=n+5*town.yield_of(p_key,p,null)+greatest(0,least(3,coalesce((p->''pull''->>''bonus'')::integer,0)));end if;',
     'if p->''giant''=''true''::jsonb then n:=n+case when p->''size''->''plain''=''true''::jsonb then 0 else 5*town.yield_of(p_key,p,null) end+greatest(0,least(3,coalesce((p->''pull''->>''bonus'')::integer,0)));end if;'],
    ['town.pick(text,jsonb,jsonb,boolean,text,bigint,text)', '  last_ := picked >= (town.cat(''crops'')->(p->>''crop'')->>''picks'')::int + town.more_of(p);',
     '  -- (v317: one grown over its ground is sold whole, once)
  last_ := picked >= (town.cat(''crops'')->(p->>''crop'')->>''picks'')::int + town.more_of(p) or jsonb_typeof(p->''size'') is not distinct from ''object'';'],
    ['town.pick(text,jsonb,jsonb,boolean,text,bigint,text)', '''purse'', town.spend(room_, (f->''costs''->>''pick'')::double precision, p_now)),p_now,top_);',
     '''purse'', town.sold_whole(town.spend(room_, (f->''costs''->>''pick'')::double precision, p_now), p_key, p, p_now)),p_now,top_);'],
    ['town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)', ' vals integer[] := ''{}''; counts integer[] := array[0,0,0,0];',
     ' gold_ boolean; vals integer[] := ''{}''; counts integer[] := array[0,0,0,0];'],
    ['town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)', ' for i in 0..p_n - 1 loop',
     ' -- (v317: turned gold, drawn once a round by the salt: past 10 of the floor raised, half a percent a point)
 gold_ := town.quality_draw(p_salt, town.home_of(p_key, p_plant), (p_plant->>''sown'')::bigint, (p_plant->>''picked'')::bigint, 900)
   < greatest(0, least((qc->>''narrowest'')::integer, floor(nar + 1e-9)::integer) - 10) * 0.005;
 for i in 0..p_n - 1 loop'],
    ['town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)', '  vals := vals || v;',
     '  -- (v317: every fruit of a gold plant a grade up)
  if gold_ then v := case when v < 40 then 40 when v < 70 then 70 when v < 95 then 95 else v end; end if;
  vals := vals || v;'],
    ['town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)', 'return jsonb_build_object(''range'', jsonb_build_object(''lo'', lo, ''hi'', hi), ''values'', to_jsonb(vals), ''groups'', groups);',
     'return jsonb_build_object(''range'', jsonb_build_object(''lo'', lo, ''hi'', hi), ''values'', to_jsonb(vals), ''groups'', groups, ''gold'', gold_);'],
    ['town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)', '  if not hoes and not sows and not reaps then return null; end if;',
     '  if not hoes and not sows and not reaps then return null; end if;
  -- (v317: one grown over its ground is sold whole, picked by itself and never in a row)
  if reaps and jsonb_typeof(p_plots->p_at->''plant''->''size'') is not distinct from ''object'' then return null; end if;'],
    ['town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)', '       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed',
     '       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed
         -- (`is not distinct`: an ordinary plant has no size, and a NULL here would leave it out of every row)
         and not (reaps and jsonb_typeof(p_plots->k.key_->''plant''->''size'') is not distinct from ''object'')'],
    ['public.town_tend(integer,integer,jsonb,boolean)', 'case when did->>''deed'' = ''pick'' then (did->''got''->0->>1)::numeric else 1 end, 0,',
     'case when did->>''deed'' = ''pick'' then (did->''got''->0->>1)::numeric else 1 end,
      -- (v317: what the relatives paid for one sold whole)
      case when did->>''deed'' = ''pick'' and jsonb_typeof(plot->''plant''->''size'') = ''object'' then greatest(0, (after->>''coins'')::numeric - (purse->>''coins'')::numeric) else 0 end,'],
    ['town.garden_spread()', ' if tg_op=''UPDATE'' then before_:=old.plant; end if;',
     ' if tg_op=''UPDATE'' then before_:=old.plant; end if;
 -- (v317: a call, a go and what quality_keep settles with them are read at its root alone: no plot of its square is written for them)
 if tg_op=''UPDATE'' and new.soil is not distinct from old.soil and new.damp is not distinct from old.damp and new.plant is not null and before_ is not null
    and (new.plant - ''pull'' - ''q'' - ''hg'' - ''hs'' - ''called'') = (before_ - ''pull'' - ''q'' - ''hg'' - ''hs'' - ''called'') then return new; end if;'],
    ['town.deed_th(text)', 'when ''giant_help'' then', 'when ''plant_grow'' then ''ปล่อยผักให้โตเต็มพื้นที่'' when ''plant_gold'' then ''ผักกลายพันธุ์เป็นทองคำ'' when ''giant_help'' then'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '  g jsonb; out_ boolean; day_end double precision;',
     '  rear_ jsonb := case when jsonb_typeof(p_a->''rearing'') = ''object'' then p_a->''rearing'' end; fin_ jsonb := ''{}''::jsonb;
  g jsonb; out_ boolean; day_end double precision;'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '      streak := case when coalesce((today->>''hungry'')::boolean, false) then 0 else least(cap_streak, streak + 1) end;',
     '      streak := case when coalesce((today->>''hungry'')::boolean, false) then 0 else least(cap_streak, streak + 1) end;
      -- (v317: a day it grew, and which of the four cares it had: town.animal_rear_day)
      if p_a->''body'' is null then rear_ := town.animal_rear_day(rear_, today, grown, food); end if;'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '  return p_a || jsonb_build_object(''at'', p_now, ''food'', food,',
     '  -- (v317: found grown, its size and its gold rolled, once; still growing, its days kept)
  if p_a->''body'' is null and grown >= adult_ then
    fin_ := town.animal_body(p_a, town.animal_rear_day(rear_, today, grown, food));
  elsif p_a->''body'' is null and rear_ is not null then
    fin_ := jsonb_build_object(''rearing'', rear_);
  end if;
  return (p_a - ''rearing'') || jsonb_build_object(''at'', p_now, ''food'', food,'],
    ['town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)', ' if a in (''giantBegin'',''giantEnd'') then
  cells_:=jsonb_build_array(key_,',
     ' -- (v317: a go at growing a ripe plant at once: town.reward_grow)
 if (a=''giantBegin'' and c?''grow'') or (a=''giantEnd'' and coalesce(r?''grow'',false)) then return town.reward_grow(p,c,request_,t,seed_,me,owner_);end if;
 if a in (''giantBegin'',''giantEnd'') then
  cells_:=jsonb_build_array(key_,'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '''streak'', streak, ''outBands'', bands, ''today'', today);',
     '''streak'', streak, ''outBands'', bands, ''today'', today) || fin_;']
  ] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v317: % has % of [%], not 1: rebuild v317', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

-- ── The town's news of a call: a new kind, with its way there; the pages from before v309 have no words for it ──
alter table public.town_announcements drop constraint if exists town_announcements_kind_check;
alter table public.town_announcements add constraint town_announcements_kind_check
  check (kind in ('forge', 'rank', 'legend', 'forest', 'recipe', 'cross', 'depth', 'bridge', 'lamps', 'admin', 'casino', 'giant', 'shake', 'pull'));
alter table public.town_announcements drop constraint if exists town_announcements_toward_check;
alter table public.town_announcements add constraint town_announcements_toward_check
  check (toward is null or (kind in ('giant', 'shake', 'pull') and jsonb_typeof(toward) = 'object'));
create or replace function public.town_announcements_v299(p_after bigint default null, p_look text default null) returns jsonb
language sql security definer set search_path = '' as $$
  select p.page || jsonb_build_object('events', coalesce((select jsonb_agg(e.value order by e.ord)
    from jsonb_array_elements(p.page -> 'events') with ordinality e(value, ord) where e.value ->> 'kind' not in ('giant', 'shake', 'pull')), '[]'::jsonb))
  from (select public.town_announcements_v309(p_after, p_look) as page) p
$$;
revoke all on function public.town_announcements_v299(bigint, text) from public, anon, authenticated;
grant execute on function public.town_announcements_v299(bigint, text) to authenticated;

-- ── 3. What it comes to: lib/town/giant-sizes' saleNow, and the purse it goes into ──
create or replace function town.sale_now(p_key text, p_plant jsonb, p_now bigint, p_salt text)
returns integer language plpgsql stable set search_path = '' as $$
declare
  size_ jsonb := town.giant_size((p_plant->'size'->>'n')::integer);
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  h jsonb; lo integer; hi integer; v integer; sale double precision;
begin
  if size_ is null or p_plant->'pull'->'alone' = 'true'::jsonb then return 0; end if;
  h := town.quality_harvest(p_key, p_plant, 0, p_now, p_salt, 0, false);
  lo := (h->'range'->>'lo')::integer; hi := (h->'range'->>'hi')::integer;
  v := lo + least(hi - lo, floor(town.quality_draw(p_salt, town.home_of(p_key, p_plant), (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint, 901) * (hi - lo + 1))::integer);
  sale := floor(((size_->>'n')::integer * (size_->>'n')::integer)::double precision * (((c->'yield'->>0)::double precision + (c->'yield'->>1)::double precision) / 2)
    * (town.cat('items')->(p_plant->>'crop')->>'pays')::double precision * (size_->>'wait')::double precision
    * case when v >= 95 then 2.5 when v >= 70 then 1.75 when v >= 40 then 1.25 else 1 end);
  return (case when (h->>'gold')::boolean then sale * 2 else sale end)::integer;
end $$;
create or replace function town.sold_whole(p_purse jsonb, p_key text, p_plant jsonb, p_now bigint)
returns jsonb language plpgsql stable set search_path = '' as $$
declare sale integer;
begin
  if jsonb_typeof(p_plant->'size') is distinct from 'object' then return p_purse; end if;
  sale := town.sale_now(p_key, p_plant, p_now, (select s.salt from town.quality_salt s where s.one));
  return case when sale > 0 then p_purse || jsonb_build_object('coins', (p_purse->>'coins')::bigint + sale) else p_purse end;
end $$;

-- ── 4. The bed kept for what swells in it: `tended` set ahead stays, against every other deed's "now", while it does ──
create or replace function town.bed_kept_ahead()
returns trigger language plpgsql set search_path = '' as $$
declare now_ bigint := town.now_ms();
begin
  if old.tended > now_ and exists (select 1 from public.town_plots q where q.bed = new.bed and coalesce((q.plant->'size'->>'until')::bigint, 0) > now_) then
    new.tended := old.tended;
  end if;
  return new;
end $$;
drop trigger if exists town_beds_kept_ahead on public.town_beds;
create trigger town_beds_kept_ahead before update of tended on public.town_beds
  for each row when (new.tended < old.tended) execute function town.bed_kept_ahead();

-- ── 5. The square: lib/town/giant-sizes' growFrame ──
-- (the best square of `n` that holds what the plant stands on, in its bed: fewest plots not ready, then nearest its middle)
create or replace function town.grow_frame(p_key text, p_n integer, p_plots jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  rx integer := split_part(p_key, ',', 1)::integer; ry integer := split_part(p_key, ',', 2)::integer;
  bed_ integer := town.bed_of(rx, ry); cx integer; cy integer; side_ integer := (town.cat('farming')->>'side')::integer;
  own_ jsonb := case when jsonb_array_length(coalesce(nullif(p_plots->p_key->'plant'->'footprint', 'null'::jsonb), '[]'::jsonb)) > 0 then p_plots->p_key->'plant'->'footprint' else jsonb_build_array(p_key) end;
  x1 integer; x2 integer; y1 integer; y2 integer; x0 integer; y0 integer; x integer; y integer;
  cells jsonb; blocked integer; k text; plot_ jsonb; off_ double precision; score double precision; best jsonb; best_score double precision := 'Infinity';
begin
  if bed_ is null or bed_ < 0 then return null; end if;
  select (b.at->>0)::integer, (b.at->>1)::integer into cx, cy from jsonb_array_elements(town.cat('farming')->'bedsAt') with ordinality b(at, ord) where b.ord - 1 = bed_;
  select min(split_part(o.k, ',', 1)::integer), max(split_part(o.k, ',', 1)::integer), min(split_part(o.k, ',', 2)::integer), max(split_part(o.k, ',', 2)::integer)
    into x1, x2, y1, y2 from jsonb_array_elements_text(own_) o(k);
  y0 := cy;
  while y0 + p_n <= cy + side_ loop
    x0 := cx;
    while x0 + p_n <= cx + side_ loop
      if not (x1 < x0 or y1 < y0 or x2 >= x0 + p_n or y2 >= y0 + p_n) then
        cells := '[]'::jsonb; blocked := 0;
        for y in y0..y0 + p_n - 1 loop for x in x0..x0 + p_n - 1 loop
          k := x::text || ',' || y::text; cells := cells || to_jsonb(k);
          continue when own_ ? k;
          plot_ := p_plots->k;
          if coalesce(plot_->'plant', 'null'::jsonb) <> 'null'::jsonb or plot_->>'soil' is distinct from 'tilled' then blocked := blocked + 1; end if;
        end loop; end loop;
        off_ := abs(x0 + (p_n - 1) / 2.0 - (x1 + x2) / 2.0) + abs(y0 + (p_n - 1) / 2.0 - (y1 + y2) / 2.0);
        score := blocked * 100 + off_;
        if score < best_score then best_score := score; best := jsonb_build_object('cells', cells, 'blocked', blocked); end if;
      end if;
      x0 := x0 + 1;
    end loop;
    y0 := y0 + 1;
  end loop;
  return best;
end $$;

-- ── 6. Asking it to grow ──
-- (what is refused and what it would come to, for a keeper's plain asking and the seventh rank's alike: lib/town/giant-sizes'
-- growPlant. It writes nothing. Whoever calls it holds the purse and the bed.)
create or replace function town.grow_make(p_x integer, p_y integer, p_n integer, me uuid, now_ bigint, purse_ jsonb, at_once boolean)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  key_ text := p_x::text || ',' || p_y::text;
  size_ jsonb := town.giant_size(p_n);
  bed_n integer := town.bed_of(p_x, p_y);
  plots_ jsonb; plot_ jsonb; p_ jsonb; seen_ jsonb; keeping_ jsonb; pull_ jsonb; frame_ jsonb; plant_ jsonb; crop_ jsonb;
  side_ integer; seeds_ integer; go_ bigint; until_ bigint; seed_ text;
begin
  if size_ is null or bed_n is null or bed_n < 0 then return town.no('none'); end if;
  select coalesce(jsonb_object_agg(q.x::text || ',' || q.y::text, jsonb_build_object('soil', q.soil, 'plant', coalesce(q.plant, 'null'::jsonb))), '{}'::jsonb) into plots_
    from public.town_plots q where q.bed = bed_n;
  plot_ := plots_->key_;
  p_ := coalesce(plot_->'plant', 'null'::jsonb);
  if plot_ is null or jsonb_typeof(p_) is distinct from 'object' or coalesce(p_->>'root', key_) <> key_
     or not (p_->>'crop' = any (array['pumpkin', 'carrot', 'daikon', 'cabbage', 'taro'])) then
    return town.no('none');
  end if;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping_ from public.town_beds b where b.bed = bed_n;
  if keeping_ is null or town.owner_of(keeping_, true, now_) is distinct from me::text then return town.no('theirs'); end if;
  seen_ := town.see(key_, plot_, now_);
  if (seen_->>'dead')::boolean then return town.no('none'); end if;
  if not (seen_->>'ripe')::boolean then return town.no('unripe'); end if;
  if (seen_->>'pest')::boolean then return town.no('pest'); end if;
  -- (a call or a go under way, or pulled out already, as lib/town/giant-pull's calling and pulling read them)
  pull_ := case when jsonb_typeof(p_->'pull') = 'object' then p_->'pull' end;
  go_ := coalesce((pull_->>'go')::bigint, 0);
  if pull_ is not null and (coalesce((pull_->>'out')::bigint, 0) > 0
     or (go_ = 0 and coalesce((pull_->>'at')::bigint, 0) + 180000 > now_)
     or (go_ > 0 and now_ <= go_ + 3000 + 44 * 1300 + 650 + 220 + 5000)) then
    return town.no('busy');
  end if;
  side_ := coalesce((p_->'size'->>'n')::integer, case when p_->'giant' = 'true'::jsonb then 2 else 1 end);
  if p_n <= side_ then return town.no('none'); end if;
  if (town.quality_harvest(key_, p_, 0, now_, (select s.salt from town.quality_salt s where s.one), 0, false)->'range'->>'hi')::integer < (size_->>'from')::integer then
    return town.no('quality');
  end if;
  frame_ := town.grow_frame(key_, p_n, plots_);
  if frame_ is null or (frame_->>'blocked')::integer > 0 then return town.no('room'); end if;
  crop_ := town.cat('crops')->(p_->>'crop');
  seed_ := crop_->>'seed';
  seeds_ := p_n - side_;
  if town.held_in(purse_, seed_) < seeds_ then return town.no('seeds'); end if;
  until_ := case when at_once then now_ else now_ + ((crop_->>'hours')::double precision * (size_->>'wait')::double precision * 3600000)::bigint end;
  plant_ := (p_ - 'pull') || jsonb_build_object('giant', true, 'root', key_, 'footprint', frame_->'cells',
    'size', jsonb_build_object('n', p_n, 'at', now_, 'until', until_,
      'plain', case when jsonb_typeof(p_->'size') = 'object' then p_->'size'->'plain' else to_jsonb(p_->'giant' is distinct from 'true'::jsonb) end));
  return jsonb_build_object('ok', true, 'purse', town.use_up(town.spend(purse_, (town.cat('farming')->'costs'->>'sow')::double precision * seeds_, now_), seed_, seeds_),
    'plant', plant_, 'until', until_, 'seeds', seeds_, 'crop', p_->'crop',
    -- (lib/town/reward-garden's growRoot: the very plant and round a go was begun for)
    'root', key_ || ':' || (p_->>'by') || ':' || (p_->>'crop') || ':' || (p_->>'sown') || ':' || (p_->>'picked'));
end $$;
revoke all on function town.grow_make(integer, integer, integer, uuid, bigint, jsonb, boolean) from public, anon, authenticated;

-- (what it comes to, written: the rest of its square by the farm's own trigger, town.garden_spread; what the page is told comes back)
create or replace function town.grow_keep(p_x integer, p_y integer, me uuid, now_ bigint, made_ jsonb, at_once boolean)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare bed_n integer := town.bed_of(p_x, p_y); told_ jsonb;
begin
  update public.town_plots q set plant = made_->'plant', changed = now_ where q.x = p_x and q.y = p_y;
  update public.town_beds b set tended = greatest(b.tended, (made_->>'until')::bigint), empty = 0 where b.bed = bed_n;
  perform town.note(me, 'plant_grow', made_->>'crop', (made_->'plant'->'size'->>'n')::integer, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'seeds', made_->'seeds', 'until', made_->'until')
    || case when at_once then '{"atOnce": true}'::jsonb else '{}'::jsonb end);
  select jsonb_object_agg(q.x::text || ',' || q.y::text, jsonb_build_object('soil', q.soil, 'plant', q.plant)) into told_
    from public.town_plots q where q.bed = bed_n and made_->'plant'->'footprint' ? (q.x::text || ',' || q.y::text);
  return told_;
end $$;
revoke all on function town.grow_keep(integer, integer, uuid, bigint, jsonb, boolean) from public, anon, authenticated;

create or replace function public.town_grow(p_x integer, p_y integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  bed_n integer;
  purse_ jsonb; made_ jsonb; told_ jsonb;
begin
  if p_x is null or p_y is null or town.giant_size(p_n) is null then return town.answer(me, town.no('none')); end if;
  bed_n := town.bed_of(p_x, p_y);
  if bed_n is null or bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- (my purse held first, then the bed, as a tend holds them)
  purse_ := town.purse_of(me, true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  made_ := town.grow_make(p_x, p_y, p_n, me, now_, purse_, false);
  if made_->'ok' is distinct from 'true'::jsonb then return town.answer(me, made_); end if;
  perform town.keep_purse(me, made_->'purse');
  told_ := town.grow_keep(p_x, p_y, me, now_, made_, false);
  return town.answer(me, jsonb_build_object('ok', true, 'plots', told_, 'bed', town.bed_told(bed_n)));
end $$;
revoke all on function public.town_grow(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.town_grow(integer, integer, integer) to authenticated;

-- (the seventh rank's go at it: lib/town/reward-garden's gardenAction, by way of town.reward_garden, purse and bed held)
create or replace function town.reward_grow(p jsonb, c jsonb, request_ uuid, t bigint, seed_ bigint, me uuid, owner_ text)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  a text := c->>'action';
  x_ integer := (c->'at'->>0)::integer; y_ integer := (c->'at'->>1)::integer; key_ text := x_::text || ',' || y_::text;
  state_ jsonb := coalesce(p->'professionRewards', '{}'::jsonb); r jsonb := state_->'giant';
  n_ integer; p_ jsonb; made_ jsonb; used_ jsonb; after_ jsonb; told_ jsonb; z bigint; i integer; mark_ numeric; pass_ boolean := true;
begin
  if a = 'giantBegin' then
    n_ := case when jsonb_typeof(c->'grow') = 'number' and c->>'grow' ~ '^[0-9]{1,2}$' then (c->>'grow')::integer end;
    if not town.gift_works(p, 'thingGiantSeeds') or n_ is null or coalesce((r->>'until')::bigint, 0) > t or seed_ not between 0 and 4294967295 then return town.no('none'); end if;
    if town.used_of(p, 'thingGiantSeeds', t) >= coalesce((town.cat('gifts')->'uses'->'thingGiantSeeds'->>'n')::integer, 0) then return town.no('spent'); end if;
    made_ := town.grow_make(x_, y_, n_, me, t, p, true);
    if made_->'ok' is distinct from 'true'::jsonb then return made_; end if;
    r := jsonb_build_object('id', request_, 'key', key_, 'crop', made_->'crop', 'seed', seed_, 'began', t, 'until', t + 120000, 'grow', n_, 'root', made_->'root');
    return jsonb_build_object('ok', true, 'purse', p || jsonb_build_object('professionRewards', state_ || jsonb_build_object('giant', r)), 'giant', r);
  end if;
  n_ := (r->>'grow')::integer;
  if r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or (r->>'until')::bigint < t or t < (r->>'began')::bigint + 2400
     or not town.gift_works(p, 'thingGiantSeeds') or owner_ is distinct from me::text then return town.no('far'); end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks') <> 3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v) <> 'number' or (v::text)::numeric not between 0 and 1) then return town.no('none'); end if;
  -- (the same plant and round it was begun for: one dug out and sown again is not it)
  select q.plant into p_ from public.town_plots q where q.x = x_ and q.y = y_;
  if jsonb_typeof(p_) is distinct from 'object' or key_ || ':' || (p_->>'by') || ':' || (p_->>'crop') || ':' || (p_->>'sown') || ':' || (p_->>'picked') is distinct from r->>'root' then return town.no('none'); end if;
  made_ := town.grow_make(x_, y_, n_, me, t, p, true);
  if made_->'ok' is distinct from 'true'::jsonb then return made_; end if;
  z := (r->>'seed')::bigint;
  for i in 0..2 loop z := (z * 1664525 + 1013904223) % 4294967296; mark_ := .2 + (z % 61)::numeric / 100; if abs(mark_ - (c->'marks'->>i)::numeric) > .09 then pass_ := false; end if; end loop;
  after_ := town.spend(p, 2::double precision, t) || jsonb_build_object('professionRewards', state_ || jsonb_build_object('giant', null));
  if not pass_ then return jsonb_build_object('ok', true, 'purse', after_, 'giant', null, 'gardenPassed', false); end if;
  used_ := town.gift_use(after_, 'thingGiantSeeds', t);
  if used_->'ok' is distinct from 'true'::jsonb then return town.no('spent'); end if;
  made_ := town.grow_make(x_, y_, n_, me, t, used_->'purse', true);
  if made_->'ok' is distinct from 'true'::jsonb then return made_; end if;
  told_ := town.grow_keep(x_, y_, me, t, made_, true);
  return jsonb_build_object('ok', true, 'purse', made_->'purse', 'plots', told_, 'giant', null, 'gardenPassed', true);
end $$;
revoke all on function town.reward_grow(jsonb, jsonb, uuid, bigint, bigint, uuid, text) from public, anon, authenticated;

-- ── 7. A ripe plant's gold told on it: by its grower, once a round ──
create or replace function public.town_plant_gold(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  key_ text := p_x::text || ',' || p_y::text;
  bed_n integer; plot_ jsonb; p_ jsonb; seen_ jsonb; gold_ boolean; told_ jsonb;
begin
  if p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  bed_n := town.bed_of(p_x, p_y);
  if bed_n is null or bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', q.soil, 'plant', coalesce(q.plant, 'null'::jsonb)) into plot_ from public.town_plots q where q.x = p_x and q.y = p_y;
  p_ := coalesce(plot_->'plant', 'null'::jsonb);
  if plot_ is null or jsonb_typeof(p_) is distinct from 'object' or p_->>'by' is distinct from me::text or coalesce(p_->>'root', key_) <> key_ then
    return town.answer(me, town.no('none'));
  end if;
  -- (told already, this round: nothing to write)
  if p_->'sealed' = p_->'picked' then return town.answer(me, jsonb_build_object('ok', true)); end if;
  seen_ := town.see(key_, plot_, now_);
  if (seen_->>'dead')::boolean or not ((seen_->>'ripe')::boolean or coalesce((p_->'size'->>'until')::bigint, 0) > now_) then
    return town.answer(me, town.no('none'));
  end if;
  gold_ := (town.quality_harvest(key_, p_, 0, now_, (select s.salt from town.quality_salt s where s.one), 0, false)->>'gold')::boolean;
  p_ := p_ || jsonb_build_object('sealed', p_->'picked') || case when gold_ then jsonb_build_object('gold', p_->'picked') else '{}'::jsonb end;
  update public.town_plots q set plant = p_, changed = now_ where q.x = p_x and q.y = p_y;
  if gold_ then perform town.note(me, 'plant_gold', p_->>'crop', 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y))); end if;
  select jsonb_object_agg(q.x::text || ',' || q.y::text, jsonb_build_object('soil', q.soil, 'plant', q.plant)) into told_
    from public.town_plots q where q.bed = bed_n and (q.x = p_x and q.y = p_y or (jsonb_typeof(p_->'footprint') = 'array' and p_->'footprint' ? (q.x::text || ',' || q.y::text)));
  return town.answer(me, jsonb_build_object('ok', true, 'plots', told_));
end $$;
revoke all on function public.town_plant_gold(integer, integer) from public, anon, authenticated;
grant execute on function public.town_plant_gold(integer, integer) to authenticated;

-- ── 8. The game at a giant's root: v307's, its numbers by the plant's size, and `dig` ──
-- (the numbers of a plant that has no size are lib/town/giant-pull's PULL: crew 4, grip 24, two together worth 3; call 180 s,
-- count-in 3 s, half-swing 1.3 s, 45 half-swings, window 0.22 s, a helper's 3 good pulls, 5 s of grace, 1.5 s ahead)
create or replace function public.town_giant_pull(p_action text, p_x integer, p_y integer, p_hits jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  key_ text := p_x::text || ',' || p_y::text;
  bed_n integer;
  purse_ jsonb;
  plot_ jsonb;
  keeping_ jsonb;
  seen_ jsonb;
  p_ jsonb;
  pull_ jsonb;
  crew_ jsonb;
  hits_ jsonb;
  mine_ jsonb;
  helped_ jsonb;
  needs_ jsonb;
  event_ text;
  owner_ text;
  go_ bigint;
  ends_ bigint;
  done_ integer;
  calling_ boolean;
  pulling_ boolean;
  ripe_ boolean;
  may_ boolean;
  e jsonb;
begin
  if p_action is null or p_action not in ('open', 'join', 'leave', 'go', 'hits', 'look', 'dig') or p_x is null or p_y is null then
    return town.answer(me, town.no('none'));
  end if;
  bed_n := town.bed_of(p_x, p_y);
  if bed_n is null or bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- (my purse held first, then the bed, as a tend holds them)
  purse_ := town.purse_of(me, true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', q.soil, 'plant', coalesce(q.plant, 'null'::jsonb)) || case when q.damp then '{"damp": true}'::jsonb else '{}'::jsonb end
    into plot_ from public.town_plots q where q.x = p_x and q.y = p_y for update;
  p_ := coalesce(plot_->'plant', 'null'::jsonb);
  if plot_ is null or jsonb_typeof(p_) is distinct from 'object' or p_->'giant' is distinct from 'true'::jsonb or coalesce(p_->>'root', key_) <> key_ then
    return town.answer(me, town.no('none'));
  end if;
  if p_action = 'look' then return town.answer(me, jsonb_build_object('ok', true, 'plots', jsonb_build_object(key_, plot_))); end if;
  needs_ := coalesce(town.giant_size((p_->'size'->>'n')::integer), '{"hands":1,"crew":4,"together":2,"grip":24}'::jsonb);
  pull_ := case when jsonb_typeof(p_->'pull') = 'object' then p_->'pull' end;
  if coalesce((pull_->>'out')::bigint, 0) > 0 then return town.answer(me, town.no('done') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
  go_ := coalesce((pull_->>'go')::bigint, 0);
  ends_ := go_ + 3000 + 44 * 1300 + 650 + 220;
  calling_ := pull_ is not null and go_ = 0 and coalesce((pull_->>'at')::bigint, 0) + 180000 > now_;
  pulling_ := pull_ is not null and go_ > 0 and now_ <= ends_ + 5000;
  crew_ := case when jsonb_typeof(pull_->'crew') = 'array' then pull_->'crew' else '[]'::jsonb end;
  seen_ := town.see(key_, plot_, now_);
  ripe_ := coalesce((seen_->>'ripe')::boolean, false) and not coalesce((seen_->>'dead')::boolean, false);
  if p_action in ('open', 'go', 'dig') then
    select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping_ from public.town_beds b where b.bed = bed_n;
    owner_ := town.owner_of(keeping_, true, now_);
    may_ := owner_ is null or owner_ = me::text;
  end if;

  if p_action = 'open' then
    if not may_ then return town.answer(me, town.no('theirs')); end if;
    if not ripe_ then return town.answer(me, town.no('none')); end if;
    if calling_ or pulling_ then return town.answer(me, town.no('busy') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
    -- (called again after a go that did not take: the crew is kept, they are still standing there)
    pull_ := jsonb_build_object('by', me::text, 'at', now_,
      'crew', case when pull_ is not null and go_ > 0 and pull_->>'by' = me::text and now_ <= ends_ + 180000 then crew_ else jsonb_build_array(me::text) end,
      'go', 0, 'hits', '{}'::jsonb, 'paid', '[]'::jsonb, 'out', 0, 'bonus', 0, 'helped', '[]'::jsonb);
    -- (one grown: the town's news, once in ten minutes for a plant, in its own words and with its way there)
    if jsonb_typeof(p_->'size') = 'object' and now_ - coalesce((p_->>'called')::bigint, 0) >= 600000 then
      event_ := 'pull:' || key_ || ':' || now_;
      perform town.announce(me, 'pull', (case p_->>'crop' when 'pumpkin' then 'ฟักทอง' when 'carrot' then 'แครอท' when 'daikon' then 'หัวไชเท้า' when 'cabbage' then 'ผักกาดขาว' when 'taro' then 'เผือก' else p_->>'crop' end)
        || 'ยักษ์ ' || (p_->'size'->>'n') || '×' || (p_->'size'->>'n'), 0, event_, false);
      update public.town_announcements a set toward = jsonb_build_object('hook', key_, 'x', p_x, 'y', p_y) where a.event_key = event_;
      p_ := p_ || jsonb_build_object('called', now_);
    end if;
  elsif p_action = 'dig' then
    -- (only one grown over its ground, whose crew cannot be found: its fruits as any plant's, no sale; a rank-7 giant is pulled alone as ever)
    if not may_ then return town.answer(me, town.no('theirs')); end if;
    if jsonb_typeof(p_->'size') is distinct from 'object' or not ripe_ then return town.answer(me, town.no('none')); end if;
    if calling_ or pulling_ then return town.answer(me, town.no('busy') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
    pull_ := jsonb_build_object('by', me::text, 'at', now_, 'crew', jsonb_build_array(me::text),
      'go', 0, 'hits', '{}'::jsonb, 'paid', '[]'::jsonb, 'out', now_, 'bonus', 0, 'helped', '[]'::jsonb, 'alone', true);
  elsif p_action = 'join' then
    if not calling_ then return town.answer(me, town.no('shut')); end if;
    if crew_ ? me::text then return town.answer(me, town.no('in')); end if;
    if jsonb_array_length(crew_) >= (needs_->>'crew')::integer then return town.answer(me, town.no('full')); end if;
    pull_ := pull_ || jsonb_build_object('crew', crew_ || to_jsonb(me::text));
  elsif p_action = 'leave' then
    if not calling_ or not crew_ ? me::text then return town.answer(me, town.no('shut')); end if;
    pull_ := case when pull_->>'by' = me::text then null else pull_ || jsonb_build_object('crew', crew_ - me::text) end;
  elsif p_action = 'go' then
    if not calling_ then return town.answer(me, town.no('shut')); end if;
    if pull_->>'by' is distinct from me::text or not may_ then return town.answer(me, town.no('theirs')); end if;
    if not ripe_ then return town.answer(me, town.no('none')); end if;
    if jsonb_array_length(crew_) < (needs_->>'hands')::integer then return town.answer(me, town.no('hands') || jsonb_build_object('plots', jsonb_build_object(key_, plot_))); end if;
    pull_ := pull_ || jsonb_build_object('go', now_);
  else
    -- hits: the half-swings I pulled well so far
    if pull_ is null or go_ = 0 then return town.answer(me, town.no('shut')); end if;
    if not crew_ ? me::text then return town.answer(me, town.no('crew')); end if;
    if now_ > ends_ + 5000 then return town.answer(me, town.no('late')); end if;
    if jsonb_typeof(p_hits) is distinct from 'array' or jsonb_array_length(p_hits) > 45 then return town.answer(me, town.no('none')); end if;
    for e in select x from jsonb_array_elements(p_hits) as t(x) loop
      if jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric <> floor((e #>> '{}')::numeric)
         or (e #>> '{}')::numeric < 0 or (e #>> '{}')::numeric > 44
         or go_ + 3000 + (e #>> '{}')::bigint * 1300 + 650 - 220 > now_ + 1500 then
        return town.answer(me, town.no('none'));
      end if;
    end loop;
    select coalesce(jsonb_agg(s.k order by s.k), '[]'::jsonb) into mine_
      from (select distinct (x #>> '{}')::integer as k
              from jsonb_array_elements(coalesce(pull_->'hits'->(me::text), '[]'::jsonb) || p_hits) as t(x)) s;
    hits_ := coalesce(pull_->'hits', '{}'::jsonb) || jsonb_build_object(me::text, mine_);
    if not coalesce(pull_->'paid', '[]'::jsonb) ? me::text then
      perform town.keep_purse(me, town.spend(purse_, 1::double precision, now_));
      pull_ := pull_ || jsonb_build_object('paid', coalesce(pull_->'paid', '[]'::jsonb) || to_jsonb(me::text));
    end if;
    select coalesce(sum(case when s.n >= (needs_->>'together')::integer then 3 else 1 end), 0)::integer into done_
      from (select (v #>> '{}')::integer as k, count(*) as n from jsonb_each(hits_) m, jsonb_array_elements(m.value) v group by 1) s;
    pull_ := pull_ || jsonb_build_object('hits', hits_);
    if done_ >= (needs_->>'grip')::integer then
      select coalesce(jsonb_agg(to_jsonb(c.id) order by c.o), '[]'::jsonb) into helped_
        from jsonb_array_elements_text(crew_) with ordinality c(id, o)
       where c.id <> pull_->>'by' and jsonb_array_length(coalesce(hits_->c.id, '[]'::jsonb)) >= 3;
      pull_ := pull_ || jsonb_build_object('out', now_, 'bonus', jsonb_array_length(helped_), 'helped', helped_);
      -- (a line of the deeds for each helper who pulled it well, in their name: only members who are still members)
      insert into public.town_deeds (member_id, at, what, thing, n, doc)
        select h.id::uuid, to_timestamp(now_ / 1000.0), 'giant_help', p_->>'crop', 1,
               jsonb_build_object('by', pull_->>'by', 'tile', jsonb_build_array(p_x, p_y))
          from jsonb_array_elements_text(helped_) with ordinality h(id, o) join public.profiles pr on pr.id = h.id::uuid
         order by h.o;
    end if;
  end if;

  plot_ := plot_ || jsonb_build_object('plant', case when pull_ is null then p_ - 'pull' else p_ || jsonb_build_object('pull', pull_) end);
  update public.town_plots q set plant = plot_->'plant', changed = now_ where q.x = p_x and q.y = p_y;
  return town.answer(me, jsonb_build_object('ok', true, 'plots', jsonb_build_object(key_, plot_)));
end $$;
revoke all on function public.town_giant_pull(text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.town_giant_pull(text, integer, integer, jsonb) to authenticated;

-- ── 9. Animals: lib/town/animals' rearDay and bodyOf ──
-- (a day counted when it grew at least 4 fed hours since the last one counted; fed: it ended the day with food in its trough)
create or replace function town.animal_rear_day(p_r jsonb, p_today jsonb, p_grown double precision, p_food double precision)
returns jsonb language sql immutable set search_path = '' as $$
  select case when p_grown - coalesce((p_r->>'was')::double precision, 0) >= 4 then jsonb_build_object(
      'was', p_grown, 'days', coalesce((p_r->>'days')::integer, 0) + 1,
      'pet', coalesce((p_r->>'pet')::integer, 0) + case when p_today->'pet' = 'true'::jsonb then 1 else 0 end,
      'treat', coalesce((p_r->>'treat')::integer, 0) + case when p_today->'treat' = 'true'::jsonb then 1 else 0 end,
      'out', coalesce((p_r->>'out')::integer, 0) + case when p_today->'out' = 'true'::jsonb then 1 else 0 end,
      'fed', coalesce((p_r->>'fed')::integer, 0) + case when p_food > 1e-9 then 1 else 0 end)
    else p_r end
$$;
-- (the body's step by the value's grade, a little more within it; gold by its top-grade feed)
create or replace function town.animal_body_of(p_species text, p_v integer)
returns double precision language sql immutable set search_path = '' as $$
  select floor(((s.steps->>g.g)::double precision * (1 + 0.06 * (p_v - g.lo)::double precision / (g.hi - g.lo))) * 100 + 0.5) / 100
    from (select case p_species when 'cow' then '[1,1.4,1.9,2.5]'::jsonb when 'sheep' then '[1,1.5,2.1,2.8]'::jsonb else '[1,1.6,2.2,3]'::jsonb end as steps) s,
         (select case when p_v >= 95 then 3 when p_v >= 70 then 2 when p_v >= 40 then 1 else 0 end as g,
                 case when p_v >= 95 then 95 when p_v >= 70 then 70 when p_v >= 40 then 40 else 0 end as lo,
                 case when p_v >= 95 then 100 when p_v >= 70 then 94 when p_v >= 40 then 69 else 39 end as hi) g
$$;
create or replace function town.animal_body(p_a jsonb, p_r jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  days_ double precision := coalesce((p_r->>'days')::double precision, 0);
  narrow_ integer := coalesce((p_a->>'narrow')::integer, 0);
  salt_ text := (select s.salt from town.quality_salt s where s.one);
  key_ text := 'animal|' || (p_a->>'id');
  born_ bigint := floor((p_a->>'born')::double precision)::bigint;
  hi integer := 0; lo integer; v integer; w text;
begin
  if days_ > 0 then
    foreach w in array array['pet', 'treat', 'out', 'fed'] loop
      hi := hi + least(25, floor(25 * coalesce((p_r->>w)::double precision, 0) / days_ + 1e-9)::integer);
    end loop;
  end if;
  lo := greatest(0, hi - 30 + least(20, narrow_));
  v := lo + least(greatest(0, hi - lo), floor(town.quality_draw(salt_, key_, born_, 0, 0) * (greatest(0, hi - lo) + 1))::integer);
  return jsonb_build_object('body', town.animal_body_of(p_a->>'species', v),
    'gold', town.quality_draw(salt_, key_, born_, 0, 1) < greatest(0, narrow_ - 10) * 0.01);
end $$;
revoke all on function town.giant_size(integer), town.sale_now(text, jsonb, bigint, text), town.sold_whole(jsonb, text, jsonb, bigint), town.bed_kept_ahead(), town.grow_frame(text, integer, jsonb),
  town.animal_rear_day(jsonb, jsonb, double precision, double precision), town.animal_body_of(text, integer), town.animal_body(jsonb, jsonb) from public, anon, authenticated;

-- ── 10. The grown animals of today: their size and gold from their hearts, once ──
-- (the ceiling their hearts give, as what they make has it: 30 and 7 a heart, the floor 30 under, raised by their feed;
-- never under the first step; those with their size already are passed by, so a second run changes nothing)
do $$
declare k jsonb := town.cat('animals'); row_ record; hi integer; lo integer; v integer; narrow_ integer; salt_ text := (select s.salt from town.quality_salt s where s.one); key_ text; born_ bigint;
begin
  if k is null then return; end if;
  for row_ in select x.id, x.a from public.town_animals x where x.a->'body' is null
      and (x.a->>'grown')::double precision >= (k->'species'->(x.a->>'species')->'grow'->>0)::double precision + (k->'species'->(x.a->>'species')->'grow'->>1)::double precision loop
    hi := least(100, 30 + 7 * least(10, floor(coalesce((row_.a->>'hearts')::double precision, 0) / 20)::integer));
    narrow_ := coalesce((row_.a->>'narrow')::integer, 0);
    lo := greatest(0, hi - 30 + least(20, narrow_));
    key_ := 'animal|' || (row_.a->>'id'); born_ := floor((row_.a->>'born')::double precision)::bigint;
    v := lo + least(hi - lo, floor(town.quality_draw(salt_, key_, born_, 0, 0) * (hi - lo + 1))::integer);
    update public.town_animals x set a = x.a || jsonb_build_object('body', town.animal_body_of(row_.a->>'species', v),
        'gold', town.quality_draw(salt_, key_, born_, 0, 1) < greatest(0, narrow_ - 10) * 0.01), changed = town.now_ms()
      where x.id = row_.id;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select position('size' in pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure)) > 0 as swelling,
--          position('sold_whole' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as sold,
--          position('''alone''' in pg_get_functiondef('public.town_giant_pull(text,integer,integer,jsonb)'::regprocedure)) > 0 as dug,
--          position('animal_body' in pg_get_functiondef('town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)'::regprocedure)) > 0 as bodies,
--          position('reward_grow' in pg_get_functiondef('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure)) > 0 as at_once,
--          has_function_privilege('anon', 'public.town_grow(integer,integer,integer)', 'EXECUTE') as anon_grow,
--          has_function_privilege('anon', 'public.town_plant_gold(integer,integer)', 'EXECUTE') as anon_gold;
--   → true, true, true, true, true, false, false
--   select town.deed_th('plant_grow'), town.deed_th('plant_gold');   → ปล่อยผักให้โตเต็มพื้นที่, ผักกลายพันธุ์เป็นทองคำ
--   select count(*) as adults_with_no_size from public.town_animals x, (select town.cat('animals') k) c
--    where x.a->'body' is null and (x.a->>'grown')::double precision
--      >= (c.k->'species'->(x.a->>'species')->'grow'->>0)::double precision + (c.k->'species'->(x.a->>'species')->'grow'->>1)::double precision;   → 0
--   (a day on) select d.what, count(*), sum(d.coins) from public.town_deeds d where d.what in ('plant_grow', 'plant_gold') or (d.what = 'pick' and d.coins > 0) group by 1;
