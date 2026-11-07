import { describe, expect, it } from "vitest";
import { BOOK_CROSSES, farmBook, isOpen, kindOf } from "./farm-book";
import { CROPS, type CropId } from "./items";

const none = new Set<string>();
const page = (found: ReadonlySet<string>, id: CropId) => farmBook(found).find((p) => p.id === id)!;

describe("the village's farm book", () => {
  it("has a page for every crop, the uncle's first and the mist forms last", () => {
    const book = farmBook(none);
    expect(book.map((p) => p.id).sort()).toEqual(Object.keys(CROPS).sort());
    const kinds = book.map((p) => p.kind);
    expect(kinds.indexOf("helper")).toBeGreaterThan(kinds.lastIndexOf("uncle"));
    expect(kinds.indexOf("mist")).toBeGreaterThan(kinds.lastIndexOf("hybrid"));
  });

  it("opens what the uncle sells from the start, and a crossing's child only once found", () => {
    expect(isOpen("basil", none)).toBe(true);
    expect(isOpen("runnerBean", none)).toBe(true);
    expect(isOpen("teaBush", none)).toBe(false);
    expect(isOpen("teaBush", new Set(["teaBush"]))).toBe(true);
    expect(kindOf("teaBush")).toBe("hybrid");
    expect(kindOf("pearlNut")).toBe("mist");
    expect(kindOf("runnerBean")).toBe("helper");
    expect(kindOf("basil")).toBe("uncle");
  });

  it("a shut page tells one parent and nothing else", () => {
    const p = page(none, "teaBush");
    expect(p.open).toBe(false);
    expect(p.hint).toBe("basil");
    expect(p.from).toEqual([]);
    expect(p.makes).toEqual([]);
    expect(p.partner).toBeUndefined();
  });

  it("a parent's page names only the crossings whose child is open, and counts the rest", () => {
    const shut = page(none, "basil");
    expect(shut.makes).toEqual([]);
    const all = BOOK_CROSSES.filter((x) => x.a === "basil" || x.b === "basil").length;
    expect(shut.hidden).toBe(all);
    const one = page(new Set(["teaBush"]), "basil");
    expect(one.makes.map((x) => x.child)).toEqual(["teaBush"]);
    expect(one.hidden).toBe(all - 1);
  });

  it("never gives the whole pair of a child not found yet, whatever pages are put together", () => {
    for (const found of [none, new Set(["teaBush", "rowBean"]), new Set(["peanut", "lavender"])]) {
      const book = farmBook(found);
      for (const x of BOOK_CROSSES.filter((c) => !isOpen(c.child, found))) {
        const told = book.flatMap((p) => [...p.makes, ...p.from]).some((c) => c.child === x.child);
        expect(told).toBe(false);
        expect(book.find((p) => p.id === x.child)!.hint).toBe(x.a);
      }
    }
  });

  it("an open helper child shows its sky and its role; its parents show it under that sky", () => {
    const found = new Set(["lavender"]), lav = page(found, "lavender");
    expect(lav.open).toBe(true);
    expect(lav.from).toEqual([{ a: "corn", b: "longBean", child: "lavender", sky: "moon" }]);
    expect(lav.role).toBe("pollen");
    expect(page(found, "corn").makes).toContainEqual({ a: "corn", b: "longBean", child: "lavender", sky: "moon" });
  });

  it("marks the crops that may grow over their ground", () => {
    expect(page(none, "pumpkin").giant).toBe(true);
    expect(page(none, "basil").giant).toBe(false);
  });
});
