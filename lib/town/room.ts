"use client";

import { createClient as createSupabase, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { cleanChat } from "./chat";
import { decodeLook } from "./look";
import { BENCHES, SIT_HERE } from "./world";

/**
 * The town's room on Supabase Realtime, written around the plan's limits
 * (checked 2026-10-01), because breaking them is what made the first version
 * drop people:
 *
 *   · presence may be updated 5 times per 30 seconds per person, with at most
 *     10 fields, and 50 presence deliveries a second for the whole project;
 *   · every message delivered counts towards 500 a second for the whole
 *     project, shared with the party board and the bell.
 *
 * The first version re-sent its presence on every step and lost the room
 * after a few clicks. So:
 *
 *   · presence says only who is here: name, face, colour, sent once per join;
 *   · where somebody walks, and whether their microphone is on, are broadcasts
 *     in the room: `hi` on arriving, `mv` for a destination, `st` for a
 *     change, `bye` on leaving; and what they type, `chat`;
 *   · things meant for one person go to their letterbox, not the room:
 *     a private channel only they can read (v102). Those are the replies to
 *     `hi` and the two messages that connect two microphones. Sent to the
 *     room, each would be delivered to everybody.
 *
 * Nothing in any of it is stored. The room's name comes from the database
 * (town_topic), which tells it only to verified members, and the channels are
 * private, so Realtime checks the same rule on every join. A public channel of
 * the same name hears nothing from the private one (tried 2026-10-01).
 */

export interface Identity {
  id: string;
  name: string;
  face: string | null;
  color: string;
}

/**
 * What somebody is doing: where they are walking to, their microphone, and
 * whether they are looking at another page of the site (still in town, and
 * still talking, but not watching the map). And how they look (lib/town/look):
 * it changes in the wardrobe, rarely, and rides along with the rest rather
 * than in presence, which allows only five updates in thirty seconds.
 */
export interface Doing {
  x: number;
  y: number;
  voice: boolean;
  muted: boolean;
  away: boolean;
  /** encodeLook's characters (lib/town/look reads both versions); missing from a browser older than the wardrobe. */
  look?: string;
  /** The bench sat on, an index into BENCHES, SIT_HERE on the ground, or −1; missing from a browser older than the benches. */
  sit?: number;
  /** Typing a chat line now ("…" over their head); missing from a browser older than that. */
  typing?: boolean;
}

/**
 * `reconnecting` is the ordinary hiccup (a sleepy tab, a dropped Wi-Fi): the
 * client is already trying again and the town keeps working meanwhile. The
 * last ones need a person to do something.
 */
export type RoomStatus = "connecting" | "ready" | "reconnecting" | "full" | "needs-migration" | "denied" | "error";

export interface RoomHandlers {
  /** Everybody the room lists now, from presence. */
  onMembers(people: Identity[]): void;
  /** What somebody is doing, or a change to it. */
  onDoing(id: string, doing: Partial<Doing>): void;
  /** Somebody just arrived and wants to know where everybody is. */
  onHello(id: string): void;
  /** Somebody closed the page: gone now, not after a timeout. */
  onBye(id: string): void;
  /** Somebody typed a line (raw: clean it before showing it). */
  onChat(id: string, text: unknown): void;
  onSignal(from: string, data: unknown): void;
  onStatus(status: RoomStatus, detail?: string): void;
}

export interface Room {
  move(x: number, y: number): void;
  say(d: Doing): void;
  /** Into one person's letterbox: where I am, for somebody who just arrived. */
  tell(to: string, d: Doing): void;
  /** Type a line to everybody in the room; false when not connected (nothing was sent). */
  chat(text: string): boolean;
  signal(to: string, data: unknown): void;
  bye(): void;
  /** Make sure the room still lists me; say who I am again if it lost me. */
  check(): void;
  leave(): Promise<void>;
}

/**
 * A Supabase client of the town's own, for its realtime connection.
 *
 * Its own socket rather than the site's, so the town can keep it alive in a
 * tab nobody is looking at: browsers slow a hidden tab's timers to once a
 * minute, the keep-alive misses its turn, and the server hangs up.
 * `worker: true` sends the keep-alive from a Web Worker, which browsers do not
 * slow. It signs in with whatever session the site has, asked afresh on every
 * keep-alive, so a private channel never rejoins on an expired token.
 */
export function townClient(site: SupabaseClient | null, onBeat?: (status: string) => void): SupabaseClient {
  return createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => {
      if (!site) return null;
      const { data } = await site.auth.getSession();
      return data.session?.access_token ?? null;
    },
    realtime: { worker: true, heartbeatCallback: onBeat ? (s) => onBeat(String(s)) : undefined },
  });
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

/** Only the fields we know, of the types we expect: these come from other browsers. */
function readDoing(p: Record<string, unknown>): Partial<Doing> {
  const d: Partial<Doing> = {};
  const x = num(p.x), y = num(p.y), voice = bool(p.voice), muted = bool(p.muted), away = bool(p.away);
  if (x !== undefined && y !== undefined) { d.x = x; d.y = y; }
  if (voice !== undefined) d.voice = voice;
  if (muted !== undefined) d.muted = muted;
  if (away !== undefined) d.away = away;
  if (decodeLook(p.look)) d.look = p.look as string;
  const sit = num(p.sit);
  if (sit !== undefined && Number.isInteger(sit) && sit >= SIT_HERE && sit < BENCHES.length) d.sit = sit;
  const typing = bool(p.typing);
  if (typing !== undefined) d.typing = typing;
  return d;
}

export async function joinTown(
  supabase: SupabaseClient,
  me: Identity,
  h: RoomHandlers,
  /** `doing` is asked afresh whenever the room needs to be told where I am. */
  opts: { testTopic?: string; cancelled?: () => boolean; doing?: () => Doing } = {},
): Promise<Room | null> {
  // A tick before anything else, so a page that mounts and unmounts at once
  // (React's development double-mount, or a quick back-and-forth) can call
  // the first join off before it opens a channel.
  await Promise.resolve();
  if (opts.cancelled?.()) return null;

  let topic = opts.testTopic ?? null;
  if (!topic) {
    const { data, error } = await supabase.rpc("town_topic");
    if (error) {
      // PGRST202: the function is not there, so v101 has not been run.
      h.onStatus(error.code === "PGRST202" ? "needs-migration" : "reconnecting", error.message);
      return null;
    }
    if (!data) { h.onStatus("denied"); return null; }
    topic = data as string;
    // A private channel is checked against the signed-in member's token.
    try { await supabase.realtime.setAuth(); } catch { /* the callback supplies it anyway */ }
  }
  if (opts.cancelled?.()) return null;

  const isPrivate = !opts.testTopic;
  const boxOf = (id: string) => `${topic}:u:${id}`;

  // The client hands back an existing channel for the same name, already
  // subscribed, which cannot take new listeners. Close any left over first.
  for (const old of supabase.getChannels()) {
    if (old.topic === `realtime:${topic}` || old.topic === `realtime:${boxOf(me.id)}`) {
      await supabase.removeChannel(old);
    }
  }
  if (opts.cancelled?.()) return null;

  let leaving = false;
  const outboxes = new Map<string, RealtimeChannel>();

  /* ── the room ── */
  const room: RealtimeChannel = supabase.channel(topic, {
    config: {
      private: isPrivate,
      presence: { key: me.id },
      broadcast: { self: false, ack: false },
    },
  });
  // Three short fields, well inside presence's ten.
  const identity = { n: me.name.slice(0, 40), f: me.face, c: me.color };

  room.on("presence", { event: "sync" }, () => {
    const people: Identity[] = [];
    for (const [id, metas] of Object.entries(room.presenceState<{ n?: string; f?: string | null; c?: string }>())) {
      const m = metas[metas.length - 1];
      if (!m) continue;
      people.push({
        id,
        // From another browser, like a chat line: one clean line, and short.
        name: Array.from(cleanChat(m.n)).slice(0, 40).join("") || "…",
        face: typeof m.f === "string" ? m.f : null,
        color: typeof m.c === "string" && /^#[0-9a-f]{6}$/i.test(m.c) ? m.c : "#6aa9e0",
      });
    }
    h.onMembers(people);
  });
  room.on("broadcast", { event: "hi" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id !== "string" || p.id === me.id) return;
    h.onDoing(p.id, readDoing(p));
    h.onHello(p.id);
  });
  room.on("broadcast", { event: "mv" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onDoing(p.id, readDoing(p));
  });
  room.on("broadcast", { event: "st" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onDoing(p.id, readDoing(p));
  });
  room.on("broadcast", { event: "bye" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onBye(p.id);
  });
  room.on("broadcast", { event: "chat" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onChat(p.id, p.t);
  });

  /* ── my letterbox ── */
  const box: RealtimeChannel = supabase.channel(boxOf(me.id), {
    config: { private: isPrivate, broadcast: { self: false, ack: false } },
  });
  box.on("broadcast", { event: "st" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onDoing(p.id, readDoing(p));
  });
  box.on("broadcast", { event: "rtc" }, ({ payload }) => {
    const p = payload as { from?: unknown; data?: unknown };
    if (typeof p?.from === "string" && p.from !== me.id) h.onSignal(p.from, p.data);
  });

  let roomUp = false;
  let boxUp = false;
  // Into the room only while joined and connected; otherwise the client
  // quietly falls back to one HTTP request per message. Missed moves are not
  // lost: where I am is announced again (`hi`) the moment the room is back.
  const cast = (event: string, payload: Record<string, unknown>): boolean => {
    if (room.state !== "joined" || !supabase.realtime.isConnected()) return false;
    void room.send({ type: "broadcast", event, payload });
    return true;
  };
  // Hello only once my letterbox is open too: the replies go there, and a
  // reply sent before it opens is lost. A newcomer who missed them would not
  // know who has a microphone on, and would hang up on every line the others
  // opened to them.
  const settle = () => {
    if (leaving || !roomUp || !boxUp) return;
    const d = opts.doing?.();
    if (d) cast("hi", { id: me.id, ...d });
    h.onStatus("ready");
  };
  const trouble = (status: string, err?: Error) => {
    if (leaving) return;
    const text = err?.message ?? status;
    h.onStatus(/unauthori[sz]ed|denied|policy|permission/i.test(text) ? "denied" : "reconnecting", text);
  };

  // Called again after every rejoin, which is when the room has forgotten me
  // and I must say who and where I am once more.
  room.subscribe(async (status, err) => {
    if (leaving) return;
    if (status === "SUBSCRIBED") {
      await room.track(identity);
      if (leaving) return;
      roomUp = true;
      settle();
    } else {
      roomUp = false;
      trouble(status, err);
    }
  });
  box.subscribe((status, err) => {
    if (leaving) return;
    if (status === "SUBSCRIBED") { boxUp = true; settle(); }
    else { boxUp = false; trouble(status, err); }
  });

  /** Post into somebody's letterbox, over HTTP: one message, one delivery. */
  const post = (to: string, event: string, payload: Record<string, unknown>) => {
    let ch = outboxes.get(to);
    if (!ch) {
      ch = supabase.channel(boxOf(to), { config: { private: isPrivate } });
      outboxes.set(to, ch);
    }
    void ch.httpSend(event, payload).catch(() => { /* they left; the next one will do */ });
  };

  return {
    move(x, y) { cast("mv", { id: me.id, x, y }); },
    say(d) { cast("st", { id: me.id, ...d }); },
    tell(to, d) { post(to, "st", { id: me.id, ...d }); },
    chat(text) { return cast("chat", { id: me.id, t: text }); },
    signal(to, data) { post(to, "rtc", { from: me.id, data }); },
    bye() { cast("bye", { id: me.id }); },
    check() {
      if (room.state !== "joined") return;
      const mine = room.presenceState()[me.id];
      if (!mine || mine.length === 0) void room.track(identity);
    },
    async leave() {
      leaving = true;
      for (const ch of outboxes.values()) void supabase.removeChannel(ch);
      outboxes.clear();
      if (supabase.getChannels().includes(box)) await supabase.removeChannel(box);
      // Only if it is still ours: a newer join may already have replaced it.
      if (!supabase.getChannels().includes(room)) return;
      try { await room.untrack(); } catch { /* already gone */ }
      await supabase.removeChannel(room);
    },
  };
}
