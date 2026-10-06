// The familiars as a member will have them, tried in a real browser before anything is pushed: the dev test room
// kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database (scripts/db/town-bench.mjs:
// every migration replayed into PGlite on a local port). Production is not touched.
//
// With v152 in the database: the keeper says which gifts are given, a familiar is taken on "ตัวฉัน" and kept by the
// database, called (the database keeps which follows, another member's page is told and draws it), changed, sent to
// rest, each written down; one not had is refused. With a database that has not had v152 (the page goes out first):
// the charms are offered as before and no familiar is, on the leaf, on the rung, or in the count.
//
//   node town-bench.mjs 3197                                   (in a scratch folder, see scripts/db/README.md: the database as it is)
//   BENCH_EXTRA=v152_draft.sql node town-bench.mjs 3198        (…and with v152's draft run after everything)
//   node town-familiar-db.mjs <base> <outdir> [bench with v152] [bench without]
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
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=famdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
};
const member = async (X, bench) => (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await X.evaluate(`window.__cashTown.me().id`)))}`)).json()).id;
const points = (bench, me, line, n) => sql(bench, `insert into public.town_work (member_id, line, kept) values ($1::uuid, $2, town.work_new() || jsonb_build_object('points', $3::int))
  on conflict (member_id, line) do update set kept = excluded.kept`, [me, line, n]);
const kept = async (bench, me) => (await sql(bench, `select doc->'gifts' as g from public.town_purses where member_id = $1::uuid`, [me]))[0]?.g ?? null;
const click = async (X, sel, wait = 600) => { await X.evaluate(`document.querySelector(${JSON.stringify(sel)}).click()`); await sleep(wait); };
const seenBy = (Y, id) => Y.evaluate(`(window.__cashTown.people().find((p) => p.id === ${JSON.stringify(id)})?.pet ?? null)`);
const due = (X) => X.evaluate(`[...${M}.querySelectorAll("[data-me-take]")].map((b) => b.dataset.meTake).join()`);

const X = await browser("Familiars, the database's", { width: 1280, height: 860 });
try {
  // ── a database with v152 ──
  await enter(X, "P", BENCH);
  const me = await member(X, BENCH), mine = await X.evaluate(`window.__cashTown.me().id`);
  for (const [line, n] of [["forest", 160], ["insects", 160], ["farming", 60]]) await points(BENCH, me, line, n);
  await enter(X, "P", BENCH);
  await until("the keeper is told the lines, and which gifts are given", () => X.evaluate(`!!${K}.lines() && ${K}.gives("famSquirrel") === true`), 15000);
  ok("with v152 the keeper says which gifts are given: the charms and the familiars", await X.evaluate(`${K}.gives("charmLamp") && ${K}.gives("famGnome") && !${K}.gives("noSuchGift")`));
  await click(X, "[data-town-lines-button]", 900);
  await click(X, `[data-lines-leaf="me"]`, 700);
  ok("what waits on \"ตัวฉัน\": the forest's two ranks, the insects' two, the farm's first", (await due(X)) === "charmLamp,famSquirrel,charmNet,famButterfly,charmHoe", await due(X));
  for (const id of ["famSquirrel", "famButterfly"]) await click(X, `[data-me-take="${id}"]`, 900);
  await until("two had", async () => ((await kept(BENCH, me))?.had?.length === 2), 8000);
  ok("a familiar taken is the database's to keep: in the purse there, in no slot of the bag, and following nobody yet", JSON.stringify((await kept(BENCH, me)).had) === '["famSquirrel","famButterfly"]' && (await kept(BENCH, me)).familiar === null
    && (await sql(BENCH, `select count(*)::int as n from public.town_purses p, jsonb_array_elements(p.doc->'bag') s where p.member_id = $1::uuid and s->>'item' like 'fam%'`, [me]))[0].n === 0
    && (await X.evaluate(`${M}.querySelector("[data-me-fam]").dataset.meFam`)) === "" && (await X.evaluate(`${M}.querySelector("[data-me-count]").dataset.meCount`)) === "2/9", await kept(BENCH, me));
  // (another member in the room, to be told)
  const Y = await X.tab("FamiliarsOther");
  await enter(Y, "Q", BENCH);
  await until("the other is in the room", async () => (await seenBy(Y, mine)) !== null, 20000);
  await click(X, `[data-me-call="famSquirrel"]`, 900);
  await until("it follows on the leaf", () => X.evaluate(`${M}.querySelector("[data-me-fam]").dataset.meFam === "famSquirrel"`), 8000);
  ok("called on the leaf, the database keeps which follows", (await kept(BENCH, me)).familiar === "famSquirrel", await kept(BENCH, me));
  await until("the other member's page is told", async () => (await seenBy(Y, mine)) === "famSquirrel", 8000);
  ok("…and another member's page is told which, to draw it at my heels", true);
  await sleep(900);
  await X.shot(`${OUT}/familiar-db-own.png`);
  await Y.shot(`${OUT}/familiar-db-seen.png`);
  await click(X, `[data-me-call="famButterfly"]`, 900);
  await until("changed", async () => (await kept(BENCH, me)).familiar === "famButterfly" && (await seenBy(Y, mine)) === "famButterfly", 8000);
  ok("another called in its place: the database keeps the one, and the other member is told", true);
  const noFam = await X.evaluate(`${K}.familiarWear("famGnome")`), notOne = await X.evaluate(`${K}.familiarWear("charmLamp")`);
  ok("the database refuses one not had, and a charm as a familiar", noFam.ok === false && noFam.why === "none" && notOne.ok === false && notOne.why === "none" && (await kept(BENCH, me)).familiar === "famButterfly", { noFam, notOne });
  // (the page read again: what follows is the database's, and the room is told of it again)
  await enter(X, "P", BENCH);
  await until("the purse read again, and the room told", () => X.evaluate(`${K}.purse().gifts?.familiar === "famButterfly" && window.__cashTown.me().pet === "famButterfly"`), 15000);
  ok("the page opened again has what follows me, from the database, and tells the room", true);
  await click(X, "[data-town-lines-button]", 900);
  await click(X, `[data-lines-leaf="me"]`, 700);
  await click(X, `[data-me-fam="famButterfly"]`, 900);
  await until("at rest", async () => (await kept(BENCH, me)).familiar === null, 8000);
  await until("the other is told it rests", async () => (await seenBy(Y, mine)) === "", 8000);
  ok("a tap sends it to rest: the database keeps none, and the other member is told", true);
  const written = await sql(BENCH, `select thing, n::int as n from public.town_deeds where member_id = $1::uuid and what = 'familiar' order by id`, [me]);
  ok("each calling and the rest are written down", JSON.stringify(written) === '[{"thing":"famSquirrel","n":1},{"thing":"famButterfly","n":1},{"thing":null,"n":0}]', written);
  await Y.close?.();

  // ── a database as it is today: the page is out, the file has not run ──
  await enter(X, "R", OLD);
  const old = await member(X, OLD);
  for (const [line, n] of [["forest", 160], ["insects", 160]]) await points(OLD, old, line, n);
  await enter(X, "R", OLD);
  await until("the keeper is told the lines, and that gifts are given", () => X.evaluate(`!!${K}.lines() && ${K}.gifting() === true`), 15000);
  await sleep(1200);
  ok("without v152 the keeper gives the charms as before and no familiar", await X.evaluate(`${K}.gives("charmLamp") && !${K}.gives("famSquirrel") && !${K}.gives("famGnome")`));
  await click(X, "[data-town-lines-button]", 900);
  await X.evaluate(`${L}.querySelector('[data-lines-line="forest"]').click()`);
  await sleep(350);
  ok("…the rung of the second rank, had, offers nothing, and the first its lamp", await X.evaluate(`!!${L}.querySelector('[data-lines-rank="2"][data-state="had"]') && !${L}.querySelector('[data-lines-rank="2"] [data-lines-take]') && !!${L}.querySelector('[data-lines-rank="1"] [data-lines-take]')`));
  await click(X, `[data-lines-leaf="me"]`, 700);
  ok("…and on \"ตัวฉัน\" only the charms wait, counted of six", (await due(X)) === "charmLamp,charmNet" && (await X.evaluate(`${M}.querySelector("[data-me-count]").dataset.meCount`)) === "0/6" && (await X.evaluate(`!${M}.querySelector("[data-me-call]")`)), await due(X));
  await X.shot(`${OUT}/familiar-db-before.png`);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
