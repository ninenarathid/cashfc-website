// v276, things to wear had from the game, dry-run: the file runs twice (its guards against the chain through v275); the
// catalog's new row and the glasses on the stall are the code's; then:
//   * town.dress over random purses (the glasses alone and stacked, other things, empty slots, slots past the bag, had
//     already or not): lib/town/wear's dressFrom to the digit;
//   * as a member: the glasses worn from the bag are used up and had for good, the deed said in words, a second pair
//     refused and left in the bag, town_dressed() says what is had; anon and a stranger refused; the table and the
//     helpers closed to a browser;
//   * the flower clip: never at the knob's 0, always at 10000, only for the helpers' line and only for a count that
//     gives points, dropped once; the points counted as they were, whatever the roll; through a real deed's trigger too;
//   * "what it should say afterwards"; no bare write.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v276.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, FILE, SIGS } from "./build-v276.mjs";
// (the code read is the tree it is run in, FC_REPO or not)
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const W = await import("@/lib/town/wear");
const trade = await import("@/lib/town/trade");
const { ITEMS } = await import("@/lib/town/items");

let checks = 0, s = 276;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const eq = (a, b, what) => { assert.deepEqual(norm(a), norm(b), `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const defsOf = async () => Promise.all(SIGS.map(async (sig) => (await one(`select pg_get_functiondef('${sig}'::regprocedure) d`)).d));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const OLD = await defsOf(), sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = await defsOf();
  for (const [i, sig] of SIGS.entries()) ok(OLD[i] !== NEW[i], `${sig} written over`);

  /* ── the catalog ── */
  const cat = async (k) => (await one("select data from public.town_catalog where key=$1", [k])).data;
  eq(await cat("dress"), W.DRESS_ITEMS, "the row dress is the code's");
  const items = await cat("items"), goods = await cat("goods"), shelf = await cat("shelf");
  eq(items.wearGlasses, { kind: ITEMS.wearGlasses.kind, tier: ITEMS.wearGlasses.tier, stack: ITEMS.wearGlasses.stack, pays: ITEMS.wearGlasses.pays }, "the glasses a thing of the bag");
  eq(goods.wearGlasses, trade.GOODS.wearGlasses, "the glasses on the uncle's stall");
  ok(shelf.basic.includes("wearGlasses"), "…from the first day");
  eq(await v("select town.deed_th('dress') v"), "ใส่ของแต่งตัวเข้าตู้", "the deed in words");
  eq(await v("select town.deed_th('read') v"), "อ่านคัมภีร์", "…the other deeds' words as they were");

  /* ── town.dress against dressFrom ── */
  const OTHER = ["rod", "salt", "tomato", "seedCorn", "minnow"];
  let worn = 0, known = 0, none = 0;
  for (let k = 0; k < 400; k++) {
    const bag = Array.from({ length: 6 + int(6) }, () => (rand() < 0.35 ? null : rand() < 0.4 ? { item: "wearGlasses", n: 1 + int(5) } : { item: pick(OTHER), n: 1 + int(5) }));
    const purse = { ...trade.newPurse(), bag }, had = rand() < 0.3 ? ["glasses"] : rand() < 0.2 ? ["flower"] : [];
    const slot = rand() < 0.08 ? pick([-1, bag.length, bag.length + 3]) : int(bag.length);
    const want = W.dressFrom(purse, slot, had), got = await v("select town.dress($1::jsonb,$2,$3::text[]) v", [JSON.stringify(purse), slot, had]);
    eq(got.ok, want.ok, `slot ${slot} of ${JSON.stringify(bag[slot] ?? null)}, had ${had}`);
    if (want.ok) { eq([got.wearable, got.item, got.purse.bag], [want.wearable, want.item, want.purse.bag], `worn from slot ${slot}`); worn++; }
    else { eq(got.why, want.why, `refused from slot ${slot}`); if (want.why === "known") known++; else none++; }
  }
  ok(worn > 50 && known > 20 && none > 50, `every way taken (${worn} worn, ${known} known, ${none} none)`);

  /* ── as a member ── */
  const member = (await one("select p.id from public.profiles p order by p.id limit 1"))?.id;
  ok(member, "a member on the bench");
  const as = async (who, role, sqlText, args = []) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
    await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
    await db.exec(`set role ${role}`);
    try { return { row: (await db.query(sqlText, args)).rows[0] }; } catch (e) { return { err: String(e.message ?? e), code: e.code }; } finally { await db.exec("reset role"); }
  };
  const p0 = (await one("select town.purse_of($1,true) p", [member])).p;
  await one("select town.keep_purse($1,$2::jsonb)", [member, JSON.stringify({ ...p0, bag: [{ item: "tomato", n: 3 }, { item: "wearGlasses", n: 2 }, ...Array(8).fill(null)] })]);
  const first = await as(member, "authenticated", "select public.town_dress(1) r");
  ok(!first.err, `the member wears the glasses (${first.err ?? ""})`);
  const r1 = first.row.r;
  eq([r1.ok, r1.wearable, r1.dressed, r1.purse.bag[1]], [true, "glasses", ["glasses"], { item: "wearGlasses", n: 1 }], "one pair used up, the glasses had for good");
  eq((await one("select how from public.town_dressed where member_id=$1 and wearable='glasses'", [member])).how, "dress", "…kept as worn from the bag");
  eq((await one("select count(*)::int n from public.town_deeds where member_id=$1 and what='dress' and thing='wearGlasses'", [member])).n, 1, "…and the deed noted");
  const second = (await as(member, "authenticated", "select public.town_dress(1) r")).row.r;
  eq([second.ok, second.why, second.purse.bag[1]], [false, "known", { item: "wearGlasses", n: 1 }], "a second pair refused, left in the bag to sell");
  const empty = (await as(member, "authenticated", "select public.town_dress(0) r")).row.r;
  eq([empty.ok, empty.why, empty.purse.bag[0]], [false, "none", { item: "tomato", n: 3 }], "a tomato is nothing to wear");
  eq((await as(member, "authenticated", "select public.town_dress(5000) r")).row.r.why, "none", "a slot past the bag");
  eq((await as(member, "authenticated", "select public.town_dressed() r")).row.r, { dressed: ["glasses"] }, "town_dressed() says what is had");
  const anon = await as(null, "anon", "select public.town_dress(1) r");
  ok(anon.err && anon.code === "42501", `anon may not wear (${anon.err})`);
  ok((await as(null, "anon", "select public.town_dressed() r")).code === "42501", "anon may not ask");
  const stranger = await as("00000000-0000-0000-0000-00000000dead", "authenticated", "select public.town_dress(1) r");
  ok(stranger.err, `a stranger refused (${stranger.err})`);
  for (const role of ["anon", "authenticated"]) {
    eq((await one("select has_table_privilege($1,'public.town_dressed','select') a, has_table_privilege($1,'public.town_dressed','insert') b, has_table_privilege($1,'public.town_dressed','delete') c", [role])), { a: false, b: false, c: false }, `${role} has nothing of the table`);
    for (const sig of ["town.dress(jsonb,integer,text[])", "town.dressed_of(uuid)"]) eq((await one("select has_function_privilege($1,$2,'EXECUTE') ok", [role, sig])).ok, false, `${role} may not call ${sig}`);
  }
  const peek = await as(member, "authenticated", "select * from public.town_dressed");
  ok(peek.code === "42501", `a member may not read the table (${peek.err})`);

  /* ── the flower clip ── */
  const others = (await db.query("select p.id from public.profiles p where p.id <> $1 order by p.id limit 4", [member])).rows.map((r) => r.id);
  ok(others.length === 4, "four more members on the bench");
  const T = Date.UTC(2026, 9, 20, 5);
  const knob = (n) => db.query("update public.town_knobs set value=$1 where key='wear_flower_in_ten_thousand'", [n]);
  const flower = async (who) => (await one("select count(*)::int n from public.town_dressed where member_id=$1 and wearable='flower'", [who])).n;
  const work = async (who) => (await db.query("select line, kept from public.town_work where member_id=$1 order by line", [who])).rows;
  const counted = (who, done) => db.query("select town.work_counted($1,$2::jsonb,$3)", [who, JSON.stringify(done), T]);
  // deeds as town.work_done gives them (lib/town/line-points): a duet bell that rang is the helpers' points, a carry the
  // well's, a bell that rang over nothing no count at all
  const helped = { what: "bell", n: 2 }, carried = { what: "carry", n: 5 }, nothing = { what: "bell", n: 0 };
  const countsOf = async (done, who) => v("select town.work_counts_of($1::jsonb,$2) v", [JSON.stringify(done), who]);
  const [a, b, c, d] = others;
  ok((await countsOf(helped, a)).some((x) => x.line === "helpers" && x.raw > 0), "a helpers' count with points as the counts give it");
  ok((await countsOf(carried, a)).every((x) => x.line === "well"), "…a carry the well's");
  await knob(0);
  for (let k = 0; k < 30; k++) await counted(a, helped);
  eq(await flower(a), 0, "never at the knob's 0");
  const pointsAtNone = await work(a);
  ok(pointsAtNone.some((r) => r.line === "helpers"), "…the points counted");
  await knob(10000);
  await counted(b, carried); eq(await flower(b), 0, "not for another line");
  await counted(b, nothing); eq(await flower(b), 0, "not for a count with no points");
  for (let k = 0; k < 30; k++) await counted(c, helped);
  eq(await flower(c), 1, "always at 10000, and once");
  eq((await one("select how from public.town_dressed where member_id=$1 and wearable='flower'", [c])).how, "drop", "…kept as dropped");
  eq(await work(c), pointsAtNone.map((r) => r), "the points counted as they were whatever the roll");
  // the roll inside a deed's own trigger (the real way in): a duet bell that rang (lib/town/line-points: helpers' points)
  await db.query("insert into public.town_deeds (member_id, what, n) values ($1, 'bell', 2)", [b]);
  eq(await flower(b), 1, "dropped through a deed of the helpers' line");
  ok((await work(b)).some((r) => r.line === "helpers"), "…and its points counted");
  await knob(100);
  let drops = 0;
  for (let k = 0; k < 2000; k++) { await db.query("delete from public.town_dressed where member_id=$1 and wearable='flower'", [d]); await counted(d, helped); drops += await flower(d); }
  ok(drops > 4 && drops < 45, `the knob read: about one in a hundred at 100 (${drops} in 2000)`);
  await knob(10);

  /* ── what it should say afterwards ── */
  eq((await one("select value from public.town_knobs where key='wear_flower_in_ten_thousand'")).value, 10, "afterwards: the knob");
  eq((await one("select data->'wearGlasses' d from public.town_catalog where key='goods'")).d, { each: 1, price: 400, stock: 6 }, "afterwards: the stall");
  eq((await one("select data->'wearGlasses' d from public.town_catalog where key='dress'")).d, "glasses", "afterwards: the row");
  eq((await one("select has_function_privilege('anon','public.town_dress(integer)','execute') ok")).ok, false, "afterwards: anon");
  eq((await one("select has_table_privilege('authenticated','public.town_dressed','select') ok")).ok, false, "afterwards: the table");
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v276: ${checks} checks passed (town.dress: ${worn} worn, ${known} known, ${none} none; the flower ${drops} in 2000 at 100).`);
} finally { await db.close(); }
