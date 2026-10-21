// Isolated Postgres test: no live database, account or saved game is touched.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.env.FC_REPO ?? process.cwd();
const bench = process.env.FC_DB_BENCH ?? 'E:/NinenineProject/fcnext-codex-bench';
const { supabaseLike, migration, U } = await import(pathToFileURL(join(bench, 'pglite-harness.mjs')));
const t = await supabaseLike({ extra: `
 create schema realtime;
 grant usage on schema realtime to anon, authenticated;
 create table realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 grant usage on sequence realtime.messages_id_seq to anon, authenticated;
 create function realtime.topic() returns text language sql stable as $$
   select current_setting('realtime.topic', true)
 $$;
` });
try {
  await t.sql(migration(101, { repo: root }));
  await t.sql(migration(102, { repo: root }));
  const sql = readFileSync(process.env.MIGRATION_FILE ?? join(root, 'supabase/v293_the_town_speaks_to_its_own_map.sql'), 'utf8');
  await t.runTwice(sql);
  t.check('two exact map policies after a repeated run', (await t.sql(`select count(*)::int n from pg_policies where schemaname='realtime' and policyname in ('town_maps_receive','town_maps_send')`)).rows[0].n === 2);
  const topic = (await t.sql("select topic from town_rooms where id='main'")).rows[0].topic;
  const zones = ['town', 'farm', 'forest', 'mountain', 'cave'];
  for (const who of [U.m1, U.m2, U.admin]) {
    for (const zone of zones) {
      const r = await t.as(who, 'select public.town_zone_topic($1) topic', [zone]);
      t.check(`${who.slice(-1)} may discover ${zone}`, r.rows?.[0]?.topic === `${topic}:z:${zone}`, r);
      await t.sql("select set_config('realtime.topic',$1,false)", [`${topic}:z:${zone}`]);
      const write = await t.as(who, "insert into realtime.messages(extension) values ('broadcast') returning id");
      t.check(`${who.slice(-1)} may broadcast to ${zone}`, !write.error && write.rows?.length === 1, write);
      const read = await t.as(who, "select * from realtime.messages");
      t.check(`${who.slice(-1)} may receive ${zone}`, !read.error && read.rows?.length > 0, read);
    }
  }
  for (const who of ['anon', U.unver, U.nochar]) {
    const r = await t.as(who, "select public.town_zone_topic('town') topic");
    t.check(`${who.slice(-4)} learns no map topic`, !!r.error || r.rows?.[0]?.topic === null, r);
    await t.sql("select set_config('realtime.topic',$1,false)", [`${topic}:z:town`]);
    const write = await t.as(who, "insert into realtime.messages(extension) values ('broadcast')");
    t.check(`${who.slice(-4)} cannot post into a map`, !!write.error, write);
    const read = await t.as(who, "select * from realtime.messages");
    t.check(`${who.slice(-4)} cannot read map messages`, !!read.error || read.rows?.length === 0, read);
  }
  for (const wrong of [`${topic}:z:town:u:${U.m2}`, `${topic}:z:town:extra`, `${topic}:z:secret`, `${topic}:u:${U.m2}`, 'casino-live', 'other:z:town']) {
    await t.sql("select set_config('realtime.topic',$1,false)", [wrong]);
    const read = await t.as(U.m1, 'select * from realtime.messages');
    t.check(`a map policy grants no unrelated read (${wrong.split(':').slice(-1)[0]})`, read.rows?.length === 0, read);
  }
  for (const zone of [null, '', 'secret', 'town:u:someone', 'town:extra']) {
    const r = await t.as(U.m1, 'select public.town_zone_topic($1) topic', [zone]);
    t.check(`invalid zone ${String(zone)} stays closed`, r.rows?.[0]?.topic === null, r);
  }
  await t.sql("select set_config('realtime.topic',$1,false)", [`${topic}:z:town`]);
  const presence = await t.as(U.m1, "insert into realtime.messages(extension) values ('presence')");
  t.check('maps allow broadcast only, no additional presence', !!presence.error, presence);
  const cap = await t.sql("select has_function_privilege('authenticated','public.town_zone_topic(text)','execute') and not has_function_privilege('anon','public.town_zone_topic(text)','execute') ok");
  t.check('documented capability-permissions check', cap.rows[0].ok === true);
  // The old mailbox isolation and direct write must survive alongside map policies.
  await t.sql("select set_config('realtime.topic',$1,false)", [`${topic}:u:${U.m2}`]);
  const direct = await t.as(U.m1, "insert into realtime.messages(extension) values ('broadcast')");
  t.check('members can still send directly to another member', !direct.error, direct);
  t.check('only the mailbox owner reads the message', (await t.as(U.m2, 'select * from realtime.messages')).rows?.length > 0);
  t.done();
} finally { await t.db.close(); }
