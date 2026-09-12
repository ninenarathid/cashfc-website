-- v61 — an invitation holds nothing, including a place
--
-- Run this once in the Supabase SQL editor, after v60.
--
-- An invitation was already not a seat: v47 moved the chair out of it so a
-- lead could ask three people about D4 instead of one. What it still was, by
-- accident, was a member — counted in the party, drawn in the grid, subtracted
-- from what the party was short of. The Epic of Alexander had four people in
-- it and six invitations out, and announced itself to the Free Company as
-- "10/6, full" with two seats standing empty. The half of that fix outside the
-- database has landed; this is the half inside it.
--
-- Which leaves the question that only matters once invitations stop holding
-- anything: what happens when the party fills up while somebody is deciding.
-- The answer is the simple one. They have missed it. An invitation is an
-- invitation, not a reservation — first to say yes gets the place, and a lead
-- who asks six people for two seats has asked six people for two seats.

/**
 * Say yes to an invitation, if there is still room to say yes to.
 *
 * v47's function with one question added in front of it. Everything else is
 * as it was: the seat named in the flex is claimed where it is free, the
 * unique index decides who gets it when two people answer at once, and
 * whoever loses comes in without a chair rather than being turned away.
 *
 * Full is counted in answered members only, which is the same count the board
 * shows and the whole point of the change: six people thinking about it do not
 * make a party of four into a party of ten.
 *
 * A party with no seats — a hunt train, a map night — is never full. There is
 * nothing to fill.
 */
create or replace function public.party_accept(p_member bigint)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.party_members;
  p public.party_posts;
  want text;
  room integer;
  taken integer;
begin
  select * into m from public.party_members where id = p_member;
  if m.id is null then return 'gone'; end if;

  -- Only the person invited may accept it. A security definer function sees
  -- past every policy, so the check the policies would have made is made here.
  if not exists (
    select 1 from public.profiles f
     where f.id = auth.uid()
       and f.character_id is not distinct from m.character_id
       and f.character_verified_at is not null
  ) then
    raise exception 'that invitation is not yours';
  end if;

  -- Answering twice is a button that has not redrawn yet, not a thing to fail.
  if m.confirmed_at is not null then return 'seat'; end if;

  select * into p from public.party_posts where id = m.party_id;
  if p.id is null then return 'gone'; end if;

  room := case p.shape
            when 'light' then 4
            when 'four' then 4
            when 'full' then 8
            when 'eight' then 8
            when 'alliance' then 24
            else 0
          end - coalesce(array_length(p.closed, 1), 0);

  if room > 0 then
    select count(*) into taken
      from public.party_members x
     where x.party_id = m.party_id and x.confirmed_at is not null;
    if taken >= room then
      return 'full';
    end if;
  end if;

  want := m.flex -> 'seats' ->> 0;

  if want is not null then
    begin
      update public.party_members
         set seat = want, flex = null, confirmed_at = now()
       where id = p_member;
      return 'seat';
    exception when unique_violation then
      -- Somebody else sat down first, between the read and the write.
      null;
    end;
  end if;

  update public.party_members set confirmed_at = now() where id = p_member;
  return 'flex';
end;
$fn$;

grant execute on function public.party_accept(bigint) to authenticated;

/* ── and the picture says the same ──────────────────────────────────────── */

/**
 * The card's roster, with everybody who has not answered left out of it.
 *
 * v59 took the requests out of this and left the invitations in, on the
 * reasoning that an invitation is in the party because the lead put it there.
 * That reasoning is what this migration has just retired: an invitation is a
 * question, from whichever end it was asked. Left in, the card drawn for
 * Discord runs the site's own resolver over six maybes and announces a full
 * raid that has four people in it — on the one picture the whole Free Company
 * sees.
 *
 * One condition now instead of two, and a simpler one: answered, or not on the
 * card. seats_taken already counted only the answered and is untouched.
 */
create or replace function public.party_card(p_id bigint)
returns table (
  content_key      text,
  note             text,
  shape            text,
  starts_at        timestamptz,
  length_minutes   integer,
  length_unit      text,
  runs             integer,
  roulettes        text[],
  owner_name       text,
  seats_total      integer,
  seats_taken      integer,
  progress         jsonb,
  loot             jsonb,
  spot             jsonb,
  maps             jsonb,
  rules            jsonb,
  closed           text[],
  one_of_each_job  boolean,
  members          jsonb
)
language sql
stable
security definer
set search_path = public
as $card$
  select
    p.content_key,
    p.note,
    p.shape,
    p.starts_at,
    p.length_minutes,
    p.length_unit,
    p.runs,
    p.roulettes,
    coalesce(o.character_name, o.display_name, o.discord_username),
    case p.shape
      when 'light' then 4
      when 'four' then 4
      when 'full' then 8
      when 'eight' then 8
      when 'alliance' then 24
      -- A hunt train holds everybody, so "n of nothing" is the honest answer
      -- and the card says how many are coming instead of how full it is.
      else 0
    end,
    (select count(*)::int from public.party_members m
      where m.party_id = p.id and m.confirmed_at is not null),
    p.progress,
    p.loot,
    p.spot,
    p.maps,
    p.rules,
    p.closed,
    p.one_of_each_job,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'seat', m.seat,
               'character_id', m.character_id,
               'name', m.name,
               'avatar', m.avatar,
               'job', m.job,
               'flex', m.flex,
               'confirmed_at', m.confirmed_at)
             order by m.id)
        from public.party_members m
       where m.party_id = p.id
         and m.confirmed_at is not null
    ), '[]'::jsonb)
  from public.party_posts p
  left join public.profiles o on o.id = p.owner
  where p.id = p_id and p.deleted_at is null;
$card$;

grant execute on function public.party_card(bigint) to anon, authenticated;
