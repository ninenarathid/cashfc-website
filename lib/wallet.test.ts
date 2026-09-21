import { describe, expect, it } from "vitest";
import { fmtGil, loudestOf, walletProgress, type WalletDrop } from "@/lib/wallet";

/**
 * The bits of the wallet that are quietly wrong rather than broken.
 *
 * The bar is the whole feature — a number going up on a page nobody visits is
 * not a reward — and a bar that overflows its own box, or that says "0 gil to
 * go" while the button is still dead, is a bar that has stopped being an
 * answer. The figure beside it is what somebody compares against what is in
 * their purse in game, so it is grouped the way the game groups it, in both
 * languages. And a fanfare picked wrong is three of them in a row on a page
 * somebody opened to read one number.
 */

describe("walletProgress", () => {
  it("fills in proportion on the way up", () => {
    const got = walletProgress(125_000, 250_000);
    expect(got.pct).toBe(50);
    expect(got.left).toBe(125_000);
    expect(got.ready).toBe(false);
  });

  it("is ready exactly on the line, with nothing left to go", () => {
    const got = walletProgress(250_000, 250_000);
    expect(got.ready).toBe(true);
    expect(got.pct).toBe(100);
    expect(got.left).toBe(0);
  });

  // Filling past the bar is the point of a wallet somebody is allowed to leave
  // filling, so the percentage has to keep climbing while the bar itself stops.
  it("keeps counting past the line without overflowing the bar", () => {
    const got = walletProgress(380_000, 250_000);
    expect(got.pct).toBe(100);
    expect(got.over).toBe(152);
    expect(got.left).toBe(0);
    expect(got.ready).toBe(true);
  });

  it("is empty rather than infinite when there is no line to fill", () => {
    expect(walletProgress(10_000, 0)).toEqual(
      { pct: 0, over: 0, left: 0, ready: false });
  });
});

describe("fmtGil", () => {
  it("groups the way the game does", () => {
    expect(fmtGil(250_000)).toBe("250,000");
    expect(fmtGil(0)).toBe("0");
  });
});

const drop = (tier: WalletDrop["tier"]): WalletDrop => ({
  id: 1, amount: 10_000, prizeId: 1, name: "x", color: null, tier,
  seenAt: null, at: "2026-09-22",
});

describe("loudestOf", () => {
  // Somebody who has been away comes back to three at once, and three
  // fanfares in a row is a page nobody can read.
  it("plays the best of what arrived while they were away", () => {
    expect(loudestOf([drop("rare"), drop("ultra"), drop("super")])).toBe("ultra");
    expect(loudestOf([drop("rare"), drop("super")])).toBe("super");
  });

  it("is quiet rather than undefined when nothing arrived", () => {
    expect(loudestOf([])).toBe("rare");
  });
});
