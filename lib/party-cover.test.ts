import { describe, expect, test } from "vitest";
import type { ContentDef } from "@/lib/party";
import {
  COVER_H, COVER_RATIO, COVER_W, baseSize, clampCrop, coverKin, cropRect,
  isCoverPath, maxZoom, newCoverPath, outputSize, rankCovers, zoomAt,
} from "@/lib/party-cover";

const UID = "5b0c9d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e";

describe("the path a cover may have", () => {
  test("the shape the site writes passes, and so does every new one", () => {
    expect(isCoverPath(`${UID}/cover-1762934400000-a1b2c3.webp`)).toBe(true);
    for (const ext of ["webp", "jpg", "png"] as const) {
      expect(isCoverPath(newCoverPath(UID, ext))).toBe(true);
    }
  });
  test("anything else is refused", () => {
    for (const bad of [
      null, undefined, 3, "", "https://evil.example/x.png",
      `${UID}/../x.webp`, `${UID}/cover-1762934400000-a1b2c3.svg`,
      `${UID}/shot-1762934400000-a1b2c3.webp`, `${UID}/cover-1762934400000-a1b2c3.webp')`,
      `${UID.toUpperCase()}/cover-1762934400000-a1b2c3.webp`,
    ]) expect(isCoverPath(bad)).toBe(false);
  });
});

describe("the crop", () => {
  test("the stored size is the banner's shape", () => {
    expect(COVER_W / COVER_H).toBeCloseTo(COVER_RATIO, 5);
    expect(outputSize(4000)).toEqual({ w: COVER_W, h: COVER_H });
    expect(outputSize(1128)).toEqual({ w: 1128, h: 360 });
  });

  test("a wide picture is limited by its height, a tall one by its width", () => {
    const wide = baseSize(4000, 1000), tall = baseSize(1200, 3000);
    expect(wide.w).toBeCloseTo(1000 * COVER_RATIO, 6);
    expect(wide.h).toBeCloseTo(1000, 6);
    expect(tall.w).toBe(1200);
    expect(tall.h).toBeCloseTo(1200 / COVER_RATIO, 6);
  });

  test("it never leaves the picture, at any zoom", () => {
    const [iw, ih] = [3000, 2000];
    for (const c of [
      { cx: -500, cy: -500, zoom: 1 }, { cx: 99999, cy: 99999, zoom: 3 },
      { cx: 1500, cy: 1000, zoom: 99 }, { cx: 1500, cy: 1000, zoom: 0.1 },
    ]) {
      const k = clampCrop(c, iw, ih);
      const r = cropRect(k, iw, ih);
      expect(r.sx).toBeGreaterThanOrEqual(-1e-6);
      expect(r.sy).toBeGreaterThanOrEqual(-1e-6);
      expect(r.sx + r.sw).toBeLessThanOrEqual(iw + 1e-6);
      expect(r.sy + r.sh).toBeLessThanOrEqual(ih + 1e-6);
      expect(k.zoom).toBeGreaterThanOrEqual(1);
      expect(k.zoom).toBeLessThanOrEqual(maxZoom(iw, ih));
      expect(r.sw / r.sh).toBeCloseTo(COVER_RATIO, 5);
    }
  });

  test("a picture smaller than the banner can still be cropped, without zoom", () => {
    expect(maxZoom(300, 100)).toBe(1);
    const k = clampCrop({ cx: 150, cy: 50, zoom: 4 }, 300, 100);
    expect(k.zoom).toBe(1);
  });

  test("zooming holds the point under the finger", () => {
    const [iw, ih] = [4000, 3000];
    const c = clampCrop({ cx: 2000, cy: 1500, zoom: 1 }, iw, ih);
    const before = cropRect(c, iw, ih);
    const fx = 0.3, fy = 0.6;
    const px = before.sx + fx * before.sw, py = before.sy + fy * before.sh;
    const z = zoomAt(c, 2, fx, fy, iw, ih);
    const after = cropRect(z, iw, ih);
    expect(after.sx + fx * after.sw).toBeCloseTo(px, 5);
    expect(after.sy + fy * after.sh).toBeCloseTo(py, 5);
  });
});

describe("the gallery", () => {
  const row = (cover: string | null, key: string, at: string) =>
    ({ cover, content_key: key, created_at: at });
  const a = `${UID}/cover-1762934400000-aaaa.webp`;
  const b = `${UID}/cover-1762934400001-bbbb.webp`;
  const c = `${UID}/cover-1762934400002-cccc.webp`;

  test("most used first, then this very content, then the newest", () => {
    const got = rankCovers([
      row(a, "sav:M12S-1", "2026-11-01"), row(b, "sav:M12S-2", "2026-11-02"),
      row(b, "sav:M12S-2", "2026-11-03"), row(c, "sav:M12S-1", "2026-11-04"),
      row(b, "sav:M12S-1", "2026-11-05"), row(null, "sav:M12S-1", "2026-11-06"),
      row("https://evil.example/x.png", "sav:M12S-1", "2026-11-07"),
    ], "sav:M12S-1");
    expect(got.map((x) => [x.path, x.uses, x.same])).toEqual([
      [b, 3, true], [c, 1, true], [a, 1, true],
    ]);
  });

  test("a picture only its kin used is marked as such", () => {
    const got = rankCovers([row(a, "sav:M12S-2", "2026-11-01")], "sav:M12S-1");
    expect(got[0].same).toBe(false);
  });

  test("kin: the same key, the same duty, or the same banner", () => {
    const def = (key: string, duty?: string, art?: string) =>
      ({ key, kind: "savage", name: key, shape: "full", duty, art }) as ContentDef;
    const all = [
      def("sav:M12S-1", "AAC Heavyweight M4 (Savage)", "/duty/a.webp"),
      def("sav:M12S-2", "AAC Heavyweight M4 (Savage)", "/duty/a.webp"),
      def("ex:Necron", "Necron's Embrace", "/duty/n.webp"),
      def("other"),
    ];
    expect(coverKin(all[0], all).sort()).toEqual(["sav:M12S-1", "sav:M12S-2"]);
    expect(coverKin(all[3], all)).toEqual(["other"]);
    expect(coverKin(undefined, all)).toEqual([]);
  });
});
