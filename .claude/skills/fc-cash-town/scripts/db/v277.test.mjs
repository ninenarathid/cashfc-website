// v277, forty-six things to wear, dry-run: the file runs twice (its guards against the chain through v276); the
// catalog's rows are the code's (wear_drops, dress, the workshop's recipes, the uncle's goods and shelf); then:
//   * every drop rule forced to "always": what town.work_counted drops for each kind of deed, at the hours before dawn,
//     early morning, midday, evening and late night, in rain and not, is lib/town/wear's dropsFor of the same counts,
//     to the thing; the pot's owner has the waiter's drop, not the one who ladled; and the points are the same whether
//     anything drops or not;
//   * at the real chances: about 2 in 100 lamps light the lamplighter's coat;
//   * everybody who laid or handed a stone before v277 has the builder's outfit and medal, nobody else; a stone laid
//     after drops nothing (the builder's two come from helping somebody else's work now);
//   * as a member: a tiny tiara made at the workbench and a monocle bought from the uncle, each worn into the wardrobe;
//   * "what it should say afterwards"; the wardrobe still closed to a browser; no bare write.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v277.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, FILE, SIGS } from "./build-v277.mjs";
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const W = await import("@/lib/town/wear");
const trade = await import("@/lib/town/trade");
const { craftRow } = await import("@/lib/town/crafting");
const { BASIC } = await import("@/lib/town/orders");
const { WEAR_CRAFTS, WEAR_GOODS } = await import("@/lib/town/wear-items");

let checks = 0;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const eq = (a, b, what) => { assert.deepEqual(norm(a), norm(b), `${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const defsOf = async () => Promise.all(SIGS.map(async (sig) => (await one(`select pg_get_functiondef('${sig}'::regprocedure) d`)).d));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const people = (await db.query("select p.id from public.profiles p order by p.id")).rows.map((r) => r.id);
  ok(people.length >= 4, "four members on the bench");
  const [me, cook, builder, other] = people;
  // the bridge's stones before v277 (the deeds' trigger counts them as v276 does: nothing dropped yet)
  await db.query("insert into public.town_deeds (member_id, what, n) values ($1, 'stone_lay', 1), ($1, 'stone_hand', 1), ($2, 'stone_hand', 1)", [builder, cook]);
  await db.exec("delete from public.town_dressed where true");
  await db.query("insert into public.town_deeds (member_id, what, n) values ($1, 'stone_lay', 1)", [builder]);
  eq((await one("select count(*)::int n from public.town_dressed")).n, 0, "before v277 a stone drops nothing");

  const OLD = await defsOf(), sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = await defsOf();
  for (const [i, sig] of SIGS.entries()) ok(OLD[i] !== NEW[i], `${sig} written over`);
  const given = (await db.query("select member_id, wearable, how from public.town_dressed order by 1, 2")).rows;
  eq(given, [...[cook, builder].sort().flatMap((id) => [{ member_id: id, wearable: "builder", how: "drop" }, { member_id: id, wearable: "medal", how: "drop" }])], "the bridge's builders have the outfit and the medal, nobody else");

  /* ── the catalog ── */
  const cat = async (k) => (await one("select data from public.town_catalog where key=$1", [k])).data;
  eq(await cat("wear_drops"), W.wearDropsRow(), "wear_drops is the code's");
  eq((await cat("wear_drops")).length, 17, "…the flower and sixteen");
  eq(await cat("dress"), W.DRESS_ITEMS, "dress is the code's");
  const recipes = (await cat("workshop")).recipes, code = craftRow().recipes;
  for (const id of Object.keys(WEAR_CRAFTS)) eq(recipes[id], code[id], `the bench makes ${id}`);
  const goods = await cat("goods"), shelf = await cat("shelf");
  for (const id of Object.keys(WEAR_GOODS)) { eq(goods[id], trade.GOODS[id], `the uncle sells ${id}`); ok(shelf.basic.includes(id) && BASIC.includes(id), `…${id} from the first day`); }

  /* ── every rule "always": the database's drops are the code's ── */
  const real = await cat("wear_drops");
  await db.query("update public.town_catalog set data = $1::jsonb where key = 'wear_drops'", [JSON.stringify(real.map((r) => ({ ...r, in: 10000 })))]);
  await db.exec("update public.town_knobs set value = 10000 where key = 'wear_flower_in_ten_thousand'");
  const fish = Object.keys((await cat("work")).fishing).find((k) => (k === "minnow")) ?? Object.keys((await cat("work")).fishing)[0];
  const DEEDS = [
    { what: "fishing", from: "play", won: true, thing: fish },
    { what: "gather", thing: "shiitake", doc: { how: "pick" } },
    { what: "net", thing: "monarch" }, { what: "net", thing: "cricket" },
    { what: "lamp_light" }, { what: "lamp_hand" }, { what: "stone_lay" },
    { what: "crystal", doc: { floor: 1 } }, { what: "vein", n: 1, doc: { floor: 1 } },
    { what: "fell", thing: "teak" }, { what: "fell", thing: "pine" },
    { what: "bell", n: 2 }, { what: "carry", n: 5 },
    // (the builder's two: helping somebody else's work; a braced tree is the bracer's, cook here)
    { what: "hew", doc: { whose: cook } }, { what: "bellows", doc: { whose: cook } }, { what: "fell", thing: "pine", doc: { braced: cook } },
    { what: "ladle", doc: { whose: cook } },
  ];
  const H = { 4: "before dawn", 6: "early morning", 12: "midday", 20: "evening", 0: "late night" };
  const atHour = (h) => Date.UTC(2026, 9, 20, h) - 7 * 3_600_000;
  let cases = 0, dropped = 0;
  const seen = new Set();
  for (const [h, band] of Object.entries(H)) for (const rain of [false, true]) {
    const at = atHour(Number(h));
    await db.exec("delete from public.town_weather where true");
    if (rain) await db.query("insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 0, 0, 1)", [Math.floor(at / 900000)]);
    eq(await v("select town.raining($1) v", [at]), rain, `${band}: the rain as asked`);
    for (const deed of DEEDS) {
      const done = { from: deed.from ?? "deed", won: deed.won, what: deed.what, thing: deed.thing ?? null, n: deed.n ?? 1, doc: deed.doc ?? {} };
      await db.exec("delete from public.town_dressed where true");
      await db.query("select town.work_counted($1, $2::jsonb, $3)", [me, JSON.stringify(done), at]);
      const got = (await db.query("select member_id, wearable from public.town_dressed order by 1, 2")).rows.map((r) => `${r.member_id === me ? "me" : r.member_id === cook ? "cook" : r.member_id}:${r.wearable}`).sort();
      const counts = await v("select town.work_counts_of($1::jsonb, $2) v", [JSON.stringify(done), me]);
      const want = counts.flatMap((c) => W.dropsFor(done, { line: c.line, raw: Number(c.raw) }, Number(h), rain, () => 0, { wear_flower_in_ten_thousand: 10000 })
        .map((w) => `${(c.to ?? me) === me ? "me" : c.to === cook ? "cook" : c.to}:${w}`));
      eq(got, [...new Set(want)].sort(), `${deed.what}${deed.thing ? ` ${deed.thing}` : ""} at ${band}${rain ? " in rain" : ""}`);
      for (const g of got) seen.add(g.split(":")[1]);
      cases++; dropped += got.length;
    }
  }
  const DROPS = W.wearDropsRow().map((r) => r.wear);
  eq([...seen].sort(), [...DROPS].sort(), "every drop came at least once");
  ok([...seen].length === 17, "…all seventeen");
  // the waiter's drop goes to the pot's owner
  await db.exec("delete from public.town_dressed where true");
  await db.query("select town.work_counted($1, $2::jsonb, $3)", [me, JSON.stringify({ from: "deed", what: "ladle", thing: null, n: 1, doc: { whose: cook } }), atHour(12)]);
  eq((await db.query("select member_id, wearable from public.town_dressed")).rows, [{ member_id: cook, wearable: "waiter" }], "the waiter's outfit is the pot owner's");
  // the points, whether anything drops or not
  const pointsAfter = async (who, all) => {
    await db.query("delete from public.town_work where member_id = $1", [who]);
    await db.query("update public.town_catalog set data = $1::jsonb where key = 'wear_drops'", [JSON.stringify(real.map((r) => ({ ...r, in: all ? 10000 : 0 })))]);
    for (const deed of DEEDS) await db.query("select town.work_counted($1, $2::jsonb, $3)", [who, JSON.stringify({ from: deed.from ?? "deed", won: deed.won, what: deed.what, thing: deed.thing ?? null, n: deed.n ?? 1, doc: deed.doc ?? {} }), atHour(4)]);
    return (await db.query("select line, kept from public.town_work where member_id = $1 order by line", [who])).rows;
  };
  eq(await pointsAfter(other, true), await pointsAfter(other, false), "the points are the same whatever drops");

  /* ── the real chances ── */
  await db.query("update public.town_catalog set data = $1::jsonb where key = 'wear_drops'", [JSON.stringify(real)]);
  await db.exec("update public.town_knobs set value = 10 where key = 'wear_flower_in_ten_thousand'");
  let coats = 0;
  for (let k = 0; k < 3000; k++) {
    await db.query("delete from public.town_dressed where member_id = $1", [other]);
    await db.query("select town.work_counted($1, $2::jsonb, $3)", [other, JSON.stringify({ from: "deed", what: "lamp_light", thing: null, n: 1, doc: {} }), atHour(12)]);
    coats += (await one("select count(*)::int n from public.town_dressed where member_id = $1 and wearable = 'lamplighter'", [other])).n;
  }
  ok(coats > 30 && coats < 95, `about 2 in 100 lamps give the coat (${coats} in 3000)`);

  /* ── as a member: made at the bench, bought from the uncle, each worn ── */
  const as = async (who, sqlText, args = []) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]);
    await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await db.exec("set role authenticated");
    try { return { row: (await db.query(sqlText, args)).rows[0] }; } catch (e) { return { err: String(e.message ?? e) }; } finally { await db.exec("reset role"); }
  };
  await db.exec("delete from public.town_dressed where true");
  const p0 = (await one("select town.purse_of($1,true) p", [me])).p;
  await one("select town.keep_purse($1,$2::jsonb)", [me, JSON.stringify({ ...p0, coins: 5000, bag: [{ item: "silverNodule", n: 2 }, { item: "chipSapphire", n: 1 }, ...Array(8).fill(null)] })]);
  const craftSig = (await one("select p.oid::regprocedure::text s from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'town_craft'")).s;
  const made = await as(me, `select public.town_craft($1, $2) r`, ["wearTiara", "00000000-0000-0000-0000-0000000277a1"]);
  ok(!made.err && made.row.r.ok, `the tiara made at the bench (${craftSig}: ${made.err ?? JSON.stringify(made.row?.r).slice(0, 160)})`);
  const tiaraAt = made.row.r.purse.bag.findIndex((s) => s?.item === "wearTiara");
  ok(tiaraAt >= 0 && made.row.r.purse.coins === 5000 - 180, `…for its fee, into the bag (${tiaraAt}, ${made.row.r.purse.coins})`);
  const worn = (await as(me, "select public.town_dress($1) r", [tiaraAt])).row.r;
  eq([worn.ok, worn.wearable, worn.dressed], [true, "tiara", ["tiara"]], "…and worn into the wardrobe");
  const bought = await as(me, "select public.town_buy('wearMonocle', 1) r");
  ok(!bought.err && bought.row.r.ok, `a monocle bought from the uncle (${bought.err ?? ""})`);
  const monocleAt = bought.row.r.purse.bag.findIndex((s) => s?.item === "wearMonocle");
  eq((await as(me, "select public.town_dress($1) r", [monocleAt])).row.r.dressed, ["tiara", "monocle"], "…and worn too");

  /* ── afterwards ── */
  eq((await one("select jsonb_array_length(data) n from public.town_catalog where key = 'wear_drops'")).n, 17, "afterwards: the drops");
  eq((await one("select data->'wearMonocle' d from public.town_catalog where key = 'goods'")).d, { each: 1, price: 2000, stock: 3 }, "afterwards: the monocle");
  eq((await one("select data->'wearTiara' d from public.town_catalog where key = 'dress'")).d, "tiara", "afterwards: the tiara");
  eq((await one("select data->'recipes'->'wearTiara' d from public.town_catalog where key = 'workshop'")).d, { fee: 180, needs: [["silverNodule", 2], ["chipSapphire", 1]] }, "afterwards: its recipe");
  for (const role of ["anon", "authenticated"]) eq((await one("select has_table_privilege($1,'public.town_dressed','select') ok", [role])).ok, false, `${role} still has nothing of the wardrobe's table`);
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v277: ${checks} checks passed (${cases} deeds forced, ${dropped} drops, every one the code's; the coat ${coats} in 3000).`);
} finally { await db.close(); }
