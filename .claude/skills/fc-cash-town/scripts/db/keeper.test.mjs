/*
 * The database's keeper (lib/town/keeper.ts's DbKeeper), driven as the page drives it, against the town's stand-in
 * database (town-bench.mjs: every migration replayed into PGlite, answered over HTTP as PostgREST answers).
 *
 * The rules themselves are proved elsewhere (each migration's dry run holds the SQL to the code, case by case). What
 * is tried here is the keeping: that every deed reaches the function it should with the arguments it takes, that
 * what each answer brings is kept and read back at once, that what others change is seen when it is looked at or
 * the room says so, that the clock is the database's, and that a town that cannot be reached is said, not thrown.
 *
 *   node keeper.test.mjs            (starts a stand-in of its own on port 3198, and stops it)
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";

await import("./repo-ts-town.mjs");
const { DbKeeper } = await import("@/lib/town/keeper");
const { FARM, plotAt, fishFrom, bedOf } = await import("@/lib/town/world");
const { shelfOf } = await import("@/lib/town/orders");

const PORT = 3198, BASE = `http://127.0.0.1:${PORT}`;
// (the drafts of the next migrations, kept out of supabase/ until each is proved, are tried with the rest, in their order)
const NEXT = ["v123", "v124", "v127", "v128"];
const there = readdirSync(`${process.env.FC_REPO ?? "E:/NinenineProject/fcnext"}/supabase`);
const drafts = NEXT.filter((v) => !there.some((f) => f.startsWith(`${v}_`))).map((v) => fileURLToPath(new URL(`./${v}_draft.sql`, import.meta.url))).filter((f) => existsSync(f));
const bench = spawn(process.execPath, [fileURLToPath(new URL("./town-bench.mjs", import.meta.url)), String(PORT)],
  { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, BENCH_EXTRA: drafts.join(",") } });
let up = false, log = "";
bench.stdout.on("data", (d) => { log += d; if (/stand-in database is up/.test(log)) up = true; });
bench.stderr.on("data", (d) => { log += d; });
for (let i = 0; i < 240 && !up; i++) await new Promise((r) => setTimeout(r, 500));
if (!up) { console.log("the stand-in did not come up:\n" + log.slice(-1500)); bench.kill(); process.exit(2); }

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 700)}`); };
const section = (name) => console.log(`\n${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (path, body) => (await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const skip = (ms) => post("/bench/skip", { ms });
const asked = [], sent = [];
const askAs = (as) => async (fn, args) => {
  asked.push(`${as} ${fn}`);
  sent.push({ as, fn, args: args ?? {} });
  const r = await fetch(`${BASE}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "content-type": "application/json", ...(as ? { "x-town-as": as } : {}) }, body: JSON.stringify(args ?? {}) });
  if (r.status === 403) return { denied: true };
  return r.ok ? r.json() : null;
};
const member = async (as, name, admin = false) => (await (await fetch(`${BASE}/bench/who?as=${as}&name=${encodeURIComponent(name)}${admin ? "&admin=1" : ""}`)).json()).id;
/** A purse set up by hand: so many coins, and a bag. */
const purse = (id, coins, bag) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [id, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const settled = async (k) => { await k.hold(-1); };   // (any deed: what was asked before it has been answered when it has)
const slotOf = (k, item) => k.purse().bag.findIndex((s) => s?.item === item);

try {
  const a = await member("A", "Tester A"), b = await member("B", "Tester B");
  if ((await sql(`select to_regprocedure('public.town_is_open()') is not null as there`))[0].there) {
    section("the game, shut and open (v115)");
    await sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
    const from = asked.length;
    const out = new DbKeeper(a, askAs("A"));
    await sleep(500);
    ok("shut: a member's keeper says the game is not open to them, having asked only whether it is", out.open() === false && !out.ready() && asked.slice(from).join() === "A town_is_open", asked.slice(from));
    const refused = await out.buy("worm", 1);
    ok("…and a deed sent all the same is refused by the database, and said as out of reach", refused.ok === false && refused.why === "away", refused);
    const boss = new DbKeeper(await member("Adm", "Tester Admin", true), askAs("Adm"));
    await sleep(500);
    ok("…an admin's that it is, with their purse read", boss.open() === true && boss.ready());
    await sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
    const back = new DbKeeper(a, askAs("A"));
    await sleep(500);
    ok("opened by the owner: the member's keeper says so the next time they come in, and has their purse", back.open() === true && back.ready() && back.purse().popoto.profile === 30, back.purse());
    out.close(); boss.close(); back.close();
  }
  const A = new DbKeeper(a, askAs("A")), B = new DbKeeper(b, askAs("B"));
  let told = 0;
  A.watch(() => { told++; });

  section("the purse, the clock, and who may");
  ok("before the first answer, a keeper says it has not read the purse", A.ready() === false && A.open() === null);
  await settled(A); await settled(B);
  ok("…and then that it has, and that the game is open to this member", A.ready() && A.open() === true && told > 0);
  ok("a new purse: ten empty slots, no coins, thirty popoto to change, none from pictures", A.purse().bag.length === 10 && A.purse().coins === 0 && A.purse().popoto.profile === 30 && A.purse().popoto.gallery === 0, A.purse());
  ok("the clock is the database's (here, the same machine's: within a quarter second)", Math.abs(A.now() - Date.now()) < 250, A.now() - Date.now());
  await skip(3_600_000);
  await settled(A);
  ok("…put forward an hour there, it is an hour on here at the next answer", Math.abs(A.now() - Date.now() - 3_600_000) < 250, A.now() - Date.now());
  const V = new DbKeeper("nobody", askAs(""));
  await sleep(300);
  ok("a visitor's keeper says the game is not open to them, and has no purse", V.open() === false && V.ready() === false);
  ok("…and a deed of theirs is refused as out of reach, not thrown", (await V.buy("worm", 1)).ok === false);
  let offline = true, reached = 0;
  const flaky = askAs("A");
  const dead = new DbKeeper(a, async (fn, args) => { if (offline) throw new Error("no network"); reached++; return flaky(fn, args); });
  const began = Date.now(), away = await dead.buy("worm", 1);
  ok("a town that cannot be reached is said so at once: away", away.ok === false && away.why === "away" && Date.now() - began < 1000 && !dead.ready(), { away, ms: Date.now() - began });
  offline = false;
  await sleep(4600);
  ok("…and is asked again by itself in a while: the purse is read, the game is on", dead.ready() && dead.open() === true && reached >= 2, { ready: dead.ready(), reached });
  V.close(); dead.close();

  section("the bank and the stall");
  let did = await A.change("profile", 4);
  ok("four popoto changed: twenty coins, twenty-six left, four of the week's twenty used", did.ok && A.purse().coins === 20 && A.purse().popoto.profile === 26 && A.purse().changed.n === 4, A.purse());
  did = await A.change("gallery", 1);
  ok("popoto from pictures are refused: none to change", !did.ok && did.why === "popoto", did);
  did = await A.change("profile", 17);
  ok("more than the week's rest is refused: cap", !did.ok && did.why === "cap", did);
  // (the first day's shelf: twenty-one things, from v117 the scroll of the cure for pests, and from v125 a net for insects)
  const sells = (await sql(`select town.cat('items') ? 'scrollPestCure' as cure, town.cat('items') ? 'bugNet' as net`))[0], first = 21 + (sells.cure ? 1 : 0) + (sells.net ? 1 : 0);
  ok("the stall is not known until it is looked at", A.order() === null && A.shelf().length === shelfOf(0).length);
  const stopStall = A.look("stall");
  await settled(A);
  ok(`looked at: today's order, the first day's shelf of ${first}, the next hint`, A.order()?.wants?.length === 3 && A.shelf().length === first && typeof A.nextHint() === "string", { order: A.order(), shelf: A.shelf().length, hint: A.nextHint() });
  stopStall();
  did = await A.buy("worm", 3);
  ok("three worms bought: six coins gone, in the bag, counted on the stall", did.ok && A.purse().coins === 14 && A.purse().bag[0]?.item === "worm" && A.purse().bag[0].n === 3 && A.stall().sold.worm === 3, { purse: A.purse().bag[0], stall: A.stall() });
  did = await A.buy("rod", 1);
  ok("a rod at sixty is refused with fourteen: coins", !did.ok && did.why === "coins", did);
  did = await A.hold(0);
  ok("the worms taken up: in the hand", did.ok && A.purse().hand === "worm", A.purse().hand);
  did = await A.hold(null);
  ok("…and put away", did.ok && !A.purse().hand, A.purse().hand);
  did = await A.leave(0, 2);
  ok("two left with the uncle: waiting to be fetched", did.ok && A.purse().left.length === 1 && A.purse().bag[0].n === 1, A.purse().left);
  did = await A.takeBack(0);
  ok("…and taken back", did.ok && A.purse().left.length === 0 && A.purse().bag[0].n === 3, A.purse().left);
  did = await A.collect();
  ok("no money waiting is said: nothing", !did.ok && did.why === "nothing", did);
  did = await A.drop(0);
  ok("the worms thrown away", did.ok && A.purse().bag.every((s) => s === null), A.purse().bag);
  await purse(a, 500, []);
  did = await A.hint();
  ok("a hint bought: named, and paid for", did.ok && typeof did.hint === "string" && A.purse().coins < 500 && (A.purse().hints ?? []).includes(did.hint), did.ok ? { hint: did.hint, coins: A.purse().coins } : did);

  section("a meal");
  await purse(a, 0, [{ item: "riceBox", n: 2 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 0)) where member_id = $1`, [a]);
  await settled(A);
  did = await A.sitDown(0, false);
  ok("standing, a meal is refused: stand", !did.ok && did.why === "stand", did);
  did = await A.sitDown(0, true);
  ok("sitting: the meal begins, a helping leaves the bag", did.ok && did.dish === "riceBox" && A.purse().eating?.dish === "riceBox" && A.purse().bag[0].n === 1, A.purse().eating);
  const before = asked.length;
  for (let i = 0; i < 5; i++) A.chew(0);
  await settled(A);
  const chews = asked.slice(before).filter((x) => x === "A town_chew").length;
  ok("counted on every second by the page, the database is asked once", chews === 1, asked.slice(before));
  A.chew(2);
  await settled(A);
  ok("…and again when somebody sits down beside", asked.slice(before).filter((x) => x === "A town_chew").length === 2, asked.slice(before));
  const fed0 = A.purse().stamina.left;
  await skip(120_000);
  await settled(A);
  const fed1 = A.purse().stamina.left;
  ok("two minutes on, the purse read here shows what the meal has given so far (the rule's own count)", fed1 > fed0 && !!A.purse().eating, { fed0, fed1 });
  await skip(200_000);
  await settled(A);
  await sleep(900);
  ok("its five minutes up, the keeper asks for its end by itself: no meal, the stamina in", !A.purse().eating && A.purse().stamina.left >= 15, A.purse());
  did = await A.sitDown(0, true);
  ok("the same meal's hours again: meal", !did.ok && did.why === "meal", did);

  section("fishing: dropped, struck and landed with the database");
  let deck = null, bank = null;
  for (let y = 0; y < 64 && !(deck && bank); y++) for (let x = 0; x < 64; x++) { const f = fishFrom(x, y); if (f?.deep && !deck) deck = [x, y]; if (f && !f.deep && !bank) bank = [x, y]; }
  await purse(a, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 6 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
  await A.hold(0);
  let cast = await A.cast("worm", { tile: [1, 1], deep: true }, false);
  ok("from a tile no line reaches water from: refused", !cast.ok, cast);
  cast = await A.cast("worm", { tile: deck, deep: true }, false);
  ok("from the deck: how long until the bite and when the float twitches, never what is on its way", cast.ok && cast.wait > 0 && Array.isArray(cast.nibbles) && cast.lag >= 0 && !("what" in cast) && slotOf(A, "worm") >= 0 && A.purse().bag[slotOf(A, "worm")].n === 5, cast);
  let struck = await A.strike(-cast.wait, null);
  ok("struck at once: nothing on the hook, too soon", struck.ok && struck.hooked === false && struck.how === "early", struck);
  ok("…and the line is up", (await sql(`select count(*)::int as n from public.town_lines where member_id = $1`, [a]))[0].n === 0);
  // a fish, hooked and fought: cast until one bites that is a fish (most are, from the deck)
  let fish = null;
  for (let go = 0; go < 6 && !fish; go++) {
    await purse(a, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 6 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'rod', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    cast = await A.cast("worm", { tile: deck, deep: true }, false);
    await skip(Math.round(cast.wait * 1000) + 150);
    struck = await A.strike(0.15, "good");
    if (struck.ok && struck.hooked && !struck.landed) fish = struck;
    else if (go === 0) ok("something that is no fish comes in at the strike, with no fight", struck.ok && struck.hooked && struck.landed === true && typeof struck.what === "string", struck);
  }
  ok("at the bite: a fish on the hook, named and measured now, and the fight's stamina taken", !!fish && typeof fish.what === "string" && fish.size > 0 && A.purse().stamina.left < 100, { fish, stamina: A.purse().stamina });
  let landed = await A.land("landed", { seed: 1, steps: 10, secs: 0.3, inBand: 1, holds: [] });
  ok("landed sooner than any fight could be, the database does not believe it: slipped", landed.how === "slipped" && landed.kept === false, landed);
  for (let go = 0, got = false; go < 6 && !got; go++) {
    await purse(a, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 6 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'rod', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    cast = await A.cast("worm", { tile: deck, deep: true }, false);
    await skip(Math.round(cast.wait * 1000) + 150);
    struck = await A.strike(0.15, "good");
    if (!(struck.ok && struck.hooked && !struck.landed)) continue;
    await skip(60_000);
    landed = await A.land("landed", { seed: 1, steps: 1800, secs: 60, inBand: 0.8, holds: [3, 40] });
    got = true;
    ok("after a fight as long as one is: landed, kept, in the bag", landed.how === "landed" && landed.kept === true && slotOf(A, struck.what) >= 0, { landed, bag: A.purse().bag.filter(Boolean) });
    ok("…the longest of its kind so far: a record, and on the purse", landed.record === true && A.purse().best[struck.what] === struck.size, { landed, best: A.purse().best });
  }
  await purse(a, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 6 }]);
  await sql(`update public.town_purses set doc = doc || '{"hand": "rod"}'::jsonb where member_id = $1`, [a]);
  cast = await A.cast("worm", { tile: bank, deep: false }, true);
  ok("from the bank, in the rain: a line out", cast.ok && cast.wait > 0, cast);
  await skip(Math.round(cast.wait * 1000) + 6000);
  const t0 = Date.now();
  await A.missed();
  ok("a bite nobody struck: given up once the database counts it gone too (a moment's grace), and written down as missed", Date.now() - t0 >= 1500
    && (await sql(`select count(*)::int as n from public.town_lines where member_id = $1`, [a]))[0].n === 0
    && (await sql(`select doc->>'how' as how from public.town_plays where member_id = $1 order by id desc limit 1`, [a]))[0]?.how === "missed",
    await sql(`select doc->>'how' as how from public.town_plays where member_id = $1 order by id desc limit 3`, [a]));
  cast = await A.cast("worm", { tile: deck, deep: true }, false);
  landed = await A.land("left", null);
  ok("a line pulled up with nothing on it: left, and the line is gone", cast.ok && landed.how === "left" && (await sql(`select count(*)::int as n from public.town_lines where member_id = $1`, [a]))[0].n === 0, landed);

  section("the farm: one for everybody");
  let plot = null;
  for (let y = FARM.y; y < FARM.y + FARM.h && !plot; y++) for (let x = FARM.x; x < FARM.x + FARM.w; x++) if (plotAt(x, y)) { plot = [x, y]; break; }
  const key = `${plot[0]},${plot[1]}`, bed = bedOf(plot[0], plot[1]);
  await purse(a, 0, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 2 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'hoe', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
  await purse(b, 0, [{ item: "hoe", n: 1 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'hoe', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [b]);
  await settled(A); await settled(B);
  const deeds = [];
  A.onDeed = (what, to) => deeds.push([what, to]);
  const stopFarmB = B.look("farm");
  ok("weeds, with a hoe in the hand: to be cleared", A.deedAt(key) === "clear", A.deedAt(key));
  let tended = await A.farmDo(key, "Tester A", { hits: 5, misses: 2, secs: 4.2, need: 5 });
  ok("cleared: the plot is kept here at once, and the room is told the farm changed", tended.ok && tended.deed === "clear" && A.farm()[key]?.soil === "cleared" && deeds.some(([w]) => w === "farm"), { tended, plot: A.farm()[key], deeds });
  ok("the hoe's misses cost a little more stamina, as the database counts them", tended.ok && tended.misses === 2 && A.purse().stamina.left < 100, { tended, stamina: A.purse().stamina });
  tended = await A.farmDo(key, "Tester A", { hits: 5, misses: 0, secs: 3, need: 5 });
  ok("tilled", tended.ok && tended.deed === "till" && A.farm()[key]?.soil === "tilled", tended);
  await A.hold(slotOf(A, "seedKangkong"));
  ok("a seed in the hand: to be sown", A.deedAt(key) === "sow", A.deedAt(key));
  tended = await A.farmDo(key, "Tester A");
  ok("sown: a plant of mine, and the bed is mine, by name", tended.ok && tended.deed === "sow" && A.farm()[key]?.plant?.crop === "kangkong" && A.owners().get(bed)?.by === a && A.owners().get(bed)?.name === "Tester A",
    { tended, owners: [...A.owners()] });
  ok("somebody else has not seen it yet (nothing is pushed)", B.farm()[key] === undefined || B.farm()[key]?.soil !== "tilled" || !B.farm()[key]?.plant, B.farm()[key]);
  B.nudged("farm");
  await settled(B);
  ok("the room says the farm changed, and they ask: the plot, the plant and whose the bed is", B.farm()[key]?.plant?.crop === "kangkong" && B.owners().get(bed)?.by === a, { plot: B.farm()[key], owners: [...B.owners()] });
  ok("…where their hoe has nothing to do: something grows there", B.deedAt(key) === null, B.deedAt(key));
  const theirs = await B.farmDo(key, "Tester B");
  ok("…and the database says the same if they try", !theirs.ok, theirs);
  stopFarmB();
  const nextTo = (() => { for (let dx = 1; dx < 7; dx++) if (plotAt(plot[0] + dx, plot[1]) && bedOf(plot[0] + dx, plot[1]) === bed) return [plot[0] + dx, plot[1]]; return null; })();
  // back to weeds: a plot that goes wild again leaves what is kept here
  await sql(`update public.town_plots set soil = 'wild', plant = null, changed = town.now_ms() where x = $1 and y = $2`, plot);
  const stopFarmA = A.look("farm");
  await settled(A);
  ok("a plot gone back to weeds is forgotten here when the farm is next asked for", A.farm()[key] === undefined, A.farm()[key]);
  stopFarmA();
  void nextTo;

  if ((await sql(`select to_regprocedure('town.uproot(text, jsonb, jsonb, boolean, boolean, text, bigint)') is not null as there`))[0].there) {
    section("a plant dug out: the page asks twice, and the word goes to the database (v119)");
    const far = "(town.now_ms() + 365::bigint * 86400000)";
    const cabbage = (x, y) => sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled',
      jsonb_build_object('by', $3::text, 'crop', 'cabbage', 'sown', town.now_ms() - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', ${far}, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [x, y, a]);
    await cabbage(...plot);
    await cabbage(...nextTo);
    await sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of($1::int, $2::int), $3, town.now_ms() - 3600000, 0)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [...plot, a]);
    for (const who of [a, b]) {
      await purse(who, 0, [{ item: "hoe", n: 1 }]);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'hoe', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [who]);
    }
    await settled(A); await settled(B);
    const lookA = A.look("farm"), lookB = B.look("farm");
    await settled(A); await settled(B);
    const other = `${nextTo[0]},${nextTo[1]}`;
    ok("my own living plant, with a hoe in the hand: to be dug out", A.deedAt(key) === "uproot" && A.farm()[key]?.plant?.crop === "cabbage", A.deedAt(key));
    ok("…somebody else's hoe has nothing to do there", B.deedAt(key) === null && B.farm()[key]?.plant?.crop === "cabbage", B.deedAt(key));
    sent.length = 0;
    let dug = await A.farmDo(key, "Tester A");
    ok("asked with no word, the database says it is not sure: nothing is done, and the plant is still kept here", !dug.ok && dug.why === "sure" && A.farm()[key]?.plant?.crop === "cabbage" && A.purse().stamina.left === 100, dug);
    dug = await A.farmDo(key, "Tester A", undefined, true);
    ok("asked with the word: dug out, bare cleared ground kept here at once, and nothing got", dug.ok && dug.deed === "uproot" && dug.got.length === 0 && A.farm()[key]?.soil === "cleared" && !A.farm()[key]?.plant, dug);
    ok("…for the stamina of pulling a plant up, and the bed still mine", A.purse().stamina.left === 98 && A.owners().get(bed)?.by === a, { stamina: A.purse().stamina, owners: [...A.owners()] });
    const tends = sent.filter((s) => s.fn === "town_tend");
    ok("the word is sent only when it is given: a database that has not had v119 is asked as it always was", tends.length === 2 && !("p_sure" in tends[0].args) && tends[1].args.p_sure === true, tends.map((s) => s.args));
    const theirs = await B.farmDo(other, "Tester B", undefined, true);
    ok("somebody else, word or no word: the bed is somebody's, and the plant stands", !theirs.ok && theirs.why === "theirs" && (await sql(`select plant->>'crop' as crop from public.town_plots where x = $1 and y = $2`, nextTo))[0].crop === "cabbage", theirs);
    lookA(); lookB();
  }

  section("the kitchen: pots, and what has been found");
  await purse(a, 0, [{ item: "pan", n: 1 }, { item: "minnow", n: 3 }, { item: "salt", n: 1 }, { item: "bowl", n: 1 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'pan', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
  await purse(b, 0, [{ item: "bowl", n: 2 }]);
  await settled(A); await settled(B);
  const stopKitchenB = B.look("kitchen");
  ok("what is put together is tried here first, without asking: nothing chosen is refused", A.cookTry([], ["pan"]) !== null && A.cookTry([["minnow", 3], ["salt", 1]], ["pan"]) === null, A.cookTry([], ["pan"]));
  deeds.length = 0;
  const cooked = await A.cookDo([["minnow", 3], ["salt", 1]], ["pan"], [], { hits: 6, misses: 0, secs: 5, need: 6 }, "Tester A");
  ok("three minnows and salt in a pan: fried minnow, two helpings, found first", cooked.ok && cooked.made === "friedMinnow" && cooked.n === 2 && cooked.first === true, cooked);
  await settled(A);
  ok("a find is everybody's: on the list here, by name, and I have made it", A.found().includes("friedMinnow") && A.finder("friedMinnow") === "Tester A" && A.madeBefore("friedMinnow") && A.known().includes("friedMinnow"), { found: A.found(), finder: A.finder("friedMinnow") });
  ok("…and the room is told the kitchen changed", deeds.some(([w]) => w === "kitchen"), deeds);
  await A.hold(slotOf(A, "potFull"));
  const at = [20, 20];
  const down = await A.potDown(at);
  ok("the pot set down: it stands there, kept here at once", down.ok && A.pots().length === 1 && A.pots()[0].dish === "friedMinnow" && A.pots()[0].left === 2 && A.pots()[0].by === a, { down, pots: A.pots() });
  const again = await A.potDown([21, 20]);
  ok("with no pot in the bag, nothing is set down", !again.ok, again);
  B.nudged("kitchen");
  await settled(B);
  ok("somebody else sees the pot when the room says so, and what has been found", B.pots().length === 1 && B.found().includes("friedMinnow"), { pots: B.pots(), found: B.found() });
  const far = await B.potLadle(B.pots()[0].id, [40, 40]);
  ok("from too far off, no helping", !far.ok, far);
  let ladled = await B.potLadle(B.pots()[0].id, at);
  ok("beside it, with a bowl: a helping, the bowl gone with it, one left in the pot", ladled.ok && ladled.pot?.left === 1 && slotOf(B, "friedMinnow") >= 0 && B.purse().bag[slotOf(B, "bowl")].n === 1 && B.pots()[0].left === 1, { ladled, bag: B.purse().bag.filter(Boolean) });
  const notMine = await B.potTake(B.pots()[0].id, at);
  ok("a pot is taken up by whoever set it down only", !notMine.ok, notMine);
  ladled = await B.potLadle(B.pots()[0].id, at);
  ok("its last helping out, the pot is gone", ladled.ok && ladled.pot === null && B.pots().length === 0, { ladled, pots: B.pots() });
  A.nudged("kitchen");   // (nobody looks at the kitchen from A's keeper here: a nudge is only taken while it is looked at)
  const stopKitchenA = A.look("kitchen");
  await settled(A);
  ok("…for its owner too, when they look", A.pots().length === 0, A.pots());
  stopKitchenA(); stopKitchenB();

  section("a deal between two");
  await purse(a, 40, [{ item: "worm", n: 3 }]);
  await purse(b, 5, [{ item: "minnow", n: 2 }]);
  await settled(A); await settled(B);
  deeds.length = 0;
  let deal = await A.dealOpen("B", "Tester A", "Tester B");
  ok("opened: mine to see at once, and the other is told to look", deal.ok && A.deal()?.a === a && A.deal()?.b === b && !A.deal()?.end && deeds.some(([w]) => w === "deal"), { deal, mine: A.deal(), deeds });
  ok("the other has not heard", B.deal() === null);
  B.nudged("deal");
  await settled(B);
  ok("…until the room says so: the same deal, from their side", B.deal()?.a === a && B.deal()?.b === b && !B.deal()?.end, B.deal());
  const busy = await B.dealOpen("A", "Tester B", "Tester A");
  ok("one deal at a time: busy", !busy.ok && busy.why === "busy", busy);
  deal = await A.dealLay([["worm", 2]], 10);
  ok("my side laid out: two worms and ten coins", deal.ok && A.deal()?.give.a[0]?.[1] === 2 && A.deal()?.coins.a === 10, A.deal());
  deal = await A.dealLay([["worm", 9]], 0);
  ok("more than I have is refused, and the deal stands as it was", !deal.ok && A.deal()?.give.a[0]?.[1] === 2, { deal, mine: A.deal() });
  await B.dealLay([["minnow", 1]], 0);
  let word = await B.dealAgree(true);
  ok("one word given: not done yet", word.ok && word.done === false && B.deal()?.ok.b === true, word);
  A.nudged("deal");
  await settled(A);
  ok("…seen from the other side", A.deal()?.ok.b === true && A.deal()?.give.b[0]?.[0] === "minnow", A.deal());
  word = await A.dealAgree(true);
  ok("both words: done, and everything has changed hands in my purse", word.ok && word.done === true && A.deal()?.end === "done" && A.purse().coins === 30 && slotOf(A, "minnow") >= 0 && A.purse().bag[slotOf(A, "worm")].n === 1,
    { word, deal: A.deal(), coins: A.purse().coins, bag: A.purse().bag.filter(Boolean) });
  B.nudged("deal");
  await settled(B); await settled(B);
  ok("the other is shown how it ended, and their purse is read again: the worms and the coins are in it", B.deal()?.end === "done" && B.purse().coins === 15 && B.purse().bag.some((s) => s?.item === "worm" && s.n === 2), { deal: B.deal(), coins: B.purse().coins, bag: B.purse().bag.filter(Boolean) });
  await sleep(6300);
  ok("an ended deal is shown for a moment, then forgotten", A.deal() === null && B.deal() === null, { a: A.deal(), b: B.deal() });
  deal = await A.dealOpen("B", "Tester A", "Tester B");
  await A.dealCancel();
  ok("called off: said so, to the one who called it off", deal.ok && A.deal()?.end === "off", A.deal());

  if (sells.cure) {
    section("the cure for pests: its scroll bought, read and cooked (v117)");
    const CURE = [["chili", 2], ["scallion", 2], ["salt", 1]];
    await purse(a, 100, [{ item: "pot", n: 1 }, { item: "chili", n: 2 }, { item: "scallion", n: 2 }, { item: "salt", n: 1 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'pot', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    await settled(A);
    did = await A.buy("scrollPestCure", 1);
    ok("the scroll is bought for forty coins", did.ok && A.purse().coins === 60 && slotOf(A, "scrollPestCure") >= 0, did.ok ? A.purse().coins : did);
    did = await A.readScroll(slotOf(A, "scrollPestCure"));
    ok("read: the cure is in the book with what else is made, and the scroll is used up", did.ok && did.dish === "pestCure" && A.knownMakes().includes("pestCure") && !A.known().includes("pestCure") && slotOf(A, "scrollPestCure") < 0, did);
    ok("what goes into it is tried here first, and taken for it", A.cookTry(CURE, ["pot"]) === null, A.cookTry(CURE, ["pot"]));
    const cure = await A.cookDo(CURE, ["pot"], [], { hits: 5, misses: 0, secs: 4, need: 5 }, "Tester A");
    ok("chilies, scallions and salt in a pot: two of the cure, found first, and made", cure.ok && cure.made === "pestCure" && cure.n === 2 && cure.first === true && A.purse().bag[slotOf(A, "pestCure")]?.n === 2 && A.madeBefore("pestCure"), cure);
  }

  if ((await sql(`select to_regprocedure('public.town_toss(text, integer, text)') is not null as there`))[0].there) {
    section("the fountain: a pot the village fills, and a blessing beside a meal's buff (v123)");
    await purse(a, 300, []);
    await purse(b, 300, []);
    await settled(A); await settled(B);
    ok("not looked at yet, the fountain is not known", A.fountain() === null);
    const stopA = A.look("fountain");
    await settled(A);
    const goal = A.fountain()?.goal;
    ok("looked at: the pot is empty, and the day's goal is a share of the village's coins or the least there is", A.fountain()?.pot === 0 && goal >= 100 && A.fountain().who.length === 0 && A.fountain().mine === false, A.fountain());
    let from = sent.length;
    let did = await A.toss("green", 30);
    ok("a toss reaches the database with the wish and the coins", sent[from]?.fn === "town_toss" && sent[from].args.p_wish === "green" && sent[from].args.p_coins === 30, sent[from]);
    ok("…and its answer is kept at once: the purse lighter, the pot told", did.ok && did.took === 30 && did.granted === null && A.purse().coins === 270 && A.fountain().pot === 30 && A.fountain().by.green === 30 && A.fountain().mine === true, [did, A.fountain()]);
    let told = null;
    A.onDeed = (what) => { told = what; };
    did = await A.toss("green", 1);
    ok("the room is told the fountain changed", told === "fountain");
    A.onDeed = null;
    did = await A.toss("rain", 5);
    ok("a wish there is not is refused as the rule refuses it, and nothing is taken", did.ok === false && did.why === "none" && A.purse().coins === 269, did);
    ok("the other keeper has not looked, and knows nothing of it", B.fountain() === null);
    const stopB = B.look("fountain");
    await settled(B);
    ok("looked at, it sees the same pot, and that its coin is not in it", B.fountain()?.pot === 31 && B.fountain().mine === false && B.fountain().who.length === 1, B.fountain());
    did = await B.toss("hearty", 300);
    ok("the coin that fills the pot: no more is taken than fills it, and the wish with the most behind it comes true", did.ok && did.took === goal - 31 && did.granted === (goal - 31 > 31 ? "hearty" : "green"), did);
    const wish = did.granted;
    ok("…the blessing in the purse of whoever filled it, with the answer", B.purse().blessed?.length === 1 && B.purse().blessed[0].id === wish, B.purse().blessed);
    ok("…and the next pot of the day asks twice as much", B.fountain().goal === goal * 2 && B.fountain().pot === 0 && B.fountain().blessings.length === 1 && B.fountain().blessings[0].mine === true, B.fountain());
    ok("the first keeper has not been told yet", !A.purse().blessed);
    A.nudged("fountain");
    await settled(A);
    ok("the room's word brings it: the blessing is theirs too, whose coin was in the pot", A.fountain().blessings[0]?.mine === true && A.purse().blessed?.[0]?.id === wish, [A.fountain().blessings, A.purse().blessed]);
    // a wish in its writer's words
    from = sent.length;
    did = await A.toss("calm", 1, "ขอให้ปลากินเบ็ด");
    ok("a toss's words go with it", sent[from]?.fn === "town_toss" && sent[from].args.p_note === "ขอให้ปลากินเบ็ด" && did.ok, sent[from]);
    const words = A.fountain().notes.find((n) => n.mine);
    ok("…and the wish is told with the fountain: mine, with nobody's coin on it", !!words && words.note === "ขอให้ปลากินเบ็ด" && words.wish === "calm" && words.cheers === 0 && A.fountain().admin === false, A.fountain().notes);
    did = await A.toss("calm", 1, "x".repeat(81));
    ok("words too long are refused as the database refuses them, and nothing is taken", did.ok === false && did.why === "note", did);
    B.nudged("fountain");
    await settled(B);
    from = sent.length;
    did = await B.cheer(words.id, 2);
    ok("a coin tossed onto somebody's wish reaches the database with which wish and how many", sent[from]?.fn === "town_cheer" && sent[from].args.p_note === words.id && sent[from].args.p_coins === 2 && did.ok && did.took === 2, [sent[from], did]);
    ok("…and is counted beside it at once", B.fountain().notes.find((n) => n.id === words.id)?.cheers === 1 && B.fountain().notes.find((n) => n.id === words.id)?.cheered === true, B.fountain().notes);
    did = await B.wishReport(words.id);
    ok("a report is taken, once", did.ok && B.fountain().notes.find((n) => n.id === words.id)?.reported === true && (await B.wishReport(words.id)).ok === false, B.fountain().notes);
    did = await B.wishHide(words.id, true);
    ok("hiding a wish is an admin's: a member's keeper is refused, and says the town is out of reach", did.ok === false, did);
    did = await A.wishUnsay(words.id);
    ok("its writer takes it back", did.ok && !A.fountain().notes.some((n) => n.id === words.id), A.fountain().notes);
    stopA(); stopB();
  }

  if ((await sql(`select to_regprocedure('town.prices_told(uuid)') is not null as there`))[0].there) {
    section("the relatives' price: told at the stall, and with a thing left or taken back (v124)");
    const P = new DbKeeper(a, askAs("A"));
    await purse(a, 0, [...Array(8).fill({ item: "kangkong", n: 20 }), { item: "worm", n: 3 }]);
    await settled(P);
    ok("not looked at yet, no price is known: every thing is at its usual one", Object.keys(P.prices().things).length === 0 && P.prices().round === 0, P.prices());
    const stopP = P.look("stall");
    await sleep(500);
    ok("the stall looked at: the price of what I hold whose price moves, and of nothing else", Object.keys(P.prices().things).join() === "kangkong" && P.prices().things.kangkong.f === 100 && P.prices().round > 0, P.prices());
    for (let i = 0; i < 8; i++) did = await P.leave(slotOf(P, "kangkong"), 20);
    ok("a hundred and sixty left: one lot at the usual price, and the price still told, for the lot", did.ok && P.purse().left.at(-1).n === 160 && !("f" in P.purse().left.at(-1)) && P.prices().things.kangkong?.f === 100, [P.purse().left, P.prices()]);
    await skip(12 * 3_600_000);
    await purse(b, 0, [{ item: "kangkong", n: 20 }]);
    await settled(B);
    const stopQ = B.look("stall");
    await sleep(500);
    const now = B.prices().things.kangkong;
    ok("a round on, somebody else is told the lower price, with the round that ended behind it", now?.f === 83 && now.was.length === 1 && now.was[0][1] === 100 && now.was[0][2] === 160 && now.floor === 40 && now.ceil === 150, B.prices());
    did = await B.leave(0, 20);
    ok("…and a lot left then keeps it", did.ok && B.purse().left.at(-1).f === 83 && B.prices().things.kangkong?.f === 83, [B.purse().left, B.prices()]);
    did = await B.takeBack(B.purse().left.length - 1);
    ok("taken back, it is in the bag again, and its price is told with the answer", did.ok && B.purse().bag[0]?.n === 20 && B.prices().things.kangkong?.f === 83, [B.purse().bag[0], B.prices()]);
    stopP(); stopQ(); P.close();
  }

  if ((await sql(`select to_regprocedure('public.town_notices()') is not null as there`))[0].there) {
    section("the notice board: a member sells to a member (v128)");
    const P = new DbKeeper(a, askAs("A")), Q = new DbKeeper(b, askAs("B"));
    await purse(a, 0, [{ item: "kangkong", n: 20 }]);
    await purse(b, 100, [{ item: "minnow", n: 5 }]);
    await settled(P); await settled(Q);
    ok("not looked at yet, the board is not known", P.notices() === null);
    const stopP = P.look("notices"), stopQ = Q.look("notices");
    await sleep(600);
    ok("looked at: nothing pinned, three places, and what may be wanted: what is in a bag, and the uncle's shelf", P.notices()?.notices.length === 0 && P.notices().slots === 3 && P.notices().more === 100
      && ["kangkong", "minnow", "worm"].every((id) => P.notices().seen.includes(id)) && !P.notices().seen.includes("megaCatfish"), P.notices());
    let nudges = 0;
    P.onDeed = (what) => { if (what === "notices") nudges++; };
    let from = sent.length;
    did = await P.noticePost("sell", "kangkong", 10, 4);
    ok("a notice pinned reaches the database with its kind, its thing, how many and the price; the room is told; and the board comes back with the answer",
      did.ok && sent[from]?.fn === "town_notice_post" && JSON.stringify(sent[from].args) === JSON.stringify({ p_kind: "sell", p_item: "kangkong", p_n: 10, p_price: 4 })
      && nudges === 1 && P.notices().mine.length === 1 && P.purse().bag[0]?.n === 10, [did, sent[from], nudges]);
    Q.nudged("notices");
    await sleep(500);
    const up = Q.notices().notices[0];
    ok("the other member's keeper, told by the room, has it: whose it is by name, and not theirs", Q.notices().notices.length === 1 && up.by === "Tester A" && up.mine === false && up.left === 10 && up.price === 4, Q.notices().notices);
    did = await Q.noticeBuy(up.id, 4);
    ok("four bought: the things and the coins at once", did.ok && did.coins === 16 && did.item === "kangkong" && Q.purse().coins === 84 && slotOf(Q, "kangkong") >= 0 && Q.notices().notices[0]?.left === 6, [did, Q.purse().coins]);
    P.nudged("notices");
    await sleep(500);
    ok("the writer is told what waits: nine tenths of sixteen, in whole coins", P.notices().due === 14 && P.notices().mine[0]?.left === 6, P.notices());
    nudges = 0;
    did = await P.noticeCollect();
    ok("collected: fourteen coins, nothing more waiting, and the room is not told of what only its collector sees", did.ok && did.coins === 14 && P.purse().coins === 14 && P.notices().due === 0 && nudges === 0, [did, nudges]);
    did = await P.noticePost("want", "megaCatfish", 1, 5);
    ok("a thing nobody has met is refused as a thing that is not there", !did.ok && did.why === "none", did);
    did = await P.noticePost("want", "minnow", 3, 2);
    const want = did.ok ? did.id : -1;
    ok("three minnows wanted at two coins: six coins put down", did.ok && P.purse().coins === 8 && P.notices().mine.some((n) => n.id === want && n.kind === "want"), [did, P.purse().coins]);
    did = await Q.noticeFill(want, 3);
    ok("the other brings three: out of the bag, and five of the six coins wait for them", did.ok && did.coins === 6 && Q.purse().bag[slotOf(Q, "minnow")]?.n === 2 && Q.notices().due === 5, [did, Q.notices().due]);
    P.nudged("notices");
    await sleep(500);
    ok("the writer is told three wait", P.notices().mine.find((n) => n.id === want)?.held === 3, P.notices().mine);
    did = await P.noticeFetch(want);
    ok("…and takes them: the notice is done with, and gone", did.ok && did.got === 3 && slotOf(P, "minnow") >= 0 && !P.notices().mine.some((n) => n.id === want), [did, P.notices().mine]);
    did = await P.noticeDown(P.notices().mine[0]?.id ?? -1);
    ok("the first notice taken down: the six not sold are back in the bag", did.ok && did.things === 6 && did.coins === 0 && P.purse().bag[slotOf(P, "kangkong")]?.n === 16 && P.notices().mine.length === 0, [did, P.purse().bag]);
    did = await P.noticeSlot();
    ok("one more place is refused without the coins for it", !did.ok && did.why === "coins", did);
    did = await Q.noticeBuy(up.id, 1);
    ok("a notice that is gone is said so", !did.ok && did.why === "gone", did);
    stopP(); stopQ(); P.close(); Q.close();
  }

  if ((await sql(`select to_regprocedure('public.town_well()') is not null as there`))[0].there) {
    section("the well's book: carried, read, a rank, the yoke taken (v127)");
    const well = (await sql(`select town.cat('farming')->'wellAt' as at`))[0].at, AT_WELL = [well[0] + 1, well[1]], RIVER = [16, 38];
    await sql(`update public.town_things set doc = '0'::jsonb where key = 'well'`);
    await sql(`truncate public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach`);
    await purse(a, 0, [{ item: "bucket", n: 1 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bucket', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    const C = new DbKeeper(a, askAs("A")), D = new DbKeeper(b, askAs("B"));
    await settled(C); await settled(D);
    ok("at the beginning everybody's rank is asked for, and nobody has one", asked.includes("A town_well_ranks") && Object.keys(C.ranks()).length === 0 && C.wellBook() === null, C.ranks());
    let did = await C.choreDo("river", RIVER);
    did = await C.choreDo("well", AT_WELL);
    await settled(C);
    ok("a bucketful poured by somebody who never opened the book asks for none", did.ok && did.chore === "pour" && C.well() === 1 && C.wellBook() === null && !asked.includes("A town_well"), did);
    await C.wellLook();
    ok("looked at: one bucketful, mine, and I am today's carrier by my character's name", C.wellBook()?.buckets === 1 && C.wellBook().today.buckets === 1 && C.wellBook().carriers.length === 1 && C.wellBook().carriers[0].id === a && C.wellBook().carriers[0].name === "Tester A", C.wellBook());
    await sql(`update public.town_carriers set buckets = 49 where member_id = $1`, [a]);
    await C.choreDo("river", RIVER);
    did = await C.choreDo("well", AT_WELL);
    await settled(C); await settled(C);
    ok("the fiftieth poured: the book is read again by itself, the rank is mine at once, and something waits", did.ok && C.wellBook()?.buckets === 50 && C.wellBook().rank === 1 && C.wellBook().gift === true && C.ranks()[a] === 1, { book: C.wellBook(), ranks: C.ranks() });
    const told = await askAs("B")("town_well_ranks");
    ok("anybody who asks is told the rank", told?.ranks?.[a] === 1 && Object.keys(told.ranks).length === 1, told);
    await D.wellLook();
    ok("the other's book: nothing of their own, the same carrier today", D.wellBook()?.buckets === 0 && D.wellBook().gift === false && D.wellBook().carriers[0]?.id === a, D.wellBook());
    did = await D.wellTake();
    ok("the other has nothing waiting", !did.ok && did.why === "none", did);
    did = await C.wellTake();
    ok("taken: the yoke is in the bag, and the book says nothing waits", did.ok && did.gift === "waterYoke" && did.rank === 1 && slotOf(C, "waterYoke") >= 0 && C.wellBook().gift === false, did);
    did = await C.wellTake();
    ok("once", !did.ok && did.why === "none" && C.purse().bag.filter((s) => s?.item === "waterYoke").length === 1, did);
    await C.hold(slotOf(C, "waterYoke"));
    await C.choreDo("river", RIVER);
    ok("the yoke drawn holds two bucketfuls", C.purse().bag[slotOf(C, "waterYoke")]?.water === 2, C.purse().bag);
    did = await C.choreDo("well", AT_WELL);
    await settled(C); await settled(C);
    ok("…and poured, two more in the well and in the book", did.ok && C.well() === 4 && C.wellBook().buckets === 52, { well: C.well(), book: C.wellBook() });
    C.close(); D.close();
  }

  section("one thing at a time");
  await purse(a, 100, []);
  await settled(A);
  const many = await Promise.all([A.buy("worm", 1), A.buy("worm", 1), A.buy("worm", 1), A.buy("dough", 1)]);
  ok("four deeds asked at once are done in the order they were asked, each answer kept in turn", many.every((d) => d.ok) && A.purse().coins === 100 - 2 * 3 - 3 && A.purse().bag[0]?.item === "worm" && A.purse().bag[0].n === 3 && A.purse().bag[1]?.item === "dough",
    { coins: A.purse().coins, bag: A.purse().bag.filter(Boolean) });
  A.close(); B.close();
  const after = asked.length;
  await A.buy("worm", 1);
  ok("a keeper that is closed asks nothing more", asked.length === after);
} catch (e) {
  ok("the test ran", false, e.stack ?? e.message);
} finally {
  bench.kill();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
