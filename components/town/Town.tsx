"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BUILDINGS, COLS, FAR, FOUNTAIN, NEAR, PROXIMITY, ROWS, SPEED, TILE_H, TILE_W, TREES,
  distance, findPath, fromIso, groundAt, hearing, moveEvery, pickLines, spawnFor, stepAlong,
  toIso, walkable, type Building, type Vec,
} from "@/lib/town/world";
import { VoiceMesh, type PeerInfo, type Signal } from "@/lib/town/voice";
import { joinTown, townClient, type Doing, type Identity, type Room, type RoomStatus } from "@/lib/town/room";

/**
 * Cash Town, the prototype: one room, everybody's avatar, tap to walk, and a
 * microphone everybody in the room can hear.
 *
 * Drawn on one canvas with plain 2D calls rather than a game engine: the
 * prototype is a few dozen shapes and a handful of faces, and an engine would
 * be a few hundred kilobytes to draw them. The fc-cash-town skill weighs
 * PixiJS and Phaser for when the town grows.
 *
 * Positions and the voice live in refs and are drawn every frame; React state
 * is only what the panels around the canvas show, so a walking avatar never
 * re-renders the page.
 *
 * Who is shown is who is really here. Somebody who closes the page says
 * goodbye and is gone at once; somebody whose connection dies is gone a few
 * seconds after the room notices, the wait being only long enough to ride out
 * the room re-listing somebody who reconnected.
 */

export type TownMe = Identity;

interface Person extends Identity, Doing {}

interface Avatar {
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
}

/** How long somebody the room stopped listing (without a goodbye) stays. */
const GONE_MS = 4_000;

/**
 * How long a goodbye hides somebody the room still lists. Long after one,
 * they are still here: it came from another tab of theirs, or from somebody
 * else pretending (a goodbye carries a name, not a proof), so they come back.
 */
const BYE_TRUST_MS = 8_000;

/**
 * At most this many in the room. A guard for the whole site rather than a
 * design: every step anybody takes is delivered to everybody, and the
 * project's realtime allowance (500 deliveries a second, shared with the
 * party board and the bell) runs out somewhere past this.
 */
const ROOM_CAP = 30;

/** How often to knock again on a full room. */
const FULL_RETRY_MS = 30_000;

const ISO_MIN_X = -ROWS * (TILE_W / 2);
const ISO_MAX_X = COLS * (TILE_W / 2);
const ISO_MIN_Y = -130;                                   // room for roofs and signs
const ISO_MAX_Y = (COLS + ROWS) * (TILE_H / 2) + 50;
const MIN_SCALE = 0.62;                                   // below this, follow instead of fitting

const GROUND: Record<"grass" | "road" | "plaza", [string, string]> = {
  grass: ["#22382f", "#253d33"],
  road: ["#343a46", "#373e4b"],
  plaza: ["#3d4452", "#424a59"],
};

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1],
  ArrowRight: [1, -1], d: [1, -1], D: [1, -1],
  ArrowDown: [1, 1], s: [1, 1], S: [1, 1],
  ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1],
};

function useWords() {
  const { lang } = useLang();
  const th = lang === "th";
  return {
    th,
    badge: th ? "ทดลอง (Beta)" : "Beta",
    testBadge: th ? "โหมดทดสอบ (dev)" : "Test mode (dev)",
    hint: th ? "แตะพื้นเพื่อเดิน · กดเปิดไมค์เพื่อคุยกับทุกคนในห้อง" : "Tap the ground to walk · turn your mic on to talk with everyone here",
    join: th ? "🎤 เปิดไมค์ เข้าคุย" : "🎤 Turn mic on & join voice",
    mute: th ? "ปิดเสียงตัวเอง" : "Mute me",
    unmute: th ? "เปิดเสียงตัวเอง" : "Unmute me",
    leave: th ? "ออกจากเสียง" : "Leave voice",
    together: th ? "ทุกคนที่เปิดไมค์ในห้องได้ยินกันหมด" : "Everyone with their mic on hears everyone",
    near: th ? `ได้ยินชัดในระยะ ~${NEAR} ช่อง จางหายที่ ${FAR} ช่อง` : `Clear within ~${NEAR} tiles, silent at ${FAR}`,
    here: th ? "ในห้องตอนนี้" : "Here now",
    you: th ? "คุณ" : "you",
    places: th ? "สถานที่" : "Places",
    go: th ? "ไปที่หน้านี้ ↗" : "Open this page ↗",
    close: th ? "ปิด" : "Close",
    hearing: (n: number) => (th ? `ได้ยิน ${n}%` : `${n}% volume`),
    connected: th ? "ต่อเสียงแล้ว" : "voice connected",
    connecting: th ? "กำลังเข้าเมือง…" : "Entering town…",
    needsMigration: th ? "ยังเข้าเมืองไม่ได้: ต้องรัน migration ของ Cash Town ใน SQL editor ก่อน" : "Can't enter yet: the Cash Town migration has to be run first",
    denied: th ? "ยังเข้าเมืองไม่ได้ ต้องยืนยันตัวละครก่อน" : "You need a verified character to enter",
    error: th ? "เชื่อมต่อเมืองไม่สำเร็จ ลองรีเฟรชอีกครั้ง" : "Couldn't connect to the town. Try refreshing.",
    full: (n: number) => (th ? `ห้องเต็มแล้ว (${n} คน) รอสักครู่ ระบบจะลองเข้าให้ใหม่เอง` : `The room is full (${n}). We'll keep trying to get you in.`),
    online: th ? "ออนไลน์" : "Online",
    reconnecting: th ? "กำลังต่อใหม่…" : "Reconnecting…",
    micDenied: th ? "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมค์ — กดรูปกุญแจข้างช่อง URL แล้วอนุญาตไมโครโฟน" : "The browser blocked the microphone. Allow it from the lock icon by the address bar.",
    noMic: th ? "ไม่พบไมโครโฟนในเครื่องนี้" : "No microphone found on this device",
    micFailed: th ? "เปิดไมค์ไม่สำเร็จ" : "Couldn't start the microphone",
    iceFailed: th ? "ต่อเสียงกับคนนี้ไม่สำเร็จ (เครือข่ายอาจกั้น P2P)" : "Voice couldn't connect to this person (the network may block peer-to-peer)",
    connectingVoice: th ? "กำลังต่อเสียง…" : "connecting voice…",
    canvasLabel: th ? "แผนที่ Cash Town แตะเพื่อเดิน" : "Cash Town map. Tap to walk.",
    stats: th ? "สถิติ" : "Stats",
    statsHead: (n: number, up: number, lines: number, fps: number) => th
      ? `ในห้อง ${n} คน · สายเสียง ${up}/${lines} ต่อแล้ว · ${fps} fps`
      : `${n} here · ${up}/${lines} voice lines up · ${fps} fps`,
    statsNone: th ? "ยังไม่มีสายเสียง (ต้องเปิดไมค์ทั้งสองฝั่ง)" : "No voice lines yet (both sides need their mic on)",
    statsCols: th ? ["ใคร", "สถานะ", "RTT", "jitter", "หาย", "kbps", "ทาง"] : ["Who", "State", "RTT", "Jitter", "Lost", "kbps", "Path"],
    direct: th ? "ตรง" : "direct",
    relay: "relay",
  };
}

/** `cap` is for tests (TownGate's dev-only test room); everybody else gets ROOM_CAP. */
export default function Town({ me, testTopic, cap = ROOM_CAP }: { me: TownMe; testTopic?: string; cap?: number }) {
  const w = useWords();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatars = useRef(new Map<string, Avatar>());
  const self = useRef<Avatar | null>(null);
  const room = useRef<Room | null>(null);
  const mesh = useRef<VoiceMesh | null>(null);
  const view = useRef({ s: 1, ox: 0, oy: 0, camX: 0, camY: 0, follow: false, cw: 0, ch: 0 });
  const hover = useRef<Building | null>(null);
  const fontRef = useRef("sans-serif");
  const fpsRef = useRef(0);

  const [status, setStatus] = useState<RoomStatus>("connecting");
  const statusRef = useRef<RoomStatus>("connecting");
  // Whether we have ever got in: before that "connecting" is a wait worth a
  // banner; after it, reconnecting is a hiccup worth a small pill.
  const everReady = useRef(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ b: Building; x: number; y: number } | null>(null);
  // Open on a wide screen; on a phone the list folds away to leave the map.
  const [listOpen, setListOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 640);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<PeerInfo[]>([]);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  /** What I am doing, as the room has been told. */
  const doing = useCallback((): Doing => {
    const a = self.current!;
    return { x: a.info.x, y: a.info.y, voice: a.info.voice, muted: a.info.muted };
  }, []);

  /** A line to everybody I should hear (everybody in voice, for now). */
  const syncVoice = useCallback(() => {
    const voice = mesh.current;
    const mine = self.current;
    if (!voice?.active || !mine) return;
    const others = [...avatars.current.values()]
      .filter((a) => a.info.voice)
      .map((a) => ({ id: a.info.id, pos: a.pos }));
    voice.sync(pickLines(mine.pos, others, voice.lines));
  }, []);

  /* ── announcing my steps: a few a second, fewer as the room fills ─────── */
  const moveTimer = useRef<number | null>(null);
  const lastMoveAt = useRef(0);
  const announceMove = useCallback(() => {
    const send = () => {
      moveTimer.current = null;
      lastMoveAt.current = Date.now();
      const a = self.current;
      if (a) room.current?.move(a.info.x, a.info.y);
    };
    const wait = moveEvery(avatars.current.size + 1) - (Date.now() - lastMoveAt.current);
    if (wait <= 0) send();
    else if (moveTimer.current === null) moveTimer.current = window.setTimeout(send, wait);
  }, []);

  /** Walk my avatar to a tile, if there is a way there. */
  const walkTo = useCallback((tile: Vec) => {
    const a = self.current;
    if (!a) return false;
    const goal = { x: Math.floor(tile.x) + 0.5, y: Math.floor(tile.y) + 0.5 };
    const path = findPath(a.pos, goal);
    if (!path) return false;
    a.path = path;
    a.info = { ...a.info, x: goal.x, y: goal.y };
    announceMove();
    return true;
  }, [announceMove]);

  /* ── entering the town, and staying in it ────────────────────────────── */
  useEffect(() => {
    const site = createClient();

    const start = spawnFor(me.id);
    self.current = {
      info: { ...me, x: start.x, y: start.y, voice: false, muted: false },
      pos: { ...start }, path: [], img: loadFace(me.face), placed: true,
    };
    fontRef.current = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";

    let disposed = false;
    let gen = 0;
    let current: Room | null = null;
    let lastStatus: RoomStatus = "connecting";
    // When it was last fine, or when we last started over: the watchdog's clock.
    let settledAt = Date.now();
    let attempts = 0;
    // Things somebody did before the room listed them; applied when it does.
    const early = new Map<string, Partial<Doing>>();
    // Whom the room lists right now.
    let listed = new Set<string>();

    // Closing the page (or the browser): say goodbye, so nobody is left
    // looking at somebody who has gone. Added before the town's realtime
    // client exists, on purpose: the client hangs up its connection on
    // pagehide too, and listeners on window run in the order they were added
    // (capture or not; tried in Chrome). After the hang-up a goodbye would go
    // by HTTP, which the browser cancels on a closing page. Nothing is torn
    // down here: a closing page takes the connection with it, and a page kept
    // for the back button rejoins when it comes back, its `hi` showing it
    // again to everybody it said goodbye to.
    const goodbye = () => current?.bye();
    window.addEventListener("pagehide", goodbye);

    const report = (s: RoomStatus) => {
      if (disposed) return;
      lastStatus = s;
      statusRef.current = s;
      if (s === "ready") { settledAt = Date.now(); attempts = 0; everReady.current = true; }
      setStatus(s);
    };

    // The keep-alive says when the line has gone quiet before the channel does.
    const client = townClient(site, (beat) => {
      if ((beat === "timeout" || beat === "error") && lastStatus === "ready") report("reconnecting");
    });
    const voice = new VoiceMesh(me.id, (to, s) => current?.signal(to, s), bump);
    mesh.current = voice;

    const apply = (a: Avatar, d: Partial<Doing>) => {
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
      return voiceChanged;
    };

    // Whether this join has been counted in: "ready" waits for the first
    // headcount, so a full room never flashes open before it says it is full.
    let admitted = false;
    let readyHeld = false;

    const onMembers = (people: Identity[]) => {
      const now = Date.now();
      const others = people.filter((p) => p.id !== me.id);
      // The room was full when I arrived: say so and go again.
      if (!admitted) {
        admitted = true;
        if (readyHeld) { readyHeld = false; if (others.length < cap) report("ready"); }
        if (others.length >= cap) {
          report("full");
          settledAt = now;
          gen++;
          const r = current;
          current = null;
          room.current = null;
          r?.bye();
          void r?.leave();
          return;
        }
      }
      const seen = new Set<string>();
      for (const p of others) {
        seen.add(p.id);
        const known = avatars.current.get(p.id);
        if (!known) {
          const d = early.get(p.id) ?? {};
          early.delete(p.id);
          const spot = d.x !== undefined && d.y !== undefined ? { x: d.x, y: d.y } : spawnFor(p.id);
          avatars.current.set(p.id, {
            info: { ...p, x: spot.x, y: spot.y, voice: d.voice ?? false, muted: d.muted ?? false },
            pos: { ...spot }, path: [], img: loadFace(p.face), placed: d.x !== undefined,
          });
        } else {
          if (known.info.face !== p.face) known.img = loadFace(p.face);
          known.info = { ...known.info, name: p.name, face: p.face, color: p.color };
          known.goneAt = undefined;
        }
      }
      for (const a of avatars.current.values()) {
        if (!seen.has(a.info.id) && a.goneAt === undefined) a.goneAt = now;
      }
      listed = seen;
      syncVoice();
      bump();
    };

    const onDoing = (id: string, d: Partial<Doing>) => {
      const a = avatars.current.get(id);
      if (!a) { early.set(id, { ...early.get(id), ...d }); return; }
      if (apply(a, d)) syncVoice();
      bump();
    };

    // Hidden at once, so nobody is left looking at somebody who has gone; the
    // room's own word removes them a moment later (see BYE_TRUST_MS).
    const onBye = (id: string) => {
      early.delete(id);
      const a = avatars.current.get(id);
      if (!a || a.byeAt !== undefined) return;
      a.byeAt = Date.now();
      bump();
    };

    const connect = async () => {
      const mine = ++gen;
      const old = current;
      current = null;
      room.current = null;
      if (old) await old.leave();
      if (disposed || mine !== gen) return;
      admitted = false;
      readyHeld = false;
      const r = await joinTown(client, me, {
        onStatus: (s) => {
          if (mine !== gen) return;
          if (s === "ready" && !admitted) { readyHeld = true; return; }
          report(s);
        },
        onMembers: (list) => { if (!disposed && mine === gen) onMembers(list); },
        onDoing: (id, d) => { if (!disposed && mine === gen) onDoing(id, d); },
        onHello: (id) => {
          if (disposed || mine !== gen) return;
          // Back after a goodbye (a reload): show them again.
          const a = avatars.current.get(id);
          if (a?.byeAt !== undefined) { a.byeAt = undefined; bump(); }
          current?.tell(id, doing());
        },
        onBye: (id) => { if (!disposed && mine === gen) onBye(id); },
        onSignal: (from, data) => { if (mine === gen) void voice.receive(from, data as Signal); },
      }, { testTopic, cancelled: () => disposed || mine !== gen, doing });
      if (!r) return;
      if (disposed || mine !== gen) { void r.leave(); return; }
      current = r;
      room.current = r;
    };
    void connect();

    // The watchdog. Supabase reconnects by itself and usually that is enough;
    // this is for when it is not, so nobody has to reload to find a friend.
    const tick = window.setInterval(() => {
      if (disposed) return;
      const now = Date.now();
      let changed = false;
      for (const [id, a] of avatars.current) {
        if (a.goneAt !== undefined && now - a.goneAt > GONE_MS) { avatars.current.delete(id); changed = true; }
        else if (a.byeAt !== undefined && now - a.byeAt > BYE_TRUST_MS) {
          if (listed.has(id)) a.byeAt = undefined;
          else avatars.current.delete(id);
          changed = true;
        }
      }
      if (changed) bump();
      syncVoice();
      if (lastStatus === "ready") {
        current?.check();
        voice.repair();
        return;
      }
      if (lastStatus === "needs-migration" || lastStatus === "denied") return;
      if (lastStatus === "full") {
        // Knock again now and then; the banner stays until we are in.
        if (now - settledAt > FULL_RETRY_MS) { settledAt = now; void connect(); }
        return;
      }
      if (now - settledAt > Math.min(30_000, 10_000 + attempts * 5_000)) {
        attempts++;
        settledAt = now;
        report("reconnecting");
        void connect();
      }
    }, 1000);

    // Coming back to the tab, or back online: check at once rather than waiting.
    const wake = () => {
      if (disposed || document.visibilityState !== "visible") return;
      if (lastStatus === "ready") { current?.check(); voice.repair(); return; }
      if (lastStatus === "needs-migration" || lastStatus === "denied" || lastStatus === "full") return;
      settledAt = Date.now();
      void connect();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);

    return () => {
      disposed = true;
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("pagehide", goodbye);
      if (moveTimer.current !== null) window.clearTimeout(moveTimer.current);
      voice.stop();
      current?.bye();
      void (current?.leave() ?? Promise.resolve()).finally(() => client.realtime.disconnect());
      room.current = null;
    };
  }, [me, testTopic, cap, bump, syncVoice, doing]);

  /* ── the stats panel, refreshed while it is open ─────────────────────── */
  useEffect(() => {
    if (!statsOpen) return;
    let alive = true;
    const read = async () => { const s = (await mesh.current?.stats()) ?? []; if (alive) setStats(s); };
    void read();
    const id = window.setInterval(read, 2000);
    return () => { alive = false; window.clearInterval(id); };
  }, [statsOpen]);

  // In voice, the list says how each line is doing; twice a second is often
  // enough to read and cheap enough to ignore.
  useEffect(() => {
    if (!voiceOn) return;
    const id = window.setInterval(bump, 500);
    return () => window.clearInterval(id);
  }, [voiceOn, bump]);

  /* ── drawing, every frame ────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const fallback = new Image();
    fallback.src = popotoArt.src;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let fpsSince = last;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      view.current.cw = r.width;
      view.current.ch = r.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frames++;
      if (now - fpsSince >= 1000) { fpsRef.current = Math.round((frames * 1000) / (now - fpsSince)); frames = 0; fpsSince = now; }
      const mine = self.current;
      // Walk everybody along their paths.
      if (mine && mine.path.length) Object.assign(mine, stepAlong(mine.pos, mine.path, SPEED * dt));
      for (const a of avatars.current.values()) {
        if (a.path.length) Object.assign(a, stepAlong(a.pos, a.path, SPEED * dt));
      }
      // Each voice as loud as the town's rules say (all the same, for now).
      const voice = mesh.current;
      if (mine && voice?.active) {
        for (const a of avatars.current.values()) {
          if (a.info.voice) voice.setGain(a.info.id, hearing(distance(mine.pos, a.pos)));
        }
      }
      draw(ctx, canvas, fallback, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function project(v: Vec): Vec {
    const iso = toIso(v.x, v.y);
    const { s, ox, oy } = view.current;
    return { x: ox + iso.x * s, y: oy + iso.y * s };
  }

  function draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, fallback: HTMLImageElement, now: number) {
    const v = view.current;
    const { cw, ch } = v;
    if (!cw || !ch) return;
    const dpr = canvas.width / cw;

    // Fit the whole district if it fits; otherwise follow me around it.
    const fit = Math.min(cw / (ISO_MAX_X - ISO_MIN_X), ch / (ISO_MAX_Y - ISO_MIN_Y));
    v.follow = fit < MIN_SCALE;
    v.s = v.follow ? MIN_SCALE : fit;
    const mapW = (ISO_MAX_X - ISO_MIN_X) * v.s, mapH = (ISO_MAX_Y - ISO_MIN_Y) * v.s;
    if (v.follow && self.current) {
      const iso = toIso(self.current.pos.x, self.current.pos.y);
      v.camX += (iso.x - v.camX) * 0.12;
      v.camY += (iso.y - v.camY) * 0.12;
      // Centre on me, but never show past the edge of the district.
      v.ox = mapW <= cw ? (cw - mapW) / 2 - ISO_MIN_X * v.s
        : Math.min(-ISO_MIN_X * v.s, Math.max(cw - ISO_MAX_X * v.s, cw / 2 - v.camX * v.s));
      v.oy = mapH <= ch ? (ch - mapH) / 2 - ISO_MIN_Y * v.s
        : Math.min(-ISO_MIN_Y * v.s, Math.max(ch - ISO_MAX_Y * v.s, ch / 2 - v.camY * v.s));
    } else {
      v.ox = (cw - mapW) / 2 - ISO_MIN_X * v.s;
      v.oy = (ch - mapH) / 2 - ISO_MIN_Y * v.s;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, "#0d1520");
    sky.addColorStop(1, "#0a0f15");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);

    // The ground.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const kind = groundAt(x, y);
        diamond(ctx, project({ x, y }), project({ x: x + 1, y }), project({ x: x + 1, y: y + 1 }), project({ x, y: y + 1 }));
        ctx.fillStyle = GROUND[kind][(x + y) % 2];
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const mine = self.current;
    const voice = mesh.current;

    // How far a voice carries, when distance matters at all.
    if (PROXIMITY && mine && voice?.active) {
      const c = project(mine.pos);
      for (const [r, a] of [[FAR, 0.05], [NEAR, 0.1]] as const) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r * Math.SQRT2 * (TILE_W / 2) * v.s, r * Math.SQRT2 * (TILE_H / 2) * v.s, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(106,169,224,${a})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(106,169,224,${a * 3})`;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Where I am walking to.
    if (mine && mine.path.length) {
      const end = mine.path[mine.path.length - 1];
      const p = project(end);
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 10 + pulse * 3, 5 + pulse * 1.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(229,204,128,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Everything that stands up, back to front. Signs and names go on top
    // afterwards, so nobody's name is ever behind a roof.
    type Thing = { depth: number; draw: () => void };
    const things: Thing[] = [];
    const signs: Array<() => void> = [];
    const names: Array<() => void> = [];
    // While I am not connected, nobody can see me, so the others are drawn
    // faded: what I see of them is no longer live.
    const live = statusRef.current === "ready";
    for (const b of BUILDINGS) things.push({ depth: b.x + b.y + (b.w + b.h) / 2, draw: () => drawBuilding(ctx, b, signs) });
    for (const t of TREES) things.push({ depth: t.x + t.y + 1, draw: () => drawTree(ctx, t) });
    things.push({ depth: FOUNTAIN.x + FOUNTAIN.y + 2, draw: () => drawFountain(ctx, now) });
    for (const a of avatars.current.values()) {
      if (a.byeAt !== undefined) continue;
      things.push({ depth: a.pos.x + a.pos.y, draw: () => drawAvatar(ctx, a, false, fallback, names, !live) });
    }
    if (mine) things.push({ depth: mine.pos.x + mine.pos.y, draw: () => drawAvatar(ctx, mine, true, fallback, names, false) });
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    for (const s of signs) s();
    for (const n of names) n();
  }

  function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, signs: Array<() => void>) {
    const s = view.current.s;
    const H = b.height * s;
    const top = project({ x: b.x, y: b.y });
    const right = project({ x: b.x + b.w, y: b.y });
    const bottom = project({ x: b.x + b.w, y: b.y + b.h });
    const left = project({ x: b.x, y: b.y + b.h });
    const up = (p: Vec) => ({ x: p.x, y: p.y - H });
    const lit = hover.current?.id === b.id;
    // Right wall, left wall, roof.
    poly(ctx, [right, bottom, up(bottom), up(right)], b.colors[1]);
    poly(ctx, [left, bottom, up(bottom), up(left)], b.colors[2]);
    poly(ctx, [up(top), up(right), up(bottom), up(left)], lit ? lighten(b.colors[0]) : b.colors[0]);
    // A door on the left wall, facing the plaza.
    const door = mid(left, bottom);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(door.x - 7 * s, door.y - 22 * s, 14 * s, 18 * s);
    // The sign.
    const roof = mid(up(top), up(bottom));
    signs.push(() => label(ctx, `${b.icon} ${w.th ? b.name.th : b.name.en}`, roof.x, roof.y - 14,
      lit ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.82)"));
  }

  function drawTree(ctx: CanvasRenderingContext2D, t: Vec) {
    const s = view.current.s;
    const c = project({ x: t.x + 0.5, y: t.y + 0.5 });
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 16 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5b4130";
    ctx.fillRect(c.x - 3 * s, c.y - 26 * s, 6 * s, 26 * s);
    ctx.fillStyle = "#2f6b4f";
    ctx.beginPath();
    ctx.arc(c.x, c.y - 36 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8562";
    ctx.beginPath();
    ctx.arc(c.x - 5 * s, c.y - 41 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFountain(ctx: CanvasRenderingContext2D, now: number) {
    const s = view.current.s;
    const c = project({ x: FOUNTAIN.x + FOUNTAIN.w / 2, y: FOUNTAIN.y + FOUNTAIN.h / 2 });
    const rx = FOUNTAIN.w * (TILE_W / 2) * s * 0.92, ry = FOUNTAIN.h * (TILE_H / 2) * s * 0.92;
    ctx.fillStyle = "#59606e";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f6f9a";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 2 * s, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    const t = (now / 900) % 1;
    ctx.strokeStyle = `rgba(160,210,240,${0.5 - t * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 2 * s, rx * 0.8 * t, ry * 0.8 * t, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8fc3e6";
    ctx.fillRect(c.x - 2 * s, c.y - 30 * s, 4 * s, 28 * s);
  }

  function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar, isMe: boolean, fallback: HTMLImageElement,
    names: Array<() => void>, faded: boolean) {
    const p = project(a.pos);
    const color = a.info.color || "#6aa9e0";
    const voice = mesh.current;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const headY = p.y - 38;
    ctx.save();
    if (faded) ctx.globalAlpha = 0.4;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // A small body in the member's colour.
    ctx.fillStyle = shade(color, -0.25);
    roundRect(ctx, p.x - 10, p.y - 24, 20, 22, 8);
    ctx.fill();

    // Speaking: a ring that grows with the voice.
    if (a.info.voice && level > 0.06) {
      ctx.beginPath();
      ctx.arc(p.x, headY, 17 + 4 + level * 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(79,184,168,${0.35 + level * 0.6})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // The face.
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, headY, 16, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#1b212b";
    ctx.fill();
    ctx.clip();
    const img = a.img && a.img.complete && a.img.naturalWidth ? a.img : fallback;
    if (img.complete && img.naturalWidth) {
      const k = Math.max(32 / img.naturalWidth, 32 / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      ctx.drawImage(img, p.x - iw / 2, headY - (img === fallback ? ih / 2 : 16), iw, ih);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(p.x, headY, 16, 0, Math.PI * 2);
    ctx.strokeStyle = isMe ? "#e3e8ef" : color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // The microphone, when they are in voice.
    if (a.info.voice) {
      ctx.beginPath();
      ctx.arc(p.x + 14, headY + 10, 8, 0, Math.PI * 2);
      ctx.fillStyle = a.info.muted ? "#d14b3a" : "#2a7d6f";
      ctx.fill();
      ctx.font = `10px ${fontRef.current}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(a.info.muted ? "✕" : "🎤", p.x + 14, headY + 10.5);
    }
    ctx.restore();

    const name = isMe ? `${a.info.name} (${w.you})` : a.info.name;
    names.push(() => {
      ctx.save();
      if (faded) ctx.globalAlpha = 0.5;
      label(ctx, name, p.x, p.y + 15, isMe ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.78)");
      ctx.restore();
    });
  }

  function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fg: string, bg: string) {
    ctx.font = `600 12px ${fontRef.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = bg;
    roundRect(ctx, x - tw / 2 - 7, y - 10, tw + 14, 20, 10);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(text, x, y + 0.5);
  }

  /* ── input ───────────────────────────────────────────────────────────── */
  const tileAt = useCallback((clientX: number, clientY: number): Vec | null => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const { s, ox, oy } = view.current;
    const t = fromIso((clientX - r.left - ox) / s, (clientY - r.top - oy) / s);
    return { x: Math.floor(t.x), y: Math.floor(t.y) };
  }, []);

  /** A building under the pointer: its footprint, or its walls above it. */
  const buildingAt = useCallback((clientX: number, clientY: number): Building | null => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const { s, ox, oy } = view.current;
    for (const b of BUILDINGS) {
      // Walk down from the pointer through the wall's height: if any point
      // lands on the footprint, the pointer is on the building.
      for (let lift = 0; lift <= b.height; lift += 6) {
        const t = fromIso((clientX - r.left - ox) / s, (clientY - r.top - oy) / s + lift);
        if (t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h) return b;
      }
    }
    return null;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = buildingAt(e.clientX, e.clientY);
    if (b) {
      const r = wrapRef.current!.getBoundingClientRect();
      setPopover({ b, x: e.clientX - r.left, y: e.clientY - r.top });
      return;
    }
    setPopover(null);
    const t = tileAt(e.clientX, e.clientY);
    if (t && walkable(t.x, t.y)) walkTo(t);
  }, [buildingAt, tileAt, walkTo]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = buildingAt(e.clientX, e.clientY);
    hover.current = b;
    if (canvasRef.current) canvasRef.current.style.cursor = b ? "pointer" : "default";
  }, [buildingAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = KEYS[e.key];
      const a = self.current;
      if (!step || !a) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      const from = a.path.length ? a.path[a.path.length - 1] : a.pos;
      const next = { x: Math.floor(from.x) + step[0], y: Math.floor(from.y) + step[1] };
      if (walkable(next.x, next.y)) walkTo(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walkTo]);

  /* ── voice ───────────────────────────────────────────────────────────── */
  const tellRoom = useCallback((patch: Partial<Doing>) => {
    const a = self.current;
    if (!a) return;
    a.info = { ...a.info, ...patch };
    room.current?.say(doing());
  }, [doing]);

  const joinVoice = useCallback(async () => {
    const voice = mesh.current;
    if (!voice) return;
    setVoiceError(null);
    try {
      await voice.start();
      setVoiceOn(true);
      setMuted(false);
      tellRoom({ voice: true, muted: false });
      syncVoice();
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setVoiceError(name === "NotAllowedError" ? w.micDenied : name === "NotFoundError" ? w.noMic : w.micFailed);
    }
  }, [tellRoom, syncVoice, w.micDenied, w.noMic, w.micFailed]);

  const toggleMute = useCallback(() => {
    const voice = mesh.current;
    if (!voice) return;
    const next = !voice.isMuted;
    voice.setMuted(next);
    setMuted(next);
    tellRoom({ muted: next });
  }, [tellRoom]);

  const leaveVoice = useCallback(() => {
    mesh.current?.stop();
    setVoiceOn(false);
    setMuted(false);
    tellRoom({ voice: false, muted: false });
  }, [tellRoom]);

  /* ── a handle for testing from the console or a script ───────────────── */
  useEffect(() => {
    (window as unknown as { __cashTown?: unknown }).__cashTown = {
      status: () => statusRef.current,
      me: () => self.current && { ...self.current.info, pos: self.current.pos },
      people: () => [...avatars.current.values()].filter((a) => a.byeAt === undefined).map((a) => ({
        id: a.info.id, name: a.info.name, voice: a.info.voice, pos: a.pos, going: a.goneAt !== undefined,
      })),
      voice: () => mesh.current?.stats() ?? [],
      lines: () => mesh.current?.lines.size ?? 0,
      walkTo: (x: number, y: number) => walkTo({ x, y }),
    };
  }, [walkTo]);

  const others = [...avatars.current.values()].filter((a) => a.byeAt === undefined);
  // A banner only for what needs a person: the first wait, or a door that
  // will not open. Reconnecting is a pill; the town goes on meanwhile.
  const banner =
    status === "connecting" && !everReady.current ? w.connecting
    : status === "needs-migration" ? w.needsMigration
    : status === "denied" ? w.denied
    : status === "full" ? w.full(cap)
    : status === "error" ? w.error
    : null;
  const live = status === "ready";
  const lines = stats.length;
  const linesUp = stats.filter((s) => s.state === "connected").length;
  const nameOf = (id: string) => avatars.current.get(id)?.info.name ?? id.slice(0, 6);

  return (
    <div className="mt-4">
      <div ref={wrapRef}
           className="relative h-[min(74dvh,700px)] min-h-[440px] w-full overflow-hidden rounded-2xl border border-line bg-[#0b1016]">
        <canvas ref={canvasRef} role="img" aria-label={w.canvasLabel}
                className="absolute inset-0 touch-none select-none"
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} />

        {/* Beta, and whether we are connected */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          <span className="w-fit rounded-full border border-gold/50 bg-bg/80 px-2 py-0.5 font-data text-label uppercase tracking-wider text-gold">
            {testTopic ? w.testBadge : w.badge}
          </span>
          {everReady.current && (
            <span role="status" className={`w-fit rounded-full bg-bg/80 px-2 py-0.5 text-label ${live ? "text-jade" : "text-gold"}`}>
              {live ? `● ${w.online}` : `◌ ${w.reconnecting}`}
            </span>
          )}
        </div>

        {/* Who is here */}
        <aside className="absolute right-3 top-3 w-56 max-w-[64%] rounded-xl border border-line bg-bg/85 p-2 text-ui backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}
                    className="flex min-w-0 flex-1 items-center gap-1 font-data text-label uppercase tracking-wider text-muted">
              <span>👥 {w.here} · {others.length + 1}</span>
              <span aria-hidden className="ml-auto">{listOpen ? "▴" : "▾"}</span>
            </button>
            <button type="button" onClick={() => setStatsOpen((o) => !o)} aria-pressed={statsOpen}
                    className={`rounded-md px-1.5 py-0.5 text-label ${statsOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-ink"}`}>
              📊 {w.stats}
            </button>
          </div>
          {listOpen && <>
          <ul className="mt-1 flex flex-col gap-1">
            <PersonRow name={`${me.name} (${w.you})`} face={me.face} voice={voiceOn} muted={muted} />
            {others.map((a) => {
              const p = a.info;
              const state = voiceOn && p.voice ? mesh.current?.connectionState(p.id) : null;
              const gain = PROXIMITY && voiceOn && p.voice && self.current ? hearing(distance(self.current.pos, a.pos)) : null;
              return (
                <PersonRow key={p.id} name={p.name} face={p.face} voice={p.voice} muted={p.muted}
                  note={state === "failed" ? `⚠️ ${w.iceFailed}`
                    : state && state !== "connected" ? w.connectingVoice
                    : gain !== null ? w.hearing(Math.round(gain * 100))
                    : state === "connected" ? w.connected : undefined} />
              );
            })}
          </ul>
          <div className="mt-2 border-t border-line pt-1.5 font-data text-label uppercase tracking-wider text-muted">{w.places}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {BUILDINGS.map((b) => (
              <Link key={b.id} href={b.href} target="_blank" className="text-meta text-accent no-underline hover:underline">
                {b.icon} {(w.th ? b.name.th : b.name.en).split(" · ")[0]}
              </Link>
            ))}
          </div>
          </>}
        </aside>

        {/* The stats: what the network is doing to each voice line */}
        {statsOpen && (
          <div className="absolute bottom-24 left-3 z-10 max-h-[45%] w-[min(30rem,calc(100%-1.5rem))] overflow-auto rounded-xl border border-line bg-bg/92 p-2 text-meta text-ink backdrop-blur-sm">
            <div className="mb-1 text-muted">{w.statsHead(others.length + 1, linesUp, lines, fpsRef.current)}</div>
            {stats.length === 0 ? <div className="text-muted">{w.statsNone}</div> : (
              <table className="w-full font-data">
                <thead className="text-muted">
                  <tr>{w.statsCols.map((c) => <th key={c} className="px-1 text-left font-normal">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.id}>
                      <td className="max-w-[8rem] truncate px-1">{nameOf(s.id)}</td>
                      <td className={`px-1 ${s.state === "connected" ? "text-jade" : "text-gold"}`}>{s.state}</td>
                      <td className="px-1">{s.rtt ?? "–"}</td>
                      <td className="px-1">{s.jitter ?? "–"}</td>
                      <td className={`px-1 ${(s.loss ?? 0) > 3 ? "text-chili" : ""}`}>{s.loss === null ? "–" : `${s.loss}%`}</td>
                      <td className="px-1">{s.kbpsIn ?? "–"}</td>
                      <td className="px-1">{s.path === "relay" ? w.relay : s.path === "direct" ? w.direct : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* A building's door */}
        {popover && (
          <div className="absolute z-10 w-56 rounded-xl border border-line-lit bg-surface p-3 shadow-xl"
               style={{ left: Math.min(popover.x, (view.current.cw || 300) - 232), top: Math.max(8, popover.y - 96) }}>
            <div className="text-read font-semibold text-ink">{popover.b.icon} {w.th ? popover.b.name.th : popover.b.name.en}</div>
            <div className="mt-2 flex items-center gap-2">
              <Link href={popover.b.href} target="_blank"
                    className="rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent no-underline hover:bg-accent/25">{w.go}</Link>
              <button type="button" onClick={() => setPopover(null)} className="ml-auto px-2 py-1.5 text-ui text-muted">{w.close}</button>
            </div>
          </div>
        )}

        {/* Status */}
        {banner && (
          <div className="absolute inset-x-0 top-1/2 mx-auto w-fit max-w-[90%] -translate-y-1/2 rounded-xl border border-line bg-bg/90 px-4 py-3 text-center text-read text-ink">
            {banner}
          </div>
        )}

        {/* Voice */}
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 px-3">
          {voiceError && <div className="max-w-md rounded-lg bg-chili/20 px-3 py-1.5 text-center text-ui text-ink">{voiceError}</div>}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!voiceOn ? (
              <button type="button" onClick={() => void joinVoice()} disabled={!everReady.current || status === "full"}
                      className="rounded-full bg-jade px-5 py-2.5 text-read font-semibold text-bg shadow-lg disabled:opacity-40">
                {w.join}
              </button>
            ) : (
              <>
                <button type="button" onClick={toggleMute}
                        className={`rounded-full px-4 py-2.5 text-read font-semibold shadow-lg ${muted ? "bg-chili text-white" : "bg-surface text-ink border border-line-strong"}`}>
                  {muted ? `🔇 ${w.unmute}` : `🎤 ${w.mute}`}
                </button>
                <button type="button" onClick={leaveVoice}
                        className="rounded-full border border-line-strong bg-surface px-4 py-2.5 text-read text-muted shadow-lg">
                  {w.leave}
                </button>
              </>
            )}
          </div>
          <div className="rounded-full bg-bg/70 px-3 py-1 text-center text-meta text-muted">
            {voiceOn ? (PROXIMITY ? w.near : w.together) : w.hint}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonRow({ name, face, voice, muted, note }: {
  name: string; face: string | null; voice: boolean; muted: boolean; note?: string;
}) {
  return (
    <li className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {face ? <img src={face} alt="" className="size-6 shrink-0 rounded-full object-cover" />
        : <span className="size-6 shrink-0 rounded-full bg-card" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ink">{name}</span>
        {note && <span className="block truncate text-label text-muted">{note}</span>}
      </span>
      {voice && <span aria-hidden className={muted ? "text-chili" : "text-jade"}>{muted ? "🔇" : "🎤"}</span>}
    </li>
  );
}

/* ── small drawing helpers ──────────────────────────────────────────────── */

function loadFace(url: string | null): HTMLImageElement | null {
  if (!url) return null;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img;
}

function diamond(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, c: Vec, d: Vec) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

function poly(ctx: CanvasRenderingContext2D, pts: Vec[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c : 255 - c) * amount)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const lighten = (hex: string) => shade(hex, 0.25);
