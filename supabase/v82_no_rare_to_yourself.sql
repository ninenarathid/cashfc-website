-- v82 — a popoto to yourself is never rare
--
-- Run this once in the Supabase SQL editor, after v81.
--
-- A rare popoto is something one member gives another. Sending one to your own
-- character is allowed and still counts, as it always has, but it is not a way
-- to fill your own shelf: the roll does not happen, and the popoto is an
-- ordinary one.
--
-- "Yourself" is the character on the sender's own profile. The rest of the
-- roll is v79's, unchanged.

/**
 * v79's roll, with one more reason to stop before rolling: the popoto is going
 * to the sender's own character.
 *
 * Every rare field is still cleared first, so a forged rare sent to oneself is
 * thrown away like any other.
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

  -- To your own character: counted, never rare.
  if exists (
    select 1 from public.profiles p
     where p.id = new.sender_id
       and p.character_id = new.receiver_character_id
  ) then
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
