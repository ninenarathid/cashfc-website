import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { joinTown, type Doing, type Room, type RoomHandlers } from "./room";
import { FARM, FOREST } from "./world";
import { STATE_SETTLE_MS } from "./area-channel";
import type { ChatReach } from "./chat";

type Payload = Record<string, unknown>;
type Listener = (value: { payload: Payload }) => void;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

/** A delivery-counting transport. All routing, subscriptions and snapshots
 * still go through joinTown, not through a duplicate of the implementation. */
class Network {
  channels: TestChannel[] = [];
  messages: Array<{ topic: string; event: string; payload: Payload; deliveries: number }> = [];
  send(sender: TestChannel, event: string, payload: Payload) {
    const receivers = this.channels.filter(c => c !== sender && c.state === "joined" && c.topic === sender.topic);
    this.messages.push({ topic: sender.topic, event, payload, deliveries: 1 + receivers.length });
    for (const c of receivers) c.listeners.get(`broadcast:${event}`)?.({ payload });
  }
  sync() {
    for (const c of this.channels.filter(c => c.state === "joined")) c.listeners.get("presence:sync")?.({ payload: {} });
  }
  /** `reach`: who hears a line (lib/town/chat ChatReach); these older cases are about map-only chat. */
  async player(id: string, position = { x: 30, y: 30 }, areas = true, reach: ChatReach = "map") {
    const own: TestChannel[] = [];
    const doing: Doing = { ...position, voice: false, muted: false, away: false };
    const handlers: RoomHandlers = {
      onMembers: vi.fn(), onDoing: vi.fn(), onHello: vi.fn(), onBye: vi.fn(), onChat: vi.fn(),
      onSignal: vi.fn(), onCircle: vi.fn(), onPair: vi.fn(), onNudge: vi.fn(), onForged: vi.fn(), onEffect: vi.fn(), onStatus: vi.fn(),
    };
    const client = {
      channel: (topic: string) => { const c = new TestChannel(this, topic); own.push(c); this.channels.push(c); return c; },
      getChannels: () => own,
      removeChannel: vi.fn(async (c: TestChannel) => {
        c.state = "closed"; this.channels = this.channels.filter(x => x !== c); own.splice(own.indexOf(c), 1); this.sync();
      }),
      realtime: { isConnected: () => true },
    };
    const room = (await joinTown(client as unknown as SupabaseClient, { id, name: id, face: null, color: "#abcdef" }, handlers,
      { testTopic: "cost-test", areas, doing: () => doing, reach: () => reach }))!;
    handlers.onHello = vi.fn(to => room.tell(to, doing, true));
    await flush(); this.sync(); await flush();
    return { room, handlers, doing, own, client };
  }
}
class TestChannel {
  topic: string;
  state = "joining";
  identity: Payload | null = null;
  listeners = new Map<string, Listener>();
  status?: (status: string) => void;
  constructor(private network: Network, topic: string) { this.topic = `realtime:${topic}`; }
  on(type: string, filter: { event: string }, fn: Listener) { this.listeners.set(`${type}:${filter.event}`, fn); return this; }
  subscribe(fn: (status: string) => void) { this.status = fn; queueMicrotask(() => { this.state = "joined"; fn("SUBSCRIBED"); this.network.sync(); }); return this; }
  async track(identity: Payload) { this.identity = identity; this.network.sync(); return "ok"; }
  presenceState() {
    return Object.fromEntries(this.network.channels.filter(c => c.topic === this.topic && c.identity && c.state === "joined")
      .map(c => [String(c.identity!.n), [c.identity!]]));
  }
  async send({ event, payload }: { event: string; payload: Payload }) { this.network.send(this, event, payload); return "ok"; }
  async httpSend(event: string, payload: Payload) { this.network.send(this, event, payload); return { success: true }; }
}
afterEach(() => vi.useRealTimers());

describe("Cash Town Realtime cost and map routing", () => {
  it("uses no application messages for a healthy idle room over one hour", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const network = new Network(), a = await network.player("A"), b = await network.player("B");
    network.messages = [];
    for (let second = 0; second < 3600; second++) {
      await vi.advanceTimersByTimeAsync(1000); a.room.check(); b.room.check();
    }
    expect(network.messages).toEqual([]);
  });
  it("coalesces equipment and status bursts into the final complete snapshot and skips duplicates", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const network = new Network(), a = await network.player("A"); await network.player("B");
    network.messages = [];
    for (let i = 0; i < 10; i++) { Object.assign(a.doing, { hold: "rod", fish: i % 2 }); a.room.say(a.doing); }
    expect(network.messages).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(STATE_SETTLE_MS);
    expect(network.messages).toHaveLength(1);
    expect(network.messages[0]).toMatchObject({ topic: "realtime:cost-test:z:town", event: "st", payload: { hold: "rod", fish: 1 } });
    a.room.say(a.doing); await vi.advanceTimersByTimeAsync(STATE_SETTLE_MS);
    expect(network.messages).toHaveLength(1);
  });
  it("delivers movement, effects and chat only to the current map, with direct voice intact", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B"), c = await network.player("C", { x: FARM.x + 5, y: FARM.y + 5 });
    for (const p of [a, b, c]) { vi.mocked(p.handlers.onDoing).mockClear(); vi.mocked(p.handlers.onEffect!).mockClear(); }
    network.messages = [];
    a.doing.x = 35; a.room.move(35, 30); a.room.effect!("fire"); a.room.chat("hello"); a.room.signal("C", { pc: "one" });
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", { x: 35, y: 30 });
    expect(c.handlers.onDoing).not.toHaveBeenCalled();
    expect(b.handlers.onEffect).toHaveBeenCalledWith("A", "fire"); expect(c.handlers.onEffect).not.toHaveBeenCalled();
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "hello", "town");
    expect(c.handlers.onChat).not.toHaveBeenCalled();
    expect(c.handlers.onSignal).toHaveBeenCalledWith("A", { pc: "one" });
    expect(network.messages.find(m => m.event === "mv")?.deliveries).toBe(2);
    expect(network.messages.find(m => m.event === "chat")).toMatchObject({ topic: "realtime:cost-test:z:town", deliveries: 2 });
  });
  it("keeps global voice and chat-room status current across maps", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const network = new Network(), a = await network.player("A"), b = await network.player("B", { x: FARM.x + 5, y: FARM.y + 5 });
    vi.mocked(b.handlers.onDoing).mockClear();
    Object.assign(a.doing, { voice: true, muted: true, circle: "A" }); a.room.say(a.doing);
    await vi.advanceTimersByTimeAsync(STATE_SETTLE_MS);
    expect(b.handlers.onDoing).toHaveBeenCalledExactlyOnceWith("A", expect.objectContaining({ voice: true, muted: true, circle: "A" }));
  });
  it("changes maps repeatedly without leaking channels or replaying the old map", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B", { x: FARM.x + 5, y: FARM.y + 5 });
    const old = a.own.find(c => c.topic.endsWith(":z:town"))!;
    for (const place of [FARM, FOREST, FARM]) {
      Object.assign(a.doing, { x: place.x + 6, y: place.y + 6 }); a.room.move(a.doing.x, a.doing.y); await flush();
      expect(a.own.filter(c => c.topic.includes(":z:"))).toHaveLength(1);
    }
    vi.mocked(a.handlers.onDoing).mockClear();
    old.listeners.get("broadcast:mv")?.({ payload: { id: "ghost", x: 30, y: 30 } });
    expect(a.handlers.onDoing).not.toHaveBeenCalled();
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ x: FARM.x + 6, y: FARM.y + 6 }));
    await a.room.leave(); expect(a.own).toHaveLength(0);
  });
  it("sends the latest destination after joining, and recovers a rejoined map with a snapshot", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B", { x: FARM.x + 5, y: FARM.y + 5 });
    Object.assign(a.doing, { x: FARM.x + 6, y: FARM.y + 6 }); a.room.move(a.doing.x, a.doing.y);
    a.doing.x += 2; a.room.move(a.doing.x, a.doing.y); await flush();
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ x: FARM.x + 8 }));
    const ch = a.own.find(c => c.topic.endsWith(":z:farm"))!;
    ch.state = "joining"; a.doing.hold = "rod"; a.room.say(a.doing);
    ch.state = "joined"; ch.status?.("SUBSCRIBED"); await flush();
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ hold: "rod" }));
    await a.room.leave();
  });
  it("keeps old clients working, then stops global movement once the last old client leaves", async () => {
    const network = new Network(), a = await network.player("A"), old = await network.player("old", { x: 30, y: 30 }, false);
    network.messages = [];
    a.doing.x = 32; a.room.move(32, 30);
    expect(old.handlers.onDoing).toHaveBeenCalledWith("A", { x: 32, y: 30 });
    expect(network.messages.at(-1)?.topic).toBe("realtime:cost-test");
    await old.room.leave(); network.sync(); network.messages = [];
    a.doing.x = 33; a.room.move(33, 30);
    expect(network.messages.at(-1)?.topic).toBe("realtime:cost-test:z:town");
  });
  it("flushes a pending status with its new movement destination, and cancels pending sends on leave", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const network = new Network(), a = await network.player("A"); await network.player("B"); network.messages = [];
    a.doing.hold = "rod"; a.room.say(a.doing); a.doing.x = 35; a.room.move(35, 30);
    expect(network.messages).toHaveLength(1);
    expect(network.messages[0]).toMatchObject({ event: "st", payload: { hold: "rod", x: 35 } });
    a.doing.hold = "axe"; a.room.say(a.doing); await a.room.leave();
    await vi.advanceTimersByTimeAsync(1000); expect(network.messages).toHaveLength(1);
  });
  it("cuts movement deliveries by two thirds when thirty people are spread across three maps", async () => {
    const network = new Network();
    const players = [];
    const places = [{ x: 30, y: 30 }, { x: FARM.x + 5, y: FARM.y + 5 }, { x: FOREST.x + 5, y: FOREST.y + 5 }];
    for (let i = 0; i < 30; i++) players.push(await network.player(`P${i}`, { ...places[i % 3] }));
    network.messages = [];
    for (const p of players) { p.doing.x += 1; p.room.move(p.doing.x, p.doing.y); }
    const moves = network.messages.filter(m => m.event === "mv");
    expect(moves).toHaveLength(30);
    expect(moves.reduce((sum, m) => sum + m.deliveries, 0)).toBe(300);
    expect(moves.every(m => m.topic.includes(":z:"))).toBe(true);
    network.messages = [];
    for (const p of players) expect(p.room.chat("on my map")).toBe(true);
    expect(network.messages).toHaveLength(30);
    expect(network.messages.reduce((sum, m) => sum + m.deliveries, 0)).toBe(300);
    expect(network.messages.every(m => m.event === "chat" && m.topic.includes(":z:"))).toBe(true);
  });
  it("never broadcasts local chat globally even while movement falls back for an old client", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B");
    await network.player("old", { x: FARM.x + 5, y: FARM.y + 5 }, false);
    network.messages = [];
    expect(a.room.chat("local only")).toBe(true);
    expect(network.messages).toHaveLength(1);
    expect(network.messages[0]).toMatchObject({ topic: "realtime:cost-test:z:town", deliveries: 2 });
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "local only", "town");
  });
  it("rejects a late chat packet after a local warp, before its throttled move changes the subscription", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B");
    Object.assign(b.doing, { x: FARM.x + 5, y: FARM.y + 5 });
    vi.mocked(b.handlers.onChat).mockClear();
    a.room.chat("old map");
    expect(b.handlers.onChat).not.toHaveBeenCalled();
  });
  it("does not claim a chat was sent while a map joins, then resumes it after reconnect", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B");
    const ch = a.own.find(c => c.topic.endsWith(":z:town"))!;
    ch.state = "joining"; network.messages = [];
    expect(a.room.chat("keep my draft")).toBe(false);
    expect(network.messages).toEqual([]);
    ch.state = "joined"; ch.status?.("SUBSCRIBED"); await flush(); network.messages = [];
    expect(a.room.chat("now ready")).toBe(true);
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "now ready", "town");
  });
  it("receives new-map chat after entering, ignores other-map legacy chat, and keeps private rooms direct", async () => {
    const network = new Network(), a = await network.player("A"), b = await network.player("B", { x: FARM.x + 5, y: FARM.y + 5 });
    const old = await network.player("old", { x: 30, y: 30 }, false);
    vi.mocked(b.handlers.onChat).mockClear();
    old.room.chat("legacy town"); expect(b.handlers.onChat).not.toHaveBeenCalled();
    Object.assign(a.doing, { x: FARM.x + 6, y: FARM.y + 6 }); a.room.move(a.doing.x, a.doing.y); await flush();
    a.room.chat("new farm"); expect(b.handlers.onChat).toHaveBeenCalledWith("A", "new farm", "farm");
    a.room.circle("old", { k: "private" });
    expect(old.handlers.onCircle).toHaveBeenCalledWith("A", { k: "private" });
  });
});

describe("Cash Town chat for the whole town, and resting off the map while away", () => {
  const farm = { x: FARM.x + 5, y: FARM.y + 5 };
  it("sends a town-wide line once through the room to every map, while steps stay on the map", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "town"), b = await network.player("B", undefined, true, "town");
    const c = await network.player("C", farm, true, "town");
    vi.mocked(c.handlers.onDoing).mockClear(); network.messages = [];
    expect(a.room.chat("hello town")).toBe(true);
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "hello town", "town");
    expect(c.handlers.onChat).toHaveBeenCalledWith("A", "hello town", "town");
    expect(network.messages).toEqual([expect.objectContaining({ topic: "realtime:cost-test", event: "chat", deliveries: 3 })]);
    a.doing.x = 31; a.room.move(31, 30);
    expect(c.handlers.onDoing).not.toHaveBeenCalled();
    expect(network.messages.at(-1)).toMatchObject({ topic: "realtime:cost-test:z:town", event: "mv" });
  });
  it("hears a map-only browser's line on its own map, and drops another map's line when the town is map-only", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "map"), b = await network.player("B", undefined, true, "town");
    const c = await network.player("C", farm, true, "map");
    a.room.chat("map line");
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "map line", "town");
    expect(c.handlers.onChat).not.toHaveBeenCalled();
    b.room.chat("town line");
    expect(c.handlers.onChat).not.toHaveBeenCalled();
    expect(a.handlers.onChat).toHaveBeenCalledWith("B", "town line", "town");
  });
  it("a resting member leaves the map's channel, is placed once for the room, and hears no steps", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "town"), b = await network.player("B", undefined, true, "town");
    const c = await network.player("C", farm, true, "town");
    vi.mocked(a.handlers.onDoing).mockClear(); vi.mocked(c.handlers.onDoing).mockClear(); network.messages = [];
    a.doing.x = 33; a.room.rest!(true); await flush();
    expect(a.own.filter(ch => ch.topic.includes(":z:"))).toHaveLength(0);
    expect(network.messages).toEqual([expect.objectContaining({ topic: "realtime:cost-test", event: "st", deliveries: 3 })]);
    expect(c.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ x: 33, y: 30 }));
    network.messages = [];
    b.doing.x = 28; b.room.move(28, 30); b.room.effect!("fire");
    expect(a.handlers.onDoing).not.toHaveBeenCalled();
    expect(network.messages.map(m => m.deliveries)).toEqual([1, 1]);
    // Still in the room: the town's chat, and voice status that everybody sees.
    b.room.chat("still there?");
    expect(a.handlers.onChat).toHaveBeenCalledWith("B", "still there?", "town");
    network.messages = [];
    a.doing.muted = true; a.room.say(a.doing); await new Promise(r => setTimeout(r, STATE_SETTLE_MS + 20));
    expect(network.messages).toEqual([expect.objectContaining({ topic: "realtime:cost-test", event: "st" })]);
    expect(c.handlers.onDoing).toHaveBeenLastCalledWith("A", expect.objectContaining({ muted: true }));
    a.doing.hold = "rod"; a.room.say(a.doing); await new Promise(r => setTimeout(r, STATE_SETTLE_MS + 20));
    expect(network.messages).toHaveLength(1);
    a.room.check(); expect(a.handlers.onStatus).not.toHaveBeenCalledWith("reconnecting", expect.anything());
  });
  it("comes back from resting on the map's channel, and everybody's position with it", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "town"), b = await network.player("B", undefined, true, "town");
    a.room.rest!(true); await flush();
    b.doing.x = 25; b.room.move(25, 30);
    vi.mocked(a.handlers.onDoing).mockClear();
    a.doing.hold = "rod"; a.room.rest!(false); await flush();
    expect(a.own.filter(ch => ch.topic.endsWith(":z:town") && ch.state === "joined")).toHaveLength(1);
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ hold: "rod" }));
    expect(a.handlers.onDoing).toHaveBeenCalledWith("B", expect.objectContaining({ x: 25, y: 30 }));
    vi.mocked(a.handlers.onDoing).mockClear();
    b.doing.x = 26; b.room.move(26, 30);
    expect(a.handlers.onDoing).toHaveBeenCalledWith("B", { x: 26, y: 30 });
  });
  it("resting and map-only, a line goes through the room and only my map shows it", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "map"), b = await network.player("B", undefined, true, "map");
    const c = await network.player("C", farm, true, "map");
    a.room.rest!(true); await flush(); network.messages = [];
    expect(a.room.chat("from another page")).toBe(true);
    expect(network.messages[0]).toMatchObject({ topic: "realtime:cost-test", event: "chat" });
    expect(b.handlers.onChat).toHaveBeenCalledWith("A", "from another page", "town");
    expect(c.handlers.onChat).not.toHaveBeenCalled();
  });
  it("resting and carried to another map, both maps are told where I am", async () => {
    const network = new Network();
    const a = await network.player("A", undefined, true, "town"), b = await network.player("B", undefined, true, "town");
    const c = await network.player("C", farm, true, "town");
    a.room.rest!(true); await flush();
    vi.mocked(b.handlers.onDoing).mockClear(); vi.mocked(c.handlers.onDoing).mockClear(); network.messages = [];
    Object.assign(a.doing, farm, { x: farm.x + 1 }); a.room.move(a.doing.x, a.doing.y);
    expect(network.messages).toEqual([expect.objectContaining({ topic: "realtime:cost-test", event: "st" })]);
    expect(b.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ x: farm.x + 1 }));
    expect(c.handlers.onDoing).toHaveBeenCalledWith("A", expect.objectContaining({ x: farm.x + 1 }));
    a.room.rest!(false); await flush();
    expect(a.own.filter(ch => ch.topic.endsWith(":z:farm"))).toHaveLength(1);
  });
});
