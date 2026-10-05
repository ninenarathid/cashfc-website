// The forest and the insects as a member will have them, tried in a real browser before anything is pushed: the dev
// test room kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with v125 in it
// (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not touched.
//
// The forest has things for a member because the database says so; one picked up is in the purse the database keeps,
// the place has no more for them, and the deed is written down. An insect that is out is caught with a net bought
// into the purse there: it is in the bag, the village's book has their name, and the deed is written down. A page
// asking a database that has not had v125 has an empty forest and no insects, and nothing breaks.
//
//   BENCH_EXTRA=v123_draft.sql,v125_draft.sql node town-bench.mjs 3198     (in a scratch folder, see scripts/db/README.md: leave it running)
//   node town-wild-db.mjs <base> <outdir> [bench] [bench without v125]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", F = "window.__townForest", B = "window.__townBugs";
const post = async (path, body, bench = BENCH) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(200); };
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(700); };
const standNear = (X, at, least = 0) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue; const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}); if (d >= ${least} && d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);

async function enter(X, letter, bench) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=wilddb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
}

const A = await browser("wilddb");
try {
  await enter(A, "W", BENCH);
  // (the member this tester is on the stand-in)
  const id = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await me(A)).id)}`)).json()).id;
  ok("the game is the database's here: no trial in the page", (await A.evaluate(`${K}.trial === null`)) === true);

  // the forest
  await warp(A, 144 + 48, 112 + 70);
  const sights = await until("the forest's things, as the database tells them", async () => { const s = await A.evaluate(`${F}?.sights?.() ?? null`); return s && s.length > 30 && s; }, 30000).catch((e) => e.message);
  ok("the forest has things for a member, told by the database", Array.isArray(sights), sights);
  const lying = sights.find((s) => (s.kind === "sticks" || s.kind === "leaves" || s.kind === "flowers") && s.item);
  await warp(A, lying.x, lying.y);
  await until("gathering is offered", () => A.evaluate(`(${F}.here()?.id === ${lying.id}) || null`), 6000);
  await A.shot(`${OUT}/wilddb-0-offer.png`);
  const before = await has(A, lying.item);
  await A.evaluate(`${F}.act()`);
  const got = await until("it is in the purse the database keeps", async () => (await has(A, lying.item)) > before, 8000).catch((e) => e.message);
  ok("what lies there is picked up, into the purse the database keeps", got === true, got);
  const kept = await sql(`select town.held(doc->'bag', $2) as n, town.stamina_of(doc, town.now_ms()) as stamina from public.town_purses where member_id = $1`, [id, lying.item]);
  ok("…and it is there: the thing, and the stamina it cost", kept[0]?.n === lying.n && kept[0].stamina === 99, kept);
  ok("the place has no more for them", !(await A.evaluate(`${F}.sights().some((s) => s.id === ${lying.id})`)));
  const deed = await sql(`select what, thing, n::int as n, doc from public.town_deeds where member_id = $1 and what = 'gather'`, [id]);
  ok("the deed is written down", deed.length === 1 && deed[0].thing === lying.item && deed[0].doc.spot === lying.id, deed);

  // insects: whatever is out at this hour that keeps still (a cricket, a stick insect, a ladybird), with a net
  await sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', town.put(doc->'bag', 'bugNet', 1), 'hand', 'bugNet') where member_id = $1`, [id]);
  await again(A);
  await A.evaluate(`${K}.hold(${await A.evaluate(`${K}.purse().bag.findIndex((s) => s?.item === "bugNet")`)}).then(() => null)`);
  await sleep(500);
  const out = await until("the insects, as the database tells them", async () => { const s = await A.evaluate(`${B}?.sights?.() ?? null`); return s && s.length > 5 && s; }, 30000).catch((e) => e.message);
  ok("insects are out for a member, told by the database", Array.isArray(out), out);
  const habit = await A.evaluate(`Object.fromEntries(${B}.sights().map((s) => [s.id, s.bug]))`);
  const still = out.filter((s) => ["cricket", "stickInsect", "leafInsect", "ladybird", "caterpillar", "scarab"].includes(s.bug));
  let caught = null;
  for (const s of still.slice(0, 6)) {
    await warp(A, s.x, s.y);
    const p = await until("it is about", () => A.evaluate(`${B}.poses().find((p) => p.id === ${s.id}) ?? null`), 8000, 100).catch(() => null);
    if (!p) continue;
    const t = await standNear(A, p, 0.3);
    await warp(A, t.x, t.y);
    await sleep(1600);
    const had = await has(A, s.bug);
    for (let i = 0; i < 5; i++) {
      const q = await A.evaluate(`${B}.poses().find((p) => p.id === ${s.id}) ?? null`);
      if (!q) break;
      if (await A.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) { await until("the swing lands", async () => !(await A.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {}); await sleep(900); }
      if ((await has(A, s.bug)) > had) { caught = s; break; }
    }
    if (caught) break;
  }
  ok("one that keeps still is caught with a net, into the purse the database keeps", !!caught, { still: still.map((s) => s.bug), habit });
  if (caught) {
    await A.shot(`${OUT}/wilddb-1-caught.png`);
    const row = await sql(`select town.held(doc->'bag', $2) as n from public.town_purses where member_id = $1`, [id, caught.bug]);
    ok("…and it is there", row[0]?.n >= 1, row);
    const book = await A.evaluate(`${K}.bugBook()`);
    ok("the village's book has their name against it", typeof book[caught.bug] === "string" && book[caught.bug].length > 0, book);
    const kept2 = await sql(`select doc->$1 as line from public.town_things where key = 'bugs'`, [caught.bug]);
    ok("…kept by the database, with who", kept2[0]?.line?.by === id, kept2);
    const d2 = await sql(`select what, thing, doc from public.town_deeds where member_id = $1 and what = 'net'`, [id]);
    ok("the deed is written down", d2.length === 1 && d2[0].thing === caught.bug && d2[0].doc.haunt === caught.id, d2);
    ok("the haunt has no more of it for them", !(await A.evaluate(`${B}.sights().some((s) => s.id === ${caught.id})`)));
  }
  ok("no page errors", A.logs.length === 0, A.logs);

  // a database that has not had v125: an empty forest, no insects, and nothing breaks
  if (OLD) {
    const O = await A.tab("old");
    await enter(O, "V", OLD);
    await O.evaluate(`${V}.warp(${144 + 48}, ${112 + 70})`);
    await sleep(6000);
    ok("a database without v125: the forest has nothing, and no insect is out", (await O.evaluate(`(${F}?.sights?.() ?? []).length`)) === 0 && (await O.evaluate(`(${B}?.sights?.() ?? []).length`)) === 0);
    ok("…and the rest of the game is as it was: the purse is read", (await O.evaluate(`${K}.ready()`)) === true);
    ok("…with no page errors but the two questions it could not be asked", O.logs.filter((l) => !/town_wild|town_bugs|404|PGRST/.test(l)).length === 0, O.logs);
  }
} catch (e) { ok("the run", false, e.stack ?? e.message); console.log(A.logs.join("\n")); } finally { A.close(); await sleep(900); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
