-- v80 — the parcel is the notification
--
-- Run this once in the Supabase SQL editor, after v79.
--
-- v77 turned a rare popoto's notification into a parcel by rewriting the
-- ordinary one after it was written. That never worked, and could not have:
-- notifications_guard puts kind and body back on every update, which is the
-- right rule — a notification says what happened and nothing may change it
-- afterwards — so the rewrite reported success and changed nothing, and the
-- fallback that would have written a parcel saw "found" and stood down. A rare
-- popoto arrived in the bell as an ordinary one.
--
-- So the notification is written right the first time. notify_kudos runs after
-- the roll (a BEFORE trigger) has already decided, so it can see whether the
-- popoto it is announcing is rare and say so: one notification, one toast, and
-- nothing for the guard to refuse. The v77 rewrite goes.

/**
 * As it was, with one thing added: a rare popoto is announced as a parcel.
 *
 * The rest is unchanged on purpose — only a verified claim is told, and never
 * somebody who gave one to themselves — so a rare popoto reaches exactly the
 * people an ordinary one would. The body carries the popoto's id, which is how
 * the bell finds what to unwrap.
 */
create or replace function public.notify_kudos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare target uuid;
begin
  -- The account holding the character it was given to, and only if that claim
  -- has been verified — the same bar the rest of the site uses before it will
  -- treat an account and a character as the same person.
  select id into target
  from public.profiles
  where character_id = new.receiver_character_id
    and character_verified_at is not null
  limit 1;

  -- Nobody to tell, or they gave it to themselves.
  if target is null or target = new.sender_id then
    return null;
  end if;

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  values (target,
          case when new.rare_body is not null then 'popoto_rare' else 'popoto' end,
          new.sender_id, public.actor_name(),
          case when new.rare_body is not null then new.id::text else null end);
  return null;
end;
$function$;

drop trigger if exists zz_kudos_rare_notify on public.kudos;
drop function if exists public.kudos_rare_notify();
