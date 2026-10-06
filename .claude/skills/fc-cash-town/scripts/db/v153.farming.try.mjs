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
  t.check("a bed rests an hour between two of its rounds: sent again at once, refused, and nothing is done", did?.ok === false && did.why === "wet" && same(await kept(), was), did);
  // (the hour gone by: the round as if it had been an hour and a minute ago, and its water with it)
  await patch(U.m2, { gnomed: { 3: now - 61 * 60_000, 9: now - 5 * 3_600_000 } });
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
}
