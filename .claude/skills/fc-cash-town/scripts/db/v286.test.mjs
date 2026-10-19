// v286, the insect house keeps pests off, dry-run: the file runs on the chain through v285 as checked out on Windows
// (CR at its line ends) and again as written (the second run changes nothing); then:
//   * the catalog's `farming` row is the code's, `pests.house` alone added to what the database had (another file's
//     bed in `farming.bedsAt` kept);
//   * town.pest_at is lib/town/farm's pestAt over random plants: guard rooms and others in their gift, kept stretches,
//     a move's mark, covers, cures, pickings, a wing's guard, before and after farming.pests.house;
//   * town.quality_keep over random beds and deeds (waterings, pickings, cures, sowings, a plant gone, a house set,
//     filled, filled again and lifted, a plant moved by the hoe): the bed is lib/town/quality-plant's syncQuality's to
//     the digit after every deed, and no deed moves a pest of any plant it did not touch into the past;
//   * town.house_kept is nobody's to call; no function writes with no WHERE.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v286.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, FILE as FILE_, SIGS } from "./build-v286.mjs";
// (V286_FILE: a broken copy, to see that the checks catch it)
const FILE = process.env.V286_FILE ?? FILE_;
// (the code read is the tree it is run in, FC_REPO or not)
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const farm = await import("@/lib/town/farm");
const { syncQuality } = await import("@/lib/town/quality-plant");
const { catalogOf } = await import("@/lib/town/catalog");
const { houseDo, keepOf } = await import("@/lib/town/insect-house");
const trade = await import("@/lib/town/trade");

const H = 3_600_000, FROM = farm.FARMING.pests.house.from;
let checks = 0, s = 286;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const diffOf = (a, b, at = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffOf(a[k], b[k], `${at}.${k}`));
  return [`${at}: ${JSON.stringify(a)?.slice(0, 200)} against ${JSON.stringify(b)?.slice(0, 200)}`];
};
const eq = (a, b, what) => { try { assert.deepEqual(norm(a), norm(b)); } catch { assert.fail(`${what}:\n  ${diffOf(norm(a), norm(b)).slice(0, 12).join("\n  ")}`); } checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const md5s = async () => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, await v(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) v`)])));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  // (the rows as the live database has them before v286: no pests.house, no house.keep nor house.keeps; and a bed more,
  // as another file may have laid)
  const code = catalogOf(), { house: _, ...livePests } = code.farming.pests, { keep: _k, keeps: _ks, ...liveHouse } = code.quality.house;
  const LIVE = { ...code.farming, pests: livePests, bedsAt: [...code.farming.bedsAt, [999, 999]] }, LIVE_Q = { ...code.quality, house: liveHouse };
  await db.query("update public.town_catalog set data = $1::jsonb where key = 'farming'", [JSON.stringify(LIVE)]);
  await db.query("update public.town_catalog set data = $1::jsonb where key = 'quality'", [JSON.stringify(LIVE_Q)]);
  // (beds as members left them before v286: a house with a mantis and a ladybird in it; another with a bee and a ladybird
  // gone in at the very same moment (Codex's check: the times alone cannot tell their covers apart); plants about them
  // given their gifts by the trigger as it was, with no keep)
  // (their rooms lived in when the file runs: the file writes them at the database's own clock)
  const OT = Number(await v("select town.now_ms() v")) - 2 * H, keepOfBug = { mantis: 0.7, ladybird: 0.5 };
  const OLD = [
    { bed: 1, rooms: [{ bug: "mantis", from: OT - 10 * H, until: OT + 38 * H }, { bug: "ladybird", from: OT - 4 * H, until: OT + 44 * H }] },
    { bed: 2, rooms: [{ bug: "honeyBee", from: OT - 6 * H, until: OT + 42 * H }, { bug: "ladybird", from: OT - 6 * H, until: OT + 42 * H }] },
  ];
  for (const { bed, rooms } of OLD) {
    const [obx, oby] = code.farming.bedsAt[bed];
    await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,'house',null,$4::jsonb,$5)", [obx + 2, oby + 2, bed, JSON.stringify({ by: "m1", at: OT - 20 * H, rooms }), OT - 4 * H]);
    for (const [dx, dy] of [[1, 1], [2, 3], [3, 2], [4, 4], [0, 2], [6, 6]]) {
      await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,'tilled',$4::jsonb,null,$5)", [obx + dx, oby + dy, bed,
        JSON.stringify({ by: "m1", crop: "tomato", sown: OT - 3 * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 }), OT - 3 * H]);
    }
  }
  const coversOf = async (bed) => (await db.query("select x||','||y k, plant->'q'->'bed'->'h' h from public.town_plots where bed=$1 and plant is not null", [bed])).rows;
  ok((await coversOf(1)).some((r) => r.h?.some((e) => e.r === "guard" && !("k" in e))), "the old bed has covers with no keep before the file");
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  // (each cover of the old beds given its room's keep, in place, the n-th cover the n-th room; the rooms theirs; nothing kept as gone)
  for (const { bed, rooms } of OLD) {
    const [obx, oby] = code.farming.bedsAt[bed];
    let stamped = 0;
    for (const r of await coversOf(bed)) for (const [i, e] of (r.h ?? []).entries()) {
      eq(e.r, rooms[i].bug === "honeyBee" ? "pollen" : "guard", `${r.k}'s cover ${i} is its room's`);
      if (e.r === "guard") { eq(e.k, keepOfBug[rooms[i].bug], `${r.k}'s cover from the ${rooms[i].bug} has its keep`); stamped++; }
      else ok(!("k" in e), `${r.k}'s bee's cover has no keep`);
    }
    ok(stamped >= 4, `bed ${bed}: covers given their keep in place (${stamped})`);
    eq((await one("select house->'rooms' r from public.town_plots where x=$1 and y=$2", [obx + 2, oby + 2])).r, rooms.map((m) => (m.bug === "honeyBee" ? m : { ...m, k: keepOfBug[m.bug] })), `bed ${bed}: the old rooms have their keep`);
    eq(Number((await one("select count(*) n from public.town_plots where bed=$1 and plant ? 'hg'", [bed])).n), 0, `bed ${bed}: nothing kept as gone: the gifts worked out again are the same`);
    await db.exec(`delete from public.town_plots where bed=${bed}`);
  }
  const fnAfter = await md5s(), rowAfter = await v("select data v from public.town_catalog where key = 'farming'");
  await db.exec(sql);
  eq(await md5s(), fnAfter, "a second run leaves the functions as the first made them");
  eq(await v("select data v from public.town_catalog where key = 'farming'"), rowAfter, "a second run leaves the farming row as the first made it");
  eq(rowAfter, { ...LIVE, pests: code.farming.pests }, "the farming row as it was but for pests.house (another file's bed kept)");
  await db.query("update public.town_catalog set data = $1::jsonb where key = 'farming'", [JSON.stringify(code.farming)]);
  eq(await v("select data v from public.town_catalog where key = 'farming'"), code.farming, "the farming row is the code's");
  eq(await v("select data v from public.town_catalog where key = 'quality'"), code.quality, "the quality row is the code's, house.keep and house.keeps added");
  ok(new Date(FROM).toISOString() === "2026-10-20T01:00:00.000Z" && code.farming.pests.house.old === 0.5, "houses keep pests off from 2026-10-20 08:00 Bangkok; an old room as the weakest");

  const MAINS = ["tomato", "chili", "corn", "basil", "cabbage", "carrot", "pumpkin", "cucumber", "longBean", "eggplant", "kangkong", "scallion"];
  const GUARD = ["ladybird", "mantis", "lacewing", "goldenAnt", "robberFly", "antlion"], OTHER = ["honeyBee", "hoverfly", "monarch"];

  /* ── town.house_do: houseDo, a hunter's keep written into its room ── */
  {
    const [hx, hy] = code.farming.bedsAt[0], key = `${hx + 2},${hy + 2}`;
    for (const bug of [...GUARD, "orchidMantis", "roveBeetle", ...OTHER]) {
      const now = FROM + int(40) * H, plots = { [key]: { soil: "house", plant: null, house: { by: "me", at: now - H, rooms: [null, pick([null, { bug: "honeyBee", from: now - 60 * H, until: now - H }])] } } };
      const purse = { ...trade.newPurse(), bag: trade.put(trade.newPurse().bag, bug, 1), hand: bug };
      const sqlDid = await v("select town.house_do($1,$2::jsonb,$3::jsonb,'me','me',$4) v", [key, JSON.stringify(plots), JSON.stringify(purse), now]), tsDid = houseDo(key, plots, purse, "me", "me", now);
      ok(sqlDid.ok && tsDid.ok, `a ${bug} goes in`);
      eq(sqlDid.plot, tsDid.plot, `the room a ${bug} goes into`);
      eq(tsDid.plot.house.rooms[0].k ?? null, GUARD.includes(bug) || bug === "orchidMantis" || bug === "roveBeetle" ? keepOf(bug) : null, `a ${bug}'s keep in its room`);
    }
  }

  /* ── town.pest_at: pestAt ── */
  const stretch = (t) => { const a = t + (int(80) - 30) * H + int(H); return [a, a + (1 + int(60)) * H + int(H)]; };
  const plantAt = (t) => {
    const sown = t + (int(90) - 40) * H + int(H), p = { by: "m1", crop: pick(MAINS), sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    if (rand() < 0.2) p.cured = sown + int(20) * H + int(H);
    if (rand() < 0.15) p.guard = sown + int(30) * H;
    if (rand() < 0.1) p.wingGuard = sown + int(30) * H;
    if (rand() < 0.1) p.boost = int(10) * H;
    if (rand() < 0.85) p.q = { at: sown, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0], bed: { h: Array.from({ length: int(4) }, () => { const [from, to] = stretch(sown); const r = rand() < 0.7 ? "guard" : pick(["pollen", "soil"]); return { r, from, to, s: pick([1, 0.5]), ...(r === "guard" && rand() < 0.85 ? { k: pick([0.5, 0.7, 1]) } : {}) }; }) } };
    if (rand() < 0.35) p.hg = Array.from({ length: 1 + int(2) }, () => [...stretch(sown), ...(rand() < 0.85 ? [pick([0.5, 0.7, 1])] : [])]).sort((x, y) => x[0] - y[0]);
    if (rand() < 0.25) p.hs = sown + int(40) * H + int(H);
    return p;
  };
  let saved = 0, cases = 0;
  for (let k = 0; k < 900; k++) {
    const key = `${130 + int(30)},${3 + int(20)}`, p = plantAt(FROM + (int(200) - 60) * H), now = p.sown + int(100) * H + int(H);
    const want = farm.pestAt(key, p, now), got = await v("select town.pest_at($1, $2::jsonb, $3) v", [key, JSON.stringify(p), now]);
    eq(got === null ? null : Number(got), want, `pest_at ${key} ${JSON.stringify(p).slice(0, 300)} at ${now}`);
    const { q: _q, hg: _hg, hs: _hs, ...bare } = p;
    if (farm.pestAt(key, bare, now) !== want) saved++;
    cases++;
  }
  ok(saved > 30, `the house made a difference in ${saved} of ${cases} plants`);

  /* ── town.quality_keep: syncQuality, deed by deed ── */
  const f = code.farming, side = f.side;
  const readBed = async (bed) => Object.fromEntries((await db.query("select x::text||','||y::text k, soil, plant, house from public.town_plots where bed=$1", [bed])).rows.map((r) => [r.k, { soil: r.soil, plant: r.plant ?? null, ...(r.house ? { house: r.house } : {}) }]));
  const shape = (plots) => Object.fromEntries(Object.entries(plots).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, p]) => [k, { soil: p.soil, plant: p.plant ?? null, house: p.house ?? null }]));
  const write = async (key, plot, t) => { const [x, y] = key.split(",").map(Number); await db.query("update public.town_plots set soil=$3, plant=$4::jsonb, house=$5::jsonb, changed=$6 where x=$1 and y=$2", [x, y, plot.soil, plot.plant ? JSON.stringify(plot.plant) : null, plot.house ? JSON.stringify(plot.house) : null, t]); };
  let moves = 0, refills = 0, lifts = 0, kept = 0, deedsDone = 0;
  for (let round = 0; round < 24; round++) {
    const bed = int(Math.min(f.bedsAt.length, 12)), [bx, by] = f.bedsAt[bed], T = FROM + (int(48) - 12) * H;
    await db.exec("delete from public.town_plots");
    // a bed laid through the trigger, plot by plot: plants, a house in its middle
    const keys = []; for (let x = bx; x < bx + side; x++) for (let y = by; y < by + side; y++) keys.push(`${x},${y}`);
    const mid = `${bx + Math.floor(side / 2)},${by + Math.floor(side / 2)}`;
    let plots = {};
    for (const key of keys) {
      const [x, y] = key.split(",").map(Number), t0 = T - 30 * H + int(20) * H;
      await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,'tilled',null,null,$4)", [x, y, bed, t0]);
    }
    plots = await readBed(bed);
    for (const key of keys) {
      if (key === mid) continue;
      if (rand() < 0.6) {
        const t0 = T - int(30) * H - int(H), plant = { by: "m1", crop: pick(MAINS), sown: t0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
        const next = { ...plots, [key]: { soil: "tilled", plant } };
        await write(key, next[key], t0);
        plots = syncQuality(plots, next, t0, []);
      }
    }
    // (a hunter in it already in half the beds, its room with its keep or, as the file left an old one, with it stamped)
    const first = pick(GUARD), setHouse = { soil: "house", plant: null, house: { by: "m1", at: T - 40 * H, rooms: [round % 2 ? { bug: first, from: T - 40 * H, until: T + (4 + int(30)) * H, k: keepOf(first) } : null, null] } };
    await write(mid, setHouse, T - 40 * H);
    plots = syncQuality(plots, { ...plots, [mid]: setHouse }, T - 40 * H, []);
    eq(shape(await readBed(bed)), shape(plots), `bed ${bed} laid`);
    // the deeds, never on the stroke of an hour
    let t = T;
    for (let i = 0; i < 14; i++) {
      t += int(14) * H + 17 * 60_000 + int(40) * 1000;
      const living = Object.keys(plots).filter((k) => plots[k].plant), empty = Object.keys(plots).filter((k) => !plots[k].plant && !plots[k].house);
      const what = pick(["water", "pick", "cure", "sow", "gone", "fill", "fill", "refill", "lift", "move", "move"]);
      const before = Object.fromEntries(living.map((k) => [k, farm.pestAt(k, plots[k].plant, t)]));
      const steps = [], touched = new Set();
      const house = plots[mid]?.house;
      if (what === "water" && living.length) { const k = pick(living); touched.add(k); steps.push([k, { ...plots[k], plant: { ...plots[k].plant, watered: t } }]); }
      if (what === "pick" && living.length) { const k = pick(living); touched.add(k); steps.push([k, { ...plots[k], plant: { ...plots[k].plant, picked: plots[k].plant.picked + 1, pickedAt: t } }]); }
      if (what === "cure" && living.length) { const k = pick(living); touched.add(k); steps.push([k, { ...plots[k], plant: { ...plots[k].plant, cured: t } }]); }
      if (what === "gone" && living.length) { const k = pick(living); touched.add(k); steps.push([k, { soil: "cleared", plant: null }]); }
      if (what === "sow" && empty.length) { const k = pick(empty); touched.add(k); steps.push([k, { soil: "tilled", plant: { by: "m1", crop: pick(MAINS), sown: t, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } }]); }
      if ((what === "fill" || what === "refill") && house) {
        const free = house.rooms.findIndex((r) => !r || r.until <= t), at = what === "refill" ? int(2) : free;
        if (at >= 0) {
          if (house.rooms[at]) refills++;
          // (a hunter's room with its keep as town.house_do writes it, or now and then without, as the cover's fallback has it)
          const bug = rand() < 0.75 ? pick(GUARD) : pick(OTHER);
          const rooms = house.rooms.map((r, j) => (j === at ? { bug, from: t, until: t + pick([48, 72, 72 + 24]) * H, ...(GUARD.includes(bug) && rand() < 0.8 ? { k: keepOf(bug) } : {}) } : r));
          steps.push([mid, { ...plots[mid], house: { ...house, rooms } }]);
        }
      }
      if (what === "lift" && house) { lifts++; steps.push([mid, { soil: "tilled", plant: null }]); }
      if (what === "lift" && !house && plots[mid] && !plots[mid].plant) steps.push([mid, setHouse]);
      if (what === "move" && living.length && empty.length) {
        // (as town.move_plant lays it: the plot it leaves emptied, then the plant set down in its new place, its home kept)
        const a = pick(living.filter((k) => !plots[k].plant.footprint)), b = pick(empty);
        if (a) { moves++; touched.add(b); const p = plots[a].plant; steps.push([a, { soil: "tilled", plant: null }]); steps.push([b, { soil: "tilled", plant: { ...p, home: p.home ?? a } }]); before[b] = before[a]; }
      }
      for (const [key, plot] of steps) {
        await write(key, plot, t);
        plots = syncQuality(plots, { ...plots, [key]: plot }, t, []);
        deedsDone++;
      }
      const got = await readBed(bed);
      eq(shape(got), shape(plots), `bed ${bed}, deed ${i} (${what}) at ${t}`);
      for (const k of Object.keys(plots).filter((k) => plots[k].plant)) {
        if (plots[k].plant.hg) kept++;
        const after = farm.pestAt(k, plots[k].plant, t);
        const sqlAt = await v("select town.pest_at($1, $2::jsonb, $3) v", [k, JSON.stringify(got[k].plant), t]);
        eq(sqlAt === null ? null : Number(sqlAt), after, `pest_at of ${k} after ${what}`);
        // (no deed moves a pest of a plant it did not touch into the past, nor takes one away: the house's hours stay kept)
        if (!touched.has(k) || what === "move") { if (k in before) eq(after, before[k], `${k}'s pest as it was before ${what} at ${t}`); }
      }
    }
  }
  ok(moves > 10 && refills > 5 && lifts > 5 && kept > 20, `moves ${moves}, rooms filled again ${refills}, houses lifted ${lifts}, plants that kept a stretch ${kept}, ${deedsDone} writes`);

  /* ── nobody calls town.house_kept; no bare write ── */
  for (const role of ["anon", "authenticated"]) ok(!(await v(`select has_function_privilege('${role}','town.house_kept(jsonb,jsonb,jsonb,bigint,boolean)','execute') v`)), `town.house_kept closed to ${role}`);
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");

  console.log(`v286 dry run: ${checks} checks passed`);
} finally {
  await db.close();
}
