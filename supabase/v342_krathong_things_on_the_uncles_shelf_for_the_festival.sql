-- v342: the krathong's things the village has not opened yet, on the uncle's shelf for the festival (Cash Town)
--
-- The owner, 2026-11-24: a member could not find sticky rice (the uncle's 49th thing; the village has opened 48, and
-- banana leaf is the 51st); "เปิดขายชั่วคราวเฉพาะเทศกาลก่อนได้ไหม", "แก้เร็วๆก่อน".
--
-- 1. rules.shop_extra of Loy Krathong 2026: banana leaf, sticky rice, the lure and the float bell, the things of its
--    parts the shop lists but has not opened yet (a row he may change).
-- 2. town.shelf_of(unlocked): the shelf as it was, and after it a published festival's `shop_extra` while its making or
--    its float is open (to 26 Nov 05:00 Bangkok); each at the shop's own price (town.cat('goods')). Buying, the stall,
--    the notice board's things all read the shelf from here, so all of them have them for that while and none after.
--    The village's own count (`unlocked`) is untouched.
-- Needs v336. Runs twice without harm.

begin;
do $$ begin
  if to_regclass('public.town_festivals') is null then raise exception 'Run v336 before v342'; end if;
end $$;

update public.town_festivals
   set rules = rules || jsonb_build_object('shop_extra', '["bananaLeaf", "stickyRice", "lure", "floatBell"]'::jsonb)
 where slug = 'loykrathong' and year = 2026;

create or replace function town.shelf_of(p_unlocked integer)
 returns jsonb
 language sql
 stable
as $function$
  with s as (
    select (town.cat('shelf')->'basic') || coalesce((
      select jsonb_agg(u order by ord) from jsonb_array_elements(town.cat('shelf')->'unlocks') with ordinality x(u, ord)
       where ord <= greatest(0, p_unlocked)), '[]'::jsonb) as shelf)
  select s.shelf || coalesce((
    select jsonb_agg(distinct e)
      from public.town_festivals f, jsonb_array_elements(coalesce(f.rules->'shop_extra', '[]'::jsonb)) e
     where f.published
       and (town.festival_open(f.windows, 'make', town.festival_now()) or town.festival_open(f.windows, 'float', town.festival_now()))
       and town.cat('goods') ? (e #>> '{}')
       and not s.shelf @> jsonb_build_array(e)), '[]'::jsonb)
  from s
$function$;

notify pgrst, 'reload schema';
commit;

-- Afterwards (each should say what is written beside it):
-- select rules->'shop_extra' from public.town_festivals where id = 1;   -- ["bananaLeaf", "stickyRice", "lure", "floatBell"]
-- select town.shelf_of(48) ? 'stickyRice', town.shelf_of(48) ? 'bananaLeaf';   -- t | t   (until 26 Nov 05:00)
-- select jsonb_array_length(town.shelf_of(48)) - jsonb_array_length(town.shelf_of(0));   -- 52 (48 opened + 4 for the festival)
