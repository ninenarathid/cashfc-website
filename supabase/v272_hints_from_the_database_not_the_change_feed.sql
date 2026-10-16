-- v272: the bell, the party board and the casino's wins are told by a hint from the database, not the change feed
-- (2026-10-16). Run after v271, with the matching site code live (it listens for the hints). Safe to run twice.
--
-- pg_stat_statements on 2026-10-16: the change feed's poll ("SELECT wal->>... as type", Supabase Realtime's
-- postgres_changes) ran 953,000 times, ten a second, 9 ms each: the second-largest cost of the database's time, for as
-- long as any page listened to a table through it. Every signed-in page did (the bell), as did the party board and the
-- casino's win banner on every page away from the town, and the town's gate (the casino's door, now read every half
-- minute instead). The owner: "ทำทั้งคู่".
--   * public.rt_hint, a trigger, sends a broadcast from the database (realtime.send) as a row is written: to
--     notifications:<recipient> (private: a member hears only their own; nothing in it, the bell reads its rows again),
--     to casino-announcements (the win, as the banner shows it), and to party-board once a statement for any of the
--     board's tables (nothing in it, the board reads itself again). A hint that cannot be sent never stops the write.
--   * Those tables leave the change feed's publication; the casino's own tables (its page, open only in an event or to
--     an admin) stay in it.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then raise exception 'realtime.send is missing: this project has no broadcast from the database'; end if;
 if to_regclass('public.notifications') is null or to_regclass('public.town_casino_announcements') is null or to_regclass('public.party_posts') is null then raise exception 'the bell''s, the casino''s or the board''s table is missing'; end if;
 if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' and p.proname='shared_read_data' and p.prosrc like '%v271%') then raise exception 'Run v271 before v272'; end if;
end $$;

create or replace function public.rt_hint()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_table_name = 'notifications' then
      perform realtime.send('{}'::jsonb, 'new', 'notifications:' || new.recipient::text, true);
    elsif tg_table_name = 'town_casino_announcements' then
      perform realtime.send(jsonb_build_object('id', new.id, 'player_name', new.player_name, 'prize_name', new.prize_name, 'created_at', new.created_at),
        'win', 'casino-announcements', false);
    else
      perform realtime.send(jsonb_build_object('t', tg_table_name), 'changed', 'party-board', false);
    end if;
  exception when others then
    -- (a hint is a courtesy: the bell and the board poll besides; the write goes on)
    null;
  end;
  return null;
end $$;
revoke all on function public.rt_hint() from public, anon, authenticated;

drop trigger if exists rt_hint on public.notifications;
create trigger rt_hint after insert on public.notifications for each row execute function public.rt_hint();
drop trigger if exists rt_hint on public.town_casino_announcements;
create trigger rt_hint after insert on public.town_casino_announcements for each row execute function public.rt_hint();
do $$ declare t text; begin
  foreach t in array array['party_posts', 'party_members', 'party_comments', 'party_comment_reactions', 'party_polls'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists rt_hint on public.%I', t);
      execute format('create trigger rt_hint after insert or update or delete on public.%I for each statement execute function public.rt_hint()', t);
    end if;
  end loop;
end $$;

-- the bell's hint is private: a member may hear only the channel of their own account
drop policy if exists notifications_hint_read on realtime.messages;
create policy notifications_hint_read on realtime.messages for select to authenticated
  using (realtime.topic() = 'notifications:' || (select auth.uid())::text and realtime.messages.extension = 'broadcast');

-- the change feed no longer carries them
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['notifications', 'party_posts', 'party_members', 'party_comments', 'party_comment_reactions', 'party_polls', 'town_casino_announcements'] loop
      if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime drop table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

commit;

-- What it should say afterwards:
--   select (select count(*) from pg_trigger where tgname = 'rt_hint') as hints,
--          (select string_agg(tablename, ', ' order by tablename) from pg_publication_tables where pubname = 'supabase_realtime') as still_in_the_feed;
--   -- 7, and only the casino's tables (casino_lab_*, casino_live_*) in the feed
