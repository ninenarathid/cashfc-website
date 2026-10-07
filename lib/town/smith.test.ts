import { describe, expect, it } from "vitest";
import { SMITH_TALKS, SMITH_WHO, smithHello, smithTalk } from "./smith";
import { LINE_MAX } from "./talk";

describe("what the blacksmith says", () => {
  const lines = [...SMITH_TALKS.flat(), ...[0, 6, 13, 18, 23].map(smithHello)];

  it("has his name, what he does and his portrait, quiet and talking", () => {
    expect(SMITH_WHO.name).toEqual({ th: "ช่างตีเหล็ก", en: "The Blacksmith" });
    expect(SMITH_WHO.job.th).toBeTruthy();
    expect(SMITH_WHO.job.en).toBeTruthy();
    expect(SMITH_WHO.art).toEqual(["tk_smith", "tk_smith_o"]);
  });

  it("says every line in both languages, short enough for the box, with no emoji", () => {
    expect(lines.length).toBeGreaterThanOrEqual(12);
    for (const l of lines) for (const text of [l.th, l.en]) {
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(3);
      expect(text.length, text).toBeLessThanOrEqual(LINE_MAX);
      expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
    }
    for (const l of lines) {
      expect(/[฀-๿]/.test(l.th)).toBe(true);
      expect(/[฀-๿]/.test(l.en)).toBe(false);
    }
  });

  it("says no numbers, and offers nothing", () => {
    for (const l of lines) {
      expect(/\d/.test(l.th)).toBe(false);
      expect(/\d/.test(l.en)).toBe(false);
    }
  });

  it("greets by the hour, the same greeting through each part of the day", () => {
    expect(smithHello(5)).toBe(smithHello(11));
    expect(smithHello(12)).toBe(smithHello(16));
    expect(smithHello(17)).toBe(smithHello(21));
    expect(smithHello(22)).toBe(smithHello(4));
    expect(new Set([6, 13, 18, 23].map(smithHello)).size).toBe(4);
    expect(smithHello(30)).toBe(smithHello(6));
    expect(smithHello(-1)).toBe(smithHello(23));
  });

  it("has three short conversations, said in turn after the greeting: smelting ore, forging tools, setting gems", () => {
    expect(SMITH_TALKS.length).toBe(3);
    for (let turn = 0; turn < 3; turn++) {
      const said = smithTalk(9, turn);
      expect(said[0]).toBe(smithHello(9));
      expect(said.slice(1)).toEqual(SMITH_TALKS[turn]);
      expect(said.length).toBeLessThanOrEqual(5);
    }
    expect(smithTalk(9, 3)).toEqual(smithTalk(9, 0));
    expect(smithTalk(9, -1)).toEqual(smithTalk(9, 2));
    const about = SMITH_TALKS.map((talk) => talk.map((l) => l.en).join(" ").toLowerCase());
    expect(about[0]).toMatch(/smelt/);
    expect(about[1]).toMatch(/forge/);
    expect(about[2]).toMatch(/gem/);
  });

  it("says in every conversation that his forge is not open yet", () => {
    for (const talk of SMITH_TALKS) {
      const last = talk[talk.length - 1];
      expect(last.en).toMatch(/n't open|not open/i);
      expect(last.th).toMatch(/ยังไม่เปิด/);
    }
  });
});
