import { describe, expect, it } from "vitest";
import { oddsOf, startFight, strikeWindow } from "./fishing";
import { CARRIES, PLAIN, RODS, ROD_IDS, TACKLE, gearOf, isRod } from "./gear";
import {
  BAITS, CROPS, CROP_IDS, DISHES, DISH_IDS, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, ITEMS, ITEM_IDS, KEPT_BAITS, SCROLLS,
  type BaitId, type FishId, type ItemId,
} from "./items";
import { STAMINA } from "./stamina";
import { GOODS, newPurse, put, type Purse } from "./trade";

const tierOf = (id: ItemId) => ITEMS[id].tier;
const FIRST: BaitId[] = ["worm", "dough", "minnow", "corn"];
const bagOf = (...items: ItemId[]): Purse["bag"] => items.reduce((bag, id) => put(bag, id, 1), Array<null>(20).fill(null) as Purse["bag"]);

describe("three times the things (the owner: \"ช่วยเพิ่ม ไอเทมทั้งหมดอีก 3 เท่า … ไอเทม next tier มาอีก จำนวน 2 เท่าของที่มีอยู่ตอนนี้\")", () => {
  it("keeps the first seventy-two as the early game, and has as many again in each of two tiers after it", () => {
    const by = (t: 1 | 2 | 3) => ITEM_IDS.filter((id) => tierOf(id) === t);
    // seventy-two there were; the pot's things joined them (a pot of food and a bowl; the dirty pot, the scrubber and
    // the ash that came with them went again on 2026-10-04, when the owner cut the dirty pot) and a bucket for the
    // well; and the odd dish, which is what comes of cooking the wrong things
    // (and a scroll for every dish that had none: thirteen, twenty-three and twenty-four of them)
    expect(by(1).length).toBe(79 - 3 + 13);
    // the later tiers were twice what the early game was when he asked, seventy-two each; then came the dishes of five
    // other countries (the owner: "ช่วยเอาอาหารประเทศอื่นที่ดังๆ มาด้วย ซัก 5 ประเทศ ประเทสละ 5 menu จะเพิ่ม อุปกรณ์ด้วยก็ได้"): twenty-five
    // dishes, the noodles they are made of, four staples and four pieces of cookware; and flour came down a tier for them
    // (less the brush and the soap, which were for washing up)
    expect(by(2).length).toBe(72 + 13 + 1 + 2 + 3 + 1 + 23 - 2);
    expect(by(3).length).toBe(72 + 12 + 2 + 1 - 1 + 24);
    expect(by(2).length + by(3).length).toBe(72 * 2 + 25 + 1 + 4 + 4 + 47 - 2);
    // what was there before is still the early game, and still what the uncle sells
    for (const id of ["rod", "hoe", "pot", "worm", "minnow", "koi", "shabu", "scrollGrilledFish"] as const) expect(tierOf(id)).toBe(1);
    for (const id of ["rod", "hoe", "can", "pot", "pan", "grill", "worm", "dough", "rice", "salt", "riceBox", "seedKangkong", "scrollFriedMinnow"] as const) expect(GOODS[id]).toBeDefined();
    // he sells the later tiers' basic things too, each dearer than the early one of its kind
    expect(GOODS.rodTeak!.price).toBeGreaterThan(GOODS.rod!.price);
    expect(GOODS.rodMaster!.price).toBeGreaterThan(GOODS.rodTeak!.price);
    expect(GOODS.hoeSteel!.price).toBeGreaterThan(GOODS.hoeIron!.price);
    for (const id of Object.keys(GOODS) as ItemId[]) expect(GOODS[id]!.price).toBeGreaterThan(ITEMS[id].pays);
    // every kind of thing has more of it later
    for (const kind of ["tool", "bait", "staple", "seed", "crop", "fish", "catch", "goods", "dish", "scroll"] as const)
      for (const t of [2, 3] as const) expect(ITEM_IDS.some((id) => ITEMS[id].kind === kind && tierOf(id) === t)).toBe(true);
    // an id is letters only, short enough for the room to carry it (what somebody holds, what they eat)
    for (const id of ITEM_IDS) expect(/^[A-Za-z]{1,24}$/.test(id)).toBe(true);
  });

  it("says of every thing only what it looks like", () => {
    // (a spot check of words that would give a use away: none of the later tiers' lines has one)
    for (const id of ITEM_IDS) if (tierOf(id) > 1) {
      expect(/ใช้|ไว้|สำหรับ|ทำให้|ช่วย/.test(ITEMS[id].about.th)).toBe(false);
      expect(/\b(for|used|use|makes|helps|bait)\b/i.test(ITEMS[id].about.en)).toBe(false);
    }
  });

  it("leaves the early game's water as it was: the first baits bring only the first fish", () => {
    for (const bait of FIRST) for (let hour = 0; hour < 24; hour++) for (const shallow of [false, true]) {
      for (const o of oddsOf(bait, hour, false, false, shallow)) expect(tierOf(o.what)).toBe(1);
    }
    // a later tier's fish takes only that tier's baits, or later ones
    for (const id of FISH_IDS) for (const bait of Object.keys(FISH[id].baits) as BaitId[]) {
      if (tierOf(id) > 1) expect(tierOf(bait)).toBeGreaterThanOrEqual(2);
      else expect(tierOf(bait)).toBe(1);
    }
    for (const id of FLOTSAM_IDS) {
      expect(ITEMS[id].kind).toBe("catch");
      if (tierOf(id) > 1) for (const bait of FLOTSAM[id].on!) expect(tierOf(bait)).toBe(tierOf(id));
      else expect(FLOTSAM[id].on).toBeUndefined();
    }
    // every bait is a thing, and brings some fish at some hour; every fish can be caught
    for (const bait of BAITS) {
      expect(ITEM_IDS).toContain(bait);
      expect(Array.from({ length: 24 }, (_, h) => h).some((h) => oddsOf(bait, h).some((o) => o.what in FISH))).toBe(true);
    }
    for (const id of FISH_IDS) expect(BAITS.some((b) => Array.from({ length: 24 }, (_, h) => h).some((h) => oddsOf(b, h).some((o) => o.what === id)))).toBe(true);
    // a carved fish is not eaten: it comes back with the line
    expect(KEPT_BAITS).toEqual(["lure"]);
  });

  it("makes the later fish harder than the early ones of their kind", () => {
    const hardest = (t: 1 | 2 | 3, tier: string) => Math.min(...FISH_IDS.filter((id) => tierOf(id) === t && FISH[id].tier === tier).map((id) => FISH[id].fight.band));
    // the narrowest stretch among a tier's rare fish narrows from tier to tier, and no later fish's is wider than the widest early one
    expect(hardest(2, "rare")).toBeLessThanOrEqual(hardest(1, "rare"));
    expect(hardest(3, "rare")).toBeLessThanOrEqual(hardest(2, "rare"));
    for (const id of FISH_IDS) {
      const f = FISH[id].fight;
      expect(f.band).toBeGreaterThan(0.1);
      expect(f.band).toBeLessThanOrEqual(0.25);
      expect(f.sway).toBeGreaterThan(0);
      expect(f.pace).toBeLessThan(0.22 - f.pull * 0.175);
      expect(FISH[id].wait[1]).toBeLessThanOrEqual(240);
    }
    // three legends more, each on its own bait
    expect(FISH_IDS.filter((id) => FISH[id].tier === "legend").sort()).toEqual(["arowana", "koi", "megaCatfish", "stingray"]);
  });

  it("grows the later vegetables slower, and its trees bear for a season", () => {
    for (const id of CROP_IDS) {
      const c = CROPS[id];
      expect(ITEMS[id].kind).toBe("crop");
      expect(ITEMS[c.seed].kind).toBe("seed");
      expect(tierOf(c.seed)).toBe(tierOf(id));
    }
    const slowest = (t: 1 | 2 | 3) => Math.max(...CROP_IDS.filter((id) => tierOf(id) === t).map((id) => CROPS[id].hours));
    expect(slowest(2)).toBeGreaterThan(slowest(1));
    expect(slowest(3)).toBeGreaterThan(slowest(2));
    for (const tree of ["lime", "mango", "coconut"] as const) expect(CROPS[tree].picks).toBeGreaterThanOrEqual(8);
    // every seed there is grows something
    for (const id of ITEM_IDS) if (ITEMS[id].kind === "seed") expect(CROP_IDS.some((c) => CROPS[c].seed === id)).toBe(true);
  });
});

describe("recipes that take more than one piece of cookware (the owner: \"ใช้หลายคนช่วยกันทำ\")", () => {
  it("are in the later tiers only, each tool with a cook of its own, up to four at the feast", () => {
    const many = DISH_IDS.filter((id) => (DISHES[id].recipe?.in.length ?? 0) > 1);
    expect(many.length).toBeGreaterThanOrEqual(8);
    for (const id of many) {
      const r = DISHES[id].recipe!;
      expect(tierOf(id)).toBeGreaterThanOrEqual(2);
      expect(new Set(r.in).size).toBe(r.in.length);
      expect(r.cooks).toBeGreaterThanOrEqual(r.in.length);
    }
    // the early game's dishes are still cooked in one thing (the big pot by three at one pot)
    for (const id of DISH_IDS) if (tierOf(id) === 1 && DISHES[id].recipe) expect(DISHES[id].recipe!.in.length).toBe(1);
    expect(DISHES.khantoke.recipe!.in.length).toBe(4);
    expect(Math.max(...DISH_IDS.map((id) => DISHES[id].recipe?.cooks ?? 1))).toBe(4);
    // a dish needs nothing of a later tier than its own; what goes into it exists; what it is cooked in is a tool
    for (const id of DISH_IDS) {
      const r = DISHES[id].recipe;
      if (!r) continue;
      for (const [item] of r.needs) { expect(ITEM_IDS).toContain(item); expect(tierOf(item)).toBeLessThanOrEqual(tierOf(id)); }
      for (const tool of r.in) { expect(ITEMS[tool].kind).toBe("tool"); expect(tierOf(tool)).toBeLessThanOrEqual(tierOf(id)); }
      // more helpings the more cooks it takes
      if (r.cooks >= 3) expect(r.serves).toBeGreaterThanOrEqual(6);
    }
    // no dish gives more than half the gauge, however grand
    for (const id of DISH_IDS) expect(DISHES[id].stamina).toBeLessThanOrEqual(STAMINA.max / 2);
    // every scroll is of a dish with a recipe
    for (const [scroll, dish] of Object.entries(SCROLLS)) { expect(ITEMS[scroll as ItemId].kind).toBe("scroll"); expect(DISHES[dish!].recipe).toBeDefined(); }
  });
});

describe("better gear (the owner: \"อุปกรณ์ ที่ดีขึ้น (ทำให้เล่นง่าย)\")", () => {
  it("is a rod for each tier, each better than the last", () => {
    expect(ROD_IDS).toEqual(["rod", "rodTeak", "rodMaster"]);
    ROD_IDS.forEach((id, i) => {
      expect(ITEMS[id].kind).toBe("tool");
      expect(tierOf(id)).toBe(i + 1);
      if (i) { expect(RODS[id].band).toBeGreaterThan(RODS[ROD_IDS[i - 1]].band); expect(RODS[id].pace).toBeLessThan(RODS[ROD_IDS[i - 1]].pace); }
    });
    expect(RODS.rod).toEqual({ band: 1, pace: 1 });
    expect(isRod("rodTeak")).toBe(true);
    expect(isRod("hoe")).toBe(false);
    expect(isRod(null)).toBe(false);
  });

  it("fishes with the rod in the hand and the best tackle in the bag", () => {
    expect(gearOf(bagOf(), null)).toEqual(PLAIN);
    expect(gearOf(bagOf("rod"), "rod")).toEqual({ ...PLAIN, rod: "rod" });
    // the rod held is the one fished with, even with a better one in the bag; holding none, the best there is
    expect(gearOf(bagOf("rod", "rodMaster"), "rod").rod).toBe("rod");
    expect(gearOf(bagOf("rod", "rodMaster"), "minnow").rod).toBe("rodMaster");
    expect(gearOf(bagOf("rodTeak"), "rodMaster").rod).toBe("rodTeak");
    // tackle only has to be carried; of two of a kind the better counts, and kinds add up
    const g = gearOf(bagOf("rodTeak", "floatQuill", "floatBell", "hookSteel", "lineSilk", "netSmall", "netLong"), "rodTeak");
    expect(g).toEqual({ rod: "rodTeak", band: 1.2, pace: 0.88, strike: 1.5, slip: 1.3, snap: 1.6, line: 0.76 });
    for (const [id, t] of Object.entries(TACKLE)) {
      expect(ITEMS[id as ItemId].kind).toBe("tool");
      for (const [k, v] of Object.entries(t!)) if (k === "line") expect(v).toBeLessThan(1); else expect(v).toBeGreaterThan(1);
    }
    for (const id of Object.keys(CARRIES) as ItemId[]) expect(ITEM_IDS).toContain(id);
  });

  it("makes the fight easier: a wider stretch that moves slower, a line slower to snap, a hook slower to slip, less line to win, longer to strike", () => {
    const plain = startFight("catfish", "good", {}, 9);
    const best = startFight("catfish", "good", { gear: gearOf(bagOf("rodMaster", "floatBell", "hookTwin", "lineSilk", "netLong"), "rodMaster") }, 9);
    expect(best.band).toBeCloseTo(plain.band * 1.4, 9);
    expect(best.pace).toBeCloseTo(plain.pace * 0.76, 9);
    expect(best.snapIn).toBeCloseTo(plain.snapIn * 1.6, 9);
    expect(best.slipIn).toBeCloseTo(plain.slipIn * 1.6, 9);
    expect(best.length).toBeCloseTo(plain.length * 0.76, 9);
    expect(strikeWindow({ gear: { strike: 1.5 } })).toBeCloseTo(strikeWindow() * 1.5, 9);
    // with no gear named it is the plain fight, as it always was
    expect(startFight("catfish", "good", { gear: PLAIN }, 9)).toEqual(plain);
    // and the best gear does not undo a later fish's hardness: its stretch is still narrower than a minnow's on a bamboo rod
    const giant = startFight("megaCatfish" as FishId, "good", { gear: gearOf(bagOf("rodMaster"), "rodMaster") }, 9);
    expect(giant.band).toBeLessThan(startFight("minnow", "good", {}, 9).band);
    // nobody starts with any of it
    expect(gearOf(newPurse().bag, null)).toEqual(PLAIN);
  });
});
