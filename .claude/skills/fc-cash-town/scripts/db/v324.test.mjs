// v324, special produce of the bred breeds and care that raises Quality, dry-run on a bench through v323: the file runs
// twice (CR at its line ends, and as written) and the second run changes no function and no row; the catalog's parts are
// the code's (the `animals` row's specials and graded, the 28 things merged into `items`, nothing else of either row);
// every new rule is the page's case by case (lib/town/roam, lib/town/animals' careScore and rangeOf and unitsOf,
// lib/town/specials); then as members through public.town_animals: a collection that brings specials (the chance forced
// to 1 on the bench), of their units' grades, with its strip, the book and the first finder; the same call again; a
// second collection with nothing ready; a second finder; a stranger, an unproved member and another member's animal; a
// friend's food and a full heart in the round; rain in the round; the cap; the replaced unit's price; a starter. And
// Codex's three: a heart that came full in a day closed by settling (town.animal_settle against the page's settle), a
// young companion, and a bag with room for the special alone (refused as the produce would be, so no retry finds one).
//   cd <the tree> && FC_REPO=<the tree> V324_BENCH=<a bench through v323, scratch bench323.mjs> node .claude/skills/fc-cash-town/scripts/db/v324.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
process.env.FC_REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
await import("./repo-ts-town.mjs");
const { hashStr, mix, patchKind } = await import("@/lib/town/roam");
const { careScore, rangeOf, unitsOf, bodyOf, settle, dayOf, dayStart, SPECIES_IDS, BREEDS, ANIMALS } = await import("@/lib/town/animals");
const SP = await import("@/lib/town/specials");
const { catalogOf } = await import("@/lib/town/catalog");
const { ANIMAL_GRADED } = await import("@/lib/town/animal-items");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v324_special_produce_and_care.sql";
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V324_BENCH)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); } };
const near = (a, b, what) => eq(Math.abs(a - b) < 1e-12, true, `${what} (${a} vs ${b})`);
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
// (a seeded run of numbers, so that a failure comes again)
let seed = 324_000;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rnd() * list.length)], pick0 = pick;
const HOUR = 3_600_000;

try {
  const itemsBefore = (await one("select data from public.town_catalog where key = 'items'")).data;
  const animalsBefore = (await one("select data from public.town_catalog where key = 'animals'")).data;
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const f1 = await fns(), cat1 = (await rows("select key, data from public.town_catalog where key in ('items', 'animals') order by key")).map((r) => r.data);
  await db.exec(sql);
  eq(await fns(), f1, "a run again changes no function");
  eq((await rows("select key, data from public.town_catalog where key in ('items', 'animals') order by key")).map((r) => r.data), cat1, "a run again changes neither row");

  // ── the catalog: the code's, and nothing else of the two rows ──
  const code = catalogOf(), K = (await one("select town.cat('animals') k")).k;
  eq(K.specials, J(code.animals.specials), "animals.specials is the code's");
  eq(K.graded, J(ANIMAL_GRADED), "animals.graded is the code's");
  const { specials: _s, graded: _g, ...restAfter } = K, { graded: _g0, ...restBefore } = animalsBefore;
  eq(restAfter, restBefore, "nothing else of the animals row changed");
  const items = (await one("select data from public.town_catalog where key = 'items'")).data;
  for (const x of SP.SPECIALS) eq(items[x.id], J(code.items[x.id]), `the thing ${x.id} is the code's`);
  eq(Object.keys(items).length, Object.keys(itemsBefore).length + 28, "28 things more");
  eq(Object.fromEntries(Object.entries(items).filter(([k]) => k in itemsBefore)), itemsBefore, "every thing there was is as it was");
  eq(SP.SPECIALS.length, 28, "28 specials");
  eq(new Set(SP.SPECIALS.map((x) => x.breed)).size, 28, "one a breed");
  eq(BREEDS.filter((b) => b.letter === "A").some((b) => SP.specialOf(b.id)), false, "no starter has one");
  for (const x of SP.SPECIALS) if (x.habit.kind === "food") eq(!!ANIMALS && !!catalogOf().animals.species[x.species].feeds[x.habit.item], true, `${x.breed}'s food habit is a feed of its own kind`);

  // ── the rules, case by case ──
  for (let i = 0; i < 120; i++) {
    const s = Array.from({ length: 8 + Math.floor(rnd() * 30) }, () => pick("0123456789abcdef-".split(""))).join("");
    eq(Number((await one("select town.roam_hash($1) h", [s])).h), hashStr(s), `roam_hash ${s}`);
  }
  for (let i = 0; i < 150; i++) {
    const n = [Math.floor(rnd() * 4294967295), Math.floor(rnd() * 5_000_000), pick([21, 22, 23, 1, 2])];
    eq((await one("select town.roam_mix($1, $2, $3) m", n)).m, mix(...n), `roam_mix ${n}`);
  }
  for (let i = 0; i < 300; i++) {
    const s = Math.floor(rnd() * 4294967295), k = Math.floor(rnd() * 5_000_000), sp = pick(SPECIES_IDS);
    eq((await one("select town.roam_kind($1, $2, $3) k", [s, sp, k])).k, patchKind(s, sp, k), `roam_kind ${sp} ${s} ${k}`);
  }
  const anAnimal = () => {
    const species = pick(SPECIES_IDS), breed = pick(BREEDS.filter((b) => b.species === species));
    const body = rnd() < 0.2 ? undefined : bodyOf(species, Math.floor(rnd() * 101));
    return { id: `x${Math.floor(rnd() * 1e9)}`, owner: "o", species, breed: breed.id, hearts: Math.floor(rnd() * 201), narrow: pick([0, 5, 10, 15, 20]),
      streak: Math.floor(rnd() * 15), ...(body === undefined ? {} : { body }), gold: rnd() < 0.2, born: 0, today: { day: 1, pet: rnd() < 0.5, treat: rnd() < 0.5 } };
  };
  for (let i = 0; i < 300; i++) {
    const a = anAnimal();
    eq((await one("select town.animal_care_score($1, town.cat('animals')) c", [JSON.stringify(a)])).c, careScore(a), `care score ${JSON.stringify(a)}`);
    eq((await one("select town.animal_range($1, town.cat('animals')) r", [JSON.stringify(a)])).r, rangeOf(a), `range ${JSON.stringify(a)}`);
    for (const met of [false, true]) near((await one("select town.special_chance($1, town.cat('animals'), $2) c", [JSON.stringify(a), met])).c, SP.chanceOf(a, met), `chance ${a.breed} met ${met}`);
    eq((await one("select town.special_full_heart($1, town.cat('animals')) f", [JSON.stringify(a)])).f, SP.fullHeart(a), `full heart ${a.hearts}`);
    for (const friend of [false, true]) {
      const r0 = rnd() < 0.5 ? { since: 5, ate: ["corn"] } : undefined, b = { ...a, ...(r0 ? { round: r0 } : {}) };
      const mine = { ...b, round: SP.caredNote(b, friend) };
      eq((await one("select town.special_cared($1, town.cat('animals'), $2) a", [JSON.stringify(b), friend])).a, J(mine), `cared ${friend}`);
    }
  }
  for (const [g, banked, play, cracked] of [["eggs", 1, null, 3], ["eggs", 4, null, 1], ["eggs", 3, null, 3], ["eggs", 0, null, 0], ["shear", 1, { hits: 9, misses: 1, secs: 9 }, 0], ["milk", 2, { hits: 3, misses: 3, secs: 9 }, 0]])
    eq((await one("select town.animal_units($1, $2, $3, $4) u", [g, banked, play ? JSON.stringify(play) : null, cracked])).u, unitsOf(g, banked, play, cracked), `units ${g} ${banked} cracked ${cracked}`);
  eq(unitsOf("eggs", 2, null, 2).units, 1, "the coop never gives none");
  for (let i = 0; i < 40; i++) {
    const r = rnd() < 0.3 ? undefined : { ate: Array.from({ length: Math.floor(rnd() * 9) }, () => pick(["corn", "meadowOats", "chickFeed", "dawnOats", "reedSeed", "x1", "x2", "x3", "x4"])) };
    const item = pick(["corn", "meadowOats", "packedRation", "x5"]);
    eq((await one("select town.special_ate($1, $2) r", [r ? JSON.stringify(r) : null, item])).r, J(SP.ateNote(r, item)), `ate ${item}`);
  }
  // a day that closes with its heart full is its round's, settled across the day's end as the page settles it
  {
    const k = (await one("select town.cat('animals') k")).k, end = dayStart(dayOf(Date.UTC(2026, 10, 9, 3, 0, 0)) + 1);
    const pick = (a) => J({ hearts: a.hearts, today: a.today, streak: a.streak, round: a.round ?? null, outBands: a.outBands, banked: a.banked, food: Math.round(a.food * 1e6) });
    for (let i = 0; i < 160; i++) {
      const species = pick0(SPECIES_IDS), breed = pick0(BREEDS.filter((b) => b.species === species)), at = end - Math.floor(rnd() * 30) * HOUR - Math.floor(rnd() * 60) * 60_000;
      const a = { id: `s${i}`, owner: "o", species, breed: breed.id, name: "", born: at - 20 * 24 * HOUR, bought: false, home: "barn", sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 },
        streak: Math.floor(rnd() * 9), at, food: rnd() < 0.2 ? 0.5 : Math.floor(rnd() * 25), grown: 500, made: 0, banked: 0, hearts: 160 + Math.floor(rnd() * 41), body: 2,
        today: { day: dayOf(at), pet: rnd() < 0.7, treat: rnd() < 0.7 }, speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0,
        ...(rnd() < 0.5 ? { round: rnd() < 0.5 ? { since: at - HOUR } : { since: at - HOUR, ate: ["corn"], friend: true } } : {}) };
      const door = rnd() < 0.3 ? [] : [[at + Math.floor(rnd() * 3 * HOUR), rnd() < 0.5 ? null : at + Math.floor((3 + rnd() * 20) * HOUR)]];
      const now = at + Math.floor((1 + rnd() * 40) * HOUR);
      const db_ = (await one("select town.animal_settle($1::jsonb, $2::double precision, $3::jsonb, false, $4::jsonb) r", [JSON.stringify(a), now, JSON.stringify(door), JSON.stringify(k)])).r;
      eq(pick(db_), pick(settle(a, now, { door, bottle: false })), `settled ${species} ${a.hearts} pet ${a.today.pet} treat ${a.today.treat} ${(now - at) / HOUR} h`);
    }
    // Codex's case: 04:00, 198 points, a pet and a treat; out at 04:10 it comes to 200; the day closes at 05:00
    const a = { id: "s-codex", owner: "o", species: "chicken", breed: "silkie", name: "", born: end - 20 * 24 * HOUR, bought: false, home: "barn", sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 },
      streak: 3, at: end - HOUR, food: 20, grown: 500, made: 0, banked: 0, hearts: 198, body: 2, today: { day: dayOf(end - HOUR), pet: true, treat: true }, speedUntil: 0, windUntil: 0,
      narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, round: { since: end - 5 * HOUR } };
    const r = (await one("select town.animal_settle($1::jsonb, $2::double precision, $3::jsonb, false, $4::jsonb) r", [JSON.stringify(a), end + HOUR, JSON.stringify([[end - 50 * 60_000, null]]), JSON.stringify(k)])).r;
    eq([r.hearts, r.today?.pet ?? false, r.round], [200, false, { since: end - 5 * HOUR, heart: true }], "a heart full before the day closed is kept for its round");
  }
  const T0 = Date.UTC(2026, 10, 9, 3, 0, 0);
  for (let i = 0; i < 150; i++) {
    const a = anAnimal(), door = [];
    let t = T0 - 80 * HOUR;
    while (door.length < 6 && t < T0) { const a0 = t + rnd() * 10 * HOUR, b0 = a0 + rnd() * 6 * HOUR; door.push([Math.floor(a0), rnd() < 0.15 && door.length === 5 ? null : Math.floor(b0)]); t = b0 + 1; }
    const from = T0 - Math.floor(rnd() * 72) * HOUR, bands = rnd() < 0.15 ? 0 : 1 + Math.floor(rnd() * 255);
    eq((await one("select town.special_places($1, $2, $3, $4, $5) p", [JSON.stringify(a), JSON.stringify(door), from, T0, bands])).p, SP.placesOf(a, door, from, T0, bands), `places ${a.species} ${JSON.stringify(door).slice(0, 80)}`);
  }
  for (let i = 0; i < 200; i++) {
    const s = { bands: Math.floor(rnd() * 256), places: SP.PLACES.filter(() => rnd() < 0.4), ate: ["meadowOats", "sweetTimothy", "mistVetch", "ghostReed", "corn"].filter(() => rnd() < 0.3), rain: rnd() < 0.5, wind: rnd() < 0.5, company: rnd() < 0.5, heart: rnd() < 0.5 };
    const h = pick(SP.SPECIALS).habit;
    eq((await one("select town.special_met($1, $2) m", [JSON.stringify(h), JSON.stringify(s)])).m, SP.habitMet(h, s), `met ${JSON.stringify(h)}`);
  }
  // the cap, at its most
  eq((await one(`select town.special_chance('{"breed": "goldenFleece", "species": "sheep", "body": 2.9, "streak": 9, "gold": true}'::jsonb, town.cat('animals'), true) c`)).c, 0.5, "never past half a round");
  near(SP.chanceOf({ breed: "silkie", species: "chicken", streak: 5, body: 3, gold: false }, false), 0.05, "a hen of a real breed at full care, 5 %");
  near(SP.chanceOf({ breed: "goldenFleece", species: "sheep", streak: 0, gold: false }, false), 0.2, "a legend sheep with no care, 40 % of half");
  eq(SP.chanceOf({ breed: "barnHen", species: "chicken", streak: 5, body: 3 }, true), 0, "a starter has none");
  // the replaced unit's price
  for (const x of SP.SPECIALS) {
    const produce = BREEDS.find((b) => b.id === x.breed).produce;
    // (what the relatives pay for a thing of a grade: its `pays` times its grade's step, town.grade_pays)
    const worth = "(select array_agg((town.cat('items')->$1->>'pays')::numeric * town.grade_pays($1, g) order by g) from generate_series(0, 3) g)";
    const r = await one(`select ${worth} s, ${worth.replaceAll("$1", "$2")} p, town.carries_grade($1) c`, [x.id, produce]);
    eq([r.s, r.c], [r.p, true], `${x.id} fetches what its ${produce} would, grade by grade (${r.p})`);
  }

  // ── as members ──
  const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002", C = "00000000-0000-0000-0000-000000000003", UNVER = "00000000-0000-0000-0000-000000000004";
  const now = Number((await one("select town.now_ms() n")).n), today = Number((await one("select town.day_of($1::bigint) d", [now])).d);
  const purse = async (who, bag, extra = {}) => {
    await db.query("insert into public.town_purses (member_id, coins, doc) values ($1, 0, '{}'::jsonb) on conflict (member_id) do nothing", [who]);
    const p = (await one("select town.purse_of($1, false) p", [who])).p;
    await db.query("select town.keep_purse($1, $2::jsonb)", [who, JSON.stringify({ ...p, left: p.left ?? [], bag: [...bag, ...Array(Math.max(0, (p.bag?.length ?? 10) - bag.length)).fill(null)], ...extra })]);
  };
  const herd = (who, barn, door, care = "named", carers = []) => db.query("insert into public.town_herds (owner, h, changed) values ($1, $2, 0) on conflict (owner) do update set h = excluded.h",
    [who, JSON.stringify({ owner: who, barn, room: 4, door, credit: 0, lastCare: now, facade: 0, care, carers })]);
  const animal = (id, owner, breed, species, extra) => db.query("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, 0) on conflict (id) do update set a = excluded.a",
    [id, owner, JSON.stringify({ id, owner, species, breed, name: "", born: now - 10 * 24 * HOUR, bought: false, home: "barn", sex: "f", stats: { thrift: 2, gentle: 2, vigor: 2 }, streak: 6,
      at: now, food: 20, grown: 500, made: 0, banked: 2, hearts: 200, today: { day: today, pet: true, treat: true }, speedUntil: 0, windUntil: 0,
      narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, body: 3, ...extra })]);
  const call = async (who, input, request = null) => { const x = await as(who, "select public.town_animals($1::jsonb, $2) r", [JSON.stringify(input), request]); return x.row?.r ?? { error: x.error }; };
  const bagOf = async (who) => (await one("select town.purse_of($1, false) p", [who])).p;
  const held = (bag, item) => (bag ?? []).filter((s) => s && s.item === item).reduce((n, s) => n + s.n, 0);
  const gradesOf = (bag, item) => (bag ?? []).filter((s) => s && s.item === item).map((s) => [s.g ?? s.grade ?? 0, s.n]);
  const SILKIE = "11111111-1111-1111-1111-111111111111", HEN_B = "22222222-2222-2222-2222-222222222222", BARNHEN = "33333333-3333-3333-3333-333333333333", CAYUGA = "44444444-4444-4444-4444-444444444444", HEN_ONE = "55555555-5555-5555-5555-555555555555";
  await herd(A, 0, [[now - 3 * HOUR, now - 2 * HOUR]]);
  await herd(B, 1, []);
  await purse(A, [{ item: "eggBasket", n: 1 }, { item: "corn", n: 5 }]);
  await purse(B, [{ item: "eggBasket", n: 1 }, { item: "corn", n: 5 }]);
  await animal(SILKIE, A, "silkie", "chicken", {});
  await animal(HEN_B, B, "silkie", "chicken", { body: 1, streak: 0, hearts: 100, today: { day: 0 } });
  await animal(BARNHEN, A, "barnHen", "chicken", {});

  // the chance forced to 1 on the bench alone, so that the special comes
  await db.query(`update public.town_catalog set data = jsonb_set(jsonb_set(data, '{specials,knobs,cap}', '1'), '{specials,knobs,perDay}', '{"real": 100, "fantasy": 100, "legend": 100}') where key = 'animals'`);
  const req = "req-v324-collect-silkie";
  const r1 = await call(A, { action: "collect", id: SILKIE, cracked: 0 }, req);
  eq(r1?.ok, true, "a member collects her silkie");
  eq([r1?.got?.special?.item, r1?.got?.special?.n, r1?.got?.n], ["silkieTwinEgg", 2, 0], "both rounds' units became the special (two rounds, two units)");
  eq(r1?.got?.firstSpecial, true, "the village's first");
  const g1 = r1?.got?.special?.grades ?? [];
  eq(g1.length === 2 && g1.every((q) => q >= 80 && q <= 100), true, `of her range with care 10 lifted: 80 to 100 (${g1})`);
  const pA = await bagOf(A);
  eq(held(pA.bag, "silkieTwinEgg"), 2, "two in the bag");
  eq(held(pA.bag, "silkieEgg"), 0, "and no produce: same count, not more");
  eq(pA.animalSpecials, { silkie: 1 }, "her book counts one find");
  eq((await one("select specials->'silkie'->>'by' b from public.town_pasture where one")).b, A, "the first finder is kept");
  eq(r1?.world?.specials?.silkie?.by, A, "and told");
  const s1 = (await one("select a from public.town_animals where id = $1", [SILKIE])).a;
  eq(s1.strips?.length, 1, "the strip is kept on the animal");
  eq([s1.strips?.[0]?.special, s1.strips?.[0]?.n, s1.strips?.[0]?.heart, s1.round?.since], ["silkieTwinEgg", 2, true, s1.strips?.[0]?.at], "the strip: the special, its full heart; the round begins anew");
  eq(s1.strips?.[0]?.places, ["barn"], "never out this round: the barn");
  eq(r1?.got?.strip, s1.strips?.[0], "the answer's strip is the kept one");
  const deed = await one("select doc from public.town_deeds where member_id = $1 and what = 'animal_collect' order by at desc limit 1", [A]);
  eq([deed?.doc?.special, deed?.doc?.sn], ["silkieTwinEgg", 2], "the deed says so");
  const r1b = await call(A, { action: "collect", id: SILKIE, cracked: 0 }, req);
  eq(r1b?.got, r1?.got, "the same call again answers its first answer");
  eq(held((await bagOf(A)).bag, "silkieTwinEgg"), 2, "and gives nothing twice");
  eq((await call(A, { action: "collect", id: SILKIE, cracked: 0 }))?.why, "nothing", "a second collection with nothing ready is refused");

  // a second finder, a starter
  const r2 = await call(B, { action: "collect", id: HEN_B, cracked: 0 });
  eq([r2?.ok, r2?.got?.special?.n, r2?.got?.firstSpecial], [true, 2, false], "another member finds it too, not first");
  eq((await one("select specials->'silkie'->>'by' b from public.town_pasture where one")).b, A, "the first finder stays");
  eq((await bagOf(B)).animalSpecials, { silkie: 1 }, "his own count");
  const g2 = r2?.got?.special?.grades ?? [];
  eq(g2.length === 2 && g2.every((q) => q >= 35 && q <= 65), true, `his hen's range: hearts 5 (ceiling 65), no care (floor 35) (${g2})`);
  const r3 = await call(A, { action: "collect", id: BARNHEN, cracked: 0 });
  eq([r3?.ok, r3?.got?.special ?? null, r3?.got?.n, r3?.got?.strip ?? null], [true, null, 2, null], "a starter brings none, nor a strip");

  // the coop never gives none
  await animal(HEN_ONE, A, "barnHen", "chicken", { banked: 1 });
  eq((await call(A, { action: "collect", id: HEN_ONE, cracked: 9 }))?.got?.n, 1, "every egg cracked: still one");

  // a stranger, an unproved member, another member's animal
  eq(!!(await as("anon", "select public.town_animals('{\"action\":\"look\"}'::jsonb, null) r")).error, true, "anon may not call it");
  const un = await as(UNVER, "select public.town_animals('{\"action\":\"look\"}'::jsonb, null) r");
  eq(!!un.error || un.row?.r?.ok === false, true, "an unproved member is refused");
  eq((await call(B, { action: "collect", id: SILKIE, cracked: 0 }))?.why, "theirs", "another member's animal is not collected");
  eq((await call(C, { action: "feed", id: SILKIE, item: "corn" }))?.why, "theirs", "nor fed by one she has not named");

  // a bag with room for the special alone, never for the produce: refused as the produce would be, whatever is rolled, the rounds kept
  {
    const corn = (await one("select (town.cat('items')->'corn'->>'stack')::int s")).s;
    const bag = [{ item: "eggBasket", n: 1 }, { item: "silkieTwinEgg", n: 1, grade: 2 }, { item: "silkieTwinEgg", n: 1, grade: 3 }];
    const size = ((await bagOf(A)).bag ?? []).length;
    await purse(A, [...bag, ...Array(size - bag.length).fill({ item: "corn", n: corn })]);
    await animal(SILKIE, A, "silkie", "chicken", { round: { since: now - 5 * HOUR } });
    const before = J((await bagOf(A)).bag);
    for (let i = 0; i < 3; i++) eq((await call(A, { action: "collect", id: SILKIE, cracked: 0 }))?.why, "room", `a full bag but the special's stacks is refused (${i + 1})`);
    eq((await one("select a->'banked' b from public.town_animals where id = $1", [SILKIE])).b, 2, "its rounds kept");
    eq(J((await bagOf(A)).bag), before, "the bag as it was");
    await purse(A, [...bag, ...Array(size - bag.length - 1).fill({ item: "corn", n: corn })]);
    const ok = await call(A, { action: "collect", id: SILKIE, cracked: 0 });
    eq([ok?.ok, ok?.got?.special?.n], [true, 2], "with a slot free it is collected, both specials (the chance forced to 1)");
  }

  // a friend's food and a full heart in the round
  await purse(C, [{ item: "corn", n: 5 }]);
  await herd(A, 0, [[now - 3 * HOUR, now - 2 * HOUR]], "anybody");
  await animal(SILKIE, A, "silkie", "chicken", { food: 5, round: { since: now - HOUR }, today: { day: 0 } });
  const fed = await call(C, { action: "feed", id: SILKIE, item: "corn" });
  eq(fed?.ok, true, "a friend feeds her hen");
  const s2 = (await one("select a from public.town_animals where id = $1", [SILKIE])).a;
  eq([s2.round?.friend, s2.round?.ate], [true, ["corn"]], "the round keeps the friend's food and what it was");

  // rain in the round, for a cayuga, and a place by her door
  await db.query("delete from public.town_weather where slot between $1 and $2", [Math.floor((now - 5 * HOUR) / 900000), Math.floor(now / 900000)]);
  await db.query("insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 8, 14, 2) on conflict (slot) do update set sky = 'rain'", [Math.floor((now - 2 * HOUR) / 900000)]);
  await herd(A, 0, [[now - 4 * HOUR, now - 3 * HOUR]], "anybody");
  await animal(CAYUGA, A, "cayuga", "duck", { outBands: 4, round: { since: now - 5 * HOUR }, banked: 1 });
  const strip = (await one("select town.special_strip(a, $2, $3, town.cat('animals')) s from public.town_animals where id = $1", [CAYUGA, JSON.stringify([[now - 4 * HOUR, now - 3 * HOUR]]), now])).s;
  const cay = (await one("select a from public.town_animals where id = $1", [CAYUGA])).a;
  eq([strip.rain, strip.wind], [true, false], "the rain in its round");
  eq(strip.places, SP.placesOf(cay, [[now - 4 * HOUR, now - 3 * HOUR]], now - 5 * HOUR, now, 4), "where it went is the page's");
  eq((await one("select town.special_met($1, $2) m", [JSON.stringify(SP.specialOf("cayuga").habit), JSON.stringify(strip)])).m, true, "the cayuga's habit met");
  // company: another member's grown duck out while hers was
  await herd(B, 1, [[now - 3.5 * HOUR, now - 2.5 * HOUR]]);
  await animal("66666666-6666-6666-6666-666666666666", B, "puddleDuck", "duck", {});
  eq((await one("select town.special_strip(a, $2, $3, town.cat('animals')) s from public.town_animals where id = $1", [CAYUGA, JSON.stringify([[now - 4 * HOUR, now - 3 * HOUR]]), now])).s.company, true, "a friend's duck out at once is company");
  // (a duckling whose kept growth is short of grown, though it may have grown since: company all the same; Codex)
  await animal("66666666-6666-6666-6666-666666666666", B, "puddleDuck", "duck", { grown: 47, body: undefined, born: now - 30 * HOUR });
  eq((await one("select town.special_strip(a, $2, $3, town.cat('animals')) s from public.town_animals where id = $1", [CAYUGA, JSON.stringify([[now - 4 * HOUR, now - 3 * HOUR]]), now])).s.company, true, "a friend's young duck out at once is company too");
  await herd(B, 1, [[now - 2 * HOUR, now - HOUR]]);
  eq((await one("select town.special_strip(a, $2, $3, town.cat('animals')) s from public.town_animals where id = $1", [CAYUGA, JSON.stringify([[now - 4 * HOUR, now - 3 * HOUR]]), now])).s.company, false, "out at another time is not");

  // the world told whole has the first finders
  eq((await call(A, { action: "look" }))?.world?.specials?.silkie?.by, A, "a look tells the specials' first finders");

  // ── at the uncle's: a special at its produce's price of the round, counted among its produce's sales ──
  const { factorOf, counted } = await import("@/lib/town/market");
  const mk = (await one("select town.market_now() m")).m, withF = { ...mk, at: { ...(mk.at ?? {}), silkieEgg: { f: 80, m: 1 } } };
  eq((await one("select town.factor_of($1, 'silkieTwinEgg') a, town.factor_of($1, 'silkieEgg') b, town.factor_of($1, 'farmEgg') c", [JSON.stringify(withF)])), { a: 80, b: 80, c: factorOf(withF, "farmEgg") }, "a special is priced at its produce's price, the produce as it was");
  eq(factorOf(withF, "silkieTwinEgg"), 80, "the page's price of it the same");
  eq(counted({ round: 1, at: {}, sold: {} }, "silkieTwinEgg", 3).sold, { silkieEgg: 3 }, "the page counts it as its produce");
  await db.query(`update public.town_things set doc = jsonb_set(jsonb_set(doc, '{sold}', '{}'), '{at,silkieEgg}', '{"f": 80, "m": 1}') where key = 'market'`);
  await db.query("select town.market_count('silkieTwinEgg', 3)");
  eq((await one("select doc->'sold' s from public.town_things where key = 'market'")).s, { silkieEgg: 3 }, "a special left counts among its produce's sales, not its own");
  const slotA = ((await bagOf(A)).bag ?? []).findIndex((s) => s?.item === "silkieTwinEgg");
  const lv = (await as(A, "select public.town_leave($1, 1) r", [slotA])).row?.r;
  const lot = (lv?.purse?.left ?? []).find((l) => l.item === "silkieTwinEgg");
  eq([lv?.ok, lot?.f, lot?.pays], [true, 80, 5], "a member leaves one at the uncle's at its produce's price");
  eq(lv?.prices?.things?.silkieTwinEgg?.f, 80, "and is told its produce's price");
  eq((await one("select doc->'sold' s from public.town_things where key = 'market'")).s, { silkieEgg: 4 }, "and it is counted as its produce");

  // ── the walls ──
  eq((await one(`select has_function_privilege('authenticated', 'public.town_animals(jsonb, text)', 'execute') as member, has_function_privilege('anon', 'public.town_animals(jsonb, text)', 'execute') as anon,
    (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`)),
    { member: true, anon: false, open: 0 }, "who may call what");
  eq(!!(await as(A, "select town.special_chance('{}'::jsonb, '{}'::jsonb, true) c")).error, true, "a member may not call a rule");
  eq(!!(await as(A, "select specials from public.town_pasture")).error, true, "nor read the pasture's table");
  // "what it should say afterwards"
  eq(await one(`select jsonb_typeof(data->'specials') as specials, jsonb_array_length(data->'graded') as graded, (select count(*)::int from jsonb_object_keys(data->'specials'->'breeds')) as breeds from public.town_catalog where key = 'animals'`), { specials: "object", graded: ANIMAL_GRADED.length, breeds: 28 }, "afterwards: the animals row");
  eq(await one("select column_name, data_type, column_default from information_schema.columns where table_schema = 'public' and table_name = 'town_pasture' and column_name = 'specials'"), { column_name: "specials", data_type: "jsonb", column_default: "'{}'::jsonb" }, "afterwards: the column");
} catch (e) { failed++; console.log("  THREW", e.stack?.slice(0, 600)); }
console.log(`v324: ${checks} passed, ${failed} failed`);
await db.close();
process.exit(failed ? 1 : 0);
