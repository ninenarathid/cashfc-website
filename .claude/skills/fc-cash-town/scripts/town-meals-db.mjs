// Three helpings and buffs at their levels as a member will have them, tried in a real browser before anything is
// pushed: the dev test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database
// (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not touched.
//
// With v145 in the database: the keeper says a meal's hours take three helpings, three are eaten and a fourth
// refused, the buff is a level higher with each, and the bag shows the helpings and the level. With a database that
// has not had v145 (the page goes out first): the keeper says one, the bag marks one helping to a meal, and a dish
// is not offered a second time, so nothing is asked that would be refused.
//
//   node town-bench.mjs 3197                                   (in a scratch folder, see scripts/db/README.md: the database as it is)
//   BENCH_EXTRA=v145_draft.sql node town-bench.mjs 3198        (…and with v145's draft run after everything)
//   node town-meals-db.mjs <base> <outdir> [bench with v145] [bench without]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = "http://127.0.0.1:3197"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const post = async (bench, path, body) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (bench, text, params = []) => { const r = await post(bench, "/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const enter = async (X, letter, bench) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=mealsdb&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
};
/** The bench's clock put to an hour of today's or tomorrow's in Bangkok, whichever is next. */
const clockTo = async (bench, hour) => {
  const now = Number((await sql(bench, `select town.now_ms() as n`))[0].n), day = 86400000, bkk = 7 * 3600000;
  const at = Math.floor((now + bkk) / day) * day - bkk + hour * 3600000;
  await post(bench, "/bench/skip", { ms: (at > now ? at : at + day) - now });
};
/** A tester's purse written as the SQL editor would, and the page loaded again to read it. */
const give = async (X, letter, bench, doc) => {
  const id = (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await X.evaluate(`window.__cashTown.me()`)).id)}`)).json()).id;
  await sql(bench, `insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 10)) || $2::jsonb)
    on conflict (member_id) do update set doc = excluded.doc`, [id, JSON.stringify(doc)]);
  await enter(X, letter, bench);
  return id;
};
/** One helping eaten up: sat down to by the keeper, five minutes and a second put on the bench's clock, the meal counted. */
const eat = async (X, bench, dish) => {
  const slot = await X.evaluate(`${K}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(dish)})`);
  const sat = await X.evaluate(`${K}.sitDown(${slot}, true)`);
  if (!sat.ok) return sat;
  await post(bench, "/bench/skip", { ms: 5 * 60_000 + 1000 });
  await X.evaluate(`fetch(${JSON.stringify(bench)} + "/rest/v1/rpc/town_chew", { method: "POST", headers: { "content-type": "application/json", "x-town-as": window.__cashTown.me().id }, body: JSON.stringify({ p_company: 0 }) }).then((r) => r.json())`).catch(() => null);
  await X.evaluate(`${K}.nudged?.("stall")`).catch(() => null);
  return sat;
};
const openBag = async (X) => {
  if (!(await X.evaluate(`!!${TRADE}`))) { await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`); await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 5000); }
  await sleep(500);
  return X.evaluate(`(() => { const el = ${TRADE}; return { meals: [...el.querySelectorAll("[data-meal]")].map((m) => ({ had: Number(m.dataset.bowls), marks: m.querySelectorAll("span[aria-hidden] > span").length })),
    levels: [...el.querySelectorAll("[data-buff-level]")].map((m) => Number(m.dataset.buffLevel)), text: el.innerText.replace(/\\s+/g, " ") }; })()`);
};
const BAG = [{ item: "tomYum", n: 5 }, { item: "bowl", n: 1 }, ...Array(8).fill(null)];

const X = await browser("Meals, the database's", { width: 390, height: 844, mobile: true });
try {
  // ── a database with v145 ──
  await clockTo(BENCH, 11.2);
  await enter(X, "P", BENCH);
  await give(X, "P", BENCH, { bag: BAG });
  ok("with v145 the keeper says a meal's hours take three helpings", (await X.evaluate(`${K}.helpings()`)) === 3, await purse(X));
  ok("a first helping is eaten", (await eat(X, BENCH, "tomYum")).ok === true);
  await enter(X, "P", BENCH);
  let p = await purse(X);
  ok("…it is counted, and leaves its buff at the first level", JSON.stringify(p.meals.bowls) === JSON.stringify([0, 1, 0]) && JSON.stringify(p.buffs?.map((b) => [b.id, b.level])) === JSON.stringify([["hearty", 1]]), { meals: p.meals, buffs: p.buffs });
  ok("a second and a third", (await eat(X, BENCH, "tomYum")).ok === true && (await (async () => { await enter(X, "P", BENCH); return eat(X, BENCH, "tomYum"); })()).ok === true);
  await enter(X, "P", BENCH);
  p = await purse(X);
  ok("…the buff is at the third level, and lunch has had its three", p.buffs?.[0]?.level === 3 && JSON.stringify(p.meals.bowls) === JSON.stringify([0, 3, 0]), { meals: p.meals, buffs: p.buffs });
  const fourth = await X.evaluate(`${K}.sitDown(${K}.purse().bag.findIndex((s) => s?.item === "tomYum"), true)`);
  ok("a fourth in the same hours is refused by the database", fourth.ok === false && fourth.why === "meal", fourth);
  let seen = await openBag(X);
  ok("the bag marks three helpings to a meal, lunch's all had, and the buff's level", JSON.stringify(seen.meals) === JSON.stringify([{ had: 0, marks: 3 }, { had: 3, marks: 3 }, { had: 0, marks: 3 }])
    && JSON.stringify(seen.levels) === JSON.stringify([3]) && /ขั้น 3/.test(seen.text), seen);
  await X.shot(`${OUT}/meals-db-three.png`);

  // ── a database as it is today: the page is out, the file has not run ──
  await clockTo(OLD, 11.2);
  await enter(X, "Q", OLD);
  await give(X, "Q", OLD, { bag: BAG });
  ok("without v145 the keeper says one helping, as the database counts", (await X.evaluate(`${K}.helpings()`)) === 1, (await purse(X)).meals);
  ok("a helping is eaten, as ever", (await eat(X, OLD, "tomYum")).ok === true);
  await enter(X, "Q", OLD);
  p = await purse(X);
  ok("…with its buff as it always was, and no level", p.buff?.id === "hearty" && p.buffs === undefined && p.meals.eaten[1] === true && p.meals.bowls === undefined, { buff: p.buff, meals: p.meals });
  seen = await openBag(X);
  ok("the bag marks one helping to a meal, and lunch's is had", JSON.stringify(seen.meals) === JSON.stringify([{ had: 0, marks: 1 }, { had: 1, marks: 1 }, { had: 0, marks: 1 }]) && seen.levels.length === 0 && /อิ่มทน/.test(seen.text), seen);
  // (a dish taken up in the bag is not offered again: nothing is asked that would be refused)
  await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((b) => b.getAttribute("aria-label")?.includes("ต้มยำปลาช่อน") || b.title?.includes("ต้มยำปลาช่อน"))?.click()`);
  await sleep(400);
  const eatButton = await X.evaluate(`(() => { const b = [...${TRADE}.querySelectorAll("button")].find((x) => x.innerText.trim() === "กิน"); return b ? { disabled: b.disabled } : null; })()`);
  ok("…and the dish is not offered a second time", eatButton === null || eatButton.disabled === true, { eatButton, text: (await openBag(X)).text.slice(0, 400) });
  await X.shot(`${OUT}/meals-db-old.png`);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
