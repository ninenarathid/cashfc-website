// v273, the enchanted hoe's move and the mandrake's top, dry-run: the file runs twice (its guards against the chain
// through v271); then, the Quality's salt set empty so that the draws are the code's (lib/town/farm, gardening,
// quality-plant):
//   * pickings of random plants (mine and another's, ripe at a first or a later picking, giants, plants on one plot
//     with a root, plants the mandrake sang to before), by random purses (the mandrake following, had and not
//     following, none; a blade in the hand; the garden twine), each the code's to the digit; my own with the mandrake
//     at heel every fruit at the range's top, any other as rolled before; no picking sings or counts a song;
//   * sweeps of the crescent sickle along random rows, the mandrake at heel and not, the code's to the digit;
//   * town.move_plant against lib/town/farm's movePlant over random beds (plants of every sort, houses, bare and tilled
//     ground) and random moves (onto empty ground, swaps, off the bed, onto another bed, worn and not, the day's moves
//     used and not, a bed of mine, another's and nobody's): every answer and every refusal the code's;
//   * a moved plant's yield, pests and fruits rolled as unmoved (by the plot it was sown at);
//   * public.town_move called by a member on beds laid through the trigger: the bed afterwards is the code's
//     (movePlant, then syncMove), every plant's gift that of its layout, the help moved, the purse counted, the deed
//     written; and every refusal (not mine, ripe, dead, a giant, over two plots, another bed, a house there, the
//     eleventh move of the day, the hoe not worn);
//   * the new functions closed to a browser, town_move open to a member only; no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v273.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, FILE, SIGS } from "./build-v273.mjs";
await import("./repo-ts-town.mjs");
const farm = await import("@/lib/town/farm");
const { gardenHarvest } = await import("@/lib/town/gardening");
const { syncMove, syncQuality, bedGift } = await import("@/lib/town/quality-plant");
const trade = await import("@/lib/town/trade");
const { CROPS } = await import("@/lib/town/items");
const { bedCorner, rowOf, BEDS_IN_FARM } = await import("@/lib/town/world");
const { dayOf } = await import("@/lib/town/stamina");
const { usedOf } = await import("@/lib/town/gifts");

const H = 3_600_000, T = Date.UTC(2026, 9, 20, 5), ME = "00000000-0000-0000-0000-0000000000a1", YOU = "00000000-0000-0000-0000-0000000000b2";
let checks = 0, s = 273;
/** Where two answers differ, by their paths: what a failing check says. */
const diffOf = (a, b, at = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffOf(a[k], b[k], `${at}.${k}`));
  return [`${at}: ${JSON.stringify(a)?.slice(0, 200)} against ${JSON.stringify(b)?.slice(0, 200)}`];
};
const eq = (a, b, what) => { try { assert.deepEqual(a, b); } catch { assert.fail(`${what}:\n  ${diffOf(norm(a), norm(b)).slice(0, 12).join("\n  ")}`); } checks++; };
/** A purse as the database's stowing leaves it: with an empty list of minerals among its rewards (town.stow_all), which the code's has not. */
const unstowed = (x) => {
  const p = x?.purse;
  if (!p?.professionRewards || JSON.stringify(p.professionRewards) !== '{"minerals":[]}') return x;
  const { professionRewards: _, ...rest } = p;
  return { ...x, purse: rest };
};
const ok = (c, what) => { assert.ok(c, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const MAINS = ["tomato", "eggplant", "cabbage", "carrot", "garlic", "scallion", "chili", "lime", "pumpkin", "kangkong", "corn"];
const HELPERS = ["marigold", "clover", "chamomile", "basil", "runnerBean", "fennel", "lavender"];
const qOf = () => ({ at: T - (1 + int(30)) * H, span: 0.2 + rand(), area: [rand(), rand(), rand(), rand()].map((a) => a * 0.95), nar: [rand() * 0.3, 0, rand() * 0.2] });
const purseOf = (gifts, items = [], hand = null) => {
  const p = trade.newPurse();
  return { ...p, stamina: { day: dayOf(T), left: pick([100, 100, 3, 0]) }, bag: items.reduce((bag, [id, n]) => trade.put(bag, id, n), Array(14).fill(null)), hand, ...(gifts ? { gifts } : {}) };
};
const MANDRAKE = () => pick([{ had: ["famMandrake"], charms: [], familiar: "famMandrake" }, { had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake" },
  { had: ["famMandrake"], charms: [] }, { had: ["famMandrake", "famGnome"], charms: [], familiar: "famGnome" }, undefined]);

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const defsOf = async () => Promise.all(SIGS.map(async (sig) => (await one(`select pg_get_functiondef('${sig}'::regprocedure) d`)).d));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const OLD = await defsOf(), sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = await defsOf();
  for (const [i, sig] of SIGS.entries()) ok(OLD[i] !== NEW[i], `${sig} written over`);
  const gifts = (await one("select data from public.town_catalog where key='gifts'")).data;
  eq([gifts.uses.charmHoe, gifts.uses.famMandrake ?? null], [{ n: 10, per: "day" }, null], "the catalog counts the hoe's moves and the mandrake's songs no longer");
  // (the draws are the code's with no salt; no rain and no insects counted on the bench's days, as the code is told)
  await db.exec("update town.quality_salt set salt='' where one");
  await db.exec("delete from public.town_weather where true; delete from public.town_swarms where true");

  /* ── pickings ── */
  let tops = 0, rolled = 0, theirs = 0, giants = 0, twined = 0, sungBefore = 0;
  for (let k = 0; k < 320; k++) {
    const [bx, by] = bedCorner(int(BEDS_IN_FARM)), key = `${bx + 1 + int(5)},${by + 1 + int(5)}`, crop = pick([...MAINS, ...HELPERS]), c = CROPS[crop], picks = c.picks ?? 1;
    const plant = { by: pick([ME, ME, ME, YOU]), crop, sown: T - Math.ceil((c.hours + 1) * (1 + rand())) * H - (picks + 2) * Math.ceil(c.again ?? 1) * H, boost: 0, watered: 0, fed: 0, guard: T + 999 * H, cured: 0, picked: 0, pickedAt: 0, q: qOf() };
    if (picks > 1 && rand() < 0.4) { plant.picked = 1 + int(picks - 1); plant.pickedAt = T - Math.ceil((c.again ?? 1) * 1.3) * H; }
    const shape = rand();
    if (shape < 0.12) { plant.giant = true; plant.root = key; plant.footprint = [key, `${bx + 1 + int(5)},${by}`]; }
    else if (shape < 0.35) { plant.root = key; plant.footprint = [key]; }
    if (rand() < 0.08 && !plant.giant) { plant.picked = picks; plant.pickedAt = T - Math.ceil(farm.encoreHours(crop) * 1.1) * H; plant.more = 1; }
    const hand = pick([null, null, "sickle", "shears"]), twine = rand() < 0.5, me = pick([ME, ME, ME, YOU, ""]);
    const purse = purseOf(MANDRAKE(), [...(hand ? [[hand, 1]] : []), ...(twine ? [["gardenTwine", 1]] : []), ...(rand() < 0.1 ? Array.from({ length: 13 }, () => ["salt", 50]) : [])], hand);
    const plot = { soil: "tilled", plant }, plots = { [key]: plot };
    const got = (await one("select town.pick($1,$2::jsonb,$3::jsonb,true,$4,$5,$6) v", [key, JSON.stringify(purse), JSON.stringify(plot), hand, T, me])).v;
    const base = farm.pick(key, purse, plot, true, hand, T, [], me), want = base.ok ? gardenHarvest(key, plots, purse, base, me, T, []) : base;
    eq(norm(unstowed(got)), norm(want), `a picking of ${crop} at ${key} by ${me || "nobody"}`);
    if (!want.ok) continue;
    const top = farm.atTop(purse, plant, me);
    if (top) { tops++; ok(want.fruits.values.every((v) => v === want.fruits.range.hi), "every fruit at the top"); }
    else { rolled++; eq(norm((await one("select town.pick($1,$2::jsonb,$3::jsonb,true,$4,$5) v", [key, JSON.stringify(purse), JSON.stringify(plot), hand, T])).v.fruits), norm(want.fruits), "rolled as before (the six arguments)"); }
    if (purse.gifts?.familiar === "famMandrake" && plant.by !== me && me) theirs++;
    if (top && plant.giant) giants++;
    if (top && twine && plant.root) { twined++; ok(trade.held(want.purse.bag, crop, want.fruits.values.length ? Math.max(...[3, 2, 1, 0].filter((g) => trade.held(want.purse.bag, crop, g) > 0)) : 0) === trade.held(want.purse.bag, crop), "the twine's fruit at the top too"); }
    if (plant.more) sungBefore++;
    // (no picking sings any more, nor counts a song)
    ok(!want.plot.plant || farm.moreOf(want.plot.plant) === farm.moreOf(plant), "nothing sung");
    eq(usedOf(want.purse, "famMandrake", T), usedOf(purse, "famMandrake", T), "no song counted");
  }
  ok(tops > 30 && rolled > 30 && theirs > 5 && giants > 2 && twined > 3 && sungBefore > 3, `pickings of every sort (top ${tops}, rolled ${rolled}, another's with the mandrake ${theirs}, giants ${giants}, twine ${twined}, sung before ${sungBefore})`);

  /* ── the crescent sickle's sweep ── */
  let swept = 0;
  for (let k = 0; k < 70; k++) {
    const bed = int(BEDS_IN_FARM), [bx, by] = bedCorner(bed), y = by + int(7), keys = rowOf(bx, y).map(([u, v]) => `${u},${v}`), plots = {};
    for (const key of keys) if (rand() < 0.8) { const crop = pick(["tomato", "eggplant", "cabbage", "carrot", "garlic", "scallion"]), c = CROPS[crop]; plots[key] = { soil: "tilled", plant: { by: rand() < 0.9 ? ME : YOU, crop, sown: T - (c.hours + 2) * H, boost: 0, watered: 0, fed: 0, guard: T + 999 * H, cured: 0, picked: 0, pickedAt: 0, q: qOf() } }; }
    const at = pick(Object.keys(plots).length ? Object.keys(plots) : keys), marks = Object.fromEntries(Object.keys(plots).filter(() => rand() < 0.85).map((key) => [key, rand() < 0.6]));
    const purse = purseOf(pick([{ had: ["charmSickle", "famMandrake"], charms: ["charmSickle"], familiar: "famMandrake" }, { had: ["charmSickle", "famMandrake"], charms: ["charmSickle"] }, { had: ["charmSickle"], charms: ["charmSickle"] }]));
    const bedKept = { by: ME, tended: T - H, empty: 0 }, rest = int(4);
    const got = (await one("select town.row_tend($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,0,$6::jsonb,$7,$8,$9::jsonb) v", [at, JSON.stringify(keys), JSON.stringify(plots), JSON.stringify(bedKept), rest, JSON.stringify(purse), ME, T, JSON.stringify(marks)])).v;
    const want = farm.rowTend(at, keys, plots, bedKept, rest, 0, purse, ME, T, marks, []);
    eq(norm(unstowed(got)), norm(want), `a sweep from ${at}`);
    if (want.ok && want.deed === "pick" && purse.gifts.familiar === "famMandrake") swept++;
  }
  ok(swept > 5, `sweeps with the mandrake at heel (${swept})`);

  /* ── the move, as a rule: town.move_plant against movePlant ── */
  const layBed = (bed, now, mine = ME) => {
    const [bx, by] = bedCorner(bed), plots = {};
    for (let x = bx; x < bx + 7; x++) for (let y = by; y < by + 7; y++) {
      const key = `${x},${y}`, r = rand();
      if (r < 0.15) continue;
      if (r < 0.25) { plots[key] = { soil: "cleared", plant: null }; continue; }
      if (r < 0.45) { plots[key] = { soil: "tilled", plant: null }; continue; }
      if (r < 0.48) { plots[key] = { soil: "house", plant: null, house: { by: mine, at: now - H, rooms: [{ bug: "honeyBee", from: now - H, until: now + 40 * H }, null] } }; continue; }
      const crop = pick(rand() < 0.3 ? HELPERS : MAINS), c = CROPS[crop], age = pick([0.1, 0.4, 0.8, 1.3]), p = { by: rand() < 0.85 ? mine : YOU, crop, sown: now - Math.ceil(c.hours * age) * H - int(H), boost: 0, watered: pick([0, now - 2 * H]), fed: 0, guard: rand() < 0.75 ? now + 99 * H : 0, cured: 0, picked: 0, pickedAt: 0 };
      if (rand() < 0.6) p.q = qOf();
      if (rand() < 0.15) { p.root = key; p.footprint = [key]; }
      else if (rand() < 0.05 && x + 1 < bx + 7 && !plots[`${x + 1},${y}`]) { p.root = key; p.footprint = [key, `${x + 1},${y}`]; }
      else if (rand() < 0.04) { p.giant = true; p.root = key; p.footprint = [key]; }
      if (rand() < 0.05) p.home = `${bx + int(7)},${by + int(7)}`;
      plots[key] = { soil: "tilled", plant: p };
    }
    return plots;
  };
  const why = {};
  for (let k = 0; k < 320; k++) {
    const bed = int(BEDS_IN_FARM), plots = layBed(bed, T), keys = Object.keys(plots), [bx, by] = bedCorner(bed);
    const mineAt = keys.filter((key) => plots[key].plant?.by === ME), from = rand() < 0.85 && mineAt.length ? pick(mineAt) : pick(keys);
    const to = rand() < 0.08 ? `${bedCorner((bed + 1) % BEDS_IN_FARM)[0] + 2},${bedCorner((bed + 1) % BEDS_IN_FARM)[1] + 2}` : rand() < 0.04 ? from : rand() < 0.1 ? `${bx + int(7)},${by + int(7)}` : pick(keys);
    const day = dayOf(T), worn = pick([{ had: ["charmHoe"], charms: ["charmHoe"] }, { had: ["charmHoe"], charms: ["charmHoe"], used: { charmHoe: { k: day, n: int(11) } } }, { had: ["charmHoe"], charms: ["charmHoe"], used: { charmHoe: { k: day - 1, n: 10 } } }, { had: ["charmHoe"], charms: [] }, undefined]);
    const purse = purseOf(worn), owner = pick([ME, ME, ME, YOU, null]);
    const got = (await one("select town.move_plant($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7) v", [from, to, JSON.stringify(plots), JSON.stringify(purse), ME, T, owner])).v;
    const want = farm.movePlant(from, to, plots, purse, ME, T, owner, []);
    eq(norm(got), norm(want), `a move ${from} → ${to}`);
    const kind = want.ok ? (want.swap ? "swap" : "move") : want.why;
    why[kind] = (why[kind] ?? 0) + 1;
  }
  for (const kind of ["move", "swap", "none", "spent", "theirs", "soil"]) ok((why[kind] ?? 0) > 3, `moves of every answer (${JSON.stringify(why)})`);

  /* ── a moved plant rolls nothing again ── */
  for (let k = 0; k < 120; k++) {
    const bed = int(BEDS_IN_FARM), plots = layBed(bed, T), keys = Object.keys(plots);
    const pairs = keys.flatMap((from) => farm.moveTargets(from, plots, purseOf({ had: ["charmHoe"], charms: ["charmHoe"] }), ME, T, ME, []).map((to) => [from, to]));
    if (!pairs.length) continue;
    const [from, to] = pick(pairs), did = farm.movePlant(from, to, plots, purseOf({ had: ["charmHoe"], charms: ["charmHoe"] }), ME, T, ME, []);
    const moved = did.plots[to].plant, was = { ...plots[from].plant, q: moved.q }, P = JSON.stringify(moved), W = JSON.stringify(was);
    eq((await one("select town.yield_of($1,$2::jsonb,null) a, town.yield_of($3,$4::jsonb,null) b", [to, P, from, W])), { a: farm.yieldOf(from, was), b: farm.yieldOf(from, was) }, "the yield of the plot it was sown at");
    const t = T + int(72) * H, bareP = JSON.stringify({ ...moved, guard: 0 }), bareW = JSON.stringify({ ...was, guard: 0 });
    const pests = await one("select town.pest_at($1,$2::jsonb,$5) a, town.pest_at($3,$4::jsonb,$5) b", [to, bareP, from, bareW, t]);
    eq([pests.a === null ? null : Number(pests.a), pests.b === null ? null : Number(pests.b)], [farm.pestAt(from, { ...was, guard: 0 }, t), farm.pestAt(from, { ...was, guard: 0 }, t)], "its pests those of the plot it was sown at");
    const fruits = await one("select town.quality_harvest($1,$2::jsonb,5,$5,'',0,false) a, town.quality_harvest($3,$4::jsonb,5,$5,'',0,false) b", [to, P, farm.homeOf(from, was), W, T]);
    eq(fruits.a.values, fruits.b.values, "its fruits those of the plot it was sown at");
  }

  /* ── the member's move, through the trigger ── */
  const me = (await one("select p.id from public.profiles p order by p.id limit 1"))?.id, pal = (await one("select p.id from public.profiles p order by p.id offset 1 limit 1"))?.id;
  let rpc = "not run (no profile on the bench)";
  if (me && pal) {
    const as = async (sqlText, args = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(sqlText, args)).rows[0]; } finally { await db.exec("reset role"); } };
    const BED = 4, [bx, by] = bedCorner(BED);
    const readBed = async () => Object.fromEntries((await db.query(`select x::text||','||y::text k, soil, plant, house from public.town_plots where bed=${BED}`)).rows.map((r) => [r.k, { soil: r.soil, plant: r.plant ?? null, ...(r.house ? { house: r.house } : {}) }]));
    const setPurse = async (gifts) => { const p = (await one("select town.purse_of($1,true) p", [me])).p; await one("select town.keep_purse($1,$2::jsonb)", [me, JSON.stringify({ ...p, gifts })]); };
    const lay = async (now) => {
      await db.exec(`delete from public.town_plots where bed=${BED}; delete from public.town_plot_help where true`);
      const plots = Object.fromEntries(Object.entries(layBed(BED, now, me)).filter(([, p]) => !(p.plant?.footprint?.length > 1)).map(([key, p]) => [key, p.plant ? { ...p, plant: { ...p.plant, by: p.plant.by === YOU ? YOU : me } } : p]));
      for (const [key, p] of Object.entries(plots)) { const [x, y] = key.split(",").map(Number); await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)", [x, y, BED, p.soil, p.plant ? JSON.stringify(p.plant) : null, p.house ? JSON.stringify(p.house) : null, now - 2 * H]); }
      await db.query("insert into public.town_beds(bed,member_id,tended,empty) values($1,$2,$3,0) on conflict(bed) do update set member_id=excluded.member_id,tended=excluded.tended,empty=0", [BED, me, now - H]);
    };
    const nowOf = async () => Number((await one("select town.now_ms() t")).t);
    let now0 = await nowOf(), moves = 0, swaps = 0;
    const first = await (async () => { await lay(now0); await setPurse({ had: ["charmHoe"], charms: ["charmHoe"] }); try { return (await as("select public.town_move(-1,-1,-1,-1) r")).r; } catch (e) { return { error: String(e.message ?? e) }; } })();
    if (first.error) rpc = `not run (${first.error})`;
    else {
      eq(first, { ...first, ok: false, why: "soil" }, "off the farm");
      for (let k = 0; k < 14; k++) {
        now0 = await nowOf();
        await lay(now0);
        await setPurse({ had: ["charmHoe", "famMandrake"], charms: ["charmHoe"], ...(rand() < 0.5 ? { familiar: "famMandrake" } : {}) });
        await db.exec("begin");
        try {
          const now = await nowOf(), before = await readBed(), purse = (await one("select town.purse_of($1,false) p", [me])).p;
          const pairs = Object.keys(before).flatMap((from) => farm.moveTargets(from, before, purse, me, now, me, []).map((to) => [from, to]));
          if (!pairs.length) { await db.exec("rollback"); continue; }
          const [from, to] = rand() < 0.6 ? pick(pairs.filter(([, t]) => before[t].plant) .concat(pairs).slice(0, Math.max(1, pairs.filter(([, t]) => before[t].plant).length))) : pick(pairs);
          // (somebody helped each plant; and an old helper of the empty plot, of the plant that stood there before)
          const [fx, fy] = from.split(",").map(Number), [tx, ty] = to.split(",").map(Number);
          await db.query("insert into public.town_plot_help(x,y,helper,owner,water,carry) values($1,$2,$5,$6,3,0),($3,$4,$5,$6,1,2)", [fx, fy, tx, ty, pal, me]);
          const want = farm.movePlant(from, to, before, purse, me, now, me, []);
          ok(want.ok, `the code moves ${from} → ${to}`);
          const r = (await as("select public.town_move($1,$2,$3,$4) r", [fx, fy, tx, ty])).r;
          eq([r.ok, r.swap, r.left], [true, want.swap, 9], `the move ${from} → ${to}`);
          const after = await readBed(), expect = syncMove(before, want.plots, now, []);
          for (const key of new Set([...Object.keys(after), ...Object.keys(expect)])) eq(norm({ soil: after[key]?.soil, plant: after[key]?.plant }), norm({ soil: expect[key]?.soil, plant: expect[key]?.plant ?? null }), `the plot ${key} after ${from} → ${to}`);
          // (every plant's gift is what its layout gives it: the database's own reckoning, and the code's)
          for (const [key, plot] of Object.entries(after)) if (plot.plant && (!plot.plant.root || plot.plant.root === key)) {
            const g = (await one("select town.quality_bed_gift($1,$2::jsonb) g", [key, JSON.stringify(after)])).g;
            eq(norm(plot.plant.q?.bed ?? null), norm(g), `the gift at ${key}`);
            eq(norm(g), norm(bedGift(key, after) ?? null), `the code's gift at ${key}`);
          }
          // (the answer brings the bed as it is kept)
          eq(Object.keys(r.plots).sort(), Object.keys(after).sort(), "the answer brings the bed");
          eq((await one("select town.purse_of($1,false) p", [me])).p.gifts.used.charmHoe, { k: dayOf(now), n: 1 }, "one move counted");
          const deed = await one("select what, thing, n, doc from public.town_deeds where member_id=$1 order by at desc, id desc limit 1", [me]);
          eq([deed.what, deed.thing, deed.doc.from, deed.doc.to, deed.doc.swap ?? null], ["move", before[from].plant.crop, [fx, fy], [tx, ty], want.swap ? before[to].plant.crop : null], "the deed written");
          const help = (await db.query("select x::text||','||y::text k, water, carry from public.town_plot_help order by 1")).rows;
          eq(help, want.swap ? [{ k: from, water: 1, carry: 2 }, { k: to, water: 3, carry: 0 }].sort((a, b) => (a.k < b.k ? -1 : 1)) : [{ k: to, water: 3, carry: 0 }], "who helped goes with each plant");
          eq(Number((await one("select tended from public.town_beds where bed=$1", [BED])).tended), now, "the bed tended");
          if (want.swap) swaps++; else moves++;
          await db.exec("commit");
        } catch (e) { await db.exec("rollback"); throw e; }
      }
      ok(moves > 2 && swaps > 2, `moves (${moves}) and swaps (${swaps}) through the trigger`);
      // every refusal, through the member's call
      now0 = await nowOf();
      await db.exec(`delete from public.town_plots where bed=${BED}; delete from public.town_beds where bed=${BED}`);
      const P = (over = {}) => JSON.stringify({ by: me, crop: "pumpkin", sown: now0 - 10 * H, boost: 0, watered: 0, fed: 0, guard: now0 + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...over });
      const rows = [[0, 0, P()], [1, 0, null], [2, 0, P({ by: YOU })], [3, 0, P({ crop: "kangkong", sown: now0 - 9 * H })], [4, 0, P({ giant: true, root: `${bx + 4},${by}`, footprint: [`${bx + 4},${by}`] })],
        [0, 1, P({ root: `${bx},${by + 1}`, footprint: [`${bx},${by + 1}`, `${bx + 1},${by + 1}`] })], [3, 1, P({ guard: 0, sown: now0 - 130 * H })]];
      for (const [u, v, p] of rows) await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,$3,'tilled',$4::jsonb,$5)", [bx + u, by + v, BED, p, now0 - H]);
      await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,'house',null,$4::jsonb,$5)", [bx + 5, by, BED, JSON.stringify({ by: me, at: now0 - H, rooms: [null, null] }), now0 - H]);
      await db.query("insert into public.town_beds(bed,member_id,tended,empty) values($1,$2,$3,0)", [BED, me, now0 - H]);
      // (the plant over two plots stands on (1,1) too: the garden's trigger lays it there)
      eq((await one("select plant->>'root' r from public.town_plots where x=$1 and y=$2", [bx + 1, by + 1])).r, `${bx},${by + 1}`, "a plant over two plots");
      const dead = (await one("select (town.see($1,$2::jsonb,$3)->>'dead')::boolean d", [`${bx + 3},${by + 1}`, JSON.stringify({ soil: "tilled", plant: JSON.parse(P({ guard: 0, sown: now0 - 130 * H })) }), now0])).d;
      const [ox, oy] = bedCorner(BED + 1);
      await setPurse({ had: ["charmHoe"], charms: ["charmHoe"] });
      const move = async (a, b) => (await as("select public.town_move($1,$2,$3,$4) r", [bx + a[0], by + a[1], b[0], b[1]])).r;
      const at = (u, v) => [bx + u, by + v];
      eq((await move([2, 0], at(1, 0))).why, "theirs", "somebody else's plant");
      eq((await move([0, 0], at(2, 0))).why, "theirs", "onto somebody else's plant");
      eq((await move([3, 0], at(1, 0))).why, "soil", "a ripe plant");
      eq((await move([4, 0], at(1, 0))).why, "soil", "a giant");
      eq((await move([0, 1], at(1, 0))).why, "soil", "a plant over two plots");
      if (dead) eq((await move([3, 1], at(1, 0))).why, "soil", "a dead plant");
      eq((await move([0, 0], at(5, 0))).why, "soil", "onto an insect house");
      eq((await move([0, 0], [ox + 1, oy + 1])).why, "soil", "onto another bed");
      eq((await move([0, 0], at(6, 6))).why, "soil", "onto weeds");
      await setPurse({ had: ["charmHoe"], charms: [] });
      eq((await move([0, 0], at(1, 0))).why, "none", "the hoe not worn");
      await setPurse({ had: ["charmHoe"], charms: ["charmHoe"], used: { charmHoe: { k: dayOf(await nowOf()), n: 10 } } });
      eq((await move([0, 0], at(1, 0))).why, "spent", "the eleventh move of the day");
      await setPurse({ had: ["charmHoe"], charms: ["charmHoe"], used: { charmHoe: { k: dayOf(await nowOf()), n: 9 } } });
      const tenth = await move([0, 0], at(1, 0));
      eq([tenth.ok, tenth.left], [true, 0], "the tenth move of the day");
      await db.query("update public.town_beds set member_id=$2 where bed=$1", [BED, pal]);
      await setPurse({ had: ["charmHoe"], charms: ["charmHoe"] });
      eq((await move([1, 0], at(0, 0))).why, "theirs", "in somebody else's bed");
      rpc = `${moves} moves and ${swaps} swaps by a member, and every refusal${dead ? "" : " but a dead plant's (none died on the bench's day)"}`;
    }
  }

  /* ── closed and open ── */
  for (const sig of ["town.home_of(text,jsonb)", "town.movable(text,jsonb,text,bigint)", "town.open_plot(jsonb)", "town.moved_to(text,text,jsonb,bigint)", "town.move_plant(text,text,jsonb,jsonb,text,bigint,text)",
    "town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean)", "town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean)", "town.pick(text,jsonb,jsonb,boolean,text,bigint,text)"])
    for (const role of ["anon", "authenticated"]) eq((await one("select has_function_privilege($1,$2,'EXECUTE') ok", [role, sig])).ok, false, `${role} may not call ${sig}`);
  eq((await one("select has_function_privilege('anon','public.town_move(integer,integer,integer,integer)','EXECUTE') a, has_function_privilege('authenticated','public.town_move(integer,integer,integer,integer)','EXECUTE') m")), { a: false, m: true }, "a member may call town_move, a stranger not");
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v273: ${checks} checks passed (pickings ${tops} at the top and ${rolled} rolled, ${swept} sweeps with the mandrake, moves ${JSON.stringify(why)}; the RPC: ${rpc}).`);
} finally { await db.close(); }
