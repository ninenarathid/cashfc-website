// v164's miners' part through what a member calls, against the stand-in database with the base under it
// (try-v164.mjs plays this after the part's rule cases). The clock is the test's own, so that a turn, a torch's five
// minutes and the day's turn can be come to; the word the rolls hang on is the database's own, read here as the SQL
// editor reads it, and what a rock holds is asked of the code (lib/town/mining) with that word: so every scene finds
// its own rock (one that hides a vein, the way down, moss, the day's crystal) instead of hoping for one.
export default async function (ctx) {
  const { t, U, call, purseOf, one, same, CODE, give, patch, root } = ctx;
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const { caveLayout } = await import("@/lib/town/mining-row");
  const M = await import("@/lib/town/mining");
  const { dayOf } = await import("@/lib/town/stamina");
  const K = CODE.mining, TURN = K.turn, MIN = 60_000;
  const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);
  const no = (r) => r?.code === "42501";
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const caves = async () => (await t.sql(`select place, doc from public.town_cave order by place`)).rows;
  const bag = (...stacks) => Array.from({ length: Math.max(10, stacks.length) }, (_, i) => stacks[i] ?? null);

  // the test's clock in the place of the database's: a moment of the real today, a little after a turn's edge
  const REAL = Date.now(), T0 = Math.floor(REAL / TURN) * TURN + 5000;
  await t.sql(`create table if not exists town.test_clock (ms bigint not null); delete from town.test_clock where true; insert into town.test_clock values (${T0});
    create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  const clock = (ms) => t.sql(`update town.test_clock set ms = ${Math.round(ms)} where true`);
  const today = dayOf(T0), WORD = (await one(`select town.mine_word() as w`)).w;
  const LAID = Array.from({ length: K.floors }, (_, i) => caveLayout(i + 1, today));
  const rocksAt = (floor) => (floor === 0 ? K.rocks : LAID[floor - 1].rocks).map(([id, x, y, look]) => ({ id, x, y, look }));
  /** The functions of this part that a member calls behind the gate, each with something to ask. */
  const GATED = [["town_cave", 0, null, null]];
  const gate = async (who) => Promise.all(GATED.map(([fn, ...args]) => call(who, fn, ...args)));
  for (const who of [U.m1, U.m2, U.admin]) await call(who, "town_hold", null);

  t.section("the gate: built closed, opened by its knob");
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"], [U.m1, "a proved member, while it is closed"]]) {
    const did = await gate(who);
    t.check(`the gate refuses ${name}, in every function of the miners'`, did.every(no), did.map((r) => r?.code ?? r));
  }
  let did = await gate(U.admin);
  t.check("the gate lets an admin by while it is closed", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));
  await knob("far_open", 1);
  did = await gate(U.m1);
  t.check("the gate lets a proved member by once it is open", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
    const still = await gate(who);
    t.check(`the gate still refuses ${name} once it is open`, still.every(no), still.map((r) => r?.code ?? r));
  }

  t.section("a day that is not laid: `unlaid`, and nothing held or changed");
  const before = { caves: await caves(), purse: await purseOf(U.m1), deeds: await written() };
  did = await gate(U.m1);
  t.check("every function that reads a floor answers `unlaid` with this clock, and no purse", did.every((r) => r?.ok === false && r.why === "unlaid" && r.now === T0 && r.purse === undefined), did);
  t.check("…and nothing was made, kept or written down by asking", same(await caves(), before.caves) && same(await purseOf(U.m1), before.purse) && (await written()) === before.deeds, await caves());

  t.section("the day laid by the site's key: what a member is told of a cave nobody has been in");
  const lay = (who, day, layouts) => t.as(who, `insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`, [day, JSON.stringify(layouts)]);
  let r = await lay("service", today, LAID);
  t.check("the site's key lays the day's thirty floors, from the code's own generator", !r.error && r.affected === K.floors, r);
  const crystal = M.crystalOf(WORD, today, (f) => rocksAt(f));
  let told = await call(U.m1, "town_cave", 0, null, null);
  t.check("on the mountain's foot: today, this turn, to be asked again at the turn's end; no rock gone, no way open, no light, nobody deepest; nothing of my own; and no crystal rock told to a plain hand",
    told?.ok === true && told.now === T0 && same(told.cave, { day: today, turn: Math.floor(T0 / TURN), again: (Math.floor(T0 / TURN) + 1) * TURN, gone: {}, ways: {}, torches: [], moss: [], deepest: null,
      rests: [], vein: null, loose: null, glints: [], place: 0, struck: {}, paid: null, crystal: null }) && told.purse?.bag?.length >= 10, told);
  t.check("the day's crystal rock stands where the code says it does by the database's own word: on one of the two deepest floors that are dug", !!crystal && [28, 29].includes(crystal.floor)
    && same((await one(`select town.mine_crystal($1) as c`, [today])).c, crystal), crystal);
  told = await call(U.m1, "town_cave", crystal.floor, null, null);
  const other = await call(U.m1, "town_cave", crystal.floor === 28 ? 29 : 28, null, null);
  t.check("it is told, with its number, to whoever is on its floor; and not at all on another floor", same(told?.cave?.crystal, crystal) && told.cave.place === crystal.floor && other?.cave?.crystal === null, [told?.cave?.crystal, other?.cave?.crystal]);
  const odd = [await call(U.m1, "town_cave", 99, null, null), await call(U.m1, "town_cave", -3, null, null), await call(U.m1, "town_cave", null, null, null)];
  t.check("a place that is none is the mountain's foot", odd.every((x) => x?.ok === true && x.cave.place === 0), odd.map((x) => x?.cave?.place ?? x));
  t.check("reading the cave holds nothing and makes no row", same(await caves(), before.caves) && (await written()) === before.deeds);

  return { clock, T0, today, WORD, LAID, rocksAt, crystal, knob, no, written, caves, bag, lay, GATED, gate, M, K, TURN, MIN };
}
