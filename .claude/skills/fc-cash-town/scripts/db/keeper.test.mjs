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
const { DbKeeper, NUDGE_GAP } = await import("@/lib/town/keeper");
// (the room's word is answered at once all through this file: the gaps the page keeps are tried in a section of their own.
// A keeper from before the gaps has none to take away.)
for (const what of Object.keys(NUDGE_GAP ?? {})) NUDGE_GAP[what] = 0;
const { FARM, KITCHEN, plotAt, fishFrom, bedOf } = await import("@/lib/town/world");
const { shelfOf } = await import("@/lib/town/orders");
const { BUGS, HAUNTS } = await import("@/lib/town/insects");
const { ridCameOf, see, roll, inPestHours, pestHour } = await import("@/lib/town/farm");
const { ALL_LINE_IDS, MORE_LINE_IDS } = await import("@/lib/town/lines");

const PORT = 3198, BASE = `http://127.0.0.1:${PORT}`;
// (the drafts of the next migrations, kept out of supabase/ until each is proved, are tried with the rest, in their order)
const NEXT = [];
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
  // (the first day's shelf is read from the database's own catalog, never named here: twenty-one things at first, the
  // scroll of the cure for pests from v117, a net for insects from v125, a pick and an axe from v164)
  const first = Number((await sql(`select jsonb_array_length(town.cat('shelf')->'basic') as n`))[0].n);
  const sells = (await sql(`select town.cat('items') ? 'scrollPestCure' as cure, town.cat('items') ? 'bugNet' as net`))[0];
  ok("the stall is not known until it is looked at", A.order() === null && A.shelf().length === shelfOf(0).length);
  const stopStall = A.look("stall");
  await settled(A);
  ok(`looked at: today's order, the first day's shelf of ${first}, what his next hint costs`, A.order()?.wants?.length === 3 && first >= 23 && A.shelf().length === first && A.hintPrice() === 15, { order: A.order(), shelf: A.shelf().length, hint: A.hintPrice() });
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
  {
    // several pots of food in one bag (a member, 2026-10-07: the one set down was never the one meant): the one taken
    // up is the one held and the one set down, by its slot (v158); the first there is, is asked for as it always was
    const full = (left) => ({ item: "potFull", n: 1, of: { dish: "friedMinnow", left } });
    await purse(a, 0, [full(2), { item: "salt", n: 1 }, full(1), full(3)]);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'potFull') where member_id = $1`, [a]);
    await settled(A);
    const slotted = (await sql(`select to_regprocedure('public.town_pot_down(integer, integer, integer)') is not null as there`))[0].there;
    const lefts = () => A.purse().bag.slice(0, 4).map((s) => s?.of?.left ?? null).join();
    const asks = () => sent.filter((s) => s.as === "A" && s.fn === "town_pot_down");
    ok("of three pots of food, a page that has taken none of them up holds the first", A.handSlot() === 0, A.handSlot());
    await A.hold(3);
    ok("…and the one it takes up is the one held", A.handSlot() === 3, A.handSlot());
    const meant = await A.potDown([30, 20], A.handSlot());
    if (slotted) {
      ok("set down by its slot: the pot that was taken up, with the other two still in the bag", meant.ok && meant.pot.left === 3 && lefts() === "2,,1," && asks().at(-1).args.p_slot === 3, { meant, bag: lefts(), args: asks().at(-1).args });
      ok("…and with its slot empty the hand is on the first pot there is", A.handSlot() === 0, A.handSlot());
    } else {
      ok("a database that has not had v158 knows no slot: nothing is set down, and never the wrong pot", !meant.ok && meant.why === "away" && lefts() === "2,,1,3", { meant, bag: lefts() });
    }
    await A.hold(0);
    const first = await A.potDown([34, 20], A.handSlot());
    ok("the first pot there is, is asked for as it always was, with no slot said: which any database answers", first.ok && first.pot.left === 2 && !("p_slot" in asks().at(-1).args), { first, args: asks().at(-1).args });
    // (taken up again, so that nothing of this stands about for what comes after)
    for (const o of A.pots().filter((p) => p.by === a)) await A.potTake(o.id, o.at);
    ok("…and its pots taken up again, none stands about", A.pots().length === 0 && (await sql(`select count(*)::int as n from public.town_pots`))[0].n === 0, A.pots());
  }
  {
    // the feast table (v159): the keeper is told of the table with the pots; a dish set down on the yard's floor is on
    // it, kept at once; the table's bowl is asked for by the pot, the tile and that one sits, and what it answers is kept
    const feasting = (await sql(`select to_regprocedure('public.town_feast_eat(bigint, integer, integer, boolean)') is not null as there`))[0].there;
    const full = (left) => ({ item: "potFull", n: 1, of: { dish: "friedMinnow", left } });
    const yard = KITCHEN.floor[12], seat = KITCHEN.floor[20];
    const stopA = A.look("kitchen"), stopB = B.look("kitchen");
    await purse(a, 0, [full(2)]);
    await purse(b, 0, []);
    await settled(A); await settled(B);
    if (feasting) {
      ok("the keeper is told of the feast table with the pots: how many, how long on the ground, its tile", A.feast()?.pots === 6 && A.feast().ground === 60 && A.feast().tile?.join() === KITCHEN.feast.tile.join() && !("floor" in A.feast()), A.feast());
      const set = await A.potDown(yard, 0);
      ok("a dish set down on the yard's floor is on the table: kept here at once, said to stand on the table's tile, with its cook's name",
        set.ok && set.pot.feast === true && A.pots().length === 1 && A.pots()[0].feast === true && A.pots()[0].at.join() === KITCHEN.feast.tile.join() && typeof A.pots()[0].set === "number" && typeof A.pots()[0].name === "string", { set, pots: A.pots() });
      B.nudged("kitchen");
      await settled(B);
      const standing = await B.feastEat(B.pots()[0]?.id, seat, false);
      ok("standing, the table's bowl feeds nobody, and the keeper says why", !standing.ok && standing.why === "stand" && !B.purse().eating, standing);
      const ate = await B.feastEat(B.pots()[0]?.id, seat, true);
      const asked = sent.filter((x) => x.as === "B" && x.fn === "town_feast_eat").at(-1)?.args;
      ok("sitting down in the yard with an empty bag: a helping begun out of the table's bowl, kept here at once, and the pot a helping the less", ate.ok && ate.dish === "friedMinnow"
        && B.purse().eating?.dish === "friedMinnow" && B.purse().eating.lent === true && B.purse().bag.every((x) => !x) && B.pots()[0]?.left === 1, { ate, eating: B.purse().eating, pots: B.pots() });
      ok("…asked for by the pot, the tile stood on and that one sits", !!asked && String(asked.p_id) === String(A.pots()[0].id) && asked.p_x === seat[0] && asked.p_y === seat[1] && asked.p_seated === true, asked);
      const gone = await B.feastEat("999999", seat, true);
      ok("a pot that is not there: gone, and nothing kept of it", !gone.ok && gone.why === "gone", gone);
      A.nudged("kitchen");
      await settled(A);
      const back = await A.potTake(A.pots()[0]?.id, yard);
      ok("its cook takes it back from the yard's floor, with what is left", back.ok && A.pots().length === 0 && A.purse().bag[0]?.of?.left === 1, { back, bag: A.purse().bag.filter(Boolean) });
    } else {
      ok("a database that has not had v159 tells of no feast table: the page offers none", A.feast() === null, A.feast());
      const set = await A.potDown(yard, 0);
      ok("…and a pot set down in the yard stands where it was set, as it always did", set.ok && !set.pot.feast && set.pot.at.join() === yard.join() && A.pots().length === 1, { set, pots: A.pots() });
      const ate = await B.feastEat(A.pots()[0]?.id, seat, true);
      ok("…and the table's bowl, were it asked for, is not there to answer: nothing is begun", !ate.ok && !B.purse().eating, ate);
      await A.potTake(A.pots()[0]?.id, yard);
    }
    stopA(); stopB();
    await sql(`delete from public.town_pots`);
    await purse(a, 0, []); await purse(b, 0, []);
    await settled(A); await settled(B);
  }

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
    section("the relatives' price: told at the stall, and with a thing left or taken back (v124; the usual amounts are v155's)");
    // (the market as v124 makes it, in the round that is: nothing sold, every price its usual one, no round behind it.
    // This test puts the clock an hour forward at its start; begun in the hour before a round's turn, 06:00 to 07:00
    // or 18:00 to 19:00, that carried it over the turn, the price was a round on before this section first looked,
    // and five checks here failed by the hour and by nothing else)
    await sql(`update public.town_things set doc = jsonb_build_object('round', town.round_of(town.now_ms()), 'at', '{}'::jsonb, 'sold', '{}'::jsonb) where key = 'market'`);
    await sql(`delete from public.town_market_log where true`);
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
    ok("a round on, somebody else is told the lower price, with the round that ended behind it", now?.f === 75 && now.was.length === 1 && now.was[0][1] === 100 && now.was[0][2] === 160 && now.floor === 40 && now.ceil === 150, B.prices());
    did = await B.leave(0, 20);
    ok("…and a lot left then keeps it", did.ok && B.purse().left.at(-1).f === 75 && B.prices().things.kangkong?.f === 75, [B.purse().left, B.prices()]);
    did = await B.takeBack(B.purse().left.length - 1);
    ok("taken back, it is in the bag again, and its price is told with the answer", did.ok && B.purse().bag[0]?.n === 20 && B.prices().things.kangkong?.f === 75, [B.purse().bag[0], B.prices()]);
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

  if (NUDGE_GAP && (await sql(`select to_regclass('public.town_comebacks') is not null as there`))[0].there) {
    section("the room's word about a thing that is dear to read: asked for at once, then once when its gap is over");
    await sql(`delete from public.town_comebacks`);
    NUDGE_GAP.bugs = 1500;
    const stop = A.look("bugs"), asks = (from) => asked.slice(from).filter((x) => x === "A town_bugs").length;
    await sleep(1700);   // (the look's own ask is over, and so is any gap begun before)
    const from = asked.length;
    A.nudged("bugs");
    await sleep(300);
    ok("the first word is answered at once", asks(from) === 1, asked.slice(from));
    A.nudged("bugs"); A.nudged("bugs"); A.nudged("bugs");
    await sleep(300);
    ok("three more words inside the gap ask for nothing yet", asks(from) === 1, asked.slice(from));
    await sleep(1500);
    ok("and for it once when the gap is over, whatever was said meanwhile", asks(from) === 2, asked.slice(from));
    A.nudged("bugs");
    stop();
    await sleep(1700);
    ok("a word that waits is dropped when the thing is looked at no more", asks(from) === 2, asked.slice(from));
    NUDGE_GAP.bugs = 0;
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

  if ((await sql(`select to_regprocedure('public.town_bag_sort()') is not null as there`))[0].there) {
    section("a bag put in order: said as the game begins, a thing moved, the whole sorted, and the pot in the hand the same pot (v165)");
    const { sorted } = await import("@/lib/town/bag");
    const dish = Object.keys((await sql(`select town.cat('dishes') as c`))[0].c)[0];
    const pot = (left) => ({ item: "potFull", n: 1, of: { dish, left } });
    await purse(a, 12, [{ item: "kangkong", n: 5 }, null, pot(3), { item: "kangkong", n: 18 }, pot(1), { item: "worm", n: 2 }]);
    await purse(b, 3, [{ item: "worm", n: 4 }, null, { item: "hoe", n: 1 }]);
    const from = asked.length, deedsWere = (await sql(`select coalesce(max(id), 0)::int as n from public.town_deeds`))[0].n;
    const M = new DbKeeper(a, askAs("A")), N = new DbKeeper(b, askAs("B"));
    await settled(M); await settled(N);
    await sleep(300);
    ok("asked once as the game begins: a bag can be put in order here", asked.slice(from).filter((x) => x === "A town_bag").length === 1 && M.bagTidy() === true && sorted(M.purse()) === false, asked.slice(from));
    await M.hold(4);
    ok("(the pot with one helping is taken up: of the two pots, that slot's is the one held)", M.handSlot() === 4 && M.purse().bag[M.handSlot()].of.left === 1, M.handSlot());
    let did = await M.bagMove(4, 1);
    ok("a thing moved into an empty slot: the keeper has my bag as it now stands, at once", did.ok && M.purse().bag[1]?.of?.left === 1 && M.purse().bag[4] === null, M.purse().bag);
    ok("…asked with the slot it came from and the slot it went to", JSON.stringify(sent.filter((x) => x.fn === "town_bag_move").at(-1)?.args) === JSON.stringify({ p_from: 4, p_to: 1 }), sent.at(-1));
    ok("…and the pot in the hand is the one that was moved: its slot went with it", M.handSlot() === 1, M.handSlot());
    did = await M.bagMove(2, 1);
    ok("the other pot dragged onto it: they change places, and the hand's pot is where it now is", did.ok && M.purse().bag[1].of.left === 3 && M.purse().bag[2].of.left === 1 && M.handSlot() === 2, { bag: M.purse().bag, hand: M.handSlot() });
    did = await M.bagMove(0, 3);
    ok("more of one thing joined as far as a slot holds, the rest where it was", did.ok && M.purse().bag[3].n === 20 && M.purse().bag[0].n === 3 && M.handSlot() === 2, M.purse().bag);
    const was = JSON.stringify(M.purse().bag);
    did = await M.bagMove(4, 0);
    ok("an empty slot to move from is refused, and nothing moves: bag and hand as they were", !did.ok && did.why === "none" && JSON.stringify(M.purse().bag) === was && M.handSlot() === 2, did);
    did = await M.bagSort();
    const bag = M.purse().bag;
    ok("sorted: the bag in order, the fuller pot first, nothing made or lost", did.ok && sorted(M.purse()) && bag.length === 10
      && JSON.stringify(bag.filter(Boolean).map((s) => `${s.item}×${s.n}${s.of ? ":" + s.of.left : ""}`)) === JSON.stringify(["potFull×1:3", "potFull×1:1", "worm×2", "kangkong×20", "kangkong×3"]), bag);
    ok("…asked with no word but the deed's own", JSON.stringify(sent.filter((x) => x.fn === "town_bag_sort").at(-1)?.args) === "{}", sent.at(-1));
    ok("…and the pot in the hand is still the pot with one helping, wherever the sort put it", M.purse().hand === "potFull" && bag[M.handSlot()]?.of?.left === 1, { hand: M.handSlot(), bag });
    const page = new DbKeeper(a, askAs("A"));
    await settled(page);
    ok("another page of mine has the bag as it was left", JSON.stringify(page.purse().bag) === JSON.stringify(bag) && M.purse().coins === 12, page.purse().bag);
    await settled(N);
    ok("the other's bag and coins are as they were", N.purse().bag[0]?.n === 4 && N.purse().bag[2]?.item === "hoe" && N.purse().coins === 3, { bag: N.purse().bag, coins: N.purse().coins });
    const written = await sql(`select what, thing from public.town_deeds where id > $1 order by id`, [deedsWere]);
    ok("nothing of the moving or the sorting is among the deeds: only the pot taken up", JSON.stringify(written) === JSON.stringify([{ what: "hold", thing: "potFull" }]), written);
    M.close(); N.close(); page.close();
  } else {
    section("a bag put in order (v165 has not run here)");
    const from = asked.length;
    const M = new DbKeeper(a, askAs("A"));
    await settled(M);
    await sleep(300);
    ok("asked as the game begins and told nothing: the keeper says a bag cannot be put in order, and the page offers neither", asked.slice(from).includes("A town_bag") && M.bagTidy() === false && M.ready(), asked.slice(from));
    M.close();
  }

  // ── the bridge built by hand ── (v160, a draft or run: a database before it has no works, and the keeper knows of none)
  if ((await sql(`select to_regprocedure('public.town_works_read()') is not null as there`))[0].there) {
    section("the bridge built by hand: built closed, opened by one line, a stone through three keepers, a marked stone, each span's hands (v160)");
    const { BRIDGE, bridgeSpans, bridgeWhole, carrying } = await import("@/lib/town/bridge");
    const PILE = [BRIDGE.pile.x - 1, BRIDGE.pile.y + 1], FOOT = [BRIDGE.foot.x + 1, BRIDGE.foot.y + 1];
    const c = await member("C", "Tester C");
    const hands = async (id, left = 100, hand = null) => {
      await purse(id, 0, hand ? [{ item: hand, n: 1 }] : []);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)) where member_id = $1`, [id, hand, left]);
    };
    const staminaOf = async (id) => Number((await sql(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [id]))[0].n);
    const pointsOf = async (id) => Number((await sql(`select coalesce((select (w.kept->>'points')::float8 from public.town_work w where w.member_id = $1 and w.line = 'helpers'), 0) as p`, [id]))[0].p);
    const have = (n) => sql(`update public.town_work_needs set have = $1 where work = 'bridge' and thing = 'stone'`, [n]);
    // (what a stone has in it is the database's draw as it is lifted, one in twenty-five: set here to what a check needs, as the draw would have)
    const mark = (id, kind) => sql(`update public.town_work_carried set mark = $2 where member_id = $1`, [id, kind]);
    await sql(`delete from public.town_work_carried where true`);
    await sql(`delete from public.town_work_hands where true`);
    await sql(`delete from public.town_work_built where true`);
    await sql(`delete from public.town_work_finds where true`);
    await sql(`update public.town_works set opened_at = null, done_at = null where id = 'bridge'`);
    await have(0);
    for (const id of [a, b, c]) await hands(id);
    const I = new DbKeeper(a, askAs("A")), J = new DbKeeper(b, askAs("B")), K = new DbKeeper(c, askAs("C"));
    await settled(I); await settled(J); await settled(K);
    const told = [];
    I.onDeed = (what, to) => { told.push(`${what} ${to}`); };
    K.onDeed = (what, to) => { told.push(`${what} ${to}`); };
    ok("built closed: the keeper is told only that the bridge is not open, and the map has no span of it", I.works()?.works.bridge.open === false && JSON.stringify(I.works().works.bridge.needs) === "{}" && I.works().carried === null && bridgeSpans(I.works()) === 0 && bridgeWhole(I.works()) === false, I.works());
    let did = await I.stoneLift(PILE);
    ok("…and a stone asked for all the same is refused by the database: closed", !did.ok && did.why === "closed" && carrying(I.works()) === null && (await staminaOf(a)) === 100, did);
    // (the one line of the file's head, as the owner runs it)
    await sql(`update public.town_works set opened_at = now() where id = 'bridge'`);
    await I.worksLook(); await J.worksLook(); await K.worksLook();
    ok("opened by the owner's one line: read again, the keeper has the bridge with its six hundred stones to come", I.works().works.bridge.open === true && JSON.stringify(I.works().works.bridge.needs.stone) === JSON.stringify({ need: BRIDGE.need, have: 0 }) && I.works().works.bridge.helpers.length === 0, I.works());
    did = await I.stoneLift([0, 0]);
    ok("a stone is not lifted from far off: the tile is the page's word, held to the pile's", !did.ok && did.why === "far", did);
    did = await I.stoneLift(PILE);
    ok("lifted at the pile: in the hands the keeper has at once, for one stamina, nothing in the bag, and nobody told through the room", did.ok && carrying(I.works()) === "stone" && (await staminaOf(a)) === 100 - BRIDGE.costs.lift && I.purse().bag.every((x) => !x) && told.length === 0, { did, works: I.works(), told });
    await mark(a, null);
    did = await I.stoneLift(PILE);
    ok("no second stone while one is held", !did.ok && did.why === "held", did);
    const before = [await pointsOf(a), await pointsOf(b), await pointsOf(c)];
    did = await I.stonePass(b);
    ok("handed on: my hands are empty at once, it cost nothing, and whoever took it is to be told through the room", did.ok && carrying(I.works()) === null && (await staminaOf(a)) === 99 && (await staminaOf(b)) === 100 && told.join() === `works ${b}`, { did, told });
    ok("the taker's keeper knows nothing of it yet", carrying(J.works()) === null);
    // (the room's word, as the map would hand it on)
    J.nudged("works");
    await settled(J);
    ok("told through the room, it reads the works again and has the stone", carrying(J.works()) === "stone", J.works());
    did = await J.stoneLay(PILE);
    ok("a stone is not laid at the pile: far", !did.ok && did.why === "far" && carrying(J.works()) === "stone", did);
    did = await J.stonePass(c);
    K.nudged("works");
    await settled(K);
    ok("handed on again, to the third", did.ok && carrying(K.works()) === "stone" && carrying(J.works()) === null, did);
    did = await K.stoneLay(FOOT);
    ok("laid at the foot by the third: one stamina, the bridge has one, no span yet, the stone went into the first span with nothing in it, and everybody is to be told through the room",
      did.ok && did.have === 1 && did.spans === 0 && did.span === false && did.whole === false && did.into === 1 && did.find === null && carrying(K.works()) === null && (await staminaOf(c)) === 99 && K.works().works.bridge.needs.stone.have === 1
        && told.length === 2 && told[1] === "works undefined", { did, told });
    ok("the keepers of the two who only handed it on know nothing of it yet", [I, J].every((k) => JSON.stringify(k.works().works.bridge.mine) === "{}"));
    // (the room's word, as the map would hand it on: each reads the works again, and its page shows what the stone earned)
    I.nudged("works"); J.nudged("works");
    await settled(I); await settled(J);
    ok("all three whose hands it went through are counted one stone, each told their own count and nobody else's",
      [I, J, K].every((k) => JSON.stringify(k.works().works.bridge.mine) === JSON.stringify({ stone: 1 })) && !/"n":/.test(JSON.stringify(I.works())), [I.works().works.bridge.mine, J.works().works.bridge.mine, K.works().works.bridge.mine]);
    // (the three came by one stone, at one moment: such are listed by their ids; the dry run holds the order of those who came at different moments)
    ok("the sign's names are all three who came by that stone, by name, with no number", JSON.stringify(I.works().works.bridge.helpers.map((h) => h.id)) === JSON.stringify([a, b, c].sort()) && I.works().works.bridge.helpers.every((h) => /^Tester [ABC]$/.test(h.name) && Object.keys(h).sort().join() === "id,name"), I.works().works.bridge.helpers);
    const after = [await pointsOf(a), await pointsOf(b), await pointsOf(c)];
    ok("…and each has a point more on the helpers' line", after.every((p, i) => Math.abs(p - before[i] - BRIDGE.point) < 1e-9), { before, after });
    const lines = (await sql(`select d.what, d.member_id as by from public.town_deeds d where d.what like 'stone%' order by d.id`)).map((d) => `${d.what} ${d.by === a ? "A" : d.by === b ? "B" : "C"}`);
    ok("each deed is written down: the lifting, the two handings on, the laying, and a line for each of the others it came by", lines.join() === "stone_lift A,stone_pass A,stone_pass B,stone_lay C,stone_hand A,stone_hand B", lines);
    ok("all three are of the first span's hands, by name and with no number", JSON.stringify(Object.keys(I.works().works.bridge.built)) === '["1"]' && JSON.stringify(I.works().works.bridge.built[1].map((h) => h.id)) === JSON.stringify([a, b, c].sort())
      && I.works().works.bridge.built[1].every((h) => /^Tester [ABC]$/.test(h.name) && Object.keys(h).sort().join() === "id,name") && I.works().works.bridge.finds.length === 0, I.works().works.bridge.built);
    // a marked stone: nobody is told while it is carried; laid, it is found and set in the bridge
    did = await I.stoneLift(PILE);
    await mark(a, "pearl");
    await I.worksLook();
    ok("a stone with something in it: its holder's keeper is told that it carries a stone, and nothing of what is in it", did.ok && JSON.stringify(I.works().carried) === JSON.stringify({ work: "bridge", thing: "stone" }) && !/pearl|"mark"/.test(JSON.stringify(I.works())), I.works().carried);
    did = await I.stonePass(c);
    K.nudged("works");
    await settled(K);
    ok("…nor is whoever takes it", did.ok && carrying(K.works()) === "stone" && !/pearl|"mark"/.test(JSON.stringify(K.works())) && !/pearl|"mark"/.test(JSON.stringify(did)), K.works().carried);
    did = await K.stoneLay(FOOT);
    ok("laid, it is found: the answer says what was in it, and the keeper has it set in the bridge with the hands it came by, in the order it went through them",
      did.ok && did.find === "pearl" && did.into === 1 && did.have === 2 && JSON.stringify(K.works().works.bridge.finds.map((f) => [f.kind, f.span, f.hands.map((h) => h.id)])) === JSON.stringify([["pearl", 1, [a, c]]])
        && K.works().works.bridge.finds[0].hands.every((h) => /^Tester [AC]$/.test(h.name)) && typeof K.works().works.bridge.finds[0].at === "number", { did, finds: K.works().works.bridge.finds });
    I.nudged("works"); J.nudged("works");
    await settled(I); await settled(J);
    ok("…every keeper the room tells has the find, whoever had no hand in it too; and it is one point of the stone's to each hand, none of the pearl's",
      [I, J].every((k) => k.works().works.bridge.finds.length === 1) && Math.abs((await pointsOf(a)) - after[0] - BRIDGE.point) < 1e-9 && Math.abs((await pointsOf(b)) - after[1]) < 1e-9 && I.purse().bag.every((x) => !x), [await pointsOf(a), await pointsOf(b)]);
    ok("…and the laying is written with what was found", (await sql(`select d.doc->>'find' as find from public.town_deeds d where d.what = 'stone_lay' order by d.id desc limit 1`))[0].find === "pearl");
    // the hundredth stone is a span: everybody is told through the room, and reads it
    await have(99);
    did = await K.stoneLift(PILE);
    await mark(c, null);
    did = did.ok ? await K.stoneLay(FOOT) : did;
    ok("the hundredth stone is a span: said in the answer, the first span's own, and everybody is to be told through the room", did.ok && did.have === 100 && did.spans === 1 && did.span === true && did.whole === false && did.into === 1 && bridgeSpans(K.works()) === 1 && told[told.length - 1] === "works undefined", { did, told });
    ok("another keeper still has none", bridgeSpans(I.works()) === 0);
    I.nudged("works");
    await settled(I);
    ok("…until the room says so: then it has the span", bridgeSpans(I.works()) === 1 && bridgeWhole(I.works()) === false, I.works()?.works.bridge.needs);
    // the six-hundredth makes it whole, and nothing more is lifted
    await have(BRIDGE.need - 1);
    await K.stoneLift(PILE);
    await I.stoneLift(PILE);
    await mark(c, null); await mark(a, null);
    did = await K.stoneLay(FOOT);
    ok("the six-hundredth is the last span's: its hands are kept apart from the first's", did.ok && did.into === BRIDGE.spans && JSON.stringify(Object.keys(K.works().works.bridge.built).sort()) === JSON.stringify(["1", String(BRIDGE.spans)]) && JSON.stringify(K.works().works.bridge.built[BRIDGE.spans].map((h) => h.id)) === JSON.stringify([c]), K.works().works.bridge.built);
    ok("the six-hundredth stone makes the bridge whole: six spans, and the moment marked", did.ok && did.whole === true && did.spans === BRIDGE.spans && bridgeWhole(K.works()) && bridgeSpans(K.works()) === BRIDGE.spans && typeof K.works().works.bridge.done === "number", { did, bridge: K.works().works.bridge });
    did = await I.stoneLay(FOOT);
    const more = await K.stoneLift(PILE);
    ok("whole: a stone that came too late is not laid, and nothing more is lifted", !did.ok && did.why === "whole" && !more.ok && more.why === "whole" && carrying(I.works()) === "stone", { did, more });
    did = await I.stoneDrop();
    const again = await I.stoneDrop();
    ok("the stone that came too late is let go of: gone, nothing back; and with none there is nothing to let go of", did.ok && carrying(I.works()) === null && (await staminaOf(a)) === 97 && !again.ok && again.why === "none", { did, again });
    ok("the names stay on the sign of a bridge that is whole, with what was found", K.works().works.bridge.helpers.length === 3 && K.works().works.bridge.mine.stone === 4 && K.works().works.bridge.finds.length === 1, K.works().works.bridge);
    // a thing in the hand; and tired hands, which nothing is refused
    await have(10);
    await sql(`update public.town_works set done_at = null where id = 'bridge'`);
    await hands(a, 100, "rod"); await hands(b, 0);
    await settled(I); await settled(J);
    did = await I.stoneLift(PILE);
    ok("with a thing in the hand no stone is lifted: hand", !did.ok && did.why === "hand", did);
    did = await J.stoneLift(PILE);
    await mark(b, null);
    const handed = did.ok ? await J.stonePass(a) : did;
    ok("tired hands lift a stone all the same, at none; and it is not handed to somebody with a thing in the hand", did.ok && (await staminaOf(b)) === 0 && !handed.ok && handed.why === "hand" && carrying(J.works()) === "stone", { did, handed });
    did = await J.stoneLay(FOOT);
    ok("…and lay it, at none", did.ok && did.have === 11 && (await staminaOf(b)) === 0, did);
    I.close(); J.close(); K.close();
  } else {
    const O = new DbKeeper(a, askAs("A"));
    await settled(O);
    const none = await O.stoneLift([0, 0]);
    ok("a database with no works: the keeper knows of none, and a stone asked for could not be reached", O.works() === null && !none.ok && none.why === "away", { works: O.works(), none });
    O.close();
  }

  // ── felling ── (v164's woodcutters' part, a draft or run: a database before it has no trees, and the keeper asks for none)
  if ((await sql(`select to_regprocedure('public.town_trees()') is not null as there`))[0].there) {
    section("the mountain's trees: asked for only once the far side is open, a board, a friend at the trunk, a tree felled, a stump woken, shut again (v164)");
    const TREES = (await sql(`select town.cat('trees') as k`))[0].k, pines = TREES.wood.filter((w) => w[3] === 1 && w[0] !== TREES.elder.id);
    const [p, q] = pines, beside = (w) => [w[1] - 1, w[2]];
    const axeIn = async (id) => {
      await purse(id, 0, [{ item: "axe", n: 1 }]);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'axe', 'handAt', 0, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [id]);
    };
    const groveKept = async () => (await sql(`select doc from public.town_things where key = 'grove'`))[0].doc;
    const logsOf = (k) => k.purse().bag.reduce((n, s) => n + (s?.item === "log" ? s.n : 0), 0);
    // (the far side's own answer is asked past the line of questions: a moment for it, and for the trees asked on its yes)
    const begun = async (k) => { await settled(k); await sleep(300); await settled(k); };
    const farWas = Number((await sql(`select value from public.town_knobs where key = 'far_open'`))[0].value);
    await sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
    await sql(`update public.town_knobs set value = 0 where key = 'far_open'`);
    await axeIn(a); await axeIn(b);
    let from = asked.length;
    const shut = new DbKeeper(a, askAs("A"));
    await begun(shut);
    const stopShut = shut.look("trees");
    shut.nudged("trees");
    const none = await shut.fellBegin(p[0], beside(p));
    ok("the far side closed: a member's keeper asks for no tree, at the beginning, at a look or at the room's word, and sends no deed at one; the game is theirs all the same",
      shut.far() === false && shut.trees() === null && shut.open() === true && !none.ok && none.why === "none" && !asked.slice(from).some((x) => /town_trees|town_fell/.test(x)), asked.slice(from));
    stopShut();
    shut.close();
    await sql(`update public.town_knobs set value = 1 where key = 'far_open'`);
    // (what the database itself answers, kept beside what the keeper makes of it)
    const seen = {};
    const hearing = (as) => async (fn, args) => { const r = await askAs(as)(fn, args); seen[`${as} ${fn}`] = r; return r; };
    from = asked.length;
    const F = new DbKeeper(a, hearing("A")), G = new DbKeeper(b, hearing("B"));
    const told = [];
    F.onDeed = (what) => { told.push(what); if (what === "trees") G.nudged("trees"); };
    await begun(F); await begun(G);
    const first = asked.slice(from);
    ok("opened by its knob: the keeper says so, and asks for the trees once it has (none is down)",
      F.far() === true && first.includes("A town_trees") && first.indexOf("A town_trees") > first.indexOf("A town_far") && F.trees()?.down.length === 0 && F.trees().half.length === 0, { far: F.far(), trees: F.trees(), first });
    const stopG = G.look("trees");
    const board = await F.fellBegin(p[0], beside(p));
    ok("a board through the keeper: the trees it is for and what the game is made from; and the tree is held for its member in the grove the database keeps",
      board.ok && board.trees.join() === String(p[0]) && board.ask.chops > 0 && Number.isInteger(board.ask.seed) && board.ask.trees[0].id === p[0] && board.elder === false && (await groveKept()).goes?.[a]?.trees.join() === String(p[0]), board);
    const theirs = await G.fellBegin(p[0], [p[1] + 1, p[2]]);
    ok("…another member's board at it is refused with the rule's own word", !theirs.ok && theirs.why === "held", theirs);
    const braced = await G.fellBrace(a, [p[1] + 1, p[2]]);
    ok("a friend braces the trunk through the keeper, by the feller's id", braced.ok && braced.tree === p[0] && (await groveKept()).goes[a].braced === b, braced);
    const logsG = logsOf(G);
    const did = await F.fellDo({ tree: p[0], through: true, misses: 0, secs: 9 }, beside(p), "Tester A");
    const answer = seen["A town_fell"] ?? {};
    ok("a go sent as it was played: the tree down, its wood in the purse the keeper has at once, the stump on the page, and the room told",
      did.ok && did.felled.length === 1 && did.felled[0].id === p[0] && did.through && !did.stood && logsOf(F) >= TREES.logs && F.trees().down.some((d) => d.id === p[0]) && told.join() === "trees", { did, told });
    ok("…the keepsakes come as `keeps` (the village's found list is no part of the answer), with who braced; no fire, and nothing of the grove as it is kept",
      did.ok && Array.isArray(answer.keeps) && did.found.length === answer.keeps.length && !("found" in answer) && !("fire" in answer) && !("grove" in answer) && did.braced === b && !("fire" in did), Object.keys(answer));
    await sleep(400);
    await settled(G);
    ok("…the friend's page, told through the room, has the stump and the log they had for it", G.trees()?.down.some((d) => d.id === p[0]) && logsOf(G) === logsG + TREES.brace.logs, { trees: G.trees(), logs: logsOf(G) });
    const written = await sql(`select member_id, what, thing, doc from public.town_deeds where what in ('fell', 'brace') order by id desc limit 2`);
    ok("…and both are written down by the function itself: the feller's deed with the tree, the tile and who braced, and the friend's own",
      written.some((d) => d.what === "fell" && d.member_id === a && d.thing === "pine" && d.doc.tree === p[0] && d.doc.braced === b && d.doc.tile.join() === beside(p).join())
      && written.some((d) => d.what === "brace" && d.member_id === b && d.doc.feller === a), written);
    // (v172: the plain way that was is refused; a database from before it fells the tree at once)
    const v172 = (await sql(`select position('v172' in pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure)) > 0 as there`))[0].there;
    const plain = await F.fellDo({ tree: q[0], plain: true, secs: 0 }, beside(q), "Tester A");
    ok(v172 ? "the plain way that was, through the keeper: refused as the board's, and the tree stands" : "the plain press through the keeper (a database from before v172)",
      v172 ? !plain.ok && plain.why === "board" && !F.trees().down.some((d) => d.id === q[0]) : plain.ok && plain.plain && plain.felled[0]?.id === q[0], plain);
    // (where there is no plain way, the tree comes down at its board: by a go lost on it before v173; from v173 on a go that is lost leaves
    // the tree standing, and it comes down by its trunk cut through, with so many misses that it gives its logs alone)
    const v173 = (await sql(`select position('v173' in pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure)) > 0 as there`))[0].there;
    const lostAt = v172 ? await F.fellBegin(q[0], beside(q)) : { ok: true };
    const logsWas = logsOf(F);
    const lost = v172 ? await F.fellDo({ tree: q[0], through: false, misses: 1, secs: 1.5 }, beside(q), "Tester A") : plain;
    if (v173) ok("a go lost on the board, through the keeper: the tree stands, nothing is got, the go is over, and the room is told nothing",
      lost.ok && lost.stood && lost.felled.length === 0 && logsOf(F) === logsWas && !F.trees().down.some((d) => d.id === q[0]) && !(await groveKept()).goes?.[a] && told.join() === "trees", { lost, told });
    const downAt = v173 ? await F.fellBegin(q[0], beside(q)) : { ok: true };
    const down = v173 ? await F.fellDo({ tree: q[0], through: true, misses: 9, secs: 9 }, beside(q), "Tester A") : lost;
    const noRoot = await F.fellRoot(q[0]);
    ok("a tree down for its logs alone; and its stump is not woken with a plain axe: refused by the rule, not out of reach", lostAt.ok && downAt.ok && down.ok && down.felled[0]?.id === q[0] && down.felled[0].timber === 0 && !noRoot.ok && noRoot.why !== "away", { lostAt, downAt, down, noRoot });
    await sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,0}', '{"item": "axe", "n": 1, "plus": 10, "opts": ["axGrain", "axKeen", "axRoot"]}'::jsonb) where member_id = $1`, [a]);
    await settled(F);
    const woke = await F.fellRoot(q[0]);
    ok("…with the axe that can, it is woken through the keeper: counted, gone from the page at once, and the room told again", woke.ok && woke.left >= 0 && !F.trees().down.some((d) => d.id === q[0]) && told.join() === "trees,trees,trees", { woke, told });
    F.record({ game: "felling", board: "felling", at: F.now(), won: true, secs: 9, spent: false, buff: null, what: "pine", need: 8, hits: 8, misses: 0 });
    await sleep(400);
    ok("a go at the board is told to the log of goes under the game's own name", Number((await sql(`select count(*)::int as n from public.town_tries where member_id = $1 and game = 'felling' and board = 'felling'`, [a]))[0].n) === 1);
    await sql(`update public.town_knobs set value = 0 where key = 'far_open'`);
    const late = await F.fellBegin(q[0], beside(q));
    ok("closed again by its knob: a tree refused is the far side shut to me, not the game: no tree is offered any more, and nothing of the game is lost",
      !late.ok && late.why === "away" && F.far() === false && F.trees() === null && F.open() === true && F.ready(), { late, far: F.far(), open: F.open() });
    const bought = await F.buy("worm", 1);
    ok("…and a deed of the town's is answered as before", bought.ok || bought.why !== "away", bought);
    stopG();
    F.close(); G.close();
    await sql(`update public.town_knobs set value = $1 where key = 'far_open'`, [farWas]);
  } else {
    const O = new DbKeeper(a, askAs("A"));
    await settled(O);
    await sleep(300);
    const none = await O.fellBegin(0, [0, 0]);
    ok("a database with no trees: the keeper knows of none, asks for none, and no deed at one is sent", O.trees() === null && O.far() === false && !none.ok && none.why === "none" && !asked.some((x) => /town_trees|town_fell/.test(x)), { trees: O.trees(), none });
    O.close();
  }

  // ── the lamp relay ── (v163, a draft or run: a database before it has no lamps, and the keeper knows of none. How long a flame
  // lives and how many posts a map has are the code's own numbers, read here and never written: v167 and v168 changed both)
  if ((await sql(`select to_regprocedure('public.town_lamps_read()') is not null as there`))[0].there) {
    section("the lamp relay at dusk: a flame from the fire through two keepers to a post, its seconds by the database's clock, tired hands, the last lamp of a map (v163, v167, v168)");
    const { LAMPS, nightOf, nightBegins, leftOf } = await import("@/lib/town/lamps");
    const FIRE = [LAMPS.maps.farm.fire[0] + 1, LAMPS.maps.farm.fire[1] + 1], POST = (i) => LAMPS.maps.farm.posts[i], OF = LAMPS.maps.farm.posts.length;
    const hands = async (id, left = 100, hand = null) => {
      await purse(id, 0, hand ? [{ item: hand, n: 1 }] : []);
      await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)) where member_id = $1`, [id, hand, left]);
    };
    const staminaOf = async (id) => Number((await sql(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [id]))[0].n);
    const pointsOf = async (id) => Number((await sql(`select coalesce((select (w.kept->>'points')::float8 from public.town_work w where w.member_id = $1 and w.line = 'helpers'), 0) as p`, [id]))[0].p);
    // (the stand-in's clock is put into tonight for this, and back where it was afterwards)
    const nowDb = Number((await sql(`select town.now_ms() as n`))[0].n), OUT = (LAMPS.life + LAMPS.grace) * 1000 + 500;
    const ahead = nightOf(nowDb) === null ? nightBegins(nowDb) - nowDb + 3.5 * 3_600_000 : 0;
    if (ahead) await skip(ahead);
    await sql(`delete from public.town_lamps_lit where true`);
    await sql(`delete from public.town_lamp_nights where true`);
    await sql(`delete from public.town_lamp_flames where true`);
    await sql(`delete from public.town_work_carried where true`);
    for (const id of [a, b]) await hands(id);
    const I = new DbKeeper(a, askAs("A")), J = new DbKeeper(b, askAs("B"));
    await settled(I); await settled(J);
    const told = [];
    I.onDeed = (what, to) => { told.push(`${what} ${to}`); };
    J.onDeed = (what, to) => { told.push(`${what} ${to}`); };
    ok("as the game begins the keeper has the lamps: tonight, none lit on either map, no flame", I.lamps()?.night === nightOf(I.now()) && I.lamps().night !== null && I.lamps().maps.farm.lit.length === 0 && I.lamps().maps.forest.lit.length === 0 && I.lamps().flame === null, I.lamps());
    let did = await I.flameTake("farm", [0, 0]);
    ok("a flame is not taken from far off: the tile is the page's word, held to the fire's", !did.ok && did.why === "far", did);
    did = await I.flameTake("farm", FIRE);
    ok("taken at the fire: the keeper has it at once with the moment it dies, its seconds on by the database's clock, for nothing, and nobody told through the room",
      did.ok && I.lamps().flame?.until === did.until && Math.abs(leftOf(I.lamps().flame, I.now()) - LAMPS.life * 1000) < 1500 && (await staminaOf(a)) === 100 && told.length === 0, { did, flame: I.lamps().flame, now: I.now(), told });
    did = await I.flameTake("farm", FIRE);
    ok("no second flame while one is alive", !did.ok && did.why === "held", did);
    const before = [await pointsOf(a), await pointsOf(b)];
    did = await I.flamePass(b);
    ok("handed on: my hands are empty at once, it cost nothing, and whoever took it is to be told through the room", did.ok && I.lamps().flame === null && (await staminaOf(a)) === 100 && told.join() === `lamps ${b}`, { did, told });
    ok("the taker's keeper knows nothing of it yet", J.lamps().flame === null);
    // (the room's word, as the map would hand it on)
    J.nudged("lamps"); await settled(J);
    ok("…told by the room it reads the lamps again, and bears the flame, fresh", J.lamps().flame?.hands === 2 && leftOf(J.lamps().flame, J.now()) > LAMPS.life * 1000 - 1500, J.lamps().flame);
    did = await J.lampLight("farm", 0, [0, 0]);
    ok("a post is not lit from far off, and the flame is still its bearer's", !did.ok && did.why === "far" && !!J.lamps().flame, did);
    did = await J.lampLight("farm", 0, POST(0));
    ok(`a post lit: one of ${OF}, one stamina the lighter's, the flame spent, and every page to be told through the room`,
      did.ok && did.n === 1 && did.of === OF && !did.full && J.lamps().flame === null && J.lamps().maps.farm.lit.map((l) => l.post).join() === "0" && (await staminaOf(b)) === 100 - LAMPS.cost && told.at(-1) === "lamps undefined", { did, told });
    ok("…three helpers' points to both whose hands the flame went through", (await pointsOf(a)) === before[0] + LAMPS.point && (await pointsOf(b)) === before[1] + LAMPS.point, [await pointsOf(a), await pointsOf(b)]);
    I.nudged("lamps"); await settled(I);
    ok("…and the other keeper, told by the room, has it lit with the hands its flame came by, and the night's lighters in the order they came",
      I.lamps().maps.farm.lit[0]?.hands.map((h) => h.id).join() === `${a},${b}` && I.lamps().maps.farm.lighters.map((h) => h.id).join() === `${a},${b}`, I.lamps().maps.farm);
    // (a flame that is lit with nothing goes out by the database's clock: its seconds and the second of grace)
    did = await I.flameTake("farm", FIRE);
    await skip(OUT);
    const gone = await I.lampLight("farm", 1, POST(1));
    ok("a flame goes out by the database's clock: past its seconds and the second of grace it lights nothing, and nothing is lost", did.ok && !gone.ok && gone.why === "out" && (await staminaOf(a)) === 100 && I.lamps().flame === null, { did, gone });
    await hands(a, 0);
    await I.lampsLook();
    did = await I.flameTake("farm", FIRE);
    const tired = did.ok ? await I.lampLight("farm", 1, POST(1)) : did;
    ok("with no stamina a flame is taken and a post lit all the same", did.ok && tired.ok && tired.n === 2 && (await staminaOf(a)) === 0, { did, tired });
    // (the last lamp of the map: all but one more lit by nobody, then the last)
    for (let post = 2; post < OF - 1; post++) await sql(`insert into public.town_lamps_lit (night, map, post) values (town.lamp_night(town.now_ms()), 'farm', $1)`, [post]);
    await J.lampsLook();
    did = await J.flameTake("farm", FIRE);
    const last = did.ok ? await J.lampLight("farm", OF - 1, POST(OF - 1)) : did;
    const more = [await J.flameTake("farm", FIRE), await J.flameTake("forest", LAMPS.maps.forest.fire)];
    ok("the map's last post says so, the night is counted whole, and the fire gives no more flame for that map though the other map's does",
      did.ok && last.ok && last.n === OF && last.full === true && J.lamps().maps.farm.full === 1 && more[0].why === "whole" && more[1].ok === true, { did, last, more });
    I.close(); J.close();
    await skip(-ahead - OUT);
  } else {
    const O = new DbKeeper(a, askAs("A"));
    await settled(O);
    const none = await O.flameTake("farm", [0, 0]);
    ok("a database with no lamps: the keeper knows of none, and a flame asked for could not be reached", O.lamps() === null && !none.ok && none.why === "away", { lamps: O.lamps(), none });
    O.close();
  }

  // ── mining ── (v164, a draft or run: the mountain's rocks and the cave. A database before it keeps no cave, and the keeper is told of none)
  if ((await sql(`select to_regprocedure('public.town_mine(integer, integer, integer, integer, double precision, text)') is not null as there`))[0].there) {
    section("the mountain's rocks and the cave (v164)");
    const MN = await import("@/lib/town/mining"), VN = await import("@/lib/town/vein"), { caveLayout } = await import("@/lib/town/mining-row");
    const PICK = { item: "pick", n: 1 };
    const was = (await sql(`select value from public.town_knobs where key = 'far_open'`))[0]?.value ?? 0;
    await sql(`update public.town_knobs set value = 1 where key = 'far_open'`);
    const day = (await sql(`select town.day_of(town.now_ms()) as d`))[0].d, word = (await sql(`select town.mine_word() as w`))[0].w;
    for (const who of [a, b]) { await purse(who, 0, [PICK]); await sql(`update public.town_purses set doc = doc || '{"hand": "pick", "handAt": 0}'::jsonb where member_id = $1`, [who]); }
    const M = new DbKeeper(a, askAs("A")), N = new DbKeeper(b, askAs("B")), nudged = [];
    N.onDeed = (what, to) => { nudged.push([what, to]); };
    await settled(M); await settled(N);
    await sql(`delete from public.town_cave_days where day = $1`, [day]);
    await M.caveLook(0, null);
    ok("a day whose floors the site has not laid: the keeper is told so and keeps nothing of the cave (it asks the site to lay them: there is none here)", M.cave() === null && asked.filter((x) => x === "A town_cave").length === 1, M.cave());
    // (laid as the site's server lays it: the thirty floors from the code's own generator)
    await sql(`insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`,
      [day, JSON.stringify(Array.from({ length: MN.MINING.floors }, (_, i) => caveLayout(i + 1, day)))]);
    const foot = (await sql(`select town.cat('mining')->'rocks' as r`))[0].r.map(([id, x, y]) => ({ id, x, y }));
    const rock = foot.find((q) => !foot.some((o) => o.x === q.x + 1 && o.y === q.y)), at = [rock.x + 1, rock.y], need = MN.swingsFor(PICK, 0, false);
    await M.caveLook(0, at);
    ok("laid: the keeper is told of the cave: the day, no rock gone, nobody deepest", M.cave()?.day === day && Object.keys(M.cave().gone).length === 0 && M.caveBoard() === null, M.cave());
    let did = await M.mineDo(0, rock.id, at, need / 2, "Tester A");
    ok("half a rock's swings through the keeper: it stands, half of it struck away, and the keeper has it so at once", did.ok && did.part === 0.5 && did.broke.length === 0 && M.cave().struck?.[String(rock.id)]?.part === 0.5, did);
    did = await N.mineDo(0, rock.id, at, need, "Tester B");
    ok("the other's swings break it: they lent a hand, whoever struck it first is paid, the rock is gone on the keeper at once, and the room is to tell the first that their purse changed",
      did.ok && did.helped === true && did.paid === a && did.broke.join() === String(rock.id) && N.cave().gone["0"]?.includes(rock.id) && nudged.some(([what, to]) => what === "line" && to === a), { did, nudged });
    await settled(M);
    ok("…whose purse has the stone when it is next read", slotOf(M, "stone") >= 0 && M.purse().mine?.paid?.rock === rock.id, M.purse().mine);
    // a vein: found by the code's own roll with the database's word, opened and played through the keeper
    await skip(5000);
    await settled(M);
    let hit = null;
    for (let f = 1; f <= 9 && !hit; f++) {
      const rocks = caveLayout(f, day).rocks.map(([id, x, y]) => ({ id, x, y })), today = { way: MN.wayRockOf(word, f, day, rocks, null), crystal: null };
      const r = rocks.find((q) => { const h = MN.holdsOf(word, f, q.id, MN.turnOf(M.now()), today, PICK); return h.kind === "vein" && !h.gem; });
      if (r) hit = { f, r };
    }
    did = await M.mineDo(hit.f, hit.r.id, [hit.r.x + 1, hit.r.y], 99, "Tester A");
    ok("a rock that hides a vein, broken through the keeper: the vein is the keeper's at once, with no look in between", did.ok && typeof did.vein?.seed === "number" && M.cave().vein?.seed === did.vein.seed && M.cave().place === hit.f && !("fire" in did), did);
    const face = VN.faceOf(did.vein.seed, false), best = VN.bestRoute(face, did.vein.mods), played = await M.veinDo(best.strikes), told = sent.filter((x) => x.fn === "town_vein").pop();
    ok("the vein played through the keeper: the database gives what the go passes on the face, and the vein is played out on the keeper at once", played.ok && played.passed === best.passed && played.of === face.points.length && M.cave().vein === null
      && slotOf(M, MN.oreOf(hit.f)) >= 0, played);
    ok("…told to the database as the page's account of the go, never as bare strikes", told?.args.p_go?.seed === did.vein.seed && told.args.p_go.struck === best.strikes.length && told.args.p_strikes === undefined, told);
    // the rest: each reaches the database and is answered by its rule (the rules themselves are the dry run's)
    const arrive = caveLayout(1, day).arrive;
    const rest = [await M.minePeek(0, foot[1].id), await M.liftRide(0), await M.liftRide(10), await M.torchDown(arrive), await M.drillDo(arrive, "Tester A")];
    await M.caveReach(10);
    ok("looking into a rock, the lift, a torch and breaking through a floor each reach the database and are answered by its rule; a floor come to is told", rest.map((r) => (r.ok ? "ok" : r.why)).join() === "tool,ok,none,tool,tool" && rest[1].at === null
      && sent.some((x) => x.fn === "town_cave_reach" && x.args.p_floor === 10) && (M.cave().rests ?? []).length === 0, rest);
    const deeds = Object.fromEntries((await sql(`select what, count(*)::int as n from public.town_deeds where what in ('mine', 'hew', 'vein', 'lift') group by 1`)).map((r) => [r.what, r.n]));
    ok("what was done was written down by the functions themselves: two rocks mined, a hand lent, a vein, a ride", deeds.mine === 2 && deeds.hew === 1 && deeds.vein === 1 && deeds.lift === 1, deeds);
    M.close(); N.close();
    await sql(`update public.town_knobs set value = $1 where key = 'far_open'`, [was]);
  } else {
    const O = new DbKeeper(a, askAs("A"));
    await settled(O);
    await O.caveLook(0, null);
    ok("a database that keeps no cave: the keeper is told of none", O.cave() === null && O.caveBoard() === null);
    O.close();
  }
  // ── end: mining ──

  // ── forging ── (v174's smith part, a draft or run: a database before it has no smith, and the keeper offers none)
  if ((await sql(`select to_regprocedure('public.town_smith_open()') is not null as there`))[0].there) {
    section("the blacksmith: offered only once he is open; pieces smelted, a friend at the bellows, a try, a move, the great fire's row, a counted option; shut again (v174)");
    const FORGE = (await sql(`select town.cat('forge') as k`))[0].k, KS = FORGE.smith, copper = FORGE.smelts.of.oreCopper;
    const was = Object.fromEntries((await sql(`select key, value from public.town_knobs where key in ('far_open', 'smith_open')`)).map((r) => [r.key, Number(r.value)]));
    // (the far side's answer and then the smith's are asked past the line of questions: a moment for each, and for what is asked on their yes)
    const begun = async (k) => { for (let i = 0; i < 3; i++) { await settled(k); await sleep(300); } };
    const bagOf = (id, coins, bag) => purse(id, coins, bag);
    const POT = { item: "pot", n: 1, plus: 7, opts: ["ckFire", "ckBase"] }, sticker = FORGE.tries.reduce((n, x) => n + (x.to <= 7 ? x.fee : 0), 0), fee = Math.max(KS.move.least, Math.ceil((KS.move.share * sticker) / (100 * FORGE.lines.kitchen.length)));
    await sql(`update public.town_knobs set value = 1 where key = 'far_open'`);
    await sql(`update public.town_knobs set value = 0 where key = 'smith_open'`);
    await sql(`delete from public.town_smiths where true`);
    await sql(`update public.town_great_fire set doc = '{}'::jsonb where one`);
    await bagOf(a, 5000, [POT, { item: "grill", n: 1 }, { item: "shardCopper", n: 40 }, { item: "timber", n: 20 }, { item: "pick", n: 1 }]);
    await bagOf(b, 0, []);
    let from = asked.length;
    const shut = new DbKeeper(a, askAs("A"));
    await begun(shut);
    const none = await shut.smithSmelt("oreCopper", 1);
    shut.smithLook();
    await settled(shut);
    ok("the smith closed: a member's keeper asks once whether he is open, is told no, offers nothing of him and sends no deed of his; the game and the far side are theirs all the same",
      shut.far() === true && shut.smith() === null && shut.fire() === null && shut.open() === true && !none.ok && none.why === "away"
      && asked.slice(from).filter((x) => /town_smith|town_fire/.test(x)).join() === "A town_smith_open", asked.slice(from).filter((x) => /town_smith|town_fire/.test(x)));
    shut.close();
    await sql(`update public.town_knobs set value = 1 where key = 'smith_open'`);
    const S = new DbKeeper(a, askAs("A")), H = new DbKeeper(b, askAs("B")), nudged = [];
    H.onDeed = (what, to) => { nudged.push([what, to]); };
    await begun(S); await begun(H);
    ok("opened by its knob: the keeper is told yes, and has what the member has at the smith, the village's board, and the great fire as a page may know it (seven things, none of them a moment)",
      S.smith() !== null && S.smith().smithy.queue.length === 0 && JSON.stringify(S.smith().board) === JSON.stringify({ tops: {}, found: {} }) && S.fire()?.lit === true && S.fire().mine === 0 && S.fire().daily?.used === false
      && Object.keys(S.fire()).sort().join() === "daily,flint,lit,mine,open,row,tinder,topped", [S.smith(), S.fire()]);
    let did = await S.smithSmelt("oreCopper", 2);
    ok("two pieces put in through the keeper: paid for, and in the keeper's queue at once, by the database's clock", did.ok && did.fee === 2 * copper.fee && S.smith().smithy.queue.length === 2 && S.purse().coins === 5000 - 2 * copper.fee
      && Math.abs(S.smith().smithy.queue[0].from - S.now()) < 1500, did);
    const near = await H.smithNear([a, b]), off = Math.round(copper.mins * 60_000 * KS.bellows.share);
    did = await H.smithBellows(a);
    ok("the other member's keeper sees whose piece smelts and presses the bellows: the press's share is off it, and the room is to tell the owner", near.length === 1 && near[0].id === a && near[0].piece.piece === "oreCopper" && near[0].left === KS.bellows.each
      && did.ok && did.off === off && nudged.some(([what, to]) => what === "line" && to === a), { near, did: { ...did, purse: undefined }, nudged });
    from = asked.length;
    S.nudged("line");
    await begun(S);
    ok("…at the room's word the owner's keeper reads the smith again, a piece of theirs smelting: it ends sooner there too", S.smith().smithy.queue[0].blown === 1 && asked.slice(from).includes("A town_smith"), [S.smith().smithy.queue, asked.slice(from)]);
    await skip((copper.mins + 1) * 60_000);
    did = await S.smithTake();
    ok("its minutes on, what is done is taken through the keeper, and is in the purse it keeps", did.ok && did.got.join() === "oreCopper,1" && slotOf(S, "oreCopper") >= 0 && S.smith().smithy.queue.length === 1, { ...did, purse: undefined });
    did = await S.smithTry(slotOf(S, "pick"));
    const told = sent.filter((x) => x.fn === "town_smith_try").pop();
    ok("a try through the keeper: the database's own chance and nothing sent but the slot; the tool in the purse it keeps is at +1", did.ok && did.out === "taken" && did.level === 1 && S.purse().bag[slotOf(S, "pick")].plus === 1
      && Object.keys(told.args).join() === "p_slot", { did: { ...did, purse: undefined }, told });
    const stand = FORGE.stand.at.map(Math.floor), away = await S.smithMove(0, 1, { at: [1, 1], playing: false });
    did = await S.smithMove(0, 1, { at: stand, playing: false });
    ok("a move through the keeper: refused from far off, made by the forge for its fee; both tools in the purse it keeps", !away.ok && away.why === "far" && did.ok && did.fee === fee && did.spilt === 0 && S.purse().bag[1].plus === 7 && !S.purse().bag[0].plus
      && S.purse().coins === 5000 - 2 * copper.fee - FORGE.tries[0].fee - fee, [away, { ...did, purse: undefined }]);
    let row = await S.fireJoin("a name the page says");
    ok("the great fire's row is for whoever has a tool one level under the top: refused, `level`", !row.ok && row.why === "level" && S.fire().row.length === 0, row);
    await sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,0}', $2::jsonb) where member_id = $1`, [a, JSON.stringify({ item: "pot", n: 1, plus: FORGE.forge.top - 1, opts: ["ckFire", "ckBase"] })]);
    row = await S.fireJoin("a name the page says");
    ok("daily compatibility call creates no queue", row.ok && S.fire().mine === 0 && S.fire().row.length === 0 && S.fire().daily?.used === false, [row, S.fire()]);
    did = await S.smithTry(0);
    ok("missing top materials are refused without spending the daily right", !did.ok && did.why === "ore" && S.fire().daily?.used === false, did);
    await sql(`update public.town_purses set doc = jsonb_set(jsonb_set(doc, '{bag,4}', '{"item":"oreSilver","n":20}'::jsonb), '{bag,5}', '{"item":"timber","n":50}'::jsonb) where member_id = $1`, [a]);
    did = await S.smithTry(0);
    ok("top attempt accepted and daily right read back immediately", did.ok && S.fire().daily?.used === true && S.purse().forgeDay === S.fire().daily.day, did);
    await sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,1}', '{"item":"pot","n":1,"plus":9,"opts":["ckFire","ckBase"]}'::jsonb) where member_id = $1`, [a]);
    did = await S.smithTry(1);
    ok("another tool cannot spend the same day's right", !did.ok && did.why === "daily", did);
    row = await S.fireLeave();
    ok("no queue remains to leave", !row.ok && row.why === "none", row);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'bugNet', 'handAt', 2, 'powers', '{}'::jsonb) || jsonb_build_object('bag', jsonb_set(doc->'bag', '{2}', $2::jsonb)) where member_id = $1`,
      [a, JSON.stringify({ item: "bugNet", n: 1, plus: 10, opts: ["", "", "ntFreeze"] })]);
    await settled(S);
    const power = await S.toolPower("ntFreeze"), noPower = await S.toolPower("ntWide");
    ok("a counted option of the tool in the hand is counted by the database through the keeper; one the tool has not is not asked for", power.ok && power.left === FORGE.options.of.ntFreeze.use.n - 1 && S.purse().powers.ntFreeze.n === 1
      && !noPower.ok && noPower.why === "none" && sent.filter((x) => x.fn === "town_tool_power").length === 1, [power, noPower]);
    const deeds = Object.fromEntries((await sql(`select what, count(*)::int as n from public.town_deeds where what in ('smelt', 'smelted', 'bellows', 'forge', 'forge_move', 'fire_join', 'fire_leave', 'power') group by 1`)).map((r) => [r.what, r.n]));
    ok("what was done was written down by the functions themselves", deeds.smelt === 1 && deeds.smelted === 1 && deeds.bellows === 1 && deeds.forge === 2 && deeds.forge_move === 1 && !deeds.fire_join && !deeds.fire_leave && deeds.power === 1, deeds);
    await sql(`update public.town_knobs set value = 0 where key = 'smith_open'`);
    const gone = await S.smithWiden();
    ok("the smith shut again by his knob: a deed of his is refused, the keeper forgets him and the fire, and the game and the far side are theirs all the same", !gone.ok && gone.why === "away" && S.smith() === null && S.fire() === null && S.open() === true && S.far() === true, gone);
    S.close(); H.close();
    await sql(`update public.town_knobs set value = $1 where key = 'smith_open'`, [was.smith_open ?? 0]);
    await sql(`update public.town_knobs set value = $1 where key = 'far_open'`, [was.far_open ?? 0]);
  } else {
    const O = new DbKeeper(a, askAs("A"));
    await settled(O);
    ok("a database that has no smith: the keeper offers none, and no great fire", O.smith() === null && O.fire() === null && !asked.some((x) => /town_smith(?!_open)|town_fire/.test(x)));
    O.close();
  }
  // ── end: forging ──

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
    // (every line the code has, whatever the database lists: the far side's two are shown at nothing while the far
    // side is not open to this member, which it is not to a member here, with v164 or without)
    const mine = A.lines()?.lines ?? {}, farOpen = A.far();
    ok(`…and a keeper is told its own, every line there is (${ALL_LINE_IDS.length})${farOpen ? "" : `, the far side's ${MORE_LINE_IDS.length} at nothing while it is shut to them`}`,
      JSON.stringify(Object.keys(mine).sort()) === JSON.stringify([...ALL_LINE_IDS].sort()) && LINES_PLAYED.every((l) => mine[l].points > 0) && (farOpen || MORE_LINE_IDS.every((l) => mine[l].points === 0)), A.lines());
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
        // ── v153: the gifts of ranks 1 to 6, each new deed's way to the database ──
        if ((await sql(`select to_regprocedure('town.harder_at(integer)') is not null as there`))[0].there) {
          // What is tried is the wiring: that each deed reaches a function that is there, with the arguments it takes, and
          // that its answer is a rule's (done, or refused for a reason) and not "the town could not be reached". The rules
          // themselves are the dry run's. Every gift is put into the purse, the familiar changed as each deed needs.
          const gifts = (await sql(`select town.cat('gifts')->'gifts' as g`))[0].g, every = Object.keys(gifts);
          // (the gifts of the far side's two lines are in the catalog from v164 on, and are offered only once the far side is open to this member)
          const offered = every.filter((id) => A.far() || !MORE_LINE_IDS.includes(gifts[id].line)), held = every.filter((id) => !offered.includes(id));
          const withGifts = async (familiar) => { await sql(`update public.town_purses set doc = jsonb_set(doc, '{gifts}', $2::jsonb) where member_id = $1`,
            [a, JSON.stringify({ had: every, charms: ["charmHoe", "charmSickle"], owed: 0, familiar, used: {} })]); await settled(A); };
          const reached = (r) => !!r && (r.ok === true || (typeof r.why === "string" && r.why !== "away"));
          const tried = [];
          const ask = async (name, fn) => { let r; try { r = await fn(); } catch (e) { r = { threw: String(e?.message ?? e) }; } tried.push([name, r]); return r; };
          await withGifts("famGnome");
          ok(`the keeper offers every gift the database's catalog has of the lines open to it: ${offered.length} of ${every.length}${held.length ? `, the far side's ${held.length} held back while it is shut` : ""}`,
            offered.length >= 39 && offered.every((id) => A.gives(id)) && held.every((id) => !A.gives(id)), { missing: offered.filter((id) => !A.gives(id)), early: held.filter((id) => A.gives(id)) });
          const here = [plot[0], plot[1]];
          // the kitchen
          await ask("basketPut", () => A.basketPut(0, 1));
          await ask("basketTake", () => A.basketTake("riceBox", 1));
          await ask("basketEat", () => A.basketEat("riceBox", true));
          await ask("spoonAsk", () => A.spoonAsk([["rice", 1]]));
          await ask("spiceEat (a slot)", () => A.spiceEat({ slot: 0 }, true));
          await ask("spiceEat (the basket)", () => A.spiceEat({ dish: "riceBox" }, true));
          // the farm
          await ask("rowDo", () => A.rowDo(key, "Tester A", { [key]: true }));
          await ask("gnomeDo", () => A.gnomeDo(key));
          await ask("glassDo", () => A.glassDo(key));
          // the well
          await ask("drinkOffer", () => A.drinkOffer(b, here));
          await ask("drinkTake", () => B.drinkTake(a, here));
          await ask("drinkOffer (taken back)", () => A.drinkOffer(null, here));
          await withGifts("famFrog");
          await ask("rainFill", () => A.rainFill());
          await ask("moonKeep", () => A.moonKeep());
          await ask("moonPour", () => A.moonPour(1, here));
          // the forest
          await ask("mapUse", () => A.mapUse());
          await ask("mapDig", () => A.mapDig([190, 150]));
          // the insects
          await ask("nectarDrop", () => A.nectarDrop([30, 30]));
          await ask("netMine (lured)", () => A.netMine("lured", [30, 30], { misses: 0 }, "Tester A"));
          await ask("netMine (pair)", () => A.netMine("pair", [30, 30], { misses: 0 }, "Tester A"));
          // the deck (a line is out after each cast: let go, so that the next finds the water free)
          await ask("orbLight", () => A.orbLight("night"));
          await ask("cast (two lines)", () => A.cast("worm", { tile: deck, deep: true }, false, false, "pair"));
          await A.missed();
          await ask("cast (stardust)", () => A.cast("worm", { tile: deck, deep: true }, false, false, "star"));
          await A.missed();
          // the helpers (in somebody else's bed)
          await ask("pourDo", () => A.pourDo(key, "Tester A", { [key]: true }));
          await ask("ringTo", () => A.ringTo(b, 1, "Tester A"));
          await ask("dustDo", () => A.dustDo(key, "Tester A"));
          const lost = tried.filter(([, r]) => !reached(r));
          ok(`each new deed of the gifts reaches the database and is answered by its rule (${tried.length} deeds)`, lost.length === 0, lost);
          const done = tried.filter(([, r]) => r?.ok === true).map(([n]) => n);
          ok("…and some of them are done outright, the purse kept at once", done.length >= 3 && A.purse().gifts.had.length === every.length, { done, why: tried.filter(([, r]) => r?.ok !== true).map(([n, r]) => `${n}: ${r?.why ?? JSON.stringify(r)}`) });
          await sql(`update public.town_purses set doc = jsonb_set(doc, '{gifts}', '{"had":["charmHoe","famGnome"],"charms":["charmHoe"],"owed":0,"familiar":"famGnome","used":{}}'::jsonb) where member_id = $1`, [a]);
          await settled(A);
        }
        // ── (v153's deeds end) ──
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
