// The barns of 8 and 16 and the yard behind each (the owner, 2026-11-10: "ข ดีกว่า ทำเลย"; lib/town/pasture), in the dev
// test room on the editor's farm, at a desktop's size and a phone's: the trial's animal world is laid in the browser
// (the second row of barns at 16, 8 and 4, mine at 16, one of the six short barns at 16), then shot from the lane, the
// yards at rest, a door open, standing in my yard, my trays full and empty, and the upgrade panel at 4 and at 8 (parts
// handed over, a bag that completes it) and at the top. A few checks besides: the yard's gate walked through, the
// panel's delivery taking the bag's things.
//
//   node town-barn-yard.mjs <base> <outdir> [desktop,phone]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3326", OUT = ".", SIZES = "desktop,phone"] = process.argv.slice(2);
const ONLY = process.env.ONLY ?? "";
const V = "window.__townView", P = "window.__townPasture", T = "window.__townTrade";
const SPECIES = { cow: "dairyCow", sheep: "meadowSheep", chicken: "barnHen", duck: "puddleDuck" };
// sixteen of four kinds, the big ones among them: five cows, four sheep, four hens, three ducks
const MIX = ["cow", "sheep", "chicken", "cow", "duck", "sheep", "cow", "chicken", "sheep", "duck", "cow", "chicken", "sheep", "cow", "duck", "chicken"];
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + JSON.stringify(detail).slice(0, 300)}`); };
const animalOf = (owner, k, species, fed = true) => ({
  id: `${owner}-${String(k).padStart(2, "0")}`, owner, species, breed: SPECIES[species], name: "", born: 0, bought: true, home: "barn", sex: k % 3 ? "f" : "m",
  stats: { thrift: 3, gentle: 3, vigor: 3 }, streak: 0, at: Date.now(), food: fed ? 20 : 0, grown: 100000, made: 0, banked: 0, hearts: 0, today: { day: 0 },
  speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0,
});
const herdOf = (owner, barn, room, door = [], more = {}) => ({ owner, barn, room, door, credit: 0, lastCare: Date.now(), facade: barn % 4, care: "named", carers: [], ...more });
const world = (me, mine = {}) => {
  const { room = 16, n = room, door = [], parts, others = [] } = mine;
  const herds = [herdOf("yard-s4", 4, 16, others), herdOf("yard-s3", 5, 8, others), herdOf("yard-s2", 6, 4), herdOf("yard-short", 2, 16), herdOf(me, 7, room, door, parts ? { parts } : {})];
  const animals = [
    ...MIX.map((sp, k) => animalOf("yard-s4", k, sp)),
    ...MIX.slice(0, 8).map((sp, k) => animalOf("yard-s3", k, sp)),
    ...MIX.slice(0, 4).map((sp, k) => animalOf("yard-s2", k, sp)),
    ...MIX.map((sp, k) => animalOf("yard-short", k, sp)),
    ...MIX.slice(0, n).map((sp, k) => animalOf(me, k, sp, k % 3 !== 2)),
  ];
  return { animals, herds, found: {}, spells: [], wagons: [], offers: [], asks: [] };
};

for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730, mobile: true }]]) {
  if (!SIZES.split(",").includes(label)) continue;
  const X = await browser(`barnyard-${label}`, size);
  const url = `${BASE}/town?townTest=M&townRoom=barnyard&townMap=town2&farmMap=farm2&townHour=${process.env.HOUR ?? 10}&townWeather=clear`;
  const enter = async (w) => {
    await X.evaluate(`localStorage.setItem("cashtown.trial.animals.2", ${JSON.stringify(JSON.stringify(w))})`);
    await X.goto(url);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the pasture", () => X.evaluate(`!!${P}?.world()`), 60000);
  };
  const shot = async (name, at, look, wait = 3500) => {
    if (!(await X.evaluate(`${V}.warp(${at[0]}, ${at[1]})`))) console.log(`  could not stand at ${at}`);
    await sleep(600);
    if (look) await X.evaluate(`${V}.lookAt(${look[0]}, ${look[1]})`);
    await sleep(wait);
    await X.shot(`${OUT}/${label}-${name}.png`);
  };
  const desk = label === "desktop";
  try {
    await X.goto(`${BASE}/`);
    await X.goto(url);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    const me = await X.evaluate(`${T}.id`);
    // (ONLY=g: the panel alone)
    if (!ONLY || ONLY.includes("a")) {
    // (a) the second row from the lane in front: 4 at 16, 5 at 8, 6 at 4, 7 (mine) at 16; doors shut
    await enter(world(me));
    if (desk) { await shot("a-row-west", [233, 33], [229, 26]); await shot("a-row-east", [247, 33], [251, 26]); }
    else { await shot("a-row-west", [230, 33], [229.5, 26.5]); await shot("a-row-mid", [238, 33], [236, 25.5]); await shot("a-row-east", [255, 33], [255.5, 25.5]); }
    // (b) the yards at rest, from the lane behind: 8's (barn 6, two rows) and 16's (barn 5, four rows)
    await shot("b-yard8", [235, 22], desk ? [234, 24] : [235, 24]);
    await shot("b-yard16", [226, 21], desk ? [226, 24] : [226, 24.5]);
    // (b2) from the lane behind my row: my barn part faint, its yard seen
    await shot("b-behind", [256, 21], desk ? [256, 24] : [256, 24.5]);
    // (c) one of the six short barns at 16 (barn 3: its yard two rows, the lane behind it)
    await shot("c-short16", [247, 12], desk ? [247, 16] : [247.5, 16]);
    // (d) standing in my yard: the barn faint; my trays, full and empty (a third of mine unfed)
    {
      // (from the lane in front, by a walk as a tap makes one: up the strip beside the barn and in at the gate)
      const g = await X.evaluate(`${V}.warp(256, 33)`);
      await sleep(3000);
      const way = await X.evaluate(`${V}.walk(255.5, 24.5)`);
      await until("in the yard", () => X.evaluate(`(() => { const p = ${V}.self(); return !!p && !p.moving; })()`), 30000).catch(() => {});
      await sleep(800);
      const at = await X.evaluate(`(() => { const p = ${V}.self(); return p ? [p.x, p.y] : null; })()`);
      ok(`${label}: walked into my yard by its gate`, !!g && !!way && !!at && at[0] >= 252 && at[0] < 260 && at[1] >= 23 && at[1] < 27, { way, at });
      await X.evaluate(`${V}.lookAt(255.5, 25.2)`);
      await sleep(2500);
      await X.shot(`${OUT}/${label}-d-in-yard.png`);
    }
    await shot("e-floor16", [256, 29], [256, 29.5]);
    // (f) every door of the row open: the yard's animals out through the gate, the floor's through the door
    await enter(world(me, { door: [[Date.now() - 6000, null]], others: [[Date.now() - 6000, null]] }));
    await shot("f-open", [262, 33], desk ? [259, 27.5] : [260, 28], 9000);
    }
    // (g) the panel: at 4 with a bag of some of 8's things; at 4 part-delivered; at 8, its bag completing 16; at 16
    for (const [name, mine, bag, coins] of [
      ["g-room4", { room: 4, n: 4 }, [["log", 230], ["timber", 64], ["stoneTile", 40], ["oreIron", 12]], 5200],
      ["g-room4-parts", { room: 4, n: 4, parts: { 8: { coins: 1800, log: 200, stoneTile: 25 } } }, [["timber", 60], ["oreIron", 30]], 400],
      ["g-room8-completes", { room: 8, n: 8, parts: { 16: { coins: 15000, log: 400, timber: 200, stoneTile: 80, oreIron: 60 } } }, [["stoneTile", 20], ["yarn", 40]], 900],
      ["g-room16", { room: 16, n: 16 }, [], 900],
    ]) {
      await enter(world(me, mine));
      await X.evaluate(`(() => { const t = ${T}; t.resize?.(25); const p = t.purse(); t.fished({ ...p, coins: ${coins}, bag: Array.from({ length: 25 }, () => null) });
        for (const [id, k] of ${JSON.stringify(bag)}) t.grant(id, k); })()`);
      await X.evaluate(`${V}.warp(256, 33)`);
      await sleep(800);
      await X.evaluate(`${P}.open("mine")`);
      await sleep(1800);
      // (the ladder and the stage's things in view)
      await X.evaluate(`document.querySelector("[data-barn-ladder]")?.scrollIntoView({ block: "start" })`);
      await sleep(500);
      await X.shot(`${OUT}/${label}-${name}.png`);
      if (name === "g-room4-parts") {
        const cells = await X.evaluate(`[...document.querySelectorAll("[data-part]")].map((e) => [e.dataset.part, e.dataset.partState])`);
        ok(`${label}: room 4's parts show what was handed over and what is short`, JSON.stringify(cells) === JSON.stringify([["coins", "short"], ["log", "done"], ["timber", "short"], ["stoneTile", "short"], ["oreIron", "fills"]]), cells);
        await X.evaluate(`document.querySelector("[data-deliver]")?.click()`);
        await sleep(1500);
        const h = await X.evaluate(`${P}.world().herds.find((x) => x.owner === ${T}.id)`);
        ok(`${label}: "ส่งของ" hands over what the bag holds of what is owed`, JSON.stringify(h?.parts?.["8"]) === JSON.stringify({ coins: 2200, log: 200, stoneTile: 25, timber: 60, oreIron: 30 }) && h.room === 4, h?.parts);
        await X.shot(`${OUT}/${label}-g-room4-delivered.png`);
      }
      if (name === "g-room8-completes") {
        await X.evaluate(`document.querySelector("[data-deliver]")?.click()`);
        await sleep(1500);
        const h = await X.evaluate(`${P}.world().herds.find((x) => x.owner === ${T}.id)`);
        ok(`${label}: the last part grows the barn to 16`, h?.room === 16 && !h.parts, h);
      }
      await X.evaluate(`${P}.close()`);
    }
  } catch (e) { fail++; console.log(`  ${label} failed:`, e.message); }
  finally { await X.close?.(); }
}
console.log(`${pass} passed, ${fail} failed`);
