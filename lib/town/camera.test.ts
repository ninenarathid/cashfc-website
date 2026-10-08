import { describe, expect, it } from "vitest";
import {
  ISO_MAX_X, ISO_MAX_Y, ISO_MIN_X, ISO_MIN_Y, MAX_SCALE, MIN_SCALE, MIN_SCALE_PHONE, MOST_TILES_ACROSS, PAD, START_DESK, START_PHONE,
  clampCam, clampScale, fitScale, minScale, startScale, toIsoPoint, toScreen, zoomAt,
} from "./camera";

const desk = { w: 1280, h: 736 };
const phone = { w: 390, h: 780 };

describe("the camera's zoom", () => {
  it("starts close, on a wide screen and on a phone, never past MAX_SCALE", () => {
    expect(startScale(desk.w, desk.h)).toBe(START_DESK);
    expect(startScale(phone.w, phone.h)).toBe(START_PHONE);
    expect(startScale(desk.w, desk.h)).toBeGreaterThan(fitScale(desk.w, desk.h) * 2);
    expect(startScale(99999, 99999)).toBeLessThanOrEqual(MAX_SCALE);
  });

  it("goes in no further than MAX_SCALE, and out only to about a town's width", () => {
    expect(clampScale(99, desk.w, desk.h)).toBe(MAX_SCALE);
    expect(clampScale(0.01, desk.w, desk.h)).toBeCloseTo(minScale(desk.w, desk.h));
    // a wide screen: never smaller than the art's own pixels, nor more tiles across than the starter town is wide,
    // whichever stops it sooner; far closer than the whole map
    expect(minScale(desk.w, desk.h)).toBe(Math.max(MIN_SCALE, desk.w / (MOST_TILES_ACROSS * 64)));
    expect(minScale(desk.w, desk.h)).toBeGreaterThan(fitScale(desk.w, desk.h) * 2);
    // a large monitor is stopped by the tiles across it, a small window by the art's own pixels
    expect(2560 / minScale(2560, 1440) / 64).toBeCloseTo(MOST_TILES_ACROSS, 6);
    expect(minScale(1024, 700)).toBe(MIN_SCALE);
    // a phone's finer screen goes a little further out, and no further (it went to 0.55 until 2026-10-09: the owner,
    // "ช่วยล็อคไม่ให้ zoom out ได้มากจนเกินไป")
    expect(minScale(phone.w, phone.h)).toBe(MIN_SCALE_PHONE);
    expect(MIN_SCALE_PHONE).toBeGreaterThanOrEqual(0.8);
    expect(clampScale(0.55, phone.w, phone.h)).toBe(MIN_SCALE_PHONE);
    // and furthest out is still further than where it starts
    expect(minScale(desk.w, desk.h)).toBeLessThan(startScale(desk.w, desk.h));
    expect(minScale(phone.w, phone.h)).toBeLessThan(startScale(phone.w, phone.h));
  });

  it("keeps the point under the fingers where it was", () => {
    const cam = clampCam({ s: 1.2, cx: 40, cy: 300 }, desk.w, desk.h);
    const before = toIsoPoint(cam, 700, 400, desk.w, desk.h);
    const after = zoomAt(cam, 1.8, 700, 400, desk.w, desk.h);
    const p = toScreen(after, before, desk.w, desk.h);
    expect(p.x).toBeCloseTo(700, 4);
    expect(p.y).toBeCloseTo(400, 4);
  });
});

describe("the map stays on the screen", () => {
  it("sits in the middle when it is smaller than the screen", () => {
    const cam = clampCam({ s: fitScale(desk.w, desk.h) * 0.6, cx: 500, cy: -400 }, desk.w, desk.h);
    expect(cam.cx).toBeCloseTo((ISO_MIN_X + ISO_MAX_X) / 2);
    expect(cam.cy).toBeCloseTo((ISO_MIN_Y + ISO_MAX_Y) / 2);
  });

  it("can be panned only as far as its edges when larger", () => {
    const s = 2;
    const far = clampCam({ s, cx: 1e6, cy: 1e6 }, phone.w, phone.h);
    expect(toScreen(far, { x: ISO_MAX_X, y: ISO_MAX_Y }, phone.w, phone.h).x).toBeCloseTo(phone.w - PAD);
    expect(toScreen(far, { x: ISO_MAX_X, y: ISO_MAX_Y }, phone.w, phone.h).y).toBeCloseTo(phone.h - PAD);
    const near = clampCam({ s, cx: -1e6, cy: -1e6 }, phone.w, phone.h);
    expect(toScreen(near, { x: ISO_MIN_X, y: ISO_MIN_Y }, phone.w, phone.h).x).toBeCloseTo(PAD);
  });
});
