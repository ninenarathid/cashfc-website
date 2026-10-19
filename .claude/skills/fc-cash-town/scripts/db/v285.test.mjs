// v285, crops keep a deeper market, dry-run: the file runs on the chain through v283 as checked out on Windows (CR at
// its line ends) and again as written (the second run changes nothing, and keeps a knob an admin has changed); then:
//   * each function is its text before but for the lines meant, word for word;
//   * town.market_things is lib/town/market's thingOf for every thing whose price moves (a crop's usual amount, ceiling
//     and fall; every other thing as before, its numbers unchanged by the file);
//   * town.market_rolled moves a market a few rounds on as lib/town/market's rolled does, crops by their own fall;
//   * town.market_now keeps the heads with the market at a round's turn;
//   * public.town_farm_prices is farmPricesOf (the usual amount at the kept heads, what is left so far), for a member.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v285.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V277 } from "./build-v277.mjs";
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const market = await import("@/lib/town/market");
const { ITEMS } = await import("@/lib/town/items");

const CHAIN = [...BEFORE_V277, "v277_forty_six_things_to_wear", "v283_the_farm_picks_for_one_and_tells_its_prices"], FILE = "supabase/v285_crops_keep_a_deeper_market.sql";
const SIGS = ["town.market_knobs()", "town.market_things(jsonb)", "town.market_rolled(jsonb,integer,integer,jsonb,jsonb)", "town.market_now()"];
let checks = 0;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const diffOf = (a, b, at = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffOf(a[k], b[k], `${at}.${k}`));
  return [`${at}: ${JSON.stringify(a)?.slice(0, 160)} against ${JSON.stringify(b)?.slice(0, 160)}`];
};
const eq = (a, b, what) => { try { assert.deepEqual(norm(a), norm(b)); } catch { assert.fail(`${what}:\n  ${diffOf(norm(a), norm(b)).slice(0, 12).join("\n  ")}`); } checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const def = async (sig) => v("select replace(pg_get_functiondef($1::regprocedure), chr(13), '') v", [sig]);
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  // (the market's knobs as the live database has them: the code's, read live 2026-10-19)
  const K = market.MARKET;
  const live = { floor: K.floor, made: K.made, margin: K.margin, ceil_a: K.ceil[0], ceil_b: K.ceil[1], ceil_c: K.ceil[2], fall: K.fall, rise: K.rise, memory: K.memory, bend: K.bend, heads: K.heads, lately: K.lately, min_volume: K.minVolume,
    ...Object.fromEntries(Object.entries(K.usual).map(([kind, n]) => [kind, n])) };
  for (const [key, value] of Object.entries(live)) await db.query("insert into public.town_knobs (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [`market_${key}`, value]);
  const before = Object.fromEntries(await Promise.all(SIGS.map(async (s) => [s, await def(s)])));
  const thingsBefore = await v("select town.market_things(town.market_knobs()) v");

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const after = Object.fromEntries(await Promise.all(SIGS.map(async (s) => [s, await def(s)])));
  await db.query("update public.town_knobs set value = 30 where key = 'market_crop_fall'");
  await db.exec(sql);
  for (const s of SIGS) eq(await def(s), after[s], `a second run leaves ${s} as the first made it`);
  eq(await v("select value v from public.town_knobs where key = 'market_crop_fall'"), 30, "a second run keeps a knob the admin changed");
  await db.query("update public.town_knobs set value = 25 where key = 'market_crop_fall'");
  eq(await v("select jsonb_object_agg(key, value) v from public.town_knobs where key in ('market_crop', 'market_crop_anchor', 'market_crop_ceil', 'market_crop_fall')"), { market_crop: 15, market_crop_anchor: 3, market_crop_ceil: 150, market_crop_fall: 25 }, "the three knobs, beside the crops' usual worth");

  // ── word for word but for the lines meant ──
  const pairsOf = (block) => {
    const take = (tag) => [...block.matchAll(new RegExp(`\\$${tag}(\\d)\\$([\\s\\S]*?)\\$${tag}\\1\\$`, "g"))].map((m) => m[2]);
    const o = take("o"), n = take("n"); assert.equal(o.length, n.length); return o.map((x, i) => [x, n[i]]);
  };
  const blocks = sql.split(/-- ── \d\. /).slice(1);
  const blockOf = { "town.market_knobs()": blocks.find((b) => b.startsWith("town.market_knobs")), "town.market_things(jsonb)": blocks.find((b) => b.startsWith("town.market_things")),
    "town.market_rolled(jsonb,integer,integer,jsonb,jsonb)": blocks.find((b) => b.startsWith("town.market_rolled")), "town.market_now()": blocks.find((b) => b.startsWith("town.market_now")) };
  for (const s of SIGS) {
    const made = pairsOf(blockOf[s]).reduce((d, [o, n]) => { assert.equal(d.split(o).length, 2, `once in ${s}: ${o.slice(0, 40)}`); return d.replace(o, n); }, before[s]);
    eq(after[s], made, `${s} is its text before but for its lines`);
  }

  // ── town.market_things: lib/town/market's thingOf ──
  const k = await v("select town.market_knobs() v");
  eq([k.cropAnchor, k.cropCeil, k.cropFall, k.fall, k.ceil], [3, 150, 25, 40, [220, 200, 180]], "the knobs as the database reads them");
  const things = await v("select town.market_things(town.market_knobs()) v"), c = market.factsOf();
  const moving = market.movingOf(c);
  eq(Object.keys(things).sort(), [...moving].sort(), "the same things move");
  let crops = 0;
  for (const id of moving) {
    const t = market.thingOf(id, c), [usual, floor, ceil, batch, pays, fall] = things[id];
    ok(close(usual, t.usual), `${id}'s usual amount a head (${usual} against ${t.usual})`);
    eq([floor, ceil, batch, pays, fall ?? undefined], [t.floor, t.ceil, t.batch, ITEMS[id].pays, t.fall], `${id}'s floor, ceiling, batch, base and fall`);
    if (ITEMS[id].kind === "crop") crops++;
    else eq(things[id].slice(0, 5), thingsBefore[id], `${id} (no crop) as it was before the file`);
  }
  ok(crops > 50, `crops among them (${crops})`);
  eq(["kangkong", "tomato", "redOkra", "pumpkin", "bottleGourd", "blueCorn", "trellisBerry"].map((id) => Math.round(Math.max(things[id][0] * 40, things[id][3]))), [200, 122, 53, 33, 31, 27, 25], "the usual amounts a round at forty heads");

  // ── town.market_rolled: lib/town/market's rolled, a few rounds on ──
  const R = 41_490;
  for (const [label, at, sold, heads] of [
    ["a glut of dear crops and kangkong", { bottleGourd: { f: 150, m: 2 }, redOkra: { f: 200, m: 0.5 }, kangkong: { f: 100, m: 200 }, catfish: { f: 120, m: 3 } }, { bottleGourd: 46, redOkra: 61, kangkong: 900, catfish: 40 }, 40],
    ["nothing sold, prices over a crop's new ceiling", { basil: { f: 193, m: 0 }, sweetPotato: { f: 171, m: 1 }, minnow: { f: 180, m: 0 } }, {}, 10],
    ["a small village, every crop once", {}, Object.fromEntries(moving.filter((id) => ITEMS[id].kind === "crop").map((id, i) => [id, (i * 7) % 50])), 12],
  ]) {
    const m = { round: R, at, sold };
    const got = await v("select town.market_rolled($1::jsonb, $2, $3, town.market_things(town.market_knobs()), town.market_knobs()) v", [JSON.stringify(m), R + 3, heads]);
    const want = market.rolled(m, R + 3, heads, c);
    eq(got.market, want.market, `${label}: the market three rounds on`);
    eq(got.log, want.log, `${label}: the rounds written down`);
  }
  // (a crop over its new ceiling comes down to it by its own fall; a fish by its own)
  { const got = (await v("select town.market_rolled($1::jsonb, $2, 10, town.market_things(town.market_knobs()), town.market_knobs()) v", [JSON.stringify({ round: R, at: { basil: { f: 193, m: 0 }, minnow: { f: 100, m: 5000 } }, sold: {} }), R + 1])).market.at;
    ok(got.basil.f <= 150 && got.basil.f >= Math.round(193 * 0.75), `basil from 193 to ${got.basil.f}`);
    eq(got.minnow.f, 100, "a minnow, which cannot fall, as before"); }

  // ── town.market_now: the heads kept ──
  await db.query("insert into public.town_things (key, doc) values ('market', $1::jsonb) on conflict (key) do update set doc = excluded.doc", [JSON.stringify({ round: 41_000, at: {}, sold: {} })]);
  const now = await v("select town.market_now() v"), kept = await v("select doc v from public.town_things where key = 'market'");
  const heads = await v("select town.market_heads(town.market_knobs()) v");
  ok(now.round > 41_000 && now.heads === heads && kept.heads === heads && heads >= 10, `the heads kept with the market at the turn (${heads})`);

  // ── public.town_farm_prices: farmPricesOf ──
  const member = (await one("select id from public.profiles where is_admin limit 1")).id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [member]);
  const round = await v("select town.round_of(town.now_ms()) v");
  for (const m of [{ round, at: { kangkong: { f: 60, m: 500 }, bottleGourd: { f: 75, m: 40 } }, sold: { bottleGourd: 12, kangkong: 300 }, heads: 40 }, { round, at: {}, sold: {}, heads: 17 }]) {
    await db.query("update public.town_things set doc = $1::jsonb where key = 'market'", [JSON.stringify(m)]);
    const told = (await v("select public.town_farm_prices() v")).farmPrices;
    eq(told, market.farmPricesOf(m, c), `every crop's price, usual amount and what is left so far, at ${m.heads} heads`);
  }
  const told = (await v("select public.town_farm_prices() v")).farmPrices.things;
  eq([told.kangkong.usual, told.bottleGourd.usual], [Math.round(5 * 17), Math.round(Math.max(things.bottleGourd[0] * 17, 5))], "the usual amounts at the kept heads");
  ok(!(await v("select has_function_privilege('anon','public.town_farm_prices()','execute') v")) && (await v("select has_function_privilege('authenticated','public.town_farm_prices()','execute') v")), "the farm's prices: closed to anon, open to a signed-in member");

  console.log(`v285 dry run: ${checks} checks passed`);
} finally {
  await db.close();
}
