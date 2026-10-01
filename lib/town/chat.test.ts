import { describe, expect, it } from "vitest";
import { CHAT_BUDGET, CHAT_MAX, Flood, chatEvery, cleanChat, wrapLines } from "./chat";

describe("cleaning a line", () => {
  it("keeps one plain line", () => {
    expect(cleanChat("  สวัสดี\nทุกคน\t555  ")).toBe("สวัสดี ทุกคน 555");
  });

  it("drops control, zero-width and direction-flipping characters", () => {
    const [rlo, zwsp, bell] = [0x202e, 0x200b, 0x07].map((c) => String.fromCharCode(c));
    expect(cleanChat(`a${rlo}b${zwsp}c${bell}d`)).toBe("a b c d");
  });

  it("is empty for nothing, or for something that is not text", () => {
    expect(cleanChat("   ")).toBe("");
    expect(cleanChat(42)).toBe("");
    expect(cleanChat(null)).toBe("");
  });

  it("stops at CHAT_MAX letters without splitting a Thai letter from its marks", () => {
    const long = "ที่".repeat(CHAT_MAX + 20);
    const out = cleanChat(long);
    expect(out).toBe("ที่".repeat(CHAT_MAX));
  });
});

describe("pacing", () => {
  it("lets a small room type freely", () => {
    expect(chatEvery(2)).toBe(700);
    expect(chatEvery(10)).toBe(700);
  });

  it("keeps a whole room's chat within its budget, even typing nonstop", () => {
    for (let n = 2; n <= 40; n++) {
      expect((n * (n - 1) * 1000) / chatEvery(n)).toBeLessThanOrEqual(CHAT_BUDGET);
    }
  });

  it("drops a flood from one person, and only theirs", () => {
    const f = new Flood(5, 5_000);
    const now = 1_000;
    const fromA = [0, 1, 2, 3, 4, 5].map((i) => f.allow("a", now + i));
    expect(fromA).toEqual([true, true, true, true, true, false]);
    expect(f.allow("b", now + 6)).toBe(true);
    expect(f.allow("a", now + 5_001)).toBe(true);
  });
});

describe("bubbles", () => {
  const measure = (s: string) => Array.from(s).length * 10;

  it("breaks between words", () => {
    expect(wrapLines("hello there my friend", 120, measure)).toEqual(["hello there", "my friend"]);
  });

  it("breaks Thai between words though it has no spaces", () => {
    const lines = wrapLines("วันนี้ไปตีบอสกันไหม", 80, measure);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("วันนี้ไปตีบอสกันไหม");
  });

  it("breaks a word too long for a line between letters", () => {
    expect(wrapLines("aaaaaaaaaaaaaaa", 50, measure)).toEqual(["aaaaa", "aaaaa", "aaaaa"]);
  });

  it("stops at three lines and says there was more", () => {
    const lines = wrapLines("one two three four five six seven eight nine ten", 60, measure);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
    expect(measure(lines[2])).toBeLessThanOrEqual(60);
  });
});
