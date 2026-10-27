// CASINO_NATIVE_MAP: native Town runtime, private admin rehearsal.
"use client";

import { isMood } from "./expression";
import { createClient as createSupabase, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { cleanChat, isPlace, type ChatReach } from "./chat";
import { decodeLook } from "./look";
import { decodeSign, encodeSign } from "./sign";
import { TOOL_WORD } from "./tools";
import { BENCHES, KITCHEN, SIT_HERE, YARD_SEATS, placeOf, type Place } from "./world";
import { AreaChannel, STATE_SETTLE_MS } from "./area-channel";

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
  /** Trying clothes on at Granny Twilla's (the look is not theirs yet: a tag says so); missing from a browser older than the shop. */
  trying?: boolean;
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
  /**
   * Whether they walk beside the familiar they could ride (a moss stag, a cloud ram: lib/town/riding) rather than on
   * its back: true on foot, false riding; missing from a browser older than getting down, which rides always.
   */
  afoot?: boolean;
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
  /**
   * ── a giant pulled out together ── (lib/town/giant-pull's `pullWord`): the giant's root, the start as they know it
   * (0 before), and how many half-swings they have pulled well, "134,6:0:0"; "" when in no crew; missing from a browser
   * older than that. Every page of the crew shows each one's pulls by it, and starts when the caller's word says so.
   */
  pull?: string;
  /** What they carry in both hands that is no thing of the bag (a stone for the bridge: lib/town/bridge), "" when nothing; missing from a browser older than that. Whoever carries something walks slower, on every page that walks them (lib/town/carry). */
  carry?: string;
  /** The face they make for a moment (lib/town/expression: 0 none, else its place in the list plus one); missing from a browser older than faces. */
  mood?: number;
  /** The flame they bear from a fire to a lamp post (lib/town/lamps): the moment it dies, in ms of the clock of whoever keeps the game; 0 when none; missing from a browser older than that. Every page draws it in their hands, with what is left of it. */
  flame?: number;
  /**
   * ── the pasture ── Where they sit that is no seat of their own (lib/town/riding): "r:" and a rider's id, behind them
   * on a cloud ram; "w:" and a run's id, on the hay wagon; "" when neither; missing from a browser older than that.
   * Every page puts them there, and walks them no more while they sit.
   */
  seat?: string;
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
  /** Somebody typed a line (raw: clean it before showing it), on the map they say; a browser older than maps says none. */
  onChat(id: string, text: unknown, area?: Place): void;
  onSignal(from: string, data: unknown): void;
  /** A word of a chat room, into my letterbox (raw: lib/town/circle reads it). */
  onCircle(from: string, word: unknown): void;
  /** Somebody playing a game with me, or asking to, says something (raw: read it before believing it). */
  onPair(from: string, data: unknown): void;
  /** Somebody did something the others will want to see (raw: a word for what, never the change itself, which each asks the database for). */
  onNudge(id: string, what: unknown): void;
  /** Somebody tried their luck at the forge, and how it went (raw: lib/town/forge-show reads it; it is only shown). */
  onForged(id: string, told: unknown): void;
  /** A short, cosmetic equipment-use pulse. Older clients may ignore it. */
  onEffect?(id: string, word: unknown): void;
  onStatus(status: RoomStatus, detail?: string): void;
}

export interface Room {
  identify(me: Identity): void;
  move(x: number, y: number): void;
  say(d: Doing): void;
  /** Into one person's letterbox: where I am, for somebody who just arrived. */
  tell(to: string, d: Doing, requested?: boolean): void;
  /** Type a line to the town, or to the current map when the switch says so; false when its channel is not ready. */
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
  effect?(word: string): void;
  bye(): void;
  /** Make sure the room still lists me; say who I am again if it lost me. */
  check(resync?: boolean): void;
  /** Away a while: off my map's channel (AreaChannel.rest), still in the room. */
  rest?(on: boolean): void;
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
  const trying = bool(p.trying);
  if (trying !== undefined) d.trying = trying;
  if (typeof p.eat === "string" && /^[A-Za-z]{0,24}$/.test(p.eat)) d.eat = p.eat;
  if (typeof p.hold === "string" && /^[A-Za-z]{0,24}$/.test(p.hold)) d.hold = p.hold;
  const wet = bool(p.wet);
  if (wet !== undefined) d.wet = wet;
  const spent = bool(p.spent);
  if (spent !== undefined) d.spent = spent;
  if (typeof p.pet === "string" && /^[A-Za-z]{0,24}$/.test(p.pet)) d.pet = p.pet;
  const afoot = bool(p.afoot);
  if (afoot !== undefined) d.afoot = afoot;
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
  if (typeof p.pull === "string" && /^(?:\d{1,4},\d{1,4}:\d{1,15}:\d{1,2})?$/.test(p.pull)) d.pull = p.pull;
  if (typeof p.carry === "string" && /^[a-z]{0,24}$/.test(p.carry)) d.carry = p.carry;
  if (typeof p.flame === "number" && Number.isFinite(p.flame) && p.flame >= 0) d.flame = Math.floor(p.flame);
  if (isMood(p.mood)) d.mood = p.mood;
  // ── the pasture ── (behind a cloud ram's rider, or on the hay wagon: "r:" or "w:" and an id; "" for neither)
  if (typeof p.seat === "string" && /^(?:[rw]:[A-Za-z0-9_-]{1,64})?$/.test(p.seat)) d.seat = p.seat;
  return d;
}

export async function joinTown(
  supabase: SupabaseClient,
  me: Identity,
  h: RoomHandlers,
  /** `doing` is asked afresh whenever the room needs to be told where I am. */
  opts: { testTopic?: string; privateTopic?: boolean; cancelled?: () => boolean; doing?: () => Doing; areas?: boolean; reach?: () => ChatReach } = {},
): Promise<Room | null> {
  // A tick before anything else, so a page that mounts and unmounts at once
  // (React's development double-mount, or a quick back-and-forth) can call
  // the first join off before it opens a channel.
  await Promise.resolve();
  if (opts.cancelled?.()) return null;

  let topic = opts.testTopic ?? null;
  let areas = !!opts.testTopic && !opts.privateTopic && opts.areas !== false;
  if (!topic) {
    // The capability RPC exists only after the area's private policies are ready.
    // Older databases continue to use the original private room.
    const capability = await supabase.rpc("town_zone_topic", { p_zone: "town" });
    if (!capability.error && typeof capability.data === "string" && capability.data.endsWith(":z:town")) {
      topic = capability.data.slice(0, -":z:town".length);
      areas = opts.areas !== false;
    } else if (capability.error && capability.error.code !== "PGRST202") {
      h.onStatus("reconnecting", capability.error.message);
      return null;
    }
  }
  if (!topic) {
    const { data, error } = await supabase.rpc("town_topic");
    if (error) {
      // PGRST202: the function is not there, so v101 has not been run.
      h.onStatus(error.code === "PGRST202" ? "needs-migration" : "reconnecting", error.message);
      return null;
    }
    if (!data) { h.onStatus("denied"); return null; }
    topic = data as string;
  }
  if (opts.cancelled?.()) return null;

  const isPrivate = !opts.testTopic || opts.privateTopic === true;
  if (!opts.testTopic) {
    try { await supabase.realtime.setAuth(); } catch { /* the callback supplies it anyway */ }
  }
  const multiplex = opts.privateTopic === true;
  if (multiplex) {
    if (topic !== "casino-lab" && topic !== "casino-live") { h.onStatus("denied"); return null; }
    const guard = await supabase.rpc(topic === "casino-lab" ? "casino_lab_allowed" : "casino_live_allowed");
    if (guard.error || guard.data !== true) { h.onStatus("denied"); return null; }
    await supabase.realtime.setAuth();
  }
  const boxOf = (id: string) => `${topic}:u:${id}`;

  // The client hands back an existing channel for the same name, already
  // subscribed, which cannot take new listeners. Close any left over first.
  for (const old of supabase.getChannels()) {
    if (old.topic === `realtime:${topic}` || old.topic === `realtime:${boxOf(me.id)}` || old.topic.startsWith(`realtime:${topic}:z:`)) {
      await supabase.removeChannel(old);
    }
  }
  if (opts.cancelled?.()) return null;

  let leaving = false;
  let roomUp = false;
  let boxUp = multiplex;
  let tracked = false;
  let tracking = false;
  let trackAt = -Infinity;
  let helloAt = -Infinity;
  let epoch = 0;
  let ready = false;
  let identityVersion = 0, sentIdentityVersion = -1;
  const outboxes = new Map<string, RealtimeChannel>();
  const replies = new Map<string, { at: number; state: string; requested: boolean }>();
  let pendingState: Doing | null = null;
  let stateTimer: ReturnType<typeof setTimeout> | null = null;
  let sentState = "";

  /* ── the room ── */
  const room: RealtimeChannel = supabase.channel(topic, {
    config: {
      private: isPrivate,
      presence: { key: me.id },
      broadcast: { self: false, ack: false },
    },
  });
  // Three short fields, well inside presence's ten.
  const identity = { n: me.name.slice(0, 40), f: me.face, c: me.color, ...(areas ? { z: 1 } : {}) };

  room.on("presence", { event: "sync" }, () => {
    const people: Identity[] = [];
    let legacy = false;
    for (const [id, metas] of Object.entries(room.presenceState<{ n?: string; f?: string | null; c?: string; z?: number }>())) {
      const m = metas[metas.length - 1];
      if (!m || typeof m.n !== "string") continue;
      if (id !== me.id && m.z !== 1) legacy = true;
      people.push({
        id,
        // From another browser, like a chat line: one clean line, and short.
        name: Array.from(cleanChat(m.n)).slice(0, 40).join("") || "…",
        face: typeof m.f === "string" ? m.f : null,
        color: typeof m.c === "string" && /^#[0-9a-f]{6}$/i.test(m.c) ? m.c : "#6aa9e0",
      });
    }
    area?.setLegacy(legacy);
    const present = new Set(people.map(p => p.id));
    for (const id of replies.keys()) if (!present.has(id)) replies.delete(id);
    h.onMembers(people);
    settle();
  });
  const receiveWorld = (event: string, p: Record<string, unknown>) => {
    if (typeof p?.id !== "string" || p.id === me.id || (multiplex && p.to && p.to !== me.id)) return;
    if (event === "hi" || event === "mv" || event === "st") {
      h.onDoing(p.id, readDoing(p));
      if (event === "hi") h.onHello(p.id);
    } else if (event === "chat") {
      const d = opts.doing?.();
      const said = isPlace(p.a) ? p.a : undefined;
      if (p.a !== undefined && !said) return;
      // Town-wide, a line from any map is heard; map-only, a line from another map is not mine to hear.
      // (A browser older than maps names none: the session hears it only from somebody on my map.)
      if (said && opts.reach?.() !== "town" && (!d || said !== placeOf(d.x, d.y))) return;
      h.onChat(p.id, p.t, said);
    } else if (event === "fg") h.onForged(p.id, p);
    else if (event === "fx" && typeof p.w === "string" && p.w.length <= 32) h.onEffect?.(p.id, p.w);
  };
  for (const event of ["hi", "mv", "st", "fg", "fx", "chat"]) {
    room.on("broadcast", { event }, ({ payload }) => receiveWorld(event, payload as Record<string, unknown>));
  }
  room.on("broadcast", { event: "bye" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if (typeof p?.id === "string" && p.id !== me.id) h.onBye(p.id);
  });
  room.on("broadcast", { event: "nd" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if ((!multiplex || !p.to || p.to === me.id) && typeof p?.id === "string" && p.id !== me.id) h.onNudge(p.id, p.w);
  });

  /* ── my letterbox ── */
  const box: RealtimeChannel = multiplex ? room : supabase.channel(boxOf(me.id), {
    config: { private: isPrivate, broadcast: { self: false, ack: false } },
  });
  if (!multiplex) box.on("broadcast", { event: "st" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if ((!multiplex || !p.to || p.to === me.id) && typeof p?.id === "string" && p.id !== me.id) h.onDoing(p.id, readDoing(p));
  });
  if (!multiplex) box.on("broadcast", { event: "nd" }, ({ payload }) => {
    const p = payload as Record<string, unknown>;
    if ((!multiplex || !p.to || p.to === me.id) && typeof p?.id === "string" && p.id !== me.id) h.onNudge(p.id, p.w);
  });
  box.on("broadcast", { event: "cr" }, ({ payload }) => {
    const p = payload as { from?: unknown; w?: unknown; to?: unknown };
    if (multiplex && p.to !== me.id) return;
    if (typeof p?.from === "string" && p.from !== me.id) h.onCircle(p.from, p.w);
  });
  box.on("broadcast", { event: "rtc" }, ({ payload }) => {
    const p = payload as { from?: unknown; data?: unknown; to?: unknown };
    if (multiplex && p.to !== me.id) return;
    if (typeof p?.from === "string" && p.from !== me.id) h.onSignal(p.from, p.data);
  });
  box.on("broadcast", { event: "pg" }, ({ payload }) => {
    const p = payload as { from?: unknown; data?: unknown; to?: unknown };
    if (multiplex && p.to !== me.id) return;
    if (typeof p?.from === "string" && p.from !== me.id) h.onPair(p.from, p.data);
  });

  // Into the room only while joined and connected; otherwise the client
  // quietly falls back to one HTTP request per message. Missed moves are not
  // lost: where I am is announced again (`hi`) the moment the room is back.
  const cast = (event: string, payload: Record<string, unknown>): boolean => {
    if (leaving || room.state !== "joined" || !supabase.realtime.isConnected()) return false;
    void room.send({ type: "broadcast", event, payload });
    return true;
  };
  // Hello only once my letterbox is open too: the replies go there, and a
  // reply sent before it opens is lost. A newcomer who missed them would not
  // know who has a microphone on, and would hang up on every line the others
  // opened to them.
  const settle = () => {
    if (leaving || !roomUp || !boxUp || !tracked || !room.presenceState()[me.id]?.length) return;
    area?.sync();
    if (area && !area.ready && !area.away) return;
    hello();
    if (!ready) { ready = true; h.onStatus("ready"); }
  };
  const hello = (force = false) => {
    if (!roomUp || !boxUp || !tracked || leaving) return;
    // A healthy idle room is silent. Rejoin resets this; waking can request
    // another snapshot, but duplicate wake events cannot start a reply storm.
    if (helloAt !== -Infinity && (!force || Date.now() - helloAt < 2_000)) return;
    const d = opts.doing?.();
    if (d && cast("hi", { id: me.id, ...d })) {
      helloAt = Date.now();
      sentState = JSON.stringify(d);
      cancelState();
    }
  };
  const trouble = (status: string, err?: Error) => {
    if (leaving) return;
    ready = false;
    const text = err?.message ?? status;
    h.onStatus(/unauthori[sz]ed|denied|policy|permission/i.test(text) ? "denied" : "reconnecting", text);
  };
  const area = areas ? new AreaChannel({ client: supabase, topic, id: me.id, private: isPrivate,
    doing: () => opts.doing?.(), global: cast, receive: receiveWorld, trouble, ready: settle }) : null;
  const world = (event: string, payload: Record<string, unknown>, d?: Doing) => {
    if (leaving || room.state !== "joined" || !supabase.realtime.isConnected()) return false;
    return area ? area.send(event, payload, d) : cast(event, payload);
  };
  const cancelState = () => {
    if (stateTimer !== null) clearTimeout(stateTimer);
    stateTimer = null;
    pendingState = null;
  };
  const flushState = () => {
    const d = pendingState;
    cancelState();
    if (!d) return;
    const stamp = JSON.stringify(d);
    if (stamp !== sentState && world("st", { id: me.id, ...d }, d)) sentState = stamp;
  };
  // check() runs every second. A missing presence must never turn that into
  // a track flood (the server permits only five tracks in thirty seconds).
  const track = async () => {
    if (leaving || !roomUp || tracking || Date.now() - trackAt < 6_500) return;
    tracking = true;
    trackAt = Date.now();
    const joined = epoch;
    const version = identityVersion;
    try {
      const result = await room.track({ ...identity });
      if (leaving || joined !== epoch) return;
      tracked = result === "ok";
      if (tracked) { sentIdentityVersion = version; settle(); }
      else trouble(`presence ${result}`);
    } catch (error) {
      if (joined === epoch) trouble("presence failed", error instanceof Error ? error : undefined);
    } finally { tracking = false; }
  };

  // Called again after every rejoin, which is when the room has forgotten me
  // and I must say who and where I am once more.
  room.subscribe((status, err) => {
    if (leaving) return;
    if (status === "SUBSCRIBED") {
      roomUp = true;
      helloAt = -Infinity;
      void track();
    } else {
      epoch++;
      roomUp = false;
      tracked = false;
      trouble(status, err);
    }
  });
  if (!multiplex) box.subscribe((status, err) => {
    if (leaving) return;
    if (status === "SUBSCRIBED") { boxUp = true; helloAt = -Infinity; settle(); }
    else { boxUp = false; trouble(status, err); }
  });

  /** Post into somebody's letterbox, over HTTP: one message, one delivery. */
  const post = (to: string, event: string, payload: Record<string, unknown>) => {
    if (leaving) return;
    if (multiplex) { cast(event, { ...payload, to }); return; }
    let ch = outboxes.get(to);
    if (!ch) {
      ch = supabase.channel(boxOf(to), { config: { private: isPrivate } });
      outboxes.set(to, ch);
    }
    void ch.httpSend(event, payload).then(result => {
      if (!result.success) throw new Error("letterbox delivery failed");
    }).catch(() => {
      // Positions are already public to this private room. If a letterbox
      // reply fails, let the room hear it so a newcomer is not left at spawn.
      if (!leaving && event === "st") cast("st", payload);
    });
  };

  return {
    identify(next) {
      if (leaving || next.id !== me.id) return;
      const n = next.name.slice(0, 40);
      if (identity.n === n && identity.f === next.face && identity.c === next.color) return;
      Object.assign(identity, { n, f: next.face, c: next.color });
      identityVersion++;
      void track();
    },
    move(x, y) {
      if (pendingState) { pendingState = { ...pendingState, x, y }; flushState(); }
      else world("mv", { id: me.id, x, y }, opts.doing ? { ...opts.doing(), x, y } : undefined);
    },
    say(d) {
      if (leaving) return;
      pendingState = { ...d };
      if (stateTimer === null) stateTimer = setTimeout(flushState, STATE_SETTLE_MS);
    },
    tell(to, d, requested = false) {
      const state = JSON.stringify(d), previous = replies.get(to), now = Date.now();
      // A proactive presence reply can beat the recipient's mailbox opening.
      // Their first explicit hello must still be answered; subsequent global
      // and area hellos with the same snapshot can share that one reply.
      if (previous?.state === state && now - previous.at < 2_000 && (!requested || previous.requested)) return;
      replies.set(to, { state, at: now, requested });
      post(to, "st", { id: me.id, ...d });
    },
    chat(text) {
      const d = opts.doing?.();
      const here = d && placeOf(d.x, d.y);
      if (!here) return false;
      const line = { id: me.id, t: text, a: here };
      // Town-wide (the owner, 2026-10-22): into the room everybody is in. Map-only: to the map, or to the room
      // while I rest off the map's channel (every other map drops it by its `a`).
      if (!area || opts.reach?.() === "town" || area.away) return cast("chat", line);
      return world("chat", line, d);
    },
    signal(to, data) { post(to, "rtc", { from: me.id, data }); },
    circle(to, word) { post(to, "cr", { from: me.id, w: word }); },
    pair(to, data) { post(to, "pg", { from: me.id, data }); },
    nudge(what, to) { if (to) post(to, "nd", { id: me.id, w: what }); else cast("nd", { id: me.id, w: what }); },
    forged(told) { world("fg", { ...told, id: me.id }); },
    effect(word) { world('fx', { id: me.id, w: word }); },
    bye() { cancelState(); cast("bye", { id: me.id }); },
    check(resync = false) {
      if (leaving) return;
      if (room.state !== "joined" || box.state !== "joined" || !supabase.realtime.isConnected()) {
        trouble("connection lost");
        return;
      }
      const mine = room.presenceState()[me.id];
      if (!tracked || !mine?.length) { trouble("presence missing"); void track(); }
      else { if (sentIdentityVersion !== identityVersion) void track(); hello(resync); settle(); area?.check(); }
    },
    rest(on) { if (!leaving) area?.rest(on); },
    async leave() {
      leaving = true;
      cancelState();
      replies.clear();
      await area?.leave();
      for (const ch of outboxes.values()) void supabase.removeChannel(ch);
      outboxes.clear();
      if (box !== room && supabase.getChannels().includes(box)) await supabase.removeChannel(box);
      // Only if it is still ours: a newer join may already have replaced it.
      if (!supabase.getChannels().includes(room)) return;
      // Unsubscribe removes presence on the server too. Sending untrack first
      // can wait for an acknowledgement on a dead socket and stall recovery.
      await supabase.removeChannel(room);
    },
  };
}
