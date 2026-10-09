-- v174, the older tools' part: the rod, the hoe, the watering can, the insect net, the pot, the pan and the grill
-- read what they carry in the games that are live (lib/town/forged, lib/town/forged-keep, and the lines of
-- lib/town/fishing, farm, insects, cooking and stamina that read them, written again). Tried on the stand-in's
-- snapshot as it is after the last file that ran: `node try-v164.mjs <the worktree's root> v174 tools`. Safe to run
-- twice.
-- stands on: smith
--
-- It stands on v164's readers of a tool and its powers (v164.base.sql's head is the contract: `town.tool_mods`,
-- `tool_has`, `hand_stack`, `forged`, `use_power`, `power_left`) and on the smith's part of this file (the catalog's
-- `forge` row with the older tools' steps in it as `old`, and `town.can_holds`). Nothing of those is written again.
--
-- THE RULE OF THIS PART: A TOOL AS IT WAS BOUGHT PLAYS AS IT ALWAYS DID, TO THE LETTER. Every function of an earlier
-- file that is written again here is its own text as the database has it, with a few marked lines
-- (`-- ── the older tools (v174) … ──`), each of which does nothing unless a forged tool of the first tier is the one
-- the deed is done with: v174.tools.lines.mjs says the lines, build-v164.mjs builds each statement, and nothing of
-- those functions is pasted here. A plain tool's deed looks through the bag once for a forged thing of its kind
-- (`town.bag_forged`), and never reads the `forge` row.
--
-- WHAT IS HERE, in the order of the file:
--
--   1. WHAT IS KEPT. Two columns more, each empty for everything there is today:
--      · `town_plots.damp` (false): lib/town/farm's `Plot.damp`, of a bare tilled plot, until it is sown. Only
--        `town_tend` and `town_row` write a plot's soil, and both write this with it.
--      · `town_pots.marks` (null): what a pot of food carries from its cookware while it stands in the world
--        (lib/town/cooking's `potMarks`: the same two fields it has on its slot of the bag).
--      A purse keeps what the code keeps, in its document as ever: `powers` (v164's), `toolOwed`, `canFull`,
--      `rodStill`. A line in the water remembers its rod's part of the least a landing can take (`rod`), and a plant
--      the moment of a second watering (`twice`).
--   2. THE CAP (lib/town/forged's `easedBy`, `slowedBy`, `partOf`, `slowPartOf`) and a number of chance from a word
--      and a few numbers (`luckOf`).
--   3. THE READERS, one a family: `town.rod_fx`, `hoe_fx`, `can_fx`, `net_fx`, `cook_fx`. Each answers the code's
--      object of plain numbers and flags; FOR A STACK WITH NO PLUS, NO OPTION AND NO GEM THE PLAIN OBJECT, WITHOUT
--      READING THE CATALOG.
--   4. WHAT A TOOL PAYS (lib/town/forged-keep's `toolOwed`, `toolPaid`).
--   5. THE RULES OF EACH GAME THAT A FORGED TOOL CHANGES, as functions of their own that the marked lines call.
--   6. THE FUNCTIONS OF EARLIER FILES, each with its marked lines (empty places here).
--
-- THE ORDER ROWS ARE HELD IN is as it was: no function of this part holds a row that its text did not hold before.
-- The plots beside a deed's (a deed done with some forged hoes and cans changes them) are plots of the same row of
-- the same bed, and a bed is held whole by `town_tend` before any of its plots is read (`pg_advisory_xact_lock`,
-- after the purses, as ever): no second bed is ever held.
--
-- NUMBERS WITH A FRACTION ARE `double precision`, worked out in the order the code works them out.

-- ─── 1. What is kept ─────────────────────────────────────────────────────

alter table public.town_plots add column if not exists damp boolean not null default false;
alter table public.town_pots add column if not exists marks jsonb;

-- ─── 2. The cap, and chance ──────────────────────────────────────────────

-- easedBy: ease with a tool's own part in it, never past the cap, never less than the rest came to by itself.
create or replace function town.eased_by(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$
  select case when p_mine = 1 then p_rest when p_mine < 1 then p_rest * p_mine
    else greatest(p_rest, least((select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end
$$;

-- slowedBy: the same for what is easier the smaller it is.
create or replace function town.slowed_by(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$
  select case when p_mine = 1 then p_rest when p_mine > 1 then p_rest * p_mine
    else least(p_rest, greatest(1::double precision / (select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end
$$;

-- partOf, slowPartOf: what a tool's own part multiplies a thing by once the rest is known. EXACTLY 1 FOR A PLAIN TOOL.
create or replace function town.part_of(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$ select case when p_mine = 1 then 1::double precision else town.eased_by(p_rest, p_mine) / p_rest end $$;

create or replace function town.slow_part_of(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$ select case when p_mine = 1 then 1::double precision else town.slowed_by(p_rest, p_mine) / p_rest end $$;

-- luckOf: a number of chance in [0, 1) from a word and a few whole numbers, the same for whoever asks with the same.
create or replace function town.luck_of(p_word text, variadic p_nums bigint[] default '{}'::bigint[])
returns double precision language plpgsql immutable
as $$
declare
  s text := p_word || '|' || array_to_string(p_nums, '|');
  h bigint := 2166136261;
  i integer;
begin
  for i in 1..char_length(s) loop
    h := h # ascii(substr(s, i, 1));
    h := ((h::numeric * 16777619) % 4294967296)::bigint;
  end loop;
  return h::double precision / 4294967296;
end;
$$;

-- ─── 3. The readers (lib/town/forged) ────────────────────────────────────

-- The tool, if it is of one of some kinds and carries something of its own: what each reader begins with.
create or replace function town.fx_of(p_stack jsonb, variadic p_kinds text[])
returns boolean language sql immutable
as $$ select coalesce(p_stack->>'item' = any(p_kinds), false) and town.forged(p_stack) $$;

-- gemBy, of a tool whose `tool_mods` are in hand: what an element gives it, from the steps of its levels.
create or replace function town.fx_gem(p_mods jsonb, p_element text, p_steps jsonb, p_else double precision default 0)
returns double precision language sql immutable
as $$
  select case when l.v >= 1 then (p_steps->>(least(jsonb_array_length(p_steps), l.v) - 1))::double precision else p_else end
    from (select coalesce((p_mods->'gems'->>p_element)::integer, 0) as v) l
$$;

-- optN, of the catalog's row in hand; and has.
create or replace function town.fx_n(p_forge jsonb, p_mods jsonb, p_opt text, p_key text, p_else double precision default 0)
returns double precision language sql immutable
as $$ select case when p_mods->'opts' ? p_opt then coalesce((p_forge->'options'->'of'->p_opt->'n'->>p_key)::double precision, 0) else p_else end $$;

-- rodFx.
create or replace function town.rod_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  dark_ boolean;
begin
  if not town.fx_of(p_stack, 'rod') then
    return '{"band": 1, "pace": 1, "strike": 1, "line": 1, "fierce": 1, "spared": 0, "still": 0, "shimmer": 0, "stamina": 0, "fresh": false, "quick": 0, "keeps": 0, "rare": 1, "call": false, "gold": 0, "lull": 1, "lullMins": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'rod';
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 0) > 0;
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision,
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'strike', case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end,
    'line', 1::double precision - town.fx_gem(m, 'fire', o->'fire'->'rod'->'tires'),
    'fierce', case when dark_ then 1::double precision + (o->'dark'->'rod'->>'fiercer')::double precision else 1::double precision end,
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + case when m->'opts' ? 'rdBait' then 1 else 0 end,
    'still', town.fx_n(k, m, 'rdCalm', 'secs'),
    'shimmer', town.fx_gem(m, 'light', o->'light'->'rod'->'early'),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'rdFresh',
    'quick', town.fx_n(k, m, 'rdQuick', 'shorter'),
    'keeps', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 1),
    'call', m->'opts' ? 'rdCall',
    'gold', town.fx_n(k, m, 'rdGold', 'secs'),
    'lull', town.fx_n(k, m, 'rdStill', 'by', 1),
    'lullMins', town.fx_n(k, m, 'rdStill', 'mins'));
end;
$$;

-- hoeFx.
create or replace function town.hoe_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  worm_ double precision;
begin
  if not town.fx_of(p_stack, 'hoe') then
    return '{"band": 1, "pace": 1, "fewer": 0, "spared": 0, "stones": 0, "even": false, "glow": false, "stamina": 0, "fresh": false, "next": 0, "worm": 0, "grip": false, "both": false, "wet": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'hoe';
  worm_ := town.fx_gem(m, 'dark', o->'dark'->'hoe'->'worm');
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision,
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'))
      * case when worm_ > 0 then 1::double precision + (o->'dark'->'hoe'->>'faster')::double precision else 1::double precision end,
    'fewer', town.fx_gem(m, 'fire', o->'fire'->'hoe'->'fewer'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'hoFirst', 'misses'),
    'stones', town.fx_n(k, m, 'hoClear', 'stones'),
    'even', m->'opts' ? 'hoLight',
    'glow', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'hoFresh',
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'worm', worm_,
    'grip', m->'opts' ? 'hoGrip',
    'both', m->'opts' ? 'hoBoth',
    'wet', m->'opts' ? 'hoWet');
end;
$$;

-- canFx.
create or replace function town.can_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  rich_ double precision;
begin
  if not town.fx_of(p_stack, 'can') then
    return '{"more": 0, "marks": 1, "pace": 1, "spared": 0, "takes": null, "stamina": 0, "fresh": false, "kind": 0, "next": 0, "rich": 0, "uses": 1, "glint": 0, "full": 0, "rain": false, "twice": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'can';
  rich_ := town.fx_gem(m, 'dark', o->'dark'->'can'->'more');
  return jsonb_build_object(
    'more', (lv->'waterings'->>l)::double precision - (lv->'waterings'->>0)::double precision + town.fx_gem(m, 'fire', o->'fire'->'can'->'more') + town.fx_n(k, m, 'cnDrop', 'more'),
    'marks', (lv->'marks'->>l)::double precision,
    'pace', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'takes', case when m->'opts' ? 'cnThrift' then to_jsonb(town.fx_n(k, m, 'cnThrift', 'takes')) else 'null'::jsonb end,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'cnFresh',
    'kind', town.fx_n(k, m, 'cnKind', 'points'),
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rich', rich_,
    'uses', case when rich_ > 0 then (o->'dark'->'can'->>'uses')::double precision else 1::double precision end,
    'glint', town.fx_gem(m, 'light', o->'light'->'can'->'glint'),
    'full', town.fx_n(k, m, 'cnFull', 'mins'),
    'rain', m->'opts' ? 'cnRain',
    'twice', m->'opts' ? 'cnTwice');
end;
$$;

-- netFx.
create or replace function town.net_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
begin
  if not town.fx_of(p_stack, 'bugNet') then
    return '{"ring": 1, "lands": 1, "again": 1, "reach": 0, "spared": 0, "bears": 0, "flight": 1, "stamina": 0, "fresh": false, "twin": 0, "seen": 0, "rare": 1, "wide": 0, "freeze": 0, "nest": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'bugNet';
  return jsonb_build_object(
    'ring', case when l > 0 then (lv->'ring'->>l)::double precision / (lv->'ring'->>0)::double precision else 1::double precision end
      * case when town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare') > 0 then 1::double precision - (o->'dark'->'bugNet'->>'smaller')::double precision else 1::double precision end,
    'lands', case when l > 0 then (lv->'lands'->>l)::double precision / (lv->'lands'->>0)::double precision else 1::double precision end
      * (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'bugNet'->'sooner')),
    'again', town.fx_n(k, m, 'ntAgain', 'by', 1),
    'reach', town.fx_n(k, m, 'ntLong', 'reach'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'bears', town.fx_n(k, m, 'ntMesh', 'misses'),
    'flight', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'ntFresh',
    'twin', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'seen', town.fx_gem(m, 'light', o->'light'->'bugNet'->'seen'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare', 1),
    'wide', town.fx_n(k, m, 'ntWide', 'reach'),
    'freeze', town.fx_n(k, m, 'ntFreeze', 'secs'),
    'nest', m->'opts' ? 'ntNest');
end;
$$;

-- cookFx: the pot, the pan and the grill alike.
create or replace function town.cook_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  dark_ double precision;
begin
  if not town.fx_of(p_stack, 'pot', 'pan', 'grill') then
    return '{"band": 1, "shorter": 0, "spared": 0, "grace": 1, "stamina": 0, "fresh": false, "helping": 0, "big": 0, "steady": 1, "guide": false, "warm": 0, "scent": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'cook'->'helping');
  return jsonb_build_object(
    'band', (k->'levels'->(p_stack->>'item')->'band'->>l)::double precision
      * case when dark_ > 0 then 1::double precision / (1::double precision + (o->'dark'->'cook'->>'harder')::double precision) else 1::double precision end,
    'shorter', 1::double precision - (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'cook'->'shorter')) * (1::double precision - town.fx_n(k, m, 'ckBrisk', 'shorter')),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'ckBase', 'misses'),
    'grace', 1::double precision / (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'ckFresh',
    'helping', greatest(town.fx_gem(m, 'lightning', o->'lightning'->'chance'), dark_),
    'big', town.fx_n(k, m, 'ckBig', 'more'),
    'steady', town.fx_n(k, m, 'ckFire', 'steady', 1),
    'guide', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'warm', town.fx_n(k, m, 'ckWarm', 'hours'),
    'scent', town.fx_n(k, m, 'ckScent', 'stamina'));
end;
$$;

-- ─── 4. What a tool pays (lib/town/forged-keep) ──────────────────────────

-- toolOwed: what part of a point a tool's share has left owing (nothing, of what is kept wrongly).
create or replace function town.tool_owed(p_purse jsonb)
returns double precision language sql immutable
as $$
  select case when jsonb_typeof(p_purse->'toolOwed') = 'number' and (p_purse->>'toolOwed')::double precision > 0 and (p_purse->>'toolOwed')::double precision < 1
    then (p_purse->>'toolOwed')::double precision else 0::double precision end
$$;

-- toolPaid: a purse after a deed done with a tool, with what the tool's forging takes off its stamina given back.
-- `p_fx` is the tool's reader's answer, `p_fresh` the option that counts its free deeds.
create or replace function town.tool_paid(p_before jsonb, p_after jsonb, p_now bigint, p_tool jsonb, p_fx jsonb, p_fresh text)
returns jsonb language plpgsql stable
as $$
declare
  cost double precision := town.stamina_of(p_before, p_now) - town.stamina_of(p_after, p_now);
  share double precision := (p_fx->>'stamina')::double precision;
  used jsonb;
  did jsonb;
begin
  if not coalesce(cost > 0, false) or (not (p_fx->>'fresh')::boolean and not share > 0) then return p_after; end if;
  if (p_fx->>'fresh')::boolean then
    used := town.use_power(p_after, p_tool, p_fresh, p_now);
    if (used->>'ok')::boolean then
      return (used->'purse') || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now), 'left', town.stamina_of(p_before, p_now)));
    end if;
  end if;
  if not share > 0 then return p_after; end if;
  did := town.eased(p_before, p_after, p_now,
    town.slow_part_of(1::double precision - town.buff_by(p_before, p_now, 'hearty'), 1::double precision - share), town.tool_owed(p_after));
  return (did->'purse') || jsonb_build_object('toolOwed', did->'owed');
end;
$$;

-- ─── 5a. Fishing (lib/town/fishing, lib/town/gear) ───────────────────────

-- rodOf: the rod somebody fishes with now, as the stack it is: the one in the hand, or the best in the bag (of that
-- kind the one forged furthest, the first of them).
create or replace function town.rod_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  rods jsonb := town.cat('fishing')->'rods';
  bag jsonb := p_purse->'bag';
  hand_ text := town.hand_of(p_purse);
  rod_ text;
begin
  if hand_ is not null and rods ? hand_ then return town.hand_stack(p_purse); end if;
  select r.id into rod_ from jsonb_array_elements_text(rods) with ordinality r(id, ord)
   where exists (select 1 from jsonb_array_elements(bag) b(v) where b.v->>'item' = r.id) order by r.ord desc limit 1;
  if rod_ is null then return null; end if;
  return (select s.v from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v->>'item' = rod_
           order by case when jsonb_typeof(s.v->'plus') = 'number' then (s.v->>'plus')::numeric else 0 end desc, s.ord limit 1);
end;
$$;

-- The forged rod somebody fishes with, or null: what every marked line of the deck's functions begins with. A bag
-- with no forged rod in it is answered at one look, with no catalog read.
create or replace function town.rod_held(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb;
begin
  if not exists (select 1 from jsonb_array_elements(p_purse->'bag') b(v) where b.v->>'item' = 'rod' and town.forged(b.v)) then return null; end if;
  s := town.rod_of(p_purse);
  return case when town.fx_of(s, 'rod') then s end;
end;
$$;

-- rarer: what may take a bait, with the fish of some tiers so many times as often: each share of the whole again.
create or replace function town.rarer(p_odds jsonb, p_k double precision)
returns jsonb language plpgsql stable
as $$
declare
  fish jsonb;
  o jsonb;
  raised jsonb := '[]'::jsonb;
  total double precision := 0;
  p double precision;
  out_ jsonb := '[]'::jsonb;
begin
  if not coalesce(p_k > 1, false) then return p_odds; end if;
  fish := town.cat('fish');
  for o in select t.e from jsonb_array_elements(p_odds) with ordinality as t(e, ord) order by t.ord loop
    p := case when fish->(o->>'what')->>'tier' in ('rare', 'legend') then (o->>'p')::double precision * p_k else (o->>'p')::double precision end;
    raised := raised || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', p));
    total := total + p;
  end loop;
  for o in select t.e from jsonb_array_elements(raised) with ordinality as t(e, ord) order by t.ord loop
    out_ := out_ || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision / total));
  end loop;
  return out_;
end;
$$;

-- rodHaste: the share of a wait a rod takes off, with what everything else has left of it already.
create or replace function town.rod_haste(p_rest double precision, p_quick double precision)
returns double precision language sql stable
as $$
  select case when p_quick > 0 then 1::double precision - town.slow_part_of(least(1::double precision, greatest(0.01::double precision, p_rest)), 1::double precision - p_quick)
    else 0::double precision end
$$;

-- The rod's own part of the line to be won, taken with the best net's in the bag (lib/town/gear's `gearOf`): what
-- the least a landing can have taken is multiplied by.
create or replace function town.rod_line(p_purse jsonb, p_fx jsonb)
returns double precision language sql stable
as $$
  select town.slow_part_of(least(1::double precision, coalesce((
      select min((c.nets->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.nets ? (s->>'item')), 1::double precision)),
    (p_fx->>'line')::double precision)
    from (select coalesce(town.cat('fishing')->'nets', '{}'::jsonb) as nets) c
$$;

-- called, calledCast, and the wait a rod shortens: a line as it is dropped with a forged rod. `p_line` is the line
-- as everything else has left it, `p_drawn` its wait as it was drawn; `p_purse` the purse as the hook left it.
-- Gives the line and the purse as they are afterwards.
create or replace function town.rod_cast(p_purse jsonb, p_rod jsonb, p_fx jsonb, p_line jsonb, p_drawn double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  haste double precision := town.rod_haste((p_line->>'wait')::double precision / greatest(1::double precision, p_drawn), (p_fx->>'quick')::double precision);
  used jsonb := town.use_power(p_purse, p_rod, 'rdCall', p_now);
begin
  if (used->>'ok')::boolean then
    return jsonb_build_object('purse', used->'purse', 'line', p_line || '{"wait": 1, "nibbles": []}'::jsonb);
  end if;
  return jsonb_build_object('purse', p_purse, 'line', case when haste > 0 then town.hastened(p_line, haste) else p_line end);
end;
$$;

-- goldStrike: a strike that came after the moment had passed (`p_late`: so many milliseconds after the bite, by the
-- keeper's clock and less its grace). The purse with one more counted, or null.
create or replace function town.gold_strike(p_purse jsonb, p_rod jsonb, p_fx jsonb, p_late bigint, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  secs double precision := (p_fx->>'gold')::double precision;
  used jsonb;
begin
  if not secs > 0 or not coalesce(p_late >= 0, false) or p_late > secs * 1000 then return null; end if;
  used := town.use_power(p_purse, p_rod, 'rdGold', p_now);
  return case when (used->>'ok')::boolean then used->'purse' end;
end;
$$;

-- fightPaid, then lulled: a purse after a fight's stamina is paid with a forged rod.
create or replace function town.rod_fought(p_before jsonb, p_after jsonb, p_rod jsonb, p_fx jsonb, p_what text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  paid jsonb := town.tool_paid(p_before, p_after, p_now, p_rod, p_fx, 'rdFresh');
  mins double precision := (p_fx->>'lullMins')::double precision;
  used jsonb;
begin
  if not (p_fx->>'lull')::double precision < 1 or not mins > 0
     or (jsonb_typeof(paid->'rodStill') = 'number' and (paid->>'rodStill')::numeric > p_now)
     or coalesce(town.cat('fish')->p_what->>'tier', '') not in ('uncommon', 'rare', 'legend') then return paid; end if;
  used := town.use_power(paid, p_rod, 'rdStill', p_now);
  return case when (used->>'ok')::boolean then (used->'purse') || jsonb_build_object('rodStill', p_now + (mins * 60000)::bigint) else paid end;
end;
$$;

-- strikeScale's last factor: a forged rod's own part of the strike's moment, taken with the rest of what lengthens it
-- (a keen eye, the best float in the bag, a charm) and never past the cap. 1 for any other rod. `p_f`: the catalog's
-- `fishing` row, which whoever asks has in hand.
create or replace function town.rod_strike(p_purse jsonb, p_now bigint, p_f jsonb)
returns double precision language sql stable
as $$
  select case when r.rod is null then 1::double precision else town.part_of(
      (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
      * greatest(1::double precision, coalesce((
          select max((p_f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where p_f->'floats' ? (s->>'item')), 1::double precision))
      * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)),
      (town.rod_fx(r.rod)->>'strike')::double precision) end
    from (select town.rod_held(p_purse) as rod) r
$$;

-- ─── 5b. The farm (lib/town/farm) ────────────────────────────────────────

-- canFullNow.
create or replace function town.can_full_now(p_purse jsonb, p_now bigint)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_purse->'canFull') = 'number' and (p_purse->>'canFull')::numeric > p_now, false) $$;

-- Whether a bag has a thing of some kind that carries something of its own.
create or replace function town.bag_forged(p_bag jsonb, p_item text)
returns boolean language sql immutable
as $$ select exists (select 1 from jsonb_array_elements(p_bag) b(v) where b.v->>'item' = p_item and town.forged(b.v)) $$;

-- The slot of the bag the thing in the hand is in, as the purse remembers it (lib/town/trade's handSlot with `handAt`): -1 with nothing held.
create or replace function town.hand_at(p_purse jsonb)
returns integer language plpgsql stable
as $$
declare
  at_ numeric := case when jsonb_typeof(p_purse->'handAt') = 'number' then (p_purse->>'handAt')::numeric end;
begin
  return town.hand_slot(p_purse, case when at_ is not null and at_ = floor(at_) and abs(at_) < 2000000000 then at_::integer end);
end;
$$;

-- canSlot: the slot of the can a deed is done with: the one in the hand, when that carries something of its own and
-- will do; or the first of its kind that will (`p_room`: one that is not full; else one with water in it). -1: none.
create or replace function town.can_slot(p_purse jsonb, p_hand text, p_room boolean)
returns integer language plpgsql stable
as $$
declare
  bag jsonb := p_purse->'bag';
  at_ integer := town.hand_at(p_purse);
  mine jsonb := case when at_ >= 0 then bag->at_ end;
begin
  if mine is not null and mine->>'item' = p_hand and town.forged(mine)
     and (case when p_room then coalesce((mine->>'water')::numeric, 0) < town.can_holds(mine) else coalesce((mine->>'water')::numeric, 0) > 0 end) then return at_; end if;
  return coalesce((select (x.ord - 1)::integer from jsonb_array_elements(bag) with ordinality x(s, ord)
    where x.s->>'item' = p_hand and case when p_room then coalesce((x.s->>'water')::numeric, 0) < town.can_holds(x.s) else coalesce((x.s->>'water')::numeric, 0) > 0 end
    order by x.ord limit 1), -1);
end;
$$;

-- wetOnce.
create or replace function town.wet_once(p_plant jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select p_now - (p_plant->>'watered')::bigint < (town.cat('farming')->'water'->>'every')::bigint * 60000 and not town.raining(p_now)
    and (p_plant->'twice') is distinct from (p_plant->'watered')
$$;

-- What deedFor answers otherwise when it is told `twice`: whether a plot's plant is the can's once more.
create or replace function town.twice_wanted(p_key text, p_plot jsonb, p_now bigint)
returns boolean language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
begin
  if p = 'null'::jsonb then return false; end if;
  seen := town.see(p_key, p_plot, p_now);
  return not (seen->>'dead')::boolean and (seen->>'wet')::boolean and town.wet_once(p, p_now) and not (town.growing(p, p_now)->>'spent')::boolean
    and not ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null);
end;
$$;

-- wateringOf: what a watering adds to a plant, in milliseconds of growth.
create or replace function town.watering_of(p_purse jsonb, p_hand text, p_now bigint, p_fx jsonb)
returns double precision language sql stable
as $$
  select ((f.k->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f.k->'field'->>p_hand)::double precision, 1::double precision)
    * (1::double precision + town.buff_by(p_purse, p_now, 'green')) * (1::double precision + (p_fx->>'rich')::double precision)
    from (select town.cat('farming') as k) f
$$;

-- water, from where it asks whether the plant is wet, for a bag with a forged can of the kind held in it, or while a
-- can's minutes run. `p_seen`: the plot as the function saw it.
create or replace function town.water_with(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint, p_seen jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := p_plot->'plant';
  bag jsonb := p_purse->'bag';
  mine jsonb := town.hand_stack(p_purse);
  again boolean;
  wet_ integer;
  runs boolean := town.can_full_now(p_purse, p_now);
  mins double precision;
  begun jsonb;
  slot integer;
  can jsonb;
  from_ jsonb := p_purse;
  fx jsonb;
  free boolean;
  paid jsonb;
  twice jsonb;
begin
  again := (p_seen->>'wet')::boolean and coalesce(mine->>'item' = p_hand, false) and town.wet_once(p, p_now)
    and coalesce(mine->>'item' = 'can', false) and town.may_power(p_purse, mine, 'cnTwice', p_now);
  if (p_seen->>'wet')::boolean and not again then return town.no('wet'); end if;
  wet_ := town.can_slot(p_purse, p_hand, false);
  if wet_ < 0 and not runs and coalesce(mine->>'item' = p_hand, false) then
    mins := (town.can_fx(mine)->>'full')::double precision;
    if mins > 0 then begun := town.use_power(p_purse, mine, 'cnFull', p_now); end if;
  end if;
  slot := case when wet_ >= 0 then wet_ when runs or coalesce((begun->>'ok')::boolean, false) then town.hand_at(p_purse) else -1 end;
  if slot < 0 or bag->slot->>'item' is distinct from p_hand then return town.no('dry'); end if;
  can := bag->slot;
  if coalesce((begun->>'ok')::boolean, false) then from_ := (begun->'purse') || jsonb_build_object('canFull', p_now + (mins * 60000)::bigint); end if;
  fx := town.can_fx(can);
  free := town.has_buff(p_purse, p_now, 'spring') or runs or coalesce((begun->>'ok')::boolean, false);
  paid := town.spend(from_, (f->'costs'->>'water')::double precision, p_now)
    || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], can || jsonb_build_object('water',
         coalesce((can->>'water')::numeric, 0) - case when free then 0 else least((can->>'water')::numeric, (fx->>'uses')::numeric) end)));
  if again then twice := town.use_power(paid, mine, 'cnTwice', p_now); end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + town.watering_of(p_purse, p_hand, p_now, fx)) || case when again then jsonb_build_object('twice', p_now) else '{}'::jsonb end),
    'purse', case when coalesce((twice->>'ok')::boolean, false) then twice->'purse' else paid end);
end;
$$;

-- chore, a can's filling, for a bag with a forged can of the kind held in it: the can is filled as the stack it is.
create or replace function town.fill_with(p_purse jsonb, p_hand text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  bag jsonb := p_purse->'bag';
  slot integer := town.can_slot(p_purse, p_hand, true);
  can jsonb := bag->slot;
  needs numeric := greatest(1, coalesce((town.can_fx(can)->>'takes')::numeric, (f->>'fill')::numeric, 1));
  holds double precision := town.can_holds(can);
  pours numeric := least(needs, p_well);
  had numeric := coalesce((can->>'water')::numeric, 0);
begin
  return jsonb_build_object('ok', true, 'chore', 'fill', 'well', p_well - pours,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], can || jsonb_build_object('item', p_hand, 'n', 1, 'water',
           case when pours >= needs then holds else least(holds, (had + floor(holds::numeric * pours / needs))::double precision) end))));
end;
$$;

-- tend, its end, for a deed of the hoe's or a watering done with a forged tool in the hand: what the tool pays, what
-- it counts, the plot as it is left and what came of it. `p_after`: the purse as the rest of the deed left it.
create or replace function town.tend_with(p_key text, p_deed text, p_before jsonb, p_after jsonb, p_plot jsonb, p_got jsonb, p_tool jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  fx jsonb;
  paid jsonb;
  used jsonb;
  both_ boolean := false;
  damp_ boolean := false;
  tilled boolean;
  left_ jsonb := p_plot;
  got_ jsonb := p_got;
begin
  if p_deed = 'water' then
    return jsonb_build_object('purse', town.tool_paid(p_before, p_after, p_now, p_tool, town.can_fx(p_tool), 'cnFresh'), 'plot', p_plot, 'got', p_got);
  end if;
  fx := town.hoe_fx(p_tool);
  paid := town.tool_paid(p_before, p_after, p_now, p_tool, fx, 'hoFresh');
  if town.stamina_of(p_before, p_now) <= 0 and (fx->>'grip')::boolean then
    used := town.use_power(paid, p_tool, 'hoGrip', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; end if;
  end if;
  if p_deed = 'clear' and p_plot->>'soil' = 'cleared' and (fx->>'both')::boolean then
    used := town.use_power(paid, p_tool, 'hoBoth', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; both_ := true; end if;
  end if;
  tilled := p_deed = 'till' or both_;
  if tilled and (fx->>'wet')::boolean then
    used := town.use_power(paid, p_tool, 'hoWet', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; damp_ := true; end if;
  end if;
  if both_ or damp_ then
    left_ := '{"soil": "tilled", "plant": null}'::jsonb || case when damp_ then '{"damp": true}'::jsonb else '{}'::jsonb end;
  end if;
  if tilled and (fx->>'worm')::double precision > 0 and town.luck_of('worm|' || p_key, p_now) < (fx->>'worm')::double precision and town.room(paid->'bag', 'worm') > 0 then
    paid := paid || jsonb_build_object('bag', town.put(paid->'bag', 'worm', 1));
    got_ := got_ || '[["worm", 1]]'::jsonb;
  end if;
  return jsonb_build_object('purse', paid, 'plot', left_, 'got', got_);
end;
$$;

-- sow, of a plot with `damp` on it: the plant as it is sown there.
create or replace function town.sow_damp(p_plant jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_plant || jsonb_build_object('boost', (p_plant->>'boost')::double precision + (town.cat('farming')->'water'->>'adds')::double precision * 60000::double precision, 'watered', p_now)
$$;

-- beside: what a deed done with a forged hoe or can does to the plots beside the one it was done to. `p_keys` the
-- plots of its row, `p_plots` those of them that are kept as they stood before the deed, `p_before` and `p_after`
-- the purse as the deed found it and as it left it, `p_owner` whose the bed is. Gives the purse with whatever was
-- counted, and the plots it changed by their keys.
create or replace function town.beside(p_key text, p_keys jsonb, p_plots jsonb, p_deed text, p_before jsonb, p_after jsonb, p_me text, p_now bigint, p_owner text, p_luck double precision default null)
returns jsonb language plpgsql stable
as $$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  nothing jsonb := jsonb_build_object('purse', p_after, 'plots', '{}'::jsonb);
  hoes boolean := coalesce(p_deed in ('clear', 'till'), false);
  hand_ text;
  tool jsonb;
  fx jsonb;
  x0 integer;
  chance double precision;
  rains boolean;
  want jsonb;
  struck boolean;
  did jsonb;
  more double precision;
  rained jsonb;
  out_ jsonb := '{}'::jsonb;
  k text;
begin
  if (not hoes and p_deed is distinct from 'water') or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_key) then return nothing; end if;
  hand_ := town.hand_of(p_before);
  tool := town.hand_stack(p_before);
  if not town.forged(tool) then return nothing; end if;
  fx := case when hoes then town.hoe_fx(tool) else town.can_fx(tool) end;
  chance := (fx->>'next')::double precision;
  rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false);
  if not chance > 0 and not rains then return nothing; end if;
  x0 := split_part(p_key, ',', 1)::integer;
  select jsonb_agg(q.key_ order by q.far, q.x) into want
    from (select w.key_, abs(split_part(w.key_, ',', 1)::integer - x0) as far, split_part(w.key_, ',', 1)::integer as x
            from jsonb_array_elements_text(p_keys) as w(key_)
           where w.key_ <> p_key and town.deed_for(w.key_, coalesce(p_plots->w.key_, wild), hand_, p_me, p_now, p_owner) = p_deed) q;
  if want is null then return nothing; end if;
  struck := coalesce(p_luck, town.luck_of('next|' || p_key, p_now)) < chance;
  if hoes then
    if not struck then return nothing; end if;
    did := town.hoe(want->>0, p_before, coalesce(p_plots->(want->>0), wild), hand_, p_now);
    return case when (did->>'ok')::boolean then jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(want->>0, did->'plot')) else nothing end;
  end if;
  more := town.watering_of(p_before, hand_, p_now, fx);
  if rains then rained := town.use_power(p_after, tool, 'cnRain', p_now); end if;
  if coalesce((rained->>'ok')::boolean, false) then
    for k in select t.key_ from jsonb_array_elements_text(want) with ordinality as t(key_, ord) order by t.ord loop
      out_ := out_ || jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
        || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more)));
    end loop;
    return jsonb_build_object('purse', rained->'purse', 'plots', out_);
  end if;
  if not struck then return nothing; end if;
  k := want->>0;
  return jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
    || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more))));
end;
$$;

-- What a watering's deed says more for the lines of work (lib/town/trial's farmDo, lib/town/line-points' countsOf).
create or replace function town.kind_doc(p_purse jsonb, p_deed text, p_plot jsonb, p_me text)
returns jsonb language plpgsql stable
as $$
declare
  n double precision;
begin
  if p_deed is distinct from 'water' or coalesce(p_plot->'plant'->>'by', p_me) = p_me or p_purse->>'hand' is distinct from 'can' or not town.bag_forged(p_purse->'bag', 'can') then return '{}'::jsonb; end if;
  n := (town.can_fx(town.hand_stack(p_purse))->>'kind')::double precision;
  return case when n > 0 then jsonb_build_object('kind', n) else '{}'::jsonb end;
end;
$$;

-- ─── 5c. The insects (lib/town/insects) ──────────────────────────────────

-- net and netMine, their end, with a forged net in the hand: the purse after the catch is paid for and in the bag,
-- and how many came.
create or replace function town.net_more(p_purse jsonb, p_tool jsonb, p_id text, p_n integer, p_cost double precision, p_luck double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  fx jsonb := town.net_fx(p_tool);
  n integer := p_n + case when p_luck < (fx->>'twin')::double precision and town.room(p_purse->'bag', p_id) > p_n then 1 else 0 end;
begin
  return jsonb_build_object('n', n,
    'purse', town.tool_paid(p_purse, town.spend(p_purse, p_cost, p_now), p_now, p_tool, fx, 'ntFresh') || jsonb_build_object('bag', town.put(p_purse->'bag', p_id, n)));
end;
$$;

-- The catalog's row of the insects as `town.comeback` is handed it after a catch made with the net in a hand: with
-- what that net's reader says of the kinds that come back (`rarer`), where it says anything; else null (the row as it is).
create or replace function town.net_cat(p_purse jsonb, p_ins jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k double precision;
begin
  if p_purse->>'hand' is distinct from 'bugNet' or not town.bag_forged(p_purse->'bag', 'bugNet') then return null; end if;
  k := (town.net_fx(town.hand_stack(p_purse))->>'rare')::double precision;
  return case when k > 1 then p_ins || jsonb_build_object('rarer', k) end;
end;
$$;

-- netMore: what the reader says of the net in a member's hand, its `reach` and its `wide` together; nothing, with
-- a net as it was bought and with anything else in the hand. `town.net` and `town.net_mine` add it to the bound
-- their `far` is told by.
create or replace function town.net_more_far(p_purse jsonb)
returns double precision language plpgsql stable
as $$
declare
  fx jsonb;
begin
  if p_purse->>'hand' is distinct from 'bugNet' or not town.bag_forged(p_purse->'bag', 'bugNet') then return 0; end if;
  fx := town.net_fx(town.hand_stack(p_purse));
  return (fx->>'reach')::double precision + (fx->>'wide')::double precision;
end;
$$;

-- ─── 5d. The kitchen (lib/town/cooking, lib/town/stamina) ────────────────

-- potMarks: what a pot of food carries from its cookware, as it is kept on a pot and on a slot of the bag alike.
create or replace function town.pot_marks(p_from jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_from->'warm') = 'number' and (p_from->>'warm')::numeric > 0 then jsonb_build_object('warm', p_from->'warm') else '{}'::jsonb end
      || case when jsonb_typeof(p_from->'scent') = 'number' and (p_from->>'scent')::numeric > 0 then jsonb_build_object('scent', p_from->'scent') else '{}'::jsonb end
$$;

-- The forged cookware a pot is begun with: the stack in the hand, where it is the thing the first of the cooks holds.
create or replace function town.cook_held(p_purse jsonb, p_crew jsonb)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb;
begin
  if jsonb_typeof(p_crew->0) is distinct from 'string' or p_crew->>0 not in ('pot', 'pan', 'grill') or not town.bag_forged(p_purse->'bag', p_crew->>0) then return null; end if;
  s := town.hand_stack(p_purse);
  return case when s->>'item' = p_crew->>0 and town.forged(s) then s end;
end;
$$;

-- cook, of a dish, with forged cookware: the options it counts, and what the pot has more. `p_made`: whether the
-- dish is a recipe's. Gives the purse, how many helpings more, and the pot's marks.
create or replace function town.cook_more(p_spent jsonb, p_tool jsonb, p_fx jsonb, p_made boolean, p_luck double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  spent jsonb := p_spent;
  used jsonb;
  more integer := 0;
  warm_ double precision := 0;
  scent_ double precision := 0;
begin
  if p_made and (p_fx->>'big')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckBig', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; more := more + (p_fx->>'big')::integer; end if;
  end if;
  if p_luck < (p_fx->>'helping')::double precision then more := more + 1; end if;
  if p_made and (p_fx->>'warm')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckWarm', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; warm_ := (p_fx->>'warm')::double precision; end if;
  end if;
  if p_made and (p_fx->>'scent')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckScent', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; scent_ := (p_fx->>'scent')::double precision; end if;
  end if;
  return jsonb_build_object('purse', spent, 'more', more, 'marks', town.pot_marks(jsonb_build_object('warm', warm_, 'scent', scent_)));
end;
$$;

-- warmed: a meal's buffs with one of them lasting so many hours more.
create or replace function town.warmed(p_up jsonb, p_id text, p_hours double precision, p_now bigint, p_was jsonb)
returns jsonb language plpgsql stable
as $$
declare
  st jsonb := town.cat('stamina');
  most double precision;
  buffs jsonb;
  mine jsonb;
begin
  if not coalesce(p_hours > 0, false) then return p_up; end if;
  most := p_now + ((st->>'hours')::double precision + p_hours) * 3600000::double precision;
  select coalesce(jsonb_agg(case when b.v->>'id' = p_id then b.v || jsonb_build_object('until', least(most, (b.v->>'until')::double precision + p_hours * 3600000::double precision)) else b.v end order by b.ord), '[]'::jsonb)
    into buffs from jsonb_array_elements(coalesce(p_up->'buffs', '[]'::jsonb)) with ordinality b(v, ord);
  select b.v into mine from jsonb_array_elements(buffs) with ordinality b(v, ord) where b.v->>'id' = p_id order by b.ord limit 1;
  return jsonb_build_object('buffs', buffs,
    'buff', case when mine is not null and st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', mine->'until') else coalesce(p_up->'buff', p_was, 'null'::jsonb) end);
end;
$$;

-- ─── 6. Functions of earlier files, each with its marked lines ───────────
--
-- Each place below is empty here and is filled, when the file is put together and when the part is tried, with the
-- function's own text as the database then has it and the lines of v174.tools.lines.mjs in place (build-v164.mjs).
-- `town.work_counts_of` is built on the text the smith's part of this file leaves: this part comes after it.

-- fishing
-- <town.strike_window>
-- </town.strike_window>

-- <public.town_cast>
-- </public.town_cast>

-- <public.town_strike>
-- </public.town_strike>

-- <town.strike_two>
-- </town.strike_two>

-- <public.town_land>
-- </public.town_land>

-- <town.land_one>
-- </town.land_one>

-- the farm
-- <town.tend>
-- </town.tend>

-- <town.water>
-- </town.water>

-- <town.sow>
-- </town.sow>

-- <town.chore>
-- </town.chore>

-- <town.chore_for>
-- </town.chore_for>

-- <town.pour_for>
-- </town.pour_for>

-- <public.town_tend>
-- </public.town_tend>

-- <public.town_row>
-- </public.town_row>

-- <public.town_farm>
-- </public.town_farm>

-- <town.work_counts_of>
-- </town.work_counts_of>

-- the insects
-- <town.net>
-- </town.net>

-- <town.net_mine>
-- </town.net_mine>

-- <town.comeback>
-- </town.comeback>

-- <public.town_net>
-- </public.town_net>

-- the kitchen
-- <town.cook>
-- </town.cook>

-- <town.set_down>
-- </town.set_down>

-- <town.take_up>
-- </town.take_up>

-- <town.feast_eat>
-- </town.feast_eat>

-- <town.chew>
-- </town.chew>

-- <town.pot_doc>
-- </town.pot_doc>

-- <public.town_pot_down>
-- </public.town_pot_down>

-- ─── Who may ─────────────────────────────────────────────────────────────
-- (No function a member calls is new here: each of those written again keeps who may call it, as `create or replace`
-- keeps it. The rules of schema `town` are nobody's to call.)

revoke execute on all functions in schema town from public, anon, authenticated;
