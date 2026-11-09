// What the specials are for (v325) through the database's keeper against the stand-in (town-bench.mjs with v325 in it):
// the keeper learns of the uses as the game begins; a blank recipe paper written from the bag's own buttons is the
// database's scroll; the golden cloth laid from the feast table's panel is the database's, and told back to the page;
// a helping of a legend pot eaten at the table is written down for "together".
//   node town-uses-db.mjs <base> <outdir> <bench>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3291", OUT = ".", DB = "http://127.0.0.1:3297"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const sql = async (q, params = []) => (await (await fetch(`${DB}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: q, params }) })).json());
const key = async (X, code, k) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: code.charCodeAt(3) }); await sleep(400); };
const tap = async (X, sel) => {
  const at = JSON.parse(await X.evaluate(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })())`));
  if (!at) return false;
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: at[0], y: at[1], button: "left", clickCount: 1 });
  await sleep(700);
  return true;
};
const YARD = [66, 47];
const X = await browser("uses-db", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=V&townRoom=usesdb&townMap=town2&townHour=12&townWeather=clear&townDb=${encodeURIComponent(DB)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper", () => X.evaluate(`!!window.__townKeeper`), 60000);
  await until("the uses told", () => X.evaluate(`window.__townKeeper.specialUses()`), 30000).catch(() => {});
  ok("db: the keeper learns of the specials' uses as the game begins", await X.evaluate(`window.__townKeeper.specialUses()`));
  const tester = await X.evaluate(`window.__townKeeper.id`);
  const who = await (await fetch(`${DB}/bench/who?as=${encodeURIComponent(tester)}`)).json();
  const me = typeof who === "string" ? who : who?.id;
  const bag = [{ item: "blankRecipePaper", n: 1 }, { item: "wholeGoldenFleece", n: 1 }, ...Array(10).fill(null)];
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', $2::jsonb, 'made', '["fireflyCustard"]'::jsonb, 'eating', null) where member_id = $1`, [me, JSON.stringify(bag)]);
  await X.evaluate(`window.__townKeeper.purseAgain?.()`);
  await X.evaluate(`window.__townView.warp(${YARD[0]}, ${YARD[1]})`);
  await sleep(2500);
  // the paper, from the bag's own buttons
  await key(X, "KeyI", "i");
  await until("the paper in the bag", () => X.evaluate(`window.__townKeeper.purse().bag.some((s) => s?.item === "blankRecipePaper")`), 20000).catch(() => {});
  await tap(X, `[data-bag-slot="0"] button`);
  await tap(X, "[data-bag-write]");
  await tap(X, "[data-bag-write-recipe=fireflyCustard]");
  await sleep(1200);
  const doc = (await sql("select doc from public.town_purses where member_id = $1", [me])).rows?.[0]?.doc;
  ok("db: the paper written is the database's scroll", (doc?.bag ?? []).some((s) => s?.item === "scrollFireflyCustard") && !(doc?.bag ?? []).some((s) => s?.item === "blankRecipePaper"), doc?.bag);
  await key(X, "KeyI", "i");
  // the golden cloth, from the feast table's panel
  await sql(`insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at, feast, marks) values ($1, 'phoenixBake', 20, 69, 50, false, town.now_ms(), true, '{}'::jsonb)`, [me]);
  await X.evaluate(`window.__townKeeper.nudged?.("kitchen")`);
  await sleep(1500);
  await X.evaluate(`window.__townCook?.feastShow(true)`);
  await sleep(1200);
  ok("db: the panel offers the cloth", await tap(X, "[data-feast-lay=cloth]"));
  await sleep(1200);
  const dress = (await sql("select doc from public.town_things where key = 'feast_dress'")).rows?.[0]?.doc;
  ok("db: the cloth is the database's, for a day", dress?.cloth?.until - dress?.cloth?.at === 24 * 3600000, dress);
  ok("db: and told back to the page", await X.evaluate(`!!window.__townKeeper.tableDress().cloth`));
  ok("db: the town is told", await X.evaluate(`!!document.querySelector("[data-cloth-news]")`));
  await X.shot(`${OUT}/db-feast.png`);
  // a helping of the legend's pot at the table
  const pot = (await sql("select id from public.town_pots where dish = 'phoenixBake' order by id desc limit 1")).rows?.[0]?.id;
  const ate = await X.evaluate(`window.__townKeeper.feastEat(${JSON.stringify(String(pot))}, ${JSON.stringify(YARD)}, true).then((d) => JSON.stringify(d))`);
  ok("db: a helping of the legend's pot eaten at the table", JSON.parse(ate).ok === true, ate);
  const began = (await sql("select count(*)::int n from public.town_feast_began where pot = $1", [String(pot)])).rows?.[0]?.n;
  ok("db: and written down for together", began === 1, began);
} catch (e) { fail++; console.log("  THREW", e.message?.slice(0, 300)); }
X.close();
console.log(`town-uses-db: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
