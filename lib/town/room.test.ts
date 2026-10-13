import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { joinTown, type RoomHandlers, type RoomStatus } from "./room";

class Channel {
  state = "joining";
  topic: string;
  presence: Record<string, Array<{ n: string }>> = {};
  listeners = new Map<string, (value: never) => void>();
  status?: (status: string, error?: Error) => void;
  track = vi.fn(async () => "ok");
  untrack = vi.fn(async () => "ok");
  send = vi.fn(async () => "ok");
  httpSend = vi.fn(async () => ({ success: true }));
  constructor(topic: string) { this.topic = `realtime:${topic}`; }
  on(type: string, filter: { event: string }, fn: (value: never) => void) { this.listeners.set(`${type}:${filter.event}`, fn); return this; }
  subscribe(fn: Channel["status"]) { this.status = fn; return this; }
  presenceState() { return this.presence; }
  subscribed() { this.state = "joined"; this.status?.("SUBSCRIBED"); }
  sync(presence = this.presence) { this.presence = presence; this.listeners.get("presence:sync")?.(undefined as never); }
}
async function setup() {
  const channels: Channel[] = [];
  const connected = vi.fn(() => true);
  const site = {
    getChannels: () => channels,
    channel: (topic: string) => { const c = new Channel(topic); channels.push(c); return c; },
    removeChannel: vi.fn(async (c: Channel) => { channels.splice(channels.indexOf(c), 1); }),
    realtime: { isConnected: connected },
  };
  const statuses: RoomStatus[] = [];
  const handlers: RoomHandlers = {
    onMembers: vi.fn(), onDoing: vi.fn(), onHello: vi.fn(), onBye: vi.fn(),
    onChat: vi.fn(), onSignal: vi.fn(), onCircle: vi.fn(), onPair: vi.fn(),
    onNudge: vi.fn(), onForged: vi.fn(), onStatus: s => { statuses.push(s); },
  };
  let x = 40;
  const room = await joinTown(site as unknown as SupabaseClient, { id: "A", name: "Alice", face: null, color: "#abcdef" }, handlers,
    { testTopic: "test", doing: () => ({ x, y: 30, voice: false, muted: false, away: false }) });
  const [channel, box] = channels;
  return { room: room!, channel, box, connected, channels, statuses, move: () => { x = 50; } };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
afterEach(() => { vi.useRealTimers(); });

describe("town presence and position recovery", () => {
  it("updates the published name without flooding presence or reopening channels", async () => {
    vi.useFakeTimers();
    const s = await setup();
    s.channel.subscribed(); s.box.subscribed(); s.channel.sync({ A: [{ n: "Alice" }] }); await flush();
    const next = { id: "A", name: "Real Character", face: "/face.png", color: "#abcdef" };
    s.room.identify(next);
    expect(s.channel.track).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6500); s.room.check(); await flush();
    expect(s.channel.track).toHaveBeenLastCalledWith({ n: "Real Character", f: "/face.png", c: "#abcdef" });
    s.room.identify(next); s.room.check();
    expect(s.channel.track).toHaveBeenCalledTimes(2);
    expect(s.channels).toHaveLength(2);
    s.room.identify({ ...next, id: "B", name: "Other account" });
    await vi.advanceTimersByTimeAsync(6500); s.room.check();
    expect(s.channel.track).toHaveBeenCalledTimes(2);
  });
  it("waits for successful tracking, its own presence and the letterbox before ready", async () => {
    const s = await setup();
    s.channel.sync({ B: [{ n: "Bob" }] });
    s.channel.subscribed(); await flush();
    s.box.subscribed();
    expect(s.statuses).not.toContain("ready");
    s.channel.sync({ A: [{ n: "Alice" }], B: [{ n: "Bob" }] });
    expect(s.statuses).toEqual(["ready"]);
    expect(s.channel.send).toHaveBeenCalledWith(expect.objectContaining({ event: "hi", payload: expect.objectContaining({ x: 40 }) }));
  });
  it("does not accept a failed track as ready or flood track when presence is missing", async () => {
    vi.useFakeTimers();
    const s = await setup();
    s.channel.track.mockResolvedValue("error");
    s.channel.subscribed(); s.box.subscribed(); await flush();
    for (let i = 0; i < 30; i++) { s.room.check(); await vi.advanceTimersByTimeAsync(1000); }
    expect(s.statuses).not.toContain("ready");
    expect(s.statuses).toContain("reconnecting");
    expect(s.channel.track.mock.calls.length).toBeLessThanOrEqual(5);
    s.channel.track.mockResolvedValue("ok");
    await vi.advanceTimersByTimeAsync(6500); s.room.check(); await flush();
    s.channel.sync({ A: [{ n: "Alice" }] });
    expect(s.statuses.at(-1)).toBe("ready");
  });
  it("ignores a track completion from a connection that has already gone", async () => {
    const s = await setup();
    let finish!: (value: string) => void;
    s.channel.track.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    s.channel.subscribed(); s.box.subscribed(); s.channel.sync({ A: [{ n: "Alice" }] });
    s.channel.state = "errored"; s.channel.status?.("CHANNEL_ERROR");
    finish("ok"); await flush();
    expect(s.statuses).not.toContain("ready");
  });
  it("resends current position after wake and periodically repairs a missed hello", async () => {
    vi.useFakeTimers();
    const s = await setup();
    s.channel.subscribed(); s.box.subscribed(); s.channel.sync({ A: [{ n: "Alice" }] }); await flush();
    s.channel.send.mockClear(); s.move();
    s.room.check(true);
    expect(s.channel.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ event: "hi", payload: expect.objectContaining({ x: 50 }) }));
    s.room.check(); expect(s.channel.send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000); s.room.check();
    expect(s.channel.send).toHaveBeenCalledTimes(2);
  });
  it("reports a lost socket or letterbox so the watchdog can reconnect", async () => {
    const s = await setup();
    s.channel.subscribed(); s.box.subscribed(); s.channel.sync({ A: [{ n: "Alice" }] }); await flush();
    s.connected.mockReturnValue(false); s.room.check();
    expect(s.statuses.at(-1)).toBe("reconnecting");
    s.connected.mockReturnValue(true); s.box.state = "closed"; s.room.check();
    expect(s.statuses.at(-1)).toBe("reconnecting");
  });
  it("repairs a failed position reply through the shared room", async () => {
    const s = await setup();
    s.channel.subscribed(); s.box.subscribed(); s.channel.sync({ A: [{ n: "Alice" }] }); await flush();
    s.room.tell("B", { x: 51, y: 31, voice: false, muted: false, away: false });
    s.channels[2].httpSend.mockRejectedValue(new Error("delivery failed"));
    s.room.tell("B", { x: 52, y: 31, voice: false, muted: false, away: false }); await flush();
    expect(s.channel.send).toHaveBeenCalledWith(expect.objectContaining({ event: "st", payload: expect.objectContaining({ x: 52 }) }));
    await s.room.leave();
    s.room.check(true);
    expect(s.statuses.at(-1)).toBe("ready");
  });
});
