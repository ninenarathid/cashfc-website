// v174's older tools' part through the functions a member calls, against the stand-in database (try-v164.mjs plays
// this after the part's rule cases: `node try-v164.mjs <root> v174 tools`). The rules themselves are held to the code
// case by case before this; here:
//
//   · the texts: every function written again carries the part's mark, holds what it held and no more, and
//     `town.cook` and `town.spoon` still ask v171's question of whatever is put in;
//   · A PLAIN TOOL, TO THE LETTER: a second database is built as this one was before the part (the stand-in, the
//     catalog, the smith's part), and a day in the town is played on both, call for call, by the same clock and the
//     same numbers of chance: the deck fed and tired, a farm cleared, tilled, sown, watered, picked and dug, a row
//     hoed and a row poured with gifts on, the river and the well, a net, pots cooked, set down, ladled, eaten from
//     and taken up. Every answer and every row kept is the same on both;
//   · a forged tool of each family through its game, each number held to what the code says of that purse;
//   · a counted option used to its last and come back with the day; a count that is the member's, not the tool's;
//   · a tool handed over in a deal: the new holder's, and no longer the old one's; two members side by side, each
//     by their own tool; a forged tool that is in the bag and not in the hand;
//   · the plots beside a deed's: all of its own bed, the same from either end of the row;
//   · and the part run once more over all of it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export default async function ({ t, U, one, CODE, root, sql }) {
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const here = (name) => import(pathToFileURL(join(process.cwd(), name)).href);
  const { standIn } = await here("stand-in.mjs");
  const { againOf, defsOf, filled, linesOf } = await here("build-v164.mjs");
  const FORGED = await import("@/lib/town/forged");
  const KEEP = await import("@/lib/town/forged-keep");
  const STAM = await import("@/lib/town/stamina");
  const COOK = await import("@/lib/town/cooking");
  const FISHING = await import("@/lib/town/fishing");
  const { hastened } = await import("@/lib/town/fountain");
  const dbFile = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
  const lf = (s) => s.split("\r\n").join("\n");
  const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
  const str = (v) => JSON.stringify(settle(v ?? null));
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const F = CODE.farming, K = CODE.cooking, INS = CODE.insects, FI = CODE.fishing, FORGE = CODE.forge;
  const AGAIN = await linesOf(dbFile("v174.tools.lines.mjs"));

  /* ── the database as it was before the part: the stand-in, the code's catalog, the smith's part ── */
  const B0 = await standIn({ upTo: 173 });
  for (const k of Object.keys(CODE)) await B0.sql(`insert into public.town_catalog (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()`, [k, JSON.stringify(CODE[k])]);
  await B0.db.exec(filled(lf(readFileSync(dbFile("v174.smith.sql"), "utf8")), againOf(await defsOf((q) => B0.sql(q).then((r) => r.rows)), await linesOf(dbFile("v174.smith.lines.mjs")))));
  const WAS = await defsOf((q) => B0.sql(q).then((r) => r.rows)), NOW_ = await defsOf((q) => t.sql(q).then((r) => r.rows));

  t.section("the texts");
  const MARK = "-- ── the older tools (v174)";
  t.check(`each of the ${AGAIN.length} functions written again carries the part's mark, and no other function does`,
    AGAIN.every(([, sig]) => NOW_[sig]?.includes(MARK)) && Object.keys(NOW_).filter((k) => NOW_[k].includes(MARK)).length === AGAIN.length,
    Object.keys(NOW_).filter((k) => NOW_[k].includes(MARK) !== AGAIN.some(([, sig]) => sig === k)));
  // (what a function holds: a row for update, a purse or a thing held, the bed's or a haunt's lock; `for update` inside a `for … loop` counts once a text)
  const holds = (text) => ["for update", "pg_advisory_xact_lock(", "town.purse_of(me, true)", "town.purse_of(first_, true)", ", true)"].map((w) => text.split(w).length - 1).join("/");
  const moved = AGAIN.filter(([, sig]) => holds(lf(NOW_[sig])) !== holds(lf(WAS[sig])) && sig !== "public.town_tend(integer, integer, jsonb, boolean)" && sig !== "town.water(text, jsonb, jsonb, text, bigint)");
  t.check("no function written again holds a row that it did not hold before, nor one fewer", moved.length === 0, moved.map(([m]) => m));
  const tendNow = lf(NOW_["public.town_tend(integer, integer, jsonb, boolean)"]);
  t.check("town_tend holds the purses first and then the bed, as it did; and reads the row's other plots only after both",
    tendNow.indexOf("for update loop null; end loop;") < tendNow.indexOf("pg_advisory_xact_lock(hashtext('town.bed'), bed_n)") && tendNow.indexOf("pg_advisory_xact_lock(hashtext('town.bed'), bed_n)") < tendNow.indexOf("where p.bed = bed_n and p.y = p_y;")
    && tendNow.split("pg_advisory_xact_lock(").length === 2 && tendNow.split("for update").length === lf(WAS["public.town_tend(integer, integer, jsonb, boolean)"]).split("for update").length);
  const PUT_IN = "or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)", ALSO = "and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0))";
  for (const sig of ["town.cook(jsonb, jsonb, jsonb, double precision, bigint)", "town.spoon(jsonb, jsonb, bigint)"]) {
    t.check(`${sig.split("(")[0]} still asks v171's question of whatever is put in`, NOW_[sig].includes(PUT_IN) && NOW_[sig].includes(ALSO));
  }
  t.check("town.spoon is as it was", NOW_["town.spoon(jsonb, jsonb, bigint)"] === WAS["town.spoon(jsonb, jsonb, bigint)"]);
  t.check("every plot is as dry as it was, and no pot carries anything", (await one(`select (select count(*) from public.town_plots where damp)::int + (select count(*) from public.town_pots where marks is not null)::int as n`)).n === 0);

  /* ── a clock the test moves, on both ── */
  const BOTH = [B0, t];
  let NOW = Date.parse("2026-10-12T08:00:00+07:00");
  for (const d of BOTH) {
    await d.sql(`create table if not exists town.test_clock (ms bigint not null);
      delete from town.test_clock where true;
      insert into town.test_clock values (${NOW});
      create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  }
  const clock = async (ms, dbs = BOTH) => { NOW = ms; for (const d of dbs) await d.sql(`update town.test_clock set ms = ${ms} where true`); };
  const pad = (bag, n = 14) => [...bag, ...Array(n).fill(null)].slice(0, Math.max(n, bag.length));
  const day = async (d) => Number((await d.sql(`select town.day_of(town.now_ms()) as d`)).rows[0].d);
  /** A member's purse: so many coins, these things first in the bag, so much stamina, and whatever else. */
  const purse = async (who, bag, left = 100, more = {}, dbs = BOTH, coins = 50) => {
    for (const d of dbs) {
      await d.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::numeric)) || $5::jsonb)
        on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify(pad(bag)), left, JSON.stringify(more)]);
    }
  };
  const kept = async (who, d = t) => { const r = (await d.sql(`select coins, doc from public.town_purses where member_id = $1`, [who])).rows[0]; return r ? { ...r.doc, coins: Number(r.coins) } : null; };
  const patch = async (who, fields, dbs = BOTH) => { for (const d of dbs) await d.sql(`update public.town_purses set doc = doc || $2::jsonb where member_id = $1`, [who, JSON.stringify(fields)]); };
  const hold = (who, item, slot = null, dbs = BOTH) => patch(who, { hand: item, handAt: slot }, dbs);
  const param = (v) => (v === null || v === undefined ? null : typeof v === "object" ? JSON.stringify(v) : v);
  const askOf = async (d, who, fn, args) => {
    const r = await d.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param));
    return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
  };
  const buffs = (ids, level = 2) => ({ buffs: ids.map((id) => ({ id, level, until: NOW + 2 * HOUR })) });
  const gifts = (...ids) => ({ gifts: { had: ids, charms: ids.filter((id) => id.startsWith("charm")), owed: 0, familiar: ids.find((id) => id.startsWith("fam")) ?? null, used: {} } });

  /* ── a day in the town with tools as they were bought, on both databases ── */
  const said = [[], []];
  let step = 0;
  /** One call of the day, on both: by the same number of chance. Gives the answer of the database with the part. */
  const S = async (label, who, fn, ...args) => {
    step++;
    const out = [];
    for (let i = 0; i < 2; i++) {
      await BOTH[i].sql(`select setseed(${((step * 7919) % 1000) / 1000})`);
      out.push(await askOf(BOTH[i], who, fn, args));
      said[i].push([label, out[i]]);
    }
    return out[1];
  };
  const lineOf = async (who, d = t) => (await d.sql(`select doc from public.town_lines where member_id = $1`, [who])).rows[0]?.doc ?? null;
  const [bx, by] = F.bedsAt[0], [b2x, b2y] = F.bedsAt[1], [wx, wy] = F.wellAt;
  const RIVER = Object.keys(FI.places)[0].split(",").map(Number), DEEP = Object.keys(FI.places).find((k) => FI.places[k]).split(",").map(Number), BANK = Object.keys(FI.places).find((k) => !FI.places[k]).split(",").map(Number);
  const POT = COOK.RECIPE_IDS.find((id) => { const k = COOK.takes(id); return k.cooks === 1 && k.in.length === 1 && k.in[0] === "pot" && id in CODE.dishes && !!CODE.dishes[id].buff; });
  const PAN = COOK.RECIPE_IDS.find((id) => { const k = COOK.takes(id); return k.cooks === 1 && k.in.length === 1 && k.in[0] === "pan" && id in CODE.dishes; });
  const needsBag = (id, times = 1) => COOK.needsOf(id).map(([item, n]) => ({ item, n: n * times }));
  const YARD = K.feast.floor[0], GROUND = [10, 10];

  async function plainDay() {
    // ── the farm: bed one, from eight in the morning; a meal's buffs on, and later none and no stamina
    await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 6 }, { item: "can", n: 1, water: 3 }, { item: "bucket", n: 1 }, { item: "bugNet", n: 1 }], 100, { hand: "hoe", handAt: 0, ...buffs(["hearty", "green", "calm"]) });
    await purse(U.m2, [{ item: "can", n: 1, water: 4 }, { item: "hoe", n: 1 }, { item: "canCopper", n: 1, water: 2 }], 100, { hand: "can", handAt: 0, ...gifts("charmGloves") });
    await S("the farm looked at", U.m1, "town_farm", 0);
    await S("a tile that is no plot", U.m1, "town_tend", bx - 1, by, null, false);
    for (let i = 0; i < 4; i++) {
      await S(`weeds cleared ${i}`, U.m1, "town_tend", bx + i, by, { hits: 3, misses: i % 2, secs: 2 }, false);
      await S(`ground tilled ${i}`, U.m1, "town_tend", bx + i, by, { hits: 3, misses: 0, secs: 3 }, false);
    }
    await S("tilled ground is not the hoe's", U.m1, "town_tend", bx, by, null, false);
    await hold(U.m1, "seedKangkong", 1);
    for (let i = 0; i < 4; i++) await S(`a seed sown ${i}`, U.m1, "town_tend", bx + i, by, null, false);
    await S("no second seed in a plot", U.m1, "town_tend", bx, by, null, false);
    await S("somebody else waters it", U.m2, "town_tend", bx, by, null, false);
    await S("not twice in an hour", U.m2, "town_tend", bx, by, null, false);
    await S("the long pour of the gloves, along the row", U.m2, "town_longpour", bx + 1, by, { [`${bx + 1},${by}`]: true, [`${bx + 2},${by}`]: true, [`${bx + 3},${by}`]: false }, { hits: 2, misses: 1, secs: 4 });
    await hold(U.m2, "canCopper", 2);
    await S("a better can, on the plant the pour missed", U.m2, "town_tend", bx + 3, by, null, false);
    await clock(NOW + HOUR + MIN);
    await hold(U.m1, "can", 2);
    for (let i = 0; i < 4; i++) await S(`its owner waters ${i}: three, and then the can is dry`, U.m1, "town_tend", bx + i, by, null, false);
    // the river, the well, the can
    await hold(U.m1, "bucket", 3);
    await S("nowhere near water", U.m1, "town_chore", 100, 5);
    await S("a bucket drawn at the river", U.m1, "town_chore", RIVER[0], RIVER[1]);
    await S("a full bucket draws no more", U.m1, "town_chore", RIVER[0], RIVER[1]);
    await S("poured into the well", U.m1, "town_chore", wx + 1, wy);
    await hold(U.m1, "can", 2);
    await S("a can filled at the well", U.m1, "town_chore", wx, wy - 1);
    await S("a full can takes no more, or the well is dry", U.m1, "town_chore", wx, wy - 1);
    await S("the last plant watered", U.m1, "town_tend", bx + 3, by, null, false);
    await S("the well's book", U.m1, "town_well");
    // a row of the enchanted hoe, in a second bed; then tired hands
    await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "seedKangkong", n: 9 }, { item: "can", n: 1, water: 8 }], 100, { hand: "hoe", handAt: 0, ...gifts("charmHoe", "thingPouch") });
    const row = Object.fromEntries(Array.from({ length: F.side }, (_, i) => [`${b2x + i},${b2y}`, i !== 2]));
    await S("a row of weeds, one beat missed", U.m1, "town_row", b2x, b2y, row, { hits: 6, misses: 1, secs: 9 });
    await S("the row tilled", U.m1, "town_row", b2x, b2y, row, { hits: 6, misses: 0, secs: 8 });
    await hold(U.m1, "seedKangkong", 1);
    await S("the row sown from the pouch", U.m1, "town_row", b2x, b2y, {}, null);
    await purse(U.m1, [{ item: "hoe", n: 1 }, { item: "can", n: 1, water: 8 }], 0, { hand: "hoe", handAt: 0 });
    await S("weeds cleared with no stamina", U.m1, "town_tend", b2x, b2y + 1, { hits: 3, misses: 2, secs: 5 }, false);
    await hold(U.m1, "can", 1);
    await S("watered with no stamina", U.m1, "town_tend", b2x, b2y, { hits: 1, misses: 0, secs: 2 }, false);
    // the kangkong ripe: picked, and dug out
    await clock(NOW + 30 * HOUR);
    await purse(U.m1, [{ item: "hoe", n: 1 }], 100, {});
    await S("picked by its owner", U.m1, "town_tend", bx, by, null, false);
    await S("not somebody else's to pick", U.m2, "town_tend", bx + 1, by, null, false);
    await hold(U.m1, "hoe", 0);
    await S("a living plant is not dug out without the word", U.m1, "town_tend", bx + 1, by, null, false);
    await S("dug out with it", U.m1, "town_tend", bx + 1, by, null, true);
    await S("the farm, all of it", U.m2, "town_farm", 0);

    // ── the deck: fed and keen, then tired
    const fish = async (tag, who, place, how) => {
      const cast = await S(`${tag}: a line dropped`, who, "town_cast", "worm", place[0], place[1], false, null);
      const line = await lineOf(who);
      if (!cast?.ok || !line) return;
      if (how === "left") { await S(`${tag}: taken up`, who, "town_land", "left", null); return; }
      if (how === "early") { await S(`${tag}: struck too soon`, who, "town_strike", -900); return; }
      if (how === "missed") { await clock(line.bites_at + 60_000); await S(`${tag}: let go by`, who, "town_strike", null); return; }
      await clock(line.bites_at + 400);
      const struck = await S(`${tag}: struck`, who, "town_strike", 400);
      if (!struck?.hooked || struck.landed) return;
      const least = Number((await one(`select town.least_ms($1, $2, town.bouts_of($1)) as ms`, [line.what, line.harder ?? 1])).ms);
      await clock(NOW + (how === "soon" ? Math.floor(least / 2) : least + 1500));
      await S(`${tag}: ${how}`, who, "town_land", how === "soon" ? "landed" : how, { secs: 9, holds: 20 });
    };
    await clock(NOW + 2 * HOUR);
    await purse(U.m1, [{ item: "rod", n: 1 }, { item: "worm", n: 20 }, { item: "floatFeather", n: 1 }, { item: "netSmall", n: 1 }], 100, { hand: "rod", handAt: 0, ...buffs(["keen", "lucky", "calm"]) });
    let n = 0;
    for (const how of ["landed", "landed", "snapped", "slipped", "left", "early", "missed", "soon", "landed", "landed"]) { await fish(`deck ${n++} (${how})`, U.m1, DEEP, how); await clock(NOW + 5000); }
    for (const how of ["landed", "slipped", "soon", "landed", "soon", "soon"]) { await fish(`bank ${n++} (${how})`, U.m1, BANK, how); await clock(NOW + 5000); }
    await patch(U.m1, { stamina: { day: await day(t), left: 0 }, buffs: [] });
    for (const how of ["landed", "landed", "missed"]) { await fish(`tired ${n++} (${how})`, U.m1, DEEP, how); await clock(NOW + 5000); }

    // ── a net: whatever the haunts have at this hour and at dusk
    for (const hour of [0, 9]) {
      await clock(NOW + hour * HOUR);
      await purse(U.m1, [{ item: "bugNet", n: 1 }], hour ? 0 : 100, { hand: "bugNet", handAt: 0 });
      const bugs = await S(`the insects looked at (${hour})`, U.m1, "town_bugs");
      const sights = (bugs?.bugs ?? []).slice(0, 6).map((b) => b[0]);
      for (const id of sights) {
        const perch = INS.haunts[id][3][0];
        await S(`a net at haunt ${id}`, U.m1, "town_net", id, Math.floor(perch[0]), Math.floor(perch[1]), id % 3, null);
      }
      if (sights.length) await S("had already", U.m1, "town_net", sights[0], Math.floor(INS.haunts[sights[0]][3][0][0]), Math.floor(INS.haunts[sights[0]][3][0][1]), 0, null);
    }

    // ── the kitchen
    await purse(U.m1, [{ item: "pot", n: 1 }, { item: "pan", n: 1 }, ...needsBag(POT, 3), ...needsBag(PAN, 1), { item: "bowl", n: 2 }], 100, { hand: "pot", handAt: 0, ...buffs(["hearty"]) }, BOTH, 50);
    await purse(U.m2, [{ item: "bowl", n: 2 }], 40, {});
    const cooked = await S("a pot of a dish", U.m1, "town_cook", COOK.needsOf(POT), "{}", { misses: 1, secs: 9 });
    await S("another, two stirs missed", U.m1, "town_cook", COOK.needsOf(POT), "{}", { misses: 2, secs: 12 });
    await S("things that are no recipe's, in a pot", U.m1, "town_cook", [COOK.needsOf(POT)[0]], "{}", { misses: 0, secs: 5 });
    await hold(U.m1, "pan", 1);
    await S("a pan's dish", U.m1, "town_cook", COOK.needsOf(PAN), "{}", { misses: 0, secs: 5 });
    await hold(U.m1, null, null);
    await S("with bare hands", U.m1, "town_cook", [COOK.needsOf(POT)[0]], "{}", null);
    const potAt = async (dish) => (await kept(U.m1)).bag.findIndex((b) => b?.item === "potFull" && b.of?.dish === dish);
    const down = await S("a pot set down in the yard", U.m1, "town_pot_down", YARD[0], YARD[1], await potAt(POT));
    const ground = await S("a pot set down in the town", U.m1, "town_pot_down", GROUND[0], GROUND[1], await potAt(POT));
    await S("the odd dish set down in the yard stands on the ground there", U.m1, "town_pot_down", YARD[0] , YARD[1], null);
    await S("the kitchen looked at", U.m2, "town_kitchen");
    if (ground?.pot) await S("ladled from on the ground", U.m2, "town_pot_ladle", Number(ground.pot.id), GROUND[0], GROUND[1]);
    if (down?.pot) {
      await S("eaten from at the table, standing", U.m2, "town_feast_eat", Number(down.pot.id), YARD[0], YARD[1], false);
      await S("eaten from at the table", U.m2, "town_feast_eat", Number(down.pot.id), YARD[0], YARD[1], true);
      await clock(NOW + 2 * MIN);
      await S("a helping half eaten", U.m2, "town_chew", 1);
      await clock(NOW + 4 * MIN);
      await S("…and eaten up", U.m2, "town_chew", 0);
      await S("the pot taken up again", U.m1, "town_pot_take", Number(down.pot.id), YARD[0], YARD[1]);
    }
    const p1 = await kept(U.m1), slot = p1.bag.findIndex((s) => s?.item === "potFull");
    if (slot >= 0) await S("a helping served out of the pot in the bag", U.m1, "town_serve", slot);
    await S("my purse looked at", U.m1, "town_me");
    return cooked;
  }

  t.section("a day in the town with tools as they were bought: played on the database as it was before the part, and on this one");
  await plainDay();
  if (process.env.SAID) for (const [label, a] of said[1]) console.log(`    ${label}: ${a?.error ?? (a?.ok === undefined ? "read" : a.ok ? "ok" : a.why)}${a?.deed ? ` ${a.deed}` : ""}${a?.how ? ` ${a.how}` : ""}${a?.hooked !== undefined ? ` hooked ${a.hooked}` : ""}${a?.got ? ` ${JSON.stringify(a.got)}` : ""}${a?.made !== undefined ? ` made ${a.made} ×${a.n}` : ""}`);
  const off = said[0].map(([label, a], i) => (str(a) === str(said[1][i][1]) ? null : label)).filter(Boolean);
  const came = said[1].filter(([, a]) => a?.ok === true).length, refused = said[1].filter(([, a]) => a?.ok === false).length, erred = said[1].filter(([, a]) => a?.error);
  t.check(`${said[1].length} calls of the day (${came} came off, ${refused} refused): every answer the same on both`, off.length === 0 && said[0].length === said[1].length,
    off.length ? { first: off[0], before: said[0].find(([l]) => l === off[0])[1], after: said[1].find(([l]) => l === off[0])[1], all: off.slice(0, 12) } : "");
  t.check("the day reached each game: no call broke, and each of fishing, the farm, the well, the net and the kitchen came off more than once", erred.length === 0
    && said[1].some(([l, a]) => l.endsWith(": soon") && a?.how === "slipped")
    && ["a line dropped", "struck", "landed", "weeds cleared", "a seed sown", "waters", "a row", "poured into the well", "a can filled", "a net at", "a pot of a dish", "set down", "eaten from at the table", "eaten up", "taken up again", ": soon"]
      .every((w) => said[1].some(([l, a]) => l.includes(w) && a?.ok === true)), { erred: erred.slice(0, 3), none: ["a line dropped", "struck", "landed", "weeds cleared", "a seed sown", "waters", "a row", "poured into the well", "a can filled", "a net at", "a pot of a dish", "set down", "eaten from at the table", "eaten up", "taken up again"].filter((w) => !said[1].some(([l, a]) => l.includes(w) && a?.ok === true)) });
  // every row kept: each of the town's tables, but for the moments a database writes of its own clock
  const tables = (await t.sql(`select table_name as n from information_schema.tables where table_schema = 'public' and table_name like 'town\\_%' and table_type = 'BASE TABLE' order by 1`)).rows.map((r) => r.n);
  const rowsOf = async (d, table) => {
    const cols = (await d.sql(`select column_name as c, data_type as ty from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`, [table])).rows
      .filter((c) => c.ty !== "timestamp with time zone" && !(table === "town_plots" && c.c === "damp") && !(table === "town_pots" && c.c === "marks"));
    return (await d.sql(`select jsonb_build_object(${cols.map((c) => `'${c.c}', x.${JSON.stringify(c.c)}`).join(", ")})::text as r from public.${table} x order by 1`)).rows.map((r) => r.r);
  };
  const unlike = [];
  let rows = 0;
  for (const table of tables) {
    const a = await rowsOf(B0, table), b = await rowsOf(t, table);
    rows += b.length;
    if (JSON.stringify(a) !== JSON.stringify(b)) unlike.push({ table, before: a.length, after: b.length, first: b.find((r, i) => r !== a[i])?.slice(0, 600), was: a.find((r, i) => r !== b[i])?.slice(0, 600) });
  }
  t.check(`every row kept is the same on both: ${rows} rows of ${tables.length} tables (purses, plots, beds, lines, pots, deeds, goes, takes, the well's book, the lines of work)`, unlike.length === 0 && rows > 100, unlike.slice(0, 3));
  t.check("after the day no plot is damp and no pot carries anything", (await one(`select (select count(*) from public.town_plots where damp)::int + (select count(*) from public.town_pots where marks is not null)::int as n`)).n === 0);
  const leftover = await kept(U.m1);
  t.check("a purse that played the day with plain tools keeps nothing of a forged tool's", !("powers" in leftover) && !("toolOwed" in leftover) && !("canFull" in leftover) && !("rodStill" in leftover), Object.keys(leftover));
  try { await B0.db.close(); } catch { /* closed */ }

  await (await import("./v174.tools.stories.mjs")).default({ t, U, one, CODE, clock: (ms) => clock(ms, [t]), now: () => NOW, purse: (who, bag, left, more, coins) => purse(who, bag, left, more, [t], coins), kept, patch: (who, f) => patch(who, f, [t]),
    ask: (who, fn, ...args) => askOf(t, who, fn, args), lineOf, day: () => day(t), FORGED, KEEP, STAM, COOK, FISHING, hastened, sql, str, pad });
}
