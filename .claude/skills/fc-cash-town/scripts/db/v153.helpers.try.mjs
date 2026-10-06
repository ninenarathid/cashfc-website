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

  // ── the duet bell: two watering in the same bed within ten seconds of each other ──
  t.section("the duet bell: two watering in the same bed within ten seconds, and both waterings count double (town_tend, town_longpour)");
  const bell = f.helping.bell, I = row(6, 0), J = row(6, 1), L = row(6, 2), M = row(6, 3), N = row(6, 4), O = row(6, 5);
  await bedOf(6, U.admin);
  for (const k of [...I, ...J, ...L, ...M, ...N, ...O]) await planted(k, 6, U.admin);
  const today = async (who) => Number((await one(`select kept->>'today' as p from public.town_work where member_id = $1 and line = 'helpers'`, [who]))?.p ?? 0);
  const bells = async (who) => (await deeds("bell")).filter((d) => d.member_id === who);
  /** As if every watering in a bed had been so many seconds earlier. */
  const earlier = (bed, secs) => t.sql(`update public.town_plots set plant = plant || jsonb_build_object('watered', (plant->>'watered')::bigint - $2::bigint, 'pour', (plant->'pour') || jsonb_build_object('at', (plant->'pour'->>'at')::bigint - $2::bigint))
    where bed = $1 and plant ? 'pour'`, [bed, secs * 1000]);
  await give(U.m1, { had: ["charmBell"], charms: ["charmBell"] });
  await give(U.m2, { had: [], charms: [] });
  await patch(U.m1, { chime: null, rung: null, aided: [] });
  await patch(U.m2, { rung: null, aided: [] });
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  await hands(U.m2, "can", 50, ["can", 1, { water: 8 }]);
  // alone: nothing
  did = await call(U.m1, "town_tend", ...xy(I[0]), null);
  kept = (await plotAt(I[0])).plant;
  t.check("alone it does nothing: a wearer's watering in a bed not their own is once over, and only marked as a wearer's", did?.ok === true && did.bell === undefined && kept.boost === ADDS && kept.pour.worn === true && !kept.pour.bell
    && (await staminaOf(U.m1)) === 50 - f.costs.water && (await bells(U.m1)).length === 0, kept);
  // a friend with no bell waters in the same bed within the ten seconds: it rings for both, judged in the friend's call
  let t1 = await today(U.m1), t2 = await today(U.m2);
  did = await call(U.m2, "town_tend", ...xy(I[1]), null);
  let first = (await plotAt(I[0])).plant, second = (await plotAt(I[1])).plant;
  t.check("a friend waters in the same bed within ten seconds: the bell rings, though only one of the two wears it", did?.ok === true && same(did.bell, { with: [U.m1], plants: 1, back: bell.back }), did);
  t.check("…both waterings count double: what each added is added once more, the first one's too", first.boost === 2 * ADDS && second.boost === 2 * ADDS && first.pour.x === 2 && second.pour.x === 2 && first.pour.bell === true && second.pour.bell === true
    && same(did.plot.plant, second), { first, second });
  t.check("…each has two stamina back a plant: the friend in their own call, the wearer in the friend's", (await staminaOf(U.m2)) === 50 - f.costs.water + bell.back && (await staminaOf(U.m1)) === 50 - f.costs.water + bell.back
    && did.purse.stamina.left === 50 - f.costs.water + bell.back, { m1: await staminaOf(U.m1), m2: await staminaOf(U.m2) });
  let p1 = await purseOf(U.m1), p2 = await purseOf(U.m2);
  t.check("…each purse counts the plant against the day's bound, and is told who it rang with", same(p1.rung, { day, n: 1 }) && same(p2.rung, { day, n: 1 })
    && p1.aided.length === 1 && p1.aided[0].what === "bell" && p1.aided[0].by === U.m2 && p1.aided[0].n === 1 && p1.aided[0].back === bell.back && typeof p1.aided[0].name === "string"
    && p2.aided.length === 1 && p2.aided[0].by === U.m1 && p2.aided[0].back === bell.back, { a1: p1.aided, a2: p2.aided });
  let b1 = await bells(U.m1), b2 = await bells(U.m2);
  t.check("…it is written down for both: with whom, how many plants, how much stamina back", b1.length === 1 && b2.length === 1 && b1[0].n === 1 && b2[0].n === 1 && same(b1[0].doc.with, [U.m2]) && same(b2[0].doc.with, [U.m1])
    && b1[0].doc.bed === 6 && b1[0].doc.plants === 1 && b1[0].doc.back === bell.back, { b1, b2 });
  t.check("…and each watering is a point more on the helpers' line: two for a neighbour's plant watered", (await today(U.m1)) - t1 === CODE.work.helpers.water && (await today(U.m2)) - t2 === 2 * CODE.work.helpers.water, { m1: (await today(U.m1)) - t1, m2: (await today(U.m2)) - t2 });
  // the wearer waters again: the friend's watering has rung already, and says only that the friend is there
  did = await call(U.m1, "town_tend", ...xy(I[2]), null);
  t.check("the wearer's next plant within the ten seconds rings too; the friend's watering, rung already, is not doubled again", did?.ok === true && did.bell?.plants === 1 && same(did.bell.with, [U.m2]) && (await plotAt(I[2])).plant.boost === 2 * ADDS
    && (await plotAt(I[1])).plant.boost === 2 * ADDS && (await staminaOf(U.m1)) === 50 - 2 * f.costs.water + 2 * bell.back && (await staminaOf(U.m2)) === 50 - f.costs.water + bell.back && (await bells(U.m2)).length === 1, did);
  // more than ten seconds: no bell
  await earlier(6, bell.within + 1);
  did = await call(U.m2, "town_tend", ...xy(I[3]), null);
  t.check("more than ten seconds after the other's watering no bell rings", did?.ok === true && did.bell === undefined && (await plotAt(I[3])).plant.boost === ADDS && (await staminaOf(U.m2)) === 50 - 2 * f.costs.water + bell.back, did);
  // neither wears it: nothing
  await earlier(6, 60);
  await give(U.m1, { had: ["charmBell"], charms: [] });
  await call(U.m1, "town_tend", ...xy(J[0]), null);
  did = await call(U.m2, "town_tend", ...xy(J[1]), null);
  t.check("with no bell between the two, two waterings in a bed are two waterings, as ever", did?.ok === true && did.bell === undefined && (await plotAt(J[0])).plant.boost === ADDS && (await plotAt(J[1])).plant.boost === ADDS && !(await plotAt(J[0])).plant.pour.worn, did);
  // the bed's owner as the friend: their own plants doubled, stamina back, no points for their own plants
  await earlier(6, 60);
  await give(U.m1, { had: ["charmBell"], charms: ["charmBell"] });
  await give(U.admin, { had: [], charms: [] });
  await hands(U.admin, "can", 50, ["can", 1, { water: 8 }]);
  await patch(U.admin, { rung: null, aided: [] });
  const adminWas = await today(U.admin);
  await call(U.admin, "town_tend", ...xy(L[0]), null);
  did = await call(U.m1, "town_tend", ...xy(L[1]), null);
  const pa = await purseOf(U.admin), ba = await bells(U.admin);
  t.check("the bed's owner may be the friend: a helper with the bell waters beside them, and the owner's own watering is doubled too", did?.ok === true && same(did.bell?.with, [U.admin]) && (await plotAt(L[0])).plant.boost === 2 * ADDS && (await plotAt(L[1])).plant.boost === 2 * ADDS, did);
  t.check("…the owner has the stamina back and is told, and earns no point for a plant of their own", pa.stamina.left === 50 - f.costs.water + bell.back && pa.aided.at(-1).by === U.m1 && ba.length === 1 && ba[0].n === 0 && (await today(U.admin)) === adminWas, { pa: pa.aided, ba });
  // …but an owner's bell does not ring in their own bed
  await earlier(6, 60);
  await give(U.admin, { had: ["charmBell"], charms: ["charmBell"] });
  await give(U.m1, { had: ["charmBell"], charms: [] });
  await call(U.admin, "town_tend", ...xy(L[2]), null);
  did = await call(U.m1, "town_tend", ...xy(L[3]), null);
  t.check("the bell is for a bed that is not its wearer's own: worn by the owner alone it does not ring there", did?.ok === true && did.bell === undefined && !(await plotAt(L[2])).plant.pour.worn && (await plotAt(L[3])).plant.boost === ADDS, did);
  // with the anklet: never more than three times
  await earlier(6, 60);
  await give(U.m1, { had: ["charmBell", "charmAnklet"], charms: ["charmBell", "charmAnklet"] });
  await give(U.admin, { had: [], charms: [] });
  await patch(U.m1, { chime: null });
  await call(U.m2, "town_tend", ...xy(M[0]), null);
  did = await call(U.m1, "town_tend", ...xy(M[1]), null);
  kept = (await plotAt(M[1])).plant;
  t.check(`with the anklet's twice the bell's double would be four times: it is ${f.helping.most}, and the friend's plain watering twice`, did?.ok === true && did.times === 2 && kept.pour.x === f.helping.most && kept.boost === f.helping.most * ADDS && (await plotAt(M[0])).plant.boost === 2 * ADDS, kept);
  // the long pour: a whole row rung at once; the day's bound; the full gauge
  await earlier(6, 60);
  await give(U.m1, { had: ["charmBell", "charmGloves"], charms: ["charmBell", "charmGloves"] });
  await hands(U.m1, "can", 50, ["can", 1, { water: 8 }]);
  await patch(U.m1, { rung: { day, n: bell.plants - 3 } });
  await patch(U.m2, { stamina: { day, left: 100 } });
  const friendBefore = await purseOf(U.m2);
  await call(U.m2, "town_tend", ...xy(N[0]), null);
  did = await call(U.m1, "town_longpour", ...xy(N[3]), all(N.slice(1)), { hits: 6, misses: 0, secs: 3 });
  const rowN = await Promise.all(N.map(plotAt));
  t.check("a row poured beside a friend: every plant of it is rung, and the friend's one", did?.ok === true && did.done.length === 6 && rowN.every((p) => p.plant.boost === 2 * ADDS && p.plant.pour.bell === true) && did.bell?.plants === 6 && same(did.bell.with, [U.m2])
    && Object.values(did.plots).every((p) => p.plant.boost === 2 * ADDS), did);
  p1 = await purseOf(U.m1);
  t.check(`…stamina comes back for no more plants than the day's ${bell.plants}: three were left, so six stamina, not twelve`, p1.stamina.left === 50 + 3 * bell.back && did.bell.back === 3 * bell.back && same(p1.rung, { day, n: bell.plants }), { left: p1.stamina.left, rung: p1.rung });
  p2 = await purseOf(U.m2);
  t.check("…a friend whose gauge is nearly full has only what it has room for", p2.stamina.left === 100 && p2.aided.at(-1).back === f.costs.water && same(p2.rung, { day, n: (friendBefore.rung?.n ?? 0) + 1 }), { left: p2.stamina.left, rung: p2.rung, was: friendBefore.rung, aid: p2.aided.at(-1) });
  t.check("…the points are not bound by the stamina's: six plants more on the helpers' line for the row", (await bells(U.m1)).at(-1).n === 6);
  did = await call(U.m1, "town_tend", ...xy(O[0]), null);
  t.check("the day's bound reached, a bell still doubles the watering, and gives no stamina", did?.ok === true && did.bell?.back === 0 && (await plotAt(O[0])).plant.boost === 2 * ADDS && (await staminaOf(U.m1)) === 50 + 3 * bell.back, did);

  // ── the ring of shared strength: thirty stamina to a friend standing near, for fifteen ──
  t.section("the ring of shared strength: thirty stamina to a friend standing near, for half of it, three times a day (town_ring)");
  const ringBy = CODE.gifts.gifts.charmRing.by, ringUses = CODE.gifts.uses.charmRing.n, rg = f.helping.ring;
  const usedRing = async (who) => (await purseOf(who)).gifts.used?.charmRing?.n ?? 0;
  const gauge = (who, left) => patch(who, { stamina: { day, left } });
  await give(U.m1, { had: ["charmRing"], charms: [] });
  await gauge(U.m1, 60);
  await gauge(U.m2, 40);
  await patch(U.m2, { aided: [] });
  did = await call(U.m1, "town_ring", U.m2, 1);
  t.check("with the ring had but not worn: refused, and nothing changes", did?.ok === false && did.why === "none" && (await staminaOf(U.m1)) === 60 && (await staminaOf(U.m2)) === 40 && (await deeds("ring")).length === 0, did);
  await give(U.m1, { had: ["charmRing"], charms: ["charmRing"] });
  did = await call(U.m1, "town_ring", U.m2, 2);
  t.check(`worn: the friend has ${ringBy} stamina, and the wearer's own falls by half of that`, did?.ok === true && did.gave === ringBy && did.paid === ringBy * rg.part && did.left === ringUses - 1
    && (await staminaOf(U.m1)) === 60 - ringBy * rg.part && (await staminaOf(U.m2)) === 40 + ringBy && did.purse.stamina.left === 60 - ringBy * rg.part, did);
  let told2 = (await purseOf(U.m2)).aided;
  t.check("…the friend is told who gave it, and the day's use is counted in the wearer's purse", told2.length === 1 && told2[0].what === "ring" && told2[0].by === U.m1 && told2[0].n === ringBy && typeof told2[0].name === "string" && (await usedRing(U.m1)) === 1, told2);
  let gaveNote = await mine("ring", U.m1), hadNote = await mine("ring_had", U.m2);
  t.check("…it is written down for both: what was given, to whom and for how much; and by whom", gaveNote.length === 1 && gaveNote[0].n === ringBy && gaveNote[0].doc.to === U.m2 && gaveNote[0].doc.paid === ringBy * rg.part
    && hadNote.length === 1 && hadNote[0].n === ringBy && hadNote[0].doc.by === U.m1 && gaveNote[0].coins === 0, { gaveNote, hadNote });
  // never above the friend's full gauge: what would be over is not given and not paid for
  await gauge(U.m1, 60);
  await gauge(U.m2, 90);
  did = await call(U.m1, "town_ring", U.m2, 0);
  t.check("never above the friend's full gauge: ten is given where there is room for ten, and five paid", did?.ok === true && did.gave === 10 && did.paid === 5 && (await staminaOf(U.m2)) === 100 && (await staminaOf(U.m1)) === 55 && (await usedRing(U.m1)) === 2, did);
  did = await call(U.m1, "town_ring", U.m2, 0);
  t.check("a friend whose gauge is full: refused, and no use of the day is counted", did?.ok === false && did.why === "full" && (await staminaOf(U.m1)) === 55 && (await usedRing(U.m1)) === 2, did);
  // refused each way, with nothing counted
  await gauge(U.m2, 20);
  did = await call(U.m1, "town_ring", U.m2, rg.reach + 0.5);
  t.check("a friend who does not stand near: refused", did?.ok === false && did.why === "far" && (await staminaOf(U.m2)) === 20 && (await usedRing(U.m1)) === 2, did);
  did = await call(U.m1, "town_ring", U.m2, null);
  t.check("…nor with nothing said of how near", did?.ok === false && did.why === "far", did);
  await gauge(U.m1, 14);
  did = await call(U.m1, "town_ring", U.m2, 1);
  t.check("a wearer who has not the fifteen: refused, and nothing is given", did?.ok === false && did.why === "weak" && (await staminaOf(U.m1)) === 14 && (await staminaOf(U.m2)) === 20 && (await usedRing(U.m1)) === 2, did);
  did = await call(U.m1, "town_ring", U.m1, 0);
  t.check("to oneself: refused", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_ring", U.unver, 0);
  t.check("to somebody who is not of the town: refused", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_ring", null, 0);
  t.check("to nobody: refused", did?.ok === false && did.why === "none", did);
  // three times a day
  await gauge(U.m1, 80);
  did = await call(U.m1, "town_ring", U.m2, 1);
  t.check("the day's third giving is its last", did?.ok === true && did.left === 0 && (await staminaOf(U.m2)) === 50 && (await usedRing(U.m1)) === ringUses, did);
  did = await call(U.m1, "town_ring", U.m2, 1);
  t.check("…a fourth is refused, and nothing changes", did?.ok === false && did.why === "spent" && (await staminaOf(U.m1)) === 65 && (await staminaOf(U.m2)) === 50, did);
  await give(U.m1, { had: ["charmRing"], charms: ["charmRing"], used: { charmRing: { k: day - 1, n: ringUses } } });
  did = await call(U.m1, "town_ring", U.m2, 1);
  t.check("a new day: it gives again", did?.ok === true && did.left === ringUses - 1 && (await staminaOf(U.m2)) === 80, did);
  t.check("no coin changes hands by it", (await deeds("ring")).every((d) => d.coins === 0) && (await deeds("ring_had")).every((d) => d.coins === 0));
  const shutRing = await call(U.unver, "town_ring", U.m2, 1);
  t.check("it is for a proved character of the town", shutRing?.code === "42501", shutRing);

  // ── garden fae dust: a pest-ridden plant of somebody else's does not die for twelve hours ──
  t.section("garden fae dust: sprinkled on another's plant that has pests, its dying clock stops for twelve hours (town_dust)");
  // (pests strike by day: the stand-in's clock is put at two in the afternoon of its own day, for this part, and put back after it)
  const clockAt = (ms) => t.sql(`create or replace function town.now_ms() returns bigint language sql stable as $f$ select ${Math.floor(ms)}::bigint $f$`);
  const X = Math.floor((now + 7 * HOUR) / (24 * HOUR)) * 24 * HOUR - 7 * HOUR + 14 * HOUR;
  await clockAt(X);
  const dayX = (await one(`select town.day_of(town.now_ms()) as d`)).d, KILLS = f.pests.kills * HOUR, dustBy = CODE.gifts.gifts.thingDust.by, dustUses = CODE.gifts.uses.thingDust.n;
  /** Plants sown at half past seven this morning, of which a pest has struck some since: put in a bed, and the struck ones told, with when. */
  const sownAt = X - 6.5 * HOUR;
  const pestBed = async (bed, by) => {
    const struck = [];
    for (let dy = 0; dy < side; dy++) for (const k of row(bed, dy)) {
      const plant = { by, crop: "pumpkin", sown: sownAt, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
      const at = (await one(`select town.pest_at($1, $2::jsonb, $3::bigint) as s`, [k, JSON.stringify(plant), X])).s;
      await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', $4::jsonb, $5)
        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [...xy(k), bed, JSON.stringify(plant), X]);
      if (at !== null) struck.push({ key: k, at: Number(at) });
    }
    await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [bed, by, X]);
    return struck;
  };
  const sick = [...(await pestBed(9, U.m2)), ...(await pestBed(11, U.m2)), ...(await pestBed(12, U.m2))], mineSick = await pestBed(10, U.m1);
  const seenAt = async (key) => (await one(`select town.see($1, (select jsonb_build_object('soil', p.soil, 'plant', p.plant) from public.town_plots p where p.x = $2 and p.y = $3), town.now_ms()) as s`, [key, ...xy(key)])).s;
  t.check(`(the farm's own roll struck ${sick.length} of the neighbour's plants since the morning, and ${mineSick.length} of mine: enough to try the dust on)`, sick.length >= 7 && mineSick.length >= 1 && (await seenAt(sick[0].key)).pest === true, { sick: sick.length, mine: mineSick.length });
  const clean = row(9, 0).concat(row(9, 1), row(9, 2)).find((k) => !sick.some((s) => s.key === k));
  await give(U.m1, { had: [], charms: [] });
  await patch(U.m1, { stamina: { day: dayX, left: 50 }, hand: null });
  await patch(U.m2, { aided: [] });
  did = await call(U.m1, "town_dust", ...xy(sick[0].key));
  t.check("without the dust: refused, and the plant is as it was", did?.ok === false && did.why === "none" && !(await plotAt(sick[0].key)).plant.dust && (await deeds("dust")).length === 0, did);
  await give(U.m1, { had: ["thingDust"], charms: [] });
  const pointsBefore = await points(U.m1);
  did = await call(U.m1, "town_dust", ...xy(sick[0].key));
  kept = (await plotAt(sick[0].key)).plant;
  t.check("sprinkled on a neighbour's plant that has a pest: the plant remembers it, and the dust holds twelve hours from now", did?.ok === true && same(kept.dust, [X]) && did.until === X + dustBy * HOUR && did.left === dustUses - 1 && same(did.plot.plant, kept) && did.key === sick[0].key, did);
  t.check("…it is no cure: the pest is still there", (await seenAt(sick[0].key)).pest === true && kept.cured === 0);
  t.check("…for no stamina; the day's use is counted in the purse", (await staminaOf(U.m1)) === 50 && same((await purseOf(U.m1)).gifts.used.thingDust, { k: dayX, n: 1 }));
  noted = await mine("dust", U.m1);
  t.check("…written down: the plant, its tile, whose it was, until when; and it is help on the helpers' line, as feeding a plant is", noted.length === 1 && noted[0].thing === "pumpkin" && noted[0].doc.whose === U.m2 && same(noted[0].doc.tile, xy(sick[0].key)) && noted[0].doc.until === did.until
    && (await points(U.m1)) === pointsBefore + CODE.work.helpers.dust && CODE.work.helpers.dust === CODE.work.helpers.feed, { noted, points: await points(U.m1) });
  const news2 = (await purseOf(U.m2)).aided;
  t.check("…the plant's owner is told who did it, and on which plot", news2.length === 1 && news2[0].what === "dust" && news2[0].by === U.m1 && news2[0].key === sick[0].key && news2[0].at === X, news2);
  const thanks = await call(U.m2, "town_to_thank");
  t.check("…and has the duster among those to thank at the picking", (thanks?.toThank?.[sick[0].key] ?? []).some((h) => h.id === U.m1), thanks?.toThank);
  did = await call(U.m1, "town_dust", ...xy(sick[0].key));
  t.check("while the dust still lies on it, it is not sprinkled again: refused, and no use of the day is counted", did?.ok === false && did.why === "running" && (await purseOf(U.m1)).gifts.used.thingDust.n === 1, did);
  did = await call(U.m1, "town_dust", ...xy(clean));
  t.check("a plant with no pest: refused", did?.ok === false && did.why === "soil" && !(await plotAt(clean)).plant.dust, did);
  did = await call(U.m1, "town_dust", ...xy(mineSick[0].key));
  t.check("a plant of one's own, though it has a pest: refused (the dust is for somebody else's)", did?.ok === false && did.why === "own" && !(await plotAt(mineSick[0].key)).plant.dust, did);
  did = await call(U.m1, "town_dust", 0, 0);
  t.check("off the beds: refused", did?.ok === false && did.why === "none", did);
  // seven hours on: the dusted plant lives, with its pest; one beside it that nobody dusted has died of its own
  const other = sick[1], lived = sick[0];
  await clockAt(X + 7 * HOUR);
  let a1 = await seenAt(lived.key), a2 = await seenAt(other.key);
  t.check("seven hours on, the dusted plant is alive with its pest still on it, where one nobody dusted has died of its own", a1.pest === true && a1.dead === false && a2.dead === true, { a1, a2 });
  // the dust gone, the clock goes on from where it stood
  const leftWhen = KILLS - (X - lived.at), diesAt = X + dustBy * HOUR + leftWhen;
  await clockAt(diesAt);
  a1 = await seenAt(lived.key);
  await clockAt(diesAt + 1);
  a2 = await seenAt(lived.key);
  t.check("the twelve hours over, its clock goes on from where it stood: it dies when the six hours are counted out, and not before", a1.dead === false && a1.pest === true && a2.dead === true, { a1, a2, leftWhen });
  // it is rid by a cure as ever, while the dust lies on it
  await clockAt(X + HOUR);
  await patch(U.m1, { bag: bag(["pestCure", 1]), hand: "pestCure", stamina: { day: dayX, left: 50 } });
  did = await call(U.m1, "town_tend", ...xy(lived.key), null);
  t.check("a cure rids the dusted plant of its pest as ever", did?.ok === true && did.deed === "cure" && (await seenAt(lived.key)).pest === false, did);
  // five a day
  await patch(U.m1, { hand: null });
  const more = sick.filter((s) => s.key !== lived.key && X + HOUR - s.at <= KILLS).slice(0, dustUses);
  for (const s of more.slice(0, dustUses - 1)) did = await call(U.m1, "town_dust", ...xy(s.key));
  t.check(`the day's ${dustUses}th sprinkling is its last`, did?.ok === true && did.left === 0 && (await purseOf(U.m1)).gifts.used.thingDust.n === dustUses, { did, more: more.length });
  did = await call(U.m1, "town_dust", ...xy(more[dustUses - 1].key));
  t.check("…a sixth is refused, and the plant is as it was", did?.ok === false && did.why === "spent" && !(await plotAt(more[dustUses - 1].key)).plant.dust, did);
  const shutDust = await call(U.unver, "town_dust", ...xy(more[dustUses - 1].key));
  t.check("it is for a proved character of the town", shutDust?.code === "42501", shutDust);
  await t.sql(`create or replace function town.now_ms() returns bigint language sql stable as $f$ select floor(extract(epoch from now()) * 1000)::bigint $f$`);
}
