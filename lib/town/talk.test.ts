import { describe, expect, it } from "vitest";
import { ASK, CHATS, LINE_MAX, PAID, TALKS, WHO, askFor, chatFor, hello, talkFor, type Speaker } from "./talk";
import { KEEPERS } from "./world";

const SPEAKERS = Object.keys(TALKS) as Speaker[];

describe("what the shopkeepers say", () => {
  it("has something for everybody who keeps shop in town, and nobody else", () => {
    expect(SPEAKERS.sort()).toEqual(KEEPERS.map((k) => k.id).sort());
    for (const who of SPEAKERS) {
      expect(WHO[who].name.th).toBeTruthy();
      expect(WHO[who].name.en).toBeTruthy();
      expect(WHO[who].art).toHaveLength(2);
      expect(TALKS[who].length).toBeGreaterThanOrEqual(3);
    }
  });

  it("says every line in both languages, short enough for the box, with no emoji", () => {
    const lines = [PAID, ...SPEAKERS.flatMap((who) => [...TALKS[who].flat(), ...CHATS[who].flat(), ASK[who], ...[0, 6, 13, 18, 23].map((h) => hello(who, h))])];
    expect(lines.length).toBeGreaterThan(20);
    for (const l of lines) for (const text of [l.th, l.en]) {
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(3);
      expect(text.length).toBeLessThanOrEqual(LINE_MAX);
      // the town has no emoji anywhere (the owner's call)
      expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
    }
    // Thai lines are Thai, English ones are not
    for (const l of lines) {
      expect(/[฀-๿]/.test(l.th)).toBe(true);
      expect(/[฀-๿]/.test(l.en)).toBe(false);
    }
  });

  it("says no numbers: rates and limits live in the database", () => {
    for (const who of SPEAKERS) for (const l of [...TALKS[who].flat(), ...CHATS[who].flat(), ASK[who], PAID]) {
      expect(/\d/.test(l.th)).toBe(false);
      expect(/\d/.test(l.en)).toBe(false);
    }
  });

  it("greets by the hour, the same greeting through each part of the day", () => {
    for (const who of SPEAKERS) {
      expect(hello(who, 5)).toBe(hello(who, 11));
      expect(hello(who, 12)).toBe(hello(who, 16));
      expect(hello(who, 17)).toBe(hello(who, 21));
      expect(hello(who, 22)).toBe(hello(who, 4));
      expect(new Set([6, 13, 18, 23].map((h) => hello(who, h))).size).toBe(4);
      // any number is an hour
      expect(hello(who, 30)).toBe(hello(who, 6));
      expect(hello(who, -1)).toBe(hello(who, 23));
    }
  });

  it("opens with the greeting, then the next conversation in turn, round and round", () => {
    for (const who of SPEAKERS) {
      const n = TALKS[who].length;
      for (let turn = 0; turn < n; turn++) {
        const said = talkFor(who, 9, turn);
        expect(said[0]).toBe(hello(who, 9));
        expect(said.slice(1)).toEqual(TALKS[who][turn]);
      }
      expect(talkFor(who, 9, n)).toEqual(talkFor(who, 9, 0));
      expect(talkFor(who, 9, -1)).toEqual(talkFor(who, 9, n - 1));
    }
  });

  it("asks what you came for when it is open, and tells you when money is waiting", () => {
    for (const who of SPEAKERS) {
      expect(askFor(who, 9)).toEqual([hello(who, 9), ASK[who]]);
      // a chat is one of its own conversations, in turn, with no greeting before it
      const n = CHATS[who].length;
      expect(n).toBeGreaterThanOrEqual(3);
      for (let turn = 0; turn < n; turn++) expect(chatFor(who, turn)).toBe(CHATS[who][turn]);
      expect(chatFor(who, n)).toBe(CHATS[who][0]);
      // nothing an open stall says claims it is closed
      for (const l of [...CHATS[who].flat(), ASK[who]]) expect(/ยังไม่เปิด|not open/.test(l.th + l.en)).toBe(false);
    }
    expect(askFor("uncle", 9, true)).toEqual([hello("uncle", 9), PAID]);
    // only the uncle keeps money for anybody
    expect(askFor("banker", 9, true)).toEqual([hello("banker", 9), ASK.banker]);
  });
});
