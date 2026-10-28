// v312 on the stand-in (node town-bench.mjs 3299 with v312 last in BENCH_EXTRA): Casino Coins back into Popoto coins,
// ten for nine; the free ones still unspent kept for spinning (spent first); not while a spin turns, nor with the
// admins' trial still to wipe; a retry pays nothing twice; nobody signed out. The worked-out count for the coins there
// before v312 too (its block run again on a history laid down here). node town-casino-cashout-db.mjs
const B = "http://127.0.0.1:3299";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d).slice(0, 400)}`); };
const sql = async (q, p = []) => { const r = await (await fetch(`${B}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: q, params: p }) })).json(); if (!r.rows) throw new Error(JSON.stringify(r)); return r.rows; };
const rpc = async (name, args, as) => { const r = await fetch(`${B}/rest/v1/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json", ...(as ? { "x-town-as": as } : {}) }, body: JSON.stringify(args) }); return [r.status, await r.json().catch(() => null)]; };
const who = async (as) => (await (await fetch(`${B}/bench/who?as=${as}`)).json()).id;
const uuid = () => crypto.randomUUID();
const account = async (id) => (await sql(`select chips, free_left from public.casino_live_accounts where user_id = $1`, [id]))[0];
const purse = async (id) => Number((await sql(`select coins from public.town_purses where member_id = $1`, [id]))[0]?.coins ?? 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100 where id = 1`);
const a = await who("v312-a"), y = await who("v312-y"), adm = await who("v312-adm");
for (const id of [a, y, adm]) {
  await sql(`delete from public.casino_live_spins where user_id = $1`, [id]);
  await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [id]);
  await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [id]);
  await sql(`update public.casino_live_accounts set chips = 0, free_left = 0, available_at = now() - interval '1 minute' where user_id = $1`, [id]);
  await sql(`select town.purse_of($1, true)`, [id]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [id]);
}

// ── the count worked out for coins there before v312: free in, a spin, free in again, as v312's own block does ──
{
  const block = `update public.casino_live_accounts a set free_left = least(casino.free_left_of(a.user_id), greatest(a.chips, 0))::integer where a.user_id = '${y}'`;
  const at = (min) => `now() - interval '${min} minutes'`;
  await sql(`insert into public.casino_live_chip_moves (request, user_id, kind, chips, day, test, at) values (gen_random_uuid(), $1, 'free', 100, 1, false, ${at(30)})`, [y]);
  await sql(`insert into public.casino_live_spins (id, user_id, player_name, machine, revision, price, reels, prize, forced, created_at, reveal_at, trail)
             values (gen_random_uuid(), $1, 'y', 2, 1, 100, '["seven","cherry","gold","popoto"]', null, false, ${at(20)}, ${at(20)} + interval '4 seconds', '{"chips": true}')`, [y]);
  await sql(`insert into public.casino_live_chip_moves (request, user_id, kind, chips, day, test, at) values (gen_random_uuid(), $1, 'free', 100, 2, false, ${at(10)})`, [y]);
  await sql(`update public.casino_live_accounts set chips = 150 where user_id = $1`, [y]);
  await sql(block);
  ok("worked out: free in, spent by a spin, free in again: the second hundred unspent", (await account(y)).free_left === 100, await account(y));
  await sql(`update public.casino_live_accounts set chips = 50 where user_id = $1`, [y]);
  await sql(block);
  ok("and never more than the coins held", (await account(y)).free_left === 50, await account(y));
}

// ── a member: bought and free ──
let r = await rpc("casino_live_buy", { p_request: uuid(), p_chips: 300 }, "v312-a");
ok("bought 300", r[1]?.ok && r[1].chips === 300, r);
r = await rpc("casino_live_free", {}, "v312-a");
ok("today's free 100", r[1]?.ok && r[1].chips === 400, r);
ok("the free ones counted unspent", (await account(a)).free_left === 100, await account(a));
r = await rpc("casino_live_state", {}, "v312-a");
ok("the state says the free ones unspent", r[1]?.account?.free_left === 100 && r[1]?.account?.chips === 400, r[1]?.account);

const first = uuid(), p0 = await purse(a);
r = await rpc("casino_live_cashout", { p_request: first, p_chips: 30 }, "v312-a");
ok("30 back: 27 Popoto coins", r[1]?.ok && r[1].got === 27 && r[1].chips === 370, r);
ok("into the purse", (await purse(a)) === p0 + 27, { was: p0, now: await purse(a) });
r = await rpc("casino_live_cashout", { p_request: first, p_chips: 30 }, "v312-a");
ok("the same request again pays nothing twice", r[1]?.ok && r[1].got === 27 && (await purse(a)) === p0 + 27 && (await account(a)).chips === 370, { r, purse: await purse(a) });
r = await rpc("casino_live_cashout", { p_request: first, p_chips: 40 }, "v312-a");
ok("the same request for another amount refused", r[1]?.ok === false && r[1].why === "amount", r);
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: 280 }, "v312-a");
ok("the free hundred is not changed back (370 held, 270 may go)", r[1]?.ok === false && r[1].why === "chips", r);
for (const bad of [25, 0, 5, -10]) {
  r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: bad }, "v312-a");
  ok(`${bad} refused: tens, ten at the least`, r[1]?.ok === false && r[1].why === "amount", r);
}

// ── a spin spends the free ones first, and while it turns nothing goes back ──
const revision = Number((await sql(`select revision from public.casino_live_settings where id = 1`))[0].revision);
r = await rpc("casino_live_spin", { p_request: uuid(), p_machine: 3, p_revision: revision }, "v312-a");
ok("a spin", r[0] === 200 && !!r[1], r);
ok("it spent the free hundred first", (await account(a)).free_left === 0, await account(a));
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: 10 }, "v312-a");
ok("while it turns: wait", r[1]?.ok === false && r[1].why === "turning", r);
await sleep(3900);
const held = (await account(a)).chips;
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: Math.floor(held / 10) * 10 }, "v312-a");
ok("stopped: all of it back, the win too", r[1]?.ok && r[1].chips === held % 10, { held, r });

// ── shut: still changed back ──
await sql(`update public.casino_live_accounts set chips = chips + 100 where user_id = $1`, [a]);
await sql(`update public.casino_live_settings set access = 'closed', open = false where id = 1`);
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: 100 }, "v312-a");
ok("the casino shut: still changed back", r[1]?.ok && r[1].got === 90, r);

// ── nobody signed in ──
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: 10 }, null);
ok("nobody signed in is refused", r[0] >= 400, r);
const priv = await sql(`select has_function_privilege('anon', 'public.casino_live_cashout(uuid,integer)', 'EXECUTE') anon_may, has_function_privilege('authenticated', 'public.casino_live_cashout(uuid,integer)', 'EXECUTE') members_may`);
ok("anon may not, members may", priv[0].anon_may === false && priv[0].members_may === true, priv);

// ── the admins' trial: its coins are the wipe's ──
await sql(`update public.profiles set is_admin = true where id = $1`, [adm]);
await sql(`update public.casino_live_settings set access = 'admins', open = false where id = 1`);
r = await rpc("casino_live_buy", { p_request: uuid(), p_chips: 200 }, "v312-adm");
ok("an admin buys in the trial", r[1]?.ok, r);
r = await rpc("casino_live_cashout", { p_request: uuid(), p_chips: 100 }, "v312-adm");
ok("trial coins are not changed back", r[1]?.ok === false && r[1].why === "trial", r);
r = await rpc("casino_live_free", {}, "v312-adm");
ok("trial free coins counted", r[1]?.ok && (await account(adm)).free_left === 100, { r, acc: await account(adm) });
r = await rpc("casino_live_wipe_tests", {}, "v312-adm");
ok("the wipe takes them back", r[0] === 200, r);
const after = await account(adm);
ok("and the free ones unspent never more than the coins left", after.free_left <= after.chips && after.chips === 0, after);

// ── Codex's two: a trial's free coins on bought ones, and a trial's spin of real free ones, both undone by the wipe ──
const b1 = await who('v312-b1'), b2 = await who('v312-b2');
for (const id of [b1, b2]) {
  await sql(`delete from public.casino_live_spins where user_id = $1`, [id]); await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [id]);
  await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [id]);
  await sql(`update public.casino_live_accounts set chips = 0, free_left = 0, available_at = now() - interval '1 minute' where user_id = $1`, [id]);
  await sql(`select town.purse_of($1, true)`, [id]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [id]);
  await sql(`update public.profiles set is_admin = true where id = $1`, [id]);
}
await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
await rpc('casino_live_buy', { p_request: uuid(), p_chips: 100 }, 'v312-b1');
await rpc('casino_live_free', {}, 'v312-b2');
await sql(`update public.casino_live_settings set access = 'admins', open = false where id = 1`);
await rpc('casino_live_free', {}, 'v312-b1');
const rev2 = Number((await sql(`select revision from public.casino_live_settings where id = 1`))[0].revision);
r = await rpc('casino_live_spin', { p_request: uuid(), p_machine: 5, p_force: 'miss', p_revision: rev2 }, 'v312-b2');
ok('a trial spin of the real free hundred', r[0] === 200, r);
await sleep(3900);
r = await rpc('casino_live_wipe_tests', {}, 'v312-b1');
ok('wiped', r[0] === 200, r);
await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
ok('bought hundred, trial free hundred wiped: all of it may go back', JSON.stringify(await account(b1)) === JSON.stringify({ chips: 100, free_left: 0 }), await account(b1));
ok('real free hundred, its trial spin wiped: still free, not going back', JSON.stringify(await account(b2)) === JSON.stringify({ chips: 100, free_left: 100 }), await account(b2));
r = await rpc('casino_live_cashout', { p_request: uuid(), p_chips: 10 }, 'v312-b2');
ok('and refused', r[1]?.ok === false && r[1].why === 'chips', r);

await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
