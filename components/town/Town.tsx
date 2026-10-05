"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BENCHES, BEYOND_PROPS, BOARD, BUILDINGS, CAMP, FAR, FARM, FARM_PROPS, FOREST_PROPS, FOUNTAIN, GATES, GREAT_TREE, WATERFALL, KEEPERS, KITCHEN, NEAR, PIER, PROPS, PROXIMITY, ROADWORKS, ROWS, COLS, SHOP, SIT_HERE, TILE_H, TILE_W, YARD_SEATS, riverMiddle,
  atFire, atWell, benchAt, distance, fishFrom, fromIso, isBuilt, setBuilt, groundAt, hearing, onYard, placeOf, plotAt, toIso, walkable, yardPlace, yardSeat, type Building, type Facing, type Fishing, type Keeper, type Place, type Prop, type Vec,
} from "@/lib/town/world";
import { BOUNDS, START_DESK, clampCam, clampScale, startScale, toIsoPoint, toScreen, zoomAt, type Cam } from "@/lib/town/camera";
import { PACE, keepFps, keptFps, nap, paceOf, paced, wokenFor, type Fps } from "@/lib/town/pace";
import { PUDDLE_SIZES, RING_MS, Rain, ageOf, drawPicture, puddleRing, puddleRingsFor, puddlesFor, ringsFor, type Pictures } from "@/lib/town/rain";
import { keepMotion, keptMotion } from "@/lib/town/motion";
import { askFor, chatFor, talkFor, type Line, type Speaker } from "@/lib/town/talk";
import { WALK_FPS, facingFor, loadPixelKit, type PixelKit, type View } from "@/lib/town/pixeldoll";
import { loadForest, loadScenery, type SceneryKit } from "@/lib/town/scenery";
import { bangkokMinute, daylight, daylightAt, overcast, sunOf } from "@/lib/town/daylight";
import { SHAPES as CLOUD_SHAPES, cloudBlobs, cloudsAt } from "@/lib/town/clouds";
import { SKINS, decodeLook, defaultLook, type Look } from "@/lib/town/look";
import { BUILDING, POLL, etaShort } from "@/lib/town/board";
import { alongRoute, outingsNow, presence, type Activity, type Outing } from "@/lib/town/popotos";
import { BIRDS, BUTTERFLIES, birdAt, butterflyAt, petsOf, rompsNow } from "@/lib/town/critters";
import { SKIES } from "@/lib/town/skies";
import { FINE, effectsOf, forcedWeather, readWeather, type Effects } from "@/lib/town/weather";
import { createClient } from "@/lib/supabase/client";
import type { PeerInfo } from "@/lib/town/voice";
import type { Identity } from "@/lib/town/room";
import { resumable } from "@/lib/town/active";
import { BUBBLE_MS, wrapLines } from "@/lib/town/chat";
import { ROOM_CAP, openSession, type Avatar, type TownSession } from "@/lib/town/session";
import { DbKeeper, type Ask, type Keeper as GameKeeper, type Looked } from "@/lib/town/keeper";
import ChatHistory from "./ChatHistory";
import Wardrobe from "./Wardrobe";
import TownClock from "./TownClock";
import { RANK_TITLES } from "@/lib/town/well";
import TownBoard from "./TownBoard";
import TownTalk, { type TalkChoice } from "./TownTalk";
import type { TradeSummary, TradeView } from "./TownTrade";
import type { FarmDraw } from "./TownFarm";
import type { Standing } from "./TownCook";
import type { Stander } from "./TownLine";
import type { OpenDeal } from "./TownDeal";
import type { FishPlace, LineState } from "./TownFish";
import type { DishId, ItemId } from "@/lib/town/items";
import { isRod, type RodId } from "@/lib/town/gear";
import { FishSfx, heard } from "@/lib/town/sfx";
import TownMusicButton from "./TownMusicButton";
import TownSettingsButton from "./TownSettingsButton";
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
/**
 * The town's game: the uncle's stall, the banker's counter, the bag, fishing, the farm, the kitchen, deals. Its
 * panels are asked for only when a keeper says the game is open to whoever is here (lib/town/keeper): the database's
 * for a member, and in `next dev`'s test room the browser's own trial (the owner, 2026-10-03: "ลองในเบราว์เซอร์ก่อน").
 * Until then the shopkeepers say they are not open yet, and none of this is loaded.
 *
 * The test window is the trial's, and for `next dev` only (the owner: "ปุ่ม test ใช้ได้เฉพาะใน DEV เท่านั้น"): its import,
 * and the trial's own, sit in a branch a production build drops. Look at the build's chunks before this is pushed,
 * to see that it did.
 */
const TownTrade = lazy(() => import("./TownTrade"));
/** Fishing from the finished deck, and a recipe unrolled to be read: of the same game, and loaded the same way. */
const TownFish = lazy(() => import("./TownFish"));
const TownTest = process.env.NODE_ENV !== "production" ? lazy(() => import("./TownTest")) : null;
const TownFarm = lazy(() => import("./TownFarm"));
const TownForest = lazy(() => import("./TownForest"));
const TownBugs = lazy(() => import("./TownBugs"));
const TownWell = lazy(() => import("./TownWell"));
const TownThanks = lazy(() => import("./TownThanks"));
const TownLine = lazy(() => import("./TownLine"));
const TownCook = lazy(() => import("./TownCook"));
const TownDeal = lazy(() => import("./TownDeal"));
const TownScroll = lazy(() => import("./TownScroll"));
const TownFountain = lazy(() => import("./TownFountain"));
/** What a nudge from the room may be about (lib/town/keeper's Looked). */
const NUDGES: readonly string[] = ["stall", "farm", "kitchen", "deal", "fountain", "notices", "bugs", "line"];
/** The colour a carrier's rank is written in under their name (lib/town/well): wood, silver, gold. */
const RANK_INK = ["#e0a66a", "#d5dce3", "#f2c94c"];
/** How near somebody has to stand for a deal to be opened with them, in tiles: lib/town/deal's own number, kept apart so that the catalog stays out of the map's code (a test holds the two together). */
const DEAL_NEAR = 3;
/** How near somebody sits to be eating with me, in tiles. */
const EAT_NEAR = 3;
/** The river's moving parts, laid out once: streaks of current, glints, fish, and what drifts by. */
const STREAKS = Array.from({ length: 120 }, (_, i) => ({ t0: (i * 37.7) % 140, across: ((i * 0.618) % 1) * 5.6 - 2.8, speed: 0.9 + ((i * 0.37) % 1) * 0.6, len: 0.5 + ((i * 0.53) % 1) * 0.6 }));
const GLINTS = Array.from({ length: 60 }, (_, i) => ({ t: (i * 53.3) % 128, across: ((i * 0.414) % 1) * 5.6 - 2.8, ph: i * 1.7 }));
const FISH = Array.from({ length: 10 }, (_, i) => ({ t0: i * 21.4, across: ((i * 0.73) % 1) * 4.4 - 2.2, speed: 0.35 + (i % 3) * 0.12 }));
const DRIFT = [
  { name: "rv_leaf", k: 0.5 }, { name: "rv_lily", k: 0.55 }, { name: "rv_boat", k: 0.5 }, { name: "rv_leaf", k: 0.45 },
  { name: "rv_stick", k: 0.5 }, { name: "rv_duck", k: 0.48 }, { name: "rv_lily", k: 0.5 }, { name: "rv_leaf", k: 0.5 },
].map((d, i) => ({ ...d, t0: i * 21, across: ((i * 0.618) % 1) * 4.4 - 2.2, flip: i % 2 === 1 }));
/** Leaves blowing in fine weather, from the scenery picture: mostly green, some turning, a petal. */
const LEAVES = ["lf1", "lf1", "lf2", "lf2", "lf3", "lf4", "lf5", "lf6"];
/** The most leaves at once, falling, blowing and lying together. */
const LEAVES_MOST = 60;
/** The trees leaves fall from (pines keep theirs). */
const LEAF_TREES = PROPS.filter((p) => p.kind === "tree");
/**
 * A leaf: dropped from a tree ("fall"), on the steady wind ("wind"), or brought by a gust and gone with it
 * ("gust"). Where over the map (tiles), how high (unscaled pixels), its own rhythm, and once down, how long
 * it has lain (seconds) against how long it will.
 */
type Leaf = {
  kind: "fall" | "wind" | "gust"; x: number; y: number; h: number; ph: number; k: number; art: string;
  flutter: number; landed: number; rest: number; speed: number; spin: number; born?: number;
};
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
/** What the mouse cursor shows: the arrow, the pointing hand, a bench to sit on, the fist while dragging. */
type CursorMode = "arrow" | "hand" | "sit" | "grab";
/** Each bench prop's place in BENCHES (a tap sits on it by that number). */
const benchIndex = new Map(BENCHES.map((b, i) => [b, i]));
/** How tall somebody sitting is against standing, for their name and the box a tap finds them in. */
const SIT_HEIGHT = 0.72;
/** How each rod is drawn in the hand: its cane, the joints along it, its grip, its dark edge, and its reel if it has one. */
const ROD_LOOKS: Record<RodId, { cane: string; joint: string; grip: string; edge: string; reel?: string }> = {
  rod: { cane: "#e0ba72", joint: "#a67a38", grip: "#8a5a2b", edge: "#3d2913" },
  rodTeak: { cane: "#a0683a", joint: "#7a4a24", grip: "#56331a", edge: "#2a180b", reel: "#c9a45c" },
  rodMaster: { cane: "#3b3138", joint: "#c0392b", grip: "#e5cc80", edge: "#141014", reel: "#f1d06b" },
};
/** How long a bite of a meal takes, the morsel going up and the chewing after it, in milliseconds. */
const BITE_MS = 2600;
/** Props drawn a little smaller than their pictures, to sit within a tile. */
const PROP_K: Partial<Record<string, number>> = {
  bin: 0.75, flowerbed: 0.8, signpost: 0.85, well: 0.75, shed: 0.9, scarecrow: 0.7, hay: 0.8,
  // (the forest's two great things are drawn larger than their pictures: the tree over its three tiles by three, the cliff along the back of its pool)
  greattree: 1.7, waterfall: 1.6,
};
/** What the forest's own trees and rocks are drawn as until its picture has come (lib/town/scenery's loadForest): the town's. */
const FOREST_STAND_IN: Partial<Record<string, string>> = { oak: "tree", birch: "tree", bamboo: "pine", boulder: "rock" };
/** How long before the forest's picture is asked for again, when it did not come. */
const FOREST_AGAIN_MS = 30_000;
/** What leans in the wind: the town's trees and bushes, and the forest's. */
const SWAYS = ["tree", "pine", "bush", "oak", "birch", "bamboo"];
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
  field: ["#4a3d2f", "#4f4232"],
  sand: ["#6b5d43", "#706247"],
  wood: ["#1f3027", "#22342b"],
};

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [-1, -1], w: [-1, -1], W: [-1, -1],
  ArrowRight: [1, -1], d: [1, -1], D: [1, -1],
  ArrowDown: [1, 1], s: [1, 1], S: [1, 1],
  ArrowLeft: [-1, 1], a: [-1, 1], A: [-1, 1],
};

/** How far above a bench's ground point its seat is (a picture pixel is a unit). */
const SEAT_LIFT = 12;
/** A log by the forest camp's fire is lower than a bench. */
const LOG_LIFT = 7;
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
    emote: th ? "ท่าทาง" : "Emotes",
    sitDown: th ? "นั่งลง" : "Sit down",
    standUp: th ? "ลุกขึ้น" : "Stand up",
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
  /** Which map I am on (lib/town/world's places): the camera stays inside it. And when I last went through a gate: the other map comes up out of the dark. */
  const placeRef = useRef<Place>("town");
  const warpedAt = useRef(-1e9);
  /** When the forest's picture was last asked for (the frame's clock), and whether it has come. */
  const forestAsked = useRef(-1e9);
  const forestHere = useRef(false);
  const hover = useRef<Building | null>(null);
  const fontRef = useRef("sans-serif");
  const fpsRef = useRef(0);
  /** How many frames a second the map is held to (lib/town/pace): what the drawing reads, every frame. */
  const paceRef = useRef<number>(PACE.most);
  /** What it is drawn at just now: the pace chosen, or fewer while nobody is at it (lib/town/pace's paceOf). */
  const paceNowRef = useRef<number>(PACE.most);
  /** Whether the settings' panel is open: the map does not rest while somebody reads there what it draws at. */
  const settingsOpenRef = useRef(false);
  /**
   * Whether the town stands still: what the drawing reads, every frame. The settings' choice (lib/town/motion), and
   * not the machine's word on motion, which this was until 2026-10-04: the town moves for everybody until they turn
   * it off.
   */
  const reducedRef = useRef(false);
  /** When it was made to stand still: the moment its birds and butterflies are kept at. */
  const stillAt = useRef(0);
  /** The dolls' pictures, one per race, each fetched the first time somebody of that race is drawn. */
  const kits = useRef(new Map<number, PixelKit>());
  const kitFor = (race: number): PixelKit | null => {
    const k = kits.current.get(race);
    if (k) return k;
    if (!asked.current.has(race)) {
      asked.current.add(race);
      loadPixelKit(race).then((got) => { kits.current.set(race, got); }).catch(() => { asked.current.delete(race); });
    }
    return null;
  };
  const asked = useRef(new Set<number>());
  /** How tall somebody's doll stands, in picture pixels (the Lalafell's picture does not say: 77). */
  const dollH = (a: Avatar | undefined) => {
    if (!a) return DOLL_H;
    const look = lookOf(a);
    return kits.current.get(look.race)?.heightOf(look) ?? DOLL_H;
  };
  const sceneryRef = useRef<SceneryKit | null>(null);
  /** The site's own popoto (components/ui/PopotoIcon), for signs drawn on the map. */
  const popotoImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => { const i = new Image(); i.src = popotoArt.src; popotoImg.current = i; }, []);
  /**
   * The town's own mouse cursor (the owner's call, 2026-10-02: "skin cursor mouse ... เป็น animation มีหลาย frame"):
   * browsers will not animate a cursor picture, so over the map the system's is hidden and this one is drawn
   * last in every frame: an arrow whose sparkle twinkles, a hand that taps over what can be clicked (pressing
   * as it clicks), a fist while dragging the map. A mouse only: fingers have no cursor.
   */
  const mouse = useRef<{ x: number; y: number; mode: CursorMode; inside: boolean; pressAt: number } | null>(null);
  /**
   * The benches on the screen, as drawn this frame: a tap anywhere on a bench's picture (not just the tile under
   * it) walks there and sits down (the owner, 2026-10-02: "กดนั่งยากไปหน่อย"), the front one when they overlap.
   */
  const benchBoxes = useRef<Array<{ i: number; x0: number; y0: number; x1: number; y1: number; depth: number }>>([]);
  /**
   * How much of the cooking yard's roof is on, 0 to 1: all of it for whoever is outside, none for whoever has stepped
   * in (the owner, 2026-10-03: "ลานทำอาหาร จะกลายเป้น view แบบนี้เมื่อเดินเข้าไปแล้วเท่านั้น ถ้าอยู่ด้านนอกจะเห้นเป็นอาคาร มองไม่เห้นข้างใน").
   */
  const roofRef = useRef(1);
  /** The roof as the last frame drew it (none at all where there is no house to draw), for the lights that follow it. */
  const roofSeen = useRef(0);
  const benchUnder = (x: number, y: number) => {
    let best: { i: number; depth: number } | null = null;
    for (const b of benchBoxes.current) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && (!best || b.depth > best.depth)) best = b;
    return best ? best.i : -1;
  };
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
  /** Where the fountain's picture is on the screen: a tap on it opens the wishing panel, once the game is open. */
  const fountainBox = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  /** The shopkeepers and the gateways on the screen this frame, for taps and the cursor: who, or the tile a gateway leads to. */
  const keeperBoxes = useRef<Array<{ id: Keeper["id"]; x0: number; y0: number; x1: number; y1: number }>>([]);
  const gateBoxes = useRef<Array<{ to: [number, number]; x0: number; y0: number; x1: number; y1: number }>>([]);
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
   * Bangkok's weather, as everybody has it (lib/town/weather, lib/town/skies): the database's quarter hours, asked
   * for every few minutes while the page shows, and drawn by the database's clock, so that every page draws the same
   * weather at the same moment, a change of it included. When the quarter hours to come are nearly due the site is
   * asked to write them (app/api/town/weather). Where the database has no weather to give, the one answer of the
   * old way is held; `next dev`'s ?townWeather=rain forces one.
   */
  const effects = useRef<Effects>(effectsOf(FINE));
  /** Leaves in the air and on the ground: where over the map (tiles), how high (unscaled pixels), and how they move. */
  const leaves = useRef<Leaf[]>([]);
  /** The wind's gusts: when the last one came, when the next will, and how hard it blows now (0 to 1). */
  const gust = useRef({ at: -1e9, next: 0, strength: 0 });
  /** Rain in the air: its streaks on sheets drawn once and laid over the screen each frame (lib/town/rain). */
  const rain = useRef(new Rain());
  /** Rain landing: a ring on the ground at a tile, and when it began. */
  const splashes = useRef<Array<{ x: number; y: number; at: number }>>([]);
  /** What the rain leaves on the ground, as small pictures made for the zoom the map is at: the rings where it lands, the puddles, the rings in them. */
  const wetArt = useRef<{ landed: Pictures | null; pools: Pictures | null; rings: Pictures | null }>({ landed: null, pools: null, rings: null });
  /** How far the clouds have drifted (lib/town/clouds), and their shadows' pictures, drawn once. */
  const cloudDrift = useRef(0);
  const cloudArt = useRef<HTMLCanvasElement[] | null>(null);
  useEffect(() => {
    // somewhere else in their round each visit
    cloudDrift.current = (Date.now() / 1000) * 24;
    const dev = process.env.NODE_ENV !== "production", params = new URLSearchParams(location.search);
    const forced = dev ? forcedWeather(params.get("townWeather")) : null;
    if (forced) { SKIES.force(forced); effects.current = SKIES.effects(); return; }
    // (which database: the stand-in's, in `next dev`'s &townDb=; otherwise the site's own, which anybody may ask the weather of)
    const bench = dev && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(params.get("townDb") ?? "") ? params.get("townDb") : null;
    const supabase = bench ? null : createClient();
    const ask = async (): Promise<unknown> => {
      const p_since = Math.floor(SKIES.since(60));
      if (bench) {
        const r = await fetch(`${bench}/rest/v1/rpc/town_sky`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ p_since }) });
        return r.ok ? r.json() : null;
      }
      if (!supabase) return null;
      const { data, error } = await supabase.rpc("town_sky", { p_since });
      return error ? null : data;
    };
    let gone = false, written = 0;
    const look = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        let sent = Date.now();
        const took = SKIES.take(await ask(), sent);
        if (gone || bench) return;
        // The quarter hours to come are written when somebody asks the site for them: asked when the last one kept
        // is less than twenty minutes off (and where the database has no weather at all, what the site answers is
        // held, as the town did before).
        if ((took && SKIES.reaches(20)) || Date.now() - written < 60_000) return;
        written = Date.now();
        const one = readWeather(await (await fetch("/api/town/weather")).json());
        if (gone) return;
        sent = Date.now();
        if (!SKIES.take(await ask(), sent) && !took) SKIES.hold(one);
      } catch { /* fine weather it is */ }
    };
    void look();
    const t = setInterval(() => void look(), 4 * 60_000);
    const shown = () => { if (document.visibilityState === "visible") void look(); };
    document.addEventListener("visibilitychange", shown);
    return () => { gone = true; clearInterval(t); document.removeEventListener("visibilitychange", shown); };
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
  /** The settings' choice of how often the map is drawn: kept on this device, the most until it is read. */
  const [pace, setPace] = useState<Fps>(PACE.most);
  useEffect(() => { const kept = keptFps(); paceRef.current = kept; setPace(kept); }, []);
  const choosePace = (fps: Fps) => { paceRef.current = fps; setPace(fps); keepFps(fps); };
  const settingsShown = useCallback((open: boolean) => { settingsOpenRef.current = open; }, []);
  /** The settings' choice of whether the town moves (lib/town/motion): kept on this device, moving until it is read. */
  const [moving, setMoving] = useState(true);
  useEffect(() => { const kept = keptMotion(); stillAt.current = Date.now(); reducedRef.current = !kept; setMoving(kept); }, []);
  const chooseMoving = (on: boolean) => { stillAt.current = Date.now(); reducedRef.current = !on; setMoving(on); keepMotion(on); };
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  /** The emote window: what my avatar can do where it stands (sit, for now). */
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  /** The wishing fountain's panel: it takes the board's place while it is open (so whatever makes way for the board makes way for it). */
  const [fountainOpen, setFountainOpen] = useState(false);
  /** A talk with a shopkeeper: who, what they say, and what there is to choose at its end. Each has a number of its own, so a new one starts at its first line. */
  const [talk, setTalk] = useState<{ who: Speaker; n: number; lines: Line[]; choices?: TalkChoice[] } | null>(null);
  /** Which of their conversations comes next (they go round, tap after tap), and how many talks there have been. */
  const talkTurns = useRef<Record<Speaker, number>>({ uncle: 0, banker: 0 });
  const talks = useRef(0);
  /** The trade's panel that is open (the uncle's stall, the bank, my bag), and what the map shows of my purse. */
  const [trade, setTrade] = useState<TradeView | null>(null);
  const [purse, setPurse] = useState<TradeSummary>({ hand: null, coins: 0, waiting: 0, stamina: 100, buff: null, eating: null });
  /**
   * Who keeps the game for me (lib/town/keeper), and whether it is open to me: the database for a member (which
   * answers whether it is), the browser's trial in `next dev`'s test room. With `&townDb=<address>` the test room is
   * kept by a stand-in for the database instead (dev only: the migrations replayed in a scratch folder, see the
   * fc-cash-town skill's scripts/db), so that what a member will play can be played before anything is pushed.
   */
  const [keeper, setKeeper] = useState<GameKeeper | null>(null);
  const [game, setGame] = useState(false);
  const gameRef = useRef(false);
  useEffect(() => {
    let gone = false, made: GameKeeper | null = null;
    if (testTopic) {
      if (process.env.NODE_ENV !== "production") {
        const bench = new URLSearchParams(location.search).get("townDb");
        if (bench && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(bench)) {
          const ask: Ask = async (fn, args) => {
            const r = await fetch(`${bench}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "content-type": "application/json", "x-town-as": me.id }, body: JSON.stringify(args ?? {}) });
            if (r.status === 403) return { denied: true };
            return r.ok ? r.json() : null;
          };
          // (who this tester is there: a made-up member, by the tester's own id)
          void fetch(`${bench}/bench/who?as=${encodeURIComponent(me.id)}&name=${encodeURIComponent(me.name)}`).then((r) => r.json()).then((who: { id?: string }) => {
            if (gone || !who.id) return;
            made = new DbKeeper(who.id, ask);
            setKeeper(made);
          }).catch(() => { /* no stand-in at that address: no game */ });
        } else {
          void import("@/lib/town/keeper-trial").then((m) => { if (!gone) setKeeper(m.trialKeeper(me.id)); });
        }
      }
    } else {
      const supabase = createClient();
      if (supabase) {
        made = new DbKeeper(me.id, async (fn, args) => {
          const { data, error } = await supabase.rpc(fn, args ?? {});
          // (refused outright: not signed in, no proved character, or the game not open to them yet)
          if (error) return error.code === "42501" ? { denied: true } : null;
          return data;
        });
        setKeeper(made);
      }
    }
    return () => { gone = true; made?.close(); setKeeper(null); };
  }, [me.id, testTopic]);
  useEffect(() => {
    if (!keeper) { gameRef.current = false; setGame(false); return; }
    const see = () => { const on = keeper.ready() && keeper.open() === true; gameRef.current = on; setGame(on); };
    see();
    return keeper.watch(see);
  }, [keeper]);
  // The deck and the cooking yard are where the game is played: finished for whoever it is open to, building sites
  // for everybody else (lib/town/world's setBuilt). (`&townSites=1` in `next dev` begins with the sites, as
  // production does, to see them finish when the keeper answers.)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).get("townSites") === "1") setBuilt(false);
  }, []);
  useEffect(() => { if (game) setBuilt(true); }, [game]);
  /** Fishing: the place I stand at (a tile a line can be dropped from: where its float lands, and whether that is deep water), whether my rod is out, and what my line is doing (for the map to draw). */
  const [fishAt, setFishAt] = useState<FishPlace | null>(null);
  const fishAtRef = useRef<FishPlace | null>(null);
  const [fishing, setFishing] = useState(false);
  const lineRef = useRef<LineState | null>(null);
  /** The sounds of fishing: mine (made from the rod's panel) and other people's (made here, softer, by how far off they fish). What each of them was last seen doing with a rod says when. */
  const sfxRef = useRef<FishSfx | null>(null);
  if (game && !sfxRef.current && typeof window !== "undefined") sfxRef.current = new FishSfx();
  useEffect(() => () => { sfxRef.current?.close(); }, []);
  const fishWas = useRef(new Map<string, number>());
  /** What I hold in my hand, for the map's own loop. */
  const handRef = useRef<ItemId | null>(null);
  /** The farm: the plot I stand on, when I stand still on one; and its own way of drawing the plots, which it hands over when it has loaded. */
  const [plotHere, setPlotHere] = useState<[number, number] | null>(null);
  const plotRef = useRef<string>("");
  /** The kitchen: where I stand still, and what of the cooking yard that is; what the others at the yard's places hold; and its own way of drawing the pots that stand about. */
  const [standing, setStanding] = useState<Standing | null>(null);
  const standRef = useRef("");
  const [crew, setCrew] = useState<string[]>([]);
  const crewRef = useRef("");
  /** Who those others are, in the same order (the database reads what each holds from their own purse). */
  const [cooks, setCooks] = useState<string[]>([]);
  /** Whether I am on the farm's map (what others do there is asked for while I am). */
  const [onFarm, setOnFarm] = useState(false);
  const onFarmRef = useRef(false);
  const cookDraw = useRef<FarmDraw | null>(null);
  const registerCook = useCallback((draw: FarmDraw | null) => { cookDraw.current = draw; }, []);
  /** A deal with somebody (the trial's): its own way of opening one, handed over when it has loaded. */
  const openDeal = useRef<OpenDeal | null>(null);
  const registerDeal = useCallback((open: OpenDeal | null) => { openDeal.current = open; }, []);
  /** Whether I stand still at the farm's well (where a bucket is poured in and a can filled). */
  const [wellHere, setWellHere] = useState(false);
  const wellRef = useRef(false);
  /** Everybody's rank at the well, and who I am to whoever keeps the game: for the names over heads. */
  const ranksRef = useRef<{ ranks: Record<string, number>; me: string }>({ ranks: {}, me: "" });
  const farmDraw = useRef<FarmDraw | null>(null);
  const registerFarm = useCallback((draw: FarmDraw | null) => { farmDraw.current = draw; }, []);
  /** Everybody on the map now, as this screen has them (the bucket line asks who stands within sight: lib/town/line). */
  const standers = useCallback((): Stander[] => {
    const stay = sessionRef.current && !sessionRef.current.closed ? sessionRef.current : null;
    return (stay ? [stay.self, ...stay.avatars.values()] : []).filter((a) => a.byeAt === undefined)
      .map((a) => ({ id: a.info.id, name: a.info.name, x: a.pos.x, y: a.pos.y, moving: a.path.length > 0, hold: ((a.info.hold || null) as ItemId | null) }));
  }, []);
  /** Whether I am on the forest's map (what it has is looked at while I am), and its own way of drawing what lies and grows there. */
  const [onForest, setOnForest] = useState(false);
  const onForestRef = useRef(false);
  const forestDraw = useRef<FarmDraw | null>(null);
  const registerForest = useCallback((draw: FarmDraw | null) => { forestDraw.current = draw; }, []);
  // The insects (TownBugs): drawn on every map, and a tap is asked of the net before it is a step.
  const bugsDraw = useRef<FarmDraw | null>(null), bugsTap = useRef<((at: Vec) => boolean) | null>(null);
  const registerBugs = useCallback((draw: FarmDraw | null) => { bugsDraw.current = draw; }, []);
  const registerBugsTap = useCallback((tap: ((at: Vec) => boolean) | null) => { bugsTap.current = tap; }, []);
  /** The test window (the owner's, in the trial): every thing there is, to look at and to conjure. */
  const [testOpen, setTestOpen] = useState(false);
  /** How many are eating beside me (sitting within a few tiles, a dish before them), and whether it is raining: told to the page when they change. */
  const [company, setCompany] = useState(0);
  const companyRef = useRef(0);
  const [raining, setRaining] = useState(false);
  const rainRef = useRef(false);
  /** The recipe unrolled to be read. */
  const [scroll, setScroll] = useState<ItemId | null>(null);
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
  // The room says when something of the game's changed, and the keeper asks the database for it; my own deeds are
  // said the same way. Only the word for what: never the change.
  useEffect(() => {
    if (!session || !keeper) return;
    session.onNudge = (what) => { if (NUDGES.includes(what)) keeper.nudged(what as Looked); };
    // (to one person when they are in the room under that id; a stand-in's members are not, so the room is told)
    keeper.onDeed = (what, to) => session.nudge(what, to && session.avatars.has(to) ? to : undefined);
    return () => { session.onNudge = null; keeper.onDeed = null; };
  }, [session, keeper]);
  // Everybody's rank at the well (lib/town/well): the keeper's, read as it changes.
  useEffect(() => {
    if (!keeper) { ranksRef.current = { ranks: {}, me: "" }; return; }
    const read = () => { ranksRef.current = { ranks: keeper.ranks(), me: keeper.id }; };
    read();
    return keeper.watch(read);
  }, [keeper]);

  useSyncExternalStore(session?.subscribe ?? noSubscribe, () => session?.version ?? 0, () => 0);
  // This page showing the stay is what tells the others we are looking at the map.
  useEffect(() => session?.attachView(), [session]);

  useEffect(() => {
    fontRef.current = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";
  }, []);

  // The dolls: one picture, fetched once per tab.
  useEffect(() => {
    let alive = true;
    // the Lalafell's at once (most people); other races' when somebody of theirs comes
    loadPixelKit(0).then((k) => { if (alive) kits.current.set(0, k); }).catch(() => { /* simple figures until a reload */ });
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
  const setCam = (c: Cam) => { const v = cam.current; const k = clampCam(c, v.cw, v.ch, BOUNDS[placeRef.current]); v.s = k.s; v.cx = k.cx; v.cy = k.cy; };
  const zoomBy = useCallback((factor: number, px?: number, py?: number) => {
    const v = cam.current;
    if (!v.cw) return;
    setCam(zoomAt(camNow(), v.s * factor, px ?? v.cw / 2, py ?? v.ch / 2, v.cw, v.ch, BOUNDS[placeRef.current]));
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
    setCam({ s: Math.max(v.s, 1.2), cx: iso.x, cy: iso.y - dollH(a) * 0.5 });
    const p = toScreen(camNow(), iso, v.cw, v.ch);
    setCard({ id, x: p.x, top: p.y - dollH(a) * v.s * 1.12, bottom: p.y + 22 });
    setPeopleOpen(false);
  };

  /* ── drawing, every frame ────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = stageRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    /** When a frame is next due (lib/town/pace). */
    let due = 0;
    let frames = 0;
    let fpsSince = last;
    /** The sleep before the next frame is asked for while the map rests (lib/town/pace's nap), and whether one was taken since the last frame. */
    let timer = 0, napped = false;
    /** When the page was last touched, and whether the map rests: drawn at fewer than the pace chosen. */
    let touchedAt = last, resting = false;

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

    /**
     * Ask for the next frame: at once, or while the map rests after sleeping till it is nearly due. (A frame asked
     * for and let go by is not free: the page, the compositor and the GPU's process are woken for it all the same.
     * Measured 2026-10-05 on a screen of 180: 180 wakings a second, for 20 frames drawn.)
     */
    const ask = () => {
      const ms = resting ? nap(performance.now(), due) : 0;
      if (ms <= 0) { raf = requestAnimationFrame(frame); return; }
      napped = true;
      timer = window.setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, ms);
    };
    const frame = (now: number) => {
      // No more often than the pace: a fast screen asks for frames the town does not draw (the owner, 2026-10-04:
      // "บางคนรันแล้ว fps สูงเกินไป แล้วคอมร้อน"). And fewer while nobody is at it (lib/town/pace's paceOf; the owner,
      // 2026-10-05: "คนใน cashtown เล่นแล้วใช้ CPU เยอะมาก"): the page not touched for a while, or its window behind
      // another. Not under the settings while they are read: what they say the map draws at is what was chosen there.
      const live = sessionRef.current && !sessionRef.current.closed ? sessionRef.current : null;
      const focused = document.hasFocus();
      const pace = settingsOpenRef.current && focused ? paceRef.current
        : paceOf(paceRef.current, { focused, idle: performance.now() - touchedAt, walking: !!live?.self.path.length });
      const slept = napped;
      napped = false;
      resting = pace < paceRef.current;
      paceNowRef.current = pace;
      // (the frame that comes after a sleep is the one slept for, whatever time it is told as: lib/town/pace)
      const after = slept && resting ? wokenFor(now, due, pace) : paced(now, last, due, pace);
      if (after === null) { ask(); return; }
      due = after;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frames++;
      if (now - fpsSince >= 1000) { fpsRef.current = Math.round((frames * 1000) / (now - fpsSince)); frames = 0; fpsSince = now; }
      if (live) live.step(now, dt);
      draw(ctx, canvas, now, dt);
      ask();
    };
    // A touch of the page: the map is at the pace chosen again, and at once (the frame it was waiting for was a
    // slow pace's, as much as a twentieth of a second off).
    const touched = () => {
      touchedAt = performance.now();
      if (!resting) return;
      resting = false;
      due = 0;
      napped = false;
      if (timer) { window.clearTimeout(timer); timer = 0; raf = requestAnimationFrame(frame); }
    };
    const TOUCHES = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "focus"] as const;
    for (const e of TOUCHES) window.addEventListener(e, touched, { passive: true, capture: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      for (const e of TOUCHES) window.removeEventListener(e, touched, { capture: true });
      ro.disconnect();
    };
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
      const t = 20 + r(1) * 100, across = (r(2) - 0.5) * 4.4;
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
    // (with the town's motion off the birds and the butterflies are kept where they were when it was turned off:
    // their wings were stopped before, but they went on gliding about by the clock)
    const v = cam.current, s = v.s, still = reducedRef.current, wall = still ? stillAt.current : Date.now();
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
    // (with a net in the hand, the butterflies about are only the ones that can be caught: lib/town/insects)
    if (sunny && !(gameRef.current && handRef.current === "bugNet")) for (let i = 0; i < BUTTERFLIES; i++) {
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

  /** The mouse cursor, over everything (and the sky's tint): see `mouse`. */
  function drawCursor(ctx: CanvasRenderingContext2D, now: number, dpr: number) {
    const m = mouse.current, img = iconImg.current;
    if (!m?.inside || !img?.complete || !img.naturalWidth) return;
    const t = reducedRef.current ? 0 : now, pressed = now - m.pressAt < 170;
    const name: IconName = m.mode === "grab" ? "grab"
      : m.mode === "sit" ? (pressed ? "sit3" : (["sit1", "sit2"] as const)[Math.floor(t / 300) % 2])
      : m.mode === "hand" ? (pressed ? "hand2" : (["hand1", "hand1", "hand3", "hand1"] as const)[Math.floor(t / 260) % 4])
      : pressed ? "cur1" : (["cur1", "cur2", "cur3", "cur2", "cur1", "cur4"] as const)[Math.floor(t / 150) % 6];
    const [x, y, w, h] = ICON_ATLAS.icons[name], [hx, hy] = ICON_ATLAS.cursor[name] ?? [0, 0];
    // two CSS pixels to a picture pixel (the owner's call: "Cursor ขอขนาดใหญ่กว่านี้"), crisp on any screen
    const k = 2;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h, Math.round((m.x - hx * k) * dpr) / dpr, Math.round((m.y - hy * k) * dpr) / dpr, w * k, h * k);
    ctx.restore();
  }

  /** How far a tree, a pine or a bush leans in the wind now: a steady lean and a sway of its own. */
  function swayOf(p: { kind: string; x: number; y: number }, now: number): number {
    if (reducedRef.current || !SWAYS.includes(p.kind)) return 0;
    const w = effects.current.wind, ph = (p.x * 12.9898 + p.y * 78.233) % (Math.PI * 2);
    const amp = p.kind === "bush" ? 0.035 : p.kind === "bamboo" ? 0.08 : p.kind === "oak" ? 0.04 : 0.06;
    return w * (amp * 0.5 + amp * Math.sin(now / (900 - 300 * w) + ph) * (0.6 + 0.4 * Math.sin(now / 2300 + ph * 2)));
  }

  /**
   * The weather over the town: wet ground and puddles in rain, falling rain,
   * leaves blowing in fine weather, grey light and mist. Nothing moves for
   * somebody who turned the town's motion off (lib/town/motion); the wet look
   * stays.
   */
  function drawWeather(ctx: CanvasRenderingContext2D, cw: number, ch: number, now: number, dt: number) {
    // (`dt` is seconds, as everywhere here. Until 2026-10-03 this took it for milliseconds: the rain hung in the
    // air, no leaf ever reached the ground, and a change in the weather took hours to come on.)
    const sec = Math.min(dt, 0.1);
    // (what every page draws at this moment of the database's clock: lib/town/weather's effectsAt)
    const e = effects.current = SKIES.effects();
    const still = reducedRef.current, s = cam.current.s;
    drawClouds(ctx, cw, ch, sec, e);
    ctx.save();
    // wet: puddles on the paths and the plaza that catch the light, and everything a touch bluer. No more than a
    // touch: light rain keeps the day's own light (the owner, 2026-10-03), and what darkens heavy rain is the sky
    // (drawDaylight, lib/town/daylight's overcast).
    if (e.wet > 0.02) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(150,166,192,${0.07 * e.wet})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "source-over";
      // (each a small picture made for this zoom, one to a size, and the rings in them one to an age: lib/town/rain)
      const dpr = cam.current.dpr, wet = wetArt.current;
      const pools = wet.pools = puddlesFor(s, dpr, wet.pools), rings = wet.rings = puddleRingsFor(s, dpr, wet.rings);
      const seen: Array<[number, Vec]> = [];
      for (const [i, p] of PUDDLES.entries()) {
        const c = project(p);
        if (onScreen(c)) seen.push([i, c]);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = Math.min(1, e.wet);
      for (const [i, c] of seen) drawPicture(ctx, pools, i % PUDDLE_SIZES, c.x, c.y, s);
      // rings where the rain lands in them
      if (!still && e.rain > 0.05) {
        ctx.globalAlpha = Math.min(1, e.rain);
        for (const [i, c] of seen) drawPicture(ctx, rings, puddleRing(i % PUDDLE_SIZES, ((now + i * 377) % 1100) / 1100), c.x + ((i * 7) % 5 - 2) * s, c.y, s);
      }
      ctx.globalAlpha = 1;
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
      // Rain: streaks falling at a slant with the wind, the near ones long, bright and fast, the far ones short and
      // faint. A shower's are few and fine; a downpour's many, longer and faster. (Laid from sheets drawn once, not
      // stroked line by line each frame, which cost the machine four times what a fine day does: lib/town/rain.)
      rain.current.draw(ctx, cw, ch, cam.current.dpr, sec, e.rain, e.wind);
      // and where it lands: a ring on the ground of the town, gone in a quarter of a second
      const P = splashes.current, wantP = Math.round(e.rain * (cw * ch) / 9000), LAST = RING_MS;
      if (P.length > wantP) P.length = wantP;
      while (P.length < wantP) P.push({ x: -1, y: -1, at: now - Math.random() * LAST });
      if (P.length) {
        const v = cam.current;
        for (const p of P) {
          if (now - p.at < LAST) continue;
          // somewhere in view, if that is in the town at all
          const iso = toIsoPoint(v, Math.random() * cw, Math.random() * ch, cw, ch), t = fromIso(iso.x, iso.y);
          const inTown = t.x >= 0 && t.y >= 0 && t.x < COLS && t.y < ROWS;
          p.x = inTown ? t.x : -1; p.y = t.y; p.at = now - Math.random() * 40;
        }
        // (each a small picture of a ring at its age, made for this zoom: lib/town/rain)
        const pics = wetArt.current.landed = ringsFor(s, v.dpr, wetArt.current.landed);
        ctx.imageSmoothingEnabled = true;
        for (const p of P) {
          if (p.x < 0) continue;
          const c = project(p);
          drawPicture(ctx, pics, ageOf((now - p.at) / LAST), c.x, c.y, s);
        }
      }
      // Leaves, in the town itself (not on the screen), two ways (the owner, 2026-10-02: "ใบไม้ร่วงจากต้นไม้ ใบไม้ที่
      // ปลิวมาตามลม ตอนนี้มันดูนิ่งเกินไป"): dropping from the trees in view, rocking down to the ground under them
      // and lying there a while; and blown in from the windward side, faster and spinning, most of them in gusts
      // that also stir the leaves lying on the ground (not the trees: they sway gently as before, the owner, 2026-10-02).
      const scenery = sceneryRef.current, dpr = window.devicePixelRatio || 1, v = cam.current;
      const L = leaves.current, G = gust.current;
      if (!scenery?.has("lf1") || e.leaves <= 0.01) { L.length = 0; G.strength = 0; }
      else {
        const world = (sx: number, sy: number) => { const iso = toIsoPoint(v, sx, sy, cw, ch); return fromIso(iso.x, iso.y); };
        // how much of the town is in view, against a 1280×800 window at the starting zoom: the leaves are in the
        // town, so a closer look shows fewer of them, not the same number crowded together
        const area = Math.max(0.3, Math.min(1.6, ((cw * ch) / (1280 * 800)) * (START_DESK / v.s) ** 2));
        const art = () => LEAVES[Math.floor(Math.random() * LEAVES.length)];
        // the gusts: every several seconds, sooner in more wind; one rises in half a second and dies away over three
        if (!G.next) G.next = now + 2500;
        if (now >= G.next) {
          G.at = now;
          G.next = now + (6000 + Math.random() * 9000) * (1.25 - 0.55 * e.wind);
          for (let k = Math.round((4 + Math.random() * 5) * area * e.leaves); k > 0 && L.length < LEAVES_MOST; k--) L.push(blown("gust", false));
        }
        const ga = now - G.at;
        G.strength = ga < 500 ? ga / 500 : Math.max(0, 1 - (ga - 500) / 3000);
        // from a tree in view: somewhere in its crown
        const [tw] = scenery.sizeOf("tree"), [, tay] = scenery.anchorOf("tree");
        const crowns = LEAF_TREES.filter((p) => { const c = project({ x: p.x + 0.5, y: p.y + 0.5 }); return c.x > -20 && c.x < cw + 20 && c.y > 20 && c.y < ch + tay * v.s; });
        function dropped(): Leaf | null {
          if (!crowns.length) return null;
          const p = crowns[Math.floor(Math.random() * crowns.length)];
          // across the crown (along the screen), and a little in front of or behind the trunk
          const across = (Math.random() - 0.5) * tw * 0.5 / TILE_W, deep = (Math.random() - 0.5) * 0.4;
          return { kind: "fall", x: p.x + 0.5 + across + deep, y: p.y + 0.5 - across + deep, h: tay * (0.4 + Math.random() * 0.4),
            ph: Math.random() * 6.28, k: 0.34 + Math.random() * 0.12, art: art(), flutter: 0.6 + Math.random() * 0.8,
            landed: 0, rest: 2 + Math.random() * 2.5, speed: 1, spin: 0 };
        }
        // on the wind: anywhere in view to begin with; after that, in from the left (where it comes from) or above
        function blown(kind: "wind" | "gust", anywhere: boolean): Leaf {
          const sx = anywhere ? Math.random() * cw : Math.random() < 0.7 ? -30 - Math.random() * 120 : Math.random() * cw * 0.7;
          const sy = anywhere ? Math.random() * ch : sx < 0 ? Math.random() * ch * 0.9 : -30;
          const p = world(sx, sy + 70 * v.s);
          return { kind, x: p.x, y: p.y, h: 25 + Math.random() * 75, ph: Math.random() * 6.28, k: 0.32 + Math.random() * 0.12,
            art: art(), flutter: 0.9 + Math.random() * 0.9, landed: 0, rest: 1 + Math.random() * 2,
            speed: 0.7 + Math.random() * 0.6, spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5) };
        }
        // how many, for the size of the view and how windy it is (a gust's own come on top and are not replaced);
        // a tree lets a leaf or two go at a time, never a heap (the owner, 2026-10-02: "ใบไม้กองรวมกันแบบนี้")
        const wantFall = Math.min(Math.round((3 + 7 * e.leaves) * area), Math.round(crowns.length * 1.5));
        const wantWind = Math.round((2 + 4 * e.leaves) * area);
        let fall = 0, wind = 0;
        for (const l of L) { if (l.kind === "fall") fall++; else if (l.kind === "wind") wind++; }
        const first = L.length === 0;
        for (; fall < wantFall; fall++) { const l = dropped(); if (!l) break; if (!first) l.h = Math.max(l.h, tay * 0.55); L.push(l); }
        for (; wind < wantWind; wind++) L.push(blown("wind", first));
        // the wind blows to the right of the screen: one way along x, the other along y
        // (a gust is as hard as the day is windy: on a still day it only hurries the leaves a little)
        const gs = G.strength, blow = Math.max(0, (e.wind - 0.3) / 0.7);
        for (let i = L.length - 1; i >= 0; i--) {
          const l = L[i];
          const t = now / 1000 * l.flutter + l.ph;
          // a pendulum's sway along the wind, falling faster at the bottom of each swing
          const swing = Math.sin(t * 1.6);
          if (l.landed) {
            l.landed += sec;
            // a gust takes the ones lying on the ground a little way along, tumbling
            if (gs > 0.25) { const go = (gs - 0.25) * 70 * l.speed * sec / TILE_W; l.x += go; l.y -= go; }
          } else if (l.kind === "fall") {
            const go = ((8 + 30 * e.wind + (40 + 80 * blow) * gs) * (0.75 + 0.25 * Math.sin(l.ph)) + swing * 26) * sec / TILE_W;
            l.x += go; l.y -= go;
            l.h -= (11 + 16 * (1 - Math.abs(swing))) * sec;
          } else {
            const go = ((70 + 150 * e.wind) * l.speed + (60 + 180 * blow) * gs + swing * 20) * sec / TILE_W;
            l.x += go; l.y -= go;
            // skimming along, rising a little on each lift of the wind, coming down as it drops
            l.h += (Math.sin(t * 2.2) * 14 - (l.kind === "gust" ? 2 + 5 * (1 - gs) : 6)) * sec;
          }
          if (!l.landed && l.h <= 0) { l.h = 0; l.landed = sec; }
          const g = project({ x: l.x, y: l.y }), c = { x: g.x, y: g.y - l.h * v.s };
          // gone: lain there its while, or blown well off the screen; the ones that fell from a tree, from another one
          const off = c.x > cw + 80 || c.y > ch + 140 || c.x < -200 || c.y < -160;
          if (l.landed > l.rest + 1.5 || off) {
            if (l.kind === "gust") { L.splice(i, 1); continue; }
            const next = l.kind === "fall" ? dropped() : blown("wind", false);
            if (!next) { L.splice(i, 1); continue; }
            L[i] = next;
            continue;
          }
          const fade = l.landed > l.rest ? Math.max(0, 1 - (l.landed - l.rest) / 1.5)
            : l.kind === "fall" ? Math.min(1, (now - (l.born ??= now)) / 400) : Math.min(1, (c.x + 30) / 50, (c.y + 30) / 50);
          ctx.save();
          ctx.globalAlpha = Math.max(0, fade);
          ctx.translate(Math.round(c.x), Math.round(c.y));
          if (!l.landed) {
            // fallen from a tree: rocking; on the wind: spinning as it goes
            ctx.rotate(l.kind === "fall" ? swing * 0.55 : t * l.spin * 0.3 + swing * 0.3);
            // turning over: squashed one way, then the other, never to nothing
            const flip = Math.cos(t * (l.kind === "fall" ? 0.9 : 1.8));
            ctx.scale(Math.sign(flip || 1) * (0.35 + 0.65 * Math.abs(flip)), 1);
          } else {
            if (gs > 0.25) ctx.rotate(Math.sin(t * 6) * 0.5 * gs);
            ctx.scale(1, 0.6);
          }
          scenery.drawProp(ctx, l.art, 0, 0, v.s * l.k, dpr);
          ctx.restore();
        }
      }
    } else {
      // (motion turned off while it rained or blew: what was in the air is not kept hanging there, unseen)
      rain.current.stop(); splashes.current.length = 0; leaves.current.length = 0;
    }
    ctx.restore();
  }

  /** The hour's light, under what the weather makes of it: heavy rain is as dark as night, the lamps lit. */
  function skyNow() {
    return overcast(forcedHour.current !== null ? daylightAt(forcedHour.current * 60) : daylight(), effects.current.gloom);
  }

  /**
   * The shadows of clouds drifting over the town by day (lib/town/clouds; the owner, 2026-10-03: "เงาเมฆเคลื่อนตัว
   * ตอนเช้า"): soft and a little blue, multiplied over everything under them, moving the way the wind blows the
   * leaves and faster in more wind. More of them under a cloudy sky; none by lamplight, in mist, or in the dark
   * of heavy rain, where there is no sun to cast one. They stand still for somebody who turned the town's motion off.
   */
  function drawClouds(ctx: CanvasRenderingContext2D, cw: number, ch: number, sec: number, e: Effects) {
    if (!reducedRef.current) cloudDrift.current += (12 + 34 * e.wind) * sec;
    const strength = 0.5 * sunOf(skyNow()) * Math.max(0, 1 - e.haze * 4);
    if (strength < 0.02 || e.clouds < 0.02) return;
    const art = (cloudArt.current ??= Array.from({ length: CLOUD_SHAPES }, (_, i) => cloudPicture(i)));
    const v = cam.current;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.imageSmoothingEnabled = true;
    for (const c of cloudsAt(cloudDrift.current, e.clouds)) {
      const p = toScreen(v, c, cw, ch), w = c.w * v.s, h = c.h * v.s;
      if (p.x + w / 2 < 0 || p.x - w / 2 > cw || p.y + h / 2 < 0 || p.y - h / 2 > ch) continue;
      ctx.globalAlpha = strength * c.k;
      ctx.drawImage(art[c.shape], p.x - w / 2, p.y - h / 2, w, h);
    }
    ctx.restore();
  }

  /**
   * The camp fire's flames (the owner, 2026-10-03: "ไฟตรงกลางลานอาหาร ช่วยทำให้มี อนิเมชัน"): three tongues of square pixels,
   * one inside the next, licking and leaning by the clock, and a few sparks going up. (x, y) is the fire's foot.
   */
  function drawFlames(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, now: number) {
    const t = reducedRef.current ? 0 : now, px = 2 * k;
    const tongues: Array<[string, number, number, number]> = [["#d9481c", 13, 15, 0], ["#f58a1f", 9, 12, 1.7], ["#ffd24a", 5, 8, 3.1]];
    for (const [colour, wide, tall, beat] of tongues) {
      ctx.fillStyle = colour;
      for (let r = 0; r < tall; r++) {
        const up = r / tall;
        const w = Math.max(1, Math.round(wide * (1 - up) ** 0.75 * (0.82 + 0.18 * Math.sin(t / 110 + r * 0.9 + beat))));
        const lean = Math.round((Math.sin(t / 170 + r * 0.45 + beat) * 1.6 + Math.sin(t / 61 + beat) * 0.7) * up);
        ctx.fillRect(Math.round(x + (lean - w / 2) * px), Math.round(y - (r + 1) * px), Math.ceil(w * px), Math.ceil(px));
      }
    }
    if (reducedRef.current) return;
    for (let i = 0; i < 5; i++) {
      const life = (t / 1500 + i * 0.211) % 1;
      ctx.fillStyle = `rgba(255,${Math.round(205 - life * 90)},90,${(1 - life) * 0.9})`;
      ctx.fillRect(Math.round(x + (Math.sin(i * 12.9) * 9 + Math.sin(life * 6 + i) * 4) * k), Math.round(y - (26 + life * 52) * k), Math.ceil(px * 0.75), Math.ceil(px * 0.75));
    }
  }

  /** A soft round light at a point of the screen, added to what is there. */
  function glowAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number, flat = 1) {
    if (alpha <= 0.004) return;
    // (a picture of the light, made once for its colour and laid at its size and strength: not a gradient made anew
    // for every light of every frame, two to every lamp in sight)
    const was = ctx.globalAlpha;
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = was * Math.min(1, alpha);
    ctx.drawImage(glowPicture(rgb), x - r, y - r * flat, 2 * r, 2 * r * flat);
    ctx.globalAlpha = was;
  }

  /** The light of the forest camp's fire, on whoever sits round it: faint by day, warm at night, wavering a little. */
  function drawCampLight(ctx: CanvasRenderingContext2D, lamps: number, now: number) {
    if (placeRef.current !== "forest") return;
    const fire = project({ x: CAMP.fire.x + 0.5, y: CAMP.fire.y + 0.62 });
    if (!onScreen(fire)) return;
    const s = cam.current.s, lit = (0.15 + 0.85 * lamps) * (reducedRef.current ? 0.92 : 0.9 + 0.06 * Math.sin(now / 760) + 0.04 * Math.sin(now / 430 + 1.3));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glowAt(ctx, fire.x, fire.y - 14 * s, 150 * s, "255,170,90", 0.5 * lit);
    glowAt(ctx, fire.x, fire.y + 6 * s, 330 * s, "255,150,70", 0.2 * lit, 0.5);
    ctx.restore();
  }

  /**
   * The cooking yard's own lights, added after the sky has had its say. Inside: the camp fire, which lights the whole
   * yard, and the stoves' mouths. Outside: the house's two lanterns, the fire's light in its windows (their bars left
   * dark) and its doorway, and what of it falls on the ground before them. Faint by day, warm at night; and slow
   * (the owner, 2026-10-03: "ช่วยทำให้แสงไฟที่มองจากข้างนอกอาคาร ทำอาหารดุดีกว่านี้ และ ช้ากว่านี้หน่อยครับ ตอนนี้เร็วไปไม่มีความ cozy เลย"):
   * the light from outside only breathes, over several seconds; by the fire itself it wavers a little more.
   */
  function drawYardLights(ctx: CanvasRenderingContext2D, lamps: number, now: number) {
    if (KITCHEN.stage !== 2) return;
    const feet = project(KITCHEN.foot);
    if (!onScreen(feet)) return;
    const s = cam.current.s, roof = roofSeen.current, L = KITCHEN.lights, still = reducedRef.current;
    const breath = still ? 0.95 : 0.93 + 0.05 * Math.sin(now / 2300) + 0.02 * Math.sin(now / 1270 + 1.3);
    const waver = still ? 0.92 : 0.9 + 0.06 * Math.sin(now / 760) + 0.04 * Math.sin(now / 430 + 1.3);
    const lit = 0.12 + 0.88 * lamps, at = ([x, y]: readonly [number, number]) => ({ x: feet.x + x * s, y: feet.y + y * s });
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (roof < 1) {
      const inside = (1 - roof) * lit * waver, fire = at(L.fire);
      glowAt(ctx, fire.x, fire.y - 14 * s, 150 * s, "255,170,90", 0.5 * inside);
      glowAt(ctx, fire.x, fire.y + 6 * s, 330 * s, "255,150,70", 0.2 * inside, 0.5);
      for (const m of L.mouths) { const p = at(m); glowAt(ctx, p.x, p.y, 46 * s, "255,150,70", 0.42 * inside); }
    }
    if (roof > 0 && lamps > 0.02) {
      const glow = roof * lamps * breath, ground = feet.y + 18 * s;
      /** A pane of lit glass: amber at the top, golden lower down. */
      const pane = (left: number, top: number, w: number, h: number, a: number) => {
        const g = ctx.createLinearGradient(0, top, 0, top + h);
        g.addColorStop(0, `rgba(255,146,60,${0.4 * a})`);
        g.addColorStop(1, `rgba(255,206,124,${0.6 * a})`);
        ctx.fillStyle = g;
        ctx.fillRect(left, top, w, h);
      };
      // the lanterns: a bright heart, a wide soft halo, and their light on the ground below
      for (const l of L.lanterns) {
        const p = at(l);
        glowAt(ctx, p.x, p.y, 20 * s, "255,232,180", 0.5 * roof * lamps);
        glowAt(ctx, p.x, p.y, 78 * s, "255,200,130", 0.3 * glow);
        glowAt(ctx, p.x, ground, 110 * s, "255,190,120", 0.13 * glow, 0.4);
      }
      // the windows: four panes each, the bars between them left dark; a halo round them, and their light on the grass
      for (const [x0, y0, x1, y1] of L.windows) {
        const left = feet.x + x0 * s, top = feet.y + y0 * s, w = (x1 - x0) * s, h = (y1 - y0) * s, bar = 3 * s;
        for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pane(left + i * (w + bar) / 2, top + j * (h + bar) / 2, (w - bar) / 2, (h - bar) / 2, glow);
        glowAt(ctx, left + w / 2, top + h / 2, 104 * s, "255,170,90", 0.15 * glow);
        glowAt(ctx, left + w / 2, ground, 130 * s, "255,176,100", 0.1 * glow, 0.36);
      }
      // the doorway: the light inside, and a long pool of it out over the grass
      {
        const [x0, y0, x1, y1] = L.door, left = feet.x + x0 * s, top = feet.y + y0 * s, w = (x1 - x0) * s, h = (y1 - y0) * s;
        // (the sign post stands before its right side: lit only above the sign's board)
        const post = KITCHEN.posts[2], cut = Math.max(0, Math.min(w, (post[0] - x0) * s)), above = Math.max(0, Math.min(h, (post[1] - y0) * s));
        pane(left, top, cut, h, glow * 0.85);
        pane(left + cut, top, w - cut, above, glow * 0.85);
        glowAt(ctx, left + w / 2, top + h / 2, 96 * s, "255,176,96", 0.16 * glow);
        glowAt(ctx, left + w / 2, feet.y + 30 * s, 190 * s, "255,184,108", 0.2 * glow, 0.4);
      }
    }
    ctx.restore();
  }

  function drawDaylight(ctx: CanvasRenderingContext2D, cw: number, ch: number, now: number) {
    const day = skyNow();
    const [r, g, b] = day.tint;
    if (r < 255 || g < 255 || b < 255) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
    drawYardLights(ctx, day.lamps, now);
    drawCampLight(ctx, day.lamps, now);
    if (day.lamps < 0.02) return;
    const s = cam.current.s;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of PROPS) {
      if (p.kind !== "lamp") continue;
      const base = project({ x: p.x + 0.5, y: p.y + 0.62 });
      if (!onScreen(base)) continue;
      glowAt(ctx, base.x, base.y - 78 * s, 44 * s, "255,196,120", 0.55 * day.lamps);
      // a pool of light on the ground
      glowAt(ctx, base.x, base.y, 70 * s, "255,180,100", 0.22 * day.lamps, 0.5);
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
    // Which map I am on decides how far the camera may go. Through a gate it is put on me at once
    // (not swept across the nothing between the maps), and the screen comes up out of the dark.
    const place = (mine && placeOf(mine.pos.x, mine.pos.y)) || placeRef.current;
    if (place !== placeRef.current) {
      placeRef.current = place;
      if (mine) { const iso = toIso(mine.pos.x, mine.pos.y); v.cx = iso.x; v.cy = iso.y - dollH(mine) * 0.45; }
      v.follow = true;
      setCam(camNow());
      warpedAt.current = now;
    }
    // The forest's picture: asked for by whoever is in the forest, or on the north path on the way to it.
    if (!forestHere.current && mine && now - forestAsked.current > FOREST_AGAIN_MS && (place === "forest" || (place === "town" && mine.pos.y < 14))) {
      forestAsked.current = now;
      loadForest().then(() => { forestHere.current = true; }).catch(() => { /* its trees are the town's until it comes */ });
    }
    if (v.follow && mine) {
      const iso = toIso(mine.pos.x, mine.pos.y);
      const f = focus.current ?? { x: cw / 2, y: ch / 2 };
      const tx = iso.x - (f.x - cw / 2) / v.s, ty = iso.y - dollH(mine) * 0.45 - (f.y - ch / 2) / v.s;
      const ease = Math.min(1, dt * 7);
      setCam({ s: v.s, cx: v.cx + (tx - v.cx) * ease, cy: v.cy + (ty - v.cy) * ease });
    }

    // The cooking yard's roof: off for whoever stands in the yard, on for everybody else; a quarter of a second either way.
    const indoors = !!mine && onYard(Math.floor(mine.pos.x), Math.floor(mine.pos.y));
    roofRef.current = reducedRef.current ? (indoors ? 0 : 1) : Math.max(0, Math.min(1, roofRef.current + (indoors ? -1 : 1) * dt * 4));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, "#0d1520");
    sky.addColorStop(1, "#0a0f15");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);

    benchBoxes.current = [];
    keeperBoxes.current = [];
    gateBoxes.current = [];
    // Whether a line can be dropped from where I stand, who is eating beside me, and whether it rains: told to the
    // page only when they change.
    if (gameRef.current && mine) {
      const tx = Math.floor(mine.pos.x), ty = Math.floor(mine.pos.y);
      const can = mine.path.length || (mine.info.sit ?? -1) !== -1 ? null : fishFrom(tx, ty), was = fishAtRef.current;
      if (can ? !was || was.tile[0] !== tx || was.tile[1] !== ty : !!was) {
        fishAtRef.current = can ? { ...can, tile: [tx, ty] } : null;
        setFishAt(fishAtRef.current);
      }
      let beside = 0;
      if (mine.info.eat) for (const a of sessionRef.current?.avatars.values() ?? []) {
        // beside me, or at my table in the cooking yard, on whichever of its benches
        const table = yardSeat(a.info.sit)?.table;
        if (a.info.eat && (a.info.sit ?? -1) !== -1
          && (Math.hypot(a.pos.x - mine.pos.x, a.pos.y - mine.pos.y) <= EAT_NEAR || (table !== undefined && table === yardSeat(mine.info.sit)?.table))) beside++;
      }
      if (beside !== companyRef.current) { companyRef.current = beside; setCompany(beside); }
      // (whether it rains is the database's to say: what it keeps of the weather, not what is drawn here)
      const wet = SKIES.raining();
      if (wet !== rainRef.current) { rainRef.current = wet; setRaining(wet); }
      const onPlot = !mine.path.length && plotAt(tx, ty) ? `${tx},${ty}` : "";
      if (onPlot !== plotRef.current) { plotRef.current = onPlot; setPlotHere(onPlot ? [tx, ty] : null); }
      const byWell = !mine.path.length && atWell(tx, ty);
      if (byWell !== wellRef.current) { wellRef.current = byWell; setWellHere(byWell); }
      const farming = tx >= FARM.x - 2 && ty >= FARM.y - 2 && tx < FARM.x + FARM.w + 2 && ty < FARM.y + FARM.h + 2;
      if (farming !== onFarmRef.current) { onFarmRef.current = farming; setOnFarm(farming); }
      const foraging = placeOf(tx, ty) === "forest";
      if (foraging !== onForestRef.current) { onForestRef.current = foraging; setOnForest(foraging); }
      // where I stand still (not sitting), for the kitchen; and what the others at the yard's places hold
      const spot = !mine.path.length && (mine.info.sit ?? -1) === -1 ? `${tx},${ty}` : "";
      // (beside the forest camp's fire is a place to cook at too: with a skewer or a pot in the hand, or by hand)
      const camp = atFire(tx, ty);
      if (spot !== standRef.current) { standRef.current = spot; setStanding(spot ? { tile: [tx, ty], place: yardPlace(tx, ty) ?? (camp ? "camp" : null) } : null); }
      let hands = "", who = "";
      // (whoever cooks with me is at the same fire as I am: the yard's places, or the camp's)
      for (const a of sessionRef.current?.avatars.values() ?? []) {
        const ax = Math.floor(a.pos.x), ay = Math.floor(a.pos.y);
        const at = a.path.length ? null : camp ? (atFire(ax, ay) ? "camp" : null) : yardPlace(ax, ay);
        if (at && at !== "wash") { hands += `${a.info.hold ?? ""},`; who += `${a.info.id},`; }
      }
      if (hands + who !== crewRef.current) {
        crewRef.current = hands + who;
        setCrew(hands ? hands.slice(0, -1).split(",") : []);
        setCooks(who ? who.slice(0, -1).split(",") : []);
      }
      // Other people's fishing is heard: a line dropped, a fish hooked, one landed or lost; softer than my own, and
      // fainter the further off they are.
      const sfx = sfxRef.current, seen = fishWas.current;
      for (const a of sessionRef.current?.avatars.values() ?? []) {
        const n = a.info.fish ?? 0, was = seen.get(a.info.id) ?? 0;
        if (n === was) continue;
        seen.set(a.info.id, n);
        const loud = heard(Math.hypot(a.pos.x - mine.pos.x, a.pos.y - mine.pos.y));
        if (!sfx || loud <= 0) continue;
        if (n === 2 && was < 2) sfx.play("cast", "common", loud);
        else if (n === 3) { sfx.play("strike", "common", loud); sfx.play("surge", "common", loud * 0.8); }
        else if (n === 4) sfx.play("landed", "common", loud);
        else if (was === 3) sfx.play("slipped", "common", loud);
      }
    }
    // The ground: the pixel-art picture of it, or plain tiles until it has come.
    const scenery = sceneryRef.current;
    if (scenery) {
      scenery.drawGround(ctx, v, cw, ch, dpr);
      // Flowers lie flat: under whoever walks over them.
      for (const p of placeRef.current === "forest" ? FOREST_PROPS : PROPS) {
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
          const name = back ? "bench_back" : "bench";
          scenery.drawProp(ctx, name, c.x, c.y, v.s, dpr, 0, mirror);
          // where it is on the screen, a little larger, for taps and the cursor
          const [w, h] = scenery.sizeOf(name), [ax, ay] = scenery.anchorOf(name), pad = 6;
          const left = mirror ? c.x - (w - ax) * v.s : c.x - ax * v.s;
          benchBoxes.current.push({ i: benchIndex.get(p) ?? -1, x0: left - pad, y0: c.y - ay * v.s - pad, x1: left + w * v.s + pad, y1: c.y - (ay - h) * v.s + pad, depth: p.x + p.y });
        } else if (scenery?.has(p.kind)) scenery.drawProp(ctx, p.kind, c.x, c.y, v.s * (PROP_K[p.kind] ?? 1), dpr, 0, false, swayOf(p, now));
        else if (p.kind === "tree" || p.kind === "pine") drawTree(ctx, p);
      } });
    }
    // Popoto Shop, being built: the site as it stands at its stage, and popoto workers at it.
    const shopArt = scenery?.has(`shop${SHOP.stage}`) ? `shop${SHOP.stage}` : "shop1";
    if (scenery?.has(shopArt)) {
      const corner = project({ x: SHOP.x + SHOP.w - 0.1, y: SHOP.y + SHOP.h - 0.1 });
      things.push({ depth: SHOP.x + SHOP.y + SHOP.w + SHOP.h - 1, draw: () => {
        scenery.drawProp(ctx, shopArt, corner.x, corner.y, v.s, dpr);
        const t = reducedRef.current ? 0 : now;
        const hammer = `pw_h${[1, 2, 3, 2][Math.floor(t / 210) % 4]}`, carry = `pw_c${[1, 2, 3, 2][Math.floor(t / 170) % 4]}`;
        if (shopArt === "shop1") {
          // one hammering on the floor boards
          const h = project({ x: SHOP.x + 1.1, y: SHOP.y + 2.2 });
          scenery.drawProp(ctx, hammer, h.x, h.y, v.s, dpr);
          // one carrying a plank across the site and back
          const k = (t / 3200) % 2, along = k < 1 ? k : 2 - k;
          const w = project({ x: SHOP.x + 0.6 + along * 1.6, y: SHOP.y + 0.9 });
          scenery.drawProp(ctx, carry, w.x, w.y, v.s, dpr, 0, k >= 1);
        } else {
          // The walls are up: the workers are where the picture has room for them, measured in its own pixels
          // from its ground point. One hammers up on the scaffold; one carries planks along the front wall,
          // between the ladder and the doorway, and back.
          const at = (px: number, py: number) => ({ x: corner.x + px * v.s, y: corner.y + py * v.s });
          const h = at(-61, -101);
          scenery.drawProp(ctx, hammer, h.x, h.y, v.s, dpr);
          const k = (t / 3400) % 2, along = k < 1 ? k : 2 - k;
          const w = at(-84 + along * 70, -58 + along * 8);
          scenery.drawProp(ctx, carry, w.x, w.y, v.s, dpr, 0, k >= 1);
        }
        // its name, over the top of whatever stands there now
        const [, tall] = scenery.anchorOf(shopArt);
        signs.push(() => label(ctx, `Popoto Shop · ${words.current.th ? "กำลังสร้าง" : "being built"}`, corner.x, corner.y - (tall - 4) * v.s,
          "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      } });
    }
    // The fishing deck at the river, as it stands at its stage: going up, with popoto builders in a hurry at it; or
    // finished, with its places to fish from.
    const pierArt = `pier${PIER.stage}`;
    if (scenery?.has(pierArt)) {
      // The picture is stood by the platform's left corner post, out in the river (so its bare frame is over the water
      // and its boards on the bank); everything else is measured from the picture's ground point, in its own pixels.
      const post = project(PIER.post);
      const feet = { x: post.x + 216 * v.s, y: post.y + 170 * v.s };
      const t = reducedRef.current ? 0 : now;
      /** The hurrying builders came out a little smaller than the shop's: drawn up to their size. */
      const k = v.s * 1.2;
      // Behind whoever stands in front of its near edges, in front of whoever is behind its far ones: after the
      // nearest tile behind its far edge, before the nearest in front of its near one.
      // (Finished, it is walked on: it is drawn before anybody who stands on its boards, the furthest of which are out
      // on its upper jetty.)
      things.push({ depth: PIER.stage === 2 ? 50.9 : PIER.post.x + PIER.post.y + 1.1, draw: () => {
        scenery.drawProp(ctx, pierArt, feet.x, feet.y, v.s, dpr);
        if (PIER.stage === 1 && scenery.has("rush_h1")) {
          // three nailing boards down as fast as they can, where the platform's floor ends and out on each jetty,
          // each stopping now and then to wipe its brow
          for (const [px, py, lag] of [[-9, -173, 0], [-159, -148, 2700], [-159, -288, 1400]]) {
            const wiping = (t + lag) % 5200 > 4300;
            scenery.drawProp(ctx, wiping ? "rush_wipe" : `rush_h${1 + (Math.floor((t + lag) / 130) % 2)}`, feet.x + px * v.s, feet.y + py * v.s, k, dpr);
          }
        }
        const [, tall] = scenery.anchorOf(pierArt);
        const built = PIER.stage === 2;
        signs.push(() => label(ctx, words.current.th ? (built ? "ลานตกปลา" : "ลานตกปลา · กำลังสร้าง") : (built ? "Fishing deck" : "Fishing deck · being built"), feet.x + 91 * v.s, feet.y - (tall + 2) * v.s,
          "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      } });
      // three running planks down the south path and across to where its steps will be, and back for more, one
      // after another
      if (PIER.stage === 1 && scenery.has("rush1")) for (const lag of [0, 0.67, 1.33]) {
        const trip = (t / 1550 + lag) % 2, d = (trip < 1 ? trip : 2 - trip) * 4.6;
        const at = d < 3.2 ? { x: 31.6 - 0.22 * d, y: 38.4 + 0.97 * d } : { x: 30.9 - (d - 3.2) * 0.93, y: 41.5 + (d - 3.2) * 0.1 }, c = project(at);
        things.push({ depth: at.x + at.y, draw: () =>
          scenery.drawProp(ctx, `rush${[1, 2, 3, 2][Math.floor(t / 90) % 4]}`, c.x, c.y, k, dpr, 0, trip < 1) });
      }
    }
    // Whoever has a line in the water: their float rides where it lands (mine twitches at a nibble and goes under at
    // the bite; the rod and the line are drawn with whoever holds them). Where I stand at a place to fish from with
    // no line out, a faint float shows where one would land.
    {
      const stay = sessionRef.current, floats: Array<{ at: Vec; state: LineState | "idle"; id: string }> = [];
      for (const a of stay ? [stay.self, ...stay.avatars.values()] : []) {
        const rod = rodOf(a, a === stay!.self);
        if (rod && rod.state !== "ready") floats.push({ at: rod.float, state: rod.state, id: a.info.id });
      }
      const here = isRod(handRef.current) ? fishAtRef.current : null;
      if (here && stay && !floats.some((fl) => fl.id === stay.self.info.id)) floats.push({ at: here.float, state: "idle", id: stay.self.info.id });
      for (const fl of floats) {
        if (!onScreen(project(fl.at))) continue;
        things.push({ depth: fl.at.x + fl.at.y, draw: () => {
          const at = floatOn(fl.at, fl.state, fl.id, now);
          ctx.save();
          ctx.globalAlpha = fl.state === "idle" || fl.state === "bite" ? 0.45 : 1;
          drawIcon(ctx, iconImg.current, "bobber", at.x, at.y, 13 * v.s);
          ctx.restore();
        } });
      }
    }
    // The cooking yard going up below the plaza, lying across the screen: the site, and popoto builders at it.
    const kitchenArt = `kitchen${KITCHEN.stage}`;
    if (scenery?.has(kitchenArt)) {
      // stood by its ground point, the middle of its front by the way in; the builders are measured from it, in the
      // picture's own pixels
      const feet = project(KITCHEN.foot);
      const t = reducedRef.current ? 0 : now, k = v.s * 1.2;
      // It lies across the screen, so everybody behind its back kerb or beside it is further off than its front:
      // drawn as far forward as its front kerb, in front of them and behind whoever stands before it. Finished, it
      // is stood on: drawn as far back as its back kerb, behind everybody on its floor; and what stands on it is
      // drawn again over whoever stands behind it, each piece where its own foot is (its stoves and tables, the
      // fire, the jar and the tub; the posts of its front kerb).
      const built = KITCHEN.stage === 2, down = KITCHEN.foot.x + KITCHEN.foot.y;
      // From outside it is a house: its walls and its roof, and nothing of what is in it. The roof is on as far as
      // `roof` says; while it comes off or goes on, the yard shows through it.
      const house = built && scenery.has("kitchenHouse"), roof = house ? roofRef.current : 0;
      roofSeen.current = roof;
      if (built && roof < 1) {
        // the camp fire, burning: as far forward as its own foot
        const [fx, fy] = KITCHEN.lights.fire;
        things.push({ depth: down + fy / (TILE_H / 2) + 0.01, draw: () => drawFlames(ctx, feet.x + fx * v.s, feet.y + fy * v.s, v.s, now) });
        for (const st of KITCHEN.stands) if (st.rise) {
          const part: [number, number, number, number] = [st.box[0], st.box[1], st.box[2], st.box[1] + st.rise];
          things.push({ depth: down + (st.box[1] + st.rise) / (TILE_H / 2) + 0.01, draw: () => scenery.drawPart(ctx, kitchenArt, feet.x, feet.y, v.s, dpr, part) });
        }
        for (const post of KITCHEN.posts) things.push({ depth: down - 0.7, draw: () => scenery.drawPart(ctx, kitchenArt, feet.x, feet.y, v.s, dpr, post) });
        // each dining table's own top again, over whoever sits on the bench behind it
        for (const top of KITCHEN.tops) things.push({ depth: down + top[1] / (TILE_H / 2) + 0.03, draw: () => scenery.drawPart(ctx, kitchenArt, feet.x, feet.y, v.s, dpr, top) });
        // and each place at a table, for a tap to sit down at it
        if (roof < 0.5) KITCHEN.seats.forEach((seat, i) => {
          const c = project(seat.at);
          benchBoxes.current.push({ i: YARD_SEATS + i, x0: c.x - 27 * v.s, y0: c.y - 30 * v.s, x1: c.x + 27 * v.s, y1: c.y + 14 * v.s, depth: seat.at.x + seat.at.y });
        });
      }
      if (house && roof > 0) things.push({ depth: down - 0.75, draw: () => {
        ctx.save();
        ctx.globalAlpha *= roof;
        scenery.drawProp(ctx, "kitchenHouse", feet.x, feet.y, v.s, dpr);
        ctx.restore();
      } });
      {
        const [, tall] = scenery.anchorOf(roof > 0.5 ? "kitchenHouse" : kitchenArt), th = words.current.th;
        signs.push(() => label(ctx, th ? (built ? "ลานทำอาหาร" : "ลานทำอาหาร · กำลังสร้าง") : (built ? "Cooking yard" : "Cooking yard · being built"), feet.x, feet.y - (tall + 2) * v.s,
          "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      }
      if (roof < 1) things.push({ depth: built ? down - 15.6 : down - 0.8, draw: () => {
        scenery.drawProp(ctx, kitchenArt, feet.x, feet.y, v.s, dpr);
        if (KITCHEN.stage === 1 && scenery.has("rush_h1")) {
          // one at a stove that is still half walled, one nailing a worktable's frame together, one on the bare
          // earth by the string line
          for (const [px, py, lag] of [[67, -172, 900], [54, -114, 3400], [199, -203, 2100]]) {
            const wiping = (t + lag) % 5200 > 4300;
            scenery.drawProp(ctx, wiping ? "rush_wipe" : `rush_h${1 + (Math.floor((t + lag) / 130) % 2)}`, feet.x + px * v.s, feet.y + py * v.s, k, dpr);
          }
        }
      } });
      // three running planks down from the east path to its right side, where the planks are stacked, and back for
      // more, one after another
      if (KITCHEN.stage === 1 && scenery.has("rush1")) for (const lag of [0, 0.67, 1.33]) {
        const trip = (t / 1700 + lag) % 2, along = trip < 1 ? trip : 2 - trip;
        const at = { x: 50.5 + 0.1 * along, y: 35.6 + 5 * along }, c = project(at);
        things.push({ depth: at.x + at.y, draw: () =>
          scenery.drawProp(ctx, `rush${[1, 2, 3, 2][Math.floor(t / 90) % 4]}`, c.x, c.y, k, dpr, 0, trip < 1) });
      }
    }
    // The gateways between the maps, each over its path's end: a tap on one walks there, and through.
    if (scenery?.has("gateway")) for (const g of GATES) {
      const c = project(g.arch);
      if (!onScreen(c)) continue;
      things.push({ depth: g.arch.x + g.arch.y, draw: () => {
        scenery.drawProp(ctx, "gateway", c.x, c.y, v.s, dpr, 0, !!g.across);
        const [gw, gh] = scenery.sizeOf("gateway");
        gateBoxes.current.push({ to: g.tiles[0], x0: c.x - (gw / 2) * v.s, y0: c.y - gh * v.s, x1: c.x + (gw / 2) * v.s, y1: c.y });
        const th = words.current.th;
        const leads = g.leads === "farm" ? (th ? "ไปแปลงผัก" : "To the farm") : g.leads === "forest" ? (th ? "ไปป่า" : "To the forest") : (th ? "กลับเข้าเมือง" : "Back to town");
        signs.push(() => label(ctx, leads, c.x, c.y - (gh + 4) * v.s, "#e5cc80", "rgba(15,19,25,0.82)", popotoImg.current));
      } });
    }
    // The farm, beyond the east gate (a map of its own): what stands about it. Its trees sway as the town's do.
    // The farm's plots: weeds, tilled soil, what grows (drawn by the farm's own code, once it has loaded).
    if (gameRef.current) {
      const frame = {
        ctx, things, project, onScreen, s: v.s, now, img: iconImg.current, still: reducedRef.current, th: words.current.th,
        indoors: !(KITCHEN.stage === 2 && !!scenery?.has("kitchenHouse") && roofRef.current >= 1),
        self: mine ? { x: mine.pos.x, y: mine.pos.y } : null,
        people: () => (stay ? [stay.self, ...stay.avatars.values()] : []).filter((a) => a.byeAt === undefined)
          .map((a) => ({ id: a.info.id, x: a.pos.x, y: a.pos.y, moving: a.path.length > 0, hold: ((a.info.hold || null) as ItemId | null) })),
        sign: (text: string, x: number, y: number) => { signs.push(() => label(ctx, text, x, y, "#e5cc80", "rgba(15,19,25,0.82)")); },
      };
      if (placeRef.current === "farm") farmDraw.current?.(frame);
      if (placeRef.current === "forest") forestDraw.current?.(frame);
      bugsDraw.current?.(frame);
      // the pots of food that stand about, wherever they were set down
      cookDraw.current?.(frame);
    }
    if (scenery && placeRef.current === "farm") for (const p of FARM_PROPS) {
      const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
      if (!onScreen(c) || !scenery.has(p.kind)) continue;
      things.push({ depth: p.x + p.y + 1, draw: () =>
        scenery.drawProp(ctx, p.kind, c.x, c.y, v.s * (PROP_K[p.kind] ?? 1), dpr, 0, false, swayOf(p, now)) });
    }
    // The forest, beyond the north gate (a map of its own): its trees, bamboo and rocks, what lies and grows under
    // them, the camp and its fire, the great tree and the waterfall.
    if (scenery && placeRef.current === "forest") {
      // (whatever tall stands in front of me is drawn faint, so that nobody is lost to their own sight in the woods)
      const me = mine ? { at: project(mine.pos), depth: mine.pos.x + mine.pos.y } : null;
      const faint = (name: string, c: Vec, k: number, depth: number) => {
        if (!me || depth <= me.depth) return false;
        const [w, h] = scenery.sizeOf(name);
        return h * k > 60 * v.s && Math.abs(c.x - me.at.x) < (w / 2) * k && c.y - h * k < me.at.y - 12 * v.s;
      };
      const stand = (name: string, c: Vec, k: number, depth: number, draw: () => void) => things.push({ depth, draw: () => {
        const dim = faint(name, c, k, depth);
        if (dim) ctx.globalAlpha = 0.38;
        draw();
        if (dim) ctx.globalAlpha = 1;
      } });
      for (const p of FOREST_PROPS) {
        if (p.kind === "flowers") continue;
        const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
        if (!onScreen(c)) continue;
        const name = scenery.has(p.kind) ? p.kind : FOREST_STAND_IN[p.kind];
        if (!name || !scenery.has(name)) continue;
        const k = v.s * (PROP_K[p.kind] ?? 1);
        stand(name, c, k, p.x + p.y + 1, () => {
          scenery.drawProp(ctx, name, c.x, c.y, k, dpr, 0, false, swayOf(p, now));
          if (p.kind === "campfire") drawFlames(ctx, c.x, c.y - 7 * v.s, v.s, now);
          // a log by the fire is sat on like a bench: where it is on the screen, a little larger, for taps and the cursor
          if (p.kind === "logseat") {
            const [w, h] = scenery.sizeOf(name), [ax, ay] = scenery.anchorOf(name), pad = 8;
            benchBoxes.current.push({ i: benchIndex.get(p) ?? -1, x0: c.x - ax * k - pad, y0: c.y - ay * k - pad, x1: c.x + (w - ax) * k + pad, y1: c.y + (h - ay) * k + pad, depth: p.x + p.y });
          }
        });
      }
      // the woods beyond the forest's south edge, which its gate is in: trees to look at, where no map is
      for (const p of BEYOND_PROPS.south) {
        const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
        if (!onScreen(c)) continue;
        const name = scenery.has(p.kind) ? p.kind : FOREST_STAND_IN[p.kind] ?? p.kind;
        if (scenery.has(name)) stand(name, c, v.s, p.x + p.y + 1, () => scenery.drawProp(ctx, name, c.x, c.y, v.s, dpr, 0, false, swayOf(p, now)));
      }
      if (scenery.has("greattree")) {
        const c = project({ x: GREAT_TREE.x + GREAT_TREE.w - 0.1, y: GREAT_TREE.y + GREAT_TREE.h - 0.1 }), k = v.s * (PROP_K.greattree ?? 1);
        stand("greattree", c, k, GREAT_TREE.x + GREAT_TREE.y + GREAT_TREE.w + GREAT_TREE.h - 1, () => scenery.drawProp(ctx, "greattree", c.x, c.y, k, dpr));
      }
      if (scenery.has("waterfall")) {
        const c = project(WATERFALL);
        things.push({ depth: WATERFALL.x + WATERFALL.y, draw: () => scenery.drawProp(ctx, "waterfall", c.x, c.y, v.s * (PROP_K.waterfall ?? 1), dpr, reducedRef.current ? 0 : now) });
      }
    }
    // The woods beyond the town's north edge, which the path runs on into: trees to look at, where no map is.
    if (scenery && placeRef.current === "town") for (const p of BEYOND_PROPS.north) {
      const c = project({ x: p.x + 0.5, y: p.y + 0.62 });
      if (!onScreen(c)) continue;
      const name = scenery.has(p.kind) ? p.kind : FOREST_STAND_IN[p.kind] ?? p.kind;
      if (scenery.has(name)) things.push({ depth: p.x + p.y + 1, draw: () => scenery.drawProp(ctx, name, c.x, c.y, v.s, dpr, 0, false, swayOf(p, now)) });
    }
    // The two who keep shop in front of the Popoto Shop: the uncle at his stall, the banker at his counter.
    if (scenery?.has("stall") && scenery.has("un_stand")) for (const kp of KEEPERS) {
      const uncle = kp.id === "uncle", stand = project(kp.stand), at = project(kp.at);
      if (!onScreen(stand)) continue;
      things.push({ depth: kp.stand.x + kp.stand.y, draw: () => scenery.drawProp(ctx, uncle ? "stall" : "bankdesk", stand.x, stand.y, v.s, dpr) });
      // Each has a little round of its own, by the clock: mostly standing; the uncle waves, holds up his wares and
      // laughs, the banker writes in his ledger, holds up a coin and bows.
      const beat = reducedRef.current ? 0 : Math.floor(now / 700) % 14;
      const frame = uncle
        ? (beat === 3 ? "un_wave" : beat === 7 || beat === 8 ? "un_show" : beat === 12 ? "un_laugh" : "un_stand")
        : (beat === 1 || beat === 2 ? "bk_write" : beat === 6 ? "bk_coin" : beat === 10 ? "bk_bow" : "bk_stand");
      things.push({ depth: kp.at.x + kp.at.y, draw: () => {
        // both came out about one and a half times a builder's size: drawn down to a popoto's
        const size = v.s * (uncle ? 0.78 : 0.72);
        scenery.drawProp(ctx, frame, at.x, at.y, size, dpr);
        // a tap on either of them, the popoto or what it stands at, opens a talk
        const [fw, fh] = scenery.sizeOf(frame), [sw, sh] = scenery.sizeOf(uncle ? "stall" : "bankdesk");
        keeperBoxes.current.push({ id: kp.id,
          x0: Math.min(at.x - (fw / 2) * size, stand.x - (sw / 2) * v.s), y0: Math.min(at.y - fh * size, stand.y - sh * v.s),
          x1: Math.max(at.x + (fw / 2) * size, stand.x + (sw / 2) * v.s), y1: Math.max(at.y, stand.y) });
        const [, tall] = scenery.anchorOf(uncle ? "un_stand" : "bk_stand");
        const th = words.current.th;
        signs.push(() => label(ctx, uncle ? (th ? "ลุงขายของ" : "Uncle's stall") : (th ? "นายธนาคาร" : "The banker"), at.x, at.y - tall * size - 10,
          "#e5cc80", "rgba(15,19,25,0.82)"));
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
    // Road works closing the north path, a popoto waving its flag there (the east path's are finished: it leads to the farm).
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
      if (scenery?.has("fountain")) {
        scenery.drawProp(ctx, "fountain", c.x, c.y, v.s, dpr, reducedRef.current ? 0 : now);
        const [fw, fh] = scenery.sizeOf("fountain");
        fountainBox.current = { x0: c.x - (fw / 2) * v.s, y0: c.y - fh * v.s, x1: c.x + (fw / 2) * v.s, y1: c.y };
      } else drawFountain(ctx, now);
    } });
    if (stay) {
      // (whoever is under the cooking yard's roof is not seen from outside it, nor their name)
      const roofOn = KITCHEN.stage === 2 && !!scenery?.has("kitchenHouse") && roofRef.current >= 1;
      for (const a of stay.avatars.values()) {
        if (a.byeAt !== undefined || (roofOn && onYard(Math.floor(a.pos.x), Math.floor(a.pos.y)))) continue;
        things.push({ depth: depthOf(a), draw: () => drawAvatar(ctx, a, false, names, boxes, !live, wall, now, dpr) });
      }
    }
    if (mine) things.push({ depth: depthOf(mine), draw: () => drawAvatar(ctx, mine, true, names, boxes, false, wall, now, dpr) });
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    // The weather (lib/town/weather), then the time of day: the town multiplied by the
    // sky's colour, then the lamps' light.
    drawWeather(ctx, cw, ch, now, dt);
    drawDaylight(ctx, cw, ch, now);
    for (const sign of signs) sign();
    for (const n of names) n();
    hits.current = boxes;
    // Through a gate: the other map comes up out of the dark.
    const since = now - warpedAt.current;
    if (since < 450 && !reducedRef.current) {
      ctx.fillStyle = `rgba(10,13,18,${(1 - since / 450).toFixed(3)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    drawCursor(ctx, now, dpr);
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

  /** The place at one of the cooking yard's tables somebody is sitting at (not just walking away from it), if any. */
  function tableSeatOf(a: Avatar) {
    return a.path.length ? undefined : yardSeat(a.info.sit);
  }

  /** Whether somebody is sitting, on a bench, at a table or on the ground (not while walking off). */
  function sitting(a: Avatar) {
    return !!seatOf(a) || !!tableSeatOf(a) || ((a.info.sit ?? -1) === SIT_HERE && !a.path.length);
  }

  /** Where somebody is drawn in the back-to-front order. */
  function depthOf(a: Avatar): number {
    // at a table of the cooking yard: on its bench. On the far one that is behind the table's top, which is drawn
    // again over their legs (see where the yard is drawn)
    const place = tableSeatOf(a);
    if (place) return KITCHEN.foot.x + KITCHEN.foot.y + (place.back ? place.py : KITCHEN.tops[place.table][1]) / (TILE_H / 2) + 0.02;
    const b = seatOf(a);
    if (!b) return a.pos.x + a.pos.y;
    return b.x + b.y + 1 + (b.facing === "NE" || b.facing === "NW" ? -0.01 : 0.01);
  }

  /** On screen: the seat of the bench they sit on, or where they stand. */
  function spotOf(a: Avatar): Vec {
    const place = tableSeatOf(a);
    if (place) return project(place.at);
    const b = seatOf(a);
    if (!b) return project(a.pos);
    const c = project({ x: b.x + 0.5, y: b.y + 0.62 });
    return { x: c.x, y: c.y - (b.kind === "logseat" ? LOG_LIFT : SEAT_LIFT) * cam.current.s };
  }

  /** What somebody is doing with a rod, if anything: where their float lands (from where they stand), and what their line is doing. Mine is known to the moment; another's is what they told the room. */
  function rodOf(a: Avatar, isMe: boolean): { float: Vec; state: LineState | "ready" } | null {
    const n = a.info.fish ?? 0;
    if (!n || a.path.length) return null;
    const place = fishFrom(Math.floor(a.pos.x), Math.floor(a.pos.y));
    if (!place) return null;
    return { float: place.float, state: isMe ? lineRef.current ?? "ready" : n === 3 ? "fight" : n === 2 ? "wait" : "ready" };   // (4, one just landed: the rod is up again)
  }

  /** Where a float is drawn on the screen: where it lands, bobbing (each to its own beat), lower at a nibble and under at the bite. */
  function floatOn(at: Vec, state: string, id: string, now: number): Vec {
    const v = cam.current, w = project(at);
    const bob = reducedRef.current ? 0 : Math.sin(now / 420 + id.charCodeAt(0)) * 1.5 * v.s;
    return { x: w.x, y: w.y + bob + (state === "bite" ? 7 : state === "nibble" ? 3 : 0) * v.s - 13 * v.s * 0.3 };
  }

  /**
   * The rod somebody fishes with, and their line (the owner, 2026-10-03: "ตอนตกปลา อยากให้มีรูป คันเบ็ดที่ใช้ด้วย ตอนนี้เหมือน
   * มีแต่สาย"): a bamboo cane from the hands up and out towards the water, in the dolls' own pixels, and the line
   * from its tip to the float. Upright with no line out; leaning out over the water with one; dipping at the bite;
   * bent hard and shaking with a fish on.
   */
  function drawRod(ctx: CanvasRenderingContext2D, p: Vec, h: number, rod: { float: Vec; state: LineState | "ready" }, id: string, now: number, which: RodId = "rod", held?: 1 | -1) {
    const wood = ROD_LOOKS[which];
    const v = cam.current, px = Math.max(1, v.s), still = reducedRef.current;
    // (only held, not fished with: on the side they face, with no float to lean towards)
    const to = held ? p : floatOn(rod.float, rod.state, id, now), side = held ?? (to.x >= p.x ? 1 : -1);
    const hand = { x: p.x + side * h * 0.2, y: p.y - h * 0.42 }, long = 34 * v.s;
    // how far it leans from upright, how much its tip bends towards the float, and its shake
    const lean = rod.state === "ready" ? 0.3 : rod.state === "fight" ? 0.85 : rod.state === "bite" ? 0.8 : 0.62;
    const bend = rod.state === "fight" ? 0.75 : rod.state === "bite" ? 0.5 : rod.state === "nibble" ? 0.2 : 0.06;
    const shake = still ? 0 : rod.state === "fight" ? Math.sin(now / 55) * 0.05 : rod.state === "nibble" ? Math.sin(now / 45) * 0.04 : 0;
    const dir = (a: number, far: number) => ({ x: hand.x + side * Math.sin(a) * far, y: hand.y - Math.cos(a) * far });
    const knee = dir(lean + shake - bend * 0.5, long * 0.6), tip = dir(lean + shake + bend * 0.5, long);
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * hand.x + 2 * t * (1 - t) * knee.x + t * t * tip.x,
      y: (1 - t) * (1 - t) * hand.y + 2 * t * (1 - t) * knee.y + t * t * tip.y,
    });
    const steps = Math.ceil(long / px), snap = (n: number) => Math.round(n / px) * px;
    ctx.save();
    // its dark edge first, then the cane: thicker at the grip, with a joint every few pixels
    ctx.fillStyle = wood.edge;
    for (let i = 0; i <= steps; i++) { const q = at(i / steps), w = i < steps * 0.45 ? 2 : 1; ctx.fillRect(snap(q.x) - px, snap(q.y) - px, (w + 2) * px, 3 * px); }
    for (let i = 0; i <= steps; i++) {
      const q = at(i / steps), w = i < steps * 0.45 ? 2 : 1;
      ctx.fillStyle = i < steps * 0.16 ? wood.grip : i % 6 === 0 ? wood.joint : wood.cane;
      ctx.fillRect(snap(q.x), snap(q.y), w * px, px);
    }
    // a better rod has a reel by its grip
    if (wood.reel) {
      const q = at(0.2);
      ctx.fillStyle = wood.edge;
      ctx.fillRect(snap(q.x) + side * 2 * px - px, snap(q.y) - px, 4 * px, 4 * px);
      ctx.fillStyle = wood.reel;
      ctx.fillRect(snap(q.x) + side * 2 * px, snap(q.y), 2 * px, 2 * px);
    }
    // the line: slack while it waits, tight with a fish on
    if (rod.state !== "ready") {
      const end = at(1), sag = rod.state === "fight" || rod.state === "bite" ? 0 : 7 * v.s;
      ctx.strokeStyle = "rgba(240,240,235,0.9)";
      ctx.lineWidth = Math.max(1, v.s * 0.6);
      ctx.beginPath();
      ctx.moveTo(snap(end.x) + px / 2, snap(end.y));
      ctx.quadraticCurveTo((end.x + to.x) / 2, (end.y + to.y) / 2 + sag, to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * What somebody holds in their hand (the owner, 2026-10-03: "ของทุกชิ้นสามารถ กดใส่เพื่อถือในมือได้เช่น คันเบ็ดหรือปลา"): the
   * thing's own picture at their side, on the side they face, with their fist on it. (A rod is drawn as the rod it
   * is, upright; and while somebody fishes, the rod they fish with is what is seen.)
   */
  function drawHeld(ctx: CanvasRenderingContext2D, p: Vec, h: number, item: string, side: 1 | -1, look: Look, id: string, now: number) {
    if (isRod(item)) { drawRod(ctx, p, h, { float: { x: 0, y: 0 }, state: "ready" }, id, now, item, side); return; }
    // (its picture is its own name's, but every scroll looks the same: lib/town/items' iconOf, without the catalog)
    const icon = (item.startsWith("scroll") ? "scroll" : item) as IconName;
    if (!(icon in ICON_ATLAS.icons)) return;
    const v = cam.current, px = Math.max(1, v.s), size = Math.round(15 * v.s);
    const snap = (n: number) => Math.round(n / px) * px;
    const x = snap(p.x + side * h * 0.27), y = snap(p.y - h * 0.36);
    drawIcon(ctx, iconImg.current, icon, x, y - size * 0.25, size);
    // the fist that holds it: a few pixels of their own skin, edged dark
    ctx.save();
    ctx.fillStyle = "#2a1b12";
    ctx.fillRect(x - 2 * px, y - px, 4 * px, 4 * px);
    ctx.fillStyle = SKINS[look.skin]?.hex ?? "#e8b98f";
    ctx.fillRect(x - px, y, 2 * px, 2 * px);
    ctx.restore();
  }

  /** Which way somebody faces: the way they walk; after standing a while, towards you; with a rod out, towards their float. */
  function facingOf(a: Avatar, isMe: boolean, now: number): { view: View; mirror: boolean } {
    if (isMe && wardrobeOpenRef.current) return TURNS[((turn.current % TURNS.length) + TURNS.length) % TURNS.length];
    const rod = rodOf(a, isMe);
    if (rod) return facingFor(rod.float.x - a.pos.x, rod.float.y - a.pos.y);
    // Eating on the ground: towards the viewer, the way they last faced.
    if (a.info.eat && (a.info.sit ?? -1) === SIT_HERE && !a.path.length) return { view: "front", mirror: facings.current.get(a.info.id)?.mirror ?? false };
    const seat = seatOf(a);
    if (seat?.facing) return FACINGS[seat.facing];
    // at a table: towards it, and a little towards the fire in the middle of the yard
    const place = tableSeatOf(a);
    if (place) return { view: place.back ? "back" : "front", mirror: place.table === 1 };
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
    const look = lookOf(a);
    const kit = kitFor(look.race);
    // sitting, the name and the tap box come down with the head
    const h = (kit?.heightOf(look) ?? DOLL_H) * k * (sitting(a) ? SIT_HEIGHT : 1);
    const voice = sessionRef.current?.voice;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const talking = a.info.voice && !a.info.muted && level > 0.06;
    // On another page of the site: still here, still talking, not watching.
    const away = !isMe && a.info.away;
    const moving = a.path.length > 0;
    // The dolls' steps carry their own bounce; the stand-in figure bobs.
    const bob = !kit && moving && !reducedRef.current ? Math.abs(Math.sin(now / 1000 * Math.PI * 2.4)) * 3.2 * k : 0;
    ctx.save();
    if (faded) ctx.globalAlpha = 0.4;
    else if (away) ctx.globalAlpha = 0.6;

    // A shadow (not on a bench: the bench has the ground), and a ring at the feet while they speak.
    if (!seatOf(a) && !tableSeatOf(a)) {
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

    const face = facingOf(a, isMe, now);
    // Blinks, now and then, each on their own clock.
    let blink = false;
    if (!reducedRef.current) {
      const next = blinks.current.get(a.info.id) ?? now + 1500 + Math.random() * 3000;
      if (now > next + BLINK_MS) blinks.current.set(a.info.id, now + 2600 + Math.random() * 3400);
      else blinks.current.set(a.info.id, next);
      blink = now >= next && now <= next + BLINK_MS;
    }
    // Eating (the owner, 2026-10-03: "อนิเมชั่นการนั่งกิน แบบง่ายๆ … ของทุกเผ่า ทุกเพศ … ขนาดตัวที่ทำไว้ต้องไม่เปลี่ยนแปลง"): the
    // sitting doll they have already, with its own mouth; a bite every few seconds, each on their own beat: a morsel
    // goes up from the dish, the mouth opens for it, and chews.
    const eats = !!a.info.eat && a.info.eat in ICON_ATLAS.icons && sitting(a);
    const bite = eats && !reducedRef.current ? ((now + a.info.id.charCodeAt(0) * 173) % BITE_MS) / BITE_MS : -1;
    const chew = bite >= 0.3 && (bite < 0.42 || (bite < 0.9 && Math.floor(now / 170) % 2 === 0));
    const talk = eats ? chew : talking && Math.floor(now / 150) % 2 === 1;
    // A rod in their hands, or whatever else they hold: behind them when they face away; in front otherwise.
    // (what is held is held walking too: the owner, "ตอนนี้ถือแล้ว เดินของที่ถือจะหายไป")
    const rod = rodOf(a, isMe), held = !rod ? a.info.hold || null : null;
    const handSide = (face.view === "back") !== face.mirror ? -1 : 1;
    const fishesWith: RodId = isRod(a.info.hold) ? a.info.hold : "rod";
    if (rod && face.view === "back") drawRod(ctx, p, h, rod, a.info.id, now, fishesWith);
    if (held && face.view === "back") drawHeld(ctx, p, h, held, handSide, look, a.info.id, now);
    if (kit) {
      // Everybody on their own foot: a step offset from their id.
      const step = moving ? Math.floor(now / 1000 * WALK_FPS) + (a.info.id.charCodeAt(0) & 3) : undefined;
      kit.draw(ctx, look, face.view, face.mirror, p.x, p.y, k, { step, blink, talk, sit: sitting(a) }, dpr);
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
    if (rod && face.view !== "back") drawRod(ctx, p, h, rod, a.info.id, now, fishesWith);
    if (held && face.view !== "back") drawHeld(ctx, p, h, held, handSide, look, a.info.id, now);

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
    // What they are eating: the dish set down before them, on the side they face, and a morsel on its way up to
    // their mouth (when they face the viewer, and their picture says where the mouth is).
    if (eats) {
      const side = face.mirror ? -1 : 1, size = 17 * k, px = Math.max(1, k);
      const dish = { x: p.x + side * h * 0.5, y: p.y - size * 0.3 };
      drawIcon(ctx, iconImg.current, a.info.eat as IconName, dish.x, dish.y, size);
      const mouth = kit?.mouthOf(look, face.view, face.mirror, k, true);
      if (mouth && bite >= 0 && bite < 0.34) {
        const t = bite / 0.34, from = { x: dish.x, y: dish.y - size * 0.35 }, to = { x: p.x + mouth.x, y: p.y + mouth.y };
        // up in an arc, a little towards the viewer
        const mx = from.x + (to.x - from.x) * t, my = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 5 * k;
        const snap = (n: number) => Math.round(n / px) * px;
        ctx.fillStyle = "#3d2913";
        ctx.fillRect(snap(mx) - 2 * px, snap(my) - 2 * px, 4 * px, 4 * px);
        ctx.fillStyle = "#f6e7c4";
        ctx.fillRect(snap(mx) - px, snap(my) - px, 2 * px, 2 * px);
      }
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
      // whoever has carried enough water to the farm's well has a name for it, under their own
      const rank = ranksRef.current.ranks[isMe ? ranksRef.current.me : a.info.id] ?? 0;
      if (rank > 0) tag(ctx, RANK_TITLES[rank - 1][words.current.th ? 0 : 1], p.x, p.y + 31, RANK_INK[rank - 1]);
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

  /** A few small words under a name: what somebody is called for what they have done. */
  function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fg: string) {
    ctx.font = `600 10px ${fontRef.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = "rgba(15,19,25,0.72)";
    roundRect(ctx, x - w / 2, y - 8, w, 16, 8);
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
    const bb = boardBox.current;
    if (bb && x >= bb.x0 && x <= bb.x1 && y >= bb.y0 && y <= bb.y1) { setPopover(null); openBoard(); return; }
    // the fountain: a wish (the game's: until it is open to me, the fountain is only a fountain)
    const fb = fountainBox.current;
    if (gameRef.current && fb && x >= fb.x0 && x <= fb.x1 && y >= fb.y0 && y <= fb.y1) { setPopover(null); openFountain(); return; }
    // a shopkeeper: a talk; a gateway: walk to it, and through
    const keeper = keeperBoxes.current.find((k) => x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1);
    if (keeper) { setPopover(null); openTalk(keeper.id); return; }
    const gate = gateBoxes.current.find((k) => x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1);
    if (gate) {
      setPopover(null); setPeopleOpen(false);
      if (sessionRef.current?.walkTo({ x: gate.to[0], y: gate.to[1] })) cam.current.follow = true;
      return;
    }
    // a bench, anywhere on its picture: walk up to it and sit down
    const seat = benchUnder(x, y);
    if (seat >= 0) { setPopover(null); setPeopleOpen(false); if (sessionRef.current?.sitOn(seat)) cam.current.follow = true; return; }
    setPopover(null);
    setPeopleOpen(false);
    // with a net in the hand, a tap on an insect within reach is a swing at it
    if (gameRef.current && bugsTap.current) {
      const v = cam.current, iso = toIsoPoint(v, x, y, v.cw, v.ch);
      if (bugsTap.current(fromIso(iso.x, iso.y))) return;
    }
    const t = tileAt(x, y);
    if (walkable(t.x, t.y) && sessionRef.current?.walkTo(t)) cam.current.follow = true;
    // A bench: walk up to it and sit down.
    else if (benchAt(t.x, t.y) >= 0 && sessionRef.current?.sitOn(benchAt(t.x, t.y))) cam.current.follow = true;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    sfxRef.current?.wake();
    const p = local(e.clientX, e.clientY);
    if (e.pointerType === "mouse") { mouseAt(e.currentTarget, p, mouse.current?.mode ?? "arrow"); mouse.current!.pressAt = performance.now(); }
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

  /** The mouse over the map: where, and which cursor; the system's hidden once ours can be drawn. */
  const mouseAt = (canvas: HTMLCanvasElement, p: { x: number; y: number }, mode: CursorMode) => {
    const was = mouse.current;
    mouse.current = { x: p.x, y: p.y, mode, inside: true, pressAt: was?.pressAt ?? -1e9 };
    const ours = !!iconImg.current?.complete && !!iconImg.current.naturalWidth;
    canvas.style.cursor = ours ? "none" : mode === "hand" ? "pointer" : mode === "grab" ? "grabbing" : "grab";
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
        const bb = boardBox.current, t = tileAt(p.x, p.y);
        const someone = !!personAt(p.x, p.y);
        const seat = !someone && (benchUnder(p.x, p.y) >= 0 || benchAt(t.x, t.y) >= 0);
        const clickable = !!b || someone || (!!bb && p.x >= bb.x0 && p.x <= bb.x1 && p.y >= bb.y0 && p.y <= bb.y1)
          || [...keeperBoxes.current, ...gateBoxes.current].some((k) => p.x >= k.x0 && p.x <= k.x1 && p.y >= k.y0 && p.y <= k.y1);
        mouseAt(e.currentTarget, p, seat ? "sit" : clickable ? "hand" : "arrow");
      }
      return;
    }
    pointers.current.set(e.pointerId, p);
    if (g.mode === "pinch" && pointers.current.size >= 2 && g.iso) {
      const [a, b] = [...pointers.current.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = clampScale(g.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), v.cw, v.ch, BOUNDS[placeRef.current]);
      // The spot under the fingers stays under the fingers, as they move and spread.
      setCam({ s: ns, cx: g.iso.x - (mx - v.cw / 2) / ns, cy: g.iso.y - (my - v.ch / 2) / ns });
      return;
    }
    if (g.mode === "tap" && Math.hypot(p.x - g.sx, p.y - g.sy) > g.slop) g.mode = "pan";
    if (g.mode === "pan") {
      setCam({ s: v.s, cx: v.cx - (p.x - g.lx) / v.s, cy: v.cy - (p.y - g.ly) / v.s });
      v.follow = false;
      if (e.pointerType === "mouse") mouseAt(e.currentTarget, p, "grab");
      else e.currentTarget.style.cursor = "grabbing";
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
      if (e.pointerType === "mouse") mouseAt(e.currentTarget, local(e.clientX, e.clientY), "arrow");
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
        return { x: p.x, y: p.y - dollH(a) * cam.current.s * 0.5 };
      },
      cam: () => ({ s: cam.current.s, cx: cam.current.cx, cy: cam.current.cy, follow: cam.current.follow }),
      /** Look at a tile without walking there (the camera stops following me). */
      lookAt: (x: number, y: number) => { const p = toIso(x, y); cam.current.follow = false; setCam({ s: cam.current.s, cx: p.x, cy: p.y }); },
      /** Stand at a tile of either map at once, without walking to a gate. */
      warp: (x: number, y: number) => sessionRef.current?.warpTo({ x: x + 0.5, y: y + 0.5 }) ?? false,
      /** Walk to a tile, as a tap on it does; and where I am now, and whether I am walking. */
      walk: (x: number, y: number) => sessionRef.current?.walkTo({ x, y }) ?? false,
      self: () => { const a = sessionRef.current?.self; return a ? { x: a.pos.x, y: a.pos.y, moving: a.path.length > 0 } : null; },
      /** The shopkeepers and the gateways on the screen this frame. */
      keepers: () => keeperBoxes.current.map((k) => ({ ...k })),
      /** The place to fish from that I stand at, if it is one: its tile, where its float lands, and whether that is deep water. */
      fishAt: () => fishAtRef.current,
      /** Whether the deck and the cooking yard are finished on this page, and whether a tile can be stood on. */
      built: () => isBuilt(),
      walkable: (x: number, y: number) => walkable(x, y),
      gates: () => gateBoxes.current.map((k) => ({ ...k })),
      /** The popoto out now: what, and where. */
      outings: () => outingsNow(Date.now(), forcedPopoto.current).map((o) => ({ activity: o.activity, at: o.spots?.[0] ?? alongRoute(o, Date.now())?.pos })),
      /** The benches on the screen this frame, and what the mouse cursor shows now. */
      benches: () => benchBoxes.current.map((b) => ({ ...b })),
      cursor: () => mouse.current?.mode ?? null,
      /** The leaves now: how many of each kind, and how many lie on the ground. */
      leaves: () => ({ fall: leaves.current.filter((l) => l.kind === "fall").length, wind: leaves.current.filter((l) => l.kind === "wind").length, gust: leaves.current.filter((l) => l.kind === "gust").length, down: leaves.current.filter((l) => l.landed > 0).length }),
      /** The sky: what the weather draws now, the light, and each cloud's shadow with its middle on the screen. */
      sky: () => ({
        weather: SKIES.weather(), raining: SKIES.raining(), known: SKIES.knows(), clock: SKIES.now(),
        effects: effects.current, day: skyNow(), fps: fpsRef.current, pace: paceRef.current, paceNow: paceNowRef.current, moving: !reducedRef.current, drops: rain.current.drops, splashes: splashes.current.filter((p) => p.x >= 0).length,
        clouds: cloudsAt(cloudDrift.current, effects.current.clouds).map((c) => ({ ...c, at: toScreen(cam.current, c, cam.current.cw, cam.current.ch) })),
      }),
      /** The Popoto Board's middle on the screen, if it is drawn. */
      board: () => (boardBox.current ? { x: (boardBox.current.x0 + boardBox.current.x1) / 2, y: (boardBox.current.y0 + boardBox.current.y1) / 2 } : null),
      /** The fountain's middle on the screen, if it is drawn. */
      fountain: () => (fountainBox.current ? { x: (fountainBox.current.x0 + fountainBox.current.x1) / 2, y: (fountainBox.current.y0 + fountainBox.current.y1) / 2 } : null),
    };
    (window as unknown as { __townView?: unknown }).__townView = handle;
    return () => { delete (window as unknown as { __townView?: unknown }).__townView; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { setCard(null); setPopover(null); setPeopleOpen(false); setHistoryOpen(false); setTrade(null); return; }
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
    setFountainOpen(false);
    setCard(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setTalk(null); setTrade(null);
    setBoardOpen(true);
  };

  /** The wishing fountain: its panel takes the board's place. */
  const openFountain = () => {
    openBoard();
    setFountainOpen(true);
  };

  /**
   * Talk to a shopkeeper. While their stall or counter is closed: a greeting, and their next conversation, in turn.
   * Open (the trial): a greeting, what they ask, and what one came for to choose from.
   */
  const openTalk = (who: Speaker) => {
    if (wardrobeOpenRef.current) closeWardrobe();
    setCard(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setBoardOpen(false); setTrade(null);
    setFishing(false);
    const hour = Math.floor(bangkokMinute(new Date()) / 60), n = ++talks.current, th = words.current.th;
    if (!gameRef.current) { setTalk({ who, n, lines: talkFor(who, hour, talkTurns.current[who]++) }); return; }
    const chat: TalkChoice = { id: "chat", label: th ? "คุยเล่น" : "Just chatting" };
    const buy: TalkChoice = { id: "buy", label: th ? "ซื้อของ" : "Buy" };
    // (his order of the day is where things are left with him: the same panel, asked for by its own name)
    const order: TalkChoice = { id: "order", label: th ? "ลุงอยากได้อะไร" : "What do you want today?" };
    // (the notice board beside his stall, where members sell to one another: asked for by its own name too, once the
    // keeper has been told there is one; with what waits there for me, when something does. The owner looked for it
    // here, 2026-10-05: "ผมยังไม่เห็นกระดานเลยนะ")
    const pinned = who === "uncle" ? keeper?.notices() ?? null : null;
    const board: TalkChoice[] = pinned ? [{ id: "board", label: th ? "กระดานฝากขาย" : "Notice board", ...(pinned.due > 0 ? { note: String(pinned.due) } : {}) }] : [];
    const choices: TalkChoice[] = who === "banker"
      ? [{ id: "bank", label: th ? "แลก popoto" : "Exchange popoto" }, chat]
      : purse.waiting > 0
        ? [{ id: "sell", label: th ? "รับเงิน" : "Collect", note: String(purse.waiting) }, buy, ...board, order, chat]
        : [buy, { id: "sell", label: th ? "ฝากขาย" : "Sell" }, ...board, order, chat];
    setTalk({ who, n, lines: askFor(who, hour, purse.waiting > 0), choices });
  };
  // Walking off my place to fish from puts the rod away, and so does letting go of it; and the room is told what I do
  // with it, and what I am eating.
  const rodInHand = isRod(purse.hand);
  useEffect(() => { handRef.current = purse.hand; }, [purse.hand]);
  useEffect(() => { if (!fishAt || !rodInHand) setFishing(false); }, [fishAt, rodInHand]);
  useEffect(() => {
    if (!fishing) lineRef.current = null;
    sessionRef.current?.setFishing(fishing ? 1 : 0);
  }, [fishing]);
  const eatingNow = purse.eating?.dish ?? null;
  useEffect(() => { sessionRef.current?.setEating(eatingNow); }, [eatingNow]);
  useEffect(() => { sessionRef.current?.setHolding(purse.hand); }, [purse.hand]);
  const landedAt = useRef(0);
  const onLine = useCallback((state: LineState | null) => {
    lineRef.current = state;
    // (for a moment after a landing the room is still being told of it)
    if (state || performance.now() - landedAt.current > 1500) sessionRef.current?.setFishing(state === "fight" ? 3 : state ? 2 : 1);
  }, []);
  /** Something landed: the room is told for a moment, so that those near enough hear it. */
  const onLanded = useCallback(() => {
    landedAt.current = performance.now();
    sessionRef.current?.setFishing(4);
    window.setTimeout(() => { if (sessionRef.current?.self.info.fish === 4) sessionRef.current.setFishing(1); }, 1500);
  }, []);

  /** One of the trade's panels: the uncle's stall, the bank, or my bag. */
  const openTrade = (view: TradeView) => {
    setFishing(false);
    if (wardrobeOpenRef.current) closeWardrobe();
    setCard(null); setPopover(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setBoardOpen(false); setTalk(null);
    setTrade(view);
  };
  /** What was chosen at the end of a talk: a chat (their next one, in turn), or one of the trade's panels. */
  const pickTalk = (who: Speaker, id: string) => {
    if (id === "chat") setTalk({ who, n: ++talks.current, lines: chatFor(who, talkTurns.current[who]++) });
    else openTrade(id === "order" ? "sell" : (id as TradeView));
  };

  const openWardrobe = () => {
    setCard(null); setPopover(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setBoardOpen(false); setTalk(null); setTrade(null);
    turn.current = 0;
    zoomBefore.current = cam.current.s;
    const v = cam.current;
    // Close to me, in the part of the screen the panel leaves.
    focus.current = phone ? { x: v.cw / 2, y: v.ch * 0.24 } : { x: (v.cw - 384) / 2, y: v.ch / 2 };
    setCam({ s: clampScale(WARDROBE_ZOOM, v.cw, v.ch, BOUNDS[placeRef.current]), cx: v.cx, cy: v.cy });
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
    a.info.eat ? ["meal", w.th ? "กำลังกินข้าว" : "Eating"] : null,
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
              onPointerLeave={() => { hover.current = null; if (mouse.current) mouse.current.inside = false; }} />

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

      {/* Top right: the wardrobe, the music, the settings, the numbers, fullscreen, the way out */}
      {s && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {/* the icon alone, like the buttons beside it: the word took too much room (the owner, 2026-10-02) */}
          <button type="button" onClick={() => (wardrobeOpen ? closeWardrobe() : openWardrobe())} aria-pressed={wardrobeOpen} title={w.wardrobe}
                  className={wardrobeOpen ? hudBtn.replace("border-line-strong bg-bg/80 text-read text-ink", "border-accent bg-accent/20 text-read text-accent") : hudBtn}>
            <TownIcon name="wardrobe" size={20} /><span className="sr-only">{w.wardrobe}</span>
          </button>
          <TownMusicButton th={w.th} hour={forcedHour.current} className={hudBtn} />
          {/* (here on a wide screen only, like the numbers: a phone's corner has no room for one more, and its cog is
              at the foot of the screen, beside the chat) */}
          {!phone && <TownSettingsButton th={w.th} pace={pace} onPace={choosePace} drawn={fpsRef} onShown={settingsShown} moving={moving} onMoving={chooseMoving} className={hudBtn} />}
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
            {/* a deal, with somebody who stands near (the trial's) */}
            {game && card.id !== me.id && s && Math.hypot(cardWho.pos.x - s.self.pos.x, cardWho.pos.y - s.self.pos.y) <= DEAL_NEAR && (
              <button type="button" onClick={() => { openDeal.current?.(cardWho.info.id, cardWho.info.name); setCard(null); }}
                      className="pressable rounded-lg bg-gold/15 px-3 py-1.5 text-ui text-gold hover:bg-gold/25"><span className="flex items-center gap-1.5"><TownIcon name="handshake" size={16} />{w.th ? "แลกของ" : "Trade"}</span></button>
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
      {s && !wardrobeOpen && !(phone && (boardOpen || !!trade)) && (() => {
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
              // (and a phone's settings beside it: whoever the town's motion makes dizzy has to be able to turn it
              // off on a phone too, and the top corner is full; the panel opens upwards from this row's left)
              <div className="pointer-events-auto relative flex w-fit items-center gap-1.5">
                <button type="button" onClick={openHistory}
                        aria-label={w.chat} className={`${hudBtn} size-11`}><TownIcon name="chat" size={22} /></button>
                <TownSettingsButton th={w.th} pace={pace} onPace={choosePace} drawn={fpsRef} onShown={settingsShown} moving={moving} onMoving={chooseMoving} low className={`${hudBtn} size-11`} />
              </div>
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

      {/* Bottom right: the emotes, and the microphone */}
      {s && !wardrobeOpen && !(phone && (chatOpen || boardOpen || !!trade || testOpen)) && (
        <div className="absolute right-3 flex flex-col items-end gap-1.5" style={{ bottom: "var(--hud-b)" }}>
          {/* The emote window (the owner, 2026-10-02: "ช่วยทำหน้าต่าง Emote ให้สามารถกดท่านั่งได้"): sit down on
              the ground where I stand, or get up; walking anywhere gets up too */}
          {emoteOpen && (() => {
            const down = (s.self.info.sit ?? -1) !== -1;
            return (
              <div role="menu" aria-label={w.emote} className="pop-in flex gap-1.5 rounded-2xl border border-line-lit bg-surface/95 p-1.5 shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
                <button type="button" role="menuitem" onClick={() => { if (down) s.standUp(); else s.sitHere(); setEmoteOpen(false); }}
                        className="pressable flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-label text-ink hover:bg-card">
                  <TownIcon name={down ? "standUp" : "sitDown"} size={30} />{down ? w.standUp : w.sitDown}
                </button>
              </div>
            );
          })()}
          {/* The test window's button (the trial's, in `next dev` only): look at every thing there is, and conjure it */}
          {TownTest && keeper?.trial && (
            <button type="button" onClick={() => { setCard(null); setPopover(null); setPeopleOpen(false); setHistoryOpen(false); if (phone) { setTrade(null); setChatOpen(false); } setTestOpen((o) => !o); }}
                    aria-expanded={testOpen} title={w.th ? "หน้าต่างทดสอบ: ดูและเสกของทุกอย่าง" : "The test window: look at everything, and conjure it"}
                    className={`pressable flex h-8 items-center rounded-full border px-3 font-data text-label font-semibold uppercase tracking-wider shadow-lg shadow-black/30 backdrop-blur-sm transition-colors ${testOpen
                      ? "border-gold bg-gold text-bg" : "border-gold/60 bg-bg/80 text-gold hover:border-gold"}`}>
              <TownIcon name="test" size={16} className="mr-1" />Test
            </button>
          )}
          {/* My bag, and my Popoto coins beside it */}
          {game && (
            <button type="button" onClick={() => (trade === "bag" ? setTrade(null) : openTrade("bag"))} aria-expanded={trade === "bag"} title={w.th ? "กระเป๋า" : "Bag"}
                    className="pressable flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-bg/80 pl-2.5 pr-3 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent">
              <TownIcon name="bag" size={20} /><span className="sr-only">{w.th ? "กระเป๋า" : "Bag"}</span>
              <TownIcon name="coin" size={14} /><span className="font-data tabular-nums text-gold">{purse.coins}</span>
              <TownIcon name="stamina" size={14} /><span className={`font-data tabular-nums ${purse.stamina ? "text-ink" : "text-chili"}`}>{purse.stamina}</span>
              <span className="sr-only">stamina</span>
            </button>
          )}
          {/* The meal I am at: how far through it I am */}
          {game && purse.eating && (
            <span className="flex h-8 items-center gap-1.5 rounded-full border border-gold/60 bg-bg/85 pl-2 pr-3 text-meta text-ink shadow-lg shadow-black/30 backdrop-blur-sm">
              <TownIcon name="meal" size={16} />{w.th ? "กำลังกิน" : "Eating"}
              <span aria-hidden className="h-1.5 w-14 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-gold" style={{ width: `${Math.round(purse.eating.progress * 100)}%` }} /></span>
              {company > 0 && <span className="font-data text-gold">+{company}</span>}
            </span>
          )}
          <button type="button" onClick={() => setEmoteOpen((o) => !o)} aria-expanded={emoteOpen} title={w.emote}
                  className={emoteOpen ? hudBtn.replace("border-line-strong bg-bg/80 text-read text-ink", "border-accent bg-accent/20 text-read text-accent") : hudBtn}>
            <TownIcon name="emote" size={22} /><span className="sr-only">{w.emote}</span>
          </button>
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
          {fountainOpen && game && keeper
            ? <Suspense fallback={null}><TownFountain keeper={keeper} th={w.th} onClose={() => setBoardOpen(false)} /></Suspense>
            : <TownBoard th={w.th} onClose={() => setBoardOpen(false)} onVoted={onVoted} art={boardArt} />}
        </div>
      )}
      {/* A talk with a shopkeeper: across the foot of the map, like a story game's box */}
      {s && talk && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-2"
             style={{ bottom: phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem" }}>
          <div className="pop-in pointer-events-auto w-full max-w-[44rem]" data-state="open">
            <TownTalk key={talk.n} who={talk.who} lines={talk.lines} choices={talk.choices} onPick={(id) => pickTalk(talk.who, id)}
                      th={w.th} phone={phone} reduced={reducedRef.current} art={boardArt} onClose={() => setTalk(null)} />
          </div>
        </div>
      )}
      {/* At a place to fish from (the deck where a line reaches water, or the town's bank), with the rod in my hand
          (the owner: "ตกปลาตรงนี้ ช่วยทำให้ขึ้นมาเฉพาะตอนถือเบ็ดตกปลา"): the way to begin, and then the rod's own panel, across
          the foot of the map */}
      {s && game && keeper && fishAt && rodInHand && !talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-2"
             style={{ bottom: phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem" }}>
          {fishing ? (
            <div className="pop-in pointer-events-auto w-full max-w-[30rem]" data-state="open">
              <Suspense fallback={null}>
                <TownFish me={keeper.id} keeper={keeper} th={w.th} rain={raining} place={fishAt} reduced={reducedRef.current} sfx={sfxRef.current!} onClose={() => setFishing(false)} onLine={onLine} onLanded={onLanded} />
              </Suspense>
            </div>
          ) : (
            <button type="button" onClick={() => { setCard(null); setPopover(null); setPeopleOpen(false); setChatOpen(false); setHistoryOpen(false); setFishing(true); }}
                    className="pop-in pressable pointer-events-auto mb-14 flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-read font-semibold text-bg shadow-xl shadow-black/40" data-state="open">
              <TownIcon name="hook" size={20} />{w.th ? "ตกปลาตรงนี้" : "Fish here"}
            </button>
          )}
        </div>
      )}
      {/* The test window (the trial's, the owner's): every thing there is, to look at and to conjure. On the left, so
          that the bag can be open beside it. */}
      {s && TownTest && keeper?.trial && testOpen && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-gold/50 bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(78%,42rem)] rounded-t-2xl"
               : "left-3 top-16 w-[24rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open">
          <Suspense fallback={null}>
            <TownTest me={me.id} name={me.name} th={w.th} onClose={() => setTestOpen(false)} />
          </Suspense>
        </div>
      )}
      {/* The farm: its plots on the map, and what the thing in my hand can do to the one I stand on */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownFarm keeper={keeper} name={me.name} th={w.th} tile={!talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) ? plotHere : null}
                    at={wellHere ? standing?.tile ?? null : fishAt?.tile ?? null} near={onFarm}
                    water={talk || trade || boardOpen || wardrobeOpen || (phone && testOpen) ? null : wellHere ? "well" : fishAt ? "river" : null} sfx={sfxRef.current}
                    bottom={phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem"} register={registerFarm} />
        </Suspense>
      )}
      {/* The forest: what lies and grows there, and gathering what is at the place I stand by */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownForest keeper={keeper} th={w.th} tile={!talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) ? standing?.tile ?? null : null} near={onForest} sfx={sfxRef.current} art={boardArt}
                      bottom={phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem"} register={registerForest} />
        </Suspense>
      )}
      {/* The insects: out on every map, and caught with a net */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownBugs keeper={keeper} th={w.th} name={me.name} sfx={sfxRef.current} busy={!!talk || !!trade || boardOpen || wardrobeOpen || fishing || (phone && testOpen)}
                    bottom={phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem"} register={registerBugs} registerTap={registerBugsTap} />
        </Suspense>
      )}
      {/* The well's book: offered to whoever stands at the farm's well */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownWell keeper={keeper} name={me.name} th={w.th} at={wellHere && !talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen)} phone={phone} tabbar={tabbar}
                    bottom={phone && tabbar ? "calc(12rem + env(safe-area-inset-bottom))" : "8rem"} sfx={sfxRef.current} />
        </Suspense>
      )}
      {/* A bucket line: water handed on to whoever stands within sight with a bucket, nearer the well */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownLine keeper={keeper} me={keeper.id} th={w.th} people={standers}
                    here={!talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) && !fishing ? standing?.tile ?? null : null}
                    bottom={phone && tabbar ? "calc(15.5rem + env(safe-area-inset-bottom))" : "11.5rem"} sfx={sfxRef.current} />
        </Suspense>
      )}
      {/* Thanks: for whoever helped the plant in the plot of mine I stand on; and being told when I am thanked */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownThanks keeper={keeper} th={w.th} tile={!talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) ? plotHere : null} near={onFarm}
                      bottom={phone && tabbar ? "calc(12rem + env(safe-area-inset-bottom))" : "8rem"} sfx={sfxRef.current} />
        </Suspense>
      )}
      {/* The kitchen: cooking at the yard, and the pots that stand about */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownCook me={keeper.id} keeper={keeper} called={me.name} th={w.th} cooks={cooks} art={boardArt} here={!talk && !trade && !boardOpen && !wardrobeOpen && !(phone && testOpen) && !plotHere && !fishing ? standing : null} crew={crew} sfx={sfxRef.current}
                    bottom={phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem"} register={registerCook} />
        </Suspense>
      )}
      {/* A deal with somebody: what each lays out, and their word */}
      {s && game && keeper && (
        <Suspense fallback={null}>
          <TownDeal me={keeper.id} keeper={keeper} name={me.name} th={w.th} sfx={sfxRef.current} register={registerDeal}
                    bottom={phone && tabbar ? "calc(4.75rem + env(safe-area-inset-bottom))" : "0.75rem"} />
        </Suspense>
      )}
      {/* A recipe unrolled to be read: over everything */}
      {s && game && keeper && scroll && (
        <Suspense fallback={null}>
          <TownScroll dish={scroll} keeper={keeper} th={w.th} reduced={reducedRef.current} onClose={() => setScroll(null)} />
        </Suspense>
      )}
      {/* The uncle's stall, the bank and my bag: where the wardrobe goes. It is always there while I am in town, so
          that my coins show on the map and the uncle knows when money is waiting; hidden until one is opened. */}
      {s && game && keeper && (
        <div className={trade ? `pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(72%,40rem)] rounded-t-2xl"
               : "right-3 top-16 w-[24rem] rounded-2xl"}` : "hidden"}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open">
          <Suspense fallback={null}>
            <TownTrade keeper={keeper} view={trade} th={w.th} art={boardArt} seated={(s.self.info.sit ?? -1) !== -1} company={company}
                       onView={setTrade} onSummary={setPurse} onScroll={setScroll} />
          </Suspense>
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

/**
 * A cloud's shadow as a picture (lib/town/clouds): soft round blobs of a cool dark, thickest where they overlap,
 * fading to nothing at the edge. Drawn once, small; the map stretches it over the ground, twice as wide as tall.
 */
function cloudPicture(shape: number): HTMLCanvasElement {
  const W = 256, H = 128, canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(W, H);
  for (const [x, y, r] of cloudBlobs(shape)) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(78,92,132,0.55)");
    g.addColorStop(0.55, "rgba(78,92,132,0.34)");
    g.addColorStop(1, "rgba(78,92,132,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return canvas;
}

/**
 * A soft round light of a colour as a picture: all of it at the middle, fading evenly to nothing at the rim. Made
 * once for each colour (there are ten: the lamps, the cooking yard's fire and windows, the camp's fire) and laid at
 * whatever size and strength a light is.
 */
const GLOWS = new Map<string, HTMLCanvasElement>();
function glowPicture(rgb: string): HTMLCanvasElement {
  let canvas = GLOWS.get(rgb);
  if (canvas) return canvas;
  const R = 64;
  canvas = document.createElement("canvas");
  canvas.width = canvas.height = R * 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R * 2, R * 2);
  }
  GLOWS.set(rgb, canvas);
  return canvas;
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
