import { afterEach, describe, expect, it, vi } from "vitest";
import { REST_AFTER_MS, TownSession } from "./session";
import { Flood } from "./chat";
import { FARM } from "./world";

function stay() {
  return Object.assign(Object.create(TownSession.prototype), {
    closed: false, me: { id: "me", name: "Me" },
    self: { info: { id: "me", x: 30, y: 30 } },
    avatars: new Map([["peer", { info: { id: "peer", name: "Peer", x: 31, y: 30 } }]]),
    listed: new Set(["peer"]), chat: [], chatKey: 0, lastChatAt: 0, flood: new Flood(),
    current: { chat: vi.fn(() => true), rest: vi.fn() }, notify: vi.fn(), views: 1, unread: 0,
    chatReach: "town", chatView: "town", reachReadAt: 0, reachBusy: false, awaySince: null, tell: vi.fn(),
  });
}
const texts = (s: { shownChat: Array<{ text: string }> }) => s.shownChat.map(l => l.text);
afterEach(() => vi.unstubAllGlobals());
describe("chat history across maps, and global announcements", () => {
  it("shows every map's lines with their map, and only my map's when I narrow it", () => {
    const s = stay();
    s.onChat("peer", "town hello", "town");
    s.townAnnouncement(7, "Important town announcement", Date.now(), "Town");
    Object.assign(s.self.info, { x: FARM.x + 5, y: FARM.y + 5 });
    expect(texts(s)).toEqual(["town hello", "Important town announcement"]);
    expect(s.shownChat[0].area).toBe("town");
    s.setChatView("map");
    expect(texts(s)).toEqual(["Important town announcement"]);
    expect(s.sendChat("farm hello")).toBe("sent");
    expect(s.chat.at(-1).area).toBe("farm");
    expect(texts(s)).toEqual(["Important town announcement", "farm hello"]);
    Object.assign(s.self.info, { x: 30, y: 30 });
    expect(texts(s)).toEqual(["town hello", "Important town announcement"]);
    s.setChatView("town");
    expect(texts(s)).toEqual(["town hello", "Important town announcement", "farm hello"]);
  });
  it("a line from another map is in the log without a bubble; from mine, with one", () => {
    const s = stay(), peer = s.avatars.get("peer");
    Object.assign(peer.info, { x: FARM.x + 5, y: FARM.y + 5 });
    s.onChat("peer", "from the farm", "farm");
    expect(texts(s)).toEqual(["from the farm"]); expect(peer.said).toBeUndefined();
    Object.assign(peer.info, { x: 31, y: 30 });
    s.onChat("peer", "next to you", "town");
    expect(peer.said?.text).toBe("next to you");
  });
  it("hears no other map while the town's switch is map-only, and shows my map's lines whatever I chose", () => {
    const s = stay(); s.chatReach = "map";
    s.onChat("peer", "from the farm", "farm");
    expect(s.chat).toEqual([]);
    s.onChat("peer", "here", "town");
    expect(texts(s)).toEqual(["here"]);
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

describe("the town's chat switch (/townchat)", () => {
  const withRpc = (answer: { data?: unknown; error?: { code: string } | null }) => {
    const s = stay(); s.client = { rpc: vi.fn(async () => ({ data: null, error: null, ...answer })) };
    return s;
  };
  it("lets an admin set it, and says how it is with no word", async () => {
    const s = withRpc({ data: { ok: true, reach: "map" } });
    expect(await s.sendMessage("/townchat")).toBe("reach-town");
    expect(await s.sendMessage("/townchat MAP")).toBe("reach-map");
    expect(s.client.rpc).toHaveBeenCalledWith("town_set_chat_reach", { p_reach: "map" });
    expect(s.chatReach).toBe("map");
    expect(s.current.chat).not.toHaveBeenCalled();
  });
  it("tells a member it is an admin's, a wrong word how to use it, and an old database that it is not there", async () => {
    expect(await withRpc({ data: { ok: false, why: "forbidden" } }).sendMessage("/townchat map")).toBe("reach-forbidden");
    expect(await withRpc({}).sendMessage("/townchat everyone")).toBe("reach-usage");
    expect(await withRpc({ error: { code: "PGRST202" } }).sendMessage("/townchat town")).toBe("reach-unavailable");
    const s = withRpc({ data: { ok: false, why: "forbidden" } }); await s.sendMessage("/townchat map");
    expect(s.chatReach).toBe("town");
  });
  it("reads the switch from the database, and keeps the town hearing everybody before v294", async () => {
    const s = withRpc({ data: "map" });
    await s.readReach(); expect(s.chatReach).toBe("map");
    s.client.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    await s.readReach(); expect(s.chatReach).toBe("town");
    s.client.rpc.mockResolvedValue({ data: null, error: { code: "57014" } });
    s.chatReach = "map"; await s.readReach(); expect(s.chatReach).toBe("map");
  });
});

describe("resting off the map while away", () => {
  it("counts away time from the first moment, and comes back to the map at once", () => {
    const s = stay();
    vi.stubGlobal("document", { visibilityState: "hidden" });
    s.updateAway();
    expect(s.awaySince).toBeTypeOf("number");
    expect(s.tell).toHaveBeenCalledWith({ away: true });
    const since = s.awaySince; s.self.info.away = true;
    s.updateAway(); expect(s.awaySince).toBe(since);
    vi.stubGlobal("document", { visibilityState: "visible" });
    s.updateAway();
    expect(s.awaySince).toBeNull();
    expect(s.current.rest).toHaveBeenCalledWith(false);
    expect(s.tell).toHaveBeenLastCalledWith({ away: false });
    expect(REST_AFTER_MS).toBe(120_000);
  });
});
