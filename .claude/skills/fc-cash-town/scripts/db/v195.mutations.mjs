// SECURITY_ONLY=1 node mutate.mjs <v195.sql> v195.test.mjs v195.mutations.mjs
export default ({ swap }) => [
  ['cache RLS disabled', swap('alter table town.read_cache enable row level security;', ''), ['row level security enabled']],
  ['cache table grants reopened', swap('revoke all on town.read_cache from public, anon, authenticated;', 'grant all on town.read_cache to anon, authenticated;'), ['table grants removed']],
  ['shared calculation helper publicly executable', swap('revoke all on function town.shared_read(text,bigint,jsonb,text,jsonb) from public, anon, authenticated;', ''), ['helper execute grants removed']],
  ['unbounded cache keys', swap("check (key_ in ('bugs', 'wild', 'cave'))", ''), ['PK whitelist bounds storage']],
];
