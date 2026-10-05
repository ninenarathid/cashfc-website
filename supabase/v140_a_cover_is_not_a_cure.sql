-- v140 — a cover is not a cure
--
-- Run this once in the Supabase SQL editor, after v119 (which has run, as
-- has everything up to v138; it stands on nothing of v139, and the two may
-- run in either order). Running it again is safe.
--
-- Why. The owner, 2026-10-05, the afternoon the members found that a
-- ladybird put on a plant rid it of its pest:
--
--   "ช่วยทำให้ balance แบบนี้ แมลงที่หาง่ายกว่า จะทำให้ ยาไล่แมลง ไม่มีคนใช้เพราะทำยากกว่า"
--
-- Two kinds of thing are put on a plant against pests (`farming.tools`). A
-- CURE takes off a pest that is on it: the pest cure (a scroll, a pot,
-- chili, scallion and salt for two of them) and the archerfish. A COVER
-- keeps pests off it for a day: the pest-proof fertiliser, the lavender
-- sachet, the mosquitofish, and two insects, the ladybird and the mantis.
--
-- But a cover cured too. Whether a plant has a pest is not kept: it is
-- worked out from the hours gone by (v110's `town.pest_at`), and every
-- strike before a cover's end is passed over, the one that came before the
-- cover was put on with them. So whatever covered a plant took its pest
-- off as well, and kept it a day more. A ladybird, caught for a point of
-- stamina, did the work of the cure and of the fertiliser both. In the two
-- hours after the first member found it, ladybirds went on plants 32
-- times and mantises 3; since every deed has been written down (v121, the
-- night before), not one cure has been put on a plant.
--
-- What it does. A cover does not go on a plant that has a pest on it:
--
--   · `town.feed` (v110's) answers 'soil' for a thing of kind `guard` when
--     the plant has a pest, as it does when the plant is covered already.
--     The thing stays in the bag; nothing is spent.
--   · `town.deed_for` (v119's) does not offer it there, so the page offers
--     nothing for that tap (a plant that has ripened with its pest still
--     on it is offered to its owner for picking, as ever).
--
-- So a pest already on a plant is the cure's alone to take off, and a
-- plant rid of it (or one that never had one) is covered by any cover, for
-- a day, as before. What makes a plant grow goes on with a pest there or
-- not, as before. A ladybird's one chance in ten of taking a pest off some
-- plant when it is CAUGHT (v126) is as it was: that is the owner's own
-- design for it.
--
-- For all five covers, not the insects alone: the fertiliser costs about
-- what the cure costs to make and the mosquitofish is as easy as an insect
-- to come by, so with either still curing, the cure would stay unused.
--
-- Nothing is counted again. How a strike is counted is not touched, so a
-- plant that was covered while it had a pest, before this ran, is rid of
-- it still, for as long as that cover lasts and after.
--
-- The page has the same rule from the commit before this file (the map
-- offers nothing for a cover on a plant with a pest). The two may go out
-- in either order: a page from before it offers the deed, and is answered
-- that the plot is not ready for it.
--
-- It writes two functions again, each as it last ran but for the lines
-- meant (scripts/db/v140.lines.mjs: three lines more in the one, half a
-- line in the other; `node build-v140.mjs` writes them from the texts that
-- ran). No table, no catalog row, no number.

do $$
begin
  if to_regprocedure('town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)') is null then
    raise exception 'v119 has not run yet: what a hand may do to a plot (town.deed_for) is what this file writes again';
  end if;
end $$;

/* ── a cover on a plant: v110's, less a plant that has a pest ────────────── */

-- <feed>
create or replace function town.feed(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if kind not in ('feed', 'guard') or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean
     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed)
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || case when kind = 'feed' then jsonb_build_object('fed', p_now)
      else jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000) end),
    'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;
-- </feed>

/* ── what the hand is offered: v119's, the same ──────────────────────────── */

-- <deed_for>
create or replace function town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
returns text language plpgsql stable
as $$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now and not (seen->>'pest')::boolean then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$$;
-- </deed_for>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call, written again or not.
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   -- a pumpkin sown one morning long ago, which a pest struck at eight the next day (no weather is kept of then),
--   -- an hour into its pest, and somebody with a ladybird and a cure:
--   with x as (
--     select '133,4'::text as key, 1578362400000::bigint as an_hour_in,
--            jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'somebody', 'crop', 'pumpkin', 'sown', 1578265200000,
--              'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)) as plot,
--            town.fresh() || jsonb_build_object('bag', town.put(town.put(town.fresh()->'bag', 'ladybird', 1), 'pestCure', 1)) as purse)
--   select (town.see(key, plot, an_hour_in)->>'pest')::boolean as has_a_pest,
--          (town.feed(key, purse, plot, 'ladybird', an_hour_in)->>'ok')::boolean as a_ladybird_goes_on,
--          town.deed_for(key, plot, 'ladybird', 'me', an_hour_in, null) as a_ladybird_is_offered,
--          (town.cure(key, purse, plot, 'pestCure', an_hour_in)->>'ok')::boolean as a_cure_goes_on,
--          (town.feed(key, purse, plot, 'ladybird', 1578358800000 - 1)->>'ok')::boolean as a_ladybird_before_the_pest
--     from x;
--   -- true | false | (null) | true | true
--
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what has been put on plants, by what was in the hand, a day at a time (a cure is `cure`; a cover and what
--   -- makes a plant grow are both `feed`)
--   select date_trunc('day', d.at) as day, d.what, d.doc->>'with' as with_, count(*) as times, count(distinct d.member_id) as members
--     from public.town_deeds d where d.what in ('feed', 'cure') group by 1, 2, 3 order by 1 desc, 4 desc;
