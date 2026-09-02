# The database

The schema lives in Supabase. This folder holds only what is not yet applied.

`schema.sql` is the base: the tables the site started with, their row-level
security, and the statement that makes somebody an admin. It is a record of the
beginning rather than of the present — everything since has been added by
migrations, and the database itself is the only accurate description of what is
there now.

## Migrations

A migration is a file to paste into the SQL editor once. **When it has been run,
it is deleted from here.** Twenty-three of them had accumulated, and a folder of
files that have all already been applied only ever raises the question of which
ones have — the answer being "all of them", every time, which is not a question
worth being able to ask.

Nothing is lost by deleting them. `git log -- supabase/` still has every one,
and `git show <commit>:supabase/migration_v24.sql` prints it back. The numbering
carries on from the highest that ever existed, so the next is v25 whatever is
sitting in this folder.

So: an unapplied migration is a file here. An applied one is in the history.
If this folder holds nothing but `schema.sql` and this note, the database is up
to date.

## Rebuilding from nothing

There is no path from these files to today's database, and there has not been
for a while — `schema.sql` plus twenty-three migrations in order would get close,
but a few of them backfilled data that no longer exists to backfill. If the
project ever needs a true starting point again, take a schema dump from Supabase
rather than replaying this folder.
