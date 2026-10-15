import { describe, expect, it } from "vitest";
import { wideSprite } from "./wide-plants";

describe("a plant over several plots drawn as one", () => {
  it("keeps a sprout a plot while young, and is one picture grown and ripe", () => {
    expect(wideSprite("blueCorn", false, 3, [[0, 0], [1, 0], [2, 0]])).toBeNull();
    expect(wideSprite("blueCorn", false, 4, [[0, 0], [0, 1], [0, 2]])).toEqual({ name: "wideBlueCornA", flip: false, giant: false });
    expect(wideSprite("blueCorn", false, 5, [[0, 0], [1, 0], [2, 0]])).toEqual({ name: "wideBlueCornB", flip: true, giant: false });
    expect(wideSprite("pumpkin", true, 5, [[0, 0], [1, 0], [0, 1], [1, 1]])).toEqual({ name: "giantPumpkinB", flip: false, giant: true });
    expect(wideSprite("tomato", false, 5, [[0, 0], [1, 0]])).toBeNull();
  });
  it("shows an L from the front, the back or the side", () => {
    // the corner at (1,0): the others at (0,0) (up-left) and (1,1) (down-right): one either side, so the side view
    expect(wideSprite("bottleGourd", false, 5, [[0, 0], [1, 0], [1, 1]])?.name).toBe("wideBottleGourdSideB");
    // the corner in front, the others behind it
    expect(wideSprite("bottleGourd", false, 5, [[1, 1], [0, 1], [1, 0]])?.name).toBe("wideBottleGourdFrontB");
    // the corner behind, the others in front of it
    expect(wideSprite("sunflowerPatch", false, 4, [[0, 0], [1, 0], [0, 1]])?.name).toBe("wideSunflowerPatchBackA");
  });
});
