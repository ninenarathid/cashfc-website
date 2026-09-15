-- v79 — rare popoto has a switch
--
-- Run this once in the Supabase SQL editor, after v77.
--
-- The flavours and their lines are being written first, and nobody should be
-- able to unwrap one until all of them are in. So the roll has an off switch,
-- and it starts off: a popoto sent while it is off is an ordinary popoto,
-- however many flavours and lines are ready.
--
-- One row, the keeper's to read and flip — not the admins', for the same
-- reason the flavours are not (v77). Turning it on is one press and takes
-- effect on the next popoto sent.

create table if not exists public.popoto_rare_switch (
  id          smallint primary key default 1 check (id = 1),
  enabled     boolean not null default false,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references auth.users(id) on delete set null
);

insert into public.popoto_rare_switch (id, enabled) values (1, false)
on conflict (id) do nothing;

alter table public.popoto_rare_switch enable row level security;

drop policy if exists popoto_rare_switch_keeper_read on public.popoto_rare_switch;
create policy popoto_rare_switch_keeper_read on public.popoto_rare_switch
  for select to authenticated using (public.is_popoto_keeper());

drop policy if exists popoto_rare_switch_keeper_flip on public.popoto_rare_switch;
create policy popoto_rare_switch_keeper_flip on public.popoto_rare_switch
  for update to authenticated
  using (public.is_popoto_keeper()) with check (public.is_popoto_keeper());

grant select, update (enabled, changed_at, changed_by) on public.popoto_rare_switch to authenticated;

/**
 * v77's roll, asking the switch first.
 *
 * Otherwise unchanged: every rare field is still cleared first, so a switch
 * that is off also means a forged rare is thrown away.
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

  if not coalesce((select s.enabled from public.popoto_rare_switch s where s.id = 1), false) then
    return new;
  end if;

  if random() >= 0.01 then
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
