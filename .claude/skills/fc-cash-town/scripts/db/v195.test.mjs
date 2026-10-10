// Run beside the stand-in and harness, with FC_REPO pointing to the checkout.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual as equal } from 'node:util';
import { performance } from 'node:perf_hooks';
import { standIn } from './stand-in.mjs';
import { U, migration } from './pglite-harness.mjs';

const t = await standIn({ upTo: 178 });
const one = async (sql, args = []) => (await t.sql(sql, args)).rows[0];
await t.run(migration(179), 'current v179 baseline');
await t.run(migration(183), 'independently applied v183');
if (process.env.EXPANSIONS === '1') {
  for (const n of [180, 181, 182, 184, 185, 186, 187, 188, 194]) await t.run(migration(n), `pending v${n}`);
}
if (process.env.LIVE_DIAGNOSTICS) {
  const live = JSON.parse(readFileSync(process.env.LIVE_DIAGNOSTICS, 'utf8'));
  for (const f of live.live_functions_to_verify) if (['town_cave', 'town_well_ranks', 'cave_told', 'thanks_board'].includes(f.function_name)) await t.sql(f.definition);
}
const NOW = Number((await one('select town.now_ms() n')).n);
await t.sql(`create table town.ram_test_clock(n bigint); insert into town.ram_test_clock values (${NOW});
  create or replace function town.now_ms() returns bigint language sql stable as $$select n from town.ram_test_clock$$;
  update public.town_knobs set value = 1 where key = 'far_open';`);
const clock = (at) => t.sql('update town.ram_test_clock set n = $1 where true', [at]);
for (const [name, schema] of [['town_bugs', 'public'], ['town_wild', 'public'], ['town_well_ranks', 'public'], ['cave_told', 'town']]) {
  const def = (await one('select pg_get_functiondef(oid) d from pg_proc where pronamespace=$1::regnamespace and proname=$2', [schema, name])).d;
  await t.sql(def.replace(`${schema}.${name}(`, `${schema}.ram_before_${name}(`));
}
for (const who of [U.m1, U.m2, U.admin]) {
  const read = await t.as(who, 'select public.town_me() r');
  t.check('baseline member can enter', !!read.rows?.[0]?.r?.purse, read);
  await t.sql('insert into public.town_purses(member_id,coins,doc) values($1::uuid,1000,$2::jsonb) on conflict(member_id) do nothing', [who, JSON.stringify(read.rows[0].r.purse)]);
}
// Non-empty thanks, including ties and another day, exercise filtering and ordering.
await t.sql(`insert into public.town_thanks(from_id,to_id,day,at) values
  ($1::uuid,$2::uuid,town.day_of(town.now_ms()),now()),
  ($3::uuid,$2::uuid,town.day_of(town.now_ms()),now()),
  ($2::uuid,$1::uuid,town.day_of(town.now_ms())-1,now()-interval '1 day')`, [U.m2, U.m1, U.admin]);
await t.sql(`insert into public.town_deeds(member_id,what,thing,n,at)
  select $1::uuid,'net',b.key,1,now()-interval '1 day' + s*interval '1 second'
    from jsonb_each(town.cat('insects')->'bugs') b cross join generate_series(1,150) s`, [U.m1]);
const sql = readFileSync(process.env.MIGRATION_FILE ?? join(process.env.FC_REPO, 'supabase/v195_less_work_when_the_town_is_read.sql'), 'utf8');
await t.runTwice(sql, 'v195');
// These checks also run alone for security mutation testing.
t.check('row level security enabled', (await one("select relrowsecurity r from pg_class where oid='town.read_cache'::regclass")).r);
t.check('table grants removed', !(await one("select has_table_privilege('authenticated','town.read_cache','SELECT') p")).p);
t.check('helper execute grants removed', !(await one("select has_function_privilege('authenticated','town.shared_read(text,bigint,jsonb,text,jsonb)','EXECUTE') p")).p);
t.check('invalidation helper execute grants removed', !(await one("select has_function_privilege('authenticated','town.invalidate_read_cache()','EXECUTE') p")).p);
t.check('public bug reader uses shared calculations', (await one("select position('town.shared_read(' in pg_get_functiondef('public.town_bugs()'::regprocedure))>0 r")).r);
t.check('ranks compute only today thanks', (await one("select position('town.thanks_board' in pg_get_functiondef('public.town_well_ranks()'::regprocedure))=0 r")).r);
const verification = await one(sql.slice(sql.indexOf('select jsonb_build_object(\n  \'rls\''), sql.indexOf('-- What it should say afterwards')));
t.check('SQL Editor verification returns all true', Object.values(verification.v195_verified).every(v => v === true), verification);
for (const who of ['anon', U.m1, U.m2, U.admin, U.guest, U.unver, U.nochar]) {
  t.check('cache cannot be read directly', !!(await t.as(who, 'select * from town.read_cache')).error);
  t.check('cache cannot be forged', !!(await t.as(who, "insert into town.read_cache values('bugs','fake',0,999,'{}')")).error);
  t.check('shared helper is private', !!(await t.as(who, "select town.shared_read('bugs',town.now_ms())")).error);
}
t.check('PK whitelist bounds storage', !!(await t.as('super', "insert into town.read_cache values('other','test',0,1,'{}')")).error);
if (process.env.SECURITY_ONLY === '1') { t.done(); await t.db.close(); process.exit(process.exitCode ?? 0); }

const paired = async (name, who = U.m1) => {
  const got = await t.as(who, `select public.${name}() r`);
  const old = await t.as(who, `select public.ram_before_${name}() r`);
  t.check(`${name} retains member output`, !got.error && !old.error && equal(got.rows, old.rows), { got, old });
  return got.rows?.[0]?.r;
};
const shared = async (kind) => (await one(`select town.shared_read($1,town.now_ms(),
  case $1 when 'bugs' then town.cat('insects') when 'wild' then town.cat('forest') end,
  town.word(),case $1 when 'bugs' then town.backs_now(town.now_ms()) end) d`, [kind])).d;
const cache = (key) => one('select * from town.read_cache where key_=$1', [key]);
const normCave = async () => {
  const got = await shared('cave');
  const old = (await one(`select coalesce(jsonb_object_agg(c.place::text,town.cave_at(c.doc,town.now_ms())),'{}'::jsonb) d from public.town_cave c`)).d;
  t.check('shared cave normalizes every floor exactly', equal(got, old), { got, old });
};
for (const who of [U.m1, U.m2, U.admin]) for (const name of ['town_bugs', 'town_wild', 'town_well_ranks']) await paired(name, who);
// Cached spawns are public world calculations; equipment, catches and shares remain personal.
for (const [who, charms] of [[U.m1, ['charmCloak', 'charmFirefly']], [U.m2, []]]) {
  await t.sql(`update public.town_purses set doc=jsonb_set(doc,'{gifts}',jsonb_build_object('had',$2::jsonb,'charms',$2::jsonb)) where member_id=$1::uuid`, [who, JSON.stringify(charms)]);
  t.check('equipment fixture is worn', (await one(`select town.wearing(doc,'charmCloak') w from public.town_purses where member_id=$1::uuid`, [who])).w === (charms.length > 0));
}
for (let minute = 0; minute < 120; minute += 7) {
  await clock(NOW + minute * 60000);
  for (const who of [U.m1, U.m2]) for (const name of ['town_bugs', 'town_wild']) await paired(name, who);
}
await clock(NOW);
let bugs = await paired('town_bugs');
let wild = await paired('town_wild');
for (const [what, sights] of [['haunt', bugs.bugs], ['spot', wild.wild]]) {
  const sight = sights[0];
  t.check('fixture has a catchable shared sight ' + what, !!sight);
  if (sight) {
    const turn = what === 'haunt' ? sight[2] : (await one('select town.wild_holds($1,town.now_ms()) d', [sight[0]])).d.turn;
    await t.sql('insert into public.town_takes(what,place,turn,member_id) values($1,$2,$3,$4::uuid) on conflict do nothing', [what, sight[0], turn, U.m1]);
    for (const who of [U.m1, U.m2]) {
      const got = await paired(what === 'haunt' ? 'town_bugs' : 'town_wild', who);
      if (who === U.m1) t.check('own catch is hidden with shared world cache', !(what === 'haunt' ? got.bugs : got.wild).some(s => s[0] === sight[0]));
    }
  }
}

// A future comeback can start inside a spawn's turn; it must expire the cache then.
const missing = (await one(`select i, floor((town.now_ms()+floor(town.roll('bugphase',i)*(town.cat('insects')->'kinds'->(town.cat('insects')->'haunts'->i->>0)->>'every')::double precision)::bigint*60000)::numeric / ((town.cat('insects')->'kinds'->(town.cat('insects')->'haunts'->i->>0)->>'every')::bigint*60000))::bigint turn
  from generate_series(0,jsonb_array_length(town.cat('insects')->'haunts')-1) i
  where town.bug_at(i,town.now_ms()) is null limit 1`));
t.check('fixture has an empty haunt', !!missing);
if (missing) {
  const bug = (await one(`select town.cat('insects')->'order'->>0 bug`)).bug;
  await t.sql('insert into public.town_comebacks(haunt,turn,bug,n,from_ms,by) values($1,$2,$3,1,$4,$5::uuid) on conflict(haunt,turn) do update set from_ms=excluded.from_ms,bug=excluded.bug,n=excluded.n', [missing.i, missing.turn, bug, NOW + 1000, U.m1]);
  await paired('town_bugs');
  t.check('comeback bounds cache expiry', Number((await cache('bugs')).until_ms) <= NOW + 1000);
  await clock(NOW + 1000); await paired('town_bugs');
}
// The boundary fingerprint also works when the 30-second TTL has not elapsed.
for (const kind of ['bugs', 'wild']) {
  await clock(NOW); await shared(kind);
  const before = await cache(kind);
  await clock(Number(before.until_ms));
  await paired(kind === 'bugs' ? 'town_bugs' : 'town_wild');
  t.check('deadline replaces cache ' + kind, Number((await cache(kind)).from_ms) === Number(before.until_ms));
}
await clock(NOW);
const light = { f: 0, x: 1, y: 1, until: NOW + 1000, by: U.m1 };
await t.sql(`insert into public.town_cave(place,doc) values(0,jsonb_build_object('day',town.day_of(town.now_ms()),'torches',$1::jsonb,'moss',$1::jsonb))
  on conflict(place) do update set doc=excluded.doc`, [JSON.stringify([light])]);
await normCave();
t.check('light expiry bounds cache', Number((await cache('cave')).until_ms) === NOW + 1000);
await clock(NOW + 1000); await normCave();
t.check('expired lights removed', (await shared('cave'))['0'].torches.length === 0);
// Compare the full personal cave result, including surroundings, rather than just normalized floors.
for (const who of [U.m1, U.m2]) for (const floor of [0, 1, -1]) {
  const r = await one(`select town.cave_told($1::uuid,doc,$2,1,1,town.now_ms()) got,
    town.ram_before_cave_told($1::uuid,doc,$2,1,1,town.now_ms()) old from public.town_purses where member_id=$1::uuid`, [who, floor]);
  t.check('personal cave result unchanged', equal(r.got, r.old), r);
}
for (const at of [NOW + 30000, NOW + 60000, NOW + 86400000]) { await clock(at); await normCave(); }
await clock(NOW);

// Invalidation stays in the writing transaction, including rollback and non-net deeds.
await shared('bugs');
await t.sql(`insert into public.town_deeds(member_id,what,thing,n) values($1::uuid,'water','test',1)`, [U.m1]);
t.check('unrelated deed retains cache', !!(await cache('bugs')));
await t.sql(`begin; insert into public.town_deeds(member_id,what,thing,n) values('${U.m1}','net','test',1);`);
t.check('net invalidates before commit', !(await cache('bugs')));
await t.sql('rollback');
t.check('rollback restores cache', !!(await cache('bugs')));
await t.sql(`insert into public.town_deeds(member_id,what,thing,n) values($1::uuid,'net','test',1)`, [U.m1]);
t.check('net invalidates on commit', !(await cache('bugs')));
for (const [table, key, update] of [
  ['town_catalog', 'bugs', "updated_at=updated_at where key='insects'"],
  ['town_secrets', 'bugs', 'word=word where true'],
  ['town_cave', 'cave', 'doc=doc where place=0'],
]) {
  await shared(key); await t.sql(`update public.${table} set ${update}`);
  t.check('source invalidates ' + table, !(await cache(key)));
}
const weatherColumns = (await t.sql(`select column_name from information_schema.columns where table_schema='public' and table_name='town_weather'`)).rows.map(r => r.column_name);
await shared('wild');
await t.sql(`update public.town_weather set ${weatherColumns[0]}=${weatherColumns[0]} where true`);
// An empty table gets no row trigger; TRUNCATE must still invalidate it.
await t.sql('truncate public.town_weather');
t.check('weather truncate invalidates', !(await cache('wild')));

// v188 recovery support, including installing that table after this independent migration.
if (!(await one("select to_regclass('public.town_forest_rest') r")).r) {
  await t.sql('create table public.town_forest_rest(spot integer primary key,begins bigint not null,ends bigint not null)');
  await shared('wild');
  const before = await cache('wild'); await clock(NOW + 1); await shared('wild');
  t.check('late recovery table bypasses unguarded cache', equal(before, await cache('wild')));
  await t.run(sql, 'v195 attaches late recovery triggers');
}
await clock(NOW);
await t.sql('insert into public.town_forest_rest(spot,begins,ends) values(0,$1,$2) on conflict(spot) do update set begins=excluded.begins,ends=excluded.ends', [NOW + 1000, NOW + 2000]);
await shared('wild'); t.check('recovery start bounds cache', Number((await cache('wild')).until_ms) <= NOW + 1000);
await clock(NOW + 1000); await paired('town_wild');
t.check('recovery end bounds cache', Number((await cache('wild')).until_ms) <= NOW + 2000);
await clock(NOW + 2000); await paired('town_wild');
await t.sql('delete from public.town_forest_rest where spot=0');
t.check('recovery writes invalidate', !(await cache('wild')));

// Exercise a real member write through the existing SECURITY DEFINER RPC.
await clock(NOW);
await t.sql(`update public.town_purses set doc=doc || jsonb_build_object('hand','bugNet','bag',$2::jsonb) where member_id=$1::uuid`,
  [U.m1, JSON.stringify([{ item: 'bugNet', n: 1 }, ...Array(9).fill(null)])]);
const available = (await t.as(U.m1, 'select public.town_bugs() r')).rows[0].r.bugs;
const insects = (await one("select town.cat('insects') c")).c;
const sight = available.find(s => insects.bugs[s[1]].habit !== 'lure');
t.check('fixture has a member catch', !!sight);
if (sight) {
  const point = insects.haunts[sight[0]][3][0].map(Math.floor);
  const other = (await one('select doc from public.town_purses where member_id=$1::uuid', [U.m2])).doc;
  const did = await t.as(U.m1, 'select public.town_net($1,$2,$3,0,null) r', [sight[0], ...point]);
  t.check('member can catch after cache triggers are installed', did.rows?.[0]?.r?.ok === true, did);
  t.check('catch invalidates world calculation', !(await cache('bugs')));
  t.check('another member purse is unchanged by catch', equal(other, (await one('select doc from public.town_purses where member_id=$1::uuid', [U.m2])).doc));
  const again = await t.as(U.m1, 'select public.town_net($1,$2,$3,0,null) r', [sight[0], ...point]);
  t.check('replaying the same catch cannot earn twice', again.rows?.[0]?.r?.ok === false, again);
  await paired('town_bugs');
}

for (const who of ['anon', U.unver, U.nochar]) for (const name of ['town_bugs', 'town_wild', 'town_well_ranks']) {
  const got = await t.as(who, `select public.${name}()`);
  const old = await t.as(who, `select public.ram_before_${name}()`);
  t.check('ineligible gate unchanged', !!got.error && got.code === old.code, { got, old });
}
await t.sql("update public.town_knobs set value=0 where key='game_open'");
for (const who of [U.m1, U.admin]) {
  const got = await t.as(who, 'select public.town_bugs() r');
  const old = await t.as(who, 'select public.ram_before_town_bugs() r');
  t.check('closed game gate unchanged', got.error ? got.code === old.code : equal(got.rows, old.rows), { got, old });
}
await t.sql("update public.town_knobs set value=1 where key='game_open'");
await clock(NOW);
for (const kind of ['bugs', 'wild', 'cave']) await shared(kind);
t.check('cache has only three rows', (await one('select count(*)::int n from town.read_cache')).n === 3);
t.check('unknown cache kind rejected', !!(await t.as('super', "select town.shared_read('unknown',0)")).error);

// Comparative local measurement, not a promise about production RAM or latency.
for (const name of ['town_bugs', 'town_wild', 'town_well_ranks']) {
  await paired(name);
  const times = {};
  for (const [label, fn] of [['before', 'ram_before_' + name], ['warm', name]]) {
    const start = performance.now();
    for (let i = 0; i < 15; i++) await t.as(i % 2 ? U.m1 : U.m2, `select public.${fn}()`);
    times[label] = Math.round((performance.now() - start) / 15 * 100) / 100;
  }
  console.log('BENCH', name, JSON.stringify(times), 'ms/read including harness role setup');
}
t.done(); await t.db.close();
