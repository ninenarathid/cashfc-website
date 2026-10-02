import { describe, expect, it } from "vitest";
import {
  EYES, EYE_COLORS, GENDERS, HAIRS, HAIR_COLORS, LOOK_LENGTH, SKINS,
  decodeLook, defaultLook, encodeLook, hairForGender, hairsFor, randomLook, type Look,
} from "./look";

const at = (id: string) => HAIRS.findIndex((h) => h.id === id);
const every: Look = {
  gender: GENDERS.length - 1, hair: HAIRS.length - 1, hairColor: HAIR_COLORS.length - 1, eyeColor: EYE_COLORS.length - 1,
  skin: SKINS.length - 1, eyes: EYES.length - 1,
};
const plain = { skin: 4, eyes: 0 };

describe("the hairstyles", () => {
  it("are the creator's own lists: 14 for girls, 13 for boys", () => {
    expect(hairsFor(0)).toHaveLength(14);
    expect(hairsFor(1)).toHaveLength(13);
    expect(new Set(HAIRS.map((h) => h.id)).size).toBe(HAIRS.length);
  });

  it("move to the same place in the other gender's list", () => {
    expect(HAIRS[hairForGender(at("f05"), 1)].id).toBe("m05");
    expect(HAIRS[hairForGender(at("f14"), 1)].id).toBe("m13");
    expect(HAIRS[hairForGender(at("m01"), 0)].id).toBe("f01");
    expect(hairForGender(at("m08"), 1)).toBe(at("m08"));
  });
});

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

  it("puts a hairstyle from the other list in its place", () => {
    expect(HAIRS[decodeLook(encodeLook({ gender: 1, hair: at("f01"), hairColor: 0, eyeColor: 0, ...plain }))!.hair].id).toBe("m01");
  });

  it("refuses what another browser could send instead", () => {
    const good = encodeLook(every);
    for (const bad of [null, 42, "", "5" + good.slice(1), good + "0", good.slice(0, -1), good.toUpperCase(),
      // One past the end of the skin list (the fifth field).
      good.slice(0, 5) + SKINS.length.toString(36) + good.slice(6),
      // One past the end of a list (hair colours, the third field).
      good.slice(0, 3) + HAIR_COLORS.length.toString(36) + good.slice(4),
      good.slice(0, 2) + "!" + good.slice(3)]) {
      expect(decodeLook(bad)).toBeNull();
    }
  });
});

describe("looks written before", () => {
  it("version 3 keeps everything, with the skin as drawn and round eyes", () => {
    expect(decodeLook("31lb6")).toEqual({ gender: 1, hair: at("m08"), hairColor: 11, eyeColor: 6, ...plain });
    expect(HAIRS[decodeLook("310b6")!.hair].id).toBe("m01");
    for (const bad of ["31zb6", "3", "31lb", "31lbz"]) expect(decodeLook(bad)).toBeNull();
  });

  it("version 2 keeps gender and colours and takes the nearest hairstyle", () => {
    // a boy with a bob, ruby hair, amber eyes
    expect(decodeLook("213b6")).toEqual({ gender: 1, hair: at("m01"), hairColor: 11, eyeColor: 6, ...plain });
    // a girl with twin tails
    expect(HAIRS[decodeLook("200jh")!.hair].id).toBe("f10");
    for (const bad of ["273b6", "2", "213b", "213bz"]) expect(decodeLook(bad)).toBeNull();
  });

  it("version 1 (the paper doll) does the same", () => {
    // gender m, hair spiky, hair colour 7, eyes 2, eye colour 4, then brow, mouth, skin, outfit, blush
    expect(decodeLook("111724123a1")).toEqual({ gender: 1, hair: at("m12"), hairColor: 7, eyeColor: 4, ...plain });
    expect(HAIRS[decodeLook("1022341a2b1")!.hair].id).toBe("f06");
    expect(HAIRS[decodeLook("1002341a2b1")!.hair].id).toBe("f10");
    for (const bad of ["131724123a1", "113724123a1", "111724123a", "111724123a1x", "1117241!3a1"]) expect(decodeLook(bad)).toBeNull();
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

  it("wears a hairstyle from their own gender's list", () => {
    for (let i = 0; i < 300; i++) {
      const look = defaultLook(`m${i}`);
      expect(HAIRS[look.hair].g).toBe(look.gender);
    }
  });
});
