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
const { BUGS, HAUNTS } = await import("@/lib/town/insects");
const { ridCameOf, see, roll, inPestHours, pestHour } = await import("@/lib/town/farm");

const PORT = 3198, BASE = `http://127.0.0.1:${PORT}`;
// (the drafts of the next migrations, kept out of supabase/ until each is proved, are tried with the rest, in their order)
const NEXT = ["v153"];
const LINES_PLAYED = ["fishing", "helpers", "insects", "kitchen"];
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
  ok(`looked at: today's order, the first day's shelf of ${first}, what his next hint costs`, A.order()?.wants?.length === 3 && A.shelf().length === first && A.hintPrice() === 15, { order: A.order(), shelf: A.shelf().length, hint: A.hintPrice() });
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
  ok("a hint bought: named, and paid for at the price said before", did.ok && typeof did.hint === "string" && A.purse().coins === 485 && (A.purse().hints ?? []).includes(did.hint) && A.hintPrice() === 15, did.ok ? { hint: did.hint, coins: A.purse().coins } : did);
  if ((await sql(`select to_regprocedure('town.next_hint(jsonb, jsonb, integer, double precision)') is not null as there`))[0].there) {
    // (v135: which hint is by chance, and the database's to say; the page knows only what it costs)
    await purse(a, 500, []);
    await purse(b, 500, []);
    await settled(A); await settled(B);
    const heard = { A: [], B: [] };
    for (let i = 0; i < 6; i++) { heard.A.push((await A.hint()).hint); heard.B.push((await B.hint()).hint); }
    ok("two who buy six each are each sold six different hints, kept in their purses as they came, fifteen coins each",
      new Set(heard.A).size === 6 && new Set(heard.B).size === 6 && heard.A.join() === (A.purse().hints ?? []).join() && heard.B.join() === (B.purse().hints ?? []).join() && A.purse().coins === 410 && B.purse().coins === 410, heard);
    ok("…and not the same six in the same order", heard.A.join() !== heard.B.join(), heard);
  }

  section("a meal");
  await purse(a, 0, [{ item: "riceBox", n: 4 }]);
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 0)) where member_id = $1`, [a]);
  await settled(A);
  did = await A.sitDown(0, false);
  ok("standing, a meal is refused: stand", !did.ok && did.why === "stand", did);
  did = await A.sitDown(0, true);
  ok("sitting: the meal begins, a helping leaves the bag", did.ok && did.dish === "riceBox" && A.purse().eating?.dish === "riceBox" && A.purse().bag[0].n === 3, A.purse().eating);
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
  // (since v146 a meal's hours take three helpings, each when one likes, and the keeper says so: a second and a third
  // are taken, and a fourth refused. Unless the hours turned while this ran, when the fourth is the next meal's first.)
  ok("the keeper says a meal's hours take three helpings, as this database counts", A.helpings() === 3, A.purse().meals);
  for (const which of ["second", "third"]) {
    did = await A.sitDown(0, true);
    ok(`the same meal's hours again: a ${which} helping is taken`, did.ok === true && !!A.purse().eating, did);
    await skip(301_000);
    await settled(A);
    await sleep(900);
    ok("…and eaten up by the clock", !A.purse().eating, A.purse().eating);
  }
  did = await A.sitDown(0, true);
  ok("a fourth in the same hours: meal", (!did.ok && did.why === "meal") || A.purse().meals.bowls.filter((n) => n > 0).length > 1, { did, meals: A.purse().meals });
  if (did.ok) { await skip(301_000); await settled(A); await sleep(900); }

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
  // (v118: a hoe may work in anybody's bed. It is written down as a go at farming and as no deed, and the lines of
  // work, where there are any, read it as help: v149)
  {
    const beside = `${nextTo[0]},${nextTo[1]}`;
    const helped = await B.farmDo(beside, "Tester B", { hits: 5, misses: 0, secs: 3, need: 5 });
    ok("a hoe clears the weeds of somebody else's bed", helped.ok && helped.deed === "clear", helped);
    if ((await sql(`select to_regclass('public.town_work') is not null as there`))[0].there) {
      const line = await sql(`select (kept->>'points')::float8 as p from public.town_work where member_id = $1 and line = 'helpers'`, [b]);
      ok("…and it is help, on the helper's own line: two points", line[0]?.p === 2, line);
    }
    await sql(`delete from public.town_plots where x = $1 and y = $2`, nextTo);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [b]);
    B.nudged("farm");
    await settled(B);
  }
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
    // (asked once as the keeper begins, so that the uncle can offer the board by name before his stall is opened)
    ok("the board is known from the keeper's beginning, before it is looked at: three places, nothing waiting", P.notices() !== null && P.notices().slots === 3 && P.notices().due === 0, P.notices());
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

  if ((await sql(`select to_regprocedure('public.town_thank(integer, integer)') is not null as there`))[0].there) {
    section("thanks at the picking, and the jar at the well (v129)");
    const well = (await sql(`select town.cat('farming')->'wellAt' as at`))[0].at, AT_WELL = [well[0] + 1, well[1]], RIVER = [16, 38];
    await sql(`update public.town_things set doc = '0'::jsonb where key = 'well'`);
    // (the deeds too: what was carried earlier in this test is work of this round, and would have its share of the jar)
    await sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_plot_help, public.town_thanks, public.town_jar, public.town_jar_owed`);
    const now = Number((await sql(`select town.now_ms() as n`))[0].n);
    // a plant of A's in a plot; B carries a bucketful, fills a can with it and waters A's plant
    await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (133, 5, town.bed_of(133, 5), 'tilled', $1::jsonb, 0) on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`,
      [JSON.stringify({ by: a, crop: "pumpkin", sown: now - 3600000, boost: 0, watered: 0, fed: 0, guard: now + 172800000, cured: 0, picked: 0, pickedAt: 0 })]);
    await purse(a, 20, [{ item: "kangkong", n: 3 }, { item: "hoe", n: 1 }]);
    await purse(b, 0, [{ item: "bucket", n: 1 }, { item: "can", n: 1 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bucket', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [b]);
    const E = new DbKeeper(a, askAs("A")), F = new DbKeeper(b, askAs("B"));
    await settled(E); await settled(F);
    await F.choreDo("river", RIVER);
    await F.choreDo("well", AT_WELL);
    await F.hold(slotOf(F, "can"));
    await F.choreDo("well", AT_WELL);
    let did = await F.farmDo("133,5", "Tester B");
    ok("a plant of the other's watered with water one carried oneself", did.ok && did.deed === "water", did);
    ok("before it is asked for, nobody is known to thank", Object.keys(E.toThank()).length === 0);
    await E.thankLook();
    ok("asked for: the plot, and the helper by name, who both watered and carried", E.toThank()["133,5"]?.length === 1 && E.toThank()["133,5"][0].id === b && E.toThank()["133,5"][0].name === "Tester B"
      && E.toThank()["133,5"][0].water === 1 && E.toThank()["133,5"][0].carry === 1, E.toThank());
    did = await E.thankAt("133,5");
    ok("thanked: the answer says who, and nobody is left to thank today", did.ok && did.thanked.length === 1 && did.thanked[0] === b && Object.keys(E.toThank()).length === 0, did);
    did = await E.thankAt("133,5");
    ok("once a day", !did.ok && did.why === "none", did);
    const told = await askAs("B")("town_well_ranks");
    ok("the one thanked is told so with everybody's rank", told?.thanked?.length === 1 && told.thanked[0].id === a && told.thanked[0].name === "Tester A", told);
    await F.wellLook();
    ok("their book has the board: one thanks today, and they are the week's most thanked", F.thanks()?.today.length === 1 && F.thanks().week === 1 && F.thanks().top[0]?.id === b && F.thanked()[0]?.id === a, F.thanks());
    ok("…and the jar, empty, with the moment it is next shared", F.jar()?.coins === 0 && F.jar().things.length === 0 && F.jar().next > now && F.jar().mine === null, F.jar());
    did = await E.jarDrop({ coins: 12 });
    ok("coins dropped into the jar: out of the purse, and the jar is told back", did.ok && E.purse().coins === 8 && E.jar()?.coins === 12, { did, jar: E.jar() });
    did = await E.jarDrop({ slot: slotOf(E, "kangkong"), n: 2 });
    ok("something grown dropped too", did.ok && E.purse().bag[slotOf(E, "kangkong")]?.n === 1 && E.jar().things.length === 1 && E.jar().things[0][0] === "kangkong" && E.jar().things[0][1] === 2, E.jar());
    did = await E.jarDrop({ slot: slotOf(E, "hoe"), n: 1 });
    ok("a tool is not taken", !did.ok && did.why === "unwanted", did);
    did = await F.jarTake();
    ok("nothing waits before the round turns", !did.ok && did.why === "nothing", did);
    await skip(12 * 3600000);
    await F.wellLook();
    ok("the round turned: the jar is shared as the book is opened, all of it to the one who worked", F.jar()?.coins === 0 && F.jar().mine?.coins === 12 && F.jar().mine.things[0]?.[1] === 2, F.jar());
    did = await F.jarTake();
    ok("taken: the coins and the things are in the purse, and nothing waits", did.ok && did.coins === 12 && F.purse().coins === 12 && F.purse().bag.some((s) => s?.item === "kangkong" && s.n === 2) && F.jar().mine === null, { did, jar: F.jar() });
    E.close(); F.close();
  }

  if ((await sql(`select to_regprocedure('town.rid_pick(jsonb, bigint, double precision)') is not null as there`))[0].there) {
    section("a ladybird takes a pest with it: the plot is cured on the page at once (v126)");
    // a moment two ladybirds are out, each at a haunt of its own (an insect is one member's): the clock put on a turn at a time until they are.
    // (From v138 a ladybird is seldom out, and from six: so the moment is also to be one at which a plant can have a pest on it,
    // between nine and five. A pest comes from eight and has killed its plant six hours on, so the early morning has none.)
    let haunt = null, other = null;
    for (let i = 0; i < 3000 && haunt === null; i++) {
      const out = await sql(`select i, town.hour_at(town.now_ms()) as hour from generate_series(0, jsonb_array_length(town.cat('insects')->'haunts') - 1) i where town.bug_at(i, town.now_ms())->>'bug' = 'ladybird' order by i limit 2`);
      if (out.length === 2 && out[0].hour >= 9 && out[0].hour < 17) { haunt = out[0].i; other = out[1].i; } else await skip(10 * 60000);
    }
    ok("(two ladybirds are out somewhere, to try it with)", haunt !== null);
    if (haunt !== null) {
      const HOUR = 3600000, now = Number((await sql(`select town.now_ms() as now`))[0].now);
      // a plant of B's with a pest on it now, on the farm's last plot: sown so many hours ago that one has come, found by looking
      let spare = null;
      for (let y = FARM.y + FARM.h - 1; y >= FARM.y && !spare; y--) for (let x = FARM.x + FARM.w - 1; x >= FARM.x; x--) if (plotAt(x, y)) { spare = [x, y]; break; }
      const pkey = `${spare[0]},${spare[1]}`;
      let sick = null;
      for (let h = 2; h <= 72 && !sick; h++) {
        const plant = { by: b, crop: "pumpkin", sown: now - h * HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
        if ((await sql(`select town.rid_pick(jsonb_build_object($1::text, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb)), town.now_ms(), 0) is not null as pest`, [pkey, JSON.stringify(plant)]))[0].pest) sick = plant;
      }
      ok("(a plant with a pest on it, to try it with)", !!sick);
      await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 1)
        on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 1`, [spare[0], spare[1], JSON.stringify(sick)]);
      const pests = (await sql(`select p.x::text || ',' || p.y::text as key from public.town_plots p where p.plant is not null
        and town.rid_pick(jsonb_build_object(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), town.now_ms(), 0) is not null`)).map((r) => r.key);
      const tileOf = async (id) => { const p = (await sql(`select town.cat('insects')->'haunts'->$1::int->3->0 as p`, [id]))[0].p; return [Math.floor(p[0]), Math.floor(p[1])]; };
      const tile = await tileOf(haunt), tile2 = await tileOf(other);
      const chance = (n) => sql(`update public.town_catalog set data = jsonb_set(data, '{bugs,ladybird,rids}', $1::jsonb) where key = 'insects'`, [String(n)]);
      for (const who of [a, b]) {
        await purse(who, 0, [{ item: "bugNet", n: 1 }]);
        await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [who]);
      }
      await settled(A); await settled(B);
      // never: the chance at nothing
      await chance(0);
      const heardB = [], wasA = A.onDeed, wasB = B.onDeed;
      B.onDeed = (what, to) => heardB.push([what, to]);
      let did = await B.netDo(other, tile2, { misses: 0 }, "Tester B");
      ok("with no chance: caught, no plot is named, and the farm is not said to have changed", did.ok && did.got[0][0] === "ladybird" && !did.rid && !heardB.some(([w]) => w === "farm") && B.purse().bag.some((x) => x?.item === "ladybird"), { did, heardB });
      // always: the chance certain
      await chance(1);
      const heardA = [], from = asked.length;
      const before = Object.fromEntries((await sql(`select x::text || ',' || y::text as key, plant from public.town_plots where plant is not null`)).map((r) => [r.key, r.plant]));
      A.onDeed = (what, to) => heardA.push([what, to]);
      did = await A.netDo(haunt, tile, { misses: 0 }, "Tester A");
      ok("with the chance certain: caught, and the keeper says which plot's pest went", did.ok && did.got[0][0] === "ladybird" && pests.includes(did.rid), { did, pests });
      if (did.ok && did.rid) {
        const mine = A.farm()[did.rid], [rx, ry] = did.rid.split(",").map(Number);
        const kept = (await sql(`select soil, plant from public.town_plots where x = $1::int and y = $2::int`, [rx, ry]))[0];
        ok("the plot is cured on the page at once, with the farm not asked for again, and the page is told the farm changed",
          !!mine?.plant && mine.plant.cured >= now && mine.plant.cured <= now + 60000 && !asked.slice(from).includes("A town_farm") && asked.slice(from).includes("A town_net") && heardA.some(([w]) => w === "farm"), { mine, asked: asked.slice(from), heardA });
        ok("and it is the plot as the database keeps it: cured, and nothing else of it touched", JSON.stringify(mine.plant) === JSON.stringify(kept.plant) && mine.soil === kept.soil && kept.plant.cured > 0
          && JSON.stringify({ ...kept.plant, cured: 0 }) === JSON.stringify({ ...before[did.rid], cured: 0 }), { mine, kept, before: before[did.rid] });
      }
      await chance(0.1);
      A.onDeed = wasA; B.onDeed = wasB;
    }
  }

  if ((await sql(`select to_regclass('public.town_comebacks') is not null as there`))[0].there) {
    section("an insect caught is gone from the other page too, and one comes back elsewhere (v131)");
    // (the wait before one comes back made two seconds here, so that the pages' own asking again is seen)
    await sql(`update public.town_catalog set data = jsonb_set(data, '{comeback,after}', '2') where key = 'insects'`);
    await sql(`delete from public.town_comebacks`);
    // (and nothing caught so far counts against any kind: from v139 a kind that has been caught comes back a little
    // less often, and here one is to come back for certain)
    await sql(`delete from public.town_deeds where what = 'net'`);
    for (const who of [a, b]) {
      await purse(who, 0, [{ item: "bugNet", n: 1 }]);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [who]);
    }
    await settled(A); await settled(B);
    // a moment an insect one alone can catch is out on the farm: the clock put on a turn at a time until one is
    let sight = null;
    const stopA = A.look("bugs"), stopB = B.look("bugs");
    for (let i = 0; i < 200 && !sight; i++) {
      A.nudged("bugs"); B.nudged("bugs");
      await sleep(350);
      sight = A.bugs().find((s) => HAUNTS[s.id]?.place === "farm" && BUGS[s.bug].habit !== "lure") ?? null;
      if (!sight) await skip(10 * 60000);
    }
    ok("(an insect is out on the farm, to try it with)", !!sight);
    if (sight) {
      const tile = [Math.floor(HAUNTS[sight.id].perches[0].x), Math.floor(HAUNTS[sight.id].perches[0].y)];
      ok("both pages are told the same insect at the same haunt", B.bugs().some((s) => s.id === sight.id && s.bug === sight.bug && s.turn === sight.turn), B.bugs().length);
      // what the room does with the word that the insects changed (Town.tsx passes it to every page's keeper): done here by hand
      const wasA = A.onDeed, wasB = B.onDeed, said = [];
      A.onDeed = (what) => { said.push(what); if (what === "bugs") B.nudged("bugs"); };
      let from = asked.length;
      const did = await A.netDo(sight.id, tile, { misses: 0 }, "Tester A");
      ok("caught: gone from the catcher's page at once, and the room is told the insects changed", did.ok && did.got[0][0] === sight.bug && !A.bugs().some((s) => s.id === sight.id) && said.includes("bugs"), { did, said });
      await sleep(600);
      ok("the other page asks again on that word, and has it no more", asked.slice(from).includes("B town_bugs") && !B.bugs().some((s) => s.id === sight.id), asked.slice(from));
      const late = await B.netDo(sight.id, tile, { misses: 0 }, "Tester B");
      ok("a swing at where it was, from the other page, is answered that it is gone", late.ok === false && late.why === "bare", late);
      const back = (await sql(`select haunt, bug from public.town_comebacks order by at desc limit 1`))[0];
      ok("one is to come back, at another haunt of the farm, and neither page has it yet", !!back && back.haunt !== sight.id && HAUNTS[back.haunt].place === "farm"
        && !A.bugs().some((s) => s.id === back.haunt) && !B.bugs().some((s) => s.id === back.haunt), back);
      from = asked.length;
      await sleep(3600);
      ok("when its moment comes both pages ask again by themselves", asked.slice(from).includes("A town_bugs") && asked.slice(from).includes("B town_bugs"), asked.slice(from));
      ok("and both have the one that came back: the same insect at the same haunt", !!back && A.bugs().some((s) => s.id === back.haunt && s.bug === back.bug) && B.bugs().some((s) => s.id === back.haunt && s.bug === back.bug),
        { back, a: A.bugs().map((s) => s.id), b: B.bugs().map((s) => s.id) });
      A.onDeed = wasA; B.onDeed = wasB;
    }
    stopA(); stopB();
    await sql(`update public.town_catalog set data = jsonb_set(data, '{comeback,after}', '30') where key = 'insects'`);
  }

  if ((await sql(`select to_regprocedure('town.plenty(text, bigint, jsonb)') is not null as there`))[0].there) {
    section("hunted, a kind is gone from the page's map by its haunts' next turns, and back a day on (v139)");
    await sql(`delete from public.town_deeds where what = 'net'`);
    await sql(`delete from public.town_takes where what = 'haunt'; delete from public.town_comebacks`);
    const stopA = A.look("bugs");
    const looked = async () => { A.nudged("bugs"); await sleep(400); return A.bugs(); };
    // a moment a dozen insects are out: the clock put on a turn at a time until they are
    let first = await looked();
    for (let i = 0; i < 200 && first.length < 12; i++) { await skip(10 * 60000); first = await looked(); }
    ok("(a dozen insects are out, to try it with)", first.length >= 12, first.length);
    const kinds = [...new Set(first.map((s) => s.bug))];
    // every kind that is out, caught beyond counting at this moment
    await sql(`insert into public.town_deeds (member_id, at, what, thing, n) select $1, to_timestamp(town.now_ms() / 1000.0), 'net', k, 1000000 from unnest($2::text[]) k`, [a, kinds]);
    const during = await looked();
    ok("caught this moment, they are on the page still: a turn is as it began", first.every((s) => during.some((x) => x.id === s.id && x.bug === s.bug && x.turn === s.turn)), { first: first.length, during: during.length });
    await skip(61 * 60000);
    const hourOn = await looked();
    ok("an hour on, the page has none of those kinds", !hourOn.some((s) => kinds.includes(s.bug)), hourOn.filter((s) => kinds.includes(s.bug)).slice(0, 4));
    await skip(24 * 60 * 60000);
    let back = await looked();
    for (let i = 0; i < 12 && !back.some((s) => kinds.includes(s.bug)); i++) { await skip(60 * 60000); back = await looked(); }
    ok("a day on, they are on the page again", back.some((s) => kinds.includes(s.bug)), back.length);
    stopA();
    await sql(`delete from public.town_deeds where what = 'net' and n = 1000000`);
  }

  // (v140 makes no new function: it is known by what the rule of putting a thing on a plant says. Nor does v145: it is
  // known by the farm's row saying which insects eat pests. The page's own rule is v145's either way: this page with a
  // database that has not had the file offers the insect, and is told the plot is not ready for it.)
  if ((await sql(`select position('pest' in pg_get_functiondef('town.feed(text, jsonb, jsonb, text, bigint)'::regprocedure)) > 0 as there`))[0].there) {
    const v145 = (await sql(`select town.cat('farming')->'rids' is not null as there`))[0].there;
    section(v145 ? "an insect that eats pests, and a cure that keeps them off: what the page offers for a plant with a pest, and what comes of it (v145)"
      : "a cover is not a cure (v140): this page, against a database that has not had v145");
    const HOUR = 3600000;
    let spare = null;
    for (let y = FARM.y + FARM.h - 1; y >= FARM.y && !spare; y--) for (let x = FARM.x + FARM.w - 1; x >= FARM.x; x--) if (plotAt(x, y)) { spare = [x - 1, y]; break; }
    const pkey = `${spare[0]},${spare[1]}`;
    // a pumpkin with a pest on it now: sown so many hours ago that one has come, found by looking; the clock put on an hour at a time until there is one
    // (and with two hours of the pest to go at the least: what follows takes a moment, and a plant dead of its pest takes nothing)
    let sick = null, now = 0;
    for (let i = 0; i < 48 && !sick; i++) {
      now = Number((await sql(`select town.now_ms() as now`))[0].now);
      for (let h = 2; h <= 72 && !sick; h++) {
        const plant = { by: b, crop: "pumpkin", sown: now - h * HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
        const seen = (await sql(`select (town.see($1::text, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb), town.now_ms())->>'pest')::boolean as pest,
          (town.see($1::text, jsonb_build_object('soil', 'tilled', 'plant', $2::jsonb), town.now_ms() + 7200000)->>'pest')::boolean as still`, [pkey, JSON.stringify(plant)]))[0];
        if (seen.pest && seen.still) sick = plant;
      }
      if (!sick) await skip(HOUR);
    }
    ok("(a plant with a pest on it, to try it with)", !!sick);
    if (sick) {
      const plant = () => sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, town.now_ms())
        on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = excluded.changed`, [spare[0], spare[1], JSON.stringify(sick)]);
      const fresh = (hand) => sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a, hand]);
      await plant();
      await purse(a, 0, [{ item: "ladybird", n: 40 }, { item: "pestCure", n: 2 }, { item: "mantis", n: 1 }, { item: "lavenderSachet", n: 1 }]);
      await fresh("ladybird");
      await settled(A);
      const stop = A.look("farm");
      A.nudged("farm");
      await sleep(500);
      const held = (item) => A.purse().bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
      const pestNow = () => see(pkey, A.farm()[pkey], A.now(), A.rains()).pest;
      ok("the page has the plant with its pest, and offers to let the ladybird in the hand go on it", !!A.farm()[pkey]?.plant && pestNow() && A.deedAt(pkey) === "feed" && held("ladybird") === 40, { deed: A.deedAt(pkey), plot: A.farm()[pkey] });
      // a sachet is no such thing: the page offers nothing for it, and asked all the same the database refuses it
      await A.hold(A.purse().bag.findIndex((s) => s?.item === "lavenderSachet"));
      let did = await A.farmDo(pkey, "Tester A");
      ok("a sachet is not offered for it; asked all the same, the database answers that the plot is not ready, and the sachet is in the bag still", A.deedAt(pkey) === null && !did.ok && did.why === "soil" && held("lavenderSachet") === 1, did);
      await A.hold(A.purse().bag.findIndex((s) => s?.item === "ladybird"));
      if (!v145) {
        did = await A.farmDo(pkey, "Tester A");
        ok("a database that has not had v145 answers that the plot is not ready for the ladybird: it is in the bag still, and the pest on the plant", !did.ok && did.why === "soil" && held("ladybird") === 40 && A.farm()[pkey]?.plant?.cured === 0 && pestNow(), did);
      } else {
        // let go one after another, each at its own moment, until one eats the pest: every one is gone from the bag, and
        // what came of each is read from the plot as the page kept it before and keeps it after
        let off = 0, ate = false, wrong = null;
        for (let i = 0; i < 40 && !ate && !wrong; i++) {
          const stood = A.farm()[pkey], then = A.now(), had = held("ladybird");
          did = await A.farmDo(pkey, "Tester A");
          const came = ridCameOf(pkey, stood, A.farm()[pkey], "ladybird", then, A.rains());
          if (!did.ok || did.deed !== "feed" || held("ladybird") !== had - 1 || came === null) wrong = { did, came, held: held("ladybird") };
          else if (came) ate = true;
          else { off++; if (JSON.stringify(A.farm()[pkey]) !== JSON.stringify(stood) || !pestNow()) wrong = { off: A.farm()[pkey], stood }; await sleep(3); }
        }
        ok("ladybirds let go on it one after another: each is gone from the bag; one that is off leaves the plot as it was on the page, pest and all", !wrong, wrong);
        ok("…until one eats the pest: by the plot as the page now keeps it, the plant was rid of it at that moment, has no pest, and is covered by nothing", ate && A.farm()[pkey]?.plant?.cured > 0 && A.farm()[pkey].plant.guard === 0 && !pestNow(), { off, plot: A.farm()[pkey] });
        console.log(`    (${off} off before the one that ate it)`);
        const lines = await sql(`select doc->'rid' as rid from public.town_deeds where member_id = $1 and what = 'feed' and doc->>'with' = 'ladybird' and doc ? 'rid' order by id desc limit $2`, [a, off + 1]);
        ok("each is written down with what came of it: the last eaten, the others off", lines.length === off + 1 && lines[0].rid === true && lines.slice(1).every((l) => l.rid === false), lines);
        ok("the plant has no pest now, so the page offers the ladybird as a cover", A.deedAt(pkey) === "feed");
        // the plant with its pest again, for the cure
        await plant();
        A.nudged("farm");
        await sleep(500);
      }
      await A.hold(A.purse().bag.findIndex((s) => s?.item === "pestCure"));
      ok("with the cure in the hand the page offers the curing", A.deedAt(pkey) === "cure", A.deedAt(pkey));
      did = await A.farmDo(pkey, "Tester A");
      ok("…and it is done: the pest is off, by the plot as the page now keeps it", did.ok && did.deed === "cure" && held("pestCure") === 1 && A.farm()[pkey]?.plant?.cured > 0 && !pestNow(), did);
      await A.hold(A.purse().bag.findIndex((s) => s?.item === "mantis"));
      if (v145) {
        ok("the cure keeps pests off the plant for a day from then, by the plot as the page keeps it", A.farm()[pkey]?.plant?.guard > A.now() + 23 * HOUR && A.farm()[pkey].plant.guard <= A.now() + 24 * HOUR, A.farm()[pkey]?.plant);
        ok("…so the page offers no cover for it: it is covered", A.deedAt(pkey) === null && !(await A.farmDo(pkey, "Tester A")).ok && held("mantis") === 1, A.deedAt(pkey));
      } else {
        ok("now the page offers the mantis: the plant has no pest, and that database's cure covers nothing", A.deedAt(pkey) === "feed" && A.farm()[pkey]?.plant?.guard === 0, A.deedAt(pkey));
        did = await A.farmDo(pkey, "Tester A");
        ok("…and it goes on: covered for a day, the mantis gone", did.ok && did.deed === "feed" && held("mantis") === 0 && A.farm()[pkey]?.plant?.guard > A.now() + 23 * HOUR, did);
      }
      stop();
    }
  }

  // (v147: the farm's hours. A database that has not had the file keeps none and tells none; the page's pests are then as they were.)
  {
    const v147 = (await sql(`select to_regclass('public.town_swarms') is not null as there`))[0].there;
    section(v147 ? "the farm's hour is counted by the first look at it, and the page works the pests out by what it is told (v147)"
      : "the farm's hours (v147): this page, against a database that has not had the file");
    const HOUR = 3600000;
    // (an hour of the pests', a little way in: the clock is put on until it is one)
    let now = Number((await sql(`select town.now_ms() as now`))[0].now);
    for (let i = 0; i < 30 && !(inPestHours(now) && now % HOUR > 10 * 60000 && now % HOUR < 45 * 60000); i++) { await skip(inPestHours(now) ? 20 * 60000 : HOUR); now = Number((await sql(`select town.now_ms() as now`))[0].now); }
    ok("(the clock is in an hour of the pests')", inPestHours(now));
    const h = pestHour(now);
    if (v147) await sql(`delete from public.town_swarms where true`);
    await sql(`truncate public.town_plots, public.town_beds`);
    // a pumpkin sown half an hour before this hour began, in a plot whose roll for the hour is between four and five in a hundred: found by looking
    const sown = h * HOUR - 30 * 60000, plant = { by: b, crop: "pumpkin", sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    let key = null;
    for (let y = FARM.y; y < FARM.y + FARM.h && !key; y++) for (let x = FARM.x; x < FARM.x + FARM.w && !key; x++) {
      if (!plotAt(x, y)) continue;
      const r = roll(`${x},${y}`, h, sown);
      if (r >= 0.04 && r < 0.05) key = [x, y];
    }
    ok("(a plot whose roll for this hour falls between four and five in a hundred)", !!key, key);
    const pkey = `${key[0]},${key[1]}`;
    await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, town.now_ms())`, [key[0], key[1], JSON.stringify(plant)]);
    await purse(a, 0, [{ item: "pestCure", n: 1 }]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'pestCure', 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    const K = new DbKeeper(a, askAs("A"));
    await settled(K);
    const stop = K.look("farm");
    await sleep(700);
    const pestNow = () => see(pkey, K.farm()[pkey], K.now(), K.rains()).pest;
    if (!v147) {
      ok("a database that has not had v147 tells no hours: the page has none, and the plant no pest", !!K.farm()[pkey]?.plant && JSON.stringify(K.rains().swarms) === "{}" && !pestNow() && K.deedAt(pkey) === null, K.rains().swarms);
    } else {
      const rows = await sql(`select hour, bugs, noted from public.town_swarms order by hour`);
      ok("the keeper's look at the farm counted this hour, once, by the database's clock", rows.length === 1 && Number(rows[0].hour) === h && Number(rows[0].bugs) >= 0 && Math.abs(Number(rows[0].noted) - now) < 60000, rows);
      const counted = Number(rows[0]?.bugs ?? 0);
      ok("…and the page was told it, if the farm had any insect: an hour with none is not told", JSON.stringify(K.rains().swarms) === JSON.stringify(counted > 0 ? { [h]: counted } : {}), { told: K.rains().swarms, counted });
      K.nudged("farm");
      await sleep(600);
      ok("another look counts nothing again", (await sql(`select count(*)::int as n from public.town_swarms`))[0].n === 1);
      // the hour as if it had been counted with many (and counted just now, so that the page is told of it)
      await sql(`update public.town_swarms set bugs = 6, noted = town.now_ms() where hour = $1`, [h]);
      ok("(told nothing yet, the page works the plant out by what it has)", pestNow() === (counted >= 4));
      K.nudged("farm");
      await sleep(600);
      ok("told the hour had many insects, the page has it and sees the pest on the plant: its roll is under five in a hundred", K.rains().swarms[h] === 6 && pestNow() === true, K.rains().swarms);
      ok("…and offers the cure in the hand for it", K.deedAt(pkey) === "cure", K.deedAt(pkey));
      const did = await K.farmDo(pkey, "Tester A");
      ok("…which the database takes: it works the pest out by the same hour", did.ok && did.deed === "cure" && K.farm()[pkey]?.plant?.cured > 0 && !pestNow(), did);
      // the same plant in an hour with none: no pest, for the page and for the database alike
      await sql(`update public.town_plots set plant = $3::jsonb, changed = town.now_ms() where x = $1 and y = $2`, [key[0], key[1], JSON.stringify(plant)]);
      await sql(`update public.town_swarms set bugs = 0, noted = town.now_ms() where hour = $1`, [h]);
      await purse(a, 0, [{ item: "pestCure", n: 1 }]);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'pestCure') where member_id = $1`, [a]);
      const L = new DbKeeper(a, askAs("A"));
      await settled(L);
      const halt = L.look("farm");
      await sleep(700);
      const again = await L.farmDo(pkey, "Tester A");
      ok("a page that comes with the hour counted with none is told no hour, sees no pest, and the database agrees: a cure does nothing there", JSON.stringify(L.rains().swarms) === "{}" && !see(pkey, L.farm()[pkey], L.now(), L.rains()).pest && L.deedAt(pkey) === null && !again.ok && again.why === "soil", { swarms: L.rains().swarms, again });
      halt(); L.close();
    }
    stop(); K.close();
    await sql(`truncate public.town_plots, public.town_beds`);
  }

  if ((await sql(`select to_regprocedure('public.town_ditch(integer, integer)') is not null as there`))[0].there) {
    section("a bucket over a bed, the yard's jar, and a hot afternoon (v130)");
    const RIVER = [16, 38], JAR_AT = (await sql(`select town.cat('yard')->'at'->0 as at`))[0].at, SOUP = [["pumpkin", 1], ["scallion", 1], ["salt", 1]];
    await sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach`);
    await sql(`update public.town_things set doc = '0'::jsonb where key = 'yard'; delete from public.town_weather; truncate public.town_plots, public.town_beds`);
    const plantAt = async (x, y, by) => { const now = Number((await sql(`select town.now_ms() as n`))[0].n); await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)`,
      [x, y, JSON.stringify({ by, crop: "pumpkin", sown: now - 3600000, boost: 0, watered: 0, fed: 0, guard: now + 4 * 86400000, cured: 0, picked: 0, pickedAt: 0 })]); };
    for (const x of [132, 133, 134]) await plantAt(x, 5, a);
    const fresh = (id, hand) => sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [id, hand]);
    await purse(a, 0, [{ item: "pot", n: 1 }, { item: "pumpkin", n: 2 }, { item: "scallion", n: 2 }, { item: "salt", n: 2 }]);
    await fresh(a, "pot");
    await purse(b, 0, [{ item: "bucket", n: 1 }, { item: "can", n: 1, water: 8 }]);
    await fresh(b, "bucket");
    const began = asked.length, G = new DbKeeper(a, askAs("A")), H = new DbKeeper(b, askAs("B"));
    await settled(G); await settled(H);
    const stopG = G.look("farm"), stopH = H.look("farm");
    await sleep(600);
    ok("the yard's jar is known from the keeper's beginning, told with everybody's rank: empty", G.yardJar() === 0 && H.yardJar() === 0 && !asked.slice(began).includes("B town_yard"), [G.yardJar(), H.yardJar()]);
    ok("an empty bucket would water nothing, and has nothing for the jar", H.ditchAt("133,5").length === 0 && H.yardCanPour() === false);
    await H.choreDo("river", RIVER);
    ok("a full one would water the bed's three plants, the nearest first", H.ditchAt("133,5").join(" ") === "133,5 132,5 134,5", H.ditchAt("133,5"));
    let did = await H.ditchDo("133,5");
    ok("poured over the bed: a bucketful, three plants, and the plots are kept as the answer has them", did.ok && did.used === 1 && did.watered.length === 3 && H.farm()["132,5"].plant.watered > 0 && H.farm()["134,5"].plant.boost === 1800000
      && !H.purse().bag[slotOf(H, "bucket")].water && H.ditchAt("133,5").length === 0, did);
    await G.thankLook();
    ok("the bed's owner has the pourer to thank, for each of the three", Object.keys(G.toThank()).length === 3 && Object.values(G.toThank()).every((list) => list.length === 1 && list[0].id === b && list[0].water === 1 && list[0].carry === 1), G.toThank());
    await H.wellLook();
    ok("the pourer's book: a bucketful carried, their water on three plants of one other's, by their own hand", H.wellBook()?.buckets === 1 && H.wellBook().today.waterings === 3 && H.wellBook().today.watered === 3 && H.wellBook().today.people === 1 && H.wellBook().today.pots === undefined, H.wellBook()?.today);
    // the yard's jar
    await H.choreDo("river", RIVER);
    did = await H.yardPour(null);
    ok("with nowhere said to stand, nothing is poured", !did.ok && did.why === "none" && H.yardCanPour() === true, did);
    did = await H.yardPour(JAR_AT);
    ok("poured into the jar by it: a bucketful in, and the keeper has the jar as the answer says", did.ok && did.poured === 1 && H.yardJar() === 1 && H.yardCanPour() === false, did);
    await settled(H); await settled(H);
    ok("…and the book counts it among what was carried", H.wellBook()?.buckets === 2 && H.wellBook().today.buckets === 2, H.wellBook()?.today);
    did = await G.cookDo(SOUP, ["pot"], [], { hits: 4, misses: 0, secs: 5 }, "Tester A");
    ok("a soup cooked while the jar has water: the keeper says it took the jar's water, and the pot has a helping more than the rule says", did.ok && did.made === "pumpkinSoup" && did.n === 5 && did.fresh === true
      && G.purse().bag.find((s) => s?.item === "potFull")?.of.left === 6, did);
    await H.wellLook();
    ok("the carrier's book says whose pot their water went into", H.wellBook().today.pots === 1 && H.wellBook().today.cooks === 1, H.wellBook().today);
    await G.hold(slotOf(G, "pot"));
    did = await G.cookDo(SOUP, ["pot"], [], { hits: 4, misses: 0, secs: 5 }, "Tester A");
    ok("with the jar empty a soup is cooked as it always was, and the keeper says nothing of water", did.ok && did.n === 5 && !did.fresh && G.purse().bag.filter((s) => s?.item === "potFull").map((s) => s.of.left).sort().join() === "5,6", did);
    const jar = await askAs("A")("town_yard");
    ok("the jar is told to whoever asks: empty again", jar?.yard?.jar === 0, jar);
    // a hot afternoon: one o'clock in Bangkok, a clear sky in the database and over this page
    const now = Number((await sql(`select town.now_ms() as n`))[0].n), hour = (((now + 7 * 3600000) % 86400000) + 86400000) % 86400000 / 3600000;
    await skip(Math.round((((13.1 - hour) % 24 + 24) % 24) * 3600000));
    await sql(`delete from public.town_weather; insert into public.town_weather (slot, sky, wind, gust, rain) values (floor(town.now_ms()::numeric / 900000)::bigint, 'clear', 5, 10, 0)`);
    const { SKIES } = await import("@/lib/town/skies");
    SKIES.force({ sky: "clear", wind: 5, gust: 10, rain: 0 });
    await plantAt(136, 5, a);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [b]);
    await H.hold(slotOf(H, "can"));
    await sleep(300);
    const before = asked.filter((x) => x === "B town_farm").length;
    did = await H.farmDo("136,5", "Tester B");
    await settled(H); await settled(H);
    ok("a watering in the heat: the keeper knows it is hot, reads the farm again, and has the plot as it is kept, with as much again", did.ok && did.deed === "water" && H.hot() === true
      && asked.filter((x) => x === "B town_farm").length === before + 1 && H.farm()["136,5"].plant.boost === 3600000, { hot: H.hot(), boost: H.farm()["136,5"]?.plant?.boost });
    // the cart: three rows of v130's catalog, and nothing the keeper has to know of
    await sql(`insert into public.town_carriers (member_id, buckets, taken) values ($1, 200, '{1}') on conflict (member_id) do update set buckets = 200, taken = '{1}'`, [b]);
    await H.wellLook();
    ok("the second rank has something waiting for whoever has the yoke", H.wellBook()?.rank === 2 && H.wellBook().gift === true, H.wellBook());
    did = await H.wellTake();
    ok("…a cart, which the keeper has in the bag at once", did.ok && did.gift === "waterCart" && did.rank === 2 && slotOf(H, "waterCart") >= 0 && H.wellBook().gift === false, did);
    await H.hold(slotOf(H, "waterCart"));
    did = await H.choreDo("river", RIVER);
    ok("…and it draws six bucketfuls at the river", did.ok && did.chore === "draw" && H.purse().bag[slotOf(H, "waterCart")]?.water === 6, { did, bag: H.purse().bag });
    stopG(); stopH(); G.close(); H.close();
  }

  if ((await sql(`select to_regprocedure('public.town_pass(uuid)') is not null as there`))[0].there) {
    section("a bucket line: water handed from one to the next, and counted for each (v132)");
    const well = (await sql(`select town.cat('farming')->'wellAt' as at`))[0].at, AT_WELL = [well[0] + 1, well[1]], RIVER = [16, 38];
    const c = await member("C", "Tester C");
    await sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach, public.town_line_water`);
    await sql(`update public.town_things set doc = '0'::jsonb where key = 'well'`);
    const holding = async (id, item) => {
      await purse(id, 0, [{ item, n: 1 }]);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [id, item]);
    };
    await holding(a, "bucket"); await holding(b, "bucket"); await holding(c, "bucketIron");
    const I = new DbKeeper(a, askAs("A")), J = new DbKeeper(b, askAs("B")), K = new DbKeeper(c, askAs("C"));
    await settled(I); await settled(J); await settled(K);
    const told = [];
    I.onDeed = (what, to) => { told.push(`${what} ${to}`); };
    ok("an empty bucket is not offered to be handed on, though the database has told of a line", I.canPass() === false && (await askAs("A")("town_well_ranks"))?.line === true);
    await I.choreDo("river", RIVER);
    ok("a bucket with water is", I.canPass() === true && J.canPass() === false);
    let did = await I.passTo(b);
    ok("handed on: the answer says how much went, my bucket is empty, and whoever took it is to be told through the room", did.ok && did.n === 1 && I.canPass() === false && told.join() === `line ${b}`, { did, told });
    ok("the taker's keeper knows nothing of it yet", J.canPass() === false);
    // (the room's word, as the map would hand it on)
    J.nudged("line");
    await settled(J);
    ok("told through the room, it reads its purse again and has the water", J.canPass() === true && J.purse().bag[slotOf(J, "bucket")].water === 1, J.purse().bag);
    did = await J.passTo(c);
    K.nudged("line");
    await settled(K);
    ok("handed on again, into an iron bucket", did.ok && did.n === 1 && K.purse().bag[slotOf(K, "bucketIron")].water === 1, did);
    did = await K.choreDo("well", AT_WELL);
    await K.wellLook();
    ok("poured by the third: the book lists all three among today's carriers, a bucketful each", did.ok && did.chore === "pour" && K.well() === 1 && K.wellBook()?.carriers.length === 3
      && K.wellBook().carriers.every((p) => p.buckets === 1) && [a, b, c].every((id) => K.wellBook().carriers.some((p) => p.id === id)), K.wellBook()?.carriers);
    await I.wellLook();
    ok("the first, who never left the river, has a bucketful towards their rank", I.wellBook()?.buckets === 1 && I.wellBook().today.buckets === 1, I.wellBook());
    did = await I.passTo(b);
    ok("with nothing in the bucket there is nothing to hand on", !did.ok && did.why === "hand", did);
    await I.choreDo("river", RIVER);
    did = await I.passTo(c);
    ok("handed straight to the third, whose bucket is empty again: the database asks nobody where they stand", did.ok && did.n === 1, did);
    await I.choreDo("river", RIVER);
    did = await I.passTo(c);
    ok("into a bucket that has water nothing goes", !did.ok && did.why === "full" && I.canPass() === true, did);
    I.close(); J.close(); K.close();
  }

  if ((await sql(`select to_regprocedure('town.water_kind(bigint)') is not null as there`))[0].there) {
    section("waters that differ: the dew drawn, poured into the well, and a watering under it (v133)");
    const well = (await sql(`select town.cat('farming')->'wellAt' as at`))[0].at, AT_WELL = [well[0] + 1, well[1]], RIVER = [16, 38];
    await sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach, public.town_line_water`);
    await sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; update public.town_things set doc = 'null'::jsonb where key = 'well_water'; delete from public.town_weather; truncate public.town_plots, public.town_beds`);
    // six in the morning in Bangkok, a dry sky in the database and over this page
    const now0 = Number((await sql(`select town.now_ms() as n`))[0].n), hour = (((now0 + 7 * 3600000) % 86400000) + 86400000) % 86400000 / 3600000;
    await skip(Math.round((((6.1 - hour) % 24 + 24) % 24) * 3600000));
    const { SKIES } = await import("@/lib/town/skies");
    SKIES.force({ sky: "cloudy", wind: 5, gust: 10, rain: 0 });
    const now = Number((await sql(`select town.now_ms() as n`))[0].n);
    await sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (133, 5, town.bed_of(133, 5), 'tilled', $1::jsonb, 0)`,
      [JSON.stringify({ by: a, crop: "pumpkin", sown: now - 3600000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 })]);
    const fresh = (id, hand) => sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [id, hand]);
    await purse(a, 0, [{ item: "bucket", n: 1 }]);
    await fresh(a, "bucket");
    await purse(b, 0, [{ item: "can", n: 1, water: 8 }]);
    await fresh(b, "can");
    const M = new DbKeeper(a, askAs("A")), N = new DbKeeper(b, askAs("B"));
    await settled(M); await settled(N);
    const stopN = N.look("farm");
    await sleep(500);
    ok("the well's water is plain, and both keepers know that waters differ", M.wellWater() === null && N.wellWater() === null && M.drawnNow() === "dawn", { drawn: M.drawnNow() });
    await M.choreDo("river", RIVER);
    let did = await M.choreDo("well", AT_WELL);
    await settled(M); await settled(M);
    ok("dew drawn at six and poured into the well: the pourer's keeper asks what the well's water is, and has it: the dew's, half an hour, its own doing", did.ok && did.chore === "pour"
      && M.wellWater()?.kind === "dawn" && M.wellWater().by === a && Math.abs(M.wellWater().until - M.now() - 30 * 60000) < 20000, M.wellWater());
    ok("the other's keeper knows nothing of it yet", N.wellWater() === null);
    // (the room's word, as the map would hand it on)
    N.nudged("farm");
    await settled(N); await settled(N);
    ok("told through the room that something was done on the farm, it asks, and has it", N.wellWater()?.kind === "dawn" && N.wellWater().by === a, N.wellWater());
    await N.wellLook();
    ok("the book says what the well's water is and whose doing, by name", N.wellBook()?.water?.kind === "dawn" && N.wellBook().water.name === "Tester A" && N.wellBook().water.until === N.wellWater().until, N.wellBook()?.water);
    const before = asked.filter((x) => x === "B town_farm").length;
    did = await N.farmDo("133,5", "Tester B");
    await settled(N); await settled(N);
    ok("a watering while the well has the dew's nature: the keeper reads the farm again, and has the plot as it is kept, with as much again", did.ok && did.deed === "water"
      && asked.filter((x) => x === "B town_farm").length === before + 1 && N.farm()["133,5"].plant.boost === 3600000, N.farm()["133,5"]?.plant);
    await skip(31 * 60000);
    // (any answer puts a keeper's clock right)
    await settled(M); await settled(N);
    ok("half an hour on, by the keepers' own clocks, the well's water is plain again", M.wellWater() === null && N.wellWater() === null);
    stopN(); M.close(); N.close();
  }

  if ((await sql(`select to_regprocedure('public.town_box()') is not null as there`))[0].there) {
    section("the storage box: read as the game begins, mine alone, things put away and taken out (v134)");
    await sql(`delete from public.town_boxes`);
    await purse(a, 5, [{ item: "minnow", n: 9 }, { item: "can", n: 1, water: 4 }]);
    await purse(b, 0, []);
    const from = asked.length;
    const M = new DbKeeper(a, askAs("A")), N = new DbKeeper(b, askAs("B"));
    await settled(M); await settled(N);
    await sleep(300);
    ok("asked for once as the game begins: ten empty slots, known before the chest is walked up to", asked.slice(from).filter((x) => x === "A town_box").length === 1
      && M.box()?.things.length === 10 && M.box().things.every((s) => s === null) && M.box().more === 0, M.box());
    let did = await M.boxPut(slotOf(M, "minnow"), 5, [35, 35]);
    ok("five minnows put away from beside the chest: the keeper has my purse and my box as they now stand, at once", did.ok && did.item === "minnow" && did.n === 5
      && M.purse().bag[0].n === 4 && M.box().things[0]?.item === "minnow" && M.box().things[0].n === 5, { did, box: M.box() });
    ok("…asked with the slot, how many, and the tile stood on", JSON.stringify(sent.filter((x) => x.fn === "town_box_put").at(-1)?.args) === JSON.stringify({ p_slot: 0, p_n: 5, p_x: 35, p_y: 35 }), sent.at(-1));
    did = await M.boxPut(slotOf(M, "can"), 1, [35, 35]);
    ok("a can goes in with its water", did.ok && M.box().things[1]?.item === "can" && M.box().things[1].water === 4 && slotOf(M, "can") < 0, M.box());
    did = await M.boxPut(slotOf(M, "minnow"), 1, [40, 40]);
    ok("from across the plaza it is refused, and nothing moves", !did.ok && did.why === "far" && M.purse().bag[0].n === 4 && M.box().things[0].n === 5, did);
    await N.boxLook();
    ok("the other's box is their own: empty, with nothing of mine told", N.box().things.every((s) => s === null) && !JSON.stringify(N.box()).includes("minnow"), N.box());
    did = await N.boxTake(0, 1, [35, 35]);
    ok("…and they take nothing of mine out of it", !did.ok && did.why === "none" && N.purse().bag.every((s) => s === null), did);
    did = await M.boxTake(0, 2, [33, 34]);
    ok("two taken out again: in my bag, three left in the box", did.ok && did.n === 2 && M.purse().bag[0].n === 6 && M.box().things[0].n === 3, { did, box: M.box() });
    const page = new DbKeeper(a, askAs("A"));
    await settled(page);
    await sleep(300);
    ok("another page of mine has the same box", page.box()?.things[0]?.n === 3 && page.box().things[1]?.item === "can", page.box());
    const lines = await sql(`select what, thing, n::int as n from public.town_deeds where member_id = $1 and what like 'box\\_%' order by id`, [a]);
    ok("each deed that came off is written down, and the refusals are not", JSON.stringify(lines) === JSON.stringify([{ what: "box_put", thing: "minnow", n: 5 }, { what: "box_put", thing: "can", n: 1 }, { what: "box_take", thing: "minnow", n: 2 }]), lines);
    M.close(); N.close(); page.close();
  }

  if ((await sql(`select to_regprocedure('public.town_ground()') is not null as there`))[0].there) {
    section("things dropped on the ground: lying for everybody, picked up by the first, gone in ten seconds (v137)");
    await sql(`truncate public.town_ground restart identity`);
    await purse(a, 0, [{ item: "minnow", n: 9 }, { item: "can", n: 1, water: 4 }]);
    await purse(b, 0, []);
    const from = asked.length;
    const M = new DbKeeper(a, askAs("A")), N = new DbKeeper(b, askAs("B"));
    const said = [];
    M.onDeed = (what) => { said.push(`A ${what}`); };
    N.onDeed = (what) => { said.push(`B ${what}`); };
    await settled(M); await settled(N);
    await sleep(300);
    ok("asked for once as the game begins: nothing lies about", asked.slice(from).filter((x) => x === "A town_ground").length === 1 && Array.isArray(M.ground()) && M.ground().length === 0 && N.ground().length === 0, M.ground());
    let did = await M.groundDrop(slotOf(M, "minnow"), [30, 40]);
    ok("nine minnows dropped: out of my bag, lying for me at once, and the room is told", did.ok && typeof did.id === "number" && slotOf(M, "minnow") < 0
      && M.ground().length === 1 && M.ground()[0].stack.n === 9 && M.ground()[0].by === a && said.join() === "A ground", { did, ground: M.ground(), said });
    ok("…asked with the slot and the tile stood on", JSON.stringify(sent.filter((x) => x.fn === "town_ground_drop").at(-1)?.args) === JSON.stringify({ p_slot: 0, p_x: 30, p_y: 40 }), sent.at(-1));
    ok("the other's keeper knows nothing of it yet", N.ground().length === 0);
    // (the room's word, as the map would hand it on)
    N.nudged("ground");
    await settled(N);
    ok("told through the room, it asks, and has it: what, how many, where, and until when", N.ground().length === 1 && N.ground()[0].id === did.id && N.ground()[0].stack.item === "minnow"
      && N.ground()[0].at.join() === "30,40" && Math.abs(N.ground()[0].until - N.now() - 10000) < 3000, N.ground());
    const far = await N.groundTake(did.id, [35, 40]);
    ok("from five tiles off it is refused, and lies on", !far.ok && far.why === "far" && N.ground().length === 1, far);
    const got = await N.groundTake(did.id, [31, 41]);
    ok("picked up from beside it: in the other's bag, gone from what lies, and the room is told", got.ok && got.item === "minnow" && got.n === 9 && N.purse().bag[0]?.n === 9 && N.ground().length === 0
      && said.join() === "A ground,B ground", { got, said });
    M.nudged("ground");
    await settled(M);
    const late = await M.groundTake(did.id, [30, 40]);
    ok("the dropper is told it is gone, and asking for it says so", M.ground().length === 0 && !late.ok && late.why === "lost", late);
    did = await M.groundDrop(slotOf(M, "can"), [30, 40]);
    N.nudged("ground");
    await settled(N);
    ok("a can dropped lies with its water", did.ok && N.ground()[0]?.stack.water === 4, N.ground());
    await skip(10_500);
    await settled(M); await settled(N);
    ok("ten seconds on, by the keepers' own clocks, nothing lies for either", M.ground().length === 0 && N.ground().length === 0, [M.ground(), N.ground()]);
    const none = await N.groundTake(did.id, [30, 40]);
    ok("…and nobody picks it up: it is lost", !none.ok && none.why === "lost" && slotOf(M, "can") < 0 && slotOf(N, "can") < 0, none);
    const lines = await sql(`select what, thing, n::int as n from public.town_deeds where what like 'ground\\_%' order by id`);
    ok("each deed is written down: two drops, and the one picking up", JSON.stringify(lines) === JSON.stringify([{ what: "ground_drop", thing: "minnow", n: 9 }, { what: "ground_take", thing: "minnow", n: 9 }, { what: "ground_drop", thing: "can", n: 1 }]), lines);
    M.close(); N.close();
  }

  section("one thing at a time");
  await purse(a, 100, []);
  await settled(A);
  const many = await Promise.all([A.buy("worm", 1), A.buy("worm", 1), A.buy("worm", 1), A.buy("dough", 1)]);
  ok("four deeds asked at once are done in the order they were asked, each answer kept in turn", many.every((d) => d.ok) && A.purse().coins === 100 - 2 * 3 - 3 && A.purse().bag[0]?.item === "worm" && A.purse().bag[0].n === 3 && A.purse().bag[1]?.item === "dough",
    { coins: A.purse().coins, bag: A.purse().bag.filter(Boolean) });
  // (v149, a draft or run: all that was played above was written down by the game's own functions, as members', and
  // each line of it was read by the lines' trigger as it was written)
  if ((await sql(`select to_regclass('public.town_work') is not null as there`))[0].there) {
    section("the lines of work, counted from what was played");
    const counted = Object.fromEntries((await sql(`select line, sum((kept->>'points')::float8)::float8 as p from public.town_work group by 1 order by 1`)).map((r) => [r.line, Number(r.p)]));
    console.log("    " + JSON.stringify(counted));
    ok(`what the keepers did above counted on the lines it is of: ${LINES_PLAYED.join(", ")}`, LINES_PLAYED.every((l) => counted[l] > 0), counted);
    A.linesRead();
    await settled(A);
    ok("…and a keeper is told its own, all seven", Object.keys(A.lines()?.lines ?? {}).length === 7, A.lines());
    // (v151, a draft or run: the gifts of ranks. A database before it gives none, and the keeper says so)
    if ((await sql(`select to_regprocedure('public.town_gift_take(text, integer)') is not null as there`))[0].there) {
      ok("where gifts are given the keeper says so", A.gifting() === true);
      await sql(`insert into public.town_work (member_id, line, kept) values ($1, 'farming', town.work_new() || '{"points": 60}'::jsonb) on conflict (member_id, line) do update set kept = excluded.kept`, [a]);
      const early = await A.giftTake("forest", 1);
      ok("a gift of a rank not reached is refused, and the purse has none", !early.ok && early.why === "rank" && !(A.purse().gifts?.had?.length > 0), early);
      const took = await A.giftTake("farming", 1);
      ok("a gift of a rank reached is taken through the keeper: named, and in the purse it keeps at once", took.ok && took.gift === "charmHoe" && A.purse().gifts?.had?.join() === "charmHoe", { took, gifts: A.purse().gifts });
      const wore = await A.charmsWear(["charmHoe"]);
      ok("…and worn", wore.ok && A.purse().gifts.charms.join() === "charmHoe", { wore, gifts: A.purse().gifts });
      const third = await A.charmsWear(["charmHoe", "charmNet"]);
      ok("a charm not had is refused, and what is worn stays", !third.ok && third.why === "none" && A.purse().gifts.charms.join() === "charmHoe", third);
      await A.buy("worm", 1);
      ok("a purse keeps its gifts through whatever else is done", A.purse().gifts?.had?.join() === "charmHoe" && A.purse().gifts.charms.join() === "charmHoe", A.purse().gifts);
      // (v152, a draft or run: the familiars. A database before it gives the charms only, and the keeper offers no familiar)
      if ((await sql(`select to_regprocedure('public.town_familiar_wear(text)') is not null as there`))[0].there) {
        ok("where familiars are given the keeper says which gifts are: the charms and the familiars, and nothing else", A.gives("charmHoe") && A.gives("famGnome") && !A.gives("noSuchGift"));
        const none = await A.familiarWear("famGnome");
        ok("a familiar not had is refused, and none follows", !none.ok && none.why === "none" && !A.purse().gifts.familiar, none);
        await sql(`update public.town_work set kept = kept || '{"points": 160}'::jsonb where member_id = $1 and line = 'farming'`, [a]);
        const gnome = await A.giftTake("farming", 2), called = await A.familiarWear("famGnome");
        ok("the familiar of a rank reached is taken and called through the keeper: it follows, in the purse it keeps at once, and the charm stays on",
          gnome.ok && gnome.gift === "famGnome" && called.ok && A.purse().gifts.familiar === "famGnome" && A.purse().gifts.charms.join() === "charmHoe", { gnome, called, gifts: A.purse().gifts });
        await A.buy("worm", 1);
        ok("…it follows through whatever else is done", A.purse().gifts.familiar === "famGnome", A.purse().gifts);
        // (v152 counted the gnome's weeding, ten to a meal's hours; from v153 it waters a bed an hour and nothing of it is counted so)
        const counted = (await sql(`select coalesce(town.cat('gifts')->'uses' ? 'famGnome', false) as c`))[0].c;
        const used = await A.giftUse("famGnome"), other = await A.giftUse("charmHoe");
        if (counted) ok("a counted gift is used through the keeper: told how many are left, counted in the purse it keeps at once; one that is not counted is refused",
          used.ok && used.left === 9 && A.purse().gifts.used?.famGnome?.n === 1 && !other.ok && other.why === "none", { used, other, gifts: A.purse().gifts });
        else ok("a gift that is not counted is refused through the keeper, and nothing is counted in the purse", !used.ok && used.why === "none" && !other.ok && other.why === "none" && !A.purse().gifts.used?.famGnome, { used, other, gifts: A.purse().gifts });
        const rest = await A.familiarWear(null);
        ok("…and is sent to rest", rest.ok && A.purse().gifts.familiar === null && A.purse().gifts.had.join() === "charmHoe,famGnome", { rest, gifts: A.purse().gifts });
      } else ok("a database with charms and no familiars: the keeper offers the charms and no familiar", A.gives("charmHoe") && !A.gives("famGnome"));
    } else ok("a database that gives no gifts: the keeper says so", A.gifting() === false);
  }
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
