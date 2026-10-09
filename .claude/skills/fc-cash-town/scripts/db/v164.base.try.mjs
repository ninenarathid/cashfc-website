// v164's base through what is kept and what a member calls, against the stand-in database (try-v164.mjs plays this):
// the gate, built closed and opened; the tables, closed to every browser; a day of the cave laid by the site's key and
// by nobody else, and kept as it was laid; a place's document; the pouches moved into and out of; the most a gem may
// be asked for, on the board and at a stall; and the file run once more over all of it. Then the scenes of what a
// forged tool means to what was there already (v164.base.plain.mjs, carried).
import plainScenes from "./v164.base.plain.mjs";

export default async function (ctx) {
  const { t, U, call, purseOf, one, same, CODE, give, patch, root, sql } = ctx;
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const { caveLayout } = await import("@/lib/town/mining-row");
  const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);
  const knobOf = async (key) => (await one(`select value from public.town_knobs where key = $1`, [key]))?.value;
  const no = (r) => r?.code === "42501";
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const bag = (...stacks) => Array.from({ length: Math.max(10, stacks.length) }, (_, i) => stacks[i] ?? null);
  /** The three functions of this part that a member calls behind the gate, each with something to ask. */
  const GATED = [["town_cave_days"], ["town_pouch_out", "thingSack", 0], ["town_pouch_in", 0]];
  const gate = async (who) => Promise.all(GATED.map(([fn, ...args]) => call(who, fn, ...args)));
  // (a purse is kept whole the first time a function of the game keeps it: the two members' are, before anything here
  // writes a field of one by hand)
  for (const who of [U.m1, U.m2]) await call(who, "town_hold", null);

  t.section("what the base should say afterwards (the queries at its foot)");
  const said = {
    knobs: (await t.sql(`select key, value from public.town_knobs where key in ('far_open', 'notice_chip', 'notice_gem') order by key`)).rows,
    rows: await one(`select (select jsonb_array_length(data->'wood') from public.town_catalog where key = 'trees') as trees,
      (select jsonb_array_length(data->'rocks') from public.town_catalog where key = 'mining') as rocks,
      (select jsonb_array_length(data) from public.town_catalog where key = 'pouches') as pouches,
      (select count(*) from public.town_catalog where key in ('forge', 'trees', 'mining', 'pouches'))::int as new_rows`),
    tables: (await t.sql(`select c.relname, c.relrowsecurity as closed,
        (select count(*) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated'))::int as a_browsers_grants,
        (select string_agg(g.privilege_type, ', ' order by g.privilege_type) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'service_role') as the_sites_key
      from pg_class c where c.oid in ('public.town_cave_days'::regclass, 'public.town_cave'::regclass) order by 1`)).rows,
    fns: (await t.sql(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_far', 'town_cave_days', 'town_pouch_out', 'town_pouch_in') order by 1`)).rows,
    more: await one(`select (select doc from public.town_things where key = 'grove') as grove, (select length(word) from public.town_secrets where key = 'mine') as word,
      town.shop_cap('gemRuby', town.shop_knobs()) as a_gem, town.notice_cap('chipRuby', town.notice_knobs()) as a_fragment, town.shop_cap('worm', town.shop_knobs()) as a_worm`),
    far: (await one(`select public.town_far() as far`)).far,
  };
  t.check("the knobs: closed, and the two numbers of a gem's most", same(said.knobs, [{ key: "far_open", value: 0 }, { key: "notice_chip", value: 10000 }, { key: "notice_gem", value: 100000 }]), said.knobs);
  t.check("the catalog: 121 trees, 54 rocks, 2 pouches, 4 new rows", same(said.rows, { trees: 121, rocks: 54, pouches: 2, new_rows: 4 }), said.rows);
  t.check("the two tables: closed, nothing of a browser's, and the cave's days for the site's key to read and insert and no more",
    same(said.tables.map((x) => [x.relname, x.closed, x.a_browsers_grants]), [["town_cave", true, 0], ["town_cave_days", true, 0]]) && said.tables[1].the_sites_key === "INSERT, SELECT", said.tables);
  t.check("the four functions a member calls: definer, not for the signed out, for the signed in",
    same(said.fns, ["town_cave_days", "town_far", "town_pouch_in", "town_pouch_out"].map((proname) => ({ proname, definer: true, anon: false, member: true }))), said.fns);
  t.check("the grove empty, a word of 64, a gem 100,000, a fragment 10,000, a worm 10; and nobody is signed in in the editor", same(said.more, { grove: { down: {}, half: [] }, word: 64, a_gem: 100000, a_fragment: 10000, a_worm: 10 }) && said.far === false, { ...said.more, far: said.far });

  t.section("the gate: built closed");
  t.check("the knob is there and says closed; the two numbers of a gem's most are beside it", (await knobOf("far_open")) === 0 && (await knobOf("notice_gem")) === 100000 && (await knobOf("notice_chip")) === 10000,
    [await knobOf("far_open"), await knobOf("notice_gem"), await knobOf("notice_chip")]);
  t.check("town_far: somebody signed out is not answered at all", no(await call("anon", "town_far")), await call("anon", "town_far"));
  t.check("town_far: no to a member with no character, and to one whose character was never proved", (await call(U.nochar, "town_far")) === false && (await call(U.unver, "town_far")) === false, [await call(U.nochar, "town_far"), await call(U.unver, "town_far")]);
  t.check("town_far: no to a proved member while the far side is closed", (await call(U.m1, "town_far")) === false && (await call(U.m2, "town_far")) === false, await call(U.m1, "town_far"));
  t.check("town_far: yes to an admin while it is closed", (await call(U.admin, "town_far")) === true, await call(U.admin, "town_far"));
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"], [U.m1, "a proved member, while it is closed"]]) {
    const did = await gate(who);
    t.check(`the gate refuses ${name}, in all three functions`, did.every(no), did.map((r) => r?.code ?? r));
  }
  let did = await gate(U.admin);
  t.check("the gate lets an admin by while it is closed", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));

  t.section("the gate: opened by its knob");
  await knob("far_open", 1);
  t.check("town_far: yes to a proved member and to an admin; still no to the unproved and to no character", (await call(U.m1, "town_far")) === true && (await call(U.admin, "town_far")) === true && (await call(U.unver, "town_far")) === false && (await call(U.nochar, "town_far")) === false,
    [await call(U.m1, "town_far"), await call(U.unver, "town_far")]);
  did = await gate(U.m1);
  t.check("the gate lets a proved member by once it is open", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
    const still = await gate(who);
    t.check(`the gate still refuses ${name} once it is open`, still.every(no), still.map((r) => r?.code ?? r));
  }
  // (the far side is part of the game: with the game shut, v115's knob, it is shut too, whatever its own knob says)
  await knob("game_open", 0);
  did = await gate(U.m1);
  t.check("with the game itself shut, a proved member is refused and told no, though the far side's own knob says open; an admin is not", did.every(no) && (await call(U.m1, "town_far")) === false && (await call(U.admin, "town_far")) === true && (await gate(U.admin)).every((r) => !r?.error),
    { gate: did.map((r) => r?.code ?? r), far: await call(U.m1, "town_far") });
  await knob("game_open", 1);
  await knob("far_open", 0);
  t.check("closed again by its knob, a proved member is refused again", (await gate(U.m1)).every(no) && (await call(U.m1, "town_far")) === false);

  t.section("what is kept: the grove, the word, and tables no browser reaches");
  const grove = (await one(`select doc from public.town_things where key = 'grove'`))?.doc;
  t.check("the grove is there, with no tree down", same(grove, { down: {}, half: [] }), grove);
  const words = (await t.sql(`select key, word from public.town_secrets order by key`)).rows, mine = words.find((w) => w.key === "mine")?.word;
  t.check("the rocks have a word of their own, long, and not the forest's", typeof mine === "string" && mine.length === 64 && mine !== words.find((w) => w.key === "wild")?.word && (await one(`select town.mine_word() as w`)).w === mine, words.map((w) => [w.key, w.word?.length]));
  const today = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  const LAID = Array.from({ length: CODE.mining.floors }, (_, i) => caveLayout(i + 1, today));
  const lay = (who, day, floor, layout, more = "") => t.as(who, `insert into public.town_cave_days (day, floor, layout) values ($1::integer, $2::integer, $3::jsonb) ${more}`, [day, floor, JSON.stringify(layout)]);
  for (const [who, name] of [["anon", "somebody signed out"], [U.m1, "a proved member"], [U.admin, "an admin, from a browser"]]) {
    const reads = await Promise.all(["town_cave_days", "town_cave", "town_things", "town_secrets"].map((table) => t.as(who, `select * from public.${table}`)));
    const writes = [await lay(who, today, 1, LAID[0]), await t.as(who, `insert into public.town_cave (place) values (1)`), await t.as(who, `update public.town_cave set doc = '{}'::jsonb where place = 1`), await t.as(who, `delete from public.town_cave_days where true`)];
    t.check(`${name} reads none of the tables, and writes none`, reads.every(no) && writes.every(no), [...reads, ...writes].map((r) => r.code ?? "let by"));
  }
  t.check("…and nothing was written by any of that", (await one(`select (select count(*) from public.town_cave_days)::int + (select count(*) from public.town_cave)::int as n`)).n === 0);

  t.section("a day of the cave: laid by the site's key, and kept as it was laid");
  let r = await lay("service", today, 1, LAID[0]);
  t.check("the site's key lays a floor of today", !r.error && r.affected === 1, r);
  r = await lay("service", today, 1, LAID[1]);
  const again = await lay("service", today, 1, LAID[1], "on conflict do nothing");
  t.check("the same floor of the same day is not laid twice: refused, or passed over when asked so", r.code === "23505" && !again.error && again.affected === 0, [r.code, again]);
  const changed = await t.as("service", `update public.town_cave_days set layout = $1::jsonb where day = $2 and floor = 1`, [JSON.stringify(LAID[1]), today]);
  const gone = await t.as("service", `delete from public.town_cave_days where day = $1 and floor = 1`, [today]);
  t.check("what is laid is not changed and not taken away, by the site's key either", no(changed) && no(gone) && same((await one(`select layout from public.town_cave_days where day = $1 and floor = 1`, [today])).layout, LAID[0]), [changed.code ?? changed, gone.code ?? gone]);
  const yesterday = await lay("service", today - 1, 2, LAID[1]), far = await lay("service", today + 2, 2, LAID[1]), next = await lay("service", today + 1, 2, caveLayout(2, today + 1));
  t.check("yesterday's floor is refused", yesterday.code === "22003", yesterday);
  t.check("a far-off day's floor is refused", far.code === "22003", far);
  t.check("tomorrow's floor is laid (the site lays it before the day turns)", !next.error && next.affected === 1, next);
  const under = await lay("service", today, 0, LAID[0]), over = await lay("service", today, CODE.mining.floors + 1, LAID[0]);
  t.check("a floor the cave has not is refused: none above the first, none below the last", !!under.error && over.code === "22003", [under.code, over.code]);
  const bad = [{ ...LAID[2], open: undefined }, { ...LAID[2], open: LAID[2].open.slice(1) }, { ...LAID[2], open: LAID[2].open.replace("1", "7") }, { ...LAID[2], rocks: "none" }, { ...LAID[2], down: null }, "a floor"];
  const refusals = [];
  for (const b of bad) refusals.push(await lay("service", today, 3, b));
  t.check("what is no floor is refused: no tiles, too few, a tile that is none, no rocks, no ladder down, no document", refusals.every((x) => x.code === "22023" || x.code === "23514"), refusals.map((x) => x.code ?? "let by"));
  let told = await call(U.admin, "town_cave_days");
  t.check("a day with some of its floors is `unlaid` to a page, and is not told as laid; this clock, today and how many floors a day has are told with the refusal", told?.ok === false && told.why === "unlaid" && same(told.laid, [])
    && told.day === today && told.floors === CODE.mining.floors && Math.abs(told.now - Date.now()) < 60_000, told);
  t.check("…and to the rules: a day with some of its floors is not laid", (await one(`select town.cave_is_laid($1) as l`, [today])).l === false && (await one(`select town.cave_is_laid($1) as l`, [today + 1])).l === false);
  // (the rest of the day in one statement, as the site writes it; the floor that is there already is passed over)
  r = await t.as("service", `insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`, [today, JSON.stringify(LAID)]);
  told = await call(U.admin, "town_cave_days");
  t.check("the whole day laid at once, the floor already there passed over: every floor is kept, and the day is laid, to a page and to the rules (tomorrow, with one floor, is not)", !r.error && r.affected === CODE.mining.floors - 1
    && told?.ok === true && told.why === undefined && same(told.laid, [today]) && told.day === today
    && (await one(`select town.cave_is_laid($1) as l`, [today])).l === true && (await one(`select town.cave_is_laid($1) as l`, [today + 1])).l === false, { r, told });
  // (as the site's own client writes: named columns, a row a floor, those already there ignored)
  r = await t.as("service", `insert into public.town_cave_days (day, floor, layout) values ($1::integer, 1, $2::jsonb), ($1::integer, 2, $3::jsonb) on conflict (day, floor) do nothing`, [today, JSON.stringify(LAID[0]), JSON.stringify(LAID[1])]);
  t.check("written again by the site, a day that is there is left as it is and nothing is refused", !r.error && r.affected === 0, r);
  const kept = (await t.sql(`select floor, town.cave_laid(day, floor) as layout from public.town_cave_days where day = $1 order by floor`, [today])).rows;
  t.check("each floor is given to the rules as the code lays it out: its rocks, its tiles, its ladders, a resting floor's lift", kept.length === LAID.length && kept.every((k, i) => k.floor === i + 1 && same(k.layout, LAID[i])) && LAID[9].lift && !LAID[0].lift && LAID[0].rocks.length > 0 && LAID[9].rocks.length === 0,
    kept.filter((k, i) => !same(k.layout, LAID[i])).map((k) => k.floor));
  t.check("a floor that is not laid is none to the rules", (await one(`select town.cave_laid($1, 5) as l`, [today + 1])).l === null);

  t.section("a place of the cave: its document");
  const empty = (await one(`select town.cave_kept(3, false) as d`)).d, rows0 = (await one(`select count(*)::int as n from public.town_cave`)).n;
  t.check("read without holding, a place nothing was kept of is an empty document, and no row is made", same(empty, {}) && rows0 === 0, { empty, rows0 });
  const held = (await one(`select town.cave_kept(3, true) as d`)).d, rows1 = (await t.sql(`select place, doc from public.town_cave order by place`)).rows;
  t.check("held, its row is made", same(held, {}) && same(rows1, [{ place: 3, doc: {} }]), rows1);
  const doc = { day: today, way: null, crystal: null, broken: { turn: 7, ids: [1, 4] }, struck: { turn: 7, rocks: {} }, torches: [], moss: [] };
  await t.sql(`select town.keep_cave(3, $1::jsonb)`, [JSON.stringify(doc)]);
  await t.sql(`select town.cave_kept(0, true)`);
  t.check("kept, it is read back as it was kept; the mountain's foot is a place like any floor", same((await one(`select town.cave_kept(3, false) as d`)).d, doc) && (await one(`select count(*)::int as n from public.town_cave`)).n === 2);
  r = await t.as("super", `select town.cave_kept(100, true)`);
  t.check("there is no place past the last the table takes", !!r.error, r);

  t.section("the pouches, by what a member calls");
  await knob("far_open", 1);
  await give(U.m1, { had: ["thingSack", "thingBundle"] });
  await give(U.m2, { had: [] });
  await patch(U.m1, { coins: 50, hand: null, pouches: {}, bag: bag({ item: "stone", n: 30 }, { item: "log", n: 12 }, { item: "minnow", n: 3 }, { item: "pick", n: 1 }, { item: "shardCopper", n: 99 }) });
  const before = await written();
  did = await call(U.m1, "town_pouch_in", 0);
  let p = await purseOf(U.m1);
  t.check("a slot of stone goes into the pouch that takes it, whole, and out of the bag", did?.ok === true && did.n === 30 && p.bag[0] === null && same(p.pouches.thingSack[0], { item: "stone", n: 30 }) && same(did.purse.pouches, p.pouches) && typeof did.now === "number", { did: { ...did, purse: undefined }, pouches: p.pouches });
  did = await call(U.m1, "town_pouch_in", 1);
  p = await purseOf(U.m1);
  t.check("wood goes into the other pouch", did?.ok === true && did.n === 12 && same(p.pouches.thingBundle[0], { item: "log", n: 12 }) && same(p.pouches.thingSack[0], { item: "stone", n: 30 }), p.pouches);
  const fish = await call(U.m1, "town_pouch_in", 2), tool = await call(U.m1, "town_pouch_in", 3), none = await call(U.m1, "town_pouch_in", 7), minus = await call(U.m1, "town_pouch_in", -1);
  t.check("what no pouch takes stays in the bag: a fish, a tool; and an empty slot and no slot move nothing", fish?.why === "none" && tool?.why === "none" && none?.why === "none" && minus?.why === "none" && same((await purseOf(U.m1)).bag.slice(2, 4), [{ item: "minnow", n: 3 }, { item: "pick", n: 1 }]), [fish, tool, none, minus]);
  did = await call(U.m1, "town_pouch_out", "thingSack", 0);
  p = await purseOf(U.m1);
  t.check("a pouch's slot is emptied into the bag", did?.ok === true && did.n === 30 && p.pouches.thingSack[0] === null && same(p.bag[0], { item: "stone", n: 30 }), { did: { ...did, purse: undefined }, bag: p.bag.slice(0, 2) });
  const noGift = await call(U.m1, "town_pouch_out", "thingBasket", 0), noSlot = await call(U.m1, "town_pouch_out", "thingBundle", 2);
  t.check("a gift that is no pouch, and a pouch's empty slot, give nothing", noGift?.why === "none" && noSlot?.why === "none", [noGift, noSlot]);
  await patch(U.m1, { bag: bag(...Array.from({ length: 10 }, () => ({ item: "boot", n: 1 }))) });
  did = await call(U.m1, "town_pouch_out", "thingBundle", 0);
  t.check("into a bag with no room, nothing moves", did?.why === "full" && same((await purseOf(U.m1)).pouches.thingBundle[0], { item: "log", n: 12 }), did);
  await patch(U.m2, { pouches: {}, bag: bag({ item: "stone", n: 4 }) });
  did = await call(U.m2, "town_pouch_in", 0);
  t.check("somebody with no pouch has nowhere to put it", did?.why === "none" && same((await purseOf(U.m2)).bag[0], { item: "stone", n: 4 }), did);
  t.check("moving things between a bag and a pouch is no deed: nothing is written down", (await written()) === before, [before, await written()]);

  t.section("the most a gem may be asked for, on the board and at a stall");
  const pays = CODE.items.minnow.pays, most = pays * (await knobOf("notice_cap"));
  await t.sql(`delete from public.town_notices where member_id = $1`, [U.m1]);
  await patch(U.m1, { coins: 100, pouches: {}, bag: bag({ item: "gemRuby", n: 3 }, { item: "chipRuby", n: 9 }, { item: "minnow", n: 9 }) });
  const post = (item, price) => call(U.m1, "town_notice_post", "sell", item, 1, price);
  const dearGem = await post("gemRuby", 100001), dearChip = await post("chipRuby", 10001), dearFish = await post("minnow", most + 1);
  const gem = await post("gemRuby", 100000), chip = await post("chipRuby", 10000), minnow = await post("minnow", most);
  t.check("the board: a gem at 100,000 and no more, its fragment at 10,000 and no more", gem?.ok === true && chip?.ok === true && dearGem?.why === "dear" && dearChip?.why === "dear", [gem?.why, chip?.why, dearGem?.why, dearChip?.why]);
  t.check("the board: every other thing at ten times what the relatives pay, as before", minnow?.ok === true && dearFish?.why === "dear" && pays > 0, [minnow?.why, dearFish?.why, most]);
  const open = (item, price) => call(U.m1, "town_shop_open", [{ kind: "sell", item, n: 1, price }], 30, 30);
  const stall = [await open("gemRuby", 100001), await open("gemRuby", 100000), await open("chipRuby", 10001), await open("chipRuby", 10000), await open("minnow", most + 1), await open("minnow", most)];
  t.check("a stall: the same six answers", same(stall.map((s) => (s?.ok === true ? "ok" : s?.why)), ["dear", "ok", "dear", "ok", "dear", "ok"]), stall.map((s) => s?.why ?? s?.ok));
  await knob("notice_gem", 500);
  const lower = [await open("gemRuby", 501), await open("gemRuby", 500), await open("chipRuby", 10000)];
  t.check("the gem's most is its knob's: turned, a stall follows at once, and a fragment's is not touched", same(lower.map((s) => (s?.ok === true ? "ok" : s?.why)), ["dear", "ok", "ok"]), lower.map((s) => s?.why ?? s?.ok));
  await call(U.m1, "town_shop_close");
  await t.sql(`delete from public.town_notices where member_id = $1`, [U.m1]);

  t.section("the file run once more, over what has been done since");
  // (far_open is 1 and the gem's knob 500 here; the grove is given a tree down; the cave has a day laid and two places kept)
  await t.sql(`update public.town_things set doc = $1::jsonb where key = 'grove'`, [JSON.stringify({ down: { 5: { at: 1, by: U.m1 } }, half: [9] })]);
  const was = {
    knobs: [await knobOf("far_open"), await knobOf("notice_gem"), await knobOf("notice_chip")], word: mine,
    days: (await one(`select count(*)::int as n from public.town_cave_days`)).n, cave: (await t.sql(`select place, doc from public.town_cave order by place`)).rows, purse: await purseOf(U.m1),
  };
  let ran = null;
  try { await t.sql(sql); } catch (e) { ran = e.message; }
  const now = {
    knobs: [await knobOf("far_open"), await knobOf("notice_gem"), await knobOf("notice_chip")], word: (await one(`select town.mine_word() as w`)).w,
    days: (await one(`select count(*)::int as n from public.town_cave_days`)).n, cave: (await t.sql(`select place, doc from public.town_cave order by place`)).rows, purse: await purseOf(U.m1),
  };
  t.check("it runs, and an opened far side stays open, a knob that was turned stays turned", ran === null && same(now.knobs, [1, 500, 10000]) && same(was.knobs, now.knobs), { ran, was: was.knobs, now: now.knobs });
  t.check("…the word is the word it was, the trees down are still down, the cave's day and its places are as they were, and a purse with them", now.word === was.word && same((await one(`select doc from public.town_things where key = 'grove'`)).doc, { down: { 5: { at: 1, by: U.m1 } }, half: [9] })
    && now.days === was.days && same(now.cave, was.cave) && same(now.purse, was.purse), { days: [was.days, now.days] });
  t.check("…and the site's key still lays a floor, and still cannot change one (the guard is the same guard)", !(await lay("service", today + 1, 3, caveLayout(3, today + 1))).error
    && no(await t.as("service", `update public.town_cave_days set layout = layout where day = $1`, [today])));
  await knob("notice_gem", 100000);
  await knob("far_open", 0);
  await t.sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);

  await plainScenes(ctx);
}
