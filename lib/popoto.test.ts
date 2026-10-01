import { describe, expect, it } from "vitest";
import {
  periodStart, splitPopoto, splitPopotoLikes,
  type PopotoPost, type PopotoTag,
} from "@/lib/popoto";

/**
 * The popoto boards' arithmetic.
 *
 * Two things here are easy to get quietly wrong. A month has to start at the
 * FC's midnight and not the server's, or the first seven hours of every month
 * belong to the one before. And a month's gallery board counts the potatoes
 * pressed that month, shared the same way as all of them are, so it can never
 * disagree with the all-time board about who is in a picture.
 */

describe("periodStart", () => {
  it("starts a month and a year at midnight in Bangkok", () => {
    const now = new Date("2026-10-15T09:00:00Z");
    expect(periodStart("month", now)).toBe("2026-10-01T00:00:00+07:00");
    expect(periodStart("year", now)).toBe("2026-01-01T00:00:00+07:00");
    expect(periodStart("all", now)).toBeNull();
  });

  it("is already in the new month at half past midnight Thai time", () => {
    // 17:30 UTC on the 30th is 00:30 on the 1st in Bangkok.
    const now = new Date("2026-09-30T17:30:00Z");
    expect(periodStart("month", now)).toBe("2026-10-01T00:00:00+07:00");
  });

  it("is still in the old month a minute before Thai midnight", () => {
    const now = new Date("2026-09-30T16:59:00Z");
    expect(periodStart("month", now)).toBe("2026-09-01T00:00:00+07:00");
  });

  it("turns the year at Thai midnight on New Year's Eve", () => {
    expect(periodStart("year", new Date("2026-12-31T16:59:00Z")))
      .toBe("2026-01-01T00:00:00+07:00");
    expect(periodStart("year", new Date("2026-12-31T17:00:00Z")))
      .toBe("2027-01-01T00:00:00+07:00");
  });
});

describe("splitPopotoLikes", () => {
  const posts: PopotoPost[] = [
    // Three people in it: the owner and two confirmed tags.
    { id: 1, character_id: 10, like_count: 9 },
    // Only the owner.
    { id: 2, character_id: 20, like_count: 4 },
    // Nobody to give it to.
    { id: 3, character_id: null, like_count: 2 },
  ];
  const tags: PopotoTag[] = [
    { post_id: 1, character_id: 11, confirmed_at: "2026-09-01T00:00:00Z" },
    { post_id: 1, character_id: 12, confirmed_at: "2026-09-02T00:00:00Z" },
    // Not agreed to, so not a sharer.
    { post_id: 2, character_id: 21, confirmed_at: null },
  ];

  it("counts only the likes it is given, shared by everybody in the picture", () => {
    const got = splitPopotoLikes(posts, tags, [
      { post_id: 1 }, { post_id: 1 }, { post_id: 1 }, { post_id: 2 }, { post_id: 3 },
    ]);
    expect(got.get(10)).toEqual({ score: 1, n: 1 });
    expect(got.get(11)).toEqual({ score: 1, n: 1 });
    expect(got.get(12)).toEqual({ score: 1, n: 1 });
    expect(got.get(20)).toEqual({ score: 1, n: 1 });
    expect(got.has(21)).toBe(false);
    expect([...got.keys()].sort()).toEqual([10, 11, 12, 20]);
  });

  it("leaves out a picture nobody pressed in the period", () => {
    const got = splitPopotoLikes(posts, tags, [{ post_id: 2 }]);
    expect([...got.keys()]).toEqual([20]);
    expect(got.get(20)).toEqual({ score: 1, n: 1 });
  });

  it("agrees with the all-time split when given every like", () => {
    const every = posts.flatMap((p) =>
      Array.from({ length: p.like_count ?? 0 }, () => ({ post_id: p.id })));
    expect(splitPopotoLikes(posts, tags, every)).toEqual(splitPopoto(posts, tags));
  });
});
