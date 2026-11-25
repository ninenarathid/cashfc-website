-- v350 — two ways to play a mechanic, and whose picture it is
--
-- Run this once in the Supabase SQL editor, after v349. Running it again is
-- safe.
--
-- The owner, 2026-11-25, on the Extreme guides:
--
--   "Ex3 Ex6 จะมีแผน cheat อยู่ … ให้ทำเป็น tab เลือกวิธีเล่นได้สองแผน ใน mech นั้นๆ"
--
-- Some mechanics are played two ways: game8's plan, and a shortcut players use
-- instead. The page shows them as tabs inside that mechanic's box. A step now
-- says which way of playing it belongs to:
--
--   guide_steps  plan, plan_en  the tab's name, in Thai and in English
--
-- A step with no plan belongs to every way (what both share); the steps of one
-- mechanic with a plan are shown under their tab only. Steps with no mechanic
-- ignore it. Up to 40 characters, as a tab must stay short on a phone.
--
--   "ใช้รูปของวิดิโอได้ทั้งสองคน เขียน credit แนบลิงค์ให้ด้วย"
--
-- Pictures taken from a creator's video (Hamukatsu's, Nukemaru's) carry who
-- made it and a link back to the video at that moment. Every picture list
-- (a step's refs, the unlock maps, the cheatsheet pictures, a reward's
-- pictures) is checked by guide_refs_ok, which now lets two more keys through:
--
--   by   the creator's name, up to 60 characters
--   url  https only, no spaces, quotes or angle brackets, up to 300
--
-- The page draws `url` as a link, so the check is what keeps a `javascript:`
-- address out even though only admins write guides; the page checks it again.
-- The rest of guide_refs_ok is v346's, unchanged.

/* ── which way of playing a step belongs to ──────────────────────────────── */

alter table public.guide_steps add column if not exists plan text
  check (plan is null or char_length(plan) between 1 and 40);
alter table public.guide_steps add column if not exists plan_en text
  check (plan_en is null or char_length(plan_en) between 1 and 40);

/* ── a picture's maker and the way back to the video ─────────────────────── */

create or replace function public.guide_refs_ok(r jsonb)
returns boolean
language sql
immutable
as $fn$
  select r is not null
     and jsonb_typeof(r) = 'array'
     and jsonb_array_length(r) <= 4
     and not exists (
       select 1
         from jsonb_array_elements(r) as e(v)
        where jsonb_typeof(e.v) <> 'object'
           or exists (select 1 from jsonb_object_keys(e.v) as k(name)
                       where k.name not in ('path', 'w', 'h', 'say', 'say_en', 'by', 'url'))
           or jsonb_typeof(e.v -> 'path') is distinct from 'string'
           or (e.v ->> 'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'
           or jsonb_typeof(e.v -> 'w') is distinct from 'number'
           or jsonb_typeof(e.v -> 'h') is distinct from 'number'
           or (e.v ? 'say' and (jsonb_typeof(e.v -> 'say') <> 'string'
                                or char_length(e.v ->> 'say') > 160))
           or (e.v ? 'say_en' and (jsonb_typeof(e.v -> 'say_en') <> 'string'
                                   or char_length(e.v ->> 'say_en') > 160))
           or (e.v ? 'by' and (jsonb_typeof(e.v -> 'by') <> 'string'
                               or char_length(e.v ->> 'by') not between 1 and 60))
           or (e.v ? 'url' and (jsonb_typeof(e.v -> 'url') <> 'string'
                                or char_length(e.v ->> 'url') > 300
                                or (e.v ->> 'url') !~ '^https://[A-Za-z0-9.-]+(/[^[:space:]"''<>]*)?$'))
     );
$fn$;

/* ── who may write them: admins, as for every other step column ──────────── */

grant insert (plan, plan_en) on public.guide_steps to authenticated;
grant update (plan, plan_en) on public.guide_steps to authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'guide_steps'
   and column_name in ('plan', 'plan_en')
 order by 1;
--  plan
--  plan_en

select public.guide_refs_ok('[{"path": "0b9c1f2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f/g-1764000000000-abcd.webp", "w": 1, "h": 1, "by": "Nukemaru", "url": "https://youtu.be/sP2Ljn2Y2NA?t=264"}]') as credited,
       public.guide_refs_ok('[{"path": "0b9c1f2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f/g-1764000000000-abcd.webp", "w": 1, "h": 1, "url": "javascript:alert(1)"}]') as script_link;
--  true | false

select count(*) as steps_with_a_plan from public.guide_steps where plan is not null;
--  0 (until a guide is given a second way to play)
*/
