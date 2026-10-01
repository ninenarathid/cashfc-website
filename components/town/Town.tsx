"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BUILDINGS, COLS, FAR, FOUNTAIN, NEAR, PROXIMITY, ROWS, TILE_H, TILE_W, TREES,
  distance, fromIso, groundAt, hearing, toIso, walkable, type Building, type Vec,
} from "@/lib/town/world";
import type { PeerInfo } from "@/lib/town/voice";
import type { Identity } from "@/lib/town/room";
import { resumable } from "@/lib/town/active";
import { BUBBLE_MS, wrapLines } from "@/lib/town/chat";
import { ROOM_CAP, openSession, type Avatar, type TownSession } from "@/lib/town/session";

/**
 * Cash Town's page: the map, who is here, and the microphone.
 *
 * The stay in town is a TownSession (lib/town/session), which outlives this
 * page: go to another page and you are still in town and still talking, with
 * the dock (TownBar) at the foot of it; come back and this page picks up the
 * same stay, with nothing to reconnect. Leaving is a button here or the dock's
 * ✕, or closing the tab.
 *
 * Drawn on one canvas with plain 2D calls rather than a game engine: the
 * prototype is a few dozen shapes and a handful of faces, and an engine would
 * be a few hundred kilobytes to draw them. The fc-cash-town skill weighs
 * PixiJS and Phaser for when the town grows.
 *
 * Positions live in the session and are drawn every frame; React state is
 * only what the panels around the canvas show, so a walking avatar never
 * re-renders the page.
 */

export type TownMe = Identity;

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

const noSubscribe = () => () => {};

/** How long a line stays in the log over the map. */
const LOG_SHOWN_MS = 120_000;
/** How many lines the log over the map shows. */
const LOG_LINES = 4;

function useWords() {
  const { lang } = useLang();
  const th = lang === "th";
  return {
    th,
    testBadge: th ? "โหมดทดสอบ (dev)" : "Test mode (dev)",
    hint: th ? "แตะพื้นเพื่อเดิน · กดเปิดไมค์เพื่อคุยกับทุกคนในห้อง" : "Tap the ground to walk · turn your mic on to talk with everyone here",
    join: th ? "🎤 เปิดไมค์ เข้าคุย" : "🎤 Turn mic on & join voice",
    mute: th ? "ปิดเสียงตัวเอง" : "Mute me",
    unmute: th ? "เปิดเสียงตัวเอง" : "Unmute me",
    leave: th ? "ออกจากเสียง" : "Leave voice",
    leaveTown: th ? "ออกจากเมือง" : "Leave town",
    left: th ? "ออกจากเมืองแล้ว" : "You left the town",
    reenter: th ? "เข้าเมืองอีกครั้ง" : "Enter again",
    together: th ? "ทุกคนที่เปิดไมค์ได้ยินกันหมด · ไปดูหน้าอื่นได้ เสียงไม่หลุด" : "Everyone with a mic on hears everyone · browse other pages, your voice stays on",
    near: th ? `ได้ยินชัดในระยะ ~${NEAR} ช่อง จางหายที่ ${FAR} ช่อง` : `Clear within ~${NEAR} tiles, silent at ${FAR}`,
    here: th ? "ในห้องตอนนี้" : "Here now",
    you: th ? "คุณ" : "you",
    places: th ? "สถานที่" : "Places",
    go: th ? "ไปที่หน้านี้" : "Go to this page",
    close: th ? "ปิด" : "Close",
    hearing: (n: number) => (th ? `ได้ยิน ${n}%` : `${n}% volume`),
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
    canvasLabel: th ? "แผนที่ Cash Town แตะเพื่อเดิน" : "Cash Town map. Tap to walk.",
    stats: th ? "สถิติ" : "Stats",
    statsHead: (n: number, up: number, lines: number, fps: number) => th
      ? `ในห้อง ${n} คน · สายเสียง ${up}/${lines} ต่อแล้ว · ${fps} fps`
      : `${n} here · ${up}/${lines} voice lines up · ${fps} fps`,
    statsNone: th ? "ยังไม่มีสายเสียง (ต้องเปิดไมค์ทั้งสองฝั่ง)" : "No voice lines yet (both sides need their mic on)",
    statsCols: th ? ["ใคร", "สถานะ", "RTT", "jitter", "หาย", "kbps", "ทาง"] : ["Who", "State", "RTT", "Jitter", "Lost", "kbps", "Path"],
    direct: th ? "ตรง" : "direct",
    relay: "relay",
    chatPlaceholder: th ? "พิมพ์คุยกับทุกคน… (กด Enter)" : "Say something to everyone… (Enter)",
    send: th ? "ส่ง" : "Send",
    chatLog: th ? "แชทล่าสุด" : "Recent chat",
    slow: th ? "พิมพ์เร็วไปนิด รอแป๊บนึงนะ" : "A little fast. Wait a moment.",
    offline: th ? "ยังส่งไม่ได้ กำลังต่อใหม่" : "Can't send while reconnecting.",
  };
}

/** `cap` is for tests (TownGate's dev-only test room); everybody else gets ROOM_CAP. */
export default function Town({ me, testTopic, cap = ROOM_CAP }: { me: TownMe; testTopic?: string; cap?: number }) {
  const w = useWords();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ s: 1, ox: 0, oy: 0, camX: 0, camY: 0, follow: false, cw: 0, ch: 0 });
  const hover = useRef<Building | null>(null);
  const fontRef = useRef("sans-serif");
  const fpsRef = useRef(0);

  const [session, setSession] = useState<TownSession | null>(null);
  const sessionRef = useRef<TownSession | null>(null);
  const [popover, setPopover] = useState<{ b: Building; x: number; y: number } | null>(null);
  // Open on a wide screen; on a phone the list folds away to leave the map.
  const [listOpen, setListOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 640);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<PeerInfo[]>([]);
  const [, setTick] = useState(0);
  const [draft, setDraft] = useState("");
  const [chatNote, setChatNote] = useState<string | null>(null);
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
  }, []);

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
      const live = sessionRef.current;
      if (live && !live.closed) live.step(now, dt);
      draw(ctx, canvas, fallback, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function project(v: Vec): Vec {
    const iso = toIso(v.x, v.y);
    const { s: k, ox, oy } = view.current;
    return { x: ox + iso.x * k, y: oy + iso.y * k };
  }

  function draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, fallback: HTMLImageElement, now: number) {
    const v = view.current;
    const { cw, ch } = v;
    if (!cw || !ch) return;
    const dpr = canvas.width / cw;
    const stay = sessionRef.current && !sessionRef.current.closed ? sessionRef.current : null;
    const mine = stay?.self ?? null;

    // Fit the whole district if it fits; otherwise follow me around it.
    const fit = Math.min(cw / (ISO_MAX_X - ISO_MIN_X), ch / (ISO_MAX_Y - ISO_MIN_Y));
    v.follow = fit < MIN_SCALE;
    v.s = v.follow ? MIN_SCALE : fit;
    const mapW = (ISO_MAX_X - ISO_MIN_X) * v.s, mapH = (ISO_MAX_Y - ISO_MIN_Y) * v.s;
    if (v.follow && mine) {
      const iso = toIso(mine.pos.x, mine.pos.y);
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
    const live = stay?.status === "ready";
    // Chat times are wall-clock; the frame's `now` is not.
    const wall = Date.now();
    for (const b of BUILDINGS) things.push({ depth: b.x + b.y + (b.w + b.h) / 2, draw: () => drawBuilding(ctx, b, signs) });
    for (const t of TREES) things.push({ depth: t.x + t.y + 1, draw: () => drawTree(ctx, t) });
    things.push({ depth: FOUNTAIN.x + FOUNTAIN.y + 2, draw: () => drawFountain(ctx, now) });
    if (stay) {
      for (const a of stay.avatars.values()) {
        if (a.byeAt !== undefined) continue;
        things.push({ depth: a.pos.x + a.pos.y, draw: () => drawAvatar(ctx, a, false, fallback, names, !live, wall) });
      }
    }
    if (mine) things.push({ depth: mine.pos.x + mine.pos.y, draw: () => drawAvatar(ctx, mine, true, fallback, names, false, wall) });
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw();
    for (const sign of signs) sign();
    for (const n of names) n();
  }

  function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, signs: Array<() => void>) {
    const k = view.current.s;
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
    signs.push(() => label(ctx, `${b.icon} ${w.th ? b.name.th : b.name.en}`, roof.x, roof.y - 14,
      lit ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.82)"));
  }

  function drawTree(ctx: CanvasRenderingContext2D, t: Vec) {
    const k = view.current.s;
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
    const k = view.current.s;
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
    const t = (now / 900) % 1;
    ctx.strokeStyle = `rgba(160,210,240,${0.5 - t * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 2 * k, rx * 0.8 * t, ry * 0.8 * t, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8fc3e6";
    ctx.fillRect(c.x - 2 * k, c.y - 30 * k, 4 * k, 28 * k);
  }

  function drawAvatar(ctx: CanvasRenderingContext2D, a: Avatar, isMe: boolean, fallback: HTMLImageElement,
    names: Array<() => void>, faded: boolean, wall: number) {
    const p = project(a.pos);
    const color = a.info.color || "#6aa9e0";
    const voice = sessionRef.current?.voice;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const headY = p.y - 38;
    // On another page of the site: still here, still talking, not watching.
    const away = !isMe && a.info.away;
    ctx.save();
    if (faded) ctx.globalAlpha = 0.4;
    else if (away) ctx.globalAlpha = 0.6;

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

    ctx.font = `10px ${fontRef.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // The microphone, when they are in voice.
    if (a.info.voice) {
      ctx.beginPath();
      ctx.arc(p.x + 14, headY + 10, 8, 0, Math.PI * 2);
      ctx.fillStyle = a.info.muted ? "#d14b3a" : "#2a7d6f";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(a.info.muted ? "✕" : "🎤", p.x + 14, headY + 10.5);
    }
    // Looking at another page.
    if (away) {
      ctx.beginPath();
      ctx.arc(p.x - 14, headY - 12, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#36414f";
      ctx.fill();
      ctx.fillText("📄", p.x - 14, headY - 11.5);
    }
    ctx.restore();

    const name = isMe ? `${a.info.name} (${w.you})` : a.info.name;
    const said = a.said && wall - a.said.at < BUBBLE_MS ? a.said : null;
    names.push(() => {
      ctx.save();
      if (faded || away) ctx.globalAlpha = 0.6;
      label(ctx, name, p.x, p.y + 15, isMe ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.78)");
      ctx.restore();
      // What they just typed, over their head; it fades in its last moment.
      if (said) bubble(ctx, said.text, p.x, headY - 22, Math.min(1, (BUBBLE_MS - (wall - said.at)) / 800));
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
  const tileAt = useCallback((clientX: number, clientY: number): Vec | null => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const { s: k, ox, oy } = view.current;
    const t = fromIso((clientX - r.left - ox) / k, (clientY - r.top - oy) / k);
    return { x: Math.floor(t.x), y: Math.floor(t.y) };
  }, []);

  /** A building under the pointer: its footprint, or its walls above it. */
  const buildingAt = useCallback((clientX: number, clientY: number): Building | null => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const { s: k, ox, oy } = view.current;
    for (const b of BUILDINGS) {
      // Walk down from the pointer through the wall's height: if any point
      // lands on the footprint, the pointer is on the building.
      for (let lift = 0; lift <= b.height; lift += 6) {
        const t = fromIso((clientX - r.left - ox) / k, (clientY - r.top - oy) / k + lift);
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
    if (t && walkable(t.x, t.y)) sessionRef.current?.walkTo(t);
  }, [buildingAt, tileAt]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = buildingAt(e.clientX, e.clientY);
    hover.current = b;
    if (canvasRef.current) canvasRef.current.style.cursor = b ? "pointer" : "default";
  }, [buildingAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      // Enter starts typing, as in a game; Esc in the box gives the keys back to walking.
      if (e.key === "Enter" && !(target && /^(BUTTON|A)$/.test(target.tagName)) && chatRef.current) {
        e.preventDefault();
        chatRef.current.focus();
        return;
      }
      const step = KEYS[e.key];
      const stay = sessionRef.current;
      if (!step || !stay || stay.closed) return;
      e.preventDefault();
      const a = stay.self;
      const from = a.path.length ? a.path[a.path.length - 1] : a.pos;
      const next = { x: Math.floor(from.x) + step[0], y: Math.floor(from.y) + step[1] };
      if (walkable(next.x, next.y)) stay.walkTo(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
  const recent = s ? s.chat.filter((l) => Date.now() - l.at < LOG_SHOWN_MS).slice(-LOG_LINES) : [];

  return (
    <div className="mt-4">
      <div ref={wrapRef}
           className="relative h-[min(74dvh,700px)] min-h-[440px] w-full overflow-hidden rounded-2xl border border-line bg-[#0b1016]">
        <canvas ref={canvasRef} role="img" aria-label={w.canvasLabel}
                className="absolute inset-0 touch-none select-none"
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} />

        {/* Whether we are connected, and the way out */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1">
          {/* The page already says Beta; the dev test room says so here. */}
          {testTopic && (
            <span className="w-fit rounded-full border border-gold/50 bg-bg/80 px-2 py-0.5 font-data text-label uppercase tracking-wider text-gold">
              {w.testBadge}
            </span>
          )}
          {s && everReady && (
            <span role="status" className={`w-fit rounded-full bg-bg/80 px-2 py-0.5 text-label ${live ? "text-jade" : "text-gold"}`}>
              {live ? `● ${w.online}` : `◌ ${w.reconnecting}`}
            </span>
          )}
          {s && (
            <button type="button" onClick={() => s.close()}
                    className="pointer-events-auto mt-0.5 w-fit rounded-full border border-line-strong bg-bg/85 px-2.5 py-1 text-label text-muted transition-colors hover:text-ink">
              🚪 {w.leaveTown}
            </button>
          )}
        </div>

        {/* Who is here */}
        {s && (
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
              const state = voiceOn && p.voice ? s.voice.connectionState(p.id) : null;
              const gain = PROXIMITY && voiceOn && p.voice ? hearing(distance(s.self.pos, a.pos)) : null;
              const voiceNote = state === "failed" ? `⚠️ ${w.iceFailed}`
                : state && state !== "connected" ? w.connectingVoice
                : gain !== null ? w.hearing(Math.round(gain * 100))
                : state === "connected" ? w.connected : null;
              return (
                <PersonRow key={p.id} name={p.name} face={p.face} voice={p.voice} muted={p.muted} away={p.away}
                  note={[voiceNote, p.away ? `📄 ${w.away}` : null].filter(Boolean).join(" · ") || undefined} />
              );
            })}
          </ul>
          <div className="mt-2 border-t border-line pt-1.5 font-data text-label uppercase tracking-wider text-muted">{w.places}</div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {BUILDINGS.map((b) => (
              <Link key={b.id} href={b.href} className="text-meta text-accent no-underline hover:underline">
                {b.icon} {(w.th ? b.name.th : b.name.en).split(" · ")[0]}
              </Link>
            ))}
          </div>
          </>}
        </aside>
        )}

        {/* The stats: what the network is doing to each voice line */}
        {s && statsOpen && (
          <div className="absolute left-3 top-28 z-10 max-h-[40%] w-[min(30rem,calc(100%-1.5rem))] overflow-auto rounded-xl border border-line bg-bg/92 p-2 text-meta text-ink backdrop-blur-sm">
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

        {/* A building's door */}
        {popover && (
          <div className="absolute z-10 w-56 rounded-xl border border-line-lit bg-surface p-3 shadow-xl"
               style={{ left: Math.min(popover.x, (view.current.cw || 300) - 232), top: Math.max(8, popover.y - 96) }}>
            <div className="text-read font-semibold text-ink">{popover.b.icon} {w.th ? popover.b.name.th : popover.b.name.en}</div>
            <div className="mt-2 flex items-center gap-2">
              <Link href={popover.b.href}
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

        {/* Chat and voice */}
        {s && (
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 px-3">
          {recent.length > 0 && (
            <ul aria-label={w.chatLog} className="pointer-events-none flex w-full max-w-xl flex-col items-start gap-0.5">
              {recent.map((l) => (
                <li key={l.key} className="max-w-full truncate rounded-lg bg-bg/80 px-2 py-0.5 text-meta">
                  <span className={l.mine ? "text-gold" : "text-accent"}>{l.mine ? w.you : l.name}</span>
                  <span className="text-muted">: </span>
                  <span className="text-ink">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={sendChat} className="flex w-full max-w-xl items-center gap-2">
            <input ref={chatRef} value={draft} maxLength={600} enterKeyHint="send"
                   onChange={(e) => { setDraft(e.target.value); setChatNote(null); }}
                   onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
                   placeholder={w.chatPlaceholder} aria-label={w.chatPlaceholder}
                   className="min-w-0 flex-1 rounded-full border border-line-strong bg-bg/85 px-4 py-2 text-read text-ink outline-none placeholder:text-muted focus:border-accent" />
            <button type="submit" className="shrink-0 rounded-full bg-accent/20 px-4 py-2 text-ui font-semibold text-accent hover:bg-accent/30">
              {w.send}
            </button>
          </form>
          {chatNote && <div role="status" className="rounded-full bg-bg/80 px-3 py-0.5 text-label text-gold">{chatNote}</div>}
          {micProblem && <div className="max-w-md rounded-lg bg-chili/20 px-3 py-1.5 text-center text-ui text-ink">{micProblem}</div>}
          {voiceOn && s.voice.audioBlocked && (
            <button type="button" onClick={() => s.voice.resumeAudio()}
                    className="rounded-full bg-gold px-4 py-1.5 text-ui font-semibold text-bg shadow-lg">
              {w.tapToHear}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!voiceOn ? (
              <button type="button" onClick={() => void s.joinVoice()} disabled={!everReady || status === "full"}
                      className="rounded-full bg-jade px-5 py-2.5 text-read font-semibold text-bg shadow-lg disabled:opacity-40">
                {w.join}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => s.toggleMute()}
                        className={`rounded-full px-4 py-2.5 text-read font-semibold shadow-lg ${muted ? "bg-chili text-white" : "bg-surface text-ink border border-line-strong"}`}>
                  {muted ? `🔇 ${w.unmute}` : `🎤 ${w.mute}`}
                </button>
                <button type="button" onClick={() => s.leaveVoice()}
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
        )}
      </div>
    </div>
  );
}

function PersonRow({ name, face, voice, muted, away, note }: {
  name: string; face: string | null; voice: boolean; muted: boolean; away?: boolean; note?: string;
}) {
  return (
    <li className={`flex items-center gap-2 ${away ? "opacity-70" : ""}`}>
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
