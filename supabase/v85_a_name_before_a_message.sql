/*
 * Nothing is written by somebody the FC cannot name.
 *
 * A party went up on the 18th and somebody signed up to it — "ลงชื่อๆ", the
 * ordinary thing anybody writes under a party. The message came out signed
 * "You", with a dashed circle where the face goes, and the next person under
 * it asked the only question left to ask: who is that. Nobody could answer.
 * The account was a real one, signed in with Discord a week earlier, and it
 * had never claimed a character — so the page had no name for its own reader
 * and fell back on the word it uses to mean "whoever is looking at this",
 * which the row then kept forever.
 *
 * Two of those exist. They are messages under parties people are arranging
 * around, which is the one place where not knowing who is speaking costs an
 * evening: a seat is held for a person, and "You" is not one.
 *
 * The page has been fixed to draw a reason instead of a box. This is the same
 * rule where it cannot be gone around — the anon key is in the JavaScript this
 * site ships, so a rule that lives only in the page is a rule anybody may
 * ignore. Same argument as v24, which put a character behind a popoto; this
 * finishes the job for everything else somebody can write.
 *
 * Verified, not merely claimed. v24 asked only for a claim because picking a
 * character off a list is the part that makes a potato mean something and
 * proving it could wait. A message is different: it is read as a member
 * speaking, and a claim nobody has proved is a name typed into a box. Nothing
 * is taken from anybody by this — every account on the site that holds a
 * character has verified it.
 *
 * Restrictive rather than rewritten. Each of these tables already has its own
 * rules about who may touch which row — the party's lead, the picture's
 * author, your own vote — and those are the interesting ones. A restrictive
 * policy is ANDed with them, so this adds one condition to every write and
 * leaves the existing answers about ownership exactly as they were.
 *
 * Reading is untouched, on purpose: an account with no character can still see
 * the whole site. It is the input that has to be attributable, not the view.
 *
 * Three things are deliberately left open to an account with no character,
 * because closing them would close the way out:
 *   · profiles — their own row, which is where a character is claimed. A gate
 *     that also locked this would be a gate with the key inside.
 *   · feedback_threads / feedback_messages — a private word with the admins,
 *     which is who somebody stuck on the claim has to reach. It is addressed
 *     to the admins and nobody else, and they can see whose account it is.
 *   · notifications — marking your own as read is not writing anything into
 *     the site; it is putting down something the site handed you.
 */

-- ─── Whoever is asking, do they hold a character they have proved? ────────
-- security definer so the check can read profiles whatever the policy on it
-- says; stable so the planner may call it once per statement rather than once
-- per row. Sibling of has_character() from v24, which asks the lower question.
create or replace function public.verified_character()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid())
       and character_id is not null
       and character_verified_at is not null
  );
$$;

comment on function public.verified_character() is
  'True when the signed-in account holds a character it has proved on the '
  'Lodestone. The bar for writing anything into the site: a message nobody '
  'can attribute is a message nobody can answer.';

grant execute on function public.verified_character() to authenticated;

-- ─── The same condition, on everything somebody can write into ───────────
--
-- One loop rather than sixty hand-written policies, because it is one rule and
-- sixty copies of it would be sixty chances to write it differently. Skipped
-- where a table does not exist on this database rather than failing: the list
-- is what the site writes to today, and it is meant to be re-runnable.
--
-- Per command, never `for all`. A restrictive `for all` policy carries its
-- USING clause into SELECT as well, which would hide the site from the very
-- people this is about — they are here to read it.
do $$
declare
  t text;
  tables text[] := array[
    -- the party board
    'party_posts', 'party_members', 'party_comments', 'party_comment_reactions',
    'party_wants', 'party_photos',
    -- the gallery
    'gallery_posts', 'gallery_images', 'gallery_tags', 'gallery_likes',
    'gallery_comments', 'gallery_comment_reactions',
    -- the notices on the front page
    'announcement_comments', 'announcement_comment_reactions',
    -- and the two things that count members
    'poll_votes', 'kudos'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skipping %, which is not on this database', t;
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_named_write', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated'
      || ' with check ((select public.verified_character()) or (select public.is_admin()))',
      t || '_named_write', t);

    execute format('drop policy if exists %I on public.%I', t || '_named_edit', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated'
      || ' using ((select public.verified_character()) or (select public.is_admin()))'
      || ' with check ((select public.verified_character()) or (select public.is_admin()))',
      t || '_named_edit', t);

    -- Taking a popoto back off a picture stays open to everybody who gave one.
    -- v24 made the same exception for the same reason: the rule decides who may
    -- give the next one, and somebody who gave one under the older rule should
    -- still be allowed to change their mind.
    if t <> 'gallery_likes' then
      execute format('drop policy if exists %I on public.%I', t || '_named_drop', t);
      execute format(
        'create policy %I on public.%I as restrictive for delete to authenticated'
        || ' using ((select public.verified_character()) or (select public.is_admin()))',
        t || '_named_drop', t);
    end if;
  end loop;
end $$;

-- ─── And the pictures that go in a message ───────────────────────────────
--
-- The 'party' bucket is where a screenshot dropped into a message is stored.
-- The row it belongs to is covered above, and a file with no row pointing at
-- it is invisible — but it is still an upload from an account the site cannot
-- name, so it is refused at the same bar.
--
-- Written as "anything but this bucket, or a verified character" because a
-- restrictive policy on storage.objects applies to every bucket at once: the
-- avatars and covers members put on their own profiles live in 'gallery', and
-- fixing a profile is exactly what somebody in this state is here to do.
drop policy if exists party_images_named on storage.objects;
create policy party_images_named on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'party'
    or (select public.verified_character())
    or (select public.is_admin())
  );

-- ─── What it should say afterwards ───────────────────────────────────────
-- Every table in the list above, three rows each (two for gallery_likes),
-- plus the one on storage.objects.
--
--   select schemaname, tablename, policyname, cmd, permissive
--     from pg_policies
--    where policyname like '%\_named\_%'
--    order by tablename, policyname;
