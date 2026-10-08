-- v164, the woodcutters' part: the mountain's trees, felled with an axe (lib/town/trees.ts and lib/town/felling.ts,
-- written again). Tried by try-v164.mjs on the stand-in's snapshot. Safe to run twice.
--
--   * A tree is everybody's: felled, it is gone for the whole village until the clock brings it back. Who felled
--     which and when is kept here (`town_trees`); a page is told only what is not grown.
--   * The game is played in the browser. The database says, before it, whether the tree can be felled at all and
--     what the game is made from (the trees it is for, the chops each takes, the trunks' seeds, what the axe in the
--     hand makes of it); and judges the go after it: the trees named have to be the ones the game was for, still
--     standing, reached with an axe that bites, and felled no faster than a hand can chop. What a tree gives, what it
--     costs, and every number of chance are decided HERE (`random()`), never sent.
--   * Every tree felled is written down (`fell`), and every go played, felled or not (`town_plays`, game `felling`).
--
-- Every number is the catalog's (`trees`, made by lib/town/trees' treesRow; `work` for what a tree is worth on the
-- line): no rule here has one of its own. The catalog's `trees` row carries the axe as the game reads it (what each
-- plus is, the axe's options and gems), so this part stands on no other part of the file: its readers of an axe are
-- its own (`town.axe_*`).
--
-- Two functions that were there are written again, each as it was but for the lines meant (v164.felling.lines.mjs):
-- `town.work_counts_of` (a tree felled counts for the woodcutters' line) and `town.deed_th` (a word for each deed
-- here). And one table that was there is touched: `town_plays` may keep a go at `felling`.

do $$
begin
  if town.cat('trees') is null then raise exception 'the catalog has no `trees` row yet: this part reads every number of the woodcutters'' from it'; end if;
  if not coalesce(town.cat('work')->'ids' ? 'felling', false) then raise exception 'the catalog''s `work` row has no woodcutters'' line: it is to be written over before this part'; end if;
  if to_regprocedure('town.stretch_at(jsonb, bigint)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null
     or to_regprocedure('town.work_counts_of(jsonb, text)') is null then
    raise exception 'v121, v149 and v153 have not run yet: the woodcutters write their deeds down, count on a line, and count an axe''s powers by the day';
  end if;
end $$;

-- ─── What is kept ────────────────────────────────────────────────────────

-- A tree that is not as the layout has it: felled (when, and by whom), or left half cut. Grown again and whole, it
-- has no row.
create table if not exists public.town_trees (
  tree       integer primary key,
  felled_at  bigint,
  member_id  uuid references public.profiles (id) on delete set null,
  half       boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.town_trees enable row level security;
revoke all on public.town_trees from anon, authenticated;

-- A go at a tree is a game like the others: `town_plays` keeps it. Whatever games it keeps already, it keeps still.
do $$
declare
  def text;
  games text[];
begin
  select pg_get_constraintdef(c.oid) into def from pg_constraint c where c.conrelid = 'public.town_plays'::regclass and c.conname = 'town_plays_game_check';
  if def is not null and position('''felling''' in def) = 0 then
    select array_agg(m[1] order by ord) into games from regexp_matches(def, '''([a-z_]+)''', 'g') with ordinality as t(m, ord);
    alter table public.town_plays drop constraint town_plays_game_check;
    execute format('alter table public.town_plays add constraint town_plays_game_check check (game = any (%L::text[]))', games || 'felling'::text);
  end if;
end $$;

-- ─── The axe, as the game reads it (lib/town/tools, the axe's part) ──────

-- heldStack: the axe in the hand as the stack it is (of two axes, the one taken up: the slot the purse remembers,
-- while that slot still has it; or else the first). Null with anything else in the hand, or nothing.
create or replace function town.axe_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  at_ numeric;
  slot integer;
begin
  if hand is distinct from 'axe' then return null; end if;
  if jsonb_typeof(p_purse->'handAt') = 'number' then
    at_ := (p_purse->>'handAt')::numeric;
    if at_ = floor(at_) and at_ >= 0 and at_ < jsonb_array_length(bag) and bag->(at_::integer)->>'item' = hand then return bag->(at_::integer); end if;
  end if;
  select (b.ord - 1)::integer into slot from jsonb_array_elements(bag) with ordinality b(v, ord) where b.v->>'item' = hand order by b.ord limit 1;
  return case when slot is null then null else bag->slot end;
end;
$$;

-- levelOf: an axe's plus, made sound: a whole number from 0 to the top.
create or replace function town.axe_level(p_axe jsonb)
returns integer language sql stable
as $$
  select case when p_axe is not null and jsonb_typeof(p_axe->'plus') = 'number'
    then greatest(0, least((town.cat('trees')->'axe'->>'top')::numeric, floor((p_axe->>'plus')::numeric)))::integer else 0 end
$$;

-- has: whether an axe has an option, awake: drawn at a milestone of the option's own pool, kept once, and the plus
-- has reached that milestone.
create or replace function town.axe_has(p_axe jsonb, p_id text)
returns boolean language sql stable
as $$
  select coalesce(jsonb_typeof(p_axe->'opts') = 'array' and c.a->'opts' ? p_id and exists (
    select 1 from generate_series(0, jsonb_array_length(c.a->'milestones') - 1) as i
     where jsonb_typeof(p_axe->'opts'->i) = 'string' and p_axe->'opts'->>i = p_id
       and (c.a->'opts'->p_id->>'pool')::integer = (c.a->'pools'->>i)::integer
       and not exists (select 1 from generate_series(0, i - 1) as j where jsonb_typeof(p_axe->'opts'->j) = 'string' and p_axe->'opts'->>j = p_id)
       and town.axe_level(p_axe) >= (c.a->'milestones'->>i)::integer), false)
    from (select town.cat('trees')->'axe' as a) c
$$;

-- gemLevel: the level an element works at in an axe: none with no gem of it in a socket, one more at the top.
create or replace function town.axe_gem(p_axe jsonb, p_element text)
returns integer language sql stable
as $$
  select case when exists (
      select 1 from (select g.v #>> '{}' as e, row_number() over (order by g.ord) as k
          from jsonb_array_elements(case when jsonb_typeof(p_axe->'gems') = 'array' then p_axe->'gems' else '[]'::jsonb end) with ordinality as g(v, ord)
         where jsonb_typeof(g.v) = 'string' and c.a->'elements' ? (g.v #>> '{}')) s
       where s.k <= (c.a->>'sockets')::integer and s.e = p_element)
    then least((c.a->>'gemLevels')::integer, 1 + case when town.axe_level(p_axe) >= (c.a->>'top')::integer then (c.a->>'gemAtTop')::integer else 0 end)
    else 0 end
    from (select town.cat('trees')->'axe' as a) c
$$;

-- gemBy: what an element gives an axe, from the steps of its levels: nothing with no gem of it.
create or replace function town.axe_gem_by(p_axe jsonb, p_element text, p_key text)
returns double precision language sql stable
as $$
  select case when l.n >= 1 then (s.steps->>(least(jsonb_array_length(s.steps), l.n) - 1))::double precision else 0::double precision end
    from (select town.axe_gem(p_axe, p_element) as n) l, (select town.cat('trees')->'axe'->'gems'->p_element->p_key as steps) s
$$;

-- optN: one of an option's own numbers.
create or replace function town.axe_opt(p_id text, p_key text)
returns double precision language sql stable
as $$ select coalesce((town.cat('trees')->'axe'->'opts'->p_id->'n'->>p_key)::double precision, 0::double precision) $$;

-- axeChops: the chops an axe takes to fell a tree that takes so many of a plain one.
create or replace function town.axe_chops(p_axe jsonb, p_base double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, ceil(ceil(
      ((c.a->'chops'->>town.axe_level(p_axe))::double precision * p_base) / (c.a->'chops'->>0)::double precision
      - case when town.axe_has(p_axe, 'axKeen') then town.axe_opt('axKeen', 'chops') else 0 end)
    * (1 - town.axe_gem_by(p_axe, 'fire', 'fewer'))))::integer
    from (select town.cat('trees')->'axe' as a) c
$$;

-- axeAhead: how many segments up an axe shows a branch.
create or replace function town.axe_ahead(p_axe jsonb)
returns integer language sql stable
as $$
  select ((town.cat('trees')->'axe'->'ahead'->>town.axe_level(p_axe))::double precision
    + case when town.axe_has(p_axe, 'axGrain') then town.axe_opt('axGrain', 'ahead') else 0 end)::integer
$$;

-- axeBarPace: how fast the bar of time runs with an axe, as so many times its plain pace.
create or replace function town.axe_pace(p_axe jsonb)
returns double precision language sql stable
as $$
  select greatest(1::double precision / (c.a->>'cap')::double precision,
      (1 - (c.a->'slow'->>town.axe_level(p_axe))::double precision) * (1 - town.axe_gem_by(p_axe, 'ice', 'slow')) * (1 + town.axe_gem_by(p_axe, 'dark', 'faster')))
    from (select town.cat('trees')->'axe' as a) c
$$;

-- usePower: an axe's counted option used once: the axe has to have it, awake, and it has to have a time left in the
-- stretch (a day, or a meal's hours). Counted in the purse (`powers`), for the member, whichever axe it was.
create or replace function town.axe_power(p_purse jsonb, p_axe jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  rule jsonb := town.cat('trees')->'axe'->'opts'->p_id->'use';
  kept jsonb := case when jsonb_typeof(p_purse->'powers') = 'object' then p_purse->'powers' else '{}'::jsonb end;
  u jsonb;
  n integer := 0;
begin
  if rule is null or p_axe is null or not town.axe_has(p_axe, p_id) then return town.no('none'); end if;
  u := kept->p_id;
  if u is not null and jsonb_typeof(u) = 'object' and jsonb_typeof(u->'k') = 'number' and jsonb_typeof(u->'n') = 'number'
     and (u->>'k')::numeric = town.stretch_at(rule, p_now) then n := greatest(0, floor((u->>'n')::numeric))::integer; end if;
  if n >= (rule->>'n')::integer then return town.no('spent'); end if;
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - n - 1,
    'purse', p_purse || jsonb_build_object('powers', kept || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', n + 1))));
end;
$$;

-- ─── A tree (lib/town/trees) ─────────────────────────────────────────────

-- treeOf: a tree of the layout, as the catalog has it: [number, x, y, tier, tiles across]. Null for no tree.
create or replace function town.tree_of(p_id integer)
returns jsonb language sql stable
as $$ select w from jsonb_array_elements(town.cat('trees')->'wood') as t(w) where (w->>0)::integer = p_id limit 1 $$;

create or replace function town.tree_elder(p_tree jsonb)
returns boolean language sql stable
as $$ select (p_tree->>0)::integer = (town.cat('trees')->'elder'->>'id')::integer $$;

-- kindOf: what a tree is called in what is written down.
create or replace function town.tree_kind(p_tree jsonb)
returns text language sql stable
as $$ select case when town.tree_elder(p_tree) then c.k->>'elderKind' else c.k->'kinds'->>((p_tree->>3)::integer - 1) end from (select town.cat('trees') as k) c $$;

-- farFrom: how far a tile is from a tree, from the nearest of the tiles it stands on.
create or replace function town.tree_far(p_tree jsonb, p_x integer, p_y integer)
returns integer language sql immutable
as $$
  select greatest(greatest(t.x - p_x, 0, p_x - (t.x + t.n - 1)), greatest(t.y - p_y, 0, p_y - (t.y + t.n - 1)))
    from (select (p_tree->>1)::integer as x, (p_tree->>2)::integer as y, coalesce((p_tree->>4)::integer, 1) as n) t
$$;

create or replace function town.tree_apart(p_a jsonb, p_b jsonb)
returns integer language sql immutable
as $$ select greatest(abs((p_a->>1)::integer - (p_b->>1)::integer), abs((p_a->>2)::integer - (p_b->>2)::integer)) $$;

-- grownAt: when a tree felled at a moment is grown again: so many minutes on; the ancient tree, at the next dawn.
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
  select f.f is null or p_now >= town.tree_until(town.tree_elder(p_tree), (f.f->>'at')::numeric::bigint)
    from (select p_grove->'down'->(p_tree->>0) as f) f
$$;

-- bites: why this axe does not fell that tree at all: its tier, or the ancient tree's own asking. Null when it does.
create or replace function town.axe_bites(p_axe jsonb, p_tree jsonb)
returns text language sql stable
as $$
  select case when (p_tree->>3)::integer > (c.k->>'axeTier')::integer then 'bite'
              when town.tree_elder(p_tree) and town.axe_level(p_axe) < (c.k->'elder'->>'plus')::integer then 'plus' end
    from (select town.cat('trees') as k) c
$$;

-- chopsFor: the chops a tree takes with an axe, and half of that of a tree half cut.
create or replace function town.fell_chops(p_axe jsonb, p_tree jsonb, p_half boolean)
returns integer language sql stable
as $$
  select case when p_half then greatest(1::double precision, ceil(w.whole * (c.k->'chain'->>'left')::double precision))::integer else w.whole end
    from (select town.cat('trees') as k) c,
         lateral (select town.axe_chops(p_axe, case when town.tree_elder(p_tree) then (c.k->>'elderChops')::double precision else (c.k->>'chops')::double precision end) as whole) w
$$;

-- groupOf: the trees one game fells, the first being the one walked up to: with the echo axe worn, as many more
-- grown trees as stand near the first, the nearest first. The ancient tree by itself.
create or replace function town.fell_group(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') then '[]'::jsonb else
    coalesce((select jsonb_agg(s.w order by s.far, s.id) from (
      select w, town.tree_apart(w, p_first) as far, (w->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') as t(w)
       where (w->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w) and town.axe_bites(p_axe, w) is null
         and town.tree_apart(w, p_first) <= (c.k->'echo'->>'reach')::integer and town.tree_grown(p_grove, w, p_now)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$$;

-- bringHome: the wood a go brings home, into the bag: the bag with every thing in it, or null when it has not the
-- room for all of it. (The one place things from a tree go into a bag: whatever holds wood besides the bag is to be
-- reached from here.)
create or replace function town.fell_home(p_bag jsonb, p_things jsonb)
returns jsonb language plpgsql stable
as $$
declare
  bag jsonb := p_bag;
  x jsonb;
begin
  for x in select e.v from jsonb_array_elements(p_things) with ordinality as e(v, ord) order by e.ord loop
    continue when (x->>1)::integer <= 0;
    if town.room(bag, x->>0) < (x->>1)::integer then return null; end if;
    bag := town.put(bag, x->>0, (x->>1)::integer);
  end loop;
  return bag;
end;
$$;

-- mostOf: the most a go at these trees can bring home: what the bag has to have room for before the axe is swung.
create or replace function town.fell_most(p_axe jsonb, p_trees jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  twice double precision := case when town.axe_has(p_axe, 'axDouble') then town.axe_opt('axDouble', 'by') else 1 end;
  elder double precision := case when town.axe_has(p_axe, 'axElder') then town.axe_opt('axElder', 'by') else 1 end;
  logs double precision := 0;
  timber double precision := 0;
  resin double precision := 0;
  scent integer := 0;
  t jsonb;
  out_ jsonb;
begin
  for t in select e.v from jsonb_array_elements(p_trees) with ordinality as e(v, ord) order by e.ord loop
    if town.tree_elder(t) then
      timber := timber + ceil((k->'elder'->>'timber')::double precision * elder);
      resin := resin + ceil((k->'elder'->>'resin')::double precision * elder);
      continue;
    end if;
    logs := logs + ((k->>'logs')::double precision + case when town.axe_gem_by(p_axe, 'dark', 'log') > 0 then 1 else 0 end
      + case when town.axe_has(p_axe, 'axDust') then town.axe_opt('axDust', 'more') else 0 end) * twice;
    timber := timber + (k->'timber'->>'clean')::double precision * twice;
    if town.axe_has(p_axe, 'axResin') then scent := scent + 1; end if;
  end loop;
  out_ := jsonb_build_array(jsonb_build_array('log', logs), jsonb_build_array('timber', timber))
    || coalesce((select jsonb_agg(jsonb_build_array(s.id, scent + case when s.id = 'resin' then resin else 0 end) order by s.ord) from jsonb_array_elements_text(k->'scent') with ordinality as s(id, ord)), '[]'::jsonb)
    || case when k->'scent' ? 'resin' then '[]'::jsonb else jsonb_build_array(jsonb_build_array('resin', resin)) end;
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(out_) with ordinality as e(v, ord) where (e.v->>1)::double precision > 0), '[]'::jsonb);
end;
$$;

-- (the seed of one tree's trunk, from the game's and the tree's own: whole numbers of thirty-two bits, as the code's)
create or replace function town.fell_seed(p_seed bigint, p_id integer, p_i integer)
returns integer language sql immutable
as $$ select ((((p_seed * 31 + (p_id + 1)::bigint * 7919 + p_i) % 4294967296) + 4294967296 + 2147483648) % 4294967296 - 2147483648)::integer $$;

-- begin: walk up to a tree with an axe in the hand: whether it can be felled now, and the game that fells it.
-- Refused: no such tree; no axe in the hand; too far; an axe that will not bite; the ancient tree to an axe that is
-- not at the top; a tree that is not grown; a bag with no room for what it may give.
create or replace function town.fell_begin(p_purse jsonb, p_grove jsonb, p_tree integer, p_x integer, p_y integer, p_now bigint, p_seed bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
begin
  if t is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if town.tree_far(t, p_x, p_y) > (k->>'reach')::integer then return town.no('far'); end if;
  refused := town.axe_bites(axe, t);
  if refused is not null then return town.no(refused); end if;
  if not town.tree_grown(p_grove, t, p_now) then return town.no('stump'); end if;
  grp := town.fell_group(p_purse, p_grove, t, axe, p_now);
  if town.fell_home(p_purse->'bag', town.fell_most(axe, grp)) is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true,
    'trees', (select jsonb_agg((g.w->>0)::integer order by g.ord) from jsonb_array_elements(grp) with ordinality as g(w, ord)),
    'elder', town.tree_elder(t),
    'ask', jsonb_build_object(
      'trees', (select jsonb_agg(jsonb_build_object('id', (g.w->>0)::integer,
          'chops', town.fell_chops(axe, g.w, coalesce(p_grove->'half', '[]'::jsonb) @> to_jsonb((g.w->>0)::integer)),
          'seed', town.fell_seed(p_seed, (g.w->>0)::integer, (g.ord - 1)::integer)) order by g.ord)
        from jsonb_array_elements(grp) with ordinality as g(w, ord)),
      'ahead', town.axe_ahead(axe), 'pace', town.axe_pace(axe),
      'spared', (town.axe_gem_by(axe, 'water', 'spared') + case when town.gift_works(p_purse, 'famWoodpecker') then (k->>'pecks')::integer else 0 end)::integer,
      'spent', town.stamina_of(p_purse, p_now) <= 0));
end;
$$;

-- fell: a go at felling, judged. The trees named have to be the ones the game was for (the one walked up to, and
-- with the echo axe those near it), still grown, and reached with an axe that bites; a go that says it was played
-- faster than a hand can chop is no go. Every tree that fell is down from now, and gives its wood; the stamina is
-- paid a tree felled. A go in which nothing fell changes nothing. `p_luck`: a set of numbers of chance for each tree
-- named, in their order ({ dark, scent, which, chain }).
create or replace function town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  first_ jsonb := town.tree_of((p_went->>'tree')::numeric::integer);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
  mine jsonb := p_purse;
  one_ boolean := coalesce((p_went->>'one')::boolean, false);
  named jsonb;
  used jsonb;
  down jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  owed double precision := case when jsonb_typeof(p_purse->'felling'->'owed') = 'number' and (p_purse->'felling'->>'owed')::double precision > 0 and (p_purse->'felling'->>'owed')::double precision < 1
    then (p_purse->'felling'->>'owed')::double precision else 0 end;
  dust integer := case when jsonb_typeof(p_purse->'felling'->'dust') = 'number' and (p_purse->'felling'->>'dust')::numeric > 0
    and (p_purse->'felling'->>'dust')::numeric = floor((p_purse->'felling'->>'dust')::numeric) then (p_purse->'felling'->>'dust')::numeric::integer else 0 end;
  fallen jsonb := '[]'::jsonb;   -- [{ t, misses, i }]
  felled jsonb := '[]'::jsonb;
  least_ double precision := 0;
  n jsonb;
  t jsonb;
  f jsonb;
  l jsonb;
  got jsonb;
  all_ jsonb := '[]'::jsonb;
  i integer;
  id_ integer;
  misses integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice boolean;
  free boolean;
  chained integer;
  paid jsonb;
  home jsonb;
  key text;
begin
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  grp := town.fell_group(p_purse, p_grove, first_, axe, p_now);
  -- the axe's one chop: the tree walked up to falls with no game (never the ancient tree), and nothing else does
  if one_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
    used := town.axe_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
    named := jsonb_build_array(jsonb_build_object('id', (first_->>0)::integer, 'felled', true, 'misses', 0));
  else
    named := p_went->'trees';
  end if;
  if named is null or jsonb_typeof(named) <> 'array'
     or (select count(distinct e.v->'id') from jsonb_array_elements(named) as e(v)) <> jsonb_array_length(named) then return town.no('none'); end if;
  for n, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(named) with ordinality as e(v, ord) order by e.ord loop
    continue when not coalesce((n->>'felled')::boolean, false) or jsonb_typeof(n->'id') is distinct from 'number';
    select g.w into t from jsonb_array_elements(grp) as g(w) where (g.w->>0)::numeric = (n->>'id')::numeric limit 1;
    if t is not null and town.tree_grown(p_grove, t, p_now) then
      fallen := fallen || jsonb_build_array(jsonb_build_object('t', t, 'i', i,
        'misses', case when jsonb_typeof(n->'misses') = 'number' then greatest(0, floor((n->>'misses')::numeric)) else 0 end));
    end if;
  end loop;
  -- (the tree walked up to was felled by somebody else meanwhile, and nothing of the game's stands any more: told as the stump it is)
  if jsonb_array_length(fallen) = 0 and exists (select 1 from jsonb_array_elements(named) as e(v) where coalesce((e.v->>'felled')::boolean, false)) then return town.no('stump'); end if;
  if not one_ then
    for f in select e.v from jsonb_array_elements(fallen) with ordinality as e(v, ord) order by e.ord loop
      least_ := least_ + greatest(0, town.fell_chops(axe, f->'t', half @> to_jsonb((f->'t'->>0)::integer)) - 1) * (k->>'quickest')::double precision;
    end loop;
    if not coalesce((case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end) + 0.05 >= least_, false) then return town.no('none'); end if;
  end if;

  for f in select e.v from jsonb_array_elements(fallen) with ordinality as e(v, ord) order by e.ord loop
    t := f->'t'; id_ := (t->>0)::integer; misses := (f->>'misses')::integer;
    l := coalesce(p_luck->((f->>'i')::integer), '{"dark": 1, "scent": 1, "which": 1, "chain": 1}'::jsonb);
    twice := false; free := false; chained := null; got := '[]'::jsonb;
    if town.tree_elder(t) then
      by_ := case when town.axe_has(axe, 'axElder') then town.axe_opt('axElder', 'by') else 1 end;
      got := jsonb_build_array(jsonb_build_array('timber', ceil((k->'elder'->>'timber')::double precision * by_)), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      timber := case when misses <= 0 then (k->'timber'->>'clean')::double precision when misses <= (k->'timber'->>'fair')::integer then (k->'timber'->>'some')::double precision else 0 end;
      if (l->>'dark')::double precision < town.axe_gem_by(axe, 'dark', 'log') then logs := logs + 1; end if;
      if town.axe_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.axe_opt('axDust', 'every') then logs := logs + town.axe_opt('axDust', 'more'); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce((p_went->>'twice')::boolean, false) then
        used := town.axe_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then mine := used->'purse'; twice := true; logs := logs * town.axe_opt('axDouble', 'by'); timber := timber * town.axe_opt('axDouble', 'by'); end if;
      end if;
      got := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got := got || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.axe_has(axe, 'axResin') and (l->>'scent')::double precision < 1::double precision / town.axe_opt('axResin', 'in') then
        got := got || jsonb_build_array(jsonb_build_array(k->'scent'->>(least(jsonb_array_length(k->'scent') - 1, floor((l->>'which')::double precision * jsonb_array_length(k->'scent'))::integer)), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.axe_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then mine := used->'purse'; free := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1 - town.axe_gem_by(axe, 'earth', 'stamina'), owed);
      mine := paid->'purse'; owed := (paid->>'owed')::double precision;
    end if;
    down := down || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half) with ordinality as h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and (l->>'chain')::double precision < town.axe_gem_by(axe, 'lightning', 'chain') then
      select (w->>0)::integer into chained from jsonb_array_elements(k->'wood') as o(w)
       where not town.tree_elder(w) and (w->>0)::integer <> id_ and town.axe_bites(axe, w) is null and not half @> to_jsonb((w->>0)::integer) and not down ? (w->>0)
         and town.tree_apart(w, t) <= (k->'chain'->>'reach')::integer
         and not exists (select 1 from jsonb_array_elements(fallen) as x(v) where (x.v->'t'->>0)::integer = (w->>0)::integer)
       order by town.tree_apart(w, t), (w->>0)::integer limit 1;
      if chained is not null then half := half || to_jsonb(chained); end if;
    end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'misses', misses, 'got', got, 'chained', chained, 'free', free, 'twice', twice));
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got) with ordinality as e(v, ord) order by e.ord loop
      select (a.ord - 1)::integer into i from jsonb_array_elements(all_) with ordinality as a(v, ord) where a.v->>0 = n->>0 limit 1;
      if i is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[i::text, '1'], to_jsonb((all_->i->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.fell_home(mine->'bag', all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key in select jsonb_object_keys(down) loop
    t := case when key ~ '^-?[0-9]{1,9}$' then town.tree_of(key::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down->key->>'at')::numeric::bigint) then down := down - key; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', mine || jsonb_build_object('bag', home) || case when jsonb_array_length(felled) > 0 then jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust)) else '{}'::jsonb end,
    'grove', jsonb_build_object('down', down, 'half', half), 'felled', felled, 'got', all_, 'one', one_);
end;
$$;

-- rootBack: the quickening root: a stump just made by me grows back at once, for everybody. Never the ancient
-- tree's. Counted by the day, by the axe in the hand.
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
  used := town.axe_power(p_purse, axe, 'axRoot', p_now);
  if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', (used->>'left')::integer,
    'grove', p_grove || jsonb_build_object('down', (p_grove->'down') - (p_tree::text)));
end;
$$;

-- toldOf: the trees as a page is told them: every tree that is not grown, with when it fell and when it is grown
-- again; and the trees half cut. Of the ancient tree only that it is down: when it is grown again is told to whoever
-- holds an axe that knows it.
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
        from jsonb_array_elements(case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) as h(v)
       where not coalesce(p_grove->'down', '{}'::jsonb) ? (h.v #>> '{}')), '[]'::jsonb))
    from (select coalesce(town.axe_has(town.axe_of(p_purse), 'axElder'), false) as knows) c
$$;

-- ─── What is kept, read and written ──────────────────────────────────────

-- The grove as the rules read it: the trees felled and not yet forgotten, and those half cut.
create or replace function town.grove()
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'down', coalesce((select jsonb_object_agg(t.tree::text, jsonb_build_object('at', t.felled_at, 'by', coalesce(t.member_id::text, ''))) from public.town_trees t where t.felled_at is not null), '{}'::jsonb),
    'half', coalesce((select jsonb_agg(t.tree order by t.tree) from public.town_trees t where t.half), '[]'::jsonb))
$$;

-- The grove as a go left it, kept: a tree felled, a tree grown again or forgotten, a tree half cut or whole again.
create or replace function town.grove_keep(p_was jsonb, p_now jsonb)
returns void language plpgsql set search_path = public
as $$
begin
  insert into public.town_trees (tree, felled_at, member_id)
    select e.key::integer, (e.value->>'at')::numeric::bigint, case when e.value->>'by' ~ '^[0-9a-f-]{36}$' then (e.value->>'by')::uuid end
      from jsonb_each(p_now->'down') e
     where e.value is distinct from p_was->'down'->e.key
    on conflict (tree) do update set felled_at = excluded.felled_at, member_id = excluded.member_id, updated_at = now();
  update public.town_trees t set felled_at = null, member_id = null, updated_at = now()
   where t.felled_at is not null and not (p_now->'down') ? t.tree::text;
  update public.town_trees t set half = (p_now->'half') @> to_jsonb(t.tree), updated_at = now()
   where t.half is distinct from ((p_now->'half') @> to_jsonb(t.tree));
  insert into public.town_trees (tree, half)
    select (h.v #>> '{}')::integer, true from jsonb_array_elements(p_now->'half') as h(v)
    on conflict (tree) do update set half = true, updated_at = now() where not public.town_trees.half;
  delete from public.town_trees t where t.felled_at is null and not t.half;
end;
$$;

-- ─── What a member calls ─────────────────────────────────────────────────

-- The trees as I am told them. (A page asks this as the game begins: a database that answers keeps trees.)
create or replace function public.town_trees()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  return jsonb_build_object('now', now_, 'trees', town.trees_told(town.grove(), town.purse_of(me, false), now_));
end;
$$;

-- Walk up to a tree with an axe in the hand, from the tile I stand on: the game that fells it, or the state that
-- refuses it. The trunks' seed is drawn here.
create or replace function public.town_fell_begin(p_tree integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  grove jsonb := town.grove();
  purse jsonb := town.purse_of(me, false);
  did jsonb := town.fell_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint);
begin
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('now', now_, 'trees', town.trees_told(grove, purse, now_));
end;
$$;

-- A go at felling as it was played, from the tile I stand on. One go at a time in the whole village: two who fell
-- the same tree in the same moment are judged one after the other, and the second finds a stump.
create or replace function public.town_fell(p_went jsonb, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  k jsonb := town.cat('trees');
  went jsonb := coalesce(p_went, '{}'::jsonb);
  grove jsonb;
  luck jsonb;
  did jsonb;
  f jsonb;
  axe jsonb;
  first_ jsonb;
  spent boolean;
  secs double precision := case when jsonb_typeof(went->'secs') = 'number' then least(greatest(0, (went->>'secs')::double precision), 600) else 0 end;
  need integer := 0;
  hits integer := 0;
  misses numeric := 0;
  n jsonb;
  t jsonb;
begin
  if jsonb_typeof(went->'tree') is distinct from 'number' or (went->>'tree')::numeric <> floor((went->>'tree')::numeric) or abs((went->>'tree')::numeric) > 100000 then
    return town.answer(me, town.no('none'));
  end if;
  perform pg_advisory_xact_lock(hashtext('town_trees'));
  purse := town.purse_of(me, true);
  grove := town.grove();
  -- a set of numbers of chance for each tree named, drawn here
  select coalesce(jsonb_agg(jsonb_build_object('dark', random(), 'scent', random(), 'which', random(), 'chain', random())), '[]'::jsonb) into luck
    from generate_series(1, greatest(1, least(8, case when jsonb_typeof(went->'trees') = 'array' then jsonb_array_length(went->'trees') else 1 end)));
  did := town.fell(purse, grove, me::text, went, p_x, p_y, now_, luck);
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('trees', town.trees_told(grove, purse, now_));
  end if;
  axe := town.axe_of(purse);
  first_ := town.tree_of((went->>'tree')::numeric::integer);
  spent := town.stamina_of(purse, now_) <= 0;
  if jsonb_array_length(did->'felled') > 0 then
    perform town.keep_purse(me, did->'purse');
    perform town.grove_keep(grove, did->'grove');
    for f in select e.v from jsonb_array_elements(did->'felled') with ordinality as e(v, ord) order by e.ord loop
      perform town.note(me, 'fell', f->>'kind', 1, 0, jsonb_build_object('tree', (f->>'id')::integer, 'tile', jsonb_build_array(p_x, p_y), 'misses', (f->>'misses')::integer,
        'secs', secs, 'spent', spent, 'got', f->'got', 'plus', town.axe_level(axe))
        || case when (did->>'one')::boolean then '{"one": true}'::jsonb else '{}'::jsonb end
        || case when (f->>'twice')::boolean then '{"twice": true}'::jsonb else '{}'::jsonb end
        || case when (f->>'free')::boolean then '{"free": true}'::jsonb else '{}'::jsonb end
        || case when f->'chained' <> 'null'::jsonb then jsonb_build_object('chained', f->'chained') else '{}'::jsonb end);
    end loop;
  end if;
  -- the go itself, whatever came of it (the axe's one chop is no go: nothing was played)
  if not (did->>'one')::boolean and jsonb_typeof(went->'trees') = 'array' then
    for n in select e.v from jsonb_array_elements(went->'trees') with ordinality as e(v, ord) order by e.ord limit 8 loop
      t := case when jsonb_typeof(n->'id') = 'number' and (n->>'id')::numeric = floor((n->>'id')::numeric) and abs((n->>'id')::numeric) < 100000 then town.tree_of((n->>'id')::numeric::integer) end;
      continue when t is null;
      need := need + town.fell_chops(axe, t, (grove->'half') @> to_jsonb((t->>0)::integer));
      if exists (select 1 from jsonb_array_elements(did->'felled') as x(v) where (x.v->>'id')::integer = (t->>0)::integer) then
        hits := hits + town.fell_chops(axe, t, (grove->'half') @> to_jsonb((t->>0)::integer));
      end if;
      misses := misses + case when jsonb_typeof(n->'misses') = 'number' then least(99, greatest(0, floor((n->>'misses')::numeric))) else 0 end;
    end loop;
    perform town.record(me, 'felling', jsonb_array_length(did->'felled') > 0, secs, spent, null,
      jsonb_build_object('what', town.tree_kind(first_), 'need', need, 'hits', hits, 'misses', misses, 'tree', (first_->>0)::integer,
        'trees', jsonb_array_length(went->'trees'), 'felled', jsonb_array_length(did->'felled')));
  end if;
  return town.answer(me, did - 'grove') || jsonb_build_object('trees', town.trees_told(town.grove(), town.purse_of(me, false), now_));
end;
$$;

-- The stump I just made, grown again at once for everybody (an axe's own, counted by the day).
create or replace function public.town_fell_root(p_tree integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  grove jsonb;
  did jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('town_trees'));
  purse := town.purse_of(me, true);
  grove := town.grove();
  did := town.fell_root(purse, grove, me::text, p_tree, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.grove_keep(grove, did->'grove');
    perform town.note(me, 'root', town.tree_kind(town.tree_of(p_tree)), 1, 0, jsonb_build_object('tree', p_tree, 'left', (did->>'left')::integer));
  end if;
  return town.answer(me, did - 'grove') || jsonb_build_object('trees', town.trees_told(town.grove(), town.purse_of(me, false), now_));
end;
$$;

-- ─── Functions that were there, written again (v164.felling.lines.mjs has the lines meant) ───

-- <town.work_counts_of>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
  -- (woodcutting: a tree felled, by its kind)
  if what = 'fell' then
    if l->'felling' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing));
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
-- </town.work_counts_of>

-- <town.deed_th>
create or replace function town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $$
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
    -- woodcutting
    when 'fell' then 'ตัดต้นไม้' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'
    else p_what end
$$;
-- </town.deed_th>

revoke execute on all functions in schema town from public, anon, authenticated;
revoke all on function public.town_trees(), public.town_fell_begin(integer, integer, integer), public.town_fell(jsonb, integer, integer), public.town_fell_root(integer) from public, anon;
grant execute on function public.town_trees(), public.town_fell_begin(integer, integer, integer), public.town_fell(jsonb, integer, integer), public.town_fell_root(integer) to authenticated;
