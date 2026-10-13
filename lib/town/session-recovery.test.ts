import { afterEach, describe, expect, it, vi } from "vitest";
import { TownSession } from "./session";
import { joinTown } from "./room";
vi.mock("./room", async (original) => ({ ...await original<typeof import("./room")>(), joinTown: vi.fn(async () => null) }));

afterEach(() => { vi.clearAllMocks(); });
describe("town socket recovery", () => {
  it("corrects a cached Member identity while preserving the walk, equipment and session", () => {
    const pos = { x: 40, y: 30 }, path = [{ x: 41, y: 30 }];
    const s = Object.assign(Object.create(TownSession.prototype), {
      closed: false, me: { id: "A", name: "Member", face: null, color: "#abcdef" },
      self: { info: { id: "A", name: "Member", hold: "axe", look: "saved" }, pos, path },
      current: { identify: vi.fn() }, remember: vi.fn(), notify: vi.fn(), cap: 30,
    });
    s.updateIdentity({ id: "A", name: "Real Character", face: null, color: "#abcdef" });
    expect(s.me.name).toBe("Real Character"); expect(s.self.info.name).toBe("Real Character");
    expect(s.self.info.hold).toBe("axe"); expect(s.self.info.look).toBe("saved");
    expect(s.self.pos).toBe(pos); expect(s.self.path).toBe(path);
    expect(s.current.identify).toHaveBeenCalledTimes(1);
    s.updateIdentity({ ...s.me }); expect(s.current.identify).toHaveBeenCalledTimes(1);
    s.updateIdentity({ ...s.me, id: "B", name: "Wrong Account" }); expect(s.me.name).toBe("Real Character");
  });
  it("discards the old socket before opening new channels and coalesces concurrent wakeups", async () => {
    const steps: string[] = [];
    let finish!: () => void;
    const disconnected = new Promise<void>(resolve => { finish = resolve; });
    const oldClient = {
      getChannels: () => [1],
      realtime: { disconnect: vi.fn(async () => { steps.push("disconnect"); await disconnected; }) },
      removeAllChannels: vi.fn(async () => { steps.push("clear"); }),
    };
    const fresh = {};
    const s = Object.assign(Object.create(TownSession.prototype), {
      closed: false, gen: 0, connecting: false, client: oldClient,
      current: { leave: vi.fn(async () => { steps.push("leave"); }) },
      me: { id: "A" }, options: {}, newClient: vi.fn(() => { steps.push("new"); return fresh; }),
    });
    const first = s.connect();
    await s.connect();
    expect(oldClient.realtime.disconnect).toHaveBeenCalledTimes(1);
    expect(joinTown).not.toHaveBeenCalled();
    finish(); await first;
    expect(steps).toEqual(["disconnect", "leave", "clear", "new"]);
    expect(joinTown).toHaveBeenCalledTimes(1);
    expect(vi.mocked(joinTown).mock.calls[0][0]).toBe(fresh);
    expect(s.connecting).toBe(false);
  });
  it("never rejoins when the player leaves during recovery", async () => {
    const s = Object.assign(Object.create(TownSession.prototype), {
      closed: false, gen: 0, connecting: false,
      client: { getChannels: () => [1], realtime: { disconnect: async () => { s.closed = true; } }, removeAllChannels: async () => {} },
      current: { leave: async () => {} }, newClient: vi.fn(), options: {},
    });
    await s.connect();
    expect(joinTown).not.toHaveBeenCalled();
  });
});
