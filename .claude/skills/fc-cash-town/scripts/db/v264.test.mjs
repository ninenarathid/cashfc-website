// v264, the time bands' newcomers, dry-run: the file runs twice (its guards against the chain through v263); the
// catalog's rows are the code's; the 94 old haunts, their insects and their draws are as they were, to the last roll,
// at every band of a day; the newcomers' haunts give what the code gives (lib/town/insects' swarmAt), and nothing comes
// back from or to one; the forest's places give what the code gives (lib/town/forest's holds), the old finds as they
// were; a cast's odds are the code's (lib/town/fishing's freshOdds over oddsOf) at every band, in every water, on every
// bait, every fish's chance unchanged; the dew is the code's (lib/town/stream-work); the guano is the code's
// (lib/town/mining's guanoOf); the new functions are nobody's to call; no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v264.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { catalogOf, CATALOG_KEYS } = await import("@/lib/town/catalog");
const { HAUNTS, swarmAt, comeback } = await import("@/lib/town/insects");
const { SPOTS, holds } = await import("@/lib/town/forest");
const { oddsOf, freshOdds } = await import("@/lib/town/fishing");
const { STREAM_WORK, streamWork } = await import("@/lib/town/stream-work");
const { guanoOf } = await import("@/lib/town/mining");
const { FRESH_FISH_IDS } = await import("@/lib/town/items");
const { BANDS } = await import("@/lib/town/bands");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20) - 7 * H, WORD = "a word of the day";
const at = (h) => T0 + h * H;
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const near = (a, b, what) => { assert.equal(a.length, b.length, `${what}: ${a.length} against ${b.length} entries`); a.forEach((o, i) => { assert.equal(o.what, b[i].what, `${what} #${i}`); assert.ok(Math.abs(o.p - b[i].p) < 1e-12, `${what} ${o.what}: ${o.p} against ${b[i].p}`); }); checks++; };
// a moment in each band, and two more within the long ones
const MOMENTS = BANDS.flatMap((b) => [b.from + 0.4, (b.from + b.to) / 2 + 0.1].map((h) => at(h % 24 + (h >= 24 ? 24 : 0))));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v255_important_town_announcements", "v258_finite_profession_rewards", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  await db.exec("delete from public.town_takes; delete from public.town_comebacks;");
  // what the old haunts and the forest's places gave before v264, at every band of a day
  const oldIns = (await one("select town.cat('insects') c")).c, OLD = oldIns.haunts.length;
  const bugsBefore = [], wildBefore = [];
  for (const t of MOMENTS) {
    for (let i = 0; i < OLD; i++) bugsBefore.push((await one("select town.bug_at($1,$2,null,$3) b", [i, t, WORD])).b);
    for (const s of SPOTS) if (s.kind === "mushrooms" || s.kind === "flowers") wildBefore.push((await one("select town.wild_holds($1,$2,null,$3) w", [s.id, t, WORD])).w);
  }

  const sql = readFileSync("supabase/v264_species_of_the_time_bands.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const cat = catalogOf(), { keys, over } = CATALOG_KEYS.v264;
  for (const key of [...keys, ...over]) eq((await one("select town.cat($1) c", [key])).c, norm(cat[key]), `the catalog's ${key} is the code's`);
  const ins = (await one("select town.cat('insects') c")).c;
  eq(ins.haunts.slice(0, OLD), oldIns.haunts, "the old haunts kept");
  eq(Object.fromEntries(Object.keys(oldIns.bugs).map((k) => [k, ins.bugs[k]])), oldIns.bugs, "the old insects kept");
  // (and the code's catalog has the good gardens' 24 after them, which v267 brings: v264's own bug_at has nothing there)
  eq(ins.haunts.length, OLD + 31 + 24, "thirty-one haunts of the newcomers, and the gardens'");

  // the old haunts' draws, to the last roll; every haunt's, the code's
  let k = 0, newOut = 0;
  for (const t of MOMENTS) {
    for (let i = 0; i < ins.haunts.length; i++) {
      const got = (await one("select town.bug_at($1,$2,null,$3) b", [i, t, WORD])).b;
      if (i < OLD) eq(got, bugsBefore[k++], `old haunt ${i} at ${new Date(t).toISOString()}`);
      const want = swarmAt(WORD, HAUNTS[i], t);
      eq(got ? { turn: got.turn, bug: got.bug, n: got.n, seed: got.seed } : null, want ? { turn: want.turn, bug: want.bug, n: want.n, seed: want.seed } : null, `haunt ${i} (${HAUNTS[i].kind}) at ${new Date(t).toISOString()}`);
      if (got && i >= OLD) newOut++;
    }
  }
  assert.ok(newOut >= 15, `newcomers out at their haunts (${newOut})`); checks++;

  // a catch brings nothing back from a newcomers' haunt, and nothing back to one
  for (let i = 0; i < 120; i++) {
    const from = i % ins.haunts.length, t = MOMENTS[i % MOMENTS.length] + i * 37_000, r = [((i * 7) % 10) / 10, ((i * 3) % 10) / 10, 0.5];
    const got = (await one("select town.comeback($1,$2,'[]'::jsonb,$3,$4,$5,null,$6) b", [from, t, r[0], r[1], r[2], WORD])).b;
    const want = comeback(WORD, HAUNTS[from], t, [], [], r);
    eq(got ?? null, want ? norm(want) : null, `a comeback from ${from}`);
    if (got) assert.ok(got.haunt < OLD, "came back to an old haunt"), checks++;
    if (from >= OLD) eq(got, null, "none from a newcomers' haunt");
  }

  // the forest: the old finds as they were, the quiet ones the code's
  k = 0;
  let quiet = 0;
  for (const t of [...MOMENTS, at(3.2), at(3.7), at(4.4), at(23.4), at(24.6), at(25.5)]) {
    for (const s of SPOTS.filter((x) => x.kind === "mushrooms" || x.kind === "flowers")) {
      const got = (await one("select town.wild_holds($1,$2,null,$3) w", [s.id, t, WORD])).w;
      if (k < wildBefore.length) { const was = wildBefore[k++]; if (was) eq(got, was, `spot ${s.id} as it was`); else if (got) { assert.ok(["mistMushroom", "queenPollen"].includes(got.item), `only a rare find in a quiet turn: ${got.item}`); checks++; } }
      const want = holds(WORD, s, t);
      eq(got ? { turn: got.turn, item: got.item, n: got.n } : null, want ? norm(want) : null, `spot ${s.id} (${s.kind}) at ${new Date(t).toISOString()}`);
      if (got && (got.item === "mistMushroom" || got.item === "queenPollen")) quiet++;
    }
  }
  assert.ok(quiet >= 1, `a rare find seen (${quiet})`); checks++;

  // a cast's odds at every band, in every water, on every bait, deck and bank, with and without a pair's or a wary hand's tiers
  let fresh = 0;
  for (const t of MOMENTS) {
    const hour = Math.floor(((t + 7 * H) % (24 * H)) / H);
    for (const habitat of ["town", "creek", "pool", "headwater"]) for (const bait of ["worm", "dough", "corn", "cricket", "shrimpLive", "minnow", "loach", "zebrafish", "branBait", "antEggs"]) for (const shallow of habitat === "town" ? [false, true] : [false]) for (const never of [[], ["legend"], ["uncommon", "rare", "legend"]]) {
      const current = habitat === "town" ? "eddy" : "shelter";
      const got = (await one("select town.fresh_odds(town.river_odds($1,$2,false,false,$3,'{}'::text[],null,$4,$5),$1,$2,$4,$3,$6::text[]) o", [bait, hour, shallow, habitat, current, never])).o;
      const want = freshOdds(oddsOf(bait, hour, false, false, shallow, [], habitat, current), bait, hour, habitat, shallow, never);
      near(got, want, `${bait} at ${hour} in ${habitat}${shallow ? " (bank)" : ""} without ${never.join("/") || "nothing"}`);
      if (want.some((o) => FRESH_FISH_IDS.includes(o.what))) fresh++;
    }
  }
  assert.ok(fresh >= 100, `casts with a newcomer (${fresh})`); checks++;
  assert.ok(sql.includes("odds := town.fresh_odds(odds, p_bait, (under->>'hour')::integer, habitat, not deep::boolean,"), "town_cast lays the newcomers last"); checks++;

  // the dew at the stream's banks, in its band only
  const purse = { ...trade.newPurse() }, site = STREAM_WORK.sites[1];
  for (const h of [4.9, 5.1, 6.9, 7.1, 12]) {
    const got = (await one("select town.stream_work($1::jsonb,'sample','morningDew',$2,$3,null,'me',$4) d", [JSON.stringify(purse), site.x, site.y, at(h)])).d;
    const want = streamWork(purse, "sample", "morningDew", [site.x, site.y], null, "me", at(h));
    eq(got.ok, want.ok, `the dew at ${h}`);
    if (want.ok) eq(norm(got.got), norm(want.got), `the dew's got at ${h}`);
  }

  // the guano: a go's rocks, at dusk and not, in the cave and at the foot, a bag with room and a full one
  const full = { ...trade.newPurse(), bag: trade.newPurse().bag.map(() => ({ item: "stone", n: 99 })) };
  for (const [h, floor, p] of [[18.2, 4, trade.newPurse()], [18.8, 11, trade.newPurse()], [17.9, 4, trade.newPurse()], [18.5, 0, trade.newPurse()], [18.5, 7, full]]) {
    const mined = { ok: true, done: true, purse: p, struck: { first: "me" }, broke: [1, 2, 3, 4, 5, 6, 7, 8], chained: null, got: [["stone", 8], ["shardIron", 2]], way: null, vein: null, crystal: false, loose: [], cost: 1, spent: false,
      each: [1, 2, 3, 4, 5, 6, 7, 8].map((rock) => ({ rock, kind: rock === 3 ? "vein" : "stone", shards: 0 })), moss: [] };
    const go = { now: at(h), floor, salt: WORD };
    const tsTurn = (await import("@/lib/town/mining")).turnOf(go.now);
    const got = (await one("select town.guano_of($1::jsonb,$2::jsonb,$3) d", [JSON.stringify(mined), JSON.stringify({ now: go.now, floor }), WORD])).d;
    const want = guanoOf(mined, go, tsTurn);
    eq(norm(got.got), norm(want.got), `the guano got at ${h} on floor ${floor}`);
    eq(norm(got.purse.bag), norm(want.purse.bag), `the guano's bag at ${h} on floor ${floor}`);
  }

  for (const role of ["anon", "authenticated"]) for (const sig of ["town.fresh_odds(jsonb,text,integer,text,boolean,text[])", "town.bug_weight(jsonb,double precision,jsonb)", "town.guano_of(jsonb,jsonb,text)"])
    eq((await one(`select has_function_privilege('${role}','${sig}','EXECUTE') a`)).a, false, `${role} may not call ${sig}`);
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /bug_at|comeback|wild_holds|stream_work|mine_pay|town_cast|fresh_odds|bug_weight|guano_of/.test(JSON.stringify(b))), [], "no bare write");
  console.log(`v264: ${checks} checks passed (the catalog's ${keys.length + over.length} rows; ${OLD} old haunts and their draws kept at ${MOMENTS.length} moments; every haunt, comeback, forest place, cast, the dew and the guano against the code; ${newOut} newcomers out, ${quiet} rare finds, ${fresh} casts with a newcomer).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
