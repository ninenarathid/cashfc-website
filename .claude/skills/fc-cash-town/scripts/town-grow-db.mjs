// A plant let grow over its ground, tried in real browsers before anything is pushed: the dev test room kept by the
// database's keeper against a stand-in with v317 in it (scripts/db/town-bench.mjs from the bench kept after v316, with a reader of
// the town's news for v309, which does not replay there, and v317 as BENCH_EXTRA). Production is not touched.
//
// Three testers. A's page presses the button on a ripe pumpkin; the database takes the square, the seeds, and keeps the bed.
// The clock put on, A calls: the town's news goes out, B follows its "ไปช่วย" and joins, C joins, A starts; their reports
// bring it out, A's page picks it and the relatives pay, once, the coins on its deed. A ripe plant's gold is asked by the
// grower's page alone, and comes back on the map. An animal found grown has its size from the database, which the page shows.
//
//   node town-bench.mjs 3299   (BENCH_FROM=<the kept bench> BENCH_EXTRA=<news reader>,<v317>)
//   node town-grow-db.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3231", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView", K = "window.__townKeeper";
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r).slice(0, 400)}`); return r.rows; };
const enter = async (X, letter) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=growdb&townHour=11&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 60000);
  await until("view", () => X.evaluate(`!!${V} && !!${V}.tileScreen`), 60000);
};
const memberOf = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
const go = async (X, x, y, ms = 2000) => { await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 9, y: 9 }).catch(() => {}); await X.evaluate(`(() => { ${V}.warp(${x}, ${y}); ${V}.lookAt(${x + 0.5}, ${y + 0.5}); })()`); await sleep(ms); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const click = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`);

const A = await browser("growA", { width: 1280, height: 860 });
const B = await browser("growB", { width: 384, height: 730, dpr: 2, mobile: true });
const C = await browser("growC", { width: 1280, height: 860 });
try {
  await sql("update public.town_knobs set value = 1 where key = 'game_open'");
  await enter(A, "A");
  const a = await memberOf(A), H = 3_600_000;
  const now = async () => Number((await sql("select town.now_ms() n"))[0].n);
  const t0 = await now();
  const bed = (await sql("select town.bed_of(134, 6) b"))[0].b, farm = (await sql("select town.cat('farming') f"))[0].f, [cx, cy] = farm.bedsAt[bed];
  const rx = cx + 3, ry = cy + 3, ROOT = `${rx},${ry}`;
  const Q = (c, nar = 0) => ({ at: t0 + 9000 * H, span: 100, area: [c, c, c, c], nar: [nar * 5, nar * 5, 0] });
  const plant = (more = {}) => ({ by: a, crop: "pumpkin", sown: t0 - 200 * H, boost: 0, watered: 0, fed: 0, guard: t0 + 900 * H, cured: 0, picked: 0, pickedAt: 0, q: Q(88), ...more });
  await sql("insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0", [bed, a, t0]);
  await sql("delete from public.town_plots where bed = $1", [bed]);
  for (let y = 0; y < farm.side; y++) for (let x = 0; x < farm.side; x++) await sql("insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', null, $4)", [cx + x, cy + y, bed, t0]);
  await sql("update public.town_plots set plant = $1 where x = $2 and y = $3", [JSON.stringify(plant()), rx, ry]);
  const purse = (await sql("select town.purse_of($1, true) p", [a]))[0].p;
  await sql("select town.keep_purse($1, $2::jsonb)", [a, JSON.stringify({ ...purse, bag: [{ item: "seedPumpkin", n: 9 }, ...purse.bag.slice(1).map(() => null)] })]);
  await enter(A, "A"); await sleep(1000);
  await A.evaluate(`(window.__townZoomFree = true, ${V}.zoom(1.1))`);

  // ── the press ──
  await go(A, rx, ry, 2400);
  await until("chip", () => has(A, "[data-quality-chip]"), 20000); await click(A, "[data-quality-chip]"); await sleep(700);
  ok("the inspector offers to let it grow", await has(A, "[data-quality-grow-open]"));
  await click(A, "[data-quality-grow-open]"); await sleep(600);
  await click(A, '[data-quality-grow-size="4"]'); await sleep(300);
  ok("the panel says the ground is ready", await has(A, '[data-quality-grow-status="ready"]'));
  await click(A, "[data-quality-grow-go]");
  await until("grown", async () => (await sql("select plant->'size' s from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].s !== null, 15000);
  const size = (await sql("select plant->'size' s, plant->'footprint' f from public.town_plots where x = $1 and y = $2", [rx, ry]))[0];
  ok("the database has it on four a side", size.s.n === 4 && size.f.length === 16, size);
  ok("every plot of its square holds it", (await sql("select count(*)::int c from public.town_plots where bed = $1 and plant->>'root' = $2", [bed, ROOT]))[0].c === 16);
  ok("three seeds gone", (await sql("select town.purse_of($1, false) p", [a]))[0].p.bag[0]?.n === 6);
  ok("the bed is kept to its end", Number((await sql("select tended from public.town_beds where bed = $1", [bed]))[0].tended) >= size.s.until);
  ok("the panel closes and the inspector says it swells", !(await has(A, "[data-quality-grow]")) && await has(A, "[data-quality-swelling]"));
  await click(A, '[data-quality-inspector] [aria-label="ปิด"]'); await sleep(300);
  await go(A, rx + 1, cy + 6, 1800); await A.shot(`${OUT}/db-young.png`);

  // ── grown, called: the news, go and help ──
  await sql("update public.town_plots set plant = jsonb_set(plant, '{size,until}', to_jsonb($1::bigint)), changed = $2 where x = $3 and y = $4", [(await now()) - 1000, await now(), rx, ry]);
  await enter(A, "A"); await sleep(800);
  await go(A, rx + 1, cy + 6, 2400);
  ok("ripe, its keeper is offered the pull", await has(A, "[data-giant-pull-open]"));
  await enter(B, "B"); await enter(C, "C");
  const b = await memberOf(B), c = await memberOf(C);
  await click(A, "[data-giant-pull-open]"); await sleep(1200);
  ok("called, short of hands", await has(A, '[data-giant-pull="call"]') && await A.evaluate(`document.querySelector("[data-giant-pull-go]")?.disabled === true`));
  const news = await sql("select subject, toward, kind from public.town_announcements where kind = 'pull' order by id desc limit 1");
  ok("the town's news says which and where", news[0]?.subject === "ฟักทองยักษ์ 4×4" && news[0]?.toward?.hook === ROOT, news[0]);
  await until("the news on B's page", () => has(B, "[data-giant-go]"), 45000).catch(() => {});
  ok("B's page has its way there", await has(B, "[data-giant-go]"));
  await B.shot(`${OUT}/db-news-phone.png`);
  const from = await B.evaluate(`${V}.self()`);
  await click(B, "[data-giant-go]"); await sleep(1200);
  await until("B has walked to the plant, through the farm's gate", async () => { const at = await B.evaluate(`${V}.self()`); return Math.abs(at.x - rx) + Math.abs(at.y - ry) <= 8; }, 120000).then(() => ok("and it takes them all the way there, through the farm's gate", true)).catch(async () => ok("and it takes them all the way there, through the farm's gate", false, { from, at: await B.evaluate(`${V}.self()`) }));
  await go(B, rx + 2, cy + 6, 1800);
  await until("B may join", () => has(B, "[data-giant-pull-join]"), 15000);
  await click(B, "[data-giant-pull-join]"); await sleep(1000);
  await go(C, rx, cy + 6, 1800);
  await until("C may join", () => has(C, "[data-giant-pull-join]"), 15000);
  await click(C, "[data-giant-pull-join]"); await sleep(1500);
  const crew = (await sql("select plant->'pull'->'crew' c from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].c;
  ok("three in the crew", crew.length === 3 && crew.includes(b) && crew.includes(c), crew);
  await until("the start opens on A's page", () => A.evaluate(`document.querySelector("[data-giant-pull-go]")?.disabled === false`), 20000);
  await A.shot(`${OUT}/db-call.png`);
  await click(A, "[data-giant-pull-go]"); await sleep(1500);
  ok("a go under way", Number((await sql("select plant->'pull'->>'go' g from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].g) > 0);

  // ── their reports bring it out; A's page picks it, the relatives pay once ──
  const coins0 = (await sql("select town.purse_of($1, false) p", [a]))[0].p.coins;
  await post("/bench/skip", { ms: 3000 + 14 * 1300 });
  const swings = JSON.stringify(Array.from({ length: 11 }, (_, i) => i));
  await sleep(600);
  const r1 = await A.evaluate(`${K}.giantPull("hits", [${rx}, ${ry}], ${swings})`), r2 = await B.evaluate(`${K}.giantPull("hits", [${rx}, ${ry}], ${swings})`);
  ok("both reports taken", r1?.ok === true && r2?.ok === true, [r1?.why, r2?.why]);
  await until("sold", async () => (await sql("select town.purse_of($1, false) p", [a]))[0].p.coins > coins0, 25000);
  const coins1 = (await sql("select town.purse_of($1, false) p", [a]))[0].p.coins;
  const deed = (await sql("select coins, thing from public.town_deeds where what = 'pick' and member_id = $1 order by at desc limit 1", [a]))[0];
  ok("the coins are on its deed", Number(deed.coins) === coins1 - coins0 && deed.thing === "pumpkin", { deed, coins0, coins1 });
  ok("its whole square is cleared", (await sql("select count(*)::int c from public.town_plots where bed = $1 and plant is not null", [bed]))[0].c === 0);
  await sleep(1500);
  ok("A's board says what the relatives paid", await has(A, "[data-giant-pull-sale]"));
  await A.shot(`${OUT}/db-sold.png`);
  await sleep(2500);
  ok("nothing more is paid", (await sql("select town.purse_of($1, false) p", [a]))[0].p.coins === coins1);
  ok("the helper who pulled is credited", (await sql("select count(*)::int c from public.town_deeds where what = 'giant_help' and member_id = $1", [b]))[0].c === 1);

  // ── gold: asked by the grower's page, shown on the map ──
  await sql("update town.quality_salt set salt = '' where one");
  const sown = (await sql(`select s from generate_series(0, 4000) g(i), lateral (select $1::bigint - g.i * 500 as s) x
     where (town.quality_harvest($2, jsonb_build_object('crop', 'tomato', 'by', $3::text, 'sown', x.s, 'picked', 0, 'pickedAt', 0, 'boost', 0, 'q', $4::jsonb), 0, $1::bigint, '', 0, false)->>'gold')::boolean limit 1`,
    [(await now()) - 200 * H, ROOT, a, JSON.stringify(Q(100, 20))]))[0].s;
  await sql("update public.town_plots set soil = 'tilled', plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(plant({ crop: "tomato", sown: Number(sown), q: Q(100, 20) })), await now(), rx, ry]);
  await sql("update public.town_plots set soil = 'tilled', plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(plant({ crop: "tomato", by: "00000000-0000-4000-8000-00000000beef", sown: Number(sown), q: Q(100, 20) })), await now(), rx + 2, ry]);
  await enter(A, "A"); await sleep(800);
  // (the farm is read by whoever is on it)
  await go(A, rx, cy + 6, 800);
  await until("told", async () => (await sql("select plant->'sealed' s from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].s !== null, 20000);
  const told = (await sql("select plant->>'gold' g, plant->>'sealed' s from public.town_plots where x = $1 and y = $2", [rx, ry]))[0];
  ok("the grower's page has the draw told, gold", told.g === "0" && told.s === "0", told);
  ok("nobody else's plant is asked by it", (await sql("select plant->'sealed' s from public.town_plots where x = $1 and y = $2", [rx + 2, ry]))[0].s === null);
  await A.evaluate(`(window.__townZoomFree = true, ${V}.zoom(1.5))`); await go(A, rx, cy + 6, 2200); await A.shot(`${OUT}/db-gold.png`);

  // ── a rank-7 giant still growing, and one ripe, side by side: young and ripe drawings, no size on either ──
  const giantAt = (x, y, more) => { const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([u, v]) => u + "," + v); return plant({ giant: true, root: x + "," + y, footprint: cells, q: Q(60), ...more }); };
  await sql("update public.town_plots set plant = null, soil = 'tilled', changed = $1 where bed = $2", [await now(), bed]);
  await sql("update public.town_plots set plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(giantAt(cx + 1, cy + 1, { sown: (await now()) - 110 * H })), await now(), cx + 1, cy + 1]);
  await sql("update public.town_plots set plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(giantAt(cx + 4, cy + 4, {})), await now(), cx + 4, cy + 4]);
  await enter(A, "A"); await sleep(800); await A.evaluate(`(window.__townZoomFree = true, ${V}.zoom(1.5))`);
  await go(A, cx + 3, cy + 6, 2600); await A.shot(`${OUT}/db-rank7.png`);
  ok("a rank-7 giant, ripe, is called by one and may start alone", await (async () => { await go(A, cx + 5, cy + 6, 1800); await click(A, "[data-giant-pull-open]"); await sleep(1000); const yes = await A.evaluate(`document.querySelector("[data-giant-pull-go]")?.disabled === false`); await click(A, '[data-giant-pull] button:not([data-giant-pull-go])'); return yes; })());

  // ── an animal found grown ──
  const id = "00000000-0000-4000-8000-0000000000aa", bornAt = (await now()) - 400 * H;
  const cow = { id, owner: a, species: "chicken", breed: "barnHen", name: "x", born: bornAt, bought: true, home: "barn", sex: "f", stats: { thrift: 2, gentle: 2, vigor: 2 }, streak: 0, at: await now(), food: 20, grown: 47.999, made: 0, banked: 0, hearts: 0, today: { day: 0 }, speedUntil: 0, windUntil: 0, narrow: 15, rest: 0, lent: null, outside: [], outBands: 0, rearing: { was: 40, days: 2, pet: 2, treat: 2, out: 2, fed: 2 } };
  await sql("insert into public.town_herds (owner, h, changed) values ($1, $2, $3) on conflict (owner) do update set h = excluded.h", [a, JSON.stringify({ owner: a, barn: 3, room: 4, door: [], credit: 0, lastCare: await now(), facade: 0, care: "named", carers: [] }), await now()]);
  await sql("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, $4) on conflict (id) do update set a = excluded.a, changed = excluded.changed", [id, a, JSON.stringify(cow), await now()]);
  await post("/bench/skip", { ms: 300_000 });
  const pet = await A.evaluate(`${K}.animals({ action: "pet", id: ${JSON.stringify(id)} }, "req-grow-db-1")`);
  ok("petted", pet?.ok === true, pet?.why);
  const doc = (await sql("select a from public.town_animals where id = $1", [id]))[0].a;
  ok("the database gave it its size, once", typeof doc.body === "number" && doc.body >= 1 && doc.rearing === undefined, doc);
  await post("/bench/skip", { ms: 3_600_000 });
  const pet2 = await A.evaluate(`${K}.animals({ action: "treat", id: ${JSON.stringify(id)}, item: "grasshopper" }, "req-grow-db-2")`);
  const later = (await sql("select a from public.town_animals where id = $1", [id]))[0].a;
  ok("it keeps that size", later.body === doc.body, { was: doc.body, now: later.body, why: pet2?.why });
  for (const [who, X] of [["A", A], ["B", B], ["C", C]]) { const e = (await X.errors?.()) ?? []; ok(`no error on ${who}'s page`, e.length === 0, e); }
} finally { A.close(); B.close(); C.close(); }
console.log(`town-grow-db: ${pass} passed${fail ? `, ${fail} FAILED` : ""}.`);
process.exit(fail ? 1 : 0);
