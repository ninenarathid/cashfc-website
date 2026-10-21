"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Doing } from "./room";
import { placeOf, type Place } from "./world";

export const STATE_SETTLE_MS = 80;
const EVENTS = ["hi", "mv", "st", "fg", "fx", "chat"] as const;
type Payload = Record<string, unknown>;

/** One broadcast subscription for the map I am watching; no extra presence. */
export class AreaChannel {
  private channel: RealtimeChannel | null = null;
  private area: Place | null = null;
  private closed = false;
  private legacy = false;
  private social = "";
  private generation = 0;
  /** Away for a while: off the map's channel, still in the room (presence, chat, voice status). */
  private resting = false;

  constructor(private readonly options: {
    client: SupabaseClient;
    topic: string;
    id: string;
    private: boolean;
    doing: () => Doing | undefined;
    global: (event: string, payload: Payload) => boolean;
    receive: (event: string, payload: Payload) => void;
    trouble: (status: string, error?: Error) => void;
    ready: () => void;
  }) {}

  setLegacy(legacy: boolean) { this.legacy = legacy; }
  get ready() { return this.channel?.state === "joined"; }
  get away() { return this.resting; }

  /**
   * Somebody away (a hidden tab, another page of the site) needs nobody's
   * steps: leave the map's channel and keep the room. Where I stand is told
   * to the whole room once, so a newcomer to my map still finds me where I am.
   * Back (rest(false)): the map is joined again and its hello brings every
   * position back, as on changing maps.
   */
  rest(on: boolean) {
    if (this.closed || on === this.resting) return;
    this.resting = on;
    if (!on) { this.sync(); return; }
    ++this.generation;
    const ch = this.channel;
    this.channel = null;
    if (ch) void this.options.client.removeChannel(ch);
    const d = this.options.doing();
    if (!d) return;
    this.area = placeOf(d.x, d.y) ?? this.area;
    if (this.options.global("st", { id: this.options.id, ...d })) this.social = this.socialStamp(d);
  }

  private socialStamp(d: Doing) {
    return JSON.stringify({ voice: d.voice, muted: d.muted, away: d.away, circle: d.circle ?? "", sign: d.sign ?? "" });
  }

  private cast(event: string, payload: Payload): boolean {
    const ch = this.channel;
    if (this.closed || ch?.state !== "joined" || !this.options.client.realtime.isConnected()) return false;
    void ch.send({ type: "broadcast", event, payload });
    return true;
  }

  /** Global voice/chat-room status still reaches friends on every map. */
  private shareSocial(d: Doing, moved: boolean) {
    const fields = { voice: d.voice, muted: d.muted, away: d.away, circle: d.circle ?? "", sign: d.sign ?? "" };
    const stamp = this.socialStamp(d);
    if (!moved && stamp === this.social) return;
    if (this.options.global("st", { id: this.options.id, ...fields, ...(moved ? { x: d.x, y: d.y } : {}) })) this.social = stamp;
  }

  /** A map transition publishes its destination once, then leaves the old map. */
  sync(d = this.options.doing()): boolean {
    if (this.closed || this.resting || !d) return false;
    const area = placeOf(d.x, d.y);
    if (!area) return false;
    if (this.channel && this.area === area) return false;
    const previous = this.channel;
    const moved = this.area !== null && this.area !== area;
    this.area = area;
    const generation = ++this.generation;
    if (previous) void this.options.client.removeChannel(previous);
    const ch = this.options.client.channel(`${this.options.topic}:z:${area}`, {
      config: { private: this.options.private, broadcast: { self: false, ack: false } },
    });
    this.channel = ch;
    for (const event of EVENTS) {
      ch.on("broadcast", { event }, ({ payload }) => {
        if (this.closed || this.channel !== ch || generation !== this.generation) return;
        // A warp changes the local map before its throttled move is sent.
        // Do not let a last packet from the previous subscription follow us.
        const current = this.options.doing();
        if (event === "chat" && (!current || placeOf(current.x, current.y) !== this.area)) return;
        this.options.receive(event, payload as Payload);
      });
    }
    ch.subscribe((status, error) => {
      if (this.closed || this.channel !== ch || generation !== this.generation) return;
      if (status === "SUBSCRIBED") {
        const current = this.options.doing();
        // Always announce the latest state, including moves made while joining.
        if (current && placeOf(current.x, current.y) === this.area) this.cast("hi", { id: this.options.id, ...current });
        this.options.ready();
      } else this.options.trouble(status, error);
    });
    if (moved) this.shareSocial(d, true);
    else this.social = this.socialStamp(d);
    return true;
  }

  send(event: string, payload: Payload, d = this.options.doing()): boolean {
    if (this.closed) return false;
    if (this.resting) return this.sendResting(event, payload, d);
    const changed = this.sync(d);
    // A browser opened before this release only hears the original room.
    // Local chat never falls back to a town-wide broadcast for old clients.
    if (this.legacy && event !== "chat") return this.options.global(event, payload);
    if (d) this.shareSocial(d, false);
    // A new channel's hello already carries the complete, current position/state.
    if (changed && (event === "mv" || event === "st")) return true;
    return this.cast(event, payload);
  }

  /**
   * Resting, nobody hears my map's own events. Only what the room keeps for
   * everybody still goes: voice and chat-room status, and my whole state if I
   * end up on another map (a boat, say), so that both maps place me right.
   */
  private sendResting(event: string, payload: Payload, d: Doing | undefined): boolean {
    if (this.legacy && event !== "chat") return this.options.global(event, payload);
    if (!d || (event !== "mv" && event !== "st")) return false;
    const area = placeOf(d.x, d.y);
    if (area && area !== this.area) {
      this.area = area;
      if (!this.options.global("st", { id: this.options.id, ...d })) return false;
      this.social = this.socialStamp(d);
      return true;
    }
    this.shareSocial(d, false);
    return false;
  }

  check() {
    if (this.closed || this.resting) return;
    this.sync();
    if (this.channel && this.channel.state !== "joined") this.options.trouble("area reconnecting");
  }

  async leave() {
    this.closed = true;
    ++this.generation;
    const ch = this.channel;
    this.channel = null;
    if (ch && this.options.client.getChannels().includes(ch)) await this.options.client.removeChannel(ch);
  }
}
