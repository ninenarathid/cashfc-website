// v308 on the stand-in (node town-bench.mjs 3299 with v308 last in BENCH_EXTRA): today's own count, stopped reels only,
// nobody else's, nobody signed out. node town-casino-mine-db.mjs
const B = "http://127.0.0.1:3299";
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d).slice(0, 400)}`); };
const sql = async (q, p = []) => { const r = await (await fetch(`${B}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: q, params: p }) })).json(); if (!r.rows) throw new Error(JSON.stringify(r)); return r.rows; };
const call = async (as) => { const r = await fetch(`${B}/rest/v1/rpc/casino_live_mine`, { method: "POST", headers: { "content-type": "application/json", ...(as ? { "x-town-as": as } : {}) }, body: "{}" }); return [r.status, await r.json().catch(() => null)]; };

await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
// two members with a proved character (whoever the stand-in's testers are)
const people = await (await fetch(`${B}/bench/who?as=v308-a`)).json(), other = await (await fetch(`${B}/bench/who?as=v308-b`)).json();
const a = people.id, b = other.id;
ok("two testers", !!a && !!b && a !== b, { a, b });
await sql(`delete from public.casino_live_spins where user_id in ($1, $2)`, [a, b]);
const spin = (id, user, minutesAgo, revealIn, prize, price = 100) => sql(
  `insert into public.casino_live_spins (id, user_id, player_name, machine, revision, price, reels, prize, forced, created_at, reveal_at)
   values ($1, $2, 'x', 4, 1, $3, '["seven","seven","cherry","gold"]'::jsonb, $4::jsonb, false, now() - make_interval(mins => $5), now() - make_interval(mins => $5) + make_interval(secs => $6))`,
  [id, user, price, prize === null ? null : JSON.stringify(prize), minutesAgo, revealIn]);
const coin = (n) => ({ id: "pair", name: `${n} Casino Coin`, kind: "coin", amount: n, test: false });
await spin("00000000-0000-4000-8000-000000000001", a, 30, 3.6, coin(150));
await spin("00000000-0000-4000-8000-000000000002", a, 20, 3.6, null);
await spin("00000000-0000-4000-8000-000000000003", a, 10, 3.6, { id: "gold", name: "1,000,000 Gil", kind: "gil", amount: 1000000, test: false });
// still turning: counts for nothing yet
await spin("00000000-0000-4000-8000-000000000004", a, 0, 600, coin(500));
// another member's
await spin("00000000-0000-4000-8000-000000000005", b, 5, 3.6, coin(70));
// the day before (two days back, past any 05:00)
await spin("00000000-0000-4000-8000-000000000006", a, 60 * 29, 3.6, coin(999));

const [st, got] = await call("v308-a");
ok("a member is answered", st === 200 && got?.ok === true, [st, got]);
ok("today's spins, stopped only, mine only", got?.spins === 3, got?.spins);
ok("what they cost", got?.spent === 300, got?.spent);
ok("the Casino Coins back (not the Gil, not the turning one)", got?.back === 150, got?.back);
ok("how many won", got?.wins === 2, got?.wins);
ok("the wins newest first, with machine, faces and prize", got?.won?.length === 2 && got.won[0].prize.kind === "gil" && got.won[1].prize.amount === 150 && got.won[0].machine === 4 && got.won[0].reels.length === 4, got?.won);
const [stB, gotB] = await call("v308-b");
ok("the other member sees only theirs", stB === 200 && gotB?.spins === 1 && gotB?.back === 70, gotB);
const [stN, gotN] = await call(null);
ok("nobody signed in is refused", stN >= 400, [stN, gotN]);
const priv = await sql(`select has_function_privilege('anon', 'public.casino_live_mine()', 'EXECUTE') anon_may, has_function_privilege('authenticated', 'public.casino_live_mine()', 'EXECUTE') members_may`);
ok("anon may not, members may", priv[0].anon_may === false && priv[0].members_may === true, priv);
// the casino shut: the same refusal as the state's
await sql(`update public.casino_live_settings set access = 'closed', open = false where id = 1`);
const [stS] = await call("v308-a");
const stState = (await fetch(`${B}/rest/v1/rpc/casino_live_state`, { method: "POST", headers: { "content-type": "application/json", "x-town-as": "v308-a" }, body: "{}" })).status;
// (one's own spins, as the room's state is read while it is shut: the same member check)
ok("a shut casino answers as its state does", stS === stState, { mine: stS, state: stState });
await sql(`update public.casino_live_settings set access = 'everyone', open = true where id = 1`);
await sql(`delete from public.casino_live_spins where id::text like '00000000-0000-4000-8000-00000000000%'`);
console.log(`${pass} passed, ${fail} failed`);
