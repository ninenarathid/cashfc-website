// A bag put in order as a member will have it, tried in a real browser before anything is pushed: the dev test room
// kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with v165 in it
// (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not touched.
//
// A member's bag is the database's: a thing pulled from slot to slot is moved in the purse the database keeps, more
// of one thing joined, the bag sorted by the button, the pot in the hand the same pot afterwards, and the page loaded
// again has the bag as it was left. A page asking a database that has not had v165 offers neither: no button, and a
// pull moves nothing.
//
//   node town-bench.mjs 3198     (in a scratch folder, see scripts/db/README.md: leave it running; while v165 is a draft beside its test and not in
//                                supabase/, with BENCH_EXTRA=v165_draft.sql)
//   node town-bag-db.mjs <base> <outdir> [bench] [bench without v165]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const post = async (path, body, bench) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (bench, text, params = []) => { const r = await post("/bench/sql", { sql: text, params }, bench); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const words = (bag) => bag.map((s) => (s ? `${s.item}×${s.n}${s.of ? ":" + s.of.left : ""}` : null));
const bag = async (X) => words(await X.evaluate(`${K}.purse().bag`));
/** The bag as the database keeps it. */
const kept = async (bench, id) => words((await sql(bench, `select doc->'bag' as bag from public.town_purses where member_id = $1`, [id]))[0].bag);
const key = async (X, code, k) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: code.charCodeAt(3) }); await sleep(350); };
const at = (X, i) => X.evaluate(`(() => { const r = document.querySelector('[data-bag-slot="${i}"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
const mouse = (X, type, p, down) => X.send("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: type === "mouseMoved" && !down ? "none" : "left", buttons: down ? 1 : 0, clickCount: type === "mouseMoved" ? 0 : 1 });
async function pull(X, from, to) {
  const a = await at(X, from), b = await at(X, to);
  await mouse(X, "mouseMoved", a, false);
  await mouse(X, "mousePressed", a, true);
  for (let i = 1; i <= 6; i++) { await mouse(X, "mouseMoved", { x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6 }, true); await sleep(40); }
  await sleep(120);
  const ghost = await X.evaluate(`!!document.querySelector("[data-bag-ghost]")`);
  await mouse(X, "mouseReleased", b, false);
  await sleep(900);
  return ghost;
}
async function enter(X, letter, bench) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=bagdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
}
/** A member made in the stand-in, with a bag set up by hand: split stacks, a tool, bait, two pots of one dish. */
async function laid(X, letter, bench) {
  await enter(X, letter, bench);
  const id = (await (await fetch(`${bench}/bench/who?as=${encodeURIComponent((await X.evaluate(`window.__cashTown.me()`)).id)}`)).json()).id;
  const dish = Object.keys((await sql(bench, `select town.cat('dishes') as c`))[0].c)[0];
  const pot = (left) => ({ item: "potFull", n: 1, of: { dish, left } });
  await sql(bench, `insert into public.town_purses (member_id, coins, doc) values ($1, 12, town.fresh() || jsonb_build_object('bag', $2::jsonb))
    on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [id, JSON.stringify([{ item: "kangkong", n: 5 }, null, { item: "hoe", n: 1 }, { item: "kangkong", n: 18 }, pot(1), { item: "worm", n: 2 }, pot(3), null, null, null])]);
  await enter(X, letter, bench);
  return id;
}
const LAID = ["kangkong×5", null, "hoe×1", "kangkong×18", "potFull×1:1", "worm×2", "potFull×1:3", null, null, null];
const open = async (X) => { await key(X, "KeyI", "i"); await until("my bag is open", () => X.evaluate(`!!${TRADE} && !!document.querySelector('[data-bag-slot="0"]')`), 8000); };

const A = await browser("bagdb", { width: 1280, height: 860 });
try {
  const id = await laid(A, "X", BENCH);
  ok("the game is the database's here: no trial in the page, and the bag is the one laid", (await A.evaluate(`${K}.trial === null`)) === true && same(await bag(A), LAID), await bag(A));
  await open(A);
  await until("the bag offers to be put in order", () => A.evaluate(`!!document.querySelector("[data-bag-sort]")`), 8000).catch(() => {});
  ok("told by the database that a bag can be put in order, the bag's head has \"จัดเรียง\", live", (await A.evaluate(`(() => { const b = document.querySelector("[data-bag-sort]"); return b ? !b.disabled : null; })()`)) === true && (await A.evaluate(`${K}.bagTidy()`)) === true);
  let ghost = await pull(A, 2, 1);
  ok("the hoe pulled into an empty slot: moved on the page", ghost && same((await bag(A)).slice(0, 3), ["kangkong×5", "hoe×1", null]), await bag(A));
  ok("…and in the purse the database keeps", same(await kept(BENCH, id), await bag(A)) && (await kept(BENCH, id))[1] === "hoe×1", await kept(BENCH, id));
  await pull(A, 0, 3);
  ok("five of the greens pulled onto eighteen: twenty there, three where they were, in the database too", same([(await bag(A))[0], (await bag(A))[3]], ["kangkong×3", "kangkong×20"]) && same(await kept(BENCH, id), await bag(A)), await kept(BENCH, id));
  // (the pot with one helping taken up: of the two pots, the one held)
  await A.evaluate(`${K}.hold(4)`); await sleep(700);
  await pull(A, 6, 4);
  const heldLeft = () => A.evaluate(`${K}.purse().bag[${K}.handSlot()]?.of?.left ?? null`);
  ok("the other pot pulled onto the pot in the hand: they change places, and the pot in the hand is the one with one helping still", same([(await bag(A))[4], (await bag(A))[6]], ["potFull×1:3", "potFull×1:1"]) && (await heldLeft()) === 1
    && same(await A.evaluate(`[...document.querySelectorAll("[data-bag-slot]")].filter((li) => li.querySelector("[data-bag-held]")).map((li) => +li.dataset.bagSlot)`), [6]), { bag: await bag(A), left: await heldLeft() });
  await A.evaluate(`document.querySelector("[data-bag-sort]").click()`); await sleep(1200);
  const sorted = ["hoe×1", "potFull×1:3", "potFull×1:1", "worm×2", "kangkong×20", "kangkong×3", null, null, null, null];
  ok("\"จัดเรียง\": tools, bait, what is grown, the fuller pot first; said, and the button dim", same(await bag(A), sorted) && (await A.evaluate(`document.querySelector("[data-bag-sort]").disabled`)) === true
    && (await A.evaluate(`${TRADE}.innerText.includes("จัดเรียงกระเป๋าแล้ว")`)), await bag(A));
  ok("…the database's purse is the same, with its coins", same(await kept(BENCH, id), sorted) && (await sql(BENCH, `select coins from public.town_purses where member_id = $1`, [id]))[0].coins === 12, await kept(BENCH, id));
  ok("…and the pot in the hand is the one with one helping still, marked where it now is", (await heldLeft()) === 1 && (await A.evaluate(`${K}.handSlot()`)) === 2, await heldLeft());
  ok("nothing of it is written among the deeds but the pot taken up", same((await sql(BENCH, `select what from public.town_deeds where member_id = $1 order by id`, [id])).map((d) => d.what), ["hold"]));
  await A.shot(`${OUT}/bag-db-sorted.png`);
  await enter(A, "X", BENCH);
  await open(A);
  ok("the page loaded again has the bag as it was left, in order: the button is dim", same(await bag(A), sorted) && (await A.evaluate(`document.querySelector("[data-bag-sort]")?.disabled ?? null`)) === true, await bag(A));
  { const thrown = A.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await A.shot(`${OUT}/bag-db-stopped.png`).catch(() => {});
} finally { await A.close(); }

if (OLD) {
  console.log("a database that has not had v165");
  const B = await browser("bagdbold", { width: 1280, height: 860 });
  try {
    const id = await laid(B, "Y", OLD);
    await open(B);
    await sleep(1500);
    ok("the keeper says a bag cannot be put in order, and the bag's head offers neither \"จัดเรียง\" nor \"ย้าย\"", (await B.evaluate(`${K}.bagTidy()`)) === false
      && !(await B.evaluate(`!!document.querySelector("[data-bag-sort]")`)) && (await B.evaluate(`(document.querySelector('[data-bag-slot="0"] button').click(), true)`)) && (await sleep(300), !(await B.evaluate(`!!document.querySelector("[data-bag-move]")`))));
    const ghost = await pull(B, 2, 1);
    ok("a pull lifts nothing and moves nothing, on the page or in the database", !ghost && same(await bag(B), LAID) && same(await kept(OLD, id), LAID), { ghost, bag: await bag(B) });
    ok("a thing is taken up to look at as ever", (await B.evaluate(`document.querySelectorAll('[data-bag-slot] button[aria-pressed="true"]').length`)) === 1);
    { const thrown = B.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
  } catch (e) {
    fail++;
    console.log(`  FAIL (stopped) ${e?.message ?? e}`);
    await B.shot(`${OUT}/bag-db-old-stopped.png`).catch(() => {});
  } finally { await B.close(); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
