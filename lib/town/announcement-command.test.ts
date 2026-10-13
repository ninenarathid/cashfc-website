import { describe, expect, it, vi } from "vitest";
import { TownSession } from "./session";
import { announcementText } from "./announcements";
import { DbKeeper } from "./keeper";

function session(rpc = vi.fn().mockResolvedValue({ data: { ok: true, id: 12 }, error: null })) {
  const chat = vi.fn().mockReturnValue("sent");
  const s: TownSession = Object.assign(Object.create(TownSession.prototype), {
    closed: false, announcementBusy: false, pendingAnnouncement: null, announcementListeners: new Set(),
    client: { rpc }, self: { info: { look: "51000000" } }, sendChat: chat,
  });
  return { s, rpc, chat };
}
describe("production /announce command", () => {
  it("reads custom announcements while keeping the older feed working before v256 runs", async () => {
    const page = { cursor: 12, events: [] };
    const rpc = vi.fn().mockResolvedValueOnce(page).mockRejectedValueOnce(new Error("missing RPC")).mockResolvedValueOnce(page);
    const keeper: DbKeeper = Object.assign(Object.create(DbKeeper.prototype), { rpc });
    expect(await keeper.announcements(null, "51000000")).toBe(page);
    expect(rpc).toHaveBeenNthCalledWith(1, "town_announcements_v256", { p_after: null, p_look: "51000000" });
    expect(await keeper.announcements(12, null)).toBe(page);
    expect(rpc).toHaveBeenNthCalledWith(3, "town_announcements", { p_after: 12, p_look: null });
  });
  it("publishes through the authenticated RPC and refreshes notices without sending player chat", async () => {
    const { s, rpc, chat } = session(), refreshed = vi.fn();
    const stop = s.watchAnnouncements(refreshed);
    expect(await s.sendMessage(" /announce คืนนี้มีงานเมืองครับ ")).toBe("sent");
    expect(rpc).toHaveBeenCalledWith("town_admin_announce", { p_message: "คืนนี้มีงานเมืองครับ", p_request: expect.any(String), p_look: "51000000" });
    expect(chat).not.toHaveBeenCalled(); expect(refreshed).toHaveBeenCalledOnce();
    stop(); await s.sendMessage("/announce ข้อความถัดไป"); expect(refreshed).toHaveBeenCalledOnce();
  });
  it("keeps ordinary chat and unrelated slash words working", async () => {
    const { s, rpc, chat } = session();
    for (const text of ["สวัสดี", "/announcement hello", "คุยถึง /announce"]) expect(await s.sendMessage(text)).toBe("sent");
    expect(chat).toHaveBeenCalledTimes(3); expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects empty, excessive and control-character messages without leaking them to chat", async () => {
    const { s, rpc, chat } = session();
    for (const text of ["/announce", "/announce   ", "/announce " + "ก".repeat(281), "/announce a\u0000b", "/announce a\nb"]) expect(await s.sendMessage(text)).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled(); expect(chat).not.toHaveBeenCalled();
  });
  it("uses the server refusal even when the caller thinks they are Ninenine", async () => {
    const { s, chat } = session(vi.fn().mockResolvedValue({ data: { ok: false, why: "forbidden" }, error: null }));
    expect(await s.sendMessage("/announce hello")).toBe("forbidden"); expect(chat).not.toHaveBeenCalled();
  });
  it("retries a lost response with the same request UUID and only refreshes on success", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: "NETWORK" } }).mockResolvedValue({ data: { ok: true, id: 12 }, error: null });
    const { s } = session(rpc), refreshed = vi.fn(); s.watchAnnouncements(refreshed);
    expect(await s.sendMessage("/announce hello")).toBe("offline"); expect(refreshed).not.toHaveBeenCalled();
    expect(await s.sendMessage("/announce hello")).toBe("sent");
    expect(rpc.mock.calls[0][1].p_request).toBe(rpc.mock.calls[1][1].p_request);
    await s.sendMessage("/announce hello"); expect(rpc.mock.calls[2][1].p_request).not.toBe(rpc.mock.calls[1][1].p_request);
  });
  it("refuses a second in-flight submit and retains a draft when the RPC is not installed", async () => {
    let finish!: (value: unknown) => void;
    const rpc = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; })), { s } = session(rpc);
    const first = s.sendMessage("/announce hello");
    expect(await s.sendMessage("/announce hello")).toBe("slow"); expect(rpc).toHaveBeenCalledOnce();
    finish({ data: null, error: { code: "PGRST202" } }); expect(await first).toBe("unavailable");
  });
  it("renders the admin's literal text identically in both languages", () => {
    const event = { id: 1, at: 0, member: "owner", name: "Ninenine", kind: "admin" as const, subject: "คืนนี้เจอกัน <3", level: 0, portrait: { look: null, expression: "neutral" } };
    expect(announcementText(event, true)).toBe("Ninenine คืนนี้เจอกัน <3");
    expect(announcementText(event, false)).toBe(announcementText(event, true));
  });
});
