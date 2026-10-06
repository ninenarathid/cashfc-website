import { describe, expect, it } from "vitest";
import atlas from "./icon-atlas.json";
import { LINES, LINE_IDS, PAST_BOUND, RANKS, countedOn, ladderOf, mayWear, pastBound, rankOf, titleOf, titlesOf, towards } from "./lines";
import { RANK_TITLES, WELL_BOOK } from "./well";

describe("the seven lines of work", () => {
  it("each has a name, a picture of the town's, and a ladder of ten ranks with ten titles", () => {
    expect(LINE_IDS.length).toBe(7);
    const all = new Set<string>();
    for (const id of LINE_IDS) {
      const l = LINES[id];
      expect(l.name.th.trim(), id).not.toBe("");
      expect(/[฀-๿]/.test(l.name.en), id).toBe(false);
      expect(Object.keys(atlas.icons), id).toContain(l.icon);
      expect(l.marks.length, id).toBe(RANKS);
      expect(l.titles.length, id).toBe(RANKS);
      for (let i = 1; i < RANKS; i++) expect(l.marks[i], `${id} ${i}`).toBeGreaterThan(l.marks[i - 1]);
      for (const [th, en] of l.titles) {
        expect(th.trim(), id).not.toBe("");
        expect(en.trim(), id).not.toBe("");
        // (a title in English has no Thai in it; a title in Thai may name the town)
        expect(/[฀-๿]/.test(en), en).toBe(false);
        // no two ranks of the whole village are called the same: a title says which line and how far
        expect(all.has(th), th).toBe(false);
        expect(all.has(en), en).toBe(false);
        all.add(th); all.add(en);
      }
    }
    expect(all.size).toBe(140);
  });

  it("asks for many points (the owner: \"ใช้แต้มเยอะกว่านี้หน่อย … คนที่เล่น … ก็พยายามปั่นแต้มกัน\"), and for more where a thing is done many times a day", () => {
    for (const id of LINE_IDS) {
      expect(LINES[id].marks[0], id).toBe(50);
      expect(LINES[id].marks[RANKS - 1], id).toBeGreaterThanOrEqual(12000);
      // somebody who fills every day's bound is months from the last rank, not weeks
      expect(LINES[id].marks[RANKS - 1] / LINES[id].day, id).toBeGreaterThanOrEqual(80);
    }
    expect(LINES.well.marks[RANKS - 1]).toBeGreaterThan(LINES.kitchen.marks[RANKS - 1]);
    expect(LINES.helpers.marks).toEqual(LINES.well.marks);
    expect(LINES.well.day).toBeGreaterThan(LINES.kitchen.day);
  });

  it("keeps the well's first three ranks where the carriers have them: nobody loses a rank to the longer ladder", () => {
    expect(LINES.well.marks.slice(0, WELL_BOOK.ranks.length)).toEqual(WELL_BOOK.ranks);
    expect(RANK_TITLES.length).toBe(WELL_BOOK.ranks.length);
  });
});

describe("a rank", () => {
  it("is reached at its mark, all told, and never before", () => {
    expect(rankOf("kitchen", 0)).toBe(0);
    expect(rankOf("kitchen", 49.75)).toBe(0);
    expect(rankOf("kitchen", 50)).toBe(1);
    expect(rankOf("kitchen", 149)).toBe(1);
    expect(rankOf("kitchen", 150)).toBe(2);
    expect(rankOf("kitchen", 11999)).toBe(9);
    expect(rankOf("kitchen", 12000)).toBe(10);
    expect(rankOf("kitchen", 9_999_999)).toBe(10);
    expect(rankOf("well", 12000)).toBe(7);
  });
  it("has a title, in both languages; no rank has none", () => {
    expect(titleOf("kitchen", 1)).toEqual({ th: "ลูกมือครัว", en: "Kitchen hand" });
    expect(titleOf("farming", 10)).toEqual({ th: "ผู้ปลูกต้นถั่ววิเศษ", en: "Grower of the magic beanstalk" });
    expect(titleOf("fishing", 0)).toBeNull();
    expect(titleOf("fishing", 11)).toBeNull();
  });
  it("says how far to the next: the points one has, the mark to reach, and the share of the way", () => {
    expect(towards("kitchen", 0)).toEqual({ rank: 0, from: 0, next: 50, share: 0 });
    expect(towards("kitchen", 25)).toEqual({ rank: 0, from: 0, next: 50, share: 0.5 });
    expect(towards("kitchen", 100)).toEqual({ rank: 1, from: 50, next: 150, share: 0.5 });
    expect(towards("kitchen", 12000)).toEqual({ rank: 10, from: 12000, next: null, share: 1 });
    expect(towards("helpers", 33000)).toEqual({ rank: 10, from: 30000, next: null, share: 1 });
  });
});

describe("a day's bound (the owner, of points past so many in a day counting a quarter: \"เอาเลย\")", () => {
  it("counts a day's points in full up to the bound, and a quarter past it", () => {
    expect(PAST_BOUND).toBe(0.25);
    expect(countedOn("kitchen", 0, 30)).toBe(30);
    expect(countedOn("kitchen", 140, 10)).toBe(10);
    // across the bound: what fits counts in full, the rest a quarter
    expect(countedOn("kitchen", 140, 30)).toBe(10 + 20 * 0.25);
    expect(countedOn("kitchen", 150, 8)).toBe(2);
    expect(countedOn("kitchen", 900, 8)).toBe(2);
    expect(countedOn("well", 150, 8)).toBe(8);
    expect(countedOn("well", 200, 8)).toBe(2);
    expect(countedOn("kitchen", 10, 0)).toBe(0);
    expect(countedOn("kitchen", 10, -5)).toBe(0);
    expect(pastBound("kitchen", 149)).toBe(false);
    expect(pastBound("kitchen", 150)).toBe(true);
  });
  it("is the same however a day's points are cut up", () => {
    // 400 raw points in a day of the kitchen's: 150 in full and 250 at a quarter, whether they come as one or as many
    const whole = countedOn("kitchen", 0, 400);
    let today = 0, sum = 0;
    for (const add of [7, 43, 100, 1, 149, 100]) { sum += countedOn("kitchen", today, add); today += add; }
    expect(whole).toBe(150 + 250 * 0.25);
    expect(sum).toBe(whole);
  });
});

describe("a ladder as its member is told it (the owner: \"ของที่ยังไม่ปลดล็อคจะยังไม่มีข้อมูลให้เห็น\"; and of the ranks further off, \"ซ่อนแต้มไว้\")", () => {
  it("tells the ranks one has with their titles and marks, the next with its mark alone, and nothing of the rest", () => {
    const told = ladderOf("forest", 400);
    expect(told.length).toBe(RANKS);
    expect(told.slice(0, 3)).toEqual([
      { rank: 1, state: "had", at: 50, title: { th: "ผู้เดินป่า", en: "Forest walker" } },
      { rank: 2, state: "had", at: 150, title: { th: "สหายกระรอก", en: "Squirrel's friend" } },
      { rank: 3, state: "had", at: 350, title: { th: "นักดมกลิ่นป่า", en: "Sniffer of the woods" } },
    ]);
    expect(told[3]).toEqual({ rank: 4, state: "next", at: 700 });
    for (const far of told.slice(4)) expect(Object.keys(far).sort()).toEqual(["rank", "state"]);
    // nothing of a rank not had is anywhere in what is told: not its title, and beyond the next not its mark
    const said = JSON.stringify(told);
    for (const [th, en] of LINES.forest.titles.slice(3)) { expect(said).not.toContain(th); expect(said).not.toContain(en); }
    for (const at of LINES.forest.marks.slice(4)) expect(said).not.toContain(String(at));
  });
  it("with no rank yet tells only the first mark; with the last, all of it", () => {
    const none = ladderOf("insects", 12);
    expect(none[0]).toEqual({ rank: 1, state: "next", at: 50 });
    expect(none.slice(1).every((r) => r.state === "far")).toBe(true);
    const all = ladderOf("insects", 12000);
    expect(all.every((r) => r.state === "had")).toBe(true);
    expect(all[9]).toEqual({ rank: 10, state: "had", at: 12000, title: { th: "ราชาแห่งปวงปีก", en: "King of all wings" } });
  });
});

describe("the titles somebody may wear (the owner: \"เลือกได้ ทำ UI ให้ด้วย\")", () => {
  it("are every rank they have of every line, and no other", () => {
    const mine = { kitchen: 160, well: 49, fishing: 50 };
    expect(titlesOf(mine).map((t) => `${t.line} ${t.rank} ${t.title.en}`)).toEqual(["kitchen 1 Kitchen hand", "kitchen 2 Hearth apprentice", "fishing 1 Novice angler"]);
    expect(titlesOf({})).toEqual([]);
    expect(mayWear(mine, "kitchen", 2)).toBe(true);
    expect(mayWear(mine, "kitchen", 3)).toBe(false);
    expect(mayWear(mine, "well", 1)).toBe(false);
    expect(mayWear(mine, "fishing", 1)).toBe(true);
    expect(mayWear(mine, "fishing", 0)).toBe(false);
    expect(mayWear(mine, "fishing", 1.5)).toBe(false);
    expect(mayWear(mine, "nothing", 1)).toBe(false);
  });
});
