// v325, what the specials are for, dry-run on a bench through v324: the file runs twice (CR at its line ends, and as written)
// and the second run changes no function and no row; the catalog's parts are the code's (the 'uses' row whole, and in the
// others only the entries v325 adds, everything else as it was); the new rules are the page's case by case (the carried
// buff, lucky match's odds, a pot's time on the table, eaten together, the first-rain egg, a pot's marks); a recipe's pot
// in the database is the page's (each of the ten, a special's carried buff, and without its special never the dish); then
// as members: the legend feast eaten together by three (each a level more) and not by two, nor by one who began twice; the
// cushions, the cloth and a cover; a paper written with a dish made and refused for one not made; Granny's wool, each
// kind once; the first-rain egg; gentle at a pet; a stranger, an unproved member, and who may call what.
//   cd <the tree> && FC_REPO=<the tree> V325_BENCH=<a bench through v324> node .claude/skills/fc-cash-town/scripts/db/v325.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
process.env.FC_REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const U = await import("@/lib/town/special-uses");
const { SPECIAL_DISH_IDS, SPECIAL_DISH_SCROLLS, LEGEND_DISHES } = await import("@/lib/town/special-dishes");
const { DISHES } = await import("@/lib/town/items");
const { cook, tableEnds } = await import("@/lib/town/cooking");
const { matchedOdds, heartsPlus, ANIMALS } = await import("@/lib/town/animals");
const { rainEgg } = await import("@/lib/town/ditch");
const { newPurse, put } = await import("@/lib/town/trade");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v325_what_the_specials_are_for.sql";
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V325_BENCH)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(replace(pg_get_functiondef(p.oid),chr(13),'')) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town','public') order by 1, 2")).map((r) => r.proname + r.d).join();
const as = async (who, q, a = []) => {
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who === "anon" ? "" : who]);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(who === "anon" ? { role: "anon" } : { sub: who, role: "authenticated" })]);
    await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`);
    return { row: (await db.query(q, a)).rows[0] };
  } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const J = (v) => JSON.parse(JSON.stringify(v));
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
let seed = 325_000;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rnd() * list.length)];
const HOUR = 3_600_000, MIN = 60_000;

try {
  const catBefore = Object.fromEntries((await rows("select key, data from public.town_catalog")).map((r) => [r.key, r.data]));
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const f1 = await fns(), cat1 = await rows("select key, data from public.town_catalog order by key");
  await db.exec(sql);
  eq(await fns(), f1, "a run again changes no function");
  eq(await rows("select key, data from public.town_catalog order by key"), cat1, "a run again changes no catalog row");

  // ── the catalog: the code's where v325 writes, as it was everywhere else ──
  const code = J(catalogOf()), after = Object.fromEntries(cat1.map((r) => [r.key, r.data]));
  eq(canon(after.uses), canon(code.uses), "the uses row is the code's");
  const touched = {
    items: [[], [...SPECIAL_DISH_IDS, ...Object.keys(SPECIAL_DISH_SCROLLS), "goldenDandelion"]], dishes: [[], SPECIAL_DISH_IDS], scrolls: [[], Object.keys(SPECIAL_DISH_SCROLLS)],
    crops: [[], ["goldenDandelion"]], "animals.family": [["family"], Object.keys(U.CARRY)], "animals.farmFamily": [["farmFamily"], ["goldenCreamTop", "warmShaggyMilk", "agedCheeseStarter"]],
    "cooking.needs": [["needs"], SPECIAL_DISH_IDS], "farming.seeds": [["seeds"], ["goldenDandelionSeed"]], "farming.tools": [["tools"], ["goldenDandelionSeed"]],
    "quality.partners": [["partners"], ["goldenDandelion"]], "stamina.buffs": [["buffs"], ["gentle", "aroma", "featherlight", "moonSight", "luckyMatch"]],
    "stamina.steps": [["steps"], ["gentle", "aroma", "featherlight", "moonSight", "luckyMatch"]], "work.farming": [["farming"], ["goldenDandelion"]],
    "work.kitchen.pot": [["kitchen", "pot"], SPECIAL_DISH_IDS],
  };
  for (const [name, [path, keys]] of Object.entries(touched)) {
    const row = name.split(".")[0], at = (o) => path.reduce((x, k) => x?.[k], o);
    for (const k of keys) eq(canon(at(after[row])?.[k]), canon(at(code[row])?.[k]), `${name}.${k} is the code's`);
    const before = at(catBefore[row]), now = at(after[row]);
    eq(canon(Object.fromEntries(Object.entries(now).filter(([k]) => !keys.includes(k)))), canon(before), `nothing else of ${name} changed`);
  }
  for (const k of ["bowled", "recipes"]) {
    eq(after.cooking[k].slice(0, catBefore.cooking[k].length), catBefore.cooking[k], `cooking.${k}: what was there is as it was`);
    eq([...after.cooking[k]].sort(), [...new Set([...catBefore.cooking[k], ...SPECIAL_DISH_IDS])].sort(), `cooking.${k}: and the ten`);
  }
  eq(after.pouches.find((p) => p.gift === "thingPouch").holds.includes("goldenDandelion"), true, "the farm's pouch holds the golden dandelion");
  for (const row of ["items", "dishes", "crops", "cooking", "farming", "quality", "stamina", "work", "animals"])
    for (const k of Object.keys(catBefore[row])) if (!Object.values(touched).some(([p, ks]) => (p.length ? p[0] === k : ks.includes(k)) ) && !(row === "cooking" && (k === "bowled" || k === "recipes")) && !(row === "work" && (k === "farmingAgain" || k === "farmingCells" || k === "kitchen")))
      if (JSON.stringify(canon(catBefore[row][k])) !== JSON.stringify(canon(after[row][k]))) eq(k, null, `${row}.${k} was not to change`);
  eq(catBefore.uses, undefined, "there was no uses row");
  const rowsChanged = Object.keys(after).filter((k) => JSON.stringify(canon(after[k])) !== JSON.stringify(canon(catBefore[k]))).sort();
  eq(rowsChanged, ["animals", "cooking", "crops", "dishes", "farming", "items", "pouches", "quality", "scrolls", "stamina", "uses", "work"], "the rows that changed, and no other");

  // ── the rules, case by case ──
  const THINGS = ["milk", "sugar", "egg", "silkieTwinEgg", "dawnBlueEgg", "cocoaShellEgg", "windRunnerEgg", "emeraldShellEgg", "brushPaintedEgg", "goldenCreamTop", "warmShaggyMilk", "agedCheeseStarter", "fireflyEgg", "rice", "flour"];
  const DISHLIST = ["custard", "pancakes", "friedRice", "omelette", "cheesecake", "fireflyCustard", "phoenixBake", "quiche"];
  for (let i = 0; i < 250; i++) {
    const things = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => [pick(THINGS), 1 + Math.floor(rnd() * 3)]), dish = pick(DISHLIST);
    eq((await one("select town.carry_of($1::jsonb, $2) c", [JSON.stringify(things), dish])).c, (() => { const c = U.carryOf(things, dish); return c ? { carry: c } : {}; })(), `carry_of ${JSON.stringify(things)} ${dish}`);
  }
  for (const base of [10, 30, 60]) for (const dawn of [0, 10]) for (const level of [0, 1, 2, 3, 4]) {
    const points = U.matchPoints(level);
    eq((await one("select town.matched_odds($1, $2, $3, 70) o", [base, dawn, points])).o, matchedOdds(base, dawn, points, 70), `matched_odds ${base} ${dawn} ${points}`);
    eq(matchedOdds(base, dawn, points, 70) <= Math.max(Math.min(70, base + dawn), 3 * base), true, `never past three times ${base}`);
  }
  const NOW = Number((await one("select town.now_ms() n")).n);
  for (let i = 0; i < 80; i++) {
    const from = NOW - Math.floor(rnd() * 30) * HOUR, cover = rnd() < 0.5;
    const dress = rnd() < 0.3 ? {} : { cloth: { at: from - Math.floor(rnd() * 20) * HOUR, until: from + Math.floor(rnd() * 40) * HOUR, by: "A" } };
    eq(Number((await one("select town.table_ends($1, $2, $3::jsonb) e", [from, cover, JSON.stringify(dress)])).e), tableEnds({ cover }, from, dress), `table_ends ${i}`);
  }
  for (let i = 0; i < 120; i++) {
    const pot = `p${i}`, from = NOW, people = ["A", "B", "C", "D"].map((x) => `00000000-0000-0000-0000-00000000000${"1234"["ABCD".indexOf(x)]}`);
    const began = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({ by: pick(people), at: from + Math.floor((rnd() * 14 - 7) * MIN) }));
    const me = people[0], mine = [...began, { by: me, at: from }];
    await db.query("delete from public.town_feast_began where pot = $1", [pot]);
    for (const b of mine) await db.query("insert into public.town_feast_began (pot, member_id, at) values ($1, $2, $3)", [pot, b.by, b.at]);
    eq((await one("select town.eaten_together($1, $2) t", [pot, from])).t, U.togetherAt(began, me, from), `eaten_together ${JSON.stringify(began.map((b) => [b.by.slice(-1), (b.at - from) / MIN]))}`);
  }
  await db.query("delete from public.town_feast_began");
  {
    const mk = (key, by, watered) => [key, { soil: "tilled", plant: { crop: "kangkong", sown: NOW - 2 * HOUR, watered, boost: 0, by } }];
    const plots = Object.fromEntries([mk("10,10", "a", 0), mk("11,11", "b", 0), mk("9,11", "b", NOW - 10 * MIN), mk("13,10", "b", 0)]);
    const purse = { ...newPurse(), bag: put(Array(10).fill(null), "firstRainEgg", 2), hand: "firstRainEgg" };
    const page = rainEgg(purse, plots, [10, 10], NOW), base = (await one("select town.rain_egg($1::jsonb, $2::jsonb, 10, 10, $3) r", [JSON.stringify(purse), JSON.stringify(plots), NOW])).r;
    eq([base.ok, base.watered, base.plots], [page.ok, page.watered, J(page.plots)], "rain_egg is the page's");
    eq(base.purse.bag, J(page.purse.bag), "and takes one egg");
    eq((await one("select town.rain_egg($1::jsonb, $2::jsonb, 10, 10, $3) r", [JSON.stringify({ ...purse, hand: null }), JSON.stringify(plots), NOW])).r, { ok: false, why: "hand" }, "nothing in the hand: refused");
  }
  eq((await one(`select town.pot_marks('{"carry":"gentle","cover":true,"grade":2,"x":1}'::jsonb) m`)).m, { carry: "gentle", cover: true, grade: 2 }, "a pot's marks keep its carried buff and its cover");
  eq((await one(`select town.pot_marks('{"carry":"nonsense"}'::jsonb) m`)).m, {}, "and nothing that is no buff");

  // ── a recipe's pot, as the database cooks it ──
  const bagOf = (things) => things.reduce((b, [x, n]) => put(b, x, n), Array(20).fill(null));
  for (const id of SPECIAL_DISH_IDS) {
    const r = DISHES[id].recipe, crew = [...r.in, ...Array(Math.max(0, r.cooks - r.in.length)).fill(null)];
    const purse = { ...newPurse(), stamina: { day: 0, left: 100 }, bag: bagOf([...r.needs, ...r.in.map((t) => [t, 1])]) };
    const base = (await one("select town.cook($1::jsonb, $2::jsonb, $3::jsonb, 0, $4) d", [JSON.stringify(purse), JSON.stringify(r.needs), JSON.stringify(crew), NOW])).d;
    const page = cook(purse, r.needs, crew, 0, NOW);
    eq([base.ok, base.made, base.n], [page.ok, page.made, page.n], `${id}: the database cooks it as the page does`);
    const less = r.needs.slice(0, -1), odd = (await one("select town.cook($1::jsonb, $2::jsonb, $3::jsonb, 0, $4) d", [JSON.stringify({ ...purse, bag: bagOf([...less, ...r.in.map((t) => [t, 1])]) }), JSON.stringify(less), JSON.stringify(crew), NOW])).d;
    eq(odd.ok && odd.made === id, false, `${id}: without its special, never the dish`);
  }
  {
    const needs = [["silkieTwinEgg", 2], ["milk", 1], ["sugar", 1]], purse = { ...newPurse(), stamina: { day: 0, left: 100 }, bag: bagOf([...needs, ["pot", 1]]) };
    const base = (await one("select town.cook($1::jsonb, $2::jsonb, '[\"pot\"]'::jsonb, 0, $3) d", [JSON.stringify(purse), JSON.stringify(needs), NOW])).d;
    const pot = base.purse.bag.find((s) => s?.item === "potFull");
    eq([base.made, pot?.of?.dish, pot?.carry], ["custard", "custard", "gentle"], "a silkie's twin egg makes custard, and the pot carries gentle");
  }

  // ── as members ──
  const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002", C = "00000000-0000-0000-0000-000000000003", UNVER = "00000000-0000-0000-0000-000000000004";
  const purse = async (who, bag, extra = {}) => {
    await db.query("insert into public.town_purses (member_id, coins, doc) values ($1, 0, '{}'::jsonb) on conflict (member_id) do nothing", [who]);
    const p = (await one("select town.purse_of($1, false) p", [who])).p;
    await db.query("select town.keep_purse($1, $2::jsonb)", [who, JSON.stringify({ ...p, eating: null, left: p.left ?? [], bag: [...bag, ...Array(Math.max(0, 12 - bag.length)).fill(null)], ...extra })]);
  };
  const kept = async (who) => (await one("select town.purse_kept($1, false) p", [who])).p;
  const held = (bag, item) => (bag ?? []).filter((s) => s && s.item === item).reduce((n, s) => n + s.n, 0);
  const tile = (await one("select town.cat('cooking')->'feast'->'tile' t")).t;
  const yard = await one(`select x, y from generate_series(0, 120) x, generate_series(0, 120) y where town.on_yard(x, y) limit 1`);
  const potRow = async (dish, left, marks = {}) => Number((await one(`insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at, feast, marks)
    values ($1, $2, $3, $4, $5, false, $6, true, $7::jsonb) returning id`, [C, dish, left, tile[0], tile[1], NOW, JSON.stringify(marks)])).id);
  for (const who of [A, B, C]) await purse(who, []);

  // the legend feast: three begin a helping within five minutes, each a level more at its end
  const L = await potRow("phoenixBake", 20);
  for (const who of [A, B, C]) {
    const r = (await as(who, "select public.town_feast_eat($1, $2, $3, true) r", [L, yard.x, yard.y])).row?.r;
    eq([r?.ok, r?.purse?.eating?.pot], [true, String(L)], `${who.slice(-1)} eats a helping of the legend's pot at the table`);
  }
  eq(Number((await one("select count(*) n from public.town_feast_began where pot = $1", [String(L)])).n), 3, "three beginnings written down");
  const endOf = async (who) => (await one("select town.chew(town.purse_kept($1, false), 0, $2) d", [who, NOW + 6 * MIN])).d.purse;
  const levelIn = (p, id) => (p.buffs ?? []).find((b) => b.id === id)?.level ?? 0;
  for (const who of [A, B, C]) eq(levelIn(await endOf(who), "hearty"), 2, `${who.slice(-1)}: eaten together, the buff a level more`);
  // two are not three; one who began twice is one
  const L2 = await potRow("pearlBroth", 20);
  for (const who of [A, B]) { await purse(who, []); await as(who, "select public.town_feast_eat($1, $2, $3, true) r", [L2, yard.x, yard.y]); }
  eq(levelIn(await endOf(A), "lucky"), 1, "two eating together: no level more");
  await db.query("insert into public.town_feast_began (pot, member_id, at) values ($1, $2, $3)", [String(L2), B, NOW + MIN]);
  eq(levelIn(await endOf(A), "lucky"), 1, "one who began twice counts once");
  // a plain dish's pot at the table: no pot told, nothing written down
  await purse(A, []);
  const P = await potRow("custard", 3, { carry: "gentle" });
  const rp = (await as(A, "select public.town_feast_eat($1, $2, $3, true) r", [P, yard.x, yard.y])).row?.r;
  eq([rp?.ok, rp?.purse?.eating?.pot, rp?.purse?.eating?.carry], [true, undefined, "gentle"], "a plain pot's helping has no pot told, and its carried buff");
  eq(Number((await one("select count(*) n from public.town_feast_began where pot = $1", [String(P)])).n), 0, "and nothing written down of it");
  const endA = await endOf(A);
  eq([levelIn(endA, "calm"), levelIn(endA, "gentle")], [1, 1], "eaten up: the dish's buff and the carried one, each a meal's");

  // the wool at the table
  await purse(A, [{ item: "wholeGoldenFleece", n: 1 }, { item: "cloudFluffTuft", n: 1 }, { item: "shootingStarLock", n: 2 }]);
  eq((await as(A, "select public.town_feast_dress('cloth', 0, 0) r")).row?.r?.why, "none", "off the yard's floor: refused");
  const d1x = await as(A, "select public.town_feast_dress('cloth', $1, $2) r", [yard.x, yard.y]); if (d1x.error) console.log("  (dress)", d1x.error);
  const d1 = d1x.row?.r;
  eq([d1?.ok, d1?.dress?.cloth?.until - d1?.dress?.cloth?.at], [true, 24 * HOUR], "the golden cloth laid for a day");
  eq(held((await kept(A)).bag, "wholeGoldenFleece"), 0, "the fleece used up");
  const told = await rows("select a.kind, a.member_id::text m, a.subject from public.town_announcements a where a.kind = 'cloth'");
  eq([told.length, told[0]?.m, told[0]?.subject?.length > 0], [1, A, true], "the golden cloth told to the whole town, once, as its layer's");
  const page = (await as(B, "select public.town_announcements_v309(null, null) r")).row?.r;
  eq((page?.events ?? []).filter((e) => e.kind === "cloth").length, 1, "and read by another member's page among the town's news");
  eq((await as(A, "select public.town_feast_dress('cloth', $1, $2) r", [yard.x, yard.y])).row?.r?.why, "none", "no more fleece: refused");
  eq((await as(A, "select public.town_feast_dress('cushions', $1, $2) r", [yard.x, yard.y])).row?.r?.ok, true, "the cushions laid");
  eq(Number((await one("select count(*) n from public.town_announcements where kind = 'cloth'")).n), 1, "the cushions told to nobody, the refused cloth neither");
  eq((await as(A, "select public.town_uses_read() r")).row?.r?.uses?.dress?.cushions?.until > NOW, true, "and told to whoever asks");
  const Q = await potRow("custard", 3);
  eq((await as(A, "select public.town_pot_cover($1, $2, $3) r", [Q, yard.x, yard.y])).row?.r?.pot?.cover, true, "a pot covered");
  eq((await as(A, "select public.town_pot_cover($1, $2, $3) r", [Q, yard.x, yard.y])).row?.r?.why, "taken", "and not twice");
  eq(held((await kept(A)).bag, "shootingStarLock"), 1, "one lock used");
  const until = Number((await one("select (town.pot_now(true, 'custard', $1::bigint, $1::bigint, true, town.dress_now())->>'until')::bigint u", [NOW])).u);
  eq(until, tableEnds({ cover: true }, NOW, (await one("select town.dress_now() d")).d), "a covered pot under the cloth: two meals' hours more, as the page has it");
  await purse(B, []);
  const rc = (await as(B, "select public.town_feast_eat($1, $2, $3, true) r", [Q, yard.x, yard.y])).row?.r;
  eq(rc?.purse?.eating?.cushion, true, "a helping at the table with the cushions laid: a companion more");
  eq(rc?.purse?.eating?.cover, undefined, "the cover stays with the pot");

  // the blank recipe paper
  await purse(A, [{ item: "blankRecipePaper", n: 1 }], { made: ["fireflyCustard"] });
  eq((await as(A, "select public.town_write_scroll('pearlBroth') r")).row?.r?.why, "known", "a paper for a dish not made: refused");
  const w = (await as(A, "select public.town_write_scroll('fireflyCustard') r")).row?.r;
  eq([w?.ok, w?.scroll], [true, "scrollFireflyCustard"], "written with a dish made");
  eq([held((await kept(A)).bag, "blankRecipePaper"), held((await kept(A)).bag, "scrollFireflyCustard")], [0, 1], "the paper is the scroll now");
  eq((await as(A, "select public.town_write_scroll('fireflyCustard') r")).row?.r?.why, "none", "no paper left: refused");

  // Granny's wool
  await purse(A, [{ item: "rareShadeLock", n: 2 }, { item: "spiralShedHorn", n: 1, grade: 2 }, { item: "rainbowArcLock", n: 1 }], { coins: 5000 });
  const piece = (await one("select k from jsonb_object_keys(town.cat('tailor')) k where town.tailor_price(k, now()) is not null order by k limit 1")).k;
  const price = Number((await one("select town.tailor_price($1, now()) p", [piece])).p);
  eq((await as(A, "select public.town_tailor_buy($1, gen_random_uuid(), '[0,0]'::jsonb) r", [piece])).row?.r?.why, "none", "the same kind twice: refused");
  const t = (await as(A, "select public.town_tailor_buy($1, gen_random_uuid(), '[0,1,2]'::jsonb) r", [piece])).row?.r;
  const off = 12 + Math.round(12 * 1.75) + 18;
  eq([t?.ok, t?.price], [true, price - Math.min(price, off)], "the three wools take what they would fetch off the piece");
  const pa = await kept(A);
  eq([held(pa.bag, "rareShadeLock"), held(pa.bag, "spiralShedHorn"), held(pa.bag, "rainbowArcLock"), pa.coins], [1, 0, 0, 5000 - (price - Math.min(price, off))], "one of each used, the coins the rest");
  eq((await as(A, "select public.town_tailor_buy($1, gen_random_uuid()) r", ["zzz"])).row?.r?.why, "none", "the two-word call is as it was");

  // the first-rain egg on the farm
  {
    const plot = await one("select p.x, p.y from public.town_plots p where p.plant is not null and town.deed_for(p.x || ',' || p.y, jsonb_build_object('soil', p.soil, 'plant', p.plant), 'can', '', $1, null) = 'water' limit 1", [NOW]);
    const bed = plot ? null : await one("select x, y from generate_series(100, 300) x, generate_series(0, 120) y where town.bed_of(x, y) >= 0 limit 1");
    const at = plot ?? bed;
    if (!plot) await db.query("insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0) on conflict (x, y) do update set plant = excluded.plant, soil = 'tilled'",
      [at.x, at.y, JSON.stringify({ crop: "kangkong", sown: NOW - 2 * HOUR, watered: 0, boost: 0, by: B })]);
    await purse(A, [{ item: "firstRainEgg", n: 1 }], { hand: "firstRainEgg" });
    const r = (await as(A, "select public.town_rain_egg($1, $2) r", [at.x, at.y])).row?.r;
    eq([r?.ok, (r?.watered ?? []).includes(`${at.x},${at.y}`)], [true, true], "the first-rain egg waters the plot thrown onto");
    eq(held((await kept(A)).bag, "firstRainEgg"), 0, "and is gone");
    eq((await as(A, "select public.town_rain_egg($1, $2) r", [at.x, at.y])).row?.r?.why, "hand", "none left: refused");
  }

  // gentle at a pet: hearts more, as the page has it
  {
    const id = "66666666-6666-6666-6666-666666666666", today = Number((await one("select town.day_of($1::bigint) d", [NOW])).d);
    const a = { id, owner: A, species: "chicken", breed: "silkie", name: "", born: NOW - 10 * 24 * HOUR, bought: false, home: "barn", sex: "f", stats: { thrift: 1, gentle: 3, vigor: 1 }, streak: 0,
      at: NOW, food: 20, grown: 500, made: 0, banked: 0, hearts: 100, today: { day: today }, speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, body: 2 };
    await db.query("insert into public.town_herds (owner, h, changed) values ($1, $2, 0) on conflict (owner) do update set h = excluded.h", [A, JSON.stringify({ owner: A, barn: 0, room: 4, door: [], credit: 0, lastCare: NOW, facade: 0, care: "named", carers: [] })]);
    await db.query("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, 0) on conflict (id) do update set a = excluded.a", [id, A, JSON.stringify(a)]);
    await purse(A, [], { buffs: [{ id: "gentle", level: 4, until: NOW + HOUR }] });
    const r = (await as(A, "select public.town_animals($1::jsonb, null) r", [JSON.stringify({ action: "pet", id })])).row?.r;
    const got = (await one("select a from public.town_animals where id = $1", [id])).a.hearts;
    eq([r?.ok, got], [true, heartsPlus(a, U.gentleHearts(ANIMALS.heart.pet, 4))], "a pet under gentle 4: the page's hearts");
    eq(U.gentleHearts(ANIMALS.heart.pet, 4) / ANIMALS.heart.pet <= 3, true, "never past three times");
  }

  // ── the walls ──
  eq(!!(await as("anon", "select public.town_write_scroll('fireflyCustard') r")).error, true, "a stranger may not write a scroll");
  eq(!!(await as("anon", "select public.town_uses_read() r")).error, true, "nor read the table");
  eq(!!(await as(UNVER, "select public.town_feast_dress('cloth', 0, 0) r")).error, true, "nor an unproved member lay the cloth");
  eq((await one(`select has_function_privilege('authenticated', 'public.town_write_scroll(text)', 'execute') as member, has_function_privilege('anon', 'public.town_write_scroll(text)', 'execute') as anon,
    has_function_privilege('anon', 'public.town_tailor_buy(text, uuid, jsonb)', 'execute') as tailor,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`)),
    { member: true, anon: false, tailor: false, open: 0 }, "who may call what");
  eq(!!(await as(A, "select town.carry_of('[]'::jsonb, 'custard') c")).error, true, "a member may not call a rule");
  eq(!!(await as(A, "select * from public.town_feast_began")).error, true, "nor read who began what");
  // "what it should say afterwards"
  eq(await one(`select (select count(*)::int from jsonb_object_keys(data->'carry')) as carry, jsonb_array_length(data->'legend') as legend from public.town_catalog where key = 'uses'`), { carry: 9, legend: LEGEND_DISHES.length }, "afterwards: the uses row");
  eq(await one(`select town.matched_odds(10, 10, 20, 70) as legend, town.matched_odds(60, 0, 20, 70) as capped, town.carry_of('[["milk",1],["silkieTwinEgg",2],["sugar",1]]'::jsonb, 'custard') as carry`),
    { legend: 30, capped: 70, carry: { carry: "gentle" } }, "afterwards: the rules");
  eq(await one(`select pg_get_constraintdef(c.oid) like '%''cloth''%' as cloth_told from pg_constraint c
    where c.conrelid = 'public.town_announcements'::regclass and c.conname = 'town_announcements_kind_check'`), { cloth_told: true }, "afterwards: the cloth is one of the town's news");
  const forge = await db.query("select town.announce($1, 'forge', 'axe', 3, 'v325-check-forge', false)", [A]).then(() => null, (e) => e.message);
  eq(forge, null, "and the kinds before it still are (a forging told)");
} catch (e) { failed++; console.log("  THREW", e.message, e.query?.slice?.(0, 300)); }
console.log(`v325: ${checks} passed, ${failed} failed`);
await db.close();
process.exit(failed ? 1 : 0);
