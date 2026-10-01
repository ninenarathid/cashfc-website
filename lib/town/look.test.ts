import { describe, expect, it } from "vitest";
import {
  BROWS, EYES, EYE_COLORS, GENDERS, HAIRS, HAIR_COLORS, LOOK_LENGTH, MOUTHS, OUTFITS, SKINS,
  decodeLook, defaultLook, encodeLook, randomLook, type Look,
} from "./look";

const every: Look = {
  gender: GENDERS.length - 1, hair: HAIRS.length - 1, hairColor: HAIR_COLORS.length - 1,
  eyes: EYES.length - 1, eyeColor: EYE_COLORS.length - 1, brow: BROWS.length - 1,
  mouth: MOUTHS.length - 1, skin: SKINS.length - 1, outfit: OUTFITS.length - 1, blush: true,
};

describe("a look, written down and read back", () => {
  it("comes back the same, at the last choice of every list", () => {
    const code = encodeLook(every);
    expect(code).toHaveLength(LOOK_LENGTH);
    expect(decodeLook(code)).toEqual(every);
  });

  it("comes back the same for a hundred random looks", () => {
    for (let i = 0; i < 100; i++) {
      const look = randomLook();
      expect(decodeLook(encodeLook(look))).toEqual(look);
    }
  });

  it("refuses what another browser could send instead", () => {
    const good = encodeLook(every);
    for (const bad of [null, 42, "", "2" + good.slice(1), good + "0", good.slice(0, -1), good.toUpperCase(),
      // One past the end of a list (hair colours, the third field).
      good.slice(0, 3) + HAIR_COLORS.length.toString(36) + good.slice(4),
      good.slice(0, 5) + "!" + good.slice(6)]) {
      expect(decodeLook(bad)).toBeNull();
    }
  });
});

describe("somebody who never went to the wardrobe", () => {
  it("looks the same on every screen", () => {
    expect(defaultLook("8d7e-member")).toEqual(defaultLook("8d7e-member"));
  });

  it("does not look like everybody else", () => {
    const codes = new Set(Array.from({ length: 40 }, (_, i) => encodeLook(defaultLook(`member-${i}`))));
    expect(codes.size).toBeGreaterThan(35);
  });

  it("gets a friendly face: open eyes and no frown", () => {
    for (let i = 0; i < 200; i++) {
      const look = defaultLook(`m${i}`);
      expect(["sparkle", "round", "sharp", "cat", "determined"]).toContain(EYES[look.eyes].id);
      expect(["smile", "happy", "grin"]).toContain(MOUTHS[look.mouth].id);
    }
  });
});
