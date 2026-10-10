import { describe, expect, it } from "vitest";
import { CANVAS_PIXELS, canvasDpr } from "./rendering";

describe("the town's canvas on large and dense screens", () => {
  it("keeps Full HD at native resolution and a small phone at twice its CSS resolution", () => {
    expect(canvasDpr(1920, 1080, 1)).toBe(1);
    expect(canvasDpr(390, 844, 3)).toBe(2);
    expect(canvasDpr(800, 600, 1)).toBe(1);
  });

  it("does not ask a large window or a dense laptop to repaint more than a Full HD image", () => {
    for (const [width, height, deviceRatio] of [[3840, 2160, 1], [2560, 1440, 2], [1920, 1080, 2], [3440, 1440, 1]]) {
      const ratio = canvasDpr(width, height, deviceRatio);
      const pixels = Math.round(width * ratio) * Math.round(height * ratio);
      // Rounding either canvas edge can add less than one row and one column.
      expect(pixels).toBeLessThanOrEqual(CANVAS_PIXELS + width + height);
      expect(ratio).toBeLessThanOrEqual(deviceRatio);
    }
    expect(canvasDpr(3840, 2160, 1)).toBe(0.5);
  });

  it("keeps pointer positions and the visible map in the same CSS coordinates", () => {
    const width = 3840, height = 2160, ratio = canvasDpr(width, height, 1);
    const canvasWidth = Math.round(width * ratio), canvasHeight = Math.round(height * ratio);
    expect(canvasWidth / ratio).toBe(width);
    expect(canvasHeight / ratio).toBe(height);
  });

  it("handles a stage not yet laid out without a zero or infinite scale", () => {
    expect(canvasDpr(0, 0, 0)).toBe(1);
    expect(canvasDpr(0, 0, 2)).toBe(2);
  });
});
