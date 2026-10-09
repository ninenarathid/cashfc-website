"use client";

import { createClient as createSupabase, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { cleanChat } from "./chat";
import { decodeLook } from "./look";
import { decodeSign, encodeSign } from "./sign";
import { TOOL_WORD } from "./tools";
import { BENCHES, KITCHEN, SIT_HERE, YARD_SEATS } from "./world";

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
 *     room, each would be delivered to everybody. And what two people tell
 *     each other while they play a game together (`pg`: lib/town/handing),
 *     five words a go.
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
  /**
   * Which way somebody who sits has turned: 1 to the right of the screen, 2 to the left, 0 or missing as their seat
   * has them (the owner, 2026-10-08: whoever sits stays sat, and a tap only turns them). Missing from a browser older
   * than that, which draws everybody as their seat has them.
   */
  turn?: number;
  /** Typing a chat line now ("…" over their head); missing from a browser older than that. */
  typing?: boolean;
  /** The dish being eaten (its name in lib/town/items), "" when none; missing from a browser older than meals. */
  eat?: string;
  /** The thing held in the hand (its name in lib/town/items), "" when none; missing from a browser older than hands. */
  hold?: string;
  /** Whether the bucket held in the hand has water in it; missing from a browser older than that, and then nothing is known of it. */
  wet?: boolean;
  /** Whether they have no stamina left; missing from a browser older than that, and then nothing is known of it. (Water handed on is a game only where somebody has none: lib/town/handing.) */
  spent?: boolean;
  /** The familiar that follows them (its name in lib/town/gifts), "" when none; missing from a browser older than familiars. Drawn at their heels by everybody's page; it does nothing here. */
  pet?: string;
  // ── mining ──
  /** How far their own light reaches in the cave when something they wear lights more than a walker's own does (a miner's lamp: 4), 0 or missing otherwise. Missing from a browser older than the cave. Every page lights their ground by it; it does nothing else. */
  lit?: number;
  /** Fishing: 1 with a rod in hand, 2 with a line in the water, 3 with a fish on, 4 for a moment when one has just been landed; 0 or missing when not. Where the float is follows from where they stand (lib/town/world's fishFrom). */
  fish?: number;
  /** The sign held up over their head (lib/town/sign: a chat room, or a stall), "" when none; missing from a browser older than signs. */
  sign?: string;
  /** The chat room they are in (lib/town/circle): its holder's id, their own when they hold it, "" when none; missing from a browser older than that. */
  circle?: string;
  /**
   * (forging) What the tool in their hand carries (lib/town/tools' toolWord: how it glows, a letter for each gem set
   * in it, the level a gem works at): a few characters, `1`, `0i1`, `2ffw2`; "" for a plain one, missing from a
   * browser older than forging. Every page draws the glow and the gems' elements from it and walks its holder by it.
   */
  tool?: string;
  // ── felling ──
  /**
   * What they do at a tree of the mountain's (lib/town/trees' `fellWord`): "f" and the tree's number while their
   * board is up at it, then every other tree their go holds, each after a dot ("f12", "f12.13.15"); "b" and its
   * number while they brace its trunk for somebody; "" when neither; missing from a browser older than that. Every
   * page reads from it which trees are held and by whom.
   */
  fell?: string;
  // ── end: felling ──
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
  /** A word of a chat room, into my letterbox (raw: lib/town/circle reads it). */
  onCircle(from: string, word: unknown): void;
  /** Somebody playing a game with me, or asking to, says something (raw: read it before believing it). */
  onPair(from: string, data: unknown): void;
  /** Somebody did something the others will want to see (raw: a word for what, never the change itself, which each asks the database for). */
  onNudge(id: string, what: unknown): void;
  /** Somebody tried their luck at the forge, and how it went (raw: lib/town/forge-show reads it; it is only shown). */
  onForged(id: string, told: unknown): void;
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
  /** A word of a chat room (lib/town/circle), into one person's letterbox: never to the room. */
  circle(to: string, word: Record<string, unknown>): void;
  /** Into one person's letterbox: a word of a game the two of us play together. */
  pair(to: string, data: unknown): void;
  /** Say that something of the town's game changed (the farm, the kitchen), to everybody; or, into one letterbox, that a deal with them did. */
  nudge(what: string, to?: string): void;
  /** A try of mine at the forge, for everybody in the room to see over my head (lib/town/forge-show). */
  forged(told: Record<string, unknown>): void;
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
  // (a bench of the town's, the ground, or a place at one of the cooking yard's tables)
  if (sit !== undefined && Number.isInteger(sit) && ((sit >= SIT_HERE && sit < BENCHES.length) || (sit >= YARD_SEATS && sit < YARD_SEATS + KITCHEN.seats.length))) d.sit = sit;
  if (p.turn === 0 || p.turn === 1 || p.turn === 2) d.turn = p.turn;
  const typing = bool(p.typing);
  if (typing !== undefined) d.typing = typing;
  if (typeof p.eat === "string" && /^[A-Za-z]{0,24}$/.test(p.eat)) d.eat = p.eat;
  if (typeof p.hold === "string" && /^[A-Za-z]{0,24}$/.test(p.hold)) d.hold = p.hold;
  const wet = bool(p.wet);
  if (wet !== undefined) d.wet = wet;
  const spent = bool(p.spent);
  if (spent !== undefined) d.spent = spent;
  if (typeof p.pet === "string" && /^[A-Za-z]{0,24}$/.test(p.pet)) d.pet = p.pet;
  if (typeof p.lit === "number" && Number.isInteger(p.lit) && p.lit >= 0 && p.lit <= 9) d.lit = p.lit;   // ── mining ──
  if (p.fish === 0 || p.fish === 1 || p.fish === 2 || p.fish === 3 || p.fish === 4) d.fish = p.fish;
  // (a sign is written again from what was read of it: its title is somebody's own words, cleaned like a line of chat)
  if (typeof p.sign === "string") { const sign = decodeSign(p.sign); d.sign = sign ? encodeSign(sign) : ""; }
  if (typeof p.circle === "string" && /^[A-Za-z0-9_-]{0,64}$/.test(p.circle)) d.circle = p.circle;
  // (forging)
  if (typeof p.tool === "string" && (p.tool === "" || TOOL_WORD.test(p.tool))) d.tool = p.tool;
  // ── felling ──
  // (the shape of lib/town/trees' `fellWord`, kept here too: that file is the mountain's, and no part of a page without it)
  if (typeof p.fell === "string" && /^(?:f\d{1,4}(?:\.\d{1,4}){0,3}|b\d{1,4})?$/.test(p.fell)) d.fell = p.fell;
  // ── end: felling ──
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
  room.on("broadcast", { event: "nd" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onNudge(p.id, p.w);
  });
  room.on("broadcast", { event: "fg" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onForged(p.id, p);
  });

  /* ── my letterbox ── */
  const box: RealtimeChannel = supabase.channel(boxOf(me.id), {
    config: { private: isPrivate, broadcast: { self: false, ack: false } },
  });
  box.on("broadcast", { event: "st" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onDoing(p.id, readDoing(p));
  });
  box.on("broadcast", { event: "nd" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onNudge(p.id, p.w);
  });
  box.on("broadcast", { event: "cr" }, ({ payload }) => {
    const p = payload as { from?: unknown; w?: unknown };
    if (typeof p?.from === "string" && p.from !== me.id) h.onCircle(p.from, p.w);
  });
  box.on("broadcast", { event: "rtc" }, ({ payload }) => {
    const p = payload as { from?: unknown; data?: unknown };
    if (typeof p?.from === "string" && p.from !== me.id) h.onSignal(p.from, p.data);
  });
  box.on("broadcast", { event: "pg" }, ({ payload }) => {
    const p = payload as { from?: unknown; data?: unknown };
    if (typeof p?.from === "string" && p.from !== me.id) h.onPair(p.from, p.data);
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
    circle(to, word) { post(to, "cr", { from: me.id, w: word }); },
    pair(to, data) { post(to, "pg", { from: me.id, data }); },
    nudge(what, to) { if (to) post(to, "nd", { id: me.id, w: what }); else cast("nd", { id: me.id, w: what }); },
    forged(told) { cast("fg", { ...told, id: me.id }); },
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
