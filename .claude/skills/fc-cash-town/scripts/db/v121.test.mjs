/*
 * v121 — every deed written down: dry run in PGlite.
 *
 * v121 adds `town_deeds` (a line for every deed that came off), writes twenty-one of the game's functions again,
 * each as it last ran but for the line that writes its deed down, and gives the SQL editor `town.doings` and
 * `town.tally`. It changes no rule and no answer, so no rule case is put to it: instead every function there is,
 * the rules among them, is held to its own text from before the file. v105 to v120 are replayed as they ran, then:
 *
 *   · a day in the town is played through, every function of the game's called, come off and refused (the clock
 *     the test's, the dice seeded), and what each answered and what was kept are written down;
 *   · what was kept is put back as it was, and v121 is run twice;
 *   · every function is its own text from before, but for the twenty-one, which differ by the lines meant and no
 *     other; the file's closing block; who may read and write what;
 *   · the same day is played again: every answer is the one given before the file, what is kept is the same, and
 *     after each call the deeds hold the line meant, or none;
 *   · `town.doings` and `town.tally`; a member who goes; the file a third time.
 *
 *   node v121.test.mjs
 *   node mutate.mjs <the file> v121.test.mjs v121.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U, CHAR } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v121_"));
const HERE = new URL("./v121_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(121);

const extra = `
create table public.kudos (id bigint generated always as identity primary key, sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null, day date not null default current_date, created_at timestamptz not null default now(), unique (sender_id, receiver_character_id, day));
alter table public.kudos enable row level security;
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

const t = await supabaseLike({ extra });
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
// (m1 has been sent thirty popoto by a friend)
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) select $1, $2, current_date - g from generate_series(1, 30) g`, [U.m2, CHAR.m1]);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** The same document, in whatever order its entries come. */
const tidy = (x) => Array.isArray(x) ? x.map(tidy) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, tidy(x[k])])) : x;
const alike = (a, b) => same(tidy(a), tidy(b));
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const cat = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const things0 = (await t.sql(`select key, doc from public.town_things order by key`)).rows;

/* ── a clock the test moves, and a day in the town ───────────────────────── */

const MIN = 60_000, HOUR = 3_600_000;
// 08:00 in Bangkok: the first of the day's pest hours (v110's dry run begins there too, with the same plot)
const MORNING = Date.parse("2026-10-05T08:00:00+07:00");
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let NOW = MORNING;
const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const hold = (who, item) => t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text) where member_id = $1`, [who, item]);
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [x, y, JSON.stringify(doc)]);
const give = (list) => JSON.stringify(list);
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const PAYS = (item) => cat.items[item].pays;

// a plot of the first bed where a pest strikes a pumpkin at eleven, found by asking the rule (as v110's dry run does)
const struck = await one(`
  select x, y from generate_series(133, 138) x, generate_series(5, 10) y
   where town.pest_at(x || ',' || y, jsonb_build_object('by', '${U.m1}', 'crop', 'pumpkin', 'sown', ${MORNING} - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0),
           ${MORNING}::bigint + 9 * 3600000) = ${MORNING}::bigint + 3 * 3600000 limit 1`);
if (!struck) throw new Error("no plot of the first bed where a pest strikes a pumpkin at eleven");
const [sx, sy] = [struck.x, struck.y], T0 = MORNING + 3 * HOUR;
const sick = { by: U.m1, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };

let RUN = 1, lastDeed = 0;
const said = { 1: [], 2: [] };
const lines = [];   // (the second time: every line the deeds were expected to hold, in order)
const SQL = {
  town_exchange: `select to_jsonb(x) as r from public.town_exchange($1, $2) x`,
  town_bank: `select to_jsonb(x) as r from public.town_bank() x`,
};
/**
 * One call of the day. `want` is the line the deeds must hold after it (the member is whoever called; `n` is 1 and
 * `coins` nothing and `doc` empty where not said), a function of the answer that gives it, or null for none. `ok` is
 * what the answer must say of itself: true, false (refused), "barred" (not theirs to call), or not said for what only reads.
 */
async function S(label, who, fn, args, want, ok) {
  const got = await t.as(who, SQL[fn] ?? `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  const r = got.error ? got : got.rows[0].r;
  said[RUN].push([label, r]);
  if (RUN === 2) {
    const rows = (await t.sql(`select id, member_id, at, what, thing, n, coins, doc from public.town_deeds where id > $1 order by id`, [lastDeed])).rows;
    if (rows.length) lastDeed = Number(rows[rows.length - 1].id);
    const brief = { ok: r.ok, why: r.why, error: r.error, rows: rows.map((d) => ({ what: d.what, thing: d.thing, n: d.n, coins: d.coins, doc: d.doc })) };
    const line = typeof want === "function" ? want(r) : want;
    if (line === null) {
      t.check(`${label}: no line`, rows.length === 0 && (ok === "barred" ? r.code === "42501" : ok === undefined ? !r.error : r.ok === ok), brief);
    } else {
      const d = rows[0];
      t.check(`${label}: written down`, r.ok === true && rows.length === 1 && d.member_id === who && d.what === line.what && d.thing === (line.thing ?? null)
        && Number(d.n) === (line.n ?? 1) && Number(d.coins) === (line.coins ?? 0) && alike(d.doc, line.doc ?? {}) && new Date(d.at).getTime() === NOW, { want: line, ...brief });
      lines.push({ who, ...line, n: line.n ?? 1, coins: line.coins ?? 0, at: NOW });
    }
  }
  return r;
}

async function day() {
  await t.sql(`select setseed(0.4321)`);

  // ── the farm, from eight in the morning
  await clock(MORNING);
  await purse(U.m1, 0, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 3 }, { item: "guardFert", n: 2 }, { item: "can", n: 1, water: 2 }], 100, { hand: "hoe" });
  await purse(U.m2, 0, [{ item: "can", n: 1, water: 2 }, { item: "pestCure", n: 2 }, { item: "hoe", n: 1 }], 100, { hand: "can" });
  await S("the farm looked at", U.m1, "town_farm", [0], null);
  await S("a tile that is no plot", U.m1, "town_tend", [131, 4, null], null, false);
  await S("weeds cleared (written down with its game)", U.m1, "town_tend", [132, 4, { hits: 3, misses: 0, secs: 2 }], null, true);
  await S("the ground tilled (written down with its game)", U.m1, "town_tend", [132, 4, null], null, true);
  await hold(U.m1, "seedKangkong");
  await S("a seed sown", U.m1, "town_tend", [132, 4, null], { what: "sow", thing: "kangkong", doc: { tile: [132, 4], with: "seedKangkong" } });
  await S("no second seed in a plot", U.m1, "town_tend", [132, 4, null], null, false);
  await S("somebody else waters it", U.m2, "town_tend", [132, 4, null], { what: "water", thing: "kangkong", doc: { tile: [132, 4], with: "can", whose: U.m1 } });
  await S("not twice in an hour", U.m2, "town_tend", [132, 4, null], null, false);
  await clock(MORNING + HOUR);
  await hold(U.m1, "can");
  await S("its owner waters it", U.m1, "town_tend", [132, 4, null], { what: "water", thing: "kangkong", doc: { tile: [132, 4], with: "can" } });
  await clock(MORNING + 2 * HOUR + MIN);
  await hold(U.m1, "guardFert");
  await S("fertiliser put on", U.m1, "town_tend", [132, 4, null], { what: "feed", thing: "kangkong", doc: { tile: [132, 4], with: "guardFert" } });
  await S("not put on twice", U.m1, "town_tend", [132, 4, null], null, false);
  await plant(sx, sy, sick);
  await clock(T0 + HOUR);
  await hold(U.m2, "pestCure");
  await S("a pest cured on somebody else's plant", U.m2, "town_tend", [sx, sy, null], { what: "cure", thing: "pumpkin", doc: { tile: [sx, sy], with: "pestCure", whose: U.m1 } });
  await S("no pest, no cure", U.m2, "town_tend", [sx, sy, null], null, false);
  await clock(MORNING + 5 * HOUR);
  await hold(U.m2, null);
  await S("not somebody else's to pick", U.m2, "town_tend", [132, 4, null], null, false);
  await hold(U.m1, null);
  const picked = await S("picked by its owner", U.m1, "town_tend", [132, 4, null], (r) => ({ what: "pick", thing: "kangkong", n: r.got?.[0]?.[1], doc: { tile: [132, 4], with: null } }));
  if (RUN === 2) t.check("…with how many came of it, and more than one", picked.got?.[0]?.[1] > 1 && lines[lines.length - 1].n === picked.got[0][1], picked.got);
  await hold(U.m1, "hoe");
  await S("a living plant is not dug out without the word", U.m1, "town_tend", [132, 4, null, false], null, false);
  await S("dug out with it", U.m1, "town_tend", [132, 4, null, true], { what: "uproot", thing: "kangkong", doc: { tile: [132, 4], with: "hoe" } });
  await plant(sx, sy, sick);
  await clock(T0 + 6 * HOUR + 1);
  await hold(U.m2, "hoe");
  await S("what a pest killed is not somebody else's to pull up", U.m2, "town_tend", [sx, sy, null], null, false);
  await S("pulled up by the bed's owner", U.m1, "town_tend", [sx, sy, null], { what: "pull", thing: "pumpkin", doc: { tile: [sx, sy], with: "hoe" } });

  // ── water: the river, the well, the can
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }, { item: "can", n: 1 }, { item: "bucketIron", n: 1 }], 100, { hand: "bucket" });
  await S("nowhere near water", U.m1, "town_chore", [100, 5], null, false);
  await S("a bucket drawn at the river", U.m1, "town_chore", [16, 38], { what: "draw", thing: "bucket", n: 1, doc: { well: 0 } });
  await S("a full bucket draws no more", U.m1, "town_chore", [16, 38], null, false);
  await S("poured into the well", U.m1, "town_chore", [157, 24], { what: "pour", thing: "bucket", n: 1, doc: { well: 1 } });
  await hold(U.m1, "bucketIron");
  await S("a bigger bucket drawn: two bucketfuls", U.m1, "town_chore", [16, 38], { what: "draw", thing: "bucketIron", n: 2, doc: { well: 1 } });
  await S("…and poured: two bucketfuls", U.m1, "town_chore", [157, 24], { what: "pour", thing: "bucketIron", n: 2, doc: { well: 3 } });
  await hold(U.m1, "can");
  await S("a can filled at the well", U.m1, "town_chore", [156, 22], { what: "fill", thing: "can", n: 1, doc: { well: 2 } });
  await S("a full can takes no more", U.m1, "town_chore", [156, 22], null, false);
  await t.sql(`update public.town_things set doc = '39'::jsonb where key = 'well'`);
  await purse(U.m2, 0, [{ item: "bucketIron", n: 1, water: 2 }], 100, { hand: "bucketIron" });
  await S("a well nearly full takes what it has room for: one of the two", U.m2, "town_chore", [155, 22], { what: "pour", thing: "bucketIron", n: 1, doc: { well: 40 } });
  await S("a full well takes none", U.m2, "town_chore", [155, 22], null, false);

  // ── the uncle's stall, a minute past five
  await clock(MORNING + 9 * HOUR + MIN);
  await purse(U.m1, 100, []);
  await S("my purse looked at", U.m1, "town_me", [], null);
  await S("three worms bought", U.m1, "town_buy", ["worm", 3], { what: "buy", thing: "worm", n: 3, coins: -3 * cat.goods.worm.price });
  await S("more than there are coins for", U.m1, "town_buy", ["rod", 99], null, false);
  await S("what he does not sell", U.m1, "town_buy", ["megaNothing", 1], null, false);
  await purse(U.m1, 0, [{ item: "worm", n: 5 }, { item: "minnow", n: 4 }]);
  await S("two worms left with him", U.m1, "town_leave", [0, 2], { what: "leave", thing: "worm", n: 2 });
  await S("…and three minnows", U.m1, "town_leave", [1, 3], { what: "leave", thing: "minnow", n: 3 });
  await S("an empty slot leaves nothing", U.m1, "town_leave", [7, 1], null, false);
  await S("the worms taken back: the first of the two lots", U.m1, "town_take_back", [0], { what: "take_back", thing: "worm", n: 2 });
  await S("no lot at that place", U.m1, "town_take_back", [5], null, false);
  await S("nothing to collect before his relatives come", U.m1, "town_collect", [], null, false);
  await clock(MORNING + 11 * HOUR + 1000);
  await S("the money collected", U.m1, "town_collect", [], { what: "collect", coins: 3 * PAYS("minnow") });
  await S("…and nothing more", U.m1, "town_collect", [], null, false);
  const stall = await S("the stall looked at", U.m1, "town_stall", [], null);
  const wants = stall.order.wants;
  await purse(U.m1, 0, wants.map((w, i) => ({ item: w.item, n: w.n + (i === 0 ? 3 : 0) })));
  await S("brought for his order: only what is wanted is taken", U.m1, "town_give", [0, wants[0].n + 3], { what: "give", thing: wants[0].item, n: wants[0].n, coins: wants[0].n * PAYS(wants[0].item) });
  await S("no more of it is wanted", U.m1, "town_give", [0, 1], null, false);
  await S("the second thing", U.m1, "town_give", [1, wants[1].n], { what: "give", thing: wants[1].item, n: wants[1].n, coins: wants[1].n * PAYS(wants[1].item) });
  const filled = await S("the third fills the order: what it opened is written with it", U.m1, "town_give", [2, wants[2].n],
    (r) => ({ what: "give", thing: wants[2].item, n: wants[2].n, coins: wants[2].n * PAYS(wants[2].item), doc: { opened: r.opened } }));
  if (RUN === 2) t.check("…a thing by its name", typeof filled.opened === "string" && filled.opened.length > 0, filled.opened);
  await purse(U.m1, 500, []);
  await S("a hint bought", U.m1, "town_hint", [], (r) => ({ what: "hint", thing: r.hint, coins: -cat.hints.price[cat.items[r.hint]?.tier] }));
  await purse(U.m1, 0, []);
  await S("no coins, no hint", U.m1, "town_hint", [], null, false);

  // ── the bag
  await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "basket", n: 1 }, { item: "worm", n: 4 }]);
  await S("nothing in the hand, nothing put away", U.m1, "town_hold", [null], null, true);
  await S("a rod taken into the hand", U.m1, "town_hold", [0], { what: "hold", thing: "rod" });
  await S("an empty slot holds nothing", U.m1, "town_hold", [7], null, false);
  await S("put away", U.m1, "town_hold", [null], { what: "put_away", thing: "rod" });
  await S("a basket put on", U.m1, "town_wear", [1], { what: "wear", thing: "basket" });
  await S("a rod is not worn", U.m1, "town_wear", [0], null, false);
  await S("taken off", U.m1, "town_take_off", ["basket"], { what: "take_off", thing: "basket" });
  await S("nothing worn to take off", U.m1, "town_take_off", ["basket"], null, false);
  await S("four worms thrown away", U.m1, "town_drop", [1], { what: "drop", thing: "worm", n: 4 });
  await S("an empty slot has nothing to throw", U.m1, "town_drop", [1], null, false);

  // ── a meal and a scroll
  await purse(U.m2, 0, [{ item: "tomYum", n: 2 }, { item: "scrollFriedMinnow", n: 1 }], 40);
  await S("standing, no meal", U.m2, "town_sit", [0, false], null, false);
  await S("sat down to a dish", U.m2, "town_sit", [0, true], { what: "eat", thing: "tomYum" });
  await S("one meal at a time", U.m2, "town_sit", [0, true], null, false);
  await clock(NOW + MIN);
  await S("a meal counted on is no deed", U.m2, "town_chew", [0], null, true);
  await S("got up from it", U.m2, "town_get_up", [0], { what: "get_up", thing: "tomYum" });
  await S("nobody at no meal gets up from one", U.m2, "town_get_up", [0], null, true);
  await S("a scroll read", U.m2, "town_read", [1], { what: "read", thing: cat.scrolls.scrollFriedMinnow });
  await S("no scroll in that slot now", U.m2, "town_read", [1], null, false);

  // ── the kitchen
  await purse(U.m1, 0, [{ item: "pot", n: 1 }, { item: "bowl", n: 2 }, ...TOMYUM.map(([item, n]) => ({ item, n }))], 100, { hand: "pot" });
  await S("the kitchen looked at", U.m1, "town_kitchen", [], null);
  await S("a pot cooked (written down with its game)", U.m1, "town_cook", [give(TOMYUM), [], { hits: 6, misses: 0, secs: 9 }], null, true);
  await purse(U.m1, 0, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, { item: "bowl", n: 1 }], 100, { hand: "potFull" });
  await purse(U.m2, 0, [{ item: "bowl", n: 1 }]);
  await S("off the map", U.m1, "town_pot_down", [300, 5], null, false);
  const down = await S("a pot of food set down", U.m1, "town_pot_down", [50, 50], (r) => ({ what: "pot_down", thing: "tomYum", n: 3, doc: { tile: [50, 50], pot: Number(r.pot?.id) } }));
  const pot = Number(down.pot?.id);
  await S("too far to reach", U.m2, "town_pot_ladle", [pot, 60, 60], null, false);
  await S("a helping out of somebody's pot", U.m2, "town_pot_ladle", [pot, 50, 51], { what: "ladle", thing: "tomYum", doc: { pot, whose: U.m1 } });
  await S("no bowl, no helping", U.m2, "town_pot_ladle", [pot, 50, 51], null, false);
  await S("a helping out of one's own", U.m1, "town_pot_ladle", [pot, 49, 50], { what: "ladle", thing: "tomYum", doc: { pot } });
  await S("not somebody else's to take up", U.m2, "town_pot_take", [pot, 50, 51], null, false);
  await S("taken up again, with what is left in it", U.m1, "town_pot_take", [pot, 50, 50], { what: "pot_take", thing: "tomYum", n: 1, doc: { pot } });
  await purse(U.m1, 0, [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 2 } }, { item: "bowl", n: 1 }, { item: "bowl", n: 1 }]);
  await S("a bowl is no pot", U.m1, "town_serve", [1], null, false);
  await S("a helping out of the pot in the bag", U.m1, "town_serve", [0], { what: "serve", thing: "tomYum" });
  await purse(U.m1, 0, [{ item: "boot", n: 3 }, { item: "worm", n: 1 }]);
  await S("a worm does not open", U.m1, "town_open", [1], null, false);
  await S("an old boot opened", U.m1, "town_open", [0], (r) => ({ what: "open", thing: "boot", doc: { found: r.found } }));

  // ── a line
  await purse(U.m1, 0, [{ item: "rod", n: 1 }, { item: "worm", n: 3 }], 100, { hand: "rod" });
  await S("no water there", U.m1, "town_cast", ["worm", 0, 0, false], null, false);
  await S("a line dropped", U.m1, "town_cast", ["worm", 16, 38, false], { what: "cast", thing: "worm", doc: { tile: [16, 38] } });
  await S("my line looked at", U.m1, "town_line", [], null);
  await S("pulled up with nothing on it (written down with its game)", U.m1, "town_land", ["left", null], null, true);
  await S("a second line dropped", U.m1, "town_cast", ["worm", 16, 38, false], { what: "cast", thing: "worm", doc: { tile: [16, 38] } });
  await S("struck long before the bite (written down with its game)", U.m1, "town_strike", [0], null, true);

  // ── the bank, and deals
  await S("the bank looked at", U.m1, "town_bank", [], null);
  await S("five popoto changed (written down in the bank's ledger)", U.m1, "town_exchange", ["profile", 5], null, true);
  await purse(U.m1, 20, [{ item: "worm", n: 5 }]);
  await purse(U.m2, 8, [{ item: "minnow", n: 2 }]);
  await S("a deal opened (kept as a deal)", U.m1, "town_deal_open", [U.m2], null, true);
  await S("laid out: three worms and five coins", U.m1, "town_deal_lay", [give([["worm", 3]]), 5], null, true);
  await S("…against two minnows", U.m2, "town_deal_lay", [give([["minnow", 2]]), 0], null, true);
  await S("one word", U.m2, "town_deal_agree", [true], null, true);
  await S("both words: done", U.m1, "town_deal_agree", [true], null, true);
  await S("the deal looked at", U.m1, "town_deal", [], null);
  await clock(NOW + MIN);
  await S("another opened", U.m2, "town_deal_open", [U.m1], null, true);
  await S("…and called off", U.m1, "town_deal_cancel", [], null, true);

  // ── nobody else
  await S("somebody signed out carries no water", "anon", "town_chore", [16, 38], null, "barred");
  await S("nor somebody whose character was never proved", U.unver, "town_chore", [16, 38], null, "barred");
  await S("nor somebody with none", U.nochar, "town_buy", ["worm", 1], null, "barred");
}

/** What is kept of the day, to hold one playing of it to the other. */
const keptNow = () => one(`select
  (select jsonb_agg(jsonb_build_object('who', p.member_id, 'coins', p.coins, 'doc', p.doc) order by p.member_id) from public.town_purses p) as purses,
  (select jsonb_agg(jsonb_build_object('key', x.key, 'doc', x.doc) order by x.key) from public.town_things x) as things,
  (select jsonb_agg(to_jsonb(p) order by p.x, p.y) from public.town_plots p) as plots,
  (select jsonb_agg(to_jsonb(b) order by b.bed) from public.town_beds b) as beds,
  (select jsonb_agg(to_jsonb(o) order by o.id) from public.town_pots o) as pots,
  (select jsonb_agg(to_jsonb(l) - 'updated_at' order by l.member_id) from public.town_lines l) as lines,
  (select jsonb_agg(to_jsonb(p) order by p.id) from public.town_plays p) as plays,
  (select jsonb_agg(to_jsonb(d) order by d.id) from public.town_deals d) as deals,
  (select jsonb_agg(to_jsonb(e) - 'created_at' order by e.id) from public.town_exchanges e) as exchanges,
  (select jsonb_agg(to_jsonb(c) - 'updated_at' order by c.character_id) from public.town_changed c) as changed`);
/** Everything the day left, gone again: the town as it was before anybody played. */
async function asItWas() {
  await t.sql(`delete from public.town_purses; delete from public.town_plots; delete from public.town_beds; delete from public.town_lines; delete from public.town_changed;
    truncate public.town_pots, public.town_plays, public.town_deals, public.town_exchanges restart identity;`);
  for (const x of things0) await t.sql(`update public.town_things set doc = $2::jsonb where key = $1`, [x.key, JSON.stringify(x.doc)]);
  await clock(MORNING);
}
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
/** The lines of one text that are not in the other, in order (the longest run they share is left out). */
function differ(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const gone = [], more = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gone.push(A[i++]); else more.push(B[j++]);
  }
  while (i < n) gone.push(A[i++]);
  while (j < m) more.push(B[j++]);
  return { gone, more };
}

t.section("a day in the town, before the file");
await day();
const answersWas = said[1], keptWas = await keptNow();
t.check(`the day is played: ${answersWas.length} calls, by every function of the game's`, answersWas.length > 90 && keptWas.plays.length === 5 && keptWas.deals.length === 2 && keptWas.exchanges.length === 1, { calls: answersWas.length, plays: keptWas.plays?.length });
{
  const called = new Set(), offered = (await t.sql(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%'
    and p.proname not in ('town_vote', 'town_vote_tally', 'town_my_vote', 'town_popoto_left', 'town_is_open', 'town_sky', 'town_weather_kept') order by 1`)).rows.map((r) => r.proname);
  for (const m of day.toString().matchAll(/"(town_[a-z_]+)"/g)) called.add(m[1]);
  t.check("…all thirty-seven of them", offered.length === 37 && offered.every((f) => called.has(f)), offered.filter((f) => !called.has(f)));
}
await asItWas();
const before = await texts();

await t.runTwice(FILE, "v121");
// (the file leaves the clock alone: the test's is still the town's)
const after = await texts();

t.section("every function is the one it replaces, but for the lines meant");
// the lines of the old text that are written otherwise: where a purse read inside a call is now read first, to say what was in a slot
const MEANT = {
  "town_buy(text,integer)": [],
  "town_leave(integer,integer)": ["  did jsonb := town.leave(town.purse_of(me, true), p_slot, p_n, town.now_ms());"],
  "town_take_back(integer)": ["  did jsonb := town.take_back(town.purse_of(me, true), coalesce(p_at, -1), town.now_ms());"],
  "town_collect()": [], "town_hold(integer)": [], "town_wear(integer)": [], "town_take_off(text)": [], "town_drop(integer)": [],
  "town_give(integer,integer)": [], "town_hint()": [], "town_sit(integer,boolean)": [],
  "town_get_up(integer)": ["  perform town.keep_purse(me, town.get_up(town.purse_kept(me, true), coalesce(p_company, 0), town.now_ms()));"],
  "town_read(integer)": [], "town_cast(text,integer,integer,boolean)": [], "town_tend(integer,integer,jsonb,boolean)": [], "town_chore(integer,integer)": [],
  "town_pot_down(integer,integer)": [], "town_pot_ladle(bigint,integer,integer)": [], "town_pot_take(bigint,integer,integer)": [], "town_serve(integer)": [],
  "town_open(integer)": ["  did jsonb := town.open(town.purse_of(me, true), p_slot, array[random(), random()]);"],
};
{
  const odd = [];
  for (const [sig, gone] of Object.entries(MEANT)) {
    if (!before[sig] || !after[sig]) { odd.push({ sig, missing: true }); continue; }
    const d = differ(before[sig], after[sig]);
    const notes = d.more.filter((l) => l.includes("perform town.note(")).length;
    // nothing of the old text is gone but the lines named; one deed is written down; and what is new is a handful of lines about that
    if (!same(d.gone, gone) || notes !== 1 || d.more.length > 10 || d.more.length < 1) odd.push({ sig, gone: d.gone, more: d.more });
  }
  t.check("each of the twenty-one is its old text with every line kept but those named, and one deed written down", odd.length === 0, odd.slice(0, 3));
  const others = Object.keys(before).filter((sig) => !(sig in MEANT) && before[sig] !== after[sig]);
  t.check("every other function, the rules among them, is its text from before to the letter", others.length === 0 && Object.keys(before).length > 150, others);
  const added = Object.keys(after).filter((sig) => !(sig in before)).sort();
  t.check("three functions are new, all the town's own: note, deed_th, tally", same(added, ["town.deed_th(text)", "town.note(uuid,text,text,numeric,numeric,jsonb)", "town.tally(timestamp with time zone,timestamp with time zone)"]), added);
  t.check("none is gone", Object.keys(before).every((sig) => sig in after), Object.keys(before).filter((sig) => !(sig in after)));
}

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select c.relrowsecurity,
         (select count(*)::int from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'town_deeds' and grantee in ('anon', 'authenticated')) as grants
    from pg_class c where c.oid = 'public.town_deeds'::regclass`);
t.check("the deeds are closed: row security on, nothing granted to a browser", v.rows[0].relrowsecurity === true && v.rows[0].grants === 0, v.rows);
v = await t.sql(`select count(*) filter (where p.prosrc like '%town.note(%')::int as write_a_deed_down,
         count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
         count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member,
         count(*)::int as all
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%'
     and p.proname not in ('town_vote', 'town_vote_tally', 'town_my_vote', 'town_popoto_left', 'town_is_open', 'town_sky', 'town_weather_kept')`);
t.check("twenty-one of the game's thirty-seven write a deed down; none is anon's to call, all are a member's", same(v.rows[0], { write_a_deed_down: 21, anon: 0, member: 37, all: 37 }), v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
         (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
           and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules, the tally among them, are nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);
v = await t.sql(`select town.deed_th('pour') as pour, town.deed_th('something new') as unknown`);
t.check("a deed's word in Thai, and a word it does not know as it is", v.rows[0].pour === "เทน้ำลงบ่อ" && v.rows[0].unknown === "something new", v.rows);

t.section("who may");
await t.sql(`insert into public.town_deeds (member_id, what, thing) values ($1, 'pour', 'bucket')`, [U.guest]);
for (const [who, name] of [["anon", "somebody signed out"], [U.m1, "a member"], [U.admin, "an admin, in a browser"]]) {
  let r = await t.as(who, `select * from public.town_deeds limit 1`);
  t.check(`${name} cannot read the deeds`, r.code === "42501", r);
  r = await t.as(who, `insert into public.town_deeds (member_id, what) values ('${U.m1}', 'pour')`);
  t.check(`…nor write one`, r.code === "42501", r);
  r = await t.as(who, `update public.town_deeds set n = 99`);
  t.check(`…nor change one`, r.code === "42501", r);
  r = await t.as(who, `delete from public.town_deeds`);
  t.check(`…nor take one away`, r.code === "42501", r);
  r = await t.as(who, `select town.note('${U.m1}', 'pour', 'bucket', 40)`);
  t.check(`…nor write one down by the rule`, r.code === "42501", r);
  r = await t.as(who, `select * from town.tally()`);
  t.check(`…nor ask for the tally`, r.code === "42501", r);
  r = await t.as(who, `select * from town.doings limit 1`);
  t.check(`…nor read everything done`, r.code === "42501", r);
}
v = await one(`select count(*)::int as n, min(what) as what, min(n)::int as bucketfuls from public.town_deeds`);
t.check("the one line there is, is as it was", v.n === 1 && v.what === "pour" && v.bucketfuls === 1, v);
{
  const r = await t.as("service", `select what, thing from public.town_deeds`);
  t.check("the site's own key reads the deeds", !r.error && r.rows.length === 1 && r.rows[0].what === "pour", r);
}
await t.sql(`truncate public.town_deeds restart identity`);

t.section("the same day again, after the file: each deed written down, and nothing else");
RUN = 2;
await day();
const answersIs = said[2], keptIs = await keptNow();
// (the bank's ledger goes by the real clock: for the tally's hours below, the popoto were changed when the day ended)
await t.sql(`update public.town_exchanges set created_at = to_timestamp(${NOW} / 1000.0)`);
{
  const odd = [];
  for (let i = 0; i < Math.max(answersWas.length, answersIs.length); i++) if (!same(answersWas[i], answersIs[i])) odd.push({ at: i, was: answersWas[i], is: answersIs[i] });
  t.check(`every one of the ${answersWas.length} answers is the one given before the file, to the letter`, answersWas.length === answersIs.length && odd.length === 0, odd.slice(0, 2));
  const moved = Object.keys(keptWas).filter((k) => !same(keptWas[k], keptIs[k]));
  t.check("what is kept of the day is what was kept before it: purses, the village's things, plots, beds, pots, lines, plays, deals, the ledger", moved.length === 0, moved);
}
{
  const rows = (await t.sql(`select member_id, what, thing, n, coins, doc, at from public.town_deeds order by id`)).rows;
  t.check(`the deeds hold the ${lines.length} lines meant, in the order they were done, and no other`, rows.length === lines.length && lines.length === 39
    && rows.every((d, i) => d.member_id === lines[i].who && d.what === lines[i].what && Number(d.n) === lines[i].n && new Date(d.at).getTime() === lines[i].at), { rows: rows.length, lines: lines.length });
  const words = [...new Set(rows.map((d) => d.what))].sort();
  t.check("thirty words among them: every deed that had no line before", same(words, ["buy", "cast", "collect", "cure", "draw", "drop", "eat", "feed", "fill", "get_up", "give", "hint", "hold", "ladle", "leave", "open", "pick",
    "pot_down", "pot_take", "pour", "pull", "put_away", "read", "serve", "sow", "take_back", "take_off", "uproot", "water", "wear"]), words);
}

t.section("everything done, in one place");
{
  const all = (await t.sql(`select d.at, d.member_id, d.what, d.thing, d.n, d.coins, d.doc from town.doings d order by d.at, d.what`)).rows;
  const of = (what) => all.filter((d) => d.what === what);
  const kept = await one(`select (select count(*)::int from public.town_deeds) as deeds, (select count(*)::int from public.town_plays) as plays`);
  t.check("the deeds, the five goes at a game, the popoto changed, and the deal done once for each of the two", all.length === kept.deeds + kept.plays + 1 + 2 && kept.plays === 5, { all: all.length, ...kept });
  t.check("a plot cleared and tilled, from its game: once each, by whoever hoed", of("clear").length === 1 && of("till").length === 1 && of("clear")[0].member_id === U.m1 && of("clear")[0].thing === null, [of("clear"), of("till")]);
  t.check("a pot cooked, with what came of it", of("cook").length === 1 && of("cook")[0].thing === "tomYum" && of("cook")[0].doc.won === true, of("cook"));
  t.check("a line pulled up, and one struck too soon: how each ended", of("fish_left").length === 1 && of("fish_early").length === 1 && of("fish_early")[0].doc.won === false, [of("fish_left"), of("fish_early")]);
  t.check("popoto changed: how many, and the coins they came to", of("exchange").length === 1 && of("exchange")[0].thing === "profile" && Number(of("exchange")[0].n) === 5 && Number(of("exchange")[0].coins) > 0
    && Number(of("exchange")[0].coins) === keptIs.exchanges[0].coins, of("exchange"));
  const deals = of("deal");
  t.check("the deal done, for each side: five coins gone from one and come to the other, and who it was with", deals.length === 2
    && Number(deals.find((d) => d.member_id === U.m1)?.coins) === -5 && Number(deals.find((d) => d.member_id === U.m2)?.coins) === 5
    && deals.find((d) => d.member_id === U.m1)?.doc.with === U.m2 && deals.find((d) => d.member_id === U.m2)?.doc.with === U.m1, deals);
  t.check("the deal called off is not one done", keptIs.deals.length === 2 && keptIs.deals.filter((d) => d.ended === "off").length === 1 && deals.length === 2, keptIs.deals.map((d) => d.ended));
}
{
  const tally = (await t.sql(`select * from town.tally()`)).rows;
  const row = (name, what) => tally.find((r) => r.name === name && r.what === what);
  const pour1 = row("Member One", "pour"), pour2 = row("Member Two", "pour");
  t.check("the tally: who poured into the well, how often and how many bucketfuls, in Thai too", pour1 && Number(pour1.times) === 2 && Number(pour1.n) === 3 && pour1.th === "เทน้ำลงบ่อ"
    && pour2 && Number(pour2.times) === 1 && Number(pour2.n) === 1, [pour1, pour2]);
  t.check("…when first and when last, by the town's clock", pour1 && new Date(pour1.first_at).getTime() === T0 + 6 * HOUR + 1 && new Date(pour1.last_at).getTime() === T0 + 6 * HOUR + 1, pour1);
  const buys = row("Member One", "buy"), gives = row("Member One", "give");
  t.check("…and what a deed did to their coins: paid for the worms, paid by the uncle", buys && Number(buys.coins) === -3 * cat.goods.worm.price && gives && Number(gives.times) === 3 && Number(gives.coins) > 0, [buys, gives]);
  t.check("…a line for each member and each deed, and for nobody who did nothing", tally.every((r) => ["Member One", "Member Two"].includes(r.name)) && !tally.some((r) => r.name === "(gone)")
    && new Set(tally.map((r) => r.name + "/" + r.what)).size === tally.length && row("Member Two", "water") && row("Member One", "clear") && row("Member One", "fish_left"), tally.map((r) => `${r.name}/${r.what}`));
  const total = tally.reduce((n, r) => n + Number(r.times), 0), all = (await one(`select count(*)::int as n from town.doings`)).n;
  t.check("…every line of everything done counted once", total === all, { total, all });
  // between two moments
  const noon = (await t.sql(`select * from town.tally(to_timestamp(${MORNING + 2 * HOUR} / 1000.0), to_timestamp(${MORNING + 5 * HOUR} / 1000.0))`)).rows;
  t.check("between ten and one: the feeding and the cure, and neither the sowing before nor the picking on the stroke of one", same(noon.map((r) => `${r.name}/${r.what}/${r.times}`).sort(), ["Member One/feed/1", "Member Two/cure/1"]), noon);
  const late = (await t.sql(`select what from town.tally(to_timestamp(${MORNING + 5 * HOUR} / 1000.0)) where name = 'Member One'`)).rows.map((r) => r.what);
  t.check("from one onwards: the picking, and no sowing", late.includes("pick") && !late.includes("sow") && !late.includes("clear"), late);
  const early = (await t.sql(`select what from town.tally(null, to_timestamp(${MORNING + 1} / 1000.0))`)).rows.map((r) => r.what).sort();
  t.check("until a moment past eight: the plot hoed, sown and watered", same(early, ["clear", "sow", "till", "water"]), early);
}

if (process.env.SHOW) {
  // (SHOW=1: the deeds as they were written, and the tally as the SQL editor shows it)
  for (const d of (await t.sql(`select p.character_name as who, d.what, d.thing, d.n, d.coins, d.doc from public.town_deeds d join public.profiles p on p.id = d.member_id order by d.id`)).rows)
    console.log("   ", d.who.padEnd(11), d.what.padEnd(10), String(d.thing).padEnd(18), String(d.n).padStart(3), String(d.coins).padStart(5), JSON.stringify(d.doc));
  for (const r of (await t.sql(`select name, what, th, times, n, coins from town.tally()`)).rows)
    console.log("   ", r.name.padEnd(11), r.what.padEnd(12), String(r.times).padStart(3), String(r.n).padStart(4), String(r.coins).padStart(5), r.th);
}

t.section("a member who goes");
{
  const was = await one(`select count(*) filter (where member_id = $1)::int as theirs, count(*)::int as n from public.town_deeds`, [U.m2]);
  await t.sql(`delete from auth.users where id = $1`, [U.m2]);
  const is = await one(`select count(*) filter (where member_id is not distinct from $1)::int as theirs, count(*) filter (where member_id is null)::int as nobodys, count(*)::int as n from public.town_deeds`, [U.m2]);
  t.check("their deeds go with them, and nobody else's", was.theirs > 5 && is.theirs === 0 && is.nobodys === 0 && is.n === was.n - was.theirs, { was, is });
  const tally = (await t.sql(`select name, what from town.tally() where name = '(gone)'`)).rows.map((r) => r.what).sort();
  t.check("what the ledgers keep of them is nobody's by name: their side of the deal", same(tally, ["deal"]), tally);
}

t.section("running it again");
{
  const was = await one(`select count(*)::int as n, coalesce(sum(n), 0)::int as sum from public.town_deeds`);
  await t.run(FILE, "v121 a third time");
  const is = await one(`select count(*)::int as n, coalesce(sum(n), 0)::int as sum from public.town_deeds`);
  t.check("every line is still there", was.n > 20 && same(was, is), { was, is });
  t.check("…and every function its own text still", same(await texts(), after));
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  const r = await S("a bucket drawn, after the third time", U.m1, "town_chore", [16, 38], { what: "draw", thing: "bucket", n: 1, doc: { well: 40 } });
  t.check("…and the next deed is written down under the next number", r.ok === true && (await one(`select count(*)::int as n from public.town_deeds`)).n === was.n + 1, r);
}

await t.done();
