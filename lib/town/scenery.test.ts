import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceneryKit } from "./scenery";
import { floorCorner, setCaveDay, toIso } from "./world";

/** A canvas retaining uploaded pixels, including the dirty rectangle of each upload. */
class Canvas {
  width = 0;
  height = 0;
  data = new Uint8ClampedArray();
  uploads = 0;
  getContext() {
    return {
      drawImage() {},
      getImageData: (x: number, y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) data.set([30 + x * 9 + i % 19, 70 + y * 7 + i % 23, 130 + i % 31, 255], i);
        return { data, width: w, height: h };
      },
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: (image: ImageData, _x: number, _y: number, _dx = 0, dy = 0, _w = image.width, h = image.height) => {
        if (!this.data.length) this.data = new Uint8ClampedArray(this.width * this.height * 4);
        const start = dy * image.width * 4, end = (dy + h) * image.width * 4;
        this.data.set(image.data.subarray(start, end), start);
        this.uploads++;
      },
    };
  }
}

const textures = Object.fromEntries(["grass", "plaza", "road", "water", "sand", "field", "wood", "rock", "snow", "cliff", "stair", "cavefloor", "cavewall", "caveface"].map((k, i) => [k, [i, 0, 4, 4]]));
const json = { v: 1 as const, image: "fixture", size: [64, 64] as [number, number], props: {}, textures };
const image = {} as HTMLImageElement;
const digest = (canvas: Canvas) => createHash("sha256").update(canvas.data).digest("hex");

function camera(kit: SceneryKit, floor: number) {
  const corner = floorCorner(floor), iso = toIso(corner.x + 16, corner.y + 16);
  return { s: 1, cx: kit.origin.x + (Math.floor((iso.x - kit.origin.x) / 512) + 0.5) * 512, cy: kit.origin.y + (Math.floor((iso.y - kit.origin.y) / 512) + 0.5) * 512 };
}
function screen() {
  let drawn: Canvas | null = null;
  const ctx = { save() {}, restore() {}, drawImage(canvas: Canvas) { drawn = canvas; }, imageSmoothingEnabled: false } as unknown as CanvasRenderingContext2D;
  return { ctx, canvas: () => drawn };
}
function finish(kit: SceneryKit, cam: ReturnType<typeof camera>, view: ReturnType<typeof screen>) {
  for (let i = 0; i < 200; i++) kit.drawGround(view.ctx, cam, 128, 128);
  return view.canvas()!;
}

beforeEach(() => {
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  let clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock += 0.25);
  setCaveDay(20369);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("ground painted across frames", () => {
  it("yields before finishing a chunk, then produces the same cave pixels as before", () => {
    const kit = new SceneryKit(json, image), cam = camera(kit, 11), view = screen();
    kit.drawGround(view.ctx, cam, 128, 128);
    const partial = view.canvas()!;
    expect(partial.uploads).toBe(1);
    expect(partial.data.slice(-512 * 4).every((n) => n === 0)).toBe(true);
    const complete = finish(kit, cam, view);
    // Recorded from the original renderer before splitting its work across frames.
    expect(digest(complete)).toMatchInlineSnapshot(`"ad3eb9acbc2fc27771c1d9fa14c4af8949c3182b8495df7ea6afe8264ee3c18f"`);
    const uploads = complete.uploads;
    kit.drawGround(view.ctx, cam, 128, 128);
    expect(complete.uploads).toBe(uploads);
  });

  it("abandons off-screen work and discards partial pixels when new textures arrive", () => {
    const kit = new SceneryKit(json, image), view = screen();
    kit.drawGround(view.ctx, camera(kit, 1), 128, 128);
    const abandoned = view.canvas()!;
    const cam = camera(kit, 12);
    kit.drawGround(view.ctx, cam, 128, 128);
    expect(view.canvas()).not.toBe(abandoned);
    const replaced = view.canvas()!;
    const updated = { ...json, textures: Object.fromEntries(Object.entries(textures).map(([k, t]) => [k, [t[0], 3, 4, 4]])) };
    kit.add(updated, image);
    const complete = finish(kit, cam, view);
    expect(complete).not.toBe(replaced);
    expect(digest(complete)).toMatchInlineSnapshot(`"fcfede996baa10dbb364baacb0360ebf4654edcf5c8870fc7680143e9c27d635"`);
    expect(abandoned.uploads).toBe(1);
    expect(replaced.uploads).toBe(1);
  });
});
