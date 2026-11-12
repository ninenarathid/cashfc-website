import { describe, expect, test } from "vitest";
import type { Party } from "@/lib/party";
import { boardMessage } from "@/lib/discord/board";

const NOW = Date.parse("2026-11-12T08:00:00Z");
const party = (over: Partial<Party> = {}): Party => ({
  id: "189", contentKey: "roulette", shape: "light",
  startsAt: "2026-11-12T13:00:00Z", lengthMinutes: 120, lengthUnit: "hours",
  ownerCharacterId: -1, createdAt: "2026-11-12T07:00:00Z", updatedAt: "2026-11-12T07:00:00Z",
  seats: {}, floating: [], closed: [], rules: {}, oneOfEachJob: false,
  note: "Fresh start", ...over,
});

/** Any pictograph emoji: the board draws only the game's art and plain text (2026-11-12). */
const EMOJI = /\p{Extended_Pictographic}/u;

describe("the Discord board message", () => {
  const msg = boardMessage([party()], NOW);
  const e = msg.embeds[0];

  test("the picture is the board's banner, with the version in its address", () => {
    expect(e.image.url).toMatch(/\/party\/189\/banner\?v=.+\.d$/);
  });

  test("a cover changes the picture's address", () => {
    const withCover = boardMessage([party({
      cover: "5b0c9d6e-1f2a-4b3c-8d4e-5f6a7b8c9d0e/cover-1762934400000-a1b2c3.webp",
    })], NOW).embeds[0];
    expect(withCover.image.url).toMatch(/\.a1b2c3$/);
    expect(withCover.image.url).not.toBe(e.image.url);
  });

  test("status and time on one line, then the note; the picture's facts are not repeated", () => {
    const at = Math.floor(Date.parse("2026-11-12T13:00:00Z") / 1000);
    expect(e.description).toBe(`**ยังรับอยู่** · เริ่ม <t:${at}:t> · <t:${at}:R>\nFresh start`);
    expect(e.fields.map((f: { name: string }) => f.name)).not.toContain("ในปาร์ตี้");
    expect(e.fields.map((f: { name: string }) => f.name)).not.toContain("ยังขาด");
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
