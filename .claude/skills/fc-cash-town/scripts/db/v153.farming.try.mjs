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
}
