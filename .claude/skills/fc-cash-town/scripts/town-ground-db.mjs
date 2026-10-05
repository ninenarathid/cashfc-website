// Things dropped on the ground as members will have them, tried in a real browser before anything is pushed: two
// tabs of the dev test room, each kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the
// database with v137 in it (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port).
// Production is not touched.
//
// One member drops a thing from their bag: it is out of the purse the database keeps and lies in its table; the
// other, a few tiles off, sees it within moments (the room says something was dropped, and their page asks), taps
// it, walks up and has it in the purse the database keeps; it is gone from the first one's map; both deeds are
// written down. A thing nobody picks up is gone from both maps after ten seconds, and in nobody's purse. A page
// asking a database that has not had v137 offers to drop nothing more than it did before.
//
//   node town-bench.mjs 3198     (in a scratch folder, see scripts/db/README.md: leave it running; while v137 is a draft beside its test and not in
//                                supabase/, with BENCH_EXTRA=v137_draft.sql)
//   node town-ground-db.mjs <base> <outdir> [bench] [bench without v137]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", G = "window.__townGround";
const post = async (path, body, bench = BENCH) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = [], bench = BENCH) => { const r = await post("/bench/sql", { sql: text, params }, bench); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const lying = (X) => X.evaluate(`${K}.ground()`);
const count = (slots, item) => slots.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const BAG = `document.querySelector('section[aria-labelledby="town-trade-h"]')`;
const bagButton = (X) => X.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
const pocket = async (X, name) => {
  await X.evaluate(`(() => { const b = [...${BAG}.querySelectorAll('ul[aria-label="กระเป๋า"] button')].find((b) => b.getAttribute("aria-label").startsWith(${JSON.stringify(name)})); if (b.getAttribute("aria-pressed") !== "true") b.click(); })()`);
  await sleep(250);
};
const offers = (X, re) => X.evaluate(`[...${BAG}.querySelectorAll("button")].some((b) => ${re}.test(b.innerText.trim()))`);
const press = async (X, re) => { await X.evaluate(`[...${BAG}.querySelectorAll("button")].find((b) => ${re}.test(b.innerText.trim()))?.click()`); await sleep(350); };
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
}
async function enter(X, letter, bench) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=grounddb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
}
const who = async (X, bench = BENCH) => (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await me(X)).id)}`)).json()).id;
const give = (id, bag, bench = BENCH) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb))
  on conflict (member_id) do update set doc = public.town_purses.doc || jsonb_build_object('bag', $2::jsonb)`, [id, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))], bench);
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(200); };

const HERE = [30, 38], OFF = [33, 38];
const A = await browser("grounddb", { width: 1280, height: 860 });
try {
  await enter(A, "D", BENCH);
  const B = await A.tab("grounddb-b");
  await enter(B, "E", BENCH);
  const a = await who(A), b = await who(B);
  ok("the game is the database's here: no trial in either page", (await A.evaluate(`${K}.trial === null`)) === true && (await B.evaluate(`${K}.trial === null`)) === true);
  await sql(`truncate public.town_ground restart identity`);
  await sql(`delete from public.town_deeds where what like 'ground\\_%'`);
  await give(a, [{ item: "kangkong", n: 12 }, { item: "minnow", n: 3 }]);
  await give(b, []);
  await again(A); await again(B);
  await warp(A, ...HERE);
  await warp(B, ...OFF);
  await until("both keepers know of a ground with nothing on it", async () => Array.isArray(await lying(A)) && (await lying(A)).length === 0 && Array.isArray(await lying(B)), 10000);
  ok("both keepers know that things can be dropped, and nothing lies", (await lying(B)).length === 0);

  // dropped from the bag's own panel
  await bagButton(A);
  await until("the bag is open", () => there(A, 'section[aria-labelledby="town-trade-h"]'), 5000);
  await pocket(A, "ผักบุ้ง");
  ok("the bag offers to drop a thing that is worth something", await offers(A, /^ทิ้ง$/));
  await press(A, /^ทิ้ง$/);
  await until("it lies, by the database", async () => (await sql(`select count(*)::int as n from public.town_ground`))[0].n === 1, 8000);
  let row = (await sql(`select g.id::int as id, g.member_id, g.stack, g.x, g.y, (g.until_ms - town.now_ms())::int as left, (select town.held(p.doc->'bag', 'kangkong') from public.town_purses p where p.member_id = g.member_id) as bag from public.town_ground g`))[0];
  ok("dropped: out of the purse the database keeps, lying in its table on my tile, with under ten seconds left", row.member_id === a && row.stack.item === "kangkong" && row.stack.n === 12 && row.x === HERE[0] && row.y === HERE[1]
    && row.bag === 0 && row.left > 5000 && row.left <= 10000, row);
  await press(A, /^ปิด$/);

  // the other sees it, taps it, and has it
  await until("the other's page has it, told through the room", async () => (await lying(B))?.length === 1 && (await B.evaluate(`${G}.boxes().length`)) === 1, 6000);
  ok("the other sees it lie there within moments, with nothing asked by hand", (await lying(B))[0].id === row.id);
  const at = (await B.evaluate(`${G}.boxes()`))[0];
  await tap(B, at.x, at.y);
  await until("the other has it, by the database", async () => (await sql(`select town.held(doc->'bag', 'kangkong') as n from public.town_purses where member_id = $1`, [b]))[0].n === 12, 9000);
  ok("a tap on it walks up and picks it up: in the purse the database keeps, and its line is gone", (await sql(`select count(*)::int as n from public.town_ground`))[0].n === 0 && count((await purse(B)).bag, "kangkong") === 12);
  await until("it is gone from the first one's map", async () => (await lying(A)).length === 0 && (await A.evaluate(`${G}.boxes().length`)) === 0, 6000);
  ok("…and it is gone from the dropper's map, told through the room", !(await there(A, "[data-ground-take]")));
  const deeds = await sql(`select member_id, what, thing, n::int as n, doc->>'whose' as whose from public.town_deeds where what like 'ground\\_%' order by id`);
  ok("both deeds are written down, the picking up with whose it was", deeds.length === 2 && deeds[0].what === "ground_drop" && deeds[0].member_id === a && deeds[1].what === "ground_take" && deeds[1].member_id === b
    && deeds[1].whose === a && deeds[1].thing === "kangkong" && deeds[1].n === 12, deeds);
  await A.shot(`${OUT}/grounddb-after.png`);

  // nobody picks it up
  await warp(B, ...OFF);
  const did = await A.evaluate(`${K}.groundDrop(${K}.purse().bag.findIndex((s) => s?.item === "minnow"), [${HERE[0]}, ${HERE[1]}])`);
  await until("the minnows lie for both", async () => (await lying(A)).length === 1 && (await lying(B))?.length === 1, 6000);
  const began = Date.now();
  await until("ten seconds on they are gone from both maps", async () => (await lying(A)).length === 0 && (await lying(B)).length === 0 && (await A.evaluate(`${G}.boxes().length`)) === 0 && (await B.evaluate(`${G}.boxes().length`)) === 0, 15000, 300);
  const took = Date.now() - began;
  const lost = (await sql(`select (select coalesce(sum(town.held(doc->'bag', 'minnow')), 0)::int from public.town_purses where member_id in ($1, $2)) as held,
    (select count(*)::int from public.town_ground where until_ms > town.now_ms()) as lying`, [a, b]))[0];
  ok("what nobody picks up is gone from both maps after ten seconds, and is in nobody's purse", did.ok === true && took > 5000 && took < 13000 && lost.held === 0 && lost.lying === 0, { took, lost });
  ok("no page errors", A.logs.length === 0 && B.logs.length === 0, [...A.logs, ...B.logs]);

  if (OLD) {
    // a database that has not had v137
    const C = await A.tab("grounddb-old");
    await enter(C, "F", OLD);
    const c = await who(C, OLD);
    ok("(the old stand-in keeps no ground)", (await sql(`select to_regprocedure('public.town_ground()') is null as none`, [], OLD))[0].none === true);
    await give(c, [{ item: "kangkong", n: 4 }, { item: "boot", n: 1 }], OLD);
    await again(C);
    await warp(C, ...HERE);
    await bagButton(C);
    await until("the bag is open", () => there(C, 'section[aria-labelledby="town-trade-h"]'), 5000);
    await pocket(C, "ผักบุ้ง");
    const worth = await offers(C, /^ทิ้ง$/);
    await pocket(C, "รองเท้า");
    const junk = await offers(C, /^ทิ้ง$/);
    // (the button is as it was: offered only for a river find that is worth nothing, and since v118 an old boot fetches three coins)
    ok("a database without it: the keeper knows of no ground, and the bag offers to drop nothing, as before", (await lying(C)) === null && worth === false && junk === false, { worth, junk });
    ok("…and nothing breaks", count((await purse(C)).bag, "kangkong") === 4 && count((await purse(C)).bag, "boot") === 1 && C.logs.length === 0, C.logs);
  }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e.message}`);
  await A.shot(`${OUT}/grounddb-stopped.png`).catch(() => {});
} finally {
  A.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
