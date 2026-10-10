import { afterEach, expect, it, vi } from "vitest";
import { MountainArt, type MoreFrame } from "../../components/town/mountain-art";
import { floorCorner } from "./world";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("draws the cave's darkness and minimap in production without reading pixels back", () => {
  vi.stubEnv("NODE_ENV", "production");
  const read = vi.fn(() => { throw new Error("GPU readback should not be needed to draw the cave"); });
  const paint = vi.fn();
  const ctx = {
    save() {}, restore() {}, fillRect() {}, clearRect() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {},
    drawImage: paint,
    getImageData: read,
    createRadialGradient: () => ({ addColorStop() {} }),
  } as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const corner = floorCorner(1), me = { id: "viewer", x: corner.x + 16, y: corner.y + 16 };
  const art = new MountainArt({ me: () => me, walk: () => true, warp: () => true });
  const frame = {
    ctx, s: 1, cw: 1280, ch: 720, dpr: 1, now: 1000,
    place: "cave", me, others: [], still: true,
    project: () => ({ x: 640, y: 360 }), glow() {},
  } as unknown as MoreFrame;
  art.darkness(frame);
  art.darkness({ ...frame, now: 2000 });
  expect(read).not.toHaveBeenCalled();
  expect(paint).toHaveBeenCalled();
});
