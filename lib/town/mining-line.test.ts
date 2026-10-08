import { describe, expect, it } from "vitest";
import { ALL_GIFTS, GIFTS, MORE_GIFTS, dueOf, giftAt, giftOf, giftsOf, giftsRowAll, numberOf, takeGift, wearCharms, wearFamiliar, wearing } from "./gifts";
import { count, countsOf, linesRow, newLine, POINTS, type Done } from "./line-points";
import { ALL_LINE_IDS, LINES, LINE_IDS, MORE_LINE_IDS, ladderOf, linesOf, linesShown, mayWear, noLines, rankOf, titleOf, titlesOf, wornOf } from "./lines";
import { lightOf } from "./mining";
import { newPurse } from "./trade";

const deed = (what: string, thing: string | null, doc: Record<string, unknown> = {}, n = 1): Done => ({ from: "deed", what, thing, n, doc });

describe("the mining line", () => {
  it("is a line to come: beside the seven, given only where whoever keeps the game gives it", () => {
    expect(LINE_IDS).toHaveLength(7);
    expect(MORE_LINE_IDS).toContain("mining");
    expect(ALL_LINE_IDS).toEqual([...LINE_IDS, ...MORE_LINE_IDS]);
    expect(linesShown(noLines())).toEqual([...LINE_IDS]);
    expect(linesShown({ given: ["mining"] })).toEqual([...LINE_IDS, "mining"]);
    // a database from before it says nothing of it: no card; one that has a key for it gives it
    expect(linesOf({ kitchen: { points: 5, today: 1 } }).given).toBeUndefined();
    const told = linesOf({ kitchen: { points: 5, today: 1 }, mining: { points: 60, today: 12 } });
    expect(told.given).toEqual(["mining"]);
    expect(told.lines.mining).toEqual({ points: 60, today: 12 });
    expect(noLines().lines.mining).toEqual({ points: 0, today: 0 });
    expect(wornOf({ line: "mining", rank: 3 })).toEqual({ line: "mining", rank: 3 });
    expect(mayWear({ mining: 400 }, "mining", 3)).toBe(true);
    expect(mayWear({ mining: 400 }, "mining", 4)).toBe(false);
    expect(titlesOf({ mining: 150 }).map((t) => t.title.en)).toEqual(["Lantern child", "Mine hand"]);
    expect(linesRow().ids).toContain("mining");
    expect(linesRow().mining).toEqual({ rock: 1, vein: 3, way: 5, crystal: 10, lent: 1, lending: 1 });
  });
  it("has the marks of the other ladders, a day's bound of 150, and ten titles in both languages", () => {
    const l = LINES.mining;
    expect(l.marks).toEqual([50, 150, 350, 700, 1300, 2200, 3600, 5500, 8000, 12000]);
    expect(l.day).toBe(150);
    expect(l.titles).toHaveLength(10);
    expect(l.titles.map((t) => t[1])).toEqual(["Lantern child", "Mine hand", "Rock breaker", "Vein hunter", "Stone listener", "Dwarf-friend", "Delver of the deep", "Crystal waker", "Lord of the mountain's core", "Legend of the deep"]);
    for (const [th, en] of l.titles) expect(th && en).toBeTruthy();
    expect(titleOf("mining", 1)).toEqual({ th: "เด็กถือตะเกียง", en: "Lantern child" });
    expect(rankOf("mining", 49)).toBe(0); expect(rankOf("mining", 50)).toBe(1); expect(rankOf("mining", 12000)).toBe(10);
    expect(ladderOf("mining", 60).map((r) => r.state)).toEqual(["had", "next", "far", "far", "far", "far", "far", "far", "far", "far"]);
  });
  it("counts a point a rock, three a vein, five a way down found, ten the crystal rock, and ten more the first time each kind of fragment is found", () => {
    expect(countsOf(deed("mine", "stone", { floor: 3, rock: 4 }), "me")).toEqual([{ to: null, line: "mining", raw: 1 }]);
    expect(countsOf(deed("mine", "stone", { floor: 3, rock: 4, got: "shardCopper", shards: 2 }), "me")).toEqual([{ to: null, line: "mining", raw: 1, first: "mining:shardCopper" }]);
    expect(countsOf(deed("vein", "shardIron", { floor: 13, passed: 3 }, 3), "me")).toEqual([{ to: null, line: "mining", raw: 3, first: "mining:shardIron" }]);
    expect(countsOf(deed("vein", "shardIron", { chip: "chipRuby" }), "me")).toEqual([{ to: null, line: "mining", raw: 3, first: "mining:shardIron" }, { to: null, line: "mining", raw: 0, first: "mining:chipRuby" }]);
    expect(countsOf(deed("vein", null, {}, 0), "me")).toEqual([{ to: null, line: "mining", raw: 3 }]);
    // (a twin's second go counts for nothing but what it finds for the first time)
    expect(countsOf(deed("vein", "shardIron", { again: true }), "me")).toEqual([{ to: null, line: "mining", raw: 0, first: "mining:shardIron" }]);
    expect(countsOf(deed("delve", null, { floor: 3 }), "me")).toEqual([{ to: null, line: "mining", raw: 5 }]);
    expect(countsOf(deed("crystal", "stone", { got: "shardSilver", chip: "chipOnyx" }), "me")).toEqual([{ to: null, line: "mining", raw: 10, first: "mining:shardSilver" }, { to: null, line: "mining", raw: 0, first: "mining:chipOnyx" }]);
    for (const what of ["torch", "lift", "drill"]) expect(countsOf(deed(what, null), "me")).toEqual([]);
    expect(POINTS.mining).toEqual({ rock: 1, vein: 3, way: 5, crystal: 10, lent: 1, lending: 1 });
    // (a hand lent to a rock somebody else struck first: a point on the mining line and one on the helpers'; nothing for one's own)
    expect(countsOf(deed("hew", "stone", { floor: 3, rock: 4, whose: "you" }), "me")).toEqual([{ to: null, line: "mining", raw: 1 }, { to: null, line: "helpers", raw: 1 }]);
    expect(countsOf(deed("hew", "stone", { floor: 3, rock: 4, whose: "me" }), "me")).toEqual([]);
    // kept: a first is ten more, once
    let kept = newLine();
    for (const c of countsOf(deed("mine", "stone", { got: "shardCopper" }), "me")) kept = count(kept, c, 1);
    expect(kept.points).toBe(11);
    for (const c of countsOf(deed("mine", "stone", { got: "shardCopper" }), "me")) kept = count(kept, c, 1);
    expect(kept.points).toBe(12);
    for (const c of countsOf(deed("vein", "shardCopper", { chip: "chipRuby" }), "me")) kept = count(kept, c, 1);
    expect(kept.points).toBe(12 + 3 + 10);
    // the farm's picking is still the farm's
    expect(countsOf(deed("pick", "tomato"), "me")[0]?.line).toBe("farming");
  });
});

describe("the mining line's gifts", () => {
  it("are three, of ranks one to three, beside the gifts every keeper knows", () => {
    expect(GIFTS).toHaveLength(39);
    expect(MORE_GIFTS.filter((g) => g.line === "mining").map((g) => [g.id, g.kind, g.rank])).toEqual([["charmMinerLamp", "charm", 1], ["famBat", "familiar", 2], ["thingSack", "thing", 3]]);
    expect(ALL_GIFTS).toHaveLength(GIFTS.length + MORE_GIFTS.length);
    for (const g of MORE_GIFTS) {
      expect(g.name.th && g.name.en && g.does.th && g.does.en, g.id).toBeTruthy();
      expect(giftOf(g.id)).toBe(g);
      expect(giftAt(g.line, g.rank)).toBe(g);
      expect(g.id.startsWith(g.kind === "charm" ? "charm" : g.kind === "familiar" ? "fam" : "thing"), g.id).toBe(true);
    }
    expect(numberOf("charmMinerLamp")).toBe(4);
    expect(numberOf("thingSack")).toBe(5);
    expect(Object.keys(giftsRowAll().gifts)).toContain("famBat");
  });
  it("are taken at their ranks, worn and followed as any other", () => {
    let p = newPurse();
    expect(dueOf({ mining: 49 }, p)).toEqual([]);
    expect(dueOf({ mining: 400 }, p).map((g) => g.id)).toEqual(["charmMinerLamp", "famBat", "thingSack"]);
    expect(takeGift(p, { mining: 40 }, "mining", 1)).toEqual({ ok: false, why: "rank" });
    for (const rank of [1, 2, 3]) { const did = takeGift(p, { mining: 400 }, "mining", rank); if (!did.ok) throw new Error(did.why); p = did.purse; }
    expect(giftsOf(p).had).toEqual(["charmMinerLamp", "famBat", "thingSack"]);
    expect(lightOf(p)).toBe(2);
    const worn = wearCharms(p, ["charmMinerLamp"]);
    if (!worn.ok) throw new Error(worn.why);
    expect(wearing(worn.purse, "charmMinerLamp")).toBe(true);
    expect(lightOf(worn.purse)).toBe(4);
    const bat = wearFamiliar(worn.purse, "famBat");
    expect(bat.ok && giftsOf(bat.purse).familiar).toBe("famBat");
  });
});
