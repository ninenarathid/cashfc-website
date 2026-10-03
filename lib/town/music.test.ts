import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HAVE, PARTS, fileAt, gainOf, partOf, pieceAt } from "./music";

const DAY = [...Array(24).keys()];

describe("the town's music", () => {
  it("has a piece for every hour of the day: its own, or one of its part of the day", () => {
    expect(HAVE.length).toBeGreaterThan(0);
    for (const h of DAY) {
      const p = pieceAt(h);
      expect(HAVE).toContain(p);
      if (HAVE.includes(h)) expect(p).toBe(h);
      else if (HAVE.some((x) => partOf(x) === partOf(h))) expect(partOf(p)).toBe(partOf(h));
    }
    expect(pieceAt(24)).toBe(pieceAt(0));
    expect(pieceAt(-1)).toBe(pieceAt(23));
    expect(pieceAt(8.9)).toBe(pieceAt(8));
  });

  it("divides the day into parts that leave no hour out and share none", () => {
    for (const h of DAY) expect(PARTS.filter(([from, to]) => (from <= to ? h >= from && h <= to : h >= from || h <= to))).toHaveLength(1);
    expect([22, 2, 5, 6, 11, 12, 17, 18, 21].map(partOf)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("lends an hour the nearest piece of its own part of the day", () => {
    // the first four pieces, one to a part
    expect(DAY.map((h) => pieceAt(h, [8, 16, 19, 23])))
      .toEqual([23, 23, 23, 23, 23, 23, 8, 8, 8, 8, 8, 8, 16, 16, 16, 16, 16, 16, 19, 19, 19, 19, 23, 23]);
    // as more come: the night's 02 is nearer the small hours than 23 is, and dawn takes the morning's first
    const more = [2, 7, 8, 16, 19, 23];
    expect([22, 0, 1, 3, 4, 5].map((h) => pieceAt(h, more))).toEqual([23, 23, 2, 2, 2, 2]);
    expect(pieceAt(6, more)).toBe(7);
    expect(pieceAt(11, more)).toBe(8);
    // of two as near, the lower hour; and a part with no piece takes the nearest of the day
    expect(pieceAt(14, [12, 16])).toBe(12);
    expect(pieceAt(13, [8, 23])).toBe(8);
    expect(pieceAt(20, [8, 23])).toBe(23);
  });

  it("keeps each piece in public/town, under the name of its content", () => {
    for (const h of HAVE) {
      const file = fileAt(h);
      expect(file).toMatch(new RegExp(`^/town/music-${String(h).padStart(2, "0")}-[0-9a-f]{10}\\.mp3$`));
      const bytes = readFileSync(`public${file}`);
      expect(createHash("sha256").update(bytes).digest("hex").slice(0, 10)).toBe(file.slice(-14, -4));
      // an MP3 with no tag in front of it (the build takes them off): it begins with a frame
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1] & 0xe0).toBe(0xe0);
    }
  });

  it("is soft at the volume it starts at, and at the top no louder than the file", () => {
    expect(gainOf(0)).toBe(0);
    expect(gainOf(1)).toBe(1);
    expect(gainOf(2)).toBe(1);
    expect(gainOf(-1)).toBe(0);
    expect(gainOf(0.3)).toBeGreaterThan(0.12);
    expect(gainOf(0.3)).toBeLessThan(0.2);
    for (let v = 0.05; v <= 1; v += 0.05) expect(gainOf(v)).toBeGreaterThan(gainOf(v - 0.05));
  });
});
