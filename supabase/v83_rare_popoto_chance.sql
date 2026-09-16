-- v83 — how often a popoto is rare is a setting
--
-- Run this once in the Supabase SQL editor, after v82.
--
-- The one-in-a-hundred was written into the roll, so changing it meant
-- changing a function. It now sits beside the switch, in the keeper's hands:
-- 2.00 to start with, adjustable from the admin panel, and it takes effect on
-- the next popoto sent.
--
-- Kept as a percentage rather than a fraction because that is what the keeper
-- is thinking in, with two decimals so "one in a thousand" (0.10) is sayable.
-- The roll is otherwise v82's, self-gifts and all.

alter table public.popoto_rare_switch
  add column if not exists chance_pct numeric(5,2) not null default 2.00
    check (chance_pct >= 0 and chance_pct <= 100);

update public.popoto_rare_switch set chance_pct = 2.00 where id = 1;

grant update (enabled, chance_pct, changed_at, changed_by)
  on public.popoto_rare_switch to authenticated;

/**
 * v82's roll, asking the switch how often as well as whether.
 *
 * A chance of 0 is a switch that is on and never gives anything, which is a
 * legitimate thing to want for an evening; the row is read once for both.
 */
create or replace function public.kudos_roll_rare()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  f public.popoto_flavors;
  b public.popoto_blessings;
  sw public.popoto_rare_switch;
  roll double precision;
  rolled text;
  tiers text[];
  i int;
begin
  new.rare_tier := null;
  new.rare_flavor_id := null;
  new.rare_flavor_name := null;
  new.rare_flavor_name_en := null;
  new.rare_flavor_color := null;
  new.rare_flavor_image := null;
  new.rare_blessing_id := null;
  new.rare_body := null;
  new.rare_author_name := null;
  new.rare_author_character_id := null;
  new.rare_opened_at := null;

  select * into sw from public.popoto_rare_switch s where s.id = 1;
  if sw.id is null or not sw.enabled or coalesce(sw.chance_pct, 0) <= 0 then
    return new;
  end if;

  -- To your own character: counted, never rare.
  if exists (
    select 1 from public.profiles p
     where p.id = new.sender_id
       and p.character_id = new.receiver_character_id
  ) then
    return new;
  end if;

  if random() >= sw.chance_pct / 100.0 then
    return new;
  end if;

  roll := random();
  rolled := case when roll < 0.05 then 'ultra'
                 when roll < 0.30 then 'super'
                 else 'rare' end;

  -- Down from the tier rolled until one has a flavour with a line in it.
  tiers := case rolled when 'ultra' then array['ultra', 'super', 'rare']
                       when 'super' then array['super', 'rare']
                       else array['rare'] end;
  for i in 1 .. array_length(tiers, 1) loop
    select * into f
      from public.popoto_flavors pf
     where pf.active
       and pf.tier = tiers[i]
       and exists (
         select 1 from public.popoto_blessings pb
          where pb.flavor_id = pf.id and pb.active
       )
     order by random()
     limit 1;
    exit when f.id is not null;
  end loop;
  if f.id is null then
    return new;
  end if;

  select * into b
    from public.popoto_blessings pb
   where pb.flavor_id = f.id and pb.active
   order by random()
   limit 1;

  new.rare_tier := f.tier;
  new.rare_flavor_id := f.id;
  new.rare_flavor_name := f.name;
  new.rare_flavor_name_en := f.name_en;
  new.rare_flavor_color := f.color;
  new.rare_flavor_image := f.image_url;
  new.rare_blessing_id := b.id;
  new.rare_body := b.body;
  new.rare_author_name := b.author_name;
  new.rare_author_character_id := b.author_character_id;
  return new;
end;
$fn$;
