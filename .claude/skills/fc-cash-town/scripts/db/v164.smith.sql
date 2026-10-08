-- v164, the smith's part: the blacksmith who stands in the town (lib/town/forge.ts and the readers of
-- lib/town/tools.ts, written again). Tried by try-v164.mjs on the stand-in's snapshot. Safe to run twice.
--
--   * Smelting: fragments, fine timber and a fee a piece; a member's own queue, smelted one after another by this
--     clock, also while the member is away; what is done waits until it is taken. The queue is widened twice. A
--     friend works the bellows: so much off the piece smelting, so many times an hour, never one's own.
--   * A forging try: the materials and the fee are spent whether it takes or not, and what comes of it is read from a
--     number of chance that is drawn HERE (`random()`), never sent. Every try is written down, the failed ones too.
--   * At a milestone two options are drawn (here) and one is chosen. A draw that waits is the same draw however often
--     it is asked for. An option is drawn again for a gem and a fee, and the old one may be kept.
--   * A gem set in a tool's socket, with a mount; one set over another replaces it.
--   * The village's board: who first forged each kind of tool to the top, and who first found each option.
--
-- What is kept: `town_smiths`, a row a member (the queue, how wide it is, the timber still burning, who worked the
-- bellows lately, the draw that waits); and the board, a row of `town_things` (`smith`). A tool's own state rides on
-- its slot of the bag, in the purse, as the code keeps it: `plus`, `opts`, `gems`.
--
-- Every number is the catalog's (`forge`, made by lib/town/forge-row.ts; and `work` for what the bellows are worth):
-- no rule here has one of its own. Coins paid to the smith leave the game: they go nowhere.
--
-- Three functions that were there have a small marked block more each: `public.town_me` (the smith told with the
-- purse), `town.work_counts_of` (the bellows count for the helpers' line), `town.deed_th` (a word for each deed here).
-- NOTHING OF THEM IS PASTED HERE: v164.smith.lines.mjs says the lines, and build-v164.mjs builds each statement from
-- the function's own text as the database then has it (a file that runs before v164 may have written it again), into
-- the empty places marked below.
--
-- The first section (what a tool carries) is lib/town/tools' readers: the other parts of this file that read a
-- forged tool (the pick, the axe, and later the older tools) stand on them too.

do $$
begin
  if town.cat('forge') is null then raise exception 'the catalog has no `forge` row yet: this part reads every number of the smith''s from it'; end if;
  if not coalesce(town.cat('work')->'helpers' ? 'bellows', false) then raise exception 'the catalog''s `work` row does not say what the bellows are worth: it is to be written over before this part'; end if;
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 and v149 have not run yet: the smith writes his deeds down, and the bellows count for a line';
  end if;
end $$;

-- ─── What a tool carries (lib/town/tools) ────────────────────────────────

-- toolKindOf: the kind of tool a thing is forged as; null for everything else, the better tools of later tiers among it.
create or replace function town.tool_kind(p_item text)
returns text language sql stable
as $$ select case when town.cat('forge')->'kinds' ? p_item then p_item end $$;

-- levelOf: a tool's plus, made sound: a whole number from nothing to the top; nothing, for a thing that is not forged.
create or replace function town.tool_level(p_stack jsonb)
returns integer language sql stable
as $$
  select case when p_stack is null or town.tool_kind(p_stack->>'item') is null or jsonb_typeof(p_stack->'plus') is distinct from 'number' then 0
    else greatest(0, least((town.cat('forge')->'forge'->>'top')::numeric, floor((p_stack->>'plus')::numeric)))::integer end
$$;

-- drawnOf: the options a tool has, by the milestone each was drawn at (null where none was drawn, or what is kept
-- there is no option of this tool's and that milestone's pool, or is kept at an earlier milestone already): made
-- sound, whether awake or not.
create or replace function town.tool_drawn(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  kind text := town.tool_kind(p_stack->>'item');
  kept jsonb := case when jsonb_typeof(p_stack->'opts') = 'array' then p_stack->'opts' else '[]'::jsonb end;
  out_ jsonb := '[]'::jsonb;
  e jsonb;
  o jsonb;
  i integer;
begin
  for i in 0..jsonb_array_length(f->'forge'->'milestones') - 1 loop
    e := kept->i;
    o := case when jsonb_typeof(e) = 'string' then f->'options'->'of'->(e #>> '{}') end;
    if kind is not null and o is not null and (o->>'pool')::integer = (f->'forge'->'pools'->>i)::integer and o->'tools' ? kind
       and not exists (select 1 from jsonb_array_elements(kept) with ordinality b(v, ord) where b.ord - 1 < i and b.v = e) then
      out_ := out_ || jsonb_build_array(e);
    else
      out_ := out_ || 'null'::jsonb;
    end if;
  end loop;
  return out_;
end;
$$;

-- gemsOf: the elements of the gems set in a tool, one for each socket filled: made sound.
create or replace function town.tool_gems(p_stack jsonb)
returns jsonb language sql stable
as $$
  select case when p_stack is null or town.tool_kind(p_stack->>'item') is null or jsonb_typeof(p_stack->'gems') is distinct from 'array' then '[]'::jsonb
    else coalesce((select jsonb_agg(g.v order by g.ord)
      from (select e.v, e.ord from jsonb_array_elements(p_stack->'gems') with ordinality e(v, ord)
             where jsonb_typeof(e.v) = 'string' and town.cat('forge')->'elements' ? (e.v #>> '{}')
             order by e.ord limit (select (town.cat('forge')->'forge'->>'sockets')::integer)) g), '[]'::jsonb) end
$$;

-- has: whether a tool has an option, awake (drawn at a milestone its level has reached).
create or replace function town.tool_has(p_stack jsonb, p_opt text)
returns boolean language sql stable
as $$
  select coalesce((select bool_or(d.v #>> '{}' = p_opt and town.tool_level(p_stack) >= (m.v #>> '{}')::integer)
    from jsonb_array_elements(town.tool_drawn(p_stack)) with ordinality d(v, ord)
    join jsonb_array_elements(town.cat('forge')->'forge'->'milestones') with ordinality m(v, ord) on m.ord = d.ord
   where d.v <> 'null'::jsonb), false)
$$;

-- drawable: the options of a pool that may be drawn for a kind of tool now: in the registry's order, those of the
-- pool, for the kind, that are built.
create or replace function town.forge_drawable(p_kind text, p_pool integer)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(o.id order by o.ord), '[]'::jsonb)
    from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'options'->'order') with ordinality o(id, ord)
   where (f.k->'options'->'of'->o.id->>'pool')::integer = p_pool and f.k->'options'->'of'->o.id->'tools' ? p_kind and f.k->'built'->p_kind->'opts' ? o.id
$$;

-- settable: whether a gem of an element may be set in a kind of tool now: its doing is built.
create or replace function town.forge_settable(p_kind text, p_element text)
returns boolean language sql stable
as $$ select coalesce(town.cat('forge')->'built'->p_kind->'gems' ? p_element, false) $$;

-- elementOfGem: the element a gem is of (null for anything that is no gem).
create or replace function town.gem_element(p_item text)
returns text language sql stable
as $$
  select e.id from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'elements') with ordinality e(id, ord)
   where f.k->'gems'->e.id->>'gem' = p_item order by e.ord limit 1
$$;

-- withState (lib/town/forge): a stack with its own state written as it is kept: nothing kept that says nothing. The
-- options to the last there is, a milestone with none before it as an empty word.
create or replace function town.tool_with(p_stack jsonb, p_plus integer, p_opts jsonb, p_gems jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  last_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.v <> 'null'::jsonb);
  s jsonb := p_stack - 'plus' - 'opts' - 'gems';
begin
  if p_plus > 0 then s := s || jsonb_build_object('plus', p_plus); end if;
  if last_ is not null then
    s := s || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.ord <= last_));
  end if;
  if jsonb_array_length(p_gems) > 0 then s := s || jsonb_build_object('gems', p_gems); end if;
  return s;
end;
$$;

-- ─── The table (lib/town/forge) ──────────────────────────────────────────

-- tryCost: what a try for a level takes of a kind of tool: a wooden tool half the ore (rounded up) and twice the
-- timber. Null past the top.
create or replace function town.try_cost(p_kind text, p_to integer)
returns jsonb language sql stable
as $$
  select case when f.k->'wooden' ? p_kind
      then jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', ceil((t.v->>'n')::numeric / 2), 'timber', (t.v->>'timber')::numeric * 2)
      else jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', t.v->'n', 'timber', t.v->'timber') end
    from (select town.cat('forge') as k) f, jsonb_array_elements(f.k->'tries') t(v)
   where (t.v->>'to')::numeric = p_to limit 1
$$;

-- tryOdds: how a try for a level may go, in hundredths: null past the top.
create or replace function town.try_odds(p_to integer)
returns jsonb language sql stable
as $$
  select jsonb_build_object('take', t.v->'take', 'stay', t.v->'stay', 'down', t.v->'down')
    from jsonb_array_elements(town.cat('forge')->'tries') t(v) where (t.v->>'to')::numeric = p_to limit 1
$$;

-- outcomeOf: how a try for a level goes, from a number of chance (nothing up to one).
create or replace function town.outcome_of(p_to integer, p_r double precision)
returns text language sql stable
as $$
  select coalesce((
    select case when x.x < (t.o->>'take')::double precision then 'taken'
                when x.x < (t.o->>'take')::double precision + (t.o->>'stay')::double precision then 'stays' else 'down' end
      from (select town.try_odds(p_to) as o) t, (select greatest(0::double precision, least(0.999999::double precision, p_r)) * 100 as x) x
     where t.o is not null), 'stays')
$$;

-- ─── What is kept, made sound ────────────────────────────────────────────

-- newSmithy: what a member has at the smith who has nothing there.
create or replace function town.smithy_new()
returns jsonb language sql immutable
as $$ select '{"queue": [], "more": 0, "ember": 0, "helps": [], "pending": null}'::jsonb $$;

-- soundSmithy: a smithy made sound, whatever was kept: only pieces that are smelted, in order of their ends; who
-- helped; a draw only if it is one; counts within their bounds.
create or replace function town.smithy_sound(p_kept jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  p jsonb := k->'pending';
  queue jsonb;
  helps jsonb;
  pending jsonb := 'null'::jsonb;
begin
  queue := coalesce((select jsonb_agg(jsonb_build_object('piece', q.v->'piece', 'from', q.v->'from', 'till', q.v->'till') order by (q.v->>'till')::numeric, q.ord)
    from jsonb_array_elements(case when jsonb_typeof(k->'queue') = 'array' then k->'queue' else '[]'::jsonb end) with ordinality q(v, ord)
   where case when jsonb_typeof(q.v) = 'object' and jsonb_typeof(q.v->'piece') = 'string' and jsonb_typeof(q.v->'from') = 'number' and jsonb_typeof(q.v->'till') = 'number'
              then f->'smelts'->'of' ? (q.v->>'piece') and (q.v->>'till')::numeric >= (q.v->>'from')::numeric else false end), '[]'::jsonb);
  helps := coalesce((select jsonb_agg(jsonb_build_object('by', h.v->'by', 'at', h.v->'at') order by h.ord)
    from jsonb_array_elements(case when jsonb_typeof(k->'helps') = 'array' then k->'helps' else '[]'::jsonb end) with ordinality h(v, ord)
   where jsonb_typeof(h.v) = 'object' and jsonb_typeof(h.v->'by') = 'string' and jsonb_typeof(h.v->'at') = 'number'), '[]'::jsonb);
  if jsonb_typeof(p) = 'object' and jsonb_typeof(p->'item') = 'string' and town.tool_kind(p->>'item') is not null and jsonb_typeof(p->'at') = 'number' and jsonb_typeof(p->'offer') = 'array' then
    if (p->>'at')::numeric = floor((p->>'at')::numeric) and (p->>'at')::numeric >= 0 and (p->>'at')::numeric < jsonb_array_length(f->'forge'->'milestones')
       and not exists (select 1 from jsonb_array_elements(p->'offer') o where jsonb_typeof(o) <> 'string') then
      pending := jsonb_build_object('item', p->'item', 'at', p->'at', 'offer', p->'offer')
        || case when jsonb_typeof(p->'old') = 'string' then jsonb_build_object('old', p->'old') else '{}'::jsonb end;
    end if;
  end if;
  return jsonb_build_object('queue', queue, 'helps', helps, 'pending', pending,
    'more', case when jsonb_typeof(k->'more') = 'number' then greatest(0, least(jsonb_array_length(f->'smith'->'more'), floor((k->>'more')::numeric))) else 0 end,
    'ember', case when jsonb_typeof(k->'ember') = 'number' then greatest(0, floor((k->>'ember')::numeric)) else 0 end);
end;
$$;

-- ─── Smelting ────────────────────────────────────────────────────────────

-- placesOf: how many places a member's queue has.
create or replace function town.smith_places(p_smithy jsonb)
returns integer language sql stable
as $$
  select ((k.s->>'places')::numeric + (k.s->>'wider')::numeric * greatest(0, least(jsonb_array_length(k.s->'more'), coalesce((p_smithy->>'more')::numeric, 0))))::integer
    from (select town.cat('forge')->'smith' as s) k
$$;

-- smithView: the queue at a moment: the pieces that are done and wait to be taken, the one smelting, those waiting
-- their turn; and how many places are free (a piece that is done takes none).
create or replace function town.smith_view(p_smithy jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  with q as (select e.v, e.ord, (e.v->>'till')::numeric <= p_now as done from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)),
       cur as (select min(q.ord) as ord from q where not q.done and (q.v->>'from')::numeric <= p_now),
       places as (select town.smith_places(p_smithy) as n)
  select jsonb_build_object(
    'done', coalesce((select jsonb_agg(q.v order by q.ord) from q where q.done), '[]'::jsonb),
    'now', coalesce((select q.v from q, cur where q.ord = cur.ord), 'null'::jsonb),
    'waiting', coalesce((select jsonb_agg(q.v order by q.ord) from q, cur where not q.done and q.ord is distinct from cur.ord), '[]'::jsonb),
    'places', (select n from places),
    'free', greatest(0, (select n from places) - (select count(*) from q where not q.done)))
$$;

-- dryOf: how many pieces a timber smelts for a bag: more than one, with an axe of seasoned wood in it, awake. (The
-- code says two; the option's own number is two: it is read here.)
create or replace function town.smith_dry(p_bag jsonb)
returns integer language sql stable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_bag) s where town.tool_has(s, 'axDry'))
    then (town.cat('forge')->'options'->'of'->'axDry'->'n'->>'pieces')::integer else 1 end
$$;

-- timberFor: how much fine timber so many pieces take now: so much a piece, less what a timber already burned still smelts.
create or replace function town.smith_timber(p_smithy jsonb, p_n integer, p_dry integer)
returns jsonb language plpgsql stable
as $$
declare
  each_ numeric := (town.cat('forge')->'smelting'->>'timber')::numeric;
  ember numeric := (p_smithy->>'ember')::numeric;
  timber numeric := 0;
  i integer;
begin
  for i in 1..p_n loop
    if ember > 0 then ember := ember - 1; continue; end if;
    timber := timber + each_;
    ember := greatest(0, p_dry - 1);
  end loop;
  return jsonb_build_object('timber', timber, 'ember', ember);
end;
$$;

-- smelt: so many pieces of one kind put in to smelt: they are paid for now and join the end of the queue.
create or replace function town.smelt(p_purse jsonb, p_smithy jsonb, p_piece text, p_n numeric, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  rule jsonb := f->'smelts'->'of'->p_piece;
  bag jsonb := p_purse->'bag';
  queue jsonb := p_smithy->'queue';
  fragments numeric;
  burn jsonb;
  fee numeric;
  from_ numeric;
  till_ numeric;
  i integer;
begin
  if rule is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n <= 0 then return town.no('amount'); end if;
  if (town.smith_view(p_smithy, p_now)->>'free')::numeric < p_n then return town.no('places'); end if;
  fragments := (f->'smelting'->>'fragments')::numeric * p_n;
  if town.held(bag, rule->>'of') < fragments then return town.no('ore'); end if;
  burn := town.smith_timber(p_smithy, p_n::integer, town.smith_dry(bag));
  if town.held(bag, 'timber') < (burn->>'timber')::numeric then return town.no('timber'); end if;
  fee := (rule->>'fee')::numeric * p_n;
  if (p_purse->>'coins')::numeric < fee then return town.no('coins'); end if;
  bag := town.take(bag, rule->>'of', fragments::integer);
  if (burn->>'timber')::numeric > 0 then bag := town.take(bag, 'timber', (burn->>'timber')::integer); end if;
  from_ := greatest(p_now::numeric, coalesce((select max((q->>'till')::numeric) from jsonb_array_elements(queue) q), p_now::numeric));
  for i in 1..p_n::integer loop
    till_ := from_ + (rule->>'mins')::numeric * 60000;
    queue := queue || jsonb_build_array(jsonb_build_object('piece', p_piece, 'from', from_, 'till', till_));
    from_ := till_;
  end loop;
  return jsonb_build_object('ok', true, 'timber', burn->'timber', 'fee', fee,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - fee, 'bag', bag),
    'smithy', p_smithy || jsonb_build_object('queue', queue, 'ember', burn->'ember'));
end;
$$;

-- collect: what is done taken: as much of it as the bag has room for; the rest goes on waiting.
create or replace function town.smith_collect(p_purse jsonb, p_smithy jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  bag jsonb := p_purse->'bag';
  got jsonb := '[]'::jsonb;
  left_ jsonb := '[]'::jsonb;
  q jsonb;
  piece text;
  done_ integer := 0;
begin
  for q in select e.v from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric <= p_now order by e.ord loop
    done_ := done_ + 1;
    piece := q->>'piece';
    if town.room(bag, piece) < 1 then left_ := left_ || jsonb_build_array(q); continue; end if;
    bag := town.put(bag, piece, 1);
    if exists (select 1 from jsonb_array_elements(got) g where g->>0 = piece) then
      got := (select jsonb_agg(case when g.v->>0 = piece then jsonb_build_array(piece, (g.v->>1)::integer + 1) else g.v end order by g.ord) from jsonb_array_elements(got) with ordinality g(v, ord));
    else
      got := got || jsonb_build_array(jsonb_build_array(piece, 1));
    end if;
  end loop;
  if done_ = 0 then return town.no('none'); end if;
  if jsonb_array_length(got) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'got', got, 'purse', p_purse || jsonb_build_object('bag', bag),
    'smithy', p_smithy || jsonb_build_object('queue', left_
      || coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric > p_now), '[]'::jsonb)));
end;
$$;

-- bellowsLeft: how many times more somebody may work the bellows of a queue this hour.
create or replace function town.bellows_left(p_smithy jsonb, p_by text, p_now bigint)
returns integer language sql stable
as $$
  select greatest(0, (k.b->>'each')::integer - (select count(*) from jsonb_array_elements(p_smithy->'helps') h
                                                 where h->>'by' = p_by and p_now - (h->>'at')::numeric < (k.b->>'per')::numeric))::integer
    from (select town.cat('forge')->'smith'->'bellows' as b) k
$$;

-- bellows: the bellows of somebody's queue worked: so much off the piece smelting now, and off everything behind it.
-- Never one's own.
create or replace function town.bellows(p_smithy jsonb, p_owner text, p_by text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  b jsonb := town.cat('forge')->'smith'->'bellows';
  cur integer;
  off numeric;
begin
  if p_by = p_owner then return town.no('self'); end if;
  select min(e.ord)::integer into cur from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)
   where (e.v->>'till')::numeric > p_now and (e.v->>'from')::numeric <= p_now;
  if cur is null then return town.no('idle'); end if;
  if town.bellows_left(p_smithy, p_by, p_now) < 1 then return town.no('tired'); end if;
  off := least((b->>'off')::numeric, (p_smithy->'queue'->(cur - 1)->>'till')::numeric - p_now);
  -- (the piece smelting ends sooner; whatever waits behind it begins and ends as much sooner)
  return jsonb_build_object('ok', true, 'off', off, 'smithy', p_smithy || jsonb_build_object(
    'queue', (select jsonb_agg(case when (e.v->>'till')::numeric <= p_now then e.v
                                    when e.ord = cur then e.v || jsonb_build_object('till', (e.v->>'till')::numeric - off)
                                    else e.v || jsonb_build_object('from', (e.v->>'from')::numeric - off, 'till', (e.v->>'till')::numeric - off) end order by e.ord)
                from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)),
    'helps', coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(p_smithy->'helps') with ordinality h(v, ord)
                        where p_now - (h.v->>'at')::numeric < (b->>'per')::numeric), '[]'::jsonb) || jsonb_build_array(jsonb_build_object('by', p_by, 'at', p_now))));
end;
$$;

-- widen: the queue made wider: so many places more, for fine timber and coins. As wide as it gets after the last.
create or replace function town.smith_widen(p_purse jsonb, p_smithy jsonb)
returns jsonb language plpgsql stable
as $$
declare
  more integer := (p_smithy->>'more')::integer;
  cost jsonb := case when more >= 0 then town.cat('forge')->'smith'->'more'->more end;
begin
  if cost is null then return town.no('top'); end if;
  if town.held(p_purse->'bag', 'timber') < (cost->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost->>'coins')::numeric, 'bag', town.take(p_purse->'bag', 'timber', (cost->>'timber')::integer)),
    'smithy', p_smithy || jsonb_build_object('more', more + 1));
end;
$$;

-- ─── A forging try ───────────────────────────────────────────────────────

-- candidates: the options a draw for a milestone may lay out for a tool: those of the milestone's pool that are
-- built, less every one the tool has (awake or not).
create or replace function town.forge_candidates(p_stack jsonb, p_at integer)
returns jsonb language sql stable
as $$
  select case when k.kind is null or k.pool is null then '[]'::jsonb
    else coalesce((select jsonb_agg(d.id order by d.ord) from jsonb_array_elements_text(town.forge_drawable(k.kind, k.pool)) with ordinality d(id, ord)
                    where not town.tool_drawn(p_stack) ? d.id), '[]'::jsonb) end
    from (select town.tool_kind(p_stack->>'item') as kind, case when p_at >= 0 then (town.cat('forge')->'forge'->'pools'->>p_at)::integer end as pool) k
$$;

-- owedOf: the milestone a tool is owed a draw at: the first its level has reached that has no option yet and
-- something to draw. -1 when it is owed none. (A level regained is owed nothing: the option drawn there is still the tool's.)
create or replace function town.forge_owed(p_stack jsonb)
returns integer language sql stable
as $$
  select coalesce((select (m.ord - 1)::integer from jsonb_array_elements(town.cat('forge')->'forge'->'milestones') with ordinality m(v, ord)
    where town.tool_level(p_stack) >= (m.v #>> '{}')::integer and town.tool_drawn(p_stack)->((m.ord - 1)::integer) = 'null'::jsonb
      and jsonb_array_length(town.forge_candidates(p_stack, (m.ord - 1)::integer)) > 0
    order by m.ord limit 1), -1)
$$;

-- forgeTry: a try at the tool in a slot of the bag. Its materials and its fee are spent, taken or not. `p_r` is the
-- number of chance whoever keeps the game drew (the function a member calls draws it: no browser sends one). A
-- failure leaves the level or lowers it by one, as the table says, and never under the floor; the tool is never lost.
create or replace function town.forge_try(p_purse jsonb, p_slot integer, p_r double precision)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge')->'forge';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind text := town.tool_kind(stack->>'item');
  from_ integer;
  cost jsonb;
  out_ text;
  level integer;
  bag jsonb;
  forged jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind is null then return town.no('tool'); end if;
  from_ := town.tool_level(stack);
  if from_ >= (f->>'top')::integer then return town.no('top'); end if;
  -- (a draw the tool is owed is chosen before it is forged further)
  if town.forge_owed(stack) >= 0 then return town.no('owed'); end if;
  cost := town.try_cost(kind, from_ + 1);
  if town.held(p_purse->'bag', cost->>'ore') < (cost->>'n')::numeric then return town.no('ore'); end if;
  if town.held(p_purse->'bag', 'timber') < (cost->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost->>'fee')::numeric then return town.no('coins'); end if;
  out_ := town.outcome_of(from_ + 1, p_r);
  level := case out_ when 'taken' then from_ + 1 when 'down' then greatest(least(from_, (f->>'floor')::integer), from_ - 1) else from_ end;
  bag := town.take(town.take(p_purse->'bag', cost->>'ore', (cost->>'n')::integer), 'timber', (cost->>'timber')::integer);
  -- (the tool stays in its slot: taking its materials never moves it, for a tool is no ore and no timber)
  forged := town.tool_with(coalesce(nullif(bag->p_slot, 'null'::jsonb), stack), level, town.tool_drawn(stack), town.tool_gems(stack));
  return jsonb_build_object('ok', true, 'out', out_, 'from', from_, 'level', level, 'item', kind, 'owed', town.forge_owed(forged),
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost->>'fee')::numeric, 'bag', jsonb_set(bag, array[p_slot::text], forged)));
end;
$$;

-- ─── The options ─────────────────────────────────────────────────────────

-- pickOffer: two (or as many as there are) of some options, by two numbers of chance: never the same one twice.
create or replace function town.pick_offer(p_from jsonb, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  n integer := (town.cat('forge')->'smith'->>'offer')::integer;
  left_ jsonb := p_from;
  out_ jsonb := '[]'::jsonb;
  r double precision;
  i integer;
  k integer := 0;
begin
  foreach r in array array[p_r1, p_r2] loop
    k := k + 1;
    exit when k > n or jsonb_array_length(left_) = 0;
    i := least(jsonb_array_length(left_) - 1, floor(greatest(0::double precision, least(0.999999::double precision, r)) * jsonb_array_length(left_))::integer);
    out_ := out_ || jsonb_build_array(left_->i);
    left_ := left_ - i;
  end loop;
  return out_;
end;
$$;

-- Whether a stack is the tool a waiting draw is for: of its kind, at its milestone or past it, and with the option
-- the draw was made over (or with none there, of a draw that is owed).
create or replace function town.pending_fits(p_stack jsonb, p_pending jsonb)
returns boolean language sql stable
as $$
  select coalesce(p_stack is not null and p_stack <> 'null'::jsonb and town.tool_kind(p_stack->>'item') = p_pending->>'item'
    and town.tool_level(p_stack) >= (town.cat('forge')->'forge'->'milestones'->>((p_pending->>'at')::integer))::integer
    and case when coalesce(p_pending->>'old', '') <> '' then town.tool_drawn(p_stack)->>((p_pending->>'at')::integer) = p_pending->>'old'
             else town.tool_drawn(p_stack)->((p_pending->>'at')::integer) = 'null'::jsonb end, false)
$$;

-- pendingSlot: the slot of the tool a waiting draw is for: the one said, if it fits; or else the first in the bag
-- that does. -1 when no tool in the bag fits it.
create or replace function town.pending_slot(p_purse jsonb, p_pending jsonb, p_slot integer)
returns integer language sql stable
as $$
  select case when p_pending is null or p_pending = 'null'::jsonb then -1
    when p_slot >= 0 and town.pending_fits(p_purse->'bag'->p_slot, p_pending) then p_slot
    else coalesce((select (b.ord - 1)::integer from jsonb_array_elements(p_purse->'bag') with ordinality b(v, ord) where town.pending_fits(b.v, p_pending) order by b.ord limit 1), -1) end
$$;

-- draw: the draw a tool is owed laid out: two options of its milestone's pool. One draw waits at a time, and a draw
-- that waits is the one laid out again, whatever chance is given: it is not drawn anew by going away and coming back.
create or replace function town.forge_draw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  waits integer := town.pending_slot(p_purse, waiting, p_slot);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind text := town.tool_kind(stack->>'item');
  at_ integer;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and waits >= 0 then
    if waits is not distinct from p_slot then return jsonb_build_object('ok', true, 'smithy', p_smithy, 'pending', waiting, 'slot', p_slot, 'fresh', false); end if;
    return town.no('owed');
  end if;
  if stack is null or stack = 'null'::jsonb or kind is null then return town.no('tool'); end if;
  at_ := town.forge_owed(stack);
  if at_ < 0 then return town.no('none'); end if;
  pending := jsonb_build_object('item', kind, 'at', at_, 'offer', town.pick_offer(town.forge_candidates(stack, at_), p_r1, p_r2));
  return jsonb_build_object('ok', true, 'smithy', p_smithy || jsonb_build_object('pending', pending), 'pending', pending, 'slot', p_slot, 'fresh', true);
end;
$$;

-- redraw: the option of a milestone drawn again, for a gem of any element and a fee: two are laid out, and the old
-- one may be kept. Only of an option that is awake.
create or replace function town.forge_redraw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_at integer, p_gem text, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind text := town.tool_kind(stack->>'item');
  old text;
  from_ jsonb;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_slot) >= 0 then return town.no('owed'); end if;
  if stack is null or stack = 'null'::jsonb or kind is null then return town.no('tool'); end if;
  old := case when p_at >= 0 then town.tool_drawn(stack)->>p_at end;
  if old is null then return town.no('none'); end if;
  if town.tool_level(stack) < (f->'forge'->'milestones'->>p_at)::integer then return town.no('asleep'); end if;
  if town.gem_element(p_gem) is null or town.held(p_purse->'bag', p_gem) < (f->'smith'->'redraw'->>'gems')::numeric then return town.no('gem'); end if;
  if (p_purse->>'coins')::numeric < (f->'smith'->'redraw'->>'fee')::numeric then return town.no('coins'); end if;
  from_ := town.forge_candidates(stack, p_at);
  if jsonb_array_length(from_) = 0 then return town.no('unbuilt'); end if;
  pending := jsonb_build_object('item', kind, 'at', p_at, 'offer', town.pick_offer(from_, p_r1, p_r2), 'old', old);
  return jsonb_build_object('ok', true, 'pending', pending, 'smithy', p_smithy || jsonb_build_object('pending', pending),
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (f->'smith'->'redraw'->>'fee')::numeric,
      'bag', town.take(p_purse->'bag', p_gem, (f->'smith'->'redraw'->>'gems')::integer)));
end;
$$;

-- choose: one of the options laid out chosen (or, of a draw made again, the old one kept): it is the tool's from
-- then on. (A slot that is none is no tool's: the code has no answer there, lib/town/db-vectors-smith.test.ts says where.)
create or replace function town.forge_choose(p_purse jsonb, p_smithy jsonb, p_slot integer, p_pick text)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb;
  kept boolean;
  opts jsonb;
begin
  if p = 'null'::jsonb then return town.no('none'); end if;
  if p_slot is null or p_slot < 0 or town.pending_slot(p_purse, p, p_slot) <> p_slot then return town.no('tool'); end if;
  kept := coalesce(p->>'old', '') <> '' and p_pick is not distinct from p->>'old';
  if not kept and not coalesce(p->'offer' ? p_pick, false) then return town.no('none'); end if;
  stack := p_purse->'bag'->p_slot;
  opts := jsonb_set(town.tool_drawn(stack), array[p->>'at'], to_jsonb(p_pick));
  return jsonb_build_object('ok', true, 'item', p->'item', 'at', p->'at', 'opt', p_pick, 'kept', kept,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], town.tool_with(stack, town.tool_level(stack), opts, town.tool_gems(stack)))),
    'smithy', p_smithy || '{"pending": null}'::jsonb);
end;
$$;

-- ─── A gem ───────────────────────────────────────────────────────────────

-- setGem: a gem set into the tool in a slot: a gem, a mount and a fee. It always takes; a gem already there is gone.
create or replace function town.gem_set(p_purse jsonb, p_slot integer, p_gem text)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('forge')->'smith'->'gem';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind text := town.tool_kind(stack->>'item');
  element text := town.gem_element(p_gem);
  over text;
  bag jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind is null then return town.no('tool'); end if;
  if element is null or town.held(p_purse->'bag', p_gem) < 1 then return town.no('gem'); end if;
  if not town.forge_settable(kind, element) then return town.no('unbuilt'); end if;
  over := town.tool_gems(stack)->>0;
  if over = element then return town.no('same'); end if;
  if town.held(p_purse->'bag', k->>'mount') < (k->>'mounts')::numeric then return town.no('ore'); end if;
  if (p_purse->>'coins')::numeric < (k->>'fee')::numeric then return town.no('coins'); end if;
  bag := town.take(town.take(p_purse->'bag', p_gem, 1), k->>'mount', (k->>'mounts')::integer);
  return jsonb_build_object('ok', true, 'item', kind, 'element', element, 'over', over,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (k->>'fee')::numeric,
      'bag', jsonb_set(bag, array[p_slot::text], town.tool_with(coalesce(nullif(bag->p_slot, 'null'::jsonb), stack), town.tool_level(stack), town.tool_drawn(stack), jsonb_build_array(element)))));
end;
$$;

-- ─── The board ───────────────────────────────────────────────────────────

-- markTop: the board with a tool at the top written on it: only the first of its kind is.
create or replace function town.board_top(p_board jsonb, p_kind text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'tops'->p_kind, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('tops', coalesce(p_board->'tops', '{}'::jsonb) || jsonb_build_object(p_kind, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- markFound: the board with an option found written on it: only its first finder is.
create or replace function town.board_found(p_board jsonb, p_opt text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'found'->p_opt, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('found', coalesce(p_board->'found', '{}'::jsonb) || jsonb_build_object(p_opt, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- ─── What is kept ────────────────────────────────────────────────────────

-- What a member has at the smith: the queue in its order (each piece with what comes out and from when until when it
-- smelts; pieces that are done stay until they are taken), how many times it was widened, how many pieces a timber
-- already burned still smelts, who worked the bellows lately and when, and the draw that waits. A member who has
-- done nothing there has no row. Gone with the member. No browser reads or writes it: the functions below do.
create table if not exists public.town_smiths (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  doc        jsonb not null default '{}'::jsonb check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.town_smiths enable row level security;
revoke all on public.town_smiths from anon, authenticated;

-- The village's board, a thing of the village's as the stall and the fountain are: who first forged each kind of
-- tool to the top, and who first found each option.
insert into public.town_things (key, doc) values ('smith', '{"tops": {}, "found": {}}'::jsonb) on conflict (key) do nothing;

-- A member's smithy as it is kept, made sound: a new one for whoever has nothing there (reading makes no row).
create or replace function town.smithy_read(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$ select town.smithy_sound((select s.doc from public.town_smiths s where s.member_id = p_member)) $$;

-- …and held, for a deed that is to write it: its row waits for whoever else is writing it. (A member's own deeds wait
-- for each other on the purse's row already; this is for the one deed that writes somebody else's smithy, the bellows.)
create or replace function town.smithy_held(p_member uuid)
returns jsonb language plpgsql set search_path = public
as $$
declare
  doc jsonb;
begin
  select s.doc into doc from public.town_smiths s where s.member_id = p_member for update;
  return town.smithy_sound(doc);
end;
$$;

create or replace function town.keep_smithy(p_member uuid, p_smithy jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_smiths (member_id, doc, updated_at) values (p_member, p_smithy, now())
  on conflict (member_id) do update set doc = excluded.doc, updated_at = now()
$$;

-- The board as it stands.
create or replace function town.smith_board()
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('tops', coalesce(b.doc->'tops', '{}'::jsonb), 'found', coalesce(b.doc->'found', '{}'::jsonb))
    from (select (select t.doc from public.town_things t where t.key = 'smith') as doc) b
$$;

-- A first written on the board (`p_which`: tops, of a kind of tool; found, of an option), if it is one: by the
-- member's name as it is that day. The board's row is held only when there is something to write, which is seldom;
-- and looked at again once held, so that of two who are first at the same moment only one is.
create or replace function town.smith_first(p_which text, p_key text, p_member uuid)
returns boolean language plpgsql set search_path = public
as $$
declare
  board jsonb := town.smith_board();
  called text;
begin
  if p_which not in ('tops', 'found') or p_key is null or coalesce(board->p_which->p_key, 'null'::jsonb) <> 'null'::jsonb then return false; end if;
  insert into public.town_things (key, doc) values ('smith', '{"tops": {}, "found": {}}'::jsonb) on conflict (key) do nothing;
  perform 1 from public.town_things t where t.key = 'smith' for update;
  board := town.smith_board();
  if coalesce(board->p_which->p_key, 'null'::jsonb) <> 'null'::jsonb then return false; end if;
  select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') into called from public.profiles pr where pr.id = p_member;
  perform town.keep_thing('smith', case p_which
    when 'tops' then town.board_top(board, p_key, p_member::text, coalesce(called, ''), town.now_ms())
    else town.board_found(board, p_key, p_member::text, coalesce(called, ''), town.now_ms()) end);
  return true;
end;
$$;

-- What a member is told of the smith: what they have there, and the board.
create or replace function town.smith_told(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$ select jsonb_build_object('smithy', town.smithy_read(p_member), 'board', town.smith_board()) $$;

-- A deed's answer at the smith: the rule's own, with the member's purse, this clock, and the smith as he now stands.
-- (A smithy the rule gave back is not sent as it is: what is told is what was kept, and it is the asker's own.)
create or replace function town.smith_answer(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$ select town.answer(p_member, p_did - 'smithy') || jsonb_build_object('smith', town.smith_told(p_member)) $$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (empty places: build-v164.mjs puts each function here as the database has it, with the lines of
-- v164.smith.lines.mjs in place. Left empty in this file on purpose: a pasted copy would undo whatever a file that
-- runs before v164 wrote into the same function.)

-- <public.town_me>
-- </public.town_me>

-- <town.work_counts_of>
-- </town.work_counts_of>

-- <town.deed_th>
-- </town.deed_th>

-- ─── What a member does ──────────────────────────────────────────────────

-- The smith looked at: what I have there, and the board.
create or replace function public.town_smith()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms(), 'smith', town.smith_told(me));
end;
$$;

-- So many pieces of a kind put in to smelt.
create or replace function public.town_smith_smelt(p_piece text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  -- (my purse's row is held first, as by every deed of mine; then my smithy's, which a friend at the bellows writes too)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_piece is null or p_piece !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.smelt(purse, town.smithy_held(me), p_piece, p_n, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smelt', p_piece, p_n, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', did->'timber', 'till', did->'smithy'->'queue'->-1->'till'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- What is done taken into the bag: as much of it as there is room for.
create or replace function public.town_smith_take()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_collect(purse, town.smithy_held(me), town.now_ms());
  g jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    for g in select e.v from jsonb_array_elements(did->'got') with ordinality e(v, ord) order by e.ord loop
      perform town.note(me, 'smelted', g->>0, (g->>1)::numeric, 0, jsonb_build_object('waits', jsonb_array_length(town.smith_view(did->'smithy', town.now_ms())->'done')));
    end loop;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- The queue widened.
create or replace function public.town_smith_widen()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_widen(purse, town.smithy_held(me));
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smith_wider', null, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', town.held(purse->'bag', 'timber') - town.held(did->'purse'->'bag', 'timber'), 'places', town.smith_places(did->'smithy')));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- Who of these members has a piece smelting now, and how many times more I may work their bellows this hour. (A
-- look, asked every few seconds while the smelting is open: it brings no purse.)
create or replace function public.town_smith_near(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) > 64 then return jsonb_build_object('now', now_, 'near', '[]'::jsonb); end if;
  return jsonb_build_object('now', now_, 'near', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'piece', x.view->'now', 'left', town.bellows_left(x.smithy, me::text, now_)) order by x.ord)
      from (select i.id, i.ord, s.smithy, town.smith_view(s.smithy, now_) as view
              from (select distinct on (u.id) u.id, u.ord from unnest(p_ids) with ordinality u(id, ord) where u.id is not null and u.id <> me order by u.id, u.ord) i,
                   lateral (select town.smithy_read(i.id) as smithy) s) x
     where x.view->'now' <> 'null'::jsonb), '[]'::jsonb));
end;
$$;

-- The bellows of somebody else's queue worked.
create or replace function public.town_smith_bellows(p_whose uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  theirs jsonb;
  did jsonb;
begin
  if p_whose is null then return town.smith_answer(me, town.no('idle')); end if;
  if p_whose = me then return town.smith_answer(me, town.no('self')); end if;
  -- (their smithy's row is held: they, or another friend, may be writing it at this moment)
  theirs := town.smithy_held(p_whose);
  did := town.bellows(theirs, p_whose::text, me::text, now_);
  if (did->>'ok')::boolean then
    perform town.keep_smithy(p_whose, did->'smithy');
    perform town.note(me, 'bellows', town.smith_view(theirs, now_)->'now'->>'piece', 1, 0,
      jsonb_build_object('whose', p_whose::text, 'off', did->'off', 'left', town.bellows_left(did->'smithy', me::text, now_)));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A try at the tool in a slot of my bag. The number of chance is drawn here.
create or replace function public.town_smith_try(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  r double precision := random();
  did jsonb := town.forge_try(purse, p_slot, r);
  cost jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    cost := town.try_cost(did->>'item', (did->>'from')::integer + 1);
    -- (every try is written down, whatever came of it: what was tried for, how it went, the number it went by, what it took)
    perform town.note(me, 'forge', did->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'from', did->'from', 'to', (did->>'from')::integer + 1, 'out', did->'out', 'level', did->'level', 'r', r,
        'ore', cost->'ore', 'ores', cost->'n', 'timber', cost->'timber'));
    -- (and the first of a kind at the top goes on the board)
    if (did->>'level')::integer >= (town.cat('forge')->'forge'->>'top')::integer then perform town.smith_first('tops', did->>'item', me); end if;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- The draw a tool is owed, laid out: the two numbers of chance are drawn here, and count only for a draw that is new.
create or replace function public.town_smith_draw(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.forge_draw(purse, town.smithy_held(me), p_slot, random(), random());
begin
  if (did->>'ok')::boolean and (did->>'fresh')::boolean then
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_draw', did->'pending'->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'pending'->'at', 'offer', did->'pending'->'offer'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- One of the options laid out chosen, or the old one kept.
create or replace function public.town_smith_choose(p_slot integer, p_pick text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_pick is null or p_pick !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.forge_choose(purse, town.smithy_held(me), p_slot, p_pick);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_choose', did->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'at', 'opt', did->'opt', 'kept', did->'kept'));
    perform town.smith_first('found', did->>'opt', me);
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A milestone's option drawn again, for a gem and a fee.
create or replace function public.town_smith_redraw(p_slot integer, p_at integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.forge_redraw(purse, town.smithy_held(me), p_slot, p_at, p_gem, random(), random());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_redraw', did->'pending'->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'at', p_at, 'old', did->'pending'->'old', 'offer', did->'pending'->'offer', 'gem', p_gem));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A gem set in the tool in a slot of my bag.
create or replace function public.town_smith_gem(p_slot integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.gem_set(purse, p_slot, p_gem);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gem_set', p_gem, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'item', did->'item', 'element', did->'element', 'over', did->'over'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is a member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_smith() from public, anon;
revoke execute on function public.town_smith_smelt(text, integer) from public, anon;
revoke execute on function public.town_smith_take() from public, anon;
revoke execute on function public.town_smith_widen() from public, anon;
revoke execute on function public.town_smith_near(uuid[]) from public, anon;
revoke execute on function public.town_smith_bellows(uuid) from public, anon;
revoke execute on function public.town_smith_try(integer) from public, anon;
revoke execute on function public.town_smith_draw(integer) from public, anon;
revoke execute on function public.town_smith_choose(integer, text) from public, anon;
revoke execute on function public.town_smith_redraw(integer, integer, text) from public, anon;
revoke execute on function public.town_smith_gem(integer, text) from public, anon;
grant execute on function public.town_smith() to authenticated;
grant execute on function public.town_smith_smelt(text, integer) to authenticated;
grant execute on function public.town_smith_take() to authenticated;
grant execute on function public.town_smith_widen() to authenticated;
grant execute on function public.town_smith_near(uuid[]) to authenticated;
grant execute on function public.town_smith_bellows(uuid) to authenticated;
grant execute on function public.town_smith_try(integer) to authenticated;
grant execute on function public.town_smith_draw(integer) to authenticated;
grant execute on function public.town_smith_choose(integer, text) to authenticated;
grant execute on function public.town_smith_redraw(integer, integer, text) to authenticated;
grant execute on function public.town_smith_gem(integer, text) to authenticated;

-- ─── Reading it (for whoever puts the file together: these go at its foot) ──
--
--   -- every try of the last day, by the level tried for: how many, and how they went beside the table's shares
--   select (d.doc->>'to')::int as tried_for, count(*) as tries,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'taken') / count(*), 1) as taken,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'stays') / count(*), 1) as stays,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'down') / count(*), 1) as down,
--          (select t->>'take' || ' / ' || (t->>'stay') || ' / ' || (t->>'down') from jsonb_array_elements(town.cat('forge')->'tries') t where t->>'to' = d.doc->>'to') as the_table,
--          -sum(d.coins) as coins_paid
--     from public.town_deeds d where d.what = 'forge' and d.at > now() - interval '1 day' group by d.doc->>'to' order by 1;
--
--   -- who has what at the smith: pieces done and waiting, smelting, how wide the queue is, a draw waiting
--   select p.character_name, jsonb_array_length(v.view->'done') as done, (v.view->'now'->>'piece') as smelting, jsonb_array_length(v.view->'waiting') as waiting,
--          v.view->>'places' as places, s.doc->'pending' as draw_waiting, s.updated_at
--     from public.town_smiths s join public.profiles p on p.id = s.member_id, lateral (select town.smith_view(town.smithy_sound(s.doc), town.now_ms()) as view) v
--    order by s.updated_at desc;
--
--   -- the board
--   select town.smith_board();
--
--   -- what the smith's deeds took out of the game, by the day and the deed
--   select date_trunc('day', d.at at time zone 'Asia/Bangkok') as day, d.what, count(*) as deeds, -sum(d.coins) as coins_gone
--     from public.town_deeds d where d.what in ('smelt', 'smith_wider', 'forge', 'forge_redraw', 'gem_set') group by 1, 2 order by 1 desc, 2;
