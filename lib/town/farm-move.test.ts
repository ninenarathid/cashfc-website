import { describe, expect, it } from "vitest";
import { FARMING, atTop, homeOf, movable, movePlant, moveTargets, pestAt, pick, rowTend, see, tend, yieldOf, type Bed, type Plant, type Plot } from "./farm";
import { gardenHarvest } from "./gardening";
import { USES, usesLeft } from "./gifts";
import { CROPS, type CropId, type ItemId } from "./items";
import { GRADES, gradeOf, rangeOfQ, type PlantQ } from "./quality";
import { bedGift, harvestOf, settled, syncMove, syncQuality } from "./quality-plant";
import { dayOf } from "./stamina";
import { HOUR, held, newPurse, put, type Purse } from "./trade";
import { bedCorner, rowOf } from "./world";

/**
 * The farming line's first and sixth ranks as the owner had them changed on 2026-10-16 (lib/town/farm): the enchanted
 * hoe moves a plant of mine within its bed, keeping everything it has (`movePlant`), and the mandrake that follows me
 * puts every fruit of my own plants at the top of its range (`atTop`).
 */
const at = (s: string) => Date.parse(`${s}+07:00`);
const NOON = at("2026-10-17T12:00:00");
const [BX, BY] = bedCorner(0), [OX, OY] = bedCorner(1);
const k = (u: number, v: number) => `${BX + u},${BY + v}`;
const HOE = { had: ["charmHoe"], charms: ["charmHoe"] };
const MANDRAKE = { had: ["famMandrake"], charms: [], familiar: "famMandrake" };
const purseWith = (gifts: Purse["gifts"] | undefined, ...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, stamina: { day: dayOf(NOON), left: 100 }, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]), ...(gifts ? { gifts } : {}) };
};
/** A round of Quality gathered so far, that makes a range of 51 to 81 (soil 20, water 22, pollen 14, guard 25). */
const Q = (at = NOON - 2 * HOUR): PlantQ => ({ at, span: 1, area: [0.8, 0.9, 0.56, 1], nar: [0, 0, 0] });
/** A plant of mine, growing (a pumpkin takes 144 hours), that no pest comes to, with a round so far. */
const plant = (over: Partial<Plant> = {}): Plant => ({ by: "me", crop: "pumpkin", sown: NOON - 20 * HOUR, boost: 0, watered: NOON - 3 * HOUR, fed: NOON - 10 * HOUR, guard: NOON + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0, q: Q(), ...over });
const ripe = (crop: CropId, over: Partial<Plant> = {}): Plant => plant({ crop, sown: NOON - (CROPS[crop].hours + 1) * HOUR, ...over });
const sown = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: plant(over) });
const MINE: Bed = { by: "me", tended: NOON - HOUR, empty: 0 };
/** My bed: a pumpkin at (1,1), a tomato at (3,1), tilled empty ground at (2,1) and (5,5), weeds elsewhere. */
const bed = (): Record<string, Plot> => ({ [k(1, 1)]: sown(), [k(3, 1)]: sown({ crop: "tomato", sown: NOON - 10 * HOUR }), [k(2, 1)]: { soil: "tilled", plant: null }, [k(5, 5)]: { soil: "tilled", plant: null } });
const done = <T extends { ok: boolean }>(d: T) => { if (!d.ok) throw new Error(`refused: ${JSON.stringify(d)}`); return d as Extract<T, { ok: true }>; };

describe("the enchanted hoe moves a plant of mine within its bed", () => {
  const worn = purseWith(HOE);

  it("offers the tilled empty plots of the bed and my other plants it may change places with, the charm worn, in my own bed", () => {
    expect(USES.charmHoe).toEqual({ n: 10, per: "day" });
    expect(moveTargets(k(1, 1), bed(), worn, "me", NOON, "me")).toEqual([k(2, 1), k(3, 1), k(5, 5)]);
    // (no hoe need be held: the charm is the hoe; but it has to be worn, the bed has to be mine, and the plant)
    expect(moveTargets(k(1, 1), bed(), purseWith({ had: ["charmHoe"], charms: [] }), "me", NOON, "me")).toEqual([]);
    expect(moveTargets(k(1, 1), bed(), worn, "me", NOON, "you")).toEqual([]);
    expect(moveTargets(k(1, 1), bed(), worn, "me", NOON, null)).toEqual([]);
    expect(moveTargets(k(1, 1), { ...bed(), [k(1, 1)]: sown({ by: "you" }) }, worn, "me", NOON, "me")).toEqual([]);
    expect(moveTargets(k(2, 1), bed(), worn, "me", NOON, "me")).toEqual([]);
  });

  it("is not offered for a plant that is ripe, dead, a giant or over more plots than one, nor onto such a plant, somebody else's, ground not tilled, or an insect house", () => {
    const plots: Record<string, Plot> = {
      ...bed(),
      [k(0, 0)]: { soil: "tilled", plant: ripe("tomato") },
      [k(1, 0)]: { soil: "tilled", plant: plant({ guard: 0, sown: NOON - 60 * HOUR }) },
      [k(2, 0)]: { soil: "tilled", plant: plant({ giant: true, root: k(2, 0), footprint: [k(2, 0), k(3, 0), k(2, 1), k(3, 1)] }) },
      [k(4, 0)]: { soil: "tilled", plant: plant({ crop: "blueCorn", root: k(4, 0), footprint: [k(4, 0), k(5, 0)] }) },
      [k(0, 2)]: { soil: "tilled", plant: plant({ by: "you" }) },
      [k(1, 2)]: { soil: "cleared", plant: null },
      [k(2, 2)]: { soil: "house", plant: null, house: { by: "me", set: NOON, rooms: [null, null] } as unknown as Plot["house"] },
      // (a helper sown on one plot keeps a root and a footprint of that plot: it moves)
      [k(3, 2)]: { soil: "tilled", plant: plant({ crop: "marigold", root: k(3, 2), footprint: [k(3, 2)] }) },
    };
    // (the plant at (1,0) has had a pest since the morning and died of it, unguarded: see's word)
    const dead = see(k(1, 0), plots[k(1, 0)], NOON);
    expect(movable(k(0, 0), plots[k(0, 0)], "me", NOON)).toBe(false);
    expect(movable(k(2, 0), plots[k(2, 0)], "me", NOON)).toBe(false);
    expect(movable(k(4, 0), plots[k(4, 0)], "me", NOON)).toBe(false);
    expect(movable(k(0, 2), plots[k(0, 2)], "me", NOON)).toBe(false);
    expect(movable(k(3, 2), plots[k(3, 2)], "me", NOON)).toBe(true);
    const t = moveTargets(k(1, 1), plots, worn, "me", NOON, "me");
    for (const no of [k(0, 0), k(2, 0), k(4, 0), k(0, 2), k(1, 2), k(2, 2)]) expect(t, no).not.toContain(no);
    expect(t).toContain(k(3, 2));
    expect(t.includes(k(1, 0))).toBe(!dead.dead && !dead.ripe);
    expect(moveTargets(k(0, 0), plots, worn, "me", NOON, "me")).toEqual([]);
  });

  it("moves it onto an empty plot keeping everything, remembers where it was sown, and counts one of the day's ten", () => {
    const plots = bed(), was = plots[k(1, 1)].plant!;
    const did = done(movePlant(k(1, 1), k(5, 5), plots, worn, "me", NOON, "me"));
    expect(did.swap).toBe(false);
    expect(did.left).toBe(9);
    expect(usesLeft(did.purse, "charmHoe", NOON)).toBe(9);
    expect(staminaOf(did.purse)).toBe(staminaOf(worn));
    expect(did.plots[k(1, 1)]).toEqual({ soil: "tilled", plant: null });
    const moved = did.plots[k(5, 5)].plant!;
    const { q, home, ...rest } = moved;
    expect(rest).toEqual((({ q: _q, ...r }) => r)(was));
    expect(home).toBe(k(1, 1));
    // (its round settled to the moment, under what the bed gave it where it stood)
    expect(q).toEqual(settled(was, NOON));
    expect(Object.keys(did.plots).sort()).toEqual([k(1, 1), k(5, 5)].sort());
  });

  it("changes places with another plant of mine, each keeping its own, for one move", () => {
    const plots = bed(), p = plots[k(1, 1)].plant!, q = plots[k(3, 1)].plant!;
    const did = done(movePlant(k(1, 1), k(3, 1), plots, worn, "me", NOON, "me"));
    expect(did.swap).toBe(true);
    expect(usesLeft(did.purse, "charmHoe", NOON)).toBe(9);
    expect(did.plots[k(3, 1)].plant).toMatchObject({ crop: p.crop, sown: p.sown, home: k(1, 1) });
    expect(did.plots[k(1, 1)].plant).toMatchObject({ crop: q.crop, sown: q.sown, home: k(3, 1) });
    // (moved back, it remembers the plot it was sown at, not the last it stood on)
    const back = done(movePlant(k(3, 1), k(5, 5), { ...plots, ...did.plots }, did.purse, "me", NOON + 1000, "me"));
    expect(back.plots[k(5, 5)].plant!.home).toBe(k(1, 1));
  });

  it("is refused without the charm worn, the day's ten used, in a bed or of a plant not mine, and where a plant may not go", () => {
    const plots = bed(), why = (d: ReturnType<typeof movePlant>) => (d.ok ? "ok" : d.why);
    expect(why(movePlant(k(1, 1), k(5, 5), plots, purseWith({ had: ["charmHoe"], charms: [] }), "me", NOON, "me"))).toBe("none");
    expect(why(movePlant(k(1, 1), k(5, 5), plots, purseWith(undefined), "me", NOON, "me"))).toBe("none");
    expect(why(movePlant(k(1, 1), k(5, 5), plots, worn, "me", NOON, "you"))).toBe("theirs");
    expect(why(movePlant(k(1, 1), k(5, 5), { ...plots, [k(1, 1)]: sown({ by: "you" }) }, worn, "me", NOON, "me"))).toBe("theirs");
    expect(why(movePlant(k(1, 1), k(3, 1), { ...plots, [k(3, 1)]: sown({ by: "you" }) }, worn, "me", NOON, "me"))).toBe("theirs");
    expect(why(movePlant(k(1, 1), `${OX + 1},${OY + 1}`, plots, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(1, 1), plots, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(6, 6), plots, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(5, 5), { ...plots, [k(5, 5)]: { soil: "cleared", plant: null } }, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(5, 5), { ...plots, [k(1, 1)]: { soil: "tilled", plant: ripe("tomato") } }, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(3, 1), { ...plots, [k(3, 1)]: { soil: "tilled", plant: ripe("tomato") } }, worn, "me", NOON, "me"))).toBe("soil");
    expect(why(movePlant(k(1, 1), k(5, 5), { ...plots, [k(1, 1)]: sown({ giant: true, root: k(1, 1), footprint: [k(1, 1), k(2, 1), k(1, 2), k(2, 2)] }) }, worn, "me", NOON, "me"))).toBe("soil");
    // ten a day: the eleventh is refused, and tomorrow there are ten again
    let p = worn, state = plots, from = k(1, 1);
    for (let i = 0; i < 10; i++) { const to = from === k(1, 1) ? k(5, 5) : k(1, 1), d = done(movePlant(from, to, state, p, "me", NOON + i, "me")); p = d.purse; state = { ...state, ...d.plots }; from = to; }
    expect(why(movePlant(from, k(2, 1), state, p, "me", NOON + 20, "me"))).toBe("spent");
    expect(moveTargets(from, state, p, "me", NOON + 20, "me")).toEqual([]);
    expect(why(movePlant(from, k(2, 1), state, p, "me", NOON + 24 * HOUR, "me"))).toBe("ok");
  });

  it("rolls nothing again: its yield, its pests and its fruits are those of the plot it was sown at", () => {
    const plots = bed(), was = plots[k(1, 1)].plant!, moved = done(movePlant(k(1, 1), k(5, 5), plots, worn, "me", NOON, "me")).plots[k(5, 5)].plant!;
    expect(homeOf(k(5, 5), moved)).toBe(k(1, 1));
    for (let picked = 0; picked < 3; picked++) expect(yieldOf(k(5, 5), { ...moved, picked })).toBe(yieldOf(k(1, 1), { ...was, picked }));
    // (pests over a week, unguarded: struck at the same hour as it would have been where it was sown)
    const bare = { ...moved, guard: 0 }, home = { ...was, guard: 0 };
    let some = 0;
    for (let d = 0; d < 7; d++) { const t = NOON + d * 24 * HOUR; expect(pestAt(k(5, 5), bare, t)).toBe(pestAt(k(1, 1), home, t)); if (pestAt(k(1, 1), home, t) !== null) some++; }
    expect(some).toBeGreaterThan(0);
    expect(harvestOf(k(5, 5), moved, 6, NOON).values).toEqual(harvestOf(k(1, 1), { ...was, q: moved.q }, 6, NOON).values);
  });

  it("is a change of the bed for both plots: every plant's gift is what the same layout sown afresh would give, and each plant of one sowing keeps its own round", () => {
    // a bed with helpers and two tomatoes sown at one moment (the seed pouch's), whose rounds differ
    const twin = NOON - 30 * HOUR, plots: Record<string, Plot> = {
      [k(1, 1)]: sown({ crop: "tomato", sown: twin, q: Q() }), [k(4, 4)]: sown({ crop: "tomato", sown: twin, q: { ...Q(), area: [0.1, 0.2, 0.1, 0.4] } }),
      [k(2, 1)]: sown({ crop: "marigold", root: k(2, 1), footprint: [k(2, 1)], q: undefined }), [k(4, 5)]: sown({ crop: "basil", q: Q() }),
      [k(0, 0)]: { soil: "tilled", plant: null },
    };
    const keep = syncQuality({}, plots, NOON - HOUR);
    const did = done(movePlant(k(1, 1), k(4, 4), keep, worn, "me", NOON, "me")), after = syncMove(keep, did.plots, NOON);
    for (const [key, plot] of Object.entries(after)) if (plot.plant) expect(plot.plant.q?.bed, key).toEqual(bedGift(key, after));
    // (the tomato now at (4,4) is the one sown at (1,1): its round is its own, settled, not its twin's)
    expect({ ...after[k(4, 4)].plant!.q, bed: undefined }).toEqual({ ...settled(keep[k(1, 1)].plant!, NOON), bed: undefined });
    expect({ ...after[k(1, 1)].plant!.q, bed: undefined }).toEqual({ ...settled(keep[k(4, 4)].plant!, NOON), bed: undefined });
    expect(rangeOfQ(after[k(4, 4)].plant!.q!)).not.toEqual(rangeOfQ(after[k(1, 1)].plant!.q!));
  });
});

describe("the mandrake sprout: every fruit of my own plants at the top of its range", () => {
  const me = purseWith(MANDRAKE), none = purseWith(undefined);
  const corn = (over: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: ripe("corn", over) });

  it("while it follows: a hand's picking of my own plant is every fruit at the range's top, the range itself as it was", () => {
    const did = done(pick(k(1, 1), me, corn(), true, null, NOON, [], "me")), plain = done(pick(k(1, 1), none, corn(), true, null, NOON, [], "me"));
    expect(did.fruits!.range).toEqual(plain.fruits!.range);
    expect(did.fruits!.range).toEqual({ lo: 51, hi: 81 });
    expect(did.fruits!.values.every((v) => v === 81)).toBe(true);
    expect(did.fruits!.values.length).toBe(plain.fruits!.values.length);
    expect(plain.fruits!.values.some((v) => v < 81)).toBe(true);
    expect(held(did.purse.bag, "corn", gradeOf(81))).toBe(did.got![0][1]);
    expect(GRADES[gradeOf(81)].en).toBe("★★ Gold");
    // (rolled as ever without it, for somebody else's plant, and of a pick that names nobody)
    expect(done(pick(k(1, 1), me, corn({ by: "you" }), true, null, NOON, [], "me")).fruits).toEqual(plain.fruits);
    expect(done(pick(k(1, 1), purseWith({ had: ["famMandrake"], charms: [] }), corn(), true, null, NOON, [], "me")).fruits).toEqual(plain.fruits);
    expect(done(pick(k(1, 1), me, corn(), true, null, NOON)).fruits).toEqual(plain.fruits);
    expect(atTop(me, corn().plant, "me") && !atTop(me, corn({ by: "you" }).plant, "me") && !atTop(none, corn().plant, "me")).toBe(true);
  });

  it("sings no more: a last picking leaves the plot bare and counts nothing; a plant it sang to before bears its once more", () => {
    const did = done(pick(k(1, 1), me, corn(), true, null, NOON, [], "me"));
    expect(did.plot).toEqual({ soil: "cleared", plant: null });
    expect(did.purse.gifts).toEqual(me.gifts);
    expect(USES.famMandrake).toBeUndefined();
    const sung = done(pick(k(1, 1), me, { soil: "tilled", plant: ripe("pumpkin", { picked: 1, pickedAt: NOON - 80 * HOUR, more: 1 }) }, true, null, NOON, [], "me"));
    expect(sung.plot).toEqual({ soil: "cleared", plant: null });
    const waits = done(pick(k(1, 1), me, corn({ more: 1 }), true, null, NOON, [], "me"));
    expect(waits.plot.plant).toMatchObject({ picked: 1, more: 1 });
  });

  it("by every way of picking: the farm's own deed, a giant, the sickle's row and its one more, the garden twine's fruit", () => {
    const byDeed = done(tend(k(1, 1), corn(), MINE, 0, 0, me, "me", NOON));
    expect(byDeed.deed).toBe("pick");
    expect(held(byDeed.purse.bag, "corn", gradeOf(81))).toBe(byDeed.got[0][1]);
    // a giant (picked at its root, six plots' worth)
    const giant = ripe("pumpkin", { giant: true, root: k(1, 1), footprint: [k(1, 1), k(2, 1), k(1, 2), k(2, 2)] });
    const big = done(pick(k(1, 1), me, { soil: "tilled", plant: giant }, true, null, NOON, [], "me"));
    expect(big.fruits!.values.length).toBeGreaterThanOrEqual(6);
    expect(big.fruits!.values.every((v) => v === 81)).toBe(true);
    // the crescent sickle's sweep along a row of mine: every fruit, the one more of a plant cut well among them
    const keys = rowOf(BX + 3, BY + 3).map(([x, y]) => `${x},${y}`), row = Object.fromEntries(keys.map((key) => [key, corn()]));
    const both = purseWith({ had: ["famMandrake", "charmSickle"], charms: ["charmSickle"], familiar: "famMandrake" });
    const swept = done(rowTend(keys[3], keys, row, MINE, 0, 0, both, "me", NOON, Object.fromEntries(keys.map((key) => [key, true]))));
    const total = swept.got.find(([id]) => id === "corn")![1];
    expect(total).toBe(keys.reduce((t, key) => t + yieldOf(key, row[key].plant!) + 1, 0));
    expect(held(swept.purse.bag, "corn", gradeOf(81))).toBe(total);
    expect(held(swept.purse.bag, "corn")).toBe(total);
    // the garden twine's fruit, of a root plant of mine
    const root = ripe("corn", { root: k(1, 1), footprint: [k(1, 1)] }), plots = { [k(1, 1)]: { soil: "tilled", plant: root } as Plot };
    const twined = purseWith(MANDRAKE, ["gardenTwine", 1]), base = done(pick(k(1, 1), twined, plots[k(1, 1)], true, null, NOON, [], "me"));
    const g = gardenHarvest(k(1, 1), plots, twined, { purse: base.purse, plot: base.plot, got: base.got! }, "me", NOON, []) as { purse?: Purse };
    expect(held(g.purse!.bag, "corn", gradeOf(81))).toBe(base.got![0][1] + 1);
    // (the twine without the mandrake rolls its fruit as ever)
    const plainTwine = purseWith(undefined, ["gardenTwine", 1]), b2 = done(pick(k(1, 1), plainTwine, plots[k(1, 1)], true, null, NOON, [], "me"));
    const g2 = gardenHarvest(k(1, 1), plots, plainTwine, { purse: b2.purse, plot: b2.plot, got: b2.got! }, "me", NOON, []) as { purse?: Purse };
    expect(held(g2.purse!.bag, "corn")).toBe(b2.got![0][1] + 1);
    expect(held(g2.purse!.bag, "corn", gradeOf(81))).toBeLessThan(b2.got![0][1] + 1);
    expect(FARMING.costs.pick).toBe(1);
  });
});

const staminaOf = (p: Purse) => p.stamina;
