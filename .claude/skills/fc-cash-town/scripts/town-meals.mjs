// Three helpings to a meal's hours, and what meals leave held together, each at a level (the owner, 2026-10-06):
// played in the trial, read off the bag.
//
//   node .claude/skills/fc-cash-town/scripts/town-meals.mjs <base-url> <out-dir>
//
// Needs `next dev` (the trial's test room). Writes meals-*.png.
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
/** One helping of a dish, eaten up: sat down to, six minutes let go by, counted. Says what the sitting down came to. */
const eat = async (X, dish) => {
  const sat = await X.evaluate(`${T}.sitDown(${await slotOf(X, dish)}, true)`);
  if (!sat.ok) return sat;
  await X.evaluate(`${T}.skipHours(0.1)`);
  await X.evaluate(`${T}.chew(0)`);
  await sleep(150);
  return sat;
};
const bag = (X) => X.evaluate(`(() => { const el = ${TRADE}; return el ? {
  meals: [...el.querySelectorAll("[data-meal]")].map((m) => Number(m.dataset.bowls)), levels: [...el.querySelectorAll("[data-buff-level]")].map((m) => Number(m.dataset.buffLevel)), text: el.innerText.replace(/\s+/g, " ") } : null; })()`);

const X = await browser("Meals", { width: 390, height: 844, mobile: true });
try {
  // (16:35 by the town's clock: lunch's hours, with dinner's twenty-five minutes off)
  await X.goto(`${BASE}/town?townTest=M&townRoom=check&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  await X.evaluate(`${T}.resize(20)`);
  // put the trial's clock at 16:36 in Bangkok: three helpings fit before dinner's hours, and a fourth after they begin
  const to = await X.evaluate(`(() => { const now = ${T}.now(), day = 86400000, bkk = 7 * 3600000; const at = Math.floor((now + bkk) / day) * day - bkk + 16.6 * 3600000; return ((at > now ? at : at + day) - now) / 3600000; })()`);
  await X.evaluate(`${T}.skipHours(${to})`);
  await X.evaluate(`(${T}.grant("tomYum", 5), ${T}.grant("friedMinnow", 2), ${T}.setStamina(10))`);
  const dishes = await X.evaluate(`[${T}.purse().bag.find((s) => s?.item === "tomYum")?.n, ${T}.purse().bag.find((s) => s?.item === "friedMinnow")?.n]`);
  ok("the tester has five helpings of a hearty dish and two of a keen one, at twenty to five", dishes[0] === 5 && dishes[1] === 2, dishes);

  ok("a first helping is eaten", (await eat(X, "tomYum")).ok === true);
  let p = await purse(X);
  ok("…it leaves its buff, at the first level", JSON.stringify(p.buffs?.map((b) => [b.id, b.level])) === JSON.stringify([["hearty", 1]]), p.buffs);
  ok("a second and a third in the same hours", (await eat(X, "tomYum")).ok === true && (await eat(X, "tomYum")).ok === true);
  p = await purse(X);
  ok("…each raises the buff a level, and its hours are still the first helping's", p.buffs?.length === 1 && p.buffs[0].level === 3 && p.meals.bowls?.[1] === 3, { buffs: p.buffs, meals: p.meals });
  const first = p.buffs[0].until;
  const fourth = await eat(X, "tomYum");
  ok("a fourth in the same hours is refused, and nothing is lost", fourth.ok === false && fourth.why === "meal" && (await purse(X)).bag.find((s) => s?.item === "tomYum")?.n === 2, fourth);
  ok("the gauge is never over its hundred", (await purse(X)).stamina.left <= 100, (await purse(X)).stamina);

  await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
  await until("the bag opens", () => X.evaluate(`!!${TRADE}`), 4000);
  await sleep(500);
  let seen = await bag(X);
  ok("the bag says lunch has had its three, and the buff's level", JSON.stringify(seen?.meals) === JSON.stringify([0, 3, 0]) && JSON.stringify(seen.levels) === JSON.stringify([3]) && /อิ่มทน/.test(seen.text) && /ขั้น 3/.test(seen.text), seen);
  await X.shot(`${OUT}/meals-three.png`);

  // dinner's hours begin: a fourth helping of the same, while the buff still runs, is the fourth level
  await X.evaluate(`${T}.skipHours(0.2)`);
  ok("as the next meal's hours begin, a fourth helping", (await eat(X, "tomYum")).ok === true);
  p = await purse(X);
  ok("…is the fourth level, the last, with the first helping's hours", p.buffs?.length === 1 && p.buffs[0].level === 4 && p.buffs[0].until === first, p.buffs);
  ok("a helping that leaves another buff is a buff of its own beside it", (await eat(X, "friedMinnow")).ok === true);
  p = await purse(X);
  ok("…at the first level, with hours of its own", JSON.stringify(p.buffs?.map((b) => [b.id, b.level])) === JSON.stringify([["hearty", 4], ["keen", 1]]) && p.buffs[1].until > first, p.buffs);
  await sleep(400);
  seen = await bag(X);
  ok("the bag shows both, and dinner's two helpings", JSON.stringify(seen?.meals) === JSON.stringify([0, 3, 2]) && JSON.stringify(seen.levels) === JSON.stringify([4]) && /ตาไว/.test(seen.text), seen);
  await X.shot(`${OUT}/meals-four.png`);
  // hearty at the fourth level: a third of the cost
  const before = (await purse(X)).stamina.left;
  await X.evaluate(`${T}.setStamina(60)`);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
  void before;
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
