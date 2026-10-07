import { describe, expect, it } from "vitest";
import { easeOf, helpings, isCookware, ladle, reachOf, type Pot } from "./cooking";
import { WATER, chore, hoe, toolOf, WILD, yieldOf, type Plant } from "./farm";
import { CARRIES, PLAIN, gearOf } from "./gear";
import { CLUES } from "./clues";
import { HINT_IDS, HINT_PRICE, KIND_WORD, buyHint, hiddenLine, hintOf, hintPrice, hintsLeft, nextHint, toldOf } from "./hints";
import { mayNet } from "./insects";
import { CROPS, CROP_IDS, DISHES, DISH_IDS, ITEMS, ITEM_IDS, MAKES, MAKE_IDS, SCROLLS, type ItemId } from "./items";
import { GOODS, RULES, hold, newPurse, put, takeOff, wear, type Purse } from "./trade";
import { idle, missing, sources, usesOf } from "./uses";
import { ELEMENTS, FELLED, GEMS, MINED, ORES, SMELTS, axeChops, pickSwings, toolKindOf, veinStrikes } from "./tools";

const NOW = Date.parse("2026-10-03T12:00:00+07:00");
const purseWith = (...items: Array<[ItemId, number]>): Purse => {
  const p = newPurse();
  return { ...p, bag: items.reduce((bag, [id, n]) => put(bag, id, n), Array<null>(20).fill(null) as Purse["bag"]) };
};
const holding = (p: Purse, id: ItemId): Purse => { const d = hold(p, p.bag.findIndex((s) => s?.item === id)); if (!d.ok) throw new Error("nothing to hold"); return d.purse; };
const plant = (crop: Plant["crop"]): Plant => ({ by: "me", crop, sown: NOW, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 });

describe("every piece of gear (the owner: \"make sure ว่า อุปกรณ์ ทุกอย่างสามารถใช้ได้จริง\")", () => {
  it("does something: no tool is only carried about", () => {
    expect(idle()).toEqual([]);
    for (const id of ITEM_IDS) if (ITEMS[id].kind === "tool") expect(usesOf(id).length).toBeGreaterThan(0);
    // and what is not gear has no use of that kind
    for (const id of ["minnow", "rice", "tomYum", "seedCorn"] as const) expect(usesOf(id)).toEqual([]);
  });

  it("does what it is said to, each by the rule that reads it", () => {
    for (const id of ITEM_IDS) for (const use of usesOf(id)) {
      const bag = purseWith([id, 1]).bag;
      if (use === "rod") expect(gearOf(bag, id).rod).toBe(id);
      if (use === "tackle") expect(gearOf(bag, null)).not.toEqual(PLAIN);
      if (use === "hoe") expect(hoe("1,1", purseWith([id, 1]), WILD, id, NOW).ok).toBe(true);
      if (use === "can") {
        const filled = chore(holding(purseWith([id, 1]), id), "well", 5, NOW);
        expect(filled.ok && filled.purse.bag.find((s) => s?.item === id)!.water).toBe(WATER.cans[id]);
      }
      if (use === "blade") {
        const crop = CROP_IDS.find((c) => yieldOf("1,1", plant(c), id) > yieldOf("1,1", plant(c)));
        expect(crop).toBeDefined();
      }
      if (use === "bucket") {
        const drawn = chore(holding(purseWith([id, 1]), id), "river", 0, NOW);
        expect(drawn.ok && drawn.purse.bag.find((s) => s?.item === id)!.water).toBe(WATER.buckets[id]);
      }
      if (use === "cookware") {
        expect(isCookware(id)).toBe(true);
        expect([...DISH_IDS.map((d) => DISHES[d].recipe?.in ?? []), ...MAKE_IDS.map((m) => MAKES[m]!.in)].some((tools) => (tools as ItemId[]).includes(id))).toBe(true);
      }
      if (use === "kitchen") expect(Math.max(helpings("tomYum", [id], 0), helpings("tomYum", ["pot"], 0, bag))).toBeGreaterThan(helpings("tomYum", ["pot"], 0));
      if (use === "ease") expect(easeOf(bag)).toBeGreaterThan(1);
      if (use === "carry") {
        const worn = wear(purseWith([id, 1]), 0);
        expect(worn.ok && worn.purse.bag.length).toBe(20 + CARRIES[id]!);
      }
      if (use === "table") {
        const pot: Pot = { id: "p", by: "me", dish: "tomYum", left: 1, at: [1, 1] };
        expect(reachOf({ ...pot, tok: true })).toBeGreaterThan(reachOf(pot));
      }
      if (use === "serve" && id === "bowl") {
        const pot: Pot = { id: "p", by: "me", dish: "tomYum", left: 1, at: [1, 1] };
        expect(ladle(purseWith([id, 1]), pot).ok).toBe(true);
        expect(ladle(newPurse(), pot).ok).toBe(false);
      }
      if (use === "net") expect(mayNet(id)).toBe(true);
      // (woodcutting and mining: each read as the tool it is by lib/town/tools, whose numbers the lines' games play by)
      if (use === "pick") { expect(toolKindOf(id)).toBe("pick"); expect(pickSwings({ item: id, n: 1 }, 12)).toBe(4); expect(veinStrikes({ item: id, n: 1 })).toBe(6); }
      if (use === "axe") { expect(toolKindOf(id)).toBe("axe"); expect(axeChops({ item: id, n: 1 })).toBe(12); }
      if (use === "serve" && id === "ladle") expect(helpings("tomYum", ["pot"], 0, bag)).toBeGreaterThan(helpings("tomYum", ["pot"], 0));
    }
    // a hoe, a can and a seed are told apart by the hand
    expect(toolOf("hoeSteel")).toBe("hoe");
    expect(toolOf("canBrass")).toBe("can");
  });

  it("makes a bag bigger when it is worn, one of a kind, and smaller again when it is taken off", () => {
    const start = { ...newPurse(), bag: put(put(newPurse().bag, "basket", 1), "minnow", 3) };
    expect(start.bag.length).toBe(RULES.slots);
    const worn = wear(start, 0);
    if (!worn.ok) throw new Error("not worn");
    expect(worn.purse.bag.length).toBe(RULES.slots + 5);
    expect(worn.purse.wears).toEqual(["basket"]);
    // the basket is no longer in the bag; what else was, is
    expect(worn.purse.bag.filter(Boolean)).toEqual([{ item: "minnow", n: 3 }]);
    // a second of the same kind is not worn; another kind is
    const second = { ...worn.purse, bag: put(put(worn.purse.bag, "basket", 1), "krabung", 1) };
    expect(wear(second, second.bag.findIndex((s) => s?.item === "basket"))).toEqual({ ok: false, why: "worn" });
    const both = wear(second, second.bag.findIndex((s) => s?.item === "krabung"));
    expect(both.ok && both.purse.bag.length).toBe(RULES.slots + 10);
    expect(wear(start, 1)).toEqual({ ok: false, why: "none" });
    // taken off, it is back in the bag, which is as big as it began again: only when everything fits
    const off = takeOff(worn.purse, "basket");
    expect(off.ok && off.purse.bag.length).toBe(RULES.slots);
    expect(off.ok && off.purse.bag.filter(Boolean)).toEqual([{ item: "minnow", n: 3 }, { item: "basket", n: 1 }]);
    expect(off.ok && off.purse.wears).toEqual([]);
    const crowded = { ...worn.purse, bag: worn.purse.bag.map((s, i) => s ?? (i <= RULES.slots ? { item: "boot" as ItemId, n: 1 } : null)) };
    expect(takeOff(crowded, "basket")).toEqual({ ok: false, why: "full" });
    expect(takeOff(start, "basket")).toEqual({ ok: false, why: "none" });
    // all three: a bag of twenty-five (twenty, while a bag began with five)
    expect(RULES.slots + Object.values(CARRIES).reduce((t, n) => t + n!, 0)).toBe(25);
  });
});

describe("everything in the game (the owner: \"make sure ว่า recipe ของอาหารทุกอย่าง สามารถหาได้ในเกม\")", () => {
  it("can be had: bought, caught, grown, cooked or made, from what can itself be had", () => {
    expect(missing()).toEqual([]);
    const from = sources();
    expect(from.size).toBe(ITEM_IDS.length);
    // each line of work brings its own
    for (const id of ["tomYum", "curryPaste", "basket", "potFull"] as const) expect(from.get(id)).toBe("kitchen");
    for (const id of ["koi", "megaCatfish", "hyacinth", "chest"] as const) expect(from.get(id)).toBe("river");
    for (const id of ["garlic", "coconut"] as const) expect(from.get(id)).toBe("farm");
    // nothing that is caught, grown or cooked is on the uncle's shelf (but the plain meal, and the pot's things)
    for (const id of Object.keys(GOODS) as ItemId[]) expect(["fish", "catch", "crop"]).not.toContain(ITEMS[id].kind);
    // every seed is sold, so every vegetable can be grown
    for (const c of CROP_IDS) expect(GOODS[CROPS[c].seed]).toBeDefined();
  });

  it("woodcutting and mining: an axe and a pick from the uncle bring everything of the mountain, and the smith smelts the rest", () => {
    expect(usesOf("pick")).toEqual(["pick"]);
    expect(usesOf("axe")).toEqual(["axe"]);
    const from = sources();
    expect(from.get("pick")).toBe("shop");
    expect(from.get("axe")).toBe("shop");
    for (const id of FELLED) expect(from.get(id)).toBe("mountain");
    for (const id of MINED) expect(from.get(id)).toBe("mountain");
    for (const o of ORES) expect(from.get(o.ore)).toBe("smith");
    for (const e of ELEMENTS) expect(from.get(GEMS[e].gem)).toBe("smith");
    // a torch is made by hand of fine timber and the forest's resin
    expect(from.get("torch")).toBe("kitchen");
    expect(MAKES.torch).toEqual({ needs: [["timber", 1], ["resin", 1]], in: [], gives: 2 });
    // with no axe there is no wood, and so nothing is smelted and no torch made; with no pick, nothing of the rock
    const noAxe = sources((Object.keys(GOODS) as ItemId[]).filter((id) => id !== "axe"));
    for (const id of [...FELLED, "torch", ...Object.keys(SMELTS)] as ItemId[]) expect(noAxe.has(id)).toBe(false);
    for (const id of MINED) expect(noAxe.get(id)).toBe("mountain");
    const noPick = sources((Object.keys(GOODS) as ItemId[]).filter((id) => id !== "pick"));
    for (const id of [...MINED, ...Object.keys(SMELTS)] as ItemId[]) expect(noPick.has(id)).toBe(false);
    for (const id of FELLED) expect(noPick.get(id)).toBe("mountain");
    // none of it is what the uncle may ask for or hint at: that never hangs on what somebody goes out and finds
    const tame = sources(Object.keys(GOODS) as ItemId[], false);
    for (const id of [...FELLED, ...MINED, "torch", ...Object.keys(SMELTS)] as ItemId[]) expect(tame.has(id)).toBe(false);
    // and the relatives take none of it: wood, ore and gems change hands between members
    for (const id of [...FELLED, ...MINED, "torch", ...Object.keys(SMELTS)] as ItemId[]) expect(ITEMS[id].pays).toBe(0);
  });

  it("can be found: there is a hint for every dish that is cooked and everything that is made", () => {
    const cooked = DISH_IDS.filter((id) => DISHES[id].recipe);
    expect(HINT_IDS.length).toBe(cooked.length + MAKE_IDS.length);
    expect(new Set(HINT_IDS).size).toBe(HINT_IDS.length);
    for (const id of [...cooked, ...MAKE_IDS]) {
      expect(HINT_IDS).toContain(id);
      const hint = hintOf(id), r = id in DISHES ? DISHES[id as keyof typeof DISHES].recipe! : MAKES[id]!;
      // it names the thing, every thing that goes in with how many of each, and everything it is made in, in both
      // languages; but the last thing never by its name ("เหลือชิ้นสุดท้ายจะบอกแค่ชนิดของ ไอเทมนั้น ต้องไปเดากันเอง"): by which
      // sort of thing it is and where such a thing is had (lib/town/clues)
      expect(hint.th).toContain(ITEMS[id].name.th);
      const said = hint.th.slice(hint.th.indexOf(": ") + 2).split(" · ")[0].split(", "), saidEn = hint.en.slice(hint.en.indexOf(": ") + 2).split(" · ")[0].split(", ");
      const [last, n] = r.needs[r.needs.length - 1], hidden = hiddenLine(toldOf(id).last!);
      expect(said.length).toBe(r.needs.length);
      expect(saidEn.length).toBe(r.needs.length);
      r.needs.slice(0, -1).forEach(([need, k], i) => {
        expect(said[i]).toBe(`${ITEMS[need].name.th} ×${k}`);
        expect(saidEn[i]).toBe(`${ITEMS[need].name.en.toLowerCase()} ×${k}`);
      });
      expect(said[said.length - 1]).toBe(`${hidden.th} ×${n}`);
      expect(saidEn[saidEn.length - 1]).toBe(`${hidden.en} ×${n}`);
      for (const tool of r.in) { expect(hint.th).toContain(ITEMS[tool].name.th); expect(hint.en).toContain(ITEMS[tool].name.en.toLowerCase()); }
      // the same recipe as it is told on a scroll and in the book: short of its last thing, or whole for whoever has made it
      expect(toldOf(id)).toMatchObject({ needs: r.needs.slice(0, -1), last: { kind: ITEMS[last].kind, n }, in: r.in });
      expect(toldOf(id, true)).toMatchObject({ needs: r.needs, last: null, in: r.in });
      // missed by that thing alone, it says what the thing looks like (its own line, and still not its name), and after
      // more such misses whose shadow to show
      expect(toldOf(id, false, CLUES.looks - 1).last!.looks).toBeUndefined();
      expect(toldOf(id, false, CLUES.looks).last).toMatchObject({ kind: ITEMS[last].kind, n, looks: ITEMS[last].about });
      expect(toldOf(id, false, CLUES.shadow - 1).last!.shadow).toBeUndefined();
      expect(toldOf(id, false, CLUES.shadow).last).toMatchObject({ looks: ITEMS[last].about, shadow: last });
      expect(toldOf(id, true, 99).last).toBeNull();
    }
    // every kind of thing a recipe ends on has its word
    for (const k of Object.values(KIND_WORD)) { expect(k.th.length).toBeGreaterThan(3); expect(k.en.length).toBeGreaterThan(3); }
    // the early game's come first, and cost least
    const tiers = HINT_IDS.map((id) => ITEMS[id].tier);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(HINT_PRICE[1]).toBeLessThan(HINT_PRICE[2]);
    expect(HINT_PRICE[2]).toBeLessThan(HINT_PRICE[3]);
    // a scroll tells as much, and there is one for every dish that is cooked: six the uncle sells, the rest found;
    // and one of the cure for pests, which he sells too
    expect(Object.values(SCROLLS).sort()).toEqual([...cooked, "pestCure"].sort());
    expect(Object.keys(SCROLLS).filter((s) => GOODS[s as ItemId]).length).toBe(7);
  });

  it("sells its hints one at a time, for coins: one that is neither heard nor found, of the earliest tier there is one of, and which of them by chance (the owner: \"ช่วยทำให้ คำใบ้จากลุงขายของ สุ่มด้วยครับ\")", () => {
    let purse: Purse = { ...newPurse(), coins: 100_000, recipes: ["friedMinnow"] };
    // those he may sell next: every early one but what is known already, as they are listed; all of one price
    const early = HINT_IDS.filter((id) => ITEMS[id].tier === 1 && id !== "friedMinnow");
    expect(early.length).toBeGreaterThan(20);
    expect(hintsLeft(purse)).toEqual(early);
    expect(hintsLeft(purse, ["grilledFish"])).toEqual(early.filter((id) => id !== "grilledFish"));
    expect(hintPrice(purse)).toBe(HINT_PRICE[1]);
    // the number of chance says which: each of them over as wide a stretch of it as any other
    expect(nextHint(purse, 0)).toBe(early[0]);
    const drawn = new Map<ItemId, number>();
    for (let i = 0; i < early.length * 40; i++) { const id = nextHint(purse, (i + 0.5) / (early.length * 40))!; drawn.set(id, (drawn.get(id) ?? 0) + 1); }
    expect([...drawn.keys()]).toEqual(early);
    expect(new Set(drawn.values())).toEqual(new Set([40]));
    // (a number that is none from 0 up to 1 is brought to the nearest that is)
    expect(nextHint(purse, -3)).toBe(early[0]);
    expect(nextHint(purse, Number.NaN)).toBe(early[0]);
    expect(nextHint(purse, 1)).toBe(early[early.length - 1]);
    expect(nextHint(purse, 7)).toBe(early[early.length - 1]);
    // fifty who buy four each hear fifty different fours (until 2026-10-05 everybody heard the same four, in the same order)
    const dice = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const four = (roll: () => number) => { let p = purse; const got: ItemId[] = []; for (let i = 0; i < 4; i++) { const d = buyHint(p, roll()); if (!d.ok) throw new Error(d.why); got.push(d.hint); p = d.purse; } return got; };
    const fours = Array.from({ length: 50 }, (_, i) => four(dice(i + 1)));
    expect(new Set(fours.map((f) => f.join())).size).toBe(50);
    expect(new Set(fours.map((f) => f[0])).size).toBeGreaterThan(15);
    // bought to the end, whatever the dice: every hint but the one already known, each once, each at its tier's price, which was known before it was bought
    const roll = dice(7), heard: ItemId[] = [];
    for (let i = 0; i < HINT_IDS.length + 5; i++) {
      const price = hintPrice(purse), d = buyHint(purse, roll());
      if (!d.ok) { expect(d.why).toBe("none"); expect(price).toBeNull(); break; }
      expect(purse.coins - d.purse.coins).toBe(HINT_PRICE[ITEMS[d.hint].tier]);
      expect(price).toBe(HINT_PRICE[ITEMS[d.hint].tier]);
      heard.push(d.hint);
      purse = d.purse;
    }
    expect(heard.length).toBe(HINT_IDS.length - 1);
    expect(new Set(heard).size).toBe(heard.length);
    expect(purse.hints).toEqual(heard);
    // a tier at a time, the early game's first; and within a tier not as they are listed
    const tiers = heard.map((id) => ITEMS[id].tier);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(heard).not.toEqual(HINT_IDS.filter((id) => id !== "friedMinnow"));
    expect(buyHint({ ...newPurse(), coins: HINT_PRICE[1] - 1 }, 0.5)).toEqual({ ok: false, why: "coins" });
  });
});
