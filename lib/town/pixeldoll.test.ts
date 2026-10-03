import { describe, expect, it } from "vitest";
import { facingFor, paintKeys } from "./pixeldoll";

// On screen, +x runs down to the right and +y down to the left. The art is drawn
// facing right (three-quarter towards the viewer, or away); mirroring gives the left.
describe("which way a walking doll faces", () => {
  it("down to the right: towards the viewer, as drawn", () => {
    expect(facingFor(1, 0)).toEqual({ view: "front", mirror: false });
  });
  it("down to the left: towards the viewer, mirrored", () => {
    expect(facingFor(0, 1)).toEqual({ view: "front", mirror: true });
  });
  it("up to the right: away, as drawn", () => {
    expect(facingFor(0, -1)).toEqual({ view: "back", mirror: false });
  });
  it("up to the left: away, mirrored", () => {
    expect(facingFor(-1, 0)).toEqual({ view: "back", mirror: true });
  });
  it("straight down the screen counts as towards the viewer", () => {
    expect(facingFor(1, 1).view).toBe("front");
  });
});

// The art's key colours: violet eyes, green hair (and fur, on a Miqo'te or a Viera), skin in exact ramp colours.
describe("a doll's colours", () => {
  const VIOLET = [120, 80, 200], GREEN = [60, 160, 70], SKIN = [226, 168, 124];
  const piece = () => new Uint8ClampedArray([...VIOLET, 255, ...GREEN, 255, ...SKIN, 255, 0, 0, 0, 0]);
  const strongest = (d: Uint8ClampedArray, i: number) => ["r", "g", "b"][[d[i], d[i + 1], d[i + 2]].indexOf(Math.max(d[i], d[i + 1], d[i + 2]))];

  it("green eyes stay green on a furry race, whatever colour the fur takes", () => {
    const d = piece();
    paintKeys(d, { eyes: "#3fb27f", fur: "#e0709a" });
    expect(strongest(d, 0)).toBe("g");   // the eye: green, not the hair's pink
    expect(strongest(d, 4)).toBe("r");   // the fur: pink
    expect([...d.slice(8, 11)]).toEqual(SKIN);   // no skin asked for: left alone
  });

  it("violet fur stays fur, and the eyes take their own colour", () => {
    const d = piece();
    paintKeys(d, { eyes: "#d4a017", fur: "#8a5cd8" });
    expect(strongest(d, 0)).toBe("r");   // amber eyes
    expect(strongest(d, 4)).toBe("b");   // violet fur, not amber
  });

  it("paints the skin's exact colours and nothing that only looks like them", () => {
    const d = new Uint8ClampedArray([...SKIN, 255, SKIN[0], SKIN[1], SKIN[2] + 1, 255]);
    paintKeys(d, { skin: new Map([[SKIN.join(","), [100, 110, 120]]]) });
    expect([...d.slice(0, 3)]).toEqual([100, 110, 120]);
    expect([...d.slice(4, 7)]).toEqual([SKIN[0], SKIN[1], SKIN[2] + 1]);
  });

  it("leaves see-through pixels alone", () => {
    const d = piece();
    paintKeys(d, { eyes: "#3fb27f", fur: "#e0709a" });
    expect([...d.slice(12, 16)]).toEqual([0, 0, 0, 0]);
  });
});
