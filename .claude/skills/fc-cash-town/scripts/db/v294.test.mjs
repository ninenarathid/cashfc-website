// Isolated Postgres test: no live database, account or saved game is touched.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.FC_REPO ?? process.cwd();
const bench = process.env.FC_DB_BENCH ?? 'E:/NinenineProject/fcnext-codex-bench';
const { supabaseLike, U } = await import(pathToFileURL(join(bench, 'pglite-harness.mjs')));
const t = await supabaseLike();
try {
  const sql = readFileSync(process.env.MIGRATION_FILE ?? join(root, 'supabase/v294_the_town_hears_every_map_again.sql'), 'utf8');
  await t.runTwice(sql);
  const reach = async (who) => (await t.as(who, 'select public.town_chat_reach() r')).rows?.[0]?.r;
  t.check('the town hears every map by default', await reach(U.m1) === 'town');
  t.check('one row after a repeated run', (await t.sql('select count(*)::int n from public.town_chat_switch')).rows[0].n === 1);

  const set = async (who, value) => (await t.as(who, 'select public.town_set_chat_reach($1) r', [value])).rows?.[0]?.r;
  const member = await set(U.m1, 'map');
  t.check('a member may not flip the switch', member?.ok === false && member?.why === 'forbidden', member);
  t.check('still town after a member tried', await reach(U.m2) === 'town');
  for (const wrong of [null, '', 'everyone', 'TOWN', "map'; drop table public.town_chat_switch; --"]) {
    const r = await set(U.admin, wrong);
    t.check(`an admin's wrong word changes nothing (${String(wrong).slice(0, 8)})`, r?.ok === false && r?.why === 'reach', r);
  }
  const admin = await set(U.admin, 'map');
  t.check('an admin sets map-only', admin?.ok === true && admin?.reach === 'map', admin);
  t.check('every member reads map-only', await reach(U.m1) === 'map' && await reach(U.m2) === 'map');
  const who = (await t.sql('select changed_by from public.town_chat_switch')).rows[0].changed_by;
  t.check('the switch says which admin set it', who === U.admin, who);

  await t.runTwice(sql);
  t.check('running the file again keeps what an admin set', await reach(U.m1) === 'map');
  t.check('and back to the whole town', (await set(U.admin, 'town'))?.ok === true && await reach(U.m1) === 'town');

  for (const stranger of ['anon', U.unver, U.nochar]) {
    const r = await t.as(stranger, 'select public.town_set_chat_reach($1) r', ['map']);
    t.check(`${stranger.slice(-5)} cannot flip the switch`, !!r.error || r.rows?.[0]?.r?.ok === false, r);
  }
  t.check('still town after strangers tried', await reach(U.m1) === 'town');
  const anonRead = await t.as('anon', 'select public.town_chat_reach() r');
  t.check('anon cannot read the switch', !!anonRead.error, anonRead);
  for (const q of ['select * from public.town_chat_switch', "update public.town_chat_switch set reach='map'", "insert into public.town_chat_switch(one, reach) values (true, 'map')", 'delete from public.town_chat_switch']) {
    for (const p of [U.m1, U.admin]) {
      const r = await t.as(p, q);
      t.check(`the table itself is shut to ${p.slice(-1)} (${q.split(' ')[0]})`, !!r.error || (r.rows?.length ?? 0) === 0 && !r.affected, r);
    }
  }
  t.check('nobody changed it by the table', await reach(U.m1) === 'town');
  const perms = await t.sql(`select has_function_privilege('authenticated','public.town_set_chat_reach(text)','execute')
    and not has_function_privilege('anon','public.town_set_chat_reach(text)','execute')
    and not has_table_privilege('authenticated','public.town_chat_switch','select') as ok`);
  t.check('documented permissions check', perms.rows[0].ok === true);
  t.done();
} finally { await t.db.close(); }
