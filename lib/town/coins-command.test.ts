import { describe, expect, it, vi } from "vitest";
import { TownSession } from "./session";
import { reachNote } from "./chat";

// `/coins <amount>` (v300): Ninenine adds coins to his own purse; the database refuses everybody else.
function session(rpc = vi.fn().mockResolvedValue({ data: { ok: true, coins: 15000 }, error: null })) {
  const chat = vi.fn().mockReturnValue("sent");
  const s: TownSession = Object.assign(Object.create(TownSession.prototype), {
    closed: false, pendingCoins: null, client: { rpc }, sendChat: chat,
  });
  return { s, rpc, chat };
}
describe("/coins", () => {
  it("asks the database for the amount, commas or not, and never says it in chat", async () => {
    const { s, rpc, chat } = session();
    expect(await s.sendMessage(" /coins 10,000 ")).toBe("coins-added");
    expect(rpc).toHaveBeenCalledWith("town_admin_coins", { p_amount: 10000, p_request: expect.any(String) });
    expect(chat).not.toHaveBeenCalled();
    expect(reachNote("coins-added", true)).toBe("เพิ่ม coin เข้ากระเป๋าแล้ว");
  });
  it("refuses an amount it cannot add without asking", async () => {
    const { s, rpc, chat } = session();
    for (const text of ["/coins", "/coins 0", "/coins -5", "/coins 1.5", "/coins 1000001", "/coins lots", "/coins 100 extra", "/coins 10 000", "/coins 1e3", "/coins 1,00"])
      expect(await s.sendMessage(text)).toBe("coins-usage");
    expect(rpc).not.toHaveBeenCalled(); expect(chat).not.toHaveBeenCalled();
  });
  it("says what the database says to anybody but Ninenine, and before v300 has run", async () => {
    expect(await session(vi.fn().mockResolvedValue({ data: { ok: false, why: "forbidden" }, error: null })).s.sendMessage("/coins 100")).toBe("coins-forbidden");
    expect(await session(vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } })).s.sendMessage("/coins 100")).toBe("coins-unavailable");
  });
  it("asks again with the same request after a lost answer, and a new one after", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: "NETWORK" } }).mockResolvedValue({ data: { ok: true, coins: 1 }, error: null });
    const { s } = session(rpc);
    expect(await s.sendMessage("/coins 500")).toBe("offline");
    expect(await s.sendMessage("/coins 500")).toBe("coins-added");
    expect(rpc.mock.calls[1][1].p_request).toBe(rpc.mock.calls[0][1].p_request);
    await s.sendMessage("/coins 500"); expect(rpc.mock.calls[2][1].p_request).not.toBe(rpc.mock.calls[1][1].p_request);
  });
  it("leaves chat that only mentions it alone", async () => {
    const { s, rpc, chat } = session();
    for (const text of ["/coinsx 5", "ใช้ /coins 5"]) expect(await s.sendMessage(text)).toBe("sent");
    expect(chat).toHaveBeenCalledTimes(2); expect(rpc).not.toHaveBeenCalled();
  });
});
