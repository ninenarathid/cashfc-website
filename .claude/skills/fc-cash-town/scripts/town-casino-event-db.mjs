// v314 on the stand-in (node town-bench.mjs 3299 with v314 last in BENCH_EXTRA), for Aqua's event of 2026-10-31: a machine's
// turn only while all ten are taken (up at the pull, nothing taken, then a rest; with a machine free nobody is moved; 0 turns
// it off), and an event's free coins that end by themselves. node town-casino-event-db.mjs
import { readFileSync } from "node:fs";
const B = "http://127.0.0.1:3299";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d).slice(0, 400)}`); };
const sql = async (q, p = []) => { const r = await (await fetch(`${B}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: q, params: p }) })).json(); if (!r.rows) throw new Error(`${q.slice(0, 80)}: ${JSON.stringify(r).slice(0, 300)}`); return r.rows; };
const rpc = async (name, args, as) => { const r = await fetch(`${B}/rest/v1/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json", ...(as ? { "x-town-as": as } : {}) }, body: JSON.stringify(args ?? {}) }); const b = await r.json().catch(() => null); return { status: r.status, body: b }; };
const who = async (as) => (await (await fetch(`${B}/bench/who?as=${as}`)).json()).id;
const seat = (as, n) => rpc("casino_live_seat", { p_machine: n }, as);
const revision = async () => Number((await sql(`select revision from public.casino_live_settings where id = 1`))[0].revision);
const spin = async (as, n) => rpc("casino_live_spin", { p_request: crypto.randomUUID(), p_machine: n, p_force: null, p_revision: await revision() }, as);
const settle = () => sql(`do $$ begin update public.casino_live_spins set reveal_at = now() - interval '1 second' where reveal_at > now(); update public.casino_live_accounts set available_at = now() - interval '1 second' where available_at > now(); end $$`);
const chipsOf = async (id) => Number((await sql(`select chips from public.casino_live_accounts where user_id = $1`, [id]))[0].chips);
const seatOf = async (id) => (await sql(`select machine, at, since from public.casino_live_seats where user_id = $1`, [id]))[0];
const back = (id, secs) => sql(`update public.casino_live_seats set since = now() - make_interval(secs => $2) where user_id = $1`, [id, secs]);

await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100, seat_turn_s = 300, seat_rest_s = 60, free_event_chips = 0, free_event_until = null where id = 1`);
await sql(`delete from public.casino_live_seats`);
const names = Array.from({ length: 11 }, (_, i) => `v314-${i + 1}`), ids = [];
for (const n of names) {
  const id = await who(n); ids.push(id);
  await sql(`delete from public.casino_live_spins where user_id = $1`, [id]);
  await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [id]);
  await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [id]);
  await sql(`update public.casino_live_accounts set chips = 1000, free_left = 0, spins = 0, available_at = now() - interval '1 minute', seat_rest_until = null where user_id = $1`, [id]);
}

// ── the migration again changes nothing ──
{
  const r = await fetch(`${B}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: readFileSync(new URL("../../../../supabase/v314_casino_turns_and_event_free_coins.sql", import.meta.url), "utf8") }) });
  ok("v314 run again", r.status === 200, await r.text());
  const d = (await sql(`select pg_get_functiondef('public.casino_live_spin(uuid,integer,text,bigint)'::regprocedure) f`))[0].f;
  ok("the spin has 'Turn over' once", d.split("Turn over").length === 2);
}

// ── with a machine free, nobody is moved, however long they have sat ──
for (let i = 0; i < 9; i++) ok(`sits at ${i + 1}`, (await seat(names[i], i + 1)).body?.ok === true);
await back(ids[0], 3600);
{
  const before = await chipsOf(ids[0]), r = await spin(names[0], 1);
  ok("nine taken: an hour sat and the pull spins", r.status === 200 && !!r.body?.id, r);
  ok("and takes the coins", (await chipsOf(ids[0])) <= before, await chipsOf(ids[0]));
  const s = await seatOf(ids[0]);
  ok("and the turn goes on", Date.now() - Date.parse(s.since) > 3500e3, s);
  await settle();
}
// (no rest for letting go with a machine free)
await back(ids[1], 3600);
await seat(names[1], null);
ok("nine taken: letting go after an hour gives no rest", (await sql(`select seat_rest_until r from public.casino_live_accounts where user_id = $1`, [ids[1]]))[0].r === null);
ok("and I may sit again", (await seat(names[1], 2)).body?.ok === true);

// ── all ten taken ──
ok("the tenth sits", (await seat(names[9], 10)).body?.ok === true);
{
  const r = await seat(names[10], 1);
  ok("an eleventh is told it is taken, and that all are", r.body?.why === "taken" && r.body?.full === true, r);
  await back(ids[0], 299);
  const fresh = await spin(names[0], 1);
  ok("short of a whole turn the pull spins", fresh.status === 200 && !!fresh.body?.id, fresh);
  await settle();
  await back(ids[0], 301);
  const held = await chipsOf(ids[0]), spins = Number((await sql(`select count(*) n from public.casino_live_spins where user_id = $1`, [ids[0]]))[0].n);
  const over = await spin(names[0], 1);
  ok("a whole turn and the pull is refused: Turn over", /Turn over/.test(JSON.stringify(over.body)), over);
  ok("nothing taken", (await chipsOf(ids[0])) === held);
  ok("no spin written", Number((await sql(`select count(*) n from public.casino_live_spins where user_id = $1`, [ids[0]]))[0].n) === spins);
  ok("and the machine is still theirs until let go", (await seatOf(ids[0]))?.machine === 1);
  // the page lets it go
  await seat(names[0], null);
  const rest = (await sql(`select seat_rest_until r from public.casino_live_accounts where user_id = $1`, [ids[0]]))[0].r;
  ok("letting go begins the rest", !!rest && Date.parse(rest) > Date.now() + 50e3 && Date.parse(rest) <= Date.now() + 61e3, rest);
  const again = await seat(names[0], 1);
  ok("sitting again is refused, with the seconds", again.body?.why === "rest" && again.body?.seconds > 0 && again.body?.seconds <= 60, again);
  ok("a pull at a free machine is refused too", /Resting/.test(JSON.stringify((await spin(names[0], 1)).body)));
  ok("the eleventh takes the machine", (await seat(names[10], 1)).body?.ok === true);
  const s = await seatOf(ids[10]);
  ok("with a new turn", Date.now() - Date.parse(s.since) < 5e3, s);
  await sql(`update public.casino_live_accounts set seat_rest_until = now() - interval '1 second' where user_id = $1`, [ids[0]]);
  ok("the rest over, it is simply taken again", (await seat(names[0], 1)).body?.why === "taken");
}

// ── nothing lost in the turn by sitting again at my own machine; a lapsed machine is a new turn ──
{
  await back(ids[2], 200);
  const was = (await seatOf(ids[2])).since;
  await seat(names[2], 3);
  ok("sitting again at my own machine keeps the turn", (await seatOf(ids[2])).since === was);
  await sql(`update public.casino_live_seats set at = now() - interval '2 minutes' where user_id = $1`, [ids[2]]);
  await seat(names[2], 3);
  ok("a machine I let lapse is a new turn", Date.now() - Date.parse((await seatOf(ids[2])).since) < 5e3);
  // (the same by a spin)
  await sql(`update public.casino_live_seats set at = now() - interval '2 minutes', since = now() - interval '1 hour' where user_id = $1`, [ids[3]]);
  const r = await spin(names[3], 4);
  ok("a lapsed seat and a whole turn: the pull is a new turn, not refused", r.status === 200 && !!r.body?.id, r);
  ok("since then", Date.now() - Date.parse((await seatOf(ids[3])).since) < 5e3);
  await settle();
}

// ── 0 turns it off ──
{
  await sql(`update public.casino_live_settings set seat_turn_s = 0 where id = 1`);
  await back(ids[4], 3600);
  const r = await spin(names[4], 5);
  ok("seat_turn_s 0: all ten taken and an hour sat, the pull spins", r.status === 200 && !!r.body?.id, r);
  await settle();
  await seat(names[4], null);
  ok("and letting go gives no rest", (await sql(`select seat_rest_until r from public.casino_live_accounts where user_id = $1`, [ids[4]]))[0].r === null);
  await sql(`update public.casino_live_settings set seat_turn_s = 300 where id = 1`);
}

// ── an event's free coins ──
{
  await sql(`update public.casino_live_settings set free_event_chips = 1000, free_event_until = now() + interval '1 hour' where id = 1`);
  const a = names[5], ida = ids[5];
  const r = await rpc("casino_live_free", {}, a);
  ok("in the event: 1,000 free", r.body?.ok === true && r.body?.given === 1000, r);
  ok("all of them free", (await sql(`select free_left f from public.casino_live_accounts where user_id = $1`, [ida]))[0].f === 1000);
  ok("the everyday's value left as it is", Number((await sql(`select free_chips f from public.casino_live_settings where id = 1`))[0].f) === 100);
  ok("once a day still", (await rpc("casino_live_free", {}, a)).body?.why === "taken");
  await sql(`update public.casino_live_settings set free_event_until = now() - interval '1 second' where id = 1`);
  const later = await rpc("casino_live_free", {}, names[6]);
  ok("the event over: the everyday's 100, by itself", later.body?.ok === true && later.body?.given === 100, later);
  const st = (await rpc("casino_live_state", {}, a)).body?.settings;
  ok("the page is told both", st?.free_chips === 100 && st?.free_event_chips === 1000 && !!st?.free_event_until && st?.seat_turn_s === 300 && st?.seat_rest_s === 60, st);
  await sql(`update public.casino_live_settings set free_event_chips = 0, free_event_until = null where id = 1`);
}

// ── who may ──
{
  ok("signed out: the seat refused", (await seat(null, 1)).status >= 400);
  const p = (await sql(`select has_function_privilege('authenticated', 'casino.machines_full(timestamptz)', 'EXECUTE') a, has_function_privilege('anon', 'casino.free_chips_now(public.casino_live_settings)', 'EXECUTE') b`))[0];
  ok("the helpers are nobody's to call", p.a === false && p.b === false, p);
}
await sql(`delete from public.casino_live_seats`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
