"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BUILDINGS, FAR, FOUNTAIN, NEAR, PROXIMITY, ROWS, COLS, TILE_H, TILE_W, TREES,
  distance, fromIso, groundAt, hearing, toIso, walkable, type Building, type Vec,
} from "@/lib/town/world";
import { clampCam, clampScale, startScale, toIsoPoint, toScreen, zoomAt, type Cam } from "@/lib/town/camera";
import { facingFor, loadDollKit, type DollKit, type View } from "@/lib/town/doll";
import { decodeLook, defaultLook, type Look } from "@/lib/town/look";
import type { PeerInfo } from "@/lib/town/voice";
import type { Identity } from "@/lib/town/room";
import { resumable } from "@/lib/town/active";
import { BUBBLE_MS, wrapLines } from "@/lib/town/chat";
import { ROOM_CAP, openSession, type Avatar, type TownSession } from "@/lib/town/session";
import ChatHistory from "./ChatHistory";
import Wardrobe from "./Wardrobe";

/**
 * Cash Town's page: the map, who is here, the microphone and the wardrobe.
 *
 * The stay in town is a TownSession (lib/town/session), which outlives this
 * page: go to another page and you are still in town and still talking, with
 * the dock (TownBar) at the foot of it; come back and this page picks up the
 * same stay, with nothing to reconnect. Leaving is a button here or the dock's
 * ✕, or closing the tab.
 *
 * The map takes the whole window under the site's header (and runs under the
 * phone's tab bar, which floats over it), or all of the screen in fullscreen.
 * What sits over it is small and kept to the corners, so typing or talking
 * never hides the town: the chat is a slim bar at the bottom left (a button
 * on a phone), the microphone at the bottom right.
 *
 * Drawn on one canvas with plain 2D calls rather than a game engine. Avatars
 * are paper dolls (lib/town/doll), from one picture fetched once; profile
 * pictures are only in the card a tap on somebody opens.
 *
 * Positions live in the session and are drawn every frame; React state is
 * only what the panels around the canvas show, so a walking avatar never
 * re-renders the page.
 */

export type TownMe = Identity;

/** A doll's height on the map, unscaled: the top of the head to the feet. */
const DOLL_H = 74;
/** How long a line stays in the log over the map. */
const LOG_SHOWN_MS = 120_000;
/** How long a blink lasts. */
const BLINK_MS = 130;
/** How far a press may move and still be a tap (CSS pixels). */
const SLOP_TOUCH = 10;
const SLOP_MOUSE = 4;
/** How close the wardrobe brings the camera. */
const WARDROBE_ZOOM = 2;

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

/** The wardrobe turns you through these, as the town's four walking directions and the front. */
const TURNS: Array<{ view: View; mirror: boolean }> = [
  { view: 0, mirror: false }, { view: 1, mirror: false }, { view: 2, mirror: false },
  { view: 2, mirror: true }, { view: 1, mirror: true },
];

const noSubscribe = () => () => {};

function useWords() {
  const { lang } = useLang();
  const th = lang === "th";
  return {
    th,
    testBadge: th ? "โหมดทดสอบ (dev)" : "Test mode (dev)",
    beta: th ? "ทดลอง" : "Beta",
    hintDesk: th ? "คลิกพื้นเพื่อเดิน · ลากเพื่อเลื่อน · หมุนล้อเมาส์เพื่อซูม · คลิกที่ใครเพื่อดูข้อมูล"
      : "Click the ground to walk · drag to look around · scroll to zoom · click somebody to see who",
    hintPhone: th ? "แตะพื้นเพื่อเดิน · ลากเพื่อเลื่อน · ถ่างสองนิ้วเพื่อซูม" : "Tap to walk · drag to look around · pinch to zoom",
    join: th ? "เปิดไมค์" : "Turn mic on",
    joinLong: th ? "เปิดไมค์ เข้าคุย" : "Turn mic on & join voice",
    mute: th ? "ปิดเสียงตัวเอง" : "Mute me",
    unmute: th ? "เปิดเสียงตัวเอง" : "Unmute me",
    leave: th ? "ออกจากเสียง" : "Leave voice",
    leaveTown: th ? "ออกจากเมือง" : "Leave town",
    left: th ? "ออกจากเมืองแล้ว" : "You left the town",
    reenter: th ? "เข้าเมืองอีกครั้ง" : "Enter again",
    near: th ? `ได้ยินชัดในระยะ ~${NEAR} ช่อง จางหายที่ ${FAR} ช่อง` : `Clear within ~${NEAR} tiles, silent at ${FAR}`,
    here: th ? "ในเมืองตอนนี้" : "Here now",
    peopleBtn: (n: number) => (th ? `${n} คนในเมือง` : `${n} in town`),
    you: th ? "คุณ" : "you",
    places: th ? "สถานที่" : "Places",
    go: th ? "ไปที่หน้านี้" : "Go to this page",
    close: th ? "ปิด" : "Close",
    hearing: (n: number) => (th ? `ได้ยิน ${n}%` : `${n}% volume`),
    inVoice: th ? "เปิดไมค์อยู่" : "Mic on",
    mutedNote: th ? "ปิดเสียงตัวเองอยู่" : "Muted",
    connected: th ? "ต่อเสียงแล้ว" : "voice connected",
    away: th ? "อยู่หน้าอื่นของเว็บ" : "on another page",
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
    tapToHear: th ? "🔊 แตะเพื่อฟังเสียง" : "🔊 Tap to hear",
    iceFailed: th ? "ต่อเสียงกับคนนี้ไม่สำเร็จ (เครือข่ายอาจกั้น P2P)" : "Voice couldn't connect to this person (the network may block peer-to-peer)",
    connectingVoice: th ? "กำลังต่อเสียง…" : "connecting voice…",
    canvasLabel: th ? "แผนที่ Cash Town แตะพื้นเพื่อเดิน แตะที่ใครเพื่อดูข้อมูล" : "Cash Town map. Tap the ground to walk, tap somebody to see who they are.",
    stats: th ? "สถิติ" : "Stats",
    statsHead: (n: number, up: number, lines: number, fps: number) => th
      ? `ในห้อง ${n} คน · สายเสียง ${up}/${lines} ต่อแล้ว · ${fps} fps`
      : `${n} here · ${up}/${lines} voice lines up · ${fps} fps`,
    statsNone: th ? "ยังไม่มีสายเสียง (ต้องเปิดไมค์ทั้งสองฝั่ง)" : "No voice lines yet (both sides need their mic on)",
    statsCols: th ? ["ใคร", "สถานะ", "RTT", "jitter", "หาย", "kbps", "ทาง"] : ["Who", "State", "RTT", "Jitter", "Lost", "kbps", "Path"],
    direct: th ? "ตรง" : "direct",
    relay: "relay",
    chat: th ? "แชท" : "Chat",
    chatPlaceholder: th ? "พิมพ์คุยกับทุกคน… (Enter)" : "Say something to everyone… (Enter)",
    chatPlaceholderPhone: th ? "พิมพ์คุยกับทุกคน…" : "Say something to everyone…",
    history: th ? "ประวัติแชท" : "Chat history",
    historyClose: th ? "ย่อประวัติแชท" : "Hide chat history",
    historyOpen: th ? "แตะเพื่อเลื่อนดูประวัติแชท" : "Tap to scroll back through the chat",
    send: th ? "ส่ง" : "Send",
    chatLog: th ? "แชทล่าสุด" : "Recent chat",
    slow: th ? "พิมพ์เร็วไปนิด รอแป๊บนึงนะ" : "A little fast. Wait a moment.",
    offline: th ? "ยังส่งไม่ได้ กำลังต่อใหม่" : "Can't send while reconnecting.",
    wardrobe: th ? "แต่งตัว" : "Wardrobe",
    fullscreen: th ? "เต็มจอ" : "Fullscreen",
    exitFullscreen: th ? "ออกจากเต็มจอ" : "Exit fullscreen",
    zoomIn: th ? "ซูมเข้า" : "Zoom in",
    zoomOut: th ? "ซูมออก" : "Zoom out",
    recenter: th ? "กลับมาที่ตัวเรา" : "Back to me",
    walkTo: th ? "เดินไปหา" : "Walk over",
    find: th ? "ไปดูคนนี้" : "Show on the map",
  };
}

/** Somebody's card, over their head (`top`), or under their feet (`bottom`) near the top of the screen. */
type Card = { id: string; x: number; top: number; bottom: number };

/** `cap` is for tests (TownGate's dev-only test room); everybody else gets ROOM_CAP. */
export default function Town({ me, testTopic, cap = ROOM_CAP }: { me: TownMe; testTopic?: string; cap?: number }) {
  const w = useWords();
  // The canvas is drawn by the first render's functions; words it draws come from here.
  const words = useRef(w);
  words.current = w;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef({ s: 1, cx: 0, cy: 0, cw: 0, ch: 0, ready: false, follow: true, dpr: 1 });
  const hover = useRef<Building | null>(null);
  const fontRef = useRef("sans-serif");
  const fpsRef = useRef(0);
  const reducedRef = useRef(false);
  const kitRef = useRef<DollKit | null>(null);
  const facings = useRef(new Map<string, { view: View; mirror: boolean; at: number }>());
  const blinks = useRef(new Map<string, number>());
  const hits = useRef<Array<{ id: string; x0: number; y0: number; x1: number; y1: number }>>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ mode: "none" | "tap" | "pan" | "pinch"; sx: number; sy: number; lx: number; ly: number; d0: number; s0: number; iso: Vec | null; slop: number }>(
    { mode: "none", sx: 0, sy: 0, lx: 0, ly: 0, d0: 0, s0: 1, iso: null, slop: SLOP_MOUSE });
  /** Where on the screen the camera keeps me: the middle, or what a panel leaves. */
  const focus = useRef<{ x: number; y: number } | null>(null);
  /** The wardrobe's turn of my avatar, and the zoom to go back to after it. */
  const turn = useRef(0);
  const zoomBefore = useRef<number | null>(null);

  const [session, setSession] = useState<TownSession | null>(null);
  const sessionRef = useRef<TownSession | null>(null);
  const [popover, setPopover] = useState<{ b: Building; x: number; y: number } | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [phone, setPhone] = useState(false);
  const [hint, setHint] = useState(true);
  const [stats, setStats] = useState<PeerInfo[]>([]);
  const [, setTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [chatNote, setChatNote] = useState<string | null>(null);
  const [lift, setLift] = useState(0);
  /** The chat's history panel (on a phone, part of the open chat). */
  const [historyOpen, setHistoryOpen] = useState(false);
  /** How tall the part of the screen above a phone's keyboard is. */
  const [visibleH, setVisibleH] = useState(0);
  const chatRef = useRef<HTMLInputElement>(null);

  /** The stay already going in this tab, or a new one (resumed, after a reload). */
  const enter = useCallback(() => {
    const rec = resumable();
    const resume = rec && rec.me.id === me.id && rec.testTopic === testTopic
      ? { voice: rec.voice, muted: rec.muted } : undefined;
    setSession(openSession(me, { testTopic, cap, resume }));
    // The stay is keyed by who you are; a new name or face waits for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, testTopic, cap]);
  useEffect(() => { enter(); }, [enter]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useSyncExternalStore(session?.subscribe ?? noSubscribe, () => session?.version ?? 0, () => 0);
  // This page showing the stay is what tells the others we are looking at the map.
  useEffect(() => session?.attachView(), [session]);

  useEffect(() => {
    fontRef.current = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The dolls: one picture, fetched once per tab.
  useEffect(() => {
    let alive = true;
    loadDollKit().then((k) => { if (alive) kitRef.current = k; }).catch(() => { /* simple figures until a reload */ });
    return () => { alive = false; };
  }, []);

  // A phone gets the compact layout: chat behind a button, smaller controls.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // The page under the town does not scroll: the town is the page.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = prev; };
  }, []);

  // Leaving the browser's fullscreen (Esc) leaves ours too.
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setImmersive(false); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The hint goes once you have the hang of it, or after a while.
  useEffect(() => {
    const id = window.setTimeout(() => setHint(false), 12_000);
    return () => window.clearTimeout(id);
  }, []);

  // Typing on a phone: the keyboard covers the bottom of the screen; the chat
  // bar sits on top of it instead.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!chatOpen || !vv) { setLift(0); return; }
    const update = () => {
      setLift(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
      setVisibleH(Math.round(vv.height));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [chatOpen]);

  const s = session && !session.closed ? session : null;
  const voiceOn = !!s && s.self.info.voice && s.voice.active;

  /* ── the stats panel, refreshed while it is open ─────────────────────── */
  useEffect(() => {
    if (!statsOpen || !s) return;
    let alive = true;
    const read = async () => { const r = await s.stats(); if (alive) setStats(r); };
    void read();
    const id = window.setInterval(read, 2000);
    return () => { alive = false; window.clearInterval(id); };
  }, [statsOpen, s]);

  // In voice, the list says how each line is doing; twice a second is often
  // enough to read and cheap enough to ignore. With chat, old lines leave the
  // log over the map without anybody typing.
  const chatting = !!s && s.chat.length > 0;
  useEffect(() => {
    if (!voiceOn && !chatting) return;
    const id = window.setInterval(() => setTick((n) => n + 1), voiceOn ? 500 : 2000);
    return () => window.clearInterval(id);
  }, [voiceOn, chatting]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    const r = s.sendChat(draft);
    if (r === "sent") { setDraft(""); setChatNote(null); }
    else if (r === "slow") setChatNote(w.slow);
    else if (r === "offline") setChatNote(w.offline);
  };

  /* ── the camera ──────────────────────────────────────────────────────── */
  const camNow = (): Cam => ({ s: cam.current.s, cx: cam.current.cx, cy: cam.current.cy });
  const setCam = (c: Cam) => { const v = cam.current; const k = clampCam(c, v.cw, v.ch); v.s = k.s; v.cx = k.cx; v.cy = k.cy; };
  const zoomBy = useCallback((factor: number, px?: number, py?: number) => {
    const v = cam.current;
    if (!v.cw) return;
    setCam(zoomAt(camNow(), v.s * factor, px ?? v.cw / 2, py ?? v.ch / 2, v.cw, v.ch));
    // Zooming with the buttons keeps me in view; with the wheel or fingers, where you point.
    if (px === undefined) v.follow = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const recenter = () => { cam.current.follow = true; };

  /** Look at somebody: the camera to them, and their card. */
  const showPerson = (id: string) => {
    const stay = sessionRef.current;
    const a = id === me.id ? stay?.self : stay?.avatars.get(id);
    if (!a) return;
    const v = cam.current;
    const iso = toIso(a.pos.x, a.pos.y);
    v.follow = id === me.id;
    setCam({ s: Math.max(v.s, 1.2), cx: iso.x, cy: iso.y - DOLL_H * 0.5 });
    const p = toScreen(camNow(), iso, v.cw, v.ch);
    setCard({ id, x: p.x, top: p.y - DOLL_H * v.s * 1.12, bottom: p.y + 22 });
    setPeopleOpen(false);
  };

  /* ── drawing, every frame ────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = stageRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let fpsSince = last;

    const resize = () => {
      const r = stage.getBoundingClientRect();
      // Sharp on a phone's dense screen, but never a canvas of more than about
      // four million pixels: a 4K monitor would otherwise redraw thirty.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / Math.max(1, r.width * r.height)));
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const v = cam.current;
      v.cw = r.width; v.ch = r.height; v.dpr = dpr;
      if (v.ready) setCam(camNow());
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frames++;
      if (now - fpsSince >= 1000) { fpsRef.current = Math.round((frames * 1000) / (now - fpsSince)); frames = 0; fpsSince = now; }
      const live = sessionRef.current;
      if (live && !live.closed) live.step(now, dt);
      draw(ctx, canvas, now, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function project(t: Vec): Vec {
    const v = cam.current;
    return toScreen(v, toIso(t.x, t.y), v.cw, v.ch);
  }

  function draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, now: number, dt: number) {
    const v = cam.current;
    const { cw, ch } = v;
    if (!cw || !ch) return;
    const dpr = canvas.width / cw;
    const stay = sessionRef.current && !sessionRef.current.closed ? sessionRef.current : null;
    const mine = stay?.self ?? null;

    // The camera: where it starts, and following me (to the spot a panel leaves).
    if (!v.ready) {
      v.s = startScale(cw, ch);
      const iso = mine ? toIso(mine.pos.x, mine.pos.y) : { x: 0, y: (ROWS + COLS) * TILE_H / 4 };
      v.cx = iso.x; v.cy = iso.y;
      v.ready = true;
      setCam(camNow());
    }
    if (v.follow && mine) {
      const iso = toIso(mine.pos.x, mine.pos.y);
      const f = focus.current ?? { x: cw / 2, y: ch / 2 };
      const tx = iso.x - (f.x - cw / 2) / v.s, ty = iso.y - DOLL_H * 0.45 - (f.y - ch / 2) / v.s;
      const ease = Math.min(1, dt * 7);
      setCam({ s: v.s, cx: v.cx + (tx - v.cx) * ease, cy: v.cy + (ty - v.cy) * ease });
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

    // How far a voice carries, when distance matters at all.
    if (PROXIMITY && mine && stay?.voice.active) {
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
      const pulse = reducedRef.current ? 0.5 : 0.5 + 0.5 * Math.sin(now / 180);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (10 + pulse * 3) * Math.min(1.4, v.s), (5 + pulse * 1.5) * Math.min(1.4, v.s), 0, 0, Math.PI * 2);
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
    const boxes: typeof hits.current = [];
    // While I am not connected, nobody can see me, so the others are drawn
    // faded: what I see of them is no longer live.
    const live = stay?.status === "ready";
    // Chat times are wall-clock; the frame's `now` is not.
    const wall = Date.now();
    for (const b of BUILDINGS) things.push({ depth: b.x + b.y + (b.w + b.h) / 2, draw: () => drawBuilding(ctx, b, signs) });
    for (const t of TREES) things.push({ depth: t.x + t.y + 1, draw: () => drawTree(ctx, t) });
    things.push({ depth: FOUNTAIN.x + FOUNTAIN.y + 2, draw: () => drawFountain(ctx, now) });
    if (stay) {
      for (const a of stay.avatars.values()) {
        if (a.byeAt !== undefined) continue;
        things.push({ depth: a.pos.x + a.pos.y, draw: () => drawAvatar(ctx, a, false, names, boxes, !live, wall, now, dpr) });
      }
    }
    if (mine) things.push({ depth: mine.pos.x + mine.pos.y, draw: () => drawAvatar(ctx, mine, true, names, boxes, false, wall, now, dpr) });
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    for (const sign of signs) sign();
    for (const n of names) n();
    hits.current = boxes;
  }

  function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, signs: Array<() => void>) {
    const k = cam.current.s;
    const H = b.height * k;
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
    ctx.fillRect(door.x - 7 * k, door.y - 22 * k, 14 * k, 18 * k);
    // The sign.
    const roof = mid(up(top), up(bottom));
    signs.push(() => label(ctx, `${b.icon} ${words.current.th ? b.name.th : b.name.en}`, roof.x, roof.y - 14,
      lit ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.82)"));
  }

  function drawTree(ctx: CanvasRenderingContext2D, t: Vec) {
    const k = cam.current.s;
    const c = project({ x: t.x + 0.5, y: t.y + 0.5 });
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 16 * k, 7 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5b4130";
    ctx.fillRect(c.x - 3 * k, c.y - 26 * k, 6 * k, 26 * k);
    ctx.fillStyle = "#2f6b4f";
    ctx.beginPath();
    ctx.arc(c.x, c.y - 36 * k, 18 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8562";
    ctx.beginPath();
    ctx.arc(c.x - 5 * k, c.y - 41 * k, 9 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFountain(ctx: CanvasRenderingContext2D, now: number) {
    const k = cam.current.s;
    const c = project({ x: FOUNTAIN.x + FOUNTAIN.w / 2, y: FOUNTAIN.y + FOUNTAIN.h / 2 });
    const rx = FOUNTAIN.w * (TILE_W / 2) * k * 0.92, ry = FOUNTAIN.h * (TILE_H / 2) * k * 0.92;
    ctx.fillStyle = "#59606e";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f6f9a";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 2 * k, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    const t = reducedRef.current ? 0.5 : (now / 900) % 1;
    ctx.strokeStyle = `rgba(160,210,240,${0.5 - t * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 2 * k, rx * 0.8 * t, ry * 0.8 * t, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8fc3e6";
    ctx.fillRect(c.x - 2 * k, c.y - 30 * k, 4 * k, 28 * k);
  }

  /** Which way somebody faces: the way they walk; after standing a while, towards you. */
  function facingOf(a: Avatar, isMe: boolean, now: number): { view: View; mirror: boolean } {
    if (isMe && wardrobeOpenRef.current) return TURNS[((turn.current % TURNS.length) + TURNS.length) % TURNS.length];
    const id = a.info.id;
    let f = facings.current.get(id);
    if (a.path.length) {
      const next = a.path[0];
      const dx = next.x - a.pos.x, dy = next.y - a.pos.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.01) {
        f = { ...facingFor(dx, dy), at: now };
        facings.current.set(id, f);
      }
    }
    if (!f) return { view: 0, mirror: false };
    // Standing still for a few seconds: turn to face the viewer, like an idle pose.
    if (!a.path.length && now - f.at > 4000) return { view: 0, mirror: f.mirror };
    return f;
  }

  const defaults = useRef(new Map<string, Look>());
  function lookOf(a: Avatar): Look {
    const chosen = decodeLook(a.info.look);
    if (chosen) return chosen;
    let d = defaults.current.get(a.info.id);
    if (!d) { d = defaultLook(a.info.id); defaults.current.set(a.info.id, d); }
    return d;
  }

  function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar, isMe: boolean, names: Array<() => void>,
    boxes: typeof hits.current, faded: boolean, wall: number, now: number, dpr: number) {
    const v = cam.current;
    const p = project(a.pos);
    const k = v.s;
    const h = DOLL_H * k;
    const voice = sessionRef.current?.voice;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const talking = a.info.voice && !a.info.muted && level > 0.06;
    // On another page of the site: still here, still talking, not watching.
    const away = !isMe && a.info.away;
    const moving = a.path.length > 0;
    const bob = moving && !reducedRef.current ? Math.abs(Math.sin(now / 1000 * Math.PI * 2.4)) * 3.2 * k : 0;
    ctx.save();
    if (faded) ctx.globalAlpha = 0.4;
    else if (away) ctx.globalAlpha = 0.6;

    // A shadow, and a ring at the feet while they speak.
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 15 * k, 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    if (talking) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (17 + level * 8) * k, (7 + level * 3) * k, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(79,184,168,${0.45 + level * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const kit = kitRef.current;
    const look = lookOf(a);
    const face = facingOf(a, isMe, now);
    // Blinks, now and then, each on their own clock.
    let blink = false;
    if (!reducedRef.current) {
      const next = blinks.current.get(a.info.id) ?? now + 1500 + Math.random() * 3000;
      if (now > next + BLINK_MS) blinks.current.set(a.info.id, now + 2600 + Math.random() * 3400);
      else blinks.current.set(a.info.id, next);
      blink = now >= next && now <= next + BLINK_MS;
    }
    const mouth = talking ? (Math.floor(now / 150) % 2 ? "o" : undefined) : undefined;
    if (kit) {
      kit.draw(ctx, look, face.view, face.mirror, p.x, p.y - bob, h, { blink, mouth }, dpr);
    } else {
      // Until the dolls arrive: a simple figure.
      ctx.fillStyle = "#6aa9e0";
      roundRect(ctx, p.x - 9 * k, p.y - h * 0.55 - bob, 18 * k, h * 0.5, 8 * k);
      ctx.fill();
      ctx.fillStyle = "#e5b48a";
      ctx.beginPath();
      ctx.arc(p.x, p.y - h * 0.72 - bob, h * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }

    const top = p.y - h * 1.12 - bob;
    ctx.font = `10px ${fontRef.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // The microphone, when they are in voice.
    if (a.info.voice) {
      const bx = p.x + h * 0.34, by = p.y - h * 0.86 - bob;
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fillStyle = a.info.muted ? "#d14b3a" : "#2a7d6f";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(a.info.muted ? "✕" : "🎤", bx, by + 0.5);
    }
    // Looking at another page.
    if (away) {
      const bx = p.x - h * 0.34, by = p.y - h * 0.86 - bob;
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#36414f";
      ctx.fill();
      ctx.fillText("📄", bx, by + 0.5);
    }
    ctx.restore();

    boxes.push({ id: a.info.id, x0: p.x - h * 0.38, y0: top, x1: p.x + h * 0.38, y1: p.y + 22 });
    const name = isMe ? `${a.info.name} (${words.current.you})` : a.info.name;
    const said = a.said && wall - a.said.at < BUBBLE_MS ? a.said : null;
    names.push(() => {
      ctx.save();
      if (faded || away) ctx.globalAlpha = 0.6;
      label(ctx, name, p.x, p.y + 13, isMe ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.78)");
      ctx.restore();
      // What they just typed, over their head; it fades in its last moment.
      if (said) bubble(ctx, said.text, p.x, top - 2, Math.min(1, (BUBBLE_MS - (wall - said.at)) / 800));
    });
  }

  function bubble(ctx: CanvasRenderingContext2D, text: string, x: number, bottom: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `500 12px ${fontRef.current}`;
    const lines = wrapLines(text, 168, (t) => ctx.measureText(t).width, 3);
    const lh = 16;
    const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
    const height = lines.length * lh + 10;
    const top = bottom - height - 6;
    ctx.fillStyle = "rgba(227,232,239,0.96)";
    roundRect(ctx, x - width / 2, top, width, height, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 6, top + height - 1);
    ctx.lineTo(x, top + height + 6);
    ctx.lineTo(x + 6, top + height - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0f1319";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, x, top + 5 + lh / 2 + i * lh + 0.5));
    ctx.restore();
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
  const local = (clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const tileAt = (x: number, y: number): Vec => {
    const v = cam.current;
    const iso = toIsoPoint(v, x, y, v.cw, v.ch);
    const t = fromIso(iso.x, iso.y);
    return { x: Math.floor(t.x), y: Math.floor(t.y) };
  };

  /** A building under the pointer: its footprint, or its walls above it. */
  const buildingAt = (x: number, y: number): Building | null => {
    const v = cam.current;
    for (const b of BUILDINGS) {
      // Walk down from the pointer through the wall's height: if any point
      // lands on the footprint, the pointer is on the building.
      for (let lift = 0; lift <= b.height; lift += 6) {
        const iso = toIsoPoint(v, x, y, v.cw, v.ch);
        const t = fromIso(iso.x, iso.y + lift);
        if (t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h) return b;
      }
    }
    return null;
  };

  /** Somebody under the pointer, the one in front first. */
  const personAt = (x: number, y: number) => {
    const list = hits.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b;
    }
    return null;
  };

  const tap = (x: number, y: number) => {
    setHint(false);
    setHistoryOpen(false);
    const who = personAt(x, y);
    if (who) { setPopover(null); setCard({ id: who.id, x: (who.x0 + who.x1) / 2, top: who.y0, bottom: who.y1 }); return; }
    setCard(null);
    const b = buildingAt(x, y);
    if (b) { setPopover({ b, x, y }); return; }
    setPopover(null);
    setPeopleOpen(false);
    const t = tileAt(x, y);
    if (walkable(t.x, t.y) && sessionRef.current?.walkTo(t)) cam.current.follow = true;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size === 1) {
      Object.assign(g, { mode: "tap", sx: p.x, sy: p.y, lx: p.x, ly: p.y, slop: e.pointerType === "mouse" ? SLOP_MOUSE : SLOP_TOUCH });
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const v = cam.current;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      Object.assign(g, { mode: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: v.s, iso: toIsoPoint(v, mx, my, v.cw, v.ch) });
      v.follow = false;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e.clientX, e.clientY);
    const g = gesture.current;
    const v = cam.current;
    if (!pointers.current.has(e.pointerId)) {
      // Just hovering: a hand over what can be clicked.
      if (e.pointerType === "mouse") {
        const b = personAt(p.x, p.y) ? null : buildingAt(p.x, p.y);
        hover.current = b;
        e.currentTarget.style.cursor = b || personAt(p.x, p.y) ? "pointer" : "grab";
      }
      return;
    }
    pointers.current.set(e.pointerId, p);
    if (g.mode === "pinch" && pointers.current.size >= 2 && g.iso) {
      const [a, b] = [...pointers.current.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = clampScale(g.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), v.cw, v.ch);
      // The spot under the fingers stays under the fingers, as they move and spread.
      setCam({ s: ns, cx: g.iso.x - (mx - v.cw / 2) / ns, cy: g.iso.y - (my - v.ch / 2) / ns });
      return;
    }
    if (g.mode === "tap" && Math.hypot(p.x - g.sx, p.y - g.sy) > g.slop) g.mode = "pan";
    if (g.mode === "pan") {
      setCam({ s: v.s, cx: v.cx - (p.x - g.lx) / v.s, cy: v.cy - (p.y - g.ly) / v.s });
      v.follow = false;
      e.currentTarget.style.cursor = "grabbing";
    }
    g.lx = p.x; g.ly = p.y;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    const had = pointers.current.delete(e.pointerId);
    if (!had) return;
    if (pointers.current.size === 0) {
      if (g.mode === "tap" && e.type === "pointerup") tap(g.sx, g.sy);
      g.mode = "none";
      if (e.pointerType === "mouse") e.currentTarget.style.cursor = "grab";
    } else if (g.mode === "pinch") {
      // One finger left after a pinch: it pans from here, it is not a tap.
      const [rest] = [...pointers.current.values()];
      Object.assign(g, { mode: "pan", lx: rest.x, ly: rest.y });
    }
  };

  // The wheel zooms where the pointer is; a trackpad's pinch arrives as a wheel with ctrl.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomBy(Math.exp(-step * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
      cam.current.follow = false;
      setHint(false);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const wardrobeOpenRef = useRef(false);
  useEffect(() => { wardrobeOpenRef.current = wardrobeOpen; }, [wardrobeOpen]);

  // For the test scripts (fc-cash-town's town-e2e and friends): where somebody
  // stands on the screen. Never in a production build.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      screenOf: (id: string) => {
        const stay = sessionRef.current;
        const a = id === me.id ? stay?.self : stay?.avatars.get(id);
        if (!a) return null;
        const p = project(a.pos);
        return { x: p.x, y: p.y - DOLL_H * cam.current.s * 0.5 };
      },
      cam: () => ({ s: cam.current.s, cx: cam.current.cx, cy: cam.current.cy, follow: cam.current.follow }),
    };
    (window as unknown as { __townView?: unknown }).__townView = handle;
    return () => { delete (window as unknown as { __townView?: unknown }).__townView; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { setCard(null); setPopover(null); setPeopleOpen(false); setHistoryOpen(false); return; }
      // Enter starts typing, as in a game; Esc in the box gives the keys back to walking.
      if (e.key === "Enter" && !(target && /^(BUTTON|A)$/.test(target.tagName))) {
        e.preventDefault();
        setChatOpen(true);
        window.setTimeout(() => chatRef.current?.focus(), 0);
        return;
      }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy(1.25); return; }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomBy(1 / 1.25); return; }
      if (e.key === "0") { e.preventDefault(); cam.current.follow = true; return; }
      const step = KEYS[e.key];
      const stay = sessionRef.current;
      if (!step || !stay || stay.closed) return;
      e.preventDefault();
      const a = stay.self;
      const from = a.path.length ? a.path[a.path.length - 1] : a.pos;
      const next = { x: Math.floor(from.x) + step[0], y: Math.floor(from.y) + step[1] };
      if (walkable(next.x, next.y) && stay.walkTo(next)) cam.current.follow = true;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomBy]);

  /* ── fullscreen and the wardrobe ─────────────────────────────────────── */
  const toggleImmersive = async () => {
    const el = stageRef.current;
    if (!immersive) {
      setImmersive(true);
      // The browser's own fullscreen where there is one (not on an iPhone);
      // the town covering the site's header and tab bar either way.
      try { await el?.requestFullscreen?.({ navigationUI: "hide" }); } catch { /* ours is enough */ }
    } else {
      setImmersive(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    }
  };

  const openWardrobe = () => {
    setCard(null); setPopover(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false);
    turn.current = 0;
    zoomBefore.current = cam.current.s;
    const v = cam.current;
    // Close to me, in the part of the screen the panel leaves.
    focus.current = phone ? { x: v.cw / 2, y: v.ch * 0.24 } : { x: (v.cw - 384) / 2, y: v.ch / 2 };
    setCam({ s: clampScale(WARDROBE_ZOOM, v.cw, v.ch), cx: v.cx, cy: v.cy });
    v.follow = true;
    setWardrobeOpen(true);
  };
  const closeWardrobe = () => {
    setWardrobeOpen(false);
    focus.current = null;
    const v = cam.current;
    if (zoomBefore.current !== null) setCam({ s: zoomBefore.current, cx: v.cx, cy: v.cy });
    zoomBefore.current = null;
    sessionRef.current?.settleLook();
  };

  /* ── what the panels show ────────────────────────────────────────────── */
  const left = !!session && session.closed;
  const status = s?.status ?? "connecting";
  const everReady = s?.everReady ?? false;
  const muted = !!s?.self.info.muted;
  const others = s ? s.people : [];
  // A banner only for what needs a person: the first wait, or a door that
  // will not open. Reconnecting is a pill; the town goes on meanwhile.
  const banner =
    left ? null
    : status === "connecting" && !everReady ? w.connecting
    : status === "needs-migration" ? w.needsMigration
    : status === "denied" ? w.denied
    : status === "full" ? w.full(s?.cap ?? cap)
    : status === "error" ? w.error
    : null;
  const live = status === "ready";
  const lines = stats.length;
  const linesUp = stats.filter((l) => l.state === "connected").length;
  const nameOf = (id: string) => s?.avatars.get(id)?.info.name ?? id.slice(0, 6);
  const micProblem = s?.micProblem === "denied" ? w.micDenied : s?.micProblem === "no-mic" ? w.noMic
    : s?.micProblem === "failed" ? w.micFailed : null;
  const recent = s ? s.chat.filter((l) => Date.now() - l.at < LOG_SHOWN_MS).slice(phone ? -3 : -5) : [];
  const myLook = s ? (decodeLook(s.self.info.look) ?? defaultLook(me.id)) : defaultLook(me.id);

  // The card's person, if they are still here.
  const cardWho = card && s ? (card.id === me.id ? s.self : s.avatars.get(card.id) ?? null) : null;
  const cardNote = (a: Avatar) => [
    a.info.voice ? (a.info.muted ? `🔇 ${w.mutedNote}` : `🎤 ${w.inVoice}`) : null,
    a.info.id !== me.id && a.info.away ? `📄 ${w.away}` : null,
  ].filter(Boolean).join(" · ");

  const walkOver = (a: Avatar) => {
    const stay = sessionRef.current;
    if (!stay) return;
    const tx = Math.floor(a.info.x), ty = Math.floor(a.info.y);
    const spots: Vec[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) spots.push({ x: tx + dx, y: ty + dy });
    spots.sort((p, q) => distance(p, stay.self.pos) - distance(q, stay.self.pos));
    for (const t of spots) if (walkable(t.x, t.y) && stay.walkTo(t)) { cam.current.follow = true; break; }
    setCard(null);
  };

  // Phones and the tab bar: the map runs under the bar, the controls stay above it.
  const tabbar = phone && !immersive;
  const hudBottom = tabbar ? "calc(4.5rem + env(safe-area-inset-bottom) + 0.75rem)" : "calc(env(safe-area-inset-bottom) + 0.75rem)";
  const chatBottom = lift > 40 ? `${lift + 8}px` : hudBottom;
  const hudBtn = "pressable grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-bg/80 text-read text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent";

  return (
    <div ref={stageRef}
         style={{ ["--hud-b" as string]: hudBottom }}
         className={`${immersive ? "fixed inset-0 z-[55]" : "fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[30]"} overflow-hidden overscroll-none bg-[#0b1016]`}>
      {/* The town: above the page (z-30), under the header (40) and the phone's
          tab bar (50); in fullscreen at 55, over both and under every dialog (60+). */}
      <canvas ref={canvasRef} role="img" aria-label={w.canvasLabel}
              className="absolute inset-0 touch-none select-none"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              onPointerLeave={() => { hover.current = null; }} />

      {/* Top left: where this is, whether we are connected, and who is here (a tap lists them) */}
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-11.5rem)] items-center gap-1.5">
        <button type="button" onClick={() => { setPeopleOpen((o) => !o); setCard(null); setStatsOpen(false); }}
                aria-expanded={peopleOpen} disabled={!s} aria-label={`Cash Town · ${w.peopleBtn(others.length + 1)}`}
                className="pressable pointer-events-auto flex h-10 min-w-0 items-center gap-2 rounded-full border border-line-strong bg-bg/80 px-3 shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${live ? "bg-jade" : "bg-gold"}`} />
          <span className="truncate font-display text-ui font-semibold text-ink">Cash Town</span>
          {!phone && <span className="font-data text-label uppercase tracking-wider text-accent">{w.beta}</span>}
          {testTopic && <span className="font-data text-label uppercase tracking-wider text-gold">dev</span>}
          <span className="shrink-0 text-ui text-muted">👥 {others.length + 1}</span>
        </button>
        {s && everReady && !live && (
          <span className="shrink-0 rounded-full bg-bg/80 px-2 py-0.5 text-label text-gold">◌ {w.reconnecting}</span>
        )}
        <span role="status" className="sr-only">{s && everReady ? (live ? w.online : w.reconnecting) : ""}</span>
      </div>

      {/* Top right: the wardrobe, the numbers, fullscreen, the way out */}
      {s && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <button type="button" onClick={() => (wardrobeOpen ? closeWardrobe() : openWardrobe())} aria-pressed={wardrobeOpen}
                  className={`pressable flex h-10 items-center gap-1.5 rounded-full border px-3 text-ui font-semibold shadow-lg shadow-black/30 backdrop-blur-sm transition-colors ${wardrobeOpen
                    ? "border-accent bg-accent/20 text-accent" : "border-line-strong bg-bg/80 text-ink hover:border-accent hover:text-accent"}`}>
            👕<span className={phone ? "sr-only" : ""}>{w.wardrobe}</span>
          </button>
          {!phone && (
            <button type="button" onClick={() => setStatsOpen((o) => !o)} aria-pressed={statsOpen} title={w.stats} className={hudBtn}>
              📊<span className="sr-only">{w.stats}</span>
            </button>
          )}
          <button type="button" onClick={() => void toggleImmersive()} aria-pressed={immersive}
                  title={immersive ? w.exitFullscreen : w.fullscreen} className={hudBtn}>
            {immersive ? "🗗" : "⛶"}<span className="sr-only">{immersive ? w.exitFullscreen : w.fullscreen}</span>
          </button>
          <button type="button" onClick={() => s.close()} title={w.leaveTown} className={hudBtn}>
            🚪<span className="sr-only">{w.leaveTown}</span>
          </button>
        </div>
      )}

      {/* Right edge: the zoom */}
      {s && !wardrobeOpen && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <button type="button" onClick={() => zoomBy(1.25)} title={w.zoomIn} className={hudBtn}>
            ＋<span className="sr-only">{w.zoomIn}</span>
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.25)} title={w.zoomOut} className={hudBtn}>
            －<span className="sr-only">{w.zoomOut}</span>
          </button>
          <button type="button" onClick={recenter} title={w.recenter} className={hudBtn}>
            ⌖<span className="sr-only">{w.recenter}</span>
          </button>
        </div>
      )}

      {/* Who is here: names only; a tap shows them on the map */}
      {s && peopleOpen && (
        <aside className="pop-in absolute left-3 top-14 z-10 flex max-h-[min(60%,26rem)] w-64 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line-lit bg-surface/95 text-ui shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
          <div className="border-b border-line px-3 py-2 font-data text-label uppercase tracking-wider text-muted">👥 {w.here} · {others.length + 1}</div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            <PersonRow name={`${me.name} (${w.you})`} voice={voiceOn} muted={muted} onClick={() => showPerson(me.id)} />
            {others.map((a) => {
              const p = a.info;
              const state = voiceOn && p.voice ? s.voice.connectionState(p.id) : null;
              const gain = PROXIMITY && voiceOn && p.voice ? hearing(distance(s.self.pos, a.pos)) : null;
              const voiceNote = state === "failed" ? `⚠️ ${w.iceFailed}`
                : state && state !== "connected" ? w.connectingVoice
                : gain !== null ? w.hearing(Math.round(gain * 100))
                : state === "connected" ? w.connected : null;
              return (
                <PersonRow key={p.id} name={p.name} voice={p.voice} muted={p.muted} away={p.away} onClick={() => showPerson(p.id)}
                  note={[voiceNote, p.away ? `📄 ${w.away}` : null].filter(Boolean).join(" · ") || undefined} />
              );
            })}
          </ul>
          <div className="border-t border-line px-3 py-2">
            <div className="font-data text-label uppercase tracking-wider text-muted">{w.places}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {BUILDINGS.map((b) => (
                <Link key={b.id} href={b.href} className="text-meta text-accent no-underline hover:underline">
                  {b.icon} {(w.th ? b.name.th : b.name.en).split(" · ")[0]}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* The stats: what the network is doing to each voice line */}
      {s && statsOpen && (
        <div className="absolute left-3 top-14 z-10 max-h-[40%] w-[min(30rem,calc(100%-1.5rem))] overflow-auto rounded-xl border border-line bg-bg/92 p-2 text-meta text-ink backdrop-blur-sm">
          <div className="mb-1 text-muted">{w.statsHead(others.length + 1, linesUp, lines, fpsRef.current)}</div>
          {stats.length === 0 ? <div className="text-muted">{w.statsNone}</div> : (
            <table className="w-full font-data">
              <thead className="text-muted">
                <tr>{w.statsCols.map((c) => <th key={c} className="px-1 text-left font-normal">{c}</th>)}</tr>
              </thead>
              <tbody>
                {stats.map((l) => (
                  <tr key={l.id}>
                    <td className="max-w-[8rem] truncate px-1">{nameOf(l.id)}</td>
                    <td className={`px-1 ${l.state === "connected" ? "text-jade" : "text-gold"}`}>{l.state}</td>
                    <td className="px-1">{l.rtt ?? "–"}</td>
                    <td className="px-1">{l.jitter ?? "–"}</td>
                    <td className={`px-1 ${(l.loss ?? 0) > 3 ? "text-chili" : ""}`}>{l.loss === null ? "–" : `${l.loss}%`}</td>
                    <td className="px-1">{l.kbpsIn ?? "–"}</td>
                    <td className="px-1">{l.path === "relay" ? w.relay : l.path === "direct" ? w.direct : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Somebody's card: their picture, and what they are up to */}
      {card && cardWho && (
        <div className="pop-in absolute z-10 w-60 rounded-2xl border border-line-lit bg-surface p-3 shadow-xl shadow-black/40" data-state="open"
             style={card.top - 130 > 56
               ? { left: Math.max(8, Math.min(card.x - 120, (cam.current.cw || 300) - 248)), top: card.top - 6, transform: "translateY(-100%)" }
               : { left: Math.max(8, Math.min(card.x - 120, (cam.current.cw || 300) - 248)), top: Math.min(card.bottom + 6, (cam.current.ch || 400) - 140) }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardWho.info.face || popotoArt.src} alt="" className="size-12 shrink-0 rounded-full border border-line-strong bg-card object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-read font-semibold text-ink">{cardWho.info.name}{card.id === me.id ? ` (${w.you})` : ""}</div>
              {cardNote(cardWho) && <div className="truncate text-meta text-muted">{cardNote(cardWho)}</div>}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {card.id === me.id ? (
              <button type="button" onClick={openWardrobe}
                      className="pressable rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25">👕 {w.wardrobe}</button>
            ) : (
              <button type="button" onClick={() => walkOver(cardWho)}
                      className="pressable rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25">🚶 {w.walkTo}</button>
            )}
            <button type="button" onClick={() => setCard(null)} className="ml-auto px-2 py-1.5 text-ui text-muted hover:text-ink">{w.close}</button>
          </div>
        </div>
      )}

      {/* A building's door */}
      {popover && (
        <div className="pop-in absolute z-10 w-56 rounded-2xl border border-line-lit bg-surface p-3 shadow-xl shadow-black/40" data-state="open"
             style={{ left: Math.max(8, Math.min(popover.x - 112, (cam.current.cw || 300) - 232)), top: Math.max(56, popover.y - 100) }}>
          <div className="text-read font-semibold text-ink">{popover.b.icon} {w.th ? popover.b.name.th : popover.b.name.en}</div>
          <div className="mt-2 flex items-center gap-2">
            <Link href={popover.b.href}
                  className="rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent no-underline hover:bg-accent/25">{w.go}</Link>
            <button type="button" onClick={() => setPopover(null)} className="ml-auto px-2 py-1.5 text-ui text-muted hover:text-ink">{w.close}</button>
          </div>
        </div>
      )}

      {/* Status */}
      {banner && (
        <div className="absolute inset-x-0 top-1/2 mx-auto w-fit max-w-[90%] -translate-y-1/2 rounded-xl border border-line bg-bg/90 px-4 py-3 text-center text-read text-ink">
          {banner}
        </div>
      )}

      {/* Left: the empty town behind, and the way back in */}
      {left && (
        <div className="absolute inset-x-0 top-1/2 mx-auto flex w-fit max-w-[90%] -translate-y-1/2 flex-col items-center gap-2 rounded-xl border border-line bg-bg/90 px-5 py-4 text-center">
          <div className="text-read text-ink">{w.left}</div>
          <button type="button" onClick={enter}
                  className="rounded-full bg-jade px-5 py-2 text-read font-semibold text-bg">
            {w.reenter}
          </button>
        </div>
      )}

      {/* How to play, until you have played */}
      {s && hint && !wardrobeOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit max-w-[90%] rounded-full bg-bg/80 px-3 py-1 text-center text-meta text-muted backdrop-blur-sm">
          {phone ? w.hintPhone : w.hintDesk}
        </div>
      )}

      {/* Bottom left: the chat. A slim bar on a wide screen, with its history a
          tap away; a button on a phone, opening the history and the box. While
          the history is shut, the last few lines show over the map. */}
      {s && !wardrobeOpen && (() => {
        const showHistory = phone ? chatOpen : historyOpen;
        // A phone's history fits between the top bar and the box over the keyboard.
        const screenH = visibleH || cam.current.ch;
        const room = phone ? Math.max(140, Math.min(screenH * 0.5, screenH - 150)) : undefined;
        const openHistory = () => {
          if (phone) { setChatOpen(true); window.setTimeout(() => chatRef.current?.focus(), 0); }
          else setHistoryOpen(true);
        };
        return (
          <div className="pointer-events-none absolute left-3 flex w-[min(26rem,calc(100%-1.5rem))] flex-col gap-1"
               style={{ bottom: chatOpen || !phone ? chatBottom : "var(--hud-b)" }}>
            {showHistory ? (
              <div className={`pop-in pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-line-lit bg-surface/95 shadow-xl shadow-black/40 backdrop-blur-sm ${phone ? "" : "max-h-[min(42vh,24rem)]"}`}
                   style={room ? { maxHeight: room } : undefined} data-state="open">
                <div className="flex items-center gap-2 border-b border-line py-1 pl-3 pr-1">
                  <span className="font-data text-label uppercase tracking-wider text-muted">💬 {w.history} · {s.chat.length}</span>
                  <button type="button" onClick={() => { if (phone) setChatOpen(false); else setHistoryOpen(false); }}
                          aria-label={w.historyClose} title={w.historyClose}
                          className="pressable ml-auto grid size-8 place-items-center rounded-full text-read text-muted hover:bg-card hover:text-ink">▾</button>
                </div>
                <ChatHistory lines={s.chat} th={w.th} className="min-h-0 flex-1" />
              </div>
            ) : recent.length > 0 && (
              <ul aria-label={w.chatLog} title={w.historyOpen}
                  className={`pointer-events-auto flex max-w-full cursor-pointer flex-col items-start gap-0.5 ${phone ? "max-w-[70%]" : ""}`}
                  onClick={openHistory}>
                {recent.map((l) => (
                  <li key={l.key} className="max-w-full truncate rounded-lg bg-bg/75 px-2 py-0.5 text-meta backdrop-blur-sm">
                    <span className={l.mine ? "text-gold" : "text-accent"}>{l.mine ? w.you : l.name}</span>
                    <span className="text-muted">: </span>
                    <span className="text-ink">{l.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {chatNote && <div role="status" className="w-fit rounded-full bg-bg/85 px-3 py-0.5 text-label text-gold">{chatNote}</div>}
            {phone && !chatOpen ? (
              <button type="button" onClick={openHistory}
                      aria-label={w.chat} className={`${hudBtn} pointer-events-auto size-11`}>💬</button>
            ) : (
              <form onSubmit={sendChat} className="pointer-events-auto flex w-full items-center gap-1.5">
                {!phone && (
                  <button type="button" onClick={() => setHistoryOpen((o) => !o)} aria-pressed={historyOpen}
                          title={historyOpen ? w.historyClose : w.history}
                          className={`pressable grid size-10 shrink-0 place-items-center rounded-full border backdrop-blur-sm transition-colors ${historyOpen
                            ? "border-accent bg-accent/20 text-accent" : "border-line-strong bg-bg/85 text-ink hover:border-accent"}`}>
                    🕘<span className="sr-only">{historyOpen ? w.historyClose : w.history}</span>
                  </button>
                )}
                <input ref={chatRef} value={draft} maxLength={600} enterKeyHint="send"
                       onChange={(e) => { setDraft(e.target.value); setChatNote(null); }}
                       onKeyDown={(e) => { if (e.key === "Escape") { e.currentTarget.blur(); setHistoryOpen(false); if (phone) setChatOpen(false); } }}
                       onBlur={(e) => {
                         // On a phone the open chat closes with the keyboard, unless the
                         // tap that took the focus was in the history (to scroll it).
                         const next = e.relatedTarget as HTMLElement | null;
                         if (phone && !draft && !next?.closest("[role=log]")) setChatOpen(false);
                       }}
                       placeholder={phone ? w.chatPlaceholderPhone : w.chatPlaceholder} aria-label={w.chatPlaceholderPhone}
                       className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-bg/85 px-4 text-read text-ink outline-none backdrop-blur-sm placeholder:text-muted focus:border-accent" />
                <button type="submit" className="pressable h-10 shrink-0 rounded-full bg-accent/25 px-4 text-ui font-semibold text-accent backdrop-blur-sm hover:bg-accent/35">
                  {w.send}
                </button>
              </form>
            )}
          </div>
        );
      })()}

      {/* Bottom right: the microphone */}
      {s && !wardrobeOpen && !(phone && chatOpen) && (
        <div className="absolute right-3 flex flex-col items-end gap-1.5" style={{ bottom: "var(--hud-b)" }}>
          {micProblem && <div className="max-w-[16rem] rounded-lg bg-chili/25 px-3 py-1.5 text-right text-ui text-ink backdrop-blur-sm">{micProblem}</div>}
          {voiceOn && s.voice.audioBlocked && (
            <button type="button" onClick={() => s.voice.resumeAudio()}
                    className="pressable rounded-full bg-gold px-4 py-2 text-ui font-semibold text-bg shadow-lg">
              {w.tapToHear}
            </button>
          )}
          {!voiceOn ? (
            <button type="button" onClick={() => void s.joinVoice()} disabled={!everReady || status === "full"}
                    title={w.joinLong}
                    className="pressable flex h-11 items-center gap-1.5 rounded-full bg-jade px-4 text-read font-semibold text-bg shadow-lg shadow-black/30 disabled:opacity-40">
              🎤 {w.join}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => s.leaveVoice()} title={w.leave}
                      className="pressable h-11 rounded-full border border-line-strong bg-bg/85 px-3 text-ui text-muted shadow-lg shadow-black/30 backdrop-blur-sm hover:text-ink">
                {w.leave}
              </button>
              <button type="button" onClick={() => s.toggleMute()} aria-pressed={muted}
                      aria-label={muted ? w.unmute : w.mute} title={muted ? w.unmute : w.mute}
                      className={`pressable grid size-12 place-items-center rounded-full text-lead shadow-lg shadow-black/30 ${muted ? "bg-chili text-ink" : "bg-jade text-bg"}`}>
                {muted ? "🔇" : "🎤"}
              </button>
            </div>
          )}
          {PROXIMITY && voiceOn && <div className="rounded-full bg-bg/70 px-3 py-1 text-meta text-muted">{w.near}</div>}
        </div>
      )}

      {/* The wardrobe: a panel at the side, or a sheet from the bottom on a phone */}
      {s && wardrobeOpen && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(62%,34rem)] rounded-t-2xl"
               : "right-3 top-16 w-[22rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open">
          <Wardrobe look={myLook} th={w.th}
                    onChange={(l) => s.setLook(l)}
                    onTurn={(d) => { turn.current += d; }}
                    onClose={closeWardrobe} />
        </div>
      )}
    </div>
  );
}

function PersonRow({ name, voice, muted, away, note, onClick }: {
  name: string; voice: boolean; muted: boolean; away?: boolean; note?: string; onClick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onClick}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card ${away ? "opacity-70" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ink">{name}</span>
          {note && <span className="block truncate text-label text-muted">{note}</span>}
        </span>
        {voice && <span aria-hidden className={muted ? "text-chili" : "text-jade"}>{muted ? "🔇" : "🎤"}</span>}
      </button>
    </li>
  );
}

/* ── small drawing helpers ──────────────────────────────────────────────── */

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
