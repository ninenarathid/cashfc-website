// The helpers' line's gifts, through the functions a member calls, on the stand-in database (try-line.mjs plays this
// after the rule cases): each deed done, refused for each reason, what is kept in the purse, what is written down
// and counted, and that somebody without the gift is as before.
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, give, patch }) {
  const f = CODE.farming, side = f.side, HOUR = 3_600_000;
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  const now = Number((await one(`select town.now_ms() as n`)).n);
  /** A bag of ten slots with these things in front: [item, n, more?]. */
  const bag = (...items) => { const b = Array(10).fill(null); items.forEach(([item, n, more], i) => { b[i] = { item, n, ...(more ?? {}) }; }); return b; };
  const hands = (who, hand, left, ...items) => patch(who, { bag: bag(...items), hand, stamina: { day, left } });
  const row = (bed, dy) => Array.from({ length: side }, (_, i) => `${f.bedsAt[bed][0] + i},${f.bedsAt[bed][1] + dy}`);
  const xy = (key) => key.split(",").map(Number);
  const plotAt = async (key) => { const [x, y] = xy(key); return (await one(`select soil, plant from public.town_plots where x = $1 and y = $2`, [x, y])) ?? { soil: "wild", plant: null }; };
  const staminaOf = async (who) => (await purseOf(who)).stamina.left;
  const waterOf = async (who) => (await purseOf(who)).bag.reduce((n, s) => n + (s?.item === "can" ? s.water ?? 0 : 0), 0);
  const points = async (who, line = "helpers") => Number((await one(`select kept->>'points' as p from public.town_work where member_id = $1 and line = $2`, [who, line]))?.p ?? 0);
  const mine = async (what, who) => (await deeds(what)).filter((d) => d.member_id === who);
  /** A plant put in a plot as if it had been sown so many hours ago, that no pest comes to. */
  const planted = async (key, bed, by, crop = "pumpkin", hoursAgo = 5, more = {}) => {
    const [x, y] = xy(key), plant = { by, crop, sown: now - hoursAgo * HOUR, boost: 0, watered: 0, fed: 0, guard: now + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...more };
    await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', $4::jsonb, $5)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [x, y, bed, JSON.stringify(plant), now]);
    return plant;
  };
  const bedOf = (bed, who) => t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [bed, who, now]);
  const all = (keys, how = true) => Object.fromEntries(keys.map((k) => [k, how]));

  // ── the gardener's gloves: no stamina for somebody else's work, and a row of theirs at one long pour ──
  t.section("the gardener's gloves: work for somebody else takes no stamina, and a row of theirs is watered at one long pour (town_tend, town_longpour)");
  const A = row(3, 1), B = row(3, 2), C = row(3, 3);
  await bedOf(3, U.m2);
  for (const k of [...A, ...B, ...C]) await planted(k, 3, U.m2);
  await give(U.m1, { had: ["charmGloves"], charms: [] });
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  let did = await call(U.m1, "town_longpour", ...xy(A[3]), all(A), { hits: 7, misses: 0, secs: 3.4 });
  t.check("with the gloves not worn there is no row to pour along: refused, and nothing is done", did?.ok === false && did.why === "none" && (await plotAt(A[3])).plant.watered === 0 && (await waterOf(U.m1)) === 8 && (await deeds("longpour")).length === 0, did);
  const plain = await call(U.m1, "town_tend", ...xy(C[0]), null);
  t.check("…and somebody without them waters a neighbour's plant as ever: a point of stamina, a watering out of the can, a point on the helpers' line", plain?.ok === true && plain.deed === "water" && (await staminaOf(U.m1)) === 50 - f.costs.water
    && (await waterOf(U.m1)) === 7 && (await points(U.m1)) === CODE.work.helpers.water, plain);

  await give(U.m1, { had: ["charmGloves"], charms: ["charmGloves"], owed: 0.5 });
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  did = await call(U.m1, "town_tend", ...xy(C[1]), null);
  t.check("worn: a neighbour's plant is watered for no stamina at all (the can's water as ever)", did?.ok === true && did.deed === "water" && (await staminaOf(U.m1)) === 50 && (await waterOf(U.m1)) === 7, did);
  t.check("…a half left owing from when the gloves took one is left where it was, and never asked for", (await purseOf(U.m1)).gifts.owed === 0.5);
  const pointsWas = await points(U.m1), watersWas = (await mine("water", U.m1)).length;
  const marks = { ...all(A.slice(0, 5)), ...all(A.slice(5), false) };
  did = await call(U.m1, "town_longpour", ...xy(A[3]), marks, { hits: 5, misses: 2, secs: 3.1 });
  t.check("one long pour along the row: every plant the water reached is watered, from the row's head, and the rest are left", did?.ok === true && same(did.done, A.slice(0, 5)) && did.key === A[3]
    && (await Promise.all(A.map(plotAt))).every((p, i) => (i < 5 ? Math.abs(p.plant.watered - did.now) < 2000 && p.plant.boost === f.water.adds * 60_000 : p.plant.watered === 0)), did);
  t.check("…for no stamina, and a watering out of the can for each plant", (await staminaOf(U.m1)) === 50 && did.purse.stamina.left === 50 && (await waterOf(U.m1)) === 2, await purseOf(U.m1));
  t.check("…the answer brings the plots it watered as they are kept, and the bed's keeping (still its owner's)", same(Object.keys(did.plots).sort(), A.slice(0, 5).sort()) && Object.values(did.plots).every((p) => p.plant.watered > 0) && did.bed?.by === U.m2, did.plots);
  let noted = await mine("longpour", U.m1), waters = (await mine("water", U.m1)).slice(watersWas);
  t.check("…written down once, whole: how many plants, with what, and how the game went", noted.length === 1 && noted[0].thing === "can" && noted[0].n === 5 && same(noted[0].doc.marks, marks) && same(noted[0].doc.tile, xy(A[3])) && noted[0].doc.claims.secs === 3.1, noted);
  t.check("…and each plant as its own watering: its tile, the can, whose plant it was", waters.length === 5 && same(waters.map((d) => d.doc.tile.join(",")), A.slice(0, 5)) && waters.every((d) => d.thing === "pumpkin" && d.n === 1 && d.doc.with === "can" && d.doc.whose === U.m2 && d.doc.row === true), waters);
  t.check("…each earns its point on the helpers' line", (await points(U.m1)) === pointsWas + 5 * CODE.work.helpers.water, await points(U.m1));
  const helped = (await t.sql(`select x, y, water from public.town_plot_help where helper = $1 and owner = $2 order by x`, [U.m1, U.m2])).rows;
  t.check("…and each is somebody to thank at the picking, as whoever waters by hand is", A.slice(0, 5).every((k) => helped.some((h) => `${h.x},${h.y}` === k && h.water === 1)), helped);
  // what is left of the row is a row of two; then one plant alone is none
  did = await call(U.m1, "town_longpour", ...xy(A[6]), all(A), null);
  t.check("what is left of the row is a row of its own, as far as the water in the can reaches: two plants, and the can is empty", did?.ok === true && same(did.done, A.slice(5)) && (await waterOf(U.m1)) === 0, did);
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  did = await call(U.m1, "town_longpour", ...xy(A[0]), all(A), null);
  t.check("a row watered within the hour is no row to pour along", did?.ok === false && did.why === "none" && (await waterOf(U.m1)) === 8, did);
  // nothing reached; marks that are no marks
  const before = await purseOf(U.m1);
  did = await call(U.m1, "town_longpour", ...xy(B[2]), all(B, false), { hits: 0, misses: 7, secs: 0.4 });
  t.check("nothing reached: nothing is watered and nothing spent, and it is written down all the same", did?.ok === true && did.done.length === 0 && same((await purseOf(U.m1)).bag, before.bag) && (await plotAt(B[0])).plant.watered === 0 && (await mine("longpour", U.m1)).at(-1).n === 0, did);
  did = await call(U.m1, "town_longpour", ...xy(B[2]), [true, true], null);
  t.check("…nor with marks that are no marks", did?.ok === true && did.done.length === 0, did);
  // tired hands: done all the same
  await hands(U.m1, "can", 0, ["can", 1, { water: 8 }]);
  did = await call(U.m1, "town_longpour", ...xy(B[2]), all(B), { hits: 7, misses: 0, secs: 2.4 });
  t.check("with no stamina the row is poured all the same", did?.ok === true && did.done.length === 7 && (await staminaOf(U.m1)) === 0 && (await waterOf(U.m1)) === 1, did);
  // where it is refused
  const own = row(5, 0);
  await bedOf(5, U.m1);
  for (const k of own) await planted(k, 5, U.m1);
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  did = await call(U.m1, "town_longpour", ...xy(own[0]), all(own), null);
  t.check("in a bed of one's own there is no long pour: nothing is changed there", did?.ok === false && did.why === "none" && (await plotAt(own[0])).plant.watered === 0, did);
  const self = await call(U.m1, "town_tend", ...xy(own[0]), null);
  t.check("…and one's own plant costs its stamina as ever, the gloves on or not", self?.ok === true && (await staminaOf(U.m1)) === 50 - f.costs.water, self);
  did = await call(U.m1, "town_longpour", 0, 0, {}, null);
  t.check("off the beds: refused", did?.ok === false && did.why === "none", did);
  await patch(U.m1, { hand: null });
  did = await call(U.m1, "town_longpour", ...xy(C[3]), all(C), null);
  t.check("with no can in the hand: refused", did?.ok === false && did.why === "none", did);
  const out = await call(U.unver, "town_longpour", ...xy(C[3]), {}, null);
  t.check("it is for a proved character of the town", out?.code === "42501", out);

  // ── the garden fae anklet: another's plant watered grows the more, and a run of them more still ──
  t.section("the garden fae anklet: another's plant its wearer waters grows twice as much, three times after twenty in a row (town_tend, town_longpour)");
  const ADDS = f.water.adds * 60_000, an = f.helping.anklet, D = row(4, 1), E = row(4, 2), G = row(4, 3), H = row(4, 4);
  await bedOf(4, U.m2);
  for (const k of [...D, ...E, ...G, ...H]) await planted(k, 4, U.m2);
  await give(U.m1, { had: ["charmGloves", "charmAnklet"], charms: ["charmGloves"] });
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  await patch(U.m1, { chime: null });
  did = await call(U.m1, "town_tend", ...xy(D[0]), null);
  let kept = (await plotAt(D[0])).plant;
  t.check("had and not worn: a neighbour's plant is watered once over, as ever, and no run is kept", did?.ok === true && kept.boost === ADDS && did.times === undefined && !(await purseOf(U.m1)).chime, { did, kept });
  t.check("…the plant remembers the watering: whose, when, what it added, once over", kept.pour?.by === U.m1 && kept.pour.at === kept.watered && kept.pour.base === ADDS && kept.pour.x === 1 && same(did.plot.plant, kept), kept.pour);
  await give(U.m1, { had: ["charmGloves", "charmAnklet"], charms: ["charmGloves", "charmAnklet"] });
  did = await call(U.m1, "town_tend", ...xy(D[1]), null);
  kept = (await plotAt(D[1])).plant;
  t.check("worn: the neighbour's plant grows twice as much from the watering, at once", did?.ok === true && did.times === 2 && kept.boost === 2 * ADDS && kept.pour.x === 2 && kept.pour.base === ADDS && same(did.plot.plant, kept), { did, kept });
  t.check("…and a run is begun, kept in the purse", same((await purseOf(U.m1)).chime, { n: 1, at: kept.watered }), (await purseOf(U.m1)).chime);
  did = await call(U.m1, "town_tend", ...xy(D[2]), null);
  t.check("the next plant within eight seconds is of the run", (await purseOf(U.m1)).chime.n === 2 && did.times === 2, (await purseOf(U.m1)).chime);
  // (as if the last had been nine seconds ago: the gap has passed)
  await patch(U.m1, { chime: { n: 2, at: now - (an.gap + 1) * 1000 } });
  did = await call(U.m1, "town_tend", ...xy(D[3]), null);
  t.check("…more than eight seconds after the last, the run begins anew", (await purseOf(U.m1)).chime.n === 1 && did.times === 2, (await purseOf(U.m1)).chime);
  // (as if nineteen had been watered a second ago: the twentieth)
  await patch(U.m1, { chime: { n: an.run - 1, at: now - 1000 } });
  did = await call(U.m1, "town_tend", ...xy(D[4]), null);
  kept = (await plotAt(D[4])).plant;
  t.check("the twentieth of a run grows three times as much, and those after it", did?.ok === true && did.times === an.top && kept.boost === an.top * ADDS && (await purseOf(U.m1)).chime.n === an.run, { did, kept });
  // one's own plant: as ever, and the run is not touched
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  const runWas = (await purseOf(U.m1)).chime;
  did = await call(U.m1, "town_tend", ...xy(own[1]), null);
  kept = (await plotAt(own[1])).plant;
  t.check("one's own plant is watered once over, and is not of the run", did?.ok === true && kept.boost === ADDS && kept.pour.x === 1 && did.times === undefined && same((await purseOf(U.m1)).chime, runWas), kept);
  // the long pour with the anklet on: each plant twice over, each of the run; the pour's own seconds not counted against it
  await patch(U.m1, { chime: { n: 3, at: now - 10_000 } });
  did = await call(U.m1, "town_longpour", ...xy(E[2]), all(E), { hits: 7, misses: 0, secs: 3.5 });
  const poured = await Promise.all(E.map(plotAt));
  t.check("a row poured with the anklet on: every plant twice over, and each is of the run, which the pour's own seconds did not break", did?.ok === true && did.done.length === 7 && poured.every((p) => p.plant.boost === 2 * ADDS && p.plant.pour.x === 2)
    && (await purseOf(U.m1)).chime.n === 10, { run: (await purseOf(U.m1)).chime, boosts: poured.map((p) => p.plant.boost) });
  t.check("…the answer brings the plots as they are kept", Object.values(did.plots).every((p) => p.plant.boost === 2 * ADDS && p.plant.pour.by === U.m1), did.plots);
  // with the well's water the whole is never more than three times
  await t.sql(`insert into public.town_things (key, doc) values ('well_water', $1::jsonb) on conflict (key) do update set doc = excluded.doc`, [JSON.stringify({ kind: "dawn", until: now + HOUR, by: U.m2 })]);
  const dew = 1 + CODE.waters.adds.dawn;
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  did = await call(U.m1, "town_tend", ...xy(G[0]), null);
  kept = (await plotAt(G[0])).plant;
  t.check(`while the well has the dew's water (a watering ${dew} times over by itself) the anklet's twice makes it ${f.helping.most} times, not ${2 * dew}`, did?.ok === true && did.times === 2 && kept.pour.x === f.helping.most && kept.boost === f.helping.most * ADDS && dew * 2 > f.helping.most, kept);
  await give(U.m1, { had: ["charmGloves", "charmAnklet"], charms: ["charmGloves"] });
  did = await call(U.m1, "town_tend", ...xy(G[1]), null);
  kept = (await plotAt(G[1])).plant;
  t.check("…and somebody with no anklet has the dew's water as ever: what the watering added, and as much again", did?.ok === true && kept.boost === dew * ADDS && kept.pour.x === dew, kept);
  // (a bucket poured over the bed leaves no mark of a can's watering, and is made the more by the trigger, as ever)
  await hands(U.m1, "bucket", 50, ["bucket", 1, { water: 1 }]);
  did = await call(U.m1, "town_ditch", ...xy(H[3]));
  const ditched = await Promise.all((did?.watered ?? []).map(plotAt));
  t.check("a bucket poured over a bed is kept by the trigger as it always was: the dew's water doubles it, and no can's mark is left", did?.ok === true && ditched.length === CODE.ditch.plants && ditched.every((p) => p.plant.boost === dew * ADDS && !p.plant.pour), ditched.map((p) => p.plant));
  await t.sql(`update public.town_things set doc = 'null'::jsonb where key = 'well_water'`);
}
