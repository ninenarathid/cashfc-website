import { describe, expect, it } from "vitest";
import { CLUES, KIND_WORD, clueOf, dayPart, growsIn, seedTime } from "./clues";
import { RECIPE_IDS, needsOf } from "./cooking";
import { toldOf } from "./hints";
import { BAITS, CROPS, CROP_IDS, FISH, FISH_IDS, ITEMS, ITEM_IDS, type ItemId } from "./items";

/** A thing's clue as one string, to tell which things are told alike. */
const told = (id: ItemId) => { const c = clueOf(id); return `${ITEMS[id].kind}|${c.sort.th}|${c.from?.th ?? ""}`; };
/** The thing each recipe will not name, each once. */
const HIDDEN = [...new Set(RECIPE_IDS.map((r) => needsOf(r).at(-1)![0]))];

describe("the clues of a recipe's hidden thing", () => {
  it("every thing has a sort, in both languages; and every thing a recipe hides has its whereabouts too", () => {
    for (const id of ITEM_IDS) {
      const c = clueOf(id);
      expect(c.sort.th.length, id).toBeGreaterThan(3);
      expect(c.sort.en.length, id).toBeGreaterThan(3);
      if (c.from) { expect(c.from.th.length, id).toBeGreaterThan(3); expect(c.from.en.length, id).toBeGreaterThan(3); }
    }
    for (const id of HIDDEN) expect(clueOf(id).from, id).not.toBeNull();
  });

  it("leaves a handful to choose among, where a kind alone left dozens (the owner: \"ขอบเขตุการหามันเยอะเกินไป\")", () => {
    const alike = new Map<string, ItemId[]>();
    for (const id of ITEM_IDS) alike.set(told(id), [...(alike.get(told(id)) ?? []), id]);
    const kinds = new Map<string, number>();
    for (const id of ITEM_IDS) kinds.set(ITEMS[id].kind, (kinds.get(ITEMS[id].kind) ?? 0) + 1);
    for (const id of HIDDEN) {
      const among = alike.get(told(id))!.length;
      expect(among, `${id}: ${told(id)}`).toBeLessThanOrEqual(7);
      // never wider than its kind was
      expect(among).toBeLessThanOrEqual(kinds.get(ITEMS[id].kind)!);
    }
    // what set this off: something from the forest was one of thirty-five things; now one of three at the most
    expect(kinds.get("wild")).toBeGreaterThan(30);
    for (const id of HIDDEN.filter((h) => ITEMS[h].kind === "wild")) expect(alike.get(told(id))!.length, id).toBeLessThanOrEqual(3);
  });

  it("never names the thing, and never a fish's bait (what a bait brings is the anglers' to find)", () => {
    for (const id of HIDDEN) {
      const c = clueOf(id), said = [c.sort.th, c.from?.th ?? ""].join(" "), saidEn = [c.sort.en, c.from?.en ?? ""].join(" ").toLowerCase();
      expect(said, id).not.toContain(ITEMS[id].name.th);
      expect(saidEn, id).not.toContain(ITEMS[id].name.en.toLowerCase());
    }
    for (const id of FISH_IDS.filter((f) => ITEMS[f].kind === "fish")) {
      const c = clueOf(id), said = `${c.sort.th} ${c.from?.th}`, saidEn = `${c.sort.en} ${c.from?.en}`.toLowerCase();
      for (const bait of BAITS) {
        expect(said, `${id} / ${bait}`).not.toContain(ITEMS[bait as ItemId].name.th);
        expect(saidEn, `${id} / ${bait}`).not.toContain(ITEMS[bait as ItemId].name.en.toLowerCase());
      }
      // (nor what it waits for beyond the hour and the sky: only that it waits for something)
      if (FISH[id].needs?.length) expect(c.from!.en).toContain("only on certain occasions");
    }
  });

  it("tells the forest's things by their kind of place and their part of the forest", () => {
    expect(clueOf("shiitake")).toEqual({ sort: { th: "เห็ดสักอย่าง", en: "some mushroom" }, from: { th: "พบได้ทั่วป่า", en: "anywhere in the forest" } });
    expect(clueOf("truffle").sort.en).toBe("something dug out of the ground");
    expect(clueOf("truffle").from!.en).toBe("around the deep woods");
    expect(clueOf("mint").from!.th).toBe("แถวชายป่าหรือริมลำธาร");
    expect(clueOf("wildApple").sort.en).toBe("something shaken down from a tree");
    expect(clueOf("chestnut").from!.en).toBe("in several parts of the forest");
  });

  it("tells a fish by how common it is, its water and its hours", () => {
    expect(clueOf("catfish").sort.en).toBe("a common fish or river creature");
    expect(clueOf("catfish").from!.en).toBe("off the bank or the deck · by night");
    expect(clueOf("salmon").from!.en).toContain("only in the rain");
    expect(clueOf("nilePerch").from!.en).toContain("never in the rain");
    expect(clueOf("mussel").from!.en).toBe("off the bank · at any hour");
    expect(dayPart([[5, 8], [17, 20]]).en).toBe("at dawn and dusk");
    expect(dayPart([[17, 24]]).en).toBe("in the evening");
    expect(dayPart([[21, 24], [0, 4]]).en).toBe("by night");
    expect(dayPart([[5, 22]]).en).toBe("from morning till night");
    expect(dayPart([[4, 8]]).en).toBe("in the morning");
    expect(dayPart([[9, 16]]).en).toBe("by day");
  });

  it("tells a vegetable by what it is grown from and how long it takes; a seed's card says the same of its plant", () => {
    expect(clueOf("garlic")).toEqual({ sort: { th: "ผักที่ปลูกจากหัว", en: "a plant grown from a bulb" }, from: { th: "ใช้เวลาโต ราว 3 วัน", en: "ripe in about three days" } });
    // the same words on the seed as in the clue, so that one can be matched to the other at the uncle's shelf
    for (const crop of CROP_IDS) expect(seedTime(CROPS[crop].seed)).toEqual(clueOf(crop).from);
    expect(seedTime("garlic")).toBeNull();
    expect(seedTime("rod")).toBeNull();
    // round words, never the hours themselves
    expect([6, 12, 13, 24, 36, 48, 60, 72, 96, 120, 144, 168, 240, 288].map((h) => growsIn(h).en)).toEqual([
      "under half a day", "under half a day", "about a day", "about a day", "about two days", "about two days", "about three days", "about three days",
      "four or five days", "four or five days", "about a week", "about a week", "over a week", "over a week"]);
    for (const crop of CROP_IDS) expect(clueOf(crop).from!.th).not.toMatch(/ชั่วโมง|ชม\./);
  });

  it("tells a staple by how early the uncle has it, and what is made by what it is made with", () => {
    expect(clueOf("salt")).toEqual({ sort: KIND_WORD.staple, from: { th: "ลุงมีขายตั้งแต่แรก", en: "on the uncle's shelf from the first" } });
    expect(clueOf("oil").from!.en).toBe("among the first things the uncle adds");
    expect(clueOf("cheese").from!.en).toBe("among the last things the uncle adds");
    expect(clueOf("fishSauce").sort.en).toBe(`something made with a ${ITEMS.pot.name.en.toLowerCase()}`);
    expect(clueOf("rope")).toEqual({ sort: { th: "ของที่ทำด้วยมือเปล่า", en: "something made by hand" }, from: { th: "ทำจากของ 1 อย่าง", en: "made of one thing" } });
    expect(clueOf("hyacinth").from!.en).toBe("comes up on a line in a fish's place");
  });

  it("says more the oftener a recipe is missed by that thing alone: what it looks like, then its shadow; never before", () => {
    expect(CLUES.looks).toBe(1);
    expect(CLUES.shadow).toBeGreaterThan(CLUES.looks);
    const fresh = toldOf("mushroomSoup").last!;
    expect(fresh).toEqual({ kind: "wild", n: 3, sort: { th: "เห็ดสักอย่าง", en: "some mushroom" }, from: { th: "พบได้ทั่วป่า", en: "anywhere in the forest" } });
    expect(toldOf("mushroomSoup", false, 1).last).toEqual({ ...fresh, looks: ITEMS.shiitake.about });
    expect(toldOf("mushroomSoup", false, 2).last!.shadow).toBeUndefined();
    expect(toldOf("mushroomSoup", false, 3).last).toEqual({ ...fresh, looks: ITEMS.shiitake.about, shadow: "shiitake" });
    // whoever has made it reads all of it, and nothing is hidden
    expect(toldOf("mushroomSoup", true, 9).last).toBeNull();
  });
});
