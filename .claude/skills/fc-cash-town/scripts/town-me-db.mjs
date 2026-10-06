// "ตัวฉัน" and the gifts of ranks as a member will have them, tried in a real browser before anything is pushed: the
// dev test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database
// (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not touched.
//
// With v151 in the database: the keeper says gifts are given, a rank's gift is taken on its rung and kept by the
// database, charms are worn on the leaf of what I wear and kept there too, a third is refused. With a database that
// has not had v151 (the page goes out first): the keeper says none are given, the board has one leaf, no rung offers
// anything, and my own card has no way to "ตัวฉัน".
//
//   node town-bench.mjs 3197                                   (in a scratch folder, see scripts/db/README.md: the database as it is)
//   BENCH_EXTRA=v151_draft.sql node town-bench.mjs 3198        (…and with v151's draft run after everything)
//   node town-me-db.mjs <base> <outdir> [bench with v151] [bench without]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = "http://127.0.0.1:3197"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 800)}`); };
const K = "window.__townKeeper", L = `document.querySelector("[data-town-lines]")`, M = `document.querySelector("[data-town-me]")`;
const post = async (bench, path, body) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (bench, text, params = []) => { const r = await post(bench, "/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const enter = async (X, letter, bench) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=medb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
};
const member = async (X, bench) => (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await X.evaluate(`window.__cashTown.me().id`)))}`)).json()).id;
const points = (bench, me, line, n) => sql(bench, `insert into public.town_work (member_id, line, kept) values ($1::uuid, $2, town.work_new() || jsonb_build_object('points', $3::int))
  on conflict (member_id, line) do update set kept = excluded.kept`, [me, line, n]);
const kept = async (bench, me) => (await sql(bench, `select doc->'gifts' as g from public.town_purses where member_id = $1::uuid`, [me]))[0]?.g ?? null;
const click = async (X, sel, wait = 600) => { await X.evaluate(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(wait); };

const X = await browser("Me, the database's", { width: 1280, height: 860 });
try {
  // ── a database with v151 ──
  await enter(X, "P", BENCH);
  const me = await member(X, BENCH);
  for (const [line, n] of [["kitchen", 60], ["fishing", 60], ["helpers", 55], ["forest", 20]]) await points(BENCH, me, line, n);
  await enter(X, "P", BENCH);
  await until("the keeper is told the lines, and that gifts are given", () => X.evaluate(`!!${K}.lines() && ${K}.gifting() === true`), 15000);
  ok("with v151 the keeper says that gifts are given", true);
  await until("the dot", () => X.evaluate(`document.querySelector("[data-town-lines-button]")?.dataset.due === ""`), 8000);
  ok("…and a dot on the lines' button says one waits", true);
  await click(X, "[data-town-lines-button]", 900);
  await X.evaluate(`${L}.querySelector('[data-lines-line="kitchen"]').click()`);
  await sleep(350);
  await click(X, `[data-lines-take="1"]`, 900);
  await until("the rung names it", () => X.evaluate(`${L}.querySelector('[data-lines-rank="1"] [data-lines-gift]')?.dataset.linesGift === "charmApron"`), 8000);
  ok("a rank's gift taken on its rung is the database's to keep: in the purse there, and in no slot of the bag", JSON.stringify((await kept(BENCH, me))?.had) === '["charmApron"]'
    && (await sql(BENCH, `select count(*)::int as n from public.town_purses p, jsonb_array_elements(p.doc->'bag') s where p.member_id = $1::uuid and s->>'item' like 'charm%'`, [me]))[0].n === 0, await kept(BENCH, me));
  await click(X, `[data-lines-leaf="me"]`, 700);
  for (const id of ["charmGloves", "charmFloat"]) await click(X, `[data-me-take="${id}"]`, 900);
  await until("three had", async () => ((await kept(BENCH, me))?.had?.length === 3), 8000);
  await click(X, `[data-me-charm="charmFloat"]`, 900);
  await click(X, `[data-me-charm="charmGloves"]`, 900);
  await until("two worn", () => X.evaluate(`${M}.querySelector("[data-me-worn]").dataset.meWorn === "charmFloat,charmGloves"`), 8000);
  ok("two charms put on are kept by the database, in their order", JSON.stringify((await kept(BENCH, me)).charms) === '["charmFloat","charmGloves"]', await kept(BENCH, me));
  const third = await X.evaluate(`${K}.charmsWear(["charmFloat", "charmGloves", "charmApron"])`), early = await X.evaluate(`${K}.giftTake("forest", 1)`), again = await X.evaluate(`${K}.giftTake("kitchen", 1)`);
  ok("the database refuses a third, a gift of a rank not reached, and one taken twice", third.why === "slots" && early.why === "rank" && again.why === "had", { third, early, again });
  ok("each taking and wearing is written down", (await sql(BENCH, `select count(*) filter (where what = 'gift')::int as gifts, count(*) filter (where what = 'charms')::int as wearings from public.town_deeds where member_id = $1::uuid`, [me]))[0].gifts === 3
    && (await sql(BENCH, `select count(*)::int as n from public.town_deeds where member_id = $1::uuid and what = 'charms'`, [me]))[0].n === 2);
  await X.shot(`${OUT}/me-db-worn.png`);
  // (the page read again: what I wear is the database's, and is there)
  await enter(X, "P", BENCH);
  await until("the purse read again", () => X.evaluate(`(${K}.purse().gifts?.charms ?? []).join() === "charmFloat,charmGloves"`), 15000);
  ok("the page opened again has what I wear, from the database", true);

  // ── a database as it is today: the page is out, the file has not run ──
  await enter(X, "Q", OLD);
  const old = await member(X, OLD);
  await points(OLD, old, "kitchen", 60);
  await enter(X, "Q", OLD);
  await until("the keeper is told the lines", () => X.evaluate(`!!${K}.lines()`), 15000);
  await sleep(1500);
  ok("without v151 the keeper says no gifts are given, and no dot waits", (await X.evaluate(`${K}.gifting()`)) === false && (await X.evaluate(`document.querySelector("[data-town-lines-button]").dataset.due === undefined`)));
  await click(X, "[data-town-lines-button]", 900);
  await X.evaluate(`${L}.querySelector('[data-lines-line="kitchen"]').click()`);
  await sleep(350);
  ok("…the board has one leaf, and the rung of a rank had offers nothing", await X.evaluate(`!${L}.querySelector("[data-lines-leaf]") && !${L}.querySelector("[data-lines-take]") && !${L}.querySelector("[data-lines-gift]") && !!${L}.querySelector('[data-lines-rank="1"][data-state="had"]')`));
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
