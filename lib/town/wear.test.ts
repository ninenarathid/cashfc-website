import { describe, expect, it } from "vitest";
import { TAILOR } from "./tailor";
import { WEAR_MAX } from "./look";
import { LINES } from "./lines";
import { DRESS_ITEMS, FACE_WEAR, HAIR_WEAR, HATS, NECK_WEAR, OUTFITS, dropsFor, onlyOwned, owns, together, wearDropsRow } from "./wear";
import { WEAR_BAG, WEAR_CRAFTS } from "./wear-items";

const rank3 = (line: keyof typeof LINES) => LINES[line].marks[2];

describe("what is worn is had from the game (the owner, 2026-10-17)", () => {
  it("gives a line's outfit and hat at its rank 3, and the starter to everybody", () => {
    const farmer = OUTFITS.findIndex((o) => o.id === "farmer"), straw = HATS.findIndex((h) => h.id === "straw");
    expect(owns(OUTFITS[0], {})).toBe(true);
    expect(owns(OUTFITS[farmer], { farming: rank3("farming") - 1 })).toBe(false);
    expect(owns(OUTFITS[farmer], { farming: rank3("farming") })).toBe(true);
    expect(owns(HATS[straw], { farming: rank3("farming") })).toBe(true);
    // the mountain's outfit: either of its two lines
    const mountain = OUTFITS.findIndex((o) => o.id === "mountain");
    expect(owns(OUTFITS[mountain], { felling: rank3("felling") })).toBe(true);
  });

  it("has what is bought or found only when the database says so", () => {
    const glasses = FACE_WEAR.find((w) => w.id === "glasses")!;
    expect(owns(glasses, { insects: 1e9 })).toBe(false);
    expect(owns(glasses, {}, new Set(["glasses"]))).toBe(true);
  });

  it("takes off what is not had, and keeps a look that has everything as it is", () => {
    const look = { outfit: 1, hat: 1, faceWear: 0 };
    expect(onlyOwned(look, {})).toEqual({ outfit: 0, hat: 0, faceWear: 0 });
    const had = { farming: rank3("farming") };
    expect(onlyOwned(look, had)).toBe(look);
  });

  // (v277) the 46, and the animal line's herder and hat (2026-10-20): unique ids, every thing of the bag worn into a thing that is there, every drop rule a line's
  it("keeps every id once, and every thing of the bag is worn into a thing there is", () => {
    for (const list of [OUTFITS, HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR]) expect(new Set(list.map((w) => w.id)).size).toBe(list.length);
    const all = new Set([...OUTFITS, ...HATS, ...FACE_WEAR, ...NECK_WEAR, ...HAIR_WEAR].map((w) => w.id));
    for (const w of Object.values(DRESS_ITEMS)) expect(all.has(w!)).toBe(true);
    for (const id of Object.keys(WEAR_CRAFTS)) expect(WEAR_BAG[id as keyof typeof WEAR_BAG]).toBeTruthy();
    // (2026-10-25: Granny Twilla's forty and the auction's first four, past a digit a list no more: look version 7)
    expect([OUTFITS, HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR].map((l) => l.length)).toEqual([31, 29, 19, 20, 23]);
    for (const id of Object.keys(TAILOR)) expect(all.has(id) || id.startsWith("hair")).toBe(true);
    for (const l of [OUTFITS, HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR]) expect(l.length).toBeLessThanOrEqual(WEAR_MAX);
  });

  it("drops what the deed, the thing, the hour and the rain agree with, and nothing without points", () => {
    const always = () => 0;
    expect(dropsFor({ what: "fishing", thing: "minnow" }, { line: "fishing", raw: 1 }, 6, false, always)).toEqual(["sailor", "goggles"]);
    expect(dropsFor({ what: "fishing", thing: "minnow" }, { line: "fishing", raw: 1 }, 12, false, always)).toEqual(["goggles"]);
    expect(dropsFor({ what: "fishing", thing: "minnow" }, { line: "fishing", raw: 0 }, 6, false, always)).toEqual([]);
    expect(dropsFor({ what: "gather", thing: "shiitake" }, { line: "forest", raw: 2 }, 4, true, always).sort()).toEqual(["leaf", "mushroom", "raincoat"]);
    expect(dropsFor({ what: "net", thing: "monarch" }, { line: "insects", raw: 2 }, 12, false, always)).toEqual(["butterfly"]);
    expect(dropsFor({ what: "lamp_light", thing: null }, { line: "helpers", raw: 1 }, 20, false, always).sort()).toEqual(["flower", "lampcap", "lamplighter", "starpendant"]);
    // the flower's knob, where it is given; the hours across midnight
    expect(dropsFor({ what: "bell" }, { line: "helpers", raw: 1 }, 12, false, () => 0.5, { wear_flower_in_ten_thousand: 10000 })).toEqual(["flower"]);
    expect(dropsFor({ what: "bell" }, { line: "helpers", raw: 1 }, 12, false, () => 0.5)).toEqual([]);
    expect(wearDropsRow().length).toBe(17);
  });

  it("lets a hat and a thing on top of the head take turns, and keeps a clip at the side with a hat", () => {
    const ears = HAIR_WEAR.findIndex((w) => w.id === "catears"), clip = HAIR_WEAR.findIndex((w) => w.id === "starclip"), witch = HATS.findIndex((w) => w.id === "witch");
    expect(together({ hat: 0, hairWear: ears }, { hat: witch })).toEqual({ hat: witch, hairWear: 0 });
    expect(together({ hat: witch, hairWear: 0 }, { hairWear: ears })).toEqual({ hairWear: ears, hat: 0 });
    expect(together({ hat: witch, hairWear: 0 }, { hairWear: clip })).toEqual({ hairWear: clip });
    expect(together({ hat: 0, hairWear: clip }, { hat: witch })).toEqual({ hat: witch });
  });
});
