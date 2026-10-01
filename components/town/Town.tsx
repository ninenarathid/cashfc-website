"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import popotoArt from "@/assets/popoto/popoto.webp";
import {
  BUILDINGS, COLS, FAR, FOUNTAIN, NEAR, ROWS, SPEED, TILE_H, TILE_W, TREES,
  distance, findPath, fromIso, groundAt, hearing, spawnFor, stepAlong,
  toIso, walkable, type Building, type Vec,
} from "@/lib/town/world";
import { VoiceMesh, type Signal } from "@/lib/town/voice";
import { joinTown, type Room, type RoomStatus, type Townsfolk } from "@/lib/town/room";

/**
 * Cash Town, the prototype: one district, everybody's avatar, tap to walk,
 * and a microphone that reaches whoever is close.
 *
 * Drawn on one canvas with plain 2D calls rather than a game engine: the
 * prototype is a few dozen shapes and a handful of faces, and an engine would
 * be a few hundred kilobytes to draw them. The fc-cash-town skill weighs
 * PixiJS and Phaser for when the town grows.
 *
 * Positions and the voice live in refs and are drawn every frame; React state
 * is only what the panels around the canvas show, so a walking avatar never
 * re-renders the page.
 */

export interface TownMe {
  id: string;
  name: string;
  face: string | null;
  color: string;
}

interface Avatar {
  info: Townsfolk;
  pos: Vec;
  path: Vec[];
  img: HTMLImageElement | null;
}

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
    badge: th ? "ทดลอง · เห็นเฉพาะแอดมิน" : "Prototype · admins only",
    testBadge: th ? "โหมดทดสอบ (dev)" : "Test mode (dev)",
    hint: th ? "แตะพื้นเพื่อเดิน · เดินเข้าใกล้กันแล้วเปิดไมค์เพื่อคุย" : "Tap the ground to walk · walk up to someone and turn your mic on to talk",
    join: th ? "🎤 เปิดไมค์ เข้าคุย" : "🎤 Turn mic on & join voice",
    mute: th ? "ปิดเสียงตัวเอง" : "Mute me",
    unmute: th ? "เปิดเสียงตัวเอง" : "Unmute me",
    leave: th ? "ออกจากเสียง" : "Leave voice",
    near: th ? `ได้ยินชัดในระยะ ~${NEAR} ช่อง จางหายที่ ${FAR} ช่อง` : `Clear within ~${NEAR} tiles, silent at ${FAR}`,
    here: th ? "ในเมืองตอนนี้" : "In town now",
    you: th ? "คุณ" : "you",
    places: th ? "สถานที่" : "Places",
    go: th ? "ไปที่หน้านี้ ↗" : "Open this page ↗",
    close: th ? "ปิด" : "Close",
    hearing: (n: number) => (th ? `ได้ยิน ${n}%` : `${n}% volume`),
    connecting: th ? "กำลังเข้าเมือง…" : "Entering town…",
    needsMigration: th ? "ยังเข้าเมืองไม่ได้: ต้องรัน supabase/v101 ใน SQL editor ก่อน" : "Can't enter yet: run supabase/v101 in the SQL editor first",
    denied: th ? "ยังไม่มีสิทธิ์เข้า Cash Town (ตอนนี้เปิดเฉพาะแอดมิน)" : "No access to Cash Town yet (admins only for now)",
    error: th ? "เชื่อมต่อเมืองไม่สำเร็จ ลองรีเฟรชอีกครั้ง" : "Couldn't connect to the town. Try refreshing.",
    closed: th ? "หลุดจากเมือง กำลังลองใหม่…" : "Disconnected. Retrying…",
    micDenied: th ? "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมค์ — กดรูปกุญแจข้างช่อง URL แล้วอนุญาตไมโครโฟน" : "The browser blocked the microphone. Allow it from the lock icon by the address bar.",
    noMic: th ? "ไม่พบไมโครโฟนในเครื่องนี้" : "No microphone found on this device",
    micFailed: th ? "เปิดไมค์ไม่สำเร็จ" : "Couldn't start the microphone",
    iceFailed: th ? "ต่อเสียงกับคนนี้ไม่สำเร็จ (เครือข่ายอาจกั้น P2P)" : "Voice couldn't connect to this person (the network may block peer-to-peer)",
    connectingVoice: th ? "กำลังต่อเสียง…" : "connecting voice…",
    canvasLabel: th ? "แผนที่ Cash Town แตะเพื่อเดิน" : "Cash Town map. Tap to walk.",
  };
}

export default function Town({ me, testTopic }: { me: TownMe; testTopic?: string }) {
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

  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [people, setPeople] = useState<Townsfolk[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ b: Building; x: number; y: number } | null>(null);
  // Open on a wide screen; on a phone the list folds away to leave the map.
  const [listOpen, setListOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 640);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  // In voice, the list says how loud each person is, which changes as anybody
  // walks; twice a second is often enough to read and cheap enough to ignore.
  useEffect(() => {
    if (!voiceOn) return;
    const id = window.setInterval(bump, 500);
    return () => window.clearInterval(id);
  }, [voiceOn, bump]);

  /** Tell the room where I am going (and whether I am in voice). */
  const publish = useCallback((patch: Partial<Townsfolk>) => {
    const a = self.current;
    if (!a) return;
    a.info = { ...a.info, ...patch, at: Date.now() };
    void room.current?.update(a.info);
  }, []);

  /** Walk my avatar to a tile, if there is a way there. */
  const walkTo = useCallback((tile: Vec) => {
    const a = self.current;
    if (!a) return false;
    const goal = { x: Math.floor(tile.x) + 0.5, y: Math.floor(tile.y) + 0.5 };
    const path = findPath(a.pos, goal);
    if (!path) return false;
    a.path = path;
    publish({ x: goal.x, y: goal.y, fx: a.pos.x, fy: a.pos.y });
    return true;
  }, [publish]);

  /* ── entering the town ───────────────────────────────────────────────── */
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setStatus("error"); return; }

    const start = spawnFor(me.id);
    const info: Townsfolk = {
      id: me.id, name: me.name, face: me.face, color: me.color,
      x: start.x, y: start.y, fx: start.x, fy: start.y, voice: false, muted: false, at: Date.now(),
    };
    self.current = { info, pos: { ...start }, path: [], img: loadFace(me.face) };
    fontRef.current = getComputedStyle(document.body).getPropertyValue("--font-body-face").trim() || "sans-serif";

    const voice = new VoiceMesh(me.id, (to, s) => room.current?.signal(to, s), bump);
    mesh.current = voice;

    let cancelled = false;
    void joinTown(supabase, info, {
      onStatus: (s) => { if (!cancelled) setStatus(s); },
      onSignal: (from, data) => { void voice.receive(from, data as Signal); },
      onPeople: (list) => {
        if (cancelled) return;
        const seen = new Set<string>();
        for (const p of list) {
          if (p.id === me.id) continue;
          seen.add(p.id);
          const known = avatars.current.get(p.id);
          if (!known) {
            // Somebody already here, or just arrived: put them where they are going.
            avatars.current.set(p.id, { info: p, pos: { x: p.x, y: p.y }, path: [], img: loadFace(p.face) });
          } else {
            if (known.info.x !== p.x || known.info.y !== p.y) {
              known.path = findPath(known.pos, { x: p.x, y: p.y }) ?? [{ x: p.x, y: p.y }];
            }
            if (known.info.face !== p.face) known.img = loadFace(p.face);
            known.info = p;
          }
        }
        for (const id of [...avatars.current.keys()]) if (!seen.has(id)) avatars.current.delete(id);
        setPeople(list);
        if (voice.active) voice.sync(list.filter((p) => p.voice).map((p) => p.id));
      },
    }, { testTopic, cancelled: () => cancelled }).then((r) => {
      if (cancelled) { void r?.leave(); return; }
      room.current = r;
    });

    return () => {
      cancelled = true;
      voice.stop();
      void room.current?.leave();
      room.current = null;
    };
  }, [me.id, me.name, me.face, me.color, testTopic, bump]);

  /* ── drawing, every frame ────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const fallback = new Image();
    fallback.src = popotoArt.src;
    let raf = 0;
    let last = performance.now();

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
      const me = self.current;
      // Walk everybody along their paths.
      if (me && me.path.length) Object.assign(me, stepAlong(me.pos, me.path, SPEED * dt));
      for (const a of avatars.current.values()) {
        if (a.path.length) Object.assign(a, stepAlong(a.pos, a.path, SPEED * dt));
      }
      // Each voice as loud as its owner is close.
      const voice = mesh.current;
      if (me && voice?.active) {
        for (const a of avatars.current.values()) {
          if (a.info.voice) voice.setGain(a.info.id, hearing(distance(me.pos, a.pos)));
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

    const me = self.current;
    const voice = mesh.current;

    // How far my voice carries, under everything else.
    if (me && voice?.active) {
      const c = project(me.pos);
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
      // A thread to everybody I can hear.
      for (const a of avatars.current.values()) {
        if (!a.info.voice) continue;
        const g = hearing(distance(me.pos, a.pos));
        if (g <= 0) continue;
        const p = project(a.pos);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 20);
        ctx.lineTo(p.x, p.y - 20);
        ctx.strokeStyle = `rgba(79,184,168,${0.15 + g * 0.35})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Where I am walking to.
    if (me && me.path.length) {
      const end = me.path[me.path.length - 1];
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
    for (const b of BUILDINGS) things.push({ depth: b.x + b.y + (b.w + b.h) / 2, draw: () => drawBuilding(ctx, b, signs) });
    for (const t of TREES) things.push({ depth: t.x + t.y + 1, draw: () => drawTree(ctx, t) });
    things.push({ depth: FOUNTAIN.x + FOUNTAIN.y + 2, draw: () => drawFountain(ctx, now) });
    for (const a of avatars.current.values()) {
      things.push({ depth: a.pos.x + a.pos.y, draw: () => drawAvatar(ctx, a, false, fallback, names) });
    }
    if (me) things.push({ depth: me.pos.x + me.pos.y, draw: () => drawAvatar(ctx, me, true, fallback, names) });
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
    names: Array<() => void>) {
    const p = project(a.pos);
    const color = a.info.color || "#6aa9e0";
    const voice = mesh.current;
    const level = voice?.active ? voice.level(isMe ? "me" : a.info.id) : 0;
    const headY = p.y - 38;

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

    const name = isMe ? `${a.info.name} (${w.you})` : a.info.name;
    names.push(() => label(ctx, name, p.x, p.y + 15, isMe ? "#e5cc80" : "#e3e8ef", "rgba(15,19,25,0.78)"));
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
  const joinVoice = useCallback(async () => {
    const voice = mesh.current;
    if (!voice) return;
    setVoiceError(null);
    try {
      await voice.start();
      setVoiceOn(true);
      setMuted(false);
      publish({ voice: true, muted: false });
      voice.sync(people.filter((p) => p.voice).map((p) => p.id));
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setVoiceError(name === "NotAllowedError" ? w.micDenied : name === "NotFoundError" ? w.noMic : w.micFailed);
    }
  }, [people, publish, w.micDenied, w.noMic, w.micFailed]);

  const toggleMute = useCallback(() => {
    const voice = mesh.current;
    if (!voice) return;
    const next = !voice.isMuted;
    voice.setMuted(next);
    setMuted(next);
    publish({ muted: next });
  }, [publish]);

  const leaveVoice = useCallback(() => {
    mesh.current?.stop();
    setVoiceOn(false);
    setMuted(false);
    publish({ voice: false, muted: false });
  }, [publish]);

  /* ── a handle for testing from the console or a script ───────────────── */
  useEffect(() => {
    (window as unknown as { __cashTown?: unknown }).__cashTown = {
      status: () => status,
      me: () => self.current && { ...self.current.info, pos: self.current.pos },
      people: () => [...avatars.current.values()].map((a) => ({ id: a.info.id, name: a.info.name, voice: a.info.voice, pos: a.pos })),
      voice: () => mesh.current?.stats() ?? [],
      walkTo: (x: number, y: number) => walkTo({ x, y }),
    };
  }, [status, walkTo]);

  const others = people.filter((p) => p.id !== me.id);
  const banner =
    status === "connecting" ? w.connecting
    : status === "needs-migration" ? w.needsMigration
    : status === "denied" ? w.denied
    : status === "error" ? w.error
    : status === "closed" ? w.closed
    : null;

  return (
    <div className="mt-4">
      <div ref={wrapRef}
           className="relative h-[min(74dvh,700px)] min-h-[440px] w-full overflow-hidden rounded-2xl border border-line bg-[#0b1016]">
        <canvas ref={canvasRef} role="img" aria-label={w.canvasLabel}
                className="absolute inset-0 touch-none select-none"
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} />

        {/* Title */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          <div className="font-display text-title font-bold text-ink drop-shadow">Cash Town</div>
          <span className="w-fit rounded-full border border-gold/50 bg-bg/80 px-2 py-0.5 font-data text-label uppercase tracking-wider text-gold">
            {testTopic ? w.testBadge : w.badge}
          </span>
        </div>

        {/* Who is here */}
        <aside className="absolute right-3 top-3 w-52 max-w-[60%] rounded-xl border border-line bg-bg/85 p-2 text-ui backdrop-blur-sm">
          <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}
                  className="flex w-full items-center gap-1 font-data text-label uppercase tracking-wider text-muted">
            <span>👥 {w.here} · {people.length || 1}</span>
            <span aria-hidden className="ml-auto">{listOpen ? "▴" : "▾"}</span>
          </button>
          {listOpen && <>
          <ul className="mt-1 flex flex-col gap-1">
            <PersonRow name={`${me.name} (${w.you})`} face={me.face} voice={voiceOn} muted={muted} />
            {others.map((p) => {
              const state = voiceOn && p.voice ? mesh.current?.connectionState(p.id) : null;
              const a = avatars.current.get(p.id);
              const gain = voiceOn && p.voice && a && self.current ? hearing(distance(self.current.pos, a.pos)) : null;
              return (
                <PersonRow key={p.id} name={p.name} face={p.face} voice={p.voice} muted={p.muted}
                  note={state === "failed" ? `⚠️ ${w.iceFailed}`
                    : state && state !== "connected" ? w.connectingVoice
                    : gain !== null ? w.hearing(Math.round(gain * 100)) : undefined} />
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
              <button type="button" onClick={() => void joinVoice()} disabled={status !== "ready"}
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
            {voiceOn ? w.near : w.hint}
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
