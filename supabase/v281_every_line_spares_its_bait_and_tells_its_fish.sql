-- v281: two of the members' fishing reports (2026-10-13 and 14), in the database.
-- Run after v264. Safe to run twice (the second finds both functions written and changes nothing). The page may go
-- first or after: a page from before it shows two names and says nothing of a bait given back, as it does now.
--
-- 1. The rod's gem that may give the bait back (the topaz: "มีโอกาส 20% ได้เหยื่อคืน") drew its chance only for a line by
--    itself, or for the last fish of a cast of several lines: every other fish of such a cast ended in town.land_one,
--    which never drew it ("ลองด้วยเหยื่อ 40 อัน ไม่มีทริกเกอร์การได้เหยื่อคืนเลย"). Now each fish landed draws it, as
--    town.land_v258 draws it for a line by itself (lib/town/fishing's baitKept), and says so (`back`).
-- 2. With three lines out and the whispering float worn, only two fish were told ("ปลาที่โชว์เห็นมีแค่ 2"): the cast
--    tells the third line's too (`coming3`).
--
-- Each function is written again from its own live text with only those lines changed: the file reads the definition,
-- replaces each line meant (and stops if one of them is not there exactly once: then the function has moved since
-- v229 / v264, and this file is to be built again), and runs it back. Grants and owners stay as they are.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $v281$
declare
  d text;
  n integer;
  olds text[];
  news text[];
  o text;
begin
  -- ── 1. town.land_one (v229's): a landed fish of a cast of several lines may give its bait back ──
  d := replace(pg_get_functiondef('town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)'::regprocedure), chr(13), '');
  if position('v281' in d) > 0 then
    raise notice 'v281: town.land_one is written already';
  else
    olds := array[
$o1$  back jsonb;
begin$o1$,
$o2$    perform town.keep_purse(p_member, landed->'purse');
  elsif not suspect then$o2$,
$o3$'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);$o3$];
    news := array[
$n1$  back jsonb;
  -- v281: what the rod's gem gives back of a landed fish's bait, as for a line by itself (town.land_v258)
  rod_ jsonb;
  baited_ jsonb;
  kept_ boolean := false;
begin$n1$,
$n2$    perform town.keep_purse(p_member, landed->'purse');
    -- v281: lib/town/fishing's baitKept, for each fish of the cast and not only the last: the forged rod's chance
    if fish is not null and cat->'baits' ? (p_line->>'bait') then
      rod_ := town.rod_held(p_purse);
      if rod_ is not null and random() < (town.rod_fx(rod_)->>'keeps')::double precision then
        baited_ := town.back_bait(landed->'purse', p_line->>'bait');
        kept_ := town.held(baited_->'bag', p_line->>'bait') > town.held(landed->'purse'->'bag', p_line->>'bait');
        perform town.keep_purse(p_member, baited_);
      end if;
    end if;
  elsif not suspect then$n2$,
$n3$'back', (back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait')) or kept_, 'more', true);$n3$];
    for i in 1 .. array_length(olds, 1) loop
      -- (a file checked out on Windows has CR at its line ends, and so have these lines: the definition is read without)
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v281: town.land_one has % of the lines it changes ("%"), not one: it has moved since v229, rebuild v281', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;

  -- ── 2. public.town_cast (v264's): the third line's fish told, with three lines out ──
  d := replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure), chr(13), '');
  if position('v281' in d) > 0 then
    raise notice 'v281: public.town_cast is written already';
  else
    olds := array[
$o4$|| case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));$o4$];
    news := array[
$n4$|| case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end
    -- v281: and the third line's, with three out
    || case when pair and town.wearing(purse, 'charmFloat') and jsonb_array_length(coalesce(line->'others', '[]'::jsonb)) > 1 then jsonb_build_object('coming3', line->'others'->1->>'what') else '{}'::jsonb end));$n4$];
    for i in 1 .. array_length(olds, 1) loop
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v281: public.town_cast has % of the lines it changes ("%"), not one: it has moved since v264, rebuild v281', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;
end
$v281$;

commit;

-- What it should say afterwards (each true):
--   select position('v281' in pg_get_functiondef('town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)'::regprocedure)) > 0,
--          position('coming3' in pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure)) > 0;
