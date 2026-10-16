// v271, the insects' shared look asks less, dry-run: the file runs twice (its guard against the chain through v270);
// then, moment by moment over hours (steps of a second to a few minutes, now and then a step back, comebacks of
// hunted insects coming due, nets cast, the weather rewritten), what the shared look says (town.shared_read 'bugs',
// the cache in use) is every haunt rolled afresh at that moment (town.bug_here and town.cloak_at); the forest's and
// the cave's looks are untouched; and a look costs far less over a busy stretch. No bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v271.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, SIGS } from "./build-v271.mjs";

let checks = 0, s = 271;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const OLD = (await one(`select pg_get_functiondef('${SIGS[0]}'::regprocedure) d`)).d;
  const sql = readFileSync("supabase/v271_the_insects_look_asks_less.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = (await one(`select pg_get_functiondef('${SIGS[0]}'::regprocedure) d`)).d;
  assert.notEqual(OLD, NEW); checks++;

  const ins = (await one("select town.cat('insects') c")).c, word = (await one("select town.word() w")).w, n = ins.haunts.length;
  const T0 = Date.UTC(2026, 9, 16, 1) - 30 * 3_600_000;
  const look = async (t) => (await one(`select town.shared_read('bugs', $1::bigint, town.cat('insects'), town.word(), town.backs_now($1::bigint)) d`, [t])).d;
  const fresh = async (t) => (await one(`select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) d from (
      select i::text k, town.bug_here(i, $1::bigint, town.backs_now($1::bigint), town.cat('insects'), town.word()) v from generate_series(0, $2 - 1) i
      union all select 'cloak:' || i, town.cloak_at(i, $1::bigint, town.cat('insects'), town.word()) from generate_series(0, $2 - 1) i) x where v is not null`, [t, n])).d;
  // comebacks: whatever columns the table has, filled
  const cols = (await db.query("select column_name c, data_type t, is_nullable z, column_default d from information_schema.columns where table_schema='public' and table_name='town_comebacks'")).rows;
  const member = (await one("select p.id from public.profiles p order by p.id limit 1")).id;
  const comeback = async (t) => {
    const i = Math.floor(rand() * n), kind = ins.kinds[ins.haunts[i][0]], every = kind.every * 60000;
    const phase = Math.floor((await one("select town.roll('bugphase', $1::int) r", [i])).r * kind.every) * 60000;
    const turn = Math.floor((t + phase) / every) + (rand() < 0.5 ? 0 : 1);
    const row = { haunt: i, turn, bug: ins.order[Math.floor(rand() * ins.order.length)], n: 1, from_ms: t + Math.floor(rand() * 10 * 60000) };
    const use = cols.filter((c) => c.c in row || (c.z === "NO" && c.d === null));
    const val = (c) => (c.c in row ? row[c.c] : c.t === "uuid" ? member : c.t.includes("time") ? new Date(t).toISOString() : c.t.includes("int") || c.t.includes("numeric") ? 0 : c.t === "jsonb" ? "{}" : "x");
    await db.query(`insert into public.town_comebacks(${use.map((c) => c.c).join(",")}) values(${use.map((_, k) => "$" + (k + 1)).join(",")})`, use.map(val));
  };

  let t = T0, back = 0, sizes = 0;
  for (let k = 0; k < 400; k++) {
    const r = rand();
    t += r < 0.6 ? Math.floor(rand() * 4000) : r < 0.9 ? Math.floor(rand() * 60_000) : Math.floor(rand() * 9 * 60_000);
    if (rand() < 0.04) { t -= Math.floor(rand() * 3000); back++; }
    if (rand() < 0.05) await comeback(t);
    if (rand() < 0.02) await db.query("update public.town_weather set written = written where slot = (select max(slot) from public.town_weather)").catch(() => {});
    const seen = await look(t); sizes += Object.keys(seen).length;
    eq(seen, await fresh(t), `the look at step ${k} (t0 + ${Math.round((t - T0) / 1000)} s)`);
  }
  console.log(`insects out at a look: ${(sizes / 400).toFixed(1)} on average`);
  console.log(`400 looks over ${Math.round((t - T0) / 60000)} minutes, ${back} steps back: each as every haunt rolled afresh`);

  // the time: a busy stretch, a look every second or two for ten minutes, under each definition
  const busy = async (def) => {
    await db.exec(def); await db.exec("delete from town.read_cache where key_ = 'bugs'");
    let tt = t + 3_600_000; const t0 = performance.now(); let m = 0;
    for (; m < 400; m++) { tt += 1000 + Math.floor(rand() * 1000); await look(tt); }
    return (performance.now() - t0) / m;
  };
  const before = await busy(OLD), after = await busy(NEW);
  console.log(`a look over a busy stretch: ${before.toFixed(1)} ms under v270, ${after.toFixed(1)} ms under v271`);
  assert.ok(after * 3 < before, "at least three times faster"); checks++;

  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v271: ${checks} checks passed`);
} finally { await db.close(); }
