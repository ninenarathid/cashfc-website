// The feast table as members will have it, tried in a real browser before anything is pushed: two tabs of the dev
// test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with v159 in it
// (scripts/db/town-bench.mjs). Production is not touched.
//
// The keeper is told of the table with the pots. A dish set on it from the table's panel is the database's, on the
// table; the other member, with an empty bag, sits down to a helping out of the table's own bowl: the database has
// the meal begun and lent, the pot a helping the less, the two deeds written down; five minutes on by its clock the
// meal is over with no bowl given. A pot set down outside the yard is on the ground, and an hour on both pages have
// it on the table before anybody asks, and the database once it is asked. A page asking a database that has not had
// v159 offers no table, and a pot set down in the yard stands where it was set.
//
//   BENCH_EXTRA=<v159's file, plain line ends> node town-bench.mjs 3197     (in the scratch folder of the dry runs: leave it running)
//   node town-bench.mjs 3196                                                   (one that has not had it, for the last part)
//   node town-feast-db.mjs <base> <outdir> [bench] [bench without v159]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
const { KITCHEN, YARD_SEATS } = await import("../../../../lib/town/world.ts");

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3197", OLD = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", C = "window.__townCook", P = `document.querySelector("[data-feast-panel]")`;
const post = async (path, body, bench = BENCH) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = [], bench = BENCH) => { const r = await post("/bench/sql", { sql: text, params }, bench); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const pots = (X) => X.evaluate(`${K}.pots().map((p) => ({ id: p.id, dish: p.dish, left: p.left, feast: !!p.feast, at: p.at, name: p.name }))`);
const offers = (X) => X.evaluate(`${C}.offers()`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const warp = async (X, [x, y]) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const full = (dish, left) => ({ item: "potFull", n: 1, of: { dish, left } });
const lay = (id, bag, more = {}, bench = BENCH) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb)
  on conflict (member_id) do update set doc = town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb`,
  [id, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)], bench);
const whoIs = async (X, bench = BENCH) => (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await me(X)).id)}`)).json()).id;
const reread = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(300); };
async function enter(X, letter, bench) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=feastdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
}
const openTable = async (X) => {
  await until("the table is offered", async () => (await offers(X)).includes("feast"), 10000);
  await X.evaluate(`document.querySelector('[data-cook-offer="feast"]').click()`);
  await until("the table's panel is up", () => X.evaluate(`!!${P}`), 4000);
  await sleep(350);
};

const TILE = KITCHEN.feast.tile, places = new Set(KITCHEN.places.map((p) => p.at.join(",")));
const FLOOR = KITCHEN.floor.filter(([x, y]) => !places.has(`${x},${y}`) && !KITCHEN.wash.some(([wx, wy]) => wx === x && wy === y) && !(x === TILE[0] && y === TILE[1]));
const OUTSIDE = [30, 38];
const A = await browser("feastdb", { width: 1280, height: 860 });
try {
  await enter(A, "X", BENCH);
  const a = await whoIs(A);
  ok("the game is the database's here: no trial in the page", (await A.evaluate(`${K}.trial === null`)) === true);
  await sql(`delete from public.town_pots`);
  await lay(a, [full("friedMinnow", 3), full("friedMinnow", 2)]);
  await reread(A);
  await until("the keeper has the bag", async () => (await purse(A)).bag.filter((s) => s?.item === "potFull").length === 2, 8000);
  const told = await A.evaluate(`${K}.feast()`);
  ok("the keeper is told of the feast table by the database: six pots a member, an hour on the ground, its tile", told?.pots === 6 && told.ground === 60 && told.tile?.join() === TILE.join(), told);

  await warp(A, FLOOR[3]);
  await openTable(A);
  let mark = Number((await sql(`select coalesce(max(id), 0) as n from public.town_deeds`))[0].n);
  await A.evaluate(`${P}.querySelector("[data-feast-set]").click()`);
  await until("the pot is on the table", async () => (await pots(A)).some((p) => p.feast), 8000);
  let rows = await sql(`select o.id::text as id, o.member_id as by, o.dish, o.helpings, o.x, o.y, o.feast from public.town_pots o order by o.id`);
  ok("a pot set on the table from its panel is the database's: on the table, on its tile, out of the purse it keeps", rows.length === 1 && rows[0].feast === true && rows[0].by === a && rows[0].helpings === 3 && rows[0].x === TILE[0] && rows[0].y === TILE[1]
    && (await sql(`select town.held(p.doc->'bag', 'potFull') as n from public.town_purses p where p.member_id = $1`, [a]))[0].n === 1, rows);
  let deeds = await sql(`select d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [mark]);
  ok("…written down with the tile stood on and that it went onto the table", deeds.length === 1 && deeds[0].what === "pot_down" && deeds[0].doc.feast === true && deeds[0].doc.tile?.join() === FLOOR[3].join(), deeds);
  const saidA = await A.evaluate(`${P}.querySelector("[data-feast-said]")?.innerText ?? ""`);
  ok("…and the panel says until when it stands there", /โต๊ะเลี้ยง/.test(saidA) && /\d\d:\d\d/.test(saidA), saidA);
  await A.shot(`${OUT}/feastdb-set.png`);
  await A.evaluate(`${P}.querySelector("[data-feast-close]").click()`);

  const B = await A.tab("feastdb-B");
  await enter(B, "Y", BENCH);
  const b = await whoIs(B);
  await lay(b, [], { stamina: { day: 0, left: 0 } });
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 10)) where member_id = $1`, [b]);
  await reread(B);
  await warp(B, FLOOR[9]);
  await openTable(B);
  const line = await B.evaluate(`(() => { const li = ${P}.querySelector("[data-feast-pot]"); return { words: li.innerText, eat: !li.querySelector("[data-feast-eat]").disabled, ladle: !li.querySelector("[data-feast-ladle]").disabled, take: !!li.querySelector("[data-feast-take]") }; })()`);
  ok("the other member, on the yard's floor with an empty bag, reads the pot with its cook's name: to eat at the table, not to ladle or take", /โดย/.test(line.words) && line.eat && !line.ladle && !line.take, line);
  mark = Number((await sql(`select coalesce(max(id), 0) as n from public.town_deeds`))[0].n);
  await B.evaluate(`${P}.querySelector("[data-feast-eat]").click()`);
  await until("they are sat at one of the yard's tables", async () => ((await me(B)).sit ?? -1) >= YARD_SEATS, 20000);
  await until("the meal has begun, by the database", async () => !!(await sql(`select p.doc->'eating' as e from public.town_purses p where p.member_id = $1`, [b]))[0].e, 10000);
  const kept = (await sql(`select p.doc->'eating' as eating, p.doc->'bag' as bag, (select o.helpings from public.town_pots o limit 1) as left from public.town_purses p where p.member_id = $1`, [b]))[0];
  ok("\"eat at the table\": sat at the yard's table, the database has the helping begun out of the table's bowl, nothing in the bag, the pot a helping the less",
    kept.eating?.dish === "friedMinnow" && kept.eating.lent === true && kept.bag.every((s) => s === null) && kept.left === 2 && (await purse(B)).eating?.lent === true, kept);
  deeds = await sql(`select d.member_id as by, d.what, d.thing, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [mark]);
  ok("…written down as ladled from its cook's pot out of the table's bowl, and eaten", deeds.length === 2 && deeds[0].what === "ladle" && deeds[0].by === b && deeds[0].doc.whose === a && deeds[0].doc.bowl === "table" && deeds[1].what === "eat", deeds);
  ok("…and the cook's page has the pot a helping the less, told through the room", (await until("the cook's page knows", async () => (await pots(A))[0]?.left === 2, 10000)) === true, await pots(A));
  await sleep(600);
  await B.shot(`${OUT}/feastdb-eating.png`);
  await post("/bench/skip", { ms: 5 * 60_000 + 5000 });
  await until("the meal is over on the page", async () => !(await purse(B)).eating, 30000);
  await sleep(1200);
  const after = (await sql(`select p.doc->'eating' as eating, p.doc->'bag' as bag, p.doc->'owed' as owed, (p.doc->'stamina'->>'left')::float8 as left from public.town_purses p where p.member_id = $1`, [b]))[0];
  ok("five minutes on by the database's clock the meal is over: its stamina had, and no bowl given nor owed", after.eating === null && after.bag.every((s) => s === null) && after.owed === null && after.left > 10, after);

  // a pot on the ground outside the yard: the map's own offer, what it says, and an hour on
  await lay(a, [full("friedMinnow", 2)], { hand: "potFull" });
  await reread(A);
  await A.evaluate(`${K}.hold(0).then(() => null)`);
  await warp(A, OUTSIDE);
  await until("setting it down is offered", async () => (await offers(A)).includes("down"), 8000);
  await A.evaluate(`document.querySelector('[data-cook-offer="down"]').click()`);
  await until("it stands on the ground", async () => (await pots(A)).some((p) => !p.feast), 8000);
  const note = await A.evaluate(`${C}.note()`);
  ok("set down outside the yard it is on the ground, and what is said is until when, and that it then goes to the feast table", /โต๊ะเลี้ยง/.test(note ?? "") && /\d\d:\d\d/.test(note ?? "")
    && (await sql(`select count(*)::int as n from public.town_pots o where not o.feast and o.x = $1 and o.y = $2`, OUTSIDE))[0].n === 1, note);
  await post("/bench/skip", { ms: 61 * 60_000 });
  // (each page learns the database's clock with its next answer; from then it has the pot on the table by itself)
  await reread(A); await reread(B);
  ok("an hour on, both pages have it on the table", (await until("both pages", async () => (await pots(A)).every((p) => p.feast) && (await pots(B)).every((p) => p.feast) && (await pots(B)).length === 2, 60000)) === true, { a: await pots(A), b: await pots(B) });
  // (asked as the room's word makes a page ask: the database tidies its pots before it tells of them)
  await A.evaluate(`${K}.nudged("kitchen")`);
  await until("the database has been asked", async () => (await sql(`select count(*)::int as n from public.town_pots o where not o.feast`))[0].n === 0, 15000).catch(() => {});
  rows = await sql(`select o.feast, o.x, o.y from public.town_pots o order by o.id`);
  ok("…and so has the database, once it is asked", rows.length === 2 && rows.every((r) => r.feast && r.x === TILE[0] && r.y === TILE[1]), rows);
  ok("no page errors on either page", A.errors().length === 0 && B.errors().length === 0, [...A.errors(), ...B.errors()]);

  if (OLD) {
    console.log("\n── a database that has not had v159 ──");
    const O = await A.tab("feastdb-old");
    await enter(O, "Z", OLD);
    const o = await whoIs(O, OLD);
    await sql(`delete from public.town_pots`, [], OLD);
    await lay(o, [full("friedMinnow", 3)], { hand: "potFull" }, OLD);
    await reread(O);
    await O.evaluate(`${K}.hold(0).then(() => null)`);
    await warp(O, FLOOR[3]);
    await until("setting it down is offered", async () => (await offers(O)).includes("down"), 8000);
    ok("the keeper is told of no feast table, and the page offers none", (await O.evaluate(`${K}.feast()`)) === null && !(await offers(O)).includes("feast"), await offers(O));
    const word = await O.evaluate(`document.querySelector('[data-cook-offer="down"]').innerText`);
    await O.evaluate(`document.querySelector('[data-cook-offer="down"]').click()`);
    await until("it stands in the yard", async () => (await pots(O)).length === 1, 8000);
    const stood = await pots(O);
    ok("a pot set down in the yard stands where it was set, as it always did, and nothing says otherwise", !stood[0].feast && stood[0].at.join() === FLOOR[3].join() && !/โต๊ะเลี้ยง/.test(word) && !/โต๊ะเลี้ยง/.test((await O.evaluate(`${C}.note()`)) ?? ""), { stood, word });
    ok("no page errors there", O.errors().length === 0, O.errors());
  }
} catch (e) {
  fail++;
  console.log(`  FAIL the check fell over: ${e.message}`);
  await A.shot(`${OUT}/feastdb-fell.png`).catch(() => {});
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await A.quit?.();
}
process.exit(fail ? 1 : 0);
