// The lines of work as a member will have them, tried in a real browser before anything is pushed: the dev test room
// kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database (scripts/db/town-bench.mjs:
// every migration replayed into PGlite on a local port). Production is not touched.
//
// With v149 in the database: what is written down counts (a deed, a go), the keeper is told the lines, the map has
// their button, the board shows them, and a title worn there is kept by the database and told to everybody. With a
// database that has not had v149 (the page goes out first): the keeper is told nothing, and the map has no button.
//
//   node town-bench.mjs 3197                                   (in a scratch folder, see scripts/db/README.md: the database as it is)
//   BENCH_EXTRA=v149_draft.sql node town-bench.mjs 3198        (…and with v149's draft run after everything)
//   node town-lines-db.mjs <base> <outdir> [bench with v149] [bench without]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = "http://127.0.0.1:3197"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 800)}`); };
const K = "window.__townKeeper", L = `document.querySelector("[data-town-lines]")`;
const post = async (bench, path, body) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (bench, text, params = []) => { const r = await post(bench, "/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const enter = async (X, letter, bench) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=linesdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
};
const member = async (X, bench) => (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await X.evaluate(`window.__cashTown.me()`)).id)}`)).json()).id;

const X = await browser("Lines, the database's", { width: 1280, height: 860 });
try {
  // ── a database with v149 ──
  await enter(X, "U", BENCH);
  const me = await member(X, BENCH);
  // what a member did, written down as the game writes it: three moths, a minnow landed; and a kitchen long stood in
  for (let i = 0; i < 3; i++) await sql(BENCH, `select town.note($1::uuid, 'net', 'moth', 1, 0, '{"haunt": 3}'::jsonb)`, [me]);
  await sql(BENCH, `select town.record($1::uuid, 'fishing', true, 4, false, null, '{"what": "minnow"}'::jsonb)`, [me]);
  await sql(BENCH, `insert into public.town_work (member_id, line, kept) values ($1::uuid, 'kitchen', town.work_new() || '{"points": 400}'::jsonb)
    on conflict (member_id, line) do update set kept = excluded.kept`, [me]);
  await enter(X, "U", BENCH);
  await until("the keeper is told the lines", () => X.evaluate(`!!${K}.lines()`), 15000);
  let told = await X.evaluate(`${K}.lines()`);
  ok("with v149 the keeper is told the lines: what was written down counted as it was", told.lines.insects.points === 3 + 10 + 3 + 3 && told.lines.fishing.points === 1 + 10 && told.lines.kitchen.points === 400 && told.worn === null, told);
  ok("…and today's worth of it", told.lines.insects.today === 19 && told.lines.fishing.today === 11, told.lines);
  ok("the map has the button of the lines", await X.evaluate(`!!document.querySelector("[data-town-lines-button]")`));
  await X.evaluate(`document.querySelector("[data-town-lines-button]").click()`);
  await until("the board opens", () => X.evaluate(`!!${L}`), 6000);
  await sleep(700);
  const cards = await X.evaluate(`[...${L}.querySelectorAll("[data-lines-line]")].map((b) => ({ id: b.dataset.linesLine, rank: Number(b.dataset.rank), points: Number(b.dataset.points) }))`);
  ok("the board shows them: the kitchen at its third rank, the insects under their first", cards.length === 7 && cards.find((c) => c.id === "kitchen").rank === 3 && cards.find((c) => c.id === "insects").points === 19 && cards.find((c) => c.id === "insects").rank === 0, cards);
  await X.evaluate(`${L}.querySelector('[data-lines-line="kitchen"]').click()`);
  await sleep(300);
  await X.evaluate(`${L}.querySelector('[data-lines-wear="2"]').click()`);
  await until("the title is worn", async () => (await X.evaluate(`${L}.querySelector("[data-lines-worn]").dataset.linesWorn`)) === "kitchen:2", 8000);
  const kept = await sql(BENCH, `select line, rank from public.town_titles where member_id = $1::uuid`, [me]);
  ok("a title worn on the board is the database's to keep", JSON.stringify(kept) === JSON.stringify([{ line: "kitchen", rank: 2 }]), kept);
  ok("…and the keeper has it for the names over heads", JSON.stringify((await X.evaluate(`${K}.titles()`))[me]) === JSON.stringify({ line: "kitchen", rank: 2 }), await X.evaluate(`${K}.titles()`));
  const refused = await X.evaluate(`${K}.titleWear({ line: "kitchen", rank: 4 })`);
  ok("a rank not had is refused by the database", refused.ok === false && refused.why === "none", refused);
  await sleep(300);
  await X.shot(`${OUT}/lines-db-worn.png`);
  // somebody else is told of it
  const Y = await X.tab("LinesB");
  await enter(Y, "V", BENCH);
  await until("the other's keeper is told the lines too", () => Y.evaluate(`!!${K}.lines()`), 15000);
  ok("another member is told the title the first wears, and has lines of their own with nothing on them", JSON.stringify((await Y.evaluate(`${K}.titles()`))[me]) === JSON.stringify({ line: "kitchen", rank: 2 })
    && (await Y.evaluate(`${K}.lines()`)).lines.kitchen.points === 0, await Y.evaluate(`${K}.titles()`));
  await X.evaluate(`${L}.querySelector("[data-lines-bare]").click()`);
  await until("worn no more", async () => (await sql(BENCH, `select count(*)::int as n from public.town_titles`))[0].n === 0, 8000);
  ok("and taken off, it is gone from the database", true);

  // ── a database as it is today: the page is out, the file has not run ──
  await enter(X, "W", OLD);
  await sleep(2500);
  ok("without v149 the keeper is told nothing of lines", (await X.evaluate(`${K}.lines()`)) === null && Object.keys(await X.evaluate(`${K}.titles()`)).length === 0);
  ok("…and the map has no button for them", !(await X.evaluate(`!!document.querySelector("[data-town-lines-button]")`)));
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
