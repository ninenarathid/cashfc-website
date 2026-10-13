import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST, DELETE } from "../../app/api/verify-character/route";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("./server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "A" } } });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
describe("character verification respects the active device before using the service role", () => {
  it("refuses every method for a replaced session even while Supabase Auth accepts its JWT", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await GET(new Request("https://example.test/api/verify-character?characterId=123"))).status).toBe(401);
    expect((await POST(new Request("https://example.test/api/verify-character", { method: "POST" }))).status).toBe(401);
    expect((await DELETE()).status).toBe(401);
    expect(mocks.rpc).toHaveBeenCalledWith("site_session");
  });
  it("refuses privileged operations when the session check is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect((await DELETE()).status).toBe(401);
  });
  it("does not ask the database to claim a signed-out user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await DELETE()).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("lets the current session reach normal request validation", async () => {
    expect((await GET(new Request("https://example.test/api/verify-character"))).status).toBe(400);
  });
});
