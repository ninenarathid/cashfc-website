-- What v256 asks of a database before it runs: Ninenine's admin account (its id as on the site). The town's kept benches
-- never ran v256 for want of it; v299 needs v256's reader. Given to the bench before v256 (v299.test.mjs, and
-- town-bench.mjs's BENCH_EXTRA for a try in `next dev`).
insert into auth.users (id) values ('9c0e6904-df00-452d-b005-dac3fa6cd1d7') on conflict do nothing;
insert into public.profiles (id, is_admin, character_name) values ('9c0e6904-df00-452d-b005-dac3fa6cd1d7', true, 'Ninenine')
  on conflict (id) do update set is_admin = true;
