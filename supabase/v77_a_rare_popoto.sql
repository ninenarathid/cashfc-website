-- v77 — a rare popoto
--
-- Run this once in the Supabase SQL editor, after v76.
--
-- A popoto is sent a thousand times a week and every one of them is the same
-- potato. One in a hundred now arrives wrapped, and is not an ordinary potato:
--
--   1. one in a hundred is rare at all
--   2. then how rare: Rare 70, Super rare 25, Ultra rare 5
--   3. then a flavour from that tier: orange, strawberry, grape, cola
--   4. then a line written for that flavour, from somebody in the FC
--
--   popoto_keepers      who looks after the flavours and the lines. Not the
--                       admins: one named person, added here and nowhere else.
--   popoto_flavors      the flavours, their tier, their colour and a picture.
--   popoto_blessings    the lines, each written for one flavour, and who in the
--                       FC it is from.
--   kudos.rare_*        what a particular popoto arrived as, copied onto it.
--                       Editing or retiring a flavour or a line later changes
--                       nothing about a gift somebody already has.
--
-- The roll is made here, on the insert, and never by the page. A browser that
-- decided would be a browser anybody could tell to decide yes.

/* ── who keeps them ──────────────────────────────────────────────────────── */

/*
 * A table of its own rather than a flag on the profile, and not is_admin().
 *
 * The flavours and lines are a surprise, and the person making them wants
 * them kept from everybody else who runs the site too. A column on profiles
 * would be writable by any admin — the admin panel already edits other
 * people's profiles — so any admin could make themselves a keeper. This table
 * has no write policy at all: somebody is added to it here, in the SQL editor,
 * by somebody holding the database.
 */
create table if not exists public.popoto_keepers (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  added_at   timestamptz not null default now()
);

alter table public.popoto_keepers enable row level security;

-- Each person may ask whether they are one; nobody may read the list.
drop policy if exists popoto_keepers_self on public.popoto_keepers;
create policy popoto_keepers_self on public.popoto_keepers
  for select to authenticated using (popoto_keepers.profile_id = auth.uid());

grant select on public.popoto_keepers to authenticated;

create or replace function public.is_popoto_keeper()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (select 1 from public.popoto_keepers k where k.profile_id = auth.uid());
$fn$;

-- Ninenine The'phantom.
insert into public.popoto_keepers (profile_id)
select p.id from public.profiles p where p.character_id = 5644067
on conflict (profile_id) do nothing;

/* ── the flavours ────────────────────────────────────────────────────────── */

create table if not exists public.popoto_flavors (
  id          bigserial primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  name_en     text,
  tier        text not null check (tier in ('rare', 'super', 'ultra')),
  -- The flavour's colour: the glow, the ring on the shelf, and the tint on the
  -- stand-in potato until somebody uploads its picture.
  color       text not null default '#f3c969' check (color ~ '^#[0-9a-fA-F]{6}$'),
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.popoto_flavors enable row level security;

drop policy if exists popoto_flavors_keeper_read on public.popoto_flavors;
create policy popoto_flavors_keeper_read on public.popoto_flavors
  for select to authenticated using (public.is_popoto_keeper());

drop policy if exists popoto_flavors_keeper_add on public.popoto_flavors;
create policy popoto_flavors_keeper_add on public.popoto_flavors
  for insert to authenticated with check (public.is_popoto_keeper());

drop policy if exists popoto_flavors_keeper_edit on public.popoto_flavors;
create policy popoto_flavors_keeper_edit on public.popoto_flavors
  for update to authenticated
  using (public.is_popoto_keeper()) with check (public.is_popoto_keeper());

grant select, insert, update on public.popoto_flavors to authenticated;
grant usage on sequence public.popoto_flavors_id_seq to authenticated;

/* ── the lines ───────────────────────────────────────────────────────────── */

create table if not exists public.popoto_blessings (
  id                  bigserial primary key,
  -- The flavour it was written for. An orange line inside a grape potato
  -- would be two things that do not belong together.
  flavor_id           bigint not null references public.popoto_flavors(id) on delete cascade,
  body                text not null
                        check (char_length(btrim(body)) between 1 and 300),
  -- Who in the FC it is from. The character where they have one on the site,
  -- and the name always, so a line outlives the member's account.
  author_character_id bigint,
  author_name         text not null check (char_length(btrim(author_name)) > 0),
  active              boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists popoto_blessings_for on public.popoto_blessings (flavor_id);

alter table public.popoto_blessings enable row level security;

drop policy if exists popoto_blessings_keeper_read on public.popoto_blessings;
create policy popoto_blessings_keeper_read on public.popoto_blessings
  for select to authenticated using (public.is_popoto_keeper());

drop policy if exists popoto_blessings_keeper_add on public.popoto_blessings;
create policy popoto_blessings_keeper_add on public.popoto_blessings
  for insert to authenticated with check (public.is_popoto_keeper());

drop policy if exists popoto_blessings_keeper_edit on public.popoto_blessings;
create policy popoto_blessings_keeper_edit on public.popoto_blessings
  for update to authenticated
  using (public.is_popoto_keeper()) with check (public.is_popoto_keeper());

grant select, insert, update on public.popoto_blessings to authenticated;
grant usage on sequence public.popoto_blessings_id_seq to authenticated;

/* ── the popoto it arrives on ────────────────────────────────────────────── */

alter table public.kudos
  add column if not exists rare_tier text
    check (rare_tier is null or rare_tier in ('rare', 'super', 'ultra')),
  add column if not exists rare_flavor_id bigint
    references public.popoto_flavors(id) on delete set null,
  add column if not exists rare_flavor_name text,
  add column if not exists rare_flavor_name_en text,
  add column if not exists rare_flavor_color text,
  add column if not exists rare_flavor_image text,
  add column if not exists rare_blessing_id bigint
    references public.popoto_blessings(id) on delete set null,
  add column if not exists rare_body text,
  add column if not exists rare_author_name text,
  add column if not exists rare_author_character_id bigint,
  add column if not exists rare_opened_at timestamptz;

create index if not exists kudos_rare_for
  on public.kudos (receiver_character_id, created_at)
  where rare_body is not null;

/**
 * One in a hundred, then how rare, then which flavour, then its line.
 *
 * Every rare field is cleared first, whatever the insert carried: the send
 * policy checks who is sending and nothing else, so without this a client
 * could hand in a rare of its own writing.
 *
 * Only a flavour with at least one line in use can be picked, because the line
 * is what is inside. A tier with no such flavour steps down to the next one
 * that has one — an Ultra rare rolled before any Ultra flavour has a line
 * arrives as the best flavour there is, recorded as the tier it really is.
 * With nothing ready anywhere, the popoto is simply an ordinary one.
 *
 * SECURITY DEFINER because the flavours and lines are the keeper's reading and
 * the sender almost never is.
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

drop trigger if exists kudos_roll_rare on public.kudos;
create trigger kudos_roll_rare
  before insert on public.kudos
  for each row execute function public.kudos_roll_rare();

/**
 * The notification says it is wrapped.
 *
 * The ordinary popoto notification is written by an existing trigger on this
 * same insert. Triggers of the same kind fire in name order, so this one is
 * named to come last and turns that notification into a gift rather than
 * adding a second one beside it — one potato, one line in the bell. Where no
 * ordinary notification was written (the receiver has no account, or the
 * other trigger changes), it writes its own.
 *
 * The body carries the popoto's id, which is how the bell finds what to unwrap.
 */
create or replace function public.kudos_rare_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  who uuid;
  sender_name text;
begin
  if new.rare_body is null then
    return null;
  end if;

  update public.notifications nt
     set kind = 'popoto_rare',
         body = new.id::text
   where nt.kind = 'popoto'
     and nt.actor = new.sender_id
     and nt.created_at = new.created_at
     and nt.recipient in (
       select p.id from public.profiles p
        where p.character_id = new.receiver_character_id
     );
  if found then
    return null;
  end if;

  select p.id into who from public.profiles p
   where p.character_id = new.receiver_character_id
   limit 1;
  if who is null then
    return null;
  end if;
  select coalesce(p.character_name, p.display_name, p.discord_username, '—')
    into sender_name
    from public.profiles p where p.id = new.sender_id;

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  values (who, 'popoto_rare', new.sender_id, coalesce(sender_name, '—'), new.id::text);
  return null;
end;
$fn$;

drop trigger if exists zz_kudos_rare_notify on public.kudos;
create trigger zz_kudos_rare_notify
  after insert on public.kudos
  for each row execute function public.kudos_rare_notify();

/**
 * Unwrapping one: only by the person it was sent to.
 *
 * Stamps the first opening and hands back the gift. Opening it again later —
 * from the shelf on their profile — is the same call and does not move the
 * stamp.
 */
drop function if exists public.open_rare_popoto(bigint);
create or replace function public.open_rare_popoto(p_kudos bigint)
returns table (
  id bigint, body text, author_name text, author_character_id bigint,
  sender_id uuid, created_at timestamptz, opened_at timestamptz,
  tier text, flavor_name text, flavor_name_en text, flavor_color text,
  flavor_image text
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 from public.kudos k
      join public.profiles p on p.character_id = k.receiver_character_id
     where k.id = p_kudos
       and k.rare_body is not null
       and p.id = auth.uid()
  ) then
    raise exception 'that gift is not yours to open'
      using errcode = 'insufficient_privilege';
  end if;

  update public.kudos k
     set rare_opened_at = coalesce(k.rare_opened_at, now())
   where k.id = p_kudos;

  return query
    select k.id, k.rare_body, k.rare_author_name, k.rare_author_character_id,
           k.sender_id, k.created_at, k.rare_opened_at,
           k.rare_tier, k.rare_flavor_name, k.rare_flavor_name_en,
           k.rare_flavor_color, k.rare_flavor_image
      from public.kudos k
     where k.id = p_kudos;
end;
$fn$;

revoke execute on function public.open_rare_popoto(bigint) from public;
revoke execute on function public.open_rare_popoto(bigint) from anon;
grant execute on function public.open_rare_popoto(bigint) to authenticated;
