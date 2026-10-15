// v268, graded things on stalls, the notice board and the jar, dry-run: the file runs twice (its guards against the
// chain through v267); every function it writes over answers a run of normal cases (no grade anywhere on a line, a
// notice or in the jar) exactly as the chain through v267 did, and as the code does; for random purses, stalls, jars and
// boards with normal and graded stacks, the database's answer is the code's (lib/town/notices, shop, jar, trade):
// the plain count and take at a grade, the most a graded thing may be asked for, a stall opened, bought from and
// brought to, how many of a line can change hands and how a comer is told it, a thing dropped into the jar, the jar
// shared and what waits taken; the board through the functions a member calls (post, buy, bring, fetch, take down) for
// two members, step by step, and what each is told of it (the notices, their grade, and the sales a grade apart); a
// stall through the functions a member calls, by a page that names a grade and one from before that names none; the
// jar's drop and take through its functions; the old signatures gone, the new ones a member's (and no stranger's), the
// helpers nobody's; no bare write; a guard that stops the file on a definition it does not know.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v268.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, GONE, NEW } from "./build-v268.mjs";
await import("./repo-ts-town.mjs");
const N = await import("@/lib/town/notices");
const S = await import("@/lib/town/shop");
const J = await import("@/lib/town/jar");
const trade = await import("@/lib/town/trade");
const { ITEMS } = await import("@/lib/town/items");

const FILE = "supabase/v268_graded_things_on_stalls_and_the_board.sql";
const H = 3_600_000;
let checks = 0, s = 268;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 500)} against ${JSON.stringify(b)?.slice(0, 500)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];
// (the database keeps an object's keys in its own order: compare as data)
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const J_ = (x) => JSON.stringify(x);

// what the bags hold: graded produce, a graded preparation and dish, things that never carry a grade, forged tools, a can
// with water and without, pots of food (graded and not)
const PLAINS = ["tomato", "carrot", "kangkong", "corn", "curryPaste", "tomYum", "minnow", "salt"];
const ALL = [...PLAINS, "hoe", "can", "potFull"];
function stackOf(graded = true) {
  const r = rand();
  if (r < 0.06) return { item: "hoe", n: 1, ...(rand() < 0.5 ? { plus: 1 } : {}) };
  if (r < 0.1) return { item: "can", n: 1, ...(rand() < 0.5 ? { water: 3 } : {}) };
  if (r < 0.13) return { item: "potFull", n: 1, of: { dish: "tomYum", left: 2 }, ...(graded && rand() < 0.5 ? { grade: 2 } : {}) };
  const item = pick(PLAINS), n = 1 + int(Math.min(ITEMS[item].stack, 15)), g = graded && trade.mayGrade(item) ? pick([0, 0, 1, 2, 3]) : 0;
  return g ? { item, n, grade: g } : { item, n };
}
const bagOf = (graded = true, fill = 0.6) => Array.from({ length: 10 }, () => (rand() < fill ? stackOf(graded) : null));
const purseOf = (graded = true, coins = int(600)) => ({ ...trade.newPurse(), coins, bag: bagOf(graded) });

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const A = "00000000-0000-0000-0000-000000000001", B = "00000000-0000-0000-0000-000000000002";
const as = async (me, q, a = []) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]);
  await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
  await db.exec("set role authenticated");
  try { return (await db.query(q, a)).rows[0]; } finally { await db.exec("reset role"); }
};
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const NOW = Number((await one("select town.now_ms() t")).t);
  const sk = (await one("select town.shop_knobs() k")).k, nk = (await one("select town.notice_knobs() k")).k;
  const SK = { ...S.SHOP, lines: sk.lines, reach: sk.reach, most: sk.most, quiet: sk.quiet, every: sk.every, cap: sk.cap, capless: sk.capless };
  const NK = { ...N.NOTICES, slots: nk.slots, more: nk.more, slotPrice: nk.slot_price, fee: nk.fee, hours: nk.hours, cap: nk.cap, capless: nk.capless, most: nk.most, shown: nk.shown, days: nk.days };
  eq([SK.lines, SK.reach, SK.most, SK.cap, NK.fee, NK.hours], [S.SHOP.lines, S.SHOP.reach, S.SHOP.most, S.SHOP.cap, N.NOTICES.fee, N.NOTICES.hours], "the bench's knobs are the code's");
  const HERE = [30, 38], SEEN = ["tomato", "carrot", "kangkong", "curryPaste", "tomYum", "minnow", "salt", "hoe"];

  // ── normal cases, answered by the chain through v267 (and kept to be answered again after v268) ──
  const normal = { open: [], buy: [], sell: [], can: [], told: [], drop: [], settle: [], collect: [] };
  const shopOf = (graded, beat = NOW) => {
    const lines = [];
    for (let i = 0, many = 1 + int(5); i < many; i++) {
      const item = pick(PLAINS), g = graded && trade.mayGrade(item) && rand() < 0.6 ? pick([1, 2, 3]) : 0, n = 1 + int(20);
      lines.push({ kind: pick(["sell", "buy"]), item, n, left: rand() < 0.2 ? int(n + 1) : n, price: 1 + int(40), ...(g ? { grade: g } : {}) });
    }
    return { by: "them", at: HERE, lines, since: NOW - H, beat, took: int(100), paid: int(100) };
  };
  const askOf = (graded) => Array.from({ length: 1 + int(5) }, () => {
    const item = rand() < 0.05 ? "nothing" : pick([...PLAINS, "hoe", "can"]), g = graded ? pick([undefined, undefined, 0, 1, 2, 3, 3, 5, -1, "2"]) : undefined;
    const gg = trade.gradeArg(g) ?? 0, cap = item in ITEMS ? S.capOf(item, SK, gg) : 50;
    return { kind: rand() < 0.03 ? "lend" : pick(["sell", "buy"]), item, n: rand() < 0.04 ? 0 : 1 + int(14), price: Math.max(1, Math.round(cap * (0.3 + rand() * 0.8))), ...(g === undefined ? {} : { grade: g }) };
  });
  // (most asks are ones a page would make: what the bag holds at its grade to sell, what has been met at a grade it can carry to buy)
  const goodAsk = (purse) => Array.from({ length: 1 + int(3) }, () => {
    const held = purse.bag.filter((x) => x && !x.of && !x.water && !x.plus), kind = held.length && rand() < 0.5 ? "sell" : "buy";
    const st = kind === "sell" ? pick(held) : null, item = st ? st.item : pick(SEEN), g = st ? (st.grade ?? 0) : trade.mayGrade(item) ? pick([0, 1, 2, 3]) : 0;
    const n = st ? 1 + int(st.n) : 1 + int(4), price = Math.max(1, Math.round(S.capOf(item, SK, g) * (0.2 + rand() * 0.9)));
    return { kind, item, n, price, ...(g ? { grade: g } : rand() < 0.2 ? { grade: 0 } : {}) };
  });
  const atOf = () => (rand() < 0.85 ? [HERE[0] + int(7) - 3, HERE[1] + int(7) - 3] : [HERE[0] + 4 + int(3), HERE[1]]);
  const thingsOf = (graded) => {
    const out = [];
    for (let i = 0, many = int(4); i < many; i++) { const id = pick(["tomato", "carrot", "minnow", "tomYum", "salt"]), g = graded && trade.mayGrade(id) ? pick([0, 1, 2, 3]) : 0; if (!out.some((t) => t[0] === id && J.jarGrade(t) === g)) out.push(g ? [id, 1 + int(9), g] : [id, 1 + int(9)]); }
    return out;
  };
  for (let k = 0; k < 160; k++) {
    // a stall: lines with no grade; bags that hold graded stacks beside the normal ones (passed over, before as now)
    const purse = purseOf(), ask = askOf(false);
    normal.open.push({ args: [J_(purse), "me", J_(ask), HERE[0], HERE[1], NOW, J_(SEEN), J_(sk)], ts: S.open(purse, "me", ask, HERE, NOW, SEEN, SK) });
    const shop = shopOf(false, rand() < 0.9 ? NOW - int(100) * 1000 : NOW - 400_000), mine = purseOf(), theirs = purseOf(), line = pick(shop.lines), n = rand() < 0.05 ? 0 : 1 + int(8), at = atOf();
    const item = rand() < 0.85 ? line.item : pick(PLAINS);
    normal.buy.push({ args: [J_(mine), J_(theirs), J_(shop), "me", item, n, at[0], at[1], NOW, J_(sk)], ts: S.buy(mine, theirs, shop, "me", item, n, at, NOW, SK) });
    normal.sell.push({ args: [J_(mine), J_(theirs), J_(shop), "me", item, n, at[0], at[1], NOW, J_(sk)], ts: S.sell(mine, theirs, shop, "me", item, n, at, NOW, SK) });
    normal.can.push({ args: [J_(line), J_(theirs)], ts: S.canOf(line, theirs) });
    normal.told.push({ args: [J_(shop), J_(theirs), NOW, J_(sk)], ts: S.toldOf(shop, theirs, NOW, SK) });
    // the jar: pairs only, and a slot that is no graded stack
    const jar = { round: 7, coins: int(30), things: thingsOf(false) }, p = purseOf(), slot = p.bag.findIndex((x) => !x?.grade);
    const what = rand() < 0.3 ? { coins: int(10) - 1 } : { slot: rand() < 0.1 ? 11 : slot, n: rand() < 0.1 ? 99 : 1 + int(3) };
    normal.drop.push({ args: [J_(p), J_(jar), J_(what)], ts: J.drop(p, jar, what) });
    const work = [["a", 1 + int(9)], ["b", 1 + int(9)], ["c", int(3)]].filter(([, w]) => w > 0), owed = rand() < 0.5 ? {} : { a: { coins: int(5), things: thingsOf(false) } };
    normal.settle.push({ args: [J_(jar), J_(owed), J_(work), 8], ts: J.settleWith(jar, owed, work, 8) });
    const mineOwed = rand() < 0.1 ? null : { coins: int(4), things: thingsOf(false) }, full = rand() < 0.3 ? { ...p, bag: p.bag.map((x) => x ?? { item: "hoe", n: 1 }) } : p;
    normal.collect.push({ args: [J_(full), J_(mineOwed)], ts: J.collect(full, mineOwed ? { me: mineOwed } : {}, "me") });
  }
  const OLD = {
    open: "select town.shop_open($1::jsonb,$2,$3::jsonb,$4,$5,$6,$7::jsonb,$8::jsonb) v",
    buy: "select town.shop_buy($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb) v",
    sell: "select town.shop_sell($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb) v",
    can: "select town.shop_can($1::jsonb,$2::jsonb) v",
    told: "select town.shop_told_of($1::jsonb,$2::jsonb,$3,$4::jsonb) v",
    drop: "select town.jar_drop($1::jsonb,$2::jsonb,$3::jsonb) v",
    settle: "select town.jar_settle($1::jsonb,$2::jsonb,$3::jsonb,$4) v",
    collect: "select town.jar_collect($1::jsonb,$2::jsonb) v",
  };
  // (after v268 a stall's line is named by its grade: the normal one's is 0)
  const NEWQ = { ...OLD, buy: "select town.shop_buy($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb,0) v", sell: "select town.shop_sell($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb,0) v" };
  for (const [fn, cases] of Object.entries(normal)) for (const c of cases) c.old = norm((await one(OLD[fn], c.args)).v);

  // ── the file, twice ──
  const sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  for (const sig of GONE) eq((await one("select to_regprocedure($1) is null gone", [sig])).gone, true, `${sig} is gone`);
  for (const sig of NEW) eq((await one("select to_regprocedure($1) is not null made", [sig])).made, true, `${sig} is made`);

  // ── the normal cases: as the chain answered them, and as the code does ──
  const compare = (fn, got, want) => {
    if (fn === "collect") return { ...(got.ok ? { ok: true, coins: got.coins, things: got.things, purse: got.purse, mine: got.mine ?? null } : got) };
    return got;
  };
  const tsCompare = (fn, ts) => (fn === "collect" && ts.ok ? { ok: true, coins: ts.coins, things: ts.things, purse: ts.purse, mine: ts.owed.me ?? null } : ts);
  let normalN = 0;
  for (const [fn, cases] of Object.entries(normal)) for (const c of cases) {
    const now = norm((await one(NEWQ[fn], c.args)).v);
    eq(now, c.old, `${fn}, a normal case, as the chain through v267 answered it (${J_(c.args).slice(0, 200)})`);
    eq(norm(compare(fn, now)), norm(tsCompare(fn, c.ts)), `${fn}, a normal case, as the code answers it`);
    normalN++;
  }

  // ── the helpers ──
  for (const v of [undefined, null, 0, 1, 2, 3, 4, -1, 1.5, "2", true, [], {}]) {
    const got = (await one("select town.grade_arg(($1::jsonb)->'g') g", [J_(v === undefined ? {} : { g: v })])).g;
    eq(got, trade.gradeArg(v) ?? -1, `a grade as a listing names it: ${J_(v)}`);
  }
  eq((await one("select town.grade_arg(null) g")).g, 0, "no grade at all is normal");
  const mayDb = (await one("select jsonb_object_agg(k, town.may_grade(k)) m from jsonb_object_keys(town.cat('items')) k")).m;
  const ids = Object.keys(ITEMS).filter((id) => id in mayDb);
  eq(ids.length, Object.keys(ITEMS).length, "the catalog has every thing of the code's");
  eq(Object.fromEntries(ids.map((id) => [id, mayDb[id]])), Object.fromEntries(ids.map((id) => [id, trade.mayGrade(id)])), "what may carry a grade");
  const capsDb = (await one(`select jsonb_object_agg(k || ':' || g, jsonb_build_array(floor(town.notice_cap(k, town.notice_knobs()) * town.grade_pays(k, g)), floor(town.shop_cap(k, town.shop_knobs()) * town.grade_pays(k, g))))
                             c from jsonb_object_keys(town.cat('items')) k, generate_series(0, 3) g`)).c;
  eq(Object.fromEntries(ids.flatMap((id) => [0, 1, 2, 3].map((g) => [`${id}:${g}`, capsDb[`${id}:${g}`].map(Number)]))),
     Object.fromEntries(ids.flatMap((id) => [0, 1, 2, 3].map((g) => [`${id}:${g}`, [N.capOf(id, NK, g), S.capOf(id, SK, g)]]))), "the most of every thing at every grade, on the board and at a stall");
  for (let k = 0; k < 250; k++) {
    const bag = bagOf(), B_ = J_(bag);
    const got = (await one("select jsonb_object_agg(i || ':' || g, town.plain_g($1::jsonb, i, g)) c, jsonb_object_agg(i, town.plain($1::jsonb, i)) p from unnest($2::text[]) i, generate_series(0, 3) g", [B_, ALL]));
    eq(got.c, Object.fromEntries(ALL.flatMap((i) => [0, 1, 2, 3].map((g) => [`${i}:${g}`, N.plain(bag, i, g)]))), "plain at every grade");
    eq(got.p, Object.fromEntries(ALL.map((i) => [i, N.plain(bag, i)])), "plain, the normal grade's, unchanged");
    const id = pick(ALL), g = pick([0, 1, 2, 3]), has = N.plain(bag, id, g);
    if (has > 0) { const n = 1 + int(has); eq(norm((await one("select town.take_plain_g($1::jsonb,$2,$3,$4) v", [B_, id, n, g])).v), norm(N.takePlain(bag, id, n, g)), "take plain at a grade"); }
  }

  // ── a stall, graded: opened, bought from, brought to, counted and told ──
  let opened = 0, gradedLines = 0, sold = 0, brought = 0;
  for (let k = 0; k < 500; k++) {
    const purse = purseOf(), ask = rand() < 0.6 ? goodAsk(purse) : askOf(true);
    const got = norm((await one(NEWQ.open, [J_(purse), "me", J_(ask), HERE[0], HERE[1], NOW, J_(SEEN), J_(sk)])).v), want = S.open(purse, "me", ask, HERE, NOW, SEEN, SK);
    eq(got, norm(want), `a stall opened (${J_(ask)})`);
    if (want.ok) { opened++; gradedLines += want.shop.lines.filter((l) => l.grade).length; }
  }
  for (let k = 0; k < 900; k++) {
    const shop = shopOf(true, rand() < 0.9 ? NOW - int(100) * 1000 : NOW - 400_000), mine = purseOf(), theirs = purseOf(), line = pick(shop.lines), at = atOf();
    // (a buyer or bringer holds some of the line's grade most of the time)
    if (rand() < 0.6) { const slot = mine.bag.findIndex((x) => !x); if (slot >= 0) mine.bag[slot] = { item: line.item, n: 1 + int(6), ...(line.grade ? { grade: line.grade } : {}) }; }
    if (rand() < 0.6) { const slot = theirs.bag.findIndex((x) => !x); if (slot >= 0) theirs.bag[slot] = { item: line.item, n: 1 + int(6), ...(line.grade ? { grade: line.grade } : {}) }; }
    const item = rand() < 0.9 ? line.item : pick(PLAINS), g = rand() < 0.85 ? (line.grade ?? 0) : pick([0, 1, 2, 3]), n = rand() < 0.04 ? 0 : 1 + int(5);
    const args = [J_(mine), J_(theirs), J_(shop), "me", item, n, at[0], at[1], NOW, J_(sk), g];
    const b = norm((await one("select town.shop_buy($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) v", args)).v), wb = S.buy(mine, theirs, shop, "me", item, n, at, NOW, SK, g);
    eq(b, norm(wb), `bought from a stall (${item} ×${n} at grade ${g})`);
    const c = norm((await one("select town.shop_sell($1::jsonb,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) v", args)).v), wc = S.sell(mine, theirs, shop, "me", item, n, at, NOW, SK, g);
    eq(c, norm(wc), `brought to a stall (${item} ×${n} at grade ${g})`);
    if (wb.ok && g) sold++;
    if (wc.ok && g) brought++;
    eq((await one("select town.shop_can($1::jsonb,$2::jsonb) v", [J_(line), J_(theirs)])).v, S.canOf(line, theirs), "how many of a line can change hands");
    eq(norm((await one("select town.shop_told_of($1::jsonb,$2::jsonb,$3,$4::jsonb) v", [J_(shop), J_(theirs), NOW, J_(sk)])).v), norm(S.toldOf(shop, theirs, NOW, SK)), "a stall as a comer is told it");
  }
  assert.ok(opened >= 60 && gradedLines >= 40 && sold >= 30 && brought >= 30, `enough graded stalls opened and deals done (${opened} opened, ${gradedLines} graded lines, ${sold} graded bought, ${brought} graded brought)`); checks++;

  console.log(`  stalls: ${opened} opened, ${gradedLines} graded lines, ${sold} graded bought, ${brought} graded brought`);
  // ── the jar, graded ──
  let droppedGraded = 0, sharedGraded = 0, takenGraded = 0;
  for (let k = 0; k < 400; k++) {
    const jar = { round: 7, coins: int(30), things: thingsOf(true) }, p = purseOf();
    const what = rand() < 0.2 ? { coins: int(10) } : { slot: int(10), n: 1 + int(3) };
    const d = norm((await one(NEWQ.drop, [J_(p), J_(jar), J_(what)])).v), wd = J.drop(p, jar, what);
    eq(d, norm(wd), `a thing dropped into the jar (${J_(what)} of ${J_(p.bag[what.slot] ?? null)})`);
    if (wd.ok && "slot" in what && p.bag[what.slot]?.grade) droppedGraded++;
    const work = [["a", 1 + int(9)], ["b", 1 + int(9)], ["c", int(3)]].filter(([, w]) => w > 0), owed = rand() < 0.5 ? {} : { a: { coins: int(5), things: thingsOf(true) } };
    const st = norm((await one(NEWQ.settle, [J_(jar), J_(owed), J_(work), 8])).v), ws = J.settleWith(jar, owed, work, 8);
    eq(st, norm(ws), "the jar shared");
    if (ws.shared && jar.things.some((t) => t.length === 3)) sharedGraded++;
    const mineOwed = rand() < 0.08 ? null : { coins: int(4), things: thingsOf(true) }, full = rand() < 0.3 ? { ...p, bag: p.bag.map((x) => x ?? (rand() < 0.5 ? { item: "hoe", n: 1 } : null)) } : p;
    const c = norm((await one(NEWQ.collect, [J_(full), J_(mineOwed)])).v), wc = J.collect(full, mineOwed ? { me: mineOwed } : {}, "me");
    eq(compare("collect", c), norm(tsCompare("collect", wc)), "what waits at the jar taken");
    if (wc.ok && wc.things.some((t) => t.length === 3)) takenGraded++;
  }
  console.log(`  the jar: ${droppedGraded} graded dropped, ${sharedGraded} graded shares, ${takenGraded} graded taken`);
  assert.ok(droppedGraded >= 40 && sharedGraded >= 40 && takenGraded >= 40, `enough graded things in the jar (${droppedGraded} dropped, ${sharedGraded} shares, ${takenGraded} taken)`); checks++;

  // ── the board, through the functions a member calls, two members step by step ──
  const names = Object.fromEntries((await db.query("select id::text id, coalesce(character_name, display_name, discord_username, '') n from public.profiles")).rows.map((r) => [r.id, r.n]));
  const purseNow = async (who) => (await one("select town.purse_of($1,false) p", [who])).p;
  // (a member's purse is a row once it has been held: keep_purse writes only a row there is)
  const setPurse = async (who, p) => { await one("select town.purse_of($1,true)", [who]); await one("select town.keep_purse($1,$2::jsonb)", [who, J_(p)]); };
  async function boardNow() {
    const notices = (await db.query("select id, member_id::text by_, kind, item, n, rest, price, held, at, until, grade from public.town_notices order by id")).rows
      .map((r) => ({ id: Number(r.id), by: r.by_, kind: r.kind, item: r.item, n: r.n, left: r.rest, price: r.price, held: r.held, at: Number(r.at), until: Number(r.until), ...(r.grade ? { grade: r.grade } : {}) }));
    const books = (await db.query("select member_id::text who, due, more from public.town_notice_books")).rows;
    const sales = (await db.query("select at, item, n, price, grade from public.town_notice_sales order by id")).rows.map((r) => ({ at: Number(r.at), item: r.item, n: r.n, price: r.price, ...(r.grade ? { grade: r.grade } : {}) }));
    const seq = await one("select last_value, is_called from public.town_notices_id_seq");
    return { next: Number(seq.last_value) + (seq.is_called ? 1 : 0), notices, due: Object.fromEntries(books.map((b) => [b.who, Number(b.due)])), more: Object.fromEntries(books.filter((b) => b.more).map((b) => [b.who, b.more])), sales };
  }
  await db.exec("delete from public.town_notice_sales where true; delete from public.town_notices where true; delete from public.town_notice_books where true;");
  const nowDb = async () => Number((await one("select town.now_ms() t")).t);
  // sales of the week before, normal and graded, for what each is told
  for (let k = 0; k < 30; k++) {
    const t = (await nowDb()) - int(9 * 24) * H, item = pick(["tomato", "carrot", "minnow"]), g = item === "minnow" ? 0 : pick([0, 0, 1, 2, 3]);
    await db.query("insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice, grade) values ($1,$2,$3,$4,'sell',$5,$6,null,$7)", [t, item, 1 + int(5), 1 + int(30), A, B, g]);
  }
  for (const who of [A, B]) await setPurse(who, { ...(await purseNow(who)), coins: 2000 + int(1000), bag: bagOf() });
  // (what has been met is read again now, with these bags: the village has met tomatoes, carrots and the rest)
  await db.exec(`update public.town_things set doc = '{"at": 0}'::jsonb where key = 'seen'`);
  await one("select town.seen_now()");
  const whys = {};
  const ops = { post: 0, postGraded: 0, buy: 0, fill: 0, fetch: 0, down: 0, refused: 0 };
  for (let step = 0; step < 320; step++) {
    const who = pick([A, B]), purse = await purseNow(who), board = await boardNow(), op = pick(["post", "post", "post", "buy", "buy", "fill", "fill", "fetch", "down"]);
    let did, rpc;
    const now = await nowDb();
    if (op === "post") {
      const kind = pick(["sell", "want"]), held = purse.bag.filter(Boolean), gradedHeld = held.filter((x) => x.grade && !x.of);
      const stack = (gradedHeld.length && rand() < 0.6 ? pick(gradedHeld) : pick(held)) ?? { item: "tomato", n: 1 };
      const item = kind === "sell" && rand() < 0.8 ? stack.item : pick([...PLAINS, "corn"]), g = kind === "sell" && rand() < 0.8 ? (stack.grade ?? 0) : pick([0, 0, 1, 2, 3, 3, 4, -1]);
      const n = rand() < 0.03 ? 0 : kind === "sell" ? 1 + int(Math.max(1, N.plain(purse.bag, item, Math.max(0, Math.min(3, g))) + 1)) : 1 + int(8);
      const cap = N.capOf(item, NK, [0, 1, 2, 3].includes(g) ? g : 0), price = Math.max(1, Math.round(cap * (0.2 + rand() * 0.9)));
      const seen = (await one("select town.seen_has($1) s", [item])).s ? [item] : [];
      did = N.post(purse, board, who, kind, item, n, price, now, seen, NK, g);
      rpc = g === 0 && rand() < 0.5
        ? (await as(who, "select public.town_notice_post(p_kind => $1, p_item => $2, p_n => $3, p_price => $4) r", [kind, item, n, price])).r
        : (await as(who, "select public.town_notice_post(p_kind => $1, p_item => $2, p_n => $3, p_price => $4, p_grade => $5) r", [kind, item, n, price, g])).r;
      ops.post++; if (did.ok && g) ops.postGraded++;
    } else {
      const theirs = board.notices.filter((x) => (op === "fetch" || op === "down" ? x.by === who : x.by !== who) && (op !== "buy" || x.kind === "sell") && (op !== "fill" || x.kind === "want"));
      const notice = rand() < 0.9 ? pick(theirs) : pick(board.notices);
      const id = notice?.id ?? 999999, n = rand() < 0.03 ? 0 : 1 + int(Math.max(1, notice?.left ?? 3));
      // (a bringer holds some of the notice's grade most of the time)
      if (op === "fill" && notice && rand() < 0.6) { const slot = purse.bag.findIndex((x) => !x); if (slot >= 0) { purse.bag[slot] = { item: notice.item, n: 1 + int(8), ...(notice.grade ? { grade: notice.grade } : {}) }; await setPurse(who, purse); } }
      if (op === "buy") { did = N.buy(purse, board, who, id, n, now, NK); rpc = (await as(who, "select public.town_notice_buy($1,$2) r", [id, n])).r; }
      if (op === "fill") { did = N.fill(purse, board, who, id, n, now, NK); rpc = (await as(who, "select public.town_notice_fill($1,$2) r", [id, n])).r; }
      if (op === "fetch") { did = N.fetch(purse, board, who, id); rpc = (await as(who, "select public.town_notice_fetch($1) r", [id])).r; }
      if (op === "down") { did = N.takeDown(purse, board, who, id); rpc = (await as(who, "select public.town_notice_down($1) r", [id])).r; }
      ops[op]++;
    }
    eq({ ok: rpc.ok ?? false, why: rpc.why }, { ok: did.ok, why: did.ok ? undefined : did.why }, `${op} by ${who.slice(-1)}: the same answer (step ${step})`);
    if (!did.ok) { ops.refused++; whys[`${op}:${did.why}`] = (whys[`${op}:${did.why}`] ?? 0) + 1; continue; }
    const after = await boardNow(), mineAfter = await purseNow(who);
    eq(norm({ bag: mineAfter.bag, coins: mineAfter.coins }), norm({ bag: did.purse.bag, coins: did.purse.coins }), `${op}: the member's purse after (step ${step})`);
    // (the moment a notice was pinned and the moment of a sale are the database's own)
    const fresh = after.notices.find((x) => !board.notices.some((y) => y.id === x.id));
    const wantNotices = did.board.notices.map((x) => (fresh && x.id === fresh.id ? { ...x, at: fresh.at, until: fresh.until } : x));
    if (fresh) eq(fresh.until - fresh.at, NK.hours * H, "a notice is up for its hours");
    eq(norm(after.notices), norm(wantNotices), `${op}: the notices after (step ${step})`);
    eq(norm(after.sales.map(({ at, ...x }) => x)), norm(did.board.sales.map(({ at, ...x }) => x)), `${op}: the sales after (step ${step})`);
    eq([A, B].map((m) => after.due[m] ?? 0), [A, B].map((m) => did.board.due[m] ?? 0), `${op}: what waits at the board (step ${step})`);
    if (step % 10 === 0) {
      for (const me of [A, B]) {
        const t = (await one("select town.notices_told($1) t", [me])).t, b = await boardNow(), at = await nowDb();
        const w = N.told(b, me, at, (id) => names[id] ?? "", t.seen, NK);
        eq(norm({ notices: t.notices, mine: t.mine, due: t.due, sales: t.sales }), norm({ notices: w.notices, mine: w.mine, due: w.due, sales: w.sales }), `what ${me.slice(-1)} is told of the board (step ${step})`);
      }
    }
  }
  const told = (await one("select town.notices_told($1) t", [A])).t;
  assert.ok(ops.postGraded >= 15 && ops.buy + ops.fill >= 30 && Object.keys(told.sales).some((key) => key.includes(":")) && Object.keys(told.sales).some((key) => !key.includes(":")),
    `enough graded notices and sales told apart (${J_(ops)}, refused ${J_(whys)}; sales by ${Object.keys(told.sales).join(" ")})`); checks++;
  assert.ok((await one("select count(*)::int n from public.town_deeds where what like 'notice_%' and doc ? 'grade'")).n > 0, "a graded deed at the board says its grade"); checks++;

  // ── a stall, through the functions a member calls: a page that names a grade, and one from before that names none ──
  await db.exec(`delete from public.town_shops where true`);
  let stallDeals = 0;
  for (let story = 0; story < 12; story++) {
    await setPurse(A, { ...(await purseNow(A)), coins: 1500, bag: [{ item: "tomato", n: 9, grade: 2 }, { item: "tomato", n: 6 }, { item: "carrot", n: 5, grade: 3 }, ...bagOf().slice(3)] });
    await setPurse(B, { ...(await purseNow(B)), coins: 900, bag: [{ item: "carrot", n: 4, grade: 1 }, { item: "carrot", n: 3 }, ...bagOf().slice(2)] });
    const lines = [{ kind: "sell", item: "tomato", n: 5 + int(4), price: 20 + int(60), grade: 2 }, { kind: "sell", item: "tomato", n: 1 + int(5), price: 1 + int(30) },
      { kind: "buy", item: "carrot", n: 1 + int(5), price: 1 + int(40), grade: 1 }, ...(rand() < 0.5 ? [{ kind: "buy", item: "carrot", n: 2, price: 5 }] : [])];
    const o = (await as(A, "select public.town_shop_open($1::jsonb,$2,$3) r", [J_(lines), HERE[0], HERE[1]])).r;
    const wantOpen = S.open(await purseNow(A), A, lines, HERE, Date.now(), SEEN, SK);
    eq(o.ok ?? false, wantOpen.ok, `a stall opened by a member (${o.why ?? ""})`);
    if (!o.ok) continue;
    eq(norm((await one("select lines from public.town_shops where member_id = $1", [A])).lines), norm(wantOpen.shop.lines), "the stall's lines kept, with their grades");
    for (let k = 0; k < 6; k++) {
      const shop = (await one("select town.shop_of($1, false) s", [A])).s, mine = await purseNow(B), theirs = await purseNow(A), line = pick(shop.lines), n = 1 + int(3);
      const g = line.grade ?? 0, kind = line.kind, now = await nowDb();
      const want = (kind === "sell" ? S.buy : S.sell)(mine, theirs, shop, B, line.item, n, HERE, now, SK, g);
      const fn = kind === "sell" ? "town_shop_buy" : "town_shop_sell";
      // (a page from before v268 names no grade: the normal line's; a page after names it only when graded, as lib/town/keeper does)
      const r = g || rand() < 0.5
        ? (await as(B, `select public.${fn}(p_who => $1, p_item => $2, p_n => $3, p_x => $4, p_y => $5, p_grade => $6) r`, [A, line.item, n, HERE[0], HERE[1], g])).r
        : (await as(B, `select public.${fn}(p_who => $1, p_item => $2, p_n => $3, p_x => $4, p_y => $5) r`, [A, line.item, n, HERE[0], HERE[1]])).r;
      eq({ ok: r.ok ?? false, why: r.why }, { ok: want.ok, why: want.ok ? undefined : want.why }, `${fn} by a member (${line.item} grade ${g})`);
      if (!want.ok) continue;
      stallDeals++;
      const [m2, t2] = [await purseNow(B), await purseNow(A)];
      eq(norm([m2.bag, m2.coins, t2.bag, t2.coins]), norm([want.mine.bag, want.mine.coins, want.theirs.bag, want.theirs.coins]), `${fn}: both purses after`);
      eq(norm((await one("select lines from public.town_shops where member_id = $1", [A])).lines), norm(want.shop.lines), `${fn}: the stall's lines after`);
      eq(norm(r.shopTold), norm(S.toldOf({ ...want.shop, beat: shop.beat }, want.theirs, await nowDb(), SK)), `${fn}: the stall as the comer is told it after`);
    }
    await as(A, "select public.town_shop_close() r");
  }
  assert.ok(stallDeals >= 20, `enough deals at a member's stall (${stallDeals})`); checks++;
  assert.ok((await one("select count(*)::int n from public.town_deeds where what in ('shop_buy','shop_sold','shop_sell','shop_bought') and doc ? 'grade'")).n > 0, "a graded deed at a stall says its grade"); checks++;

  // ── the jar, through the functions a member calls: a graded thing dropped, and the jar shared and taken at its grade ──
  const r0 = Number((await one("select town.round_of(town.now_ms()) r")).r);
  await db.exec("delete from public.town_jar_owed where true");
  await db.query("update public.town_jar j set round = $1, coins = 0, things = $2::jsonb where j.one", [r0, J_([["tomato", 2], ["tomato", 3, 2]])]);
  await setPurse(A, { ...(await purseNow(A)), bag: [{ item: "tomato", n: 5, grade: 2 }, { item: "carrot", n: 2, grade: 3 }, ...Array(8).fill(null)] });
  let dj = (await as(A, "select public.town_jar_drop(p_slot => 0, p_n => 2) r")).r;
  eq(dj.ok, true, "a graded thing dropped by a member");
  eq(norm(dj.jar.things), [["tomato", 2], ["tomato", 5, 2]], "it joins its own grade in the jar");
  dj = (await as(A, "select public.town_jar_drop(p_slot => 1, p_n => 1) r")).r;
  eq(norm(dj.jar.things), [["tomato", 2], ["tomato", 5, 2], ["carrot", 1, 3]], "another grade is a thing of its own");
  eq(norm((await one("select things from public.town_jar_log where what = 'drop' order by id desc limit 1")).things), [["carrot", 1, 3]], "the jar's book writes the grade down");
  eq(norm((await purseNow(A)).bag.slice(0, 2)), [{ item: "tomato", n: 3, grade: 2 }, { item: "carrot", n: 1, grade: 3 }], "what is left in the slots keeps its grade");
  // a round on: the jar is B's, who poured in the round it was last shared in
  const jarBefore = (await one("select jsonb_build_object('round', round, 'coins', coins, 'things', things) j from public.town_jar")).j;
  await db.query("update public.town_jar j set round = $1 where j.one", [r0 - 1]);
  await db.query("insert into public.town_deeds (member_id, at, what, thing, n, coins, doc) values ($1, to_timestamp((town.round_from($2) + 60000) / 1000.0), 'pour', null, 2, 0, '{}'::jsonb)", [B, r0 - 1]);
  await setPurse(B, { ...(await purseNow(B)), coins: 10, bag: [{ item: "tomato", n: 1 }, ...Array(9).fill(null)] });
  const bBefore = await purseNow(B), shared = J.settleWith({ ...jarBefore, round: r0 - 1 }, {}, [[B, 2 * J.JAR.bucket]], r0), took = J.collect(bBefore, shared.owed, B);
  const tj = (await as(B, "select public.town_jar_take() r")).r;
  eq(tj.ok, true, "the jar's share taken by a member");
  eq(norm(tj.things), norm(took.things), "what was taken, each at its grade");
  eq(norm((await purseNow(B)).bag), norm(took.purse.bag), "into the bag at its grade");
  eq(norm(tj.jar.things), [], "and the jar empty for the next round");

  // ── who may call what; no bare write; a guard that knows its definitions ──
  for (const role of ["anon", "authenticated"]) {
    for (const sig of NEW.filter((x) => x.startsWith("town."))) eq((await one("select has_function_privilege($1,$2,'EXECUTE') a", [role, sig])).a, false, `${role} may not call ${sig}`);
  }
  for (const sig of NEW.filter((x) => x.startsWith("public."))) {
    eq((await one("select has_function_privilege('anon',$1,'EXECUTE') a, has_function_privilege('authenticated',$1,'EXECUTE') m", [sig])), { a: false, m: true }, `a member may call ${sig}, a stranger not`);
  }
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /shop|notice|jar|plain|grade/.test(J_(b))), [], "no bare write");
  await db.exec("create or replace function town.shop_can(p_line jsonb, p_keeper jsonb) returns integer language sql stable as $f$ select 0 $f$");
  let stopped = null;
  try { await db.exec(sql); } catch (e) { stopped = e.message; await db.exec("rollback").catch(() => {}); }
  assert.ok(/Definition changed: town\.shop_can/.test(stopped ?? ""), `a definition the file does not know stops it (${stopped})`); checks++;
  console.log(`v268: ${checks} checks passed (${normalN} normal cases as before; the helpers; 500 stalls asked for, ${opened} opened; 900 deals both ways; 400 jars; ${J_(ops)} at the board by two members; ${stallDeals} deals at a member's stall; the jar's drop and share by members; the grants; no bare write; the guards).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 2500));
  process.exitCode = 1;
} finally {
  await db.close();
}
