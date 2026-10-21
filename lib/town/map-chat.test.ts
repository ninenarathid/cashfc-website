import { describe, expect, it, vi } from "vitest";
import { TownSession } from "./session";
import { Flood } from "./chat";
import { FARM } from "./world";

function stay() {
  return Object.assign(Object.create(TownSession.prototype), {
    closed: false, me: { id: "me", name: "Me" },
    self: { info: { id: "me", x: 30, y: 30 } },
    avatars: new Map([["peer", { info: { id: "peer", name: "Peer", x: 31, y: 30 } }]]),
    listed: new Set(["peer"]), chat: [], chatKey: 0, lastChatAt: 0, flood: new Flood(),
    current: { chat: vi.fn(() => true) }, notify: vi.fn(), views: 1, unread: 0,
  });
}
describe("map chat history and global announcements", () => {
  it("keeps each map's conversation and shows announcements on every map", () => {
    const s = stay();
    s.onChat("peer", "town hello");
    s.townAnnouncement(7, "Important town announcement", Date.now(), "Town");
    expect(s.mapChat.map((l: { text: string }) => l.text)).toEqual(["town hello", "Important town announcement"]);
    Object.assign(s.self.info, { x: FARM.x + 5, y: FARM.y + 5 });
    expect(s.mapChat.map((l: { text: string }) => l.text)).toEqual(["Important town announcement"]);
    expect(s.sendChat("farm hello")).toBe("sent");
    expect(s.mapChat.map((l: { text: string }) => l.text)).toEqual(["Important town announcement", "farm hello"]);
    Object.assign(s.self.info, { x: 30, y: 30 });
    expect(s.mapChat.map((l: { text: string }) => l.text)).toEqual(["town hello", "Important town announcement"]);
  });
  it("ignores unscoped messages from legacy clients on another map", () => {
    const s = stay(); Object.assign(s.avatars.get("peer").info, { x: FARM.x + 5, y: FARM.y + 5 });
    s.onChat("peer", "other map");
    expect(s.chat).toEqual([]); expect(s.unread).toBe(0);
  });
  it("keeps drafts out of history when the map channel is not ready", () => {
    const s = stay(); s.current.chat.mockReturnValue(false);
    expect(s.sendChat("not sent")).toBe("offline");
    expect(s.chat).toEqual([]); expect(s.self.said).toBeUndefined();
  });
});
