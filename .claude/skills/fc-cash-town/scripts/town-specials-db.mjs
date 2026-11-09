// The specials through the database's keeper against the stand-in with v324 (town-bench.mjs 3299): a silkie hen set up
// in the stand-in for the tester, its chance forced to 1 there, collected from the page: the harvest card, the special
// in the purse the database keeps, the strip on the animal, the first finder told; and a look shows the book's page.
//   node town-specials-db.mjs <base> <outdir> <bench>   (the stand-in: BENCH_FROM=<a bench through v323> BENCH_EXTRA=<v324> node db/town-bench.mjs 3299)
import { browser, sleep, status, until } from "./cdp.mjs";
const [BASE = "http://localhost:3274", OUT = ".", DB = "http://127.0.0.1:3299"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const sql = async (q, params = []) => { const r = await fetch(`${DB}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: q, params }) }); return r.json(); };
const X = await browser("specials-db", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=D&townRoom=specialsdb&townHour=9&townWeather=clear&townDb=${encodeURIComponent(DB)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the pasture", () => X.evaluate(`!!window.__townPasture`), 60000);
  const tester = await X.evaluate(`window.__townKeeper.id`);
  const member = (await (await fetch(`${DB}/bench/who?as=${encodeURIComponent(tester)}`)).json()).id ?? (await (await fetch(`${DB}/bench/who?as=${encodeURIComponent(tester)}`)).json());
  const me = typeof member === "string" ? member : member?.id;
  const now = Number((await sql("select town.now_ms() n")).rows?.[0]?.n ?? Date.now());
  const day = (await sql("select town.day_of($1::bigint) d", [now])).rows?.[0]?.d;
  const id = "77777777-7777-4777-8777-777777777777";
  await sql(`insert into public.town_herds (owner, h, changed) values ($1, $2, 0) on conflict (owner) do update set h = excluded.h`,
    [me, JSON.stringify({ owner: me, barn: 3, room: 4, door: [[now - 4 * 3600000, now - 2 * 3600000]], credit: 0, lastCare: now, facade: 0, care: "named", carers: [] })]);
  await sql(`insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, 0) on conflict (id) do update set a = excluded.a, owner = excluded.owner`,
    [id, me, JSON.stringify({ id, owner: me, species: "chicken", breed: "silkie", name: "โมจิ", born: now - 10 * 86400000, bought: false, home: "barn", sex: "f", stats: { thrift: 2, gentle: 2, vigor: 2 }, streak: 6,
      at: now, food: 20, grown: 500, made: 0, banked: 2, hearts: 200, today: { day, pet: true, treat: true }, speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 4, body: 3,
      round: { since: now - 5 * 3600000, ate: ["chickFeed", "meadowOats"] } })]);
  await sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb)) on conflict (member_id) do update set doc = public.town_purses.doc || jsonb_build_object('bag', $2::jsonb)`, [me, JSON.stringify([{ item: "eggBasket", n: 1 }, ...Array(9).fill(null)])]);
  await X.evaluate(`window.__townKeeper.hold(-1).then(() => null)`);
  await sql(`update public.town_catalog set data = jsonb_set(jsonb_set(data, '{specials,knobs,cap}', '1'), '{specials,knobs,perDay}', '{"real": 100, "fantasy": 100, "legend": 100}') where key = 'animals'`);
  // (the page reads the world again: a look)
  await X.evaluate(`window.__townKeeper.animals({ action: "look" })`);
  await sleep(1500);
  await X.evaluate(`window.__townView.warp(205, 36)`); await sleep(2500);
  await X.evaluate(`window.__townPasture.collect(${JSON.stringify(id)}, { hits: 4, misses: 0, secs: 5 }, 0)`);
  await until("the harvest card", () => X.evaluate(`!!document.querySelector("[data-harvest]")`), 20000).catch(() => {});
  ok("db: the harvest card shows the special", await X.evaluate(`document.querySelector("[data-harvest]")?.dataset.harvest === "silkieTwinEgg"`));
  ok("db: the strip's six wells", await X.evaluate(`document.querySelectorAll("[data-harvest] [data-well]").length === 6`));
  await X.shot(`${OUT}/db-1-harvest.png`);
  const purse = (await sql("select town.purse_of($1, false) p", [me])).rows?.[0]?.p;
  const n = (purse?.bag ?? []).filter((s) => s?.item === "silkieTwinEgg").reduce((t, s) => t + s.n, 0);
  ok("db: the special in the purse the database keeps", n >= 1, purse?.bag);
  ok("db: the book's count kept", purse?.animalSpecials?.silkie === 1, purse?.animalSpecials);
  const a = (await sql("select a from public.town_animals where id = $1", [id])).rows?.[0]?.a;
  ok("db: the strip kept on the animal", a?.strips?.length === 1 && a.strips[0].special === "silkieTwinEgg", a?.strips);
  ok("db: the page's world has the first finder", await X.evaluate(`window.__townPasture.world()?.specials?.silkie?.by === ${JSON.stringify(me)}`));
  await X.evaluate(`document.querySelector("[data-harvest-close]")?.click()`);
  await X.evaluate(`window.__townPasture.open("book")`); await sleep(1200);
  ok("db: the book shows the special found", await X.evaluate(`document.querySelector('[data-book-special="silkieTwinEgg"]')?.dataset.seen === "true"`));
  await X.shot(`${OUT}/db-2-book.png`);
  ok("db: no page errors", X.errors().length === 0, X.errors());
} finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
