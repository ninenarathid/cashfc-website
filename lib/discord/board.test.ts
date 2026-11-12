import { describe, expect, test } from "vitest";
import type { Party } from "@/lib/party";
import { boardMessage, staticsEmbed } from "@/lib/discord/board";

const NOW = Date.parse("2026-11-12T08:00:00Z");
const party = (over: Partial<Party> = {}): Party => ({
  id: "189", contentKey: "roulette", shape: "light",
  startsAt: "2026-11-12T13:00:00Z", lengthMinutes: 120, lengthUnit: "hours",
  ownerCharacterId: -1, createdAt: "2026-11-12T07:00:00Z", updatedAt: "2026-11-12T07:00:00Z",
  seats: {}, floating: [], closed: [], rules: {}, oneOfEachJob: false,
  note: "Fresh start", ...over,
});
const st = (id: string, over: Partial<Party> = {}): Party => party({
  id, isStatic: true, startsAt: "2026-11-01T13:00:00Z", ...over,
});
const fullSeats = Object.fromEntries(["MT", "H1", "D1", "D2"].map((s, i) => [s, {
  characterId: 100 + i, name: `p${i}`, avatar: null, confirmedAt: "2026-11-12T07:00:00Z",
}]));

/** Any pictograph emoji: the board draws only the game's art and plain text (2026-11-12). */
const EMOJI = /\p{Extended_Pictographic}/u;

describe("the Discord board message", () => {
  const msg = boardMessage([party()], NOW);
  const e = msg.embeds[0];

  test("the picture is the board's banner, with the version in its address", () => {
    expect(e.image!.url).toMatch(/\/party\/189\/banner\?v=.+\.d$/);
  });

  test("a cover changes the picture's address", () => {
    const withCover = boardMessage([party({
      cover: "5b0c9d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e/cover-1762934400000-a1b2c3.webp",
    })], NOW).embeds[0];
    expect(withCover.image!.url).toMatch(/\.a1b2c3$/);
    expect(withCover.image!.url).not.toBe(e.image!.url);
  });

  test("status and time on one line, then the note; the picture's facts are not repeated", () => {
    const at = Math.floor(Date.parse("2026-11-12T13:00:00Z") / 1000);
    // The status word follows the real clock, so only the line's shape is fixed.
    const [line, note] = (e.description ?? "").split("\n");
    expect(line).toMatch(/^\*\*[^*]+\*\* · เริ่ม <t:\d+:t> · <t:\d+:R>$/);
    expect(line).toContain(`<t:${at}:t>`);
    expect(note).toBe("Fresh start");
    const names = (e.fields ?? []).map((f) => f.name);
    expect(names).not.toContain("ในปาร์ตี้");
    expect(names).not.toContain("ยังขาด");
  });

  test("no emoji anywhere in the message", () => {
    expect(JSON.stringify(msg)).not.toMatch(EMOJI);
  });

  test("two link buttons to the site under the dropdown", () => {
    const rows = msg.components as { components: { type: number; style?: number; url?: string }[] }[];
    const links = rows.at(-1)!.components;
    expect(links.map((b) => [b.type, b.style])).toEqual([[2, 5], [2, 5]]);
    expect(links[0].url).toMatch(/\/party\?new=1$/);
    expect(rows[0].components[0].type).toBe(3);
  });

  test("an empty board still offers the buttons", () => {
    const empty = boardMessage([], NOW);
    expect(empty.embeds).toHaveLength(0);
    expect(empty.components).toHaveLength(1);
  });
});

describe("the statics, as the board's last card (one message, 2026-11-12)", () => {
  test("no card where no static is open", () => {
    expect(staticsEmbed([])).toBeNull();
    expect(staticsEmbed([st("1", { endedAt: "2026-11-11T00:00:00Z" })])).toBeNull();
    expect(staticsEmbed([party({ id: "2" })])).toBeNull();
    expect(boardMessage([party()], NOW, new Map(), []).embeds).toHaveLength(1);
  });

  test("the card comes last, after the evening's parties, with no picture", () => {
    const m = boardMessage([party()], NOW, new Map(), [st("126")]);
    expect(m.embeds).toHaveLength(2);
    const card = m.embeds[1];
    expect(card.title).toBe("CASH Static Finder");
    expect(card.url).toMatch(/\/party#statics$/);
    expect(card.image).toBeUndefined();
    expect(card.description).toMatch(/\*\*\[Duty Roulette\]\(.+\/party\/126\)\*\*\nกำลังหาคน · ขาด .+ · 0\/4/);
  });

  test("the ones still looking first, then the newest", () => {
    const full = st("a", { createdAt: "2026-11-12T07:30:00Z", seats: fullSeats });
    const older = st("b", { createdAt: "2026-11-10T07:00:00Z" });
    const newer = st("c", { createdAt: "2026-11-11T07:00:00Z" });
    const d = staticsEmbed([full, older, newer])!.description;
    const order = [...d.matchAll(/\/party\/(\w+)\)/g)].map((x) => x[1]);
    expect(order).toEqual(["c", "b", "a"]);
    expect(d).toMatch(/^-# 2 Static ที่กำลังหาคน/);
    expect(d).toMatch(/ครบแล้ว · 4\/4/);
  });

  test("never more than ten embeds: nine evenings and the statics card", () => {
    const evenings = Array.from({ length: 14 }, (_, i) => party({
      id: String(200 + i), startsAt: new Date(NOW + (i + 1) * 3600_000).toISOString(),
    }));
    const m = boardMessage(evenings, NOW, new Map(), [st("126")]);
    expect(m.embeds).toHaveLength(10);
    expect(m.embeds.at(-1)!.title).toBe("CASH Static Finder");
    expect(JSON.stringify(m)).not.toMatch(EMOJI);
  });

  test("the whole message keeps within Discord's 6000 characters of embed text", () => {
    const long = "ข้อความยาวมาก ".repeat(40);
    const evenings = Array.from({ length: 9 }, (_, i) => party({
      id: String(300 + i), note: long, startsAt: new Date(NOW + (i + 1) * 3600_000).toISOString(),
    }));
    const m = boardMessage(evenings, NOW, new Map(), [st("126"), st("127"), st("128")]);
    const size = m.embeds.reduce((n, e) => n + (e.title?.length ?? 0) + (e.description?.length ?? 0)
      + ((e as { author?: { name?: string } }).author?.name?.length ?? 0)
      + (e.fields ?? []).reduce((k, f) => k + f.name.length + f.value.length, 0), 0);
    expect(size).toBeLessThanOrEqual(6000);
    // The status line survives the cut; only the note is shortened.
    expect(m.embeds[0].description).toMatch(/^\*\*[^*]+\*\* · เริ่ม <t:\d+:t>/);
    expect(m.embeds.at(-1)!.title).toBe("CASH Static Finder");
  });
});
