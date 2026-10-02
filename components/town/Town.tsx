"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BENCHES, BOARD, BUILDINGS, FAR, FOUNTAIN, NEAR, PROPS, PROXIMITY, ROADWORKS, ROWS, COLS, SHOP, TILE_H, TILE_W, riverMiddle,
  benchAt, distance, fromIso, groundAt, hearing, toIso, walkable, type Building, type Facing, type Vec,
} from "@/lib/town/world";
import { clampCam, clampScale, startScale, toIsoPoint, toScreen, zoomAt, type Cam } from "@/lib/town/camera";
import { WALK_FPS, facingFor, loadPixelKit, type PixelKit, type View } from "@/lib/town/pixeldoll";
import { loadScenery, type SceneryKit } from "@/lib/town/scenery";
import { daylight, daylightAt } from "@/lib/town/daylight";
import { decodeLook, defaultLook, type Look } from "@/lib/town/look";
import { BUILDING, POLL, etaShort } from "@/lib/town/board";
import { alongRoute, outingsNow, presence, type Activity, type Outing } from "@/lib/town/popotos";
import { BIRDS, BUTTERFLIES, birdAt, butterflyAt, petsOf, rompsNow } from "@/lib/town/critters";
import { FINE, easeEffects, effectsOf, forcedWeather, readWeather, type Effects, type Weather } from "@/lib/town/weather";
import { createClient } from "@/lib/supabase/client";
import type { PeerInfo } from "@/lib/town/voice";
import type { Identity } from "@/lib/town/room";
import { resumable } from "@/lib/town/active";
import { BUBBLE_MS, wrapLines } from "@/lib/town/chat";
import { ROOM_CAP, openSession, type Avatar, type TownSession } from "@/lib/town/session";
import ChatHistory from "./ChatHistory";
import Wardrobe from "./Wardrobe";
import TownClock from "./TownClock";
import TownBoard from "./TownBoard";
import TownMusicButton from "./TownMusicButton";
import TownIcon, { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";

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
 * are pixel Lalafell (lib/town/pixeldoll), from one picture fetched once; profile
 * pictures are only in the card a tap on somebody opens.
 *
 * Positions live in the session and are drawn every frame; React state is
 * only what the panels around the canvas show, so a walking avatar never
 * re-renders the page.
 */

export type TownMe = Identity;

/** A doll's height on the map, unscaled: the top of the head to the feet (a picture pixel is a unit). */
const DOLL_H = 77;
/** How long a line stays in the log over the map. */
const LOG_SHOWN_MS = 120_000;
/** The river's moving parts, laid out once: streaks of current, glints, fish, and what drifts by. */
const STREAKS = Array.from({ length: 70 }, (_, i) => ({ t0: (i * 37.7) % 140, across: ((i * 0.618) % 1) * 2.4 - 1.2, speed: 0.9 + ((i * 0.37) % 1) * 0.6, len: 0.5 + ((i * 0.53) % 1) * 0.6 }));
const GLINTS = Array.from({ length: 36 }, (_, i) => ({ t: (i * 53.3) % 128, across: ((i * 0.414) % 1) * 2.4 - 1.2, ph: i * 1.7 }));
const FISH = Array.from({ length: 7 }, (_, i) => ({ t0: i * 21.4, across: ((i * 0.73) % 1) * 1.6 - 0.8, speed: 0.35 + (i % 3) * 0.12 }));
const DRIFT = [
  { name: "rv_leaf", k: 0.5 }, { name: "rv_lily", k: 0.55 }, { name: "rv_boat", k: 0.5 }, { name: "rv_leaf", k: 0.45 },
  { name: "rv_stick", k: 0.5 }, { name: "rv_duck", k: 0.48 }, { name: "rv_lily", k: 0.5 }, { name: "rv_leaf", k: 0.5 },
].map((d, i) => ({ ...d, t0: i * 21, across: ((i * 0.618) % 1) * 1.8 - 0.9, flip: i % 2 === 1 }));
/** Leaves blowing in fine weather, from the scenery picture: mostly green, some turning, a petal. */
const LEAVES = ["lf1", "lf1", "lf2", "lf2", "lf3", "lf4", "lf5", "lf6"];
/** Where puddles lie when it rains: a fixed scatter over the plaza and the paths near it. */
const PUDDLES: Vec[] = (() => {
  const out: Vec[] = [];
  let a = 7;
  const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  for (let tries = 0; tries < 4000 && out.length < 60; tries++) {
    const x = 18 + rnd() * 28, y = 18 + rnd() * 28, g = groundAt(Math.floor(x), Math.floor(y));
    if ((g === "road" || g === "plaza") && walkable(Math.floor(x), Math.floor(y))) out.push({ x, y });
  }
  return out;
})();
/** Props drawn a little smaller than their pictures, to sit within a tile. */
const PROP_K: Partial<Record<string, number>> = { bin: 0.75, flowerbed: 0.8, signpost: 0.85 };
/** Popoto are drawn smaller than their pictures: about half a Lalafell tall. */
const POPOTO_K = 0.78;
/** How long a blink lasts. */
const BLINK_MS = 130;
/** How far a press may move and still be a tap (CSS pixels). */
const SLOP_TOUCH = 10;
const SLOP_MOUSE = 4;
/** How close the wardrobe brings the camera. */
const WARDROBE_ZOOM = 2;

const GROUND: Record<ReturnType<typeof groundAt>, [string, string]> = {
  grass: ["#22382f", "#253d33"],
  road: ["#343a46", "#373e4b"],
  plaza: ["#3d4452", "#424a59"],
  water: ["#1d4a6b", "#205073"],
  sand: ["#6b5d43", "#706247"],
};

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1],
  ArrowRight: [1, -1], d: [1, -1], D: [1, -1],
  ArrowDown: [1, 1], s: [1, 1], S: [1, 1],
  ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1],
};

/** How far above a bench's ground point its seat is (a picture pixel is a unit). */
const SEAT_LIFT = 12;
/** A bench's facing, as the doll's view. */
const FACINGS: Record<Facing, { view: View; mirror: boolean }> = {
  SE: { view: "front", mirror: false }, SW: { view: "front", mirror: true },
  NE: { view: "back", mirror: false }, NW: { view: "back", mirror: true },
};

/** The wardrobe turns you through the town's four walking directions. */
const TURNS: Array<{ view: View; mirror: boolean }> = [
  { view: "front", mirror: false }, { view: "back", mirror: false },
  { view: "back", mirror: true }, { view: "front", mirror: true },
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
    tapToHear: th ? "แตะเพื่อฟังเสียง" : "Tap to hear",
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
  const kitRef = useRef<PixelKit | null>(null);
  const sceneryRef = useRef<SceneryKit | null>(null);
  /** The site's own popoto (components/ui/PopotoIcon), for signs drawn on the map. */
  const popotoImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.src = popotoArt.src; popotoImg.current = i; }, []);
  /** The town's icons (components/town/TownIcon), for badges drawn on the map. */
  const iconImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.src = ICON_ATLAS.image; iconImg.current = i; }, []);
  /** `next dev` only: ?townHour=21 shows the town at that hour; ?townPopoto=lunch brings that popoto out now. */
  const forcedHour = useRef<number | null>(null);
  const forcedPopoto = useRef<Activity | undefined>(undefined);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const q = new URLSearchParams(location.search);
    const h = Number(q.get("townHour"));
    if (Number.isFinite(h) && q.has("townHour")) forcedHour.current = h;
    const p = q.get("townPopoto");
    if (p && ["rush", "lunch", "football", "badminton", "tired"].includes(p)) forcedPopoto.current = p as Activity;
  }, []);
  /** The Popoto Board on the screen, for taps; and whether it waits for my vote (a "!" over it). */
  const boardBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const boardNews = useRef(false);
  useEffect(() => {
    if (testTopic) return;
    const supabase = createClient();
    if (!supabase) return;
    let gone = false;
    // One small read on the way in; nothing is flagged if it fails.
    void supabase.rpc("town_my_vote", { p_poll: POLL }).then(({ data, error }) => {
      if (!gone && !error) boardNews.current = data === null;
    });
    return () => { gone = true; };
  }, [testTopic]);
  /**
   * Bangkok's weather (lib/town/weather), asked of our own cached route every
   * ten minutes while the page shows; `next dev`'s ?townWeather=rain forces one.
   */
  const weather = useRef<Weather>(FINE);
  const effects = useRef<Effects>(effectsOf(FINE));
  /** Leaves in the air: where over the map (tiles), how high (unscaled pixels), and how they fall. */
  const leaves = useRef<Array<{ x: number; y: number; h: number; ph: number; k: number; art: string; flutter: number; landed: number }>>([]);
  const drops = useRef<Array<{ x: number; y: number; v: number }>>([]);
  useEffect(() => {
    const forced = process.env.NODE_ENV === "production" ? null : forcedWeather(new URLSearchParams(location.search).get("townWeather"));
    if (forced) { weather.current = forced; effects.current = effectsOf(forced); return; }
    let gone = false;
    const ask = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const w = readWeather(await (await fetch("/api/town/weather")).json());
        if (!gone && w) weather.current = w;
      } catch { /* fine weather it is */ }
    };
    void ask();
    const t = setInterval(() => void ask(), 10 * 60_000);
    return () => { gone = true; clearInterval(t); };
  }, []);
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
  const [boardOpen, setBoardOpen] = useState(false);
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
    loadPixelKit().then((k) => { if (alive) kitRef.current = k; }).catch(() => { /* simple figures until a reload */ });
    // The ground, trees and fountain in pixel art, the same way; plain shapes until they come.
    loadScenery().then((k) => { if (alive) sceneryRef.current = k; }).catch(() => { /* plain shapes until a reload */ });
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
    if (r === "sent") { setDraft(""); setChatNote(null); s.setTyping(false); }
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

  /**
   * Morning, noon, evening and night by the real clock (lib/town/daylight):
   * everything drawn so far is multiplied by the sky's tint, and from dusk the
   * lamps throw a warm light on the lanterns and the ground under them. In
   * `next dev`, `?townHour=21` shows any hour.
   */
  /** A point on the river: `t` how far down it (x + y), `across` from its middle. */
  function riverPoint(t: number, across: number): Vec {
    const m = riverMiddle(t - 1) + across;
    return { x: (t - m) / 2, y: (t + m) / 2 };
  }

  /**
   * The river (the owner's call, 2026-10-02: "ให้เหมือนว่าน้ำไหล มีของลอยมาตามน้ำ
   * แบบ random หรือไม่ก็ปลาที่ว่ายน้ำมา"): streaks of current running down it,
   * glints, fish in the shallows and now and then a koi leaping, and things
   * drifting past, a leaf, a lily pad, a paper boat, a stick, a rubber duck.
   * All of it by the wall clock, so everybody sees the same duck go by.
   */
  function drawRiver(ctx: CanvasRenderingContext2D, scenery: SceneryKit, dpr: number) {
    const s = cam.current.s, still = reducedRef.current, sec = still ? 0 : Date.now() / 1000;
    ctx.save();
    // the current
    ctx.lineWidth = Math.max(1, s);
    ctx.lineCap = "round";
    for (const r of STREAKS) {
      const t = ((r.t0 + sec * r.speed) % 140) - 6;
      const a = project(riverPoint(t, r.across));
      if (!onScreen(a)) continue;
      const b = project(riverPoint(t + r.len, r.across));
      ctx.strokeStyle = `rgba(225,242,255,${0.16 + 0.14 * Math.sin(sec * 1.3 + r.t0)})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // glints
    for (const g of GLINTS) {
      const c = project(riverPoint(g.t, g.across));
      if (!onScreen(c)) continue;
      const k = Math.pow(Math.max(0, Math.sin(sec * 1.7 + g.ph)), 6);
      if (k < 0.05) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.8 * k})`;
      const z = Math.max(1, s * 1.5);
      ctx.fillRect(c.x - z * 1.5, c.y - z / 2, z * 3, z);
      ctx.fillRect(c.x - z / 2, c.y - z * 1.5, z, z * 3);
    }
    // fish in the shallows: dark shapes nosing upstream, their tails going
    for (const f of FISH) {
      const t = 140 - (((f.t0 + sec * f.speed) % 150) + 5);
      const across = f.across + 0.25 * Math.sin(sec * 0.6 + f.t0);
      const c = project(riverPoint(t, across));
      if (!onScreen(c)) continue;
      const ahead = project(riverPoint(t - 0.4, across)), ang = Math.atan2(ahead.y - c.y, ahead.x - c.x);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(20,40,60,0.28)";
      ctx.beginPath(); ctx.ellipse(0, 0, 7 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill();
      const wag = Math.sin(sec * 9 + f.t0) * 2 * s;
      ctx.beginPath(); ctx.moveTo(-6 * s, 0); ctx.lineTo(-11 * s, -3 * s + wag); ctx.lineTo(-11 * s, 3 * s + wag); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (still) return;
    // things drifting down
    for (const d of DRIFT) {
      const t = ((d.t0 + sec * 0.32) % 170) - 15;
      const p = riverPoint(t, d.across + 0.15 * Math.sin(sec * 0.4 + d.t0));
      const c = project(p);
      if (!onScreen(c)) continue;
      const bob = Math.sin(sec * 2 + d.t0) * 1.2 * s;
      scenery.drawProp(ctx, d.name, c.x, c.y + bob, s * d.k, dpr, 0, d.flip);
    }
    // now and then a koi leaps: up out of the water and back in, with a ring where it went
    const every = 23, n = Math.floor(sec / every), into = sec - n * every;
    if (into < 1.4) {
      const r = (x: number) => { const v = Math.sin((n + 1) * 12.9898 * x) * 43758.5453; return v - Math.floor(v); };
      const t = 20 + r(1) * 100, across = (r(2) - 0.5) * 1.6;
      const c = project(riverPoint(t, across)), c2 = project(riverPoint(t + 1.2, across));
      if (onScreen(c)) {
        const k = Math.min(1, into / 0.9);
        if (into < 0.9) {
          const x = c.x + (c2.x - c.x) * k, y = c.y + (c2.y - c.y) * k - Math.sin(Math.PI * k) * 26 * s;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((k - 0.5) * 1.4);
          scenery.drawProp(ctx, "rv_koi", 0, 23 * s * 0.5, s * 0.5, dpr);
          ctx.restore();
        }
        for (const [at, from] of [[c, 0], [c2, 0.9]] as const) {
          const q = (into - from) / 0.5;
          if (q < 0 || q > 1) continue;
          ctx.strokeStyle = `rgba(235,245,255,${0.7 * (1 - q)})`;
          ctx.lineWidth = Math.max(1, s);
          ctx.beginPath(); ctx.ellipse(at.x, at.y, (4 + 10 * q) * s, (2 + 5 * q) * s, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }

  /**
   * Birds in the trees and in the air, butterflies round the flowers, a cat or
   * a dog out for a run (lib/town/critters): none of them in the rain; birds
   * and butterflies by day, dogs till the evening, cats whenever they like.
   */
  function drawLife(things: Array<{ depth: number; draw: () => void }>, scenery: SceneryKit, dpr: number, now: number) {
    const v = cam.current, s = v.s, wall = Date.now(), still = reducedRef.current;
    const e = effects.current;
    if (e.rain > 0.1) return;
    const phase = (forcedHour.current !== null ? daylightAt(forcedHour.current * 60) : daylight()).phase;
    const day = phase !== "night" && phase !== "evening";
    const sunny = phase === "morning" || phase === "noon" || phase === "afternoon";
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const [, treeH] = scenery.sizeOf("tree"), [, pineH] = scenery.sizeOf("pine");
    if (day) for (let i = 0; i < BIRDS; i++) {
      const b = birdAt(i, wall);
      if (!b) continue;
      const ground = project(b.pos);
      const up = b.lift * 0.78 * (b.lift >= 1 ? pineH : treeH) * s;
      const c = { x: ground.x, y: ground.y - up };
      if (!onScreen(c)) continue;
      const name = b.flying ? ["bird_up", "bird_mid", "bird_down", "bird_mid"][Math.floor((still ? 0 : now) / 90) % 4]
        : ["bird_sit", "bird_look", "bird_peck"][b.pose];
      // perched just in front of its tree; flying, over everything
      things.push({ depth: b.flying ? 1e6 : b.pos.x + b.pos.y - 0.11, draw: () => scenery.drawProp(ctx, name, c.x, c.y, s * 0.5, dpr, 0, !b.right) });
    }
    if (sunny) for (let i = 0; i < BUTTERFLIES; i++) {
      const f = butterflyAt(i, wall);
      if (!f) continue;
      const g = project(f.pos), c = { x: g.x, y: g.y - f.height * s };
      if (!onScreen(c)) continue;
      const frame = [1, 2, 3, 2][Math.floor((still ? 0 : now) / 70 + i) % 4];
      things.push({ depth: f.pos.x + f.pos.y, draw: () => scenery.drawProp(ctx, `${f.yellow ? "bfy" : "bfb"}${frame}`, c.x, c.y, s * 0.5, dpr) });
    }
    if (still) return;
    for (const r of rompsNow(wall)) for (const p of petsOf(r, wall)) {
      if (p.pet === "dog" && !day && phase !== "evening") continue;
      const c = project(p.pos);
      if (!onScreen(c)) continue;
      const name = p.running ? `${p.pet}${1 + (Math.floor(now / 85) % 4)}`
        : p.pet === "cat" ? (Math.floor(wall / 2500) % 3 === 2 ? "cat_lick" : "cat_sit") : (Math.floor(wall / 2200) % 3 === 2 ? "dog_tilt" : "dog_sit");
      things.push({ depth: p.pos.x + p.pos.y, draw: () => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        scenery.drawProp(ctx, name, c.x, c.y, s * (p.pet === "cat" ? 0.55 : 0.6), dpr, 0, !p.right);
        ctx.restore();
      } });
    }
  }

  /** How far a tree, a pine or a bush leans in the wind now: a steady lean and a sway of its own. */
  function swayOf(p: { kind: string; x: number; y: number }, now: number): number {
    if (reducedRef.current || (p.kind !== "tree" && p.kind !== "pine" && p.kind !== "bush")) return 0;
    const w = effects.current.wind, ph = (p.x * 12.9898 + p.y * 78.233) % (Math.PI * 2);
    const amp = p.kind === "bush" ? 0.035 : 0.06;
    return w * (amp * 0.5 + amp * Math.sin(now / (900 - 300 * w) + ph) * (0.6 + 0.4 * Math.sin(now / 2300 + ph * 2)));
  }

  /**
   * The weather over the town: wet ground and puddles in rain, falling rain,
   * leaves blowing in fine weather, grey light and mist. Nothing moves for
   * somebody who asked for reduced motion; the wet look stays.
   */
  function drawWeather(ctx: CanvasRenderingContext2D, cw: number, ch: number, now: number, dt: number) {
    const e = effects.current = easeEffects(effects.current, effectsOf(weather.current), Math.min(dt, 100));
    const still = reducedRef.current, s = cam.current.s;
    ctx.save();
    // wet: darker, bluer, and puddles on the paths and the plaza that catch the light
    if (e.wet > 0.02) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(150,166,192,${0.42 * e.wet})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "source-over";
      for (const [i, p] of PUDDLES.entries()) {
        const c = project(p);
        if (!onScreen(c)) continue;
        const r = (10 + (i % 4) * 4) * s;
        ctx.fillStyle = `rgba(150,185,220,${0.3 * e.wet})`;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(235,245,255,${0.35 * e.wet})`;
        ctx.fillRect(c.x - r * 0.4, c.y - r * 0.12, r * 0.5, Math.max(1, s));
        // rings where the rain lands in it
        if (!still && e.rain > 0.05) {
          const k = ((now + i * 377) % 1100) / 1100;
          ctx.strokeStyle = `rgba(225,240,255,${0.5 * e.rain * (1 - k)})`;
          ctx.lineWidth = Math.max(1, s * 0.8);
          ctx.beginPath();
          ctx.ellipse(c.x + ((i * 7) % 5 - 2) * s, c.y, r * 0.8 * k, r * 0.36 * k, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    // grey light under cloud and rain, and mist
    if (e.dim > 0.01) {
      ctx.globalCompositeOperation = "multiply";
      const g = Math.round(255 * (1 - e.dim));
      ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 12)})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "source-over";
    }
    if (e.haze > 0.01) {
      ctx.fillStyle = `rgba(220,226,232,${e.haze})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (!still) {
      const sec = Math.min(dt, 100) / 1000, slant = 0.12 + 0.5 * e.wind;
      // rain: thin streaks falling at a slant with the wind
      const want = Math.round(e.rain * (cw * ch) / 2600);
      const D = drops.current;
      while (D.length < want) D.push({ x: Math.random() * (cw + 200) - 100, y: Math.random() * ch, v: 700 + Math.random() * 500 });
      if (D.length > want) D.length = want;
      if (D.length) {
        ctx.strokeStyle = `rgba(205,220,240,${0.35 + 0.25 * e.rain})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of D) {
          d.y += d.v * sec; d.x += d.v * slant * sec;
          if (d.y > ch) { d.y = -20; d.x = Math.random() * (cw + 200) - 200; }
          if (d.x > cw + 20) d.x -= cw + 220;
          const len = 12 + d.v / 90;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - len * slant, d.y - len);
        }
        ctx.stroke();
      }
      // Leaves on the breeze, in the town itself (not on the screen): each has a place
      // over the map and a height, drifts with the wind, rocks and turns over as it
      // falls, settles on the ground and fades; new ones blow in from the windward side.
      const scenery = sceneryRef.current, dpr = window.devicePixelRatio || 1, v = cam.current;
      const world = (sx: number, sy: number) => { const iso = toIsoPoint(v, sx, sy, cw, ch); return fromIso(iso.x, iso.y); };
      const L = leaves.current, n = scenery?.has("lf1") ? Math.round(e.leaves * 20 * Math.min(1.5, (cw * ch) / (1280 * 800))) : 0;
      const spawn = (anywhere: boolean) => {
        // anywhere in view to begin with; after that, in from the left (where the wind comes from) or above
        const sx = anywhere ? Math.random() * cw : Math.random() < 0.6 ? -30 : Math.random() * cw;
        const sy = anywhere ? Math.random() * ch : sx < 0 ? Math.random() * ch : -30;
        const p = world(sx, sy + 70 * v.s);
        return { x: p.x, y: p.y, h: 50 + Math.random() * 60, ph: Math.random() * 6.28, k: 0.36 + Math.random() * 0.12,
          art: LEAVES[Math.floor(Math.random() * LEAVES.length)], flutter: 0.6 + Math.random() * 0.8, landed: 0 };
      };
      while (L.length < n) L.push(spawn(true));
      if (L.length > n) L.length = n;
      for (let i = 0; i < L.length; i++) {
        const l = L[i];
        const t = now / 1000 * l.flutter + l.ph;
        // a pendulum's sway along the wind, falling faster at the bottom of each swing
        const swing = Math.sin(t * 1.6);
        if (l.landed) l.landed += sec;
        else {
          // the wind blows to the right of the screen: one way along x, the other along y
          const go = ((30 + 120 * e.wind) * (0.75 + 0.25 * Math.sin(l.ph)) + swing * 35) * sec / TILE_W;
          l.x += go; l.y -= go;
          l.h -= (8 + 14 * (1 - Math.abs(swing))) * sec;
          if (l.h <= 0) { l.h = 0; l.landed = sec; }
        }
        const g = project({ x: l.x, y: l.y }), c = { x: g.x, y: g.y - l.h * v.s };
        // gone: settled a while, or blown well off the screen
        if (l.landed > 2.5 || c.x > cw + 80 || c.y > ch + 120 || c.x < -160 || c.y < -160) { L[i] = spawn(false); continue; }
        const fade = l.landed ? Math.max(0, 1 - l.landed / 2.5) : Math.min(1, (c.x + 30) / 50, (c.y + 30) / 50);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(Math.round(c.x), Math.round(c.y));
        if (!l.landed) {
          ctx.rotate(swing * 0.55);
          // turning over: squashed one way, then the other, never to nothing
          const flip = Math.cos(t * 0.9);
          ctx.scale(Math.sign(flip || 1) * (0.35 + 0.65 * Math.abs(flip)), 1);
        } else ctx.scale(1, 0.6);
        scenery!.drawProp(ctx, l.art, 0, 0, v.s * l.k, dpr);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawDaylight(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const day = forcedHour.current !== null ? daylightAt(forcedHour.current * 60) : daylight();
    const [r, g, b] = day.tint;
    if (r < 255 || g < 255 || b < 255) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
    if (day.lamps < 0.02) return;
    const s = cam.current.s;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of PROPS) {
      if (p.kind !== "lamp") continue;
      const base = project({ x: p.x + 0.5, y: p.y + 0.62 });
      if (!onScreen(base)) continue;
      const lantern = { x: base.x, y: base.y - 78 * s };
      const glow = ctx.createRadialGradient(lantern.x, lantern.y, 0, lantern.x, lantern.y, 44 * s);
      glow.addColorStop(0, `rgba(255,196,120,${0.55 * day.lamps})`);
      glow.addColorStop(1, "rgba(255,196,120,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lantern.x - 44 * s, lantern.y - 44 * s, 88 * s, 88 * s);
      // a pool of light on the ground
      ctx.save();
      ctx.translate(base.x, base.y);
      ctx.scale(1, 0.5);
      const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 70 * s);
      pool.addColorStop(0, `rgba(255,180,100,${0.22 * day.lamps})`);
      pool.addColorStop(1, "rgba(255,180,100,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(-70 * s, -70 * s, 140 * s, 140 * s);
      ctx.restore();
    }
    ctx.restore();
  }

  /** Whether a point is near enough the screen to be worth drawing (props are culled; there are hundreds). */
  function onScreen(p: Vec): boolean {
    const { cw, ch, s } = cam.current;
    return p.x > -160 * s && p.x < cw + 160 * s && p.y > -60 * s && p.y < ch + 200 * s;
  }

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

    // The ground: the pixel-art picture of it, or plain tiles until it has come.
    const scenery = sceneryRef.current;
    if (scenery) {
      scenery.drawGround(ctx, v, cw, ch, dpr);
      // Flowers lie flat: under whoever walks over them.
      for (const p of PROPS) {
        if (p.kind !== "flowers") continue;
        const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
        if (onScreen(c)) scenery.drawProp(ctx, "flowers", c.x, c.y, v.s, dpr);
      }
    } else for (let y = 0; y < ROWS; y++) {
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

    // The river flowing, and what floats and swims in it.
    if (scenery) drawRiver(ctx, scenery, dpr);

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
    for (const p of PROPS) {
      if (p.kind === "flowers") continue;
      const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
      if (!onScreen(c)) continue;
      things.push({ depth: p.x + p.y + 1, draw: () => {
        if (p.kind === "bench" && scenery) {
          // drawn facing down-right (front) and up-right (back); mirrored for the left
          const back = p.facing === "NE" || p.facing === "NW", mirror = p.facing === "SW" || p.facing === "NW";
          scenery.drawProp(ctx, back ? "bench_back" : "bench", c.x, c.y, v.s, dpr, 0, mirror);
        } else if (scenery?.has(p.kind)) scenery.drawProp(ctx, p.kind, c.x, c.y, v.s * (PROP_K[p.kind] ?? 1), dpr, 0, false, swayOf(p, now));
        else if (p.kind === "tree" || p.kind === "pine") drawTree(ctx, p);
      } });
    }
    // Popoto Shop, being built: the site, and popoto workers at it.
    if (scenery?.has("shop1")) {
      const corner = project({ x: SHOP.x + SHOP.w - 0.1, y: SHOP.y + SHOP.h - 0.1 });
      things.push({ depth: SHOP.x + SHOP.y + SHOP.w + SHOP.h - 1, draw: () => {
        scenery.drawProp(ctx, "shop1", corner.x, corner.y, v.s, dpr);
        const t = reducedRef.current ? 0 : now;
        // one hammering on the floor boards
        const h = project({ x: SHOP.x + 1.1, y: SHOP.y + 2.2 });
        scenery.drawProp(ctx, `pw_h${[1, 2, 3, 2][Math.floor(t / 210) % 4]}`, h.x, h.y, v.s, dpr);
        // one carrying a plank across the site and back
        const k = (t / 3200) % 2, along = k < 1 ? k : 2 - k;
        const w = project({ x: SHOP.x + 0.6 + along * 1.6, y: SHOP.y + 0.9 });
        scenery.drawProp(ctx, `pw_c${[1, 2, 3, 2][Math.floor(t / 170) % 4]}`, w.x, w.y, v.s, dpr, 0, k >= 1);
        const top = project({ x: SHOP.x + SHOP.w / 2, y: SHOP.y + SHOP.h / 2 });
        signs.push(() => label(ctx, `Popoto Shop · ${words.current.th ? "กำลังสร้าง" : "being built"}`, top.x, top.y - 70 * v.s,
          "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      } });
    }
    // The Popoto Board: the town's news and its vote, standing north of the fountain.
    boardBox.current = null;
    if (scenery?.has("board")) {
      const feet = project({ x: BOARD.x + BOARD.w * 0.8, y: BOARD.y + BOARD.h * 0.8 });
      things.push({ depth: BOARD.x + BOARD.y + BOARD.w + BOARD.h - 1, draw: () => {
        scenery.drawProp(ctx, "board", feet.x, feet.y, v.s, dpr);
        // The news, written on its paper (too small to read when far off)
        if (v.s >= 1.1) {
          const th = words.current.th;
          ctx.save();
          ctx.translate(feet.x, feet.y);
          ctx.scale(v.s, v.s);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#5b3b22";
          ctx.font = `800 7.5px ${fontRef.current}`;
          ctx.fillText("Popoto Shop", 8, -67);
          ctx.font = `600 6px ${fontRef.current}`;
          ctx.fillText(th ? "กำลังสร้าง" : "being built", 8, -58);
          ctx.fillText(etaShort(BUILDING, new Date(wall), th), 8, -50);
          ctx.restore();
        }
        const [w, h] = scenery.sizeOf("board");
        boardBox.current = { x0: feet.x - (w / 2) * v.s, y0: feet.y - h * v.s, x1: feet.x + (w / 2) * v.s, y1: feet.y };
        const y = feet.y - (h + 12) * v.s;
        signs.push(() => {
          label(ctx, "Popoto Board", feet.x, y, "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current);
          if (!boardNews.current) return;
          // not voted yet: a small "!" bobbing beside the sign
          const bob = reducedRef.current ? 0 : Math.sin(now / 260) * 2.5;
          ctx.beginPath();
          ctx.arc(feet.x + 62, y - 9 + bob, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#e5cc80";
          ctx.fill();
          ctx.font = `800 11px ${fontRef.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#151a22";
          ctx.fillText("!", feet.x + 62, y - 8.5 + bob);
        });
      } });
    }
    // Road works closing the north and east paths, a popoto waving its flag at each.
    if (scenery?.has("roadworks")) for (const w of ROADWORKS) {
      const c = project({ x: w.x, y: w.y + 0.2 });
      if (!onScreen(c)) continue;
      const flag = w.arm === "N" ? project({ x: w.x + 1.5, y: 1.85 }) : project({ x: 62.15, y: w.y + 1.5 });
      things.push({ depth: w.x + w.y + 0.2, draw: () => {
        scenery.drawProp(ctx, "roadworks", c.x, c.y, v.s, dpr, 0, w.arm === "E");
        signs.push(() => label(ctx, words.current.th ? "กำลังซ่อมทางเดิน" : "Path under repair", c.x, c.y - 150 * v.s,
          "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      } });
      const t = reducedRef.current ? 0 : now;
      things.push({ depth: w.arm === "N" ? w.x + 1.5 + 1.85 : 62.15 + w.y + 1.5, draw: () =>
        scenery.drawProp(ctx, `pf${[1, 2, 3, 2][Math.floor(t / 260) % 4]}`, flag.x, flag.y, v.s * POPOTO_K, dpr, 0, w.arm === "E") });
    }
    // Birds, butterflies, cats and dogs (lib/town/critters), when the sky suits them.
    if (scenery?.has("bird_sit")) drawLife(things, scenery, dpr, now);
    // Popoto out and about, as the hour suits (lib/town/popotos): the same on every screen.
    if (scenery?.has("pr1")) for (const o of outingsNow(wall, forcedPopoto.current)) drawOuting(o, things);
    things.push({ depth: FOUNTAIN.x + FOUNTAIN.y + 2, draw: () => {
      // the basin's front edge on the bottom corner of its two-by-two tiles
      const c = project({ x: FOUNTAIN.x + FOUNTAIN.w - 0.12, y: FOUNTAIN.y + FOUNTAIN.h - 0.12 });
      if (scenery?.has("fountain")) scenery.drawProp(ctx, "fountain", c.x, c.y, v.s, dpr, reducedRef.current ? 0 : now);
      else drawFountain(ctx, now);
    } });
    if (stay) {
      for (const a of stay.avatars.values()) {
        if (a.byeAt !== undefined) continue;
        things.push({ depth: depthOf(a), draw: () => drawAvatar(ctx, a, false, names, boxes, !live, wall, now, dpr) });
      }
    }
    if (mine) things.push({ depth: depthOf(mine), draw: () => drawAvatar(ctx, mine, true, names, boxes, false, wall, now, dpr) });
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    // The weather (lib/town/weather), then the time of day: the town multiplied by the
    // sky's colour, then the lamps' light.
    drawWeather(ctx, cw, ch, now, dt);
    drawDaylight(ctx, cw, ch);
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

  /** The bench somebody is sitting on (not just walking away from it), if any. */
  function seatOf(a: Avatar) {
    const i = a.info.sit ?? -1;
    return i >= 0 && !a.path.length ? BENCHES[i] : undefined;
  }

  /** Where somebody is drawn in the back-to-front order. */
  function depthOf(a: Avatar): number {
    const b = seatOf(a);
    if (!b) return a.pos.x + a.pos.y;
    return b.x + b.y + 1 + (b.facing === "NE" || b.facing === "NW" ? -0.01 : 0.01);
  }

  /** On screen: the seat of the bench they sit on, or where they stand. */
  function spotOf(a: Avatar): Vec {
    const b = seatOf(a);
    if (!b) return project(a.pos);
    const c = project({ x: b.x + 0.5, y: b.y + 0.62 });
    return { x: c.x, y: c.y - SEAT_LIFT * cam.current.s };
  }

  /** Which way somebody faces: the way they walk; after standing a while, towards you. */
  function facingOf(a: Avatar, isMe: boolean, now: number): { view: View; mirror: boolean } {
    if (isMe && wardrobeOpenRef.current) return TURNS[((turn.current % TURNS.length) + TURNS.length) % TURNS.length];
    const seat = seatOf(a);
    if (seat?.facing) return FACINGS[seat.facing];
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
    if (!f) return { view: "front", mirror: false };
    // Standing still for a few seconds: turn towards the viewer, like an idle pose.
    if (!a.path.length && now - f.at > 4000) return { view: "front", mirror: f.mirror };
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
    const p = spotOf(a);
    const k = v.s;
    const h = DOLL_H * k;
    const voice = sessionRef.current?.voice;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const talking = a.info.voice && !a.info.muted && level > 0.06;
    // On another page of the site: still here, still talking, not watching.
    const away = !isMe && a.info.away;
    const moving = a.path.length > 0;
    const kit = kitRef.current;
    // The dolls' steps carry their own bounce; the stand-in figure bobs.
    const bob = !kit && moving && !reducedRef.current ? Math.abs(Math.sin(now / 1000 * Math.PI * 2.4)) * 3.2 * k : 0;
    ctx.save();
    if (faded) ctx.globalAlpha = 0.4;
    else if (away) ctx.globalAlpha = 0.6;

    // A shadow (not on a bench: the bench has the ground), and a ring at the feet while they speak.
    if (!seatOf(a)) {
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 15 * k, 6 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (talking) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (17 + level * 8) * k, (7 + level * 3) * k, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(79,184,168,${0.45 + level * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

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
    const talk = talking && Math.floor(now / 150) % 2 === 1;
    if (kit) {
      // Everybody on their own foot: a step offset from their id.
      const step = moving ? Math.floor(now / 1000 * WALK_FPS) + (a.info.id.charCodeAt(0) & 3) : undefined;
      kit.draw(ctx, look, face.view, face.mirror, p.x, p.y, k, { step, blink, talk, sit: !!seatOf(a) }, dpr);
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
      drawIcon(ctx, iconImg.current, a.info.muted ? "muted" : "mic", bx, by, 11);
    }
    // Looking at another page.
    if (away) {
      const bx = p.x - h * 0.34, by = p.y - h * 0.86 - bob;
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#36414f";
      ctx.fill();
      drawIcon(ctx, iconImg.current, "away", bx, by, 11);
    }
    ctx.restore();

    boxes.push({ id: a.info.id, x0: p.x - h * 0.38, y0: top, x1: p.x + h * 0.38, y1: p.y + 22 });
    const name = isMe ? `${a.info.name} (${words.current.you})` : a.info.name;
    const said = a.said && wall - a.said.at < BUBBLE_MS ? a.said : null;
    const typing = !said && (isMe ? !!a.info.typing : !!sessionRef.current?.isTyping(a));
    names.push(() => {
      ctx.save();
      if (faded || away) ctx.globalAlpha = 0.6;
      label(ctx, name, p.x, p.y + 13, isMe ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.78)");
      ctx.restore();
      // What they just typed, over their head; it fades in its last moment.
      if (said) bubble(ctx, said.text, p.x, top - 2, Math.min(1, (BUBBLE_MS - (wall - said.at)) / 800));
      else if (typing) dots(ctx, p.x, top - 2, now);
    });
  }

  /** "…" over somebody typing: a small bubble, its three dots rising one after another. */
  function dots(ctx: CanvasRenderingContext2D, x: number, bottom: number, now: number) {
    const w = 38, h = 20, top = bottom - h - 6;
    ctx.save();
    ctx.fillStyle = "rgba(227,232,239,0.96)";
    roundRect(ctx, x - w / 2, top, w, h, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, top + h - 1);
    ctx.lineTo(x, top + h + 5);
    ctx.lineTo(x + 5, top + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0f1319";
    for (let i = 0; i < 3; i++) {
      const lift = reducedRef.current ? 0 : Math.max(0, Math.sin(now / 160 - i * 0.9)) * 3;
      ctx.beginPath();
      ctx.arc(x - 9 + i * 9, top + h / 2 - lift, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  /**
   * A popoto outing (lib/town/popotos), pushed into the frame's back-to-front
   * list. Everything moves by the wall clock, so a ball kicked on one screen
   * is in the air on everybody's.
   */
  function drawOuting(o: Outing, things: Array<{ depth: number; draw: () => void }>) {
    const scenery = sceneryRef.current, v = cam.current, ctx = canvasRef.current?.getContext("2d");
    if (!scenery || !ctx) return;
    const wall = Date.now(), still = reducedRef.current, dpr = window.devicePixelRatio || 1;
    // reduced motion: only the picnic, sitting still
    if (still && o.activity !== "lunch") return;
    const alpha = presence(o, wall), t = still ? 0 : wall - o.start, k = v.s * POPOTO_K;
    const put = (name: string, at: { x: number; y: number }, mirror: boolean, lift = 0) => {
      const c = project(at);
      if (!onScreen(c)) return;
      things.push({ depth: at.x + at.y, draw: () => {
        ctx.save();
        ctx.globalAlpha = alpha;
        scenery.drawProp(ctx, name, c.x, c.y - lift * v.s, k, dpr, 0, mirror);
        ctx.restore();
      } });
    };
    if (o.route) {
      const at = alongRoute(o, wall);
      if (!at) return;
      // drawn facing right; mirrored when heading left on the screen
      const left = at.dir.x - at.dir.y < 0;
      const name = o.activity === "rush" ? `pr${1 + (Math.floor(t / 90) % 4)}` : `pt${[1, 2, 3, 2][Math.floor(t / 320) % 4]}`;
      put(name, at.pos, left);
      return;
    }
    const spots = o.spots ?? [];
    if (o.activity === "lunch") {
      put(`pe${[1, 1, 2, 3, 3, 2][Math.floor(t / 380) % 6]}`, spots[0], false);
      return;
    }
    // two playing: the one on the left faces right, the other is mirrored; the ball or the
    // shuttlecock goes from one to the other and back, hit as it arrives
    const [a, b] = spots, football = o.activity === "football", period = football ? 2400 : 2800;
    const phase = (t % period) / period, toB = phase < 0.5, k2 = (phase % 0.5) * 2;
    const swing = (mine: boolean) => {
      // ms since this one last hit it, and until it next does
      const since = ((t + (mine ? 0 : period / 2)) % period), until = period - since;
      const n = football ? "pk" : "pb";
      return since < 260 ? `${n}3` : until < 340 ? `${n}2` : `${n}1`;
    };
    put(swing(true), a, false);
    put(swing(false), b, true);
    const from = toB ? a : b, to = toB ? b : a, reach = football ? 0.45 : 0.6;
    const dx = Math.sign(to.x - from.x) * reach;
    const p = { x: from.x + dx + (to.x - from.x - 2 * dx) * k2, y: from.y + 0.02 };
    const lift = football ? 4 + 10 * Math.sin(Math.PI * k2) : 30 + 70 * Math.sin(Math.PI * k2);
    put(football ? "ball" : "shuttle", p, !toB, lift);
  }

  /** A sign over the map: text in a pill, with a small picture before it if given (the site's popoto). */
  function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fg: string, bg: string, icon?: HTMLImageElement | null) {
    ctx.font = `600 12px ${fontRef.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(text).width, iw = icon?.complete && icon.naturalWidth ? 18 : 0;
    const w = tw + 14 + iw;
    ctx.fillStyle = bg;
    roundRect(ctx, x - w / 2, y - 10, w, 20, 10);
    ctx.fill();
    if (iw) ctx.drawImage(icon!, x - w / 2 + 5, y - 8, 16, 16);
    ctx.fillStyle = fg;
    ctx.fillText(text, x + iw / 2, y + 0.5);
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
    const bb = boardBox.current;
    if (bb && x >= bb.x0 && x <= bb.x1 && y >= bb.y0 && y <= bb.y1) { setPopover(null); openBoard(); return; }
    setPopover(null);
    setPeopleOpen(false);
    const t = tileAt(x, y);
    if (walkable(t.x, t.y) && sessionRef.current?.walkTo(t)) cam.current.follow = true;
    // A bench: walk up to it and sit down.
    else if (benchAt(t.x, t.y) >= 0 && sessionRef.current?.sitOn(benchAt(t.x, t.y))) cam.current.follow = true;
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
      /** Look at a tile without walking there (the camera stops following me). */
      lookAt: (x: number, y: number) => { const p = toIso(x, y); cam.current.follow = false; setCam({ s: cam.current.s, cx: p.x, cy: p.y }); },
      /** The popoto out now: what, and where. */
      outings: () => outingsNow(Date.now(), forcedPopoto.current).map((o) => ({ activity: o.activity, at: o.spots?.[0] ?? alongRoute(o, Date.now())?.pos })),
      /** The Popoto Board's middle on the screen, if it is drawn. */
      board: () => (boardBox.current ? { x: (boardBox.current.x0 + boardBox.current.x1) / 2, y: (boardBox.current.y0 + boardBox.current.y1) / 2 } : null),
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

  const openBoard = () => {
    if (wardrobeOpenRef.current) closeWardrobe();
    setCard(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false);
    setBoardOpen(true);
  };

  const openWardrobe = () => {
    setCard(null); setPopover(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setBoardOpen(false);
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

  const onVoted = useCallback((choice: number | null) => { boardNews.current = choice === null; }, []);
  const boardArt = useCallback((name: string) => sceneryRef.current?.sprite(name) ?? null, []);

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
  const cardNote = (a: Avatar) => noted([
    a.info.voice ? (a.info.muted ? ["muted", w.mutedNote] : ["mic", w.inVoice]) : null,
    a.info.id !== me.id && a.info.away ? ["away", w.away] : null,
  ]);

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
          <span className="flex shrink-0 items-center gap-1 text-ui text-muted"><TownIcon name="people" size={16} />{others.length + 1}</span>
        </button>
        <TownClock th={w.th} compact={phone} />
        {s && everReady && !live && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-bg/80 px-2 py-0.5 text-label text-gold"><TownIcon name="signal" size={13} className="animate-pulse" />{w.reconnecting}</span>
        )}
        <span role="status" className="sr-only">{s && everReady ? (live ? w.online : w.reconnecting) : ""}</span>
      </div>

      {/* Top right: the wardrobe, the numbers, fullscreen, the way out */}
      {s && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <button type="button" onClick={() => (wardrobeOpen ? closeWardrobe() : openWardrobe())} aria-pressed={wardrobeOpen}
                  className={`pressable flex h-10 items-center gap-1.5 rounded-full border px-3 text-ui font-semibold shadow-lg shadow-black/30 backdrop-blur-sm transition-colors ${wardrobeOpen
                    ? "border-accent bg-accent/20 text-accent" : "border-line-strong bg-bg/80 text-ink hover:border-accent hover:text-accent"}`}>
            <TownIcon name="wardrobe" size={20} /><span className={phone ? "sr-only" : ""}>{w.wardrobe}</span>
          </button>
          <TownMusicButton th={w.th} hour={forcedHour.current} className={hudBtn} />
          {!phone && (
            <button type="button" onClick={() => setStatsOpen((o) => !o)} aria-pressed={statsOpen} title={w.stats} className={hudBtn}>
              <TownIcon name="stats" size={20} /><span className="sr-only">{w.stats}</span>
            </button>
          )}
          <button type="button" onClick={() => void toggleImmersive()} aria-pressed={immersive}
                  title={immersive ? w.exitFullscreen : w.fullscreen} className={hudBtn}>
            <TownIcon name={immersive ? "exitFullscreen" : "fullscreen"} size={18} /><span className="sr-only">{immersive ? w.exitFullscreen : w.fullscreen}</span>
          </button>
          <button type="button" onClick={() => s.close()} title={w.leaveTown} className={hudBtn}>
            <TownIcon name="leave" size={20} /><span className="sr-only">{w.leaveTown}</span>
          </button>
        </div>
      )}

      {/* Right edge: the zoom */}
      {s && !wardrobeOpen && !boardOpen && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <button type="button" onClick={() => zoomBy(1.25)} title={w.zoomIn} className={hudBtn}>
            <TownIcon name="zoomIn" size={20} /><span className="sr-only">{w.zoomIn}</span>
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.25)} title={w.zoomOut} className={hudBtn}>
            <TownIcon name="zoomOut" size={20} /><span className="sr-only">{w.zoomOut}</span>
          </button>
          <button type="button" onClick={recenter} title={w.recenter} className={hudBtn}>
            <TownIcon name="recenter" size={20} /><span className="sr-only">{w.recenter}</span>
          </button>
        </div>
      )}

      {/* Who is here: names only; a tap shows them on the map */}
      {s && peopleOpen && (
        <aside className="pop-in absolute left-3 top-14 z-10 flex max-h-[min(60%,26rem)] w-64 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line-lit bg-surface/95 text-ui shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
          <div className="border-b border-line px-3 py-2 font-data text-label uppercase tracking-wider text-muted"><span className="flex items-center gap-1.5"><TownIcon name="people" size={15} />{w.here} · {others.length + 1}</span></div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            <PersonRow name={`${me.name} (${w.you})`} voice={voiceOn} muted={muted} onClick={() => showPerson(me.id)} />
            {others.map((a) => {
              const p = a.info;
              const state = voiceOn && p.voice ? s.voice.connectionState(p.id) : null;
              const gain = PROXIMITY && voiceOn && p.voice ? hearing(distance(s.self.pos, a.pos)) : null;
              const voiceNote: Note = state === "failed" ? ["warning", w.iceFailed]
                : state && state !== "connected" ? w.connectingVoice
                : gain !== null ? w.hearing(Math.round(gain * 100))
                : state === "connected" ? w.connected : null;
              const note = noted([voiceNote, p.away ? ["away", w.away] : null]);
              return (
                <PersonRow key={p.id} name={p.name} voice={p.voice} muted={p.muted} away={p.away} onClick={() => showPerson(p.id)}
                  note={note ?? undefined} />
              );
            })}
          </ul>
          {BUILDINGS.length > 0 && <div className="border-t border-line px-3 py-2">
            <div className="font-data text-label uppercase tracking-wider text-muted">{w.places}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {BUILDINGS.map((b) => (
                <Link key={b.id} href={b.href} className="text-meta text-accent no-underline hover:underline">
                  {b.icon} {(w.th ? b.name.th : b.name.en).split(" · ")[0]}
                </Link>
              ))}
            </div>
          </div>}
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
                      className="pressable rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25"><span className="flex items-center gap-1.5"><TownIcon name="wardrobe" size={16} />{w.wardrobe}</span></button>
            ) : (
              <button type="button" onClick={() => walkOver(cardWho)}
                      className="pressable rounded-lg bg-accent/15 px-3 py-1.5 text-ui text-accent hover:bg-accent/25"><span className="flex items-center gap-1.5"><TownIcon name="walk" size={16} />{w.walkTo}</span></button>
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
      {s && hint && !wardrobeOpen && !boardOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit max-w-[90%] rounded-full bg-bg/80 px-3 py-1 text-center text-meta text-muted backdrop-blur-sm">
          {phone ? w.hintPhone : w.hintDesk}
        </div>
      )}

      {/* Bottom left: the chat. A slim bar on a wide screen, with its history a
          tap away; a button on a phone, opening the history and the box. While
          the history is shut, the last few lines show over the map. */}
      {s && !wardrobeOpen && !(phone && boardOpen) && (() => {
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
                  <span className="font-data text-label uppercase tracking-wider text-muted"><span className="flex items-center gap-1.5"><TownIcon name="chat" size={14} />{w.history} · {s.chat.length}</span></span>
                  <button type="button" onClick={() => { if (phone) setChatOpen(false); else setHistoryOpen(false); }}
                          aria-label={w.historyClose} title={w.historyClose}
                          className="pressable ml-auto grid size-8 place-items-center rounded-full text-read text-muted hover:bg-card hover:text-ink"><TownIcon name="chevron" size={14} /></button>
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
                      aria-label={w.chat} className={`${hudBtn} pointer-events-auto size-11`}><TownIcon name="chat" size={22} /></button>
            ) : (
              <form onSubmit={sendChat} className="pointer-events-auto flex w-full items-center gap-1.5">
                {!phone && (
                  <button type="button" onClick={() => setHistoryOpen((o) => !o)} aria-pressed={historyOpen}
                          title={historyOpen ? w.historyClose : w.history}
                          className={`pressable grid size-10 shrink-0 place-items-center rounded-full border backdrop-blur-sm transition-colors ${historyOpen
                            ? "border-accent bg-accent/20 text-accent" : "border-line-strong bg-bg/85 text-ink hover:border-accent"}`}>
                    <TownIcon name="history" size={20} /><span className="sr-only">{historyOpen ? w.historyClose : w.history}</span>
                  </button>
                )}
                <input ref={chatRef} value={draft} maxLength={600} enterKeyHint="send"
                       onChange={(e) => { setDraft(e.target.value); setChatNote(null); s.setTyping(e.target.value.trim().length > 0); }}
                       onKeyDown={(e) => { if (e.key === "Escape") { e.currentTarget.blur(); setHistoryOpen(false); if (phone) setChatOpen(false); } }}
                       onBlur={(e) => {
                         s.setTyping(false);
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
      {s && !wardrobeOpen && !(phone && (chatOpen || boardOpen)) && (
        <div className="absolute right-3 flex flex-col items-end gap-1.5" style={{ bottom: "var(--hud-b)" }}>
          {micProblem && <div className="max-w-[16rem] rounded-lg bg-chili/25 px-3 py-1.5 text-right text-ui text-ink backdrop-blur-sm">{micProblem}</div>}
          {voiceOn && s.voice.audioBlocked && (
            <button type="button" onClick={() => s.voice.resumeAudio()}
                    className="pressable flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-ui font-semibold text-bg shadow-lg">
              <TownIcon name="speaker" size={18} />{w.tapToHear}
            </button>
          )}
          {!voiceOn ? (
            <button type="button" onClick={() => void s.joinVoice()} disabled={!everReady || status === "full"}
                    title={w.joinLong}
                    className="pressable flex h-11 items-center gap-1.5 rounded-full bg-jade px-4 text-read font-semibold text-bg shadow-lg shadow-black/30 disabled:opacity-40">
              <TownIcon name="mic" size={20} />{w.join}
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
                <TownIcon name={muted ? "muted" : "mic"} size={24} />
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
      {/* The Popoto Board: where the wardrobe goes */}
      {s && boardOpen && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(62%,34rem)] rounded-t-2xl"
               : "right-3 top-16 w-[22rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open">
          <TownBoard th={w.th} onClose={() => setBoardOpen(false)} onVoted={onVoted} art={boardArt} />
        </div>
      )}
    </div>
  );
}

/** A line of notes, each with its icon: "🎤 in voice · 📄 on another page", drawn in the town's own icons. */
type Note = [IconName, string] | string | null;
function noted(notes: Note[]): React.ReactNode {
  const kept = notes.filter((n): n is Exclude<Note, null> => !!n);
  if (!kept.length) return null;
  return kept.map((n, i) => (
    <span key={i} className="inline-flex items-center gap-1 align-middle">
      {i > 0 && <span className="mx-0.5">·</span>}
      {typeof n === "string" ? n : <><TownIcon name={n[0]} size={13} />{n[1]}</>}
    </span>
  ));
}

function PersonRow({ name, voice, muted, away, note, onClick }: {
  name: string; voice: boolean; muted: boolean; away?: boolean; note?: React.ReactNode; onClick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onClick}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card ${away ? "opacity-70" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ink">{name}</span>
          {note && <span className="block truncate text-label text-muted">{note}</span>}
        </span>
        {voice && <TownIcon name={muted ? "muted" : "mic"} size={16} />}
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
