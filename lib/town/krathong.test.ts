import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ITEMS, type ItemId } from "./items";
import { PARTS, PART, START, awardsOf, bestPay, catalogJson, check, cleanName, costOf, familiesOf, partsOf, shortOf, shuffledFor, type Design } from "./krathong";
import { LOY_KRATHONG_2026 as LK, calendarOrder, isOpen, nextWindow, stageOf, untilText, whenText, windowOf } from "./festivals";

describe("the krathong's parts", () => {
  it("pays only with things the town has", () => {
    for (const part of PARTS) for (const [id, n] of part.pay) {
      expect(ITEMS[id as ItemId], `${part.id} pays with ${id}`).toBeTruthy();
      expect(n).toBeGreaterThan(0);
    }
  });
  it("has three bases, three rings, two lights, ten centrepieces and ten trims, one family each", () => {
    expect([partsOf("base").length, partsOf("ring").length, partsOf("light").length, partsOf("centre").length, partsOf("trim").length]).toEqual([3, 3, 2, 10, 10]);
    expect(new Set(partsOf("centre").map((x) => x.family)).size).toBe(10);
    expect(new Set(partsOf("trim").map((x) => x.family)).size).toBe(10);
  });
  it("keeps ids unique", () => expect(new Set(PARTS.map((x) => x.id)).size).toBe(PARTS.length));
});

describe("a design", () => {
  const d: Design = { base: ["b_wood", 1], ring: ["r_marigold", 0], light: ["l_candle", 0], centre: ["c_flower", 0], trims: [["t_flower", 0], ["t_shell", 0]] };
  it("is checked part by part", () => {
    expect(check(START)).toBeNull();
    expect(check(d)).toBeNull();
    expect(check({ ...d, base: ["c_flower", 0] })).toBe("slot");
    expect(check({ ...d, base: ["nope", 0] })).toBe("part");
    expect(check({ ...d, ring: ["r_marigold", 1] })).toBe("pay");
    expect(check({ ...d, ring: ["r_marigold", -1] })).toBe("pay");
    expect(check({ ...d, trims: [["t_flower", 0], ["t_flower", 0], ["t_flower", 0], ["t_flower", 0]] })).toBe("trims");
    expect(check({ ...d, trims: [["c_flower", 0]] })).toBe("slot");
  });
  it("sums what it takes", () => {
    expect(Object.fromEntries(costOf(d))).toEqual({ carvingBlank: 1, marigold: 8, beeswax: 1, snail: 1 });
    expect(shortOf(d, (id) => (id === "marigold" ? 5 : 9))).toEqual([{ id: "marigold", need: 8, have: 5 }]);
  });
  it("picks a payment the bag can meet", () => {
    expect(bestPay("b_wood", (id) => (id === "carvingBlank" ? 2 : 0))).toBe(1);
    expect(bestPay("b_wood", () => 0)).toBe(0);
    expect(bestPay("t_flower", (id) => (id === "marigold" ? 3 : 0), new Map([["marigold" as ItemId, 2]]))).toBe(0);
  });
  it("names the lines it carries", () => expect(familiesOf(d).sort()).toEqual(["farm", "fishing", "insects", "wood"]));
  it("cleans a name", () => {
    expect(cleanName("  กระทง   ของฉัน \n")).toBe("กระทง ของฉัน");
    expect(cleanName("   ")).toBeNull();
    expect([...(cleanName("x".repeat(40)) ?? "")].length).toBe(24);
  });
});

describe("the awards", () => {
  const e = (id: number, votes: number, made = id) => ({ id, votes, made });
  it("gives three places, equal popoto sharing one", () => {
    expect(awardsOf([e(1, 5), e(2, 5), e(3, 3), e(4, 2), e(5, 0)], null)).toEqual([
      { entry: 1, kind: "popular", place: 1 }, { entry: 2, kind: "popular", place: 1 }, { entry: 3, kind: "popular", place: 3 },
    ]);
    expect(awardsOf([e(1, 4), e(2, 3), e(3, 3), e(4, 3), e(5, 1)], 5).map((a) => [a.entry, a.place, a.kind])).toEqual([
      [1, 1, "popular"], [2, 2, "popular"], [3, 2, "popular"], [4, 2, "popular"], [5, 1, "judge"],
    ]);
  });
  it("gives nothing for no popoto, and ignores a judge's pick that is no entry", () => {
    expect(awardsOf([e(1, 0)], 9)).toEqual([]);
  });
});

describe("the order of the gallery", () => {
  const list = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
  it("is the same for one member and differs between members", () => {
    expect(shuffledFor(list, "a").map((x) => x.id)).toEqual(shuffledFor(list, "a").map((x) => x.id));
    expect(shuffledFor(list, "a").map((x) => x.id)).not.toEqual(shuffledFor(list, "b").map((x) => x.id));
    expect(shuffledFor(list, "a").map((x) => x.id).sort((x, y) => x - y)).toEqual(list.map((x) => x.id));
  });
});

describe("the calendar", () => {
  const t = (iso: string) => Date.parse(iso);
  it("follows Loy Krathong 2026's windows", () => {
    expect(stageOf(LK, t("2026-11-22T10:00:00Z"))).toBe("hidden");
    expect(stageOf(LK, t("2026-11-23T05:00:00Z"))).toBe("coming");
    expect(stageOf(LK, t("2026-11-23T11:00:00Z"))).toBe("on");
    expect(isOpen(windowOf(LK, "make"), t("2026-11-23T11:00:00Z"))).toBe(true);
    // (entries until midnight, 24 Nov 17:00 UTC; the float from 18:00 overlaps them; the vote after them)
    expect(isOpen(windowOf(LK, "make"), t("2026-11-24T11:00:00Z"))).toBe(true);
    expect(isOpen(windowOf(LK, "float"), t("2026-11-24T11:00:00Z"))).toBe(true);
    expect(isOpen(windowOf(LK, "make"), t("2026-11-24T17:00:00Z"))).toBe(false);
    expect(isOpen(windowOf(LK, "vote"), t("2026-11-24T16:59:00Z"))).toBe(false);
    expect(isOpen(windowOf(LK, "vote"), t("2026-11-24T17:00:00Z"))).toBe(true);
    expect(isOpen(windowOf(LK, "results"), t("2026-11-25T13:59:00Z"))).toBe(false);
    expect(isOpen(windowOf(LK, "results"), t("2026-11-25T14:00:00Z"))).toBe(true);
    expect(isOpen(windowOf(LK, "float"), t("2026-11-25T21:59:00Z"))).toBe(true);
    expect(isOpen(windowOf(LK, "results"), t("2027-01-01T00:00:00Z"))).toBe(true);
    expect(stageOf(LK, t("2026-11-25T22:00:00Z"))).toBe("after");
    expect(nextWindow(LK, t("2026-11-23T05:00:00Z"))?.kind).toBe("make");
    expect(nextWindow(LK, t("2026-11-23T12:00:00Z"))?.kind).toBe("float");
  });
  it("speaks Bangkok time", () => {
    expect(whenText(windowOf(LK, "float")!.from, true)).toBe("อ. 24 พ.ย. 18:00");
    expect(whenText(windowOf(LK, "make")!.from, false)).toBe("Mon 23 Nov 18:00");
    expect(untilText("2026-11-24T11:00:00Z", t("2026-11-23T08:30:00Z"), true)).toBe("1 วัน 2 ชม.");
  });
  it("orders on, coming and past", () => {
    const later = { ...LK, id: 2, year: 2027, starts: "2027-11-01T00:00:00Z", ends: "2027-11-20T00:00:00Z", windows: LK.windows.map((w) => ({ ...w, from: w.from.replace("2026", "2027"), until: w.until?.replace("2026", "2027") ?? null })) };
    const o = calendarOrder([later, LK], t("2026-11-24T12:00:00Z"));
    expect([o.on.map((f) => f.id), o.coming.map((f) => f.id), o.past.map((f) => f.id)]).toEqual([[1], [2], []]);
  });
});

describe("the database's catalog", () => {
  it("is this file's, byte for byte as JSON", () => {
    // (the parts as the newest migration that sets them has them: v336 laid them, v339 made them easy to come by; the
    // windows as the newest that lays them)
    const dir = resolve(__dirname, "../../supabase");
    let files: string[] = [];
    try { files = readdirSync(dir).filter((f) => /^v\d+_.*\.sql$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))); } catch { return; }
    const read = (f: string) => readFileSync(resolve(dir, f), "utf8");
    const partsFile = [...files].reverse().find((f) => read(f).includes("<krathong-parts>"));
    const windowsFile = [...files].reverse().find((f) => read(f).includes("<krathong-windows>"));
    if (!partsFile || !windowsFile) return;
    const sql = read(partsFile), wsql = read(windowsFile);
    const m = /<krathong-parts>\s*\n--\s*'(.+)'::jsonb/.exec(sql);
    const w = /<krathong-windows>\s*\n--\s*'(.+)'::jsonb/.exec(wsql);
    expect(m, "the <krathong-parts> block").toBeTruthy();
    expect(JSON.parse(m![1])).toEqual(catalogJson());
    expect(JSON.parse(w![1])).toEqual(LK.windows);
    // the comment blocks are the same JSON as the statement's
    expect(sql.split(m![1]).length - 1).toBe(2);
    expect(wsql.split(w![1]).length - 1).toBe(2);
    expect(PART.c_crystal.pay.length).toBeGreaterThan(5);
  });
});
