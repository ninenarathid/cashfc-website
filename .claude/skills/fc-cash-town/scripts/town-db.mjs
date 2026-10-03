// Cash Town's game as a member will play it, tried in a real browser before anything is pushed: the dev test room
// kept not by the browser's trial but by the database's keeper (lib/town/keeper.ts), asking a stand-in for the
// database (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not
// touched: there is one Supabase project, and this is how the game is played against the database's own rules first.
//
// First the game shut, as it goes up (v115's knob at 0, and `&townSites=1`: the deck and the cooking yard as the
// building sites production begins with): no bag, no deck to stand on. Then opened: the bag, and the deck finished.
// Then two testers in two tabs: the bank and the stall through their panels; a line dropped, struck and fought with the
// database deciding what bit; a plot cleared, tilled and sown, which the other sees when the room says the farm
// changed; a dish cooked and its pot ladled from by the other; a deal between the two.
//
//   node scripts/db/town-bench.mjs            (in a scratch folder, see scripts/db/README.md: leave it running)
//   node town-db.mjs <base> <outdir> [bench]  (http://localhost:3100  .  http://127.0.0.1:3199)
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3199"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };

const K = "window.__townKeeper", FISH = `document.querySelector('[aria-labelledby="town-fish-h"]')`;
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`, TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`;
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const skip = (ms) => post("/bench/skip", { ms });
const purse = (X) => X.evaluate(`${K}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const slotOf = (X, item) => X.evaluate(`${K}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
/** Read my purse again from the stand-in (after it was set up by hand there). */
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(150); };
const hold = async (X, item) => { await X.evaluate(`${K}.hold(${await slotOf(X, item)}).then(() => null)`); await sleep(400); };
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const press = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const enterKey = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); };
/** Tap a shopkeeper on the map, and go through what they say until there is something to choose. */
async function talkTo(X, who) {
  await X.evaluate(`window.__townView.lookAt(46, 27.2)`);
  await sleep(900);
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  const k = (await X.evaluate(`window.__townView.keepers()`)).find((b) => b.id === who);
  await click(X, r.x + (k.x0 + k.x1) / 2, r.y + (k.y0 + k.y1) / 2);
  await until("the talk opens", () => X.evaluate(`!!${TALK}`), 4000);
  for (let i = 0; i < 8 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) { await enterKey(X); await sleep(160); }
  return X.evaluate(`${TALK}?.innerText.replace(/\\s+/g, " ") ?? ""`);
}
/** Play the game of timing with a steady hand. */
async function swing(X) {
  await until("the game of timing is up", () => X.evaluate(`!!window.__townTiming`), 4000);
  const end = Date.now() + 40000;
  while (Date.now() < end) {
    const done = await X.evaluate(`(() => { const t = window.__townTiming; if (!t) return true; const r = t.round();
      if (r.at > r.lo + r.width * 0.2 && r.at < r.lo + r.width * 0.8) t.press(); return false; })()`);
    if (done) return true;
    await sleep(8);
  }
  return false;
}
/** A hand on the reel. Says how it ended. */
async function fight(X) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    const f = await X.evaluate(`(() => { const f = window.__townFish?.fight(); if (!f) return null;
      const on = f.t >= f.surge.from - 0.3 && f.t < f.surge.to;
      window.__townFish.hold(f.tension < f.lo + (f.hi - f.lo) * (on ? 0.25 : 0.5)); return { over: f.over }; })()`);
    if (!f) break;
    await sleep(20);
  }
  await until("the fight is over", () => X.evaluate(`window.__townFish.phase() === "result"`), 8000);
  return X.evaluate(`window.__townFish.result()`);
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready() && ${K}.open() === true`), 30000);
  return X.evaluate(`${K}.id`);
}
/** A member as new: no purse, nothing changed this week, nothing of theirs standing about. */
async function fresh(id) {
  const [{ character_id }] = await sql(`select character_id from public.profiles where id = $1`, [id]);
  await sql(`delete from public.town_lines where member_id = $1`, [id]);
  await sql(`delete from public.town_pots where member_id = $1`, [id]);
  await sql(`update public.town_deals set ended = 'off', ended_at = town.now_ms() - 60000 where ended is null and (a = $1 or b = $1)`, [id]);
  await sql(`delete from public.town_beds where member_id = $1`, [id]);
  await sql(`delete from public.town_exchanges where member_id = $1`, [id]);
  await sql(`delete from public.town_changed where character_id = $1`, [character_id]);
  await sql(`delete from public.town_purses where member_id = $1`, [id]);
  return character_id;
}
const setPurse = (id, coins, bag, more = {}) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [id, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)]);

if (!(await fetch(`${BENCH}/bench/who?as=check`).then((r) => r.ok).catch(() => false))) {
  console.log(`no stand-in database at ${BENCH}: start scripts/db/town-bench.mjs first (see scripts/db/README.md)`);
  process.exit(2);
}
const X = await browser("DbA", { width: 1280, height: 860 });
try {
  // a first visit, to learn who the tester is there; then begun again as new
  let a = await enter(X, "Dq");
  const charA = await fresh(a);
  await X.goto("about:blank");
  a = await enter(X, "Dq");

  console.log("shut, then open");
  const hasBag = () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.title === "กระเป๋า")`);
  const sites = `${BASE}/town?townTest=Dq&townRoom=check&townHour=12&townWeather=clear&townSites=1&townDb=${encodeURIComponent(BENCH)}`;
  await sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  await X.goto("about:blank");
  await X.goto(sites);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await sleep(2500);
  ok("shut: the town is there, with no bag on the map", !(await hasBag()) && !(await X.evaluate(`!!${K}`)));
  ok("…and the deck and the yard are building sites: no board of the deck to stand on", (await X.evaluate(`window.__townView.built()`)) === false && (await X.evaluate(`window.__townView.walkable(17, 42)`)) === false);
  await X.evaluate(`window.__townView.lookAt(22, 42)`);
  await sleep(700);
  await X.shot(`${OUT}/db-shut.png`);
  await sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  await X.goto("about:blank");
  await X.goto(sites);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("opened: the bag is on the map", hasBag, 20000);
  ok("opened by the owner: the bag is on the map at the next visit", await hasBag());
  ok("…and the deck and the yard are finished: the deck is a place to stand", (await X.evaluate(`window.__townView.built()`)) === true && (await X.evaluate(`window.__townView.walkable(17, 42)`)) === true);
  await X.evaluate(`window.__townView.warp(17, 42)`);
  await X.evaluate(`window.__townView.lookAt(22, 42)`);
  await sleep(900);
  await X.shot(`${OUT}/db-open.png`);
  await X.goto("about:blank");
  a = await enter(X, "Dq");

  console.log("the game, kept by the database");
  ok("the keeper is the database's: no trial behind it", await X.evaluate(`${K}.trial === null && window.__townTrade === ${K}`));
  ok("a member's purse as new: ten empty slots, no coins, thirty popoto, none from pictures", await X.evaluate(`(() => { const p = ${K}.purse(); return p.bag.length === 10 && p.bag.every((s) => !s) && p.coins === 0 && p.popoto.profile === 30 && p.popoto.gallery === 0; })()`), await purse(X));
  ok("the bag's button is on the map, and no test window's", await X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.title === "กระเป๋า") && ![...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Test")`));

  // the banker: real popoto, as the database counts them
  const asks = await talkTo(X, "banker");
  ok("the banker offers the exchange", /แลก popoto/.test(asks) && !/ยังไม่เปิด/.test(asks), asks);
  await enterKey(X);
  await until("the bank opens", () => X.evaluate(`!!${TRADE}`), 4000);
  const bank = await X.evaluate(`${TRADE}.innerText.replace(/\\s+/g, " ")`);
  ok("the bank offers popoto from the profile only, and its panel has no trial's foot", /Popoto จากโปรไฟล์/.test(bank) && !/Popoto จากรูป/.test(bank) && !/โหมดลอง/.test(bank), bank);
  await press(X, "มากสุด", TRADE); await sleep(150);
  await press(X, "แลก", TRADE);
  await until("the coins are in", async () => (await purse(X)).coins === 100, 5000).catch(() => null);
  let p = await purse(X);
  ok("twenty popoto become a hundred coins, and ten are left", p.coins === 100 && p.popoto.profile === 10 && p.changed.n === 20, p);
  const mark = await sql(`select c.popoto, (select public.popoto_count($1))::int as counted, (select count(*)::int from public.kudos k where k.receiver_character_id = $1) as given from public.town_changed c where c.character_id = $1`, [charA]);
  ok("…and the popoto board counts twenty fewer of theirs: the record of every one given stays", mark[0]?.popoto === 20 && mark[0].counted === mark[0].given - 20 && mark[0].given === 30, mark);
  await until("it says the week is used up", () => X.evaluate(`/สัปดาห์นี้แลกครบ/.test(${TRADE}.innerText)`), 3000).catch(() => null);
  ok("the week's twenty are used: it says so", await X.evaluate(`/สัปดาห์นี้แลกครบ/.test(${TRADE}.innerText)`));
  await X.shot(`${OUT}/db-bank.png`);
  await press(X, "ปิด", TRADE); await sleep(200);

  // the uncle: a rod and worms, through his panel
  const uncle = await talkTo(X, "uncle");
  ok("the uncle offers buying and selling", /ซื้อของ/.test(uncle) && /ฝากขาย/.test(uncle), uncle);
  await press(X, "ซื้อของ", TALK);
  await until("the stall opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await until("the shelf has come", () => X.evaluate(`${TRADE}.innerText.includes("คันเบ็ดไม้ไผ่")`), 5000);
  await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("คันเบ็ดไม้ไผ่")).querySelector("button:last-of-type").click()`);
  await until("the rod is bought", async () => (await has(X, "rod")) === 1, 5000).catch(() => null);
  await press(X, "เหยื่อ", TRADE); await sleep(250);
  await X.evaluate(`[...${TRADE}.querySelectorAll("li")].find((li) => li.innerText.includes("ไส้เดือน")).querySelector("button").click()`);
  await until("the worms are bought", async () => (await has(X, "worm")) >= 1, 5000).catch(() => null);
  p = await purse(X);
  ok("a rod and worms bought at the stall: paid for, in the bag, and the uncle says thanks", (await has(X, "rod")) === 1 && (await has(X, "worm")) >= 1 && p.coins < 40 && await X.evaluate(`/ขอบใจนะหลาน/.test(${TRADE}.innerText)`), p);
  await press(X, "ฝากขาย", TRADE);
  await until("today's order shows", () => X.evaluate(`/ลุงอยากได้|วันนี้/.test(${TRADE}.innerText)`), 5000).catch(() => null);
  ok("the uncle's order of the day is told (the whole village's, from the database)", await X.evaluate(`!!${K}.order() && ${K}.order().wants.length === 3`), await X.evaluate(`${K}.order()`));
  await X.shot(`${OUT}/db-stall.png`);
  await press(X, "ปิด", TRADE); await sleep(200);

  // fishing: what bites is the database's to say, at the strike
  console.log("fishing");
  await setPurse(a, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 8 }]);
  await again(X);
  await hold(X, "rod");
  await warp(X, 17, 42);
  await until("the deck is a place to fish from", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel is ready", () => X.evaluate(`window.__townFish?.phase() === "ready"`), 5000);
  ok("no trial's kit or short wait is offered", !(await X.evaluate(`/โหมดลอง/.test(${FISH}.innerText)`)));
  let landed = null, early = false, fights = 0;
  for (let go = 0; go < 6 && !landed; go++) {
    await until("ready to drop", () => X.evaluate(`["ready", "result"].includes(window.__townFish?.phase())`), 8000);
    if ((await X.evaluate(`window.__townFish.phase()`)) === "result") { await press(X, "หย่อนอีก", FISH); await sleep(200); }
    await press(X, "หย่อนเบ็ด", FISH);
    await until("the line is out", () => X.evaluate(`window.__townFish.phase() === "waiting"`), 5000);
    const c = await X.evaluate(`window.__townFish.cast()`);
    if (go === 0) {
      ok("the line is out: how long until the bite is told, never what is coming", c.wait > 0 && !("what" in c), c);
      await X.evaluate(`window.__townFish.strike()`);
      await until("too soon", () => X.evaluate(`window.__townFish.phase() === "result"`), 5000);
      early = (await X.evaluate(`window.__townFish.result().how`)) === "early";
      ok("struck at once: the database says nothing was on the hook yet", early);
      continue;
    }
    // the stand-in's clock put on to the bite: the float here has not gone under yet, but the database says it has
    await skip(Math.round(c.wait * 1000) + 200);
    await X.evaluate(`window.__townFish.strike()`);
    await until("the strike is answered", () => X.evaluate(`["fight", "result"].includes(window.__townFish.phase())`), 5000);
    if ((await X.evaluate(`window.__townFish.phase()`)) === "fight") {
      fights++;
      const res = await fight(X);
      if (res.how === "landed") landed = res;
    } else {
      const res = await X.evaluate(`window.__townFish.result()`);
      if (go === 1) ok("what comes in with no fight is named at the strike", res.how === "landed" && typeof res.what === "string", res);
    }
  }
  ok("a fish hooked at the bite, by the database's clock, and fought", fights > 0, { fights });
  if (landed) ok("landed: in the bag, as the database kept it", (await has(X, landed.what)) >= 1 && landed.kept === true, { landed, bag: (await purse(X)).bag.filter(Boolean) });
  const plays = await sql(`select doc->>'how' as how, game from public.town_plays where member_id = $1 order by id`, [a]);
  ok("every go is written down by the database itself: the early strike, and each fight's end", plays.length >= 2 && plays[0].how === "early" && plays.every((x) => x.game === "fishing"), plays);
  await X.shot(`${OUT}/db-fish.png`);
  await press(X, "ปิด", FISH); await press(X, "พอแล้ว", FISH); await sleep(300);
  await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });

  // a second tester, for what two do together
  const Y = await X.tab("DbB");
  let b = await enter(Y, "Dr");
  await fresh(b);
  await Y.goto("about:blank");
  b = await enter(Y, "Dr");
  ok("two members, each their own", a !== b && (await me(X)).id !== (await me(Y)).id);

  console.log("the farm");
  await sql(`delete from public.town_plots where x between 133 and 134 and y = 5`);
  await sql(`delete from public.town_beds where bed = town.bed_of(133, 5)`);
  await setPurse(a, 0, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 2 }]);
  await setPurse(b, 0, [{ item: "hoe", n: 1 }]);
  await again(X); await again(Y);
  await warp(X, 133, 5);
  await warp(Y, 136, 6);
  await hold(X, "hoe");
  await hold(Y, "hoe");
  await until("the hoe has weeds to clear", () => X.evaluate(`window.__townFarm?.deed() === "clear"`), 8000);
  await X.evaluate(`window.__townFarm.act()`);
  ok("the weeds are cleared by the game of timing", await swing(X));
  await until("the plot is cleared", () => X.evaluate(`window.__townFarm.seen("133,5").soil === "cleared"`), 6000);
  await X.evaluate(`window.__townFarm.act()`);
  await swing(X);
  await until("the plot is tilled", () => X.evaluate(`window.__townFarm.seen("133,5").soil === "tilled"`), 6000);
  await hold(X, "seedKangkong");
  await until("the seed can be sown", () => X.evaluate(`window.__townFarm.deed() === "sow"`), 6000);
  await X.evaluate(`window.__townFarm.act()`);
  await until("the seed is in", () => X.evaluate(`window.__townFarm.seen("133,5").crop === "kangkong"`), 6000);
  const plot = await sql(`select soil, plant->>'crop' as crop, plant->>'by' as by from public.town_plots where x = 133 and y = 5`);
  ok("cleared, tilled and sown: the plot is the database's now, and the bed its sower's", plot[0]?.soil === "tilled" && plot[0].crop === "kangkong" && plot[0].by === a
    && (await X.evaluate(`window.__townFarm.owners().some((o) => o.by === ${JSON.stringify(a)})`)), plot);
  const seenByB = await until("the other sees the plant", () => Y.evaluate(`window.__townFarm?.seen("133,5").crop === "kangkong"`), 12000).catch((e) => e.message);
  ok("the other tester, on the farm, sees it within moments: the room said the farm changed, and they asked", seenByB === true, seenByB);
  await warp(Y, 133, 5);
  await sleep(600);
  ok("…and their hoe has nothing to do in a bed that is somebody's", (await Y.evaluate(`window.__townFarm.deed()`)) === null, await Y.evaluate(`window.__townFarm.deed()`));
  await X.shot(`${OUT}/db-farm.png`);

  console.log("the kitchen");
  await setPurse(a, 0, [{ item: "pan", n: 1 }, { item: "minnow", n: 3 }, { item: "salt", n: 1 }], { hand: "pan" });
  await setPurse(b, 0, [{ item: "bowl", n: 2 }]);
  await again(X); await again(Y);
  const stove = await X.evaluate(`(() => { const k = window.__townCook; const p = k.places().find((x) => x.kind === "stove") ?? k.places()[0]; return p.stand ?? p.at ?? p.tiles?.[0] ?? null; })()`);
  await X.evaluate(`window.__townCook.places().length`);
  if (stove) await warp(X, stove[0], stove[1]);
  await until("cooking is offered at the stove", () => X.evaluate(`window.__townCook.offers().includes("cook")`), 8000).catch(() => null);
  ok("at a stove with a pan in the hand, cooking is offered", await X.evaluate(`window.__townCook.offers().includes("cook")`), { stove, offers: await X.evaluate(`window.__townCook.offers()`) });
  await X.evaluate(`window.__townCook.act("cook")`);
  await sleep(300);
  await X.evaluate(`window.__townCook.put([["minnow", 3], ["salt", 1]])`);
  await sleep(200);
  await X.evaluate(`window.__townCook.go()`);
  await swing(X);
  await until("the dish is done", async () => (await has(X, "potFull")) === 1, 8000).catch(() => null);
  const found = await sql(`select doc from public.town_things where key = 'found'`);
  ok("three minnows and salt in a pan: a pot of fried minnow, and the find is the village's", (await has(X, "potFull")) === 1 && JSON.stringify(found[0]?.doc ?? []).includes("friedMinnow"), { bag: (await purse(X)).bag.filter(Boolean), found });
  await hold(X, "potFull");
  await warp(X, 44, 52);
  await warp(Y, 45, 52);
  await until("the pot can be set down", () => X.evaluate(`window.__townCook.offers().includes("down")`), 6000);
  await X.evaluate(`window.__townCook.act("down")`);
  await until("the pot stands there", () => X.evaluate(`window.__townCook.pots().length >= 1`), 6000);
  const potSeen = await until("the other sees the pot", () => Y.evaluate(`window.__townCook.pots().some((o) => o.dish === "friedMinnow")`), 12000).catch((e) => e.message);
  ok("the pot set down is seen by the other within moments", potSeen === true, potSeen);
  await until("a helping is offered", () => Y.evaluate(`window.__townCook.offers().includes("ladle")`), 6000).catch(() => null);
  await Y.evaluate(`window.__townCook.act("ladle")`);
  await until("the helping is in the bag", async () => (await has(Y, "friedMinnow")) === 1, 6000).catch(() => null);
  ok("the other ladles a helping: the bowl goes with it", (await has(Y, "friedMinnow")) === 1 && (await has(Y, "bowl")) === 1, (await purse(Y)).bag.filter(Boolean));
  const left = await until("its owner sees a helping fewer", () => X.evaluate(`window.__townCook.pots().find((o) => o.dish === "friedMinnow")?.left === 1`), 12000).catch((e) => e.message);
  ok("…and its owner sees one helping fewer", left === true, left);
  await X.shot(`${OUT}/db-kitchen.png`);

  console.log("a deal");
  await setPurse(a, 30, [{ item: "worm", n: 3 }]);
  await setPurse(b, 0, [{ item: "minnow", n: 2 }]);
  await again(X); await again(Y);
  const idY = (await me(Y)).id;
  await X.evaluate(`window.__townDeal.open(${JSON.stringify(idY)}, "Dr").then(() => null)`);
  await until("the deal is open here", () => X.evaluate(`!!window.__townDeal.deal() && !window.__townDeal.deal().end`), 5000);
  const openForB = await until("the other is shown the deal", () => Y.evaluate(`!!window.__townDeal.deal() && !window.__townDeal.deal().end && !!document.querySelector('section[aria-label="แลกของ"]')`), 12000).catch((e) => e.message);
  ok("a deal opened by one is shown to the other within moments", openForB === true, openForB);
  await X.evaluate(`window.__townDeal.lay([["worm", 2]], 10).then(() => null)`);
  await Y.evaluate(`window.__townDeal.lay([["minnow", 1]], 0).then(() => null)`);
  await Y.evaluate(`window.__townDeal.agree(true).then(() => null)`);
  await until("the other's word is seen", () => X.evaluate(`window.__townDeal.deal()?.ok.b === true`), 8000).catch(() => null);
  await X.evaluate(`window.__townDeal.agree(true).then(() => null)`);
  await until("the other's purse has it", async () => (await has(Y, "worm")) === 2, 12000).catch(() => null);
  const pa = await purse(X), pb = await purse(Y);
  ok("both words given: two worms and ten coins for a minnow, in both purses", pa.coins === 20 && (await has(X, "minnow")) === 1 && (await has(X, "worm")) === 1 && pb.coins === 10 && (await has(Y, "worm")) === 2 && (await has(Y, "minnow")) === 1,
    { a: [pa.coins, pa.bag.filter(Boolean)], b: [pb.coins, pb.bag.filter(Boolean)] });
  const kept = await sql(`select ended from public.town_deals where (a = $1 and b = $2) order by id desc limit 1`, [a, b]);
  ok("…and the deal is kept, done", kept[0]?.ended === "done", kept);
  await X.shot(`${OUT}/db-deal.png`);

  const errors = [...(X.errors?.() ?? []), ...(Y.errors?.() ?? [])];
  ok("no page errors", errors.length === 0, errors.slice(0, 3));
} catch (e) {
  ok("the check ran", false, e.stack ?? e.message);
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
