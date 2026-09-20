-- v86 — how good a rare is, also the keeper's to set
--
-- Run this once in the Supabase SQL editor. It needs v83.
--
-- v83 put how *often* a popoto comes up rare into the keeper's hands and left
-- how *good* it turns out written into the function: ultra 5, super 25, rare
-- 70, of the two in a hundred that come up rare at all. That makes an ultra
-- one popoto in a thousand.
--
-- In the five days since the switch went on the Free Company sent 1,589
-- popotos that could have been rare — self-gifts are counted and never rare,
-- so they are not in that. Twenty-five came up rare: nineteen R, six SR, no
-- ultra. Nothing is broken. 1,589 rolls at one in a thousand expects 1.6
-- ultras and comes up empty about one time in five, and both ultra flavours
-- — เวย์โปรตีน and ชาบูหม่าล่า — are active with their lines written, so the
-- draw can reach them. It is the odds that are the problem, not the code: a
-- tier the whole FC has been told about and nobody has ever seen is a tier
-- that may as well not be there.
--
-- So the shares move next to the chance, where the keeper can reach them
-- without anybody running SQL again: ultra_pct and super_pct on the switch
-- row, rare taking whatever is left, which is why rare has no column of its
-- own — three numbers that must add to a hundred are two numbers.
--
-- 12 and 28 to start with. At the pace above that is an ultra about every
-- thirty hours instead of every three and a half days, and a super about
-- twice a day. How many rares arrive does not change — chance_pct is
-- untouched, still 2.00 and still six or so a day — only which ones they are.
--
-- The roll is otherwise v83's, self-gifts and all, including the step down to
-- a tier that actually has a flavour with a line in it.

alter table public.popoto_rare_switch
  add column if not exists super_pct numeric(5,2) not null default 28.00
    check (super_pct >= 0 and super_pct <= 100),
  add column if not exists ultra_pct numeric(5,2) not null default 12.00
    check (ultra_pct >= 0 and ultra_pct <= 100);

-- Rare is the remainder, so the other two may not eat more than there is.
alter table public.popoto_rare_switch
  drop constraint if exists popoto_rare_switch_shares_fit;
alter table public.popoto_rare_switch
  add constraint popoto_rare_switch_shares_fit
  check (super_pct + ultra_pct <= 100);

-- The defaults only reach a row that does not exist yet; this is for the one
-- that does. Running v86 twice puts the odds back to 28/12, which is the
-- honest reading of running a migration again.
update public.popoto_rare_switch
   set super_pct = 28.00, ultra_pct = 12.00
 where id = 1;

grant update (enabled, chance_pct, super_pct, ultra_pct, changed_at, changed_by)
  on public.popoto_rare_switch to authenticated;

/**
 * v83's roll, asking the switch which tier as well as how often and whether.
 *
 * One read of the row for all three, as before. A tier at 0 is a tier that
 * never comes up — a legitimate thing to want while its flavours are being
 * written — and ultra at 0 simply means the roll starts at super.
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
  ultra_share numeric;
  super_share numeric;
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

  -- The old fixed split is the fallback, so a database that has the function
  -- but not the columns behaves as it did rather than never leaving rare.
  ultra_share := coalesce(sw.ultra_pct, 5);
  super_share := coalesce(sw.super_pct, 25);

  roll := random() * 100;
  rolled := case when roll < ultra_share then 'ultra'
                 when roll < ultra_share + super_share then 'super'
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
