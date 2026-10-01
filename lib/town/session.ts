"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { rememberTown, setTownActive } from "./active";
import { Flood, LOG_MAX, chatEvery, cleanChat } from "./chat";
import { defaultLook, encodeLook, saveLook, savedLook, type Look } from "./look";
import { joinTown, townClient, type Doing, type Identity, type Room, type RoomStatus } from "./room";
import { VoiceMesh, type PeerInfo, type Signal } from "./voice";
import {
  SPEED, distance, findPath, hearing, moveEvery, pickLines, spawnFor, stepAlong, type Vec,
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
  private lastMoveAt = 0;
  private seenAt = 0;
  private readonly flood = new Flood();
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
      info: { ...me, x: start.x, y: start.y, voice: false, muted: false, away: true, look },
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
    return { x: i.x, y: i.y, voice: i.voice, muted: i.muted, away: i.away, look: i.look };
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
    for (const a of [this.self, ...this.avatars.values()]) {
      if (a.path.length) Object.assign(a, stepAlong(a.pos, a.path, SPEED * dt));
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
    const a = this.self;
    const goal = { x: Math.floor(tile.x) + 0.5, y: Math.floor(tile.y) + 0.5 };
    const path = findPath(a.pos, goal);
    if (!path) return false;
    a.path = path;
    a.info = { ...a.info, x: goal.x, y: goal.y };
    this.announceMove();
    return true;
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
      onSignal: (from, data) => { if (mine === this.gen) void this.voice.receive(from, data as Signal); },
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
          info: { ...p, x: spot.x, y: spot.y, voice: d.voice ?? false, muted: d.muted ?? false, away: d.away ?? false, look: d.look },
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
        a.path = findPath(a.pos, { x: d.x, y: d.y }) ?? [{ x: d.x, y: d.y }];
      }
    }
    const voiceChanged = d.voice !== undefined && d.voice !== a.info.voice;
    a.info = { ...a.info, ...d };
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
    const others = [...this.avatars.values()]
      .filter((a) => a.info.voice)
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
        id: a.info.id, name: a.info.name, voice: a.info.voice, away: a.info.away, pos: a.pos, look: a.info.look,
        going: a.goneAt !== undefined,
      })),
      voice: () => this.voice.stats(),
      lines: () => this.voice.lines.size,
      walkTo: (x: number, y: number) => this.walkTo({ x, y }),
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
