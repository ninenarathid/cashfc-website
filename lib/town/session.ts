"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { rememberTown, setTownActive } from "./active";
import { Flood, LOG_MAX, chatEvery, cleanChat } from "./chat";
import { admit, fromRoom, hears, listed, newCircle, readWord, without, type Circle, type CircleWord } from "./circle";
import { defaultLook, encodeLook, saveLook, savedLook, type Look } from "./look";
import { joinTown, townClient, type Doing, type Identity, type Room, type RoomStatus } from "./room";
import { SHOP } from "./shop";
import { SIGN, decodeSign, encodeSign, inReach, mayRaise, tidyTitle, type Sign } from "./sign";
import { VoiceMesh, type PeerInfo, type Signal } from "./voice";
import { CART, cartPace } from "./cart";
import {
  BENCHES, FRONT, KITCHEN, SIT_HERE, SPEED, YARD_SEATS, distance, findPath, gateAt, hearing, moveEvery, pickLines, placeOf, spawnFor, stepAlong, yardSeat, type Vec,
} from "./world";

/**
 * One tab's stay in Cash Town: the room, the voice, and everybody's avatar.
 *
 * It lives outside the town's page, so the page can come and go. Walking off
 * to the gallery keeps you in town and still talking, with the dock (TownBar)
 * at the foot of every page; coming back finds everything as it was, with
 * nothing to reconnect. It ends when you leave (the dock's ✕ or the town's
 * own button) or close the tab. A reload, or a link that loads a whole new
 * page, picks it up again (lib/town/active).
 *
 * Who is shown is who is really here. Somebody who closes the tab says
 * goodbye and is gone at once; somebody whose connection dies is gone a few
 * seconds after the room notices, the wait being only long enough to ride out
 * the room re-listing somebody who reconnected.
 */

export interface Person extends Identity, Doing {}

/** How long "…" shows after the last word that somebody is typing, and how often a typist says so again. */
export const TYPING_MS = 10_000;
const TYPING_AGAIN_MS = 6_000;

export interface Avatar {
  info: Person;
  pos: Vec;
  path: Vec[];
  img: HTMLImageElement | null;
  /** Whether we have heard where they are yet; until then they stand where they arrived. */
  placed: boolean;
  /** When the room stopped listing them without a goodbye. */
  goneAt?: number;
  /** When they said goodbye: hidden from then on, gone once the room agrees. */
  byeAt?: number;
  /** What they last typed, for the bubble over their head. */
  said?: { text: string; at: number };
  /** When they last told the room they were typing. */
  typingAt?: number;
}

/** A line of the chat, as this tab heard it. Never stored anywhere. */
export interface ChatLine {
  key: number;
  from: string;
  name: string;
  text: string;
  at: number;
  mine: boolean;
}

export type ChatResult = "sent" | "empty" | "slow" | "offline";

/** How long somebody the room stopped listing (without a goodbye) stays. */
export const GONE_MS = 4_000;

/**
 * How long a goodbye hides somebody the room still lists. Long after one,
 * they are still here: it came from another tab of theirs, or from somebody
 * else pretending (a goodbye carries a name, not a proof), so they come back.
 */
export const BYE_TRUST_MS = 8_000;

/**
 * At most this many in the room. A guard for the whole site rather than a
 * design: every step anybody takes is delivered to everybody, and the
 * project's realtime allowance (500 deliveries a second, shared with the
 * party board and the bell) runs out somewhere past this.
 */
export const ROOM_CAP = 30;

/** How often to knock again on a full room. */
const FULL_RETRY_MS = 30_000;

/** How often the tab's note of being in town is refreshed, for resuming after a reload. */
const SEEN_EVERY_MS = 10_000;

/**
 * How long the wardrobe waits after the last change before telling the room:
 * trying on ten colours in a row is one message to everybody, not ten.
 */
const LOOK_SETTLE_MS = 1_200;

export type MicProblem = "denied" | "no-mic" | "failed";

export interface SessionOptions {
  /** The dev-only public test room (TownGate). */
  testTopic?: string;
  /** For tests; everybody else gets ROOM_CAP. */
  cap?: number;
  /** Back after a reload: the microphone as it was. */
  resume?: { voice: boolean; muted: boolean };
}

export function loadFace(url: string | null): HTMLImageElement | null {
  if (!url) return null;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img;
}

/** Why somebody cannot walk just now: they hold a sign up, are in a chat room, or look at somebody's stall. */
export type Stuck = "sign" | "room" | "stall";
/** Why a sign was not held up, or a chat room not come into. */
export type SignRefusal = "walking" | "here" | "far" | "gone" | "busy";
/** What a chat room last said to me that the page should say once: not let in (full, or let go before), let go, the room over, or its holder not answering. */
export type CircleNote = "full" | "out" | "end" | "quiet";
/** How long somebody asked to be let into a room is waited for. */
const ASK_MS = 6_000;

/** The least time between two nudges of the same kind from one person: every one is delivered to everybody in the room. */
const NUDGE_MS = 4000;

export class TownSession {
  /** Tells one stay from the next: the same id after a page change means nothing reconnected. */
  readonly id = Math.random().toString(36).slice(2, 10);
  readonly me: Identity;
  readonly testTopic: string | undefined;
  readonly cap: number;
  readonly avatars = new Map<string, Avatar>();
  readonly self: Avatar;
  readonly voice: VoiceMesh;
  status: RoomStatus = "connecting";
  /** Whether we have ever got in: before that, "connecting" is a wait worth a banner. */
  everReady = false;
  micProblem: MicProblem | null = null;
  /** The last LOG_MAX lines typed in the room while this tab was in it. */
  readonly chat: ChatLine[] = [];
  /** Lines from others that arrived while no town page was showing them. */
  unread = 0;
  /**
   * The chat room I am in, or hold under my sign (lib/town/circle): who is in it, as its holder lists them; what was
   * typed in it while this tab was in it (gone with the room); how many of its lines nobody here has read; whom I
   * have asked to be let in by; and what it last said that the page should say once.
   */
  circle: Circle | null = null;
  readonly circleChat: ChatLine[] = [];
  circleUnread = 0;
  circleAsked: { host: string; at: number } | null = null;
  circleNote: CircleNote | null = null;
  /** Told when my sign comes down, however it does (walked off, let down): whoever keeps my stall shuts it. */
  onSignDown: ((kind: Sign["kind"]) => void) | null = null;
  closed = false;
  /** Bumped on every change the panels should show (for useSyncExternalStore). */
  version = 0;

  private readonly client: SupabaseClient;
  private current: Room | null = null;
  private gen = 0;
  /** When it was last fine, or when we last started over: the watchdog's clock. */
  private settledAt = Date.now();
  private attempts = 0;
  /** Things somebody did before the room listed them; applied when it does. */
  private readonly early = new Map<string, Partial<Doing>>();
  /** Whom the room lists right now. */
  private listed = new Set<string>();
  /** Whether this join has been counted in: "ready" waits for the first headcount. */
  private admitted = false;
  private readyHeld = false;
  /** How many town pages are showing this stay (normally 0 or 1). */
  private views = 0;
  private steppedAt = 0;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  /** The bench (index into BENCHES) to sit on once I have walked up to it, or SIT_HERE where I stop. */
  private sitWhenThere: number | null = null;
  private lastMoveAt = 0;
  private seenAt = 0;
  private readonly flood = new Flood();
  /** How the keeper of my stall is told I am still here (lib/town/shop), and when it last was. It outlives the town's page: a stall stays open while I look at another page of the site. */
  private shopBeat: (() => void) | null = null;
  private beatAt = 0;
  private lastChatAt = 0;
  private chatKey = 0;
  private lookTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly subs = new Set<() => void>();
  private readonly tick: ReturnType<typeof setInterval>;

  constructor(me: Identity, opts: SessionOptions = {}) {
    this.me = me;
    this.testTopic = opts.testTopic;
    this.cap = opts.cap ?? ROOM_CAP;
    const start = spawnFor(me.id);
    const look = encodeLook(savedLook(me.id) ?? defaultLook(me.id));
    this.self = {
      info: { ...me, x: start.x, y: start.y, voice: false, muted: false, away: true, look, sit: -1 },
      pos: { ...start }, path: [], img: loadFace(me.face), placed: true,
    };

    // Before the town's realtime client exists, on purpose: the client hangs
    // up its connection on pagehide too, listeners on window run in the order
    // they were added (capture or not; tried in Chrome), and a goodbye after
    // the hang-up would go by HTTP, which the browser cancels on a closing
    // page. Nothing is torn down there: a closing page takes the connection
    // with it, and a page kept for the back button rejoins when it comes back.
    window.addEventListener("pagehide", this.onPageHide);

    // The keep-alive says when the line has gone quiet before the channel does.
    this.client = townClient(createClient(), (beat) => {
      if ((beat === "timeout" || beat === "error") && this.status === "ready") this.report("reconnecting");
      // (the keep-alive comes from a worker, which a hidden tab does not slow: my stall is kept open by it too)
      else this.beatShop();
    });
    this.voice = new VoiceMesh(me.id, (to, s) => this.current?.signal(to, s), this.notify);

    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("online", this.onWake);
    // Any tap anywhere lets held-back audio play (VoiceMesh.audioBlocked).
    document.addEventListener("pointerdown", this.onTap, true);
    this.tick = setInterval(this.onTick, 1000);

    (window as unknown as { __cashTown?: unknown }).__cashTown = this.handle();
    setTownActive({ me, testTopic: this.testTopic, cap: opts.cap });
    this.remember();
    void this.connect();
    if (opts.resume?.voice) void this.joinVoice(opts.resume.muted);
  }

  /* ── for the panels ──────────────────────────────────────────────────── */

  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => { this.subs.delete(f); };
  };

  getVersion = () => this.version;

  notify = () => {
    this.version++;
    for (const f of this.subs) f();
  };

  /** Everybody else who is here, as shown: not the ones who just said goodbye. */
  get people(): Avatar[] {
    return [...this.avatars.values()].filter((a) => a.byeAt === undefined);
  }

  /** What I am doing, as the room is told. */
  doing(): Doing {
    const i = this.self.info;
    return { x: i.x, y: i.y, voice: i.voice, muted: i.muted, away: i.away, look: i.look, sit: i.sit ?? -1, typing: i.typing ?? false, eat: i.eat ?? "", hold: i.hold ?? "", wet: i.wet ?? false, fish: i.fish ?? 0, sign: i.sign ?? "", circle: i.circle ?? "" };
  }

  stats(): Promise<PeerInfo[]> {
    return this.voice.stats();
  }

  /**
   * The town's page is showing this stay; it calls what this returns when it
   * stops. Whether one is showing is what `away` tells the others.
   */
  attachView(): () => void {
    this.views++;
    this.steppedAt = 0;
    this.unread = 0;
    this.updateAway();
    return () => {
      this.views--;
      this.updateAway();
    };
  }

  /**
   * One frame of walking, from the town's canvas. After time without frames
   * (another page, a hidden tab), everybody is put where they were going
   * rather than walked there late.
   */
  step(now: number, dt: number) {
    if (!this.steppedAt || now - this.steppedAt > 1000) {
      for (const a of [this.self, ...this.avatars.values()]) {
        if (a.path.length) { a.pos = { ...a.path[a.path.length - 1] }; a.path = []; }
      }
    }
    this.steppedAt = now;
    const all = [this.self, ...this.avatars.values()];
    for (const a of all) {
      if (!a.path.length) continue;
      // (a water cart is heavy for one, and goes as fast as anybody with somebody beside it: lib/town/cart)
      const pace = a.info.hold === CART.item ? cartPace(a.info.hold, a.pos, all.filter((o) => o !== a).map((o) => o.pos)) : 1;
      Object.assign(a, stepAlong(a.pos, a.path, SPEED * pace * dt));
    }
    // Stopped on a gate: through it, to the other map.
    if (!this.self.path.length) {
      const beyond = gateAt(this.self.pos.x, this.self.pos.y);
      if (beyond) this.warpTo(beyond);
    }
    // Arrived in front of the bench I was walking to: sit down.
    if (this.sitWhenThere !== null && !this.self.path.length) {
      const bench = this.sitWhenThere;
      this.sitWhenThere = null;
      this.tell({ sit: bench });
    }
    // Each voice as loud as the town's rules say (all the same, for now).
    if (this.voice.active) {
      for (const a of this.avatars.values()) {
        if (a.info.voice) this.voice.setGain(a.info.id, hearing(distance(this.self.pos, a.pos)));
      }
    }
  }

  /* ── what I do ───────────────────────────────────────────────────────── */

  /** Walk to a tile, if there is a way there. */
  walkTo(tile: Vec): boolean {
    if (this.closed) return false;
    // Whoever holds a sign up, is in a chat room or looks at a stall stays where they are (the owner, 2026-10-06:
    // "ตอนอยุ่ในระหว่างชูป้าย หรือ คนที่เข้ามาดูช่วยทำให้คลิกเดินไม่ได้ด้วย"): each is left by its own button, never by
    // a slip of the finger on the map.
    if (this.stuck()) return false;
    const a = this.self;
    const goal = { x: Math.floor(tile.x) + 0.5, y: Math.floor(tile.y) + 0.5 };
    const path = findPath(a.pos, goal);
    if (!path) return false;
    // Walking anywhere gets up from a bench, or forgets the one I was heading for.
    this.sitWhenThere = null;
    if ((a.info.sit ?? -1) !== -1) this.tell({ sit: -1 });
    a.path = path;
    a.info = { ...a.info, x: goal.x, y: goal.y };
    this.announceMove();
    return true;
  }

  /**
   * Stand at once somewhere else: through a gate, on the other map. The room
   * hears it as an ordinary move, and whoever hears a move to another map puts
   * the walker there instead of walking them across (onDoing).
   */
  warpTo(to: Vec): boolean {
    if (this.closed || placeOf(to.x, to.y) === null) return false;
    const a = this.self;
    this.sitWhenThere = null;
    if ((a.info.sit ?? -1) !== -1) this.tell({ sit: -1 });
    // (stood somewhere else at once, which no tap on the map does while a sign is up: the sign comes down, and a chat room out of reach is left)
    if (a.info.sign) this.lowerSign();
    this.leaveIfFar(to);
    a.pos = { x: to.x, y: to.y };
    a.path = [];
    a.info = { ...a.info, x: to.x, y: to.y };
    this.announceMove();
    this.notify();
    return true;
  }

  /** Sit down on the ground where I stand (from the emote window), or where I stop if I am walking. */
  sitHere(): boolean {
    if (this.closed) return false;
    // At a bench, on the bench: sat on the ground there, the doll and the bench were drawn over each other
    // (the owner, 2026-10-03: "นั่งแล้ว ภาพซ้อน")
    if (!this.self.path.length) {
      const near = benchNear(this.self.pos);
      if (near >= 0) return this.sitOn(near);
      // beside one of the cooking yard's tables: at the table
      const place = yardSeatNear(this.self.pos);
      if (place >= 0 && this.sitOn(place)) return true;
    }
    if (this.self.path.length) { this.sitWhenThere = SIT_HERE; return true; }
    if ((this.self.info.sit ?? -1) !== SIT_HERE) this.tell({ sit: SIT_HERE });
    return true;
  }

  /** Get up, from a bench or the ground, and stay where I am. */
  standUp() {
    this.sitWhenThere = null;
    if (!this.closed && (this.self.info.sit ?? -1) !== -1) this.tell({ sit: -1 });
  }

  /** Walk to the tile in front of a bench (an index into BENCHES), then sit on it. */
  sitOn(bench: number): boolean {
    // A place at one of the cooking yard's tables: the one asked for, or the nearest on its bench that nobody has.
    if (bench >= YARD_SEATS) {
      const want = yardSeat(bench);
      if (!want || this.closed) return false;
      const taken = new Set(this.people.map((a) => a.info.sit ?? -1));
      const free = KITCHEN.seats.map((s, i) => ({ s, i: YARD_SEATS + i })).filter(({ s, i }) => s.table === want.table && s.back === want.back && !taken.has(i))
        .sort((a, b) => Math.abs(a.s.px - want.px) - Math.abs(b.s.px - want.px))[0];
      if (!free || !this.walkTo({ x: free.s.stand[0], y: free.s.stand[1] })) return false;
      this.sitWhenThere = free.i;
      return true;
    }
    const b = BENCHES[bench];
    if (!b?.facing || this.closed) return false;
    const f = FRONT[b.facing];
    if (!this.walkTo({ x: b.x + f.x, y: b.y + f.y })) return false;
    this.sitWhenThere = bench;
    return true;
  }

  /* ── a sign held up, and the chat room under one (lib/town/sign, lib/town/circle) ── */

  /** The sign I hold up, if any. */
  get sign(): Sign | null { return decodeSign(this.self.info.sign); }
  /**
   * Why I cannot walk just now, if I cannot: I hold a sign up, I am in a chat room, or I am looking at somebody's
   * stall (which its panel says while it is open: `setBrowsing`). Taking the sign down, leaving the room or closing
   * the stall's panel is the way to walk again.
   */
  stuck(): Stuck | null {
    if (this.self.info.sign) return "sign";
    if (this.circle) return "room";
    return this.browsing ? "stall" : null;
  }
  private browsing = false;
  setBrowsing(on: boolean) { this.browsing = on; }
  /** Whether a sign can be held up now: standing still (or sitting), on ground a sign may stand on. */
  canRaise(): SignRefusal | null {
    if (this.closed) return "gone";
    if (this.self.path.length) return "walking";
    return mayRaise(this.self.pos) ? null : "here";
  }

  /** Hold up a sign that is a chat room: I am its holder, and the first in it. Any room I was in is left. */
  raiseChat(title: string): SignRefusal | null {
    const no = this.canRaise();
    if (no) return no;
    if (this.self.info.sign) this.lowerSign();
    this.leaveCircle();
    this.setCircle(newCircle(this.me.id));
    this.tell({ sign: encodeSign({ kind: "chat", title: tidyTitle(title), n: 1, sells: false, buys: false }), circle: this.me.id });
    this.syncVoice();
    return null;
  }

  /**
   * Hold up a sign that is a stall (lib/town/shop: whoever keeps the game has opened it already). `beat` tells the
   * stall's keeper I am still here; it is called every so often for as long as the sign is up, on whatever page.
   */
  raiseShop(title: string, sells: boolean, buys: boolean, beat: (() => void) | null): SignRefusal | null {
    const no = this.canRaise();
    if (no) return no;
    if (this.self.info.sign) this.lowerSign();
    this.shopBeat = beat;
    this.beatAt = Date.now();
    this.tell({ sign: encodeSign({ kind: "shop", title: tidyTitle(title), n: 0, sells, buys }) });
    return null;
  }

  /** What my stall's sign says it does, changed as its lines sell out (the title stays). */
  setShopSign(sells: boolean, buys: boolean) {
    const s = this.sign;
    if (s?.kind === "shop" && (s.sells !== sells || s.buys !== buys)) this.tell({ sign: encodeSign({ ...s, sells, buys }) });
  }

  /** Take my sign down. A chat room under it is over for everybody in it. */
  lowerSign() {
    const s = this.sign;
    if (!s) return;
    if (s.kind === "chat" && this.circle?.host === this.me.id) {
      for (const id of this.circle.members) if (id !== this.me.id) this.word(id, { k: "end" });
      this.setCircle(null);
      this.tell({ sign: "", circle: "" });
      this.syncVoice();
    } else {
      this.shopBeat = null;
      this.tell({ sign: "" });
    }
    this.onSignDown?.(s.kind);
  }

  /** Ask to be let into the chat room somebody holds a sign up for. Its holder's page answers; until it does, nothing changes. */
  askIn(host: string): SignRefusal | null {
    if (this.closed) return "gone";
    const a = this.avatars.get(host);
    if (!a || a.byeAt !== undefined || decodeSign(a.info.sign)?.kind !== "chat") return "gone";
    if (this.circle?.host === host) return null;
    // (holding a sign of my own, I am where it stands and at what it is for)
    if (this.self.info.sign) return "busy";
    if (!inReach(this.self.pos, a.pos)) return "far";
    this.circleAsked = { host, at: Date.now() };
    this.circleNote = null;
    this.word(host, { k: "ask" });
    this.notify();
    return null;
  }

  /** Leave the chat room I am in (not my own: that one ends when my sign comes down). */
  leaveCircle() {
    const c = this.circle;
    if (!c || c.host === this.me.id) return;
    this.word(c.host, { k: "bye" });
    this.setCircle(null);
    this.tell({ circle: "" });
    this.syncVoice();
  }

  /** Its holder lets somebody go from the room: they are not let back into it. */
  letGo(id: string) {
    const c = this.circle;
    if (!c || c.host !== this.me.id || id === this.me.id || !c.members.includes(id)) return;
    this.word(id, { k: "out" });
    this.roomIs(without(c, id, true));
  }

  /** Type a line to the chat room I am in: to each of the others by name, and to nobody else. */
  sayCircle(raw: string): ChatResult {
    const c = this.circle;
    if (this.closed || !c) return "offline";
    const text = cleanChat(raw);
    if (!text) return "empty";
    const now = Date.now();
    if (now - this.lastChatAt < chatEvery(c.members.length)) return "slow";
    if (this.status !== "ready" || !this.current) return "offline";
    for (const id of c.members) if (id !== this.me.id) this.word(id, { k: "ln", t: text });
    this.lastChatAt = now;
    // (no bubble over my head, nor over anybody's in the room: what is said in a room is read in the room's own
    // panel. The owner, 2026-10-06: "พิมพ์คุยในห้องไม่ควรขึ้น toast บนหัวตัวละครแบบนี้".)
    this.addCircleLine(this.me.id, this.me.name, text, true, now);
    this.notify();
    return "sent";
  }

  /** Somebody is looking at the room's lines: nothing of it is waiting to be read. And what it last said has been said. */
  readCircle() {
    if (!this.circleUnread) return;
    this.circleUnread = 0;
    this.notify();
  }
  clearCircleNote() {
    if (this.circleNote === null) return;
    this.circleNote = null;
    this.notify();
  }

  private word(to: string, w: CircleWord) { this.current?.circle(to, w as unknown as Record<string, unknown>); }
  private setCircle(c: Circle | null) {
    const was = this.circle;
    this.circle = c;
    // (a room's lines are its own: gone with it, as the town's are with the town)
    if (!c || c.host !== was?.host) { this.circleChat.length = 0; this.circleUnread = 0; }
    this.circleAsked = null;
  }
  /** My own room is this now: everybody in it is told who is, and my sign says how many. */
  private roomIs(c: Circle) {
    this.circle = c;
    for (const id of c.members) if (id !== this.me.id) this.word(id, { k: "in", m: c.members });
    const s = this.sign;
    if (s?.kind === "chat" && s.n !== c.members.length) this.tell({ sign: encodeSign({ ...s, n: c.members.length }) });
    this.syncVoice();
    this.notify();
  }
  /** Walking (or stepping through a gate) to somewhere out of the reach of the room I am in is leaving it. */
  private leaveIfFar(to: Vec) {
    const c = this.circle;
    if (!c || c.host === this.me.id) return;
    const host = this.avatars.get(c.host);
    if (!host || !inReach(to, host.pos)) this.leaveCircle();
  }
  private addCircleLine(from: string, name: string, text: string, mine: boolean, at: number) {
    this.circleChat.push({ key: ++this.chatKey, from, name, text, at, mine });
    if (this.circleChat.length > LOG_MAX) this.circleChat.splice(0, this.circleChat.length - LOG_MAX);
  }

  /** A word of a chat room, in my letterbox. Believed only from whom it can come from: a room's holder about the room, somebody in it about a line. */
  private onCircle(from: string, raw: unknown) {
    const w = readWord(raw), c = this.circle, mine = c?.host === this.me.id;
    if (!w || from === this.me.id) return;
    const a = this.avatars.get(from);
    switch (w.k) {
      case "ask": {
        // (only my own room is mine to let anybody into, and only somebody the town lists)
        if (!c || !mine || !a || a.byeAt !== undefined || !this.listed.has(from)) return;
        const did = admit(c, from);
        if (did.ok) this.roomIs(did.circle); else this.word(from, { k: "no", why: did.why });
        return;
      }
      case "bye":
        if (c && mine && c.members.includes(from)) this.roomIs(without(c, from));
        return;
      case "in": {
        if (this.circleAsked?.host !== from && c?.host !== from) return;
        const next = listed(from, this.me.id, w.m);
        if (!next) { if (c?.host === from) this.put("out"); return; }
        if (c?.host === from) this.circle = next; else this.setCircle(next);
        this.circleAsked = null;
        if ((this.self.info.circle ?? "") !== from) this.tell({ circle: from });
        this.syncVoice();
        this.notify();
        return;
      }
      case "no":
        if (this.circleAsked?.host === from) { this.circleAsked = null; this.circleNote = w.why; this.notify(); }
        return;
      case "out": case "end":
        if (c?.host === from && !mine) this.put(w.k);
        return;
      case "ln": {
        if (!fromRoom(c, from) || !a || a.byeAt !== undefined) return;
        const now = Date.now();
        if (!this.flood.allow(from, now)) return;
        this.addCircleLine(from, a.info.name, w.t, false, now);
        this.circleUnread++;
        this.notify();
        return;
      }
    }
  }
  /** I am out of the room I was in, by its holder's doing or because it is over. */
  private put(why: CircleNote) {
    this.setCircle(null);
    this.circleNote = why;
    if (this.self.info.circle) this.tell({ circle: "" });
    this.syncVoice();
    this.notify();
  }
  /**
   * Once a second: my own room loses whoever has gone from the town or walked out of its reach; a room I am in is
   * over when its holder is gone or holds it up no longer; and somebody asked who does not answer is given up on.
   */
  private tendCircle(now: number) {
    const c = this.circle;
    if (this.circleAsked && now - this.circleAsked.at > ASK_MS) { this.circleAsked = null; this.circleNote = "quiet"; this.notify(); }
    if (!c) return;
    if (c.host === this.me.id) {
      let next = c;
      for (const id of c.members) {
        if (id === this.me.id) continue;
        const a = this.avatars.get(id);
        if (!a || a.byeAt !== undefined || !inReach(a.pos, this.self.pos, SIGN.reach + 2)) next = without(next, id);
      }
      if (next !== c) this.roomIs(next);
      return;
    }
    const host = this.avatars.get(c.host);
    if (!host || host.byeAt !== undefined || decodeSign(host.info.sign)?.kind !== "chat") this.put("end");
  }

  /** Whether there is, or may be, a voice line between somebody and me: the same chat room, or none on both sides. */
  private hearsNow(id: string): boolean {
    return hears(this.circle, id, this.avatars.get(id)?.info.circle);
  }
  /** Tell whoever keeps my stall that I am still here, if it is time to. */
  private beatShop() {
    if (this.closed || !this.shopBeat || this.sign?.kind !== "shop") return;
    const now = Date.now();
    if (now - this.beatAt < SHOP.every * 1000) return;
    this.beatAt = now;
    this.shopBeat();
  }

  /**
   * Turn the microphone on and join the voice. The first time it must come
   * from a tap: browsers ask for a microphone only then. Coming back after a
   * reload it is not, and browsers that remember the permission allow it.
   */
  async joinVoice(muted = false): Promise<boolean> {
    if (this.closed) return false;
    this.micProblem = null;
    try {
      await this.voice.start();
    } catch (e) {
      const name = (e as { name?: string })?.name;
      this.micProblem = name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "no-mic" : "failed";
      this.notify();
      return false;
    }
    if (this.closed) { this.voice.stop(); return false; }
    this.voice.setMuted(muted);
    this.tell({ voice: true, muted });
    this.syncVoice();
    return true;
  }

  toggleMute() {
    if (!this.voice.active) return;
    const next = !this.voice.isMuted;
    this.voice.setMuted(next);
    this.tell({ muted: next });
  }

  leaveVoice() {
    this.voice.stop();
    this.tell({ voice: false, muted: false });
  }

  /**
   * Type a line to everybody in the room. Not sent, and the box keeps the
   * text, when it is empty, too soon after the last (chatEvery), or while
   * the room is reconnecting.
   */
  /**
   * The town's game: somebody did something the others will want to see (the
   * farm, the kitchen, a deal). Only the word for what is said, to everybody
   * or to one person; whoever hears it asks the database. At most one of a
   * kind every few seconds: what was done meanwhile is told by the next.
   */
  onNudge: ((what: string) => void) | null = null;
  private readonly nudgedAt = new Map<string, number>();
  private readonly nudgeDue = new Map<string, ReturnType<typeof setTimeout>>();
  nudge(what: string, to?: string) {
    if (this.closed) return;
    if (to) { this.current?.nudge(what, to); return; }
    const now = Date.now(), wait = NUDGE_MS - (now - (this.nudgedAt.get(what) ?? 0));
    if (wait <= 0) { this.nudgedAt.set(what, now); this.current?.nudge(what); return; }
    if (this.nudgeDue.has(what)) return;
    this.nudgeDue.set(what, setTimeout(() => {
      this.nudgeDue.delete(what);
      if (this.closed) return;
      this.nudgedAt.set(what, Date.now());
      this.current?.nudge(what);
    }, wait));
  }

  sendChat(raw: string): ChatResult {
    if (this.closed) return "offline";
    const text = cleanChat(raw);
    if (!text) return "empty";
    const now = Date.now();
    if (now - this.lastChatAt < chatEvery(this.avatars.size + 1)) return "slow";
    if (!this.current?.chat(text)) return "offline";
    this.lastChatAt = now;
    this.self.said = { text, at: now };
    this.addLine(this.me.id, this.me.name, text, true, now);
    this.notify();
    return "sent";
  }

  /**
   * A new look from the wardrobe: on my avatar at once, kept on this device,
   * and told to the room once the changes settle (LOOK_SETTLE_MS) or the
   * wardrobe closes (settleLook).
   */
  setLook(look: Look) {
    if (this.closed) return;
    const code = encodeLook(look);
    if (code === this.self.info.look) return;
    this.self.info = { ...this.self.info, look: code };
    saveLook(this.me.id, look);
    if (this.lookTimer !== null) clearTimeout(this.lookTimer);
    this.lookTimer = setTimeout(() => this.settleLook(), LOOK_SETTLE_MS);
    this.notify();
  }

  /** Tell the room about a look still waiting to be told. */
  settleLook() {
    if (this.lookTimer === null) return;
    clearTimeout(this.lookTimer);
    this.lookTimer = null;
    this.tell({});
  }

  /** Somebody is looking at the chat: nothing is waiting to be read. */
  readChat() {
    if (!this.unread) return;
    this.unread = 0;
    this.notify();
  }

  /** Leave the town: goodbye to everybody, microphone off, connection closed. */
  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.tick);
    if (this.moveTimer !== null) clearTimeout(this.moveTimer);
    if (this.lookTimer !== null) clearTimeout(this.lookTimer);
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("online", this.onWake);
    document.removeEventListener("pointerdown", this.onTap, true);
    this.voice.stop();
    // (a chat room of mine is over, and one I am in is left; a stall's keeper stops hearing from me)
    if (this.circle) for (const id of this.circle.host === this.me.id ? this.circle.members : [this.circle.host]) if (id !== this.me.id) this.word(id, this.circle.host === this.me.id ? { k: "end" } : { k: "bye" });
    this.circle = null;
    this.shopBeat = null;
    const r = this.current;
    this.current = null;
    this.gen++;
    r?.bye();
    void (r?.leave() ?? Promise.resolve()).finally(() => this.client.realtime.disconnect());
    rememberTown(null);
    setTownActive(null);
    const slot = globalThis as Slot;
    if (slot[SLOT] === this) delete slot[SLOT];
    const w = window as unknown as { __cashTown?: { session?: string } };
    if (w.__cashTown?.session === this.id) delete w.__cashTown;
    this.notify();
  }

  /* ── the room ────────────────────────────────────────────────────────── */

  private report(s: RoomStatus) {
    if (this.closed) return;
    this.status = s;
    if (s === "ready") { this.settledAt = Date.now(); this.attempts = 0; this.everReady = true; }
    this.notify();
  }

  private async connect() {
    const mine = ++this.gen;
    const old = this.current;
    this.current = null;
    if (old) await old.leave();
    const live = () => !this.closed && mine === this.gen;
    if (!live()) return;
    this.admitted = false;
    this.readyHeld = false;
    const r = await joinTown(this.client, this.me, {
      onStatus: (s) => {
        if (mine !== this.gen) return;
        if (s === "ready" && !this.admitted) { this.readyHeld = true; return; }
        this.report(s);
      },
      onMembers: (list) => { if (live()) this.onMembers(list); },
      onDoing: (id, d) => { if (live()) this.onDoing(id, d); },
      onHello: (id) => {
        if (!live()) return;
        // Back after a goodbye (a reload): show them again.
        const a = this.avatars.get(id);
        if (a?.byeAt !== undefined) { a.byeAt = undefined; this.notify(); }
        this.current?.tell(id, this.doing());
      },
      onBye: (id) => { if (live()) this.onBye(id); },
      onChat: (id, text) => { if (live()) this.onChat(id, text); },
      onNudge: (_id, what) => { if (live() && typeof what === "string" && what.length <= 12) this.onNudge?.(what); },
      // (a voice line only with whoever I may hear: lib/town/circle. A page built before there were chat rooms asks everybody.)
      onSignal: (from, data) => { if (mine === this.gen && this.hearsNow(from)) void this.voice.receive(from, data as Signal); },
      onCircle: (from, word) => { if (live()) this.onCircle(from, word); },
    }, { testTopic: this.testTopic, cancelled: () => !live(), doing: () => this.doing() });
    if (!r) return;
    if (!live()) { void r.leave(); return; }
    this.current = r;
  }

  private onMembers(people: Identity[]) {
    const now = Date.now();
    const others = people.filter((p) => p.id !== this.me.id);
    // The room was full when I arrived: say so, and go again.
    if (!this.admitted) {
      this.admitted = true;
      if (this.readyHeld) { this.readyHeld = false; if (others.length < this.cap) this.report("ready"); }
      if (others.length >= this.cap) {
        this.report("full");
        this.settledAt = now;
        this.gen++;
        const r = this.current;
        this.current = null;
        r?.bye();
        void r?.leave();
        return;
      }
    }
    const seen = new Set<string>();
    for (const p of others) {
      seen.add(p.id);
      const known = this.avatars.get(p.id);
      if (!known) {
        const d = this.early.get(p.id) ?? {};
        this.early.delete(p.id);
        const spot = d.x !== undefined && d.y !== undefined ? { x: d.x, y: d.y } : spawnFor(p.id);
        this.avatars.set(p.id, {
          // (everything heard of them before the room listed them: what they hold, eat and do with a rod too, which
          // others' games hang on: who cooks with me, whether a beetle comes down its tree, lib/town/insects)
          info: { ...p, x: spot.x, y: spot.y, voice: d.voice ?? false, muted: d.muted ?? false, away: d.away ?? false, look: d.look, sit: d.sit ?? -1,
            ...(d.hold !== undefined ? { hold: d.hold } : {}), ...(d.wet !== undefined ? { wet: d.wet } : {}), ...(d.eat !== undefined ? { eat: d.eat } : {}), ...(d.fish !== undefined ? { fish: d.fish } : {}),
            ...(d.sign !== undefined ? { sign: d.sign } : {}), ...(d.circle !== undefined ? { circle: d.circle } : {}) },
          pos: { ...spot }, path: [], img: loadFace(p.face), placed: d.x !== undefined,
        });
      } else {
        if (known.info.face !== p.face) known.img = loadFace(p.face);
        known.info = { ...known.info, name: p.name, face: p.face, color: p.color };
        known.goneAt = undefined;
      }
    }
    for (const a of this.avatars.values()) {
      if (!seen.has(a.info.id) && a.goneAt === undefined) a.goneAt = now;
    }
    this.listed = seen;
    this.syncVoice();
    this.notify();
  }

  private onDoing(id: string, d: Partial<Doing>) {
    const a = this.avatars.get(id);
    if (!a) { this.early.set(id, { ...this.early.get(id), ...d }); return; }
    if (d.x !== undefined && d.y !== undefined) {
      if (!a.placed) {
        // The first we hear of where somebody is: put them there, rather
        // than walk them over from where they appeared.
        a.pos = { x: d.x, y: d.y };
        a.path = [];
        a.placed = true;
      } else if (d.x !== a.info.x || d.y !== a.info.y) {
        // To the other map there is no walking: they went through a gate, and stand there now.
        if (placeOf(d.x, d.y) !== placeOf(a.pos.x, a.pos.y)) { a.pos = { x: d.x, y: d.y }; a.path = []; }
        else a.path = findPath(a.pos, { x: d.x, y: d.y }) ?? [{ x: d.x, y: d.y }];
      }
    }
    // (whom I hear changes with who is in the voice, and with who is in which chat room)
    const voiceChanged = (d.voice !== undefined && d.voice !== a.info.voice) || (d.circle !== undefined && d.circle !== (a.info.circle ?? ""));
    if (d.typing) a.typingAt = Date.now();
    // (somebody who had said they were in my room and now says otherwise has left it: their page was loaded again, say)
    const leftMine = this.circle?.host === this.me.id && d.circle !== undefined && d.circle !== this.me.id && a.info.circle === this.me.id && this.circle.members.includes(id);
    a.info = { ...a.info, ...d };
    if (leftMine && this.circle) this.roomIs(without(this.circle, id));
    if (voiceChanged) this.syncVoice();
    this.notify();
  }

  // Hidden at once, so nobody is left looking at somebody who has gone; the
  // room's own word removes them a moment later (see BYE_TRUST_MS).
  private onBye(id: string) {
    this.early.delete(id);
    const a = this.avatars.get(id);
    if (!a || a.byeAt !== undefined) return;
    a.byeAt = Date.now();
    this.notify();
  }

  // Only from somebody the room lists now, and not a flood from anybody.
  private onChat(id: string, raw: unknown) {
    const a = this.avatars.get(id);
    if (!a || a.byeAt !== undefined || !this.listed.has(id)) return;
    const now = Date.now();
    const text = cleanChat(raw);
    if (!text || !this.flood.allow(id, now)) return;
    a.said = { text, at: now };
    this.addLine(id, a.info.name, text, false, now);
    if (this.views <= 0) this.unread++;
    this.notify();
  }

  private addLine(from: string, name: string, text: string, mine: boolean, at: number) {
    this.chat.push({ key: ++this.chatKey, from, name, text, at, mine });
    if (this.chat.length > LOG_MAX) this.chat.splice(0, this.chat.length - LOG_MAX);
  }

  /** A line to everybody I should hear (everybody in voice, for now). */
  private syncVoice() {
    if (!this.voice.active) return;
    // (a chat room has its own voice: those in it hear each other and nobody else, and nobody else hears them)
    const others = [...this.avatars.values()]
      .filter((a) => a.info.voice && this.hearsNow(a.info.id))
      .map((a) => ({ id: a.info.id, pos: a.pos }));
    this.voice.sync(pickLines(this.self.pos, others, this.voice.lines));
  }

  /** Steps a few a second, fewer as the room fills; a burst of taps sends the last. */
  private announceMove() {
    const send = () => {
      this.moveTimer = null;
      this.lastMoveAt = Date.now();
      this.current?.move(this.self.info.x, this.self.info.y);
    };
    const wait = moveEvery(this.avatars.size + 1) - (Date.now() - this.lastMoveAt);
    if (wait <= 0) send();
    else if (this.moveTimer === null) this.moveTimer = setTimeout(send, wait);
  }

  /**
   * Typing a chat line, or not any more: the room hears it once when it starts,
   * again every TYPING_AGAIN_MS while it goes on (so "…" outlasts a lost
   * message by no more than TYPING_MS), and once when it stops.
   */
  setTyping(on: boolean) {
    const now = Date.now();
    if (on) {
      if (this.self.info.typing && now - this.typingToldAt < TYPING_AGAIN_MS) return;
      this.typingToldAt = now;
      this.tell({ typing: true });
    } else if (this.self.info.typing) this.tell({ typing: false });
  }
  private typingToldAt = 0;

  /** Whether somebody is typing now, by what they last told the room. */
  isTyping(a: Avatar): boolean {
    return !!a.info.typing && a.typingAt !== undefined && Date.now() - a.typingAt < TYPING_MS;
  }

  /** Tell the room what I am eating (a dish's name), or that I have stopped. */
  setEating(dish: string | null) {
    if ((this.self.info.eat ?? "") !== (dish ?? "")) this.tell({ eat: dish ?? "" });
  }

  /** Tell the room what I hold in my hand (a thing's name), or that it is empty; and whether it is a bucket with water in it. */
  setHolding(item: string | null, wet = false) {
    if ((this.self.info.hold ?? "") !== (item ?? "") || (this.self.info.wet ?? false) !== wet) this.tell({ hold: item ?? "", wet });
  }
  /** Tell the room what I am doing with a rod: 0 nothing, 1 it is in my hand, 2 my line is in the water, 3 a fish is on, 4 one is landed this moment. */
  setFishing(n: 0 | 1 | 2 | 3 | 4) {
    if ((this.self.info.fish ?? 0) !== n) this.tell({ fish: n });
  }

  private tell(patch: Partial<Doing>) {
    this.self.info = { ...this.self.info, ...patch };
    this.current?.say(this.doing());
    this.remember();
    this.notify();
  }

  /** Away is: no town page showing this stay, or the tab hidden. */
  private updateAway() {
    if (this.closed) return;
    const away = this.views <= 0 || document.visibilityState !== "visible";
    if (away === this.self.info.away) return;
    this.tell({ away });
  }

  private remember() {
    if (this.closed) return;
    this.seenAt = Date.now();
    rememberTown({
      me: this.me, voice: this.self.info.voice, muted: this.self.info.muted, seenAt: this.seenAt,
      testTopic: this.testTopic, cap: this.cap === ROOM_CAP ? undefined : this.cap,
    });
  }

  /* ── the browser ─────────────────────────────────────────────────────── */

  // Closing the tab, reloading, or a link that loads a whole page: goodbye,
  // so nobody is left looking at somebody who has gone, and a fresh note for
  // the next page to pick the stay up from.
  private readonly onPageHide = () => {
    this.current?.bye();
    this.remember();
  };

  // Coming back to the tab, or back online: check at once rather than waiting.
  private readonly onWake = () => {
    if (this.closed || document.visibilityState !== "visible") return;
    if (this.status === "ready") { this.current?.check(); this.voice.repair(); return; }
    if (this.status === "needs-migration" || this.status === "denied" || this.status === "full") return;
    this.settledAt = Date.now();
    void this.connect();
  };

  private readonly onVisibility = () => {
    this.updateAway();
    this.onWake();
  };

  private readonly onTap = () => {
    this.voice.resumeAudio();
  };

  // The watchdog. Supabase reconnects by itself and usually that is enough;
  // this is for when it is not, so nobody has to reload to find a friend.
  private readonly onTick = () => {
    if (this.closed) return;
    const now = Date.now();
    let changed = false;
    for (const [id, a] of this.avatars) {
      if (a.goneAt !== undefined && now - a.goneAt > GONE_MS) { this.avatars.delete(id); changed = true; }
      else if (a.byeAt !== undefined && now - a.byeAt > BYE_TRUST_MS) {
        if (this.listed.has(id)) a.byeAt = undefined;
        else this.avatars.delete(id);
        changed = true;
      }
    }
    if (changed) this.notify();
    this.tendCircle(now);
    this.beatShop();
    this.syncVoice();
    if (now - this.seenAt > SEEN_EVERY_MS) this.remember();
    if (this.status === "ready") {
      this.current?.check();
      this.voice.repair();
      return;
    }
    if (this.status === "needs-migration" || this.status === "denied") return;
    if (this.status === "full") {
      // Knock again now and then; the banner stays until we are in.
      if (now - this.settledAt > FULL_RETRY_MS) { this.settledAt = now; void this.connect(); }
      return;
    }
    if (now - this.settledAt > Math.min(30_000, 10_000 + this.attempts * 5_000)) {
      this.attempts++;
      this.settledAt = now;
      this.report("reconnecting");
      void this.connect();
    }
  };

  /** A handle for testing from the console or a script. */
  private handle() {
    return {
      session: this.id,
      status: () => this.status,
      me: () => ({ ...this.self.info, pos: this.self.pos }),
      people: () => this.people.map((a) => ({
        id: a.info.id, name: a.info.name, voice: a.info.voice, away: a.info.away, pos: a.pos, look: a.info.look, sit: a.info.sit ?? -1,
        typing: this.isTyping(a),
        eat: a.info.eat ?? "",
        fish: a.info.fish ?? 0,
        hold: a.info.hold ?? "",
        wet: a.info.wet ?? null,
        going: a.goneAt !== undefined,
        sign: a.info.sign ?? "",
        circle: a.info.circle ?? "",
        said: a.said?.text ?? null,
      })),
      /** What is in the bubble over my own head, if I have said anything to the town. */
      said: () => this.self.said?.text ?? null,
      sign: () => this.sign,
      raiseChat: (title: string) => this.raiseChat(title),
      lowerSign: () => this.lowerSign(),
      askIn: (host: string) => this.askIn(host),
      leaveCircle: () => this.leaveCircle(),
      letGo: (id: string) => this.letGo(id),
      circle: () => (this.circle ? { host: this.circle.host, members: [...this.circle.members] } : null),
      circleNote: () => this.circleNote,
      sayCircle: (text: string) => this.sayCircle(text),
      circleLog: () => this.circleChat.map((l) => ({ name: l.name, text: l.text, mine: l.mine })),
      joinVoice: () => this.joinVoice(),
      leaveVoice: () => this.leaveVoice(),
      hears: (id: string) => this.hearsNow(id),
      stuck: () => this.stuck(),
      lineTo: () => [...this.voice.lines],
      voice: () => this.voice.stats(),
      lines: () => this.voice.lines.size,
      walkTo: (x: number, y: number) => this.walkTo({ x, y }),
      sitOn: (bench: number) => this.sitOn(bench),
      sitHere: () => this.sitHere(),
      standUp: () => this.standUp(),
      chat: (text: string) => this.sendChat(text),
      chatLog: () => this.chat.map((l) => ({ name: l.name, text: l.text, mine: l.mine })),
      unread: () => this.unread,
      leave: () => this.close(),
    };
  }
}

/*
 * One stay per tab. Kept on globalThis rather than in a module variable so
 * that the town's page and the dock always find the same one, and so that
 * reloading this module while developing does not leave a second one behind.
 */
const SLOT = "__cashTownSession";
type Slot = { [SLOT]?: TownSession };

export function currentSession(): TownSession | null {
  const s = (globalThis as Slot)[SLOT];
  return s && !s.closed ? s : null;
}

/** This tab's stay in town as `me`: the one already going, or a new one. */
export function openSession(me: Identity, opts: SessionOptions = {}): TownSession {
  const s = currentSession();
  if (s && s.me.id === me.id && s.testTopic === opts.testTopic) return s;
  s?.close();
  const fresh = new TownSession(me, opts);
  (globalThis as Slot)[SLOT] = fresh;
  return fresh;
}

/** The place at one of the cooking yard's tables nearest somewhere, if one is within a few steps: as `sit` tells it, or −1. */
export function yardSeatNear(p: Vec): number {
  if (KITCHEN.stage !== 2) return -1;
  let best = -1, bestD = 2.4;
  KITCHEN.seats.forEach((s, i) => { const d = distance(p, s.at); if (d < bestD) { bestD = d; best = YARD_SEATS + i; } });
  return best;
}

/** The bench whose seat or front tile is within a tile of somewhere, as an index into BENCHES, or −1. */
export function benchNear(p: Vec): number {
  let best = -1, bestD = 1.2;
  BENCHES.forEach((b, i) => {
    if (!b.facing) return;
    const f = FRONT[b.facing];
    for (const t of [{ x: b.x + 0.5, y: b.y + 0.5 }, { x: b.x + f.x + 0.5, y: b.y + f.y + 0.5 }]) {
      const d = distance(p, t);
      if (d < bestD) { bestD = d; best = i; }
    }
  });
  return best;
}
