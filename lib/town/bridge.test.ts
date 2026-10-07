import { describe, expect, it } from "vitest";
import { BRIDGE, OFFER, bridgeSpans, bridgeWhole, carryPace, carrying, counted, drop, give, lay, lift, nearTile, newWorks, pass, spansOf, takers, toFoot, told, wants, workOf, worksOf, type Carried, type Hand, type Work, type WorksKept } from "./bridge";
import { CART } from "./cart";
import { catalogOf } from "./catalog";
import { ITEMS } from "./items";
import { countsOf } from "./line-points";
import { LINES } from "./lines";
import { STAMINA, staminaOf } from "./stamina";
import { hold, newPurse, put, type Purse } from "./trade";
import { SHOP, fishFrom, placeOf, walkable } from "./world";

const NOW = Date.parse("2026-10-08T09:00:00+07:00");
const PILE: [number, number] = [BRIDGE.pile.x, BRIDGE.pile.y - 1], FOOT: [number, number] = [BRIDGE.foot.x + 1, BRIDGE.foot.y];
const open = (have = 0, need: number | null = BRIDGE.need): Work => ({ open: true, needs: { stone: { need, have } } });
const stone = (...hands: string[]): Carried => ({ work: "bridge", thing: "stone", hands });
const tired = (p: Purse): Purse => ({ ...p, stamina: { day: Math.floor((NOW + 2 * 3_600_000) / 86_400_000), left: 0 } });
const withRod = (): Purse => { const p = newPurse(), d = hold({ ...p, bag: put(p.bag, "rod", 1) }, 0); if (!d.ok) throw new Error("nothing to hold"); return d.purse; };

describe("the bridge built by hand (the owner, 2026-10-08: \"สะพานจากมือชาวบ้าน\")", () => {
  it("takes six hundred stones, six spans of a hundred, and costs one stamina to lift and one to lay", () => {
    expect(BRIDGE.need).toBe(600);
    expect(BRIDGE.spans).toBe(6);
    expect(BRIDGE.costs).toEqual({ lift: 1, lay: 1 });
    expect(BRIDGE.reach).toBe(6);
    expect(BRIDGE.hands).toBe(8);
    // the catalog's row is these numbers, and the tiles as the database reads them
    expect(catalogOf().bridge).toEqual({ work: "bridge", thing: "stone", need: 600, spans: 6, costs: { lift: 1, lay: 1 }, reach: 6, near: 2, paces: { held: 0.5, spent: 0.25 }, hands: 8, point: 1, pile: [BRIDGE.pile.x, BRIDGE.pile.y], foot: [BRIDGE.foot.x, BRIDGE.foot.y] });
  });

  it("is no thing of the bag: a stone is nowhere among the things, and nothing new can be sold", () => {
    expect("stone" in ITEMS).toBe(false);
  });

  it("stands its pile by the uncle's shop, where it stops nobody, and its foot on the town's own bank", () => {
    // by the shop: within three tiles of its plot
    expect(Math.max(BRIDGE.pile.x - (SHOP.x + SHOP.w - 1), SHOP.x - BRIDGE.pile.x, BRIDGE.pile.y - (SHOP.y + SHOP.h - 1), SHOP.y - BRIDGE.pile.y)).toBeLessThanOrEqual(3);
    // the pile changes nothing of where one may walk: its own tile is open, like every tile about it that was
    expect(walkable(BRIDGE.pile.x, BRIDGE.pile.y)).toBe(true);
    expect(placeOf(BRIDGE.pile.x, BRIDGE.pile.y)).toBe("town");
    expect(walkable(BRIDGE.foot.x, BRIDGE.foot.y)).toBe(true);
    expect(placeOf(BRIDGE.foot.x, BRIDGE.foot.y)).toBe("town");
    // the foot is on the bank: the river's edge is within reach of it, and one may stand all about it
    let bank = false, about = 0;
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) if (fishFrom(BRIDGE.foot.x + dx, BRIDGE.foot.y + dy)) bank = true;
    for (let dx = -BRIDGE.near; dx <= BRIDGE.near; dx++) for (let dy = -BRIDGE.near; dy <= BRIDGE.near; dy++) if (walkable(BRIDGE.foot.x + dx, BRIDGE.foot.y + dy)) about++;
    expect(bank).toBe(true);
    expect(about).toBeGreaterThanOrEqual(12);
    // and it is a long way: more than a few hands, which is why a row is worth standing in
    expect(toFoot({ x: BRIDGE.pile.x + 0.5, y: BRIDGE.pile.y + 0.5 })).toBeGreaterThan(BRIDGE.reach * 4);
  });

  it("is closed until its owner opens it: every deed answers closed, and a page is told nothing of it", () => {
    const shut: Work = { open: false, needs: { stone: { need: 600, have: 0 } } }, p = newPurse();
    expect(lift(p, null, shut, PILE, "a", NOW)).toEqual({ ok: false, why: "closed" });
    expect(lift(p, null, null, PILE, "a", NOW)).toEqual({ ok: false, why: "closed" });
    expect(pass(stone("a"), "b", p, null, shut)).toEqual({ ok: false, why: "closed" });
    expect(lay(p, stone("a"), shut, FOOT, NOW)).toEqual({ ok: false, why: "closed" });
    expect(give(p, shut, "stone", 1)).toEqual({ ok: false, why: "closed" });
    expect(drop(stone("a"), shut)).toEqual({ ok: false, why: "closed" });
    // (open: a stone is let go of anywhere, and nothing comes back; with none there is nothing to let go of)
    expect(drop(stone("a"), open())).toEqual({ ok: true });
    expect(drop(null, open())).toEqual({ ok: false, why: "none" });
    const kept = newWorks(), page = told({ ...kept, carried: { a: stone("a") } }, "a", (id) => id);
    expect(page).toEqual({ works: { bridge: { open: false, done: null, needs: {}, helpers: [], mine: {} } }, carried: null });
    expect(bridgeSpans(page)).toBe(0);
    expect(bridgeWhole(page)).toBe(false);
    expect(bridgeSpans(null)).toBe(0);
    expect(bridgeWhole(null)).toBe(false);
  });

  it("lifts a stone at the pile with empty hands, for one stamina", () => {
    const p = newPurse(), did = lift(p, null, open(), PILE, "a", NOW);
    expect(did.ok && did.carried).toEqual(stone("a"));
    expect(did.ok && staminaOf(did.purse, NOW)).toBe(STAMINA.max - 1);
    // nothing else of the purse moves: no coin, nothing in the bag
    expect(did.ok && { ...did.purse, stamina: p.stamina }).toEqual(p);
    expect(lift(p, null, open(), [BRIDGE.pile.x, BRIDGE.pile.y], "a", NOW).ok).toBe(true);
    expect(lift(p, null, open(), [BRIDGE.pile.x + BRIDGE.near, BRIDGE.pile.y - BRIDGE.near], "a", NOW).ok).toBe(true);
    expect(lift(p, null, open(), [BRIDGE.pile.x + BRIDGE.near + 1, BRIDGE.pile.y], "a", NOW)).toEqual({ ok: false, why: "far" });
    expect(lift(p, null, open(), null, "a", NOW)).toEqual({ ok: false, why: "far" });
    expect(lift(p, null, open(), FOOT, "a", NOW)).toEqual({ ok: false, why: "far" });
    expect(lift(p, stone("a"), open(), PILE, "a", NOW)).toEqual({ ok: false, why: "held" });
    expect(lift(withRod(), null, open(), PILE, "a", NOW)).toEqual({ ok: false, why: "hand" });
    // a thing in the bag that is not in the hand is in nobody's way
    expect(lift({ ...p, bag: put(p.bag, "rod", 1) }, null, open(), PILE, "a", NOW).ok).toBe(true);
  });

  it("refuses nobody for having no stamina: lifted and laid all the same, at none", () => {
    const p = tired(newPurse()), up = lift(p, null, open(), PILE, "a", NOW);
    expect(up.ok && staminaOf(up.purse, NOW)).toBe(0);
    const down = lay(p, stone("a"), open(), FOOT, NOW);
    expect(down.ok && staminaOf(down.purse, NOW)).toBe(0);
    expect(down.ok && down.have).toBe(1);
  });

  it("slows whoever holds one to half the pace, and to a quarter with no stamina: the cart's own half", () => {
    expect(carryPace("", false)).toBe(1);
    expect(carryPace(null, true)).toBe(1);
    expect(carryPace(undefined, undefined)).toBe(1);
    expect(carryPace("stone", false)).toBe(0.5);
    expect(carryPace("stone", undefined)).toBe(0.5);
    expect(carryPace("stone", true)).toBe(0.25);
    expect(BRIDGE.paces.held).toBe(CART.alone);
  });

  it("hands a stone on for nothing, to empty hands only, and keeps whose hands it came by: the last eight, each once", () => {
    const p = newPurse();
    expect(pass(stone("a"), "b", p, null, open())).toEqual({ ok: true, carried: stone("a", "b") });
    expect(pass(stone("a", "b"), "c", p, null, open())).toEqual({ ok: true, carried: stone("a", "b", "c") });
    // back to somebody it came by: they are its last hand, once
    expect(pass(stone("a", "b", "c"), "a", p, null, open())).toEqual({ ok: true, carried: stone("b", "c", "a") });
    const nine = pass(stone("a", "b", "c", "d", "e", "f", "g", "h"), "i", p, null, open());
    expect(nine.ok && nine.carried.hands).toEqual(["b", "c", "d", "e", "f", "g", "h", "i"]);
    expect(pass(null, "b", p, null, open())).toEqual({ ok: false, why: "none" });
    expect(pass(stone("a"), "b", p, stone("b"), open())).toEqual({ ok: false, why: "held" });
    expect(pass(stone("a"), "b", withRod(), null, open())).toEqual({ ok: false, why: "hand" });
    // a work that is whole still lets a stone on its way be handed about: only lifting and laying stop
    expect(pass(stone("a"), "b", p, null, open(600)).ok).toBe(true);
  });

  it("lays a stone at the foot for one stamina: one more, and everybody it came by is told", () => {
    const p = newPurse(), did = lay(p, stone("a", "b", "c"), open(41), FOOT, NOW);
    expect(did).toMatchObject({ ok: true, have: 42, hands: ["a", "b", "c"], spans: 0, span: false, whole: false });
    expect(did.ok && staminaOf(did.purse, NOW)).toBe(STAMINA.max - 1);
    expect(lay(p, null, open(), FOOT, NOW)).toEqual({ ok: false, why: "none" });
    expect(lay(p, stone("a"), open(), PILE, NOW)).toEqual({ ok: false, why: "far" });
    expect(lay(p, stone("a"), open(), null, NOW)).toEqual({ ok: false, why: "far" });
    expect(lay(p, stone("a"), open(), [BRIDGE.foot.x - BRIDGE.near, BRIDGE.foot.y + BRIDGE.near], NOW).ok).toBe(true);
    expect(lay(p, stone("a"), open(), [BRIDGE.foot.x, BRIDGE.foot.y + BRIDGE.near + 1], NOW)).toEqual({ ok: false, why: "far" });
  });

  it("shows a span more at each hundredth stone, and is whole at the six-hundredth: then nothing more is lifted or laid", () => {
    const p = newPurse();
    expect([0, 99, 100, 199, 200, 300, 400, 500, 599, 600, 700].map((n) => spansOf(n, 600))).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 5, 6, 6]);
    expect(spansOf(50, null)).toBe(0);
    expect(lay(p, stone("a"), open(99), FOOT, NOW)).toMatchObject({ ok: true, have: 100, spans: 1, span: true, whole: false });
    expect(lay(p, stone("a"), open(100), FOOT, NOW)).toMatchObject({ ok: true, have: 101, spans: 1, span: false, whole: false });
    expect(lay(p, stone("a"), open(599), FOOT, NOW)).toMatchObject({ ok: true, have: 600, spans: 6, span: true, whole: true });
    expect(lay(p, stone("a"), open(600), FOOT, NOW)).toEqual({ ok: false, why: "whole" });
    expect(lift(p, null, open(600), PILE, "a", NOW)).toEqual({ ok: false, why: "whole" });
    expect(wants(open(599), "stone")).toBe(true);
    expect(wants(open(600), "stone")).toBe(false);
    expect(wants(open(5000, null), "stone")).toBe(true);
    expect(wants(open(), "wood")).toBe(false);
  });

  it("counts a stone laid to everybody whose hands it went through, and tells a page the names in the order they came, with no numbers", () => {
    let kept: WorksKept = { ...newWorks() };
    kept = { ...kept, works: { bridge: { ...kept.works.bridge, opened: NOW } } };
    kept = counted(kept, "bridge", "stone", ["c", "a"], 1, 1, NOW + 1000);
    kept = counted(kept, "bridge", "stone", ["b", "a"], 1, 1, NOW + 2000);
    kept = counted(kept, "bridge", "stone", ["a"], 1, 1, NOW + 3000);
    expect(kept.works.bridge.needs.stone).toEqual({ need: 600, have: 3 });
    expect(kept.works.bridge.hands.a.stone).toEqual({ n: 3, first: NOW + 1000 });
    expect(kept.works.bridge.done).toBe(null);
    const name = (id: string) => id.toUpperCase();
    const page = told({ ...kept, carried: { b: stone("a", "b") } }, "b", name);
    // those who came at the same moment by their ids; then who came after
    expect(page.works.bridge.helpers).toEqual([{ id: "a", name: "A" }, { id: "c", name: "C" }, { id: "b", name: "B" }]);
    expect(JSON.stringify(page.works.bridge.helpers)).not.toMatch(/\d/);
    // my own count is told to me, and nobody else's to anybody
    expect(page.works.bridge.mine).toEqual({ stone: 1 });
    expect(told(kept, "a", name).works.bridge.mine).toEqual({ stone: 3 });
    expect(told(kept, "z", name).works.bridge.mine).toEqual({});
    expect(page.carried).toEqual({ work: "bridge", thing: "stone" });
    expect(carrying(page)).toBe("stone");
    expect(carrying(told(kept, "a", name))).toBe(null);
    // and what the map is given: the spans laid, and whether it is whole
    expect(bridgeSpans(page)).toBe(0);
    const whole = told(counted({ ...kept, works: { bridge: { ...kept.works.bridge, needs: { stone: { need: 600, have: 599 } } } } }, "bridge", "stone", ["a"], 1, 1, NOW + 9000), "a", name);
    expect(bridgeSpans(whole)).toBe(6);
    expect(bridgeWhole(whole)).toBe(true);
    expect(whole.works.bridge.done).toBe(NOW + 9000);
    // the names stay when it is whole
    expect(whole.works.bridge.helpers.length).toBe(3);
    const half = told({ ...kept, works: { bridge: { ...kept.works.bridge, needs: { stone: { need: 600, have: 345 } } } } }, "a", name);
    expect(bridgeSpans(half)).toBe(3);
    expect(bridgeWhole(half)).toBe(false);
  });

  it("makes what a keeper was told sound, and null of what is no telling", () => {
    expect(worksOf(null)).toBe(null);
    expect(worksOf({})).toBe(null);
    expect(worksOf({ works: [] })).toBe(null);
    const page = worksOf({ works: { bridge: { open: true, done: null, needs: { stone: { need: 600, have: "12" } }, helpers: [{ id: "a", name: "A" }, { id: 3 }, null], mine: { stone: 2, wood: "x" } }, pile: { open: false, needs: { stone: { need: 5, have: 5 } } } }, carried: { work: "bridge", thing: "stone", hands: ["a"] } });
    expect(page).toEqual({ works: { bridge: { open: true, done: null, needs: { stone: { need: 600, have: 12 } }, helpers: [{ id: "a", name: "A" }], mine: { stone: 2 } }, pile: { open: false, done: null, needs: {}, helpers: [], mine: {} } }, carried: { work: "bridge", thing: "stone" } });
    const kept = { ...newWorks() };
    expect(worksOf(JSON.parse(JSON.stringify(told({ ...kept, works: { bridge: { ...kept.works.bridge, opened: NOW } } }, "a", (id) => id))))).toEqual(told({ ...kept, works: { bridge: { ...kept.works.bridge, opened: NOW } } }, "a", (id) => id));
    expect(workOf(kept, "bridge")).toEqual({ open: false, needs: { stone: { need: 600, have: 0 } } });
    expect(workOf(kept, "tower")).toBe(null);
  });

  it("gives a helpers' point to everybody a laid stone came by, and nothing for lifting, handing on or letting go", () => {
    for (const what of ["stone_lay", "stone_hand"]) expect(countsOf({ from: "deed", what, thing: "stone", n: 1, doc: {} }, "a")).toEqual([{ to: null, line: "helpers", raw: BRIDGE.point }]);
    for (const what of ["stone_lift", "stone_pass", "stone_drop", "work_give"]) expect(countsOf({ from: "deed", what, thing: "stone", n: 1, doc: {} }, "a")).toEqual([]);
    // (the helpers' day counts two hundred in full: the bound that is theirs)
    expect(LINES.helpers.day).toBe(200);
  });
});

describe("the village's works: giving out of the bag", () => {
  const bag = (n: number): Purse => { const p = newPurse(); return { ...p, bag: put(p.bag, "kangkong", n) }; };
  it("takes what is given, and refuses only what would pass what it needs", () => {
    const work: Work = { open: true, needs: { kangkong: { need: 10, have: 7 } } };
    const did = give(bag(5), work, "kangkong", 3);
    expect(did).toMatchObject({ ok: true, have: 10 });
    expect(did.ok && did.purse.bag.filter(Boolean)).toEqual([{ item: "kangkong", n: 2 }]);
    expect(give(bag(5), work, "kangkong", 4)).toEqual({ ok: false, why: "over" });
    expect(give(bag(2), work, "kangkong", 3)).toEqual({ ok: false, why: "short" });
    for (const n of [0, -1, 1.5, Number.NaN]) expect(give(bag(5), work, "kangkong", n)).toEqual({ ok: false, why: "none" });
    expect(give(bag(5), work, "rod", 1)).toEqual({ ok: false, why: "none" });
  });
  it("takes any amount where it needs no number, whatever it has, and never closes", () => {
    const work: Work = { open: true, needs: { kangkong: { need: null, have: 100000 } } };
    expect(give(bag(5), work, "kangkong", 5)).toMatchObject({ ok: true, have: 100005 });
    let kept: WorksKept = { works: { heap: { opened: NOW, done: null, needs: { kangkong: { need: null, have: 0 } }, hands: {} } }, carried: {} };
    kept = counted(kept, "heap", "kangkong", ["a"], 5, 5, NOW);
    kept = counted(kept, "heap", "kangkong", ["a"], 2, 2, NOW + 5);
    expect(kept.works.heap).toMatchObject({ done: null, needs: { kangkong: { need: null, have: 7 } }, hands: { a: { kangkong: { n: 7, first: NOW } } } });
  });
});

describe("whom a stone is offered to", () => {
  const me = { x: 30.5, y: 27.5 };
  const one = (id: string, x: number, y: number, more: Partial<Hand> = {}): Hand => ({ id, name: id.toUpperCase(), x, y, moving: false, hold: null, ...more });
  it("is anybody standing still with empty hands within six tiles: those nearer the foot first, three at the most", () => {
    const people = [one("me", me.x, me.y), one("back", 34.5, 27.5), one("side", 30.5, 30.5), one("fore", 26.5, 27.5), one("far", 23.5, 27.5), one("near", 28.5, 27.5)];
    const found = takers("me", me, people);
    expect(found.offered.map((p) => p.id)).toEqual(["fore", "near", "side"]);
    expect(found.lacks).toBe(null);
    expect(takers("me", me, [people[1]]).offered.map((p) => p.id)).toEqual(["back"]);
    // exactly six tiles is within reach; a little over is not
    expect(takers("me", me, [one("edge", me.x - BRIDGE.reach, me.y)]).offered.length).toBe(1);
    expect(takers("me", me, [one("over", me.x - BRIDGE.reach - 0.1, me.y)]).offered.length).toBe(0);
    expect(found.offered.length).toBe(OFFER.most);
  });
  it("offers nobody who walks, has a thing in the hand, or holds a stone; and with nobody to offer names the nearest within four tiles with what they lack", () => {
    const walking = one("w", 28.5, 27.5, { moving: true }), handful = one("h", 29.5, 27.5, { hold: "rod" }), laden = one("s", 27.5, 27.5, { carry: "stone" });
    expect(takers("me", me, [walking])).toEqual({ offered: [], lacks: { who: walking, why: "walking" } });
    expect(takers("me", me, [walking, handful, laden])).toEqual({ offered: [], lacks: { who: handful, why: "hand" } });
    expect(takers("me", me, [laden])).toEqual({ offered: [], lacks: { who: laden, why: "held" } });
    // (somebody walking with a thing in the hand lacks the thing put away first)
    expect(takers("me", me, [one("b", 29.5, 27.5, { moving: true, hold: "bucket" })]).lacks?.why).toBe("hand");
    // further than four tiles, nobody is named; and with somebody to offer, nobody is
    expect(takers("me", me, [one("w", me.x - OFFER.beside - 0.5, me.y, { moving: true })])).toEqual({ offered: [], lacks: null });
    expect(takers("me", me, [walking, one("ok", 31.5, 27.5)]).lacks).toBe(null);
    expect(takers("me", me, [])).toEqual({ offered: [], lacks: null });
  });
  it("reaches nobody on another map", () => {
    expect(nearTile([BRIDGE.pile.x, BRIDGE.pile.y], BRIDGE.pile)).toBe(true);
    expect(takers("me", me, [one("farm", 140.5, 10.5)]).offered.length).toBe(0);
  });
});
