// Woodcutting as members will have it, tried in a real browser before anything is pushed: two windows of the dev
// test room, each kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with the
// woodcutters' part of v164 in it (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local
// port). Production is not touched. `next dev` only: the mountain is there and nowhere else yet.
//
// One member walks up to a pine with an axe in the hand and fells it on the board: the wood is in the purse the
// database keeps, the tree in its table, the deed and the go written down, the points on the line. The other sees
// the stump within moments (the room says a tree fell, and their page asks), and is refused it. The stand-in's clock
// put forward, the tree is back for both. A tree this axe will not bite is refused by the database's word.
//
//   (in the scratch folder of the dry runs, see scripts/db/README.md; leave it running)
//   BENCH_EXTRA=<a seed of the catalog as the code has it>.sql,<repo>/.claude/skills/fc-cash-town/scripts/db/v164.felling.sql node town-bench.mjs 3186
//   node town-felling-db.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameGone } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3186"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", R = "window.__townTrees", G = "window.__townGame";
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const count = (slots, item) => slots.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=fellingdb&townHour=12&townWeather=clear&townAt=slope&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
  await until("the trees' layer", () => X.evaluate(`!!${R} && ${R}.wood().length > 100`), 60000);
}
const who = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await me(X)).id)}`)).json()).id;
const give = (id, bag) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb))
  on conflict (member_id) do update set doc = public.town_purses.doc || jsonb_build_object('bag', $2::jsonb, 'powers', '{}'::jsonb)`, [id, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
/** A tile beside a tree that no other tree is beside, where there is one. */
const beside = (X, id) => X.evaluate(`(() => { const wood = ${R}.wood(), t = wood.find((x) => x.id === ${id}), n = t.size || 1, all = [];
  const far = (o, x, y) => { const m = o.size || 1; return Math.max(Math.max(o.x - x, 0, x - (o.x + m - 1)), Math.max(o.y - y, 0, y - (o.y + m - 1))); };
  for (let y = t.y - 1; y <= t.y + n; y++) for (let x = t.x - 1; x <= t.x + n; x++) if ((x < t.x || x >= t.x + n || y < t.y || y >= t.y + n) && ${V}.walkable(x, y)) all.push([x, y, wood.filter((o) => o.id !== t.id && far(o, x, y) <= 1).length]);
  all.sort((a, b) => a[2] - b[2]);
  return all[0] ?? null; })()`);
const standBy = async (X, id) => { const at = await beside(X, id); await X.evaluate(`${V}.warp(${at[0]}, ${at[1]})`); await sleep(900); return at; };

const A = await browser("fellingdb", { width: 1280, height: 860 });
try {
  await enter(A, "J");
  const B = await A.window("fellingdb-b", { width: 1280, height: 860 });
  await enter(B, "L");
  const a = await who(A), b = await who(B);
  ok("the game is the database's here: no trial in either page", (await A.evaluate(`${K}.trial === null`)) === true && (await B.evaluate(`${K}.trial === null`)) === true);
  await sql(`delete from public.town_trees where true`);
  await sql(`delete from public.town_deeds where what in ('fell', 'root')`);
  await sql(`delete from public.town_work where line = 'felling'`);
  await give(a, [{ item: "axe", n: 1 }]);
  await give(b, [{ item: "axe", n: 1 }]);
  for (const X of [A, B]) await X.evaluate(`${K}.hold(0).then(() => null)`);
  await until("both keepers know the database keeps trees, and every one is grown", async () => (await A.evaluate(`${K}.trees()?.down.length`)) === 0 && (await B.evaluate(`${K}.trees()?.down.length`)) === 0, 15000);
  ok("the database keeps the mountain's trees, and tells both that every one is grown", true);
  ok("both hold an axe, in the purse the database keeps", (await purse(A)).hand === "axe" && (await purse(B)).hand === "axe");

  // a pine with nothing else near, a little way from where both came in
  const tree = await A.evaluate(`(() => { const all = ${R}.wood().filter((t) => t.tier === 1 && !t.elder); return all.find((t) => !all.some((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= 2)).id; })()`);
  await standBy(A, tree);
  await until("the tree is offered", async () => (await A.evaluate(`${R}.here()`)) === tree, 8000, 100);
  await A.evaluate(`${R}.begin(${tree})`);
  await until("the board, made from what the database said", async () => (await A.evaluate(`${G}?.kind ?? null`)) === "felling", 8000, 60);
  const s = await A.evaluate(`${G}.state()`);
  ok("the board is the game the database put together: twelve chops, branches seen three up", s.chops === 12 && s.ahead === 3 && s.pace === 1 && s.trees === 1, s);
  await A.shot(`${OUT}/felling-db-1-board.png`);
  await A.evaluate(`${G}.auto(true, 130)`);
  await gameGone(A, 20000);
  await until("the card", () => A.evaluate(`!!${R}.card() || !!${R}.note()`), 8000, 60);
  const card = await A.evaluate(`${R}.card()`);
  ok("felled: the card says what the database gave", !!card && JSON.stringify(card.got) === JSON.stringify([["log", 2], ["timber", 2]]), { card, note: await A.evaluate(`${R}.note()`) });
  await A.shot(`${OUT}/felling-db-2-card.png`);
  const kept = (await sql(`select doc from public.town_purses where member_id = $1`, [a]))[0].doc;
  ok("the wood is in the purse the database keeps, and two stamina are gone", count(kept.bag, "log") === 2 && count(kept.bag, "timber") === 2 && kept.stamina.left === 98 && count((await purse(A)).bag, "log") === 2, kept.stamina);
  const row = (await sql(`select member_id, felled_at is not null as down from public.town_trees where tree = $1`, [tree]))[0];
  ok("the tree is in the database's table, felled by that member", row?.member_id === a && row.down === true, row);
  const deeds = await sql(`select what, thing, doc from public.town_deeds where member_id = $1 and what = 'fell'`, [a]);
  ok("the deed is written down", deeds.length === 1 && deeds[0].thing === "pine" && deeds[0].doc.tree === tree, deeds);
  const play = (await sql(`select game, won, doc from public.town_plays where member_id = $1 order by id desc limit 1`, [a]))[0];
  ok("and the go, as a game", play?.game === "felling" && play.won === true && play.doc.hits === 12, play);
  const line = (await sql(`select kept from public.town_work where member_id = $1 and line = 'felling'`, [a]))[0];
  ok("twelve points on the woodcutters' line (two, and ten for the first pine)", line?.kept.points === 12, line);
  ok("it is a stump on the feller's map", (await A.evaluate(`${R}.looks()[${tree}]`)) === 0);

  // the other tester: told through the room, with no asking of their own
  await until("the other's map has the stump", async () => (await B.evaluate(`${R}.looks()[${tree}]`)) === 0, 8000, 150).then(() => ok("the other member's map has the stump within moments", true), (e) => ok("the other member's map has the stump within moments", false, e.message));
  await standBy(B, tree);
  ok("it is not offered to them", (await B.evaluate(`${R}.here()`)) !== tree);
  await B.evaluate(`${R}.begin(${tree})`);
  await until("a note", () => B.evaluate(`!!${R}.note()`), 5000, 60).catch(() => {});
  ok("and walked up to, the database says only that it is not grown", (await B.evaluate(`${R}.note()`)) === "ยังไม่โต" && (await B.evaluate(`${G}?.kind ?? null`)) === null, await B.evaluate(`${R}.note()`));

  // forty-one minutes on, by the database's clock
  await post("/bench/skip", { ms: 41 * 60_000 });
  for (const X of [A, B]) await X.evaluate(`${K}.nudged("trees")`);
  await until("the tree is back on both maps", async () => (await A.evaluate(`${R}.looks()[${tree}] ?? 3`)) === 3 && (await B.evaluate(`${R}.looks()[${tree}] ?? 3`)) === 3, 10000, 200)
    .then(() => ok("forty-one minutes on, by the database's clock, the tree is grown again for both", true), (e) => ok("forty-one minutes on, by the database's clock, the tree is grown again for both", false, e.message));
  await until("offered again", async () => (await B.evaluate(`${R}.here()`)) === tree, 6000, 150).catch(() => {});
  await B.evaluate(`${R}.begin(${tree})`);
  await until("the other's board", async () => (await B.evaluate(`${G}?.kind ?? null`)) === "felling", 8000, 60);
  await B.evaluate(`${G}.auto(true, 130)`);
  await gameGone(B, 20000);
  await until("the card", () => B.evaluate(`!!${R}.card() || !!${R}.note()`), 8000, 60);
  ok("and the other fells it", JSON.stringify((await B.evaluate(`${R}.card()`))?.got) === JSON.stringify([["log", 2], ["timber", 2]]), await B.evaluate(`${R}.note()`));
  ok("it is their stump in the database now", (await sql(`select member_id from public.town_trees where tree = $1`, [tree]))[0]?.member_id === b);

  // a tree of the upper terrace
  const iron = await A.evaluate(`${R}.wood().find((t) => t.tier === 2).id`);
  await sleep(2700);
  await standBy(A, iron);
  await A.evaluate(`${R}.begin(${iron})`);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 5000, 60).catch(() => {});
  ok("a tree of the upper terrace: the database's word is that this axe will not bite", (await A.evaluate(`${R}.note()`)) === "ขวานนี้ฟันไม่เข้า" && (await A.evaluate(`${G}?.kind ?? null`)) === null, await A.evaluate(`${R}.note()`));

  // the line on the lines' board, given by this database
  ok("the database gives the woodcutters' line and its gifts", (await A.evaluate(`(${K}.lines()?.given ?? []).includes("felling")`)) === true && (await A.evaluate(`${K}.gives("charmEchoAxe")`)) === true);
  for (const X of [A, B]) ok(`${X.label}: no page errors`, X.errors().length === 0, X.errors());
} catch (e) {
  fail++;
  console.log(`  FAIL the check itself: ${e.message}`);
  await A.shot(`${OUT}/felling-db-failed.png`).catch(() => {});
  console.log(`  logs: ${JSON.stringify(A.logs.slice(-6))}`);
} finally {
  try { await A.close(); } catch { /* gone already */ }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
