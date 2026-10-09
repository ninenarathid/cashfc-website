-- v164, the woodcutters' part: the mountain's trees, felled with an axe (lib/town/trees and lib/town/felling, written
-- again). Tried by try-v164.mjs on the stand-in's snapshot, with the base run before it. Safe to run twice.
--
-- stands on: base
--
-- THE BLACKSMITH AND THE GREAT FIRE ARE NOT HERE (the base's head says why): a tree felled is nobody's tinder yet,
-- and what a member is answered has no `fire` in it.
--
--   * A tree is everybody's: felled, it is a stump for the whole village until the clock brings it back. Who felled
--     which and when is the base's `grove` (a row of `town_things`, lib/town/trees' `Grove`): this part makes no table.
--   * A tree always falls, and always gives its logs. The board is played for the fine timber besides; the plain way
--     fells the tree at once for its logs alone.
--   * One go on a tree at a time: from the moment a board is put up its trees are held for whoever put it up, for as
--     long as the catalog says (`trees.go.secs`), and nobody else's board or plain press takes on any of them. A hold
--     that has lapsed frees its trees.
--   * A friend may brace the trunk of a go that is open, and has a log for it when the go is over.
--   * A pine lets a keepsake fall now and then: kept in the purse of whoever felled it, never in the bag, and written
--     in the village's book the first time one of its kind is found.
--
-- WHAT THE BROWSER IS BELIEVED ABOUT, and nothing else:
--
--   * the tile stood on, which is held to the tree's own place (a tree is felled from beside it, a trunk braced from
--     within the brace's reach);
--   * how the board went: whether the trunk was cut through, with how many misses (kept as a whole number from
--     nothing to the most chops any trunk takes: no board has more branches than that), and the seconds the hand
--     says it played (kept from nothing to an hour; a go cut through faster than a hand can chop is no go).
--
-- The board itself is played in the browser, from what `town_fell_begin` answers; which trees a go is for, what each
-- gives, what it costs and every number of chance are decided HERE.
--
-- THE ORDER ROWS ARE HELD IN (the base's): the `grove` first, then members' purses by their ids, the lesser first.
-- A go with its trunk braced pays a SECOND member, the friend: `town_fell` reads who that is off the grove once it
-- holds it, and only then takes the two purses, in the order of their ids.
--
-- Every number is the catalog's (`trees`; `work` for what a tree is worth on the line): no rule here has one of its
-- own. An axe is read by the base's readers of a tool (`town.tool_level`, `tool_has`, `gem_by`, `opt_n`,
-- `hand_stack`), its counted powers by `town.use_power`, and wood is put away by `town.stow_all` (the firewood cord
-- before the bag).
--
-- Two functions that were there have a small marked block more each (v164.felling.lines.mjs says the lines, and
-- build-v164.mjs builds each from the function's own text as the database then has it): `town.work_counts_of` (a
-- tree felled counts on the woodcutters' line, and a trunk braced on the helpers') and `town.deed_th` (a word for
-- each deed here). NOTHING OF THEM IS PASTED HERE.

do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.hand_stack(jsonb)') is null or to_regprocedure('town.stow_all(jsonb, jsonb)') is null
     or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null then
    raise exception 'v164''s base has not run yet: the woodcutters'' part stands on its gate, its readers of a tool, its powers and its pouches';
  end if;
  if town.cat('trees') is null or jsonb_typeof(town.cat('trees')->'wood') is distinct from 'array' or jsonb_array_length(town.cat('trees')->'wood') = 0 then
    raise exception 'the catalog''s `trees` row has no tree in it: every number of the woodcutters'' is read from it';
  end if;
  if not exists (select 1 from public.town_things t where t.key = 'grove') then raise exception 'the village has no `grove` row yet: it is the base''s to make'; end if;
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.eased(jsonb, jsonb, bigint, double precision, double precision)') is null then
    raise exception 'v121, v149 and v151 have not all run yet: the woodcutters write their deeds down, count on a line, and owe the rest of a point of stamina';
  end if;
end $$;

-- ─── A tree, as the layout has it (lib/town/trees) ───────────────────────

-- treeOf: a tree of the layout, as the catalog has it: [number, x, y, tier, tiles across, girth]. Null for no tree.
create or replace function town.tree_of(p_id integer)
returns jsonb language sql stable
as $$ select w.v from jsonb_array_elements(town.cat('trees')->'wood') with ordinality w(v, ord) where (w.v->>0)::integer = p_id order by w.ord limit 1 $$;

-- (the ancient tree is the one with the number the catalog names)
create or replace function town.tree_elder(p_tree jsonb)
returns boolean language sql stable
as $$ select (p_tree->>0)::integer = (town.cat('trees')->'elder'->>'id')::integer $$;

-- kindOf: what a tree is called in what is written down, and counted as on the line.
create or replace function town.tree_kind(p_tree jsonb)
returns text language sql stable
as $$ select case when town.tree_elder(p_tree) then c.k->>'elderKind' else c.k->'kinds'->>((p_tree->>3)::integer - 1) end from (select town.cat('trees') as k) c $$;

-- girthOf: a tree's girth, its own from its number: the catalog's row has it worked out, tree by tree.
create or replace function town.tree_girth(p_tree jsonb)
returns integer language sql immutable
as $$ select (p_tree->>5)::integer $$;

-- girthKnobs: what a tree's girth makes of its game: {chops, pace, spent, family, timber}. The ancient tree's are its
-- own, and its one prize bears every miss (lib/town/tools' ALL, which the catalog has in its `mining` row).
create or replace function town.tree_knobs(p_tree jsonb)
returns jsonb language sql stable
as $$
  select case when town.tree_elder(p_tree)
    then jsonb_build_object('chops', c.k->'elderChops', 'pace', c.k->'elderPace', 'spent', c.k->'elderSpent', 'family', c.k->'elderFamily',
           'timber', jsonb_build_array((town.cat('mining')->>'all')::integer))
    else c.k->'girths'->(town.tree_girth(p_tree) - 1) end
    from (select town.cat('trees') as k) c
$$;

-- bearsOf: the misses each of a tree's fine timbers bears.
create or replace function town.tree_bears(p_tree jsonb)
returns jsonb language sql stable
as $$ select town.tree_knobs(p_tree)->'timber' $$;

-- mostTimber: the fine timber a tree gives at the most.
create or replace function town.tree_most(p_tree jsonb)
returns integer language sql stable
as $$ select case when town.tree_elder(p_tree) then (town.cat('trees')->'elder'->>'timber')::integer else jsonb_array_length(town.tree_bears(p_tree)) end $$;

-- farFrom: how far a tile is from a tree, from the nearest of the tiles it stands on. From no tile it is no distance
-- at all (null: said out, since the greatest of some numbers passes over one that is not there, and no tile would
-- else be the tree's own): whatever asks it reads that as too far.
create or replace function town.tree_far(p_tree jsonb, p_x integer, p_y integer)
returns integer language sql immutable
as $$
  select case when p_x is null or p_y is null then null
    else greatest(greatest(t.x - p_x, 0, p_x - (t.x + t.n - 1)), greatest(t.y - p_y, 0, p_y - (t.y + t.n - 1))) end
    from (select (p_tree->>1)::integer as x, (p_tree->>2)::integer as y, coalesce((p_tree->>4)::integer, 1) as n) t
$$;

-- apart: how far two trees stand from each other.
create or replace function town.tree_apart(p_a jsonb, p_b jsonb)
returns integer language sql immutable
as $$ select greatest(abs((p_a->>1)::integer - (p_b->>1)::integer), abs((p_a->>2)::integer - (p_b->>2)::integer)) $$;

-- grownAt: when a tree felled at a moment is grown again: so many minutes on; the ancient tree, at the next dawn
-- (the first moment of the day after the one it fell on, as the stamina counts days).
create or replace function town.tree_until(p_elder boolean, p_at bigint)
returns bigint language sql stable
as $$
  select case when coalesce(p_elder, false)
    then (town.day_of(p_at)::bigint + 1) * 86400000 - 7 * 3600000::bigint + (town.cat('rules')->>'dawn')::bigint * 3600000
    else p_at + (town.cat('trees')->>'regrow')::bigint * 60000 end
$$;

-- isGrown: whether a tree stands grown, by what is kept of the grove.
create or replace function town.tree_grown(p_grove jsonb, p_tree jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select f.v is null or p_now >= town.tree_until(town.tree_elder(p_tree), (f.v->>'at')::numeric::bigint)
    from (select p_grove->'down'->(p_tree->>0) as v) f
$$;

-- ─── One go on a tree at a time ──────────────────────────────────────────

-- goHolds: whether a go is still its owner's: opened no longer ago than a go is held.
create or replace function town.go_holds(p_go jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select coalesce(jsonb_typeof(p_go) = 'object' and p_now - (p_go->>'at')::numeric <= (town.cat('trees')->'go'->>'secs')::numeric * 1000 and p_now >= (p_go->>'at')::numeric, false)
$$;

-- heldBy, as a yes or no: whether somebody else's go holds a tree now (anybody's but `p_me`'s own).
create or replace function town.tree_held(p_grove jsonb, p_tree integer, p_now bigint, p_me text default null)
returns boolean language sql stable
as $$
  select exists (select 1 from jsonb_each(case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end) g
                  where g.key is distinct from p_me and town.go_holds(g.value, p_now) and jsonb_typeof(g.value->'trees') = 'array' and g.value->'trees' @> to_jsonb(p_tree))
$$;

-- opened: a board is put up for a go: its trees are held for its owner from now (one go a member: an older one is
-- forgotten).
create or replace function town.fell_opened(p_grove jsonb, p_me text, p_trees jsonb, p_now bigint)
returns jsonb language sql immutable
as $$
  select p_grove || jsonb_build_object('goes', (case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end)
    || jsonb_build_object(p_me, jsonb_build_object('trees', p_trees, 'at', p_now)))
$$;

-- braceGo: a friend braces the trunk of somebody's open go, from the tile they stand on: near its first tree, not
-- the feller, and nobody braces it yet. It is written on the go, and paid when the go is over.
create or replace function town.brace_go(p_grove jsonb, p_me text, p_feller text, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb := goes_->p_feller;
  t jsonb;
begin
  if p_me is not distinct from p_feller or not town.go_holds(go_, p_now) then return town.no('none'); end if;
  t := case when jsonb_typeof(go_->'trees'->0) = 'number' and abs((go_->'trees'->>0)::numeric) < 2000000000 then town.tree_of((go_->'trees'->>0)::numeric::integer) end;
  if t is null then return town.no('none'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (town.cat('trees')->'brace'->>'reach')::integer, true) then return town.no('far'); end if;
  if jsonb_typeof(go_->'braced') = 'string' and go_->>'braced' <> '' then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'tree', (t->>0)::integer,
    'grove', p_grove || jsonb_build_object('goes', goes_ || jsonb_build_object(p_feller, go_ || jsonb_build_object('braced', p_me))));
end;
$$;

-- bracePay: what a friend who braced a trunk has for it, into their own bag (or their cord): so many logs, where
-- there is room, and nothing lost where there is none.
create or replace function town.brace_pay(p_purse jsonb)
returns jsonb language sql stable
as $$
  select case when h.home is null then jsonb_build_object('purse', p_purse, 'got', '[]'::jsonb) else jsonb_build_object('purse', h.home, 'got', h.things) end
    from (select b.things, town.stow_all(p_purse, b.things) as home
            from (select jsonb_build_array(jsonb_build_array('log', (town.cat('trees')->'brace'->>'logs')::integer)) as things) b) h
$$;

-- ─── Keepsakes, and what a purse keeps of the line ───────────────────────

-- KEEPSAKE_IDS: the keepsakes the catalog has, in the order the code weighs them in. (The catalog keeps them by
-- their names, and a document's names are kept in no order of their own; which keepsake a number of chance falls on
-- is by their order, so the order is said here. One the catalog gains later comes after these.)
create or replace function town.keepsake_ids()
returns jsonb language sql stable
as $$
  with said(ids) as (select '["nest", "feather", "twinCones", "cicada", "pellet", "initials", "heartKnot", "amber", "ribbon", "rustKey", "silverRing", "carvedBird"]'::jsonb)
  select coalesce(jsonb_agg(x.id order by x.ord, x.id), '[]'::jsonb)
    from said, lateral (
      select o.id, o.ord from jsonb_array_elements_text(said.ids) with ordinality o(id, ord) where town.cat('trees')->'keepsakes' ? o.id
      union all
      select n.id, 1000000 from jsonb_object_keys(town.cat('trees')->'keepsakes') n(id) where not said.ids ? n.id) x
$$;

-- keepsakesOf: the keepsakes a tree of a girth may let fall.
create or replace function town.keepsakes_of(p_girth integer)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(i.id order by i.ord), '[]'::jsonb)
    from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
   where p_girth = 3 or not coalesce((town.cat('trees')->'keepsakes'->i.id->>'stout')::boolean, false)
$$;

-- keepsakeFor: what a felled tree lets fall, if anything: from two numbers of chance (whether; and which, by the
-- weights of those its girth may have). Nothing, from the ancient tree and from the trees above the first tier.
create or replace function town.keepsake_for(p_tree jsonb, p_whether double precision, p_which double precision)
returns text language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  may jsonb;
  all_ double precision;
  left_ double precision;
  id_ text;
  last_ text;
begin
  if town.tree_elder(p_tree) or (p_tree->>3)::integer <> 1 or not coalesce(p_whether < 1::double precision / (k->'keepsake'->>'in')::double precision, false) then return null; end if;
  may := town.keepsakes_of(town.tree_girth(p_tree));
  select coalesce(sum((k->'keepsakes'->i.id->>'weight')::double precision), 0) into all_ from jsonb_array_elements_text(may) i(id);
  left_ := greatest(0::double precision, least(0.999999::double precision, p_which)) * all_;
  for id_ in select i.id from jsonb_array_elements_text(may) with ordinality i(id, ord) order by i.ord loop
    left_ := left_ - (k->'keepsakes'->id_->>'weight')::double precision;
    if left_ < 0 then return id_; end if;
    last_ := id_;
  end loop;
  return last_;
end;
$$;

-- fellingOf: what a woodcutter's purse keeps of the line, made sound: the part of a point of stamina left owing; how
-- many trees have fallen towards the next offcut; and the keepsakes found, how many of each.
create or replace function town.felling_of(p_purse jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'owed', case when jsonb_typeof(f.k->'owed') = 'number' and (f.k->>'owed')::double precision > 0 and (f.k->>'owed')::double precision < 1 then f.k->'owed' else '0'::jsonb end,
    'dust', case when jsonb_typeof(f.k->'dust') = 'number' and (f.k->>'dust')::numeric = floor((f.k->>'dust')::numeric) and (f.k->>'dust')::numeric > 0 then f.k->'dust' else '0'::jsonb end,
    'keeps', coalesce((select jsonb_object_agg(e.key, e.value)
        from jsonb_each(case when jsonb_typeof(f.k->'keeps') = 'object' then f.k->'keeps' else '{}'::jsonb end) e
       where town.cat('trees')->'keepsakes' ? e.key and jsonb_typeof(e.value) = 'number'
         and (e.value #>> '{}')::numeric = floor((e.value #>> '{}')::numeric) and (e.value #>> '{}')::numeric > 0), '{}'::jsonb))
    from (select case when jsonb_typeof(p_purse->'felling') = 'object' then p_purse->'felling' else '{}'::jsonb end as k) f
$$;

-- ─── What is kept, and what a page is told ───────────────────────────────

-- tidied: a grove with what has grown again forgotten, and the goes that are held no longer. (A grove with nothing
-- to forget is given back as it is.)
create or replace function town.grove_tidied(p_grove jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  still jsonb;
  held_ jsonb;
begin
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into still
    from jsonb_each(down_) e, lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
   where x.t is not null and p_now < town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint);
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into held_ from jsonb_each(goes_) e where town.go_holds(e.value, p_now);
  if (select count(*) from jsonb_object_keys(still)) = (select count(*) from jsonb_object_keys(down_))
     and (select count(*) from jsonb_object_keys(held_)) = (select count(*) from jsonb_object_keys(goes_)) then
    return p_grove;
  end if;
  return (p_grove - 'goes') || jsonb_build_object('down', still) || case when held_ <> '{}'::jsonb then jsonb_build_object('goes', held_) else '{}'::jsonb end;
end;
$$;

-- toldOf: the trees as a page is told them: every tree that is not grown, with when it fell and when it is grown
-- again; the trees half cut; and the book of the pines, where anything has been found. Of the ancient tree only
-- that it is down: when it is grown again is told to whoever holds an axe that knows it.
create or replace function town.trees_told(p_grove jsonb, p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'down', coalesce((select jsonb_agg(jsonb_build_object('id', (d.t->>0)::integer, 'at', d.f->'at')
          || case when town.tree_elder(d.t) and not c.knows then '{}'::jsonb else jsonb_build_object('until', d.until) end order by (d.t->>0)::integer)
        from (select x.t, e.value as f, town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint) as until
                from jsonb_each(case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end) e,
                     lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
               where x.t is not null) d
       where p_now < d.until), '[]'::jsonb),
    'half', coalesce((select jsonb_agg(h.v order by (h.v #>> '{}')::numeric)
        from jsonb_array_elements(case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) h(v)
       where not coalesce(p_grove->'down', '{}'::jsonb) ? (h.v #>> '{}')), '[]'::jsonb))
    || coalesce((select jsonb_build_object('book', jsonb_agg(jsonb_build_array(i.id, p_grove->'book'->i.id->'by') order by i.ord))
        from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
       where jsonb_typeof(p_grove->'book') = 'object' and p_grove->'book' ? i.id
      having count(*) > 0), '{}'::jsonb)
    from (select coalesce(town.tool_has(town.hand_stack(p_purse), 'axElder'), false) as knows) c
$$;

-- ─── The axe, as the game reads it (lib/town/tools, the axe's part; lib/town/trees) ───

-- axeOf: the axe in the hand, as the stack it is; null with anything else held, or nothing.
create or replace function town.axe_of(p_purse jsonb)
returns jsonb language sql stable
as $$ select case when town.tool_kind(s.v->>'item') = 'axe' then s.v end from (select town.hand_stack(p_purse) as v) s $$;

-- bites: why this axe does not fell that tree at all: its tier, or the ancient tree's own asking. Null when it does.
create or replace function town.axe_bites(p_axe jsonb, p_tree jsonb)
returns text language sql stable
as $$
  select case when (p_tree->>3)::integer > (c.k->>'axeTier')::integer then 'bite'
              when town.tree_elder(p_tree) and town.tool_level(p_axe) < (c.k->'elder'->>'plus')::integer then 'plus' end
    from (select town.cat('trees') as k) c
$$;

-- axeChops: the chops an axe takes to fell a tree that takes so many of a plain one.
create or replace function town.axe_chops(p_axe jsonb, p_base double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, ceil(ceil(
      ((c.a->'chops'->>town.tool_level(p_axe))::double precision * p_base) / (c.a->'chops'->>0)::double precision
      - case when town.tool_has(p_axe, 'axKeen') then town.opt_n('axKeen', 'chops') else 0 end)
    * (1::double precision - town.gem_by(p_axe, 'fire', c.a->'gems'->'fire'->'fewer'))))::integer
    from (select town.cat('trees')->'axe' as a) c
$$;

-- axeAhead: how many segments up an axe shows a branch.
create or replace function town.axe_ahead(p_axe jsonb)
returns double precision language sql stable
as $$
  select (town.cat('trees')->'axe'->'ahead'->>town.tool_level(p_axe))::double precision
    + case when town.tool_has(p_axe, 'axGrain') then town.opt_n('axGrain', 'ahead') else 0 end
$$;

-- axeBarPace: how fast the bar of time runs with an axe, as so many times its plain pace.
create or replace function town.axe_pace(p_axe jsonb)
returns double precision language sql stable
as $$
  select greatest(1::double precision / (c.a->>'cap')::double precision,
      (1::double precision - (c.a->'slow'->>town.tool_level(p_axe))::double precision)
      * (1::double precision - town.gem_by(p_axe, 'ice', c.a->'gems'->'ice'->'slow'))
      * (1::double precision + town.gem_by(p_axe, 'dark', c.a->'gems'->'dark'->'faster')))
    from (select town.cat('trees')->'axe' as a) c
$$;

-- chopsFor: the chops a tree takes with an axe, of a trunk of the tree's girth; and a share of that of a tree half cut.
create or replace function town.fell_chops(p_axe jsonb, p_tree jsonb, p_half boolean)
returns integer language sql stable
as $$
  select case when coalesce(p_half, false) then greatest(1::double precision, ceil(w.whole * (town.cat('trees')->'chain'->>'left')::double precision))::integer else w.whole end
    from (select town.axe_chops(p_axe, (town.tree_knobs(p_tree)->>'chops')::double precision) as whole) w
$$;

-- ─── A game, put together (lib/town/trees) ───────────────────────────────

-- groupOf: the trees one game fells, the first being the one walked up to: with the echo axe worn, as many more
-- grown trees as stand near the first, the nearest first (a tie: the lower number), never one somebody else's go
-- holds. The ancient tree by itself.
create or replace function town.fell_group(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint, p_me text default null)
returns jsonb language sql stable
as $$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') then '[]'::jsonb else
    coalesce((select jsonb_agg(s.v order by s.far_, s.id) from (
      select w.v, town.tree_apart(w.v, p_first) as far_, (w.v->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') w(v)
       where (w.v->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w.v) and town.tree_apart(w.v, p_first) <= (c.k->'echo'->>'reach')::integer
         and town.axe_bites(p_axe, w.v) is null and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$$;

-- mostOf: the most a go at these trees can bring home: what there has to be room for before the axe is swung.
create or replace function town.fell_most(p_axe jsonb, p_trees jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  twice double precision := case when town.tool_has(p_axe, 'axDouble') then town.opt_n('axDouble', 'by') else 1 end;
  elder double precision := case when town.tool_has(p_axe, 'axElder') then town.opt_n('axElder', 'by') else 1 end;
  more double precision := case when town.gem_by(p_axe, 'dark', k->'axe'->'gems'->'dark'->'log') > 0 then 1 else 0 end
    + case when town.tool_has(p_axe, 'axDust') then town.opt_n('axDust', 'more') else 0 end;
  scented boolean := town.tool_has(p_axe, 'axResin');
  logs double precision := 0;
  timber double precision := 0;
  resin double precision := 0;
  scent integer := 0;
  t jsonb;
  out_ jsonb;
begin
  for t in select e.v from jsonb_array_elements(p_trees) with ordinality e(v, ord) order by e.ord loop
    if town.tree_elder(t) then
      timber := timber + ceil((k->'elder'->>'timber')::double precision * elder);
      resin := resin + ceil((k->'elder'->>'resin')::double precision * elder);
      continue;
    end if;
    logs := logs + ((k->>'logs')::double precision + more) * twice;
    timber := timber + town.tree_most(t) * twice;
    if scented then scent := scent + 1; end if;
  end loop;
  out_ := jsonb_build_array(jsonb_build_array('log', logs), jsonb_build_array('timber', timber))
    || coalesce((select jsonb_agg(jsonb_build_array(s.id, scent + case when s.id = 'resin' then resin else 0 end) order by s.ord) from jsonb_array_elements_text(k->'scent') with ordinality s(id, ord)), '[]'::jsonb)
    || case when k->'scent' ? 'resin' then '[]'::jsonb else jsonb_build_array(jsonb_build_array('resin', resin)) end;
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(out_) with ordinality e(v, ord) where (e.v->>1)::double precision > 0), '[]'::jsonb);
end;
$$;

-- trunkOf: the trunk a game is played on, of the trees it fells: the hardest of them (the most chops with this axe;
-- of two alike, the stouter; of two alike again, the earlier). As {t, chops}.
create or replace function town.fell_trunk(p_axe jsonb, p_grove jsonb, p_trees jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object('t', s.v, 'chops', s.chops)
    from (select e.v, e.ord, town.fell_chops(p_axe, e.v, (case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) @> to_jsonb((e.v->>0)::integer)) as chops
            from jsonb_array_elements(p_trees) with ordinality e(v, ord)) s
   order by s.chops desc, town.tree_girth(s.v) desc, s.ord limit 1
$$;

-- (the seed a trunk is made from, of the game's own and the tree's: whole numbers of thirty-two bits, as the code's)
create or replace function town.fell_seed(p_seed bigint, p_id integer)
returns integer language sql immutable
as $$ select (((((p_seed % 4294967296) * 31 + (p_id + 1)::bigint * 7919) % 4294967296) + 4294967296 + 2147483648) % 4294967296 - 2147483648)::integer $$;

-- begin: walk up to a tree with an axe in the hand: whether it can be felled now, and the game that fells it.
-- Refused: no such tree; no axe in the hand; too far; an axe that will not bite; the ancient tree to an axe that is
-- not at the top; a tree somebody else's go holds; a tree that is not grown; no room for what it may give.
-- `p_seed`: a number of chance, from which the trunk is made. `p_me`: whose go this would be.
create or replace function town.fell_begin(p_purse jsonb, p_grove jsonb, p_tree integer, p_x integer, p_y integer, p_now bigint, p_seed bigint, p_me text default null)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
  trunk jsonb;
  knobs jsonb;
  spent_ boolean;
begin
  if t is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, t);
  if refused is not null then return town.no(refused); end if;
  if town.tree_held(p_grove, p_tree, p_now, p_me) then return town.no('held'); end if;
  if not town.tree_grown(p_grove, t, p_now) then return town.no('stump'); end if;
  grp := town.fell_group(p_purse, p_grove, t, axe, p_now, p_me);
  if town.stow_all(p_purse, town.fell_most(axe, grp)) is null then return town.no('full'); end if;
  trunk := town.fell_trunk(axe, p_grove, grp);
  knobs := town.tree_knobs(trunk->'t');
  spent_ := town.stamina_of(p_purse, p_now) <= 0;
  return jsonb_build_object('ok', true,
    'trees', (select jsonb_agg((g.v->>0)::integer order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
    'elder', town.tree_elder(t),
    'ask', jsonb_build_object(
      'trees', (select jsonb_agg(jsonb_build_object('id', (g.v->>0)::integer, 'girth', town.tree_girth(g.v), 'timber', town.tree_bears(g.v)) order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
      'chops', (trunk->>'chops')::integer, 'seed', town.fell_seed(p_seed, p_tree), 'girth', town.tree_girth(trunk->'t'), 'family', knobs->'family',
      'ahead', town.axe_ahead(axe),
      'pace', town.axe_pace(axe) * case when spent_ then (knobs->>'spent')::double precision else (knobs->>'pace')::double precision end,
      'spared', town.gem_by(axe, 'water', k->'axe'->'gems'->'water'->'spared') + case when town.gift_works(p_purse, 'famWoodpecker') then (k->>'pecks')::double precision else 0 end,
      'spent', spent_));
end;
$$;

-- ─── A go, brought home (lib/town/felling, lib/town/trees) ───────────────

-- timberOf: the fine timber a trunk gives for so many misses: as many of its timbers as bear them.
create or replace function town.timber_of(p_bears jsonb, p_misses numeric)
returns integer language sql immutable
as $$ select count(*)::integer from jsonb_array_elements_text(p_bears) b(v) where p_misses <= b.v::numeric $$;

-- fell: a go at felling, judged. The tree named has to be reached with an axe that bites, and not be held by
-- somebody else's go. Every tree of the go comes down, however it went, and gives its logs; the fine timber is the
-- board's: a trunk cut through gives each tree its own by the misses, and a go that says it was played faster than a
-- hand can chop is no go. The plain way and the axe's one chop fell the one tree walked up to. The trees of a go are
-- those its board was opened for while it holds, or worked out afresh; either way only those still standing. Only
-- the ancient tree stands when its go is lost: then nothing changes but that the go is over.
-- `p_went`: {tree, through, misses, secs, plain, one, twice}, the flags true or not there. `p_luck`: a set of
-- numbers of chance for each tree that falls, in their order ({dark, scent, which, chain, keep, kind}, each 0 to 1).
-- `p_who`: the name the book of the pines writes beside what was never found before.
create or replace function town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text default null)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
begin
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  if town.tree_elder(first_) and not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by') else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every') then logs := logs + town.opt_n('axDust', 'more'); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by'); timber := timber * town.opt_n('axDouble', 'by');
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in') then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_by(axe, 'earth', k->'axe'->'gems'->'earth'->'stamina'), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$$;

-- rootBack: a stump just made by me grows back at once, for everybody. Never the ancient tree's. Counted by the
-- day, by the axe in the hand.
create or replace function town.fell_root(p_purse jsonb, p_grove jsonb, p_me text, p_tree integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  f jsonb := p_grove->'down'->(p_tree::text);
  axe jsonb := town.axe_of(p_purse);
  used jsonb;
begin
  if t is null or town.tree_elder(t) then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if f is null or f->>'by' is distinct from p_me or p_now - (f->>'at')::numeric::bigint > (k->'root'->>'within')::bigint * 1000
     or p_now >= town.tree_until(false, (f->>'at')::numeric::bigint) then return town.no('none'); end if;
  used := town.use_power(p_purse, axe, 'axRoot', p_now);
  if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', (used->>'left')::integer,
    'grove', p_grove || jsonb_build_object('down', (p_grove->'down') - (p_tree::text)));
end;
$$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (empty places: build-v164.mjs puts each function here as the database has it, with the lines of
-- v164.felling.lines.mjs in place. Left empty in this file on purpose: a pasted copy would undo whatever a file that
-- runs before v164, or another part of it, wrote into the same function.)

-- <town.work_counts_of>
-- </town.work_counts_of>

-- <town.deed_th>
-- </town.deed_th>

-- ─── What a member calls ─────────────────────────────────────────────────

-- The trees as I am told them, with my purse. (A page asks this once the far side is open to it, while it is near
-- the trees, and when the room says a tree fell: a friend who braced a trunk reads the log they had for it here.)
create or replace function public.town_trees()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, false);
begin
  return jsonb_build_object('now', now_, 'purse', purse,
    'trees', town.trees_told(town.grove_tidied(coalesce(town.thing('grove', false), '{"down": {}, "half": []}'::jsonb), now_), purse, now_));
end;
$$;

-- Walk up to a tree with an axe in the hand, from the tile I stand on: the game that fells it, or the state that
-- refuses it. The trunk's seed is drawn here. Its trees are held for me from now, for as long as a go is held.
create or replace function public.town_fell_begin(p_tree integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  -- (the grove is held: of two who walk up to one tree at one moment, the second finds it held)
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, false);
  did := town.fell_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text);
  if (did->>'ok')::boolean then
    grove := town.fell_opened(grove, me::text, did->'trees', now_);
    perform town.keep_thing('grove', grove);
  end if;
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return town.answer(me, (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$$;

-- A go at felling as it was played, or the plain way, from the tile I stand on. The grove is held first, so that two
-- who fell the same tree at the same moment are judged one after the other and the second finds a stump; then my
-- purse and, where a friend braces the trunk of my go, theirs, in the order of the two ids. Every tree that falls is
-- written down, each a deed of its own.
create or replace function public.town_fell(p_went jsonb, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  k jsonb := town.cat('trees');
  said jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  -- (no trunk has more segments than the stoutest takes with a plain axe, so no go has more misses)
  most integer := greatest((k->>'elderChops')::integer, (select max((g.v->>'chops')::integer) from jsonb_array_elements(k->'girths') g(v)));
  went jsonb;
  grove jsonb;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  bracer uuid;
  luck jsonb := '[]'::jsonb;
  r1 double precision;
  r2 double precision;
  r3 double precision;
  r4 double precision;
  r5 double precision;
  r6 double precision;
  i integer;
  spent_ boolean;
  did jsonb;
  f jsonb;
  paid jsonb;
begin
  if jsonb_typeof(said->'tree') is distinct from 'number' or p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if (said->>'tree')::numeric <> floor((said->>'tree')::numeric) or abs((said->>'tree')::numeric) > 100000 then return town.answer(me, town.no('none')); end if;
  -- what the browser says of its go is kept as this and no more: the tree, three yeses, the misses and the seconds
  went := jsonb_build_object('tree', (said->>'tree')::numeric::integer,
      'through', coalesce(said->'through' = 'true'::jsonb, false), 'plain', coalesce(said->'plain' = 'true'::jsonb, false),
      'one', coalesce(said->'one' = 'true'::jsonb, false), 'twice', coalesce(said->'twice' = 'true'::jsonb, false),
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest(floor((said->>'misses')::numeric), 0), most) else 0 end)
    || case when jsonb_typeof(said->'secs') = 'number' then jsonb_build_object('secs', least(greatest((said->>'secs')::double precision, 0), 3600)) else '{}'::jsonb end;
  -- the village's row first
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  -- whoever braces the trunk of my go has a purse to be paid into: it is held with mine, the lesser id first
  go_ := grove->'goes'->(me::text);
  if jsonb_typeof(go_->'braced') = 'string' then
    if go_->>'braced' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      if go_->>'braced' <> me::text then
        if town.is_member((go_->>'braced')::uuid) then bracer := (go_->>'braced')::uuid; end if;
      end if;
    end if;
  end if;
  if bracer is not null and bracer < me then theirs := town.purse_of(bracer, true); end if;
  purse := town.purse_of(me, true);
  if bracer is not null and bracer > me then theirs := town.purse_of(bracer, true); end if;
  spent_ := town.stamina_of(purse, now_) <= 0;
  -- a set of numbers of chance for each tree a go may fell, drawn here and never sent: in the order the code draws them
  for i in 1..(k->'echo'->>'trees')::integer loop
    r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random(); r6 := random();
    luck := luck || jsonb_build_array(jsonb_build_object('dark', r1, 'scent', r2, 'which', r3, 'chain', r4, 'keep', r5, 'kind', r6));
  end loop;
  did := town.fell(purse, grove, me::text, went, p_x, p_y, now_, luck,
    (select coalesce(nullif(coalesce(p.character_name, p.display_name, p.discord_username, ''), ''), me::text) from public.profiles p where p.id = me));
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
  end if;
  perform town.keep_purse(me, did->'purse');
  perform town.keep_thing('grove', did->'grove');
  -- the friend at the trunk: a log into their own purse, where there is room for one
  if did->>'braced' is not null and theirs is not null and (did->>'braced') = bracer::text then
    paid := town.brace_pay(theirs);
    perform town.keep_purse(bracer, paid->'purse');
    perform town.note(bracer, 'brace', did->'felled'->0->>'kind', coalesce((paid->'got'->0->>1)::numeric, 0), 0,
      jsonb_build_object('tree', did->'felled'->0->'id', 'feller', me));
  end if;
  for f, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(did->'felled') with ordinality e(v, ord) order by e.ord loop
    perform town.note(me, 'fell', f->>'kind', 1, 0,
      jsonb_build_object('tree', f->'id', 'misses', f->'misses', 'girth', f->'girth', 'timber', f->'timber')
      || case when (did->>'plain')::boolean then '{"how": "plain"}'::jsonb when (did->>'one')::boolean then '{"how": "one"}'::jsonb else '{}'::jsonb end
      || case when f ? 'keepsake' then jsonb_build_object('keepsake', f->'keepsake') else '{}'::jsonb end
      || case when i = 0 and did->>'braced' is not null then jsonb_build_object('braced', did->>'braced') else '{}'::jsonb end
      -- (and what only this record can say of it: the tile stood on, what the tree gave, how long the hand says it
      -- played, whether it was played with no stamina, and what the axe's own did)
      || jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'got', f->'got', 'secs', coalesce(went->'secs', '0'::jsonb), 'spent', spent_)
      || case when (f->>'twice')::boolean then '{"twice": true}'::jsonb else '{}'::jsonb end
      || case when (f->>'free')::boolean then '{"free": true}'::jsonb else '{}'::jsonb end
      || case when f->'chained' <> 'null'::jsonb then jsonb_build_object('chained', f->'chained') else '{}'::jsonb end);
  end loop;
  -- (the keepsakes found are told as `keeps`: `found`, in an answer of the game's, is the list of what the village has
  -- found, which a page keeps whole from whatever answer brings it)
  return town.answer(me, (did - 'grove' - 'found') || jsonb_build_object('keeps', did->'found', 'trees', town.trees_told(did->'grove', did->'purse', now_)));
end;
$$;

-- Brace the trunk of somebody's open go, from the tile I stand on. Nothing of mine changes until their go is over.
create or replace function public.town_fell_brace(p_feller uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  did jsonb;
begin
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  did := town.brace_go(grove, me::text, p_feller::text, p_x, p_y, now_);
  if (did->>'ok')::boolean then
    grove := did->'grove';
    perform town.keep_thing('grove', grove);
  end if;
  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, town.purse_of(me, false), now_)));
end;
$$;

-- The stump I just made, grown again at once for everybody (an axe's own, counted by the day).
create or replace function public.town_fell_root(p_tree integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, true);
  did := town.fell_root(purse, grove, me::text, p_tree, now_);
  if (did->>'ok')::boolean then
    grove := did->'grove';
    purse := did->'purse';
    perform town.keep_purse(me, purse);
    perform town.keep_thing('grove', grove);
    perform town.note(me, 'root', town.tree_kind(town.tree_of(p_tree)), 1, 0, jsonb_build_object('tree', p_tree, 'left', (did->>'left')::integer));
  end if;
  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_trees() from public, anon;
grant execute on function public.town_trees() to authenticated;
revoke execute on function public.town_fell_begin(integer, integer, integer) from public, anon;
grant execute on function public.town_fell_begin(integer, integer, integer) to authenticated;
revoke execute on function public.town_fell(jsonb, integer, integer) from public, anon;
grant execute on function public.town_fell(jsonb, integer, integer) to authenticated;
revoke execute on function public.town_fell_brace(uuid, integer, integer) from public, anon;
grant execute on function public.town_fell_brace(uuid, integer, integer) to authenticated;
revoke execute on function public.town_fell_root(integer) from public, anon;
grant execute on function public.town_fell_root(integer) to authenticated;

-- ─── What the woodcutters' part should say afterwards (for the file's foot, where the parts are put together) ─────
--
--   select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_trees', 'town_fell_begin', 'town_fell', 'town_fell_brace', 'town_fell_root') order by 1;
--   -- town_fell       | true | false | true
--   -- town_fell_begin | true | false | true
--   -- town_fell_brace | true | false | true
--   -- town_fell_root  | true | false | true
--   -- town_trees      | true | false | true
--
--   select town.tree_kind(town.tree_of(0)) as a_pine, town.tree_kind(town.tree_of(900)) as the_ancient_tree, town.tree_of(-1) is null as no_tree,
--          jsonb_array_length(town.keepsake_ids()) as keepsakes, town.deed_th('fell') as a_word,
--          town.work_counts_of('{"from": "deed", "what": "fell", "thing": "pine", "n": 1, "doc": {}}'::jsonb, 'me') as a_pine_counts;
--   -- pine | elder | true | 12 | ตัดต้นไม้ | [{"to": null, "raw": 2, "line": "felling", "first": "felling:pine"}]
--
--   -- (the trees as the village has them now: on the first run, none down)
--   select town.trees_told((select doc from public.town_things where key = 'grove'), '{}'::jsonb, town.now_ms());
--   -- {"down": [], "half": []}
