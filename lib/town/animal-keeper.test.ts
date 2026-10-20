import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DbKeeper, type Ask } from "./keeper";
import { Trial } from "./trial";
import { mergeAnimals, EMPTY_WORLD } from "./animal-world";
import { countsOf } from "./line-points";
import { RAM, RAM_PACE, paceOf, ramSeat, rides, wagonSeat } from "./riding";
import { numberOf } from "./gifts";
import { seatSpot, wagonSpot, knowWagons, WAGON_LEG } from "./seats";
import { WAGON_STOPS } from "./pasture";
import { placeOf, walkable } from "./world";
import { newPurse, put, type Purse } from "./trade";
import { dayStart, newHerd, type Animal } from "./animals";
import type { ItemId } from "./items";
import type { WagonRun } from "./animal-act";

const NOW = dayStart(20_380) + 3 * 3_600_000;
const animal = (over: Partial<Animal> = {}): Animal => ({
  id: "a1", owner: "me", species: "chicken", breed: "barnHen", name: "", born: NOW, bought: true, home: "barn",
  sex: "f", stats: { thrift: 1, gentle: 1, vigor: 1 }, streak: 0, at: NOW, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: 1 }, speedUntil: 0, windUntil: 0,
  narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, ...over,
});

describe("the pasture's world as the page holds it", () => {
  it("takes a look whole, and lays a step's part over what is held", () => {
    const offers = [{ id: "o1", from: "me", to: "pal", animal: "a1", at: 1 }];
    const whole = mergeAnimals(null, { animals: [animal(), animal({ id: "a2", owner: "pal" })], herds: [{ ...newHerd("me"), barn: 2 }], found: {}, spells: [], wagons: [], offers, asks: [] });
    expect(whole.animals.map((a) => a.id)).toEqual(["a1", "a2"]);
    const part = mergeAnimals(whole, { animals: [animal({ food: 12 }), animal({ id: "a3" })], removed: ["a2"], herds: [{ ...newHerd("me"), barn: 2, care: "anybody" }] });
    expect(part.animals.map((a) => [a.id, a.food])).toEqual([["a1", 12], ["a3", 0]]);
    expect(part.herds).toEqual([{ ...newHerd("me"), barn: 2, care: "anybody" }]);
    expect(part.offers).toEqual(offers);
    // (an animal or a herd told with something left out is made whole)
    expect(mergeAnimals(null, { animals: [{ ...animal(), home: undefined, sex: undefined, stats: undefined }], herds: [{ owner: "me" }] })).toMatchObject({ animals: [{ home: "barn", sex: "f", stats: { thrift: 1 } }], herds: [{ barn: null, room: 4, door: [] }] });
    // (an animal of a breed this page does not know is left out: it could not be drawn)
    expect(mergeAnimals(null, { animals: [animal({ breed: "dodo" })] }).animals).toEqual([]);
    expect(mergeAnimals(null, {})).toEqual(EMPTY_WORLD);
  });
  it("counts the line's points from a step's deed (`doc.pts`), and care of a friend's animal on the helpers' line", () => {
    expect(countsOf({ from: "deed", what: "animal_feed", thing: null, n: 1, doc: { pts: 15 } }, "me")).toEqual([{ to: null, line: "animals", raw: 15 }]);
    expect(countsOf({ from: "deed", what: "animal_care", thing: null, n: 1, doc: { pts: 2 } }, "me")).toEqual([{ to: null, line: "helpers", raw: 2 }]);
    expect(countsOf({ from: "deed", what: "animal_door", thing: null, n: 1, doc: {} }, "me")).toEqual([]);
  });
});

describe("the database's keeper of the pasture", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await vi.advanceTimersByTimeAsync(0); };
  it("asks town_animals with the step and its request, keeps the purse, merges the world, and says away when unreached", async () => {
    const sent: Array<[string, Record<string, unknown>]> = [];
    let up = true;
    const ask: Ask = async (fn, args = {}) => {
      sent.push([fn, args]);
      if (fn === "town_is_open") return true;
      if (fn === "town_me") return { now: NOW, purse: { ...newPurse(), coins: 5000 } };
      if (fn !== "town_animals" || !up) return null;
      const input = args.p_input as { action: string };
      if (input.action === "look") return { ok: true, now: NOW, world: { animals: [animal({ owner: "pal", id: "p1" })], herds: [], found: {}, spells: [], wagons: [], offers: [], asks: [] } };
      return { ok: true, now: NOW, purse: { ...newPurse(), coins: 4600 }, world: { animals: [animal()], herds: [{ ...newHerd("me"), barn: 0 }] }, got: { child: "barnHen" } };
    };
    const k = new DbKeeper("me", ask);
    await settle();
    const told: string[] = [];
    k.onDeed = (w) => { told.push(w); };
    const stop = k.look("animals");
    await settle();
    expect(k.animalWorld()?.animals.map((a) => a.id)).toEqual(["p1"]);
    const did = await k.animals({ action: "buy", species: "chicken", sex: "f" }, "req-1");
    expect(did).toMatchObject({ ok: true, got: { child: "barnHen" } });
    expect(did.world.animals.map((a) => a.id)).toEqual(["p1", "a1"]);
    expect(k.purse().coins).toBe(4600);
    expect(sent.find(([fn, a]) => fn === "town_animals" && (a.p_input as { action: string }).action === "buy")?.[1]).toEqual({ p_input: { action: "buy", species: "chicken", sex: "f" }, p_request: "req-1" });
    expect(told).toContain("animals");
    up = false;
    const away = await k.animals({ action: "pet", id: "a1" });
    expect(away).toMatchObject({ ok: false, why: "away" });
    expect(away.world.animals.length).toBe(2);
    stop();
  });
});

describe("the trial's pasture", () => {
  it("runs a step on the browser's world, keeps the purse in step, and counts its points on the line", () => {
    const t = new Trial(`tester-${Math.random()}`, { memoryOnly: true });
    const before = t.purse().coins;
    t.fished({ ...t.purse(), coins: before + 7000, bag: put(put(t.purse().bag, "log" as ItemId, 60), "stoneTile" as ItemId, 20) });
    expect(t.animals({ action: "buy", species: "chicken", sex: "f" })).toMatchObject({ ok: false, why: "barn" });
    expect(t.animals({ action: "barn", index: 0 }).ok).toBe(true);
    const bought = t.animals({ action: "buy", species: "chicken", sex: "f" });
    expect(bought.ok).toBe(true);
    expect(t.purse().coins).toBe(before + 7000 - 6000 - 400);
    expect(t.animalWorld().animals).toHaveLength(1);
    const id = t.animalWorld().animals[0].id;
    const p: Purse = { ...t.purse(), bag: put(t.purse().bag, "chickFeed" as ItemId, 2) };
    t.fished(p);
    expect(t.animals({ action: "feed", id, item: "chickFeed" }).ok).toBe(true);
    expect(t.lines().lines.animals.points).toBeGreaterThan(0);
    expect(t.animals({ action: "pet", id: "nobody" })).toMatchObject({ ok: false, why: "none" });
    const given = t.animalGive("dairyCow", "adult", 5)!;
    expect(given.home).toBe("barn");
    t.animalWagon();
    expect(t.animalWorld().wagons).toHaveLength(1);
  });
});

describe("the cloud ram and the hay wagon", () => {
  it("rides at one and a half times a walker's pace, the gift's own number", () => {
    expect(RAM_PACE).toBe(numberOf(RAM));
    expect(paceOf(RAM)).toBe(1.5);
    expect(rides(RAM, false)).toBe(true);
    expect(rides(RAM, true)).toBe(false);
  });
  it("puts a passenger where the rider is, and lets them down when the rider has gone or got off", () => {
    const rider = { pos: { x: 150.5, y: -10.5 }, info: { pet: RAM, sit: -1 } };
    expect(seatSpot(ramSeat("r1"), NOW, (id) => (id === "r1" ? rider : undefined))).toEqual({ x: 150.46, y: -10.54 });
    expect(seatSpot(ramSeat("r1"), NOW, () => undefined)).toBeNull();
    expect(seatSpot(ramSeat("r1"), NOW, () => ({ ...rider, info: { pet: RAM, sit: 3 } }))).toBeNull();
    expect(seatSpot(ramSeat("r1"), NOW, () => ({ ...rider, info: { pet: "famStag", sit: -1 } }))).toBeNull();
  });
  it("tours its stops in order: at the farm's stop to be boarded, on along the lane, at each map's stop in turn", () => {
    const run: WagonRun = { id: "w1", by: "me", from: NOW, stops: ["farm", "town", "forest"], riders: [] };
    const at = wagonSpot(run, NOW + 1000)!;
    expect(at).toMatchObject({ map: "farm", standing: true });
    expect(at.at).toEqual({ x: WAGON_STOPS.farm[0] + 0.5, y: WAGON_STOPS.farm[1] + 0.5 });
    const legMs = (4 * 60_000) / 3;
    const rolling = wagonSpot(run, NOW + legMs * 0.8)!;
    expect(rolling.standing).toBe(false);
    expect(placeOf(rolling.at.x, rolling.at.y)).toBe("farm");
    expect(walkable(Math.floor(rolling.at.x), Math.floor(rolling.at.y))).toBe(true);
    const town = wagonSpot(run, NOW + legMs * (1 + WAGON_LEG.stand - 0.05))!;
    expect(town).toMatchObject({ map: "town", standing: true });
    const forest = wagonSpot(run, NOW + legMs * 2.9)!;
    expect(forest).toMatchObject({ map: "forest", standing: true });
    expect(wagonSpot(run, NOW + legMs * 3 + 1)).toBeNull();
    knowWagons([run], () => NOW + 1000);
    expect(seatSpot(wagonSeat("w1"), 0, () => undefined)).toEqual(at.at);
    knowWagons([], () => NOW);
    expect(seatSpot(wagonSeat("w1"), 0, () => undefined)).toBeNull();
  });
});
