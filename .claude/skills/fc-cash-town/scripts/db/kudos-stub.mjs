/*
 * `kudos` as it stands live, written by hand because no replayable file
 * creates it: migration_v2 made the table, v24 and v85 its write rules, v77
 * and v81 the rare columns and their two partial indexes. The foreign keys to
 * the flavour tables are left off; v104 does not touch them.
 *
 * Reading is open to everybody ("kudos: read for everyone", using (true)) and
 * the grants are Supabase's default ALL — which is how the live table answers
 * anon today (probed 2026-10-03: anon counts every row).
 */
export const KUDOS = `
create table public.kudos (
  id                    bigint generated always as identity primary key,
  sender_id             uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null,
  day                   date not null default current_date,
  created_at            timestamptz not null default now(),
  rare_tier text check (rare_tier is null or rare_tier in ('rare', 'super', 'ultra')),
  rare_flavor_id bigint, rare_flavor_name text, rare_flavor_name_en text,
  rare_flavor_color text, rare_flavor_image text, rare_blessing_id bigint,
  rare_body text, rare_author_name text, rare_author_character_id bigint,
  rare_opened_at timestamptz,
  rare_showcase smallint check (rare_showcase is null or rare_showcase between 1 and 10),
  unique (sender_id, receiver_character_id, day)
);
create index kudos_rare_for on public.kudos (receiver_character_id, created_at) where rare_body is not null;
create unique index kudos_rare_showcase_place on public.kudos (receiver_character_id, rare_showcase) where rare_showcase is not null;
alter table public.kudos enable row level security;
create policy "kudos: read for everyone" on public.kudos for select using (true);
create policy "kudos: send as yourself" on public.kudos for insert
  with check (auth.uid() = sender_id and public.has_character());
create policy kudos_named_write on public.kudos as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));
create policy kudos_named_edit on public.kudos as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));
create policy kudos_named_drop on public.kudos as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));
`;
