import { describe, expect, it } from "vitest";
import {
  ARMS, BOARD_AT, LAMPS, LAMP_MAPS, OFFER, RING, alive, byTile, embers, fireOf, held, holdFor, lampsOf, leftOf, light, lighted, litOf, newLamps, nightBegins, nightEnds, nightOf,
  pass, postBy, postOf, postsOf, stepOf, take, takers, tierOf, toFire, told, type Bearer, type Flame, type LampMap, type LampsKept,
} from "./lamps";
import { countsOf } from "./line-points";
import { dayOf, staminaOf } from "./stamina";
import { newPurse, put, type Purse } from "./trade";
import { FARM, FARM_PROPS, FOREST, FOREST_PROPS, findPath, groundAt, placeOf, plotAt, walkable } from "./world";

const at = (iso: string) => Date.parse(iso);
/** Nine in the evening, Bangkok: night. And noon: day. */
const NIGHT = at("2026-10-08T21:00:00+07:00"), NOON = at("2026-10-08T12:00:00+07:00");
const purse = (now: number, left = 100, hand: "rod" | null = null): Purse => {
  const p = newPurse();
  return { ...p, bag: hand ? put(p.bag, hand, 1) : p.bag, ...(hand ? { hand } : {}), stamina: { day: dayOf(now), left } };
};
const FIRE = LAMPS.maps.farm.fire, POST = LAMPS.maps.farm.posts[0];
const flame = (until: number, hands = ["a"], from: LampMap = "farm"): Flame => ({ from, until, hands });

describe("when the lamps are lit", () => {
  it("is night from half past five in the evening until five in the morning, Bangkok, and one night across midnight", () => {
    expect(nightOf(at("2026-10-08T17:29:59+07:00"))).toBe(null);
    const night = nightOf(at("2026-10-08T17:30:00+07:00"));
    expect(night).not.toBe(null);
    expect(nightOf(at("2026-10-08T23:59:59+07:00"))).toBe(night);
    expect(nightOf(at("2026-10-09T00:00:00+07:00"))).toBe(night);
    expect(nightOf(at("2026-10-09T04:59:59+07:00"))).toBe(night);
    expect(nightOf(at("2026-10-09T05:00:00+07:00"))).toBe(null);
    expect(nightOf(NOON)).toBe(null);
    expect(nightOf(at("2026-10-09T17:30:00+07:00"))).toBe(night! + 1);
  });
  it("says when a night ends, and when the next begins", () => {
    const night = nightOf(NIGHT)!;
    expect(nightEnds(night)).toBe(at("2026-10-09T05:00:00+07:00"));
    expect(nightBegins(NOON)).toBe(at("2026-10-08T17:30:00+07:00"));
    expect(nightOf(nightEnds(night) - 1)).toBe(night);
    expect(nightOf(nightBegins(NOON))).toBe(night);
  });
});

describe("a flame taken at the fire", () => {
  it("is taken by night with empty hands from a tile by the fire, for nothing, and lives three seconds", () => {
    const p = purse(NIGHT), did = take(p, null, false, 0, "farm", [FIRE[0] + 2, FIRE[1] - 2], "a", NIGHT);
    expect(did).toEqual({ ok: true, flame: { from: "farm", until: NIGHT + 3000, hands: ["a"] } });
    expect(LAMPS.life).toBe(3);
  });
  it("is refused by day, far from the fire, at a map with no lamps, with a thing in the hand, a stone, or a live flame", () => {
    const p = purse(NIGHT);
    expect(take(purse(NOON), null, false, 0, "farm", FIRE, "a", NOON)).toEqual({ ok: false, why: "day" });
    expect(take(p, null, false, 0, "farm", [FIRE[0] + 3, FIRE[1]], "a", NIGHT)).toEqual({ ok: false, why: "far" });
    expect(take(p, null, false, 0, "farm", null, "a", NIGHT)).toEqual({ ok: false, why: "far" });
    expect(take(p, null, false, 0, "town", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "far" });
    // (the forest's fire is not the farm's)
    expect(take(p, null, false, 0, "forest", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "far" });
    expect(take(purse(NIGHT, 100, "rod"), null, false, 0, "farm", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "hand" });
    expect(take(p, null, true, 0, "farm", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "stone" });
    expect(take(p, flame(NIGHT + 1), false, 0, "farm", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "held" });
  });
  it("is taken again once the one held has gone out, and with no stamina left", () => {
    expect(take(purse(NIGHT, 0), flame(NIGHT), false, 11, "farm", FIRE, "a", NIGHT).ok).toBe(true);
  });
  it("is not given once every lamp of that map is lit", () => {
    expect(take(purse(NIGHT), null, false, 28, "farm", FIRE, "a", NIGHT)).toEqual({ ok: false, why: "whole" });
    expect(take(purse(NIGHT), null, false, 27, "farm", FIRE, "a", NIGHT).ok).toBe(true);
    expect(take(purse(NIGHT), null, false, 11, "farm", FIRE, "a", NIGHT).ok).toBe(true);
  });
});

describe("a flame handed on", () => {
  it("is fresh again in the other's hands, three seconds from that moment, for nothing", () => {
    const did = pass(flame(NIGHT + 300, ["a"]), "b", purse(NIGHT), null, false, NIGHT);
    expect(did).toEqual({ ok: true, flame: { from: "farm", until: NIGHT + 3000, hands: ["a", "b"] } });
  });
  it("still counts up to a second after the flame's time, and not after that", () => {
    expect(LAMPS.grace).toBe(1);
    expect(pass(flame(NIGHT - 1000), "b", purse(NIGHT), null, false, NIGHT).ok).toBe(true);
    expect(pass(flame(NIGHT - 1001), "b", purse(NIGHT), null, false, NIGHT)).toEqual({ ok: false, why: "out" });
  });
  it("is refused with none to hand, to somebody with a thing in the hand, a stone, or a live flame of their own", () => {
    expect(pass(null, "b", purse(NIGHT), null, false, NIGHT)).toEqual({ ok: false, why: "none" });
    expect(pass(flame(NIGHT + 1), "b", purse(NIGHT, 100, "rod"), null, false, NIGHT)).toEqual({ ok: false, why: "hand" });
    expect(pass(flame(NIGHT + 1), "b", purse(NIGHT), null, true, NIGHT)).toEqual({ ok: false, why: "stone" });
    expect(pass(flame(NIGHT + 1), "b", purse(NIGHT), flame(NIGHT + 1, ["b"]), false, NIGHT)).toEqual({ ok: false, why: "held" });
    // (theirs has gone out: their hands are empty)
    expect(pass(flame(NIGHT + 1), "b", purse(NIGHT), flame(NIGHT, ["b"]), false, NIGHT).ok).toBe(true);
  });
  it("goes with the hands it came by, the taker's last and once, the last eight remembered", () => {
    const back = pass(flame(NIGHT + 1, ["a", "b", "c"]), "a", purse(NIGHT), null, false, NIGHT);
    expect(back.ok && back.flame.hands).toEqual(["b", "c", "a"]);
    const many = pass(flame(NIGHT + 1, ["a", "b", "c", "d", "e", "f", "g", "h"]), "i", purse(NIGHT), null, false, NIGHT);
    expect(many.ok && many.flame.hands).toEqual(["b", "c", "d", "e", "f", "g", "h", "i"]);
    expect(LAMPS.hands).toBe(8);
  });
});

describe("a post lit", () => {
  it("is lit from within two tiles with a live flame: one stamina, the flame spent, everybody it came by told", () => {
    const p = purse(NIGHT, 40), did = light(p, flame(NIGHT + 1, ["a", "b"]), [3, 5], "farm", 0, [POST[0] - 2, POST[1] + 2], NIGHT);
    expect(did.ok && { hands: did.hands, n: did.n, of: did.of, full: did.full, left: staminaOf(did.purse, NIGHT) }).toEqual({ hands: ["a", "b"], n: 3, of: 28, full: false, left: 39 });
  });
  it("is refused by day, with no flame, with one gone out, far from the post, at no post, or when it is lit already", () => {
    const p = purse(NIGHT);
    expect(light(purse(NOON), flame(NOON + 1), [], "farm", 0, POST, NOON)).toEqual({ ok: false, why: "day" });
    expect(light(p, null, [], "farm", 0, POST, NIGHT)).toEqual({ ok: false, why: "none" });
    expect(light(p, flame(NIGHT - 1001), [], "farm", 0, POST, NIGHT)).toEqual({ ok: false, why: "out" });
    expect(light(p, flame(NIGHT + 1), [], "farm", 0, [POST[0] + 3, POST[1]], NIGHT)).toEqual({ ok: false, why: "far" });
    expect(light(p, flame(NIGHT + 1), [], "farm", 28, POST, NIGHT)).toEqual({ ok: false, why: "far" });
    expect(light(p, flame(NIGHT + 1), [], "farm", -1, POST, NIGHT)).toEqual({ ok: false, why: "far" });
    expect(light(p, flame(NIGHT + 1), [], "forest", 0, POST, NIGHT)).toEqual({ ok: false, why: "far" });
    expect(light(p, flame(NIGHT + 1), [], "town", 0, POST, NIGHT)).toEqual({ ok: false, why: "far" });
    expect(light(p, flame(NIGHT + 1), [0], "farm", 0, POST, NIGHT)).toEqual({ ok: false, why: "lit" });
  });
  it("has the second of grace too", () => {
    expect(light(purse(NIGHT), flame(NIGHT - 1000), [], "farm", 0, POST, NIGHT).ok).toBe(true);
  });
  it("is lit with no stamina all the same, and the flame is good for the hold's time longer in tired hands", () => {
    const tired = purse(NIGHT, 0), late = NIGHT - 1000 - LAMPS.hold * 1000;
    const did = light(tired, flame(late), [], "farm", 0, POST, NIGHT);
    expect(did.ok && staminaOf(did.purse, NIGHT)).toBe(0);
    expect(light(tired, flame(late - 1), [], "farm", 0, POST, NIGHT)).toEqual({ ok: false, why: "out" });
    // (with stamina the flame is not: a press is at once)
    expect(light(purse(NIGHT, 1), flame(late), [], "farm", 0, POST, NIGHT)).toEqual({ ok: false, why: "out" });
    expect(holdFor(true)).toBe(1.2);
    expect(holdFor(false)).toBe(0);
  });
  it("says so when it is the map's last", () => {
    const others = [...Array(27).keys()];
    const did = light(purse(NIGHT), flame(NIGHT + 1), others, "farm", 27, LAMPS.maps.farm.posts[27], NIGHT);
    expect(did.ok && [did.n, did.of, did.full]).toEqual([28, 28, true]);
    // (the twelfth, which was the last until 2026-10-09, is not)
    const twelfth = light(purse(NIGHT), flame(NIGHT + 1), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "farm", 11, LAMPS.maps.farm.posts[11], NIGHT);
    expect(twelfth.ok && [twelfth.n, twelfth.of, twelfth.full]).toEqual([12, 28, false]);
  });
  it("is three points on the helpers' line to whoever lit it and to each of the others the flame came by, and nothing else of the lamps counts", () => {
    for (const what of ["lamp_light", "lamp_hand"]) expect(countsOf({ from: "deed", what, thing: "flame", n: 1, doc: {} }, "a")).toEqual([{ to: null, line: "helpers", raw: 3 }]);
    for (const what of ["flame_take", "flame_pass"]) expect(countsOf({ from: "deed", what, thing: "flame", n: 1, doc: {} }, "a")).toEqual([]);
    expect(LAMPS.point).toBe(3);
  });
});

describe("what is kept, and what a page is told", () => {
  const night = nightOf(NIGHT)!;
  const some = (): LampsKept => {
    let k = newLamps();
    k = held(k, "b", flame(NIGHT + 5000, ["b"]));
    k = held(k, "a", flame(NIGHT + 5000, ["b", "a"]), "b");
    k = lighted(k, "a", "farm", 4, ["b", "a"], false, NIGHT + 1000);
    k = lighted(k, "c", "farm", 0, ["c"], false, NIGHT + 2000);
    k = lighted(k, "a", "forest", 2, ["a", "d"], false, NIGHT + 3000);
    return k;
  };
  it("keeps a flame in the hands it was handed into and no others, and spends it when a post is lit", () => {
    let k = held(newLamps(), "b", flame(NIGHT + 5000, ["b"]));
    k = held(k, "a", flame(NIGHT + 5000, ["b", "a"]), "b");
    expect(Object.keys(k.flames)).toEqual(["a"]);
    k = lighted(k, "a", "farm", 4, ["b", "a"], false, NIGHT + 1000);
    expect(k.flames).toEqual({});
    expect(litOf(k, "farm", night)).toEqual([4]);
    expect(litOf(k, "farm", night + 1)).toEqual([]);
    expect(litOf(k, "farm", null)).toEqual([]);
  });
  it("tells the posts lit tonight by their numbers, each with the hands its flame came by", () => {
    const t = told(some(), "a", (id) => id.toUpperCase(), NIGHT + 4000);
    expect(t.night).toBe(night);
    expect(t.maps.farm.lit).toEqual([{ post: 0, at: NIGHT + 2000, hands: [{ id: "c", name: "C" }] }, { post: 4, at: NIGHT + 1000, hands: [{ id: "b", name: "B" }, { id: "a", name: "A" }] }]);
    expect(t.maps.forest.lit.map((l) => l.post)).toEqual([2]);
  });
  it("names the night's lighters in the order they first came, each once, with no numbers", () => {
    const t = told(some(), "z", (id) => id, NIGHT + 4000);
    expect(t.maps.farm.lighters.map((h) => h.id)).toEqual(["b", "a", "c"]);
    expect(t.maps.forest.lighters.map((h) => h.id)).toEqual(["a", "d"]);
    expect(JSON.stringify(t.maps.farm.lighters)).not.toMatch(/\d/);
  });
  it("tells me my own flame while it lives, and nobody else's", () => {
    const k = held(some(), "a", flame(NIGHT + 9000, ["x", "y", "a"]));
    expect(told(k, "a", (id) => id, NIGHT + 4000).flame).toEqual({ until: NIGHT + 9000, hands: 3 });
    expect(told(k, "a", (id) => id, NIGHT + 9000).flame).toBe(null);
    expect(told(k, "b", (id) => id, NIGHT + 4000).flame).toBe(null);
  });
  it("shows no lamp lit by day, nor the night after: a lamp lit stays lit until five", () => {
    const k = some();
    expect(told(k, "a", (id) => id, nightEnds(night) - 1).maps.farm.lit.length).toBe(2);
    expect(told(k, "a", (id) => id, nightEnds(night))).toEqual({ night: null, maps: { farm: { lit: [], lighters: [], full: 0 }, forest: { lit: [], lighters: [], full: 0 } }, flame: null });
    expect(told(k, "a", (id) => id, NIGHT + 86_400_000).maps.farm.lit).toEqual([]);
  });
  it("counts the nights every lamp of a map was lit, once a night", () => {
    let k = newLamps();
    for (let i = 0; i < 12; i++) k = lighted(k, "a", "farm", i, ["a"], i === 11, NIGHT + i);
    k = lighted(k, "a", "farm", 11, ["a"], true, NIGHT + 50);
    expect(told(k, "a", (id) => id, NIGHT + 100).maps.farm.full).toBe(1);
    expect(told(k, "a", (id) => id, NIGHT + 100).maps.forest.full).toBe(0);
    // (and it is still told the day after, and the night after)
    expect(told(k, "a", (id) => id, NOON + 86_400_000).maps.farm.full).toBe(1);
    k = lighted(k, "a", "farm", 0, ["a"], true, NIGHT + 86_400_000);
    expect(told(k, "a", (id) => id, NIGHT + 86_400_000 + 1).maps.farm.full).toBe(2);
  });
  it("takes what a keeper was told and makes it sound", () => {
    const t = told(some(), "a", (id) => id, NIGHT + 4000);
    expect(lampsOf(JSON.parse(JSON.stringify(t)))).toEqual(t);
    expect(lampsOf(null)).toBe(null);
    expect(lampsOf({})).toBe(null);
    expect(lampsOf({ maps: [] })).toBe(null);
    const odd = lampsOf({ night: "x", maps: { farm: { lit: [{ post: 99 }, { post: 3, at: "7", hands: [{ id: "a" }, { name: "no id" }] }, { post: 3 }, null], lighters: "nobody", full: -2 } }, flame: { until: 0 } });
    expect(odd).toEqual({ night: null, maps: { farm: { lit: [{ post: 3, at: 7, hands: [{ id: "a", name: "" }] }], lighters: [], full: 0 }, forest: { lit: [], lighters: [], full: 0 } }, flame: null });
    expect(lampsOf({ maps: {}, flame: { until: 5 } })?.flame).toEqual({ until: 5, hands: 1 });
  });
});

describe("what is seen of a flame, and of the night", () => {
  it("shows what is left of a flame in ten embers", () => {
    expect(RING).toBe(10);
    expect(embers(3000)).toBe(10);
    expect(embers(2701)).toBe(10);
    expect(embers(2700)).toBe(9);
    expect(embers(1)).toBe(1);
    expect(embers(0)).toBe(0);
    expect(leftOf({ until: NIGHT + 1200 }, NIGHT)).toBe(1200);
    expect(leftOf({ until: NIGHT - 1 }, NIGHT)).toBe(0);
    expect(leftOf(null, NIGHT)).toBe(0);
    expect(alive(flame(NIGHT + 1), NIGHT)).toBe(true);
    expect(alive(flame(NIGHT), NIGHT)).toBe(false);
    expect(alive(null, NIGHT)).toBe(false);
  });
  it("brings more of the night out at four, at ten, and with every lamp lit", () => {
    expect([0, 3, 4, 9, 10, 27, 28].map((n) => tierOf(n, 28))).toEqual([0, 0, 1, 1, 2, 2, 3]);
    expect(tierOf(0, 0)).toBe(0);
    expect(LAMPS.more).toEqual([4, 10]);
  });
  it("lights the step to do now: take a flame, carry it or hand it on, light a dark post", () => {
    expect([stepOf(false, false), stepOf(false, true), stepOf(true, false), stepOf(true, true)]).toEqual([0, 0, 1, 2]);
  });
});

describe("whom a page offers a flame to", () => {
  const [fx, fy] = FIRE, me = { x: fx + 6.5, y: fy - 2.5 };
  const who = (id: string, dx: number, dy: number, more: Partial<Bearer> = {}): Bearer => ({ id, name: id, x: me.x + dx, y: me.y + dy, moving: false, hold: null, ...more });
  it("offers whoever stands still with empty hands within three tiles, those further from the fire first", () => {
    const { offered, lacks } = takers("me", me, [who("near", -2, 0), who("far", 2.5, 0), who("side", 0, 1), who("out", 3.5, 0), who("me", 0, 0)], "farm", NIGHT);
    expect(offered.map((p) => p.id)).toEqual(["far", "side", "near"]);
    expect(lacks).toBe(null);
    expect(LAMPS.reach).toBe(3);
  });
  it("offers three at the most", () => {
    const { offered } = takers("me", me, [who("a", 1, 0), who("b", 2, 0), who("c", 0.5, 0), who("d", 2.5, 0)], "farm", NIGHT);
    expect(offered.map((p) => p.id)).toEqual(["d", "b", "a"]);
    expect(OFFER.most).toBe(3);
  });
  it("names the nearest who lacks something, only when nobody is offered", () => {
    const lacking = [who("w", 1, 0, { moving: true }), who("h", 2, 0, { hold: "hoe" }), who("s", 3, 0, { carry: "stone" }), who("f", 3.5, 0, { flame: NIGHT + 10 })];
    expect(takers("me", me, lacking, "farm", NIGHT)).toEqual({ offered: [], lacks: { who: lacking[0], why: "walking" } });
    expect(takers("me", me, lacking.slice(1), "farm", NIGHT).lacks).toEqual({ who: lacking[1], why: "hand" });
    expect(takers("me", me, lacking.slice(2), "farm", NIGHT).lacks).toEqual({ who: lacking[2], why: "stone" });
    expect(takers("me", me, lacking.slice(3), "farm", NIGHT).lacks).toEqual({ who: lacking[3], why: "held" });
    expect(takers("me", me, [...lacking, who("ok", 0, 2)], "farm", NIGHT)).toEqual({ offered: [expect.objectContaining({ id: "ok" })], lacks: null });
    expect(takers("me", me, [who("gone", 4.5, 0, { moving: true })], "farm", NIGHT)).toEqual({ offered: [], lacks: null });
  });
  it("offers somebody whose own flame has gone out", () => {
    expect(takers("me", me, [who("was", 1, 0, { flame: NIGHT })], "farm", NIGHT).offered.map((p) => p.id)).toEqual(["was"]);
  });
  it("finds the dark post I stand by", () => {
    const posts = LAMPS.maps.farm.posts;
    expect(postBy("farm", [posts[2][0] + 1, posts[2][1] - 2], [])).toBe(2);
    expect(postBy("farm", [posts[2][0] + 1, posts[2][1] - 2], [2])).toBe(-1);
    expect(postBy("farm", [posts[2][0] + 3, posts[2][1]], [])).toBe(-1);
    expect(postBy("farm", null, [])).toBe(-1);
  });
});

describe("where the fires, the boards and the posts stand", () => {
  const propAt = new Set([...FARM_PROPS, ...FOREST_PROPS].map((p) => `${p.x},${p.y}`));
  const lengthOf = (path: Array<{ x: number; y: number }>, from: { x: number; y: number }) => { let d = 0, was = from; for (const p of path) { d += Math.hypot(p.x - was.x, p.y - was.y); was = p; } return d; };
  /** How far a post is from its map's fire as anybody walks it: from the tile by the fire nearest the post that can be stood on. */
  const walk = (map: LampMap, post: number): number => {
    const [fx, fy] = LAMPS.maps[map].fire, [px, py] = LAMPS.maps[map].posts[post];
    let best = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!walkable(fx + dx, fy + dy)) continue;
      const from = { x: fx + dx + 0.5, y: fy + dy + 0.5 }, path = findPath(from, { x: px + 0.5, y: py + 0.5 });
      if (path) best = Math.min(best, lengthOf(path, from) + Math.hypot(dx, dy));
    }
    return best;
  };
  const far = Object.fromEntries(LAMP_MAPS.map((map) => [map, LAMPS.maps[map].posts.map((_, i) => walk(map, i))])) as Record<LampMap, number[]>;

  it("has twenty-eight posts on the farm and forty in the forest, the bigger map, each on its own tile of its map, the first twelve where they were", () => {
    const HAS: Record<LampMap, number> = { farm: 28, forest: 40 };
    for (const map of LAMP_MAPS) {
      const posts = LAMPS.maps[map].posts;
      expect([map, posts.length, postsOf(map)]).toEqual([map, HAS[map], HAS[map]]);
      expect(new Set(posts.map(([x, y]) => `${x},${y}`)).size).toBe(HAS[map]);
      for (const [x, y] of posts) expect([map, x, y, placeOf(x, y)]).toEqual([map, x, y, map]);
      expect(placeOf(...LAMPS.maps[map].fire)).toBe(map);
      expect(placeOf(...BOARD_AT[map])).toBe(map);
    }
    expect(postsOf("town")).toBe(0);
    expect(fireOf("town")).toBe(null);
    expect(postOf("farm", 28)).toBe(null);
    expect([postOf("forest", 39) !== null, postOf("forest", 40)]).toEqual([true, null]);
    // (a lamp lit is kept by its post's number: the twelve of the ways are the tiles they were on the first night)
    expect(LAMPS.maps.farm.posts.slice(0, 12).map(([x, y]) => [x - FARM.x, y - FARM.y])).toEqual([[18, 23], [8, 20], [3, 23], [38, 23], [44, 20], [50, 23], [56, 20], [31, 20], [28, 10], [31, 3], [28, 31], [31, 39]]);
    expect(LAMPS.maps.forest.posts.slice(0, 12).map(([x, y]) => [x - FOREST.x, y - FOREST.y])).toEqual([[50, 56], [48, 65], [46, 70], [46, 74], [49, 36], [48, 29], [50, 20], [45, 12], [61, 46], [69, 46], [74, 38], [80, 34]]);
    expect(postOf("farm", 1.5)).toBe(null);
  });
  it("stands every post, both boards and the brazier on free ground that can be walked: nothing is closed for them, and nothing else stands there", () => {
    const tiles: Array<readonly [string, [number, number]]> = LAMP_MAPS.flatMap((map) => [...LAMPS.maps[map].posts.map((t, i) => [`${map} post ${i}`, t] as const), [`${map} board`, BOARD_AT[map]] as const]);
    tiles.push(["the farm's brazier", LAMPS.maps.farm.fire]);
    for (const [name, [x, y]] of tiles) {
      expect([name, walkable(x, y), propAt.has(`${x},${y}`), plotAt(x, y), groundAt(x, y) === "road" || groundAt(x, y) === "water"]).toEqual([name, true, false, false, false]);
    }
    // (the forest's fire is the camp's own, which was there)
    expect(FOREST_PROPS.some((p) => p.kind === "campfire" && p.x === LAMPS.maps.forest.fire[0] && p.y === LAMPS.maps.forest.fire[1])).toBe(true);
    // (no two of them on one tile)
    expect(new Set(tiles.map(([, [x, y]]) => `${x},${y}`)).size).toBe(tiles.length);
  });
  it("stands the first twelve beside a way: a lane's or a trail's tile within two of it", () => {
    for (const map of LAMP_MAPS) for (const [i, [x, y]] of LAMPS.maps[map].posts.slice(0, 12).entries()) {
      let road = false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (groundAt(x + dx, y + dy) === "road") road = true;
      expect([map, i, road]).toEqual([map, i, true]);
    }
  });
  it("stands each board by its fire, within three tiles and off the fire's own tile", () => {
    for (const map of LAMP_MAPS) {
      expect(byTile(BOARD_AT[map], LAMPS.maps[map].fire, 3)).toBe(true);
      expect(BOARD_AT[map]).not.toEqual(LAMPS.maps[map].fire);
    }
  });
  it("stands the farm's next twelve round its rim, within three tiles of its edge and off its ways, and its last four in the middle of the beds", () => {
    const edge = ([x, y]: [number, number]) => Math.min(x - FARM.x, y - FARM.y, FARM.w - 1 - (x - FARM.x), FARM.h - 1 - (y - FARM.y));
    const posts = LAMPS.maps.farm.posts;
    expect(posts.slice(12, 24).map(edge).every((e) => e >= 1 && e <= 3)).toBe(true);
    expect(posts.slice(24).map(edge)).toEqual([11, 11, 11, 11]);
    for (const [x, y] of posts.slice(12)) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) expect([x, y, groundAt(x + dx, y + dy) === "road"]).toEqual([x, y, false]);
  });
  it("stands the forest's twenty-eight more off its trails' own posts, the nearest to the fire first, three of them past forty-two tiles of path and none past fifty", () => {
    const more = far.forest.slice(12);
    expect(more.length).toBe(28);
    for (let i = 1; i < more.length; i++) expect([i + 12, more[i] >= more[i - 1]]).toEqual([i + 12, true]);
    expect(more.filter((d) => d > 42).length).toBe(3);
    expect(Math.max(...more)).toBeLessThanOrEqual(50);
    // (and no two posts of a map nearer each other than seven tiles: a lamp lights six round it)
    for (const map of LAMP_MAPS) {
      const posts = LAMPS.maps[map].posts;
      for (let i = 12; i < posts.length; i++) for (let j = 0; j < i; j++) expect([map, i, j, Math.hypot(posts[i][0] - posts[j][0], posts[i][1] - posts[j][1]) >= 7]).toEqual([map, i, j, true]);
    }
  });
  it("has no post further than fifty tiles of path from its fire", () => {
    for (const map of LAMP_MAPS) for (const [i, d] of far[map].entries()) expect([map, i, d <= 50]).toEqual([map, i, true]);
  });
  it("has four within what one member walks in three seconds, who lights them alone", () => {
    // (three seconds at the walking pace is ten and a half tiles, and a post is lit from two tiles off)
    const near = Object.fromEntries(LAMP_MAPS.map((map) => [map, far[map].filter((d) => d <= 10.5 + LAMPS.near).length]));
    expect(near.forest).toBe(4);
    // (the farm is the smaller map, and one of its posts stands where the lanes cross, by the well and the brazier)
    expect(near.farm).toBe(4);
  });
  it("has the others out of one member's reach: they take a relay, the furthest of the farm's three hands and of the forest's four", () => {
    // (alone: three seconds' walk, and the two tiles' reach at the fire and at the post; each hand more, a walk and a handing's reach)
    const alone = LAMPS.life * 3.5 + 2 * LAMPS.near, leg = LAMPS.life * 3.5 + LAMPS.reach;
    const hands = (d: number) => Math.max(1, Math.ceil((d - alone) / leg) + 1);
    expect([alone, leg]).toEqual([14.5, 13.5]);
    expect(far.farm.filter((d) => d > alone).length).toBe(23);
    expect(far.forest.filter((d) => d > alone).length).toBe(35);
    expect([Math.max(...far.farm.map(hands)), Math.max(...far.forest.map(hands))]).toEqual([3, 4]);
  });
  it("follows each way out from the fire: every post is on one arm, and each is further than the one before it", () => {
    for (const map of LAMP_MAPS) {
      expect(ARMS[map].flat().sort((a, b) => a - b)).toEqual([...Array(12).keys()]);
      for (const arm of ARMS[map]) for (let i = 1; i < arm.length; i++) expect([map, arm[i], far[map][arm[i]] > far[map][arm[i - 1]]]).toEqual([map, arm[i], true]);
    }
  });
  it("measures from a fire as the path goes", () => {
    const [x, y] = LAMPS.maps.farm.posts[0];
    expect(toFire({ x: x + 0.5, y: y + 0.5 }, "farm")).toBeCloseTo(Math.hypot(x - FIRE[0], y - FIRE[1]), 5);
    expect(FARM.x + 27).toBe(FIRE[0]);
    expect(FOREST.x + 49).toBe(LAMPS.maps.forest.fire[0]);
  });
});
