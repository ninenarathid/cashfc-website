import { describe, expect, it } from "vitest";
import { LINES } from "./lines";
import { HATS, OUTFITS, onlyOwned, owns } from "./wear";

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

  it("takes off what is not had, and keeps a look that has everything as it is", () => {
    const look = { outfit: 1, hat: 1, faceWear: 0 };
    expect(onlyOwned(look, {})).toEqual({ outfit: 0, hat: 0, faceWear: 0 });
    const had = { farming: rank3("farming") };
    expect(onlyOwned(look, had)).toBe(look);
  });
});
