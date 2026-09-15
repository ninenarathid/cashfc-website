-- v81 — the rare popoto somebody chooses to show
--
-- Run this once in the Supabase SQL editor, after v80.
--
-- The gifts live in an inventory on the member's own edit-profile page, where
-- one not yet opened from the bell can be opened. Up to ten of the opened ones
-- can be put on show, and those are what their public profile carries — to
-- everybody, in the order they were chosen.
--
-- Only opened gifts: showing a parcel would be telling the Free Company what is
-- inside it before its owner has looked. Only the owner chooses, and ten at
-- most, and both are the database's rule rather than the page's.

alter table public.kudos
  add column if not exists rare_showcase smallint
    check (rare_showcase is null or rare_showcase between 1 and 10);

-- One gift per place on a member's shelf.
create unique index if not exists kudos_rare_showcase_place
  on public.kudos (receiver_character_id, rare_showcase)
  where rare_showcase is not null;

/**
 * Put these on show, in this order, and take everything else off.
 *
 * The whole shelf at once rather than one gift at a time: the order is part of
 * what is being said, and ten separate writes would pass through states where
 * two gifts claim the same place.
 *
 * Every id must be a rare popoto sent to the caller's own character and already
 * opened. Anything else refuses the whole call, so a shelf is never half what
 * was asked for.
 */
create or replace function public.set_rare_showcase(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me_char bigint;
  ids bigint[] := coalesce(p_ids, '{}');
  n int := coalesce(array_length(ids, 1), 0);
  i int;
begin
  select p.character_id into me_char
    from public.profiles p
   where p.id = auth.uid();
  if me_char is null then
    raise exception 'claim a character first' using errcode = 'insufficient_privilege';
  end if;
  if n > 10 then
    raise exception 'at most ten on show' using errcode = 'check_violation';
  end if;
  if n > (select count(distinct x) from unnest(ids) x) then
    raise exception 'the same gift twice' using errcode = 'check_violation';
  end if;
  if n > 0 and exists (
    select 1 from unnest(ids) x
     where not exists (
       select 1 from public.kudos k
        where k.id = x
          and k.receiver_character_id = me_char
          and k.rare_body is not null
          and k.rare_opened_at is not null
     )
  ) then
    raise exception 'only your own opened rare popoto can go on show'
      using errcode = 'insufficient_privilege';
  end if;

  update public.kudos k
     set rare_showcase = null
   where k.receiver_character_id = me_char
     and k.rare_showcase is not null;

  for i in 1 .. n loop
    update public.kudos k
       set rare_showcase = i
     where k.id = ids[i];
  end loop;
end;
$fn$;

revoke execute on function public.set_rare_showcase(bigint[]) from public;
revoke execute on function public.set_rare_showcase(bigint[]) from anon;
grant execute on function public.set_rare_showcase(bigint[]) to authenticated;
