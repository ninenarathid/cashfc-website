// The farming line's gifts, through the functions a member calls, on the stand-in database (try-line.mjs plays this
// after the rule cases): each deed done, refused for each reason, what is kept in the purse, what is written down
// and counted, and that somebody without the gift is as before.
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, give, patch }) {
  const f = CODE.farming, side = f.side;
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  /** A bag of ten slots with these things in front: [item, n, more?]. */
  const bag = (...items) => { const b = Array(10).fill(null); items.forEach(([item, n, more], i) => { b[i] = { item, n, ...(more ?? {}) }; }); return b; };
  const hands = (who, hand, left, ...items) => patch(who, { bag: bag(...items), hand, stamina: { day, left } });
  const row = (bed, dy) => Array.from({ length: side }, (_, i) => `${f.bedsAt[bed][0] + i},${f.bedsAt[bed][1] + dy}`);
  /** A row's plots in the order its power does them from a plot of it: that one first, then outwards. */
  const outwards = (keys, at) => { const x0 = Number(at.split(",")[0]), x = (k) => Number(k.split(",")[0]); return [...keys].sort((a, b) => Math.abs(x(a) - x0) - Math.abs(x(b) - x0) || x(a) - x(b)); };
  const plotAt = async (key) => { const [x, y] = key.split(",").map(Number); return (await one(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y])) ?? { soil: "wild", plant: null }; };
  const soils = async (keys) => Promise.all(keys.map(async (k) => (await plotAt(k)).soil));
  const staminaOf = async (who) => (await purseOf(who)).stamina.left;
  const rowPlays = async (who) => (await t.sql(`select doc, spent from public.town_plays where member_id = $1 and game = 'farming' and doc->>'row' = 'true' order by id`, [who])).rows;
  const points = async (who, line) => Number((await one(`select kept->>'points' as p from public.town_work where member_id = $1 and line = $2`, [who, line]))?.p ?? 0);
  const xy = (key) => key.split(",").map(Number);

  // ── the enchanted hoe: a bed's row at a swing ──
  t.section("the enchanted hoe: a bed's row at a swing (town_row)");
  const A = row(2, 3), mid = A[3], order = outwards(A, mid);
  await give(U.m1, { had: [], charms: [] });
  await hands(U.m1, "hoe", 100, ["hoe", 1]);
  let did = await call(U.m1, "town_row", ...xy(mid), Object.fromEntries(A.map((k) => [k, true])), { hits: 7, misses: 0, secs: 6 });
  t.check("with no charm worn there is no row to work: refused, and nothing is done", did?.ok === false && did.why === "none" && (await soils(A)).every((s) => s === "wild") && (await deeds("row")).length === 0, did);
  const plain = await call(U.m1, "town_tend", ...xy(A[0]), { hits: 3, misses: 1, secs: 2 });
  t.check("…and the hoe's own deed is as it was: the plot stood on, its stamina and a point for the miss", plain?.ok === true && plain.deed === "clear" && (await staminaOf(U.m1)) === 100 - f.costs.clear - 1 && (await plotAt(A[0])).soil === "cleared", plain);
  await t.sql(`delete from public.town_plots where bed = 2`);

  await give(U.m1, { had: ["charmHoe"], charms: ["charmHoe"] });
  await hands(U.m1, "hoe", 100, ["hoe", 1]);
  const went = [true, true, false, true, false, true, true], marks = Object.fromEntries(order.map((k, i) => [k, went[i]])), hit = order.filter((_, i) => went[i]);
  did = await call(U.m1, "town_row", ...xy(mid), marks, { hits: 5, misses: 2, secs: 7 });
  t.check("worn, the row is one deed: each plot whose beat was hit is cleared, the one stood on first and then outwards", did?.ok === true && did.deed === "clear" && same(did.done, hit), did);
  t.check("…each whose beat was missed is weeds still", same(await soils(order), went.map((h) => (h ? "cleared" : "wild"))), await soils(order));
  t.check("…the stamina of each plot done is paid, and no more (a miss costs its plot, not a point)", (await staminaOf(U.m1)) === 100 - hit.length * f.costs.clear && did.purse.stamina.left === 100 - hit.length * f.costs.clear, await staminaOf(U.m1));
  t.check("…the answer brings the plots it changed and the bed's keeping (nobody's bed: none)", same(Object.keys(did.plots).sort(), [...hit].sort()) && did.key === mid && did.bed === null && Object.values(did.plots).every((p) => p.soil === "cleared" && p.plant === null), did);
  let noted = await deeds("row");
  t.check("…it is written down once, whole: which work, how many plots of it, and how the game went", noted.length === 1 && noted[0].member_id === U.m1 && noted[0].thing === "hoe" && noted[0].n === hit.length && noted[0].doc.deed === "clear" && same(noted[0].doc.marks, marks) && same(noted[0].doc.tile, xy(mid)) && noted[0].doc.claims.misses === 2, noted);
  let plays = await rowPlays(U.m1);
  t.check("…and each plot done as its own go at farming, with its tile", plays.length === hit.length && same(plays.map((p) => p.doc.tile.join(",")), hit) && plays.every((p) => p.doc.what === "clear" && p.spent === false), plays);
  t.check("…in a bed that is nobody's it earns no points of the helpers' line", (await points(U.m1, "helpers")) === 0);

  // what is left of the row is a row of two; one plot alone is none
  const left = order.filter((_, i) => !went[i]);
  did = await call(U.m1, "town_row", ...xy(left[0]), { [left[0]]: true, [left[1]]: false }, null);
  t.check("what is left of the row is a row of its own", did?.ok === true && same(did.done, [left[0]]) && (await plotAt(left[1])).soil === "wild", did);
  did = await call(U.m1, "town_row", ...xy(left[1]), { [left[1]]: true }, null);
  t.check("one plot alone is no row: refused, and left to the hoe's own deed", did?.ok === false && did.why === "none" && (await plotAt(left[1])).soil === "wild", did);
  await call(U.m1, "town_tend", ...xy(left[1]), { hits: 3, misses: 0, secs: 2 });

  // the whole row cleared: tilled the same way; with every beat missed nothing is done, and it is written down all the same
  const before = await staminaOf(U.m1);
  did = await call(U.m1, "town_row", ...xy(mid), Object.fromEntries(A.map((k) => [k, false])), { hits: 0, misses: 7, secs: 5 });
  t.check("every beat missed: nothing is done and nothing paid", did?.ok === true && did.deed === "till" && did.done.length === 0 && (await staminaOf(U.m1)) === before && (await soils(A)).every((s) => s === "cleared"), did);
  did = await call(U.m1, "town_row", ...xy(mid), Object.fromEntries(A.map((k) => [k, true])), { hits: 7, misses: 0, secs: 5 });
  t.check("cleared ground is tilled the same way, the whole row", did?.ok === true && did.deed === "till" && did.done.length === 7 && (await soils(A)).every((s) => s === "tilled") && (await staminaOf(U.m1)) === before - 7 * f.costs.till, did);
  noted = await deeds("row");
  t.check("…each go written down, the one that did nothing too", noted.length === 4 && noted[2].n === 0 && noted[3].n === 7 && noted[3].doc.deed === "till", noted.map((d) => [d.n, d.doc.deed]));

  // marks that are no marks; off the beds; nothing in the hand
  did = await call(U.m1, "town_row", ...xy(row(2, 4)[0]), null, null);
  t.check("with nothing said of any beat, nothing is done", did?.ok === true && did.done.length === 0 && (await soils(row(2, 4))).every((s) => s === "wild"), did);
  did = await call(U.m1, "town_row", ...xy(row(2, 4)[0]), [true, true, true], null);
  t.check("…nor with marks that are no marks", did?.ok === true && did.done.length === 0, did);
  did = await call(U.m1, "town_row", 0, 0, {}, null);
  t.check("off the beds: refused", did?.ok === false && did.why === "none", did);
  await patch(U.m1, { hand: null });
  did = await call(U.m1, "town_row", ...xy(row(2, 4)[0]), Object.fromEntries(row(2, 4).map((k) => [k, true])), null);
  t.check("with no hoe in the hand: refused", did?.ok === false && did.why === "none", did);

  // in somebody else's bed it is help, a plot at a time: each earns its points on the helpers' line; tired hands do it too
  const B = row(3, 1);
  await hands(U.m2, "seedKangkong", 100, ["hoe", 1], ["seedKangkong", 3]);
  await patch(U.m2, { hand: "hoe" });
  await call(U.m2, "town_tend", ...xy(row(3, 0)[0]), { hits: 3, misses: 0, secs: 1 });
  await call(U.m2, "town_tend", ...xy(row(3, 0)[0]), { hits: 3, misses: 0, secs: 1 });
  await patch(U.m2, { hand: "seedKangkong" });
  const sowed = await call(U.m2, "town_tend", ...xy(row(3, 0)[0]), null);
  t.check("(a bed of another member's: they sowed in it first)", sowed?.ok === true && sowed.deed === "sow" && sowed.bed?.by === U.m2, sowed);
  await hands(U.m1, "hoe", 0, ["hoe", 1]);
  did = await call(U.m1, "town_row", ...xy(B[0]), Object.fromEntries(B.map((k, i) => [k, i < 4])), { hits: 4, misses: 3, secs: 9 });
  t.check("in somebody else's bed, with no stamina: done all the same, the bed still theirs", did?.ok === true && did.done.length === 4 && did.bed?.by === U.m2 && (await staminaOf(U.m1)) === 0, did);
  plays = await rowPlays(U.m1);
  t.check("…each plot written down as done by tired hands", plays.slice(-4).every((p) => p.spent === true && p.doc.what === "clear") && plays.length === hit.length + 1 + 7 + 4, plays.length);
  t.check("…and each earns its points on the helpers' line", (await points(U.m1, "helpers")) === 4 * CODE.work.helpers.clear, await points(U.m1, "helpers"));

  // who may call it
  const out = await call(U.unver, "town_row", ...xy(mid), {}, null);
  t.check("it is for a proved character of the town", out?.code === "42501", out);

  // ── the garden gnome: a whole bed of its member's watered at once ──
  t.section("the garden gnome: a whole bed watered at once (town_gnome)");
  const now = Number((await one(`select town.now_ms() as n`)).n);
  /** A plant put in a plot as if it had been sown so many hours ago, that no pest comes to. */
  const planted = async (key, bed, by, crop, hoursAgo, more = {}) => {
    const [x, y] = xy(key), plant = { by, crop, sown: now - hoursAgo * 3_600_000, boost: 0, watered: 0, fed: 0, guard: now + 999 * 3_600_000, cured: 0, picked: 0, pickedAt: 0, ...more };
    await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', $4::jsonb, $5)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [x, y, bed, JSON.stringify(plant), now]);
    return plant;
  };
  const C = row(3, 4), D = row(3, 6);
  for (const k of C) await planted(k, 3, U.m2, "pumpkin", 5);
  await planted(D[0], 3, U.m2, "chili", 9, { watered: now - 10 * 60_000, boost: 1_800_000 });   // watered ten minutes ago: wet
  await planted(D[1], 3, U.m2, "cabbage", 30);                                                    // ripe, and picked once: only waits
  const first = row(3, 0)[0], thirsty = [first, ...C].sort((a, b) => xy(a)[1] - xy(b)[1] || xy(a)[0] - xy(b)[0]);
  const waterDeeds = async () => (await deeds("water")).length;
  const kept = async () => ({ purse: await purseOf(U.m2), waters: await waterDeeds(), gnomes: (await deeds("gnome")).length });
  await give(U.m2, { had: ["famGnome", "famSquirrel"], charms: [], familiar: "famSquirrel" });
  await hands(U.m2, "can", 40, ["can", 1, { water: 3 }]);
  let was = await kept();
  did = await call(U.m2, "town_gnome", ...xy(C[0]));
  t.check("with no gnome at heel (another familiar follows): refused, and nothing is done", did?.ok === false && did.why === "none" && same(await kept(), was) && (await plotAt(C[0])).plant.watered === 0, did);
  await give(U.m2, { had: ["famGnome", "famSquirrel"], charms: [], familiar: "famGnome" });
  const tendedWas = (await one(`select tended from public.town_beds where bed = 3`)).tended;
  did = await call(U.m2, "town_gnome", ...xy(D[3]));
  t.check("sent from any plot of the bed, it waters every plant there that could do with water, down the bed a row at a time", did?.ok === true && same(did.watered, thirsty), did);
  t.check("…not the one that is wet already, nor the one that only waits to be picked", (await plotAt(D[0])).plant.watered === now - 10 * 60_000 && (await plotAt(D[1])).plant.watered === 0);
  const after = await Promise.all(thirsty.map(plotAt));
  t.check("…each has what a plain can would have added, and was watered at that moment", after.every((p) => p.plant.watered === did.now || Math.abs(p.plant.watered - did.now) < 2000) && after.slice(1).every((p) => p.plant.boost === f.water.adds * 60_000)
    && same(Object.keys(did.plots).sort(), [...thirsty].sort()) && Object.values(did.plots).every((p) => p.plant.boost >= f.water.adds * 60_000), after.map((p) => p.plant));
  let p2 = await purseOf(U.m2);
  t.check("…for no stamina and no water out of the can; the purse remembers the round", p2.stamina.left === 40 && p2.bag[0].water === 3 && typeof p2.gnomed?.["3"] === "number" && Object.keys(p2.gnomed).length === 1, p2);
  noted = await deeds("gnome");
  t.check("…written down as one line, with how many plants; no watering of a plant is written, and no line of work counts it", noted.length === 1 && noted[0].member_id === U.m2 && noted[0].n === thirsty.length && noted[0].doc.bed === 3
    && (await waterDeeds()) === was.waters && (await points(U.m2, "helpers")) === 0, noted);
  t.check("…and it is its owner's tending of the bed", Number((await one(`select tended from public.town_beds where bed = 3`)).tended) >= Number(tendedWas));
  was = await kept();
  did = await call(U.m2, "town_gnome", ...xy(D[3]));
  t.check("a bed rests between two of its rounds: sent again at once, refused, and nothing is done", did?.ok === false && did.why === "wet" && same(await kept(), was), did);
  // (its rest gone by: the round as if it had been a minute longer ago than a bed rests, and its water with it)
  await patch(U.m2, { gnomed: { 3: now - (CODE.gifts.gifts.famGnome.by + 1) * 60_000, 9: now - 5 * 3_600_000 } });
  await t.sql(`update public.town_plots set plant = plant || jsonb_build_object('watered', $1::bigint) where bed = 3 and plant is not null and (plant->>'watered')::bigint > $1::bigint`, [now - 61 * 60_000]);
  did = await call(U.m2, "town_gnome", ...xy(first));
  p2 = await purseOf(U.m2);
  t.check("…the hour gone by, it goes again; a round that no longer counts is forgotten", did?.ok === true && did.watered.length === thirsty.length + 1 && Object.keys(p2.gnomed).join() === "3", { did, gnomed: p2.gnomed });
  // somebody else's bed, nobody's, off the beds
  await give(U.m1, { had: ["famGnome"], charms: [], familiar: "famGnome" });
  was = { waters: await waterDeeds(), gnomes: (await deeds("gnome")).length };
  did = await call(U.m1, "town_gnome", ...xy(C[0]));
  t.check("in somebody else's bed: refused (its member's own beds only)", did?.ok === false && did.why === "theirs", did);
  did = await call(U.m1, "town_gnome", ...xy(A[0]));
  t.check("in a bed that is nobody's: refused", did?.ok === false && did.why === "theirs", did);
  did = await call(U.m1, "town_gnome", 0, 0);
  t.check("off the beds: refused", did?.ok === false && did.why === "none" && (await deeds("gnome")).length === was.gnomes, did);
  did = await call(U.m1, "town_gift_use", "famGnome");
  t.check("the gnome is no longer a gift that is counted: nothing of it to use", did?.ok === false && did.why === "none", did);
  const shut = await call(U.unver, "town_gnome", ...xy(C[0]));
  t.check("it is for a proved character of the town", shut?.code === "42501", shut);

  // ── the spellbound seed pouch: a row sown at once ──
  t.section("the spellbound seed pouch: a row sown at once, for five seeds (town_row)");
  const tilled = async (keys, bed) => { for (const k of keys) await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', null, $4)
    on conflict (x, y) do update set soil = 'tilled', plant = null, changed = excluded.changed`, [...xy(k), bed, now]); };
  const seedsOf = async (who) => (await purseOf(who)).bag.reduce((n, s) => n + (s?.item === "seedPumpkin" ? s.n : 0), 0);
  const sowDeeds = async (who) => (await deeds("sow")).filter((d) => d.member_id === who && d.doc.row === true);
  // (the row the hoe tilled, in a bed that is nobody's)
  await give(U.m1, { had: ["charmHoe"], charms: ["charmHoe"] });
  await hands(U.m1, "seedPumpkin", 100, ["seedPumpkin", 9], ["hoe", 1]);
  let rowsWas = (await deeds("row")).length;
  did = await call(U.m1, "town_row", ...xy(mid), {}, null);
  t.check("without the pouch a row is not sown: refused, no seed gone", did?.ok === false && did.why === "none" && (await seedsOf(U.m1)) === 9 && (await plotAt(mid)).plant === null, did);
  await give(U.m1, { had: ["charmHoe", "thingPouch"], charms: ["charmHoe"] });
  did = await call(U.m1, "town_row", ...xy(mid), {}, null);
  t.check("with the pouch the whole row is sown at once, the plot stood on first: seven plots", did?.ok === true && did.deed === "sow" && same(did.done, order) && did.seeds === 5, did);
  t.check("…for five seeds, and the stamina of seven sowings", (await seedsOf(U.m1)) === 4 && (await staminaOf(U.m1)) === 100 - 7 * f.costs.sow, { seeds: await seedsOf(U.m1), stamina: await staminaOf(U.m1) });
  const sownNow = await Promise.all(A.map(plotAt));
  t.check("…every plot has its plant, the sower's, sown at that moment", sownNow.every((p) => p.soil === "tilled" && p.plant?.by === U.m1 && p.plant.crop === "pumpkin" && p.plant.picked === 0) && new Set(sownNow.map((p) => p.plant.sown)).size === 1, sownNow.map((p) => p.plant));
  t.check("…the bed is whoever sowed in it first, as ever: the answer says so", did.bed?.by === U.m1 && (await one(`select member_id from public.town_beds where bed = 2`))?.member_id === U.m1, did.bed);
  let sowedRow = await sowDeeds(U.m1);
  noted = await deeds("row");
  t.check("…each plot written down as its own sowing, with its tile, and the row once, whole", sowedRow.length === 7 && same(sowedRow.map((d) => d.doc.tile.join(",")), order) && sowedRow.every((d) => d.thing === "pumpkin" && d.n === 1 && d.doc.with === "seedPumpkin")
    && noted.length === rowsWas + 1 && noted.at(-1).n === 7 && noted.at(-1).doc.deed === "sow" && noted.at(-1).thing === "seedPumpkin", sowedRow);
  t.check("…sowing earns no points on the farming line, as ever", (await points(U.m1, "farming")) === 0);
  // fewer seeds: as many plots as they reach; one seed is one plot, which is no row
  const E = row(2, 5);
  await tilled(E, 2);
  await hands(U.m1, "seedPumpkin", 100, ["seedPumpkin", 3]);
  did = await call(U.m1, "town_row", ...xy(E[0]), {}, null);
  t.check("with three seeds, four plots are sown, the nearest first, and the hand is empty", did?.ok === true && same(did.done, E.slice(0, 4)) && did.seeds === 3 && (await seedsOf(U.m1)) === 0 && (await plotAt(E[4])).plant === null, did);
  await hands(U.m1, "seedPumpkin", 100, ["seedPumpkin", 1]);
  did = await call(U.m1, "town_row", ...xy(E[4]), {}, null);
  t.check("with one seed there is no row to sow: refused, the seed still in the hand", did?.ok === false && did.why === "none" && (await seedsOf(U.m1)) === 1, did);
  const one1 = await call(U.m1, "town_tend", ...xy(E[4]), null);
  t.check("…and it is sown by hand as ever: one seed, one plot", one1?.ok === true && one1.deed === "sow" && (await seedsOf(U.m1)) === 0 && (await plotAt(E[4])).plant?.crop === "pumpkin", one1);
  // somebody else's bed; a free bed, to whoever holds as many as one may
  await tilled(row(3, 2), 3);
  await hands(U.m1, "seedPumpkin", 100, ["seedPumpkin", 9]);
  did = await call(U.m1, "town_row", ...xy(row(3, 2)[0]), {}, null);
  t.check("in somebody else's bed nothing is sown (sowing is its owner's)", did?.ok === false && did.why === "none" && (await seedsOf(U.m1)) === 9, did);
  await tilled(row(7, 0), 7);
  await tilled(row(8, 0), 8);
  did = await call(U.m1, "town_row", ...xy(row(7, 0)[3]), {}, null);
  t.check("a second bed is taken by the pouch's sowing as by any", did?.ok === true && did.done.length === 7 && did.bed?.by === U.m1, did);
  const had9 = await seedsOf(U.m1);
  did = await call(U.m1, "town_row", ...xy(row(8, 0)[3]), {}, null);
  t.check("…and a third is refused to whoever holds as many as one may: nothing sown, no seed gone", did?.ok === false && did.why === "beds" && (await seedsOf(U.m1)) === had9 && (await plotAt(row(8, 0)[3])).plant === null, did);
  // tired hands sow the row all the same (the page asks its short game of them first)
  await tilled(row(7, 1), 7);
  await hands(U.m1, "seedPumpkin", 0, ["seedPumpkin", 5]);
  did = await call(U.m1, "town_row", ...xy(row(7, 1)[0]), {}, { hits: 2, misses: 1, secs: 3 });
  t.check("with no stamina the row is sown all the same", did?.ok === true && did.done.length === 7 && (await seedsOf(U.m1)) === 0 && (await staminaOf(U.m1)) === 0, did);

  // ── the crescent sickle: a whole ripe row at one sweep ──
  t.section("the crescent sickle: a whole ripe row picked at one sweep (town_row)");
  const R = row(2, 6), rMid = R[3], rOrder = outwards(R, rMid);
  for (const k of R) await planted(k, 2, U.m1, "pumpkin", 150);   // a pumpkin takes 144 hours: ripe, two a picking, picked once
  const pumpkins = async (who) => (await purseOf(who)).bag.reduce((n, s) => n + (s?.item === "pumpkin" ? s.n : 0), 0);
  const today = async (who, line) => Number((await one(`select kept->>'today' as p from public.town_work where member_id = $1 and line = $2`, [who, line]))?.p ?? 0);
  const pickDeeds = async (who) => (await deeds("pick")).filter((d) => d.member_id === who);
  await give(U.m1, { had: ["charmHoe", "thingPouch", "charmSickle"], charms: ["charmHoe"] });
  await hands(U.m1, null, 100);
  rowsWas = (await deeds("row")).length;
  did = await call(U.m1, "town_row", ...xy(rMid), Object.fromEntries(R.map((k) => [k, true])), { hits: 7, misses: 0, secs: 3 });
  t.check("with the sickle not worn a row is not reaped: refused, nothing picked", did?.ok === false && did.why === "none" && (await pumpkins(U.m1)) === 0 && (await plotAt(rMid)).plant !== null, did);
  const byHand = await call(U.m1, "town_tend", ...xy(R[0]), null);
  t.check("…and a plant is picked by hand as ever: what it gives, for the stamina of a picking", byHand?.ok === true && byHand.deed === "pick" && same(byHand.got, [["pumpkin", 2]]) && (await staminaOf(U.m1)) === 100 - f.costs.pick, byHand);
  const worth = CODE.work.farming.pumpkin, todayWas = await today(U.m1, "farming"), picksWas = (await pickDeeds(U.m1)).length;
  await give(U.m1, { had: ["charmHoe", "thingPouch", "charmSickle"], charms: ["charmHoe", "charmSickle"] });
  await hands(U.m1, null, 100);
  // (the sweep went along five of the six that are left: three cut well, two badly; the sixth was not in it)
  const swept = { [rOrder[0]]: true, [rOrder[1]]: false, [rOrder[2]]: true, [rOrder[3]]: true, [rOrder[4]]: false }, inSweep = rOrder.filter((k) => k in swept && k !== R[0]);
  did = await call(U.m1, "town_row", ...xy(rMid), swept, { hits: 3, misses: 2, secs: 3.2 });
  t.check("worn, in my own bed: every plant the sweep went along is picked, the one stood on first and then outwards", did?.ok === true && did.deed === "pick" && same(did.done, inSweep), did);
  t.check("…one cut well gives one more, one cut badly what it would have by hand: three and three and three, two and two", same(did.got, [["pumpkin", 3 * 3 + 2 * 2]]) && (await pumpkins(U.m1)) === 13, did?.got);
  t.check("…for the stamina of five pickings", (await staminaOf(U.m1)) === 100 - 5 * f.costs.pick, await staminaOf(U.m1));
  const leftOver = R.filter((k) => k !== R[0] && !inSweep.includes(k));
  t.check("…a pumpkin is picked once: each plot is bare ground again; the plant the sweep did not go along stands", (await soils(inSweep)).every((s) => s === "cleared") && (await Promise.all(inSweep.map(plotAt))).every((p) => p.plant === null)
    && leftOver.length === 1 && (await plotAt(leftOver[0])).plant?.crop === "pumpkin", leftOver);
  const picks = (await pickDeeds(U.m1)).slice(picksWas);
  noted = await deeds("row");
  t.check("…each plant written down as its own picking: how many, its tile, how it was cut; and the row once, whole", picks.length === 5 && same(picks.map((d) => d.doc.tile.join(",")), inSweep) && same(picks.map((d) => d.n), inSweep.map((k) => (swept[k] ? 3 : 2)))
    && same(picks.map((d) => d.doc.well), inSweep.map((k) => swept[k])) && picks.every((d) => d.thing === "pumpkin" && d.doc.row === true)
    && noted.length === rowsWas + 1 && noted.at(-1).n === 5 && noted.at(-1).doc.deed === "pick", picks);
  t.check("…and each earns its points on the farming line, as a picking by hand does", Math.abs((await today(U.m1, "farming")) - todayWas - 5 * worth) < 1e-9 && worth > 0, { was: todayWas, now: await today(U.m1, "farming"), worth });
  did = await call(U.m1, "town_row", ...xy(leftOver[0]), { [leftOver[0]]: true }, null);
  t.check("one ripe plant alone is no row: refused, and left to the hand", did?.ok === false && did.why === "none" && (await plotAt(leftOver[0])).plant !== null, did);
  // a bag with no room: nothing is done; somebody else's bed and nobody's: nothing to reap
  const R2 = row(2, 1);
  for (const k of R2) await planted(k, 2, U.m1, "pumpkin", 150);
  await patch(U.m1, { bag: Array.from({ length: 10 }, () => ({ item: "bowl", n: 1 })), hand: null });
  did = await call(U.m1, "town_row", ...xy(R2[0]), Object.fromEntries(R2.map((k) => [k, true])), null);
  t.check("with no room in the bag: refused, and nothing is picked", did?.ok === false && did.why === "full" && (await Promise.all(R2.map(plotAt))).every((p) => p.plant !== null), did);
  await patch(U.m1, { bag: [...Array.from({ length: 9 }, () => ({ item: "bowl", n: 1 })), { item: "pumpkin", n: CODE.items.pumpkin.stack - 5 }], hand: null });
  did = await call(U.m1, "town_row", ...xy(R2[0]), Object.fromEntries(R2.map((k) => [k, true])), null);
  t.check("with room for five: the first cut well is three, the second has no room for its one more and is two, the third does not fit and the rest stand", did?.ok === true && same(did.done, R2.slice(0, 2)) && same(did.got, [["pumpkin", 5]])
    && (await Promise.all(R2.slice(2).map(plotAt))).every((p) => p.plant !== null), did);
  const R3 = row(3, 5);
  for (const k of R3) await planted(k, 3, U.m2, "pumpkin", 150);
  await hands(U.m1, null, 100);
  did = await call(U.m1, "town_row", ...xy(R3[0]), Object.fromEntries(R3.map((k) => [k, true])), null);
  t.check("in somebody else's bed: refused (its wearer's own beds only), nothing picked", did?.ok === false && did.why === "none" && (await plotAt(R3[0])).plant !== null, did);
  await give(U.m2, { had: ["charmSickle"], charms: ["charmSickle"] });
  await hands(U.m2, null, 0);
  did = await call(U.m2, "town_row", ...xy(R3[0]), Object.fromEntries(R3.map((k, i) => [k, i % 2 === 0])), { hits: 4, misses: 3, secs: 2.4 });
  t.check("its owner reaps it, with no stamina too: seven plants, four of them with one more", did?.ok === true && did.done.length === 7 && same(did.got, [["pumpkin", 7 * 2 + 4]]), did);

  // ── the hourglass of seasons: a bed grows three times as fast for three hours ──
  t.section("the hourglass of seasons: a bed three times as fast for three hours (town_hourglass)");
  const glass = CODE.farming.gifted.glass, by = CODE.gifts.gifts.thingHourglass.by, HOUR = 3_600_000;
  const living = async (bed) => (await t.sql(`select x, y, plant from public.town_plots where bed = $1 and plant is not null order by y, x`, [bed])).rows;
  const grownAt = async (plant, at) => Number((await one(`select town.grown($1::jsonb, $2::bigint) as h`, [JSON.stringify(plant), at])).h);
  await give(U.m2, { had: ["charmSickle"], charms: ["charmSickle"] });
  const before3 = await living(3);
  did = await call(U.m2, "town_hourglass", ...xy(C[0]));
  t.check("without the hourglass: refused, and no plant is touched", did?.ok === false && did.why === "none" && same(await living(3), before3) && before3.length >= 9, did);
  await give(U.m2, { had: ["charmSickle", "thingHourglass"], charms: ["charmSickle"] });
  const tended3 = Number((await one(`select tended from public.town_beds where bed = 3`)).tended);
  did = await call(U.m2, "town_hourglass", ...xy(C[0]));
  const after3 = await living(3);
  t.check("turned over my bed from any plot of it: every plant that lives there, down the bed a row at a time", did?.ok === true && same(did.quickened, before3.map((r) => `${r.x},${r.y}`)) && Math.abs(did.until - did.now - glass.hours * HOUR) < 2000, did);
  t.check("…each remembers the turning, and is otherwise as it was", after3.every((r, i) => same({ ...r.plant, fast: null }, { ...before3[i].plant, fast: null }) && r.plant.fast.length === 1 && r.plant.fast[0] === did.until - glass.hours * HOUR), after3.map((r) => r.plant.fast));
  const one3 = after3.find((r) => r.plant.crop === "pumpkin" && r.plant.picked === 0).plant, plain3 = { ...one3, fast: [] }, t0 = one3.fast[0];
  const gain = async (dt) => (await grownAt(one3, t0 + dt * HOUR)) - (await grownAt(plain3, t0 + dt * HOUR));
  t.check(`…and grows ${by} times as fast for ${glass.hours} hours from that moment: an hour in, ${by - 1} hours ahead; at the end and ever after, ${(by - 1) * glass.hours}`,
    Math.abs((await gain(1)) - (by - 1)) < 1e-9 && Math.abs((await gain(glass.hours)) - (by - 1) * glass.hours) < 1e-9 && Math.abs((await gain(50)) - (by - 1) * glass.hours) < 1e-9 && (await gain(0)) === 0, [await gain(1), await gain(3), await gain(50)]);
  p2 = await purseOf(U.m2);
  noted = await deeds("hourglass");
  t.check("…the day's turning is counted in the purse, and the deed written down once: how many plants, and until when", p2.gifts.used.thingHourglass.n === 1 && p2.gifts.used.thingHourglass.k === day
    && noted.length === 1 && noted[0].member_id === U.m2 && noted[0].n === before3.length && noted[0].doc.bed === 3 && noted[0].doc.until === did.until, { used: p2.gifts.used, noted });
  t.check("…it is its owner's tending of the bed, and costs no stamina", Number((await one(`select tended from public.town_beds where bed = 3`)).tended) >= tended3 && p2.stamina.left === 0);
  const told = await call(U.m2, "town_farm", 0);
  t.check("…everybody's page is told of it with the farm: the plants come with their turning", Object.values(told.plots).filter((p) => p.plant?.fast?.length === 1).length === before3.length, Object.keys(told.plots).length);
  did = await call(U.m2, "town_hourglass", ...xy(C[0]));
  t.check("once a day: turned again, refused, and nothing changes", did?.ok === false && did.why === "spent" && same(await living(3), after3) && (await deeds("hourglass")).length === 1, did);
  // (the count as if it had been yesterday's: the sand still runs over these plants)
  await give(U.m2, { had: ["charmSickle", "thingHourglass"], charms: ["charmSickle"], used: { thingHourglass: { k: day - 1, n: 1 } } });
  did = await call(U.m2, "town_hourglass", ...xy(C[0]));
  t.check("while the sand still runs over the bed it is not turned again", did?.ok === false && did.why === "running" && same(await living(3), after3), did);
  // (…and as if it had been turned four hours ago: over, and turned anew; the plants remember both)
  await t.sql(`update public.town_plots set plant = plant || jsonb_build_object('fast', jsonb_build_array((plant->'fast'->>0)::bigint - 4 * 3600000)) where bed = 3 and plant ? 'fast'`);
  did = await call(U.m2, "town_hourglass", ...xy(C[0]));
  t.check("the sand run out and a new day's turning to hand: turned anew, and the plants remember both", did?.ok === true && (await living(3)).every((r) => r.plant.fast.length === 2 && r.plant.fast[1] - r.plant.fast[0] >= 4 * HOUR), did);
  // somebody else's bed, nobody's, off the beds
  await give(U.m1, { had: ["thingHourglass"], charms: [] });
  did = await call(U.m1, "town_hourglass", ...xy(C[0]));
  t.check("over somebody else's bed: refused (one bed of its owner's)", did?.ok === false && did.why === "theirs", did);
  did = await call(U.m1, "town_hourglass", ...xy(row(11, 0)[0]));
  t.check("over a bed that is nobody's: refused", did?.ok === false && did.why === "theirs", did);
  did = await call(U.m1, "town_hourglass", 0, 0);
  t.check("off the beds: refused, and the day's turning is not counted", did?.ok === false && did.why === "none" && !(await purseOf(U.m1)).gifts.used?.thingHourglass, did);
  const shut2 = await call(U.unver, "town_hourglass", ...xy(C[0]));
  t.check("it is for a proved character of the town", shut2?.code === "42501", shut2);
  // a plant with no hourglass is as it always was: the farm's own deeds on one
  const plainPlant = (await living(2)).find((r) => !r.plant.fast)?.plant;
  t.check("a plant no hourglass was turned over has no mark of one, and grows by the clock as ever", !!plainPlant && Math.abs((await grownAt(plainPlant, plainPlant.sown + 10 * HOUR)) - 10 - plainPlant.boost / HOUR) < 1e-9, plainPlant);

  // ── the mandrake sprout: it sings as a plant is picked, and that plant bears once more ──
  t.section("the mandrake sprout: a plant picked for the last time bears once more (town_tend, town_row)");
  const songs = CODE.gifts.uses.famMandrake.n, encore = CODE.farming.gifted.encore, pumpkinHours = CODE.crops.pumpkin.hours;
  const M = row(7, 4);
  for (const k of M) await planted(k, 7, U.m1, "pumpkin", 150);
  const usedSongs = async (who) => (await purseOf(who)).gifts.used?.famMandrake?.n ?? 0;
  // not following: a pumpkin is picked once and gone, as ever
  await give(U.m1, { had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: null });
  await hands(U.m1, null, 100);
  did = await call(U.m1, "town_tend", ...xy(M[0]), null);
  t.check("with the mandrake had but not following: a pumpkin is picked once and gone, as ever, and nothing is counted", did?.ok === true && did.deed === "pick" && did.plot.plant === null && (await plotAt(M[0])).plant === null && (await usedSongs(U.m1)) === 0, did);
  await give(U.m1, { had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake" });
  const picksBefore = (await pickDeeds(U.m1)).length;
  did = await call(U.m1, "town_tend", ...xy(M[1]), null);
  const sungPlant = (await plotAt(M[1])).plant;
  t.check("following: the plant is picked as ever (what it gives, the stamina of a picking, its line of the deeds)", did?.ok === true && did.deed === "pick" && same(did.got, [["pumpkin", 2]]) && (await staminaOf(U.m1)) === 100 - 2 * f.costs.pick
    && (await pickDeeds(U.m1)).length === picksBefore + 1, did);
  t.check("…and is not gone: it stays in its plot, picked once and sung to, and the day's song is counted", sungPlant?.crop === "pumpkin" && sungPlant.picked === 1 && sungPlant.more === 1 && same(did.plot.plant, sungPlant) && (await usedSongs(U.m1)) === 1, sungPlant);
  const seenAt = async (plant, at) => (await one(`select town.see('1,1', $1::jsonb, $2::bigint) as s`, [JSON.stringify({ soil: "tilled", plant }), at])).s;
  const half = pumpkinHours * encore * HOUR;
  t.check(`…it waits half its hours to bear the once more (${pumpkinHours * encore} hours): a stage back until then, ripe from then on`,
    same([(await seenAt(sungPlant, sungPlant.pickedAt + half - 1)).ripe, (await seenAt(sungPlant, sungPlant.pickedAt + half - 1)).stage, (await seenAt(sungPlant, sungPlant.pickedAt + half)).ripe], [false, 4, true]), await seenAt(sungPlant, sungPlant.pickedAt + half));
  did = await call(U.m1, "town_tend", ...xy(M[1]), null);
  t.check("…until then it is not picked", did?.ok === false && did.why === "soil" || did?.why === "unripe", did);
  // (as if it had been picked that long ago: ripe for its bearing more)
  await t.sql(`update public.town_plots set plant = plant || jsonb_build_object('pickedAt', (plant->>'pickedAt')::bigint - $3::bigint) where x = $1 and y = $2`, [...xy(M[1]), half + HOUR]);
  did = await call(U.m1, "town_tend", ...xy(M[1]), null);
  t.check("its wait over, it is picked the once more, and then it is gone: a plant is sung to once", did?.ok === true && did.deed === "pick" && did.got[0][0] === "pumpkin" && did.plot.plant === null && (await plotAt(M[1])).plant === null && (await usedSongs(U.m1)) === 1, did);
  // the sickle's row with the mandrake at heel: every plant swept is sung to, while songs last
  await hands(U.m1, null, 100);
  did = await call(U.m1, "town_row", ...xy(M[4]), Object.fromEntries(M.slice(2).map((k) => [k, true])), { hits: 5, misses: 0, secs: 3 });
  const rowAfter = await Promise.all(M.slice(2).map(plotAt));
  t.check("a row swept with the sickle, the mandrake at heel: five plants picked, three each, and every one sung to and standing", did?.ok === true && did.done.length === 5 && same(did.got, [["pumpkin", 15]])
    && rowAfter.every((p) => p.plant?.more === 1 && p.plant.picked === 1) && (await usedSongs(U.m1)) === 6, { did, rowAfter: rowAfter.map((p) => p.plant) });
  // seven plants a day: the eighth is gone as ever
  const N = row(7, 5);
  for (const k of N.slice(0, 3)) await planted(k, 7, U.m1, "pumpkin", 150);
  await call(U.m1, "town_tend", ...xy(N[0]), null);
  t.check(`the day's ${songs}th plant is sung to`, (await plotAt(N[0])).plant?.more === 1 && (await usedSongs(U.m1)) === songs, await usedSongs(U.m1));
  did = await call(U.m1, "town_tend", ...xy(N[1]), null);
  t.check("…and the next is picked and gone: no song is left to the day", did?.ok === true && did.plot.plant === null && (await usedSongs(U.m1)) === songs, did);
  // (the count as if it had been yesterday's: it sings again)
  await give(U.m1, { had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake", used: { famMandrake: { k: day - 1, n: songs } } });
  did = await call(U.m1, "town_tend", ...xy(N[2]), null);
  t.check("a new day: it sings again", did?.ok === true && did.plot.plant?.more === 1 && (await usedSongs(U.m1)) === 1 && (await purseOf(U.m1)).gifts.used.famMandrake.k === day, did);
  // a plant that bears again: sung to at its last picking only
  const G = row(7, 6), kang = CODE.crops.kangkong;
  await planted(G[0], 7, U.m1, "kangkong", 40);
  await planted(G[1], 7, U.m1, "kangkong", 60, { picked: kang.picks - 1, pickedAt: now - (kang.again + 1) * HOUR });
  did = await call(U.m1, "town_tend", ...xy(G[0]), null);
  t.check("a plant that bears again, at its first picking: not sung to, it has pickings of its own left", did?.ok === true && did.plot.plant?.picked === 1 && did.plot.plant.more === undefined && (await usedSongs(U.m1)) === 1, did?.plot);
  did = await call(U.m1, "town_tend", ...xy(G[1]), null);
  t.check("…at its last: sung to, and it waits its own while to bear the once more", did?.ok === true && did.plot.plant?.picked === kang.picks && did.plot.plant.more === 1 && (await usedSongs(U.m1)) === 2
    && (await seenAt(did.plot.plant, did.plot.plant.pickedAt + kang.again * HOUR)).ripe === true && (await seenAt(did.plot.plant, did.plot.plant.pickedAt + kang.again * HOUR - 1)).ripe === false, did?.plot);
  // somebody without it is as before
  await planted(row(3, 3)[0], 3, U.m2, "pumpkin", 150);
  await hands(U.m2, null, 100);
  did = await call(U.m2, "town_tend", ...xy(row(3, 3)[0]), null);
  t.check("somebody with no mandrake picks a pumpkin once and it is gone, as ever", did?.ok === true && did.deed === "pick" && did.plot.plant === null && !(await purseOf(U.m2)).gifts.used?.famMandrake, did);
}
