import { describe, expect, it } from "vitest";
import { giantSprite } from "./wide-plants";

describe("a giant over its four plots drawn as one", () => {
  it("keeps a sprout a plot while young, and is one picture grown and ripe", () => {
    expect(giantSprite("pumpkin", 3)).toBeNull();
    expect(giantSprite("pumpkin", 4)).toBe("giantPumpkinA");
    expect(giantSprite("pumpkin", 5)).toBe("giantPumpkinB");
  });
});
