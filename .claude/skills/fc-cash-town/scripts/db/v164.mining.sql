-- v164, the miners' part: the mountain's rocks and the cave under it (lib/town/mining, lib/town/cave-state,
-- lib/town/vein). Tried by try-v164.mjs on the stand-in's snapshot, after the base. Safe to run twice.
-- stands on: base
--
-- THE BLACKSMITH AND THE GREAT FIRE ARE NOT HERE (the base's head says why): a rock broken finds no flint for the
-- village's fire, and `town_mine`'s answer has no `fire`.
--
-- What is kept is the base's: a place's document in `town_cave` (0 the mountain's foot, 1 to 30 the cave's floors),
-- a day's floors in `town_cave_days`, the rocks' word in `town_secrets`. A member's own is in their purse (`mine`:
-- lib/town/mining's MineKept). This part makes no table.
--
-- A PLACE'S DOCUMENT, as every rule here reads and writes it (`town.cave_at` makes whatever is kept into this, as it
-- is at a moment: lib/town/cave-state's `caveAt`, for the one place):
--     day      the day it is of (the stamina's day: it turns at dawn in Bangkok)
--     way      the way down open from this floor: {rock (null: broken through), x, y, by, name, at}; or null
--     crystal  who broke the day's crystal rock, on the floor it stood on: {by, name, at}; or null
--     broken   {turn, ids}: the rocks broken in the turn that is
--     struck   {turn, rocks}: the rocks being broken, each by its number: {first, name, at, by: {member: share}}
--     torches  [{f, x, y, until, by}], moss [{f, x, y, until, by}]
-- A document of another day has no way, no crystal and no moss; one of another turn has no rock broken or struck. So
-- nothing is ever cleared by the clock: what is kept is read as it is NOW, and written over at the next deed.
--
-- NO DICE. What a rock holds, whether a neighbour breaks with it, where the day's crystal rock stands, a floor's
-- element and the rock that hides the way down are all rolled from the rocks' word, the place and the turn or the
-- day (`town.roll`, v125's): the same answer whenever it is asked, and lib/town/mining's to the last digit. No
-- function of this part draws a number of its own.
--
-- WHAT A BROWSER IS BELIEVED ABOUT, and how far:
--   · THE TILE STOOD ON (`town.mine_stood`). In the cave it has to be floor that one may stand on, by the day's own
--     layout (`open`: a '1'), or the place of a rock that stands no longer (the way down is walked onto where its
--     rock stood); on the mountain's foot, where the database knows only where the rocks stand, any tile that is no
--     floor of the cave's and no standing rock's. A tile that is not is no tile at all to the rules, and the rock is
--     out of reach (`far`). The rules then hold it to a king's move of the rock, as the code does. WHERE A MEMBER
--     IS, the database does not know and the code does not ask: a tile said is believed if it could be stood on.
--   · THE SWINGS SINCE IT LAST SAID. No more are counted than what is left of the rock takes of this pick, and none
--     quicker than a hand swings: so many swings want so many times `swing.least` milliseconds since the member's
--     last strike was believed (`mine.last` in their purse), or the answer is `soon` (lib/town/mining's own bound).
--   · A VEIN'S GO. The database does not lay a vein's face out (the face comes of a seed by a generator that the
--     page runs; it is not ported). `town_vein` is told the go by the page: its strikes, how many of them counted,
--     how many cells of the face glint, how many glinting cells of ore the crack passed and what each gem's cell it
--     passed gives. It is believed within what the rules allow of ANY face (`town.vein_odd`): the strikes a go has
--     with this pick, the cells a crack can run through in them, the most a face can hold of each thing. An account
--     outside that pays nothing, closes the vein and is written down apart (`vein_odd`), as a fish landed sooner than
--     any fight is let slip and written down as suspect. Whether there is a vein, of which gem, with how many
--     strikes: those are the purse's, written by `town_mine`, never the page's. The whole account is kept in the
--     deed's doc, with the seed of the face and what the go was played with: a go can be played again on its face
--     afterwards (lib/town/vein-account's `accountOf`) and held to what was said.
--     WHAT BELIEVING IT COSTS: a page may say it passed every cell of the fullest face there could be, whatever the
--     face was: six cells, twelve fragments of the floor's ore a vein (a rested hand with a plain pick has four
--     cells or so of the five a face has, taking one face with another); of a gem's vein, both of the two gem's
--     cells a face can have at their three fragments. It cannot say there is a vein where there is none, a gem
--     where there is none, a strike more than the go has, or anything of what its pick carries.
--   · A RESTING FLOOR REACHED (`town_cave_reach`): the floor is the page's word; it counts only while the way down
--     to it is open today. THE LIFT (`town_lift`): where it is taken from is not asked, as the code does not.
--   · A TORCH (`town_torch`) wants floor with nothing on it under it, as the code does. A FLOOR BROKEN THROUGH
--     (`town_drill`): the code asks only which floor the tile said is of; here it has to be a tile that could be
--     stood on as well, with a free tile beside it.
--
-- WHAT AN ANSWER BRINGS BESIDES. Every answer of `town_mine`, and a torch set down or a floor broken through, tells
-- the cave as it is then for the floor and the tile said (`cave`: what `town_cave` tells), so that a page has what
-- its own deed changed with no look in between. What is told no floor (`town_vein`, `town_cave_reach`) tells only
-- the member's own of it (`caveMine`: the lift's stops, the vein open, the rocks loosened, the rock somebody else
-- broke for them), which a page lays over what it was last told.
--
-- THE ORDER ROWS ARE HELD IN (the base's): the place of `town_cave` first; then purses by their ids, the lesser
-- first (a rock somebody else struck first pays THAT member: theirs and the striker's are both held, in that order,
-- before either is read); then nothing else. `town_cave`, `town_mine_peek` and `town_lift` hold nothing.
--
-- THE WORD `unlaid`: every function here but `town_vein` and `town_cave_reach` (which read no floor) answers
-- `town.no('unlaid')` with this clock while today's floors are not all laid, before it holds or changes anything.
--
-- Two functions that were there have a marked block more each (`town.work_counts_of`, `town.deed_th`): the lines
-- are in v164.mining.lines.mjs, and build-v164.mjs builds each from the function's own text. NOTHING OF THEM IS
-- PASTED HERE. The woodcutters' part adds a block of its own to the same two: each block is hung before a line
-- that stays where it is, so the two go in either order.

do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.cave_kept(integer, boolean)') is null
     or to_regprocedure('town.stow_all(jsonb, jsonb)') is null or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null then
    raise exception 'the base of v164 has not run yet: the miners'' part stands on its gate, its tables, its readers of a tool and its pouches';
  end if;
  if to_regprocedure('town.roll(text, bigint[])') is null or to_regprocedure('town.eased(jsonb, jsonb, bigint, double precision, double precision)') is null then
    raise exception 'v125 and v153 have not both run yet: a rock''s roll and a share of stamina kept exact are theirs';
  end if;
end $$;

-- ─── 1. When, and what a place is (lib/town/mining, lib/town/cave) ───────

-- turnOf: the turn a moment is in. Rocks that stand no longer are back at the next.
create or replace function town.mine_turn(p_now bigint)
returns bigint language sql stable
as $$ select p_now / (town.cat('mining')->>'turn')::bigint $$;

-- isRest: every so many floors is a resting floor (no rocks, a fire, a lift).
create or replace function town.cave_is_rest(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor > 0 and p_floor % (town.cat('mining')->>'rest')::integer = 0, false) $$;

-- depthOf: which of the cave's depths a floor is in: 0, 1, 2.
create or replace function town.cave_depth(p_floor integer)
returns integer language sql stable
as $$ select count(*)::integer from jsonb_array_elements_text(town.cat('mining')->'depths') d(v) where p_floor > d.v::integer $$;

-- isDug: whether a floor has rocks to break and a way down to find under one. hasBelow: whether there is a floor under it.
create or replace function town.mine_is_dug(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor >= 1 and p_floor <= (town.cat('mining')->>'floors')::integer and not town.cave_is_rest(p_floor), false) $$;

create or replace function town.mine_has_below(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor >= 1 and p_floor < (town.cat('mining')->>'floors')::integer, false) $$;

-- hardnessOf: how hard a place's rocks are, for somebody with so many points on the miners' line. (From a floor on,
-- a line's good rocks are harder for the skilled: v153's `town.harder_at`.)
create or replace function town.mine_hardness(p_floor integer, p_points double precision)
returns double precision language sql stable
as $$
  select case when p_floor <= 0 then (m.k->'hardness'->>'foot')::double precision
    else (m.k->'hardness'->'depth'->>town.cave_depth(p_floor))::double precision
       * case when p_floor >= (m.k->>'harderFrom')::integer then town.harder_at(town.work_rank('mining', coalesce(p_points, 0))) else 1::double precision end end
    from (select town.cat('mining') as k) m
$$;

-- oreOf: the ore a place's rocks leave fragments of.
create or replace function town.mine_ore(p_floor integer)
returns text language sql stable
as $$ select town.cat('mining')->'ores'->(case when p_floor <= 0 then 0 else town.cave_depth(p_floor) end)->>'shard' $$;

-- elementOf: a floor's element of the day: light and dark so many times as likely as each of the others.
create or replace function town.mine_element(p_word text, p_floor integer, p_day integer)
returns text language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  rare double precision := (m->>'rare')::double precision;
  all_ jsonb := m->'pick'->'elements';
  left_ double precision;
  e text;
begin
  select sum(case when x.id in ('light', 'dark') then rare else 1::double precision end order by x.ord) into left_ from jsonb_array_elements_text(all_) with ordinality x(id, ord);
  left_ := town.roll(p_word || ':element', p_floor, p_day) * left_;
  for e in select x.id from jsonb_array_elements_text(all_) with ordinality x(id, ord) order by x.ord loop
    left_ := left_ - case when e in ('light', 'dark') then rare else 1::double precision end;
    if left_ < 0 then return e; end if;
  end loop;
  return all_->>0;
end;
$$;

-- A rock of some rocks ([[id, x, y, look], …]) by its number: null when there is none.
create or replace function town.mine_rock(p_rocks jsonb, p_rock integer)
returns jsonb language sql immutable
as $$ select r.v from jsonb_array_elements(case when jsonb_typeof(p_rocks) = 'array' then p_rocks else '[]'::jsonb end) with ordinality r(v, ord) where (r.v->>0)::integer = p_rock order by r.ord limit 1 $$;

-- near: whether a tile is within a king's move of so many tiles of another. (A tile that is none is near nothing.)
create or replace function town.mine_near(p_x numeric, p_y numeric, p_to_x integer, p_to_y integer, p_by double precision)
returns boolean language sql immutable
as $$ select coalesce(greatest(abs(floor(p_x) - p_to_x), abs(floor(p_y) - p_to_y)) <= p_by, false) $$;

-- ─── 2. The rolls: where the crystal rock stands, the way down, what a rock holds ─────────────────────────────────

-- crystalOf: where the day's crystal rock stands: {floor, rock}. `p_floors` has the rocks of each floor it may stand
-- on, as they are laid that day ({"28": [[id, x, y, look], …], …}); null when none of them has a rock.
create or replace function town.mine_crystal_of(p_word text, p_day integer, p_floors jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  may integer[] := '{}';
  f integer;
  on_ integer;
  all_ jsonb;
  of_ jsonb;
begin
  for f in (m->'crystal'->'floors'->>0)::integer..(m->'crystal'->'floors'->>1)::integer loop
    if town.mine_is_dug(f) and jsonb_typeof(p_floors->(f::text)) = 'array' and jsonb_array_length(p_floors->(f::text)) > 0 then may := may || f; end if;
  end loop;
  if cardinality(may) = 0 then return null; end if;
  on_ := may[1 + floor(town.roll(p_word || ':crystal', p_day) * cardinality(may))::integer];
  all_ := p_floors->(on_::text);
  -- (a rock with crystals in it, if the floor has one: look 3)
  of_ := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(all_) with ordinality r(v, ord) where (r.v->>3)::integer = 3), all_);
  return jsonb_build_object('floor', on_, 'rock', (of_->(floor(town.roll(p_word || ':crystal:rock', p_day) * jsonb_array_length(of_))::integer)->>0)::integer);
end;
$$;

-- …read off the day as it is laid: null on a day that is not.
create or replace function town.mine_crystal(p_day integer)
returns jsonb language sql stable set search_path = public
as $$
  select town.mine_crystal_of(town.mine_word(), p_day, coalesce(
    (select jsonb_object_agg(f.n::text, town.cave_laid(p_day, f.n)->'rocks')
       from (select town.cat('mining')->'crystal'->'floors' as v) c, generate_series((c.v->>0)::integer, (c.v->>1)::integer) f(n)
      where town.cave_laid(p_day, f.n) is not null), '{}'::jsonb))
$$;

-- wayRockOf: the rock of a floor that hides the way down that day (never the crystal rock): null on a floor with
-- none to find.
create or replace function town.mine_way_rock(p_word text, p_floor integer, p_day integer, p_rocks jsonb, p_crystal integer)
returns integer language plpgsql stable
as $$
declare
  of_ jsonb;
begin
  if not town.mine_is_dug(p_floor) or not town.mine_has_below(p_floor) then return null; end if;
  of_ := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(p_rocks) with ordinality r(v, ord) where p_crystal is null or (r.v->>0)::integer <> p_crystal), '[]'::jsonb);
  if jsonb_array_length(of_) = 0 then return null; end if;
  return (of_->(floor(town.roll(p_word || ':way', p_floor, p_day) * jsonb_array_length(of_))::integer)->>0)::integer;
end;
$$;

-- holdsOf, for a pick whose share of veins is worked out already (`p_veins`: 1 with nothing that makes them
-- likelier). What a rock holds in a turn: {kind: stone, shards, moss?} | {kind: vein, gem, seed} | {kind: way,
-- shards} | {kind: crystal}. `p_today`: {way, crystal}, the rock that hides the way down (null once it is open) and
-- the crystal rock (null where it is not, or once it is broken). On the mountain's foot there is neither, nor a vein.
create or replace function town.mine_holds_by(p_word text, p_floor integer, p_rock integer, p_turn bigint, p_today jsonb, p_veins double precision)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  odds jsonb := case when p_floor > 0 then m->'cave' else m->'foot' end;
  shards integer := 0;
begin
  if p_floor > 0 and jsonb_typeof(p_today->'crystal') = 'number' and (p_today->>'crystal')::numeric = p_rock then return jsonb_build_object('kind', 'crystal'); end if;
  if town.roll(p_word || ':ore', p_floor, p_rock, p_turn) < (odds->>'shard')::double precision then
    shards := (odds->'n'->>0)::integer + floor(town.roll(p_word || ':n', p_floor, p_rock, p_turn) * ((odds->'n'->>1)::integer - (odds->'n'->>0)::integer + 1))::integer;
  end if;
  if p_floor > 0 and jsonb_typeof(p_today->'way') = 'number' and (p_today->>'way')::numeric = p_rock then return jsonb_build_object('kind', 'way', 'shards', shards); end if;
  if p_floor > 0 and town.roll(p_word || ':vein', p_floor, p_rock, p_turn) < (m->'cave'->>'vein')::double precision * p_veins then
    return jsonb_build_object('kind', 'vein', 'gem', town.roll(p_word || ':gem', p_floor, p_rock, p_turn) < (m->'cave'->>'gem')::double precision,
      'seed', floor(town.roll(p_word || ':face', p_floor, p_rock, p_turn) * 4294967296::double precision)::bigint);
  end if;
  if p_floor > 0 and town.roll(p_word || ':moss', p_floor, p_rock, p_turn) < (m->'moss'->>'chance')::double precision then
    return jsonb_build_object('kind', 'stone', 'shards', shards, 'moss', true);
  end if;
  return jsonb_build_object('kind', 'stone', 'shards', shards);
end;
$$;

-- A pick's share of the chance of a vein (the catalog's `pick.gems.dark.veins`), or 1.
create or replace function town.mine_veins(p_pick jsonb)
returns double precision language sql stable
as $$ select town.gem_by(p_pick, 'dark', town.cat('mining')->'pick'->'gems'->'dark'->'veins', 1) $$;

-- holdsOf: what a rock holds in a turn, for whoever strikes it with some pick.
create or replace function town.mine_holds(p_word text, p_floor integer, p_rock integer, p_turn bigint, p_today jsonb, p_pick jsonb)
returns jsonb language sql stable
as $$ select town.mine_holds_by(p_word, p_floor, p_rock, p_turn, p_today, town.mine_veins(p_pick)) $$;

-- peekOf: what a peek says of a rock: stone, fragments, or a vein. (The way down and the crystal are no peek's to
-- tell: each says what it would hold besides.)
create or replace function town.mine_peek(p_holds jsonb)
returns text language sql immutable
as $$
  select case when p_holds->>'kind' = 'vein' then 'vein'
    when p_holds->>'kind' <> 'crystal' and coalesce((p_holds->>'shards')::numeric, 0) > 0 then 'shards' else 'stone' end
$$;

-- ─── 3. A member's own (lib/town/mining's MineKept, in their purse) ──────

-- Whether something kept is a whole number, as the code asks it (Number.isInteger).
create or replace function town.mine_int(p_v jsonb)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_v) = 'number' and (p_v #>> '{}')::numeric = floor((p_v #>> '{}')::numeric), false) $$;

-- Whether something kept counts as a yes, as the code reads it (!!v): nothing, false, 0 and an empty word do not.
create or replace function town.mine_yes(p_v jsonb)
returns boolean language sql immutable
as $$
  select case jsonb_typeof(p_v) when 'boolean' then (p_v #>> '{}')::boolean when 'number' then (p_v #>> '{}')::numeric <> 0
    when 'string' then p_v #>> '{}' <> '' when 'array' then true when 'object' then true else false end
$$;

-- A number of something kept, as the code reads one (Number(v) || 0): a number, a yes for one, a word that is a
-- number; nothing, of anything else.
create or replace function town.mine_num(p_v jsonb)
returns double precision language sql immutable
as $$
  select case jsonb_typeof(p_v) when 'number' then (p_v #>> '{}')::double precision when 'boolean' then case when (p_v #>> '{}')::boolean then 1 else 0 end
    when 'string' then case when btrim(p_v #>> '{}') ~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then btrim(p_v #>> '{}')::double precision else 0 end
    else 0 end
$$;

-- veinOf: a vein opened and not played out, as it is kept, made sound: null for what is none.
create or replace function town.mine_vein_of(p_v jsonb)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(p_v) = 'object' and town.mine_int(p_v->'f') and town.mine_int(p_v->'rock') and town.mine_int(p_v->'turn')
      and jsonb_typeof(p_v->'seed') = 'number' and town.mine_int(p_v->'mods'->'strikes') then
    jsonb_build_object('f', p_v->'f', 'rock', p_v->'rock', 'turn', p_v->'turn', 'seed', p_v->'seed',
      'gem', case when jsonb_typeof(p_v->'gem') = 'string' and town.cat('mining')->'pick'->'elements' ? (p_v->>'gem') then p_v->'gem' else 'null'::jsonb end,
      'mods', jsonb_build_object('strikes', greatest(1, (p_v->'mods'->>'strikes')::numeric), 'back', greatest(0::double precision, floor(town.mine_num(p_v->'mods'->'back'))),
        'cross', greatest(0::double precision, floor(town.mine_num(p_v->'mods'->'cross'))), 'spent', town.mine_yes(p_v->'mods'->'spent')),
      'more', greatest(0::double precision, floor(town.mine_num(p_v->'more'))))
    || case when town.mine_yes(p_v->'again') then jsonb_build_object('again', true) else '{}'::jsonb end
  end
$$;

-- paidOf: the last rock of mine that somebody else broke for me, as it is kept, made sound: null for what is none.
create or replace function town.mine_paid_of(p_v jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'at') = 'number' and town.mine_int(p_v->'f') and town.mine_int(p_v->'rock') and jsonb_typeof(p_v->'got') = 'array' then
    jsonb_build_object('at', p_v->'at', 'f', p_v->'f', 'rock', p_v->'rock',
      'got', coalesce((select jsonb_agg(jsonb_build_array(g.v->0, g.v->1) order by g.ord) from jsonb_array_elements(p_v->'got') with ordinality g(v, ord)
                        where jsonb_typeof(g.v) = 'array' and jsonb_typeof(g.v->0) = 'string' and jsonb_typeof(g.v->1) = 'number'), '[]'::jsonb),
      'way', town.mine_yes(p_v->'way'), 'crystal', town.mine_yes(p_v->'crystal'), 'vein', town.mine_yes(p_v->'vein'),
      'by', case when jsonb_typeof(p_v->'by') = 'string' then p_v->>'by' else '' end)
  end
$$;

-- mineOf: what a purse keeps of the mine, made sound: stamina still to pay under a point (`owed`), plain rocks
-- broken since the last crumb, the rocks loosened of one place in one turn, a vein opened, the resting floors
-- reached, when a rock was last struck, and the last rock somebody else broke for them.
create or replace function town.mine_of(p_purse jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'owed', case when jsonb_typeof(k.v->'owed') = 'number' and (k.v->>'owed')::double precision > 0 and (k.v->>'owed')::double precision < 1 then k.v->'owed' else '0'::jsonb end,
    'crumb', case when town.mine_int(k.v->'crumb') and (k.v->>'crumb')::numeric > 0 then k.v->'crumb' else '0'::jsonb end,
    'loose', case when jsonb_typeof(k.v->'loose'->'k') = 'string' and jsonb_typeof(k.v->'loose'->'ids') = 'array' then jsonb_build_object('k', k.v->'loose'->'k',
        'ids', coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(k.v->'loose'->'ids') with ordinality i(v, ord) where town.mine_int(i.v)), '[]'::jsonb))
      else jsonb_build_object('k', '', 'ids', '[]'::jsonb) end,
    'vein', coalesce(town.mine_vein_of(k.v->'vein'), 'null'::jsonb),
    -- (a whole number first, and only then a number at all: a word kept there is passed over, never read as one)
    'rests', coalesce((select jsonb_agg(r.n order by r.n)
        from (select distinct case when town.mine_int(i.v) then (i.v #>> '{}')::numeric end as n
                from jsonb_array_elements(case when jsonb_typeof(k.v->'rests') = 'array' then k.v->'rests' else '[]'::jsonb end) i(v)) r
       where r.n between 1 and (town.cat('mining')->>'floors')::numeric and r.n % (town.cat('mining')->>'rest')::numeric = 0), '[]'::jsonb),
    'last', case when jsonb_typeof(k.v->'last') = 'number' then k.v->'last' else '0'::jsonb end,
    'paid', coalesce(town.mine_paid_of(k.v->'paid'), 'null'::jsonb))
    from (select case when jsonb_typeof(p_purse->'mine') = 'object' then p_purse->'mine' else '{}'::jsonb end as v) k
$$;

-- pickOf: the pick in the hand: null when what is held is no pick.
create or replace function town.mine_pick(p_purse jsonb)
returns jsonb language sql stable
as $$ select case when town.tool_kind(s.v->>'item') = 'pick' then s.v end from (select town.hand_stack(p_purse) as v) s $$;

-- anyPick: the pick somebody is paid by for a rock another broke for them: the one in the hand, or, the hand being
-- on something else by now, the best in the bag (the first of the best).
create or replace function town.mine_any_pick(p_purse jsonb)
returns jsonb language sql stable
as $$
  select coalesce(town.mine_pick(p_purse),
    (select b.v from jsonb_array_elements(p_purse->'bag') with ordinality b(v, ord)
      where b.v <> 'null'::jsonb and town.tool_kind(b.v->>'item') = 'pick' order by town.tool_level(b.v) desc, b.ord limit 1))
$$;

-- isLoose: whether a rock is loosened for somebody in a place and a turn.
create or replace function town.mine_is_loose(p_purse jsonb, p_floor integer, p_turn bigint, p_rock integer)
returns boolean language sql stable
as $$
  select l.v->>'k' = p_floor::text || ':' || p_turn::text and exists (select 1 from jsonb_array_elements(l.v->'ids') i(v) where (i.v #>> '{}')::numeric = p_rock)
    from (select town.mine_of(p_purse)->'loose' as v) l
$$;

-- pickSwings (lib/town/tools): how many swings a pick takes to break a rock of some hardness, the pick's own all
-- told. Never under one. (In `double precision`, as the code counts: see the base's head.)
create or replace function town.mine_pick_swings(p_pick jsonb, p_hardness double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, ceil(ceil(p_hardness / (k.p->'power'->>town.tool_level(p_pick))::double precision)
      * (1::double precision - town.gem_by(p_pick, 'fire', k.p->'gems'->'fire'->'fewer')))
    + town.gem_by(p_pick, 'dark', k.p->'gems'->'dark'->'swings'))::integer
    from (select town.cat('mining')->'pick' as p) k
$$;

-- swingsFor: how many swings a rock takes: the pick's own, so many times with no stamina, fewer for a rock
-- loosened. Never under one.
create or replace function town.mine_swings(p_pick jsonb, p_floor integer, p_spent boolean, p_loose boolean, p_points double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, town.mine_pick_swings(p_pick, town.mine_hardness(p_floor, p_points)) * case when p_spent then (town.cat('mining')->>'tired')::double precision else 1 end
    - case when p_loose then town.opt_n('pkLoose', 'fewer') else 0 end)::integer
$$;

-- veinStrikes (lib/town/tools), veinMods (lib/town/vein): what a go at a vein is played with, by the pick in the
-- hand and whether its holder has any stamina left: its strikes, how many of those a knot stops are given back, how
-- many of the knots the crack may cross, and whether it was begun with no stamina.
create or replace function town.vein_mods(p_pick jsonb, p_spent boolean)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'strikes', greatest(1::double precision, (k.m->'pick'->'strikes'->>town.tool_level(p_pick))::double precision
      + case when town.tool_has(p_pick, 'pkSteady') then town.opt_n('pkSteady', 'strikes') else 0 end
      - case when p_spent then (k.m->'vein'->'tired'->>'fewer')::double precision else 0 end),
    'back', town.gem_by(p_pick, 'water', k.m->'pick'->'gems'->'water'->'back'),
    'cross', town.gem_by(p_pick, 'ice', k.m->'pick'->'gems'->'ice'->'cross'), 'spent', coalesce(p_spent, false))
    from (select town.cat('mining') as m) k
$$;

-- ─── 4. A rock being broken (lib/town/mining's Struck) ───────────────────

-- struckOf: a rock's tally as it is kept, made sound: {first, name, at, by: {member: share}}; null for what is none.
create or replace function town.mine_struck_of(p_v jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'first') = 'string' and jsonb_typeof(p_v->'by') = 'object' and b.by <> '{}'::jsonb then
    jsonb_build_object('first', p_v->'first', 'name', case when jsonb_typeof(p_v->'name') = 'string' then p_v->>'name' else '' end,
      'at', case when jsonb_typeof(p_v->'at') = 'number' then p_v->'at' else '0'::jsonb end, 'by', b.by)
  end
    from (select coalesce((select jsonb_object_agg(e.key, least(1::double precision, (e.value #>> '{}')::double precision))
            from jsonb_each(case when jsonb_typeof(p_v->'by') = 'object' then p_v->'by' else '{}'::jsonb end) e
           where case when jsonb_typeof(e.value) = 'number' then (e.value #>> '{}')::double precision > 0 else false end), '{}'::jsonb) as by) b
$$;

-- partOf: how much of a rock is struck away, none (0) to all of it (1): everybody's shares, added up.
create or replace function town.mine_part(p_struck jsonb)
returns double precision language sql immutable
as $$
  select case when p_struck is null or jsonb_typeof(p_struck->'by') is distinct from 'object' then 0::double precision
    else least(1::double precision, coalesce((select sum(case when jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::double precision > 0 then (e.value #>> '{}')::double precision else 0 end order by e.ord)
      from jsonb_each(p_struck->'by') with ordinality e(key, value, ord)), 0)) end
$$;

-- helpersOf: whoever struck some of a rock away besides the one who struck it first, in the order of their ids.
create or replace function town.mine_helpers(p_struck jsonb)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(e.key order by e.key collate "C") from jsonb_each(p_struck->'by') e
    where e.key <> p_struck->>'first' and case when jsonb_typeof(e.value) = 'number' then (e.value #>> '{}')::double precision > 0 else false end), '[]'::jsonb)
$$;

-- ─── 5. A place's document (lib/town/cave-state, for the one place) ──────

-- Whether something kept says who did a thing and when: {by, name, at}.
create or replace function town.cave_is_by(p_v jsonb)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'by') = 'string' and jsonb_typeof(p_v->'name') = 'string' and jsonb_typeof(p_v->'at') = 'number', false) $$;

-- The lights of a list that still burn at a moment (torches, moss), each made sound: {f, x, y, until, by}.
create or replace function town.cave_lights(p_v jsonb, p_now bigint)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(jsonb_build_object('f', t.v->'f', 'x', t.v->'x', 'y', t.v->'y', 'until', t.v->'until', 'by', t.v->'by') order by t.ord)
    from jsonb_array_elements(case when jsonb_typeof(p_v) = 'array' then p_v else '[]'::jsonb end) with ordinality t(v, ord)
   where case when jsonb_typeof(t.v) = 'object' and town.mine_int(t.v->'f') and town.mine_int(t.v->'x') and town.mine_int(t.v->'y')
                and jsonb_typeof(t.v->'until') = 'number' and jsonb_typeof(t.v->'by') = 'string' then (t.v->>'until')::numeric > p_now else false end), '[]'::jsonb)
$$;

-- caveAt, for one place: its document as it is kept, made sound, and as it is at a moment (this file's head says its
-- shape). A new day has no way open, its crystal whole and no moss; a torch burnt out is gone; rocks of a turn gone
-- by are back, whole.
create or replace function town.cave_at(p_kept jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  day_ integer := town.day_of(p_now);
  turn_ bigint := town.mine_turn(p_now);
  same boolean := coalesce(jsonb_typeof(k->'day') = 'number' and (k->>'day')::numeric = day_, false);
  w jsonb := k->'way';
  b jsonb := k->'broken';
  s jsonb := k->'struck';
  way_ jsonb := 'null'::jsonb;
  ids jsonb := '[]'::jsonb;
  rocks jsonb := '{}'::jsonb;
  e record;
  sound jsonb;
begin
  if same and town.cave_is_by(w) and town.mine_int(w->'x') and town.mine_int(w->'y') then
    way_ := jsonb_build_object('rock', case when town.mine_int(w->'rock') then w->'rock' else 'null'::jsonb end, 'x', w->'x', 'y', w->'y', 'by', w->'by', 'name', w->'name', 'at', w->'at');
  end if;
  if jsonb_typeof(b) = 'object' and jsonb_typeof(b->'turn') = 'number' and jsonb_typeof(b->'ids') = 'array' then
    if (b->>'turn')::numeric = turn_ then
      -- (each once, in the order they were broken)
      ids := coalesce((select jsonb_agg(d.v order by d.ord) from (select i.v, min(i.ord) as ord from jsonb_array_elements(b->'ids') with ordinality i(v, ord) where town.mine_int(i.v) group by i.v) d), '[]'::jsonb);
    end if;
  end if;
  if jsonb_typeof(s) = 'object' and jsonb_typeof(s->'turn') = 'number' and jsonb_typeof(s->'rocks') = 'object' then
    if (s->>'turn')::numeric = turn_ then
      for e in select r.key as id, r.value as tally from jsonb_each(s->'rocks') r loop
        sound := town.mine_struck_of(e.tally);
        if sound is not null and e.id ~ '^-?[0-9]+$' then rocks := rocks || jsonb_build_object((e.id::numeric)::text, sound); end if;
      end loop;
    end if;
  end if;
  return jsonb_build_object('day', day_, 'way', way_,
    'crystal', case when same and town.cave_is_by(k->'crystal') then jsonb_build_object('by', k->'crystal'->'by', 'name', k->'crystal'->'name', 'at', k->'crystal'->'at') else 'null'::jsonb end,
    'broken', jsonb_build_object('turn', turn_, 'ids', ids), 'struck', jsonb_build_object('turn', turn_, 'rocks', rocks),
    'torches', town.cave_lights(k->'torches', p_now), 'moss', case when same then town.cave_lights(k->'moss', p_now) else '[]'::jsonb end);
end;
$$;

-- goneAt: the rocks of a place that are gone at a moment: those broken this turn, and the one the open way down
-- was found under.
create or replace function town.cave_gone(p_cave jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(p_cave->'way'->'rock') = 'number' and not exists (select 1 from jsonb_array_elements(g.ids) i(v) where i.v = p_cave->'way'->'rock')
              then g.ids || jsonb_build_array(p_cave->'way'->'rock') else g.ids end
    from (select case when (p_cave->'broken'->>'turn')::numeric = town.mine_turn(p_now) and jsonb_typeof(p_cave->'broken'->'ids') = 'array' then p_cave->'broken'->'ids' else '[]'::jsonb end as ids) g
$$;

-- stands: whether a rock of a place stands at a moment. `p_crystal`: the day's crystal rock if it is this place's;
-- once broken it is gone for the day.
create or replace function town.cave_stands(p_cave jsonb, p_rock integer, p_now bigint, p_crystal integer)
returns boolean language sql stable
as $$
  select not exists (select 1 from jsonb_array_elements(town.cave_gone(p_cave, p_now)) i(v) where (i.v #>> '{}')::numeric = p_rock)
     and not (coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb and p_crystal is not null and p_crystal = p_rock)
$$;

-- struckAt: what has been struck away of a rock of a place at a moment, and by whom: null when nobody has struck it
-- this turn.
create or replace function town.cave_struck_at(p_cave jsonb, p_rock integer, p_now bigint)
returns jsonb language sql stable
as $$ select case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then p_cave->'struck'->'rocks'->(p_rock::text) end $$;

-- strikeRock: a rock of a place as it is struck now.
create or replace function town.cave_strike(p_cave jsonb, p_rock integer, p_struck jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_cave || jsonb_build_object('struck', jsonb_build_object('turn', town.mine_turn(p_now), 'rocks',
    (case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then coalesce(p_cave->'struck'->'rocks', '{}'::jsonb) else '{}'::jsonb end) || jsonb_build_object(p_rock::text, p_struck)))
$$;

-- breakRocks: some rocks of a place broken ([id, …]): what was struck away of them is no more to be kept.
create or replace function town.cave_break(p_cave jsonb, p_ids jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_cave || jsonb_build_object(
    'broken', jsonb_build_object('turn', t.n, 'ids', coalesce((select jsonb_agg(d.v order by d.ord)
        from (select i.v, min(i.ord) as ord from jsonb_array_elements(case when (p_cave->'broken'->>'turn')::numeric = t.n then coalesce(p_cave->'broken'->'ids', '[]'::jsonb) else '[]'::jsonb end || p_ids) with ordinality i(v, ord) group by i.v) d), '[]'::jsonb)))
    || case when (p_cave->'struck'->>'turn')::numeric = t.n then jsonb_build_object('struck', jsonb_build_object('turn', t.n, 'rocks',
        coalesce((select jsonb_object_agg(r.key, r.value) from jsonb_each(p_cave->'struck'->'rocks') r where not exists (select 1 from jsonb_array_elements(p_ids) i(v) where (i.v #>> '{}') = r.key)), '{}'::jsonb)))
       else '{}'::jsonb end
    from (select town.mine_turn(p_now) as n) t
$$;

-- struckTold: what a member is told of the rocks of a place that are being broken: of each, how much of it is struck
-- away, how much of that by them, who struck it first (their name), and whether that was the member.
create or replace function town.cave_struck_told(p_cave jsonb, p_who text, p_now bigint)
returns jsonb language sql stable
as $$
  select case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then
    coalesce((select jsonb_object_agg(r.key, jsonb_build_object('part', town.mine_part(r.value), 'own', least(1::double precision, coalesce((r.value->'by'->>p_who)::double precision, 0)),
        'by', r.value->'name', 'mine', r.value->>'first' = p_who)) from jsonb_each(p_cave->'struck'->'rocks') r), '{}'::jsonb)
    else '{}'::jsonb end
$$;

-- wayOpen: whether a floor's way down is open: a resting floor's always is; another's once it has been found or
-- broken through that day. Never below the last floor.
create or replace function town.cave_way_open(p_cave jsonb, p_floor integer)
returns boolean language sql stable
as $$
  select coalesce(p_floor >= 1 and p_floor < (town.cat('mining')->>'floors')::integer
    and (town.cave_is_rest(p_floor) or coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb), false)
$$;

-- What is known of a place on a day, for the rolls ({way, crystal}): which rock hides the way down (none once it is
-- open, or where there is none), and which is the crystal rock (none where it is not, or once it is broken).
-- `p_crystal`: the day's crystal rock if it is this place's.
create or replace function town.mine_today(p_word text, p_floor integer, p_day integer, p_rocks jsonb, p_cave jsonb, p_crystal integer)
returns jsonb language sql stable
as $$
  select case when p_floor <= 0 then jsonb_build_object('way', null, 'crystal', null)
    else jsonb_build_object(
      'way', case when coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb then null else town.mine_way_rock(p_word, p_floor, p_day, p_rocks, p_crystal) end,
      'crystal', case when coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb then null else p_crystal end) end
$$;

-- ─── 6. Where things are, by a day's layout ──────────────────────────────

-- floorAtTile: which floor of the cave a tile of the world is on (0: none).
create or replace function town.cave_floor_at(p_x integer, p_y integer)
returns integer language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  ax integer := (m->'at'->>'x')::integer;
  ay integer := (m->'at'->>'y')::integer;
  across integer := (m->'at'->>'across')::integer;
  apart integer := (m->'at'->>'apart')::integer;
  side integer := (m->'at'->>'size')::integer;
  col integer;
  row_ integer;
  n integer;
begin
  if p_x is null or p_y is null or p_x < ax or p_y < ay then return 0; end if;
  col := (p_x - ax) / apart;
  row_ := (p_y - ay) / apart;
  if col >= across or p_x - ax - col * apart >= side or p_y - ay - row_ * apart >= side then return 0; end if;
  n := row_ * across + col + 1;
  return case when n <= (m->>'floors')::integer then n else 0 end;
end;
$$;

-- floorTile: whether a tile of the world is floor of a floor of the cave that somebody may stand on, with nothing
-- standing on it, by the floor as it is laid.
create or replace function town.cave_floor_tile(p_layout jsonb, p_floor integer, p_x integer, p_y integer)
returns boolean language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  across integer := (m->'at'->>'across')::integer;
  apart integer := (m->'at'->>'apart')::integer;
  side integer := (m->'at'->>'size')::integer;
  u integer;
  v integer;
begin
  if p_layout is null or p_x is null or p_y is null or p_floor is null or p_floor < 1 or p_floor > (m->>'floors')::integer then return false; end if;
  u := p_x - ((m->'at'->>'x')::integer + ((p_floor - 1) % across) * apart);
  v := p_y - ((m->'at'->>'y')::integer + ((p_floor - 1) / across) * apart);
  return u >= 0 and v >= 0 and u < side and v < side and substr(p_layout->>'open', v * side + u + 1, 1) = '1';
end;
$$;

-- ─── 7. What a member is told of the cave (lib/town/cave-state's CaveTold) ─

-- What the village shares (the rocks gone by place, the ways down open, the torches and the moss, the deepest floor
-- reached today) and the member's own (the lift's stops, a vein opened, the rocks loosened, the rocks that glint for
-- them on the floor they are on, the day's crystal rock where they may know of it, the rocks being broken in the
-- place they are in, the last rock of theirs somebody else broke). Never what a rock holds.
-- `p_caves`: every place that has a document, each as it is at this moment ({"0": …, "7": …}); `p_rocks`: the rocks
-- of the place the member says they are in; `p_crystal`: where the day's crystal rock stands, {floor, rock}.

-- The member's own of it, which is all in their purse: the lift's stops, a vein opened and not played out, the rocks
-- loosened for them this turn, the last rock of theirs somebody else broke. (Told by itself, as `caveMine`, by what
-- changes only these and is told no floor: a page lays it over what it was last told of the cave.)
create or replace function town.cave_own(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object('rests', k.v->'rests', 'vein', k.v->'vein',
    'loose', case when split_part(k.lk, ':', 2) ~ '^[0-9]+$' and split_part(k.lk, ':', 2)::numeric = town.mine_turn(p_now) and jsonb_array_length(k.v->'loose'->'ids') > 0
      then jsonb_build_object('floor', case when split_part(k.lk, ':', 1) ~ '^-?[0-9]+$' then split_part(k.lk, ':', 1)::numeric end, 'ids', k.v->'loose'->'ids') else 'null'::jsonb end,
    'paid', k.v->'paid')
    from (select o.v, o.v->'loose'->>'k' as lk from (select town.mine_of(p_purse) as v) o) k
$$;

create or replace function town.cave_told_of(p_caves jsonb, p_purse jsonb, p_me text, p_floor integer, p_x integer, p_y integer, p_now bigint, p_word text, p_rocks jsonb, p_crystal jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  turn_ bigint := town.mine_turn(p_now);
  day_ integer := town.day_of(p_now);
  pick jsonb := town.mine_pick(p_purse);
  here jsonb := coalesce(p_caves->(p_floor::text), town.cave_at(null, p_now));
  cfloor integer := (p_crystal->>'floor')::integer;
  crock integer := (p_crystal->>'rock')::integer;
  -- (the crystal's breaker is written in the document of the floor it stood on)
  shattered boolean := cfloor is not null and coalesce(p_caves->(cfloor::text)->'crystal', 'null'::jsonb) <> 'null'::jsonb;
  gone jsonb := '{}'::jsonb;
  ways jsonb := '{}'::jsonb;
  deepest jsonb := 'null'::jsonb;
  glints jsonb := '[]'::jsonb;
  torches jsonb;
  moss jsonb;
  f integer;
  c jsonb;
  ids jsonb;
  reach double precision;
  veins double precision;
  today_ jsonb;
  r jsonb;
  again_ numeric;
begin
  for f in 0..(m->>'floors')::integer loop
    c := p_caves->(f::text);
    continue when c is null;
    ids := town.cave_gone(c, p_now);
    if shattered and cfloor = f and not exists (select 1 from jsonb_array_elements(ids) i(v) where (i.v #>> '{}')::numeric = crock) then ids := ids || jsonb_build_array(crock); end if;
    if jsonb_array_length(ids) > 0 then gone := gone || jsonb_build_object(f::text, ids); end if;
    if coalesce(c->'way', 'null'::jsonb) <> 'null'::jsonb then
      ways := ways || jsonb_build_object(f::text, jsonb_build_object('x', c->'way'->'x', 'y', c->'way'->'y', 'rock', c->'way'->'rock', 'name', c->'way'->'name'));
      -- (the board: the floor under the deepest way that is open today, and who opened it; the floors are gone through from the top)
      deepest := jsonb_build_object('floor', f + 1, 'by', c->'way'->'by', 'name', c->'way'->'name', 'at', c->'way'->'at');
    end if;
  end loop;
  -- the rocks that glint for the pick in the hand (the catalog's `pick.gems.light.glint`), by where the member stands
  reach := town.gem_by(pick, 'light', m->'pick'->'gems'->'light'->'glint');
  if reach > 0 and p_floor > 0 and p_x is not null and p_y is not null then
    today_ := town.mine_today(p_word, p_floor, day_, p_rocks, here, case when cfloor = p_floor then crock end);
    veins := town.mine_veins(pick);
    for r in select x.v from jsonb_array_elements(p_rocks) with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(coalesce(gone->(p_floor::text), '[]'::jsonb)) i(v) where (i.v #>> '{}')::numeric = (r->>0)::numeric);
      continue when reach < (m->>'all')::double precision
        and (((r->>1)::integer - p_x) * ((r->>1)::integer - p_x) + ((r->>2)::integer - p_y) * ((r->>2)::integer - p_y))::double precision > reach * reach;
      if town.mine_holds_by(p_word, p_floor, (r->>0)::integer, turn_, today_, veins)->>'kind' = 'vein' then glints := glints || jsonb_build_array((r->>0)::integer); end if;
    end loop;
  end if;
  -- (the lights of every place, the first to go out first)
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into torches
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'torches') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into moss
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'moss') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  -- changesAt: when this next changes by itself: the rocks' next turn, the first torch to burn out, the first moss to stop glowing
  select least((turn_ + 1) * (m->>'turn')::numeric, min((t.v->>'until')::numeric)) into again_ from jsonb_array_elements(torches || moss) t(v);
  return jsonb_build_object('day', day_, 'turn', turn_, 'again', again_, 'gone', gone, 'ways', ways, 'torches', torches, 'moss', moss, 'deepest', deepest,
    'glints', glints, 'place', p_floor, 'struck', town.cave_struck_told(here, p_me, p_now),
    'crystal', case when p_crystal is null or p_crystal = 'null'::jsonb or shattered then 'null'::jsonb
      when p_floor = cfloor then jsonb_build_object('floor', cfloor, 'rock', crock)
      when pick is not null and town.tool_has(pick, 'pkGleam') then jsonb_build_object('floor', cfloor, 'rock', null) else 'null'::jsonb end)
    || town.cave_own(p_purse, p_now);
end;
$$;

-- …for a member, read off what is kept (nothing is held): the places as they are now, the rocks of the place they
-- say they are in (a place that is none is the mountain's foot), the day's crystal rock.
create or replace function town.cave_told(p_member uuid, p_purse jsonb, p_floor integer, p_x integer, p_y integer, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select town.cave_told_of(
    coalesce((select jsonb_object_agg(c.place::text, town.cave_at(c.doc, p_now)) from public.town_cave c), '{}'::jsonb),
    p_purse, p_member::text, f.n, p_x, p_y, p_now, town.mine_word(),
    case when f.n = 0 then town.cat('mining')->'rocks' else coalesce(town.cave_laid(d.n, f.n)->'rocks', '[]'::jsonb) end,
    town.mine_crystal(d.n))
    from (select case when p_floor between 0 and (town.cat('mining')->>'floors')::integer then p_floor else 0 end as n) f, (select town.day_of(p_now) as n) d
$$;

-- ─── 8. A rock struck (lib/town/mining's mine, payFirst and pay) ─────────
--
-- A GO, as the rules below are given it (`p_go`): now; floor (0: the mountain's foot); rock; at ([x, y], the tile
-- the member stands on: null for a tile that is none); swings (those made since the page last said); who and name
-- (the striker's); rocks (the place's as they are laid, [[id, x, y, look], …]); cave (the place's document as it is
-- now); crystal (the day's crystal rock if it is this place's); day; today ({way, crystal}: `town.mine_today`);
-- element (the floor's of the day); points (the striker's on the miners' line); quake (a counted power asked for).

-- Some more of a thing among what a go leaves ([[thing, how many], …]): onto its own line, or a new one at the end.
create or replace function town.mine_add(p_got jsonb, p_id text, p_n double precision)
returns jsonb language sql immutable
as $$
  select case when p_n is null or p_n <= 0 then p_got
    when exists (select 1 from jsonb_array_elements(p_got) g(v) where g.v->>0 = p_id)
      then (select jsonb_agg(case when g.v->>0 = p_id then jsonb_build_array(p_id, (g.v->>1)::double precision + p_n) else g.v end order by g.ord) from jsonb_array_elements(p_got) with ordinality g(v, ord))
    else p_got || jsonb_build_array(jsonb_build_array(p_id, p_n)) end
$$;

-- What a rock holds if it is a plain one that may break with another: null for one that somebody else than `p_first`
-- has begun (that one is theirs), and for one that hides a vein, the way down or the crystal.
create or replace function town.mine_plain_at(p_go jsonb, p_rock integer, p_first text, p_veins double precision, p_word text)
returns jsonb language sql stable
as $$
  select case when b.begun is not null and b.begun->>'first' <> p_first then null
    else (select case when h.v->>'kind' = 'stone' then h.v end
            from (select town.mine_holds_by(p_word, (p_go->>'floor')::integer, p_rock, town.mine_turn((p_go->>'now')::bigint), p_go->'today', p_veins) as v) h) end
    from (select town.cave_struck_at(p_go->'cave', p_rock, (p_go->>'now')::bigint) as begun) b
$$;

-- pay: a rock struck whole away breaks, and whoever struck it first has what it left. `p_own`: it is they who
-- struck the last of it away (then it is the pick in their hand that counts; or else the best they have). Refused
-- with nothing changed when it hides a vein and they have one open, or there is no room for what it leaves.
create or replace function town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_rock->>0)::integer;
  here integer := (p_go->>'crystal')::integer;
  touch double precision := (m->>'touch')::double precision;
  pick jsonb := case when p_own then town.mine_pick(p_purse) else town.mine_any_pick(p_purse) end;
  opts jsonb := town.tool_mods(pick)->'opts';
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  spent boolean := town.stamina_of(p_purse, now_) <= 0;
  veins double precision := town.mine_veins(pick);
  holds jsonb := town.mine_holds_by(p_word, floor_, rock_, turn_, p_go->'today', veins);
  breaks jsonb;                 -- [{rock: [id, x, y, look], holds}, …]: the rock struck first
  r jsonb;
  b jsonb;
  h jsonb;
  chance double precision;
  chained integer;
  got_ jsonb := '[]'::jsonb;
  each_ jsonb := '[]'::jsonb;
  moss jsonb := '[]'::jsonb;
  gone jsonb;
  loose jsonb;
  ore_ text := town.mine_ore(floor_);
  crumb integer := (kept->>'crumb')::integer;
  shards double precision;
  by_ double precision;
  way_ integer;
  shattered boolean := false;
  vein_ jsonb := 'null'::jsonb;
  stowed jsonb;
  after_ jsonb;
  cost double precision := 0;
  owed double precision := (kept->>'owed')::double precision;
  fresh_ jsonb;
  eased_ jsonb;
  used jsonb;
  had_ double precision;
  key_ text := floor_::text || ':' || turn_::text;
  paid jsonb;
begin
  if holds->>'kind' = 'vein' and kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;

  -- which rocks break: the one struck; by `pkQuake`, plain rocks about the member; and by the roll of `:chain`, now and
  -- then a neighbour. (Never a rock somebody else has begun: that one is theirs.)
  breaks := jsonb_build_array(jsonb_build_object('rock', p_rock, 'holds', holds));
  if p_quake then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when (r->>0)::integer = rock_ or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, town.opt_n('pkQuake', 'reach'));
      h := town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word);
      if h is not null then breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', h)); end if;
    end loop;
  end if;
  chance := town.gem_by(pick, 'lightning', m->'pick'->'gems'->'lightning'->'chain');
  if chance > 0 and town.roll(p_word || ':chain', floor_, rock_, turn_) < chance then
    -- (the nearest plain rock that touches it and still stands; of two as near, the lesser number)
    r := (select x.v from jsonb_array_elements(p_go->'rocks') x(v)
           where town.cave_stands(p_go->'cave', (x.v->>0)::integer, now_, here)
             and not exists (select 1 from jsonb_array_elements(breaks) q(v) where q.v->'rock'->>0 = x.v->>0)
             and town.mine_near((p_rock->>1)::numeric, (p_rock->>2)::numeric, (x.v->>1)::integer, (x.v->>2)::integer, touch)
             and town.mine_plain_at(p_go, (x.v->>0)::integer, p_struck->>'first', veins, p_word) is not null
           order by ((x.v->>1)::integer - (p_rock->>1)::integer) * ((x.v->>1)::integer - (p_rock->>1)::integer) + ((x.v->>2)::integer - (p_rock->>2)::integer) * ((x.v->>2)::integer - (p_rock->>2)::integer), (x.v->>0)::integer
           limit 1);
    if r is not null then
      breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word)));
      chained := (r->>0)::integer;
    end if;
  end if;

  -- what they leave
  for b in select x.v from jsonb_array_elements(breaks) with ordinality x(v, ord) order by x.ord loop
    got_ := town.mine_add(got_, 'stone', (m->>'stone')::double precision);
    h := b->'holds';
    shards := 0;
    if h->>'kind' in ('stone', 'way') then
      shards := (h->>'shards')::double precision;
      if h->>'kind' = 'way' then
        way_ := (b->'rock'->>0)::integer;
      elsif opts ? 'pkCrumb' then
        crumb := crumb + 1;
        if crumb >= town.opt_n('pkCrumb', 'every') then crumb := 0; shards := shards + town.opt_n('pkCrumb', 'more'); end if;
      end if;
      if h->>'kind' = 'stone' and coalesce((h->>'moss')::boolean, false) then moss := moss || jsonb_build_array((b->'rock'->>0)::integer); end if;
      got_ := town.mine_add(got_, ore_, shards);
    elsif h->>'kind' = 'crystal' then
      shattered := true;
      by_ := case when opts ? 'pkGleam' then town.opt_n('pkGleam', 'by') else 1 end;
      shards := ceil((m->'crystal'->>'shards')::double precision * by_);
      got_ := town.mine_add(got_, m->'ores'->-1->>'shard', shards);
      got_ := town.mine_add(got_, town.cat('forge')->'gems'->(p_go->>'element')->>'chip', ceil((m->'crystal'->>'chips')::double precision * by_));
    end if;
    each_ := each_ || jsonb_build_array(jsonb_build_object('rock', (b->'rock'->>0)::integer, 'kind', h->>'kind', 'shards', shards));
  end loop;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;

  -- what it costs: a point a go, by `pkFresh`'s count and `pick.gems.earth.stamina` (a share kept exact over time)
  after_ := stowed;
  fresh_ := case when opts ? 'pkFresh' then town.use_power(after_, pick, 'pkFresh', now_) end;
  if fresh_ is not null and (fresh_->>'ok')::boolean then
    after_ := fresh_->'purse';
  else
    had_ := town.stamina_of(after_, now_);
    eased_ := town.eased(after_, town.spend(after_, (m->>'stamina')::double precision, now_), now_,
      1::double precision - town.gem_by(pick, 'earth', m->'pick'->'gems'->'earth'->'stamina'), owed);
    cost := had_ - town.stamina_of(eased_->'purse', now_);
    after_ := eased_->'purse';
    owed := (eased_->>'owed')::double precision;
  end if;
  if p_quake then
    used := town.use_power(after_, pick, 'pkQuake', now_);
    if (used->>'ok')::boolean then after_ := used->'purse'; end if;
  end if;
  if holds->>'kind' = 'vein' then
    -- the vein is the member's from here: played with the pick as it is now, and with the stamina left after the rock
    vein_ := jsonb_build_object('f', floor_, 'rock', rock_, 'turn', turn_, 'seed', holds->'seed',
      'gem', case when (holds->>'gem')::boolean then p_go->'element' else 'null'::jsonb end,
      'mods', town.vein_mods(pick, town.stamina_of(after_, now_) <= 0),
      'more', case when (holds->>'gem')::boolean and opts ? 'pkCutter' then town.opt_n('pkCutter', 'more') else 0 end);
    had_ := town.stamina_of(after_, now_);
    after_ := town.spend(after_, (m->'vein'->>'stamina')::double precision, now_);
    cost := cost + (had_ - town.stamina_of(after_, now_));
  end if;

  -- what is loosened: the rocks that touch one that broke, and still stand
  gone := (select jsonb_agg((x.v->'rock'->>0)::integer order by x.ord) from jsonb_array_elements(breaks) with ordinality x(v, ord));
  loose := coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(case when kept->'loose'->>'k' = key_ then kept->'loose'->'ids' else '[]'::jsonb end) with ordinality i(v, ord)
                      where not exists (select 1 from jsonb_array_elements(gone) g(v) where g.v = i.v)), '[]'::jsonb);
  if opts ? 'pkLoose' then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(gone || loose) g(v) where (g.v #>> '{}')::numeric = (r->>0)::numeric)
        or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not exists (select 1 from jsonb_array_elements(breaks) q(v)
                        where town.mine_near((q.v->'rock'->>1)::numeric, (q.v->'rock'->>2)::numeric, (r->>1)::integer, (r->>2)::integer, touch));
      loose := loose || jsonb_build_array((r->>0)::integer);
    end loop;
    loose := coalesce((select jsonb_agg(i.v order by (i.v #>> '{}')::numeric) from jsonb_array_elements(loose) i(v)), '[]'::jsonb);
  end if;
  -- (broken for them by somebody else: their page is to say so once, with what it left and who it was)
  paid := case when p_own then kept->'paid' else jsonb_build_object('at', now_, 'f', floor_, 'rock', rock_, 'got', got_, 'way', way_ is not null, 'crystal', shattered,
    'vein', vein_ <> 'null'::jsonb, 'by', coalesce(p_go->>'name', '')) end;
  after_ := after_ || jsonb_build_object('mine', kept || jsonb_build_object('owed', owed, 'crumb', crumb, 'loose', jsonb_build_object('k', key_, 'ids', loose), 'vein', vein_,
    'last', case when p_own then to_jsonb(now_) else kept->'last' end, 'paid', paid));
  return jsonb_build_object('ok', true, 'done', true, 'purse', after_, 'struck', p_struck, 'broke', gone, 'chained', chained, 'got', got_, 'way', way_, 'vein', vein_,
    'crystal', shattered, 'loose', loose, 'cost', cost, 'spent', spent, 'each', each_, 'moss', moss);
end;
$$;

-- mine: a rock struck: the swings made since the page last said go into it, as the striker's own share of it. It
-- still stands (`done` false: the tally is to be kept, and the purse only remembers the moment); or it is struck
-- whole away and the striker struck it first (`done` true: it breaks, and their purse has what it left); or it is
-- struck whole away and somebody else struck it first (`done` "theirs": it is that member's to be paid for, with
-- their purse, `town.mine_pay_first`). The refusals are the code's, in the code's order.
create or replace function town.mine(p_purse jsonb, p_go jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_go->>'rock')::integer;
  who text := coalesce(p_go->>'who', '');
  pick jsonb := town.mine_pick(p_purse);
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  swings double precision := case when jsonb_typeof(p_go->'swings') = 'number' then (p_go->>'swings')::double precision end;
  last_ double precision := (kept->>'last')::double precision;
  r jsonb;
  had jsonb;
  own boolean;
  spent boolean;
  quake boolean;
  need double precision;
  left_ double precision;
  counted double precision;
  share double precision;
  struck jsonb;
  swung jsonb;
begin
  if pick is null then return town.no('tool'); end if;
  if kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;
  r := town.mine_rock(p_go->'rocks', rock_);
  if r is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', rock_, now_, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  if jsonb_typeof(p_go->'at') is distinct from 'array'
     or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, (m->>'reach')::double precision) then return town.no('far'); end if;
  if town.mine_holds(p_word, floor_, rock_, turn_, p_go->'today', pick)->>'kind' = 'crystal' and town.tool_level(pick) < (m->'crystal'->>'plus')::integer then return town.no('weak'); end if;
  -- (`pkQuake` is for a rock nobody else has begun: on somebody else's rock the pick swings as any other)
  had := town.cave_struck_at(p_go->'cave', rock_, now_);
  own := had is null or had->>'first' = who;
  spent := town.stamina_of(p_purse, now_) <= 0;
  quake := coalesce((p_go->>'quake')::boolean, false) and own;
  if quake and not town.may_power(p_purse, pick, 'pkQuake', now_) then return town.no('spent'); end if;
  if swings is null or swings < 1 then return town.no('more'); end if;
  -- the swings that count: no more than what is left of the rock takes of this pick, and none quicker than a hand swings
  need := case when quake then 1 else town.mine_swings(pick, floor_, spent, town.mine_is_loose(p_purse, floor_, turn_, rock_), coalesce((p_go->>'points')::double precision, 0)) end;
  left_ := greatest(0::double precision, 1::double precision - town.mine_part(had));
  counted := least(floor(swings), ceil(left_ * need - 1e-6::double precision));
  if now_ >= last_ and now_ - last_ < counted * (m->'swing'->>'least')::double precision then return town.no('soon'); end if;
  share := least(left_, counted / need);
  struck := jsonb_build_object('first', coalesce(had->>'first', who), 'name', case when had is not null then had->>'name' else coalesce(p_go->>'name', '') end,
    'at', case when had is not null then had->'at' else to_jsonb(now_) end,
    'by', coalesce(had->'by', '{}'::jsonb) || case when share > 0 then jsonb_build_object(who, coalesce((had->'by'->>who)::double precision, 0) + share) else '{}'::jsonb end);
  swung := p_purse || jsonb_build_object('mine', kept || jsonb_build_object('last', now_));
  if town.mine_part(struck) < 1::double precision - 1e-6::double precision then
    return jsonb_build_object('ok', true, 'done', false, 'purse', swung, 'struck', struck, 'part', town.mine_part(struck));
  end if;
  if struck->>'first' <> who then return jsonb_build_object('ok', true, 'done', 'theirs', 'purse', swung, 'struck', struck); end if;
  return town.mine_pay(p_purse, p_go, r, struck, quake, true, p_word);
end;
$$;

-- payFirst: a rock that somebody else struck the last of away, paid to whoever struck it first as if they had
-- broken it: with their purse, wherever they stand and whatever they hold now. `p_go` is the go that broke it; its
-- `name` is who broke it. Refused with nothing changed when there is no room for what it leaves, or it hides a vein
-- and they have one open already: the rock then waits for them, whole.
create or replace function town.mine_pay_first(p_purse jsonb, p_go jsonb, p_struck jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  r jsonb := town.mine_rock(p_go->'rocks', (p_go->>'rock')::integer);
begin
  if r is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', (r->>0)::integer, (p_go->>'now')::bigint, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  return town.mine_pay(p_purse, p_go, r, p_struck, false, false, p_word);
end;
$$;

-- A look at a rock, for a pick that has `pkPeek` (as the code's keeper answers a peek).
create or replace function town.mine_look(p_purse jsonb, p_go jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  pick jsonb := town.mine_pick(p_purse);
  now_ bigint := (p_go->>'now')::bigint;
  rock_ integer := (p_go->>'rock')::integer;
begin
  if pick is null or not town.tool_has(pick, 'pkPeek') then return town.no('tool'); end if;
  if town.mine_rock(p_go->'rocks', rock_) is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', rock_, now_, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  return jsonb_build_object('ok', true, 'peek', town.mine_peek(town.mine_holds(p_word, (p_go->>'floor')::integer, rock_, town.mine_turn(now_), p_go->'today', pick)));
end;
$$;

-- openWay: a floor's way down opened: it stays so for the day. (The deepest floor reached is read off the rows.)
create or replace function town.cave_open_way(p_cave jsonb, p_floor integer, p_way jsonb)
returns jsonb language sql stable
as $$
  select case when coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb or p_floor < 1 or p_floor >= (town.cat('mining')->>'floors')::integer then p_cave
    else p_cave || jsonb_build_object('way', p_way) end
$$;

-- crystalBroken: the day's crystal rock broken, by whom.
create or replace function town.cave_crystal_broken(p_cave jsonb, p_who jsonb)
returns jsonb language sql immutable
as $$ select case when coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb then p_cave else p_cave || jsonb_build_object('crystal', p_who) end $$;

-- A light set on a tile, among some lights: it burns from now, so long. One to a tile: a new one there burns anew.
create or replace function town.cave_light(p_lights jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint, p_for numeric)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(t.v order by t.ord) from jsonb_array_elements(coalesce(p_lights, '[]'::jsonb)) with ordinality t(v, ord)
     where (t.v->>'until')::numeric > p_now and not ((t.v->>'f')::numeric = p_floor and (t.v->>'x')::numeric = p_x and (t.v->>'y')::numeric = p_y)), '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('f', p_floor, 'x', p_x, 'y', p_y, 'until', p_now + p_for, 'by', p_by))
$$;

-- setTorch, setMoss: a torch set down, and moss let out of a rock that stood on a tile: for everybody.
create or replace function town.cave_set_torch(p_cave jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint)
returns jsonb language sql stable
as $$ select p_cave || jsonb_build_object('torches', town.cave_light(p_cave->'torches', p_floor, p_x, p_y, p_by, p_now, (town.cat('mining')->'light'->>'burns')::numeric)) $$;

create or replace function town.cave_set_moss(p_cave jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint)
returns jsonb language sql stable
as $$ select p_cave || jsonb_build_object('moss', town.cave_light(p_cave->'moss', p_floor, p_x, p_y, p_by, p_now, (town.cat('mining')->'moss'->>'glows')::numeric)) $$;

-- ─── 9. The lift, a torch, and a floor broken through (lib/town/mining) ──

-- reachRest: a resting floor reached is one of the lift's stops for the member from then on. (A purse that gains
-- nothing by it is given back as it was.)
create or replace function town.mine_reach_rest(p_purse jsonb, p_floor integer)
returns jsonb language sql stable
as $$
  select case when p_floor is null or not town.cave_is_rest(p_floor) or p_floor > (town.cat('mining')->>'floors')::integer or k.v->'rests' @> to_jsonb(p_floor) then p_purse
    else p_purse || jsonb_build_object('mine', k.v || jsonb_build_object('rests',
      (select jsonb_agg(r.n order by r.n) from (select (i.v #>> '{}')::numeric as n from jsonb_array_elements(k.v->'rests') i(v) union select p_floor::numeric) r))) end
    from (select town.mine_of(p_purse) as v) k
$$;

-- liftStops, mayRide: where the lift takes somebody: the cave's mouth (0) always, and the resting floors they have
-- reached.
create or replace function town.mine_lift_stops(p_purse jsonb)
returns jsonb language sql stable
as $$ select '[0]'::jsonb || (town.mine_of(p_purse)->'rests') $$;

create or replace function town.mine_may_ride(p_purse jsonb, p_to integer)
returns boolean language sql stable
as $$ select coalesce(town.mine_lift_stops(p_purse) @> to_jsonb(p_to), false) $$;

-- torchDown: a torch set down from the hand: one fewer in the bag. (Where it stands and how long it burns is the
-- place's own document.)
create or replace function town.mine_torch_down(p_purse jsonb)
returns jsonb language sql stable
as $$
  select case when town.hand_of(p_purse) is distinct from k.id or town.held(p_purse->'bag', k.id) < 1 then town.no('tool')
    else jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', k.id, 1))) end
    from (select town.cat('mining')->>'torch' as id) k
$$;

-- drill: the way down opened oneself: `pkDrill`, counted, of the pick in the hand, on a floor whose
-- way is not open yet.
create or replace function town.mine_drill(p_purse jsonb, p_floor integer, p_open boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  pick jsonb := town.mine_pick(p_purse);
  used jsonb;
begin
  if pick is null or not town.tool_has(pick, 'pkDrill') then return town.no('tool'); end if;
  if not town.mine_is_dug(p_floor) or not town.mine_has_below(p_floor) then return town.no('none'); end if;
  if p_open then return town.no('open'); end if;
  used := town.use_power(p_purse, pick, 'pkDrill', p_now);
  if (used->>'ok')::boolean then return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', used->'left'); end if;
  return town.no('spent');
end;
$$;

-- The nearest free tile beside a tile of a floor, where a way broken through opens: floor with nothing on it, and
-- not where one comes down (the ladder, or the tile one arrives on). The four sides first, then the corners, in the
-- code's own order (lib/town/trial's drillDo). Null where there is none.
create or replace function town.cave_beside(p_layout jsonb, p_floor integer, p_x integer, p_y integer)
returns jsonb language sql stable
as $$
  select jsonb_build_array(p_x + d.dx, p_y + d.dy)
    from (values (1, 1, 0), (2, 0, 1), (3, -1, 0), (4, 0, -1), (5, 1, 1), (6, -1, 1), (7, 1, -1), (8, -1, -1)) d(ord, dx, dy)
   where town.cave_floor_tile(p_layout, p_floor, p_x + d.dx, p_y + d.dy)
     and p_layout->'up' is distinct from jsonb_build_array(p_x + d.dx, p_y + d.dy) and p_layout->'arrive' is distinct from jsonb_build_array(p_x + d.dx, p_y + d.dy)
   order by d.ord limit 1
$$;

-- ─── 10. A vein played out, by what its page says of the go (lib/town/vein-account) ─────────────────────────────
--
-- The database does not lay a vein's face out: the face comes of its seed by a generator that tries many times and
-- searches a way through each try, and that is not written twice. The page has the face. It says what the go came
-- to (`p_go`, lib/town/vein-account's VeinAccount):
--     seed, again   the vein it is a go at (the seed of its face; whether this is its second go)
--     strikes       the strikes as they were made, [[x, y], …]: cells of the face, sixty-four at the most
--     struck        how many of them counted
--     of            how many cells of the face glint
--     ore           how many glinting cells of ore the crack passed
--     gems          what each gem's cell it passed gives, in fragments: [n, …]
-- and is believed within what holds of EVERY face (`town.vein_odd`). What is the database's own and never the
-- page's: that there is a vein, whether it is a gem's and of which element, the strikes a go has and what a knot
-- gives back, and the vein's `more` (all in the purse's `mine.vein`, written when the rock broke).

-- Whether something said is a whole number, none or more.
create or replace function town.vein_whole(p_v jsonb)
returns boolean language sql immutable
as $$ select case when jsonb_typeof(p_v) = 'number' then (p_v #>> '{}')::numeric >= 0 and (p_v #>> '{}')::numeric = floor((p_v #>> '{}')::numeric) else false end $$;

-- oddOf: whether an account says something no face of that vein could have come to, and what (null: it is within
-- the rules). A face has so many glinting cells, least to most; a go has the vein's strikes and so many given back
-- at the most, and no more count than were made; a strike lengthens the crack by `reach` cells at the most, one that
-- a knot stopped (the only kind given back) by one fewer, and the crack passes no more glinting cells than it has
-- run through; only a gem's vein has gem's cells, one at least and so many at the most, each of so many fragments.
create or replace function town.vein_odd(p_vein jsonb, p_go jsonb)
returns text language plpgsql stable
as $$
declare
  v jsonb := town.cat('mining')->'vein';
  side numeric := (v->>'size')::numeric;
  reach numeric := (v->>'reach')::numeric;
  own numeric := greatest(1, (p_vein->'mods'->>'strikes')::numeric);
  back_ numeric := greatest(0, (p_vein->'mods'->>'back')::numeric);
  gem_ boolean := coalesce(p_vein->'gem', 'null'::jsonb) <> 'null'::jsonb;
  struck numeric;
  of_ numeric;
  ore numeric;
  cut integer;
begin
  if p_go is null or not town.vein_whole(p_go->'struck') or not town.vein_whole(p_go->'of') or not town.vein_whole(p_go->'ore') or jsonb_typeof(p_go->'gems') is distinct from 'array' then return 'shape'; end if;
  if exists (select 1 from jsonb_array_elements(p_go->'gems') g(n) where not town.vein_whole(g.n)) then return 'shape'; end if;
  if jsonb_typeof(p_go->'strikes') is distinct from 'array' then return 'strikes'; end if;
  if jsonb_array_length(p_go->'strikes') > 64 or exists (select 1 from jsonb_array_elements(p_go->'strikes') s(c)
       where not case when jsonb_typeof(s.c) = 'array' then
                   case when jsonb_array_length(s.c) = 2 and town.vein_whole(s.c->0) and town.vein_whole(s.c->1) then (s.c->>0)::numeric < side and (s.c->>1)::numeric < side else false end
                 else false end) then return 'strikes'; end if;
  struck := (p_go->>'struck')::numeric;
  of_ := (p_go->>'of')::numeric;
  ore := (p_go->>'ore')::numeric;
  cut := jsonb_array_length(p_go->'gems');
  if of_ < (v->'points'->>0)::numeric or of_ > (v->'points'->>1)::numeric then return 'of'; end if;
  if struck > jsonb_array_length(p_go->'strikes') or struck > own + back_ then return 'struck'; end if;
  if gem_ then
    if cut > (v->'gem'->'points'->>1)::integer or exists (select 1 from jsonb_array_elements_text(p_go->'gems') g(n) where g.n::numeric < (v->'gem'->'chips'->>0)::numeric or g.n::numeric > (v->'gem'->'chips'->>1)::numeric) then return 'gems'; end if;
  elsif cut > 0 then
    return 'gems';
  end if;
  if ore + cut > of_ or (gem_ and ore > of_ - greatest(1, cut)) then return 'passed'; end if;
  if ore + cut > reach * least(struck, own) + (reach - 1) * greatest(0, struck - own) then return 'far'; end if;
  return null;
end;
$$;

-- veinFrom (lib/town/mining's veinEnd, with the account in the face's place): a vein played out. Refused with
-- nothing changed when no vein is open or the account is of another vein than the one that is (`none`), or there is
-- no room for what it gives (`full`: the vein then waits). An account that no face could have come to (`odd`, with
-- what was odd in it) gives nothing and closes the vein: the purse given back with the refusal is the one to keep.
create or replace function town.vein_end(p_purse jsonb, p_go jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;
  -- `pkTwin`, counted, of the pick now in the hand: the vein is kept, as its second go
  pick := town.mine_pick(stowed);
  twin := case when not twice and pick is not null then town.use_power(stowed, pick, 'pkTwin', p_now) end;
  after_ := case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else stowed end;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', coalesce((twin->>'ok')::boolean, false), 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      case when coalesce((twin->>'ok')::boolean, false) then vein_ || '{"again": true}'::jsonb else 'null'::jsonb end)));
end;
$$;

-- A member's name, as the others are told it: who they are, of somebody with no name at all (as the code's keeper says).
create or replace function town.mine_name(p_member uuid)
returns text language sql stable set search_path = public
as $$
  select coalesce(nullif((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_member), ''), p_member::text)
$$;

-- Whoever a tally names, as a member to be paid or written down: null for what is no member's id (a tally is only
-- ever written by this file, so it is one; a member gone from the roster since is passed over, never an error).
create or replace function town.mine_member(p_id text)
returns uuid language plpgsql stable set search_path = public
as $$
begin
  if p_id is null or p_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return case when town.is_member(p_id::uuid) then p_id::uuid end;
end;
$$;

-- Whether a tile is one a member may be believed to stand on, to strike a rock of a place from. The place of a rock
-- only once that rock stands no longer; otherwise, in the cave, floor with nothing standing on it by the day's
-- layout; and on the mountain's foot, of which the database knows only where the rocks stand, any tile that is no
-- floor of the cave's. (How near the rock it has to be is the rule's own: a king's move.)
create or replace function town.mine_stood(p_floor integer, p_x integer, p_y integer, p_layout jsonb, p_rocks jsonb, p_cave jsonb, p_now bigint, p_crystal integer)
returns boolean language sql stable
as $$
  select case when p_x is null or p_y is null or p_floor is null then false
    when r.id is not null then not town.cave_stands(p_cave, r.id, p_now, p_crystal)
    when p_floor = 0 then town.cave_floor_at(p_x, p_y) = 0
    else town.cave_floor_tile(p_layout, p_floor, p_x, p_y) end
    from (select 1) one left join lateral
      (select (x.v->>0)::integer as id from jsonb_array_elements(case when jsonb_typeof(p_rocks) = 'array' then p_rocks else '[]'::jsonb end) with ordinality x(v, ord)
        where (x.v->>1)::integer = p_x and (x.v->>2)::integer = p_y order by x.ord limit 1) r on true
$$;

-- A go, put together for the rules from what is kept and what the page says (this file's section 8 says what one
-- is). `p_place`: the place the page says, or null for one that is none (then there is no rock to strike, and the
-- rule says so in its own turn). `p_cave`: the place's document as it is now. The tile is told to the rules only
-- when it can be believed; the swings, only when they are a number.
create or replace function town.mine_go(p_member uuid, p_place integer, p_rock integer, p_x integer, p_y integer, p_swings double precision, p_quake boolean, p_cave jsonb, p_now bigint)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  m jsonb := town.cat('mining');
  word_ text := town.mine_word();
  day_ integer := town.day_of(p_now);
  f integer := coalesce(p_place, 0);
  laid_ jsonb := case when p_place > 0 then town.cave_laid(day_, p_place) end;
  rocks_ jsonb := case when p_place = 0 then m->'rocks' when p_place > 0 then coalesce(laid_->'rocks', '[]'::jsonb) else '[]'::jsonb end;
  c jsonb := town.mine_crystal(day_);
  crock integer := case when p_place > 0 and (c->>'floor')::integer = p_place then (c->>'rock')::integer end;
begin
  return jsonb_build_object('now', p_now, 'floor', f, 'rock', p_rock,
    'at', case when p_place is not null and town.mine_stood(p_place, p_x, p_y, laid_, rocks_, p_cave, p_now, crock) then jsonb_build_array(p_x, p_y) else 'null'::jsonb end,
    'swings', case when p_swings is null or p_swings = 'NaN'::double precision or abs(p_swings) = 'Infinity'::double precision then 'null'::jsonb else to_jsonb(p_swings) end,
    'who', p_member::text, 'name', town.mine_name(p_member), 'rocks', rocks_, 'cave', p_cave, 'crystal', crock, 'day', day_,
    'today', town.mine_today(word_, f, day_, rocks_, p_cave, crock), 'element', town.mine_element(word_, f, day_),
    'points', coalesce((town.work_told(p_member, p_now)->'mining'->>'points')::double precision, 0), 'quake', coalesce(p_quake, false));
end;
$$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (empty places: build-v164.mjs puts each function here as the database has it, with the lines of
-- v164.mining.lines.mjs in place. Left empty in this file on purpose: a pasted copy would undo whatever a file that
-- runs before v164, or another part of it, wrote into the same function.)

-- <town.work_counts_of>
-- </town.work_counts_of>

-- <town.deed_th>
-- </town.deed_th>

-- ─── What a member calls ─────────────────────────────────────────────────

-- What I am told of the mountain's rocks and the cave, on the floor (0: the mountain's foot) and the tile I say I
-- am on: what glints for me and the crystal rock are told by where I stand. Nothing is held and nothing changes.
create or replace function public.town_cave(p_floor integer default 0, p_x integer default null, p_y integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  return town.answer(me, jsonb_build_object('ok', true, 'cave', town.cave_told(me, town.purse_of(me, false), p_floor, p_x, p_y, now_)));
end;
$$;

-- Strike a rock of a place (0: the mountain's foot) from the tile I stand on, with the swings I have made since I
-- last said. They add up with anybody's, and the rock breaks when it is struck whole away: what it leaves is for
-- whoever struck it first, I or another, and whoever else struck some of it away is written down as having lent a
-- hand. The place is held first (of two who strike one rock at one moment the second waits, and then sees the
-- first's swings in it); then my purse and, where somebody else struck the rock first, theirs, the lesser id first.
-- Every answer tells the cave as it is then, for the floor and the tile said.
create or replace function public.town_mine(p_floor integer, p_rock integer, p_x integer, p_y integer, p_swings double precision, p_how text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  m jsonb := town.cat('mining');
  word_ text := town.mine_word();
  place_ integer := case when p_floor between 0 and (m->>'floors')::integer then p_floor end;
  quake boolean := coalesce(p_how = 'quake', false);
  -- (the swings as the page said them, for the record: what the rule counted of them is the rule's own)
  said numeric := case when p_swings is null or p_swings = 'NaN'::double precision then 0 else least(greatest(floor(p_swings::numeric), 0), 1000) end;
  cave_ jsonb;
  had jsonb;
  first_ uuid;
  first_id text;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  did jsonb;
  paid jsonb;
  next_ jsonb;
  whose jsonb;
  nothing jsonb := jsonb_build_object('ok', true, 'got', '[]'::jsonb, 'broke', '[]'::jsonb, 'way', false, 'vein', null, 'crystal', false, 'chained', null, 'cost', 0);
  helpers jsonb;
  r jsonb;
  e jsonb;
  id_ text;
  doc_ jsonb;
  ore_ text;
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  -- the village's row first, then the purses by their ids
  cave_ := town.cave_at(case when place_ is not null then town.cave_kept(place_, true) end, now_);
  had := case when p_rock is not null then town.cave_struck_at(cave_, p_rock, now_) end;
  first_ := case when had->>'first' <> me::text then town.mine_member(had->>'first') end;
  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;
  purse := town.purse_of(me, true);
  if first_ is not null and first_ > me then theirs := town.purse_of(first_, true); end if;

  go_ := town.mine_go(me, place_, p_rock, p_x, p_y, p_swings, quake, cave_, now_);
  did := town.mine(purse, go_, word_);
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('cave', town.cave_told(me, purse, place_, p_x, p_y, now_)));
  end if;
  first_id := did->'struck'->>'first';
  whose := case when first_id = me::text then 'null'::jsonb else to_jsonb(coalesce(nullif(did->'struck'->>'name', ''), first_id)) end;

  if did->'done' = 'false'::jsonb then
    -- my swings went into it, and it still stands
    perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
    perform town.keep_purse(me, did->'purse');
    return town.answer(me, nothing || jsonb_build_object('part', did->'part', 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
  end if;
  if did->>'done' = 'theirs' then
    -- somebody else struck it first: it is they who are paid, as if they had broken it
    paid := case when theirs is not null then town.mine_pay_first(theirs, go_, did->'struck', word_) end;
    if paid is null or not (paid->>'ok')::boolean then
      -- (they cannot take what it leaves just now: it waits for them, struck whole away, with my swings in it)
      perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
      perform town.keep_purse(me, did->'purse');
      return town.answer(me, nothing || jsonb_build_object('part', 1, 'waits', true, 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
    end if;
    perform town.keep_purse(first_, paid->'purse');
  else
    paid := did;
    first_ := me;
  end if;

  -- what the village shares of the place, after it: the rocks gone, the way down open, the crystal broken, moss let out
  next_ := town.cave_break(cave_, paid->'broke', now_);
  if paid->'way' <> 'null'::jsonb then
    r := town.mine_rock(go_->'rocks', (paid->>'way')::integer);
    next_ := town.cave_open_way(next_, place_, jsonb_build_object('rock', r->0, 'x', r->1, 'y', r->2, 'by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  if (paid->>'crystal')::boolean then
    next_ := town.cave_crystal_broken(next_, jsonb_build_object('by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  for id_ in select i.v from jsonb_array_elements_text(paid->'moss') with ordinality i(v, ord) order by i.ord loop
    r := town.mine_rock(go_->'rocks', id_::integer);
    if r is not null and place_ > 0 then next_ := town.cave_set_moss(next_, place_, (r->>1)::integer, (r->>2)::integer, first_id, now_); end if;
  end loop;
  perform town.keep_cave(place_, next_);
  perform town.keep_purse(me, did->'purse');

  -- written down: each rock that broke, in the name of whoever it was paid to; the way down found; and a hand lent,
  -- in the name of each who lent one
  helpers := town.mine_helpers(did->'struck');
  ore_ := town.mine_ore(place_);
  for e in select x.v from jsonb_array_elements(paid->'each') with ordinality x(v, ord) order by x.ord loop
    doc_ := jsonb_build_object('floor', place_, 'rock', e->'rock', 'swings', said, 'hand', 'pick', 'tile', jsonb_build_array(p_x, p_y))
      || case when (paid->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || case when e->'rock' = paid->'chained' then '{"chained": true}'::jsonb else '{}'::jsonb end
      || case when quake then '{"how": "quake"}'::jsonb else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and first_ <> me then jsonb_build_object('by', me) else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and jsonb_array_length(helpers) > 0 then jsonb_build_object('with', helpers) else '{}'::jsonb end;
    if e->>'kind' = 'crystal' then
      perform town.note(first_, 'crystal', 'stone', 1, 0, doc_ || jsonb_build_object('got', m->'ores'->-1->'shard', 'chip', town.cat('forge')->'gems'->(go_->>'element')->'chip'));
    else
      perform town.note(first_, 'mine', 'stone', 1, 0, doc_
        || case when (e->>'shards')::numeric > 0 then jsonb_build_object('got', ore_, 'shards', e->'shards') else '{}'::jsonb end
        || case when e->>'kind' = 'vein' then '{"vein": true}'::jsonb else '{}'::jsonb end
        || case when paid->'moss' @> jsonb_build_array(e->'rock') then '{"moss": true}'::jsonb else '{}'::jsonb end);
    end if;
  end loop;
  if paid->'way' <> 'null'::jsonb then perform town.note(first_, 'delve', null, 1, 0, jsonb_build_object('floor', place_, 'rock', paid->'way')); end if;
  for id_ in select h.v from jsonb_array_elements_text(helpers) with ordinality h(v, ord) order by h.ord loop
    if town.mine_member(id_) is not null then
      perform town.note(id_::uuid, 'hew', 'stone', 1, 0, jsonb_build_object('floor', place_, 'rock', p_rock, 'whose', first_));
    end if;
  end loop;

  return town.answer(me, case when first_ = me
      then jsonb_build_object('ok', true, 'got', paid->'got', 'broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'vein', paid->'vein', 'crystal', paid->'crystal',
        'chained', paid->'chained', 'cost', paid->'cost', 'part', 1, 'moss', jsonb_array_length(paid->'moss') > 0)
      else nothing || jsonb_build_object('broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'crystal', paid->'crystal', 'chained', paid->'chained',
        'part', 1, 'helped', true, 'whose', whose, 'paid', first_, 'moss', jsonb_array_length(paid->'moss') > 0) end
    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- A look at a rock, with a pick that has `pkPeek`: stone, fragments, or a vein. Nothing is held and nothing changes.
create or replace function public.town_mine_peek(p_floor integer, p_rock integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  place_ integer := case when p_floor between 0 and (town.cat('mining')->>'floors')::integer then p_floor end;
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  return town.answer(me, town.mine_look(town.purse_of(me, false),
    town.mine_go(me, place_, p_rock, null, null, null, false, town.cave_at(case when place_ is not null then town.cave_kept(place_, false) end, now_), now_), town.mine_word()));
end;
$$;

-- I have come to a floor: a resting floor, come to while the way down to it is open today, is one of my lift's stops
-- from then on. The floor is the page's word (the database does not know where anybody is): it counts for nothing
-- but a resting floor whose way is open. It reads no floor's layout, so a day not laid is nothing to it. Only my
-- purse is held; the floor above is read, not held.
create or replace function public.town_cave_reach(p_floor integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  reached boolean := false;
begin
  if town.cave_is_rest(p_floor) and p_floor <= (town.cat('mining')->>'floors')::integer and not town.mine_of(purse)->'rests' @> to_jsonb(p_floor)
     and town.cave_way_open(town.cave_at(town.cave_kept(p_floor - 1, false), now_), p_floor - 1) then
    purse := town.mine_reach_rest(purse, p_floor);
    perform town.keep_purse(me, purse);
    reached := true;
  end if;
  return town.answer(me, jsonb_build_object('ok', true, 'reached', reached, 'caveMine', town.cave_own(purse, now_)));
end;
$$;

-- Ride the lift to the mouth (0) or to a resting floor I have reached: where I come out, in the world's tiles (null:
-- before the mouth). Where it is taken from is not asked, as the code does not. Nothing is held; the ride is
-- written down.
create or replace function public.town_lift(p_to integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if not town.mine_may_ride(town.purse_of(me, false), p_to) then return town.answer(me, town.no('none')); end if;
  perform town.note(me, 'lift', null, p_to, 0, '{}'::jsonb);
  return town.answer(me, jsonb_build_object('ok', true, 'at', case when p_to = 0 then null else town.cave_laid(town.day_of(now_), p_to)->'liftAt' end));
end;
$$;

-- Set the torch in my hand down on the tile I stand on: it lights that floor for everybody, for as long as a torch
-- burns. The tile has to be floor of the cave with nothing on it, by the day's layout. The floor's row is held, then
-- my purse.
create or replace function public.town_torch(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  day_ integer := town.day_of(now_);
  place_ integer := town.cave_floor_at(p_x, p_y);
  cave_ jsonb;
  purse jsonb;
  did jsonb;
begin
  if not town.cave_is_laid(day_) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if place_ = 0 or not town.cave_floor_tile(town.cave_laid(day_, place_), place_, p_x, p_y) then return town.answer(me, town.no('here')); end if;
  cave_ := town.cave_at(town.cave_kept(place_, true), now_);
  purse := town.purse_of(me, true);
  did := town.mine_torch_down(purse);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_cave(place_, town.cave_set_torch(cave_, place_, p_x, p_y, me::text, now_));
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'torch', town.cat('mining')->>'torch', 1, 0, jsonb_build_object('floor', place_, 'tile', jsonb_build_array(p_x, p_y)));
  return town.answer(me, jsonb_build_object('ok', true, 'until', now_ + (town.cat('mining')->'light'->>'burns')::bigint, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- The way down opened beside the tile I stand on (`pkDrill`, counted, of the pick in the hand): it opens there, for
-- everybody, for the day. The tile I say I stand on has to be one that could be stood on (the code asks only which
-- floor it is of: the database asks this more), and there has to be a free tile beside it. The floor's row is held,
-- then my purse.
create or replace function public.town_drill(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  day_ integer := town.day_of(now_);
  place_ integer := town.cave_floor_at(p_x, p_y);
  laid_ jsonb;
  cave_ jsonb;
  c jsonb;
  free_ jsonb;
  purse jsonb;
  did jsonb;
begin
  if not town.cave_is_laid(day_) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if place_ = 0 then return town.answer(me, town.no('none')); end if;
  laid_ := town.cave_laid(day_, place_);
  cave_ := town.cave_at(town.cave_kept(place_, true), now_);
  purse := town.purse_of(me, true);
  c := town.mine_crystal(day_);
  free_ := town.cave_beside(laid_, place_, p_x, p_y);
  if free_ is null or not town.mine_stood(place_, p_x, p_y, laid_, laid_->'rocks', cave_, now_, case when (c->>'floor')::integer = place_ then (c->>'rock')::integer end) then
    return town.answer(me, town.no('here'));
  end if;
  did := town.mine_drill(purse, place_, town.cave_way_open(cave_, place_), now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_cave(place_, town.cave_open_way(cave_, place_, jsonb_build_object('rock', null, 'x', free_->0, 'y', free_->1, 'by', me::text, 'name', town.mine_name(me), 'at', now_)));
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'delve', null, 1, 0, jsonb_build_object('floor', place_, 'how', 'drill', 'tile', free_));
  return town.answer(me, jsonb_build_object('ok', true, 'at', free_, 'left', did->'left', 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- The vein I opened, played out: what my page says the go came to (section 10 says what an account is, and how far
-- it is believed). It reads no floor. Only my purse is held. The go is written down with the whole of what was
-- said and what it was played with (`said`: the cells of ore and of the gem that were claimed, the seed of the
-- face, the strikes the go had), so that a go can be played again on its face afterwards and held to its account.
-- An account no face could have come to pays nothing, closes the vein, and is written down apart (`vein_odd`).
create or replace function public.town_vein(p_go jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  -- (what is no account, or too long to be one, is none)
  said jsonb := town.claims(p_go);
  did jsonb := town.vein_end(purse, said, now_);
  vein_ jsonb := town.mine_of(purse)->'vein';
  ore_ text;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    ore_ := town.mine_ore((vein_->>'f')::integer);
    perform town.note(me, 'vein', case when exists (select 1 from jsonb_array_elements(did->'got') g(v) where g.v->>0 = ore_) then ore_ end, (did->>'passed')::numeric, 0,
      jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'strikes', said->'strikes', 'struck', did->'struck', 'passed', did->'passed', 'of', did->'of')
      || case when (vein_->'mods'->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || coalesce((select jsonb_build_object('chip', g.v->0) from jsonb_array_elements(did->'got') with ordinality g(v, ord) where g.v->>0 <> ore_ order by g.ord limit 1), '{}'::jsonb)
      || case when vein_->'gem' <> 'null'::jsonb then jsonb_build_object('gem', vein_->'gem') else '{}'::jsonb end
      || case when coalesce((vein_->>'again')::boolean, false) then '{"again": true}'::jsonb else '{}'::jsonb end
      || jsonb_build_object('said', jsonb_build_object('ore', said->'ore', 'gems', said->'gems', 'seed', vein_->'seed', 'mods', vein_->'mods', 'more', vein_->'more')));
    return town.answer(me, jsonb_build_object('ok', true, 'got', did->'got', 'passed', did->'passed', 'of', did->'of', 'again', did->'again', 'caveMine', town.cave_own(did->'purse', now_)));
  end if;
  if did->>'why' = 'odd' then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'vein_odd', null, 0, 0, jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'how', did->'how', 'said', said,
      'seed', vein_->'seed', 'gem', vein_->'gem', 'mods', vein_->'mods', 'more', vein_->'more'));
    return town.answer(me, town.no('odd') || jsonb_build_object('caveMine', town.cave_own(did->'purse', now_)));
  end if;
  return town.answer(me, did || jsonb_build_object('caveMine', town.cave_own(purse, now_)));
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_cave(integer, integer, integer) from public, anon;
grant execute on function public.town_cave(integer, integer, integer) to authenticated;
revoke execute on function public.town_mine(integer, integer, integer, integer, double precision, text) from public, anon;
grant execute on function public.town_mine(integer, integer, integer, integer, double precision, text) to authenticated;
revoke execute on function public.town_mine_peek(integer, integer) from public, anon;
grant execute on function public.town_mine_peek(integer, integer) to authenticated;
revoke execute on function public.town_cave_reach(integer) from public, anon;
grant execute on function public.town_cave_reach(integer) to authenticated;
revoke execute on function public.town_lift(integer) from public, anon;
grant execute on function public.town_lift(integer) to authenticated;
revoke execute on function public.town_torch(integer, integer) from public, anon;
grant execute on function public.town_torch(integer, integer) to authenticated;
revoke execute on function public.town_drill(integer, integer) from public, anon;
grant execute on function public.town_drill(integer, integer) to authenticated;
revoke execute on function public.town_vein(jsonb) from public, anon;
grant execute on function public.town_vein(jsonb) to authenticated;

-- ─── What the miners' part should say afterwards (for the file's foot, where the parts are put together) ─────────
--
--   select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_cave', 'town_mine', 'town_mine_peek', 'town_cave_reach', 'town_lift', 'town_torch', 'town_drill', 'town_vein') order by 1;
--   -- town_cave       | true | false | true
--   -- town_cave_reach | true | false | true
--   -- town_drill      | true | false | true
--   -- town_lift       | true | false | true
--   -- town_mine       | true | false | true
--   -- town_mine_peek  | true | false | true
--   -- town_torch      | true | false | true
--   -- town_vein       | true | false | true
--
--   select town.deed_th('mine') as a_word, town.deed_th('vein_odd') as another,
--          town.work_counts_of('{"from": "deed", "what": "delve", "thing": null, "n": 1, "doc": {}}'::jsonb, 'me') as a_way_counts,
--          town.mine_hardness(1, 0) as a_rock, town.cave_is_rest(10) as a_rest, town.mine_ore(25) as deep_ore,
--          town.vein_odd('{"gem": null, "mods": {"strikes": 6, "back": 0}}'::jsonb, '{"strikes": [[0, 0]], "struck": 1, "of": 7, "ore": 1, "gems": []}'::jsonb) as a_face_of_seven;
--   -- ทุบหิน | สายแร่ที่เล่าผลมาไม่ตรงกติกา | [{"to": null, "raw": 5, "line": "mining"}] | 12 | true | shardSilver | of
--
--   -- (what is kept of the cave: no row on the first run; later, a row a place somebody has struck a rock of)
--   select place, doc->'day' as day, doc->'way' as way, jsonb_array_length(doc->'broken'->'ids') as broken from public.town_cave order by place;
--
--   -- (in the SQL editor nobody is signed in: `select public.town_cave();` is refused there, as it is to a browser signed out)
