import { describe, expect, it } from "vitest";
import { admit, fromRoom, hears, listed, newCircle, readWord, without } from "./circle";
import { SIGN, decodeSign, encodeSign, inReach, mayRaise, tidyTitle } from "./sign";
import { GATES, walkable } from "./world";

describe("a sign held up over one's head (the owner: \"ตั้งห้องแชท บนหัวผู้เล่น … ต้องนั่ง หรือ ยืนเฉยๆ\")", () => {
  it("is told to the room as its kind and its title, and read back the same", () => {
    for (const s of [
      { kind: "chat" as const, title: "คุยเรื่องตกปลา", n: 3, sells: false, buys: false },
      { kind: "shop" as const, title: "ผักสด | fresh", n: 0, sells: true, buys: false },
      { kind: "shop" as const, title: "", n: 0, sells: true, buys: true },
    ]) expect(decodeSign(encodeSign(s))).toEqual(s);
    expect(encodeSign({ kind: "shop", title: "a", n: 0, sells: false, buys: true })).toBe("s2|a");
    expect(encodeSign({ kind: "chat", title: "a", n: 99, sells: false, buys: false })).toBe(`c${SIGN.cap}|a`);
  });

  it("is none when nothing is held up, or what came is no sign", () => {
    for (const raw of ["", "x1|a", "c0|a", "c9|a", "s4|a", "c3", 7, null, undefined, { kind: "chat" }, `c1|${"a".repeat(500)}`]) expect(decodeSign(raw)).toBeNull();
  });

  it("has a title of one clean line, no longer than the sign is wide, a Thai mark kept with its letter", () => {
    expect(tidyTitle("  รับซื้อ\nปลา‮ ")).toBe("รับซื้อ ปลา");
    const long = "น้ำ".repeat(40), cut = tidyTitle(long);
    // ("น้ำ" is one letter as a person counts them)
    expect(cut).toBe("น้ำ".repeat(SIGN.title));
    expect(decodeSign(`c2|${long}`)?.title).toBe(cut);
    expect(tidyTitle(12)).toBe("");
  });

  it("is not held up in a gateway, nor off the map", () => {
    expect(mayRaise({ x: 31.5, y: 20.5 })).toBe(true);
    expect(mayRaise({ x: -4, y: 2 })).toBe(false);
    const [gx, gy] = GATES[0].tiles[0];
    expect(walkable(gx, gy)).toBe(true);
    expect(mayRaise({ x: gx + 0.5, y: gy + 0.5 })).toBe(false);
  });

  it("has a reach: the same map, and so many tiles", () => {
    const holder = { x: 31.5, y: 31.5 };
    expect(inReach({ x: 31.5 + SIGN.reach, y: 31.5 }, holder)).toBe(true);
    expect(inReach({ x: 31.5 + SIGN.reach + 1, y: 31.5 }, holder)).toBe(false);
    // (another map is never within reach, however the numbers fall)
    expect(inReach({ x: 500, y: 500 }, holder)).toBe(false);
  });
});

describe("a chat room under a sign (the owner: \"เอาแบบ RO แต่แยกเสียงในห้องได้ด้วย\")", () => {
  it("lets people in until it is full, and never whom its holder let go", () => {
    let c = newCircle("host");
    for (let i = 1; i < SIGN.cap; i++) { const did = admit(c, `m${i}`); expect(did.ok).toBe(true); if (did.ok) c = did.circle; }
    expect(c.members).toHaveLength(SIGN.cap);
    expect(admit(c, "late")).toEqual({ ok: false, why: "full" });
    // somebody in it already is in it, full or not
    expect(admit(c, "m3")).toEqual({ ok: true, circle: c });
    c = without(c, "m3", true);
    expect(c.members).not.toContain("m3");
    expect(admit(c, "m3")).toEqual({ ok: false, why: "out" });
    expect(admit(c, "late").ok).toBe(true);
  });

  it("loses whoever leaves, and never its holder", () => {
    const c = { host: "host", members: ["host", "a", "b"], out: [] };
    expect(without(c, "a").members).toEqual(["host", "b"]);
    expect(without(c, "a").out).toEqual([]);
    expect(without(c, "host")).toBe(c);
    expect(without(c, "nobody")).toBe(c);
  });

  it("is kept by somebody in it as its holder lists it, and not at all by somebody the list leaves out", () => {
    expect(listed("host", "me", ["host", "a", "me"])).toEqual({ host: "host", members: ["host", "a", "me"], out: [] });
    expect(listed("host", "me", ["host", "a"])).toBeNull();
    expect(listed("host", "me", ["a", "host", "me"])).toBeNull();
  });

  it("is heard only by those in it, and they hear nobody else", () => {
    const mine = { host: "host", members: ["host", "me", "a"], out: [] };
    // in a room: the room, whatever anybody else says of themselves
    expect(hears(mine, "a", "host")).toBe(true);
    expect(hears(mine, "host", "host")).toBe(true);
    expect(hears(mine, "outsider", undefined)).toBe(false);
    expect(hears(mine, "poser", "host")).toBe(false);
    // in none: everybody who is in none (a page built before there were rooms says nothing)
    expect(hears(null, "outsider", undefined)).toBe(true);
    expect(hears(null, "outsider", "")).toBe(true);
    expect(hears(null, "a", "host")).toBe(false);
    expect(fromRoom(mine, "a")).toBe(true);
    expect(fromRoom(mine, "poser")).toBe(false);
    expect(fromRoom(null, "a")).toBe(false);
  });

  it("reads only the words it knows, of the shape expected", () => {
    expect(readWord({ k: "ask" })).toEqual({ k: "ask" });
    expect(readWord({ k: "in", m: ["host", "a-b_1"] })).toEqual({ k: "in", m: ["host", "a-b_1"] });
    expect(readWord({ k: "ln", t: "  สวัสดี\n" })).toEqual({ k: "ln", t: "สวัสดี" });
    expect(readWord({ k: "no", why: "full" })).toEqual({ k: "no", why: "full" });
    for (const raw of [null, 3, {}, { k: "in" }, { k: "in", m: [] }, { k: "in", m: ["a", "a"] }, { k: "in", m: ["a", 3] }, { k: "in", m: Array.from({ length: SIGN.cap + 1 }, (_, i) => `m${i}`) },
      { k: "in", m: ["has space"] }, { k: "ln", t: "  " }, { k: "ln" }, { k: "no", why: "because" }, { k: "kick" }]) expect(readWord(raw)).toBeNull();
  });
});
